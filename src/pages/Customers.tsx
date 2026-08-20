import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService, type Customer } from '@/services/customerService';
import {
    Users,
    Search,
    Plus,
    MapPin,
    Phone,
    Loader2,
    Receipt,
    ChevronRight,
    ChevronLeft,
    Trash2,
    Edit3,
    TrendingUp,
    X,
    Save,
    Copy,
    IndianRupee,
    Filter,
    Globe,
    Store,
    ClipboardList,
    Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function CustomersPage() {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);
    const [customerTypeFilter, setCustomerTypeFilter] = React.useState<'all' | 'instore' | 'online'>('all');

    // Add Customer Form states
    const [name, setName] = React.useState('');
    const [mobile, setMobile] = React.useState('');
    const [city, setCity] = React.useState('');
    const [address, setAddress] = React.useState('');

    // Edit Customer Form states
    const [editName, setEditName] = React.useState('');
    const [editMobile, setEditMobile] = React.useState('');
    const [editCity, setEditCity] = React.useState('');
    const [editAddress, setEditAddress] = React.useState('');

    const queryClient = useQueryClient();

    // Fetch all customers
    const { data: customers, isLoading } = useQuery({
        queryKey: ['customers'],
        queryFn: customerService.getCustomers
    });

    // Fetch invoices for selected customer
    const { data: invoices, isLoading: isLoadingInvoices } = useQuery({
        queryKey: ['customerInvoices', selectedCustomerId],
        queryFn: () => {
            const customer = customers?.find(c => c.customerId === selectedCustomerId);
            const type = customer?.type || 'instore';
            return customerService.getCustomerInvoices(selectedCustomerId!, type);
        },
        enabled: !!selectedCustomerId && !!customers
    });

    // Invoice Pagination Logic
    const [invoicePage, setInvoicePage] = React.useState(1);
    const invoicesPerPage = 5;

    React.useEffect(() => {
        setInvoicePage(1);
    }, [selectedCustomerId]);

    const totalInvoicePages = invoices ? Math.ceil(invoices.length / invoicesPerPage) : 0;
    const paginatedInvoices = React.useMemo(() => {
        if (!invoices) return [];
        return invoices.slice(
            (invoicePage - 1) * invoicesPerPage,
            invoicePage * invoicesPerPage
        );
    }, [invoices, invoicePage]);


    const selectedCustomer = React.useMemo(() => {
        return customers?.find(c => c.customerId === selectedCustomerId) || null;
    }, [customers, selectedCustomerId]);

    // Initialize edit form when toggled or customer changes
    React.useEffect(() => {
        if (selectedCustomer) {
            setEditName(selectedCustomer.name);
            setEditMobile(selectedCustomer.mobile);
            setEditCity(selectedCustomer.city);
            setEditAddress(selectedCustomer.address);
        }
    }, [selectedCustomer, isEditing]);

    // Create Customer mutation
    const createMutation = useMutation({
        mutationFn: customerService.createCustomer,
        onSuccess: (newCust) => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            toast.success('Customer registered successfully');
            setIsDialogOpen(false);
            setName('');
            setMobile('');
            setCity('');
            setAddress('');
            setSelectedCustomerId(newCust.customerId);
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to register customer');
        }
    });

    // Update Customer mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) => 
            customerService.updateCustomer(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            toast.success('Profile updated successfully');
            setIsEditing(false);
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to update profile');
        }
    });

    // Delete Customer mutation
    const deleteMutation = useMutation({
        mutationFn: customerService.deleteCustomer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            toast.success('Customer profile deleted');
            setSelectedCustomerId(null);
            setIsEditing(false);
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to delete profile');
        }
    });

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Customer name is required');
            return;
        }
        if (!mobile.trim() || mobile.length < 10) {
            toast.error('Valid mobile number is required');
            return;
        }

        createMutation.mutate({
            name,
            mobile,
            city,
            address
        });
    };

    const handleUpdateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomerId) return;
        if (!editName.trim()) {
            toast.error('Name is required');
            return;
        }
        if (!editMobile.trim() || editMobile.length < 10) {
            toast.error('Valid mobile number is required');
            return;
        }

        updateMutation.mutate({
            id: selectedCustomerId,
            data: {
                name: editName,
                mobile: editMobile,
                city: editCity,
                address: editAddress
            }
        });
    };

    const handleDelete = () => {
        if (!selectedCustomerId) return;
        if (confirm(`Are you sure you want to permanently delete customer profile "${selectedCustomer?.name}"? All transaction associations will remain, but this contact ledger profile will be purged.`)) {
            deleteMutation.mutate(selectedCustomerId);
        }
    };

    // Filter customers list
    const filteredCustomers = React.useMemo(() => {
        if (!customers) return [];
        const term = searchTerm.toLowerCase();
        return customers.filter(customer => {
            const matchesSearch = customer.name.toLowerCase().includes(term) ||
                customer.mobile.includes(term) ||
                customer.city.toLowerCase().includes(term) ||
                (customer.email && customer.email.toLowerCase().includes(term));
            
            const matchesType = customerTypeFilter === 'all' || customer.type === customerTypeFilter;
            
            return matchesSearch && matchesType;
        });
    }, [customers, searchTerm, customerTypeFilter]);

    // Aggregate statistics
    const stats = React.useMemo(() => {
        if (!customers) return { totalCount: 0, totalOutlay: 0, avgSpent: 0 };
        const filtered = customers.filter(c => customerTypeFilter === 'all' || c.type === customerTypeFilter);
        const totalCount = filtered.length;
        const totalOutlay = filtered.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
        const avgSpent = totalCount > 0 ? Math.round(totalOutlay / totalCount) : 0;
        return { totalCount, totalOutlay, avgSpent };
    }, [customers, customerTypeFilter]);

    const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

    // Helper: initials
    const getInitials = (name: string) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    };

    const instoreCount = customers?.filter(c => c.type === 'instore').length || 0;
    const onlineCount = customers?.filter(c => c.type === 'online').length || 0;

    return (
        <div className="space-y-5 max-w-7xl mx-auto px-2 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-maroon to-maroon-dark text-gold rounded-xl shadow-md shadow-maroon/20">
                        <Users className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold font-serif text-maroon tracking-wide">Customer Registry</h1>
                        <p className="text-xs text-gray-500 font-sans">Manage customer profiles, spend analytics & purchase logs</p>
                    </div>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-maroon to-maroon-dark text-gold h-9 text-xs font-bold shadow-md shadow-maroon/20 gap-1.5 hover:shadow-lg hover:shadow-maroon/30 transition-all">
                            <Plus className="h-4 w-4" />
                            Add Profile
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="border-gold/20 max-w-sm">
                        <DialogHeader className="border-b border-gold/10 pb-2">
                            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-maroon font-serif">Register Customer Profile</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateSubmit} className="space-y-3 pt-2">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Customer Name *</label>
                                <Input
                                    required
                                    placeholder="Enter full name"
                                    className="h-9 text-xs border-gold/30 focus-visible:ring-maroon bg-white"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Mobile Number *</label>
                                <Input
                                    required
                                    placeholder="10-digit mobile"
                                    className="h-9 text-xs border-gold/30 font-mono focus-visible:ring-maroon bg-white"
                                    value={mobile}
                                    onChange={(e) => setMobile(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">City</label>
                                    <Input
                                        placeholder="City"
                                        className="h-9 text-xs border-gold/30 focus-visible:ring-maroon bg-white"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Address / Street</label>
                                    <Input
                                        placeholder="Address"
                                        className="h-9 text-xs border-gold/30 focus-visible:ring-maroon bg-white"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                    />
                                </div>
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-maroon to-maroon-dark hover:from-maroon-dark hover:to-maroon-dark text-gold font-bold h-9 text-xs mt-2 uppercase tracking-wider cursor-pointer gap-1.5"
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                                Register Profile
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
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
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Total Profiles</span>
                                <span className="text-2xl font-bold font-mono text-gray-800">{stats.totalCount}</span>
                                <span className="text-[10px] text-gray-400 block">Registered directory</span>
                            </div>
                            <div className="p-2.5 bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl text-white shadow">
                                <Users className="h-5 w-5" />
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
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">In-Store</span>
                                <span className="text-2xl font-bold font-mono text-amber-600">{instoreCount}</span>
                                <span className="text-[10px] text-gray-400 block">Walk-in customers</span>
                            </div>
                            <div className="p-2.5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl text-white shadow">
                                <Store className="h-5 w-5" />
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
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Online</span>
                                <span className="text-2xl font-bold font-mono text-sky-600">{onlineCount}</span>
                                <span className="text-[10px] text-gray-400 block">Web store profiles</span>
                            </div>
                            <div className="p-2.5 bg-gradient-to-br from-sky-500 to-sky-700 rounded-xl text-white shadow">
                                <Globe className="h-5 w-5" />
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
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Total Spend</span>
                                <span className="text-2xl font-bold font-mono text-emerald-600">{formatCurrency(stats.totalOutlay)}</span>
                                <span className="text-[10px] text-gray-400 block">Across all profiles</span>
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
                                placeholder="Search name, phone, city, email..."
                                className="pl-9 h-10 text-sm border-gold/30 bg-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                                <Filter className="h-4 w-4 text-maroon" />
                                <span className="text-[10px] font-bold text-gray-500 uppercase">Type:</span>
                            </div>
                            {([
                                { value: 'all', label: 'All', count: customers?.length || 0 },
                                { value: 'instore', label: 'In-Store', count: instoreCount },
                                { value: 'online', label: 'Online', count: onlineCount },
                            ] as const).map(opt => {
                                const active = customerTypeFilter === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setCustomerTypeFilter(opt.value)}
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
                                            {opt.count}
                                        </span>
                                    </button>
                                );
                            })}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-10 text-xs text-gray-500 gap-1.5"
                                onClick={() => {
                                    setSearchTerm('');
                                    setCustomerTypeFilter('all');
                                }}
                            >
                                <X className="h-3.5 w-3.5" />
                                Clear
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Master-Detail Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Master List (Left Column) */}
                <div className="lg:col-span-5">
                    <Card className="border-gold/20 shadow-md bg-white overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/10 px-4 py-3">
                            <CardTitle className="text-sm font-bold text-maroon uppercase tracking-wider flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <ClipboardList className="h-4 w-4 text-maroon/70" />
                                    Customer Directory
                                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-mono">
                                        {filteredCustomers.length}
                                    </span>
                                </span>
                                <span className="text-[10px] text-gray-500 normal-case font-normal hidden md:inline">Click a profile to view details</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="py-12 text-center text-maroon/50 text-xs italic">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-1 text-maroon" />
                                    Loading customer profiles...
                                </div>
                            ) : filteredCustomers.length === 0 ? (
                                <div className="py-12 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="p-3 bg-gray-100 rounded-full">
                                            <Search className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <p className="text-sm text-gray-500">No matching customers found</p>
                                        <p className="text-xs text-gray-400">Try adjusting your search or filters</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="max-h-[calc(100vh-280px)] overflow-y-auto divide-y divide-gold/10">
                                    {filteredCustomers.map((customer) => {
                                        const isSelected = customer.customerId === selectedCustomerId;
                                        return (
                                            <div
                                                key={customer.customerId}
                                                className={cn(
                                                    "p-3 flex items-center justify-between cursor-pointer transition-all duration-150 border-l-4",
                                                    isSelected
                                                        ? "bg-gold/10 border-maroon"
                                                        : "hover:bg-cream/10 border-transparent"
                                                )}
                                                onClick={() => {
                                                    setSelectedCustomerId(customer.customerId);
                                                    setIsEditing(false);
                                                }}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={cn(
                                                        "h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-xs font-bold border",
                                                        isSelected
                                                            ? "bg-gradient-to-br from-maroon to-maroon-dark text-gold border-gold/50 shadow-sm"
                                                            : "bg-gold/10 text-maroon border-gold/25"
                                                    )}>
                                                        {getInitials(customer.name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-sm font-semibold text-gray-800 truncate">{customer.name}</h4>
                                                        <span className="text-[11px] text-gray-500 font-mono mt-0.5 block truncate max-w-[150px]">
                                                            {customer.mobile || customer.email || 'No contact info'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="text-right flex-shrink-0 pl-2">
                                                    <div className="flex items-center justify-end gap-1 text-sm font-bold font-mono text-maroon">
                                                        <IndianRupee className="h-3 w-3" />
                                                        {(customer.totalSpent || 0).toLocaleString('en-IN')}
                                                    </div>
                                                    <span className="text-[10px] text-gray-500 mt-1 flex items-center justify-end gap-1.5">
                                                        {customer.type === 'online' ? (
                                                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200 inline-flex items-center gap-0.5">
                                                                <Globe className="h-2.5 w-2.5" /> Online
                                                            </span>
                                                        ) : (
                                                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-0.5">
                                                                <Store className="h-2.5 w-2.5" /> In-store
                                                            </span>
                                                        )}
                                                        <span className="text-gray-400">• {customer.totalPurchases} {customer.type === 'online' ? 'orders' : 'bills'}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Detail Workspace (Right Column) */}
                <div className="lg:col-span-7">
                    <AnimatePresence mode="wait">
                        {!selectedCustomerId ? (
                            <motion.div
                                key="empty-crm"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="h-full"
                            >
                                <Card className="border-gold/15 border-dashed border-2 bg-cream-light/5 h-full flex flex-col items-center justify-center text-center p-8 min-h-[420px]">
                                    <div className="p-4 bg-gradient-to-br from-maroon to-maroon-dark rounded-2xl text-gold shadow-lg shadow-maroon/25 mb-4">
                                        <Users className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-maroon font-serif">Inspect Customer Profile</h3>
                                    <p className="text-xs text-gray-400 max-w-sm mt-1.5">
                                        Select a customer from the directory to review contact credentials, gross purchases, and detailed transaction ledger history.
                                    </p>
                                </Card>
                            </motion.div>
                        ) : (
                            <motion.div
                                key={`crm-pane-${selectedCustomerId}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                {/* CRM Info / Edit Card */}
                                <Card className="border-gold/20 shadow-md bg-white overflow-hidden">
                                    <CardHeader className="bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/10 p-4 flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-maroon font-serif">Customer File</CardTitle>
                                            <CardDescription className="text-[10px] text-gray-400 mt-0.5 font-mono">ID: {selectedCustomerId}</CardDescription>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {selectedCustomer?.type === 'online' ? (
                                                <span className="text-[9px] bg-sky-50 text-sky-700 font-bold uppercase tracking-wider px-2 py-0.5 border border-sky-200 rounded-full inline-flex items-center gap-1">
                                                    <Globe className="h-2.5 w-2.5" /> Managed Online
                                                </span>
                                            ) : !isEditing ? (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 text-[10px] border-gold/30 text-maroon hover:bg-gold/5 font-bold uppercase px-2.5 gap-1 cursor-pointer"
                                                        onClick={() => setIsEditing(true)}
                                                    >
                                                        <Edit3 className="h-3 w-3" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-[10px] text-red-500 hover:bg-red-50 hover:text-red-700 font-bold uppercase px-2.5 gap-1 cursor-pointer"
                                                        onClick={handleDelete}
                                                        disabled={deleteMutation.isPending}
                                                    >
                                                        {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                                        Purge
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-[10px] border-gold/30 text-gray-500 hover:bg-gray-50 font-bold uppercase px-2.5 cursor-pointer"
                                                    onClick={() => setIsEditing(false)}
                                                >
                                                    Cancel
                                                </Button>
                                            )}
                                        </div>
                                    </CardHeader>

                                    <CardContent className="p-4">
                                        {!isEditing ? (
                                            <div className="space-y-4">
                                                {/* Customer Card header */}
                                                <div className="flex items-start gap-4">
                                                    <div className="w-14 h-14 shrink-0 rounded-full bg-gradient-to-br from-maroon to-maroon-dark border border-gold/30 flex items-center justify-center text-gold font-serif font-black text-xl shadow-md shadow-maroon/20">
                                                        {selectedCustomer?.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="space-y-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h2 className="text-base font-bold text-gray-900 leading-none">{selectedCustomer?.name}</h2>
                                                            {selectedCustomer?.type === 'online' ? (
                                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200 inline-flex items-center gap-1">
                                                                    <Globe className="h-2.5 w-2.5" /> Online Profile
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                                                                    <Store className="h-2.5 w-2.5" /> In-store Profile
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                                                            <div className="flex items-center text-[11px] text-gray-600 font-mono">
                                                                <Phone className="h-3 w-3 text-maroon mr-1" />
                                                                {selectedCustomer?.mobile || 'No Phone'}
                                                            </div>
                                                            {selectedCustomer?.email && (
                                                                <div className="flex items-center text-[11px] text-gray-600 font-mono">
                                                                    <span className="text-maroon mr-1">✉</span>
                                                                    {selectedCustomer?.email}
                                                                </div>
                                                            )}
                                                            {selectedCustomer?.city && (
                                                                <div className="flex items-center text-[11px] text-gray-600">
                                                                    <MapPin className="h-3 w-3 text-maroon mr-1" />
                                                                    {selectedCustomer?.city}
                                                                    {selectedCustomer?.address && <span className="text-[10px] text-gray-400 ml-1">({selectedCustomer?.address})</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* CRM Stats Grid */}
                                                <div className="grid grid-cols-3 gap-3 border-t border-b border-gold/10 py-3 bg-cream-light/5 rounded-lg">
                                                    <div className="text-center">
                                                        <span className="text-[9px] uppercase font-bold text-gray-500 block">Outlay (Total Spent)</span>
                                                        <span className="text-sm font-black font-mono text-maroon block mt-1">
                                                            {formatCurrency(selectedCustomer?.totalSpent || 0)}
                                                        </span>
                                                    </div>
                                                    <div className="text-center border-l border-r border-gold/10">
                                                        <span className="text-[9px] uppercase font-bold text-gray-500 block">
                                                            {selectedCustomer?.type === 'online' ? 'Order Count' : 'Visit Frequency'}
                                                        </span>
                                                        <span className="text-sm font-black font-mono text-maroon block mt-1">
                                                            {selectedCustomer?.totalPurchases || 0} {selectedCustomer?.type === 'online' ? 'orders' : 'bills'}
                                                        </span>
                                                    </div>
                                                    <div className="text-center">
                                                        <span className="text-[9px] uppercase font-bold text-gray-500 block">Average Ticket (ATV)</span>
                                                        <span className="text-sm font-black font-mono text-emerald-700 block mt-1">
                                                            {formatCurrency(
                                                                selectedCustomer && selectedCustomer.totalPurchases > 0 
                                                                    ? Math.round(selectedCustomer.totalSpent / selectedCustomer.totalPurchases)
                                                                    : 0
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* EDIT PROFILE FORM */
                                            <form onSubmit={handleUpdateSubmit} className="space-y-3 pt-1">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Customer Name *</label>
                                                        <Input
                                                            required
                                                            placeholder="Edit Name"
                                                            className="h-9 text-xs border-gold/30 focus-visible:ring-maroon bg-white"
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Mobile Number *</label>
                                                        <Input
                                                            required
                                                            placeholder="Edit Mobile"
                                                            className="h-9 text-xs border-gold/30 font-mono focus-visible:ring-maroon bg-white"
                                                            value={editMobile}
                                                            onChange={(e) => setEditMobile(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase">City</label>
                                                        <Input
                                                            placeholder="Edit City"
                                                            className="h-9 text-xs border-gold/30 focus-visible:ring-maroon bg-white"
                                                            value={editCity}
                                                            onChange={(e) => setEditCity(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Address / Street</label>
                                                        <Input
                                                            placeholder="Edit Address"
                                                            className="h-9 text-xs border-gold/30 focus-visible:ring-maroon bg-white"
                                                            value={editAddress}
                                                            onChange={(e) => setEditAddress(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex justify-end pt-1">
                                                    <Button
                                                        type="submit"
                                                        className="bg-gradient-to-r from-maroon to-maroon-dark hover:from-maroon-dark hover:to-maroon-dark text-gold font-bold h-9 text-[10px] gap-1 px-4 uppercase tracking-wider cursor-pointer"
                                                        disabled={updateMutation.isPending}
                                                    >
                                                        {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                                        Save Changes
                                                    </Button>
                                                </div>
                                            </form>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Invoice History timeline */}
                                <Card className="border-gold/20 shadow-md bg-white overflow-hidden">
                                    <CardHeader className="bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/10 p-4">
                                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-maroon font-serif flex items-center justify-between">
                                            <span className="flex items-center gap-1.5">
                                                <Receipt className="h-4 w-4 text-maroon/70" />
                                                {selectedCustomer?.type === 'online' ? 'Online Orders Ledger' : 'Purchase Timeline Ledger'}
                                            </span>
                                            <span className="text-[10px] font-normal text-gray-500 normal-case">
                                                {invoices?.length || 0} {selectedCustomer?.type === 'online' ? 'orders' : 'records'}
                                            </span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {isLoadingInvoices ? (
                                            <div className="py-10 text-center text-gray-400 text-xs italic">
                                                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1 text-maroon" />
                                                Loading records...
                                            </div>
                                        ) : !invoices || invoices.length === 0 ? (
                                            <div className="py-10 text-center text-gray-400 text-xs italic">
                                                <div className="p-3 bg-gray-100 rounded-full inline-flex mb-2">
                                                    <Wallet className="h-5 w-5 text-gray-400" />
                                                </div>
                                                {selectedCustomer?.type === 'online' ? 'No online orders registered for this profile.' : 'No invoices registered for this profile.'}
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader className="bg-cream/10">
                                                        <TableRow className="border-b border-gold/10 hover:bg-transparent">
                                                            <TableHead className="h-10 text-[10px] font-bold text-maroon py-1 px-3">Date</TableHead>
                                                            <TableHead className="h-10 text-[10px] font-bold text-maroon py-1">
                                                                {selectedCustomer?.type === 'online' ? 'Order #' : 'Invoice #'}
                                                            </TableHead>
                                                            <TableHead className="h-10 text-[10px] font-bold text-maroon py-1">Details (Saree Models)</TableHead>
                                                            <TableHead className="h-10 text-[10px] font-bold text-maroon text-right py-1 px-3">Amount</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {paginatedInvoices.map((inv) => (
                                                            <TableRow key={inv.id} className="hover:bg-cream/10 border-b border-gold/5">
                                                                <TableCell className="py-2 text-[11px] font-mono text-gray-500 px-3 whitespace-nowrap">
                                                                    {new Date(inv.created_at).toLocaleDateString()}
                                                                </TableCell>
                                                                <TableCell className="py-2 text-[11px] font-mono text-gray-500">
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="truncate max-w-[110px]" title={inv.invoice_number}>
                                                                            {inv.invoice_number || 'N/A'}
                                                                        </span>
                                                                        {inv.invoice_number && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    navigator.clipboard.writeText(inv.invoice_number || '');
                                                                                    toast.success(selectedCustomer?.type === 'online' ? 'Order # copied!' : 'Invoice # copied!');
                                                                                }}
                                                                                className="text-gray-400 hover:text-maroon p-0.5 rounded hover:bg-gray-100 transition-all cursor-pointer flex-shrink-0"
                                                                                title={selectedCustomer?.type === 'online' ? 'Copy Order Number' : 'Copy Invoice Number'}
                                                                            >
                                                                                <Copy className="h-3 w-3" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="py-2 text-xs text-gray-700 truncate max-w-[200px]" title={
                                                                    inv.sale_items?.map((item: any) => 
                                                                        `${item.inventory?.saree_name || 'Saree'} (x${item.quantity})`
                                                                    ).join(', ')
                                                                }>
                                                                    {inv.sale_items?.map((item: any) => 
                                                                        `${item.inventory?.saree_name || 'Saree'} (x${item.quantity})`
                                                                    ).join(', ') || 'No items listed'}
                                                                </TableCell>
                                                                <TableCell className="py-2 text-sm font-bold text-right text-maroon font-mono px-3">
                                                                    {formatCurrency(inv.total_amount || 0)}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                                
                                                {/* Pagination Controls */}
                                                {totalInvoicePages > 1 && invoices && (
                                                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-gold/10 bg-cream/5">
                                                        <p className="text-[10px] text-gray-500">
                                                            Showing <span className="font-bold">{(invoicePage - 1) * invoicesPerPage + 1}</span> - <span className="font-bold">{Math.min(invoicePage * invoicesPerPage, invoices.length)}</span> of <span className="font-bold">{invoices.length}</span>
                                                        </p>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="border-gold/20 text-maroon h-7 w-7 p-0 hover:bg-cream/10 cursor-pointer"
                                                                onClick={() => setInvoicePage(prev => Math.max(1, prev - 1))}
                                                                disabled={invoicePage === 1}
                                                            >
                                                                <ChevronLeft className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <span className="text-[10px] font-mono text-gray-500 px-2">Page {invoicePage} of {totalInvoicePages}</span>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="border-gold/20 text-maroon h-7 w-7 p-0 hover:bg-cream/10 cursor-pointer"
                                                                onClick={() => setInvoicePage(prev => Math.min(totalInvoicePages, prev + 1))}
                                                                disabled={invoicePage === totalInvoicePages}
                                                            >
                                                                <ChevronRight className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}