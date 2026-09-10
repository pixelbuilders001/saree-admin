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
    ChevronRight,
    Truck,
    MapPin,
    Clock,
    Zap,
    Navigation,
    Save,
    AlertTriangle,
    RotateCcw,
    ExternalLink,
    LocateFixed,
    ToggleLeft,
    ToggleRight,
    Sparkles,
    Check,
    Timer,
    Store
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
import {
    settingsService,
    type UpiSetting,
    type DeliverySettings,
    DEFAULT_DELIVERY_SETTINGS
} from '@/services/settingsService';
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
    const [activeTab, setActiveTab] = React.useState<'delivery' | 'payments' | 'security' | 'system'>('delivery');
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

    const { logout, user } = useAuthStore();
    const isStaff = user?.role === 'staff';
    const queryClient = useQueryClient();

    // UPI Terminal State
    const [upiSettings, setUpiSettings] = React.useState<UpiSetting[]>([]);
    const [isLoadingUpi, setIsLoadingUpi] = React.useState(true);
    const [newUpiId, setNewUpiId] = React.useState('');
    const [newUpiLabel, setNewUpiLabel] = React.useState('');
    const [isSavingUpi, setIsSavingUpi] = React.useState(false);

    // Delivery Engine State
    const [deliverySettings, setDeliverySettings] = React.useState<DeliverySettings>(DEFAULT_DELIVERY_SETTINGS);
    const [isLoadingDelivery, setIsLoadingDelivery] = React.useState(true);
    const [isSavingDelivery, setIsSavingDelivery] = React.useState(false);
    const [isDetectingLocation, setIsDetectingLocation] = React.useState(false);

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

    const fetchDeliverySettings = async () => {
        setIsLoadingDelivery(true);
        try {
            const data = await settingsService.getDeliverySettings();
            setDeliverySettings(data);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to load delivery settings');
        } finally {
            setIsLoadingDelivery(false);
        }
    };

    React.useEffect(() => {
        fetchUpiSettings();
        fetchDeliverySettings();
    }, []);

    // Delivery Constraint Validations matching DB constraints
    const isExpressDistValid = Number(deliverySettings.express_max_km) > 0;
    const isSameDayDistValid = Number(deliverySettings.same_day_max_km) > Number(deliverySettings.express_max_km);
    const isStandardDistValid = Number(deliverySettings.standard_max_km) > Number(deliverySettings.same_day_max_km);
    const isChargesValid =
        Number(deliverySettings.express_charge) >= 0 &&
        Number(deliverySettings.same_day_charge) >= 0 &&
        Number(deliverySettings.standard_charge) >= 0;

    const validationErrors: string[] = [];
    if (!isExpressDistValid) validationErrors.push('Express distance must be greater than 0 km.');
    if (!isSameDayDistValid) validationErrors.push(`Same-Day distance (${deliverySettings.same_day_max_km} km) must be greater than Express distance (${deliverySettings.express_max_km} km).`);
    if (!isStandardDistValid) validationErrors.push(`Standard distance (${deliverySettings.standard_max_km} km) must be greater than Same-Day distance (${deliverySettings.same_day_max_km} km).`);
    if (!isChargesValid) validationErrors.push('Delivery charges cannot be negative.');

    const isDeliveryValid = validationErrors.length === 0;

    const handleSaveDelivery = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (isStaff) {
            toast.error('Unauthorized: Staff cannot modify delivery configurations');
            return;
        }
        if (!isDeliveryValid) {
            toast.error(validationErrors[0]);
            return;
        }
        setIsSavingDelivery(true);
        try {
            const updated = await settingsService.saveDeliverySettings(deliverySettings);
            setDeliverySettings(updated);
            toast.success('Delivery configurations saved successfully!');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save delivery configurations');
        } finally {
            setIsSavingDelivery(false);
        }
    };

    const handleDetectLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported by your browser');
            return;
        }
        setIsDetectingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = Number(position.coords.latitude.toFixed(6));
                const lng = Number(position.coords.longitude.toFixed(6));
                setDeliverySettings((prev) => ({
                    ...prev,
                    shop_latitude: lat,
                    shop_longitude: lng,
                }));
                setIsDetectingLocation(false);
                toast.success(`Coordinates auto-detected: ${lat}, ${lng}`);
            },
            (error) => {
                setIsDetectingLocation(false);
                console.warn('Geolocation error:', error);
                toast.error('Could not detect location. Please allow location access in your browser.');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleResetDelivery = () => {
        if (confirm('Reset delivery configurations to factory defaults?')) {
            setDeliverySettings(DEFAULT_DELIVERY_SETTINGS);
            toast.info('Reset to default values. Click "Save Configurations" to persist.');
        }
    };

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
        {
            label: 'Delivery Service',
            value: deliverySettings.is_active ? 'Active' : 'Paused',
            sub: `${deliverySettings.serviceable_district}, ${deliverySettings.serviceable_state}`,
            icon: Truck,
            from: deliverySettings.is_active ? 'from-emerald-500' : 'from-rose-500',
            to: deliverySettings.is_active ? 'to-emerald-700' : 'to-rose-700',
            text: deliverySettings.is_active ? 'text-emerald-700' : 'text-rose-700'
        },
        {
            label: 'Express Quick SLA',
            value: deliverySettings.is_express_20min_enabled ? `≤ ${deliverySettings.express_max_km} km` : 'Disabled',
            sub: deliverySettings.is_express_20min_enabled ? `₹${deliverySettings.express_charge} • ${deliverySettings.express_min_minutes}-${deliverySettings.express_max_minutes}m` : 'Express mode paused',
            icon: Zap,
            from: 'from-amber-400',
            to: 'to-amber-600',
            text: 'text-amber-800'
        },
        { label: 'Active UPI Terminals', value: `${activeTerminals}`, sub: 'Live QR gateways', icon: QrCode, from: 'from-slate-600', to: 'to-slate-800', text: 'text-gray-800' },
        { label: 'Operator Clearance', value: isStaff ? 'Standard' : 'Super Admin', sub: 'Security clearance', icon: ShieldCheck, from: 'from-maroon', to: 'to-maroon-dark', text: 'text-maroon' },
    ];

    const navItems = [
        { key: 'delivery' as const, icon: Truck, title: 'Delivery & Shipping', sub: 'Zones, rates & SLAs' },
        { key: 'payments' as const, icon: QrCode, title: 'UPI Payment Terminals', sub: 'QR checkout accounts' },
        { key: 'security' as const, icon: KeyRound, title: 'Security & Credentials', sub: 'Password & access' },
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
                            <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-2">
                                <div className="space-y-0.5 min-w-0">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">{s.label}</span>
                                    <span className={cn("text-lg sm:text-xl font-bold font-mono block", s.text)}>{s.value}</span>
                                    <span className="text-[10px] text-gray-400 block truncate">{s.sub}</span>
                                </div>
                                <div className={cn("p-2 sm:p-2.5 bg-gradient-to-br text-white rounded-xl shadow flex-shrink-0", s.from, s.to)}>
                                    <s.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Layout Grid: Left Navigation / Right Form panels */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

                {/* Mobile Navigation: Horizontal scrollable pill strip (hidden on lg) */}
                <div className="lg:hidden -mx-2 px-2">
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {navItems.map((item) => (
                            <button
                                key={item.key}
                                onClick={() => setActiveTab(item.key)}
                                className={cn(
                                    "flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer whitespace-nowrap",
                                    activeTab === item.key
                                        ? "bg-gradient-to-r from-maroon to-maroon-dark text-gold border-maroon/30 shadow-md shadow-maroon/20"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-gold/30 hover:bg-cream/20"
                                )}
                            >
                                <item.icon className={cn("h-3.5 w-3.5 flex-shrink-0", activeTab === item.key ? "text-gold" : "text-maroon")} />
                                <span>{item.title}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Left Side: Profile Info Card & Vertical Navigation (desktop only, 4 cols) */}
                <div className="hidden lg:block lg:col-span-4 space-y-4">
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

                    {/* Navigation Tab Links (desktop vertical) */}
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
                        {activeTab === 'delivery' && (
                            <motion.div
                                key="delivery"
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-4"
                            >
                                <Card className="border-gold/20 shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden">
                                    {/* Panel Header */}
                                    <CardHeader className="bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 bg-gradient-to-br from-maroon to-maroon-dark text-gold rounded-lg shadow-sm">
                                                <Truck className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-sm font-bold text-maroon tracking-wider uppercase flex items-center gap-2">
                                                    Delivery & Shipping Engine
                                                    <span className={cn(
                                                        "text-[9px] font-bold px-2 py-0.5 rounded-full border",
                                                        deliverySettings.is_active
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                            : "bg-rose-50 text-rose-700 border-rose-200"
                                                    )}>
                                                        {deliverySettings.is_active ? 'Online & Active' : 'Deliveries Paused'}
                                                    </span>
                                                </CardTitle>
                                                <CardDescription className="text-[10px] text-gray-400 mt-0.5">
                                                    Configure serviceable regions, store GPS center, tiered distance radii, fees, and operational SLAs
                                                </CardDescription>
                                            </div>
                                        </div>

                                        {/* Master Delivery Active Toggle */}
                                        <div className="flex items-center gap-2 self-start sm:self-center">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (isStaff) {
                                                        toast.error('Unauthorized: Staff cannot toggle delivery status');
                                                        return;
                                                    }
                                                    setDeliverySettings(prev => ({ ...prev, is_active: !prev.is_active }));
                                                }}
                                                disabled={isStaff}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                                    deliverySettings.is_active
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                                                        : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
                                                )}
                                                title={deliverySettings.is_active ? "Click to Pause all customer deliveries" : "Click to Enable customer deliveries"}
                                            >
                                                {deliverySettings.is_active ? (
                                                    <>
                                                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                        <ToggleRight className="h-4 w-4 text-emerald-600" />
                                                        <span>Service Active</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ToggleLeft className="h-4 w-4 text-gray-400" />
                                                        <span>Service Paused</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="p-3 sm:p-5 space-y-4 sm:space-y-6">
                                        {isLoadingDelivery ? (
                                            <div className="flex flex-col items-center justify-center py-12 space-y-2">
                                                <Loader2 className="h-6 w-6 animate-spin text-maroon" />
                                                <p className="text-xs text-gray-400 font-medium">Loading delivery engine settings...</p>
                                            </div>
                                        ) : (
                                            <form onSubmit={handleSaveDelivery} className="space-y-6">

                                                {/* SECTION 1: Serviceable Region & Store GPS Origin */}
                                                <div className="rounded-xl border border-gold/15 bg-cream/5 p-4 space-y-3.5">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gold/10 pb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 bg-maroon/10 text-maroon rounded-md">
                                                                <Store className="h-3.5 w-3.5" />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Store Location & Regional Boundaries</h4>
                                                                <p className="text-[10px] text-gray-400">All tiered distances are calculated radially outward from this store GPS coordinate</p>
                                                            </div>
                                                        </div>

                                                        {/* GPS Detect & Maps Action */}
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={handleDetectLocation}
                                                                disabled={isDetectingLocation || isStaff}
                                                                className="h-7 text-[10px] font-bold border-gold/30 text-maroon hover:bg-gold/10 gap-1 rounded-md px-2 cursor-pointer"
                                                            >
                                                                {isDetectingLocation ? (
                                                                    <Loader2 className="h-3 w-3 animate-spin text-maroon" />
                                                                ) : (
                                                                    <LocateFixed className="h-3 w-3 text-maroon" />
                                                                )}
                                                                Auto-Detect GPS
                                                            </Button>

                                                            {deliverySettings.shop_latitude && deliverySettings.shop_longitude && (
                                                                <a
                                                                    href={`https://www.google.com/maps/search/?api=1&query=${deliverySettings.shop_latitude},${deliverySettings.shop_longitude}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="h-7 px-2 border border-gray-200 text-[10px] text-gray-600 rounded-md hover:bg-gray-50 flex items-center gap-1 font-medium transition-colors"
                                                                >
                                                                    <ExternalLink className="h-2.5 w-2.5" />
                                                                    View Pin
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Serviceable District</label>
                                                            <Input
                                                                value={deliverySettings.serviceable_district}
                                                                onChange={(e) => setDeliverySettings(p => ({ ...p, serviceable_district: e.target.value }))}
                                                                placeholder="e.g. Samastipur"
                                                                className="h-8 text-xs border-gold/25 focus-visible:ring-maroon bg-white"
                                                            />
                                                        </div>

                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Serviceable State</label>
                                                            <Input
                                                                value={deliverySettings.serviceable_state}
                                                                onChange={(e) => setDeliverySettings(p => ({ ...p, serviceable_state: e.target.value }))}
                                                                placeholder="e.g. Bihar"
                                                                className="h-8 text-xs border-gold/25 focus-visible:ring-maroon bg-white"
                                                            />
                                                        </div>

                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Default Pincode</label>
                                                            <Input
                                                                value={deliverySettings.default_pincode || ''}
                                                                onChange={(e) => setDeliverySettings(p => ({ ...p, default_pincode: e.target.value }))}
                                                                placeholder="e.g. 848101"
                                                                className="h-8 text-xs border-gold/25 focus-visible:ring-maroon bg-white font-mono"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between items-center">
                                                                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Store GPS Latitude</label>
                                                                <span className="text-[9px] text-gray-400 font-mono">double precision</span>
                                                            </div>
                                                            <Input
                                                                type="number"
                                                                step="any"
                                                                value={deliverySettings.shop_latitude ?? ''}
                                                                onChange={(e) => setDeliverySettings(p => ({ ...p, shop_latitude: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                                                                placeholder="e.g. 25.8629"
                                                                className="h-8 text-xs border-gold/25 focus-visible:ring-maroon bg-white font-mono"
                                                            />
                                                        </div>

                                                        <div className="space-y-1">
                                                            <div className="flex justify-between items-center">
                                                                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Store GPS Longitude</label>
                                                                <span className="text-[9px] text-gray-400 font-mono">double precision</span>
                                                            </div>
                                                            <Input
                                                                type="number"
                                                                step="any"
                                                                value={deliverySettings.shop_longitude ?? ''}
                                                                onChange={(e) => setDeliverySettings(p => ({ ...p, shop_longitude: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                                                                placeholder="e.g. 85.7810"
                                                                className="h-8 text-xs border-gold/25 focus-visible:ring-maroon bg-white font-mono"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* SECTION 2: Visual Tier Progression & Constraints Diagram */}
                                                <div className="rounded-xl border border-gold/15 bg-white p-3.5 space-y-2">
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                                                            <Navigation className="h-3 w-3 text-gold" />
                                                            Delivery Zone Radii Distribution
                                                        </span>
                                                        <span className="text-[9px] text-gray-400 font-mono">
                                                            0 km ➔ {deliverySettings.standard_max_km} km (Max Boundary)
                                                        </span>
                                                    </div>

                                                    {/* Graphical multi-tier bar */}
                                                    <div className="w-full h-8 bg-gray-100 rounded-lg flex overflow-hidden p-1 gap-1">
                                                        <div
                                                            style={{ flex: `${Math.max(1, deliverySettings.express_max_km)}` }}
                                                            className="bg-amber-500 text-white rounded flex items-center justify-center text-[10px] font-bold font-mono px-1 truncate transition-all"
                                                            title={`Express: 0 to ${deliverySettings.express_max_km} km (₹${deliverySettings.express_charge})`}
                                                        >
                                                            ⚡ 0 - {deliverySettings.express_max_km} km (₹{deliverySettings.express_charge})
                                                        </div>
                                                        <div
                                                            style={{ flex: `${Math.max(1, deliverySettings.same_day_max_km - deliverySettings.express_max_km)}` }}
                                                            className="bg-emerald-600 text-white rounded flex items-center justify-center text-[10px] font-bold font-mono px-1 truncate transition-all"
                                                            title={`Same-Day: ${deliverySettings.express_max_km} to ${deliverySettings.same_day_max_km} km (₹${deliverySettings.same_day_charge})`}
                                                        >
                                                            🚚 {deliverySettings.express_max_km} - {deliverySettings.same_day_max_km} km (₹{deliverySettings.same_day_charge})
                                                        </div>
                                                        <div
                                                            style={{ flex: `${Math.max(1, deliverySettings.standard_max_km - deliverySettings.same_day_max_km)}` }}
                                                            className="bg-slate-700 text-white rounded flex items-center justify-center text-[10px] font-bold font-mono px-1 truncate transition-all"
                                                            title={`Standard: ${deliverySettings.same_day_max_km} to ${deliverySettings.standard_max_km} km (₹${deliverySettings.standard_charge})`}
                                                        >
                                                            📦 {deliverySettings.same_day_max_km} - {deliverySettings.standard_max_km} km (₹{deliverySettings.standard_charge})
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 sm:flex sm:justify-between items-center text-[9px] text-gray-400 pt-0.5 gap-x-2 gap-y-0.5">
                                                        <span>📍 0 km (Shop Center)</span>
                                                        <span className="text-amber-600 font-semibold">{deliverySettings.express_max_km} km (Express)</span>
                                                        <span className="text-emerald-600 font-semibold">{deliverySettings.same_day_max_km} km (Same-Day)</span>
                                                        <span className="text-slate-700 font-semibold">{deliverySettings.standard_max_km} km (Max)</span>
                                                    </div>
                                                </div>

                                                {/* TIER 1: Express / Hyperlocal */}
                                                <div className="rounded-xl border border-amber-200 bg-amber-50/20 p-4 space-y-3">
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-amber-200/50 pb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 bg-amber-500 text-white rounded-md shadow-xs">
                                                                <Zap className="h-3.5 w-3.5" />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                                                                    Tier 1: Express Hyperlocal Delivery
                                                                </h4>
                                                                <p className="text-[10px] text-amber-800/70">
                                                                    Quick dispatch within 1–2 hours for customers close to the shop
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Express 20-min Enabled Toggle */}
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-[9px] font-bold text-amber-900 uppercase">Express Option:</label>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (isStaff) return;
                                                                    setDeliverySettings(p => ({ ...p, is_express_20min_enabled: !p.is_express_20min_enabled }));
                                                                }}
                                                                disabled={isStaff}
                                                                className={cn(
                                                                    "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer border",
                                                                    deliverySettings.is_express_20min_enabled
                                                                        ? "bg-amber-100 text-amber-900 border-amber-300"
                                                                        : "bg-gray-100 text-gray-500 border-gray-200"
                                                                )}
                                                            >
                                                                {deliverySettings.is_express_20min_enabled ? (
                                                                    <>
                                                                        <Check className="h-3 w-3 text-amber-700" />
                                                                        <span>Enabled</span>
                                                                    </>
                                                                ) : (
                                                                    <span>Disabled</span>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-gray-600 uppercase">Max Radius (km)</label>
                                                            <Input
                                                                type="number"
                                                                step="0.5"
                                                                min="0.5"
                                                                value={deliverySettings.express_max_km}
                                                                onChange={(e) => setDeliverySettings(p => ({ ...p, express_max_km: parseFloat(e.target.value) || 0 }))}
                                                                className="h-8 text-xs border-amber-200 focus-visible:ring-amber-500 bg-white font-mono"
                                                            />
                                                            <span className="text-[8px] text-gray-400 block">Default: 5 km</span>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-gray-600 uppercase">Delivery Fee (₹)</label>
                                                            <Input
                                                                type="number"
                                                                step="1"
                                                                min="0"
                                                                value={deliverySettings.express_charge}
                                                                onChange={(e) => setDeliverySettings(p => ({ ...p, express_charge: parseFloat(e.target.value) || 0 }))}
                                                                className="h-8 text-xs border-amber-200 focus-visible:ring-amber-500 bg-white font-mono"
                                                            />
                                                            <span className="text-[8px] text-gray-400 block">Default: ₹29</span>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-gray-600 uppercase">Min SLA (Mins)</label>
                                                            <Input
                                                                type="number"
                                                                step="5"
                                                                min="10"
                                                                value={deliverySettings.express_min_minutes}
                                                                onChange={(e) => setDeliverySettings(p => ({ ...p, express_min_minutes: parseInt(e.target.value) || 0 }))}
                                                                className="h-8 text-xs border-amber-200 focus-visible:ring-amber-500 bg-white font-mono"
                                                            />
                                                            <span className="text-[8px] text-gray-400 block">e.g. 60 mins</span>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-gray-600 uppercase">Max SLA (Mins)</label>
                                                            <Input
                                                                type="number"
                                                                step="5"
                                                                min="15"
                                                                value={deliverySettings.express_max_minutes}
                                                                onChange={(e) => setDeliverySettings(p => ({ ...p, express_max_minutes: parseInt(e.target.value) || 0 }))}
                                                                className="h-8 text-xs border-amber-200 focus-visible:ring-amber-500 bg-white font-mono"
                                                            />
                                                            <span className="text-[8px] text-gray-400 block">e.g. 120 mins</span>
                                                        </div>
                                                    </div>

                                                    {/* Operational Buffers */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-amber-100">
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between items-center">
                                                                <label className="text-[9px] font-bold text-gray-600 uppercase">Packing Buffer (Mins)</label>
                                                                <span className="text-[8px] text-gray-400">Warehouse pickup time</span>
                                                            </div>
                                                            <Input
                                                                type="number"
                                                                step="1"
                                                                min="0"
                                                                value={deliverySettings.express_packing_buffer_minutes}
                                                                onChange={(e) => setDeliverySettings(p => ({ ...p, express_packing_buffer_minutes: parseInt(e.target.value) || 0 }))}
                                                                className="h-8 text-xs border-amber-200 focus-visible:ring-amber-500 bg-white font-mono"
                                                            />
                                                        </div>

                                                        <div className="space-y-1">
                                                            <div className="flex justify-between items-center">
                                                                <label className="text-[9px] font-bold text-gray-600 uppercase">Rider Delivery Buffer (Mins)</label>
                                                                <span className="text-[8px] text-gray-400">Traffic / road buffer</span>
                                                            </div>
                                                            <Input
                                                                type="number"
                                                                step="1"
                                                                min="0"
                                                                value={deliverySettings.express_delivery_buffer_minutes}
                                                                onChange={(e) => setDeliverySettings(p => ({ ...p, express_delivery_buffer_minutes: parseInt(e.target.value) || 0 }))}
                                                                className="h-8 text-xs border-amber-200 focus-visible:ring-amber-500 bg-white font-mono"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* TIER 2: Same-Day Delivery */}
                                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/20 p-4 space-y-3">
                                                    <div className="flex items-center gap-2 border-b border-emerald-200/50 pb-2">
                                                        <div className="p-1.5 bg-emerald-600 text-white rounded-md shadow-xs">
                                                            <Clock className="h-3.5 w-3.5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                                                                Tier 2: Same-Day Scheduled Delivery
                                                            </h4>
                                                            <p className="text-[10px] text-emerald-800/70">
                                                                City-wide delivery before nightfall for orders submitted before the daily cutoff
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between items-center">
                                                                <label className="text-[9px] font-bold text-gray-600 uppercase">Max Radius (km)</label>
                                                                <span className="text-[8px] text-emerald-700 font-semibold">&gt; {deliverySettings.express_max_km} km</span>
                                                            </div>
                                                            <Input
                                                                type="number"
                                                                step="0.5"
                                                                min={deliverySettings.express_max_km + 0.1}
                                                                value={deliverySettings.same_day_max_km}
                                                                onChange={(e) => setDeliverySettings(p => ({ ...p, same_day_max_km: parseFloat(e.target.value) || 0 }))}
                                                                className={cn(
                                                                    "h-8 text-xs border-emerald-200 focus-visible:ring-emerald-500 bg-white font-mono",
                                                                    !isSameDayDistValid && "border-rose-400 bg-rose-50"
                                                                )}
                                                            />
                                                            <span className="text-[8px] text-gray-400 block">Default: 10 km</span>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-gray-600 uppercase">Delivery Fee (₹)</label>
                                                            <Input
                                                                type="number"
                                                                step="1"
                                                                min="0"
                                                                value={deliverySettings.same_day_charge}
                                                                onChange={(e) => setDeliverySettings(p => ({ ...p, same_day_charge: parseFloat(e.target.value) || 0 }))}
                                                                className="h-8 text-xs border-emerald-200 focus-visible:ring-emerald-500 bg-white font-mono"
                                                            />
                                                            <span className="text-[8px] text-gray-400 block">Default: ₹49</span>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <div className="flex justify-between items-center">
                                                                <label className="text-[9px] font-bold text-gray-600 uppercase">Daily Cutoff Time</label>
                                                                <span className="text-[8px] text-gray-400">HH:MM format</span>
                                                            </div>
                                                            <Input
                                                                type="time"
                                                                value={deliverySettings.same_day_cutoff_time ? deliverySettings.same_day_cutoff_time.slice(0, 5) : '17:00'}
                                                                onChange={(e) => setDeliverySettings(p => ({ ...p, same_day_cutoff_time: e.target.value }))}
                                                                className="h-8 text-xs border-emerald-200 focus-visible:ring-emerald-500 bg-white font-mono"
                                                            />
                                                            <span className="text-[8px] text-gray-400 block">Orders past this roll to next day</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* TIER 3: Standard District Delivery */}
                                                <div className="rounded-xl border border-slate-300 bg-slate-50/40 p-4 space-y-3">
                                                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                                                        <div className="p-1.5 bg-slate-700 text-white rounded-md shadow-xs">
                                                            <Truck className="h-3.5 w-3.5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                                                                Tier 3: Standard District Courier Delivery
                                                            </h4>
                                                            <p className="text-[10px] text-slate-600">
                                                                Outer city limits, suburban areas, and surrounding blocks across the district
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between items-center">
                                                                <label className="text-[9px] font-bold text-gray-600 uppercase">Max Outer Radius (km)</label>
                                                                <span className="text-[8px] text-slate-700 font-semibold">&gt; {deliverySettings.same_day_max_km} km</span>
                                                            </div>
                                                            <Input
                                                                type="number"
                                                                step="0.5"
                                                                min={deliverySettings.same_day_max_km + 0.1}
                                                                value={deliverySettings.standard_max_km}
                                                                onChange={(e) => setDeliverySettings(p => ({ ...p, standard_max_km: parseFloat(e.target.value) || 0 }))}
                                                                className={cn(
                                                                    "h-8 text-xs border-slate-300 focus-visible:ring-slate-600 bg-white font-mono",
                                                                    !isStandardDistValid && "border-rose-400 bg-rose-50"
                                                                )}
                                                            />
                                                            <span className="text-[8px] text-gray-400 block">Default: 25 km (Maximum delivery boundary)</span>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-gray-600 uppercase">Standard Delivery Fee (₹)</label>
                                                            <Input
                                                                type="number"
                                                                step="1"
                                                                min="0"
                                                                value={deliverySettings.standard_charge}
                                                                onChange={(e) => setDeliverySettings(p => ({ ...p, standard_charge: parseFloat(e.target.value) || 0 }))}
                                                                className="h-8 text-xs border-slate-300 focus-visible:ring-slate-600 bg-white font-mono"
                                                            />
                                                            <span className="text-[8px] text-gray-400 block">Default: ₹69</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Constraint & Validation Error Notice */}
                                                {!isDeliveryValid && (
                                                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                                                        <div className="flex items-center gap-1.5 text-rose-700 text-xs font-bold">
                                                            <AlertTriangle className="h-4 w-4 text-rose-600" />
                                                            Invalid Delivery Configuration
                                                        </div>
                                                        <ul className="list-disc list-inside text-[10px] text-rose-600 space-y-0.5 pl-1">
                                                            {validationErrors.map((err, idx) => (
                                                                <li key={idx}>{err}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Staff Permission Warning */}
                                                {isStaff && (
                                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
                                                        <ShieldCheck className="h-4 w-4 text-amber-600 flex-shrink-0" />
                                                        <span className="text-[10px] text-amber-800 font-medium">
                                                            Operator Clearance: View-only mode. Only Super Administrators can alter delivery settings and pricing matrices.
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Action Bar */}
                                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gold/10">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={handleResetDelivery}
                                                        disabled={isStaff || isSavingDelivery}
                                                        className="w-full sm:w-auto h-9 text-[10px] font-bold uppercase tracking-wider text-gray-600 border-gray-200 hover:bg-gray-100 gap-1.5 cursor-pointer rounded-lg"
                                                    >
                                                        <RotateCcw className="h-3.5 w-3.5 text-gray-500" />
                                                        Reset to Defaults
                                                    </Button>

                                                    <Button
                                                        type="submit"
                                                        disabled={isStaff || isSavingDelivery || !isDeliveryValid}
                                                        className="w-full sm:w-auto h-9 text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-maroon to-maroon-dark hover:from-maroon-dark hover:to-maroon-dark text-gold shadow-md shadow-maroon/20 gap-1.5 cursor-pointer rounded-lg px-6"
                                                    >
                                                        {isSavingDelivery ? (
                                                            <>
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />
                                                                Saving Configurations...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Save className="h-3.5 w-3.5 text-gold" />
                                                                Commit Delivery Settings
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </form>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

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