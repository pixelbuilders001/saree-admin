import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { salesService } from '@/services/salesService';
import {
    Download,
    FileText,
    Calendar,
    Filter,
    ArrowUpDown,
    CheckCircle2
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
import { toast } from 'sonner';

export default function ReportsPage() {
    const { data: sales, isLoading } = useQuery({
        queryKey: ['sales'],
        queryFn: salesService.getSales
    });

    const exportToCSV = () => {
        if (!sales || sales.length === 0) {
            toast.error('No data to export');
            return;
        }

        const headers = ['Sale ID', 'Date', 'Saree Name', 'Quantity', 'Price', 'Total', 'Profit', 'Customer'];
        const csvContent = [
            headers.join(','),
            ...sales.map(s => [
                s.saleId,
                new Date(s.date).toLocaleDateString(),
                `"${s.sareeName}"`,
                s.quantity,
                s.sellingPrice,
                s.totalAmount,
                s.profit,
                `"${s.customerMobile || 'N/A'}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Report exported successfully');
    };

    return (
        <div className="space-y-6">
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

            <Card className="border-gold/20 shadow-md overflow-hidden">
                <CardHeader className="bg-cream/20 border-b border-gold/10">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl text-maroon flex items-center gap-2">
                            <ArrowUpDown className="h-5 w-5" />
                            Transaction History
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead className="font-bold text-maroon">Date</TableHead>
                                    <TableHead className="font-bold text-maroon">Sale ID</TableHead>
                                    <TableHead className="font-bold text-maroon">Saree Name</TableHead>
                                    <TableHead className="text-right font-bold text-maroon">Qty</TableHead>
                                    <TableHead className="text-right font-bold text-maroon">Amount</TableHead>
                                    <TableHead className="text-right font-bold text-maroon">Profit</TableHead>
                                    <TableHead className="font-bold text-maroon">Customer</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            Loading transactions...
                                        </TableCell>
                                    </TableRow>
                                ) : !Array.isArray(sales) || sales.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            No sales recorded yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sales.map((sale) => (
                                        <TableRow key={sale.saleId} className="hover:bg-cream/5">
                                            <TableCell className="font-medium">
                                                {new Date(sale.date).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-xs font-mono">{sale.saleId}</TableCell>
                                            <TableCell className="font-bold">{sale.sareeName}</TableCell>
                                            <TableCell className="text-right">{sale.quantity}</TableCell>
                                            <TableCell className="text-right font-bold">₹{sale.totalAmount.toLocaleString()}</TableCell>
                                            <TableCell className="text-right text-green-700 font-bold">₹{sale.profit.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm">{sale.customerName || 'N/A'}</span>
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
