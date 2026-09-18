import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Coins,
  Gift,
  Save,
  RefreshCw,
  CheckCircle,
  Users,
  ShoppingBag,
  TrendingUp,
  Percent,
  Sliders,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Search,
  Plus,
  Trash2,
  Copy,
  Tag,
  Award,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  XCircle,
  CheckCircle2,
  SlidersHorizontal,
  IndianRupee,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  referralService,
  DEFAULT_REFERRAL_SETTINGS,
  type ReferralSettings,
  type ReferralLogItem,
  type CustomerWalletItem,
  type CoinLedgerItem,
  type CouponItem,
} from '@/services/referralService';

export default function CouponsReferralsPage() {
  // Global Settings & Overview
  const [settings, setSettings] = useState<ReferralSettings>(DEFAULT_REFERRAL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    qualifiedReferrals: 0,
    totalCoinsEarned: 0,
    totalAvailableCoins: 0,
    totalPendingCoins: 0,
  });

  // Tab 2: Referral Activity Log
  const [referrals, setReferrals] = useState<ReferralLogItem[]>([]);
  const [referralSearch, setReferralSearch] = useState('');
  const [referralStatusFilter, setReferralStatusFilter] = useState<string>('ALL');
  const [updatingReferralId, setUpdatingReferralId] = useState<string | null>(null);

  // Tab 3: Customer Wallets & Advocates
  const [wallets, setWallets] = useState<CustomerWalletItem[]>([]);
  const [walletSearch, setWalletSearch] = useState('');
  const [adjustingWallet, setAdjustingWallet] = useState<CustomerWalletItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Tab 4: Coin Transaction Ledger
  const [ledger, setLedger] = useState<CoinLedgerItem[]>([]);
  const [ledgerFilter, setLedgerFilter] = useState<string>('ALL');

  // Tab 5: Promo Coupons
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [newCoupon, setNewCoupon] = useState<Partial<CouponItem>>({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_value: 999,
    max_discount_amount: 500,
    usage_limit: 100,
    is_active: true,
  });
  const [savingCoupon, setSavingCoupon] = useState(false);

  // Tab: Sales & Net Revenue ROI Analytics Filter State
  const [roiDatePreset, setRoiDatePreset] = useState<'ALL' | 'TODAY' | '7D' | '30D' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [roiDateFrom, setRoiDateFrom] = useState<string>('');
  const [roiDateTo, setRoiDateTo] = useState<string>('');
  const [roiSearch, setRoiSearch] = useState<string>('');

  // Load all referral ecosystem tables
  const loadAll = async () => {
    setLoading(true);
    try {
      const [
        fetchedSettings,
        fetchedStats,
        fetchedReferrals,
        fetchedWallets,
        fetchedLedger,
        fetchedCoupons,
      ] = await Promise.allSettled([
        referralService.getSettings(),
        referralService.getOverviewStats(),
        referralService.getAllReferrals(500),
        referralService.getCustomerWallets(),
        referralService.getWalletTransactions(100),
        referralService.getCoupons(),
      ]);

      if (fetchedSettings.status === 'fulfilled') setSettings(fetchedSettings.value);
      if (fetchedStats.status === 'fulfilled') setStats(fetchedStats.value);
      if (fetchedReferrals.status === 'fulfilled') setReferrals(fetchedReferrals.value);
      if (fetchedWallets.status === 'fulfilled') setWallets(fetchedWallets.value);
      if (fetchedLedger.status === 'fulfilled') setLedger(fetchedLedger.value);
      if (fetchedCoupons.status === 'fulfilled') setCoupons(fetchedCoupons.value);
    } catch (err) {
      console.error('Failed to load referral ecosystem data:', err);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Save Settings handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const updated = await referralService.saveSettings(settings);
      setSettings(updated);
      toast.success('Referral settings updated successfully!');
    } catch (err: any) {
      console.error('Error updating settings:', err);
      toast.error(err?.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Toggle master active status
  const handleToggleActive = async () => {
    const newStatus = !settings.is_active;
    setSettings(prev => ({ ...prev, is_active: newStatus }));
    try {
      await referralService.saveSettings({ ...settings, is_active: newStatus });
      toast.success(newStatus ? 'Referral program activated' : 'Referral program paused');
    } catch (err) {
      setSettings(prev => ({ ...prev, is_active: !newStatus }));
      toast.error('Failed to update program status');
    }
  };

  // Quick clipboard copy
  const copyCode = (code: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success(`Copied code: ${code}`);
  };

  // Tab: Filtered ROI Referrals & Financial Metrics
  const filteredRoiReferrals = useMemo(() => {
    // Only include referrals that have a qualifying order and are not voided
    const validReferrals = referrals.filter(r => !!r.qualifying_order_id && r.status !== 'VOIDED');

    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (roiDatePreset === 'TODAY') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (roiDatePreset === '7D') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
    } else if (roiDatePreset === '30D') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
    } else if (roiDatePreset === 'THIS_MONTH') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      endDate = now;
    } else if (roiDatePreset === 'CUSTOM') {
      if (roiDateFrom) {
        startDate = new Date(`${roiDateFrom}T00:00:00`);
      }
      if (roiDateTo) {
        endDate = new Date(`${roiDateTo}T23:59:59.999`);
      }
    }

    return validReferrals.filter(r => {
      const targetDateStr = r.order_created_at || r.created_at;
      if (targetDateStr && (startDate || endDate)) {
        const d = new Date(targetDateStr);
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
      }

      const q = roiSearch.toLowerCase().trim();
      if (q) {
        const matches = (
          (r.order_number && r.order_number.toLowerCase().includes(q)) ||
          (r.referee_name && r.referee_name.toLowerCase().includes(q)) ||
          (r.referee_email && r.referee_email.toLowerCase().includes(q)) ||
          (r.referrer_name && r.referrer_name.toLowerCase().includes(q)) ||
          (r.referrer_code && r.referrer_code.toLowerCase().includes(q))
        );
        if (!matches) return false;
      }

      return true;
    });
  }, [referrals, roiDatePreset, roiDateFrom, roiDateTo, roiSearch]);

  const roiSummary = useMemo(() => {
    let grossSales = 0;
    let coinsGiven = 0;
    let orderDiscountsGiven = 0;
    const ordersCount = filteredRoiReferrals.length;

    filteredRoiReferrals.forEach(r => {
      grossSales += Number(r.order_total_amount || 0);
      coinsGiven += Number(r.reward_amount || 0);
      orderDiscountsGiven += Number(r.order_discount || 0);
    });

    const totalGivenToCustomer = coinsGiven + orderDiscountsGiven;
    const netRevenueKept = grossSales - totalGivenToCustomer;
    const netMarginPercent = grossSales > 0 ? (netRevenueKept / grossSales) * 100 : 0;
    const costPercent = grossSales > 0 ? (totalGivenToCustomer / grossSales) * 100 : 0;
    const aov = ordersCount > 0 ? grossSales / ordersCount : 0;

    return {
      grossSales,
      coinsGiven,
      orderDiscountsGiven,
      totalGivenToCustomer,
      netRevenueKept,
      netMarginPercent,
      costPercent,
      ordersCount,
      aov,
    };
  }, [filteredRoiReferrals]);

  // Tab 2: Filtered Referrals
  const filteredReferrals = useMemo(() => {
    return referrals.filter(r => {
      const matchesStatus = referralStatusFilter === 'ALL' || r.status === referralStatusFilter;
      const q = referralSearch.toLowerCase().trim();
      const matchesSearch = !q || (
        (r.referrer_name && r.referrer_name.toLowerCase().includes(q)) ||
        (r.referrer_code && r.referrer_code.toLowerCase().includes(q)) ||
        (r.referee_name && r.referee_name.toLowerCase().includes(q)) ||
        (r.referee_email && r.referee_email.toLowerCase().includes(q)) ||
        (r.order_number && r.order_number.toLowerCase().includes(q)) ||
        (r.qualifying_order_id && r.qualifying_order_id.toLowerCase().includes(q))
      );
      return matchesStatus && matchesSearch;
    });
  }, [referrals, referralStatusFilter, referralSearch]);

  // Tab 2: Manual Referral Status Override
  const handleStatusChange = async (referralId: string, newStatus: 'REGISTERED' | 'QUALIFIED' | 'REWARDED' | 'VOIDED') => {
    setUpdatingReferralId(referralId);
    try {
      await referralService.updateReferralStatus(referralId, newStatus);
      toast.success(`Referral marked as ${newStatus}`);
      setReferrals(prev => prev.map(r => r.id === referralId ? { ...r, status: newStatus } : r));
    } catch (err) {
      toast.error('Failed to update referral status');
    } finally {
      setUpdatingReferralId(null);
    }
  };

  // Tab 3: Filtered Wallets
  const filteredWallets = useMemo(() => {
    const q = walletSearch.toLowerCase().trim();
    if (!q) return wallets;
    return wallets.filter(w =>
      (w.full_name && w.full_name.toLowerCase().includes(q)) ||
      (w.email && w.email.toLowerCase().includes(q)) ||
      (w.phone_number && w.phone_number.toLowerCase().includes(q)) ||
      (w.referral_code && w.referral_code.toLowerCase().includes(q))
    );
  }, [wallets, walletSearch]);

  // Tab 3: Top Advocates (Top 3)
  const topAdvocates = useMemo(() => {
    return [...wallets]
      .filter(w => w.total_referrals > 0 || w.total_earned > 0)
      .sort((a, b) => b.total_earned - a.total_earned || b.total_referrals - a.total_referrals)
      .slice(0, 3);
  }, [wallets]);

  // Tab 3: Handle Wallet Adjustment
  const handleAdjustWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingWallet) return;
    const numAmount = Number(adjustAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid positive coin amount');
      return;
    }

    setIsAdjusting(true);
    try {
      await referralService.adjustWalletBalance(
        adjustingWallet.user_id,
        numAmount,
        adjustType,
        adjustReason || `Admin manual adjustment (${adjustType})`
      );
      toast.success(`Successfully ${adjustType === 'credit' ? 'credited' : 'debited'} ${numAmount} coins`);
      setAdjustingWallet(null);
      setAdjustAmount('');
      setAdjustReason('');
      // Refresh wallets and overview stats
      const [updatedWallets, updatedStats, updatedLedger] = await Promise.all([
        referralService.getCustomerWallets(),
        referralService.getOverviewStats(),
        referralService.getWalletTransactions(100),
      ]);
      setWallets(updatedWallets);
      setStats(updatedStats);
      setLedger(updatedLedger);
    } catch (err: any) {
      console.error('Wallet adjustment failed:', err);
      toast.error(err?.message || 'Failed to adjust coins');
    } finally {
      setIsAdjusting(false);
    }
  };

  // Tab 4: Filtered Ledger
  const filteredLedger = useMemo(() => {
    if (ledgerFilter === 'ALL') return ledger;
    return ledger.filter(item => {
      if (ledgerFilter === 'CREDIT') return item.type.includes('CREDIT') || item.amount > 0;
      if (ledgerFilter === 'DEBIT') return item.type.includes('DEBIT') || item.type.includes('REDEMPTION') || item.amount < 0;
      return item.type === ledgerFilter;
    });
  }, [ledger, ledgerFilter]);

  // Tab 5: Save Promo Coupon
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code) {
      toast.error('Coupon code is required');
      return;
    }

    setSavingCoupon(true);
    try {
      await referralService.saveCoupon(newCoupon);
      toast.success(`Coupon ${newCoupon.code.toUpperCase()} saved successfully!`);
      setIsCouponModalOpen(false);
      setNewCoupon({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 10,
        min_order_value: 999,
        max_discount_amount: 500,
        usage_limit: 100,
        is_active: true,
      });
      const updatedCoupons = await referralService.getCoupons();
      setCoupons(updatedCoupons);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save coupon');
    } finally {
      setSavingCoupon(false);
    }
  };

  // Tab 5: Toggle Coupon Status
  const handleToggleCoupon = async (coupon: CouponItem) => {
    try {
      await referralService.toggleCouponStatus(coupon.id, !coupon.is_active);
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c));
      toast.success(`Coupon ${coupon.code} ${!coupon.is_active ? 'activated' : 'paused'}`);
    } catch (err) {
      toast.error('Failed to update coupon status');
    }
  };

  // Tab 5: Delete Coupon
  const handleDeleteCoupon = async (couponId: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await referralService.deleteCoupon(couponId);
      setCoupons(prev => prev.filter(c => c.id !== couponId));
      toast.success('Coupon deleted');
    } catch (err) {
      toast.error('Failed to delete coupon');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & MASTER PROGRAM TOGGLE                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gold/20 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-maroon/10 text-maroon flex items-center justify-center border border-gold/30 shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                  Coupons &amp; Referrals Hub
                </h1>
                <Badge
                  variant={settings.is_active ? 'default' : 'secondary'}
                  className={settings.is_active ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-stone-200 text-stone-700'}
                >
                  {settings.is_active ? 'Program Active' : 'Program Paused'}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                Manage Banarasi Coins reward slabs, audit referral conversions, customer wallets, transactions ledger, and promo coupons.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleActive}
            className="flex items-center gap-2 cursor-pointer bg-white"
          >
            {settings.is_active ? (
              <>
                <ToggleRight className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-stone-800">Active</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-stone-400" />
                <span className="text-xs font-semibold text-stone-500">Paused</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadAll}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-maroon border-gold/30 hover:bg-gold/10 bg-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. STATS OVERVIEW CARDS                                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-gold/20 shadow-xs bg-white">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200/60">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-stone-500 font-medium block">Total Referrals</span>
              <span className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                {stats.totalReferrals}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gold/20 shadow-xs bg-white">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/60">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-stone-500 font-medium block">Qualified / Matured</span>
              <span className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                {stats.qualifiedReferrals}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gold/20 shadow-xs bg-white">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/60">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-stone-500 font-medium block">Total Coins Issued</span>
              <span className="text-xl sm:text-2xl font-serif font-bold text-amber-800">
                🪙 {stats.totalCoinsEarned.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gold/20 shadow-xs bg-white">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200/60">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-stone-500 font-medium block">Available in Wallets</span>
              <span className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                🪙 {stats.totalAvailableCoins.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. MULTI-TAB REFERRALS ARCHITECTURE                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="bg-stone-100 p-1 rounded-xl border border-stone-200 flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="settings" className="rounded-lg text-xs sm:text-sm font-medium py-2 px-3">
            <Sliders className="w-4 h-4 mr-1.5" />
            Reward &amp; Checkout Rules
          </TabsTrigger>
          <TabsTrigger value="sales-roi" className="rounded-lg text-xs sm:text-sm font-medium py-2 px-3">
            <TrendingUp className="w-4 h-4 mr-1.5" />
            Sales &amp; Net Revenue (ROI)
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-lg text-xs sm:text-sm font-medium py-2 px-3">
            <Clock className="w-4 h-4 mr-1.5" />
            Referral Activity Log ({referrals.length})
          </TabsTrigger>
          <TabsTrigger value="wallets" className="rounded-lg text-xs sm:text-sm font-medium py-2 px-3">
            <Users className="w-4 h-4 mr-1.5" />
            Customer Wallets ({wallets.length})
          </TabsTrigger>
          <TabsTrigger value="ledger" className="rounded-lg text-xs sm:text-sm font-medium py-2 px-3">
            <Coins className="w-4 h-4 mr-1.5" />
            Coin Ledger ({ledger.length})
          </TabsTrigger>
          <TabsTrigger value="coupons" className="rounded-lg text-xs sm:text-sm font-medium py-2 px-3">
            <Tag className="w-4 h-4 mr-1.5" />
            Promo Coupons ({coupons.length})
          </TabsTrigger>
        </TabsList>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 1: RULES & CONFIGURATION (referral_settings)              */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <TabsContent value="settings" className="space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* CARD 1: TIERED EARNING SLABS (7 COLS) */}
              <Card className="lg:col-span-7 border-gold/20 shadow-xs bg-white">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    <CardTitle className="text-lg font-serif">
                      Referrer Earning Slabs
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    When an invited friend places their first order, reward the referrer according to the order amount.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Tier 1 */}
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                        Tier 1 (Base Order)
                      </span>
                      <Badge variant="outline" className="text-[11px] bg-white">
                        Standard
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                          Min Order Value (₹)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="100"
                          value={settings.tier1_min_order}
                          onChange={(e) => setSettings({ ...settings, tier1_min_order: Number(e.target.value) })}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                          Reward Coins (🪙)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="10"
                          value={settings.tier1_reward_coins}
                          onChange={(e) => setSettings({ ...settings, tier1_reward_coins: Number(e.target.value) })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tier 2 */}
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                        Tier 2 (Mid-range Order)
                      </span>
                      <Badge variant="outline" className="text-[11px] bg-white">
                        Popular
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                          Min Order Value (₹)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="100"
                          value={settings.tier2_min_order}
                          onChange={(e) => setSettings({ ...settings, tier2_min_order: Number(e.target.value) })}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                          Reward Coins (🪙)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="10"
                          value={settings.tier2_reward_coins}
                          onChange={(e) => setSettings({ ...settings, tier2_reward_coins: Number(e.target.value) })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tier 3 */}
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                        Tier 3 (High-value Bridal Order)
                      </span>
                      <Badge variant="outline" className="text-[11px] bg-white">
                        Premium
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                          Min Order Value (₹)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="100"
                          value={settings.tier3_min_order}
                          onChange={(e) => setSettings({ ...settings, tier3_min_order: Number(e.target.value) })}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                          Reward Coins (🪙)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="10"
                          value={settings.tier3_reward_coins}
                          onChange={(e) => setSettings({ ...settings, tier3_reward_coins: Number(e.target.value) })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Visual Calculation Explanation */}
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                      Live Slabs Summary:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                      <li>Orders below ₹{settings.tier1_min_order}: 0 coins (protects low-margin products).</li>
                      <li>Orders between ₹{settings.tier1_min_order} and ₹{settings.tier2_min_order - 1}: {settings.tier1_reward_coins} Banarasi Coins.</li>
                      <li>Orders between ₹{settings.tier2_min_order} and ₹{settings.tier3_min_order - 1}: {settings.tier2_reward_coins} Banarasi Coins.</li>
                      <li>Orders above ₹{settings.tier3_min_order}: {settings.tier3_reward_coins} Banarasi Coins.</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* CARD 2: CHECKOUT REDEMPTION RULES (5 COLS) */}
              <div className="lg:col-span-5 space-y-6">
                <Card className="border-gold/20 shadow-xs bg-white">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Percent className="w-5 h-5 text-emerald-700" />
                      <CardTitle className="text-lg font-serif">
                        Checkout Spending Limits
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      Controls how customers can redeem their Banarasi Coins on future saree purchases.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-stone-700 block mb-1">
                        Max Cart Redemption Cap (%)
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="5"
                          max="100"
                          step="5"
                          value={settings.max_redemption_percent}
                          onChange={(e) => setSettings({ ...settings, max_redemption_percent: Number(e.target.value) })}
                          required
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-stone-400 font-bold">%</span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1">
                        Ensures customer pays at least {100 - settings.max_redemption_percent}% in real cash/online.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-stone-700 block mb-1">
                        Min Order Value to Redeem Coins (₹)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="100"
                        value={settings.min_order_for_redemption}
                        onChange={(e) => setSettings({ ...settings, min_order_for_redemption: Number(e.target.value) })}
                        required
                      />
                      <p className="text-[11px] text-stone-500 mt-1">
                        Customers cannot redeem coins on orders below this threshold.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-stone-700 block mb-1">
                        Return Window / Maturity (Days)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="30"
                        value={settings.return_window_days}
                        onChange={(e) => setSettings({ ...settings, return_window_days: Number(e.target.value) })}
                        required
                      />
                      <p className="text-[11px] text-stone-500 mt-1">
                        Days after order delivery before pending coins become available to spend.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full bg-maroon hover:bg-maroon-dark text-gold font-semibold h-11 shadow-md gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {savingSettings ? 'Saving Changes...' : 'Save Referral Rules'}
                </Button>
              </div>

            </div>
          </form>
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB: SALES & NET REVENUE (ROI) ANALYTICS                      */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <TabsContent value="sales-roi" className="space-y-6">
          {/* Period Filter & Search Bar */}
          <Card className="border-gold/20 shadow-xs bg-white">
            <CardHeader className="pb-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <CardTitle className="text-lg font-serif text-stone-900">
                      Referral Sales &amp; Net Revenue (ROI)
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    Calculate gross referral sales, reward coins &amp; discounts given to customers, and final net profit retained for your business.
                  </CardDescription>
                </div>

                {/* Date Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-stone-500 mr-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Period:
                  </span>
                  {[
                    { key: 'ALL', label: 'All Time' },
                    { key: 'TODAY', label: 'Today' },
                    { key: '7D', label: 'Last 7 Days' },
                    { key: '30D', label: 'Last 30 Days' },
                    { key: 'THIS_MONTH', label: 'This Month' },
                    { key: 'CUSTOM', label: 'Custom Range' },
                  ].map((preset) => (
                    <Button
                      key={preset.key}
                      type="button"
                      variant={roiDatePreset === preset.key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRoiDatePreset(preset.key as any)}
                      className={`h-7 px-2.5 text-xs font-medium cursor-pointer ${
                        roiDatePreset === preset.key
                          ? 'bg-maroon hover:bg-maroon-dark text-white border-maroon'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0 space-y-3">
              {/* Secondary Controls: Custom Date Pickers & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-stone-100">
                <div className="flex flex-wrap items-center gap-2.5">
                  {roiDatePreset === 'CUSTOM' && (
                    <div className="flex items-center gap-2 bg-amber-50/70 p-1.5 px-2.5 rounded-lg border border-amber-200/80">
                      <span className="text-[11px] font-semibold text-amber-900">From:</span>
                      <Input
                        type="date"
                        value={roiDateFrom}
                        onChange={(e) => setRoiDateFrom(e.target.value)}
                        className="h-7 w-36 text-xs bg-white"
                      />
                      <span className="text-[11px] font-semibold text-amber-900 ml-1">To:</span>
                      <Input
                        type="date"
                        value={roiDateTo}
                        onChange={(e) => setRoiDateTo(e.target.value)}
                        className="h-7 w-36 text-xs bg-white"
                      />
                    </div>
                  )}

                  <Badge variant="outline" className="text-xs bg-stone-50 border-stone-200 text-stone-600 font-normal">
                    Orders in period: <span className="font-bold text-stone-900 ml-1">{filteredRoiReferrals.length}</span>
                  </Badge>

                  {(roiDatePreset !== 'ALL' || roiDateFrom || roiDateTo || roiSearch) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRoiDatePreset('ALL');
                        setRoiDateFrom('');
                        setRoiDateTo('');
                        setRoiSearch('');
                      }}
                      className="h-7 text-xs text-stone-500 hover:text-stone-800 px-2 cursor-pointer"
                    >
                      Clear Filter
                    </Button>
                  )}
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <Input
                    placeholder="Filter by order # or customer..."
                    value={roiSearch}
                    onChange={(e) => setRoiSearch(e.target.value)}
                    className="h-8 pl-8 text-xs bg-stone-50/60"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4 Financial Impact Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Gross Referral Sales */}
            <Card className="border-blue-200/80 bg-gradient-to-br from-blue-50/50 to-white shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-900/80 uppercase tracking-wider">
                    Total Referral Sales (Gross)
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
                    ₹{roiSummary.grossSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    Generated from <span className="font-semibold text-stone-800">{roiSummary.ordersCount}</span> qualifying orders
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 2. Total Given to Customer */}
            <Card className="border-amber-200/80 bg-gradient-to-br from-amber-50/40 to-white shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-900/80 uppercase tracking-wider">
                    Given to Customers (Spend)
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-serif font-bold text-rose-600">
                    -₹{roiSummary.totalGivenToCustomer.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="flex flex-col gap-0.5 mt-1.5 text-[11px] text-stone-600">
                    <div className="flex items-center justify-between">
                      <span>🪙 Referrer Coins:</span>
                      <span className="font-medium text-stone-800">
                        {roiSummary.coinsGiven.toLocaleString('en-IN')} (₹{roiSummary.coinsGiven.toLocaleString('en-IN')})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>🏷️ Order Discounts:</span>
                      <span className="font-medium text-stone-800">
                        ₹{roiSummary.orderDiscountsGiven.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Net Revenue Retained */}
            <Card className="border-emerald-300 bg-gradient-to-br from-emerald-50 to-white shadow-sm ring-1 ring-emerald-500/20">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    Net Revenue Kept (Profit)
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-serif font-bold text-emerald-700">
                    ₹{roiSummary.netRevenueKept.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-0 text-[11px] font-semibold">
                      {roiSummary.netMarginPercent.toFixed(1)}% Net Retained
                    </Badge>
                    <span className="text-[11px] text-stone-400">after rewards</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 4. AOV & Cost Efficiency */}
            <Card className="border-purple-200/80 bg-gradient-to-br from-purple-50/40 to-white shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-900/80 uppercase tracking-wider">
                    Average Order Value (AOV)
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">
                    ₹{roiSummary.aov.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    Customer reward cost is <span className="font-semibold text-stone-800">{roiSummary.costPercent.toFixed(1)}%</span> of sales
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Itemized Table */}
          <Card className="border-gold/20 shadow-xs bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-serif text-stone-900 flex items-center gap-2">
                    <span>Itemized Referral Orders Audit</span>
                    <Badge variant="outline" className="text-xs font-mono">
                      {filteredRoiReferrals.length} Orders
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Detailed breakdown showing each referral order's gross total, coins issued, discount given, and the final net amount kept.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredRoiReferrals.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-stone-800">No referral orders found for this period</h3>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                    Try switching the date filter to "All Time" or adjust your custom date range and search term.
                  </p>
                  {(roiDatePreset !== 'ALL' || roiSearch) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRoiDatePreset('ALL');
                        setRoiSearch('');
                      }}
                      className="mt-3 text-xs"
                    >
                      Show All Time Orders
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-stone-50 border-y border-stone-200">
                      <TableRow>
                        <TableHead className="text-xs font-bold text-stone-700">Order # &amp; Date</TableHead>
                        <TableHead className="text-xs font-bold text-stone-700">Customer (Buyer)</TableHead>
                        <TableHead className="text-xs font-bold text-stone-700">Invited By (Referrer)</TableHead>
                        <TableHead className="text-xs font-bold text-stone-700 text-right">Gross Sales</TableHead>
                        <TableHead className="text-xs font-bold text-amber-800 text-right">Coins Given</TableHead>
                        <TableHead className="text-xs font-bold text-rose-800 text-right">Discount</TableHead>
                        <TableHead className="text-xs font-bold text-rose-900 text-right">Total Given</TableHead>
                        <TableHead className="text-xs font-bold text-emerald-800 text-right">Net Retained</TableHead>
                        <TableHead className="text-xs font-bold text-stone-700 text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRoiReferrals.map((r) => {
                        const gross = Number(r.order_total_amount || 0);
                        const coins = Number(r.reward_amount || 0);
                        const discount = Number(r.order_discount || 0);
                        const totalDeductions = coins + discount;
                        const netKept = gross - totalDeductions;
                        const orderDate = r.order_created_at || r.created_at;

                        return (
                          <TableRow key={r.id} className="hover:bg-stone-50/70 border-b border-stone-100 text-xs">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-stone-900">
                                  {r.order_number || (r.qualifying_order_id ? `#${r.qualifying_order_id.slice(0, 8)}` : 'Pending Order')}
                                </span>
                                {r.order_number && (
                                  <button
                                    type="button"
                                    onClick={(e) => copyCode(r.order_number || '', e)}
                                    className="text-stone-400 hover:text-stone-700"
                                    title="Copy order number"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <span className="text-[11px] text-stone-400 block mt-0.5">
                                {orderDate ? new Date(orderDate).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                }) : 'N/A'}
                              </span>
                            </TableCell>

                            <TableCell>
                              <div className="font-semibold text-stone-800">{r.referee_name || 'New Customer'}</div>
                              {r.referee_email && (
                                <span className="text-[11px] text-stone-400 block truncate max-w-[150px]">
                                  {r.referee_email}
                                </span>
                              )}
                            </TableCell>

                            <TableCell>
                              <div className="text-stone-800 font-medium">{r.referrer_name || 'Advocate'}</div>
                              {r.referrer_code && (
                                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 mt-0.5 bg-amber-50/50 text-amber-900 border-amber-200">
                                  {r.referrer_code}
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell className="text-right font-bold text-stone-900">
                              ₹{gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </TableCell>

                            <TableCell className="text-right font-medium text-amber-700">
                              🪙 {coins.toLocaleString('en-IN')}
                            </TableCell>

                            <TableCell className="text-right font-medium text-rose-600">
                              {discount > 0 ? `₹${discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                            </TableCell>

                            <TableCell className="text-right font-bold text-rose-700">
                              -₹{totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </TableCell>

                            <TableCell className="text-right font-bold text-emerald-700 bg-emerald-50/30">
                              ₹{netKept.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </TableCell>

                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={`text-[10px] uppercase font-semibold ${
                                  r.status === 'REWARDED'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : r.status === 'QUALIFIED'
                                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                                    : 'bg-stone-50 text-stone-700 border-stone-300'
                                }`}
                              >
                                {r.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>

                    {/* Table Grand Totals Footer */}
                    <tfoot>
                      <TableRow className="bg-stone-100 font-bold border-t-2 border-stone-300 text-xs text-stone-900">
                        <TableCell colSpan={3} className="py-3">
                          Total For Selected Period ({filteredRoiReferrals.length} Orders)
                        </TableCell>
                        <TableCell className="text-right py-3 text-stone-950 font-extrabold">
                          ₹{roiSummary.grossSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right py-3 text-amber-800">
                          🪙 {roiSummary.coinsGiven.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right py-3 text-rose-800">
                          ₹{roiSummary.orderDiscountsGiven.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right py-3 text-rose-900">
                          -₹{roiSummary.totalGivenToCustomer.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right py-3 text-emerald-800 font-extrabold bg-emerald-100/50">
                          ₹{roiSummary.netRevenueKept.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center py-3 text-stone-500 font-normal">
                          {roiSummary.netMarginPercent.toFixed(1)}% margin
                        </TableCell>
                      </TableRow>
                    </tfoot>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 2: REFERRAL ACTIVITY LOG (referrals)                       */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <TabsContent value="activity">
          <Card className="border-gold/20 shadow-xs bg-white">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-lg font-serif text-stone-900">
                  Referral Conversion Activity
                </CardTitle>
                <CardDescription className="text-xs">
                  Detailed audit of customer invitations, qualifying purchases, and reward releases.
                </CardDescription>
              </div>

              {/* Status Filter Chips & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
                  <Input
                    placeholder="Search referrer, friend, code..."
                    value={referralSearch}
                    onChange={(e) => setReferralSearch(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>

                <Select value={referralStatusFilter} onValueChange={setReferralStatusFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue placeholder="Status Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="QUALIFIED">Qualified (Pending)</SelectItem>
                    <SelectItem value="REWARDED">Rewarded</SelectItem>
                    <SelectItem value="REGISTERED">Registered Only</SelectItem>
                    <SelectItem value="VOIDED">Voided / Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent>
              {filteredReferrals.length === 0 ? (
                <div className="py-12 text-center text-stone-400 space-y-2">
                  <Coins className="w-10 h-10 mx-auto text-stone-300" />
                  <p className="text-sm font-semibold text-stone-600">No Referrals Found</p>
                  <p className="text-xs text-stone-400">
                    {referralSearch ? 'Try clearing your search query or filter.' : 'When customers invite friends, their conversions will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-stone-200/80 rounded-xl">
                  <Table>
                    <TableHeader className="bg-stone-50">
                      <TableRow>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Referrer (Invited By)</TableHead>
                        <TableHead className="text-xs">Referral Code</TableHead>
                        <TableHead className="text-xs">Referee (Customer)</TableHead>
                        <TableHead className="text-xs">Order Ref</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs text-right">Coins</TableHead>
                        <TableHead className="text-xs text-right">Admin Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReferrals.map((log) => (
                        <TableRow key={log.id} className="hover:bg-cream/20 transition-colors">
                          <TableCell className="text-xs text-stone-500 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-stone-900">
                            {log.referrer_name}
                          </TableCell>
                          <TableCell className="text-xs font-mono font-bold text-maroon">
                            <span
                              onClick={(e) => copyCode(log.referrer_code || '', e)}
                              className="inline-flex items-center gap-1 cursor-pointer hover:underline"
                              title="Click to copy"
                            >
                              {log.referrer_code || '—'}
                              {log.referrer_code && <Copy className="w-2.5 h-2.5 text-stone-400" />}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-stone-700">
                            {log.referee_name}
                            {log.referee_email && (
                              <span className="block text-[10px] text-stone-400">{log.referee_email}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-stone-600">
                            {log.order_number ? (
                              <span className="bg-stone-100 px-1.5 py-0.5 rounded text-[11px] font-semibold text-stone-800">
                                #{log.order_number}
                              </span>
                            ) : log.qualifying_order_id ? (
                              <span className="text-[10px] text-stone-400">Order #{log.qualifying_order_id.slice(0, 8)}</span>
                            ) : (
                              <span className="text-stone-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                log.status === 'REWARDED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : log.status === 'QUALIFIED'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : log.status === 'VOIDED'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-stone-50 text-stone-600 border-stone-200'
                              }
                            >
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-xs text-amber-700">
                            {log.reward_amount > 0 ? `🪙 ${log.reward_amount}` : '—'}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {log.status !== 'REWARDED' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={updatingReferralId === log.id}
                                  onClick={() => handleStatusChange(log.id, 'REWARDED')}
                                  className="h-7 px-2 text-[11px] text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                  title="Manually release coin reward"
                                >
                                  Release Coins
                                </Button>
                              )}
                              {log.status !== 'VOIDED' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={updatingReferralId === log.id}
                                  onClick={() => handleStatusChange(log.id, 'VOIDED')}
                                  className="h-7 px-2 text-[11px] text-red-600 hover:bg-red-50 hover:text-red-700"
                                  title="Void this referral reward"
                                >
                                  Void
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 3: CUSTOMER WALLETS & ADVOCATES (user_wallets + profiles) */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <TabsContent value="wallets" className="space-y-6">
          {/* Top Advocates Leaderboard Cards */}
          {topAdvocates.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topAdvocates.map((advocate, idx) => (
                <div
                  key={advocate.user_id}
                  className="bg-gradient-to-br from-white to-stone-50 p-4 rounded-xl border border-gold/30 shadow-xs relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-maroon flex items-center gap-1.5">
                      <Award className={`w-4 h-4 ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : 'text-amber-700'}`} />
                      Advocate #{idx + 1}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800">
                      {advocate.total_referrals} Referrals
                    </Badge>
                  </div>
                  <p className="font-bold text-stone-900 text-sm truncate">{advocate.full_name}</p>
                  <p className="text-xs text-stone-500 truncate">{advocate.email || advocate.phone_number || advocate.referral_code}</p>
                  <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="text-stone-500">Total Coins Earned:</span>
                    <span className="font-mono font-bold text-amber-800">🪙 {advocate.total_earned.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Wallets Table */}
          <Card className="border-gold/20 shadow-xs bg-white">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-lg font-serif text-stone-900">
                  Customer Coin Balances
                </CardTitle>
                <CardDescription className="text-xs">
                  Review customer wallets, lifetime coin earnings, and perform manual credits or debits.
                </CardDescription>
              </div>

              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
                <Input
                  placeholder="Search customer, code, email..."
                  value={walletSearch}
                  onChange={(e) => setWalletSearch(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </CardHeader>

            <CardContent>
              {filteredWallets.length === 0 ? (
                <div className="py-12 text-center text-stone-400 space-y-2">
                  <Users className="w-10 h-10 mx-auto text-stone-300" />
                  <p className="text-sm font-semibold text-stone-600">No Customer Wallets Found</p>
                  <p className="text-xs text-stone-400">
                    When customers register or earn coins, their wallets will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-stone-200/80 rounded-xl">
                  <Table>
                    <TableHeader className="bg-stone-50">
                      <TableRow>
                        <TableHead className="text-xs">Customer Name</TableHead>
                        <TableHead className="text-xs">Referral Code</TableHead>
                        <TableHead className="text-xs text-center">Referrals</TableHead>
                        <TableHead className="text-xs text-right">Available Balance</TableHead>
                        <TableHead className="text-xs text-right">Pending Cooling</TableHead>
                        <TableHead className="text-xs text-right">Lifetime Earned</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWallets.map((wallet) => (
                        <TableRow key={wallet.user_id} className="hover:bg-cream/20 transition-colors">
                          <TableCell className="text-xs font-medium text-stone-900">
                            <div>
                              <span className="font-semibold text-stone-800">{wallet.full_name}</span>
                              <span className="block text-[11px] text-stone-400">
                                {wallet.email || wallet.phone_number || '—'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-mono font-bold text-maroon">
                            {wallet.referral_code ? (
                              <button
                                type="button"
                                onClick={(e) => copyCode(wallet.referral_code || '', e)}
                                className="inline-flex items-center gap-1 bg-stone-100 px-2 py-0.5 rounded text-stone-800 hover:bg-gold/20 transition-colors cursor-pointer"
                                title="Click to copy code"
                              >
                                {wallet.referral_code}
                                <Copy className="w-2.5 h-2.5 text-stone-400" />
                              </button>
                            ) : (
                              <span className="text-stone-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-center font-bold text-stone-700">
                            {wallet.total_referrals > 0 ? (
                              <Badge variant="secondary" className="font-mono text-xs">
                                {wallet.total_referrals}
                              </Badge>
                            ) : (
                              '0'
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono font-bold text-emerald-700">
                            🪙 {wallet.available_balance.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono text-amber-700">
                            {wallet.pending_balance > 0 ? `🪙 ${wallet.pending_balance.toLocaleString()}` : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono font-bold text-stone-800">
                            🪙 {wallet.total_earned.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setAdjustingWallet(wallet);
                                setAdjustAmount('');
                                setAdjustType('credit');
                                setAdjustReason('');
                              }}
                              className="h-7 px-2.5 text-xs font-medium border-gold/40 text-maroon hover:bg-gold/10"
                            >
                              Adjust Coins
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 4: COIN TRANSACTION LEDGER (wallet_transactions)          */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <TabsContent value="ledger">
          <Card className="border-gold/20 shadow-xs bg-white">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-lg font-serif text-stone-900">
                  Coin Flow Ledger
                </CardTitle>
                <CardDescription className="text-xs">
                  Financial record of all Banarasi Coins earned from referrals, redeemed at checkout, or adjusted.
                </CardDescription>
              </div>

              <Select value={ledgerFilter} onValueChange={setLedgerFilter}>
                <SelectTrigger className="w-[170px] h-9 text-xs">
                  <SelectValue placeholder="Transaction Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Transactions</SelectItem>
                  <SelectItem value="CREDIT">Credits (Earned / Bonus)</SelectItem>
                  <SelectItem value="DEBIT">Debits (Redeemed / Deducted)</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>

            <CardContent>
              {filteredLedger.length === 0 ? (
                <div className="py-12 text-center text-stone-400 space-y-2">
                  <Coins className="w-10 h-10 mx-auto text-stone-300" />
                  <p className="text-sm font-semibold text-stone-600">No Coin Transactions Yet</p>
                  <p className="text-xs text-stone-400">
                    When customers earn or redeem coins, every event will be logged here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-stone-200/80 rounded-xl">
                  <Table>
                    <TableHeader className="bg-stone-50">
                      <TableRow>
                        <TableHead className="text-xs">Timestamp</TableHead>
                        <TableHead className="text-xs">Customer</TableHead>
                        <TableHead className="text-xs">Transaction Event</TableHead>
                        <TableHead className="text-xs text-right">Coins In / Out</TableHead>
                        <TableHead className="text-xs text-right">Balance After</TableHead>
                        <TableHead className="text-xs">Notes / Order Ref</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLedger.map((tx) => {
                        const isCredit = tx.amount >= 0;
                        return (
                          <TableRow key={tx.id} className="hover:bg-cream/20 transition-colors">
                            <TableCell className="text-xs text-stone-500 whitespace-nowrap">
                              {new Date(tx.created_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-stone-800">
                              {tx.customer_name}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  isCredit
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-stone-50 text-stone-700 border-stone-200'
                                }
                              >
                                {tx.type.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-right font-mono font-bold text-xs ${isCredit ? 'text-emerald-700' : 'text-stone-700'}`}>
                              {isCredit ? `+${tx.amount} 🪙` : `${tx.amount} 🪙`}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-stone-600">
                              {tx.balance_after !== undefined ? `🪙 ${tx.balance_after.toLocaleString()}` : '—'}
                            </TableCell>
                            <TableCell className="text-xs text-stone-500">
                              {tx.description || tx.order_number || (tx.reference_order_id ? `Order #${tx.reference_order_id.slice(0, 8)}` : '—')}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 5: PROMO COUPONS (coupons)                                */}
        {/* ═════════════════════════════════════════════════════════════ */}
        <TabsContent value="coupons" className="space-y-6">
          <Card className="border-gold/20 shadow-xs bg-white">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-lg font-serif text-stone-900">
                  Promo Coupons
                </CardTitle>
                <CardDescription className="text-xs">
                  Create and manage instant checkout coupon codes for seasonal campaigns or special discounts.
                </CardDescription>
              </div>

              <Button
                size="sm"
                onClick={() => setIsCouponModalOpen(true)}
                className="bg-maroon hover:bg-maroon-dark text-gold gap-1.5 h-9 text-xs font-semibold cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Create New Coupon
              </Button>
            </CardHeader>

            <CardContent>
              {coupons.length === 0 ? (
                <div className="py-12 text-center text-stone-400 space-y-3">
                  <Tag className="w-10 h-10 mx-auto text-stone-300" />
                  <p className="text-sm font-semibold text-stone-600">No Promo Coupons Configured</p>
                  <p className="text-xs text-stone-400 max-w-sm mx-auto">
                    Coupons allow customers to apply a flat or percentage discount at checkout.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsCouponModalOpen(true)}
                    className="border-gold/40 text-maroon gap-1.5 text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create First Coupon
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {coupons.map((c) => (
                    <div
                      key={c.id}
                      className="bg-stone-50/70 border border-stone-200/90 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-gold/40 transition-colors"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span
                            onClick={(e) => copyCode(c.code, e)}
                            className="font-mono font-bold text-base text-maroon tracking-wider bg-white px-2 py-0.5 rounded border border-gold/20 cursor-pointer hover:bg-gold/10 inline-flex items-center gap-1.5"
                            title="Click to copy code"
                          >
                            {c.code}
                            <Copy className="w-3 h-3 text-stone-400" />
                          </span>
                          <Badge
                            variant={c.is_active ? 'default' : 'secondary'}
                            className={c.is_active ? 'bg-emerald-600 text-white text-[10px]' : 'bg-stone-200 text-stone-700 text-[10px]'}
                          >
                            {c.is_active ? 'Active' : 'Paused'}
                          </Badge>
                        </div>
                        {c.description && (
                          <p className="text-xs text-stone-600">{c.description}</p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-stone-200/60 space-y-1 text-xs text-stone-600">
                        <div className="flex justify-between">
                          <span>Discount:</span>
                          <span className="font-bold text-stone-900">
                            {c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`}
                            {c.max_discount_amount && ` (Max ₹${c.max_discount_amount})`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Min Cart Value:</span>
                          <span className="font-medium text-stone-800">₹{c.min_order_value}</span>
                        </div>
                        {c.expires_at && (
                          <div className="flex justify-between text-[11px] text-stone-400">
                            <span>Expires:</span>
                            <span>{new Date(c.expires_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 flex items-center justify-between gap-2 border-t border-stone-200/60">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleCoupon(c)}
                          className="text-xs h-7 px-2 font-medium text-stone-600 hover:text-stone-900"
                        >
                          {c.is_active ? 'Pause Coupon' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCoupon(c.id)}
                          className="text-xs h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: MANUAL COIN ADJUSTMENT                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={!!adjustingWallet} onOpenChange={(open) => !open && setAdjustingWallet(null)}>
        <DialogContent className="max-w-md bg-white border-gold/20 shadow-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-serif text-maroon flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-600" />
              Adjust Banarasi Coins
            </DialogTitle>
            <DialogDescription className="text-xs">
              Manually credit or debit coins for <span className="font-semibold text-stone-800">{adjustingWallet?.full_name}</span>.
            </DialogDescription>
          </DialogHeader>

          {adjustingWallet && (
            <form onSubmit={handleAdjustWallet} className="space-y-4 pt-2">
              <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80 text-xs flex justify-between">
                <div>
                  <span className="text-stone-500 block">Current Available:</span>
                  <span className="font-bold text-emerald-700 font-mono text-sm">
                    🪙 {adjustingWallet.available_balance.toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-stone-500 block">Customer ID:</span>
                  <span className="font-mono text-[11px] text-stone-600">#{adjustingWallet.user_id.slice(0, 8)}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Adjustment Action
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={adjustType === 'credit' ? 'default' : 'outline'}
                    onClick={() => setAdjustType('credit')}
                    className={`h-9 text-xs font-semibold cursor-pointer ${adjustType === 'credit' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Credit Coins (+)
                  </Button>
                  <Button
                    type="button"
                    variant={adjustType === 'debit' ? 'default' : 'outline'}
                    onClick={() => setAdjustType('debit')}
                    className={`h-9 text-xs font-semibold cursor-pointer ${adjustType === 'debit' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Debit Coins (-)
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Number of Coins
                </label>
                <Input
                  type="number"
                  min="1"
                  step="10"
                  placeholder="e.g. 150"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Reason / Audit Note
                </label>
                <Input
                  placeholder="e.g. Goodwill gesture for delivery delay"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  required
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  This reason will be recorded in the coin ledger for audit tracking.
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAdjustingWallet(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isAdjusting}
                  size="sm"
                  className="bg-maroon hover:bg-maroon-dark text-gold font-semibold"
                >
                  {isAdjusting ? 'Updating...' : `Confirm ${adjustType === 'credit' ? 'Credit' : 'Debit'}`}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: CREATE PROMO COUPON                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={isCouponModalOpen} onOpenChange={setIsCouponModalOpen}>
        <DialogContent className="max-w-md bg-white border-gold/20 shadow-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-serif text-maroon flex items-center gap-2">
              <Tag className="w-5 h-5 text-maroon" />
              Create Promo Coupon
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure a new coupon discount for website checkout.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCoupon} className="space-y-3.5 pt-2">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Coupon Code
              </label>
              <Input
                placeholder="e.g. WELCOME10, FESTIVE500"
                value={newCoupon.code}
                onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                required
                className="font-mono uppercase font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Description / Campaign
              </label>
              <Input
                placeholder="e.g. 10% off on all bridal sarees"
                value={newCoupon.description}
                onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Discount Type
                </label>
                <Select
                  value={newCoupon.discount_type}
                  onValueChange={(val: 'percentage' | 'fixed') => setNewCoupon({ ...newCoupon, discount_type: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Flat Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Discount Value
                </label>
                <Input
                  type="number"
                  min="1"
                  value={newCoupon.discount_value}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Min Cart Value (₹)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={newCoupon.min_order_value}
                  onChange={(e) => setNewCoupon({ ...newCoupon, min_order_value: Number(e.target.value) })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Max Cap (₹, Optional)
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Optional limit"
                  value={newCoupon.max_discount_amount || ''}
                  onChange={(e) => setNewCoupon({ ...newCoupon, max_discount_amount: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Usage Limit (Optional)
                </label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Total uses allowed"
                  value={newCoupon.usage_limit || ''}
                  onChange={(e) => setNewCoupon({ ...newCoupon, usage_limit: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Expiry Date (Optional)
                </label>
                <Input
                  type="date"
                  value={newCoupon.expires_at ? newCoupon.expires_at.slice(0, 10) : ''}
                  onChange={(e) => setNewCoupon({ ...newCoupon, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCouponModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingCoupon}
                size="sm"
                className="bg-maroon hover:bg-maroon-dark text-gold font-semibold"
              >
                {savingCoupon ? 'Saving...' : 'Create Coupon'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
