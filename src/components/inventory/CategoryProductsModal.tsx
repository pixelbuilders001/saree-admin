import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService, categoryService, type Saree, type Category } from '@/services/inventoryService';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Layers,
    Search,
    Plus,
    X,
    Loader2,
    Package,
    CheckSquare,
    Square,
    IndianRupee,
    Boxes,
    Filter,
    FolderPlus,
    MinusCircle,
    Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CategoryProductsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialCategory?: string;
}

export function CategoryProductsModal({ isOpen, onClose, initialCategory }: CategoryProductsModalProps) {
    const queryClient = useQueryClient();

    // Active Category Selection
    const [selectedCategoryName, setSelectedCategoryName] = React.useState<string>(initialCategory || '');
    
    // Create Category Sub-dialog state & full form fields
    const [isCreateCategoryOpen, setIsCreateCategoryOpen] = React.useState(false);
    const [catId, setCatId] = React.useState('');
    const [catName, setCatName] = React.useState('');
    const [catSlug, setCatSlug] = React.useState('');
    const [catDesc, setCatDesc] = React.useState('');
    const [catStatus, setCatStatus] = React.useState<'active' | 'inactive'>('active');
    const [catSortOrder, setCatSortOrder] = React.useState(0);
    const [imageFile, setImageFile] = React.useState<File | null>(null);
    const [imagePreview, setImagePreview] = React.useState<string>('');

    // Panel Search States
    const [leftSearch, setLeftSearch] = React.useState('');
    const [rightSearch, setRightSearch] = React.useState('');
    const [rightSourceCategoryFilter, setRightSourceCategoryFilter] = React.useState('All');
    
    // Bulk Selection States
    const [selectedRightItemIds, setSelectedRightItemIds] = React.useState<string[]>([]);
    const [selectedLeftItemIds, setSelectedLeftItemIds] = React.useState<string[]>([]);

    // Mobile View Tab state ('in_category' | 'add_products')
    const [mobileTab, setMobileTab] = React.useState<'in_category' | 'add_products'>('in_category');

    // Fetch Categories
    const { data: dbCategories } = useQuery({
        queryKey: ['categories'],
        queryFn: categoryService.getCategories,
        enabled: isOpen
    });

    // Fetch Sarees
    const { data: sarees, isLoading: isSareesLoading } = useQuery({
        queryKey: ['sarees'],
        queryFn: inventoryService.getSarees,
        enabled: isOpen
    });

    // Extract list of all unique category names
    const categoryOptions = React.useMemo(() => {
        const set = new Set<string>();
        if (Array.isArray(dbCategories)) {
            dbCategories.forEach(c => {
                if (c.name) set.add(c.name);
            });
        }
        if (Array.isArray(sarees)) {
            sarees.forEach(s => {
                if (s.category) set.add(s.category);
            });
        }
        return Array.from(set).sort();
    }, [dbCategories, sarees]);

    // Set default selected category if none selected
    React.useEffect(() => {
        if (isOpen) {
            if (initialCategory && categoryOptions.includes(initialCategory)) {
                setSelectedCategoryName(initialCategory);
            } else if (!selectedCategoryName && categoryOptions.length > 0) {
                setSelectedCategoryName(categoryOptions[0]);
            }
        }
    }, [isOpen, initialCategory, categoryOptions]);

    // Reset selection when active target category changes
    React.useEffect(() => {
        setSelectedRightItemIds([]);
        setSelectedLeftItemIds([]);
        setLeftSearch('');
        setRightSearch('');
    }, [selectedCategoryName]);

    // Find category ID matching name if available
    const currentCategoryId = React.useMemo(() => {
        if (!selectedCategoryName || !dbCategories) return '';
        const match = dbCategories.find(c => c.name.toLowerCase() === selectedCategoryName.toLowerCase());
        return match ? match.categoryId : '';
    }, [selectedCategoryName, dbCategories]);

    // Split sarees into:
    // 1. Current Products in Selected Category
    // 2. Available Products from Other Categories
    const { inCategoryProducts, availableProducts } = React.useMemo(() => {
        if (!Array.isArray(sarees)) return { inCategoryProducts: [], availableProducts: [] };

        const currentCatLower = (selectedCategoryName || '').toLowerCase().trim();

        const inCat: Saree[] = [];
        const avail: Saree[] = [];

        sarees.forEach(saree => {
            const sareeCatLower = (saree.category || '').toLowerCase().trim();
            if (sareeCatLower === currentCatLower) {
                inCat.push(saree);
            } else {
                avail.push(saree);
            }
        });

        return { inCategoryProducts: inCat, availableProducts: avail };
    }, [sarees, selectedCategoryName]);

    // Filter Left (In-Category) Products by leftSearch
    const filteredLeftProducts = React.useMemo(() => {
        if (!leftSearch.trim()) return inCategoryProducts;
        const q = leftSearch.toLowerCase();
        return inCategoryProducts.filter(s =>
            s.sareeName.toLowerCase().includes(q) ||
            s.id.toLowerCase().includes(q) ||
            (s.sku && s.sku.toLowerCase().includes(q)) ||
            (s.fabric && s.fabric.toLowerCase().includes(q))
        );
    }, [inCategoryProducts, leftSearch]);

    // Filter Right (Available) Products by rightSearch & source category
    const filteredRightProducts = React.useMemo(() => {
        return availableProducts.filter(s => {
            const matchesSearch = rightSearch.trim() === '' || (
                s.sareeName.toLowerCase().includes(rightSearch.toLowerCase()) ||
                s.id.toLowerCase().includes(rightSearch.toLowerCase()) ||
                (s.sku && s.sku.toLowerCase().includes(rightSearch.toLowerCase())) ||
                (s.fabric && s.fabric.toLowerCase().includes(rightSearch.toLowerCase())) ||
                (s.category && s.category.toLowerCase().includes(rightSearch.toLowerCase()))
            );

            const matchesCategory = rightSourceCategoryFilter === 'All' || s.category === rightSourceCategoryFilter;

            return matchesSearch && matchesCategory;
        });
    }, [availableProducts, rightSearch, rightSourceCategoryFilter]);

    // Stats for Selected Category
    const categoryStats = React.useMemo(() => {
        let units = 0;
        let totalVal = 0;
        inCategoryProducts.forEach(s => {
            units += s.stock;
            totalVal += s.stock * s.sellingPrice;
        });
        return {
            count: inCategoryProducts.length,
            units,
            totalVal
        };
    }, [inCategoryProducts]);

    // Category form helpers
    const resetCategoryForm = () => {
        setCatId('');
        setCatName('');
        setCatSlug('');
        setCatDesc('');
        setCatStatus('active');
        setCatSortOrder(0);
        setImageFile(null);
        setImagePreview('');
    };

    const handleCatNameChange = (name: string) => {
        setCatName(name);
        const generatedSlug = name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        setCatSlug(generatedSlug);
        
        const generatedId = name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/(^-|-$)/g, '');
        setCatId(generatedId);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Mutation: Create Category (Using standard categoryService)
    const createCategoryMutation = useMutation({
        mutationFn: ({ data, imageFile }: { data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>; imageFile?: File }) => 
            categoryService.createCategory(data, imageFile),
        onSuccess: (newCat) => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success(`Category "${newCat.name}" created! Target category set to "${newCat.name}".`);
            setSelectedCategoryName(newCat.name);
            resetCategoryForm();
            setIsCreateCategoryOpen(false);
        },
        onError: (err: any) => {
            toast.error(`Failed to create category: ${err?.message || err}`);
        }
    });

    const handleCreateCategorySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!catId.trim()) {
            toast.error('Category ID is required');
            return;
        }
        if (!catName.trim()) {
            toast.error('Category Name is required');
            return;
        }
        if (!catSlug.trim()) {
            toast.error('Category Slug is required');
            return;
        }

        const categoryData = {
            categoryId: catId.trim(),
            name: catName.trim(),
            slug: catSlug.trim(),
            description: catDesc.trim() || undefined,
            status: catStatus,
            sortOrder: Number(catSortOrder) || 0,
            imageUrl: imagePreview && !imageFile ? imagePreview : undefined
        };

        createCategoryMutation.mutate({ data: categoryData, imageFile: imageFile || undefined });
    };

    // Mutation: Assign Products to Category
    const assignMutation = useMutation({
        mutationFn: async ({ productIds, categoryName, categoryId }: { productIds: string[]; categoryName: string; categoryId?: string }) => {
            await inventoryService.assignCategoryToProducts(productIds, categoryName, categoryId);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['sarees'] });
            toast.success(`Successfully added ${variables.productIds.length} product(s) to "${variables.categoryName}"`);
            setSelectedRightItemIds([]);
        },
        onError: (err: any) => {
            toast.error(`Failed to update products: ${err?.message || err}`);
        }
    });

    // Mutation: Remove Products from Category
    const removeMutation = useMutation({
        mutationFn: async ({ productIds, targetCategory }: { productIds: string[]; targetCategory: string }) => {
            await inventoryService.assignCategoryToProducts(productIds, targetCategory, '');
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['sarees'] });
            toast.success(`Removed ${variables.productIds.length} product(s) from category`);
            setSelectedLeftItemIds([]);
        },
        onError: (err: any) => {
            toast.error(`Failed to remove products: ${err?.message || err}`);
        }
    });

    // Single item add to selected category
    const handleAddSingle = (saree: Saree) => {
        if (!selectedCategoryName) return;
        assignMutation.mutate({
            productIds: [saree.id],
            categoryName: selectedCategoryName,
            categoryId: currentCategoryId
        });
    };

    // Bulk add selected items to selected category
    const handleAddBatch = () => {
        if (selectedRightItemIds.length === 0 || !selectedCategoryName) return;
        assignMutation.mutate({
            productIds: selectedRightItemIds,
            categoryName: selectedCategoryName,
            categoryId: currentCategoryId
        });
    };

    // Single item remove from category
    const handleRemoveSingle = (saree: Saree) => {
        removeMutation.mutate({
            productIds: [saree.id],
            targetCategory: 'General'
        });
    };

    // Bulk remove selected items from category
    const handleRemoveBatch = () => {
        if (selectedLeftItemIds.length === 0) return;
        removeMutation.mutate({
            productIds: selectedLeftItemIds,
            targetCategory: 'General'
        });
    };

    // Right list checkbox toggles
    const toggleSelectRight = (id: string) => {
        setSelectedRightItemIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const toggleSelectAllRight = () => {
        if (selectedRightItemIds.length === filteredRightProducts.length) {
            setSelectedRightItemIds([]);
        } else {
            setSelectedRightItemIds(filteredRightProducts.map(p => p.id));
        }
    };

    // Left list checkbox toggles
    const toggleSelectLeft = (id: string) => {
        setSelectedLeftItemIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const toggleSelectAllLeft = () => {
        if (selectedLeftItemIds.length === filteredLeftProducts.length) {
            setSelectedLeftItemIds([]);
        } else {
            setSelectedLeftItemIds(filteredLeftProducts.map(p => p.id));
        }
    };

    const isProcessing = assignMutation.isPending || removeMutation.isPending;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-6xl w-[95vw] h-[90vh] border-gold/20 shadow-2xl p-0 overflow-hidden bg-slate-50 flex flex-col rounded-xl">
                    
                    {/* ── HEADER ─────────────────────────────────────────────────── */}
                    <DialogHeader className="border-b border-gold/15 px-6 py-4 bg-white shrink-0 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-maroon to-maroon-dark text-gold rounded-xl shadow-md shadow-maroon/20">
                                <Layers className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg md:text-xl font-bold font-serif text-maroon flex items-center gap-2">
                                    Category Product Manager
                                </DialogTitle>
                                <p className="text-xs text-gray-500 font-sans">
                                    Organize products into categories or create new ones
                                </p>
                            </div>
                        </div>

                        {/* Category Selector + Create Fresh Category Button */}
                        <div className="flex items-center gap-2 flex-wrap bg-cream/20 p-2 rounded-xl border border-gold/20">
                            <span className="text-xs font-bold text-maroon uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5">
                                <FolderPlus className="h-4 w-4 text-maroon/70" />
                                Target Category:
                            </span>
                            <Select value={selectedCategoryName} onValueChange={setSelectedCategoryName}>
                                <SelectTrigger className="w-[200px] h-9 text-xs font-bold bg-white border-gold/30 text-maroon focus:ring-maroon shadow-sm">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent className="border-gold/20 max-h-[280px]">
                                    {categoryOptions.map(cat => (
                                        <SelectItem key={cat} value={cat} className="text-xs font-semibold">
                                            {cat}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Create Fresh Category Button */}
                            <Button
                                size="sm"
                                onClick={() => {
                                    resetCategoryForm();
                                    setIsCreateCategoryOpen(true);
                                }}
                                className="h-9 px-3 text-xs bg-gradient-to-r from-maroon to-maroon-dark text-gold font-bold gap-1.5 shadow-sm hover:shadow-md transition-all"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Create Fresh Category
                            </Button>
                        </div>
                    </DialogHeader>

                    {/* ── STATS BAR ──────────────────────────────────────────────── */}
                    <div className="bg-white border-b border-gold/10 px-6 py-2.5 flex items-center justify-between gap-4 text-xs font-sans shrink-0">
                        <div className="flex items-center gap-6 flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 font-medium">Selected Category:</span>
                                <span className="font-bold text-maroon bg-cream/40 px-2.5 py-0.5 rounded-full border border-gold/20 font-mono">
                                    {selectedCategoryName || 'None'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Package className="h-3.5 w-3.5 text-gray-400" />
                                <span className="text-gray-500">Products:</span>
                                <span className="font-bold font-mono text-gray-800">{categoryStats.count}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Boxes className="h-3.5 w-3.5 text-indigo-500" />
                                <span className="text-gray-500">Total Stock:</span>
                                <span className="font-bold font-mono text-indigo-600">{categoryStats.units} units</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-gray-500">Stock Value:</span>
                                <span className="font-bold font-mono text-emerald-600">₹{categoryStats.totalVal.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Mobile Screen Tab Selector */}
                        <div className="flex lg:hidden items-center bg-gray-100 p-0.5 rounded-lg">
                            <button
                                onClick={() => setMobileTab('in_category')}
                                className={cn(
                                    "px-3 py-1 text-xs font-bold rounded-md transition-all",
                                    mobileTab === 'in_category' ? "bg-white text-maroon shadow-sm" : "text-gray-500"
                                )}
                            >
                                In Category ({inCategoryProducts.length})
                            </button>
                            <button
                                onClick={() => setMobileTab('add_products')}
                                className={cn(
                                    "px-3 py-1 text-xs font-bold rounded-md transition-all",
                                    mobileTab === 'add_products' ? "bg-white text-maroon shadow-sm" : "text-gray-500"
                                )}
                            >
                                Add Existing ({availableProducts.length})
                            </button>
                        </div>
                    </div>

                    {/* ── MAIN BODY DUAL-PANEL ────────────────────────────────────── */}
                    <div className="flex-1 overflow-hidden p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-5 min-h-0">

                        {/* ── LEFT PANEL: PRODUCTS CURRENTLY IN CATEGORY ──────────── */}
                        <div className={cn(
                            "bg-white border border-gold/20 rounded-xl flex flex-col shadow-sm overflow-hidden min-h-0",
                            mobileTab === 'add_products' ? "hidden lg:flex" : "flex"
                        )}>
                            {/* Panel Header */}
                            <div className="p-3.5 bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/10 flex items-center justify-between gap-2 shrink-0">
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    <h3 className="text-xs font-bold text-maroon uppercase tracking-wider">
                                        Current Category Products ({filteredLeftProducts.length})
                                    </h3>
                                </div>

                                {selectedLeftItemIds.length > 0 && (
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={handleRemoveBatch}
                                        disabled={isProcessing}
                                        className="h-7 text-[10px] gap-1 px-2.5 font-bold shadow-sm"
                                    >
                                        {removeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <MinusCircle className="h-3 w-3" />}
                                        Remove Selected ({selectedLeftItemIds.length})
                                    </Button>
                                )}
                            </div>

                            {/* Search & Select All Bar */}
                            <div className="p-3 border-b border-gold/10 bg-slate-50/50 flex items-center gap-2 shrink-0">
                                <button
                                    onClick={toggleSelectAllLeft}
                                    className="p-1 text-gray-400 hover:text-maroon transition-colors"
                                    title="Select All in Category"
                                >
                                    {selectedLeftItemIds.length > 0 && selectedLeftItemIds.length === filteredLeftProducts.length ? (
                                        <CheckSquare className="h-4 w-4 text-maroon" />
                                    ) : (
                                        <Square className="h-4 w-4" />
                                    )}
                                </button>
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                    <Input
                                        placeholder={`Search items in ${selectedCategoryName}...`}
                                        value={leftSearch}
                                        onChange={(e) => setLeftSearch(e.target.value)}
                                        className="pl-8 h-8 text-xs border-gold/30 bg-white"
                                    />
                                </div>
                            </div>

                            {/* Product List */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                {isSareesLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-xs italic gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin text-maroon/60" />
                                        Loading products...
                                    </div>
                                ) : filteredLeftProducts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 space-y-2">
                                        <div className="p-3 bg-gray-100 rounded-full text-gray-300">
                                            <Package className="h-6 w-6" />
                                        </div>
                                        <p className="text-xs font-semibold text-gray-500">
                                            No products found in "{selectedCategoryName}"
                                        </p>
                                        <p className="text-[10px] text-gray-400 max-w-[240px]">
                                            Add existing products from the right panel to populate this category.
                                        </p>
                                    </div>
                                ) : (
                                    filteredLeftProducts.map((saree) => {
                                        const isSelected = selectedLeftItemIds.includes(saree.id);
                                        const primaryImg = saree.images?.find(i => i.isPrimary)?.imageUrl || saree.images?.[0]?.imageUrl;

                                        return (
                                            <div
                                                key={saree.id}
                                                className={cn(
                                                    "p-2.5 border rounded-lg flex items-center justify-between gap-3 transition-all hover:shadow-sm bg-white",
                                                    isSelected ? "border-maroon/40 bg-maroon/5" : "border-gold/15"
                                                )}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                    <button
                                                        onClick={() => toggleSelectLeft(saree.id)}
                                                        className="text-gray-400 hover:text-maroon transition-colors shrink-0"
                                                    >
                                                        {isSelected ? (
                                                            <CheckSquare className="h-4 w-4 text-maroon" />
                                                        ) : (
                                                            <Square className="h-4 w-4" />
                                                        )}
                                                    </button>

                                                    {primaryImg ? (
                                                        <img
                                                            src={primaryImg}
                                                            alt={saree.sareeName}
                                                            className="w-10 h-10 object-cover rounded-md border border-gold/20 shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-gray-100 rounded-md border border-gold/10 flex items-center justify-center text-[8px] font-bold text-gray-400 uppercase shrink-0">
                                                            No Img
                                                        </div>
                                                    )}

                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="text-xs font-bold text-gray-800 truncate" title={saree.sareeName}>
                                                            {saree.sareeName}
                                                        </h4>
                                                        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono mt-0.5">
                                                            <span>ID: {saree.id}</span>
                                                            {saree.sku && <span>• SKU: {saree.sku}</span>}
                                                            <span>• Fabric: {saree.fabric}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className="text-right">
                                                        <span className="block text-xs font-bold text-maroon font-mono">
                                                            ₹{saree.sellingPrice.toLocaleString()}
                                                        </span>
                                                        <span className={cn(
                                                            "inline-block text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold",
                                                            saree.stock === 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                                                        )}>
                                                            Stock: {saree.stock}
                                                        </span>
                                                    </div>

                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleRemoveSingle(saree)}
                                                        disabled={isProcessing}
                                                        className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 border border-red-200"
                                                        title="Remove product from this category"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* ── RIGHT PANEL: ADD EXISTING PRODUCTS FROM STORE ──────────── */}
                        <div className={cn(
                            "bg-white border border-gold/20 rounded-xl flex flex-col shadow-sm overflow-hidden min-h-0",
                            mobileTab === 'in_category' ? "hidden lg:flex" : "flex"
                        )}>
                            {/* Panel Header */}
                            <div className="p-3.5 bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/10 flex items-center justify-between gap-2 shrink-0">
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                                    <h3 className="text-xs font-bold text-maroon uppercase tracking-wider">
                                        Add Existing Products ({filteredRightProducts.length})
                                    </h3>
                                </div>

                                {selectedRightItemIds.length > 0 && (
                                    <Button
                                        size="sm"
                                        onClick={handleAddBatch}
                                        disabled={isProcessing}
                                        className="h-7 text-[10px] gap-1 px-2.5 font-bold bg-maroon hover:bg-maroon-dark text-gold shadow-sm"
                                    >
                                        {assignMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                                        Add Selected ({selectedRightItemIds.length})
                                    </Button>
                                )}
                            </div>

                            {/* Filters & Search Bar */}
                            <div className="p-3 border-b border-gold/10 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                                <div className="flex items-center gap-2 flex-1">
                                    <button
                                        onClick={toggleSelectAllRight}
                                        className="p-1 text-gray-400 hover:text-maroon transition-colors"
                                        title="Select All Available Products"
                                    >
                                        {selectedRightItemIds.length > 0 && selectedRightItemIds.length === filteredRightProducts.length ? (
                                            <CheckSquare className="h-4 w-4 text-maroon" />
                                        ) : (
                                            <Square className="h-4 w-4" />
                                        )}
                                    </button>
                                    <div className="relative flex-1">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                        <Input
                                            placeholder="Search existing products by name, SKU, fabric..."
                                            value={rightSearch}
                                            onChange={(e) => setRightSearch(e.target.value)}
                                            className="pl-8 h-8 text-xs border-gold/30 bg-white"
                                        />
                                    </div>
                                </div>

                                {/* Filter by Source Category */}
                                <div className="flex items-center gap-1.5">
                                    <Filter className="h-3.5 w-3.5 text-gray-400" />
                                    <Select value={rightSourceCategoryFilter} onValueChange={setRightSourceCategoryFilter}>
                                        <SelectTrigger className="w-[140px] h-8 text-xs bg-white border-gold/30 text-gray-700">
                                            <SelectValue placeholder="Filter Source" />
                                        </SelectTrigger>
                                        <SelectContent className="border-gold/20 max-h-[220px]">
                                            <SelectItem value="All" className="text-xs">All Categories</SelectItem>
                                            {categoryOptions.map(cat => (
                                                <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Available Products List */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                {isSareesLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-xs italic gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin text-maroon/60" />
                                        Loading products catalog...
                                    </div>
                                ) : filteredRightProducts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 space-y-2">
                                        <div className="p-3 bg-gray-100 rounded-full text-gray-300">
                                            <Search className="h-6 w-6" />
                                        </div>
                                        <p className="text-xs font-semibold text-gray-500">
                                            No existing products available to add
                                        </p>
                                        <p className="text-[10px] text-gray-400 max-w-[240px]">
                                            All matching products are already in this category or adjust your search filter.
                                        </p>
                                    </div>
                                ) : (
                                    filteredRightProducts.map((saree) => {
                                        const isSelected = selectedRightItemIds.includes(saree.id);
                                        const primaryImg = saree.images?.find(i => i.isPrimary)?.imageUrl || saree.images?.[0]?.imageUrl;

                                        return (
                                            <div
                                                key={saree.id}
                                                className={cn(
                                                    "p-2.5 border rounded-lg flex items-center justify-between gap-3 transition-all hover:shadow-sm bg-white",
                                                    isSelected ? "border-maroon/40 bg-maroon/5" : "border-gold/15"
                                                )}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                    <button
                                                        onClick={() => toggleSelectRight(saree.id)}
                                                        className="text-gray-400 hover:text-maroon transition-colors shrink-0"
                                                    >
                                                        {isSelected ? (
                                                            <CheckSquare className="h-4 w-4 text-maroon" />
                                                        ) : (
                                                            <Square className="h-4 w-4" />
                                                        )}
                                                    </button>

                                                    {primaryImg ? (
                                                        <img
                                                            src={primaryImg}
                                                            alt={saree.sareeName}
                                                            className="w-10 h-10 object-cover rounded-md border border-gold/20 shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-gray-100 rounded-md border border-gold/10 flex items-center justify-center text-[8px] font-bold text-gray-400 uppercase shrink-0">
                                                            No Img
                                                        </div>
                                                    )}

                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="text-xs font-bold text-gray-800 truncate" title={saree.sareeName}>
                                                            {saree.sareeName}
                                                        </h4>
                                                        <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-gray-400 font-mono mt-0.5">
                                                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-sans font-semibold border border-slate-200">
                                                                {saree.category}
                                                            </span>
                                                            <span>• ID: {saree.id}</span>
                                                            {saree.sku && <span>• SKU: {saree.sku}</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className="text-right">
                                                        <span className="block text-xs font-bold text-maroon font-mono">
                                                            ₹{saree.sellingPrice.toLocaleString()}
                                                        </span>
                                                        <span className="text-[9px] text-gray-400 block font-mono">
                                                            Stock: {saree.stock}
                                                        </span>
                                                    </div>

                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleAddSingle(saree)}
                                                        disabled={isProcessing}
                                                        className="h-8 text-xs bg-maroon hover:bg-maroon-dark text-gold gap-1 px-2.5 font-bold shadow-sm"
                                                        title={`Add to ${selectedCategoryName}`}
                                                    >
                                                        <Plus className="h-3.5 w-3.5" />
                                                        Add
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── FOOTER ─────────────────────────────────────────────────── */}
                    <div className="p-4 bg-white border-t border-gold/15 flex items-center justify-between shrink-0">
                        <div className="text-xs text-gray-500">
                            {selectedRightItemIds.length > 0 ? (
                                <span className="font-bold text-maroon font-mono">
                                    {selectedRightItemIds.length} existing product(s) selected to add
                                </span>
                            ) : selectedLeftItemIds.length > 0 ? (
                                <span className="font-bold text-red-600 font-mono">
                                    {selectedLeftItemIds.length} product(s) selected to remove
                                </span>
                            ) : (
                                <span>Select existing products from other categories to assign them to <strong>{selectedCategoryName}</strong>.</span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="h-9 text-xs font-bold border-gold/30 text-gray-700 hover:bg-slate-100"
                            >
                                Done / Close
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── CREATE FRESH CATEGORY SUB-DIALOG (FULL 7-FIELD IMPLEMENTATION MATCHING CATEGORYMANAGEMENTMODAL) ── */}
            <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
                <DialogContent className="max-w-lg border-gold/20 shadow-2xl p-0 overflow-hidden bg-white rounded-xl">
                    <DialogHeader className="border-b border-gold/15 px-6 py-4 bg-cream/10 flex flex-row items-center justify-between">
                        <DialogTitle className="text-base font-bold font-serif text-maroon flex items-center gap-2">
                            <FolderPlus className="h-5 w-5 text-maroon" />
                            Create Fresh Category
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleCreateCategorySubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-maroon uppercase tracking-wider">
                                    Category Name *
                                </label>
                                <Input
                                    value={catName}
                                    onChange={(e) => handleCatNameChange(e.target.value)}
                                    placeholder="e.g. Banarasi Silk"
                                    required
                                    autoFocus
                                    className="border-gold/30 focus-visible:ring-maroon h-9 text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-maroon uppercase tracking-wider">
                                    Category ID *
                                </label>
                                <Input
                                    value={catId}
                                    onChange={(e) => setCatId(e.target.value)}
                                    placeholder="e.g. banarasi_silk"
                                    required
                                    className="border-gold/30 focus-visible:ring-maroon h-9 text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-maroon uppercase tracking-wider">
                                    URL Slug *
                                </label>
                                <Input
                                    value={catSlug}
                                    onChange={(e) => setCatSlug(e.target.value)}
                                    placeholder="e.g. banarasi-silk"
                                    required
                                    className="border-gold/30 focus-visible:ring-maroon h-9 text-xs font-mono"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-maroon uppercase tracking-wider">Status</label>
                                    <select
                                        value={catStatus}
                                        onChange={(e) => setCatStatus(e.target.value as 'active' | 'inactive')}
                                        className="w-full h-9 text-xs rounded-md border border-gold/30 px-2 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-maroon"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-maroon uppercase tracking-wider">Sort Order</label>
                                    <Input
                                        type="number"
                                        value={catSortOrder}
                                        onChange={(e) => setCatSortOrder(parseInt(e.target.value) || 0)}
                                        className="border-gold/30 focus-visible:ring-maroon h-9 text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-maroon uppercase tracking-wider">Description</label>
                            <Textarea
                                value={catDesc}
                                onChange={(e) => setCatDesc(e.target.value)}
                                placeholder="Describe this category..."
                                className="border-gold/30 focus-visible:ring-maroon min-h-[75px] text-xs"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-maroon uppercase tracking-wider block">Category Image</label>
                            <div className="flex items-center gap-4 border border-dashed border-gold/30 rounded-md p-3 bg-slate-50/50">
                                {imagePreview ? (
                                    <div className="relative w-16 h-16 border border-gold/20 rounded overflow-hidden shrink-0 bg-white">
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setImageFile(null);
                                                setImagePreview('');
                                            }}
                                            className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 border border-dashed border-gold/20 rounded flex items-center justify-center shrink-0 bg-white text-gray-400">
                                        <FolderPlus className="h-5 w-5" />
                                    </div>
                                )}
                                <div className="space-y-1.5 flex-1">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="h-8 text-xs border-gold/30 file:text-xs file:bg-maroon/5 file:text-maroon file:border-0 file:rounded-md file:px-2 file:py-0.5 hover:file:bg-maroon/10 focus-visible:ring-maroon"
                                    />
                                    <p className="text-[9px] text-gray-400">Supported formats: JPG, PNG, WEBP. Image will be compressed before upload.</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-lg flex items-start gap-2 text-[11px] text-amber-800">
                            <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <span>
                                Creating this category will save it to your catalog and set it as the active target category in this modal!
                            </span>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t border-gold/10">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsCreateCategoryOpen(false)}
                                className="h-9 text-xs font-bold text-gray-600"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createCategoryMutation.isPending}
                                className="bg-maroon hover:bg-maroon-dark text-gold border-2 border-gold/20 h-9 text-xs px-6 font-bold gap-1.5"
                            >
                                {createCategoryMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Save & Select Category
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
