import { getTranslations, getLocale } from 'next-intl/server';
import Link from 'next/link';
import { listProducts } from '@/lib/repositories/products';
import { listCategories } from '@/lib/repositories/categories';
import ProductGrid from './products/ProductGrid';
import MatchingForm from './MatchingForm';
import styles from './HomePage.module.css';

export default async function HomePage() {
    const locale = await getLocale();
    const t = await getTranslations('home');

    const [categories, featured] = await Promise.all([
        listCategories(locale),
        listProducts({ locale, filters: { isFeatured: true }, pagination: { page: 1, pageSize: 8 } }),
    ]);

    // Fall back to newest products if nothing is flagged as featured yet
    let featuredItems = featured.items;
    if (featuredItems.length === 0) {
        const newest = await listProducts({ locale, sort: 'newest', pagination: { page: 1, pageSize: 8 } });
        featuredItems = newest.items;
    }

    const topCategories = categories.slice(0, 4);

    return (
        <div className={styles.homePage}>
            {/* Hero Section */}
            <section className={`${styles.hero} ${styles.section}`}>
                <div className={styles.heroBg}>
                    <div className={styles.heroOverlay}></div>
                </div>
                <div className="container">
                    <div className={styles.heroContent}>
                        <h1 className={`${styles.heroTitle} fade-in`}>{t('hero.title')}</h1>
                        <p className={`${styles.heroSubtitle} fade-in`}>{t('hero.subtitle')}</p>
                        <div className={`${styles.heroCta} fade-in`}>
                            <Link href="/products" className="btn btn-primary">
                                {t('hero.cta.browse')}
                            </Link>
                            <Link href="#matching" className="btn btn-secondary">
                                {t('hero.cta.matching')}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Shop by Category */}
            {topCategories.length > 0 && (
                <section className={styles.section}>
                    <div className="container">
                        <h2 className={styles.sectionTitle}>{t('quickEntry.title')}</h2>
                        <div className="grid grid-4">
                            {topCategories.map((cat) => (
                                <Link
                                    key={cat.id}
                                    href={`/products?category=${cat.slug}`}
                                    className={`${styles.quickEntryCard} card`}
                                >
                                    <h3>{cat.name}</h3>
                                    {cat.children && cat.children.length > 0 && (
                                        <p>{cat.children.map((c) => c.name).join(' · ')}</p>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Featured Products */}
            {featuredItems.length > 0 && (
                <section className={styles.section}>
                    <div className="container">
                        <div className={styles.guidesHeader}>
                            <h2 className={styles.sectionTitle}>{t('featured.title')}</h2>
                            <Link href="/products" className="btn btn-secondary">
                                {t('featured.viewAll')}
                            </Link>
                        </div>
                        <ProductGrid products={featuredItems} />
                    </div>
                </section>
            )}

            {/* Matching Advice Tool */}
            <div id="matching">
                <MatchingForm />
            </div>

            {/* Trust Section */}
            <section className={styles.section}>
                <div className="container">
                    <h2 className={styles.sectionTitle}>{t('trust.title')}</h2>
                    <div className="grid grid-3">
                        {['tested', 'packaging', 'warranty', 'vintage', 'setup', 'consultation'].map((key) => (
                            <div key={key} className={`${styles.trustCard} card`}>
                                <div className={styles.trustIcon}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </div>
                                <h3>{t(`trust.badges.${key}.title`)}</h3>
                                <p>{t(`trust.badges.${key}.description`)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Customer Setups */}
            <section className={styles.section}>
                <div className="container">
                    <h2 className={styles.sectionTitle}>{t('customerSetups.title')}</h2>
                    <p className={styles.sectionSubtitle}>{t('customerSetups.subtitle')}</p>
                    <div className={styles.setupsGallery}>
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className={styles.setupCard}>
                                <div className={`${styles.setupImage} skeleton`}></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Guides Preview */}
            <section className={styles.section}>
                <div className="container">
                    <div className={styles.guidesHeader}>
                        <h2 className={styles.sectionTitle}>{t('guidesPreview.title')}</h2>
                        <Link href="/guides" className="btn btn-secondary">
                            {t('guidesPreview.viewAll')}
                        </Link>
                    </div>
                    <div className="grid grid-3">
                        {[1, 2, 3].map((i) => (
                            <Link key={i} href={`/guides/article-${i}`} className={`${styles.guideCard} card`}>
                                <div className={styles.guideIcon}>📚</div>
                                <h3>Guide Title {i}</h3>
                                <p>Brief description of the guide content...</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
