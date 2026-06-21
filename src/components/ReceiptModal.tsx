import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, Download, CheckCircle2 } from "lucide-react";
import { toast } from 'sonner';
import type { Sale } from '@/services/salesService';
import { receiptService } from '@/services/receiptService';

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: Sale | null;
}

export function ReceiptModal({ isOpen, onClose, sale }: ReceiptModalProps) {
    if (!sale) return null;

    const handleDownloadPDF = () => {
        receiptService.downloadPDF(sale);
    };

    const handleShareWhatsApp = async () => {
        const result = await receiptService.sharePDF(sale);
        if (result === 'fallback') {
            toast.info('Sharing not supported on this browser. PDF has been downloaded instead.');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px] border-gold/20 shadow-2xl">
                <DialogHeader className="text-center">
                    <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="h-10 w-10 text-green-600" />
                    </div>
                    <DialogTitle className="text-2xl font-bold text-maroon">Sale Completed!</DialogTitle>
                    <p className="text-gray-500 mt-2">Bill No: {sale.saleId}</p>
                </DialogHeader>

                <div className="py-6 space-y-4">
                    <div className="bg-cream/20 p-4 rounded-lg border border-gold/10 space-y-2">
                        <div className="flex justify-between items-center pb-2 border-b border-gold/10">
                            <span className="font-semibold text-maroon">Total Amount</span>
                            <span className="text-xl font-bold text-maroon">₹{sale.totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                            <p>Customer: {sale.customerName || 'Walk-in'}</p>
                            <p>Mobile: {sale.customerMobile || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <Button
                            onClick={handleDownloadPDF}
                            className="w-full bg-maroon hover:bg-maroon/90 text-white flex gap-2 h-12"
                        >
                            <FileText className="h-5 w-5" />
                            Download Bill (PDF)
                        </Button>

                        <Button
                            onClick={handleShareWhatsApp}
                            className="w-full bg-green-600 hover:bg-green-700 text-white flex gap-2 h-12"
                        >
                            <MessageSquare className="h-5 w-5" />
                            Send Receipt via WhatsApp
                        </Button>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} className="w-full border-gold/30">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
