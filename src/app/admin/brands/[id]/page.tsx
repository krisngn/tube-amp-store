import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/admin/auth';
import { adminGetBrandById } from '@/lib/repositories/admin/brands';
import BrandForm from '../BrandForm';

export const dynamic = 'force-dynamic';

interface EditBrandPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditBrandPage({ params }: EditBrandPageProps) {
    const { id } = await params;
    await requireAdmin();
    const t = await getTranslations({ locale: 'vi', namespace: 'admin' });

    const brand = await adminGetBrandById(id);
    if (!brand) notFound();

    return (
        <div>
            <h1>
                {t('brands.edit')}: {brand.name}
            </h1>
            <BrandForm brand={brand} />
        </div>
    );
}
