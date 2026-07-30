import { createServiceClient } from '@/lib/supabase/service';
import type { ProductCardDTO, ProductDetailDTO } from '@/lib/types/catalog';

/**
 * Admin Products Repository
 * Server-only functions for admin product management
 * Uses service role key to bypass RLS
 */

export interface AdminProductFilters {
    search?: string;
    status?: 'all' | 'published' | 'draft';
    condition?: 'new' | 'like_new' | 'vintage';
    topology?: 'se' | 'pp';
    category?: string; // category id
    brand?: string; // brand id
}

export interface AdminProductSort {
    field: 'updated_at' | 'created_at' | 'price' | 'name';
    direction: 'asc' | 'desc';
}

export interface AdminListProductsParams {
    filters?: AdminProductFilters;
    sort?: AdminProductSort;
    pagination?: {
        page: number;
        pageSize: number;
    };
}

export interface AdminProductListResponse {
    items: Array<{
        id: string;
        slug: string;
        name: string; // Primary name (vi)
        status: 'published' | 'draft';
        price: number;
        stock: number;
        topology: string | null;
        tubeType: string | null;
        categoryName: string | null;
        brandName: string | null;
        updatedAt: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface CreateProductPayload {
    slug: string;
    price: number;
    compareAtPrice?: number;
    stockQuantity: number;
    lowStockThreshold?: number;
    condition: 'new' | 'like_new' | 'vintage';
    topology?: 'se' | 'pp';
    tubeType?: string;
    powerWatts?: number;
    taps?: string[];
    minSpeakerSensitivity?: number;
    specifications?: Record<string, string>;
    allowDeposit?: boolean;
    depositType?: 'percent' | 'fixed';
    depositAmount?: number;
    depositPercentage?: number;
    depositDueHours?: number;
    reservationDays?: number;
    reservationPolicyNote?: string;
    isPublished?: boolean;
    isFeatured?: boolean;
    isVintage?: boolean;
    categoryId?: string | null;
    brandId?: string | null;
    translations: {
        vi: {
            name: string;
            shortDescription?: string;
            description?: string;
            soundCharacter?: string;
            recommendedGenres?: string[];
            matchingNotes?: string;
            conditionNotes?: string;
            originStory?: string;
        };
        en: {
            name: string;
            shortDescription?: string;
            description?: string;
            soundCharacter?: string;
            recommendedGenres?: string[];
            matchingNotes?: string;
            conditionNotes?: string;
            originStory?: string;
        };
    };
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {
    id: string;
}

/**
 * List products for admin (with filters, search, pagination)
 */
export async function adminListProducts(
    params: AdminListProductsParams = {}
): Promise<AdminProductListResponse> {
    const supabase = createServiceClient();
    const {
        filters = {},
        sort = { field: 'updated_at', direction: 'desc' },
        pagination = { page: 1, pageSize: 20 },
    } = params;

    let query = supabase
        .from('products')
        .select(
            `
            id,
            slug,
            price,
            stock_quantity,
            condition,
            topology,
            tube_type,
            updated_at,
            is_published,
            category:categories(name_vi),
            brand:brands(name),
            product_translations(name, locale)
        `,
            { count: 'exact' }
        )

    // Apply filters
    if (filters.search) {
        // Search in product translations (will match any locale)
        query = query.ilike('product_translations.name', `%${filters.search}%`);
    }

    if (filters.status === 'published') {
        query = query.eq('is_published', true);
    } else if (filters.status === 'draft') {
        query = query.eq('is_published', false);
    }

    if (filters.condition) {
        query = query.eq('condition', filters.condition);
    }

    if (filters.topology) {
        query = query.eq('topology', filters.topology);
    }

    if (filters.category) {
        query = query.eq('category_id', filters.category);
    }

    if (filters.brand) {
        query = query.eq('brand_id', filters.brand);
    }

    // Apply sorting
    query = query.order(sort.field, { ascending: sort.direction === 'asc' });

    // Apply pagination
    const from = (pagination.page - 1) * pagination.pageSize;
    const to = from + pagination.pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
        console.error('Error listing admin products:', error);
        throw new Error('Failed to list products');
    }

    const items =
        data?.map((product: any) => {
            // Prefer English name, fallback to Vietnamese, then to slug
            const translations = product.product_translations || [];
            const englishTranslation = translations.find((t: any) => t.locale === 'en');
            const vietnameseTranslation = translations.find((t: any) => t.locale === 'vi');
            const name = englishTranslation?.name || vietnameseTranslation?.name || product.slug || 'Untitled';
            
            return {
                id: product.id,
                slug: product.slug,
                name,
                status: product.is_published ? ('published' as const) : ('draft' as const),
                price: product.price,
                stock: product.stock_quantity,
                topology: product.topology,
                tubeType: product.tube_type,
                categoryName: product.category?.name_vi ?? null,
                brandName: product.brand?.name ?? null,
                updatedAt: product.updated_at,
            };
        }) || [];

    const totalPages = count ? Math.ceil(count / pagination.pageSize) : 0;

    return {
        items,
        total: count || 0,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages,
    };
}

/**
 * Get product by ID for admin editing
 */
export async function adminGetProductById(id: string): Promise<ProductDetailDTO | null> {
    const supabase = createServiceClient();

    const { data, error } = await supabase
        .from('products')
        .select(
            `
            *,
            product_translations(locale, name, short_description, description, sound_character, recommended_genres, matching_notes, condition_notes, origin_story),
            product_images(url, alt_text, position, is_primary)
        `
        )
        .eq('id', id)
        .single();

    if (error || !data) {
        console.error('Error fetching admin product:', error);
        return null;
    }

    // Map to ProductDetailDTO format
    const viTranslation = data.product_translations?.find((t: any) => t.locale === 'vi');
    const enTranslation = data.product_translations?.find((t: any) => t.locale === 'en');

    const images = (data.product_images || []).sort((a: any, b: any) => a.position - b.position);

    return {
        id: data.id,
        slug: data.slug,
        name: viTranslation?.name || enTranslation?.name || 'Untitled',
        priceVnd: data.price,
        compareAtPriceVnd: data.compare_at_price || undefined,
        imageUrl: images.find((img: any) => img.is_primary)?.url || images[0]?.url || '',
        topology: (data.topology as 'se' | 'pp') ?? undefined,
        tubeType: (data.tube_type as any) ?? undefined,
        powerWatts: data.power_watts ?? undefined,
        recommendedSensitivityMin: data.min_speaker_sensitivity ?? undefined,
        condition: data.condition as 'new' | 'like_new' | 'vintage',
        isInStock: data.stock_quantity > 0,
        isVintage: data.is_vintage,
        isFeatured: data.is_featured,
        categoryId: data.category_id ?? undefined,
        brandId: data.brand_id ?? undefined,
        shortDescription: viTranslation?.short_description,
        description: viTranslation?.description,
        soundCharacter: viTranslation?.sound_character,
        recommendedGenres: viTranslation?.recommended_genres || [],
        matchingNotes: viTranslation?.matching_notes,
        conditionNotes: viTranslation?.condition_notes,
        originStory: viTranslation?.origin_story,
        images: images.map((img: any) => ({
            id: img.id || '',
            url: img.url,
            altText: img.alt_text,
            position: img.position,
            isPrimary: img.is_primary,
        })),
        specs: data.specifications || {},
        taps: data.taps || [],
        stockQuantity: data.stock_quantity,
        lowStockThreshold: data.low_stock_threshold || 0,
        allowDeposit: data.allow_deposit,
        depositType: data.deposit_type,
        depositAmount: data.deposit_amount,
        depositPercentage: data.deposit_percentage,
        depositDueHours: data.deposit_due_hours,
        reservationPolicyNote: data.reservation_policy_note,
        createdAt: data.created_at,
        publishedAt: data.published_at,
    };
}

/**
 * Create a new product
 */
export async function adminCreateProduct(payload: CreateProductPayload): Promise<string> {
    const supabase = createServiceClient();

    // Validate slug uniqueness
    const { data: existing } = await supabase.from('products').select('id').eq('slug', payload.slug).single();
    if (existing) {
        throw new Error('Product slug already exists');
    }

    // Create product
    const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
            slug: payload.slug.toLowerCase().replace(/\s+/g, '-'),
            price: payload.price,
            compare_at_price: payload.compareAtPrice,
            stock_quantity: payload.stockQuantity,
            low_stock_threshold: payload.lowStockThreshold || 5,
            condition: payload.condition,
            topology: payload.topology,
            tube_type: payload.tubeType,
            power_watts: payload.powerWatts,
            taps: payload.taps || [],
            min_speaker_sensitivity: payload.minSpeakerSensitivity,
            specifications: payload.specifications || {},
            allow_deposit: payload.allowDeposit || false,
            deposit_type: payload.depositType,
            deposit_amount: payload.depositAmount,
            deposit_percentage: payload.depositPercentage,
            deposit_due_hours: payload.depositDueHours,
            reservation_days: payload.reservationDays || 7,
            reservation_policy_note: payload.reservationPolicyNote,
            is_published: payload.isPublished || false,
            is_featured: payload.isFeatured || false,
            is_vintage: payload.isVintage || false,
            category_id: payload.categoryId || null,
            brand_id: payload.brandId || null,
        })
        .select('id')
        .single();

    if (productError || !product) {
        console.error('Error creating product:', productError);
        throw new Error('Failed to create product');
    }

    // Create translations
    const translations = [
        {
            product_id: product.id,
            locale: 'vi',
            name: payload.translations.vi.name,
            short_description: payload.translations.vi.shortDescription,
            description: payload.translations.vi.description,
            sound_character: payload.translations.vi.soundCharacter,
            recommended_genres: payload.translations.vi.recommendedGenres,
            matching_notes: payload.translations.vi.matchingNotes,
            condition_notes: payload.translations.vi.conditionNotes,
            origin_story: payload.translations.vi.originStory,
        },
        {
            product_id: product.id,
            locale: 'en',
            name: payload.translations.en.name,
            short_description: payload.translations.en.shortDescription,
            description: payload.translations.en.description,
            sound_character: payload.translations.en.soundCharacter,
            recommended_genres: payload.translations.en.recommendedGenres,
            matching_notes: payload.translations.en.matchingNotes,
            condition_notes: payload.translations.en.conditionNotes,
            origin_story: payload.translations.en.originStory,
        },
    ];

    const { error: translationError } = await supabase.from('product_translations').insert(translations);

    if (translationError) {
        // Rollback product creation
        await supabase.from('products').delete().eq('id', product.id);
        console.error('Error creating translations:', translationError);
        throw new Error('Failed to create product translations');
    }

    return product.id;
}

/**
 * Update an existing product
 */
export async function adminUpdateProduct(payload: UpdateProductPayload): Promise<void> {
    const supabase = createServiceClient();

    const updateData: any = {};

    if (payload.slug !== undefined) updateData.slug = payload.slug.toLowerCase().replace(/\s+/g, '-');
    if (payload.price !== undefined) updateData.price = payload.price;
    if (payload.compareAtPrice !== undefined) updateData.compare_at_price = payload.compareAtPrice;
    if (payload.stockQuantity !== undefined) updateData.stock_quantity = payload.stockQuantity;
    if (payload.lowStockThreshold !== undefined) updateData.low_stock_threshold = payload.lowStockThreshold;
    if (payload.condition !== undefined) updateData.condition = payload.condition;
    if (payload.topology !== undefined) updateData.topology = payload.topology;
    if (payload.tubeType !== undefined) updateData.tube_type = payload.tubeType;
    if (payload.powerWatts !== undefined) updateData.power_watts = payload.powerWatts;
    if (payload.taps !== undefined) updateData.taps = payload.taps;
    if (payload.minSpeakerSensitivity !== undefined) updateData.min_speaker_sensitivity = payload.minSpeakerSensitivity;
    if (payload.specifications !== undefined) updateData.specifications = payload.specifications;
    if (payload.allowDeposit !== undefined) updateData.allow_deposit = payload.allowDeposit;
    if (payload.depositType !== undefined) updateData.deposit_type = payload.depositType;
    if (payload.depositAmount !== undefined) updateData.deposit_amount = payload.depositAmount;
    if (payload.depositPercentage !== undefined) updateData.deposit_percentage = payload.depositPercentage;
    if (payload.depositDueHours !== undefined) updateData.deposit_due_hours = payload.depositDueHours;
    if (payload.reservationDays !== undefined) updateData.reservation_days = payload.reservationDays;
    if (payload.reservationPolicyNote !== undefined) updateData.reservation_policy_note = payload.reservationPolicyNote;
    if (payload.isPublished !== undefined) {
        updateData.is_published = payload.isPublished;
        if (payload.isPublished) {
            updateData.published_at = new Date().toISOString();
        }
    }
    if (payload.isFeatured !== undefined) updateData.is_featured = payload.isFeatured;
    if (payload.isVintage !== undefined) updateData.is_vintage = payload.isVintage;
    if (payload.categoryId !== undefined) updateData.category_id = payload.categoryId || null;
    if (payload.brandId !== undefined) updateData.brand_id = payload.brandId || null;

    // Update product
    const { error: productError } = await supabase.from('products').update(updateData).eq('id', payload.id);

    if (productError) {
        console.error('Error updating product:', productError);
        throw new Error('Failed to update product');
    }

    // Update translations if provided
    if (payload.translations) {
        const translations = [
            {
                product_id: payload.id,
                locale: 'vi',
                name: payload.translations.vi.name,
                short_description: payload.translations.vi.shortDescription,
                description: payload.translations.vi.description,
                sound_character: payload.translations.vi.soundCharacter,
                recommended_genres: payload.translations.vi.recommendedGenres,
                matching_notes: payload.translations.vi.matchingNotes,
                condition_notes: payload.translations.vi.conditionNotes,
                origin_story: payload.translations.vi.originStory,
            },
            {
                product_id: payload.id,
                locale: 'en',
                name: payload.translations.en.name,
                short_description: payload.translations.en.shortDescription,
                description: payload.translations.en.description,
                sound_character: payload.translations.en.soundCharacter,
                recommended_genres: payload.translations.en.recommendedGenres,
                matching_notes: payload.translations.en.matchingNotes,
                condition_notes: payload.translations.en.conditionNotes,
                origin_story: payload.translations.en.originStory,
            },
        ];

        // Upsert translations
        for (const translation of translations) {
            const { error: translationError } = await supabase
                .from('product_translations')
                .upsert(translation, {
                    onConflict: 'product_id,locale',
                });

            if (translationError) {
                console.error('Error updating translation:', translationError);
                throw new Error('Failed to update product translations');
            }
        }
    }
}

