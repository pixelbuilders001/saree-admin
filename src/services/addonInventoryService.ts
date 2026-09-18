import { supabase } from '@/lib/supabase';

export interface Addon {
    id: string;
    name: string;
    category: string;
    purchase_price: number;
    selling_price: number;
    stock: number;
    status: 'active' | 'inactive';
    created_at?: string;
    updated_at?: string;
}

export type CreateAddonDTO = {
    name: string;
    category: string;
    purchase_price: number;
    selling_price: number;
    stock: number;
    status: 'active' | 'inactive';
};

export type UpdateAddonDTO = Partial<CreateAddonDTO>;

export const PREDEFINED_ADDON_CATEGORIES = [
    'Blouse',
    'Petticoat',
    'Fall & Pico',
    'Packaging',
    'Other'
] as const;

export const addonInventoryService = {
    /**
     * Fetch all add-ons from public.addons table
     */
    getAddons: async (): Promise<Addon[]> => {
        const { data, error } = await supabase
            .from('addons')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching addons:', error);
            throw error;
        }

        return (data || []).map((row: any) => ({
            id: String(row.id),
            name: String(row.name || ''),
            category: String(row.category || 'Other'),
            purchase_price: Number(row.purchase_price || 0),
            selling_price: Number(row.selling_price || 0),
            stock: Number(row.stock || 0),
            status: (row.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
            created_at: row.created_at,
            updated_at: row.updated_at,
        }));
    },

    /**
     * Create a new add-on record in public.addons
     * Note: Only send name, category, purchase_price, selling_price, stock, status
     * Do NOT send id or created_at
     */
    createAddon: async (addon: CreateAddonDTO): Promise<Addon> => {
        const payload = {
            name: addon.name.trim(),
            category: addon.category.trim(),
            purchase_price: Math.max(0, Number(addon.purchase_price || 0)),
            selling_price: Math.max(0, Number(addon.selling_price || 0)),
            stock: Math.max(0, Math.floor(Number(addon.stock || 0))),
            status: addon.status || 'active',
        };

        const { data, error } = await supabase
            .from('addons')
            .insert([payload])
            .select()
            .single();

        if (error) {
            console.error('Error creating addon:', error);
            throw error;
        }

        return {
            id: String(data.id),
            name: String(data.name),
            category: String(data.category),
            purchase_price: Number(data.purchase_price),
            selling_price: Number(data.selling_price),
            stock: Number(data.stock),
            status: (data.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
            created_at: data.created_at,
            updated_at: data.updated_at,
        };
    },

    /**
     * Update an existing add-on record by id
     */
    updateAddon: async (id: string, updates: UpdateAddonDTO): Promise<Addon> => {
        const payload: Record<string, any> = {
            updated_at: new Date().toISOString(),
        };

        if (updates.name !== undefined) payload.name = updates.name.trim();
        if (updates.category !== undefined) payload.category = updates.category.trim();
        if (updates.purchase_price !== undefined) payload.purchase_price = Math.max(0, Number(updates.purchase_price));
        if (updates.selling_price !== undefined) payload.selling_price = Math.max(0, Number(updates.selling_price));
        if (updates.stock !== undefined) payload.stock = Math.max(0, Math.floor(Number(updates.stock)));
        if (updates.status !== undefined) payload.status = updates.status;

        const { data, error } = await supabase
            .from('addons')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating addon:', error);
            throw error;
        }

        return {
            id: String(data.id),
            name: String(data.name),
            category: String(data.category),
            purchase_price: Number(data.purchase_price),
            selling_price: Number(data.selling_price),
            stock: Number(data.stock),
            status: (data.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
            created_at: data.created_at,
            updated_at: data.updated_at,
        };
    },

    /**
     * Delete an add-on record by id
     */
    deleteAddon: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('addons')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting addon:', error);
            throw error;
        }
    },
};
