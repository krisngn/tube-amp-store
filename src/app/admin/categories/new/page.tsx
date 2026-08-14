import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/admin/auth';
import { adminListCategories } from '@/lib/repositories/admin/categories';
import CategoryForm from '../CategoryForm';

export const dynamic = 'force-dynamic';

interface NewCategoryPageProps {
    searchParams: Promise<{ parent?: string }>;
}

export default async function NewCategoryPage({ searchParams }: NewCategoryPageProps) {
    await requireAdmin();
    const t = await getTranslations({ locale: 'vi', namespace: 'admin' });
    const { parent } = await searchParams;

    const all = await adminListCategories();
    const options = all.map((c) => ({ id: c.id, nameVi: c.nameVi, parentId: c.parentId, sortOrder: c.sortOrder }));

    return (
        <div>
            <h1>{t('categories.add')}</h1>
            <CategoryForm allCategories={options} defaultParentId={parent} />
        </div>
    );
}
