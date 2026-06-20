import { gsRequest } from './api';

export interface Purchase {
    purchaseId: string;
    sareeId: string;
    sareeName: string;
    quantity: number;
    purchasePrice: number;
    supplier: string;
    date: string;
}

export const purchaseService = {
    getPurchases: async (): Promise<Purchase[]> => {
        return gsRequest('getPurchases');
    },

    createPurchase: async (purchase: Omit<Purchase, 'purchaseId' | 'date'>): Promise<Purchase> => {
        return gsRequest('createPurchase', { purchase });
    },
};
