import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService, categoryService, type Saree } from '@/services/inventoryService';
import {
    Plus,
    Search,
    Filter,
    FileUp,
    MoreHorizontal,
    Edit,
    Trash2,
    Loader2,
    Barcode as BarcodeIcon,
    ChevronLeft,
    ChevronRight,
    Package,
    Boxes,
    PackageX,
    IndianRupee,
    AlertTriangle,
    Sparkles,
    Printer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { SareeForm } from '@/components/inventory/SareeForm';
import { BarcodeGenerator } from '@/components/inventory/BarcodeGenerator';
import { BatchBarcodePrinter } from '@/components/inventory/BatchBarcodePrinter';
import { CsvImportModal } from '@/components/inventory/CsvImportModal';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

export default function InventoryPage() {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [currentPage, setCurrentPage] = React.useState(1);
    const itemsPerPage = 20;

    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingSaree, setEditingSaree] = React.useState<Saree | undefined>();
    const [barcodeToShow, setBarcodeToShow] = React.useState<Saree | null>(null);
    const [isBatchBarcodeOpen, setIsBatchBarcodeOpen] = React.useState(false);
    const [isImportOpen, setIsImportOpen] = React.useState(false);
    const [galleryState, setGalleryState] = React.useState<{ images: { imageUrl: string }[], title: string } | null>(null);
    const [galleryActiveIndex, setGalleryActiveIndex] = React.useState<number>(0);
    const [isSeeding, setIsSeeding] = React.useState(false);

    const queryClient = useQueryClient();

    const handleSeedImages = async () => {
        if (!sarees || sarees.length === 0) {
            toast.error("No sarees found to seed images for");
            return;
        }

        setIsSeeding(true);
        const toastId = toast.loading("Checking inventory database and seeding missing images...");

        try {
            const mockSareeImages = [
                "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80",
                "https://images.unsplash.com/photo-1621184455862-c163dfb30e0f?auto=format&fit=crop&w=600&q=80"
            ];

            let seededCount = 0;

            for (const saree of sarees) {
                const currentImagesCount = saree.images?.length || 0;
                if (currentImagesCount < 2) {
                    const needed = 2 - currentImagesCount;
                    const inserts = [];

                    for (let i = 0; i < needed; i++) {
                        const randomUrl = mockSareeImages[Math.floor(Math.random() * mockSareeImages.length)];
                        inserts.push({
                            inventory_id: saree.id,
                            image_url: randomUrl,
                            is_primary: currentImagesCount === 0 && i === 0,
                            sort_order: currentImagesCount + i
                        });
                    }

                    if (inserts.length > 0) {
                        const { error } = await supabase
                            .from('inventory_images')
                            .insert(inserts);

                        if (error) {
                            console.error(`Failed to insert images for saree ${saree.id}:`, error);
                            throw error;
                        }
                        seededCount++;
                    }
                }
            }

            await queryClient.invalidateQueries({ queryKey: ['sarees'] });
            toast.success(`Seeded missing images for ${seededCount} sarees!`, { id: toastId });
        } catch (err: any) {
            console.error(err);
            toast.error(`Error seeding images: ${err.message || err}`, { id: toastId });
        } finally {
            setIsSeeding(false);
        }
    };

    // Filter states
    const [isFilterPanelOpen, setIsFilterPanelOpen] = React.useState(false);
    const [selectedCategory, setSelectedCategory] = React.useState('All');
    const [selectedFabric, setSelectedFabric] = React.useState('All');
    const [stockFilter, setStockFilter] = React.useState('All'); // 'All' | 'in_stock' | 'low_stock' | 'out_of_stock'
    const [statusFilter, setStatusFilter] = React.useState('All'); // 'All' | 'active' | 'inactive'
    const [minPrice, setMinPrice] = React.useState('');
    const [maxPrice, setMaxPrice] = React.useState('');

    const { data: sarees, isLoading } = useQuery({
        queryKey: ['sarees'],
        queryFn: inventoryService.getSarees
    });

    // Reset pagination when search or filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCategory, selectedFabric, stockFilter, statusFilter, minPrice, maxPrice]);

    const createMutation = useMutation({
        mutationFn: ({ saree, images }: { saree: any; images: any[] }) =>
            inventoryService.createSaree(saree, images),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['sarees'] });
            setIsFormOpen(false);
            setBarcodeToShow(data);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({
            id,
            data,
            imagesToUpload,
            imagesToDelete,
            primaryImageId
        }: {
            id: string;
            data: any;
            imagesToUpload?: any[];
            imagesToDelete?: any[];
            primaryImageId?: string
        }) =>
            inventoryService.updateSaree(id, data, imagesToUpload, imagesToDelete, primaryImageId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sarees'] });
            setIsFormOpen(false);
            setEditingSaree(undefined);
        }
    });
    const { data: dbCategories } = useQuery({
        queryKey: ['categories'],
        queryFn: categoryService.getCategories
    });

    const categories = React.useMemo(() => {
        const set = new Set<string>();
        if (Array.isArray(dbCategories)) {
            dbCategories.forEach(c => {
                if (c.status === 'active') set.add(c.name);
            });
        }
        if (Array.isArray(sarees)) {
            sarees.forEach(s => {
                if (s.category) set.add(s.category);
            });
        }
        return Array.from(set).sort();
    }, [dbCategories, sarees]);

    const fabrics = React.useMemo(() => {
        if (!Array.isArray(sarees)) return [];
        return Array.from(new Set(sarees.map(s => s.fabric).filter(Boolean))).sort();
    }, [sarees]);

    const activeFiltersCount = React.useMemo(() => {
        let count = 0;
        if (selectedCategory !== 'All') count++;
        if (selectedFabric !== 'All') count++;
        if (stockFilter !== 'All') count++;
        if (statusFilter !== 'All') count++;
        if (minPrice !== '') count++;
        if (maxPrice !== '') count++;
        return count;
    }, [selectedCategory, selectedFabric, stockFilter, statusFilter, minPrice, maxPrice]);

    const handleResetFilters = () => {
        setSelectedCategory('All');
        setSelectedFabric('All');
        setStockFilter('All');
        setStatusFilter('All');
        setMinPrice('');
        setMaxPrice('');
    };

    // Pure UI — inventory summary stats
    const inventoryStats = React.useMemo(() => {
        if (!Array.isArray(sarees)) return { total: 0, units: 0, lowStock: 0, outOfStock: 0, stockValue: 0 };
        let units = 0, lowStock = 0, outOfStock = 0, stockValue = 0;
        sarees.forEach(s => {
            units += s.stock;
            if (s.stock === 0) outOfStock++;
            else if (s.stock < 5) lowStock++;
            stockValue += s.stock * s.sellingPrice;
        });
        return { total: sarees.length, units, lowStock, outOfStock, stockValue };
    }, [sarees]);

    const filteredSarees = Array.isArray(sarees) ? sarees.filter(saree => {
        // Search term check
        const matchesSearch = searchTerm ? (
            saree.sareeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            saree.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            saree.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            saree.rackNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (saree.designCode && saree.designCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (saree.sku && saree.sku.toLowerCase().includes(searchTerm.toLowerCase()))
        ) : true;

        // Category check
        const matchesCategory = selectedCategory === 'All' || saree.category === selectedCategory;

        // Fabric check
        const matchesFabric = selectedFabric === 'All' || saree.fabric === selectedFabric;

        // Stock status check
        let matchesStock = true;
        if (stockFilter === 'in_stock') {
            matchesStock = saree.stock > 0;
        } else if (stockFilter === 'low_stock') {
            matchesStock = saree.stock > 0 && saree.stock < 5;
        } else if (stockFilter === 'out_of_stock') {
            matchesStock = saree.stock === 0;
        }

        // Status check
        const matchesStatus = statusFilter === 'All' || saree.status === statusFilter;

        // Price range check
        const matchesMinPrice = minPrice === '' || saree.sellingPrice >= Number(minPrice);
        const matchesMaxPrice = maxPrice === '' || saree.sellingPrice <= Number(maxPrice);

        return matchesSearch && matchesCategory && matchesFabric && matchesStock && matchesStatus && matchesMinPrice && matchesMaxPrice;
    }) : [];

    const totalPages = Math.ceil(filteredSarees.length / itemsPerPage);
    const paginatedSarees = filteredSarees.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this saree?')) {
            try {
                await inventoryService.deleteSaree(id);
                toast.success('Saree deleted successfully');
                queryClient.invalidateQueries({ queryKey: ['sarees'] });
            } catch (e) {
                toast.error('Failed to delete saree');
            }
        }
    };

    const handleFormSubmit = async (values: any, imageState: any[]) => {
        const imagesToUpload = imageState.filter(img => img.isNew && !img.toDelete && img.file).map(img => ({
            file: img.file!,
            isPrimary: img.isPrimary
        }));

        const imagesToDelete = imageState.filter(img => !img.isNew && img.toDelete).map(img => ({
            id: img.id!,
            storageKey: img.storageKey
        }));

        const primaryImageId = imageState.find(img => !img.isNew && !img.toDelete && img.isPrimary)?.id;

        if (editingSaree) {
            await updateMutation.mutateAsync({
                id: editingSaree.id,
                data: values,
                imagesToUpload,
                imagesToDelete,
                primaryImageId
            });
        } else {
            await createMutation.mutateAsync({
                saree: values,
                images: imagesToUpload
            });
        }
    };

    return (
        <div className="space-y-5 max-w-7xl mx-auto px-2 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-maroon to-maroon-dark text-gold rounded-xl shadow-md shadow-maroon/20">
                        <Package className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold font-serif text-maroon tracking-wide">Stock Inventory</h1>
                        <p className="text-xs text-gray-500 font-sans">View and manage your collection catalogue</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="border-gold/40 text-maroon hover:bg-gold/10 gap-1.5 h-9 px-3.5 text-xs font-bold transition-all shadow-sm bg-white"
                        onClick={() => setIsBatchBarcodeOpen(true)}
                    >
                        <Printer className="h-4 w-4 text-maroon" />
                        Print All Barcodes (A4)
                    </Button>

                    <Button
                        className="bg-gradient-to-r from-maroon to-maroon-dark text-gold gap-1.5 h-9 px-4 text-xs font-bold shadow-md shadow-maroon/20 hover:shadow-lg hover:shadow-maroon/30 transition-all"
                        onClick={() => {
                            setEditingSaree(undefined);
                            setIsFormOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4" />
                        Add New Saree
                    </Button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                    <Card className="border-gold/20 shadow-sm hover:shadow-md transition-shadow bg-white">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Total Products</span>
                                <span className="text-2xl font-bold font-mono text-gray-800">{inventoryStats.total}</span>
                                <span className="text-[10px] text-gray-400 block">Catalogue items</span>
                            </div>
                            <div className="p-2.5 bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl text-white shadow">
                                <Package className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
                    <Card className="border-gold/20 shadow-sm hover:shadow-md transition-shadow bg-white">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Total Units</span>
                                <span className="text-2xl font-bold font-mono text-indigo-600">{inventoryStats.units}</span>
                                <span className="text-[10px] text-gray-400 block">Across all products</span>
                            </div>
                            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl text-white shadow">
                                <Boxes className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
                    <Card className="border-gold/20 shadow-sm hover:shadow-md transition-shadow bg-white">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Low Stock</span>
                                <span className="text-2xl font-bold font-mono text-amber-600">{inventoryStats.lowStock}</span>
                                <span className="text-[10px] text-gray-400 block">&lt; 5 units remaining</span>
                            </div>
                            <div className="p-2.5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl text-white shadow">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
                    <Card className="border-gold/20 shadow-sm hover:shadow-md transition-shadow bg-white">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Out of Stock</span>
                                <span className="text-2xl font-bold font-mono text-red-600">{inventoryStats.outOfStock}</span>
                                <span className="text-[10px] text-gray-400 block">Needs restock</span>
                            </div>
                            <div className="p-2.5 bg-gradient-to-br from-red-500 to-red-700 rounded-xl text-white shadow">
                                <PackageX className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
                    <Card className="border-gold/20 shadow-sm hover:shadow-md transition-shadow bg-white">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Stock Value</span>
                                <span className="text-2xl font-bold font-mono text-emerald-600">₹{inventoryStats.stockValue.toLocaleString()}</span>
                                <span className="text-[10px] text-gray-400 block">At selling price</span>
                            </div>
                            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl text-white shadow">
                                <IndianRupee className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Controls Bar */}
            <Card className="border-gold/20 shadow-sm bg-white">
                <CardContent className="p-3.5 space-y-3">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search by name, category, rack or ID..."
                                className="pl-9 h-10 text-sm border-gold/30 bg-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "h-10 text-xs gap-1.5 border-gold/40 text-maroon font-semibold hover:bg-gold/10 transition-all",
                                    (isFilterPanelOpen || activeFiltersCount > 0) && "bg-gradient-to-r from-maroon to-maroon-dark text-gold border-maroon hover:bg-gradient-to-r hover:from-maroon hover:to-maroon-dark hover:text-gold"
                                )}
                                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                            >
                                <Filter className="h-4 w-4" />
                                Filters
                                {activeFiltersCount > 0 && (
                                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-gold text-maroon text-[10px] font-bold font-mono">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                className="h-10 text-xs gap-1.5 border-gold/40 text-maroon font-semibold hover:bg-gold/10"
                                onClick={handleSeedImages}
                                disabled={isSeeding}
                            >
                                {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                Seed Images
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                className="h-10 text-xs gap-1.5 border-gold/40 text-maroon font-semibold hover:bg-gold/10"
                                onClick={() => setIsImportOpen(true)}
                            >
                                <FileUp className="h-4 w-4" />
                                Import CSV / Excel
                            </Button>
                        </div>
                    </div>

                    {/* Expandable Advanced Filters Panel */}
                    {isFilterPanelOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="bg-cream/10 p-3.5 border border-gold/15 rounded-lg space-y-3">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                    {/* Category */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Category</label>
                                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                            <SelectTrigger className="h-9 text-xs border-gold/30 bg-white">
                                                <SelectValue placeholder="All Categories" />
                                            </SelectTrigger>
                                            <SelectContent className="border-gold/20 max-h-[250px]">
                                                <SelectItem value="All" className="text-xs">All Categories</SelectItem>
                                                {categories.map(cat => (
                                                    <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Fabric */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Fabric</label>
                                        <Select value={selectedFabric} onValueChange={setSelectedFabric}>
                                            <SelectTrigger className="h-9 text-xs border-gold/30 bg-white">
                                                <SelectValue placeholder="All Fabrics" />
                                            </SelectTrigger>
                                            <SelectContent className="border-gold/20 max-h-[250px]">
                                                <SelectItem value="All" className="text-xs">All Fabrics</SelectItem>
                                                {fabrics.map(fab => (
                                                    <SelectItem key={fab} value={fab} className="text-xs">{fab}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Stock Status */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Stock Level</label>
                                        <Select value={stockFilter} onValueChange={setStockFilter}>
                                            <SelectTrigger className="h-9 text-xs border-gold/30 bg-white">
                                                <SelectValue placeholder="All Levels" />
                                            </SelectTrigger>
                                            <SelectContent className="border-gold/20">
                                                <SelectItem value="All" className="text-xs">All Levels</SelectItem>
                                                <SelectItem value="in_stock" className="text-xs">In Stock</SelectItem>
                                                <SelectItem value="low_stock" className="text-xs">Low Stock (&lt; 5)</SelectItem>
                                                <SelectItem value="out_of_stock" className="text-xs">Out of Stock</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Status */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Status</label>
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="h-9 text-xs border-gold/30 bg-white">
                                                <SelectValue placeholder="All Statuses" />
                                            </SelectTrigger>
                                            <SelectContent className="border-gold/20">
                                                <SelectItem value="All" className="text-xs">All Statuses</SelectItem>
                                                <SelectItem value="active" className="text-xs">Active</SelectItem>
                                                <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Min Price */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Min Price (₹)</label>
                                        <Input
                                            type="number"
                                            placeholder="Min"
                                            value={minPrice}
                                            onChange={(e) => setMinPrice(e.target.value)}
                                            className="h-9 text-xs border-gold/30 bg-white focus-visible:ring-maroon"
                                        />
                                    </div>

                                    {/* Max Price */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Max Price (₹)</label>
                                        <Input
                                            type="number"
                                            placeholder="Max"
                                            value={maxPrice}
                                            onChange={(e) => setMaxPrice(e.target.value)}
                                            className="h-9 text-xs border-gold/30 bg-white focus-visible:ring-maroon"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2 border-t border-gold/10">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleResetFilters}
                                        className="h-8 text-xs text-gray-500 hover:text-gray-900 font-bold"
                                    >
                                        Reset Filters
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => setIsFilterPanelOpen(false)}
                                        className="h-8 text-xs bg-maroon hover:bg-maroon-dark text-gold font-bold"
                                    >
                                        Close Panel
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </CardContent>
            </Card>

            {/* Inventory Table Card */}
            <Card className="border-gold/20 shadow-md bg-white overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/10 px-4 py-3">
                    <CardTitle className="text-sm font-bold text-maroon uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-maroon/70" />
                            Inventory Register
                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-mono">
                                {filteredSarees.length}
                            </span>
                        </span>
                        <span className="text-[10px] text-gray-500 normal-case font-normal hidden md:inline">
                            Stock value: <span className="font-bold font-mono text-maroon">₹{inventoryStats.stockValue.toLocaleString()}</span>
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-cream/20 border-b border-gold/10">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="sticky left-0 bg-cream/20 z-40 h-10 text-[10px] font-bold text-maroon py-1 px-3 border-r border-gold/10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-[64px] min-w-[64px]">ID</TableHead>
                                <TableHead className="sticky left-[64px] bg-cream/20 z-30 h-10 text-[10px] font-bold text-maroon py-1 px-3 border-r border-gold/10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[220px] max-w-[220px]">Name</TableHead>
                                <TableHead className="h-10 text-[10px] font-bold text-maroon py-1 whitespace-nowrap">Category</TableHead>
                                <TableHead className="h-10 text-[10px] font-bold text-maroon py-1 whitespace-nowrap">Fabric</TableHead>
                                <TableHead className="h-10 text-[10px] font-bold text-maroon py-1 whitespace-nowrap">Color</TableHead>
                                <TableHead className="h-10 text-[10px] font-bold text-maroon py-1 text-right whitespace-nowrap">MRP (₹)</TableHead>
                                <TableHead className="h-10 text-[10px] font-bold text-maroon py-1 text-right whitespace-nowrap">Discount</TableHead>
                                <TableHead className="h-10 text-[10px] font-bold text-maroon py-1 text-right whitespace-nowrap">Purchase (₹)</TableHead>
                                <TableHead className="h-10 text-[10px] font-bold text-maroon py-1 text-right whitespace-nowrap">Selling (₹)</TableHead>
                                <TableHead className="h-10 text-[10px] font-bold text-maroon py-1 text-center whitespace-nowrap">Stock</TableHead>
                                <TableHead className="h-10 text-[10px] font-bold text-maroon py-1 whitespace-nowrap">Added Date</TableHead>
                                <TableHead className="h-10 text-[10px] font-bold text-maroon py-1 whitespace-nowrap">Status</TableHead>
                                <TableHead className="h-10 text-[10px] font-bold text-maroon py-1 whitespace-nowrap">Audit</TableHead>
                                <TableHead className="sticky right-0 bg-cream/20 z-30 h-10 text-[10px] font-bold text-maroon py-1 text-right px-3 border-l border-gold/10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] w-[60px] min-w-[60px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={14} className="h-48 text-center text-maroon/50 text-xs italic">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-1" />
                                        Loading inventory database...
                                    </TableCell>
                                </TableRow>
                            ) : paginatedSarees?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={14} className="h-32 text-center">
                                        <div className="flex flex-col items-center gap-2 py-4">
                                            <div className="p-3 bg-gray-100 rounded-full">
                                                <Search className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <p className="text-sm text-gray-500">No sarees match filter criteria</p>
                                            <p className="text-xs text-gray-400">Try adjusting your search or filters</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedSarees?.map((saree) => (
                                    <TableRow key={saree.id} className="hover:bg-cream/40 border-b border-gold/5 h-14 group transition-colors">
                                        <TableCell className="sticky left-0 bg-white group-hover:bg-cream/40 transition-colors z-20 py-1 px-3 text-xs font-mono font-bold text-maroon border-r border-gold/10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-[64px] min-w-[64px]">{saree.id}</TableCell>
                                        <TableCell className="sticky left-[64px] bg-white group-hover:bg-cream/40 transition-colors z-20 py-1 px-3 text-xs font-semibold text-gray-800 border-r border-gold/10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[220px] max-w-[220px]" title={saree.description || undefined}>
                                            <div className="flex items-center gap-2.5">
                                                {saree.images && saree.images.length > 0 ? (
                                                    <img
                                                        src={saree.images.find(img => img.isPrimary)?.imageUrl || saree.images[0].imageUrl}
                                                        alt={saree.sareeName}
                                                        className="h-10 w-10 object-cover rounded-lg border border-gold/20 cursor-pointer hover:scale-105 transition-transform shadow-sm"
                                                        onClick={() => {
                                                            setGalleryState({ images: saree.images || [], title: saree.sareeName });
                                                            const primaryIdx = saree.images?.findIndex(img => img.isPrimary) ?? -1;
                                                            setGalleryActiveIndex(primaryIdx !== -1 ? primaryIdx : 0);
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 bg-cream/35 border border-gold/15 rounded-lg flex items-center justify-center text-[8px] text-gray-400 font-bold flex-shrink-0 uppercase">
                                                        No Img
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <span className="font-semibold block truncate max-w-[140px]">{saree.sareeName}</span>
                                                    {saree.designCode && (
                                                        <span className="inline-block text-[9px] font-mono text-purple-800 bg-purple-50 px-1 py-0.2 rounded border border-purple-200 tracking-wider truncate max-w-[140px] font-bold mt-0.5" title={`Design Code: ${saree.designCode}`}>
                                                            {saree.designCode}
                                                        </span>
                                                    )}
                                                    {saree.sku && (
                                                        <span className="block text-[9px] text-gray-400 font-mono tracking-wider truncate max-w-[140px]" title={`SKU: ${saree.sku}`}>
                                                            SKU: {saree.sku}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-1 text-xs text-gray-600 whitespace-nowrap">
                                            <span className="font-medium block">{saree.category}</span>
                                            {saree.categoryId && (
                                                <span className="block text-[9px] text-gray-400 font-mono truncate max-w-[100px]" title={`Cat ID: ${saree.categoryId}`}>
                                                    ID: {saree.categoryId}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-1 text-xs text-gray-500 whitespace-nowrap">{saree.fabric}</TableCell>
                                        <TableCell className="py-1 text-xs text-gray-500 whitespace-nowrap">{saree.color || '—'}</TableCell>
                                        <TableCell className="py-1 text-xs text-right font-mono text-gray-500 whitespace-nowrap">
                                            {(saree.mrp && saree.mrp > saree.sellingPrice)
                                                ? <span className="line-through">₹{saree.mrp.toLocaleString()}</span>
                                                : `₹${(saree.mrp || 0).toLocaleString()}`}
                                        </TableCell>
                                        <TableCell className="py-1 text-xs text-right text-gray-500 whitespace-nowrap">
                                            {saree.discountAmount ? (
                                                <div>
                                                    <span className="font-semibold text-red-600 font-mono">₹{saree.discountAmount.toLocaleString()}</span>
                                                    {(saree.discountPercentage || 0) > 0 && (
                                                        <span className="text-[9px] text-gray-400 block font-mono">({saree.discountPercentage}%)</span>
                                                    )}
                                                </div>
                                            ) : '—'}
                                        </TableCell>
                                        <TableCell className="py-1 text-xs text-right font-mono font-semibold text-gray-600 whitespace-nowrap">
                                            ₹{(saree.purchasePrice || 0).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="py-1 text-xs text-right font-bold text-maroon font-mono whitespace-nowrap">
                                            <span className="inline-flex items-center gap-0.5">
                                                <IndianRupee className="h-3 w-3" />
                                                {saree.sellingPrice.toLocaleString()}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-1 text-xs text-center whitespace-nowrap">
                                            {saree.stock === 0 ? (
                                                <span className="inline-flex items-center gap-1 font-bold px-2 py-1 rounded-full text-[10px] border bg-red-50 text-red-700 border-red-200">
                                                    <PackageX className="h-3 w-3" /> {saree.stock}
                                                </span>
                                            ) : saree.stock < 5 ? (
                                                <span className="inline-flex items-center gap-1 font-bold px-2 py-1 rounded-full text-[10px] border bg-amber-50 text-amber-700 border-amber-200">
                                                    <AlertTriangle className="h-3 w-3" /> {saree.stock}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 font-bold px-2 py-1 rounded-full text-[10px] border bg-emerald-50 text-emerald-700 border-emerald-200">
                                                    <Boxes className="h-3 w-3" /> {saree.stock}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-1 text-xs text-gray-500 whitespace-nowrap">
                                            {saree.addedDate ? new Date(saree.addedDate).toLocaleDateString('en-IN', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            }) : '—'}
                                        </TableCell>
                                        <TableCell className="py-1 text-xs whitespace-nowrap">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border",
                                                saree.status === 'active'
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    : "bg-gray-50 text-gray-500 border-gray-200"
                                            )}>
                                                <span className={cn("h-1.5 w-1.5 rounded-full", saree.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400')} />
                                                {saree.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-1 text-[10px] font-mono text-gray-500 whitespace-nowrap">
                                            <div className="truncate max-w-[120px]" title={`Created by: ${saree.createdBy || 'system'} | Updated by: ${saree.updatedBy || 'system'}`}>
                                                <div className="text-[9px] text-gray-400">C: {saree.createdBy || 'system'}</div>
                                                <div className="text-[9px] text-gray-400">U: {saree.updatedBy || 'system'}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="sticky right-0 bg-white group-hover:bg-cream/40 transition-colors z-20 py-1 px-3 text-right border-l border-gold/10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] w-[60px] min-w-[60px]">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-gold/10 rounded-full">
                                                        <MoreHorizontal className="h-4 w-4 text-gray-500" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="border-gold/20 shadow-lg">
                                                    <DropdownMenuLabel className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Stock Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem
                                                        className="gap-2 cursor-pointer text-xs font-medium"
                                                        onClick={() => {
                                                            setEditingSaree(saree);
                                                            setIsFormOpen(true);
                                                        }}
                                                    >
                                                        <Edit className="h-3.5 w-3.5" /> Edit details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="gap-2 cursor-pointer text-xs font-medium"
                                                        onClick={() => setBarcodeToShow(saree)}
                                                    >
                                                        <BarcodeIcon className="h-3.5 w-3.5" /> Generate Barcode
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="gap-2 text-red-600 cursor-pointer focus:text-red-600 text-xs font-medium"
                                                        onClick={() => handleDelete(saree.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" /> Delete entry
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gold/10 bg-cream/10">
                            <p className="text-xs text-gray-500">
                                Showing <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> -{' '}
                                <span className="font-bold">
                                    {Math.min(currentPage * itemsPerPage, filteredSarees.length)}
                                </span> of{' '}
                                <span className="font-bold">{filteredSarees.length}</span> items
                            </p>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-gold/30 text-maroon h-8 w-8 p-0 hover:bg-cream/20"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                    .map((page, i, arr) => (
                                        <React.Fragment key={page}>
                                            {i > 0 && arr[i - 1] !== page - 1 && (
                                                <span className="text-gray-400 text-xs px-0.5">...</span>
                                            )}
                                            <Button
                                                variant={currentPage === page ? "default" : "outline"}
                                                size="sm"
                                                className={cn(
                                                    "h-8 w-8 p-0 text-xs font-bold",
                                                    currentPage === page
                                                        ? "bg-maroon text-gold hover:bg-maroon-dark"
                                                        : "border-gold/30 text-maroon hover:bg-cream/20"
                                                )}
                                                onClick={() => setCurrentPage(page)}
                                            >
                                                {page}
                                            </Button>
                                        </React.Fragment>
                                    ))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-gold/30 text-maroon h-8 w-8 p-0 hover:bg-cream/20"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-gold/20 shadow-2xl p-4">
                    <DialogHeader className="border-b border-gold/15 pb-2">
                        <DialogTitle className="text-lg font-bold font-serif text-maroon">
                            {editingSaree ? 'EDIT SAREE REGISTER' : 'REGISTER NEW SAREE'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="pt-2">
                        <SareeForm
                            initialData={editingSaree}
                            onSubmit={handleFormSubmit}
                            onCancel={() => setIsFormOpen(false)}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            <BarcodeGenerator
                isOpen={!!barcodeToShow}
                onClose={() => setBarcodeToShow(null)}
                value={barcodeToShow?.barcode || barcodeToShow?.id || ''}
                sareeName={barcodeToShow?.sareeName}
                mrp={barcodeToShow?.mrp}
                sellingPrice={barcodeToShow?.sellingPrice}
                code={barcodeToShow?.id}
                stock={barcodeToShow?.stock}
                sku={barcodeToShow?.sku}
            />

            <BatchBarcodePrinter
                sarees={sarees || []}
                isOpen={isBatchBarcodeOpen}
                onClose={() => setIsBatchBarcodeOpen(false)}
            />

            <CsvImportModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
            />

            <Dialog open={!!galleryState} onOpenChange={(open) => !open && setGalleryState(null)}>
                <DialogContent className="max-w-lg border-gold/20 shadow-2xl p-0 overflow-hidden bg-white">
                    <DialogHeader className="border-b border-gold/15 px-5 py-3 shrink-0">
                        <DialogTitle className="text-sm font-bold font-serif text-maroon flex items-center justify-between">
                            {galleryState?.title} — Gallery
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center p-5 gap-4">
                        {galleryState && galleryState.images.length > 0 ? (
                            <>
                                {/* Large display */}
                                <div className="relative w-full aspect-square max-h-[350px] overflow-hidden rounded-lg border border-gold/10 bg-cream/5 flex items-center justify-center">
                                    <img
                                        src={galleryState.images[galleryActiveIndex].imageUrl}
                                        alt={galleryState.title}
                                        className="max-w-full max-h-full object-contain"
                                    />
                                    {galleryState.images.length > 1 && (
                                        <>
                                            <button
                                                onClick={() => setGalleryActiveIndex(prev => (prev - 1 + galleryState.images.length) % galleryState.images.length)}
                                                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors text-sm font-bold cursor-pointer"
                                            >
                                                &larr;
                                            </button>
                                            <button
                                                onClick={() => setGalleryActiveIndex(prev => (prev + 1) % galleryState.images.length)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors text-sm font-bold cursor-pointer"
                                            >
                                                &rarr;
                                            </button>
                                        </>
                                    )}
                                </div>
                                {/* Thumbnails */}
                                {galleryState.images.length > 1 && (
                                    <div className="flex items-center justify-center gap-2 overflow-x-auto w-full py-1">
                                        {galleryState.images.map((img, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setGalleryActiveIndex(idx)}
                                                className={cn(
                                                    "w-12 h-12 rounded border-2 overflow-hidden flex-shrink-0 transition-all cursor-pointer",
                                                    galleryActiveIndex === idx
                                                        ? "border-maroon scale-105 shadow-sm"
                                                        : "border-gold/20 hover:border-gold/60"
                                                )}
                                            >
                                                <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="py-10 text-gray-400 text-xs italic">No images available</div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}