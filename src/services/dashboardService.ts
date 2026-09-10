import { supabase } from '@/lib/supabase';
import { getFriendlyId } from '@/services/salesService';

export interface DashboardStats {
    totalRevenue: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    weaverOutstanding: number;
    storeCreditOutstanding: number;

    totalUniqueSarees: number;
    totalStockQty: number;
    inventoryValuationCost: number;
    inventoryValuationRetail: number;
    lowStockCount: number;
    outOfStockCount: number;
    criticalLowStockItems: {
        id: string;
        sareeName: string;
        sku: string;
        category: string;
        stock: number;
        purchasePrice: number;
        sellingPrice: number;
    }[];

    totalSales: number;
    totalCustomers: number;
    totalWeavers: number;

    monthlySales: { 
        month: string; 
        sales: number; 
        posSales: number; 
        onlineSales: number; 
        totalOrders: number;
    }[];
    categoryDistribution: { category: string; count: number; stock: number }[];
    fabricDistribution: { fabric: string; count: number; stock: number }[];
    
    recentActivities: { id: string; type: string; description: string; date: string; amount: number }[];
    recentExpenses: { id: string; category: string; description: string; amount: number; date: string }[];
    recentWeaverPayments: { id: string; weaverName: string; amount: number; method: string; date: string }[];

    // Online order specific stats
    totalOnlineOrders: number;
    onlineOrdersPending: number;
    onlineOrdersRevenue: number;
    onlineDeliveredRevenue: number;
    onlineOrdersPendingAction: number; // placed, confirmed, processing, packed
    onlineOrdersInTransit: number; // shipped, out_for_delivery
    onlineOrdersDelivered: number; // delivered
    onlineOrdersCancelled: number; // cancelled, returned
    onlineStatusCounts: {
        placed: number;
        confirmed: number;
        processing: number;
        packed: number;
        shipped: number;
        out_for_delivery: number;
        delivered: number;
        cancelled: number;
        returned: number;
        [key: string]: number;
    };
    onlinePaymentCounts: {
        paid: number;
        pending: number;
        failed: number;
        refunded: number;
        cod: number;
        online: number;
    };
    recentOnlineOrders: {
        id: string;
        orderNumber: string;
        customerName: string;
        customerPhone: string;
        city: string;
        state: string;
        itemsCount: number;
        itemsSummary: string;
        totalAmount: number;
        orderStatus: string;
        paymentStatus: string;
        paymentMethod: string;
        date: string;
    }[];

    // Today & Channel Performance
    todayRevenue: number;
    todayOrdersCount: number;
    posRevenue: number;
    posSalesCount: number;

    // Storefront & Community metrics
    pwaInstallsCount: number;
    totalReviewsCount: number;
    pendingReviewsCount: number;
    averageReviewRating: number;
    registeredProfilesCount: number;
}

export const dashboardService = {
    getStats: async (): Promise<DashboardStats> => {
        // 1. Fetch total customers count
        const { count: totalCustomers, error: customerError } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true });
        if (customerError) throw customerError;

        // 2. Fetch all sarees (inventory info)
        const { data: sarees, error: sareesError } = await supabase
            .from('inventory')
            .select('id, saree_name, sku, category, fabric, stock, purchase_price, selling_price');
        if (sareesError) throw sareesError;

        // 3. Fetch all expenses
        const { data: expenses, error: expensesError } = await supabase
            .from('expenses')
            .select('amount, created_at');
        if (expensesError) throw expensesError;

        // 4. Fetch all POS sales
        const { data: sales, error: salesError } = await supabase
            .from('sales')
            .select(`
                id,
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
            .order('created_at', { ascending: false });
        if (salesError) throw salesError;

        // 4.5 Fetch all online orders with shipping address & payment info
        const { data: onlineOrders, error: ordersError } = await supabase
            .from('orders')
            .select(`
                id,
                order_number,
                customer_name,
                customer_phone,
                shipping_address,
                subtotal,
                shipping_fee,
                discount,
                total_amount,
                payment_method,
                payment_status,
                order_status,
                created_at,
                order_items (
                    product_name,
                    quantity,
                    unit_price,
                    inventory (
                        purchase_price
                    )
                )
            `)
            .order('created_at', { ascending: false });
        if (ordersError) throw ordersError;

        // 5. Fetch Weavers, weaver payments and purchases in parallel
        const { data: weaversData, error: weaversError } = await supabase
            .from('weavers')
            .select('id, name');
        if (weaversError) throw weaversError;

        const { data: paymentsData, error: paymentsError } = await supabase
            .from('weaver_payments')
            .select('id, weaver_id, amount, payment_method, created_at')
            .order('created_at', { ascending: false });
        if (paymentsError) throw paymentsError;

        const { data: purchasesData, error: purchasesError } = await supabase
            .from('purchases')
            .select('purchase_price, quantity, supplier');
        if (purchasesError) throw purchasesError;

        // 6. Fetch active store credits
        const { data: storeCredits, error: creditsError } = await supabase
            .from('store_credits')
            .select('remaining_amount')
            .eq('status', 'active');
        if (creditsError) throw creditsError;

        // 7. Fetch recent 5 expenses
        const { data: recentExpensesData, error: recentExpensesError } = await supabase
            .from('expenses')
            .select('id, category, amount, description, created_at')
            .order('created_at', { ascending: false })
            .limit(5);
        if (recentExpensesError) throw recentExpensesError;

        // 8. Storefront community stats (PWA installs, reviews, user profiles)
        let pwaInstallsCount = 0;
        let totalReviewsCount = 0;
        let pendingReviewsCount = 0;
        let averageReviewRating = 5;
        let registeredProfilesCount = 0;

        try {
            const { count: pwaCount } = await supabase
                .from('pwa_installs')
                .select('*', { count: 'exact', head: true });
            pwaInstallsCount = pwaCount || 0;
        } catch {
            // fallback
        }

        try {
            const { count: profCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });
            registeredProfilesCount = profCount || 0;
        } catch {
            // fallback
        }

        try {
            const { data: revData } = await supabase
                .from('product_reviews')
                .select('rating, status');
            if (revData && revData.length > 0) {
                totalReviewsCount = revData.length;
                pendingReviewsCount = revData.filter(r => r.status === 'pending').length;
                const totalRating = revData.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
                averageReviewRating = Number((totalRating / revData.length).toFixed(1));
            }
        } catch {
            // fallback
        }

        // Online Orders detailed metrics
        const onlineStatusCounts = {
            placed: 0,
            confirmed: 0,
            processing: 0,
            packed: 0,
            shipped: 0,
            out_for_delivery: 0,
            delivered: 0,
            cancelled: 0,
            returned: 0
        };

        const onlinePaymentCounts = {
            paid: 0,
            pending: 0,
            failed: 0,
            refunded: 0,
            cod: 0,
            online: 0
        };

        let onlineOrdersRevenue = 0;
        let onlineDeliveredRevenue = 0;
        let onlineOrdersProfit = 0;

        const todayStr = new Date().toDateString();
        let todayRevenue = 0;
        let todayOrdersCount = 0;

        (onlineOrders || []).forEach((order: any) => {
            const status = (order.order_status || 'placed').toLowerCase();
            if (onlineStatusCounts.hasOwnProperty(status)) {
                (onlineStatusCounts as any)[status] += 1;
            } else {
                (onlineStatusCounts as any)[status] = ((onlineStatusCounts as any)[status] || 0) + 1;
            }

            const pStatus = (order.payment_status || 'pending').toLowerCase();
            if (pStatus === 'paid') onlinePaymentCounts.paid += 1;
            else if (pStatus === 'failed') onlinePaymentCounts.failed += 1;
            else if (pStatus === 'refunded') onlinePaymentCounts.refunded += 1;
            else onlinePaymentCounts.pending += 1;

            const pMethod = (order.payment_method || '').toLowerCase();
            if (pMethod.includes('cod') || pMethod.includes('cash')) {
                onlinePaymentCounts.cod += 1;
            } else {
                onlinePaymentCounts.online += 1;
            }

            const amt = Number(order.total_amount || 0);
            onlineOrdersRevenue += amt;

            // Check if order was placed today
            if (order.created_at && new Date(order.created_at).toDateString() === todayStr) {
                todayRevenue += amt;
                todayOrdersCount += 1;
            }

            // Count delivered orders as realized revenue & profit
            if (status === 'delivered') {
                onlineDeliveredRevenue += amt;

                const subtotalCost = (order.order_items || []).reduce((costSum: number, item: any) => {
                    return costSum + (Number(item.inventory?.purchase_price || 0) * Number(item.quantity || 0));
                }, 0);
                const subtotalRevenue = Number(order.subtotal || 0);
                const orderProfit = (subtotalRevenue - subtotalCost) + Number(order.shipping_fee || 0) - Number(order.discount || 0);
                onlineOrdersProfit += orderProfit;
            }
        });

        // Online orders categorized counts
        const onlineOrdersPendingAction = 
            onlineStatusCounts.placed + 
            onlineStatusCounts.confirmed + 
            onlineStatusCounts.processing + 
            onlineStatusCounts.packed;
        
        const onlineOrdersInTransit = 
            onlineStatusCounts.shipped + 
            onlineStatusCounts.out_for_delivery;

        const onlineOrdersDelivered = onlineStatusCounts.delivered;
        const onlineOrdersCancelled = onlineStatusCounts.cancelled + onlineStatusCounts.returned;

        // Recent online orders list for high-density display
        const recentOnlineOrders = (onlineOrders || []).slice(0, 8).map((order: any) => {
            let city = '';
            let state = '';
            if (order.shipping_address) {
                let addr = order.shipping_address;
                if (typeof addr === 'string') {
                    try { addr = JSON.parse(addr); } catch {}
                }
                city = addr?.city || addr?.locality || '';
                state = addr?.state || '';
            }
            const itemsCount = (order.order_items || []).reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0);
            const firstItem = order.order_items?.[0]?.product_name || 'Saree';
            const itemsSummary = itemsCount > 1 ? `${firstItem} (+${itemsCount - 1} more)` : firstItem;

            return {
                id: order.id,
                orderNumber: order.order_number || order.id.slice(0, 8).toUpperCase(),
                customerName: order.customer_name || 'Customer',
                customerPhone: order.customer_phone || '',
                city,
                state,
                itemsCount,
                itemsSummary,
                totalAmount: Number(order.total_amount || 0),
                orderStatus: order.order_status || 'placed',
                paymentStatus: order.payment_status || 'pending',
                paymentMethod: order.payment_method || 'UPI',
                date: order.created_at
            };
        });

        // POS sales analysis
        const posRevenue = (sales || []).reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
        const posProfit = (sales || []).reduce((sum, s) => sum + Number(s.profit || 0), 0);
        const posSalesCount = (sales || []).length;

        // Add POS sales from today to todayRevenue
        (sales || []).forEach(sale => {
            if (sale.created_at && new Date(sale.created_at).toDateString() === todayStr) {
                todayRevenue += Number(sale.total_amount || 0);
                todayOrdersCount += 1;
            }
        });

        // Combined realized revenue: POS + Delivered Online
        const totalRevenue = posRevenue + onlineDeliveredRevenue;
        const grossProfit = posProfit + onlineOrdersProfit;
        const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);

        // Calculate Weaver Outstanding
        const weavers = weaversData || [];
        const payments = paymentsData || [];
        const purchases = purchasesData || [];

        let weaverOutstanding = 0;
        weavers.forEach((weaver: any) => {
            const nameLower = (weaver.name || '').trim().toLowerCase();
            const weaverPurchases = purchases.filter((p: any) => 
                p.supplier && p.supplier.trim().toLowerCase() === nameLower
            );
            const totalGoods = weaverPurchases.reduce(
                (sum: number, p: any) => sum + (Number(p.purchase_price || 0) * Number(p.quantity || 0)),
                0
            );
            const weaverPayments = payments.filter((p: any) => p.weaver_id === weaver.id);
            const totalPaid = weaverPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
            
            weaverOutstanding += Math.max(0, totalGoods - totalPaid);
        });

        // Store credit outstanding
        const storeCreditOutstanding = (storeCredits || []).reduce((sum, c) => sum + Number(c.remaining_amount || 0), 0);

        // Inventory values and critical stock items
        const totalUniqueSarees = (sarees || []).length;
        const totalStockQty = (sarees || []).reduce((sum, s) => sum + Number(s.stock || 0), 0);
        const inventoryValuationCost = (sarees || []).reduce((sum, s) => sum + (Number(s.purchase_price || 0) * Number(s.stock || 0)), 0);
        const inventoryValuationRetail = (sarees || []).reduce((sum, s) => sum + (Number(s.selling_price || 0) * Number(s.stock || 0)), 0);
        const lowStockCount = (sarees || []).filter(s => Number(s.stock || 0) < 5).length;
        const outOfStockCount = (sarees || []).filter(s => Number(s.stock || 0) <= 0).length;

        // Top critical low stock sarees (stock <= 3) for urgent restock alerts
        const criticalLowStockItems = (sarees || [])
            .filter(s => Number(s.stock || 0) <= 3)
            .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0))
            .slice(0, 6)
            .map(s => ({
                id: s.id,
                sareeName: s.saree_name || 'Saree',
                sku: s.sku || 'N/A',
                category: s.category || 'General',
                stock: Number(s.stock || 0),
                purchasePrice: Number(s.purchase_price || 0),
                sellingPrice: Number(s.selling_price || 0)
            }));

        // Category distribution
        const catMap: Record<string, { count: number; stock: number }> = {};
        (sarees || []).forEach(s => {
            const cat = (s.category || 'Uncategorized').trim();
            if (!catMap[cat]) {
                catMap[cat] = { count: 0, stock: 0 };
            }
            catMap[cat].count += 1;
            catMap[cat].stock += Number(s.stock || 0);
        });
        const categoryDistribution = Object.keys(catMap).map(category => ({
            category,
            count: catMap[category].count,
            stock: catMap[category].stock
        }));

        // Fabric distribution
        const fabMap: Record<string, { count: number; stock: number }> = {};
        (sarees || []).forEach(s => {
            const fab = s.fabric || 'Unspecified';
            if (!fabMap[fab]) {
                fabMap[fab] = { count: 0, stock: 0 };
            }
            fabMap[fab].count += 1;
            fabMap[fab].stock += Number(s.stock || 0);
        });
        const fabricDistribution = Object.keys(fabMap).map(fabric => ({
            fabric,
            count: fabMap[fabric].count,
            stock: fabMap[fabric].stock
        }));

        // Monthly sales data (last 6 months) with POS and Online split
        interface MonthBucket {
            posSales: number;
            onlineSales: number;
            totalOrders: number;
        }
        const monthlyBuckets: Record<string, MonthBucket> = {};
        const now = new Date();
        const monthNames: string[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = d.toLocaleString('default', { month: 'short' });
            monthNames.push(monthName);
            monthlyBuckets[monthName] = { posSales: 0, onlineSales: 0, totalOrders: 0 };
        }

        // Add POS sales to monthly buckets
        (sales || []).forEach(sale => {
            const date = new Date(sale.created_at);
            const month = date.toLocaleString('default', { month: 'short' });
            if (monthlyBuckets.hasOwnProperty(month)) {
                monthlyBuckets[month].posSales += Number(sale.total_amount || 0);
                monthlyBuckets[month].totalOrders += 1;
            }
        });

        // Add Online delivered orders to monthly buckets
        (onlineOrders || []).forEach(order => {
            if (order.order_status === 'delivered') {
                const date = new Date(order.created_at);
                const month = date.toLocaleString('default', { month: 'short' });
                if (monthlyBuckets.hasOwnProperty(month)) {
                    monthlyBuckets[month].onlineSales += Number(order.total_amount || 0);
                    monthlyBuckets[month].totalOrders += 1;
                }
            }
        });

        const monthlySales = monthNames.map(month => {
            const b = monthlyBuckets[month] || { posSales: 0, onlineSales: 0, totalOrders: 0 };
            return {
                month,
                sales: b.posSales + b.onlineSales,
                posSales: b.posSales,
                onlineSales: b.onlineSales,
                totalOrders: b.totalOrders
            };
        });

        // Recent sales activities (POS Sales)
        const posActivities = (sales || []).map(sale => {
            const itemCount = (sale.sale_items || []).reduce((sum: number, item: any) => {
                const qty = Number(item.quantity || 0);
                const isRet = qty < 0 || Number(item.selling_price || 0) < 0;
                return sum + (isRet ? -Math.abs(qty) : Math.abs(qty));
            }, 0);
            const firstItemName = (sale.sale_items?.[0]?.inventory as any)?.saree_name || 'Item';
            const description = itemCount > 1
                ? `Sold ${itemCount} items (inc. ${firstItemName})`
                : `Sold 1x ${firstItemName}`;

            const hasReturn = (sale.sale_items || []).some((item: any) => Number(item.quantity || 0) < 0 || Number(item.selling_price || 0) < 0);
            const friendlySaleId = getFriendlyId(sale.id, hasReturn);

            return {
                id: friendlySaleId,
                type: 'POS Sale',
                description,
                date: sale.created_at,
                amount: Number(sale.total_amount || 0)
            };
        });

        // Recent sales activities (Online Orders)
        const onlineActivities = (onlineOrders || []).map(order => {
            const itemCount = (order.order_items || []).reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
            const firstItemName = order.order_items?.[0]?.product_name || 'Product';
            const description = itemCount > 1
                ? `Online order of ${itemCount} items (inc. ${firstItemName})`
                : `Online order of 1x ${firstItemName}`;

            return {
                id: order.order_number || order.id.slice(0, 8).toUpperCase(),
                type: 'Online Order',
                description: `${description} [Status: ${(order.order_status || 'placed').toUpperCase()}]`,
                date: order.created_at,
                amount: Number(order.total_amount || 0)
            };
        });

        // Merge and sort activities by date
        const recentActivities = [...posActivities, ...onlineActivities]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 6);

        // Recent weaver payments
        const recentWeaverPayments = payments.slice(0, 5).map((pay: any) => {
            const weaver = weavers.find((w: any) => w.id === pay.weaver_id);
            return {
                id: pay.id || 'N/A',
                weaverName: weaver ? weaver.name : 'Unknown Weaver',
                amount: Number(pay.amount || 0),
                method: pay.payment_method || 'Cash',
                date: pay.created_at
            };
        });

        // Recent expenses
        const recentExpenses = (recentExpensesData || []).map((x: any) => ({
            id: x.id,
            category: x.category || 'Other',
            description: x.description || '',
            amount: Number(x.amount || 0),
            date: x.created_at
        }));

        return {
            totalRevenue,
            grossProfit,
            totalExpenses,
            netProfit: grossProfit - totalExpenses,
            weaverOutstanding,
            storeCreditOutstanding,
            totalUniqueSarees,
            totalStockQty,
            inventoryValuationCost,
            inventoryValuationRetail,
            lowStockCount,
            outOfStockCount,
            criticalLowStockItems,
            totalSales: posSalesCount,
            totalCustomers: totalCustomers || 0,
            totalWeavers: weavers.length,
            monthlySales,
            categoryDistribution,
            fabricDistribution,
            recentActivities,
            recentExpenses,
            recentWeaverPayments,
            totalOnlineOrders: (onlineOrders || []).length,
            onlineOrdersPending: (onlineOrders || []).filter(o => ['placed', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery'].includes(o.order_status)).length,
            onlineOrdersRevenue,
            onlineDeliveredRevenue,
            onlineOrdersPendingAction,
            onlineOrdersInTransit,
            onlineOrdersDelivered,
            onlineOrdersCancelled,
            onlineStatusCounts,
            onlinePaymentCounts,
            recentOnlineOrders,
            todayRevenue,
            todayOrdersCount,
            posRevenue,
            posSalesCount,
            pwaInstallsCount,
            totalReviewsCount,
            pendingReviewsCount,
            averageReviewRating,
            registeredProfilesCount
        };
    }
};
