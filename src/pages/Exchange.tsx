import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService, type Saree } from '@/services/inventoryService';
import { salesService, type SaleReportItem } from '@/services/salesService';
import {
    ArrowLeftRight,
    Search,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ArrowDownLeft,
    ArrowUpRight,
    SearchCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { receiptService } from '@/services/receiptService';

export default function ExchangePage() {
    const [originalSaleId, setOriginalSaleId] = React.useState('');
    const [sareeSearchTerm, setSareeSearchTerm] = React.useState('');

    const [returnItems, setReturnItems] = React.useState<SaleReportItem[]>([]);
    const [replaceItems, setReplaceItems] = React.useState<any[]>([]);

    const queryClient = useQueryClient();

    const { data: allSales, isLoading: isLoadingSales } = useQuery({
        queryKey: ['sales'],
        queryFn: salesService.getSales
    });

    const { data: sarees } = useQuery({
        queryKey: ['sarees'],
        queryFn: inventoryService.getSarees
    });

    const exchangeMutation = useMutation({
        mutationFn: salesService.processExchange,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['sarees'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });

            receiptService.downloadExchangePDF({
                exchangeId: data.exchangeId,
                customerName: returnItems[0]?.customerName || 'N/A',
                customerMobile: returnItems[0]?.customerMobile || 'N/A',
                date: data.date,
                returnItems: returnItems.map(i => ({
                    sareeId: i.sareeId,
                    sareeName: i.sareeName,
                    quantity: i.quantity,
                    sellingPrice: i.sellingPrice
                })),
                replaceItems: replaceItems.map(i => ({
                    sareeId: i.sareeId,
                    sareeName: i.sareeName,
                    quantity: i.quantity,
                    sellingPrice: i.sellingPrice
                })),
                netDifference: data.netTotalAmount
            });

            toast.success('Exchange processed successfully & Receipt downloaded!');
            setOriginalSaleId('');
            setReturnItems([]);
            setReplaceItems([]);
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to process exchange');
        }
    });

    const handleLookupSale = () => {
        if (!originalSaleId) return;

        const saleItems = allSales?.filter(s => s.saleId.toLowerCase() === originalSaleId.toLowerCase());

        if (!saleItems || saleItems.length === 0) {
            toast.error('Sale not found');
            return;
        }

        const saleDate = new Date(saleItems[0].date);
        const now = new Date();
        const diffDays = Math.ceil((now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24));

        if (diffDays > 7) {
            toast.error(`Sale is more than 7 days old (${diffDays} days). Exchange period expired.`);
            return;
        }

        setReturnItems(saleItems);
        toast.success('Sale data loaded');
    };

    const filteredSarees = React.useMemo(() => {
        if (!Array.isArray(sarees) || !sareeSearchTerm) return [];
        return sarees.filter(s =>
            s.status === 'active' && (
                s.sareeName.toLowerCase().includes(sareeSearchTerm.toLowerCase()) ||
                s.id.toLowerCase().includes(sareeSearchTerm.toLowerCase())
            )
        ).slice(0, 8);
    }, [sarees, sareeSearchTerm]);

    const handleAddReplacement = (saree: Saree) => {
        const existing = replaceItems.find(i => i.sareeId === saree.id);
        if (existing) {
            setReplaceItems(items => items.map(i =>
                i.sareeId === saree.id ? { ...i, quantity: i.quantity + 1 } : i
            ));
        } else {
            setReplaceItems(items => [...items, {
                sareeId: saree.id,
                sareeName: saree.sareeName,
                quantity: 1,
                sellingPrice: saree.sellingPrice
            }]);
        }
        setSareeSearchTerm('');
        toast.success(`Added ${saree.sareeName} to exchange`);
    };

    const handleRemoveReplacement = (index: number) => {
        setReplaceItems(items => items.filter((_, i) => i !== index));
    };

    const handleRemoveReturn = (index: number) => {
        setReturnItems(items => items.filter((_, i) => i !== index));
    };

    const returnTotal = returnItems.reduce((sum, item) => sum + item.totalAmount, 0);
    const replaceTotal = replaceItems.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
    const netDifference = replaceTotal - returnTotal;

    const handleProcessExchange = () => {
        if (returnItems.length === 0) {
            toast.error('Please select at least one item to return');
            return;
        }
        if (replaceItems.length === 0) {
            toast.error('Please add at least one replacement item');
            return;
        }

        exchangeMutation.mutate({
            returnItems: returnItems.map(i => ({
                sareeId: i.sareeId,
                sareeName: i.sareeName,
                quantity: i.quantity,
                sellingPrice: i.sellingPrice
            })),
            replaceItems,
            customerName: returnItems[0].customerName,
            customerMobile: returnItems[0].customerMobile
        });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden max-w-7xl mx-auto px-2 space-y-3">
            <div className="flex items-center justify-between border-b border-gold/10 pb-2">
                <div className="flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5 text-maroon" />
                    <div>
                        <h1 className="text-xl font-bold font-serif text-maroon tracking-wider">SBS EXCHANGE DESK</h1>
                        <p className="text-xs text-gray-500 font-sans">Strict 7-day customer exchange portal</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-3 overflow-hidden">
                <div className="lg:col-span-2 flex flex-col space-y-3 overflow-y-auto pr-1">
                    <Card className="border-gold/20 shadow-sm">
                        <CardHeader className="bg-cream/20 border-b border-gold/10 p-2.5">
                            <CardTitle className="text-xs font-bold text-maroon flex items-center gap-1.5 uppercase">
                                <SearchCode className="h-3.5 w-3.5" />
                                1. Find Original Invoice
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                    <Input
                                        placeholder="Enter Sale ID (e.g. SL-1002)"
                                        className="pl-8 border-gold/30 h-8 text-xs font-mono"
                                        value={originalSaleId}
                                        onChange={(e) => setOriginalSaleId(e.target.value.toUpperCase())}
                                        onKeyDown={(e) => e.key === 'Enter' && handleLookupSale()}
                                    />
                                </div>
                                <Button className="bg-maroon hover:bg-maroon-dark text-gold h-8 text-xs font-bold shadow-sm" onClick={handleLookupSale} disabled={isLoadingSales}>
                                    {isLoadingSales ? <Loader2 className="h-3 w-3 animate-spin" /> : 'FIND'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {returnItems.length > 0 && (
                        <Card className="border-red-100 shadow-sm">
                            <CardHeader className="bg-red-50/50 border-b border-red-100 p-2.5">
                                <CardTitle className="text-xs font-bold text-red-800 flex items-center gap-1.5 uppercase">
                                    <ArrowDownLeft className="h-3.5 w-3.5" />
                                    2. Return Item Registry
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-red-50/20">
                                        <TableRow className="border-b border-red-100 hover:bg-transparent">
                                            <TableHead className="h-7 text-[10px] font-bold text-red-800 py-1">Item Title</TableHead>
                                            <TableHead className="h-7 text-[10px] font-bold text-red-800 text-center py-1">Qty</TableHead>
                                            <TableHead className="h-7 text-[10px] font-bold text-red-800 text-right py-1">Value Amount</TableHead>
                                            <TableHead className="h-7 text-[10px] font-bold text-red-800 text-right py-1 px-3"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {returnItems.map((item, idx) => (
                                            <TableRow key={idx} className="border-b border-red-50 hover:bg-red-50/20 h-8">
                                                <TableCell className="py-1 text-xs">
                                                    <div className="font-semibold text-gray-805">{item.sareeName}</div>
                                                    <div className="text-[10px] font-mono text-gray-400">{item.sareeId}</div>
                                                </TableCell>
                                                <TableCell className="py-1 text-center text-xs font-semibold">{item.quantity}</TableCell>
                                                <TableCell className="py-1 text-right text-xs font-bold text-red-750 font-mono">₹{item.totalAmount.toLocaleString()}</TableCell>
                                                <TableCell className="py-1 text-right px-3">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-red-400 hover:text-red-650 hover:bg-red-100 rounded-full"
                                                        onClick={() => handleRemoveReturn(idx)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {returnItems.length > 0 && (
                        <Card className="border-green-150 shadow-sm flex-1">
                            <CardHeader className="bg-green-50/50 border-b border-green-100 p-2.5">
                                <CardTitle className="text-xs font-bold text-green-800 flex items-center gap-1.5 uppercase">
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                    3. New Selection Registry
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                    <Input
                                        placeholder="Scan barcode or type matching Saree name..."
                                        className="pl-8 border-gold/30 h-8 text-xs bg-white"
                                        value={sareeSearchTerm}
                                        onChange={(e) => setSareeSearchTerm(e.target.value)}
                                    />
                                    {sareeSearchTerm && (
                                        <Card className="absolute z-50 w-full mt-1 border-gold/20 shadow-2xl max-h-[180px] overflow-y-auto">
                                            <CardContent className="p-0">
                                                {filteredSarees.length > 0 ? (
                                                    filteredSarees.map((saree) => (
                                                        <div
                                                            key={saree.id}
                                                            className="p-2 hover:bg-cream/20 cursor-pointer border-b border-gray-150 last:border-0 flex justify-between items-center text-xs"
                                                            onClick={() => handleAddReplacement(saree)}
                                                        >
                                                            <div>
                                                                <div className="font-bold text-maroon">{saree.sareeName}</div>
                                                                <div className="text-[10px] text-gray-405">{saree.id} | Available: {saree.stock}</div>
                                                            </div>
                                                            <div className="font-bold text-maroon font-mono">₹{saree.sellingPrice.toLocaleString()}</div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-3 text-center text-xs text-gray-405 italic">No matching sarees found</div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>

                                {replaceItems.length > 0 && (
                                    <Table>
                                        <TableHeader className="bg-green-50/20">
                                            <TableRow className="border-b border-green-100 hover:bg-transparent">
                                                <TableHead className="h-7 text-[10px] font-bold text-green-800 py-1">Item Title</TableHead>
                                                <TableHead className="h-7 text-[10px] font-bold text-green-800 text-center py-1">Qty</TableHead>
                                                <TableHead className="h-7 text-[10px] font-bold text-green-800 text-right py-1">Unit Price</TableHead>
                                                <TableHead className="h-7 text-[10px] font-bold text-green-800 text-right py-1 px-3"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {replaceItems.map((item, idx) => (
                                                <TableRow key={idx} className="border-b border-green-50 hover:bg-green-50/20 h-8">
                                                    <TableCell className="py-1 text-xs">
                                                        <div className="font-semibold text-gray-805">{item.sareeName}</div>
                                                        <div className="text-[10px] font-mono text-gray-405">{item.sareeId}</div>
                                                    </TableCell>
                                                    <TableCell className="py-1 text-center text-xs font-semibold">{item.quantity}</TableCell>
                                                    <TableCell className="py-1 text-right text-xs font-bold text-green-750 font-mono">₹{item.sellingPrice.toLocaleString()}</TableCell>
                                                    <TableCell className="py-1 text-right px-3">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                                                            onClick={() => handleRemoveReplacement(idx)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="flex flex-col space-y-3 overflow-hidden">
                    <Card className="border-gold/30 shadow-xl overflow-hidden flex flex-col flex-1">
                        <div className="bg-maroon p-3.5 text-gold flex-shrink-0">
                            <h3 className="text-xs font-bold uppercase tracking-widest">Exchange Terminal Summary</h3>
                            <p className="text-gold/60 text-[10px] mt-0.5">Calculated difference matrix</p>
                        </div>
                        <CardContent className="p-4 space-y-3 flex-1 overflow-y-auto">
                            {returnItems.length > 0 && (
                                <div className="border border-gold/20 bg-cream/15 p-2 rounded-md space-y-1">
                                    <div className="text-[9px] font-bold text-maroon opacity-75 uppercase tracking-wider flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        Customer Identity
                                    </div>
                                    <div className="text-xs font-bold text-gray-800">{returnItems[0].customerName || 'Walk-in Customer'}</div>
                                    <div className="text-xs text-gray-500 font-mono">{returnItems[0].customerMobile || 'No contact provided'}</div>
                                </div>
                            )}

                            <div className="space-y-2 pt-2 border-t border-gold/10">
                                <div className="flex justify-between items-center text-xs text-red-650">
                                    <span className="font-semibold uppercase tracking-wider">(-) Total Returned Value</span>
                                    <span className="font-bold font-mono">₹{returnTotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-green-755">
                                    <span className="font-semibold uppercase tracking-wider">(+) Total Replacement Value</span>
                                    <span className="font-bold font-mono">₹{replaceTotal.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="border-t border-gold/25 pt-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-maroon uppercase tracking-widest">Net Payable Diff</span>
                                    <span className={cn(
                                        "text-xl font-black font-mono",
                                        netDifference > 0 ? "text-green-700 font-sans" : "text-gray-500"
                                    )}>
                                        ₹{Math.max(0, netDifference).toLocaleString()}
                                    </span>
                                </div>
                                {netDifference < 0 && (
                                    <p className="text-[9px] text-gray-400 italic mt-1 leading-normal">
                                        * Note: The replacement value is lower than original sale value. Under business policy, negative differences are not refunded.
                                    </p>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="p-3 border-t border-gold/10 flex-shrink-0 bg-cream/10">
                            <Button
                                className="w-full bg-maroon hover:bg-maroon-dark text-gold h-10 text-sm font-black tracking-widest gap-2 rounded-md shadow-md"
                                disabled={returnItems.length === 0 || replaceItems.length === 0 || exchangeMutation.isPending}
                                onClick={handleProcessExchange}
                            >
                                {exchangeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                                COMPLETE EXCHANGE
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
