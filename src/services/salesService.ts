import { gsRequest } from './api';

export interface SaleItem {
    sareeId: string;
    sareeName: string;
    quantity: number;
    sellingPrice: number;
}

export interface Sale {
    saleId: string;
    items: SaleItem[];
    totalAmount: number;
    profit: number;
    date: string;
    customerName?: string;
    customerMobile?: string;
}

export interface SaleReportItem {
    saleId: string;
    sareeId: string;
    sareeName: string;
    quantity: number;
    sellingPrice: number;
    totalAmount: number;
    profit: number;
    date: string;
    customerName?: string;
    customerMobile?: string;
}

export const salesService = {
    getSales: async (): Promise<SaleReportItem[]> => {
        return gsRequest('getSales');
    },

    createSale: async (sale: {
        items: SaleItem[];
        customerName?: string;
        customerMobile?: string;
    }): Promise<Sale> => {
        return gsRequest('createSale', { sale });
    },

    processExchange: async (exchange: {
        returnItems: SaleItem[];
        replaceItems: SaleItem[];
        customerName?: string;
        customerMobile?: string;
    }): Promise<{ exchangeId: string; date: string; success: boolean; netTotalAmount: number }> => {
        return gsRequest('processExchange', { exchange });
    },
};
