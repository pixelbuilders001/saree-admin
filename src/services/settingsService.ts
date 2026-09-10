import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export interface UpiSetting {
    id?: string;
    upi_id: string;
    label: string;
    is_active: boolean;
    created_at?: string;
}

export interface DeliverySettings {
    id: string;
    serviceable_district: string;
    serviceable_state: string;
    default_pincode: string | null;
    shop_latitude: number | null;
    shop_longitude: number | null;
    is_active: boolean;
    is_express_20min_enabled: boolean;
    express_max_km: number;
    same_day_max_km: number;
    standard_max_km: number;
    express_charge: number;
    same_day_charge: number;
    standard_charge: number;
    express_min_minutes: number;
    express_max_minutes: number;
    express_packing_buffer_minutes: number;
    express_delivery_buffer_minutes: number;
    same_day_cutoff_time: string;
    created_at?: string;
    updated_at?: string;
}

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
    id: 'default',
    serviceable_district: 'Samastipur',
    serviceable_state: 'Bihar',
    default_pincode: '848101',
    shop_latitude: 25.8629,
    shop_longitude: 85.781,
    is_active: true,
    is_express_20min_enabled: true,
    express_max_km: 5,
    same_day_max_km: 10,
    standard_max_km: 25,
    express_charge: 29,
    same_day_charge: 49,
    standard_charge: 69,
    express_min_minutes: 60,
    express_max_minutes: 120,
    express_packing_buffer_minutes: 3,
    express_delivery_buffer_minutes: 3,
    same_day_cutoff_time: '17:00:00',
};

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
    },

    getDeliverySettings: async (): Promise<DeliverySettings> => {
        const { data, error } = await supabase
            .from('delivery_settings')
            .select('*')
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error fetching delivery settings:', error);
            return DEFAULT_DELIVERY_SETTINGS;
        }

        if (!data) {
            return DEFAULT_DELIVERY_SETTINGS;
        }

        return {
            ...DEFAULT_DELIVERY_SETTINGS,
            ...data,
            express_max_km: Number(data.express_max_km ?? 5),
            same_day_max_km: Number(data.same_day_max_km ?? 10),
            standard_max_km: Number(data.standard_max_km ?? 25),
            express_charge: Number(data.express_charge ?? 29),
            same_day_charge: Number(data.same_day_charge ?? 49),
            standard_charge: Number(data.standard_charge ?? 69),
            express_min_minutes: Number(data.express_min_minutes ?? 60),
            express_max_minutes: Number(data.express_max_minutes ?? 120),
            express_packing_buffer_minutes: Number(data.express_packing_buffer_minutes ?? 3),
            express_delivery_buffer_minutes: Number(data.express_delivery_buffer_minutes ?? 3),
            shop_latitude: data.shop_latitude != null ? Number(data.shop_latitude) : null,
            shop_longitude: data.shop_longitude != null ? Number(data.shop_longitude) : null,
            is_active: data.is_active ?? true,
            is_express_20min_enabled: data.is_express_20min_enabled ?? true,
            same_day_cutoff_time: data.same_day_cutoff_time || '17:00:00',
        };
    },

    saveDeliverySettings: async (settings: Partial<DeliverySettings>): Promise<DeliverySettings> => {
        const payload = {
            id: 'default',
            serviceable_district: (settings.serviceable_district || 'Samastipur').trim(),
            serviceable_state: (settings.serviceable_state || 'Bihar').trim(),
            default_pincode: settings.default_pincode ? settings.default_pincode.trim() : null,
            shop_latitude: settings.shop_latitude !== undefined && settings.shop_latitude !== null && !isNaN(Number(settings.shop_latitude)) ? Number(settings.shop_latitude) : null,
            shop_longitude: settings.shop_longitude !== undefined && settings.shop_longitude !== null && !isNaN(Number(settings.shop_longitude)) ? Number(settings.shop_longitude) : null,
            is_active: settings.is_active ?? true,
            is_express_20min_enabled: settings.is_express_20min_enabled ?? true,
            express_max_km: Number(settings.express_max_km ?? 5),
            same_day_max_km: Number(settings.same_day_max_km ?? 10),
            standard_max_km: Number(settings.standard_max_km ?? 25),
            express_charge: Number(settings.express_charge ?? 29),
            same_day_charge: Number(settings.same_day_charge ?? 49),
            standard_charge: Number(settings.standard_charge ?? 69),
            express_min_minutes: Number(settings.express_min_minutes ?? 60),
            express_max_minutes: Number(settings.express_max_minutes ?? 120),
            express_packing_buffer_minutes: Number(settings.express_packing_buffer_minutes ?? 3),
            express_delivery_buffer_minutes: Number(settings.express_delivery_buffer_minutes ?? 3),
            same_day_cutoff_time: settings.same_day_cutoff_time ? (settings.same_day_cutoff_time.length === 5 ? `${settings.same_day_cutoff_time}:00` : settings.same_day_cutoff_time) : '17:00:00',
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('delivery_settings')
            .upsert([payload], { onConflict: 'id' })
            .select()
            .single();

        if (error) {
            console.error('Error saving delivery settings:', error);
            throw error;
        }

        return data;
    }
};
export default settingsService;
