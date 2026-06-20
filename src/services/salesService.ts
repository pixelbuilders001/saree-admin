import { gsRequest } from './api';

export interface Sale {
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
    getSales: async (): Promise<Sale[]> => {
        return gsRequest('getSales');
    },

    createSale: async (sale: Omit<Sale, 'saleId' | 'date' | 'totalAmount' | 'profit'>): Promise<Sale> => {
        return gsRequest('createSale', { sale });
    },
};
