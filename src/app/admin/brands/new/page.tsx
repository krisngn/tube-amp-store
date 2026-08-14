import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/admin/auth';
import BrandForm from '../BrandForm';

export const dynamic = 'force-dynamic';

export default async function NewBrandPage() {
    await requireAdmin();
    const t = await getTranslations({ locale: 'vi', namespace: 'admin' });

    return (
        <div>
            <h1>{t('brands.add')}</h1>
            <BrandForm />
        </div>
    );
}
