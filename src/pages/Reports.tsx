import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { salesService, type SaleReportItem } from '@/services/salesService';
import {
    Download,
    FileText,
    ShoppingCart,
    TrendingUp,
    IndianRupee,
    Filter,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Search,
    Award,
    RefreshCw,
    Activity,
    Copy,
    Wallet
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
            className="space-y-5 max-w-7xl mx-auto px-2 pb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-maroon to-maroon-dark text-gold rounded-xl shadow-md shadow-maroon/20">
                        <FileText className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold font-serif text-maroon tracking-wide">Business Reports & Audits</h1>
                        <p className="text-xs text-gray-500 font-sans">Ledger statements, commission payable audits & product velocity charts</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        className="h-9 text-xs border-gold/30 text-maroon hover:bg-gold/5 font-bold uppercase tracking-wider px-3 gap-1.5 cursor-pointer"
                        onClick={() => {
                            refetch();
                            toast.success('Sales ledger synchronizing with cloud...');
                        }}
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Sync Data
                    </Button>
                    <Button
                        className="bg-gradient-to-r from-maroon to-maroon-dark hover:from-maroon-dark hover:to-maroon-dark text-gold font-bold h-9 text-xs gap-1.5 px-3 uppercase tracking-wider shadow-md shadow-maroon/20 cursor-pointer"
                        onClick={exportToCSV}
                    >
                        <Download className="h-3.5 w-3.5" />
                        Export Ledger
                    </Button>
                </div>
            </div>

            {/* Range Presets and Inputs */}
            <Card className="border-gold/20 shadow-sm bg-white">
                <CardContent className="p-3.5">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold text-maroon uppercase mr-1 flex items-center gap-1">
                                <Filter className="h-3.5 w-3.5" />
                                Date Presets:
                            </span>
                            {(['today', 'week', 'month', '30days', 'year'] as const).map(preset => (
                                <Button
                                    key={preset}
                                    variant="ghost"
                                    className="h-8 text-[10px] uppercase px-2.5 hover:bg-cream/10 hover:text-maroon font-bold text-gray-500 cursor-pointer"
                                    onClick={() => setPreset(preset)}
                                >
                                    {preset === '30days' ? '30 Days' : preset}
                                </Button>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">Date Range:</span>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="h-8 text-xs w-[130px] border-gold/25 font-mono focus-visible:ring-maroon bg-white"
                            />
                            <span className="text-xs text-gray-400 font-mono">to</span>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="h-8 text-xs w-[130px] border-gold/25 font-mono focus-visible:ring-maroon bg-white"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 4-Metric Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Gross Billing', value: formatCurrency(stats.revenue), sub: 'Total Revenue', icon: Wallet, from: 'from-maroon', to: 'to-maroon-dark', text: 'text-maroon' },
                    { label: 'Net Profits', value: formatCurrency(stats.profit), sub: 'Margin Realized', icon: TrendingUp, from: 'from-emerald-500', to: 'to-emerald-700', text: 'text-emerald-700' },
                    { label: 'Quantity Sold', value: `${stats.count} units`, sub: 'Volume Count', icon: ShoppingCart, from: 'from-slate-600', to: 'to-slate-800', text: 'text-gray-800' },
                    { label: 'Avg Order Value', value: formatCurrency(stats.aov), sub: 'Dynamic AOV', icon: IndianRupee, from: 'from-amber-400', to: 'to-amber-600', text: 'text-gray-800' },
                ].map((s, i) => (
                    <motion.div key={s.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}>
                        <Card className="border-gold/20 shadow-sm hover:shadow-md transition-shadow bg-white">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">{s.label}</span>
                                    <span className={cn("text-xl font-bold font-mono block", s.text)}>{s.value}</span>
                                    <span className="text-[10px] text-gray-400 block">{s.sub}</span>
                                </div>
                                <div className={cn("p-2.5 bg-gradient-to-br text-white rounded-xl shadow", s.from, s.to)}>
                                    <s.icon className="h-5 w-5" />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Tabbed Report Workspace */}
            <Card className="border-gold/20 shadow-md overflow-hidden bg-white">
                <CardHeader className="bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/10 px-4 py-3">
                    <CardTitle className="text-sm font-bold text-maroon uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-maroon/70" />
                            Report Workspace
                        </span>
                        <span className="text-[10px] text-gray-500 normal-case font-normal hidden md:inline">
                            Period Total: {searchedSales.length} items logged
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <Tabs defaultValue="transactions" className="w-full">
                        <div className="border-b border-gold/10 pb-2.5 mb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <TabsList className="bg-white border border-gold/25 p-1 rounded-lg h-9">
                                <TabsTrigger value="transactions" className="text-[10px] h-7 px-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-maroon data-[state=active]:to-maroon-dark data-[state=active]:text-gold font-bold cursor-pointer rounded-md">
                                    Sales Audit Log
                                </TabsTrigger>
                                <TabsTrigger value="agents" className="text-[10px] h-7 px-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-maroon data-[state=active]:to-maroon-dark data-[state=active]:text-gold font-bold cursor-pointer rounded-md">
                                    Agent Commissions
                                </TabsTrigger>
                                <TabsTrigger value="leaderboard" className="text-[10px] h-7 px-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-maroon data-[state=active]:to-maroon-dark data-[state=active]:text-gold font-bold cursor-pointer rounded-md">
                                    Sales Leaderboard
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* TAB 1: DETAILED SALES AUDIT LOG */}
                        <TabsContent value="transactions" className="m-0 space-y-3">
                            <div className="relative max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search by ID, product, cashier, or client..."
                                    className="pl-9 h-9 text-xs border-gold/25 focus-visible:ring-maroon bg-white"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-cream/10">
                                        <TableRow className="border-b border-gold/10 hover:bg-transparent">
                                            <TableHead className="h-9 text-[10px] font-bold text-maroon py-1 px-3">Date</TableHead>
                                            <TableHead className="h-9 text-[10px] font-bold text-maroon py-1">Sale ID</TableHead>
                                            <TableHead className="h-9 text-[10px] font-bold text-maroon py-1">Invoice #</TableHead>
                                            <TableHead className="h-9 text-[10px] font-bold text-maroon py-1">Saree Description</TableHead>
                                            <TableHead className="h-9 text-[10px] font-bold text-maroon text-right py-1">Qty</TableHead>
                                            <TableHead className="h-9 text-[10px] font-bold text-maroon text-right py-1">Billing (₹)</TableHead>
                                            <TableHead className="h-9 text-[10px] font-bold text-maroon text-right py-1">Margin (₹)</TableHead>
                                            <TableHead className="h-9 text-[10px] font-bold text-maroon py-1">Cashier</TableHead>
                                            <TableHead className="h-9 text-[10px] font-bold text-maroon py-1 px-3">Customer / Agent</TableHead>
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
                                                <TableRow key={`${sale.saleId}-${sale.sareeId}`} className="hover:bg-cream/10 border-b border-gold/5 transition-colors">
                                                    <TableCell className="py-2 text-[11px] font-mono text-gray-500 px-3">
                                                        {new Date(sale.date).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-[11px] font-mono text-gray-500 truncate max-w-[90px]" title={sale.saleId}>
                                                        {sale.saleId}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-[11px] font-mono text-gray-500">
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
                                                                    className="text-gray-400 hover:text-maroon p-0.5 rounded hover:bg-gray-100 transition-all cursor-pointer flex-shrink-0"
                                                                    title="Copy Invoice Number"
                                                                >
                                                                    <Copy className="h-3 w-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-2 text-xs font-semibold text-gray-800 truncate max-w-[160px]" title={sale.sareeName}>
                                                        {sale.sareeName}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-xs text-right">
                                                        <span className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-bold font-mono">
                                                            {sale.quantity}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-2 text-xs text-right font-bold font-mono text-maroon">
                                                        {formatCurrency(sale.totalAmount)}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-xs text-right text-emerald-700 font-bold font-mono">
                                                        {formatCurrency(sale.profit)}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-[11px] font-mono text-gray-500 truncate max-w-[100px]" title={sale.createdBy || 'system'}>
                                                        {sale.createdBy || 'system'}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-[11px] px-3">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-gray-700">{sale.customerName || 'Walk-in'}</span>
                                                            {sale.salespersonName && (
                                                                <span className="text-[9px] text-maroon font-bold uppercase mt-0.5">
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
                                <div className="flex items-center justify-between px-2 py-2 border-t border-gold/10 bg-cream/5 mt-2 rounded-lg">
                                    <p className="text-[10px] text-gray-500">
                                        Showing <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold">{Math.min(currentPage * itemsPerPage, searchedSales.length)}</span> of <span className="font-bold">{searchedSales.length}</span>
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-gold/20 text-maroon h-7 w-7 p-0 hover:bg-cream/10 cursor-pointer"
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="h-3.5 w-3.5" />
                                        </Button>
                                        <span className="text-[10px] font-mono text-gray-500 px-2">Page {currentPage} of {totalPages}</span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-gold/20 text-maroon h-7 w-7 p-0 hover:bg-cream/10 cursor-pointer"
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
                                    <div className="overflow-x-auto border border-gold/15 rounded-lg bg-white shadow-sm">
                                        <Table>
                                            <TableHeader className="bg-cream/10">
                                                <TableRow className="border-b border-gold/10 hover:bg-transparent">
                                                    <TableHead className="h-9 text-[10px] font-bold text-maroon py-1 px-3">Agent Partner</TableHead>
                                                    <TableHead className="h-9 text-[10px] font-bold text-maroon text-right py-1">Invoices</TableHead>
                                                    <TableHead className="h-9 text-[10px] font-bold text-maroon text-right py-1">Revenue (₹)</TableHead>
                                                    <TableHead className="h-9 text-[10px] font-bold text-maroon text-right py-1 px-3">Commission Payable (₹)</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {commissionLedger.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="h-24 text-center text-xs text-gray-400 italic">No agent sales recorded</TableCell>
                                                    </TableRow>
                                                ) : (
                                                    commissionLedger.map((row) => (
                                                        <TableRow key={row.name} className="hover:bg-cream/10 border-b border-gold/5 transition-colors">
                                                            <TableCell className="py-2 text-xs font-semibold text-gray-800 px-3">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-maroon to-maroon-dark text-gold flex items-center justify-center font-bold text-[10px] shadow-sm">
                                                                        {row.name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    {row.name}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="py-2 text-xs text-right font-mono font-semibold text-gray-600">
                                                                <span className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-bold font-mono">
                                                                    {row.bills}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="py-2 text-xs text-right font-bold font-mono text-maroon">{formatCurrency(row.revenue)}</TableCell>
                                                            <TableCell className="py-2 text-xs text-right font-black font-mono text-emerald-700 px-3">{formatCurrency(row.commission)}</TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                            {commissionLedger.length > 0 && (
                                                <tfoot>
                                                    <tr className="bg-cream/10 border-t border-gold/20 font-bold">
                                                        <td className="py-2 px-3 text-[10px] font-bold text-maroon uppercase">Aggregate Dues</td>
                                                        <td className="py-2 px-3 text-xs text-right font-mono text-gray-800">
                                                            {commissionLedger.reduce((sum, r) => sum + r.bills, 0)}
                                                        </td>
                                                        <td className="py-2 px-3 text-xs text-right font-mono text-maroon">
                                                            {formatCurrency(commissionLedger.reduce((sum, r) => sum + r.revenue, 0))}
                                                        </td>
                                                        <td className="py-2 px-3 text-xs text-right font-mono text-emerald-700">
                                                            {formatCurrency(commissionLedger.reduce((sum, r) => sum + r.commission, 0))}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            )}
                                        </Table>
                                    </div>
                                </div>

                                {/* Agent Chart (5 cols) */}
                                <div className="lg:col-span-5 border border-gold/15 p-3 rounded-xl bg-cream-light/5 flex flex-col justify-between shadow-sm">
                                    <div className="mb-2">
                                        <h4 className="text-[10px] font-bold text-maroon uppercase tracking-widest flex items-center gap-1.5">
                                            <Activity className="h-3.5 w-3.5" />
                                            Revenue Contributions
                                        </h4>
                                        <p className="text-[9px] text-gray-400">Attributed gross sales by staff agent</p>
                                    </div>
                                    <div className="h-[160px] w-full">
                                        {commissionLedger.length === 0 ? (
                                            <div className="h-full flex items-center justify-center text-gray-400 italic">No chart data available</div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={commissionLedger} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                                    <XAxis dataKey="name" stroke="#888888" fontSize={8} tickLine={false} axisLine={false} />
                                                    <YAxis stroke="#888888" fontSize={8} tickLine={false} axisLine={false} />
                                                    <Tooltip 
                                                        contentStyle={{ background: '#ffffff', border: '1px solid #c5a880', fontSize: '10px' }}
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
                                    <div className="overflow-x-auto border border-gold/15 rounded-lg bg-white shadow-sm">
                                        <Table>
                                            <TableHeader className="bg-cream/10">
                                                <TableRow className="border-b border-gold/10 hover:bg-transparent">
                                                    <TableHead className="h-9 text-[10px] font-bold text-maroon py-1 w-[60px] text-center px-3">Rank</TableHead>
                                                    <TableHead className="h-9 text-[10px] font-bold text-maroon py-1">Saree Model</TableHead>
                                                    <TableHead className="h-9 text-[10px] font-bold text-maroon text-center py-1">Qty Sold</TableHead>
                                                    <TableHead className="h-9 text-[10px] font-bold text-maroon text-right py-1">Total Revenue (₹)</TableHead>
                                                    <TableHead className="h-9 text-[10px] font-bold text-maroon text-right py-1 px-3">Total Margin (₹)</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {productLeaderboard.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="h-24 text-center text-xs text-gray-400 italic">No products sold in this period</TableCell>
                                                    </TableRow>
                                                ) : (
                                                    productLeaderboard.map((item, index) => (
                                                        <TableRow key={item.name} className="hover:bg-cream/10 border-b border-gold/5 transition-colors">
                                                            <TableCell className="py-2 text-xs text-center font-bold text-gray-500 font-mono px-3">
                                                                <span className={cn(
                                                                    "inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold",
                                                                    index === 0 ? "bg-amber-100 text-amber-700 border border-amber-300" :
                                                                    index === 1 ? "bg-gray-100 text-gray-600 border border-gray-300" :
                                                                    index === 2 ? "bg-orange-100 text-orange-700 border border-orange-300" :
                                                                    "bg-gray-50 text-gray-400 border border-gray-200"
                                                                )}>
                                                                    {index + 1}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="py-2 text-xs font-bold text-gray-800 truncate max-w-[180px]">
                                                                {item.name}
                                                            </TableCell>
                                                            <TableCell className="py-2 text-xs text-center">
                                                                <span className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-bold font-mono">
                                                                    {item.qty}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="py-2 text-xs text-right font-mono font-semibold text-maroon">{formatCurrency(item.revenue)}</TableCell>
                                                            <TableCell className="py-2 text-xs text-right font-bold font-mono text-emerald-700 px-3">{formatCurrency(item.profit)}</TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {/* Leaderboard Chart visualization (5 cols) */}
                                <div className="lg:col-span-5 border border-gold/15 p-3 rounded-xl bg-cream-light/5 flex flex-col justify-between shadow-sm">
                                    <div className="mb-2">
                                        <h4 className="text-[10px] font-bold text-maroon uppercase tracking-widest flex items-center gap-1.5">
                                            <Award className="h-3.5 w-3.5 text-gold" />
                                            Product Volume Leaderboard
                                        </h4>
                                        <p className="text-[9px] text-gray-400">Top selling design models by unit quantity</p>
                                    </div>
                                    <div className="h-[160px] w-full">
                                        {productLeaderboard.length === 0 ? (
                                            <div className="h-full flex items-center justify-center text-gray-400 italic">No chart data available</div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={productLeaderboard} layout="vertical" margin={{ top: 5, right: 5, left: 15, bottom: 5 }}>
                                                    <XAxis type="number" stroke="#888888" fontSize={8} tickLine={false} axisLine={false} />
                                                    <YAxis dataKey="name" type="category" stroke="#888888" fontSize={7} tickLine={false} axisLine={false} width={70} />
                                                    <Tooltip
                                                        contentStyle={{ background: '#ffffff', border: '1px solid #c5a880', fontSize: '10px' }}
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