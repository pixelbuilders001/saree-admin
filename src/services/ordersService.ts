import { supabase } from '@/lib/supabase';

export interface ShippingAddress {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    line1?: string;
    line2?: string;
    address?: string;
    address_line1?: string;
    address_line2?: string;
    landmark?: string;
    locality?: string;
    pincode?: string;
    pinCode?: string;
    name?: string;
    phone?: string;
    alternatePhone?: string;
    email?: string;
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
    itemStatus?: string;
    createdAt: string;
    hsnCode?: string;
    taxableValue?: number;
    gstRate?: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    gstAmount?: number;
    discountAmount?: number;
    productNameSnapshot?: string;
    imageUrl?: string;
    color?: string;
    size?: string;
    fabric?: string;
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
    // Gift order fields
    isGift?: boolean;
    giftRecipientName?: string;
    giftMessage?: string;
    giftWrapCharge?: number;
    // Tax, GST & Invoice fields
    invoiceNumber?: string;
    invoiceDate?: string;
    isGstApplied?: boolean;
    gstRate?: number;
    taxableAmount?: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    totalGst?: number;
    placeOfSupply?: string;
    customerGstin?: string;
    // Discounts & vouchers
    couponCode?: string;
    couponDiscount?: number;
    // Shipping & Tracking
    trackingNumber?: string;
    courierName?: string;
    trackingUrl?: string;
    paymentId?: string;
    createdAt: string;
    updatedAt: string;
    items?: OrderItem[];
    statusHistory?: OrderStatusHistory[];
}

export function mapOrderRow(data: any): Order {
    const shippingAddress: ShippingAddress = typeof data.shipping_address === 'string'
        ? (() => { try { return JSON.parse(data.shipping_address); } catch { return {}; } })()
        : data.shipping_address || {};

    const subtotal = Number(data.subtotal || 0);
    const shippingFee = Number(data.shipping_fee ?? data.shippingFee ?? data.shipping_charge ?? 0);
    const discount = Number(data.discount ?? data.discount_amount ?? 0);
    const totalAmount = Number(data.total_amount ?? data.totalAmount ?? 0);
    const giftWrapCharge = Number(data.gift_wrap_charge ?? data.giftWrapCharge ?? 0);

    const hasGst = data.gst_amount != null
        ? Number(data.gst_amount) > 0
        : (data.is_gst_applied ?? true);

    const rawState = (data.place_of_supply || shippingAddress.state || 'Bihar').trim();
    const isIntraState = rawState.toLowerCase().includes('bihar');
    const gstRate = Number(data.gst_rate || 5);

    const rawTaxable = data.taxable_amount != null
        ? Number(data.taxable_amount)
        : (hasGst ? Math.max(0, Math.round(((subtotal - discount) / (1 + gstRate / 100)) * 100) / 100) : (subtotal - discount));

    const rawTotalGst = data.gst_amount != null
        ? Number(data.gst_amount)
        : (hasGst ? Math.max(0, Math.round((subtotal - discount - rawTaxable) * 100) / 100) : 0);

    const cgstAmt = data.cgst_amount != null
        ? Number(data.cgst_amount)
        : (hasGst && isIntraState ? Math.round((rawTotalGst / 2) * 100) / 100 : 0);

    const sgstAmt = data.sgst_amount != null
        ? Number(data.sgst_amount)
        : (hasGst && isIntraState ? Math.round((rawTotalGst - cgstAmt) * 100) / 100 : 0);

    const igstAmt = data.igst_amount != null
        ? Number(data.igst_amount)
        : (hasGst && !isIntraState ? rawTotalGst : 0);

    const items: OrderItem[] = (data.order_items || []).map((item: any) => {
        let snap = item.product_snapshot;
        if (typeof snap === 'string') {
            try { snap = JSON.parse(snap); } catch {}
        }
        const snapImages = snap?.images || snap?.image_urls || [];
        const imageUrl = snap?.image || snap?.primary_image || (Array.isArray(snapImages) && snapImages.length > 0 ? (typeof snapImages[0] === 'string' ? snapImages[0] : snapImages[0]?.imageUrl || snapImages[0]?.url) : null);
        const unitPrice = Number(item.unit_price || snap?.selling_price || 0);
        const quantity = Number(item.quantity || 1);
        const totalPrice = Number(item.total_price || (unitPrice * quantity));
        const itemGstRate = Number(item.gst_rate || snap?.gst_rate || gstRate);
        const itemTaxable = item.taxable_value != null
            ? Number(item.taxable_value)
            : Math.round((totalPrice / (1 + itemGstRate / 100)) * 100) / 100;
        const itemGstAmt = item.gst_amount != null
            ? Number(item.gst_amount)
            : Math.round((totalPrice - itemTaxable) * 100) / 100;

        return {
            id: item.id,
            orderId: item.order_id,
            inventoryId: item.inventory_id,
            productName: item.product_name || item.product_name_snapshot || snap?.saree_name || 'Pure Silk Banarasi Saree',
            sku: item.sku || snap?.sku,
            barcode: item.barcode || snap?.barcode,
            quantity,
            unitPrice,
            totalPrice,
            productSnapshot: snap,
            itemStatus: item.item_status || 'active',
            hsnCode: item.hsn_code || snap?.hsn_code || snap?.hsnCode || '5208',
            taxableValue: itemTaxable,
            gstRate: itemGstRate,
            cgstAmount: item.cgst_amount != null ? Number(item.cgst_amount) : (isIntraState ? Math.round(itemGstAmt / 2 * 100) / 100 : 0),
            sgstAmount: item.sgst_amount != null ? Number(item.sgst_amount) : (isIntraState ? Math.round(itemGstAmt / 2 * 100) / 100 : 0),
            igstAmount: item.igst_amount != null ? Number(item.igst_amount) : (!isIntraState ? itemGstAmt : 0),
            gstAmount: itemGstAmt,
            discountAmount: item.discount_amount != null ? Number(item.discount_amount) : 0,
            productNameSnapshot: item.product_name_snapshot || snap?.saree_name,
            imageUrl,
            color: item.color || snap?.color || snap?.primary_color,
            size: item.size || snap?.size,
            fabric: item.fabric || snap?.fabric,
            createdAt: item.created_at,
        };
    });

    const statusHistory = (data.order_status_history || []).map((h: any) => ({
        id: h.id,
        orderId: h.order_id,
        status: h.status,
        note: h.note,
        createdAt: h.created_at,
    })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
        id: data.id,
        orderNumber: data.order_number,
        userId: data.user_id,
        customerName: data.customer_name || shippingAddress.name || 'Valued Customer',
        customerPhone: data.customer_phone || shippingAddress.phone || '',
        customerEmail: data.customer_email || shippingAddress.email || undefined,
        shippingAddress,
        subtotal,
        shippingFee,
        discount,
        totalAmount,
        paymentMethod: data.payment_method || 'cod',
        paymentStatus: data.payment_status || 'pending',
        orderStatus: data.order_status || 'placed',
        notes: data.notes || undefined,
        isGift: data.is_gift === true,
        giftRecipientName: data.gift_recipient_name || undefined,
        giftMessage: data.gift_message || undefined,
        giftWrapCharge,
        invoiceNumber: data.invoice_number || data.order_number,
        invoiceDate: data.invoice_date || data.created_at,
        isGstApplied: hasGst,
        gstRate,
        taxableAmount: rawTaxable,
        cgstAmount: cgstAmt,
        sgstAmount: sgstAmt,
        igstAmount: igstAmt,
        totalGst: rawTotalGst,
        placeOfSupply: rawState,
        customerGstin: data.customer_gstin || data.gstin || undefined,
        couponCode: data.coupon_code || data.applied_voucher_code || undefined,
        couponDiscount: data.coupon_discount ? Number(data.coupon_discount) : undefined,
        trackingNumber: data.tracking_number || data.awb_number || undefined,
        courierName: data.courier_name || undefined,
        trackingUrl: data.tracking_url || undefined,
        paymentId: data.payment_id || data.razorpay_payment_id || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        items,
        statusHistory,
    };
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

        return (data || []).map(mapOrderRow);
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

        return mapOrderRow(data);
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

    updateOrderStatus: async (orderId: string, status: string, note?: string, orderItemId?: string): Promise<any> => {
        const defaultNote = orderItemId
            ? 'Item cancelled by admin'
            : (status === 'cancelled' ? 'Order cancelled by admin' : `Order ${status}`);

        const payload: any = {
            order_id: orderId,
            status,
            note: note || defaultNote
        };
        if (orderItemId) {
            payload.order_item_id = orderItemId;
        }

        try {
            const { data, error } = await supabase.functions.invoke('update-order-status', {
                body: payload
            });

            if (error) {
                console.warn('Edge function update-order-status error, using fallback:', error);
                throw error;
            }

            return data;
        } catch (edgeErr) {
            console.warn('Fallback to direct database operations:', edgeErr);

            if (orderItemId) {
                // Cancel / update single item
                const { error: itemErr } = await supabase
                    .from('order_items')
                    .update({ item_status: status })
                    .eq('id', orderItemId);

                if (itemErr) throw itemErr;

                if (status === 'cancelled') {
                    // Fetch order and item details to recalculate totals
                    const { data: order } = await supabase
                        .from('orders')
                        .select('subtotal, total_amount, order_status')
                        .eq('id', orderId)
                        .single();

                    const { data: allItems } = await supabase
                        .from('order_items')
                        .select('id, inventory_id, sku, item_status, total_price, unit_price, quantity, product_snapshot')
                        .eq('order_id', orderId);

                    const cancelledItem = allItems?.find((it: any) => it.id === orderItemId);
                    const remainingActive = allItems?.filter((it: any) => it.id !== orderItemId && (it.item_status || '').toLowerCase() !== 'cancelled') || [];
                    const isEntireOrderCancelled = remainingActive.length === 0;

                    // Restore inventory for cancelled item
                    if (cancelledItem) {
                        try {
                            const invId = cancelledItem.inventory_id || (typeof cancelledItem.product_snapshot === 'object' ? cancelledItem.product_snapshot?.id : null);
                            let invRecord: any = null;
                            if (invId) {
                                const { data: inv } = await supabase.from('inventory').select('id, stock, status').eq('id', invId).maybeSingle();
                                invRecord = inv;
                            }
                            if (!invRecord && cancelledItem.sku) {
                                const { data: invBySku } = await supabase.from('inventory').select('id, stock, status').eq('sku', cancelledItem.sku).maybeSingle();
                                invRecord = invBySku;
                            }
                            if (invRecord) {
                                const newStock = Number(invRecord.stock || 0) + Number(cancelledItem.quantity || 1);
                                const updates: any = { stock: newStock };
                                if (invRecord.status === 'inactive' && newStock > 0) updates.status = 'active';
                                await supabase.from('inventory').update(updates).eq('id', invRecord.id);
                            }
                        } catch (invErr) {
                            console.error('Failed to restore inventory in fallback:', invErr);
                        }
                    }

                    if (order && cancelledItem) {
                        const itemPrice = Number(cancelledItem.total_price || (Number(cancelledItem.unit_price || 0) * Number(cancelledItem.quantity || 1)));
                        const newSubtotal = Math.max(0, Number(order.subtotal || 0) - itemPrice);
                        const newTotal = Math.max(0, Number(order.total_amount || 0) - itemPrice);

                        await supabase
                            .from('orders')
                            .update({
                                subtotal: newSubtotal,
                                total_amount: newTotal,
                                order_status: isEntireOrderCancelled ? 'cancelled' : order.order_status,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', orderId);
                    }
                }
            } else {
                // Entire order update
                const { error: orderError } = await supabase
                    .from('orders')
                    .update({
                        order_status: status,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', orderId);

                if (orderError) throw orderError;

                if (status === 'cancelled') {
                    const { data: allItems } = await supabase
                        .from('order_items')
                        .select('id, inventory_id, sku, item_status, quantity, product_snapshot')
                        .eq('order_id', orderId);

                    const activeItems = (allItems || []).filter((it: any) => (it.item_status || '').toLowerCase() !== 'cancelled');
                    for (const it of activeItems) {
                        try {
                            const invId = it.inventory_id || (typeof it.product_snapshot === 'object' ? it.product_snapshot?.id : null);
                            let invRecord: any = null;
                            if (invId) {
                                const { data: inv } = await supabase.from('inventory').select('id, stock, status').eq('id', invId).maybeSingle();
                                invRecord = inv;
                            }
                            if (!invRecord && it.sku) {
                                const { data: invBySku } = await supabase.from('inventory').select('id, stock, status').eq('sku', it.sku).maybeSingle();
                                invRecord = invBySku;
                            }
                            if (invRecord) {
                                const newStock = Number(invRecord.stock || 0) + Number(it.quantity || 1);
                                const updates: any = { stock: newStock };
                                if (invRecord.status === 'inactive' && newStock > 0) updates.status = 'active';
                                await supabase.from('inventory').update(updates).eq('id', invRecord.id);
                            }
                        } catch (invErr) {
                            console.error('Failed to restore inventory in fallback:', invErr);
                        }
                    }

                    await supabase
                        .from('order_items')
                        .update({ item_status: 'cancelled' })
                        .eq('order_id', orderId);
                }
            }

            // Insert into history log
            await supabase
                .from('order_status_history')
                .insert([{
                    order_id: orderId,
                    status,
                    note: payload.note
                }]);

            // Trigger push notification if available
            try {
                const { data: orderRow } = await supabase
                    .from('orders')
                    .select('*, order_items(*)')
                    .eq('id', orderId)
                    .single();

                if (orderRow && orderRow.user_id) {
                    const statusLower = (status || '').toLowerCase();
                    let stageKey: any = 'placed';
                    if (statusLower.includes('confirm')) stageKey = 'confirmed';
                    else if (statusLower.includes('pack')) stageKey = 'packed';
                    else if (statusLower.includes('ship') || statusLower.includes('dispatch')) stageKey = 'shipped';
                    else if (statusLower.includes('out_for_delivery') || statusLower.includes('out for delivery')) stageKey = 'out_for_delivery';
                    else if (statusLower.includes('deliver')) stageKey = 'delivered';
                    else if (statusLower.includes('cancel')) stageKey = 'cancelled';

                    const firstItemSnapshot = orderRow.order_items?.[0]?.product_snapshot;
                    const firstItemImage = firstItemSnapshot?.images?.[0] || null;
                    const targetUrl = `/account?orderId=${encodeURIComponent(orderRow.order_number)}`;

                    await supabase.functions.invoke('send-push', {
                        body: {
                            audience: 'user',
                            target_user_id: orderRow.user_id,
                            order_status: stageKey,
                            order_number: orderRow.order_number,
                            customer_name: orderRow.customer_name || orderRow.shipping_address?.name,
                            total_amount: Number(orderRow.total_amount),
                            image_url: firstItemImage,
                            notification_type: 'order',
                            url: targetUrl,
                        },
                    });
                }
            } catch (err) {
                console.error('Failed to send push notification from admin update:', err);
            }
        }
    },

    cancelOrderItem: async (orderId: string, orderItemId: string, note = 'Item cancelled by admin'): Promise<any> => {
        return ordersService.updateOrderStatus(orderId, 'cancelled', note, orderItemId);
    },

    processPendingReviewReminders: async (delayHours = 24): Promise<number> => {
        try {
            const cutoffDate = new Date(Date.now() - delayHours * 60 * 60 * 1000).toISOString();

            const { data: deliveredHistory, error: hErr } = await supabase
                .from('order_status_history')
                .select('order_id, created_at')
                .eq('status', 'delivered')
                .lte('created_at', cutoffDate);

            if (hErr || !deliveredHistory || deliveredHistory.length === 0) return 0;

            const orderIds = deliveredHistory.map((h: any) => h.order_id);

            const { data: orders, error: oErr } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .in('id', orderIds)
                .eq('order_status', 'delivered');

            if (oErr || !orders || orders.length === 0) return 0;

            let count = 0;
            for (const order of orders) {
                if (!order.user_id) continue;

                // Check if review reminder was already sent
                const { data: sentReminders } = await supabase
                    .from('push_notifications')
                    .select('id')
                    .eq('target_user_id', order.user_id)
                    .eq('notification_type', 'review_reminder')
                    .ilike('body', `%${order.order_number}%`);

                if (sentReminders && sentReminders.length > 0) continue;

                // Check if customer already reviewed all items in this order
                const { data: existingReviews } = await supabase
                    .from('product_reviews')
                    .select('id')
                    .eq('order_id', order.id);

                if (existingReviews && existingReviews.length >= (order.order_items?.length || 1)) continue;

                const firstItemImage = order.order_items?.[0]?.product_snapshot?.images?.[0] || null;

                await supabase.functions.invoke('send-push', {
                    body: {
                        audience: 'user',
                        target_user_id: order.user_id,
                        title: 'How is your new Banarasi Saree? ✨',
                        body: `We hope you love your saree! Tap to rate your purchase for Order #${order.order_number} and share your feedback.`,
                        order_number: order.order_number,
                        customer_name: order.customer_name,
                        image_url: firstItemImage,
                        notification_type: 'review_reminder',
                        url: `/review?orderId=${encodeURIComponent(order.order_number)}`
                    }
                });
                count++;
            }

            return count;
        } catch (err) {
            console.error('Error processing pending review reminders:', err);
            return 0;
        }
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
    },

    getActiveCartItems: async (): Promise<CartItem[]> => {
        const { data: cartData, error: cartError } = await supabase
            .from('cart_items')
            .select(`
                id,
                user_id,
                product_id,
                quantity,
                created_at,
                updated_at,
                inventory (
                    id,
                    saree_name,
                    selling_price,
                    fabric,
                    color,
                    sku,
                    barcode,
                    stock
                )
            `)
            .order('updated_at', { ascending: false });

        if (cartError) throw cartError;

        // Fetch profiles in-memory to prevent relationship-cache join issues
        const userIds = [...new Set((cartData || []).map((item: any) => item.user_id).filter(Boolean))];
        let profiles: any[] = [];
        if (userIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, email, phone_number')
                .in('id', userIds);
            
            if (!profilesError && profilesData) {
                profiles = profilesData;
            }
        }

        return (cartData || []).map((item: any) => {
            const profile = profiles.find((p: any) => p.id === item.user_id);
            const profilePhone = profile?.phone_number?.toString() || '';
            const userPhoneVal = profilePhone || profile?.email || item.user_id || '';
            const customerNameVal = profile?.full_name || '';

            return {
                id: item.id,
                userPhone: userPhoneVal,
                userId: item.user_id,
                customerName: customerNameVal,
                productId: item.product_id,
                quantity: Number(item.quantity),
                createdAt: item.created_at,
                updatedAt: item.updated_at,
                product: item.inventory ? {
                    sareeName: item.inventory.saree_name,
                    sellingPrice: Number(item.inventory.selling_price),
                    fabric: item.inventory.fabric,
                    color: item.inventory.color,
                    sku: item.inventory.sku || '',
                    barcode: item.inventory.barcode || '',
                    stock: Number(item.inventory.stock),
                } : undefined
            };
        });
    },

    deleteCartItem: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    clearCartForUser: async (phoneOrUserId: string): Promise<void> => {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(phoneOrUserId);
        if (isUuid) {
            const { error } = await supabase
                .from('cart_items')
                .delete()
                .eq('user_id', phoneOrUserId);
            if (error) throw error;
        } else {
            // Find user_id from profile phone_number or email
            const phoneInt = parseInt(phoneOrUserId.replace(/\D/g, ''), 10);
            const query = supabase
                .from('profiles')
                .select('id');
            
            let profilesQuery;
            if (!isNaN(phoneInt)) {
                profilesQuery = query.or(`phone_number.eq.${phoneInt},email.eq.${phoneOrUserId}`);
            } else {
                profilesQuery = query.eq('email', phoneOrUserId);
            }
            
            const { data: profile } = await profilesQuery.maybeSingle();
                
            if (profile?.id) {
                const { error } = await supabase
                    .from('cart_items')
                    .delete()
                    .eq('user_id', profile.id);
                if (error) throw error;
            }
        }
    }
};

export interface CartItem {
    id: string;
    userPhone: string;
    userId?: string;
    customerName?: string;
    productId: string;
    quantity: number;
    createdAt: string;
    updatedAt: string;
    product?: {
        sareeName: string;
        sellingPrice: number;
        fabric: string;
        color: string;
        sku?: string;
        barcode?: string;
        stock: number;
    };
}

