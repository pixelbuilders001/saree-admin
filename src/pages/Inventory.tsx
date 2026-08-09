import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService, type Saree } from '@/services/inventoryService';
import {
    Plus,
    Search,
    Filter,
    FileDown,
    FileUp,
    MoreHorizontal,
    Edit,
    Trash2,
    Loader2,
    Eye,
    EyeOff,
    Lock,
    Barcode as BarcodeIcon,
    ChevronLeft,
    ChevronRight,
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { SareeForm } from '@/components/inventory/SareeForm';
import { BarcodeGenerator } from '@/components/inventory/BarcodeGenerator';
import { CsvImportModal } from '@/components/inventory/CsvImportModal';
import { toast } from 'sonner';

export default function InventoryPage() {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [currentPage, setCurrentPage] = React.useState(1);
    const itemsPerPage = 20;

    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingSaree, setEditingSaree] = React.useState<Saree | undefined>();
    const [visiblePrices, setVisiblePrices] = React.useState<Set<string>>(new Set());
    const [pendingSareeId, setPendingSareeId] = React.useState<string | null>(null);
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false);
    const [passwordInput, setPasswordInput] = React.useState('');
    const [barcodeToShow, setBarcodeToShow] = React.useState<{ value: string, label: string } | null>(null);
    const [isImportOpen, setIsImportOpen] = React.useState(false);

    // Filter states
    const [isFilterPanelOpen, setIsFilterPanelOpen] = React.useState(false);
    const [selectedCategory, setSelectedCategory] = React.useState('All');
    const [selectedFabric, setSelectedFabric] = React.useState('All');
    const [stockFilter, setStockFilter] = React.useState('All'); // 'All' | 'in_stock' | 'low_stock' | 'out_of_stock'
    const [statusFilter, setStatusFilter] = React.useState('All'); // 'All' | 'active' | 'inactive'
    const [minPrice, setMinPrice] = React.useState('');
    const [maxPrice, setMaxPrice] = React.useState('');

    const queryClient = useQueryClient();

    const { data: sarees, isLoading } = useQuery({
        queryKey: ['sarees'],
        queryFn: inventoryService.getSarees
    });

    // Reset pagination when search or filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCategory, selectedFabric, stockFilter, statusFilter, minPrice, maxPrice]);

    const createMutation = useMutation({
        mutationFn: inventoryService.createSaree,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['sarees'] });
            setIsFormOpen(false);
            setBarcodeToShow({ value: data.id, label: data.sareeName });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => inventoryService.updateSaree(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sarees'] });
            setIsFormOpen(false);
            setEditingSaree(undefined);
        }
    });

    const categories = React.useMemo(() => {
        if (!Array.isArray(sarees)) return [];
        return Array.from(new Set(sarees.map(s => s.category).filter(Boolean))).sort();
    }, [sarees]);

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

    const filteredSarees = Array.isArray(sarees) ? sarees.filter(saree => {
        // Search term check
        const matchesSearch = searchTerm ? (
            saree.sareeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            saree.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            saree.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            saree.rackNo.toLowerCase().includes(searchTerm.toLowerCase())
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

    const handleFormSubmit = async (values: any) => {
        if (editingSaree) {
            await updateMutation.mutateAsync({ id: editingSaree.id, data: values });
        } else {
            await createMutation.mutateAsync(values);
        }
    };

    const handleTogglePurchasePrice = (sareeId: string) => {
        if (visiblePrices.has(sareeId)) {
            const next = new Set(visiblePrices);
            next.delete(sareeId);
            setVisiblePrices(next);
        } else {
            setPendingSareeId(sareeId);
            setIsPasswordDialogOpen(true);
        }
    };

    const verifyPassword = () => {
        if (passwordInput === '123456') {
            if (pendingSareeId) {
                const next = new Set(visiblePrices);
                next.add(pendingSareeId);
                setVisiblePrices(next);
            }
            setIsPasswordDialogOpen(false);
            setPendingSareeId(null);
            setPasswordInput('');
            toast.success('Access granted');
        } else {
            toast.error('Incorrect password');
        }
    };

    return (
        <div className="space-y-3 max-w-7xl mx-auto px-2">
            {/* High Density Header */}
            <div className="flex items-center justify-between border-b border-gold/10 pb-2">
                <div>
                    <h1 className="text-xl font-bold font-serif text-maroon tracking-wider">SBS STOCK INVENTORY</h1>
                    <p className="text-xs text-gray-500 font-sans">View and manage collection catalogue</p>
                </div>
                <Button
                    className="bg-maroon hover:bg-maroon-dark text-gold gap-1.5 h-8 px-3 text-xs font-bold shadow-sm"
                    onClick={() => {
                        setEditingSaree(undefined);
                        setIsFormOpen(true);
                    }}
                >
                    <Plus className="h-3.5 w-3.5" />
                    ADD NEW SAREE
                </Button>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-cream/10 p-2 border border-gold/15 rounded-md">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                    <div className="relative w-full">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <Input
                            placeholder="Search by name, category, rack..."
                            className="pl-8 border-gold/30 h-8 text-xs focus-visible:ring-maroon bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="outline"
                        className={cn(
                            "border-gold/30 text-maroon gap-1.5 h-8 text-xs px-2.5 font-bold hover:bg-cream/10 transition-all",
                            (isFilterPanelOpen || activeFiltersCount > 0) && "bg-maroon text-gold hover:bg-maroon-dark hover:text-gold border-maroon"
                        )}
                        onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                    >
                        <Filter className="h-3.5 w-3.5" />
                        FILTER {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                    </Button>
                </div>
                <div className="flex items-center justify-end gap-2">
                    <Button
                        variant="outline" size="sm"
                        className="border-gold/30 text-maroon gap-1.5 h-8 text-xs px-2.5 font-bold hover:bg-cream/10"
                        onClick={() => setIsImportOpen(true)}
                    >
                        <FileUp className="h-3.5 w-3.5" />
                        IMPORT CSV
                    </Button>
                    {/* <Button variant="outline" size="sm" className="border-gold/30 text-maroon gap-1.5 h-8 text-xs px-2.5 font-bold hover:bg-cream/10">
                        <FileDown className="h-3.5 w-3.5" />
                        EXPORT
                    </Button> */}
                </div>
            </div>

            {/* Expandable Advanced Filters Panel */}
            {isFilterPanelOpen && (
                <div className="bg-white p-3 border border-gold/15 rounded-md shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {/* Category */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-maroon uppercase tracking-wide">Category</label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full h-8 text-xs rounded-md border border-gold/30 px-2 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-maroon"
                            >
                                <option value="All">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Fabric */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-maroon uppercase tracking-wide">Fabric</label>
                            <select
                                value={selectedFabric}
                                onChange={(e) => setSelectedFabric(e.target.value)}
                                className="w-full h-8 text-xs rounded-md border border-gold/30 px-2 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-maroon"
                            >
                                <option value="All">All Fabrics</option>
                                {fabrics.map(fab => (
                                    <option key={fab} value={fab}>{fab}</option>
                                ))}
                            </select>
                        </div>

                        {/* Stock Status */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-maroon uppercase tracking-wide">Stock Level</label>
                            <select
                                value={stockFilter}
                                onChange={(e) => setStockFilter(e.target.value)}
                                className="w-full h-8 text-xs rounded-md border border-gold/30 px-2 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-maroon"
                            >
                                <option value="All">All Levels</option>
                                <option value="in_stock">In Stock</option>
                                <option value="low_stock">Low Stock (&lt; 5)</option>
                                <option value="out_of_stock">Out of Stock</option>
                            </select>
                        </div>

                        {/* Status */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-maroon uppercase tracking-wide">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full h-8 text-xs rounded-md border border-gold/30 px-2 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-maroon"
                            >
                                <option value="All">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        {/* Min Price */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-maroon uppercase tracking-wide">Min Price (₹)</label>
                            <Input
                                type="number"
                                placeholder="Min"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                className="h-8 text-xs border-gold/30 bg-white focus-visible:ring-maroon"
                            />
                        </div>

                        {/* Max Price */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-maroon uppercase tracking-wide">Max Price (₹)</label>
                            <Input
                                type="number"
                                placeholder="Max"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                className="h-8 text-xs border-gold/30 bg-white focus-visible:ring-maroon"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleResetFilters}
                            className="h-7 text-xs text-gray-500 hover:text-gray-900 font-bold"
                        >
                            Reset Filters
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setIsFilterPanelOpen(false)}
                            className="h-7 text-xs bg-maroon hover:bg-maroon-dark text-gold font-bold"
                        >
                            Close Panel
                        </Button>
                    </div>
                </div>
            )}

            {/* High Density Table Card */}
            <Card className="border-gold/20 shadow-md">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-cream/20 border-b border-gold/10">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 px-3">Id</TableHead>
                                <TableHead className="h-8 text-[10px] font-bold text-maroon py-1">Name</TableHead>
                                <TableHead className="h-8 text-[10px] font-bold text-maroon py-1">Category</TableHead>
                                <TableHead className="h-8 text-[10px] font-bold text-maroon py-1">Fabric</TableHead>
                                <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 text-right">Purchase (₹)</TableHead>
                                <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 text-right">Price (₹)</TableHead>
                                <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 text-center">Stock</TableHead>
                                {/* <TableHead className="h-8 text-[10px] font-bold text-maroon py-1">Rack</TableHead> */}
                                <TableHead className="h-8 text-[10px] font-bold text-maroon py-1">Status</TableHead>
                                <TableHead className="h-8 text-[10px] font-bold text-maroon py-1">Created By</TableHead>
                                <TableHead className="h-8 text-[10px] font-bold text-maroon py-1">Updated By</TableHead>
                                <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 text-right px-3">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={12} className="h-24 text-center text-maroon/50 text-xs italic">
                                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-1" />
                                        Loading inventory database...
                                    </TableCell>
                                </TableRow>
                            ) : paginatedSarees?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={12} className="h-20 text-center text-xs text-gray-500 italic">No sarees match filter criteria</TableCell>
                                </TableRow>
                            ) : (
                                paginatedSarees?.map((saree) => (
                                    <TableRow key={saree.id} className="hover:bg-cream/5 border-b border-gold/5 h-8">
                                        <TableCell className="py-1 px-3 text-xs font-mono font-bold text-maroon">{saree.id}</TableCell>
                                        <TableCell className="py-1 text-xs font-semibold text-gray-805">{saree.sareeName}</TableCell>
                                        <TableCell className="py-1 text-xs text-gray-600">{saree.category}</TableCell>
                                        <TableCell className="py-1 text-xs text-gray-500">{saree.fabric}</TableCell>
                                        <TableCell className="py-1 text-xs text-right">
                                            <div className="flex items-center justify-end gap-1 group">
                                                <span className="font-semibold text-gray-500 font-mono text-[11px]">
                                                    {visiblePrices.has(saree.id)
                                                        ? `₹${saree.purchasePrice.toLocaleString()}`
                                                        : '••••••'}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 text-gray-400 hover:text-maroon p-0 rounded-full"
                                                    onClick={() => handleTogglePurchasePrice(saree.id)}
                                                >
                                                    {visiblePrices.has(saree.id) ? (
                                                        <EyeOff className="h-3 w-3" />
                                                    ) : (
                                                        <Eye className="h-3 w-3" />
                                                    )}
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-1 text-xs text-right font-bold text-maroon font-mono">₹{saree.sellingPrice.toLocaleString()}</TableCell>
                                        <TableCell className="py-1 text-xs text-center">
                                            <span className={cn(
                                                "font-bold px-1.5 py-0.5 rounded text-[10px] border",
                                                saree.stock < 5
                                                    ? "bg-red-50 text-red-700 border-red-200 animate-pulse"
                                                    : "bg-green-50 text-green-700 border-green-200"
                                            )}>
                                                {saree.stock}
                                            </span>
                                        </TableCell>
                                        {/* <TableCell className="py-1 text-xs text-gray-600 font-semibold">{saree.rackNo}</TableCell> */}
                                        <TableCell className="py-1 text-xs">
                                            <span className={cn(
                                                "inline-block rounded-full w-2 h-2 mr-1",
                                                saree.status === 'active' ? 'bg-green-500' : 'bg-gray-300'
                                            )} />
                                            <span className="text-[10px] uppercase font-bold text-gray-500">{saree.status}</span>
                                        </TableCell>
                                        <TableCell className="py-1 text-[10px] font-mono text-gray-500 truncate max-w-[125px]" title={saree.createdBy || 'system'}>
                                            {saree.createdBy || 'system'}
                                        </TableCell>
                                        <TableCell className="py-1 text-[10px] font-mono text-gray-500 truncate max-w-[125px]" title={saree.updatedBy || 'system'}>
                                            {saree.updatedBy || 'system'}
                                        </TableCell>
                                        <TableCell className="py-1 px-3 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-6 w-6 p-0 hover:bg-gold/10 rounded-full">
                                                        <MoreHorizontal className="h-3.5 w-3.5 text-gray-505" />
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
                                                        onClick={() => setBarcodeToShow({ value: saree.id, label: saree.sareeName })}
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
                        <div className="flex items-center justify-between px-4 py-2 border-t border-gold/10 bg-cream/10">
                            <p className="text-[10px] text-gray-500">
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
                                    className="border-gold/30 text-maroon h-6 w-6 p-0 hover:bg-cream/20"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
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
                                                    "h-6 w-6 p-0 text-[10px] font-bold",
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
                                    className="border-gold/30 text-maroon h-6 w-6 p-0 hover:bg-cream/20"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="h-3.5 w-3.5" />
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

            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent className="sm:max-w-sm border-gold/25 shadow-xl p-4">
                    <DialogHeader className="border-b border-gold/10 pb-2">
                        <DialogTitle className="flex items-center gap-1.5 text-maroon font-bold text-sm">
                            <Lock className="h-4 w-4" />
                            ADMIN ACCESS PERMISSION
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                        <p className="text-xs text-gray-500 leading-normal">
                            Enter the administrative security PIN to expose original purchase prices.
                        </p>
                        <Input
                            type="password"
                            placeholder="Security Pin"
                            className="border-gold/30 h-8 text-xs font-mono"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    verifyPassword();
                                }
                            }}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 pt-1">
                            <Button variant="ghost" className="h-8 text-xs hover:bg-gray-100" onClick={() => setIsPasswordDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                className="bg-maroon hover:bg-maroon-dark text-gold h-8 text-xs font-bold"
                                onClick={verifyPassword}
                            >
                                VERIFY PIN
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <BarcodeGenerator
                isOpen={!!barcodeToShow}
                onClose={() => setBarcodeToShow(null)}
                value={barcodeToShow?.value || ''}
                label={barcodeToShow?.label || ''}
            />

            <CsvImportModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
            />
        </div>
    );
}
