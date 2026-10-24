'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import type { ProductCardDTO } from '@/lib/types/catalog';
import QuickCartButton from './QuickCartButton';
import styles from './ProductGrid.module.css';

export default function ProductGrid({ products }: { products: ProductCardDTO[] }) {
    const t = useTranslations('collection');
    const tCommon = useTranslations('common');
    const locale = useLocale();
    const price = (value: number) => `${value.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')} ₫`;
    return <div className={styles.grid}>
        {products.map((product) => <article key={product.id} className={styles.card}>
            <Link href={`/product/${product.slug}`} className={styles.image} aria-label={product.name}>
                {product.imageUrl && product.imageUrl !== '/images/placeholder-product.jpg' ? <Image src={product.imageUrl} alt={product.name} fill style={{ objectFit: 'contain' }} sizes="(max-width: 359px) 100vw, (max-width: 640px) 50vw, (max-width: 1200px) 33vw, 25vw" unoptimized /> : <div className="skeleton w-full h-full" />}
            </Link>
            <div className={styles.body}>
                <div className={styles.badges}>
                    {product.topology && product.tubeType && <span className="badge badge-accent">{product.topology.toUpperCase()} {product.tubeType}</span>}
                    <span className="badge">{product.condition === 'new' ? tCommon('new') : product.condition === 'like_new' ? tCommon('likeNew') : tCommon('vintage')}</span>
                    {!product.isInStock && <span className="badge badge-error">{tCommon('outOfStock')}</span>}
                </div>
                <p className={styles.brand}>{product.brandName || '\u00a0'}</p>
                <h3 className={styles.name}><Link href={`/product/${product.slug}`}>{product.name}</Link></h3>
                {product.powerWatts != null && <p className={styles.specs}>{t('productCard.power', { watts: product.powerWatts })}{product.recommendedSensitivityMin != null && ` · ${t('productCard.minSensitivity', { db: product.recommendedSensitivityMin })}`}</p>}
                <div className={styles.footer}>
                    <p className={styles.price}><span>{price(product.priceVnd)}{product.priceMaxVnd != null && product.priceMaxVnd > product.priceVnd && ` – ${price(product.priceMaxVnd)}`}</span>{product.compareAtPriceVnd && <del className="text-sm text-tertiary">{price(product.compareAtPriceVnd)}</del>}</p>
                    <div className={styles.actions}>
                        <Link href={`/product/${product.slug}`} className={styles.details}>{t('productCard.viewDetails')}<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></Link>
                        <QuickCartButton product={product} />
                    </div>
                </div>
            </div>
        </article>)}
    </div>;
}
