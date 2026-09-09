import React, { useRef, useState, useEffect } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
    Upload,
    FileImage,
    CheckCircle2,
    AlertCircle,
    Loader2,
    X,
    FolderUp,
    Sparkles,
    Trash2,
    ImageIcon,
} from 'lucide-react';
import { inventoryService } from '@/services/inventoryService';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

export interface ParsedImageFile {
    id: string;
    file: File;
    fileName: string;
    previewUrl: string;
    sku: string;
    isPrimary: boolean;
    sortOrder: number;
    status: 'matched' | 'unmatched' | 'uploading' | 'success' | 'error';
    inventoryId?: string;
    sareeName?: string;
    errorMessage?: string;
}

interface BulkImageUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Parses file name into SKU, isPrimary, and sortOrder.
 * Examples:
 *   SB001-main.webp -> SKU: SB001, isPrimary: true, sortOrder: 0
 *   SB001-2.webp    -> SKU: SB001, isPrimary: false, sortOrder: 1
 *   SB001-3.webp    -> SKU: SB001, isPrimary: false, sortOrder: 2
 *   SB001-4.webp    -> SKU: SB001, isPrimary: false, sortOrder: 3
 *   SB001_main.jpg  -> SKU: SB001, isPrimary: true, sortOrder: 0
 */
export function parseImageFileName(fileName: string): { sku: string; isPrimary: boolean; sortOrder: number } | null {
    // Remove extension
    const baseName = fileName.replace(/\.[^/.]+$/, '').trim();
    if (!baseName) return null;

    // Pattern: {SKU}[-_](main|\d+)
    const match = baseName.match(/^(.+?)[-_](main|\d+)$/i);
    if (match) {
        const sku = match[1].trim();
        const tag = match[2].toLowerCase();
        if (tag === 'main' || tag === '1') {
            return { sku, isPrimary: true, sortOrder: 0 };
        }
        const num = parseInt(tag, 10);
        if (!isNaN(num) && num >= 2) {
            // SB001-2 -> sortOrder 1, SB001-3 -> sortOrder 2
            return { sku, isPrimary: false, sortOrder: num - 1 };
        }
        return { sku, isPrimary: false, sortOrder: isNaN(num) ? 1 : num };
    }

    // Default if no suffix: treated as main image
    return { sku: baseName, isPrimary: true, sortOrder: 0 };
}

export const BulkImageUploadModal: React.FC<BulkImageUploadModalProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<'select' | 'preview' | 'uploading' | 'done'>('select');
    const [files, setFiles] = useState<ParsedImageFile[]>([]);
    const [isResolving, setIsResolving] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; currentFile: string }>({
        current: 0,
        total: 0,
        currentFile: '',
    });
    const [summary, setSummary] = useState<{ total: number; success: number; failed: number; productsUpdated: number }>({
        total: 0,
        success: 0,
        failed: 0,
        productsUpdated: 0,
    });

    // Clean up created object URLs on unmount
    useEffect(() => {
        return () => {
            files.forEach(f => URL.revokeObjectURL(f.previewUrl));
        };
    }, [files]);

    const resetState = () => {
        files.forEach(f => URL.revokeObjectURL(f.previewUrl));
        setFiles([]);
        setStep('select');
        setIsResolving(false);
        setUploadProgress({ current: 0, total: 0, currentFile: '' });
        setSummary({ total: 0, success: 0, failed: 0, productsUpdated: 0 });
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (folderInputRef.current) folderInputRef.current.value = '';
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const processSelectedFiles = async (fileList: FileList | File[]) => {
        const rawFiles = Array.from(fileList).filter(f => {
            const ext = f.name.split('.').pop()?.toLowerCase();
            return ['webp', 'jpg', 'jpeg', 'png'].includes(ext || '');
        });

        if (rawFiles.length === 0) {
            toast.error('No valid images found (.webp, .jpg, .jpeg, .png).');
            return;
        }

        setIsResolving(true);
        setStep('preview');

        // Parse names
        const parsedList: ParsedImageFile[] = rawFiles.map(file => {
            const parsed = parseImageFileName(file.name);
            const previewUrl = URL.createObjectURL(file);
            return {
                id: `${file.name}-${Math.random().toString(36).substring(2, 9)}`,
                file,
                fileName: file.name,
                previewUrl,
                sku: parsed?.sku || '',
                isPrimary: parsed?.isPrimary ?? false,
                sortOrder: parsed?.sortOrder ?? 0,
                status: 'unmatched',
            };
        });

        // Resolve SKUs in database batch
        const skusToResolve = parsedList.map(p => p.sku).filter(Boolean);
        try {
            const skuMap = await inventoryService.batchResolveSkus(skusToResolve);

            const resolvedList = parsedList.map(item => {
                const match = skuMap.get(item.sku.toLowerCase());
                if (match) {
                    return {
                        ...item,
                        status: 'matched' as const,
                        inventoryId: match.id,
                        sareeName: match.sareeName,
                    };
                }
                return {
                    ...item,
                    status: 'unmatched' as const,
                };
            });

            setFiles(resolvedList);
        } catch (err: any) {
            toast.error('Failed to verify SKUs with database: ' + (err?.message || 'Error'));
            setFiles(parsedList);
        } finally {
            setIsResolving(false);
        }
    };

    const handleRemoveFile = (id: string) => {
        const fileToRemove = files.find(f => f.id === id);
        if (fileToRemove) URL.revokeObjectURL(fileToRemove.previewUrl);
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const handleRemoveUnmatched = () => {
        setFiles(prev => {
            const unmatched = prev.filter(f => f.status === 'unmatched');
            unmatched.forEach(f => URL.revokeObjectURL(f.previewUrl));
            return prev.filter(f => f.status === 'matched');
        });
    };

    const matchedFiles = files.filter(f => f.status === 'matched');
    const unmatchedFiles = files.filter(f => f.status === 'unmatched');
    const uniqueProducts = new Set(matchedFiles.map(f => f.inventoryId)).size;

    const handleStartUpload = async () => {
        if (matchedFiles.length === 0) {
            toast.error('No matched products to upload. Please ensure SKUs match existing products in inventory.');
            return;
        }

        setStep('uploading');
        setUploadProgress({ current: 0, total: matchedFiles.length, currentFile: '' });

        let successCount = 0;
        let failedCount = 0;
        const affectedProducts = new Set<string>();

        // Concurrency pool (upload 2 at a time)
        const concurrency = 2;
        const queue = [...matchedFiles];

        const updateItemStatus = (id: string, status: 'uploading' | 'success' | 'error', errorMessage?: string) => {
            setFiles(prev => prev.map(f => f.id === id ? { ...f, status, errorMessage } : f));
        };

        const uploadSingle = async (item: ParsedImageFile) => {
            updateItemStatus(item.id, 'uploading');
            setUploadProgress(prev => ({ ...prev, currentFile: item.fileName }));

            try {
                if (!item.inventoryId) throw new Error('Missing inventory ID');

                await inventoryService.uploadProductImageToImageKit(
                    item.file,
                    item.inventoryId,
                    item.fileName,
                    item.isPrimary,
                    item.sortOrder
                );

                successCount++;
                affectedProducts.add(item.inventoryId);
                updateItemStatus(item.id, 'success');
            } catch (err: any) {
                failedCount++;
                const msg = err?.message || 'Upload failed';
                updateItemStatus(item.id, 'error', msg);
            } finally {
                setUploadProgress(prev => ({ ...prev, current: prev.current + 1 }));
            }
        };

        // Process pool
        const executePool = async () => {
            const workers = Array(concurrency).fill(null).map(async () => {
                while (queue.length > 0) {
                    const item = queue.shift();
                    if (item) {
                        await uploadSingle(item);
                    }
                }
            });
            await Promise.all(workers);
        };

        await executePool();

        setSummary({
            total: matchedFiles.length,
            success: successCount,
            failed: failedCount,
            productsUpdated: affectedProducts.size,
        });

        // Invalidate queries so inventory updates immediately
        queryClient.invalidateQueries({ queryKey: ['sarees'] });
        setStep('done');
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col border-gold/20 shadow-2xl p-0 overflow-hidden bg-white">
                <DialogHeader className="border-b border-gold/15 px-5 py-3.5 shrink-0 bg-gradient-to-r from-cream/30 to-transparent">
                    <DialogTitle className="text-base font-bold font-serif text-maroon flex items-center gap-2">
                        <ImageIcon className="h-5 w-5 text-maroon" />
                        BULK IMAGE UPLOADER (IMAGEKIT)
                    </DialogTitle>
                </DialogHeader>

                {/* ── STEP 1: SELECT FILES ─────────────────────────────────── */}
                {step === 'select' && (
                    <div className="flex flex-col items-center gap-6 py-10 px-6 overflow-y-auto">
                        {/* Drop zone */}
                        <div
                            className="w-full max-w-lg border-2 border-dashed border-gold/50 rounded-2xl p-10 flex flex-col items-center gap-4 text-center cursor-pointer hover:bg-cream/15 hover:border-maroon/50 transition-all shadow-xs"
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                if (e.dataTransfer.files) {
                                    processSelectedFiles(e.dataTransfer.files);
                                }
                            }}
                        >
                            <div className="w-14 h-14 rounded-full bg-maroon/10 flex items-center justify-center text-maroon shadow-inner">
                                <FolderUp className="h-7 w-7" />
                            </div>
                            <div>
                                <p className="font-bold text-base text-maroon">Click to select photos or drag & drop</p>
                                <p className="text-xs text-gray-400 mt-1">Supports WebP, JPG, PNG · Select individual files or an entire folder</p>
                            </div>

                            <div className="flex items-center gap-3 mt-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-gold/40 text-maroon gap-1.5 text-xs h-9 font-semibold hover:bg-gold/10"
                                >
                                    <FileImage className="h-4 w-4" />
                                    Choose Photos
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => folderInputRef.current?.click()}
                                    className="border-gold/40 text-maroon gap-1.5 text-xs h-9 font-semibold hover:bg-gold/10"
                                >
                                    <FolderUp className="h-4 w-4" />
                                    Choose Folder
                                </Button>
                            </div>

                            {/* Hidden inputs */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept=".webp, .jpg, .jpeg, .png"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        processSelectedFiles(e.target.files);
                                    }
                                }}
                            />
                            <input
                                ref={folderInputRef}
                                type="file"
                                multiple
                                // @ts-ignore
                                webkitdirectory="true"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        processSelectedFiles(e.target.files);
                                    }
                                }}
                            />
                        </div>

                        {/* File Naming Rules Card */}
                        <div className="w-full max-w-lg bg-gradient-to-br from-cream/40 to-transparent border border-gold/25 rounded-xl p-4 text-xs text-gray-700 space-y-2.5">
                            <div className="flex items-center gap-2 font-bold text-maroon text-xs">
                                <Sparkles className="h-4 w-4 text-gold-600" />
                                File Naming Convention
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                                <div className="bg-white border border-gold/15 p-2.5 rounded-lg shadow-2xs">
                                    <div className="text-purple-700 font-bold mb-1">Primary Image:</div>
                                    <div className="text-gray-900">{`{SKU}-main.webp`}</div>
                                    <div className="text-[10px] text-gray-400 font-sans mt-1">is_primary: true · order: 0</div>
                                </div>
                                <div className="bg-white border border-gold/15 p-2.5 rounded-lg shadow-2xs">
                                    <div className="text-blue-700 font-bold mb-1">Gallery Images:</div>
                                    <div className="text-gray-900">{`{SKU}-2.webp`}, {`{SKU}-3.webp`}</div>
                                    <div className="text-[10px] text-gray-400 font-sans mt-1">follows number (order: 1, 2, 3...)</div>
                                </div>
                            </div>
                            <p className="text-[11px] text-gray-500 italic mt-1">
                                ImageKit Destination: <span className="font-mono font-semibold text-maroon">products/{'{inventory.id}'}/</span> (e.g. products/S10068/SB001-main.webp)
                            </p>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: PREVIEW & VERIFICATION ────────────────────────── */}
                {step === 'preview' && (
                    <div className="flex flex-col flex-1 min-h-0 px-5 py-3 gap-3">
                        {/* Summary Bar */}
                        <div className="flex items-center justify-between gap-3 bg-cream/20 border border-gold/15 rounded-xl px-4 py-2.5 shrink-0 flex-wrap">
                            <div className="flex items-center gap-3">
                                <div className="text-xs">
                                    <span className="text-gray-500 font-medium">Matched: </span>
                                    <span className="font-bold text-emerald-700 font-mono text-sm">{matchedFiles.length}</span>
                                    <span className="text-gray-400 text-[11px] ml-1">({uniqueProducts} products)</span>
                                </div>
                                {unmatchedFiles.length > 0 && (
                                    <div className="text-xs">
                                        <span className="text-gray-500 font-medium">Unmatched: </span>
                                        <span className="font-bold text-red-600 font-mono text-sm">{unmatchedFiles.length}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {unmatchedFiles.length > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleRemoveUnmatched}
                                        className="text-red-700 border-red-200 hover:bg-red-50 text-xs h-8 gap-1"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                        Remove {unmatchedFiles.length} Unmatched
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={resetState}
                                    className="text-gray-500 text-xs h-8"
                                >
                                    Clear All
                                </Button>
                            </div>
                        </div>

                        {/* Unmatched Alert */}
                        {unmatchedFiles.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2 flex items-center justify-between text-xs text-amber-900 shrink-0">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                                    <span>
                                        <strong>{unmatchedFiles.length} image(s)</strong> have SKUs that don't match any product in inventory. They will be skipped.
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Files Table / List */}
                        <div className="flex-1 overflow-y-auto border border-gold/15 rounded-xl bg-white min-h-0">
                            {isResolving ? (
                                <div className="h-48 flex flex-col items-center justify-center gap-2 text-xs text-maroon/60 italic">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                    Matching SKUs with inventory database...
                                </div>
                            ) : files.length === 0 ? (
                                <div className="h-40 flex items-center justify-center text-xs text-gray-400 italic">
                                    No files selected
                                </div>
                            ) : (
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-cream/30 sticky top-0 z-10 border-b border-gold/15 text-[10px] font-bold uppercase tracking-wider text-maroon">
                                        <tr>
                                            <th className="py-2 px-3">Image</th>
                                            <th className="py-2 px-3">File Name</th>
                                            <th className="py-2 px-3">SKU</th>
                                            <th className="py-2 px-3">Matched Product</th>
                                            <th className="py-2 px-3">ImageKit Destination</th>
                                            <th className="py-2 px-3">Role</th>
                                            <th className="py-2 px-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gold/10">
                                        {files.map((item) => (
                                            <tr key={item.id} className={cn("hover:bg-cream/15 transition-colors", item.status === 'unmatched' && "bg-red-50/40")}>
                                                <td className="py-2 px-3">
                                                    <img
                                                        src={item.previewUrl}
                                                        alt={item.fileName}
                                                        className="h-10 w-10 object-cover rounded-lg border border-gold/20 shadow-2xs"
                                                    />
                                                </td>
                                                <td className="py-2 px-3 font-mono font-medium text-gray-800">
                                                    {item.fileName}
                                                </td>
                                                <td className="py-2 px-3">
                                                    <span className="font-mono font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                                                        {item.sku}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3">
                                                    {item.status === 'matched' ? (
                                                        <div>
                                                            <span className="font-semibold text-gray-900 block truncate max-w-[160px]">
                                                                {item.sareeName}
                                                            </span>
                                                            <span className="text-[10px] font-mono text-purple-700 font-bold">
                                                                #{item.inventoryId}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                                            <AlertCircle className="h-3 w-3" /> SKU Not Found
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-2 px-3 font-mono text-[10px] text-gray-500">
                                                    {item.status === 'matched' ? (
                                                        <span className="truncate block max-w-[180px]" title={`products/${item.inventoryId}/${item.fileName}`}>
                                                            products/<strong className="text-maroon">{item.inventoryId}</strong>/{item.fileName}
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td className="py-2 px-3 whitespace-nowrap">
                                                    {item.isPrimary ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                                                            ★ Primary (0)
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                                            Gallery ({item.sortOrder})
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-2 px-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveFile(item.id)}
                                                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 rounded-full"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* ── STEP 3: UPLOADING PROGRESS ───────────────────────────── */}
                {step === 'uploading' && (
                    <div className="flex flex-col items-center justify-center gap-5 py-16 px-6">
                        <div className="relative">
                            <Loader2 className="h-12 w-12 text-maroon animate-spin" />
                            <ImageIcon className="h-5 w-5 text-gold absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="font-bold text-base text-maroon">Uploading Photos to ImageKit...</h3>
                            <p className="text-xs text-gray-500 font-mono">
                                {uploadProgress.current} of {uploadProgress.total} completed
                            </p>
                            {uploadProgress.currentFile && (
                                <p className="text-[11px] text-gray-400 truncate max-w-sm">
                                    Current: {uploadProgress.currentFile}
                                </p>
                            )}
                        </div>

                        {/* Progress bar */}
                        <div className="w-full max-w-md bg-gray-100 rounded-full h-2.5 overflow-hidden border border-gold/15">
                            <div
                                className="bg-gradient-to-r from-maroon to-gold h-full transition-all duration-300 rounded-full"
                                style={{
                                    width: `${uploadProgress.total > 0 ? (uploadProgress.current / uploadProgress.total) * 100 : 0}%`,
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* ── STEP 4: DONE SUMMARY ─────────────────────────────────── */}
                {step === 'done' && (
                    <div className="flex flex-col items-center gap-6 py-10 px-6 overflow-y-auto">
                        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                            <CheckCircle2 className="h-8 w-8" />
                        </div>

                        <div className="text-center space-y-1">
                            <h3 className="font-bold text-lg text-maroon font-serif">Image Upload Completed!</h3>
                            <p className="text-xs text-gray-500">
                                Photos have been uploaded to ImageKit and linked to their products.
                            </p>
                        </div>

                        {/* Metric Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg">
                            <div className="bg-cream/20 border border-gold/15 rounded-xl p-3 text-center">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total</div>
                                <div className="text-xl font-bold font-mono text-gray-800 mt-0.5">{summary.total}</div>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Uploaded</div>
                                <div className="text-xl font-bold font-mono text-emerald-800 mt-0.5">{summary.success}</div>
                            </div>
                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Products</div>
                                <div className="text-xl font-bold font-mono text-purple-800 mt-0.5">{summary.productsUpdated}</div>
                            </div>
                            <div className={cn("rounded-xl p-3 text-center border", summary.failed > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200")}>
                                <div className={cn("text-[10px] font-bold uppercase tracking-wider", summary.failed > 0 ? "text-red-700" : "text-gray-400")}>Failed</div>
                                <div className={cn("text-xl font-bold font-mono mt-0.5", summary.failed > 0 ? "text-red-800" : "text-gray-400")}>{summary.failed}</div>
                            </div>
                        </div>

                        {/* Failed items list if any */}
                        {summary.failed > 0 && (
                            <div className="w-full max-w-lg bg-red-50 border border-red-200 rounded-xl p-3 space-y-1 text-xs">
                                <div className="font-bold text-red-900">Failed files:</div>
                                {files.filter(f => f.status === 'error').map(f => (
                                    <div key={f.id} className="text-red-700 flex justify-between font-mono text-[11px]">
                                        <span>{f.fileName}</span>
                                        <span>{f.errorMessage}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── FOOTER ──────────────────────────────────────────────── */}
                <DialogFooter className="border-t border-gold/15 px-5 py-3 shrink-0 flex items-center justify-between gap-3 bg-cream/10">
                    {step === 'select' && (
                        <Button variant="ghost" size="sm" onClick={handleClose} className="text-xs">
                            Cancel
                        </Button>
                    )}

                    {step === 'preview' && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setStep('select')}
                                className="text-xs border-gold/30"
                            >
                                Back
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleStartUpload}
                                disabled={matchedFiles.length === 0 || isResolving}
                                className="bg-maroon hover:bg-maroon-dark text-gold font-bold text-xs gap-1.5 px-4 shadow-sm"
                            >
                                <Upload className="h-4 w-4" />
                                Upload {matchedFiles.length} Photos to ImageKit
                            </Button>
                        </>
                    )}

                    {step === 'done' && (
                        <Button
                            size="sm"
                            onClick={handleClose}
                            className="bg-maroon hover:bg-maroon-dark text-gold font-bold text-xs px-6 mx-auto"
                        >
                            Done & View Inventory
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
