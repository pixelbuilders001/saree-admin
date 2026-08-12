import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService, type Category } from '@/services/inventoryService';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Plus,
    Edit2,
    Trash2,
    Loader2,
    X,
    FolderPlus,
    Check,
    AlertCircle,
    ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CategoryManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CategoryManagementModal({ isOpen, onClose }: CategoryManagementModalProps) {
    const queryClient = useQueryClient();
    const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
    const [isFormOpen, setIsFormOpen] = React.useState(false);

    // Form inputs
    const [catId, setCatId] = React.useState('');
    const [catName, setCatName] = React.useState('');
    const [catSlug, setCatSlug] = React.useState('');
    const [catDesc, setCatDesc] = React.useState('');
    const [catStatus, setCatStatus] = React.useState<'active' | 'inactive'>('active');
    const [catSortOrder, setCatSortOrder] = React.useState(0);
    const [imageFile, setImageFile] = React.useState<File | null>(null);
    const [imagePreview, setImagePreview] = React.useState<string>('');

    // Fetch categories
    const { data: categories, isLoading } = useQuery({
        queryKey: ['categories'],
        queryFn: categoryService.getCategories,
        enabled: isOpen
    });

    // Reset form states
    const resetForm = () => {
        setEditingCategory(null);
        setCatId('');
        setCatName('');
        setCatSlug('');
        setCatDesc('');
        setCatStatus('active');
        setCatSortOrder(0);
        setImageFile(null);
        setImagePreview('');
        setIsFormOpen(false);
    };

    // Auto-generate slug and category_id when typing name
    const handleNameChange = (name: string) => {
        setCatName(name);
        if (!editingCategory) {
            const generatedSlug = name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
            setCatSlug(generatedSlug);
            
            const generatedId = name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/(^-|-$)/g, '');
            setCatId(generatedId);
        }
    };

    // Open form for adding new category
    const handleAddNew = () => {
        resetForm();
        setIsFormOpen(true);
    };

    // Open form to edit category
    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setCatId(category.categoryId);
        setCatName(category.name);
        setCatSlug(category.slug);
        setCatDesc(category.description || '');
        setCatStatus(category.status);
        setCatSortOrder(category.sortOrder || 0);
        setImageFile(null);
        setImagePreview(category.imageUrl || '');
        setIsFormOpen(true);
    };

    // Mutation: Create Category
    const createMutation = useMutation({
        mutationFn: ({ data, imageFile }: { data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>; imageFile?: File }) => 
            categoryService.createCategory(data, imageFile),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category created successfully');
            resetForm();
        },
        onError: (err: any) => {
            console.error(err);
            toast.error(`Failed to create category: ${err.message || err}`);
        }
    });

    // Mutation: Update Category
    const updateMutation = useMutation({
        mutationFn: ({ id, data, imageFile }: { id: string; data: Partial<Category>; imageFile?: File }) => 
            categoryService.updateCategory(id, data, imageFile),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category updated successfully');
            resetForm();
        },
        onError: (err: any) => {
            console.error(err);
            toast.error(`Failed to update category: ${err.message || err}`);
        }
    });

    // Mutation: Delete Category
    const deleteMutation = useMutation({
        mutationFn: categoryService.deleteCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category deleted successfully');
        },
        onError: (err: any) => {
            console.error(err);
            toast.error(`Failed to delete category: ${err.message || err}`);
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!catId.trim()) {
            toast.error('Category ID is required');
            return;
        }
        if (!catName.trim()) {
            toast.error('Category Name is required');
            return;
        }
        if (!catSlug.trim()) {
            toast.error('Category Slug is required');
            return;
        }

        const categoryData = {
            categoryId: catId.trim(),
            name: catName.trim(),
            slug: catSlug.trim(),
            description: catDesc.trim() || undefined,
            status: catStatus,
            sortOrder: Number(catSortOrder) || 0,
            imageUrl: imagePreview && !imageFile ? imagePreview : (imagePreview === '' ? null : undefined)
        };

        if (editingCategory) {
            updateMutation.mutate({ id: editingCategory.id, data: categoryData, imageFile: imageFile || undefined });
        } else {
            createMutation.mutate({ data: categoryData, imageFile: imageFile || undefined });
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Are you sure you want to delete category "${name}"?`)) {
            deleteMutation.mutate(id);
        }
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl border-gold/20 shadow-2xl p-0 overflow-hidden bg-white max-h-[85vh] flex flex-col">
                <DialogHeader className="border-b border-gold/15 px-5 py-3.5 shrink-0 flex flex-row items-center justify-between">
                    <DialogTitle className="text-base font-bold font-serif text-maroon flex items-center gap-2">
                        <FolderPlus className="h-4 w-4 text-maroon" />
                        Manage Product Categories
                    </DialogTitle>
                </DialogHeader>

                {isFormOpen ? (
                    /* ── ADD/EDIT FORM VIEW ──────────────────────────────── */
                    <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
                        <div className="flex items-center gap-2 text-maroon font-bold text-xs cursor-pointer hover:underline mb-2" onClick={() => setIsFormOpen(false)}>
                            <ArrowLeft className="h-3.5 w-3.5" /> Back to category list
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-maroon uppercase tracking-wider">Category Name *</label>
                                <Input
                                    value={catName}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    placeholder="e.g. Banarasi Silk"
                                    required
                                    className="border-gold/30 focus-visible:ring-maroon h-9 text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-maroon uppercase tracking-wider">Category ID *</label>
                                <Input
                                    value={catId}
                                    onChange={(e) => setCatId(e.target.value)}
                                    placeholder="e.g. banarasi_silk"
                                    required
                                    className="border-gold/30 focus-visible:ring-maroon h-9 text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-maroon uppercase tracking-wider">URL Slug *</label>
                                <Input
                                    value={catSlug}
                                    onChange={(e) => setCatSlug(e.target.value)}
                                    placeholder="e.g. banarasi-silk"
                                    required
                                    className="border-gold/30 focus-visible:ring-maroon h-9 text-xs font-mono"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-maroon uppercase tracking-wider">Status</label>
                                    <select
                                        value={catStatus}
                                        onChange={(e) => setCatStatus(e.target.value as any)}
                                        className="w-full h-9 text-xs rounded-md border border-gold/30 px-2 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-maroon"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-maroon uppercase tracking-wider">Sort Order</label>
                                    <Input
                                        type="number"
                                        value={catSortOrder}
                                        onChange={(e) => setCatSortOrder(parseInt(e.target.value) || 0)}
                                        className="border-gold/30 focus-visible:ring-maroon h-9 text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-maroon uppercase tracking-wider">Description</label>
                            <Textarea
                                value={catDesc}
                                onChange={(e) => setCatDesc(e.target.value)}
                                placeholder="Describe this category..."
                                className="border-gold/30 focus-visible:ring-maroon min-h-[80px] text-xs"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-maroon uppercase tracking-wider block">Category Image</label>
                            <div className="flex items-center gap-4 border border-dashed border-gold/30 rounded-md p-3 bg-slate-50/50">
                                {imagePreview ? (
                                    <div className="relative w-16 h-16 border border-gold/20 rounded overflow-hidden shrink-0 bg-white">
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setImageFile(null);
                                                setImagePreview('');
                                            }}
                                            className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-650 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 border border-dashed border-gold/20 rounded flex items-center justify-center shrink-0 bg-white text-gray-400">
                                        <FolderPlus className="h-5 w-5" />
                                    </div>
                                )}
                                <div className="space-y-1.5 flex-1">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="h-8 text-xs border-gold/30 file:text-xs file:bg-maroon/5 file:text-maroon file:border-0 file:rounded-md file:px-2 file:py-0.5 hover:file:bg-maroon/10 focus-visible:ring-maroon"
                                    />
                                    <p className="text-[9px] text-gray-400">Supported formats: JPG, PNG, WEBP. Image will be compressed before upload.</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t border-gold/10">
                            <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} className="h-9 text-xs font-bold">
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-maroon hover:bg-maroon-dark text-gold border-2 border-gold/20 h-9 text-xs px-6 font-bold" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                                {editingCategory ? 'Update Category' : 'Save Category'}
                            </Button>
                        </div>
                    </form>
                ) : (
                    /* ── LIST VIEW ───────────────────────────────────────── */
                    <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-white">
                        <div className="p-4 shrink-0 flex items-center justify-between bg-cream/10 border-b border-gold/10">
                            <span className="text-[10px] uppercase font-bold text-maroon tracking-wider">
                                {categories?.length || 0} Categories Available
                            </span>
                            <Button
                                onClick={handleAddNew}
                                size="sm"
                                className="bg-maroon hover:bg-maroon-dark text-gold border-2 border-gold/20 text-[10px] h-7 font-bold gap-1.5"
                            >
                                <Plus className="h-3 w-3" /> ADD NEW CATEGORY
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 text-maroon/50 italic text-xs gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Loading categories...
                                </div>
                            ) : !categories || categories.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400 italic text-xs gap-1.5">
                                    <AlertCircle className="h-5 w-5 text-gray-300" />
                                    No categories defined yet.
                                </div>
                            ) : (
                                <div className="border border-gold/10 rounded-lg overflow-hidden">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-cream/15 border-b border-gold/10 font-bold text-[10px] text-maroon uppercase tracking-wider">
                                                <th className="p-2.5">Name</th>
                                                <th className="p-2.5">ID / Code</th>
                                                <th className="p-2.5 text-center">Status</th>
                                                <th className="p-2.5 text-center">Sort</th>
                                                <th className="p-2.5 text-right pr-4">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gold/5">
                                            {categories.map((cat) => (
                                                <tr key={cat.id} className="hover:bg-cream/5 transition-colors">
                                                    <td className="p-2.5 font-semibold text-gray-800">
                                                        <div className="flex items-center gap-2">
                                                            {cat.imageUrl ? (
                                                                <img src={cat.imageUrl} alt={cat.name} className="w-8 h-8 object-cover rounded border border-gold/20" />
                                                            ) : (
                                                                <div className="w-8 h-8 bg-slate-100 rounded border border-gold/10 flex items-center justify-center text-[9px] font-bold text-gray-400">
                                                                    N/A
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div>{cat.name}</div>
                                                                {cat.description && (
                                                                    <div className="text-[10px] text-gray-400 font-normal truncate max-w-[200px]" title={cat.description}>
                                                                        {cat.description}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-2.5 font-mono text-gray-500 text-[11px]">{cat.categoryId}</td>
                                                    <td className="p-2.5 text-center">
                                                        <span className={cn(
                                                            "inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border",
                                                            cat.status === 'active' 
                                                                ? "bg-green-50 text-green-700 border-green-150" 
                                                                : "bg-gray-50 text-gray-500 border-gray-200"
                                                        )}>
                                                            {cat.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-2.5 text-center font-mono text-[11px] text-gray-500">{cat.sortOrder}</td>
                                                    <td className="p-2.5 text-right pr-4">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => handleEdit(cat)}
                                                                className="p-1 rounded text-maroon hover:bg-gold/10 transition-colors"
                                                                title="Edit Category"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(cat.id, cat.name)}
                                                                className="p-1 rounded text-red-600 hover:bg-red-50 transition-colors"
                                                                title="Delete Category"
                                                                disabled={deleteMutation.isPending}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
