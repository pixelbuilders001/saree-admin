import React from 'react';
import Barcode from 'react-barcode';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

interface BarcodeGeneratorProps {
    value: string;
    label?: string;
    isOpen: boolean;
    onClose: () => void;
}

export function BarcodeGenerator({ value, label, isOpen, onClose }: BarcodeGeneratorProps) {
    const printRef = React.useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Barcode - ${value}</title>
                    <style>
                        body {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            margin: 0;
                            font-family: sans-serif;
                        }
                        .barcode-container {
                            padding: 20px;
                            border: 1px solid #ccc;
                            text-align: center;
                        }
                        .label {
                            margin-top: 10px;
                            font-weight: bold;
                            font-size: 14px;
                        }
                        @media print {
                            body { height: auto; }
                            .barcode-container { border: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="barcode-container">
                        ${content.innerHTML}
                        ${label ? `<div class="label">${label}</div>` : ''}
                    </div>
                    <script>
                        window.onload = () => {
                            window.print();
                            window.onafterprint = () => window.close();
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md border-gold/20">
                <DialogHeader>
                    <DialogTitle className="text-maroon">Barcode for ${label || value}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center py-6 bg-white rounded-lg">
                    <div ref={printRef}>
                        <Barcode
                            value={value}
                            width={2}
                            height={100}
                            fontSize={16}
                            background="#ffffff"
                        />
                    </div>
                    {label && <p className="mt-2 font-medium text-maroon">{label}</p>}
                </div>
                <DialogFooter className="sm:justify-center gap-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="border-gold/20"
                    >
                        <X className="h-4 w-4 mr-2" />
                        Close
                    </Button>
                    <Button
                        onClick={handlePrint}
                        className="bg-maroon hover:bg-maroon-dark text-gold"
                    >
                        <Printer className="h-4 w-4 mr-2" />
                        Print Barcode
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
