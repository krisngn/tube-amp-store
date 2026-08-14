'use client';

import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

interface SortSelectProps {
    currentSort: string;
}

export default function SortSelect({ currentSort }: SortSelectProps) {
    const t = useTranslations('collection');
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const handleSortChange = (newSort: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('sort', newSort);
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <select
            name="sort"
            value={currentSort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="input select sort-select"
            style={{ width: 'auto', minWidth: '200px' }}
        >
            <option value="newest">{t('sort.options.newest')}</option>
            <option value="price_asc">{t('sort.options.priceLow')}</option>
            <option value="price_desc">{t('sort.options.priceHigh')}</option>
            <option value="best_sellers">{t('sort.options.bestSellers')}</option>
        </select>
    );
}
