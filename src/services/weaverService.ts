import { supabase } from '@/lib/supabase';
import { purchaseService, type Purchase } from './purchaseService';
import { useAuthStore } from '@/store/useAuthStore';

export interface Weaver {
    id: string; // uuid
    name: string;
    mobile: string;
    city: 'Banaras' | 'Kanchipuram' | 'Surat' | 'Other' | string;
    notes?: string;
    createdAt: string;
}

export interface WeaverPayment {
    id: string; // uuid
    weaverId: string;
    amount: number;
    paymentMethod: 'Cash' | 'UPI';
    notes?: string;
    date: string;
}

export interface WeaverWithStats extends Weaver {
    totalGoods: number;
    totalPaid: number;
    balance: number;
}

export interface WeaverActivity {
    id: string;
    type: 'purchase' | 'payment';
    date: string;
    description: string;
    amount: number;
    details?: string; // Saree details for buy, paymentMethod for pay
}

export const weaverService = {
    // Get all weavers from Supabase
    getWeavers: async (): Promise<Weaver[]> => {
        const { data, error } = await supabase
            .from('weavers')
            .select('*')
            .order('name');

        if (error) throw error;

        return (data || []).map((x: any) => ({
            id: x.id,
            name: x.name,
            mobile: x.mobile,
            city: x.city,
            notes: x.notes || '',
            createdAt: x.created_at
        }));
    },

    // Get all payments from Supabase
    getPayments: async (): Promise<WeaverPayment[]> => {
        const { data, error } = await supabase
            .from('weaver_payments')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((x: any) => ({
            id: x.id,
            weaverId: x.weaver_id,
            amount: Number(x.amount),
            paymentMethod: x.payment_method as 'Cash' | 'UPI',
            notes: x.notes || '',
            date: x.created_at
        }));
    },

    // Get all weavers, fetch all purchases from Supabase, and calculate stats
    getWeaversWithLedger: async (): Promise<WeaverWithStats[]> => {
        // Fetch everything from DB in parallel
        const [weavers, payments, purchases] = await Promise.all([
            weaverService.getWeavers(),
            weaverService.getPayments(),
            purchaseService.getPurchases()
        ]);

        return weavers.map(weaver => {
            const weaverNameLower = weaver.name.trim().toLowerCase();

            // Total Goods Received = Sum(purchasePrice * quantity) where supplier name matches
            const matchedPurchases = purchases.filter(p =>
                p.supplier && p.supplier.trim().toLowerCase() === weaverNameLower
            );
            const totalGoods = matchedPurchases.reduce(
                (sum, p) => sum + (p.purchasePrice * p.quantity),
                0
            );

            // Total Paid = Sum(amount) for payments to this weaver
            const matchedPayments = payments.filter(p => p.weaverId === weaver.id);
            const totalPaid = matchedPayments.reduce((sum, p) => sum + p.amount, 0);

            return {
                ...weaver,
                totalGoods,
                totalPaid,
                balance: totalGoods - totalPaid
            };
        });
    },

    // Add a new weaver to Supabase
    createWeaver: async (weaver: Omit<Weaver, 'id' | 'createdAt'>): Promise<Weaver> => {
        const userEmail = useAuthStore.getState().user?.email || 'system';

        const { data, error } = await supabase
            .from('weavers')
            .insert([{
                name: weaver.name,
                mobile: weaver.mobile,
                city: weaver.city,
                notes: weaver.notes,
                created_by: userEmail,
                updated_by: userEmail
            }])
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            name: data.name,
            mobile: data.mobile,
            city: data.city,
            notes: data.notes || '',
            createdAt: data.created_at
        };
    },

    // Update a weaver profile in Supabase
    updateWeaver: async (id: string, updates: Partial<Omit<Weaver, 'id' | 'createdAt'>>): Promise<Weaver> => {
        const userEmail = useAuthStore.getState().user?.email || 'system';
        const dataToUpdate: any = {};

        if (updates.name !== undefined) dataToUpdate.name = updates.name;
        if (updates.mobile !== undefined) dataToUpdate.mobile = updates.mobile;
        if (updates.city !== undefined) dataToUpdate.city = updates.city;
        if (updates.notes !== undefined) dataToUpdate.notes = updates.notes;
        dataToUpdate.updated_by = userEmail;

        const { data, error } = await supabase
            .from('weavers')
            .update(dataToUpdate)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            name: data.name,
            mobile: data.mobile,
            city: data.city,
            notes: data.notes || '',
            createdAt: data.created_at
        };
    },

    // Delete a weaver profile and Cascade-delete payments from Supabase
    deleteWeaver: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('weavers')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Record a payment to a weaver in Supabase
    recordPayment: async (payment: Omit<WeaverPayment, 'id' | 'date'>): Promise<WeaverPayment> => {
        const userEmail = useAuthStore.getState().user?.email || 'system';

        const { data, error } = await supabase
            .from('weaver_payments')
            .insert([{
                weaver_id: payment.weaverId,
                amount: payment.amount,
                payment_method: payment.paymentMethod,
                notes: payment.notes,
                created_by: userEmail,
                updated_by: userEmail
            }])
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            weaverId: data.weaver_id,
            amount: Number(data.amount),
            paymentMethod: data.payment_method as 'Cash' | 'UPI',
            notes: data.notes || '',
            date: data.created_at
        };
    },

    // Delete a payment recorded in the database
    deletePayment: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('weaver_payments')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Get chronologically sorted history of transactions (purchases and payments)
    getWeaverActivity: async (weaverId: string, name: string): Promise<WeaverActivity[]> => {
        // Fetch purchases and payments in parallel
        const [purchases, payments] = await Promise.all([
            purchaseService.getPurchases(),
            weaverService.getPayments()
        ]);

        const nameLower = name.trim().toLowerCase();
        const matchedPurchases = purchases.filter(p =>
            p.supplier && p.supplier.trim().toLowerCase() === nameLower
        );

        // Map purchases to activities
        const purchaseActivities: WeaverActivity[] = matchedPurchases.map(p => ({
            id: p.purchaseId,
            type: 'purchase',
            date: p.date,
            description: `Received Stock: ${p.sareeName} (x${p.quantity})`,
            amount: p.purchasePrice * p.quantity,
            details: `Price: ₹${p.purchasePrice} | Qty: ${p.quantity}`
        }));

        // Filter payments for this weaver
        const matchedPayments = payments.filter(p => p.weaverId === weaverId);

        // Map payments to activities
        const paymentActivities: WeaverActivity[] = matchedPayments.map(p => ({
            id: p.id,
            type: 'payment',
            date: p.date,
            description: `Paid via ${p.paymentMethod}`,
            amount: p.amount,
            details: p.notes || `Ledger payout`
        }));

        // Merge and sort descending (newest first)
        return [...purchaseActivities, ...paymentActivities].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }
};
