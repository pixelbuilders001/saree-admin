import React from 'react';
import { Eye, AlertCircle, Package } from 'lucide-react';
import type { PreviewProduct } from '@/services/collectionService';

interface CollectionPreviewProps {
    products: PreviewProduct[];
    loading?: boolean;
    error?: string | null;
    title?: string;
}

export const CollectionPreview: React.FC<CollectionPreviewProps> = ({
    products,
    loading = false,
    error = null,
    title = 'Collection Live Preview',
}) => {
    return (
        <div className="border border-gold/25 rounded-xl bg-gradient-to-b from-cream/20 to-white p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-gold/15 mb-3">
                <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-maroon" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 font-serif">
                        {title}
                    </h4>
                </div>
                <div>
                    {!loading && !error && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {products.length} {products.length === 1 ? 'product' : 'products'} matched
                        </span>
                    )}
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700 mb-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>Failed to evaluate preview: {error}</span>
                </div>
            )}

            {loading ? (
                /* Skeleton loader for products */
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                        <div key={n} className="border border-gold/15 rounded-lg p-2 bg-white animate-pulse space-y-2">
                            <div className="w-full aspect-[3/4] bg-gray-200 rounded-md" />
                            <div className="h-3 bg-gray-200 rounded w-4/5" />
                            <div className="h-2.5 bg-gray-200 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-6 px-4 bg-cream/10 rounded-lg border border-dashed border-gold/20">
                    <Package className="h-8 w-8 text-gray-300 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-gray-600">No products match this configuration</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                        Adjust conditions, check inventory stock, or search for items to add.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-80 overflow-y-auto pr-1">
                    {products.map((item) => (
                        <div
                            key={item.id}
                            className="group border border-gold/15 rounded-lg overflow-hidden bg-white hover:shadow-md transition-all flex flex-col"
                        >
                            {/* Image */}
                            <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                                {item.imageUrl ? (
                                    <img
                                        src={item.imageUrl}
                                        alt={item.sareeName}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        onError={(e) => {
                                            (e.target as HTMLElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <Package className="h-6 w-6" />
                                    </div>
                                )}
                                {item.discountPercentage && item.discountPercentage > 0 ? (
                                    <span className="absolute top-1 left-1 text-[8.5px] font-extrabold bg-maroon text-gold px-1.5 py-0.5 rounded shadow-sm">
                                        {item.discountPercentage}% OFF
                                    </span>
                                ) : null}
                                <span className={`absolute bottom-1 right-1 text-[8px] font-bold px-1 py-0.2 rounded shadow-sm ${
                                    item.stock > 0 ? 'bg-emerald-600/90 text-white' : 'bg-red-600/90 text-white'
                                }`}>
                                    {item.stock > 0 ? `Stock: ${item.stock}` : 'Out of Stock'}
                                </span>
                            </div>

                            {/* Details */}
                            <div className="p-2 flex flex-col flex-1 justify-between gap-1">
                                <div>
                                    <p className="text-[11px] font-semibold text-gray-800 line-clamp-1 group-hover:text-maroon transition-colors" title={item.sareeName}>
                                        {item.sareeName}
                                    </p>
                                    <p className="text-[9.5px] text-gray-400 capitalize truncate">
                                        {item.fabric || item.category || 'Banarasi'}
                                    </p>
                                </div>
                                <div className="flex items-baseline justify-between pt-1 border-t border-gold/10">
                                    <span className="text-xs font-bold text-maroon font-serif">
                                        ₹{item.sellingPrice.toLocaleString('en-IN')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
