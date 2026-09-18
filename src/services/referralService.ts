import { supabase } from '@/lib/supabase';

export interface ReferralSettings {
  id: string;
  is_active: boolean;
  tier1_min_order: number;
  tier1_reward_coins: number;
  tier2_min_order: number;
  tier2_reward_coins: number;
  tier3_min_order: number;
  tier3_reward_coins: number;
  max_redemption_percent: number;
  min_order_for_redemption: number;
  return_window_days: number;
  updated_at?: string;
}

export const DEFAULT_REFERRAL_SETTINGS: ReferralSettings = {
  id: 'default',
  is_active: true,
  tier1_min_order: 1500,
  tier1_reward_coins: 150,
  tier2_min_order: 4000,
  tier2_reward_coins: 300,
  tier3_min_order: 9000,
  tier3_reward_coins: 500,
  max_redemption_percent: 20,
  min_order_for_redemption: 1999,
  return_window_days: 7,
};

export interface ReferralLogItem {
  id: string;
  referrer_id: string;
  referee_id: string;
  status: 'REGISTERED' | 'QUALIFIED' | 'REWARDED' | 'VOIDED';
  reward_amount: number;
  qualifying_order_id?: string | null;
  created_at: string;
  referrer_name?: string;
  referrer_code?: string;
  referee_name?: string;
  referee_email?: string;
  order_number?: string;
  order_total_amount?: number;
  order_discount?: number;
  order_created_at?: string;
  order_status?: string;
  payment_status?: string;
}

export interface CustomerWalletItem {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  referral_code?: string;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_referrals: number;
}

export interface CoinLedgerItem {
  id: string;
  user_id: string;
  customer_name: string;
  type: 'REFERRAL_CREDIT' | 'ORDER_REDEMPTION' | 'ORDER_REFUND' | 'ADMIN_CREDIT' | 'ADMIN_DEBIT' | 'EXPIRED' | string;
  amount: number;
  balance_after?: number;
  reference_order_id?: string | null;
  order_number?: string | null;
  description?: string;
  created_at: string;
}

export interface CouponItem {
  id: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_discount_amount?: number;
  usage_limit?: number;
  times_used: number;
  is_active: boolean;
  expires_at?: string | null;
  created_at?: string;
}

export const referralService = {
  getSettings: async (): Promise<ReferralSettings> => {
    try {
      const { data, error } = await supabase
        .from('referral_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (error) {
        console.warn('Could not fetch referral_settings, using defaults:', error.message);
        return DEFAULT_REFERRAL_SETTINGS;
      }

      if (!data) return DEFAULT_REFERRAL_SETTINGS;

      return {
        id: data.id || 'default',
        is_active: Boolean(data.is_active ?? true),
        tier1_min_order: Number(data.tier1_min_order ?? 1500),
        tier1_reward_coins: Number(data.tier1_reward_coins ?? 150),
        tier2_min_order: Number(data.tier2_min_order ?? 4000),
        tier2_reward_coins: Number(data.tier2_reward_coins ?? 300),
        tier3_min_order: Number(data.tier3_min_order ?? 9000),
        tier3_reward_coins: Number(data.tier3_reward_coins ?? 500),
        max_redemption_percent: Number(data.max_redemption_percent ?? 20),
        min_order_for_redemption: Number(data.min_order_for_redemption ?? 1999),
        return_window_days: Number(data.return_window_days ?? 7),
        updated_at: data.updated_at,
      };
    } catch (err) {
      console.error('Exception fetching referral settings:', err);
      return DEFAULT_REFERRAL_SETTINGS;
    }
  },

  saveSettings: async (settings: Partial<ReferralSettings>): Promise<ReferralSettings> => {
    const payload = {
      id: 'default',
      is_active: settings.is_active ?? true,
      tier1_min_order: Number(settings.tier1_min_order ?? 1500),
      tier1_reward_coins: Number(settings.tier1_reward_coins ?? 150),
      tier2_min_order: Number(settings.tier2_min_order ?? 4000),
      tier2_reward_coins: Number(settings.tier2_reward_coins ?? 300),
      tier3_min_order: Number(settings.tier3_min_order ?? 9000),
      tier3_reward_coins: Number(settings.tier3_reward_coins ?? 500),
      max_redemption_percent: Number(settings.max_redemption_percent ?? 20),
      min_order_for_redemption: Number(settings.min_order_for_redemption ?? 1999),
      return_window_days: Number(settings.return_window_days ?? 7),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('referral_settings')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error saving referral settings:', error);
      throw error;
    }

    return {
      ...payload,
      ...data,
    };
  },

  getOverviewStats: async () => {
    try {
      try {
        await supabase.rpc('process_matured_referral_coins');
      } catch {
        // Non-fatal if RPC not created
      }

      const [referralsRes, walletsRes] = await Promise.all([
        supabase.from('referrals').select('status, reward_amount'),
        supabase.from('user_wallets').select('available_balance, pending_balance, total_earned'),
      ]);

      const referrals = referralsRes.data || [];
      const wallets = walletsRes.data || [];

      const totalReferrals = referrals.length;
      const qualifiedReferrals = referrals.filter(
        r => r.status === 'QUALIFIED' || r.status === 'REWARDED'
      ).length;

      const totalCoinsEarned = wallets.reduce(
        (sum, w) => sum + Number(w.total_earned || 0),
        0
      );
      const totalAvailableCoins = wallets.reduce(
        (sum, w) => sum + Number(w.available_balance || 0),
        0
      );
      const totalPendingCoins = wallets.reduce(
        (sum, w) => sum + Number(w.pending_balance || 0),
        0
      );

      return {
        totalReferrals,
        qualifiedReferrals,
        totalCoinsEarned,
        totalAvailableCoins,
        totalPendingCoins,
      };
    } catch (err) {
      console.error('Error loading referral stats:', err);
      return {
        totalReferrals: 0,
        qualifiedReferrals: 0,
        totalCoinsEarned: 0,
        totalAvailableCoins: 0,
        totalPendingCoins: 0,
      };
    }
  },

  getRecentReferrals: async (limit = 20): Promise<ReferralLogItem[]> => {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data) return [];

      // Enrich with profile names
      const userIds = new Set<string>();
      data.forEach(r => {
        if (r.referrer_id) userIds.add(r.referrer_id);
        if (r.referee_id) userIds.add(r.referee_id);
      });

      let profilesMap = new Map<string, { full_name?: string; email?: string; referral_code?: string }>();
      if (userIds.size > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, email, referral_code')
          .in('id', Array.from(userIds));

        if (profs) {
          profs.forEach(p => profilesMap.set(p.id, p));
        }
      }

      return data.map(r => {
        const referrer = profilesMap.get(r.referrer_id);
        const referee = profilesMap.get(r.referee_id);

        return {
          ...r,
          reward_amount: Number(r.reward_amount || 0),
          referrer_name: referrer?.full_name || referrer?.email || 'Customer',
          referrer_code: referrer?.referral_code || '',
          referee_name: referee?.full_name || 'New Customer',
          referee_email: referee?.email || '',
          order_number: undefined,
        };
      });
    } catch (err) {
      console.error('Error fetching recent referrals:', err);
      return [];
    }
  },

  getAllReferrals: async (limit = 200): Promise<ReferralLogItem[]> => {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data) return [];

      const userIds = new Set<string>();
      const orderIds = new Set<string>();
      data.forEach(r => {
        if (r.referrer_id) userIds.add(r.referrer_id);
        if (r.referee_id) userIds.add(r.referee_id);
        if (r.qualifying_order_id) orderIds.add(r.qualifying_order_id);
      });

      let profilesMap = new Map<string, { full_name?: string; email?: string; referral_code?: string }>();
      if (userIds.size > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, email, referral_code')
          .in('id', Array.from(userIds));

        if (profs) {
          profs.forEach(p => profilesMap.set(p.id, p));
        }
      }

      let ordersMap = new Map<string, {
        order_number: string;
        total_amount: number;
        discount: number;
        created_at: string;
        order_status: string;
        payment_status: string;
      }>();
      if (orderIds.size > 0) {
        const { data: ords } = await supabase
          .from('orders')
          .select('id, order_number, total_amount, discount, created_at, order_status, payment_status')
          .in('id', Array.from(orderIds));

        if (ords) {
          ords.forEach(o => ordersMap.set(o.id, {
            order_number: o.order_number,
            total_amount: Number(o.total_amount || 0),
            discount: Number(o.discount || 0),
            created_at: o.created_at,
            order_status: o.order_status,
            payment_status: o.payment_status,
          }));
        }
      }

      return data.map(r => {
        const referrer = profilesMap.get(r.referrer_id);
        const referee = profilesMap.get(r.referee_id);
        const ord = r.qualifying_order_id ? ordersMap.get(r.qualifying_order_id) : undefined;

        return {
          ...r,
          reward_amount: Number(r.reward_amount || 0),
          referrer_name: referrer?.full_name || referrer?.email || 'Customer',
          referrer_code: referrer?.referral_code || '',
          referee_name: referee?.full_name || 'New Customer',
          referee_email: referee?.email || '',
          order_number: ord?.order_number,
          order_total_amount: ord?.total_amount,
          order_discount: ord?.discount,
          order_created_at: ord?.created_at,
          order_status: ord?.order_status,
          payment_status: ord?.payment_status,
        };
      });
    } catch (err) {
      console.error('Error fetching all referrals:', err);
      return [];
    }
  },

  updateReferralStatus: async (
    referralId: string,
    status: 'REGISTERED' | 'QUALIFIED' | 'REWARDED' | 'VOIDED'
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('referrals')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', referralId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error updating referral status:', err);
      throw err;
    }
  },

  getCustomerWallets: async (): Promise<CustomerWalletItem[]> => {
    try {
      const [walletsRes, profilesRes, referralsRes] = await Promise.all([
        supabase.from('user_wallets').select('*'),
        supabase.from('profiles').select('id, full_name, email, phone_number, referral_code'),
        supabase.from('referrals').select('referrer_id, status'),
      ]);

      const wallets = walletsRes.data || [];
      const profiles = profilesRes.data || [];
      const referrals = referralsRes.data || [];

      // Count referrals per referrer
      const referralCounts = new Map<string, number>();
      referrals.forEach(r => {
        if (r.referrer_id) {
          referralCounts.set(r.referrer_id, (referralCounts.get(r.referrer_id) || 0) + 1);
        }
      });

      const profilesMap = new Map<string, any>();
      profiles.forEach(p => profilesMap.set(p.id, p));

      const seenUserIds = new Set<string>();
      const result: CustomerWalletItem[] = wallets.map((w: any) => {
        seenUserIds.add(w.user_id);
        const prof = profilesMap.get(w.user_id);
        return {
          id: w.id || w.user_id,
          user_id: w.user_id,
          full_name: prof?.full_name || prof?.email || 'Customer',
          email: prof?.email || '',
          phone_number: prof?.phone_number || '',
          referral_code: prof?.referral_code || '',
          available_balance: Number(w.available_balance || 0),
          pending_balance: Number(w.pending_balance || 0),
          total_earned: Number(w.total_earned || 0),
          total_referrals: referralCounts.get(w.user_id) || 0,
        };
      });

      // Also include any profiles who shared code / have referrals but no user_wallets row
      profiles.forEach(p => {
        if (!seenUserIds.has(p.id) && ((referralCounts.get(p.id) || 0) > 0 || p.referral_code)) {
          result.push({
            id: p.id,
            user_id: p.id,
            full_name: p.full_name || p.email || 'Customer',
            email: p.email || '',
            phone_number: p.phone_number || '',
            referral_code: p.referral_code || '',
            available_balance: 0,
            pending_balance: 0,
            total_earned: 0,
            total_referrals: referralCounts.get(p.id) || 0,
          });
        }
      });

      return result.sort((a, b) => b.total_earned - a.total_earned || b.total_referrals - a.total_referrals);
    } catch (err) {
      console.error('Error fetching customer wallets:', err);
      return [];
    }
  },

  adjustWalletBalance: async (
    userId: string,
    amount: number,
    type: 'credit' | 'debit',
    reason: string
  ): Promise<boolean> => {
    try {
      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const currentAvailable = Number(wallet?.available_balance || 0);
      const currentEarned = Number(wallet?.total_earned || 0);

      const delta = type === 'credit' ? Math.abs(amount) : -Math.abs(amount);
      const newAvailable = Math.max(0, currentAvailable + delta);
      const newEarned = type === 'credit' ? currentEarned + Math.abs(amount) : currentEarned;

      const { error: walletError } = await supabase
        .from('user_wallets')
        .upsert({
          user_id: userId,
          available_balance: newAvailable,
          total_earned: newEarned,
          pending_balance: Number(wallet?.pending_balance || 0),
          updated_at: new Date().toISOString(),
        });

      if (walletError) throw walletError;

      // Log transaction if table exists (non-fatal)
      try {
        await supabase
          .from('wallet_transactions')
          .insert({
            user_id: userId,
            type: type === 'credit' ? 'ADMIN_CREDIT' : 'ADMIN_DEBIT',
            amount: delta,
            balance_after: newAvailable,
            description: reason || `Admin manual ${type}`,
            created_at: new Date().toISOString(),
          });
      } catch {
        // Safe to ignore if optional table not present
      }

      return true;
    } catch (err) {
      console.error('Error adjusting wallet balance:', err);
      throw err;
    }
  },

  getWalletTransactions: async (limit = 100): Promise<CoinLedgerItem[]> => {
    try {
      // 1. Attempt from wallet_transactions table
      const { data: txData, error: txError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!txError && txData && txData.length > 0) {
        const userIds = Array.from(new Set(txData.map(t => t.user_id).filter(Boolean)));
        let profilesMap = new Map<string, string>();
        if (userIds.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);
          if (profs) profs.forEach(p => profilesMap.set(p.id, p.full_name || p.email || 'Customer'));
        }

        return txData.map((t: any) => ({
          id: t.id,
          user_id: t.user_id,
          customer_name: profilesMap.get(t.user_id) || 'Customer',
          type: t.type || 'COIN_TRANSACTION',
          amount: Number(t.amount || 0),
          balance_after: t.balance_after !== undefined ? Number(t.balance_after) : undefined,
          reference_order_id: t.order_id || t.reference_order_id,
          description: t.description || t.notes || '',
          created_at: t.created_at,
        }));
      }

      // 2. Fallback: Derive from referrals table
      const { data: referrals } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!referrals || referrals.length === 0) return [];

      const userIds = Array.from(new Set(referrals.map(r => r.referrer_id).filter(Boolean)));
      let profilesMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        if (profs) profs.forEach(p => profilesMap.set(p.id, p.full_name || p.email || 'Customer'));
      }

      return referrals.map((r: any) => ({
        id: `ref-tx-${r.id}`,
        user_id: r.referrer_id,
        customer_name: profilesMap.get(r.referrer_id) || 'Referrer',
        type: r.status === 'REWARDED' ? 'REFERRAL_CREDIT' : r.status === 'QUALIFIED' ? 'PENDING_REFERRAL' : 'REFERRAL_REGISTERED',
        amount: Number(r.reward_amount || 0),
        reference_order_id: r.qualifying_order_id,
        description: `Friend invitation reward (${r.status})`,
        created_at: r.created_at,
      }));
    } catch (err) {
      console.error('Error fetching wallet transactions:', err);
      return [];
    }
  },

  getCoupons: async (): Promise<CouponItem[]> => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data.map((c: any) => ({
        id: c.id,
        code: c.code,
        description: c.description || '',
        discount_type: c.discount_type || 'percentage',
        discount_value: Number(c.discount_value || 0),
        min_order_value: Number(c.min_order_value || 0),
        max_discount_amount: c.max_discount_amount ? Number(c.max_discount_amount) : undefined,
        usage_limit: c.usage_limit ? Number(c.usage_limit) : undefined,
        times_used: Number(c.times_used || 0),
        is_active: Boolean(c.is_active ?? true),
        expires_at: c.expires_at,
        created_at: c.created_at,
      }));
    } catch (err) {
      console.warn('Coupons table query not available:', err);
      return [];
    }
  },

  saveCoupon: async (coupon: Partial<CouponItem>): Promise<boolean> => {
    try {
      const payload: any = {
        code: coupon.code?.toUpperCase().trim(),
        description: coupon.description,
        discount_type: coupon.discount_type || 'percentage',
        discount_value: Number(coupon.discount_value || 0),
        min_order_value: Number(coupon.min_order_value || 0),
        max_discount_amount: coupon.max_discount_amount ? Number(coupon.max_discount_amount) : null,
        usage_limit: coupon.usage_limit ? Number(coupon.usage_limit) : null,
        is_active: coupon.is_active ?? true,
        expires_at: coupon.expires_at || null,
        updated_at: new Date().toISOString(),
      };
      if (coupon.id) {
        payload.id = coupon.id;
      }
      const { error } = await supabase.from('coupons').upsert(payload);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error saving coupon:', err);
      throw err;
    }
  },

  toggleCouponStatus: async (id: string, is_active: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error toggling coupon status:', err);
      throw err;
    }
  },

  deleteCoupon: async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error deleting coupon:', err);
      throw err;
    }
  },
};
