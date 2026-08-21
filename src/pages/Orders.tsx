import React from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersService, type Order, type OrderItem, type CartItem } from '@/services/ordersService';
import { pushNotificationService } from '@/services/pushNotificationService';
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
    CheckCircle2,
    Truck,
    Clock,
    CreditCard,
    AlertTriangle,
    TrendingUp,
    FileText,
    PackageOpen,
    Trash2,
    Sparkles,
    Printer,
    Gift,
    X,
    ChevronRight,
    Package,
    CircleCheck,
    IndianRupee,
    Copy,
    ClipboardList,
    ArrowUpRight,
    Send,
    Home,
    Ban
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { motion } from 'framer-motion';

// Fulfillment pipeline in order of progress
const FULFILLMENT_STEPS = [
    { key: 'placed', label: 'Placed', icon: FileText },
    { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
    { key: 'processing', label: 'Processing', icon: Loader2 },
    { key: 'packed', label: 'Packed', icon: Package },
    { key: 'shipped', label: 'Shipped', icon: Truck },
    { key: 'out_for_delivery', label: 'Out For Delivery', icon: Send },
    { key: 'delivered', label: 'Delivered', icon: Home },
];

const ORDER_STATUS_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'placed', label: 'Placed' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'processing', label: 'Processing' },
    { value: 'packed', label: 'Packed' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'out_for_delivery', label: 'Out For Delivery' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'returned', label: 'Returned' },
];

const PAYMENT_STATUS_OPTIONS = [
    { value: 'all', label: 'All Payments' },
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'failed', label: 'Failed' },
    { value: 'refunded', label: 'Refunded' },
];

export default function OrdersPage() {
    const queryClient = useQueryClient();
    const location = useLocation() as any;

    // UI state
    const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<string>('all');
    const [paymentFilter, setPaymentFilter] = React.useState<string>('all');

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

    // Handle redirect conversion from Cart storefront
    React.useEffect(() => {
        if (location.state && (location.state as any).convertCart) {
            const data = (location.state as any).convertCart;
            setFormCustomerPhone(data.phone || '');
            setFormCustomerName(data.customerName || '');
            setFormCustomerEmail(data.email || '');
            if (data.address) {
                setFormStreet(data.address.street || data.address.line1 || '');
                setFormCity(data.address.city || '');
                setFormState(data.address.state || '');
                setFormZip(data.address.zip || data.address.pincode || '');
                setFormCountry(data.address.country || 'India');
            }
            if (data.items) {
                // Map items to the required structure
                const mappedItems = data.items.map((item: any) => {
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
            }
            setIsCreateModalOpen(true);
            toast.success(`Loaded cart items for ${data.phone} into manual order draft.`);

            // Clean up history state so reloading doesn't prompt again
            window.history.replaceState({}, document.title);
        }
    }, [location.state, sarees]);

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
    }, [orders, searchQuery, paymentFilter, statusFilter]);

    // Per-status counts for quick-filter pills (pure UI)
    const statusCounts = React.useMemo(() => {
        if (!orders) return {};
        const counts: Record<string, number> = {};
        ORDER_STATUS_OPTIONS.slice(1).forEach(opt => {
            counts[opt.value] = orders.filter(o => o.orderStatus === opt.value).length;
        });
        return counts;
    }, [orders]);

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

    // Helper: Status dot color for order status
    const getStatusDotClass = (status: string) => {
        switch (status) {
            case 'placed': return 'bg-amber-500';
            case 'confirmed': return 'bg-blue-500';
            case 'processing': return 'bg-purple-500';
            case 'packed': return 'bg-indigo-500';
            case 'shipped': return 'bg-sky-500';
            case 'out_for_delivery': return 'bg-orange-500';
            case 'delivered': return 'bg-green-500';
            case 'cancelled': return 'bg-red-500';
            case 'returned': return 'bg-slate-500';
            default: return 'bg-gray-400';
        }
    };

    // Helper: Payment status dot color
    const getPaymentDotClass = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500';
            case 'paid': return 'bg-emerald-500';
            case 'failed': return 'bg-rose-500';
            case 'refunded': return 'bg-gray-400';
            default: return 'bg-gray-400';
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

    // Helper: Customer avatar initials
    const getInitials = (name: string) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    };

    // Helper: current step index within fulfillment pipeline
    const currentFulfillmentIndex = React.useMemo(() => {
        if (!selectedOrder) return -1;
        return FULFILLMENT_STEPS.findIndex(s => s.key === selectedOrder.orderStatus);
    }, [selectedOrder]);

    // Copy order number to clipboard
    const copyOrderNumber = async (orderNumber: string) => {
        try {
            await navigator.clipboard.writeText(orderNumber);
            toast.success('Order number copied to clipboard');
        } catch {
            toast.error('Could not copy order number');
        }
    };

    return (
        <div className="space-y-5 max-w-7xl mx-auto px-2 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-maroon to-maroon-dark text-gold rounded-xl shadow-md shadow-maroon/20">
                        <ShoppingBag className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold font-serif text-maroon tracking-wide">Online Orders</h1>
                        <p className="text-xs text-gray-500 font-sans">Manage e-commerce orders, delivery pipeline & payments</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateMockOrder}
                        disabled={createOrderMutation.isPending}
                        className="h-9 text-xs border-gold/40 text-maroon gap-1.5 hover:bg-gold/10 font-semibold"
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        Test Order
                    </Button>

                    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-maroon to-maroon-dark text-gold h-9 text-xs font-bold shadow-md shadow-maroon/20 gap-1.5 hover:shadow-lg hover:shadow-maroon/30 transition-all">
                                <Plus className="h-4 w-4" />
                                Manual Order
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <Card className="border-gold/20 shadow-sm hover:shadow-md transition-shadow bg-white">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Total Orders</span>
                                <span className="text-2xl font-bold font-mono text-gray-800">{stats.total}</span>
                                <span className="text-[10px] text-gray-400 block">All time</span>
                            </div>
                            <div className="p-2.5 bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl text-white shadow">
                                <FileText className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 }}
                >
                    <Card className="border-gold/20 shadow-sm hover:shadow-md transition-shadow bg-white">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Pending Fulfillment</span>
                                <span className="text-2xl font-bold font-mono text-amber-600">{stats.pending}</span>
                                <span className="text-[10px] text-gray-400 block">Needs attention</span>
                            </div>
                            <div className="p-2.5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl text-white shadow">
                                <Clock className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                >
                    <Card className="border-gold/20 shadow-sm hover:shadow-md transition-shadow bg-white">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">In Transit</span>
                                <span className="text-2xl font-bold font-mono text-sky-600">{stats.shipped}</span>
                                <span className="text-[10px] text-gray-400 block">With courier</span>
                            </div>
                            <div className="p-2.5 bg-gradient-to-br from-sky-500 to-sky-700 rounded-xl text-white shadow">
                                <Truck className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                >
                    <Card className="border-gold/20 shadow-sm hover:shadow-md transition-shadow bg-white">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Delivered Revenue</span>
                                <span className="text-2xl font-bold font-mono text-emerald-600">₹{stats.revenue.toLocaleString()}</span>
                                <span className="text-[10px] text-gray-400 block">Completed sales</span>
                            </div>
                            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl text-white shadow">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Filters toolbar */}
            <Card className="border-gold/20 shadow-sm bg-white">
                <CardContent className="p-3.5 space-y-3">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search order #, customer name, phone or email..."
                                className="pl-9 h-10 text-sm border-gold/30 bg-white"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                                <CreditCard className="h-4 w-4 text-maroon" />
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Payment:</span>
                            </div>
                            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                                <SelectTrigger className="h-10 w-40 text-sm border-gold/30 bg-white">
                                    <SelectValue placeholder="All Payments" />
                                </SelectTrigger>
                                <SelectContent className="border-gold/20">
                                    {PAYMENT_STATUS_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-10 text-xs text-gray-500 gap-1.5"
                                onClick={() => {
                                    setSearchQuery('');
                                    setStatusFilter('all');
                                    setPaymentFilter('all');
                                }}
                            >
                                <X className="h-3.5 w-3.5" />
                                Clear
                            </Button>
                        </div>
                    </div>

                    {/* Status quick-filter pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                        <div className="flex items-center gap-1 mr-1 shrink-0">
                            <Filter className="h-3.5 w-3.5 text-maroon" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Status:</span>
                        </div>
                        {ORDER_STATUS_OPTIONS.map(opt => {
                            const active = statusFilter === opt.value;
                            const count = opt.value === 'all' ? (orders?.length || 0) : (statusCounts[opt.value] || 0);
                            return (
                                <button
                                    key={opt.value}
                                    onClick={() => setStatusFilter(opt.value)}
                                    className={cn(
                                        "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                                        active
                                            ? "bg-gradient-to-r from-maroon to-maroon-dark text-gold border-maroon shadow-sm shadow-maroon/20"
                                            : "bg-white text-gray-600 border-gold/30 hover:border-maroon/50 hover:text-maroon"
                                    )}
                                >
                                    {opt.label}
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono",
                                        active ? "bg-gold/20 text-gold" : "bg-gray-100 text-gray-500"
                                    )}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Master-Detail Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Master List (Left Column) */}
                <div className={cn(selectedOrderId ? 'lg:col-span-7' : 'lg:col-span-12')}>
                    <Card className="border-gold/20 shadow-md bg-white overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/10 px-4 py-3">
                            <CardTitle className="text-sm font-bold text-maroon uppercase tracking-wider flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <ClipboardList className="h-4 w-4 text-maroon/70" />
                                    Orders Registry
                                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-mono">
                                        {filteredOrders.length}
                                    </span>
                                </span>
                                <span className="text-[10px] text-gray-500 normal-case font-normal hidden md:inline">Click an order to view full details</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-cream/10">
                                    <TableRow className="border-b border-gold/10 hover:bg-transparent">
                                        <TableHead className="h-10 text-[10px] font-bold text-maroon py-1 px-3">Order No</TableHead>
                                        <TableHead className="h-10 text-[10px] font-bold text-maroon py-1">Customer</TableHead>
                                        <TableHead className="h-10 text-[10px] font-bold text-maroon py-1 text-center">Items</TableHead>
                                        <TableHead className="h-10 text-[10px] font-bold text-maroon py-1 text-right">Total</TableHead>
                                        <TableHead className="h-10 text-[10px] font-bold text-maroon py-1 text-center">Fulfillment</TableHead>
                                        <TableHead className="h-10 text-[10px] font-bold text-maroon py-1 text-center">Payment</TableHead>
                                        <TableHead className="h-10 text-[10px] font-bold text-maroon py-1 text-right">Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-48 text-center text-maroon/50 text-xs italic">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-1" />
                                                Loading order logs...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredOrders.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-32 text-center">
                                                <div className="flex flex-col items-center gap-2 py-4">
                                                    <div className="p-3 bg-gray-100 rounded-full">
                                                        <Search className="h-5 w-5 text-gray-400" />
                                                    </div>
                                                    <p className="text-sm text-gray-500">No matching orders found</p>
                                                    <p className="text-xs text-gray-400">Try adjusting your search or filters</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredOrders.map((order) => (
                                            <TableRow
                                                key={order.id}
                                                className={cn(
                                                    "hover:bg-cream/10 border-b border-gold/5 cursor-pointer h-14 transition-colors",
                                                    selectedOrderId === order.id && "bg-gold/10 hover:bg-gold/15"
                                                )}
                                                onClick={() => setSelectedOrderId(order.id)}
                                            >
                                                <TableCell className="py-1 px-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-mono font-bold text-maroon">{order.orderNumber}</span>
                                                        {order.isGift && (
                                                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border bg-pink-50 text-pink-700 border-pink-200 whitespace-nowrap">
                                                                <Gift className="h-2.5 w-2.5" /> Gift
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-1">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-maroon to-maroon-dark text-gold flex items-center justify-center text-[10px] font-bold font-sans shadow-sm">
                                                            {getInitials(order.customerName)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-semibold text-gray-800 text-xs truncate">{order.customerName}</div>
                                                            <div className="text-[10px] text-gray-500 truncate">{order.customerPhone}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-1 text-center">
                                                    <span className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-bold font-mono">
                                                        {order.items?.length || 0}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-1 text-xs font-bold font-mono text-gray-800 text-right">
                                                    <span className="inline-flex items-center gap-0.5 text-maroon">
                                                        <IndianRupee className="h-3 w-3" />
                                                        {order.totalAmount.toLocaleString()}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-1 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${getOrderStatusBadgeClass(order.orderStatus)}`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full ${getStatusDotClass(order.orderStatus)}`} />
                                                        {order.orderStatus.replace('_', ' ')}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-1 text-center">
                                                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${getPaymentStatusBadgeClass(order.paymentStatus)}`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full ${getPaymentDotClass(order.paymentStatus)}`} />
                                                        {order.paymentStatus}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-1 text-right pr-3">
                                                    <div className="text-xs font-mono text-gray-500">
                                                        {new Date(order.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                                    </div>
                                                    <div className="text-[10px] font-mono text-gray-400">
                                                        {new Date(order.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
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
                            <motion.div
                                key={selectedOrder.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.25 }}
                            >
                                <Card className="border-gold/20 shadow-md relative overflow-hidden bg-white">
                                    {/* Header */}
                                    <div className="bg-gradient-to-r from-maroon via-maroon-dark to-maroon-dark text-gold p-4 border-b border-gold/15">
                                        <div className="flex flex-row items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="text-[9px] uppercase tracking-[0.25em] opacity-70 font-sans">Order Details</div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-base font-bold font-mono tracking-wider truncate">{selectedOrder.orderNumber}</span>
                                                    <button
                                                        title="Copy order number"
                                                        onClick={() => copyOrderNumber(selectedOrder.orderNumber)}
                                                        className="opacity-70 hover:opacity-100 text-gold transition-opacity shrink-0"
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                    </button>
                                                </div>
                                                <div className="text-[10px] font-mono opacity-60 mt-0.5">
                                                    {new Date(selectedOrder.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                            <button
                                                className="text-gold/70 hover:text-gold text-xs font-bold uppercase tracking-wider p-1 rounded hover:bg-gold/10 transition-colors shrink-0"
                                                onClick={() => setSelectedOrderId(null)}
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>

                                        {/* Status ribbon */}
                                        <div className="flex flex-wrap items-center gap-2 mt-3">
                                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-white/10 border-gold/30 text-gold`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${getStatusDotClass(selectedOrder.orderStatus)}`} />
                                                {selectedOrder.orderStatus.replace('_', ' ')}
                                            </span>
                                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-white/10 border-gold/30 text-gold`}>
                                                <CreditCard className="h-3 w-3" />
                                                {selectedOrder.paymentStatus}
                                            </span>
                                            {selectedOrder.isGift && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-pink-600/30 border-pink-400/40 text-pink-100">
                                                    <Gift className="h-3 w-3" /> Gift
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <CardContent className="p-4 space-y-4">
                                        {/* Fulfillment Progress Stepper */}
                                        {currentFulfillmentIndex >= 0 ? (
                                            <div className="border border-gold/15 rounded-xl p-3.5 bg-cream/20">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-[10px] font-bold text-maroon uppercase tracking-wider flex items-center gap-1.5">
                                                        <ArrowUpRight className="h-3.5 w-3.5" /> Fulfillment Pipeline
                                                    </span>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase font-mono">
                                                        Step {currentFulfillmentIndex + 1} / {FULFILLMENT_STEPS.length}
                                                    </span>
                                                </div>
                                                <div className="flex items-center">
                                                    {FULFILLMENT_STEPS.map((step, idx) => {
                                                        const isComplete = idx < currentFulfillmentIndex;
                                                        const isCurrent = idx === currentFulfillmentIndex;
                                                        return (
                                                            <React.Fragment key={step.key}>
                                                                <div className="flex flex-col items-center flex-1 min-w-0">
                                                                    <div className={cn(
                                                                        "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all",
                                                                        isCurrent
                                                                            ? "bg-maroon border-maroon text-gold shadow-md shadow-maroon/30 scale-110"
                                                                            : isComplete
                                                                                ? "bg-emerald-500 border-emerald-500 text-white"
                                                                                : "bg-white border-gray-200 text-gray-300"
                                                                    )}>
                                                                        {isComplete ? (
                                                                            <CircleCheck className="h-4 w-4" />
                                                                        ) : (
                                                                            <step.icon className={cn("h-3.5 w-3.5", isCurrent && "animate-pulse")} />
                                                                        )}
                                                                    </div>
                                                                    <span className={cn(
                                                                        "text-[8px] font-bold uppercase tracking-wider mt-1.5 text-center px-0.5",
                                                                        isCurrent ? "text-maroon" : isComplete ? "text-emerald-600" : "text-gray-400"
                                                                    )}>
                                                                        {step.label}
                                                                    </span>
                                                                </div>
                                                                {idx < FULFILLMENT_STEPS.length - 1 && (
                                                                    <div className={cn(
                                                                        "h-0.5 flex-1 mb-5 rounded",
                                                                        idx < currentFulfillmentIndex ? "bg-emerald-400" : "bg-gray-200"
                                                                    )} />
                                                                )}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={cn(
                                                "rounded-xl p-3.5 flex items-center gap-3 border",
                                                selectedOrder.orderStatus === 'cancelled'
                                                    ? "bg-red-50 border-red-200"
                                                    : "bg-slate-50 border-slate-200"
                                            )}>
                                                <div className={cn(
                                                    "p-2 rounded-full",
                                                    selectedOrder.orderStatus === 'cancelled' ? "bg-red-100 text-red-600" : "bg-slate-200 text-slate-600"
                                                )}>
                                                    <Ban className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                        {selectedOrder.orderStatus === 'cancelled' ? 'Order Cancelled' : 'Order Returned'}
                                                    </span>
                                                    <p className="text-[11px] text-gray-500">
                                                        This order is outside the active fulfillment pipeline.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Gift Details — visible only for gift orders */}
                                        {selectedOrder.isGift && (
                                            <div className="border-2 border-pink-200 bg-pink-50/60 rounded-lg p-3 space-y-2.5">
                                                <div className="flex items-center gap-2 border-b border-pink-200/60 pb-2">
                                                    <span className="text-lg">🎁</span>
                                                    <span className="text-[11px] font-bold text-pink-800 uppercase tracking-widest">Gift Order — Packing Instructions</span>
                                                </div>
                                                <div className="grid grid-cols-1 gap-2 text-xs">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[9px] font-bold text-pink-600 uppercase tracking-wider">Gift Recipient</span>
                                                        <span className="font-semibold text-gray-800">
                                                            {selectedOrder.giftRecipientName || <em className="text-gray-400 font-normal">Not specified</em>}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[9px] font-bold text-pink-600 uppercase tracking-wider">Gift Message</span>
                                                        {selectedOrder.giftMessage ? (
                                                            <p className="text-gray-700 italic leading-relaxed bg-white/70 border border-pink-100 rounded px-2 py-1.5">
                                                                "{selectedOrder.giftMessage}"
                                                            </p>
                                                        ) : (
                                                            <em className="text-gray-400">No message provided</em>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-between bg-white/70 border border-pink-100 rounded px-2.5 py-1.5">
                                                        <span className="text-[9px] font-bold text-pink-600 uppercase tracking-wider">Gift Wrapping</span>
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                                            <CheckCircle2 className="h-3 w-3" /> Yes — Include Gift Wrap
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Customer & Shipping Information */}
                                        <div className="grid grid-cols-1 gap-3">
                                            <div className="border border-gold/10 p-3 rounded-lg bg-slate-50 space-y-2">
                                                <div className="flex items-center gap-1.5 border-b border-gold/5 pb-1.5">
                                                    <User className="h-4 w-4 text-maroon" />
                                                    <span className="text-[10px] font-bold text-maroon uppercase tracking-wider">Customer</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-maroon to-maroon-dark text-gold flex items-center justify-center font-bold text-sm shadow-sm">
                                                        {getInitials(selectedOrder.customerName)}
                                                    </div>
                                                    <div className="text-xs space-y-0.5 min-w-0">
                                                        <div className="font-bold text-gray-800 truncate">{selectedOrder.customerName}</div>
                                                        <div className="text-gray-600 flex items-center gap-1"><Phone className="h-3 w-3 inline text-gray-400" /> {selectedOrder.customerPhone}</div>
                                                        {selectedOrder.customerEmail && (
                                                            <div className="text-gray-600 flex items-center gap-1 truncate"><Mail className="h-3 w-3 inline text-gray-400" /> {selectedOrder.customerEmail}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="border border-gold/10 p-3 rounded-lg bg-slate-50 space-y-1.5">
                                                <div className="flex items-center gap-1.5 border-b border-gold/5 pb-1.5">
                                                    <MapPin className="h-4 w-4 text-maroon" />
                                                    <span className="text-[10px] font-bold text-maroon uppercase tracking-wider">Shipping Address</span>
                                                </div>
                                                <div className="text-xs text-gray-600 leading-relaxed">
                                                    {formatAddress(selectedOrder.shippingAddress) || <em className="text-gray-400">No address provided</em>}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Order Items */}
                                        <div className="border border-gold/10 rounded-lg overflow-hidden">
                                            <div className="bg-cream/15 p-2 border-b border-gold/10 text-[10px] font-bold text-maroon uppercase tracking-wider flex items-center gap-1.5">
                                                <PackageOpen className="h-3.5 w-3.5" /> Items Registry
                                                <span className="ml-auto text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full font-mono">
                                                    {selectedOrder.items?.length || 0}
                                                </span>
                                            </div>
                                            <Table>
                                                <TableHeader className="bg-slate-50">
                                                    <TableRow className="border-b border-gold/5 hover:bg-transparent">
                                                        <TableHead className="h-7 py-0.5 text-[9px] font-bold text-gray-500">Item</TableHead>
                                                        <TableHead className="h-7 py-0.5 text-[9px] font-bold text-gray-500 text-center">Qty</TableHead>
                                                        <TableHead className="h-7 py-0.5 text-[9px] font-bold text-gray-500 text-right">Price</TableHead>
                                                        <TableHead className="h-7 py-0.5 text-[9px] font-bold text-gray-500 text-right">Total</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {selectedOrder.items?.map((item) => (
                                                        <TableRow key={item.id} className="border-b border-gold/5 h-9">
                                                            <TableCell className="py-1 text-xs">
                                                                <div className="font-semibold text-gray-800 truncate max-w-[140px]">{item.productName}</div>
                                                                {item.sku && <div className="text-[9px] text-gray-400 font-mono">SKU: {item.sku}</div>}
                                                            </TableCell>
                                                            <TableCell className="py-1 text-xs text-center font-mono">{item.quantity}</TableCell>
                                                            <TableCell className="py-1 text-xs text-right font-mono">₹{item.unitPrice.toLocaleString()}</TableCell>
                                                            <TableCell className="py-1 text-xs text-right font-mono">₹{item.totalPrice.toLocaleString()}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>

                                            {/* Financial Summary */}
                                            <div className="p-3.5 bg-slate-50 border-t border-gold/10 space-y-2 text-xs text-gray-600 font-sans">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Subtotal</span>
                                                    <span className="font-mono">₹{selectedOrder.subtotal.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Shipping Fee</span>
                                                    <span className="font-mono">₹{selectedOrder.shippingFee.toLocaleString()}</span>
                                                </div>
                                                {selectedOrder.discount > 0 && (
                                                    <div className="flex justify-between text-red-600">
                                                        <span>Discount</span>
                                                        <span className="font-mono">-₹{selectedOrder.discount.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center font-bold text-maroon border-t border-gold/10 pt-2">
                                                    <span className="text-sm">Total Amount</span>
                                                    <span className="font-mono text-base">₹{selectedOrder.totalAmount.toLocaleString()}</span>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full border-gold/30 hover:bg-gold/10 text-maroon text-xs font-semibold flex items-center justify-center gap-1.5 h-9"
                                                    onClick={() => window.open(`/receipt/${selectedOrder.orderNumber}?print=true`, '_blank')}
                                                >
                                                    <Printer className="h-3.5 w-3.5" />
                                                    Print / Save Receipt
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        {selectedOrder.notes && (
                                            <div className="bg-yellow-50/50 border border-yellow-200/60 p-3 rounded-lg text-xs">
                                                <span className="font-bold text-yellow-800 block text-[10px] uppercase mb-1 flex items-center gap-1">
                                                    <AlertTriangle className="h-3 w-3" /> Notes / Instructions
                                                </span>
                                                <p className="text-gray-700 italic">"{selectedOrder.notes}"</p>
                                            </div>
                                        )}

                                        {/* Action controls (Forms) */}
                                        <div className="border border-gold/10 p-3.5 rounded-lg space-y-3.5 bg-cream/5">
                                            <h4 className="text-[10px] font-bold text-maroon uppercase tracking-wider border-b border-gold/10 pb-2 flex items-center gap-1.5">
                                                <Truck className="h-3.5 w-3.5" /> Fulfillment Control Centre
                                            </h4>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {/* Order status form */}
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-bold text-gray-500 uppercase">Change Fulfillment Status</label>
                                                    <Select value={tempOrderStatus} onValueChange={setTempOrderStatus}>
                                                        <SelectTrigger className="h-9 text-xs border-gold/30 bg-white">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="border-gold/20">
                                                            {ORDER_STATUS_OPTIONS.slice(1).map(opt => (
                                                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                                    {opt.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>

                                                    <Input
                                                        placeholder="Optional status note..."
                                                        className="h-9 text-xs border-gold/30 bg-white"
                                                        value={statusNote}
                                                        onChange={e => setStatusNote(e.target.value)}
                                                    />

                                                    <Button
                                                        size="sm"
                                                        className="w-full bg-maroon text-gold h-8 text-[10px] font-bold"
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
                                                            <SelectTrigger className="h-9 text-xs border-gold/30 bg-white">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="border-gold/20">
                                                                {PAYMENT_STATUS_OPTIONS.slice(1).map(opt => (
                                                                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                                        {opt.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <Button
                                                        size="sm"
                                                        className="w-full bg-slate-800 hover:bg-slate-700 text-gold h-8 text-[10px] font-bold mt-auto"
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
                                        <div className="border border-gold/10 p-3.5 rounded-lg space-y-3 bg-slate-50">
                                            <h4 className="text-[10px] font-bold text-maroon uppercase tracking-wider flex items-center gap-1.5 border-b border-gold/10 pb-2">
                                                <Clock className="h-3.5 w-3.5" /> Order Progress Log
                                            </h4>
                                            <div className="relative pl-4 border-l border-gold/25 space-y-4 py-1 text-xs">
                                                {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 ? (
                                                    selectedOrder.statusHistory.map((history) => (
                                                        <div key={history.id} className="relative space-y-0.5">
                                                            {/* Dot marker */}
                                                            <span className={cn("absolute -left-[20.5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white shadow", getStatusDotClass(history.status))} />

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
                            </motion.div>
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