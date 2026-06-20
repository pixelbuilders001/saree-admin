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
    Filter
} from 'lucide-react';
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

    const { data: sales, isLoading: isLoadingSales } = useQuery<SaleReportItem[]>({
        queryKey: ['sales'],
        queryFn: salesService.getSales
    });

    // Filter sales by date range
    const filteredSales = React.useMemo(() => {
        if (!sales) return [];
        return sales.filter(s => {
            const saleDate = s.date.split('T')[0];
            return saleDate >= startDate && saleDate <= endDate;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, startDate, endDate]);

    // Calculate Summary Stats for the selected period
    const stats = React.useMemo(() => {
        return filteredSales.reduce((acc, s) => ({
            revenue: acc.revenue + (s.totalAmount || 0),
            profit: acc.profit + (s.profit || 0),
            count: acc.count + 1
        }), { revenue: 0, profit: 0, count: 0 });
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-maroon">Sales Reports</h1>
                    <p className="text-gray-500">Detailed transaction history and financial analysis</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="border-gold text-maroon hover:bg-gold/10 gap-2"
                        onClick={() => toast.info('PDF export coming soon')}
                    >
                        <FileText className="h-4 w-4" />
                        Export PDF
                    </Button>
                    <Button
                        className="bg-maroon hover:bg-maroon-dark text-gold gap-2"
                        onClick={exportToCSV}
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Filter Controls & Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <Card className="lg:col-span-1 border-gold/20 shadow-sm bg-cream/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-maroon flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            Filter Period
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase">From Date</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="border-gold/30 focus-visible:ring-maroon"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase">To Date</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="border-gold/30 focus-visible:ring-maroon"
                            />
                        </div>
                        <div className="pt-2">
                            <p className="text-[10px] text-gray-400 leading-tight">
                                Showing records between these dates. Data is fetched automatically.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-gold/20 shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-3 text-gold/20 group-hover:text-gold/40 transition-colors">
                            <IndianRupee className="h-12 w-12" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500 uppercase">Period Revenue</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-maroon">₹{stats.revenue.toLocaleString()}</div>
                            <p className="text-xs text-gray-400 mt-1 whitespace-nowrap">Total billing in selected range</p>
                        </CardContent>
                    </Card>

                    <Card className="border-gold/20 shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-3 text-green-100 group-hover:text-green-200 transition-colors">
                            <TrendingUp className="h-12 w-12" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500 uppercase">Period Profit</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-700">₹{stats.profit.toLocaleString()}</div>
                            <p className="text-xs text-gray-400 mt-1 whitespace-nowrap">Net earnings after cost deduction</p>
                        </CardContent>
                    </Card>

                    <Card className="border-gold/20 shadow-sm overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-3 text-gold/20 group-hover:text-gold/40 transition-colors">
                            <ShoppingCart className="h-12 w-12" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500 uppercase">Items Sold</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-maroon">{stats.count}</div>
                            <p className="text-xs text-gray-400 mt-1 whitespace-nowrap">Total item count in range</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Transactions Table */}
            <Card className="border-gold/20 shadow-md">
                <CardHeader className="bg-cream/20 border-b border-gold/10">
                    <CardTitle className="text-xl text-maroon flex items-center gap-2">
                        <ArrowUpDown className="h-5 w-5" />
                        Detailed Transaction Log
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead className="font-bold text-maroon">Date</TableHead>
                                    <TableHead className="font-bold text-maroon">ID</TableHead>
                                    <TableHead className="font-bold text-maroon">Saree Name</TableHead>
                                    <TableHead className="text-right font-bold text-maroon">Qty</TableHead>
                                    <TableHead className="text-right font-bold text-maroon">Total</TableHead>
                                    <TableHead className="text-right font-bold text-maroon">Profit</TableHead>
                                    <TableHead className="font-bold text-maroon">Customer</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingSales ? (
                                    <TableRow><TableCell colSpan={7} className="h-24 text-center">Loading transactions...</TableCell></TableRow>
                                ) : filteredSales.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="h-48 text-center bg-gray-50/50">
                                        <div className="flex flex-col items-center justify-center text-gray-400 space-y-2">
                                            <Calendar className="h-12 w-12 opacity-20" />
                                            <p>No sales recorded between {new Date(startDate).toLocaleDateString()} and {new Date(endDate).toLocaleDateString()}</p>
                                        </div>
                                    </TableCell></TableRow>
                                ) : (
                                    filteredSales.map((sale) => (
                                        <TableRow key={`${sale.saleId}-${sale.sareeId}`} className="hover:bg-cream/5 transition-colors">
                                            <TableCell className="whitespace-nowrap">{new Date(sale.date).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-xs font-mono text-gray-500">{sale.saleId}</TableCell>
                                            <TableCell className="font-bold text-maroon">{sale.sareeName}</TableCell>
                                            <TableCell className="text-right font-semibold">{sale.quantity}</TableCell>
                                            <TableCell className="text-right font-bold">₹{sale.totalAmount?.toLocaleString()}</TableCell>
                                            <TableCell className="text-right text-green-700 font-bold">₹{sale.profit?.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{sale.customerName || 'N/A'}</span>
                                                    <span className="text-[10px] text-gray-400">{sale.customerMobile || 'Walk-in'}</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
