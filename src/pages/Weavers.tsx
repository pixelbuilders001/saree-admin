import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { weaverService, type WeaverWithStats, type WeaverActivity } from '@/services/weaverService';
import { inventoryService } from '@/services/inventoryService';
import { purchaseService } from '@/services/purchaseService';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Truck,
    Search,
    Plus,
    MapPin,
    Phone,
    Loader2,
    Calendar,
    Coins,
    UserCheck,
    Building2,
    UserPlus,
    ChevronRight,
    ArrowUpRight,
    ArrowDownLeft,
    Clock,
    FileSpreadsheet,
    DollarSign,
    Layers,
    CreditCard,
    Edit3,
    Trash2,
    Download,
    PlusCircle,
    Info,
    Filter
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
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function WeaversPage() {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [selectedWeaverId, setSelectedWeaverId] = React.useState<string | null>(null);
    const [isAddWeaverOpen, setIsAddWeaverOpen] = React.useState(false);
    const [isEditWeaverOpen, setIsEditWeaverOpen] = React.useState(false);
    const [isRecordPaymentOpen, setIsRecordPaymentOpen] = React.useState(false);
    const [isAddPurchaseOpen, setIsAddPurchaseOpen] = React.useState(false);

    // Filter states for Statement
    const [startDate, setStartDate] = React.useState('');
    const [endDate, setEndDate] = React.useState('');
    const [txTypeFilter, setTxTypeFilter] = React.useState<'all' | 'purchase' | 'payment'>('all');

    // Add Weaver Form State
    const [weaverName, setWeaverName] = React.useState('');
    const [weaverMobile, setWeaverMobile] = React.useState('');
    const [weaverCity, setWeaverCity] = React.useState('Banaras');
    const [weaverNotes, setWeaverNotes] = React.useState('');

    // Edit Weaver Form State
    const [editName, setEditName] = React.useState('');
    const [editMobile, setEditMobile] = React.useState('');
    const [editCity, setEditCity] = React.useState('');
    const [editNotes, setEditNotes] = React.useState('');

    // Record Payment Form State
    const [paymentAmount, setPaymentAmount] = React.useState('');
    const [paymentMethod, setPaymentMethod] = React.useState<'Cash' | 'UPI'>('UPI');
    const [paymentNotes, setPaymentNotes] = React.useState('');

    // Log Stock Purchase Form State
    const [selectedSareeId, setSelectedSareeId] = React.useState('');
    const [purchaseQty, setPurchaseQty] = React.useState('1');
    const [purchasePriceVal, setPurchasePriceVal] = React.useState('');

    const queryClient = useQueryClient();

    // Fetch weavers and calculated ledger totals
    const { data: weavers, isLoading: isLoadingWeavers } = useQuery({
        queryKey: ['weaversWithLedger'],
        queryFn: weaverService.getWeaversWithLedger
    });

    const selectedWeaver = weavers?.find(w => w.id === selectedWeaverId) || null;

    // Fetch weaver specific activity history (purchases and payments)
    const { data: activities, isLoading: isLoadingActivities } = useQuery({
        queryKey: ['weaverActivity', selectedWeaverId, selectedWeaver?.name],
        queryFn: () => {
            if (!selectedWeaverId || !selectedWeaver) return Promise.resolve([]);
            return weaverService.getWeaverActivity(selectedWeaverId, selectedWeaver.name);
        },
        enabled: !!selectedWeaverId && !!selectedWeaver
    });

    // Fetch all active inventory sarees to allow direct purchase logging
    const { data: sarees } = useQuery({
        queryKey: ['sarees'],
        queryFn: inventoryService.getSarees
    });

    // Automatically select the first weaver when list loads and none is selected
    React.useEffect(() => {
        if (weavers && weavers.length > 0 && !selectedWeaverId) {
            setSelectedWeaverId(weavers[0].id);
        }
    }, [weavers, selectedWeaverId]);

    // Populate Edit Form fields when selectedWeaver changes
    React.useEffect(() => {
        if (selectedWeaver) {
            setEditName(selectedWeaver.name);
            setEditMobile(selectedWeaver.mobile);
            setEditCity(selectedWeaver.city);
            setEditNotes(selectedWeaver.notes || '');
        }
    }, [selectedWeaver]);

    // Autofill default purchase price when a saree is selected for direct procurement
    const selectedSareeObj = sarees?.find(s => s.id === selectedSareeId);
    React.useEffect(() => {
        if (selectedSareeObj) {
            setPurchasePriceVal(selectedSareeObj.purchasePrice.toString());
        }
    }, [selectedSareeId, selectedSareeObj]);

    // Mutation: Create Custom Weaver
    const createWeaverMutation = useMutation({
        mutationFn: weaverService.createWeaver,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['weaversWithLedger'] });
            toast.success(`Weaver ${data.name} saved successfully!`);
            setIsAddWeaverOpen(false);
            setWeaverName('');
            setWeaverMobile('');
            setWeaverCity('Banaras');
            setWeaverNotes('');
            setSelectedWeaverId(data.id);
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to create weaver profile');
        }
    });

    // Mutation: Update Weaver Profile
    const updateWeaverMutation = useMutation({
        mutationFn: ({ id, name, mobile, city, notes }: { id: string, name: string, mobile: string, city: string, notes: string }) =>
            weaverService.updateWeaver(id, { name, mobile, city, notes }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['weaversWithLedger'] });
            toast.success(`Weaver ${data.name} updated successfully!`);
            setIsEditWeaverOpen(false);
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to update weaver profile');
        }
    });

    // Mutation: Delete Weaver Profile
    const deleteWeaverMutation = useMutation({
        mutationFn: weaverService.deleteWeaver,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['weaversWithLedger'] });
            toast.success('Weaver profile deleted successfully');
            setSelectedWeaverId(null);
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to delete weaver profile');
        }
    });

    // Mutation: Record payment transaction inside local database
    const recordPaymentMutation = useMutation({
        mutationFn: weaverService.recordPayment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['weaversWithLedger'] });
            queryClient.invalidateQueries({ queryKey: ['weaverActivity', selectedWeaverId] });
            toast.success('Weaver payment transaction recorded!');
            setIsRecordPaymentOpen(false);
            setPaymentAmount('');
            setPaymentNotes('');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to submit payment transaction');
        }
    });

    // Mutation: Void Payment Transaction
    const deletePaymentMutation = useMutation({
        mutationFn: weaverService.deletePayment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['weaversWithLedger'] });
            queryClient.invalidateQueries({ queryKey: ['weaverActivity', selectedWeaverId] });
            toast.success('Payment transaction voided and ledger adjusted');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to delete payment transaction');
        }
    });

    // Mutation: Direct Procurement Purchase Entry
    const createPurchaseMutation = useMutation({
        mutationFn: purchaseService.createPurchase,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['weaversWithLedger'] });
            queryClient.invalidateQueries({ queryKey: ['weaverActivity', selectedWeaverId] });
            queryClient.invalidateQueries({ queryKey: ['sarees'] });
            toast.success('Goods purchase and ledger liability recorded!');
            setIsAddPurchaseOpen(false);
            setSelectedSareeId('');
            setPurchaseQty('1');
            setPurchasePriceVal('');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to log purchase');
        }
    });

    const handleCreateWeaver = (e: React.FormEvent) => {
        e.preventDefault();
        if (!weaverName.trim()) {
            toast.error('Weaver name is required');
            return;
        }
        if (!weaverMobile.trim() || weaverMobile.length < 10) {
            toast.error('Please enter a valid 10-digit mobile number');
            return;
        }

        createWeaverMutation.mutate({
            name: weaverName,
            mobile: weaverMobile,
            city: weaverCity,
            notes: weaverNotes
        });
    };

    const handleUpdateWeaver = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWeaverId) return;
        if (!editName.trim()) {
            toast.error('Weaver name is required');
            return;
        }
        if (!editMobile.trim() || editMobile.length < 10) {
            toast.error('Please enter a valid 10-digit mobile number');
            return;
        }

        updateWeaverMutation.mutate({
            id: selectedWeaverId,
            name: editName,
            mobile: editMobile,
            city: editCity,
            notes: editNotes
        });
    };

    const handleDeleteWeaver = () => {
        if (!selectedWeaverId || !selectedWeaver) return;
        if (window.confirm(`Are you absolutely sure you want to delete ${selectedWeaver.name}? This will clear the profile and payout history.`)) {
            deleteWeaverMutation.mutate(selectedWeaverId);
        }
    };

    const handleRecordPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWeaverId) return;

        const amountNum = parseFloat(paymentAmount);
        if (isNaN(amountNum) || amountNum <= 0) {
            toast.error('Please enter a valid payment amount (> 0)');
            return;
        }

        recordPaymentMutation.mutate({
            weaverId: selectedWeaverId,
            amount: amountNum,
            paymentMethod,
            notes: paymentNotes
        });
    };

    const handleCreatePurchase = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWeaver) return;
        if (!selectedSareeId) {
            toast.error('Please select a saree model from inventory');
            return;
        }
        const qtyNum = parseInt(purchaseQty);
        const priceNum = parseFloat(purchasePriceVal);
        if (isNaN(qtyNum) || qtyNum <= 0) {
            toast.error('Please enter a valid quantity');
            return;
        }
        if (isNaN(priceNum) || priceNum <= 0) {
            toast.error('Please enter a valid purchase price');
            return;
        }

        createPurchaseMutation.mutate({
            sareeId: selectedSareeId,
            sareeName: selectedSareeObj?.sareeName || 'Saree',
            quantity: qtyNum,
            purchasePrice: priceNum,
            supplier: selectedWeaver.name
        });
    };

    // Filter weavers list by search term
    const filteredWeavers = Array.isArray(weavers)
        ? weavers.filter(weaver =>
            weaver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            weaver.mobile.includes(searchTerm) ||
            weaver.city.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : [];

    // Filter weaver activities by date range and type
    const filteredActivities = React.useMemo(() => {
        if (!activities) return [];
        return activities.filter(act => {
            // Type filter
            if (txTypeFilter !== 'all' && act.type !== txTypeFilter) {
                return false;
            }
            // Date filter
            const actDate = act.date.split('T')[0];
            if (startDate && actDate < startDate) return false;
            if (endDate && actDate > endDate) return false;
            return true;
        });
    }, [activities, startDate, endDate, txTypeFilter]);

    // Export Statement to CSV
    const exportStatementToCSV = () => {
        if (!selectedWeaver || filteredActivities.length === 0) {
            toast.error('No transaction records to export in the selected range');
            return;
        }

        const headers = ['Date', 'Transaction ID', 'Type', 'Description', 'Details', 'Debit/Credit Amount (₹)'];
        const rows = filteredActivities.map(act => [
            new Date(act.date).toLocaleDateString(),
            act.id,
            act.type.toUpperCase(),
            `"${act.description}"`,
            `"${act.details || ''}"`,
            (act.type === 'purchase' ? '+' : '-') + act.amount.toString()
        ]);

        const csvContent = [
            `Shree Banarasi Sarees - Weaver Ledger Statement`,
            `Vendor Name: ${selectedWeaver.name}`,
            `Cluster: ${selectedWeaver.city} | Mobile: ${selectedWeaver.mobile}`,
            `Period: ${startDate || 'Start'} to ${endDate || 'Latest'}`,
            `Account Summary: Total Goods Received: ₹${selectedWeaver.totalGoods} | Total Paid: ₹${selectedWeaver.totalPaid} | Current Outstanding Balance: ₹${selectedWeaver.balance}`,
            '',
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `ledger_statement_${selectedWeaver.name.replace(/\s+/g, '_')}_${startDate || 'start'}_to_${endDate || 'end'}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Statement exported for ${selectedWeaver.name}`);
    };

    const formatCurrency = (val: number) => `₹${(val || 0).toLocaleString('en-IN')}`;

    // Layout animations
    const listVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.04 }
        }
    };

    return (
        <motion.div 
            className="space-y-4 max-w-7xl mx-auto px-4 py-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gold/15 pb-3 gap-2">
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-maroon/5 rounded-md border border-gold/20">
                        <Truck className="h-4 w-4 text-maroon" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black font-serif text-maroon tracking-wider uppercase">Weavers Ledger Account</h1>
                        <p className="text-[10px] text-gray-500 font-sans mt-0.5">Procurement tracking, payouts log, and outstanding supplier liabilities audit</p>
                    </div>
                </div>

                <Dialog open={isAddWeaverOpen} onOpenChange={setIsAddWeaverOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-maroon hover:bg-maroon-dark text-gold font-bold h-8 text-[10px] gap-1.5 px-3.5 uppercase tracking-wider shadow cursor-pointer">
                            <UserPlus className="h-3.5 w-3.5" />
                            Add Partner / Vendor
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="border-gold/20 max-w-sm">
                        <DialogHeader className="border-b border-gold/10 pb-2">
                            <DialogTitle className="text-xs font-bold uppercase tracking-wider text-maroon font-serif flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5 text-gold" />
                                Add Custom Weaver Profile
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateWeaver} className="space-y-3 pt-2">
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-500 uppercase">Weaver/Vendor Name *</label>
                                <Input
                                    required
                                    placeholder="Enter full name"
                                    className="h-8.5 text-xs border-gold/25 focus-visible:ring-maroon"
                                    value={weaverName}
                                    onChange={(e) => setWeaverName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-500 uppercase">Mobile Number *</label>
                                <Input
                                    required
                                    placeholder="10-digit mobile"
                                    className="h-8.5 text-xs border-gold/25 font-mono focus-visible:ring-maroon"
                                    value={weaverMobile}
                                    onChange={(e) => setWeaverMobile(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-500 uppercase">Source City / Cluster</label>
                                <Select value={weaverCity} onValueChange={setWeaverCity}>
                                    <SelectTrigger className="border-gold/25 h-8.5 text-xs focus-visible:ring-maroon">
                                        <SelectValue placeholder="Select weaving cluster" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Banaras">Banaras (Varanasi)</SelectItem>
                                        <SelectItem value="Kanchipuram">Kanchipuram</SelectItem>
                                        <SelectItem value="Surat">Surat</SelectItem>
                                        <SelectItem value="Chanderi">Chanderi</SelectItem>
                                        <SelectItem value="Other">Other / Local</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-500 uppercase">Notes / Production Details</label>
                                <Input
                                    placeholder="Remarks, Specialties, Bank Details etc."
                                    className="h-8.5 text-xs border-gold/25 focus-visible:ring-maroon"
                                    value={weaverNotes}
                                    onChange={(e) => setWeaverNotes(e.target.value)}
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-maroon hover:bg-maroon-dark text-gold font-bold h-8.5 text-[10px] mt-2 uppercase tracking-wider cursor-pointer"
                                disabled={createWeaverMutation.isPending}
                            >
                                {createWeaverMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : 'Save Profile'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Main Section: Master-Detail Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left Side: Master Directory (4 cols) */}
                <div className="lg:col-span-4 space-y-3">
                    <Card className="border-gold/15 shadow-sm overflow-hidden flex flex-col bg-white">
                        <CardHeader className="bg-cream/10 border-b border-gold/10 p-2.5">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <Input
                                    placeholder="Search directory..."
                                    className="pl-8 h-8 text-[11px] border-gold/20 focus-visible:ring-maroon bg-white/70"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[560px] overflow-y-auto">
                            {isLoadingWeavers ? (
                                <div className="py-12 text-center text-maroon/50 text-xs italic">
                                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-maroon" />
                                    Loading directory...
                                </div>
                            ) : filteredWeavers.length === 0 ? (
                                <div className="py-12 text-center text-xs text-gray-400 italic">
                                    No weavers found.
                                </div>
                            ) : (
                                <motion.div 
                                    className="divide-y divide-gold/10"
                                    variants={listVariants}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    {filteredWeavers.map((weaver) => {
                                        const isSelected = weaver.id === selectedWeaverId;
                                        return (
                                            <div
                                                key={weaver.id}
                                                className={`p-2.5 cursor-pointer transition-all flex items-center justify-between border-l-2 ${isSelected
                                                        ? 'bg-cream/15 border-maroon'
                                                        : 'border-transparent hover:bg-cream/5'
                                                    }`}
                                                onClick={() => setSelectedWeaverId(weaver.id)}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] ${isSelected ? 'bg-maroon text-gold' : 'bg-maroon/10 text-maroon'}`}>
                                                        {weaver.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="font-bold text-[11px] text-gray-800 truncate leading-tight">
                                                            {weaver.name}
                                                        </h3>
                                                        <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-gray-445">
                                                            <span className="bg-gold/10 text-maroon px-1 rounded text-[8px] font-bold uppercase tracking-wider">
                                                                {weaver.city}
                                                            </span>
                                                            <span className="font-mono">{weaver.mobile}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right ml-2 flex-shrink-0">
                                                    <div className="text-[8px] text-gray-400 uppercase font-semibold">Payable</div>
                                                    <div className={`text-[11px] font-black font-mono leading-none mt-0.5 ${weaver.balance > 0 ? 'text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100' : 'text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100'
                                                        }`}>
                                                        {formatCurrency(weaver.balance)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Side: Account Statement (8 cols) */}
                <div className="lg:col-span-8">
                    {selectedWeaver ? (
                        <div className="space-y-3.5">
                            {/* Selected Profile Header Card */}
                            <Card className="border-gold/15 shadow-sm overflow-hidden bg-white">
                                <CardContent className="p-3.5 flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8.5 h-8.5 bg-maroon text-gold rounded-full flex items-center justify-center font-bold font-serif text-xs border border-gold/20 shadow-inner flex-shrink-0">
                                                {selectedWeaver.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h2 className="text-sm font-black font-serif text-maroon tracking-wider truncate uppercase">{selectedWeaver.name}</h2>
                                                    <span className="flex items-center gap-1 font-bold text-gold uppercase bg-maroon px-1.5 py-0.5 rounded text-[8px] tracking-widest flex-shrink-0">
                                                        <MapPin className="h-2.5 w-2.5" />
                                                        {selectedWeaver.city} CLUSTER
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-0.5 flex-wrap">
                                                    <span className="flex items-center gap-0.5 font-mono text-gray-650">
                                                        <Phone className="h-2.5 w-2.5" />
                                                        {selectedWeaver.mobile}
                                                    </span>
                                                    <span className="text-gray-300">|</span>
                                                    <span className="text-gray-450 font-sans">Registered: {new Date(selectedWeaver.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {selectedWeaver.notes && (
                                            <p className="text-[10px] text-gray-500 italic bg-cream/10 border border-gold/10 p-1.5 rounded leading-relaxed">
                                                <strong className="text-maroon not-italic font-bold">Account Notes: </strong> {selectedWeaver.notes}
                                            </p>
                                        )}
                                    </div>

                                    {/* Action Buttons Toolbar */}
                                    <div className="flex flex-wrap items-center gap-1.5 sm:self-start flex-shrink-0">
                                        {/* Direct Procurement Dialog */}
                                        <Dialog open={isAddPurchaseOpen} onOpenChange={setIsAddPurchaseOpen}>
                                            <DialogTrigger asChild>
                                                <Button className="bg-gold/10 hover:bg-gold/15 text-maroon border border-gold/35 font-bold h-7.5 text-[9px] px-2.5 uppercase tracking-wider shadow-sm gap-1 cursor-pointer">
                                                    <PlusCircle className="h-3 w-3" />
                                                    Procure Goods
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="border-gold/20 max-w-sm">
                                                <DialogHeader className="border-b border-gold/10 pb-2">
                                                    <DialogTitle className="text-xs font-bold uppercase tracking-wider text-maroon font-serif flex items-center gap-1.5">
                                                        <FileSpreadsheet className="h-4 w-4 text-gold" />
                                                        Log Stock Procurement
                                                    </DialogTitle>
                                                </DialogHeader>
                                                <form onSubmit={handleCreatePurchase} className="space-y-3 pt-2">
                                                    <div className="bg-cream/10 border border-gold/10 p-2 rounded text-[10px] text-maroon">
                                                        <strong>Vendor:</strong> {selectedWeaver.name}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-bold text-gray-500 uppercase font-sans">Select Saree design *</label>
                                                        <Select value={selectedSareeId} onValueChange={setSelectedSareeId}>
                                                            <SelectTrigger className="border-gold/25 h-8.5 text-xs focus-visible:ring-maroon">
                                                                <SelectValue placeholder="Choose saree model" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {sarees && sarees.length > 0 ? (
                                                                    sarees.map(s => (
                                                                        <SelectItem key={s.id} value={s.id} className="text-xs">
                                                                            {s.sareeName} (Stock: {s.stock} | Current Cost: ₹{s.purchasePrice})
                                                                        </SelectItem>
                                                                    ))
                                                                ) : (
                                                                    <SelectItem value="none" disabled>No sarees in catalog</SelectItem>
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-gray-500 uppercase font-sans">Quantity *</label>
                                                            <Input
                                                                required
                                                                type="number"
                                                                min="1"
                                                                placeholder="Qty received"
                                                                className="h-8.5 text-xs border-gold/25 font-mono focus-visible:ring-maroon"
                                                                value={purchaseQty}
                                                                onChange={(e) => setPurchaseQty(e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-gray-500 uppercase font-sans">Unit Cost (₹) *</label>
                                                            <Input
                                                                required
                                                                type="number"
                                                                placeholder="Price per unit"
                                                                className="h-8.5 text-xs border-gold/25 font-mono focus-visible:ring-maroon"
                                                                value={purchasePriceVal}
                                                                onChange={(e) => setPurchasePriceVal(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <Button
                                                        type="submit"
                                                        className="w-full bg-maroon hover:bg-maroon-dark text-gold font-bold h-8.5 text-[10px] mt-2 uppercase tracking-wider cursor-pointer"
                                                        disabled={createPurchaseMutation.isPending}
                                                    >
                                                        {createPurchaseMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : 'Confirm Goods Intake'}
                                                    </Button>
                                                </form>
                                            </DialogContent>
                                        </Dialog>

                                        {/* Record Payout Dialog */}
                                        <Dialog open={isRecordPaymentOpen} onOpenChange={setIsRecordPaymentOpen}>
                                            <DialogTrigger asChild>
                                                <Button className="bg-maroon hover:bg-maroon-dark text-gold font-bold h-7.5 text-[9px] px-2.5 uppercase tracking-wider shadow-sm gap-1 cursor-pointer">
                                                    <Coins className="h-3.5 w-3.5" />
                                                    Record Payout
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="border-gold/20 max-w-sm">
                                                <DialogHeader className="border-b border-gold/10 pb-2">
                                                    <DialogTitle className="text-xs font-bold uppercase tracking-wider text-maroon font-serif flex items-center gap-2">
                                                        <Coins className="h-3.5 w-3.5 text-gold" />
                                                        Log Ledger Payment Payout
                                                    </DialogTitle>
                                                </DialogHeader>
                                                <form onSubmit={handleRecordPayment} className="space-y-3 pt-2">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-bold text-gray-500 uppercase">Payment Amount (₹) *</label>
                                                        <Input
                                                            required
                                                            type="number"
                                                            placeholder="Amount to pay weaver"
                                                            className="h-8.5 text-xs border-gold/25 font-mono focus-visible:ring-maroon"
                                                            value={paymentAmount}
                                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-bold text-gray-500 uppercase">Payment Method</label>
                                                        <Select
                                                            value={paymentMethod}
                                                            onValueChange={(v) => setPaymentMethod(v as 'Cash' | 'UPI')}
                                                        >
                                                            <SelectTrigger className="border-gold/25 h-8.5 text-xs focus-visible:ring-maroon">
                                                                <SelectValue placeholder="Select payment strategy" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="UPI">UPI / Bank Transfer</SelectItem>
                                                                <SelectItem value="Cash">Cash Payment</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-bold text-gray-500 uppercase">Notes / Transaction Reference</label>
                                                        <Input
                                                            placeholder="Transaction ID, slip serial etc."
                                                            className="h-8.5 text-xs border-gold/25 focus-visible:ring-maroon"
                                                            value={paymentNotes}
                                                            onChange={(e) => setPaymentNotes(e.target.value)}
                                                        />
                                                    </div>
                                                    <Button
                                                        type="submit"
                                                        className="w-full bg-maroon hover:bg-maroon-dark text-gold font-bold h-8.5 text-[10px] mt-2 uppercase tracking-wider cursor-pointer"
                                                        disabled={recordPaymentMutation.isPending}
                                                    >
                                                        {recordPaymentMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : 'Log Transaction'}
                                                    </Button>
                                                </form>
                                            </DialogContent>
                                        </Dialog>

                                        {/* Edit Weaver Dialog */}
                                        <Dialog open={isEditWeaverOpen} onOpenChange={setIsEditWeaverOpen}>
                                            <DialogTrigger asChild>
                                                <Button className="bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-250 font-bold h-7.5 text-[9px] px-2 uppercase tracking-wider cursor-pointer">
                                                    <Edit3 className="h-3 w-3" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="border-gold/20 max-w-sm">
                                                <DialogHeader className="border-b border-gold/10 pb-2">
                                                    <DialogTitle className="text-xs font-bold uppercase tracking-wider text-maroon font-serif flex items-center gap-2">
                                                        <Edit3 className="h-3.5 w-3.5 text-gold" />
                                                        Edit Weaver Profile
                                                    </DialogTitle>
                                                </DialogHeader>
                                                <form onSubmit={handleUpdateWeaver} className="space-y-3 pt-2">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-bold text-gray-500 uppercase font-sans">Full Name *</label>
                                                        <Input
                                                            required
                                                            placeholder="Enter name"
                                                            className="h-8.5 text-xs border-gold/25 focus-visible:ring-maroon"
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-bold text-gray-500 uppercase font-sans">Mobile Number *</label>
                                                        <Input
                                                            required
                                                            placeholder="10-digit mobile"
                                                            className="h-8.5 text-xs border-gold/25 font-mono focus-visible:ring-maroon"
                                                            value={editMobile}
                                                            onChange={(e) => setEditMobile(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-bold text-gray-500 uppercase font-sans">Source City</label>
                                                        <Select value={editCity} onValueChange={setEditCity}>
                                                            <SelectTrigger className="border-gold/25 h-8.5 text-xs focus-visible:ring-maroon">
                                                                <SelectValue placeholder="Select city cluster" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Banaras">Banaras (Varanasi)</SelectItem>
                                                                <SelectItem value="Kanchipuram">Kanchipuram</SelectItem>
                                                                <SelectItem value="Surat">Surat</SelectItem>
                                                                <SelectItem value="Chanderi">Chanderi</SelectItem>
                                                                <SelectItem value="Other">Other / Local</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-bold text-gray-500 uppercase font-sans">Production Notes</label>
                                                        <Input
                                                            placeholder="Specialties, bank accounts..."
                                                            className="h-8.5 text-xs border-gold/25 focus-visible:ring-maroon"
                                                            value={editNotes}
                                                            onChange={(e) => setEditNotes(e.target.value)}
                                                        />
                                                    </div>
                                                    <Button
                                                        type="submit"
                                                        className="w-full bg-maroon hover:bg-maroon-dark text-gold font-bold h-8.5 text-[10px] mt-2 uppercase tracking-wider cursor-pointer"
                                                        disabled={updateWeaverMutation.isPending}
                                                    >
                                                        {updateWeaverMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : 'Update Profile'}
                                                    </Button>
                                                </form>
                                            </DialogContent>
                                        </Dialog>

                                        {/* Delete Weaver Button */}
                                        <Button 
                                            variant="destructive"
                                            className="h-7.5 text-[9px] px-2 bg-rose-50 border border-rose-250 text-rose-600 hover:bg-rose-100 cursor-pointer"
                                            onClick={handleDeleteWeaver}
                                            disabled={deleteWeaverMutation.isPending}
                                        >
                                            {deleteWeaverMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Active Ledger Calculations Grid (Redesigned sizes) */}
                            <div className="grid grid-cols-3 gap-3">
                                <Card className="border-gold/15 shadow-sm bg-cream/5 overflow-hidden h-[68px] flex flex-col justify-center p-3">
                                    <div className="text-[8px] uppercase font-bold text-gray-500 tracking-wider">Gross Procurement</div>
                                    <div className="text-sm font-black font-mono text-maroon mt-0.5 leading-none">
                                        {formatCurrency(selectedWeaver.totalGoods)}
                                    </div>
                                    <div className="text-[7px] text-gray-400 mt-1 uppercase font-semibold">Total Goods Invoiced</div>
                                </Card>
                                <Card className="border-gold/15 shadow-sm bg-cream/5 overflow-hidden h-[68px] flex flex-col justify-center p-3">
                                    <div className="text-[8px] uppercase font-bold text-gray-500 tracking-wider">Total Paid</div>
                                    <div className="text-sm font-black font-mono text-emerald-700 mt-0.5 leading-none">
                                        {formatCurrency(selectedWeaver.totalPaid)}
                                    </div>
                                    <div className="text-[7px] text-gray-400 mt-1 uppercase font-semibold font-sans">Payouts Deducted</div>
                                </Card>
                                <Card className={`border-gold/15 shadow-sm overflow-hidden h-[68px] flex flex-col justify-center p-3 ${selectedWeaver.balance > 0 ? 'bg-amber-50/50 border-amber-200/60' : 'bg-emerald-50/50 border-emerald-200/60'
                                    }`}>
                                    <div className="text-[8px] uppercase font-bold text-gray-500 tracking-wider">Balance Payable</div>
                                    <div className={`text-sm font-black font-mono mt-0.5 leading-none ${selectedWeaver.balance > 0 ? 'text-amber-700' : 'text-emerald-750'
                                        }`}>
                                        {formatCurrency(selectedWeaver.balance)}
                                    </div>
                                    <div className="text-[7px] text-gray-400 mt-1 uppercase font-semibold">Outstanding Due</div>
                                </Card>
                            </div>

                            {/* Advanced Filtering Audit Toolbar */}
                            <Card className="border-gold/15 shadow-sm bg-white p-2.5">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-maroon uppercase">
                                            <Filter className="h-3 w-3" />
                                            Ledger Auditing:
                                        </div>
                                        <Input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="h-7 text-[10px] w-[110px] border-gold/20 font-mono py-0.5"
                                        />
                                        <span className="text-[10px] text-gray-400">to</span>
                                        <Input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="h-7 text-[10px] w-[110px] border-gold/20 font-mono py-0.5"
                                        />
                                        <Select 
                                            value={txTypeFilter} 
                                            onValueChange={(v) => setTxTypeFilter(v as 'all' | 'purchase' | 'payment')}
                                        >
                                            <SelectTrigger className="h-7 text-[10px] w-[110px] border-gold/20 py-0.5">
                                                <SelectValue placeholder="All Activities" />
                                            </SelectTrigger>
                                            <SelectContent className="text-[10px]">
                                                <SelectItem value="all" className="text-xs">All Types</SelectItem>
                                                <SelectItem value="purchase" className="text-xs">Purchases Only</SelectItem>
                                                <SelectItem value="payment" className="text-xs">Payments Only</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Action Utilities */}
                                    <div className="flex items-center gap-1.5 self-end sm:self-auto flex-shrink-0">
                                        {startDate || endDate || txTypeFilter !== 'all' ? (
                                            <Button 
                                                variant="ghost" 
                                                className="h-7 text-[9px] text-gray-500 font-bold uppercase hover:bg-gray-50 cursor-pointer"
                                                onClick={() => {
                                                    setStartDate('');
                                                    setEndDate('');
                                                    setTxTypeFilter('all');
                                                }}
                                            >
                                                Reset
                                            </Button>
                                        ) : null}
                                        <Button
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 text-[9px] px-2.5 gap-1 uppercase tracking-wider cursor-pointer"
                                            onClick={exportStatementToCSV}
                                        >
                                            <Download className="h-3 w-3" />
                                            Export CSV
                                        </Button>
                                    </div>
                                </div>
                            </Card>

                            {/* Detailed List Tabs (Stock Purchases vs Payments vs Combined) */}
                            <Card className="border-gold/15 shadow-sm overflow-hidden bg-white">
                                <CardContent className="p-3">
                                    <Tabs defaultValue="feed" className="w-full">
                                        <div className="border-b border-gold/10 pb-2 mb-2 flex items-center justify-between">
                                            <TabsList className="bg-cream/15 border border-gold/25 h-7 p-0.5">
                                                <TabsTrigger value="feed" className="text-[10px] h-6 px-2.5 data-[state=active]:bg-maroon data-[state=active]:text-gold font-bold cursor-pointer">
                                                    Timeline Feed
                                                </TabsTrigger>
                                                <TabsTrigger value="purchases" className="text-[10px] h-6 px-2.5 data-[state=active]:bg-maroon data-[state=active]:text-gold font-bold cursor-pointer">
                                                    Goods Received
                                                </TabsTrigger>
                                                <TabsTrigger value="payments" className="text-[10px] h-6 px-2.5 data-[state=active]:bg-maroon data-[state=active]:text-gold font-bold cursor-pointer">
                                                    Payout Logs
                                                </TabsTrigger>
                                            </TabsList>
                                            <span className="text-[9px] font-bold text-gray-400 font-mono uppercase hidden sm:inline">
                                                Filtered: {filteredActivities.length} items
                                            </span>
                                        </div>

                                        {/* TAB: COMBINED TIMELINE FEED */}
                                        <TabsContent value="feed" className="m-0 space-y-3 pt-1">
                                            {isLoadingActivities ? (
                                                <div className="py-12 text-center text-xs text-maroon/50">
                                                    <Loader2 className="h-4 w-4 animate-spin mx-auto mr-2 inline" />
                                                    Compiling transaction history...
                                                </div>
                                            ) : filteredActivities.length === 0 ? (
                                                <div className="py-12 text-center text-xs text-gray-400 italic">
                                                    No ledger activities recorded in this range.
                                                </div>
                                            ) : (
                                                <div className="relative border-l border-gold/20 ml-2.5 pl-4.5 space-y-3 pt-1">
                                                    {filteredActivities.map((act) => {
                                                        const isPurchase = act.type === 'purchase';
                                                        return (
                                                            <div key={act.id} className="relative group">
                                                                {/* Time milestone dot */}
                                                                <div className={`absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full border border-white flex items-center justify-center ${isPurchase ? 'bg-maroon' : 'bg-emerald-600'
                                                                    }`} />

                                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-gray-50/55 pb-1.5 last:border-b-0">
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-[11px] font-bold text-gray-800 truncate">{act.description}</p>
                                                                        <p className="text-[9px] text-gray-450 mt-0.5 truncate">{act.details}</p>
                                                                    </div>
                                                                    <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end gap-1.5 sm:gap-0 mt-0.5 sm:mt-0 flex-shrink-0">
                                                                        <p className={`text-[11px] font-black font-mono leading-none ${isPurchase ? 'text-maroon bg-maroon/5 border border-maroon/10 px-1.5 py-0.5 rounded' : 'text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded'
                                                                            }`}>
                                                                            {isPurchase ? '+' : '-'} {formatCurrency(act.amount)}
                                                                        </p>
                                                                        <p className="text-[8px] text-gray-400 font-mono mt-1">
                                                                            {new Date(act.date).toLocaleDateString(undefined, {
                                                                                month: 'short',
                                                                                day: 'numeric',
                                                                                hour: '2-digit',
                                                                                minute: '2-digit'
                                                                            })}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </TabsContent>

                                        {/* TAB: STOCK PURCHASES */}
                                        <TabsContent value="purchases" className="m-0">
                                            {isLoadingActivities ? (
                                                <div className="py-12 text-center text-xs text-maroon/50">
                                                    <Loader2 className="h-4 w-4 animate-spin mx-auto text-maroon" />
                                                </div>
                                            ) : filteredActivities.filter(a => a.type === 'purchase').length === 0 ? (
                                                <div className="py-12 text-center text-xs text-gray-400 italic">
                                                    No goods received entries found.
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <Table>
                                                        <TableHeader className="bg-cream/10">
                                                            <TableRow className="border-b border-gold/15 hover:bg-transparent">
                                                                <TableHead className="h-7 text-[9px] font-bold text-maroon py-0.5">Date</TableHead>
                                                                <TableHead className="h-7 text-[9px] font-bold text-maroon py-0.5">Item Description</TableHead>
                                                                <TableHead className="h-7 text-[9px] font-bold text-maroon font-mono text-right py-0.5">Unit Price</TableHead>
                                                                <TableHead className="h-7 text-[9px] font-bold text-maroon text-center py-0.5">Qty</TableHead>
                                                                <TableHead className="h-7 text-[9px] font-bold text-maroon text-right py-0.5">Total (₹)</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {filteredActivities.filter(a => a.type === 'purchase').map((act) => {
                                                                const parts = act.details?.split('|') || [];
                                                                const price = parts[0]?.replace('Price: ₹', '')?.trim() || '0';
                                                                const qty = parts[1]?.replace('Qty:', '')?.trim() || '0';
                                                                return (
                                                                    <TableRow key={act.id} className="hover:bg-cream/5 border-b border-gold/5 h-8">
                                                                        <TableCell className="py-1.5 text-[9px] text-gray-500 font-mono">
                                                                            {new Date(act.date).toLocaleDateString()}
                                                                        </TableCell>
                                                                        <TableCell className="py-1.5 text-xs font-semibold text-gray-800 truncate max-w-[200px]" title={act.description}>
                                                                            {act.description.replace('Received Stock: ', '')}
                                                                        </TableCell>
                                                                        <TableCell className="py-1.5 text-xs font-mono text-right text-gray-650">
                                                                            ₹{parseInt(price).toLocaleString()}
                                                                        </TableCell>
                                                                        <TableCell className="py-1.5 text-xs text-center font-mono text-gray-650">
                                                                            {qty}
                                                                        </TableCell>
                                                                        <TableCell className="py-1.5 text-xs text-right font-black font-mono text-maroon">
                                                                            ₹{act.amount.toLocaleString()}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}
                                        </TabsContent>

                                        {/* TAB: PAYMENTS LIST */}
                                        <TabsContent value="payments" className="m-0">
                                            {isLoadingActivities ? (
                                                <div className="py-12 text-center text-xs text-maroon/50">
                                                    <Loader2 className="h-4 w-4 animate-spin mx-auto text-maroon" />
                                                </div>
                                            ) : filteredActivities.filter(a => a.type === 'payment').length === 0 ? (
                                                <div className="py-12 text-center text-xs text-gray-400 italic">
                                                    No payments logged.
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <Table>
                                                        <TableHeader className="bg-cream/10">
                                                            <TableRow className="border-b border-gold/15 hover:bg-transparent">
                                                                <TableHead className="h-7 text-[9px] font-bold text-maroon py-0.5">Date</TableHead>
                                                                <TableHead className="h-7 text-[9px] font-bold text-maroon py-0.5">Method</TableHead>
                                                                <TableHead className="h-7 text-[9px] font-bold text-maroon py-0.5">Reference / Notes</TableHead>
                                                                <TableHead className="h-7 text-[9px] font-bold text-maroon text-right py-0.5">Debit Amount (₹)</TableHead>
                                                                <TableHead className="h-7 text-[9px] font-bold text-maroon text-center py-0.5 w-[60px]">Void</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {filteredActivities.filter(a => a.type === 'payment').map((act) => (
                                                                <TableRow key={act.id} className="hover:bg-cream/5 border-b border-gold/5 h-8">
                                                                    <TableCell className="py-1.5 text-[9px] text-gray-500 font-mono">
                                                                        {new Date(act.date).toLocaleDateString()}
                                                                    </TableCell>
                                                                    <TableCell className="py-1.5">
                                                                        <span className={`px-1.5 py-0.5 rounded font-bold text-[8px] border uppercase ${act.description.includes('UPI') ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                                            {act.description.replace('Paid via ', '')}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="py-1.5 text-[10px] text-gray-500 truncate max-w-[220px]" title={act.details}>
                                                                        {act.details}
                                                                    </TableCell>
                                                                    <TableCell className="py-1.5 text-xs text-right font-black font-mono text-emerald-600">
                                                                        - ₹{act.amount.toLocaleString()}
                                                                    </TableCell>
                                                                    <TableCell className="py-1.5 text-center">
                                                                        <button
                                                                            onClick={() => {
                                                                                if (window.confirm('Are you sure you want to void this payment record? This action will reverse the debit from the ledger.')) {
                                                                                    deletePaymentMutation.mutate(act.id);
                                                                                }
                                                                            }}
                                                                            disabled={deletePaymentMutation.isPending}
                                                                            className="text-rose-600 hover:text-rose-800 disabled:opacity-50 p-1 hover:bg-rose-50 rounded transition-all cursor-pointer"
                                                                            title="Void transaction"
                                                                        >
                                                                            <Trash2 className="h-3 w-3" />
                                                                        </button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <Card className="border-gold/15 shadow-sm">
                            <CardContent className="py-28 text-center text-gray-500 italic flex flex-col items-center justify-center gap-3 bg-white">
                                <UserCheck className="h-8 w-8 text-gold/50" />
                                <div>
                                    <p className="text-xs font-bold text-maroon font-serif tracking-widest uppercase">Select a Weaver</p>
                                    <p className="text-[10px] text-gray-400 mt-1 max-w-xs mx-auto">Select a weaver partner from the directory list on the left to view active ledgers and statement logs.</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
