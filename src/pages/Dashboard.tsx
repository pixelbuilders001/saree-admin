import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    AlertTriangle,
    DollarSign,
    Loader2,
    Clock,
    Tag,
    ShoppingBag,
    Users,
    Layers,
    Coins,
    ArrowDownRight,
    RefreshCw,
    Scale,
    Activity,
    Layers3,
    ArrowUpRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

export default function DashboardPage() {
    const { data: stats, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['dashboardStats'],
        queryFn: dashboardService.getStats
    });

    const [activeTab, setActiveTab] = React.useState<'sales' | 'expenses' | 'weavers'>('sales');

    if (isLoading) {
        return (
            <div className="h-[80vh] flex items-center justify-center">
                <div className="text-center space-y-3">
                    <Loader2 className="h-10 w-10 animate-spin text-maroon mx-auto" />
                    <p className="text-xs font-serif text-maroon tracking-wider animate-pulse">SBS COMMAND CENTER INITIALIZING...</p>
                </div>
            </div>
        );
    }

    const formatCurrency = (val: number) => `₹${(val || 0).toLocaleString('en-IN')}`;

    // Metric cards configured for high-density, smaller height layout
    const statCards = [
        {
            title: 'REVENUE',
            value: formatCurrency(stats?.totalRevenue || 0),
            subtitle: `${stats?.totalSales || 0} POS + ${stats?.totalOnlineOrders || 0} Online`,
            icon: DollarSign,
            color: 'text-green-700 bg-green-50/60 border-green-200/50',
            iconColor: 'bg-green-150/70 text-green-700'
        },
        {
            title: 'ONLINE ORDERS',
            value: `${stats?.onlineOrdersPending || 0} Pending`,
            subtitle: `${stats?.totalOnlineOrders || 0} orders received`,
            icon: ShoppingBag,
            color: 'text-indigo-700 bg-indigo-50/60 border-indigo-200/50',
            iconColor: 'bg-indigo-100 text-indigo-700'
        },
        {
            title: 'NET PROFIT',
            value: formatCurrency(stats?.netProfit || 0),
            subtitle: 'POS and delivered online profit',
            icon: TrendingUp,
            color: 'text-emerald-700 bg-emerald-50/60 border-emerald-200/50',
            iconColor: 'bg-emerald-100 text-emerald-700'
        },
        {
            title: 'OVERHEAD EXPENSES',
            value: formatCurrency(stats?.totalExpenses || 0),
            subtitle: 'Rent, utility bills, salaries',
            icon: ArrowDownRight,
            color: 'text-rose-700 bg-rose-50/60 border-rose-200/50',
            iconColor: 'bg-rose-100 text-rose-700'
        },
        {
            title: 'WEAVER OUTSTANDINGS',
            value: formatCurrency(stats?.weaverOutstanding || 0),
            subtitle: `Due across ${stats?.totalWeavers || 0} weavers`,
            icon: Layers,
            color: 'text-amber-700 bg-amber-50/60 border-amber-200/50',
            iconColor: 'bg-amber-100 text-amber-700'
        },
        {
            title: 'STORE CREDIT LIABILITIES',
            value: formatCurrency(stats?.storeCreditOutstanding || 0),
            subtitle: 'Active unredeemed vouchers',
            icon: Coins,
            color: 'text-purple-700 bg-purple-50/60 border-purple-200/50',
            iconColor: 'bg-purple-100 text-purple-700'
        },
        {
            title: 'LOW STOCK THRESHOLD',
            value: `${stats?.lowStockCount || 0} items`,
            subtitle: 'Sarees under 5 units',
            icon: AlertTriangle,
            color: stats?.lowStockCount && stats.lowStockCount > 0 
                ? 'text-red-700 bg-red-50/60 border-red-200/50 animate-pulse'
                : 'text-gray-700 bg-gray-50/60 border-gray-200/50',
            iconColor: stats?.lowStockCount && stats.lowStockCount > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-150 text-gray-700'
        }
    ];

    // Animation presets
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const itemVariants = {
        hidden: { y: 8, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    const projectedMarkup = (stats?.inventoryValuationRetail || 0) - (stats?.inventoryValuationCost || 0);
    const profitMarginPercent = stats?.inventoryValuationRetail 
        ? Math.round((projectedMarkup / stats.inventoryValuationRetail) * 100)
        : 0;

    return (
        <motion.div 
            className="space-y-4 max-w-7xl mx-auto px-4 py-2"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header Banner - High Density Minimalist */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gold/15 pb-3 gap-2">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="p-1 bg-maroon/5 rounded-md border border-gold/20">
                            <Activity className="h-4 w-4 text-maroon" />
                        </div>
                        <h1 className="text-lg font-black font-serif text-maroon tracking-wider uppercase">SBS Terminal Command Center</h1>
                    </div>
                    <p className="text-[10px] text-gray-500 font-sans mt-0.5">
                        Centralized operations command: inventory valuation, weaver ledger liabilities, and cash flow auditing
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-[9px] font-mono bg-cream/35 border border-gold/20 text-maroon px-2 py-0.5 rounded flex items-center gap-1.5 shadow-sm font-bold">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping"></span>
                        SYSTEM: ONLINE
                    </span>
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-maroon border border-gold/20 px-2.5 py-1 rounded bg-white hover:bg-cream/10 transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
                        {isFetching ? 'Refreshing...' : 'Sync'}
                    </button>
                </div>
            </div>

            {/* High Density Metric Cards - Compact Grid (Redesigned sizes) */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {statCards.map((card, index) => (
                    <motion.div key={index} variants={itemVariants}>
                        <Card className={`border ${card.color} shadow-sm rounded-lg hover:shadow-md transition-all h-[84px] flex flex-col justify-between overflow-hidden relative group`}>
                            <CardHeader className="flex flex-row items-center justify-between p-2.5 pb-0 space-y-0">
                                <span className="text-[9px] font-bold tracking-widest uppercase opacity-80">{card.title}</span>
                                <div className={`p-1 rounded ${card.iconColor}`}>
                                    <card.icon className="h-3 w-3" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-2.5 pt-0">
                                <div className="text-base font-black tracking-tight font-sans leading-none">{card.value}</div>
                                <div className="text-[8px] text-gray-500 mt-1 truncate">
                                    {card.subtitle}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Inventory Valuation & Revenue Trend Split Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Inventory Valuation Asset Card */}
                <motion.div variants={itemVariants} className="lg:col-span-1">
                    <Card className="border-gold/15 bg-white shadow-sm h-[260px] flex flex-col">
                        <CardHeader className="bg-cream/20 border-b border-gold/10 p-3 flex flex-row items-center gap-2">
                            <Scale className="h-4 w-4 text-maroon" />
                            <div>
                                <CardTitle className="text-xs font-bold text-maroon tracking-wider uppercase">Inventory Valuation</CardTitle>
                                <p className="text-[9px] text-gray-400">Current stock asset values & potential markup</p>
                            </div>
                        </CardHeader>
                        <CardContent className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                            <div className="grid grid-cols-2 gap-3 text-center">
                                <div className="bg-cream/10 p-2 rounded border border-gold/10">
                                    <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Asset Value (Cost)</div>
                                    <div className="text-sm font-black text-maroon mt-0.5">{formatCurrency(stats?.inventoryValuationCost || 0)}</div>
                                </div>
                                <div className="bg-cream/10 p-2 rounded border border-gold/10">
                                    <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Retail Value (SRP)</div>
                                    <div className="text-sm font-black text-maroon mt-0.5">{formatCurrency(stats?.inventoryValuationRetail || 0)}</div>
                                </div>
                            </div>

                            {/* Profit Margin Indicator Bar */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-center text-[9px] font-bold">
                                    <span className="text-gray-500 uppercase">Projected Markup Margin</span>
                                    <span className="text-emerald-700">{formatCurrency(projectedMarkup)} ({profitMarginPercent}%)</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-200/50">
                                    <div 
                                        className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                                        style={{ width: `${profitMarginPercent}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Inventory Density Counts */}
                            <div className="grid grid-cols-3 gap-2 border-t border-gold/10 pt-2.5 text-center text-xs">
                                <div>
                                    <div className="text-[8px] text-gray-400 font-semibold uppercase">Total Stock</div>
                                    <div className="text-xs font-black text-gray-800 mt-0.5">{stats?.totalStockQty?.toLocaleString() || 0} pcs</div>
                                </div>
                                <div>
                                    <div className="text-[8px] text-gray-400 font-semibold uppercase">Unique Designs</div>
                                    <div className="text-xs font-black text-gray-800 mt-0.5">{stats?.totalUniqueSarees || 0} types</div>
                                </div>
                                <div>
                                    <div className="text-[8px] text-gray-400 font-semibold uppercase">Active Customers</div>
                                    <div className="text-xs font-black text-gray-800 mt-0.5">{stats?.totalCustomers || 0} users</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Sales Performance Trend Area Chart */}
                <motion.div variants={itemVariants} className="lg:col-span-2">
                    <Card className="border-gold/15 bg-white shadow-sm h-[260px] flex flex-col">
                        <CardHeader className="bg-cream/20 border-b border-gold/10 p-3 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-maroon" />
                                <div>
                                    <CardTitle className="text-xs font-bold text-maroon tracking-wider uppercase">Sales Performance Revenue Trend</CardTitle>
                                    <p className="text-[9px] text-gray-400">Total monthly revenue generated over last 6 months</p>
                                </div>
                            </div>
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 rounded uppercase font-mono">
                                6 Month Trend
                            </span>
                        </CardHeader>
                        <CardContent className="p-2 pb-0 flex-1 relative overflow-hidden">
                            {stats?.monthlySales && stats.monthlySales.length > 0 ? (
                                <div className="w-full h-full min-h-[180px] -ml-4 pr-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart
                                            data={stats.monthlySales}
                                            margin={{ top: 10, right: 5, left: 0, bottom: 5 }}
                                        >
                                            <defs>
                                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#800000" stopOpacity={0.15}/>
                                                    <stop offset="95%" stopColor="#800000" stopOpacity={0.01}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis 
                                                dataKey="month" 
                                                stroke="#94a3b8" 
                                                fontSize={9}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis 
                                                stroke="#94a3b8" 
                                                fontSize={9}
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                                            />
                                            <Tooltip 
                                                formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                                                contentStyle={{ fontSize: '10px', borderRadius: '6px', border: '1px solid #d4af37', background: 'rgba(255,255,255,0.95)' }}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="sales" 
                                                stroke="#800000" 
                                                strokeWidth={2}
                                                fillOpacity={1} 
                                                fill="url(#colorSales)" 
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">No sales history trend available</div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Application Logs & Distribution Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Tabs log: Sales vs Expenses vs Weaver Payouts */}
                <motion.div variants={itemVariants} className="lg:col-span-2 flex flex-col">
                    <Card className="border-gold/15 bg-white shadow-sm flex-1 flex flex-col min-h-[300px]">
                        <CardHeader className="bg-cream/10 border-b border-gold/10 p-2.5 pb-0 flex flex-row items-center justify-between flex-shrink-0">
                            {/* Tab selectors */}
                            <div className="flex gap-1.5">
                                <button
                                    onClick={() => setActiveTab('sales')}
                                    className={`px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase border-b-2 rounded-t-md transition-all cursor-pointer ${activeTab === 'sales' ? 'border-maroon text-maroon bg-maroon/5' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    Sales Log
                                </button>
                                <button
                                    onClick={() => setActiveTab('expenses')}
                                    className={`px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase border-b-2 rounded-t-md transition-all cursor-pointer ${activeTab === 'expenses' ? 'border-maroon text-maroon bg-maroon/5' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    Overheads Log
                                </button>
                                <button
                                    onClick={() => setActiveTab('weavers')}
                                    className={`px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase border-b-2 rounded-t-md transition-all cursor-pointer ${activeTab === 'weavers' ? 'border-maroon text-maroon bg-maroon/5' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    Weaver Payouts
                                </button>
                            </div>
                            <div className="text-[8px] font-mono text-gray-450 uppercase flex items-center gap-1 pb-1">
                                <Clock className="h-3 w-3" />
                                Last 5 entries
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-y-auto">
                            {activeTab === 'sales' && (
                                <Table>
                                    <TableHeader className="bg-cream/5">
                                        <TableRow className="border-b border-gold/10">
                                            <TableHead className="h-8 text-[9px] font-bold text-maroon py-1">Invoice ID</TableHead>
                                            <TableHead className="h-8 text-[9px] font-bold text-maroon py-1">Description</TableHead>
                                            <TableHead className="h-8 text-[9px] font-bold text-maroon py-1 text-right">Amount (₹)</TableHead>
                                            <TableHead className="h-8 text-[9px] font-bold text-maroon py-1 text-right">Timestamp</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                                            stats.recentActivities.map((act, index) => {
                                                const isReturn = act.id.startsWith('EX-') || act.amount < 0;
                                                return (
                                                    <TableRow key={index} className="hover:bg-cream/5 border-b border-gold/5 h-8">
                                                        <TableCell className="py-1 text-xs font-mono font-bold text-maroon font-sans">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={`inline-block text-[8px] font-semibold px-1 py-0.2 rounded border uppercase leading-tight ${
                                                                    act.type === 'Online Order' 
                                                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-150' 
                                                                        : 'bg-green-50 text-green-700 border-green-150'
                                                                }`}>
                                                                    {act.type === 'Online Order' ? 'Online' : 'POS'}
                                                                </span>
                                                                <span className="font-mono">{act.id}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-1 text-xs text-gray-700 truncate max-w-[200px]" title={act.description}>
                                                            {act.description}
                                                        </TableCell>
                                                        <TableCell className={`py-1 text-xs font-mono font-black text-right ${isReturn ? 'text-rose-600' : 'text-gray-800'}`}>
                                                            {isReturn ? '-' : ''}₹{Math.abs(act.amount).toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="py-1 text-xs text-gray-500 text-right">
                                                            {new Date(act.date).toLocaleDateString()} {new Date(act.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center text-xs text-gray-400 italic">No recent sales available</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}

                            {activeTab === 'expenses' && (
                                <Table>
                                    <TableHeader className="bg-cream/5">
                                        <TableRow className="border-b border-gold/10">
                                            <TableHead className="h-8 text-[9px] font-bold text-maroon py-1">Category</TableHead>
                                            <TableHead className="h-8 text-[9px] font-bold text-maroon py-1">Description</TableHead>
                                            <TableHead className="h-8 text-[9px] font-bold text-maroon py-1 text-right">Amount (₹)</TableHead>
                                            <TableHead className="h-8 text-[9px] font-bold text-maroon py-1 text-right">Timestamp</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {stats?.recentExpenses && stats.recentExpenses.length > 0 ? (
                                            stats.recentExpenses.map((exp, index) => (
                                                <TableRow key={index} className="hover:bg-cream/5 border-b border-gold/5 h-8">
                                                    <TableCell className="py-1">
                                                        <span className="bg-rose-50 text-rose-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-rose-100 uppercase">
                                                            {exp.category}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-1 text-xs text-gray-700 truncate max-w-[200px]" title={exp.description}>
                                                        {exp.description || 'No description'}
                                                    </TableCell>
                                                    <TableCell className="py-1 text-xs font-mono font-black text-right text-rose-600">
                                                        ₹{exp.amount.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="py-1 text-xs text-gray-500 text-right">
                                                        {new Date(exp.date).toLocaleDateString()} {new Date(exp.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center text-xs text-gray-400 italic">No recent expenses listed</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}

                            {activeTab === 'weavers' && (
                                <Table>
                                    <TableHeader className="bg-cream/5">
                                        <TableRow className="border-b border-gold/10">
                                            <TableHead className="h-8 text-[9px] font-bold text-maroon py-1">Weaver Partner</TableHead>
                                            <TableHead className="h-8 text-[9px] font-bold text-maroon py-1">Method</TableHead>
                                            <TableHead className="h-8 text-[9px] font-bold text-maroon py-1 text-right">Amount Paid (₹)</TableHead>
                                            <TableHead className="h-8 text-[9px] font-bold text-maroon py-1 text-right">Timestamp</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {stats?.recentWeaverPayments && stats.recentWeaverPayments.length > 0 ? (
                                            stats.recentWeaverPayments.map((pay, index) => (
                                                <TableRow key={index} className="hover:bg-cream/5 border-b border-gold/5 h-8">
                                                    <TableCell className="py-1 text-xs font-bold text-gray-800">{pay.weaverName}</TableCell>
                                                    <TableCell className="py-1">
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${pay.method === 'UPI' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                            {pay.method}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-1 text-xs font-mono font-black text-right text-emerald-600">
                                                        ₹{pay.amount.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="py-1 text-xs text-gray-500 text-right">
                                                        {new Date(pay.date).toLocaleDateString()} {new Date(pay.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center text-xs text-gray-400 italic">No recent payments listed</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Stock distribution and status */}
                <motion.div variants={itemVariants} className="lg:col-span-1">
                    <Card className="border-gold/20 shadow-sm flex flex-col h-full min-h-[300px]">
                        <CardHeader className="bg-cream/20 border-b border-gold/10 p-2.5 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Tag className="h-4 w-4 text-maroon" />
                                <CardTitle className="text-xs font-bold text-maroon tracking-wider uppercase">Distribution</CardTitle>
                            </div>
                            <span className="text-[8px] font-semibold text-gray-400 uppercase">Volume by Catalog</span>
                        </CardHeader>
                        <CardContent className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[300px]">
                            {/* Categories Section */}
                            <div>
                                <div className="text-[8px] font-bold text-maroon/75 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                    <Layers3 className="h-3 w-3" />
                                    Categories Distribution
                                </div>
                                <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                                    {stats?.categoryDistribution && stats.categoryDistribution.length > 0 ? (
                                        stats.categoryDistribution.map((entry, index) => {
                                            const totalPieces = stats?.totalStockQty || 1;
                                            const pct = Math.min(100, Math.round((entry.stock / totalPieces) * 100));
                                            return (
                                                <div key={index} className="space-y-1 text-xs">
                                                    <div className="flex justify-between items-center text-[10px]">
                                                        <span className="text-gray-600 font-bold">{entry.category}</span>
                                                        <span className="text-gray-450 font-mono text-[9px]">
                                                            {entry.stock} pcs ({pct}%)
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
                                                        <div 
                                                            className="bg-maroon/60 h-full rounded-full" 
                                                            style={{ width: `${pct}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-[10px] text-gray-400 italic text-center py-2">No categories recorded</p>
                                    )}
                                </div>
                            </div>

                            {/* Fabric Section */}
                            <div className="border-t border-gold/10 pt-2.5">
                                <div className="text-[8px] font-bold text-maroon/75 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                    <Tag className="h-3 w-3" />
                                    Fabric Distribution
                                </div>
                                <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                                    {stats?.fabricDistribution && stats.fabricDistribution.length > 0 ? (
                                        stats.fabricDistribution.map((entry, index) => {
                                            const totalPieces = stats?.totalStockQty || 1;
                                            const pct = Math.min(100, Math.round((entry.stock / totalPieces) * 100));
                                            return (
                                                <div key={index} className="space-y-1 text-xs">
                                                    <div className="flex justify-between items-center text-[10px]">
                                                        <span className="text-gray-600 font-bold">{entry.fabric}</span>
                                                        <span className="text-gray-450 font-mono text-[9px]">
                                                            {entry.stock} pcs ({pct}%)
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
                                                        <div 
                                                            className="bg-gold/60 h-full rounded-full" 
                                                            style={{ width: `${pct}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-[10px] text-gray-400 italic text-center py-2">No fabrics recorded</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </motion.div>
    );
}
