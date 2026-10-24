'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import type { ProductCardDTO } from '@/lib/types/catalog';
import { useCartStore } from '@/lib/cart/cart.store';
import { useCartReady } from '@/lib/cart/use-cart-ready';
import styles from './ProductGrid.module.css';

export default function QuickCartButton({ product }: { product: ProductCardDTO }) {
    const vi = useLocale() === 'vi';
    const ready = useCartReady();
    const items = useCartStore((state) => state.items);
    const addItem = useCartStore((state) => state.addItem);
    const inCart = ready && items.some((item) => item.productId === product.id);
    const [choosing, setChoosing] = useState(false);
    const variants = product.variants ?? [];
    const label = inCart ? (vi ? 'Đã trong giỏ — xem giỏ hàng' : 'In cart — view cart')
        : !product.isInStock ? (vi ? 'Hết hàng' : 'Out of stock')
        : variants.length ? (vi ? 'Chọn phân loại để thêm vào giỏ' : 'Choose an option to add')
        : (vi ? 'Thêm vào giỏ hàng' : 'Add to cart');
    const icon = inCart ? <path d="m5 12 4 4L19 6" /> : <><path d="M3 3h2l3 12h10l3-9H6" /><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></>;
    const iconContent = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>;
    return <>
        {inCart ? <Link href="/cart" className={`${styles.cartButton} ${styles.inCart}`} aria-label={`${label}: ${product.name}`} title={label}>{iconContent}</Link> :
            <button className={styles.cartButton} disabled={!ready || !product.isInStock} aria-label={`${label}: ${product.name}`} title={label}
                onClick={() => {
                    if (variants.length) { setChoosing(true); return; }
                    if (!product.isInStock || (product.stockQuantity ?? 0) < 1) return;
                    addItem({ productId: product.id, slug: product.slug, name: product.name, priceVnd: product.priceVnd, primaryImageUrl: product.imageUrl, quantity: 1 });
                }}>{iconContent}</button>}
        {choosing && <VariantDialog product={product} onClose={() => setChoosing(false)} />}
    </>;
}

function VariantDialog({ product, onClose }: { product: ProductCardDTO; onClose: () => void }) {
    const vi = useLocale() === 'vi';
    const dialogRef = useRef<HTMLDialogElement>(null);
    const id = useId();
    const [variantId, setVariantId] = useState('');
    const variant = product.variants?.find((option) => option.id === variantId);
    const addItem = useCartStore((state) => state.addItem);
    useEffect(() => { dialogRef.current?.showModal(); }, []);
    return <dialog ref={dialogRef} className={styles.variantDialog} aria-labelledby={`${id}-title`} onClose={onClose}
        onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}>
        <div className={styles.dialogContent}>
            <button className={styles.closeButton} aria-label={vi ? 'Đóng chọn phân loại' : 'Close options'} onClick={() => dialogRef.current?.close()}>×</button>
            <h2 id={`${id}-title`}>{vi ? 'Chọn phân loại' : 'Choose an option'}</h2>
            <p>{product.name}</p>
            <label htmlFor={`${id}-option`}>{vi ? 'Phân loại sản phẩm' : 'Product option'}</label>
            <select autoFocus id={`${id}-option`} className="input" value={variantId} onChange={(event) => setVariantId(event.target.value)}>
                <option value="">{vi ? 'Chọn phân loại' : 'Choose an option'}</option>
                {product.variants?.map((option) => <option key={option.id} value={option.id} disabled={option.stockQuantity < 1}>
                    {option.name} — {option.price.toLocaleString(vi ? 'vi-VN' : 'en-US')} ₫{option.stockQuantity < 1 ? (vi ? ' (Hết hàng)' : ' (Sold out)') : ''}
                </option>)}
            </select>
            {variant && <p aria-live="polite">{vi ? 'Còn lại' : 'Available'}: {variant.stockQuantity} · {variant.price.toLocaleString(vi ? 'vi-VN' : 'en-US')} ₫</p>}
            <button className="btn btn-primary" disabled={!variant || variant.stockQuantity < 1} onClick={() => {
                if (!variant || variant.stockQuantity < 1) return;
                addItem({ productId: product.id, variantId: variant.id, variantName: variant.name, sku: variant.sku, slug: product.slug, name: product.name, priceVnd: variant.price, primaryImageUrl: variant.imageUrl || product.imageUrl, quantity: 1 });
                dialogRef.current?.close();
            }}>{vi ? 'Thêm vào giỏ hàng' : 'Add to cart'}</button>
        </div>
    </dialog>;
}
