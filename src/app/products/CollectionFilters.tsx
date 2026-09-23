'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import type { CategoryDTO, BrandDTO } from '@/lib/types/catalog';
import styles from './CollectionFilters.module.css';

interface CollectionFiltersProps {
    categories: CategoryDTO[];
    brands: BrandDTO[];
}

export default function CollectionFilters({ categories, brands }: CollectionFiltersProps) {
    const t = useTranslations('collection');
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const updateFilters = (key: string, value: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        // Reset to page 1 when filters change
        params.delete('page');
        router.push(`${pathname}?${params.toString()}`);
    };

    const clearAllFilters = () => {
        router.push(pathname);
    };

    const isFilterActive = () => searchParams.toString().length > 0;
    const activeCategory = searchParams.get('category');
    const activeBrand = searchParams.get('brand');

    // Count active filters for badge
    const activeFilterCount = [
        searchParams.get('category'),
        searchParams.get('brand'),
        searchParams.get('topology'),
        searchParams.get('condition'),
        searchParams.get('priceMin'),
        searchParams.get('priceMax'),
    ].filter(Boolean).length;

    const renderCategoryNode = (cat: CategoryDTO, depth: number): ReactNode => (
        <div key={cat.id} className={styles.filterItem}>
            <label
                className={styles.checkboxLabel}
                style={{ paddingLeft: `calc(${depth} * 1.5rem)` }}
            >
                <input
                    type="checkbox"
                    checked={activeCategory === cat.slug}
                    onChange={(e) => updateFilters('category', e.target.checked ? cat.slug : null)}
                />
                <span>{cat.name}</span>
            </label>
            {cat.children && cat.children.length > 0 && cat.children.map((c) => renderCategoryNode(c, depth + 1))}
        </div>
    );

    const FilterContent = () => (
        <>
            {/* Header */}
            <div className={styles.filtersHeader}>
                <h3 className={styles.filtersTitle}>{t('filters.title')}</h3>
                {isFilterActive() && (
                    <button onClick={clearAllFilters} className="btn btn-ghost btn-sm">
                        {t('filters.clear')}
                    </button>
                )}
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
                <div className={styles.filterGroup}>
                    <h4 className={styles.filterGroupLabel}>{t('filters.category.label')}</h4>
                    <div className={styles.filterGroupItems}>
                        {categories.map((c) => renderCategoryNode(c, 0))}
                    </div>
                    <div className={styles.divider}></div>
                </div>
            )}

            {/* Brand Filter */}
            {brands.length > 0 && (
                <div className={styles.filterGroup}>
                    <h4 className={styles.filterGroupLabel}>{t('filters.brand.label')}</h4>
                    <div className={styles.filterGroupItems}>
                        {brands.map((brand) => (
                            <label key={brand.id} className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={activeBrand === brand.slug}
                                    onChange={(e) => updateFilters('brand', e.target.checked ? brand.slug : null)}
                                />
                                <span>{brand.name}</span>
                            </label>
                        ))}
                    </div>
                    <div className={styles.divider}></div>
                </div>
            )}

            {/* Topology Filter */}
            <div className={styles.filterGroup}>
                <h4 className={styles.filterGroupLabel}>{t('filters.topology.label')}</h4>
                <div className={styles.filterGroupItems}>
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={searchParams.get('topology') === 'se'}
                            onChange={(e) => updateFilters('topology', e.target.checked ? 'se' : null)}
                        />
                        <span>{t('filters.topology.options.se')}</span>
                    </label>
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={searchParams.get('topology') === 'pp'}
                            onChange={(e) => updateFilters('topology', e.target.checked ? 'pp' : null)}
                        />
                        <span>{t('filters.topology.options.pp')}</span>
                    </label>
                </div>
                <div className={styles.divider}></div>
            </div>

            {/* Condition Filter */}
            <div className={styles.filterGroup}>
                <h4 className={styles.filterGroupLabel}>{t('filters.condition.label')}</h4>
                <div className={styles.filterGroupItems}>
                    {[
                        { value: 'new', label: t('filters.condition.options.new') },
                        { value: 'like_new', label: t('filters.condition.options.likeNew') },
                        { value: 'vintage', label: t('filters.condition.options.vintage') },
                    ].map(({ value, label }) => (
                        <label key={value} className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={searchParams.get('condition') === value}
                                onChange={(e) => updateFilters('condition', e.target.checked ? value : null)}
                            />
                            <span>{label}</span>
                        </label>
                    ))}
                </div>
                <div className={styles.divider}></div>
            </div>

            {/* Price Range Filter */}
            <div className={styles.filterGroup}>
                <h4 className={styles.filterGroupLabel}>{t('filters.price.label')}</h4>
                <div className={styles.filterGroupItems} style={{ gap: 'var(--space-sm)' }}>
                    <input
                        type="number"
                        className="input"
                        placeholder={t('filters.price.min')}
                        defaultValue={searchParams.get('priceMin') || ''}
                        onBlur={(e) => updateFilters('priceMin', e.target.value || null)}
                    />
                    <input
                        type="number"
                        className="input"
                        placeholder={t('filters.price.max')}
                        defaultValue={searchParams.get('priceMax') || ''}
                        onBlur={(e) => updateFilters('priceMax', e.target.value || null)}
                    />
                </div>
            </div>
        </>
    );

    return (
        <>
            {/* ─── Mobile Filter Toggle Button ─── */}
            <div className={styles.mobileFilterToggle}>
                <button
                    className={styles.mobileFilterBtn}
                    onClick={() => setIsMobileOpen(true)}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M3 4h18M7 12h10M11 20h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    {t('filters.title')}
                    {activeFilterCount > 0 && (
                        <span className={styles.filterBadge}>{activeFilterCount}</span>
                    )}
                </button>
            </div>

            {/* ─── Desktop Sidebar ─── */}
            <aside className={styles.desktopSidebar}>
                <FilterContent />
            </aside>

            {/* ─── Mobile Overlay ─── */}
            {isMobileOpen && (
                <div
                    className={styles.mobileOverlay}
                    onClick={() => setIsMobileOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* ─── Mobile Bottom Sheet Drawer ─── */}
            <div className={`${styles.mobileDrawer} ${isMobileOpen ? styles.mobileDrawerOpen : ''}`}>
                <div className={styles.mobileDrawerHandle} />
                <div className={styles.mobileDrawerHeader}>
                    <span className={styles.mobileDrawerTitle}>{t('filters.title')}</span>
                    <button
                        className={styles.mobileDrawerClose}
                        onClick={() => setIsMobileOpen(false)}
                        aria-label="Close filters"
                    >
                        ✕
                    </button>
                </div>
                <div className={styles.mobileDrawerContent}>
                    <FilterContent />
                </div>
                <div className={styles.mobileDrawerFooter}>
                    <button
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        onClick={() => setIsMobileOpen(false)}
                    >
                        Xem kết quả{activeFilterCount > 0 ? ` (${activeFilterCount} bộ lọc)` : ''}
                    </button>
                </div>
            </div>
        </>
    );
}
