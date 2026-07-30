import { createServiceClient } from '@/lib/supabase/service';

/**
 * Admin Categories Repository
 * Server-only. Uses the service-role key to bypass RLS.
 * Categories form a 2-level tree (parent -> child) enforced by a DB trigger.
 */

export interface AdminCategory {
    id: string;
    slug: string;
    parentId: string | null;
    nameVi: string;
    nameEn: string | null;
    descriptionVi: string | null;
    descriptionEn: string | null;
    imagePath: string | null;
    sortOrder: number;
    isActive: boolean;
    parentName?: string | null; // convenience for list display
    productCount?: number; // number of products directly in this category
}

export interface CreateCategoryPayload {
    slug: string;
    parentId?: string | null;
    nameVi: string;
    nameEn?: string;
    descriptionVi?: string;
    descriptionEn?: string;
    imagePath?: string;
    sortOrder?: number;
    isActive?: boolean;
}

export interface UpdateCategoryPayload extends Partial<CreateCategoryPayload> {
    id: string;
}

interface CategoryRow {
    id: string;
    slug: string;
    parent_id: string | null;
    name_vi: string;
    name_en: string | null;
    description_vi: string | null;
    description_en: string | null;
    image_path: string | null;
    sort_order: number;
    is_active: boolean;
}

function mapRow(row: CategoryRow): AdminCategory {
    return {
        id: row.id,
        slug: row.slug,
        parentId: row.parent_id,
        nameVi: row.name_vi,
        nameEn: row.name_en,
        descriptionVi: row.description_vi,
        descriptionEn: row.description_en,
        imagePath: row.image_path,
        sortOrder: row.sort_order,
        isActive: row.is_active,
    };
}

const normalizeSlug = (slug: string) => slug.toLowerCase().trim().replace(/\s+/g, '-');

/**
 * List all categories (flat, sorted by sort_order then name). The UI builds the
 * nested tree from this list. Each row includes parentName + productCount.
 */
export async function adminListCategories(): Promise<AdminCategory[]> {
    const supabase = createServiceClient();
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name_vi', { ascending: true });

    if (error) {
        console.error('Error listing categories:', error);
        throw new Error('Failed to list categories');
    }

    const rows = (data || []) as CategoryRow[];
    const nameById = new Map(rows.map((r) => [r.id, r.name_vi]));

    // Direct product counts per category
    const { data: prodRows } = await supabase.from('products').select('category_id');
    const countByCat = new Map<string, number>();
    for (const p of prodRows || []) {
        const cid = (p as { category_id: string | null }).category_id;
        if (cid) countByCat.set(cid, (countByCat.get(cid) || 0) + 1);
    }

    return rows.map((r) => ({
        ...mapRow(r),
        parentName: r.parent_id ? nameById.get(r.parent_id) ?? null : null,
        productCount: countByCat.get(r.id) ?? 0,
    }));
}

export async function adminGetCategoryById(id: string): Promise<AdminCategory | null> {
    const supabase = createServiceClient();
    const { data, error } = await supabase.from('categories').select('*').eq('id', id).single();
    if (error || !data) return null;
    return mapRow(data as CategoryRow);
}

export async function adminCreateCategory(payload: CreateCategoryPayload): Promise<string> {
    const supabase = createServiceClient();
    const slug = normalizeSlug(payload.slug);

    const { data: existing } = await supabase.from('categories').select('id').eq('slug', slug).maybeSingle();
    if (existing) throw new Error('Category slug already exists');

    const { data, error } = await supabase
        .from('categories')
        .insert({
            slug,
            parent_id: payload.parentId || null,
            name_vi: payload.nameVi,
            name_en: payload.nameEn || null,
            description_vi: payload.descriptionVi || null,
            description_en: payload.descriptionEn || null,
            image_path: payload.imagePath || null,
            sort_order: payload.sortOrder ?? 0,
            is_active: payload.isActive ?? true,
        })
        .select('id')
        .single();

    if (error || !data) {
        console.error('Error creating category:', error);
        throw new Error(error?.message || 'Failed to create category');
    }
    return data.id;
}

export async function adminUpdateCategory(payload: UpdateCategoryPayload): Promise<void> {
    const supabase = createServiceClient();
    const updateData: Record<string, unknown> = {};

    if (payload.slug !== undefined) updateData.slug = normalizeSlug(payload.slug);
    if (payload.parentId !== undefined) updateData.parent_id = payload.parentId || null;
    if (payload.nameVi !== undefined) updateData.name_vi = payload.nameVi;
    if (payload.nameEn !== undefined) updateData.name_en = payload.nameEn || null;
    if (payload.descriptionVi !== undefined) updateData.description_vi = payload.descriptionVi || null;
    if (payload.descriptionEn !== undefined) updateData.description_en = payload.descriptionEn || null;
    if (payload.imagePath !== undefined) updateData.image_path = payload.imagePath || null;
    if (payload.sortOrder !== undefined) updateData.sort_order = payload.sortOrder;
    if (payload.isActive !== undefined) updateData.is_active = payload.isActive;

    const { error } = await supabase.from('categories').update(updateData).eq('id', payload.id);
    if (error) {
        console.error('Error updating category:', error);
        throw new Error(error.message || 'Failed to update category');
    }
}

/**
 * Delete a category. Blocked if it still has subcategories or products.
 */
export async function adminDeleteCategory(id: string): Promise<void> {
    const supabase = createServiceClient();

    const { count: childCount } = await supabase
        .from('categories')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', id);
    if (childCount && childCount > 0) {
        throw new Error('Không thể xóa: danh mục vẫn còn danh mục con');
    }

    const { count: productCount } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', id);
    if (productCount && productCount > 0) {
        throw new Error('Không thể xóa: vẫn còn sản phẩm thuộc danh mục này');
    }

    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
        console.error('Error deleting category:', error);
        throw new Error(error.message || 'Failed to delete category');
    }
}
