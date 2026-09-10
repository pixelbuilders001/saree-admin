import { supabase } from '@/lib/supabase';
import type { HomepageSection } from '@/types/homepage';
import { compressImage } from '@/lib/imageCompressor';
import { uploadToImageKit } from '@/services/imagekitService';

export interface CreateHomepageSectionInput {
    title: string;
    subtitle?: string | null;
    collectionId: string;
    displayStyle?: string;
    imageUrl?: string | null;
    viewAllText?: string | null;
    viewAllUrl?: string | null;
    startAt?: string | null;
    endAt?: string | null;
    isActive?: boolean;
    sortOrder?: number;
}

export interface UpdateHomepageSectionInput {
    title?: string;
    subtitle?: string | null;
    collectionId?: string;
    displayStyle?: string;
    imageUrl?: string | null;
    viewAllText?: string | null;
    viewAllUrl?: string | null;
    startAt?: string | null;
    endAt?: string | null;
    isActive?: boolean;
    sortOrder?: number;
}

interface HomepageSectionRow {
    id: string;
    title: string;
    subtitle?: string | null;
    collection_id: string;
    display_style?: string;
    image_url?: string | null;
    view_all_text?: string | null;
    view_all_url?: string | null;
    start_at?: string | null;
    end_at?: string | null;
    is_active?: boolean;
    sort_order?: number;
    created_at: string;
    updated_at: string;
    collections?: {
        id: string;
        name: string;
        collection_type: 'automatic' | 'manual';
    } | null;
}

const mapSectionRow = (row: HomepageSectionRow): HomepageSection => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? null,
    collectionId: row.collection_id,
    displayStyle: row.display_style || 'grid',
    imageUrl: row.image_url ?? null,
    viewAllText: row.view_all_text ?? null,
    viewAllUrl: row.view_all_url ?? null,
    startAt: row.start_at ?? null,
    endAt: row.end_at ?? null,
    isActive: row.is_active ?? true,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    collection: row.collections ? {
        id: row.collections.id,
        name: row.collections.name,
        collectionType: row.collections.collection_type,
    } : null,
});

export const homepageSectionService = {
    getHomepageSections: async (): Promise<HomepageSection[]> => {
        const { data, error } = await supabase
            .from('homepage_sections')
            .select('*, collections(id, name, collection_type)')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return ((data || []) as unknown as HomepageSectionRow[]).map(mapSectionRow);
    },

    uploadBannerImage: async (file: File): Promise<string> => {
        const compressed = await compressImage(file, 800, 2400, 'image/webp');
        const fileName = `banner_${Date.now()}_${Math.random().toString(36).substring(2, 10)}.webp`;
        const result = await uploadToImageKit(compressed, fileName, '/homepage-banners');
        return result.url;
    },

    createSection: async (input: CreateHomepageSectionInput): Promise<HomepageSection> => {
        // If sortOrder is not provided, place at the end
        let sortOrder = input.sortOrder;
        if (sortOrder === undefined) {
            const { data } = await supabase
                .from('homepage_sections')
                .select('sort_order')
                .order('sort_order', { ascending: false })
                .limit(1);

            sortOrder = data && data.length > 0 ? (data[0].sort_order + 1) : 0;
        }

        const { data, error } = await supabase
            .from('homepage_sections')
            .insert([{
                title: input.title.trim(),
                subtitle: input.subtitle?.trim() || null,
                collection_id: input.collectionId,
                display_style: input.displayStyle || 'grid',
                image_url: input.imageUrl || null,
                view_all_text: input.viewAllText?.trim() || null,
                view_all_url: input.viewAllUrl?.trim() || null,
                start_at: input.startAt || null,
                end_at: input.endAt || null,
                is_active: input.isActive ?? true,
                sort_order: sortOrder,
            }])
            .select('*, collections(id, name, collection_type)')
            .single();

        if (error) throw error;
        return mapSectionRow(data as unknown as HomepageSectionRow);
    },

    updateSection: async (id: string, input: UpdateHomepageSectionInput): Promise<HomepageSection> => {
        const payload: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (input.title !== undefined) payload.title = input.title.trim();
        if (input.subtitle !== undefined) payload.subtitle = input.subtitle?.trim() || null;
        if (input.collectionId !== undefined) payload.collection_id = input.collectionId;
        if (input.displayStyle !== undefined) payload.display_style = input.displayStyle;
        if (input.imageUrl !== undefined) payload.image_url = input.imageUrl;
        if (input.viewAllText !== undefined) payload.view_all_text = input.viewAllText?.trim() || null;
        if (input.viewAllUrl !== undefined) payload.view_all_url = input.viewAllUrl?.trim() || null;
        if (input.startAt !== undefined) payload.start_at = input.startAt || null;
        if (input.endAt !== undefined) payload.end_at = input.endAt || null;
        if (input.isActive !== undefined) payload.is_active = input.isActive;
        if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder;

        const { data, error } = await supabase
            .from('homepage_sections')
            .update(payload)
            .eq('id', id)
            .select('*, collections(id, name, collection_type)')
            .single();

        if (error) throw error;
        return mapSectionRow(data as unknown as HomepageSectionRow);
    },

    updateSectionsOrder: async (orderedIds: string[]): Promise<void> => {
        const updates = orderedIds.map((id, index) =>
            supabase
                .from('homepage_sections')
                .update({ sort_order: index, updated_at: new Date().toISOString() })
                .eq('id', id)
        );

        await Promise.all(updates);
    },

    toggleSectionActive: async (id: string, isActive: boolean): Promise<void> => {
        const { error } = await supabase
            .from('homepage_sections')
            .update({ is_active: isActive, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
    },

    deleteSection: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('homepage_sections')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
