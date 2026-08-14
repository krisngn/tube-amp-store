import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { adminListProducts } from '@/lib/repositories/admin/products';
import { adminListCategories } from '@/lib/repositories/admin/categories';
import { adminListBrands } from '@/lib/repositories/admin/brands';
import ProductsFilters from './ProductsFilters';
import DeleteProductButton from './DeleteProductButton';
import styles from './page.module.css';

interface ProductsListProps {
    searchParams: {
        q?: string;
        status?: string;
        condition?: string;
        topology?: string;
        category?: string;
        brand?: string;
        page?: string;
        sort?: string;
    };
}

export default async function ProductsList({ searchParams }: ProductsListProps) {
    const t = await getTranslations({ locale: 'vi', namespace: 'admin' });

    const page = Number(searchParams.page) || 1;
    const pageSize = 20;

    const [result, categories, brands] = await Promise.all([
        adminListProducts({
            filters: {
                search: searchParams.q,
                status: searchParams.status as 'published' | 'draft' | undefined,
                condition: searchParams.condition as 'new' | 'like_new' | 'vintage' | undefined,
                topology: searchParams.topology as 'se' | 'pp' | undefined,
                category: searchParams.category,
                brand: searchParams.brand,
            },
            sort: { field: 'updated_at', direction: 'desc' },
            pagination: { page, pageSize },
        }),
        adminListCategories(),
        adminListBrands(),
    ]);

    const categoryOptions = categories.map((c) => ({
        id: c.id,
        nameVi: c.nameVi,
        parentId: c.parentId,
        sortOrder: c.sortOrder,
    }));
    const brandOptions = brands.map((b) => ({ id: b.id, name: b.name }));

    return (
        <div>
            <ProductsFilters searchParams={searchParams} categories={categoryOptions} brands={brandOptions} />

            <div className={styles.productsTable}>
                <table>
                    <thead>
                        <tr>
                            <th>{t('products.list.name')}</th>
                            <th>{t('products.list.status')}</th>
                            <th>{t('products.list.price')}</th>
                            <th>{t('products.list.stock')}</th>
                            <th>{t('products.list.category')}</th>
                            <th>{t('products.list.brand')}</th>
                            <th>{t('products.list.topology')}</th>
                            <th>{t('products.list.tubeType')}</th>
                            <th>{t('products.list.updatedAt')}</th>
                            <th>{t('products.list.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {result.items.length === 0 ? (
                            <tr>
                                <td colSpan={10} className={styles.emptyCell}>
                                    {t('products.list.empty')}
                                </td>
                            </tr>
                        ) : (
                            result.items.map((product) => (
                                <tr key={product.id}>
                                    <td>{product.name}</td>
                                    <td>
                                        <span className={`badge ${product.status === 'published' ? 'badge-success' : 'badge-secondary'}`}>
                                            {product.status === 'published' ? t('products.list.published') : t('products.list.draft')}
                                        </span>
                                    </td>
                                    <td>{product.price.toLocaleString()} VND</td>
                                    <td>{product.stock}</td>
                                    <td>{product.categoryName || '—'}</td>
                                    <td>{product.brandName || '—'}</td>
                                    <td>{product.topology ? product.topology.toUpperCase() : '—'}</td>
                                    <td>{product.tubeType || '—'}</td>
                                    <td>{new Date(product.updatedAt).toLocaleDateString()}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                            <Link
                                                href={`/admin/products/${product.id}`}
                                                className="btn btn-ghost btn-sm"
                                            >
                                                {t('products.edit')}
                                            </Link>
                                            <DeleteProductButton id={product.id} name={product.name} />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {result.totalPages > 1 && (
                <div className={styles.pagination}>
                    {page > 1 && (
                        <Link
                            href={`/admin/products?${new URLSearchParams({
                                ...searchParams,
                                page: String(page - 1),
                            })}`}
                            className="btn btn-ghost"
                        >
                            {t('pagination.previous')}
                        </Link>
                    )}
                    <span>
                        {t('pagination.page', { current: page, total: result.totalPages })}
                    </span>
                    {page < result.totalPages && (
                        <Link
                            href={`/admin/products?${new URLSearchParams({
                                ...searchParams,
                                page: String(page + 1),
                            })}`}
                            className="btn btn-ghost"
                        >
                            {t('pagination.next')}
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
