import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import { storefrontService } from '@/services/storefrontService';
import { ordersService } from '@/services/ordersService';
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
    ArrowUpRight,
    Heart,
    ShoppingCart,
    Truck,
    CheckCircle2,
    PackageCheck,
    AlertCircle,
    Smartphone,
    Star,
    ExternalLink,
    Calendar,
    ChevronRight,
    Package,
    Box,
    ShieldCheck,
    MapPin,
    Store,
    CreditCard,
    Send,
    Home,
    Ban,
    ArrowRight,
    Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
    const { data: stats, isLoading: isStatsLoading, isFetching, refetch } = useQuery({
        queryKey: ['dashboardStats'],
        queryFn: dashboardService.getStats
    });

    const { data: wishlistItems, isLoading: isWishlistLoading } = useQuery({
        queryKey: ['wishlistItems'],
        queryFn: storefrontService.getWishlistItems
    });

    const { data: cartItems, isLoading: isCartsLoading } = useQuery({
        queryKey: ['activeCartItems'],
        queryFn: ordersService.getActiveCartItems
    });

    const isLoading = isStatsLoading || isWishlistLoading || isCartsLoading;

    const navigate = useNavigate();
    const [activeTab, setActiveTab] = React.useState<'sales' | 'expenses' | 'weavers'>('sales');

    const getOrderStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'delivered':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'shipped':
            case 'out_for_delivery':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'packed':
            case 'processing':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'confirmed':
            case 'placed':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'cancelled':
            case 'returned':
                return 'bg-rose-50 text-rose-700 border-rose-200';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const getPaymentStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'paid':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'pending':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'refunded':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'failed':
                return 'bg-rose-50 text-rose-700 border-rose-200';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

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

    const activeCartCount = cartItems ? new Set(cartItems.map(item => item.userPhone)).size : 0;
    const totalCartItemsCount = cartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

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
            title: 'WISHLIST INTEREST',
            value: `${wishlistItems?.length || 0} Items`,
            subtitle: 'Products saved by customers',
            icon: Heart,
            color: 'text-rose-700 bg-rose-50/60 border-rose-200/50',
            iconColor: 'bg-rose-100 text-rose-700'
        },
        {
            title: 'ACTIVE SHOPPING CARTS',
            value: `${activeCartCount} Carts`,
            subtitle: `${totalCartItemsCount} items left in carts`,
            icon: ShoppingCart,
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
            className="space-y-4 max-w-7xl mx-auto px-0 sm:px-2 py-1"
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
                        Centralized operations command: omnichannel fulfillment, inventory valuation, weaver ledger liabilities & audit
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {stats?.todayRevenue !== undefined && (
                        <div className="text-[10px] font-mono bg-amber-50/90 border border-amber-200/80 text-amber-900 px-2.5 py-1 rounded flex items-center gap-1.5 shadow-sm font-semibold">
                            <Clock className="h-3 w-3 text-amber-700" />
                            <span>TODAY: <strong className="font-bold">{formatCurrency(stats.todayRevenue)}</strong> ({stats.todayOrdersCount || 0} orders)</span>
                        </div>
                    )}
                    <span className="text-[9px] font-mono bg-cream/35 border border-gold/20 text-maroon px-2 py-1 rounded flex items-center gap-1.5 shadow-sm font-bold">
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

            {/* ONLINE ORDERS COMMAND CENTER */}
            <motion.div variants={itemVariants}>
                <Card className="border-gold/20 bg-white shadow-sm overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-cream/30 via-white to-cream/20 border-b border-gold/15 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                                <ShoppingBag className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-xs font-bold text-maroon tracking-wider uppercase">
                                        Online Storefront & Orders Pipeline
                                    </CardTitle>
                                    <span className="text-[9px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded font-bold">
                                        {stats?.totalOnlineOrders || 0} TOTAL ORDERS
                                    </span>
                                </div>
                                <p className="text-[9px] text-gray-400 mt-0.5">
                                    Omnichannel digital orders, fulfillment workflow stages, customer delivery tracking & payments
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="hidden sm:flex items-center gap-2 text-[9px] text-gray-500 font-mono bg-cream/20 border border-gold/15 px-2 py-1 rounded">
                                <span>Vol: <strong className="text-gray-800">{formatCurrency(stats?.onlineOrdersRevenue || 0)}</strong></span>
                                <span>•</span>
                                <span>Realized: <strong className="text-emerald-700">{formatCurrency(stats?.onlineDeliveredRevenue || 0)}</strong></span>
                            </div>
                            <button
                                onClick={() => navigate('/orders')}
                                className="flex items-center gap-1 text-[10px] font-bold text-maroon hover:text-maroon/80 border border-gold/30 hover:border-gold/60 px-2.5 py-1 rounded bg-cream/15 hover:bg-cream/30 transition-all cursor-pointer uppercase tracking-wider"
                            >
                                <span>Order Manager</span>
                                <ChevronRight className="h-3 w-3" />
                            </button>
                        </div>
                    </CardHeader>

                    <CardContent className="p-3 space-y-3">
                        {/* Fulfillment Pipeline Stage Cards - Mobile Responsive Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                            {[
                                { key: 'placed', label: 'Placed', count: stats?.onlineStatusCounts?.placed || 0, icon: Package, color: 'text-purple-700 bg-purple-50/60 border-purple-200/60' },
                                { key: 'confirmed', label: 'Confirmed', count: stats?.onlineStatusCounts?.confirmed || 0, icon: CheckCircle2, color: 'text-indigo-700 bg-indigo-50/60 border-indigo-200/60' },
                                { key: 'processing', label: 'Processing', count: stats?.onlineStatusCounts?.processing || 0, icon: Loader2, color: 'text-amber-700 bg-amber-50/60 border-amber-200/60' },
                                { key: 'packed', label: 'Packed', count: stats?.onlineStatusCounts?.packed || 0, icon: Box, color: 'text-yellow-700 bg-yellow-50/60 border-yellow-200/60' },
                                { key: 'shipped', label: 'Shipped', count: stats?.onlineStatusCounts?.shipped || 0, icon: Truck, color: 'text-blue-700 bg-blue-50/60 border-blue-200/60' },
                                { key: 'out_for_delivery', label: 'Out for Delivery', count: stats?.onlineStatusCounts?.out_for_delivery || 0, icon: Send, color: 'text-cyan-700 bg-cyan-50/60 border-cyan-200/60' },
                                { key: 'delivered', label: 'Delivered', count: stats?.onlineStatusCounts?.delivered || 0, icon: Home, color: 'text-emerald-700 bg-emerald-50/60 border-emerald-200/60' },
                                { key: 'cancelled', label: 'Cancelled / Return', count: stats?.onlineOrdersCancelled || 0, icon: Ban, color: 'text-rose-700 bg-rose-50/60 border-rose-200/60' }
                            ].map((step, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => navigate('/orders')}
                                    className={`p-2 rounded-lg border ${step.color} transition-all hover:shadow-sm cursor-pointer flex flex-col justify-between`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-[8px] font-bold uppercase tracking-wider opacity-75">{step.label}</span>
                                        <step.icon className="h-3 w-3 opacity-80" />
                                    </div>
                                    <div className="text-base font-black font-sans mt-1">
                                        {step.count}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Quick KPI summary row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-gold/10 text-xs">
                            <div className="bg-cream/10 p-2 rounded border border-gold/10 flex items-center justify-between">
                                <div>
                                    <div className="text-[8px] text-gray-500 font-semibold uppercase">Pending Dispatch</div>
                                    <div className="text-sm font-black text-amber-700 mt-0.5">{stats?.onlineOrdersPendingAction || 0} orders</div>
                                </div>
                                <span className="text-[8px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Needs Action</span>
                            </div>
                            <div className="bg-cream/10 p-2 rounded border border-gold/10 flex items-center justify-between">
                                <div>
                                    <div className="text-[8px] text-gray-500 font-semibold uppercase">In Transit</div>
                                    <div className="text-sm font-black text-blue-700 mt-0.5">{stats?.onlineOrdersInTransit || 0} packages</div>
                                </div>
                                <span className="text-[8px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">En Route</span>
                            </div>
                            <div className="bg-cream/10 p-2 rounded border border-gold/10 flex items-center justify-between">
                                <div>
                                    <div className="text-[8px] text-gray-500 font-semibold uppercase">Realized Delivered</div>
                                    <div className="text-sm font-black text-emerald-700 mt-0.5">{formatCurrency(stats?.onlineDeliveredRevenue || 0)}</div>
                                </div>
                                <span className="text-[8px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{stats?.onlineOrdersDelivered || 0} delivered</span>
                            </div>
                            <div className="bg-cream/10 p-2 rounded border border-gold/10 flex items-center justify-between">
                                <div>
                                    <div className="text-[8px] text-gray-500 font-semibold uppercase">Payment Channels</div>
                                    <div className="text-xs font-bold text-gray-800 mt-0.5 font-mono">
                                        Online: {stats?.onlinePaymentCounts?.online || 0} | COD: {stats?.onlinePaymentCounts?.cod || 0}
                                    </div>
                                </div>
                                <span className="text-[8px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                    Paid: {stats?.onlinePaymentCounts?.paid || 0}
                                </span>
                            </div>
                        </div>

                        {/* Recent Online Orders Table - Mobile responsive with horizontal scroll */}
                        <div className="pt-2 border-t border-gold/10">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-[9px] font-bold text-maroon uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock className="h-3 w-3" />
                                    <span>Recent Online Customer Orders ({stats?.recentOnlineOrders?.length || 0})</span>
                                </div>
                                <Link to="/orders" className="text-[9px] font-bold text-maroon hover:underline flex items-center gap-1 uppercase">
                                    <span>View All in Orders</span>
                                    <ArrowRight className="h-2.5 w-2.5" />
                                </Link>
                            </div>

                            <div className="overflow-x-auto rounded border border-gold/10">
                                <Table>
                                    <TableHeader className="bg-cream/10">
                                        <TableRow className="border-b border-gold/10 h-7">
                                            <TableHead className="h-7 text-[8px] font-bold text-maroon py-1">Order #</TableHead>
                                            <TableHead className="h-7 text-[8px] font-bold text-maroon py-1">Customer & Contact</TableHead>
                                            <TableHead className="h-7 text-[8px] font-bold text-maroon py-1">Destination</TableHead>
                                            <TableHead className="h-7 text-[8px] font-bold text-maroon py-1">Items Ordered</TableHead>
                                            <TableHead className="h-7 text-[8px] font-bold text-maroon py-1 text-right">Amount (₹)</TableHead>
                                            <TableHead className="h-7 text-[8px] font-bold text-maroon py-1 text-center">Fulfillment</TableHead>
                                            <TableHead className="h-7 text-[8px] font-bold text-maroon py-1 text-center">Payment</TableHead>
                                            <TableHead className="h-7 text-[8px] font-bold text-maroon py-1 text-right">Placed At</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {stats?.recentOnlineOrders && stats.recentOnlineOrders.length > 0 ? (
                                            stats.recentOnlineOrders.map((ord, index) => (
                                                <TableRow 
                                                    key={index} 
                                                    onClick={() => navigate('/orders')}
                                                    className="hover:bg-cream/5 border-b border-gold/5 h-8 cursor-pointer transition-colors"
                                                >
                                                    <TableCell className="py-1 text-xs font-mono font-bold text-maroon font-sans">
                                                        <span className="bg-cream/30 border border-gold/20 px-1.5 py-0.5 rounded text-[10px]">
                                                            {ord.orderNumber}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-1 text-xs">
                                                        <div className="font-semibold text-gray-800 leading-tight">{ord.customerName}</div>
                                                        {ord.customerPhone && (
                                                            <div className="text-[9px] text-gray-400 font-mono">{ord.customerPhone}</div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-1 text-xs text-gray-600">
                                                        <div className="flex items-center gap-1 text-[10px]">
                                                            <MapPin className="h-2.5 w-2.5 text-gray-400 flex-shrink-0" />
                                                            <span className="truncate max-w-[110px]">{ord.city || ord.state || 'Storefront'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-1 text-xs text-gray-700 max-w-[180px] truncate" title={ord.itemsSummary}>
                                                        <span className="font-semibold text-maroon/90 font-mono text-[9px] mr-1">[{ord.itemsCount}x]</span>
                                                        {ord.itemsSummary}
                                                    </TableCell>
                                                    <TableCell className="py-1 text-xs font-mono font-black text-right text-gray-800">
                                                        ₹{ord.totalAmount.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="py-1 text-center">
                                                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border inline-block ${getOrderStatusBadge(ord.orderStatus)}`}>
                                                            {ord.orderStatus.replace('_', ' ')}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-1 text-center">
                                                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border inline-block ${getPaymentStatusBadge(ord.paymentStatus)}`}>
                                                            {ord.paymentStatus} ({ord.paymentMethod})
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-1 text-[10px] text-gray-500 font-mono text-right whitespace-nowrap">
                                                        {new Date(ord.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                                                        {new Date(ord.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-16 text-center text-xs text-gray-400 italic">
                                                    No online customer orders placed yet
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Inventory Valuation & Revenue Performance Digest Section (No bulky graph!) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Inventory Valuation & Critical Stock Health */}
                <motion.div variants={itemVariants} className="lg:col-span-1">
                    <Card className="border-gold/15 bg-white shadow-sm flex flex-col h-full">
                        <CardHeader className="bg-cream/20 border-b border-gold/10 p-3 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Scale className="h-4 w-4 text-maroon" />
                                <div>
                                    <CardTitle className="text-xs font-bold text-maroon tracking-wider uppercase">Inventory Valuation</CardTitle>
                                    <p className="text-[9px] text-gray-400">Current stock asset values & potential markup</p>
                                </div>
                            </div>
                            <Link to="/inventory" className="text-[9px] font-bold text-maroon hover:underline uppercase flex items-center gap-0.5">
                                <span>Catalog</span>
                                <ChevronRight className="h-3 w-3" />
                            </Link>
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

                            {/* Out of Stock & Critical Stock Restock Preview */}
                            <div className="border-t border-gold/10 pt-2">
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="text-[8px] font-bold text-maroon/80 uppercase tracking-wider flex items-center gap-1">
                                        <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                                        <span>Critical Restock Alerts (≤ 3 units)</span>
                                    </div>
                                    {stats?.outOfStockCount && stats.outOfStockCount > 0 ? (
                                        <span className="text-[8px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded animate-pulse">
                                            {stats.outOfStockCount} OOS
                                        </span>
                                    ) : null}
                                </div>

                                {stats?.criticalLowStockItems && stats.criticalLowStockItems.length > 0 ? (
                                    <div className="space-y-1">
                                        {stats.criticalLowStockItems.slice(0, 3).map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-[10px] bg-cream/15 p-1 rounded border border-gold/10">
                                                <div className="truncate max-w-[130px]" title={item.sareeName}>
                                                    <span className="font-semibold text-gray-800">{item.sareeName}</span>
                                                    <span className="text-[8px] text-gray-400 ml-1 font-mono">({item.sku})</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className={`text-[8px] font-bold font-mono px-1 py-0.2 rounded border ${item.stock === 0 ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                                                        {item.stock} left
                                                    </span>
                                                    <span className="text-[9px] font-mono font-bold text-gray-700">
                                                        ₹{item.sellingPrice.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[9px] text-emerald-700 italic bg-emerald-50/50 p-1 rounded text-center border border-emerald-100">
                                        All inventory catalog stock levels are healthy!
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Sales & Channel Performance Digest (Replaces bulky graph with compact table!) */}
                <motion.div variants={itemVariants} className="lg:col-span-2">
                    <Card className="border-gold/15 bg-white shadow-sm flex flex-col h-full">
                        <CardHeader className="bg-cream/20 border-b border-gold/10 p-3 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-maroon" />
                                <div>
                                    <CardTitle className="text-xs font-bold text-maroon tracking-wider uppercase">
                                        Sales & Channel Performance Digest
                                    </CardTitle>
                                    <p className="text-[9px] text-gray-400">Monthly revenue history & omnichannel revenue contribution</p>
                                </div>
                            </div>
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 rounded uppercase font-mono">
                                6-Month Breakdown
                            </span>
                        </CardHeader>
                        <CardContent className="p-3 space-y-3 flex-1 flex flex-col justify-between">
                            {/* Monthly Breakdown Compact Table */}
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-cream/5">
                                        <TableRow className="border-b border-gold/10 h-7">
                                            <TableHead className="h-7 text-[8px] font-bold text-maroon py-1">Month</TableHead>
                                            <TableHead className="h-7 text-[8px] font-bold text-maroon py-1 text-right">In-Store (POS)</TableHead>
                                            <TableHead className="h-7 text-[8px] font-bold text-maroon py-1 text-right">Storefront (Online)</TableHead>
                                            <TableHead className="h-7 text-[8px] font-bold text-maroon py-1 text-right">Total Revenue</TableHead>
                                            <TableHead className="h-7 text-[8px] font-bold text-maroon py-1 text-right">Orders</TableHead>
                                            <TableHead className="h-7 text-[8px] font-bold text-maroon py-1 w-24 text-center">Volume</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {stats?.monthlySales && stats.monthlySales.length > 0 ? (
                                            stats.monthlySales.map((m, idx) => {
                                                const maxSales = Math.max(...(stats?.monthlySales?.map(x => x.sales) || [1]), 1);
                                                const pct = Math.min(100, Math.round((m.sales / maxSales) * 100));
                                                return (
                                                    <TableRow key={idx} className="h-7 border-b border-gold/5 hover:bg-cream/5">
                                                        <TableCell className="py-1 font-bold text-gray-800 text-[10px]">{m.month}</TableCell>
                                                        <TableCell className="py-1 text-right font-mono text-gray-600 text-[10px]">
                                                            {formatCurrency(m.posSales)}
                                                        </TableCell>
                                                        <TableCell className="py-1 text-right font-mono text-indigo-700 text-[10px]">
                                                            {formatCurrency(m.onlineSales)}
                                                        </TableCell>
                                                        <TableCell className="py-1 text-right font-mono font-black text-maroon text-xs">
                                                            {formatCurrency(m.sales)}
                                                        </TableCell>
                                                        <TableCell className="py-1 text-right font-mono text-gray-500 text-[10px]">
                                                            {m.totalOrders}
                                                        </TableCell>
                                                        <TableCell className="py-1">
                                                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                                <div 
                                                                    className="bg-maroon/70 h-full rounded-full transition-all duration-300"
                                                                    style={{ width: `${pct}%` }}
                                                                ></div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-16 text-center text-xs text-gray-400 italic">
                                                    No monthly revenue records available
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Revenue Realization & Liabilities Footer */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-gold/10 pt-2.5 text-xs">
                                <div className="bg-cream/10 p-2 rounded border border-gold/10">
                                    <div className="text-[8px] text-gray-400 font-semibold uppercase">In-Store POS Realized</div>
                                    <div className="text-xs font-black text-green-800 mt-0.5">
                                        {formatCurrency(stats?.posRevenue || 0)}
                                    </div>
                                    <div className="text-[8px] text-gray-400 mt-0.5">{stats?.posSalesCount || 0} completed receipts</div>
                                </div>
                                <div className="bg-cream/10 p-2 rounded border border-gold/10">
                                    <div className="text-[8px] text-gray-400 font-semibold uppercase">Online Storefront Realized</div>
                                    <div className="text-xs font-black text-indigo-800 mt-0.5">
                                        {formatCurrency(stats?.onlineDeliveredRevenue || 0)}
                                    </div>
                                    <div className="text-[8px] text-gray-400 mt-0.5">{stats?.onlineOrdersDelivered || 0} delivered packages</div>
                                </div>
                                <div className="bg-cream/10 p-2 rounded border border-gold/10">
                                    <div className="text-[8px] text-gray-400 font-semibold uppercase">Total Business Payables</div>
                                    <div className="text-xs font-black text-purple-800 mt-0.5">
                                        {formatCurrency((stats?.weaverOutstanding || 0) + (stats?.storeCreditOutstanding || 0))}
                                    </div>
                                    <div className="text-[8px] text-gray-400 mt-0.5">
                                        Weaver: {formatCurrency(stats?.weaverOutstanding || 0)} | Credit: {formatCurrency(stats?.storeCreditOutstanding || 0)}
                                    </div>
                                </div>
                            </div>
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

                            {/* Storefront & Customer Engagement Pulse */}
                            <div className="border-t border-gold/10 pt-2.5">
                                <div className="text-[8px] font-bold text-maroon/75 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <Smartphone className="h-3 w-3" />
                                        <span>Storefront Community Pulse</span>
                                    </div>
                                    <Link to="/reviews" className="text-[8px] font-bold text-maroon hover:underline flex items-center gap-0.5">
                                        <span>Reviews</span>
                                        <ChevronRight className="h-2.5 w-2.5" />
                                    </Link>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                    <div className="bg-cream/15 p-1.5 rounded border border-gold/10">
                                        <div className="text-[8px] text-gray-400 font-semibold uppercase">PWA App Installs</div>
                                        <div className="text-xs font-bold text-gray-800 mt-0.5 flex items-center gap-1">
                                            <Smartphone className="h-3 w-3 text-indigo-600" />
                                            <span>{stats?.pwaInstallsCount || 0} devices</span>
                                        </div>
                                    </div>
                                    <div className="bg-cream/15 p-1.5 rounded border border-gold/10">
                                        <div className="text-[8px] text-gray-400 font-semibold uppercase">Customer Rating</div>
                                        <div className="text-xs font-bold text-gray-800 mt-0.5 flex items-center gap-1">
                                            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                                            <span>{stats?.averageReviewRating || 5} ★ ({stats?.totalReviewsCount || 0})</span>
                                        </div>
                                    </div>
                                </div>
                                {stats?.pendingReviewsCount && stats.pendingReviewsCount > 0 ? (
                                    <div className="mt-1.5 bg-amber-50 border border-amber-200 text-amber-800 px-2 py-1 rounded text-[9px] flex items-center justify-between">
                                        <span className="font-semibold">⚠️ {stats.pendingReviewsCount} Review(s) pending approval</span>
                                        <Link to="/reviews" className="underline font-bold text-maroon">Review</Link>
                                    </div>
                                ) : null}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </motion.div>
    );
}
