'use client';

import type { ProductVariant } from '@/lib/products/variants';
import styles from './ProductForm.module.css';

export default function ProductVariantsEditor({ variants, onChange }: {
    variants: ProductVariant[];
    onChange: (variants: ProductVariant[]) => void;
}) {
    function update(index: number, patch: Partial<ProductVariant>) {
        onChange(variants.map((v, i) => i === index ? { ...v, ...patch } : v));
    }
    return <section className={styles.formSection}>
        <h2>Phân loại sản phẩm</h2>
        <p>Mỗi phân loại có giá, SKU và tồn kho riêng. Giá chung là giá thấp nhất, tồn kho chung là tổng các phân loại.</p>
        {variants.map((variant, index) => <fieldset key={variant.id} style={{ marginBlock: 16, padding: 16, border: '1px solid var(--color-border, #ddd)', borderRadius: 8 }}>
            <legend>Phân loại {index + 1}</legend>
            <div className={styles.formGrid}>
                <label>Tên phân loại<input className="input" required maxLength={200} value={variant.name} onChange={(e) => update(index, { name: e.target.value })} /></label>
                <label>SKU<input className="input" value={variant.sku ?? ''} onChange={(e) => update(index, { sku: e.target.value })} /></label>
                <label>Giá (VND)<input className="input" type="number" min={1} step={1} required value={variant.price} onChange={(e) => update(index, { price: Number(e.target.value) })} /></label>
                <label>Tồn kho<input className="input" type="number" min={0} step={1} required value={variant.stockQuantity} onChange={(e) => update(index, { stockQuantity: Number(e.target.value) })} /></label>
                <label>URL ảnh riêng (tùy chọn)<input className="input" type="url" placeholder="https://…" value={variant.imageUrl ?? ''} onChange={(e) => update(index, { imageUrl: e.target.value || undefined })} /></label>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => onChange(variants.filter((_, i) => i !== index))}>Xóa phân loại</button>
        </fieldset>)}
        <button type="button" className="btn btn-secondary" disabled={variants.length >= 100} onClick={() => onChange([...variants, { id: crypto.randomUUID(), name: '', price: 1, stockQuantity: 0 }])}>Thêm phân loại</button>
    </section>;
}
