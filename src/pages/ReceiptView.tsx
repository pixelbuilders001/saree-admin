import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2, Printer, AlertTriangle } from 'lucide-react';

// ── Shop Constants ────────────────────────────────────────────────────────────
const SHOP = {
    name: 'SHREE BANARASI SAREES',
    address: 'Rudauli Chowk, Samastipur, Bihar – 848101',
    email: 'shreebanarasi180@gmail.com',
    phone: '+91-6203909946',
    gstin: '10AAACS1234F1Z9',
};

const TERMS = [
    'Goods once sold can be exchanged within 7 days with the original invoice and Silk Mark tag intact.',
    'No cash refunds; exchange or store credit only.',
    'Dry clean only for all pure silk products.',
    'Any disputes are subject to Bihar Jurisdiction only.',
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface ReceiptItem {
    sareeName: string;
    quantity: number;
    mrp: number;
    sellingPrice: number;
}

interface ReceiptData {
    invoiceNumber: string;
    date: string;
    paymentMode: string;
    customerName: string | null;
    customerMobile: string | null;
    items: ReceiptItem[];
    totalAmount: number;
    discountAmount: number;
    shippingFee?: number;
    issuedVoucherCode?: string | null;
    issuedVoucherAmount?: number | null;
    appliedVoucherCode?: string | null;
    appliedVoucherAmount?: number | null;
    isGstApplied?: boolean;
    gstRate?: number;
    taxableAmount?: number;
    cgstRate?: number;
    cgstAmount?: number;
    sgstRate?: number;
    sgstAmount?: number;
    igstRate?: number;
    igstAmount?: number;
    totalGst?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');

const fmtLong = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const fmtCurrency = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Main Component ────────────────────────────────────────────────────────────
export default function ReceiptView() {
    const { invoiceNumber } = useParams<{ invoiceNumber: string }>();
    const [searchParams] = useSearchParams();
    const autoPrint = searchParams.get('print') === 'true';
    const [receipt, setReceipt] = useState<ReceiptData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Auto-trigger print when ?print=true (from Download PDF button)
    useEffect(() => {
        if (!autoPrint || !receipt) return;
        const timer = setTimeout(() => {
            document.title = `Receipt_${receipt.invoiceNumber}`;
            window.print();
        }, 800);
        return () => clearTimeout(timer);
    }, [autoPrint, receipt]);

    useEffect(() => {
        if (!invoiceNumber) return;
        (async () => {
            setLoading(true);
            const { data, error: err } = await supabase
                .from('sales')
                .select(`
                    id,
                    invoice_number, created_at, payment_mode, total_amount, discount_amount,
                    is_gst_applied, gst_rate, taxable_amount, cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, total_gst,
                    customers ( name, mobile ),
                    sale_items ( quantity, selling_price, storefront_products ( saree_name, mrp, selling_price ) )
                `)
                .eq('invoice_number', invoiceNumber)
                .maybeSingle();

            if (err) { setError('Failed to load receipt.'); setLoading(false); return; }

            let receiptData: ReceiptData | null = null;

            if (data) {
                // Query for store credits issued in this transaction (e.g. from exchange)
                const { data: issuedCredits } = await supabase
                    .from('store_credits')
                    .select('voucher_code, original_amount')
                    .like('notes', `%${data.invoice_number}%`);

                // Query for store credits applied/redeemed in this transaction
                const { data: appliedCredits } = await supabase
                    .from('store_credits')
                    .select('voucher_code, original_amount')
                    .eq('used_in_sale_id', data.id);

                const issuedVoucher = issuedCredits?.[0];
                const appliedVoucher = appliedCredits?.[0];

                const items: ReceiptItem[] = (data.sale_items || [])
                    .filter((i: any) => Number(i.quantity) !== 0)
                    .map((i: any) => {
                        const qty = Number(i.quantity);
                        const price = Number(i.selling_price);
                        const mrpVal = Number(i.inventory?.mrp || i.inventory?.price || price);
                        const isRet = qty < 0 || price < 0;
                        return {
                            sareeName: i.inventory?.saree_name || 'Item',
                            quantity: Math.abs(qty),
                            mrp: Math.abs(mrpVal),
                            sellingPrice: isRet ? -Math.abs(price) : Math.abs(price),
                        };
                    });

                receiptData = {
                    invoiceNumber: data.invoice_number,
                    date: data.created_at,
                    paymentMode: data.payment_mode || 'cash',
                    customerName: (data.customers as any)?.name || null,
                    customerMobile: (data.customers as any)?.mobile || null,
                    items,
                    totalAmount: Number(data.total_amount),
                    discountAmount: Number(data.discount_amount || 0),
                    issuedVoucherCode: issuedVoucher?.voucher_code || null,
                    issuedVoucherAmount: issuedVoucher ? Number(issuedVoucher.original_amount) : null,
                    appliedVoucherCode: appliedVoucher?.voucher_code || null,
                    appliedVoucherAmount: appliedVoucher ? Number(appliedVoucher.original_amount) : null,
                    isGstApplied: Boolean(data.is_gst_applied),
                    gstRate: Number(data.gst_rate || 0),
                    taxableAmount: Number(data.taxable_amount || 0),
                    cgstRate: Number(data.cgst_rate || 0),
                    cgstAmount: Number(data.cgst_amount || 0),
                    sgstRate: Number(data.sgst_rate || 0),
                    sgstAmount: Number(data.sgst_amount || 0),
                    igstRate: Number(data.igst_rate || 0),
                    igstAmount: Number(data.igst_amount || 0),
                    totalGst: Number(data.total_gst || 0),
                };
            } else {
                // Fallback: Check online orders table
                const { data: orderData, error: orderErr } = await supabase
                    .from('orders')
                    .select(`
                        id,
                        order_number, created_at, payment_method, total_amount, discount, shipping_fee,
                        customer_name, customer_phone,
                        order_items ( quantity, unit_price, product_name, mrp )
                    `)
                    .eq('order_number', invoiceNumber)
                    .maybeSingle();

                if (orderErr) { setError('Failed to load receipt.'); setLoading(false); return; }
                if (!orderData) { setError('Receipt not found. Please check the link.'); setLoading(false); return; }

                const items: ReceiptItem[] = (orderData.order_items || [])
                    .map((i: any) => {
                        const unitPrice = Number(i.unit_price);
                        const mrpVal = Number(i.mrp || unitPrice);
                        return {
                            sareeName: i.product_name || 'Item',
                            quantity: Number(i.quantity),
                            mrp: mrpVal,
                            sellingPrice: unitPrice,
                        };
                    });

                receiptData = {
                    invoiceNumber: orderData.order_number,
                    date: orderData.created_at,
                    paymentMode: orderData.payment_method || 'cod',
                    customerName: orderData.customer_name || null,
                    customerMobile: orderData.customer_phone || null,
                    items,
                    totalAmount: Number(orderData.total_amount),
                    discountAmount: Number(orderData.discount || 0),
                    shippingFee: Number(orderData.shipping_fee || 0),
                };
            }

            setReceipt(receiptData);
            setLoading(false);
        })();
    }, [invoiceNumber]);

    // ── Loading / Error States ─────────────────────────────────────────────
    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', background: '#f3f4f6' }}>
                <Loader2 style={{ width: 32, height: 32, color: '#666', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#666', fontSize: '14px' }}>Loading receipt…</p>
            </div>
        );
    }

    if (error || !receipt) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: '#f3f4f6', padding: '16px' }}>
                <AlertTriangle style={{ width: 40, height: 40, color: '#f87171' }} />
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111' }}>Receipt Not Found</h2>
                <p style={{ color: '#666', fontSize: '13px', textAlign: 'center' }}>{error}</p>
                <p style={{ color: '#aaa', fontSize: '11px', fontFamily: 'monospace' }}>#{invoiceNumber}</p>
            </div>
        );
    }

    const dateShort = fmtDate(receipt.date);
    const dateLong = fmtLong(receipt.date);

    const totalMrp = receipt.items.reduce((s, i) => s + i.quantity * (i.mrp || i.sellingPrice), 0);
    const totalItemDiscount = receipt.items.reduce((s, i) => {
        const itemMrp = i.mrp || i.sellingPrice;
        return s + Math.max(0, (itemMrp - i.sellingPrice) * i.quantity);
    }, 0);
    const totalItemDiscountPercent = totalMrp > 0 ? (totalItemDiscount / totalMrp) * 100 : 0;
    const totalItemDiscountPercentText = totalItemDiscountPercent > 0 ? ` (${parseFloat(totalItemDiscountPercent.toFixed(1))}%)` : '';

    const subtotal = receipt.items.reduce((s, i) => s + i.quantity * i.sellingPrice, 0);
    const billDiscount = receipt.discountAmount || 0;
    const billDiscountPercent = (subtotal > 0 && billDiscount > 0)
        ? (billDiscount / subtotal) * 100
        : 0;
    const billDiscountPercentText = billDiscountPercent > 0 ? ` (${parseFloat(billDiscountPercent.toFixed(2))}%)` : '';

    const handlePrint = () => {
        const orig = document.title;
        document.title = `Receipt_${receipt.invoiceNumber}`;
        window.print();
        setTimeout(() => { document.title = orig; }, 2000);
    };

    return (
        <>
            {/* ── Print / Global Styles ───────────────────────────────────── */}
            <style>{`
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
                @media print {
                    .no-print { display: none !important; }
                    html, body { margin: 0; padding: 0; background: #fff; }
                    .invoice-page { box-shadow: none !important; max-width: 100% !important; width: 100% !important; padding: 24px 32px !important; }
                }
                @page { margin: 10mm; size: A4; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>

            {/* ── Outer Screen Wrapper — gray background, invoice centered inside ── */}
            <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                {/* Print button — top, hidden during print */}
                <div className="no-print" style={{ marginBottom: '20px' }}>
                    <button
                        onClick={handlePrint}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px', borderRadius: '8px', background: '#800000', color: '#fff', fontFamily: 'Arial, sans-serif', fontWeight: 'bold', fontSize: '13px', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
                    >
                        <Printer style={{ width: 16, height: 16 }} />
                        Save as PDF / Print
                    </button>
                </div>

                {/* ── Invoice Card ─────────────────────────────────────────── */}
                <div
                    className="invoice-page"
                    style={{
                        fontFamily: 'Arial, Helvetica, sans-serif',
                        fontSize: '13px',
                        color: '#111',
                        background: '#fff',
                        width: '100%',
                        maxWidth: '760px',
                        padding: '48px 56px',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                        borderRadius: '4px',
                    }}
                >
                    {/* ── HEADER ─────────────────────────────────────────── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '20px', letterSpacing: '0.5px', marginBottom: '6px' }}>
                                {SHOP.name}
                            </div>
                            <div style={{ color: '#444', lineHeight: '1.75', fontSize: '12.5px' }}>
                                <div>{SHOP.address}</div>
                                <div>{SHOP.email}</div>
                                <div>{SHOP.phone}</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '24px' }}>
                            {receipt.isGstApplied && (
                                <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#800000', marginBottom: '4px' }}>
                                    GSTIN: {SHOP.gstin}
                                </div>
                            )}
                            <div style={{ color: '#555', fontSize: '12.5px' }}>{dateLong}</div>
                            {receipt.isGstApplied && (
                                <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 'bold', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    TAX INVOICE
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── INVOICE META + BILL TO ───────────────────────── */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', gap: '32px' }}>
                        <div style={{ lineHeight: '2', fontSize: '12.5px' }}>
                            <div>
                                <span style={{ fontWeight: 'bold' }}>Invoice #</span>
                                {'  '}
                                <span style={{ fontStyle: 'italic' }}>{receipt.invoiceNumber}</span>
                            </div>
                            <div>
                                <span style={{ fontWeight: 'bold' }}>Date</span>
                                {'  '}
                                <span style={{ fontStyle: 'italic' }}>{dateShort}</span>
                            </div>
                            <div>
                                <span style={{ fontWeight: 'bold' }}>Due Date:</span>
                                {'  '}
                                <span style={{ fontStyle: 'italic' }}>{dateShort}</span>
                            </div>
                        </div>
                        {(receipt.customerName || receipt.customerMobile) && (
                            <div style={{ lineHeight: '1.85', fontSize: '12.5px' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Bill To</div>
                                {receipt.customerName && <div>{receipt.customerName}</div>}
                                {receipt.customerMobile && <div>{receipt.customerMobile}</div>}
                            </div>
                        )}
                    </div>

                    {/* ── DASHED DIVIDER ───────────────────────────────── */}
                    <div style={{ borderTop: '1.5px dashed #bbb', marginBottom: '28px' }} />

                    {/* ── ITEMS TABLE ──────────────────────────────────── */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                        <thead>
                            <tr style={{ borderTop: '2px solid #111', borderBottom: '2px solid #111' }}>
                                <th style={{ textAlign: 'left', padding: '10px 8px 10px 0', fontWeight: 'bold', letterSpacing: '0.5px', width: '38%' }}>DESCRIPTION</th>
                                <th style={{ textAlign: 'center', padding: '10px 6px', fontWeight: 'bold', letterSpacing: '0.5px', width: '8%' }}>QTY</th>
                                <th style={{ textAlign: 'right', padding: '10px 6px', fontWeight: 'bold', letterSpacing: '0.5px', width: '18%' }}>MRP</th>
                                <th style={{ textAlign: 'right', padding: '10px 6px', fontWeight: 'bold', letterSpacing: '0.5px', width: '18%' }}>DISCOUNT</th>
                                <th style={{ textAlign: 'right', padding: '10px 0 10px 6px', fontWeight: 'bold', letterSpacing: '0.5px', width: '18%' }}>AMOUNT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {receipt.items.map((item, idx) => {
                                const itemMrp = item.mrp || item.sellingPrice;
                                const itemMrpTotal = item.quantity * itemMrp;
                                const itemSellingTotal = item.quantity * item.sellingPrice;
                                const itemDisc = itemMrpTotal - itemSellingTotal;
                                const itemDiscPct = itemMrpTotal > 0 ? (itemDisc / itemMrpTotal) * 100 : 0;

                                return (
                                    <tr key={idx} style={{ borderBottom: '1px dashed #ccc' }}>
                                        <td style={{ padding: '11px 8px 11px 0' }}>{item.sareeName}</td>
                                        <td style={{ padding: '11px 6px', textAlign: 'center' }}>{item.quantity}</td>
                                        <td style={{ padding: '11px 6px', textAlign: 'right' }}>{fmtCurrency(itemMrp)}</td>
                                        <td style={{ padding: '11px 6px', textAlign: 'right', color: itemDisc > 0 ? '#b91c1c' : '#777' }}>
                                            {itemDisc > 0 ? `− ${fmtCurrency(itemDisc)}${itemDiscPct > 0 ? ` (${parseFloat(itemDiscPct.toFixed(1))}%)` : ''}` : '—'}
                                        </td>
                                        <td style={{ padding: '11px 0 11px 6px', textAlign: 'right', fontWeight: '500' }}>{fmtCurrency(itemSellingTotal)}</td>
                                    </tr>
                                );
                            })}
                            {/* Spacer rows */}
                            {Array.from({ length: Math.max(0, 3 - receipt.items.length) }).map((_, i) => (
                                <tr key={`blank-${i}`} style={{ borderBottom: '1px dashed #ddd' }}>
                                    <td style={{ padding: '11px 0' }} colSpan={5}>&nbsp;</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* ── TOTALS ──────────────────────────────────────── */}
                    <div style={{ borderTop: '2px solid #111', paddingTop: '12px', marginTop: '4px' }}>
                        {totalItemDiscount > 0 && (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '48px', padding: '4px 0', borderBottom: '1px dashed #eee', fontSize: '12.5px' }}>
                                    <span style={{ color: '#555' }}>TOTAL MRP</span>
                                    <span style={{ minWidth: '90px', textAlign: 'right' }}>{fmtCurrency(totalMrp)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '48px', padding: '4px 0', borderBottom: '1px dashed #eee', fontSize: '12.5px', color: '#b91c1c' }}>
                                    <span>TOTAL ITEM DISCOUNT{totalItemDiscountPercentText}</span>
                                    <span style={{ minWidth: '90px', textAlign: 'right' }}>− {fmtCurrency(totalItemDiscount)}</span>
                                </div>
                            </>
                        )}

                        {(totalItemDiscount > 0 || billDiscount > 0 || (receipt.shippingFee && receipt.shippingFee > 0)) && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '48px', padding: '5px 0', borderBottom: '1px dashed #ccc', fontSize: '12.5px' }}>
                                <span style={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>SUBTOTAL</span>
                                <span style={{ minWidth: '90px', textAlign: 'right' }}>{fmtCurrency(subtotal)}</span>
                            </div>
                        )}

                        {billDiscount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '48px', padding: '5px 0', borderBottom: '1px dashed #ccc', fontSize: '12.5px', color: '#b91c1c' }}>
                                <span style={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>
                                    {totalItemDiscount > 0 ? 'EXTRA DISCOUNT' : 'DISCOUNT'}{billDiscountPercentText}
                                </span>
                                <span style={{ minWidth: '90px', textAlign: 'right' }}>− {fmtCurrency(billDiscount)}</span>
                            </div>
                        )}

                        {receipt.isGstApplied ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '48px', padding: '5px 0', borderBottom: '1px dashed #ccc', fontSize: '12.5px' }}>
                                    <span style={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>TAXABLE AMOUNT</span>
                                    <span style={{ minWidth: '90px', textAlign: 'right' }}>{fmtCurrency(receipt.taxableAmount || (subtotal - billDiscount))}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '48px', padding: '4px 0', borderBottom: '1px dashed #eee', fontSize: '12px', color: '#444' }}>
                                    <span>CGST @ {receipt.cgstRate || 2.5}%</span>
                                    <span style={{ minWidth: '90px', textAlign: 'right' }}>{fmtCurrency(receipt.cgstAmount || 0)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '48px', padding: '4px 0', borderBottom: '1px dashed #eee', fontSize: '12px', color: '#444' }}>
                                    <span>SGST @ {receipt.sgstRate || 2.5}%</span>
                                    <span style={{ minWidth: '90px', textAlign: 'right' }}>{fmtCurrency(receipt.sgstAmount || 0)}</span>
                                </div>
                                {(receipt.igstAmount || 0) > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '48px', padding: '4px 0', borderBottom: '1px dashed #eee', fontSize: '12px', color: '#444' }}>
                                        <span>IGST @ {receipt.igstRate}%</span>
                                        <span style={{ minWidth: '90px', textAlign: 'right' }}>{fmtCurrency(receipt.igstAmount || 0)}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '48px', padding: '5px 0', borderBottom: '1px dashed #ccc', fontSize: '12.5px', color: '#047857' }}>
                                    <span style={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>TOTAL GST</span>
                                    <span style={{ minWidth: '90px', textAlign: 'right', fontWeight: 'bold' }}>{fmtCurrency(receipt.totalGst || 0)}</span>
                                </div>
                            </>
                        ) : null}

                        {receipt.shippingFee && receipt.shippingFee > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '48px', padding: '5px 0', borderBottom: '1px dashed #ccc', fontSize: '12.5px' }}>
                                <span style={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>SHIPPING FEE</span>
                                <span style={{ minWidth: '90px', textAlign: 'right' }}>+ {fmtCurrency(receipt.shippingFee)}</span>
                            </div>
                        )}

                        {receipt.appliedVoucherCode && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '48px', padding: '5px 0', borderBottom: '1px dashed #ccc', fontSize: '12.5px' }}>
                                <span style={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>VOUCHER APPLIED ({receipt.appliedVoucherCode})</span>
                                <span style={{ minWidth: '90px', textAlign: 'right' }}>− {fmtCurrency(receipt.appliedVoucherAmount || 0)}</span>
                            </div>
                        )}

                        {receipt.issuedVoucherCode && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '48px', padding: '5px 0', borderBottom: '1px dashed #ccc', fontSize: '12.5px', color: '#16a34a' }}>
                                <span style={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>CREDIT NOTE ISSUED ({receipt.issuedVoucherCode})</span>
                                <span style={{ minWidth: '90px', textAlign: 'right', fontWeight: 'bold' }}>{fmtCurrency(receipt.issuedVoucherAmount || 0)}</span>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '48px', padding: '8px 0', borderBottom: '2px solid #111', fontSize: '13.5px' }}>
                            <span style={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>TOTAL PAYABLE</span>
                            <span style={{ fontWeight: 'bold', minWidth: '90px', textAlign: 'right' }}>{fmtCurrency(receipt.totalAmount)}</span>
                        </div>
                    </div>

                    {/* ── TERMS & CONDITIONS ───────────────────────────── */}
                    <div style={{ marginTop: '36px', paddingTop: '20px', borderTop: '1.5px dashed #bbb' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '12px', letterSpacing: '0.5px', marginBottom: '10px' }}>
                            TERMS &amp; CONDITIONS
                        </div>
                        <ol style={{ paddingLeft: '18px', margin: 0, lineHeight: '1.85', color: '#333', fontSize: '11.5px' }}>
                            {TERMS.map((t, i) => (
                                <li key={i} style={{ marginBottom: '2px' }}>{t}</li>
                            ))}
                        </ol>
                    </div>

                    {/* ── AUTHORISATION ─────────────────────────────────── */}
                    <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '24px' }}>
                        {/* Left: Thank you */}
                        <div style={{ fontSize: '11.5px', color: '#444', maxWidth: '320px', lineHeight: '1.7' }}>
                            <em>Thank you for supporting authentic Indian weavers &amp; handlooms!</em>
                        </div>
                        {/* Right: Auth block */}
                        <div style={{ textAlign: 'right', fontSize: '11.5px', color: '#333', flexShrink: 0 }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>AUTHORISATION</div>
                            <div style={{ color: '#555', marginBottom: '2px' }}>For Shree Banarasi Sarees</div>
                            <div style={{ color: '#555', fontStyle: 'italic', marginBottom: '10px' }}>
                                (Digitally Signed – No Physical Signature Required)
                            </div>
                            <div style={{ borderTop: '1px solid #999', paddingTop: '6px', fontWeight: 'bold' }}>
                                Authorized Signatory
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom print button — hidden during print */}
                <div className="no-print" style={{ marginTop: '24px' }}>
                    <button
                        onClick={handlePrint}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px', borderRadius: '8px', background: '#800000', color: '#fff', fontFamily: 'Arial, sans-serif', fontWeight: 'bold', fontSize: '13px', border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
                    >
                        <Printer style={{ width: 16, height: 16 }} />
                        Save as PDF / Print
                    </button>
                </div>

            </div>{/* end outer wrapper */}
        </>
    );
}
