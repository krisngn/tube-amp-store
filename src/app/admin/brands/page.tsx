import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/auth';
import { adminListBrands } from '@/lib/repositories/admin/brands';
import BrandsTable from './BrandsTable';
import styles from '../taxonomy.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminBrandsPage() {
    await requireAdmin();
    const t = await getTranslations({ locale: 'vi', namespace: 'admin' });
    const brands = await adminListBrands();

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>{t('brands.title')}</h1>
                <Link href="/admin/brands/new" className="btn btn-primary">
                    {t('brands.add')}
                </Link>
            </div>
            <BrandsTable brands={brands} />
        </div>
    );
}
