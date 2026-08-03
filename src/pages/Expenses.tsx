import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseService, type Expense } from '@/services/expenseService';
import {
    Plus,
    Loader2,
    Receipt,
    Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

export default function ExpensesPage() {
    const [category, setCategory] = React.useState<Expense['category']>('Rent');
    const [amount, setAmount] = React.useState('');
    const [description, setDescription] = React.useState('');

    const queryClient = useQueryClient();

    const { data: expenses, isLoading } = useQuery({
        queryKey: ['expenses'],
        queryFn: expenseService.getExpenses
    });

    const createMutation = useMutation({
        mutationFn: expenseService.createExpense,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            setAmount('');
            setDescription('');
            toast.success('Expense recorded successfully');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to record expense');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        createMutation.mutate({
            category,
            amount: Number(amount),
            description,
        });
    };

    return (
        <div className="space-y-3 max-w-7xl mx-auto px-2">
            {/* Minimal Header */}
            <div className="flex items-center justify-between border-b border-gold/10 pb-2">
                <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-maroon" />
                    <div>
                        <h1 className="text-xl font-bold font-serif text-maroon tracking-wider">SBS OPERATIONAL EXPENSES</h1>
                        <p className="text-xs text-gray-500 font-sans">Overhead & operational expense log</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Form column */}
                <div className="lg:col-span-1">
                    <Card className="border-gold/20 shadow-md">
                        <CardHeader className="bg-cream/20 border-b border-gold/10 p-2.5">
                            <CardTitle className="text-xs font-bold text-maroon uppercase tracking-wider">Debit Expense</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3">
                            <form onSubmit={handleSubmit} className="space-y-2.5">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Expense Category</label>
                                    <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                                        <SelectTrigger className="h-8 text-xs border-gold/30">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent className="border-gold/20">
                                            <SelectItem className="text-xs" value="Rent">Rent & Maintenance</SelectItem>
                                            <SelectItem className="text-xs" value="Electricity">Electricity & Utility</SelectItem>
                                            <SelectItem className="text-xs" value="Salary">Staff Salary</SelectItem>
                                            <SelectItem className="text-xs" value="Marketing">Marketing & Ads</SelectItem>
                                            <SelectItem className="text-xs" value="Other">Other Expenses</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Debit Amount (₹)</label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        required
                                        className="h-8 text-xs border-gold/30"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Remarks/Notes</label>
                                    <textarea
                                        placeholder="Description..."
                                        className="flex w-full rounded-md border border-gold/30 bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[50px] resize-none"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-maroon hover:bg-maroon-dark text-gold h-8 text-xs font-bold shadow-sm uppercase tracking-wider"
                                    disabled={createMutation.isPending}
                                >
                                    {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
                                    LOG EXPENSE
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* List column */}
                <div className="lg:col-span-2">
                    <Card className="border-gold/20 shadow-md">
                        <CardHeader className="bg-cream/20 border-b border-gold/10 p-2.5 flex flex-row items-center justify-between">
                            <CardTitle className="text-xs font-bold text-maroon uppercase tracking-wider">Operational Expense Registry</CardTitle>
                            <Button variant="outline" size="sm" className="h-7 text-[10px] border-gold/30 text-maroon gap-1 hover:bg-cream/10 px-2 font-bold">
                                <Filter className="h-3 w-3" /> FILTER
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-cream/10">
                                    <TableRow className="border-b border-gold/10 hover:bg-transparent">
                                        <TableHead className="h-8 text-[10px] font-bold text-maroon py-1">Date</TableHead>
                                        <TableHead className="h-8 text-[10px] font-bold text-maroon py-1">Category</TableHead>
                                        <TableHead className="h-8 text-[10px] font-bold text-maroon py-1">Remarks</TableHead>
                                        <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 text-right">Amount (₹)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-maroon/50 text-xs italic">
                                                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-1" />
                                                Loading expense logs...
                                            </TableCell>
                                        </TableRow>
                                    ) : !expenses || expenses.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-20 text-center text-xs text-gray-500 italic">No expenses recorded yet</TableCell>
                                        </TableRow>
                                    ) : (
                                        expenses.map((expense: Expense) => (
                                            <TableRow key={expense.expenseId} className="hover:bg-cream/5 border-b border-gold/5 h-8">
                                                <TableCell className="py-1 text-xs font-mono text-gray-500">{new Date(expense.date).toLocaleDateString()}</TableCell>
                                                <TableCell className="py-1 text-xs">
                                                    <span className="font-bold text-[10px] px-1.5 py-0.5 rounded border bg-gold/5 text-maroon border-gold/20">
                                                        {expense.category}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-1 text-xs text-gray-700 truncate max-w-[200px]">{expense.description || '-'}</TableCell>
                                                <TableCell className="py-1 text-xs font-bold text-right text-maroon font-mono flex-1">₹{expense.amount.toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
