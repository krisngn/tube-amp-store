'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCartStore } from '@/lib/cart/cart.store';
import styles from './page.module.css';

export default function CartPage() {
    const t = useTranslations('cart');
    const tCommon = useTranslations('common');
    const { items, updateQuantity, removeItem, getTotal, clearCart } = useCartStore();

    const isEmpty = items.length === 0;
    const subtotal = getTotal();

    const handleQuantityChange = (productId: string, newQuantity: number) => {
        updateQuantity(productId, newQuantity);
    };

    const handleRemove = (productId: string) => {
        if (confirm(t('items.confirmRemove') || 'Remove this item?')) {
            removeItem(productId);
        }
    };

    if (isEmpty) {
        return (
            <div className={styles.cartPage}>
                <div className="container">
                    <div className={styles.emptyCart}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                            <path d="M3 3h2l.4 2M7 13h10l3-8H6.4M7 13L5.4 5M7 13l-1.5 4.5M17 13l1.5 4.5M9 18a1 1 0 100-2 1 1 0 000 2zM15 18a1 1 0 100-2 1 1 0 000 2z" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        <h2>{t('empty.title')}</h2>
                        <p>{t('empty.description')}</p>
                        <Link href="/tube-amplifiers" className="btn btn-primary">
                            {t('empty.cta')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.cartPage}>
            <div className="container">
                <h1>{t('title')}</h1>

                <div className={styles.cartLayout}>
                    {/* Cart Items */}
                    <div className={styles.cartItems}>
                        {items.map((item) => (
                            <div key={item.productId} className={`${styles.cartItem} card`}>
                                {item.primaryImageUrl ? (
                                    <img
                                        src={item.primaryImageUrl}
                                        alt={item.name}
                                        className={styles.itemImage}
                                    />
                                ) : (
                                    <div className={`${styles.itemImage} skeleton`}></div>
                                )}
                                <div className={styles.itemDetails}>
                                    <Link href={`/product/${item.slug}`}>
                                        <h3>{item.name}</h3>
                                    </Link>
                                    <p className={styles.itemPrice}>
                                        {item.priceVnd.toLocaleString('vi-VN')} {tCommon('currency')}
                                    </p>
                                </div>
                                <div className={styles.itemQuantity}>
                                    <label className="label">{t('items.quantity')}</label>
                                    <div className={styles.quantitySelector}>
                                        <button
                                            onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                                            aria-label={t('items.decrease')}
                                        >
                                            −
                                        </button>
                                        <span>{item.quantity}</span>
                                        <button
                                            onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                                            aria-label={t('items.increase')}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                <div className={styles.itemTotal}>
                                    <p className="label">{t('items.total')}</p>
                                    <p className={styles.totalPrice}>
                                        {(item.priceVnd * item.quantity).toLocaleString('vi-VN')} {tCommon('currency')}
                                    </p>
                                </div>
                                <button
                                    className={`btn btn-ghost ${styles.itemRemove}`}
                                    onClick={() => handleRemove(item.productId)}
                                >
                                    {t('items.remove')}
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Cart Summary */}
                    <div className={`${styles.cartSummary} card-elevated`}>
                        <h3>{t('summary.title')}</h3>
                        <div className={styles.summaryRow}>
                            <span>{t('summary.subtotal')}</span>
                            <span>{subtotal.toLocaleString('vi-VN')} {tCommon('currency')}</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span>{t('summary.shipping')}</span>
                            <span className="text-muted">{t('summary.shippingNote')}</span>
                        </div>
                        <div className="divider"></div>
                        <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                            <strong>{t('summary.total')}</strong>
                            <strong className="text-accent">
                                {subtotal.toLocaleString('vi-VN')} {tCommon('currency')}
                            </strong>
                        </div>
                        <Link
                            href="/checkout"
                            className="btn btn-primary btn-large"
                            style={{ width: '100%', marginTop: 'var(--space-lg)' }}
                        >
                            {t('summary.checkout')}
                        </Link>

                        <div className={styles.summaryNote}>
                            <p>{t('notes.matchingAdvice')}</p>
                            <button
                                className="btn btn-ghost"
                                onClick={() => {
                                    window.dispatchEvent(new CustomEvent('open-consultation-modal', {
                                        detail: { source: 'cart' }
                                    }));
                                }}
                            >
                                {t('notes.chatCta')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
