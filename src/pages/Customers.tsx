import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerService, type Customer } from '@/services/customerService';
import {
    Users,
    Search,
    Plus,
    MapPin,
    Phone,
    Loader2,
    Calendar,
    Receipt
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

    // Form inputs state
    const [name, setName] = React.useState('');
    const [mobile, setMobile] = React.useState('');
    const [city, setCity] = React.useState('');
    const [address, setAddress] = React.useState('');

    const queryClient = useQueryClient();

    const { data: customers, isLoading } = useQuery({
        queryKey: ['customers'],
        queryFn: customerService.getCustomers
    });

    const createMutation = useMutation({
        mutationFn: customerService.createCustomer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            toast.success('Customer registered successfully');
            setIsDialogOpen(false);
            setName('');
            setMobile('');
            setCity('');
            setAddress('');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to register customer');
        }
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Customer name is required');
            return;
        }
        if (!mobile.trim() || mobile.length < 10) {
            toast.error('Valid mobile number is required');
            return;
        }

        createMutation.mutate({
            name,
            mobile,
            city,
            address
        });
    };

    const filteredCustomers = Array.isArray(customers)
        ? customers.filter(customer =>
            customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.mobile.includes(searchTerm) ||
            customer.city.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : [];

    return (
        <div className="space-y-3 max-w-7xl mx-auto px-2">
            {/* Header section with brand accent */}
            <div className="flex items-center justify-between border-b border-gold/10 pb-2">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-maroon" />
                    <div>
                        <h1 className="text-xl font-bold font-serif text-maroon tracking-wider">SBS CUSTOMERS REGISTRY</h1>
                        <p className="text-xs text-gray-500 font-sans">Manage profiles and purchasing histories</p>
                    </div>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-maroon hover:bg-maroon-dark text-gold font-bold h-8 text-xs gap-1.5 px-3 uppercase tracking-wider">
                            <Plus className="h-3.5 w-3.5" />
                            ADD CUSTOMER
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="border-gold/20 max-w-sm">
                        <DialogHeader className="border-b border-gold/10 pb-2">
                            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-maroon font-serif">Register New Profile</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSave} className="space-y-3 pt-2">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Customer Name *</label>
                                <Input
                                    required
                                    placeholder="Enter full name"
                                    className="h-8 text-xs border-gold/30"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Mobile Number *</label>
                                <Input
                                    required
                                    placeholder="10-digit mobile"
                                    className="h-8 text-xs border-gold/30 font-mono"
                                    value={mobile}
                                    onChange={(e) => setMobile(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">City</label>
                                    <Input
                                        placeholder="City"
                                        className="h-8 text-xs border-gold/30"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Street Address</label>
                                    <Input
                                        placeholder="Address"
                                        className="h-8 text-xs border-gold/30"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                    />
                                </div>
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-maroon hover:bg-maroon-dark text-gold font-bold h-8 text-xs mt-2 uppercase tracking-wider"
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : 'SAVE CUSTOMER'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-gold/20 shadow-md">
                <CardHeader className="bg-cream/20 border-b border-gold/10 p-2.5">
                    <div className="relative max-w-xs">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <Input
                            placeholder="Find name, phone or city..."
                            className="pl-8 h-8 text-xs border-gold/20 focus-visible:ring-maroon"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-cream/10">
                            <TableRow className="border-b border-gold/10 hover:bg-transparent">
                                <TableHead className="h-8 text-[10px] font-bold text-maroon py-1">Customer Profile</TableHead>
                                <TableHead className="h-8 text-[10px] font-bold text-maroon py-1">Contact Info</TableHead>
                                <TableHead className="h-8 text-[10px] font-bold text-maroon py-1">Location Details</TableHead>
                                <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 text-center">Purchases</TableHead>
                                <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 text-right">Total Outlay (₹)</TableHead>
                                <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 text-right px-3"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-20 text-center text-maroon/50 text-xs italic">
                                        <Loader2 className="h-4 w-4 animate-spin mx-auto mr-2 inline" />
                                        Fetching active customers database...
                                    </TableCell>
                                </TableRow>
                            ) : filteredCustomers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-16 text-center text-xs text-gray-500 italic">
                                        No customer records match your filter criteria
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCustomers.map((customer: Customer) => (
                                    <TableRow key={customer.customerId} className="hover:bg-cream/5 border-b border-gold/5 h-9">
                                        <TableCell className="py-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6.5 h-6.5 bg-gold/10 text-maroon rounded-full flex items-center justify-center font-bold text-[10px] border border-gold/25">
                                                    {customer.name && customer.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-bold text-xs text-maroon">{customer.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-1 text-xs">
                                            <div className="flex items-center gap-1 text-gray-600 font-mono text-[11px]">
                                                <Phone className="h-3 w-3 text-gold" />
                                                {customer.mobile}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-1 text-xs text-gray-700">
                                            {customer.city ? (
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3 text-gray-400" />
                                                    <span>{customer.city}</span>
                                                    {customer.address && <span className="text-[10px] text-gray-400">({customer.address})</span>}
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-gray-400 italic">No details available</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-1 text-xs text-center font-bold font-mono text-gray-700">
                                            {customer.totalPurchases}
                                        </TableCell>
                                        <TableCell className="py-1 text-xs font-bold text-right text-maroon font-mono">
                                            ₹{(customer.totalSpent || 0).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="py-1 text-right px-3">
                                            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-gold hover:text-maroon font-bold gap-1 px-1.5 hover:bg-gold/5">
                                                <Receipt className="h-3 w-3" />
                                                SALES DOCKET
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
