import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService, type Saree } from '@/services/inventoryService';
import { salesService } from '@/services/salesService';
import { customerService } from '@/services/customerService';
import {
    ShoppingCart,
    Search,
    Plus,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';

export default function SalesPage() {
    const [selectedSareeId, setSelectedSareeId] = React.useState<string>('');
    const [quantity, setQuantity] = React.useState<number>(1);
    const [selectedSaree, setSelectedSaree] = React.useState<Saree | null>(null);
    const [customerName, setCustomerName] = React.useState<string>('');
    const [customerMobile, setCustomerMobile] = React.useState<string>('');

    const queryClient = useQueryClient();

    const { data: sarees, isLoading: isLoadingSarees } = useQuery({
        queryKey: ['sarees'],
        queryFn: inventoryService.getSarees
    });

    const { data: customers } = useQuery({
        queryKey: ['customers'],
        queryFn: customerService.getCustomers
    });

    const createSaleMutation = useMutation({
        mutationFn: salesService.createSale,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['sarees'] });
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            toast.success('Sale recorded successfully!');
            setSelectedSareeId('');
            setSelectedSaree(null);
            setQuantity(1);
        },
        onError: () => {
            toast.error('Failed to record sale');
        }
    });

    const handleSareeSelect = (id: string) => {
        const saree = sarees?.find(s => s.id === id);
        if (saree) {
            setSelectedSaree(saree);
            setSelectedSareeId(id);
        }
    };

    const handleCustomerSearch = () => {
        if (!customerMobile) {
            toast.error('Please enter a mobile number');
            return;
        }

        const trimmedSearch = customerMobile.trim();
        const customer = customers?.find(c =>
            c.mobile?.toString().trim() === trimmedSearch
        );

        if (customer) {
            setCustomerName(customer.name);
            toast.success('Customer found!');
        } else {
            toast.info('Customer not found. You can enter the name manually.');
        }
    };

    const totalAmount = (selectedSaree?.sellingPrice || 0) * quantity;
    const estimatedProfit = ((selectedSaree?.sellingPrice || 0) - (selectedSaree?.purchasePrice || 0)) * quantity;

    const handleCreateSale = async () => {
        if (!selectedSaree) return;
        if (quantity > selectedSaree.stock) {
            toast.error('Not enough stock available');
            return;
        }

        createSaleMutation.mutate({
            sareeId: selectedSaree.id,
            sareeName: selectedSaree.sareeName,
            quantity,
            sellingPrice: selectedSaree.sellingPrice,
            customerName,
            customerMobile,
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-maroon">Create New Sale</h1>
                <p className="text-gray-500">Record a customer purchase and update inventory</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-gold/20 shadow-md">
                        <CardHeader className="bg-cream/20 border-b border-gold/10">
                            <CardTitle className="text-xl text-maroon flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5" />
                                Sale Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-maroon">Select Saree</label>
                                <Select value={selectedSareeId} onValueChange={handleSareeSelect}>
                                    <SelectTrigger className="border-gold/30">
                                        <SelectValue placeholder={isLoadingSarees ? "Loading collection..." : "Select a saree by name or barcode"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.isArray(sarees) && sarees.filter(s => s.status === 'active').map(saree => (
                                            <SelectItem key={saree.id} value={saree.id}>
                                                {saree.sareeName} ({saree.barcode}) - Stock: {saree.stock}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedSaree && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-cream/10 rounded-lg border border-gold/10">
                                    <div className="flex gap-4">
                                        <div>
                                            <h4 className="font-bold text-maroon">{selectedSaree.sareeName}</h4>
                                            <p className="text-sm text-gray-500">{selectedSaree.category} | {selectedSaree.fabric}</p>
                                            <p className="text-sm font-semibold mt-1">Rack: {selectedSaree.rackNo}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Unit Price:</span>
                                            <span className="font-bold text-maroon">₹{selectedSaree.sellingPrice.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Available Stock:</span>
                                            <span className={selectedSaree.stock < 5 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                                                {selectedSaree.stock}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-maroon">Quantity</label>
                                <div className="flex items-center gap-4">
                                    <Input
                                        type="number"
                                        min="1"
                                        max={selectedSaree?.stock || 1}
                                        value={quantity}
                                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                        className="border-gold/30 max-w-[150px]"
                                    />
                                    <div className="text-sm text-gray-500">
                                        Max: {selectedSaree?.stock || 0}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-gold/20 shadow-md">
                        <CardHeader className="bg-cream/20 border-b border-gold/10">
                            <CardTitle className="text-xl text-maroon flex items-center gap-2">
                                Customer Information (Optional)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Mobile Number</label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Enter mobile"
                                        className="border-gold/30"
                                        value={customerMobile}
                                        onChange={(e) => setCustomerMobile(e.target.value)}
                                    />
                                    <Button
                                        variant="ghost"
                                        className="text-maroon border border-maroon/20"
                                        onClick={handleCustomerSearch}
                                    >
                                        Search
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Customer Name</label>
                                <Input
                                    placeholder="Enter name"
                                    className="border-gold/30"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="border-maroon/20 bg-maroon text-gold shadow-xl">
                        <CardHeader className="border-b border-gold/20">
                            <CardTitle className="text-xl">Bill Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex justify-between text-gold/80">
                                <span>Subtotal</span>
                                <span className="font-semibold">₹{totalAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-gold/80">
                                <span>Discount</span>
                                <span className="font-semibold">₹0</span>
                            </div>
                            <div className="pt-4 border-t border-gold/20 flex justify-between text-2xl font-bold">
                                <span>Total</span>
                                <span>₹{totalAmount.toLocaleString()}</span>
                            </div>
                            <div className="pt-2 flex justify-between text-xs text-gold/50">
                                <span>Estimated Profit</span>
                                <span>₹{estimatedProfit.toLocaleString()}</span>
                            </div>
                        </CardContent>
                        <CardFooter className="pb-6">
                            <Button
                                className="w-full bg-gold hover:bg-gold-dark text-maroon font-bold h-14 text-lg gap-2"
                                disabled={!selectedSaree || createSaleMutation.isPending}
                                onClick={handleCreateSale}
                            >
                                {createSaleMutation.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : <CheckCircle2 className="h-6 w-6" />}
                                Complete Sale
                            </Button>
                        </CardFooter>
                    </Card>

                    {selectedSaree && selectedSaree.stock < 5 && (
                        <Card className="bg-red-50 border-red-200">
                            <CardContent className="p-4 flex gap-3 text-red-700">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                <p className="text-sm font-medium">
                                    Low Stock Warning: Only {selectedSaree.stock} items remaining.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
