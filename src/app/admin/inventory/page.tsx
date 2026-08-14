import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/auth';
import { adminListLowStock } from '@/lib/repositories/admin/products';
import styles from '../taxonomy.module.css';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
    await requireAdmin();
    const t = await getTranslations({ locale: 'vi', namespace: 'admin' });
    const items = await adminListLowStock();

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>{t('inventory.title')}</h1>
            </div>
            <p className={styles.muted} style={{ marginBottom: 'var(--space-lg)' }}>
                Sản phẩm có tồn kho ≤ ngưỡng cảnh báo — nên nhập thêm hoặc tạm gỡ bán.
            </p>
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Tên</th>
                            <th>Tồn kho</th>
                            <th>Ngưỡng</th>
                            <th>Trạng thái</th>
                            <th style={{ textAlign: 'right' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={5} className={styles.empty}>
                                    Không có sản phẩm nào dưới ngưỡng 🎉
                                </td>
                            </tr>
                        ) : (
                            items.map((it) => (
                                <tr key={it.id}>
                                    <td>{it.name}</td>
                                    <td>
                                        <b style={{ color: it.stock === 0 ? 'var(--color-error)' : undefined }}>{it.stock}</b>
                                    </td>
                                    <td className={styles.muted}>{it.threshold}</td>
                                    <td>
                                        <span
                                            className={`${styles.badge} ${it.status === 'published' ? styles.badgeActive : styles.badgeInactive}`}
                                        >
                                            {it.status === 'published' ? 'Đã bán' : 'Nháp'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.actions}>
                                            <Link href={`/admin/products/${it.id}`} className="btn btn-ghost btn-sm">
                                                Sửa
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
