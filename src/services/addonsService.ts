import { supabase } from '@/lib/supabase';

export interface ProductAddon {
    id: string;
    title: string;
    price: number;
    description?: string | null;
    requires_size: boolean;
    is_active: boolean;
    display_order: number;
    created_at?: string;
    updated_at?: string;
}

export const addonsService = {
    /**
     * Fetches all add-on services from product_addons table ordered by display_order
     */
    getAddons: async (): Promise<ProductAddon[]> => {
        const { data, error } = await supabase
            .from('product_addons')
            .select('*')
            .order('display_order', { ascending: true });

        if (error) {
            console.error('Error fetching product addons:', error);
            throw error;
        }

        return (data || []).map((row: any) => ({
            id: String(row.id),
            title: String(row.title || ''),
            price: Number(row.price || 0),
            description: row.description || null,
            requires_size: Boolean(row.requires_size),
            is_active: Boolean(row.is_active),
            display_order: Number(row.display_order || 0),
            created_at: row.created_at,
            updated_at: row.updated_at,
        }));
    },

    /**
     * Creates a new add-on service
     */
    createAddon: async (addon: Omit<ProductAddon, 'created_at' | 'updated_at'>): Promise<ProductAddon> => {
        const payload = {
            id: addon.id.trim().toLowerCase().replace(/\s+/g, '_'),
            title: addon.title.trim(),
            price: Number(addon.price || 0),
            description: addon.description ? addon.description.trim() : null,
            requires_size: Boolean(addon.requires_size),
            is_active: addon.is_active !== false,
            display_order: Number(addon.display_order || 0),
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('product_addons')
            .insert([payload])
            .select()
            .single();

        if (error) {
            console.error('Error creating product addon:', error);
            throw error;
        }

        return {
            id: String(data.id),
            title: String(data.title),
            price: Number(data.price),
            description: data.description,
            requires_size: Boolean(data.requires_size),
            is_active: Boolean(data.is_active),
            display_order: Number(data.display_order),
            created_at: data.created_at,
            updated_at: data.updated_at,
        };
    },

    /**
     * Updates an existing add-on service
     */
    updateAddon: async (id: string, updates: Partial<ProductAddon>): Promise<ProductAddon> => {
        const payload: Record<string, any> = {
            updated_at: new Date().toISOString(),
        };

        if (updates.title !== undefined) payload.title = updates.title.trim();
        if (updates.price !== undefined) payload.price = Number(updates.price || 0);
        if (updates.description !== undefined) payload.description = updates.description ? updates.description.trim() : null;
        if (updates.requires_size !== undefined) payload.requires_size = Boolean(updates.requires_size);
        if (updates.is_active !== undefined) payload.is_active = Boolean(updates.is_active);
        if (updates.display_order !== undefined) payload.display_order = Number(updates.display_order || 0);

        const { data, error } = await supabase
            .from('product_addons')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating product addon:', error);
            throw error;
        }

        return {
            id: String(data.id),
            title: String(data.title),
            price: Number(data.price),
            description: data.description,
            requires_size: Boolean(data.requires_size),
            is_active: Boolean(data.is_active),
            display_order: Number(data.display_order),
            created_at: data.created_at,
            updated_at: data.updated_at,
        };
    },

    /**
     * Toggles active state of an addon
     */
    toggleActive: async (id: string, isActive: boolean): Promise<void> => {
        const { error } = await supabase
            .from('product_addons')
            .update({
                is_active: isActive,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) {
            console.error('Error toggling product addon active state:', error);
            throw error;
        }
    },

    /**
     * Deletes an add-on service
     */
    deleteAddon: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('product_addons')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting product addon:', error);
            throw error;
        }
    },
};
