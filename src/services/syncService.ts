import { supabase } from '@/lib/supabase';

export interface ScannedItem {
    barcode: string;
    timestamp: string;
}

export const syncService = {
    pushScannedItem: async (sessionId: string, barcode: string): Promise<{ success: boolean }> => {
        const { error } = await supabase
            .from('sync_scans')
            .insert([{
                session_id: sessionId,
                barcode
            }]);

        if (error) throw error;
        return { success: true };
    },

    getScannedItems: async (sessionId: string): Promise<ScannedItem[]> => {
        // 1. Fetch scanned items for this session
        const { data, error: fetchError } = await supabase
            .from('sync_scans')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        if (!data || data.length === 0) return [];

        // 2. Clear retrieved items so they aren't processed again
        const ids = data.map(item => item.id);
        const { error: deleteError } = await supabase
            .from('sync_scans')
            .delete()
            .in('id', ids);

        if (deleteError) throw deleteError;

        return data.map((item: any) => ({
            barcode: item.barcode,
            timestamp: item.created_at
        }));
    }
};
