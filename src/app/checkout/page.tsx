'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cartItemKey } from '@/lib/cart/cart.utils';
import { useCartStore } from '@/lib/cart/cart.store';
import styles from './page.module.css';

type PaymentMode = 'deposit' | 'full' | 'cod';

interface CheckoutFormData {
    fullName: string;
    phone: string;
    email: string;
    addressLine: string;
    city: string;
    district?: string;
    note?: string;
    paymentMethod: 'cod' | 'bank_transfer' | 'stripe';
    paymentMode: PaymentMode; // Order-level payment mode: deposit, full, or cod
}

interface FormErrors {
    fullName?: string;
    phone?: string;
    email?: string;
    addressLine?: string;
    city?: string;
}

export default function CheckoutPage() {
    const t = useTranslations('checkout');
    const tCommon = useTranslations('common');
    const router = useRouter();
    const { items, getTotal, clearCart } = useCartStore();

    // Check if cart has deposit-eligible products (for UI display only)
    // Actual eligibility will be validated server-side
    const hasDepositEligibleProducts = items.some((item) => 
        item.depositType || item.depositAmount || item.depositPercentage
    );

    const [formData, setFormData] = useState<CheckoutFormData>({
        fullName: '',
        phone: '',
        email: '',
        addressLine: '',
        city: '',
        district: '',
        note: '',
        paymentMethod: 'cod', // Default to COD
        paymentMode: hasDepositEligibleProducts ? 'full' : 'cod', // Default to full if deposit-eligible, else cod
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [cancelledMessage, setCancelledMessage] = useState<string | null>(null);

    // Check for cancelled Stripe payment and restore inventory
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const cancelled = params.get('cancelled');
        const orderCode = params.get('orderCode');
        
        if (cancelled === '1' && orderCode) {
            setCancelledMessage(t('errors.stripeCancelled'));
            
            // Restore inventory for the cancelled order
            fetch(`/api/orders/${orderCode}/cancel`, {
                method: 'POST',
            }).catch((error) => {
                console.error('Failed to cancel order and restore inventory:', error);
                // Don't show error to user - inventory restoration is best effort
            });
            
            // Clear the URL parameters
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [t]);

    // Redirect if cart is empty
    useEffect(() => {
        if (items.length === 0) {
            router.push('/cart');
        }
    }, [items.length, router]);

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.fullName || !formData.fullName.trim()) {
            newErrors.fullName = t('errors.required');
        }

        if (!formData.phone || !formData.phone.trim()) {
            newErrors.phone = t('errors.required');
        } else {
            // Basic phone validation (Vietnamese format)
            const phoneRegex = /^[0-9]{10,11}$/;
            const cleanedPhone = formData.phone.replace(/\s+/g, '').replace(/-/g, '').replace(/\(/g, '').replace(/\)/g, '');
            if (!phoneRegex.test(cleanedPhone)) {
                newErrors.phone = t('errors.invalidPhone');
            }
        }

        if (formData.email && formData.email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email.trim())) {
                newErrors.email = t('errors.invalidEmail');
            }
        }

        if (!formData.addressLine || !formData.addressLine.trim()) {
            newErrors.addressLine = t('errors.required');
        }

        if (!formData.city || !formData.city.trim()) {
            newErrors.city = t('errors.required');
        }

        setErrors(newErrors);
        const isValid = Object.keys(newErrors).length === 0;
        if (!isValid) {
            console.log('Validation errors:', newErrors);
        }
        return isValid;
    };

    const handleInputChange = (field: keyof CheckoutFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field as keyof FormErrors]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
        setSubmitError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Form submitted', { formData, items });

        const isValid = validateForm();
        console.log('Form validation result:', isValid, errors);
        
        if (!isValid) {
            console.log('Form validation failed, errors:', errors);
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            console.log('Sending order request...');
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items: items.map((item) => ({
                        productId: item.productId,
                        variantId: item.variantId,
                        quantity: item.quantity,
                        // Remove item-level deposit flags - paymentMode is the source of truth
                    })),
                    customerInfo: {
                        fullName: formData.fullName.trim(),
                        phone: formData.phone.trim(),
                        email: formData.email.trim() || undefined,
                    },
                    shippingAddress: {
                        addressLine: formData.addressLine.trim(),
                        city: formData.city.trim(),
                        district: formData.district?.trim() || undefined,
                    },
                    paymentMethod: formData.paymentMethod === 'stripe' ? 'bank_transfer' : formData.paymentMethod, // Map stripe to bank_transfer for now
                    paymentMode: formData.paymentMode, // Order-level payment mode
                    note: formData.note?.trim() || undefined,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                const errorMessage =
                    result.details || result.error || t('errors.submitFailed');
                console.error('Order creation failed:', result);
                throw new Error(errorMessage);
            }

            // If Stripe payment, create checkout session and redirect
            if (formData.paymentMethod === 'stripe') {
                const stripeResponse = await fetch('/api/stripe/create-checkout-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        orderCode: result.orderCode,
                    }),
                });

                const stripeResult = await stripeResponse.json();

                if (!stripeResponse.ok) {
                    // Log full error for debugging
                    console.error('Stripe checkout session creation failed:', stripeResult);
                    const errorMessage = stripeResult.details || stripeResult.error || t('errors.stripeFailed');
                    throw new Error(errorMessage);
                }

                // Redirect to Stripe Checkout
                if (stripeResult.url) {
                    clearCart();
                    window.location.href = stripeResult.url;
                    return;
                } else {
                    throw new Error(t('errors.stripeNoUrl'));
                }
            }

            // For non-Stripe payments, clear cart and redirect to success page
            clearCart();
            router.push(`/order-success/${result.orderCode}`);
        } catch (error) {
            console.error('Checkout error:', error);
            setSubmitError(
                error instanceof Error ? error.message : t('errors.submitFailed')
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const subtotal = getTotal();
    
    // Calculate amounts based on paymentMode (single source of truth)
    // For deposit mode, we need to calculate deposit from product config
    // This is approximate - server will calculate final amounts
    const calculateDepositAmount = (item: typeof items[0]): number => {
        if (item.depositType === 'percent' && item.depositPercentage) {
            return Math.round((item.priceVnd * item.depositPercentage) / 100);
        }
        return item.depositAmount || 0;
    };
    
    // Only calculate deposit if paymentMode === 'deposit'
    const depositAmount = formData.paymentMode === 'deposit'
        ? items.reduce((sum, item) => sum + calculateDepositAmount(item) * item.quantity, 0)
        : 0;
    
    const remainingAmount = formData.paymentMode === 'deposit' ? subtotal - depositAmount : 0;
    
    // Calculate payNow based on paymentMode and paymentMethod
    // For deposit + COD: customer pays deposit when receiving order (payNow = 0)
    // For deposit + online: customer pays deposit now (payNow = depositAmount)
    const payNow = formData.paymentMode === 'deposit' 
        ? (formData.paymentMethod === 'cod' ? 0 : depositAmount) // Deposit + COD: pay deposit on delivery
        : formData.paymentMode === 'full' 
            ? subtotal 
            : 0; // COD mode: payNow = 0

    if (items.length === 0) {
        return null; // Will redirect via useEffect
    }

    return (
        <div className={styles.checkoutPage}>
            <div className="container">
                <h1>{t('title')}</h1>
                <div className={styles.checkoutLayout}>
                    <form className={styles.checkoutForm} onSubmit={handleSubmit}>
                        <div className={`${styles.formSection} card`}>
                            <h2>{t('information.title')}</h2>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label className="label">
                                        {t('information.fullName.label')} *
                                    </label>
                                    <input
                                        type="text"
                                        className={`input ${errors.fullName ? styles.inputError : ''}`}
                                        placeholder={t('information.fullName.placeholder')}
                                        value={formData.fullName}
                                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                                        required
                                    />
                                    {errors.fullName && (
                                        <span className={styles.errorMessage}>{errors.fullName}</span>
                                    )}
                                </div>
                                <div className={styles.formGroup}>
                                    <label className="label">
                                        {t('information.phone.label')} *
                                    </label>
                                    <input
                                        type="tel"
                                        className={`input ${errors.phone ? styles.inputError : ''}`}
                                        placeholder={t('information.phone.placeholder')}
                                        value={formData.phone}
                                        onChange={(e) => handleInputChange('phone', e.target.value)}
                                        required
                                    />
                                    {errors.phone && (
                                        <span className={styles.errorMessage}>{errors.phone}</span>
                                    )}
                                </div>
                                <div className={`${styles.formGroup} ${styles.formGroupFullWidth}`}>
                                    <label className="label">{t('information.email.label')}</label>
                                    <input
                                        type="email"
                                        className={`input ${errors.email ? styles.inputError : ''}`}
                                        placeholder={t('information.email.placeholder')}
                                        value={formData.email}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                    />
                                    {errors.email && (
                                        <span className={styles.errorMessage}>{errors.email}</span>
                                    )}
                                </div>
                                <div className={`${styles.formGroup} ${styles.formGroupFullWidth}`}>
                                    <label className="label">
                                        {t('information.address.label')} *
                                    </label>
                                    <input
                                        type="text"
                                        className={`input ${errors.addressLine ? styles.inputError : ''}`}
                                        placeholder={t('information.address.placeholder')}
                                        value={formData.addressLine}
                                        onChange={(e) => handleInputChange('addressLine', e.target.value)}
                                        required
                                    />
                                    {errors.addressLine && (
                                        <span className={styles.errorMessage}>{errors.addressLine}</span>
                                    )}
                                </div>
                                <div className={styles.formGroup}>
                                    <label className="label">
                                        {t('information.city.label')} *
                                    </label>
                                    <input
                                        type="text"
                                        className={`input ${errors.city ? styles.inputError : ''}`}
                                        placeholder={t('information.city.placeholder')}
                                        value={formData.city}
                                        onChange={(e) => handleInputChange('city', e.target.value)}
                                        required
                                    />
                                    {errors.city && (
                                        <span className={styles.errorMessage}>{errors.city}</span>
                                    )}
                                </div>
                                <div className={styles.formGroup}>
                                    <label className="label">{t('information.district.label')}</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder={t('information.district.placeholder')}
                                        value={formData.district}
                                        onChange={(e) => handleInputChange('district', e.target.value)}
                                    />
                                </div>
                                <div className={`${styles.formGroup} ${styles.formGroupFullWidth}`}>
                                    <label className="label">{t('information.note.label')}</label>
                                    <textarea
                                        className="input"
                                        placeholder={t('information.note.placeholder')}
                                        value={formData.note}
                                        onChange={(e) => handleInputChange('note', e.target.value)}
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Payment Mode Selection (only if deposit-eligible products exist) */}
                        {hasDepositEligibleProducts && (
                            <div className={`${styles.formSection} card`}>
                                <h2>{t('paymentMode.title')}</h2>
                                <p className={styles.paymentModeDescription}>{t('paymentMode.description')}</p>
                                <div className={styles.paymentMethods}>
                                    <label className={styles.paymentMethod}>
                                        <input
                                            type="radio"
                                            name="paymentMode"
                                            value="deposit"
                                            checked={formData.paymentMode === 'deposit'}
                                            onChange={(e) => {
                                                handleInputChange('paymentMode', e.target.value);
                                                // Allow deposit with any payment method (including COD)
                                            }}
                                        />
                                        <div className={styles.paymentInfo}>
                                            <strong>{t('paymentMode.deposit.title')}</strong>
                                            <p>{t('paymentMode.deposit.description')}</p>
                                        </div>
                                    </label>
                                    <label className={styles.paymentMethod}>
                                        <input
                                            type="radio"
                                            name="paymentMode"
                                            value="full"
                                            checked={formData.paymentMode === 'full'}
                                            onChange={(e) => handleInputChange('paymentMode', e.target.value)}
                                        />
                                        <div className={styles.paymentInfo}>
                                            <strong>{t('paymentMode.full.title')}</strong>
                                            <p>{t('paymentMode.full.description')}</p>
                                        </div>
                                    </label>
                                    <label className={styles.paymentMethod}>
                                        <input
                                            type="radio"
                                            name="paymentMode"
                                            value="cod"
                                            checked={formData.paymentMode === 'cod'}
                                            onChange={(e) => {
                                                handleInputChange('paymentMode', e.target.value);
                                                // If switching to cod, set payment method to cod
                                                handleInputChange('paymentMethod', 'cod');
                                            }}
                                        />
                                        <div className={styles.paymentInfo}>
                                            <strong>{t('paymentMode.cod.title')}</strong>
                                            <p>{t('paymentMode.cod.description')}</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        <div className={`${styles.formSection} card`}>
                            <h2>{t('payment.title')}</h2>
                            <div className={styles.paymentMethods}>
                                <label className={styles.paymentMethod}>
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="cod"
                                        checked={formData.paymentMethod === 'cod'}
                                        onChange={(e) => {
                                            handleInputChange('paymentMethod', e.target.value);
                                            // If selecting COD and paymentMode is 'full', set paymentMode to cod
                                            if (formData.paymentMode === 'full') {
                                                handleInputChange('paymentMode', 'cod');
                                            }
                                            // Allow COD with deposit mode (customer pays deposit when receiving order)
                                        }}
                                    />
                                    <div className={styles.paymentInfo}>
                                        <strong>{t('payment.methods.cod.title')}</strong>
                                        <p>
                                            {formData.paymentMode === 'deposit' 
                                                ? t('payment.methods.cod.descriptionDeposit')
                                                : t('payment.methods.cod.description')}
                                        </p>
                                    </div>
                                </label>
                                <label className={styles.paymentMethod}>
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="bank_transfer"
                                        checked={formData.paymentMethod === 'bank_transfer'}
                                        onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                                        disabled={formData.paymentMode === 'cod'} // COD mode doesn't allow bank transfer
                                    />
                                    <div className={styles.paymentInfo}>
                                        <strong>{t('payment.methods.bankTransfer.title')}</strong>
                                        <p>{t('payment.methods.bankTransfer.description')}</p>
                                    </div>
                                </label>
                                <label className={styles.paymentMethod}>
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="stripe"
                                        checked={formData.paymentMethod === 'stripe'}
                                        onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                                        disabled={formData.paymentMode === 'cod'} // COD mode doesn't allow Stripe
                                    />
                                    <div className={styles.paymentInfo}>
                                        <strong>{t('payment.methods.stripe.title')}</strong>
                                        <p>{t('payment.methods.stripe.description')}</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {cancelledMessage && (
                            <div className={`${styles.errorBanner} card`} style={{ backgroundColor: '#fff8f0', borderLeft: '4px solid #d4a574' }}>
                                <p>{cancelledMessage}</p>
                            </div>
                        )}
                        {submitError && (
                            <div className={`${styles.errorBanner} card`}>
                                <p>{submitError}</p>
                            </div>
                        )}

                        <div className={styles.checkoutActions}>
                            <Link href="/cart" className="btn btn-ghost">
                                {t('actions.backToCart')}
                            </Link>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? t('actions.processing') || 'Processing...' : t('actions.placeOrder')}
                            </button>
                        </div>
                    </form>

                    <div className={`${styles.orderSummary} card-elevated`}>
                        <h3>{t('orderSummary.title')}</h3>
                        <div className={styles.summaryItems}>
                            {items.map((item) => (
                                <div key={cartItemKey(item)} className={styles.summaryItem}>
                                    <span>
                                        {item.name}{item.variantName ? ` — ${item.variantName}` : ""} × {item.quantity}
                                    </span>
                                    <span>
                                        {(item.priceVnd * item.quantity).toLocaleString('vi-VN')} {tCommon('currency')}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="divider"></div>
                        <div className={styles.summaryRow}>
                            <span>{t('orderSummary.subtotal')}</span>
                            <span>{subtotal.toLocaleString('vi-VN')} {tCommon('currency')}</span>
                        </div>
                        {formData.paymentMode === 'deposit' && (
                            <>
                                <div className={styles.summaryRow}>
                                    <span className="text-accent font-semibold">{t('orderSummary.depositAmount')}</span>
                                    <span className="text-accent font-semibold">
                                        {depositAmount.toLocaleString('vi-VN')} {tCommon('currency')}
                                    </span>
                                </div>
                                <div className={styles.summaryRow}>
                                    <span className="text-sm text-secondary">{t('orderSummary.remainingBalance')}</span>
                                    <span className="text-sm text-secondary">
                                        {remainingAmount.toLocaleString('vi-VN')} {tCommon('currency')}
                                    </span>
                                </div>
                                <div className={styles.depositNotice}>
                                    <p className="font-semibold mb-2">{t('deposit.title')}</p>
                                    <p className="text-sm">{t('deposit.description')}</p>
                                    {formData.paymentMethod === 'cod' ? (
                                        <p className="text-sm mt-2">
                                            {t('deposit.payOnDelivery')}: <strong>{depositAmount.toLocaleString('vi-VN')} {tCommon('currency')}</strong>
                                        </p>
                                    ) : (
                                        <p className="text-sm mt-2">
                                            {t('deposit.dueNow')}: <strong>{depositAmount.toLocaleString('vi-VN')} {tCommon('currency')}</strong>
                                        </p>
                                    )}
                                </div>
                            </>
                        )}
                        <div className={styles.summaryRow}>
                            <strong>{t('orderSummary.total')}</strong>
                            <strong className="text-accent">
                                {formData.paymentMode === 'deposit' && formData.paymentMethod === 'cod'
                                    ? t('orderSummary.payOnDelivery')
                                    : formData.paymentMode === 'deposit'
                                        ? `${depositAmount.toLocaleString('vi-VN')} ${tCommon('currency')} ${t('orderSummary.depositDueNow')}`
                                        : formData.paymentMode === 'full'
                                            ? `${subtotal.toLocaleString('vi-VN')} ${tCommon('currency')}`
                                            : t('orderSummary.payOnDelivery')}
                            </strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
