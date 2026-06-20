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
    Loader2,
    Table as TableIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { toast } from 'sonner';

export default function SalesPage() {
    const [customerName, setCustomerName] = React.useState<string>('');
    const [customerMobile, setCustomerMobile] = React.useState<string>('');
    const [sareeSearchTerm, setSareeSearchTerm] = React.useState<string>('');
    const [cart, setCart] = React.useState<Array<{
        sareeId: string;
        sareeName: string;
        quantity: number;
        sellingPrice: number;
        purchasePrice: number;
    }>>([]);

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
            setCart([]);
            setCustomerName('');
            setCustomerMobile('');
        },
        onError: () => {
            toast.error('Failed to record sale');
        }
    });

    const filteredSarees = React.useMemo(() => {
        if (!Array.isArray(sarees)) return [];
        return sarees.filter(s =>
            s.status === 'active' && (
                s.sareeName.toLowerCase().includes(sareeSearchTerm.toLowerCase()) ||
                s.id.toLowerCase().includes(sareeSearchTerm.toLowerCase()) ||
                s.barcode?.toLowerCase().includes(sareeSearchTerm.toLowerCase())
            )
        );
    }, [sarees, sareeSearchTerm]);

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

    const handleRemoveFromCart = (index: number) => {
        const newCart = [...cart];
        newCart.splice(index, 1);
        setCart(newCart);
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
    const cartProfit = cart.reduce((sum, item) => sum + ((item.sellingPrice - item.purchasePrice) * item.quantity), 0);

    const handleCreateSale = async () => {
        if (cart.length === 0) {
            toast.error('Cart is empty');
            return;
        }

        createSaleMutation.mutate({
            items: cart.map(({ purchasePrice: _, ...item }) => item),
            customerName,
            customerMobile,
        });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-gold/20 shadow-md">
                        <CardHeader className="bg-cream/20 border-b border-gold/10">
                            <CardTitle className="text-xl text-maroon flex items-center gap-2">
                                <Search className="h-5 w-5" />
                                Add Sarees to Sale
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-2 relative">
                                <label className="text-sm font-semibold text-maroon">Search by Name, ID or Barcode</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Type to search..."
                                        className="pl-10 border-gold/30 h-12 text-lg"
                                        value={sareeSearchTerm}
                                        onChange={(e) => setSareeSearchTerm(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                {sareeSearchTerm && (
                                    <Card className="absolute z-50 w-full mt-1 border-gold/20 shadow-xl max-h-[300px] overflow-y-auto">
                                        <CardContent className="p-0">
                                            {filteredSarees.length > 0 ? (
                                                filteredSarees.map(saree => (
                                                    <div
                                                        key={saree.id}
                                                        className="p-3 hover:bg-cream/20 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center"
                                                        onClick={() => {
                                                            const existingItemIndex = cart.findIndex(item => item.sareeId === saree.id);
                                                            if (existingItemIndex > -1) {
                                                                const newCart = [...cart];
                                                                newCart[existingItemIndex].quantity += 1;
                                                                setCart(newCart);
                                                            } else {
                                                                setCart([...cart, {
                                                                    sareeId: saree.id,
                                                                    sareeName: saree.sareeName,
                                                                    quantity: 1,
                                                                    sellingPrice: saree.sellingPrice,
                                                                    purchasePrice: saree.purchasePrice
                                                                }]);
                                                            }
                                                            setSareeSearchTerm('');
                                                            toast.success(`${saree.sareeName} added to cart`);
                                                        }}
                                                    >
                                                        <div>
                                                            <div className="font-bold text-maroon">{saree.sareeName}</div>
                                                            <div className="text-xs text-gray-500">{saree.id} | {saree.category}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-bold text-maroon">₹{saree.sellingPrice.toLocaleString()}</div>
                                                            <div className={`text-xs ${saree.stock < 5 ? 'text-red-600' : 'text-green-600'}`}>Stock: {saree.stock}</div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-4 text-center text-gray-500 italic">No sarees match your search</div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {cart.length > 0 && (
                        <Card className="border-gold/20 shadow-md">
                            <CardHeader className="bg-cream/20 border-b border-gold/10">
                                <CardTitle className="text-xl text-maroon flex items-center gap-2">
                                    <ShoppingCart className="h-5 w-5" />
                                    Shopping Cart ({cart.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-cream/30">
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="text-center">Qty</TableHead>
                                            <TableHead className="text-right">Price</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead className="text-right"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {cart.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium text-maroon">
                                                    <div>{item.sareeName}</div>
                                                    <div className="text-xs text-gray-500 font-normal">{item.sareeId}</div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Input
                                                        type="number"
                                                        className="w-20 h-8 text-center mx-auto"
                                                        value={item.quantity}
                                                        min="1"
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 1;
                                                            const newCart = [...cart];
                                                            newCart[index].quantity = val;
                                                            setCart(newCart);
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">₹{item.sellingPrice.toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-bold">₹{(item.sellingPrice * item.quantity).toLocaleString()}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:text-red-700 p-0 h-auto"
                                                        onClick={() => handleRemoveFromCart(index)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

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
                                <span className="font-semibold">₹{cartTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-gold/80">
                                <span>Discount</span>
                                <span className="font-semibold">₹0</span>
                            </div>
                            <div className="pt-4 border-t border-gold/20 flex justify-between text-2xl font-bold">
                                <span>Total</span>
                                <span>₹{cartTotal.toLocaleString()}</span>
                            </div>
                            <div className="pt-2 flex justify-between text-xs text-gold/50">
                                <span>Estimated Profit</span>
                                <span>₹{cartProfit.toLocaleString()}</span>
                            </div>
                        </CardContent>
                        <CardFooter className="pb-6">
                            <Button
                                className="w-full bg-gold hover:bg-gold-dark text-maroon font-bold h-14 text-lg gap-2"
                                disabled={cart.length === 0 || createSaleMutation.isPending}
                                onClick={handleCreateSale}
                            >
                                {createSaleMutation.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : <CheckCircle2 className="h-6 w-6" />}
                                Complete Sale
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
