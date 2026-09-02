import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, Link2, Check, X, Receipt } from "lucide-react";
import { toast } from 'sonner';
import type { Sale } from '@/services/salesService';
import { generateReceiptUrl } from '@/utils/receiptUtils';

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: Sale | null;
}

export function ReceiptModal({ isOpen, onClose, sale }: ReceiptModalProps) {
    const [copied, setCopied] = React.useState(false);

    if (!sale) return null;

    const receiptUrl = generateReceiptUrl(sale);

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(receiptUrl);
            setCopied(true);
            toast.success('Link copied!');
            setTimeout(() => setCopied(false), 2500);
        } catch {
            toast.error('Could not copy link.');
        }
    };

    const handleWhatsApp = () => {
        const customerName = sale.customerName || 'Valued Customer';
        const message = encodeURIComponent(
            `✨ *SHREE BANARASI SAREES* ✨\n\n` +
            `Dear *${customerName}*,\n\n` +
            `Thank you for shopping with us! 🛍️\n` +
            `*Invoice No:* ${sale.invoiceNumber}\n` +
            `*Total Paid:* ₹${sale.totalAmount.toLocaleString('en-IN')}\n\n` +
            `We hope to see you again soon! 🙏\n\n` +
            `📲 View & Save your Digital Receipt:\n` +
            `${receiptUrl}`
        );
        const phone = sale.customerMobile?.replace(/\D/g, '') || '';
        window.open(phone ? `https://wa.me/91${phone}?text=${message}` : `https://wa.me/?text=${message}`, '_blank');
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="p-0 overflow-hidden border-0 shadow-2xl" style={{ maxWidth: '360px', borderRadius: '16px' }}>

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                >
                    <X className="h-3.5 w-3.5" />
                </button>

                {/* ── Top success band ── */}
                <div
                    className="text-white text-center px-6 pt-6 pb-5"
                    style={{ background: 'linear-gradient(135deg, #800000 0%, #5a0000 100%)' }}
                >
                    <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">
                        <Receipt className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-0.5">
                        Sale Complete {sale.isGstApplied ? '• Incl. GST (5%)' : ''}
                    </p>
                    <h2 className="text-lg font-bold text-white">₹{sale.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                    <p className="text-white/60 text-[11px] font-mono mt-1">{sale.invoiceNumber}</p>
                </div>

                {/* ── Customer strip ── */}
                <div className="flex items-center justify-between px-5 py-2.5 bg-stone-50 border-b border-stone-100 text-xs">
                    <span className="text-stone-500">Customer</span>
                    <span className="font-semibold text-stone-700 truncate max-w-[180px]">
                        {sale.customerName || 'Walk-in'}{sale.customerMobile ? ` · ${sale.customerMobile}` : ''}
                    </span>
                </div>

                {/* ── Action buttons ── */}
                <div className="px-4 py-4 space-y-2 bg-white">

                    {/* WhatsApp — primary */}
                    <button
                        onClick={handleWhatsApp}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-semibold transition-all active:scale-[0.98]"
                        style={{ background: '#25D366' }}
                    >
                        <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                            <MessageSquare className="h-4 w-4" />
                        </div>
                        <span>Send via WhatsApp</span>
                    </button>

                    {/* Copy link + Download — side by side */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={handleCopyLink}
                            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 transition-all active:scale-[0.98]"
                        >
                            {copied
                                ? <><Check className="h-3.5 w-3.5 text-green-600" /><span className="text-green-600">Copied!</span></>
                                : <><Link2 className="h-3.5 w-3.5" />Copy Link</>
                            }
                        </button>
                        <button
                            onClick={() => window.open(`/receipt/${sale.invoiceNumber}?print=true`, '_blank')}
                            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 transition-all active:scale-[0.98]"
                        >
                            <FileText className="h-3.5 w-3.5" />
                            Download PDF
                        </button>
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="px-4 pb-4 bg-white">
                    <button
                        onClick={onClose}
                        className="w-full py-2 rounded-xl text-xs text-stone-400 hover:text-stone-600 transition-colors font-medium"
                    >
                        Close
                    </button>
                </div>

            </DialogContent>
        </Dialog>
    );
}
