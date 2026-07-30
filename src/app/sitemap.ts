import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticUrls: MetadataRoute.Sitemap = ['', '/products', '/brands', '/guides', '/reviews', '/contact'].map(
        (path) => ({ url: `${BASE}${path || '/'}`, changeFrequency: 'weekly' })
    );

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !anonKey) return staticUrls;

        const sb = createClient(supabaseUrl, anonKey);
        const [{ data: products }, { data: categories }, { data: brands }] = await Promise.all([
            sb.from('products').select('slug, updated_at').eq('is_published', true),
            sb.from('categories').select('slug').eq('is_active', true),
            sb.from('brands').select('slug').eq('is_active', true),
        ]);

        const productUrls: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
            url: `${BASE}/product/${p.slug}`,
            lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
        }));
        const categoryUrls: MetadataRoute.Sitemap = (categories ?? []).map((c) => ({
            url: `${BASE}/products?category=${c.slug}`,
            changeFrequency: 'weekly',
        }));
        const brandUrls: MetadataRoute.Sitemap = (brands ?? []).map((b) => ({
            url: `${BASE}/brand/${b.slug}`,
            changeFrequency: 'weekly',
        }));

        return [...staticUrls, ...productUrls, ...categoryUrls, ...brandUrls];
    } catch {
        return staticUrls;
    }
}
