import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Sparkles, ListFilter, Search, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Collection } from '@/types/homepage';
import { collectionService } from '@/services/collectionService';
import { ConfirmationDialog } from './ConfirmationDialog';
import { toast } from 'sonner';

interface CollectionsListProps {
    collections: Collection[];
    loading: boolean;
    onEdit: (collection: Collection) => void;
    onCreate: () => void;
    onRefresh: () => void;
}

export const CollectionsList: React.FC<CollectionsListProps> = ({
    collections,
    loading,
    onEdit,
    onCreate,
    onRefresh,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'automatic' | 'manual'>('all');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);
    const [deleting, setDeleting] = useState(false);

    const filtered = collections.filter((col) => {
        const matchesSearch = col.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (col.description && col.description.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesType = filterType === 'all' || col.collectionType === filterType;
        return matchesSearch && matchesType;
    });

    const confirmDelete = async () => {
        if (!collectionToDelete) return;
        setDeleting(true);
        try {
            await collectionService.deleteCollection(collectionToDelete.id);
            toast.success(`Collection "${collectionToDelete.name}" deleted`);
            setDeleteModalOpen(false);
            setCollectionToDelete(null);
            onRefresh();
        } catch (err: unknown) {
            console.error("Delete collection failed:", err);
            const msg = err instanceof Error ? err.message : "Failed to delete collection";
            toast.error(msg);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gold/20 shadow-sm">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search collections..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full text-xs pl-9 pr-4 py-2 border border-gold/30 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-maroon text-gray-800"
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as 'all' | 'automatic' | 'manual')}
                        aria-label="Filter collections by type"
                        className="text-xs border border-gold/30 rounded-lg px-2.5 py-2 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-maroon"
                    >
                        <option value="all">All Types</option>
                        <option value="automatic">Automatic</option>
                        <option value="manual">Manual</option>
                    </select>
                </div>

                <Button
                    onClick={onCreate}
                    className="text-xs bg-maroon hover:bg-maroon-dark text-gold font-bold px-4 shadow-sm"
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Create Collection
                </Button>
            </div>

            {/* Skeleton Loader */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="border border-gold/20 rounded-xl p-5 bg-white animate-pulse space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="h-4 bg-gray-200 rounded w-2/3" />
                                <div className="h-4 bg-gray-200 rounded w-16" />
                            </div>
                            <div className="h-3 bg-gray-200 rounded w-1/3" />
                            <div className="h-8 bg-gray-100 rounded w-full mt-4" />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                /* Empty state */
                <Card className="border-gold/20 bg-white">
                    <CardContent className="p-12 text-center">
                        <Sparkles className="h-10 w-10 text-gold/60 mx-auto mb-3" />
                        <h3 className="text-sm font-bold text-gray-800 font-serif uppercase tracking-wider">
                            No Collections Found
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                            Create your first collection to group sarees dynamically or manually for your homepage sections.
                        </p>
                        <Button
                            onClick={onCreate}
                            className="mt-4 text-xs bg-maroon hover:bg-maroon-dark text-gold font-bold"
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Create Collection
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                /* Collections Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((col) => {
                        const isAuto = col.collectionType === 'automatic';
                        return (
                            <div
                                key={col.id}
                                className="border border-gold/20 rounded-xl p-4 bg-white hover:border-gold/50 hover:shadow-md transition-all flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="text-sm font-bold text-gray-900 font-serif leading-snug">
                                            {col.name}
                                        </h3>
                                        <span className={`inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0 ${
                                            col.isActive
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : 'bg-gray-50 text-gray-400 border-gray-200'
                                        }`}>
                                            {col.isActive ? (
                                                <CheckCircle2 className="h-2.5 w-2.5" />
                                            ) : (
                                                <XCircle className="h-2.5 w-2.5" />
                                            )}
                                            {col.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>

                                    {col.description && (
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                            {col.description}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                            isAuto
                                                ? 'bg-maroon/5 text-maroon border-maroon/20'
                                                : 'bg-gold/10 text-amber-900 border-gold/30'
                                        }`}>
                                            {isAuto ? (
                                                <Sparkles className="h-3 w-3 text-maroon" />
                                            ) : (
                                                <ListFilter className="h-3 w-3 text-amber-800" />
                                            )}
                                            {isAuto ? 'Automatic' : 'Manual'}
                                        </span>

                                        <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md font-mono">
                                            {isAuto ? `Max ${col.productLimit} products` : `${col.productCount ?? 0} products`}
                                        </span>
                                    </div>

                                    {/* Rules Summary if Automatic */}
                                    {isAuto && col.rules && col.rules.length > 0 && (
                                        <div className="mt-3 p-2 bg-cream/15 rounded border border-gold/15 text-[10px] text-gray-600 space-y-0.5">
                                            <span className="font-bold uppercase tracking-wider text-gray-400 block text-[8.5px]">Rules:</span>
                                            {col.rules.slice(0, 2).map((r, i) => (
                                                <div key={i} className="truncate">
                                                    • <span className="font-medium capitalize">{r.field.replace('_', ' ')}</span> {r.operator} <span className="font-semibold text-maroon">{r.value}</span>
                                                </div>
                                            ))}
                                            {col.rules.length > 2 && (
                                                <span className="text-gray-400 text-[9px]">+{col.rules.length - 2} more conditions</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-end gap-1 mt-4 pt-3 border-t border-gold/10">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onEdit(col)}
                                        className="text-xs h-7 px-3 border-gold/30 text-gray-700 hover:text-maroon hover:bg-gold/10 font-medium"
                                    >
                                        <Pencil className="h-3 w-3 mr-1" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setCollectionToDelete(col);
                                            setDeleteModalOpen(true);
                                        }}
                                        className="text-xs h-7 px-2 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                        title="Delete collection"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                title="Delete Collection?"
                description={`Are you sure you want to delete "${collectionToDelete?.name}"? This will remove the collection from homepage sections.`}
                confirmLabel="Delete"
                variant="danger"
                onConfirm={confirmDelete}
                loading={deleting}
            />
        </div>
    );
};
