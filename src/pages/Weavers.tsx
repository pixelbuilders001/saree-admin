import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { weaverService, type WeaverWithStats, type WeaverActivity } from '@/services/weaverService';
import {
    Truck,
    Search,
    Plus,
    MapPin,
    Phone,
    Loader2,
    Calendar,
    Receipt,
    Coins,
    CreditCard,
    ArrowUpDown,
    UserCheck,
    FileText,
    TrendingDown,
    Building2,
    CheckCircle2
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

export default function WeaversPage() {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [selectedWeaverId, setSelectedWeaverId] = React.useState<string | null>(null);
    const [isAddWeaverOpen, setIsAddWeaverOpen] = React.useState(false);
    const [isRecordPaymentOpen, setIsRecordPaymentOpen] = React.useState(false);

    // Add Weaver Form State
    const [weaverName, setWeaverName] = React.useState('');
    const [weaverMobile, setWeaverMobile] = React.useState('');
    const [weaverCity, setWeaverCity] = React.useState('Banaras');
    const [weaverNotes, setWeaverNotes] = React.useState('');

    // Record Payment Form State
    const [paymentAmount, setPaymentAmount] = React.useState('');
    const [paymentMethod, setPaymentMethod] = React.useState<'Cash' | 'UPI'>('UPI');
    const [paymentNotes, setPaymentNotes] = React.useState('');

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

    // Automatically select the first weaver when list loads and none is selected
    React.useEffect(() => {
        if (weavers && weavers.length > 0 && !selectedWeaverId) {
            setSelectedWeaverId(weavers[0].id);
        }
    }, [weavers, selectedWeaverId]);

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

    // Filter weavers list by search term
    const filteredWeavers = Array.isArray(weavers)
        ? weavers.filter(weaver =>
            weaver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            weaver.mobile.includes(searchTerm) ||
            weaver.city.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : [];

    return (
        <div className="space-y-4 max-w-7xl mx-auto px-2">
            {/* Page Header */}
            <div className="flex items-center justify-between border-b border-gold/10 pb-3">
                <div className="flex items-center gap-2.5">
                    <div className="p-1 px-2.5 bg-maroon/10 rounded border border-maroon/20">
                        <Truck className="h-6 w-6 text-maroon" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold font-serif text-maroon tracking-wider">WEAVER & SUPPLIER LEDGER</h1>
                        <p className="text-xs text-gray-500 font-sans">Track procurements, payments, and outstanding balances to weavers</p>
                    </div>
                </div>

                <Dialog open={isAddWeaverOpen} onOpenChange={setIsAddWeaverOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-maroon hover:bg-maroon-dark text-gold font-bold h-9 text-xs gap-1.5 px-4 uppercase tracking-wider shadow">
                            <Plus className="h-4 w-4" />
                            ADD WEAVER / VENDOR
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="border-gold/20 max-w-sm">
                        <DialogHeader className="border-b border-gold/10 pb-2">
                            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-maroon font-serif flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-gold" />
                                Add Custom Weaver Profile
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateWeaver} className="space-y-4 pt-2">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Weaver/Vendor Name *</label>
                                <Input
                                    required
                                    placeholder="Enter full name"
                                    className="h-9 text-xs border-gold/30"
                                    value={weaverName}
                                    onChange={(e) => setWeaverName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Mobile Number *</label>
                                <Input
                                    required
                                    placeholder="10-digit mobile"
                                    className="h-9 text-xs border-gold/30 font-mono"
                                    value={weaverMobile}
                                    onChange={(e) => setWeaverMobile(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Source City / Cluster</label>
                                <Select value={weaverCity} onValueChange={setWeaverCity}>
                                    <SelectTrigger className="border-gold/30 h-9 text-xs">
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
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Notes / Production Details</label>
                                <Input
                                    placeholder="Remarks, Specialities, Bank Details etc."
                                    className="h-9 text-xs border-gold/30"
                                    value={weaverNotes}
                                    onChange={(e) => setWeaverNotes(e.target.value)}
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-maroon hover:bg-maroon-dark text-gold font-bold h-9 text-xs mt-2 uppercase tracking-wider"
                                disabled={createWeaverMutation.isPending}
                            >
                                {createWeaverMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : 'SAVE PROFILE'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Main Section: Master-Detail Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left Side: Master List (4 cols) */}
                <div className="lg:col-span-4 space-y-3">
                    <Card className="border-gold/20 shadow-md">
                        <CardHeader className="bg-cream/20 border-b border-gold/10 p-3">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search weavers or cities..."
                                    className="pl-9 h-9 text-xs border-gold/20 focus-visible:ring-maroon"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                            {isLoadingWeavers ? (
                                <div className="py-12 text-center text-maroon/50 text-xs italic">
                                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-maroon" />
                                    Loading weaver directories...
                                </div>
                            ) : filteredWeavers.length === 0 ? (
                                <div className="py-12 text-center text-xs text-gray-500 italic">
                                    No weavers found matching your search.
                                </div>
                            ) : (
                                <div className="divide-y divide-gold/10">
                                    {filteredWeavers.map((weaver) => {
                                        const isSelected = weaver.id === selectedWeaverId;
                                        return (
                                            <div
                                                key={weaver.id}
                                                className={`p-3.5 cursor-pointer transition-colors relative ${isSelected
                                                        ? 'bg-cream-light/60 border-l-[3px] border-maroon'
                                                        : 'hover:bg-cream/5'
                                                    }`}
                                                onClick={() => setSelectedWeaverId(weaver.id)}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="space-y-1">
                                                        <h3 className="font-bold text-xs text-maroon flex items-center gap-1.5">
                                                            {weaver.name}
                                                        </h3>
                                                        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-sans">
                                                            <span className="bg-gold/10 text-maroon px-1.5 py-0.5 rounded border border-gold/25 font-bold uppercase tracking-wide">
                                                                {weaver.city}
                                                            </span>
                                                            <span className="flex items-center gap-0.5 font-mono text-[9px]">
                                                                <Phone className="h-2.5 w-2.5" />
                                                                {weaver.mobile}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] text-gray-400 font-sans">Payable Balance</p>
                                                        <p className={`text-xs font-bold font-mono ${weaver.balance > 0 ? 'text-orange-600' : 'text-green-600'
                                                            }`}>
                                                            ₹{weaver.balance.toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Side: Weaver Ledger details (8 cols) */}
                <div className="lg:col-span-8">
                    {selectedWeaver ? (
                        <div className="space-y-4">
                            {/* Selected Profile Header Card */}
                            <Card className="border-gold/20 shadow-md">
                                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-9 h-9 bg-maroon text-gold rounded-full flex items-center justify-center font-bold font-serif text-sm border border-gold/20">
                                                {selectedWeaver.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold font-serif text-maroon tracking-wider">{selectedWeaver.name}</h2>
                                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                                    <span className="flex items-center gap-1 font-bold text-gold uppercase bg-maroon/90 px-1.5 py-0.5 rounded text-[10px]">
                                                        <MapPin className="h-3 w-3" />
                                                        {selectedWeaver.city} CLUSTER
                                                    </span>
                                                    <span className="flex items-center gap-1 font-mono text-gray-600">
                                                        <Phone className="h-3 w-3" />
                                                        {selectedWeaver.mobile}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {selectedWeaver.notes && (
                                            <p className="text-xs text-gray-500 italic bg-cream/10 border border-gold/5 p-2 rounded leading-relaxed">
                                                <strong>Remarks: </strong> {selectedWeaver.notes}
                                            </p>
                                        )}
                                    </div>

                                    {/* Action button to pay this vendor */}
                                    <div>
                                        <Dialog open={isRecordPaymentOpen} onOpenChange={setIsRecordPaymentOpen}>
                                            <DialogTrigger asChild>
                                                <Button className="bg-maroon hover:bg-maroon-dark text-gold font-bold h-9 text-xs px-4 uppercase tracking-wider w-full md:w-auto shadow-sm gap-2">
                                                    <Coins className="h-4 w-4" />
                                                    RECORD PAYMENT
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="border-gold/20 max-w-sm">
                                                <DialogHeader className="border-b border-gold/10 pb-2">
                                                    <DialogTitle className="text-sm font-bold uppercase tracking-wider text-maroon font-serif flex items-center gap-2">
                                                        <Coins className="h-4 w-4 text-gold" />
                                                        Log Ledger Payment Payout
                                                    </DialogTitle>
                                                </DialogHeader>
                                                <form onSubmit={handleRecordPayment} className="space-y-4 pt-2">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Payment Amount (₹) *</label>
                                                        <Input
                                                            required
                                                            type="number"
                                                            placeholder="Amount to pay weaver"
                                                            className="h-9 text-xs border-gold/30 font-mono"
                                                            value={paymentAmount}
                                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Payment Method</label>
                                                        <Select
                                                            value={paymentMethod}
                                                            onValueChange={(v) => setPaymentMethod(v as 'Cash' | 'UPI')}
                                                        >
                                                            <SelectTrigger className="border-gold/30 h-9 text-xs">
                                                                <SelectValue placeholder="Select payment strategy" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="UPI">UPI / Bank Transfer</SelectItem>
                                                                <SelectItem value="Cash">Cash Payment</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase">Notes / Transaction Reference</label>
                                                        <Input
                                                            placeholder="Transaction ID, slip serial etc."
                                                            className="h-9 text-xs border-gold/30"
                                                            value={paymentNotes}
                                                            onChange={(e) => setPaymentNotes(e.target.value)}
                                                        />
                                                    </div>
                                                    <Button
                                                        type="submit"
                                                        className="w-full bg-maroon hover:bg-maroon-dark text-gold font-bold h-9 text-xs mt-2 uppercase tracking-wider"
                                                        disabled={recordPaymentMutation.isPending}
                                                    >
                                                        {recordPaymentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : 'RECORD TRANSACTION'}
                                                    </Button>
                                                </form>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Active Ledger Calculations Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="border-gold/20 shadow bg-cream-light/5">
                                    <CardContent className="p-4">
                                        <p className="text-[10px] uppercase font-bold text-gray-500">Gross Procurement (Total Goods)</p>
                                        <p className="text-xl font-bold font-mono text-maroon mt-1">
                                            ₹{selectedWeaver.totalGoods.toLocaleString()}
                                        </p>
                                        <p className="text-[9px] text-gray-400 mt-0.5">Sum of all purchase logs</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-gold/20 shadow bg-cream-light/5">
                                    <CardContent className="p-4">
                                        <p className="text-[10px] uppercase font-bold text-gray-500 font-sans">Total Paid Cash/UPI</p>
                                        <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
                                            ₹{selectedWeaver.totalPaid.toLocaleString()}
                                        </p>
                                        <p className="text-[9px] text-gray-400 mt-0.5">Sum of all logged payouts</p>
                                    </CardContent>
                                </Card>
                                <Card className={`border-gold/20 shadow ${selectedWeaver.balance > 0 ? 'bg-orange-50/50 border-orange-200' : 'bg-green-50/50 border-green-200'
                                    }`}>
                                    <CardContent className="p-4">
                                        <p className="text-[10px] uppercase font-bold text-gray-500 font-sans">Active Balance Payable</p>
                                        <p className={`text-xl font-bold font-mono mt-1 ${selectedWeaver.balance > 0 ? 'text-orange-600' : 'text-green-600'
                                            }`}>
                                            ₹{selectedWeaver.balance.toLocaleString()}
                                        </p>
                                        <p className="text-[9px] text-gray-400 mt-0.5">Pending dues to Weaver</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Detailed List Tabs (Stock Purchases vs Payments vs Combined) */}
                            <Card className="border-gold/20 shadow-md">
                                <CardContent className="p-4">
                                    <Tabs defaultValue="feed" className="w-full">
                                        <div className="border-b border-gold/10 pb-2 mb-3 flex items-center justify-between">
                                            <TabsList className="bg-cream/15 border border-gold/20 h-8 p-0.5">
                                                <TabsTrigger value="feed" className="text-xs h-7 px-3 data-[state=active]:bg-maroon data-[state=active]:text-gold font-bold">
                                                    Ledger Feed
                                                </TabsTrigger>
                                                <TabsTrigger value="purchases" className="text-xs h-7 px-3 data-[state=active]:bg-maroon data-[state=active]:text-gold font-bold">
                                                    Goods Received
                                                </TabsTrigger>
                                                <TabsTrigger value="payments" className="text-xs h-7 px-3 data-[state=active]:bg-maroon data-[state=active]:text-gold font-bold">
                                                    Payments History
                                                </TabsTrigger>
                                            </TabsList>
                                            <p className="text-[10px] font-bold text-maroon font-serif tracking-wide uppercase hidden sm:block">
                                                Detailed Statement
                                            </p>
                                        </div>

                                        {/* TAB: COMBINED TIMELINE FEED */}
                                        <TabsContent value="feed" className="m-0 space-y-3">
                                            {isLoadingActivities ? (
                                                <div className="py-12 text-center text-xs text-maroon/50">
                                                    <Loader2 className="h-4 w-4 animate-spin mx-auto mr-2 inline" />
                                                    Compiling transaction history...
                                                </div>
                                            ) : !activities || activities.length === 0 ? (
                                                <div className="py-12 text-center text-xs text-gray-500 italic">
                                                    No purchases or payments on record for this weaver.
                                                </div>
                                            ) : (
                                                <div className="relative border-l-2 border-gold/15 ml-3 pl-5 space-y-4 pt-1">
                                                    {activities.map((act) => {
                                                        const isPurchase = act.type === 'purchase';
                                                        return (
                                                            <div key={act.id} className="relative">
                                                                {/* Time milestone dot */}
                                                                <div className={`absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center ${isPurchase ? 'bg-maroon text-white' : 'bg-emerald-600 text-white'
                                                                    }`} />

                                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                                    <div>
                                                                        <p className="text-xs font-bold text-gray-800">{act.description}</p>
                                                                        <p className="text-[10px] text-gray-500">{act.details}</p>
                                                                    </div>
                                                                    <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0 mt-1 sm:mt-0">
                                                                        <p className={`text-xs font-bold font-mono ${isPurchase ? 'text-maroon' : 'text-emerald-600'
                                                                            }`}>
                                                                            {isPurchase ? '+' : '-'} ₹{act.amount.toLocaleString()}
                                                                        </p>
                                                                        <p className="text-[9px] text-gray-400 font-mono">
                                                                            {new Date(act.date).toLocaleDateString(undefined, {
                                                                                year: 'numeric',
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
                                            ) : !activities || activities.filter(a => a.type === 'purchase').length === 0 ? (
                                                <div className="py-12 text-center text-xs text-gray-500 italic">
                                                    No stock received from this supplier on record.
                                                </div>
                                            ) : (
                                                <Table>
                                                    <TableHeader className="bg-cream/10">
                                                        <TableRow className="border-b border-gold/15">
                                                            <TableHead className="h-8 text-[10px] font-bold text-maroon">Date</TableHead>
                                                            <TableHead className="h-8 text-[10px] font-bold text-maroon">Item ID/Name</TableHead>
                                                            <TableHead className="h-8 text-[10px] font-bold text-maroon font-mono text-center">Unit Price</TableHead>
                                                            <TableHead className="h-8 text-[10px] font-bold text-maroon text-center">Qty</TableHead>
                                                            <TableHead className="h-8 text-[10px] font-bold text-maroon text-right">Ext Value (₹)</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {activities.filter(a => a.type === 'purchase').map((act) => {
                                                            // Split details: Price: ₹X | Qty: Y
                                                            const parts = act.details?.split('|') || [];
                                                            const price = parts[0]?.replace('Price: ₹', '')?.trim() || '0';
                                                            const qty = parts[1]?.replace('Qty:', '')?.trim() || '0';
                                                            return (
                                                                <TableRow key={act.id} className="hover:bg-cream/5 border-b border-gold/5 h-8">
                                                                    <TableCell className="py-2 text-[10px] text-gray-500 font-mono">
                                                                        {new Date(act.date).toLocaleDateString()}
                                                                    </TableCell>
                                                                    <TableCell className="py-2 text-xs font-semibold text-gray-800">
                                                                        {act.description.replace('Received Stock: ', '')}
                                                                    </TableCell>
                                                                    <TableCell className="py-2 text-xs font-mono text-center text-gray-600">
                                                                        ₹{parseInt(price).toLocaleString()}
                                                                    </TableCell>
                                                                    <TableCell className="py-2 text-xs text-center font-mono text-gray-600">
                                                                        {qty}
                                                                    </TableCell>
                                                                    <TableCell className="py-2 text-xs text-right font-bold font-mono text-maroon">
                                                                        ₹{act.amount.toLocaleString()}
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            )}
                                        </TabsContent>

                                        {/* TAB: PAYMENTS LIST */}
                                        <TabsContent value="payments" className="m-0">
                                            {isLoadingActivities ? (
                                                <div className="py-12 text-center text-xs text-maroon/50">
                                                    <Loader2 className="h-4 w-4 animate-spin mx-auto text-maroon" />
                                                </div>
                                            ) : !activities || activities.filter(a => a.type === 'payment').length === 0 ? (
                                                <div className="py-12 text-center text-xs text-gray-500 italic">
                                                    No payments logged for this weaver.
                                                </div>
                                            ) : (
                                                <Table>
                                                    <TableHeader className="bg-cream/10">
                                                        <TableRow className="border-b border-gold/15">
                                                            <TableHead className="h-8 text-[10px] font-bold text-maroon">Date</TableHead>
                                                            <TableHead className="h-8 text-[10px] font-bold text-maroon">Payment Method</TableHead>
                                                            <TableHead className="h-8 text-[10px] font-bold text-maroon">Transaction Ref</TableHead>
                                                            <TableHead className="h-8 text-[10px] font-bold text-maroon text-right">Debit Amount (₹)</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {activities.filter(a => a.type === 'payment').map((act) => (
                                                            <TableRow key={act.id} className="hover:bg-cream/5 border-b border-gold/5 h-8">
                                                                <TableCell className="py-2 text-[10px] text-gray-500 font-mono">
                                                                    {new Date(act.date).toLocaleDateString()}
                                                                </TableCell>
                                                                <TableCell className="py-2 text-xs font-semibold">
                                                                    <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold text-[9px] uppercase tracking-wide">
                                                                        {act.description.replace('Paid via ', '')}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="py-2 text-[10px] text-gray-500 italic max-w-[200px] truncate" title={act.details}>
                                                                    {act.details}
                                                                </TableCell>
                                                                <TableCell className="py-2 text-xs text-right font-bold font-mono text-emerald-600">
                                                                    - ₹{act.amount.toLocaleString()}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            )}
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <Card className="border-gold/20 shadow-md">
                            <CardContent className="py-24 text-center text-gray-500 italic flex flex-col items-center justify-center gap-3">
                                <UserCheck className="h-10 w-10 text-gold/60" />
                                <div>
                                    <p className="text-sm font-bold text-maroon font-serif tracking-wide">NO WEAVER ACTIVE</p>
                                    <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">Please add a weaver or select an existing weaver profile from the sidebar layout to access ledger statement details</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
