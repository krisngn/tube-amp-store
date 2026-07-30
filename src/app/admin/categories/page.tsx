import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/auth';
import { adminListCategories } from '@/lib/repositories/admin/categories';
import CategoryTree from './CategoryTree';
import styles from '../taxonomy.module.css';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
    await requireAdmin();
    const t = await getTranslations({ locale: 'vi', namespace: 'admin' });
    const categories = await adminListCategories();

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>{t('categories.title')}</h1>
                <Link href="/admin/categories/new" className="btn btn-primary">
                    {t('categories.add')}
                </Link>
            </div>
            <CategoryTree categories={categories} />
        </div>
    );
}
