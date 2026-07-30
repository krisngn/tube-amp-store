import { notFound } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import styles from './page.module.css';
import BankTransferInstructions from './BankTransferInstructions';
import { getBankNameFromBin } from '@/lib/vietqr/generator';

interface OrderItem {
    product_name: string;
    product_slug?: string;
    product_image_url?: string;
    unit_price: number;
    quantity: number;
    subtotal: number;
}

interface Order {
    id: string;
    order_number: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    shipping_address_line: string;
    shipping_city: string;
    shipping_district?: string;
    subtotal: number;
    shipping_fee: number;
    tax: number;
    discount: number;
    total: number;
    payment_method: 'cod' | 'bank_transfer';
    payment_status: string;
    status: string;
    order_type: 'standard' | 'deposit_reservation';
    is_deposit_order: boolean;
    deposit_amount_vnd?: number;
    deposit_due_at?: string;
    deposit_received_at?: string;
    remaining_amount?: number;
    customer_note?: string;
    created_at: string;
    order_items: OrderItem[];
    // Bank transfer specific fields
    bank_transfer_memo?: string;
    vietqr_generated_at?: string;
}

interface OrderSuccessPageProps {
    params: Promise<{ locale: string; orderCode: string }>;
    searchParams: Promise<{ session_id?: string }>;
}

async function getOrder(orderCode: string): Promise<Order | null> {
    try {
        const supabase = await createClient();

        const { data: order, error } = await supabase
            .from('orders')
            .select(
                `
                id,
                order_number,
                customer_name,
                customer_email,
                customer_phone,
                shipping_address_line,
                shipping_city,
                shipping_district,
                subtotal,
                shipping_fee,
                tax,
                discount,
                total,
                payment_method,
                payment_status,
                status,
                order_type,
                is_deposit_order,
                deposit_amount_vnd,
                deposit_due_at,
                deposit_received_at,
                remaining_amount,
                customer_note,
                created_at,
                bank_transfer_memo,
                vietqr_generated_at,
                order_items (
                    product_name,
                    product_slug,
                    product_image_url,
                    unit_price,
                    quantity,
                    subtotal
                )
            `
            )
            .eq('order_number', orderCode)
            .single();

        if (error || !order) {
            return null;
        }

        return order as Order;
    } catch (error) {
        console.error('Error fetching order:', error);
        return null;
    }
}

export default async function OrderSuccessPage({ params, searchParams }: OrderSuccessPageProps) {
    const { orderCode } = await params;
    const { session_id } = await searchParams;
    const locale = await getLocale();
    const order = await getOrder(orderCode);

    if (!order) {
        notFound();
    }

    const t = await getTranslations({ locale, namespace: 'order' });
    const tCommon = await getTranslations({ locale, namespace: 'common' });

    return (
        <div className={styles.orderSuccessPage}>
            <div className="container">
                <div className={styles.successHeader}>
                    <div className={styles.successIcon}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M20 6L9 17l-5-5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <h1>
                        {order.order_type === 'deposit_reservation'
                            ? t('success.depositTitle', { defaultValue: 'Deposit Reservation Confirmed!' })
                            : t('success.title')}
                    </h1>
                    <p className={styles.subtitle}>
                        {session_id
                            ? t('success.stripeSubtitle', { defaultValue: 'Your payment is being processed. You will receive a confirmation email shortly.' })
                            : order.order_type === 'deposit_reservation'
                            ? t('success.depositSubtitle', { defaultValue: 'Your deposit reservation has been created. Please complete the deposit payment to secure your item.' })
                            : t('success.subtitle')}
                    </p>
                    <p className={styles.orderCode}>
                        {t('success.orderCode', { code: order.order_number })}
                    </p>
                    {session_id && (
                        <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '1rem' }}>
                            {t('success.stripeNote', { defaultValue: 'Note: Payment confirmation may take a few moments. Please check your email for updates.' })}
                        </p>
                    )}
                </div>

                {/* Deposit Reservation Info */}
                {order.order_type === 'deposit_reservation' && (
                    <div className={styles.depositNotice}>
                        <h2>{t('deposit.title', { defaultValue: 'Deposit Reservation Details' })}</h2>
                        <div className={styles.depositInfo}>
                            <div className={styles.depositRow}>
                                <span>{t('deposit.amount', { defaultValue: 'Deposit Amount' })}:</span>
                                <strong className="text-accent">
                                    {order.deposit_amount_vnd
                                        ? `${order.deposit_amount_vnd.toLocaleString('vi-VN')} ${tCommon('currency')}`
                                        : 'N/A'}
                                </strong>
                            </div>
                            {order.deposit_due_at && (
                                <div className={styles.depositRow}>
                                    <span>{t('deposit.dueAt', { defaultValue: 'Deposit Due By' })}:</span>
                                    <strong>
                                        {new Date(order.deposit_due_at).toLocaleString('vi-VN', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </strong>
                                </div>
                            )}
                            {order.remaining_amount && (
                                <div className={styles.depositRow}>
                                    <span>{t('deposit.remaining', { defaultValue: 'Remaining Balance' })}:</span>
                                    <span>
                                        {order.remaining_amount.toLocaleString('vi-VN')} {tCommon('currency')}
                                    </span>
                                </div>
                            )}
                            <div className={styles.depositWarning}>
                                <p>
                                    {t('deposit.warning', {
                                        defaultValue:
                                            'Important: Please complete the deposit payment by the deadline above. If the deposit is not received by the deadline, your reservation may expire.',
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bank Transfer Instructions with VietQR */}
                {order.order_type === 'deposit_reservation' && order.payment_method === 'bank_transfer' && (
                    <BankTransferInstructions
                        order={order}
                        locale={locale}
                        translations={{
                            title: t('bankTransfer.title', { defaultValue: 'Bank Transfer Instructions' }),
                            qrTitle: t('bankTransfer.qrTitle', { defaultValue: 'Scan VietQR to Pay' }),
                            qrInstructions: t('bankTransfer.qrInstructions', { defaultValue: 'Open your banking app and scan this QR code to complete the deposit payment. The amount and transfer memo will be pre-filled.' }),
                            bankDetails: t('bankTransfer.bankDetails', { defaultValue: 'Bank Account Details' }),
                            bankName: t('bankTransfer.bankName', { defaultValue: 'Bank' }),
                            accountNumber: t('bankTransfer.accountNumber', { defaultValue: 'Account Number' }),
                            accountName: t('bankTransfer.accountName', { defaultValue: 'Account Name' }),
                            amount: t('bankTransfer.amount', { defaultValue: 'Deposit Amount' }),
                            memo: t('bankTransfer.memo', { defaultValue: 'Transfer Memo' }),
                            memoNote: t('bankTransfer.memoNote', { defaultValue: 'Important: Please include this memo exactly as shown. This helps us identify your payment.' }),
                            copyMemo: t('bankTransfer.copyMemo', { defaultValue: 'Copy' }),
                            copied: t('bankTransfer.copied', { defaultValue: 'Copied!' }),
                            deadline: t('bankTransfer.deadline', { defaultValue: 'Payment Deadline' }),
                            deadlineWarning: t('bankTransfer.deadlineWarning', { defaultValue: 'Please complete the transfer before this deadline. If payment is not received, your reservation may expire.' }),
                            nextSteps: {
                                title: t('bankTransfer.nextSteps.title', { defaultValue: 'What Happens Next?' }),
                                step1: t('bankTransfer.nextSteps.step1', { defaultValue: 'Complete the bank transfer using the details above' }),
                                step2: t('bankTransfer.nextSteps.step2', { defaultValue: 'Upload proof of transfer on the order tracking page' }),
                                step3: t('bankTransfer.nextSteps.step3', { defaultValue: 'We will verify your payment and confirm your order' }),
                            },
                            fallbackMessage: t('bankTransfer.fallbackMessage', { defaultValue: "If the QR code doesn't work with your banking app, please use the bank details below to transfer manually." }),
                            currency: tCommon('currency'),
                        }}
                        bankConfig={{
                            bankBin: process.env.VIETQR_BANK_BIN || process.env.BANK_BIN || '970436',
                            accountNumber: process.env.VIETQR_ACCOUNT_NUMBER || process.env.BANK_ACCOUNT_NUMBER || '',
                            accountName: process.env.VIETQR_ACCOUNT_NAME || process.env.BANK_ACCOUNT_NAME || 'VINTAGE AUDIO ACCESSORIES',
                            bankName: getBankNameFromBin(process.env.VIETQR_BANK_BIN || process.env.BANK_BIN || '970436'),
                        }}
                    />
                )}

                <div className={styles.orderDetails}>
                    <h2>{t('orderDetails.title')}</h2>

                    {/* Order Items */}
                    <div className={styles.itemsSection}>
                        <h3>{t('orderDetails.items')}</h3>
                        <div className={styles.itemsList}>
                            {order.order_items.map((item, index) => (
                                <div key={index} className={styles.orderItem}>
                                    {item.product_image_url && (
                                        <img
                                            src={item.product_image_url}
                                            alt={item.product_name}
                                            className={styles.itemImage}
                                        />
                                    )}
                                    <div className={styles.itemInfo}>
                                        <h4>{item.product_name}</h4>
                                        <p>
                                            {tCommon('quantity')}: {item.quantity} ×{' '}
                                            {item.unit_price.toLocaleString('vi-VN')}{' '}
                                            {tCommon('currency')}
                                        </p>
                                    </div>
                                    <div className={styles.itemTotal}>
                                        {(item.subtotal).toLocaleString('vi-VN')} {tCommon('currency')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Shipping Address */}
                    <div className={styles.addressSection}>
                        <h3>{t('orderDetails.shipping')}</h3>
                        <p>
                            <strong>{order.customer_name}</strong>
                            <br />
                            {order.customer_phone}
                            {order.customer_email && (
                                <>
                                    <br />
                                    {order.customer_email}
                                </>
                            )}
                            <br />
                            {order.shipping_address_line}
                            <br />
                            {order.shipping_district && `${order.shipping_district}, `}
                            {order.shipping_city}
                        </p>
                    </div>

                    {/* Payment Method */}
                    <div className={styles.paymentSection}>
                        <h3>{t('orderDetails.payment')}</h3>
                        <p>
                            {order.payment_method === 'cod'
                                ? t('paymentMethods.cod')
                                : t('paymentMethods.bankTransfer')}
                        </p>
                    </div>

                    {/* Order Total */}
                    <div className={styles.totalSection}>
                        <div className={styles.totalRow}>
                            <span>{t('orderDetails.subtotal')}</span>
                            <span>
                                {order.subtotal.toLocaleString('vi-VN')} {tCommon('currency')}
                            </span>
                        </div>
                        {order.shipping_fee > 0 && (
                            <div className={styles.totalRow}>
                                <span>{t('orderDetails.shipping')}</span>
                                <span>
                                    {order.shipping_fee.toLocaleString('vi-VN')} {tCommon('currency')}
                                </span>
                            </div>
                        )}
                        {order.order_type === 'deposit_reservation' && order.deposit_amount_vnd && (
                            <>
                                <div className={styles.totalRow}>
                                    <span className="text-accent font-semibold">
                                        {t('orderDetails.depositAmount', { defaultValue: 'Deposit Amount Due Now' })}
                                    </span>
                                    <span className="text-accent font-semibold">
                                        {order.deposit_amount_vnd.toLocaleString('vi-VN')} {tCommon('currency')}
                                    </span>
                                </div>
                                {order.remaining_amount && (
                                    <div className={styles.totalRow}>
                                        <span className="text-sm text-secondary">
                                            {t('orderDetails.remainingBalance', { defaultValue: 'Remaining Balance' })}
                                        </span>
                                        <span className="text-sm text-secondary">
                                            {order.remaining_amount.toLocaleString('vi-VN')} {tCommon('currency')}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                        <div className={`${styles.totalRow} ${styles.totalRowFinal}`}>
                            <strong>
                                {order.order_type === 'deposit_reservation'
                                    ? t('orderDetails.depositDue', { defaultValue: 'Deposit Due Now' })
                                    : t('orderDetails.total')}
                            </strong>
                            <strong className="text-accent">
                                {order.order_type === 'deposit_reservation' && order.deposit_amount_vnd
                                    ? `${order.deposit_amount_vnd.toLocaleString('vi-VN')} ${tCommon('currency')}`
                                    : `${order.total.toLocaleString('vi-VN')} ${tCommon('currency')}`}
                            </strong>
                        </div>
                    </div>
                </div>

                {/* Next Steps */}
                <div className={styles.nextSteps}>
                    <h2>{t('nextSteps.title')}</h2>
                    {order.payment_method === 'cod' ? (
                        <div className={styles.stepsList}>
                            <p>{t('nextSteps.cod.step1')}</p>
                            <p>{t('nextSteps.cod.step2')}</p>
                            <p>{t('nextSteps.cod.step3')}</p>
                        </div>
                    ) : (
                        <div className={styles.stepsList}>
                            <p>{t('nextSteps.bankTransfer.step1')}</p>
                            <div className={styles.bankInfo}>
                                <h3>{t('nextSteps.bankTransfer.bankInfo.title')}</h3>
                                <p>
                                    <strong>{t('nextSteps.bankTransfer.bankInfo.bank')}:</strong>{' '}
                                    {/* TODO: Add actual bank info */}
                                    Vietcombank
                                </p>
                                <p>
                                    <strong>
                                        {t('nextSteps.bankTransfer.bankInfo.accountNumber')}:
                                    </strong>{' '}
                                    {/* TODO: Add actual account number */}
                                    1234567890
                                </p>
                                <p>
                                    <strong>
                                        {t('nextSteps.bankTransfer.bankInfo.accountName')}:
                                    </strong>{' '}
                                    {/* TODO: Add actual account name */}
                                    Vintage Audio Accessories
                                </p>
                                <p>
                                    <strong>{t('nextSteps.bankTransfer.bankInfo.amount')}:</strong>{' '}
                                    <span className="text-accent">
                                        {order.order_type === 'deposit_reservation' && order.deposit_amount_vnd
                                            ? `${order.deposit_amount_vnd.toLocaleString('vi-VN')} ${tCommon('currency')}`
                                            : `${order.total.toLocaleString('vi-VN')} ${tCommon('currency')}`}
                                    </span>
                                    {order.order_type === 'deposit_reservation' && order.remaining_amount && (
                                        <span className="text-sm text-secondary block mt-1">
                                            {t('deposit.remainingNote', {
                                                defaultValue: `(Remaining balance: ${order.remaining_amount.toLocaleString('vi-VN')} ${tCommon('currency')} to be paid later)`,
                                            })}
                                        </span>
                                    )}
                                </p>
                                <p>
                                    <strong>{t('nextSteps.bankTransfer.bankInfo.content')}:</strong>{' '}
                                    {order.order_number}
                                </p>
                            </div>
                            <p>{t('nextSteps.bankTransfer.step2')}</p>
                            <p>{t('nextSteps.bankTransfer.step3')}</p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    <Link href="/tube-amplifiers" className="btn btn-primary">
                        {t('actions.continueShopping')}
                    </Link>
                    <Link href="/contact" className="btn btn-ghost">
                        {t('actions.contact')}
                    </Link>
                </div>
            </div>
        </div>
    );
}

