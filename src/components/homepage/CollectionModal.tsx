import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RuleBuilder } from './RuleBuilder';
import { ManualProductSelector } from './ManualProductSelector';
import { CollectionPreview } from './CollectionPreview';
import {
    type Collection,
    type CollectionRule,
    type CollectionType,
    SORT_OPTIONS
} from '@/types/homepage';
import { collectionService, type PreviewProduct } from '@/services/collectionService';
import { toast } from 'sonner';
import { Sparkles, ListFilter } from 'lucide-react';

interface CollectionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    collectionToEdit: Collection | null;
    onSaved: () => void;
}

interface CollectionFormProps {
    collectionToEdit: Collection | null;
    onClose: () => void;
    onSaved: () => void;
}

const DEFAULT_RULES: CollectionRule[] = [
    {
        id: 'rule_1',
        field: 'selling_price',
        operator: 'lte',
        value: 1999,
    },
    {
        id: 'rule_2',
        field: 'stock',
        operator: 'gt',
        value: 0,
    },
];

const CollectionForm: React.FC<CollectionFormProps> = ({
    collectionToEdit,
    onClose,
    onSaved,
}) => {
    const isEdit = !!collectionToEdit;

    const [name, setName] = useState(collectionToEdit?.name || '');
    const [description, setDescription] = useState(collectionToEdit?.description || '');
    const [collectionType, setCollectionType] = useState<CollectionType>(
        collectionToEdit?.collectionType || 'automatic'
    );
    const [rules, setRules] = useState<CollectionRule[]>(
        collectionToEdit?.rules || DEFAULT_RULES
    );
    const [sortBy, setSortBy] = useState(collectionToEdit?.sortBy || 'newest');
    const [productLimit, setProductLimit] = useState(collectionToEdit?.productLimit || 8);
    const [isActive, setIsActive] = useState(collectionToEdit ? collectionToEdit.isActive : true);

    // Manual selected products
    const [manualProducts, setManualProducts] = useState<PreviewProduct[]>([]);

    // Preview state
    const [previewProducts, setPreviewProducts] = useState<PreviewProduct[]>([]);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);

    const [saving, setSaving] = useState(false);

    // If editing a manual collection, load its products once on mount
    useEffect(() => {
        if (!collectionToEdit || collectionToEdit.collectionType !== 'manual') return;

        let active = true;
        collectionService.getCollectionById(collectionToEdit.id)
            .then(({ products }) => {
                if (active) {
                    setManualProducts(products);
                }
            })
            .catch((err: unknown) => {
                if (active) {
                    const msg = err instanceof Error ? err.message : 'Failed to load products';
                    setPreviewError(msg);
                }
            });

        return () => {
            active = false;
        };
    }, [collectionToEdit]);

    // Live evaluate preview for Automatic or sync manual products
    useEffect(() => {
        if (collectionType === 'manual') {
            const timer = setTimeout(() => {
                setPreviewProducts(manualProducts);
                setPreviewLoading(false);
                setPreviewError(null);
            }, 0);
            return () => clearTimeout(timer);
        }

        let active = true;
        const debounceTimer = setTimeout(async () => {
            if (!active) return;
            setPreviewLoading(true);
            setPreviewError(null);
            try {
                const results = await collectionService.evaluateAutomaticPreview(
                    rules,
                    sortBy,
                    productLimit
                );
                if (active) {
                    setPreviewProducts(results);
                }
            } catch (err: unknown) {
                if (active) {
                    const msg = err instanceof Error ? err.message : 'Could not evaluate preview';
                    setPreviewError(msg);
                }
            } finally {
                if (active) {
                    setPreviewLoading(false);
                }
            }
        }, 300);

        return () => {
            active = false;
            clearTimeout(debounceTimer);
        };
    }, [collectionType, rules, sortBy, productLimit, manualProducts]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Please enter a collection name');
            return;
        }

        if (collectionType === 'manual' && manualProducts.length === 0) {
            toast.error('Please select at least one product for manual collection');
            return;
        }

        setSaving(true);
        try {
            if (isEdit && collectionToEdit) {
                await collectionService.updateCollection(collectionToEdit.id, {
                    name,
                    description,
                    collectionType,
                    rules: collectionType === 'automatic' ? rules : [],
                    sortBy: collectionType === 'automatic' ? sortBy : 'newest',
                    productLimit: collectionType === 'automatic' ? productLimit : manualProducts.length,
                    isActive,
                    productIds: collectionType === 'manual' ? manualProducts.map(p => p.id) : undefined,
                });
                toast.success('Collection updated successfully');
            } else {
                await collectionService.createCollection({
                    name,
                    description,
                    collectionType,
                    rules: collectionType === 'automatic' ? rules : [],
                    sortBy: collectionType === 'automatic' ? sortBy : 'newest',
                    productLimit: collectionType === 'automatic' ? productLimit : manualProducts.length,
                    isActive,
                    productIds: collectionType === 'manual' ? manualProducts.map(p => p.id) : undefined,
                });
                toast.success('Collection created successfully');
            }

            onSaved();
            onClose();
        } catch (err: unknown) {
            console.error('Failed to save collection:', err);
            const msg = err instanceof Error ? err.message : 'Failed to save collection';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 block mb-1">
                            Collection Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Sarees Under ₹1999, Festive Elegance"
                            required
                            className="w-full text-xs border border-gold/30 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-maroon text-gray-800 font-medium"
                        />
                    </div>

                    <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 block mb-1">
                            Description (Optional)
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief note or internal description"
                            className="w-full text-xs border border-gold/30 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-maroon text-gray-800"
                        />
                    </div>
                </div>

                {/* Collection Type Radio Selector */}
                <div className="bg-cream/15 p-3.5 rounded-xl border border-gold/25">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 block mb-2">
                        Collection Type
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            collectionType === 'automatic'
                                ? 'border-maroon bg-white shadow-sm ring-1 ring-maroon/20'
                                : 'border-gold/20 bg-white/60 hover:bg-white'
                        }`}>
                            <input
                                type="radio"
                                name="collectionType"
                                value="automatic"
                                checked={collectionType === 'automatic'}
                                onChange={() => setCollectionType('automatic')}
                                className="mt-0.5 text-maroon focus:ring-maroon"
                            />
                            <div>
                                <div className="flex items-center gap-1.5 font-bold text-xs text-gray-800">
                                    <Sparkles className="h-3.5 w-3.5 text-maroon" />
                                    <span>Automatic Collection</span>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    Dynamically populates products based on criteria like price, occasion, category, or stock.
                                </p>
                            </div>
                        </label>

                        <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            collectionType === 'manual'
                                ? 'border-maroon bg-white shadow-sm ring-1 ring-maroon/20'
                                : 'border-gold/20 bg-white/60 hover:bg-white'
                        }`}>
                            <input
                                type="radio"
                                name="collectionType"
                                value="manual"
                                checked={collectionType === 'manual'}
                                onChange={() => setCollectionType('manual')}
                                className="mt-0.5 text-maroon focus:ring-maroon"
                            />
                            <div>
                                <div className="flex items-center gap-1.5 font-bold text-xs text-gray-800">
                                    <ListFilter className="h-3.5 w-3.5 text-maroon" />
                                    <span>Manual Collection</span>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    Hand-pick specific sarees one-by-one and arrange their display order with drag-and-drop.
                                </p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Automatic Configuration */}
                {collectionType === 'automatic' ? (
                    <div className="space-y-4 bg-white p-4 rounded-xl border border-gold/20 shadow-sm">
                        <RuleBuilder rules={rules} onChange={setRules} />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gold/15">
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 block mb-1">
                                    Products To Display
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={productLimit}
                                    onChange={(e) => setProductLimit(Math.max(1, Number(e.target.value)))}
                                    className="w-full text-xs border border-gold/30 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-maroon text-gray-800"
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 block mb-1">
                                    Sort By
                                </label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full text-xs border border-gold/30 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-maroon text-gray-800 font-medium"
                                >
                                    {SORT_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Manual Configuration */
                    <div className="bg-white p-4 rounded-xl border border-gold/20 shadow-sm">
                        <ManualProductSelector
                            selectedProducts={manualProducts}
                            onChange={setManualProducts}
                        />
                    </div>
                )}

                {/* Active Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-gold/20 bg-cream/10">
                    <div>
                        <span className="text-xs font-bold text-gray-800 block">Collection Active</span>
                        <span className="text-[11px] text-gray-500">
                            Active collections can be linked and displayed on the storefront.
                        </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-maroon"></div>
                    </label>
                </div>

                {/* Live Preview */}
                <CollectionPreview
                    products={previewProducts}
                    loading={previewLoading}
                    error={previewError}
                    title={collectionType === 'automatic' ? 'Automatic Matching Preview' : 'Manual Products Preview'}
                />
            </div>

            <DialogFooter className="p-4 border-t border-gold/15 bg-cream/10 flex items-center justify-end gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={saving}
                    className="text-xs border-gold/30"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={saving}
                    className="text-xs bg-maroon hover:bg-maroon-dark text-gold font-bold px-5"
                >
                    {saving ? 'Saving...' : isEdit ? 'Update Collection' : 'Save Collection'}
                </Button>
            </DialogFooter>
        </form>
    );
};

export const CollectionModal: React.FC<CollectionModalProps> = ({
    open,
    onOpenChange,
    collectionToEdit,
    onSaved,
}) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[850px] max-h-[90vh] flex flex-col border-gold/20 shadow-2xl bg-white p-0 overflow-hidden">
                <DialogHeader className="p-4 border-b border-gold/15 bg-gradient-to-r from-cream/40 via-cream/20 to-transparent">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-maroon" />
                        <DialogTitle className="text-base font-bold uppercase tracking-wider text-maroon font-serif">
                            {collectionToEdit ? 'Edit Collection' : 'Create Collection'}
                        </DialogTitle>
                    </div>
                </DialogHeader>

                {open && (
                    <CollectionForm
                        key={collectionToEdit?.id || 'new'}
                        collectionToEdit={collectionToEdit}
                        onClose={() => onOpenChange(false)}
                        onSaved={onSaved}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
};
