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
    Search,
    Award,
    RefreshCw,
    Activity,
    Copy
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

export default function ReportsPage() {
    // Default to this month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [startDate, setStartDate] = React.useState(firstDay);
    const [endDate, setEndDate] = React.useState(lastDay);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [searchTerm, setSearchTerm] = React.useState('');
    const itemsPerPage = 12;

    const { data: sales, isLoading: isLoadingSales, refetch } = useQuery<SaleReportItem[]>({
        queryKey: ['sales'],
        queryFn: salesService.getSales
    });

    // Reset pagination when dates or search query changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [startDate, endDate, searchTerm]);

    // Quick presets handler
    const setPreset = (type: 'today' | 'week' | 'month' | '30days' | 'year') => {
        const today = new Date();
        let start = new Date();
        const endStr = today.toISOString().split('T')[0];

        if (type === 'today') {
            // start is today
        } else if (type === 'week') {
            const day = today.getDay();
            const diff = today.getDate() - day + (day === 0 ? -6 : 1);
            start = new Date(today.setDate(diff));
        } else if (type === 'month') {
            start = new Date(today.getFullYear(), today.getMonth(), 1);
        } else if (type === '30days') {
            start = new Date(today.setDate(today.getDate() - 30));
        } else if (type === 'year') {
            start = new Date(today.getFullYear(), 0, 1);
        }

        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(endStr);
        toast.info(`Report range set to ${type.toUpperCase()}`);
    };

    // Filter sales by date range
    const filteredSales = React.useMemo(() => {
        if (!sales) return [];
        return sales.filter(s => {
            const saleDate = s.date.split('T')[0];
            return saleDate >= startDate && saleDate <= endDate;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, startDate, endDate]);

    // Search transaction entries
    const searchedSales = React.useMemo(() => {
        if (!searchTerm.trim()) return filteredSales;
        const term = searchTerm.toLowerCase();
        return filteredSales.filter(s => 
            s.saleId.toLowerCase().includes(term) ||
            s.sareeName.toLowerCase().includes(term) ||
            (s.customerName && s.customerName.toLowerCase().includes(term)) ||
            (s.customerMobile && s.customerMobile.includes(term)) ||
            (s.createdBy && s.createdBy.toLowerCase().includes(term)) ||
            (s.salespersonName && s.salespersonName.toLowerCase().includes(term))
        );
    }, [filteredSales, searchTerm]);

    const totalPages = Math.ceil(searchedSales.length / itemsPerPage);
    const paginatedSales = searchedSales.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Calculate Summary Stats for the selected period
    const stats = React.useMemo(() => {
        const summary = filteredSales.reduce((acc, s) => ({
            revenue: acc.revenue + (s.totalAmount || 0),
            profit: acc.profit + (s.profit || 0),
            count: acc.count + 1
        }), { revenue: 0, profit: 0, count: 0 });

        return {
            ...summary,
            aov: summary.count > 0 ? Math.round(summary.revenue / summary.count) : 0
        };
    }, [filteredSales]);

    // Aggregate commission ledger per salesperson
    const commissionLedger = React.useMemo(() => {
        const saleMap = new Map<string, { salesperson: string; total: number; commission: number }>();

        filteredSales.forEach(s => {
            if (!s.salespersonName) return;
            const key = s.saleId;
            if (!saleMap.has(key)) {
                saleMap.set(key, {
                    salesperson: s.salespersonName,
                    total: 0,
                    commission: s.commissionEarned || 0,
                });
            }
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

    // Aggregate Product Sales Velocity Leaderboard
    const productLeaderboard = React.useMemo(() => {
        const productsMap: Record<string, { name: string; qty: number; revenue: number; profit: number }> = {};
        
        filteredSales.forEach(s => {
            if (!productsMap[s.sareeName]) {
                productsMap[s.sareeName] = { name: s.sareeName, qty: 0, revenue: 0, profit: 0 };
            }
            productsMap[s.sareeName].qty += s.quantity;
            productsMap[s.sareeName].revenue += s.totalAmount || 0;
            productsMap[s.sareeName].profit += s.profit || 0;
        });

        return Object.values(productsMap)
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 10);
    }, [filteredSales]);

    const exportToCSV = () => {
        if (filteredSales.length === 0) {
            toast.error('No data to export for this period');
            return;
        }

        const headers = ['Sale ID', 'Date', 'Saree Name', 'Quantity', 'Price', 'Total', 'Profit', 'Agent', 'Customer'];
        const rows = filteredSales.map(s => [
            s.saleId,
            new Date(s.date).toLocaleDateString(),
            `"${s.sareeName}"`,
            s.quantity.toString(),
            s.sellingPrice.toString(),
            s.totalAmount.toString(),
            s.profit.toString(),
            `"${s.salespersonName || 'N/A'}"`,
            `"${s.customerName || s.customerMobile || 'N/A'}"`
        ]);

        const csvContent = [
            `Shree Banarasi Sarees - Sales Audit Report`,
            `Range: ${startDate} to ${endDate}`,
            `Total Revenue: ₹${stats.revenue} | Net profit: ₹${stats.profit} | Volume: ${stats.count} units`,
            '',
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `saree_sales_report_${startDate}_to_${endDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exported ${filteredSales.length} items successfully`);
    };

    const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

    return (
        <motion.div 
            className="space-y-4 max-w-7xl mx-auto px-4 py-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gold/15 pb-3 gap-2">
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-maroon/5 rounded-md border border-gold/20">
                        <FileText className="h-4 w-4 text-maroon" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black font-serif text-maroon tracking-wider uppercase">Business Reports & Audits</h1>
                        <p className="text-[10px] text-gray-500 font-sans mt-0.5">Commercial ledger statements, commission payable audits, and product velocity charts</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <Button
                        variant="outline"
                        className="h-7.5 text-[9px] border-gold/30 text-maroon hover:bg-gold/5 font-bold uppercase tracking-wider px-3 cursor-pointer"
                        onClick={() => {
                            refetch();
                            toast.success('Sales ledger synchronizing with cloud...');
                        }}
                    >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Sync Data
                    </Button>
                    <Button
                        className="bg-maroon hover:bg-maroon-dark text-gold font-bold h-7.5 text-[9px] gap-1 px-3 uppercase tracking-wider cursor-pointer"
                        onClick={exportToCSV}
                    >
                        <Download className="h-3 w-3" />
                        Export Ledger
                    </Button>
                </div>
            </div>

            {/* Range Presets and Inputs (Horizontal Row) */}
            <Card className="border-gold/15 shadow-sm bg-white p-2.5">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[9px] font-bold text-maroon uppercase mr-1 flex items-center gap-1">
                            <Filter className="h-3 w-3" />
                            Date Presets:
                        </span>
                        {(['today', 'week', 'month', '30days', 'year'] as const).map(preset => (
                            <Button
                                key={preset}
                                variant="ghost"
                                className="h-6.5 text-[9px] uppercase px-2 hover:bg-cream/10 hover:text-maroon font-bold text-gray-500 cursor-pointer"
                                onClick={() => setPreset(preset)}
                            >
                                {preset === '30days' ? '30 Days' : preset}
                            </Button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] font-bold text-gray-400 uppercase font-mono">Date Range:</span>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="h-7 text-[10px] w-[120px] border-gold/20 font-mono py-0.5 focus-visible:ring-maroon bg-white"
                        />
                        <span className="text-[10px] text-gray-400 font-mono">to</span>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="h-7 text-[10px] w-[120px] border-gold/20 font-mono py-0.5 focus-visible:ring-maroon bg-white"
                        />
                    </div>
                </div>
            </Card>

            {/* Dense 4-Metric Grid (62px height cards) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-gold/15 shadow-sm bg-cream/5 overflow-hidden h-[62px] flex flex-col justify-center p-3">
                    <div className="text-[8px] uppercase font-bold text-gray-500 tracking-wider">Gross Billing</div>
                    <div className="text-sm font-black font-mono text-maroon mt-0.5 leading-none">
                        {formatCurrency(stats.revenue)}
                    </div>
                    <div className="text-[7px] text-gray-400 mt-1 uppercase font-semibold">Total Revenue</div>
                </Card>

                <Card className="border-gold/15 shadow-sm bg-cream/5 overflow-hidden h-[62px] flex flex-col justify-center p-3">
                    <div className="text-[8px] uppercase font-bold text-gray-500 tracking-wider font-sans">Net Profits</div>
                    <div className="text-sm font-black font-mono text-emerald-700 mt-0.5 leading-none">
                        {formatCurrency(stats.profit)}
                    </div>
                    <div className="text-[7px] text-gray-400 mt-1 uppercase font-semibold">Margin Realized</div>
                </Card>

                <Card className="border-gold/15 shadow-sm bg-cream/5 overflow-hidden h-[62px] flex flex-col justify-center p-3">
                    <div className="text-[8px] uppercase font-bold text-gray-500 tracking-wider">Quantity Sold</div>
                    <div className="text-sm font-black font-mono text-maroon mt-0.5 leading-none">
                        {stats.count} units
                    </div>
                    <div className="text-[7px] text-gray-400 mt-1 uppercase font-semibold">Volume Count</div>
                </Card>

                <Card className="border-gold/15 shadow-sm bg-cream/5 overflow-hidden h-[62px] flex flex-col justify-center p-3">
                    <div className="text-[8px] uppercase font-bold text-gray-500 tracking-wider">Avg Order Value</div>
                    <div className="text-sm font-black font-mono text-maroon mt-0.5 leading-none">
                        {formatCurrency(stats.aov)}
                    </div>
                    <div className="text-[7px] text-gray-400 mt-1 uppercase font-semibold">Dynamic AOV</div>
                </Card>
            </div>

            {/* Tabbed Report Workspace */}
            <Card className="border-gold/15 shadow-sm overflow-hidden bg-white">
                <CardContent className="p-3">
                    <Tabs defaultValue="transactions" className="w-full">
                        <div className="border-b border-gold/10 pb-2 mb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <TabsList className="bg-cream/15 border border-gold/25 h-7 p-0.5">
                                <TabsTrigger value="transactions" className="text-[10px] h-6 px-2.5 data-[state=active]:bg-maroon data-[state=active]:text-gold font-bold cursor-pointer">
                                    Sales Audit Log
                                </TabsTrigger>
                                <TabsTrigger value="agents" className="text-[10px] h-6 px-2.5 data-[state=active]:bg-maroon data-[state=active]:text-gold font-bold cursor-pointer">
                                    Agent Commissions
                                </TabsTrigger>
                                <TabsTrigger value="leaderboard" className="text-[10px] h-6 px-2.5 data-[state=active]:bg-maroon data-[state=active]:text-gold font-bold cursor-pointer">
                                    Sales Leaderboard
                                </TabsTrigger>
                            </TabsList>
                            <span className="text-[9px] font-bold text-gray-450 font-mono uppercase">
                                Period Total: {searchedSales.length} items logged
                            </span>
                        </div>

                        {/* TAB 1: DETAILED SALES AUDIT LOG */}
                        <TabsContent value="transactions" className="m-0 space-y-3">
                            <div className="relative max-w-sm">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-450" />
                                <Input
                                    placeholder="Search by ID, product, cashier, or client..."
                                    className="pl-8 h-8 text-[11px] border-gold/20 focus-visible:ring-maroon bg-white/70"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-cream/10">
                                        <TableRow className="border-b border-gold/15 hover:bg-transparent">
                                            <TableHead className="h-7 text-[9px] font-bold text-maroon py-0.5">Date</TableHead>
                                            <TableHead className="h-7 text-[9px] font-bold text-maroon py-0.5">Sale ID</TableHead>
                                            <TableHead className="h-7 text-[9px] font-bold text-maroon py-0.5">Invoice #</TableHead>
                                            <TableHead className="h-7 text-[9px] font-bold text-maroon py-0.5">Saree Description</TableHead>
                                            <TableHead className="h-7 text-[9px] font-bold text-maroon text-right py-0.5">Qty</TableHead>
                                            <TableHead className="h-7 text-[9px] font-bold text-maroon text-right py-0.5">Billing (₹)</TableHead>
                                            <TableHead className="h-7 text-[9px] font-bold text-maroon text-right py-0.5">Margin (₹)</TableHead>
                                            <TableHead className="h-7 text-[9px] font-bold text-maroon py-0.5">Cashier</TableHead>
                                            <TableHead className="h-7 text-[9px] font-bold text-maroon py-0.5">Customer / Agent</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoadingSales ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="h-24 text-center text-maroon/50 text-xs italic">
                                                    <Loader2 className="h-4 w-4 animate-spin mx-auto mr-1 inline text-maroon" /> Loading logs...
                                                </TableCell>
                                            </TableRow>
                                        ) : paginatedSales.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="h-24 text-center text-gray-400 italic">No records match the filter criteria</TableCell>
                                            </TableRow>
                                        ) : (
                                            paginatedSales.map((sale) => (
                                                <TableRow key={`${sale.saleId}-${sale.sareeId}`} className="hover:bg-cream/5 border-b border-gold/5 h-8">
                                                    <TableCell className="py-1 text-[9px] font-mono text-gray-500">
                                                        {new Date(sale.date).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="py-1 text-[9px] font-mono text-gray-500 truncate max-w-[80px]" title={sale.saleId}>
                                                        {sale.saleId}
                                                    </TableCell>
                                                    <TableCell className="py-1 text-[9px] font-mono text-gray-500">
                                                        <div className="flex items-center gap-1">
                                                            <span className="truncate max-w-[110px]" title={sale.invoiceNumber || 'N/A'}>
                                                                {sale.invoiceNumber || 'N/A'}
                                                            </span>
                                                            {sale.invoiceNumber && (
                                                                <button
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(sale.invoiceNumber || '');
                                                                        toast.success('Invoice # copied!');
                                                                    }}
                                                                    className="text-gray-400 hover:text-maroon p-0.5 rounded hover:bg-gray-150 transition-all cursor-pointer flex-shrink-0"
                                                                    title="Copy Invoice Number"
                                                                >
                                                                    <Copy className="h-2.5 w-2.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-1 text-xs font-semibold text-gray-800 truncate max-w-[150px]" title={sale.sareeName}>
                                                        {sale.sareeName}
                                                    </TableCell>
                                                    <TableCell className="py-1 text-xs text-right font-mono text-gray-650">{sale.quantity}</TableCell>
                                                    <TableCell className="py-1 text-xs text-right font-bold font-mono text-maroon">
                                                        {formatCurrency(sale.totalAmount)}
                                                    </TableCell>
                                                    <TableCell className="py-1 text-xs text-right text-emerald-700 font-bold font-mono">
                                                        {formatCurrency(sale.profit)}
                                                    </TableCell>
                                                    <TableCell className="py-1 text-[9px] font-mono text-gray-500 truncate max-w-[100px]" title={sale.createdBy || 'system'}>
                                                        {sale.createdBy || 'system'}
                                                    </TableCell>
                                                    <TableCell className="py-1 text-[9px]">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-gray-700">{sale.customerName || 'Walk-in'}</span>
                                                            {sale.salespersonName && (
                                                                <span className="text-[8px] text-maroon font-bold uppercase mt-0.5">
                                                                    Agent: {sale.salespersonName}
                                                                </span>
                                                            )}
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
                                <div className="flex items-center justify-between px-2 py-1.5 border-t border-gold/10 bg-cream/5 mt-2 rounded">
                                    <p className="text-[9px] text-gray-500">
                                        Showing <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold">{Math.min(currentPage * itemsPerPage, searchedSales.length)}</span> of <span className="font-bold">{searchedSales.length}</span>
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-gold/20 text-maroon h-6 w-6 p-0 hover:bg-cream/10 cursor-pointer"
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="h-3.5 w-3.5" />
                                        </Button>
                                        <span className="text-[9px] font-mono text-gray-650 px-2">Page {currentPage} of {totalPages}</span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-gold/20 text-maroon h-6 w-6 p-0 hover:bg-cream/10 cursor-pointer"
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* TAB 2: AGENT PERFORMANCE & COMMISSIONS */}
                        <TabsContent value="agents" className="m-0 pt-1">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                                {/* Commission Table (7 cols) */}
                                <div className="lg:col-span-7 space-y-2">
                                    <div className="overflow-x-auto border border-gold/10 rounded-lg bg-white">
                                        <Table>
                                            <TableHeader className="bg-cream/10">
                                                <TableRow className="border-b border-gold/15 hover:bg-transparent">
                                                    <TableHead className="h-7 text-[9px] font-bold text-maroon py-0.5">Agent Partner</TableHead>
                                                    <TableHead className="h-7 text-[9px] font-bold text-maroon text-right py-0.5">Invoices</TableHead>
                                                    <TableHead className="h-7 text-[9px] font-bold text-maroon text-right py-0.5">Revenue (₹)</TableHead>
                                                    <TableHead className="h-7 text-[9px] font-bold text-maroon text-right py-0.5">Commission Payable (₹)</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {commissionLedger.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="h-24 text-center text-xs text-gray-400 italic">No agent sales recorded</TableCell>
                                                    </TableRow>
                                                ) : (
                                                    commissionLedger.map((row) => (
                                                        <TableRow key={row.name} className="hover:bg-cream/5 border-b border-gold/5 h-8">
                                                            <TableCell className="py-1 text-xs font-semibold text-gray-800">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="h-5.5 w-5.5 rounded-full bg-maroon/10 flex items-center justify-center text-maroon font-bold text-[9px]">
                                                                        {row.name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    {row.name}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="py-1 text-xs text-right font-mono font-semibold text-gray-650">{row.bills}</TableCell>
                                                            <TableCell className="py-1 text-xs text-right font-bold font-mono text-maroon">{formatCurrency(row.revenue)}</TableCell>
                                                            <TableCell className="py-1 text-xs text-right font-black font-mono text-emerald-700">{formatCurrency(row.commission)}</TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                            {commissionLedger.length > 0 && (
                                                <tfoot>
                                                    <tr className="bg-cream/10 border-t border-gold/25 font-bold">
                                                        <td className="py-1.5 px-3 text-[9px] font-bold text-maroon uppercase">Aggregate Dues</td>
                                                        <td className="py-1.5 px-3 text-xs text-right font-mono text-gray-800">
                                                            {commissionLedger.reduce((sum, r) => sum + r.bills, 0)}
                                                        </td>
                                                        <td className="py-1.5 px-3 text-xs text-right font-mono text-maroon">
                                                            {formatCurrency(commissionLedger.reduce((sum, r) => sum + r.revenue, 0))}
                                                        </td>
                                                        <td className="py-1.5 px-3 text-xs text-right font-mono text-emerald-700">
                                                            {formatCurrency(commissionLedger.reduce((sum, r) => sum + r.commission, 0))}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            )}
                                        </Table>
                                    </div>
                                </div>

                                {/* Agent Chart (5 cols) */}
                                <div className="lg:col-span-5 border border-gold/10 p-2.5 rounded-lg bg-cream-light/5 flex flex-col justify-between">
                                    <div className="mb-2">
                                        <h4 className="text-[9px] font-bold text-maroon uppercase tracking-widest flex items-center gap-1">
                                            <Activity className="h-3 w-3" />
                                            Revenue Contributions
                                        </h4>
                                        <p className="text-[8px] text-gray-400">Attributed gross sales comparison by staff agent</p>
                                    </div>
                                    <div className="h-[140px] w-full text-[9px]">
                                        {commissionLedger.length === 0 ? (
                                            <div className="h-full flex items-center justify-center text-gray-400 italic">No chart data available</div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={commissionLedger} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                                                    <XAxis dataKey="name" stroke="#888888" fontSize={8} tickLine={false} axisLine={false} />
                                                    <YAxis stroke="#888888" fontSize={8} tickLine={false} axisLine={false} />
                                                    <Tooltip 
                                                        contentStyle={{ background: '#ffffff', border: '1px solid #c5a880', fontSize: '9px' }}
                                                        formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                                                    />
                                                    <Bar dataKey="revenue" fill="#800000" radius={[2, 2, 0, 0]}>
                                                        {commissionLedger.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#800000' : '#b28d46'} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* TAB 3: PRODUCT SALES VELOCITY */}
                        <TabsContent value="leaderboard" className="m-0 pt-1">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                                {/* Leaderboard list (7 cols) */}
                                <div className="lg:col-span-7 space-y-2">
                                    <div className="overflow-x-auto border border-gold/10 rounded-lg bg-white">
                                        <Table>
                                            <TableHeader className="bg-cream/10">
                                                <TableRow className="border-b border-gold/15 hover:bg-transparent">
                                                    <TableHead className="h-7 text-[9px] font-bold text-maroon py-0.5 w-[50px] text-center">Rank</TableHead>
                                                    <TableHead className="h-7 text-[9px] font-bold text-maroon py-0.5">Saree Model</TableHead>
                                                    <TableHead className="h-7 text-[9px] font-bold text-maroon text-center py-0.5">Qty Sold</TableHead>
                                                    <TableHead className="h-7 text-[9px] font-bold text-maroon text-right py-0.5">Total Revenue (₹)</TableHead>
                                                    <TableHead className="h-7 text-[9px] font-bold text-maroon text-right py-0.5">Total Margin (₹)</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {productLeaderboard.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="h-24 text-center text-xs text-gray-400 italic">No products sold in this period</TableCell>
                                                    </TableRow>
                                                ) : (
                                                    productLeaderboard.map((item, index) => (
                                                        <TableRow key={item.name} className="hover:bg-cream/5 border-b border-gold/5 h-8">
                                                            <TableCell className="py-1 text-xs text-center font-bold text-gray-500 font-mono">
                                                                #{index + 1}
                                                            </TableCell>
                                                            <TableCell className="py-1 text-xs font-bold text-gray-800 truncate max-w-[180px]">
                                                                {item.name}
                                                            </TableCell>
                                                            <TableCell className="py-1 text-xs text-center font-mono font-semibold text-gray-650">{item.qty}</TableCell>
                                                            <TableCell className="py-1 text-xs text-right font-mono font-semibold text-maroon">{formatCurrency(item.revenue)}</TableCell>
                                                            <TableCell className="py-1 text-xs text-right font-bold font-mono text-emerald-700">{formatCurrency(item.profit)}</TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {/* Leaderboard Chart visualization (5 cols) */}
                                <div className="lg:col-span-5 border border-gold/10 p-2.5 rounded-lg bg-cream-light/5 flex flex-col justify-between">
                                    <div className="mb-2">
                                        <h4 className="text-[9px] font-bold text-maroon uppercase tracking-widest flex items-center gap-1">
                                            <Award className="h-3.5 w-3.5 text-gold" />
                                            Product Volume Leaderboard
                                        </h4>
                                        <p className="text-[8px] text-gray-400">Top selling design models by unit quantity</p>
                                    </div>
                                    <div className="h-[140px] w-full text-[9px]">
                                        {productLeaderboard.length === 0 ? (
                                            <div className="h-full flex items-center justify-center text-gray-400 italic">No chart data available</div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={productLeaderboard} layout="vertical" margin={{ top: 5, right: 5, left: 15, bottom: 5 }}>
                                                    <XAxis type="number" stroke="#888888" fontSize={8} tickLine={false} axisLine={false} />
                                                    <YAxis dataKey="name" type="category" stroke="#888888" fontSize={7} tickLine={false} axisLine={false} width={70} />
                                                    <Tooltip
                                                        contentStyle={{ background: '#ffffff', border: '1px solid #c5a880', fontSize: '9px' }}
                                                        formatter={(value: any) => [`${value} units`, 'Quantity']}
                                                    />
                                                    <Bar dataKey="qty" fill="#b28d46" radius={[0, 2, 2, 0]}>
                                                        {productLeaderboard.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#b28d46' : '#800000'} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </motion.div>
    );
}
