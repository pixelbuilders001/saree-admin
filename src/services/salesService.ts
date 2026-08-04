import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export interface SaleItem {
    sareeId: string;
    sareeName: string;
    quantity: number;
    sellingPrice: number;
}

export interface Sale {
    saleId: string;
    items: SaleItem[];
    totalAmount: number;
    profit: number;
    date: string;
    customerName?: string;
    customerMobile?: string;
    salespersonId?: string;
    commissionEarned?: number;
}

export interface SaleReportItem {
    saleId: string;
    sareeId: string;
    sareeName: string;
    quantity: number;
    sellingPrice: number;
    totalAmount: number;
    profit: number;
    date: string;
    customerName?: string;
    customerMobile?: string;
    createdBy?: string;
    updatedBy?: string;
    salespersonName?: string;
    commissionEarned?: number;
}

export const getFriendlyId = (uuid: string, isExchange: boolean): string => {
    if (!uuid) return '';
    const clean = uuid.replace(/-/g, '');
    const suffix = clean.substring(clean.length - 4);
    const num = (parseInt(suffix, 16) % 9000) + 1000;
    return (isExchange ? 'EX-' : 'SL-') + num;
};

export const salesService = {
    getSales: async (): Promise<SaleReportItem[]> => {
        // Query sales with joined customers, staff, and items
        const { data, error } = await supabase
            .from('sales')
            .select(`
                id,
                created_at,
                total_amount,
                profit,
                commission_earned,
                created_by,
                updated_by,
                customers (
                    name,
                    mobile
                ),
                staff (
                    name
                ),
                sale_items (
                    saree_id,
                    quantity,
                    selling_price,
                    inventory (
                        saree_name,
                        purchase_price
                    )
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const reportItems: SaleReportItem[] = [];

        (data || []).forEach((sale: any) => {
            const customerName = sale.customers?.name || '';
            const customerMobile = sale.customers?.mobile || '';
            const salespersonName = sale.staff?.name || '';
            const commissionEarned = Number(sale.commission_earned || 0);

            const hasReturn = (sale.sale_items || []).some((item: any) => Number(item.quantity || 0) < 0);
            const friendlySaleId = getFriendlyId(sale.id, hasReturn);

            (sale.sale_items || []).forEach((item: any) => {
                const quantity = Number(item.quantity || 0);
                const sellingPrice = Number(item.selling_price || 0);
                const totalAmount = quantity * sellingPrice;

                const purchasePrice = Number(item.inventory?.purchase_price || 0);
                const profit = totalAmount - (quantity * purchasePrice);

                reportItems.push({
                    saleId: friendlySaleId,
                    sareeId: item.saree_id,
                    sareeName: item.inventory?.saree_name || 'Unknown Saree',
                    quantity,
                    sellingPrice,
                    totalAmount,
                    profit,
                    date: sale.created_at,
                    customerName,
                    customerMobile,
                    createdBy: sale.created_by || '',
                    updatedBy: sale.updated_by || '',
                    salespersonName,
                    commissionEarned,
                });
            });
        });

        return reportItems;
    },

    createSale: async (sale: {
        items: SaleItem[];
        customerName?: string;
        customerMobile?: string;
        salespersonId?: string;
        commissionEarned?: number;
    }): Promise<Sale> => {
        if (!sale.items || sale.items.length === 0) {
            throw new Error("No items in sale");
        }

        // 1. Resolve customer ID (find or create)
        let customerId: string | null = null;
        if (sale.customerMobile) {
            const { data: customer, error: customerFetchError } = await supabase
                .from('customers')
                .select('id')
                .eq('mobile', sale.customerMobile)
                .maybeSingle();

            if (customerFetchError) throw customerFetchError;

            if (customer) {
                customerId = customer.id;
            } else if (sale.customerName) {
                const { data: newCustomer, error: customerInsertError } = await supabase
                    .from('customers')
                    .insert([{
                        name: sale.customerName,
                        mobile: sale.customerMobile
                    }])
                    .select()
                    .single();

                if (customerInsertError) throw customerInsertError;
                customerId = newCustomer?.id;
            }
        }

        // 2. Fetch inventory details to validate stock and calculate profit
        const sareeIds = sale.items.map(item => item.sareeId);
        const { data: sareesList, error: sareesError } = await supabase
            .from('inventory')
            .select('id, stock, purchase_price, saree_name')
            .in('id', sareeIds);

        if (sareesError) throw sareesError;

        let totalAmount = 0;
        let totalProfit = 0;

        sale.items.forEach(item => {
            const saree = sareesList?.find(s => s.id === item.sareeId);
            if (!saree) throw new Error(`Saree not found: ${item.sareeId}`);

            const currentStock = Number(saree.stock || 0);
            if (currentStock < item.quantity) {
                throw new Error(`Insufficient stock for ${saree.saree_name} (Available: ${currentStock})`);
            }

            const rowAmount = item.quantity * item.sellingPrice;
            const purchasePrice = Number(saree.purchase_price || 0);
            const rowProfit = rowAmount - (item.quantity * purchasePrice);

            totalAmount += rowAmount;
            totalProfit += rowProfit;
        });

        // 3. Create Sale Header
        const userEmail = useAuthStore.getState().user?.email || 'system';
        const { data: insertedSale, error: saleInsertError } = await supabase
            .from('sales')
            .insert([{
                customer_id: customerId,
                total_amount: totalAmount,
                profit: totalProfit,
                salesperson_id: sale.salespersonId || null,
                commission_earned: sale.commissionEarned ?? 0,
                created_by: userEmail,
                updated_by: userEmail
            }])
            .select()
            .single();

        if (saleInsertError) throw saleInsertError;

        // 4. Create Sale Items and deduct stock
        const saleItemsToInsert = [];
        for (const item of sale.items) {
            const saree = sareesList?.find(s => s.id === item.sareeId);
            const currentStock = Number(saree?.stock || 0);
            const newStock = Math.max(0, currentStock - item.quantity);

            // Update Saree stock
            const { error: stockUpdateError } = await supabase
                .from('inventory')
                .update({ stock: newStock, updated_by: userEmail })
                .eq('id', item.sareeId);

            if (stockUpdateError) throw stockUpdateError;

            // Prepare item record
            saleItemsToInsert.push({
                sale_id: insertedSale.id,
                saree_id: item.sareeId,
                quantity: item.quantity,
                selling_price: item.sellingPrice
            });
        }

        // Batch insert items
        const { error: itemsInsertError } = await supabase
            .from('sale_items')
            .insert(saleItemsToInsert);

        if (itemsInsertError) throw itemsInsertError;

        return {
            saleId: getFriendlyId(insertedSale.id, false),
            items: sale.items,
            totalAmount,
            profit: totalProfit,
            date: insertedSale.created_at,
            customerName: sale.customerName,
            customerMobile: sale.customerMobile,
            salespersonId: sale.salespersonId,
            commissionEarned: sale.commissionEarned,
        };
    },

    processExchange: async (exchange: {
        returnItems: SaleItem[];
        replaceItems: SaleItem[];
        customerName?: string;
        customerMobile?: string;
    }): Promise<{ exchangeId: string; date: string; success: boolean; netTotalAmount: number }> => {
        // 1. Resolve Customer ID
        let customerId: string | null = null;
        if (exchange.customerMobile) {
            const { data: customer } = await supabase
                .from('customers')
                .select('id')
                .eq('mobile', exchange.customerMobile)
                .maybeSingle();

            if (customer) {
                customerId = customer.id;
            } else if (exchange.customerName) {
                const { data: newCustomer } = await supabase
                    .from('customers')
                    .insert([{
                        name: exchange.customerName,
                        mobile: exchange.customerMobile
                    }])
                    .select()
                    .single();
                customerId = newCustomer?.id;
            }
        }

        // 2. Fetch inventory values
        const allSareeIds = [
            ...exchange.returnItems.map(i => i.sareeId),
            ...exchange.replaceItems.map(i => i.sareeId)
        ];
        const { data: sareesList, error: sareesError } = await supabase
            .from('inventory')
            .select('id, stock, purchase_price, saree_name')
            .in('id', allSareeIds);

        if (sareesError) throw sareesError;

        let netTotalAmount = 0;
        let netProfit = 0;

        // Verify replacement stock
        exchange.replaceItems.forEach(item => {
            const saree = sareesList?.find(s => s.id === item.sareeId);
            if (!saree) throw new Error(`Saree not found for replacement: ${item.sareeId}`);

            const currentStock = Number(saree.stock || 0);
            if (currentStock < item.quantity) {
                throw new Error(`Insufficient stock for replacement ${saree.saree_name} (Available: ${currentStock})`);
            }
        });

        // Calculate Totals:
        // Returns are negative amount and negative profit
        exchange.returnItems.forEach(item => {
            const saree = sareesList?.find(s => s.id === item.sareeId);
            const purchasePrice = Number(saree?.purchase_price || 0);
            const rowAmount = -(item.quantity * item.sellingPrice);
            const rowProfit = rowAmount - (-(item.quantity) * purchasePrice);

            netTotalAmount += rowAmount;
            netProfit += rowProfit;
        });

        // Replacements are positive amount and positive profit
        exchange.replaceItems.forEach(item => {
            const saree = sareesList?.find(s => s.id === item.sareeId);
            const purchasePrice = Number(saree?.purchase_price || 0);
            const rowAmount = item.quantity * item.sellingPrice;
            const rowProfit = rowAmount - (item.quantity * purchasePrice);

            netTotalAmount += rowAmount;
            netProfit += rowProfit;
        });

        // 3. Create Exchange Sale Header
        const userEmail = useAuthStore.getState().user?.email || 'system';
        const { data: insertedSale, error: saleInsertError } = await supabase
            .from('sales')
            .insert([{
                customer_id: customerId,
                total_amount: netTotalAmount,
                profit: netProfit,
                created_by: userEmail,
                updated_by: userEmail
            }])
            .select()
            .single();

        if (saleInsertError) throw saleInsertError;

        // 4. Record details & update stocks (Returned items add stock, Replace items deduct stock)
        const itemsToInsert = [];

        // Returns
        for (const item of exchange.returnItems) {
            const saree = sareesList?.find(s => s.id === item.sareeId);
            const currentStock = Number(saree?.stock || 0);
            const newStock = currentStock + item.quantity;

            await supabase.from('inventory').update({ stock: newStock, updated_by: userEmail }).eq('id', item.sareeId);

            itemsToInsert.push({
                sale_id: insertedSale.id,
                saree_id: item.sareeId,
                quantity: -item.quantity, // Negative quantity representing return
                selling_price: item.sellingPrice
            });
        }

        // Replacements
        for (const item of exchange.replaceItems) {
            const saree = sareesList?.find(s => s.id === item.sareeId);
            const currentStock = Number(saree?.stock || 0);
            const newStock = Math.max(0, currentStock - item.quantity);

            await supabase.from('inventory').update({ stock: newStock, updated_by: userEmail }).eq('id', item.sareeId);

            itemsToInsert.push({
                sale_id: insertedSale.id,
                saree_id: item.sareeId,
                quantity: item.quantity,
                selling_price: item.sellingPrice
            });
        }

        // Batch insert items
        const { error: itemsInsertError } = await supabase
            .from('sale_items')
            .insert(itemsToInsert);

        if (itemsInsertError) throw itemsInsertError;

        return {
            exchangeId: getFriendlyId(insertedSale.id, true),
            date: insertedSale.created_at,
            success: true,
            netTotalAmount
        };
    },
};
