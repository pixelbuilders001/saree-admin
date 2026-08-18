import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Image, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
    Loader2, X, ChevronUp, ChevronDown, AlertTriangle, Check, FileImage
} from 'lucide-react';
import { toast } from 'sonner';
import { heroBannerService } from '@/services/heroBannerService';
import type { HeroBanner } from '@/services/heroBannerService';
import { compressImage } from '@/lib/imageCompressor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(banner?.imageUrl ?? null);
    const [saving, setSaving] = useState(false);
    const [compressing, setCompressing] = useState(false);
    const [sizeInfo, setSizeInfo] = useState<{ originalKB: number; compressedKB: number } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const originalKB = Math.round(file.size / 1024);
        setSizeInfo(null);
        setCompressing(true);

        // Show raw preview immediately for responsiveness
        const rawUrl = URL.createObjectURL(file);
        setPreview(rawUrl);

        try {
            // Compress: max 800 KB threshold, max 2400px (matches service settings)
            const compressed = await compressImage(file, 800, 2400);
            const compressedKB = Math.round(compressed.size / 1024);

            // Replace preview with compressed blob URL for accuracy
            URL.revokeObjectURL(rawUrl);
            setPreview(URL.createObjectURL(compressed));
            setImageFile(compressed);
            setSizeInfo({ originalKB, compressedKB });
        } catch {
            // Compression failed — fall back to original
            setImageFile(file);
            setSizeInfo({ originalKB, compressedKB: originalKB });
        } finally {
            setCompressing(false);
        }

        // Reset input so the same file can be re-selected
        e.target.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!preview && !imageFile) { toast.error('Image is required'); return; }

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
                await heroBannerService.updateBanner(banner.id, { ...fields, imageUrl: banner.imageUrl }, imageFile || undefined, banner.imageUrl);
                toast.success('Banner updated');
            } else {
                await heroBannerService.createBanner(fields, imageFile || undefined);
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

    const inp = "w-full text-xs border border-gold/20 rounded px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-maroon/30 placeholder:text-gray-300";
    const lbl = "text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gold/15 bg-cream/10">
                    <div className="flex items-center gap-2">
                        <div className="p-1 bg-maroon/5 rounded border border-gold/20">
                            <Image className="h-4 w-4 text-maroon" />
                        </div>
                        <h2 className="text-sm font-black font-serif text-maroon uppercase tracking-wider">
                            {isEdit ? 'Edit Banner' : 'New Banner'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
                        <X className="h-4 w-4 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Image Upload */}
                    <div>
                        <label className={lbl}>Banner Image *</label>
                        <div
                            onClick={() => !compressing && fileRef.current?.click()}
                            className={`relative border-2 border-dashed rounded-lg overflow-hidden bg-cream/5 transition-colors ${
                                compressing ? 'border-amber-300 cursor-wait' : 'border-gold/25 cursor-pointer hover:bg-cream/10'
                            }`}
                            style={{ minHeight: 160 }}
                        >
                            {preview ? (
                                <img src={preview} alt="Preview" className="w-full object-cover" style={{ maxHeight: 220 }} />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-40 gap-2">
                                    <FileImage className="h-8 w-8 text-gold/40" />
                                    <p className="text-xs text-gray-400">Click to upload banner image</p>
                                    <p className="text-[10px] text-gray-300">JPG, PNG, WebP — auto compressed before upload</p>
                                </div>
                            )}

                            {/* Compressing overlay */}
                            {compressing && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 backdrop-blur-[2px]">
                                    <Loader2 className="h-7 w-7 animate-spin text-white" />
                                    <span className="text-white text-xs font-bold tracking-wider">Compressing…</span>
                                </div>
                            )}

                            {/* Change image overlay (when not compressing) */}
                            {preview && !compressing && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/30 transition-opacity">
                                    <span className="text-white text-xs font-bold bg-black/50 px-3 py-1 rounded">Change Image</span>
                                </div>
                            )}
                        </div>

                        {/* Size info pill */}
                        {sizeInfo && !compressing && (
                            <div className={`mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                                sizeInfo.compressedKB < sizeInfo.originalKB
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                                <Check className="h-3 w-3" />
                                {sizeInfo.compressedKB < sizeInfo.originalKB
                                    ? `Compressed: ${sizeInfo.originalKB} KB → ${sizeInfo.compressedKB} KB (saved ${Math.round((1 - sizeInfo.compressedKB / sizeInfo.originalKB) * 100)}%)`
                                    : `Image ready: ${sizeInfo.compressedKB} KB (already optimised)`
                                }
                            </div>
                        )}

                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
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
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${form.is_active ? 'text-emerald-600' : 'text-gray-400'}`}>
                                {form.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button type="button" onClick={onClose}
                            className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider border border-gray-200 rounded text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving || compressing}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider bg-maroon text-white rounded hover:bg-maroon/90 disabled:opacity-50 transition-colors cursor-pointer">
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            {saving ? 'Saving…' : compressing ? 'Compressing…' : isEdit ? 'Update Banner' : 'Create Banner'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}

// ─── Delete Confirm ──────────────────────────────────────────────────────────
function DeleteConfirm({ banner, onClose, onDeleted }: { banner: HeroBanner; onClose: () => void; onDeleted: () => void }) {
    const [loading, setLoading] = useState(false);
    const handleDelete = async () => {
        setLoading(true);
        try {
            await heroBannerService.deleteBanner(banner.id, banner.imageUrl);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-red-50 rounded-full"><AlertTriangle className="h-5 w-5 text-red-500" /></div>
                    <div>
                        <h3 className="text-sm font-black text-gray-800">Delete Banner?</h3>
                        <p className="text-[10px] text-gray-400 mt-0.5">This will also remove the image from storage.</p>
                    </div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-xs font-bold text-red-700 truncate">"{banner.title}"</p>
                </div>
                <div className="flex gap-2 justify-end">
                    <button onClick={onClose} className="px-4 py-1.5 text-xs font-bold border border-gray-200 rounded text-gray-500 hover:bg-gray-50 cursor-pointer">Cancel</button>
                    <button onClick={handleDelete} disabled={loading}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 cursor-pointer">
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        {loading ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </motion.div>
        </div>
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
        <motion.div className="space-y-4 max-w-7xl mx-auto px-4 py-2"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gold/15 pb-3 gap-2">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="p-1 bg-maroon/5 rounded border border-gold/20">
                            <Image className="h-4.5 w-4.5 text-maroon" />
                        </div>
                        <h1 className="text-lg font-black font-serif text-maroon tracking-wider uppercase">Hero Banner Management</h1>
                    </div>
                    <p className="text-[10px] text-gray-500 font-sans mt-0.5">
                        Manage homepage hero banners — control visibility, order, and scheduling
                    </p>
                </div>
                <button onClick={openNew}
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white bg-maroon border border-maroon px-3 py-1.5 rounded hover:bg-maroon/90 transition-all shadow-sm active:scale-95 cursor-pointer">
                    <Plus className="h-3.5 w-3.5" />
                    Add Banner
                </button>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total Banners', value: banners.length },
                    { label: 'Active', value: banners.filter(b => b.isActive).length, color: 'text-emerald-700' },
                    { label: 'Inactive', value: banners.filter(b => !b.isActive).length, color: 'text-gray-400' },
                    { label: 'Scheduled', value: banners.filter(b => b.startAt || b.endAt).length, color: 'text-amber-600' },
                ].map(s => (
                    <Card key={s.label} className="border-gold/15 bg-white shadow-sm">
                        <CardContent className="p-3.5">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">{s.label}</p>
                            <p className={`text-xl font-black mt-1 ${s.color ?? 'text-gray-800'}`}>{s.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Banners list */}
            {banners.length === 0 ? (
                <Card className="border-gold/15 bg-white shadow-sm">
                    <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                        <div className="p-4 bg-cream/20 rounded-full border border-gold/15">
                            <Image className="h-10 w-10 text-gold/40" />
                        </div>
                        <p className="text-sm font-bold text-gray-500">No hero banners yet</p>
                        <p className="text-[10px] text-gray-400">Create your first banner to promote on the storefront homepage</p>
                        <button onClick={openNew}
                            className="flex items-center gap-1.5 mt-2 text-[10px] font-bold uppercase tracking-wider text-white bg-maroon px-4 py-1.5 rounded hover:bg-maroon/90 transition-all cursor-pointer">
                            <Plus className="h-3 w-3" /> Add First Banner
                        </button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-gold/15 bg-white shadow-sm overflow-hidden">
                    <CardHeader className="bg-cream/15 border-b border-gold/10 p-2.5 flex justify-between items-center flex-row">
                        <CardTitle className="text-xs font-bold text-maroon tracking-wider uppercase">All Banners</CardTitle>
                        <span className="text-[9px] text-gray-400">{banners.length} banner{banners.length !== 1 ? 's' : ''}</span>
                    </CardHeader>
                    <div className="divide-y divide-gold/8">
                        <AnimatePresence>
                            {banners.map((banner) => (
                                <motion.div key={banner.id}
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 hover:bg-cream/5 transition-colors">

                                    {/* Image preview */}
                                    <div className="flex-shrink-0 w-full sm:w-28 h-16 rounded-md overflow-hidden border border-gold/15 bg-gray-50">
                                        {banner.imageUrl ? (
                                            <img src={banner.imageUrl} alt={banner.title ?? undefined} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Image className="h-5 w-5 text-gray-200" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {banner.eyebrow && (
                                                <span className="text-[8px] font-bold uppercase tracking-widest text-gold border border-gold/30 px-1.5 py-0.5 rounded bg-gold/5">
                                                    {banner.eyebrow}
                                                </span>
                                            )}
                                            <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${banner.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-50 text-gray-400 border border-gray-200'}`}>
                                                {banner.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                            <span className="text-[8px] text-gray-400 font-mono border border-gray-100 px-1.5 py-0.5 rounded bg-gray-50">
                                                Order #{banner.sortOrder}
                                            </span>
                                        </div>
                                        <p className="text-sm font-bold text-gray-800 mt-1 truncate">{banner.title}</p>
                                        {banner.subtitle && <p className="text-[10px] text-gray-400 truncate">{banner.subtitle}</p>}
                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                            {banner.buttonText && (
                                                <span className="text-[9px] text-maroon font-semibold">
                                                    CTA: {banner.buttonText}
                                                    {banner.buttonLink && <span className="text-gray-400 ml-1">→ {banner.buttonLink}</span>}
                                                </span>
                                            )}
                                            {(banner.startAt || banner.endAt) && (
                                                <span className="text-[9px] text-amber-600 font-mono">
                                                    {formatDate(banner.startAt)} – {formatDate(banner.endAt)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {/* Sort */}
                                        <div className="flex flex-col">
                                            <button onClick={() => handleSort(banner, 'up')}
                                                className="p-0.5 text-gray-300 hover:text-maroon transition-colors cursor-pointer"
                                                title="Move up">
                                                <ChevronUp className="h-3.5 w-3.5" />
                                            </button>
                                            <button onClick={() => handleSort(banner, 'down')}
                                                className="p-0.5 text-gray-300 hover:text-maroon transition-colors cursor-pointer"
                                                title="Move down">
                                                <ChevronDown className="h-3.5 w-3.5" />
                                            </button>
                                        </div>

                                        {/* Toggle */}
                                        <button
                                            onClick={() => toggleMutation.mutate({ id: banner.id, isActive: !banner.isActive })}
                                            disabled={toggleMutation.isPending}
                                            title={banner.isActive ? 'Deactivate' : 'Activate'}
                                            className="p-1.5 rounded hover:bg-gray-100 transition-colors cursor-pointer">
                                            {banner.isActive
                                                ? <ToggleRight className="h-5 w-5 text-emerald-600" />
                                                : <ToggleLeft className="h-5 w-5 text-gray-300" />}
                                        </button>

                                        {/* Edit */}
                                        <button onClick={() => openEdit(banner)}
                                            className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors cursor-pointer"
                                            title="Edit banner">
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>

                                        {/* Delete */}
                                        <button onClick={() => setDeleteTarget(banner)}
                                            className="p-1.5 rounded hover:bg-red-50 text-red-500 transition-colors cursor-pointer"
                                            title="Delete banner">
                                            <Trash2 className="h-3.5 w-3.5" />
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
