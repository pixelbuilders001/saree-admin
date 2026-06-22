import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService, type Saree } from '@/services/inventoryService';
import { salesService, type SaleReportItem } from '@/services/salesService';
import {
    ArrowLeftRight,
    Search,
    Plus,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Calendar,
    ArrowDownLeft,
    ArrowUpRight,
    SearchCode,
    Download
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
    const [highlightedIndex, setHighlightedIndex] = React.useState(0);

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

            // Download Receipt
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
                s.id.toLowerCase().includes(sareeSearchTerm.toLowerCase()) ||
                s.barcode?.toLowerCase().includes(sareeSearchTerm.toLowerCase())
            )
        ).slice(0, 8);
    }, [sarees, sareeSearchTerm]);

    React.useEffect(() => {
        setHighlightedIndex(0);
    }, [filteredSarees.length]);

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
            customerName: returnItems[0].customerName, // Use original customer info
            customerMobile: returnItems[0].customerMobile
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-maroon flex items-center gap-2">
                        <ArrowLeftRight className="h-8 w-8" />
                        Item Exchange
                    </h1>
                    <p className="text-gray-500">Fast 7-day exchange window processing</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Step 1: Lookup Original Sale */}
                    <Card className="border-gold/20 shadow-md">
                        <CardHeader className="bg-cream/20 border-b border-gold/10">
                            <CardTitle className="text-lg text-maroon flex items-center gap-2">
                                <SearchCode className="h-5 w-5" />
                                1. Find Original Sale
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Enter Sale ID (e.g. SL-1234)"
                                        className="pl-10 border-gold/30"
                                        value={originalSaleId}
                                        onChange={(e) => setOriginalSaleId(e.target.value.toUpperCase())}
                                        onKeyDown={(e) => e.key === 'Enter' && handleLookupSale()}
                                    />
                                </div>
                                <Button className="bg-maroon hover:bg-maroon-dark text-gold" onClick={handleLookupSale} disabled={isLoadingSales}>
                                    Find Sale
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Step 2: Items being Returned */}
                    {returnItems.length > 0 && (
                        <Card className="border-red-100 shadow-md">
                            <CardHeader className="bg-red-50/50 border-b border-red-100">
                                <CardTitle className="text-lg text-red-800 flex items-center gap-2">
                                    <ArrowDownLeft className="h-5 w-5" />
                                    2. Items being Returned
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="text-center">Qty</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {returnItems.map((item, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium">
                                                    <div>{item.sareeName}</div>
                                                    <div className="text-xs text-gray-400">{item.sareeId}</div>
                                                </TableCell>
                                                <TableCell className="text-center">{item.quantity}</TableCell>
                                                <TableCell className="text-right">₹{item.totalAmount.toLocaleString()}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-gray-400 hover:text-red-500"
                                                        onClick={() => handleRemoveReturn(idx)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {/* Step 3: Replacement Items */}
                    {returnItems.length > 0 && (
                        <Card className="border-green-100 shadow-md">
                            <CardHeader className="bg-green-50/50 border-b border-green-100">
                                <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                                    <ArrowUpRight className="h-5 w-5" />
                                    3. New Replacement Items
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search new saree by name or barcode..."
                                        className="pl-10 border-gold/30"
                                        value={sareeSearchTerm}
                                        onChange={(e) => setSareeSearchTerm(e.target.value)}
                                    />
                                    {sareeSearchTerm && (
                                        <Card className="absolute z-50 w-full mt-1 border-gold/20 shadow-xl max-h-[300px] overflow-y-auto">
                                            <CardContent className="p-0">
                                                {filteredSarees.length > 0 ? (
                                                    filteredSarees.map((saree, idx) => (
                                                        <div
                                                            key={saree.id}
                                                            className="p-3 hover:bg-cream/20 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center"
                                                            onClick={() => handleAddReplacement(saree)}
                                                        >
                                                            <div>
                                                                <div className="font-bold text-maroon">{saree.sareeName}</div>
                                                                <div className="text-xs text-gray-500">{saree.id} | Stock: {saree.stock}</div>
                                                            </div>
                                                            <div className="font-bold text-maroon">₹{saree.sellingPrice.toLocaleString()}</div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-4 text-center text-gray-500 italic">No sarees match your search</div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>

                                {replaceItems.length > 0 && (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Item</TableHead>
                                                <TableHead className="text-center">Qty</TableHead>
                                                <TableHead className="text-right">Price</TableHead>
                                                <TableHead></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {replaceItems.map((item, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium text-maroon">{item.sareeName}</TableCell>
                                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                                    <TableCell className="text-right">₹{item.sellingPrice.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-500 p-0 h-auto"
                                                            onClick={() => handleRemoveReplacement(idx)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
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

                {/* Summary & Checkout */}
                <div className="space-y-6">
                    <Card className="border-gold/30 shadow-xl overflow-hidden sticky top-6">
                        <div className="bg-maroon p-6 text-gold">
                            <h3 className="text-lg font-bold mb-1 uppercase tracking-wider">Exchange Summary</h3>
                            <p className="text-gold/60 text-xs">Calculated based on item values</p>
                        </div>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex justify-between items-center text-red-600">
                                <span className="text-sm font-medium">Return Value</span>
                                <span className="font-bold">₹{returnTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-green-700">
                                <span className="text-sm font-medium">Replacement Value</span>
                                <span className="font-bold">₹{replaceTotal.toLocaleString()}</span>
                            </div>

                            <div className="border-t border-gold/20 pt-4">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-lg font-bold text-maroon">Net Difference</span>
                                    <span className={cn(
                                        "text-2xl font-black",
                                        netDifference > 0 ? "text-green-700" : "text-gray-500"
                                    )}>
                                        ₹{Math.max(0, netDifference).toLocaleString()}
                                    </span>
                                </div>
                                {netDifference < 0 && (
                                    <p className="text-[10px] text-gray-400 italic">Note: Difference is negative, no refund will be provided.</p>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="pb-6 px-6">
                            <Button
                                className="w-full bg-maroon hover:bg-maroon-dark text-gold h-14 text-lg font-bold gap-2"
                                disabled={returnItems.length === 0 || replaceItems.length === 0 || exchangeMutation.isPending}
                                onClick={handleProcessExchange}
                            >
                                {exchangeMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                                Complete Exchange
                            </Button>
                        </CardFooter>
                    </Card>

                    {returnItems.length > 0 && (
                        <Card className="border-gold/10 bg-cream/5 shadow-sm">
                            <CardContent className="p-4 space-y-2">
                                <h4 className="font-bold text-maroon text-sm flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    Customer Info
                                </h4>
                                <div className="text-sm space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Name:</span>
                                        <span className="font-medium">{returnItems[0].customerName || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Mobile:</span>
                                        <span className="font-medium">{returnItems[0].customerMobile || 'N/A'}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
