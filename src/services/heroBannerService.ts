import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/imageCompressor';

export interface HeroBanner {
    id: string;
    eyebrow: string | null;
    title: string | null;
    subtitle: string | null;
    imageUrl: string | null;
    buttonText: string | null;
    buttonLink: string | null;
    isActive: boolean;
    sortOrder: number;
    startAt: string | null;
    endAt: string | null;
    createdAt: string;
    updatedAt: string;
}

const BUCKET = 'hero-banners';

const mapRow = (row: any): HeroBanner => ({
    id: row.id,
    eyebrow: row.eyebrow ?? null,
    title: row.title ?? null,
    subtitle: row.subtitle ?? null,
    imageUrl: row.image_url ?? null,
    buttonText: row.button_text ?? null,
    buttonLink: row.button_link ?? null,
    isActive: row.is_active ?? false,
    sortOrder: Number(row.sort_order ?? 0),
    startAt: row.start_at ?? null,
    endAt: row.end_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

export const heroBannerService = {
    getBanners: async (): Promise<HeroBanner[]> => {
        const { data, error } = await supabase
            .from('hero_banners')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapRow);
    },

    uploadImage: async (file: File): Promise<string> => {
        const compressed = await compressImage(file, 800, 2400);
        const ext = compressed.name.split('.').pop() || 'jpg';
        const fileName = `banner_${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(fileName, compressed, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
        return publicUrl;
    },

    deleteImageByUrl: async (url: string): Promise<void> => {
        if (!url) return;
        try {
            const prefix = `/${BUCKET}/`;
            const idx = url.indexOf(prefix);
            if (idx !== -1) {
                const filePath = decodeURIComponent(url.substring(idx + prefix.length));
                await supabase.storage.from(BUCKET).remove([filePath]);
            }
        } catch (err) {
            console.error('Failed to delete hero banner image from storage:', err);
        }
    },

    createBanner: async (
        fields: Omit<HeroBanner, 'id' | 'createdAt' | 'updatedAt' | 'imageUrl'>,
        imageFile?: File
    ): Promise<HeroBanner> => {
        let imageUrl: string | null = null;

        try {
            if (imageFile) {
                imageUrl = await heroBannerService.uploadImage(imageFile);
            }

            const { data, error } = await supabase
                .from('hero_banners')
                .insert([{
                    eyebrow: fields.eyebrow || null,
                    title: fields.title || null,
                    subtitle: fields.subtitle || null,
                    image_url: imageUrl,
                    button_text: fields.buttonText || null,
                    button_link: fields.buttonLink || null,
                    is_active: fields.isActive,
                    sort_order: fields.sortOrder,
                    start_at: fields.startAt || null,
                    end_at: fields.endAt || null,
                }])
                .select()
                .single();

            if (error) throw error;
            return mapRow(data);
        } catch (err) {
            if (imageUrl) await heroBannerService.deleteImageByUrl(imageUrl);
            throw err;
        }
    },

    updateBanner: async (
        id: string,
        fields: Partial<Omit<HeroBanner, 'id' | 'createdAt' | 'updatedAt'>>,
        imageFile?: File,
        oldImageUrl?: string | null
    ): Promise<HeroBanner> => {
        let imageUrl = fields.imageUrl ?? null;

        if (imageFile) {
            // Delete old image from storage first
            if (oldImageUrl) await heroBannerService.deleteImageByUrl(oldImageUrl);
            imageUrl = await heroBannerService.uploadImage(imageFile);
        }

        const updatePayload: any = { updated_at: new Date().toISOString() };
        if (fields.eyebrow !== undefined) updatePayload.eyebrow = fields.eyebrow || null;
        if (fields.title !== undefined) updatePayload.title = fields.title || null;
        if (fields.subtitle !== undefined) updatePayload.subtitle = fields.subtitle || null;
        if (fields.buttonText !== undefined) updatePayload.button_text = fields.buttonText || null;
        if (fields.buttonLink !== undefined) updatePayload.button_link = fields.buttonLink || null;
        if (fields.isActive !== undefined) updatePayload.is_active = fields.isActive;
        if (fields.sortOrder !== undefined) updatePayload.sort_order = fields.sortOrder;
        if (fields.startAt !== undefined) updatePayload.start_at = fields.startAt || null;
        if (fields.endAt !== undefined) updatePayload.end_at = fields.endAt || null;
        updatePayload.image_url = imageUrl;

        const { data, error } = await supabase
            .from('hero_banners')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

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

    deleteBanner: async (id: string, imageUrl?: string | null): Promise<void> => {
        if (imageUrl) await heroBannerService.deleteImageByUrl(imageUrl);

        const { error } = await supabase.from('hero_banners').delete().eq('id', id);
        if (error) throw error;
    },
};
