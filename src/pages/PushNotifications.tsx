import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pushNotificationService, type PushNotification, type OnlineProfile } from '@/services/pushNotificationService';
import {
    Bell,
    Send,
    Users,
    User,
    Search,
    Loader2,
    ShieldAlert,
    Clock,
    History,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    HelpCircle,
    ChevronLeft,
    ChevronRight,
    Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function PushNotificationsPage() {
    const queryClient = useQueryClient();

    // Form State
    const [title, setTitle] = React.useState('');
    const [body, setBody] = React.useState('');
    const [url, setUrl] = React.useState('');
    const [audience, setAudience] = React.useState<'all' | 'user'>('all');
    const [selectedProfile, setSelectedProfile] = React.useState<OnlineProfile | null>(null);
    const [profileSearch, setProfileSearch] = React.useState('');
    const [isSearchFocused, setIsSearchFocused] = React.useState(false);

    // Confirmation Dialog
    const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = React.useState(1);
    const itemsPerPage = 8;

    // Fetch Notifications History
    const { data: history = [], isLoading: isLoadingHistory } = useQuery({
        queryKey: ['pushNotifications'],
        queryFn: pushNotificationService.getNotifications
    });

    // Fetch Subscribed Token Count
    const { data: subscriberCount = 0, isLoading: isLoadingSubscribers } = useQuery({
        queryKey: ['subscribedTokenCount'],
        queryFn: pushNotificationService.getSubscribedTokenCount
    });

    // Fetch Online Profiles for single user targeting
    const { data: profiles = [], isLoading: isLoadingProfiles } = useQuery({
        queryKey: ['onlineProfiles'],
        queryFn: pushNotificationService.getOnlineProfiles,
        enabled: audience === 'user'
    });

    // Mutation to send notification
    const sendMutation = useMutation({
        mutationFn: pushNotificationService.sendNotification,
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['pushNotifications'] });
            queryClient.invalidateQueries({ queryKey: ['subscribedTokenCount'] });
            
            toast.success(`Notification sent! Sent: ${res.sentCount} | Failed: ${res.failedCount}`);
            
            // Reset Form on Success
            setTitle('');
            setBody('');
            setUrl('');
            setSelectedProfile(null);
            setProfileSearch('');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to dispatch push notification');
        }
    });

    // Filtering profiles based on search query
    const filteredProfiles = React.useMemo(() => {
        if (!profileSearch.trim()) return profiles.slice(0, 10);
        const search = profileSearch.toLowerCase();
        return profiles.filter(
            p =>
                (p.fullName && p.fullName.toLowerCase().includes(search)) ||
                (p.email && p.email.toLowerCase().includes(search)) ||
                (p.phoneNumber && p.phoneNumber.includes(search))
        ).slice(0, 10);
    }, [profiles, profileSearch]);

    // Validation for Destination URL
    const isUrlValid = React.useMemo(() => {
        if (!url.trim()) return true;
        // Internal Relative path validation (must start with / and not have external links)
        return url.startsWith('/') && !url.includes('://') && !url.includes('www.');
    }, [url]);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Basic Validations
        if (!title.trim()) {
            toast.error('Notification title is required');
            return;
        }
        if (!body.trim()) {
            toast.error('Notification body/message is required');
            return;
        }
        if (title.length > 50) {
            toast.error('Title must be 50 characters or less');
            return;
        }
        if (body.length > 150) {
            toast.error('Body must be 150 characters or less');
            return;
        }
        if (!isUrlValid) {
            toast.error('Destination URL must be an internal relative path starting with /');
            return;
        }
        if (audience === 'user' && !selectedProfile) {
            toast.error('Please select a target customer');
            return;
        }

        if (audience === 'all') {
            // Confirm before mass broadcast
            setIsConfirmOpen(true);
        } else {
            // Send directly for individual customer targeting
            executeSend();
        }
    };

    const executeSend = () => {
        setIsConfirmOpen(false);
        sendMutation.mutate({
            title: title.trim(),
            body: body.trim(),
            url: url.trim() || undefined,
            audience,
            targetUserId: audience === 'user' ? selectedProfile?.id : undefined
        });
    };

    // Pagination Logic for History
    const totalPages = Math.ceil(history.length / itemsPerPage);
    const paginatedHistory = React.useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return history.slice(start, start + itemsPerPage);
    }, [history, currentPage]);

    // Global Stats Aggregation
    const stats = React.useMemo(() => {
        const totalSent = history.reduce((acc, curr) => acc + curr.sentCount, 0);
        const totalFailed = history.reduce((acc, curr) => acc + curr.failedCount, 0);
        return {
            broadcastsCount: history.length,
            totalSent,
            totalFailed
        };
    }, [history]);

    // Lookup customer name for target user IDs
    const getCustomerDisplayName = (targetUserId: string | null) => {
        if (!targetUserId) return 'N/A';
        const profile = profiles.find(p => p.id === targetUserId);
        if (profile) {
            return profile.fullName || profile.email || 'Online User';
        }
        // Fallback placeholder if profile list is not loaded/enabled
        return 'Target Customer';
    };

    return (
        <div className="space-y-4 max-w-7xl mx-auto px-4 py-2">
            {/* Header section */}
            <div className="flex items-center justify-between border-b border-gold/15 pb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-maroon/5 rounded-md border border-gold/20">
                        <Bell className="h-4.5 w-4.5 text-maroon" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black font-serif text-maroon tracking-wider uppercase">Push Broadcast Center</h1>
                        <p className="text-[10px] text-gray-500 font-sans mt-0.5">Design, test, and dispatch real-time web notifications to subscribed customers</p>
                    </div>
                </div>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-gold/15 shadow-none bg-white p-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                        <span className="text-[7.5px] uppercase font-bold text-gray-400 block">Subscribed Devices</span>
                        {isLoadingSubscribers ? (
                            <Loader2 className="h-4 w-4 animate-spin text-maroon mt-1" />
                        ) : (
                            <span className="text-sm font-black font-mono text-maroon mt-0.5 block">{subscriberCount} active</span>
                        )}
                    </div>
                    <div className="p-1.5 bg-maroon/5 rounded border border-gold/15">
                        <Smartphone className="h-4 w-4 text-maroon" />
                    </div>
                </Card>

                <Card className="border-gold/15 shadow-none bg-white p-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                        <span className="text-[7.5px] uppercase font-bold text-gray-400 block">Notification History</span>
                        <span className="text-sm font-black font-mono text-maroon mt-0.5 block">{stats.broadcastsCount} runs</span>
                    </div>
                    <div className="p-1.5 bg-maroon/5 rounded border border-gold/15">
                        <History className="h-4 w-4 text-maroon" />
                    </div>
                </Card>

                <Card className="border-gold/15 shadow-none bg-white p-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                        <span className="text-[7.5px] uppercase font-bold text-gray-400 block">Total Messages Sent</span>
                        <span className="text-sm font-black font-mono text-emerald-700 mt-0.5 block">{stats.totalSent} success</span>
                    </div>
                    <div className="p-1.5 bg-emerald-50 rounded border border-emerald-25">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                </Card>

                <Card className="border-gold/15 shadow-none bg-white p-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                        <span className="text-[7.5px] uppercase font-bold text-gray-400 block">Stale / Failed Deliveries</span>
                        <span className="text-sm font-black font-mono text-rose-700 mt-0.5 block">{stats.totalFailed} errors</span>
                    </div>
                    <div className="p-1.5 bg-rose-50 rounded border border-rose-25">
                        <AlertCircle className="h-4 w-4 text-rose-600" />
                    </div>
                </Card>
            </div>

            {/* Main Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* LEFT: Notification Composer (col-span-5) */}
                <Card className="lg:col-span-5 border-gold/15 bg-white shadow-sm overflow-hidden">
                    <CardHeader className="bg-cream/10 border-b border-gold/10 p-3">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-maroon font-serif flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-maroon" />
                            Compose Notification
                        </CardTitle>
                        <CardDescription className="text-[8px] text-gray-400">Design marketing templates or targeting messages</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3">
                        <form onSubmit={handleFormSubmit} className="space-y-3.5">
                            {/* Title Field */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="text-[8.5px] font-bold text-gray-500 uppercase tracking-wide">Notification Title *</label>
                                    <span className={`text-[8px] font-mono ${title.length > 50 ? 'text-rose-600' : 'text-gray-400'}`}>
                                        {title.length}/50
                                    </span>
                                </div>
                                <Input
                                    required
                                    maxLength={60}
                                    placeholder="e.g., Festival Special Sale is Live! 🪔"
                                    className="h-8 text-xs border-gold/30 focus-visible:ring-maroon bg-white"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    disabled={sendMutation.isPending}
                                />
                            </div>

                            {/* Message Body Field */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="text-[8.5px] font-bold text-gray-500 uppercase tracking-wide">Message Body *</label>
                                    <span className={`text-[8px] font-mono ${body.length > 150 ? 'text-rose-600' : 'text-gray-400'}`}>
                                        {body.length}/150
                                    </span>
                                </div>
                                <Textarea
                                    required
                                    maxLength={200}
                                    placeholder="Enter premium copy describing offers or store announcements..."
                                    className="text-xs border-gold/30 focus-visible:ring-maroon bg-white min-h-[70px] resize-none"
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    disabled={sendMutation.isPending}
                                />
                            </div>

                            {/* Relative URL Destination Link */}
                            <div className="space-y-1">
                                <label className="text-[8.5px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                    Destination URL
                                    <span className="text-[7.5px] text-gray-400 lowercase italic">(Relative internal path)</span>
                                </label>
                                <Input
                                    placeholder="e.g., /category/silk-sarees"
                                    className={`h-8 text-xs bg-white focus-visible:ring-maroon ${
                                        !isUrlValid ? 'border-rose-500 focus-visible:ring-rose-500' : 'border-gold/30'
                                    }`}
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    disabled={sendMutation.isPending}
                                />
                                {!isUrlValid ? (
                                    <p className="text-[7.5px] text-rose-600 font-sans">
                                        Must start with "/" and cannot contain external links (like http:// or www.)
                                    </p>
                                ) : (
                                    <p className="text-[7.5px] text-gray-400 font-sans">
                                        Directs the user to a specific storefront layout when clicked (e.g. /products/kora-saree)
                                    </p>
                                )}
                            </div>

                            {/* Audience Selection */}
                            <div className="space-y-1.5">
                                <label className="text-[8.5px] font-bold text-gray-500 uppercase tracking-wide">Audience Segment</label>
                                <div className="flex border border-gold/25 rounded-md overflow-hidden text-[9px] font-bold uppercase tracking-wider bg-white">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAudience('all');
                                            setSelectedProfile(null);
                                            setProfileSearch('');
                                        }}
                                        className={`flex-1 py-1.5 text-center border-r border-gold/15 transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                            audience === 'all'
                                                ? 'bg-maroon text-gold'
                                                : 'text-gray-505 hover:bg-cream/5'
                                        }`}
                                        disabled={sendMutation.isPending}
                                    >
                                        <Users className="h-3 w-3" />
                                        All Customers
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAudience('user')}
                                        className={`flex-1 py-1.5 text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                            audience === 'user'
                                                ? 'bg-maroon text-gold'
                                                : 'text-gray-505 hover:bg-cream/5'
                                        }`}
                                        disabled={sendMutation.isPending}
                                    >
                                        <User className="h-3 w-3" />
                                        Specific Customer
                                    </button>
                                </div>
                            </div>

                            {/* Customer Search Panel (Target single profile) */}
                            {audience === 'user' && (
                                <div className="space-y-1.5 relative border border-gold/15 p-2 bg-cream/3 rounded-md">
                                    <label className="text-[8px] font-bold text-gray-500 uppercase">Search Customer Directory</label>
                                    
                                    {selectedProfile ? (
                                        <div className="flex items-center justify-between p-1.5 bg-emerald-50/50 border border-emerald-100 rounded text-xs">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-gray-800 truncate text-[10px]">
                                                    {selectedProfile.fullName || 'Online User'}
                                                </p>
                                                <p className="text-[8.5px] text-gray-500 truncate font-mono">
                                                    {selectedProfile.email || 'No email registered'}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                className="h-5 text-[8.5px] text-rose-700 hover:bg-rose-100 px-1.5 uppercase font-bold"
                                                onClick={() => {
                                                    setSelectedProfile(null);
                                                    setProfileSearch('');
                                                }}
                                            >
                                                Change
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                                            <Input
                                                placeholder="Search customer name, email..."
                                                className="pl-7 h-7 text-[10px] border-gold/20 focus-visible:ring-maroon bg-white"
                                                value={profileSearch}
                                                onChange={(e) => setProfileSearch(e.target.value)}
                                                onFocus={() => setIsSearchFocused(true)}
                                                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                            />
                                            {isSearchFocused && (
                                                <div className="absolute z-10 w-full left-0 mt-1 bg-white border border-gold/15 rounded shadow-lg max-h-32 overflow-y-auto divide-y divide-gray-100">
                                                    {isLoadingProfiles ? (
                                                        <div className="p-2 text-center text-[9px] text-gray-400 italic">
                                                            Loading online profiles...
                                                        </div>
                                                    ) : filteredProfiles.length === 0 ? (
                                                        <div className="p-2 text-center text-[9px] text-gray-400 italic">
                                                            No profiles found
                                                        </div>
                                                    ) : (
                                                        filteredProfiles.map((p) => (
                                                            <div
                                                                key={p.id}
                                                                className="p-1.5 text-[9px] hover:bg-cream/5 cursor-pointer text-left"
                                                                onMouseDown={() => setSelectedProfile(p)}
                                                            >
                                                                <p className="font-bold text-gray-800">{p.fullName || 'Online User'}</p>
                                                                <p className="text-gray-400 font-mono">{p.email || 'No email'}</p>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="w-full bg-maroon hover:bg-maroon-dark text-gold font-bold h-8 text-xs mt-2 uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
                                disabled={sendMutation.isPending || !isUrlValid || (audience === 'user' && !selectedProfile)}
                            >
                                {sendMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Dispatching...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-3.5 w-3.5" />
                                        {audience === 'all' ? 'Broadcast to Subscribed Users' : 'Send Target Message'}
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* RIGHT: History Log Table (col-span-7) */}
                <Card className="lg:col-span-7 border-gold/15 bg-white shadow-sm overflow-hidden">
                    <CardHeader className="bg-cream/10 border-b border-gold/10 p-3">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-maroon font-serif flex items-center gap-1.5">
                            <History className="h-3.5 w-3.5 text-maroon" />
                            Dispatch Ledger
                        </CardTitle>
                        <CardDescription className="text-[8px] text-gray-400">Complete audit log of push broadcasts and targeted alerts</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoadingHistory ? (
                            <div className="py-20 text-center text-maroon/50 text-xs italic">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-1 text-maroon" />
                                Loading broadcast records...
                            </div>
                        ) : history.length === 0 ? (
                            <div className="py-16 text-center">
                                <ShieldAlert className="h-7 w-7 mx-auto text-gray-450 mb-1.5" />
                                <p className="text-[10px] text-gray-450 italic">No notifications dispatched yet</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-cream/5">
                                        <TableRow className="border-b border-gold/10">
                                            <TableHead className="text-[8px] font-bold text-maroon py-1.5 uppercase">Timestamp</TableHead>
                                            <TableHead className="text-[8px] font-bold text-maroon py-1.5 uppercase">Details</TableHead>
                                            <TableHead className="text-[8px] font-bold text-maroon py-1.5 uppercase">Audience</TableHead>
                                            <TableHead className="text-[8px] font-bold text-maroon py-1.5 uppercase text-right">Delivery Metrics</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedHistory.map((item) => (
                                            <TableRow key={item.id} className="hover:bg-cream/3 border-b border-gold/5 h-10">
                                                {/* Date & Time */}
                                                <TableCell className="py-1.5 text-[9px] font-mono text-gray-500 whitespace-nowrap">
                                                    <div>{new Date(item.createdAt).toLocaleDateString()}</div>
                                                    <div className="text-[7.5px] text-gray-400 mt-0.5">
                                                        {new Date(item.createdAt).toLocaleTimeString()}
                                                    </div>
                                                </TableCell>

                                                {/* Title & Body */}
                                                <TableCell className="py-1.5 align-top min-w-[150px]">
                                                    <div className="font-bold text-[9.5px] text-gray-800 line-clamp-1">
                                                        {item.title}
                                                    </div>
                                                    <p className="text-[8.5px] text-gray-500 line-clamp-1 mt-0.5" title={item.body}>
                                                        {item.body}
                                                    </p>
                                                    {item.url && (
                                                        <span className="text-[7px] font-mono text-amber-800 bg-gold/10 px-1 py-0.2 rounded mt-1 inline-block">
                                                            {item.url}
                                                        </span>
                                                    )}
                                                </TableCell>

                                                {/* Audience Badge */}
                                                <TableCell className="py-1.5 align-top">
                                                    {item.audience === 'all' ? (
                                                        <span className="inline-flex px-1 py-0.2 rounded text-[7px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-100">
                                                            All Customers
                                                        </span>
                                                    ) : (
                                                        <div className="space-y-0.5">
                                                            <span className="inline-flex px-1 py-0.2 rounded text-[7px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                                                                Target Single
                                                            </span>
                                                            <span className="block text-[7.5px] text-gray-500 max-w-[100px] truncate" title={getCustomerDisplayName(item.targetUserId)}>
                                                                {getCustomerDisplayName(item.targetUserId)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </TableCell>

                                                {/* Delivery counts */}
                                                <TableCell className="py-1.5 text-right font-mono align-top">
                                                    <div className="text-[9.5px] text-emerald-700 font-bold flex items-center justify-end gap-1">
                                                        <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block"></span>
                                                        {item.sentCount} sent
                                                    </div>
                                                    {item.failedCount > 0 && (
                                                        <div className="text-[8.5px] text-rose-600 mt-0.5 flex items-center justify-end gap-1">
                                                            <span className="w-1 h-1 rounded-full bg-rose-500 inline-block"></span>
                                                            {item.failedCount} failed
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between px-3 py-2 border-t border-gold/10 bg-cream/5">
                                        <p className="text-[8.5px] text-gray-500">
                                            Showing <span className="font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-bold">{Math.min(currentPage * itemsPerPage, history.length)}</span> of <span className="font-bold">{history.length}</span> entries
                                        </p>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-gold/20 text-maroon h-6 w-6 p-0 hover:bg-cream/10 cursor-pointer"
                                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={currentPage === 1}
                                            >
                                                <ChevronLeft className="h-3 w-3" />
                                            </Button>
                                            <span className="text-[8.5px] font-mono text-gray-600 px-2">Page {currentPage} of {totalPages}</span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-gold/20 text-maroon h-6 w-6 p-0 hover:bg-cream/10 cursor-pointer"
                                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                disabled={currentPage === totalPages}
                                            >
                                                <ChevronRight className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Confirmation Dialog for Broadcast */}
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent className="border-gold/20 max-w-sm">
                    <DialogHeader className="border-b border-gold/10 pb-2 flex flex-row items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-maroon flex-shrink-0" />
                        <DialogTitle className="text-xs font-bold uppercase tracking-wider text-maroon font-serif">Confirm Mass Broadcast</DialogTitle>
                    </DialogHeader>
                    <DialogDescription className="text-[10px] text-gray-500 pt-2 leading-relaxed">
                        You are about to send this push notification to <span className="font-bold text-maroon font-mono">{subscriberCount}</span> active subscribed customer devices.
                        <br />
                        <br />
                        <span className="font-semibold text-gray-700">Notification Preview:</span>
                        <div className="border border-gold/15 p-2 rounded bg-cream/3 mt-1.5 font-sans">
                            <p className="font-bold text-gray-800 text-[10px]">{title}</p>
                            <p className="text-[9px] text-gray-600 mt-0.5">{body}</p>
                            {url && <p className="text-[8px] text-amber-800 font-mono mt-1">{url}</p>}
                        </div>
                        <br />
                        This action cannot be undone. Please confirm you would like to proceed with the broadcast.
                    </DialogDescription>
                    <DialogFooter className="mt-3 gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            className="h-7 text-[9px] border-gold/30 text-gray-600 uppercase font-bold px-3 cursor-pointer"
                            onClick={() => setIsConfirmOpen(false)}
                            disabled={sendMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="h-7 text-[9px] bg-maroon hover:bg-maroon-dark text-gold uppercase font-bold px-4 cursor-pointer"
                            onClick={executeSend}
                            disabled={sendMutation.isPending}
                        >
                            {sendMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Proceed & Broadcast
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
