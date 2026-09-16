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
import {
    Loader2,
    Star,
    Trash,
    Upload,
    Image as ImageIcon,
    Plus,
    ChevronRight,
    ChevronLeft,
    Check,
    Package,
    IndianRupee,
    Sparkles,
    Percent,
    Barcode as BarcodeIcon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { categoryService } from '@/services/inventoryService';
import { CategoryManagementModal } from './CategoryManagementModal';
import { cn } from '@/lib/utils';

// Helper DecimalInput component that preserves intermediate typing states (e.g. "12." or "12.0")
interface DecimalInputProps {
    value: number | string | undefined;
    onChange: (val: number) => void;
    maxDecimals?: number;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    prefix?: string;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

function DecimalInput({
    value,
    onChange,
    maxDecimals = 2,
    placeholder,
    className,
    disabled,
    prefix,
    onBlur,
    ...rest
}: DecimalInputProps) {
    const [text, setText] = React.useState<string>(() => {
        if (value === undefined || value === null || value === 0) return '';
        return String(value);
    });

    React.useEffect(() => {
        const numInText = text === '' || text === '.' ? 0 : parseFloat(text);
        const currentVal = typeof value === 'number' ? value : parseFloat(String(value || 0)) || 0;
        if (numInText !== currentVal) {
            setText(currentVal === 0 ? '' : String(currentVal));
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        if (raw === '') {
            setText('');
            onChange(0);
            return;
        }

        // Normalize leading dot ".5" -> "0.5"
        const normalized = raw === '.' ? '0.' : raw;

        // Regex check: only digits with optional single decimal point up to maxDecimals
        const regex = maxDecimals !== undefined
            ? new RegExp(`^\\d*(\\.\\d{0,${maxDecimals}})?$`)
            : /^\d*(\.\d*)?$/;

        if (regex.test(normalized)) {
            setText(raw);
            const parsed = parseFloat(normalized);
            onChange(isNaN(parsed) ? 0 : parsed);
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (text === '.' || text === '') {
            setText('');
            onChange(0);
        } else if (text.endsWith('.')) {
            const clean = text.slice(0, -1);
            setText(clean);
            onChange(parseFloat(clean) || 0);
        }
        onBlur?.(e);
    };

    return (
        <div className="relative flex items-center w-full">
            {prefix && (
                <span className="absolute left-3 text-xs font-semibold text-gray-400 select-none pointer-events-none">
                    {prefix}
                </span>
            )}
            <Input
                type="text"
                inputMode="decimal"
                value={text}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={placeholder}
                className={cn(prefix && 'pl-7', className)}
                disabled={disabled}
                onWheel={e => (e.target as HTMLInputElement).blur()}
                {...rest}
            />
        </div>
    );
}

const sareeSchema = z.object({
    sareeName: z.string().min(2, 'Name is required'),
    category: z.string().min(1, 'Category is required'),
    categoryId: z.string().optional().nullable().default(''),
    designCode: z.string().optional().nullable().default(''),
    hsnCode: z.string().optional().nullable().default(''),
    sku: z.string().optional().nullable().default(''),
    description: z.string().optional().nullable().default(''),
    fabric: z.string().min(1, 'Fabric is required'),
    color: z.string().min(1, 'Color is required'),
    purchasePrice: z.coerce.number().min(0, 'Must be positive'),
    sellingPrice: z.coerce.number().min(0, 'Must be positive'),
    stock: z.coerce.number().int('Stock must be a whole number').min(0, 'Must be positive').default(0),
    rackNo: z.string().optional().nullable().default(''),
    barcode: z.string().optional().nullable().default(''),
    status: z.enum(['active', 'inactive']).default('active'),
    mrp: z.coerce.number().min(0, 'Must be positive').optional().default(0),
    discountAmount: z.coerce.number().min(0, 'Must be positive').optional().default(0),
    discountPercentage: z.coerce.number().min(0, 'Must be positive').optional().default(0),
    occasion: z.string().optional().nullable().default(''),
    gstRate: z.coerce.number().min(0, 'Must be positive').optional().default(0),
    priceIncludesGst: z.boolean().default(true),
    hasBlouse: z.boolean().nullable().optional().default(null),
});

type SareeFormValues = z.infer<typeof sareeSchema>;

interface SareeFormProps {
    initialData?: Saree;
    onSubmit: (data: SareeFormValues, images: any[]) => Promise<void>;
    onCancel: () => void;
}

const STEPS = [
    { id: 1, title: 'General Details', icon: Package, description: 'Basic details, occasion & blouse piece' },
    { id: 2, title: 'Pricing & Stock', icon: IndianRupee, description: 'Decimal prices, discounts, GST & stock' },
    { id: 3, title: 'Images & Finish', icon: ImageIcon, description: 'Product gallery & submission' },
];

export function SareeForm({ initialData, onSubmit, onCancel }: SareeFormProps) {
    const [currentStep, setCurrentStep] = React.useState<number>(1);

    const [images, setImages] = React.useState<{
        id?: string;
        imageUrl: string;
        file?: File;
        isPrimary: boolean;
        storageKey?: string;
        isNew?: boolean;
        toDelete?: boolean;
    }[]>([]);

    const [isManageCategoriesOpen, setIsManageCategoriesOpen] = React.useState(false);

    // Searchable category dropdown state
    const [catSearch, setCatSearch] = React.useState('');
    const [isCatOpen, setIsCatOpen] = React.useState(false);

    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: categoryService.getCategories
    });

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
                designCode: initialData.designCode || '',
                hsnCode: initialData.hsnCode || '',
                sku: initialData.sku || '',
                description: initialData.description || '',
                fabric: initialData.fabric || '',
                color: initialData.color || '',
                purchasePrice: initialData.purchasePrice || 0,
                sellingPrice: initialData.sellingPrice || 0,
                stock: initialData.stock || 0,
                rackNo: initialData.rackNo || '',
                barcode: initialData.barcode || '',
                status: initialData.status || 'active',
                mrp: initialData.mrp || 0,
                discountAmount: initialData.discountAmount || 0,
                discountPercentage: initialData.discountPercentage || 0,
                occasion: initialData.occasion || '',
                gstRate: initialData.gstRate !== undefined && initialData.gstRate !== null ? initialData.gstRate : 0,
                priceIncludesGst: initialData.priceIncludesGst ?? true,
                hasBlouse: initialData.hasBlouse !== undefined ? initialData.hasBlouse : null,
            }
            : {
                sareeName: '',
                category: '',
                categoryId: '',
                designCode: '',
                hsnCode: '',
                sku: '',
                description: '',
                fabric: '',
                color: '',
                purchasePrice: 0,
                sellingPrice: 0,
                stock: 0,
                rackNo: '',
                barcode: '',
                status: 'active',
                mrp: 0,
                discountAmount: 0,
                discountPercentage: 0,
                occasion: '',
                gstRate: 0,
                priceIncludesGst: true,
                hasBlouse: null,
            },
    });

    const handleNextStep1 = async () => {
        const isValid = await form.trigger(['sareeName', 'category', 'fabric', 'color']);
        if (isValid) {
            setCurrentStep(2);
        } else {
            toast.error('Please fill in required fields in Step 1');
        }
    };

    const handleNextStep2 = async () => {
        const isValid = await form.trigger(['purchasePrice', 'stock', 'sellingPrice', 'mrp', 'gstRate']);
        if (isValid) {
            setCurrentStep(3);
        } else {
            toast.error('Please verify pricing, GST and stock details');
        }
    };

    const handleFormSubmit = async (values: SareeFormValues) => {
        const activeImages = images.filter(img => !img.toDelete);

        // Auto-assign primary image if images exist but none is marked primary
        let finalImages = [...images];
        if (activeImages.length > 0 && !activeImages.some(img => img.isPrimary)) {
            const firstActiveIndex = finalImages.findIndex(img => !img.toDelete);
            if (firstActiveIndex !== -1) {
                finalImages = finalImages.map((img, idx) => ({
                    ...img,
                    isPrimary: idx === firstActiveIndex
                }));
            }
        }

        try {
            await onSubmit(values, finalImages);
            toast.success(initialData ? 'Saree updated successfully' : 'Saree added successfully');
        } catch (error: any) {
            console.error('Submit error:', error);
            toast.error(error?.message || 'Something went wrong while saving saree');
        }
    };

    const handleFormError = (errors: any) => {
        console.error('Form validation errors:', errors);
        const errorKeys = Object.keys(errors);
        if (errorKeys.length > 0) {
            const firstErrorKey = errorKeys[0];
            const step1Keys = ['sareeName', 'category', 'fabric', 'color', 'rackNo', 'designCode', 'sku', 'status', 'categoryId', 'description', 'occasion', 'hasBlouse', 'barcode'];
            const step2Keys = ['purchasePrice', 'stock', 'mrp', 'discountPercentage', 'discountAmount', 'sellingPrice', 'gstRate', 'priceIncludesGst'];

            if (step1Keys.includes(firstErrorKey)) {
                setCurrentStep(1);
            } else if (step2Keys.includes(firstErrorKey)) {
                setCurrentStep(2);
            }
            
            const firstMsg = errors[firstErrorKey]?.message || 'Please check field inputs.';
            toast.error(`Validation Error: ${firstMsg}`);
        }
    };

    // Intercept form onSubmit to prevent premature submission on Step 1 or Step 2 (e.g., when pressing Enter)
    const onFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (currentStep === 1) {
            handleNextStep1();
            return;
        }
        if (currentStep === 2) {
            handleNextStep2();
            return;
        }

        // Only allow actual submission on Step 3
        if (currentStep === 3) {
            form.handleSubmit(handleFormSubmit, handleFormError)(e);
        }
    };

    const formValues = form.watch();

    const applyMrp = (val: number) => {
        form.setValue('mrp', val);
        const discPercent = form.getValues('discountPercentage') || 0;
        const discAmt = form.getValues('discountAmount') || 0;
        if (discPercent > 0) {
            const newAmt = Math.round((val * discPercent / 100) * 100) / 100;
            const newSell = Math.max(0, Math.round((val - newAmt) * 100) / 100);
            form.setValue('discountAmount', newAmt);
            form.setValue('sellingPrice', newSell);
        } else if (discAmt > 0) {
            const newPercent = val > 0 ? Math.round(((discAmt / val) * 100) * 100) / 100 : 0;
            const newSell = Math.max(0, Math.round((val - discAmt) * 100) / 100);
            form.setValue('discountPercentage', newPercent);
            form.setValue('sellingPrice', newSell);
        } else {
            form.setValue('sellingPrice', val);
        }
    };

    // Compute live GST tax breakdown for visual clarity
    const computedSellingPrice = Number(formValues.sellingPrice || 0);
    const computedGstRate = Number(formValues.gstRate || 0);
    const isGstInclusive = Boolean(formValues.priceIncludesGst);

    let baseAmount = computedSellingPrice;
    let gstAmount = 0;
    let finalPayableAmount = computedSellingPrice;

    if (computedGstRate > 0 && computedSellingPrice > 0) {
        if (isGstInclusive) {
            baseAmount = Math.round((computedSellingPrice / (1 + computedGstRate / 100)) * 100) / 100;
            gstAmount = Math.round((computedSellingPrice - baseAmount) * 100) / 100;
            finalPayableAmount = computedSellingPrice;
        } else {
            baseAmount = computedSellingPrice;
            gstAmount = Math.round((computedSellingPrice * (computedGstRate / 100)) * 100) / 100;
            finalPayableAmount = Math.round((baseAmount + gstAmount) * 100) / 100;
        }
    }

    return (
        <Form {...form}>
            <div className="space-y-6">
                {/* Visual Step Indicator Wizard */}
                <div className="border-b border-gold/15 pb-4">
                    <div className="grid grid-cols-3 gap-2">
                        {STEPS.map((step) => {
                            const Icon = step.icon;
                            const isActive = currentStep === step.id;
                            const isCompleted = currentStep > step.id;

                            return (
                                <button
                                    key={step.id}
                                    type="button"
                                    onClick={() => {
                                        if (isCompleted || step.id === currentStep) {
                                            setCurrentStep(step.id);
                                        }
                                    }}
                                    className={cn(
                                        "flex flex-col sm:flex-row items-center sm:items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all relative overflow-hidden",
                                        isActive
                                            ? "bg-gradient-to-r from-maroon/10 to-gold/10 border-maroon text-maroon shadow-sm"
                                            : isCompleted
                                                ? "bg-cream/20 border-emerald-300/60 text-emerald-800 cursor-pointer hover:bg-cream/40"
                                                : "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                                    )}
                                >
                                    <div className={cn(
                                        "flex items-center justify-center h-8 w-8 rounded-lg shrink-0 font-bold text-xs transition-colors",
                                        isActive
                                            ? "bg-maroon text-gold shadow-sm"
                                            : isCompleted
                                                ? "bg-emerald-600 text-white"
                                                : "bg-gray-200 text-gray-500"
                                    )}>
                                        {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : <Icon className="h-4 w-4" />}
                                    </div>
                                    <div className="hidden sm:block min-w-0 flex-1">
                                        <div className="text-[10px] font-bold uppercase tracking-wider opacity-60">Step {step.id}</div>
                                        <div className="text-xs font-bold truncate">{step.title}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <form onSubmit={onFormSubmit} className="space-y-6">
                    {/* STEP 1: GENERAL DETAILS */}
                    <div className={cn("space-y-4 transition-all duration-300", currentStep !== 1 && "hidden")}>
                        <div className="flex items-center justify-between border-b border-gold/10 pb-2">
                            <h3 className="text-sm font-bold text-maroon uppercase tracking-wider flex items-center gap-2">
                                <Package className="h-4 w-4 text-maroon" />
                                Step 1: General Product Details
                            </h3>
                            <span className="text-xs text-gray-500 font-sans">Basic information, occasion & blouse piece</span>
                        </div>

                        {/* Saree Name */}
                        <FormField
                            control={form.control as any}
                            name="sareeName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-maroon font-semibold">Saree Name <span className="text-red-500">*</span></FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Banarasi Pure Silk Katan Saree" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Category & Fabric */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel className="text-maroon font-semibold">Category <span className="text-red-500">*</span></FormLabel>
                                            <button
                                                type="button"
                                                onClick={() => setIsManageCategoriesOpen(true)}
                                                className="text-[10px] text-maroon hover:text-maroon-dark font-bold uppercase flex items-center gap-1 hover:underline focus:outline-none cursor-pointer"
                                            >
                                                <Plus className="h-3 w-3" /> Manage
                                            </button>
                                        </div>
                                        <FormControl>
                                            <div>
                                                {!isCatOpen ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setIsCatOpen(true); setCatSearch(''); }}
                                                        className={`w-full h-10 px-3 text-sm text-left border rounded-md flex items-center justify-between gap-2 hover:border-maroon/40 transition-colors focus:outline-none focus:ring-2 focus:ring-maroon/20 ${
                                                            field.value ? 'border-input text-gray-800' : 'border-input text-muted-foreground'
                                                        }`}
                                                    >
                                                        <span className="truncate">{field.value || 'Select Category'}</span>
                                                        <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                    </button>
                                                ) : (
                                                    <div className="border border-maroon/30 rounded-md overflow-hidden bg-white shadow-sm">
                                                        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
                                                            <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M16.65 16.65A7 7 0 1 0 2 9a7 7 0 0 0 14.65 7.65z" /></svg>
                                                            <input
                                                                autoFocus
                                                                type="text"
                                                                placeholder="Search category..."
                                                                value={catSearch}
                                                                onChange={e => setCatSearch(e.target.value)}
                                                                className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-gray-400"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => { setIsCatOpen(false); setCatSearch(''); }}
                                                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                                            >
                                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                            </button>
                                                        </div>
                                                        <div
                                                            className="max-h-[180px] overflow-y-auto py-1"
                                                            onWheel={e => e.stopPropagation()}
                                                        >
                                                            {categories && categories
                                                                .filter(c => c.status === 'active' && c.name.toLowerCase().includes(catSearch.toLowerCase()))
                                                                .length > 0 ? (
                                                                categories
                                                                    .filter(c => c.status === 'active' && c.name.toLowerCase().includes(catSearch.toLowerCase()))
                                                                    .map(cat => (
                                                                        <button
                                                                            key={cat.id}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                field.onChange(cat.name);
                                                                                form.setValue('categoryId', cat.categoryId);
                                                                                setIsCatOpen(false);
                                                                                setCatSearch('');
                                                                            }}
                                                                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-cream/40 transition-colors ${
                                                                                field.value === cat.name ? 'bg-maroon/5 text-maroon font-semibold' : 'text-gray-700'
                                                                            }`}
                                                                        >
                                                                            {field.value === cat.name ? (
                                                                                <svg className="h-3.5 w-3.5 text-maroon shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                                            ) : <span className="w-3.5" />}
                                                                            {cat.name}
                                                                        </button>
                                                                    ))
                                                            ) : (
                                                                <p className="text-xs text-gray-400 italic text-center py-4">
                                                                    {catSearch ? 'No matching categories' : 'No categories found'}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control as any}
                                name="fabric"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-maroon font-semibold">Fabric <span className="text-red-500">*</span></FormLabel>
                                        <Input placeholder="e.g. Pure Silk / Katan / Georgette" {...field} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Color & Occasion */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="color"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-maroon font-semibold">Color <span className="text-red-500">*</span></FormLabel>
                                        <Input placeholder="e.g. Royal Maroon, Rani Pink, Mustard" {...field} />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Occasion with quick suggestion chips */}
                            <FormField
                                control={form.control as any}
                                name="occasion"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-maroon font-semibold flex items-center justify-between">
                                            <span>Occasion</span>
                                            <span className="text-[10px] text-gray-400 font-normal">e.g. Wedding, Festive</span>
                                        </FormLabel>
                                        <FormControl>
                                            <div className="space-y-1.5">
                                                <Input 
                                                    placeholder="e.g. Bridal / Wedding, Festive Wear" 
                                                    {...field} 
                                                    value={field.value || ''}
                                                />
                                                <div className="flex flex-wrap gap-1">
                                                    {['Bridal / Wedding', 'Festive / Puja', 'Party Wear', 'Casual Wear', 'Traditional'].map(occ => (
                                                        <button
                                                            key={occ}
                                                            type="button"
                                                            onClick={() => field.onChange(occ)}
                                                            className={cn(
                                                                "text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer",
                                                                field.value === occ 
                                                                    ? "bg-maroon/10 border-maroon text-maroon font-semibold" 
                                                                    : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                                                            )}
                                                        >
                                                            {occ}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Blouse Piece (has_blouse) */}
                        <FormField
                            control={form.control as any}
                            name="hasBlouse"
                            render={({ field }) => (
                                <FormItem className="p-3 bg-cream/15 border border-gold/25 rounded-xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <FormLabel className="text-maroon font-semibold text-xs uppercase tracking-wider">
                                            Blouse Piece Included?
                                        </FormLabel>
                                        <span className="text-[10px] text-gray-500">Unstitched or matching piece</span>
                                    </div>
                                    <FormControl>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => field.onChange(true)}
                                                className={cn(
                                                    "py-2 px-3 text-xs font-semibold rounded-lg border transition-all text-center cursor-pointer",
                                                    field.value === true
                                                        ? "bg-maroon text-gold border-maroon shadow-xs"
                                                        : "bg-white text-gray-700 border-gray-200 hover:border-maroon/40"
                                                )}
                                            >
                                                With Blouse (Yes)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => field.onChange(false)}
                                                className={cn(
                                                    "py-2 px-3 text-xs font-semibold rounded-lg border transition-all text-center cursor-pointer",
                                                    field.value === false
                                                        ? "bg-maroon text-gold border-maroon shadow-xs"
                                                        : "bg-white text-gray-700 border-gray-200 hover:border-maroon/40"
                                                )}
                                            >
                                                Without Blouse (No)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => field.onChange(null)}
                                                className={cn(
                                                    "py-2 px-3 text-xs font-semibold rounded-lg border transition-all text-center cursor-pointer",
                                                    field.value === null || field.value === undefined
                                                        ? "bg-gray-200 text-gray-800 border-gray-300 font-bold"
                                                        : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                                                )}
                                            >
                                                Not Specified
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Rack No, Barcode & Status */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                                control={form.control as any}
                                name="rackNo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-maroon font-semibold flex items-center justify-between">
                                            <span>Rack / Bin No</span>
                                            <span className="text-[10px] text-gray-400 font-normal">Optional</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Rack A-12" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control as any}
                                name="barcode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-maroon font-semibold flex items-center justify-between">
                                            <span className="flex items-center gap-1">
                                                <BarcodeIcon className="h-3.5 w-3.5 text-maroon" /> Barcode
                                            </span>
                                            <span className="text-[9px] text-gray-400 font-normal">Auto-gen if empty</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="e.g. 890123... or custom" 
                                                {...field} 
                                                value={field.value || ''}
                                                className="font-mono text-xs"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

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
                                                <SelectItem value="active">Active (Visible)</SelectItem>
                                                <SelectItem value="inactive">Inactive (Hidden)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Design Code, HSN Code, SKU */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                                control={form.control as any}
                                name="designCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-maroon font-semibold">Design Code (Variant)</FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="e.g. KATAN-101" 
                                                {...field} 
                                                value={field.value || ''}
                                                className="uppercase font-mono text-xs"
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control as any}
                                name="hsnCode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-maroon font-semibold">HSN Code (GST)</FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="e.g. 5007 / 5407" 
                                                {...field} 
                                                value={field.value || ''}
                                                className="font-mono text-xs"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control as any}
                                name="sku"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-maroon font-semibold">SKU Code</FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="e.g. SKU-BAN-001" 
                                                {...field} 
                                                value={field.value || ''}
                                                className="uppercase font-mono text-xs"
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Auto-filled Category ID */}
                        <FormField
                            control={form.control as any}
                            name="categoryId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-maroon font-semibold flex items-center gap-2">
                                        Category ID (Storefront)
                                        <span className="text-[9px] bg-maroon/10 text-maroon px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Auto-filled</span>
                                    </FormLabel>
                                    <Input
                                        placeholder="Select a category above to auto-fill"
                                        {...field}
                                        value={field.value || ''}
                                        readOnly
                                        className="bg-gray-50 text-gray-500 cursor-default focus:ring-0 focus:border-gray-200 text-xs"
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Description */}
                        <FormField
                            control={form.control as any}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-maroon font-semibold">Description</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            placeholder="Write detailed product description, zari details, weaving style, care instructions..." 
                                            className="min-h-[80px]" 
                                            {...field} 
                                            value={field.value || ''}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* STEP 2: PRICING, TAXES & STOCK */}
                    <div className={cn("space-y-4 transition-all duration-300", currentStep !== 2 && "hidden")}>
                        <div className="flex items-center justify-between border-b border-gold/10 pb-2">
                            <h3 className="text-sm font-bold text-maroon uppercase tracking-wider flex items-center gap-2">
                                <IndianRupee className="h-4 w-4 text-maroon" />
                                Step 2: Pricing, Tax & Stock Inventory
                            </h3>
                            <span className="text-xs text-gray-500 font-sans">Accepts full decimals (e.g. ₹1299.50)</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Purchase Price */}
                            <FormField
                                control={form.control as any}
                                name="purchasePrice"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-maroon font-semibold">
                                            Purchase Price (Cost) <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <DecimalInput
                                                value={field.value}
                                                onChange={field.onChange}
                                                placeholder="e.g. 2500.50"
                                                maxDecimals={2}
                                                prefix="₹"
                                            />
                                        </FormControl>
                                        <span className="text-[10px] text-gray-400">Cost to your business</span>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Stock Units */}
                            <FormField
                                control={form.control as any}
                                name="stock"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-maroon font-semibold">
                                            Initial Stock (Units) <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="Available units (e.g. 5)"
                                                onWheel={e => (e.target as HTMLInputElement).blur()}
                                                {...field}
                                                value={field.value === 0 ? '' : field.value}
                                                onChange={e => {
                                                    const raw = e.target.value;
                                                    field.onChange(raw === '' ? 0 : parseInt(raw) || 0);
                                                }}
                                            />
                                        </FormControl>
                                        <span className="text-[10px] text-gray-400">Whole number quantity in inventory</span>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Customer Pricing Engine Card */}
                        <div className="bg-gradient-to-br from-cream/20 via-cream/10 to-transparent border border-gold/25 rounded-xl p-4 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between border-b border-gold/15 pb-2">
                                <h4 className="text-xs font-bold text-maroon uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="h-4 w-4 text-gold fill-gold" />
                                    Customer Pricing & Discount Calculator
                                </h4>
                                <span className="text-[10px] text-gray-500">Live 2-way sync with decimals</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* MRP with 2x-5x Multiplier Dropdown & Custom Value Input */}
                                <FormField
                                    control={form.control as any}
                                    name="mrp"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center justify-between">
                                                <FormLabel className="text-maroon/90 font-semibold text-xs">MRP (Maximum Retail Price)</FormLabel>
                                                <span className="text-[10px] text-gray-400">Custom value or multiplier</span>
                                            </div>
                                            <FormControl>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="flex-1">
                                                        <DecimalInput
                                                            value={field.value}
                                                            onChange={(val) => {
                                                                field.onChange(val);
                                                                applyMrp(val);
                                                            }}
                                                            placeholder="Enter MRP or choose multiplier"
                                                            maxDecimals={2}
                                                            prefix="₹"
                                                        />
                                                    </div>
                                                    <select
                                                        defaultValue=""
                                                        onChange={(e) => {
                                                            const mult = parseFloat(e.target.value);
                                                            if (!mult) return;
                                                            const cost = Number(form.getValues('purchasePrice') || 0);
                                                            if (cost <= 0) {
                                                                toast.error('Please enter Purchase Price first to use multiplier');
                                                                e.target.value = '';
                                                                return;
                                                            }
                                                            const newMrp = Math.round((cost * mult) * 100) / 100;
                                                            field.onChange(newMrp);
                                                            applyMrp(newMrp);
                                                            toast.success(`MRP set to ₹${newMrp.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${mult}x Purchase Cost ₹${cost})`);
                                                            e.target.value = '';
                                                        }}
                                                        className="h-9 px-2 text-xs font-bold border border-gold/40 bg-cream/25 hover:bg-cream/40 text-maroon rounded-md focus:outline-none focus:ring-1 focus:ring-maroon cursor-pointer shrink-0"
                                                        title="Select multiplier to auto-calculate MRP from Purchase Price"
                                                    >
                                                        <option value="" disabled>× Multiplier (2 to 5)</option>
                                                        <option value="2">2x Cost</option>
                                                        <option value="2.5">2.5x Cost</option>
                                                        <option value="3">3x Cost</option>
                                                        <option value="3.5">3.5x Cost</option>
                                                        <option value="4">4x Cost</option>
                                                        <option value="4.5">4.5x Cost</option>
                                                        <option value="5">5x Cost</option>
                                                    </select>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Discount Percentage */}
                                <FormField
                                    control={form.control as any}
                                    name="discountPercentage"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-maroon/90 font-semibold text-xs">Discount (%)</FormLabel>
                                            <FormControl>
                                                <DecimalInput
                                                    value={field.value}
                                                    onChange={(percent) => {
                                                        field.onChange(percent);
                                                        const mrp = form.getValues('mrp') || 0;
                                                        if (mrp > 0) {
                                                            const newAmt = Math.round((mrp * percent / 100) * 100) / 100;
                                                            const newSell = Math.max(0, Math.round((mrp - newAmt) * 100) / 100);
                                                            form.setValue('discountAmount', newAmt);
                                                            form.setValue('sellingPrice', newSell);
                                                        }
                                                    }}
                                                    placeholder="e.g. 15.5"
                                                    maxDecimals={2}
                                                    prefix="%"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Discount Amount */}
                                <FormField
                                    control={form.control as any}
                                    name="discountAmount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-maroon/90 font-semibold text-xs">Discount Amount (₹)</FormLabel>
                                            <FormControl>
                                                <DecimalInput
                                                    value={field.value}
                                                    onChange={(amt) => {
                                                        field.onChange(amt);
                                                        const mrp = form.getValues('mrp') || 0;
                                                        if (mrp > 0) {
                                                            const newPercent = Math.round(((amt / mrp) * 100) * 100) / 100;
                                                            const newSell = Math.max(0, Math.round((mrp - amt) * 100) / 100);
                                                            form.setValue('discountPercentage', newPercent);
                                                            form.setValue('sellingPrice', newSell);
                                                        }
                                                    }}
                                                    placeholder="e.g. 500.00"
                                                    maxDecimals={2}
                                                    prefix="₹"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Selling Price */}
                                <FormField
                                    control={form.control as any}
                                    name="sellingPrice"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-maroon font-bold text-xs flex items-center justify-between">
                                                <span>Selling Price (Final) <span className="text-red-500">*</span></span>
                                            </FormLabel>
                                            <FormControl>
                                                <DecimalInput
                                                    value={field.value}
                                                    onChange={(sell) => {
                                                        field.onChange(sell);
                                                        const mrp = form.getValues('mrp') || 0;
                                                        if (mrp > 0) {
                                                            const newAmt = Math.max(0, Math.round((mrp - sell) * 100) / 100);
                                                            const newPercent = Math.round(((newAmt / mrp) * 100) * 100) / 100;
                                                            form.setValue('discountAmount', newAmt);
                                                            form.setValue('discountPercentage', newPercent);
                                                        }
                                                    }}
                                                    placeholder="e.g. 4500.50"
                                                    maxDecimals={2}
                                                    prefix="₹"
                                                    className="font-bold border-maroon/40 text-maroon"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* GST / Tax Settings Card */}
                        <div className="bg-slate-50 border border-gold/20 rounded-xl p-4 space-y-3 shadow-sm">
                            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                                <h4 className="text-xs font-bold text-maroon uppercase tracking-wider flex items-center gap-1.5">
                                    <Percent className="h-4 w-4 text-maroon" />
                                    GST & Tax Configuration
                                </h4>
                                <span className="text-[10px] text-gray-500">Applies to invoice & billing</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                                {/* GST Rate */}
                                <FormField
                                    control={form.control as any}
                                    name="gstRate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-maroon/90 font-semibold text-xs">
                                                GST Rate (%)
                                            </FormLabel>
                                            <FormControl>
                                                <DecimalInput
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    placeholder="e.g. 5 or 12"
                                                    maxDecimals={2}
                                                    prefix="%"
                                                />
                                            </FormControl>
                                            {/* Quick rate selection chips */}
                                            <div className="flex items-center gap-1.5 pt-1">
                                                <span className="text-[10px] text-gray-400">Presets:</span>
                                                {[0, 5, 12, 18].map((rate) => (
                                                    <button
                                                        key={rate}
                                                        type="button"
                                                        onClick={() => field.onChange(rate)}
                                                        className={cn(
                                                            "px-2 py-0.5 rounded text-[10px] font-bold transition-all border cursor-pointer",
                                                            field.value === rate
                                                                ? "bg-maroon text-gold border-maroon shadow-xs"
                                                                : "bg-white text-gray-600 border-gray-200 hover:border-maroon/40"
                                                        )}
                                                    >
                                                        {rate}%
                                                    </button>
                                                ))}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Price Includes GST Checkbox */}
                                <FormField
                                    control={form.control as any}
                                    name="priceIncludesGst"
                                    render={({ field }) => (
                                        <FormItem className="pt-2 sm:pt-6">
                                            <div className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-xs">
                                                <input
                                                    type="checkbox"
                                                    id="priceIncludesGst"
                                                    checked={!!field.value}
                                                    onChange={(e) => field.onChange(e.target.checked)}
                                                    className="mt-0.5 rounded text-maroon focus:ring-maroon h-4 w-4 accent-maroon cursor-pointer"
                                                />
                                                <label htmlFor="priceIncludesGst" className="cursor-pointer select-none">
                                                    <span className="text-xs font-bold text-gray-800 block">
                                                        Price includes GST
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 block leading-tight">
                                                        {field.value
                                                            ? 'Selling price is final and already includes GST.'
                                                            : 'GST will be computed and added on top of selling price.'}
                                                    </span>
                                                </label>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Live Tax Summary Breakdown Banner */}
                            {computedSellingPrice > 0 && (
                                <div className="bg-amber-50/70 border border-amber-200/70 rounded-lg p-2.5 flex items-center justify-between text-xs text-amber-950 font-mono">
                                    <div className="flex items-center gap-3">
                                        <span>Base: ₹{baseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        <span>+ GST ({computedGstRate}%): ₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="font-bold text-maroon">
                                        Total: ₹{finalPayableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* STEP 3: IMAGES & SUBMIT */}
                    <div className={cn("space-y-6 transition-all duration-300", currentStep !== 3 && "hidden")}>
                        <div className="flex items-center justify-between border-b border-gold/10 pb-2">
                            <h3 className="text-sm font-bold text-maroon uppercase tracking-wider flex items-center gap-2">
                                <ImageIcon className="h-4 w-4 text-maroon" />
                                Step 3: Product Images & Review
                            </h3>
                            <span className="text-xs text-gray-500 font-sans">Upload photos and finish saving</span>
                        </div>

                        {/* Summary Card */}
                        <div className="bg-cream/15 border border-gold/20 rounded-xl p-3.5 space-y-2">
                            <div className="text-[10px] font-bold text-maroon uppercase tracking-wider">Product Summary Overview</div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                                <div>
                                    <span className="text-gray-400 block text-[10px]">Name</span>
                                    <span className="font-semibold text-gray-800 truncate block">{formValues.sareeName || '—'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block text-[10px]">Category & Fabric</span>
                                    <span className="font-semibold text-gray-800">{formValues.category || '—'} ({formValues.fabric || '—'})</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block text-[10px]">Occasion & Blouse</span>
                                    <span className="font-semibold text-gray-800">
                                        {formValues.occasion || 'General'} • {formValues.hasBlouse === true ? 'With Blouse' : formValues.hasBlouse === false ? 'Without Blouse' : 'Not specified'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block text-[10px]">Design & SKU</span>
                                    <span className="font-mono font-bold text-purple-700">
                                        {formValues.designCode || '—'} / {formValues.sku || '—'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block text-[10px]">Purchase Cost</span>
                                    <span className="font-mono text-gray-700">₹{Number(formValues.purchasePrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block text-[10px]">Selling Price</span>
                                    <span className="font-mono font-bold text-maroon">₹{Number(formValues.sellingPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block text-[10px]">Tax / GST</span>
                                    <span className="font-semibold text-gray-800">
                                        {Number(formValues.gstRate || 0)}% ({formValues.priceIncludesGst ? 'Inclusive' : 'Exclusive'})
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block text-[10px]">Stock & Rack</span>
                                    <span className="font-mono font-bold text-gray-800">{formValues.stock || 0} pcs (Rack: {formValues.rackNo || '—'})</span>
                                </div>
                            </div>
                        </div>

                        {/* Image Upload Widget */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-maroon uppercase tracking-wider">
                                    Upload Product Images <span className="text-gray-400 font-normal">(Optional)</span>
                                </span>
                                <span className="text-[10px] text-gray-400">Click star to choose Primary image</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                {/* Upload Trigger Box */}
                                <label className="border-2 border-dashed border-gold/40 hover:border-maroon/60 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-cream/5 hover:bg-cream/10 transition-all text-center h-28">
                                    <Upload className="h-5 w-5 text-maroon" />
                                    <span className="text-[10px] font-bold text-maroon uppercase tracking-wide">
                                        Upload Image
                                    </span>
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
                                        <div key={img.id || img.imageUrl} className="relative group rounded-xl overflow-hidden border border-gold/20 bg-gray-50 h-28 shadow-sm">
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
                                                        className="p-1.5 rounded-full bg-white hover:bg-cream text-maroon shadow transition-all hover:scale-110 cursor-pointer"
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
                                                    className="p-1.5 rounded-full bg-white hover:bg-red-500 hover:text-white text-red-600 shadow transition-all hover:scale-110 cursor-pointer"
                                                    title="Delete image"
                                                >
                                                    <Trash className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* Step Wizard Action Controls */}
                    <div className="flex items-center justify-between pt-6 border-t border-gold/15">
                        {currentStep > 1 ? (
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setCurrentStep(prev => prev - 1)}
                                className="gap-1.5 text-xs border-gold/40 text-maroon font-semibold cursor-pointer"
                            >
                                <ChevronLeft className="h-4 w-4" /> Back
                            </Button>
                        ) : (
                            <Button type="button" variant="ghost" onClick={onCancel} className="text-xs cursor-pointer">
                                Cancel
                            </Button>
                        )}

                        <div className="flex items-center gap-2">
                            {currentStep < 3 ? (
                                <Button 
                                    type="button" 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (currentStep === 1) handleNextStep1();
                                        else if (currentStep === 2) handleNextStep2();
                                    }}
                                    className="bg-maroon hover:bg-maroon-dark text-gold gap-1.5 px-6 text-xs font-bold border border-gold/30 shadow cursor-pointer"
                                >
                                    Next <ChevronRight className="h-4 w-4" />
                                </Button>
                            ) : (
                                <Button 
                                    type="submit" 
                                    className="bg-gradient-to-r from-maroon to-maroon-dark hover:from-maroon-dark hover:to-maroon text-gold px-8 text-xs font-bold shadow-md border-2 border-gold/30 cursor-pointer" 
                                    disabled={form.formState.isSubmitting}
                                >
                                    {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    {initialData ? 'Update Saree' : 'Save Saree'}
                                </Button>
                            )}
                        </div>
                    </div>
                </form>

                <CategoryManagementModal 
                    isOpen={isManageCategoriesOpen} 
                    onClose={() => setIsManageCategoriesOpen(false)} 
                />
            </div>
        </Form>
    );
}
