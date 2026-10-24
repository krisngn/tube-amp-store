'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import styles from './ProductSearch.module.css';

export default function ProductSearch() {
    const router = useRouter();
    const params = useSearchParams();
    const vi = useLocale() === 'vi';
    const current = params.get('q') ?? '';
    const [value, setValue] = useState(current);
    const [pending, startTransition] = useTransition();
    const serialized = params.toString();

    useEffect(() => {
        // URL navigation (including Back/Forward) is an external source of input state.
        setValue(current);
    }, [current]);

    useEffect(() => {
        const query = value.trim().slice(0, 100);
        if (query === current || (query.length > 0 && query.length < 2)) return;
        const timer = setTimeout(() => {
            const next = new URLSearchParams(serialized);
            next.delete('page');
            next.delete('focus');
            if (query) next.set('q', query); else next.delete('q');
            startTransition(() => router.replace(`/products?${next}`, { scroll: false }));
        }, 500);
        return () => clearTimeout(timer);
    }, [value, current, serialized, router]);

    return (
        <form id="product-search" role="search" action="/products" className={styles.search} onSubmit={(event) => {
            event.preventDefault();
            const next = new URLSearchParams(serialized);
            next.delete('page');
            next.delete('focus');
            if (value.trim()) next.set('q', value.trim().slice(0, 100)); else next.delete('q');
            startTransition(() => router.replace(`/products?${next}`, { scroll: false }));
        }}>
            {Array.from(params.entries()).filter(([key]) => !['q', 'page', 'focus'].includes(key)).map(([key, entry]) => <input key={key} type="hidden" name={key} value={entry} />)}
            <label htmlFor="product-query">{vi ? 'Tìm sản phẩm' : 'Find a product'}</label>
            <div className={styles.row}>
                <input id="product-query" name="q" type="search" maxLength={100} autoFocus={params.get('focus') === 'search'} className="input" placeholder={vi ? 'Tên, mã bóng hoặc trị số… VD: RIFA, 12AU7, 100uF' : 'Name, tube code or value… e.g. RIFA, 12AU7, 100uF'} value={value} onChange={(event) => setValue(event.target.value)} />
                <button className="btn btn-secondary" type="submit">{vi ? 'Tìm kiếm' : 'Search'}</button>
            </div>
            <span className={styles.status} role="status">{pending ? (vi ? 'Đang tìm…' : 'Searching…') : current ? (vi ? `Kết quả cho “${current}”` : `Results for “${current}”`) : ''}</span>
        </form>
    );
}
