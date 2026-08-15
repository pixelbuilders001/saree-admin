import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storefrontService, type ProductReview } from '@/services/storefrontService';
import {
    MessageSquare,
    Star,
    Check,
    X,
    Trash2,
    Loader2,
    Filter,
    ShieldAlert,
    Clock,
    ShoppingBag,
    Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

export default function ReviewsPage() {
    const queryClient = useQueryClient();

    // Filters state
    const [statusFilter, setStatusFilter] = React.useState<string>('all');
    const [ratingFilter, setRatingFilter] = React.useState<string>('all');

    // Fetch Reviews
    const { data: reviews, isLoading } = useQuery({
        queryKey: ['reviews'],
        queryFn: storefrontService.getReviews
    });

    // Mutations
    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' | 'pending' }) =>
            storefrontService.updateReviewStatus(id, status),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['reviews'] });
            toast.success(`Review successfully ${variables.status === 'approved' ? 'approved' : variables.status === 'rejected' ? 'rejected' : 'set to pending'}`);
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to update review status');
        }
    });

    const deleteReviewMutation = useMutation({
        mutationFn: storefrontService.deleteReview,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reviews'] });
            toast.success('Review deleted successfully');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to delete review');
        }
    });

    const handleDeleteReview = (id: string) => {
        if (confirm('Are you sure you want to permanently delete this review? This action cannot be undone.')) {
            deleteReviewMutation.mutate(id);
        }
    };

    // Calculate Stats
    const stats = React.useMemo(() => {
        if (!reviews) return { total: 0, pending: 0, approved: 0, average: 0 };
        const total = reviews.length;
        const pending = reviews.filter(r => r.status === 'pending').length;
        const approved = reviews.filter(r => r.status === 'approved').length;
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        const average = total > 0 ? Number((sum / total).toFixed(1)) : 0;
        return { total, pending, approved, average };
    }, [reviews]);

    // Filtered Reviews
    const filteredReviews = React.useMemo(() => {
        if (!reviews) return [];
        return reviews.filter(r => {
            const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
            const matchesRating = ratingFilter === 'all' || r.rating.toString() === ratingFilter;
            return matchesStatus && matchesRating;
        });
    }, [reviews, statusFilter, ratingFilter]);

    // Render stars helper
    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`h-3 w-3 ${
                            star <= rating
                                ? 'fill-gold text-gold'
                                : 'text-gray-200'
                        }`}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-4 max-w-7xl mx-auto px-2">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gold/10 pb-3 gap-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-maroon/10 text-maroon rounded">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold font-serif text-maroon tracking-wider">PRODUCT REVIEWS</h1>
                        <p className="text-xs text-gray-500 font-sans">Moderate customer feedback, verify purchases, and approve storefront ratings</p>
                    </div>
                </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Card className="border-gold/10 shadow-sm bg-white">
                    <CardContent className="p-3 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Reviews</span>
                            <h2 className="text-lg font-bold text-gray-900 font-mono">{stats.total}</h2>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-full">
                            <MessageSquare className="h-4 w-4 text-gray-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-gold/15 shadow-sm bg-white">
                    <CardContent className="p-3 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Pending Moderate</span>
                            <h2 className="text-lg font-bold text-amber-600 font-mono">{stats.pending}</h2>
                        </div>
                        <div className="p-2 bg-amber-50 rounded-full">
                            <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-gold/10 shadow-sm bg-white">
                    <CardContent className="p-3 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Approved Reviews</span>
                            <h2 className="text-lg font-bold text-emerald-600 font-mono">{stats.approved}</h2>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded-full">
                            <Check className="h-4 w-4 text-emerald-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-gold/15 shadow-sm bg-white">
                    <CardContent className="p-3 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <span className="text-[10px] text-gold font-bold uppercase tracking-wider">Average Rating</span>
                            <div className="flex items-center gap-1.5">
                                <h2 className="text-lg font-bold text-maroon font-mono">{stats.average}</h2>
                                <span className="text-[10px] text-gray-400">/ 5.0</span>
                            </div>
                        </div>
                        <div className="p-2 bg-gold/10 rounded-full">
                            <Star className="h-4 w-4 text-gold fill-gold" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Bar */}
            <Card className="border-gold/10 shadow-sm bg-slate-50/50">
                <CardContent className="p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Filter className="h-3.5 w-3.5 text-maroon/60" />
                        <span className="text-xs font-bold text-maroon uppercase tracking-wider">Filter Dashboard</span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                        {/* Status Select */}
                        <div className="w-full sm:w-40">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-8 text-xs bg-white border-gold/20 text-gray-700">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Rating Select */}
                        <div className="w-full sm:w-40">
                            <Select value={ratingFilter} onValueChange={setRatingFilter}>
                                <SelectTrigger className="h-8 text-xs bg-white border-gold/20 text-gray-700">
                                    <SelectValue placeholder="All Ratings" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Ratings</SelectItem>
                                    <SelectItem value="5">5 Stars</SelectItem>
                                    <SelectItem value="4">4 Stars</SelectItem>
                                    <SelectItem value="3">3 Stars</SelectItem>
                                    <SelectItem value="2">2 Stars</SelectItem>
                                    <SelectItem value="1">1 Star</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Reviews List / Table */}
            <Card className="border-gold/10 shadow-sm bg-white overflow-hidden">
                {isLoading ? (
                    <div className="py-24 text-center text-maroon/50 text-xs italic">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-maroon" />
                        Fetching product reviews...
                    </div>
                ) : filteredReviews.length === 0 ? (
                    <div className="py-16 text-center">
                        <ShieldAlert className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-xs text-gray-500 italic">No reviews found matching the filters</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow className="border-b border-gold/10">
                                    <TableHead className="w-[180px] text-xs font-bold text-maroon uppercase tracking-wider">Reviewer</TableHead>
                                    <TableHead className="w-[180px] text-xs font-bold text-maroon uppercase tracking-wider">Product</TableHead>
                                    <TableHead className="w-[100px] text-xs font-bold text-maroon uppercase tracking-wider">Rating</TableHead>
                                    <TableHead className="text-xs font-bold text-maroon uppercase tracking-wider">Review Details</TableHead>
                                    <TableHead className="w-[110px] text-xs font-bold text-maroon uppercase tracking-wider">Status</TableHead>
                                    <TableHead className="w-[120px] text-right text-xs font-bold text-maroon uppercase tracking-wider">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredReviews.map((rev) => (
                                    <TableRow key={rev.id} className="border-b border-gold/5 hover:bg-slate-50/50">
                                        {/* Reviewer */}
                                        <TableCell className="align-top py-3">
                                            <div className="font-semibold text-xs text-gray-800 truncate" title={rev.customerName}>
                                                {rev.customerName}
                                            </div>
                                            <div className="text-[10px] text-gray-500 truncate" title={rev.customerEmail}>
                                                {rev.customerEmail}
                                            </div>
                                        </TableCell>

                                        {/* Product */}
                                        <TableCell className="align-top py-3">
                                            <div className="font-semibold text-xs text-gray-800 truncate" title={rev.productName}>
                                                {rev.productName}
                                            </div>
                                            <div className="text-[9px] text-gray-400 font-mono uppercase">
                                                SKU: {rev.productSku || 'N/A'}
                                            </div>
                                        </TableCell>

                                        {/* Rating */}
                                        <TableCell className="align-top py-3">
                                            {renderStars(rev.rating)}
                                            <div className="text-[9px] text-gray-400 mt-1 font-mono">
                                                {new Date(rev.createdAt).toLocaleDateString()}
                                            </div>
                                        </TableCell>

                                        {/* Review Details */}
                                        <TableCell className="align-top py-3 space-y-1">
                                            <div className="flex items-center gap-2">
                                                {rev.title && <span className="font-bold text-xs text-gray-800">{rev.title}</span>}
                                                {rev.isVerifiedPurchase && (
                                                    <span className="inline-flex items-center gap-0.5 text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 py-0.2 rounded font-bold uppercase tracking-wide">
                                                        <Award className="h-2 w-2" /> Verified
                                                    </span>
                                                )}
                                            </div>
                                            {rev.reviewText ? (
                                                <p className="text-xs text-gray-600 leading-relaxed max-w-xl whitespace-pre-line">{rev.reviewText}</p>
                                            ) : (
                                                <p className="text-xs text-gray-400 italic">No review text provided</p>
                                            )}
                                        </TableCell>

                                        {/* Status badge */}
                                        <TableCell className="align-top py-3">
                                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                                rev.status === 'approved'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : rev.status === 'rejected'
                                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                                {rev.status}
                                            </span>
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell className="align-top py-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {rev.status !== 'approved' && (
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() => updateStatusMutation.mutate({ id: rev.id, status: 'approved' })}
                                                        disabled={updateStatusMutation.isPending}
                                                        className="h-7 w-7 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                                        title="Approve Review"
                                                    >
                                                        <Check className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}

                                                {rev.status !== 'rejected' && (
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() => updateStatusMutation.mutate({ id: rev.id, status: 'rejected' })}
                                                        disabled={updateStatusMutation.isPending}
                                                        className="h-7 w-7 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                                        title="Reject Review"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}

                                                <Button
                                                    size="icon"
                                                    variant="outline"
                                                    onClick={() => handleDeleteReview(rev.id)}
                                                    disabled={deleteReviewMutation.isPending}
                                                    className="h-7 w-7 border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                                    title="Delete Review"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>
        </div>
    );
}
