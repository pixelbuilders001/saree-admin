import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersService, type ShipmentTrackingUpdate } from '@/services/ordersService';
import {
    Truck,
    Plus,
    Trash2,
    Loader2,
    Clock,
    Sparkles,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ShipmentTrackingCardProps {
    orderId: string;
    updates?: ShipmentTrackingUpdate[];
    orderNumber?: string;
}

const PRESET_STATUSES = [
    "Order has left facility",
    "Package loaded and in transit",
    "Arrived at intermediate sorting hub",
    "In transit to destination facility",
    "Shipment delayed due to transit hold"
];

export const ShipmentTrackingCard: React.FC<ShipmentTrackingCardProps> = ({
    orderId,
    updates = [],
    orderNumber
}) => {
    const queryClient = useQueryClient();

    // Form states
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [eventTime, setEventTime] = useState('');
    const [isHighlighted, setIsHighlighted] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [nextStop, setNextStop] = useState('');
    const [distance, setDistance] = useState('');
    const [eta, setEta] = useState('');

    // Add Mutation
    const addUpdateMutation = useMutation({
        mutationFn: async () => {
            if (!title.trim()) {
                throw new Error('Please enter or select a status title');
            }

            const metadata: Record<string, any> = {};
            if (nextStop.trim()) metadata.next_stop = nextStop.trim();
            if (distance.trim()) metadata.distance = distance.trim();
            if (eta.trim()) {
                metadata.eta = eta.trim().replace(/^(\s*expected\s+(by|on|at)?\s*:?\s*)+/i, '').trim();
            }

            return ordersService.addShipmentTrackingUpdate({
                orderId,
                title: title.trim(),
                subtitle: subtitle.trim() || undefined,
                eventTime: eventTime ? new Date(eventTime).toISOString() : new Date().toISOString(),
                isHighlighted,
                metadata: Object.keys(metadata).length > 0 ? metadata : undefined
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success('Transit checkpoint added successfully');
            // Reset form
            setTitle('');
            setSubtitle('');
            setEventTime('');
            setIsHighlighted(false);
            setNextStop('');
            setDistance('');
            setEta('');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to add transit checkpoint');
        }
    });

    // Delete Mutation
    const deleteUpdateMutation = useMutation({
        mutationFn: async (id: string) => {
            return ordersService.deleteShipmentTrackingUpdate(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success('Checkpoint removed');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to delete checkpoint');
        }
    });

    const formatDisplayTime = (isoString: string) => {
        try {
            const d = new Date(isoString);
            return d.toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return isoString;
        }
    };

    return (
        <div className="border border-gold/20 rounded-xl bg-gradient-to-b from-cream/30 to-white p-4 space-y-4 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gold/15 pb-2.5">
                <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-maroon/10 text-maroon flex items-center justify-center">
                        <Truck className="h-4 w-4" />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-maroon uppercase tracking-wider flex items-center gap-1.5">
                            Transit & Parcel Tracking {orderNumber && <span className="text-gray-400 font-mono font-normal">#{orderNumber}</span>}
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-gold/20 text-maroon border border-gold/30">
                                {updates.length} {updates.length === 1 ? 'checkpoint' : 'checkpoints'}
                            </span>
                        </h4>
                        <p className="text-[10.5px] text-gray-500">
                            Sub-notes between Shipped and Out for Delivery (does not change order status)
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Status Presets */}
            <div className="space-y-1.5">
                <label className="text-[9.5px] font-bold text-gray-500 uppercase tracking-wider">
                    Quick Preset Title
                </label>
                <div className="flex flex-wrap gap-1.5">
                    {PRESET_STATUSES.map((preset) => (
                        <button
                            key={preset}
                            type="button"
                            onClick={() => setTitle(preset)}
                            className={cn(
                                "text-[10.5px] px-2.5 py-1 rounded-md border transition-all cursor-pointer",
                                title === preset
                                    ? "bg-maroon text-gold border-maroon font-semibold shadow-xs"
                                    : "bg-white text-gray-700 border-gold/20 hover:border-maroon/40 hover:bg-gold/5"
                            )}
                        >
                            {preset}
                        </button>
                    ))}
                </div>
            </div>

            {/* Add Checkpoint Form */}
            <div className="space-y-2.5 bg-slate-50/80 p-3 rounded-lg border border-gold/10">
                <div className="space-y-1">
                    <label className="text-[9.5px] font-bold text-gray-700 uppercase">
                        Status Title <span className="text-red-500">*</span>
                    </label>
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Order has left Tajpur facility"
                        className="h-8 text-xs bg-white border-gold/30"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[9.5px] font-bold text-gray-600 uppercase">
                        Subtitle / Location Note <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <Input
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                        placeholder="e.g. Package loaded and moving to a facility near you | Patna"
                        className="h-8 text-xs bg-white border-gold/30"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                        <label className="text-[9.5px] font-bold text-gray-600 uppercase">
                            Date & Time <span className="text-gray-400 font-normal">(Default: Current)</span>
                        </label>
                        <Input
                            type="datetime-local"
                            value={eventTime}
                            onChange={(e) => setEventTime(e.target.value)}
                            className="h-8 text-xs bg-white border-gold/30"
                        />
                    </div>

                    <div className="flex items-end pb-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-800 font-medium">
                            <input
                                type="checkbox"
                                checked={isHighlighted}
                                onChange={(e) => setIsHighlighted(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="inline-flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-emerald-600" />
                                Highlight in green card
                            </span>
                        </label>
                    </div>
                </div>

                {/* Optional Route / Stop Details Accordion */}
                <div className="pt-1">
                    <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-[10px] font-bold text-maroon hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                        {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {showAdvanced ? "Hide Optional Route Details" : "+ Add Optional Route / Distance / Next Stop"}
                    </button>

                    {showAdvanced && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-gold/10">
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-500 uppercase">
                                    Next Stop (Optional)
                                </label>
                                <Input
                                    value={nextStop}
                                    onChange={(e) => setNextStop(e.target.value)}
                                    placeholder="e.g. Patna Janarjanpur H"
                                    className="h-7 text-xs bg-white border-gold/25"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-500 uppercase">
                                    Distance Badge (Optional)
                                </label>
                                <Input
                                    value={distance}
                                    onChange={(e) => setDistance(e.target.value)}
                                    placeholder="e.g. 48 KM to go"
                                    className="h-7 text-xs bg-white border-gold/25"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-500 uppercase">
                                    ETA Note (Optional)
                                </label>
                                <Input
                                    value={eta}
                                    onChange={(e) => setEta(e.target.value)}
                                    placeholder="e.g. Expected by 1:21 PM"
                                    className="h-7 text-xs bg-white border-gold/25"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Submit button */}
                <div className="pt-1">
                    <Button
                        size="sm"
                        className="w-full bg-maroon text-gold hover:bg-maroon-dark h-8 text-[11px] font-bold gap-1.5 shadow-xs cursor-pointer"
                        disabled={addUpdateMutation.isPending || !title.trim()}
                        onClick={() => addUpdateMutation.mutate()}
                    >
                        {addUpdateMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Plus className="h-3.5 w-3.5" />
                        )}
                        ADD TRANSIT CHECKPOINT
                    </Button>
                </div>
            </div>

            {/* Existing Checkpoints Timeline */}
            <div className="space-y-2 pt-2 border-t border-gold/10">
                <span className="text-[9.5px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Recorded Transit Updates ({updates.length})</span>
                    <span className="text-[9px] text-gray-400 font-normal">Displayed chronologically to customer</span>
                </span>

                {updates.length === 0 ? (
                    <div className="p-3 text-center rounded-lg border border-dashed border-gold/20 text-gray-400 text-xs">
                        No transit updates added yet for this shipment.
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {updates.map((item) => {
                            const hasNextStop = Boolean(item.metadata?.next_stop);
                            const hasDistance = Boolean(item.metadata?.distance);
                            const hasEta = Boolean(item.metadata?.eta);

                            return (
                                <div
                                    key={item.id}
                                    className={cn(
                                        "p-2.5 rounded-lg border text-xs relative group transition-all",
                                        item.isHighlighted
                                            ? "bg-emerald-50/80 border-emerald-200 shadow-2xs"
                                            : "bg-white border-gray-200"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="space-y-1 flex-1 min-w-0">
                                            {/* Status Badge & Title */}
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span
                                                    className={cn(
                                                        "font-bold",
                                                        item.isHighlighted ? "text-emerald-900" : "text-gray-900"
                                                    )}
                                                >
                                                    {item.title}
                                                </span>
                                                {item.isHighlighted && (
                                                    <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-300">
                                                        Highlighted
                                                    </span>
                                                )}
                                            </div>

                                            {/* Subtitle */}
                                            {item.subtitle && (
                                                <p className={cn(
                                                    "text-[11px]",
                                                    item.isHighlighted ? "text-emerald-800/80" : "text-gray-600"
                                                )}>
                                                    {item.subtitle}
                                                </p>
                                            )}

                                            {/* Time */}
                                            <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
                                                <Clock className="h-2.5 w-2.5" />
                                                <span>{formatDisplayTime(item.eventTime)}</span>
                                            </div>

                                            {/* Optional Metadata display */}
                                            {(hasNextStop || hasDistance || hasEta) && (
                                                <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex flex-wrap items-center gap-2 text-[10px]">
                                                    {hasDistance && (
                                                        <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-semibold border border-stone-200">
                                                            {item.metadata?.distance} ↓
                                                        </span>
                                                    )}
                                                    {hasNextStop && (
                                                        <span className="text-gray-700 font-medium">
                                                            Next: <strong>{item.metadata?.next_stop}</strong>
                                                        </span>
                                                    )}
                                                    {hasEta && (
                                                        <span className="text-gray-500 italic">
                                                            ({item.metadata?.eta})
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            type="button"
                                            disabled={deleteUpdateMutation.isPending}
                                            onClick={() => {
                                                if (window.confirm('Delete this transit checkpoint?')) {
                                                    deleteUpdateMutation.mutate(item.id);
                                                }
                                            }}
                                            className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                            title="Delete checkpoint"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
