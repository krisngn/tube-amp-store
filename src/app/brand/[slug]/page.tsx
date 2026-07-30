import { notFound } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { listProducts } from '@/lib/repositories/products';
import { getBrandBySlug } from '@/lib/repositories/brands';
import type { ProductSort } from '@/lib/types/catalog';
import ProductGrid from '../../products/ProductGrid';
import SortSelect from '../../products/SortSelect';

interface PageProps {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const locale = await getLocale();
    const brand = await getBrandBySlug(slug, locale);
    if (!brand) return { title: 'Brand Not Found' };
    return { title: brand.name, description: brand.description || undefined };
}

export default async function BrandPage({ params, searchParams }: PageProps) {
    const { slug } = await params;
    const search = await searchParams;
    const locale = await getLocale();

    const brand = await getBrandBySlug(slug, locale);
    if (!brand) notFound();

    const sort = (search.sort as ProductSort) || 'newest';
    const page = search.page ? Number(search.page) : 1;
    const pageSize = 12;

    const [result, tc, tn] = await Promise.all([
        listProducts({ locale, filters: { brand: slug }, sort, pagination: { page, pageSize } }),
        getTranslations('collection'),
        getTranslations('nav'),
    ]);

    return (
        <div className="collection-page py-16">
            <div className="container">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-tertiary mb-8" style={{ flexWrap: 'wrap' }}>
                    <Link href="/">{tn('home')}</Link>
                    <span>/</span>
                    <Link href="/brands">{tc('brandsTitle')}</Link>
                    <span>/</span>
                    <span>{brand.name}</span>
                </nav>

                {/* Brand header */}
                <div className="flex items-center gap-6 mb-12" style={{ flexWrap: 'wrap' }}>
                    {brand.logoUrl && (
                        <Image
                            src={brand.logoUrl}
                            alt={brand.name}
                            width={96}
                            height={96}
                            unoptimized
                            style={{ objectFit: 'contain', borderRadius: 'var(--radius-md)' }}
                        />
                    )}
                    <div>
                        <h1 className="m-0">{brand.name}</h1>
                        {brand.description && (
                            <p className="text-secondary mt-2" style={{ maxWidth: '60ch' }}>
                                {brand.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Results + sort */}
                <div className="products-header flex justify-between items-center mb-8 flex-wrap gap-4">
                    <p className="results-count text-sm text-tertiary m-0">
                        {tc('results.showing', { count: result.total })}
                    </p>
                    <SortSelect currentSort={sort} />
                </div>

                {result.items.length === 0 ? (
                    <div className="empty-state text-center py-20">
                        <h3 className="mb-4">{tc('empty.title')}</h3>
                        <p className="text-secondary">{tc('empty.description')}</p>
                    </div>
                ) : (
                    <>
                        <ProductGrid products={result.items} />
                        {result.totalPages > 1 && (
                            <div className="pagination flex justify-center items-center gap-2 mt-12">
                                {page > 1 && (
                                    <Link href={`?page=${page - 1}`} className="btn btn-ghost">
                                        {tc('pagination.previous')}
                                    </Link>
                                )}
                                <span className="text-secondary px-4">
                                    {tc('pagination.pageOf', { current: page, total: result.totalPages })}
                                </span>
                                {page < result.totalPages && (
                                    <Link href={`?page=${page + 1}`} className="btn btn-ghost">
                                        {tc('pagination.next')}
                                    </Link>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
