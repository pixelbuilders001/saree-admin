import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService } from '@/services/customerService';
import {
    Users,
    Search,
    Plus,
    MapPin,
    Phone,
    History,
    Loader2
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
    TableRow
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function CustomersPage() {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);

    const queryClient = useQueryClient();

    const { data: customers, isLoading } = useQuery({
        queryKey: ['customers'],
        queryFn: customerService.getCustomers
    });

    const filteredCustomers = Array.isArray(customers) ? customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.mobile.includes(searchTerm) ||
        customer.city.toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-maroon">Customers</h1>
                    <p className="text-gray-500">Manage customer profiles and purchase history</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-maroon hover:bg-maroon-dark text-gold gap-2 h-12 px-6">
                            <Plus className="h-5 w-5" />
                            Add Customer
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="border-gold/20">
                        <DialogHeader>
                            <DialogTitle className="text-maroon">Add New Customer</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Full Name</label>
                                <Input placeholder="Enter name" className="border-gold/30" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Mobile Number</label>
                                <Input placeholder="Enter mobile" className="border-gold/30" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">City</label>
                                    <Input placeholder="City" className="border-gold/30" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Address</label>
                                    <Input placeholder="Address" className="border-gold/30" />
                                </div>
                            </div>
                            <Button className="w-full bg-maroon text-gold mt-2" onClick={() => setIsDialogOpen(false)}>Save Customer</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-gold/20 shadow-md">
                <CardHeader className="pb-3 border-b border-gray-100">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search by name, mobile or city..."
                            className="pl-10 border-gold/20 focus-visible:ring-maroon"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-cream/30">
                            <TableRow>
                                <TableHead>Customer Name</TableHead>
                                <TableHead>Mobile</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead className="text-center">Total Purchases</TableHead>
                                <TableHead className="text-center">Total Spent</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-maroon/20" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredCustomers?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">No customers found</TableCell>
                                </TableRow>
                            ) : (
                                filteredCustomers?.map((customer) => (
                                    <TableRow key={customer.customerId} className="hover:bg-cream/10">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gold/20 text-maroon rounded-full flex items-center justify-center font-bold">
                                                    {customer.name.charAt(0)}
                                                </div>
                                                <span className="font-medium text-maroon">{customer.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-gray-600">
                                                <Phone className="h-3 w-3" />
                                                {customer.mobile}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-gray-600">
                                                <MapPin className="h-3 w-3" />
                                                {customer.city}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-maroon">
                                            {customer.totalPurchases}
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-maroon">
                                            ₹{customer.totalSpent?.toLocaleString() || 0}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" className="text-maroon hover:bg-gold/10 gap-2">
                                                <History className="h-4 w-4" />
                                                History
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
