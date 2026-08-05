import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export interface StoreCredit {
    id: string;
    voucherCode: string;
    customerId: string;
    customerName?: string;
    customerMobile?: string;
    originalAmount: number;
    remainingAmount: number;
    status: 'active' | 'used' | 'expired';
    notes?: string;
    issuedBy?: string;
    createdAt: string;
    expiresAt?: string;
}

// Generate a unique SBS-XXXXXX code
const generateVoucherCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1 to avoid confusion
    let code = 'SBS-';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
};

export const creditService = {

    /**
     * Issue a new store credit voucher for a customer.
     * Called from Exchange page when returnTotal > replaceTotal.
     */
    issueCredit: async (
        customerId: string,
        amount: number,
        notes?: string,
    ): Promise<StoreCredit> => {
        const userEmail = useAuthStore.getState().user?.email || 'system';
        const voucherCode = generateVoucherCode();

        // Set expiry 1 year from now
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        const { data, error } = await supabase
            .from('store_credits')
            .insert([{
                voucher_code: voucherCode,
                customer_id: customerId,
                original_amount: amount,
                remaining_amount: amount,
                status: 'active',
                notes: notes || null,
                issued_by: userEmail,
                expires_at: expiresAt.toISOString(),
            }])
            .select(`
                id, voucher_code, customer_id, original_amount, remaining_amount,
                status, notes, issued_by, created_at, expires_at,
                customers ( name, mobile )
            `)
            .single();

        if (error) throw error;

        return {
            id: data.id,
            voucherCode: data.voucher_code,
            customerId: data.customer_id,
            customerName: (data.customers as any)?.name,
            customerMobile: (data.customers as any)?.mobile,
            originalAmount: Number(data.original_amount),
            remainingAmount: Number(data.remaining_amount),
            status: data.status,
            notes: data.notes,
            issuedBy: data.issued_by,
            createdAt: data.created_at,
            expiresAt: data.expires_at,
        };
    },

    /**
     * Look up a voucher code — validate before applying at POS.
     * Returns null if not found / expired / used.
     */
    lookupCredit: async (voucherCode: string): Promise<StoreCredit | null> => {
        const { data, error } = await supabase
            .from('store_credits')
            .select(`
                id, voucher_code, customer_id, original_amount, remaining_amount,
                status, notes, issued_by, created_at, expires_at,
                customers ( name, mobile )
            `)
            .eq('voucher_code', voucherCode.toUpperCase().trim())
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return {
            id: data.id,
            voucherCode: data.voucher_code,
            customerId: data.customer_id,
            customerName: (data.customers as any)?.name,
            customerMobile: (data.customers as any)?.mobile,
            originalAmount: Number(data.original_amount),
            remainingAmount: Number(data.remaining_amount),
            status: data.status,
            notes: data.notes,
            issuedBy: data.issued_by,
            createdAt: data.created_at,
            expiresAt: data.expires_at,
        };
    },

    /**
     * Retrieve all active store credits for a specific customer.
     */
    getActiveCreditsForCustomer: async (customerId: string): Promise<StoreCredit[]> => {
        const { data, error } = await supabase
            .from('store_credits')
            .select(`
                id, voucher_code, customer_id, original_amount, remaining_amount,
                status, notes, issued_by, created_at, expires_at,
                customers ( name, mobile )
            `)
            .eq('customer_id', customerId)
            .eq('status', 'active');

        if (error) throw error;
        if (!data) return [];

        return data.map(item => ({
            id: item.id,
            voucherCode: item.voucher_code,
            customerId: item.customer_id,
            customerName: (item.customers as any)?.name,
            customerMobile: (item.customers as any)?.mobile,
            originalAmount: Number(item.original_amount),
            remainingAmount: Number(item.remaining_amount),
            status: item.status as 'active',
            notes: item.notes,
            issuedBy: item.issued_by,
            createdAt: item.created_at,
            expiresAt: item.expires_at,
        }));
    },

    /**
     * Mark a credit voucher as used or partially used after successful sale.
     */
    redeemCredit: async (voucherCode: string, saleId: string, amountToRedeem: number): Promise<void> => {
        // Fetch current credit first to know remaining_amount
        const credit = await creditService.lookupCredit(voucherCode);
        if (!credit) throw new Error('Voucher code not found');
        if (credit.status !== 'active') throw new Error('Voucher is not active');

        const newRemaining = Math.max(0, credit.remainingAmount - amountToRedeem);
        const newStatus = newRemaining <= 0 ? 'used' : 'active';

        const { error } = await supabase
            .from('store_credits')
            .update({
                status: newStatus,
                remaining_amount: newRemaining,
                used_in_sale_id: newStatus === 'used' ? saleId : null,
            })
            .eq('voucher_code', voucherCode.toUpperCase().trim());

        if (error) throw error;
    },
};
