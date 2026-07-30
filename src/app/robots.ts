import type { MetadataRoute } from 'next';

// Set NEXT_PUBLIC_SITE_URL to your production domain (e.g. https://vintageaudio.vn)
const BASE = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/admin', '/api', '/cart', '/checkout', '/account', '/order-success', '/order/track'],
            },
        ],
        sitemap: `${BASE}/sitemap.xml`,
    };
}
