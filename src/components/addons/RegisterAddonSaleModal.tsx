import React, { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ShoppingBag,
    Search,
    X,
    CheckCircle2,
    Loader2,
    AlertCircle,
    ArrowRight,
    IndianRupee,
    Minus,
    Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { type Addon } from '@/services/addonInventoryService';
import { addonSalesService, type CreateAddonSaleDTO } from '@/services/addonSalesService';

interface RegisterAddonSaleModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    addons: Addon[];
    defaultAddonId?: string | null;
}

export function RegisterAddonSaleModal({
    open,
    onOpenChange,
    addons,
    defaultAddonId,
}: RegisterAddonSaleModalProps) {
    const queryClient = useQueryClient();

    // Search & Selected Addon
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAddon, setSelectedAddon] = useState<Addon | null>(null);

    // Form fields
    const [quantity, setQuantity] = useState<number>(1);
    const [unitPrice, setUnitPrice] = useState<string>('');
    const [totalAmount, setTotalAmount] = useState<string>('');
    const [customerName, setCustomerName] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
    const [notes, setNotes] = useState<string>('');
    const [isCustomTotal, setIsCustomTotal] = useState<boolean>(false);

    // Filter available active addons
    const activeAddons = useMemo(() => {
        return addons.filter((a) => a.status === 'active');
    }, [addons]);

    const filteredAddons = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return activeAddons;
        return activeAddons.filter(
            (a) =>
                a.name.toLowerCase().includes(q) ||
                a.category.toLowerCase().includes(q)
        );
    }, [activeAddons, searchQuery]);

    // Handle pre-selecting an addon when modal opens
    useEffect(() => {
        if (open) {
            if (defaultAddonId) {
                const found = addons.find((a) => a.id === defaultAddonId);
                if (found) {
                    selectAddon(found);
                    return;
                }
            }
            // Reset state if not preselected
            if (!selectedAddon) {
                resetForm();
            }
        } else {
            resetForm();
        }
    }, [open, defaultAddonId, addons]);

    const resetForm = () => {
        setSearchQuery('');
        setSelectedAddon(null);
        setQuantity(1);
        setUnitPrice('');
        setTotalAmount('');
        setCustomerName('');
        setPaymentMethod('Cash');
        setNotes('');
        setIsCustomTotal(false);
    };

    const selectAddon = (addon: Addon) => {
        setSelectedAddon(addon);
        setSearchQuery('');
        const price = addon.selling_price || 0;
        setUnitPrice(String(price));
        setQuantity(1);
        setTotalAmount(String(price));
        setIsCustomTotal(false);
    };

    // Auto-update total amount when quantity or unit price changes (unless user manually entered custom total)
    const handleQuantityChange = (newQty: number) => {
        const safeQty = Math.max(1, newQty);
        setQuantity(safeQty);
        if (!isCustomTotal) {
            const price = Number(unitPrice) || 0;
            setTotalAmount(String(safeQty * price));
        }
    };

    const handleUnitPriceChange = (val: string) => {
        setUnitPrice(val);
        if (!isCustomTotal) {
            const price = Number(val) || 0;
            setTotalAmount(String(quantity * price));
        }
    };

    const handleTotalAmountChange = (val: string) => {
        setTotalAmount(val);
        setIsCustomTotal(true);
    };

    // Mutation
    const saleMutation = useMutation({
        mutationFn: (dto: CreateAddonSaleDTO) => addonSalesService.recordSale(dto),
        onSuccess: (savedSale) => {
            queryClient.invalidateQueries({ queryKey: ['addons'] });
            queryClient.invalidateQueries({ queryKey: ['addon_sales'] });
            toast.success(
                `Sale registered: ${savedSale.quantity} pcs of "${savedSale.addon_name}" (₹${savedSale.total_amount.toLocaleString('en-IN')})`
            );
            onOpenChange(false);
            resetForm();
        },
        onError: (err: any) => {
            console.error('Failed to register addon sale:', err);
            toast.error(err?.message || 'Failed to record addon sale');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedAddon) {
            toast.error('Please select an add-on item to sell');
            return;
        }

        if (selectedAddon.stock <= 0) {
            toast.error(`"${selectedAddon.name}" is currently out of stock`);
            return;
        }

        if (quantity <= 0) {
            toast.error('Quantity must be at least 1 piece');
            return;
        }

        if (quantity > selectedAddon.stock) {
            toast.error(
                `Cannot sell ${quantity} pieces. Only ${selectedAddon.stock} available in stock.`
            );
            return;
        }

        const parsedUnitPrice = Number(unitPrice);
        if (isNaN(parsedUnitPrice) || parsedUnitPrice < 0) {
            toast.error('Please enter a valid unit selling price');
            return;
        }

        const parsedTotal = Number(totalAmount);
        if (isNaN(parsedTotal) || parsedTotal < 0) {
            toast.error('Please enter a valid total amount');
            return;
        }

        const dto: CreateAddonSaleDTO = {
            addon_id: selectedAddon.id,
            addon_name: selectedAddon.name,
            category: selectedAddon.category,
            quantity,
            unit_price: parsedUnitPrice,
            total_amount: parsedTotal,
            customer_name: customerName.trim() || 'Walk-in Customer',
            payment_method: paymentMethod,
            notes: notes.trim(),
            current_stock: selectedAddon.stock,
        };

        saleMutation.mutate(dto);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg bg-white border-gold/30 shadow-2xl p-6 max-h-[92vh] overflow-y-auto">
                <DialogHeader className="border-b border-gold/15 pb-3">
                    <DialogTitle className="text-lg font-serif font-bold text-maroon flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                            <ShoppingBag className="w-4 h-4" />
                        </div>
                        REGISTER ADD-ON SALE
                    </DialogTitle>
                    <DialogDescription className="text-xs text-stone-500 mt-1">
                        Record sold pieces of add-ons/accessories. Stock will automatically be deducted.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    {/* Item Selection */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-maroon uppercase tracking-wider block">
                            Select Add-on Item <span className="text-rose-500">*</span>
                        </label>

                        {!selectedAddon ? (
                            <div className="space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                                    <Input
                                        placeholder="Type to search add-on (e.g. Blouse, Fall, Petticoat)..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 h-9 text-xs border-gold/30"
                                        autoFocus
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                <div className="max-h-44 overflow-y-auto border border-gold/20 rounded-lg divide-y divide-gold/10 bg-cream/10">
                                    {filteredAddons.length === 0 ? (
                                        <div className="p-3 text-center text-xs text-stone-500">
                                            No active add-ons found matching "{searchQuery}"
                                        </div>
                                    ) : (
                                        filteredAddons.map((addon) => {
                                            const isOutOfStock = addon.stock <= 0;
                                            return (
                                                <button
                                                    key={addon.id}
                                                    type="button"
                                                    disabled={isOutOfStock}
                                                    onClick={() => selectAddon(addon)}
                                                    className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors ${
                                                        isOutOfStock
                                                            ? 'opacity-50 cursor-not-allowed bg-stone-50'
                                                            : 'hover:bg-cream/50 cursor-pointer'
                                                    }`}
                                                >
                                                    <div className="min-w-0 pr-2">
                                                        <div className="text-xs font-bold text-stone-800 font-serif truncate">
                                                            {addon.name}
                                                        </div>
                                                        <div className="text-[10px] text-stone-500 flex items-center gap-1.5 mt-0.5">
                                                            <span>{addon.category}</span>
                                                            <span>&bull;</span>
                                                            <span className="font-mono font-medium text-emerald-700">
                                                                ₹{addon.selling_price}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] font-mono font-bold ${
                                                                isOutOfStock
                                                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                                    : addon.stock < 5
                                                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            }`}
                                                        >
                                                            {isOutOfStock
                                                                ? 'Out of Stock'
                                                                : `${addon.stock} in stock`}
                                                        </Badge>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Selected Item Card */
                            <div className="p-3 rounded-lg border border-gold/30 bg-cream/25 flex items-center justify-between">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-bold font-serif text-maroon truncate">
                                            {selectedAddon.name}
                                        </h4>
                                        <Badge
                                            variant="outline"
                                            className="text-[10px] bg-white border-gold/30 text-maroon"
                                        >
                                            {selectedAddon.category}
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-stone-600 mt-1 flex items-center gap-3">
                                        <span>
                                            Available Stock:{' '}
                                            <strong className="text-maroon font-mono">
                                                {selectedAddon.stock} units
                                            </strong>
                                        </span>
                                        <span>&bull;</span>
                                        <span>
                                            Default Price:{' '}
                                            <strong className="text-emerald-700 font-mono">
                                                ₹{selectedAddon.selling_price}
                                            </strong>
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedAddon(null)}
                                    className="text-xs text-stone-500 hover:text-maroon hover:bg-gold/10 h-7 px-2 shrink-0"
                                >
                                    Change
                                </Button>
                            </div>
                        )}
                    </div>

                    {selectedAddon && (
                        <>
                            {/* Quantity & Unit Price */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-maroon uppercase tracking-wider block">
                                        Pieces / Qty <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="flex items-center">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-9 w-9 p-0 rounded-r-none border-gold/30 text-stone-700 hover:bg-gold/10"
                                            onClick={() => handleQuantityChange(quantity - 1)}
                                            disabled={quantity <= 1}
                                        >
                                            <Minus className="w-3.5 h-3.5" />
                                        </Button>
                                        <Input
                                            type="number"
                                            min="1"
                                            max={selectedAddon.stock}
                                            value={quantity}
                                            onChange={(e) =>
                                                handleQuantityChange(
                                                    parseInt(e.target.value, 10) || 1
                                                )
                                            }
                                            className="h-9 text-xs text-center font-mono font-bold rounded-none border-x-0 border-gold/30"
                                            required
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-9 w-9 p-0 rounded-l-none border-gold/30 text-stone-700 hover:bg-gold/10"
                                            onClick={() => handleQuantityChange(quantity + 1)}
                                            disabled={quantity >= selectedAddon.stock}
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                    <div className="text-[10px] text-stone-400">
                                        Max available: {selectedAddon.stock} pcs
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-maroon uppercase tracking-wider block">
                                        Price Per Piece (₹) <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-mono">
                                            ₹
                                        </span>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={unitPrice}
                                            onChange={(e) => handleUnitPriceChange(e.target.value)}
                                            className="h-9 pl-7 text-xs font-mono font-medium border-gold/30"
                                            required
                                        />
                                    </div>
                                    <div className="text-[10px] text-stone-400">
                                        Catalog SP: ₹{selectedAddon.selling_price}
                                    </div>
                                </div>
                            </div>

                            {/* Total Amount & Payment Method */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-maroon uppercase tracking-wider block">
                                        Total Amount (₹) <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-600" />
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={totalAmount}
                                            onChange={(e) => handleTotalAmountChange(e.target.value)}
                                            className="h-9 pl-7 text-xs font-mono font-bold text-emerald-700 border-gold/30 bg-emerald-50/30"
                                            required
                                        />
                                    </div>
                                    {isCustomTotal && (
                                        <div className="text-[10px] text-amber-600 font-medium">
                                            Custom amount entered
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-maroon uppercase tracking-wider block">
                                        Payment Mode <span className="text-rose-500">*</span>
                                    </label>
                                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                        <SelectTrigger className="h-9 text-xs border-gold/30 bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="border-gold/20">
                                            <SelectItem value="Cash" className="text-xs">
                                                Cash
                                            </SelectItem>
                                            <SelectItem value="UPI" className="text-xs">
                                                UPI / QR
                                            </SelectItem>
                                            <SelectItem value="Card" className="text-xs">
                                                Debit / Credit Card
                                            </SelectItem>
                                            <SelectItem value="Other" className="text-xs">
                                                Other
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Customer Name & Notes */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-maroon uppercase tracking-wider block">
                                    Customer / Buyer Name
                                </label>
                                <Input
                                    placeholder="e.g. Walk-in Customer, Anita Ji, etc."
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="h-9 text-xs border-gold/30"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-stone-600 uppercase tracking-wider block">
                                    Sale Notes (Optional)
                                </label>
                                <Input
                                    placeholder="e.g. Sold with bridal saree order, stitched blouse, etc."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="h-8 text-xs border-gold/30"
                                />
                            </div>

                            {/* Stock Deduction Preview Alert */}
                            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center gap-2.5 text-xs text-amber-900">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                <div className="flex-1">
                                    <span>Stock deduction: </span>
                                    <span className="font-mono font-bold text-stone-800">
                                        {selectedAddon.stock}
                                    </span>{' '}
                                    <ArrowRight className="inline w-3 h-3 text-stone-500 mx-0.5" />{' '}
                                    <span className="font-mono font-bold text-emerald-700">
                                        {Math.max(0, selectedAddon.stock - quantity)} units
                                    </span>
                                </div>
                            </div>
                        </>
                    )}

                    <DialogFooter className="pt-3 border-t border-gold/15 flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            disabled={saleMutation.isPending}
                            className="h-8 text-xs border-gold/30 text-stone-700 hover:bg-cream/40"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={!selectedAddon || saleMutation.isPending}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-8 text-xs px-4 flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                        >
                            {saleMutation.isPending ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Recording Sale...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Submit Sale (₹{Number(totalAmount || 0).toLocaleString('en-IN')})
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
