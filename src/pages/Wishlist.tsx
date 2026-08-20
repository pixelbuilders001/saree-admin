import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { storefrontService, type WishlistItem } from '@/services/storefrontService';
import { ordersService, type CartItem as DbCartItem } from '@/services/ordersService';
import {
    Heart,
    Trash2,
    Loader2,
    Search,
    ShieldAlert,
    Clock,
    ShoppingBag,
    User,
    Sparkles,
    ShoppingCart,
    IndianRupee
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg 
        viewBox="0 0 24 24" 
        width="24" 
        height="24" 
        stroke="currentColor" 
        strokeWidth="0" 
        fill="currentColor" 
        {...props}
    >
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.062 5.296 5.356 0 11.866 0c3.152.001 6.118 1.23 8.351 3.463 2.233 2.233 3.461 5.199 3.46 8.351-.005 6.57-5.299 11.867-11.807 11.867-2.007-.001-3.978-.51-5.714-1.485L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.725 1.45 5.336 0 9.69-4.341 9.693-9.673.002-2.584-1.002-5.014-2.827-6.84-1.825-1.826-4.256-2.83-6.85-2.83-5.342 0-9.702 4.342-9.705 9.676-.002 1.636.435 3.232 1.267 4.678L1.93 22.148l4.717-1.994zM17.43 14.93c-.32-.16-1.89-.93-2.185-1.04-.294-.11-.51-.16-.723.16-.214.32-.828 1.04-1.014 1.255-.187.215-.373.24-.693.08-.32-.16-1.353-.5-2.577-1.6-.953-.85-1.597-1.9-1.784-2.22-.187-.32-.02-.493.14-.653.145-.145.32-.373.48-.56.16-.188.213-.32.32-.533.107-.215.053-.4-.027-.56-.08-.16-.723-1.74-.99-2.388-.262-.63-.53-.544-.728-.554l-.622-.01c-.214 0-.56.08-.853.4-.294.32-1.12 1.1-1.12 2.68 0 1.58 1.147 3.11 1.307 3.32.16.215 2.257 3.447 5.467 4.837.763.33 1.358.527 1.823.675.767.243 1.465.21 2.016.128.614-.09 1.89-.77 2.156-1.48.266-.71.266-1.32.187-1.45-.08-.13-.294-.21-.614-.37z"/>
    </svg>
);

export default function WishlistPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Search query states
    const [searchQuery, setSearchQuery] = React.useState('');
    const [cartSearchQuery, setCartSearchQuery] = React.useState('');

    // Cart expanded phone state
    const [expandedCartPhone, setExpandedCartPhone] = React.useState<string | null>(null);

    // Fetch Wishlist Items
    const { data: wishlistItems, isLoading: isWishlistLoading } = useQuery({
        queryKey: ['wishlistItems'],
        queryFn: storefrontService.getWishlistItems
    });

    // Fetch Active Cart Items
    const { data: cartItems, isLoading: isCartsLoading } = useQuery({
        queryKey: ['activeCartItems'],
        queryFn: ordersService.getActiveCartItems
    });

    // Fetch Orders for detail matching
    const { data: orders } = useQuery({
        queryKey: ['orders'],
        queryFn: ordersService.getOrders
    });

    // Mutations
    const deleteWishlistItemMutation = useMutation({
        mutationFn: storefrontService.deleteWishlistItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['wishlistItems'] });
            toast.success('Wishlist item removed successfully');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to remove wishlist item');
        }
    });

    const deleteCartItemMutation = useMutation({
        mutationFn: ordersService.deleteCartItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activeCartItems'] });
            toast.success('Item removed from cart');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to remove item');
        }
    });

    const clearCartMutation = useMutation({
        mutationFn: ordersService.clearCartForUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activeCartItems'] });
            toast.success('Cart cleared successfully');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to clear cart');
        }
    });

    const handleDeleteItem = (id: string) => {
        if (confirm('Are you sure you want to remove this item from the customer\'s wishlist?')) {
            deleteWishlistItemMutation.mutate(id);
        }
    };

    const handleConvertToOrder = (item: WishlistItem) => {
        // Pre-fill manual order state structure
        const state = {
            convertCart: {
                phone: item.customerPhone || '',
                customerName: item.customerName || '',
                email: item.customerEmail || '',
                items: [
                    {
                        productId: item.productId,
                        quantity: 1,
                        product: {
                            sareeName: item.productName || 'Unknown Saree',
                            fabric: item.productFabric || '',
                            color: item.productColor || '',
                            sellingPrice: item.productPrice || 0,
                            stock: 0
                        }
                    }
                ]
            }
        };

        toast.success(`Redirecting to manual order flow for ${item.customerName || 'Customer'}`);
        navigate('/orders', { state });
    };

    const handleConvertCartToOrder = (phone: string, items: DbCartItem[]) => {
        const order = orders?.find(o => o.customerPhone === phone);
        const name = order ? order.customerName : '';
        const email = order ? order.customerEmail : '';
        const address = order ? order.shippingAddress : null;

        const state = {
            convertCart: {
                phone,
                customerName: name || items.find(item => item.customerName)?.customerName || 'Guest Customer',
                email: email || '',
                address: address || undefined,
                items: items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    product: {
                        sareeName: item.product?.sareeName || 'Unknown Product',
                        fabric: item.product?.fabric || '',
                        color: item.product?.color || '',
                        sellingPrice: item.product?.sellingPrice || 0,
                        stock: item.product?.stock || 0
                    }
                }))
            }
        };

        toast.success(`Redirecting to manual order flow for ${phone}`);
        navigate('/orders', { state });
    };

    const handleWhatsAppWishlist = (item: WishlistItem) => {
        if (!item.customerPhone) {
            toast.error("No phone number available for this customer");
            return;
        }
        
        let phone = item.customerPhone.replace(/\D/g, '');
        if (phone.length === 10) {
            phone = '91' + phone;
        }

        const customerName = item.customerName || 'Customer';
        const productName = item.productName || 'Saree';
        
        const text = `Hello ${customerName},

We noticed you added the beautiful "${productName}" to your wishlist at Shree Banarasi Sarees! 🌸

If you need any help completing your purchase, choosing the right border, or setting up a custom blouse piece, please let us know. We'd be happy to create a manual order for you.

Best regards,
Shree Banarasi Sarees Team`;

        const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const handleWhatsAppCart = (group: { phone: string; customerName: string; items: DbCartItem[]; totalValue: number }) => {
        if (!group.phone) {
            toast.error("No phone number available for this customer");
            return;
        }

        let phone = group.phone.replace(/\D/g, '');
        if (phone.length === 10) {
            phone = '91' + phone;
        }

        const customerName = group.customerName || 'Customer';
        const itemsList = group.items.map(item => `- ${item.product?.sareeName || 'Saree'} (Qty: ${item.quantity})`).join('\n');
        
        const text = `Hello ${customerName},

We noticed you have some exquisite sarees waiting in your shopping cart at Shree Banarasi Sarees:
${itemsList}

Total Value: ₹${group.totalValue.toLocaleString()}

Would you like any assistance completing your order, or would you like us to place a manual cash-on-delivery/UPI order for you directly?

Best regards,
Shree Banarasi Sarees Team`;

        const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const handleWhatsAppCartItem = (group: { phone: string; customerName: string }, item: DbCartItem) => {
        if (!group.phone) {
            toast.error("No phone number available for this customer");
            return;
        }

        let phone = group.phone.replace(/\D/g, '');
        if (phone.length === 10) {
            phone = '91' + phone;
        }

        const customerName = group.customerName || 'Customer';
        const productName = item.product?.sareeName || 'Saree';
        
        const text = `Hello ${customerName},

We noticed you have the beautiful "${productName}" (Qty: ${item.quantity}) in your shopping cart at Shree Banarasi Sarees! 🌸

If you need any help completing your purchase or have questions about the fabric or color, please let us know. We'd be happy to create a manual order for you.

Best regards,
Shree Banarasi Sarees Team`;

        const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    // Group cart items by user_phone
    const groupedCarts = React.useMemo(() => {
        if (!cartItems) return {};
        const groups: { [key: string]: DbCartItem[] } = {};
        cartItems.forEach(item => {
            if (!groups[item.userPhone]) {
                groups[item.userPhone] = [];
            }
            groups[item.userPhone].push(item);
        });
        return groups;
    }, [cartItems]);

    // Format grouped carts for display with optional filters
    const cartGroups = React.useMemo(() => {
        return Object.entries(groupedCarts).map(([phone, items]) => {
            const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
            const totalValue = items.reduce((sum, item) => sum + (item.quantity * (item.product?.sellingPrice || 0)), 0);
            const lastUpdated = new Date(Math.max(...items.map(item => new Date(item.updatedAt).getTime()))).toISOString();
            
            // Try to find if they have placed an order before to get their name
            const order = orders?.find(o => o.customerPhone === phone);
            const firstWithName = items.find(item => item.customerName);
            const customerName = firstWithName?.customerName || (order ? order.customerName : 'Guest Customer');

            return {
                phone,
                items,
                totalQty,
                totalValue,
                lastUpdated,
                customerName
            };
        }).filter(group => {
            const term = cartSearchQuery.toLowerCase();
            return group.phone.includes(term) || group.customerName.toLowerCase().includes(term);
        });
    }, [groupedCarts, cartSearchQuery, orders]);

    // Calculate Stats
    const wishlistStats = React.useMemo(() => {
        if (!wishlistItems) return { totalItems: 0, uniqueProducts: 0, uniqueCustomers: 0 };
        
        const totalItems = wishlistItems.length;
        const uniqueProducts = new Set(wishlistItems.map(item => item.productId)).size;
        const uniqueCustomers = new Set(wishlistItems.map(item => item.userId)).size;

        return { totalItems, uniqueProducts, uniqueCustomers };
    }, [wishlistItems]);

    const cartStats = React.useMemo(() => {
        if (!cartItems) return { activeCarts: 0, totalItems: 0, estValue: 0 };
        
        const activeCarts = Object.keys(groupedCarts).length;
        const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        const estValue = cartItems.reduce((sum, item) => sum + (item.quantity * (item.product?.sellingPrice || 0)), 0);

        return { activeCarts, totalItems, estValue };
    }, [cartItems, groupedCarts]);

    // Filtered wishlist items
    const filteredWishlistItems = React.useMemo(() => {
        if (!wishlistItems) return [];
        const query = searchQuery.toLowerCase().trim();
        if (!query) return wishlistItems;

        return wishlistItems.filter(item => {
            return (
                (item.customerName && item.customerName.toLowerCase().includes(query)) ||
                (item.customerEmail && item.customerEmail.toLowerCase().includes(query)) ||
                (item.customerPhone && item.customerPhone.includes(query)) ||
                (item.productName && item.productName.toLowerCase().includes(query)) ||
                (item.productSku && item.productSku.toLowerCase().includes(query))
            );
        });
    }, [wishlistItems, searchQuery]);

    return (
        <div className="space-y-5 max-w-7xl mx-auto px-2 pb-10">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-maroon to-maroon-dark text-gold rounded-xl shadow-md shadow-maroon/20">
                    <Heart className="h-6 w-6 fill-gold/20" />
                </div>
                <div>
                    <h1 className="text-xl md:text-2xl font-bold font-serif text-maroon tracking-wide">Storefront & Engagement</h1>
                    <p className="text-xs text-gray-500 font-sans">Monitor wishlisted products, track active carts & drive conversions</p>
                </div>
            </div>

            {/* Tabs Navigation */}
            <Tabs defaultValue="wishlist" className="w-full space-y-4">
                <TabsList className="bg-white border border-gold/25 p-1 rounded-lg w-fit flex shadow-sm">
                    <TabsTrigger 
                        value="wishlist"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-maroon data-[state=active]:to-maroon-dark data-[state=active]:text-gold data-[state=active]:shadow-sm data-[state=active]:shadow-maroon/20 font-bold text-xs py-1.5 px-4 rounded-md text-gray-500 uppercase tracking-wider flex items-center gap-1.5"
                    >
                        <Heart className="h-3.5 w-3.5" />
                        Wishlists
                    </TabsTrigger>
                    <TabsTrigger 
                        value="carts"
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-maroon data-[state=active]:to-maroon-dark data-[state=active]:text-gold data-[state=active]:shadow-sm data-[state=active]:shadow-maroon/20 font-bold text-xs py-1.5 px-4 rounded-md text-gray-500 uppercase tracking-wider flex items-center gap-1.5"
                    >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Active Carts
                    </TabsTrigger>
                </TabsList>

                {/* WISHLISTS TAB */}
                <TabsContent value="wishlist" className="space-y-4 outline-none">
                    {/* Stats Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { label: 'Wishlist Items', value: wishlistStats.totalItems, icon: Heart, from: 'from-rose-400', to: 'to-rose-600', text: 'text-gray-800', sub: 'Total saved products' },
                            { label: 'Unique Products', value: wishlistStats.uniqueProducts, icon: ShoppingBag, from: 'from-slate-600', to: 'to-slate-800', text: 'text-gray-800', sub: 'Distinct sarees' },
                            { label: 'Active Customers', value: wishlistStats.uniqueCustomers, icon: User, from: 'from-amber-400', to: 'to-amber-600', text: 'text-gray-800', sub: 'Customers wishing' },
                        ].map((s, i) => (
                            <motion.div key={s.label}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.05 }}>
                                <Card className="border-gold/20 shadow-sm hover:shadow-md transition-shadow bg-white">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">{s.label}</span>
                                            <span className={cn("text-2xl font-bold font-mono", s.text)}>{s.value}</span>
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

                    {/* Search Bar */}
                    <Card className="border-gold/20 shadow-sm bg-white">
                        <CardContent className="p-3.5">
                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search wishlists by name, phone or SKU..."
                                    className="pl-9 h-10 text-sm border-gold/30 bg-white"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Wishlist Table */}
                    <Card className="border-gold/20 shadow-md bg-white overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/10 px-4 py-3">
                            <CardTitle className="text-sm font-bold text-maroon uppercase tracking-wider flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Heart className="h-4 w-4 text-maroon/70" />
                                    Wishlist Registry
                                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-mono">
                                        {filteredWishlistItems.length}
                                    </span>
                                </span>
                                <span className="text-[10px] text-gray-500 normal-case font-normal hidden md:inline">Convert favourites to orders</span>
                            </CardTitle>
                        </CardHeader>
                        {isWishlistLoading ? (
                            <div className="py-24 text-center text-maroon/50 text-xs italic">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-maroon" />
                                Loading customer wishlists...
                            </div>
                        ) : filteredWishlistItems.length === 0 ? (
                            <div className="py-16 text-center">
                                <div className="p-4 bg-gray-100 rounded-full inline-flex mb-3">
                                    <ShieldAlert className="h-6 w-6 text-gray-400" />
                                </div>
                                <p className="text-sm text-gray-500">No wishlist records found</p>
                                <p className="text-xs text-gray-400 mt-1">Try adjusting your search</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-cream/10">
                                        <TableRow className="border-b border-gold/10 hover:bg-transparent">
                                            <TableHead className="h-10 text-[10px] font-bold text-maroon py-1 px-3 uppercase tracking-wider">Customer</TableHead>
                                            <TableHead className="h-10 text-[10px] font-bold text-maroon py-1 uppercase tracking-wider">Wishlisted Saree</TableHead>
                                            <TableHead className="h-10 text-[10px] font-bold text-maroon py-1 uppercase tracking-wider">Details</TableHead>
                                            <TableHead className="h-10 text-[10px] font-bold text-maroon py-1 text-right uppercase tracking-wider">Price</TableHead>
                                            <TableHead className="h-10 text-[10px] font-bold text-maroon py-1 uppercase tracking-wider">Wishlist Date</TableHead>
                                            <TableHead className="w-[180px] text-right h-10 text-[10px] font-bold text-maroon py-1 px-3 uppercase tracking-wider">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredWishlistItems.map((item) => (
                                            <TableRow key={item.id} className="border-b border-gold/5 hover:bg-cream/10 transition-colors">
                                                {/* Customer */}
                                                <TableCell className="py-2 px-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-maroon to-maroon-dark text-gold flex items-center justify-center text-[10px] font-bold font-sans shadow-sm">
                                                            {item.customerName?.charAt(0).toUpperCase() || '?'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-semibold text-xs text-gray-800 truncate">{item.customerName}</div>
                                                            {item.customerEmail && <div className="text-[10px] text-gray-500 truncate">{item.customerEmail}</div>}
                                                            {item.customerPhone && <div className="text-[9px] text-gray-400 font-mono">{item.customerPhone}</div>}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Product */}
                                                <TableCell className="py-2">
                                                    <div className="font-semibold text-xs text-gray-800">{item.productName}</div>
                                                    <div className="text-[9px] text-gray-400 font-mono uppercase">SKU: {item.productSku || 'N/A'}</div>
                                                </TableCell>

                                                {/* Details */}
                                                <TableCell className="py-2">
                                                    <div className="flex gap-1.5 flex-wrap text-[10px] text-gray-600 font-medium">
                                                        {item.productFabric && (
                                                            <span className="bg-gold/10 px-1.5 py-0.5 rounded border border-gold/20">Fabric: {item.productFabric}</span>
                                                        )}
                                                        {item.productColor && (
                                                            <span className="bg-gold/10 px-1.5 py-0.5 rounded border border-gold/20">Color: {item.productColor}</span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Price */}
                                                <TableCell className="py-2 font-mono text-xs font-bold text-maroon text-right">
                                                    ₹{(item.productPrice || 0).toLocaleString()}
                                                </TableCell>

                                                {/* Date */}
                                                <TableCell className="py-2 text-[11px] text-gray-500 font-mono">
                                                    {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell className="py-2 text-right px-3">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleConvertToOrder(item)}
                                                            className="bg-gradient-to-r from-maroon to-maroon-dark hover:from-maroon-dark hover:to-maroon-dark text-gold h-7 text-[10px] font-bold shadow-sm uppercase tracking-wider gap-1"
                                                        >
                                                            <Sparkles className="h-3 w-3" />
                                                            Convert to Order
                                                        </Button>

                                                        {item.customerPhone && (
                                                            <Button
                                                                size="icon"
                                                                variant="outline"
                                                                onClick={() => handleWhatsAppWishlist(item)}
                                                                className="h-7 w-7 border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                                                                title="Contact on WhatsApp"
                                                            >
                                                                <WhatsAppIcon className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}

                                                        <Button
                                                            size="icon"
                                                            variant="outline"
                                                            onClick={() => handleDeleteItem(item.id)}
                                                            disabled={deleteWishlistItemMutation.isPending}
                                                            className="h-7 w-7 border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                                            title="Remove Item"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </Card>
                </TabsContent>

                {/* ACTIVE CARTS TAB */}
                <TabsContent value="carts" className="space-y-4 outline-none">
                    {/* Stats Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { label: 'Active Carts', value: cartStats.activeCarts, icon: ShoppingCart, from: 'from-maroon', to: 'to-maroon-dark', text: 'text-gray-800', sub: 'Open shopping carts' },
                            { label: 'Items in Carts', value: cartStats.totalItems, icon: ShoppingBag, from: 'from-slate-600', to: 'to-slate-800', text: 'text-gray-800', sub: 'Total units held' },
                            { label: 'Est. Cart Value', value: `₹${cartStats.estValue.toLocaleString()}`, icon: IndianRupee, from: 'from-emerald-500', to: 'to-emerald-700', text: 'text-maroon', sub: 'Projected revenue' },
                        ].map((s, i) => (
                            <motion.div key={s.label}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.05 }}>
                                <Card className="border-gold/20 shadow-sm hover:shadow-md transition-shadow bg-white">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">{s.label}</span>
                                            <span className={cn("text-2xl font-bold font-mono", s.text)}>{s.value}</span>
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

                    {/* Search Bar */}
                    <Card className="border-gold/20 shadow-sm bg-white">
                        <CardContent className="p-3.5">
                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search carts by customer name or phone..."
                                    className="pl-9 h-10 text-sm border-gold/30 bg-white"
                                    value={cartSearchQuery}
                                    onChange={e => setCartSearchQuery(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Carts Content */}
                    {isCartsLoading ? (
                        <div className="py-24 text-center text-maroon/50 text-xs italic">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-maroon" />
                            Loading active shopper carts...
                        </div>
                    ) : cartGroups.length === 0 ? (
                        <Card className="border-gold/20 shadow-sm bg-white">
                            <CardContent className="py-16 text-center">
                                <div className="p-4 bg-gray-100 rounded-full inline-flex mb-3">
                                    <ShieldAlert className="h-6 w-6 text-gray-400" />
                                </div>
                                <p className="text-sm text-gray-500">No active carts found</p>
                                <p className="text-xs text-gray-400 mt-1">Try adjusting your search</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {cartGroups.map((group) => (
                                <motion.div
                                    key={group.phone}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="border border-gold/20 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="p-3.5 bg-gradient-to-r from-cream/40 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gold/10">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm font-mono text-maroon">{group.phone}</span>
                                                <span className="text-[10px] bg-maroon/5 text-maroon px-2 py-0.5 rounded-full border border-maroon/15 font-semibold">
                                                    {group.customerName}
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-gray-500 font-mono flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                Last Active: {new Date(group.lastUpdated).toLocaleString()}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-5 text-xs">
                                            <div className="text-right">
                                                <span className="text-gray-500 block text-[9px] uppercase font-bold">Items Count</span>
                                                <span className="font-bold font-mono text-gray-700">{group.totalQty}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-gray-500 block text-[9px] uppercase font-bold">Est. Value</span>
                                                <span className="font-bold font-mono text-maroon">₹{group.totalValue.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => setExpandedCartPhone(expandedCartPhone === group.phone ? null : group.phone)}
                                                className="h-7 text-[10px] border-gold/30 hover:bg-cream/10 text-maroon font-bold"
                                            >
                                                {expandedCartPhone === group.phone ? 'Hide Items' : 'View Items'}
                                            </Button>
                                            
                                            <Button size="sm" onClick={() => handleConvertCartToOrder(group.phone, group.items)} className="h-7 text-[10px] bg-gradient-to-r from-maroon to-maroon-dark hover:from-maroon-dark hover:to-maroon-dark text-gold font-bold shadow-sm uppercase tracking-wider gap-1"><Sparkles className="h-3 w-3" />Convert to Order</Button>

                                             <Button size="icon" variant="outline" onClick={() => handleWhatsAppCart(group)} className="h-7 w-7 border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700 hover:border-green-300" title="Contact on WhatsApp"><WhatsAppIcon className="h-3.5 w-3.5" /></Button>

                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                disabled={clearCartMutation.isPending}
                                                onClick={() => {
                                                    if(confirm('Are you sure you want to clear this customer\'s cart?')) {
                                                        clearCartMutation.mutate(group.phone);
                                                    }
                                                }}
                                                className="h-7 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50"
                                            >
                                                Clear
                                            </Button>
                                        </div>
                                    </div>

                                    {expandedCartPhone === group.phone && (
                                        <div className="p-3 border-t border-gold/10 bg-white">
                                            <Table>
                                                <TableHeader className="bg-cream/10">
                                                    <TableRow className="border-b border-gold/10 hover:bg-transparent">
                                                        <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 uppercase tracking-wider">Product</TableHead>
                                                        <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 text-center uppercase tracking-wider">Qty</TableHead>
                                                        <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 text-right uppercase tracking-wider">Price</TableHead>
                                                        <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 text-right uppercase tracking-wider">Total</TableHead>
                                                        <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 text-center w-16 uppercase tracking-wider"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {group.items.map((item) => (
                                                        <TableRow key={item.id} className="border-b border-gold/5 hover:bg-cream/10 transition-colors">
                                                            <TableCell className="py-2 text-xs">
                                                                <div className="font-semibold text-gray-800">{item.product?.sareeName || 'Unknown Product'}</div>
                                                                <div className="flex gap-2 text-[9px] text-gray-400 font-mono mt-0.5">
                                                                    {item.product?.sku && <span>SKU: {item.product.sku}</span>}
                                                                    {item.product?.fabric && <span>Fabric: {item.product.fabric}</span>}
                                                                    {item.product?.color && <span>Color: {item.product.color}</span>}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="py-2 text-xs text-center">
                                                                <span className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-bold font-mono">
                                                                    {item.quantity}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="py-2 text-xs text-right font-mono">₹{(item.product?.sellingPrice || 0).toLocaleString()}</TableCell>
                                                            <TableCell className="py-2 text-xs text-right font-mono font-bold text-maroon">₹{(item.quantity * (item.product?.sellingPrice || 0)).toLocaleString()}</TableCell>
                                                            <TableCell className="py-2 text-center">
                                                                 <div className="flex items-center justify-center gap-1.5">
                                                                     <button
                                                                         type="button"
                                                                         onClick={() => handleWhatsAppCartItem(group, item)}
                                                                         className="text-green-600 hover:text-green-700 transition-colors"
                                                                         title="Contact on WhatsApp"
                                                                     >
                                                                         <WhatsAppIcon className="h-3.5 w-3.5" />
                                                                     </button>
                                                                     <button 
                                                                         type="button" 
                                                                         disabled={deleteCartItemMutation.isPending}
                                                                         onClick={() => deleteCartItemMutation.mutate(item.id)}
                                                                         className="text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
                                                                     >
                                                                         <Trash2 className="h-3.5 w-3.5" />
                                                                     </button>
                                                                 </div>
                                                             </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}