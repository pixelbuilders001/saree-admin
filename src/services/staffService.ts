import { supabase } from '@/lib/supabase';

export interface Staff {
    id: string;
    name: string;
    phone?: string;
    commission_rate: number;
    is_active: boolean;
}

export const staffService = {
    getActiveStaff: async (): Promise<Staff[]> => {
        const { data, error } = await supabase
            .from('staff')
            .select('id, name, phone, commission_rate, is_active')
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching staff:', error);
            throw error;
        }
        return data || [];
    },

    getAllStaff: async (): Promise<Staff[]> => {
        const { data, error } = await supabase
            .from('staff')
            .select('id, name, phone, commission_rate, is_active')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching all staff:', error);
            throw error;
        }
        return data || [];
    },
};

export default staffService;
