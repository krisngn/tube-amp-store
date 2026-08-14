'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/browser';
import { useRouter } from 'next/navigation';
import styles from './AdminNav.module.css';

export default function AdminNav() {
    const t = useTranslations('admin');
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            const supabase = createClient();
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                console.error('[AdminNav] Logout error:', {
                    code: error.code,
                    message: error.message,
                });
            }
            
            router.push('/admin/login');
        } catch (error: any) {
            console.error('[AdminNav] Logout exception:', error);
            router.push('/admin/login');
        }
    };

    return (
        <nav className={styles.adminNav}>
            <div className={styles.navContainer}>
                <div className={styles.navBrand}>
                    <Link href="/admin">{t('title')}</Link>
                </div>

                <div className={styles.navLinks}>
                    <Link
                        href="/admin"
                        className={pathname === '/admin' ? styles.active : ''}
                    >
                        {t('dashboard.title')}
                    </Link>
                    <Link
                        href="/admin/products"
                        className={pathname?.includes('/admin/products') && !pathname?.includes('/new') && !pathname?.match(/\/[a-f0-9-]+$/) ? styles.active : ''}
                    >
                        {t('products.title')}
                    </Link>
                    <Link
                        href="/admin/categories"
                        className={pathname?.includes('/admin/categories') ? styles.active : ''}
                    >
                        {t('categories.title')}
                    </Link>
                    <Link
                        href="/admin/brands"
                        className={pathname?.includes('/admin/brands') ? styles.active : ''}
                    >
                        {t('brands.title')}
                    </Link>
                    <Link
                        href="/admin/orders"
                        className={pathname?.includes('/admin/orders') ? styles.active : ''}
                    >
                        {t('orders.title')}
                    </Link>
                    <Link
                        href="/admin/inventory"
                        className={pathname?.includes('/admin/inventory') ? styles.active : ''}
                    >
                        {t('inventory.title')}
                    </Link>
                    <Link
                        href="/admin/import-export"
                        className={pathname?.includes('/admin/import-export') ? styles.active : ''}
                    >
                        {t('importExport.title')}
                    </Link>
                </div>

                <div className={styles.navActions}>
                    <button onClick={handleLogout} className="btn btn-ghost">
                        {t('logout')}
                    </button>
                </div>
            </div>
        </nav>
    );
}
