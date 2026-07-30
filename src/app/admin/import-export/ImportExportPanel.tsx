'use client';

import { useRef, useState } from 'react';
import { COLUMNS, REQUIRED, type Entity } from '@/lib/import-export/columns';
import styles from '../taxonomy.module.css';

const LABELS: Record<Entity, string> = {
    products: 'Sản phẩm',
    categories: 'Danh mục',
    brands: 'Thương hiệu',
};

const FORMAT_NOTES: Record<Entity, string> = {
    products:
        'specifications: dạng "Khóa=Giá trị|Khóa=Giá trị" (vd: Điện dung=0.22uF|Điện áp=630V). taps: "4Ω|8Ω|16Ω". category_slug/brand_slug dùng slug — chưa có sẽ tự tạo. condition: new|like_new|vintage. is_*: true/false.',
    categories: 'parent_slug: slug của danh mục cha (để trống nếu là danh mục gốc). is_active: true/false.',
    brands: 'is_active: true/false.',
};

interface ImportResult {
    created: number;
    updated: number;
    errors: { row: number; message: string }[];
}

function EntityCard({ entity }: { entity: Entity }) {
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleImport = async () => {
        if (!file) return;
        setBusy(true);
        setError(null);
        setResult(null);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch(`/api/admin/import/${entity}`, { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Nhập thất bại');
            setResult(data as ImportResult);
            setFile(null);
            if (inputRef.current) inputRef.current.value = '';
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Nhập thất bại');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={styles.section}>
            <h2>{LABELS[entity]}</h2>

            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', marginBottom: 'var(--space-lg)' }}>
                <a className="btn btn-secondary" href={`/api/admin/export/${entity}?template=1`}>
                    ⬇ File mẫu (có ví dụ)
                </a>
                <a className="btn btn-secondary" href={`/api/admin/export/${entity}?empty=1`}>
                    ⬇ File trống
                </a>
                <a className="btn btn-secondary" href={`/api/admin/export/${entity}`}>
                    ⬇ Xuất toàn bộ CSV
                </a>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <button className="btn btn-primary" onClick={handleImport} disabled={!file || busy}>
                    {busy ? 'Đang nhập...' : '⬆ Nhập CSV'}
                </button>
            </div>

            {error && (
                <div className={styles.error} style={{ marginTop: 'var(--space-md)' }}>
                    {error}
                </div>
            )}

            {result && (
                <div style={{ marginTop: 'var(--space-md)' }}>
                    <p>
                        ✅ Thêm mới: <b>{result.created}</b> · Cập nhật: <b>{result.updated}</b> · Lỗi:{' '}
                        <b>{result.errors.length}</b>
                    </p>
                    {result.errors.length > 0 && (
                        <ul className={styles.muted} style={{ maxHeight: 220, overflow: 'auto', paddingLeft: 'var(--space-lg)' }}>
                            {result.errors.map((er, i) => (
                                <li key={i}>
                                    Dòng {er.row}: {er.message}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <details style={{ marginTop: 'var(--space-md)' }}>
                <summary className={styles.muted} style={{ cursor: 'pointer' }}>
                    Các cột (dấu * là bắt buộc)
                </summary>
                <p className={styles.muted} style={{ marginTop: 'var(--space-sm)' }}>
                    {COLUMNS[entity].map((c) => (REQUIRED[entity].includes(c) ? `${c}*` : c)).join(', ')}
                </p>
                <p className={styles.muted}>{FORMAT_NOTES[entity]}</p>
            </details>
        </div>
    );
}

export default function ImportExportPanel() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <p className={styles.muted}>
                Tải <b>File mẫu (có ví dụ)</b> để xem cách điền, hoặc <b>File trống</b> nếu đã quen → mở bằng Excel/Google
                Sheets → điền dữ liệu (thêm dòng mới hoặc sửa dòng có sẵn theo <b>slug</b>) → lưu dạng CSV → <b>Nhập CSV</b>{' '}
                lại vào đây. Trùng slug sẽ được cập nhật, chưa có sẽ tạo mới.
            </p>
            <p className={styles.muted}>
                Lưu ý: các <b>dòng ví dụ</b> trong file mẫu để ở dạng <b>nháp (chưa xuất bản)</b> và slug bắt đầu bằng
                &quot;vi-du-&quot; — hãy sửa hoặc xóa trước khi nhập dữ liệu thật.
            </p>
            <EntityCard entity="products" />
            <EntityCard entity="categories" />
            <EntityCard entity="brands" />
        </div>
    );
}
