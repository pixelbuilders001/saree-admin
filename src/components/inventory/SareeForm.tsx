import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Saree } from '@/services/inventoryService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Loader2, Star, Trash, Upload, Image as ImageIcon } from 'lucide-react';

const sareeSchema = z.object({
    sareeName: z.string().min(2, 'Name is required'),
    category: z.string().min(1, 'Category is required'),
    categoryId: z.string().optional().nullable().default(''),
    sku: z.string().optional().nullable().default(''),
    description: z.string().optional().nullable().default(''),
    fabric: z.string().min(1, 'Fabric is required'),
    color: z.string().min(1, 'Color is required'),
    purchasePrice: z.coerce.number().min(0, 'Must be positive'),
    sellingPrice: z.coerce.number().min(0, 'Must be positive'),
    stock: z.coerce.number().min(0, 'Must be positive'),
    rackNo: z.string().min(1, 'Rack number is required'),
    status: z.enum(['active', 'inactive']).default('active'),
    mrp: z.coerce.number().min(0, 'Must be positive').optional().default(0),
    discountAmount: z.coerce.number().min(0, 'Must be positive').optional().default(0),
    discountPercentage: z.coerce.number().min(0, 'Must be positive').optional().default(0),
});

type SareeFormValues = z.infer<typeof sareeSchema>;

interface SareeFormProps {
    initialData?: Saree;
    onSubmit: (data: SareeFormValues, images: any[]) => Promise<void>;
    onCancel: () => void;
}

export function SareeForm({ initialData, onSubmit, onCancel }: SareeFormProps) {
    const [images, setImages] = React.useState<{
        id?: string;
        imageUrl: string;
        file?: File;
        isPrimary: boolean;
        storageKey?: string;
        isNew?: boolean;
        toDelete?: boolean;
    }[]>([]);

    React.useEffect(() => {
        if (initialData?.images) {
            setImages(initialData.images.map(img => ({
                id: img.id,
                imageUrl: img.imageUrl,
                isPrimary: img.isPrimary,
                storageKey: img.storageKey,
                isNew: false
            })));
        } else {
            setImages([]);
        }
    }, [initialData]);

    const form = useForm<SareeFormValues>({
        resolver: zodResolver(sareeSchema) as any,
        defaultValues: initialData
            ? {
                sareeName: initialData.sareeName || '',
                category: initialData.category || '',
                categoryId: initialData.categoryId || '',
                sku: initialData.sku || '',
                description: initialData.description || '',
                fabric: initialData.fabric || '',
                color: initialData.color || '',
                purchasePrice: initialData.purchasePrice || 0,
                sellingPrice: initialData.sellingPrice || 0,
                stock: initialData.stock || 0,
                rackNo: initialData.rackNo || '',
                status: initialData.status || 'active',
                mrp: initialData.mrp || 0,
                discountAmount: initialData.discountAmount || 0,
                discountPercentage: initialData.discountPercentage || 0,
            }
            : {
                sareeName: '',
                category: '',
                categoryId: '',
                sku: '',
                description: '',
                fabric: '',
                color: '',
                purchasePrice: 0,
                sellingPrice: 0,
                stock: 0,
                rackNo: '',
                status: 'active',
                mrp: 0,
                discountAmount: 0,
                discountPercentage: 0,
            },
    });

    const handleFormSubmit = async (values: any) => {
        try {
            await onSubmit(values, images);
            toast.success(initialData ? 'Saree updated successfully' : 'Saree added successfully');
        } catch (error) {
            console.error('Submit error:', error);
            toast.error('Something went wrong');
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
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

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="sku"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-maroon font-semibold">SKU Code</FormLabel>
                                        <Input placeholder="e.g. SKU-BAN-001" {...field} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control as any}
                                name="categoryId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-maroon font-semibold">Category ID (Storefront)</FormLabel>
                                        <Input placeholder="e.g. cat_123" {...field} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
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

                        {/* Customer Pricing and Discounts Engine */}
                        <div className="bg-cream/15 border border-gold/15 rounded-lg p-3.5 space-y-3 shadow-inner">
                            <h4 className="text-[10px] font-bold text-maroon uppercase tracking-wider flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
                                Customer Pricing Engine
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <FormField
                                    control={form.control as any}
                                    name="mrp"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-maroon/80 font-semibold text-xs">MRP (₹)</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="number" 
                                                    {...field}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        field.onChange(val);
                                                        const discPercent = form.getValues('discountPercentage') || 0;
                                                        const discAmt = form.getValues('discountAmount') || 0;
                                                        if (discPercent > 0) {
                                                            const newAmt = Math.round((val * discPercent / 100) * 100) / 100;
                                                            const newSell = Math.max(0, val - newAmt);
                                                            form.setValue('discountAmount', newAmt);
                                                            form.setValue('sellingPrice', newSell);
                                                        } else if (discAmt > 0) {
                                                            const newPercent = val > 0 ? Math.round(((discAmt / val) * 100) * 100) / 100 : 0;
                                                            const newSell = Math.max(0, val - discAmt);
                                                            form.setValue('discountPercentage', newPercent);
                                                            form.setValue('sellingPrice', newSell);
                                                        } else {
                                                            form.setValue('sellingPrice', val);
                                                        }
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control as any}
                                    name="discountPercentage"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-maroon/80 font-semibold text-xs">Discount (%)</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="number" 
                                                    {...field} 
                                                    onChange={(e) => {
                                                        const percent = parseFloat(e.target.value) || 0;
                                                        field.onChange(percent);
                                                        const mrp = form.getValues('mrp') || 0;
                                                        if (mrp > 0) {
                                                            const newAmt = Math.round((mrp * percent / 100) * 100) / 100;
                                                            const newSell = Math.max(0, mrp - newAmt);
                                                            form.setValue('discountAmount', newAmt);
                                                            form.setValue('sellingPrice', newSell);
                                                        }
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control as any}
                                    name="discountAmount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-maroon/80 font-semibold text-xs">Discount Amount (₹)</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="number" 
                                                    {...field} 
                                                    onChange={(e) => {
                                                        const amt = parseFloat(e.target.value) || 0;
                                                        field.onChange(amt);
                                                        const mrp = form.getValues('mrp') || 0;
                                                        if (mrp > 0) {
                                                            const newPercent = Math.round(((amt / mrp) * 100) * 100) / 100;
                                                            const newSell = Math.max(0, mrp - amt);
                                                            form.setValue('discountPercentage', newPercent);
                                                            form.setValue('sellingPrice', newSell);
                                                        }
                                                    }}
                                                />
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
                                            <FormLabel className="text-maroon/80 font-semibold text-xs">Selling Price (₹)</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="number" 
                                                    {...field} 
                                                    onChange={(e) => {
                                                        const sell = parseFloat(e.target.value) || 0;
                                                        field.onChange(sell);
                                                        const mrp = form.getValues('mrp') || 0;
                                                        if (mrp > 0) {
                                                            const newAmt = Math.max(0, mrp - sell);
                                                            const newPercent = Math.round(((newAmt / mrp) * 100) * 100) / 100;
                                                            form.setValue('discountAmount', newAmt);
                                                            form.setValue('discountPercentage', newPercent);
                                                        }
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-maroon font-semibold">Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value || 'active'}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control as any}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-maroon font-semibold">Description</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            placeholder="Write product description here..." 
                                            className="min-h-[80px]" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* Image Upload Widget */}
                <div className="pt-6 border-t border-gray-100">
                    <h3 className="text-xs font-bold text-maroon mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                        <ImageIcon className="h-4 w-4" />
                        Product Images
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {/* Upload Trigger Box */}
                        <label className="border-2 border-dashed border-gold/40 hover:border-maroon/60 rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-cream/5 hover:bg-cream/10 transition-all text-center h-28">
                            <Upload className="h-5 w-5 text-maroon" />
                            <span className="text-[10px] font-bold text-maroon uppercase tracking-wide">Upload Image</span>
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files) {
                                        const filesArray = Array.from(e.target.files);
                                        const newImages = filesArray.map(file => ({
                                            imageUrl: URL.createObjectURL(file),
                                            file: file,
                                            isPrimary: images.filter(img => !img.toDelete).length === 0,
                                            isNew: true
                                        }));
                                        setImages(prev => [...prev, ...newImages]);
                                    }
                                }}
                            />
                        </label>

                        {/* Images list */}
                        {images
                            .map((img, idx) => ({ ...img, originalIndex: idx }))
                            .filter(img => !img.toDelete)
                            .map((img) => (
                                <div key={img.id || img.imageUrl} className="relative group rounded-lg overflow-hidden border border-gold/20 bg-gray-50 h-28 shadow-sm">
                                    <img src={img.imageUrl} alt="Saree Preview" className="w-full h-full object-cover" />
                                    
                                    {img.isPrimary && (
                                        <div className="absolute top-1.5 left-1.5 bg-maroon text-gold text-[8px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-0.5 uppercase tracking-wider">
                                            <Star className="h-2 w-2 fill-gold stroke-gold" />
                                            Primary
                                        </div>
                                    )}

                                    {/* Action Hover Controls */}
                                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        {!img.isPrimary && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setImages(prev => prev.map((item, i) => ({
                                                        ...item,
                                                        isPrimary: i === img.originalIndex
                                                    })));
                                                }}
                                                className="p-1.5 rounded-full bg-white hover:bg-cream text-maroon shadow transition-all hover:scale-110"
                                                title="Set as primary"
                                            >
                                                <Star className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                let updated = [...images];
                                                const index = img.originalIndex;
                                                if (img.isNew) {
                                                    URL.revokeObjectURL(img.imageUrl);
                                                    updated = updated.filter((_, idx) => idx !== index);
                                                } else {
                                                    updated = updated.map((item, idx) => idx === index ? { ...item, toDelete: true } : item);
                                                }

                                                // If the deleted image was primary, set a new one
                                                if (img.isPrimary) {
                                                    const firstNonDeletedIdx = updated.findIndex(item => !item.toDelete);
                                                    if (firstNonDeletedIdx !== -1) {
                                                        updated = updated.map((item, idx) => ({
                                                            ...item,
                                                            isPrimary: idx === firstNonDeletedIdx
                                                        }));
                                                    }
                                                }
                                                setImages(updated);
                                            }}
                                            className="p-1.5 rounded-full bg-white hover:bg-red-500 hover:text-white text-red-600 shadow transition-all hover:scale-110"
                                            title="Delete image"
                                        >
                                            <Trash className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
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
