export interface ReceiptItem {
    sareeName: string;
    quantity: number;
    mrp: number;
    sellingPrice: number;
    hsnCode?: string;
}

export interface ReceiptData {
    invoiceNumber: string;
    date: string;
    paymentMode: string;
    customerName: string | null;
    customerMobile: string | null;
    customerAddress?: string | null;
    customerEmail?: string | null;
    items: ReceiptItem[];
    subtotal?: number;
    totalAmount: number;
    discountAmount: number;
    discountPercentage?: number;
    shippingFee?: number;
    giftWrapCharge?: number;
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
    placeOfSupply?: string;
}

/**
 * Encodes a ReceiptData object into a URL-safe Base64 string payload.
 */
export function encodeReceiptData(data: ReceiptData): string {
    try {
        const json = JSON.stringify(data);
        const base64 = typeof window !== 'undefined'
            ? btoa(encodeURIComponent(json))
            : Buffer.from(encodeURIComponent(json)).toString('base64');

        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (err) {
        console.error('Failed to encode receipt data:', err);
        return '';
    }
}

/**
 * Decodes a URL-safe Base64 string payload back into a ReceiptData object.
 */
export function decodeReceiptData(encoded: string): ReceiptData | null {
    if (!encoded) return null;
    try {
        let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }

        const json = typeof window !== 'undefined'
            ? decodeURIComponent(atob(base64))
            : decodeURIComponent(Buffer.from(base64, 'base64').toString('utf-8'));

        return JSON.parse(json) as ReceiptData;
    } catch (err) {
        console.error('Failed to decode receipt data payload:', err);
        return null;
    }
}

/**
 * Maps an admin Sale or Order object into standard ReceiptData payload structure.
 */
export function mapSaleToReceiptData(saleOrOrder: any): ReceiptData {
    const rawItems = saleOrOrder.items || saleOrOrder.order_items || saleOrOrder.sale_items || [];
    const items: ReceiptItem[] = rawItems.map((i: any) => {
        let snap = i.product_snapshot || i.productSnapshot;
        if (typeof snap === 'string') {
            try { snap = JSON.parse(snap); } catch {}
        }
        const sareeName = i.sareeName || i.product_name || i.productName || snap?.saree_name || snap?.name || i.name || 'Pure Silk Banarasi Saree';
        const qty = Math.abs(Number(i.quantity || 1));
        const sellingPrice = Number(i.sellingPrice ?? i.unit_price ?? i.unitPrice ?? i.price ?? snap?.selling_price ?? 0);
        const mrpVal = Number(i.mrp ?? snap?.mrp ?? snap?.price ?? (sellingPrice > 0 ? sellingPrice : 0));
        const hsnCode = i.hsnCode || i.hsn_code || snap?.hsn_code || '5208';

        return {
            sareeName: (i.item_status === 'cancelled' || i.itemStatus === 'cancelled') ? `[Cancelled] ${sareeName}` : sareeName,
            quantity: qty,
            mrp: mrpVal > 0 ? mrpVal : sellingPrice,
            sellingPrice,
            hsnCode,
        };
    });

    const isGstApplied = Boolean(
        saleOrOrder.isGstApplied ??
        saleOrOrder.is_gst_applied ??
        (saleOrOrder.gst_amount && Number(saleOrOrder.gst_amount) > 0)
    );

    let customerAddress = saleOrOrder.customerAddress || null;
    if (!customerAddress && (saleOrOrder.shippingAddress || saleOrOrder.shipping_address)) {
        const addr = saleOrOrder.shippingAddress || saleOrOrder.shipping_address;
        if (typeof addr === 'string') {
            customerAddress = addr;
        } else if (typeof addr === 'object' && addr !== null) {
            customerAddress = [
                addr.address || addr.address_line1,
                addr.city,
                addr.state,
                addr.pinCode || addr.pincode
            ].filter(Boolean).join(', ');
        }
    }

    const calculatedSubtotal = items.reduce((s, it) => s + it.quantity * it.sellingPrice, 0);
    const subtotal = saleOrOrder.subtotal != null ? Number(saleOrOrder.subtotal) : calculatedSubtotal;
    const totalAmount = Number(saleOrOrder.totalAmount ?? saleOrOrder.total_amount ?? saleOrOrder.total ?? 0);
    const discountAmount = Number(saleOrOrder.discountAmount ?? saleOrOrder.discount_amount ?? saleOrOrder.discount ?? 0);
    const discountPercentage = saleOrOrder.discountPercentage != null
        ? Number(saleOrOrder.discountPercentage)
        : (saleOrOrder.discount_percentage != null
            ? Number(saleOrOrder.discount_percentage)
            : (subtotal > 0 && discountAmount > 0 ? parseFloat(((discountAmount / subtotal) * 100).toFixed(2)) : undefined));

    const taxableAmount = saleOrOrder.taxableAmount !== undefined && saleOrOrder.taxableAmount !== null
        ? Number(saleOrOrder.taxableAmount)
        : (saleOrOrder.taxable_amount !== undefined && saleOrOrder.taxable_amount !== null
            ? Number(saleOrOrder.taxable_amount)
            : (isGstApplied ? Math.max(0, subtotal - discountAmount) : undefined));

    const placeOfSupply = saleOrOrder.placeOfSupply || saleOrOrder.place_of_supply || (isGstApplied ? 'Bihar (10)' : undefined);

    return {
        invoiceNumber: saleOrOrder.invoiceNumber || saleOrOrder.invoice_number || saleOrOrder.orderNumber || saleOrOrder.order_number || 'INV',
        date: saleOrOrder.date || saleOrOrder.invoiceDate || saleOrOrder.invoice_date || saleOrOrder.createdAt || saleOrOrder.created_at || new Date().toISOString(),
        paymentMode: saleOrOrder.paymentMode || saleOrOrder.payment_mode || saleOrOrder.paymentMethod || saleOrOrder.payment_method || 'cash',
        customerName: saleOrOrder.customerName || saleOrOrder.customer_name || null,
        customerMobile: saleOrOrder.customerMobile || saleOrOrder.customer_phone || saleOrOrder.customerPhone || null,
        customerAddress,
        customerEmail: saleOrOrder.customerEmail || saleOrOrder.customer_email || null,
        items,
        subtotal,
        totalAmount,
        discountAmount,
        discountPercentage,
        shippingFee: saleOrOrder.shippingFee != null ? Number(saleOrOrder.shippingFee) : (saleOrOrder.shipping_fee != null ? Number(saleOrOrder.shipping_fee) : (saleOrOrder.shipping_charge != null ? Number(saleOrOrder.shipping_charge) : undefined)),
        giftWrapCharge: saleOrOrder.giftWrapCharge != null ? Number(saleOrOrder.giftWrapCharge) : (saleOrOrder.gift_wrap_charge != null ? Number(saleOrOrder.gift_wrap_charge) : undefined),
        appliedVoucherCode: saleOrOrder.appliedVoucherCode || saleOrOrder.voucherCode || saleOrOrder.coupon_code || saleOrOrder.couponCode || null,
        appliedVoucherAmount: saleOrOrder.appliedVoucherAmount != null ? Number(saleOrOrder.appliedVoucherAmount) : (saleOrOrder.voucherAmount != null ? Number(saleOrOrder.voucherAmount) : null),
        issuedVoucherCode: saleOrOrder.issuedVoucherCode || null,
        issuedVoucherAmount: saleOrOrder.issuedVoucherAmount != null ? Number(saleOrOrder.issuedVoucherAmount) : null,
        isGstApplied,
        gstRate: Number(saleOrOrder.gstRate || saleOrOrder.gst_rate || (isGstApplied ? 5 : 0)),
        taxableAmount,
        cgstRate: Number(saleOrOrder.cgstRate ?? saleOrOrder.cgst_rate ?? (isGstApplied ? 2.5 : 0)),
        cgstAmount: Number(saleOrOrder.cgstAmount ?? saleOrOrder.cgst_amount ?? 0),
        sgstRate: Number(saleOrOrder.sgstRate ?? saleOrOrder.sgst_rate ?? (isGstApplied ? 2.5 : 0)),
        sgstAmount: Number(saleOrOrder.sgstAmount ?? saleOrOrder.sgst_amount ?? 0),
        igstRate: Number(saleOrOrder.igstRate ?? saleOrOrder.igst_rate ?? 0),
        igstAmount: Number(saleOrOrder.igstAmount ?? saleOrOrder.igst_amount ?? 0),
        totalGst: Number(saleOrOrder.totalGst ?? saleOrOrder.total_gst ?? saleOrOrder.gst_amount ?? (Number(saleOrOrder.cgstAmount || saleOrOrder.cgst_amount || 0) + Number(saleOrOrder.sgstAmount || saleOrOrder.sgst_amount || 0) + Number(saleOrOrder.igstAmount || saleOrOrder.igst_amount || 0))),
        placeOfSupply,
    };
}

/**
 * Generates a full shareable receipt URL containing embedded order data.
 */
export function generateReceiptUrl(saleOrOrder: any, domain: string = 'https://shreebanarasisarees.in'): string {
    const receiptData = mapSaleToReceiptData(saleOrOrder);
    const payload = encodeReceiptData(receiptData);
    const inv = encodeURIComponent(receiptData.invoiceNumber || 'INV');
    return `${domain.replace(/\/$/, '')}/receipt/${inv}?d=${payload}`;
}
