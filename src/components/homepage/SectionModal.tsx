import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    type HomepageSection,
    type Collection,
    DISPLAY_STYLE_OPTIONS
} from '@/types/homepage';
import { homepageSectionService } from '@/services/homepageSectionService';
import { toast } from 'sonner';
import {
    LayoutGrid,
    CalendarClock,
    Link as LinkIcon,
    Image as ImageIcon,
    UploadCloud,
    X,
    Loader2
} from 'lucide-react';

interface SectionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sectionToEdit: HomepageSection | null;
    collections: Collection[];
    onSaved: () => void;
}

interface SectionFormProps {
    sectionToEdit: HomepageSection | null;
    collections: Collection[];
    onClose: () => void;
    onSaved: () => void;
}

const SectionForm: React.FC<SectionFormProps> = ({
    sectionToEdit,
    collections,
    onClose,
    onSaved,
}) => {
    const isEdit = !!sectionToEdit;

    const [title, setTitle] = useState(sectionToEdit?.title || '');
    const [subtitle, setSubtitle] = useState(sectionToEdit?.subtitle || '');
    const [collectionId, setCollectionId] = useState(
        sectionToEdit?.collectionId || collections[0]?.id || ''
    );
    const [displayStyle, setDisplayStyle] = useState(sectionToEdit?.displayStyle || 'grid');
    const [imageUrl, setImageUrl] = useState(sectionToEdit?.imageUrl || '');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(sectionToEdit?.imageUrl || null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [viewAllText, setViewAllText] = useState(sectionToEdit?.viewAllText || 'View All');
    const [viewAllUrl, setViewAllUrl] = useState(sectionToEdit?.viewAllUrl || '');
    const [startAt, setStartAt] = useState(
        sectionToEdit?.startAt ? sectionToEdit.startAt.slice(0, 16) : ''
    );
    const [endAt, setEndAt] = useState(
        sectionToEdit?.endAt ? sectionToEdit.endAt.slice(0, 16) : ''
    );
    const [isActive, setIsActive] = useState(sectionToEdit ? sectionToEdit.isActive : true);
    const [saving, setSaving] = useState(false);

    const handleClearSchedule = () => {
        setStartAt('');
        setEndAt('');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file (PNG, JPG, WebP)');
            return;
        }

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setImageUrl('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            toast.error('Please enter a section title');
            return;
        }

        if (!collectionId) {
            toast.error('Please select a collection for this section');
            return;
        }

        if (startAt && endAt && new Date(startAt) > new Date(endAt)) {
            toast.error('Start date cannot be after end date');
            return;
        }

        setSaving(true);
        try {
            let finalImageUrl = imageUrl;

            // If banner/split_feature/offer_timer style and new image selected, upload to ImageKit
            const supportsImage = displayStyle === 'banner' || displayStyle === 'split_feature' || displayStyle === 'offer_timer';
            if (supportsImage && imageFile) {
                setUploadingImage(true);
                try {
                    finalImageUrl = await homepageSectionService.uploadBannerImage(imageFile);
                    toast.success(
                        displayStyle === 'banner'
                            ? 'Banner image uploaded to ImageKit'
                            : displayStyle === 'split_feature'
                            ? 'Feature image uploaded to ImageKit'
                            : 'Background image uploaded to ImageKit'
                    );
                } catch (uploadErr: unknown) {
                    const msg = uploadErr instanceof Error ? uploadErr.message : 'Image upload failed';
                    toast.error(msg);
                    setSaving(false);
                    setUploadingImage(false);
                    return;
                } finally {
                    setUploadingImage(false);
                }
            }

            if (isEdit && sectionToEdit) {
                await homepageSectionService.updateSection(sectionToEdit.id, {
                    title,
                    subtitle,
                    collectionId,
                    displayStyle,
                    imageUrl: supportsImage ? (finalImageUrl || null) : null,
                    viewAllText,
                    viewAllUrl,
                    startAt: startAt ? new Date(startAt).toISOString() : null,
                    endAt: endAt ? new Date(endAt).toISOString() : null,
                    isActive,
                });
                toast.success('Homepage section updated successfully');
            } else {
                await homepageSectionService.createSection({
                    title,
                    subtitle,
                    collectionId,
                    displayStyle,
                    imageUrl: supportsImage ? (finalImageUrl || null) : null,
                    viewAllText,
                    viewAllUrl,
                    startAt: startAt ? new Date(startAt).toISOString() : null,
                    endAt: endAt ? new Date(endAt).toISOString() : null,
                    isActive,
                });
                toast.success('Homepage section created successfully');
            }

            onSaved();
            onClose();
        } catch (err: unknown) {
            console.error('Failed to save section:', err);
            const msg = err instanceof Error ? err.message : 'Failed to save section';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Section Title & Subtitle */}
                <div className="space-y-3">
                    <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 block mb-1">
                            Section Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. New Arrivals, Festive Collection, Editor's Picks"
                            required
                            className="w-full text-xs border border-gold/30 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-maroon text-gray-800 font-medium"
                        />
                    </div>

                    <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 block mb-1">
                            Subtitle (Optional)
                        </label>
                        <input
                            type="text"
                            value={subtitle}
                            onChange={(e) => setSubtitle(e.target.value)}
                            placeholder="e.g. Handcrafted pure silk heritage sarees"
                            className="w-full text-xs border border-gold/30 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-maroon text-gray-800"
                        />
                    </div>
                </div>

                {/* Collection Selector */}
                <div className="bg-cream/15 p-3.5 rounded-xl border border-gold/25 space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 block">
                        Collection <span className="text-red-500">*</span>
                    </label>
                    {collections.length === 0 ? (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                            No collections available. Please create a collection first before creating a homepage section.
                        </div>
                    ) : (
                        <select
                            value={collectionId}
                            onChange={(e) => setCollectionId(e.target.value)}
                            required
                            aria-label="Section Collection"
                            className="w-full text-xs border border-gold/30 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-maroon text-gray-800 font-medium"
                        >
                            <option value="" disabled>Select Collection</option>
                            {collections.map((col) => (
                                <option key={col.id} value={col.id}>
                                    {col.name} ({col.collectionType === 'automatic' ? 'Automatic' : 'Manual'}) {col.isActive ? '' : '• Inactive'}
                                </option>
                            ))}
                        </select>
                    )}
                    <p className="text-[10px] text-gray-500">
                        Connects this section to a reusable group of sarees defined by rules or manual selection.
                    </p>
                </div>

                {/* Display Style */}
                <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 block mb-1">
                        Display Style
                    </label>
                    <select
                        value={displayStyle}
                        onChange={(e) => setDisplayStyle(e.target.value)}
                        aria-label="Section Display Style"
                        className="w-full text-xs border border-gold/30 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-maroon text-gray-800 font-medium"
                    >
                        {DISPLAY_STYLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    {DISPLAY_STYLE_OPTIONS.find((opt) => opt.value === displayStyle)?.description && (
                        <p className="text-[10px] text-gray-500 mt-1">
                            {DISPLAY_STYLE_OPTIONS.find((opt) => opt.value === displayStyle)?.description}
                        </p>
                    )}
                </div>

                {/* Banner / Feature / Timer Image Upload (Shown when displayStyle is 'banner', 'split_feature', or 'offer_timer') */}
                {(displayStyle === 'banner' || displayStyle === 'split_feature' || displayStyle === 'offer_timer') && (
                    <div className="p-4 rounded-xl border border-gold/30 bg-gradient-to-b from-cream/30 to-white space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                                <ImageIcon className="h-4 w-4 text-maroon" />
                                {displayStyle === 'banner'
                                    ? 'Banner Image (ImageKit Upload)'
                                    : displayStyle === 'split_feature'
                                    ? 'Split Feature Image (ImageKit Upload)'
                                    : 'Background Image (ImageKit Upload - Optional)'}
                            </label>
                            {imagePreview && (
                                <button
                                    type="button"
                                    onClick={handleRemoveImage}
                                    className="text-[10px] text-red-600 hover:underline flex items-center gap-0.5"
                                >
                                    <X className="h-3 w-3" />
                                    Remove Image
                                </button>
                            )}
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />

                        {imagePreview ? (
                            <div className="relative group rounded-lg overflow-hidden border border-gold/25 aspect-[21/9] bg-gray-100 max-h-48">
                                <img
                                    src={imagePreview}
                                    alt="Section preview"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-xs bg-white/90 hover:bg-white text-gray-800"
                                    >
                                        Change Image
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gold/40 hover:border-maroon rounded-lg p-6 text-center cursor-pointer transition-colors bg-white/60 hover:bg-cream/20"
                            >
                                <UploadCloud className="h-8 w-8 text-gold mx-auto mb-2" />
                                <p className="text-xs font-semibold text-gray-700">
                                    {displayStyle === 'banner' ? 'Click to select banner image' : 'Click to select split feature image'}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-1">
                                    PNG, JPG, WebP. Automatically compressed & uploaded to ImageKit.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* View All Button Configuration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-gold/20 bg-white">
                    <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 block mb-1">
                            View All Text
                        </label>
                        <input
                            type="text"
                            value={viewAllText}
                            onChange={(e) => setViewAllText(e.target.value)}
                            placeholder="View All"
                            className="w-full text-xs border border-gold/30 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-maroon text-gray-800"
                        />
                    </div>

                    <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 block mb-1">
                            View All URL
                        </label>
                        <div className="relative">
                            <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                            <input
                                type="text"
                                value={viewAllUrl}
                                onChange={(e) => setViewAllUrl(e.target.value)}
                                placeholder="/collections/festive"
                                className="w-full text-xs pl-8 pr-3 py-2 border border-gold/30 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-maroon text-gray-800"
                            />
                        </div>
                    </div>
                </div>

                {/* Scheduling Configuration */}
                <div className="p-3.5 rounded-xl border border-gold/25 bg-cream/10 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <CalendarClock className="h-4 w-4 text-maroon" />
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
                                Scheduling (Optional)
                            </span>
                        </div>
                        {(startAt || endAt) ? (
                            <button
                                type="button"
                                onClick={handleClearSchedule}
                                className="text-[10px] text-maroon hover:underline font-semibold"
                            >
                                Clear Schedule (Always Active)
                            </button>
                        ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Always Active
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-medium text-gray-500 block mb-1">
                                Start Date & Time
                            </label>
                            <input
                                type="datetime-local"
                                value={startAt}
                                onChange={(e) => setStartAt(e.target.value)}
                                className="w-full text-xs border border-gold/30 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-maroon text-gray-800"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-medium text-gray-500 block mb-1">
                                End Date & Time
                            </label>
                            <input
                                type="datetime-local"
                                value={endAt}
                                onChange={(e) => setEndAt(e.target.value)}
                                className="w-full text-xs border border-gold/30 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-maroon text-gray-800"
                            />
                        </div>
                    </div>

                    {displayStyle === 'offer_timer' && (
                        <p className="text-[10.5px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200 mt-2.5">
                            <strong>Note for Offer Timer:</strong> The <strong>End Date & Time</strong> determines the live countdown timer on the storefront. Make sure to specify an End Date & Time.
                        </p>
                    )}
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-gold/20 bg-white">
                    <div>
                        <span className="text-xs font-bold text-gray-800 block">Section Active</span>
                        <span className="text-[11px] text-gray-500">
                            When disabled, this section is immediately hidden from the storefront.
                        </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-maroon"></div>
                    </label>
                </div>
            </div>

            <DialogFooter className="p-4 border-t border-gold/15 bg-cream/10 flex items-center justify-end gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={saving || uploadingImage}
                    className="text-xs border-gold/30"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={saving || uploadingImage || collections.length === 0}
                    className="text-xs bg-maroon hover:bg-maroon-dark text-gold font-bold px-5 flex items-center gap-1.5"
                >
                    {(saving || uploadingImage) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {uploadingImage
                        ? 'Uploading Banner...'
                        : saving
                        ? 'Saving...'
                        : isEdit
                        ? 'Update Section'
                        : 'Save Section'}
                </Button>
            </DialogFooter>
        </form>
    );
};

export const SectionModal: React.FC<SectionModalProps> = ({
    open,
    onOpenChange,
    sectionToEdit,
    collections,
    onSaved,
}) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[620px] max-h-[90vh] flex flex-col border-gold/20 shadow-2xl bg-white p-0 overflow-hidden">
                <DialogHeader className="p-4 border-b border-gold/15 bg-gradient-to-r from-cream/40 via-cream/20 to-transparent">
                    <div className="flex items-center gap-2">
                        <LayoutGrid className="h-5 w-5 text-maroon" />
                        <DialogTitle className="text-base font-bold uppercase tracking-wider text-maroon font-serif">
                            {sectionToEdit ? 'Edit Homepage Section' : 'Add Homepage Section'}
                        </DialogTitle>
                    </div>
                </DialogHeader>

                {open && (
                    <SectionForm
                        key={sectionToEdit?.id || 'new'}
                        sectionToEdit={sectionToEdit}
                        collections={collections}
                        onClose={() => onOpenChange(false)}
                        onSaved={onSaved}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
};
