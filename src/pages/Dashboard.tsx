import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import {
    TrendingUp,
    AlertTriangle,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    Clock,
    Tag,
    ShoppingBag,
    Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
            title: 'REVENUE',
            value: `₹${stats?.totalRevenue.toLocaleString()}`,
            description: 'Total sales income',
            icon: DollarSign,
            trend: 'up',
            color: 'bg-green-50/60 text-green-700 border-green-200/50'
        },
        {
            title: 'TOTAL EXPENSES',
            value: `₹${stats?.totalExpenses?.toLocaleString() || 0}`,
            description: 'Rent, Bills, Ads',
            icon: ArrowDownRight,
            trend: 'down',
            color: 'bg-orange-50/60 text-orange-700 border-orange-200/50'
        },
        {
            title: 'NET PROFIT',
            value: `₹${stats?.netProfit?.toLocaleString() || 0}`,
            description: 'Gross minus overheads',
            icon: TrendingUp,
            trend: 'up',
            color: 'bg-maroon/5 text-maroon border-gold/30'
        },
        {
            title: 'LOW STOCK ITEMS',
            value: stats?.lowStockCount.toString() || '0',
            description: 'Sarees under limit',
            icon: AlertTriangle,
            trend: 'down',
            color: 'bg-red-50/60 text-red-700 border-red-200/50'
        }
    ];

    return (
        <div className="space-y-4 max-w-7xl mx-auto px-2">
            {/* Minimal High Density Header */}
            <div className="flex items-center justify-between border-b border-gold/10 pb-2">
                <div>
                    <h1 className="text-xl font-bold font-serif text-maroon tracking-wider">SBS TERMINAL DASHBOARD</h1>
                    <p className="text-xs text-gray-500">Real-time status overview & activity monitoring</p>
                </div>
                <div className="px-2.5 py-1 bg-cream/35 border border-gold/30 rounded text-[10px] font-mono text-maroon font-bold">
                    SYSTEM SYNC: ONLINE
                </div>
            </div>

            {/* High Density Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {statCards.map((card, index) => (
                    <Card key={index} className={`border ${card.color} shadow-sm rounded-md transition-all hover:scale-[1.01]`}>
                        <CardHeader className="flex flex-row items-center justify-between p-3 pb-1 space-y-0">
                            <span className="text-[10px] font-bold tracking-widest uppercase opacity-75">{card.title}</span>
                            <card.icon className="h-3.5 w-3.5 opacity-80" />
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <div className="text-lg lg:text-xl font-bold tracking-tight font-sans">{card.value}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                                {card.description}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Two-Column Midsection Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Recent Activities Section */}
                <Card className="lg:col-span-2 border-gold/20 shadow-md">
                    <CardHeader className="bg-cream/20 border-b border-gold/10 p-3 flex flex-row items-center gap-2">
                        <Clock className="h-4 w-4 text-maroon" />
                        <CardTitle className="text-xs font-bold text-maroon tracking-wider uppercase">Recent Activity Log (Sales)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-cream/10">
                                <TableRow className="border-b border-gold/10">
                                    <TableHead className="h-8 text-[10px] font-bold text-maroon">Sale ID</TableHead>
                                    <TableHead className="h-8 text-[10px] font-bold text-maroon">Event Description</TableHead>
                                    <TableHead className="h-8 text-[10px] font-bold text-maroon text-right">Timestamp</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                                    stats.recentActivities.map((act) => (
                                        <TableRow key={act.id} className="hover:bg-cream/5 border-b border-gold/5 h-8">
                                            <TableCell className="py-1.5 text-xs font-mono font-bold text-maroon">{act.id}</TableCell>
                                            <TableCell className="py-1.5 text-xs text-gray-700">{act.description}</TableCell>
                                            <TableCell className="py-1.5 text-xs text-gray-500 text-right">
                                                {new Date(act.date).toLocaleDateString()} {new Date(act.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-20 text-center text-xs text-gray-400 italic">No recent activities available</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Stock distribution and status */}
                <Card className="border-gold/20 shadow-md">
                    <CardHeader className="bg-cream/20 border-b border-gold/10 p-3 flex flex-row items-center gap-2">
                        <Tag className="h-4 w-4 text-maroon" />
                        <CardTitle className="text-xs font-bold text-maroon tracking-wider uppercase">Categories Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 space-y-3">
                        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                            {stats?.categoryDistribution && stats.categoryDistribution.length > 0 ? (
                                stats.categoryDistribution.map((entry, index) => (
                                    <div key={index} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-b-0 text-xs">
                                        <span className="text-gray-600 font-semibold">{entry.category}</span>
                                        <span className="bg-gold/10 text-maroon text-[10px] font-bold px-1.5 py-0.5 rounded border border-gold/20">
                                            {entry.count} Active Types
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-gray-400 italic text-center py-4">No categories recorded</p>
                            )}
                        </div>

                        {/* System Quick metrics list */}
                        <div className="border-t border-gold/15 pt-3 grid grid-cols-2 gap-2 text-center">
                            <div className="bg-cream/15 p-2 rounded border border-gold/10">
                                <div className="text-[10px] text-gray-500 font-bold uppercase">Total Sales</div>
                                <div className="text-sm font-black text-maroon mt-0.5">{stats?.totalSales || 0}</div>
                            </div>
                            <div className="bg-cream/15 p-2 rounded border border-gold/10">
                                <div className="text-[10px] text-gray-500 font-bold uppercase">Customers</div>
                                <div className="text-sm font-black text-maroon mt-0.5">{stats?.totalCustomers || 0}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
