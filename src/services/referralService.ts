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
        };
      });
    } catch (err) {
      console.error('Error fetching recent referrals:', err);
      return [];
    }
  },
};
