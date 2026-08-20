import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { inventoryService, type Saree } from '@/services/inventoryService';
import { salesService, type SaleReportItem } from '@/services/salesService';
import { playBeep } from '@/lib/audio';
import { BarcodeScanner } from '@/components/sales/BarcodeScanner';
import { RemoteScannerLink } from '@/components/sales/RemoteScannerLink';
import { supabase } from '@/lib/supabase';
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
    BadgeCent,
    Copy,
    Check,
    Scan,
    Link,
    RefreshCw,
    Smartphone,
    Camera,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { creditService, type StoreCredit } from '@/services/creditService';
import { ReceiptModal } from '@/components/ReceiptModal';

export default function ExchangePage() {
    const [originalSaleId, setOriginalSaleId] = React.useState('');
    const [sareeSearchTerm, setSareeSearchTerm] = React.useState('');

    const [returnItems, setReturnItems] = React.useState<SaleReportItem[]>([]);
    const [replaceItems, setReplaceItems] = React.useState<any[]>([]);
    const [issuedCredit, setIssuedCredit] = React.useState<StoreCredit | null>(null);
    const [copiedCode, setCopiedCode] = React.useState(false);
    const [lastCompletedSale, setLastCompletedSale] = React.useState<any | null>(null);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = React.useState(false);
    const [isScannerOpen, setIsScannerOpen] = React.useState(false);
    const [isRemoteLinkOpen, setIsRemoteLinkOpen] = React.useState(false);
    const [lastScannedBarcode, setLastScannedBarcode] = React.useState<string | null>(null);
    const [isProcessingScan, setIsProcessingScan] = React.useState(false);

    function handleAddReplacement(saree: Saree) {
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
    }

    const [searchParams] = useSearchParams();
    const urlSessionId = searchParams.get('sessionId');
    const remoteMode = searchParams.get('remoteMode');

    // Persist session ID
    const [sessionId, setSessionId] = React.useState(() => {
        if (urlSessionId) return urlSessionId;
        const saved = localStorage.getItem('exchange_session_id');
        if (saved) return saved;
        const id = 'E-' + Math.random().toString(36).substring(2, 7).toUpperCase();
        localStorage.setItem('exchange_session_id', id);
        return id;
    });

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
        onSuccess: async (data) => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['sarees'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });

            // Auto-issue store credit if return > replacement
            const creditAmount = returnTotal - replaceTotal;
            if (creditAmount > 0 && data.customerId) {
                try {
                    const credit = await creditService.issueCredit(
                        data.customerId,
                        creditAmount,
                        `Exchange on ${data.invoiceNumber || data.exchangeId} — Store credit for value difference`
                    );
                    setIssuedCredit(credit);
                    toast.success('Exchange complete! Store credit voucher issued.');
                } catch {
                    toast.error('Failed to issue store credit voucher.');
                }
            } else {
                toast.success('Exchange completed successfully!');
            }

            const completedSale = {
                id: data.exchangeId,
                invoiceNumber: data.invoiceNumber || data.exchangeId,
                totalAmount: data.netTotalAmount,
                customerName: returnItems[0]?.customerName || 'Walk-in',
                customerMobile: returnItems[0]?.customerMobile || '',
            };
            setLastCompletedSale(completedSale);
            setIsReceiptModalOpen(true);

            setOriginalSaleId('');
            setReturnItems([]);
            setReplaceItems([]);
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to process exchange');
        }
    });

    const [remoteConnected, setRemoteConnected] = React.useState(false);
    const [connectionStatus, setConnectionStatus] = React.useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

    const channelRef = React.useRef<any>(null);

    const sareesRef = React.useRef(sarees);
    React.useEffect(() => {
        sareesRef.current = sarees;
    }, [sarees]);

    const addReplacementRef = React.useRef(handleAddReplacement);
    React.useEffect(() => {
        addReplacementRef.current = handleAddReplacement;
    }, [handleAddReplacement]);

    const handleRegenerateSession = React.useCallback(() => {
        const id = 'E-' + Math.random().toString(36).substring(2, 7).toUpperCase();
        localStorage.setItem('exchange_session_id', id);
        setSessionId(id);
        toast.info(`Regenerated Session ID: ${id}`);
    }, []);

    const initializeRealtime = React.useCallback(() => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        try {
            setConnectionStatus('connecting');
            const targetChannelName = `room:POS-${sessionId}`;
            console.log(`[Exchange Terminal] Connecting to Supabase Realtime channel: ${targetChannelName}`);

            const channel = supabase.channel(targetChannelName, {
                config: { broadcast: { self: false } }
            });
            channelRef.current = channel;

            channel
                .on('broadcast', { event: 'scan' }, (payload) => {
                    console.log('[Exchange Terminal] Realtime broadcast scan received:', payload);
                    const data = payload?.payload;
                    const barcode = typeof data === 'string' ? data.trim() : (data?.barcode ? String(data.barcode).trim() : '');

                    if (barcode) {
                        const foundSaree = sareesRef.current?.find(s =>
                            s.id.toLowerCase() === barcode.toLowerCase() ||
                            s.barcode?.toLowerCase() === barcode.toLowerCase()
                        );

                        if (foundSaree) {
                            if (foundSaree.status !== 'active') {
                                toast.error(`Saree "${foundSaree.sareeName}" is inactive.`);
                                return;
                            }
                            playBeep();
                            addReplacementRef.current(foundSaree);
                            toast.success(`Remote scanned: ${foundSaree.sareeName}`);
                        } else {
                            toast.error(`No active saree found for barcode: ${barcode}`);
                        }
                    }
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('[Exchange Terminal] Supabase channel subscribed live!');
                        setRemoteConnected(true);
                        setConnectionStatus('connected');
                    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                        console.warn('[Exchange Terminal] Supabase channel status:', status);
                        setRemoteConnected(false);
                        setConnectionStatus('disconnected');
                    }
                });
        } catch (error) {
            console.error('Realtime initialization error:', error);
            setConnectionStatus('disconnected');
        }
    }, [sessionId]);

    React.useEffect(() => {
        initializeRealtime();

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [initializeRealtime]);

    const handleBarcodeScan = (decodedText: string) => {
        if (isProcessingScan || (lastScannedBarcode === decodedText)) return;

        setIsProcessingScan(true);
        setLastScannedBarcode(decodedText);

        setTimeout(() => {
            setIsProcessingScan(false);
            setLastScannedBarcode(null);
        }, 2000);

        if (remoteMode === 'scanner') {
            if (channelRef.current) {
                try {
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'scan',
                        payload: { barcode: decodedText, timestamp: Date.now() }
                    });
                    playBeep();
                    if (navigator.vibrate) {
                        navigator.vibrate(100);
                    }
                    toast.success(`Scanned & sent: ${decodedText}`);
                } catch (err) {
                    console.error("Failed to send scan over Supabase Realtime:", err);
                    toast.error("Failed to send scan over Realtime channel");
                }
            } else {
                toast.error("Not connected to terminal channel.");
            }
            return;
        }

        const saree = sarees?.find(s =>
            s.id.toLowerCase() === decodedText.trim().toLowerCase() ||
            (s.barcode && s.barcode.toLowerCase() === decodedText.trim().toLowerCase())
        );

        if (saree) {
            if (saree.status !== 'active') {
                toast.error(`Saree "${saree.sareeName}" is inactive and cannot be exchanged.`);
                return;
            }
            playBeep();
            handleAddReplacement(saree);
            setIsScannerOpen(false);
        } else {
            toast.error(`No saree found with barcode: ${decodedText}`);
        }
    };

    const handleLookupSale = () => {
        if (!originalSaleId) return;

        const query = originalSaleId.trim().toLowerCase();
        const saleItems = allSales?.filter(s =>
            s.saleId.toLowerCase() === query ||
            (s.invoiceNumber && s.invoiceNumber.toLowerCase() === query)
        );

        if (!saleItems || saleItems.length === 0) {
            toast.error('Sale or Invoice not found');
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

    if (remoteMode === 'scanner') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 space-y-6">
                <Card className="w-full max-w-sm border-gold/20 shadow-xl overflow-hidden">
                    <CardHeader className="bg-maroon text-gold text-center py-8">
                        <div className="flex justify-center mb-4">
                            <div className="p-4 bg-gold/10 rounded-full border-2 border-gold/20 animate-pulse">
                                <Smartphone className="h-12 w-12" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl">Remote Scanner</CardTitle>
                        <p className="text-gold/60 mt-2 font-mono text-sm">Session: {sessionId}</p>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6 text-center">
                        <p className="text-gray-500 text-sm italic">
                            Your phone is now acting as a wireless scanner for your laptop.
                        </p>
                        <Button
                            className="w-full h-20 bg-gold hover:bg-gold-dark text-maroon font-bold text-xl gap-3 shadow-lg"
                            disabled={connectionStatus !== 'connected'}
                            onClick={() => setIsScannerOpen(true)}
                        >
                            <Camera className="h-8 w-8" />
                            Open Camera
                        </Button>
                        <div className="pt-4 border-t border-gray-100 flex flex-col items-center gap-2">
                            {connectionStatus === 'connected' ? (
                                <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                                    Connected (Realtime Live)
                                </div>
                            ) : connectionStatus === 'connecting' ? (
                                <div className="flex items-center gap-2 text-amber-600 font-medium text-sm">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                                    Connecting...
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-2 text-red-600 font-medium text-sm">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                                        Disconnected
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 border-gold/20 text-maroon hover:bg-cream/10 text-xs px-3"
                                        onClick={initializeRealtime}
                                    >
                                        Reconnect to Terminal
                                    </Button>
                                </div>
                            )}
                            <Button variant="ghost" className="text-gray-400 text-xs mt-2" onClick={() => window.location.href = '/exchange'}>
                                Exit Scanner Mode
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                <BarcodeScanner
                    isOpen={isScannerOpen}
                    onClose={() => setIsScannerOpen(false)}
                    onScan={handleBarcodeScan}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden max-w-7xl mx-auto px-4 space-y-3 py-3">
            {/* Header Banner */}
            <div className="flex items-center justify-between border-b border-gold/15 pb-2.5">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-maroon/5 rounded-lg border border-gold/20">
                        <ArrowLeftRight className="h-4.5 w-4.5 text-maroon" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-black tracking-widest text-maroon uppercase">Exchange Desk Terminal</h1>
                            {remoteConnected && (
                                <span className="flex items-center gap-1 bg-green-500/10 text-green-600 border border-green-500/25 px-2 py-0.5 rounded-full text-[9px] font-bold leading-none animate-pulse">
                                    <span className="h-1 w-1 rounded-full bg-green-500"></span>
                                    Scanner Active
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-500 tracking-wider">Shree Banarasi Sarees • Desk Operations</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span
                        className={cn(
                            "h-2.5 w-2.5 rounded-full border",
                            connectionStatus === 'connected'
                                ? "bg-green-500 border-green-300 animate-pulse"
                                : connectionStatus === 'connecting'
                                ? "bg-amber-500 border-amber-300 animate-pulse"
                                : "bg-gray-300 border-gray-200"
                        )}
                        title={connectionStatus === 'connected' ? 'Supabase Realtime Live' : connectionStatus}
                    />
                    <span className="text-[10px] font-mono bg-cream/35 border border-gold/20 text-maroon px-2.5 py-0.5 rounded-md flex items-center gap-1.5 shadow-sm font-bold">
                        Session Code: {sessionId}
                        <button
                            type="button"
                            onClick={handleRegenerateSession}
                            className="p-0.5 hover:bg-maroon/10 rounded transition-colors text-maroon/60"
                            title="Regenerate Session ID"
                        >
                            <RefreshCw className="h-2.5 w-2.5" />
                        </button>
                    </span>
                </div>
            </div>

            {/* Grid Area */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
                {/* Main panel */}
                <div className="lg:col-span-2 flex flex-col space-y-3.5 overflow-y-auto pr-1">

                    {/* Search Original Invoice */}
                    <Card className="border-gold/15 bg-white/80 backdrop-blur-sm shadow-sm rounded-xl overflow-hidden">
                        <CardHeader className="bg-cream/10 border-b border-gold/10 py-2 px-3">
                            <CardTitle className="text-[10px] font-bold text-maroon/80 flex items-center gap-1.5 uppercase tracking-wider">
                                <SearchCode className="h-3.5 w-3.5 text-maroon" />
                                1. Find Original Invoice
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                    <Input
                                        placeholder="Enter Sale ID or Invoice Number..."
                                        className="pl-8 border-gold/25 focus-visible:ring-maroon h-8 text-[11px] font-mono uppercase bg-white/70"
                                        value={originalSaleId}
                                        onChange={(e) => setOriginalSaleId(e.target.value.trim().toUpperCase())}
                                        onKeyDown={(e) => e.key === 'Enter' && handleLookupSale()}
                                    />
                                </div>
                                <Button className="bg-maroon hover:bg-maroon-dark text-gold h-8 text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all" onClick={handleLookupSale} disabled={isLoadingSales}>
                                    {isLoadingSales ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Search'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Return list */}
                    {returnItems.length > 0 && (
                        <Card className="border-red-100 bg-white/60 shadow-sm rounded-xl overflow-hidden">
                            <CardHeader className="bg-red-50/40 border-b border-red-100/70 py-2 px-3">
                                <CardTitle className="text-[10px] font-bold text-red-800 flex items-center gap-1.5 uppercase tracking-wider">
                                    <ArrowDownLeft className="h-3.5 w-3.5" />
                                    2. Return registry items
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-red-50/15">
                                        <TableRow className="border-b border-red-50 hover:bg-transparent">
                                            <TableHead className="h-7 text-[9px] font-black text-red-800/80 uppercase py-1">Item Title</TableHead>
                                            <TableHead className="h-7 text-[9px] font-black text-red-800/80 uppercase text-center py-1">Qty</TableHead>
                                            <TableHead className="h-7 text-[9px] font-black text-red-800/80 uppercase text-right py-1">Total value</TableHead>
                                            <TableHead className="h-7 text-[9px] font-black text-red-800/80 uppercase text-center py-1 w-10"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {returnItems.map((item, idx) => (
                                            <TableRow key={idx} className="border-b border-red-50/50 hover:bg-red-50/10 h-8.5">
                                                <TableCell className="py-1.5 text-[11px] font-semibold text-gray-805">
                                                    <div>{item.sareeName}</div>
                                                    <div className="text-[9px] font-mono text-gray-400 font-normal">{item.sareeId}</div>
                                                </TableCell>
                                                <TableCell className="py-1.5 text-center text-[11px] font-bold text-gray-700">{item.quantity}</TableCell>
                                                <TableCell className="py-1.5 text-right text-[11px] font-extrabold text-red-700 font-mono">-₹{item.totalAmount.toLocaleString('en-IN')}</TableCell>
                                                <TableCell className="py-1.5 text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-5.5 w-5.5 text-red-400 hover:text-red-650 hover:bg-red-100/50 rounded-full"
                                                        onClick={() => handleRemoveReturn(idx)}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {/* Replacements selection */}
                    {returnItems.length > 0 && (
                        <Card className="border-green-100 bg-white/60 shadow-sm rounded-xl overflow-hidden flex-1">
                            <CardHeader className="bg-green-50/40 border-b border-green-100/70 py-2 px-3">
                                <CardTitle className="text-[10px] font-bold text-green-800 flex items-center gap-1.5 uppercase tracking-wider">
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                    3. New Selection Registry
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 space-y-2.5">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                        <Input
                                            placeholder="Type product name or scan barcode to add..."
                                            className="pl-8 border-gold/25 focus-visible:ring-maroon h-8 text-[11px]"
                                            value={sareeSearchTerm}
                                            onChange={(e) => setSareeSearchTerm(e.target.value)}
                                        />
                                        {sareeSearchTerm && (
                                            <Card className="absolute z-50 w-full mt-1 border-gold/20 shadow-2xl max-h-[160px] overflow-y-auto bg-white/95 backdrop-blur-md">
                                                <CardContent className="p-0">
                                                    {filteredSarees.length > 0 ? (
                                                        filteredSarees.map((saree) => (
                                                            <div
                                                                key={saree.id}
                                                                className="p-2 hover:bg-cream/20 cursor-pointer border-b border-gray-100 last:border-0 flex justify-between items-center text-[11px] transition-colors"
                                                                onClick={() => handleAddReplacement(saree)}
                                                            >
                                                                <div>
                                                                    <div className="font-bold text-maroon">{saree.sareeName}</div>
                                                                    <div className="text-[9px] text-gray-400">{saree.id} | Available: {saree.stock}</div>
                                                                </div>
                                                                <div className="font-bold text-maroon font-mono">₹{saree.sellingPrice.toLocaleString()}</div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-2.5 text-center text-[10px] text-gray-400 italic">No matching sarees found</div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="border-gold/25 h-8 w-8 text-maroon hover:bg-cream/10 flex-shrink-0"
                                        title="Local Scan"
                                        onClick={() => setIsScannerOpen(true)}
                                    >
                                        <Scan className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="border-gold/25 h-8 w-8 text-maroon hover:bg-cream/10 flex-shrink-0"
                                        title="Link Mobile Scanner"
                                        onClick={() => setIsRemoteLinkOpen(true)}
                                    >
                                        <Link className="h-3.5 w-3.5" />
                                    </Button>
                                </div>

                                {replaceItems.length > 0 && (
                                    <Table>
                                        <TableHeader className="bg-green-50/15">
                                            <TableRow className="border-b border-green-50 hover:bg-transparent">
                                                <TableHead className="h-7 text-[9px] font-black text-green-800/80 uppercase py-1">Item Title</TableHead>
                                                <TableHead className="h-7 text-[9px] font-black text-green-800/80 uppercase text-center py-1">Qty</TableHead>
                                                <TableHead className="h-7 text-[9px] font-black text-green-800/80 uppercase text-right py-1">Price</TableHead>
                                                <TableHead className="h-7 text-[9px] font-black text-green-800/80 uppercase text-center py-1 w-10"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {replaceItems.map((item, idx) => (
                                                <TableRow key={idx} className="border-b border-green-50/50 hover:bg-green-50/10 h-8.5">
                                                    <TableCell className="py-1.5 text-[11px] font-semibold text-gray-850">
                                                        <div>{item.sareeName}</div>
                                                        <div className="text-[9px] font-mono text-gray-400 font-normal">{item.sareeId}</div>
                                                    </TableCell>
                                                    <TableCell className="py-1.5 text-center text-[11px] font-bold text-gray-700">{item.quantity}</TableCell>
                                                    <TableCell className="py-1.5 text-right text-[11px] font-extrabold text-green-700 font-mono">₹{item.sellingPrice.toLocaleString()}</TableCell>
                                                    <TableCell className="py-1.5 text-center">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-5.5 w-5.5 text-red-400 hover:text-red-650 hover:bg-red-100/50 rounded-full"
                                                            onClick={() => handleRemoveReplacement(idx)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
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

                {/* Sidebar summary panel */}
                <div className="flex flex-col space-y-3.5 overflow-hidden h-full">
                    <Card className="border-gold/20 bg-white shadow-md overflow-hidden flex flex-col flex-1 rounded-xl">
                        <div className="bg-maroon p-4 text-gold flex-shrink-0">
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#FCD34D]">Exchange Billing</h3>
                            <p className="text-gold/60 text-[9px] mt-0.5">Calculated terminal difference invoice</p>
                        </div>
                        <CardContent className="p-4 space-y-4 flex-1 overflow-y-auto font-sans">
                            {returnItems.length > 0 && (
                                <div className="border border-gold/15 bg-cream/10 p-3 rounded-lg space-y-1 shadow-sm">
                                    <div className="text-[9px] font-bold text-maroon opacity-75 uppercase tracking-widest flex items-center gap-1.5">
                                        <AlertCircle className="h-3 w-3" />
                                        Customer Account
                                    </div>
                                    <div className="text-xs font-bold text-gray-800">{returnItems[0].customerName || 'Walk-in Customer'}</div>
                                    <div className="text-[10px] text-gray-500 font-mono tracking-wide">{returnItems[0].customerMobile || 'No contact provided'}</div>
                                </div>
                            )}

                            <div className="space-y-2.5 pt-1">
                                <div className="flex justify-between items-center text-[11px] text-red-700">
                                    <span className="font-semibold uppercase tracking-wider">(-) Returned Subtotal</span>
                                    <span className="font-bold font-mono text-gray-800">₹{returnTotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px] text-green-700">
                                    <span className="font-semibold uppercase tracking-wider">(+) Replacements Subtotal</span>
                                    <span className="font-bold font-mono text-gray-800">₹{replaceTotal.toLocaleString()}</span>
                                </div>
                                <div className="border-t border-dashed border-gray-200 mt-2"></div>
                            </div>

                            <div className="pt-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-black text-maroon uppercase tracking-widest">Net Payable (Diff)</span>
                                    <span className={cn(
                                        "text-lg font-black font-mono",
                                        netDifference > 0 ? "text-green-700" : "text-gray-400"
                                    )}>
                                        ₹{Math.max(0, netDifference).toLocaleString()}
                                    </span>
                                </div>
                                {netDifference < 0 && (
                                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 shadow-inner">
                                        <div className="flex items-center gap-1.5 text-amber-700 text-[10px] font-bold mb-1 uppercase tracking-wider">
                                            <BadgeCent className="h-4 w-4" />
                                            Credit Balance to Issue
                                        </div>
                                        <p className="text-lg font-black text-amber-900 font-mono">₹{Math.abs(netDifference).toLocaleString()}</p>
                                        <p className="text-[9px] text-amber-600/90 mt-1 leading-normal">
                                            A secure Shree Banarasi Sarees store credit note voucher code will be issued on print.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="p-3 border-t border-gold/10 flex-shrink-0 bg-cream/5">
                            <Button
                                className="w-full bg-maroon hover:bg-maroon-dark text-gold font-bold h-9.5 text-xs tracking-widest gap-2 rounded-lg shadow-sm transition-all"
                                disabled={returnItems.length === 0 || replaceItems.length === 0 || exchangeMutation.isPending}
                                onClick={handleProcessExchange}
                            >
                                {exchangeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                                {netDifference < 0
                                    ? `EXCHANGE + ISSUE ₹${Math.abs(netDifference).toLocaleString()} CREDIT`
                                    : 'COMPLETE EXCHANGE'
                                }
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>

            {/* ── Voucher Success Dialog ──────────────────────────── */}
            {issuedCredit && (
                <Dialog open={!!issuedCredit} onOpenChange={() => setIssuedCredit(null)}>
                    <DialogContent className="sm:max-w-sm border-gold/20 shadow-2xl p-0 overflow-hidden">
                        <div className="bg-maroon p-4 text-center">
                            <BadgeCent className="h-10 w-10 text-gold mx-auto mb-2" />
                            <DialogTitle className="text-gold font-black text-base tracking-widest">STORE CREDIT ISSUED</DialogTitle>
                            <p className="text-gold/70 text-xs mt-1">Customer can use this code on their next purchase</p>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Voucher Code */}
                            <div className="border-2 border-dashed border-gold/40 rounded-xl p-4 text-center bg-amber-50">
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Voucher Code</p>
                                <p className="text-2xl font-black font-mono text-maroon tracking-widest">{issuedCredit.voucherCode}</p>
                                <p className="text-xs font-bold text-amber-700 mt-1">₹{issuedCredit.originalAmount.toLocaleString('en-IN')} Store Credit</p>
                            </div>

                            {/* Customer info */}
                            {(issuedCredit.customerName || issuedCredit.customerMobile) && (
                                <div className="text-xs text-gray-500 text-center">
                                    <span className="font-semibold text-gray-700">{issuedCredit.customerName}</span>
                                    {issuedCredit.customerMobile && <span className="ml-2 font-mono">{issuedCredit.customerMobile}</span>}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant="outline"
                                    className="border-gold/30 text-maroon gap-1.5 text-xs h-9"
                                    onClick={() => {
                                        navigator.clipboard.writeText(issuedCredit.voucherCode);
                                        setCopiedCode(true);
                                        setTimeout(() => setCopiedCode(false), 2000);
                                    }}
                                >
                                    {copiedCode ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                    {copiedCode ? 'Copied!' : 'Copy Code'}
                                </Button>
                                <Button
                                    className="bg-green-600 hover:bg-green-700 text-white gap-1.5 text-xs h-9"
                                    onClick={() => {
                                        const msg = encodeURIComponent(
                                            `🎁 *Store Credit Voucher*\n` +
                                            `Code: *${issuedCredit.voucherCode}*\n` +
                                            `Amount: ₹${issuedCredit.originalAmount.toLocaleString('en-IN')}\n` +
                                            `From: Shree Banarasi Sarees`
                                        );
                                        window.open(`https://wa.me/${issuedCredit.customerMobile?.replace(/\D/g, '')}?text=${msg}`, '_blank');
                                    }}
                                >
                                    WhatsApp
                                </Button>
                            </div>

                            <Button
                                className="w-full bg-maroon hover:bg-maroon-dark text-gold h-9 text-xs font-bold"
                                onClick={() => setIssuedCredit(null)}
                            >
                                Done
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {isReceiptModalOpen && (
                <ReceiptModal
                    isOpen={isReceiptModalOpen}
                    onClose={() => setIsReceiptModalOpen(false)}
                    sale={lastCompletedSale}
                />
            )}
            <BarcodeScanner
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={handleBarcodeScan}
            />
            <RemoteScannerLink
                sessionId={sessionId}
                isOpen={isRemoteLinkOpen}
                onClose={() => setIsRemoteLinkOpen(false)}
            />
        </div>
    );
}
