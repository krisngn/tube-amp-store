'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import type { ProductDetailDTO } from '@/lib/types/catalog';
import { formatStockStatus } from '@/lib/utils/formatters';
import { useCartStore } from '@/lib/cart/cart.store';
import styles from './ProductActions.module.css';

interface ProductActionsProps {
    product: ProductDetailDTO;
}

export default function ProductActions({ product }: ProductActionsProps) {
    const t = useTranslations('product');
    const tCart = useTranslations('cart');
    const router = useRouter();
    const [quantity, setQuantity] = useState(1);
    const [isAdding, setIsAdding] = useState(false);
    const addItem = useCartStore((state) => state.addItem);

    const stockStatus = formatStockStatus(product.stockQuantity, product.lowStockThreshold);
    const isOutOfStock = stockStatus === 'out_of_stock';

    const handleDecrease = () => {
        setQuantity(Math.max(1, quantity - 1));
    };

    const handleIncrease = () => {
        if (quantity < product.stockQuantity) {
            setQuantity(quantity + 1);
        }
    };

    const handleAddToCart = () => {
        if (isOutOfStock || isAdding) {
            return;
        }

        setIsAdding(true);

        // Get primary image URL
        const primaryImage = product.images.find((img) => img.isPrimary);
        const imageUrl = primaryImage?.url || product.images[0]?.url;

        addItem({
            productId: product.id,
            slug: product.slug,
            name: product.name,
            priceVnd: product.priceVnd,
            quantity,
            primaryImageUrl: imageUrl,
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
            {/* Stock Status */}
            <div className={styles.stockStatus}>
                {stockStatus === 'out_of_stock' && (
                    <span className="badge badge-error">{t('availability.outOfStock')}</span>
                )}
                {stockStatus === 'limited' && (
                    <span className="badge badge-warning">
                        {t('availability.limitedStock', { count: product.stockQuantity })}
                    </span>
                )}
                {stockStatus === 'in_stock' && (
                    <span className="badge badge-success">{t('availability.inStock')}</span>
                )}
            </div>

            {/* Quantity Selector */}
            {!isOutOfStock && (
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
                            disabled={quantity >= product.stockQuantity}
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
                    disabled={isOutOfStock || isAdding}
                    onClick={handleAddToCart}
                    title={isOutOfStock ? t('cta.outOfStock') : undefined}
                >
                    {isAdding
                        ? tCart('adding') || 'Adding...'
                        : isOutOfStock
                        ? t('cta.outOfStock')
                        : t('cta.addToCart')}
                </button>

                {product.allowDeposit && !isOutOfStock && (
                    <button 
                        className="btn btn-secondary btn-large"
                        onClick={() => {
                            // Add to cart WITHOUT deposit flag
                            // Deposit will be selected at checkout via paymentMode
                            const primaryImage = product.images.find((img) => img.isPrimary);
                            const imageUrl = primaryImage?.url || product.images[0]?.url;
                            
                            addItem({
                                productId: product.id,
                                slug: product.slug,
                                name: product.name,
                                priceVnd: product.priceVnd,
                                quantity: 1,
                                primaryImageUrl: imageUrl,
                                // Store deposit config for checkout UI (eligibility check only)
                                // But do NOT set requiresDeposit - paymentMode at checkout is the source of truth
                                depositAmount: product.depositType === 'percent' && product.depositPercentage
                                    ? Math.round((product.priceVnd * product.depositPercentage) / 100)
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
