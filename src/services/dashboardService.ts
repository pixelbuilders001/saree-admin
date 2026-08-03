import { supabase } from '@/lib/supabase';
import { getFriendlyId } from '@/services/salesService';

export interface DashboardStats {
    totalRevenue: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    totalSales: number;
    totalCustomers: number;
    lowStockCount: number;
    monthlySales: { month: string; sales: number }[];
    categoryDistribution: { category: string; count: number }[];
    recentActivities: { id: string; type: string; description: string; date: string }[];
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
            .select('category, stock');
        if (sareesError) throw sareesError;

        // 3. Fetch all expenses
        const { data: expenses, error: expensesError } = await supabase
            .from('expenses')
            .select('amount');
        if (expensesError) throw expensesError;

        // 4. Fetch all sales
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
                    inventory (
                        saree_name
                    )
                )
            `)
            .order('created_at', { ascending: false });
        if (salesError) throw salesError;

        // Calculate Revenue and Profit
        const totalRevenue = (sales || []).reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
        const grossProfit = (sales || []).reduce((sum, s) => sum + Number(s.profit || 0), 0);
        const totalExpenses = (expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);

        // Low stock count (sarees with stock < 5)
        const lowStockCount = (sarees || []).filter(s => Number(s.stock || 0) < 5).length;

        // Category distribution
        const catMap: Record<string, number> = {};
        (sarees || []).forEach(s => {
            const cat = s.category || 'Uncategorized';
            catMap[cat] = (catMap[cat] || 0) + 1;
        });
        const categoryDistribution = Object.keys(catMap).map(category => ({
            category,
            count: catMap[category]
        }));

        // Monthly sales (for the last 6 months)
        const monthlyMap: Record<string, number> = {};
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = d.toLocaleString('default', { month: 'short' });
            monthlyMap[monthName] = 0;
        }

        (sales || []).forEach(sale => {
            const date = new Date(sale.created_at);
            const month = date.toLocaleString('default', { month: 'short' });
            if (monthlyMap.hasOwnProperty(month)) {
                monthlyMap[month] += Number(sale.total_amount || 0);
            }
        });

        const monthlySales = Object.keys(monthlyMap).map(month => ({
            month,
            sales: monthlyMap[month]
        }));

        // Recent Activities (take last 5 sales details)
        const recentActivities = (sales || []).slice(0, 5).map(sale => {
            const itemCount = (sale.sale_items || []).reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
            const firstItemName = (sale.sale_items?.[0]?.inventory as any)?.saree_name || 'Item';
            const description = itemCount > 1
                ? `Sold ${itemCount} items (inc. ${firstItemName})`
                : `Sold 1x ${firstItemName}`;

            const hasReturn = (sale.sale_items || []).some((item: any) => Number(item.quantity || 0) < 0);
            const friendlySaleId = getFriendlyId(sale.id, hasReturn);

            return {
                id: friendlySaleId,
                type: 'Sale',
                description,
                date: sale.created_at
            };
        });

        return {
            totalRevenue,
            grossProfit,
            totalExpenses,
            netProfit: grossProfit - totalExpenses,
            totalSales: (sales || []).length,
            totalCustomers: totalCustomers || 0,
            lowStockCount,
            monthlySales,
            categoryDistribution,
            recentActivities
        };
    }
};
