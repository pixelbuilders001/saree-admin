import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

export interface Expense {
    expenseId: string;
    category: 'Rent' | 'Electricity' | 'Salary' | 'Marketing' | 'Other';
    amount: number;
    description: string;
    date: string;
}

export const expenseService = {
    getExpenses: async (): Promise<Expense[]> => {
        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((x: any) => ({
            expenseId: x.id,
            category: x.category as any,
            amount: Number(x.amount),
            description: x.description || '',
            date: x.created_at,
        }));
    },

    createExpense: async (expense: Omit<Expense, 'expenseId' | 'date'>): Promise<Expense> => {
        const userEmail = useAuthStore.getState().user?.email || 'system';
        const { data, error } = await supabase
            .from('expenses')
            .insert([{
                category: expense.category,
                amount: expense.amount,
                description: expense.description,
                created_by: userEmail,
                updated_by: userEmail,
            }])
            .select()
            .single();

        if (error) throw error;

        return {
            expenseId: data.id,
            category: data.category as any,
            amount: Number(data.amount),
            description: data.description || '',
            date: data.created_at,
        };
    },
};
