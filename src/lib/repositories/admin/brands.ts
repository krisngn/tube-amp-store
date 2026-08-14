import { createServiceClient } from '@/lib/supabase/service';

/**
 * Admin Brands Repository
 * Server-only. Uses the service-role key to bypass RLS.
 */

export interface AdminBrand {
    id: string;
    slug: string;
    name: string;
    nameEn: string | null;
    descriptionVi: string | null;
    descriptionEn: string | null;
    logoPath: string | null;
    sortOrder: number;
    isActive: boolean;
}

export interface CreateBrandPayload {
    slug: string;
    name: string;
    nameEn?: string;
    descriptionVi?: string;
    descriptionEn?: string;
    logoPath?: string;
    sortOrder?: number;
    isActive?: boolean;
}

export interface UpdateBrandPayload extends Partial<CreateBrandPayload> {
    id: string;
}

interface BrandRow {
    id: string;
    slug: string;
    name: string;
    name_en: string | null;
    description_vi: string | null;
    description_en: string | null;
    logo_path: string | null;
    sort_order: number;
    is_active: boolean;
}

function mapRow(row: BrandRow): AdminBrand {
    return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        nameEn: row.name_en,
        descriptionVi: row.description_vi,
        descriptionEn: row.description_en,
        logoPath: row.logo_path,
        sortOrder: row.sort_order,
        isActive: row.is_active,
    };
}

const normalizeSlug = (slug: string) => slug.toLowerCase().trim().replace(/\s+/g, '-');

export async function adminListBrands(): Promise<AdminBrand[]> {
    const supabase = createServiceClient();
    const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

    if (error) {
        console.error('Error listing brands:', error);
        throw new Error('Failed to list brands');
    }
    return ((data || []) as BrandRow[]).map(mapRow);
}

export async function adminGetBrandById(id: string): Promise<AdminBrand | null> {
    const supabase = createServiceClient();
    const { data, error } = await supabase.from('brands').select('*').eq('id', id).single();
    if (error || !data) return null;
    return mapRow(data as BrandRow);
}

export async function adminCreateBrand(payload: CreateBrandPayload): Promise<string> {
    const supabase = createServiceClient();
    const slug = normalizeSlug(payload.slug);

    const { data: existing } = await supabase.from('brands').select('id').eq('slug', slug).maybeSingle();
    if (existing) throw new Error('Brand slug already exists');

    const { data, error } = await supabase
        .from('brands')
        .insert({
            slug,
            name: payload.name,
            name_en: payload.nameEn || null,
            description_vi: payload.descriptionVi || null,
            description_en: payload.descriptionEn || null,
            logo_path: payload.logoPath || null,
            sort_order: payload.sortOrder ?? 0,
            is_active: payload.isActive ?? true,
        })
        .select('id')
        .single();

    if (error || !data) {
        console.error('Error creating brand:', error);
        throw new Error(error?.message || 'Failed to create brand');
    }
    return data.id;
}

export async function adminUpdateBrand(payload: UpdateBrandPayload): Promise<void> {
    const supabase = createServiceClient();
    const updateData: Record<string, unknown> = {};

    if (payload.slug !== undefined) updateData.slug = normalizeSlug(payload.slug);
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.nameEn !== undefined) updateData.name_en = payload.nameEn || null;
    if (payload.descriptionVi !== undefined) updateData.description_vi = payload.descriptionVi || null;
    if (payload.descriptionEn !== undefined) updateData.description_en = payload.descriptionEn || null;
    if (payload.logoPath !== undefined) updateData.logo_path = payload.logoPath || null;
    if (payload.sortOrder !== undefined) updateData.sort_order = payload.sortOrder;
    if (payload.isActive !== undefined) updateData.is_active = payload.isActive;

    const { error } = await supabase.from('brands').update(updateData).eq('id', payload.id);
    if (error) {
        console.error('Error updating brand:', error);
        throw new Error(error.message || 'Failed to update brand');
    }
}

/**
 * Delete a brand. Blocked if products still reference it.
 */
export async function adminDeleteBrand(id: string): Promise<void> {
    const supabase = createServiceClient();

    const { count: productCount } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', id);
    if (productCount && productCount > 0) {
        throw new Error('Không thể xóa: vẫn còn sản phẩm thuộc thương hiệu này');
    }

    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) {
        console.error('Error deleting brand:', error);
        throw new Error(error.message || 'Failed to delete brand');
    }
}
