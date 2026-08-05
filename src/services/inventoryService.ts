import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export interface Saree {
    id: string;
    sareeName: string;
    category: string;
    fabric: string;
    color: string;
    purchasePrice: number;
    sellingPrice: number;
    stock: number;
    rackNo: string;
    barcode: string;
    addedDate: string;
    status: 'active' | 'inactive';
    createdBy?: string;
    updatedBy?: string;
}

export const inventoryService = {
    getSarees: async (): Promise<Saree[]> => {
        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((item: any) => ({
            id: item.id,
            sareeName: item.saree_name,
            category: item.category,
            fabric: item.fabric,
            color: item.color,
            purchasePrice: Number(item.purchase_price),
            sellingPrice: Number(item.selling_price),
            stock: Number(item.stock),
            rackNo: item.rack_no || '',
            barcode: item.barcode || '',
            addedDate: item.created_at,
            status: item.status as 'active' | 'inactive',
            createdBy: item.created_by || '',
            updatedBy: item.updated_by || '',
        }));
    },

    getSareeById: async (id: string): Promise<Saree> => {
        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) throw new Error('Saree not found');

        return {
            id: data.id,
            sareeName: data.saree_name,
            category: data.category,
            fabric: data.fabric,
            color: data.color,
            purchasePrice: Number(data.purchase_price),
            sellingPrice: Number(data.selling_price),
            stock: Number(data.stock),
            rackNo: data.rack_no || '',
            barcode: data.barcode || '',
            addedDate: data.created_at,
            status: data.status as 'active' | 'inactive',
            createdBy: data.created_by || '',
            updatedBy: data.updated_by || '',
        };
    },

    createSaree: async (saree: Omit<Saree, 'id' | 'addedDate'>): Promise<Saree> => {
        // Generate a random ID (e.g. S-XXXX) for standard inventory item
        const randId = 'S' + Math.floor(1000 + Math.random() * 9000);
        const userEmail = useAuthStore.getState().user?.email || 'system';
        const newSaree = {
            id: randId,
            saree_name: saree.sareeName,
            category: saree.category,
            fabric: saree.fabric,
            color: saree.color,
            purchase_price: saree.purchasePrice,
            selling_price: saree.sellingPrice,
            stock: saree.stock,
            rack_no: saree.rackNo,
            barcode: saree.barcode || randId,
            status: saree.status || 'active',
            created_by: userEmail,
            updated_by: userEmail,
        };

        const { data, error } = await supabase
            .from('inventory')
            .insert([newSaree])
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            sareeName: data.saree_name,
            category: data.category,
            fabric: data.fabric,
            color: data.color,
            purchasePrice: Number(data.purchase_price),
            sellingPrice: Number(data.selling_price),
            stock: Number(data.stock),
            rackNo: data.rack_no || '',
            barcode: data.barcode || '',
            addedDate: data.created_at,
            status: data.status as 'active' | 'inactive',
            createdBy: data.created_by || '',
            updatedBy: data.updated_by || '',
        };
    },

    updateSaree: async (id: string, saree: Partial<Saree>): Promise<Saree> => {
        const updateData: any = {};
        if (saree.sareeName !== undefined) updateData.saree_name = saree.sareeName;
        if (saree.category !== undefined) updateData.category = saree.category;
        if (saree.fabric !== undefined) updateData.fabric = saree.fabric;
        if (saree.color !== undefined) updateData.color = saree.color;
        if (saree.purchasePrice !== undefined) updateData.purchase_price = saree.purchasePrice;
        if (saree.sellingPrice !== undefined) updateData.selling_price = saree.sellingPrice;
        if (saree.stock !== undefined) updateData.stock = saree.stock;
        if (saree.rackNo !== undefined) updateData.rack_no = saree.rackNo;
        if (saree.barcode !== undefined) updateData.barcode = saree.barcode;
        if (saree.status !== undefined) updateData.status = saree.status;

        const userEmail = useAuthStore.getState().user?.email || 'system';
        updateData.updated_by = userEmail;

        const { data, error } = await supabase
            .from('inventory')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            sareeName: data.saree_name,
            category: data.category,
            fabric: data.fabric,
            color: data.color,
            purchasePrice: Number(data.purchase_price),
            sellingPrice: Number(data.selling_price),
            stock: Number(data.stock),
            rackNo: data.rack_no || '',
            barcode: data.barcode || '',
            addedDate: data.created_at,
            status: data.status as 'active' | 'inactive',
            createdBy: data.created_by || '',
            updatedBy: data.updated_by || '',
        };
    },

    deleteSaree: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('inventory')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    bulkCreateSarees: async (rows: Omit<Saree, 'id' | 'addedDate'>[]): Promise<{ inserted: number; errors: string[] }> => {
        const userEmail = useAuthStore.getState().user?.email || 'system';
        const errors: string[] = [];
        const records: any[] = [];

        rows.forEach((row, idx) => {
            // Validate required fields
            if (!row.sareeName || !row.category || !row.fabric || !row.color) {
                errors.push(`Row ${idx + 2}: Missing required field (name/category/fabric/color)`);
                return;
            }
            if (isNaN(Number(row.purchasePrice)) || isNaN(Number(row.sellingPrice))) {
                errors.push(`Row ${idx + 2}: Invalid price value`);
                return;
            }
            const randId = 'S' + Math.floor(1000 + Math.random() * 9000) + Math.floor(Math.random() * 9);
            records.push({
                id: randId,
                saree_name: String(row.sareeName).trim(),
                category: String(row.category).trim(),
                fabric: String(row.fabric).trim(),
                color: String(row.color).trim(),
                purchase_price: Number(row.purchasePrice),
                selling_price: Number(row.sellingPrice),
                stock: Number(row.stock) || 0,
                rack_no: row.rackNo ? String(row.rackNo).trim() : null,
                barcode: row.barcode ? String(row.barcode).trim() : randId,
                status: row.status === 'inactive' ? 'inactive' : 'active',
                created_by: userEmail,
                updated_by: userEmail,
            });
        });

        if (records.length === 0) {
            return { inserted: 0, errors };
        }

        const { error } = await supabase.from('inventory').insert(records);
        if (error) throw error;

        return { inserted: records.length, errors };
    },
};
