import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { storefrontService } from '@/services/storefrontService';
import { ordersService } from '@/services/ordersService';
import { dashboardService } from '@/services/dashboardService';
import { motion } from 'framer-motion';
import {
    Heart,
    ShoppingCart,
    BarChart3,
    Clock,
    ShoppingBag,
    Users,
    TrendingUp,
    Loader2,
    RefreshCw,
    Activity,
    Layers3,
    IndianRupee
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    BarChart,
    Bar,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { toast } from 'sonner';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.805 1.452 5.518 0 10.006-4.486 10.01-10.007.002-2.675-1.039-5.19-2.93-7.085C16.634 1.62 14.124.577 11.464.577c-5.524 0-10.01 4.487-10.014 10.01-.002 1.902.484 3.766 1.406 5.372l-.993 3.626 3.734-.977zm13.136-9.176c-.303-.15-.179-.226-.807-.932-.628-.707-1.485-1.747-1.485-1.747-.151-.15-.354-.226-.556-.151-.202.076-.808.529-.808.529s-.404.226-.606.076c-.202-.15-.858-.679-1.565-1.357-.556-.453-1.06-.98-1.515-1.51l-.252-.226c-.303-.302-.303-.302-.556-.076-.253.226-.808.93-.808.93s-.101.152-.253.227c-.151.075-.404.075-.606-.076-.202-.15-.858-.679-1.565-1.357-.556-.453-1.06-.98-1.515-1.51-.303-.302-.455-.604-.202-.906.253-.302.808-.93.808-.93s.101-.151.101-.352c0-.202-.202-.529-.404-.981-.202-.453-.808-1.747-.959-2.073-.151-.302-.353-.377-.556-.377h-.454c-.202 0-.505.075-.758.352-.252.277-1.01 1.006-1.01 2.44 0 1.434 1.01 2.817 1.161 3.018.152.202 1.97 3.093 4.848 4.316.685.293 1.22.468 1.637.6.689.219 1.316.188 1.812.114.553-.083 1.697-.694 1.937-1.365.24-.67.24-1.246.168-1.365-.072-.119-.265-.188-.567-.339z"/>
    </svg>
);

export default function StorefrontReportsPage() {
    const { data: stats, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
        queryKey: ['dashboardStats'],
        queryFn: dashboardService.getStats
    });

    const { data: wishlistItems, isLoading: isWishlistLoading, refetch: refetchWishlists } = useQuery({
        queryKey: ['wishlistItems'],
        queryFn: storefrontService.getWishlistItems
    });

    const { data: cartItems, isLoading: isCartsLoading, refetch: refetchCarts } = useQuery({
        queryKey: ['activeCartItems'],
        queryFn: ordersService.getActiveCartItems
    });

    const { data: orders, isLoading: isOrdersLoading, refetch: refetchOrders } = useQuery({
        queryKey: ['orders'],
        queryFn: ordersService.getOrders
    });

    const isLoading = isStatsLoading || isWishlistLoading || isCartsLoading || isOrdersLoading;

    const handleSync = async () => {
        await Promise.all([refetchStats(), refetchWishlists(), refetchCarts(), refetchOrders()]);
        toast.success("Online activity reports synchronized");
    };

    const formatCurrency = (val: number) => `₹${(val || 0).toLocaleString('en-IN')}`;

    // Group cart items by userPhone
    const groupedCarts = React.useMemo(() => {
        if (!cartItems) return {};
        const groups: { [key: string]: typeof cartItems } = {};
        cartItems.forEach(item => {
            if (!groups[item.userPhone]) {
                groups[item.userPhone] = [];
            }
            groups[item.userPhone].push(item);
        });
        return groups;
    }, [cartItems]);

    // PIPELINE CALCULATIONS
    const reportData = React.useMemo(() => {
        const wishlistCount = wishlistItems?.length || 0;
        const wishlistValue = wishlistItems?.reduce((sum, item) => sum + (item.productPrice || 0), 0) || 0;

        const cartCount = Object.keys(groupedCarts).length;
        const cartTotalValue = cartItems?.reduce((sum, item) => sum + (item.quantity * (item.product?.sellingPrice || 0)), 0) || 0;
        const cartTotalQty = cartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

        const onlineOrders = orders || [];
        const completedOrders = onlineOrders.filter(o => o.orderStatus === 'delivered');
        const completedOnlineCount = completedOrders.length;
        const totalOnlineRevenue = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0) || 0;

        const recoveredCartsCount = onlineOrders.filter(o => o.notes?.toLowerCase().includes('manual order conversion') || o.notes?.toLowerCase().includes('converted')).length;
        const recoveryRate = cartCount + completedOnlineCount > 0 
            ? Math.round((completedOnlineCount / (completedOnlineCount + cartCount)) * 100) 
            : 0;

        const totalPipeline = wishlistValue + cartTotalValue + totalOnlineRevenue;

        return {
            wishlistCount,
            wishlistValue,
            cartCount,
            cartTotalValue,
            cartTotalQty,
            completedOnlineCount,
            totalOnlineRevenue,
            recoveryRate,
            recoveredCartsCount,
            totalPipeline
        };
    }, [wishlistItems, cartItems, groupedCarts, orders]);

    // POPULAR PRODUCTS GROUPING
    const popularProducts = React.useMemo(() => {
        const dict: { [key: string]: { id: string; name: string; sku: string; fabric: string; price: number; wishlistCount: number; cartQty: number; totalPotentialValue: number } } = {};
        
        wishlistItems?.forEach(item => {
            const id = item.productId;
            if (!dict[id]) {
                dict[id] = {
                    id,
                    name: item.productName || 'Saree',
                    sku: item.productSku || 'N/A',
                    fabric: 'Silk Blend',
                    price: item.productPrice || 0,
                    wishlistCount: 0,
                    cartQty: 0,
                    totalPotentialValue: 0
                };
            }
            dict[id].wishlistCount += 1;
            dict[id].totalPotentialValue += item.productPrice || 0;
        });

        cartItems?.forEach(item => {
            const id = item.productId;
            if (!dict[id]) {
                dict[id] = {
                    id,
                    name: item.product?.sareeName || 'Saree',
                    sku: item.product?.sku || 'N/A',
                    fabric: item.product?.fabric || 'N/A',
                    price: item.product?.sellingPrice || 0,
                    wishlistCount: 0,
                    cartQty: 0,
                    totalPotentialValue: 0
                };
            }
            dict[id].cartQty += item.quantity;
            dict[id].totalPotentialValue += item.quantity * (item.product?.sellingPrice || 0);
        });

        return Object.values(dict)
            .sort((a, b) => b.totalPotentialValue - a.totalPotentialValue)
            .slice(0, 5);
    }, [wishlistItems, cartItems]);

    // ENGAGEMENT LEADERBOARD
    const leaderboard = React.useMemo(() => {
        const dict: { [key: string]: { phone: string; name: string; email: string; wishlistCount: number; cartCount: number; cartValue: number; totalEngagementScore: number } } = {};
        
        wishlistItems?.forEach(item => {
            const key = item.customerPhone || item.customerEmail || item.userId;
            if (!key) return;
            if (!dict[key]) {
                dict[key] = {
                    phone: item.customerPhone || 'N/A',
                    name: item.customerName || 'Guest Customer',
                    email: item.customerEmail || '',
                    wishlistCount: 0,
                    cartCount: 0,
                    cartValue: 0,
                    totalEngagementScore: 0
                };
            }
            dict[key].wishlistCount += 1;
            dict[key].totalEngagementScore += 5;
        });

        Object.entries(groupedCarts).forEach(([phone, items]) => {
            if (!phone) return;
            const order = orders?.find(o => o.customerPhone === phone);
            const firstWithName = items.find(item => item.customerName);
            const name = firstWithName?.customerName || (order ? order.customerName : 'Guest Customer');
            const email = order ? order.customerEmail || '' : '';

            if (!dict[phone]) {
                dict[phone] = {
                    phone,
                    name,
                    email,
                    wishlistCount: 0,
                    cartCount: 0,
                    cartValue: 0,
                    totalEngagementScore: 0
                };
            }
            const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
            const totalVal = items.reduce((sum, item) => sum + (item.quantity * (item.product?.sellingPrice || 0)), 0);

            dict[phone].cartCount += totalQty;
            dict[phone].cartValue += totalVal;
            dict[phone].totalEngagementScore += totalQty * 10;
        });

        return Object.values(dict)
            .sort((a, b) => b.totalEngagementScore - a.totalEngagementScore)
            .slice(0, 5);
    }, [wishlistItems, groupedCarts, orders]);

    // RECENT ONLINE ACTIVITY LOGS
    const recentActivity = React.useMemo(() => {
        const log: Array<{ id: string; customerName: string; customerPhone: string; type: 'wishlist' | 'cart'; actionText: string; productName: string; timestamp: string }> = [];

        wishlistItems?.forEach(item => {
            log.push({
                id: `wishlist-${item.id}`,
                customerName: item.customerName || 'Guest',
                customerPhone: item.customerPhone || '',
                type: 'wishlist',
                actionText: 'added product to wishlist',
                productName: item.productName || 'Saree',
                timestamp: item.createdAt
            });
        });

        cartItems?.forEach(item => {
            log.push({
                id: `cart-${item.id}`,
                customerName: item.customerName || 'Guest',
                customerPhone: item.userPhone || '',
                type: 'cart',
                actionText: `added ${item.quantity} item(s) to shopping cart`,
                productName: item.product?.sareeName || 'Saree',
                timestamp: item.updatedAt
            });
        });

        return log
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 10);
    }, [wishlistItems, cartItems]);

    // WhatsApp outreach for leaderboard
    const handleWhatsAppLead = (lead: any) => {
        if (!lead.phone || lead.phone === 'N/A') {
            toast.error("No phone number available for outreach");
            return;
        }

        let phone = lead.phone.replace(/\D/g, '');
        if (phone.length === 10) {
            phone = '91' + phone;
        }

        const customerName = lead.name || 'Customer';
        const text = `Hello ${customerName},

We noticed you have some items wishlisted and saved in your shopping cart at Shree Banarasi Sarees! 🌸

We'd love to help you purchase these items or offer a custom coupon code or help with blouspieces/custom options.

Let us know if you need assistance!

Best regards,
Shree Banarasi Sarees Team`;

        const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    // Chart Conversion Data
    const funnelChartData = [
        { name: 'Wishlist items', value: reportData.wishlistCount, fill: '#800000' },
        { name: 'Carts waiting', value: reportData.cartCount, fill: '#d4af37' },
        { name: 'Online sales', value: reportData.completedOnlineCount, fill: '#15803d' }
    ];

    if (isLoading) {
        return (
            <div className="h-[80vh] flex items-center justify-center">
                <div className="text-center space-y-3">
                    <Loader2 className="h-10 w-10 animate-spin text-maroon mx-auto" />
                    <p className="text-xs font-serif text-maroon tracking-wider animate-pulse">GENERATING ONLINE ACTIVITY REPORTS...</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div 
            className="space-y-5 max-w-7xl mx-auto px-2 pb-10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-maroon to-maroon-dark text-gold rounded-xl shadow-md shadow-maroon/20">
                        <BarChart3 className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold font-serif text-maroon tracking-wide">Online Business Reports</h1>
                        <p className="text-xs text-gray-500 font-sans">Analytical insights into wishlists, cart pipelines & digital order conversions</p>
                    </div>
                </div>

                <Button
                    onClick={handleSync}
                    className="bg-gradient-to-r from-maroon to-maroon-dark hover:from-maroon-dark hover:to-maroon-dark text-gold h-9 text-xs font-bold shadow-md shadow-maroon/20 gap-1.5 hover:shadow-lg hover:shadow-maroon/30 transition-all"
                >
                    <RefreshCw className="h-4 w-4" />
                    Sync Reports
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Wishlist Interest', value: `${reportData.wishlistCount} saved`, sub: formatCurrency(reportData.wishlistValue), icon: Heart, from: 'from-rose-400', to: 'to-rose-600', text: 'text-gray-800' },
                    { label: 'Active Shopping Carts', value: `${reportData.cartCount} active`, sub: formatCurrency(reportData.cartTotalValue), icon: ShoppingCart, from: 'from-amber-400', to: 'to-amber-600', text: 'text-gray-800' },
                    { label: 'Completed Online Sales', value: `${reportData.completedOnlineCount} sales`, sub: formatCurrency(reportData.totalOnlineRevenue), icon: ShoppingBag, from: 'from-emerald-500', to: 'to-emerald-700', text: 'text-gray-800' },
                    { label: 'Total Storefront Pipeline', value: formatCurrency(reportData.totalPipeline), sub: `${reportData.recoveryRate}% conversion`, icon: Activity, from: 'from-indigo-500', to: 'to-indigo-700', text: 'text-maroon' },
                ].map((s, i) => (
                    <motion.div key={s.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}>
                        <Card className="border-gold/20 shadow-sm hover:shadow-md transition-shadow bg-white">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">{s.label}</span>
                                    <span className={cn("text-lg font-bold font-mono leading-tight block", s.text)}>{s.value}</span>
                                    <span className="text-[10px] text-gray-400 block">{s.sub}</span>
                                </div>
                                <div className={cn("p-2.5 bg-gradient-to-br text-white rounded-xl shadow", s.from, s.to)}>
                                    <s.icon className="h-5 w-5" />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Funnel Graph & Popular Items split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Funnel Visualization */}
                <Card className="border-gold/20 shadow-md bg-white lg:col-span-1 h-[260px] flex flex-col overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/10 p-3 flex justify-between items-center flex-row">
                        <div>
                            <CardTitle className="text-sm font-bold text-maroon tracking-wider uppercase">Conversion Funnel</CardTitle>
                            <p className="text-[10px] text-gray-400">Active counts by lifecycle stage</p>
                        </div>
                        <div className="p-2 bg-gradient-to-br from-maroon to-maroon-dark rounded-lg text-gold shadow">
                            <TrendingUp className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-2 flex-1 relative overflow-hidden">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={funnelChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                                <Tooltip contentStyle={{ fontSize: '10px' }} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={30}>
                                    {funnelChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Popular Wishlisted/Cart Items */}
                <Card className="border-gold/20 shadow-md bg-white lg:col-span-2 h-[260px] flex flex-col overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/10 p-3 flex justify-between items-center flex-row">
                        <div>
                            <CardTitle className="text-sm font-bold text-maroon tracking-wider uppercase">High-Intent Popular Products</CardTitle>
                            <p className="text-[10px] text-gray-400">Most wishlisted or left in carts</p>
                        </div>
                        <div className="p-2 bg-gradient-to-br from-maroon to-maroon-dark rounded-lg text-gold shadow">
                            <Layers3 className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto">
                        <Table>
                            <TableHeader className="bg-cream/10">
                                <TableRow className="border-b border-gold/10 hover:bg-transparent">
                                    <TableHead className="py-1 h-8 text-[10px] font-bold text-maroon uppercase px-3">Product name</TableHead>
                                    <TableHead className="py-1 h-8 text-[10px] font-bold text-maroon uppercase text-center">Wishlists</TableHead>
                                    <TableHead className="py-1 h-8 text-[10px] font-bold text-maroon uppercase text-center">Cart Qty</TableHead>
                                    <TableHead className="py-1 h-8 text-[10px] font-bold text-maroon uppercase text-right">Selling Price</TableHead>
                                    <TableHead className="py-1 h-8 text-[10px] font-bold text-maroon uppercase text-right px-3">Potential Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {popularProducts.length > 0 ? (
                                    popularProducts.map((prod) => (
                                        <TableRow key={prod.id} className="border-b border-gold/5 hover:bg-cream/10 h-8 transition-colors">
                                            <TableCell className="py-2 text-xs font-bold text-gray-800 px-3">
                                                <div className="truncate max-w-[180px]">{prod.name}</div>
                                                <div className="text-[9px] text-gray-400 font-mono">SKU: {prod.sku} | {prod.fabric}</div>
                                            </TableCell>
                                            <TableCell className="py-2 text-xs text-center">
                                                <span className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md bg-rose-50 text-rose-600 text-[10px] font-bold font-mono border border-rose-100">
                                                    {prod.wishlistCount}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-2 text-xs text-center">
                                                <span className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md bg-amber-50 text-amber-600 text-[10px] font-bold font-mono border border-amber-100">
                                                    {prod.cartQty}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-2 text-xs text-right font-mono">{formatCurrency(prod.price)}</TableCell>
                                            <TableCell className="py-2 text-xs text-right font-mono font-bold text-maroon px-3">{formatCurrency(prod.totalPotentialValue)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-28 text-center text-xs text-gray-400 italic">No storefront interest recorded</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Engagement Leaderboard & Real-time activity log split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Engagement Leaderboard */}
                <Card className="border-gold/20 shadow-md bg-white min-h-[280px] flex flex-col overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/10 p-3 flex justify-between items-center flex-row">
                        <div>
                            <CardTitle className="text-sm font-bold text-maroon tracking-wider uppercase">Shopper Engagement Leaderboard</CardTitle>
                            <p className="text-[10px] text-gray-400">High-intent shoppers by wishlist & cart activity</p>
                        </div>
                        <div className="p-2 bg-gradient-to-br from-maroon to-maroon-dark rounded-lg text-gold shadow">
                            <Users className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto">
                        <Table>
                            <TableHeader className="bg-cream/10">
                                <TableRow className="border-b border-gold/10 hover:bg-transparent">
                                    <TableHead className="py-1 h-8 text-[10px] font-bold text-maroon uppercase px-3">Customer</TableHead>
                                    <TableHead className="py-1 h-8 text-[10px] font-bold text-maroon uppercase text-center">Wishlisted</TableHead>
                                    <TableHead className="py-1 h-8 text-[10px] font-bold text-maroon uppercase text-center">Cart Items</TableHead>
                                    <TableHead className="py-1 h-8 text-[10px] font-bold text-maroon uppercase text-right">Cart Total</TableHead>
                                    <TableHead className="py-1 h-8 text-[10px] font-bold text-maroon uppercase text-center w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leaderboard.length > 0 ? (
                                    leaderboard.map((lead, index) => (
                                        <TableRow key={index} className="border-b border-gold/5 hover:bg-cream/10 h-10 transition-colors">
                                            <TableCell className="py-2 text-xs px-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-maroon to-maroon-dark text-gold flex items-center justify-center text-[10px] font-bold font-sans shadow-sm">
                                                        {lead.name?.charAt(0).toUpperCase() || '?'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-gray-800 truncate">{lead.name}</div>
                                                        <div className="text-[9px] text-gray-400 font-mono">{lead.phone}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2 text-xs text-center">
                                                <span className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md bg-rose-50 text-rose-600 text-[10px] font-bold font-mono border border-rose-100">
                                                    {lead.wishlistCount}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-2 text-xs text-center">
                                                <span className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md bg-amber-50 text-amber-600 text-[10px] font-bold font-mono border border-amber-100">
                                                    {lead.cartCount}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-2 text-xs text-right font-mono font-bold text-gray-800">
                                                <span className="inline-flex items-center gap-0.5 text-maroon">
                                                    <IndianRupee className="h-3 w-3" />
                                                    {lead.cartValue.toLocaleString('en-IN')}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-2 text-center">
                                                <button
                                                    onClick={() => handleWhatsAppLead(lead)}
                                                    className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Reach out on WhatsApp"
                                                >
                                                    <WhatsAppIcon className="h-3.5 w-3.5" />
                                                </button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-28 text-center text-xs text-gray-400 italic">No customers found</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Timeline Log */}
                <Card className="border-gold/20 shadow-md bg-white min-h-[280px] flex flex-col overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/10 p-3 flex justify-between items-center flex-row">
                        <div>
                            <CardTitle className="text-sm font-bold text-maroon tracking-wider uppercase">Live Activity Feed</CardTitle>
                            <p className="text-[10px] text-gray-400">Wishlist & cart additions in real time</p>
                        </div>
                        <div className="p-2 bg-gradient-to-br from-maroon to-maroon-dark rounded-lg text-gold shadow">
                            <Clock className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-3.5 flex-1 overflow-y-auto space-y-3">
                        {recentActivity.length > 0 ? (
                            recentActivity.map((log) => {
                                const isWish = log.type === 'wishlist';
                                return (
                                    <div key={log.id} className="flex gap-2.5 text-xs border-b border-gold/10 pb-2.5 last:border-0 last:pb-0">
                                        <span className={cn("h-2 w-2 rounded-full mt-1.5 flex-shrink-0", isWish ? "bg-rose-500 animate-pulse" : "bg-amber-500")} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-gray-700">
                                                <span className="font-bold text-gray-800">{log.customerName}</span>
                                                <span className="text-gray-400 font-mono text-[10px] ml-1">({log.customerPhone || 'Guest'})</span>{' '}
                                                <span className="text-gray-500">{log.actionText}</span>:{' '}
                                                <span className="font-semibold text-maroon">"{log.productName}"</span>
                                            </p>
                                            <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                                                {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">No storefront log timeline available</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </motion.div>
    );
}