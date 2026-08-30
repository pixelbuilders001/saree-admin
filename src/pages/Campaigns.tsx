import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignService, type Campaign, type HomepageSlot } from '@/services/campaignService';
import { inventoryService, type Saree } from '@/services/inventoryService';
import { compressImage } from '@/lib/imageCompressor';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Megaphone,
    Plus,
    Edit2,
    Trash2,
    Eye,
    Calendar,
    Upload,
    X,
    Check,
    Loader2,
    Search,
    Image as ImageIcon,
    Monitor,
    Smartphone,
    Info,
    ArrowUpDown,
    Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';

export default function CampaignsPage() {
    const queryClient = useQueryClient();

    // Dialog state
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
    const [editingCampaign, setEditingCampaign] = React.useState<Campaign | null>(null);
    const [previewCampaign, setPreviewCampaign] = React.useState<Campaign | null>(null);
    const [previewTab, setPreviewTab] = React.useState<'desktop' | 'mobile'>('desktop');

    // Form fields state
    const [formName, setFormName] = React.useState('');
    const [formSlug, setFormSlug] = React.useState('');
    const [formTitle, setFormTitle] = React.useState('');
    const [formSubtitle, setFormSubtitle] = React.useState('');
    const [formStartDate, setFormStartDate] = React.useState('');
    const [formEndDate, setFormEndDate] = React.useState('');
    const [formStatus, setFormStatus] = React.useState<'draft' | 'active' | 'inactive'>('draft');
    const [formSortOrder, setFormSortOrder] = React.useState('0');
    const [selectedProductIds, setSelectedProductIds] = React.useState<string[]>([]);

    // Slot placements state
    const [slotEdits, setSlotEdits] = React.useState<Record<string, { campaignId: string | null; isVisible: boolean }>>({});

    // Banner file upload (used for both desktop & mobile views)
    const [bannerFile, setBannerFile] = React.useState<File | null>(null);
    const [bannerPreviewUrl, setBannerPreviewUrl] = React.useState<string | null>(null);
    const [compressing, setCompressing] = React.useState(false);
    const [sizeInfo, setSizeInfo] = React.useState<{ originalKB: number; compressedKB: number } | null>(null);

    // Filters for inventory selector
    const [inventorySearch, setInventorySearch] = React.useState('');
    const [inventoryCategory, setInventoryCategory] = React.useState('all');

    // Queries
    const { data: campaigns, isLoading: isCampaignsLoading } = useQuery({
        queryKey: ['campaigns'],
        queryFn: campaignService.getCampaigns
    });

    const { data: sarees, isLoading: isSareesLoading } = useQuery({
        queryKey: ['sarees'],
        queryFn: inventoryService.getSarees
    });

    const { data: slots, isLoading: isSlotsLoading } = useQuery({
        queryKey: ['homepage-slots'],
        queryFn: campaignService.getHomepageSlots
    });

    React.useEffect(() => {
        if (slots) {
            const initialEdits: Record<string, { campaignId: string | null; isVisible: boolean }> = {};
            slots.forEach(slot => {
                initialEdits[slot.id] = {
                    campaignId: slot.campaignId,
                    isVisible: slot.isVisible
                };
            });
            setSlotEdits(initialEdits);
        }
    }, [slots]);

    const saveSlotMutation = useMutation({
        mutationFn: async ({ id, campaignId, isVisible }: { id: string; campaignId: string | null; isVisible: boolean }) => {
            return campaignService.updateHomepageSlot(id, campaignId, isVisible);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['homepage-slots'] });
            toast.success('Homepage slot placement updated successfully');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to update slot placement');
        }
    });

    const handleSlotCampaignChange = (slotId: string, campaignId: string) => {
        setSlotEdits(prev => ({
            ...prev,
            [slotId]: {
                ...prev[slotId],
                campaignId: campaignId === 'none' ? null : campaignId
            }
        }));
    };

    const handleSlotVisibilityToggle = (slotId: string) => {
        setSlotEdits(prev => ({
            ...prev,
            [slotId]: {
                ...prev[slotId],
                isVisible: !prev[slotId]?.isVisible
            }
        }));
    };

    const handleSaveSlot = (slotId: string) => {
        const edit = slotEdits[slotId];
        if (!edit) return;
        saveSlotMutation.mutate({
            id: slotId,
            campaignId: edit.campaignId,
            isVisible: edit.isVisible
        });
    };

    const isSlotDirty = (slot: HomepageSlot) => {
        const edit = slotEdits[slot.id];
        if (!edit) return false;
        return edit.campaignId !== slot.campaignId || edit.isVisible !== slot.isVisible;
    };

    // Automatically generate slug from name
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFormName(value);
        if (!editingCampaign) {
            const slugValue = value
                .toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, '') // remove special characters
                .replace(/[\s_-]+/g, '-') // replace spaces/underscores with single dash
                .replace(/^-+|-+$/g, ''); // trim dashes from ends
            setFormSlug(slugValue);
        }
    };

    // Format ISO string to datetime-local compatible string
    const formatToDateTimeLocal = (isoString?: string) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Open create form
    const handleCreateOpen = () => {
        setEditingCampaign(null);
        setFormName('');
        setFormSlug('');
        setFormTitle('');
        setFormSubtitle('');
        setFormStartDate('');
        setFormEndDate('');
        setFormStatus('draft');
        setFormSortOrder('0');
        setSelectedProductIds([]);
        setBannerFile(null);
        setBannerPreviewUrl(null);
        setSizeInfo(null);
        setCompressing(false);
        setIsFormOpen(true);
    };

    // Open edit form
    const handleEditOpen = (campaign: Campaign) => {
        setEditingCampaign(campaign);
        setFormName(campaign.name);
        setFormSlug(campaign.slug);
        setFormTitle(campaign.title || '');
        setFormSubtitle(campaign.subtitle || '');
        setFormStartDate(formatToDateTimeLocal(campaign.startDate));
        setFormEndDate(formatToDateTimeLocal(campaign.endDate));
        setFormStatus(campaign.status);
        setFormSortOrder(campaign.sortOrder.toString());
        setSelectedProductIds(campaign.productIds || []);
        setBannerFile(null);
        setBannerPreviewUrl(campaign.desktopBannerUrl);
        setSizeInfo(null);
        setCompressing(false);
        setIsFormOpen(true);
    };

    // Handle banner file selection
    const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const originalKB = Math.round(file.size / 1024);
        setSizeInfo(null);
        setCompressing(true);

        const rawUrl = URL.createObjectURL(file);
        setBannerPreviewUrl(rawUrl);

        try {
            // Compress: max 800 KB threshold, max 2400px
            const compressed = await compressImage(file, 800, 2400);
            const compressedKB = Math.round(compressed.size / 1024);

            URL.revokeObjectURL(rawUrl);
            setBannerPreviewUrl(URL.createObjectURL(compressed));
            setBannerFile(compressed);
            setSizeInfo({ originalKB, compressedKB });
        } catch {
            setBannerFile(file);
            setSizeInfo({ originalKB, compressedKB: originalKB });
        } finally {
            setCompressing(false);
        }

        e.target.value = '';
    };

    // Mutations
    const saveCampaignMutation = useMutation({
        mutationFn: async () => {
            // Validation
            if (!formName.trim()) throw new Error('Campaign Name is required');
            if (!formSlug.trim()) throw new Error('Campaign Slug is required');
            if (!formStartDate) throw new Error('Start Date is required');
            if (!formEndDate) throw new Error('End Date is required');

            const start = new Date(formStartDate);
            const end = new Date(formEndDate);
            if (end < start) throw new Error('End Date cannot be before Start Date');

            const campaignData = {
                name: formName.trim(),
                slug: formSlug.trim(),
                title: formTitle.trim() || null,
                subtitle: formSubtitle.trim() || null,
                startDate: new Date(formStartDate).toISOString(),
                endDate: new Date(formEndDate).toISOString(),
                status: formStatus,
                sortOrder: parseInt(formSortOrder) || 0
            };

            if (editingCampaign) {
                return campaignService.updateCampaign(
                    editingCampaign.id,
                    campaignData,
                    selectedProductIds,
                    bannerFile || undefined,
                    undefined
                );
            } else {
                return campaignService.createCampaign(
                    campaignData,
                    selectedProductIds,
                    bannerFile || undefined,
                    undefined
                );
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            toast.success(`Campaign successfully ${editingCampaign ? 'updated' : 'created'}`);
            setIsFormOpen(false);
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to save campaign');
        }
    });

    const deleteCampaignMutation = useMutation({
        mutationFn: campaignService.deleteCampaign,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            toast.success('Campaign deleted successfully');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to delete campaign');
        }
    });

    const handleDeleteCampaign = (id: string) => {
        if (confirm('Are you sure you want to permanently delete this campaign? This will also remove the banner images from storage.')) {
            deleteCampaignMutation.mutate(id);
        }
    };

    // Filter sarees for selection list
    const filteredSarees = React.useMemo(() => {
        if (!sarees) return [];
        return sarees.filter(saree => {
            const matchesSearch = 
                saree.sareeName.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                (saree.sku && saree.sku.toLowerCase().includes(inventorySearch.toLowerCase())) ||
                saree.id.toLowerCase().includes(inventorySearch.toLowerCase());
            
            const matchesCategory = inventoryCategory === 'all' || saree.category === inventoryCategory;

            return matchesSearch && matchesCategory;
        });
    }, [sarees, inventorySearch, inventoryCategory]);

    const categories = React.useMemo(() => {
        if (!sarees) return [];
        const cats = sarees.map(s => s.category).filter(Boolean);
        return Array.from(new Set(cats));
    }, [sarees]);

    // Handle product checkbox selection
    const toggleProductSelection = (id: string) => {
        setSelectedProductIds(prev => 
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        );
    };

    // Select all filtered products
    const handleSelectAllFiltered = () => {
        const filteredIds = filteredSarees.map(s => s.id);
        setSelectedProductIds(prev => {
            const newSelection = [...prev];
            filteredIds.forEach(id => {
                if (!newSelection.includes(id)) {
                    newSelection.push(id);
                }
            });
            return newSelection;
        });
        toast.info(`Selected all ${filteredSarees.length} filtered items`);
    };

    // Deselect all filtered products
    const handleDeselectAllFiltered = () => {
        const filteredIds = filteredSarees.map(s => s.id);
        setSelectedProductIds(prev => prev.filter(id => !filteredIds.includes(id)));
        toast.info(`Deselected all filtered items`);
    };

    // Open Campaign Preview
    const handlePreviewOpen = (campaign: Campaign) => {
        setPreviewCampaign(campaign);
        setPreviewTab('desktop');
        setIsPreviewOpen(true);
    };

    // Fetch related products detail for preview campaign
    const previewProducts = React.useMemo(() => {
        if (!previewCampaign || !sarees) return [];
        return sarees.filter(s => previewCampaign.productIds?.includes(s.id));
    }, [previewCampaign, sarees]);

    return (
        <div className="space-y-4 max-w-7xl mx-auto px-2">
            <Tabs defaultValue="list" className="space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gold/10 pb-3 gap-2">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-maroon/10 text-maroon rounded">
                            <Megaphone className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold font-serif text-maroon tracking-wider">CAMPAIGNS & PLACEMENTS</h1>
                            <p className="text-xs text-gray-500 font-sans font-medium">Manage homepage banner slots, flash sales, collections and promotion campaigns</p>
                        </div>
                    </div>
                    
                    <TabsList className="bg-slate-100 p-0.5 border border-slate-200 h-9 rounded-lg">
                        <TabsTrigger value="list" className="text-xs font-bold px-3 py-1.5 uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-maroon">
                            Campaigns
                        </TabsTrigger>
                        <TabsTrigger value="placements" className="text-xs font-bold px-3 py-1.5 uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-maroon">
                            Slot Placements
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="list" className="space-y-4 outline-none">
                    {/* Campaign Action bar */}
                    <div className="flex justify-between items-center bg-slate-50 border border-gold/5 p-3 rounded-lg">
                        <span className="text-xs font-semibold text-gray-600">Total active & draft campaigns: {campaigns?.length || 0}</span>
                        <Button 
                            onClick={handleCreateOpen}
                            className="bg-maroon hover:bg-maroon-dark text-white font-bold text-xs uppercase tracking-wider py-1.5 h-9"
                        >
                            <Plus className="h-4 w-4 mr-1.5" />
                            Create Campaign
                        </Button>
                    </div>

                    {/* Campaign Table */}
                    <Card className="border-gold/10 shadow-sm bg-white overflow-hidden">
                        {isCampaignsLoading ? (
                            <div className="py-24 text-center text-maroon/50 text-xs italic">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-maroon" />
                                Fetching marketing campaigns...
                            </div>
                        ) : !campaigns || campaigns.length === 0 ? (
                            <div className="py-16 text-center">
                                <Megaphone className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                <p className="text-xs text-gray-500 italic mb-3">No campaigns created yet</p>
                                <Button 
                                    variant="outline"
                                    onClick={handleCreateOpen}
                                    className="border-maroon/20 text-maroon hover:bg-maroon/5 text-xs font-semibold"
                                >
                                    Create Your First Campaign
                                </Button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow className="border-b border-gold/10">
                                            <TableHead className="w-[180px] text-xs font-bold text-maroon uppercase tracking-wider">Campaign Details</TableHead>
                                            <TableHead className="w-[100px] text-xs font-bold text-maroon uppercase tracking-wider">Banner</TableHead>
                                            <TableHead className="w-[150px] text-xs font-bold text-maroon uppercase tracking-wider">Campaign Title</TableHead>
                                            <TableHead className="w-[180px] text-xs font-bold text-maroon uppercase tracking-wider">Duration</TableHead>
                                            <TableHead className="w-[90px] text-xs font-bold text-maroon uppercase tracking-wider">Products</TableHead>
                                            <TableHead className="w-[80px] text-xs font-bold text-maroon uppercase tracking-wider">Sort</TableHead>
                                            <TableHead className="w-[90px] text-xs font-bold text-maroon uppercase tracking-wider">Status</TableHead>
                                            <TableHead className="w-[140px] text-right text-xs font-bold text-maroon uppercase tracking-wider">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {campaigns.map((camp) => {
                                            const now = new Date();
                                            const start = new Date(camp.startDate);
                                            const end = new Date(camp.endDate);
                                            const isCurrentlyRunning = camp.status === 'active' && now >= start && now <= end;
                                            const isUpcoming = camp.status === 'active' && now < start;
                                            const isEnded = now > end;

                                            return (
                                                <TableRow key={camp.id} className="border-b border-gold/5 hover:bg-slate-50/50">
                                                    {/* Details */}
                                                    <TableCell className="py-3">
                                                        <div className="font-bold text-xs text-gray-900 truncate" title={camp.name}>
                                                            {camp.name}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                                                            <Tag className="h-2.5 w-2.5 text-gold/80" />
                                                            {camp.slug}
                                                        </div>
                                                    </TableCell>

                                                    {/* Banner */}
                                                    <TableCell className="py-3">
                                                        <div className="relative group cursor-zoom-in" onClick={() => handlePreviewOpen(camp)}>
                                                            {camp.desktopBannerUrl ? (
                                                                <img 
                                                                    src={camp.desktopBannerUrl} 
                                                                    alt="Campaign Banner" 
                                                                    className="h-8 w-16 object-cover rounded border border-gray-200"
                                                                />
                                                            ) : (
                                                                <div className="h-8 w-16 bg-gray-100 flex items-center justify-center rounded border border-gray-200 text-gray-400">
                                                                    <Monitor className="h-3.5 w-3.5" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    {/* Text headings */}
                                                    <TableCell className="py-3">
                                                        <div className="text-xs font-semibold text-gray-800 line-clamp-1">
                                                            {camp.title}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400 line-clamp-1">
                                                            {camp.subtitle || '—'}
                                                        </div>
                                                    </TableCell>

                                                    {/* Dates */}
                                                    <TableCell className="py-3">
                                                        <div className="text-[10.5px] text-gray-700 flex items-center gap-1">
                                                            <Calendar className="h-3 w-3 text-maroon/60" />
                                                            <span>{new Date(camp.startDate).toLocaleDateString()}</span>
                                                            <span className="text-gray-400">to</span>
                                                            <span>{new Date(camp.endDate).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="mt-1 flex items-center gap-1">
                                                            {camp.status === 'active' && (
                                                                isCurrentlyRunning ? (
                                                                    <span className="text-[8px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 py-0.2 rounded uppercase tracking-wider">
                                                                        Running Now
                                                                    </span>
                                                                ) : isUpcoming ? (
                                                                    <span className="text-[8px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-1 py-0.2 rounded uppercase tracking-wider">
                                                                        Upcoming
                                                                    </span>
                                                                ) : isEnded ? (
                                                                    <span className="text-[8px] font-bold bg-gray-50 text-gray-600 border border-gray-200 px-1 py-0.2 rounded uppercase tracking-wider">
                                                                        Ended
                                                                    </span>
                                                                ) : null
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    {/* Products count */}
                                                    <TableCell className="py-3 font-mono text-xs text-gray-700">
                                                        <Badge variant="secondary" className="bg-slate-100 text-slate-800 font-bold border border-slate-200 px-2 py-0.5">
                                                            {camp.productIds?.length || 0} Items
                                                        </Badge>
                                                    </TableCell>

                                                    {/* Sort Order */}
                                                    <TableCell className="py-3 font-mono text-xs text-gray-600">
                                                        {camp.sortOrder}
                                                    </TableCell>

                                                    {/* Status */}
                                                    <TableCell className="py-3">
                                                        <span className={`inline-flex px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider border ${
                                                            camp.status === 'active'
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                : camp.status === 'inactive'
                                                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                                        }`}>
                                                            {camp.status}
                                                        </span>
                                                    </TableCell>

                                                    {/* Actions */}
                                                    <TableCell className="py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Button
                                                                size="icon"
                                                                variant="outline"
                                                                onClick={() => handlePreviewOpen(camp)}
                                                                className="h-7 w-7 border-slate-200 text-slate-600 hover:bg-slate-50"
                                                                title="Preview storefront layout"
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                            </Button>

                                                            <Button
                                                                size="icon"
                                                                variant="outline"
                                                                onClick={() => handleEditOpen(camp)}
                                                                className="h-7 w-7 border-gold/35 text-maroon hover:bg-cream-light"
                                                                title="Edit Campaign"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </Button>

                                                            <Button
                                                                size="icon"
                                                                variant="outline"
                                                                onClick={() => handleDeleteCampaign(camp.id)}
                                                                disabled={deleteCampaignMutation.isPending}
                                                                className="h-7 w-7 border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                                                title="Delete Campaign"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </Card>
                </TabsContent>

                <TabsContent value="placements" className="space-y-4 outline-none">
                    <div className="bg-slate-50 border border-gold/5 p-4 rounded-lg">
                        <h3 className="text-sm font-bold text-maroon font-serif">HOMEPAGE SLOT PLACEMENTS</h3>
                        <p className="text-xs text-gray-500 mt-1 font-sans">
                            Configure campaigns to display in specific promotional slots on the storefront homepage and set visibility.
                        </p>
                    </div>

                    {isSlotsLoading ? (
                        <div className="py-24 text-center text-maroon/50 text-xs italic">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-maroon" />
                            Fetching slot placements...
                        </div>
                    ) : !slots || slots.length === 0 ? (
                        <div className="py-16 text-center border border-dashed border-gold/15 rounded-lg bg-white">
                            <p className="text-xs text-gray-500 italic">No homepage placement slots found in the database.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {slots.map((slot) => {
                                const edit = slotEdits[slot.id] || { campaignId: slot.campaignId, isVisible: slot.isVisible };
                                const dirty = isSlotDirty(slot);
                                const assignedCampaign = campaigns?.find(c => c.id === edit.campaignId);
                                
                                const slotLocations: Record<string, { label: string; desc: string }> = {
                                    top: { 
                                        label: "After Categories (Top Slot)", 
                                        desc: "Appears right below the homepage product categories row" 
                                    },
                                    middle: { 
                                        label: "After Featured Products (Middle Slot)", 
                                        desc: "Appears below the Featured Products showcasing section" 
                                    },
                                    bottom: { 
                                        label: "After New Arrivals (Bottom Slot)", 
                                        desc: "Appears near the bottom of the page, below the New Arrivals list" 
                                    }
                                };
                                
                                const location = slotLocations[slot.slotKey] || { label: slot.slotName, desc: `Key: ${slot.slotKey}` };

                                return (
                                    <Card key={slot.id} className="border-gold/15 shadow-sm overflow-hidden bg-white hover:shadow-md transition-shadow">
                                        <div className="border-b border-gold/10 bg-slate-50/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`h-2 w-2 rounded-full ${edit.isVisible ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                                                    <h4 className="font-bold text-sm text-maroon font-serif tracking-wide">
                                                        {location.label}
                                                    </h4>
                                                    {edit.isVisible ? (
                                                        <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                            Live
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] font-bold bg-gray-50 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                            Hidden
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-500 mt-0.5 font-sans">{location.desc}</p>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 self-end sm:self-auto">
                                                {dirty && (
                                                    <span className="text-[10px] text-amber-600 font-semibold italic mr-1">
                                                        Unsaved changes
                                                    </span>
                                                )}
                                                <Button
                                                    size="sm"
                                                    disabled={!dirty || saveSlotMutation.isPending}
                                                    onClick={() => handleSaveSlot(slot.id)}
                                                    className={`h-8 text-xs font-bold uppercase px-4 tracking-wider ${
                                                        dirty 
                                                            ? 'bg-maroon hover:bg-maroon-dark text-white shadow-sm' 
                                                            : 'bg-slate-100 text-gray-400 cursor-not-allowed border border-slate-200'
                                                    }`}
                                                >
                                                    {saveSlotMutation.isPending ? (
                                                        <>
                                                            <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                                                            Saving...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Check className="h-3.5 w-3.5 mr-1" />
                                                            Save Placement
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                        
                                        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-12 gap-6">
                                            {/* Settings Form */}
                                            <div className="md:col-span-5 space-y-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Select Campaign</label>
                                                    <Select
                                                        value={edit.campaignId || 'none'}
                                                        onValueChange={(val) => handleSlotCampaignChange(slot.id, val)}
                                                    >
                                                        <SelectTrigger className="h-9 text-xs border-gold/20 bg-white">
                                                            <SelectValue placeholder="No Campaign Selected" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none" className="text-xs text-gray-500 italic">No Campaign (Empty Slot)</SelectItem>
                                                            {campaigns?.map(camp => (
                                                                <SelectItem key={camp.id} value={camp.id} className="text-xs">
                                                                    <div className="flex items-center justify-between w-full gap-2">
                                                                        <span>{camp.name}</span>
                                                                        <span className={`text-[8.5px] uppercase px-1.5 py-0.2 rounded font-bold border ${
                                                                            camp.status === 'active' 
                                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                                                : camp.status === 'inactive' 
                                                                                ? 'bg-rose-50 text-rose-700 border-rose-100'
                                                                                : 'bg-amber-50 text-amber-700 border-amber-100'
                                                                        }`}>
                                                                            {camp.status}
                                                                        </span>
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="flex items-center justify-between p-3 border border-gold/10 rounded-lg bg-slate-50/50">
                                                    <div>
                                                        <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">Visibility Status</label>
                                                        <span className="text-[10px] text-gray-400">Control if this banner displays on the live website</span>
                                                    </div>
                                                    
                                                    {/* Custom Premium Toggle Switch */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSlotVisibilityToggle(slot.id)}
                                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                            edit.isVisible ? 'bg-maroon' : 'bg-slate-200'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                                                edit.isVisible ? 'translate-x-5' : 'translate-x-0'
                                                            }`}
                                                        />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Banner / Campaign Preview Card */}
                                            <div className="md:col-span-7 border border-gold/10 rounded-lg overflow-hidden bg-slate-50/50 flex flex-col justify-center min-h-[140px] relative">
                                                {assignedCampaign ? (
                                                    <div className="p-3 space-y-3">
                                                        <div className="flex items-center justify-between border-b border-gold/5 pb-2">
                                                            <span className="text-[9.5px] font-bold text-maroon uppercase tracking-widest font-mono">Assigned Campaign Preview</span>
                                                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                                                                assignedCampaign.status === 'active'
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                    : assignedCampaign.status === 'inactive'
                                                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                                            }`}>
                                                                {assignedCampaign.status}
                                                            </span>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                                            <div className="sm:col-span-4 aspect-[16/10] bg-slate-900 rounded overflow-hidden border border-gray-250 relative group">
                                                                {assignedCampaign.desktopBannerUrl ? (
                                                                    <img 
                                                                        src={assignedCampaign.desktopBannerUrl} 
                                                                        alt="Campaign Banner" 
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-gold/30 bg-gradient-to-r from-red-950 to-maroon">
                                                                        <ImageIcon className="h-6 w-6" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            <div className="sm:col-span-8 space-y-1">
                                                                <h5 className="font-bold text-xs text-gray-900 leading-tight">
                                                                    {assignedCampaign.name}
                                                                </h5>
                                                                <p className="text-xs font-serif text-maroon font-semibold italic">
                                                                    {assignedCampaign.title}
                                                                </p>
                                                                {assignedCampaign.subtitle && (
                                                                    <p className="text-[10px] text-gray-500 font-sans line-clamp-1 leading-normal">
                                                                        {assignedCampaign.subtitle}
                                                                    </p>
                                                                )}
                                                                <div className="text-[9.5px] text-gray-400 font-mono mt-1 flex items-center gap-1">
                                                                    <Calendar className="h-2.5 w-2.5" />
                                                                    {new Date(assignedCampaign.startDate).toLocaleDateString()} - {new Date(assignedCampaign.endDate).toLocaleDateString()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-8 text-center text-gray-400">
                                                        <Megaphone className="h-6 w-6 mx-auto text-gray-300 mb-1.5" />
                                                        <p className="text-xs italic">No campaign assigned to this slot</p>
                                                        <p className="text-[10px] text-gray-400 mt-0.5">Use the dropdown to assign a campaign</p>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* CREATE / EDIT FORM DIALOG */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-4 border-b border-gold/10">
                        <DialogTitle className="text-maroon font-serif text-lg tracking-wide uppercase">
                            {editingCampaign ? 'Edit Marketing Campaign' : 'Create Marketing Campaign'}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-500">
                            Configure campaign details, upload custom banners, and map storefront products
                        </DialogDescription>
                    </DialogHeader>

                    {/* Dialog Scrollable content area */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Campaign Info */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-maroon uppercase tracking-wider flex items-center gap-1">
                                    <Info className="h-3.5 w-3.5" /> General Details
                                </h3>

                                <div className="space-y-1.5">
                                    <Label htmlFor="camp-name" className="text-xs font-semibold text-gray-700">Campaign Name *</Label>
                                    <Input 
                                        id="camp-name" 
                                        placeholder="e.g. Diwali Festive Sale 2026" 
                                        value={formName}
                                        onChange={handleNameChange}
                                        className="h-9 text-xs border-gold/20"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="camp-slug" className="text-xs font-semibold text-gray-700">Campaign Slug (URL Key) *</Label>
                                    <Input 
                                        id="camp-slug" 
                                        placeholder="e.g. diwali-festive-sale" 
                                        value={formSlug}
                                        onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                        className="h-9 text-xs border-gold/20 font-mono"
                                    />
                                    <p className="text-[9.5px] text-gray-400">Used as the URL route on storefront (e.g. /campaigns/{formSlug || 'slug-key'})</p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="camp-title" className="text-xs font-semibold text-gray-700">Display Title (Optional)</Label>
                                    <Input 
                                        id="camp-title" 
                                        placeholder="e.g. The Royal Silk Banarasi Collection" 
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        className="h-9 text-xs border-gold/20"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="camp-subtitle" className="text-xs font-semibold text-gray-700">Subtitle / Tagline</Label>
                                    <Textarea 
                                        id="camp-subtitle" 
                                        placeholder="e.g. Flat 15% off on pure katan sarees. Limited time offer." 
                                        value={formSubtitle}
                                        onChange={(e) => setFormSubtitle(e.target.value)}
                                        className="text-xs border-gold/20 min-h-[50px] resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="camp-start" className="text-xs font-semibold text-gray-700">Start Date & Time *</Label>
                                        <Input 
                                            id="camp-start" 
                                            type="datetime-local" 
                                            value={formStartDate}
                                            onChange={(e) => setFormStartDate(e.target.value)}
                                            className="h-9 text-xs border-gold/20"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="camp-end" className="text-xs font-semibold text-gray-700">End Date & Time *</Label>
                                        <Input 
                                            id="camp-end" 
                                            type="datetime-local" 
                                            value={formEndDate}
                                            onChange={(e) => setFormEndDate(e.target.value)}
                                            className="h-9 text-xs border-gold/20"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="camp-status" className="text-xs font-semibold text-gray-700">Status</Label>
                                        <Select 
                                            value={formStatus} 
                                            onValueChange={(val: any) => setFormStatus(val)}
                                        >
                                            <SelectTrigger id="camp-status" className="h-9 text-xs border-gold/20 bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="draft">Draft</SelectItem>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="camp-sort" className="text-xs font-semibold text-gray-700">Sort Order</Label>
                                        <Input 
                                            id="camp-sort" 
                                            type="number"
                                            value={formSortOrder}
                                            onChange={(e) => setFormSortOrder(e.target.value)}
                                            className="h-9 text-xs border-gold/20"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Banner Upload */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-maroon uppercase tracking-wider flex items-center gap-1">
                                    <ImageIcon className="h-3.5 w-3.5" /> Campaign Banner
                                </h3>

                                <div className="space-y-2 p-3 border border-gold/10 rounded-lg bg-slate-50/50">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                                            <Monitor className="h-3 w-3 text-gray-500" /> Banner Image
                                        </Label>
                                        <span className="text-[9.5px] text-gray-400 font-mono">Recommend: 1920x800</span>
                                    </div>

                                    {bannerPreviewUrl ? (
                                        <div className="relative group border border-gray-200 rounded overflow-hidden">
                                            <img 
                                                src={bannerPreviewUrl} 
                                                alt="Banner preview" 
                                                className="w-full h-32 object-cover"
                                            />
                                            {compressing && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/40 backdrop-blur-[2px]">
                                                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                                                    <span className="text-white text-xs font-bold tracking-wider">Compressing Banner…</span>
                                                </div>
                                            )}
                                            {!compressing && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setBannerFile(null);
                                                        setBannerPreviewUrl(null);
                                                        setSizeInfo(null);
                                                    }}
                                                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow transition-colors"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className={`border border-dashed rounded-lg p-6 text-center bg-white transition-colors relative ${
                                            compressing ? 'border-amber-300 cursor-wait' : 'border-gold/20 hover:bg-slate-50 cursor-pointer'
                                        }`}>
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                onChange={handleBannerFileChange}
                                                disabled={compressing}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait"
                                            />
                                            {compressing ? (
                                                <div className="flex flex-col items-center justify-center py-2 gap-2">
                                                    <Loader2 className="h-6 w-6 animate-spin text-maroon mx-auto" />
                                                    <p className="text-xs font-bold text-maroon">Compressing banner image...</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload className="h-6 w-6 text-gold/60 mx-auto mb-1.5" />
                                                    <p className="text-[10.5px] font-semibold text-gray-700">Click to upload campaign banner</p>
                                                    <p className="text-[9px] text-gray-400 mt-0.5">Supports PNG, JPG, JPEG, WebP. Auto-compressed before upload.</p>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {sizeInfo && !compressing && (
                                        <div className={`mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
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
                                </div>
                            </div>
                        </div>

                        {/* Inventory Product Picker */}
                        <div className="border-t border-gold/10 pt-4 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-xs font-bold text-maroon uppercase tracking-wider flex items-center gap-1.5">
                                        <Plus className="h-4 w-4" /> Campaign Products ({selectedProductIds.length} Selected)
                                    </h3>
                                    <p className="text-[10.5px] text-gray-500 font-sans">Select products from existing inventory to link with this campaign</p>
                                </div>

                                <div className="flex gap-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleSelectAllFiltered}
                                        disabled={filteredSarees.length === 0}
                                        className="h-7 text-[10px] uppercase font-bold border-gold/25 text-maroon"
                                    >
                                        Select All ({filteredSarees.length})
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDeselectAllFiltered}
                                        disabled={filteredSarees.length === 0}
                                        className="h-7 text-[10px] uppercase font-bold border-gray-200 text-gray-500"
                                    >
                                        Clear Filtered
                                    </Button>
                                </div>
                            </div>

                            {/* Filters for inventory picker */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg border border-gold/5">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                                    <Input 
                                        placeholder="Search by Saree Name, SKU or Code..." 
                                        value={inventorySearch}
                                        onChange={(e) => setInventorySearch(e.target.value)}
                                        className="pl-8 h-8 text-xs bg-white border-gold/20"
                                    />
                                </div>

                                <div>
                                    <Select value={inventoryCategory} onValueChange={setInventoryCategory}>
                                        <SelectTrigger className="h-8 text-xs bg-white border-gold/20">
                                            <SelectValue placeholder="All Categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            {categories.map(cat => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Inventory List with checkboxes */}
                            <div className="border border-gold/10 rounded-lg max-h-60 overflow-y-auto">
                                {isSareesLoading ? (
                                    <div className="p-8 text-center text-xs italic text-gray-400">
                                        Loading inventory products...
                                    </div>
                                ) : filteredSarees.length === 0 ? (
                                    <div className="p-8 text-center text-xs italic text-gray-400">
                                        No products match the search filters.
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                            <TableRow className="border-b border-gold/10">
                                                <TableHead className="w-[50px] p-2 text-center"></TableHead>
                                                <TableHead className="w-[80px] p-2 text-xs font-bold text-gray-600">Image</TableHead>
                                                <TableHead className="p-2 text-xs font-bold text-gray-600">Product details</TableHead>
                                                <TableHead className="p-2 text-xs font-bold text-gray-600">SKU / Code</TableHead>
                                                <TableHead className="p-2 text-xs font-bold text-gray-600">Category</TableHead>
                                                <TableHead className="p-2 text-right text-xs font-bold text-gray-600">Price</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredSarees.map((saree) => {
                                                const isSelected = selectedProductIds.includes(saree.id);
                                                const primaryImg = saree.images?.find(img => img.isPrimary) || saree.images?.[0];

                                                return (
                                                    <TableRow 
                                                        key={saree.id} 
                                                        className={`border-b border-gray-150 cursor-pointer hover:bg-slate-50/50 ${isSelected ? 'bg-cream-light/30' : ''}`}
                                                        onClick={() => toggleProductSelection(saree.id)}
                                                    >
                                                        <TableCell className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                                                            <input 
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleProductSelection(saree.id)}
                                                                className="h-3.5 w-3.5 rounded border-gray-300 text-maroon focus:ring-maroon cursor-pointer"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="p-2">
                                                            {primaryImg ? (
                                                                <img 
                                                                    src={primaryImg.imageUrl} 
                                                                    alt={saree.sareeName} 
                                                                    className="h-8 w-8 object-cover rounded border border-gray-100"
                                                                />
                                                            ) : (
                                                                <div className="h-8 w-8 bg-gray-100 flex items-center justify-center rounded text-gray-300">
                                                                    <ImageIcon className="h-4 w-4" />
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="p-2">
                                                            <div className="font-semibold text-xs text-gray-800 leading-tight">
                                                                {saree.sareeName}
                                                            </div>
                                                            <div className="text-[9px] text-gray-400 mt-0.5">
                                                                {saree.fabric} • {saree.color}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="p-2 font-mono text-[10.5px] text-gray-600">
                                                            {saree.sku || saree.id}
                                                        </TableCell>
                                                        <TableCell className="p-2 text-xs text-gray-600">
                                                            {saree.category}
                                                        </TableCell>
                                                        <TableCell className="p-2 text-right font-mono text-xs font-semibold text-maroon">
                                                            ₹{saree.sellingPrice.toLocaleString()}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-4 bg-slate-50 border-t border-gold/10 flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsFormOpen(false)}
                            className="h-9 text-xs font-bold uppercase border-gray-200 text-gray-500 hover:bg-gray-100"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={() => saveCampaignMutation.mutate()}
                            disabled={saveCampaignMutation.isPending || compressing}
                            className="h-9 text-xs font-bold uppercase tracking-wider bg-maroon hover:bg-maroon-dark text-white px-5"
                        >
                            {saveCampaignMutation.isPending ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                    Saving...
                                </>
                            ) : compressing ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                    Compressing...
                                </>
                            ) : (
                                'Save Campaign'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* STOREFRONT PREVIEW DIALOG */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white border-gold/20">
                    <DialogHeader className="p-4 bg-maroon text-cream border-b border-gold/20 flex flex-row items-center justify-between">
                        <div>
                            <DialogTitle className="font-serif text-lg tracking-widest text-gold uppercase">
                                Storefront Live Preview
                            </DialogTitle>
                            <DialogDescription className="text-xs text-cream/70 font-sans">
                                Simulating user interface on the Shree Banarasi Sarees storefront app
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    {/* Preview Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {previewCampaign && (
                            <>
                                {/* Device & Layout Toggles */}
                                <div className="flex items-center justify-between border-b border-gold/10 pb-3">
                                    <div className="space-y-0.5">
                                        <h4 className="text-xs font-bold text-maroon uppercase tracking-wider">Homepage Banner Simulation</h4>
                                        <p className="text-[10px] text-gray-500">Toggle views to check banners responsiveness and textual overlays</p>
                                    </div>
                                    
                                    <div className="flex bg-slate-100 border border-slate-200 rounded-lg p-0.5">
                                        <button
                                            onClick={() => setPreviewTab('desktop')}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                                                previewTab === 'desktop' 
                                                    ? 'bg-white text-maroon shadow-sm' 
                                                    : 'text-gray-500 hover:text-gray-900'
                                            }`}
                                        >
                                            <Monitor className="h-3.5 w-3.5" /> Desktop
                                        </button>
                                        <button
                                            onClick={() => setPreviewTab('mobile')}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                                                previewTab === 'mobile' 
                                                    ? 'bg-white text-maroon shadow-sm' 
                                                    : 'text-gray-500 hover:text-gray-900'
                                            }`}
                                        >
                                            <Smartphone className="h-3.5 w-3.5" /> Mobile
                                        </button>
                                    </div>
                                </div>

                                {/* Banner Simulation Frame */}
                                <div className="flex justify-center">
                                    {previewTab === 'desktop' ? (
                                        /* Desktop wide banner */
                                        <div className="w-full border border-gold/20 rounded-xl overflow-hidden shadow-md bg-white relative">
                                            {/* Top Browser Bar */}
                                            <div className="bg-slate-50 border-b border-gray-150 px-4 py-1.5 flex items-center gap-1.5 text-gray-400">
                                                <div className="h-2 w-2 rounded-full bg-red-400"></div>
                                                <div className="h-2 w-2 rounded-full bg-yellow-400"></div>
                                                <div className="h-2 w-2 rounded-full bg-green-400"></div>
                                                <div className="bg-white border border-gray-200 text-[8.5px] px-3 py-0.5 rounded ml-4 w-64 text-center font-mono select-none truncate">
                                                    https://shreebanarasi.com/campaign/{previewCampaign.slug}
                                                </div>
                                            </div>

                                            {/* Banner Content */}
                                            <div className="relative aspect-[21/9] w-full bg-slate-900 flex items-center justify-center">
                                                {previewCampaign.desktopBannerUrl ? (
                                                    <img 
                                                        src={previewCampaign.desktopBannerUrl} 
                                                        alt="Desktop Banner" 
                                                        className="absolute inset-0 w-full h-full object-cover opacity-80"
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 bg-gradient-to-r from-red-950 to-maroon opacity-80 flex flex-col items-center justify-center text-gold/30">
                                                        <ImageIcon className="h-10 w-10 mb-2" />
                                                        <span className="text-[10px] uppercase font-bold tracking-widest">No Desktop Banner Uploaded</span>
                                                    </div>
                                                )}

                                                {/* Text Overlay */}
                                                <div className="relative z-10 text-center px-6 max-w-2xl bg-black/35 backdrop-blur-xs py-5 rounded-lg border border-white/10">
                                                    <span className="text-[10px] font-bold text-gold uppercase tracking-[0.25em] font-sans">
                                                        {previewCampaign.name}
                                                    </span>
                                                    <h2 className="text-2xl font-black font-serif text-white tracking-wide mt-1 drop-shadow-md">
                                                        {previewCampaign.title}
                                                    </h2>
                                                    {previewCampaign.subtitle && (
                                                        <p className="text-xs text-cream/90 mt-2 font-light drop-shadow-sm font-sans">
                                                            {previewCampaign.subtitle}
                                                        </p>
                                                    )}
                                                    <div className="mt-4">
                                                        <Button className="bg-gold hover:bg-gold/90 text-maroon font-bold text-xs uppercase tracking-wider px-5 py-1.5 h-8 rounded-none">
                                                            Shop Collection
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Mobile Portrait Banner */
                                        <div className="w-[320px] border-[6px] border-slate-950 rounded-[32px] overflow-hidden shadow-2xl bg-white relative aspect-[9/18]">
                                            {/* Top Speaker/Camera bar */}
                                            <div className="bg-slate-950 h-5 flex justify-center items-center">
                                                <div className="w-16 h-2 bg-slate-800 rounded-full"></div>
                                            </div>

                                            {/* Mobil Store URL */}
                                            <div className="bg-slate-50 border-b border-gray-150 px-3 py-1 text-center font-mono text-[7.5px] text-gray-400 select-none truncate">
                                                shreebanarasi.com/c/{previewCampaign.slug}
                                            </div>

                                            {/* Banner Content */}
                                            <div className="relative h-[280px] bg-slate-900 flex items-center justify-center">
                                                {previewCampaign.mobileBannerUrl ? (
                                                    <img 
                                                        src={previewCampaign.mobileBannerUrl} 
                                                        alt="Mobile Banner" 
                                                        className="absolute inset-0 w-full h-full object-cover opacity-80"
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 bg-gradient-to-b from-red-950 to-maroon opacity-80 flex flex-col items-center justify-center text-gold/30">
                                                        <ImageIcon className="h-8 w-8 mb-1" />
                                                        <span className="text-[8px] uppercase font-bold tracking-widest text-center">No Mobile Banner Uploaded</span>
                                                    </div>
                                                )}

                                                {/* Text Overlay */}
                                                <div className="relative z-10 text-center px-4 w-full bg-black/40 backdrop-blur-xs py-4">
                                                    <span className="text-[8.5px] font-bold text-gold uppercase tracking-[0.2em] font-sans">
                                                        {previewCampaign.name}
                                                    </span>
                                                    <h2 className="text-base font-bold font-serif text-white tracking-wide mt-1.5 leading-tight">
                                                        {previewCampaign.title}
                                                    </h2>
                                                    {previewCampaign.subtitle && (
                                                        <p className="text-[10px] text-cream/90 mt-1 font-light leading-normal line-clamp-2">
                                                            {previewCampaign.subtitle}
                                                        </p>
                                                    )}
                                                    <div className="mt-3">
                                                        <Button className="bg-gold text-maroon font-bold text-[9px] uppercase tracking-wider px-4 py-1 h-7 rounded-none">
                                                            Shop Now
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Simulator body */}
                                            <div className="p-3 bg-cream-light/10 h-[calc(100%-305px)] overflow-y-auto space-y-2">
                                                <div className="flex justify-between items-center border-b border-gold/5 pb-1">
                                                    <span className="text-[10px] font-bold text-maroon font-serif">Featured Sarees</span>
                                                    <span className="text-[8px] text-gray-500 font-sans">{previewProducts.length} items</span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-1.5">
                                                    {previewProducts.slice(0, 4).map(prod => {
                                                        const pImg = prod.images?.find(i => i.isPrimary) || prod.images?.[0];
                                                        return (
                                                            <div key={prod.id} className="bg-white border border-gold/5 rounded p-1 shadow-xs space-y-1">
                                                                <div className="aspect-square bg-slate-50 overflow-hidden rounded relative">
                                                                    {pImg ? (
                                                                        <img src={pImg.imageUrl} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                                                                            <ImageIcon className="h-4 w-4" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="space-y-0.5">
                                                                    <h5 className="text-[8.5px] font-bold text-gray-800 truncate leading-none">{prod.sareeName}</h5>
                                                                    <div className="flex justify-between items-center mt-0.5">
                                                                        <span className="text-[8px] text-maroon font-mono font-bold">₹{prod.sellingPrice}</span>
                                                                        <span className="text-[6.5px] text-gray-400 font-mono truncate max-w-[45px]">{prod.sku}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Storefront Grid Simulation */}
                                <div className="space-y-3 mt-4">
                                    <div className="flex items-center justify-between border-b border-gold/10 pb-2">
                                        <div>
                                            <h4 className="text-xs font-bold text-maroon uppercase tracking-wider">Campaign Products List ({previewProducts.length} items)</h4>
                                            <p className="text-[10.5px] text-gray-500">Products displaying in the campaign's collection view on the website</p>
                                        </div>
                                    </div>

                                    {previewProducts.length === 0 ? (
                                        <div className="bg-slate-50 border border-dashed border-gold/10 p-6 rounded-lg text-center text-xs italic text-gray-400">
                                            No products added to this campaign yet. Edit this campaign to link inventory products.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                            {previewProducts.map((prod) => {
                                                const pImg = prod.images?.find(i => i.isPrimary) || prod.images?.[0];
                                                return (
                                                    <div 
                                                        key={prod.id} 
                                                        className="bg-white border border-gold/10 rounded-lg p-2 flex flex-col justify-between shadow-xs hover:border-gold/30 transition-all group"
                                                    >
                                                        <div className="space-y-2">
                                                            <div className="aspect-square bg-slate-50 rounded-md overflow-hidden relative border border-gray-100">
                                                                {pImg ? (
                                                                    <img 
                                                                        src={pImg.imageUrl} 
                                                                        alt={prod.sareeName} 
                                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                                                                        <ImageIcon className="h-6 w-6" />
                                                                    </div>
                                                                )}
                                                                {prod.stock <= 0 && (
                                                                    <span className="absolute top-1 left-1 bg-red-600 text-white text-[7.5px] font-bold px-1 py-0.2 rounded uppercase">
                                                                        Sold Out
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                <h5 className="text-[11px] font-bold text-gray-900 leading-tight line-clamp-1" title={prod.sareeName}>
                                                                    {prod.sareeName}
                                                                </h5>
                                                                <p className="text-[8.5px] text-gray-400 uppercase font-mono tracking-wider">
                                                                    SKU: {prod.sku || prod.id}
                                                                </p>
                                                                <p className="text-[9px] text-gray-500 font-sans truncate">
                                                                    {prod.fabric} • {prod.color}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between border-t border-slate-50 pt-1.5 mt-2">
                                                            <span className="text-[11px] font-bold text-maroon font-mono">
                                                                ₹{prod.sellingPrice.toLocaleString()}
                                                            </span>
                                                            <span className="text-[9px] text-emerald-600 font-bold">
                                                                {prod.stock > 0 ? `${prod.stock} left` : 'Out of stock'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter className="p-4 bg-slate-50 border-t border-gold/10">
                        <Button
                            type="button"
                            onClick={() => setIsPreviewOpen(false)}
                            className="bg-maroon hover:bg-maroon-dark text-white text-xs font-bold uppercase tracking-wider px-6 h-9"
                        >
                            Close Preview
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
