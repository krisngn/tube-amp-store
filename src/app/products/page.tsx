import { getTranslations, getLocale } from 'next-intl/server';
import Link from 'next/link';
import { listProducts, getFilterOptions } from '@/lib/repositories/products';
import type { ProductSort, Topology, Condition, TubeType } from '@/lib/types/catalog';
import CollectionFilters from './CollectionFilters';
import ProductGrid from './ProductGrid';
import SortSelect from './SortSelect';

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
    const locale = await getLocale();
    const search = await searchParams;

    // Parse query parameters
    const category = search.category as string | undefined;
    const brand = search.brand as string | undefined;
    const topology = search.topology as Topology | Topology[] | undefined;
    const tubeType = search.tube as TubeType | TubeType[] | undefined;
    const condition = search.condition as Condition | Condition[] | undefined;
    const powerMin = search.powerMin ? Number(search.powerMin) : undefined;
    const powerMax = search.powerMax ? Number(search.powerMax) : undefined;
    const priceMin = search.priceMin ? Number(search.priceMin) : undefined;
    const priceMax = search.priceMax ? Number(search.priceMax) : undefined;
    const searchQuery = search.q as string | undefined;
    const sort = (search.sort as ProductSort) || 'newest';
    const page = Math.max(1, Math.floor(Number(search.page)) || 1);
    const pageSize = 12;

    const [result, filterOptions, t] = await Promise.all([
        listProducts({
            locale,
            filters: { category, brand, topology, tubeType, condition, powerMin, powerMax, priceMin, priceMax, search: searchQuery },
            sort,
            pagination: { page, pageSize },
        }),
        getFilterOptions(locale),
        getTranslations('collection'),
    ]);

    return (
        <div className="collection-page py-16">
            <div className="container">
                <div className="page-header mb-12">
                    <h1 className="text-center">{t('allProductsTitle')}</h1>
                </div>

                <div className="collection-layout" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 'var(--space-2xl)' }}>
                    {/* Filters Sidebar */}
                    <CollectionFilters
                        categories={filterOptions?.categories || []}
                        brands={filterOptions?.brands || []}
                    />

                    {/* Products Section */}
                    <div className="products-section">
                        <div className="products-header flex justify-between items-center mb-8 flex-wrap gap-4">
                            <p className="results-count text-sm text-tertiary m-0">
                                {t('results.showing', { count: result.total })}
                            </p>
                            <SortSelect currentSort={sort} />
                        </div>

                        {result.items.length === 0 ? (
                            <EmptyState t={t} />
                        ) : (
                            <>
                                <ProductGrid products={result.items} />
                                {result.totalPages > 1 && (
                                    <Pagination currentPage={result.page} totalPages={result.totalPages} t={t} />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Empty State Component
function EmptyState({ t }: { t: Awaited<ReturnType<typeof getTranslations<'collection'>>> }) {
    return (
        <div className="empty-state text-center py-20">
            <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                className="mx-auto mb-6"
                style={{ color: 'var(--color-text-tertiary)' }}
            >
                <path
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            <h3 className="mb-4">{t('empty.title')}</h3>
            <p className="text-secondary mb-8">{t('empty.description')}</p>
            <Link href="/products" className="btn btn-primary">
                {t('empty.clearFilters')}
            </Link>
        </div>
    );
}

// Pagination Component
function Pagination({ currentPage, totalPages, t }: { currentPage: number; totalPages: number; t: Awaited<ReturnType<typeof getTranslations<'collection'>>> }) {
    return (
        <div className="pagination flex justify-center items-center gap-2 mt-12">
            {currentPage > 1 && (
                <Link href={`?page=${currentPage - 1}`} className="btn btn-ghost">
                    {t('pagination.previous')}
                </Link>
            )}

            <span className="text-secondary px-4">
                {t('pagination.pageOf', { current: currentPage, total: totalPages })}
            </span>

            {currentPage < totalPages && (
                <Link href={`?page=${currentPage + 1}`} className="btn btn-ghost">
                    {t('pagination.next')}
                </Link>
            )}
        </div>
    );
}
