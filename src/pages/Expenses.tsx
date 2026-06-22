import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseService, type Expense } from '@/services/expenseService';
import {
    Receipt,
    Plus,
    Calendar,
    Filter,
    IndianRupee,
    Tag,
    FileText,
    Loader2,
    Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ExpensesPage() {
    const [isAddOpen, setIsAddOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [categoryFilter, setCategoryFilter] = React.useState('all');

    // Form State
    const [newExpense, setNewExpense] = React.useState({
        category: 'Rent' as any,
        amount: '',
        description: ''
    });

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
            toast.success('Expense recorded successfully');
            setIsAddOpen(false);
            setNewExpense({ category: 'Rent', amount: '', description: '' });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to record expense');
        }
    });

    const filteredExpenses = React.useMemo(() => {
        if (!expenses) return [];
        return expenses.filter(e => {
            const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.category.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
            return matchesSearch && matchesCategory;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, searchTerm, categoryFilter]);

    const totalExpenseAmount = React.useMemo(() => {
        return filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    }, [filteredExpenses]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newExpense.amount || Number(newExpense.amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        createMutation.mutate({
            category: newExpense.category,
            amount: Number(newExpense.amount),
            description: newExpense.description
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-maroon" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-maroon flex items-center gap-2">
                        <Receipt className="h-8 w-8" />
                        Expenses
                    </h1>
                    <p className="text-gray-500">Track your business overheads and bills</p>
                </div>

                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-maroon hover:bg-maroon-dark text-gold gap-2 h-12 px-6">
                            <Plus className="h-5 w-5" />
                            Record Expense
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="border-gold/20">
                        <DialogHeader>
                            <DialogTitle className="text-maroon">Record New Expense</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Category</label>
                                <Select
                                    value={newExpense.category}
                                    onValueChange={(val) => setNewExpense({ ...newExpense, category: val as any })}
                                >
                                    <SelectTrigger className="border-gold/30">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Rent">Rent</SelectItem>
                                        <SelectItem value="Electricity">Electricity</SelectItem>
                                        <SelectItem value="Salary">Salary</SelectItem>
                                        <SelectItem value="Marketing">Marketing</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Amount (₹)</label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    className="border-gold/30"
                                    value={newExpense.amount}
                                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Description</label>
                                <Input
                                    placeholder="e.g. Shop rent for June"
                                    className="border-gold/30"
                                    value={newExpense.description}
                                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                                    required
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-maroon hover:bg-maroon-dark text-gold"
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Save Expense
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-gold/20 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Expenses</CardTitle>
                        <IndianRupee className="h-4 w-4 text-maroon" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-maroon">₹{totalExpenseAmount.toLocaleString()}</div>
                        <p className="text-xs text-gray-400 mt-1">For currently filtered period</p>
                    </CardContent>
                </Card>
                <Card className="border-gold/20 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Categories</CardTitle>
                        <Tag className="h-4 w-4 text-gold" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-maroon">5 Categories</div>
                        <p className="text-xs text-gray-400 mt-1">Rent, Utilities, Staff, Ads</p>
                    </CardContent>
                </Card>
                <Card className="border-gold/20 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Entries</CardTitle>
                        <FileText className="h-4 w-4 text-maroon/60" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-maroon">{filteredExpenses.length} Records</div>
                        <p className="text-xs text-gray-400 mt-1">Recorded in system</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-gold/10 shadow-lg">
                <CardHeader className="bg-cream/20 border-b border-gold/10 pb-6 pt-6">
                    <div className="flex flex-col md:flex-row gap-4 md:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search by description..."
                                className="pl-10 border-gold/30"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-[180px] border-gold/30">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4" />
                                    <span>{categoryFilter === 'all' ? 'All Categories' : categoryFilter}</span>
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                <SelectItem value="Rent">Rent</SelectItem>
                                <SelectItem value="Electricity">Electricity</SelectItem>
                                <SelectItem value="Salary">Salary</SelectItem>
                                <SelectItem value="Marketing">Marketing</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-cream/10">
                                <TableRow>
                                    <TableHead className="w-[150px]">Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredExpenses.length > 0 ? (
                                    filteredExpenses.map((expense) => (
                                        <TableRow key={expense.expenseId} className="hover:bg-cream/5">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-3 w-3 text-gray-400" />
                                                    {new Date(expense.date).toLocaleDateString()}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-maroon font-medium">{expense.description}</TableCell>
                                            <TableCell>
                                                <span className={cn(
                                                    "px-2 py-1 rounded-full text-xs font-semibold",
                                                    expense.category === 'Rent' && "bg-blue-100 text-blue-800",
                                                    expense.category === 'Electricity' && "bg-yellow-100 text-yellow-800",
                                                    expense.category === 'Salary' && "bg-green-100 text-green-800",
                                                    expense.category === 'Marketing' && "bg-purple-100 text-purple-800",
                                                    expense.category === 'Other' && "bg-gray-100 text-gray-800"
                                                )}>
                                                    {expense.category}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-maroon">
                                                ₹{Number(expense.amount).toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-gray-500 italic">
                                            No expenses found matching your filters
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
