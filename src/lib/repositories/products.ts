import { createClient } from '@/lib/supabase/server';
import { getPublicImageUrl } from '@/lib/utils/images';
import { buildNestedTree, getDescendantIds, type NestedNode } from '@/lib/utils/categoryTree';
import type {
    ProductCardDTO,
    ProductDetailDTO,
    ProductListResponse,
    ListProductsParams,
    ProductImage,
    ProductSpecs,
    CategoryDTO,
    BrandDTO,
} from '@/lib/types/catalog';

// Types for Supabase response objects
interface ProductTranslationRow {
    name: string;
    short_description?: string;
    locale: string;
}

interface ProductImageRow {
    id?: string;
    storage_path?: string; // New schema
    url?: string; // Old schema (backward compatibility)
    alt_text?: string;
    sort_order?: number; // New schema
    position?: number; // Old schema (backward compatibility)
    is_primary?: boolean; // Primary image flag
}

interface CategoryEmbed {
    id: string;
    slug: string;
    name_vi: string;
    name_en?: string | null;
    parent_id?: string | null;
}

interface BrandEmbed {
    id: string;
    slug: string;
    name: string;
    name_en?: string | null;
    logo_path?: string | null;
}

interface ProductRow {
    id: string;
    slug: string;
    price: number;
    compare_at_price?: number;
    stock_quantity: number;
    low_stock_threshold?: number;
    condition: string;
    topology?: string | null;
    tube_type?: string | null;
    power_watts?: number | null;
    min_speaker_sensitivity?: number | null;
    is_featured: boolean;
    is_vintage: boolean;
    category?: CategoryEmbed | null;
    brand?: BrandEmbed | null;
    product_translations?: ProductTranslationRow[];
    product_images?: ProductImageRow[];
}

interface ProductDetailRow extends ProductRow {
    sku?: string;
    taps?: string[];
    specifications?: ProductSpecs;
    category_id?: string | null;
    brand_id?: string | null;
    allow_deposit: boolean;
    deposit_type?: 'percent' | 'fixed';
    deposit_amount?: number;
    deposit_percentage?: number;
    deposit_due_hours?: number;
    reservation_days?: number;
    reservation_policy_note?: string;
    meta_title?: string;
    meta_description?: string;
    created_at: string;
    published_at?: string;
    product_translations?: Array<ProductTranslationRow & {
        description?: string;
        sound_character?: string;
        recommended_genres?: string[];
        matching_notes?: string;
        condition_notes?: string;
        origin_story?: string;
    }>;
    product_images?: Array<ProductImageRow & {
        id: string;
        sort_order: number;
    }>;
}

// Columns for a product card query (shared by list & related)
const CARD_SELECT = `
    id,
    slug,
    price,
    compare_at_price,
    stock_quantity,
    low_stock_threshold,
    condition,
    topology,
    tube_type,
    power_watts,
    min_speaker_sensitivity,
    is_featured,
    is_vintage,
    is_published,
    category:categories(id, slug, name_vi, name_en),
    brand:brands(id, slug, name, name_en),
    product_translations!inner(
      name,
      short_description,
      locale
    ),
    product_images!left(
      id,
      storage_path,
      url,
      alt_text,
      sort_order,
      is_primary
    )
`;

/**
 * Resolve a localized display name from a categories/brands row.
 */
function localeName(
    row: { name_vi?: string | null; name_en?: string | null; name?: string | null } | null | undefined,
    locale: string
): string | undefined {
    if (!row) return undefined;
    if (locale === 'en') return row.name_en || row.name || row.name_vi || undefined;
    return row.name_vi || row.name || row.name_en || undefined;
}

/**
 * Resolve the display image URL for a product row.
 */
function resolveCardImageUrl(images?: ProductImageRow[]): string {
    const primaryImage =
        images?.find((img) => img.is_primary === true) ||
        images?.find((img) => img.sort_order === 0) ||
        images?.[0];

    let imageUrl = '/images/placeholder-product.jpg';
    if (primaryImage?.storage_path) {
        imageUrl = getPublicImageUrl(primaryImage.storage_path);
    } else if (
        primaryImage?.url &&
        primaryImage.url !== '' &&
        (primaryImage.url.startsWith('http://') || primaryImage.url.startsWith('https://'))
    ) {
        imageUrl = primaryImage.url;
    }
    return imageUrl;
}

/**
 * Map a product row to a ProductCardDTO.
 */
function mapCardRow(product: ProductRow, locale: string): ProductCardDTO {
    const translation = product.product_translations?.[0];
    return {
        id: product.id,
        slug: product.slug,
        name: translation?.name || 'Untitled Product',
        priceVnd: product.price,
        compareAtPriceVnd: product.compare_at_price || undefined,
        imageUrl: resolveCardImageUrl(product.product_images),
        topology: (product.topology as ProductCardDTO['topology']) ?? undefined,
        tubeType: (product.tube_type as ProductCardDTO['tubeType']) ?? undefined,
        powerWatts: product.power_watts ?? undefined,
        recommendedSensitivityMin: product.min_speaker_sensitivity ?? undefined,
        condition: product.condition as ProductCardDTO['condition'],
        isInStock: product.stock_quantity > 0,
        isVintage: product.is_vintage,
        isFeatured: product.is_featured,
        categoryName: localeName(product.category, locale),
        categorySlug: product.category?.slug,
        brandName: localeName(product.brand, locale),
        brandSlug: product.brand?.slug,
    };
}

/**
 * Products Repository
 * Single source of truth for product data access
 */

/**
 * Resolve a category slug to the set of category ids it should match.
 * A top-level slug also matches all of its subcategories.
 * Returns null if the slug does not exist.
 */
async function resolveCategoryIds(
    supabase: Awaited<ReturnType<typeof createClient>>,
    slug: string
): Promise<string[] | null> {
    // Fetch the whole (small) category set and resolve the subtree in JS so a
    // parent slug matches products in ALL descendant categories, at any depth.
    const { data: all } = await supabase.from('categories').select('id, slug, parent_id');
    if (!all) return null;
    const node = all.find((c) => c.slug === slug);
    if (!node) return null;
    const items = all.map((c) => ({ id: c.id, parentId: c.parent_id as string | null }));
    return [node.id, ...getDescendantIds(items, node.id)];
}

/**
 * List products with filters, sorting, and pagination
 */
export async function listProducts(
    params: ListProductsParams
): Promise<ProductListResponse> {
    const {
        locale,
        filters = {},
        sort = 'newest',
        pagination = { page: 1, pageSize: 12 },
    } = params;

    const emptyResult: ProductListResponse = {
        items: [],
        total: 0,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: 0,
    };

    try {
        const supabase = await createClient();

        // Resolve category/brand slug filters to ids up front (short-circuit on no match)
        let categoryIds: string[] | null = null;
        if (filters.category) {
            categoryIds = await resolveCategoryIds(supabase, filters.category);
            if (!categoryIds || categoryIds.length === 0) return emptyResult;
        }

        let brandId: string | null = null;
        if (filters.brand) {
            const { data: b } = await supabase
                .from('brands')
                .select('id')
                .eq('slug', filters.brand)
                .maybeSingle();
            if (!b) return emptyResult;
            brandId = b.id;
        }

        // Start building the query
        let query = supabase
            .from('products')
            .select(CARD_SELECT, { count: 'exact' })
            .eq('is_published', true)
            .eq('product_translations.locale', 'en'); // Always use English for product names

        // Apply filters
        if (categoryIds) {
            query = query.in('category_id', categoryIds);
        }

        if (brandId) {
            query = query.eq('brand_id', brandId);
        }

        if (filters.topology) {
            const topologies = Array.isArray(filters.topology) ? filters.topology : [filters.topology];
            query = query.in('topology', topologies);
        }

        if (filters.tubeType) {
            const tubeTypes = Array.isArray(filters.tubeType) ? filters.tubeType : [filters.tubeType];
            query = query.in('tube_type', tubeTypes);
        }

        if (filters.condition) {
            const conditions = Array.isArray(filters.condition) ? filters.condition : [filters.condition];
            query = query.in('condition', conditions);
        }

        if (filters.powerMin !== undefined) {
            query = query.gte('power_watts', filters.powerMin);
        }

        if (filters.powerMax !== undefined) {
            query = query.lte('power_watts', filters.powerMax);
        }

        if (filters.priceMin !== undefined) {
            query = query.gte('price', filters.priceMin);
        }

        if (filters.priceMax !== undefined) {
            query = query.lte('price', filters.priceMax);
        }

        if (filters.isVintage !== undefined) {
            query = query.eq('is_vintage', filters.isVintage);
        }

        if (filters.isFeatured !== undefined) {
            query = query.eq('is_featured', filters.isFeatured);
        }

        // Search by name (simple text search)
        if (filters.search) {
            query = query.ilike('product_translations.name', `%${filters.search}%`);
        }

        // Apply sorting
        switch (sort) {
            case 'newest':
                query = query.order('created_at', { ascending: false });
                break;
            case 'price_asc':
                query = query.order('price', { ascending: true });
                break;
            case 'price_desc':
                query = query.order('price', { ascending: false });
                break;
            case 'featured':
                query = query.order('is_featured', { ascending: false });
                break;
            case 'best_sellers':
                // For MVP, fallback to newest
                query = query.order('created_at', { ascending: false });
                break;
        }

        // Apply pagination
        const from = (pagination.page - 1) * pagination.pageSize;
        const to = from + pagination.pageSize - 1;
        query = query.range(from, to);

        // Execute query
        const { data, error, count } = await query;

        if (error) {
            console.error('Error fetching products:', error);
            throw new Error('Failed to fetch products');
        }

        const items: ProductCardDTO[] = (data || []).map((product) =>
            mapCardRow(product as unknown as ProductRow, locale)
        );

        const totalPages = count ? Math.ceil(count / pagination.pageSize) : 0;

        return {
            items,
            total: count || 0,
            page: pagination.page,
            pageSize: pagination.pageSize,
            totalPages,
        };
    } catch (error) {
        console.error('Repository error in listProducts:', error);
        return emptyResult;
    }
}

/**
 * Get a single product by slug with full details
 */
export async function getProductBySlug(
    slug: string,
    locale: string
): Promise<ProductDetailDTO | null> {
    try {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('products')
            .select(
                `
        id,
        slug,
        sku,
        price,
        compare_at_price,
        stock_quantity,
        low_stock_threshold,
        condition,
        topology,
        tube_type,
        power_watts,
        taps,
        min_speaker_sensitivity,
        specifications,
        category_id,
        brand_id,
        allow_deposit,
        deposit_type,
        deposit_amount,
        deposit_percentage,
        deposit_due_hours,
        reservation_days,
        reservation_policy_note,
        is_featured,
        is_published,
        is_vintage,
        meta_title,
        meta_description,
        created_at,
        published_at,
        category:categories(id, slug, name_vi, name_en, parent_id),
        brand:brands(id, slug, name, name_en, logo_path),
        product_translations(
          name,
          short_description,
          description,
          sound_character,
          recommended_genres,
          matching_notes,
          condition_notes,
          origin_story,
          locale
        ),
        product_images(
          id,
          storage_path,
          url,
          alt_text,
          sort_order,
          is_primary
        )
      `
            )
            .eq('slug', slug)
            .eq('is_published', true)
            .maybeSingle();

        if (error || !data) {
            if (error) console.error('Error fetching product:', error);
            return null;
        }

        const productData = data as unknown as ProductDetailRow;
        // Pick the requested locale, falling back to VI then any — so a product
        // with only one locale's translation still renders (no 404).
        const allTranslations = productData.product_translations ?? [];
        const translation =
            allTranslations.find((t) => t.locale === locale) ??
            allTranslations.find((t) => t.locale === 'vi') ??
            allTranslations[0];
        const englishName = allTranslations.find((t) => t.locale === 'en')?.name;

        // Build the full category ancestor path (root -> leaf) for the breadcrumb
        let categoryPath: Array<{ name: string; slug: string }> = [];
        const leafCatId = productData.category?.id ?? productData.category_id ?? null;
        if (leafCatId) {
            const { data: allCats } = await supabase
                .from('categories')
                .select('id, slug, name_vi, name_en, parent_id');
            if (allCats) {
                const byId = new Map(allCats.map((c) => [c.id, c]));
                const chain: Array<{ name: string; slug: string }> = [];
                const guard = new Set<string>();
                let cur = byId.get(leafCatId);
                while (cur && !guard.has(cur.id)) {
                    guard.add(cur.id);
                    chain.unshift({ name: localeName(cur, locale) || cur.slug, slug: cur.slug });
                    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
                }
                categoryPath = chain;
            }
        }

        // Map images - use is_primary and sort_order
        const images: ProductImage[] = (productData.product_images || [])
            .sort((a, b) => {
                const aOrder = a.sort_order ?? 0;
                const bOrder = b.sort_order ?? 0;
                return aOrder - bOrder;
            })
            .map((img) => {
                const sortOrder = img.sort_order ?? 0;
                const isPrimary = img.is_primary === true || (img.is_primary === undefined && sortOrder === 0);

                let imageUrl = '';
                if (img.storage_path) {
                    imageUrl = getPublicImageUrl(img.storage_path);
                } else if (
                    img.url &&
                    img.url !== '' &&
                    (img.url.startsWith('http://') || img.url.startsWith('https://'))
                ) {
                    imageUrl = img.url;
                } else {
                    imageUrl = '/images/placeholder-product.jpg';
                }

                return {
                    id: img.id,
                    url: imageUrl,
                    altText: img.alt_text,
                    position: sortOrder,
                    isPrimary,
                };
            });

        // Parse specifications
        const specs: ProductSpecs = productData.specifications || {};

        // Map to DTO
        const product: ProductDetailDTO = {
            id: productData.id,
            slug: productData.slug,
            name: englishName || translation?.name || 'Untitled Product', // Always use English name
            priceVnd: productData.price,
            compareAtPriceVnd: productData.compare_at_price || undefined,
            imageUrl: (() => {
                const primaryImg = images.find((img) => img.isPrimary) || images[0];
                return primaryImg?.url || '/images/placeholder-product.jpg';
            })(),
            topology: (productData.topology as ProductCardDTO['topology']) ?? undefined,
            tubeType: (productData.tube_type as ProductCardDTO['tubeType']) ?? undefined,
            powerWatts: productData.power_watts ?? undefined,
            recommendedSensitivityMin: productData.min_speaker_sensitivity ?? undefined,
            condition: productData.condition as ProductCardDTO['condition'],
            isInStock: productData.stock_quantity > 0,
            isVintage: productData.is_vintage,
            isFeatured: productData.is_featured,

            // Category & brand
            categoryId: productData.category?.id ?? productData.category_id ?? undefined,
            categoryName: localeName(productData.category, locale),
            categorySlug: productData.category?.slug,
            categoryPath,
            brandId: productData.brand?.id ?? productData.brand_id ?? undefined,
            brandName: localeName(productData.brand, locale),
            brandSlug: productData.brand?.slug,
            brandLogoUrl: productData.brand?.logo_path
                ? getPublicImageUrl(productData.brand.logo_path)
                : undefined,

            // Detail-specific fields
            shortDescription: translation?.short_description,
            description: translation?.description,
            soundCharacter: translation?.sound_character,
            recommendedGenres: translation?.recommended_genres || [],
            matchingNotes: translation?.matching_notes,
            conditionNotes: translation?.condition_notes,
            originStory: translation?.origin_story,

            images,
            specs,
            taps: productData.taps || [],

            stockQuantity: productData.stock_quantity,
            lowStockThreshold: productData.low_stock_threshold ?? 0,

            allowDeposit: productData.allow_deposit,
            depositType: productData.deposit_type,
            depositAmount: productData.deposit_amount,
            depositPercentage: productData.deposit_percentage,
            depositDueHours: productData.deposit_due_hours,
            reservationPolicyNote: productData.reservation_policy_note,

            metaTitle: productData.meta_title,
            metaDescription: productData.meta_description,

            createdAt: productData.created_at,
            publishedAt: productData.published_at,
        };

        return product;
    } catch (error) {
        console.error('Repository error in getProductBySlug:', error);
        return null;
    }
}

/**
 * Get related products by category, falling back to brand, then newest.
 */
export async function getRelatedProducts(
    productId: string,
    categoryId: string | null | undefined,
    brandId: string | null | undefined,
    locale: string,
    limit: number = 3
): Promise<ProductCardDTO[]> {
    try {
        const supabase = await createClient();
        const collected: ProductRow[] = [];
        const seen = new Set<string>([productId]);

        const runQuery = async (column: 'category_id' | 'brand_id', value: string) => {
            const { data } = await supabase
                .from('products')
                .select(CARD_SELECT)
                .eq('is_published', true)
                .eq(column, value)
                .neq('id', productId)
                .eq('product_translations.locale', 'en')
                .limit(limit * 2);
            for (const row of (data || []) as unknown as ProductRow[]) {
                if (!seen.has(row.id)) {
                    seen.add(row.id);
                    collected.push(row);
                }
            }
        };

        if (categoryId) await runQuery('category_id', categoryId);
        if (collected.length < limit && brandId) await runQuery('brand_id', brandId);

        // Fallback: newest published products
        if (collected.length < limit) {
            const { data } = await supabase
                .from('products')
                .select(CARD_SELECT)
                .eq('is_published', true)
                .neq('id', productId)
                .eq('product_translations.locale', 'en')
                .order('created_at', { ascending: false })
                .limit(limit * 2);
            for (const row of (data || []) as unknown as ProductRow[]) {
                if (!seen.has(row.id)) {
                    seen.add(row.id);
                    collected.push(row);
                }
            }
        }

        return collected.slice(0, limit).map((row) => mapCardRow(row, locale));
    } catch (error) {
        console.error('Repository error in getRelatedProducts:', error);
        return [];
    }
}

/**
 * Get filter options for the collection UI: category tree, brands, and the
 * amp-specific facets derived from published products.
 */
export async function getFilterOptions(locale: string = 'vi') {
    try {
        const supabase = await createClient();

        const [{ data: products }, { data: categoryRows }, { data: brandRows }] = await Promise.all([
            supabase.from('products').select('topology, tube_type, condition').eq('is_published', true),
            supabase
                .from('categories')
                .select('id, slug, parent_id, name_vi, name_en, image_path, sort_order')
                .eq('is_active', true)
                .order('sort_order', { ascending: true }),
            supabase
                .from('brands')
                .select('id, slug, name, name_en, logo_path, sort_order')
                .eq('is_active', true)
                .order('sort_order', { ascending: true }),
        ]);

        const topologies = [...new Set((products || []).map((p) => p.topology).filter(Boolean))];
        const tubeTypes = [...new Set((products || []).map((p) => p.tube_type).filter(Boolean))];
        const conditions = [...new Set((products || []).map((p) => p.condition).filter(Boolean))];

        const categories = buildCategoryTree(categoryRows || [], locale);
        const brands: BrandDTO[] = (brandRows || []).map((b) => ({
            id: b.id,
            slug: b.slug,
            name: (locale === 'en' ? b.name_en || b.name : b.name) || b.slug,
            logoUrl: b.logo_path ? getPublicImageUrl(b.logo_path) : undefined,
            sortOrder: b.sort_order ?? 0,
        }));

        return { topologies, tubeTypes, conditions, categories, brands };
    } catch (error) {
        console.error('Error fetching filter options:', error);
        return null;
    }
}

interface CategoryRowRaw {
    id: string;
    slug: string;
    parent_id: string | null;
    name_vi: string;
    name_en?: string | null;
    image_path?: string | null;
    sort_order?: number | null;
}

/**
 * Build a nested category tree (unlimited depth) from flat rows.
 */
export function buildCategoryTree(rows: CategoryRowRaw[], locale: string): CategoryDTO[] {
    const input = rows.map((r) => ({ ...r, parentId: r.parent_id, sortOrder: r.sort_order ?? 0 }));
    const nameOf = (r: CategoryRowRaw) => (locale === 'en' ? r.name_en || r.name_vi : r.name_vi) || r.slug;
    const convert = (node: NestedNode<(typeof input)[number]>): CategoryDTO => ({
        id: node.item.id,
        slug: node.item.slug,
        parentId: node.item.parent_id,
        name: nameOf(node.item),
        imageUrl: node.item.image_path ? getPublicImageUrl(node.item.image_path) : undefined,
        sortOrder: node.item.sort_order ?? 0,
        children: node.children.map(convert),
    });
    return buildNestedTree(input).map(convert);
}
