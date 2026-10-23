'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import type { ProductDetailDTO } from '@/lib/types/catalog';
import { formatStockStatus } from '@/lib/utils/formatters';
import { useCartStore } from '@/lib/cart/cart.store';
import styles from './ProductActions.module.css';

interface ProductActionsProps {
    product: ProductDetailDTO;
}

export default function ProductActions({ product }: ProductActionsProps) {
    const locale = useLocale();
    const t = useTranslations('product');
    const tCart = useTranslations('cart');
    const router = useRouter();
    const [quantity, setQuantity] = useState(1);
    const [isAdding, setIsAdding] = useState(false);
    const addItem = useCartStore((state) => state.addItem);

    const variants = product.variants ?? [];
    const [variantId, setVariantId] = useState('');
    const selectedVariant = variants.find((v) => v.id === variantId);
    const needsSelection = variants.length > 0 && !selectedVariant;
    const stockQuantity = selectedVariant?.stockQuantity ?? product.stockQuantity;
    const priceVnd = selectedVariant?.price ?? product.priceVnd;
    const displayName = product.name;
    const stockStatus = formatStockStatus(stockQuantity, product.lowStockThreshold);
    const isOutOfStock = stockStatus === 'out_of_stock';

    const handleDecrease = () => {
        setQuantity(Math.max(1, quantity - 1));
    };

    const handleIncrease = () => {
        if (quantity < stockQuantity) {
            setQuantity(quantity + 1);
        }
    };

    const handleAddToCart = () => {
        if (isOutOfStock || isAdding || needsSelection) {
            return;
        }

        setIsAdding(true);

        // Get primary image URL
        const primaryImage = product.images.find((img) => img.isPrimary);
        const imageUrl = primaryImage?.url || product.images[0]?.url;

        addItem({
            productId: product.id,
            variantId: selectedVariant?.id,
            variantName: selectedVariant?.name,
            sku: selectedVariant?.sku,
            slug: product.slug,
            name: displayName,
            priceVnd,
            quantity,
            primaryImageUrl: selectedVariant?.imageUrl || imageUrl,
        });

        // Reset quantity and show feedback
        setTimeout(() => {
            setIsAdding(false);
            // Simple feedback - could be enhanced with toast notification
            alert(tCart('addSuccess') || 'Added to cart');
        }, 300);
    };

    return (
        <div className={styles.productActions}>
            {variants.length > 0 && <div className={styles.variantPicker}>
                <label htmlFor="product-variant">{locale === 'vi' ? 'Phân loại' : 'Option'}</label>
                <select id="product-variant" className="input" value={variantId} onChange={(e) => { setVariantId(e.target.value); setQuantity(1); }}>
                    <option value="">{locale === 'vi' ? 'Chọn phân loại' : 'Select an option'}</option>
                    {variants.map((v) => <option key={v.id} value={v.id} disabled={v.stockQuantity === 0}>
                        {v.name} — {new Intl.NumberFormat(locale, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v.price)}{v.stockQuantity === 0 ? (locale === 'vi' ? ' (Hết hàng)' : ' (Sold out)') : ''}
                    </option>)}
                </select>
                {selectedVariant && <div aria-live="polite">
                    <p className={styles.variantPrice}>{new Intl.NumberFormat(locale, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(priceVnd)}</p>
                    {selectedVariant.sku && <p>SKU: {selectedVariant.sku}</p>}
                    {selectedVariant.imageUrl && <img src={selectedVariant.imageUrl} alt={selectedVariant.name} width={120} height={120} style={{ objectFit: 'contain' }} />}
                </div>}
            </div>}
            {/* Stock Status */}
            <div className={styles.stockStatus}>
                {stockStatus === 'out_of_stock' && (
                    <span className="badge badge-error">{t('availability.outOfStock')}</span>
                )}
                {stockStatus === 'limited' && (
                    <span className="badge badge-warning">
                        {t('availability.limitedStock', { count: stockQuantity })}
                    </span>
                )}
                {stockStatus === 'in_stock' && (
                    <span className="badge badge-success">{t('availability.inStock')}</span>
                )}
            </div>

            {/* Quantity Selector */}
            {!isOutOfStock && !needsSelection && (
                <div className={styles.quantitySelector}>
                    <label className="text-sm text-secondary">{t('actions.quantity')}</label>
                    <div className={styles.quantityControls}>
                        <button
                            onClick={handleDecrease}
                            disabled={quantity <= 1}
                            aria-label={t('actions.decrease')}
                        >
                            −
                        </button>
                        <span className={styles.quantityValue}>{quantity}</span>
                        <button
                            onClick={handleIncrease}
                            disabled={quantity >= stockQuantity}
                            aria-label={t('actions.increase')}
                        >
                            +
                        </button>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className={styles.actionButtons}>
                <button
                    className="btn btn-primary btn-large"
                    disabled={isOutOfStock || isAdding || needsSelection}
                    onClick={handleAddToCart}
                    title={isOutOfStock ? t('cta.outOfStock') : undefined}
                >
                    {isAdding
                        ? tCart('adding') || 'Adding...'
                        : isOutOfStock
                        ? t('cta.outOfStock')
                        : t('cta.addToCart')}
                </button>

                {product.allowDeposit && !isOutOfStock && !needsSelection && (
                    <button 
                        className="btn btn-secondary btn-large"
                        onClick={() => {
                            // Add to cart WITHOUT deposit flag
                            // Deposit will be selected at checkout via paymentMode
                            const primaryImage = product.images.find((img) => img.isPrimary);
                            const imageUrl = primaryImage?.url || product.images[0]?.url;
                            
                            addItem({
                                productId: product.id,
            variantId: selectedVariant?.id,
            variantName: selectedVariant?.name,
            sku: selectedVariant?.sku,
                                slug: product.slug,
                                name: displayName,
                                priceVnd,
                                quantity: 1,
                                primaryImageUrl: selectedVariant?.imageUrl || imageUrl,
                                // Store deposit config for checkout UI (eligibility check only)
                                // But do NOT set requiresDeposit - paymentMode at checkout is the source of truth
                                depositAmount: product.depositType === 'percent' && product.depositPercentage
                                    ? Math.round((priceVnd * product.depositPercentage) / 100)
                                    : product.depositAmount || 0,
                                depositType: product.depositType,
                                depositPercentage: product.depositPercentage,
                            });
                            
                            router.push('/cart');
                        }}
                    >
                        {t('cta.reserveWithDeposit')}
                    </button>
                )}

                <button
                    className="btn btn-ghost"
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-consultation-modal', {
                            detail: { productName: product.name }
                        }));
                    }}
                >
                    {t('cta.chatForMatching')}
                </button>
            </div>
        </div>
    );
}
