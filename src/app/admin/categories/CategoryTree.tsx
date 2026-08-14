'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AdminCategory } from '@/lib/repositories/admin/categories';
import { buildNestedTree, type NestedNode } from '@/lib/utils/categoryTree';
import styles from '../taxonomy.module.css';

const STORAGE_KEY = 'vaa-cat-expanded';

export default function CategoryTree({ categories }: { categories: AdminCategory[] }) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    // Deterministic initial state (parents expanded) so SSR/CSR match; localStorage applied after mount.
    const [expanded, setExpanded] = useState<Set<string>>(() => {
        const set = new Set<string>();
        for (const c of categories) if (c.parentId) set.add(c.parentId);
        return set;
    });

    useEffect(() => {
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
        if (raw) {
            try {
                setExpanded(new Set(JSON.parse(raw) as string[]));
            } catch {
                /* ignore */
            }
        }
    }, []);

    const persist = (next: Set<string>) => {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
        } catch {
            /* ignore */
        }
    };

    const toggle = (id: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            persist(next);
            return next;
        });
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Xóa danh mục "${name}"?`)) return;
        setError(null);
        setBusyId(id);
        try {
            const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Xóa thất bại');
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Xóa thất bại');
        } finally {
            setBusyId(null);
        }
    };

    // Reorder within siblings: renumber sort_order 0..n and PUT the changed ones.
    const move = async (node: AdminCategory, direction: 'up' | 'down') => {
        const siblings = categories
            .filter((c) => c.parentId === node.parentId)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.nameVi.localeCompare(b.nameVi));
        const idx = siblings.findIndex((c) => c.id === node.id);
        const target = direction === 'up' ? idx - 1 : idx + 1;
        if (target < 0 || target >= siblings.length) return;

        const reordered = [...siblings];
        [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];

        setError(null);
        setBusyId(node.id);
        try {
            await Promise.all(
                reordered
                    .map((c, i) =>
                        c.sortOrder === i
                            ? null
                            : fetch(`/api/admin/categories/${c.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ sortOrder: i }),
                              })
                    )
                    .filter(Boolean) as Promise<Response>[]
            );
            router.refresh();
        } catch {
            setError('Đổi thứ tự thất bại');
        } finally {
            setBusyId(null);
        }
    };

    const tree = buildNestedTree(categories);

    const renderNode = (node: NestedNode<AdminCategory>) => {
        const c = node.item;
        const hasChildren = node.children.length > 0;
        const isOpen = expanded.has(c.id);
        return (
            <div key={c.id}>
                <div
                    className={styles.treeRow}
                    style={{ paddingLeft: `calc(${node.depth} * 22px + var(--space-md))` }}
                >
                    <button
                        type="button"
                        className={styles.caret}
                        onClick={() => hasChildren && toggle(c.id)}
                        aria-label={hasChildren ? (isOpen ? 'Thu gọn' : 'Mở rộng') : undefined}
                        style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
                    >
                        {isOpen ? '▾' : '▸'}
                    </button>
                    <span className={styles.treeName}>{c.nameVi}</span>
                    <span className={styles.muted}>/{c.slug}</span>
                    {!c.isActive && <span className={`${styles.badge} ${styles.badgeInactive}`}>Ẩn</span>}
                    <span className={styles.muted}>{c.productCount ?? 0} SP</span>
                    <span style={{ flex: 1 }} />
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => move(c, 'up')}
                            disabled={busyId === c.id}
                            title="Lên"
                        >
                            ↑
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => move(c, 'down')}
                            disabled={busyId === c.id}
                            title="Xuống"
                        >
                            ↓
                        </button>
                        <Link href={`/admin/categories/new?parent=${c.id}`} className="btn btn-ghost btn-sm">
                            + Con
                        </Link>
                        <Link href={`/admin/categories/${c.id}`} className="btn btn-ghost btn-sm">
                            Sửa
                        </Link>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleDelete(c.id, c.nameVi)}
                            disabled={busyId === c.id}
                        >
                            Xóa
                        </button>
                    </div>
                </div>
                {hasChildren && isOpen && node.children.map(renderNode)}
            </div>
        );
    };

    return (
        <>
            {error && (
                <div className={styles.error} style={{ marginBottom: 'var(--space-md)' }}>
                    {error}
                </div>
            )}
            <div className={styles.tableWrap}>
                {categories.length === 0 ? (
                    <div className={styles.empty}>Chưa có danh mục nào</div>
                ) : (
                    tree.map(renderNode)
                )}
            </div>
        </>
    );
}
