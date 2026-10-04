import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
    Package,
    Clock,
    HandCoins,
    AlertCircle
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
import { calculateGst } from '@/config/gstConfig';

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
    const [dueFilter, setDueFilter] = React.useState<string>('all'); // all, due, paid

    // Pagination
    const [currentPage, setCurrentPage] = React.useState(1);
    const itemsPerPage = 15;

    // Modals
    const [selectedSaleForDetails, setSelectedSaleForDetails] = React.useState<DetailedSale | null>(null);
    const [selectedSaleForReceipt, setSelectedSaleForReceipt] = React.useState<any | null>(null);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = React.useState(false);
    const [copiedInvoice, setCopiedInvoice] = React.useState<string | null>(null);

    // Due Collection Modal State
    const [saleForDueCollection, setSaleForDueCollection] = React.useState<DetailedSale | null>(null);
    const [repayAmount, setRepayAmount] = React.useState('');
    const [repayPaymentMode, setRepayPaymentMode] = React.useState<'cash' | 'upi' | 'card'>('cash');
    const [repayNotes, setRepayNotes] = React.useState('');

    const queryClient = useQueryClient();

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

    // Due Repayment Mutation
    const dueRepaymentMutation = useMutation({
        mutationFn: salesService.recordDueRepayment,
        onSuccess: (updatedSale) => {
            queryClient.invalidateQueries({ queryKey: ['detailed-instore-sales'] });
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            toast.success(`Payment of ₹${repayAmount} collected successfully!`);
            setSaleForDueCollection(null);
            setRepayAmount('');
            setRepayNotes('');
            if (selectedSaleForDetails && selectedSaleForDetails.id === updatedSale.saleId) {
                setSelectedSaleForDetails(prev => prev ? {
                    ...prev,
                    amountPaid: updatedSale.amountPaid,
                    dueAmount: updatedSale.dueAmount,
                    paymentStatus: updatedSale.paymentStatus,
                } : null);
            }
        },
        onError: (err: any) => {
            toast.error(err?.message || 'Failed to record repayment. Please ensure the database migration script has been run in Supabase.');
        }
    });

    const handleOpenCollectDue = (sale: DetailedSale) => {
        setSaleForDueCollection(sale);
        setRepayAmount(String(sale.dueAmount || 0));
        setRepayPaymentMode('cash');
        setRepayNotes('');
    };

    const handleConfirmRepayment = () => {
        if (!saleForDueCollection) return;
        const amountNum = parseFloat(repayAmount);
        if (isNaN(amountNum) || amountNum <= 0) {
            toast.error('Please enter a valid repayment amount greater than 0');
            return;
        }
        if (amountNum > (saleForDueCollection.dueAmount || 0)) {
            toast.error(`Amount cannot exceed current outstanding due of ₹${saleForDueCollection.dueAmount}`);
            return;
        }

        dueRepaymentMutation.mutate({
            saleId: saleForDueCollection.id,
            customerId: saleForDueCollection.customer?.id || saleForDueCollection.customerId || null,
            amount: amountNum,
            paymentMode: repayPaymentMode,
            notes: repayNotes.trim() ? repayNotes.trim() : undefined,
        });
    };

    const [updatingSaleId, setUpdatingSaleId] = React.useState<string | null>(null);
    const [isBulkUpdatingGst, setIsBulkUpdatingGst] = React.useState(false);

    const handleToggleSaleGst = async (sale: DetailedSale) => {
        try {
            setUpdatingSaleId(sale.id);
            const targetGst = !sale.isGstApplied;
            await salesService.updateSaleGst(sale.id, targetGst);
            await queryClient.invalidateQueries({ queryKey: ['detailed-instore-sales'] });

            const gross = Number(sale.totalAmount || 0);
            const gst = calculateGst(gross, targetGst);
            if (selectedSaleForDetails && selectedSaleForDetails.id === sale.id) {
                setSelectedSaleForDetails(prev => prev ? {
                    ...prev,
                    isGstApplied: targetGst,
                    gstRate: gst.gstRate,
                    taxableAmount: gst.taxableAmount,
                    cgstRate: gst.cgstRate,
                    cgstAmount: gst.cgstAmount,
                    sgstRate: gst.sgstRate,
                    sgstAmount: gst.sgstAmount,
                    totalGst: gst.totalGst,
                } : null);
            }

            toast.success(targetGst ? `Added 5% inclusive GST to invoice ${sale.invoiceNumber}` : `Changed ${sale.invoiceNumber} to non-GST retail bill`);
        } catch (err: any) {
            console.error('Failed to update sale GST:', err);
            toast.error(err?.message || 'Failed to update GST on sale');
        } finally {
            setUpdatingSaleId(null);
        }
    };

    const handleBulkBackfillGst = async () => {
        const confirmed = window.confirm(
            'Apply 5% Inclusive GST to all past in-store sales?\n\n' +
            '• The total amounts paid by customers will NOT change.\n' +
            '• Receipts and invoices will now show the Taxable Value and 5% GST (CGST 2.5% + SGST 2.5%) breakdown.'
        );
        if (!confirmed) return;

        try {
            setIsBulkUpdatingGst(true);
            const count = await salesService.bulkUpdatePastSalesGst(true);
            await queryClient.invalidateQueries({ queryKey: ['detailed-instore-sales'] });
            toast.success(`Successfully added 5% inclusive GST to ${count} past sales!`);
        } catch (err: any) {
            console.error('Failed bulk GST update:', err);
            toast.error(err?.message || 'Failed to bulk update past sales GST');
        } finally {
            setIsBulkUpdatingGst(false);
        }
    };

    // Reset page when filter criteria change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [startDate, endDate, searchQuery, paymentFilter, typeFilter, dueFilter]);

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

            // Due Status Filter
            if (dueFilter === 'due') {
                if (!sale.dueAmount || sale.dueAmount <= 0) return false;
            } else if (dueFilter === 'paid') {
                if (sale.dueAmount && sale.dueAmount > 0) return false;
            }

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
    }, [sales, startDate, endDate, paymentFilter, typeFilter, dueFilter, searchQuery]);

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

        // Due / Credit Ledger
        const totalDueOutstanding = filteredSales.reduce((acc, s) => acc + (s.dueAmount || 0), 0);
        const countWithDue = filteredSales.filter(s => (s.dueAmount || 0) > 0).length;

        return {
            totalRevenue,
            totalProfit,
            totalItemsCount,
            invoiceCount,
            aov,
            profitMarginPct,
            cashAmount,
            upiAmount,
            cardAmount,
            totalDueOutstanding,
            countWithDue
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
            'Payment Status',
            'Amount Paid (₹)',
            'Due Amount (₹)',
            'Due Date',
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
                `"${(s.dueAmount && s.dueAmount > 0) ? 'DUE / PARTIAL' : 'PAID'}"`,
                s.amountPaid ?? (s.totalAmount - (s.dueAmount || 0)),
                s.dueAmount || 0,
                `"${s.dueDate || 'N/A'}"`,
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
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
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
                        label: 'Outstanding Dues (Udhar)',
                        value: formatCurrency(stats.totalDueOutstanding),
                        sub: `${stats.countWithDue} bills pending collection`,
                        icon: Clock,
                        from: 'from-rose-600',
                        to: 'to-rose-800',
                        text: 'text-rose-700'
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-1 border-t border-gold/10">
                        {/* Search Input (4 cols) */}
                        <div className="lg:col-span-4 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search by Invoice #, SL-ID, Customer, Mobile, Saree, Cashier..."
                                className="pl-9 h-9 text-xs border-gold/25 focus-visible:ring-maroon bg-white w-full"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Payment Mode (2 cols) */}
                        <div className="lg:col-span-2">
                            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                                <SelectTrigger className="h-9 text-xs border-gold/25 bg-white">
                                    <SelectValue placeholder="Payment Mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Modes</SelectItem>
                                    <SelectItem value="cash">Cash Only</SelectItem>
                                    <SelectItem value="upi">UPI / QR Code</SelectItem>
                                    <SelectItem value="card">Card / POS</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Type Filter (3 cols) */}
                        <div className="lg:col-span-3">
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

                        {/* Due Filter (3 cols) */}
                        <div className="lg:col-span-3">
                            <Select value={dueFilter} onValueChange={setDueFilter}>
                                <SelectTrigger className="h-9 text-xs border-gold/25 bg-white">
                                    <SelectValue placeholder="Payment Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses (Paid & Due)</SelectItem>
                                    <SelectItem value="due">⚠️ Has Pending Due (Udhar)</SelectItem>
                                    <SelectItem value="paid">✓ Fully Paid Only</SelectItem>
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
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isBulkUpdatingGst}
                                onClick={handleBulkBackfillGst}
                                className="h-7 text-[10px] font-bold border-gold/30 text-maroon hover:bg-gold/10 gap-1 cursor-pointer"
                                title="Add 5% inclusive GST details to all past sales receipts"
                            >
                                {isBulkUpdatingGst ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <Receipt className="h-3 w-3 text-maroon" />
                                )}
                                <span>{isBulkUpdatingGst ? 'Updating...' : 'Add GST to All Past Sales'}</span>
                            </Button>
                            <span className="text-[10px] text-gray-500 normal-case font-normal hidden sm:inline">
                                Showing page {currentPage} of {totalPages || 1}
                            </span>
                        </div>
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
                                    <TableHead className="h-10 text-[10px] font-bold text-maroon py-1.5">Payment & Status</TableHead>
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

                                                {/* Payment Mode & Due Status */}
                                                <TableCell className="py-2.5">
                                                    <div className="flex flex-col items-start gap-1">
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
                                                        {sale.dueAmount && sale.dueAmount > 0 ? (
                                                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                                                                <Clock className="h-2.5 w-2.5 text-rose-600" />
                                                                Due: ₹{sale.dueAmount.toLocaleString('en-IN')}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[8.5px] font-bold text-emerald-700 font-mono">
                                                                ✓ Fully Paid
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Subtotal */}
                                                <TableCell className="py-2.5 text-xs text-right font-mono text-gray-600">
                                                    {formatCurrency(sale.subtotal)}
                                                </TableCell>

                                                {/* GST */}
                                                <TableCell className="py-2.5 text-xs text-right font-mono" onClick={(e) => e.stopPropagation()}>
                                                    {sale.isGstApplied && sale.totalGst ? (
                                                        <span
                                                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold"
                                                            title={`GST 5% Included: ₹${sale.totalGst} (Taxable: ₹${sale.taxableAmount || (sale.totalAmount - sale.totalGst)})`}
                                                        >
                                                            {formatCurrency(sale.totalGst)}
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled={updatingSaleId === sale.id}
                                                            onClick={() => handleToggleSaleGst(sale)}
                                                            className="text-[9.5px] font-semibold text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 px-1.5 py-0.5 rounded border border-dashed border-stone-200 hover:border-emerald-300 transition-colors cursor-pointer"
                                                            title="Click to apply 5% inclusive GST to this sale receipt"
                                                        >
                                                            {updatingSaleId === sale.id ? 'Updating...' : '+ Add GST'}
                                                        </button>
                                                    )}
                                                </TableCell>

                                                {/* Grand Total */}
                                                <TableCell className="py-2.5 text-xs text-right font-bold font-mono">
                                                    <span className="text-maroon block">{formatCurrency(sale.totalAmount)}</span>
                                                    {sale.dueAmount && sale.dueAmount > 0 ? (
                                                        <span className="text-[9.5px] font-normal text-gray-500 font-mono block">
                                                            Recvd: ₹{(sale.amountPaid ?? (sale.totalAmount - sale.dueAmount)).toLocaleString('en-IN')}
                                                        </span>
                                                    ) : null}
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
                                                        {sale.dueAmount && sale.dueAmount > 0 ? (
                                                            <button
                                                                onClick={() => handleOpenCollectDue(sale)}
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors text-[10px] font-bold shadow-xs cursor-pointer mr-1"
                                                                title="Collect Due Payment"
                                                            >
                                                                <HandCoins className="h-3 w-3" />
                                                                <span>Collect</span>
                                                            </button>
                                                        ) : null}

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
                                        <span>Total Bill Amount:</span>
                                        <span className="text-base font-mono">{formatCurrency(selectedSaleForDetails.totalAmount)}</span>
                                    </div>

                                    {selectedSaleForDetails.dueAmount && selectedSaleForDetails.dueAmount > 0 ? (
                                        <>
                                            <div className="flex justify-between items-center text-xs font-semibold text-emerald-800">
                                                <span>Amount Received:</span>
                                                <span className="font-mono">
                                                    {formatCurrency(selectedSaleForDetails.amountPaid ?? (selectedSaleForDetails.totalAmount - selectedSaleForDetails.dueAmount))}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center text-xs font-bold text-rose-700 p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="h-4 w-4 text-rose-600" />
                                                    Balance Due Outstanding (Udhar):
                                                </span>
                                                <span className="text-sm font-mono font-bold">
                                                    {formatCurrency(selectedSaleForDetails.dueAmount)}
                                                </span>
                                            </div>

                                            {selectedSaleForDetails.dueDate && (
                                                <div className="flex justify-between text-amber-800 text-[11px] font-medium px-1">
                                                    <span>Promised Repayment Date:</span>
                                                    <span className="font-mono font-bold">
                                                        {new Date(selectedSaleForDetails.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-[11px] font-semibold text-emerald-700 flex items-center justify-between pt-0.5">
                                            <span>Payment Status:</span>
                                            <span className="font-mono">✓ Fully Paid</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center text-[11px] font-bold text-emerald-700 pt-1 border-t border-gold/10">
                                        <span>Total Realized Profit:</span>
                                        <span className="font-mono">{formatCurrency(selectedSaleForDetails.profit)}</span>
                                    </div>
                                </div>

                                {/* GST Status & Quick Toggle */}
                                <div className="flex items-center justify-between p-2.5 rounded-lg bg-cream/15 border border-gold/20 shadow-2xs">
                                    <div className="flex items-center gap-2">
                                        <Receipt className={cn("h-4 w-4 shrink-0", selectedSaleForDetails.isGstApplied ? "text-emerald-700" : "text-stone-400")} />
                                        <div>
                                            <span className="text-xs font-bold text-gray-800 block">
                                                {selectedSaleForDetails.isGstApplied ? 'GST Tax Invoice (5% Included)' : 'Retail Bill (Non-GST)'}
                                            </span>
                                            <span className="text-[10.5px] text-gray-500 block">
                                                {selectedSaleForDetails.isGstApplied
                                                    ? 'Receipt displays Taxable Base & 5% GST breakdown'
                                                    : 'Click to enable 5% GST breakdown on this receipt'}
                                            </span>
                                        </div>
                                    </div>
                                    {selectedSaleForDetails.isGstApplied ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2.5 py-1 rounded-md shrink-0">
                                            <Check className="h-3 w-3 text-emerald-700" />
                                            <span>GST Included</span>
                                        </span>
                                    ) : (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={updatingSaleId === selectedSaleForDetails.id}
                                            onClick={() => handleToggleSaleGst(selectedSaleForDetails)}
                                            className="h-7 px-3 text-[10px] font-bold rounded border transition-all cursor-pointer bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 hover:text-white shrink-0"
                                        >
                                            {updatingSaleId === selectedSaleForDetails.id ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                '+ Apply 5% GST'
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-3 border-t border-gold/15 bg-white flex flex-wrap items-center justify-between gap-2">
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
                                    {selectedSaleForDetails.dueAmount && selectedSaleForDetails.dueAmount > 0 ? (
                                        <Button
                                            size="sm"
                                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1.5 cursor-pointer shadow"
                                            onClick={() => handleOpenCollectDue(selectedSaleForDetails)}
                                        >
                                            <HandCoins className="h-3.5 w-3.5" />
                                            Collect Due (₹{selectedSaleForDetails.dueAmount})
                                        </Button>
                                    ) : null}

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

            {/* Collect Due Repayment Dialog */}
            <Dialog open={Boolean(saleForDueCollection)} onOpenChange={(open) => !open && setSaleForDueCollection(null)}>
                <DialogContent className="max-w-md bg-white border border-gold/30 p-0 overflow-hidden shadow-2xl">
                    {saleForDueCollection && (
                        <>
                            <div className="bg-gradient-to-r from-amber-700 to-maroon text-cream p-4 border-b border-gold/20">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-lg bg-gold/20 text-gold">
                                        <HandCoins className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold font-serif text-gold">
                                            Collect Customer Due Payment
                                        </h3>
                                        <p className="text-[11px] text-cream/80 font-mono">
                                            Invoice: {saleForDueCollection.invoiceNumber}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 space-y-4 text-xs">
                                {/* Customer Info Box */}
                                <div className="p-3 rounded-lg bg-cream/10 border border-gold/20 space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Customer:</span>
                                        <span className="font-bold text-gray-900">{saleForDueCollection.customer?.name || 'Walk-in'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Mobile:</span>
                                        <span className="font-mono font-medium text-gray-800">{saleForDueCollection.customer?.mobile || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1 border-t border-gold/10">
                                        <span className="text-gray-500">Original Total Bill:</span>
                                        <span className="font-mono font-bold text-gray-800">{formatCurrency(saleForDueCollection.totalAmount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-emerald-700">
                                        <span>Total Paid So Far:</span>
                                        <span className="font-mono font-bold">
                                            {formatCurrency(saleForDueCollection.amountPaid ?? (saleForDueCollection.totalAmount - (saleForDueCollection.dueAmount || 0)))}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-rose-700 font-bold pt-1 border-t border-gold/10">
                                        <span>Current Outstanding Due:</span>
                                        <span className="font-mono text-sm">{formatCurrency(saleForDueCollection.dueAmount || 0)}</span>
                                    </div>
                                    {saleForDueCollection.dueDate && (
                                        <div className="flex justify-between items-center text-amber-800 text-[11px] pt-0.5">
                                            <span>Expected Date:</span>
                                            <span className="font-mono font-bold">{new Date(saleForDueCollection.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Payment Input */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-maroon uppercase tracking-wider block">
                                        Amount Received Now (₹) *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                        <Input
                                            type="number"
                                            min="1"
                                            max={saleForDueCollection.dueAmount || 0}
                                            step="1"
                                            placeholder="Enter repayment amount"
                                            className="pl-8 text-sm font-mono font-bold border-gold/30 focus-visible:ring-maroon h-10"
                                            value={repayAmount}
                                            onChange={(e) => setRepayAmount(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                                        <span>Max Outstanding: ₹{saleForDueCollection.dueAmount || 0}</span>
                                        {parseFloat(repayAmount) > 0 && parseFloat(repayAmount) < (saleForDueCollection.dueAmount || 0) && (
                                            <span className="text-amber-700 font-medium">
                                                Remaining after pay: ₹{(saleForDueCollection.dueAmount || 0) - parseFloat(repayAmount)}
                                            </span>
                                        )}
                                        {parseFloat(repayAmount) === (saleForDueCollection.dueAmount || 0) && (
                                            <span className="text-emerald-700 font-bold">
                                                ✓ Fully marks invoice as cleared
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Payment Mode */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-maroon uppercase tracking-wider block">
                                        Payment Method *
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['cash', 'upi', 'card'] as const).map(mode => (
                                            <button
                                                key={mode}
                                                type="button"
                                                className={cn(
                                                    "p-2.5 rounded-lg border text-center transition-all cursor-pointer font-bold text-xs uppercase flex flex-col items-center justify-center gap-1",
                                                    repayPaymentMode === mode
                                                        ? "bg-maroon text-gold border-maroon shadow-sm"
                                                        : "bg-white text-gray-700 border-gold/20 hover:border-maroon/50"
                                                )}
                                                onClick={() => setRepayPaymentMode(mode)}
                                            >
                                                {mode === 'cash' && <Coins className="h-4 w-4" />}
                                                {mode === 'upi' && <QrCode className="h-4 w-4" />}
                                                {mode === 'card' && <CreditCard className="h-4 w-4" />}
                                                {mode}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Repayment Notes */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-maroon uppercase tracking-wider block">
                                        Notes / Reference (Optional)
                                    </label>
                                    <Input
                                        placeholder="e.g. Paid cash at counter / GPay ref 9482"
                                        className="text-xs border-gold/25 focus-visible:ring-maroon h-8"
                                        value={repayNotes}
                                        onChange={(e) => setRepayNotes(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-3 border-t border-gold/15 bg-cream/5 flex items-center justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-gold/20 text-gray-600 text-xs cursor-pointer"
                                    onClick={() => setSaleForDueCollection(null)}
                                    disabled={dueRepaymentMutation.isPending}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold gap-1.5 cursor-pointer shadow"
                                    onClick={handleConfirmRepayment}
                                    disabled={dueRepaymentMutation.isPending || !parseFloat(repayAmount)}
                                >
                                    {dueRepaymentMutation.isPending ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Check className="h-3.5 w-3.5" />
                                    )}
                                    Confirm Collection
                                </Button>
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
