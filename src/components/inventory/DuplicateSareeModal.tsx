import React, { useState, useEffect, useMemo } from 'react';
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
import { Copy, Layers, Loader2, Tag, AlertCircle, Package } from 'lucide-react';
import { inventoryService, parseSkuForSerial, type Saree } from '@/services/inventoryService';
import { toast } from 'sonner';

interface DuplicateSareeModalProps {
    saree: Saree | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (createdCount: number) => void;
}

export function DuplicateSareeModal({
    saree,
    isOpen,
    onClose,
    onSuccess,
}: DuplicateSareeModalProps) {
    const [numberOfPieces, setNumberOfPieces] = useState<number>(7);
    const [baseSkuPrefix, setBaseSkuPrefix] = useState<string>('');
    const [startingSerial, setStartingSerial] = useState<number>(2);
    const [padLength, setPadLength] = useState<number>(2);
    const [copyImages, setCopyImages] = useState<boolean>(true);
    const [stockPerPiece, setStockPerPiece] = useState<number>(1);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [existingDuplicates, setExistingDuplicates] = useState<string[]>([]);
    const [isValidatingSkus, setIsValidatingSkus] = useState<boolean>(false);

    // Initialize fields when saree changes or modal opens
    useEffect(() => {
        if (saree && isOpen) {
            const rawSku = saree.sku || saree.designCode || saree.id;
            const parsed = parseSkuForSerial(rawSku);
            setBaseSkuPrefix(parsed.prefix);
            setStartingSerial(parsed.nextNumber);
            setPadLength(parsed.padLength);
            setNumberOfPieces(7);
            setCopyImages(true);
            setStockPerPiece(1);
            setError(null);
            setExistingDuplicates([]);
        }
    }, [saree, isOpen]);

    // Live preview of generated pieces
    const previewList = useMemo(() => {
        if (!saree) return [];
        const count = Math.min(Math.max(1, numberOfPieces || 1), 50);
        const list: { serial: number; sku: string; barcode: string }[] = [];
        let curr = startingSerial;
        for (let i = 0; i < count; i++) {
            const serialStr = String(curr).padStart(padLength, '0');
            const sku = `${baseSkuPrefix}${serialStr}`;
            list.push({
                serial: curr,
                sku,
                barcode: sku,
            });
            curr++;
        }
        return list;
    }, [saree, numberOfPieces, baseSkuPrefix, startingSerial, padLength]);

    // Real-time check if any previewed SKU already exists in inventory
    useEffect(() => {
        if (!isOpen || previewList.length === 0) {
            setExistingDuplicates([]);
            return;
        }

        let isMounted = true;
        setIsValidatingSkus(true);

        const timer = setTimeout(async () => {
            try {
                const skus = previewList.map(p => p.sku);
                const found = await inventoryService.findExistingSkus(skus);
                if (isMounted) {
                    setExistingDuplicates(found.map(s => s.toUpperCase()));
                }
            } catch (err) {
                console.error('Error checking duplicate SKUs:', err);
            } finally {
                if (isMounted) {
                    setIsValidatingSkus(false);
                }
            }
        }, 250);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [isOpen, previewList]);

    if (!saree) return null;

    const primaryImage = saree.images?.find(i => i.isPrimary)?.imageUrl || saree.images?.[0]?.imageUrl;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (numberOfPieces < 1 || numberOfPieces > 50) {
            setError('Please enter between 1 and 50 pieces.');
            return;
        }
        if (!baseSkuPrefix.trim()) {
            setError('Base SKU Prefix cannot be empty.');
            return;
        }
        if (existingDuplicates.length > 0) {
            setError(`Cannot create pieces: SKU "${existingDuplicates[0]}" already exists in inventory. Please choose a different starting serial number or prefix.`);
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await inventoryService.duplicateSareePieces({
                sourceSareeId: saree.id,
                numberOfPieces,
                baseSkuPrefix: baseSkuPrefix.trim(),
                startingSerial,
                padLength,
                stockPerPiece,
                copyImages,
            });

            toast.success(`${numberOfPieces} serialized piece${numberOfPieces > 1 ? 's' : ''} created successfully!`);
            onSuccess(numberOfPieces);
            onClose();
        } catch (err: any) {
            console.error('Error duplicating saree pieces:', err);
            setError(err?.message || 'Failed to create serialized pieces. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-gold/20 shadow-2xl bg-white">
                {/* Header */}
                <div className="bg-gradient-to-r from-maroon to-maroon-dark text-white p-4">
                    <DialogHeader>
                        <DialogTitle className="text-base font-serif font-bold text-gold flex items-center gap-2">
                            <Layers className="h-4 w-4 text-gold" />
                            Generate Serialized Pieces
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center gap-3 mt-2 bg-white/10 p-2 rounded-lg border border-white/10">
                        {primaryImage ? (
                            <img
                                src={primaryImage}
                                alt={saree.sareeName}
                                className="h-10 w-10 object-cover rounded border border-gold/30 bg-black/20 shrink-0"
                            />
                        ) : (
                            <div className="h-10 w-10 rounded border border-gold/30 bg-black/20 flex items-center justify-center shrink-0">
                                <Package className="h-5 w-5 text-gold/60" />
                            </div>
                        )}
                        <div className="min-w-0 text-left">
                            <p className="text-xs font-semibold text-white truncate">{saree.sareeName}</p>
                            <p className="text-[10px] text-gold/80 font-mono">
                                Base SKU: {saree.sku || saree.id} • Selling: ₹{saree.sellingPrice.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs font-sans">
                    {error && (
                        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {existingDuplicates.length > 0 && !error && (
                        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 text-xs flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                            <div>
                                <p className="font-semibold text-rose-800">Duplicate SKU Conflict</p>
                                <p className="text-[11px] text-rose-700 mt-0.5">
                                    SKU <span className="font-mono font-bold text-rose-900">"{existingDuplicates[0]}"</span> already exists in inventory. Please change the starting serial number or base prefix.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Number of Pieces */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                            <span>How many additional pieces to create?</span>
                            <span className="text-[11px] font-mono text-gray-500 font-normal">
                                Total pieces: {(numberOfPieces || 0) + 1}
                            </span>
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                min={1}
                                max={50}
                                value={numberOfPieces || ''}
                                onChange={(e) => setNumberOfPieces(parseInt(e.target.value, 10) || 1)}
                                className="font-mono text-sm font-bold w-28 h-9 border-gold/30 focus-visible:ring-gold"
                            />
                            {/* Quick Select Buttons */}
                            <div className="flex items-center gap-1 flex-wrap">
                                {[1, 3, 5, 7, 10].map(cnt => (
                                    <button
                                        key={cnt}
                                        type="button"
                                        onClick={() => setNumberOfPieces(cnt)}
                                        className={`px-2 py-1 rounded text-[11px] font-mono font-medium border transition-colors cursor-pointer ${
                                            numberOfPieces === cnt
                                                ? 'bg-maroon text-gold border-maroon'
                                                : 'bg-cream/20 text-gray-700 border-gold/20 hover:bg-gold/10'
                                        }`}
                                    >
                                        +{cnt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Base SKU Prefix & Starting Number */}
                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-gray-600">Base SKU Prefix</Label>
                            <Input
                                type="text"
                                value={baseSkuPrefix}
                                onChange={(e) => setBaseSkuPrefix(e.target.value)}
                                placeholder="e.g. SBS-100-"
                                className="font-mono text-xs h-8 border-gold/30 uppercase"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[11px] font-semibold text-gray-600">Starting Serial Number</Label>
                            <Input
                                type="number"
                                min={1}
                                value={startingSerial || ''}
                                onChange={(e) => setStartingSerial(parseInt(e.target.value, 10) || 1)}
                                className="font-mono text-xs h-8 border-gold/30"
                            />
                        </div>
                    </div>

                    {/* Toggle: Copy Images & Stock per piece */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-gold/15 rounded-lg">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={copyImages}
                                onChange={(e) => setCopyImages(e.target.checked)}
                                className="rounded text-maroon focus:ring-gold h-4 w-4"
                            />
                            <span className="text-[11px] text-gray-700 font-medium">Link photos to all new pieces</span>
                        </label>
                        <span className="text-[11px] text-gray-500 font-mono">Stock: {stockPerPiece} ea.</span>
                    </div>

                    {/* Live Preview List */}
                    <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-gray-600 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                                <Tag className="h-3 w-3 text-gold-dark" />
                                Preview of Generated Unique Pieces
                            </span>
                            <span className="text-[10px] text-gray-400 font-normal">
                                {previewList.length} new records
                            </span>
                        </Label>
                        <div className="border border-gold/20 rounded-lg max-h-36 overflow-y-auto divide-y divide-gold/10 bg-white font-mono text-[11px]">
                            {/* Original Base Row */}
                            <div className="p-2 flex items-center justify-between bg-slate-50 text-gray-500">
                                <span className="flex items-center gap-1 font-semibold">
                                    <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                                    Original
                                </span>
                                <span className="font-bold text-gray-800">{saree.sku || saree.id}</span>
                                <Badge variant="outline" className="text-[9px] h-4 py-0">Source</Badge>
                            </div>
                            {/* Duplicated Rows Preview */}
                            {previewList.map((item, idx) => {
                                const isDuplicate = existingDuplicates.includes(item.sku.toUpperCase());
                                return (
                                    <div
                                        key={idx}
                                        className={`p-2 flex items-center justify-between transition-colors ${
                                            isDuplicate ? 'bg-rose-50/70' : 'hover:bg-gold/5'
                                        }`}
                                    >
                                        <span className="flex items-center gap-1 text-gray-600 font-medium">
                                            <span className={`h-1.5 w-1.5 rounded-full ${isDuplicate ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                            Piece #{idx + 2}
                                        </span>
                                        <span className={`font-bold ${isDuplicate ? 'text-rose-700' : 'text-maroon'}`}>
                                            {item.sku}
                                        </span>
                                        {isDuplicate ? (
                                            <Badge variant="destructive" className="text-[9px] h-4 py-0 bg-rose-600 font-sans">
                                                Already Exists
                                            </Badge>
                                        ) : (
                                            <span className="text-[10px] text-gray-400">Stock: {stockPerPiece}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer */}
                    <DialogFooter className="pt-2 gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="text-xs h-9 cursor-pointer"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || numberOfPieces < 1 || existingDuplicates.length > 0 || isValidatingSkus}
                            className="bg-maroon hover:bg-maroon-dark text-gold font-bold text-xs h-9 px-4 flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Creating Pieces...
                                </>
                            ) : isValidatingSkus ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Checking SKUs...
                                </>
                            ) : (
                                <>
                                    <Copy className="h-3.5 w-3.5" />
                                    Create {numberOfPieces} Pieces
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
