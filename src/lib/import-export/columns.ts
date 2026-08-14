/**
 * Column definitions for CSV import/export.
 * Client-safe (no server imports) so the admin UI can document columns.
 */

export type Entity = 'products' | 'categories' | 'brands';

export const BRAND_COLUMNS = [
    'slug',
    'name',
    'name_en',
    'description_vi',
    'description_en',
    'sort_order',
    'is_active',
];

export const CATEGORY_COLUMNS = [
    'slug',
    'parent_slug',
    'name_vi',
    'name_en',
    'description_vi',
    'description_en',
    'sort_order',
    'is_active',
];

export const PRODUCT_COLUMNS = [
    'slug',
    'sku',
    'price',
    'compare_at_price',
    'stock_quantity',
    'condition',
    'category_slug',
    'brand_slug',
    'name_vi',
    'short_description_vi',
    'description_vi',
    'name_en',
    'short_description_en',
    'description_en',
    'specifications',
    'topology',
    'tube_type',
    'power_watts',
    'taps',
    'min_speaker_sensitivity',
    'weight_grams',
    'length_cm',
    'width_cm',
    'height_cm',
    'is_published',
    'is_featured',
    'is_vintage',
];

export const COLUMNS: Record<Entity, string[]> = {
    products: PRODUCT_COLUMNS,
    categories: CATEGORY_COLUMNS,
    brands: BRAND_COLUMNS,
};

/** Columns that must be filled for a row to import. */
export const REQUIRED: Record<Entity, string[]> = {
    products: ['slug', 'price'],
    categories: ['slug', 'name_vi'],
    brands: ['slug', 'name'],
};
