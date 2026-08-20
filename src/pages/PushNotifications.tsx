import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pushNotificationService, type OnlineProfile } from '@/services/pushNotificationService';
import {
    Bell, Send, Users, User, Search, Loader2, ShieldAlert, History,
    Sparkles, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight,
    ImageOff, UploadCloud, X, Radio, Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function PushNotificationsPage() {
    const queryClient = useQueryClient();

    const [title, setTitle] = React.useState('');
    const [body, setBody] = React.useState('');
    const [url, setUrl] = React.useState('');
    const [audience, setAudience] = React.useState<'all' | 'user'>('all');
    const [selectedProfile, setSelectedProfile] = React.useState<OnlineProfile | null>(null);
    const [profileSearch, setProfileSearch] = React.useState('');
    const [isSearchFocused, setIsSearchFocused] = React.useState(false);
    const [imageUrl, setImageUrl] = React.useState<string | null>(null);
    const [isUploadingImage, setIsUploadingImage] = React.useState(false);
    const imageInputRef = React.useRef<HTMLInputElement>(null);
    const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
    const [currentPage, setCurrentPage] = React.useState(1);
    const itemsPerPage = 6;

    const { data: history = [], isLoading: isLoadingHistory } = useQuery({
        queryKey: ['pushNotifications'],
        queryFn: pushNotificationService.getNotifications
    });

    const { data: subscriberCount = 0, isLoading: isLoadingSubscribers } = useQuery({
        queryKey: ['subscribedTokenCount'],
        queryFn: pushNotificationService.getSubscribedTokenCount
    });

    const { data: profiles = [], isLoading: isLoadingProfiles } = useQuery({
        queryKey: ['onlineProfiles'],
        queryFn: pushNotificationService.getOnlineProfiles,
        staleTime: 5 * 60 * 1000,
        retry: false
    });

    const sendMutation = useMutation({
        mutationFn: pushNotificationService.sendNotification,
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['pushNotifications'] });
            queryClient.invalidateQueries({ queryKey: ['subscribedTokenCount'] });
            toast.success(`Sent: ${res.sentCount} · Failed: ${res.failedCount}`);
            setTitle(''); setBody(''); setUrl(''); setImageUrl(null);
            setSelectedProfile(null); setProfileSearch('');
        },
        onError: (err: any) => toast.error(err.message || 'Failed to dispatch notification')
    });

    const filteredProfiles = React.useMemo(() => {
        if (!profileSearch.trim()) return profiles.slice(0, 8);
        const s = profileSearch.toLowerCase();
        return profiles.filter(p =>
            (p.fullName && p.fullName.toLowerCase().includes(s)) ||
            (p.email && p.email.toLowerCase().includes(s)) ||
            (p.phoneNumber && String(p.phoneNumber).includes(s))
        ).slice(0, 8);
    }, [profiles, profileSearch]);

    const isUrlValid = React.useMemo(() => {
        if (!url.trim()) return true;
        return url.startsWith('/') && !url.includes('://') && !url.includes('www.');
    }, [url]);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return toast.error('Title is required');
        if (!body.trim()) return toast.error('Message body is required');
        if (title.length > 50) return toast.error('Title must be ≤ 50 characters');
        if (body.length > 150) return toast.error('Body must be ≤ 150 characters');
        if (!isUrlValid) return toast.error('URL must be an internal relative path (starts with /)');
        if (audience === 'user' && !selectedProfile) return toast.error('Please select a target customer');
        audience === 'all' ? setIsConfirmOpen(true) : executeSend();
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const err = pushNotificationService.validateBannerImage(file);
        if (err) { toast.error(err); if (imageInputRef.current) imageInputRef.current.value = ''; return; }
        setIsUploadingImage(true);
        try {
            const publicUrl = await pushNotificationService.uploadBannerImage(file);
            setImageUrl(publicUrl);
            toast.success('Banner uploaded');
        } catch (err: any) {
            toast.error(err.message || 'Upload failed');
        } finally {
            setIsUploadingImage(false);
            if (imageInputRef.current) imageInputRef.current.value = '';
        }
    };

    const executeSend = () => {
        setIsConfirmOpen(false);
        sendMutation.mutate({
            title: title.trim(), body: body.trim(),
            url: url.trim() || undefined,
            imageUrl: imageUrl ?? null,
            audience,
            targetUserId: audience === 'user' ? selectedProfile?.id : undefined
        });
    };

    const totalPages = Math.ceil(history.length / itemsPerPage);
    const paginatedHistory = React.useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return history.slice(start, start + itemsPerPage);
    }, [history, currentPage]);

    const getCustomerName = (id: string | null) => {
        if (!id) return '—';
        const p = profiles.find(p => p.id === id);
        return p ? (p.fullName || p.email || 'User') : 'Target Customer';
    };

    return (
        <div className="space-y-5 max-w-7xl mx-auto px-2 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-maroon to-maroon-dark text-gold rounded-xl shadow-md shadow-maroon/20">
                        <Bell className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold font-serif text-maroon tracking-wide">Push Broadcast</h1>
                        <p className="text-xs text-gray-500 font-sans">Dispatch real-time notifications to subscribed customers</p>
                    </div>
                </div>

                {/* Live subscriber pill */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full self-start sm:self-auto">
                    <Radio className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                    {isLoadingSubscribers
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                        : <span className="text-xs font-bold text-emerald-700 font-mono">{subscriberCount} subscribed</span>
                    }
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">

                {/* LEFT: Composer (2 cols) */}
                <div className="lg:col-span-2">
                    <Card className="border-gold/20 shadow-md bg-white overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/10 px-4 py-3">
                            <CardTitle className="text-sm font-bold text-maroon uppercase tracking-wider flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-maroon/70" />
                                Compose Notification
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <form onSubmit={handleFormSubmit} className="space-y-4">
                                {/* Title */}
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Title *</label>
                                        <span className={`text-[10px] font-mono ${title.length > 50 ? 'text-rose-500' : 'text-gray-400'}`}>{title.length}/50</span>
                                    </div>
                                    <Input
                                        required maxLength={60}
                                        placeholder="Festival Sale is Live! 🪔"
                                        className="h-9 text-xs border-gold/30 focus-visible:ring-maroon bg-white"
                                        value={title} onChange={e => setTitle(e.target.value)}
                                        disabled={sendMutation.isPending}
                                    />
                                </div>

                                {/* Body */}
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Message *</label>
                                        <span className={`text-[10px] font-mono ${body.length > 150 ? 'text-rose-500' : 'text-gray-400'}`}>{body.length}/150</span>
                                    </div>
                                    <Textarea
                                        required maxLength={200}
                                        placeholder="Exclusive offer for our valued customers..."
                                        className="text-xs border-gold/30 focus-visible:ring-maroon bg-white min-h-[80px] resize-none"
                                        value={body} onChange={e => setBody(e.target.value)}
                                        disabled={sendMutation.isPending}
                                    />
                                </div>

                                {/* URL */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                                        Destination URL <span className="lowercase italic font-normal text-gray-400">(optional)</span>
                                    </label>
                                    <Input
                                        placeholder="/category/silk-sarees"
                                        className={cn("h-9 text-xs bg-white focus-visible:ring-maroon", !isUrlValid ? "border-rose-400" : "border-gold/30")}
                                        value={url} onChange={e => setUrl(e.target.value)}
                                        disabled={sendMutation.isPending}
                                    />
                                    {!isUrlValid && <p className="text-[10px] text-rose-500">Must start with "/" — no external links</p>}
                                </div>

                                {/* Audience Toggle */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Audience</label>
                                    <div className="flex border border-gold/25 rounded-lg overflow-hidden text-[11px] font-bold uppercase tracking-wider">
                                        {(['all', 'user'] as const).map(opt => (
                                            <button
                                                key={opt}
                                                type="button"
                                                onClick={() => { setAudience(opt); setSelectedProfile(null); setProfileSearch(''); }}
                                                disabled={sendMutation.isPending}
                                                className={cn(
                                                    "flex-1 py-2 flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                                                    audience === opt ? "bg-gradient-to-r from-maroon to-maroon-dark text-gold" : "text-gray-500 hover:bg-gray-50",
                                                    opt === 'all' ? "border-r border-gold/25" : ""
                                                )}
                                            >
                                                {opt === 'all' ? <Users className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                                                {opt === 'all' ? 'All Users' : 'Single User'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Customer Search */}
                                {audience === 'user' && (
                                    <div className="space-y-1 relative">
                                        <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Target Customer</label>
                                        {selectedProfile ? (
                                            <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-gray-800 truncate">{selectedProfile.fullName || 'User'}</p>
                                                    <p className="text-[10px] text-gray-500 truncate font-mono">{selectedProfile.email}</p>
                                                </div>
                                                <button type="button" onClick={() => { setSelectedProfile(null); setProfileSearch(''); }}
                                                    className="text-[10px] font-bold text-rose-600 hover:bg-rose-100 px-2 py-1 rounded uppercase cursor-pointer shrink-0">
                                                    Change
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                                <Input
                                                    placeholder="Search by name or email..."
                                                    className="pl-9 h-9 text-xs border-gold/30 focus-visible:ring-maroon bg-white"
                                                    value={profileSearch}
                                                    onChange={e => setProfileSearch(e.target.value)}
                                                    onFocus={() => setIsSearchFocused(true)}
                                                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                                />
                                                {isSearchFocused && (
                                                    <div className="absolute z-20 w-full mt-1 bg-white border border-gold/20 rounded-lg shadow-lg max-h-44 overflow-y-auto divide-y divide-gray-50">
                                                        {isLoadingProfiles ? (
                                                            <div className="p-3 text-center text-xs text-gray-400">Loading...</div>
                                                        ) : filteredProfiles.length === 0 ? (
                                                            <div className="p-3 text-center text-xs text-gray-400">No profiles found</div>
                                                        ) : filteredProfiles.map(p => (
                                                            <div key={p.id} onMouseDown={() => setSelectedProfile(p)}
                                                                className="px-3 py-2 text-xs hover:bg-cream/10 cursor-pointer">
                                                                <p className="font-semibold text-gray-800">{p.fullName || 'User'}</p>
                                                                <p className="text-[10px] text-gray-400 font-mono">{p.email}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Banner Image */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                                        Banner <span className="lowercase italic font-normal text-gray-400">optional · max 2MB</span>
                                    </label>
                                    {imageUrl ? (
                                        <div className="relative rounded-lg overflow-hidden border border-gold/25">
                                            <img src={imageUrl} alt="banner" className="w-full object-cover max-h-28" />
                                            <button type="button" onClick={() => { setImageUrl(null); if (imageInputRef.current) imageInputRef.current.value = ''; }}
                                                disabled={sendMutation.isPending}
                                                className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 cursor-pointer">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button type="button" onClick={() => imageInputRef.current?.click()}
                                            disabled={isUploadingImage || sendMutation.isPending}
                                            className="w-full flex items-center justify-center gap-2 border border-dashed border-gold/30 rounded-lg py-3.5 text-xs text-gray-400 hover:border-maroon/40 hover:text-maroon/70 hover:bg-cream/5 transition-all cursor-pointer disabled:opacity-50">
                                            {isUploadingImage
                                                ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                                                : <><UploadCloud className="h-4 w-4" /> Upload Banner Image</>}
                                        </button>
                                    )}
                                    <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageSelect} />
                                </div>

                                {/* Submit */}
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-maroon to-maroon-dark hover:from-maroon-dark hover:to-maroon-dark text-gold font-bold h-10 text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-maroon/20"
                                    disabled={sendMutation.isPending || isUploadingImage || !isUrlValid || (audience === 'user' && !selectedProfile)}
                                >
                                    {sendMutation.isPending
                                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                                        : <><Send className="h-4 w-4" />{audience === 'all' ? 'Broadcast to All' : 'Send to Customer'}</>}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT: Dispatch Log (3 cols) */}
                <div className="lg:col-span-3">
                    <Card className="border-gold/20 shadow-md bg-white overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-cream/40 to-transparent border-b border-gold/10 px-4 py-3">
                            <CardTitle className="text-sm font-bold text-maroon uppercase tracking-wider flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <History className="h-4 w-4 text-maroon/70" />
                                    Dispatch Log
                                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-mono">
                                        {history.length}
                                    </span>
                                </span>
                                <span className="text-[10px] text-gray-500 normal-case font-normal hidden md:inline">Recent broadcasts</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoadingHistory ? (
                                <div className="py-16 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-maroon mb-2" />
                                    <p className="text-xs text-gray-400">Loading history...</p>
                                </div>
                            ) : history.length === 0 ? (
                                <div className="py-16 text-center">
                                    <div className="p-4 bg-gray-100 rounded-full inline-flex mb-3">
                                        <ShieldAlert className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <p className="text-sm text-gray-500">No notifications dispatched yet</p>
                                    <p className="text-xs text-gray-400 mt-1">Your broadcast history will appear here</p>
                                </div>
                            ) : (
                                <>
                                    <div className="divide-y divide-gold/10">
                                        {paginatedHistory.map((item) => (
                                            <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-cream/10 transition-colors">
                                                {/* Thumbnail */}
                                                <div className="flex-shrink-0 mt-0.5">
                                                    {item.imageUrl
                                                        ? <img src={item.imageUrl} alt="banner" className="w-14 h-10 object-cover rounded-md border border-gold/15" />
                                                        : <div className="w-14 h-10 flex items-center justify-center bg-gray-50 border border-gray-100 rounded-md">
                                                            <ImageOff className="h-4 w-4 text-gray-300" />
                                                          </div>
                                                    }
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{item.title}</p>
                                                            <p className="text-xs text-gray-500 truncate mt-0.5">{item.body}</p>
                                                        </div>
                                                        <div className="flex-shrink-0 text-right">
                                                            <p className="text-[11px] font-mono text-gray-500 whitespace-nowrap">
                                                                {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </p>
                                                            <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                                                                {new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                        {/* Audience badge */}
                                                        {item.audience === 'all'
                                                            ? <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
                                                                <Users className="h-2.5 w-2.5" /> All
                                                              </span>
                                                            : <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                                                                <Target className="h-2.5 w-2.5" /> Targeted
                                                              </span>
                                                        }
                                                        {item.targetUserId && item.audience === 'user' && (
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-gray-50 text-gray-600 border border-gray-200 truncate max-w-[140px]">
                                                                {getCustomerName(item.targetUserId)}
                                                            </span>
                                                        )}
                                                        {item.url && (
                                                            <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 truncate max-w-[120px]">{item.url}</span>
                                                        )}
                                                        {/* Delivery */}
                                                        <span className="ml-auto flex items-center gap-1.5 text-[10px] font-mono shrink-0">
                                                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                                                                <CheckCircle2 className="h-2.5 w-2.5" /> {item.sentCount}
                                                            </span>
                                                            {item.failedCount > 0 && (
                                                                <span className="inline-flex items-center gap-1 text-rose-600 font-bold bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5">
                                                                    <AlertCircle className="h-2.5 w-2.5" /> {item.failedCount}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gold/10 bg-cream/5">
                                            <span className="text-[10px] text-gray-500">
                                                Showing <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold">{Math.min(currentPage * itemsPerPage, history.length)}</span> of <span className="font-bold">{history.length}</span>
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <Button variant="outline" size="sm"
                                                    className="h-7 w-7 p-0 border-gold/20 text-maroon hover:bg-cream/10 cursor-pointer"
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}>
                                                    <ChevronLeft className="h-3.5 w-3.5" />
                                                </Button>
                                                <span className="text-[10px] font-mono text-gray-500 px-1">{currentPage}/{totalPages}</span>
                                                <Button variant="outline" size="sm"
                                                    className="h-7 w-7 p-0 border-gold/20 text-maroon hover:bg-cream/10 cursor-pointer"
                                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={currentPage === totalPages}>
                                                    <ChevronRight className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Confirm Dialog */}
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent className="border-gold/20 max-w-sm">
                    <DialogHeader className="pb-2 border-b border-gold/10">
                        <DialogTitle className="text-sm font-bold uppercase tracking-wider text-maroon font-serif flex items-center gap-1.5">
                            <AlertCircle className="h-4 w-4" /> Confirm Broadcast
                        </DialogTitle>
                    </DialogHeader>
                    <DialogDescription asChild>
                        <div className="pt-2 space-y-2.5 text-xs text-gray-500">
                            <p>Send to <span className="font-bold text-maroon font-mono">{subscriberCount}</span> subscribed devices?</p>
                            <div className="border border-gold/15 rounded-lg overflow-hidden bg-cream/5">
                                {imageUrl && <img src={imageUrl} alt="preview" className="w-full max-h-24 object-cover" />}
                                <div className="p-3 space-y-0.5">
                                    <p className="font-bold text-gray-800 text-sm">{title}</p>
                                    <p className="text-xs text-gray-600">{body}</p>
                                    {url && <p className="text-[10px] text-amber-700 font-mono">🔗 {url}</p>}
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400 italic">This action cannot be undone.</p>
                        </div>
                    </DialogDescription>
                    <DialogFooter className="gap-1.5 pt-1">
                        <Button variant="outline" className="h-8 text-[10px] border-gold/25 text-gray-600 uppercase font-bold px-3 cursor-pointer"
                            onClick={() => setIsConfirmOpen(false)} disabled={sendMutation.isPending}>
                            Cancel
                        </Button>
                        <Button className="h-8 text-[10px] bg-gradient-to-r from-maroon to-maroon-dark hover:from-maroon-dark hover:to-maroon-dark text-gold uppercase font-bold px-4 cursor-pointer"
                            onClick={executeSend} disabled={sendMutation.isPending}>
                            {sendMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                            Broadcast
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}