import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
    Loader2,
    KeyRound,
    Eye,
    EyeOff,
    QrCode,
    Plus,
    Trash2,
    ShieldCheck,
    LogOut,
    Database,
    Wifi,
    Terminal,
    Settings,
    Activity,
    CheckCircle,
    RefreshCw,
    ChevronRight
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useAuthStore } from '@/store/useAuthStore';
import { settingsService, type UpiSetting } from '@/services/settingsService';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';


const passwordSchema = z.object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
    const [activeTab, setActiveTab] = React.useState<'security' | 'payments' | 'system'>('security');
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

    const { logout, user } = useAuthStore();
    const isStaff = user?.role === 'staff';
    const queryClient = useQueryClient();

    const [upiSettings, setUpiSettings] = React.useState<UpiSetting[]>([]);
    const [isLoadingUpi, setIsLoadingUpi] = React.useState(true);
    const [newUpiId, setNewUpiId] = React.useState('');
    const [newUpiLabel, setNewUpiLabel] = React.useState('');
    const [isSavingUpi, setIsSavingUpi] = React.useState(false);

    const fetchUpiSettings = async () => {
        setIsLoadingUpi(true);
        try {
            const data = await settingsService.getUpiSettings();
            setUpiSettings(data);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to load UPI configurations');
        } finally {
            setIsLoadingUpi(false);
        }
    };

    React.useEffect(() => {
        fetchUpiSettings();
    }, []);

    const handleAddUpi = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isStaff) {
            toast.error('Unauthorized: Staff cannot add UPI addresses');
            return;
        }
        if (!newUpiId || !newUpiLabel) {
            toast.error('Both UPI ID and label are required');
            return;
        }
        setIsSavingUpi(true);
        try {
            await settingsService.saveUpiSetting({
                upi_id: newUpiId.trim(),
                label: newUpiLabel.trim(),
                is_active: true
            });
            toast.success('UPI configuration added!');
            setNewUpiId('');
            setNewUpiLabel('');
            fetchUpiSettings();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save UPI ID');
        } finally {
            setIsSavingUpi(false);
        }
    };

    const handleToggleActive = async (setting: UpiSetting) => {
        if (isStaff) {
            toast.error('Unauthorized: Staff cannot modify UPI configurations');
            return;
        }
        try {
            await settingsService.saveUpiSetting({
                id: setting.id,
                upi_id: setting.upi_id,
                label: setting.label,
                is_active: !setting.is_active
            });
            toast.success(`UPI status updated: ${setting.label}`);
            fetchUpiSettings();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to update status');
        }
    };

    const handleDeleteUpi = async (id: string, label: string) => {
        if (isStaff) {
            toast.error('Unauthorized: Staff cannot delete UPI configurations');
            return;
        }
        if (upiSettings.length <= 1) {
            toast.error('Must keep at least one UPI configuration.');
            return;
        }
        if (!confirm(`Are you sure you want to delete "${label}"?`)) return;
        try {
            await settingsService.deleteUpiSetting(id);
            toast.success('UPI configuration deleted');
            fetchUpiSettings();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to delete configuration');
        }
    };

    const form = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema) as any,
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    });

    const onSubmit = async (data: PasswordFormValues) => {
        try {
            const { error } = await supabase.auth.updateUser({
                password: data.password,
            });

            if (error) {
                toast.error(error.message);
            } else {
                toast.success('Password updated successfully! Logging out...');
                form.reset();
                setTimeout(() => {
                    logout();
                }, 1500);
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to update password');
        }
    };

    const handleClearCache = () => {
        queryClient.clear();
        toast.success('Application Cache Flushed! Refreshing data from Database...');
        window.location.reload();
    };

    const activeTerminals = upiSettings.filter(s => s.is_active).length;

    const kpis = [
        { label: 'Active Terminals', value: `${activeTerminals}`, sub: 'Live QR gateways', icon: QrCode, from: 'from-emerald-500', to: 'to-emerald-700', text: 'text-emerald-700' },
        { label: 'Registered Terminals', value: `${upiSettings.length}`, sub: 'Total UPI accounts', icon: Database, from: 'from-slate-600', to: 'to-slate-800', text: 'text-gray-800' },
        { label: 'Security Level', value: isStaff ? 'Standard' : 'Super Admin', sub: 'Operator clearance', icon: ShieldCheck, from: 'from-maroon', to: 'to-maroon-dark', text: 'text-maroon' },
        { label: 'Session Status', value: 'Synchronized', sub: 'Live DB connection', icon: Wifi, from: 'from-amber-400', to: 'to-amber-600', text: 'text-gray-800' },
    ];

    const navItems = [
        { key: 'security' as const, icon: KeyRound, title: 'Security & Credentials', sub: 'Password & access' },
        { key: 'payments' as const, icon: QrCode, title: 'UPI Payment Terminals', sub: 'QR checkout accounts' },
        { key: 'system' as const, icon: Terminal, title: 'Diagnostics & Audits', sub: 'Runtime & cache' },
    ];

    return (
        <motion.div
            className="space-y-5 max-w-7xl mx-auto px-2 pb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-maroon to-maroon-dark text-gold rounded-xl shadow-md shadow-maroon/20">
                        <Settings className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold font-serif text-maroon tracking-wide">System Settings & Configurations</h1>
                        <p className="text-xs text-gray-500 font-sans">Manage operator security, checkout terminals, and database caches</p>
                    </div>
                </div>
            </div>

            {/* 4-Metric Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpis.map((s, i) => (
                    <motion.div key={s.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}>
                        <Card className="border-gold/20 shadow-sm hover:shadow-md transition-shadow bg-white">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">{s.label}</span>
                                    <span className={cn("text-xl font-bold font-mono block", s.text)}>{s.value}</span>
                                    <span className="text-[10px] text-gray-400 block">{s.sub}</span>
                                </div>
                                <div className={cn("p-2.5 bg-gradient-to-br text-white rounded-xl shadow", s.from, s.to)}>
                                    <s.icon className="h-5 w-5" />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Layout Grid: Left Navigation / Right Form panels */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

                {/* Left Side: Profile Info Card & Vertical Navigation (4 cols) */}
                <div className="lg:col-span-4 space-y-4">
                    {/* User Profile Card */}
                    <Card className="border-gold/15 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <CardHeader className="bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/10 p-3.5 flex flex-row items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-maroon to-maroon-dark text-gold flex items-center justify-center font-black text-sm border border-gold/25 shadow-md shadow-maroon/20">
                                {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-xs font-black text-maroon truncate uppercase font-serif tracking-wide">
                                    {user?.email?.split('@')[0] || 'Operator'}
                                </h3>
                                <p className="text-[9px] text-gray-400 font-mono truncate">{user?.email}</p>
                            </div>
                            <span className={cn(
                                "text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border flex-shrink-0",
                                isStaff
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-green-50 text-green-700 border-green-200"
                            )}>
                                {user?.role || 'operator'}
                            </span>
                        </CardHeader>
                        <CardContent className="p-3 text-[10px] space-y-2 bg-cream-light/5 text-gray-500">
                            <div className="flex justify-between items-center">
                                <span>Security Level:</span>
                                <span className="font-bold text-gray-700 flex items-center gap-1">
                                    <ShieldCheck className="h-3 w-3 text-green-600" />
                                    {isStaff ? 'Standard Operator' : 'Super Administrator'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center border-t border-gold/5 pt-2">
                                <span>Session Status:</span>
                                <span className="font-bold text-emerald-600 flex items-center gap-0.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    Synchronized
                                </span>
                            </div>
                            <div className="pt-2 border-t border-gold/5">
                                <Button
                                    onClick={() => logout()}
                                    className="h-7 w-full text-[9px] font-bold uppercase tracking-wider bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 gap-1 rounded-md cursor-pointer"
                                >
                                    <LogOut className="h-3 w-3" />
                                    Terminate Session
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Navigation Tab Links */}
                    <Card className="border-gold/15 bg-white shadow-sm overflow-hidden p-1.5 space-y-1 hover:shadow-md transition-shadow">
                        {navItems.map((item) => (
                            <button
                                key={item.key}
                                onClick={() => setActiveTab(item.key)}
                                className={cn(
                                    "w-full text-left p-2.5 rounded-lg transition-all flex items-center gap-2.5 text-xs cursor-pointer group",
                                    activeTab === item.key
                                        ? "bg-gradient-to-r from-maroon to-maroon-dark text-gold font-bold shadow-md shadow-maroon/20"
                                        : "text-gray-600 hover:bg-cream/10"
                                )}
                            >
                                <div className={cn(
                                    "p-2 rounded-lg transition-all flex-shrink-0",
                                    activeTab === item.key
                                        ? "bg-gold/15 text-gold"
                                        : "bg-cream/40 text-maroon group-hover:bg-gold/10"
                                )}>
                                    <item.icon className="h-3.5 w-3.5" />
                                </div>
                                <span className="flex-1 min-w-0">
                                    <span className="block truncate text-[11px]">{item.title}</span>
                                    <span className={cn(
                                        "block truncate text-[9px] normal-case",
                                        activeTab === item.key ? "text-gold/70" : "text-gray-400"
                                    )}>
                                        {item.sub}
                                    </span>
                                </span>
                                <ChevronRight className={cn(
                                    "h-3.5 w-3.5 flex-shrink-0 transition-transform",
                                    activeTab === item.key ? "text-gold" : "text-gray-300 group-hover:translate-x-0.5"
                                )} />
                            </button>
                        ))}
                    </Card>
                </div>

                {/* Right Side: Tab Forms Pane (8 cols) */}
                <div className="lg:col-span-8">
                    <AnimatePresence mode="wait">
                        {activeTab === 'security' && (
                            <motion.div
                                key="security"
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.15 }}
                            >
                                <Card className="border-gold/20 shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden">
                                    <CardHeader className="bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/10 p-4 flex flex-row items-center gap-2.5">
                                        <div className="p-2 bg-maroon/5 text-maroon rounded-lg border border-gold/20">
                                            <KeyRound className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold text-maroon tracking-wider uppercase">Credentials Security</CardTitle>
                                            <CardDescription className="text-[10px] text-gray-400 mt-0.5">Update password credentials for your security profile</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-5">
                                        <Form {...form}>
                                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                                <FormField
                                                    control={form.control}
                                                    name="password"
                                                    render={({ field }) => (
                                                        <FormItem className="space-y-1">
                                                            <FormLabel className="text-[10px] font-bold text-gray-500 uppercase">New Password *</FormLabel>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <Input
                                                                        type={showPassword ? 'text' : 'password'}
                                                                        placeholder="••••••••"
                                                                        {...field}
                                                                        className="h-9 text-xs border-gold/25 focus-visible:ring-maroon pr-10 bg-white"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setShowPassword(!showPassword)}
                                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-maroon transition-colors cursor-pointer"
                                                                    >
                                                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                                    </button>
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={form.control}
                                                    name="confirmPassword"
                                                    render={({ field }) => (
                                                        <FormItem className="space-y-1">
                                                            <FormLabel className="text-[10px] font-bold text-gray-500 uppercase">Confirm New Password *</FormLabel>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <Input
                                                                        type={showConfirmPassword ? 'text' : 'password'}
                                                                        placeholder="••••••••"
                                                                        {...field}
                                                                        className="h-9 text-xs border-gold/25 focus-visible:ring-maroon pr-10 bg-white"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-maroon transition-colors cursor-pointer"
                                                                    >
                                                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                                    </button>
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                <Button
                                                    type="submit"
                                                    className="bg-gradient-to-r from-maroon to-maroon-dark hover:from-maroon-dark hover:to-maroon-dark text-gold font-bold w-full h-9 text-[11px] uppercase tracking-wider shadow-md shadow-maroon/20 cursor-pointer"
                                                    disabled={form.formState.isSubmitting}
                                                >
                                                    {form.formState.isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                                                    Commit Password Update
                                                </Button>
                                            </form>
                                        </Form>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {activeTab === 'payments' && (
                            <motion.div
                                key="payments"
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-3.5"
                            >
                                <Card className="border-gold/20 shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden">
                                    <CardHeader className="bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/10 p-4 flex flex-row items-center gap-2.5">
                                        <div className="p-2 bg-maroon/5 text-maroon rounded-lg border border-gold/20">
                                            <QrCode className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold text-maroon tracking-wider uppercase">UPI Checkout Gateways</CardTitle>
                                            <CardDescription className="text-[10px] text-gray-400 mt-0.5">UPI addresses bound to the sales registry checkouts QR generator</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-4">
                                        {isLoadingUpi ? (
                                            <div className="flex justify-center py-8">
                                                <Loader2 className="h-5 w-5 animate-spin text-maroon" />
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {upiSettings.length === 0 ? (
                                                        <div className="col-span-2 text-center py-8 text-xs text-gray-400 italic">No terminals stored. Add one below.</div>
                                                    ) : (
                                                        upiSettings.map((setting) => (
                                                            <div
                                                                key={setting.id || setting.upi_id}
                                                                className={cn(
                                                                    "p-3 rounded-xl border flex flex-col justify-between h-[92px] transition-all bg-white relative overflow-hidden hover:shadow-md",
                                                                    setting.is_active
                                                                        ? 'border-gold/30 shadow-sm bg-cream-light/10'
                                                                        : 'border-gray-200 opacity-70'
                                                                )}
                                                            >
                                                                <div className="flex justify-between items-start gap-2">
                                                                    <div className="min-w-0">
                                                                        <span className="text-[10px] font-black text-gray-800 tracking-wide block truncate uppercase">
                                                                            {setting.label}
                                                                        </span>
                                                                        <span className="text-[9px] font-mono text-gray-500 mt-0.5 block truncate">
                                                                            {setting.upi_id}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                        {isStaff ? (
                                                                            <span className={cn(
                                                                                "text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                                                                                setting.is_active
                                                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                                                    : 'bg-gray-100 text-gray-500 border-gray-200'
                                                                            )}>
                                                                                {setting.is_active ? 'Active' : 'Inactive'}
                                                                            </span>
                                                                        ) : (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleToggleActive(setting)}
                                                                                className={cn(
                                                                                    "text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border transition-all cursor-pointer",
                                                                                    setting.is_active
                                                                                        ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                                                                        : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                                                                                )}
                                                                            >
                                                                                {setting.is_active ? 'Active' : 'Inactive'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="flex justify-between items-center border-t border-gold/10 pt-1.5 mt-2">
                                                                    <span className="text-[8px] text-gray-400 font-bold uppercase flex items-center gap-0.5">
                                                                        <QrCode className="h-2.5 w-2.5 text-gray-400" />
                                                                        QR ENABLED
                                                                    </span>
                                                                    {!isStaff && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            onClick={() => handleDeleteUpi(setting.id!, setting.label)}
                                                                            className="h-6 w-6 text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-0 rounded cursor-pointer"
                                                                            disabled={!setting.id}
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>

                                                {!isStaff && (
                                                    <form onSubmit={handleAddUpi} className="space-y-3.5 pt-3.5 border-t border-gold/10">
                                                        <h4 className="text-[10px] font-bold text-maroon uppercase tracking-widest flex items-center gap-1.5">
                                                            <Plus className="h-3 w-3" />
                                                            Register New UPI Terminal
                                                        </h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-bold text-gray-500 uppercase">Gateway Label (e.g. HDFC Core)</label>
                                                                <Input
                                                                    placeholder="e.g. HDFC Main Billing"
                                                                    value={newUpiLabel}
                                                                    onChange={(e) => setNewUpiLabel(e.target.value)}
                                                                    className="h-9 text-xs border-gold/25 focus-visible:ring-maroon text-gray-800 bg-white"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-bold text-gray-500 uppercase">UPI VPA Address (user@bank)</label>
                                                                <Input
                                                                    placeholder="e.g. merchant@hdfcbank"
                                                                    value={newUpiId}
                                                                    onChange={(e) => setNewUpiId(e.target.value)}
                                                                    className="h-9 text-xs border-gold/25 focus-visible:ring-maroon text-gray-800 bg-white font-mono"
                                                                />
                                                            </div>
                                                        </div>
                                                        <Button
                                                            type="submit"
                                                            disabled={isSavingUpi}
                                                            className="h-9 w-full bg-gradient-to-r from-maroon to-maroon-dark hover:from-maroon-dark hover:to-maroon-dark text-gold font-bold text-[11px] uppercase tracking-wider gap-1.5 shadow-md shadow-maroon/20 rounded-lg cursor-pointer"
                                                        >
                                                            {isSavingUpi ? (
                                                                <>
                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" /> Initializing Gateway...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Plus className="h-3.5 w-3.5 text-gold" /> Add Terminal Account
                                                                </>
                                                            )}
                                                        </Button>
                                                    </form>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {activeTab === 'system' && (
                            <motion.div
                                key="system"
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.15 }}
                            >
                                <Card className="border-gold/20 shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden">
                                    <CardHeader className="bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/10 p-4 flex flex-row items-center gap-2.5">
                                        <div className="p-2 bg-maroon/5 text-maroon rounded-lg border border-gold/20">
                                            <Terminal className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold text-maroon tracking-wider uppercase">Diagnostics & Systems Auditing</CardTitle>
                                            <CardDescription className="text-[10px] text-gray-400 mt-0.5">Terminal runtime details and local data management</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-4 text-xs">
                                        {/* Status Row */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                            <div className="p-3.5 border border-gold/15 rounded-xl bg-cream/5 flex items-start gap-3 hover:shadow-sm transition-shadow">
                                                <div className="p-2 bg-gradient-to-br from-maroon to-maroon-dark text-gold rounded-lg shadow-md shadow-maroon/20 flex-shrink-0">
                                                    <Database className="h-4 w-4" />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                                                        Database Host
                                                    </div>
                                                    <div className="text-xs font-black text-gray-800">Supabase DB (PostgreSQL)</div>
                                                    <div className="text-[8px] font-mono text-gray-500 flex items-center gap-1">
                                                        <CheckCircle className="h-2.5 w-2.5 text-green-600" />
                                                        Connection: Secure (SSL Enabled)
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-3.5 border border-gold/15 rounded-xl bg-cream/5 flex items-start gap-3 hover:shadow-sm transition-shadow">
                                                <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-lg shadow-md shadow-emerald-500/20 flex-shrink-0">
                                                    <Wifi className="h-4 w-4" />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                                                        Terminal Sync
                                                    </div>
                                                    <div className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                                                        Online mode
                                                        <span className="h-2 w-2 rounded-full bg-green-500 animate-ping"></span>
                                                    </div>
                                                    <div className="text-[8px] font-mono text-gray-500">Websockets Signaling: Active</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Application Spec Details */}
                                        <div className="border border-gold/10 rounded-xl overflow-hidden">
                                            <Table>
                                                <TableHeader className="bg-cream/10">
                                                    <TableRow className="border-b border-gold/10 hover:bg-transparent">
                                                        <TableHead className="h-8 text-[10px] font-bold text-maroon py-1 px-3">System Metric</TableHead>
                                                        <TableHead className="h-8 text-[10px] font-bold text-maroon text-right py-1 px-3">Value</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {[
                                                        { metric: 'Runtime Framework', value: 'React 19 + Vite' },
                                                        { metric: 'State Management', value: 'Zustand + React Query' },
                                                        { metric: 'Terminal Build', value: 'v2.4.5-stable (Production)' },
                                                    ].map((row) => (
                                                        <TableRow key={row.metric} className="border-b border-gold/5 hover:bg-cream/10 transition-colors">
                                                            <TableCell className="py-2 px-3 text-[10px] text-gray-600">{row.metric}</TableCell>
                                                            <TableCell className="py-2 px-3 text-[10px] text-right font-bold font-mono text-gray-800">{row.value}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        {/* Danger/Utility operations */}
                                        <div className="border border-gold/15 rounded-xl p-3.5 bg-cream-light/5 space-y-2.5">
                                            <div className="flex items-start gap-2.5">
                                                <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 mt-0.5">
                                                    <Activity className="h-3.5 w-3.5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold text-gray-800">Clear Application Cache State</h4>
                                                    <p className="text-[9px] text-gray-500 mt-0.5 leading-relaxed">
                                                        Forces the React Query engine to invalidate and discard cached data parameters. Use this if dashboard stats or ledger feeds show stale balances.
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={handleClearCache}
                                                className="w-full h-9 text-[10px] bg-gold/10 hover:bg-gold/15 text-maroon border border-gold/35 font-bold uppercase tracking-widest gap-1 cursor-pointer"
                                            >
                                                <RefreshCw className="h-3 w-3" />
                                                Flush Local Cache & Reload
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </div>
        </motion.div>
    );
}