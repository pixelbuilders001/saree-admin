import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export interface UpiSetting {
    id?: string;
    upi_id: string;
    label: string;
    is_active: boolean;
    created_at?: string;
}

export const settingsService = {
    getUpiSettings: async (): Promise<UpiSetting[]> => {
        const { data, error } = await supabase
            .from('upi_settings')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching UPI settings:', error);
            if (error.code === 'PGRST205') {
                return [{
                    upi_id: '7461824651@ybl',
                    label: 'Primary - YBL',
                    is_active: true
                }];
            }
            throw error;
        }
        return data || [];
    },

    saveUpiSetting: async (setting: Omit<UpiSetting, 'created_at'>): Promise<UpiSetting> => {
        const userEmail = useAuthStore.getState().user?.email || 'system';
        const record = {
            ...setting,
            updated_by: userEmail,
            created_by: userEmail
        };
        const { data, error } = await supabase
            .from('upi_settings')
            .upsert([record])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    deleteUpiSetting: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('upi_settings')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
export default settingsService;
