import React, { useState, useMemo, useRef } from 'react';
import Barcode from 'react-barcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Printer,
    X,
    CheckSquare,
    Square,
    Search,
    Scissors,
    Layers,
    Tag,
    Grid,
    AlertCircle,
    Plus,
    Minus
} from 'lucide-react';
import type { Saree } from '@/services/inventoryService';

interface BatchBarcodePrinterProps {
    sarees: Saree[];
    isOpen: boolean;
    onClose: () => void;
}

export function BatchBarcodePrinter({ sarees, isOpen, onClose }: BatchBarcodePrinterProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [quantityMode, setQuantityMode] = useState<'single' | 'stock' | 'custom'>('single');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [customCounts, setCustomCounts] = useState<Record<string, number>>({});
    const [gridPreset, setGridPreset] = useState<'24' | '21' | '30' | '12'>('24');
    const [excludeOutOfStock, setExcludeOutOfStock] = useState(true);

    const hiddenRenderRef = useRef<HTMLDivElement>(null);

    // Initialize selection with all non-out-of-stock sarees when modal opens or sarees change
    React.useEffect(() => {
        if (isOpen && sarees) {
            const initialSet = new Set<string>();
            const initialCounts: Record<string, number> = {};
            sarees.forEach(s => {
                if (!excludeOutOfStock || s.stock > 0) {
                    initialSet.add(s.id);
                    initialCounts[s.id] = quantityMode === 'stock' ? Math.max(1, s.stock) : 1;
                }
            });
            setSelectedIds(initialSet);
            setCustomCounts(initialCounts);
        }
    }, [isOpen, sarees, excludeOutOfStock]);

    // Grid configuration details
    const gridConfig = useMemo(() => {
        switch (gridPreset) {
            case '12': return { cols: 2, rows: 6, perPage: 12, labelHeight: '40mm', titleSize: '11px', barcodeHeight: 45, barcodeWidth: 1.8 };
            case '21': return { cols: 3, rows: 7, perPage: 21, labelHeight: '36mm', titleSize: '9.5px', barcodeHeight: 38, barcodeWidth: 1.5 };
            case '30': return { cols: 3, rows: 10, perPage: 30, labelHeight: '26mm', titleSize: '8.5px', barcodeHeight: 28, barcodeWidth: 1.3 };
            case '24':
            default: return { cols: 3, rows: 8, perPage: 24, labelHeight: '32mm', titleSize: '9px', barcodeHeight: 34, barcodeWidth: 1.4 };
        }
    }, [gridPreset]);

    // Filter sarees based on search term
    const filteredSarees = useMemo(() => {
        if (!sarees) return [];
        return sarees.filter(saree => {
            if (excludeOutOfStock && saree.stock <= 0) return false;
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return (
                saree.sareeName.toLowerCase().includes(term) ||
                saree.id.toLowerCase().includes(term) ||
                (saree.barcode && saree.barcode.toLowerCase().includes(term)) ||
                (saree.category && saree.category.toLowerCase().includes(term)) ||
                (saree.rackNo && saree.rackNo.toLowerCase().includes(term))
            );
        });
    }, [sarees, searchTerm, excludeOutOfStock]);

    // Expand selected sarees into array of stickers to print
    const printStickersList = useMemo(() => {
        const list: { saree: Saree; copyIndex: number }[] = [];
        if (!sarees) return list;

        sarees.forEach(saree => {
            if (selectedIds.has(saree.id)) {
                const count = customCounts[saree.id] !== undefined
                    ? customCounts[saree.id]
                    : (quantityMode === 'stock' ? Math.max(1, saree.stock) : 1);
                for (let i = 0; i < count; i++) {
                    list.push({ saree, copyIndex: i + 1 });
                }
            }
        });
        return list;
    }, [sarees, selectedIds, customCounts, quantityMode]);

    // Calculate total pages
    const totalPages = Math.ceil(printStickersList.length / gridConfig.perPage);

    // Group stickers by page for preview
    const pagesList = useMemo(() => {
        const pages: { saree: Saree; copyIndex: number }[][] = [];
        for (let i = 0; i < printStickersList.length; i += gridConfig.perPage) {
            pages.push(printStickersList.slice(i, i + gridConfig.perPage));
        }
        return pages;
    }, [printStickersList, gridConfig.perPage]);

    const handleQuantityModeChange = (mode: 'single' | 'stock' | 'custom') => {
        setQuantityMode(mode);
        if (mode === 'single') {
            const nextCounts: Record<string, number> = { ...customCounts };
            selectedIds.forEach(id => {
                nextCounts[id] = 1;
            });
            setCustomCounts(nextCounts);
        } else if (mode === 'stock') {
            const nextCounts: Record<string, number> = { ...customCounts };
            sarees.forEach(s => {
                if (selectedIds.has(s.id)) {
                    nextCounts[s.id] = Math.max(1, s.stock);
                }
            });
            setCustomCounts(nextCounts);
        }
    };

    const handleToggleSelectAll = () => {
        if (selectedIds.size === filteredSarees.length) {
            setSelectedIds(new Set());
            const nextCounts = { ...customCounts };
            filteredSarees.forEach(s => {
                nextCounts[s.id] = 0;
            });
            setCustomCounts(nextCounts);
        } else {
            const nextIds = new Set<string>();
            const nextCounts = { ...customCounts };
            filteredSarees.forEach(s => {
                nextIds.add(s.id);
                if (!nextCounts[s.id] || nextCounts[s.id] <= 0) {
                    nextCounts[s.id] = quantityMode === 'stock' ? Math.max(1, s.stock) : 1;
                }
            });
            setSelectedIds(nextIds);
            setCustomCounts(nextCounts);
        }
    };

    const handleToggleSaree = (saree: Saree) => {
        const nextIds = new Set(selectedIds);
        const nextCounts = { ...customCounts };
        if (nextIds.has(saree.id)) {
            nextIds.delete(saree.id);
            nextCounts[saree.id] = 0;
        } else {
            nextIds.add(saree.id);
            nextCounts[saree.id] = (customCounts[saree.id] && customCounts[saree.id] > 0)
                ? customCounts[saree.id]
                : (quantityMode === 'stock' ? Math.max(1, saree.stock) : 1);
        }
        setSelectedIds(nextIds);
        setCustomCounts(nextCounts);
    };

    const handleUpdateCount = (sareeId: string, newCount: number) => {
        const val = Math.max(0, isNaN(newCount) ? 0 : newCount);
        setCustomCounts(prev => ({ ...prev, [sareeId]: val }));
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (val > 0) {
                next.add(sareeId);
            } else {
                next.delete(sareeId);
            }
            return next;
        });
        if (quantityMode !== 'custom') {
            setQuantityMode('custom');
        }
    };

    const handleIncrementCount = (sareeId: string, delta: number) => {
        const current = customCounts[sareeId] !== undefined
            ? customCounts[sareeId]
            : (selectedIds.has(sareeId) ? 1 : 0);
        handleUpdateCount(sareeId, current + delta);
    };

    const handleApplyBulkCount = (count: number) => {
        const nextCounts = { ...customCounts };
        selectedIds.forEach(id => {
            nextCounts[id] = count;
        });
        setCustomCounts(nextCounts);
        setQuantityMode('custom');
    };

    const handleApplyBulkStockCount = () => {
        const nextCounts = { ...customCounts };
        sarees.forEach(s => {
            if (selectedIds.has(s.id)) {
                nextCounts[s.id] = Math.max(1, s.stock);
            }
        });
        setCustomCounts(nextCounts);
        setQuantityMode('stock');
    };

    const handlePrint = () => {
        if (printStickersList.length === 0) return;

        const container = hiddenRenderRef.current;
        if (!container) return;

        // Build HTML pages from rendered sticker cards in offscreen container
        const pageElements = container.querySelectorAll('.print-a4-page-block');
        let fullPagesHTML = '';

        pageElements.forEach((pageEl) => {
            fullPagesHTML += pageEl.outerHTML;
        });

        // Create or reuse a hidden iframe for 100% reliable printing without popup window freezes
        let iframe = document.getElementById('a4-barcode-print-iframe') as HTMLIFrameElement | null;
        if (iframe && iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
        }

        iframe = document.createElement('iframe');
        iframe.id = 'a4-barcode-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) return;

        iframeDoc.open();
        iframeDoc.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8">
                    <title>A4 Inventory Barcodes - Shree Banarasi Sarees</title>
                    <style>
                        @page {
                            size: A4 portrait;
                            margin: 5mm;
                        }
                        * {
                            box-sizing: border-box;
                            margin: 0;
                            padding: 0;
                        }
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                            background-color: #ffffff;
                            color: #000000;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        .print-a4-page-block {
                            width: 200mm;
                            height: 285mm;
                            page-break-after: always;
                            break-after: page;
                            display: grid;
                            grid-template-columns: repeat(${gridConfig.cols}, 1fr);
                            grid-template-rows: repeat(${gridConfig.rows}, ${gridConfig.labelHeight});
                            gap: 2.5mm;
                            box-sizing: border-box;
                            align-content: start;
                            margin: 0 auto;
                            padding: 2mm 0;
                        }
                        /* Remove page break from last page */
                        .print-a4-page-block:last-child {
                            page-break-after: auto;
                            break-after: auto;
                        }
                        .sticker-card {
                            border: 1px dashed #64748b;
                            border-radius: 4px;
                            padding: 3px 5px;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: space-between;
                            text-align: center;
                            background: #ffffff;
                            box-sizing: border-box;
                            overflow: hidden;
                            page-break-inside: avoid;
                            break-inside: avoid;
                            height: 100%;
                        }
                        .brand-header {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-bottom: 2px;
                            width: 100%;
                        }
                        .brand-logo {
                            height: 16px;
                            width: auto;
                            object-fit: contain;
                            max-height: 16px;
                        }
                        .product-title {
                            font-size: ${gridConfig.titleSize};
                            font-weight: 700;
                            color: #0f172a;
                            line-height: 1.1;
                            max-height: 22px;
                            overflow: hidden;
                            word-break: break-word;
                            margin-bottom: 1px;
                        }
                        .sku-row {
                            font-size: 8px;
                            font-weight: 600;
                            color: #475569;
                            font-family: monospace;
                            margin-bottom: 1px;
                        }
                        .price-row {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 8.5px;
                            line-height: 1.1;
                            width: 100%;
                        }
                        .mrp-text {
                            font-weight: 800;
                            color: #000000;
                            font-size: 9.5px;
                        }
                        .barcode-box {
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            width: 100%;
                            margin-top: 1px;
                        }
                        .barcode-box svg {
                            max-width: 100%;
                            height: auto;
                            display: block;
                        }
                        @media print {
                            body {
                                background: none;
                            }
                            .print-a4-page-block {
                                height: 285mm;
                            }
                            .sticker-card {
                                border: 1px dashed #94a3b8 !important;
                            }
                        }
                    </style>
                </head>
                <body>
                    ${fullPagesHTML}
                </body>
            </html>
        `);
        iframeDoc.close();

        setTimeout(() => {
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            }
        }, 250);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 border-gold/20 shadow-2xl overflow-hidden">
                {/* Header */}
                <DialogHeader className="p-4 bg-gradient-to-r from-cream/80 via-white to-cream/50 border-b border-gold/20 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-maroon text-gold rounded-lg shadow-sm">
                            <Printer className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold font-serif text-maroon flex items-center gap-2">
                                Bulk A4 Barcode Printer
                                <span className="text-xs font-mono font-normal bg-gold/20 text-maroon px-2 py-0.5 rounded-full border border-gold/30">
                                    Cut & Paste Stickers
                                </span>
                            </DialogTitle>
                            <p className="text-xs text-gray-500 font-sans">
                                Select or search items and customize print quantities per item for A4 grid sheets
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-slate-50/50">
                    {/* Left Controls & Selection Panel (5 Cols) */}
                    <div className="lg:col-span-5 p-4 border-r border-gold/15 flex flex-col gap-3.5 overflow-y-auto bg-white">
                        {/* Print Options */}
                        <div className="space-y-2.5 p-3 bg-cream/15 border border-gold/20 rounded-xl">
                            <h3 className="text-xs font-bold text-maroon uppercase tracking-wider flex items-center gap-1.5">
                                <Grid className="h-3.5 w-3.5 text-maroon" /> Print Settings
                            </h3>

                            {/* Quantity Mode */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-gray-600 block">Default Quantity Mode</label>
                                <Select value={quantityMode} onValueChange={(v: 'single' | 'stock' | 'custom') => handleQuantityModeChange(v)}>
                                    <SelectTrigger className="h-8 text-xs border-gold/30 bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="single" className="text-xs">1 Sticker Per Selected Product</SelectItem>
                                        <SelectItem value="stock" className="text-xs">Stickers Equal to Available Stock</SelectItem>
                                        <SelectItem value="custom" className="text-xs">Custom / Individual Item Counts</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Grid Layout Preset */}
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-gray-600 block">A4 Sheet Grid Layout</label>
                                <Select value={gridPreset} onValueChange={(v: any) => setGridPreset(v)}>
                                    <SelectTrigger className="h-8 text-xs border-gold/30 bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="24" className="text-xs">24 Labels / Sheet (3 Columns x 8 Rows) - Recommended</SelectItem>
                                        <SelectItem value="21" className="text-xs">21 Labels / Sheet (3 Columns x 7 Rows) - Medium</SelectItem>
                                        <SelectItem value="30" className="text-xs">30 Labels / Sheet (3 Columns x 10 Rows) - Compact</SelectItem>
                                        <SelectItem value="12" className="text-xs">12 Labels / Sheet (2 Columns x 6 Rows) - Large</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Exclude Out of Stock Toggle */}
                            <label className="flex items-center gap-2 pt-0.5 cursor-pointer select-none text-xs text-gray-700 font-medium">
                                <input
                                    type="checkbox"
                                    checked={excludeOutOfStock}
                                    onChange={(e) => setExcludeOutOfStock(e.target.checked)}
                                    className="rounded border-gray-300 text-maroon focus:ring-maroon h-3.5 w-3.5"
                                />
                                Hide out-of-stock items (Stock = 0)
                            </label>
                        </div>

                        {/* Search & Select Inventory Items */}
                        <div className="flex-1 flex flex-col min-h-[260px] space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                                    <Tag className="h-3.5 w-3.5 text-maroon" /> Select Sarees ({selectedIds.size}/{filteredSarees.length})
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleToggleSelectAll}
                                    className="h-6 text-[11px] px-2 text-maroon font-semibold hover:bg-gold/10"
                                >
                                    {selectedIds.size === filteredSarees.length ? (
                                        <span className="flex items-center gap-1"><Square className="h-3 w-3" /> Deselect All</span>
                                    ) : (
                                        <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" /> Select All</span>
                                    )}
                                </Button>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                <Input
                                    placeholder="Search by name, ID, category, rack..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 h-8 text-xs border-gold/30 bg-white"
                                />
                            </div>

                            {/* Quick Bulk Count Setters */}
                            {selectedIds.size > 0 && (
                                <div className="flex items-center justify-between px-1 text-[11px] bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                                    <span className="font-semibold text-gray-600 text-[10px]">Set Selected Counts:</span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleApplyBulkCount(1)}
                                            className="px-1.5 py-0.5 text-[10px] font-bold font-mono text-gray-700 bg-white hover:bg-cream/40 border border-gray-300 rounded transition-colors"
                                        >
                                            All=1
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleApplyBulkCount(2)}
                                            className="px-1.5 py-0.5 text-[10px] font-bold font-mono text-gray-700 bg-white hover:bg-cream/40 border border-gray-300 rounded transition-colors"
                                        >
                                            All=2
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleApplyBulkStockCount()}
                                            className="px-1.5 py-0.5 text-[10px] font-bold font-mono text-maroon bg-gold/20 hover:bg-gold/40 border border-gold/40 rounded transition-colors"
                                        >
                                            All=Stock
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* List of Sarees with checkboxes and counter inputs */}
                            <div className="flex-1 overflow-y-auto border border-gold/20 rounded-lg divide-y divide-gray-100 bg-white max-h-[260px]">
                                {filteredSarees.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-gray-400 italic">
                                        No sarees found matching criteria
                                    </div>
                                ) : (
                                    filteredSarees.map(saree => {
                                        const isSelected = selectedIds.has(saree.id);
                                        const count = customCounts[saree.id] !== undefined
                                            ? customCounts[saree.id]
                                            : (isSelected ? (quantityMode === 'stock' ? Math.max(1, saree.stock) : 1) : 0);

                                        return (
                                            <div
                                                key={saree.id}
                                                className={`p-2 flex items-center justify-between gap-2 text-xs transition-colors ${
                                                    isSelected ? 'bg-cream/30 hover:bg-cream/40' : 'hover:bg-gray-50'
                                                }`}
                                            >
                                                {/* Left: Checkbox & Product Info */}
                                                <div
                                                    className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                                                    onClick={() => handleToggleSaree(saree)}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {}} // handled by parent div onClick
                                                        className="rounded border-gray-300 text-maroon focus:ring-maroon h-3.5 w-3.5 cursor-pointer shrink-0"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-semibold text-gray-800 truncate text-xs" title={saree.sareeName}>
                                                            {saree.sareeName}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono">
                                                            <span>ID: {saree.id}</span>
                                                            <span>•</span>
                                                            <span className="text-maroon font-bold">₹{saree.sellingPrice.toLocaleString()}</span>
                                                            <span>•</span>
                                                            <span className={`font-bold ${saree.stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                Stk: {saree.stock}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Quantity Stepper & Quick Add Buttons */}
                                                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center border border-gold/30 rounded bg-white overflow-hidden shadow-2xs">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-5 rounded-none text-gray-600 hover:bg-gold/10 hover:text-maroon p-0"
                                                            onClick={() => handleIncrementCount(saree.id, -1)}
                                                            disabled={count <= 0}
                                                            title="Decrease barcode count"
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            pattern="[0-9]*"
                                                            value={count}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value, 10);
                                                                handleUpdateCount(saree.id, isNaN(val) ? 0 : val);
                                                            }}
                                                            className="w-7 h-6 text-center text-xs font-mono font-bold text-maroon bg-white focus:outline-none border-x border-gold/20"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-5 rounded-none text-gray-600 hover:bg-gold/10 hover:text-maroon p-0"
                                                            onClick={() => handleIncrementCount(saree.id, 1)}
                                                            title="Increase barcode count (+1)"
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                    <div className="flex items-center gap-0.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleIncrementCount(saree.id, 1)}
                                                            className="px-1 py-0.5 text-[9px] font-bold font-mono text-maroon bg-gold/15 hover:bg-gold/30 rounded border border-gold/30 transition-colors"
                                                            title="Add +1 copy"
                                                        >
                                                            +1
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleIncrementCount(saree.id, 2)}
                                                            className="px-1 py-0.5 text-[9px] font-bold font-mono text-maroon bg-gold/15 hover:bg-gold/30 rounded border border-gold/30 transition-colors"
                                                            title="Add +2 copies"
                                                        >
                                                            +2
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Summary Box */}
                        <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1.5 text-xs shadow-md">
                            <div className="flex items-center justify-between text-slate-300 text-[11px]">
                                <span>Total Selected Items:</span>
                                <span className="font-mono font-bold text-white">{selectedIds.size} sarees</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-300 text-[11px]">
                                <span>Total Printable Stickers:</span>
                                <span className="font-mono font-bold text-amber-400">{printStickersList.length} stickers</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-300 text-[11px] pt-1 border-t border-slate-800">
                                <span className="flex items-center gap-1 font-semibold text-white">
                                    <Layers className="h-3.5 w-3.5 text-gold" /> Total A4 Sheets Required:
                                </span>
                                <span className="font-mono font-bold text-gold text-sm">{totalPages} {totalPages === 1 ? 'Sheet' : 'Sheets'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Live A4 Sheet Preview Area (7 Cols) */}
                    <div className="lg:col-span-7 p-4 flex flex-col bg-slate-100 overflow-y-auto max-h-[75vh]">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Scissors className="h-3.5 w-3.5 text-maroon" /> A4 Paper Layout Preview ({totalPages} {totalPages === 1 ? 'Page' : 'Pages'})
                            </span>
                            <span className="text-[11px] text-gray-500 font-medium">
                                Dashed borders show cutting lines for packages
                            </span>
                        </div>

                        {printStickersList.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center min-h-[350px] bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
                                <AlertCircle className="h-10 w-10 text-gray-300 mb-2" />
                                <p className="text-sm font-semibold text-gray-600">No Sarees Selected</p>
                                <p className="text-xs text-gray-400 mt-1 max-w-xs">
                                    Select sarees or increase count from the left panel to generate A4 barcode sheets ready for printing.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {pagesList.map((pageItems, pageIdx) => (
                                    <div key={pageIdx} className="space-y-1">
                                        <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 px-1">
                                            <span>Page {pageIdx + 1} of {totalPages} (A4 Sheet)</span>
                                            <span>{pageItems.length} stickers on this page</span>
                                        </div>

                                        {/* Visual A4 Page Box */}
                                        <div className="bg-white border border-gray-300 shadow-md rounded-sm p-4 aspect-[1/1.414] w-full max-w-[540px] mx-auto flex flex-col justify-start">
                                            <div
                                                className="grid gap-1.5 h-full w-full"
                                                style={{
                                                    gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)`,
                                                    gridTemplateRows: `repeat(${gridConfig.rows}, 1fr)`
                                                }}
                                            >
                                                {pageItems.map(({ saree, copyIndex }, itemIdx) => {
                                                    const barcodeVal = saree.barcode || saree.id;
                                                    const displayMrp = saree.mrp && saree.mrp > 0 ? saree.mrp : saree.sellingPrice;
                                                    const formattedMrp = displayMrp.toLocaleString('en-IN');
                                                    const skuVal = saree.sku || saree.id;

                                                    return (
                                                        <div
                                                            key={`${saree.id}-${copyIndex}-${itemIdx}`}
                                                            className="border border-dashed border-slate-300 rounded p-1 flex flex-col items-center justify-between text-center bg-white overflow-hidden"
                                                        >
                                                            <div className="mb-0.5 flex items-center justify-center w-full">
                                                                <img src="/logo.png" alt="Logo" className="h-4 w-auto object-contain max-h-[16px]" />
                                                            </div>
                                                            <div className="text-[8px] font-semibold text-gray-900 leading-tight line-clamp-1 max-w-[120px]">
                                                                {saree.sareeName}
                                                            </div>
                                                            <div className="text-[7.5px] font-mono text-gray-500 font-medium leading-none my-0.5 truncate max-w-[120px]">
                                                                SKU: {skuVal}
                                                            </div>
                                                            <div className="flex items-center justify-center text-[8px] leading-none my-0.5 font-mono font-bold text-gray-900">
                                                                <span>MRP: ₹{formattedMrp}</span>
                                                            </div>
                                                            <div className="w-full flex justify-center items-center my-0.5">
                                                                <Barcode
                                                                    value={barcodeVal}
                                                                    width={gridConfig.barcodeWidth}
                                                                    height={gridConfig.barcodeHeight}
                                                                    fontSize={9}
                                                                    margin={1}
                                                                    background="#ffffff"
                                                                    lineColor="#000000"
                                                                    displayValue={true}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Offscreen DOM element used to extract styled HTML for print window */}
                <div ref={hiddenRenderRef} className="fixed -left-[9999px] -top-[9999px] pointer-events-none opacity-0 z-[-100]">
                    {pagesList.map((pageItems, pageIdx) => (
                        <div key={`print-page-${pageIdx}`} className="print-a4-page-block">
                            {pageItems.map(({ saree, copyIndex }, itemIdx) => {
                                const barcodeVal = saree.barcode || saree.id;
                                const displayMrp = saree.mrp && saree.mrp > 0 ? saree.mrp : saree.sellingPrice;
                                const formattedMrp = displayMrp.toLocaleString('en-IN');
                                const skuVal = saree.sku || saree.id;

                                return (
                                    <div key={`print-item-${saree.id}-${copyIndex}-${itemIdx}`} className="sticker-card">
                                        <div className="brand-header">
                                            <img src="/logo.png" alt="Logo" className="brand-logo" />
                                        </div>
                                        <div className="product-title">{saree.sareeName}</div>
                                        <div className="sku-row">SKU: {skuVal}</div>
                                        <div className="price-row">
                                            <span className="mrp-text">MRP: ₹{formattedMrp}</span>
                                        </div>
                                        <div className="barcode-box">
                                            <Barcode
                                                value={barcodeVal}
                                                width={gridConfig.barcodeWidth}
                                                height={gridConfig.barcodeHeight}
                                                fontSize={9}
                                                margin={1}
                                                background="#ffffff"
                                                lineColor="#000000"
                                                displayValue={true}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <DialogFooter className="p-3 bg-white border-t border-gold/15 flex flex-row items-center justify-between sm:justify-between gap-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="border-gold/30 text-xs font-semibold"
                    >
                        <X className="h-4 w-4 mr-1" /> Close
                    </Button>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-mono hidden sm:inline">
                            Ready: {printStickersList.length} labels ({totalPages} A4 {totalPages === 1 ? 'page' : 'pages'})
                        </span>
                        <Button
                            onClick={handlePrint}
                            disabled={printStickersList.length === 0}
                            className="bg-gradient-to-r from-maroon to-maroon-dark hover:from-maroon-dark hover:to-maroon text-gold font-bold text-xs gap-1.5 shadow-md shadow-maroon/20 px-5 h-9"
                        >
                            <Printer className="h-4 w-4" />
                            Print A4 Barcode Pages ({totalPages} {totalPages === 1 ? 'Sheet' : 'Sheets'})
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

