import React, { useState } from 'react';
import Barcode from 'react-barcode';
import { Button } from '@/components/ui/button';
import { Printer, X, Plus, Minus, Tag } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

interface BarcodeGeneratorProps {
    value?: string;
    label?: string;
    sareeName?: string;
    mrp?: number;
    sellingPrice?: number;
    code?: string;
    stock?: number;
    sku?: string;
    isOpen: boolean;
    onClose: () => void;
}

export function BarcodeGenerator({
    value = '',
    label = '',
    sareeName = '',
    mrp = 0,
    sellingPrice = 0,
    code = '',
    sku = '',
    isOpen,
    onClose
}: BarcodeGeneratorProps) {
    const printRef = React.useRef<HTMLDivElement>(null);
    const [quantity, setQuantity] = useState<number>(1);

    // Reset quantity when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setQuantity(1);
        }
    }, [isOpen]);

    const nameToShow = sareeName || label || 'Saree Product';
    const barcodeVal = value || code || '';
    const displayMrp = mrp && mrp > 0 ? mrp : sellingPrice;
    const formattedMrp = displayMrp ? displayMrp.toLocaleString('en-IN') : '0';
    const skuToShow = sku || code || '';

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;

        const singleStickerHTML = content.innerHTML;

        // Generate multiple sticker items based on quantity
        let stickersHTML = '';
        for (let i = 0; i < quantity; i++) {
            stickersHTML += `<div class="sticker-item">${singleStickerHTML}</div>`;
        }

        let iframe = document.getElementById('single-barcode-print-iframe') as HTMLIFrameElement | null;
        if (iframe && iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
        }

        iframe = document.createElement('iframe');
        iframe.id = 'single-barcode-print-iframe';
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
                    <title>Barcode Label - ${barcodeVal}</title>
                    <style>
                        @page {
                            margin: 4mm;
                            size: auto;
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
                            padding: 8px;
                        }
                        .stickers-container {
                            display: flex;
                            flex-wrap: wrap;
                            gap: 12px;
                            justify-content: flex-start;
                        }
                        .sticker-item {
                            width: 58mm;
                            padding: 6px 8px;
                            border: 1px dashed #cccccc;
                            border-radius: 4px;
                            background: #ffffff;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            text-align: center;
                            page-break-inside: avoid;
                        }
                        .brand-header {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-bottom: 3px;
                            width: 100%;
                        }
                        .brand-logo {
                            height: 32px;
                            width: auto;
                            object-fit: contain;
                            max-height: 32px;
                        }
                        .sku-text {
                            font-size: 8.5px;
                            font-weight: 600;
                            color: #475569;
                            font-family: monospace;
                            margin-bottom: 2px;
                        }
                        .price-container {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 10px;
                            line-height: 1.1;
                            margin-bottom: 2px;
                            width: 100%;
                        }
                        .mrp-text {
                            font-weight: 700;
                            color: #000000;
                            font-size: 10.5px;
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
                                padding: 0;
                            }
                            .stickers-container {
                                gap: 6mm 4mm;
                            }
                            .sticker-item {
                                border: none;
                                padding: 2px 4px;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="stickers-container">
                        ${stickersHTML}
                    </div>
                </body>
            </html>
        `);
        iframeDoc.close();

        setTimeout(() => {
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            }
        }, 200);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md border-gold/20 shadow-xl">
                <DialogHeader>
                    <DialogTitle className="text-maroon flex items-center gap-2 text-base font-serif">
                        <Tag className="h-4 w-4 text-maroon" />
                        Barcode Tag Printer
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center py-4 px-2 bg-slate-50/70 rounded-xl border border-gold/10">
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">Tag Label Preview</p>
                    
                    {/* Printable sticker preview container */}
                    <div
                        ref={printRef}
                        className="w-[220px] p-3 bg-white border border-dashed border-gray-300 rounded-lg shadow-sm flex flex-col items-center text-center select-none"
                    >
                        {/* Store Logo Header */}
                        <div className="brand-header mb-2 flex items-center justify-center w-full">
                            <img src="/logo.png" alt="Store Logo" className="brand-logo h-9 w-auto object-contain max-h-[36px]" />
                        </div>

                        {/* SKU Code */}
                        <div className="sku-text text-[9px] font-mono font-medium text-gray-500 mb-1 tracking-wide">
                            SKU: {skuToShow}
                        </div>

                        {/* Price Details - Only MRP */}
                        <div className="price-container flex items-center justify-center text-[10.5px] mb-1 w-full font-mono font-bold text-gray-900">
                            <span className="mrp-text">
                                MRP: ₹{formattedMrp}
                            </span>
                        </div>

                        {/* Barcode Graphic */}
                        <div className="barcode-box flex items-center justify-center w-full mt-0.5">
                            {barcodeVal ? (
                                <Barcode
                                    value={barcodeVal}
                                    width={1.6}
                                    height={40}
                                    fontSize={11}
                                    margin={2}
                                    background="#ffffff"
                                    lineColor="#000000"
                                />
                            ) : (
                                <p className="text-xs text-red-500 italic py-2">No barcode value available</p>
                            )}
                        </div>
                    </div>

                    {/* Quantity Selector */}
                    <div className="mt-4 flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-gold/20 shadow-xs">
                        <span className="text-xs font-semibold text-gray-600">Copies to print:</span>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 rounded-md border-gray-300"
                                onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                                disabled={quantity <= 1}
                            >
                                <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-xs font-bold font-mono">{quantity}</span>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6 rounded-md border-gray-300"
                                onClick={() => setQuantity(prev => prev + 1)}
                            >
                                <Plus className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter className="sm:justify-between gap-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="border-gold/20 text-xs"
                    >
                        <X className="h-4 w-4 mr-1.5" />
                        Close
                    </Button>
                    <Button
                        onClick={handlePrint}
                        disabled={!barcodeVal}
                        className="bg-maroon hover:bg-maroon-dark text-gold text-xs font-bold"
                    >
                        <Printer className="h-4 w-4 mr-1.5" />
                        Print {quantity > 1 ? `${quantity} Labels` : 'Barcode Label'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

