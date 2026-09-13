export type RuleOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';

export type ProductRuleField =
    | 'category'
    | 'occasion'
    | 'selling_price'
    | 'stock'
    | 'fabric'
    | 'color'
    | 'status'
    | 'discount_percentage';

export interface CollectionRule {
    id: string;
    field: ProductRuleField;
    operator: RuleOperator;
    value: string | number;
}

export type CollectionType = 'automatic' | 'manual';

export interface Collection {
    id: string;
    name: string;
    description: string | null;
    collectionType: CollectionType;
    rules: CollectionRule[];
    sortBy: string;
    productLimit: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    productCount?: number;
}

export interface CollectionProductItem {
    collectionId: string;
    productId: string;
    sortOrder: number;
    createdAt?: string;
    product?: {
        id: string;
        sareeName: string;
        sellingPrice: number;
        stock: number;
        category: string;
        fabric?: string;
        color?: string;
        imageUrl?: string;
    };
}

export type HomepageDisplayStyle =
    | 'banner'
    | 'grid'
    | 'carousel'
    | 'featured'
    | 'category_cards'
    | 'split_feature'
    | 'pinterest_grid'
    | 'offer_timer'
    | 'image_banner';

export interface HomepageSection {
    id: string;
    title: string;
    subtitle: string | null;
    collectionId: string;
    displayStyle: HomepageDisplayStyle | string;
    imageUrl?: string | null;
    viewAllText: string | null;
    viewAllUrl: string | null;
    startAt: string | null;
    endAt: string | null;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
    collection?: {
        id: string;
        name: string;
        collectionType: CollectionType;
    } | null;
}

export const RULE_FIELD_CONFIG: Record<
    ProductRuleField,
    {
        label: string;
        type: 'text' | 'number' | 'select';
        operators: { label: string; value: RuleOperator }[];
        options?: string[];
    }
> = {
    selling_price: {
        label: 'Selling Price (₹)',
        type: 'number',
        operators: [
            { label: '<= Less than or equal', value: 'lte' },
            { label: '< Less than', value: 'lt' },
            { label: '>= Greater than or equal', value: 'gte' },
            { label: '> Greater than', value: 'gt' },
            { label: '= Equals', value: 'eq' },
        ],
    },
    stock: {
        label: 'Stock Quantity',
        type: 'number',
        operators: [
            { label: '> Greater than', value: 'gt' },
            { label: '>= Greater than or equal', value: 'gte' },
            { label: '= Equals', value: 'eq' },
            { label: '<= Less than or equal', value: 'lte' },
        ],
    },
    category: {
        label: 'Category',
        type: 'text',
        operators: [
            { label: '= Equals', value: 'eq' },
            { label: '!= Not equals', value: 'neq' },
            { label: 'Contains', value: 'contains' },
        ],
    },
    occasion: {
        label: 'Occasion',
        type: 'text',
        operators: [
            { label: '= Equals', value: 'eq' },
            { label: '!= Not equals', value: 'neq' },
            { label: 'Contains', value: 'contains' },
        ],
    },
    fabric: {
        label: 'Fabric',
        type: 'text',
        operators: [
            { label: '= Equals', value: 'eq' },
            { label: '!= Not equals', value: 'neq' },
            { label: 'Contains', value: 'contains' },
        ],
    },
    color: {
        label: 'Color',
        type: 'text',
        operators: [
            { label: '= Equals', value: 'eq' },
            { label: '!= Not equals', value: 'neq' },
            { label: 'Contains', value: 'contains' },
        ],
    },
    status: {
        label: 'Product Status',
        type: 'select',
        operators: [
            { label: '= Equals', value: 'eq' },
        ],
        options: ['active', 'inactive'],
    },
    discount_percentage: {
        label: 'Discount Percentage (%)',
        type: 'number',
        operators: [
            { label: '>= Greater than or equal', value: 'gte' },
            { label: '> Greater than', value: 'gt' },
            { label: '= Equals', value: 'eq' },
            { label: '<= Less than or equal', value: 'lte' },
        ],
    },
};

export const SORT_OPTIONS = [
    { label: 'Newest Arrivals', value: 'newest' },
    { label: 'Price: Low to High', value: 'price_low' },
    { label: 'Price: High to Low', value: 'price_high' },
    { label: 'Highest Discount', value: 'discount' },
    { label: 'Oldest First', value: 'oldest' },
];

export interface DisplayStyleOption {
    label: string;
    value: HomepageDisplayStyle;
    description: string;
}

export const DISPLAY_STYLE_OPTIONS: DisplayStyleOption[] = [
    { label: 'Banner', value: 'banner', description: 'Hero or promotional banner showcasing a curated collection' },
    { label: 'Grid', value: 'grid', description: 'Standard responsive product grid layout' },
    { label: 'Carousel', value: 'carousel', description: 'Horizontally scrollable product slider' },
    { label: 'Featured', value: 'featured', description: 'Spotlight highlight for top or seasonal picks' },
    { label: 'Category Cards', value: 'category_cards', description: 'Visual category cards linking to collections' },
    { label: 'Split Feature', value: 'split_feature', description: 'Side-by-side split layout with promotional media and products' },
    { label: 'Pinterest Grid', value: 'pinterest_grid', description: 'Dynamic masonry / Pinterest-style staggered layout' },
    { label: 'Offer Timer', value: 'offer_timer', description: 'Promotional countdown banner with end-date timer and featured products' },
    { label: 'Image Banner', value: 'image_banner', description: 'Clickable standalone banner image linking directly to a destination URL' },
];
