import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/admin/auth';
import { adminListProducts, adminListLowStock } from '@/lib/repositories/admin/products';
import { adminListCategories } from '@/lib/repositories/admin/categories';
import { adminListBrands } from '@/lib/repositories/admin/brands';
import styles from './taxonomy.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
    await requireAdmin();
    const t = await getTranslations({ locale: 'vi', namespace: 'admin' });

    const [products, categories, brands, lowStock] = await Promise.all([
        adminListProducts({ pagination: { page: 1, pageSize: 1 } }),
        adminListCategories(),
        adminListBrands(),
        adminListLowStock(),
    ]);

    const cards: Array<{ href: string; label: string; count: number | null }> = [
        { href: '/admin/products', label: t('products.title'), count: products.total },
        { href: '/admin/categories', label: t('categories.title'), count: categories.length },
        { href: '/admin/brands', label: t('brands.title'), count: brands.length },
        { href: '/admin/inventory', label: `${t('inventory.title')} (sắp hết)`, count: lowStock.length },
        { href: '/admin/orders', label: t('orders.title'), count: null },
        { href: '/admin/import-export', label: t('importExport.title'), count: null },
    ];

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>{t('dashboard.title')}</h1>
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 'var(--space-lg)',
                }}
            >
                {cards.map((c) => (
                    <Link
                        key={c.href}
                        href={c.href}
                        className="card"
                        style={{
                            padding: 'var(--space-xl)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--space-sm)',
                            textDecoration: 'none',
                        }}
                    >
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>{c.label}</span>
                        {c.count !== null && (
                            <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-accent-primary)' }}>
                                {c.count}
                            </span>
                        )}
                        <span style={{ color: 'var(--color-accent-primary)', fontSize: '0.85rem' }}>Quản lý →</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
