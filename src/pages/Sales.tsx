import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { inventoryService, type Saree } from '@/services/inventoryService';
import { salesService } from '@/services/salesService';
import { customerService } from '@/services/customerService';
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
    QrCode
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { ReceiptModal } from '@/components/ReceiptModal';
import { BarcodeScanner } from '@/components/sales/BarcodeScanner';
import { RemoteScannerLink } from '@/components/sales/RemoteScannerLink';
import { syncService } from '@/services/syncService';
import { playBeep } from '@/lib/audio';
import type { Sale } from '@/services/salesService';

export default function SalesPage() {
    const [customerName, setCustomerName] = React.useState<string>('');
    const [customerMobile, setCustomerMobile] = React.useState<string>('');
    const [sareeSearchTerm, setSareeSearchTerm] = React.useState<string>('');
    const [selectedCategory, setSelectedCategory] = React.useState<string>('All');
    const [paymentMode, setPaymentMode] = React.useState<'cash' | 'card' | 'upi'>('cash');
    const [highlightedIndex, setHighlightedIndex] = React.useState<number>(0);
    const [cart, setCart] = React.useState<Array<{
        sareeId: string;
        sareeName: string;
        quantity: number;
        sellingPrice: number;
        purchasePrice: number;
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
        } else if (!mobileOverride) {
            toast.info('Customer not found. You can enter the name manually.');
        }
    };

    // Auto-search when 10 digits are entered
    React.useEffect(() => {
        if (customerMobile.length === 10) {
            handleCustomerSearch(customerMobile);
        }
    }, [customerMobile, customers]);

    const handleRemoveFromCart = (index: number) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
    const cartProfit = cart.reduce((sum, item) => sum + ((item.sellingPrice - item.purchasePrice) * item.quantity), 0);

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
                    purchasePrice: saree.purchasePrice
                }];
            }
        });
        toast.success(`${saree.sareeName} added to cart`);
    };

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
            syncService.pushScannedItem(sessionId, decodedText)
                .then(() => {
                    playBeep();
                    toast.success(`Scanned: ${decodedText}`);
                })
                .catch(() => toast.error("Failed to sync scan"));
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

    // Polling logic for Master (Laptop) mode
    React.useEffect(() => {
        if (remoteMode === 'scanner' || !sarees) return;

        const interval = setInterval(async () => {
            try {
                const items = await syncService.getScannedItems(sessionId);
                if (items && items.length > 0) {
                    items.forEach(item => {
                        const saree = sarees.find(s =>
                            s.id.toLowerCase() === item.barcode.toLowerCase() ||
                            s.barcode?.toLowerCase() === item.barcode.toLowerCase()
                        );
                        if (saree && saree.status === 'active') {
                            playBeep();
                            handleAddToCart(saree);
                        }
                    });
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [sessionId, remoteMode, sarees]);

    const handleCreateSale = async () => {
        if (cart.length === 0) {
            toast.error('Cart is empty');
            return;
        }

        createSaleMutation.mutate({
            items: cart.map(({ purchasePrice: _, ...item }) => item),
            customerName,
            customerMobile,
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
                    <CardContent className="p-6 space-y-6">
                        <p className="text-center text-gray-500 text-sm italic">
                            Your phone is now acting as a wireless scanner for your laptop.
                        </p>
                        <Button
                            className="w-full h-20 bg-gold hover:bg-gold-dark text-maroon font-bold text-xl gap-3 shadow-lg"
                            onClick={() => setIsScannerOpen(true)}
                        >
                            <Camera className="h-8 w-8" />
                            Open Camera
                        </Button>
                        <div className="pt-4 border-t border-gray-100 flex flex-col items-center gap-2">
                            <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                                Connected to Sync
                            </div>
                            <Button variant="ghost" className="text-gray-400 text-xs" onClick={() => window.location.href = '/sales'}>
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
        <div className="h-[calc(100vh-100px)] flex flex-col lg:flex-row gap-4 overflow-hidden -m-4 p-4 text-sm bg-cream/10">
            {/* Left Panel: Inventory Catalog & Filters */}
            <div className="flex-1 flex flex-col min-w-0 bg-white rounded-xl border border-gold/15 overflow-hidden shadow-sm">

                {/* Search & Actions Bar */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search sarees by name, ID, or scan barcode..."
                            className="pl-9 pr-4 border-gold/20 h-9 text-xs focus-visible:ring-maroon bg-white w-full"
                            value={sareeSearchTerm}
                            onChange={(e) => setSareeSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-9 px-3 border-gold/20 text-maroon hover:bg-cream/20 gap-1.5 text-xs w-full sm:w-auto"
                            onClick={() => setIsScannerOpen(true)}
                        >
                            <Camera className="h-4 w-4" />
                            Scan Barcode
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-3 text-maroon hover:bg-maroon/5 gap-1.5 border border-maroon/10 text-xs w-full sm:w-auto"
                            onClick={() => setIsRemoteLinkOpen(true)}
                        >
                            <Smartphone className="h-4 w-4" />
                            Remote Scan
                        </Button>
                    </div>
                </div>

                {/* Category Selector Chips */}
                <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth bg-white">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={cn(
                                "whitespace-nowrap px-3 py-1 font-medium text-xs rounded-full transition-all border",
                                selectedCategory === cat
                                    ? "bg-maroon text-gold border-maroon shadow-sm"
                                    : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-900"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Scrollable Catalog Grid */}
                <div className="flex-1 overflow-y-auto p-4 bg-cream/[0.04]">
                    {isLoadingSarees ? (
                        <div className="h-full flex flex-col items-center justify-center p-12 text-gray-400 space-y-2">
                            <Loader2 className="h-8 w-8 animate-spin text-maroon/50" />
                            <span className="text-xs">Loading items catalogue...</span>
                        </div>
                    ) : filteredGridSarees.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                            {filteredGridSarees.map((saree, idx) => {
                                const isHighlighted = idx === highlightedIndex && sareeSearchTerm !== '';
                                return (
                                    <button
                                        key={saree.id}
                                        type="button"
                                        disabled={saree.stock <= 0}
                                        onClick={() => handleAddToCart(saree)}
                                        className={cn(
                                            "text-left bg-white border rounded-xl p-3 flex flex-col justify-between shadow-sm hover:shadow-md transition-all active:scale-95 duration-100 relative overflow-hidden group cursor-pointer w-full text-xs h-[115px]",
                                            isHighlighted
                                                ? "border-maroon ring-2 ring-maroon/15 shadow-md"
                                                : "border-gray-100 hover:border-gold/30",
                                            saree.stock <= 0 && "opacity-50 cursor-not-allowed bg-gray-50 border-gray-100"
                                        )}
                                    >
                                        {saree.stock <= 0 ? (
                                            <span className="absolute top-1.5 right-1.5 text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-semibold">
                                                Sold Out
                                            </span>
                                        ) : saree.stock < 5 ? (
                                            <span className="absolute top-1.5 right-1.5 text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-semibold animate-pulse">
                                                {saree.stock} Left
                                            </span>
                                        ) : null}

                                        <div className="flex-1 min-w-0">
                                            <div className="text-[10px] text-gray-400 font-mono mb-0.5 truncate">{saree.id}</div>
                                            <div className="font-semibold text-gray-800 text-xs line-clamp-2 leading-tight group-hover:text-maroon transition-colors pr-8">
                                                {saree.sareeName}
                                            </div>
                                            <div className="text-[10px] text-gray-500 mt-1 bg-cream/35 px-1.5 py-0.5 rounded inline-block">
                                                {saree.category}
                                            </div>
                                        </div>

                                        <div className="mt-2 pt-2 border-t border-gray-50 flex justify-between items-center w-full">
                                            <div className="font-bold text-maroon text-[13px]">₹{saree.sellingPrice.toLocaleString()}</div>
                                            <div className="text-[9px] text-gray-400">Qty: {saree.stock}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-12 text-gray-400 space-y-2">
                            <span className="text-xl">🔍</span>
                            <span className="text-xs">No active sarees match your criteria</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel: POS Sidebar (Billing & Customer details) */}
            <div className="w-full lg:w-[410px] shrink-0 flex flex-col bg-white rounded-xl border border-gold/15 shadow-md overflow-hidden h-full">

                {/* Header */}
                <div className="bg-maroon px-4 py-3 flex items-center justify-between text-gold border-b border-gold/15">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4.5 w-4.5" />
                        <span className="font-bold text-xs uppercase tracking-wider">Checkout Terminal</span>
                    </div>
                    <span className="text-[10px] font-mono bg-gold/15 text-gold-light px-2 py-0.5 rounded">
                        ID: {sessionId}
                    </span>
                </div>

                {/* Customer Details Form */}
                <div className="p-3 border-b border-gray-100 bg-cream/15">
                    <div className="flex items-center gap-1.5 mb-2">
                        <User className="h-3.5 w-3.5 text-maroon/70" />
                        <label className="text-[11px] font-bold text-maroon uppercase tracking-wider">Customer Details</label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                            <Input
                                placeholder="Mobile Number"
                                className="h-8 text-xs border-gold/20 focus-visible:ring-maroon pr-8 placeholder:text-gray-400 bg-white"
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
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-maroon hover:text-maroon-dark font-bold"
                                >
                                    Find
                                </button>
                            )}
                        </div>
                        <Input
                            placeholder="Customer Name"
                            className="h-8 text-xs border-gold/20 focus-visible:ring-maroon placeholder:text-gray-400 bg-white"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                        />
                    </div>
                </div>

                {/* Cart Items List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/20">
                    <div className="flex items-center justify-between text-xs text-gray-500 font-medium pb-2 border-b border-gray-100">
                        <span>Items ({cart.length})</span>
                        <span>Amount</span>
                    </div>

                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 py-16 space-y-2">
                            <ShoppingCart className="h-10 w-10 text-gray-300 stroke-1" />
                            <span className="text-xs">No items in checkout cart</span>
                            <span className="text-[10px] text-gray-400 text-center max-w-[200px]">
                                Scan a barcode or select from the catalogue grid to start.
                            </span>
                        </div>
                    ) : (
                        cart.map((item, index) => (
                            <div key={item.sareeId} className="flex gap-2 items-start justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-xs text-gray-800 leading-snug truncate">{item.sareeName}</div>
                                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">{item.sareeId}</div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    {/* Small Quantity Controls */}
                                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md p-0.5 shadow-sm">
                                        <button
                                            type="button"
                                            className="w-5 h-5 rounded hover:bg-gray-100 flex items-center justify-center text-gray-600 active:scale-90 transition-all font-bold text-xs"
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
                                        <span className="w-5 text-center text-xs font-semibold text-gray-800">{item.quantity}</span>
                                        <button
                                            type="button"
                                            className="w-5 h-5 rounded hover:bg-gray-100 flex items-center justify-center text-gray-600 active:scale-90 transition-all font-bold text-xs"
                                            onClick={() => {
                                                // Find stock limit
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
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-xs text-maroon">₹{(item.sellingPrice * item.quantity).toLocaleString()}</span>
                                        <button
                                            type="button"
                                            className="text-gray-400 hover:text-red-600 p-0.5 transition-colors"
                                            onClick={() => handleRemoveFromCart(index)}
                                            title="Delete"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Bottom Billing Summary & Actions Panel */}
                <div className="border-t border-gray-100 p-4 bg-gray-50/50 space-y-4">
                    {/* Payment Mode Selection */}
                    <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Payment Method</span>
                        <div className="grid grid-cols-3 gap-2">
                            {(['cash', 'card', 'upi'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setPaymentMode(mode)}
                                    className={cn(
                                        "flex flex-col items-center justify-center py-2 px-1 rounded-lg border gap-1 transition-all capitalize select-none text-[11px] font-medium",
                                        paymentMode === mode
                                            ? "border-maroon bg-maroon/5 text-maroon font-semibold"
                                            : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                                    )}
                                >
                                    {mode === 'cash' && <Coins className="h-4 w-4" />}
                                    {mode === 'card' && <CreditCard className="h-4 w-4" />}
                                    {mode === 'upi' && <QrCode className="h-4 w-4" />}
                                    <span>{mode}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Summary lines */}
                    <div className="space-y-1.5 text-xs border-t border-gray-200/60 pt-3">
                        <div className="flex justify-between text-gray-500">
                            <span>Subtotal</span>
                            <span>₹{cartTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                            <span>GST (Included)</span>
                            <span>₹0</span>
                        </div>
                        <div className="flex justify-between text-maroon-light font-medium text-[11px]">
                            <span>Operator Profit Margin</span>
                            <span>₹{cartProfit.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold text-maroon pt-1.5 border-t border-gray-200/65">
                            <span>Net Payable Amount</span>
                            <span>₹{cartTotal.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Checkout Button */}
                    <Button
                        type="button"
                        disabled={cart.length === 0 || createSaleMutation.isPending}
                        onClick={handleCreateSale}
                        className={cn(
                            "w-full h-11 bg-maroon hover:bg-maroon-dark text-gold font-bold text-xs uppercase tracking-wider gap-2 shadow-md rounded-xl transition-all active:scale-95 duration-100",
                            (cart.length === 0 || createSaleMutation.isPending) && "opacity-60"
                        )}
                    >
                        {createSaleMutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin text-gold" />
                                Processing Transaction...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4 text-gold" />
                                Finalize Bill & Print
                            </>
                        )}
                    </Button>
                </div>
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
        </div>
    );
}
