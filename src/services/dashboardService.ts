import { gsRequest } from './api';

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
        return gsRequest('getDashboardStats');
    }
};
