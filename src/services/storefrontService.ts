import { supabase } from '@/lib/supabase';

export interface ProductReview {
    id: string;
    productId: string;
    userId: string;
    orderId: string;
    rating: number;
    title: string | null;
    reviewText: string | null;
    status: 'pending' | 'approved' | 'rejected';
    isVerifiedPurchase: boolean;
    helpfulCount: number;
    createdAt: string;
    updatedAt: string;
    productName?: string;
    productSku?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
}

export interface WishlistItem {
    id: string;
    userId: string;
    productId: string;
    createdAt: string;
    productName?: string;
    productSku?: string;
    productPrice?: number;
    productFabric?: string;
    productColor?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
}

export const storefrontService = {
    // Reviews Services
    getReviews: async (): Promise<ProductReview[]> => {
        const { data: reviewsData, error: reviewsError } = await supabase
            .from('product_reviews')
            .select(`
                *,
                inventory (
                    id,
                    saree_name,
                    sku
                )
            `)
            .order('created_at', { ascending: false });

        if (reviewsError) throw reviewsError;

        // Fetch user profiles to display reviewer details
        const userIds = [...new Set((reviewsData || []).map((r: any) => r.user_id).filter(Boolean))];
        let profiles: any[] = [];
        if (userIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, email, phone_number')
                .in('id', userIds);
            
            if (!profilesError && profilesData) {
                profiles = profilesData;
            }
        }

        return (reviewsData || []).map((rev: any) => {
            const profile = profiles.find((p: any) => p.id === rev.user_id);
            return {
                id: rev.id,
                productId: rev.product_id,
                userId: rev.user_id,
                orderId: rev.order_id,
                rating: Number(rev.rating),
                title: rev.title,
                reviewText: rev.review_text,
                status: rev.status,
                isVerifiedPurchase: rev.is_verified_purchase,
                helpfulCount: Number(rev.helpful_count),
                createdAt: rev.created_at,
                updatedAt: rev.updated_at,
                productName: rev.inventory?.saree_name || 'Unknown Saree',
                productSku: rev.inventory?.sku || '',
                customerName: profile?.full_name || 'Anonymous User',
                customerEmail: profile?.email || '',
                customerPhone: profile?.phone_number ? profile.phone_number.toString() : '',
            };
        });
    },

    updateReviewStatus: async (id: string, status: 'approved' | 'rejected' | 'pending'): Promise<void> => {
        const { error } = await supabase
            .from('product_reviews')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
    },

    deleteReview: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('product_reviews')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Wishlist Services
    getWishlistItems: async (): Promise<WishlistItem[]> => {
        const { data: wishlistData, error: wishlistError } = await supabase
            .from('wishlist')
            .select(`
                *,
                inventory (
                    id,
                    saree_name,
                    sku,
                    selling_price,
                    fabric,
                    color
                )
            `)
            .order('created_at', { ascending: false });

        if (wishlistError) throw wishlistError;

        // Fetch user profiles to display wisher details
        const userIds = [...new Set((wishlistData || []).map((w: any) => w.user_id).filter(Boolean))];
        let profiles: any[] = [];
        if (userIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, email, phone_number')
                .in('id', userIds);
            
            if (!profilesError && profilesData) {
                profiles = profilesData;
            }
        }

        return (wishlistData || []).map((item: any) => {
            const profile = profiles.find((p: any) => p.id === item.user_id);
            return {
                id: item.id,
                userId: item.user_id,
                productId: item.product_id,
                createdAt: item.created_at,
                productName: item.inventory?.saree_name || 'Unknown Saree',
                productSku: item.inventory?.sku || '',
                productPrice: Number(item.inventory?.selling_price || 0),
                productFabric: item.inventory?.fabric || '',
                productColor: item.inventory?.color || '',
                customerName: profile?.full_name || 'Anonymous User',
                customerEmail: profile?.email || '',
                customerPhone: profile?.phone_number ? profile.phone_number.toString() : '',
            };
        });
    },

    deleteWishlistItem: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('wishlist')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
