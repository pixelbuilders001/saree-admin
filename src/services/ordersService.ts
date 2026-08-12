import { supabase } from '@/lib/supabase';

export interface ShippingAddress {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    line1?: string;
    line2?: string;
    [key: string]: any;
}

export interface OrderItem {
    id: string;
    orderId: string;
    inventoryId: string;
    productName: string;
    sku?: string;
    barcode?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    productSnapshot?: any;
    createdAt: string;
}

export interface OrderStatusHistory {
    id: string;
    orderId: string;
    status: string;
    note?: string;
    createdAt: string;
}

export interface Order {
    id: string;
    orderNumber: string;
    userId?: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    shippingAddress: ShippingAddress;
    subtotal: number;
    shippingFee: number;
    discount: number;
    totalAmount: number;
    paymentMethod: string;
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
    orderStatus: 'placed' | 'confirmed' | 'processing' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'returned';
    notes?: string;
    createdAt: string;
    updatedAt: string;
    items?: OrderItem[];
    statusHistory?: OrderStatusHistory[];
}

export const ordersService = {
    getOrders: async (): Promise<Order[]> => {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (*),
                order_status_history (*)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((order: any) => ({
            id: order.id,
            orderNumber: order.order_number,
            userId: order.user_id,
            customerName: order.customer_name,
            customerPhone: order.customer_phone,
            customerEmail: order.customer_email,
            shippingAddress: typeof order.shipping_address === 'string' 
                ? JSON.parse(order.shipping_address) 
                : order.shipping_address || {},
            subtotal: Number(order.subtotal),
            shippingFee: Number(order.shipping_fee),
            discount: Number(order.discount),
            totalAmount: Number(order.total_amount),
            paymentMethod: order.payment_method,
            paymentStatus: order.payment_status,
            orderStatus: order.order_status,
            notes: order.notes,
            createdAt: order.created_at,
            updatedAt: order.updated_at,
            items: (order.order_items || []).map((item: any) => ({
                id: item.id,
                orderId: item.order_id,
                inventoryId: item.inventory_id,
                productName: item.product_name,
                sku: item.sku,
                barcode: item.barcode,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unit_price),
                totalPrice: Number(item.total_price),
                productSnapshot: item.product_snapshot,
                createdAt: item.created_at,
            })),
            statusHistory: (order.order_status_history || []).map((h: any) => ({
                id: h.id,
                orderId: h.order_id,
                status: h.status,
                note: h.note,
                createdAt: h.created_at,
            })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        }));
    },

    getOrderById: async (id: string): Promise<Order> => {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (*),
                order_status_history (*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) throw new Error('Order not found');

        return {
            id: data.id,
            orderNumber: data.order_number,
            userId: data.user_id,
            customerName: data.customer_name,
            customerPhone: data.customer_phone,
            customerEmail: data.customer_email,
            shippingAddress: typeof data.shipping_address === 'string' 
                ? JSON.parse(data.shipping_address) 
                : data.shipping_address || {},
            subtotal: Number(data.subtotal),
            shippingFee: Number(data.shipping_fee),
            discount: Number(data.discount),
            totalAmount: Number(data.total_amount),
            paymentMethod: data.payment_method,
            paymentStatus: data.payment_status,
            orderStatus: data.order_status,
            notes: data.notes,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            items: (data.order_items || []).map((item: any) => ({
                id: item.id,
                orderId: item.order_id,
                inventoryId: item.inventory_id,
                productName: item.product_name,
                sku: item.sku,
                barcode: item.barcode,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unit_price),
                totalPrice: Number(item.total_price),
                productSnapshot: item.product_snapshot,
                createdAt: item.created_at,
            })),
            statusHistory: (data.order_status_history || []).map((h: any) => ({
                id: h.id,
                orderId: h.order_id,
                status: h.status,
                note: h.note,
                createdAt: h.created_at,
            })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        };
    },

    createOrder: async (orderData: {
        customerName: string;
        customerPhone: string;
        customerEmail?: string;
        shippingAddress: ShippingAddress;
        subtotal: number;
        shippingFee: number;
        discount: number;
        totalAmount: number;
        paymentMethod: string;
        paymentStatus: string;
        orderStatus: string;
        notes?: string;
        items: Array<{
            inventoryId: string;
            productName: string;
            sku?: string;
            barcode?: string;
            quantity: number;
            unitPrice: number;
            totalPrice: number;
            productSnapshot?: any;
        }>
    }): Promise<Order> => {
        // 1. Generate Order Number
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randPart = Math.floor(1000 + Math.random() * 9000);
        const orderNumber = `ORD-${datePart}-${randPart}`;

        // 2. Insert order
        const { data: insertedOrder, error: orderError } = await supabase
            .from('orders')
            .insert([{
                order_number: orderNumber,
                customer_name: orderData.customerName,
                customer_phone: orderData.customerPhone,
                customer_email: orderData.customerEmail || null,
                shipping_address: orderData.shippingAddress,
                subtotal: orderData.subtotal,
                shipping_fee: orderData.shippingFee,
                discount: orderData.discount,
                total_amount: orderData.totalAmount,
                payment_method: orderData.paymentMethod || 'cod',
                payment_status: orderData.paymentStatus || 'pending',
                order_status: orderData.orderStatus || 'placed',
                notes: orderData.notes || null,
            }])
            .select()
            .single();

        if (orderError) throw orderError;

        // 3. Insert order items
        const orderItemsToInsert = orderData.items.map(item => ({
            order_id: insertedOrder.id,
            inventory_id: item.inventoryId,
            product_name: item.productName,
            sku: item.sku || null,
            barcode: item.barcode || null,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.totalPrice,
            product_snapshot: item.productSnapshot || null,
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItemsToInsert);

        if (itemsError) {
            // Rollback order
            await supabase.from('orders').delete().eq('id', insertedOrder.id);
            throw itemsError;
        }

        // 4. Create initial status history entry
        await supabase.from('order_status_history').insert([{
            order_id: insertedOrder.id,
            status: orderData.orderStatus || 'placed',
            note: 'Order placed successfully'
        }]);

        return ordersService.getOrderById(insertedOrder.id);
    },

    updateOrderStatus: async (orderId: string, status: string, note?: string): Promise<void> => {
        // Update order status and set updated_at
        const { error: orderError } = await supabase
            .from('orders')
            .update({
                order_status: status,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

        if (orderError) throw orderError;

        // Insert into history log
        const { error: historyError } = await supabase
            .from('order_status_history')
            .insert([{
                order_id: orderId,
                status,
                note: note || `Status updated to ${status}`
            }]);

        if (historyError) throw historyError;
    },

    updatePaymentStatus: async (orderId: string, paymentStatus: string): Promise<void> => {
        const { error } = await supabase
            .from('orders')
            .update({
                payment_status: paymentStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

        if (error) throw error;
    }
};
