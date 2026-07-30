'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AdminBrand } from '@/lib/repositories/admin/brands';
import styles from '../taxonomy.module.css';

export default function BrandsTable({ brands }: { brands: AdminBrand[] }) {
    const router = useRouter();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Xóa thương hiệu "${name}"?`)) return;
        setError(null);
        setDeletingId(id);
        try {
            const res = await fetch(`/api/admin/brands/${id}`, { method: 'DELETE' });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Xóa thất bại');
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Xóa thất bại');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <>
            {error && <div className={styles.error} style={{ marginBottom: 'var(--space-md)' }}>{error}</div>}
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Tên</th>
                            <th>Slug</th>
                            <th>Thứ tự</th>
                            <th>Trạng thái</th>
                            <th style={{ textAlign: 'right' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {brands.length === 0 ? (
                            <tr>
                                <td colSpan={5} className={styles.empty}>
                                    Chưa có thương hiệu nào
                                </td>
                            </tr>
                        ) : (
                            brands.map((b) => (
                                <tr key={b.id}>
                                    <td>{b.name}</td>
                                    <td className={styles.muted}>{b.slug}</td>
                                    <td>{b.sortOrder}</td>
                                    <td>
                                        <span
                                            className={`${styles.badge} ${b.isActive ? styles.badgeActive : styles.badgeInactive}`}
                                        >
                                            {b.isActive ? 'Hiển thị' : 'Ẩn'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.actions}>
                                            <Link href={`/admin/brands/${b.id}`} className="btn btn-ghost btn-sm">
                                                Sửa
                                            </Link>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => handleDelete(b.id, b.name)}
                                                disabled={deletingId === b.id}
                                            >
                                                {deletingId === b.id ? '...' : 'Xóa'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
