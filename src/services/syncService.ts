import { gsRequest } from './api';

export interface ScannedItem {
    barcode: string;
    timestamp: string;
}

export const syncService = {
    pushScannedItem: async (sessionId: string, barcode: string): Promise<{ success: boolean }> => {
        return gsRequest('pushScannedItem', { sessionId, barcode });
    },

    getScannedItems: async (sessionId: string): Promise<ScannedItem[]> => {
        return gsRequest('getScannedItems', { sessionId });
    }
};
