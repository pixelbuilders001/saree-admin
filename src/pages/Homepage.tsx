import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, Sparkles, Layers, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { homepageSectionService } from '@/services/homepageSectionService';
import { collectionService } from '@/services/collectionService';
import { HomepageSectionsList } from '@/components/homepage/HomepageSectionsList';
import { CollectionsList } from '@/components/homepage/CollectionsList';
import { SectionModal } from '@/components/homepage/SectionModal';
import { CollectionModal } from '@/components/homepage/CollectionModal';
import type { HomepageSection, Collection } from '@/types/homepage';

export default function HomepagePage() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'sections' | 'collections'>('sections');

    // Section modal state
    const [sectionModalOpen, setSectionModalOpen] = useState(false);
    const [sectionToEdit, setSectionToEdit] = useState<HomepageSection | null>(null);

    // Collection modal state
    const [collectionModalOpen, setCollectionModalOpen] = useState(false);
    const [collectionToEdit, setCollectionToEdit] = useState<Collection | null>(null);

    // Fetch Sections
    const {
        data: sections = [],
        isLoading: sectionsLoading,
        isError: sectionsError,
        error: sectionsErr,
        refetch: refetchSections,
    } = useQuery({
        queryKey: ['homepage_sections'],
        queryFn: homepageSectionService.getHomepageSections,
    });

    // Fetch Collections
    const {
        data: collections = [],
        isLoading: collectionsLoading,
        isError: collectionsError,
        error: collectionsErr,
        refetch: refetchCollections,
    } = useQuery({
        queryKey: ['collections'],
        queryFn: collectionService.getCollections,
    });

    const handleOpenCreateSection = () => {
        setSectionToEdit(null);
        setSectionModalOpen(true);
    };

    const handleOpenEditSection = (section: HomepageSection) => {
        setSectionToEdit(section);
        setSectionModalOpen(true);
    };

    const handleOpenCreateCollection = () => {
        setCollectionToEdit(null);
        setCollectionModalOpen(true);
    };

    const handleOpenEditCollection = (col: Collection) => {
        setCollectionToEdit(col);
        setCollectionModalOpen(true);
    };

    const handleRefreshAll = () => {
        refetchSections();
        refetchCollections();
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gold/20 pb-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-maroon text-gold rounded-lg shadow-sm">
                            <LayoutGrid className="h-5 w-5" />
                        </div>
                        <h1 className="text-xl font-black font-serif text-maroon tracking-wider">
                            HOMEPAGE MANAGEMENT
                        </h1>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Control storefront layout, arrange section order, schedule promotions, and curate smart saree collections.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshAll}
                        className="text-xs border-gold/30 hover:bg-cream/40 text-gray-700"
                        title="Refresh data"
                    >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Refresh
                    </Button>

                    {activeTab === 'sections' ? (
                        <Button
                            onClick={handleOpenCreateSection}
                            size="sm"
                            className="text-xs bg-maroon hover:bg-maroon-dark text-gold font-bold shadow-sm"
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add Section
                        </Button>
                    ) : (
                        <Button
                            onClick={handleOpenCreateCollection}
                            size="sm"
                            className="text-xs bg-maroon hover:bg-maroon-dark text-gold font-bold shadow-sm"
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Create Collection
                        </Button>
                    )}
                </div>
            </div>

            {/* Error alerts if any */}
            {(sectionsError || collectionsError) && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-xs text-red-700">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <div>
                        <p className="font-bold">Failed to load homepage data</p>
                        <p className="text-[11px] text-red-600 mt-0.5">
                            {sectionsErr instanceof Error
                                ? sectionsErr.message
                                : collectionsErr instanceof Error
                                ? collectionsErr.message
                                : 'Database error'}
                        </p>
                    </div>
                </div>
            )}

            {/* View Navigation Tabs */}
            <div className="flex items-center border-b border-gold/20 gap-2">
                <button
                    type="button"
                    onClick={() => setActiveTab('sections')}
                    className={`flex items-center gap-2 py-2.5 px-4 font-bold text-xs uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                        activeTab === 'sections'
                            ? 'border-maroon text-maroon bg-cream/20 rounded-t-lg'
                            : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                >
                    <Layers className="h-4 w-4" />
                    <span>Homepage Sections</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {sections.length}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('collections')}
                    className={`flex items-center gap-2 py-2.5 px-4 font-bold text-xs uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                        activeTab === 'collections'
                            ? 'border-maroon text-maroon bg-cream/20 rounded-t-lg'
                            : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                >
                    <Sparkles className="h-4 w-4" />
                    <span>Collections</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {collections.length}
                    </span>
                </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'sections' ? (
                <HomepageSectionsList
                    sections={sections}
                    loading={sectionsLoading}
                    onEdit={handleOpenEditSection}
                    onCreate={handleOpenCreateSection}
                    onRefresh={() => queryClient.invalidateQueries({ queryKey: ['homepage_sections'] })}
                />
            ) : (
                <CollectionsList
                    collections={collections}
                    loading={collectionsLoading}
                    onEdit={handleOpenEditCollection}
                    onCreate={handleOpenCreateCollection}
                    onRefresh={() => {
                        queryClient.invalidateQueries({ queryKey: ['collections'] });
                        queryClient.invalidateQueries({ queryKey: ['homepage_sections'] });
                    }}
                />
            )}

            {/* Add / Edit Section Modal */}
            <SectionModal
                open={sectionModalOpen}
                onOpenChange={setSectionModalOpen}
                sectionToEdit={sectionToEdit}
                collections={collections}
                onSaved={() => {
                    queryClient.invalidateQueries({ queryKey: ['homepage_sections'] });
                }}
            />

            {/* Add / Edit Collection Modal */}
            <CollectionModal
                open={collectionModalOpen}
                onOpenChange={setCollectionModalOpen}
                collectionToEdit={collectionToEdit}
                onSaved={() => {
                    queryClient.invalidateQueries({ queryKey: ['collections'] });
                    queryClient.invalidateQueries({ queryKey: ['homepage_sections'] });
                }}
            />
        </div>
    );
}
