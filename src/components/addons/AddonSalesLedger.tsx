import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Search,
    RefreshCw,
    Trash2,
    Calendar,
    IndianRupee,
    Package,
    ShoppingBag,
    Filter,
    Loader2,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    X,
    FileSpreadsheet,
    Plus,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { addonSalesService, type AddonSale } from '@/services/addonSalesService';

const LEDGER_ITEMS_PER_PAGE = 15;

type DateFilterType = 'today' | 'yesterday' | 'week' | 'month' | 'all';

interface AddonSalesLedgerProps {
    onOpenRegisterSale: () => void;
}

export function AddonSalesLedger({ onOpenRegisterSale }: AddonSalesLedgerProps) {
    const queryClient = useQueryClient();

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
    const [paymentFilter, setPaymentFilter] = useState<string>('All');
    const [currentPage, setCurrentPage] = useState(1);

    // Delete / Void Dialog
    const [deletingSale, setDeletingSale] = useState<AddonSale | null>(null);
    const [restoreStockOnDelete, setRestoreStockOnDelete] = useState<boolean>(true);

    // Fetch sales
    const {
        data: sales = [],
        isLoading,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: ['addon_sales'],
        queryFn: addonSalesService.getSales,
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: ({
            saleId,
            addonId,
            qty,
            restoreStock,
        }: {
            saleId: string;
            addonId?: string;
            qty?: number;
            restoreStock: boolean;
        }) => addonSalesService.deleteSale(saleId, addonId, qty, restoreStock),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['addon_sales'] });
            queryClient.invalidateQueries({ queryKey: ['addons'] });
            toast.success('Sale record removed successfully');
            setDeletingSale(null);
        },
        onError: (err: any) => {
            console.error('Failed to delete sale:', err);
            toast.error(err?.message || 'Failed to remove sale');
        },
    });

    // Helper: is date within filter
    const isDateMatch = (dateStr: string, filter: DateFilterType): boolean => {
        if (filter === 'all') return true;
        const d = new Date(dateStr);
        const now = new Date();

        if (filter === 'today') {
            return (
                d.getDate() === now.getDate() &&
                d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear()
            );
        }

        if (filter === 'yesterday') {
            const yesterday = new Date();
            yesterday.setDate(now.getDate() - 1);
            return (
                d.getDate() === yesterday.getDate() &&
                d.getMonth() === yesterday.getMonth() &&
                d.getFullYear() === yesterday.getFullYear()
            );
        }

        if (filter === 'week') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(now.getDate() - 7);
            return d >= sevenDaysAgo && d <= now;
        }

        if (filter === 'month') {
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }

        return true;
    };

    // Calculate Today's Stats
    const todayStats = useMemo(() => {
        let revenue = 0;
        let pieces = 0;
        let count = 0;

        const now = new Date();
        sales.forEach((s) => {
            const d = new Date(s.created_at);
            if (
                d.getDate() === now.getDate() &&
                d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear()
            ) {
                revenue += Number(s.total_amount || 0);
                pieces += Number(s.quantity || 0);
                count += 1;
            }
        });

        return { revenue, pieces, count };
    }, [sales]);

    // Filtered sales
    const filteredSales = useMemo(() => {
        return sales.filter((sale) => {
            // Date filter
            if (!isDateMatch(sale.created_at, dateFilter)) return false;

            // Payment filter
            if (paymentFilter !== 'All' && sale.payment_method !== paymentFilter) return false;

            // Search filter
            const query = searchTerm.toLowerCase().trim();
            if (query) {
                const matchName = sale.addon_name.toLowerCase().includes(query);
                const matchCat = (sale.category || '').toLowerCase().includes(query);
                const matchCust = (sale.customer_name || '').toLowerCase().includes(query);
                const matchNotes = (sale.notes || '').toLowerCase().includes(query);
                if (!matchName && !matchCat && !matchCust && !matchNotes) return false;
            }

            return true;
        });
    }, [sales, dateFilter, paymentFilter, searchTerm]);

    // Filtered total revenue
    const filteredStats = useMemo(() => {
        let totalRev = 0;
        let totalPcs = 0;
        filteredSales.forEach((s) => {
            totalRev += Number(s.total_amount || 0);
            totalPcs += Number(s.quantity || 0);
        });
        return { totalRev, totalPcs, totalCount: filteredSales.length };
    }, [filteredSales]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredSales.length / LEDGER_ITEMS_PER_PAGE));
    const paginatedSales = useMemo(() => {
        const start = (currentPage - 1) * LEDGER_ITEMS_PER_PAGE;
        return filteredSales.slice(start, start + LEDGER_ITEMS_PER_PAGE);
    }, [filteredSales, currentPage]);

    return (
        <div className="space-y-4">
            {/* KPI Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Today's Sales Revenue */}
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="border-gold/20 shadow-xs bg-white">
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    Today's Sales
                                </span>
                                <div className="p-1.5 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-lg text-white shadow-xs">
                                    <IndianRupee className="h-3.5 w-3.5" />
                                </div>
                            </div>
                            <div className="pt-1">
                                <span className="text-xl font-bold font-mono text-emerald-700 tracking-tight">
                                    ₹{todayStats.revenue.toLocaleString('en-IN')}
                                </span>
                                <span className="text-[9px] text-gray-400 block mt-0.5">
                                    {todayStats.count} sale{todayStats.count === 1 ? '' : 's'} recorded today
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Today's Pieces Sold */}
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
                    <Card className="border-gold/20 shadow-xs bg-white">
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    Pieces Sold Today
                                </span>
                                <div className="p-1.5 bg-gradient-to-br from-maroon to-maroon-dark rounded-lg text-gold shadow-xs">
                                    <Package className="h-3.5 w-3.5" />
                                </div>
                            </div>
                            <div className="pt-1">
                                <span className="text-xl font-bold font-mono text-maroon tracking-tight">
                                    {todayStats.pieces} pcs
                                </span>
                                <span className="text-[9px] text-gray-400 block mt-0.5">
                                    Units deducted today
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Filtered Period Revenue */}
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
                    <Card className="border-gold/20 shadow-xs bg-white">
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    Selected Period Total
                                </span>
                                <div className="p-1.5 bg-gradient-to-br from-teal-600 to-teal-800 rounded-lg text-white shadow-xs">
                                    <FileSpreadsheet className="h-3.5 w-3.5" />
                                </div>
                            </div>
                            <div className="pt-1">
                                <span className="text-xl font-bold font-mono text-teal-800 tracking-tight">
                                    ₹{filteredStats.totalRev.toLocaleString('en-IN')}
                                </span>
                                <span className="text-[9px] text-gray-400 block mt-0.5">
                                    {filteredStats.totalPcs} pcs &bull; {filteredStats.totalCount} entries
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* All Time Total */}
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                    <Card className="border-gold/20 shadow-xs bg-white">
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    Total Recorded Sales
                                </span>
                                <div className="p-1.5 bg-gradient-to-br from-slate-600 to-slate-800 rounded-lg text-white shadow-xs">
                                    <ShoppingBag className="h-3.5 w-3.5" />
                                </div>
                            </div>
                            <div className="pt-1">
                                <span className="text-xl font-bold font-mono text-stone-800 tracking-tight">
                                    {sales.length}
                                </span>
                                <span className="text-[9px] text-gray-400 block mt-0.5">
                                    Transactions in ledger
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Filter & Search Bar */}
            <Card className="border-gold/20 shadow-xs bg-white">
                <CardContent className="p-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                            <Input
                                placeholder="Search by item, customer, or notes..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-9 h-9 text-xs border-gold/30"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Date Pills */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            {(
                                [
                                    { key: 'today', label: 'Today' },
                                    { key: 'yesterday', label: 'Yesterday' },
                                    { key: 'week', label: 'Last 7 Days' },
                                    { key: 'month', label: 'This Month' },
                                    { key: 'all', label: 'All Time' },
                                ] as const
                            ).map((filter) => (
                                <Button
                                    key={filter.key}
                                    type="button"
                                    variant={dateFilter === filter.key ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => {
                                        setDateFilter(filter.key);
                                        setCurrentPage(1);
                                    }}
                                    className={cn(
                                        'h-8 px-2.5 text-xs font-medium cursor-pointer transition-all',
                                        dateFilter === filter.key
                                            ? 'bg-maroon text-gold hover:bg-maroon-dark shadow-xs'
                                            : 'border-gold/30 text-stone-700 hover:bg-gold/10'
                                    )}
                                >
                                    {filter.label}
                                </Button>
                            ))}

                            {/* Payment Method Filter */}
                            <div className="w-28">
                                <Select
                                    value={paymentFilter}
                                    onValueChange={(val) => {
                                        setPaymentFilter(val);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-8 text-xs border-gold/30 bg-white">
                                        <SelectValue placeholder="Payment" />
                                    </SelectTrigger>
                                    <SelectContent className="border-gold/20">
                                        <SelectItem value="All" className="text-xs">
                                            All Modes
                                        </SelectItem>
                                        <SelectItem value="Cash" className="text-xs">
                                            Cash
                                        </SelectItem>
                                        <SelectItem value="UPI" className="text-xs">
                                            UPI
                                        </SelectItem>
                                        <SelectItem value="Card" className="text-xs">
                                            Card
                                        </SelectItem>
                                        <SelectItem value="Other" className="text-xs">
                                            Other
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refetch()}
                                disabled={isFetching}
                                className="h-8 px-2 border-gold/30 text-maroon hover:bg-gold/10 cursor-pointer"
                                title="Refresh sales ledger"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Sales Table Card */}
            <Card className="border-gold/20 shadow-md bg-white overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/15 px-4 py-3 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <CardTitle className="text-sm font-bold text-maroon uppercase tracking-wider flex items-center gap-2">
                                <ShoppingBag className="w-4 h-4 text-emerald-700" />
                                Add-ons Sales Ledger
                            </CardTitle>
                            <CardDescription className="text-xs text-stone-500 mt-0.5">
                                Showing {filteredSales.length} transaction{filteredSales.length === 1 ? '' : 's'} &bull; Period Amount: ₹{filteredStats.totalRev.toLocaleString('en-IN')} &bull; Pieces: {filteredStats.totalPcs}
                            </CardDescription>
                        </div>

                        <Button
                            size="sm"
                            onClick={onOpenRegisterSale}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-8 text-xs px-3 shadow-xs gap-1 cursor-pointer self-start sm:self-auto"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Register Sale
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="py-16 text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-maroon mx-auto mb-2" />
                            <p className="text-xs text-stone-500 font-medium">Loading sales ledger...</p>
                        </div>
                    ) : filteredSales.length === 0 ? (
                        <div className="py-16 text-center px-4">
                            <div className="w-12 h-12 rounded-full bg-cream text-maroon flex items-center justify-center mx-auto mb-3 border border-gold/30">
                                <ShoppingBag className="w-6 h-6 text-emerald-700" />
                            </div>
                            <h3 className="text-base font-serif font-bold text-stone-800">No sales recorded</h3>
                            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                                {searchTerm || dateFilter !== 'all' || paymentFilter !== 'All'
                                    ? 'No sales match your current date or search criteria.'
                                    : 'No add-on sales have been recorded yet.'}
                            </p>
                            <div className="mt-4 flex items-center justify-center gap-2">
                                <Button
                                    size="sm"
                                    onClick={onOpenRegisterSale}
                                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs"
                                >
                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                    Register First Sale
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-cream/40 border-b border-gold/20">
                                    <TableRow className="text-[11px] font-bold uppercase tracking-wider text-maroon">
                                        <TableHead className="py-3 px-4 text-maroon">Date &amp; Time</TableHead>
                                        <TableHead className="py-3 px-3 text-maroon">Add-on Item</TableHead>
                                        <TableHead className="py-3 px-3 text-maroon">Category</TableHead>
                                        <TableHead className="py-3 px-3 text-center text-maroon">Pieces (Qty)</TableHead>
                                        <TableHead className="py-3 px-3 text-right text-maroon">Unit Price</TableHead>
                                        <TableHead className="py-3 px-3 text-right text-maroon">Total Amount</TableHead>
                                        <TableHead className="py-3 px-3 text-maroon">Buyer / Customer</TableHead>
                                        <TableHead className="py-3 px-3 text-center text-maroon">Payment</TableHead>
                                        <TableHead className="py-3 px-3 text-maroon">Notes</TableHead>
                                        <TableHead className="py-3 px-4 text-right text-maroon">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedSales.map((sale) => {
                                        const d = new Date(sale.created_at);
                                        const formattedDate = d.toLocaleDateString('en-IN', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                        });
                                        const formattedTime = d.toLocaleTimeString('en-IN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true,
                                        });

                                        return (
                                            <TableRow
                                                key={sale.id}
                                                className="hover:bg-cream/15 border-b border-gold/10 text-xs transition-colors"
                                            >
                                                {/* Date & Time */}
                                                <TableCell className="py-3 px-4 whitespace-nowrap">
                                                    <div className="font-medium text-stone-900 font-mono text-[11px]">
                                                        {formattedDate}
                                                    </div>
                                                    <div className="text-[10px] text-stone-400 font-mono">
                                                        {formattedTime}
                                                    </div>
                                                </TableCell>

                                                {/* Item Name */}
                                                <TableCell className="py-3 px-3 font-semibold text-stone-900 font-serif">
                                                    <div>{sale.addon_name}</div>
                                                </TableCell>

                                                {/* Category */}
                                                <TableCell className="py-3 px-3">
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] font-medium bg-cream/50 text-maroon border border-gold/30"
                                                    >
                                                        {sale.category || 'Other'}
                                                    </Badge>
                                                </TableCell>

                                                {/* Pieces */}
                                                <TableCell className="py-3 px-3 text-center">
                                                    <Badge className="font-mono text-xs font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                        {sale.quantity} pcs
                                                    </Badge>
                                                </TableCell>

                                                {/* Unit Price */}
                                                <TableCell className="py-3 px-3 text-right font-mono text-stone-600">
                                                    ₹{(sale.unit_price || 0).toLocaleString('en-IN')}
                                                </TableCell>

                                                {/* Total Amount */}
                                                <TableCell className="py-3 px-3 text-right font-mono font-bold text-emerald-700 text-sm">
                                                    ₹{(sale.total_amount || 0).toLocaleString('en-IN')}
                                                </TableCell>

                                                {/* Customer */}
                                                <TableCell className="py-3 px-3 text-stone-800">
                                                    <div className="max-w-[130px] truncate" title={sale.customer_name}>
                                                        {sale.customer_name || 'Walk-in Customer'}
                                                    </div>
                                                </TableCell>

                                                {/* Payment Mode */}
                                                <TableCell className="py-3 px-3 text-center">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            'text-[10px] font-semibold',
                                                            sale.payment_method === 'UPI'
                                                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                                : sale.payment_method === 'Card'
                                                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        )}
                                                    >
                                                        {sale.payment_method || 'Cash'}
                                                    </Badge>
                                                </TableCell>

                                                {/* Notes */}
                                                <TableCell className="py-3 px-3 text-stone-500 text-[11px]">
                                                    <div className="max-w-[150px] truncate" title={sale.notes || ''}>
                                                        {sale.notes || '-'}
                                                    </div>
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell className="py-3 px-4 text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setDeletingSale(sale)}
                                                        className="h-7 w-7 p-0 border-rose-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                                                        title="Void / Remove Sale Entry"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-cream/20 border-t border-gold/15 text-xs">
                                    <span className="text-stone-600">
                                        Showing{' '}
                                        <span className="font-bold text-maroon">
                                            {(currentPage - 1) * LEDGER_ITEMS_PER_PAGE + 1}
                                        </span>{' '}
                                        to{' '}
                                        <span className="font-bold text-maroon">
                                            {Math.min(
                                                currentPage * LEDGER_ITEMS_PER_PAGE,
                                                filteredSales.length
                                            )}
                                        </span>{' '}
                                        of{' '}
                                        <span className="font-bold text-maroon">
                                            {filteredSales.length}
                                        </span>{' '}
                                        sales
                                    </span>

                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="h-8 w-8 p-0 border-gold/30 text-maroon hover:bg-gold/10 disabled:opacity-40"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>

                                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                                            .filter(
                                                (p) =>
                                                    p === 1 ||
                                                    p === totalPages ||
                                                    Math.abs(p - currentPage) <= 1
                                            )
                                            .map((p, idx, arr) => (
                                                <React.Fragment key={p}>
                                                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                                                        <span className="text-stone-400 px-0.5">&hellip;</span>
                                                    )}
                                                    <Button
                                                        variant={currentPage === p ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => setCurrentPage(p)}
                                                        className={cn(
                                                            'h-8 w-8 p-0 text-xs font-bold transition-all',
                                                            currentPage === p
                                                                ? 'bg-maroon text-gold hover:bg-maroon-dark shadow-sm'
                                                                : 'border-gold/30 text-maroon hover:bg-cream/40'
                                                        )}
                                                    >
                                                        {p}
                                                    </Button>
                                                </React.Fragment>
                                            ))}

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setCurrentPage((p) => Math.min(totalPages, p + 1))
                                            }
                                            disabled={currentPage === totalPages}
                                            className="h-8 w-8 p-0 border-gold/30 text-maroon hover:bg-gold/10 disabled:opacity-40"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Void / Delete Sale Modal */}
            <Dialog
                open={!!deletingSale}
                onOpenChange={(open) => !open && setDeletingSale(null)}
            >
                <DialogContent className="max-w-md bg-white border-gold/30 shadow-2xl p-6">
                    <DialogHeader className="flex flex-row items-center gap-3 space-y-0 pb-3 border-b border-gold/15">
                        <div className="p-2.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-stone-900 font-serif">
                                Void Add-on Sale Record
                            </DialogTitle>
                            <DialogDescription className="text-xs text-stone-500 mt-0.5">
                                Remove this sales entry from the ledger.
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    {deletingSale && (
                        <div className="py-3 text-xs text-stone-700 leading-relaxed space-y-3">
                            <div>
                                Remove sale of{' '}
                                <strong className="text-stone-900">
                                    {deletingSale.quantity} pcs of "{deletingSale.addon_name}"
                                </strong>{' '}
                                (Total: ₹{deletingSale.total_amount.toLocaleString('en-IN')})?
                            </div>

                            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-gold/30 bg-cream/20 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={restoreStockOnDelete}
                                    onChange={(e) => setRestoreStockOnDelete(e.target.checked)}
                                    className="h-4 w-4 text-maroon rounded border-gold/40 focus:ring-gold accent-maroon"
                                />
                                <span className="text-xs text-stone-800">
                                    <strong>Restore {deletingSale.quantity} units back</strong> into inventory stock
                                </span>
                            </label>
                        </div>
                    )}

                    <DialogFooter className="pt-2 flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingSale(null)}
                            disabled={deleteMutation.isPending}
                            className="h-8 text-xs border-gold/30 text-stone-700"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                                deletingSale &&
                                deleteMutation.mutate({
                                    saleId: deletingSale.id,
                                    addonId: deletingSale.addon_id,
                                    qty: deletingSale.quantity,
                                    restoreStock: restoreStockOnDelete,
                                })
                            }
                            disabled={deleteMutation.isPending}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-8 text-xs px-4 flex items-center gap-1.5 shadow-md cursor-pointer"
                        >
                            {deleteMutation.isPending ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Removing...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Confirm Void
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
