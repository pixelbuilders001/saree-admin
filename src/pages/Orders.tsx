import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersService, type Order, type OrderItem, type CartItem } from '@/services/ordersService';
import { inventoryService, type Saree } from '@/services/inventoryService';
import {
    ShoppingBag,
    Loader2,
    Plus,
    Search,
    Filter,
    Calendar,
    MapPin,
    User,
    Phone,
    Mail,
    DollarSign,
    CheckCircle2,
    Truck,
    Clock,
    CreditCard,
    AlertTriangle,
    TrendingUp,
    FileText,
    ListFilter,
    PackageOpen,
    Trash2,
    Sparkles,
    ShoppingCart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';

export default function OrdersPage() {
    const queryClient = useQueryClient();
    
    // UI state
    const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<string>('all');
    const [paymentFilter, setPaymentFilter] = React.useState<string>('all');
    
    // Active Cart Modal State
    const [isCartModalOpen, setIsCartModalOpen] = React.useState(false);
    const [cartSearchQuery, setCartSearchQuery] = React.useState('');
    const [expandedCartPhone, setExpandedCartPhone] = React.useState<string | null>(null);
    
    // Status update notes state
    const [statusNote, setStatusNote] = React.useState('');
    const [tempOrderStatus, setTempOrderStatus] = React.useState<string>('');
    const [tempPaymentStatus, setTempPaymentStatus] = React.useState<string>('');

    // Manual Order Form State
    const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
    const [formCustomerName, setFormCustomerName] = React.useState('');
    const [formCustomerPhone, setFormCustomerPhone] = React.useState('');
    const [formCustomerEmail, setFormCustomerEmail] = React.useState('');
    const [formStreet, setFormStreet] = React.useState('');
    const [formCity, setFormCity] = React.useState('');
    const [formState, setFormState] = React.useState('');
    const [formZip, setFormZip] = React.useState('');
    const [formCountry, setFormCountry] = React.useState('India');
    const [formShippingFee, setFormShippingFee] = React.useState('0');
    const [formDiscount, setFormDiscount] = React.useState('0');
    const [formNotes, setFormNotes] = React.useState('');
    
    // Items added to the manual order
    const [selectedSareeId, setSelectedSareeId] = React.useState<string>('');
    const [selectedSareeQty, setSelectedSareeQty] = React.useState<number>(1);
    const [orderItems, setOrderItems] = React.useState<Array<{
        saree: Saree;
        quantity: number;
        price: number;
    }>>([]);

    // Fetch orders
    const { data: orders, isLoading } = useQuery({
        queryKey: ['orders'],
        queryFn: ordersService.getOrders
    });

    // Fetch sarees for manual order creation
    const { data: sarees } = useQuery({
        queryKey: ['sarees'],
        queryFn: inventoryService.getSarees
    });

    // Mutations
    const updateStatusMutation = useMutation({
        mutationFn: ({ orderId, status, note }: { orderId: string; status: string; note?: string }) => 
            ordersService.updateOrderStatus(orderId, status, note),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success('Order status updated successfully');
            setStatusNote('');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to update order status');
        }
    });

    const updatePaymentMutation = useMutation({
        mutationFn: ({ orderId, paymentStatus }: { orderId: string; paymentStatus: string }) => 
            ordersService.updatePaymentStatus(orderId, paymentStatus),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success('Payment status updated successfully');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to update payment status');
        }
    });

    const createOrderMutation = useMutation({
        mutationFn: ordersService.createOrder,
        onSuccess: (newOrder) => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success(`Order ${newOrder.orderNumber} created successfully`);
            setIsCreateModalOpen(false);
            resetForm();
            setSelectedOrderId(newOrder.id);
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to create order');
        }
    });

    // Fetch active cart items
    const { data: cartItems, isLoading: isCartsLoading } = useQuery({
        queryKey: ['activeCartItems'],
        queryFn: ordersService.getActiveCartItems,
        enabled: isCartModalOpen
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

    // Group cart items by user_phone
    const groupedCarts = React.useMemo(() => {
        if (!cartItems) return {};
        const groups: { [key: string]: CartItem[] } = {};
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
            const customerName = order ? order.customerName : 'Guest Customer';

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

    const handleConvertCartToOrder = (phone: string, items: CartItem[]) => {
        // Find matching name/address if any
        const order = orders?.find(o => o.customerPhone === phone);
        const name = order ? order.customerName : '';
        const email = order ? order.customerEmail : '';
        const address = order ? order.shippingAddress : null;

        // Fill form fields
        setFormCustomerPhone(phone);
        setFormCustomerName(name);
        setFormCustomerEmail(email || '');
        if (address) {
            setFormStreet(address.street || address.line1 || '');
            setFormCity(address.city || '');
            setFormState(address.state || '');
            setFormZip(address.zip || address.pincode || '');
            setFormCountry(address.country || 'India');
        }

        // Map items
        const mappedItems = items.map(item => {
            const inventoryProduct = sarees?.find(s => s.id === item.productId) || {
                id: item.productId,
                sareeName: item.product?.sareeName || 'Unknown Product',
                category: '',
                fabric: item.product?.fabric || '',
                color: item.product?.color || '',
                sellingPrice: item.product?.sellingPrice || 0,
                purchasePrice: 0,
                stock: item.product?.stock || 0,
                barcode: item.product?.barcode || '',
                status: 'active' as const
            };
            return {
                saree: inventoryProduct as Saree,
                quantity: item.quantity,
                price: item.product?.sellingPrice || 0
            };
        });

        setOrderItems(mappedItems);
        setIsCartModalOpen(false);
        setIsCreateModalOpen(true);
        toast.success(`Loaded ${items.length} cart items for ${phone} into manual order draft.`);
    };

    // Reset manual order form
    const resetForm = () => {
        setFormCustomerName('');
        setFormCustomerPhone('');
        setFormCustomerEmail('');
        setFormStreet('');
        setFormCity('');
        setFormState('');
        setFormZip('');
        setFormCountry('India');
        setFormShippingFee('0');
        setFormDiscount('0');
        setFormNotes('');
        setOrderItems([]);
        setSelectedSareeId('');
        setSelectedSareeQty(1);
    };

    // Calculate manual order totals
    const manualSubtotal = orderItems.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    const manualShipping = Number(formShippingFee) || 0;
    const manualDiscount = Number(formDiscount) || 0;
    const manualTotal = Math.max(0, manualSubtotal + manualShipping - manualDiscount);

    const handleAddSaree = () => {
        if (!selectedSareeId) return;
        const saree = sarees?.find(s => s.id === selectedSareeId);
        if (!saree) return;

        // Check if already exists in orderItems
        const existingIdx = orderItems.findIndex(item => item.saree.id === saree.id);
        if (existingIdx > -1) {
            const updated = [...orderItems];
            updated[existingIdx].quantity += selectedSareeQty;
            setOrderItems(updated);
        } else {
            setOrderItems([...orderItems, {
                saree,
                quantity: selectedSareeQty,
                price: saree.sellingPrice
            }]);
        }
        setSelectedSareeId('');
        setSelectedSareeQty(1);
    };

    const handleRemoveItem = (index: number) => {
        setOrderItems(orderItems.filter((_, i) => i !== index));
    };

    const handleCreateManualOrder = (e: React.FormEvent) => {
        e.preventDefault();
        if (orderItems.length === 0) {
            toast.error('Please add at least one item to the order');
            return;
        }

        createOrderMutation.mutate({
            customerName: formCustomerName,
            customerPhone: formCustomerPhone,
            customerEmail: formCustomerEmail || undefined,
            shippingAddress: {
                street: formStreet,
                city: formCity,
                state: formState,
                zip: formZip,
                country: formCountry,
            },
            subtotal: manualSubtotal,
            shippingFee: manualShipping,
            discount: manualDiscount,
            totalAmount: manualTotal,
            paymentMethod: 'cod',
            paymentStatus: 'pending',
            orderStatus: 'placed',
            notes: formNotes || undefined,
            items: orderItems.map(item => ({
                inventoryId: item.saree.id,
                productName: item.saree.sareeName,
                sku: item.saree.sku,
                barcode: item.saree.barcode,
                quantity: item.quantity,
                unitPrice: item.price,
                totalPrice: item.quantity * item.price,
                productSnapshot: {
                    fabric: item.saree.fabric,
                    color: item.saree.color,
                    sellingPrice: item.saree.sellingPrice,
                }
            }))
        });
    };

    // Generate mock order for testing
    const handleGenerateMockOrder = () => {
        if (!sarees || sarees.length === 0) {
            toast.error('No sarees in inventory to create a mock order. Please add products first.');
            return;
        }

        // Pick 1-3 random sarees
        const numItems = Math.floor(Math.random() * 3) + 1;
        const selectedItems: Array<{ saree: Saree; quantity: number }> = [];
        
        for (let i = 0; i < numItems; i++) {
            const randomSaree = sarees[Math.floor(Math.random() * sarees.length)];
            const qty = Math.floor(Math.random() * 2) + 1;
            selectedItems.push({ saree: randomSaree, quantity: qty });
        }

        // Random customer names and details
        const firstNames = ['Amit', 'Rajesh', 'Pooja', 'Sunita', 'Vikram', 'Anjali', 'Karan', 'Neha'];
        const lastNames = ['Sharma', 'Verma', 'Patel', 'Joshi', 'Singh', 'Gupta', 'Mehta', 'Reddy'];
        const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad'];
        const states = ['Maharashtra', 'Delhi', 'Karnataka', 'Telangana', 'Tamil Nadu', 'West Bengal', 'Maharashtra', 'Gujarat'];
        
        const customerName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        const phone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
        const email = `${customerName.toLowerCase().replace(' ', '.')}@example.com`;
        
        const cityIdx = Math.floor(Math.random() * cities.length);
        const street = `${Math.floor(Math.random() * 100) + 1}, VIP Lane, Sector-4`;
        const city = cities[cityIdx];
        const state = states[cityIdx];
        const zip = `${Math.floor(100000 + Math.random() * 899999)}`;

        const subtotal = selectedItems.reduce((acc, item) => acc + (item.quantity * item.saree.sellingPrice), 0);
        const shippingFee = 99.00;
        const discount = Math.random() > 0.5 ? 200.00 : 0.00;
        const totalAmount = Math.max(0, subtotal + shippingFee - discount);

        createOrderMutation.mutate({
            customerName,
            customerPhone: phone,
            customerEmail: email,
            shippingAddress: { street, city, state, zip, country: 'India' },
            subtotal,
            shippingFee,
            discount,
            totalAmount,
            paymentMethod: 'cod',
            paymentStatus: 'pending',
            orderStatus: 'placed',
            notes: 'Test mock order generated automatically.',
            items: selectedItems.map(item => ({
                inventoryId: item.saree.id,
                productName: item.saree.sareeName,
                sku: item.saree.sku,
                barcode: item.saree.barcode,
                quantity: item.quantity,
                unitPrice: item.saree.sellingPrice,
                totalPrice: item.quantity * item.saree.sellingPrice,
                productSnapshot: {
                    fabric: item.saree.fabric,
                    color: item.saree.color,
                }
            }))
        });
    };

    // Selected order derived
    const selectedOrder = orders?.find(o => o.id === selectedOrderId) || null;

    // Initialize temp values when selected order changes
    React.useEffect(() => {
        if (selectedOrder) {
            setTempOrderStatus(selectedOrder.orderStatus);
            setTempPaymentStatus(selectedOrder.paymentStatus);
        }
    }, [selectedOrderId, selectedOrder]);

    // Set first order as default selection on load if none selected
    React.useEffect(() => {
        if (orders && orders.length > 0 && !selectedOrderId) {
            setSelectedOrderId(orders[0].id);
        }
    }, [orders, selectedOrderId]);

    // Calculate dynamic stats
    const stats = React.useMemo(() => {
        if (!orders) return { total: 0, pending: 0, shipped: 0, revenue: 0 };
        
        let total = orders.length;
        let pending = 0;
        let shipped = 0;
        let revenue = 0;

        orders.forEach(order => {
            if (['placed', 'confirmed', 'processing', 'packed'].includes(order.orderStatus)) {
                pending++;
            }
            if (['shipped', 'out_for_delivery'].includes(order.orderStatus)) {
                shipped++;
            }
            if (order.orderStatus === 'delivered') {
                revenue += order.totalAmount;
            }
        });

        return { total, pending, shipped, revenue };
    }, [orders]);

    // Filter orders
    const filteredOrders = React.useMemo(() => {
        if (!orders) return [];
        return orders.filter(order => {
            // Search match
            const term = searchQuery.toLowerCase();
            const matchesSearch = 
                order.orderNumber.toLowerCase().includes(term) ||
                order.customerName.toLowerCase().includes(term) ||
                order.customerPhone.includes(term) ||
                (order.customerEmail && order.customerEmail.toLowerCase().includes(term));
            
            // Status match
            const matchesStatus = statusFilter === 'all' || order.orderStatus === statusFilter;
            
            // Payment match
            const matchesPayment = paymentFilter === 'all' || order.paymentStatus === paymentFilter;

            return matchesSearch && matchesStatus && matchesPayment;
        });
    }, [orders, searchQuery, statusFilter, paymentFilter]);

    // Helper: Style for order status badge
    const getOrderStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'placed':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'confirmed':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'processing':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'packed':
                return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            case 'shipped':
                return 'bg-sky-50 text-sky-700 border-sky-200';
            case 'out_for_delivery':
                return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'delivered':
                return 'bg-green-50 text-green-700 border-green-200';
            case 'cancelled':
                return 'bg-red-50 text-red-700 border-red-200';
            case 'returned':
                return 'bg-slate-50 text-slate-700 border-slate-200';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    // Helper: Style for payment status badge
    const getPaymentStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'paid':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'failed':
                return 'bg-rose-100 text-rose-800 border-rose-200';
            case 'refunded':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    // Helper: Formatted address string
    const formatAddress = (address: any) => {
        if (!address) return '';
        const parts = [
            address.street || address.line1,
            address.line2,
            address.city,
            address.state,
            address.zip || address.pincode,
            address.country
        ];
        return parts.filter(Boolean).join(', ');
    };

    return (
        <div className="space-y-4 max-w-7xl mx-auto px-2">
            {/* Minimal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gold/10 pb-3 gap-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-maroon/10 text-maroon rounded">
                        <ShoppingBag className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold font-serif text-maroon tracking-wider">SBS ONLINE ORDERS</h1>
                        <p className="text-xs text-gray-500 font-sans">Manage e-commerce orders, delivery pipeline, and payment confirmation</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsCartModalOpen(true)}
                        className="h-8 text-xs border-gold/30 text-maroon gap-1.5 hover:bg-cream/10 font-bold uppercase tracking-wider"
                    >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        VIEW CARTS
                    </Button>

                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleGenerateMockOrder}
                        disabled={createOrderMutation.isPending}
                        className="h-8 text-xs border-gold/30 text-maroon gap-1 hover:bg-cream/10 font-bold"
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        TEST ORDER
                    </Button>

                    <Dialog open={isCartModalOpen} onOpenChange={setIsCartModalOpen}>
                        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto border-gold/20 bg-white">
                            <DialogHeader>
                                <DialogTitle className="text-sm font-bold text-maroon uppercase tracking-wider flex items-center gap-1.5">
                                    <ShoppingCart className="h-4 w-4" /> ACTIVE CUSTOMER CARTS
                                </DialogTitle>
                                <DialogDescription className="text-xs text-gray-500">
                                    Monitor online shoppers' cart activity. View items, clear active carts, or convert them directly into manual orders.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 mt-2">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                                    <Input 
                                        placeholder="Search by customer phone or name..." 
                                        className="pl-8 h-8 text-xs border-gold/30 bg-white"
                                        value={cartSearchQuery}
                                        onChange={e => setCartSearchQuery(e.target.value)}
                                    />
                                </div>

                                {isCartsLoading ? (
                                    <div className="py-12 text-center text-maroon/50 text-xs italic">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-1" />
                                        Loading active carts...
                                    </div>
                                ) : cartGroups.length === 0 ? (
                                    <div className="py-8 text-center text-xs text-gray-500 italic border border-dashed border-gold/25 rounded-md">
                                        No active carts found matching search criteria
                                    </div>
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
                                                        <div className="text-[10px] text-gray-500 font-mono">
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
                                                        
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => handleConvertCartToOrder(group.phone, group.items)}
                                                            className="h-7 text-[10px] bg-maroon hover:bg-maroon-dark text-gold font-bold"
                                                        >
                                                            Convert to Order
                                                        </Button>

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
                                                                    <TableHead className="h-6 py-0.5 text-[9px] font-bold text-gray-500 text-center w-8"></TableHead>
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
                                                                            <button 
                                                                                type="button" 
                                                                                disabled={deleteCartItemMutation.isPending}
                                                                                onClick={() => deleteCartItemMutation.mutate(item.id)}
                                                                                className="text-red-500 hover:text-red-700 disabled:opacity-50"
                                                                            >
                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                            </button>
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
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-maroon hover:bg-maroon-dark text-gold h-8 text-xs font-bold shadow-sm uppercase tracking-wider gap-1.5">
                                <Plus className="h-3.5 w-3.5" />
                                MANUAL ORDER
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-gold/20">
                            <DialogHeader>
                                <DialogTitle className="text-sm font-bold text-maroon uppercase tracking-wider">Create Manual Order</DialogTitle>
                                <DialogDescription className="text-xs text-gray-500">Record an order received offline or via phone call.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreateManualOrder} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Customer Name *</label>
                                        <Input 
                                            required 
                                            placeholder="John Doe" 
                                            className="h-8 text-xs border-gold/30"
                                            value={formCustomerName} 
                                            onChange={e => setFormCustomerName(e.target.value)} 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Customer Phone *</label>
                                        <Input 
                                            required 
                                            placeholder="9876543210" 
                                            className="h-8 text-xs border-gold/30"
                                            value={formCustomerPhone} 
                                            onChange={e => setFormCustomerPhone(e.target.value)} 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Customer Email</label>
                                    <Input 
                                        type="email" 
                                        placeholder="customer@email.com" 
                                        className="h-8 text-xs border-gold/30"
                                        value={formCustomerEmail} 
                                        onChange={e => setFormCustomerEmail(e.target.value)} 
                                    />
                                </div>

                                <div className="border-t border-gold/10 pt-2 space-y-2">
                                    <h4 className="text-[11px] font-bold text-maroon uppercase tracking-wider">Shipping Address</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1 col-span-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Street Address *</label>
                                            <Input 
                                                required 
                                                placeholder="123, Park Avenue" 
                                                className="h-8 text-xs border-gold/30"
                                                value={formStreet} 
                                                onChange={e => setFormStreet(e.target.value)} 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">City *</label>
                                            <Input 
                                                required 
                                                placeholder="Mumbai" 
                                                className="h-8 text-xs border-gold/30"
                                                value={formCity} 
                                                onChange={e => setFormCity(e.target.value)} 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">State *</label>
                                            <Input 
                                                required 
                                                placeholder="Maharashtra" 
                                                className="h-8 text-xs border-gold/30"
                                                value={formState} 
                                                onChange={e => setFormState(e.target.value)} 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Zip/Pincode *</label>
                                            <Input 
                                                required 
                                                placeholder="400001" 
                                                className="h-8 text-xs border-gold/30"
                                                value={formZip} 
                                                onChange={e => setFormZip(e.target.value)} 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Country</label>
                                            <Input 
                                                required 
                                                placeholder="India" 
                                                className="h-8 text-xs border-gold/30"
                                                value={formCountry} 
                                                onChange={e => setFormCountry(e.target.value)} 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gold/10 pt-2 space-y-2">
                                    <h4 className="text-[11px] font-bold text-maroon uppercase tracking-wider">Order Items</h4>
                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Select Product *</label>
                                            <Select value={selectedSareeId} onValueChange={setSelectedSareeId}>
                                                <SelectTrigger className="h-8 text-xs border-gold/30">
                                                    <SelectValue placeholder="Search product from inventory..." />
                                                </SelectTrigger>
                                                <SelectContent className="border-gold/20 max-h-[200px]">
                                                    {sarees?.filter(s => s.status === 'active' && s.stock > 0).map(s => (
                                                        <SelectItem key={s.id} value={s.id} className="text-xs">
                                                            {s.sareeName} (Stock: {s.stock} | Selling: ₹{s.sellingPrice})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="w-20 space-y-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase">Qty *</label>
                                            <Input 
                                                type="number" 
                                                min="1" 
                                                className="h-8 text-xs border-gold/30"
                                                value={selectedSareeQty} 
                                                onChange={e => setSelectedSareeQty(Math.max(1, parseInt(e.target.value) || 1))} 
                                            />
                                        </div>
                                        <Button 
                                            type="button" 
                                            size="sm" 
                                            onClick={handleAddSaree} 
                                            className="bg-maroon text-gold h-8 font-bold"
                                        >
                                            Add
                                        </Button>
                                    </div>

                                    {/* Added items list */}
                                    {orderItems.length > 0 && (
                                        <div className="border rounded-md border-gold/15 overflow-hidden">
                                            <Table>
                                                <TableHeader className="bg-cream/10">
                                                    <TableRow className="border-b border-gold/10">
                                                        <TableHead className="h-7 py-1 text-[10px] font-bold text-maroon">Product</TableHead>
                                                        <TableHead className="h-7 py-1 text-[10px] font-bold text-maroon text-center">Qty</TableHead>
                                                        <TableHead className="h-7 py-1 text-[10px] font-bold text-maroon text-right">Price</TableHead>
                                                        <TableHead className="h-7 py-1 text-[10px] font-bold text-maroon text-right">Total</TableHead>
                                                        <TableHead className="h-7 py-1 text-[10px] font-bold text-maroon text-center w-8"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {orderItems.map((item, idx) => (
                                                        <TableRow key={idx} className="border-b border-gold/5 h-8">
                                                            <TableCell className="py-1 text-xs">{item.saree.sareeName}</TableCell>
                                                            <TableCell className="py-1 text-xs text-center">{item.quantity}</TableCell>
                                                            <TableCell className="py-1 text-xs text-right font-mono">₹{item.price.toLocaleString()}</TableCell>
                                                            <TableCell className="py-1 text-xs text-right font-mono">₹{(item.quantity * item.price).toLocaleString()}</TableCell>
                                                            <TableCell className="py-1 text-center">
                                                                <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700">
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-gold/10 pt-2 grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Shipping Fee (₹)</label>
                                        <Input 
                                            type="number" 
                                            className="h-8 text-xs border-gold/30"
                                            value={formShippingFee} 
                                            onChange={e => setFormShippingFee(e.target.value)} 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Discount (₹)</label>
                                        <Input 
                                            type="number" 
                                            className="h-8 text-xs border-gold/30"
                                            value={formDiscount} 
                                            onChange={e => setFormDiscount(e.target.value)} 
                                        />
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Internal Notes</label>
                                        <Textarea 
                                            placeholder="Write optional notes here..." 
                                            className="text-xs border-gold/30 min-h-[50px] resize-none"
                                            value={formNotes}
                                            onChange={e => setFormNotes(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="bg-cream/10 border border-gold/15 p-2.5 rounded-md flex justify-between items-center text-xs">
                                    <div>
                                        <span className="text-gray-500 font-sans">Subtotal: ₹{manualSubtotal.toLocaleString()}</span>
                                        <span className="mx-2 text-gray-300">|</span>
                                        <span className="text-gray-500 font-sans">Shipping: ₹{manualShipping.toLocaleString()}</span>
                                        <span className="mx-2 text-gray-300">|</span>
                                        <span className="text-gray-500 font-sans">Discount: ₹{manualDiscount.toLocaleString()}</span>
                                    </div>
                                    <div className="font-bold text-sm text-maroon font-mono">
                                        Total: ₹{manualTotal.toLocaleString()}
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="h-8 text-xs"
                                    >
                                        Cancel
                                    </Button>
                                    <Button 
                                        type="submit" 
                                        className="bg-maroon hover:bg-maroon-dark text-gold h-8 text-xs font-bold"
                                        disabled={createOrderMutation.isPending}
                                    >
                                        {createOrderMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'PLACE ORDER'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* KPI Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-gold/20 shadow bg-white">
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Total Online Orders</span>
                            <span className="text-xl font-bold font-mono text-gray-800">{stats.total}</span>
                        </div>
                        <div className="p-2 bg-slate-100 rounded text-slate-600">
                            <FileText className="h-4.5 w-4.5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-gold/20 shadow bg-white">
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Pending Fulfillment</span>
                            <span className="text-xl font-bold font-mono text-amber-600">{stats.pending}</span>
                        </div>
                        <div className="p-2 bg-amber-50 rounded text-amber-600">
                            <Clock className="h-4.5 w-4.5 animate-pulse" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-gold/20 shadow bg-white">
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">In Transit (Courier)</span>
                            <span className="text-xl font-bold font-mono text-sky-600">{stats.shipped}</span>
                        </div>
                        <div className="p-2 bg-sky-50 rounded text-sky-600">
                            <Truck className="h-4.5 w-4.5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-gold/20 shadow bg-white">
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Delivered Revenue</span>
                            <span className="text-xl font-bold font-mono text-emerald-600">₹{stats.revenue.toLocaleString()}</span>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded text-emerald-600">
                            <TrendingUp className="h-4.5 w-4.5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters toolbar */}
            <div className="bg-cream/10 border border-gold/15 p-2.5 rounded-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                        <Input 
                            placeholder="Search Order #, Customer Name, Phone..." 
                            className="pl-8 h-8 text-xs border-gold/30 bg-white"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                        <ListFilter className="h-3.5 w-3.5 text-maroon" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Fulfillment:</span>
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-8 w-32 text-xs border-gold/30 bg-white">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent className="border-gold/20">
                            <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                            <SelectItem value="placed" className="text-xs">Placed</SelectItem>
                            <SelectItem value="confirmed" className="text-xs">Confirmed</SelectItem>
                            <SelectItem value="processing" className="text-xs">Processing</SelectItem>
                            <SelectItem value="packed" className="text-xs">Packed</SelectItem>
                            <SelectItem value="shipped" className="text-xs">Shipped</SelectItem>
                            <SelectItem value="out_for_delivery" className="text-xs">Out For Delivery</SelectItem>
                            <SelectItem value="delivered" className="text-xs">Delivered</SelectItem>
                            <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
                            <SelectItem value="returned" className="text-xs">Returned</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1 ml-2">
                        <CreditCard className="h-3.5 w-3.5 text-maroon" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Payment:</span>
                    </div>
                    <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                        <SelectTrigger className="h-8 w-32 text-xs border-gold/30 bg-white">
                            <SelectValue placeholder="All Payments" />
                        </SelectTrigger>
                        <SelectContent className="border-gold/20">
                            <SelectItem value="all" className="text-xs">All Payments</SelectItem>
                            <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                            <SelectItem value="paid" className="text-xs">Paid</SelectItem>
                            <SelectItem value="failed" className="text-xs">Failed</SelectItem>
                            <SelectItem value="refunded" className="text-xs">Refunded</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Master-Detail Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Master List (Left Column) */}
                <div className={`${selectedOrderId ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
                    <Card className="border-gold/20 shadow-md">
                        <CardHeader className="bg-cream/20 border-b border-gold/10 p-2.5">
                            <CardTitle className="text-xs font-bold text-maroon uppercase tracking-wider flex items-center justify-between">
                                <span>Online Orders Registry ({filteredOrders.length})</span>
                                <span className="text-[10px] text-gray-500 normal-case font-normal">Click an order to view full details</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-cream/10">
                                    <TableRow className="border-b border-gold/10 hover:bg-transparent">
                                        <TableHead className="h-8 text-[10px] font-bold text-maroon py-1">Order No</TableHead>
                                        <TableHead className="h-8 text-[10px] font-bold text-maroon py-1">Customer</TableHead>
                                        <TableHead className="h-8 text-[10px] font-bold text-maroon py-1">Total</TableHead>
                                        <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 text-center">Fulfillment</TableHead>
                                        <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 text-center">Payment</TableHead>
                                        <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 text-right">Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-48 text-center text-maroon/50 text-xs italic">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-1" />
                                                Loading order logs...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredOrders.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center text-xs text-gray-500 italic">No matching orders found</TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredOrders.map((order) => (
                                            <TableRow 
                                                key={order.id} 
                                                className={`hover:bg-cream/5 border-b border-gold/5 cursor-pointer h-10 ${selectedOrderId === order.id ? 'bg-gold/10 hover:bg-gold/15' : ''}`}
                                                onClick={() => setSelectedOrderId(order.id)}
                                            >
                                                <TableCell className="py-1 text-xs font-mono font-bold text-maroon">{order.orderNumber}</TableCell>
                                                <TableCell className="py-1 text-xs">
                                                    <div>
                                                        <div className="font-semibold text-gray-800">{order.customerName}</div>
                                                        <div className="text-[10px] text-gray-500">{order.customerPhone}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-1 text-xs font-bold font-mono text-gray-800">₹{order.totalAmount.toLocaleString()}</TableCell>
                                                <TableCell className="py-1 text-center">
                                                    <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getOrderStatusBadgeClass(order.orderStatus)}`}>
                                                        {order.orderStatus.replace('_', ' ')}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-1 text-center">
                                                    <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getPaymentStatusBadgeClass(order.paymentStatus)}`}>
                                                        {order.paymentStatus}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-1 text-xs font-mono text-right text-gray-500">
                                                    {new Date(order.createdAt).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                {/* Detail Panel (Right Column) */}
                {selectedOrderId && (
                    <div className="lg:col-span-5 space-y-4">
                        {selectedOrder ? (
                            <Card className="border-gold/20 shadow-md relative overflow-hidden bg-white">
                                <CardHeader className="bg-maroon text-gold p-3 border-b border-gold/15 flex flex-row items-center justify-between">
                                    <div>
                                        <div className="text-xs uppercase tracking-[0.2em] opacity-80">Order Details</div>
                                        <div className="text-sm font-bold font-mono tracking-wider">{selectedOrder.orderNumber}</div>
                                    </div>
                                    <button 
                                        className="text-gold/80 hover:text-gold text-xs font-bold uppercase tracking-wider"
                                        onClick={() => setSelectedOrderId(null)}
                                    >
                                        Close
                                    </button>
                                </CardHeader>
                                <CardContent className="p-4 space-y-4">
                                    {/* Order Status Ribbon */}
                                    <div className="flex justify-between items-center bg-cream/20 p-2.5 rounded border border-gold/15">
                                        <div className="space-y-0.5">
                                            <span className="text-[9px] font-bold text-gray-500 uppercase block">Status</span>
                                            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getOrderStatusBadgeClass(selectedOrder.orderStatus)}`}>
                                                {selectedOrder.orderStatus.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="space-y-0.5 text-right">
                                            <span className="text-[9px] font-bold text-gray-500 uppercase block">Payment (COD)</span>
                                            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getPaymentStatusBadgeClass(selectedOrder.paymentStatus)}`}>
                                                {selectedOrder.paymentStatus}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Customer & Shipping Information */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="border border-gold/10 p-2.5 rounded bg-slate-50 space-y-1.5">
                                            <div className="flex items-center gap-1.5 border-b border-gold/5 pb-1">
                                                <User className="h-3.5 w-3.5 text-maroon" />
                                                <span className="text-[10px] font-bold text-maroon uppercase tracking-wider">Customer</span>
                                            </div>
                                            <div className="text-xs space-y-1">
                                                <div className="font-bold text-gray-800">{selectedOrder.customerName}</div>
                                                <div className="text-gray-600 flex items-center gap-1"><Phone className="h-3 w-3 inline text-gray-400" /> {selectedOrder.customerPhone}</div>
                                                {selectedOrder.customerEmail && (
                                                    <div className="text-gray-600 flex items-center gap-1 truncate"><Mail className="h-3 w-3 inline text-gray-400" /> {selectedOrder.customerEmail}</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="border border-gold/10 p-2.5 rounded bg-slate-50 space-y-1.5">
                                            <div className="flex items-center gap-1.5 border-b border-gold/5 pb-1">
                                                <MapPin className="h-3.5 w-3.5 text-maroon" />
                                                <span className="text-[10px] font-bold text-maroon uppercase tracking-wider">Shipping Address</span>
                                            </div>
                                            <div className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                                                {formatAddress(selectedOrder.shippingAddress)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Order Items */}
                                    <div className="border border-gold/10 rounded overflow-hidden">
                                        <div className="bg-cream/15 p-1.5 border-b border-gold/10 text-[10px] font-bold text-maroon uppercase tracking-wider flex items-center gap-1">
                                            <PackageOpen className="h-3.5 w-3.5" /> Items Registry
                                        </div>
                                        <Table>
                                            <TableHeader className="bg-slate-50">
                                                <TableRow className="border-b border-gold/5 hover:bg-transparent">
                                                    <TableHead className="h-6 py-0.5 text-[9px] font-bold text-gray-500">Item</TableHead>
                                                    <TableHead className="h-6 py-0.5 text-[9px] font-bold text-gray-500 text-center">Qty</TableHead>
                                                    <TableHead className="h-6 py-0.5 text-[9px] font-bold text-gray-500 text-right">Price</TableHead>
                                                    <TableHead className="h-6 py-0.5 text-[9px] font-bold text-gray-500 text-right">Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedOrder.items?.map((item) => (
                                                    <TableRow key={item.id} className="border-b border-gold/5 h-8">
                                                        <TableCell className="py-1 text-xs">
                                                            <div className="font-semibold text-gray-800">{item.productName}</div>
                                                            {item.sku && <div className="text-[9px] text-gray-400 font-mono">SKU: {item.sku}</div>}
                                                        </TableCell>
                                                        <TableCell className="py-1 text-xs text-center">{item.quantity}</TableCell>
                                                        <TableCell className="py-1 text-xs text-right font-mono">₹{item.unitPrice.toLocaleString()}</TableCell>
                                                        <TableCell className="py-1 text-xs text-right font-mono">₹{item.totalPrice.toLocaleString()}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>

                                        {/* Financial Summary */}
                                        <div className="p-3 bg-slate-50 border-t border-gold/10 space-y-1.5 text-xs text-gray-600 font-sans">
                                            <div className="flex justify-between">
                                                <span>Subtotal:</span>
                                                <span className="font-mono">₹{selectedOrder.subtotal.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Shipping Fee:</span>
                                                <span className="font-mono">₹{selectedOrder.shippingFee.toLocaleString()}</span>
                                            </div>
                                            {selectedOrder.discount > 0 && (
                                                <div className="flex justify-between text-red-600">
                                                    <span>Discount:</span>
                                                    <span className="font-mono">-₹{selectedOrder.discount.toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between font-bold text-maroon text-sm border-t border-gold/5 pt-1">
                                                <span>Total Amount:</span>
                                                <span className="font-mono">₹{selectedOrder.totalAmount.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    {selectedOrder.notes && (
                                        <div className="bg-yellow-50/50 border border-yellow-200/60 p-2.5 rounded text-xs">
                                            <span className="font-bold text-yellow-800 block text-[10px] uppercase mb-0.5">Notes/Instructions</span>
                                            <p className="text-gray-700 italic">"{selectedOrder.notes}"</p>
                                        </div>
                                    )}

                                    {/* Action controls (Forms) */}
                                    <div className="border border-gold/10 p-3 rounded space-y-3.5 bg-cream/5">
                                        <h4 className="text-[10px] font-bold text-maroon uppercase tracking-wider border-b border-gold/10 pb-1.5"> FULFILLMENT CONTROL CENTRE</h4>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {/* Order status form */}
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-bold text-gray-500 uppercase">Change Fulfillment Status</label>
                                                <Select value={tempOrderStatus} onValueChange={setTempOrderStatus}>
                                                    <SelectTrigger className="h-8 text-xs border-gold/30 bg-white">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="border-gold/20">
                                                        <SelectItem value="placed" className="text-xs">Placed</SelectItem>
                                                        <SelectItem value="confirmed" className="text-xs">Confirmed</SelectItem>
                                                        <SelectItem value="processing" className="text-xs">Processing</SelectItem>
                                                        <SelectItem value="packed" className="text-xs">Packed</SelectItem>
                                                        <SelectItem value="shipped" className="text-xs">Shipped</SelectItem>
                                                        <SelectItem value="out_for_delivery" className="text-xs">Out For Delivery</SelectItem>
                                                        <SelectItem value="delivered" className="text-xs">Delivered</SelectItem>
                                                        <SelectItem value="cancelled" className="text-xs">Cancelled</SelectItem>
                                                        <SelectItem value="returned" className="text-xs">Returned</SelectItem>
                                                    </SelectContent>
                                                </Select>

                                                <Input 
                                                    placeholder="Optional status note..." 
                                                    className="h-8 text-xs border-gold/30 bg-white"
                                                    value={statusNote}
                                                    onChange={e => setStatusNote(e.target.value)}
                                                />
                                                
                                                <Button 
                                                    size="sm" 
                                                    className="w-full bg-maroon text-gold h-7 text-[10px] font-bold"
                                                    disabled={updateStatusMutation.isPending || tempOrderStatus === selectedOrder.orderStatus}
                                                    onClick={() => updateStatusMutation.mutate({ 
                                                        orderId: selectedOrder.id, 
                                                        status: tempOrderStatus, 
                                                        note: statusNote 
                                                    })}
                                                >
                                                    {updateStatusMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                                    UPDATE STATUS
                                                </Button>
                                            </div>

                                            {/* Payment status form */}
                                            <div className="space-y-2 flex flex-col justify-between">
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-bold text-gray-500 uppercase">Change Payment Status</label>
                                                    <Select value={tempPaymentStatus} onValueChange={setTempPaymentStatus}>
                                                        <SelectTrigger className="h-8 text-xs border-gold/30 bg-white">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="border-gold/20">
                                                            <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                                                            <SelectItem value="paid" className="text-xs">Paid</SelectItem>
                                                            <SelectItem value="failed" className="text-xs">Failed</SelectItem>
                                                            <SelectItem value="refunded" className="text-xs">Refunded</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <Button 
                                                    size="sm" 
                                                    className="w-full bg-slate-800 hover:bg-slate-700 text-gold h-7 text-[10px] font-bold mt-auto"
                                                    disabled={updatePaymentMutation.isPending || tempPaymentStatus === selectedOrder.paymentStatus}
                                                    onClick={() => updatePaymentMutation.mutate({ 
                                                        orderId: selectedOrder.id, 
                                                        paymentStatus: tempPaymentStatus 
                                                    })}
                                                >
                                                    {updatePaymentMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                                    UPDATE PAYMENT
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status History Timeline */}
                                    <div className="border border-gold/10 p-3 rounded space-y-3 bg-slate-50">
                                        <h4 className="text-[10px] font-bold text-maroon uppercase tracking-wider flex items-center gap-1 border-b border-gold/10 pb-1.5">
                                            <Clock className="h-3.5 w-3.5" /> Order Progress Log
                                        </h4>
                                        <div className="relative pl-4 border-l border-gold/25 space-y-4 py-1 text-xs">
                                            {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 ? (
                                                selectedOrder.statusHistory.map((history) => (
                                                    <div key={history.id} className="relative space-y-0.5">
                                                        {/* Dot marker */}
                                                        <span className="absolute -left-[20.5px] top-1.5 h-2 w-2 rounded-full bg-maroon border border-gold" />
                                                        
                                                        <div className="flex justify-between items-center">
                                                            <span className="font-bold text-[10px] uppercase text-maroon tracking-wider bg-gold/10 px-1.5 py-0.5 rounded border border-gold/15">
                                                                {history.status.replace('_', ' ')}
                                                            </span>
                                                            <span className="text-[9px] text-gray-400 font-mono">
                                                                {new Date(history.createdAt).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        {history.note && (
                                                            <p className="text-gray-600 text-[11px] leading-relaxed italic pl-1">
                                                                {history.note}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-gray-500 italic text-[11px]">No history logs recorded yet</div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="h-48 border border-dashed border-gold/30 rounded flex items-center justify-center text-xs text-gray-500 italic bg-white">
                                Error retrieving selected order details
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
