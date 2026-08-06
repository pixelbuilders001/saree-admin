import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { inventoryService, type Saree } from '@/services/inventoryService';
import { salesService, type SaleReportItem } from '@/services/salesService';
import { playBeep } from '@/lib/audio';
import { BarcodeScanner } from '@/components/sales/BarcodeScanner';
import { RemoteScannerLink } from '@/components/sales/RemoteScannerLink';
import Peer from 'peerjs';
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

    const handleBarcodeScan = (decodedText: string) => {
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

    const [remoteConnected, setRemoteConnected] = React.useState(false);
    const [peerActive, setPeerActive] = React.useState(false);

    const peerRef = React.useRef<Peer | null>(null);
    const connRef = React.useRef<any>(null);

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

    const initializePeer = React.useCallback(() => {
        if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
        }

        try {
            const peerId = `POS-${sessionId}`;
            const peer = new Peer(peerId, {
                host: '0.peerjs.com',
                port: 443,
                secure: true,
                debug: 1
            });
            peerRef.current = peer;

            peer.on('open', (id) => {
                console.log('Master POS Terminal PeerJS open with ID:', id);
                setPeerActive(true);
            });

            peer.on('connection', (conn) => {
                console.log('Terminal received connection from:', conn.peer);
                setRemoteConnected(true);
                connRef.current = conn;

                conn.on('data', (data) => {
                    console.log('Terminal received barcode:', data);
                    if (data && typeof data === 'string') {
                        const barcode = data.trim();
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
                });

                conn.on('close', () => {
                    setRemoteConnected(false);
                    connRef.current = null;
                    toast.info('Remote scanner disconnected');
                });

                conn.on('error', (err) => {
                    console.error('Terminal dynamic connection error:', err);
                    setRemoteConnected(false);
                    connRef.current = null;
                });
            });

            peer.on('close', () => {
                setPeerActive(false);
            });

            peer.on('error', (err) => {
                console.error('Master peer error:', err);
                if (err.type === 'unavailable-id') {
                    console.log('Peer ID taken, auto-regenerating session...');
                    const newId = 'E-' + Math.random().toString(36).substring(2, 7).toUpperCase();
                    localStorage.setItem('exchange_session_id', newId);
                    setSessionId(newId);
                } else {
                    setPeerActive(false);
                }
            });
        } catch (error) {
            console.error('Peer instantiation error:', error);
            setPeerActive(false);
        }
    }, [sessionId]);

    React.useEffect(() => {
        initializePeer();

        return () => {
            if (peerRef.current) {
                peerRef.current.destroy();
                peerRef.current = null;
            }
            connRef.current = null;
            setPeerActive(false);
        };
    }, [initializePeer]);

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

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] overflow-hidden max-w-7xl mx-auto px-2 space-y-3">
            <div className="flex items-center justify-between border-b border-gold/10 pb-2">
                <div className="flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5 text-maroon" />
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold font-serif text-maroon tracking-wider">SBS EXCHANGE DESK</h1>
                            {remoteConnected && (
                                <span className="flex items-center gap-1 bg-green-500/10 text-green-400 border border-green-500/25 px-1.5 py-0.5 rounded-full text-[9px] font-medium leading-none animate-pulse">
                                    <span className="h-1.5 w-1.5 rounded-full bg-green-400"></span>
                                    Live Scanner
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 font-sans">Strict 7-day customer exchange portal</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 font-sans">
                    <span
                        className={`h-2 w-2 rounded-full ${peerActive ? (remoteConnected ? 'bg-green-500 animate-pulse' : 'bg-green-400') : 'bg-gray-300'}`}
                        title={peerActive ? (remoteConnected ? 'Live Connection Established' : 'Host Peer Registered & Ready') : 'Offline - Signaling Reconnection Needed'}
                    />
                    <span className="text-[10px] font-mono bg-maroon/5 border border-maroon/10 text-maroon px-2 py-0.5 rounded flex items-center gap-1">
                        Session: {sessionId}
                        <button
                            type="button"
                            onClick={handleRegenerateSession}
                            className="p-0.5 hover:bg-maroon/10 rounded transition-colors text-maroon/70 hover:text-maroon"
                            title="Regenerate Session ID & Reconnect"
                        >
                            <RefreshCw className="h-2.5 w-2.5" />
                        </button>
                    </span>
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
                                        placeholder="Enter Sale ID or Invoice No. (e.g. SL-1002, INV-2026-0805-...)"
                                        className="pl-8 border-gold/30 h-8 text-xs font-mono"
                                        value={originalSaleId}
                                        onChange={(e) => setOriginalSaleId(e.target.value.trim().toUpperCase())}
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
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
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
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="border-gold/30 h-8 w-8 text-maroon hover:bg-cream/10 flex-shrink-0"
                                        title="Camera Barcode Scanner"
                                        onClick={() => setIsScannerOpen(true)}
                                    >
                                        <Scan className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="border-gold/30 h-8 w-8 text-maroon hover:bg-cream/10 flex-shrink-0"
                                        title="Remote Mobile Scanner Link"
                                        onClick={() => setIsRemoteLinkOpen(true)}
                                    >
                                        <Link className="h-4 w-4" />
                                    </Button>
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
                                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                                        <div className="flex items-center gap-1.5 text-amber-700 text-[10px] font-bold mb-1">
                                            <BadgeCent className="h-3.5 w-3.5" />
                                            STORE CREDIT TO BE ISSUED
                                        </div>
                                        <p className="text-xs font-black text-amber-800 font-mono">₹{Math.abs(netDifference).toLocaleString()}</p>
                                        <p className="text-[9px] text-amber-600 mt-1 leading-normal">
                                            A voucher will be auto-generated for the customer on exchange completion.
                                        </p>
                                    </div>
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
