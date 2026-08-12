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

    totalSales: number;
    totalCustomers: number;
    totalWeavers: number;

    monthlySales: { month: string; sales: number }[];
    categoryDistribution: { category: string; count: number; stock: number }[];
    fabricDistribution: { fabric: string; count: number; stock: number }[];
    
    recentActivities: { id: string; type: string; description: string; date: string; amount: number }[];
    recentExpenses: { id: string; category: string; description: string; amount: number; date: string }[];
    recentWeaverPayments: { id: string; weaverName: string; amount: number; method: string; date: string }[];

    // Online order specific stats
    totalOnlineOrders: number;
    onlineOrdersPending: number;
    onlineOrdersRevenue: number;
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
            .select('category, fabric, stock, purchase_price, selling_price');
        if (sareesError) throw sareesError;

        // 3. Fetch all expenses
        const { data: expenses, error: expensesError } = await supabase
            .from('expenses')
            .select('amount');
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

        // 4.5 Fetch all online orders
        const { data: onlineOrders, error: ordersError } = await supabase
            .from('orders')
            .select(`
                id,
                order_number,
                subtotal,
                shipping_fee,
                discount,
                total_amount,
                order_status,
                payment_status,
                created_at,
                order_items (
                    product_name,
                    quantity,
                    unit_price,
                    inventory (
                        purchase_price
                    )
                )
            `);
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

        // Calculate Online Orders revenue and profit
        let onlineOrdersRevenue = 0;
        let onlineOrdersProfit = 0;

        (onlineOrders || []).forEach((order: any) => {
            // Count delivered orders as completed revenue/profit
            if (order.order_status === 'delivered') {
                onlineOrdersRevenue += Number(order.total_amount || 0);

                // Calculate profit: (subtotal_revenue - subtotal_cost) + shipping_fee - discount
                const subtotalCost = (order.order_items || []).reduce((costSum: number, item: any) => {
                    return costSum + (Number(item.inventory?.purchase_price || 0) * Number(item.quantity || 0));
                }, 0);
                const subtotalRevenue = Number(order.subtotal || 0);
                const orderProfit = (subtotalRevenue - subtotalCost) + Number(order.shipping_fee || 0) - Number(order.discount || 0);
                onlineOrdersProfit += orderProfit;
            }
        });

        // Calculate Revenue and Profit (POS + Online combined)
        const posRevenue = (sales || []).reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
        const posProfit = (sales || []).reduce((sum, s) => sum + Number(s.profit || 0), 0);

        const totalRevenue = posRevenue + onlineOrdersRevenue;
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

        // Inventory values
        const totalUniqueSarees = (sarees || []).length;
        const totalStockQty = (sarees || []).reduce((sum, s) => sum + Number(s.stock || 0), 0);
        const inventoryValuationCost = (sarees || []).reduce((sum, s) => sum + (Number(s.purchase_price || 0) * Number(s.stock || 0)), 0);
        const inventoryValuationRetail = (sarees || []).reduce((sum, s) => sum + (Number(s.selling_price || 0) * Number(s.stock || 0)), 0);
        const lowStockCount = (sarees || []).filter(s => Number(s.stock || 0) < 5).length;

        // Category distribution
        const catMap: Record<string, { count: number; stock: number }> = {};
        (sarees || []).forEach(s => {
            const cat = s.category || 'Uncategorized';
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

        // Monthly sales (for the last 6 months) - Combined POS and Completed Online Orders
        const monthlyMap: Record<string, number> = {};
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = d.toLocaleString('default', { month: 'short' });
            monthlyMap[monthName] = 0;
        }

        // Add POS sales
        (sales || []).forEach(sale => {
            const date = new Date(sale.created_at);
            const month = date.toLocaleString('default', { month: 'short' });
            if (monthlyMap.hasOwnProperty(month)) {
                monthlyMap[month] += Number(sale.total_amount || 0);
            }
        });

        // Add Online orders
        (onlineOrders || []).forEach(order => {
            if (order.order_status === 'delivered') {
                const date = new Date(order.created_at);
                const month = date.toLocaleString('default', { month: 'short' });
                if (monthlyMap.hasOwnProperty(month)) {
                    monthlyMap[month] += Number(order.total_amount || 0);
                }
            }
        });

        const monthlySales = Object.keys(monthlyMap).map(month => ({
            month,
            sales: monthlyMap[month]
        }));

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
                id: order.order_number,
                type: 'Online Order',
                description: `${description} [Status: ${order.order_status.toUpperCase()}]`,
                date: order.created_at,
                amount: Number(order.total_amount || 0)
            };
        });

        // Merge and sort activities by date
        const recentActivities = [...posActivities, ...onlineActivities]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);

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
            totalSales: (sales || []).length,
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
            onlineOrdersRevenue
        };
    }
};
