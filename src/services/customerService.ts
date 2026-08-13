import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export interface Customer {
    customerId: string;
    name: string;
    mobile: string;
    address: string;
    city: string;
    totalPurchases: number;
    totalSpent: number;
    type: 'instore' | 'online';
    email?: string;
}

export const customerService = {
    getCustomers: async (): Promise<Customer[]> => {
        // 1. Fetch instore customers
        const { data: instoreData, error: instoreError } = await supabase
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

        if (instoreError) throw instoreError;

        // 2. Fetch online profiles
        const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone_number');

        // We handle empty or missing profiles table gracefully
        let onlineCustomers: Customer[] = [];
        if (!profilesError && profilesData) {
            // 3. Fetch online orders to calculate aggregates
            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select('user_id, total_amount');

            const ordersList = ordersData || [];

            onlineCustomers = (profilesData || []).map((p: any) => {
                const userOrders = ordersList.filter((o: any) => o.user_id === p.id);
                const totalSpent = userOrders.reduce(
                    (sum: number, order: any) => sum + Number(order.total_amount || 0),
                    0
                );

                return {
                    customerId: p.id,
                    name: p.full_name || p.email?.split('@')[0] || 'Online User',
                    mobile: p.phone_number ? p.phone_number.toString() : '',
                    address: '',
                    city: '',
                    totalPurchases: userOrders.length,
                    totalSpent: totalSpent,
                    type: 'online',
                    email: p.email || undefined
                };
            });
        }

        const instoreCustomers: Customer[] = (instoreData || []).map((c: any) => {
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
                type: 'instore'
            };
        });

        // Combine both sets
        return [...instoreCustomers, ...onlineCustomers];
    },

    createCustomer: async (customer: Omit<Customer, 'customerId' | 'totalPurchases' | 'totalSpent' | 'type'>): Promise<Customer> => {
        const userEmail = useAuthStore.getState().user?.email || 'system';
        const { data, error } = await supabase
            .from('customers')
            .insert([{
                name: customer.name,
                mobile: customer.mobile,
                address: customer.address,
                city: customer.city,
                created_by: userEmail,
                updated_by: userEmail,
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
            type: 'instore'
        };
    },

    getCustomerById: async (id: string, type: 'instore' | 'online' = 'instore'): Promise<Customer> => {
        if (type === 'online') {
            const { data: p, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!p) throw new Error('Customer profile not found');

            const { data: ordersData } = await supabase
                .from('orders')
                .select('total_amount')
                .eq('user_id', id);

            const userOrders = ordersData || [];
            const totalSpent = userOrders.reduce(
                (sum: number, order: any) => sum + Number(order.total_amount || 0),
                0
            );

            return {
                customerId: p.id,
                name: p.full_name || p.email?.split('@')[0] || 'Online User',
                mobile: p.phone_number ? p.phone_number.toString() : '',
                address: '',
                city: '',
                totalPurchases: userOrders.length,
                totalSpent: totalSpent,
                type: 'online',
                email: p.email || undefined
            };
        } else {
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
                type: 'instore',
            };
        }
    },

    updateCustomer: async (id: string, customer: Partial<Omit<Customer, 'customerId' | 'totalPurchases' | 'totalSpent' | 'type'>>): Promise<void> => {
        const userEmail = useAuthStore.getState().user?.email || 'system';
        const { error } = await supabase
            .from('customers')
            .update({
                name: customer.name,
                mobile: customer.mobile,
                address: customer.address,
                city: customer.city,
                updated_by: userEmail,
            })
            .eq('id', id);

        if (error) throw error;
    },

    deleteCustomer: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    getCustomerInvoices: async (customerId: string, type: 'instore' | 'online' = 'instore'): Promise<any[]> => {
        if (type === 'online') {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    id,
                    order_number,
                    total_amount,
                    created_at,
                    order_items (
                        inventory_id,
                        quantity,
                        unit_price,
                        inventory (
                            saree_name
                        )
                    )
                `)
                .eq('user_id', customerId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return (data || []).map((o: any) => ({
                id: o.id,
                invoice_number: o.order_number,
                total_amount: Number(o.total_amount),
                created_at: o.created_at,
                sale_items: (o.order_items || []).map((oi: any) => ({
                    saree_id: oi.inventory_id,
                    quantity: Number(oi.quantity),
                    selling_price: Number(oi.unit_price),
                    inventory: oi.inventory
                }))
            }));
        } else {
            const { data, error } = await supabase
                .from('sales')
                .select(`
                    id,
                    invoice_number,
                    total_amount,
                    profit,
                    created_at,
                    sale_items (
                        saree_id,
                        quantity,
                        selling_price,
                        inventory (
                            saree_name
                        )
                    )
                `)
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        }
    }
};


