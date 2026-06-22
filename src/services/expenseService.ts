import { gsRequest } from './api';

export interface Expense {
    expenseId: string;
    category: 'Rent' | 'Electricity' | 'Salary' | 'Marketing' | 'Other';
    amount: number;
    description: string;
    date: string;
}

export const expenseService = {
    getExpenses: async (): Promise<Expense[]> => {
        return gsRequest('getExpenses');
    },

    createExpense: async (expense: Omit<Expense, 'expenseId' | 'date'>): Promise<Expense> => {
        return gsRequest('createExpense', { expense });
    },
};
