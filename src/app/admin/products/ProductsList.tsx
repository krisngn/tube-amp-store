import { getTranslations } from 'next-intl/server';
import { adminListProducts } from '@/lib/repositories/admin/products';
import { adminListCategories } from '@/lib/repositories/admin/categories';
import { adminListBrands } from '@/lib/repositories/admin/brands';
import ProductsFilters from './ProductsFilters';
import ProductsBulkActions from './ProductsBulkActions';
import styles from './page.module.css';
import Link from 'next/link';

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

    const labels = {
        name: t('products.list.name'),
        status: t('products.list.status'),
        price: t('products.list.price'),
        stock: t('products.list.stock'),
        category: t('products.list.category'),
        brand: t('products.list.brand'),
        topology: t('products.list.topology'),
        tubeType: t('products.list.tubeType'),
        updatedAt: t('products.list.updatedAt'),
        actions: t('products.list.actions'),
        edit: t('products.edit'),
        published: t('products.list.published'),
        draft: t('products.list.draft'),
    };

    return (
        <div>
            <ProductsFilters searchParams={searchParams} categories={categoryOptions} brands={brandOptions} />

            {result.items.length === 0 ? (
                <div className={styles.productsTable}>
                    <table>
                        <tbody>
                            <tr>
                                <td colSpan={11} className={styles.emptyCell}>
                                    {t('products.list.empty')}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ) : (
                <ProductsBulkActions products={result.items} labels={labels} />
            )}

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

