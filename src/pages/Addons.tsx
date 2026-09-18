import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus,
    Search,
    RefreshCw,
    Edit2,
    Trash2,
    PackagePlus,
    Package,
    Boxes,
    PackageX,
    AlertTriangle,
    IndianRupee,
    Layers,
    X,
    Loader2,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Wallet,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
import { cn } from '@/lib/utils';
import {
    addonInventoryService,
    PREDEFINED_ADDON_CATEGORIES,
    type Addon,
    type CreateAddonDTO,
} from '@/services/addonInventoryService';

const ITEMS_PER_PAGE = 10;

interface AddonFormData {
    name: string;
    category: string;
    customCategory: string;
    purchase_price: string;
    selling_price: string;
    stock: string;
    status: 'active' | 'inactive';
}

const DEFAULT_FORM_DATA: AddonFormData = {
    name: '',
    category: 'Blouse',
    customCategory: '',
    purchase_price: '',
    selling_price: '',
    stock: '0',
    status: 'active',
};

// Format numbers in Indian shorthand (e.g., 3.45 Cr, 12.50 L) for instant readability
const formatIndianCompact = (num: number): string => {
    if (!num || isNaN(num)) return '';
    const abs = Math.abs(num);
    if (abs >= 10000000) {
        const cr = num / 10000000;
        return `₹${cr >= 100 ? cr.toFixed(1) : cr.toFixed(2)} Cr`;
    }
    if (abs >= 100000) {
        const lakh = num / 100000;
        return `₹${lakh >= 100 ? lakh.toFixed(1) : lakh.toFixed(2)} L`;
    }
    if (abs >= 1000) {
        return `₹${(num / 1000).toFixed(1)} K`;
    }
    return '';
};

export default function AddonsPage() {
    const queryClient = useQueryClient();

    // Filter & Search states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [selectedStatus, setSelectedStatus] = useState<string>('All');
    const [currentPage, setCurrentPage] = useState(1);

    // Modal & Form states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
    const [formData, setFormData] = useState<AddonFormData>(DEFAULT_FORM_DATA);

    // Delete dialog state
    const [deletingAddon, setDeletingAddon] = useState<Addon | null>(null);

    // Query to fetch addons
    const {
        data: addons = [],
        isLoading,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: ['addons'],
        queryFn: addonInventoryService.getAddons,
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (dto: CreateAddonDTO) => addonInventoryService.createAddon(dto),
        onSuccess: (newAddon) => {
            queryClient.invalidateQueries({ queryKey: ['addons'] });
            toast.success(`Add-on "${newAddon.name}" created successfully`);
            setIsFormOpen(false);
            setFormData(DEFAULT_FORM_DATA);
        },
        onError: (err: any) => {
            console.error('Error creating addon:', err);
            toast.error(err?.message || 'Failed to create add-on');
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: CreateAddonDTO }) =>
            addonInventoryService.updateAddon(id, dto),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: ['addons'] });
            toast.success(`Add-on "${updated.name}" updated successfully`);
            setIsFormOpen(false);
            setEditingAddon(null);
            setFormData(DEFAULT_FORM_DATA);
        },
        onError: (err: any) => {
            console.error('Error updating addon:', err);
            toast.error(err?.message || 'Failed to update add-on');
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => addonInventoryService.deleteAddon(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['addons'] });
            toast.success(`Add-on "${deletingAddon?.name}" deleted successfully`);
            setDeletingAddon(null);
        },
        onError: (err: any) => {
            console.error('Error deleting addon:', err);
            toast.error(err?.message || 'Failed to delete add-on');
        },
    });

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCategory, selectedStatus]);

    // Populate form when editing an addon
    const handleOpenEdit = (addon: Addon) => {
        setEditingAddon(addon);
        const isPredefined = PREDEFINED_ADDON_CATEGORIES.includes(addon.category as any);
        setFormData({
            name: addon.name,
            category: isPredefined ? addon.category : 'Other',
            customCategory: isPredefined ? '' : addon.category,
            purchase_price: String(addon.purchase_price),
            selling_price: String(addon.selling_price),
            stock: String(addon.stock),
            status: addon.status,
        });
        setIsFormOpen(true);
    };

    // Open create form
    const handleOpenCreate = () => {
        setEditingAddon(null);
        setFormData(DEFAULT_FORM_DATA);
        setIsFormOpen(true);
    };

    // Form submit handler
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedName = formData.name.trim();
        if (!trimmedName) {
            toast.error('Add-on name is required');
            return;
        }

        const finalCategory =
            formData.category === 'Other' && formData.customCategory.trim()
                ? formData.customCategory.trim()
                : formData.category.trim();

        if (!finalCategory) {
            toast.error('Category is required');
            return;
        }

        const purchasePrice = Number(formData.purchase_price);
        if (isNaN(purchasePrice) || purchasePrice < 0) {
            toast.error('Please enter a valid purchase price (cannot be negative)');
            return;
        }

        const sellingPrice = Number(formData.selling_price);
        if (isNaN(sellingPrice) || sellingPrice < 0) {
            toast.error('Please enter a valid selling price (cannot be negative)');
            return;
        }

        const stock = parseInt(formData.stock, 10);
        if (isNaN(stock) || stock < 0) {
            toast.error('Please enter a valid stock count (cannot be negative)');
            return;
        }

        const dto: CreateAddonDTO = {
            name: trimmedName,
            category: finalCategory,
            purchase_price: purchasePrice,
            selling_price: sellingPrice,
            stock,
            status: formData.status,
        };

        if (editingAddon) {
            updateMutation.mutate({ id: editingAddon.id, dto });
        } else {
            createMutation.mutate(dto);
        }
    };

    // Available categories (predefined + any custom in DB)
    const allCategories = useMemo(() => {
        const catSet = new Set<string>(PREDEFINED_ADDON_CATEGORIES);
        addons.forEach((a) => {
            if (a.category) catSet.add(a.category);
        });
        return Array.from(catSet);
    }, [addons]);

    // KPI stats
    const stats = useMemo(() => {
        let totalUnits = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        let totalSellingValue = 0;
        let totalCostValue = 0;

        if (Array.isArray(addons)) {
            addons.forEach((a) => {
                const stock = Number(a.stock) || 0;
                const sp = Number(a.selling_price) || 0;
                const pp = Number(a.purchase_price) || 0;
                totalUnits += stock;
                if (stock === 0) outOfStockCount++;
                else if (stock < 5) lowStockCount++;
                totalSellingValue += stock * sp;
                totalCostValue += stock * pp;
            });
        }

        return {
            totalAddons: Array.isArray(addons) ? addons.length : 0,
            totalUnits,
            lowStockCount,
            outOfStockCount,
            totalSellingValue,
            totalCostValue,
            ownStockValuation: totalCostValue,
            retailStockValuation: totalSellingValue,
        };
    }, [addons]);

    // Filtered addons
    const filteredAddons = useMemo(() => {
        return addons.filter((addon) => {
            // Search filter
            const query = searchTerm.toLowerCase().trim();
            const matchesSearch =
                !query ||
                addon.name.toLowerCase().includes(query) ||
                addon.category.toLowerCase().includes(query);

            // Category filter
            const matchesCategory =
                selectedCategory === 'All' || addon.category.toLowerCase() === selectedCategory.toLowerCase();

            // Status filter
            const matchesStatus =
                selectedStatus === 'All' || addon.status === selectedStatus;

            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [addons, searchTerm, selectedCategory, selectedStatus]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredAddons.length / ITEMS_PER_PAGE));
    const paginatedAddons = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredAddons.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredAddons, currentPage]);

    const isSaving = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="space-y-5 max-w-7xl mx-auto px-2 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-maroon to-maroon-dark text-gold rounded-xl shadow-md shadow-maroon/20">
                        <PackagePlus className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl md:text-2xl font-bold font-serif text-maroon tracking-wide">
                                Add-ons &amp; Accessories
                            </h1>
                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-mono">
                                {addons.length} items
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 font-sans">
                            Maintain blouse pieces, petticoats, fall &amp; pico, packaging, and saree add-on inventory
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="border-gold/40 text-maroon hover:bg-gold/10 gap-1.5 h-9 px-3.5 text-xs font-bold transition-all shadow-sm bg-white cursor-pointer"
                        onClick={() => refetch()}
                        disabled={isFetching}
                    >
                        <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        className="bg-gradient-to-r from-maroon to-maroon-dark text-gold gap-1.5 h-9 px-4 text-xs font-bold shadow-md shadow-maroon/20 hover:shadow-lg hover:shadow-maroon/30 transition-all cursor-pointer"
                        onClick={handleOpenCreate}
                    >
                        <Plus className="h-4 w-4" />
                        Add New Add-on
                    </Button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {/* Total Items */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                    <Card className="border-gold/20 shadow-xs hover:shadow-md transition-shadow bg-white">
                        <CardContent className="p-3 flex items-center justify-between gap-2">
                            <div className="space-y-0.5 min-w-0">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Total Items</span>
                                <span className="text-lg sm:text-xl font-bold font-mono text-gray-800 block leading-tight">{stats.totalAddons}</span>
                                <span className="text-[9px] text-gray-400 block truncate">Catalogue products</span>
                            </div>
                            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-slate-600 to-slate-800 rounded-lg text-white shadow-xs shrink-0">
                                <Layers className="h-4 w-4" />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Units In Stock */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.04 }}>
                    <Card className="border-gold/20 shadow-xs hover:shadow-md transition-shadow bg-white">
                        <CardContent className="p-3 flex items-center justify-between gap-2">
                            <div className="space-y-0.5 min-w-0">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Units In Stock</span>
                                <span className="text-lg sm:text-xl font-bold font-mono text-indigo-600 block leading-tight">{stats.totalUnits.toLocaleString('en-IN')}</span>
                                <span className="text-[9px] text-gray-400 block truncate">Available stock</span>
                            </div>
                            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg text-white shadow-xs shrink-0">
                                <Boxes className="h-4 w-4" />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Low / Out of Stock */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.08 }}>
                    <Card className="border-gold/20 shadow-xs hover:shadow-md transition-shadow bg-white">
                        <CardContent className="p-3 flex items-center justify-between gap-2">
                            <div className="space-y-0.5 min-w-0">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Low / Out Stock</span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-lg sm:text-xl font-bold font-mono text-amber-600 block leading-tight">{stats.lowStockCount}</span>
                                    {stats.outOfStockCount > 0 && (
                                        <span className="text-[10px] font-bold text-red-700 bg-red-50 px-1 py-0.2 rounded border border-red-200">
                                            {stats.outOfStockCount} Out
                                        </span>
                                    )}
                                </div>
                                <span className="text-[9px] text-gray-400 block truncate">Restock attention</span>
                            </div>
                            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg text-white shadow-xs shrink-0">
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Own Stock Valuation (Cost) */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.12 }}>
                    <Card className="border-gold/20 shadow-xs hover:shadow-md transition-shadow bg-white">
                        <CardContent className="p-3 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    Own Stock Valuation
                                </span>
                                <div className="p-1.5 bg-gradient-to-br from-teal-600 to-teal-800 rounded-lg text-white shadow-xs shrink-0">
                                    <Wallet className="h-3.5 w-3.5" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2 flex-wrap pt-0.5">
                                <span className="text-lg sm:text-xl font-bold font-mono text-teal-700 tracking-tight select-all">
                                    ₹{stats.totalCostValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </span>
                                {stats.totalCostValue >= 100000 && (
                                    <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                        {formatIndianCompact(stats.totalCostValue)}
                                    </span>
                                )}
                            </div>
                            <span className="text-[9px] text-gray-400 block truncate">
                                At purchase cost ({stats.totalUnits} units)
                            </span>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Retail Valuation */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.16 }}>
                    <Card className="border-gold/20 shadow-xs hover:shadow-md transition-shadow bg-white">
                        <CardContent className="p-3 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    Retail Valuation
                                </span>
                                <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg text-white shadow-xs shrink-0">
                                    <IndianRupee className="h-3.5 w-3.5" />
                                </div>
                            </div>
                            <div className="flex items-baseline gap-2 flex-wrap pt-0.5">
                                <span className="text-lg sm:text-xl font-bold font-mono text-emerald-600 tracking-tight select-all">
                                    ₹{stats.totalSellingValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </span>
                                {stats.totalSellingValue >= 100000 && (
                                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                        {formatIndianCompact(stats.totalSellingValue)}
                                    </span>
                                )}
                            </div>
                            <span className="text-[9px] text-gray-400 block truncate">
                                At selling price ({stats.totalUnits} units)
                            </span>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Controls Bar */}
            <Card className="border-gold/20 shadow-sm bg-white">
                <CardContent className="p-3.5 space-y-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search by add-on name or category..."
                                className="pl-9 h-10 text-sm border-gold/30 bg-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="w-36">
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger className="h-10 text-xs border-gold/30 bg-white">
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent className="border-gold/20">
                                        <SelectItem value="All" className="text-xs">All Categories</SelectItem>
                                        {allCategories.map((cat) => (
                                            <SelectItem key={cat} value={cat} className="text-xs">
                                                {cat}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="w-32">
                                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                    <SelectTrigger className="h-10 text-xs border-gold/30 bg-white">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent className="border-gold/20">
                                        <SelectItem value="All" className="text-xs">All Status</SelectItem>
                                        <SelectItem value="active" className="text-xs">Active Only</SelectItem>
                                        <SelectItem value="inactive" className="text-xs">Inactive Only</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {(searchTerm || selectedCategory !== 'All' || selectedStatus !== 'All') && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSearchTerm('');
                                        setSelectedCategory('All');
                                        setSelectedStatus('All');
                                    }}
                                    className="h-10 px-3 text-xs border-gold/40 text-maroon hover:bg-gold/10 font-bold transition-all cursor-pointer"
                                >
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Add-ons Data Register Card */}
            <Card className="border-gold/20 shadow-md bg-white overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/15 px-4 py-3 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <CardTitle className="text-sm font-bold text-maroon uppercase tracking-wider flex items-center gap-2">
                                <PackagePlus className="w-4 h-4 text-maroon" />
                                Add-ons & Accessories Register
                            </CardTitle>
                            <CardDescription className="text-xs text-stone-500 mt-0.5">
                                Showing {filteredAddons.length} registered item{filteredAddons.length === 1 ? '' : 's'} &bull; Own Cost Stock: ₹{(stats.totalCostValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} &bull; Retail Value: ₹{(stats.totalSellingValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="py-16 text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-maroon mx-auto mb-2" />
                            <p className="text-xs text-stone-500 font-medium">Loading add-ons inventory...</p>
                        </div>
                    ) : filteredAddons.length === 0 ? (
                        <div className="py-16 text-center px-4">
                            <div className="w-12 h-12 rounded-full bg-cream text-maroon flex items-center justify-center mx-auto mb-3 border border-gold/30">
                                <PackagePlus className="w-6 h-6" />
                            </div>
                            <h3 className="text-base font-serif font-bold text-stone-800">No add-ons found</h3>
                            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                                {searchTerm || selectedCategory !== 'All' || selectedStatus !== 'All'
                                    ? 'No add-on records match your current filter settings.'
                                    : 'Start by adding your first accessory or add-on product to inventory.'}
                            </p>
                            <div className="mt-4 flex items-center justify-center gap-2">
                                {searchTerm || selectedCategory !== 'All' || selectedStatus !== 'All' ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setSearchTerm('');
                                            setSelectedCategory('All');
                                            setSelectedStatus('All');
                                        }}
                                        className="text-xs border-gold/40 text-maroon hover:bg-gold/10 font-bold"
                                    >
                                        Clear Filters
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        onClick={handleOpenCreate}
                                        className="bg-maroon hover:bg-maroon-dark text-gold font-bold text-xs shadow-sm"
                                    >
                                        <Plus className="w-3.5 h-3.5 mr-1" />
                                        ADD ADD-ON
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-cream/40 border-b border-gold/20">
                                    <TableRow className="text-[11px] font-bold uppercase tracking-wider text-maroon">
                                        <TableHead className="py-3 px-4 text-maroon">Name</TableHead>
                                        <TableHead className="py-3 px-3 text-maroon">Category</TableHead>
                                        <TableHead className="py-3 px-3 text-right text-maroon">Purchase Price</TableHead>
                                        <TableHead className="py-3 px-3 text-right text-maroon">Selling Price</TableHead>
                                        <TableHead className="py-3 px-3 text-center text-maroon">Stock</TableHead>
                                        <TableHead className="py-3 px-3 text-center text-maroon">Status</TableHead>
                                        <TableHead className="py-3 px-3 text-right text-maroon">Created At</TableHead>
                                        <TableHead className="py-3 px-4 text-right text-maroon">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedAddons.map((addon) => {
                                        const isLowStock = addon.stock > 0 && addon.stock < 5;
                                        const isOutOfStock = addon.stock === 0;

                                        return (
                                            <TableRow
                                                key={addon.id}
                                                className="hover:bg-cream/15 border-b border-gold/10 text-xs transition-colors"
                                            >
                                                {/* Name */}
                                                <TableCell className="py-3 px-4 font-semibold text-stone-900 font-serif">
                                                    <div>{addon.name}</div>
                                                </TableCell>

                                                {/* Category */}
                                                <TableCell className="py-3 px-3">
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[11px] font-medium bg-cream/50 text-maroon border border-gold/30"
                                                    >
                                                        {addon.category}
                                                    </Badge>
                                                </TableCell>

                                                {/* Purchase Price */}
                                                <TableCell className="py-3 px-3 text-right font-mono text-stone-700">
                                                    <div>₹{(addon.purchase_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                    <div className="text-[10px] text-maroon/70 font-sans font-medium" title="Own stock valuation for this item">
                                                        Own: ₹{((addon.stock || 0) * (addon.purchase_price || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                    </div>
                                                </TableCell>

                                                {/* Selling Price */}
                                                <TableCell className="py-3 px-3 text-right font-mono font-bold text-maroon">
                                                    <div>₹{(addon.selling_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                    <div className="text-[10px] text-stone-500 font-sans font-normal" title="Retail stock valuation for this item">
                                                        Retail: ₹{((addon.stock || 0) * (addon.selling_price || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                    </div>
                                                </TableCell>

                                                {/* Stock */}
                                                <TableCell className="py-3 px-3 text-center">
                                                    <Badge
                                                        className={cn(
                                                            'font-mono text-xs font-bold px-2.5 py-0.5',
                                                            isOutOfStock
                                                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                                                : isLowStock
                                                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                        )}
                                                    >
                                                        {addon.stock} {isOutOfStock ? '(Out)' : isLowStock ? '(Low)' : ''}
                                                    </Badge>
                                                </TableCell>

                                                {/* Status */}
                                                <TableCell className="py-3 px-3 text-center">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            'text-[10px] font-bold uppercase tracking-wider',
                                                            addon.status === 'active'
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                                                : 'bg-stone-100 text-stone-600 border-stone-300'
                                                        )}
                                                    >
                                                        {addon.status === 'active' ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>

                                                {/* Created At */}
                                                <TableCell className="py-3 px-3 text-right text-stone-500 font-mono text-[11px]">
                                                    {addon.created_at
                                                        ? new Date(addon.created_at).toLocaleDateString('en-IN', {
                                                              day: '2-digit',
                                                              month: 'short',
                                                              year: 'numeric',
                                                          })
                                                        : 'N/A'}
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleOpenEdit(addon)}
                                                            className="h-7 w-7 p-0 border-gold/40 text-maroon hover:bg-gold/10 hover:text-maroon-dark transition-all cursor-pointer"
                                                            title="Edit Add-on"
                                                        >
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setDeletingAddon(addon)}
                                                            className="h-7 w-7 p-0 border-rose-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-all cursor-pointer"
                                                            title="Delete Add-on"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-cream/20 border-t border-gold/15 text-xs">
                                    <span className="text-stone-600">
                                        Showing{' '}
                                        <span className="font-bold text-maroon">
                                            {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                                        </span>{' '}
                                        to{' '}
                                        <span className="font-bold text-maroon">
                                            {Math.min(currentPage * ITEMS_PER_PAGE, filteredAddons.length)}
                                        </span>{' '}
                                        of{' '}
                                        <span className="font-bold text-maroon">
                                            {filteredAddons.length}
                                        </span>{' '}
                                        add-ons
                                    </span>

                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="h-8 w-8 p-0 border-gold/30 text-maroon hover:bg-gold/10 hover:border-gold/50 cursor-pointer disabled:opacity-40"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>

                                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                                            .filter(
                                                (p) =>
                                                    p === 1 ||
                                                    p === totalPages ||
                                                    Math.abs(p - currentPage) <= 1
                                            )
                                            .map((p, idx, arr) => (
                                                <React.Fragment key={p}>
                                                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                                                        <span className="text-stone-400 px-0.5">&hellip;</span>
                                                    )}
                                                    <Button
                                                        variant={currentPage === p ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => setCurrentPage(p)}
                                                        className={cn(
                                                            'h-8 w-8 p-0 text-xs font-bold transition-all cursor-pointer',
                                                            currentPage === p
                                                                ? 'bg-maroon text-gold hover:bg-maroon-dark shadow-sm'
                                                                : 'border-gold/30 text-maroon hover:bg-cream/40'
                                                        )}
                                                    >
                                                        {p}
                                                    </Button>
                                                </React.Fragment>
                                            ))}

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="h-8 w-8 p-0 border-gold/30 text-maroon hover:bg-gold/10 hover:border-gold/50 cursor-pointer disabled:opacity-40"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal: Add / Edit Add-on */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-lg bg-white border-gold/30 shadow-2xl p-6">
                    <DialogHeader className="border-b border-gold/15 pb-3">
                        <DialogTitle className="text-lg font-serif font-bold text-maroon flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-maroon/10 border border-gold/30 flex items-center justify-center text-maroon">
                                <PackagePlus className="w-4 h-4 text-maroon" />
                            </div>
                            {editingAddon ? 'EDIT ADD-ON ITEM' : 'REGISTER NEW ADD-ON'}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-stone-500 mt-1">
                            Configure inventory details, pricing, and stock count for this saree accessory.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 pt-3">
                        {/* Name */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-maroon uppercase tracking-wider block">
                                Add-on Name <span className="text-rose-500">*</span>
                            </label>
                            <Input
                                placeholder="e.g. Blouse Piece, Petticoat, Saree Cover..."
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="h-9 text-xs border-gold/30 focus-visible:ring-1 focus-visible:ring-gold focus-visible:border-maroon"
                            />
                        </div>

                        {/* Category */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-maroon uppercase tracking-wider block">
                                Category <span className="text-rose-500">*</span>
                            </label>
                            <Select
                                value={formData.category}
                                onValueChange={(val) => setFormData({ ...formData, category: val })}
                            >
                                <SelectTrigger className="h-9 text-xs border-gold/30 bg-white focus:ring-1 focus:ring-gold">
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent className="border-gold/20">
                                    {PREDEFINED_ADDON_CATEGORIES.map((cat) => (
                                        <SelectItem key={cat} value={cat} className="text-xs">
                                            {cat}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {formData.category === 'Other' && (
                                <Input
                                    placeholder="Enter custom category name..."
                                    value={formData.customCategory}
                                    onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                                    required
                                    className="h-8 text-xs border-gold/30 mt-1.5 focus-visible:ring-1 focus-visible:ring-gold"
                                />
                            )}
                        </div>

                        {/* Prices Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-maroon uppercase tracking-wider block">
                                    Purchase Price (₹) <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-mono">₹</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.purchase_price}
                                        onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                                        required
                                        className="h-9 pl-7 text-xs border-gold/30 font-mono focus-visible:ring-1 focus-visible:ring-gold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-maroon uppercase tracking-wider block">
                                    Selling Price (₹) <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-maroon text-xs font-mono font-bold">₹</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.selling_price}
                                        onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                                        required
                                        className="h-9 pl-7 text-xs border-gold/30 font-mono font-bold text-maroon focus-visible:ring-1 focus-visible:ring-gold"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Stock & Status Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-maroon uppercase tracking-wider block">
                                    Initial Stock <span className="text-rose-500">*</span>
                                </label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="0"
                                    value={formData.stock}
                                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                    required
                                    className="h-9 text-xs border-gold/30 font-mono focus-visible:ring-1 focus-visible:ring-gold"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-maroon uppercase tracking-wider block">
                                    Status <span className="text-rose-500">*</span>
                                </label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(val: 'active' | 'inactive') =>
                                        setFormData({ ...formData, status: val })
                                    }
                                >
                                    <SelectTrigger className="h-9 text-xs border-gold/30 bg-white focus:ring-1 focus:ring-gold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="border-gold/20">
                                        <SelectItem value="active" className="text-xs font-medium text-emerald-700">Active (Available)</SelectItem>
                                        <SelectItem value="inactive" className="text-xs font-medium text-stone-500">Inactive (Hidden)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter className="pt-3 border-t border-gold/15 flex items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsFormOpen(false)}
                                disabled={isSaving}
                                className="h-8 text-xs border-gold/30 text-stone-700 hover:bg-cream/40"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isSaving}
                                className="bg-maroon hover:bg-maroon-dark text-gold font-bold h-8 text-xs px-4 flex items-center gap-1.5 shadow-md cursor-pointer"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        {editingAddon ? 'Update Add-on' : 'Create Add-on'}
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Delete Confirmation Dialog */}
            <Dialog open={!!deletingAddon} onOpenChange={(open) => !open && setDeletingAddon(null)}>
                <DialogContent className="max-w-md bg-white border-gold/30 shadow-2xl p-6">
                    <DialogHeader className="flex flex-row items-center gap-3 space-y-0 pb-3 border-b border-gold/15">
                        <div className="p-2.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-stone-900 font-serif">
                                Delete Add-on Item
                            </DialogTitle>
                            <DialogDescription className="text-xs text-stone-500 mt-0.5">
                                Please confirm before removing this accessory from inventory.
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    <div className="py-3 text-xs text-stone-700 leading-relaxed">
                        Are you sure you want to delete add-on{' '}
                        <span className="font-bold text-maroon font-serif">"{deletingAddon?.name}"</span>?
                        <div className="text-[11px] text-stone-600 mt-3 bg-cream/40 p-3 rounded-lg border border-gold/20">
                            <span className="font-bold text-stone-800">Warning:</span> This will permanently remove the record and its stock balance (<span className="font-bold text-maroon">{deletingAddon?.stock} units</span>) from the database.
                        </div>
                    </div>

                    <DialogFooter className="pt-2 flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingAddon(null)}
                            disabled={deleteMutation.isPending}
                            className="h-8 text-xs border-gold/30 text-stone-700 hover:bg-cream/40"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => deletingAddon && deleteMutation.mutate(deletingAddon.id)}
                            disabled={deleteMutation.isPending}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-8 text-xs px-4 flex items-center gap-1.5 shadow-md cursor-pointer"
                        >
                            {deleteMutation.isPending ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete Add-on
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
