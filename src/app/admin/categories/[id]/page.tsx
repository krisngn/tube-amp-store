import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/admin/auth';
import { adminGetCategoryById, adminListCategories } from '@/lib/repositories/admin/categories';
import CategoryForm from '../CategoryForm';

export const dynamic = 'force-dynamic';

interface EditCategoryPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
    const { id } = await params;
    await requireAdmin();
    const t = await getTranslations({ locale: 'vi', namespace: 'admin' });

    const category = await adminGetCategoryById(id);
    if (!category) notFound();

    const all = await adminListCategories();
    const options = all.map((c) => ({ id: c.id, nameVi: c.nameVi, parentId: c.parentId, sortOrder: c.sortOrder }));

    return (
        <div>
            <h1>
                {t('categories.edit')}: {category.nameVi}
            </h1>
            <CategoryForm category={category} allCategories={options} />
        </div>
    );
}
