import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/admin/auth';
import { adminListCategories } from '@/lib/repositories/admin/categories';
import { adminListBrands } from '@/lib/repositories/admin/brands';
import ProductForm from '../ProductForm';

export default async function NewProductPage() {
    await requireAdmin();
    const t = await getTranslations({ locale: 'vi', namespace: 'admin' });

    const [categories, brands] = await Promise.all([adminListCategories(), adminListBrands()]);
    const categoryOptions = categories.map((c) => ({ id: c.id, nameVi: c.nameVi, parentId: c.parentId }));
    const brandOptions = brands.map((b) => ({ id: b.id, name: b.name }));

    return (
        <div>
            <h1>{t('products.add')}</h1>
            <ProductForm categories={categoryOptions} brands={brandOptions} />
        </div>
    );
}
