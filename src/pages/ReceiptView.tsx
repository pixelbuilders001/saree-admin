import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2, Printer, AlertTriangle } from 'lucide-react';
import { decodeReceiptData, type ReceiptData, type ReceiptItem } from '@/utils/receiptUtils';

// ── Shop Constants ────────────────────────────────────────────────────────────
const SHOP = {
    name: 'SHREE BANARASI SAREES',
    address: 'Rudauli Chowk, Samastipur, Bihar – 848101',
    email: 'shreebanarasi180@gmail.com',
    phone: '+91-6203909946',
    gstin: '10AGAFS4190H1Z8',
};

const TERMS = [
    'Goods once sold can be exchanged within 3 days with the original invoice and Silk Mark tag intact.',
    'No cash refunds; exchange or store credit only.',
    'Dry clean only for all pure silk products.',
    'Any disputes are subject to Bihar Jurisdiction only.',
];

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
        // 1. Check for encoded zero-API payload parameter in URL (?d=... or ?data=...)
        const encodedPayload = searchParams.get('d') || searchParams.get('data');
        if (encodedPayload) {
            const decoded = decodeReceiptData(encodedPayload);
            if (decoded) {
                setReceipt(decoded);
                setLoading(false);
                return;
            }
        }

        if (!invoiceNumber) return;
        (async () => {
            setLoading(true);
            const { data, error: err } = await supabase
                .from('sales')
                .select(`
                    id,
                    invoice_number, created_at, payment_mode, total_amount, discount_amount, discount_percentage,
                    is_gst_applied, gst_rate, taxable_amount, cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, total_gst,
                    customers ( name, mobile ),
                    sale_items ( quantity, selling_price, inventory ( saree_name, mrp, selling_price, hsn_code ) )
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
                            hsnCode: (i.inventory as any)?.hsn_code || '5208',
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
                    discountPercentage: Number((data as any).discount_percentage || 0),
                    issuedVoucherCode: issuedVoucher?.voucher_code || null,
                    issuedVoucherAmount: issuedVoucher ? Number(issuedVoucher.original_amount) : null,
                    appliedVoucherCode: appliedVoucher?.voucher_code || null,
                    appliedVoucherAmount: appliedVoucher ? Number(appliedVoucher.original_amount) : null,
                    isGstApplied: Boolean(data.is_gst_applied),
                    gstRate: Number(data.gst_rate || 0),
                    taxableAmount: data.taxable_amount !== null && data.taxable_amount !== undefined ? Number(data.taxable_amount) : undefined,
                    cgstRate: Number(data.cgst_rate || 0),
                    cgstAmount: Number(data.cgst_amount || 0),
                    sgstRate: Number(data.sgst_rate || 0),
                    sgstAmount: Number(data.sgst_amount || 0),
                    igstRate: Number(data.igst_rate || 0),
                    igstAmount: Number(data.igst_amount || 0),
                    totalGst: Number(data.total_gst || 0),
                    placeOfSupply: data.is_gst_applied ? 'Bihar (10)' : undefined,
                };
            } else {
                // Fallback: Check online orders table
                const decodedInvoice = decodeURIComponent(invoiceNumber).trim();
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedInvoice);
                let query = supabase
                    .from('orders')
                    .select(`
                        id,
                        order_number, created_at, payment_method, total_amount, subtotal, discount, shipping_fee,
                        customer_name, customer_phone, customer_email, shipping_address,
                        taxable_amount, gst_amount, cgst_amount, sgst_amount, igst_amount, gst_rate, place_of_supply,
                        invoice_number, invoice_date,
                        gift_wrap_charge,
                        order_items (*)
                    `);
                if (isUuid) {
                    query = query.eq('id', decodedInvoice);
                } else {
                    query = query.or(`order_number.eq.${decodedInvoice},invoice_number.eq.${decodedInvoice}`);
                }
                const { data: orderData, error: orderErr } = await query.maybeSingle();

                if (orderErr) { setError('Failed to load receipt.'); setLoading(false); return; }
                if (!orderData) { setError('Receipt not found. Please check the link.'); setLoading(false); return; }

                const items: ReceiptItem[] = (orderData.order_items || [])
                    .map((i: any) => {
                        let snap = i.product_snapshot;
                        if (typeof snap === 'string') {
                            try { snap = JSON.parse(snap); } catch {}
                        }
                        const unitPrice = Number(i.unit_price || snap?.selling_price || 0);
                        const snapMrp = Number(snap?.mrp || snap?.price || 0);
                        const rawSareeName = i.product_name || i.product_name_snapshot || snap?.saree_name || snap?.name || 'Pure Silk Banarasi Saree';
                        const sareeName = (i.item_status === 'cancelled') ? `[Cancelled] ${rawSareeName}` : rawSareeName;
                        const mrpVal = snapMrp > unitPrice ? snapMrp : (snapMrp > 0 ? snapMrp : unitPrice);
                        const rawAddons = i.addons || snap?.addons || snap?.selectedAddons || i.selectedAddons;
                        const addons = Array.isArray(rawAddons)
                            ? rawAddons.map((a: any) => ({
                                id: a.id ? String(a.id) : undefined,
                                title: String(a.title || a.name || 'Tailoring Add-on'),
                                price: Number(a.price || 0),
                                size: a.size ? String(a.size) : undefined,
                            }))
                            : undefined;

                        return {
                            sareeName,
                            quantity: Number(i.quantity || 1),
                            mrp: mrpVal,
                            sellingPrice: unitPrice,
                            hsnCode: i.hsn_code || snap?.hsn_code || '5208',
                            addons: addons && addons.length > 0 ? addons : undefined,
                        };
                    });

                const shippingAddr = typeof orderData.shipping_address === 'object' && orderData.shipping_address ? orderData.shipping_address : {};
                const fullAddress = [
                    shippingAddr.address || shippingAddr.address_line1,
                    shippingAddr.city,
                    shippingAddr.state,
                    shippingAddr.pinCode || shippingAddr.pincode
                ].filter(Boolean).join(', ');

                const customerState = (orderData.place_of_supply || shippingAddr.state || 'Bihar').trim();
                const isIntraState = customerState.toLowerCase().includes('bihar');
                const hasGst = orderData.gst_amount != null && Number(orderData.gst_amount) > 0;

                receiptData = {
                    invoiceNumber: orderData.invoice_number || orderData.order_number || orderData.id,
                    date: orderData.invoice_date || orderData.created_at,
                    paymentMode: orderData.payment_method || 'cod',
                    customerName: orderData.customer_name || shippingAddr.name || null,
                    customerMobile: orderData.customer_phone || shippingAddr.phone || null,
                    customerAddress: fullAddress || null,
                    customerEmail: orderData.customer_email || shippingAddr.email || null,
                    items,
                    subtotal: Number(orderData.subtotal || 0),
                    totalAmount: Number(orderData.total_amount || 0),
                    discountAmount: Number(orderData.discount || 0),
                    shippingFee: Number(orderData.shipping_fee || 0),
                    giftWrapCharge: Number(orderData.gift_wrap_charge || 0),
                    isGstApplied: hasGst,
                    gstRate: Number(orderData.gst_rate || 5),
                    taxableAmount: orderData.taxable_amount != null ? Number(orderData.taxable_amount) : undefined,
                    cgstRate: isIntraState ? (Number(orderData.gst_rate || 5) / 2) : 0,
                    cgstAmount: orderData.cgst_amount != null ? Number(orderData.cgst_amount) : 0,
                    sgstRate: isIntraState ? (Number(orderData.gst_rate || 5) / 2) : 0,
                    sgstAmount: orderData.sgst_amount != null ? Number(orderData.sgst_amount) : 0,
                    igstRate: !isIntraState ? Number(orderData.gst_rate || 5) : 0,
                    igstAmount: orderData.igst_amount != null ? Number(orderData.igst_amount) : 0,
                    totalGst: orderData.gst_amount != null ? Number(orderData.gst_amount) : 0,
                    placeOfSupply: customerState,
                };
            }

            setReceipt(receiptData);
            setLoading(false);
        })();
    }, [invoiceNumber, searchParams]);

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

    const subtotal = receipt.subtotal && receipt.subtotal > 0
        ? receipt.subtotal
        : receipt.items.reduce((s, i) => s + i.quantity * i.sellingPrice, 0);

    const billDiscount = receipt.discountAmount || 0;
    const billDiscountPercent = (receipt.discountPercentage && receipt.discountPercentage > 0)
        ? receipt.discountPercentage
        : ((subtotal > 0 && billDiscount > 0) ? (billDiscount / subtotal) * 100 : 0);
    const billDiscountPercentText = billDiscountPercent > 0 ? ` (${parseFloat(billDiscountPercent.toFixed(1))}%)` : '';

    const totalSavings = totalItemDiscount + billDiscount + Number(receipt.appliedVoucherAmount || 0);
    const totalSavingsPercent = totalMrp > 0 ? (totalSavings / totalMrp) * 100 : 0;

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

                @media (max-width: 640px) {
                    .receipt-outer-wrapper {
                        padding: 16px 10px !important;
                    }
                    .invoice-page {
                        padding: 24px 16px !important;
                        border-radius: 8px !important;
                    }
                    .invoice-header {
                        flex-direction: column !important;
                        gap: 14px !important;
                    }
                    .invoice-header-right {
                        text-align: left !important;
                        padding-left: 0 !important;
                    }
                    .invoice-meta-row {
                        flex-direction: column !important;
                        gap: 14px !important;
                    }
                    .receipt-table-wrapper {
                        overflow-x: auto;
                        -webkit-overflow-scrolling: touch;
                        margin: 0 -4px;
                    }
                    .receipt-table {
                        font-size: 11.5px !important;
                        min-width: 440px;
                    }
                    .receipt-table th, .receipt-table td {
                        padding: 8px 4px !important;
                    }
                    .totals-container {
                        max-width: 100% !important;
                    }
                    .totals-row {
                        gap: 12px !important;
                        font-size: 11.5px !important;
                    }
                    .invoice-footer-row {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 20px !important;
                    }
                    .invoice-footer-right {
                        text-align: left !important;
                    }
                }
            `}</style>

            {/* ── Outer Screen Wrapper — gray background, invoice centered inside ── */}
            <div className="receipt-outer-wrapper" style={{ minHeight: '100vh', background: '#f3f4f6', padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

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
                    <div className="invoice-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
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
                        <div className="invoice-header-right" style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '24px' }}>
                            {receipt.isGstApplied && (
                                <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#800000', marginBottom: '4px', wordBreak: 'break-all' }}>
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
                    <div className="invoice-meta-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', gap: '32px' }}>
                        <div style={{ lineHeight: '2', fontSize: '12.5px' }}>
                            <div>
                                <span style={{ fontWeight: 'bold' }}>Invoice #</span>
                                {'  '}
                                <span style={{ fontStyle: 'italic', wordBreak: 'break-all' }}>{receipt.invoiceNumber}</span>
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
                            {receipt.placeOfSupply && (
                                <div>
                                    <span style={{ fontWeight: 'bold' }}>Place of Supply:</span>
                                    {'  '}
                                    <span style={{ fontStyle: 'italic' }}>{receipt.placeOfSupply}</span>
                                </div>
                            )}
                        </div>
                        {(receipt.customerName || receipt.customerMobile || receipt.customerAddress) && (
                            <div className="invoice-header-right" style={{ lineHeight: '1.85', fontSize: '12.5px', textAlign: 'right', maxWidth: '300px' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Bill To</div>
                                {receipt.customerName && <div style={{ fontWeight: '600', color: '#111', wordBreak: 'break-word' }}>{receipt.customerName}</div>}
                                {receipt.customerMobile && <div style={{ color: '#444' }}>{receipt.customerMobile}</div>}
                                {receipt.customerAddress && (
                                    <div style={{ color: '#555', fontSize: '11.5px', lineHeight: '1.4', marginTop: '3px', wordBreak: 'break-word' }}>
                                        {receipt.customerAddress}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── DASHED DIVIDER ───────────────────────────────── */}
                    <div style={{ borderTop: '1.5px dashed #bbb', marginBottom: '28px' }} />

                    {/* ── ITEMS TABLE ──────────────────────────────────── */}
                    <div className="receipt-table-wrapper">
                        <table className="receipt-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                            <thead>
                                <tr style={{ borderTop: '2px solid #111', borderBottom: '2px solid #111' }}>
                                    <th style={{ textAlign: 'left', padding: '10px 8px 10px 0', fontWeight: 'bold', letterSpacing: '0.5px', width: '36%' }}>DESCRIPTION</th>
                                    <th style={{ textAlign: 'center', padding: '10px 6px', fontWeight: 'bold', letterSpacing: '0.5px', width: '8%' }}>QTY</th>
                                    <th style={{ textAlign: 'right', padding: '10px 6px', fontWeight: 'bold', letterSpacing: '0.5px', width: '18%' }}>MRP</th>
                                    <th style={{ textAlign: 'right', padding: '10px 6px', fontWeight: 'bold', letterSpacing: '0.5px', width: '20%' }}>DISCOUNT</th>
                                    <th style={{ textAlign: 'right', padding: '10px 0 10px 6px', fontWeight: 'bold', letterSpacing: '0.5px', width: '18%' }}>AMOUNT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {receipt.items.map((item, idx) => {
                                    const itemMrp = item.mrp && item.mrp > 0 ? item.mrp : item.sellingPrice;
                                    const itemMrpTotal = item.quantity * itemMrp;
                                    const itemSellingTotal = item.quantity * item.sellingPrice;
                                    const itemDisc = Math.max(0, itemMrpTotal - itemSellingTotal);
                                    const itemDiscPct = itemMrpTotal > 0 ? (itemDisc / itemMrpTotal) * 100 : 0;

                                    return (
                                        <tr key={idx} style={{ borderBottom: '1px dashed #ccc' }}>
                                            <td style={{ padding: '11px 8px 11px 0', wordBreak: 'break-word' }}>
                                                <div>{item.sareeName}</div>
                                                {item.hsnCode && (
                                                    <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>HSN: {item.hsnCode}</div>
                                                )}
                                                {item.addons && item.addons.length > 0 && (
                                                    <div style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                        {item.addons.map((addon, aIdx) => (
                                                            <div key={aIdx} style={{ fontSize: '11px', color: '#9a3412', background: '#fff7ed', padding: '2px 6px', borderRadius: '3px', display: 'inline-block', width: 'fit-content', border: '1px solid #fed7aa', fontWeight: '500' }}>
                                                                + {addon.title}{addon.size ? ` (Size: ${addon.size})` : ''} {addon.price > 0 ? `[₹${addon.price}]` : '[Free]'}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '11px 6px', textAlign: 'center' }}>{item.quantity}</td>
                                            <td style={{ padding: '11px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtCurrency(itemMrp)}</td>
                                            <td style={{ padding: '11px 6px', textAlign: 'right', color: itemDisc > 0 ? '#b91c1c' : '#777', whiteSpace: 'nowrap' }}>
                                                {itemDisc > 0 ? `− ${fmtCurrency(itemDisc)}${itemDiscPct > 0 ? ` (${parseFloat(itemDiscPct.toFixed(1))}%)` : ''}` : '—'}
                                            </td>
                                            <td style={{ padding: '11px 0 11px 6px', textAlign: 'right', fontWeight: '500', whiteSpace: 'nowrap' }}>{fmtCurrency(itemSellingTotal)}</td>
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
                    </div>

                    {/* ── TOTALS ──────────────────────────────────────── */}
                    <div style={{ borderTop: '2px solid #111', paddingTop: '12px', marginTop: '4px' }}>
                        <div className="totals-container" style={{ maxWidth: '400px', marginLeft: 'auto', width: '100%' }}>
                            {totalMrp > subtotal && (
                                <>
                                    <div className="totals-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '4px 0', borderBottom: '1px dashed #eee', fontSize: '12.5px' }}>
                                        <span style={{ color: '#555' }}>TOTAL MRP</span>
                                        <span style={{ textAlign: 'right', fontWeight: '500', whiteSpace: 'nowrap' }}>{fmtCurrency(totalMrp)}</span>
                                    </div>
                                    <div className="totals-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '4px 0', borderBottom: '1px dashed #eee', fontSize: '12.5px', color: '#b91c1c' }}>
                                        <span>PRODUCT DISCOUNT{totalItemDiscountPercentText}</span>
                                        <span style={{ textAlign: 'right', fontWeight: '500', whiteSpace: 'nowrap' }}>− {fmtCurrency(totalItemDiscount)}</span>
                                    </div>
                                </>
                            )}

                            <div className="totals-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '5px 0', borderBottom: '1px dashed #ccc', fontSize: '12.5px' }}>
                                <span style={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>
                                    {totalMrp > subtotal ? 'SUBTOTAL (AFTER PRODUCT DISCOUNT)' : 'SUBTOTAL'}
                                </span>
                                <span style={{ textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{fmtCurrency(subtotal)}</span>
                            </div>

                            {billDiscount > 0 && (
                                <div className="totals-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '5px 0', borderBottom: '1px dashed #ccc', fontSize: '12.5px', color: '#b91c1c' }}>
                                    <span style={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>
                                        DISCOUNT{billDiscountPercentText}
                                    </span>
                                    <span style={{ textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>− {fmtCurrency(billDiscount)}</span>
                                </div>
                            )}

                            {receipt.isGstApplied ? (
                                <>
                                    <div className="totals-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '5px 0', borderBottom: '1px dashed #ccc', fontSize: '12.5px' }}>
                                        <span style={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>TAXABLE AMOUNT</span>
                                        <span style={{ textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{fmtCurrency(receipt.taxableAmount || (subtotal - billDiscount))}</span>
                                    </div>
                                    <div className="totals-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '4px 0', borderBottom: '1px dashed #eee', fontSize: '12px', color: '#444' }}>
                                        <span>CGST @ {receipt.cgstRate || 2.5}%</span>
                                        <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtCurrency(receipt.cgstAmount || 0)}</span>
                                    </div>
                                    <div className="totals-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '4px 0', borderBottom: '1px dashed #eee', fontSize: '12px', color: '#444' }}>
                                        <span>SGST @ {receipt.sgstRate || 2.5}%</span>
                                        <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtCurrency(receipt.sgstAmount || 0)}</span>
                                    </div>
                                    {(receipt.igstAmount || 0) > 0 && (
                                        <div className="totals-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '4px 0', borderBottom: '1px dashed #eee', fontSize: '12px', color: '#444' }}>
                                            <span>IGST @ {receipt.igstRate}%</span>
                                            <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtCurrency(receipt.igstAmount || 0)}</span>
                                        </div>
                                    )}
                                    <div className="totals-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '5px 0', borderBottom: '1px dashed #ccc', fontSize: '12.5px', color: '#047857' }}>
                                        <span style={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>TOTAL GST</span>
                                        <span style={{ textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{fmtCurrency(receipt.totalGst || 0)}</span>
                                    </div>
                                </>
                            ) : null}

                            {receipt.shippingFee !== undefined && receipt.shippingFee !== null && (
                                <div className="totals-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '5px 0', borderBottom: '1px dashed #ccc', fontSize: '12.5px' }}>
                                    <span style={{ color: '#555' }}>DELIVERY CHARGES</span>
                                    <span style={{ textAlign: 'right', fontWeight: '500', whiteSpace: 'nowrap', color: (receipt.shippingFee && receipt.shippingFee > 0) ? '#111' : '#15803d' }}>
                                        {(receipt.shippingFee && receipt.shippingFee > 0) ? `+ ${fmtCurrency(receipt.shippingFee)}` : 'FREE'}
                                    </span>
                                </div>
                            )}

                            {Boolean(receipt.giftWrapCharge && receipt.giftWrapCharge > 0) && (
                                <div className="totals-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '5px 0', borderBottom: '1px dashed #ccc', fontSize: '12.5px' }}>
                                    <span style={{ color: '#555' }}>GIFT PACKAGING</span>
                                    <span style={{ textAlign: 'right', fontWeight: '500', whiteSpace: 'nowrap' }}>+ {fmtCurrency(receipt.giftWrapCharge || 0)}</span>
                                </div>
                            )}

                            {receipt.appliedVoucherCode && (
                                <div className="totals-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '5px 0', borderBottom: '1px dashed #ccc', fontSize: '12.5px', color: '#b91c1c' }}>
                                    <span style={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>VOUCHER APPLIED ({receipt.appliedVoucherCode})</span>
                                    <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>− {fmtCurrency(receipt.appliedVoucherAmount || 0)}</span>
                                </div>
                            )}

                            {receipt.issuedVoucherCode && (
                                <div className="totals-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '5px 0', borderBottom: '1px dashed #ccc', fontSize: '12.5px', color: '#16a34a' }}>
                                    <span style={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>CREDIT NOTE ISSUED ({receipt.issuedVoucherCode})</span>
                                    <span style={{ textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{fmtCurrency(receipt.issuedVoucherAmount || 0)}</span>
                                </div>
                            )}

                            <div className="totals-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '8px 0', borderBottom: '2px solid #111', fontSize: '13.5px' }}>
                                <span style={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>TOTAL AMOUNT</span>
                                <span style={{ fontWeight: 'bold', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '14px' }}>{fmtCurrency(receipt.totalAmount)}</span>
                            </div>

                            {totalSavings > 0 && (
                                <div style={{
                                    marginTop: '8px',
                                    padding: '7px 12px',
                                    background: '#f0fdf4',
                                    border: '1px solid #86efac',
                                    borderRadius: '4px',
                                    color: '#15803d',
                                    fontSize: '11.5px',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span>🎉 Total Savings</span>
                                    <span>{fmtCurrency(totalSavings)}{totalSavingsPercent > 0 ? ` (${parseFloat(totalSavingsPercent.toFixed(1))}%)` : ''}</span>
                                </div>
                            )}
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
                    <div className="invoice-footer-row" style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '24px' }}>
                        {/* Left: Thank you */}
                        <div style={{ fontSize: '11.5px', color: '#444', maxWidth: '320px', lineHeight: '1.7' }}>
                            <em>Thank you for supporting authentic Indian weavers &amp; handlooms!</em>
                        </div>
                        {/* Right: Auth block */}
                        <div className="invoice-footer-right" style={{ textAlign: 'right', fontSize: '11.5px', color: '#333', flexShrink: 0 }}>
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
