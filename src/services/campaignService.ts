import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/imageCompressor';

export interface Campaign {
    id: string;
    name: string;
    slug: string;
    title: string | null;
    subtitle: string | null;
    desktopBannerUrl: string | null;
    mobileBannerUrl: string | null;
    startDate: string;
    endDate: string;
    status: 'draft' | 'active' | 'inactive';
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
    productIds?: string[];
}

export interface HomepageSlot {
    id: string;
    slotKey: 'top' | 'middle' | 'bottom';
    slotName: string;
    campaignId: string | null;
    isVisible: boolean;
    createdAt: string;
    updatedAt: string;
    campaign?: Campaign | null;
}

export const campaignService = {
    getCampaigns: async (): Promise<Campaign[]> => {
        const { data, error } = await supabase
            .from('campaigns')
            .select('*, campaign_products(inventory_id)')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            slug: item.slug,
            title: item.title,
            subtitle: item.subtitle,
            desktopBannerUrl: item.desktop_banner_url,
            mobileBannerUrl: item.mobile_banner_url,
            startDate: item.start_date,
            endDate: item.end_date,
            status: item.status as 'draft' | 'active' | 'inactive',
            sortOrder: Number(item.sort_order),
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            productIds: (item.campaign_products || []).map((cp: any) => cp.inventory_id)
        }));
    },

    getCampaignById: async (id: string): Promise<Campaign> => {
        const { data, error } = await supabase
            .from('campaigns')
            .select('*, campaign_products(inventory_id)')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) throw new Error('Campaign not found');

        return {
            id: data.id,
            name: data.name,
            slug: data.slug,
            title: data.title,
            subtitle: data.subtitle,
            desktopBannerUrl: data.desktop_banner_url,
            mobileBannerUrl: data.mobile_banner_url,
            startDate: data.start_date,
            endDate: data.end_date,
            status: data.status as 'draft' | 'active' | 'inactive',
            sortOrder: Number(data.sort_order),
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            productIds: (data.campaign_products || []).map((cp: any) => cp.inventory_id)
        };
    },

    uploadBanner: async (file: File, campaignSlug: string, type: 'desktop' | 'mobile'): Promise<string> => {
        // Compress image to ensure performance (max 800KB, max width/height 2400px for desktop)
        const compressedFile = await compressImage(file, 800, 2400);
        const fileExt = compressedFile.name.split('.').pop();
        const fileName = `${campaignSlug}/${type}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('campaign-banners')
            .upload(filePath, compressedFile, {
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('campaign-banners')
            .getPublicUrl(filePath);

        return publicUrl;
    },

    deleteBannerByUrl: async (url: string): Promise<void> => {
        if (!url) return;
        try {
            // Extract the relative path in the storage bucket from the public URL
            // e.g., https://[project-id].supabase.co/storage/v1/object/public/campaign-banners/slug/desktop_abc.jpg
            const bucketPrefix = '/campaign-banners/';
            const index = url.indexOf(bucketPrefix);
            if (index !== -1) {
                const filePath = decodeURIComponent(url.substring(index + bucketPrefix.length));
                await supabase.storage
                    .from('campaign-banners')
                    .remove([filePath]);
            }
        } catch (error) {
            console.error('Failed to delete campaign banner image:', error);
        }
    },

    createCampaign: async (
        campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'desktopBannerUrl' | 'mobileBannerUrl' | 'productIds'>,
        productIds: string[],
        desktopBannerFile?: File,
        mobileBannerFile?: File
    ): Promise<Campaign> => {
        let desktopBannerUrl: string | null = null;
        let mobileBannerUrl: string | null = null;

        try {
            // 1. Upload banners if provided (fallback mobile to desktop banner)
            if (desktopBannerFile) {
                desktopBannerUrl = await campaignService.uploadBanner(desktopBannerFile, campaign.slug, 'desktop');
                mobileBannerUrl = desktopBannerUrl;
            } else if (mobileBannerFile) {
                mobileBannerUrl = await campaignService.uploadBanner(mobileBannerFile, campaign.slug, 'mobile');
                desktopBannerUrl = mobileBannerUrl;
            }

            // 2. Insert campaign
            const { data: newCampaign, error: campaignError } = await supabase
                .from('campaigns')
                .insert([{
                    name: campaign.name,
                    slug: campaign.slug,
                    title: campaign.title,
                    subtitle: campaign.subtitle || null,
                    desktop_banner_url: desktopBannerUrl,
                    mobile_banner_url: mobileBannerUrl,
                    start_date: campaign.startDate,
                    end_date: campaign.endDate,
                    status: campaign.status,
                    sort_order: campaign.sortOrder
                }])
                .select()
                .single();

            if (campaignError) throw campaignError;

            // 3. Insert product associations
            if (productIds && productIds.length > 0) {
                const productMappings = productIds.map(inventoryId => ({
                    campaign_id: newCampaign.id,
                    inventory_id: inventoryId
                }));

                const { error: productsError } = await supabase
                    .from('campaign_products')
                    .insert(productMappings);

                if (productsError) throw productsError;
            }

            return {
                id: newCampaign.id,
                name: newCampaign.name,
                slug: newCampaign.slug,
                title: newCampaign.title,
                subtitle: newCampaign.subtitle,
                desktopBannerUrl: newCampaign.desktop_banner_url,
                mobileBannerUrl: newCampaign.mobile_banner_url,
                startDate: newCampaign.start_date,
                endDate: newCampaign.end_date,
                status: newCampaign.status as 'draft' | 'active' | 'inactive',
                sortOrder: Number(newCampaign.sort_order),
                createdAt: newCampaign.created_at,
                updatedAt: newCampaign.updated_at,
                productIds
            };
        } catch (error) {
            // Clean up uploaded storage files if insertion fails
            if (desktopBannerUrl) await campaignService.deleteBannerByUrl(desktopBannerUrl);
            if (mobileBannerUrl && mobileBannerUrl !== desktopBannerUrl) {
                await campaignService.deleteBannerByUrl(mobileBannerUrl);
            }
            throw error;
        }
    },

    updateCampaign: async (
        id: string,
        campaign: Partial<Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'productIds'>>,
        productIds?: string[],
        desktopBannerFile?: File,
        mobileBannerFile?: File
    ): Promise<Campaign> => {
        // Fetch current campaign details first
        const currentCampaign = await campaignService.getCampaignById(id);
        const slug = campaign.slug || currentCampaign.slug;

        let desktopBannerUrl = currentCampaign.desktopBannerUrl;
        let mobileBannerUrl = currentCampaign.mobileBannerUrl;

        // 1. Handle desktop banner upload
        if (desktopBannerFile) {
            if (currentCampaign.desktopBannerUrl) {
                await campaignService.deleteBannerByUrl(currentCampaign.desktopBannerUrl);
            }
            if (currentCampaign.mobileBannerUrl && currentCampaign.mobileBannerUrl !== currentCampaign.desktopBannerUrl) {
                await campaignService.deleteBannerByUrl(currentCampaign.mobileBannerUrl);
            }
            desktopBannerUrl = await campaignService.uploadBanner(desktopBannerFile, slug, 'desktop');
            mobileBannerUrl = desktopBannerUrl;
        } else if (mobileBannerFile) {
            if (currentCampaign.mobileBannerUrl) {
                await campaignService.deleteBannerByUrl(currentCampaign.mobileBannerUrl);
            }
            if (currentCampaign.desktopBannerUrl && currentCampaign.desktopBannerUrl !== currentCampaign.mobileBannerUrl) {
                await campaignService.deleteBannerByUrl(currentCampaign.desktopBannerUrl);
            }
            mobileBannerUrl = await campaignService.uploadBanner(mobileBannerFile, slug, 'mobile');
            desktopBannerUrl = mobileBannerUrl;
        }

        // 3. Update campaigns table
        const updateFields: any = {
            updated_at: new Date().toISOString()
        };
        if (campaign.name !== undefined) updateFields.name = campaign.name;
        if (campaign.slug !== undefined) updateFields.slug = campaign.slug;
        if (campaign.title !== undefined) updateFields.title = campaign.title;
        if (campaign.subtitle !== undefined) updateFields.subtitle = campaign.subtitle;
        if (campaign.startDate !== undefined) updateFields.start_date = campaign.startDate;
        if (campaign.endDate !== undefined) updateFields.end_date = campaign.endDate;
        if (campaign.status !== undefined) updateFields.status = campaign.status;
        if (campaign.sortOrder !== undefined) updateFields.sort_order = campaign.sortOrder;
        updateFields.desktop_banner_url = desktopBannerUrl;
        updateFields.mobile_banner_url = mobileBannerUrl;

        const { data: updatedCampaign, error: campaignError } = await supabase
            .from('campaigns')
            .update(updateFields)
            .eq('id', id)
            .select()
            .single();

        if (campaignError) throw campaignError;

        // 4. Sync product mappings if provided
        if (productIds !== undefined) {
            // Delete old mappings
            const { error: deleteError } = await supabase
                .from('campaign_products')
                .delete()
                .eq('campaign_id', id);

            if (deleteError) throw deleteError;

            // Insert new mappings
            if (productIds.length > 0) {
                const productMappings = productIds.map(inventoryId => ({
                    campaign_id: id,
                    inventory_id: inventoryId
                }));

                const { error: insertError } = await supabase
                    .from('campaign_products')
                    .insert(productMappings);

                if (insertError) throw insertError;
            }
        }

        const finalProductIds = productIds !== undefined ? productIds : (currentCampaign.productIds || []);

        return {
            id: updatedCampaign.id,
            name: updatedCampaign.name,
            slug: updatedCampaign.slug,
            title: updatedCampaign.title,
            subtitle: updatedCampaign.subtitle,
            desktopBannerUrl: updatedCampaign.desktop_banner_url,
            mobileBannerUrl: updatedCampaign.mobile_banner_url,
            startDate: updatedCampaign.start_date,
            endDate: updatedCampaign.end_date,
            status: updatedCampaign.status as 'draft' | 'active' | 'inactive',
            sortOrder: Number(updatedCampaign.sort_order),
            createdAt: updatedCampaign.created_at,
            updatedAt: updatedCampaign.updated_at,
            productIds: finalProductIds
        };
    },

    deleteCampaign: async (id: string): Promise<void> => {
        // Fetch banners to delete them from storage
        const currentCampaign = await campaignService.getCampaignById(id);

        if (currentCampaign.desktopBannerUrl) {
            await campaignService.deleteBannerByUrl(currentCampaign.desktopBannerUrl);
        }
        if (currentCampaign.mobileBannerUrl) {
            await campaignService.deleteBannerByUrl(currentCampaign.mobileBannerUrl);
        }

        // Delete from DB (cascade deletes products mapping)
        const { error } = await supabase
            .from('campaigns')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    getHomepageSlots: async (): Promise<HomepageSlot[]> => {
        const { data, error } = await supabase
            .from('homepage_campaign_slots')
            .select('*, campaign:campaigns(*)');

        if (error) throw error;

        return (data || []).map((item: any) => ({
            id: item.id,
            slotKey: item.slot_key as 'top' | 'middle' | 'bottom',
            slotName: item.slot_name,
            campaignId: item.campaign_id,
            isVisible: item.is_visible,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            campaign: item.campaign ? {
                id: item.campaign.id,
                name: item.campaign.name,
                slug: item.campaign.slug,
                title: item.campaign.title,
                subtitle: item.campaign.subtitle,
                desktopBannerUrl: item.campaign.desktop_banner_url,
                mobileBannerUrl: item.campaign.mobile_banner_url,
                startDate: item.campaign.start_date,
                endDate: item.campaign.end_date,
                status: item.campaign.status,
                sortOrder: Number(item.campaign.sort_order),
                createdAt: item.campaign.created_at,
                updatedAt: item.campaign.updated_at
            } : null
        }));
    },

    updateHomepageSlot: async (id: string, campaignId: string | null, isVisible: boolean): Promise<HomepageSlot> => {
        const { data, error } = await supabase
            .from('homepage_campaign_slots')
            .update({
                campaign_id: campaignId,
                is_visible: isVisible,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('*, campaign:campaigns(*)')
            .single();

        if (error) throw error;

        return {
            id: data.id,
            slotKey: data.slot_key as 'top' | 'middle' | 'bottom',
            slotName: data.slot_name,
            campaignId: data.campaign_id,
            isVisible: data.is_visible,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            campaign: data.campaign ? {
                id: data.campaign.id,
                name: data.campaign.name,
                slug: data.campaign.slug,
                title: data.campaign.title,
                subtitle: data.campaign.subtitle,
                desktopBannerUrl: data.campaign.desktop_banner_url,
                mobileBannerUrl: data.campaign.mobile_banner_url,
                startDate: data.campaign.start_date,
                endDate: data.campaign.end_date,
                status: data.campaign.status,
                sortOrder: Number(data.campaign.sort_order),
                createdAt: data.campaign.created_at,
                updatedAt: data.campaign.updated_at
            } : null
        };
    }
};
