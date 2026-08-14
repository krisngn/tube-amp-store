import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/admin/auth';
import Link from 'next/link';
import ProductsList from './ProductsList';
import styles from './page.module.css';

interface AdminProductsPageProps {
    searchParams: Promise<{
        q?: string;
        status?: string;
        condition?: string;
        topology?: string;
        category?: string;
        brand?: string;
        page?: string;
        sort?: string;
    }>;
}

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
    await requireAdmin();
    const t = await getTranslations({ locale: 'vi', namespace: 'admin' });

    const searchParamsResolved = await searchParams;

    return (
        <div className={styles.productsPage}>
            <div className={styles.header}>
                <h1>{t('products.title')}</h1>
                <Link href="/admin/products/new" className="btn btn-primary">
                    {t('products.add')}
                </Link>
            </div>

            <Suspense fallback={<div>{t('loading')}</div>}>
                <ProductsList searchParams={searchParamsResolved} />
            </Suspense>
        </div>
    );
}
