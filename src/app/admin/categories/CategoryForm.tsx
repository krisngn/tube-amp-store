'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminCategory } from '@/lib/repositories/admin/categories';
import { flattenTree, getDescendantIds } from '@/lib/utils/categoryTree';
import styles from '../taxonomy.module.css';

export interface CategoryOption {
    id: string;
    nameVi: string;
    parentId: string | null;
    sortOrder?: number;
}

interface CategoryFormProps {
    category?: AdminCategory;
    allCategories: CategoryOption[];
    defaultParentId?: string;
}

export default function CategoryForm({ category, allCategories, defaultParentId }: CategoryFormProps) {
    const router = useRouter();
    const isEdit = !!category;

    const [form, setForm] = useState({
        nameVi: category?.nameVi || '',
        nameEn: category?.nameEn || '',
        slug: category?.slug || '',
        parentId: category?.parentId || defaultParentId || '',
        descriptionVi: category?.descriptionVi || '',
        descriptionEn: category?.descriptionEn || '',
        imagePath: category?.imagePath || '',
        sortOrder: category?.sortOrder ?? 0,
        isActive: category?.isActive ?? true,
    });
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleImageUpload = async (file: File) => {
        setError(null);
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('folder', 'categories');
            const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Tải ảnh thất bại');
            setForm((prev) => ({ ...prev, imagePath: data.url }));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Tải ảnh thất bại');
        } finally {
            setUploading(false);
        }
    };

    // Parent options: every category, indented by depth, excluding self + descendants when editing.
    const parentOptions = useMemo(() => {
        const excluded = category ? new Set([category.id, ...getDescendantIds(allCategories, category.id)]) : new Set<string>();
        return flattenTree(allCategories)
            .filter((n) => !excluded.has(n.item.id))
            .map((n) => ({ id: n.item.id, label: `${'  '.repeat(n.depth)}${n.item.nameVi}` }));
    }, [allCategories, category]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const payload = {
                nameVi: form.nameVi,
                nameEn: form.nameEn || undefined,
                slug: form.slug || form.nameVi.toLowerCase().replace(/\s+/g, '-'),
                parentId: form.parentId || null,
                descriptionVi: form.descriptionVi || undefined,
                descriptionEn: form.descriptionEn || undefined,
                imagePath: form.imagePath || undefined,
                sortOrder: Number(form.sortOrder) || 0,
                isActive: form.isActive,
            };
            const url = isEdit ? `/api/admin/categories/${category!.id}` : '/api/admin/categories';
            const method = isEdit ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Lưu thất bại');
            router.push('/admin/categories');
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lưu thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.section}>
                <div className={styles.grid}>
                    <div className={styles.group}>
                        <label className="label">Tên danh mục (VI) *</label>
                        <input
                            className="input"
                            value={form.nameVi}
                            onChange={(e) => setForm({ ...form, nameVi: e.target.value })}
                            required
                        />
                    </div>
                    <div className={styles.group}>
                        <label className="label">Tên danh mục (EN)</label>
                        <input
                            className="input"
                            value={form.nameEn}
                            onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                        />
                    </div>
                    <div className={styles.group}>
                        <label className="label">Slug *</label>
                        <input
                            className="input"
                            value={form.slug}
                            onChange={(e) => setForm({ ...form, slug: e.target.value })}
                            placeholder="vi-du: day-tin-hieu-rca"
                            pattern="[a-z0-9-]+"
                            required
                        />
                    </div>
                    <div className={styles.group}>
                        <label className="label">Danh mục cha</label>
                        <select
                            className="input"
                            value={form.parentId}
                            onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                        >
                            <option value="">— Danh mục gốc —</option>
                            {parentOptions.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.group}>
                        <label className="label">Thứ tự hiển thị</label>
                        <input
                            type="number"
                            className="input"
                            value={form.sortOrder}
                            onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                        />
                    </div>
                    <div className={`${styles.group} ${styles.fullWidth}`}>
                        <label className="label">Ảnh danh mục</label>
                        <input
                            className="input"
                            value={form.imagePath}
                            onChange={(e) => setForm({ ...form, imagePath: e.target.value })}
                            placeholder="Dán URL, hoặc tải ảnh lên bên dưới"
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
                            <input
                                type="file"
                                accept="image/*"
                                disabled={uploading}
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleImageUpload(f);
                                }}
                            />
                            {uploading && <span className={styles.muted}>Đang tải...</span>}
                            {form.imagePath && !uploading && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={form.imagePath} alt="preview" style={{ height: 48, borderRadius: 'var(--radius-sm)' }} />
                            )}
                        </div>
                    </div>
                    <div className={`${styles.group} ${styles.fullWidth}`}>
                        <label className="label">Mô tả (VI)</label>
                        <textarea
                            className="input"
                            rows={3}
                            value={form.descriptionVi}
                            onChange={(e) => setForm({ ...form, descriptionVi: e.target.value })}
                        />
                    </div>
                    <div className={`${styles.group} ${styles.fullWidth}`}>
                        <label className="label">Mô tả (EN)</label>
                        <textarea
                            className="input"
                            rows={3}
                            value={form.descriptionEn}
                            onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
                        />
                    </div>
                    <div className={styles.group}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={form.isActive}
                                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                            />
                            Hiển thị (active)
                        </label>
                    </div>
                </div>
            </div>

            <div className={styles.formActions}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Đang lưu...' : 'Lưu'}
                </button>
            </div>
        </form>
    );
}
