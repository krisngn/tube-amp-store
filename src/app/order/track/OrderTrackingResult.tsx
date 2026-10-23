'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import ClaimOrderCTA from './ClaimOrderCTA';
import type { TrackedOrderDTO } from '@/lib/repositories/orders/tracking';
import styles from './OrderTrackingResult.module.css';

interface OrderTrackingResultProps {
    order: TrackedOrderDTO;
    emailOrPhone: string;
    onTrackAnother: () => void;
}

export default function OrderTrackingResult({
    order,
    emailOrPhone,
    onTrackAnother,
}: OrderTrackingResultProps) {
    const t = useTranslations('tracking');
    const tCommon = useTranslations('common');
    const locale = useLocale();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN').format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusLabel = (status: string) => {
        return t(`status.${status}`, { defaultValue: status });
    };

    const getPaymentStatusLabel = (status: string) => {
        return t(`paymentStatus.${status}`, { defaultValue: status });
    };

    return (
        <div className={styles.orderDetails}>
            {/* Order Header */}
            <div className={styles.orderHeader}>
                <div>
                    <h2>{t('order.orderCode')}: {order.orderCode}</h2>
                    <p className={styles.orderDate}>
                        {t('order.createdAt')}: {formatDate(order.createdAt)}
                    </p>
                </div>
                <div className={styles.statusBadges}>
                    <StatusBadge 
                        status={order.status} 
                        type="order" 
                        label={getStatusLabel(order.status)}
                    />
                    {order.paymentStatus && order.paymentStatus !== order.status && (
                        <StatusBadge 
                            status={order.paymentStatus} 
                            type="payment" 
                            label={getPaymentStatusLabel(order.paymentStatus)}
                        />
                    )}
                </div>
            </div>

            {/* Status Timeline */}
            {order.statusHistory.length > 0 && (
                <div className={styles.statusTimeline}>
                    <h3>{t('order.timeline')}</h3>
                    <div className={styles.timeline}>
                        {order.statusHistory.map((history) => (
                            <div key={history.id} className={styles.timelineItem}>
                                <div className={styles.timelineDot} />
                                <div className={styles.timelineContent}>
                                    <div className={styles.timelineStatus}>
                                        {history.fromStatus ? (
                                            <>
                                                {getStatusLabel(history.fromStatus)} → {getStatusLabel(history.toStatus)}
                                            </>
                                        ) : (
                                            getStatusLabel(history.toStatus)
                                        )}
                                    </div>
                                    <div className={styles.timelineDate}>
                                        {formatDate(history.createdAt)}
                                    </div>
                                    {history.note && (
                                        <div className={styles.timelineNote}>
                                            {history.note}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Order Items */}
            <div className={styles.itemsSection}>
                <h3>{t('order.items')}</h3>
                <div className={styles.itemsList}>
                    {order.orderItems.map((item) => (
                        <div key={item.id} className={styles.orderItem}>
                            {item.productImageUrl && (
                                <img
                                    src={item.productImageUrl}
                                    alt={item.productName}
                                    className={styles.itemImage}
                                />
                            )}
                            <div className={styles.itemInfo}>
                                <h4>{item.productName}</h4>
                                <p>
                                    {tCommon('quantity')}: {item.quantity} × {formatCurrency(item.unitPrice)} {tCommon('currency')}
                                </p>
                            </div>
                            <div className={styles.itemTotal}>
                                {formatCurrency(item.subtotal)} {tCommon('currency')}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Totals */}
            <div className={styles.totalsSection}>
                <h3>{t('order.totals')}</h3>
                <div className={styles.totalsList}>
                    <div className={styles.totalRow}>
                        <span>{t('order.subtotal')}</span>
                        <span>{formatCurrency(order.subtotal)} {tCommon('currency')}</span>
                    </div>
                    {order.shippingFee === 0 && <p className="text-sm text-secondary">{t('order.shippingNote')}</p>}
                            {order.shippingFee > 0 && (
                        <div className={styles.totalRow}>
                            <span>{t('order.shipping')}</span>
                            <span>{formatCurrency(order.shippingFee)} {tCommon('currency')}</span>
                        </div>
                    )}
                    {order.tax > 0 && (
                        <div className={styles.totalRow}>
                            <span>{t('order.tax')}</span>
                            <span>{formatCurrency(order.tax)} {tCommon('currency')}</span>
                        </div>
                    )}
                    {order.discount > 0 && (
                        <div className={styles.totalRow}>
                            <span>{t('order.discount')}</span>
                            <span>-{formatCurrency(order.discount)} {tCommon('currency')}</span>
                        </div>
                    )}
                    {order.orderType === 'deposit_reservation' && order.depositAmountVnd && (
                        <>
                            <div className={`${styles.totalRow} ${styles.depositRow}`}>
                                <span>{t('order.depositAmount')}</span>
                                <span className="text-accent">
                                    {formatCurrency(order.depositAmountVnd)} {tCommon('currency')}
                                </span>
                            </div>
                            {order.remainingAmount && (
                                <div className={styles.totalRow}>
                                    <span>{t('order.remainingBalance')}</span>
                                    <span>{formatCurrency(order.remainingAmount)} {tCommon('currency')}</span>
                                </div>
                            )}
                        </>
                    )}
                    <div className={`${styles.totalRow} ${styles.totalRowFinal}`}>
                        <strong>
                            {order.orderType === 'deposit_reservation' && order.depositAmountVnd
                                ? t('order.depositDue')
                                : t('order.total')}
                        </strong>
                        <strong className="text-accent">
                            {order.orderType === 'deposit_reservation' && order.depositAmountVnd
                                ? `${formatCurrency(order.depositAmountVnd)} ${tCommon('currency')}`
                                : `${formatCurrency(order.total)} ${tCommon('currency')}`}
                        </strong>
                    </div>
                </div>
            </div>

            {/* Deposit Details */}
            {order.orderType === 'deposit_reservation' && (
                <div className={styles.depositSection}>
                    <h3>{t('order.depositDetails')}</h3>
                    <div className={styles.depositInfo}>
                        {order.depositAmountVnd && (
                            <div className={styles.depositRow}>
                                <span>{t('order.depositAmount')}:</span>
                                <strong className="text-accent">
                                    {formatCurrency(order.depositAmountVnd)} {tCommon('currency')}
                                </strong>
                            </div>
                        )}
                        {order.depositDueAt && (
                            <div className={styles.depositRow}>
                                <span>{t('order.depositDueAt')}:</span>
                                <strong>
                                    {formatDate(order.depositDueAt)}
                                </strong>
                            </div>
                        )}
                        {order.remainingAmount && (
                            <div className={styles.depositRow}>
                                <span>{t('order.remainingBalance')}:</span>
                                <span>
                                    {formatCurrency(order.remainingAmount)} {tCommon('currency')}
                                </span>
                            </div>
                        )}
                        {order.depositReceivedAt && (
                            <div className={styles.depositRow}>
                                <span>{t('order.depositReceivedAt')}:</span>
                                <span className="text-success">
                                    {formatDate(order.depositReceivedAt)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Payment Status */}
            <div className={styles.paymentSection}>
                <h3>{t('order.paymentStatus')}</h3>
                <p>
                    <strong>{getPaymentStatusLabel(order.paymentStatus)}</strong>
                </p>
                <p className={styles.paymentMethod}>
                    {t('order.paymentMethod')}: {order.paymentMethod === 'cod' ? t('order.paymentCod') : t('order.paymentBank')}
                </p>
            </div>

            {/* Claim CTA */}
            <ClaimOrderCTA
                orderCode={order.orderCode}
                orderId={order.id}
                claimMethod="tracking_lookup"
                emailOrPhone={emailOrPhone}
            />

            {/* Actions */}
            <div className={styles.actions}>
                <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={onTrackAnother}
                >
                    {t('actions.trackAnother')}
                </button>
                <Link href="/contact" className="btn btn-primary">
                    {t('actions.contact')}
                </Link>
            </div>
        </div>
    );
}

