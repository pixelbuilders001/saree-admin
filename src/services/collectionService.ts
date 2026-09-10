import { supabase } from '@/lib/supabase';
import type { Collection, CollectionRule, CollectionType } from '@/types/homepage';

export interface CreateCollectionInput {
    name: string;
    description?: string | null;
    collectionType: CollectionType;
    rules?: CollectionRule[];
    sortBy?: string;
    productLimit?: number;
    isActive?: boolean;
    productIds?: string[];
}

export interface UpdateCollectionInput {
    name?: string;
    description?: string | null;
    collectionType?: CollectionType;
    rules?: CollectionRule[];
    sortBy?: string;
    productLimit?: number;
    isActive?: boolean;
    productIds?: string[];
}

export interface PreviewProduct {
    id: string;
    sareeName: string;
    sellingPrice: number;
    stock: number;
    category: string;
    fabric?: string;
    color?: string;
    occasion?: string;
    discountPercentage?: number;
    imageUrl?: string;
}

interface CollectionRow {
    id: string;
    name: string;
    description?: string | null;
    collection_type: string;
    rules: CollectionRule[];
    sort_by?: string;
    product_limit?: number;
    is_active?: boolean;
    created_at: string;
    updated_at: string;
}

interface InventoryProductRow {
    id: string;
    saree_name: string;
    selling_price?: number;
    stock?: number;
    category?: string;
    fabric?: string;
    color?: string;
    occasion?: string;
    discount_percentage?: number;
    inventory_images?: {
        image_url: string;
        is_primary?: boolean;
        sort_order?: number;
    }[];
}

const mapCollectionRow = (row: CollectionRow): Collection => ({
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    collectionType: (row.collection_type as CollectionType) || 'automatic',
    rules: Array.isArray(row.rules) ? row.rules : [],
    sortBy: row.sort_by || 'newest',
    productLimit: Number(row.product_limit ?? 8),
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

export const collectionService = {
    getCollections: async (): Promise<Collection[]> => {
        const { data, error } = await supabase
            .from('collections')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const collections = ((data || []) as unknown as CollectionRow[]).map(mapCollectionRow);

        // Fetch manual product counts
        const manualCollectionIds = collections
            .filter(c => c.collectionType === 'manual')
            .map(c => c.id);

        const manualCounts: Record<string, number> = {};
        if (manualCollectionIds.length > 0) {
            const { data: countData, error: countErr } = await supabase
                .from('collection_products')
                .select('collection_id');

            if (!countErr && countData) {
                (countData as { collection_id: string }[]).forEach((row) => {
                    manualCounts[row.collection_id] = (manualCounts[row.collection_id] || 0) + 1;
                });
            }
        }

        // Assign counts
        return collections.map(c => {
            if (c.collectionType === 'manual') {
                return { ...c, productCount: manualCounts[c.id] || 0 };
            }
            return c;
        });
    },

    getCollectionById: async (id: string): Promise<{ collection: Collection; products: PreviewProduct[] }> => {
        const { data, error } = await supabase
            .from('collections')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) throw new Error('Collection not found');

        const collection = mapCollectionRow(data as unknown as CollectionRow);
        let products: PreviewProduct[] = [];

        if (collection.collectionType === 'manual') {
            const { data: cpData, error: cpErr } = await supabase
                .from('collection_products')
                .select('product_id, sort_order')
                .eq('collection_id', id)
                .order('sort_order', { ascending: true });

            if (!cpErr && cpData && cpData.length > 0) {
                const typedCpData = cpData as { product_id: string; sort_order: number }[];
                const productIds = typedCpData.map((cp) => cp.product_id);
                const { data: invData, error: invErr } = await supabase
                    .from('inventory')
                    .select('id, saree_name, selling_price, stock, category, fabric, color, occasion, discount_percentage, inventory_images(image_url, is_primary, sort_order)')
                    .in('id', productIds);

                if (!invErr && invData) {
                    const typedInvData = invData as unknown as InventoryProductRow[];
                    const invMap = new Map(typedInvData.map((item) => [item.id, item]));
                    products = typedCpData.map((cp) => {
                        const item = invMap.get(cp.product_id);
                        if (!item) return null;
                        const primaryImg = (item.inventory_images || []).find((img) => img.is_primary) || item.inventory_images?.[0];
                        return {
                            id: item.id,
                            sareeName: item.saree_name,
                            sellingPrice: Number(item.selling_price || 0),
                            stock: Number(item.stock || 0),
                            category: item.category || '',
                            fabric: item.fabric || '',
                            color: item.color || '',
                            occasion: item.occasion || '',
                            discountPercentage: Number(item.discount_percentage || 0),
                            imageUrl: primaryImg?.image_url || '',
                        };
                    }).filter(Boolean) as PreviewProduct[];
                }
            }
        } else {
            // Evaluate rules for preview
            products = await collectionService.evaluateAutomaticPreview(
                collection.rules,
                collection.sortBy,
                collection.productLimit
            );
        }

        return { collection, products };
    },

    createCollection: async (input: CreateCollectionInput): Promise<Collection> => {
        const { data, error } = await supabase
            .from('collections')
            .insert([{
                name: input.name.trim(),
                description: input.description?.trim() || null,
                collection_type: input.collectionType,
                rules: input.collectionType === 'automatic' ? (input.rules || []) : [],
                sort_by: input.sortBy || 'newest',
                product_limit: Number(input.productLimit || 8),
                is_active: input.isActive ?? true,
            }])
            .select()
            .single();

        if (error) throw error;
        const created = mapCollectionRow(data as unknown as CollectionRow);

        // If manual collection and productIds provided, save to collection_products
        if (input.collectionType === 'manual' && input.productIds && input.productIds.length > 0) {
            const rows = input.productIds.map((pid, idx) => ({
                collection_id: created.id,
                product_id: pid,
                sort_order: idx,
            }));

            const { error: cpErr } = await supabase
                .from('collection_products')
                .insert(rows);

            if (cpErr) {
                console.error("Failed to insert collection_products:", cpErr);
            }
        }

        return created;
    },

    updateCollection: async (id: string, input: UpdateCollectionInput): Promise<Collection> => {
        const payload: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (input.name !== undefined) payload.name = input.name.trim();
        if (input.description !== undefined) payload.description = input.description?.trim() || null;
        if (input.collectionType !== undefined) payload.collection_type = input.collectionType;
        if (input.rules !== undefined) payload.rules = input.rules;
        if (input.sortBy !== undefined) payload.sort_by = input.sortBy;
        if (input.productLimit !== undefined) payload.product_limit = Number(input.productLimit);
        if (input.isActive !== undefined) payload.is_active = input.isActive;

        const { data, error } = await supabase
            .from('collections')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        const updated = mapCollectionRow(data as unknown as CollectionRow);

        // If manual collection, update collection_products
        if (input.collectionType === 'manual' && input.productIds !== undefined) {
            // Delete old mappings
            await supabase.from('collection_products').delete().eq('collection_id', id);

            if (input.productIds.length > 0) {
                const rows = input.productIds.map((pid, idx) => ({
                    collection_id: id,
                    product_id: pid,
                    sort_order: idx,
                }));
                const { error: cpErr } = await supabase.from('collection_products').insert(rows);
                if (cpErr) console.error("Failed to update collection_products:", cpErr);
            }
        }

        return updated;
    },

    deleteCollection: async (id: string): Promise<void> => {
        // Delete related collection_products first
        await supabase.from('collection_products').delete().eq('collection_id', id);
        
        // Delete collection itself
        const { error } = await supabase
            .from('collections')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    evaluateAutomaticPreview: async (
        rules: CollectionRule[],
        sortBy: string = 'newest',
        limit: number = 8
    ): Promise<PreviewProduct[]> => {
        let query = supabase
            .from('inventory')
            .select('id, saree_name, selling_price, stock, category, fabric, color, occasion, status, discount_percentage, inventory_images(image_url, is_primary, sort_order)');

        // Apply rules
        for (const rule of rules) {
            if (!rule.field || rule.value === undefined || rule.value === '') continue;

            const val = typeof rule.value === 'string' ? rule.value.trim() : rule.value;

            switch (rule.operator) {
                case 'eq':
                    query = query.eq(rule.field, val);
                    break;
                case 'neq':
                    query = query.neq(rule.field, val);
                    break;
                case 'gt':
                    query = query.gt(rule.field, Number(val));
                    break;
                case 'gte':
                    query = query.gte(rule.field, Number(val));
                    break;
                case 'lt':
                    query = query.lt(rule.field, Number(val));
                    break;
                case 'lte':
                    query = query.lte(rule.field, Number(val));
                    break;
                case 'contains':
                    query = query.ilike(rule.field, `%${val}%`);
                    break;
            }
        }

        // Apply sorting matching database constraint: newest, oldest, price_low, price_high, discount
        switch (sortBy) {
            case 'newest':
                query = query.order('created_at', { ascending: false });
                break;
            case 'oldest':
                query = query.order('created_at', { ascending: true });
                break;
            case 'price_low':
            case 'price_asc':
                query = query.order('selling_price', { ascending: true });
                break;
            case 'price_high':
            case 'price_desc':
                query = query.order('selling_price', { ascending: false });
                break;
            case 'discount':
            case 'discount_desc':
                query = query.order('discount_percentage', { ascending: false, nullsFirst: false });
                break;
            default:
                query = query.order('created_at', { ascending: false });
        }

        query = query.limit(Math.min(limit || 8, 50));

        const { data, error } = await query;
        if (error) throw error;

        const typedData = (data || []) as unknown as InventoryProductRow[];
        return typedData.map((item) => {
            const primaryImg = (item.inventory_images || []).find((img) => img.is_primary) || item.inventory_images?.[0];
            return {
                id: item.id,
                sareeName: item.saree_name,
                sellingPrice: Number(item.selling_price || 0),
                stock: Number(item.stock || 0),
                category: item.category || '',
                fabric: item.fabric || '',
                color: item.color || '',
                occasion: item.occasion || '',
                discountPercentage: Number(item.discount_percentage || 0),
                imageUrl: primaryImg?.image_url || '',
            };
        });
    },

    searchProducts: async (searchQuery: string): Promise<PreviewProduct[]> => {
        let query = supabase
            .from('inventory')
            .select('id, saree_name, selling_price, stock, category, fabric, color, occasion, discount_percentage, inventory_images(image_url, is_primary, sort_order)')
            .eq('status', 'active');

        if (searchQuery.trim()) {
            const term = searchQuery.trim();
            query = query.or(`saree_name.ilike.%${term}%,category.ilike.%${term}%,fabric.ilike.%${term}%,sku.ilike.%${term}%`);
        }

        query = query.order('created_at', { ascending: false }).limit(30);

        const { data, error } = await query;
        if (error) throw error;

        const typedData = (data || []) as unknown as InventoryProductRow[];
        return typedData.map((item) => {
            const primaryImg = (item.inventory_images || []).find((img) => img.is_primary) || item.inventory_images?.[0];
            return {
                id: item.id,
                sareeName: item.saree_name,
                sellingPrice: Number(item.selling_price || 0),
                stock: Number(item.stock || 0),
                category: item.category || '',
                fabric: item.fabric || '',
                color: item.color || '',
                occasion: item.occasion || '',
                discountPercentage: Number(item.discount_percentage || 0),
                imageUrl: primaryImg?.image_url || '',
            };
        });
    }
};
