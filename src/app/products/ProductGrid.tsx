'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { ProductCardDTO } from '@/lib/types/catalog';
import Image from 'next/image';

interface ProductGridProps {
    products: ProductCardDTO[];
}

export default function ProductGrid({ products }: ProductGridProps) {
    const t = useTranslations('collection');
    const tCommon = useTranslations('common');

    return (
        <div className="products-grid grid gap-8" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {products.map((product) => (
                <div key={product.id} className="product-card card flex flex-col">
                    <div className="product-image w-full mb-4 rounded-md overflow-hidden bg-tertiary" style={{ aspectRatio: '4/3', position: 'relative' }}>
                        {product.imageUrl && product.imageUrl !== '/images/placeholder-product.jpg' ? (
                            <Image
                                src={product.imageUrl}
                                alt={product.name}
                                fill
                                style={{ objectFit: 'cover' }}
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                unoptimized={true}
                            />
                        ) : (
                            <div className="skeleton w-full h-full"></div>
                        )}
                    </div>

                    <div className="product-info flex-1 flex flex-col">
                        {/* Badges */}
                        <div className="product-badges flex gap-1 mb-2 flex-wrap">
                            {product.topology && product.tubeType && (
                                <span className="badge badge-accent">
                                    {product.topology.toUpperCase()} {product.tubeType}
                                </span>
                            )}
                            <span className="badge">
                                {product.condition === 'new' && tCommon('new')}
                                {product.condition === 'like_new' && tCommon('likeNew')}
                                {product.condition === 'vintage' && tCommon('vintage')}
                            </span>
                            {!product.isInStock && (
                                <span className="badge" style={{ background: 'var(--color-error)', color: 'white' }}>
                                    {tCommon('outOfStock')}
                                </span>
                            )}
                        </div>

                        {/* Brand */}
                        {product.brandName && (
                            <p className="text-sm text-tertiary m-0 mb-1">{product.brandName}</p>
                        )}

                        {/* Product Name */}
                        <h3 className="product-name text-lg mb-2">{product.name}</h3>

                        {/* Price */}
                        <p className="product-price text-xl font-semibold text-accent mb-2">
                            {product.priceVnd.toLocaleString()}{tCommon('currency')}
                            {product.compareAtPriceVnd && (
                                <span className="text-sm text-tertiary line-through ml-2">
                                    {product.compareAtPriceVnd.toLocaleString()}{tCommon('currency')}
                                </span>
                            )}
                        </p>

                        {/* Specs (amp-specific — only when present) */}
                        {product.powerWatts != null && (
                            <div className="product-specs text-sm text-tertiary mb-4">
                                <span>{t('productCard.power', { watts: product.powerWatts })}</span>
                                {product.recommendedSensitivityMin != null && (
                                    <>
                                        <span> • </span>
                                        <span>{t('productCard.minSensitivity', { db: product.recommendedSensitivityMin })}</span>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="product-actions mt-auto flex flex-col gap-2">
                            <Link
                                href={`/product/${product.slug}`}
                                className="btn btn-secondary w-full"
                            >
                                {t('productCard.viewDetails')}
                            </Link>
                            <button className="btn btn-ghost w-full">
                                {t('productCard.chatForMatching')}
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
