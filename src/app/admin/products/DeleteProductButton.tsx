'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteProductButton({ id, name }: { id: string; name: string }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    const onDelete = async () => {
        if (!confirm(`Xóa hẳn sản phẩm "${name}"? Hành động này không thể hoàn tác.`)) return;
        setBusy(true);
        try {
            const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.error || 'Xóa thất bại');
            }
            router.refresh();
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Xóa thất bại');
        } finally {
            setBusy(false);
        }
    };

    return (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDelete} disabled={busy}>
            {busy ? '...' : 'Xóa'}
        </button>
    );
}
