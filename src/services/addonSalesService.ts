import { supabase } from '@/lib/supabase';
import { addonInventoryService } from './addonInventoryService';

export interface AddonSale {
    id: string;
    addon_id: string;
    addon_name: string;
    category: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    customer_name: string;
    payment_method: string;
    notes?: string;
    created_at: string;
    is_offline?: boolean;
}

export interface CreateAddonSaleDTO {
    addon_id: string;
    addon_name: string;
    category?: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    customer_name?: string;
    payment_method?: string;
    notes?: string;
    current_stock: number;
}

const LOCAL_STORAGE_KEY = 'sbs_addon_sales_ledger_v1';

function getLocalSales(): AddonSale[] {
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (e) {
        console.error('Error reading addon sales from localStorage:', e);
        return [];
    }
}

function saveLocalSales(sales: AddonSale[]): void {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sales));
    } catch (e) {
        console.error('Error saving addon sales to localStorage:', e);
    }
}

export const addonSalesService = {
    /**
     * Fetch all recorded addon sales, ordered newest first.
     * Gracefully falls back to localStorage if public.addon_sales table does not exist yet.
     */
    getSales: async (): Promise<AddonSale[]> => {
        try {
            const { data, error } = await supabase
                .from('addon_sales')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                // If table is missing (PGRST205) or error, fallback to local storage
                console.warn('public.addon_sales query returned error (using local cache if available):', error.message);
                return getLocalSales();
            }

            const dbSales: AddonSale[] = (data || []).map((row: any) => ({
                id: String(row.id),
                addon_id: String(row.addon_id || ''),
                addon_name: String(row.addon_name || 'Item'),
                category: String(row.category || 'Other'),
                quantity: Number(row.quantity || 1),
                unit_price: Number(row.unit_price || 0),
                total_amount: Number(row.total_amount || 0),
                customer_name: String(row.customer_name || 'Walk-in Customer'),
                payment_method: String(row.payment_method || 'Cash'),
                notes: row.notes || undefined,
                created_at: row.created_at,
                is_offline: false,
            }));

            // Sync with any local items that haven't been pushed to DB yet
            const localSales = getLocalSales();
            const dbIds = new Set(dbSales.map((s) => s.id));
            const offlineOnly = localSales.filter((s) => !dbIds.has(s.id) && s.is_offline);

            return [...offlineOnly, ...dbSales].sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
        } catch (e) {
            console.error('Unexpected error fetching addon sales, reading local cache:', e);
            return getLocalSales();
        }
    },

    /**
     * Record a new sale:
     * 1. Decrements stock of the addon in public.addons table.
     * 2. Inserts sale entry into public.addon_sales table (or local storage if table not yet run).
     */
    recordSale: async (dto: CreateAddonSaleDTO): Promise<AddonSale> => {
        const qty = Math.max(1, Math.floor(Number(dto.quantity || 1)));
        const unitPrice = Math.max(0, Number(dto.unit_price || 0));
        const totalAmount = Math.max(0, Number(dto.total_amount || qty * unitPrice));
        const customerName = (dto.customer_name || '').trim() || 'Walk-in Customer';
        const paymentMethod = (dto.payment_method || 'Cash').trim();
        const notes = (dto.notes || '').trim();

        // 1. Decrement stock on public.addons
        const newStock = Math.max(0, (dto.current_stock ?? 0) - qty);
        try {
            await addonInventoryService.updateAddon(dto.addon_id, { stock: newStock });
        } catch (stockErr) {
            console.error('Failed to decrement addon stock:', stockErr);
            throw new Error('Failed to update inventory stock for this item.');
        }

        const now = new Date().toISOString();
        const newRecord: AddonSale = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sale_${Date.now()}`,
            addon_id: dto.addon_id,
            addon_name: dto.addon_name,
            category: dto.category || 'Other',
            quantity: qty,
            unit_price: unitPrice,
            total_amount: totalAmount,
            customer_name: customerName,
            payment_method: paymentMethod,
            notes: notes || undefined,
            created_at: now,
        };

        // 2. Try inserting into Supabase
        try {
            const { data, error } = await supabase
                .from('addon_sales')
                .insert([
                    {
                        addon_id: dto.addon_id,
                        addon_name: dto.addon_name,
                        category: dto.category || 'Other',
                        quantity: qty,
                        unit_price: unitPrice,
                        total_amount: totalAmount,
                        customer_name: customerName,
                        payment_method: paymentMethod,
                        notes: notes || null,
                        created_at: now,
                    },
                ])
                .select()
                .single();

            if (error) {
                console.warn('Could not insert into Supabase addon_sales table (persisting locally):', error.message);
                newRecord.is_offline = true;
                const existing = getLocalSales();
                saveLocalSales([newRecord, ...existing]);
                return newRecord;
            }

            return {
                id: String(data.id),
                addon_id: String(data.addon_id),
                addon_name: String(data.addon_name),
                category: String(data.category),
                quantity: Number(data.quantity),
                unit_price: Number(data.unit_price),
                total_amount: Number(data.total_amount),
                customer_name: String(data.customer_name),
                payment_method: String(data.payment_method),
                notes: data.notes || undefined,
                created_at: data.created_at,
                is_offline: false,
            };
        } catch (dbErr) {
            console.warn('Exception inserting to Supabase (saving locally):', dbErr);
            newRecord.is_offline = true;
            const existing = getLocalSales();
            saveLocalSales([newRecord, ...existing]);
            return newRecord;
        }
    },

    /**
     * Delete/void an addon sale entry, optionally restoring deducted stock.
     */
    deleteSale: async (
        saleId: string,
        addonId?: string,
        quantity?: number,
        restoreStock = true
    ): Promise<void> => {
        // 1. If stock restoration requested, get current addon stock and add quantity back
        if (restoreStock && addonId && quantity && quantity > 0) {
            try {
                const addons = await addonInventoryService.getAddons();
                const matched = addons.find((a) => a.id === addonId);
                if (matched) {
                    await addonInventoryService.updateAddon(addonId, {
                        stock: matched.stock + quantity,
                    });
                }
            } catch (err) {
                console.error('Failed to restore addon stock on delete:', err);
            }
        }

        // 2. Remove from local storage
        const local = getLocalSales();
        saveLocalSales(local.filter((s) => s.id !== saleId));

        // 3. Try removing from Supabase
        try {
            await supabase.from('addon_sales').delete().eq('id', saleId);
        } catch (e) {
            console.warn('Error deleting from Supabase addon_sales:', e);
        }
    },
};
