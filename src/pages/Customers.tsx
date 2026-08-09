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
    Calendar,
    Receipt,
    ChevronRight,
    ChevronLeft,
    Trash2,

    Edit3,
    TrendingUp,
    Coins,
    FileText,
    CheckCircle,
    X,
    Save,
    Copy
} from 'lucide-react';
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
        queryFn: () => customerService.getCustomerInvoices(selectedCustomerId!),
        enabled: !!selectedCustomerId
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
        return customers.filter(customer =>
            customer.name.toLowerCase().includes(term) ||
            customer.mobile.includes(term) ||
            customer.city.toLowerCase().includes(term)
        );
    }, [customers, searchTerm]);

    // Aggregate statistics
    const stats = React.useMemo(() => {
        if (!customers) return { totalCount: 0, totalOutlay: 0, avgSpent: 0 };
        const totalCount = customers.length;
        const totalOutlay = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
        const avgSpent = totalCount > 0 ? Math.round(totalOutlay / totalCount) : 0;
        return { totalCount, totalOutlay, avgSpent };
    }, [customers]);

    const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

    return (
        <div className="space-y-4 max-w-7xl mx-auto px-4 py-2">
            {/* Header Section */}
            <div className="flex items-center justify-between border-b border-gold/15 pb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-maroon/5 rounded-md border border-gold/20">
                        <Users className="h-4.5 w-4.5 text-maroon" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black font-serif text-maroon tracking-wider uppercase">CRM Customer Registry</h1>
                        <p className="text-[10px] text-gray-500 font-sans mt-0.5">Manage customer directory profiles, spent aggregations, and individual purchase logs</p>
                    </div>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-maroon hover:bg-maroon-dark text-gold font-bold h-7.5 text-[9px] gap-1 px-3 uppercase tracking-wider cursor-pointer">
                            <Plus className="h-3.5 w-3.5" />
                            Add Profile
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="border-gold/20 max-w-sm">
                        <DialogHeader className="border-b border-gold/10 pb-2">
                            <DialogTitle className="text-xs font-bold uppercase tracking-wider text-maroon font-serif">Register Customer Profile</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateSubmit} className="space-y-3 pt-2">
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-500 uppercase">Customer Name *</label>
                                <Input
                                    required
                                    placeholder="Enter full name"
                                    className="h-8 text-xs border-gold/30 focus-visible:ring-maroon bg-white"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-500 uppercase">Mobile Number *</label>
                                <Input
                                    required
                                    placeholder="10-digit mobile"
                                    className="h-8 text-xs border-gold/30 font-mono focus-visible:ring-maroon bg-white"
                                    value={mobile}
                                    onChange={(e) => setMobile(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-500 uppercase">City</label>
                                    <Input
                                        placeholder="City"
                                        className="h-8 text-xs border-gold/30 focus-visible:ring-maroon bg-white"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-gray-500 uppercase">Address / Street</label>
                                    <Input
                                        placeholder="Address"
                                        className="h-8 text-xs border-gold/30 focus-visible:ring-maroon bg-white"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                    />
                                </div>
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-maroon hover:bg-maroon-dark text-gold font-bold h-8 text-xs mt-2 uppercase tracking-wider cursor-pointer"
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : 'Register Profile'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Asymmetric Split Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* LEFT COLUMN: REGISTRY DIRECTORY (col-span-5) */}
                <div className="lg:col-span-5 space-y-3">
                    
                    {/* Small stats banner */}
                    <div className="grid grid-cols-3 gap-2">
                        <Card className="border-gold/15 p-2 bg-cream/5 shadow-none flex flex-col justify-center">
                            <span className="text-[7.5px] uppercase font-bold text-gray-400">Profiles</span>
                            <span className="text-xs font-black font-mono text-maroon mt-0.5">{stats.totalCount}</span>
                        </Card>
                        <Card className="border-gold/15 p-2 bg-cream/5 shadow-none flex flex-col justify-center">
                            <span className="text-[7.5px] uppercase font-bold text-gray-400">Total Spent</span>
                            <span className="text-xs font-black font-mono text-maroon mt-0.5">{formatCurrency(stats.totalOutlay)}</span>
                        </Card>
                        <Card className="border-gold/15 p-2 bg-cream/5 shadow-none flex flex-col justify-center">
                            <span className="text-[7.5px] uppercase font-bold text-gray-400">Avg Outlay</span>
                            <span className="text-xs font-black font-mono text-emerald-700 mt-0.5">{formatCurrency(stats.avgSpent)}</span>
                        </Card>
                    </div>

                    <Card className="border-gold/15 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="bg-cream/10 border-b border-gold/10 p-2.5">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-450" />
                                <Input
                                    placeholder="Search directory name, mobile, city..."
                                    className="pl-8 h-8 text-[11px] border-gold/20 focus-visible:ring-maroon bg-white/70"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="py-12 text-center text-maroon/50 text-xs italic">
                                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-1 text-maroon" />
                                    Loading customer ledger profiles...
                                </div>
                            ) : filteredCustomers.length === 0 ? (
                                <div className="py-12 text-center text-gray-400 text-xs italic">
                                    No profile matches the query criteria
                                </div>
                            ) : (
                                <div className="max-h-[60vh] overflow-y-auto divide-y divide-gold/10">
                                    {filteredCustomers.map((customer) => {
                                        const isSelected = customer.customerId === selectedCustomerId;
                                        return (
                                            <div
                                                key={customer.customerId}
                                                className={`p-2.5 flex items-center justify-between cursor-pointer transition-all duration-150 ${
                                                    isSelected 
                                                        ? 'bg-cream/20 border-l-4 border-maroon' 
                                                        : 'hover:bg-cream/5 border-l-4 border-transparent'
                                                }`}
                                                onClick={() => {
                                                    setSelectedCustomerId(customer.customerId);
                                                    setIsEditing(false);
                                                }}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 border ${
                                                        isSelected 
                                                            ? 'bg-maroon text-gold border-gold/50' 
                                                            : 'bg-gold/10 text-maroon border-gold/25'
                                                    }`}>
                                                        {customer.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-xs font-bold text-gray-800 truncate">{customer.name}</h4>
                                                        <span className="text-[9px] text-gray-450 font-mono mt-0.5 block">{customer.mobile}</span>
                                                    </div>
                                                </div>

                                                <div className="text-right flex-shrink-0 pl-2">
                                                    <div className="text-[10px] font-black font-mono text-maroon">
                                                        {formatCurrency(customer.totalSpent || 0)}
                                                    </div>
                                                    <span className="text-[8px] text-gray-400 font-sans mt-0.5 block">
                                                        {customer.city || 'WALK-IN'} • {customer.totalPurchases} visit(s)
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

                {/* RIGHT COLUMN: DETAIL WORKSPACE (col-span-7) */}
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
                                <Card className="border-gold/15 border-dashed border-2 bg-cream-light/5 h-full flex flex-col items-center justify-center text-center p-8 min-h-[300px]">
                                    <div className="p-3 bg-cream/20 rounded-full border border-gold/20 mb-3 text-gold">
                                        <Users className="h-6 w-6 text-maroon" />
                                    </div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-maroon font-serif">Inspect CRM Registry Profile</h3>
                                    <p className="text-[10px] text-gray-400 max-w-sm mt-1">
                                        Select a customer from the left-side database catalog to review contact credentials, gross purchases, and detailed transaction ledger history.
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
                                <Card className="border-gold/15 shadow-sm bg-white overflow-hidden">
                                    <CardHeader className="bg-cream/10 border-b border-gold/10 p-3 flex flex-row items-center justify-between">
                                        <div>
                                            <CardTitle className="text-xs font-bold uppercase tracking-widest text-maroon font-serif">Customer File</CardTitle>
                                            <CardDescription className="text-[8px] text-gray-400 mt-0.5">ID: {selectedCustomerId}</CardDescription>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {!isEditing ? (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-[9px] border-gold/30 text-maroon hover:bg-gold/5 font-bold uppercase px-2 gap-1 cursor-pointer"
                                                        onClick={() => setIsEditing(true)}
                                                    >
                                                        <Edit3 className="h-3 w-3" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-[9px] text-red-750 hover:bg-red-50 hover:text-red-800 font-bold uppercase px-2 gap-1 cursor-pointer"
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
                                                    className="h-7 text-[9px] border-gold/30 text-gray-500 hover:bg-gray-50 font-bold uppercase px-2 cursor-pointer"
                                                    onClick={() => setIsEditing(false)}
                                                >
                                                    Cancel
                                                </Button>
                                            )}
                                        </div>
                                    </CardHeader>

                                    <CardContent className="p-3">
                                        {!isEditing ? (
                                            <div className="space-y-4">
                                                {/* Customer Card header */}
                                                <div className="flex items-start gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-maroon/5 border border-gold/30 flex items-center justify-center text-maroon font-serif font-black text-lg shadow-inner">
                                                        {selectedCustomer?.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h2 className="text-sm font-bold text-gray-900 leading-none">{selectedCustomer?.name}</h2>
                                                        
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                                            <div className="flex items-center text-[10px] text-gray-600 font-mono">
                                                                <Phone className="h-3 w-3 text-gold mr-1" />
                                                                {selectedCustomer?.mobile}
                                                            </div>
                                                            {selectedCustomer?.city && (
                                                                <div className="flex items-center text-[10px] text-gray-600">
                                                                    <MapPin className="h-3 w-3 text-gold mr-1" />
                                                                    {selectedCustomer?.city}
                                                                    {selectedCustomer?.address && <span className="text-[9px] text-gray-400 ml-1">({selectedCustomer?.address})</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* CRM Stats Grid */}
                                                <div className="grid grid-cols-3 gap-3 border-t border-b border-gold/10 py-3 bg-cream-light/3">
                                                    <div className="text-center">
                                                        <span className="text-[7.5px] uppercase font-bold text-gray-450 block">Outlay (Total Spent)</span>
                                                        <span className="text-xs font-black font-mono text-maroon block mt-0.5">
                                                            {formatCurrency(selectedCustomer?.totalSpent || 0)}
                                                        </span>
                                                    </div>
                                                    <div className="text-center border-l border-r border-gold/10">
                                                        <span className="text-[7.5px] uppercase font-bold text-gray-450 block">Visit Frequency</span>
                                                        <span className="text-xs font-black font-mono text-maroon block mt-0.5">
                                                            {selectedCustomer?.totalPurchases || 0} bills
                                                        </span>
                                                    </div>
                                                    <div className="text-center">
                                                        <span className="text-[7.5px] uppercase font-bold text-gray-450 block">Average Ticket (ATV)</span>
                                                        <span className="text-xs font-black font-mono text-emerald-700 block mt-0.5">
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
                                                        <label className="text-[9px] font-bold text-gray-500 uppercase">Customer Name *</label>
                                                        <Input
                                                            required
                                                            placeholder="Edit Name"
                                                            className="h-8 text-xs border-gold/30 focus-visible:ring-maroon bg-white"
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-bold text-gray-500 uppercase">Mobile Number *</label>
                                                        <Input
                                                            required
                                                            placeholder="Edit Mobile"
                                                            className="h-8 text-xs border-gold/30 font-mono focus-visible:ring-maroon bg-white"
                                                            value={editMobile}
                                                            onChange={(e) => setEditMobile(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-bold text-gray-500 uppercase">City</label>
                                                        <Input
                                                            placeholder="Edit City"
                                                            className="h-8 text-xs border-gold/30 focus-visible:ring-maroon bg-white"
                                                            value={editCity}
                                                            onChange={(e) => setEditCity(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-bold text-gray-500 uppercase">Address / Street</label>
                                                        <Input
                                                            placeholder="Edit Address"
                                                            className="h-8 text-xs border-gold/30 focus-visible:ring-maroon bg-white"
                                                            value={editAddress}
                                                            onChange={(e) => setEditAddress(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex justify-end pt-1">
                                                    <Button
                                                        type="submit"
                                                        className="bg-maroon hover:bg-maroon-dark text-gold font-bold h-7.5 text-[9px] gap-1 px-4 uppercase tracking-wider cursor-pointer"
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
                                <Card className="border-gold/15 shadow-sm bg-white overflow-hidden">
                                    <CardHeader className="bg-cream/10 border-b border-gold/10 p-3">
                                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-maroon font-serif flex items-center gap-1.5">
                                            <Receipt className="h-3.5 w-3.5" />
                                            Purchase Timeline Ledger
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {isLoadingInvoices ? (
                                            <div className="py-8 text-center text-gray-400 text-xs italic">
                                                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1 text-maroon" />
                                                Loading invoices...
                                            </div>
                                        ) : !invoices || invoices.length === 0 ? (
                                            <div className="py-8 text-center text-gray-400 text-xs italic">
                                                No invoices registered for this profile.
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader className="bg-cream/5">
                                                        <TableRow className="border-b border-gold/10 hover:bg-transparent">
                                                            <TableHead className="h-7 text-[8px] font-bold text-maroon py-0.5">Date</TableHead>
                                                            <TableHead className="h-7 text-[8px] font-bold text-maroon py-0.5">Invoice #</TableHead>
                                                            <TableHead className="h-7 text-[8px] font-bold text-maroon py-0.5">Details (Saree Models)</TableHead>
                                                            <TableHead className="h-7 text-[8px] font-bold text-maroon text-right py-0.5">Amount</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {paginatedInvoices.map((inv) => (
                                                            <TableRow key={inv.id} className="hover:bg-cream/5 border-b border-gold/5 h-8.5">
                                                                <TableCell className="py-1 text-[9px] font-mono text-gray-500">
                                                                    {new Date(inv.created_at).toLocaleDateString()}
                                                                </TableCell>
                                                                <TableCell className="py-1 text-[9px] font-mono text-gray-500">
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="truncate max-w-[85px]" title={inv.invoice_number}>
                                                                            {inv.invoice_number || 'N/A'}
                                                                        </span>
                                                                        {inv.invoice_number && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    navigator.clipboard.writeText(inv.invoice_number || '');
                                                                                    toast.success('Invoice # copied!');
                                                                                }}
                                                                                className="text-gray-400 hover:text-maroon p-0.5 rounded hover:bg-gray-100 transition-all cursor-pointer flex-shrink-0"
                                                                                title="Copy Invoice Number"
                                                                            >
                                                                                <Copy className="h-2.5 w-2.5" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="py-1 text-[10px] text-gray-700 truncate max-w-[180px]" title={
                                                                    inv.sale_items?.map((item: any) => 
                                                                        `${item.inventory?.saree_name || 'Saree'} (x${item.quantity})`
                                                                    ).join(', ')
                                                                }>
                                                                    {inv.sale_items?.map((item: any) => 
                                                                        `${item.inventory?.saree_name || 'Saree'} (x${item.quantity})`
                                                                    ).join(', ') || 'No items listed'}
                                                                </TableCell>
                                                                <TableCell className="py-1 text-xs font-bold text-right text-maroon font-mono">
                                                                    {formatCurrency(inv.total_amount || 0)}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                                
                                                {/* Pagination Controls */}
                                                {totalInvoicePages > 1 && invoices && (
                                                    <div className="flex items-center justify-between px-3 py-1.5 border-t border-gold/10 bg-cream/5">
                                                        <p className="text-[9px] text-gray-500">
                                                            Showing <span className="font-bold">{(invoicePage - 1) * invoicesPerPage + 1}</span> - <span className="font-bold">{Math.min(invoicePage * invoicesPerPage, invoices.length)}</span> of <span className="font-bold">{invoices.length}</span>
                                                        </p>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="border-gold/20 text-maroon h-6 w-6 p-0 hover:bg-cream/10 cursor-pointer"
                                                                onClick={() => setInvoicePage(prev => Math.max(1, prev - 1))}
                                                                disabled={invoicePage === 1}
                                                            >
                                                                <ChevronLeft className="h-3 w-3" />
                                                            </Button>
                                                            <span className="text-[9px] font-mono text-gray-650 px-2">Page {invoicePage} of {totalInvoicePages}</span>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="border-gold/20 text-maroon h-6 w-6 p-0 hover:bg-cream/10 cursor-pointer"
                                                                onClick={() => setInvoicePage(prev => Math.min(totalInvoicePages, prev + 1))}
                                                                disabled={invoicePage === totalInvoicePages}
                                                            >
                                                                <ChevronRight className="h-3 w-3" />
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
