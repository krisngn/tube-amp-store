'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminBrand } from '@/lib/repositories/admin/brands';
import styles from '../taxonomy.module.css';

export default function BrandForm({ brand }: { brand?: AdminBrand }) {
    const router = useRouter();
    const isEdit = !!brand;

    const [form, setForm] = useState({
        name: brand?.name || '',
        nameEn: brand?.nameEn || '',
        slug: brand?.slug || '',
        descriptionVi: brand?.descriptionVi || '',
        descriptionEn: brand?.descriptionEn || '',
        logoPath: brand?.logoPath || '',
        sortOrder: brand?.sortOrder ?? 0,
        isActive: brand?.isActive ?? true,
    });
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogoUpload = async (file: File) => {
        setError(null);
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('folder', 'brands');
            const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Tải logo thất bại');
            setForm((prev) => ({ ...prev, logoPath: data.url }));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Tải logo thất bại');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const payload = {
                name: form.name,
                nameEn: form.nameEn || undefined,
                slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-'),
                descriptionVi: form.descriptionVi || undefined,
                descriptionEn: form.descriptionEn || undefined,
                logoPath: form.logoPath || undefined,
                sortOrder: Number(form.sortOrder) || 0,
                isActive: form.isActive,
            };
            const url = isEdit ? `/api/admin/brands/${brand!.id}` : '/api/admin/brands';
            const method = isEdit ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Lưu thất bại');
            router.push('/admin/brands');
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
                        <label className="label">Tên thương hiệu *</label>
                        <input
                            className="input"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className={styles.group}>
                        <label className="label">Tên (EN)</label>
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
                            placeholder="vi-du: western-electric"
                            pattern="[a-z0-9-]+"
                            required
                        />
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
                        <label className="label">Logo thương hiệu</label>
                        <input
                            className="input"
                            value={form.logoPath}
                            onChange={(e) => setForm({ ...form, logoPath: e.target.value })}
                            placeholder="Dán URL, hoặc tải logo lên bên dưới"
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
                            <input
                                type="file"
                                accept="image/*"
                                disabled={uploading}
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleLogoUpload(f);
                                }}
                            />
                            {uploading && <span className={styles.muted}>Đang tải...</span>}
                            {form.logoPath && !uploading && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={form.logoPath} alt="preview" style={{ height: 48, borderRadius: 'var(--radius-sm)' }} />
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
