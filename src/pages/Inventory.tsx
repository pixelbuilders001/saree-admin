import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService, type Saree } from '@/services/inventoryService';
import {
    Plus,
    Search,
    Filter,
    FileDown,
    MoreHorizontal,
    Edit,
    Trash2,
    Loader2,
    Eye,
    EyeOff,
    Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { SareeForm } from '@/components/inventory/SareeForm';
import { toast } from 'sonner';

export default function InventoryPage() {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingSaree, setEditingSaree] = React.useState<Saree | undefined>();
    const [visiblePrices, setVisiblePrices] = React.useState<Set<string>>(new Set());
    const [pendingSareeId, setPendingSareeId] = React.useState<string | null>(null);
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false);
    const [passwordInput, setPasswordInput] = React.useState('');

    const queryClient = useQueryClient();

    const { data: sarees, isLoading } = useQuery({
        queryKey: ['sarees'],
        queryFn: inventoryService.getSarees
    });

    const createMutation = useMutation({
        mutationFn: inventoryService.createSaree,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sarees'] });
            setIsFormOpen(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => inventoryService.updateSaree(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sarees'] });
            setIsFormOpen(false);
            setEditingSaree(undefined);
        }
    });

    const filteredSarees = Array.isArray(sarees) ? sarees.filter(saree =>
        saree.sareeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        saree.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        saree.rackNo.toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this saree?')) {
            try {
                await inventoryService.deleteSaree(id);
                toast.success('Saree deleted successfully');
                queryClient.invalidateQueries({ queryKey: ['sarees'] });
            } catch (e) {
                toast.error('Failed to delete saree');
            }
        }
    };

    const handleFormSubmit = async (values: any) => {
        if (editingSaree) {
            await updateMutation.mutateAsync({ id: editingSaree.id, data: values });
        } else {
            await createMutation.mutateAsync(values);
        }
    };

    const handleTogglePurchasePrice = (sareeId: string) => {
        if (visiblePrices.has(sareeId)) {
            const next = new Set(visiblePrices);
            next.delete(sareeId);
            setVisiblePrices(next);
        } else {
            setPendingSareeId(sareeId);
            setIsPasswordDialogOpen(true);
        }
    };

    const verifyPassword = () => {
        if (passwordInput === '123456') {
            if (pendingSareeId) {
                const next = new Set(visiblePrices);
                next.add(pendingSareeId);
                setVisiblePrices(next);
            }
            setIsPasswordDialogOpen(false);
            setPendingSareeId(null);
            setPasswordInput('');
            toast.success('Access granted');
        } else {
            toast.error('Incorrect password');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-maroon">Inventory</h1>
                    <p className="text-gray-500">Manage your saree collection and stock</p>
                </div>
                <Button
                    className="bg-maroon hover:bg-maroon-dark text-gold gap-2 h-12 px-6"
                    onClick={() => {
                        setEditingSaree(undefined);
                        setIsFormOpen(true);
                    }}
                >
                    <Plus className="h-5 w-5" />
                    Add New Saree
                </Button>
            </div>

            <Card className="border-gold/20 shadow-md">
                <CardHeader className="pb-3 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-1 max-w-sm">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search sarees, category, rack..."
                                className="pl-10 border-gold/20 focus-visible:ring-maroon"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" className="border-gold/20 text-maroon gap-2">
                            <Filter className="h-4 w-4" />
                            Filter
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="border-gold/20 text-maroon gap-2">
                            <FileDown className="h-4 w-4" />
                            Export
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-cream/30">
                            <TableRow>
                                <TableHead>Id</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Fabric</TableHead>
                                <TableHead className="text-right">Purchase (₹)</TableHead>
                                <TableHead className="text-right">Price (₹)</TableHead>
                                <TableHead className="text-center">Stock</TableHead>
                                <TableHead>Rack</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-24 text-center text-maroon/50 italic">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                        Loading collection...
                                    </TableCell>
                                </TableRow>
                            ) : filteredSarees?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-24 text-center">No sarees found</TableCell>
                                </TableRow>
                            ) : (
                                filteredSarees?.map((saree) => (
                                    <TableRow key={saree.id} className="hover:bg-cream/10 transition-colors">
                                        <TableCell className="font-medium text-maroon">{saree.id}</TableCell>
                                        <TableCell className="font-medium text-maroon">{saree.sareeName}</TableCell>
                                        <TableCell>{saree.category}</TableCell>
                                        <TableCell>{saree.fabric}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2 group">
                                                <span className="font-medium text-gray-600">
                                                    {visiblePrices.has(saree.id)
                                                        ? `₹${saree.purchasePrice.toLocaleString()}`
                                                        : '••••••'}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-gray-400 hover:text-maroon"
                                                    onClick={() => handleTogglePurchasePrice(saree.id)}
                                                >
                                                    {visiblePrices.has(saree.id) ? (
                                                        <EyeOff className="h-3 w-3" />
                                                    ) : (
                                                        <Eye className="h-3 w-3" />
                                                    )}
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">₹{saree.sellingPrice.toLocaleString()}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={cn(
                                                "font-bold",
                                                saree.stock < 5 ? "bg-red-500 text-white" : "bg-green-100 text-green-700"
                                            )}>
                                                {saree.stock}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{saree.rackNo}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={saree.status === 'active' ? 'text-green-600 border-green-600' : 'text-gray-400 border-gray-400'}>
                                                {saree.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="border-gold/20">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem
                                                        className="gap-2 cursor-pointer"
                                                        onClick={() => {
                                                            setEditingSaree(saree);
                                                            setIsFormOpen(true);
                                                        }}
                                                    >
                                                        <Edit className="h-4 w-4" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="gap-2 text-red-600 cursor-pointer focus:text-red-600"
                                                        onClick={() => handleDelete(saree.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-gold/20">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-maroon">
                            {editingSaree ? 'Edit Saree' : 'Add New Saree'}
                        </DialogTitle>
                    </DialogHeader>
                    <SareeForm
                        initialData={editingSaree}
                        onSubmit={handleFormSubmit}
                        onCancel={() => setIsFormOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent className="sm:max-w-md border-gold/20">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-maroon">
                            <Lock className="h-5 w-5" />
                            Admin Access Required
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-gray-500">
                            Please enter the administrator password to view purchase prices.
                        </p>
                        <Input
                            type="password"
                            placeholder="Enter password"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    verifyPassword();
                                }
                            }}
                            autoFocus
                        />
                        <div className="flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setIsPasswordDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                className="bg-maroon hover:bg-maroon-dark text-gold"
                                onClick={verifyPassword}
                            >
                                Verify
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
