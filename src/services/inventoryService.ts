import { gsRequest } from './api';

export interface Saree {
    id: string;
    sareeName: string;
    category: string;
    fabric: string;
    color: string;
    purchasePrice: number;
    sellingPrice: number;
    stock: number;
    rackNo: string;
    barcode: string;
    addedDate: string;
    status: 'active' | 'inactive';
}

export const inventoryService = {
    getSarees: async (): Promise<Saree[]> => {
        return gsRequest('getSarees');
    },

    getSareeById: async (id: string): Promise<Saree> => {
        return gsRequest('getSareeById', { id });
    },

    createSaree: async (saree: Omit<Saree, 'id' | 'addedDate'>): Promise<Saree> => {
        return gsRequest('createSaree', { saree });
    },

    updateSaree: async (id: string, saree: Partial<Saree>): Promise<Saree> => {
        return gsRequest('updateSaree', { id, saree });
    },

    deleteSaree: async (id: string): Promise<void> => {
        return gsRequest('deleteSaree', { id });
    },
};
