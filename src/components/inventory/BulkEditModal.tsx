import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Edit3,
    Layers,
    Tag,
    IndianRupee,
    Percent,
    Sparkles,
    CheckCircle2,
    XCircle,
    Loader2,
    AlertCircle,
    ArrowRight,
    Search,
    ChevronDown,
    X
} from 'lucide-react';
import { inventoryService, categoryService, type Saree, type BulkUpdateItem, type Category } from '@/services/inventoryService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BulkEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedSarees: Saree[];
    onSuccess: () => void;
    availableFabrics?: string[];
}

export function calculateBulkUpdatedPrices(
    current: { mrp?: number; sellingPrice: number; discountPercentage?: number; discountAmount?: number },
    config: {
        updateMrp: boolean;
        mrpVal: number;
        updateDiscount: boolean;
        discountVal: number;
        updateSellingPrice: boolean;
        sellingPriceVal: number;
    }
): {
    mrp: number;
    discountPercentage: number;
    discountAmount: number;
    sellingPrice: number;
} | null {
    if (!config.updateMrp && !config.updateDiscount && !config.updateSellingPrice) {
        return null;
    }

    const currentMrp = Number(current.mrp) || Number(current.sellingPrice) || 0;
    const currentSellingPrice = Number(current.sellingPrice) || 0;
    const currentDiscountPct = Number(current.discountPercentage) || 0;

    // 1. Both MRP and Selling Price specified
    if (config.updateMrp && config.updateSellingPrice) {
        const mrp = Math.max(0, config.mrpVal);
        const sell = Math.max(0, config.sellingPriceVal);
        const discAmt = Math.max(0, Math.round((mrp - sell) * 100) / 100);
        const discPct = mrp > 0 ? Math.round(((discAmt / mrp) * 100) * 100) / 100 : 0;
        return {
            mrp,
            sellingPrice: sell,
            discountAmount: discAmt,
            discountPercentage: discPct
        };
    }

    // 2. Both MRP and Discount % specified
    if (config.updateMrp && config.updateDiscount) {
        const mrp = Math.max(0, config.mrpVal);
        const discPct = Math.max(0, Math.min(100, config.discountVal));
        const discAmt = Math.round((mrp * discPct / 100) * 100) / 100;
        const sell = Math.max(0, Math.round((mrp - discAmt) * 100) / 100);
        return {
            mrp,
            sellingPrice: sell,
            discountAmount: discAmt,
            discountPercentage: discPct
        };
    }

    // 3. Only Discount % specified
    if (config.updateDiscount && !config.updateMrp && !config.updateSellingPrice) {
        const baseMrp = currentMrp > 0 ? currentMrp : currentSellingPrice;
        const discPct = Math.max(0, Math.min(100, config.discountVal));
        const discAmt = Math.round((baseMrp * discPct / 100) * 100) / 100;
        const sell = Math.max(0, Math.round((baseMrp - discAmt) * 100) / 100);
        return {
            mrp: baseMrp,
            sellingPrice: sell,
            discountAmount: discAmt,
            discountPercentage: discPct
        };
    }

    // 4. Only Selling Price specified
    if (config.updateSellingPrice && !config.updateMrp && !config.updateDiscount) {
        const sell = Math.max(0, config.sellingPriceVal);
        let mrp = currentMrp;
        if (mrp < sell) {
            mrp = sell;
        }
        const discAmt = Math.max(0, Math.round((mrp - sell) * 100) / 100);
        const discPct = mrp > 0 ? Math.round(((discAmt / mrp) * 100) * 100) / 100 : 0;
        return {
            mrp,
            sellingPrice: sell,
            discountAmount: discAmt,
            discountPercentage: discPct
        };
    }

    // 5. Only MRP specified
    if (config.updateMrp && !config.updateDiscount && !config.updateSellingPrice) {
        const mrp = Math.max(0, config.mrpVal);
        if (currentDiscountPct > 0) {
            const discAmt = Math.round((mrp * currentDiscountPct / 100) * 100) / 100;
            const sell = Math.max(0, Math.round((mrp - discAmt) * 100) / 100);
            return {
                mrp,
                sellingPrice: sell,
                discountAmount: discAmt,
                discountPercentage: currentDiscountPct
            };
        } else {
            return {
                mrp,
                sellingPrice: mrp,
                discountAmount: 0,
                discountPercentage: 0
            };
        }
    }

    return null;
}

const COMMON_FABRICS = [
    'Pure Katan Silk',
    'Banarasi Silk',
    'Kanjeevaram Silk',
    'Tussar Silk',
    'Organza',
    'Chanderi',
    'Georgette',
    'Chiffon',
    'Linen',
    'Cotton Silk',
    'Tissue Silk',
    'Crepe Silk',
    'Raw Silk'
];

export function BulkEditModal({
    isOpen,
    onClose,
    selectedSarees,
    onSuccess,
    availableFabrics = []
}: BulkEditModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Attribute 1: Category
    const [enableCategory, setEnableCategory] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
    const [catSearch, setCatSearch] = useState('');

    // Attribute 2: Fabric
    const [enableFabric, setEnableFabric] = useState(false);
    const [fabricInput, setFabricInput] = useState('');

    // Attribute 3: Status
    const [enableStatus, setEnableStatus] = useState(false);
    const [statusInput, setStatusInput] = useState<'active' | 'inactive'>('active');

    // Attribute 4: Pricing
    const [enablePricing, setEnablePricing] = useState(false);
    const [updateDiscount, setUpdateDiscount] = useState(false);
    const [discountInput, setDiscountInput] = useState<string>('');
    const [updateMrp, setUpdateMrp] = useState(false);
    const [mrpInput, setMrpInput] = useState<string>('');
    const [updateSellingPrice, setUpdateSellingPrice] = useState(false);
    const [sellingPriceInput, setSellingPriceInput] = useState<string>('');

    // Categories query
    const { data: dbCategories } = useQuery({
        queryKey: ['categories'],
        queryFn: categoryService.getCategories,
        enabled: isOpen
    });

    const activeCategories = useMemo(() => {
        if (!Array.isArray(dbCategories)) return [];
        return dbCategories.filter(c => c.status === 'active');
    }, [dbCategories]);

    const filteredCategories = useMemo(() => {
        if (!catSearch.trim()) return activeCategories;
        const q = catSearch.toLowerCase();
        return activeCategories.filter(c => c.name.toLowerCase().includes(q));
    }, [activeCategories, catSearch]);

    // Unique fabric suggestions combining common ones and existing ones in the shop
    const fabricSuggestions = useMemo(() => {
        const set = new Set([...COMMON_FABRICS, ...availableFabrics]);
        return Array.from(set).filter(Boolean);
    }, [availableFabrics]);

    // Reset form when modal opens or closes
    useEffect(() => {
        if (isOpen) {
            setEnableCategory(false);
            setSelectedCategory('');
            setSelectedCategoryId('');
            setIsCatDropdownOpen(false);
            setCatSearch('');

            setEnableFabric(false);
            setFabricInput('');

            setEnableStatus(false);
            setStatusInput('active');

            setEnablePricing(false);
            setUpdateDiscount(false);
            setDiscountInput('');
            setUpdateMrp(false);
            setMrpInput('');
            setUpdateSellingPrice(false);
            setSellingPriceInput('');

            setIsSubmitting(false);
        }
    }, [isOpen]);

    // Number of active attribute changes
    const activeChangesCount = useMemo(() => {
        let count = 0;
        if (enableCategory) count++;
        if (enableFabric) count++;
        if (enableStatus) count++;
        if (enablePricing && (updateDiscount || updateMrp || updateSellingPrice)) count++;
        return count;
    }, [enableCategory, enableFabric, enableStatus, enablePricing, updateDiscount, updateMrp, updateSellingPrice]);

    // Live preview for up to 5 items
    const previewItems = useMemo(() => {
        if (!selectedSarees || selectedSarees.length === 0) return [];
        const sample = selectedSarees.slice(0, 5);

        return sample.map(saree => {
            let priceUpdate = null;
            if (enablePricing) {
                priceUpdate = calculateBulkUpdatedPrices(saree, {
                    updateMrp,
                    mrpVal: parseFloat(mrpInput) || 0,
                    updateDiscount,
                    discountVal: parseFloat(discountInput) || 0,
                    updateSellingPrice,
                    sellingPriceVal: parseFloat(sellingPriceInput) || 0
                });
            }

            return {
                saree,
                newCategory: enableCategory ? selectedCategory : null,
                newFabric: enableFabric ? fabricInput : null,
                newStatus: enableStatus ? statusInput : null,
                newPrices: priceUpdate
            };
        });
    }, [
        selectedSarees,
        enableCategory,
        selectedCategory,
        enableFabric,
        fabricInput,
        enableStatus,
        statusInput,
        enablePricing,
        updateMrp,
        mrpInput,
        updateDiscount,
        discountInput,
        updateSellingPrice,
        sellingPriceInput
    ]);

    // Live Pricing Mode Explanation Helper
    const pricingSummaryText = useMemo(() => {
        if (!enablePricing) return null;
        const hasMrp = updateMrp && mrpInput !== '';
        const hasDisc = updateDiscount && discountInput !== '';
        const hasSell = updateSellingPrice && sellingPriceInput !== '';

        if (hasMrp && hasDisc) {
            const m = parseFloat(mrpInput) || 0;
            const d = parseFloat(discountInput) || 0;
            const sell = Math.max(0, Math.round((m - (m * d / 100)) * 100) / 100);
            return `All items will be updated to MRP ₹${m.toLocaleString('en-IN')}, Discount ${d}%, and Selling Price ₹${sell.toLocaleString('en-IN')}.`;
        }
        if (hasMrp && hasSell) {
            const m = parseFloat(mrpInput) || 0;
            const s = parseFloat(sellingPriceInput) || 0;
            const discAmt = Math.max(0, m - s);
            const discPct = m > 0 ? Math.round(((discAmt / m) * 100) * 100) / 100 : 0;
            return `All items will be updated to MRP ₹${m.toLocaleString('en-IN')}, Selling Price ₹${s.toLocaleString('en-IN')} (Discount: ${discPct}%).`;
        }
        if (hasDisc && !hasMrp && !hasSell) {
            const d = parseFloat(discountInput) || 0;
            if (d === 0) {
                return `All discounts will be removed (0%). Selling price will be reset to match each item's MRP.`;
            }
            return `A ${d}% discount will be applied to each saree's existing MRP, automatically calculating its new selling price.`;
        }
        if (hasSell && !hasMrp && !hasDisc) {
            const s = parseFloat(sellingPriceInput) || 0;
            return `All sarees will be priced at flat ₹${s.toLocaleString('en-IN')}. Discount will be calculated against each saree's MRP.`;
        }
        if (hasMrp && !hasDisc && !hasSell) {
            const m = parseFloat(mrpInput) || 0;
            return `MRP will be set to ₹${m.toLocaleString('en-IN')}. Existing discount percentages will be recalculated on this new MRP.`;
        }
        return 'Select at least one price field (MRP, Discount %, or Selling Price) to configure pricing.';
    }, [enablePricing, updateMrp, mrpInput, updateDiscount, discountInput, updateSellingPrice, sellingPriceInput]);

    const handleSubmit = async () => {
        if (activeChangesCount === 0) {
            toast.error('Please enable at least one attribute to update.');
            return;
        }

        if (enableCategory && !selectedCategory) {
            toast.error('Please choose a category or uncheck the Category box.');
            return;
        }

        if (enableFabric && !fabricInput.trim()) {
            toast.error('Please enter a fabric name or uncheck the Fabric box.');
            return;
        }

        if (enablePricing) {
            if (!updateDiscount && !updateMrp && !updateSellingPrice) {
                toast.error('Please check at least one pricing option (MRP, Discount %, or Selling Price).');
                return;
            }
            if (updateDiscount) {
                const d = parseFloat(discountInput);
                if (isNaN(d) || d < 0 || d > 100) {
                    toast.error('Discount percentage must be between 0 and 100.');
                    return;
                }
            }
            if (updateMrp) {
                const m = parseFloat(mrpInput);
                if (isNaN(m) || m <= 0) {
                    toast.error('MRP must be a valid positive amount.');
                    return;
                }
            }
            if (updateSellingPrice) {
                const s = parseFloat(sellingPriceInput);
                if (isNaN(s) || s < 0) {
                    toast.error('Selling price must be a valid number >= 0.');
                    return;
                }
            }
        }

        try {
            setIsSubmitting(true);

            const itemsToUpdate: BulkUpdateItem[] = selectedSarees.map(saree => {
                const item: BulkUpdateItem = { id: saree.id };

                if (enableCategory) {
                    item.category = selectedCategory;
                    item.category_id = selectedCategoryId || null;
                }

                if (enableFabric) {
                    item.fabric = fabricInput.trim();
                }

                if (enableStatus) {
                    item.status = statusInput;
                }

                if (enablePricing) {
                    const priceUpdates = calculateBulkUpdatedPrices(saree, {
                        updateMrp,
                        mrpVal: parseFloat(mrpInput) || 0,
                        updateDiscount,
                        discountVal: parseFloat(discountInput) || 0,
                        updateSellingPrice,
                        sellingPriceVal: parseFloat(sellingPriceInput) || 0
                    });

                    if (priceUpdates) {
                        item.mrp = priceUpdates.mrp;
                        item.discount_percentage = priceUpdates.discountPercentage;
                        item.discount_amount = priceUpdates.discountAmount;
                        item.selling_price = priceUpdates.sellingPrice;
                    }
                }

                return item;
            });

            await inventoryService.bulkUpdateSarees(itemsToUpdate);

            toast.success(`Successfully updated ${selectedSarees.length} saree${selectedSarees.length > 1 ? 's' : ''}!`);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Bulk update sarees error:', err);
            toast.error(err?.message || 'Failed to apply bulk updates. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
            <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white shadow-2xl border border-gold/30">
                {/* Modal Header */}
                <DialogHeader className="px-6 py-4 border-b border-gold/20 bg-gradient-to-r from-maroon via-maroon-dark to-maroon text-white flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gold/20 text-gold rounded-lg border border-gold/40">
                                <Edit3 className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold font-serif text-cream flex items-center gap-2">
                                    Bulk Edit Sarees
                                    <Badge className="bg-gold text-maroon-dark font-mono font-bold text-xs hover:bg-gold px-2 py-0.5 ml-1">
                                        {selectedSarees.length} Selected
                                    </Badge>
                                </DialogTitle>
                                <p className="text-xs text-cream/70 font-sans mt-0.5">
                                    Select any attribute(s) to update across all chosen items. Unchecked fields remain untouched.
                                </p>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-gray-800 text-sm">
                    {/* Notice */}
                    <div className="bg-amber-50/80 border border-gold/40 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
                        <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold">Selective Update Mode:</span> Only the attributes with a checked box will be modified. All other product attributes, images, barcodes, and tags will remain completely intact.
                        </div>
                    </div>

                    {/* Section 1: Category & Fabric */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Category */}
                        <div className={cn(
                            "border rounded-xl p-4 transition-all duration-200",
                            enableCategory
                                ? "border-maroon/40 bg-maroon/[0.02] shadow-sm"
                                : "border-gray-200 bg-gray-50/50 opacity-80"
                        )}>
                            <div className="flex items-center justify-between mb-3">
                                <label className="flex items-center gap-2.5 cursor-pointer font-bold text-maroon text-xs uppercase tracking-wider select-none">
                                    <input
                                        type="checkbox"
                                        checked={enableCategory}
                                        onChange={(e) => setEnableCategory(e.target.checked)}
                                        className="rounded border-gold/40 text-maroon focus:ring-maroon h-4 w-4 cursor-pointer"
                                    />
                                    <Tag className="h-3.5 w-3.5 text-gold-dark" />
                                    Change Category
                                </label>
                                {enableCategory && selectedCategory && (
                                    <Badge variant="outline" className="text-[10px] bg-white border-gold/40 text-maroon font-normal">
                                        Selected: {selectedCategory}
                                    </Badge>
                                )}
                            </div>

                            {enableCategory && (
                                <div className="space-y-2 mt-2">
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
                                            className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 hover:border-gold rounded-lg text-xs shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-maroon"
                                        >
                                            <span className={selectedCategory ? "font-semibold text-gray-900" : "text-gray-400"}>
                                                {selectedCategory || "Select target category..."}
                                            </span>
                                            <ChevronDown className="h-4 w-4 text-gray-400" />
                                        </button>

                                        {isCatDropdownOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gold/40 rounded-lg shadow-xl z-50 p-2 max-h-52 overflow-y-auto">
                                                <div className="relative mb-2">
                                                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={catSearch}
                                                        onChange={(e) => setCatSearch(e.target.value)}
                                                        placeholder="Search categories..."
                                                        className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-maroon"
                                                        autoFocus
                                                    />
                                                </div>

                                                <div className="space-y-0.5">
                                                    {filteredCategories.length > 0 ? (
                                                        filteredCategories.map(cat => (
                                                            <button
                                                                key={cat.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedCategory(cat.name);
                                                                    setSelectedCategoryId(cat.categoryId || '');
                                                                    setIsCatDropdownOpen(false);
                                                                    setCatSearch('');
                                                                }}
                                                                className={cn(
                                                                    "w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between",
                                                                    selectedCategory === cat.name
                                                                        ? "bg-maroon text-gold font-semibold"
                                                                        : "text-gray-700 hover:bg-cream/50"
                                                                )}
                                                            >
                                                                <span>{cat.name}</span>
                                                                {selectedCategory === cat.name && <CheckCircle2 className="h-3.5 w-3.5 text-gold" />}
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <p className="text-xs text-gray-400 italic text-center py-2">
                                                            No categories found
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-500">
                                        Assigned category will be applied to all {selectedSarees.length} sarees.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 2. Fabric */}
                        <div className={cn(
                            "border rounded-xl p-4 transition-all duration-200",
                            enableFabric
                                ? "border-maroon/40 bg-maroon/[0.02] shadow-sm"
                                : "border-gray-200 bg-gray-50/50 opacity-80"
                        )}>
                            <div className="flex items-center justify-between mb-3">
                                <label className="flex items-center gap-2.5 cursor-pointer font-bold text-maroon text-xs uppercase tracking-wider select-none">
                                    <input
                                        type="checkbox"
                                        checked={enableFabric}
                                        onChange={(e) => setEnableFabric(e.target.checked)}
                                        className="rounded border-gold/40 text-maroon focus:ring-maroon h-4 w-4 cursor-pointer"
                                    />
                                    <Layers className="h-3.5 w-3.5 text-gold-dark" />
                                    Change Fabric
                                </label>
                                {enableFabric && fabricInput && (
                                    <Badge variant="outline" className="text-[10px] bg-white border-gold/40 text-maroon font-normal">
                                        {fabricInput}
                                    </Badge>
                                )}
                            </div>

                            {enableFabric && (
                                <div className="space-y-2 mt-2">
                                    <Input
                                        type="text"
                                        value={fabricInput}
                                        onChange={(e) => setFabricInput(e.target.value)}
                                        placeholder="e.g. Pure Katan Silk, Organza..."
                                        className="h-8 text-xs border-gray-300 focus:border-maroon"
                                    />

                                    {/* Quick Fabric Chips */}
                                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pt-1">
                                        {fabricSuggestions.slice(0, 8).map(fabric => (
                                            <button
                                                key={fabric}
                                                type="button"
                                                onClick={() => setFabricInput(fabric)}
                                                className={cn(
                                                    "text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer",
                                                    fabricInput === fabric
                                                        ? "bg-maroon text-gold border-maroon font-bold shadow-xs"
                                                        : "bg-white text-gray-600 border-gray-200 hover:border-gold hover:text-maroon"
                                                )}
                                            >
                                                {fabric}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 2: Pricing & Discount */}
                    <div className={cn(
                        "border rounded-xl p-4 transition-all duration-200 space-y-4",
                        enablePricing
                            ? "border-gold bg-amber-50/[0.25] shadow-sm"
                            : "border-gray-200 bg-gray-50/50 opacity-80"
                    )}>
                        <div className="flex items-center justify-between border-b border-gold/20 pb-2.5">
                            <label className="flex items-center gap-2.5 cursor-pointer font-bold text-maroon text-xs uppercase tracking-wider select-none">
                                <input
                                    type="checkbox"
                                    checked={enablePricing}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setEnablePricing(checked);
                                        if (checked && !updateDiscount && !updateMrp && !updateSellingPrice) {
                                            // By default enable discount % as the most common action
                                            setUpdateDiscount(true);
                                        }
                                    }}
                                    className="rounded border-gold/40 text-maroon focus:ring-maroon h-4 w-4 cursor-pointer"
                                />
                                <IndianRupee className="h-4 w-4 text-gold-dark" />
                                Pricing & Discount Management
                            </label>
                            {enablePricing && (
                                <span className="text-[11px] text-gray-500 font-sans">
                                    Change MRP, Discount % or Selling Price
                                </span>
                            )}
                        </div>

                        {enablePricing && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {/* 1. Discount Percentage */}
                                    <div className={cn(
                                        "p-3 rounded-lg border transition-all bg-white",
                                        updateDiscount ? "border-gold/80 shadow-xs ring-1 ring-gold/30" : "border-gray-200"
                                    )}>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-gray-800 select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={updateDiscount}
                                                    onChange={(e) => setUpdateDiscount(e.target.checked)}
                                                    className="rounded border-gold/40 text-maroon focus:ring-maroon h-3.5 w-3.5 cursor-pointer"
                                                />
                                                <Percent className="h-3 w-3 text-gold-dark" />
                                                Discount %
                                            </label>
                                        </div>

                                        <div className="relative">
                                            <Input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="100"
                                                disabled={!updateDiscount}
                                                value={discountInput}
                                                onChange={(e) => setDiscountInput(e.target.value)}
                                                placeholder="e.g. 20"
                                                className="h-8 pr-7 text-xs font-mono font-bold"
                                            />
                                            <span className="absolute right-2.5 top-2 text-xs font-bold text-gray-400 select-none">%</span>
                                        </div>

                                        {/* Quick Discount Presets */}
                                        {updateDiscount && (
                                            <div className="flex flex-wrap gap-1 mt-2.5">
                                                {[0, 5, 10, 15, 20, 25, 30, 50].map((pct) => (
                                                    <button
                                                        key={pct}
                                                        type="button"
                                                        onClick={() => setDiscountInput(String(pct))}
                                                        className={cn(
                                                            "text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors border cursor-pointer",
                                                            discountInput === String(pct)
                                                                ? "bg-maroon text-gold font-bold border-maroon"
                                                                : pct === 0
                                                                    ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                                                    : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gold/10 hover:border-gold"
                                                        )}
                                                    >
                                                        {pct === 0 ? '0% (Clear)' : `${pct}%`}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. MRP */}
                                    <div className={cn(
                                        "p-3 rounded-lg border transition-all bg-white",
                                        updateMrp ? "border-gold/80 shadow-xs ring-1 ring-gold/30" : "border-gray-200"
                                    )}>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-gray-800 select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={updateMrp}
                                                    onChange={(e) => setUpdateMrp(e.target.checked)}
                                                    className="rounded border-gold/40 text-maroon focus:ring-maroon h-3.5 w-3.5 cursor-pointer"
                                                />
                                                <Tag className="h-3 w-3 text-gold-dark" />
                                                Set MRP (₹)
                                            </label>
                                        </div>

                                        <div className="relative">
                                            <span className="absolute left-2.5 top-2 text-xs font-bold text-gray-400 select-none">₹</span>
                                            <Input
                                                type="number"
                                                step="1"
                                                min="0"
                                                disabled={!updateMrp}
                                                value={mrpInput}
                                                onChange={(e) => setMrpInput(e.target.value)}
                                                placeholder="e.g. 4999"
                                                className="h-8 pl-7 text-xs font-mono font-bold"
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-1.5 leading-tight">
                                            Standard retail sticker price for all chosen sarees.
                                        </p>
                                    </div>

                                    {/* 3. Selling Price */}
                                    <div className={cn(
                                        "p-3 rounded-lg border transition-all bg-white",
                                        updateSellingPrice ? "border-gold/80 shadow-xs ring-1 ring-gold/30" : "border-gray-200"
                                    )}>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-gray-800 select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={updateSellingPrice}
                                                    onChange={(e) => setUpdateSellingPrice(e.target.checked)}
                                                    className="rounded border-gold/40 text-maroon focus:ring-maroon h-3.5 w-3.5 cursor-pointer"
                                                />
                                                <IndianRupee className="h-3 w-3 text-gold-dark" />
                                                Selling Price (₹)
                                            </label>
                                        </div>

                                        <div className="relative">
                                            <span className="absolute left-2.5 top-2 text-xs font-bold text-gray-400 select-none">₹</span>
                                            <Input
                                                type="number"
                                                step="1"
                                                min="0"
                                                disabled={!updateSellingPrice}
                                                value={sellingPriceInput}
                                                onChange={(e) => setSellingPriceInput(e.target.value)}
                                                placeholder="e.g. 3999"
                                                className="h-8 pl-7 text-xs font-mono font-bold border-maroon/30 text-maroon"
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-1.5 leading-tight">
                                            Final checkout price. Discount amount is derived from MRP.
                                        </p>
                                    </div>
                                </div>

                                {/* Dynamic explanation formula box */}
                                {pricingSummaryText && (
                                    <div className="bg-gold/10 border border-gold/30 rounded-lg p-2.5 flex items-start gap-2 text-xs text-maroon-dark">
                                        <Sparkles className="h-3.5 w-3.5 text-gold-dark shrink-0 mt-0.5" />
                                        <span className="font-medium">{pricingSummaryText}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Section 3: Status */}
                    <div className={cn(
                        "border rounded-xl p-4 transition-all duration-200",
                        enableStatus
                            ? "border-maroon/40 bg-maroon/[0.02] shadow-sm"
                            : "border-gray-200 bg-gray-50/50 opacity-80"
                    )}>
                        <div className="flex items-center justify-between mb-3">
                            <label className="flex items-center gap-2.5 cursor-pointer font-bold text-maroon text-xs uppercase tracking-wider select-none">
                                <input
                                    type="checkbox"
                                    checked={enableStatus}
                                    onChange={(e) => setEnableStatus(e.target.checked)}
                                    className="rounded border-gold/40 text-maroon focus:ring-maroon h-4 w-4 cursor-pointer"
                                />
                                <CheckCircle2 className="h-3.5 w-3.5 text-gold-dark" />
                                Change Status (Active / Inactive)
                            </label>
                        </div>

                        {enableStatus && (
                            <div className="flex items-center gap-3 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setStatusInput('active')}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer",
                                        statusInput === 'active'
                                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                            : "bg-white text-gray-600 border-gray-300 hover:bg-emerald-50"
                                    )}
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Active (Live in Store)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusInput('inactive')}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer",
                                        statusInput === 'inactive'
                                            ? "bg-gray-700 text-cream border-gray-700 shadow-sm"
                                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
                                    )}
                                >
                                    <XCircle className="h-4 w-4" />
                                    Inactive (Archived/Hidden)
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Section 4: Live Impact Preview Table */}
                    {activeChangesCount > 0 && (
                        <div className="border border-gold/30 rounded-xl overflow-hidden shadow-xs">
                            <div className="bg-cream/40 px-3.5 py-2 border-b border-gold/20 flex items-center justify-between">
                                <span className="font-bold text-xs text-maroon flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-gold-dark" />
                                    Live Changes Preview (Showing up to 5 of {selectedSarees.length} items)
                                </span>
                                <Badge variant="outline" className="text-[10px] bg-white border-gold/30 text-gray-600">
                                    Real-time recalculation
                                </Badge>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
                                        <tr>
                                            <th className="py-2 px-3">Product</th>
                                            {enableCategory && <th className="py-2 px-3">Category</th>}
                                            {enableFabric && <th className="py-2 px-3">Fabric</th>}
                                            {enablePricing && <th className="py-2 px-3">Pricing (MRP &rarr; Sell)</th>}
                                            {enableStatus && <th className="py-2 px-3 text-center">Status</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {previewItems.map(({ saree, newCategory, newFabric, newStatus, newPrices }) => (
                                            <tr key={saree.id} className="hover:bg-cream/20">
                                                <td className="py-2 px-3">
                                                    <div className="flex items-center gap-2">
                                                        {saree.images && saree.images.length > 0 ? (
                                                            <img
                                                                src={saree.images.find(img => img.isPrimary)?.imageUrl || saree.images[0].imageUrl}
                                                                alt=""
                                                                className="h-8 w-8 object-cover rounded border border-gray-200 shrink-0"
                                                            />
                                                        ) : (
                                                            <div className="h-8 w-8 bg-gray-100 rounded flex items-center justify-center text-[10px] text-gray-400 shrink-0">
                                                                IMG
                                                            </div>
                                                        )}
                                                        <div className="min-w-0 max-w-[160px]">
                                                            <div className="font-bold text-gray-900 truncate" title={saree.sareeName}>
                                                                {saree.sareeName}
                                                            </div>
                                                            <div className="text-[10px] text-gray-400 font-mono">
                                                                {saree.sku || saree.barcode || saree.id.slice(0, 8)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {enableCategory && (
                                                    <td className="py-2 px-3 whitespace-nowrap">
                                                        <span className="text-gray-400 line-through mr-1">{saree.category || 'None'}</span>
                                                        &rarr;
                                                        <span className="ml-1 font-semibold text-maroon bg-gold/20 px-1.5 py-0.5 rounded">
                                                            {newCategory || '—'}
                                                        </span>
                                                    </td>
                                                )}

                                                {enableFabric && (
                                                    <td className="py-2 px-3 whitespace-nowrap">
                                                        <span className="text-gray-400 line-through mr-1">{saree.fabric || 'None'}</span>
                                                        &rarr;
                                                        <span className="ml-1 font-semibold text-maroon bg-gold/20 px-1.5 py-0.5 rounded">
                                                            {newFabric || '—'}
                                                        </span>
                                                    </td>
                                                )}

                                                {enablePricing && (
                                                    <td className="py-2 px-3 whitespace-nowrap">
                                                        {newPrices ? (
                                                            <div className="space-y-0.5">
                                                                <div className="text-[10px] text-gray-500">
                                                                    MRP: <span className="font-mono line-through mr-1">₹{saree.mrp || saree.sellingPrice}</span>
                                                                    &rarr; <span className="font-mono font-bold text-gray-900">₹{newPrices.mrp}</span>
                                                                </div>
                                                                <div className="text-[10px]">
                                                                    Sell: <span className="font-mono line-through text-gray-400 mr-1">₹{saree.sellingPrice}</span>
                                                                    &rarr; <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded">₹{newPrices.sellingPrice}</span>
                                                                    {newPrices.discountPercentage > 0 && (
                                                                        <span className="ml-1.5 text-maroon font-bold text-[9px] bg-gold/30 px-1 py-0.2 rounded">
                                                                            {newPrices.discountPercentage}% OFF
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 italic">No price change</span>
                                                        )}
                                                    </td>
                                                )}

                                                {enableStatus && (
                                                    <td className="py-2 px-3 text-center whitespace-nowrap">
                                                        <span className="text-gray-400 line-through mr-1 uppercase text-[10px]">{saree.status}</span>
                                                        &rarr;
                                                        <Badge className={cn(
                                                            "ml-1 text-[10px] uppercase font-bold",
                                                            newStatus === 'active' ? "bg-emerald-600 text-white" : "bg-gray-600 text-cream"
                                                        )}>
                                                            {newStatus}
                                                        </Badge>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {selectedSarees.length > 5 && (
                                <div className="bg-gray-50/80 px-3 py-1.5 text-center text-[11px] text-gray-500 border-t border-gray-100">
                                    + {selectedSarees.length - 5} more items will also be updated with identical rules.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <DialogFooter className="px-6 py-3.5 border-t border-gray-200 bg-gray-50 flex items-center justify-between sm:justify-between flex-shrink-0">
                    <div className="text-xs text-gray-600">
                        {activeChangesCount > 0 ? (
                            <span className="font-medium text-maroon">
                                <span className="font-bold">{activeChangesCount}</span> attribute{activeChangesCount > 1 ? 's' : ''} will be updated across <span className="font-bold">{selectedSarees.length}</span> sarees.
                            </span>
                        ) : (
                            <span className="text-gray-400 italic">
                                Check at least one attribute above to apply changes.
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="h-9 px-4 text-xs font-semibold cursor-pointer"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || activeChangesCount === 0}
                            className="h-9 px-5 text-xs font-bold bg-maroon hover:bg-maroon-dark text-gold gap-1.5 shadow-md cursor-pointer transition-all border border-gold/40"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin text-gold" />
                                    Applying Changes...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4 text-gold" />
                                    Apply Changes ({selectedSarees.length})
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
