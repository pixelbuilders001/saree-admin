import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventoryService';
import { purchaseService } from '@/services/purchaseService';
import {
    Truck,
    Plus,
    CheckCircle2,
    Loader2,
    PackagePlus
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

export default function PurchasesPage() {
    const [selectedSareeId, setSelectedSareeId] = React.useState<string>('');
    const [quantity, setQuantity] = React.useState<number>(1);
    const [purchasePrice, setPurchasePrice] = React.useState<number>(0);
    const [supplier, setSupplier] = React.useState<string>('');

    const queryClient = useQueryClient();

    const { data: sarees, isLoading: isLoadingSarees } = useQuery({
        queryKey: ['sarees'],
        queryFn: inventoryService.getSarees
    });

    const createPurchaseMutation = useMutation({
        mutationFn: purchaseService.createPurchase,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchases'] });
            queryClient.invalidateQueries({ queryKey: ['sarees'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            toast.success('Purchase recorded successfully!');
            setSelectedSareeId('');
            setQuantity(1);
            setPurchasePrice(0);
            setSupplier('');
        },
        onError: () => {
            toast.error('Failed to record purchase');
        }
    });

    const handleSareeSelect = (id: string) => {
        setSelectedSareeId(id);
        const saree = sarees?.find(s => s.id === id);
        if (saree) {
            setPurchasePrice(saree.purchasePrice);
        }
    };

    const handleCreatePurchase = async () => {
        if (!selectedSareeId || !supplier) {
            toast.error('Please fill all required fields');
            return;
        }

        const saree = sarees?.find(s => s.id === selectedSareeId);
        if (!saree) return;

        createPurchaseMutation.mutate({
            sareeId: selectedSareeId,
            sareeName: saree.sareeName,
            quantity,
            purchasePrice,
            supplier,
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-maroon">Record Purchase</h1>
                <p className="text-gray-500">Add new stock and record supplier details</p>
            </div>

            <div className="max-w-3xl">
                <Card className="border-gold/20 shadow-md">
                    <CardHeader className="bg-cream/20 border-b border-gold/10">
                        <CardTitle className="text-xl text-maroon flex items-center gap-2">
                            <Truck className="h-5 w-5" />
                            Purchase Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-maroon">Select Saree</label>
                            <Select value={selectedSareeId} onValueChange={handleSareeSelect}>
                                <SelectTrigger className="border-gold/30">
                                    <SelectValue placeholder={isLoadingSarees ? "Loading collection..." : "Select product to replenish"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.isArray(sarees) && sarees.map(saree => (
                                        <SelectItem key={saree.id} value={saree.id}>
                                            {saree.sareeName} ({saree.barcode})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-maroon">Quantity</label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                    className="border-gold/30"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-maroon">Purchase Price (per unit)</label>
                                <Input
                                    type="number"
                                    value={purchasePrice}
                                    onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                                    className="border-gold/30"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-maroon">Supplier Name</label>
                            <Input
                                placeholder="Enter supplier/vendor name"
                                value={supplier}
                                onChange={(e) => setSupplier(e.target.value)}
                                className="border-gold/30"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="bg-cream/5 border-t border-gold/10 flex justify-between items-center py-6">
                        <div className="text-maroon">
                            <span className="text-sm">Total Investment:</span>
                            <span className="ml-2 text-xl font-bold">₹{(purchasePrice * quantity).toLocaleString()}</span>
                        </div>
                        <Button
                            className="bg-maroon hover:bg-maroon-dark text-gold font-bold px-8 h-12 gap-2"
                            disabled={!selectedSareeId || !supplier || createPurchaseMutation.isPending}
                            onClick={handleCreatePurchase}
                        >
                            {createPurchaseMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <PackagePlus className="h-5 w-5" />}
                            Update Stock
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
