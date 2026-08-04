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
import { Loader2, KeyRound, Eye, EyeOff, QrCode, Plus, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { settingsService, type UpiSetting } from '@/services/settingsService';

const passwordSchema = z.object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
    const logout = useAuthStore(state => state.logout);

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

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-maroon">Settings</h1>
                <p className="text-gray-500">Manage your account configurations and credentials</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 items-start">
                <Card className="border-gold/20 shadow-lg">
                    <CardHeader>
                        <div className="flex items-center gap-2 text-maroon">
                            <KeyRound className="h-5 w-5" />
                            <CardTitle className="text-xl">Change Password</CardTitle>
                        </div>
                        <CardDescription>
                            Update your administrator account password. At least 6 characters.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-maroon font-semibold">New Password</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type={showPassword ? 'text' : 'password'}
                                                        placeholder="••••••••"
                                                        {...field}
                                                        className="border-gold/30 focus-visible:ring-maroon pr-10"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-maroon/50 hover:text-maroon transition-colors"
                                                    >
                                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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
                                        <FormItem>
                                            <FormLabel className="text-maroon font-semibold">Confirm New Password</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type={showConfirmPassword ? 'text' : 'password'}
                                                        placeholder="••••••••"
                                                        {...field}
                                                        className="border-gold/30 focus-visible:ring-maroon pr-10"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-maroon/50 hover:text-maroon transition-colors"
                                                    >
                                                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button type="submit" className="bg-maroon hover:bg-maroon-dark text-gold w-full mt-2" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Update Password
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                <Card className="border-gold/20 shadow-lg border-2 border-gold/10">
                    <CardHeader>
                        <div className="flex items-center gap-2 text-maroon">
                            <QrCode className="h-5 w-5" />
                            <CardTitle className="text-xl">Merchant UPI IDs Settings</CardTitle>
                        </div>
                        <CardDescription>
                            Configure multiple UPI payment addresses for checkout QR scan generation.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {isLoadingUpi ? (
                            <div className="flex justify-center p-6">
                                <Loader2 className="h-6 w-6 animate-spin text-maroon" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                                    {upiSettings.length === 0 ? (
                                        <p className="text-gray-400 text-xs p-4 text-center">No UPI configurations stored. Add one below.</p>
                                    ) : (
                                        upiSettings.map((setting) => (
                                            <div key={setting.id || setting.upi_id} className="flex items-center justify-between p-3 bg-white hover:bg-gray-50/50">
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                                        {setting.label}
                                                    </p>
                                                    <p className="text-[11px] font-mono text-gray-500">{setting.upi_id}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleActive(setting)}
                                                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${setting.is_active
                                                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-105'
                                                            : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-150'
                                                            }`}
                                                    >
                                                        {setting.is_active ? 'Active' : 'Inactive'}
                                                    </button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteUpi(setting.id!, setting.label)}
                                                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        disabled={!setting.id}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <form onSubmit={handleAddUpi} className="space-y-3 pt-3 border-t border-gray-100">
                                    <h4 className="text-xs font-bold text-maroon uppercase tracking-wide">Add New UPI Address</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-600">Label (e.g. Primary - YBL)</label>
                                            <Input
                                                placeholder="Label"
                                                value={newUpiLabel}
                                                onChange={(e) => setNewUpiLabel(e.target.value)}
                                                className="h-8 text-xs border-gold/30 focus-visible:ring-maroon text-gray-800 bg-white"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-gray-600">UPI Address (e.g. user@abc)</label>
                                            <Input
                                                placeholder="7461824651@ybl"
                                                value={newUpiId}
                                                onChange={(e) => setNewUpiId(e.target.value)}
                                                className="h-8 text-xs border-gold/30 focus-visible:ring-maroon text-gray-800 bg-white"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={isSavingUpi}
                                        className="h-8 w-full bg-maroon hover:bg-maroon-dark text-gold font-semibold text-xs tracking-wider gap-1.5 shadow-sm rounded-lg"
                                    >
                                        {isSavingUpi ? (
                                            <>
                                                <Loader2 className="h-3 w-3 animate-spin text-gold" /> Adding...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="h-3.5 w-3.5 text-gold" /> Add UPI Configuration
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
