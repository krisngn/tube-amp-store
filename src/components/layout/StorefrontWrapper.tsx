'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import type { CategoryDTO } from '@/lib/types/catalog';

/**
 * Conditionally renders Header and Footer for storefront pages only
 * Admin pages are excluded
 */
export default function StorefrontWrapper({
    children,
    categories = [],
}: {
    children: React.ReactNode;
    categories?: CategoryDTO[];
}) {
    const pathname = usePathname();
    const isAdminRoute = pathname?.includes('/admin') || false;

    if (isAdminRoute) {
        return <>{children}</>;
    }

    return (
        <div className="app-wrapper">
            <Header categories={categories} />
            <main className="main-content">{children}</main>
            <Footer />
        </div>
    );
}

