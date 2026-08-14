import { getTranslations, getLocale } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { listBrands } from '@/lib/repositories/brands';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('collection');
    return { title: t('brandsTitle') };
}

export default async function BrandsPage() {
    const locale = await getLocale();
    const [brands, t] = await Promise.all([listBrands(locale), getTranslations('collection')]);

    return (
        <div className="collection-page py-16">
            <div className="container">
                <div className="page-header mb-12">
                    <h1 className="text-center">{t('brandsTitle')}</h1>
                </div>

                {brands.length === 0 ? (
                    <p className="text-center text-secondary">{t('empty.title')}</p>
                ) : (
                    <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                        {brands.map((b) => (
                            <Link
                                key={b.id}
                                href={`/brand/${b.slug}`}
                                className="card flex flex-col items-center text-center"
                                style={{ padding: 'var(--space-xl)', gap: 'var(--space-md)', textDecoration: 'none' }}
                            >
                                {b.logoUrl ? (
                                    <Image
                                        src={b.logoUrl}
                                        alt={b.name}
                                        width={80}
                                        height={80}
                                        unoptimized
                                        style={{ objectFit: 'contain' }}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            width: 80,
                                            height: 80,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '2rem',
                                            fontWeight: 700,
                                            color: 'var(--color-text-tertiary)',
                                            background: 'var(--color-bg-tertiary)',
                                            borderRadius: 'var(--radius-md)',
                                        }}
                                    >
                                        {b.name.charAt(0)}
                                    </div>
                                )}
                                <span style={{ fontWeight: 600 }}>{b.name}</span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
