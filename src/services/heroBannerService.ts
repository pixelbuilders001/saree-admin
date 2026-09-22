import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/imageCompressor';
import { uploadToImageKit } from '@/services/imagekitService';
import { collectionService } from '@/services/collectionService';

export type DestinationType = 'collection' | 'product' | 'custom';

export interface HeroBanner {
    id: string;
    eyebrow: string | null;
    title: string | null;
    subtitle: string | null;
    imageUrl: string | null;
    mobileImageUrl: string | null;
    buttonText: string | null;
    buttonLink: string | null;
    collectionId?: string | null;
    destinationType?: DestinationType;
    collectionName?: string | null;
    productCount?: number;
    isActive: boolean;
    sortOrder: number;
    startAt: string | null;
    endAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface SaveBannerInput {
    eyebrow?: string | null;
    title?: string | null;
    subtitle?: string | null;
    buttonText?: string | null;
    buttonLink?: string | null;
    collectionId?: string | null;
    productIds?: string[];
    isActive: boolean;
    sortOrder: number;
    startAt?: string | null;
    endAt?: string | null;
}

const BUCKET = 'hero-banners';

export const extractCollectionIdFromLink = (link: string | null): string | null => {
    if (!link) return null;
    const match = link.match(/^\/collections\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
};

export const detectDestinationType = (link: string | null, collectionId?: string | null): DestinationType => {
    if (collectionId || (link && link.startsWith('/collections/'))) return 'collection';
    if (link && link.startsWith('/product/')) return 'product';
    return 'custom';
};

const mapRow = (row: any): HeroBanner => {
    const rawColId = row.collection_id ?? null;
    const inferredColId = rawColId || extractCollectionIdFromLink(row.button_link);
    const destType = detectDestinationType(row.button_link, inferredColId);

    return {
        id: row.id,
        eyebrow: row.eyebrow ?? null,
        title: row.title ?? null,
        subtitle: row.subtitle ?? null,
        imageUrl: row.image_url ?? null,
        mobileImageUrl: row.mobile_image_url ?? null,
        buttonText: row.button_text ?? null,
        buttonLink: row.button_link ?? null,
        collectionId: inferredColId,
        destinationType: destType,
        isActive: row.is_active ?? false,
        sortOrder: Number(row.sort_order ?? 0),
        startAt: row.start_at ?? null,
        endAt: row.end_at ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
};

export const heroBannerService = {
    getBanners: async (): Promise<HeroBanner[]> => {
        const { data, error } = await supabase
            .from('hero_banners')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;
        const banners = (data || []).map(mapRow);

        // Enrich banners with collection name and product count
        try {
            const collectionIds = banners
                .map(b => b.collectionId)
                .filter((id): id is string => Boolean(id));

            if (collectionIds.length > 0) {
                const uniqueColIds = Array.from(new Set(collectionIds));
                const { data: cols } = await supabase
                    .from('collections')
                    .select('id, name, collection_type')
                    .in('id', uniqueColIds);

                // Fetch counts for manual collections
                const { data: cpData } = await supabase
                    .from('collection_products')
                    .select('collection_id')
                    .in('collection_id', uniqueColIds);

                const countMap: Record<string, number> = {};
                (cpData || []).forEach((cp: any) => {
                    countMap[cp.collection_id] = (countMap[cp.collection_id] || 0) + 1;
                });

                const colMap = new Map((cols || []).map((c: any) => [c.id, c]));

                return banners.map(b => {
                    if (b.collectionId && colMap.has(b.collectionId)) {
                        const col = colMap.get(b.collectionId);
                        return {
                            ...b,
                            collectionName: col?.name,
                            productCount: countMap[b.collectionId] ?? 0,
                        };
                    }
                    return b;
                });
            }
        } catch (enrichErr) {
            console.warn('Failed to enrich hero banners with collection info:', enrichErr);
        }

        return banners;
    },

    uploadImage: async (file: File, isMobile: boolean = false): Promise<string> => {
        const maxDim = isMobile ? 1600 : 2400;
        const compressed = await compressImage(file, 800, maxDim, 'image/webp');
        const prefix = isMobile ? 'banner_mobile_' : 'banner_';
        const fileName = `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 10)}.webp`;

        const result = await uploadToImageKit(compressed, fileName, '/hero-banners');
        return result.url;
    },

    deleteImageByUrl: async (url: string): Promise<void> => {
        if (!url) return;
        try {
            if (url.includes('supabase') || url.includes(`/${BUCKET}/`)) {
                const prefix = `/${BUCKET}/`;
                const idx = url.indexOf(prefix);
                if (idx !== -1) {
                    const filePath = decodeURIComponent(url.substring(idx + prefix.length));
                    await supabase.storage.from(BUCKET).remove([filePath]);
                }
            }
        } catch (err) {
            console.error('Failed to delete hero banner image from storage:', err);
        }
    },

    createBanner: async (
        fields: SaveBannerInput,
        imageFile?: File,
        mobileImageFile?: File
    ): Promise<HeroBanner> => {
        let imageUrl: string | null = null;
        let mobileImageUrl: string | null = null;

        try {
            if (imageFile) {
                imageUrl = await heroBannerService.uploadImage(imageFile, false);
            }
            if (mobileImageFile) {
                mobileImageUrl = await heroBannerService.uploadImage(mobileImageFile, true);
            }

            let effectiveCollectionId = fields.collectionId || null;
            let effectiveButtonLink = fields.buttonLink || null;

            // If productIds are provided, create a dedicated manual collection
            if (fields.productIds && fields.productIds.length > 0) {
                if (effectiveCollectionId) {
                    await collectionService.updateCollection(effectiveCollectionId, {
                        name: fields.title?.trim() || 'Hero Banner Collection',
                        collectionType: 'manual',
                        productIds: fields.productIds,
                        productLimit: fields.productIds.length,
                    });
                } else {
                    const createdCol = await collectionService.createCollection({
                        name: fields.title?.trim() || 'Hero Banner Collection',
                        description: 'Curated sarees for hero banner',
                        collectionType: 'manual',
                        productIds: fields.productIds,
                        productLimit: fields.productIds.length,
                    });
                    effectiveCollectionId = createdCol.id;
                }
                effectiveButtonLink = `/collections/${effectiveCollectionId}`;
            } else if (effectiveCollectionId) {
                effectiveButtonLink = `/collections/${effectiveCollectionId}`;
            }

            const insertPayload: any = {
                eyebrow: fields.eyebrow || null,
                title: fields.title || null,
                subtitle: fields.subtitle || null,
                image_url: imageUrl,
                mobile_image_url: mobileImageUrl,
                button_text: fields.buttonText || null,
                button_link: effectiveButtonLink,
                is_active: fields.isActive,
                sort_order: fields.sortOrder,
                start_at: fields.startAt || null,
                end_at: fields.endAt || null,
            };

            if (effectiveCollectionId) {
                insertPayload.collection_id = effectiveCollectionId;
            }

            let { data, error } = await supabase
                .from('hero_banners')
                .insert([insertPayload])
                .select()
                .single();

            // Graceful fallback if collection_id column does not exist in table
            if (error && error.message && error.message.includes('collection_id')) {
                delete insertPayload.collection_id;
                const retry = await supabase
                    .from('hero_banners')
                    .insert([insertPayload])
                    .select()
                    .single();
                data = retry.data;
                error = retry.error;
            }

            if (error) throw error;
            return mapRow(data);
        } catch (err) {
            if (imageUrl) await heroBannerService.deleteImageByUrl(imageUrl);
            if (mobileImageUrl) await heroBannerService.deleteImageByUrl(mobileImageUrl);
            throw err;
        }
    },

    updateBanner: async (
        id: string,
        fields: Partial<SaveBannerInput> & { imageUrl?: string | null; mobileImageUrl?: string | null },
        imageFile?: File,
        oldImageUrl?: string | null,
        mobileImageFile?: File,
        oldMobileImageUrl?: string | null
    ): Promise<HeroBanner> => {
        let imageUrl = fields.imageUrl !== undefined ? fields.imageUrl : undefined;
        let mobileImageUrl = fields.mobileImageUrl !== undefined ? fields.mobileImageUrl : undefined;

        if (imageFile) {
            if (oldImageUrl) await heroBannerService.deleteImageByUrl(oldImageUrl);
            imageUrl = await heroBannerService.uploadImage(imageFile, false);
        }

        if (mobileImageFile) {
            if (oldMobileImageUrl) await heroBannerService.deleteImageByUrl(oldMobileImageUrl);
            mobileImageUrl = await heroBannerService.uploadImage(mobileImageFile, true);
        }

        let effectiveCollectionId = fields.collectionId !== undefined ? fields.collectionId : undefined;
        let effectiveButtonLink = fields.buttonLink !== undefined ? fields.buttonLink : undefined;

        // If productIds are specified for a collection
        if (fields.productIds !== undefined) {
            if (fields.productIds.length > 0) {
                if (effectiveCollectionId) {
                    await collectionService.updateCollection(effectiveCollectionId, {
                        name: fields.title?.trim() || 'Hero Banner Collection',
                        collectionType: 'manual',
                        productIds: fields.productIds,
                        productLimit: fields.productIds.length,
                    });
                } else {
                    const createdCol = await collectionService.createCollection({
                        name: fields.title?.trim() || 'Hero Banner Collection',
                        description: 'Curated sarees for hero banner',
                        collectionType: 'manual',
                        productIds: fields.productIds,
                        productLimit: fields.productIds.length,
                    });
                    effectiveCollectionId = createdCol.id;
                }
                effectiveButtonLink = `/collections/${effectiveCollectionId}`;
            }
        } else if (effectiveCollectionId) {
            effectiveButtonLink = `/collections/${effectiveCollectionId}`;
        }

        const updatePayload: any = { updated_at: new Date().toISOString() };
        if (fields.eyebrow !== undefined) updatePayload.eyebrow = fields.eyebrow || null;
        if (fields.title !== undefined) updatePayload.title = fields.title || null;
        if (fields.subtitle !== undefined) updatePayload.subtitle = fields.subtitle || null;
        if (fields.buttonText !== undefined) updatePayload.button_text = fields.buttonText || null;
        if (effectiveButtonLink !== undefined) updatePayload.button_link = effectiveButtonLink || null;
        if (effectiveCollectionId !== undefined) updatePayload.collection_id = effectiveCollectionId || null;
        if (fields.isActive !== undefined) updatePayload.is_active = fields.isActive;
        if (fields.sortOrder !== undefined) updatePayload.sort_order = fields.sortOrder;
        if (fields.startAt !== undefined) updatePayload.start_at = fields.startAt || null;
        if (fields.endAt !== undefined) updatePayload.end_at = fields.endAt || null;
        if (imageUrl !== undefined) updatePayload.image_url = imageUrl;
        if (mobileImageUrl !== undefined) updatePayload.mobile_image_url = mobileImageUrl;

        let { data, error } = await supabase
            .from('hero_banners')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        // Graceful fallback if collection_id column does not exist in table
        if (error && error.message && error.message.includes('collection_id')) {
            delete updatePayload.collection_id;
            const retry = await supabase
                .from('hero_banners')
                .update(updatePayload)
                .eq('id', id)
                .select()
                .single();
            data = retry.data;
            error = retry.error;
        }

        if (error) throw error;
        return mapRow(data);
    },

    toggleActive: async (id: string, isActive: boolean): Promise<HeroBanner> => {
        const { data, error } = await supabase
            .from('hero_banners')
            .update({ is_active: isActive, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return mapRow(data);
    },

    deleteBanner: async (id: string, imageUrl?: string | null, mobileImageUrl?: string | null): Promise<void> => {
        if (imageUrl) await heroBannerService.deleteImageByUrl(imageUrl);
        if (mobileImageUrl) await heroBannerService.deleteImageByUrl(mobileImageUrl);

        const { error } = await supabase.from('hero_banners').delete().eq('id', id);
        if (error) throw error;
    },
};
