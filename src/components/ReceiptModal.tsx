import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Download, MessageSquare, Link2, Check, X, Receipt, Building2 } from "lucide-react";
import { toast } from 'sonner';
import type { Sale } from '@/services/salesService';
import { generateReceiptUrl, mapSaleToReceiptData, encodeReceiptData } from '@/utils/receiptUtils';

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: Sale | null;
}

export function ReceiptModal({ isOpen, onClose, sale }: ReceiptModalProps) {
    const [copied, setCopied] = React.useState(false);

    if (!sale) return null;

    const receiptData = mapSaleToReceiptData(sale);
    const payload = encodeReceiptData(receiptData);
    const receiptUrl = generateReceiptUrl(sale);
    const printUrl = `/receipt/${encodeURIComponent(sale.invoiceNumber)}?print=true&d=${payload}`;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(receiptUrl);
            setCopied(true);
            toast.success('Receipt link copied!');
            setTimeout(() => setCopied(false), 2500);
        } catch {
            toast.error('Could not copy link.');
        }
    };

    const handleWhatsApp = () => {
        const customerName = sale.customerName || 'Valued Customer';
        const isGst = Boolean(sale.isGstApplied);
        const invoiceTypeLabel = isGst ? 'Tax Invoice' : 'Receipt';
        const message = encodeURIComponent(
            `✨ *SHREE BANARASI SAREES* ✨\n\n` +
            `Dear *${customerName}*,\n\n` +
            `Thank you for shopping with us! 🛍️\n` +
            `*${invoiceTypeLabel} No:* ${sale.invoiceNumber}\n` +
            `*Total Paid:* ₹${sale.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n` +
            `We hope to see you again soon! 🙏\n\n` +
            `📲 View & Download your Digital ${invoiceTypeLabel}:\n` +
            `${receiptUrl}`
        );
        const phone = sale.customerMobile?.replace(/\D/g, '') || '';
        window.open(phone ? `https://wa.me/91${phone}?text=${message}` : `https://wa.me/?text=${message}`, '_blank');
    };

    const itemsSubtotal = (sale.items && sale.items.length > 0)
        ? sale.items.reduce((s, it) => s + (it.quantity * (it.sellingPrice || 0)), 0)
        : (sale.subtotal || sale.totalAmount);

    const isGst = Boolean(sale.isGstApplied);
    const taxableValue = sale.taxableAmount != null
        ? Number(sale.taxableAmount)
        : (isGst ? Math.max(0, itemsSubtotal - (sale.discountAmount || 0)) : null);

    const cgstAmt = sale.cgstAmount != null ? Number(sale.cgstAmount) : (isGst && taxableValue ? Math.round(taxableValue * 0.025 * 100) / 100 : 0);
    const sgstAmt = sale.sgstAmount != null ? Number(sale.sgstAmount) : (isGst && taxableValue ? Math.round(taxableValue * 0.025 * 100) / 100 : 0);
    const totalGstAmt = sale.totalGst != null ? Number(sale.totalGst) : (cgstAmt + sgstAmt);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="p-0 overflow-hidden border-0 shadow-2xl bg-[#FAF7F0]" style={{ maxWidth: '400px', borderRadius: '18px' }}>

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-3.5 right-3.5 z-10 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                >
                    <X className="h-3.5 w-3.5" />
                </button>

                {/* ── Top Success Header ── */}
                <div
                    className="text-white text-center px-6 pt-6 pb-5"
                    style={{ background: 'linear-gradient(135deg, #6B1725 0%, #450C16 100%)' }}
                >
                    <div className="w-11 h-11 rounded-full bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-2.5 shadow-sm">
                        <Receipt className="h-5 w-5 text-[#FAF7F0]" />
                    </div>
                    <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#FAF7F0]/75 mb-0.5">
                        {isGst ? 'Sale Complete • Tax Invoice (5% GST)' : 'Sale Complete • Without GST'}
                    </p>
                    <h2 className="text-xl font-serif font-bold text-white tracking-wide">
                        ₹{sale.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h2>
                    <p className="text-white/60 text-[11px] font-mono mt-1">{sale.invoiceNumber}</p>
                </div>

                <div className="p-4 sm:p-5 space-y-3.5">
                    {/* ── Tax Invoice & GST / Sale Summary Card (Storefront Checkout Success Style) ── */}
                    <div className="bg-white rounded-2xl p-4 border border-[#E5DEC9] shadow-2xs space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-sans font-medium text-[#7A6E65] uppercase tracking-wider">
                                {isGst ? 'TAX INVOICE & GST' : 'SALE RECEIPT SUMMARY'}
                            </span>
                            <span className="text-xs font-mono font-bold text-[#6B1725] bg-[#FAF6EE] border border-[#E5DEC9] px-2 py-0.5 rounded">
                                {sale.invoiceNumber}
                            </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-[#7A6E65] pt-1.5 border-t border-[#F3ECE0]">
                            {/* In-store items subtotal / taxable base */}
                            {isGst ? (
                                <>
                                    {taxableValue != null && (
                                        <div className="flex justify-between">
                                            <span>Taxable Value</span>
                                            <span className="font-medium text-[#292524]">
                                                ₹{taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span>Total GST ({sale.gstRate || 5}%)</span>
                                        <span className="font-medium text-[#292524]">
                                            ₹{totalGstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    {cgstAmt > 0 && (
                                        <div className="flex justify-between text-[11px] pl-2 text-[#7A6E65]">
                                            <span>CGST ({(Number(sale.gstRate || 5) / 2).toFixed(1)}%)</span>
                                            <span>₹{cgstAmt.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {sgstAmt > 0 && (
                                        <div className="flex justify-between text-[11px] pl-2 text-[#7A6E65]">
                                            <span>SGST ({(Number(sale.gstRate || 5) / 2).toFixed(1)}%)</span>
                                            <span>₹{sgstAmt.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {Number(sale.igstAmount || 0) > 0 && (
                                        <div className="flex justify-between text-[11px] pl-2 text-[#7A6E65]">
                                            <span>IGST ({Number(sale.gstRate || 5)}%)</span>
                                            <span>₹{Number(sale.igstAmount).toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-[10px] text-[#A89F91] pt-0.5">
                                        <span>Place of Supply</span>
                                        <span>{sale.placeOfSupply || 'Bihar (10)'}</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-between">
                                        <span>Subtotal</span>
                                        <span className="font-medium text-[#292524]">
                                            ₹{itemsSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    {Number(sale.discountAmount || 0) > 0 && (
                                        <div className="flex justify-between text-[#b91c1c]">
                                            <span>Discount</span>
                                            <span className="font-medium">
                                                − ₹{Number(sale.discountAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    )}
                                    {Number(sale.appliedVoucherAmount || 0) > 0 && (
                                        <div className="flex justify-between text-[#b91c1c]">
                                            <span>Voucher ({sale.appliedVoucherCode})</span>
                                            <span className="font-medium">
                                                − ₹{Number(sale.appliedVoucherAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-[10px] text-[#A89F91] pt-0.5">
                                        <span>Tax Treatment</span>
                                        <span>Non-GST Retail Bill</span>
                                    </div>
                                </>
                            )}

                            <div className="flex justify-between pt-1.5 border-t border-[#F3ECE0] font-semibold text-[#292524] text-xs">
                                <span>Total Paid ({sale.paymentMode || 'Cash'})</span>
                                <span>₹{sale.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>

                        {/* Direct View & Download button inside card (Identical to storefront) */}
                        <div className="pt-2 border-t border-[#F3ECE0]">
                            <button
                                onClick={() => window.open(printUrl, '_blank')}
                                className="w-full text-xs font-semibold text-[#6B1725] hover:text-[#52111C] flex items-center justify-center gap-1.5 py-2.5 bg-[#FAF7F0] hover:bg-[#F3ECE0] border border-[#E5DEC9] rounded-xl transition-colors font-sans cursor-pointer active:scale-[0.98]"
                            >
                                <Download size={13} />
                                <span>{isGst ? 'View & Download Tax Invoice' : 'View & Download Retail Receipt'}</span>
                            </button>
                        </div>
                    </div>

                    {/* ── Customer Info Strip ── */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-white rounded-xl border border-[#E5DEC9] text-xs">
                        <span className="text-[#7A6E65]">Customer</span>
                        <span className="font-medium text-[#292524] truncate max-w-[200px]">
                            {sale.customerName || 'Walk-in'}{sale.customerMobile ? ` · ${sale.customerMobile}` : ''}
                        </span>
                    </div>

                    {/* ── Action buttons: WhatsApp & Copy Link ── */}
                    <div className="space-y-2 pt-1">
                        {/* WhatsApp — primary */}
                        <button
                            onClick={handleWhatsApp}
                            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-white text-sm font-semibold transition-all shadow-xs active:scale-[0.98] cursor-pointer"
                            style={{ background: '#25D366' }}
                        >
                            <MessageSquare className="h-4 w-4" />
                            <span>Send Receipt via WhatsApp</span>
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={handleCopyLink}
                                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#E5DEC9] text-xs font-semibold text-[#292524] bg-white hover:bg-[#FAF7F0] transition-all active:scale-[0.98] cursor-pointer"
                            >
                                {copied
                                    ? <><Check className="h-3.5 w-3.5 text-green-600" /><span className="text-green-600">Copied!</span></>
                                    : <><Link2 className="h-3.5 w-3.5 text-[#7A6E65]" /><span>Copy Link</span></>
                                }
                            </button>

                            <button
                                onClick={onClose}
                                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-[#E5DEC9] text-xs font-semibold text-[#7A6E65] bg-white hover:bg-[#FAF7F0] hover:text-[#292524] transition-all active:scale-[0.98] cursor-pointer"
                            >
                                <span>Done</span>
                            </button>
                        </div>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
}
