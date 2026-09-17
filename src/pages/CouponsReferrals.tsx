import React, { useState, useEffect } from 'react';
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
  ToggleRight
} from 'lucide-react';
import { toast } from 'sonner';
import {
  referralService,
  DEFAULT_REFERRAL_SETTINGS,
} from '@/services/referralService';
import type {
  ReferralSettings,
  ReferralLogItem
} from '@/services/referralService';

export default function CouponsReferralsPage() {
  const [settings, setSettings] = useState<ReferralSettings>(DEFAULT_REFERRAL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    qualifiedReferrals: 0,
    totalCoinsEarned: 0,
    totalAvailableCoins: 0,
    totalPendingCoins: 0,
  });
  const [recentLogs, setRecentLogs] = useState<ReferralLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Load Settings and Stats
  const loadAll = async () => {
    setLoading(true);
    try {
      const [fetchedSettings, fetchedStats, fetchedLogs] = await Promise.all([
        referralService.getSettings(),
        referralService.getOverviewStats(),
        referralService.getRecentReferrals(20),
      ]);
      setSettings(fetchedSettings);
      setStats(fetchedStats);
      setRecentLogs(fetchedLogs);
    } catch (err) {
      console.error('Failed to load referral data:', err);
      toast.error('Failed to load referral settings');
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
    setSaving(true);
    try {
      const updated = await referralService.saveSettings(settings);
      setSettings(updated);
      toast.success('Referral settings updated successfully!');
    } catch (err: any) {
      console.error('Error updating settings:', err);
      toast.error(err?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Toggle active status
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

  return (
    <div className="space-y-6">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & PROGRAM TOGGLE                               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gold/20 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-maroon/10 text-maroon flex items-center justify-center border border-gold/30">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                  Coupons &amp; Referrals
                </h1>
                <Badge
                  variant={settings.is_active ? 'default' : 'secondary'}
                  className={settings.is_active ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-stone-200 text-stone-700'}
                >
                  {settings.is_active ? 'Program Active' : 'Program Paused'}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                Configure Banarasi Coins reward slabs, checkout redemption caps, and monitor referral earnings.
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
            className="flex items-center gap-2 cursor-pointer"
          >
            {settings.is_active ? (
              <>
                <ToggleRight className="w-4 h-4 text-emerald-600" />
                <span>Pause Program</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-stone-400" />
                <span>Activate Program</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadAll}
            disabled={loading}
            className="cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. OVERVIEW METRICS CARDS                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-gold/20 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200/60">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-stone-500 font-medium block">Total Invited</span>
              <span className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                {stats.totalReferrals}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gold/20 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/60">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-stone-500 font-medium block">Qualified Orders</span>
              <span className="text-xl sm:text-2xl font-serif font-bold text-emerald-700">
                {stats.qualifiedReferrals}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gold/20 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/60">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-stone-500 font-medium block">Total Coins Issued</span>
              <span className="text-xl sm:text-2xl font-serif font-bold text-amber-800">
                🪙 ₹{stats.totalCoinsEarned}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gold/20 shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200/60">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-stone-500 font-medium block">Available in Wallets</span>
              <span className="text-xl sm:text-2xl font-serif font-bold text-stone-900">
                ₹{stats.totalAvailableCoins}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. TABS: SETTINGS & LEDGER ACTIVITY                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="bg-stone-100 p-1 rounded-xl border border-stone-200">
          <TabsTrigger value="settings" className="rounded-lg text-xs sm:text-sm font-medium">
            <Sliders className="w-4 h-4 mr-2" />
            Reward &amp; Checkout Rules
          </TabsTrigger>
          <TabsTrigger value="activity" className="rounded-lg text-xs sm:text-sm font-medium">
            <Clock className="w-4 h-4 mr-2" />
            Referral Activity Log ({recentLogs.length})
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: SETTINGS FORM                                          */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="settings" className="space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* CARD 1: TIERED EARNING SLABS (7 COLS) */}
              <Card className="lg:col-span-7 border-gold/20 shadow-xs">
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
                <Card className="border-gold/20 shadow-xs">
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

                {/* Save Button */}
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full py-6 bg-maroon hover:bg-maroon-dark text-white font-semibold text-sm shadow-md cursor-pointer"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Saving Configuration...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Referral Rules
                    </>
                  )}
                </Button>
              </div>

            </div>
          </form>
        </TabsContent>

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: RECENT REFERRALS ACTIVITY TABLE                        */}
        {/* ------------------------------------------------------------- */}
        <TabsContent value="activity">
          <Card className="border-gold/20 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-serif">
                  Recent Referral Activity
                </CardTitle>
                <CardDescription className="text-xs">
                  Tracks friends invited and orders that qualified for Banarasi Coins.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadAll}
                disabled={loading}
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardHeader>

            <CardContent>
              {recentLogs.length === 0 ? (
                <div className="py-12 text-center text-stone-400 space-y-2">
                  <Coins className="w-10 h-10 mx-auto text-stone-300" />
                  <p className="text-sm font-semibold text-stone-600">No Referral Activity Yet</p>
                  <p className="text-xs text-stone-400">
                    When customers share their referral link and friends register, activity will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Referrer (Invited By)</TableHead>
                        <TableHead>Referral Code</TableHead>
                        <TableHead>Referee (Customer)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Coins Awarded</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentLogs.map((log) => (
                        <TableRow key={log.id}>
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
                            {log.referrer_code || '—'}
                          </TableCell>
                          <TableCell className="text-xs text-stone-700">
                            {log.referee_name}
                            {log.referee_email && (
                              <span className="block text-[10px] text-stone-400">{log.referee_email}</span>
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
                                  : 'bg-stone-50 text-stone-600 border-stone-200'
                              }
                            >
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-xs text-amber-700">
                            {log.reward_amount > 0 ? `🪙 ${log.reward_amount}` : '—'}
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
      </Tabs>
    </div>
  );
}
