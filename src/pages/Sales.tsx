import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { inventoryService, type Saree } from '@/services/inventoryService';
import { salesService } from '@/services/salesService';
import { customerService } from '@/services/customerService';
import { creditService } from '@/services/creditService';
import { loyaltyService } from '@/services/loyaltyService';
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
    Scissors,
    X,
    Check,
    Sparkles,
    Award,
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
import type { Sale, SaleItemAddon } from '@/services/salesService';
import { addonsService, type ProductAddon } from '@/services/addonsService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import QRCode from 'react-qr-code';
import { settingsService, type UpiSetting, type LoyaltySettings, DEFAULT_LOYALTY_SETTINGS } from '@/services/settingsService';
import { staffService, type Staff } from '@/services/staffService';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { calculateGst } from '@/config/gstConfig';

export const isSareeCodeMatch = (saree: { id: string; barcode?: string; sku?: string }, rawCode: string): boolean => {
    if (!rawCode || !saree) return false;
    const term = rawCode.trim().toLowerCase();
    if (!term) return false;

    const termWithoutS = term.startsWith('s') ? term.substring(1) : term;
    const termWithS = term.startsWith('s') ? term : 's' + term;

    const sId = (saree.id || '').trim().toLowerCase();
    const sIdWithoutS = sId.startsWith('s') ? sId.substring(1) : sId;

    const sBarcode = (saree.barcode || '').trim().toLowerCase();
    const sBarcodeWithoutS = sBarcode.startsWith('s') ? sBarcode.substring(1) : sBarcode;

    const sSku = (saree.sku || '').trim().toLowerCase();

    return (
        sBarcode === term ||
        sBarcode === termWithS ||
        sBarcode === termWithoutS ||
        (sBarcodeWithoutS.length >= 3 && sBarcodeWithoutS === termWithoutS) ||
        sId === term ||
        sId === termWithS ||
        sId === termWithoutS ||
        (sIdWithoutS.length >= 3 && sIdWithoutS === termWithoutS) ||
        sSku === term ||
        (sSku.replace(/[-\s_]/g, '') === term.replace(/[-\s_]/g, ''))
    );
};

interface SareeGridCardProps {
    saree: Saree;
    isHighlighted: boolean;
    onAddToCart: (saree: Saree) => void;
}

const SareeGridCard = React.memo(function SareeGridCard({
    saree,
    isHighlighted,
    onAddToCart,
}: SareeGridCardProps) {
    const isOutOfStock = saree.stock <= 0;
    const isLowStock = saree.stock > 0 && saree.stock < 5;
    const primaryImg = saree.images && saree.images.length > 0
        ? (saree.images.find(img => img.isPrimary)?.imageUrl || saree.images[0].imageUrl)
        : null;

    return (
        <button
            type="button"
            disabled={isOutOfStock}
            onClick={() => onAddToCart(saree)}
            className={cn(
                "text-left bg-white border rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all active:scale-[0.98] duration-75 relative overflow-hidden group cursor-pointer w-full text-xs h-[120px]",
                isHighlighted
                    ? "border-maroon ring-2 ring-maroon/20 shadow-md"
                    : "border-gray-100 hover:border-gold/40",
                isOutOfStock && "opacity-50 cursor-not-allowed bg-gray-50 border-gray-100"
            )}
        >
            {/* Top accent line */}
            <div className={cn(
                "absolute top-0 left-0 right-0 h-0.5",
                isOutOfStock ? "bg-gray-200" : isLowStock ? "bg-gradient-to-r from-red-400 to-amber-400" : "bg-gradient-to-r from-gold to-maroon/60"
            )} />

            {isOutOfStock ? (
                <span className="absolute top-2 right-2 text-[8px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-bold z-10 uppercase tracking-wider">
                    Sold Out
                </span>
            ) : isLowStock ? (
                <span className="absolute top-2 right-2 text-[8px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-bold animate-pulse z-10">
                    {saree.stock} Left
                </span>
            ) : null}

            <div className="flex gap-2.5 items-start w-full flex-1">
                {primaryImg ? (
                    <img
                        src={primaryImg}
                        alt={saree.sareeName}
                        loading="lazy"
                        decoding="async"
                        className="w-11 h-11 object-cover rounded-lg border border-gold/15 shrink-0 shadow-2xs"
                    />
                ) : (
                    <div className="w-11 h-11 bg-cream/35 border border-gold/10 rounded-lg flex items-center justify-center text-[7px] text-gray-400 font-bold shrink-0 uppercase">
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

            <div className="mt-2 pt-2 border-t border-gray-50 flex justify-between items-center w-full shrink-0">
                <div className="flex items-center gap-1 font-bold text-maroon text-xs">
                    <IndianRupee className="h-3 w-3" />
                    {saree.sellingPrice.toLocaleString()}
                </div>
                <div className="flex items-center gap-0.5 text-[9px] text-gray-400 font-medium">
                    <Package className="h-2.5 w-2.5" /> Qty: {saree.stock}
                </div>
            </div>
        </button>
    );
});

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
    const [loyaltyRedeemedPoints, setLoyaltyRedeemedPoints] = React.useState<number>(0);
    const [isLoyaltyEnrollModalOpen, setIsLoyaltyEnrollModalOpen] = React.useState<boolean>(false);
    const [generatedPinForDisplay, setGeneratedPinForDisplay] = React.useState<string | null>(null);
    const [isEnrollingLoyalty, setIsEnrollingLoyalty] = React.useState<boolean>(false);
    const [enrollCustomPin, setEnrollCustomPin] = React.useState<string>('');
    const [highlightedIndex, setHighlightedIndex] = React.useState<number>(0);
    const [manualDiscountType, setManualDiscountType] = React.useState<'amount' | 'percentage'>('percentage');
    const [manualDiscountInput, setManualDiscountInput] = React.useState<string>('0');
    const [isGstApplied, setIsGstApplied] = React.useState<boolean>(false);
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
        addons?: SaleItemAddon[];
    }>>([]);
    const [addonModalItemIndex, setAddonModalItemIndex] = React.useState<number | null>(null);
    const [customAddonSizes, setCustomAddonSizes] = React.useState<Record<string, string>>({});
    const [customAddonPrices, setCustomAddonPrices] = React.useState<Record<string, number>>({});
    const [lastCompletedSale, setLastCompletedSale] = React.useState<Sale | null>(null);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = React.useState(false);
    const [isScannerOpen, setIsScannerOpen] = React.useState(false);
    const [lastScannedBarcode, setLastScannedBarcode] = React.useState<string | null>(null);
    const [isProcessingScan, setIsProcessingScan] = React.useState(false);
    const [isRemoteLinkOpen, setIsRemoteLinkOpen] = React.useState(false);
    const [isCustomerDetailsOpen, setIsCustomerDetailsOpen] = React.useState(false);
    const [isBreakdownOpen, setIsBreakdownOpen] = React.useState(false);
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const scannerBufferRef = React.useRef<{ text: string; lastTime: number }>({ text: '', lastTime: 0 });
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

    const { data: loyaltySettings = DEFAULT_LOYALTY_SETTINGS } = useQuery<LoyaltySettings>({
        queryKey: ['loyaltySettings'],
        queryFn: settingsService.getLoyaltySettings,
        staleTime: 30_000,
    });

    const { data: availableAddons = [], isLoading: isLoadingAddons } = useQuery<ProductAddon[]>({
        queryKey: ['productAddons'],
        queryFn: addonsService.getAddons,
        staleTime: 60_000,
    });

    const activeAddons = React.useMemo(
        () => availableAddons.filter(a => a.is_active),
        [availableAddons]
    );

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
            setIsGstApplied(false);
            setLoyaltyRedeemedPoints(0);
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
        const cleanTerm = sareeSearchTerm.trim().toLowerCase();
        return sarees.filter(s => {
            const matchesStatus = !s.status || s.status === 'active';
            const matchesSearch = !cleanTerm ||
                s.sareeName.toLowerCase().includes(cleanTerm) ||
                s.id.toLowerCase().includes(cleanTerm) ||
                (s.sku && s.sku.toLowerCase().includes(cleanTerm)) ||
                (s.barcode && s.barcode.toLowerCase().includes(cleanTerm));

            // If user types or scans an exact or partial barcode/sku/id, match across all categories
            const isDirectCodeMatch = cleanTerm !== '' && isSareeCodeMatch(s, cleanTerm);

            const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory || isDirectCodeMatch;
            return matchesStatus && matchesCategory && matchesSearch;
        });
    }, [sarees, selectedCategory, sareeSearchTerm]);

    const [visibleCount, setVisibleCount] = React.useState<number>(60);

    React.useEffect(() => {
        setVisibleCount(60);
    }, [sareeSearchTerm, selectedCategory]);

    const displayedSarees = React.useMemo(() => {
        return filteredGridSarees.slice(0, visibleCount);
    }, [filteredGridSarees, visibleCount]);

    // Reset highlighted index when search results change
    React.useEffect(() => {
        setHighlightedIndex(0);
    }, [filteredGridSarees.length]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const rawTerm = (e.currentTarget.value || sareeSearchTerm || '').trim();
            if (!rawTerm) return;

            // 1. Direct EXACT match: search all active sarees regardless of category filter
            const exactMatch = sarees?.find(s =>
                (!s.status || s.status === 'active') && isSareeCodeMatch(s, rawTerm)
            );

            if (exactMatch) {
                playBeep();
                handleAddToCart(exactMatch);
                setSareeSearchTerm('');
                if (searchInputRef.current) {
                    searchInputRef.current.value = '';
                }
                scannerBufferRef.current = { text: '', lastTime: 0 };
                return;
            }

            // 2. Otherwise fall back to highlighted or first filtered result
            if (filteredGridSarees.length > 0) {
                const selectedSaree = filteredGridSarees[highlightedIndex] || filteredGridSarees[0];
                if (selectedSaree) {
                    playBeep();
                    handleAddToCart(selectedSaree);
                    setSareeSearchTerm('');
                    if (searchInputRef.current) {
                        searchInputRef.current.value = '';
                    }
                    scannerBufferRef.current = { text: '', lastTime: 0 };
                }
            } else {
                toast.error(`No active saree found matching: "${rawTerm}"`);
            }
            return;
        }

        if (filteredGridSarees.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev + 1) % filteredGridSarees.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev - 1 + filteredGridSarees.length) % filteredGridSarees.length);
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

    const getItemAddonsUnit = (item: (typeof cart)[0]) => (item.addons || []).reduce((sum, a) => sum + (Number(a.price) || 0), 0);
    const cartAddonsTotal = cart.reduce((sum, item) => sum + (getItemAddonsUnit(item) * item.quantity), 0);
    const sareesMrpSubtotal = cart.reduce((sum, item) => sum + ((item.mrp || item.sellingPrice) * item.quantity), 0);
    const subtotal = sareesMrpSubtotal + cartAddonsTotal;
    const itemDiscountAmount = cart.reduce((sum, item) => sum + (Math.max(0, (item.mrp || item.sellingPrice) - item.sellingPrice) * item.quantity), 0);
    const cartItemTotal = subtotal - itemDiscountAmount;

    const manualDiscountNum = parseFloat(manualDiscountInput) || 0;
    const manualBillDiscountAmount = manualDiscountType === 'percentage'
        ? Math.round((cartItemTotal * Math.min(100, Math.max(0, manualDiscountNum))) / 100)
        : Math.min(cartItemTotal, Math.max(0, manualDiscountNum));

    const totalDiscountAmount = itemDiscountAmount + manualBillDiscountAmount;
    const overallDiscountPercentage = subtotal > 0 ? parseFloat(((totalDiscountAmount / subtotal) * 100).toFixed(2)) : 0;

    const taxableAmount = Math.max(0, subtotal - totalDiscountAmount);
    const gstData = calculateGst(taxableAmount, isGstApplied);

    const cartTotal = gstData.grandTotal;
    const appliedVoucherAmount = appliedVoucher ? Math.min(appliedVoucher.amount, Math.max(0, cartTotal)) : 0;

    const currentCustomer = React.useMemo(() => {
        if (!customerMobile || customerMobile.trim().length < 10) return null;
        return customers?.find(c => c.mobile?.toString().trim() === customerMobile.trim()) || null;
    }, [customerMobile, customers]);

    // Configured Loyalty Rules & Thresholds from Admin Settings
    const isLoyaltyActive = loyaltySettings?.is_active ?? true;
    const pointValInInr = loyaltySettings?.point_value_in_inr ?? 1;
    const earnRatePct = (loyaltySettings?.earn_percentage ?? 1) / 100;
    const minPtsThreshold = loyaltySettings?.min_points_to_redeem ?? 100;
    const minBillThreshold = loyaltySettings?.min_bill_amount_for_redeem ?? 1000;
    const maxBillPctCap = (loyaltySettings?.max_redeem_percent_of_bill ?? 25) / 100;
    const maxPointsCeiling = (loyaltySettings?.max_points_per_order || 0) > 0 ? (loyaltySettings?.max_points_per_order || 0) : Infinity;

    const billAfterVoucher = Math.max(0, cartTotal - appliedVoucherAmount);
    const customerPoints = Number(currentCustomer?.loyaltyPointsBalance || 0);

    const hasMinPoints = customerPoints >= minPtsThreshold;
    const hasMinBill = billAfterVoucher >= minBillThreshold;

    let maxRedeemablePoints = 0;
    let loyaltyBlockReason = '';

    if (!isLoyaltyActive) {
        loyaltyBlockReason = 'Loyalty program paused';
    } else if (customerPoints <= 0) {
        loyaltyBlockReason = 'No points available';
    } else if (!hasMinPoints) {
        loyaltyBlockReason = `Min ${minPtsThreshold} pts required (Balance: ${customerPoints} pts)`;
    } else if (!hasMinBill) {
        loyaltyBlockReason = `Min bill ₹${minBillThreshold.toLocaleString('en-IN')} required to use points`;
    } else {
        // Calculate maximum points allowed by percentage cap on bill
        const maxDiscountAllowedInInr = billAfterVoucher * maxBillPctCap;
        const maxPointsByBillCap = Math.floor(maxDiscountAllowedInInr / pointValInInr);
        const allowedPoints = Math.min(customerPoints, maxPointsByBillCap, maxPointsCeiling);
        maxRedeemablePoints = Math.max(0, allowedPoints);
    }

    const pointsRedeemedCount = Math.min(loyaltyRedeemedPoints, maxRedeemablePoints);
    const effectiveLoyaltyDiscount = pointsRedeemedCount * pointValInInr;

    const netPayable = Math.max(0, billAfterVoucher - effectiveLoyaltyDiscount);
    const pointsToEarn = isLoyaltyActive ? Math.floor(netPayable * earnRatePct) : 0;

    const handleToggleAddon = (itemIndex: number, addon: ProductAddon) => {
        setCart(prev => {
            const next = [...prev];
            const currentItem = next[itemIndex];
            if (!currentItem) return prev;

            const existingAddons = currentItem.addons ? [...currentItem.addons] : [];
            const existingIdx = existingAddons.findIndex(a => a.id === addon.id || a.title.toLowerCase() === addon.title.toLowerCase());

            if (existingIdx > -1) {
                existingAddons.splice(existingIdx, 1);
                toast.info(`Removed ${addon.title}`);
            } else {
                const userPrice = customAddonPrices[addon.id] != null ? customAddonPrices[addon.id] : addon.price;
                const userSize = customAddonSizes[addon.id] || (addon.requires_size ? '38' : undefined);
                existingAddons.push({
                    id: addon.id,
                    title: addon.title,
                    price: userPrice,
                    size: userSize,
                });
                toast.success(`Added ${addon.title} (+₹${userPrice})`);
            }

            next[itemIndex] = {
                ...currentItem,
                addons: existingAddons,
            };
            return next;
        });
    };

    const handleUpdateAddonSize = (itemIndex: number, addonId: string, size: string) => {
        setCustomAddonSizes(prev => ({ ...prev, [addonId]: size }));
        setCart(prev => {
            const next = [...prev];
            const currentItem = next[itemIndex];
            if (!currentItem || !currentItem.addons) return prev;

            next[itemIndex] = {
                ...currentItem,
                addons: currentItem.addons.map(a => (a.id === addonId ? { ...a, size } : a)),
            };
            return next;
        });
    };

    const handleUpdateAddonPrice = (itemIndex: number, addonId: string, price: number) => {
        setCustomAddonPrices(prev => ({ ...prev, [addonId]: price }));
        if (isNaN(price) || price < 0) return;
        setCart(prev => {
            const next = [...prev];
            const currentItem = next[itemIndex];
            if (!currentItem || !currentItem.addons) return prev;

            next[itemIndex] = {
                ...currentItem,
                addons: currentItem.addons.map(a => (a.id === addonId ? { ...a, price } : a)),
            };
            return next;
        });
    };

    const handleRemoveAddonFromCartItem = (itemIndex: number, addonIdx: number) => {
        setCart(prev => {
            const next = [...prev];
            const currentItem = next[itemIndex];
            if (!currentItem || !currentItem.addons) return prev;

            const existingAddons = [...currentItem.addons];
            const removed = existingAddons.splice(addonIdx, 1);
            next[itemIndex] = {
                ...currentItem,
                addons: existingAddons,
            };
            if (removed[0]) {
                toast.info(`Removed ${removed[0].title}`);
            }
            return next;
        });
    };

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

    const handleAddToCart = React.useCallback((saree: Saree) => {
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
                    discountPercentage: saree.discountPercentage || 0,
                    addons: []
                }];
            }
        });
        toast.success(`${saree.sareeName} added to cart`);
    }, []);

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

    // Global Hardware Barcode Scanner Listener:
    // Seamlessly handles physical USB/Bluetooth scanners and keyboard entry,
    // ensuring barcode scans immediately find the saree and add to cart.
    React.useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            const activeEl = document.activeElement;
            const isOtherInputActive = activeEl && (
                (activeEl.tagName === 'INPUT' && activeEl !== searchInputRef.current) ||
                activeEl.tagName === 'TEXTAREA' ||
                (activeEl as HTMLElement).isContentEditable
            );

            const now = Date.now();
            const timeSinceLastKey = now - scannerBufferRef.current.lastTime;

            if (e.key === 'Enter') {
                const bufferText = scannerBufferRef.current.text.trim();
                const inputVal = (searchInputRef.current?.value || sareeSearchTerm || '').trim();
                const termToMatch = bufferText || inputVal;

                if (termToMatch.length >= 2) {
                    const matchedSaree = sareesRef.current?.find(s =>
                        (!s.status || s.status === 'active') && isSareeCodeMatch(s, termToMatch)
                    );

                    if (matchedSaree) {
                        e.preventDefault();
                        e.stopPropagation();
                        playBeep();
                        addToCartRef.current(matchedSaree);
                        setSareeSearchTerm('');
                        if (searchInputRef.current) {
                            searchInputRef.current.value = '';
                        }
                        scannerBufferRef.current = { text: '', lastTime: 0 };
                        return;
                    }
                }
                scannerBufferRef.current = { text: '', lastTime: 0 };
                return;
            }

            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                if (isOtherInputActive) {
                    if (timeSinceLastKey < 50) {
                        scannerBufferRef.current.text += e.key;
                    } else {
                        scannerBufferRef.current.text = e.key;
                    }
                } else {
                    if (activeEl !== searchInputRef.current) {
                        searchInputRef.current?.focus();
                    }
                    if (timeSinceLastKey > 150) {
                        scannerBufferRef.current.text = e.key;
                    } else {
                        scannerBufferRef.current.text += e.key;
                    }
                }
                scannerBufferRef.current.lastTime = now;
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown, true);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
    }, [sareeSearchTerm]);

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
                            (!s.status || s.status === 'active') && isSareeCodeMatch(s, barcode)
                        );

                        if (foundSaree) {
                            playBeep();
                            addToCartRef.current(foundSaree);
                            toast.success(`Remote scanned: ${foundSaree.sareeName} (${foundSaree.sku || foundSaree.id})`);
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
            (!s.status || s.status === 'active') && isSareeCodeMatch(s, decodedText)
        );

        if (saree) {
            playBeep();
            handleAddToCart(saree);
            setIsScannerOpen(false);
            toast.success(`Scanned: ${saree.sareeName} (${saree.sku || saree.id})`);
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

    const handleEnrollLoyalty = async () => {
        if (!currentCustomer) {
            toast.error('Please enter a valid customer first.');
            return;
        }
        setIsEnrollingLoyalty(true);
        try {
            const pinToUse = enrollCustomPin.trim() || loyaltyService.generateRandomPin();
            const memberCode = currentCustomer.loyaltyMemberCode || loyaltyService.generateMemberCode();
            const res = await loyaltyService.setCustomerPin(currentCustomer.customerId, pinToUse, memberCode);
            if (res.success) {
                setGeneratedPinForDisplay(pinToUse);
                queryClient.invalidateQueries({ queryKey: ['customers'] });
                toast.success('Customer rewards activated!');
            } else {
                toast.error(res.error || 'Failed to activate rewards');
            }
        } catch (err: any) {
            toast.error(err?.message || 'Error enrolling customer');
        } finally {
            setIsEnrollingLoyalty(false);
        }
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

        const staffMember = selectedStaffId === 'self' ? null : activeStaff.find(s => s.id === selectedStaffId);
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
            salespersonId: selectedStaffId === 'self' ? undefined : selectedStaffId,
            commissionEarned,
            paymentMode,
            discountAmount: manualBillDiscountAmount,
            discountPercentage: billDiscountPercent,
            voucherCode: appliedVoucher?.code,
            voucherAmount: appliedVoucherAmount,
            isGstApplied,
            loyaltyMemberCode: currentCustomer?.loyaltyMemberCode || undefined,
            loyaltyPointsRedeemed: pointsRedeemedCount,
            loyaltyPointsEarned: pointsToEarn,
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
        <div className="h-[calc(100vh-70px)] lg:h-screen flex flex-col gap-2 overflow-hidden -mx-4 -mb-6 mt-0 lg:-m-8 p-2.5 lg:p-3.5 text-sm bg-cream/10">
            {/* Main Work Area: Catalogue (Desktop only) + Checkout Terminal */}
            <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
            {/* Left Panel: Inventory Catalog & Filters (Desktop only) */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="hidden lg:flex flex-1 flex-col min-w-0 bg-white rounded-xl border border-gold/20 overflow-hidden shadow-md"
            >
                {/* Catalog Header */}
                <div className="px-4 py-3 border-b border-gold/10 bg-gradient-to-r from-cream/50 to-transparent flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-to-br from-maroon to-maroon-dark text-gold rounded-lg shadow-sm">
                            <Package className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold font-serif text-maroon tracking-wide leading-none">Catalogue</h2>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                                {filteredGridSarees.length > visibleCount 
                                    ? `${displayedSarees.length} of ${filteredGridSarees.length} items shown` 
                                    : `${filteredGridSarees.length} items shown`}
                            </p>
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
                            ref={searchInputRef}
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
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-10 px-3 border-gold/30 text-maroon hover:bg-gold/10 gap-1.5 text-xs font-semibold shadow-sm"
                            onClick={() => setIsScannerOpen(true)}
                        >
                            <ScanLine className="h-4 w-4" />
                            Scan Barcode
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-10 px-3 text-maroon hover:bg-maroon/5 gap-1.5 border-gold/30 text-xs font-semibold shadow-sm"
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
                    ) : displayedSarees.length > 0 ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                                {displayedSarees.map((saree, idx) => {
                                    const isHighlighted = idx === highlightedIndex && sareeSearchTerm !== '';
                                    return (
                                        <SareeGridCard
                                            key={saree.id}
                                            saree={saree}
                                            isHighlighted={isHighlighted}
                                            onAddToCart={handleAddToCart}
                                        />
                                    );
                                })}
                            </div>

                            {filteredGridSarees.length > visibleCount && (
                                <div className="text-center pt-2 pb-6">
                                    <button
                                        type="button"
                                        onClick={() => setVisibleCount(prev => prev + 60)}
                                        className="px-5 py-2 bg-white hover:bg-gold/15 border border-gold/35 rounded-xl text-xs font-bold text-maroon shadow-xs hover:shadow-md transition-all cursor-pointer"
                                    >
                                        Showing {displayedSarees.length} of {filteredGridSarees.length} items — Load More (+60)
                                    </button>
                                </div>
                            )}
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
                className="w-full lg:w-[380px] xl:w-[420px] shrink-0 flex flex-col bg-white rounded-xl border border-gold/20 shadow-lg overflow-hidden h-full"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-maroon via-maroon-dark to-maroon-dark px-3.5 py-2.5 flex items-center justify-between text-gold border-b border-gold/20 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="p-1 bg-gold/15 rounded-md border border-gold/25">
                            <ShoppingCart className="h-4 w-4 text-gold" />
                        </div>
                        <div>
                            <div className="font-bold text-xs uppercase tracking-wider leading-none">Checkout Terminal</div>
                            <div className="text-[9px] text-gold/60 font-mono mt-0.5">POS Billing & Payments</div>
                        </div>
                        {remoteConnected && (
                            <span className="flex items-center gap-1 bg-green-500/15 text-green-300 border border-green-500/30 px-1.5 py-0.5 rounded-full text-[9px] font-semibold leading-none animate-pulse ml-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-400"></span>
                                Live
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="sm:hidden h-7.5 px-2 text-gold border-gold/30 hover:bg-gold/20 gap-1 text-[11px] font-semibold bg-gold/10"
                            onClick={() => setIsScannerOpen(true)}
                            title="Scan Barcode"
                        >
                            <ScanLine className="h-3.5 w-3.5 shrink-0" />
                            <span>Scan<span className="hidden min-[400px]:inline"> Barcode</span></span>
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="sm:hidden h-7.5 px-2 text-gold border-gold/30 hover:bg-gold/20 gap-1 text-[11px] font-semibold bg-gold/10"
                            onClick={() => setIsRemoteLinkOpen(true)}
                            title="Remote Mobile Scanner"
                        >
                            <Smartphone className="h-3.5 w-3.5 shrink-0" />
                            <span>Remote<span className="hidden min-[400px]:inline"> Scan</span></span>
                        </Button>
                        {cart.length > 0 && (
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setAddonModalItemIndex(0)}
                                    className="text-[10px] text-gold/90 hover:text-white bg-gold/15 hover:bg-gold/25 border border-gold/30 px-2 py-0.5 rounded transition-colors font-medium flex items-center gap-1"
                                    title="Manage tailoring & add-on services"
                                >
                                    <Scissors className="h-3 w-3 text-gold" />
                                    <span>Add-ons</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCart([])}
                                    className="text-[10px] text-gold/80 hover:text-white bg-gold/10 hover:bg-gold/20 border border-gold/20 px-2 py-0.5 rounded transition-colors font-medium flex items-center gap-1"
                                    title="Clear all cart items"
                                >
                                    <Trash2 className="h-3 w-3" />
                                    Clear
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Customer & Staff Details Form (Compact & Collapsible on Mobile) */}
                <div className="border-b border-gray-100 bg-stone-50/50 shrink-0">
                    <button
                        type="button"
                        onClick={() => setIsCustomerDetailsOpen(prev => !prev)}
                        className="lg:hidden w-full px-3 py-1.5 flex items-center justify-between text-xs hover:bg-stone-100/70 transition-colors border-b border-stone-100"
                    >
                        <span className="flex items-center gap-1.5 text-gray-700 truncate">
                            <User className="h-3.5 w-3.5 text-maroon shrink-0" />
                            <span className="font-semibold text-gray-800 truncate">
                                {customerName || customerMobile ? `${customerName || 'Customer'} (${customerMobile || 'No mobile'})` : 'Walk-in Customer'}
                            </span>
                            <span className="text-[10px] text-gray-400">
                                • {activeStaff.find(s => s.id === selectedStaffId)?.name || 'Self (0%)'}
                            </span>
                        </span>
                        <span className="text-[10px] text-maroon font-bold flex items-center gap-0.5 ml-2 shrink-0">
                            {isCustomerDetailsOpen ? 'Collapse ▴' : 'Edit Customer ▾'}
                        </span>
                    </button>
                    <div className={cn("px-3 py-2 space-y-1.5", !isCustomerDetailsOpen && "hidden lg:block")}>
                        <div className="grid grid-cols-2 gap-1.5">
                            <div className="relative">
                                <Input
                                    placeholder="Mobile (10 digits)"
                                    className="h-8 text-xs border-gold/25 focus-visible:ring-maroon pr-8 placeholder:text-gray-400 bg-white shadow-xs"
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
                                ref={customerNameInputRef}
                                placeholder="Customer Name"
                                className="h-8 text-xs border-gold/25 focus-visible:ring-maroon placeholder:text-gray-400 bg-white shadow-xs"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-1.5">
                            <select
                                value={selectedStaffId}
                                onChange={(e) => setSelectedStaffId(e.target.value)}
                                className={cn(
                                    "flex-1 h-8 text-xs border rounded-lg px-2 bg-white focus:outline-none focus:ring-1 focus:ring-maroon/30 shadow-xs",
                                    selectedStaffId ? "border-gold/25 text-gray-700 font-medium" : "border-amber-300 text-amber-700 font-bold"
                                )}
                            >
                                <option value="">— Assign Salesperson * —</option>
                                <option value="self">Self (0%)</option>
                                {activeStaff.map((staff) => (
                                    <option key={staff.id} value={staff.id}>
                                        {staff.name} ({staff.commission_rate}%)
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Customer Loyalty Status & Quick Enroll */}
                        {currentCustomer && (
                            <div className="flex items-center justify-between text-[11px] bg-amber-50/80 border border-amber-200/80 rounded-md px-2 py-1 shadow-2xs">
                                <div className="flex items-center gap-1.5 truncate">
                                    <Sparkles className="h-3 w-3 text-amber-600 shrink-0" />
                                    <span className="font-semibold text-amber-950 truncate">
                                        {currentCustomer.loyaltyMemberCode ? (
                                            <>
                                                <span className="font-mono text-[10px] text-amber-800 bg-amber-100/90 px-1 py-0.2 rounded mr-1">
                                                    {currentCustomer.loyaltyMemberCode}
                                                </span>
                                                {customerPoints} pts (₹{customerPoints})
                                            </>
                                        ) : (
                                            'Rewards Not Enrolled'
                                        )}
                                    </span>
                                </div>
                                <div>
                                    {!currentCustomer.loyaltyMemberCode || !currentCustomer.hasLoyaltyPin ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setGeneratedPinForDisplay(null);
                                                setEnrollCustomPin('');
                                                setIsLoyaltyEnrollModalOpen(true);
                                            }}
                                            className="text-[10px] font-bold text-maroon hover:text-maroon-dark bg-white hover:bg-gold/20 border border-gold/40 px-1.5 py-0.5 rounded shadow-2xs transition-colors shrink-0"
                                        >
                                            {!currentCustomer.loyaltyMemberCode ? '✨ Enroll' : 'Set PIN'}
                                        </button>
                                    ) : (
                                        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                                            Active ({currentCustomer.loyaltyTier || 'Silver'})
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* First-time Customer Auto-Enrollment Badge */}
                        {!currentCustomer && customerMobile.length === 10 && customerName.trim() && (
                            <div className="flex items-center justify-between text-[11px] bg-emerald-50/80 border border-emerald-200/80 rounded-md px-2 py-1 shadow-2xs">
                                <div className="flex items-center gap-1.5 truncate">
                                    <Sparkles className="h-3 w-3 text-emerald-600 shrink-0" />
                                    <span className="font-semibold text-emerald-950 truncate">
                                        New Customer: Auto-enrolling in Shree Rewards
                                    </span>
                                </div>
                                <span className="text-[10px] font-mono text-emerald-800 bg-white px-1.5 py-0.5 rounded border border-emerald-200 font-bold shrink-0">
                                    PIN: {customerMobile.slice(-6)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Cart Items List (FLEX-1, MAXIMUM SPACE) */}
                <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1.5 bg-gray-50/30">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold pb-1.5 border-b border-gray-200 sticky top-0 bg-gray-50/90 backdrop-blur-xs z-10">
                        <span className="inline-flex items-center gap-1.5">
                            <ReceiptText className="h-3.5 w-3.5 text-maroon/70" />
                            Cart Items
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <span className="bg-maroon/10 text-maroon px-2 py-0.5 rounded-full font-bold font-mono text-[10px]">{cart.length} items</span>
                        </span>
                    </div>

                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-gray-400 h-full py-12 space-y-2">
                            <div className="p-3.5 bg-white border border-dashed border-gray-200 rounded-full">
                                <ShoppingCart className="h-7 w-7 text-gray-300 stroke-1" />
                            </div>
                            <span className="text-xs font-medium text-gray-500">Cart is empty</span>
                            <span className="text-[10px] text-center max-w-[180px] text-gray-400">
                                Scan a barcode or tap a saree from catalogue.
                            </span>
                        </div>
                    ) : (
                        cart.map((item, index) => (
                            <motion.div
                                key={item.sareeId}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.12 }}
                                className="flex flex-col gap-1 border border-gray-100 rounded-lg bg-white p-2 shadow-xs hover:border-gold/30 transition-colors"
                            >
                                <div className="flex gap-2 items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-xs text-gray-800 truncate">{item.sareeName}</div>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-gray-400 mt-0.5">
                                            <span className="font-mono bg-gray-50 px-1 py-0.2 rounded border border-gray-100">{item.sareeId}</span>
                                            {item.mrp > item.sellingPrice ? (
                                                <span className="text-red-500 font-semibold">
                                                    MRP <span className="line-through">₹{item.mrp}</span> (-₹{item.discountAmount} / {item.discountPercentage}%)
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">MRP ₹{item.mrp}</span>
                                            )}
                                        </div>

                                        {/* Selected Add-ons / Tailoring Badges */}
                                        {item.addons && item.addons.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {item.addons.map((addon, aIdx) => (
                                                    <span
                                                        key={aIdx}
                                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200/90 text-[10px] text-amber-900 font-medium shadow-2xs"
                                                    >
                                                        <Scissors className="h-2.5 w-2.5 text-amber-700 shrink-0" />
                                                        <span className="font-semibold truncate max-w-[110px]">{addon.title}</span>
                                                        {addon.size && <span className="text-amber-700 font-mono text-[9px]">({addon.size})</span>}
                                                        <span className="font-bold text-amber-900 font-mono shrink-0">+₹{addon.price}</span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveAddonFromCartItem(index, aIdx);
                                                            }}
                                                            className="text-amber-500 hover:text-red-600 rounded p-0.2 ml-0.5 transition-colors"
                                                            title="Remove service"
                                                        >
                                                            <X className="h-2.5 w-2.5" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Add Tailoring / Add-on Options Button */}
                                        <div className="mt-1">
                                            <button
                                                type="button"
                                                onClick={() => setAddonModalItemIndex(index)}
                                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-maroon hover:text-maroon-dark bg-gold/10 hover:bg-gold/20 border border-gold/30 hover:border-gold/50 px-1.5 py-0.5 rounded transition-all"
                                                title="Add blouse stitching, fall/pico, or tailoring services"
                                            >
                                                <Scissors className="h-2.5 w-2.5 text-gold-dark shrink-0" />
                                                <span>{item.addons && item.addons.length > 0 ? '+ Add more services' : '+ Tailoring / Add-ons'}</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {/* Quantity Controls */}
                                        <div className="flex items-center gap-0.5 bg-stone-50 border border-stone-200 rounded-md p-0.5">
                                            <button
                                                type="button"
                                                className="w-4 h-4 rounded hover:bg-white flex items-center justify-center text-gray-600 active:scale-90 transition-all"
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
                                            <span className="w-4 text-center text-xs font-bold font-mono text-gray-800">{item.quantity}</span>
                                            <button
                                                type="button"
                                                className="w-4 h-4 rounded hover:bg-white flex items-center justify-center text-gray-600 active:scale-90 transition-all"
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

                                        {/* Price & Actions */}
                                        <div className="flex items-center gap-1">
                                            <span className="font-bold text-xs text-maroon w-16 text-right font-mono">
                                                ₹{((item.sellingPrice + getItemAddonsUnit(item)) * item.quantity).toLocaleString()}
                                            </span>
                                            <button
                                                type="button"
                                                title="Edit item price / discount"
                                                onClick={() => {
                                                    if (editingCartIndex === index) {
                                                        setEditingCartIndex(null);
                                                    } else {
                                                        setEditingCartIndex(index);
                                                        setEditingSellingPriceInput(item.sellingPrice.toString());
                                                    }
                                                }}
                                                className={cn(
                                                    "p-0.5 rounded transition-colors text-gray-400 hover:text-maroon hover:bg-gold/10",
                                                    editingCartIndex === index && "bg-maroon text-gold hover:bg-maroon"
                                                )}
                                            >
                                                <Edit2 className="h-3 w-3" />
                                            </button>
                                            <button
                                                type="button"
                                                className="text-gray-300 hover:text-red-500 transition-colors p-0.5 hover:bg-red-50 rounded"
                                                onClick={() => handleRemoveFromCart(index)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Inline Item Price Edit Box */}
                                {editingCartIndex === index && (
                                    <div className="pt-1 mt-1 border-t border-dashed border-gray-200 flex items-center justify-between gap-2 bg-cream/20 p-1 rounded">
                                        <span className="text-[10px] font-bold text-gray-600 shrink-0">Unit Price:</span>
                                        <div className="flex items-center gap-1 flex-1">
                                            <div className="relative flex-1">
                                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">₹</span>
                                                <input
                                                    type="number"
                                                    value={editingSellingPriceInput}
                                                    onChange={(e) => setEditingSellingPriceInput(e.target.value)}
                                                    className="w-full h-6 pl-4 pr-1 text-xs font-mono font-bold border border-gold/40 rounded bg-white focus:outline-none focus:ring-1 focus:ring-maroon"
                                                    placeholder="Price"
                                                    autoFocus
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleSaveItemPrice(index, parseFloat(editingSellingPriceInput))}
                                                className="px-2 py-0.5 bg-maroon text-gold text-[10px] font-bold rounded hover:bg-maroon-dark transition-colors"
                                            >
                                                Save
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditingCartIndex(null)}
                                                className="px-1.5 py-0.5 text-gray-400 hover:text-gray-600 text-[10px]"
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

                {/* Cart Financial Breakdown & Checkout Section (Fixed at Bottom) */}
                <div className="border-t border-stone-200 bg-stone-50/80 p-3 space-y-2 shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.05)]">
                    
                    {/* Controls Row: Payment Mode & GST Toggle */}
                    <div className="grid grid-cols-2 gap-2">
                        {/* Payment Mode Selector */}
                        <div className="flex items-center bg-white border border-stone-200 rounded-lg p-0.5 shadow-xs">
                            {(['cash', 'card', 'upi'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setPaymentMode(mode)}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-bold transition-all capitalize select-none h-6.5",
                                        paymentMode === mode
                                            ? "bg-maroon text-gold shadow-xs"
                                            : "text-stone-600 hover:bg-stone-100"
                                    )}
                                >
                                    {mode === 'cash' && <Coins className="h-2.5 w-2.5" />}
                                    {mode === 'card' && <CreditCard className="h-2.5 w-2.5" />}
                                    {mode === 'upi' && <QrCode className="h-2.5 w-2.5" />}
                                    {mode}
                                </button>
                            ))}
                        </div>

                        {/* GST Toggle Control */}
                        <div className="flex items-center justify-between bg-white border border-stone-200 rounded-lg px-2 py-0.5 shadow-xs">
                            <span className="text-[10px] font-bold text-stone-700">Apply GST</span>
                            <button
                                type="button"
                                onClick={() => setIsGstApplied(prev => !prev)}
                                className={cn(
                                    "flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold transition-all select-none h-5.5",
                                    isGstApplied
                                        ? "bg-emerald-600 text-white border-emerald-700"
                                        : "bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200"
                                )}
                            >
                                <span className={cn("w-1.5 h-1.5 rounded-full", isGstApplied ? "bg-white animate-pulse" : "bg-stone-400")} />
                                <span>{isGstApplied ? "5% [ ON ]" : "OFF"}</span>
                            </button>
                        </div>
                    </div>

                    {/* Mobile 1-Line Summary Bar & Toggle */}
                    <button
                        type="button"
                        onClick={() => setIsBreakdownOpen(prev => !prev)}
                        className="lg:hidden w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 flex items-center justify-between shadow-xs text-xs"
                    >
                        <div className="flex items-center gap-1.5 truncate">
                            <span className="font-bold text-stone-600 text-[11px]">Net Payable:</span>
                            <span className="font-mono font-black text-sm text-maroon">
                                ₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {totalDiscountAmount > 0 && (
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 shrink-0">
                                    Saved ₹{totalDiscountAmount}
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] text-maroon font-bold flex items-center gap-0.5 ml-2 shrink-0">
                            {isBreakdownOpen ? 'Hide breakdown ▴' : 'Discounts & Breakdown ▾'}
                        </span>
                    </button>

                    {/* Collapsible Details Container (Always visible on desktop, toggleable on mobile) */}
                    <div className={cn("space-y-2", !isBreakdownOpen && "hidden lg:block")}>
                        {/* Controls Row: Extra Discount & Store Voucher */}
                        <div className="grid grid-cols-2 gap-2">
                            {/* Extra Discount Input */}
                            <div className="flex items-center justify-between bg-white border border-stone-200 rounded-lg px-2 py-1 shadow-xs">
                                <span className="text-[10px] font-bold text-maroon shrink-0 flex items-center gap-0.5">
                                    <Edit2 className="h-2.5 w-2.5" /> Extra Disc
                                </span>
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        min="0"
                                        value={manualDiscountInput}
                                        onChange={(e) => setManualDiscountInput(e.target.value)}
                                        className="w-10 h-5 text-xs font-mono font-bold border border-amber-300 rounded bg-amber-50/80 text-center text-maroon focus:outline-none focus:ring-1 focus:ring-maroon"
                                        placeholder="0"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setManualDiscountType(prev => prev === 'percentage' ? 'amount' : 'percentage')}
                                        className="text-[9px] font-bold bg-maroon text-gold hover:bg-maroon-dark px-1.5 h-5 rounded font-mono transition-colors flex items-center justify-center"
                                        title="Toggle % or ₹"
                                    >
                                        {manualDiscountType === 'percentage' ? '%' : '₹'}
                                    </button>
                                </div>
                            </div>

                            {/* Store Voucher Input / Badge */}
                            <div className="flex items-center bg-white border border-stone-200 rounded-lg p-1 shadow-xs">
                                {appliedVoucher ? (
                                    <div className="flex items-center justify-between w-full text-[10px] bg-amber-50 rounded border border-amber-200 px-1.5 py-0.5 h-5.5">
                                        <span className="font-bold text-amber-900 font-mono truncate">{appliedVoucher.code} (-₹{appliedVoucherAmount})</span>
                                        <button
                                            type="button"
                                            onClick={handleClearVoucher}
                                            className="text-[9px] text-red-600 hover:text-red-800 font-bold uppercase ml-1 shrink-0"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 w-full">
                                        <input
                                            type="text"
                                            placeholder="Voucher Code"
                                            value={voucherCodeInput}
                                            onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                                            className="w-full text-[10px] border border-stone-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-maroon uppercase font-mono h-5.5 bg-white text-stone-800"
                                            onKeyDown={(e) => e.key === 'Enter' && handleApplyVoucher()}
                                        />
                                        <button
                                            type="button"
                                            disabled={isCheckingVoucher || !voucherCodeInput.trim()}
                                            onClick={handleApplyVoucher}
                                            className="bg-maroon hover:bg-maroon-dark text-gold disabled:opacity-50 text-[9px] font-bold px-2 rounded transition-colors h-5.5 uppercase shrink-0"
                                        >
                                            {isCheckingVoucher ? '...' : 'APPLY'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Loyalty Points Redemption Bar */}
                        {currentCustomer && (currentCustomer.loyaltyPointsBalance || 0) > 0 && isLoyaltyActive && (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-amber-50/90 border border-amber-300 rounded-lg px-2.5 py-1.5 shadow-xs gap-1.5">
                                <div className="flex items-center gap-1.5 text-xs text-amber-950">
                                    <Award className="h-4 w-4 text-amber-600 shrink-0" />
                                    <div>
                                        <span className="font-bold">Shree Rewards: </span>
                                        <span className="text-[11px] font-semibold text-amber-800">
                                            {customerPoints} pts (₹{(customerPoints * pointValInInr).toLocaleString('en-IN')})
                                        </span>
                                        {maxRedeemablePoints > 0 && (
                                            <span className="text-[10px] text-amber-700/80 hidden md:inline ml-1 font-medium">
                                                (Cap: {loyaltySettings?.max_redeem_percent_of_bill ?? 25}% of bill)
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 self-end sm:self-center">
                                    {loyaltyRedeemedPoints > 0 ? (
                                        <div className="flex items-center gap-1 bg-amber-200 text-amber-950 font-bold px-2 py-0.5 rounded text-xs">
                                            <span>-₹{effectiveLoyaltyDiscount} ({pointsRedeemedCount} pts)</span>
                                            <button
                                                type="button"
                                                onClick={() => setLoyaltyRedeemedPoints(0)}
                                                className="text-red-700 hover:text-red-900 font-bold ml-1 text-xs cursor-pointer"
                                                title="Remove loyalty discount"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : maxRedeemablePoints > 0 ? (
                                        <button
                                            type="button"
                                            onClick={() => setLoyaltyRedeemedPoints(maxRedeemablePoints)}
                                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 py-1 rounded text-[11px] transition-colors shadow-2xs cursor-pointer"
                                        >
                                            Redeem {maxRedeemablePoints} pts (-₹{maxRedeemablePoints * pointValInInr})
                                        </button>
                                    ) : (
                                        <span className="text-[10px] font-semibold text-amber-900 bg-amber-100/90 border border-amber-200 px-2 py-0.5 rounded">
                                            {loyaltyBlockReason}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Complete Price Breakup Summary */}
                        <div className="bg-white rounded-lg border border-stone-200/90 p-2.5 text-xs space-y-1 shadow-xs">
                            <div className="flex justify-between text-stone-600">
                                <span>Sarees Subtotal (MRP)</span>
                                <span className="font-mono font-medium">₹{sareesMrpSubtotal.toLocaleString('en-IN')}</span>
                            </div>
                            {cartAddonsTotal > 0 && (
                                <div className="flex justify-between text-amber-900 text-[11px] font-semibold">
                                    <span className="flex items-center gap-1">
                                        <Scissors className="h-3 w-3 text-amber-700 shrink-0" />
                                        <span>Tailoring &amp; Add-ons</span>
                                    </span>
                                    <span className="font-mono font-bold">+₹{cartAddonsTotal.toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            {itemDiscountAmount > 0 && (
                                <div className="flex justify-between text-emerald-700 text-[11px]">
                                    <span>Item Discount</span>
                                    <span className="font-mono font-medium">-₹{itemDiscountAmount.toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            {totalDiscountAmount > itemDiscountAmount && (
                                <div className="flex justify-between text-amber-700 text-[11px]">
                                    <span>Extra Discount</span>
                                    <span className="font-mono font-medium">-₹{(totalDiscountAmount - itemDiscountAmount).toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            {overallDiscountPercentage > 0 && (
                                <div className="flex justify-between text-emerald-800 text-[10px] font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    <span>Total Savings</span>
                                    <span className="font-mono">-₹{totalDiscountAmount.toLocaleString('en-IN')} ({overallDiscountPercentage}%)</span>
                                </div>
                            )}

                            {isGstApplied && (
                                <div className="pt-1 mt-1 border-t border-stone-100 space-y-0.5">
                                    <div className="flex justify-between text-stone-700 font-semibold text-[11px]">
                                        <span>Taxable Amount</span>
                                        <span className="font-mono">₹{gstData.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-stone-500 text-[10px] pl-1.5">
                                        <span>CGST (2.5%) + SGST (2.5%)</span>
                                        <span className="font-mono">₹{gstData.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            )}

                            {appliedVoucherAmount > 0 && (
                                <div className="flex justify-between text-amber-800 text-[11px] pt-1 border-t border-amber-100">
                                    <span>Voucher Redeem</span>
                                    <span className="font-mono">-₹{appliedVoucherAmount.toLocaleString('en-IN')}</span>
                                </div>
                            )}

                            {effectiveLoyaltyDiscount > 0 && (
                                <div className="flex justify-between text-amber-800 text-[11px] pt-1 border-t border-amber-100 font-semibold">
                                    <span className="flex items-center gap-1">
                                        <Award className="h-3 w-3 text-amber-600" />
                                        <span>Rewards Redeemed ({pointsRedeemedCount} pts)</span>
                                    </span>
                                    <span className="font-mono text-emerald-700">-₹{effectiveLoyaltyDiscount.toLocaleString('en-IN')}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-maroon font-bold text-base pt-1.5 border-t border-stone-200">
                                <span>Net Payable</span>
                                <span className="font-mono font-black text-lg text-maroon">
                                    ₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>

                            {pointsToEarn > 0 && (
                                <div className="text-[10px] text-amber-800 font-medium pt-1 flex items-center justify-between border-t border-stone-100">
                                    <span className="flex items-center gap-1">
                                        <Sparkles className="h-3 w-3 text-amber-600" />
                                        <span>Points earned today</span>
                                    </span>
                                    <span className="font-bold font-mono text-emerald-700">+{pointsToEarn} pts</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Primary Checkout Button */}
                    <Button
                        type="button"
                        disabled={cart.length === 0 || !selectedStaffId || createSaleMutation.isPending}
                        onClick={handleCheckoutClick}
                        className={cn(
                            "w-full h-11 bg-gradient-to-r from-maroon via-maroon-dark to-maroon hover:from-maroon-dark hover:to-maroon text-gold font-bold text-xs uppercase tracking-wider gap-2 shadow-md shadow-maroon/20 rounded-xl transition-all active:scale-[0.98] duration-100",
                            (cart.length === 0 || !selectedStaffId || createSaleMutation.isPending) && "opacity-60 shadow-none"
                        )}
                    >
                        {createSaleMutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin text-gold" />
                                Processing...
                            </>
                        ) : paymentMode === 'upi' ? (
                            <>
                                <QrCode className="h-4 w-4 text-gold" />
                                <span>Pay via UPI &amp; Generate QR</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4 text-gold" />
                                <span>Finalize Bill &amp; Print Receipt</span>
                            </>
                        )}
                    </Button>

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

                {/* Customer Loyalty Enrollment & PIN Dialog */}
                <Dialog open={isLoyaltyEnrollModalOpen} onOpenChange={setIsLoyaltyEnrollModalOpen}>
                    <DialogContent className="max-w-md bg-white border border-gold/30 shadow-2xl p-6 rounded-xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-maroon flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-gold" />
                                <span>Shree Rewards Activation</span>
                            </DialogTitle>
                        </DialogHeader>

                        {generatedPinForDisplay ? (
                            <div className="space-y-4 py-3">
                                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center space-y-2">
                                    <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                                        Rewards Account Activated Successfully!
                                    </div>
                                    <div className="text-3xl font-mono font-black text-maroon tracking-widest bg-white py-2 px-4 rounded border border-emerald-300 inline-block shadow-xs">
                                        {generatedPinForDisplay}
                                    </div>
                                    <p className="text-xs text-emerald-700">
                                        Share this 6-digit PIN with <strong>{customerName || 'the customer'}</strong>.
                                    </p>
                                </div>
                                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1">
                                    <p className="font-semibold">Important Security Notice:</p>
                                    <p>
                                        This PIN is encrypted immediately in the database and will <strong>never be shown again</strong>. Please communicate it to the customer now.
                                    </p>
                                </div>
                                <Button
                                    onClick={() => {
                                        setIsLoyaltyEnrollModalOpen(false);
                                        setGeneratedPinForDisplay(null);
                                        setEnrollCustomPin('');
                                    }}
                                    className="w-full bg-maroon hover:bg-maroon-dark text-gold font-bold"
                                >
                                    Done
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4 py-3">
                                <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs text-stone-700">
                                    <div><strong>Customer:</strong> {customerName || 'In-Store Customer'}</div>
                                    <div><strong>Mobile:</strong> {customerMobile}</div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-stone-800">
                                        Set 6-Digit PIN (Leave blank to auto-generate)
                                    </label>
                                    <Input
                                        type="text"
                                        placeholder="Auto-generate random 6 digits"
                                        value={enrollCustomPin}
                                        onChange={(e) => setEnrollCustomPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        maxLength={6}
                                        className="h-10 text-center font-mono tracking-widest text-lg font-bold border-gold/30 focus-visible:ring-maroon"
                                    />
                                    <p className="text-[11px] text-stone-500">
                                        Customer can pick 6 memorable digits (e.g. birth year + day).
                                    </p>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsLoyaltyEnrollModalOpen(false)}
                                        className="flex-1 border-stone-300"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        disabled={isEnrollingLoyalty}
                                        onClick={handleEnrollLoyalty}
                                        className="flex-1 bg-maroon hover:bg-maroon-dark text-gold font-bold"
                                    >
                                        {isEnrollingLoyalty ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                Activating...
                                            </>
                                        ) : (
                                            'Activate Rewards'
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Tailoring & Add-on Services Dialog */}
                <Dialog
                    open={addonModalItemIndex !== null}
                    onOpenChange={(open) => {
                        if (!open) setAddonModalItemIndex(null);
                    }}
                >
                    <DialogContent className="sm:max-w-lg border-gold/20 shadow-2xl p-4 bg-[#FAF7F0] max-h-[85vh] flex flex-col">
                        <DialogHeader className="border-b border-gold/15 pb-2.5 shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-maroon text-gold rounded-lg shadow-xs">
                                        <Scissors className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-sm font-serif font-bold text-maroon">
                                            Tailoring &amp; Add-on Services
                                        </DialogTitle>
                                        <p className="text-[11px] text-stone-600 mt-0.5">
                                            Add fall &amp; pico, blouse stitching, or custom tailoring
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-gold/15 text-maroon border border-gold/30">
                                    {activeAddons.length} Active Services
                                </span>
                            </div>

                            {/* Item Switcher if multiple sarees in cart */}
                            {cart.length > 1 && addonModalItemIndex !== null && (
                                <div className="mt-2.5 pt-2 border-t border-stone-200/60">
                                    <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1">
                                        Attach service to saree:
                                    </div>
                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                                        {cart.map((cartItm, cIdx) => (
                                            <button
                                                key={cIdx}
                                                type="button"
                                                onClick={() => setAddonModalItemIndex(cIdx)}
                                                className={cn(
                                                    "px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all border",
                                                    addonModalItemIndex === cIdx
                                                        ? "bg-maroon text-gold border-maroon shadow-xs"
                                                        : "bg-white text-stone-600 border-stone-200 hover:border-gold/60"
                                                )}
                                            >
                                                #{cIdx + 1} {cartItm.sareeName.slice(0, 16)}...
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {addonModalItemIndex !== null && cart[addonModalItemIndex] && (
                                <div className="mt-1.5 flex items-center justify-between bg-white/70 px-2.5 py-1.5 rounded-lg border border-stone-200/70 text-xs">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <span className="font-mono text-[10px] bg-stone-100 px-1 py-0.5 rounded border border-stone-200 text-stone-600">
                                            {cart[addonModalItemIndex].sareeId}
                                        </span>
                                        <span className="font-bold text-stone-800 truncate">
                                            {cart[addonModalItemIndex].sareeName}
                                        </span>
                                    </div>
                                    <span className="font-mono font-bold text-maroon text-[11px] shrink-0 ml-2">
                                        Base: ₹{cart[addonModalItemIndex].sellingPrice.toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </DialogHeader>

                        {/* Services List (Scrollable) */}
                        <div className="flex-1 overflow-y-auto py-2 space-y-2.5 pr-1">
                            {isLoadingAddons ? (
                                <div className="flex items-center justify-center py-8 text-stone-500 text-xs gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-maroon" />
                                    <span>Loading add-ons...</span>
                                </div>
                            ) : activeAddons.length === 0 ? (
                                <div className="text-center py-8 px-4 bg-white rounded-xl border border-dashed border-stone-200 space-y-2">
                                    <Scissors className="h-8 w-8 mx-auto text-stone-300" />
                                    <p className="text-xs font-semibold text-stone-700">No active add-on services found</p>
                                    <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
                                        You can configure Fall &amp; Pico, Blouse Stitching, and other services under Settings &gt; Tailoring &amp; Add-on Services.
                                    </p>
                                </div>
                            ) : addonModalItemIndex !== null && cart[addonModalItemIndex] ? (
                                activeAddons.map((addon) => {
                                    const currentCartItem = cart[addonModalItemIndex];
                                    const currentAddons = currentCartItem?.addons || [];
                                    const existing = currentAddons.find(a => a.id === addon.id || a.title.toLowerCase() === addon.title.toLowerCase());
                                    const isSelected = !!existing;
                                    const currentPrice = existing ? existing.price : (customAddonPrices[addon.id] ?? addon.price);
                                    const currentSize = existing?.size || customAddonSizes[addon.id] || (addon.requires_size ? '38' : undefined);

                                    return (
                                        <div
                                            key={addon.id}
                                            className={cn(
                                                "border rounded-xl p-3 transition-all",
                                                isSelected
                                                    ? "border-maroon/50 bg-amber-50/50 shadow-xs"
                                                    : "border-stone-200 bg-white hover:border-gold/40"
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2.5">
                                                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                                    <input
                                                        type="checkbox"
                                                        id={`addon-${addon.id}`}
                                                        checked={isSelected}
                                                        onChange={() => handleToggleAddon(addonModalItemIndex, addon)}
                                                        className="mt-0.5 h-4 w-4 rounded border-stone-300 text-maroon focus:ring-maroon cursor-pointer"
                                                    />
                                                    <label htmlFor={`addon-${addon.id}`} className="cursor-pointer flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-bold text-xs text-stone-900">{addon.title}</span>
                                                            {addon.requires_size && (
                                                                <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                                                    Size Required
                                                                </span>
                                                            )}
                                                        </div>
                                                        {addon.description && (
                                                            <p className="text-[11px] text-stone-500 mt-0.5 leading-relaxed">{addon.description}</p>
                                                        )}
                                                    </label>
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                    <span className="text-[11px] text-stone-400 font-bold">₹</span>
                                                    <input
                                                        type="number"
                                                        value={currentPrice}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            handleUpdateAddonPrice(addonModalItemIndex, addon.id, isNaN(val) ? 0 : val);
                                                        }}
                                                        className="w-18 h-7 text-xs font-mono font-bold px-1.5 text-right border border-stone-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-maroon"
                                                        placeholder={String(addon.price)}
                                                    />
                                                </div>
                                            </div>

                                            {/* Size Picker for Services Requiring Sizing */}
                                            {isSelected && addon.requires_size && (
                                                <div className="mt-2.5 pt-2 border-t border-amber-200/60 flex flex-wrap items-center gap-1.5 text-xs">
                                                    <span className="text-[10px] font-bold text-amber-900 shrink-0">Blouse Size:</span>
                                                    {['Free Size', '32', '34', '36', '38', '40', '42', '44', 'Custom'].map((sz) => (
                                                        <button
                                                            key={sz}
                                                            type="button"
                                                            onClick={() => handleUpdateAddonSize(addonModalItemIndex, addon.id, sz)}
                                                            className={cn(
                                                                "px-2 py-0.5 rounded text-[10px] font-semibold border transition-all",
                                                                currentSize === sz
                                                                    ? "bg-maroon text-gold border-maroon shadow-2xs"
                                                                    : "bg-white text-stone-600 border-stone-200 hover:border-maroon/30"
                                                            )}
                                                        >
                                                            {sz}
                                                        </button>
                                                    ))}
                                                    {currentSize === 'Custom' && (
                                                        <input
                                                            type="text"
                                                            placeholder="Custom (e.g. 36 Bust / 14 Length)"
                                                            defaultValue={existing?.size === 'Custom' ? '' : existing?.size}
                                                            onBlur={(e) => {
                                                                if (e.target.value.trim()) {
                                                                    handleUpdateAddonSize(addonModalItemIndex, addon.id, e.target.value.trim());
                                                                }
                                                            }}
                                                            className="h-6 text-[10px] px-2 border border-stone-200 rounded bg-white text-stone-800 flex-1 min-w-[130px] focus:outline-none focus:ring-1 focus:ring-maroon"
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : null}
                        </div>

                        {/* Modal Footer */}
                        {addonModalItemIndex !== null && cart[addonModalItemIndex] && (
                            <div className="flex items-center justify-between pt-2.5 border-t border-stone-200 shrink-0">
                                <div className="text-xs">
                                    <span className="text-stone-500">Selected for this saree: </span>
                                    <span className="font-bold text-maroon">
                                        {(cart[addonModalItemIndex].addons || []).length} services (+₹{(cart[addonModalItemIndex].addons || []).reduce((s, a) => s + (Number(a.price) || 0), 0).toLocaleString()})
                                    </span>
                                </div>
                                <Button
                                    className="bg-maroon hover:bg-maroon-dark text-gold font-bold text-xs h-8.5 px-4"
                                    onClick={() => setAddonModalItemIndex(null)}
                                >
                                    Done
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

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
        </div>
    );
}