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
    AlertTriangle,
    IndianRupee,
    Layers,
    X,
    Loader2,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

        addons.forEach((a) => {
            totalUnits += a.stock;
            if (a.stock === 0) outOfStockCount++;
            else if (a.stock < 5) lowStockCount++;
            totalSellingValue += a.stock * a.selling_price;
            totalCostValue += a.stock * a.purchase_price;
        });

        return {
            totalAddons: addons.length,
            totalUnits,
            lowStockCount,
            outOfStockCount,
            totalSellingValue,
            totalCostValue,
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
        <div className="space-y-4 max-w-7xl mx-auto px-2">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gold/20 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-maroon/10 text-maroon flex items-center justify-center border border-gold/30 shrink-0">
                        <PackagePlus className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 tracking-wide">
                                ADD-ONS &amp; ACCESSORIES
                            </h1>
                            <Badge variant="outline" className="border-gold/40 text-maroon bg-cream/30 text-xs font-semibold">
                                {addons.length} Items
                            </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                            Maintain blouse pieces, petticoats, fall &amp; pico, packaging, and saree add-on inventory.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="flex items-center gap-1.5 text-xs text-maroon border-gold/30 hover:bg-gold/10 bg-white cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleOpenCreate}
                        className="bg-maroon hover:bg-maroon-dark text-gold font-bold shadow-sm text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        ADD ADD-ON
                    </Button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card className="border-gold/20 shadow-xs bg-white">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200/60">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-xs text-stone-500 font-medium block">Total Add-on Items</span>
                            <span className="text-xl font-serif font-bold text-stone-900">
                                {stats.totalAddons}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-gold/20 shadow-xs bg-white">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/60">
                            <Package className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-xs text-stone-500 font-medium block">Total Units In Stock</span>
                            <span className="text-xl font-serif font-bold text-stone-900">
                                {stats.totalUnits.toLocaleString('en-IN')}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-gold/20 shadow-xs bg-white">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/60">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-xs text-stone-500 font-medium block">Low / Out of Stock</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-serif font-bold text-amber-900">
                                    {stats.lowStockCount}
                                </span>
                                {stats.outOfStockCount > 0 && (
                                    <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                        {stats.outOfStockCount} Out
                                    </span>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-gold/20 shadow-xs bg-white">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200/60">
                            <IndianRupee className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-xs text-stone-500 font-medium block">Stock Valuation (Retail)</span>
                            <span className="text-xl font-serif font-bold text-stone-900">
                                ₹{stats.totalSellingValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter & Table Card */}
            <Card className="border-gold/20 shadow-md bg-white">
                <CardHeader className="bg-cream/20 border-b border-gold/10 p-3 sm:p-4">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                            <Input
                                placeholder="Search by add-on name or category..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-9 pl-9 text-xs border-gold/30 bg-white"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Category & Status Dropdown Filters */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="w-36">
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger className="h-9 text-xs border-gold/30 bg-white">
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
                                    <SelectTrigger className="h-9 text-xs border-gold/30 bg-white">
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
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSearchTerm('');
                                        setSelectedCategory('All');
                                        setSelectedStatus('All');
                                    }}
                                    className="h-9 px-2 text-xs text-stone-500 hover:text-stone-900 cursor-pointer"
                                >
                                    Reset
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="py-16 text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-maroon mx-auto mb-2" />
                            <p className="text-xs text-stone-500">Loading add-ons inventory...</p>
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
                                        className="text-xs border-gold/30 text-maroon hover:bg-cream/20"
                                    >
                                        Clear Filters
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        onClick={handleOpenCreate}
                                        className="bg-maroon hover:bg-maroon-dark text-gold font-bold text-xs"
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
                                <TableHeader className="bg-stone-50 border-b border-stone-200">
                                    <TableRow className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
                                        <TableHead className="py-3 px-4">Name</TableHead>
                                        <TableHead className="py-3 px-3">Category</TableHead>
                                        <TableHead className="py-3 px-3 text-right">Purchase Price</TableHead>
                                        <TableHead className="py-3 px-3 text-right">Selling Price</TableHead>
                                        <TableHead className="py-3 px-3 text-center">Stock</TableHead>
                                        <TableHead className="py-3 px-3 text-center">Status</TableHead>
                                        <TableHead className="py-3 px-3 text-right">Created At</TableHead>
                                        <TableHead className="py-3 px-4 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedAddons.map((addon) => {
                                        const isLowStock = addon.stock > 0 && addon.stock < 5;
                                        const isOutOfStock = addon.stock === 0;

                                        return (
                                            <TableRow
                                                key={addon.id}
                                                className="hover:bg-cream/10 border-b border-stone-100 text-xs transition-colors"
                                            >
                                                {/* Name */}
                                                <TableCell className="py-3 px-4 font-semibold text-stone-900">
                                                    <div>{addon.name}</div>
                                                </TableCell>

                                                {/* Category */}
                                                <TableCell className="py-3 px-3">
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[11px] font-medium bg-stone-50 text-stone-700 border-stone-200"
                                                    >
                                                        {addon.category}
                                                    </Badge>
                                                </TableCell>

                                                {/* Purchase Price */}
                                                <TableCell className="py-3 px-3 text-right font-mono text-stone-600">
                                                    ₹{addon.purchase_price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </TableCell>

                                                {/* Selling Price */}
                                                <TableCell className="py-3 px-3 text-right font-mono font-bold text-maroon">
                                                    ₹{addon.selling_price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </TableCell>

                                                {/* Stock */}
                                                <TableCell className="py-3 px-3 text-center">
                                                    <Badge
                                                        className={cn(
                                                            'font-mono text-xs font-bold px-2 py-0.5',
                                                            isOutOfStock
                                                                ? 'bg-rose-100 text-rose-700 border border-rose-300'
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
                                                <TableCell className="py-3 px-3 text-right text-stone-400 font-mono text-[11px]">
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
                                                            className="h-7 w-7 p-0 border-gold/30 text-stone-700 hover:text-maroon hover:bg-cream/30"
                                                            title="Edit Add-on"
                                                        >
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setDeletingAddon(addon)}
                                                            className="h-7 w-7 p-0 border-rose-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
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
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-stone-50 border-t border-stone-200 text-xs">
                                    <span className="text-stone-500">
                                        Showing{' '}
                                        <span className="font-semibold text-stone-800">
                                            {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                                        </span>{' '}
                                        to{' '}
                                        <span className="font-semibold text-stone-800">
                                            {Math.min(currentPage * ITEMS_PER_PAGE, filteredAddons.length)}
                                        </span>{' '}
                                        of{' '}
                                        <span className="font-semibold text-stone-800">
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
                                            className="h-8 w-8 p-0 border-gold/30 text-maroon hover:bg-cream/20"
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
                                                        <span className="text-stone-400 px-0.5">...</span>
                                                    )}
                                                    <Button
                                                        variant={currentPage === p ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => setCurrentPage(p)}
                                                        className={cn(
                                                            'h-8 w-8 p-0 text-xs font-bold',
                                                            currentPage === p
                                                                ? 'bg-maroon text-gold hover:bg-maroon-dark'
                                                                : 'border-gold/30 text-maroon hover:bg-cream/20'
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
                                            className="h-8 w-8 p-0 border-gold/30 text-maroon hover:bg-cream/20"
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
                <DialogContent className="max-w-lg bg-white border-gold/20 shadow-2xl p-5">
                    <DialogHeader className="border-b border-gold/15 pb-2.5">
                        <DialogTitle className="text-lg font-serif font-bold text-maroon flex items-center gap-2">
                            <PackagePlus className="w-5 h-5 text-maroon" />
                            {editingAddon ? 'EDIT ADD-ON ITEM' : 'REGISTER NEW ADD-ON'}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-stone-500">
                            Configure inventory details, pricing, and stock count for this saree accessory.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
                        {/* Name */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                                Add-on Name <span className="text-rose-500">*</span>
                            </label>
                            <Input
                                placeholder="e.g. Blouse Piece, Petticoat, Saree Cover..."
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="h-9 text-xs border-gold/30"
                            />
                        </div>

                        {/* Category */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                                Category <span className="text-rose-500">*</span>
                            </label>
                            <Select
                                value={formData.category}
                                onValueChange={(val) => setFormData({ ...formData, category: val })}
                            >
                                <SelectTrigger className="h-9 text-xs border-gold/30 bg-white">
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
                                    className="h-8 text-xs border-gold/30 mt-1.5"
                                />
                            )}
                        </div>

                        {/* Prices Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                                    Purchase Price (₹) <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs">₹</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.purchase_price}
                                        onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                                        required
                                        className="h-9 pl-7 text-xs border-gold/30"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                                    Selling Price (₹) <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs">₹</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.selling_price}
                                        onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                                        required
                                        className="h-9 pl-7 text-xs border-gold/30 font-semibold text-maroon"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Stock & Status Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
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
                                    className="h-9 text-xs border-gold/30 font-mono"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                                    Status <span className="text-rose-500">*</span>
                                </label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(val: 'active' | 'inactive') =>
                                        setFormData({ ...formData, status: val })
                                    }
                                >
                                    <SelectTrigger className="h-9 text-xs border-gold/30 bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="border-gold/20">
                                        <SelectItem value="active" className="text-xs">Active (Available)</SelectItem>
                                        <SelectItem value="inactive" className="text-xs">Inactive (Hidden)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsFormOpen(false)}
                                disabled={isSaving}
                                className="h-8 text-xs border-stone-300"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isSaving}
                                className="bg-maroon hover:bg-maroon-dark text-gold font-bold h-8 text-xs px-4 flex items-center gap-1.5 shadow-sm cursor-pointer"
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
                <DialogContent className="max-w-md bg-white border-gold/20 shadow-2xl p-5">
                    <DialogHeader className="flex flex-row items-center gap-3 space-y-0 pb-2 border-b border-stone-100">
                        <div className="p-2.5 rounded-full bg-rose-50 text-rose-600 shrink-0">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-stone-900 font-serif">
                                Delete Add-on Item
                            </DialogTitle>
                            <DialogDescription className="text-xs text-stone-500 mt-0.5">
                                Please confirm before removing this accessory.
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    <div className="py-3 text-xs text-stone-700">
                        Are you sure you want to delete add-on{' '}
                        <span className="font-bold text-stone-900 font-serif">"{deletingAddon?.name}"</span>?
                        <p className="text-[11px] text-stone-500 mt-2 bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                            This will permanently remove the record and its stock balance ({deletingAddon?.stock} units) from the database.
                        </p>
                    </div>

                    <DialogFooter className="pt-2 flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingAddon(null)}
                            disabled={deleteMutation.isPending}
                            className="h-8 text-xs border-stone-300"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => deletingAddon && deleteMutation.mutate(deletingAddon.id)}
                            disabled={deleteMutation.isPending}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-8 text-xs px-4 flex items-center gap-1.5 shadow-sm cursor-pointer"
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
