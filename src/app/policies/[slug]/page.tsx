import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import type { Metadata } from 'next';
import styles from '../policies.module.css';

const validPolicies = ['shipping', 'warranty', 'returns', 'payment', 'privacy', 'terms'] as const;
type PolicySlug = (typeof validPolicies)[number];

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    if (!validPolicies.includes(slug as PolicySlug)) {
        return { title: 'Chính Sách' };
    }
    const t = await getTranslations('policies');
    return {
        title: `${t(`${slug}.title` as any)} | Vintage Audio Accessories`,
        description: t(`${slug}.content` as any),
    };
}

export default async function PolicyDetailPage({ params }: PageProps) {
    const { slug } = await params;

    if (!validPolicies.includes(slug as PolicySlug)) {
        notFound();
    }

    const t = await getTranslations('policies');
    const policyKey = slug as PolicySlug;

    const navItems = [
        { slug: 'shipping', label: t('shipping.title') },
        { slug: 'warranty', label: t('warranty.title') },
        { slug: 'returns', label: t('returns.title') },
        { slug: 'payment', label: t('payment.title') },
        { slug: 'privacy', label: t('privacy.title') },
        { slug: 'terms', label: t('terms.title') },
    ];

    // Read details array from translations
    const details = (t.raw(`${policyKey}.details`) as Array<{ heading: string; text: string }>) || [];

    return (
        <div className={styles.policiesPage}>
            <div className="container">
                {/* Breadcrumb */}
                <div className={styles.breadcrumb}>
                    <Link href="/">Trang chủ</Link>
                    <span>/</span>
                    <Link href="/policies">Chính sách</Link>
                    <span>/</span>
                    <span>{t(`${policyKey}.title` as any)}</span>
                </div>

                <div className={styles.layout}>
                    {/* Sidebar navigation */}
                    <aside className={styles.sidebar}>
                        <h4 className={styles.sidebarTitle}>{t('allPolicies')}</h4>
                        <nav className={styles.sidebarNav}>
                            {navItems.map((item) => (
                                <Link
                                    key={item.slug}
                                    href={`/policies/${item.slug}`}
                                    className={`${styles.navItem} ${item.slug === policyKey ? styles.navItemActive : ''}`}
                                >
                                    <span>{item.label}</span>
                                    {item.slug === policyKey && <span>→</span>}
                                </Link>
                            ))}
                        </nav>
                    </aside>

                    {/* Content Card */}
                    <main className={styles.contentCard}>
                        <div className={styles.header}>
                            <span className={styles.badge}>{t(`${policyKey}.badge` as any)}</span>
                            <h1 className={styles.title}>{t(`${policyKey}.title` as any)}</h1>
                            <p className={styles.lead}>{t(`${policyKey}.content` as any)}</p>
                        </div>

                        {/* Details list */}
                        <div className={styles.detailsList}>
                            {details.map((section, idx) => (
                                <div key={idx} className={styles.detailSection}>
                                    <h3 className={styles.sectionHeading}>{section.heading}</h3>
                                    <p className={styles.sectionText}>{section.text}</p>
                                </div>
                            ))}
                        </div>

                        {/* Direct Support Box */}
                        <div className={styles.supportBox}>
                            <div className={styles.supportText}>
                                <h4>Cần tư vấn thêm về chính sách này?</h4>
                                <p>Đội ngũ chuyên viên sẵn sàng giải đáp 1-1 qua Zalo hoặc Hotline.</p>
                            </div>
                            <div className={styles.supportActions}>
                                <a
                                    href="https://zalo.me/0931772150"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary btn-sm"
                                >
                                    Chat Zalo: 0931 772 150
                                </a>
                                <a href="tel:0931772150" className="btn btn-secondary btn-sm">
                                    Gọi 0931 772 150
                                </a>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
