import { supabase } from '@/lib/supabase';

export interface PushNotification {
    id: string;
    title: string;
    body: string;
    url: string | null;
    audience: string; // 'all' or 'user'
    targetUserId: string | null;
    notificationType: string;
    sentCount: number;
    failedCount: number;
    sentBy: string | null;
    createdAt: string;
}

export interface OnlineProfile {
    id: string;
    fullName: string | null;
    email: string | null;
    phoneNumber: string | null;
}

export const pushNotificationService = {
    getNotifications: async (): Promise<PushNotification[]> => {
        const { data, error } = await supabase
            .from('push_notifications')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((item: any) => ({
            id: item.id,
            title: item.title,
            body: item.body,
            url: item.url,
            audience: item.audience,
            targetUserId: item.target_user_id,
            notificationType: item.notification_type,
            sentCount: Number(item.sent_count || 0),
            failedCount: Number(item.failed_count || 0),
            sentBy: item.sent_by,
            createdAt: item.created_at
        }));
    },

    getSubscribedTokenCount: async (): Promise<number> => {
        const { count, error } = await supabase
            .from('push_tokens')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        if (error) throw error;
        return count || 0;
    },

    getOnlineProfiles: async (): Promise<OnlineProfile[]> => {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone_number')
            .order('full_name', { ascending: true });

        if (error) throw error;

        return (data || []).map((p: any) => ({
            id: p.id,
            fullName: p.full_name,
            email: p.email,
            phoneNumber: p.phone_number
        }));
    },

    sendNotification: async (payload: {
        title: string;
        body: string;
        url?: string;
        audience: 'all' | 'user';
        targetUserId?: string;
    }): Promise<{ success: boolean; sentCount: number; failedCount: number; message?: string }> => {
        const { data, error } = await supabase.functions.invoke('send-push', {
            body: {
                title: payload.title,
                body: payload.body,
                url: payload.url || null,
                audience: payload.audience,
                target_user_id: payload.targetUserId || null
            }
        });

        if (error) {
            console.error('Edge Function invocation error:', error);
            throw new Error(error.message || 'Failed to send notification via Edge Function');
        }

        // Map response data supporting both camelCase and snake_case attributes
        const sentCount = Number(data?.sentCount ?? data?.sent_count ?? data?.sent ?? 0);
        const failedCount = Number(data?.failedCount ?? data?.failed_count ?? data?.failed ?? 0);
        const success = data?.success ?? (sentCount > 0 || failedCount === 0);

        return {
            success,
            sentCount,
            failedCount,
            message: data?.message || data?.error
        };
    }
};

