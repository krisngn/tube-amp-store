import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { guides } from '@/lib/content/guides';
import styles from '../page.module.css';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const guide = guides.find(entry => entry.slug === slug);
    if (!guide) return { title: 'Guide not found' };
    const article = (await getLocale()) === 'en' ? guide.en : guide.vi;
    return { title: article.title, description: article.intro };
}

export default async function GuidePage({ params }: Props) {
    const { slug } = await params;
    const guide = guides.find(entry => entry.slug === slug);
    if (!guide) notFound();
    const vi = (await getLocale()) !== 'en';
    const article = vi ? guide.vi : guide.en;
    return <div className={styles.guidesPage}><article className={`container ${styles.article}`}>
        <Link href="/guides">← {vi ? 'Cẩm nang Audio' : 'Audio guides'}</Link>
        <h1>{article.title}</h1>
        <p className={styles.intro}>{article.intro}</p>
        {article.sections.map(section => <section key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>)}
        <div className={styles.articleActions}><Link href="/products" className="btn btn-primary">{vi ? 'Xem sản phẩm' : 'Browse products'}</Link><Link href="/#tu-van" className="btn btn-secondary">{vi ? 'Tư vấn sản phẩm' : 'Product consultation'}</Link></div>
    </article></div>;
}
