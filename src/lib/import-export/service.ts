import { createServiceClient } from '@/lib/supabase/service';
import { toCsv, csvToObjects, encodeSpecs, decodeSpecs } from './csv';
import { COLUMNS, PRODUCT_COLUMNS, CATEGORY_COLUMNS, BRAND_COLUMNS, type Entity } from './columns';

export type { Entity };

/**
 * CSV import/export for products, categories and brands.
 * Import upserts by slug (products also match SKU indirectly via slug); product
 * rows reference category/brand by slug and auto-create them when missing.
 */

export interface ImportResult {
    created: number;
    updated: number;
    errors: { row: number; message: string }[];
}

// Example rows for downloadable templates. Same columns as import → edit & re-import directly.
const TEMPLATE_ROWS: Record<Entity, Record<string, unknown>[]> = {
    brands: [
        { slug: 'mundorf', name: 'Mundorf', name_en: 'Mundorf', description_vi: 'Linh kiện audiophile Đức', description_en: 'German audiophile parts', sort_order: 1, is_active: true },
        { slug: 'jj-electronic', name: 'JJ Electronic', name_en: 'JJ Electronic', description_vi: 'Bóng đèn & tụ', description_en: 'Tubes & caps', sort_order: 2, is_active: true },
    ],
    categories: [
        { slug: 'linh-kien', parent_slug: '', name_vi: 'Linh kiện', name_en: 'Components', description_vi: '', description_en: '', sort_order: 1, is_active: true },
        { slug: 'tu-dien', parent_slug: 'linh-kien', name_vi: 'Tụ điện', name_en: 'Capacitors', description_vi: '', description_en: '', sort_order: 1, is_active: true },
        { slug: 'dien-tro', parent_slug: 'linh-kien', name_vi: 'Điện trở', name_en: 'Resistors', description_vi: '', description_en: '', sort_order: 2, is_active: true },
    ],
    products: [
        {
            slug: 'vi-du-tu-mundorf', sku: 'CAP-MND-022', price: 250000, compare_at_price: '', stock_quantity: 50,
            condition: 'new', category_slug: 'tu-dien', brand_slug: 'mundorf',
            name_vi: 'Tụ Mundorf MCap 0.22uF 630V', short_description_vi: 'Tụ phim cao cấp', description_vi: 'Tụ phim polypropylene cho mạch tín hiệu.',
            name_en: 'Mundorf MCap 0.22uF 630V', short_description_en: 'Premium film cap', description_en: 'Polypropylene film capacitor.',
            specifications: 'Điện dung=0.22uF|Điện áp=630V|Loại=Phim', topology: '', tube_type: '', power_watts: '', taps: '', min_speaker_sensitivity: '',
            is_published: false, is_featured: false, is_vintage: false,
        },
        {
            slug: 'vi-du-ampli-se-300b', sku: 'AMP-SE-300B-DEMO', price: 45000000, compare_at_price: '', stock_quantity: 3,
            condition: 'new', category_slug: 'ampli-den', brand_slug: 'vintage-house',
            name_vi: 'Ampli đèn SE 300B (mẫu)', short_description_vi: 'Ampli SE 300B handmade', description_vi: 'Ví dụ sản phẩm ampli.',
            name_en: 'SE 300B Tube Amp (sample)', short_description_en: 'Handmade SE 300B amp', description_en: 'Amp product example.',
            specifications: 'Frequency response=20Hz-20kHz|THD=0.5%', topology: 'se', tube_type: '300B', power_watts: 8, taps: '4Ω|8Ω|16Ω', min_speaker_sensitivity: 88,
            is_published: false, is_featured: false, is_vintage: false,
        },
    ],
};

/** Downloadable template CSV: header row + a couple of example rows, ready to edit & re-import. */
export function templateCsv(entity: Entity): string {
    return toCsv(COLUMNS[entity], TEMPLATE_ROWS[entity]);
}

/** Blank template: header row only (for users who don't want the example rows). */
export function emptyTemplateCsv(entity: Entity): string {
    return toCsv(COLUMNS[entity], []);
}

// ---- helpers ----
const normSlug = (s: string | undefined | null) =>
    (s ?? '').toString().toLowerCase().trim().replace(/\s+/g, '-');
const toInt = (v: string | undefined, def = 0) => {
    const n = parseInt((v ?? '').toString().replace(/[.,\s]/g, ''), 10);
    return Number.isFinite(n) ? n : def;
};
const toNum = (v: string | undefined): number => {
    const n = Number((v ?? '').toString().replace(/[, ]/g, ''));
    return Number.isFinite(n) ? n : NaN;
};
// VND money: strip thousands separators ('.', ',', space). VND has no decimal part,
// so "250.000" -> 250000 (not 250).
const toMoney = (v: string | undefined): number => {
    const n = Number((v ?? '').toString().replace(/[.,\s]/g, ''));
    return Number.isFinite(n) ? n : NaN;
};
const parseBool = (v: string | undefined, def = false): boolean => {
    const s = (v ?? '').toString().trim().toLowerCase();
    if (s === '') return def;
    return ['true', '1', 'yes', 'y', 'x', 'có', 'co'].includes(s);
};
const empty = (): ImportResult => ({ created: 0, updated: 0, errors: [] });
const msg = (e: unknown) => (e instanceof Error ? e.message : 'Lỗi không xác định');

// =====================================================
// EXPORT
// =====================================================
export async function exportCsv(entity: Entity): Promise<string> {
    switch (entity) {
        case 'brands':
            return exportBrands();
        case 'categories':
            return exportCategories();
        case 'products':
            return exportProducts();
    }
}

async function exportBrands(): Promise<string> {
    const sb = createServiceClient();
    const { data } = await sb
        .from('brands')
        .select('slug, name, name_en, description_vi, description_en, sort_order, is_active')
        .order('sort_order', { ascending: true });
    return toCsv(BRAND_COLUMNS, (data ?? []) as Record<string, unknown>[]);
}

async function exportCategories(): Promise<string> {
    const sb = createServiceClient();
    const { data } = await sb
        .from('categories')
        .select('id, slug, parent_id, name_vi, name_en, description_vi, description_en, sort_order, is_active')
        .order('sort_order', { ascending: true });
    const slugById = new Map((data ?? []).map((c) => [c.id, c.slug]));
    const rows = (data ?? []).map((c) => ({
        slug: c.slug,
        parent_slug: c.parent_id ? slugById.get(c.parent_id) ?? '' : '',
        name_vi: c.name_vi,
        name_en: c.name_en,
        description_vi: c.description_vi,
        description_en: c.description_en,
        sort_order: c.sort_order,
        is_active: c.is_active,
    }));
    return toCsv(CATEGORY_COLUMNS, rows);
}

interface ProductExportRow {
    slug: string;
    sku: string | null;
    price: number;
    compare_at_price: number | null;
    stock_quantity: number;
    condition: string;
    topology: string | null;
    tube_type: string | null;
    power_watts: number | null;
    taps: string[] | null;
    min_speaker_sensitivity: number | null;
    specifications: Record<string, unknown> | null;
    is_published: boolean;
    is_featured: boolean;
    is_vintage: boolean;
    category: { slug: string } | null;
    brand: { slug: string } | null;
    product_translations: { locale: string; name: string; short_description: string | null; description: string | null }[] | null;
}

async function exportProducts(): Promise<string> {
    const sb = createServiceClient();
    const { data } = await sb
        .from('products')
        .select(
            `slug, sku, price, compare_at_price, stock_quantity, condition, topology, tube_type,
             power_watts, taps, min_speaker_sensitivity, specifications, is_published, is_featured, is_vintage,
             category:categories(slug), brand:brands(slug),
             product_translations(locale, name, short_description, description)`
        )
        .order('created_at', { ascending: false });

    const rows = ((data ?? []) as unknown as ProductExportRow[]).map((p) => {
        const vi = p.product_translations?.find((t) => t.locale === 'vi');
        const en = p.product_translations?.find((t) => t.locale === 'en');
        return {
            slug: p.slug,
            sku: p.sku ?? '',
            price: p.price,
            compare_at_price: p.compare_at_price ?? '',
            stock_quantity: p.stock_quantity,
            condition: p.condition,
            category_slug: p.category?.slug ?? '',
            brand_slug: p.brand?.slug ?? '',
            name_vi: vi?.name ?? '',
            short_description_vi: vi?.short_description ?? '',
            description_vi: vi?.description ?? '',
            name_en: en?.name ?? '',
            short_description_en: en?.short_description ?? '',
            description_en: en?.description ?? '',
            specifications: encodeSpecs(p.specifications),
            topology: p.topology ?? '',
            tube_type: p.tube_type ?? '',
            power_watts: p.power_watts ?? '',
            taps: (p.taps ?? []).join('|'),
            min_speaker_sensitivity: p.min_speaker_sensitivity ?? '',
            is_published: p.is_published,
            is_featured: p.is_featured,
            is_vintage: p.is_vintage,
        };
    });
    return toCsv(PRODUCT_COLUMNS, rows);
}

// =====================================================
// IMPORT (upsert by slug)
// =====================================================
export async function importCsv(entity: Entity, csvText: string): Promise<ImportResult> {
    switch (entity) {
        case 'brands':
            return importBrands(csvText);
        case 'categories':
            return importCategories(csvText);
        case 'products':
            return importProducts(csvText);
    }
}

async function importBrands(csvText: string): Promise<ImportResult> {
    const sb = createServiceClient();
    const objs = csvToObjects(csvText);
    const result = empty();
    const { data: existing } = await sb.from('brands').select('slug');
    const existingSlugs = new Set((existing ?? []).map((b) => b.slug));

    for (let i = 0; i < objs.length; i++) {
        const o = objs[i];
        const rowNum = i + 2; // header is row 1
        const has = (k: string) => k in o;
        try {
            const slug = normSlug(o.slug || o.name);
            if (!slug) throw new Error('Thiếu slug/name');
            const isNew = !existingSlugs.has(slug);
            const payload: Record<string, unknown> = { slug };
            if (has('name')) payload.name = o.name || slug;
            else if (isNew) payload.name = slug;
            if (has('name_en')) payload.name_en = o.name_en || null;
            if (has('description_vi')) payload.description_vi = o.description_vi || null;
            if (has('description_en')) payload.description_en = o.description_en || null;
            if (has('sort_order')) payload.sort_order = toInt(o.sort_order, 0);
            if (has('is_active')) payload.is_active = parseBool(o.is_active, true);

            const { error } = await sb.from('brands').upsert(payload, { onConflict: 'slug' });
            if (error) throw new Error(error.message);
            if (isNew) {
                result.created++;
                existingSlugs.add(slug);
            } else {
                result.updated++;
            }
        } catch (e) {
            result.errors.push({ row: rowNum, message: msg(e) });
        }
    }
    return result;
}

async function importCategories(csvText: string): Promise<ImportResult> {
    const sb = createServiceClient();
    const objs = csvToObjects(csvText);
    const result = empty();
    const { data: existing } = await sb.from('categories').select('slug');
    const existingSlugs = new Set((existing ?? []).map((c) => c.slug));

    // Pass 1: upsert base fields (parent resolved in pass 2)
    const meta: { rowNum: number; slug: string; parentSlug: string; hasParent: boolean }[] = [];
    for (let i = 0; i < objs.length; i++) {
        const o = objs[i];
        const rowNum = i + 2;
        const has = (k: string) => k in o;
        try {
            const slug = normSlug(o.slug || o.name_vi);
            if (!slug) throw new Error('Thiếu slug');
            const isNew = !existingSlugs.has(slug);
            const payload: Record<string, unknown> = { slug };
            if (has('name_vi')) payload.name_vi = o.name_vi || slug;
            else if (isNew) payload.name_vi = slug;
            if (has('name_en')) payload.name_en = o.name_en || null;
            if (has('description_vi')) payload.description_vi = o.description_vi || null;
            if (has('description_en')) payload.description_en = o.description_en || null;
            if (has('sort_order')) payload.sort_order = toInt(o.sort_order, 0);
            if (has('is_active')) payload.is_active = parseBool(o.is_active, true);

            const { error } = await sb.from('categories').upsert(payload, { onConflict: 'slug' });
            if (error) throw new Error(error.message);
            if (isNew) {
                result.created++;
                existingSlugs.add(slug);
            } else {
                result.updated++;
            }
            meta.push({ rowNum, slug, parentSlug: normSlug(o.parent_slug), hasParent: has('parent_slug') });
        } catch (e) {
            result.errors.push({ row: rowNum, message: msg(e) });
        }
    }

    // Pass 2: resolve parents
    const { data: all } = await sb.from('categories').select('id, slug');
    const idBySlug = new Map((all ?? []).map((c) => [c.slug, c.id]));
    for (const m of meta) {
        if (!m.hasParent) continue; // parent_slug column absent → leave existing hierarchy untouched
        const selfId = idBySlug.get(m.slug);
        if (!selfId) continue;
        if (!m.parentSlug) {
            await sb.from('categories').update({ parent_id: null }).eq('id', selfId);
            continue;
        }
        const parentId = idBySlug.get(m.parentSlug);
        if (!parentId) {
            result.errors.push({ row: m.rowNum, message: `Không tìm thấy danh mục cha "${m.parentSlug}"` });
            continue;
        }
        const { error } = await sb.from('categories').update({ parent_id: parentId }).eq('id', selfId);
        if (error) result.errors.push({ row: m.rowNum, message: error.message });
    }
    return result;
}

async function importProducts(csvText: string): Promise<ImportResult> {
    const sb = createServiceClient();
    const objs = csvToObjects(csvText);
    const result = empty();

    const { data: existing } = await sb.from('products').select('slug');
    const existingSlugs = new Set((existing ?? []).map((p) => p.slug));
    const { data: cats } = await sb.from('categories').select('id, slug');
    const catBySlug = new Map((cats ?? []).map((c) => [c.slug, c.id]));
    const { data: brs } = await sb.from('brands').select('id, slug');
    const brandBySlug = new Map((brs ?? []).map((b) => [b.slug, b.id]));

    const ensureCategory = async (slug: string): Promise<string | null> => {
        if (!slug) return null;
        if (catBySlug.has(slug)) return catBySlug.get(slug)!;
        const { data, error } = await sb.from('categories').insert({ slug, name_vi: slug }).select('id').single();
        if (error || !data) throw new Error(`Tạo danh mục "${slug}" thất bại`);
        catBySlug.set(slug, data.id);
        return data.id;
    };
    const ensureBrand = async (slug: string): Promise<string | null> => {
        if (!slug) return null;
        if (brandBySlug.has(slug)) return brandBySlug.get(slug)!;
        const { data, error } = await sb.from('brands').insert({ slug, name: slug }).select('id').single();
        if (error || !data) throw new Error(`Tạo thương hiệu "${slug}" thất bại`);
        brandBySlug.set(slug, data.id);
        return data.id;
    };

    for (let i = 0; i < objs.length; i++) {
        const o = objs[i];
        const rowNum = i + 2;
        // Only columns present in the uploaded CSV are written, so a partial file
        // updates just those fields instead of nulling everything else.
        const has = (k: string) => k in o;
        try {
            const slug = normSlug(o.slug);
            if (!slug) throw new Error('Thiếu slug');
            const isNew = !existingSlugs.has(slug);

            const payload: Record<string, unknown> = { slug };

            if (has('price')) {
                const price = toMoney(o.price);
                if (!Number.isFinite(price) || price <= 0) throw new Error('Giá không hợp lệ');
                payload.price = price;
            } else if (isNew) {
                throw new Error('Thiếu cột giá (price) cho sản phẩm mới');
            }

            if (has('condition')) {
                const c = (o.condition || '').toLowerCase();
                if (c && !['new', 'like_new', 'vintage'].includes(c)) throw new Error(`condition không hợp lệ: "${o.condition}"`);
                payload.condition = c || 'new';
            } else if (isNew) {
                payload.condition = 'new';
            }

            if (has('sku')) payload.sku = o.sku || null;
            if (has('compare_at_price')) payload.compare_at_price = o.compare_at_price ? toMoney(o.compare_at_price) : null;
            if (has('stock_quantity')) payload.stock_quantity = toInt(o.stock_quantity, 0);
            if (has('category_slug')) payload.category_id = await ensureCategory(normSlug(o.category_slug));
            if (has('brand_slug')) payload.brand_id = await ensureBrand(normSlug(o.brand_slug));
            if (has('topology')) {
                const tp = (o.topology || '').toLowerCase();
                if (tp && !['se', 'pp'].includes(tp)) throw new Error(`topology không hợp lệ: "${o.topology}"`);
                payload.topology = tp || null;
            }
            if (has('tube_type')) payload.tube_type = o.tube_type || null;
            if (has('power_watts')) payload.power_watts = o.power_watts ? toNum(o.power_watts) : null;
            if (has('taps')) payload.taps = o.taps ? o.taps.split('|').map((s) => s.trim()).filter(Boolean) : [];
            if (has('min_speaker_sensitivity'))
                payload.min_speaker_sensitivity = o.min_speaker_sensitivity ? toInt(o.min_speaker_sensitivity) : null;
            if (has('specifications')) payload.specifications = decodeSpecs(o.specifications);
            if (has('is_published')) payload.is_published = parseBool(o.is_published, false);
            if (has('is_featured')) payload.is_featured = parseBool(o.is_featured, false);
            if (has('is_vintage')) payload.is_vintage = parseBool(o.is_vintage, false);

            const { data: prod, error } = await sb
                .from('products')
                .upsert(payload, { onConflict: 'slug' })
                .select('id')
                .single();
            if (error || !prod) throw new Error(error?.message || 'Upsert sản phẩm thất bại');

            // Translations: only touch a locale when its columns are present (or on create),
            // merging with existing values so a partial CSV doesn't wipe the other fields.
            const wantVi = isNew || has('name_vi') || has('short_description_vi') || has('description_vi');
            const wantEn = isNew || has('name_en') || has('short_description_en') || has('description_en');
            if (wantVi || wantEn) {
                const existingTrans = isNew
                    ? []
                    : ((await sb
                          .from('product_translations')
                          .select('locale, name, short_description, description')
                          .eq('product_id', prod.id)).data ?? []);
                const exVi = existingTrans.find((t) => t.locale === 'vi');
                const exEn = existingTrans.find((t) => t.locale === 'en');
                const transRows: Record<string, unknown>[] = [];
                if (wantVi) {
                    transRows.push({
                        product_id: prod.id,
                        locale: 'vi',
                        name: has('name_vi') ? o.name_vi || slug : exVi?.name || slug,
                        short_description: has('short_description_vi') ? o.short_description_vi || null : exVi?.short_description ?? null,
                        description: has('description_vi') ? o.description_vi || null : exVi?.description ?? null,
                    });
                }
                if (wantEn) {
                    transRows.push({
                        product_id: prod.id,
                        locale: 'en',
                        name: has('name_en') ? o.name_en || o.name_vi || slug : exEn?.name || o.name_vi || slug,
                        short_description: has('short_description_en') ? o.short_description_en || null : exEn?.short_description ?? null,
                        description: has('description_en') ? o.description_en || null : exEn?.description ?? null,
                    });
                }
                const { error: tErr } = await sb
                    .from('product_translations')
                    .upsert(transRows, { onConflict: 'product_id,locale' });
                if (tErr) throw new Error(tErr.message);
            }

            if (isNew) {
                result.created++;
                existingSlugs.add(slug);
            } else {
                result.updated++;
            }
        } catch (e) {
            result.errors.push({ row: rowNum, message: msg(e) });
        }
    }
    return result;
}
