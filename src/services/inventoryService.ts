import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { compressImage } from '@/lib/imageCompressor';

export interface SareeImage {
    id: string;
    inventoryId: string;
    imageUrl: string;
    storageKey?: string;
    isPrimary: boolean;
    sortOrder: number;
    createdAt?: string;
}

export interface Saree {
    id: string;
    sareeName: string;
    category: string;
    categoryId?: string;
    designCode?: string;
    hsnCode?: string;
    sku?: string;
    description?: string;
    fabric: string;
    color: string;
    purchasePrice: number;
    sellingPrice: number;
    stock: number;
    rackNo: string;
    barcode: string;
    addedDate: string;
    status: 'active' | 'inactive';
    createdBy?: string;
    updatedBy?: string;
    images?: SareeImage[];
    mrp?: number;
    discountAmount?: number;
    discountPercentage?: number;
}

export const inventoryService = {
    getSarees: async (): Promise<Saree[]> => {
        const { data, error } = await supabase
            .from('inventory')
            .select('*, inventory_images(*)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((item: any) => ({
            id: item.id,
            sareeName: item.saree_name,
            category: item.category,
            categoryId: item.category_id || '',
            designCode: item.design_code || '',
            hsnCode: item.hsn_code || '',
            sku: item.sku || '',
            description: item.description || '',
            fabric: item.fabric,
            color: item.color,
            purchasePrice: Number(item.purchase_price),
            sellingPrice: Number(item.selling_price),
            stock: Number(item.stock),
            rackNo: item.rack_no || '',
            barcode: item.barcode || '',
            addedDate: item.created_at,
            status: item.status as 'active' | 'inactive',
            createdBy: item.created_by || '',
            updatedBy: item.updated_by || '',
            mrp: item.mrp ? Number(item.mrp) : 0,
            discountAmount: item.discount_amount ? Number(item.discount_amount) : 0,
            discountPercentage: item.discount_percentage ? Number(item.discount_percentage) : 0,
            images: (item.inventory_images || []).map((img: any) => ({
                id: img.id,
                inventoryId: img.inventory_id,
                imageUrl: img.image_url,
                storageKey: img.storage_key,
                isPrimary: img.is_primary,
                sortOrder: img.sort_order,
                createdAt: img.created_at
            })).sort((a: any, b: any) => a.sortOrder - b.sortOrder)
        }));
    },

    getSareeById: async (id: string): Promise<Saree> => {
        const { data, error } = await supabase
            .from('inventory')
            .select('*, inventory_images(*)')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) throw new Error('Saree not found');

        return {
            id: data.id,
            sareeName: data.saree_name,
            category: data.category,
            categoryId: data.category_id || '',
            designCode: data.design_code || '',
            hsnCode: data.hsn_code || '',
            sku: data.sku || '',
            description: data.description || '',
            fabric: data.fabric,
            color: data.color,
            purchasePrice: Number(data.purchase_price),
            sellingPrice: Number(data.selling_price),
            stock: Number(data.stock),
            rackNo: data.rack_no || '',
            barcode: data.barcode || '',
            addedDate: data.created_at,
            status: data.status as 'active' | 'inactive',
            createdBy: data.created_by || '',
            updatedBy: data.updated_by || '',
            mrp: data.mrp ? Number(data.mrp) : 0,
            discountAmount: data.discount_amount ? Number(data.discount_amount) : 0,
            discountPercentage: data.discount_percentage ? Number(data.discount_percentage) : 0,
            images: (data.inventory_images || []).map((img: any) => ({
                id: img.id,
                inventoryId: img.inventory_id,
                imageUrl: img.image_url,
                storageKey: img.storage_key,
                isPrimary: img.is_primary,
                sortOrder: img.sort_order,
                createdAt: img.created_at
            })).sort((a: any, b: any) => a.sortOrder - b.sortOrder)
        };
    },

    createSaree: async (
        saree: Omit<Saree, 'id' | 'addedDate'>,
        imageFiles?: { file: File; isPrimary: boolean }[]
    ): Promise<Saree> => {
        // Generate a random ID (e.g. S-XXXX) for standard inventory item
        const randId = 'S' + Math.floor(1000 + Math.random() * 9000);
        const userEmail = useAuthStore.getState().user?.email || 'system';
        const newSaree = {
            id: randId,
            saree_name: saree.sareeName,
            category: saree.category,
            category_id: saree.categoryId || null,
            design_code: saree.designCode ? saree.designCode.trim().toUpperCase() : null,
            hsn_code: saree.hsnCode ? saree.hsnCode.trim() : null,
            sku: saree.sku || null,
            description: saree.description || null,
            fabric: saree.fabric,
            color: saree.color,
            purchase_price: saree.purchasePrice,
            selling_price: saree.sellingPrice,
            stock: saree.stock,
            rack_no: saree.rackNo,
            barcode: saree.barcode || randId,
            status: saree.status || 'active',
            created_by: userEmail,
            updated_by: userEmail,
            mrp: saree.mrp || 0,
            discount_amount: saree.discountAmount || 0,
            discount_percentage: saree.discountPercentage || 0,
        };

        const { data, error } = await supabase
            .from('inventory')
            .insert([newSaree])
            .select()
            .single();

        if (error) throw error;

        // Upload and associate images if any are provided
        const uploadedImages: SareeImage[] = [];
        if (imageFiles && imageFiles.length > 0) {
            try {
                for (let i = 0; i < imageFiles.length; i++) {
                    const imgFile = imageFiles[i];
                    // Compress image before uploading
                    const compressedFile = await compressImage(imgFile.file);
                    const fileExt = compressedFile.name.split('.').pop();
                    const fileName = `${data.id}/${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
                    const filePath = `${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('sbs-inventory-images')
                        .upload(filePath, compressedFile);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('sbs-inventory-images')
                        .getPublicUrl(filePath);

                    const { data: imgData, error: dbError } = await supabase
                        .from('inventory_images')
                        .insert([{
                            inventory_id: data.id,
                            image_url: publicUrl,
                            storage_key: filePath,
                            is_primary: imgFile.isPrimary,
                            sort_order: i
                        }])
                        .select()
                        .single();

                    if (dbError) throw dbError;

                    uploadedImages.push({
                        id: imgData.id,
                        inventoryId: imgData.inventory_id,
                        imageUrl: imgData.image_url,
                        storageKey: imgData.storage_key,
                        isPrimary: imgData.is_primary,
                        sortOrder: imgData.sort_order,
                        createdAt: imgData.created_at
                    });
                }
            } catch (imgErr: any) {
                // Rollback: Delete the newly created saree record so we don't leave a half-created product
                await supabase.from('inventory').delete().eq('id', data.id);
                throw new Error(`Failed to upload images: ${imgErr?.message || imgErr}`);
            }
        }

            return {
            id: data.id,
            sareeName: data.saree_name,
            category: data.category,
            categoryId: data.category_id || '',
            designCode: data.design_code || '',
            hsnCode: data.hsn_code || '',
            sku: data.sku || '',
            description: data.description || '',
            fabric: data.fabric,
            color: data.color,
            purchasePrice: Number(data.purchase_price),
            sellingPrice: Number(data.selling_price),
            stock: Number(data.stock),
            rackNo: data.rack_no || '',
            barcode: data.barcode || '',
            addedDate: data.created_at,
            status: data.status as 'active' | 'inactive',
            createdBy: data.created_by || '',
            updatedBy: data.updated_by || '',
            mrp: data.mrp ? Number(data.mrp) : 0,
            discountAmount: data.discount_amount ? Number(data.discount_amount) : 0,
            discountPercentage: data.discount_percentage ? Number(data.discount_percentage) : 0,
            images: uploadedImages
        };
    },

    updateSaree: async (
        id: string,
        saree: Partial<Saree>,
        imagesToUpload?: { file: File; isPrimary: boolean }[],
        imagesToDelete?: { id: string; storageKey?: string }[],
        primaryImageId?: string
    ): Promise<Saree> => {
        const updateData: any = {};
        if (saree.sareeName !== undefined) updateData.saree_name = saree.sareeName;
        if (saree.category !== undefined) updateData.category = saree.category;
        if (saree.categoryId !== undefined) updateData.category_id = saree.categoryId || null;
        if (saree.designCode !== undefined) updateData.design_code = saree.designCode ? saree.designCode.trim().toUpperCase() : null;
        if (saree.hsnCode !== undefined) updateData.hsn_code = saree.hsnCode ? saree.hsnCode.trim() : null;
        if (saree.sku !== undefined) updateData.sku = saree.sku || null;
        if (saree.description !== undefined) updateData.description = saree.description || null;
        if (saree.fabric !== undefined) updateData.fabric = saree.fabric;
        if (saree.color !== undefined) updateData.color = saree.color;
        if (saree.purchasePrice !== undefined) updateData.purchase_price = saree.purchasePrice;
        if (saree.sellingPrice !== undefined) updateData.selling_price = saree.sellingPrice;
        if (saree.stock !== undefined) updateData.stock = saree.stock;
        if (saree.rackNo !== undefined) updateData.rack_no = saree.rackNo;
        if (saree.barcode !== undefined) updateData.barcode = saree.barcode;
        if (saree.status !== undefined) updateData.status = saree.status;
        if (saree.mrp !== undefined) updateData.mrp = saree.mrp;
        if (saree.discountAmount !== undefined) updateData.discount_amount = saree.discountAmount;
        if (saree.discountPercentage !== undefined) updateData.discount_percentage = saree.discountPercentage;

        const userEmail = useAuthStore.getState().user?.email || 'system';
        updateData.updated_by = userEmail;

        const { data, error } = await supabase
            .from('inventory')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // 1. Delete requested images
        if (imagesToDelete && imagesToDelete.length > 0) {
            for (const img of imagesToDelete) {
                try {
                    await inventoryService.deleteImage(img.id, img.storageKey);
                } catch (e) {
                    console.error('Failed to delete image:', img.id, e);
                }
            }
        }

        // 2. Upload new images
        if (imagesToUpload && imagesToUpload.length > 0) {
            // Find max sort order of existing images to append correctly
            const { data: existingImgs } = await supabase
                .from('inventory_images')
                .select('sort_order')
                .eq('inventory_id', id);
            
            const maxSortOrder = existingImgs && existingImgs.length > 0
                ? Math.max(...existingImgs.map(img => img.sort_order || 0))
                : -1;

            try {
                for (let i = 0; i < imagesToUpload.length; i++) {
                    const imgFile = imagesToUpload[i];
                    // Compress image before uploading
                    const compressedFile = await compressImage(imgFile.file);
                    const fileExt = compressedFile.name.split('.').pop();
                    const fileName = `${id}/${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
                    const filePath = `${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('sbs-inventory-images')
                        .upload(filePath, compressedFile);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('sbs-inventory-images')
                        .getPublicUrl(filePath);

                    const { error: dbError } = await supabase
                        .from('inventory_images')
                        .insert([{
                            inventory_id: id,
                            image_url: publicUrl,
                            storage_key: filePath,
                            is_primary: imgFile.isPrimary,
                            sort_order: maxSortOrder + 1 + i
                        }]);

                    if (dbError) throw dbError;
                }
            } catch (imgErr: any) {
                throw new Error(`Failed to upload updated images: ${imgErr?.message || imgErr}`);
            }
        }

        // 3. Update primary image status if selected
        if (primaryImageId) {
            try {
                await inventoryService.updateImagePrimaryStatus(id, primaryImageId);
            } catch (e) {
                console.error('Failed to update primary image status:', e);
            }
        }

        // Fetch final list of images to return
        const { data: finalImages } = await supabase
            .from('inventory_images')
            .select('*')
            .eq('inventory_id', id)
            .order('sort_order', { ascending: true });

        const mappedImages = (finalImages || []).map((img: any) => ({
            id: img.id,
            inventoryId: img.inventory_id,
            imageUrl: img.image_url,
            storageKey: img.storage_key,
            isPrimary: img.is_primary,
            sortOrder: img.sort_order,
            createdAt: img.created_at
        }));

        // If there is no primary image anymore, make the first one primary automatically
        if (mappedImages.length > 0 && !mappedImages.some(img => img.isPrimary)) {
            const firstImg = mappedImages[0];
            firstImg.isPrimary = true;
            await supabase
                .from('inventory_images')
                .update({ is_primary: true })
                .eq('id', firstImg.id);
        }

        return {
            id: data.id,
            sareeName: data.saree_name,
            category: data.category,
            categoryId: data.category_id || '',
            designCode: data.design_code || '',
            sku: data.sku || '',
            description: data.description || '',
            fabric: data.fabric,
            color: data.color,
            purchasePrice: Number(data.purchase_price),
            sellingPrice: Number(data.selling_price),
            stock: Number(data.stock),
            rackNo: data.rack_no || '',
            barcode: data.barcode || '',
            addedDate: data.created_at,
            status: data.status as 'active' | 'inactive',
            createdBy: data.created_by || '',
            updatedBy: data.updated_by || '',
            mrp: data.mrp ? Number(data.mrp) : 0,
            discountAmount: data.discount_amount ? Number(data.discount_amount) : 0,
            discountPercentage: data.discount_percentage ? Number(data.discount_percentage) : 0,
            images: mappedImages
        };
    },

    deleteSaree: async (id: string): Promise<void> => {
        // Fetch storage keys for images of this saree first to clean up storage bucket
        const { data: images } = await supabase
            .from('inventory_images')
            .select('storage_key')
            .eq('inventory_id', id);

        if (images && images.length > 0) {
            const keys = images.map(img => img.storage_key).filter(Boolean) as string[];
            if (keys.length > 0) {
                const { error: storageError } = await supabase.storage
                    .from('sbs-inventory-images')
                    .remove(keys);
                if (storageError) console.error('Failed to remove images from storage bucket:', storageError);
            }
        }

        // Delete the saree, which cascade-deletes the inventory_images records
        const { error } = await supabase
            .from('inventory')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    uploadImage: async (file: File, inventoryId: string): Promise<SareeImage> => {
        // Compress image before uploading
        const compressedFile = await compressImage(file);
        const fileExt = compressedFile.name.split('.').pop();
        const fileName = `${inventoryId}/${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('sbs-inventory-images')
            .upload(filePath, compressedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('sbs-inventory-images')
            .getPublicUrl(filePath);

        const { data: imgData, error: dbError } = await supabase
            .from('inventory_images')
            .insert([{
                inventory_id: inventoryId,
                image_url: publicUrl,
                storage_key: filePath,
                is_primary: false,
                sort_order: 0
            }])
            .select()
            .single();

        if (dbError) throw dbError;

        return {
            id: imgData.id,
            inventoryId: imgData.inventory_id,
            imageUrl: imgData.image_url,
            storageKey: imgData.storage_key,
            isPrimary: imgData.is_primary,
            sortOrder: imgData.sort_order,
            createdAt: imgData.created_at
        };
    },

    deleteImage: async (imageId: string, storageKey?: string): Promise<void> => {
        if (storageKey) {
            const { error: storageError } = await supabase.storage
                .from('sbs-inventory-images')
                .remove([storageKey]);
            if (storageError) console.error('Error removing storage file:', storageError);
        }

        const { error: dbError } = await supabase
            .from('inventory_images')
            .delete()
            .eq('id', imageId);

        if (dbError) throw dbError;
    },

    updateImagePrimaryStatus: async (inventoryId: string, primaryImageId: string): Promise<void> => {
        // First set all images for this inventory to not primary
        const { error: error1 } = await supabase
            .from('inventory_images')
            .update({ is_primary: false })
            .eq('inventory_id', inventoryId);

        if (error1) throw error1;

        // Set the selected one as primary
        const { error: error2 } = await supabase
            .from('inventory_images')
            .update({ is_primary: true })
            .eq('id', primaryImageId);

        if (error2) throw error2;
    },

    updateImageOrder: async (images: { id: string; sortOrder: number }[]): Promise<void> => {
        for (const img of images) {
            await supabase
                .from('inventory_images')
                .update({ sort_order: img.sortOrder })
                .eq('id', img.id);
        }
    },

    bulkCreateSarees: async (rows: Omit<Saree, 'id' | 'addedDate'>[]): Promise<{ inserted: number; errors: string[] }> => {
        const userEmail = useAuthStore.getState().user?.email || 'system';
        const errors: string[] = [];
        const records: any[] = [];

        rows.forEach((row, idx) => {
            if (!row.sareeName || !row.category || !row.fabric || !row.color) {
                errors.push(`Row ${idx + 2}: Missing required field (name/category/fabric/color)`);
                return;
            }
            if (isNaN(Number(row.purchasePrice)) || isNaN(Number(row.sellingPrice))) {
                errors.push(`Row ${idx + 2}: Invalid price value`);
                return;
            }
            const randId = 'S' + Math.floor(1000 + Math.random() * 9000) + Math.floor(Math.random() * 9);
            records.push({
                id: randId,
                saree_name: String(row.sareeName).trim(),
                category: String(row.category).trim(),
                category_id: row.categoryId ? String(row.categoryId).trim() : null,
                design_code: row.designCode ? String(row.designCode).trim().toUpperCase() : null,
                hsn_code: row.hsnCode ? String(row.hsnCode).trim() : null,
                sku: row.sku ? String(row.sku).trim() : null,
                description: row.description ? String(row.description).trim() : null,
                fabric: String(row.fabric).trim(),
                color: String(row.color).trim(),
                purchase_price: Number(row.purchasePrice),
                selling_price: Number(row.sellingPrice),
                stock: Number(row.stock) || 0,
                rack_no: row.rackNo ? String(row.rackNo).trim() : null,
                barcode: row.barcode ? String(row.barcode).trim() : randId,
                status: row.status === 'inactive' ? 'inactive' : 'active',
                created_by: userEmail,
                updated_by: userEmail,
                mrp: row.mrp || Number(row.sellingPrice) || 0,
                discount_amount: row.discountAmount || 0,
                discount_percentage: row.discountPercentage || 0,
            });
        });

        if (records.length === 0) {
            return { inserted: 0, errors };
        }

        const { error } = await supabase.from('inventory').insert(records);
        if (error) throw error;

        return { inserted: records.length, errors };
    },

    assignCategoryToProducts: async (productIds: string[], categoryName: string, categoryId?: string): Promise<void> => {
        if (!productIds || productIds.length === 0) return;
        const userEmail = useAuthStore.getState().user?.email || 'system';
        const { error } = await supabase
            .from('inventory')
            .update({
                category: categoryName,
                category_id: categoryId || null,
                updated_by: userEmail,
            })
            .in('id', productIds);

        if (error) throw error;
    },
};

export interface Category {
    id: string;
    categoryId: string;
    name: string;
    slug: string;
    description?: string;
    imageUrl?: string | null;
    status: 'active' | 'inactive';
    sortOrder?: number;
    createdAt?: string;
    updatedAt?: string;
}

export const categoryService = {
    getCategories: async (): Promise<Category[]> => {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true });

        if (error) throw error;

        return (data || []).map((item: any) => ({
            id: item.id,
            categoryId: item.category_id,
            name: item.name,
            slug: item.slug,
            description: item.description || '',
            imageUrl: item.image_url || '',
            status: item.status as 'active' | 'inactive',
            sortOrder: item.sort_order || 0,
            createdAt: item.created_at,
            updatedAt: item.updated_at
        }));
    },

    createCategory: async (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>, imageFile?: File): Promise<Category> => {
        let imageUrl = category.imageUrl || null;

        if (imageFile) {
            const compressedFile = await compressImage(imageFile);
            const fileExt = compressedFile.name.split('.').pop();
            const fileName = `${category.categoryId}/${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('sbs-categories')
                .upload(filePath, compressedFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('sbs-categories')
                .getPublicUrl(filePath);

            imageUrl = publicUrl;
        }

        const { data, error } = await supabase
            .from('categories')
            .insert([{
                category_id: category.categoryId,
                name: category.name,
                slug: category.slug,
                description: category.description || null,
                image_url: imageUrl,
                status: category.status || 'active',
                sort_order: category.sortOrder || 0
            }])
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            categoryId: data.category_id,
            name: data.name,
            slug: data.slug,
            description: data.description || '',
            imageUrl: data.image_url || '',
            status: data.status as 'active' | 'inactive',
            sortOrder: data.sort_order || 0,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    },

    updateCategory: async (id: string, category: Partial<Category>, imageFile?: File): Promise<Category> => {
        const updateData: any = {};
        if (category.categoryId !== undefined) updateData.category_id = category.categoryId;
        if (category.name !== undefined) updateData.name = category.name;
        if (category.slug !== undefined) updateData.slug = category.slug;
        if (category.description !== undefined) updateData.description = category.description;
        if (category.status !== undefined) updateData.status = category.status;
        if (category.sortOrder !== undefined) updateData.sort_order = category.sortOrder;
        updateData.updated_at = new Date().toISOString();

        if (imageFile) {
            const catId = category.categoryId || (await supabase.from('categories').select('category_id').eq('id', id).single()).data?.category_id || 'category';
            const compressedFile = await compressImage(imageFile);
            const fileExt = compressedFile.name.split('.').pop();
            const fileName = `${catId}/${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('sbs-categories')
                .upload(filePath, compressedFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('sbs-categories')
                .getPublicUrl(filePath);

            updateData.image_url = publicUrl;
        } else if (category.imageUrl !== undefined) {
            updateData.image_url = category.imageUrl;
        }

        const { data, error } = await supabase
            .from('categories')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            categoryId: data.category_id,
            name: data.name,
            slug: data.slug,
            description: data.description || '',
            imageUrl: data.image_url || '',
            status: data.status as 'active' | 'inactive',
            sortOrder: data.sort_order || 0,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    },

    deleteCategory: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
