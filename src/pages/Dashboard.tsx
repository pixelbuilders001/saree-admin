import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import {
    TrendingUp,
    Users,
    ShoppingBag,
    AlertTriangle,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

const COLORS = ['#800020', '#D4AF37', '#F5F5DC', '#4A0404', '#FFD700'];

export default function DashboardPage() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboardStats'],
        queryFn: dashboardService.getStats
    });

    if (isLoading) {
        return (
            <div className="h-[80vh] flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-maroon" />
            </div>
        );
    }

    const statCards = [
        {
            title: 'Revenue',
            value: `₹${stats?.totalRevenue.toLocaleString()}`,
            description: 'Total sales income',
            icon: DollarSign,
            trend: 'up',
            color: 'bg-green-50 text-green-600'
        },
        {
            title: 'Total Expenses',
            value: `₹${stats?.totalExpenses?.toLocaleString() || 0}`,
            description: 'Rent, Bills, etc.',
            icon: ArrowDownRight,
            trend: 'down',
            color: 'bg-orange-50 text-orange-600'
        },
        {
            title: 'Net Profit',
            value: `₹${stats?.netProfit?.toLocaleString() || 0}`,
            description: 'After all expenses',
            icon: TrendingUp,
            trend: 'up',
            color: 'bg-blue-50 text-blue-600'
        },
        {
            title: 'Low Stock',
            value: stats?.lowStockCount.toString(),
            description: 'Sarees below 5 qty',
            icon: AlertTriangle,
            trend: 'down',
            color: 'bg-red-50 text-red-600'
        }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-maroon font-serif">Quick Overview</h1>
                <p className="text-gray-500">Welcome back! Here's what's happening today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card, index) => (
                    <Card key={index} className="border-gold/20 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">{card.title}</CardTitle>
                            <div className={`${card.color} p-2 rounded-lg`}>
                                <card.icon className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-maroon">{card.value}</div>
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                {card.trend === 'up' ? <ArrowUpRight className="h-3 w-3 text-green-500" /> : <ArrowDownRight className="h-3 w-3 text-red-500" />}
                                {card.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-gold/20 shadow-md col-span-1">
                    <CardHeader>
                        <CardTitle className="text-maroon font-serif">Monthly Sales Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats?.monthlySales}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                                <Tooltip cursor={{ fill: '#F5F5DC' }} contentStyle={{ borderRadius: '8px', border: '1px solid #D4AF37' }} />
                                <Bar dataKey="sales" fill="#800020" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-gold/20 shadow-md col-span-1">
                    <CardHeader>
                        <CardTitle className="text-maroon font-serif">Inventory Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats?.categoryDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="count"
                                >
                                    {Array.isArray(stats?.categoryDistribution) && stats?.categoryDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #D4AF37' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap justify-center gap-4 mt-4">
                            {Array.isArray(stats?.categoryDistribution) && stats?.categoryDistribution.map((entry, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <span className="text-xs text-gray-500">{entry.category}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
