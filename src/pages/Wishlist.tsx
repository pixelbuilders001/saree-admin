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
    BarChart3,
    ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
        <div className="space-y-4 max-w-7xl mx-auto px-2">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gold/10 pb-3 gap-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-maroon/10 text-maroon rounded">
                        <Heart className="h-5 w-5 text-maroon fill-maroon" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold font-serif text-maroon tracking-wider">STOREFRONT & ENGAGEMENT</h1>
                        <p className="text-xs text-gray-500 font-sans">Monitor products customer are wishlisting, check active shopping carts, and drive conversions</p>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <Tabs defaultValue="wishlist" className="w-full space-y-4">
                <TabsList className="bg-slate-100 border border-gold/10 p-1 rounded-lg w-fit flex">
                    <TabsTrigger 
                        value="wishlist"
                        className="data-[state=active]:bg-white data-[state=active]:text-maroon data-[state=active]:shadow font-bold text-xs py-1.5 px-4 rounded-md text-gray-500 uppercase tracking-wider flex items-center gap-1.5"
                    >
                        <Heart className="h-3.5 w-3.5" />
                        Wishlists
                    </TabsTrigger>
                    <TabsTrigger 
                        value="carts"
                        className="data-[state=active]:bg-white data-[state=active]:text-maroon data-[state=active]:shadow font-bold text-xs py-1.5 px-4 rounded-md text-gray-500 uppercase tracking-wider flex items-center gap-1.5"
                    >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Active Carts
                    </TabsTrigger>
                </TabsList>

                {/* WISHLISTS TAB */}
                <TabsContent value="wishlist" className="space-y-4 outline-none">
                    {/* Stats Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Card className="border-gold/10 shadow-sm bg-white">
                            <CardContent className="p-3 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Wishlist Items</span>
                                    <h2 className="text-lg font-bold text-gray-900 font-mono">{wishlistStats.totalItems}</h2>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-full">
                                    <Heart className="h-4 w-4 text-maroon fill-maroon" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-gold/10 shadow-sm bg-white">
                            <CardContent className="p-3 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Unique Products Interest</span>
                                    <h2 className="text-lg font-bold text-gray-900 font-mono">{wishlistStats.uniqueProducts}</h2>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-full">
                                    <ShoppingBag className="h-4 w-4 text-gray-400" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-gold/10 shadow-sm bg-white">
                            <CardContent className="p-3 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active Customers Wishing</span>
                                    <h2 className="text-lg font-bold text-gray-900 font-mono">{wishlistStats.uniqueCustomers}</h2>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-full">
                                    <User className="h-4 w-4 text-gray-400" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Search Bar */}
                    <Card className="border-gold/10 shadow-sm bg-slate-50/50">
                        <CardContent className="p-3">
                            <div className="relative max-w-md">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search wishlists by name, phone or SKU..."
                                    className="pl-9 h-9 text-xs border-gold/30 bg-white"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Wishlist Table */}
                    <Card className="border-gold/10 shadow-sm bg-white overflow-hidden">
                        {isWishlistLoading ? (
                            <div className="py-24 text-center text-maroon/50 text-xs italic">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-maroon" />
                                Loading customer wishlists...
                            </div>
                        ) : filteredWishlistItems.length === 0 ? (
                            <div className="py-16 text-center">
                                <ShieldAlert className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                <p className="text-xs text-gray-500 italic">No wishlist records found matching the search</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow className="border-b border-gold/10">
                                            <TableHead className="text-xs font-bold text-maroon uppercase tracking-wider">Customer</TableHead>
                                            <TableHead className="text-xs font-bold text-maroon uppercase tracking-wider">Wishlisted Saree</TableHead>
                                            <TableHead className="text-xs font-bold text-maroon uppercase tracking-wider">Details</TableHead>
                                            <TableHead className="text-xs font-bold text-maroon uppercase tracking-wider">Price</TableHead>
                                            <TableHead className="text-xs font-bold text-maroon uppercase tracking-wider">Wishlist Date</TableHead>
                                            <TableHead className="w-[180px] text-right text-xs font-bold text-maroon uppercase tracking-wider">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredWishlistItems.map((item) => (
                                            <TableRow key={item.id} className="border-b border-gold/5 hover:bg-slate-50/50">
                                                {/* Customer */}
                                                <TableCell>
                                                    <div className="font-semibold text-xs text-gray-800">
                                                        {item.customerName}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500">
                                                        {item.customerEmail}
                                                    </div>
                                                    {item.customerPhone && (
                                                        <div className="text-[9px] text-gray-400 font-mono">
                                                            {item.customerPhone}
                                                        </div>
                                                    )}
                                                </TableCell>

                                                {/* Product */}
                                                <TableCell>
                                                    <div className="font-semibold text-xs text-gray-800">
                                                        {item.productName}
                                                    </div>
                                                    <div className="text-[9px] text-gray-400 font-mono uppercase">
                                                        SKU: {item.productSku || 'N/A'}
                                                    </div>
                                                </TableCell>

                                                {/* Details */}
                                                <TableCell>
                                                    <div className="flex gap-2 text-[10px] text-gray-600 font-medium">
                                                        {item.productFabric && (
                                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                                                                Fabric: {item.productFabric}
                                                            </span>
                                                        )}
                                                        {item.productColor && (
                                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                                                                Color: {item.productColor}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Price */}
                                                <TableCell className="font-mono text-xs font-bold text-maroon">
                                                    ₹{(item.productPrice || 0).toLocaleString()}
                                                </TableCell>

                                                {/* Date */}
                                                <TableCell className="text-xs text-gray-500 font-mono">
                                                    {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </TableCell>

                                                                                                {/* Actions */}
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleConvertToOrder(item)}
                                                            className="bg-maroon hover:bg-maroon-dark text-gold h-7 text-[10px] font-bold shadow-sm uppercase tracking-wider gap-1"
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Card className="border-gold/10 shadow-sm bg-white">
                            <CardContent className="p-3 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active Shopping Carts</span>
                                    <h2 className="text-lg font-bold text-gray-900 font-mono">{cartStats.activeCarts}</h2>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-full">
                                    <ShoppingCart className="h-4 w-4 text-maroon" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-gold/10 shadow-sm bg-white">
                            <CardContent className="p-3 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Items in Carts</span>
                                    <h2 className="text-lg font-bold text-gray-900 font-mono">{cartStats.totalItems}</h2>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-full">
                                    <ShoppingBag className="h-4 w-4 text-gray-400" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-gold/10 shadow-sm bg-white">
                            <CardContent className="p-3 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Est. Carts Value</span>
                                    <h2 className="text-lg font-bold text-maroon font-mono">₹{cartStats.estValue.toLocaleString()}</h2>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-full">
                                    <span className="font-bold text-xs text-maroon font-serif">₹</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Search Bar */}
                    <Card className="border-gold/10 shadow-sm bg-slate-50/50">
                        <CardContent className="p-3">
                            <div className="relative max-w-md">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search carts by customer name or phone..."
                                    className="pl-9 h-9 text-xs border-gold/30 bg-white"
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
                        <Card className="border-gold/10 shadow-sm bg-white">
                            <div className="py-16 text-center">
                                <ShieldAlert className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                <p className="text-xs text-gray-500 italic">No active customer carts found matching the search</p>
                            </div>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {cartGroups.map((group) => (
                                <div 
                                    key={group.phone} 
                                    className="border border-gold/15 rounded-md overflow-hidden bg-white shadow-sm hover:shadow transition-shadow"
                                >
                                    <div className="p-3 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gold/5">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-xs text-maroon">{group.phone}</span>
                                                <span className="text-[10px] bg-maroon/5 text-maroon px-1.5 py-0.5 rounded border border-maroon/10 font-medium">
                                                    {group.customerName}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                Last Active: {new Date(group.lastUpdated).toLocaleString()}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs">
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
                                            
                                            <Button size="sm" onClick={() => handleConvertCartToOrder(group.phone, group.items)} className="h-7 text-[10px] bg-maroon hover:bg-maroon-dark text-gold font-bold shadow-sm uppercase tracking-wider gap-1"><Sparkles className="h-3 w-3" />Convert to Order</Button>

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
                                                <TableHeader className="bg-slate-50">
                                                    <TableRow className="border-b border-gold/5">
                                                        <TableHead className="h-6 py-0.5 text-[9px] font-bold text-gray-500">Product</TableHead>
                                                        <TableHead className="h-6 py-0.5 text-[9px] font-bold text-gray-500 text-center">Qty</TableHead>
                                                        <TableHead className="h-6 py-0.5 text-[9px] font-bold text-gray-500 text-right">Price</TableHead>
                                                        <TableHead className="h-6 py-0.5 text-[9px] font-bold text-gray-500 text-right">Total</TableHead>
                                                        <TableHead className="h-6 py-0.5 text-[9px] font-bold text-gray-500 text-center w-16"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {group.items.map((item) => (
                                                        <TableRow key={item.id} className="border-b border-gold/5 h-8">
                                                            <TableCell className="py-1 text-xs">
                                                                <div className="font-semibold text-gray-800">{item.product?.sareeName || 'Unknown Product'}</div>
                                                                <div className="flex gap-2 text-[9px] text-gray-400 font-mono">
                                                                    {item.product?.sku && <span>SKU: {item.product.sku}</span>}
                                                                    {item.product?.fabric && <span>Fabric: {item.product.fabric}</span>}
                                                                    {item.product?.color && <span>Color: {item.product.color}</span>}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="py-1 text-xs text-center">{item.quantity}</TableCell>
                                                            <TableCell className="py-1 text-xs text-right font-mono">₹{(item.product?.sellingPrice || 0).toLocaleString()}</TableCell>
                                                            <TableCell className="py-1 text-xs text-right font-mono">₹{(item.quantity * (item.product?.sellingPrice || 0)).toLocaleString()}</TableCell>
                                                            <TableCell className="py-1 text-center">
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
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
