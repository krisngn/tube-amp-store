'use client';

import { useState, useTransition, useCallback } from 'react';
import Link from 'next/link';
import { bulkPublishProductsAction, bulkUnpublishProductsAction } from './actions';
import DeleteProductButton from './DeleteProductButton';
import styles from './ProductsBulkActions.module.css';
import tableStyles from './page.module.css';

interface ProductRow {
    id: string;
    name: string;
    status: 'published' | 'draft';
    price: number;
    stock: number;
    categoryName: string | null;
    brandName: string | null;
    topology: string | null;
    tubeType: string | null;
    updatedAt: string;
}

interface ProductsBulkActionsProps {
    products: ProductRow[];
    labels: {
        name: string;
        status: string;
        price: string;
        stock: string;
        category: string;
        brand: string;
        topology: string;
        tubeType: string;
        updatedAt: string;
        actions: string;
        edit: string;
        published: string;
        draft: string;
    };
}

export default function ProductsBulkActions({ products, labels }: ProductsBulkActionsProps) {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [isPending, startTransition] = useTransition();
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);


    const allIds = products.map((p) => p.id);
    const allSelected = selected.size === products.length && products.length > 0;
    const someSelected = selected.size > 0 && !allSelected;

    const toggleAll = useCallback(() => {
        setSelected(allSelected ? new Set() : new Set(allIds));
    }, [allSelected, allIds]);

    const toggleOne = useCallback((id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleBulkAction = (action: 'publish' | 'unpublish') => {
        const ids = Array.from(selected);
        if (!ids.length) return;
        setFeedback(null);
        startTransition(async () => {
            try {
                if (action === 'publish') {
                    await bulkPublishProductsAction(ids);
                    setFeedback({ type: 'success', msg: `Đã xuất bản ${ids.length} sản phẩm thành công.` });
                } else {
                    await bulkUnpublishProductsAction(ids);
                    setFeedback({ type: 'success', msg: `Đã gỡ ${ids.length} sản phẩm về bản nháp.` });
                }
                setSelected(new Set());
            } catch {
                setFeedback({ type: 'error', msg: 'Có lỗi xảy ra. Vui lòng thử lại.' });
            }
        });
    };

    return (
        <div>
            {/* Floating bulk-action toolbar */}
            <div className={`${styles.bulkToolbar} ${selected.size > 0 ? styles.toolbarVisible : ''}`}>
                <span className={styles.count}>
                    Đã chọn <strong>{selected.size}</strong> sản phẩm
                </span>
                <div className={styles.actions}>
                    <button
                        className={styles.publishBtn}
                        onClick={() => handleBulkAction('publish')}
                        disabled={isPending}
                        id="bulk-publish-btn"
                    >
                        <span className={styles.btnIcon}>🚀</span>
                        {isPending ? 'Đang xử lý...' : 'Xuất Bản Hàng Loạt'}
                    </button>
                    <button
                        className={styles.unpublishBtn}
                        onClick={() => handleBulkAction('unpublish')}
                        disabled={isPending}
                        id="bulk-unpublish-btn"
                    >
                        <span className={styles.btnIcon}>📦</span>
                        {isPending ? 'Đang xử lý...' : 'Gỡ Xuất Bản'}
                    </button>
                    <button
                        className={styles.cancelBtn}
                        onClick={() => setSelected(new Set())}
                        disabled={isPending}
                    >
                        Bỏ Chọn
                    </button>
                </div>
            </div>

            {/* Feedback toast */}
            {feedback && (
                <div className={`${styles.toast} ${feedback.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
                    <span>{feedback.msg}</span>
                    <button className={styles.toastClose} onClick={() => setFeedback(null)} aria-label="Đóng thông báo">✕</button>
                </div>
            )}

            {/* Products table with checkboxes */}
            <div className={tableStyles.productsTable}>
                <table>
                    <thead>
                        <tr>
                            <th className={styles.checkCol}>
                                <label className={styles.checkLabel} aria-label="Chọn tất cả">
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={allSelected}
                                        ref={(el) => { if (el) el.indeterminate = someSelected; }}
                                        onChange={toggleAll}
                                        id="bulk-select-all"
                                    />
                                </label>
                            </th>
                            <th>{labels.name}</th>
                            <th>{labels.status}</th>
                            <th>{labels.price}</th>
                            <th>{labels.stock}</th>
                            <th>{labels.category}</th>
                            <th>{labels.brand}</th>
                            <th>{labels.topology}</th>
                            <th>{labels.tubeType}</th>
                            <th>{labels.updatedAt}</th>
                            <th>{labels.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((product) => (
                            <tr
                                key={product.id}
                                className={selected.has(product.id) ? styles.rowSelected : ''}
                            >
                                <td className={styles.checkCol}>
                                    <label className={styles.checkLabel} aria-label={`Chọn ${product.name}`}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={selected.has(product.id)}
                                            onChange={() => toggleOne(product.id)}
                                        />
                                    </label>
                                </td>
                                <td>{product.name}</td>
                                <td>
                                    <span className={`badge ${product.status === 'published' ? 'badge-success' : 'badge-secondary'}`}>
                                        {product.status === 'published' ? labels.published : labels.draft}
                                    </span>
                                </td>
                                <td>{product.price.toLocaleString()} VND</td>
                                <td>{product.stock}</td>
                                <td>{product.categoryName || '—'}</td>
                                <td>{product.brandName || '—'}</td>
                                <td>{product.topology ? product.topology.toUpperCase() : '—'}</td>
                                <td>{product.tubeType || '—'}</td>
                                <td>{new Date(product.updatedAt).toLocaleDateString('vi-VN')}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                        <Link
                                            href={`/admin/products/${product.id}`}
                                            className="btn btn-ghost btn-sm"
                                        >
                                            {labels.edit}
                                        </Link>
                                        <DeleteProductButton id={product.id} name={product.name} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
