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
    User, 
    ShieldCheck, 
    LogOut, 
    Database, 
    Wifi, 
    Terminal, 
    Settings, 
    Activity, 
    CheckCircle,
    Server,
    RefreshCw
} from 'lucide-react';
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

    return (
        <motion.div 
            className="space-y-4 max-w-7xl mx-auto px-4 py-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Header Title */}
            <div className="flex items-center gap-2 border-b border-gold/15 pb-3">
                <div className="p-1 bg-maroon/5 rounded-md border border-gold/20">
                    <Settings className="h-4 w-4 text-maroon" />
                </div>
                <div>
                    <h1 className="text-lg font-black font-serif text-maroon tracking-wider uppercase">System Settings & Configurations</h1>
                    <p className="text-[10px] text-gray-500 font-sans mt-0.5">Manage operator security, checkout terminals, and database caches</p>
                </div>
            </div>

            {/* Layout Grid: Left Navigation / Right Form panels */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                {/* Left Side: Profile Info Card & Vertical Navigation (4 cols) */}
                <div className="lg:col-span-4 space-y-4">
                    {/* User Profile Card */}
                    <Card className="border-gold/15 bg-white shadow-sm overflow-hidden">
                        <CardHeader className="bg-cream/10 border-b border-gold/10 p-3.5 flex flex-row items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-maroon text-gold flex items-center justify-center font-bold text-xs border border-gold/25 shadow-inner">
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
                    <Card className="border-gold/15 bg-white shadow-sm overflow-hidden p-1.5 space-y-1">
                        <button
                            onClick={() => setActiveTab('security')}
                            className={cn(
                                "w-full text-left p-2 rounded-md transition-all flex items-center gap-2 text-xs cursor-pointer",
                                activeTab === 'security'
                                    ? "bg-maroon text-gold font-bold shadow-sm"
                                    : "text-gray-650 hover:bg-cream/10"
                            )}
                        >
                            <KeyRound className="h-3.5 w-3.5" />
                            Security & Credentials
                        </button>

                        <button
                            onClick={() => setActiveTab('payments')}
                            className={cn(
                                "w-full text-left p-2 rounded-md transition-all flex items-center gap-2 text-xs cursor-pointer",
                                activeTab === 'payments'
                                    ? "bg-maroon text-gold font-bold shadow-sm"
                                    : "text-gray-650 hover:bg-cream/10"
                            )}
                        >
                            <QrCode className="h-3.5 w-3.5" />
                            UPI Payment Terminals
                        </button>

                        <button
                            onClick={() => setActiveTab('system')}
                            className={cn(
                                "w-full text-left p-2 rounded-md transition-all flex items-center gap-2 text-xs cursor-pointer",
                                activeTab === 'system'
                                    ? "bg-maroon text-gold font-bold shadow-sm"
                                    : "text-gray-650 hover:bg-cream/10"
                            )}
                        >
                            <Terminal className="h-3.5 w-3.5" />
                            Diagnostics & Audits
                        </button>
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
                                <Card className="border-gold/15 shadow-sm bg-white">
                                    <CardHeader className="bg-cream/10 border-b border-gold/10 p-3.5 flex flex-row items-center gap-2">
                                        <KeyRound className="h-4 w-4 text-maroon" />
                                        <div>
                                            <CardTitle className="text-xs font-bold text-maroon tracking-wider uppercase">Credentials Security</CardTitle>
                                            <CardDescription className="text-[9px] text-gray-400 mt-0.5">Update password credentials for your security profile</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        <Form {...form}>
                                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5">
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
                                                                        className="h-8.5 text-xs border-gold/25 focus-visible:ring-maroon pr-10"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setShowPassword(!showPassword)}
                                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-maroon transition-colors"
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
                                                                        className="h-8.5 text-xs border-gold/25 focus-visible:ring-maroon pr-10"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-maroon transition-colors"
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
                                                    className="bg-maroon hover:bg-maroon-dark text-gold font-bold w-full h-8.5 text-[10px] uppercase tracking-wider cursor-pointer" 
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
                                <Card className="border-gold/15 shadow-sm bg-white">
                                    <CardHeader className="bg-cream/10 border-b border-gold/10 p-3 flex flex-row items-center gap-2">
                                        <QrCode className="h-4 w-4 text-maroon" />
                                        <div>
                                            <CardTitle className="text-xs font-bold text-maroon tracking-wider uppercase">UPI Checkout Gateways</CardTitle>
                                            <CardDescription className="text-[9px] text-gray-400 mt-0.5">UPI addresses bound to the sales registry checkouts QR generator</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-3 space-y-4">
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
                                                                className={`p-2.5 rounded-lg border flex flex-col justify-between h-[90px] transition-all bg-white relative overflow-hidden ${
                                                                    setting.is_active 
                                                                        ? 'border-gold/30 shadow-sm bg-cream-light/10' 
                                                                        : 'border-gray-250 opacity-70'
                                                                }`}
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
                                                                            <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                                                                setting.is_active 
                                                                                    ? 'bg-green-50 text-green-700 border-green-200' 
                                                                                    : 'bg-gray-100 text-gray-650 border-gray-200'
                                                                            }`}>
                                                                                {setting.is_active ? 'Active' : 'Inactive'}
                                                                            </span>
                                                                        ) : (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleToggleActive(setting)}
                                                                                className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                                                                                    setting.is_active 
                                                                                        ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                                                                                        : 'bg-gray-100 text-gray-650 border-gray-250 hover:bg-gray-200'
                                                                                }`}
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
                                                        <h4 className="text-[9px] font-bold text-maroon uppercase tracking-widest">Register New UPI terminal</h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-bold text-gray-500 uppercase">Gateway Label (e.g. HDFC Core)</label>
                                                                <Input
                                                                    placeholder="e.g. HDFC Main Billing"
                                                                    value={newUpiLabel}
                                                                    onChange={(e) => setNewUpiLabel(e.target.value)}
                                                                    className="h-8.5 text-xs border-gold/25 focus-visible:ring-maroon text-gray-800 bg-white"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-bold text-gray-500 uppercase">UPI VPA Address (user@bank)</label>
                                                                <Input
                                                                    placeholder="e.g. merchant@hdfcbank"
                                                                    value={newUpiId}
                                                                    onChange={(e) => setNewUpiId(e.target.value)}
                                                                    className="h-8.5 text-xs border-gold/25 focus-visible:ring-maroon text-gray-800 bg-white font-mono"
                                                                />
                                                            </div>
                                                        </div>
                                                        <Button
                                                            type="submit"
                                                            disabled={isSavingUpi}
                                                            className="h-8.5 w-full bg-maroon hover:bg-maroon-dark text-gold font-bold text-[10px] tracking-wider gap-1.5 shadow-sm rounded-lg cursor-pointer"
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
                                <Card className="border-gold/15 shadow-sm bg-white">
                                    <CardHeader className="bg-cream/10 border-b border-gold/10 p-3.5 flex flex-row items-center gap-2">
                                        <Terminal className="h-4 w-4 text-maroon" />
                                        <div>
                                            <CardTitle className="text-xs font-bold text-maroon tracking-wider uppercase">Diagnostics & Systems Auditing</CardTitle>
                                            <CardDescription className="text-[9px] text-gray-400 mt-0.5">Terminal runtime details and local data management</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-4 text-xs">
                                        {/* Status Row */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                            <div className="p-3 border border-gold/15 rounded bg-cream/5 space-y-1">
                                                <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                                    <Server className="h-3.5 w-3.5 text-maroon" />
                                                    Database Host
                                                </div>
                                                <div className="text-xs font-black text-gray-800">Supabase DB (PostgreSQL)</div>
                                                <div className="text-[8px] font-mono text-gray-550 flex items-center gap-1">
                                                    <CheckCircle className="h-2.5 w-2.5 text-green-600" />
                                                    Connection: Secure (SSL Enabled)
                                                </div>
                                            </div>

                                            <div className="p-3 border border-gold/15 rounded bg-cream/5 space-y-1">
                                                <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                                    <Wifi className="h-3.5 w-3.5 text-maroon" />
                                                    Terminal Sync
                                                </div>
                                                <div className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                                                    Online mode
                                                    <span className="h-2 w-2 rounded-full bg-green-500 animate-ping"></span>
                                                </div>
                                                <div className="text-[8px] font-mono text-gray-550">Websockets Signaling: Active</div>
                                            </div>
                                        </div>

                                        {/* Application Spec Details */}
                                        <div className="border border-gold/10 rounded overflow-hidden">
                                            <table className="w-full text-[10px] text-gray-500">
                                                <thead>
                                                    <tr className="bg-cream/10 border-b border-gold/10">
                                                        <th className="p-2 text-left text-maroon font-bold uppercase tracking-wider">System Metric</th>
                                                        <th className="p-2 text-right text-maroon font-bold uppercase tracking-wider">Value</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gold/5 font-mono">
                                                    <tr>
                                                        <td className="p-2 text-gray-600">Runtime Framework</td>
                                                        <td className="p-2 text-right font-bold text-gray-850">React 19 + Vite</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="p-2 text-gray-600">State Management</td>
                                                        <td className="p-2 text-right font-bold text-gray-850">Zustand + React Query</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="p-2 text-gray-600">Terminal Build</td>
                                                        <td className="p-2 text-right font-bold text-gray-850">v2.4.5-stable (Production)</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Danger/Utility operations */}
                                        <div className="border border-gold/15 rounded p-3 bg-cream-light/5 space-y-2">
                                            <div className="flex items-start gap-2.5">
                                                <div className="p-1 bg-amber-50 text-amber-700 rounded border border-amber-200 mt-0.5">
                                                    <Activity className="h-3.5 w-3.5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold text-gray-800">Clear Application Cache State</h4>
                                                    <p className="text-[9px] text-gray-450 mt-0.5 leading-relaxed">
                                                        Forces the React Query engine to invalidate and discard cached data parameters. Use this if dashboard stats or ledger feeds show stale balances.
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={handleClearCache}
                                                className="w-full h-8 text-[9px] bg-gold/10 hover:bg-gold/15 text-maroon border border-gold/35 font-bold uppercase tracking-widest gap-1 cursor-pointer"
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
