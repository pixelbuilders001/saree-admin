import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Saree } from '@/services/inventoryService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const sareeSchema = z.object({
    sareeName: z.string().min(2, 'Name is required'),
    category: z.string().min(1, 'Category is required'),
    fabric: z.string().min(1, 'Fabric is required'),
    color: z.string().min(1, 'Color is required'),
    purchasePrice: z.coerce.number().min(0, 'Must be positive'),
    sellingPrice: z.coerce.number().min(0, 'Must be positive'),
    stock: z.coerce.number().min(0, 'Must be positive'),
    rackNo: z.string().min(1, 'Rack number is required'),
});

type SareeFormValues = z.infer<typeof sareeSchema>;

interface SareeFormProps {
    initialData?: Saree;
    onSubmit: (data: SareeFormValues) => Promise<void>;
    onCancel: () => void;
}

export function SareeForm({ initialData, onSubmit, onCancel }: SareeFormProps) {
    const form = useForm<SareeFormValues>({
        resolver: zodResolver(sareeSchema) as any,
        defaultValues: initialData || {
            sareeName: '',
            category: '',
            fabric: '',
            color: '',
            purchasePrice: 0,
            sellingPrice: 0,
            stock: 0,
            rackNo: '',
        },
    });

    const handleFormSubmit = async (values: any) => {
        try {
            await onSubmit(values);
            toast.success(initialData ? 'Saree updated successfully' : 'Saree added successfully');
        } catch (error) {
            toast.error('Something went wrong');
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <FormField
                            control={form.control as any}
                            name="sareeName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-maroon font-semibold">Saree Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Banarasi Silk Saree" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-maroon font-semibold">Category</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Banarasi">Banarasi</SelectItem>
                                                <SelectItem value="Kanjivaram">Kanjivaram</SelectItem>
                                                <SelectItem value="Chiffon">Chiffon</SelectItem>
                                                <SelectItem value="Cotton">Cotton</SelectItem>
                                                <SelectItem value="Silk">Silk</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control as any}
                                name="fabric"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-maroon font-semibold">Fabric</FormLabel>
                                        <Input placeholder="e.g. Pure Silk" {...field} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="color"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-maroon font-semibold">Color</FormLabel>
                                        <Input placeholder="e.g. Maroon" {...field} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control as any}
                                name="rackNo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-maroon font-semibold">Rack No</FormLabel>
                                        <Input placeholder="e.g. A-12" {...field} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="purchasePrice"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-maroon font-semibold">Purchase Price (₹)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control as any}
                                name="sellingPrice"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-maroon font-semibold">Selling Price (₹)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control as any}
                            name="stock"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-maroon font-semibold">Initial Stock</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                    <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                    <Button type="submit" className="bg-maroon hover:bg-maroon-dark text-gold px-8 border-2 border-gold/20" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {initialData ? 'Update Saree' : 'Save Saree'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
