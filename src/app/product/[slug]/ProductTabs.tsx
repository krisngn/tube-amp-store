'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ProductDetailDTO } from '@/lib/types/catalog';
import { formatWarranty, formatReturnPeriod } from '@/lib/utils/formatters';
import styles from './ProductTabs.module.css';

interface ProductTabsProps {
    product: ProductDetailDTO;
    locale: string;
}

export default function ProductTabs({ product, locale }: ProductTabsProps) {
    const t = useTranslations('product');
    const [activeTab, setActiveTab] = useState('overview');

    const tabs = [
        { id: 'overview', label: t('tabs.overview') },
        { id: 'specifications', label: t('tabs.specifications') },
        { id: 'sound', label: t('tabs.sound') },
        { id: 'matching', label: t('tabs.matching') },
        { id: 'condition', label: t('tabs.condition') },
        { id: 'shipping', label: t('tabs.shipping') },
        { id: 'reviews', label: t('tabs.reviews') },
    ];

    return (
        <div className={styles.productTabs}>
            {/* Tab Navigation */}
            <div className={styles.tabsNav}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className={`${styles.tabContent} card p-8`}>
                {activeTab === 'overview' && <OverviewTab product={product} />}
                {activeTab === 'specifications' && <SpecificationsTab product={product} />}
                {activeTab === 'sound' && <SoundTab product={product} />}
                {activeTab === 'matching' && <MatchingTab product={product} />}
                {activeTab === 'condition' && <ConditionTab product={product} />}
                {activeTab === 'shipping' && <ShippingTab product={product} locale={locale} />}
                {activeTab === 'reviews' && <ReviewsTab />}
            </div>
        </div>
    );
}

// Overview Tab
function OverviewTab({ product }: { product: ProductDetailDTO }) {
    const t = useTranslations('product');

    return (
        <div className="overview-content">
            {product.description ? (
                <div
                    className="prose"
                    dangerouslySetInnerHTML={{ __html: product.description }}
                />
            ) : (
                <p className="text-secondary">{t('empty.noDescription')}</p>
            )}
        </div>
    );
}

// Specifications Tab
function SpecificationsTab({ product }: { product: ProductDetailDTO }) {
    const t = useTranslations('product');

    const hasSpecs = product.specs && Object.keys(product.specs).length > 0;
    const hasBasicInfo = product.topology || product.tubeType || product.powerWatts;

    if (!hasSpecs && !hasBasicInfo) {
        return <p className="text-secondary">{t('empty.noSpecs')}</p>;
    }

    return (
        <table className={styles.specsTable}>
            <tbody>
                {product.topology && (
                    <tr>
                        <td>{t('specifications.topology')}</td>
                        <td>{product.topology.toUpperCase()}</td>
                    </tr>
                )}
                {product.tubeType && (
                    <tr>
                        <td>{t('specifications.tubeType')}</td>
                        <td>{product.tubeType}</td>
                    </tr>
                )}
                {product.powerWatts && (
                    <tr>
                        <td>{t('specifications.power')}</td>
                        <td>{product.powerWatts}W</td>
                    </tr>
                )}
                {product.taps && product.taps.length > 0 && (
                    <tr>
                        <td>{t('specifications.taps')}</td>
                        <td>{product.taps.join(', ')}</td>
                    </tr>
                )}
                {Object.entries(product.specs || {})
                    .filter(([, value]) => value !== undefined && value !== null && String(value) !== '')
                    .map(([key, value]) => (
                        <tr key={key}>
                            <td>{key}</td>
                            <td>{String(value)}</td>
                        </tr>
                    ))}
            </tbody>
        </table>
    );
}

// Sound Tab
function SoundTab({ product }: { product: ProductDetailDTO }) {
    const t = useTranslations('product');

    if (!product.soundCharacter && (!product.recommendedGenres || product.recommendedGenres.length === 0)) {
        return <p className="text-secondary">{t('empty.noDescription')}</p>;
    }

    return (
        <div>
            {product.soundCharacter && (
                <div className="mb-6">
                    <h3 className="mb-4">{t('sound.character')}</h3>
                    <p className="text-secondary">{product.soundCharacter}</p>
                </div>
            )}
            {product.recommendedGenres && product.recommendedGenres.length > 0 && (
                <div>
                    <h3 className="mb-4">{t('sound.recommendedGenres')}</h3>
                    <div className={styles.genreChips}>
                        {product.recommendedGenres.map((genre, index) => (
                            <span key={index} className="badge badge-accent">
                                {genre}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Matching Tab
function MatchingTab({ product }: { product: ProductDetailDTO }) {
    const t = useTranslations('product');

    return (
        <div>
            {product.matchingNotes && (
                <div className="mb-8">
                    <p className="text-secondary">{product.matchingNotes}</p>
                </div>
            )}

            <div className={styles.matchingSpecs}>
                {product.recommendedSensitivityMin && (
                    <div className={styles.matchingItem}>
                        <strong>{t('matching.recommendedSensitivity', { db: product.recommendedSensitivityMin })}</strong>
                    </div>
                )}
                {product.taps && product.taps.length > 0 && (
                    <div className={styles.matchingItem}>
                        <strong>{t('matching.taps', { taps: product.taps.join(', ') })}</strong>
                    </div>
                )}
                {product.powerWatts && (
                    <div className={styles.matchingItem}>
                        <strong>{t('specifications.power')}: {product.powerWatts}W</strong>
                    </div>
                )}
            </div>
        </div>
    );
}

// Condition Tab
function ConditionTab({ product }: { product: ProductDetailDTO }) {
    const t = useTranslations('product');
    const tCommon = useTranslations('common');

    return (
        <div className="condition-content">
            <div className="mb-6">
                <h3 className="mb-2">{t('tabs.condition')}</h3>
                <span className="badge badge-accent">
                    {product.condition === 'new' && tCommon('new')}
                    {product.condition === 'like_new' && tCommon('likeNew')}
                    {product.condition === 'vintage' && tCommon('vintage')}
                </span>
            </div>

            {product.conditionNotes && (
                <div className="mb-6">
                    <p className="text-secondary">{product.conditionNotes}</p>
                </div>
            )}

            {product.originStory && product.isVintage && (
                <div>
                    <h3 className="mb-2">{t('condition.originStory')}</h3>
                    <p className="text-secondary">{product.originStory}</p>
                </div>
            )}
        </div>
    );
}

// Shipping Tab
function ShippingTab({ product, locale }: { product: ProductDetailDTO; locale: string }) {
    const t = useTranslations('product');

    // Default warranty and return periods (since they're not in the database)
    const defaultWarrantyMonths = product.condition === 'new' ? 12 : product.condition === 'like_new' ? 6 : 0;
    const defaultReturnDays = product.condition === 'vintage' ? 7 : 14;

    return (
        <div>
            <h3 className="mb-4">{t('shipping.title')}</h3>

            <div className={styles.shippingInfo}>
                <div className={styles.infoItem}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <span>{t('shipping.warranty', { months: formatWarranty(product.warrantyMonths || defaultWarrantyMonths, locale) })}</span>
                </div>

                <div className={styles.infoItem}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <span>{t('shipping.returns', { days: formatReturnPeriod(product.returnDays || defaultReturnDays, locale) })}</span>
                </div>

                <div className={styles.infoItem}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <span>{t('shipping.freeShipping')}</span>
                </div>

                <div className={styles.infoItem}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <span>{t('shipping.packaging')}</span>
                </div>
            </div>
        </div>
    );
}

// Reviews Tab
function ReviewsTab() {
    const t = useTranslations('product');

    return (
        <div className="reviews-content text-center py-12">
            <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                className="mx-auto mb-4"
                style={{ color: 'var(--color-text-tertiary)' }}
            >
                <path
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    stroke="currentColor"
                    strokeWidth="2"
                />
            </svg>
            <p className="text-secondary">{t('empty.noReviews')}</p>
        </div>
    );
}
