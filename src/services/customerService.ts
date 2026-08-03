import { supabase } from '@/lib/supabase';

export interface Customer {
    customerId: string;
    name: string;
    mobile: string;
    address: string;
    city: string;
    totalPurchases: number;
    totalSpent: number;
}

export const customerService = {
    getCustomers: async (): Promise<Customer[]> => {
        // Query customers combined with sales details for counts and aggregates
        const { data, error } = await supabase
            .from('customers')
            .select(`
                id,
                name,
                mobile,
                address,
                city,
                sales (
                    total_amount
                )
            `)
            .order('name');

        if (error) throw error;

        return (data || []).map((c: any) => {
            const salesArray = c.sales || [];
            const totalSpent = salesArray.reduce(
                (sum: number, sale: any) => sum + Number(sale.total_amount || 0),
                0
            );

            return {
                customerId: c.id,
                name: c.name,
                mobile: c.mobile,
                address: c.address || '',
                city: c.city || '',
                totalPurchases: salesArray.length,
                totalSpent: totalSpent,
            };
        });
    },

    createCustomer: async (customer: Omit<Customer, 'customerId' | 'totalPurchases' | 'totalSpent'>): Promise<Customer> => {
        const { data, error } = await supabase
            .from('customers')
            .insert([{
                name: customer.name,
                mobile: customer.mobile,
                address: customer.address,
                city: customer.city,
            }])
            .select()
            .single();

        if (error) throw error;

        return {
            customerId: data.id,
            name: data.name,
            mobile: data.mobile,
            address: data.address || '',
            city: data.city || '',
            totalPurchases: 0,
            totalSpent: 0,
        };
    },

    getCustomerById: async (id: string): Promise<Customer> => {
        const { data, error } = await supabase
            .from('customers')
            .select(`
                id,
                name,
                mobile,
                address,
                city,
                sales (
                    total_amount
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) throw new Error('Customer not found');

        const salesArray = data.sales || [];
        const totalSpent = salesArray.reduce(
            (sum: number, sale: any) => sum + Number(sale.total_amount || 0),
            0
        );

        return {
            customerId: data.id,
            name: data.name,
            mobile: data.mobile,
            address: data.address || '',
            city: data.city || '',
            totalPurchases: salesArray.length,
            totalSpent: totalSpent,
        };
    },
};
