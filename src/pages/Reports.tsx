import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { salesService, type SaleReportItem } from '@/services/salesService';
import {
    Download,
    FileText,
    ArrowUpDown,
    ShoppingCart,
    Calendar,
    TrendingUp,
    IndianRupee,
    Filter,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';

export default function ReportsPage() {
    // Default to this month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [startDate, setStartDate] = React.useState(firstDay);
    const [endDate, setEndDate] = React.useState(lastDay);
    const [currentPage, setCurrentPage] = React.useState(1);
    const itemsPerPage = 12; // more compact density rows

    const { data: sales, isLoading: isLoadingSales } = useQuery<SaleReportItem[]>({
        queryKey: ['sales'],
        queryFn: salesService.getSales
    });

    // Reset pagination when dates change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [startDate, endDate]);

    // Filter sales by date range
    const filteredSales = React.useMemo(() => {
        if (!sales) return [];
        return sales.filter(s => {
            const saleDate = s.date.split('T')[0];
            return saleDate >= startDate && saleDate <= endDate;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, startDate, endDate]);

    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
    const paginatedSales = filteredSales.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Calculate Summary Stats for the selected period
    const stats = React.useMemo(() => {
        return filteredSales.reduce((acc, s) => ({
            revenue: acc.revenue + (s.totalAmount || 0),
            profit: acc.profit + (s.profit || 0),
            count: acc.count + 1
        }), { revenue: 0, profit: 0, count: 0 });
    }, [filteredSales]);

    // Aggregate commission ledger per salesperson
    const commissionLedger = React.useMemo(() => {
        // getSales() returns one row per sale_item, so a single sale with N items
        // produces N rows all sharing the same saleId. We must SUM each item's
        // totalAmount across all rows for the same saleId, and read commissionEarned
        // only once (it's a sale-level field duplicated on every item row).
        const saleMap = new Map<string, { salesperson: string; total: number; commission: number; seen: boolean }>();

        filteredSales.forEach(s => {
            if (!s.salespersonName) return;
            const key = s.saleId;
            if (!saleMap.has(key)) {
                saleMap.set(key, {
                    salesperson: s.salespersonName,
                    total: 0,
                    commission: s.commissionEarned || 0, // record once
                    seen: false,
                });
            }
            // Always accumulate item-level amounts
            const entry = saleMap.get(key)!;
            entry.total += s.totalAmount || 0;
        });

        const ledger: Record<string, { bills: number; revenue: number; commission: number }> = {};
        saleMap.forEach(({ salesperson, total, commission }) => {
            if (!ledger[salesperson]) {
                ledger[salesperson] = { bills: 0, revenue: 0, commission: 0 };
            }
            ledger[salesperson].bills += 1;
            ledger[salesperson].revenue += total;
            ledger[salesperson].commission += commission;
        });

        return Object.entries(ledger)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue);
    }, [filteredSales]);

    const exportToCSV = () => {
        if (filteredSales.length === 0) {
            toast.error('No data to export for this period');
            return;
        }

        const headers = ['Sale ID', 'Date', 'Saree Name', 'Quantity', 'Price', 'Total', 'Profit', 'Customer'];
        const rows = filteredSales.map(s => [
            s.saleId,
            new Date(s.date).toLocaleDateString(),
            `"${s.sareeName}"`,
            s.quantity.toString(),
            s.sellingPrice.toString(),
            s.totalAmount.toString(),
            s.profit.toString(),
            `"${s.customerName || s.customerMobile || 'N/A'}"`
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `sales_report_${startDate}_to_${endDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exported ${filteredSales.length} records`);
    };

    return (
        <div className="space-y-3 max-w-7xl mx-auto px-2">
            {/* Header section with brand accent */}
            <div className="flex items-center justify-between border-b border-gold/10 pb-2">
                <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-maroon" />
                    <div>
                        <h1 className="text-xl font-bold font-serif text-maroon tracking-wider">SBS SALES REPORTS & AUDITS</h1>
                        <p className="text-xs text-gray-500 font-sans">Detailed transaction log & net margin audits</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <Button
                        variant="outline"
                        className="h-8 text-xs border-gold/20 text-maroon hover:bg-gold/5 font-bold uppercase tracking-wider px-3"
                        onClick={() => toast.info('PDF export coming soon')}
                    >
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        PDF
                    </Button>
                    <Button
                        className="bg-maroon hover:bg-maroon-dark text-gold font-bold h-8 text-xs gap-1 px-3 uppercase tracking-wider"
                        onClick={exportToCSV}
                    >
                        <Download className="h-3.5 w-3.5" />
                        EXPORT CSV
                    </Button>
                </div>
            </div>

            {/* Filter Controls & Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                <Card className="lg:col-span-1 border-gold/20 shadow-sm bg-cream/5">
                    <CardHeader className="bg-cream/20 border-b border-gold/10 p-2.5">
                        <CardTitle className="text-xs font-bold text-maroon uppercase tracking-wider flex items-center gap-1.5">
                            <Filter className="h-3.5 w-3.5" />
                            Filter Range
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 space-y-2">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-550 uppercase">From Date</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-8 text-xs border-gold/30 focus-visible:ring-maroon font-mono"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-550 uppercase">To Date</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-8 text-xs border-gold/30 focus-visible:ring-maroon font-mono"
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Card className="border-gold/20 shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-2 text-gold/10 group-hover:text-gold/20 transition-colors">
                            <IndianRupee className="h-10 w-10" />
                        </div>
                        <CardHeader className="pb-1 p-2.5">
                            <CardTitle className="text-[10px] font-bold text-gray-500 uppercase">Period Revenue</CardTitle>
                        </CardHeader>
                        <CardContent className="px-2.5 pb-2">
                            <div className="text-xl font-bold font-mono text-maroon">₹{stats.revenue.toLocaleString()}</div>
                            <p className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">Total gross sales billing</p>
                        </CardContent>
                    </Card>

                    <Card className="border-gold/20 shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-2 text-green-100/30 group-hover:text-green-100/50 transition-colors">
                            <TrendingUp className="h-10 w-10" />
                        </div>
                        <CardHeader className="pb-1 p-2.5">
                            <CardTitle className="text-[10px] font-bold text-gray-500 uppercase">Period Net Profit</CardTitle>
                        </CardHeader>
                        <CardContent className="px-2.5 pb-2">
                            <div className="text-xl font-bold font-mono text-green-700">₹{stats.profit.toLocaleString()}</div>
                            <p className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">Gross margin minus purchase costs</p>
                        </CardContent>
                    </Card>

                    <Card className="border-gold/20 shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-2 text-gold/10 group-hover:text-gold/20 transition-colors">
                            <ShoppingCart className="h-10 w-10" />
                        </div>
                        <CardHeader className="pb-1 p-2.5">
                            <CardTitle className="text-[10px] font-bold text-gray-500 uppercase">Quantity Sold</CardTitle>
                        </CardHeader>
                        <CardContent className="px-2.5 pb-2">
                            <div className="text-xl font-bold font-mono text-maroon">{stats.count} units</div>
                            <p className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">Total items sold in range</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Transactions Table */}
            <Card className="border-gold/20 shadow-md">
                <CardHeader className="bg-cream/20 border-b border-gold/10 p-2.5">
                    <CardTitle className="text-xs font-bold text-maroon uppercase tracking-wider flex items-center gap-1.5">
                        <ArrowUpDown className="h-4 w-4" />
                        Detailed Transaction Ledger
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-cream/10">
                                <TableRow className="border-b border-gold/10 hover:bg-transparent">
                                    <TableHead className="h-8 text-[10px] font-bold text-maroon py-1">Date</TableHead>
                                    <TableHead className="h-8 text-[10px] font-bold text-maroon py-1">ID</TableHead>
                                    <TableHead className="h-8 text-[10px] font-bold text-maroon py-1">Saree Name</TableHead>
                                    <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 text-right">Qty</TableHead>
                                    <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 text-right">Total Net (₹)</TableHead>
                                    <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 text-right">Profit Margin (₹)</TableHead>
                                    <TableHead className="h-8 text-[10px] font-bold text-maroon py-1">Created By</TableHead>
                                    <TableHead className="h-8 text-[10px] font-bold text-maroon py-1">Customer Profile</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingSales ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-maroon/50 text-xs italic">
                                            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-1 inline" />
                                            Fetching transaction audit data...
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedSales.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-32 text-center bg-gray-50/20">
                                            <div className="flex flex-col items-center justify-center text-gray-400 space-y-1">
                                                <Calendar className="h-8 w-8 opacity-20" />
                                                <p className="text-xs">No transactions recorded between {new Date(startDate).toLocaleDateString()} and {new Date(endDate).toLocaleDateString()}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedSales.map((sale) => (
                                        <TableRow key={`${sale.saleId}-${sale.sareeId}`} className="hover:bg-cream/5 border-b border-gold/5 h-8">
                                            <TableCell className="py-1 text-xs font-mono text-gray-500">{new Date(sale.date).toLocaleDateString()}</TableCell>
                                            <TableCell className="py-1 text-[10px] font-mono text-gray-500 truncate max-w-[80px]">{sale.saleId}</TableCell>
                                            <TableCell className="py-1 text-xs font-bold text-maroon">{sale.sareeName}</TableCell>
                                            <TableCell className="py-1 text-xs text-right font-semibold font-mono text-gray-800">{sale.quantity}</TableCell>
                                            <TableCell className="py-1 text-xs text-right font-bold font-mono text-maroon">₹{sale.totalAmount?.toLocaleString()}</TableCell>
                                            <TableCell className="py-1 text-xs text-right text-green-700 font-bold font-mono">₹{sale.profit?.toLocaleString()}</TableCell>
                                            <TableCell className="py-1 text-[10px] font-mono text-gray-500 truncate max-w-[125px]" title={sale.createdBy || 'system'}>
                                                {sale.createdBy || 'system'}
                                            </TableCell>
                                            <TableCell className="py-1 text-xs">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-gray-700">{sale.customerName || 'N/A'}</span>
                                                    <span className="text-[9px] text-gray-400 font-mono">{sale.customerMobile || 'Walk-in'}</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-3 py-2 border-t border-gold/10 bg-cream/5">
                            <p className="text-[10px] text-gray-500">
                                Trans. <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                                <span className="font-bold">
                                    {Math.min(currentPage * itemsPerPage, filteredSales.length)}
                                </span> of{' '}
                                <span className="font-bold">{filteredSales.length}</span>
                            </p>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-gold/20 text-maroon h-7 w-7 p-0"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </Button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                    .map((page, i, arr) => (
                                        <React.Fragment key={page}>
                                            {i > 0 && arr[i - 1] !== page - 1 && (
                                                <span className="text-gray-400 text-xs">...</span>
                                            )}
                                            <Button
                                                variant={currentPage === page ? "default" : "outline"}
                                                size="sm"
                                                className={cn(
                                                    "h-7 w-7 p-0 text-xs",
                                                    currentPage === page
                                                        ? "bg-maroon text-gold hover:bg-maroon-dark font-bold"
                                                        : "border-gold/20 text-maroon"
                                                )}
                                                onClick={() => setCurrentPage(page)}
                                            >
                                                {page}
                                            </Button>
                                        </React.Fragment>
                                    ))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-gold/20 text-maroon h-7 w-7 p-0"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Staff Commission Ledger */}
            <Card className="border-gold/20 shadow-md">
                <CardHeader className="bg-cream/20 border-b border-gold/10 p-2.5">
                    <CardTitle className="text-xs font-bold text-maroon uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        Staff Commission Ledger
                        <span className="ml-auto text-[10px] font-normal text-gray-400 normal-case tracking-normal">
                            {startDate} → {endDate}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {commissionLedger.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400 space-y-1">
                            <Users className="h-7 w-7 opacity-20" />
                            <p className="text-xs">No staff-attributed sales in this period</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-cream/10">
                                    <TableRow className="border-b border-gold/10 hover:bg-transparent">
                                        <TableHead className="h-8 text-[10px] font-bold text-maroon py-1">Agent Name</TableHead>
                                        <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 text-right">Total Bills</TableHead>
                                        <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 text-right">Revenue Generated (₹)</TableHead>
                                        <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 text-right">Commission Payable (₹)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {commissionLedger.map((row) => (
                                        <TableRow key={row.name} className="hover:bg-cream/5 border-b border-gold/5 h-9">
                                            <TableCell className="py-1.5 text-xs font-semibold text-gray-800">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-maroon/10 flex items-center justify-center text-maroon font-bold text-[10px]">
                                                        {row.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    {row.name}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-1.5 text-xs text-right font-mono font-semibold text-gray-700">
                                                {row.bills}
                                            </TableCell>
                                            <TableCell className="py-1.5 text-xs text-right font-bold font-mono text-maroon">
                                                ₹{row.revenue.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="py-1.5 text-right">
                                                <span className="inline-block bg-green-50 text-green-700 font-bold font-mono text-xs px-2 py-0.5 rounded">
                                                    ₹{row.commission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                {/* Totals row */}
                                <tfoot>
                                    <tr className="border-t-2 border-gold/20 bg-cream/10">
                                        <td className="py-1.5 px-4 text-[10px] font-bold text-maroon uppercase tracking-wider">Total</td>
                                        <td className="py-1.5 px-4 text-xs text-right font-bold font-mono text-gray-800">
                                            {commissionLedger.reduce((s, r) => s + r.bills, 0)}
                                        </td>
                                        <td className="py-1.5 px-4 text-xs text-right font-bold font-mono text-maroon">
                                            ₹{commissionLedger.reduce((s, r) => s + r.revenue, 0).toLocaleString()}
                                        </td>
                                        <td className="py-1.5 px-4 text-right">
                                            <span className="inline-block bg-green-100 text-green-800 font-bold font-mono text-xs px-2 py-0.5 rounded">
                                                ₹{commissionLedger.reduce((s, r) => s + r.commission, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                    </tr>
                                </tfoot>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
