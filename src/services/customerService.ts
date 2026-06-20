import { gsRequest } from './api';

export interface Customer {
    customerId: string;
    name: string;
    mobile: string;
    address: string;
    city: string;
    totalPurchases: number;
    totalSpent: number;
}

export const customerService = {
    getCustomers: async (): Promise<Customer[]> => {
        return gsRequest('getCustomers');
    },

    createCustomer: async (customer: Omit<Customer, 'customerId' | 'totalPurchases'>): Promise<Customer> => {
        return gsRequest('createCustomer', { customer });
    },

    getCustomerById: async (id: string): Promise<Customer> => {
        return gsRequest('getCustomerById', { id });
    },
};
