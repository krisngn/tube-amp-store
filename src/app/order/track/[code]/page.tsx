import { getTranslations, getLocale } from 'next-intl/server';
import { getTrackableOrderByToken } from '@/lib/repositories/orders/tracking';
import styles from './page.module.css';
import TrackingFormWrapper from './TrackingFormWrapper';
import OrderActions from './OrderActions';
import DepositProofUpload from './DepositProofUpload';
import ClaimOrderCTA from '@/app/order/track/ClaimOrderCTA';
import type { TrackedOrderDTO } from '@/lib/repositories/orders/tracking';
import type { Metadata } from 'next';
import { getDepositProofByOrderId, canUploadProof } from '@/lib/repositories/deposit-proofs';

interface TrackOrderDetailPageProps {
    params: Promise<{ code: string }>;
    searchParams: Promise<{ t?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
    const locale = await getLocale();
    const t = await getTranslations({ locale, namespace: 'tracking' });
    
    return {
        title: t('title'),
    };
}

async function getOrderByToken(orderCode: string, token: string): Promise<TrackedOrderDTO | null> {
    try {
        const order = await getTrackableOrderByToken(orderCode, token);
        return order;
    } catch (error) {
        console.error('Error fetching order by token:', error);
        return null;
    }
}

export default async function TrackOrderDetailPage({ params, searchParams }: TrackOrderDetailPageProps) {
    const { code } = await params;
    const { t: token } = await searchParams;
    const locale = await getLocale();
    const t = await getTranslations({ locale, namespace: 'tracking' });

    // If token exists, try to fetch order
    let order: TrackedOrderDTO | null = null;
    let showError = false;

    if (token) {
        order = await getOrderByToken(code, token);
        if (!order) {
            // Token is invalid/expired - show form with error
            showError = true;
        }
    }

    // If no token or invalid token, show form
    if (!token || !order) {
        return (
            <div className={styles.trackPage}>
                <div className="container">
                    <div className={styles.trackHeader}>
                        <h1>{t('title')}</h1>
                        <p className={styles.subtitle}>{t('subtitle')}</p>
                    </div>
                    
                    <TrackingFormWrapper 
                        initialOrderCode={code}
                        errorMessage={showError ? t('errors.invalidLinkBody') : undefined}
                    />
                </div>
            </div>
        );
    }

    // Token is valid and order found - show order details
    const tCommon = await getTranslations({ locale, namespace: 'common' });

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
        <div className={styles.trackPage}>
            <div className="container">
                <div className={styles.trackHeader}>
                    <h1>{t('title')}</h1>
                </div>

                <div className={styles.orderDetails}>
                    {/* Order Header */}
                    <div className={styles.orderHeader}>
                        <div>
                            <h2>{t('order.orderCode')}: {order.orderCode}</h2>
                            <p className={styles.orderDate}>
                                {t('order.createdAt')}: {formatDate(order.createdAt)}
                            </p>
                        </div>
                        <div className={styles.statusBadge}>
                            <span className={styles.statusLabel}>{t('order.status')}:</span>
                            <span className={`${styles.statusValue} ${styles[`status-${order.status}`]}`}>
                                {getStatusLabel(order.status)}
                            </span>
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

                    {/* Deposit Proof Upload (for bank transfer deposits) */}
                    {order.orderType === 'deposit_reservation' && 
                     order.paymentMethod === 'bank_transfer' && 
                     order.paymentStatus === 'deposit_pending' && (
                        <DepositProofUploadSection 
                            orderId={order.id}
                            orderCode={order.orderCode}
                            token={token!}
                            locale={locale}
                        />
                    )}

                    {/* Claim CTA */}
                    <ClaimOrderCTA
                        orderCode={code}
                        orderId={order.id}
                        claimMethod="token_link"
                        token={token!}
                    />

                    {/* Actions */}
                    <OrderActions order={order} token={token!} />
                </div>
            </div>
        </div>
    );
}

/**
 * Server component to fetch proof status and render upload component
 */
async function DepositProofUploadSection({ 
    orderId, 
    orderCode,
    token,
    locale,
}: { 
    orderId: string;
    orderCode: string; 
    token: string;
    locale: string;
}) {
    const t = await getTranslations({ locale, namespace: 'tracking' });
    
    // Fetch current proof status
    const proof = await getDepositProofByOrderId(orderId);
    const { canUpload, reason } = await canUploadProof(orderId);
    
    const proofStatus = proof ? {
        id: proof.id,
        status: proof.status,
        submittedAt: proof.submittedAt,
        reviewNote: proof.reviewNote,
        imageCount: proof.imageUrls.length,
    } : null;
    
    return (
        <DepositProofUpload
            orderCode={orderCode}
            token={token}
            initialProofStatus={proofStatus}
            canUpload={canUpload}
            cannotUploadReason={reason}
            locale={locale}
            translations={{
                title: t('proof.title', { defaultValue: 'Proof of Transfer' }),
                subtitle: t('proof.subtitle', { defaultValue: 'Upload a screenshot or photo of your bank transfer to verify your deposit.' }),
                dropzoneText: t('proof.dropzoneText', { defaultValue: 'Click or drag images here' }),
                dropzoneHint: t('proof.dropzoneHint', { defaultValue: 'JPG, PNG, or WEBP' }),
                noteLabel: t('proof.noteLabel', { defaultValue: 'Note (optional)' }),
                notePlaceholder: t('proof.notePlaceholder', { defaultValue: 'Add any additional information...' }),
                uploadButton: t('proof.uploadButton', { defaultValue: 'Upload Proof' }),
                uploading: t('proof.uploading', { defaultValue: 'Uploading...' }),
                successMessage: t('proof.successMessage', { defaultValue: 'Proof uploaded successfully! We will review it shortly.' }),
                errorMessage: t('proof.errorMessage', { defaultValue: 'Failed to upload proof. Please try again.' }),
                statusPending: t('proof.statusPending', { defaultValue: 'Your proof is being reviewed. We will notify you once verified.' }),
                statusApproved: t('proof.statusApproved', { defaultValue: 'Your deposit has been verified. Thank you!' }),
                statusRejected: t('proof.statusRejected', { defaultValue: 'Your proof was not accepted. Please upload a clearer image.' }),
                rejectionNote: t('proof.rejectionNote', { defaultValue: 'Reason' }),
                submittedAt: t('proof.submittedAt', { defaultValue: 'Submitted' }),
                cannotUpload: t('proof.cannotUpload', { defaultValue: 'Proof upload is not available for this order.' }),
                reuploadButton: t('proof.reuploadButton', { defaultValue: 'Re-upload Proof' }),
                maxFiles: t('proof.maxFiles', { defaultValue: 'Max 3 files' }),
                maxSize: t('proof.maxSize', { defaultValue: 'Max 5MB each' }),
                allowedTypes: t('proof.allowedTypes', { defaultValue: 'JPG, PNG, or WEBP only' }),
            }}
        />
    );
}

