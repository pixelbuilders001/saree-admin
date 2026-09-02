export interface ReceiptItem {
    sareeName: string;
    quantity: number;
    mrp: number;
    sellingPrice: number;
}

export interface ReceiptData {
    invoiceNumber: string;
    date: string;
    paymentMode: string;
    customerName: string | null;
    customerMobile: string | null;
    items: ReceiptItem[];
    totalAmount: number;
    discountAmount: number;
    discountPercentage?: number;
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
 * Maps an admin Sale object into standard ReceiptData payload structure.
 */
export function mapSaleToReceiptData(sale: any): ReceiptData {
    return {
        invoiceNumber: sale.invoiceNumber || sale.invoice_number,
        date: sale.date || sale.created_at || new Date().toISOString(),
        paymentMode: sale.paymentMode || sale.payment_mode || 'cash',
        customerName: sale.customerName || null,
        customerMobile: sale.customerMobile || null,
        totalAmount: Number(sale.totalAmount || sale.total_amount || 0),
        discountAmount: Number(sale.discountAmount || sale.discount_amount || 0),
        discountPercentage: Number(sale.discountPercentage || 0),
        isGstApplied: Boolean(sale.isGstApplied),
        gstRate: Number(sale.gstRate || 0),
        taxableAmount: sale.taxableAmount !== undefined ? Number(sale.taxableAmount) : undefined,
        cgstRate: Number(sale.cgstRate || 0),
        cgstAmount: Number(sale.cgstAmount || 0),
        sgstRate: Number(sale.sgstRate || 0),
        sgstAmount: Number(sale.sgstAmount || 0),
        igstRate: Number(sale.igstRate || 0),
        igstAmount: Number(sale.igstAmount || 0),
        totalGst: Number(sale.totalGst || 0),
        items: (sale.items || []).map((i: any) => ({
            sareeName: i.sareeName || i.name || 'Item',
            quantity: Math.abs(Number(i.quantity || 1)),
            mrp: Number(i.mrp || i.price || i.sellingPrice || 0),
            sellingPrice: Number(i.sellingPrice || i.price || 0),
        })),
    };
}

/**
 * Generates a full shareable receipt URL containing embedded order data.
 */
export function generateReceiptUrl(sale: any, domain: string = 'https://shreebanarasisarees.in'): string {
    const receiptData = mapSaleToReceiptData(sale);
    const payload = encodeReceiptData(receiptData);
    const inv = encodeURIComponent(receiptData.invoiceNumber || 'INV');
    return `${domain.replace(/\/$/, '')}/receipt/${inv}?d=${payload}`;
}
