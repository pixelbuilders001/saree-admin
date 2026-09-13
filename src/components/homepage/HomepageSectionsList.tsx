import React, { useState, useMemo } from 'react';
import {
    GripVertical,
    Pencil,
    Trash2,
    Eye,
    EyeOff,
    CalendarClock,
    Sparkles,
    ListFilter,
    ChevronUp,
    ChevronDown,
    LayoutGrid,
    Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { HomepageSection } from '@/types/homepage';
import { DISPLAY_STYLE_OPTIONS } from '@/types/homepage';
import { homepageSectionService } from '@/services/homepageSectionService';
import { ConfirmationDialog } from './ConfirmationDialog';
import { toast } from 'sonner';

interface HomepageSectionsListProps {
    sections: HomepageSection[];
    loading: boolean;
    onEdit: (section: HomepageSection) => void;
    onCreate: () => void;
    onRefresh: () => void;
}

export const HomepageSectionsList: React.FC<HomepageSectionsListProps> = ({
    sections,
    loading,
    onEdit,
    onCreate,
    onRefresh,
}) => {
    const [localOrderedIds, setLocalOrderedIds] = useState<string[] | null>(null);
    const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

    // Confirmation dialog states
    const [disableModalOpen, setDisableModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedSection, setSelectedSection] = useState<HomepageSection | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Derive display items from props + local reorder state
    const items = useMemo(() => {
        if (!localOrderedIds) return sections;
        const map = new Map(sections.map((s) => [s.id, s]));
        const reordered = localOrderedIds.map((id) => map.get(id)).filter(Boolean) as HomepageSection[];
        for (const s of sections) {
            if (!localOrderedIds.includes(s.id)) reordered.push(s);
        }
        return reordered;
    }, [sections, localOrderedIds]);

    // Format schedule dates
    const formatSchedule = (startAt: string | null, endAt: string | null) => {
        if (!startAt && !endAt) return null;
        const fmt = (d: string) =>
            new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

        if (startAt && endAt) return `${fmt(startAt)} → ${fmt(endAt)}`;
        if (startAt) return `Starts: ${fmt(startAt)}`;
        return `Ends: ${fmt(endAt!)}`;
    };

    // Drag-and-drop handlers
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIdx(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIdx === null || draggedIdx === index) return;

        const currentIds = items.map((s) => s.id);
        const [movedId] = currentIds.splice(draggedIdx, 1);
        currentIds.splice(index, 0, movedId);
        setDraggedIdx(index);
        setLocalOrderedIds(currentIds);
    };

    const handleDragEnd = async () => {
        setDraggedIdx(null);
        if (localOrderedIds) {
            await persistNewOrder(localOrderedIds);
        }
    };

    const handleMove = async (index: number, direction: 'up' | 'down') => {
        const nextIndex = direction === 'up' ? index - 1 : index + 1;
        if (nextIndex < 0 || nextIndex >= items.length) return;

        const currentIds = items.map((s) => s.id);
        const [movedId] = currentIds.splice(index, 1);
        currentIds.splice(nextIndex, 0, movedId);
        setLocalOrderedIds(currentIds);

        await persistNewOrder(currentIds);
    };

    const persistNewOrder = async (orderedIds: string[]) => {
        try {
            await homepageSectionService.updateSectionsOrder(orderedIds);
            toast.success('Section order updated');
        } catch (err: unknown) {
            console.error('Failed to update section order:', err);
            const msg = err instanceof Error ? err.message : 'Failed to save new order';
            toast.error(msg);
            setLocalOrderedIds(null);
            onRefresh();
        }
    };

    // Toggle active state
    const handleToggleActiveClick = (section: HomepageSection) => {
        if (section.isActive) {
            // Confirm disable
            setSelectedSection(section);
            setDisableModalOpen(true);
        } else {
            // Enable directly
            enableSectionDirect(section.id);
        }
    };

    const enableSectionDirect = async (id: string) => {
        try {
            await homepageSectionService.toggleSectionActive(id, true);
            toast.success('Section activated');
            onRefresh();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to activate section';
            toast.error(msg);
        }
    };

    const confirmDisable = async () => {
        if (!selectedSection) return;
        setActionLoading(true);
        try {
            await homepageSectionService.toggleSectionActive(selectedSection.id, false);
            toast.success('Section disabled');
            setDisableModalOpen(false);
            setSelectedSection(null);
            onRefresh();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to disable section';
            toast.error(msg);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteClick = (section: HomepageSection) => {
        setSelectedSection(section);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedSection) return;
        setActionLoading(true);
        try {
            await homepageSectionService.deleteSection(selectedSection.id);
            toast.success('Section deleted');
            setDeleteModalOpen(false);
            setSelectedSection(null);
            onRefresh();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to delete section';
            toast.error(msg);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header info bar */}
            <div className="flex items-center justify-between px-1">
                <span className="text-xs text-gray-500">
                    Showing <strong className="text-gray-800">{items.length}</strong> sections on the homepage. Drag rows using ☰ to reorder.
                </span>
                <Button
                    onClick={onCreate}
                    size="sm"
                    className="text-xs bg-maroon hover:bg-maroon-dark text-gold font-bold px-4"
                >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Section
                </Button>
            </div>

            {/* Skeleton Loading State */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="border border-gold/20 rounded-xl p-4 bg-white animate-pulse space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="h-5 w-5 bg-gray-200 rounded" />
                                <div className="h-4 bg-gray-200 rounded w-1/4" />
                                <div className="h-4 bg-gray-200 rounded w-20 ml-auto" />
                            </div>
                            <div className="h-3 bg-gray-100 rounded w-1/3 ml-8" />
                        </div>
                    ))}
                </div>
            ) : items.length === 0 ? (
                <Card className="border-gold/20 bg-white">
                    <CardContent className="p-12 text-center">
                        <LayoutGrid className="h-10 w-10 text-gold/60 mx-auto mb-3" />
                        <h3 className="text-sm font-bold text-gray-800 font-serif uppercase tracking-wider">
                            No Homepage Sections Yet
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                            Add sections like "New Arrivals", "Festive Collection", or "Editor's Picks" to showcase your sarees on the storefront.
                        </p>
                        <Button
                            onClick={onCreate}
                            className="mt-4 text-xs bg-maroon hover:bg-maroon-dark text-gold font-bold"
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add Section
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                /* Reorderable Section Items */
                <div className="border border-gold/20 rounded-xl divide-y divide-gold/15 bg-white overflow-hidden shadow-sm">
                    {items.map((section, idx) => {
                        const scheduleText = formatSchedule(section.startAt, section.endAt);
                        const isAuto = section.collection?.collectionType === 'automatic';

                        return (
                            <div
                                key={section.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, idx)}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDragEnd={handleDragEnd}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 transition-all ${
                                    draggedIdx === idx ? 'bg-gold/15 shadow-inner' : 'hover:bg-cream/15'
                                }`}
                            >
                                {/* Left Side: Drag handle & Details */}
                                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                                    <div
                                        className="p-1.5 text-gray-400 hover:text-maroon cursor-grab active:cursor-grabbing rounded hover:bg-gold/10"
                                        title="Drag to reorder"
                                    >
                                        <GripVertical className="h-5 w-5" />
                                    </div>

                                    {/* Image Preview if section has image */}
                                    {section.imageUrl && (
                                        <div className="w-16 h-11 rounded-lg overflow-hidden border border-gold/25 flex-shrink-0 bg-gray-100 hidden sm:block shadow-sm">
                                            <img
                                                src={section.imageUrl}
                                                alt={section.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}

                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-sm font-bold text-gray-900 font-serif">
                                                {section.title}
                                            </h3>

                                            {/* Collection Badge */}
                                            {section.collection ? (
                                                <span className={`inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                                    isAuto
                                                        ? 'bg-maroon/5 text-maroon border-maroon/20'
                                                        : 'bg-gold/10 text-amber-900 border-gold/30'
                                                }`}>
                                                    {isAuto ? (
                                                        <Sparkles className="h-2.5 w-2.5 text-maroon" />
                                                    ) : (
                                                        <ListFilter className="h-2.5 w-2.5 text-amber-800" />
                                                    )}
                                                    {section.collection.name} ({isAuto ? 'Automatic' : 'Manual'})
                                                </span>
                                            ) : (
                                                <span className="text-[9.5px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                                    No collection attached
                                                </span>
                                            )}

                                            {/* Active / Inactive Pill */}
                                            <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                                section.isActive
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-gray-100 text-gray-400 border-gray-200'
                                            }`}>
                                                {section.isActive ? (
                                                    <Eye className="h-2.5 w-2.5" />
                                                ) : (
                                                    <EyeOff className="h-2.5 w-2.5" />
                                                )}
                                                {section.isActive ? 'Active' : 'Inactive'}
                                            </span>

                                            {/* Order Number */}
                                            <span className="text-[9px] text-gray-400 font-mono bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded">
                                                Order #{idx + 1}
                                            </span>
                                        </div>

                                        {section.subtitle && (
                                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                                                {section.subtitle}
                                            </p>
                                        )}

                                        {/* Metadata Row */}
                                        <div className="flex items-center gap-3 mt-1.5 text-[10.5px] text-gray-500 flex-wrap">
                                            <span className="capitalize text-gray-600 font-medium">
                                                Style: {DISPLAY_STYLE_OPTIONS.find((opt) => opt.value === section.displayStyle)?.label || section.displayStyle.replace(/_/g, ' ')}
                                            </span>

                                            <span>•</span>

                                            {scheduleText ? (
                                                <span className="inline-flex items-center gap-1 text-amber-700 font-medium font-mono text-[10px]">
                                                    <CalendarClock className="h-3 w-3" />
                                                    Scheduled: {scheduleText}
                                                </span>
                                            ) : (
                                                <span className="text-emerald-700 font-medium">
                                                    Always Active
                                                </span>
                                            )}

                                            {section.viewAllUrl && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-maroon">
                                                        CTA: {section.viewAllText || 'View All'} → {section.viewAllUrl}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Reordering Arrows & Actions */}
                                <div className="flex items-center justify-end gap-1.5 mt-3 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gold/10">
                                    {/* Up / Down Reorder Arrows */}
                                    <div className="flex items-center border border-gold/20 rounded-md bg-white mr-1">
                                        <button
                                            type="button"
                                            onClick={() => handleMove(idx, 'up')}
                                            disabled={idx === 0}
                                            className="p-1 text-gray-400 hover:text-maroon disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gold/10 rounded-l"
                                            title="Move up"
                                        >
                                            <ChevronUp className="h-4 w-4" />
                                        </button>
                                        <div className="w-px h-4 bg-gold/15" />
                                        <button
                                            type="button"
                                            onClick={() => handleMove(idx, 'down')}
                                            disabled={idx === items.length - 1}
                                            className="p-1 text-gray-400 hover:text-maroon disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gold/10 rounded-r"
                                            title="Move down"
                                        >
                                            <ChevronDown className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* Edit Button */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onEdit(section)}
                                        className="text-xs h-8 px-3 border-gold/30 text-gray-700 hover:text-maroon hover:bg-gold/10 font-medium"
                                    >
                                        <Pencil className="h-3 w-3 mr-1" />
                                        Edit
                                    </Button>

                                    {/* Enable / Disable Button */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleToggleActiveClick(section)}
                                        className={`text-xs h-8 px-3 font-medium ${
                                            section.isActive
                                                ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                        }`}
                                    >
                                        {section.isActive ? 'Disable' : 'Enable'}
                                    </Button>

                                    {/* Delete Button */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteClick(section)}
                                        className="text-xs h-8 px-2 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                        title="Delete section"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Disable Section Confirmation Dialog */}
            <ConfirmationDialog
                open={disableModalOpen}
                onOpenChange={setDisableModalOpen}
                title="Disable Section?"
                description="This section will no longer appear on the storefront. You can re-enable it at any time."
                confirmLabel="Disable"
                variant="warning"
                onConfirm={confirmDisable}
                loading={actionLoading}
            />

            {/* Delete Section Confirmation Dialog */}
            <ConfirmationDialog
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                title="Delete Section?"
                description={`Are you sure you want to delete "${selectedSection?.title}"? This cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                onConfirm={confirmDelete}
                loading={actionLoading}
            />
        </div>
    );
};
