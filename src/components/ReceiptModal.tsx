import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Download, MessageSquare, Link2, Check, X, Receipt, Building2 } from "lucide-react";
import { toast } from 'sonner';
import type { Sale } from '@/services/salesService';
import { generateReceiptUrl, mapSaleToReceiptData, encodeReceiptData } from '@/utils/receiptUtils';
import { copyTextToClipboard } from '@/lib/utils';

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: any | null;
}

export function ReceiptModal({ isOpen, onClose, sale }: ReceiptModalProps) {
    const [copied, setCopied] = React.useState(false);

    if (!sale) return null;

    const receiptData = mapSaleToReceiptData(sale);
    const payload = encodeReceiptData(receiptData);
    const receiptUrl = generateReceiptUrl(sale);
    const invoiceNum = receiptData.invoiceNumber || sale.invoiceNumber || sale.orderNumber || 'INV';
    const printUrl = `/receipt/${encodeURIComponent(invoiceNum)}?print=true&d=${payload}`;

    const handleCopyLink = async () => {
        const success = await copyTextToClipboard(receiptUrl);
        if (success) {
            setCopied(true);
            toast.success('Receipt link copied!');
            setTimeout(() => setCopied(false), 2500);
        } else {
            toast.error('Could not copy link.');
        }
    };

    const isGst = Boolean(receiptData.isGstApplied);
    const invoiceTypeLabel = isGst ? 'Tax Invoice' : 'Receipt';
    const customerName = receiptData.customerName || sale.customerName || 'Valued Customer';
    const totalAmount = Number(receiptData.totalAmount || sale.totalAmount || 0);

    const handleWhatsApp = () => {
        const message = encodeURIComponent(
            `✨ *SHREE BANARASI SAREES* ✨\n\n` +
            `Dear *${customerName}*,\n\n` +
            `Thank you for shopping with us! 🛍️\n` +
            `*${invoiceTypeLabel} No:* ${invoiceNum}\n` +
            `*Total Amount:* ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n` +
            `We hope to see you again soon! 🙏\n\n` +
            `📲 View & Download your Digital ${invoiceTypeLabel}:\n` +
            `${receiptUrl}`
        );
        const rawPhone = receiptData.customerMobile || sale.customerMobile || sale.customerPhone || '';
        const phone = rawPhone.replace(/\D/g, '');
        window.open(phone ? `https://wa.me/91${phone}?text=${message}` : `https://wa.me/?text=${message}`, '_blank');
    };

    const itemsSubtotal = Number(receiptData.subtotal != null ? receiptData.subtotal : (sale.subtotal || totalAmount));
    const taxableValue = receiptData.taxableAmount != null ? Number(receiptData.taxableAmount) : null;
    const cgstAmt = Number(receiptData.cgstAmount || 0);
    const sgstAmt = Number(receiptData.sgstAmount || 0);
    const igstAmt = Number(receiptData.igstAmount || 0);
    const totalGstAmt = Number(receiptData.totalGst || (cgstAmt + sgstAmt + igstAmt));
    const gstRate = Number(receiptData.gstRate || sale.gstRate || 5);
    const shippingFee = Number(receiptData.shippingFee || sale.shippingFee || sale.shipping_fee || 0);
    const giftWrapCharge = Number(receiptData.giftWrapCharge || sale.giftWrapCharge || sale.gift_wrap_charge || 0);
    const discountAmount = Number(receiptData.discountAmount || sale.discountAmount || sale.discount || 0);
    const paymentMode = receiptData.paymentMode || sale.paymentMode || sale.paymentMethod || 'Paid';

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent 
                className="p-0 overflow-hidden border-0 shadow-2xl bg-[#FAF7F0] w-[94vw] max-w-[370px] max-h-[85vh] flex flex-col rounded-2xl [&>button:last-child]:hidden"
                style={{ borderRadius: '18px' }}
            >
                {/* ── Top Success Header (fixed height, non-shrinking) ── */}
                <div
                    className="text-white text-center px-4 pt-3.5 pb-2.5 shrink-0 relative"
                    style={{ background: 'linear-gradient(135deg, #6B1725 0%, #450C16 100%)' }}
                >
                    {/* ── Prominent Close Cross Button ── */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 active:bg-white/50 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                        title="Close modal"
                        aria-label="Close modal"
                    >
                        <X className="h-4.5 w-4.5 text-white" strokeWidth={2.5} />
                    </button>

                    <div className="w-8 h-8 rounded-full bg-white/15 border border-white/20 flex items-center justify-center mx-auto mb-1 shadow-sm">
                        <Receipt className="h-4 w-4 text-[#FAF7F0]" />
                    </div>
                    <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-[#FAF7F0]/80 mb-0.5">
                        {isGst ? 'Tax Invoice (5% GST)' : 'Order Receipt • Without GST'}
                    </p>
                    <h2 className="text-lg font-serif font-bold text-white tracking-wide">
                        ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h2>
                    <p className="text-white/60 text-[10px] font-mono mt-0.5">{invoiceNum}</p>
                </div>

                {/* ── Scrollable Body Container ── */}
                <div className="p-3 sm:p-3.5 space-y-2.5 overflow-y-auto flex-1 overscroll-contain">
                    {/* ── Tax Invoice & GST / Sale Summary Card ── */}
                    <div className="bg-white rounded-xl p-3 border border-[#E5DEC9] shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-sans font-bold text-[#7A6E65] uppercase tracking-wider">
                                {isGst ? 'TAX INVOICE & GST' : 'RECEIPT SUMMARY'}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-[#6B1725] bg-[#FAF6EE] border border-[#E5DEC9] px-2 py-0.5 rounded">
                                {invoiceNum}
                            </span>
                        </div>

                        <div className="space-y-1 text-xs text-[#7A6E65] pt-1.5 border-t border-[#F3ECE0]">
                            {/* Items subtotal / taxable base */}
                            <div className="flex justify-between">
                                <span>Items Subtotal</span>
                                <span className="font-medium text-[#292524]">
                                    ₹{itemsSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>

                            {discountAmount > 0 && (
                                <div className="flex justify-between text-[#b91c1c]">
                                    <span>Discount</span>
                                    <span className="font-medium">
                                        − ₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}

                            {Number(receiptData.appliedVoucherAmount || 0) > 0 && (
                                <div className="flex justify-between text-[#b91c1c]">
                                    <span>Voucher ({receiptData.appliedVoucherCode})</span>
                                    <span className="font-medium">
                                        − ₹{Number(receiptData.appliedVoucherAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}

                            {shippingFee > 0 && (
                                <div className="flex justify-between">
                                    <span>Delivery Charges</span>
                                    <span className="font-medium text-[#292524]">
                                        + ₹{shippingFee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}

                            {giftWrapCharge > 0 && (
                                <div className="flex justify-between">
                                    <span>Gift Packaging</span>
                                    <span className="font-medium text-[#292524]">
                                        + ₹{giftWrapCharge.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}

                            {isGst ? (
                                <>
                                    {taxableValue != null && (
                                        <div className="flex justify-between pt-1 border-t border-[#F3ECE0]">
                                            <span>Taxable Value</span>
                                            <span className="font-medium text-[#292524]">
                                                ₹{taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span>Total GST ({gstRate}%)</span>
                                        <span className="font-medium text-[#292524]">
                                            ₹{totalGstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    {cgstAmt > 0 && (
                                        <div className="flex justify-between text-[11px] pl-2 text-[#7A6E65]">
                                            <span>CGST ({(gstRate / 2).toFixed(1)}%)</span>
                                            <span>₹{cgstAmt.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {sgstAmt > 0 && (
                                        <div className="flex justify-between text-[11px] pl-2 text-[#7A6E65]">
                                            <span>SGST ({(gstRate / 2).toFixed(1)}%)</span>
                                            <span>₹{sgstAmt.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {igstAmt > 0 && (
                                        <div className="flex justify-between text-[11px] pl-2 text-[#7A6E65]">
                                            <span>IGST ({gstRate}%)</span>
                                            <span>₹{igstAmt.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-[10px] text-[#A89F91] pt-0.5">
                                        <span>Place of Supply</span>
                                        <span>{receiptData.placeOfSupply || 'Bihar (10)'}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex justify-between text-[10px] text-[#A89F91] pt-0.5">
                                    <span>Tax Treatment</span>
                                    <span>Non-GST Retail Bill</span>
                                </div>
                            )}

                            <div className="flex justify-between pt-1.5 border-t border-[#F3ECE0] font-semibold text-[#292524] text-xs">
                                <span>Total ({paymentMode})</span>
                                <span>₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>

                        {/* Direct View & Download button */}
                        <div className="pt-1.5 border-t border-[#F3ECE0]">
                            <button
                                onClick={() => window.open(printUrl, '_blank')}
                                className="w-full text-xs font-semibold text-[#6B1725] hover:text-[#52111C] flex items-center justify-center gap-1.5 py-2 bg-[#FAF7F0] hover:bg-[#F3ECE0] border border-[#E5DEC9] rounded-lg transition-colors font-sans cursor-pointer active:scale-[0.98]"
                            >
                                <Download size={13} />
                                <span>{isGst ? 'View & Download Tax Invoice' : 'View & Download Retail Receipt'}</span>
                            </button>
                        </div>
                    </div>

                    {/* ── Customer & Delivery Info Strip ── */}
                    <div className="px-3 py-2 bg-white rounded-xl border border-[#E5DEC9] text-xs space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-[#7A6E65]">Customer</span>
                            <span className="font-medium text-[#292524] truncate max-w-[180px]">
                                {customerName}{(receiptData.customerMobile || sale.customerMobile || sale.customerPhone) ? ` · ${receiptData.customerMobile || sale.customerMobile || sale.customerPhone}` : ''}
                            </span>
                        </div>
                        {receiptData.customerAddress && (
                            <div className="text-[11px] text-[#7A6E65] pt-1 border-t border-[#F3ECE0] leading-tight">
                                <span className="text-[#A89F91] block text-[9px] uppercase font-semibold">Shipping Address</span>
                                <span className="line-clamp-2">{receiptData.customerAddress}</span>
                            </div>
                        )}
                    </div>

                    {/* ── Action buttons: WhatsApp & Copy Link ── */}
                    <div className="space-y-1.5 pt-0.5">
                        {/* WhatsApp — primary */}
                        <button
                            onClick={handleWhatsApp}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-white text-xs font-semibold transition-all shadow-xs active:scale-[0.98] cursor-pointer"
                            style={{ background: '#25D366' }}
                        >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>Send Receipt via WhatsApp</span>
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={handleCopyLink}
                                className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[#E5DEC9] text-xs font-semibold text-[#292524] bg-white hover:bg-[#FAF7F0] transition-all active:scale-[0.98] cursor-pointer"
                            >
                                {copied
                                    ? <><Check className="h-3.5 w-3.5 text-green-600" /><span className="text-green-600">Copied!</span></>
                                    : <><Link2 className="h-3.5 w-3.5 text-[#7A6E65]" /><span>Copy Link</span></>
                                }
                            </button>

                            <button
                                onClick={onClose}
                                className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[#E5DEC9] text-xs font-semibold text-[#7A6E65] bg-white hover:bg-[#FAF7F0] hover:text-[#292524] transition-all active:scale-[0.98] cursor-pointer"
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
