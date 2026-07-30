'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { flattenTree } from '@/lib/utils/categoryTree';
import styles from './page.module.css';

interface CategoryOption {
    id: string;
    nameVi: string;
    parentId: string | null;
    sortOrder?: number;
}

interface ProductsFiltersProps {
    searchParams: {
        q?: string;
        status?: string;
        condition?: string;
        topology?: string;
        category?: string;
        brand?: string;
    };
    categories: CategoryOption[];
    brands: { id: string; name: string }[];
}

export default function ProductsFilters({ searchParams, categories, brands }: ProductsFiltersProps) {
    const t = useTranslations('admin.products.list');
    const router = useRouter();
    const searchParamsObj = useSearchParams();

    const [q, setQ] = useState(searchParams.q ?? '');

    const setParam = (key: string, value: string, replace = true) => {
        const params = new URLSearchParams(searchParamsObj.toString());
        if (value) params.set(key, value);
        else params.delete(key);
        params.delete('page'); // reset to first page on any filter change
        const url = `/admin/products?${params.toString()}`;
        if (replace) router.replace(url, { scroll: false });
        else router.push(url);
    };

    // Live search: debounce typing, then update the query string.
    useEffect(() => {
        const timer = setTimeout(() => {
            const current = searchParamsObj.get('q') ?? '';
            if (q !== current) setParam('q', q);
        }, 350);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, searchParamsObj]);

    const categoryOptions = flattenTree(categories).map((n) => ({
        id: n.item.id,
        label: `${'  '.repeat(n.depth)}${n.item.nameVi}`,
    }));

    return (
        <div className={styles.filters}>
            <div className={styles.filterGroup}>
                <label className="label">{t('search')}</label>
                <input
                    type="text"
                    className="input"
                    placeholder={t('searchPlaceholder')}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
            </div>

            <div className={styles.filterGroup}>
                <label className="label">{t('status')}</label>
                <select
                    className="input"
                    value={searchParams.status || ''}
                    onChange={(e) => setParam('status', e.target.value)}
                >
                    <option value="">{t('statusAll')}</option>
                    <option value="published">{t('published')}</option>
                    <option value="draft">{t('draft')}</option>
                </select>
            </div>

            <div className={styles.filterGroup}>
                <label className="label">{t('category')}</label>
                <select
                    className="input"
                    value={searchParams.category || ''}
                    onChange={(e) => setParam('category', e.target.value)}
                >
                    <option value="">{t('categoryAll')}</option>
                    {categoryOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                            {o.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className={styles.filterGroup}>
                <label className="label">{t('brand')}</label>
                <select
                    className="input"
                    value={searchParams.brand || ''}
                    onChange={(e) => setParam('brand', e.target.value)}
                >
                    <option value="">{t('brandAll')}</option>
                    {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                            {b.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className={styles.filterGroup}>
                <label className="label">{t('condition')}</label>
                <select
                    className="input"
                    value={searchParams.condition || ''}
                    onChange={(e) => setParam('condition', e.target.value)}
                >
                    <option value="">{t('conditionAll')}</option>
                    <option value="new">{t('conditionNew')}</option>
                    <option value="like_new">{t('conditionLikeNew')}</option>
                    <option value="vintage">{t('conditionVintage')}</option>
                </select>
            </div>

            <div className={styles.filterGroup}>
                <label className="label">{t('topology')}</label>
                <select
                    className="input"
                    value={searchParams.topology || ''}
                    onChange={(e) => setParam('topology', e.target.value)}
                >
                    <option value="">{t('topologyAll')}</option>
                    <option value="se">SE</option>
                    <option value="pp">PP</option>
                </select>
            </div>
        </div>
    );
}
