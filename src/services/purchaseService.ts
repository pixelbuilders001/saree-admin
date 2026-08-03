import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export interface Purchase {
    purchaseId: string;
    sareeId: string;
    sareeName: string;
    quantity: number;
    purchasePrice: number;
    supplier: string;
    date: string;
}

export const purchaseService = {
    getPurchases: async (): Promise<Purchase[]> => {
        const { data, error } = await supabase
            .from('purchases')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((x: any) => ({
            purchaseId: x.id,
            sareeId: x.saree_id,
            sareeName: x.saree_name,
            quantity: Number(x.quantity),
            purchasePrice: Number(x.purchase_price),
            supplier: x.supplier,
            date: x.created_at,
        }));
    },

    createPurchase: async (purchase: Omit<Purchase, 'purchaseId' | 'date'>): Promise<Purchase> => {
        // 1. Fetch current stock of the saree
        const { data: saree, error: fetchError } = await supabase
            .from('inventory')
            .select('stock')
            .eq('id', purchase.sareeId)
            .single();

        if (fetchError) throw fetchError;

        const currentStock = Number(saree?.stock || 0);
        const newStock = currentStock + purchase.quantity;

        // 2. Update stock & purchase price inside sarees table
        const userEmail = useAuthStore.getState().user?.email || 'system';
        const { error: updateError } = await supabase
            .from('inventory')
            .update({
                stock: newStock,
                purchase_price: purchase.purchasePrice,
                updated_by: userEmail,
            })
            .eq('id', purchase.sareeId);

        if (updateError) throw updateError;

        // 3. Insert purchase record
        const { data, error: insertError } = await supabase
            .from('purchases')
            .insert([{
                saree_id: purchase.sareeId,
                saree_name: purchase.sareeName,
                quantity: purchase.quantity,
                purchase_price: purchase.purchasePrice,
                supplier: purchase.supplier,
                created_by: userEmail,
                updated_by: userEmail,
            }])
            .select()
            .single();

        if (insertError) throw insertError;

        return {
            purchaseId: data.id,
            sareeId: data.saree_id,
            sareeName: data.saree_name,
            quantity: Number(data.quantity),
            purchasePrice: Number(data.purchase_price),
            supplier: data.supplier,
            date: data.created_at,
        };
    },
};
