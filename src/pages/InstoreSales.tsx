import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { salesService, type DetailedSale } from '@/services/salesService';
import {
    Store,
    Calendar,
    Search,
    Download,
    RefreshCw,
    Plus,
    FileText,
    Receipt,
    Copy,
    Share2,
    Check,
    CreditCard,
    Coins,
    QrCode,
    TrendingUp,
    IndianRupee,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Phone,
    Award,
    Eye,
    Package
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
} from "@/components/ui/dialog";
import { ReceiptModal } from '@/components/ReceiptModal';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { generateReceiptUrl } from '@/utils/receiptUtils';

type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | '30days' | 'year' | 'all';

export default function InstoreSalesPage() {
    const navigate = useNavigate();

    // Default to this month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    // Filter states
    const [startDate, setStartDate] = React.useState<string>(firstDay);
    const [endDate, setEndDate] = React.useState<string>(todayStr);
    const [activePreset, setActivePreset] = React.useState<DatePreset>('month');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [paymentFilter, setPaymentFilter] = React.useState<string>('all');
    const [typeFilter, setTypeFilter] = React.useState<string>('all'); // all, regular, exchange

    // Pagination
    const [currentPage, setCurrentPage] = React.useState(1);
    const itemsPerPage = 15;

    // Modals
    const [selectedSaleForDetails, setSelectedSaleForDetails] = React.useState<DetailedSale | null>(null);
    const [selectedSaleForReceipt, setSelectedSaleForReceipt] = React.useState<any | null>(null);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = React.useState(false);
    const [copiedInvoice, setCopiedInvoice] = React.useState<string | null>(null);

    // Fetch detailed in-store sales
    const {
        data: sales = [],
        isLoading,
        refetch,
        isRefetching
    } = useQuery<DetailedSale[]>({
        queryKey: ['detailed-instore-sales'],
        queryFn: salesService.getDetailedSales,
    });

    // Reset page when filter criteria change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [startDate, endDate, searchQuery, paymentFilter, typeFilter]);

    // Handle Quick Date Presets
    const handleSetPreset = (preset: DatePreset) => {
        setActivePreset(preset);
        const today = new Date();
        const endStr = today.toISOString().split('T')[0];

        if (preset === 'today') {
            setStartDate(endStr);
            setEndDate(endStr);
        } else if (preset === 'yesterday') {
            const yest = new Date(today);
            yest.setDate(yest.getDate() - 1);
            const yestStr = yest.toISOString().split('T')[0];
            setStartDate(yestStr);
            setEndDate(yestStr);
        } else if (preset === 'week') {
            const day = today.getDay();
            const diff = today.getDate() - day + (day === 0 ? -6 : 1);
            const startOfWeek = new Date(today.setDate(diff));
            setStartDate(startOfWeek.toISOString().split('T')[0]);
            setEndDate(endStr);
        } else if (preset === 'month') {
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            setStartDate(startOfMonth.toISOString().split('T')[0]);
            setEndDate(endStr);
        } else if (preset === '30days') {
            const d = new Date(today);
            d.setDate(d.getDate() - 30);
            setStartDate(d.toISOString().split('T')[0]);
            setEndDate(endStr);
        } else if (preset === 'year') {
            const startOfYear = new Date(today.getFullYear(), 0, 1);
            setStartDate(startOfYear.toISOString().split('T')[0]);
            setEndDate(endStr);
        } else if (preset === 'all') {
            setStartDate('');
            setEndDate('');
        }
    };

    // Filter sales
    const filteredSales = React.useMemo(() => {
        return sales.filter(sale => {
            // Date Filter
            if (startDate || endDate) {
                const saleDate = sale.createdAt.split('T')[0];
                if (startDate && saleDate < startDate) return false;
                if (endDate && saleDate > endDate) return false;
            }

            // Payment Mode Filter
            if (paymentFilter !== 'all') {
                if (sale.paymentMode.toLowerCase() !== paymentFilter.toLowerCase()) return false;
            }

            // Type Filter (regular vs exchange/return)
            if (typeFilter === 'regular' && sale.isExchange) return false;
            if (typeFilter === 'exchange' && !sale.isExchange) return false;

            // Search Filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const invMatch = (sale.invoiceNumber || '').toLowerCase().includes(q);
                const idMatch = (sale.friendlyId || '').toLowerCase().includes(q);
                const custNameMatch = (sale.customer?.name || '').toLowerCase().includes(q);
                const custPhoneMatch = (sale.customer?.mobile || '').includes(q);
                const cashierMatch = (sale.createdBy || '').toLowerCase().includes(q);
                const staffMatch = (sale.salesperson?.name || '').toLowerCase().includes(q);
                const itemMatch = sale.items.some(item =>
                    item.sareeName.toLowerCase().includes(q) ||
                    (item.sku && item.sku.toLowerCase().includes(q)) ||
                    (item.barcode && item.barcode.toLowerCase().includes(q))
                );

                if (!invMatch && !idMatch && !custNameMatch && !custPhoneMatch && !cashierMatch && !staffMatch && !itemMatch) {
                    return false;
                }
            }

            return true;
        });
    }, [sales, startDate, endDate, paymentFilter, typeFilter, searchQuery]);

    // Financial KPIs
    const stats = React.useMemo(() => {
        const totalRevenue = filteredSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
        const totalProfit = filteredSales.reduce((acc, s) => acc + (s.profit || 0), 0);
        const totalItemsCount = filteredSales.reduce((acc, s) => acc + (s.itemCount || 0), 0);
        const invoiceCount = filteredSales.length;
        const aov = invoiceCount > 0 ? Math.round(totalRevenue / invoiceCount) : 0;
        const profitMarginPct = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

        // Payment Breakdown
        const cashAmount = filteredSales.filter(s => s.paymentMode === 'cash').reduce((sum, s) => sum + s.totalAmount, 0);
        const upiAmount = filteredSales.filter(s => s.paymentMode === 'upi').reduce((sum, s) => sum + s.totalAmount, 0);
        const cardAmount = filteredSales.filter(s => s.paymentMode === 'card').reduce((sum, s) => sum + s.totalAmount, 0);

        return {
            totalRevenue,
            totalProfit,
            totalItemsCount,
            invoiceCount,
            aov,
            profitMarginPct,
            cashAmount,
            upiAmount,
            cardAmount
        };
    }, [filteredSales]);

    // Pagination slice
    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
    const paginatedSales = React.useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredSales.slice(start, start + itemsPerPage);
    }, [filteredSales, currentPage, itemsPerPage]);

    // Copy invoice feedback
    const handleCopyInvoice = (invoice: string) => {
        navigator.clipboard.writeText(invoice);
        setCopiedInvoice(invoice);
        toast.success(`Copied: ${invoice}`);
        setTimeout(() => setCopiedInvoice(null), 2000);
    };

    // Open receipt modal
    const handleOpenReceipt = (sale: DetailedSale) => {
        setSelectedSaleForReceipt(sale);
        setIsReceiptModalOpen(true);
    };

    // Direct WhatsApp Sharing
    const handleShareWhatsApp = (sale: DetailedSale) => {
        const customerName = sale.customer?.name || 'Valued Customer';
        const invoiceNum = sale.invoiceNumber || sale.friendlyId;
        const total = sale.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const receiptUrl = generateReceiptUrl(sale);

        const message = encodeURIComponent(
            `✨ *SHREE BANARASI SAREES* ✨\n\n` +
            `Dear *${customerName}*,\n\n` +
            `Thank you for shopping in-store with us! 🛍️\n` +
            `*Invoice No:* ${invoiceNum}\n` +
            `*Total Amount:* ₹${total}\n` +
            `*Date:* ${new Date(sale.createdAt).toLocaleDateString()}\n\n` +
            `📲 View & Download your Digital Receipt:\n` +
            `${receiptUrl}\n\n` +
            `We look forward to serving you again! 🙏`
        );

        const rawPhone = sale.customer?.mobile || '';
        const phone = rawPhone.replace(/\D/g, '');
        window.open(phone ? `https://wa.me/91${phone}?text=${message}` : `https://wa.me/?text=${message}`, '_blank');
    };

    // Export to CSV
    const exportToCSV = () => {
        if (filteredSales.length === 0) {
            toast.error('No sales data to export for current filter');
            return;
        }

        const headers = [
            'Invoice No',
            'Sale ID',
            'Date & Time',
            'Customer Name',
            'Customer Phone',
            'Payment Mode',
            'Type',
            'Total Items',
            'Products List',
            'Subtotal',
            'Discount Amount',
            'GST Rate (%)',
            'Total GST',
            'Grand Total (₹)',
            'Profit (₹)',
            'Cashier',
            'Salesperson',
            'Salesperson Commission'
        ];

        const rows = filteredSales.map(s => {
            const productNames = s.items.map(i => `${i.sareeName} (x${i.quantity})`).join('; ');
            return [
                `"${s.invoiceNumber}"`,
                `"${s.friendlyId}"`,
                `"${new Date(s.createdAt).toLocaleString()}"`,
                `"${s.customer?.name || 'Walk-in'}"`,
                `"${s.customer?.mobile || 'N/A'}"`,
                `"${s.paymentMode.toUpperCase()}"`,
                `"${s.isExchange ? 'Exchange/Return' : 'Regular Sale'}"`,
                s.itemCount,
                `"${productNames.replace(/"/g, '""')}"`,
                s.subtotal,
                s.discountAmount,
                s.gstRate,
                s.totalGst || 0,
                s.totalAmount,
                s.profit,
                `"${s.createdBy || 'System'}"`,
                `"${s.salesperson?.name || 'N/A'}"`,
                s.commissionEarned
            ];
        });

        const csvContent = [
            `Shree Banarasi Sarees - In-Store POS Sales Ledger`,
            `Export Generated: ${new Date().toLocaleString()}`,
            `Period: ${startDate || 'Earliest'} to ${endDate || 'Latest'}`,
            `Total Revenue: ₹${stats.totalRevenue} | Total Bills: ${stats.invoiceCount} | Net Profit: ₹${stats.totalProfit}`,
            '',
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `instore_sales_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exported ${filteredSales.length} in-store transactions successfully`);
    };

    const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

    return (
        <motion.div
            className="space-y-5 max-w-7xl mx-auto px-2 pb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-maroon to-maroon-dark text-gold rounded-xl shadow-md shadow-maroon/20">
                        <Store className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl md:text-2xl font-bold font-serif text-maroon tracking-wide">
                                In-Store & POS Sales
                            </h1>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/15 text-maroon border border-gold/30 uppercase tracking-widest font-mono">
                                POS Ledger
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 font-sans">
                            Complete record of walk-in store transactions, tax receipts, cashier audits & customer history
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        className="h-9 text-xs border-gold/30 text-maroon hover:bg-gold/5 font-bold uppercase tracking-wider px-3 gap-1.5 cursor-pointer"
                        onClick={() => {
                            refetch();
                            toast.success('Syncing latest POS sales from store database...');
                        }}
                        disabled={isRefetching}
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", isRefetching && "animate-spin text-maroon")} />
                        Sync Data
                    </Button>

                    <Button
                        variant="outline"
                        className="h-9 text-xs border-gold/30 text-maroon hover:bg-gold/5 font-bold uppercase tracking-wider px-3 gap-1.5 cursor-pointer"
                        onClick={exportToCSV}
                    >
                        <Download className="h-3.5 w-3.5" />
                        Export CSV
                    </Button>

                    <Button
                        className="bg-gradient-to-r from-maroon to-maroon-dark hover:from-maroon-dark hover:to-maroon-dark text-gold font-bold h-9 text-xs gap-1.5 px-3.5 uppercase tracking-wider shadow-md shadow-maroon/20 cursor-pointer"
                        onClick={() => navigate('/sales')}
                    >
                        <Plus className="h-4 w-4 text-gold" />
                        New POS Bill
                    </Button>
                </div>
            </div>

            {/* Top KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    {
                        label: 'Gross POS Revenue',
                        value: formatCurrency(stats.totalRevenue),
                        sub: `AOV: ${formatCurrency(stats.aov)} / bill`,
                        icon: IndianRupee,
                        from: 'from-maroon',
                        to: 'to-maroon-dark',
                        text: 'text-maroon'
                    },
                    {
                        label: 'Transactions Billed',
                        value: `${stats.invoiceCount} Bills`,
                        sub: `${stats.totalItemsCount} total items sold`,
                        icon: Receipt,
                        from: 'from-amber-600',
                        to: 'to-amber-700',
                        text: 'text-amber-800'
                    },
                    {
                        label: 'Net Margin Realized',
                        value: formatCurrency(stats.totalProfit),
                        sub: `${stats.profitMarginPct}% profit margin`,
                        icon: TrendingUp,
                        from: 'from-emerald-600',
                        to: 'to-emerald-800',
                        text: 'text-emerald-700'
                    },
                    {
                        label: 'Payment Distribution',
                        value: `₹${Math.round(stats.upiAmount / 1000)}k UPI`,
                        sub: `₹${Math.round(stats.cashAmount / 1000)}k Cash · ₹${Math.round(stats.cardAmount / 1000)}k Card`,
                        icon: Coins,
                        from: 'from-indigo-600',
                        to: 'to-indigo-800',
                        text: 'text-indigo-800'
                    },
                ].map((s, i) => (
                    <motion.div
                        key={s.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: i * 0.05 }}
                    >
                        <Card className="border-gold/20 shadow-sm hover:shadow-md transition-shadow bg-white">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                                        {s.label}
                                    </span>
                                    <span className={cn("text-xl font-bold font-mono block", s.text)}>
                                        {s.value}
                                    </span>
                                    <span className="text-[10px] text-gray-400 block font-medium">
                                        {s.sub}
                                    </span>
                                </div>
                                <div className={cn("p-2.5 bg-gradient-to-br text-white rounded-xl shadow", s.from, s.to)}>
                                    <s.icon className="h-5 w-5 text-gold" />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Filter and Date Presets Section */}
            <Card className="border-gold/20 shadow-sm bg-white">
                <CardContent className="p-3.5 space-y-3">
                    {/* Date Presets Row */}
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold text-maroon uppercase mr-1 flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                Date Presets:
                            </span>
                            {(
                                [
                                    { key: 'today', label: 'Today' },
                                    { key: 'yesterday', label: 'Yesterday' },
                                    { key: 'week', label: 'This Week' },
                                    { key: 'month', label: 'This Month' },
                                    { key: '30days', label: 'Last 30 Days' },
                                    { key: 'year', label: 'This Year' },
                                    { key: 'all', label: 'All Time' },
                                ] as const
                            ).map(preset => (
                                <Button
                                    key={preset.key}
                                    variant="ghost"
                                    className={cn(
                                        "h-7 text-[10px] uppercase px-2.5 font-bold cursor-pointer transition-colors rounded-md",
                                        activePreset === preset.key
                                            ? "bg-maroon text-gold shadow-xs"
                                            : "text-gray-500 hover:bg-cream/20 hover:text-maroon"
                                    )}
                                    onClick={() => handleSetPreset(preset.key)}
                                >
                                    {preset.label}
                                </Button>
                            ))}
                        </div>

                        {/* Custom Date Pickers */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">Custom Range:</span>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    setActivePreset('month');
                                }}
                                className="h-8 text-xs w-[130px] border-gold/25 font-mono focus-visible:ring-maroon bg-white"
                            />
                            <span className="text-xs text-gray-400 font-mono">to</span>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    setActivePreset('month');
                                }}
                                className="h-8 text-xs w-[130px] border-gold/25 font-mono focus-visible:ring-maroon bg-white"
                            />
                        </div>
                    </div>

                    {/* Search & Secondary Filter Row */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1 border-t border-gold/10">
                        {/* Search Input (6 cols) */}
                        <div className="md:col-span-6 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search by Invoice #, SL-ID, Customer, Mobile, Saree, Cashier, Agent..."
                                className="pl-9 h-9 text-xs border-gold/25 focus-visible:ring-maroon bg-white w-full"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Payment Mode (3 cols) */}
                        <div className="md:col-span-3">
                            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                                <SelectTrigger className="h-9 text-xs border-gold/25 bg-white">
                                    <SelectValue placeholder="Payment Mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Payment Modes</SelectItem>
                                    <SelectItem value="cash">Cash Only</SelectItem>
                                    <SelectItem value="upi">UPI / QR Code</SelectItem>
                                    <SelectItem value="card">Card / POS Machine</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Type Filter (3 cols) */}
                        <div className="md:col-span-3">
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="h-9 text-xs border-gold/25 bg-white">
                                    <SelectValue placeholder="Transaction Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Transaction Types</SelectItem>
                                    <SelectItem value="regular">Regular Sales Only</SelectItem>
                                    <SelectItem value="exchange">Exchanges & Returns</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Sales Table Container */}
            <Card className="border-gold/20 shadow-md overflow-hidden bg-white">
                <CardHeader className="bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/10 px-4 py-3">
                    <CardTitle className="text-sm font-bold text-maroon uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-maroon/70" />
                            In-Store Transaction Records ({filteredSales.length})
                        </span>
                        <span className="text-[10px] text-gray-500 normal-case font-normal hidden sm:inline">
                            Showing page {currentPage} of {totalPages || 1}
                        </span>
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-cream/15">
                                <TableRow className="border-b border-gold/10 hover:bg-transparent">
                                    <TableHead className="h-10 text-[10px] font-bold text-maroon py-1.5 px-3">Date & Time</TableHead>
                                    <TableHead className="h-10 text-[10px] font-bold text-maroon py-1.5">Invoice # / ID</TableHead>
                                    <TableHead className="h-10 text-[10px] font-bold text-maroon py-1.5">Customer</TableHead>
                                    <TableHead className="h-10 text-[10px] font-bold text-maroon py-1.5">Items Summary</TableHead>
                                    <TableHead className="h-10 text-[10px] font-bold text-maroon py-1.5">Payment</TableHead>
                                    <TableHead className="h-10 text-[10px] font-bold text-maroon py-1.5 text-right">Subtotal</TableHead>
                                    <TableHead className="h-10 text-[10px] font-bold text-maroon py-1.5 text-right">Tax (GST)</TableHead>
                                    <TableHead className="h-10 text-[10px] font-bold text-maroon py-1.5 text-right">Grand Total</TableHead>
                                    <TableHead className="h-10 text-[10px] font-bold text-maroon py-1.5 text-right">Profit</TableHead>
                                    <TableHead className="h-10 text-[10px] font-bold text-maroon py-1.5">Attendant / Cashier</TableHead>
                                    <TableHead className="h-10 text-[10px] font-bold text-maroon py-1.5 text-center px-3">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={11} className="h-32 text-center text-maroon/60 text-xs italic">
                                            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-maroon" />
                                            Loading in-store sales records...
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedSales.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={11} className="h-36 text-center text-gray-400">
                                            <div className="max-w-xs mx-auto space-y-1.5">
                                                <Store className="h-8 w-8 mx-auto text-gray-300 stroke-[1.5]" />
                                                <p className="text-xs font-semibold text-gray-600">No In-Store Sales Found</p>
                                                <p className="text-[11px] text-gray-400">
                                                    No sales match the selected date range or search terms. Try clearing filters or create a new POS bill.
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedSales.map((sale) => {
                                        const saleDateObj = new Date(sale.createdAt);
                                        const formattedDate = saleDateObj.toLocaleDateString('en-IN', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric'
                                        });
                                        const formattedTime = saleDateObj.toLocaleTimeString('en-IN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true
                                        });

                                        return (
                                            <TableRow
                                                key={sale.id}
                                                className="hover:bg-cream/10 border-b border-gold/5 transition-colors cursor-pointer"
                                                onClick={() => setSelectedSaleForDetails(sale)}
                                            >
                                                {/* Date & Time */}
                                                <TableCell className="py-2.5 px-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-mono font-medium text-gray-800">
                                                            {formattedDate}
                                                        </span>
                                                        <span className="text-[9.5px] font-mono text-gray-400">
                                                            {formattedTime}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* Invoice # and Sale ID */}
                                                <TableCell className="py-2.5">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1">
                                                            <span
                                                                className="text-xs font-bold font-mono text-maroon hover:underline truncate max-w-[120px]"
                                                                title={sale.invoiceNumber}
                                                            >
                                                                {sale.invoiceNumber}
                                                            </span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCopyInvoice(sale.invoiceNumber);
                                                                }}
                                                                className="text-gray-400 hover:text-maroon p-0.5 rounded hover:bg-gray-100 transition-all cursor-pointer"
                                                                title="Copy Invoice #"
                                                            >
                                                                {copiedInvoice === sale.invoiceNumber ? (
                                                                    <Check className="h-3 w-3 text-emerald-600" />
                                                                ) : (
                                                                    <Copy className="h-3 w-3" />
                                                                )}
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <span className="text-[9px] font-mono text-gray-500">
                                                                {sale.friendlyId}
                                                            </span>
                                                            {sale.isExchange && (
                                                                <span className="text-[8px] font-bold px-1 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                                                    Exchange
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Customer */}
                                                <TableCell className="py-2.5">
                                                    <div className="flex flex-col max-w-[140px]">
                                                        <span className="text-xs font-semibold text-gray-800 truncate" title={sale.customer?.name || 'Walk-in Customer'}>
                                                            {sale.customer?.name || 'Walk-in Customer'}
                                                        </span>
                                                        <span className="text-[10px] font-mono text-gray-500 truncate">
                                                            {sale.customer?.mobile || 'No Phone'}
                                                        </span>
                                                        {sale.customer?.loyaltyMemberCode && (
                                                            <span className="text-[8.5px] font-bold text-amber-700 font-mono mt-0.5 flex items-center gap-0.5">
                                                                <Award className="h-2.5 w-2.5" />
                                                                {sale.customer.loyaltyMemberCode}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Items Summary */}
                                                <TableCell className="py-2.5">
                                                    <div className="flex flex-col max-w-[170px]">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="inline-flex items-center justify-center h-5 px-1.5 rounded-md bg-gray-100 text-gray-800 text-[10px] font-bold font-mono">
                                                                {sale.itemCount} {sale.itemCount === 1 ? 'item' : 'items'}
                                                            </span>
                                                            {sale.discountAmount > 0 && (
                                                                <span className="text-[8.5px] font-bold px-1 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                                                    -₹{sale.discountAmount}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10.5px] text-gray-600 truncate mt-1" title={sale.items.map(i => i.sareeName).join(', ')}>
                                                            {sale.items.map(i => i.sareeName).join(', ')}
                                                        </p>
                                                    </div>
                                                </TableCell>

                                                {/* Payment Mode */}
                                                <TableCell className="py-2.5">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono",
                                                        sale.paymentMode === 'cash' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                                        sale.paymentMode === 'upi' ? "bg-indigo-50 text-indigo-700 border border-indigo-200" :
                                                        sale.paymentMode === 'card' ? "bg-blue-50 text-blue-700 border border-blue-200" :
                                                        "bg-gray-100 text-gray-700 border border-gray-200"
                                                    )}>
                                                        {sale.paymentMode === 'cash' && <Coins className="h-3 w-3" />}
                                                        {sale.paymentMode === 'upi' && <QrCode className="h-3 w-3" />}
                                                        {sale.paymentMode === 'card' && <CreditCard className="h-3 w-3" />}
                                                        {sale.paymentMode}
                                                    </span>
                                                </TableCell>

                                                {/* Subtotal */}
                                                <TableCell className="py-2.5 text-xs text-right font-mono text-gray-600">
                                                    {formatCurrency(sale.subtotal)}
                                                </TableCell>

                                                {/* GST */}
                                                <TableCell className="py-2.5 text-xs text-right font-mono text-gray-600">
                                                    {sale.isGstApplied && sale.totalGst ? (
                                                        <span title={`GST Rate: ${sale.gstRate}%`}>
                                                            {formatCurrency(sale.totalGst)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 text-[10px]">None</span>
                                                    )}
                                                </TableCell>

                                                {/* Grand Total */}
                                                <TableCell className="py-2.5 text-xs text-right font-bold font-mono text-maroon">
                                                    {formatCurrency(sale.totalAmount)}
                                                </TableCell>

                                                {/* Net Margin / Profit */}
                                                <TableCell className="py-2.5 text-xs text-right font-bold font-mono text-emerald-700">
                                                    {formatCurrency(sale.profit)}
                                                </TableCell>

                                                {/* Attendant / Cashier */}
                                                <TableCell className="py-2.5">
                                                    <div className="flex flex-col max-w-[120px]">
                                                        {sale.salesperson?.name ? (
                                                            <span className="text-[11px] font-bold text-gray-700 truncate" title={`Salesperson: ${sale.salesperson.name}`}>
                                                                Agent: {sale.salesperson.name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-400 italic">No Agent</span>
                                                        )}
                                                        <span className="text-[9px] font-mono text-gray-400 truncate" title={`Cashier: ${sale.createdBy || 'system'}`}>
                                                            By: {sale.createdBy?.split('@')[0] || 'system'}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-center gap-1">
                                                        {/* Details button */}
                                                        <button
                                                            onClick={() => setSelectedSaleForDetails(sale)}
                                                            className="p-1.5 rounded-md hover:bg-cream/20 text-gray-600 hover:text-maroon transition-colors cursor-pointer"
                                                            title="View Full Sale Details"
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </button>

                                                        {/* Receipt print / modal button */}
                                                        <button
                                                            onClick={() => handleOpenReceipt(sale)}
                                                            className="p-1.5 rounded-md hover:bg-cream/20 text-maroon hover:text-maroon-dark transition-colors cursor-pointer"
                                                            title="Print / View Tax Receipt"
                                                        >
                                                            <Receipt className="h-3.5 w-3.5" />
                                                        </button>

                                                        {/* WhatsApp Share button */}
                                                        <button
                                                            onClick={() => handleShareWhatsApp(sale)}
                                                            className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                                                            title="Share Receipt on WhatsApp"
                                                        >
                                                            <Share2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Bar */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gold/10 bg-cream/5">
                            <p className="text-[11px] text-gray-500 font-mono">
                                Showing <span className="font-bold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-gray-800">{Math.min(currentPage * itemsPerPage, filteredSales.length)}</span> of <span className="font-bold text-gray-800">{filteredSales.length}</span> sales
                            </p>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-gold/25 text-maroon h-8 w-8 p-0 hover:bg-cream/20 cursor-pointer disabled:opacity-40"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-[11px] font-mono text-gray-600 px-2 font-semibold">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-gold/25 text-maroon h-8 w-8 p-0 hover:bg-cream/20 cursor-pointer disabled:opacity-40"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Sale Details Dialog */}
            <Dialog open={Boolean(selectedSaleForDetails)} onOpenChange={(open) => !open && setSelectedSaleForDetails(null)}>
                <DialogContent className="max-w-2xl bg-white border border-gold/30 p-0 overflow-hidden shadow-xl max-h-[90vh] flex flex-col">
                    {selectedSaleForDetails && (
                        <>
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-maroon to-maroon-dark text-cream p-4 border-b border-gold/20 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold font-serif text-gold">
                                            {selectedSaleForDetails.invoiceNumber}
                                        </h3>
                                        {selectedSaleForDetails.isExchange && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30 uppercase">
                                                Exchange / Return
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-cream/70 font-mono">
                                        Sale ID: {selectedSaleForDetails.friendlyId} · Billed on {new Date(selectedSaleForDetails.createdAt).toLocaleString()}
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-gold/30 text-gold hover:bg-gold/10 h-8 text-xs font-bold gap-1 cursor-pointer bg-transparent"
                                    onClick={() => handleOpenReceipt(selectedSaleForDetails)}
                                >
                                    <Receipt className="h-3.5 w-3.5" />
                                    Tax Receipt
                                </Button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-4 overflow-y-auto space-y-4 flex-1">
                                {/* Customer & Staff Quick Info */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-cream/10 rounded-lg border border-gold/15">
                                    <div>
                                        <span className="text-[9.5px] font-bold text-maroon uppercase tracking-wider block mb-1">
                                            Customer Information
                                        </span>
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-bold text-gray-800">
                                                {selectedSaleForDetails.customer?.name || 'Walk-in Customer'}
                                            </p>
                                            <p className="text-[11px] font-mono text-gray-500 flex items-center gap-1">
                                                <Phone className="h-3 w-3 text-gray-400" />
                                                {selectedSaleForDetails.customer?.mobile || 'No phone registered'}
                                            </p>
                                            {selectedSaleForDetails.customer?.loyaltyMemberCode && (
                                                <p className="text-[10px] font-mono font-bold text-amber-700 flex items-center gap-1">
                                                    <Award className="h-3 w-3" />
                                                    Loyalty Code: {selectedSaleForDetails.customer.loyaltyMemberCode} ({selectedSaleForDetails.customer.loyaltyTier})
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-[9.5px] font-bold text-maroon uppercase tracking-wider block mb-1">
                                            Transaction & Staff Details
                                        </span>
                                        <div className="space-y-0.5 text-xs text-gray-700">
                                            <p>
                                                <span className="text-gray-400 text-[11px]">Payment Mode:</span>{' '}
                                                <span className="font-bold font-mono uppercase text-maroon">
                                                    {selectedSaleForDetails.paymentMode}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-gray-400 text-[11px]">Cashier:</span>{' '}
                                                <span className="font-mono text-[11px] text-gray-600">
                                                    {selectedSaleForDetails.createdBy || 'System'}
                                                </span>
                                            </p>
                                            {selectedSaleForDetails.salesperson?.name && (
                                                <p>
                                                    <span className="text-gray-400 text-[11px]">Staff Attendant:</span>{' '}
                                                    <span className="font-semibold text-gray-800">
                                                        {selectedSaleForDetails.salesperson.name}
                                                    </span>
                                                    {selectedSaleForDetails.commissionEarned > 0 && (
                                                        <span className="text-emerald-700 font-mono text-[10px] ml-1">
                                                            (Comm: ₹{selectedSaleForDetails.commissionEarned})
                                                        </span>
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Items Itemized List */}
                                <div>
                                    <h4 className="text-[10.5px] font-bold text-maroon uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Package className="h-3.5 w-3.5" />
                                        Purchased Sarees & Items ({selectedSaleForDetails.items.length})
                                    </h4>

                                    <div className="border border-gold/15 rounded-lg overflow-hidden bg-white">
                                        <Table>
                                            <TableHeader className="bg-cream/15">
                                                <TableRow className="border-b border-gold/10">
                                                    <TableHead className="h-8 text-[9.5px] font-bold text-maroon py-1 px-3">Item</TableHead>
                                                    <TableHead className="h-8 text-[9.5px] font-bold text-maroon py-1 text-center">Qty</TableHead>
                                                    <TableHead className="h-8 text-[9.5px] font-bold text-maroon py-1 text-right">Unit Price</TableHead>
                                                    <TableHead className="h-8 text-[9.5px] font-bold text-maroon py-1 text-right">Amount</TableHead>
                                                    <TableHead className="h-8 text-[9.5px] font-bold text-maroon py-1 text-right px-3">Margin</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedSaleForDetails.items.map((item, idx) => (
                                                    <TableRow key={item.id || idx} className="border-b border-gold/5 text-xs">
                                                        <TableCell className="py-2 px-3">
                                                            <div className="flex items-center gap-2">
                                                                {item.imageUrl ? (
                                                                    <img
                                                                        src={item.imageUrl}
                                                                        alt={item.sareeName}
                                                                        className="h-8 w-8 object-cover rounded border border-gold/20 flex-shrink-0"
                                                                        onError={(e) => {
                                                                            (e.target as HTMLElement).style.display = 'none';
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="h-8 w-8 rounded bg-cream/20 flex items-center justify-center text-maroon font-bold text-[10px] flex-shrink-0">
                                                                        {idx + 1}
                                                                    </div>
                                                                )}
                                                                <div className="min-w-0">
                                                                    <p className="font-semibold text-gray-800 truncate max-w-[200px]" title={item.sareeName}>
                                                                        {item.sareeName}
                                                                    </p>
                                                                    <div className="flex items-center gap-1.5 text-[9.5px] text-gray-400 font-mono">
                                                                        {item.sku && <span>SKU: {item.sku}</span>}
                                                                        {item.category && <span>· {item.category}</span>}
                                                                        {item.isReturn && (
                                                                            <span className="text-amber-700 font-bold bg-amber-50 px-1 rounded">
                                                                                Returned
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-2 text-center font-mono font-bold">
                                                            {item.quantity}
                                                        </TableCell>
                                                        <TableCell className="py-2 text-right font-mono text-gray-600">
                                                            {formatCurrency(item.sellingPrice)}
                                                        </TableCell>
                                                        <TableCell className={cn(
                                                            "py-2 text-right font-mono font-semibold",
                                                            item.isReturn ? "text-amber-700" : "text-gray-800"
                                                        )}>
                                                            {item.isReturn ? `-₹${Math.abs(item.totalAmount)}` : formatCurrency(item.totalAmount)}
                                                        </TableCell>
                                                        <TableCell className="py-2 text-right font-mono font-bold text-emerald-700 px-3">
                                                            {formatCurrency(item.profit)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {/* Financial Summary Totals */}
                                <div className="p-3.5 bg-cream/10 rounded-lg border border-gold/15 space-y-1.5 text-xs">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Gross Subtotal:</span>
                                        <span className="font-mono">{formatCurrency(selectedSaleForDetails.subtotal)}</span>
                                    </div>

                                    {selectedSaleForDetails.discountAmount > 0 && (
                                        <div className="flex justify-between text-rose-700 font-semibold">
                                            <span>Special Bill Discount ({selectedSaleForDetails.discountPercentage}%):</span>
                                            <span className="font-mono">-₹{selectedSaleForDetails.discountAmount}</span>
                                        </div>
                                    )}

                                    {selectedSaleForDetails.isGstApplied && (
                                        <>
                                            <div className="flex justify-between text-gray-500 text-[11px] pt-1 border-t border-gold/10">
                                                <span>Taxable Base Value:</span>
                                                <span className="font-mono">
                                                    {formatCurrency(selectedSaleForDetails.taxableAmount || (selectedSaleForDetails.totalAmount - (selectedSaleForDetails.totalGst || 0)))}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-gray-500 text-[11px]">
                                                <span>CGST + SGST ({selectedSaleForDetails.gstRate}%):</span>
                                                <span className="font-mono">{formatCurrency(selectedSaleForDetails.totalGst || 0)}</span>
                                            </div>
                                        </>
                                    )}

                                    <div className="flex justify-between items-center text-sm font-bold text-maroon pt-2 border-t border-gold/20">
                                        <span>Grand Net Amount Paid:</span>
                                        <span className="text-base font-mono">{formatCurrency(selectedSaleForDetails.totalAmount)}</span>
                                    </div>

                                    <div className="flex justify-between items-center text-[11px] font-bold text-emerald-700 pt-1">
                                        <span>Total Realized Profit:</span>
                                        <span className="font-mono">{formatCurrency(selectedSaleForDetails.profit)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-3 border-t border-gold/15 bg-white flex items-center justify-between gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-emerald-500/30 text-emerald-700 hover:bg-emerald-50 text-xs font-bold gap-1.5 cursor-pointer"
                                    onClick={() => handleShareWhatsApp(selectedSaleForDetails)}
                                >
                                    <Share2 className="h-3.5 w-3.5 text-emerald-600" />
                                    WhatsApp Receipt
                                </Button>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-gold/20 text-gray-600 text-xs cursor-pointer"
                                        onClick={() => setSelectedSaleForDetails(null)}
                                    >
                                        Close
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="bg-maroon hover:bg-maroon-dark text-gold text-xs font-bold gap-1.5 cursor-pointer shadow"
                                        onClick={() => handleOpenReceipt(selectedSaleForDetails)}
                                    >
                                        <Receipt className="h-3.5 w-3.5 text-gold" />
                                        Print Tax Receipt
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Receipt Modal */}
            <ReceiptModal
                isOpen={isReceiptModalOpen}
                onClose={() => {
                    setIsReceiptModalOpen(false);
                    setSelectedSaleForReceipt(null);
                }}
                sale={selectedSaleForReceipt}
            />
        </motion.div>
    );
}
