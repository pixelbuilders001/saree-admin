import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, GripVertical, Package, Check, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { collectionService, type PreviewProduct } from '@/services/collectionService';

interface ManualProductSelectorProps {
    selectedProducts: PreviewProduct[];
    onChange: (products: PreviewProduct[]) => void;
}

export const ManualProductSelector: React.FC<ManualProductSelectorProps> = ({
    selectedProducts,
    onChange,
}) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<PreviewProduct[]>([]);
    const [searching, setSearching] = useState(false);
    const [tempSelectedIds, setTempSelectedIds] = useState<Set<string>>(new Set());

    // When modal opens, search initial active products
    useEffect(() => {
        if (!isAddModalOpen) return;
        let active = true;
        const timer = setTimeout(() => {
            if (!active) return;
            setSearching(true);
            collectionService.searchProducts(searchTerm)
                .then((res) => {
                    if (active) setSearchResults(res);
                })
                .catch((err) => console.error("Search error:", err))
                .finally(() => {
                    if (active) setSearching(false);
                });
        }, 300);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [searchTerm, isAddModalOpen]);

    const handleOpenModal = () => {
        setTempSelectedIds(new Set(selectedProducts.map(p => p.id)));
        setIsAddModalOpen(true);
    };

    const toggleSelectInModal = (product: PreviewProduct) => {
        const next = new Set(tempSelectedIds);
        if (next.has(product.id)) {
            next.delete(product.id);
        } else {
            next.add(product.id);
        }
        setTempSelectedIds(next);
    };

    const handleApplyModalSelection = () => {
        // Keep existing selected products that remain checked
        const kept = selectedProducts.filter(p => tempSelectedIds.has(p.id));
        const keptIds = new Set(kept.map(p => p.id));

        // Add newly selected products from searchResults
        const newlyAdded = searchResults.filter(p => tempSelectedIds.has(p.id) && !keptIds.has(p.id));

        onChange([...kept, ...newlyAdded]);
        setIsAddModalOpen(false);
    };

    const handleRemove = (id: string) => {
        onChange(selectedProducts.filter(p => p.id !== id));
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const nextIndex = direction === 'up' ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= selectedProducts.length) return;

        const next = [...selectedProducts];
        const [moved] = next.splice(index, 1);
        next.splice(nextIndex, 0, moved);
        onChange(next);
    };

    // Simple drag-and-drop state
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

    const onDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIdx(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const onDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIdx === null || draggedIdx === index) return;
        const next = [...selectedProducts];
        const [moved] = next.splice(draggedIdx, 1);
        next.splice(index, 0, moved);
        setDraggedIdx(index);
        onChange(next);
    };

    const onDragEnd = () => {
        setDraggedIdx(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
                        Selected Products ({selectedProducts.length})
                    </h4>
                    <p className="text-[11px] text-gray-500">
                        Drag to reorder products or use arrows. These will display on the storefront in this exact order.
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenModal}
                    className="text-xs border-gold/40 text-maroon hover:bg-gold/10 font-medium"
                >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Products
                </Button>
            </div>

            {selectedProducts.length === 0 ? (
                <div className="p-6 border border-dashed border-gold/30 rounded-lg text-center bg-cream/20">
                    <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-gray-600">No products added yet</p>
                    <p className="text-[11px] text-gray-400 mb-3">
                        Manually select sarees from your inventory to include in this collection.
                    </p>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleOpenModal}
                        className="text-xs bg-maroon hover:bg-maroon-dark text-gold"
                    >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Select Sarees
                    </Button>
                </div>
            ) : (
                <div className="border border-gold/20 rounded-lg divide-y divide-gold/10 bg-white max-h-80 overflow-y-auto shadow-sm">
                    {selectedProducts.map((product, idx) => (
                        <div
                            key={product.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, idx)}
                            onDragOver={(e) => onDragOver(e, idx)}
                            onDragEnd={onDragEnd}
                            className={`flex items-center justify-between p-2.5 transition-colors cursor-move ${
                                draggedIdx === idx ? 'bg-gold/10 opacity-70' : 'hover:bg-cream/20'
                            }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="text-gray-400 hover:text-gray-600">
                                    <GripVertical className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-mono font-bold text-gray-400 w-4">
                                    #{idx + 1}
                                </span>

                                <div className="w-10 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0 border border-gold/20">
                                    {product.imageUrl ? (
                                        <img
                                            src={product.imageUrl}
                                            alt={product.sareeName}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLElement).style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <Package className="h-4 w-4" />
                                        </div>
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-gray-800 truncate" title={product.sareeName}>
                                        {product.sareeName}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                        <span className="font-serif font-bold text-maroon">
                                            ₹{product.sellingPrice.toLocaleString('en-IN')}
                                        </span>
                                        <span>•</span>
                                        <span>Stock: {product.stock}</span>
                                        {product.fabric && (
                                            <>
                                                <span>•</span>
                                                <span className="capitalize">{product.fabric}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => handleMove(idx, 'up')}
                                    disabled={idx === 0}
                                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Move up"
                                >
                                    <ChevronUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleMove(idx, 'down')}
                                    disabled={idx === selectedProducts.length - 1}
                                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Move down"
                                >
                                    <ChevronDown className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRemove(product.id)}
                                    className="p-1 text-gray-400 hover:text-red-600 rounded ml-1"
                                    title="Remove from collection"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal for selecting multiple products */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col border-gold/20 shadow-2xl bg-white p-0">
                    <DialogHeader className="p-4 border-b border-gold/15 bg-gradient-to-r from-cream/40 to-transparent">
                        <DialogTitle className="text-sm font-bold uppercase tracking-wider text-maroon font-serif">
                            Select Products For Manual Collection
                        </DialogTitle>
                    </DialogHeader>

                    {/* Search bar */}
                    <div className="p-4 border-b border-gold/10 bg-cream/5">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by saree name, SKU, fabric, category..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full text-xs pl-9 pr-4 py-2 border border-gold/30 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-maroon text-gray-800"
                            />
                        </div>
                    </div>

                    {/* Product List */}
                    <div className="flex-1 overflow-y-auto p-4 max-h-[50vh] divide-y divide-gold/10">
                        {searching ? (
                            <div className="flex items-center justify-center py-12 text-maroon">
                                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                <span className="text-xs font-medium">Searching inventory...</span>
                            </div>
                        ) : searchResults.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                <p className="text-xs">No matching sarees found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {searchResults.map((product) => {
                                    const isSelected = tempSelectedIds.has(product.id);
                                    return (
                                        <div
                                            key={product.id}
                                            onClick={() => toggleSelectInModal(product)}
                                            className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                                                isSelected
                                                    ? 'border-maroon bg-cream/30 shadow-sm'
                                                    : 'border-gold/20 hover:border-gold/40 bg-white'
                                            }`}
                                        >
                                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors flex-shrink-0 ${
                                                isSelected ? 'bg-maroon border-maroon text-gold' : 'border-gray-300'
                                            }`}>
                                                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                            </div>

                                            <div className="w-10 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0 border border-gold/20">
                                                {product.imageUrl ? (
                                                    <img
                                                        src={product.imageUrl}
                                                        alt={product.sareeName}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLElement).style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <Package className="h-4 w-4" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-semibold text-gray-800 truncate">
                                                    {product.sareeName}
                                                </p>
                                                <p className="text-[10px] text-gray-500 truncate">
                                                    {product.category} {product.fabric ? `• ${product.fabric}` : ''}
                                                </p>
                                                <div className="flex items-center justify-between mt-0.5">
                                                    <span className="text-xs font-bold text-maroon font-serif">
                                                        ₹{product.sellingPrice.toLocaleString('en-IN')}
                                                    </span>
                                                    <span className="text-[9px] text-gray-400">
                                                        Stock: {product.stock}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-4 border-t border-gold/15 bg-cream/10 flex items-center justify-between sm:justify-between">
                        <span className="text-xs font-semibold text-gray-600">
                            {tempSelectedIds.size} {tempSelectedIds.size === 1 ? 'product' : 'products'} selected
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsAddModalOpen(false)}
                                className="text-xs border-gold/30"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleApplyModalSelection}
                                className="text-xs bg-maroon hover:bg-maroon-dark text-gold"
                            >
                                Confirm Selection ({tempSelectedIds.size})
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
