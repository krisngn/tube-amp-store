'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import styles from './page.module.css';
import { guides } from '@/lib/content/guides';
import { useLocale } from 'next-intl';

export default function GuidesPage() {
    const t = useTranslations('guide');
    const vi = useLocale() !== 'en';

    return (
        <div className={styles.guidesPage}>
            <div className="container">
                <h1>{t('title')}</h1>
                <p className={styles.subtitle}>{t('subtitle')}</p>

                <div className={styles.guidesGrid}>
                    {guides.map((guide) => (
                        <Link key={guide.slug} href={`/guides/${guide.slug}`} className={`${styles.guideCard} card`}>
                            <div className={styles.guideIcon}>📚</div>
                            <h3>{(vi ? guide.vi : guide.en).title}</h3>
                            <p>{(vi ? guide.vi : guide.en).intro}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
