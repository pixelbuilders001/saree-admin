export const GST_CONFIG = {
    DEFAULT_GST_RATE: 5, // 5% default GST rate for sarees
    DEFAULT_CGST_RATE: 2.5,
    DEFAULT_SGST_RATE: 2.5,
    DEFAULT_IGST_RATE: 0,
};

export interface GstBreakdown {
    isGstApplied: boolean;
    gstRate: number;
    taxableAmount: number;
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    igstRate: number;
    igstAmount: number;
    totalGst: number;
    grandTotal: number;
}

/**
 * Calculates GST breakdown for a given gross bill amount.
 * The price is treated as GST-INCLUSIVE (matching online orders):
 * grandTotal remains the gross total, with taxable amount and GST broken down inside it.
 * All amounts are cleanly rounded to 2 decimal places.
 */
export function calculateGst(grossTotal: number, isGstApplied: boolean): GstBreakdown {
    const base = Math.max(0, Math.round((grossTotal + Number.EPSILON) * 100) / 100);

    if (!isGstApplied) {
        return {
            isGstApplied: false,
            gstRate: 0,
            taxableAmount: base,
            cgstRate: 0,
            cgstAmount: 0,
            sgstRate: 0,
            sgstAmount: 0,
            igstRate: 0,
            igstAmount: 0,
            totalGst: 0,
            grandTotal: base,
        };
    }

    const gstRate = GST_CONFIG.DEFAULT_GST_RATE;
    const cgstRate = GST_CONFIG.DEFAULT_CGST_RATE;
    const sgstRate = GST_CONFIG.DEFAULT_SGST_RATE;
    const igstRate = GST_CONFIG.DEFAULT_IGST_RATE;

    // Inclusive GST breakdown: taxableAmount = base / (1 + rate/100)
    const taxableAmount = Math.max(0, Math.round(((base / (1 + gstRate / 100)) + Number.EPSILON) * 100) / 100);
    const totalGst = Math.max(0, Math.round(((base - taxableAmount) + Number.EPSILON) * 100) / 100);
    const cgstAmount = Math.round(((totalGst / 2) + Number.EPSILON) * 100) / 100;
    const sgstAmount = Math.round(((totalGst - cgstAmount) + Number.EPSILON) * 100) / 100;
    const igstAmount = 0;
    const grandTotal = base; // Total customer payable remains unchanged

    return {
        isGstApplied: true,
        gstRate,
        taxableAmount,
        cgstRate,
        cgstAmount,
        sgstRate,
        sgstAmount,
        igstRate,
        igstAmount,
        totalGst,
        grandTotal,
    };
}
