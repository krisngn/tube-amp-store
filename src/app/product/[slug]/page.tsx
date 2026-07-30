import { notFound } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import Link from 'next/link';
import { getProductBySlug, getRelatedProducts } from '@/lib/repositories/products';
import { formatPrice, generateSummaryBullets } from '@/lib/utils/formatters';
import ProductGallery from './ProductGallery';
import ProductActions from './ProductActions';
import ProductTabs from './ProductTabs';
import ProductGrid from '../../products/ProductGrid';
import type { Metadata } from 'next';
import styles from './ProductPage.module.css';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const product = await getProductBySlug(slug, locale);

  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  return {
    title: product.metaTitle || product.name,
    description: product.metaDescription || product.shortDescription || product.description?.substring(0, 160),
    openGraph: {
      title: product.metaTitle || product.name,
      description: product.metaDescription || product.shortDescription,
      images: product.images.length > 0 ? [product.images[0].url] : [],
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getTranslations('product');
  const tCommon = await getTranslations('common');

  // Fetch product data
  const product = await getProductBySlug(slug, locale);

  if (!product) {
    notFound();
  }

  // Fetch related products (by category, falling back to brand)
  const relatedProducts = await getRelatedProducts(
    product.id,
    product.categoryId,
    product.brandId,
    locale,
    3
  );

  // Generate summary bullets
  const summaryBullets = generateSummaryBullets(product, locale);

  // Determine price to display
  const displayPrice = product.compareAtPriceVnd || product.priceVnd;
  const hasDiscount = !!product.compareAtPriceVnd;

  return (
    <div className={`${styles.productPage} py - 16`}>
      <div className="container">
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <Link href="/">{t('breadcrumb.home')}</Link>
          <span>/</span>
          <Link href="/products">{t('breadcrumb.collection')}</Link>
          {(product.categoryPath ?? []).map((c) => (
            <span key={c.slug} style={{ display: 'contents' }}>
              <span>/</span>
              <Link href={`/products?category=${c.slug}`}>{c.name}</Link>
            </span>
          ))}
          <span>/</span>
          <span>{product.name}</span>
        </nav>

        {/* Product Main Section */}
        <div className={styles.productMain}>
          {/* Gallery */}
          <div className={styles.gallerySection}>
            <ProductGallery images={product.images} productName={product.name} />
          </div>

          {/* Product Info */}
          <div className={styles.infoSection}>
            {/* Badges */}
            <div className={`${styles.badges} mb - 4`}>
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
              {product.isFeatured && (
                <span className="badge badge-success">{tCommon('recommended')}</span>
              )}
            </div>

            {/* Brand */}
            {product.brandName && (
              <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-sm)' }}>
                {product.brandSlug ? (
                  <Link href={`/brand/${product.brandSlug}`}>{product.brandName}</Link>
                ) : (
                  product.brandName
                )}
              </p>
            )}

            {/* Product Name */}
            <h1 className={styles.title}>{product.name}</h1>

            {/* Price */}
            <div className={styles.pricing}>
              {hasDiscount && (
                <p className={styles.originalPrice}>
                  {formatPrice(product.priceVnd, locale)}
                </p>
              )}
              <p className={styles.currentPrice}>
                {formatPrice(displayPrice, locale)}
              </p>
              {hasDiscount && (
                <p className={`${styles.savings} text - success text - sm mt - 1`}>
                  {t('pricing.saveAmount', {
                    amount: formatPrice(product.priceVnd - displayPrice, locale),
                  })}
                </p>
              )}
            </div>

            {/* Deposit Reservation Info */}
            {product.allowDeposit && (
              <div className="card p-6 mb-6 border-accent">
                <div className="flex items-start gap-4">
                  <div className="badge badge-accent">{t('deposit.badge')}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{t('deposit.title')}</h3>
                    <p className="text-sm text-secondary mb-3">{t('deposit.description')}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-secondary">{t('deposit.amount')}:</span>
                        <span className="font-semibold text-accent">
                          {product.depositType === 'percent' && product.depositPercentage
                            ? `${product.depositPercentage}% (${formatPrice((product.priceVnd * product.depositPercentage) / 100, locale)})`
                            : product.depositAmount
                            ? formatPrice(product.depositAmount, locale)
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-secondary">{t('deposit.remaining')}:</span>
                        <span className="text-sm">
                          {product.depositType === 'percent' && product.depositPercentage
                            ? formatPrice(product.priceVnd - (product.priceVnd * product.depositPercentage) / 100, locale)
                            : product.depositAmount
                            ? formatPrice(product.priceVnd - product.depositAmount, locale)
                            : 'N/A'}
                        </span>
                      </div>
                      {product.depositDueHours && (
                        <div className="flex justify-between">
                          <span className="text-sm text-secondary">{t('deposit.deadline')}:</span>
                          <span className="text-sm">{t('deposit.deadlineHours', { hours: product.depositDueHours })}</span>
                        </div>
                      )}
                      {product.reservationPolicyNote && (
                        <p className="text-xs text-tertiary mt-2 italic">{product.reservationPolicyNote}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            {summaryBullets.length > 0 && (
              <div className="card p-6 mb-6">
                <h3 className="text-base mb-4">{t('summary.title')}</h3>
                <ul className={styles.summaryList}>
                  {summaryBullets.map((bullet, index) => (
                    <li key={index}>{bullet}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Trust Badges */}
            <div className={`${styles.trustBadges} mb - 6`}>
              <div className={styles.trustBadge}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
                <span>{t('trust.tested')}</span>
              </div>
              <div className={styles.trustBadge}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
                <span>{t('trust.safeShipping')}</span>
              </div>
              <div className={styles.trustBadge}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
                <span>{t('trust.warranty')}</span>
              </div>
            </div>

            {/* Actions */}
            <ProductActions product={product} />
          </div>
        </div>

        {/* Matching Section */}
        {(product.recommendedSensitivityMin || (product.taps && product.taps.length > 0)) && (
          <section className={`${styles.matchingSection} card p-8 mb-16`}>
            <h2 className="mb-6">{t('matching.title')}</h2>
            <div className={styles.matchingInfo}>
              {product.recommendedSensitivityMin && (
                <div className={styles.matchingItem}>
                  <strong>
                    {t('matching.recommendedSensitivity', {
                      db: product.recommendedSensitivityMin,
                    })}
                  </strong>
                </div>
              )}
              {product.taps && product.taps.length > 0 && (
                <div className={styles.matchingItem}>
                  <strong>
                    {t('matching.taps', { taps: product.taps.join(', ') })}
                  </strong>
                </div>
              )}
              {product.powerWatts && (
                <div className={styles.matchingItem}>
                  <strong>
                    {t('specifications.power')}: {product.powerWatts}W
                  </strong>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Tabs */}
        <ProductTabs product={product} locale={locale} />

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className={styles.relatedProducts}>
            <h2 className="mb-8">{t('related.title')}</h2>
            <ProductGrid products={relatedProducts} />
          </section>
        )}
      </div>
    </div>
  );
}
