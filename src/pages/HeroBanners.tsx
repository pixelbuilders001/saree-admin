import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Image, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
    Loader2, ChevronUp, ChevronDown, AlertTriangle, Check, FileImage,
    CalendarClock, Eye, EyeOff, Layers, Smartphone, Monitor, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { heroBannerService } from '@/services/heroBannerService';
import type { HeroBanner } from '@/services/heroBannerService';
import { compressImage } from '@/lib/imageCompressor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// ─── Types ───────────────────────────────────────────────────────────────────
type FormState = {
    eyebrow: string;
    title: string;
    subtitle: string;
    button_text: string;
    button_link: string;
    is_active: boolean;
    sort_order: string;
    start_at: string;
    end_at: string;
};

const EMPTY_FORM: FormState = {
    eyebrow: '', title: '', subtitle: '',
    button_text: '', button_link: '',
    is_active: true, sort_order: '0',
    start_at: '', end_at: '',
};

const inp = "w-full text-xs border border-gold/25 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-maroon/30 placeholder:text-gray-300";
const lbl = "text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block";

// ─── Modal ────────────────────────────────────────────────────────────────────
function BannerModal({
    banner, onClose, onSaved,
}: {
    banner: HeroBanner | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = !!banner;
    const [form, setForm] = useState<FormState>(
        banner ? {
            eyebrow: banner.eyebrow ?? '',
            title: banner.title ?? '',
            subtitle: banner.subtitle ?? '',
            button_text: banner.buttonText ?? '',
            button_link: banner.buttonLink ?? '',
            is_active: banner.isActive,
            sort_order: String(banner.sortOrder),
            start_at: banner.startAt ? banner.startAt.slice(0, 16) : '',
            end_at: banner.endAt ? banner.endAt.slice(0, 16) : '',
        } : EMPTY_FORM
    );
    // Desktop banner states
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(banner?.imageUrl ?? null);
    const [compressing, setCompressing] = useState(false);
    const [sizeInfo, setSizeInfo] = useState<{ originalKB: number; compressedKB: number } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // Mobile banner states (vertical aspect 4/5)
    const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);
    const [mobilePreview, setMobilePreview] = useState<string | null>(banner?.mobileImageUrl ?? null);
    const [mobileCompressing, setMobileCompressing] = useState(false);
    const [mobileSizeInfo, setMobileSizeInfo] = useState<{ originalKB: number; compressedKB: number } | null>(null);
    const [removeMobileImage, setRemoveMobileImage] = useState(false);
    const mobileFileRef = useRef<HTMLInputElement>(null);

    const [saving, setSaving] = useState(false);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const originalKB = Math.round(file.size / 1024);
        setSizeInfo(null);
        setCompressing(true);

        const rawUrl = URL.createObjectURL(file);
        setPreview(rawUrl);

        try {
            // Compress: max 800 KB threshold, max 2400px, converted to WebP
            const compressed = await compressImage(file, 800, 2400, 'image/webp');
            const compressedKB = Math.round(compressed.size / 1024);

            URL.revokeObjectURL(rawUrl);
            setPreview(URL.createObjectURL(compressed));
            setImageFile(compressed);
            setSizeInfo({ originalKB, compressedKB });
        } catch {
            setImageFile(file);
            setSizeInfo({ originalKB, compressedKB: originalKB });
        } finally {
            setCompressing(false);
        }

        e.target.value = '';
    };

    const handleMobileFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const originalKB = Math.round(file.size / 1024);
        setMobileSizeInfo(null);
        setMobileCompressing(true);
        setRemoveMobileImage(false);

        const rawUrl = URL.createObjectURL(file);
        setMobilePreview(rawUrl);

        try {
            // Compress mobile image: max 800 KB, max 1600px, WebP
            const compressed = await compressImage(file, 800, 1600, 'image/webp');
            const compressedKB = Math.round(compressed.size / 1024);

            URL.revokeObjectURL(rawUrl);
            setMobilePreview(URL.createObjectURL(compressed));
            setMobileImageFile(compressed);
            setMobileSizeInfo({ originalKB, compressedKB });
        } catch {
            setMobileImageFile(file);
            setMobileSizeInfo({ originalKB, compressedKB: originalKB });
        } finally {
            setMobileCompressing(false);
        }

        e.target.value = '';
    };

    const handleClearMobileImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMobilePreview(null);
        setMobileImageFile(null);
        setMobileSizeInfo(null);
        setRemoveMobileImage(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!preview && !imageFile) { toast.error('Desktop banner image is required'); return; }

        setSaving(true);
        try {
            const fields = {
                eyebrow: form.eyebrow || null,
                title: form.title.trim() || null,
                subtitle: form.subtitle || null,
                buttonText: form.button_text || null,
                buttonLink: form.button_link || null,
                isActive: form.is_active,
                sortOrder: parseInt(form.sort_order) || 0,
                startAt: form.start_at || null,
                endAt: form.end_at || null,
            };

            if (isEdit && banner) {
                const finalMobileImageUrl = removeMobileImage ? null : (mobileImageFile ? undefined : banner.mobileImageUrl);
                await heroBannerService.updateBanner(
                    banner.id,
                    {
                        ...fields,
                        imageUrl: banner.imageUrl,
                        ...(finalMobileImageUrl !== undefined ? { mobileImageUrl: finalMobileImageUrl } : {})
                    },
                    imageFile || undefined,
                    banner.imageUrl,
                    mobileImageFile || undefined,
                    banner.mobileImageUrl
                );
                toast.success('Banner updated');
            } else {
                await heroBannerService.createBanner(
                    fields,
                    imageFile || undefined,
                    mobileImageFile || undefined
                );
                toast.success('Banner created');
            }
            onSaved();
            onClose();
        } catch (err: any) {
            toast.error(err?.message ?? 'Failed to save banner');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="border-gold/20 max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="border-b border-gold/10 pb-2">
                    <DialogTitle className="text-sm font-bold text-maroon uppercase tracking-wider font-serif flex items-center gap-1.5">
                        <Image className="h-4 w-4 text-maroon/70" />
                        {isEdit ? 'Edit Banner' : 'New Banner'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    {/* Image Uploads Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {/* 1. Desktop Image Upload */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className={lbl}>
                                    <span className="flex items-center gap-1.5 text-gray-700">
                                        <Monitor className="h-3.5 w-3.5 text-maroon" />
                                        Desktop Banner *
                                    </span>
                                </label>
                                <span className="text-[9px] text-gray-400 font-medium">Aspect ~21:8 (Landscape)</span>
                            </div>
                            <div
                                onClick={() => !compressing && fileRef.current?.click()}
                                className={cn(
                                    "relative border-2 border-dashed rounded-lg overflow-hidden bg-cream/5 transition-colors flex flex-col items-center justify-center",
                                    compressing ? 'border-amber-300 cursor-wait' : 'border-gold/25 cursor-pointer hover:bg-cream/10'
                                )}
                                style={{ height: 160 }}
                            >
                                {preview ? (
                                    <img src={preview} alt="Desktop Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-3 text-center gap-1.5">
                                        <FileImage className="h-7 w-7 text-gold/50" />
                                        <p className="text-xs font-semibold text-gray-600">Click to upload desktop banner</p>
                                        <p className="text-[10px] text-gray-400">JPG, PNG, WebP (auto-compressed)</p>
                                    </div>
                                )}

                                {/* Compressing overlay */}
                                {compressing && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 backdrop-blur-[2px]">
                                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                                        <span className="text-white text-[10px] font-bold tracking-wider">Compressing…</span>
                                    </div>
                                )}

                                {/* Change image overlay */}
                                {preview && !compressing && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/30 transition-opacity">
                                        <span className="text-white text-[10px] font-bold bg-black/60 px-2.5 py-1 rounded">Change Desktop Image</span>
                                    </div>
                                )}
                            </div>

                            {/* Size info pill */}
                            {sizeInfo && !compressing && (
                                <div className={cn(
                                    "inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border",
                                    sizeInfo.compressedKB < sizeInfo.originalKB
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                )}>
                                    <Check className="h-2.5 w-2.5" />
                                    {sizeInfo.compressedKB < sizeInfo.originalKB
                                        ? `Compressed: ${sizeInfo.originalKB} KB → ${sizeInfo.compressedKB} KB (-${Math.round((1 - sizeInfo.compressedKB / sizeInfo.originalKB) * 100)}%)`
                                        : `Optimised: ${sizeInfo.compressedKB} KB`}
                                </div>
                            )}

                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                        </div>

                        {/* 2. Mobile Image Upload */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className={lbl}>
                                    <span className="flex items-center gap-1.5 text-gray-700">
                                        <Smartphone className="h-3.5 w-3.5 text-maroon" />
                                        Mobile Banner (Optional)
                                    </span>
                                </label>
                                <span className="text-[9px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                    Aspect 2:3 (Vertical)
                                </span>
                            </div>
                            <div
                                onClick={() => !mobileCompressing && mobileFileRef.current?.click()}
                                className={cn(
                                    "relative border-2 border-dashed rounded-lg overflow-hidden bg-cream/5 transition-colors flex flex-col items-center justify-center",
                                    mobileCompressing ? 'border-amber-300 cursor-wait' : 'border-gold/25 cursor-pointer hover:bg-cream/10'
                                )}
                                style={{ height: 160 }}
                            >
                                {mobilePreview ? (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-900/5">
                                        <img src={mobilePreview} alt="Mobile Preview" className="h-full object-contain aspect-[2/3] rounded shadow-xs" />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-3 text-center gap-1">
                                        <Smartphone className="h-7 w-7 text-gold/50" />
                                        <p className="text-xs font-semibold text-gray-600">Upload Mobile Banner</p>
                                        <p className="text-[10px] text-gray-400 font-mono">Aspect 2:3 (e.g. 1024×1536)</p>
                                        <p className="text-[9px] text-amber-600/90 font-medium">If omitted, desktop banner will be used</p>
                                    </div>
                                )}

                                {/* Compressing overlay */}
                                {mobileCompressing && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 backdrop-blur-[2px]">
                                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                                        <span className="text-white text-[10px] font-bold tracking-wider">Compressing…</span>
                                    </div>
                                )}

                                {/* Change or Remove image overlay */}
                                {mobilePreview && !mobileCompressing && (
                                    <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 bg-black/30 transition-opacity">
                                        <span className="text-white text-[10px] font-bold bg-black/60 px-2.5 py-1 rounded">Change</span>
                                        <button
                                            type="button"
                                            onClick={handleClearMobileImage}
                                            className="text-white text-[10px] font-bold bg-red-600/90 hover:bg-red-700 px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer"
                                            title="Remove mobile image"
                                        >
                                            <X className="h-3 w-3" /> Remove
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Size info pill */}
                            {mobileSizeInfo && !mobileCompressing && (
                                <div className={cn(
                                    "inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border",
                                    mobileSizeInfo.compressedKB < mobileSizeInfo.originalKB
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                )}>
                                    <Check className="h-2.5 w-2.5" />
                                    {mobileSizeInfo.compressedKB < mobileSizeInfo.originalKB
                                        ? `Compressed: ${mobileSizeInfo.originalKB} KB → ${mobileSizeInfo.compressedKB} KB (-${Math.round((1 - mobileSizeInfo.compressedKB / mobileSizeInfo.originalKB) * 100)}%)`
                                        : `Optimised: ${mobileSizeInfo.compressedKB} KB`}
                                </div>
                            )}

                            <input ref={mobileFileRef} type="file" accept="image/*" className="hidden" onChange={handleMobileFile} />
                        </div>
                    </div>

                    {/* Fields grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                            <label className={lbl}>Title</label>
                            <input className={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. New Arrivals – Banarasi Silk" />
                        </div>
                        <div>
                            <label className={lbl}>Eyebrow Label</label>
                            <input className={inp} value={form.eyebrow} onChange={e => setForm(f => ({ ...f, eyebrow: e.target.value }))} placeholder="e.g. Limited Collection" />
                        </div>
                        <div>
                            <label className={lbl}>Sort Order</label>
                            <input className={inp} type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} min="0" />
                        </div>
                        <div className="md:col-span-2">
                            <label className={lbl}>Subtitle</label>
                            <input className={inp} value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="Short description or tagline" />
                        </div>
                        <div>
                            <label className={lbl}>Button Text</label>
                            <input className={inp} value={form.button_text} onChange={e => setForm(f => ({ ...f, button_text: e.target.value }))} placeholder="e.g. Shop Now" />
                        </div>
                        <div>
                            <label className={lbl}>Button Link</label>
                            <input className={inp} value={form.button_link} onChange={e => setForm(f => ({ ...f, button_link: e.target.value }))} placeholder="e.g. /collections/new" />
                        </div>
                        <div>
                            <label className={lbl}>Start Date / Time</label>
                            <input className={inp} type="datetime-local" value={form.start_at} onChange={e => setForm(f => ({ ...f, start_at: e.target.value }))} />
                        </div>
                        <div>
                            <label className={lbl}>End Date / Time</label>
                            <input className={inp} type="datetime-local" value={form.end_at} onChange={e => setForm(f => ({ ...f, end_at: e.target.value }))} />
                        </div>
                    </div>

                    {/* Active toggle */}
                    <div className="flex items-center justify-between p-3 bg-cream/10 rounded-lg border border-gold/15">
                        <div>
                            <p className="text-xs font-bold text-gray-700">Active Status</p>
                            <p className="text-[10px] text-gray-400">Inactive banners are hidden on the storefront</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                            className="flex items-center gap-1.5 cursor-pointer"
                        >
                            {form.is_active
                                ? <ToggleRight className="h-8 w-8 text-emerald-600" />
                                : <ToggleLeft className="h-8 w-8 text-gray-300" />}
                            <span className={cn("text-[10px] font-bold uppercase tracking-wider", form.is_active ? 'text-emerald-600' : 'text-gray-400')}>
                                {form.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </button>
                    </div>

                    {/* Actions */}
                    <DialogFooter className="gap-1.5 pt-1">
                        <Button type="button" variant="outline" onClick={onClose}
                            className="h-8 text-[10px] border-gray-200 text-gray-600 uppercase font-bold px-3 cursor-pointer">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving || compressing || mobileCompressing}
                            className="h-8 text-[10px] bg-gradient-to-r from-maroon to-maroon-dark hover:from-maroon-dark hover:to-maroon-dark text-gold uppercase font-bold px-4 cursor-pointer gap-1.5">
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            {saving ? 'Saving…' : (compressing || mobileCompressing) ? 'Compressing…' : isEdit ? 'Update Banner' : 'Create Banner'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ─── Delete Confirm ──────────────────────────────────────────────────────────
function DeleteConfirm({ banner, onClose, onDeleted }: { banner: HeroBanner; onClose: () => void; onDeleted: () => void }) {
    const [loading, setLoading] = useState(false);
    const handleDelete = async () => {
        setLoading(true);
        try {
            await heroBannerService.deleteBanner(banner.id, banner.imageUrl, banner.mobileImageUrl);
            toast.success('Banner deleted');
            onDeleted();
            onClose();
        } catch (err: any) {
            toast.error(err?.message ?? 'Delete failed');
        } finally {
            setLoading(false);
        }
    };
    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="border-gold/20 max-w-sm">
                <DialogHeader className="border-b border-gold/10 pb-2">
                    <DialogTitle className="text-sm font-bold text-maroon uppercase tracking-wider font-serif flex items-center gap-2">
                        <div className="p-1.5 bg-red-50 rounded-full"><AlertTriangle className="h-4 w-4 text-red-500" /></div>
                        Delete Banner?
                    </DialogTitle>
                </DialogHeader>
                <DialogDescription asChild>
                    <div className="space-y-3 pt-2">
                        <p className="text-xs text-gray-500">This will also remove any uploaded desktop and mobile images from storage.</p>
                        <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                            <p className="text-xs font-bold text-red-700 truncate">"{banner.title || 'Untitled Banner'}"</p>
                        </div>
                    </div>
                </DialogDescription>
                <DialogFooter className="gap-1.5 pt-1">
                    <Button variant="outline" onClick={onClose}
                        className="h-8 text-[10px] border-gray-200 text-gray-600 uppercase font-bold px-3 cursor-pointer">Cancel</Button>
                    <Button onClick={handleDelete} disabled={loading}
                        className="h-8 text-[10px] bg-red-600 hover:bg-red-700 text-white uppercase font-bold px-4 cursor-pointer gap-1.5">
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        {loading ? 'Deleting…' : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HeroBannersPage() {
    const qc = useQueryClient();
    const [modalBanner, setModalBanner] = useState<HeroBanner | null | 'new'>('new' as any);
    const [showModal, setShowModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<HeroBanner | null>(null);

    const { data: banners = [], isLoading } = useQuery({
        queryKey: ['hero_banners'],
        queryFn: heroBannerService.getBanners,
    });

    const toggleMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
            heroBannerService.toggleActive(id, isActive),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['hero_banners'] }); },
        onError: (err: any) => toast.error(err?.message ?? 'Toggle failed'),
    });

    const sortMutation = useMutation({
        mutationFn: ({ id, sortOrder, imageUrl }: { id: string; sortOrder: number; imageUrl: string | null }) =>
            heroBannerService.updateBanner(id, { sortOrder, imageUrl }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['hero_banners'] }); },
        onError: (err: any) => toast.error(err?.message ?? 'Sort failed'),
    });

    const openNew = () => { setModalBanner(null); setShowModal(true); };
    const openEdit = (b: HeroBanner) => { setModalBanner(b); setShowModal(true); };
    const closeModal = () => setShowModal(false);
    const onSaved = () => qc.invalidateQueries({ queryKey: ['hero_banners'] });

    const handleSort = (banner: HeroBanner, dir: 'up' | 'down') => {
        const delta = dir === 'up' ? -1 : 1;
        sortMutation.mutate({ id: banner.id, sortOrder: banner.sortOrder + delta, imageUrl: banner.imageUrl });
    };

    const formatDate = (s: string | null) => s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    const activeCount = banners.filter(b => b.isActive).length;
    const scheduledCount = banners.filter(b => b.startAt || b.endAt).length;
    const mobileCustomCount = banners.filter(b => b.mobileImageUrl).length;

    if (isLoading) {
        return (
            <div className="h-[80vh] flex items-center justify-center">
                <div className="text-center space-y-3">
                    <Loader2 className="h-10 w-10 animate-spin text-maroon mx-auto" />
                    <p className="text-xs font-serif text-maroon tracking-wider animate-pulse">LOADING HERO BANNERS…</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div className="space-y-5 max-w-7xl mx-auto px-2 pb-10"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-maroon to-maroon-dark text-gold rounded-xl shadow-md shadow-maroon/20">
                        <Image className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold font-serif text-maroon tracking-wide">Hero Banners</h1>
                        <p className="text-xs text-gray-500 font-sans">Manage homepage hero banners — desktop landscape & mobile vertical (2:3)</p>
                    </div>
                </div>

                <Button onClick={openNew}
                    className="bg-gradient-to-r from-maroon to-maroon-dark hover:from-maroon-dark hover:to-maroon-dark text-gold h-9 text-xs font-bold shadow-md shadow-maroon/20 gap-1.5 hover:shadow-lg hover:shadow-maroon/30 transition-all cursor-pointer">
                    <Plus className="h-4 w-4" />
                    Add Banner
                </Button>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Banners', value: banners.length, icon: Layers, from: 'from-slate-600', to: 'to-slate-800', text: 'text-gray-800' },
                    { label: 'Active', value: activeCount, icon: Eye, from: 'from-emerald-500', to: 'to-emerald-700', text: 'text-emerald-600' },
                    { label: 'Mobile (2:3)', value: mobileCustomCount, icon: Smartphone, from: 'from-amber-500', to: 'to-amber-700', text: 'text-amber-600' },
                    { label: 'Scheduled', value: scheduledCount, icon: CalendarClock, from: 'from-blue-500', to: 'to-blue-700', text: 'text-blue-600' },
                ].map((s, i) => (
                    <motion.div key={s.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}>
                        <Card className="border-gold/20 shadow-sm hover:shadow-md transition-shadow bg-white">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">{s.label}</span>
                                    <span className={cn("text-2xl font-bold font-mono", s.text)}>{s.value}</span>
                                </div>
                                <div className={cn("p-2.5 bg-gradient-to-br text-white rounded-xl shadow", s.from, s.to)}>
                                    <s.icon className="h-5 w-5" />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Banners list */}
            {banners.length === 0 ? (
                <Card className="border-gold/20 shadow-sm bg-white">
                    <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="p-4 bg-gradient-to-br from-maroon to-maroon-dark rounded-2xl text-gold shadow-lg shadow-maroon/25">
                            <Image className="h-8 w-8" />
                        </div>
                        <p className="text-sm font-bold text-gray-500">No hero banners yet</p>
                        <p className="text-xs text-gray-400">Create your first banner to promote on the storefront homepage</p>
                        <Button onClick={openNew}
                            className="bg-gradient-to-r from-maroon to-maroon-dark hover:from-maroon-dark hover:to-maroon-dark text-gold h-8 text-[10px] font-bold uppercase tracking-wider gap-1.5 mt-2 shadow-md shadow-maroon/20 cursor-pointer">
                            <Plus className="h-3.5 w-3.5" /> Add First Banner
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-gold/20 shadow-md bg-white overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/10 px-4 py-3">
                        <CardTitle className="text-sm font-bold text-maroon uppercase tracking-wider flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Image className="h-4 w-4 text-maroon/70" />
                                All Banners
                                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-mono">
                                    {banners.length}
                                </span>
                            </span>
                            <span className="text-[10px] text-gray-500 normal-case font-normal hidden md:inline">Use arrows to reorder</span>
                        </CardTitle>
                    </CardHeader>
                    <div className="divide-y divide-gold/10">
                        <AnimatePresence>
                            {banners.map((banner) => (
                                <motion.div key={banner.id}
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-3.5 hover:bg-cream/10 transition-colors">

                                    {/* Dual Preview: Desktop + Mobile */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {/* Desktop Preview */}
                                        <div className="w-28 sm:w-32 h-18 rounded-lg overflow-hidden border border-gold/15 bg-gray-50 relative group" title="Desktop Banner">
                                            {banner.imageUrl ? (
                                                <img src={banner.imageUrl} alt={banner.title ?? undefined} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Image className="h-6 w-6 text-gray-200" />
                                                </div>
                                            )}
                                            <span className="absolute bottom-1 left-1 bg-black/60 text-[8px] font-bold text-white px-1 rounded flex items-center gap-0.5 pointer-events-none">
                                                <Monitor className="h-2 w-2" /> Desktop
                                            </span>
                                        </div>

                                        {/* Mobile Preview */}
                                        {banner.mobileImageUrl ? (
                                            <div className="w-12 h-18 rounded-lg overflow-hidden border border-gold/25 bg-gray-900/5 relative group" title="Custom Mobile Banner (2:3)">
                                                <img src={banner.mobileImageUrl} alt="Mobile Banner" className="w-full h-full object-cover" />
                                                <span className="absolute bottom-1 left-0.5 right-0.5 bg-maroon/85 text-[7px] font-bold text-gold px-0.5 py-0.2 rounded text-center flex items-center justify-center gap-0.5 pointer-events-none">
                                                    <Smartphone className="h-2 w-2" /> 2:3
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="w-12 h-18 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-[7px] text-gray-400 text-center p-1" title="No separate mobile banner; desktop banner used as fallback">
                                                <Smartphone className="h-3.5 w-3.5 text-gray-300 mb-0.5" />
                                                <span className="leading-tight">Desktop Fallback</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {banner.eyebrow && (
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-maroon border border-gold/30 px-2 py-0.5 rounded-full bg-gold/10">
                                                    {banner.eyebrow}
                                                </span>
                                            )}
                                            <span className={cn(
                                                "inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                                banner.isActive
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-gray-50 text-gray-400 border-gray-200'
                                            )}>
                                                {banner.isActive ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
                                                {banner.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                            <span className="text-[9px] text-gray-400 font-mono border border-gray-100 px-2 py-0.5 rounded-full bg-gray-50">
                                                Order #{banner.sortOrder}
                                            </span>
                                            {banner.mobileImageUrl && (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                                    <Smartphone className="h-2.5 w-2.5" />
                                                    Vertical 2:3
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm font-bold text-gray-800 mt-1.5 truncate">{banner.title || 'Untitled Banner'}</p>
                                        {banner.subtitle && <p className="text-xs text-gray-400 truncate">{banner.subtitle}</p>}
                                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                            {banner.buttonText && (
                                                <span className="text-[10px] text-maroon font-semibold">
                                                    CTA: {banner.buttonText}
                                                    {banner.buttonLink && <span className="text-gray-400 ml-1">→ {banner.buttonLink}</span>}
                                                </span>
                                            )}
                                            {(banner.startAt || banner.endAt) && (
                                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-mono">
                                                    <CalendarClock className="h-3 w-3" />
                                                    {formatDate(banner.startAt)} – {formatDate(banner.endAt)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {/* Sort */}
                                        <div className="flex flex-col mr-1">
                                            <button onClick={() => handleSort(banner, 'up')}
                                                className="p-0.5 text-gray-300 hover:text-maroon transition-colors cursor-pointer"
                                                title="Move up">
                                                <ChevronUp className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleSort(banner, 'down')}
                                                className="p-0.5 text-gray-300 hover:text-maroon transition-colors cursor-pointer"
                                                title="Move down">
                                                <ChevronDown className="h-4 w-4" />
                                            </button>
                                        </div>

                                        {/* Toggle */}
                                        <button
                                            onClick={() => toggleMutation.mutate({ id: banner.id, isActive: !banner.isActive })}
                                            disabled={toggleMutation.isPending}
                                            title={banner.isActive ? 'Deactivate' : 'Activate'}
                                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                                            {banner.isActive
                                                ? <ToggleRight className="h-5 w-5 text-emerald-600" />
                                                : <ToggleLeft className="h-5 w-5 text-gray-300" />}
                                        </button>

                                        {/* Edit */}
                                        <button onClick={() => openEdit(banner)}
                                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors cursor-pointer"
                                            title="Edit banner">
                                            <Pencil className="h-4 w-4" />
                                        </button>

                                        {/* Delete */}
                                        <button onClick={() => setDeleteTarget(banner)}
                                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors cursor-pointer"
                                            title="Delete banner">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </Card>
            )}

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <BannerModal
                        banner={modalBanner as HeroBanner | null}
                        onClose={closeModal}
                        onSaved={onSaved}
                    />
                )}
            </AnimatePresence>

            {/* Delete Confirm */}
            <AnimatePresence>
                {deleteTarget && (
                    <DeleteConfirm
                        banner={deleteTarget}
                        onClose={() => setDeleteTarget(null)}
                        onDeleted={onSaved}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}