import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { inventoryService, type Saree } from '@/services/inventoryService';
import { salesService } from '@/services/salesService';
import { customerService } from '@/services/customerService';
import { creditService } from '@/services/creditService';
import {
    ShoppingCart,
    Search,
    Plus,
    Minus,
    Trash2,
    CheckCircle2,
    Loader2,
    Camera,
    Smartphone,
    User,
    Coins,
    CreditCard,
    QrCode,
    UserCheck,
    IndianRupee,
    Package,
    Tag,
    BadgeCheck,
    ScanLine,
    Zap,
    UserRound,
    ReceiptText,
    Edit2,
    Percent,
    Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ReceiptModal } from '@/components/ReceiptModal';
import { BarcodeScanner } from '@/components/sales/BarcodeScanner';
import { RemoteScannerLink } from '@/components/sales/RemoteScannerLink';
import { playBeep } from '@/lib/audio';
import type { Sale } from '@/services/salesService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import QRCode from 'react-qr-code';
import { settingsService, type UpiSetting } from '@/services/settingsService';
import { staffService, type Staff } from '@/services/staffService';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

export default function SalesPage() {
    const customerNameInputRef = React.useRef<HTMLInputElement>(null);
    const [customerName, setCustomerName] = React.useState<string>('');
    const [customerMobile, setCustomerMobile] = React.useState<string>('');
    const [isUPIModalOpen, setIsUPIModalOpen] = React.useState(false);
    const [currentTxnNote, setCurrentTxnNote] = React.useState('');
    const [selectedUpiId, setSelectedUpiId] = React.useState<string>('');
    const [selectedStaffId, setSelectedStaffId] = React.useState<string>('');
    const [sareeSearchTerm, setSareeSearchTerm] = React.useState<string>('');
    const [selectedCategory, setSelectedCategory] = React.useState<string>('All');
    const [paymentMode, setPaymentMode] = React.useState<'cash' | 'card' | 'upi'>('cash');
    const [voucherCodeInput, setVoucherCodeInput] = React.useState<string>('');
    const [appliedVoucher, setAppliedVoucher] = React.useState<{ code: string; amount: number; customerName?: string } | null>(null);
    const [isCheckingVoucher, setIsCheckingVoucher] = React.useState(false);
    const [highlightedIndex, setHighlightedIndex] = React.useState<number>(0);
    const [manualDiscountType, setManualDiscountType] = React.useState<'amount' | 'percentage'>('percentage');
    const [manualDiscountInput, setManualDiscountInput] = React.useState<string>('0');
    const [editingCartIndex, setEditingCartIndex] = React.useState<number | null>(null);
    const [editingSellingPriceInput, setEditingSellingPriceInput] = React.useState<string>('');
    const [cart, setCart] = React.useState<Array<{
        sareeId: string;
        sareeName: string;
        quantity: number;
        sellingPrice: number;
        purchasePrice: number;
        mrp: number;
        discountAmount: number;
        discountPercentage: number;
    }>>([]);
    const [lastCompletedSale, setLastCompletedSale] = React.useState<Sale | null>(null);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = React.useState(false);
    const [isScannerOpen, setIsScannerOpen] = React.useState(false);
    const [lastScannedBarcode, setLastScannedBarcode] = React.useState<string | null>(null);
    const [isProcessingScan, setIsProcessingScan] = React.useState(false);
    const [isRemoteLinkOpen, setIsRemoteLinkOpen] = React.useState(false);
    const [searchParams] = useSearchParams();
    const remoteMode = searchParams.get('remoteMode');
    const urlSessionId = searchParams.get('sessionId');

    // Persist session ID
    const [sessionId] = React.useState(() => {
        if (urlSessionId) return urlSessionId;
        const saved = localStorage.getItem('sales_session_id');
        if (saved) return saved;
        const id = 'S-' + Math.random().toString(36).substring(2, 7).toUpperCase();
        localStorage.setItem('sales_session_id', id);
        return id;
    });



    const queryClient = useQueryClient();

    const { data: sarees, isLoading: isLoadingSarees } = useQuery({
        queryKey: ['sarees'],
        queryFn: inventoryService.getSarees
    });

    const { data: customers } = useQuery({
        queryKey: ['customers'],
        queryFn: customerService.getCustomers
    });

    const { data: upiSettings = [] } = useQuery<UpiSetting[]>({
        queryKey: ['upiSettings'],
        queryFn: settingsService.getUpiSettings,
        staleTime: 60_000,
    });

    const { data: activeStaff = [] } = useQuery<Staff[]>({
        queryKey: ['activeStaff'],
        queryFn: staffService.getActiveStaff,
        staleTime: 60_000,
    });

    const activeUpiSettings = React.useMemo(
        () => upiSettings.filter(u => u.is_active),
        [upiSettings]
    );

    const createSaleMutation = useMutation({
        mutationFn: salesService.createSale,
        onSuccess: (data: Sale) => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['sarees'] });
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            toast.success('Sale recorded successfully!');
            setCart([]);
            setCustomerName('');
            setCustomerMobile('');
            setAppliedVoucher(null);
            setVoucherCodeInput('');
            setLastCompletedSale(data);
            setIsReceiptModalOpen(true);
        },
        onError: () => {
            toast.error('Failed to record sale');
        }
    });

    const categories = React.useMemo(() => {
        if (!Array.isArray(sarees)) return ['All'];
        const cats = Array.from(new Set(sarees.map(s => s.category).filter(Boolean)));
        return ['All', ...cats];
    }, [sarees]);

    // Per-category counts (pure UI)
    const categoryCounts = React.useMemo(() => {
        const counts: Record<string, number> = {};
        if (Array.isArray(sarees)) {
            sarees.filter(s => s.status === 'active').forEach(s => {
                counts[s.category] = (counts[s.category] || 0) + 1;
            });
        }
        return counts;
    }, [sarees]);

    const filteredGridSarees = React.useMemo(() => {
        if (!Array.isArray(sarees)) return [];
        return sarees.filter(s => {
            const matchesStatus = s.status === 'active';
            const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
            const matchesSearch = !sareeSearchTerm ||
                s.sareeName.toLowerCase().includes(sareeSearchTerm.toLowerCase()) ||
                s.id.toLowerCase().includes(sareeSearchTerm.toLowerCase()) ||
                s.barcode?.toLowerCase().includes(sareeSearchTerm.toLowerCase());
            return matchesStatus && matchesCategory && matchesSearch;
        });
    }, [sarees, selectedCategory, sareeSearchTerm]);

    // Reset highlighted index when search results change
    React.useEffect(() => {
        setHighlightedIndex(0);
    }, [filteredGridSarees.length]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (filteredGridSarees.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev + 1) % filteredGridSarees.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev - 1 + filteredGridSarees.length) % filteredGridSarees.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selectedSaree = filteredGridSarees[highlightedIndex];
            if (selectedSaree) {
                handleAddToCart(selectedSaree);
                setSareeSearchTerm('');
            }
        } else if (e.key === 'Escape') {
            setSareeSearchTerm('');
        }
    };

    const handleCustomerSearch = (mobileOverride?: string) => {
        const searchMobile = mobileOverride || customerMobile;
        if (!searchMobile) {
            if (!mobileOverride) toast.error('Please enter a mobile number');
            return;
        }

        const trimmedSearch = searchMobile.trim();
        const customer = customers?.find(c =>
            c.mobile?.toString().trim() === trimmedSearch
        );

        if (customer) {
            setCustomerName(customer.name);
            toast.success(`Welcome back, ${customer.name}!`);

            // Auto-fetch active store credits for this customer
            (async () => {
                try {
                    const credits = await creditService.getActiveCreditsForCustomer(customer.customerId);
                    if (credits && credits.length > 0) {
                        const activeCredit = credits[0];
                        setVoucherCodeInput(activeCredit.voucherCode);
                        setAppliedVoucher({
                            code: activeCredit.voucherCode,
                            amount: activeCredit.remainingAmount,
                            customerName: customer.name
                        });
                        toast.info(`Available Store Credit SBS-XXXXXX applied!`, {
                            description: `Found active voucher ${activeCredit.voucherCode} (₹${activeCredit.remainingAmount.toLocaleString()}) and applied it to the cart.`
                        });
                    } else {
                        // Clear voucher code if none exists or customer changed
                        setVoucherCodeInput('');
                        setAppliedVoucher(null);
                    }
                } catch (err) {
                    console.error('Failed to auto-fetch store credits:', err);
                }
            })();
        } else if (!mobileOverride) {
            toast.info('Customer not found. You can enter the name manually.');
            setVoucherCodeInput('');
            setAppliedVoucher(null);
        }
    };

    // Auto-search when 10 digits are entered
    React.useEffect(() => {
        if (customerMobile.length === 10) {
            handleCustomerSearch(customerMobile);
            customerNameInputRef.current?.focus();
        }
    }, [customerMobile, customers]);

    const handleRemoveFromCart = (index: number) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const subtotal = cart.reduce((sum, item) => sum + ((item.mrp || item.sellingPrice) * item.quantity), 0);
    const itemDiscountAmount = cart.reduce((sum, item) => sum + (Math.max(0, (item.mrp || item.sellingPrice) - item.sellingPrice) * item.quantity), 0);
    const cartItemTotal = subtotal - itemDiscountAmount;

    const manualDiscountNum = parseFloat(manualDiscountInput) || 0;
    const manualBillDiscountAmount = manualDiscountType === 'percentage'
        ? Math.round((cartItemTotal * Math.min(100, Math.max(0, manualDiscountNum))) / 100)
        : Math.min(cartItemTotal, Math.max(0, manualDiscountNum));

    const totalDiscountAmount = itemDiscountAmount + manualBillDiscountAmount;
    const overallDiscountPercentage = subtotal > 0 ? parseFloat(((totalDiscountAmount / subtotal) * 100).toFixed(2)) : 0;

    const cartTotal = Math.max(0, subtotal - totalDiscountAmount);
    const appliedVoucherAmount = appliedVoucher ? Math.min(appliedVoucher.amount, Math.max(0, cartTotal)) : 0;
    const netPayable = Math.max(0, cartTotal - appliedVoucherAmount);

    const handleSaveItemPrice = (index: number, newPrice: number) => {
        if (isNaN(newPrice) || newPrice < 0) return;
        const newCart = [...cart];
        const item = newCart[index];
        const mrp = item.mrp || newPrice;
        const discountAmount = Math.max(0, mrp - newPrice);
        const discountPercentage = mrp > 0 ? parseFloat(((discountAmount / mrp) * 100).toFixed(2)) : 0;
        newCart[index] = {
            ...item,
            sellingPrice: newPrice,
            discountAmount,
            discountPercentage
        };
        setCart(newCart);
        setEditingCartIndex(null);
        toast.success(`Updated unit price for ${item.sareeName}`);
    };

    const handleAddToCart = (saree: Saree) => {
        if (saree.stock <= 0) {
            toast.error(`Out of stock: ${saree.sareeName}`);
            return;
        }
        setCart(prevCart => {
            const existingItemIndex = prevCart.findIndex(item => item.sareeId === saree.id);
            if (existingItemIndex > -1) {
                const newCart = [...prevCart];
                // Check if adding exceeds available stock
                if (newCart[existingItemIndex].quantity >= saree.stock) {
                    toast.error(`Not enough stock. Only ${saree.stock} available.`);
                    return prevCart;
                }
                newCart[existingItemIndex] = {
                    ...newCart[existingItemIndex],
                    quantity: newCart[existingItemIndex].quantity + 1
                };
                return newCart;
            } else {
                return [...prevCart, {
                    sareeId: saree.id,
                    sareeName: saree.sareeName,
                    quantity: 1,
                    sellingPrice: saree.sellingPrice,
                    purchasePrice: saree.purchasePrice,
                    mrp: saree.mrp || saree.sellingPrice,
                    discountAmount: saree.discountAmount || 0,
                    discountPercentage: saree.discountPercentage || 0
                }];
            }
        });
        toast.success(`${saree.sareeName} added to cart`);
    };

    const [remoteConnected, setRemoteConnected] = React.useState(false);
    const [connectionStatus, setConnectionStatus] = React.useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

    const channelRef = React.useRef<any>(null);

    const sareesRef = React.useRef(sarees);
    React.useEffect(() => {
        sareesRef.current = sarees;
    }, [sarees]);

    const addToCartRef = React.useRef(handleAddToCart);
    React.useEffect(() => {
        addToCartRef.current = handleAddToCart;
    }, [handleAddToCart]);

    const initializeRealtime = React.useCallback(() => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        try {
            setConnectionStatus('connecting');
            const targetChannelName = `room:POS-${sessionId}`;
            console.log(`[POS Terminal] Connecting to Supabase Realtime channel: ${targetChannelName}`);

            const channel = supabase.channel(targetChannelName, {
                config: { broadcast: { self: false } }
            });
            channelRef.current = channel;

            channel
                .on('broadcast', { event: 'scan' }, (payload) => {
                    console.log('[POS Terminal] Realtime broadcast scan received:', payload);
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
                            addToCartRef.current(foundSaree);
                            toast.success(`Remote scanned: ${foundSaree.sareeName}`);
                        } else {
                            toast.error(`No active saree found for barcode: ${barcode}`);
                        }
                    }
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('[POS Terminal] Supabase channel subscribed live!');
                        setRemoteConnected(true);
                        setConnectionStatus('connected');
                    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                        console.warn('[POS Terminal] Supabase channel status:', status);
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

        // Reset cooldown after 2 seconds
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
            s.id.toLowerCase() === decodedText.toLowerCase() ||
            s.barcode?.toLowerCase() === decodedText.toLowerCase()
        );

        if (saree) {
            if (saree.status !== 'active') {
                toast.error(`Saree "${saree.sareeName}" is inactive and cannot be sold.`);
                return;
            }
            playBeep();
            handleAddToCart(saree);
            setIsScannerOpen(false);
        } else {
            toast.error(`No saree found with barcode: ${decodedText}`);
        }
    };

    // Legacy polling logic removed in favor of zero-cost WebRTC Peer-to-Peer

    const handleApplyVoucher = async () => {
        if (!voucherCodeInput.trim()) return;
        setIsCheckingVoucher(true);
        try {
            const credit = await creditService.lookupCredit(voucherCodeInput.trim());
            if (!credit) {
                toast.error('Voucher code not found');
                setAppliedVoucher(null);
            } else if (credit.status !== 'active') {
                toast.error(`Voucher has already been ${credit.status}`);
                setAppliedVoucher(null);
            } else if (new Date(credit.expiresAt || '') < new Date()) {
                toast.error('Voucher has expired');
                setAppliedVoucher(null);
            } else {
                setAppliedVoucher({
                    code: credit.voucherCode,
                    amount: credit.remainingAmount,
                    customerName: credit.customerName
                });
                toast.success(`Applied ₹${credit.remainingAmount} store credit!`);
            }
        } catch (error) {
            toast.error('Failed to validate voucher');
        } finally {
            setIsCheckingVoucher(false);
        }
    };

    const handleClearVoucher = () => {
        setAppliedVoucher(null);
        setVoucherCodeInput('');
    };

    const handleCreateSale = async () => {
        if (cart.length === 0) {
            toast.error('Cart is empty');
            return;
        }
        if (!selectedStaffId) {
            toast.error('Please assign a salesperson before checkout');
            return;
        }

        const staffMember = activeStaff.find(s => s.id === selectedStaffId);
        const commissionEarned = staffMember
            ? parseFloat(((cartTotal * staffMember.commission_rate) / 100).toFixed(2))
            : 0;

        const billDiscountPercent = cartItemTotal > 0
            ? parseFloat(((manualBillDiscountAmount / cartItemTotal) * 100).toFixed(2))
            : 0;

        createSaleMutation.mutate({
            items: cart.map(({ purchasePrice: _, ...item }) => item),
            customerName,
            customerMobile,
            salespersonId: selectedStaffId,
            commissionEarned,
            paymentMode,
            discountAmount: manualBillDiscountAmount,
            discountPercentage: billDiscountPercent,
            voucherCode: appliedVoucher?.code,
            voucherAmount: appliedVoucherAmount,
        });
    };

    const handleCheckoutClick = () => {
        if (cart.length === 0) {
            toast.error('Cart is empty');
            return;
        }
        if (paymentMode === 'upi') {
            const txnNote = `SBS-${sessionId}-${Date.now().toString().slice(-4)}`;
            setCurrentTxnNote(txnNote);
            // Pre-select first active UPI if none selected yet
            if (!selectedUpiId && activeUpiSettings.length > 0) {
                setSelectedUpiId(activeUpiSettings[0].upi_id);
            }
            setIsUPIModalOpen(true);
        } else {
            handleCreateSale();
        }
    };

    const currentUpi = activeUpiSettings.find(u => u.upi_id === selectedUpiId) || activeUpiSettings[0];
    const upiQrValue = currentUpi
        ? `upi://pay?pa=${currentUpi.upi_id}&pn=${encodeURIComponent(currentUpi.label)}&am=${netPayable}&tn=${currentTxnNote}&cu=INR`
        : '';

    if (remoteMode === 'scanner') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 space-y-6">
                <Card className="w-full max-w-sm border-gold/20 shadow-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-br from-maroon to-maroon-dark text-gold text-center py-8">
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
                                    Connected (P2P Live)
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
                            <Button variant="ghost" className="text-gray-400 text-xs mt-2" onClick={() => window.location.href = '/sales'}>
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
        <div className="h-[calc(100vh-56px)] lg:h-screen flex flex-col gap-2 overflow-hidden -m-4 lg:-m-8 p-3 lg:p-3.5 text-sm bg-cream/10">
            {/* Main Work Area: Catalogue + Cart */}
            <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
            {/* Left Panel: Inventory Catalog & Filters */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col min-w-0 bg-white rounded-xl border border-gold/20 overflow-hidden shadow-md"
            >
                {/* Catalog Header */}
                <div className="px-4 py-3 border-b border-gold/10 bg-gradient-to-r from-cream/50 to-transparent flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-br from-maroon to-maroon-dark text-gold rounded-lg shadow-sm">
                            <Package className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold font-serif text-maroon tracking-wide leading-none">Catalogue</h2>
                            <p className="text-[10px] text-gray-400 mt-0.5">{filteredGridSarees.length} items shown</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-medium text-maroon/70 bg-maroon/5 border border-maroon/10 rounded-full px-2.5 py-1">
                            <Zap className="h-3 w-3" /> Keyboard: ↑↓ Enter
                        </span>
                    </div>
                </div>

                {/* Search & Actions Bar */}
                <div className="p-3 border-b border-gray-100 flex flex-col sm:flex-row gap-2 items-center justify-between bg-white">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search by name, ID or scan barcode..."
                            className="pl-9 pr-4 border-gold/25 h-10 text-sm focus-visible:ring-maroon bg-white shadow-sm"
                            value={sareeSearchTerm}
                            onChange={(e) => setSareeSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                        {sareeSearchTerm && (
                            <button
                                type="button"
                                onClick={() => setSareeSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                            >
                                <Minus className="h-3.5 w-3.5 rotate-45" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-10 px-3 border-gold/30 text-maroon hover:bg-gold/10 gap-1.5 text-xs font-semibold w-full sm:w-auto shadow-sm"
                            onClick={() => setIsScannerOpen(true)}
                        >
                            <ScanLine className="h-4 w-4" />
                            Scan Barcode
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-10 px-3 text-maroon hover:bg-maroon/5 gap-1.5 border-gold/30 text-xs font-semibold w-full sm:w-auto shadow-sm"
                            onClick={() => setIsRemoteLinkOpen(true)}
                        >
                            <Smartphone className="h-4 w-4" />
                            Remote Scan
                        </Button>
                    </div>
                </div>

                {/* Category Selector Chips */}
                <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth bg-white">
                    {categories.map((cat) => {
                        const isActive = selectedCategory === cat;
                        const count = cat === 'All'
                            ? (Array.isArray(sarees) ? sarees.filter(s => s.status === 'active').length : 0)
                            : (categoryCounts[cat] || 0);
                        return (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={cn(
                                    "whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-xs rounded-full transition-all border",
                                    isActive
                                        ? "bg-gradient-to-r from-maroon to-maroon-dark text-gold border-maroon shadow-sm shadow-maroon/20"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-maroon/40 hover:text-maroon hover:bg-cream/20"
                                )}
                            >
                                {cat}
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono leading-none",
                                    isActive ? "bg-gold/25 text-gold" : "bg-gray-100 text-gray-400"
                                )}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Scrollable Catalog Grid */}
                <div className="flex-1 overflow-y-auto p-3 bg-cream/[0.04]">
                    {isLoadingSarees ? (
                        <div className="h-full flex flex-col items-center justify-center p-12 text-gray-400 space-y-3">
                            <Loader2 className="h-10 w-10 animate-spin text-maroon/40" />
                            <span className="text-sm font-medium text-gray-500">Loading catalogue...</span>
                        </div>
                    ) : filteredGridSarees.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                            {filteredGridSarees.map((saree, idx) => {
                                const isHighlighted = idx === highlightedIndex && sareeSearchTerm !== '';
                                return (
                                    <motion.button
                                        key={saree.id}
                                        type="button"
                                        disabled={saree.stock <= 0}
                                        onClick={() => handleAddToCart(saree)}
                                        initial={{ opacity: 0, scale: 0.97 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.15 }}
                                        className={cn(
                                            "text-left bg-white border rounded-xl p-3 flex flex-col justify-between shadow-sm hover:shadow-lg transition-all active:scale-[0.97] duration-100 relative overflow-hidden group cursor-pointer w-full text-xs h-[120px]",
                                            isHighlighted
                                                ? "border-maroon ring-2 ring-maroon/20 shadow-md"
                                                : "border-gray-100 hover:border-gold/40",
                                            saree.stock <= 0 && "opacity-50 cursor-not-allowed bg-gray-50 border-gray-100"
                                        )}
                                    >
                                        {/* Top accent line */}
                                        <div className={cn(
                                            "absolute top-0 left-0 right-0 h-0.5",
                                            saree.stock <= 0 ? "bg-gray-200" : saree.stock < 5 ? "bg-gradient-to-r from-red-400 to-amber-400" : "bg-gradient-to-r from-gold to-maroon/60"
                                        )} />

                                        {saree.stock <= 0 ? (
                                            <span className="absolute top-2 right-2 text-[8px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-bold z-10 uppercase tracking-wider">
                                                Sold Out
                                            </span>
                                        ) : saree.stock < 5 ? (
                                            <span className="absolute top-2 right-2 text-[8px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-bold animate-pulse z-10">
                                                {saree.stock} Left
                                            </span>
                                        ) : null}

                                        <div className="flex gap-2.5 items-start w-full flex-1">
                                            {saree.images && saree.images.length > 0 ? (
                                                <img
                                                    src={saree.images.find(img => img.isPrimary)?.imageUrl || saree.images[0].imageUrl}
                                                    alt={saree.sareeName}
                                                    className="w-11 h-11 object-cover rounded-lg border border-gold/15 flex-shrink-0 shadow-sm"
                                                />
                                            ) : (
                                                <div className="w-11 h-11 bg-cream/35 border border-gold/10 rounded-lg flex items-center justify-center text-[7px] text-gray-400 font-bold flex-shrink-0 uppercase">
                                                    No Img
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0 w-full">
                                                <div className="flex justify-between items-center w-full gap-1 mb-0.5">
                                                    <span className="text-[8px] text-gray-400 font-mono truncate">{saree.id}</span>
                                                    <span className="text-[8px] text-maroon/70 bg-cream/40 px-1.5 py-0.5 rounded-full truncate max-w-[55px] font-semibold" title={saree.category}>
                                                        {saree.category}
                                                    </span>
                                                </div>
                                                <div className="font-semibold text-gray-800 text-xs truncate group-hover:text-maroon transition-colors pr-1" title={saree.sareeName}>
                                                    {saree.sareeName}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-2 pt-2 border-t border-gray-50 flex justify-between items-center w-full flex-shrink-0">
                                            <div className="flex items-center gap-1 font-bold text-maroon text-xs">
                                                <IndianRupee className="h-3 w-3" />
                                                {saree.sellingPrice.toLocaleString()}
                                            </div>
                                            <div className="flex items-center gap-0.5 text-[9px] text-gray-400 font-medium">
                                                <Package className="h-2.5 w-2.5" /> Qty: {saree.stock}
                                            </div>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-12 text-gray-400 space-y-3">
                            <div className="p-4 bg-white border border-gray-100 rounded-full shadow-sm">
                                <Search className="h-6 w-6 text-gray-300" />
                            </div>
                            <span className="text-sm font-medium text-gray-500">No active sarees match your criteria</span>
                            <span className="text-xs text-gray-400">Try a different search or category</span>
                        </div>
                    )}

                </div>
            </motion.div>

            {/* Right Panel: POS Sidebar (Billing & Customer details) */}
            <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                className="w-full lg:w-[360px] xl:w-[410px] shrink-0 flex flex-col bg-white rounded-xl border border-gold/20 shadow-lg overflow-hidden h-full"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-maroon via-maroon-dark to-maroon-dark px-4 py-3.5 flex items-center justify-between text-gold border-b border-gold/20">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-gold/15 rounded-lg border border-gold/25">
                            <ShoppingCart className="h-4.5 w-4.5" />
                        </div>
                        <div>
                            <div className="font-bold text-xs uppercase tracking-wider leading-none">Checkout Terminal</div>
                            <div className="text-[9px] text-gold/60 font-mono mt-0.5">POS Billing & Payments</div>
                        </div>
                        {remoteConnected && (
                            <span className="flex items-center gap-1 bg-green-500/15 text-green-300 border border-green-500/30 px-2 py-0.5 rounded-full text-[9px] font-semibold leading-none animate-pulse ml-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-400"></span>
                                Live
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] font-mono bg-gold/15 text-gold-light px-2 py-1 rounded-md border border-gold/20">
                        ID: {sessionId}
                    </span>
                </div>

                {/* Customer Details Form */}
                <div className="px-3.5 pt-3 pb-2.5 border-b border-gray-100 bg-gradient-to-b from-cream/20 to-transparent shrink-0">
                    {/* Row 1: Mobile + Name */}
                    <div className="flex items-center gap-1.5 mb-2">
                        <div className="p-1 rounded-md bg-maroon/5 text-maroon">
                            <UserRound className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[10px] font-bold text-maroon uppercase tracking-wider">Customer</span>
                        <span className="text-[9px] text-gray-400 ml-auto">Auto-search on 10 digits</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="relative">
                            <Input
                                placeholder="Mobile Number"
                                className="h-9 text-xs border-gold/25 focus-visible:ring-maroon pr-8 placeholder:text-gray-400 bg-white shadow-sm"
                                value={customerMobile}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                    setCustomerMobile(val);
                                }}
                                maxLength={10}
                            />
                            {customerMobile.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => handleCustomerSearch()}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-maroon hover:text-maroon-dark font-bold"
                                >
                                    Find
                                </button>
                            )}
                        </div>
                        <Input
                            ref={customerNameInputRef}
                            placeholder="Customer Name"
                            className="h-9 text-xs border-gold/25 focus-visible:ring-maroon placeholder:text-gray-400 bg-white shadow-sm"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                        />
                    </div>

                    {/* Row 2: Salesperson */}
                    <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-maroon/5 text-maroon shrink-0">
                            <UserCheck className="h-3.5 w-3.5" />
                        </div>
                        <select
                            value={selectedStaffId}
                            onChange={(e) => setSelectedStaffId(e.target.value)}
                            className={cn(
                                "flex-1 h-9 text-xs border rounded-lg px-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-maroon/30 shadow-sm",
                                selectedStaffId ? "border-gold/25 text-gray-700" : "border-amber-300 text-amber-700"
                            )}
                        >
                            <option value="">— Assign Salesperson * —</option>
                            {activeStaff.map((staff) => (
                                <option key={staff.id} value={staff.id}>
                                    {staff.name} ({staff.commission_rate}%)
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Cart Items List */}
                <div className="flex-1 min-h-0 overflow-y-auto px-3.5 py-2.5 space-y-2 bg-gray-50/30">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold pb-2 border-b border-gray-200">
                        <span className="inline-flex items-center gap-1.5">
                            <ReceiptText className="h-3.5 w-3.5 text-maroon/60" />
                            Bill Items
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <span className="bg-maroon/10 text-maroon px-2 py-0.5 rounded-full font-bold font-mono">{cart.length}</span>
                            Amount
                        </span>
                    </div>

                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-gray-400 py-10 space-y-2">
                            <div className="p-4 bg-white border border-dashed border-gray-200 rounded-full">
                                <ShoppingCart className="h-8 w-8 text-gray-300 stroke-1" />
                            </div>
                            <span className="text-sm font-medium text-gray-500">Cart is empty</span>
                            <span className="text-[10px] text-center max-w-[200px] text-gray-400">
                                Scan a barcode or tap a product from the catalogue.
                            </span>
                        </div>
                    ) : (
                        cart.map((item, index) => (
                            <motion.div
                                key={item.sareeId}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.15 }}
                                className="flex flex-col gap-1.5 border border-gray-100 rounded-lg bg-white p-2 shadow-sm"
                            >
                                <div className="flex gap-2.5 items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-xs text-gray-800 truncate">{item.sareeName}</div>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-gray-400 mt-0.5">
                                            <span className="font-mono bg-gray-50 px-1 py-0.5 rounded">{item.sareeId}</span>
                                            {item.mrp > item.sellingPrice ? (
                                                <span className="text-red-500 font-semibold">
                                                    MRP <span className="line-through">₹{item.mrp}</span> (-₹{item.discountAmount} / {item.discountPercentage}%)
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">MRP ₹{item.mrp}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {/* Quantity Controls */}
                                        <div className="flex items-center gap-0.5 bg-gray-50 border border-gray-200 rounded-lg p-0.5">
                                            <button
                                                type="button"
                                                className="w-5 h-5 rounded-md hover:bg-white flex items-center justify-center text-gray-600 active:scale-90 transition-all"
                                                onClick={() => {
                                                    const newCart = [...cart];
                                                    if (newCart[index].quantity > 1) {
                                                        newCart[index].quantity -= 1;
                                                        setCart(newCart);
                                                    } else {
                                                        handleRemoveFromCart(index);
                                                    }
                                                }}
                                            >
                                                <Minus className="h-2.5 w-2.5" />
                                            </button>
                                            <span className="w-5 text-center text-xs font-bold text-gray-800">{item.quantity}</span>
                                            <button
                                                type="button"
                                                className="w-5 h-5 rounded-md hover:bg-white flex items-center justify-center text-gray-600 active:scale-90 transition-all"
                                                onClick={() => {
                                                    const limit = sarees?.find(s => s.id === item.sareeId)?.stock || 999;
                                                    const newCart = [...cart];
                                                    if (newCart[index].quantity >= limit) {
                                                        toast.error(`Stock limit reached (${limit} available)`);
                                                        return;
                                                    }
                                                    newCart[index].quantity += 1;
                                                    setCart(newCart);
                                                }}
                                            >
                                                <Plus className="h-2.5 w-2.5" />
                                            </button>
                                        </div>

                                        {/* Price & Edit button */}
                                        <div className="flex items-center gap-1">
                                            <span className="font-bold text-xs text-maroon w-16 text-right font-mono">₹{(item.sellingPrice * item.quantity).toLocaleString()}</span>
                                            <button
                                                type="button"
                                                title="Edit item selling price / discount"
                                                onClick={() => {
                                                    if (editingCartIndex === index) {
                                                        setEditingCartIndex(null);
                                                    } else {
                                                        setEditingCartIndex(index);
                                                        setEditingSellingPriceInput(item.sellingPrice.toString());
                                                    }
                                                }}
                                                className={cn(
                                                    "p-1 rounded-md transition-colors text-gray-400 hover:text-maroon hover:bg-gold/10",
                                                    editingCartIndex === index && "bg-maroon text-gold hover:bg-maroon"
                                                )}
                                            >
                                                <Edit2 className="h-3 w-3" />
                                            </button>
                                            <button
                                                type="button"
                                                className="text-gray-300 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded-md"
                                                onClick={() => handleRemoveFromCart(index)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Inline Item Price Edit Box */}
                                {editingCartIndex === index && (
                                    <div className="pt-1.5 mt-1 border-t border-dashed border-gray-200 flex items-center justify-between gap-2 bg-cream/20 p-1.5 rounded-md">
                                        <span className="text-[10px] font-bold text-gray-600 shrink-0">Unit Price:</span>
                                        <div className="flex items-center gap-1.5 flex-1">
                                            <div className="relative flex-1">
                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">₹</span>
                                                <input
                                                    type="number"
                                                    value={editingSellingPriceInput}
                                                    onChange={(e) => setEditingSellingPriceInput(e.target.value)}
                                                    className="w-full h-7 pl-5 pr-2 text-xs font-mono font-bold border border-gold/40 rounded bg-white focus:outline-none focus:ring-1 focus:ring-maroon"
                                                    placeholder="Price"
                                                    autoFocus
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleSaveItemPrice(index, parseFloat(editingSellingPriceInput))}
                                                className="px-2 py-1 bg-maroon text-gold text-[10px] font-bold rounded hover:bg-maroon-dark transition-colors"
                                            >
                                                Save
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditingCartIndex(null)}
                                                className="px-2 py-1 text-gray-400 hover:text-gray-600 text-[10px]"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )}
                </div>



                {/* Modals & Dialog Components */}
                <ReceiptModal
                    isOpen={isReceiptModalOpen}
                    onClose={() => setIsReceiptModalOpen(false)}
                    sale={lastCompletedSale}
                />
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

                <Dialog open={isUPIModalOpen} onOpenChange={setIsUPIModalOpen}>
                    <DialogContent className="sm:max-w-md border-gold/20 shadow-2xl p-4">
                        <DialogHeader className="border-b border-gold/15 pb-2 text-center">
                            <DialogTitle className="text-base font-bold font-serif text-maroon text-center">
                                UPI QR SCAN PAYMENT
                            </DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col items-center justify-center space-y-4 pt-4">

                            {/* UPI Account Selector */}
                            {activeUpiSettings.length > 1 && (
                                <div className="w-full space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                                        Select Merchant UPI Account
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {activeUpiSettings.map((upi) => (
                                            <button
                                                key={upi.upi_id}
                                                type="button"
                                                onClick={() => setSelectedUpiId(upi.upi_id)}
                                                className={cn(
                                                    'px-3 py-1.5 text-xs rounded-lg border font-medium transition-all',
                                                    (selectedUpiId || activeUpiSettings[0]?.upi_id) === upi.upi_id
                                                        ? 'bg-maroon text-gold border-maroon shadow-sm'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:border-maroon/40'
                                                )}
                                            >
                                                {upi.label}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                                        {currentUpi?.upi_id}
                                    </p>
                                </div>
                            )}

                            {activeUpiSettings.length === 0 ? (
                                <div className="text-center text-xs text-red-500 py-4">
                                    No active UPI IDs configured. Please add one in Settings.
                                </div>
                            ) : (
                                <div className="bg-white p-3 rounded-lg border border-gold/20 shadow-inner flex items-center justify-center">
                                    <QRCode
                                        value={upiQrValue}
                                        size={192}
                                        className="mx-auto"
                                    />
                                </div>
                            )}

                            <div className="text-center space-y-1">
                                <p className="text-sm font-bold text-gray-800">Amount: ₹{cartTotal.toLocaleString()}</p>
                                {activeUpiSettings.length === 1 && (
                                    <p className="text-[10px] text-gray-400 font-mono">{currentUpi?.upi_id}</p>
                                )}
                                <p className="text-xs font-mono text-gray-500">Ref: {currentTxnNote}</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 flex-col sm:flex-row">
                            <Button
                                variant="ghost"
                                className="h-9 text-xs border border-gray-200 hover:bg-gray-50"
                                onClick={() => setIsUPIModalOpen(false)}
                                disabled={createSaleMutation.isPending}
                            >
                                Cancel Payment
                            </Button>
                            <Button
                                className="bg-gradient-to-r from-maroon to-maroon-dark hover:from-maroon-dark hover:to-maroon-dark text-gold h-9 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                                onClick={async () => {
                                    await handleCreateSale();
                                    setIsUPIModalOpen(false);
                                }}
                                disabled={createSaleMutation.isPending}
                            >
                                {createSaleMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Confirming...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Payment & Print
                                    </>
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </motion.div>
            </div>

            {/* Floating Bottom Billing Bar — modern POS footer */}
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="shrink-0"
            >
                <div className="rounded-2xl border border-gold/30 bg-white shadow-[0_-8px_32px_-8px_rgba(128,0,32,0.22)] p-3 sm:px-5 sm:py-3.5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    
                    {/* Left: Payment mode + Voucher */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Payment Mode Selector */}
                        <div className="flex items-center gap-2 bg-stone-50 border border-stone-200/80 rounded-xl px-2.5 py-1.5">
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider shrink-0">Pay via</span>
                            <div className="flex items-center gap-1">
                                {(['cash', 'card', 'upi'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setPaymentMode(mode)}
                                        className={cn(
                                            "flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all capitalize select-none h-7",
                                            paymentMode === mode
                                                ? "border-maroon bg-gradient-to-r from-maroon to-maroon-dark text-gold shadow-sm shadow-maroon/20"
                                                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-100"
                                        )}
                                    >
                                        {mode === 'cash' && <Coins className="h-3 w-3" />}
                                        {mode === 'card' && <CreditCard className="h-3 w-3" />}
                                        {mode === 'upi' && <QrCode className="h-3 w-3" />}
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Store Credit Voucher Input / Applied Badge */}
                        <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200/80 rounded-xl p-1.5">
                            {appliedVoucher ? (
                                <div className="flex items-center justify-between gap-2 text-xs bg-amber-50 rounded-lg border border-amber-200 px-2.5 py-0.5 h-7">
                                    <div className="flex items-center gap-1 min-w-0">
                                        <BadgeCheck className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                                        <span className="font-bold text-amber-900 font-mono text-xs truncate max-w-[100px]">{appliedVoucher.code}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="font-bold text-amber-700 font-mono text-xs">-₹{appliedVoucherAmount.toLocaleString()}</span>
                                        <button
                                            type="button"
                                            onClick={handleClearVoucher}
                                            className="text-[10px] text-red-600 hover:text-red-800 font-bold uppercase ml-1"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1">
                                    <input
                                        type="text"
                                        placeholder="Voucher Code"
                                        value={voucherCodeInput}
                                        onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                                        className="w-32 text-xs border border-stone-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-maroon uppercase font-mono h-7 bg-white text-stone-800"
                                        onKeyDown={(e) => e.key === 'Enter' && handleApplyVoucher()}
                                    />
                                    <button
                                        type="button"
                                        disabled={isCheckingVoucher || !voucherCodeInput.trim()}
                                        onClick={handleApplyVoucher}
                                        className="bg-maroon hover:bg-maroon-dark text-gold disabled:opacity-50 text-[10px] font-bold px-2.5 rounded-lg transition-colors h-7 uppercase tracking-wider shrink-0"
                                    >
                                        {isCheckingVoucher ? '...' : 'APPLY'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Middle: Clear Price Breakup Display */}
                    <div className="flex items-center gap-3 flex-wrap text-xs bg-stone-50 border border-stone-200/80 rounded-xl px-3 py-1.5">
                        {/* Total MRP */}
                        <div className="flex flex-col justify-center">
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Total MRP</span>
                            <span className="font-mono font-semibold text-stone-700 text-xs">₹{subtotal.toLocaleString()}</span>
                        </div>

                        {/* Item Disc */}
                        <div className="flex flex-col justify-center border-l border-stone-200 pl-2.5">
                            <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">Item Disc</span>
                            <span className="font-mono font-bold text-emerald-700 text-xs">-₹{itemDiscountAmount.toLocaleString()}</span>
                        </div>

                        {/* Extra Manual Discount Control */}
                        <div className="flex flex-col justify-center border-l border-stone-200 pl-2.5">
                            <span className="text-[9px] font-bold text-maroon uppercase tracking-wider flex items-center gap-0.5">
                                <Edit2 className="h-2.5 w-2.5" /> Extra Disc
                            </span>
                            <div className="flex items-center gap-1 mt-0.5">
                                <input
                                    type="number"
                                    min="0"
                                    value={manualDiscountInput}
                                    onChange={(e) => setManualDiscountInput(e.target.value)}
                                    className="w-12 h-5 text-xs font-mono font-bold border border-amber-300 rounded bg-amber-50/80 text-center text-maroon focus:outline-none focus:ring-1 focus:ring-maroon"
                                />
                                <button
                                    type="button"
                                    onClick={() => setManualDiscountType(prev => prev === 'percentage' ? 'amount' : 'percentage')}
                                    className="text-[10px] font-bold bg-maroon text-gold hover:bg-maroon-dark px-1.5 h-5 rounded font-mono transition-colors flex items-center justify-center"
                                    title="Toggle % or ₹"
                                >
                                    {manualDiscountType === 'percentage' ? '%' : '₹'}
                                </button>
                            </div>
                        </div>

                        {/* Overall Savings Badge */}
                        {overallDiscountPercentage > 0 && (
                            <div className="flex flex-col justify-center border-l border-stone-200 pl-2.5">
                                <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">Total Savings</span>
                                <span className="inline-flex items-center gap-0.5 font-mono font-bold text-emerald-800 text-[11px] bg-emerald-100/90 border border-emerald-300 px-1.5 py-0.2 rounded-full mt-0.5">
                                    -₹{totalDiscountAmount.toLocaleString()} ({overallDiscountPercentage}%)
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Right: Net Payable & CTA */}
                    <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block leading-none mb-0.5">Net Payable</span>
                            <span className="font-mono font-black text-xl text-maroon leading-none block">₹{netPayable.toLocaleString()}</span>
                        </div>

                        <Button
                            type="button"
                            disabled={cart.length === 0 || !selectedStaffId || createSaleMutation.isPending}
                            onClick={handleCheckoutClick}
                            className={cn(
                                "h-10 sm:h-11 px-5 bg-gradient-to-r from-maroon via-maroon-dark to-maroon hover:from-maroon-dark hover:to-maroon text-gold font-bold text-xs uppercase tracking-wider gap-2 shadow-lg shadow-maroon/25 rounded-xl transition-all active:scale-[0.98] duration-100 shrink-0",
                                (cart.length === 0 || !selectedStaffId || createSaleMutation.isPending) && "opacity-60 shadow-none"
                            )}
                        >
                            {createSaleMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin text-gold" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4 text-gold" />
                                    <span>Finalize Bill &amp; Print</span>
                                </>
                            )}
                        </Button>
                    </div>

                </div>
            </motion.div>
        </div>
    );
}