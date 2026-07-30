/**
 * Catalog Types for Product Display
 * These DTOs match the UI requirements and are mapped from database records
 */

export type Topology = 'se' | 'pp';
export type Condition = 'new' | 'like_new' | 'vintage';
export type TubeType = '300B' | '2A3' | 'EL34' | 'KT88' | 'KT66' | '6L6' | 'EL84' | '6V6' | 'Other';

/**
 * Product Card DTO - Used for collection/grid views
 */
export interface ProductCardDTO {
    id: string;
    slug: string;
    name: string;
    priceVnd: number;
    compareAtPriceVnd?: number;
    imageUrl: string;
    // Amp-specific attributes (optional — not every product is an amplifier)
    topology?: Topology;
    tubeType?: TubeType;
    powerWatts?: number;
    recommendedSensitivityMin?: number;
    condition: Condition;
    isInStock: boolean;
    isVintage: boolean;
    isFeatured: boolean;
    // Category & brand
    categoryName?: string;
    categorySlug?: string;
    brandName?: string;
    brandSlug?: string;
}

/**
 * Product Image
 */
export interface ProductImage {
    id: string;
    url: string;
    altText?: string;
    position: number;
    isPrimary: boolean;
}

/**
 * Product Specifications (structured for table rendering)
 */
export interface ProductSpecs {
    frequencyResponse?: string;
    snr?: string;
    thd?: string;
    inputImpedance?: string;
    dimensions?: string;
    weight?: string;
    [key: string]: string | undefined;
}

/**
 * Product Detail DTO - Used for product detail page
 */
export interface ProductDetailDTO extends ProductCardDTO {
    // Category & brand (detail view)
    categoryId?: string;
    categoryPath?: { name: string; slug: string }[]; // ancestors root -> leaf, for breadcrumb
    brandId?: string;
    brandLogoUrl?: string;

    // Additional fields for detail view
    shortDescription?: string;
    description?: string;
    soundCharacter?: string;
    recommendedGenres?: string[];
    matchingNotes?: string;
    conditionNotes?: string;
    originStory?: string;

    // Images
    images: ProductImage[];

    // Specifications
    specs: ProductSpecs;
    taps: string[]; // e.g., ['4Ω', '8Ω', '16Ω']

    // Availability
    stockQuantity: number;
    lowStockThreshold: number;

    // Deposit reservation (if applicable)
    allowDeposit: boolean;
    depositType?: 'percent' | 'fixed';
    depositAmount?: number;
    depositPercentage?: number;
    depositDueHours?: number;
    reservationPolicyNote?: string;

    // Warranty and Returns
    warrantyMonths?: number;
    returnDays?: number;

    // SEO
    metaTitle?: string;
    metaDescription?: string;

    // Timestamps
    createdAt: string;
    publishedAt?: string;
}

/**
 * Product List Filters
 */
export interface ProductFilters {
    topology?: Topology | Topology[];
    tubeType?: TubeType | TubeType[];
    condition?: Condition | Condition[];
    powerMin?: number;
    powerMax?: number;
    priceMin?: number;
    priceMax?: number;
    search?: string;
    isVintage?: boolean;
    isFeatured?: boolean;
    category?: string; // category slug; a top-level slug also matches its subcategories
    brand?: string; // brand slug
}

/**
 * Category (2-level taxonomy: parent -> child)
 */
export interface CategoryDTO {
    id: string;
    slug: string;
    parentId: string | null;
    name: string; // resolved for the active locale
    imageUrl?: string;
    sortOrder: number;
    children?: CategoryDTO[];
}

/**
 * Brand
 */
export interface BrandDTO {
    id: string;
    slug: string;
    name: string; // resolved for the active locale
    logoUrl?: string;
    description?: string; // resolved for the active locale (brand landing page)
    sortOrder: number;
}

/**
 * Product Sorting Options
 */
export type ProductSort =
    | 'newest'
    | 'price_asc'
    | 'price_desc'
    | 'best_sellers'
    | 'featured';

/**
 * Pagination Parameters
 */
export interface PaginationParams {
    page: number;
    pageSize: number;
}

/**
 * Product List Response
 */
export interface ProductListResponse {
    items: ProductCardDTO[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

/**
 * Repository Query Parameters
 */
export interface ListProductsParams {
    locale: string;
    filters?: ProductFilters;
    sort?: ProductSort;
    pagination?: PaginationParams;
}
