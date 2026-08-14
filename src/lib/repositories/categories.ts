import { createClient } from '@/lib/supabase/server';
import { getPublicImageUrl } from '@/lib/utils/images';
import { buildCategoryTree } from './products';
import type { CategoryDTO } from '@/lib/types/catalog';

/**
 * Public Categories Repository (read-only, active categories only via RLS).
 */

/**
 * List active categories as a 2-level tree (parents with children).
 */
export async function listCategories(locale: string = 'vi'): Promise<CategoryDTO[]> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('categories')
            .select('id, slug, parent_id, name_vi, name_en, image_path, sort_order')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('name_vi', { ascending: true });

        if (error) {
            console.error('Error listing categories:', error);
            return [];
        }
        return buildCategoryTree(data || [], locale);
    } catch (error) {
        console.error('Repository error in listCategories:', error);
        return [];
    }
}

/**
 * Get a single active category by slug (with its parent slug/name resolved).
 */
export async function getCategoryBySlug(
    slug: string,
    locale: string = 'vi'
): Promise<(CategoryDTO & { parentName?: string; parentSlug?: string }) | null> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('categories')
            .select('id, slug, parent_id, name_vi, name_en, image_path, sort_order')
            .eq('slug', slug)
            .eq('is_active', true)
            .maybeSingle();

        if (error || !data) return null;

        let parentName: string | undefined;
        let parentSlug: string | undefined;
        if (data.parent_id) {
            const { data: parent } = await supabase
                .from('categories')
                .select('slug, name_vi, name_en')
                .eq('id', data.parent_id)
                .maybeSingle();
            if (parent) {
                parentName = (locale === 'en' ? parent.name_en || parent.name_vi : parent.name_vi) || parent.slug;
                parentSlug = parent.slug;
            }
        }

        return {
            id: data.id,
            slug: data.slug,
            parentId: data.parent_id,
            name: (locale === 'en' ? data.name_en || data.name_vi : data.name_vi) || data.slug,
            imageUrl: data.image_path ? getPublicImageUrl(data.image_path) : undefined,
            sortOrder: data.sort_order ?? 0,
            parentName,
            parentSlug,
        };
    } catch (error) {
        console.error('Repository error in getCategoryBySlug:', error);
        return null;
    }
}
