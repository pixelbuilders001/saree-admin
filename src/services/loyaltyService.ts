import { supabase } from '@/lib/supabase';
import type { LoyaltyCustomerInfo, LoyaltyProfile } from '@/types/loyalty';

export const loyaltyService = {
    /**
     * Generate a random 6-digit numeric PIN for the customer.
     */
    generateRandomPin: (): string => {
        return Math.floor(100000 + Math.random() * 900000).toString();
    },

    /**
     * Generate an unguessable 6-character member code (e.g., SR-K7M4P2).
     */
    generateMemberCode: (): string => {
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // base32 without easily confused chars (0, O, 1, I)
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `SR-${code}`;
    },

    /**
     * Public RPC: Check if member code exists (no personal info returned).
     */
    getPublicInfo: async (memberCode: string): Promise<{ valid: boolean; member_code?: string; error?: string }> => {
        const { data, error } = await supabase.rpc('get_loyalty_public_info', {
            p_member_code: memberCode.toUpperCase().trim()
        });
        if (error) {
            console.error('get_loyalty_public_info error:', error);
            return { valid: false, error: error.message };
        }
        return data as { valid: boolean; member_code?: string; error?: string };
    },

    /**
     * Public RPC: Verify 6-digit PIN and fetch customer passbook if valid.
     */
    verifyAndFetchRewards: async (memberCode: string, pin: string): Promise<LoyaltyCustomerInfo> => {
        const { data, error } = await supabase.rpc('verify_and_fetch_rewards', {
            p_member_code: memberCode.toUpperCase().trim(),
            p_pin: pin.trim()
        });

        if (error) {
            console.error('verify_and_fetch_rewards error:', error);
            return { valid: false, member_code: memberCode, error: error.message };
        }

        const res = data as any;
        if (!res?.success) {
            return {
                valid: false,
                member_code: memberCode,
                error: res?.error || 'Verification failed'
            };
        }

        return {
            valid: true,
            member_code: res.member_code,
            first_name: res.first_name,
            tier: res.tier,
            balance: res.balance,
            activity: res.activity || []
        };
    },

    /**
     * Cashier / Admin RPC: Set or reset a customer's loyalty PIN.
     * PIN is immediately hashed via bcrypt inside Postgres; plaintext is never stored.
     */
    setCustomerPin: async (
        customerId: string,
        pin: string,
        memberCode?: string
    ): Promise<{ success: boolean; member_code?: string; error?: string }> => {
        const { data, error } = await supabase.rpc('set_customer_loyalty_pin', {
            p_customer_id: customerId,
            p_pin: pin.trim(),
            p_member_code: memberCode || null
        });

        if (error) {
            console.error('set_customer_loyalty_pin error:', error);
            return { success: false, error: error.message };
        }

        return data as { success: boolean; member_code?: string; error?: string };
    },

    /**
     * Get loyalty profile details for an in-store customer by customer ID.
     */
    getCustomerLoyaltyProfile: async (customerId: string): Promise<LoyaltyProfile | null> => {
        const { data, error } = await supabase
            .from('customers')
            .select('loyalty_member_code, loyalty_pin_hash, loyalty_points_balance, loyalty_tier, pin_locked_until')
            .eq('id', customerId)
            .maybeSingle();

        if (error || !data) return null;

        const isLocked = Boolean(data.pin_locked_until && new Date(data.pin_locked_until) > new Date());

        return {
            memberCode: data.loyalty_member_code || null,
            pointsBalance: Number(data.loyalty_points_balance || 0),
            tier: data.loyalty_tier || 'Silver',
            hasPin: Boolean(data.loyalty_pin_hash),
            isLocked
        };
    }
};
