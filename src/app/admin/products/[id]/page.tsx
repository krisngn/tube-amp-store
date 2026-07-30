import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireAdmin } from '@/lib/admin/auth';
import { adminGetProductById } from '@/lib/repositories/admin/products';
import { adminListCategories } from '@/lib/repositories/admin/categories';
import { adminListBrands } from '@/lib/repositories/admin/brands';
import ProductForm from '../ProductForm';

interface EditProductPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
    const { id } = await params;
    await requireAdmin();
    const t = await getTranslations({ locale: 'vi', namespace: 'admin' });

    const product = await adminGetProductById(id);

    if (!product) {
        notFound();
    }

    const [categories, brands] = await Promise.all([adminListCategories(), adminListBrands()]);
    const categoryOptions = categories.map((c) => ({ id: c.id, nameVi: c.nameVi, parentId: c.parentId }));
    const brandOptions = brands.map((b) => ({ id: b.id, name: b.name }));

    return (
        <div>
            <h1>{t('products.edit')}: {product.name}</h1>
            <ProductForm product={product} categories={categoryOptions} brands={brandOptions} />
        </div>
    );
}
