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
 * Calculates GST breakdown for a given taxable base amount.
 * All amounts are cleanly rounded to 2 decimal places.
 */
export function calculateGst(taxableBase: number, isGstApplied: boolean): GstBreakdown {
    const base = Math.max(0, Math.round((taxableBase + Number.EPSILON) * 100) / 100);

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

    const cgstAmount = Math.round((base * (cgstRate / 100) + Number.EPSILON) * 100) / 100;
    const sgstAmount = Math.round((base * (sgstRate / 100) + Number.EPSILON) * 100) / 100;
    const totalGst = Math.round(((cgstAmount + sgstAmount) + Number.EPSILON) * 100) / 100;
    const grandTotal = Math.round(((base + totalGst) + Number.EPSILON) * 100) / 100;

    const igstAmount = 0;

    return {
        isGstApplied: true,
        gstRate,
        taxableAmount: base,
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
