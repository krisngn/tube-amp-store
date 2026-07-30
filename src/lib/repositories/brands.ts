import { createClient } from '@/lib/supabase/server';
import { getPublicImageUrl } from '@/lib/utils/images';
import type { BrandDTO } from '@/lib/types/catalog';

/**
 * Public Brands Repository (read-only, active brands only via RLS).
 */
export async function listBrands(locale: string = 'vi'): Promise<BrandDTO[]> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('brands')
            .select('id, slug, name, name_en, logo_path, sort_order')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            console.error('Error listing brands:', error);
            return [];
        }
        return (data || []).map((b) => ({
            id: b.id,
            slug: b.slug,
            name: (locale === 'en' ? b.name_en || b.name : b.name) || b.slug,
            logoUrl: b.logo_path ? getPublicImageUrl(b.logo_path) : undefined,
            sortOrder: b.sort_order ?? 0,
        }));
    } catch (error) {
        console.error('Repository error in listBrands:', error);
        return [];
    }
}

export async function getBrandBySlug(slug: string, locale: string = 'vi'): Promise<BrandDTO | null> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('brands')
            .select('id, slug, name, name_en, logo_path, sort_order')
            .eq('slug', slug)
            .eq('is_active', true)
            .maybeSingle();
        if (error || !data) return null;
        return {
            id: data.id,
            slug: data.slug,
            name: (locale === 'en' ? data.name_en || data.name : data.name) || data.slug,
            logoUrl: data.logo_path ? getPublicImageUrl(data.logo_path) : undefined,
            sortOrder: data.sort_order ?? 0,
        };
    } catch (error) {
        console.error('Repository error in getBrandBySlug:', error);
        return null;
    }
}
