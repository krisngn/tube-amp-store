/**
 * Email Service
 * Handles sending transactional emails via Resend
 */

import { Resend } from 'resend';
import { createServiceClient } from '@/lib/supabase/service';
import type { Locale } from '@/config/locales';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getOrCreateTrackingToken } from '@/lib/orderTrackingTokens';

// Initialize Resend client (only if API key exists)
// If no API key, emails will fail gracefully without breaking checkout
let resend: Resend | null = null;
try {
    if (process.env.RESEND_API_KEY) {
        resend = new Resend(process.env.RESEND_API_KEY);
    }
} catch (error) {
    console.warn('Resend client initialization failed:', error);
    // Continue without Resend - emails just won't send
}

// Email types
export type EmailType = 'order_confirmation' | 'status_update' | 'refund' | 'order_cancellation' | 'change_request' | 'deposit_approved' | 'deposit_rejected';

// Email status
export type EmailStatus = 'queued' | 'sent' | 'failed' | 'skipped_no_email';

// Statuses that trigger email notifications
const NOTIFY_STATUSES: string[] = ['confirmed', 'shipped', 'delivered', 'cancelled'];

interface OrderItem {
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

interface OrderConfirmationPayload {
    orderCode: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    shippingAddress: string;
    items: OrderItem[];
    subtotal: number;
    shippingFee: number;
    tax: number;
    discount: number;
    total: number;
    paymentMethod: 'cod' | 'bank_transfer';
    locale: Locale;
    trackingToken?: string; // Optional: tracking token for email link
    trackingUrl?: string; // Optional: full tracking URL
}

interface StatusUpdatePayload {
    orderCode: string;
    customerName: string;
    customerEmail: string;
    oldStatus: string;
    newStatus: string;
    note?: string;
    locale: Locale;
    trackingToken?: string; // Optional: tracking token for email link
    trackingUrl?: string; // Optional: full tracking URL
}

interface RefundPayload {
    orderCode: string;
    customerName: string;
    customerEmail: string;
    refundAmount: number; // Amount in minor units
    currency: string;
    isPartial: boolean;
    locale: Locale;
    trackingToken?: string; // Optional: tracking token for email link
    trackingUrl?: string; // Optional: full tracking URL
}

interface OrderCancellationPayload {
    orderCode: string;
    customerName: string;
    customerEmail: string;
    reason: string;
    locale: Locale;
    trackingToken?: string; // Optional: tracking token for email link
    trackingUrl?: string; // Optional: full tracking URL
}

interface ChangeRequestPayload {
    orderCode: string;
    customerName: string;
    customerEmail: string;
    message: string;
    category: string;
    locale: Locale;
}

/**
 * Get email translations for a locale
 */
function getEmailTranslations(locale: Locale) {
    try {
        // Read JSON files directly using fs (server-side only)
        const messagesPath = join(process.cwd(), 'messages', locale, 'emails.json');
        const translations = JSON.parse(readFileSync(messagesPath, 'utf-8'));
        return translations;
    } catch (error) {
        console.error(`Error loading email translations for locale ${locale}:`, error);
        // Fallback to English if file not found
        if (locale !== 'en') {
            try {
                const fallbackPath = join(process.cwd(), 'messages', 'en', 'emails.json');
                return JSON.parse(readFileSync(fallbackPath, 'utf-8'));
            } catch (fallbackError) {
                console.error('Error loading fallback email translations:', fallbackError);
                // Return minimal fallback object to prevent crashes
                return {
                    orderConfirmation: {
                        subject: 'Order Confirmation - {orderCode}',
                        header: 'Order Confirmation',
                        greeting: 'Hello {customerName},',
                        message: 'Thank you for your order!',
                        orderDetails: 'Order Details',
                        subtotal: 'Subtotal',
                        total: 'Total',
                        shippingAddress: 'Shipping Address',
                        paymentCod: { title: 'Payment Method: COD', message: 'Pay on delivery' },
                        paymentBank: { title: 'Payment Method: Bank Transfer', message: 'Please transfer payment', bank: 'Bank', accountNumber: 'Account', accountName: 'Name', amount: 'Amount', content: 'Content' },
                        support: 'Contact support for questions',
                        footer: '',
                        footerBrand: 'Vintage Audio Accessories',
                    },
                    statusUpdate: {
                        subject: 'Order {orderCode} - Status: {status}',
                        header: 'Order Status Update',
                        greeting: 'Hello {customerName},',
                        message: 'Your order {orderCode} status: {status}',
                        note: 'Note',
                        statusLabels: {},
                        statusDescriptions: {},
                        support: 'Contact support for questions',
                        footerBrand: 'Vintage Audio Accessories',
                    },
                    refund: {
                        header: 'Refund Processed',
                        greeting: 'Hello {customerName},',
                        orderCode: 'Order Code',
                        refundAmount: 'Refund Amount',
                        trackOrder: 'Track Your Order',
                        trackButton: 'Track Order',
                        support: 'If you have any questions, please contact us',
                        footerBrand: 'Vintage Audio Accessories',
                        partialRefund: {
                            subject: 'Partial Refund Processed - Order {orderCode}',
                            title: 'Partial Refund Processed',
                            message: 'A partial refund has been processed for your order {orderCode}.',
                        },
                        fullRefund: {
                            subject: 'Full Refund Processed - Order {orderCode}',
                            title: 'Full Refund Processed',
                            message: 'A full refund has been processed for your order {orderCode}.',
                        },
                    },
                };
            }
        }
        // Return minimal fallback
        return {
            orderConfirmation: {
                subject: 'Order Confirmation - {orderCode}',
                header: 'Order Confirmation',
                greeting: 'Hello {customerName},',
                message: 'Thank you for your order!',
                orderDetails: 'Order Details',
                subtotal: 'Subtotal',
                total: 'Total',
                shippingAddress: 'Shipping Address',
                paymentCod: { title: 'Payment Method: COD', message: 'Pay on delivery' },
                paymentBank: { title: 'Payment Method: Bank Transfer', message: 'Please transfer payment', bank: 'Bank', accountNumber: 'Account', accountName: 'Name', amount: 'Amount', content: 'Content' },
                support: 'Contact support for questions',
                footer: '',
                footerBrand: 'Vintage Audio Accessories',
            },
            statusUpdate: {
                subject: 'Order {orderCode} - Status: {status}',
                header: 'Order Status Update',
                greeting: 'Hello {customerName},',
                message: 'Your order {orderCode} status: {status}',
                note: 'Note',
                statusLabels: {},
                statusDescriptions: {},
                support: 'Contact support for questions',
                footerBrand: 'Vintage Audio Accessories',
            },
            refund: {
                header: 'Refund Processed',
                greeting: 'Hello {customerName},',
                orderCode: 'Order Code',
                refundAmount: 'Refund Amount',
                trackOrder: 'Track Your Order',
                trackButton: 'Track Order',
                support: 'If you have any questions, please contact us',
                footerBrand: 'Vintage Audio Accessories',
                partialRefund: {
                    subject: 'Partial Refund Processed - Order {orderCode}',
                    title: 'Partial Refund Processed',
                    message: 'A partial refund has been processed for your order {orderCode}.',
                },
                fullRefund: {
                    subject: 'Full Refund Processed - Order {orderCode}',
                    title: 'Full Refund Processed',
                    message: 'A full refund has been processed for your order {orderCode}.',
                },
            },
        };
    }
}

/**
 * Generate HTML email template for order confirmation
 */
async function generateOrderConfirmationEmail(
    locale: Locale,
    payload: OrderConfirmationPayload
): Promise<{ subject: string; html: string; text: string }> {
    const t = getEmailTranslations(locale);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN').format(amount);
    };

    const subject = t.orderConfirmation.subject.replace('{orderCode}', payload.orderCode);

    // Build items HTML
    const itemsHtml = payload.items
        .map(
            (item) => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">
                ${item.productName} × ${item.quantity}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">
                ${formatCurrency(item.subtotal)} VND
            </td>
        </tr>
    `
        )
        .join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #0a0a0a; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #d4a574; font-family: 'Cormorant Garamond', serif; font-size: 28px;">
                                ${t.orderConfirmation.header}
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px;">
                            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                                ${t.orderConfirmation.greeting.replace('{customerName}', payload.customerName)}
                            </p>
                            
                            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                                ${t.orderConfirmation.message.replace('{orderCode}', payload.orderCode)}
                            </p>
                            
                            <!-- Order Details -->
                            <h2 style="margin: 30px 0 15px 0; color: #0a0a0a; font-size: 20px; font-weight: 600;">
                                ${t.orderConfirmation.orderDetails}
                            </h2>
                            
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; border-collapse: collapse;">
                                ${itemsHtml}
                                <tr>
                                    <td style="padding: 12px; border-top: 2px solid #0a0a0a; font-weight: 600;">
                                        ${t.orderConfirmation.subtotal}
                                    </td>
                                    <td style="padding: 12px; border-top: 2px solid #0a0a0a; text-align: right; font-weight: 600;">
                                        ${formatCurrency(payload.subtotal)} VND
                                    </td>
                                </tr>
                                ${payload.shippingFee > 0 ? `
                                <tr>
                                    <td style="padding: 12px;">${t.orderConfirmation.shipping}</td>
                                    <td style="padding: 12px; text-align: right;">${formatCurrency(payload.shippingFee)} VND</td>
                                </tr>
                                ` : ''}
                                ${payload.tax > 0 ? `
                                <tr>
                                    <td style="padding: 12px;">${t.orderConfirmation.tax}</td>
                                    <td style="padding: 12px; text-align: right;">${formatCurrency(payload.tax)} VND</td>
                                </tr>
                                ` : ''}
                                ${payload.discount > 0 ? `
                                <tr>
                                    <td style="padding: 12px;">${t.orderConfirmation.discount}</td>
                                    <td style="padding: 12px; text-align: right;">-${formatCurrency(payload.discount)} VND</td>
                                </tr>
                                ` : ''}
                                <tr>
                                    <td style="padding: 12px; border-top: 2px solid #d4a574; font-weight: 700; font-size: 18px;">
                                        ${t.orderConfirmation.total}
                                    </td>
                                    <td style="padding: 12px; border-top: 2px solid #d4a574; text-align: right; font-weight: 700; font-size: 18px; color: #d4a574;">
                                        ${formatCurrency(payload.total)} VND
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Shipping Info -->
                            <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 4px;">
                                <h3 style="margin: 0 0 10px 0; color: #0a0a0a; font-size: 16px; font-weight: 600;">
                                    ${t.orderConfirmation.shippingAddress}
                                </h3>
                                <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                                    ${payload.shippingAddress}
                                </p>
                            </div>
                            
                            <!-- Payment Instructions -->
                            <div style="margin: 30px 0; padding: 20px; background-color: #fff8f0; border-left: 4px solid #d4a574; border-radius: 4px;">
                                <h3 style="margin: 0 0 15px 0; color: #0a0a0a; font-size: 16px; font-weight: 600;">
                                    ${payload.paymentMethod === 'cod' ? t.orderConfirmation.paymentCod.title : t.orderConfirmation.paymentBank.title}
                                </h3>
                                ${payload.paymentMethod === 'cod' ? `
                                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px; line-height: 1.6;">
                                    ${t.orderConfirmation.paymentCod.message}
                                </p>
                                ` : `
                                <p style="margin: 0 0 15px 0; color: #666; font-size: 14px; line-height: 1.6;">
                                    ${t.orderConfirmation.paymentBank.message}
                                </p>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>${t.orderConfirmation.paymentBank.bank}:</strong></td>
                                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${process.env.BANK_NAME || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>${t.orderConfirmation.paymentBank.accountNumber}:</strong></td>
                                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${process.env.BANK_ACCOUNT_NUMBER || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>${t.orderConfirmation.paymentBank.accountName}:</strong></td>
                                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${process.env.BANK_ACCOUNT_NAME || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>${t.orderConfirmation.paymentBank.amount}:</strong></td>
                                        <td style="padding: 8px 0; color: #d4a574; font-size: 16px; font-weight: 600;">${formatCurrency(payload.total)} VND</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>${t.orderConfirmation.paymentBank.content}:</strong></td>
                                        <td style="padding: 8px 0; color: #333; font-size: 14px;">${payload.orderCode}</td>
                                    </tr>
                                </table>
                                `}
                            </div>
                            
                            ${payload.trackingUrl ? `
                            <!-- Tracking Link -->
                            <div style="margin: 30px 0; padding: 20px; background-color: #f0f0f0; border-radius: 4px; text-align: center;">
                                <p style="margin: 0 0 15px 0; color: #333; font-size: 14px; font-weight: 600;">
                                    ${t.orderConfirmation.trackOrder || 'Track Your Order'}
                                </p>
                                <a href="${payload.trackingUrl}" style="display: inline-block; padding: 12px 24px; background-color: #d4a574; color: #0a0a0a; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px;">
                                    ${t.orderConfirmation.trackButton || 'Track Order'}
                                </a>
                                <p style="margin: 15px 0 0 0; color: #666; font-size: 12px;">
                                    ${t.orderConfirmation.trackNote || 'Use this link to track your order status anytime.'}
                                </p>
                            </div>
                            ` : ''}
                            
                            <!-- Sign In CTA -->
                            <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 8px; text-align: center;">
                                <p style="margin: 0 0 15px 0; color: #333; font-size: 14px; line-height: 1.6;">
                                    ${t.orderConfirmation.signInPrompt || 'Sign in to view all your orders and track them easily.'}
                                </p>
                                <a href="${baseUrl}/auth/sign-in" style="display: inline-block; padding: 12px 24px; background-color: #d4a574; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
                                    ${t.orderConfirmation.signInButton || 'Sign In'}
                                </a>
                            </div>
                            
                            <!-- Support -->
                            <p style="margin: 30px 0 0 0; color: #666; font-size: 14px; line-height: 1.6;">
                                ${t.orderConfirmation.support}
                            </p>
                            
                            ${t.orderConfirmation.footer ? `
                            <p style="margin: 20px 0 0 0; color: #999; font-size: 12px; line-height: 1.6;">
                                ${t.orderConfirmation.footer}
                            </p>
                            ` : ''}
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #0a0a0a; padding: 20px; text-align: center;">
                            <p style="margin: 0; color: #d4a574; font-size: 14px;">
                                ${t.orderConfirmation.footerBrand || 'Vintage Audio Accessories'}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();

    // Plain text version
    const text = `
${subject}

${t.orderConfirmation.greeting.replace('{customerName}', payload.customerName)}

${t.orderConfirmation.message.replace('{orderCode}', payload.orderCode)}

${t.orderConfirmation.orderDetails}:
${payload.items.map((item) => `- ${item.productName} × ${item.quantity}: ${formatCurrency(item.subtotal)} VND`).join('\n')}

${t.orderConfirmation.subtotal}: ${formatCurrency(payload.subtotal)} VND
${t.orderConfirmation.total}: ${formatCurrency(payload.total)} VND

${t.orderConfirmation.shippingAddress}:
${payload.shippingAddress}

${payload.paymentMethod === 'cod' ? t.orderConfirmation.paymentCod.message : t.orderConfirmation.paymentBank.message}

${payload.trackingUrl ? `
${t.orderConfirmation.trackOrder || 'Track Your Order'}:
${payload.trackingUrl}
` : ''}

${t.orderConfirmation.support}
    `.trim();

    return { subject, html, text };
}

/**
 * Generate HTML email template for status update
 */
async function generateStatusUpdateEmail(
    locale: Locale,
    payload: StatusUpdatePayload
): Promise<{ subject: string; html: string; text: string }> {
    const t = getEmailTranslations(locale);

    const statusLabel = t.statusUpdate.statusLabels[payload.newStatus as keyof typeof t.statusUpdate.statusLabels] || payload.newStatus;
    const subject = t.statusUpdate.subject
        .replace('{orderCode}', payload.orderCode)
        .replace('{status}', statusLabel);

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #0a0a0a; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #d4a574; font-family: 'Cormorant Garamond', serif; font-size: 28px;">
                                ${t.statusUpdate.header}
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px;">
                            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                                ${t.statusUpdate.greeting.replace('{customerName}', payload.customerName)}
                            </p>
                            
                            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                                ${t.statusUpdate.message
                                    .replace('{orderCode}', payload.orderCode)
                                    .replace('{status}', statusLabel)}
                            </p>
                            
                            ${t.statusUpdate.statusDescriptions[payload.newStatus as keyof typeof t.statusUpdate.statusDescriptions] ? `
                            <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 4px;">
                                <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                                    ${t.statusUpdate.statusDescriptions[payload.newStatus as keyof typeof t.statusUpdate.statusDescriptions]}
                                </p>
                            </div>
                            ` : ''}
                            
                            ${payload.note ? `
                            <div style="margin: 20px 0; padding: 15px; background-color: #fff8f0; border-left: 4px solid #d4a574; border-radius: 4px;">
                                <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">
                                    <strong>${t.statusUpdate.note}:</strong> ${payload.note}
                                </p>
                            </div>
                            ` : ''}
                            
                            ${payload.trackingUrl ? `
                            <!-- Tracking Link -->
                            <div style="margin: 30px 0; padding: 20px; background-color: #f0f0f0; border-radius: 4px; text-align: center;">
                                <p style="margin: 0 0 15px 0; color: #333; font-size: 14px; font-weight: 600;">
                                    ${t.statusUpdate.trackOrder || 'Track Your Order'}
                                </p>
                                <a href="${payload.trackingUrl}" style="display: inline-block; padding: 12px 24px; background-color: #d4a574; color: #0a0a0a; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px;">
                                    ${t.statusUpdate.trackButton || 'Track Order'}
                                </a>
                                <p style="margin: 15px 0 0 0; color: #666; font-size: 12px;">
                                    ${t.statusUpdate.trackNote || 'Use this link to track your order status anytime.'}
                                </p>
                            </div>
                            ` : ''}
                            
                            <p style="margin: 30px 0 0 0; color: #666; font-size: 14px; line-height: 1.6;">
                                ${t.statusUpdate.support}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #0a0a0a; padding: 20px; text-align: center;">
                            <p style="margin: 0; color: #d4a574; font-size: 14px;">
                                ${t.statusUpdate.footerBrand || 'Vintage Audio Accessories'}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();

    const text = `
${subject}

${t.statusUpdate.greeting.replace('{customerName}', payload.customerName)}

${t.statusUpdate.message.replace('{orderCode}', payload.orderCode).replace('{status}', statusLabel)}

${payload.note ? `${t.statusUpdate.note}: ${payload.note}` : ''}

${payload.trackingUrl ? `
${t.statusUpdate.trackOrder || 'Track Your Order'}:
${payload.trackingUrl}
` : ''}

${t.statusUpdate.support}
    `.trim();

    return { subject, html, text };
}

/**
 * Log email attempt to database
 * Returns empty string on any error to prevent breaking order creation
 */
async function logEmail(
    orderId: string,
    type: EmailType,
    toEmail: string,
    locale: Locale,
    status: EmailStatus,
    providerMessageId?: string,
    errorMessage?: string,
    metadataStatus?: string
): Promise<string> {
    try {
        const supabase = createServiceClient();

        const { data, error } = await supabase
            .from('order_emails')
            .insert({
                order_id: orderId,
                type,
                to_email: toEmail,
                locale,
                status,
                provider_message_id: providerMessageId || null,
                error_message: errorMessage || null,
                metadata_status: metadataStatus || null,
            })
            .select('id')
            .single();

        if (error) {
            console.error('Error logging email:', error);
            // Don't throw - email logging failure shouldn't break order creation
            return '';
        }

        return data?.id || '';
    } catch (error) {
        // Catch any unexpected errors (e.g., table doesn't exist)
        console.error('Unexpected error logging email:', error);
        return '';
    }
}

/**
 * Update email log status
 * Silently fails if table doesn't exist or update fails
 */
async function updateEmailLog(
    emailLogId: string,
    status: EmailStatus,
    providerMessageId?: string,
    errorMessage?: string
): Promise<void> {
    try {
        if (!emailLogId) {
            return; // No log ID to update
        }

        const supabase = createServiceClient();

        await supabase
            .from('order_emails')
            .update({
                status,
                provider_message_id: providerMessageId || null,
                error_message: errorMessage || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', emailLogId);
    } catch (error) {
        // Silently fail - email logging shouldn't break anything
        console.error('Error updating email log:', error);
    }
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail(
    orderId: string,
    payload: OrderConfirmationPayload
): Promise<void> {
    // Generate tracking token and URL if not provided
    let trackingToken = payload.trackingToken;
    let trackingUrl = payload.trackingUrl;
    
    if (!trackingToken) {
        // Create or get tracking token from database
        trackingToken = await getOrCreateTrackingToken(orderId, 'checkout');
    }
    
    if (!trackingUrl) {
        // Build tracking URL (no locale prefix - using cookie-based locale)
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';
        trackingUrl = `${baseUrl}/order/track/${payload.orderCode}?t=${trackingToken}`;
    }
    
    // Add tracking info to payload
    const payloadWithTracking = {
        ...payload,
        trackingToken,
        trackingUrl,
    };
    // Skip if no email provided
    if (!payload.customerEmail || payload.customerEmail.trim() === '') {
        await logEmail(
            orderId,
            'order_confirmation',
            '',
            payload.locale,
            'skipped_no_email'
        );
        return;
    }

    // Check if already sent (idempotency)
    // Wrap in try-catch in case order_emails table doesn't exist yet
    try {
        const supabase = createServiceClient();
        const { data: existing } = await supabase
            .from('order_emails')
            .select('id, status')
            .eq('order_id', orderId)
            .eq('type', 'order_confirmation')
            .maybeSingle();

        if (existing && existing.status === 'sent') {
            console.log(`Order confirmation email already sent for order ${orderId}`);
            return;
        }
    } catch (error) {
        // Table might not exist - continue anyway
        console.warn('Could not check email idempotency (table may not exist):', error);
    }

    // Log as queued
    const emailLogId = await logEmail(
        orderId,
        'order_confirmation',
        payload.customerEmail,
        payload.locale,
        'queued'
    );

    try {
        // Generate email content
        const { subject, html, text } = await generateOrderConfirmationEmail(
            payloadWithTracking.locale,
            payloadWithTracking
        );

        // Send via Resend (only if client is available)
        if (!resend) {
            throw new Error('Resend API key not configured. Set RESEND_API_KEY environment variable.');
        }

        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
            to: payload.customerEmail,
            subject,
            html,
            text,
        });

        if (error) {
            throw new Error(error.message || 'Failed to send email');
        }

        // Update log as sent
        if (emailLogId) {
            await updateEmailLog(emailLogId, 'sent', data?.id);
        }

        console.log(`Order confirmation email sent for order ${orderId}`);
    } catch (error) {
        console.error(`Error sending order confirmation email for order ${orderId}:`, error);
        
        // Update log as failed
        if (emailLogId) {
            await updateEmailLog(
                emailLogId,
                'failed',
                undefined,
                error instanceof Error ? error.message : 'Unknown error'
            );
        }

        // Don't throw - email failure shouldn't break order creation
    }
}

/**
 * Send status update email
 */
export async function sendStatusUpdateEmail(
    orderId: string,
    payload: StatusUpdatePayload
): Promise<void> {
    // Skip if status is not in notify list
    if (!NOTIFY_STATUSES.includes(payload.newStatus)) {
        return;
    }

    // Skip if no email provided
    if (!payload.customerEmail || payload.customerEmail.trim() === '') {
        return;
    }

    // Generate tracking token and URL if not provided
    let trackingToken = payload.trackingToken;
    let trackingUrl = payload.trackingUrl;
    
    if (!trackingToken) {
        // Create or get tracking token from database
        trackingToken = await getOrCreateTrackingToken(orderId, 'status_email');
    }
    
    if (!trackingUrl) {
        // Build tracking URL (no locale prefix - using cookie-based locale)
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';
        trackingUrl = `${baseUrl}/order/track/${payload.orderCode}?t=${trackingToken}`;
    }
    
    // Add tracking info to payload
    const payloadWithTracking = {
        ...payload,
        trackingToken,
        trackingUrl,
    };

    // Check if already sent (idempotency)
    // Wrap in try-catch in case order_emails table doesn't exist yet
    try {
        const supabase = createServiceClient();
        const { data: existing } = await supabase
            .from('order_emails')
            .select('id, status')
            .eq('order_id', orderId)
            .eq('type', 'status_update')
            .eq('metadata_status', payload.newStatus)
            .maybeSingle();

        if (existing && existing.status === 'sent') {
            console.log(`Status update email already sent for order ${orderId}, status ${payload.newStatus}`);
            return;
        }
    } catch (error) {
        // Table might not exist - continue anyway
        console.warn('Could not check email idempotency (table may not exist):', error);
    }

    // Log as queued
    const emailLogId = await logEmail(
        orderId,
        'status_update',
        payload.customerEmail,
        payload.locale,
        'queued',
        undefined,
        undefined,
        payload.newStatus
    );

    try {
        // Generate email content
        const { subject, html, text } = await generateStatusUpdateEmail(
            payloadWithTracking.locale,
            payloadWithTracking
        );

        // Send via Resend (only if client is available)
        if (!resend) {
            throw new Error('Resend API key not configured. Set RESEND_API_KEY environment variable.');
        }

        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
            to: payload.customerEmail,
            subject,
            html,
            text,
        });

        if (error) {
            throw new Error(error.message || 'Failed to send email');
        }

        // Update log as sent
        if (emailLogId) {
            await updateEmailLog(emailLogId, 'sent', data?.id);
        }

        console.log(`Status update email sent for order ${orderId}, status ${payload.newStatus}`);
    } catch (error) {
        console.error(`Error sending status update email for order ${orderId}:`, error);
        
        // Update log as failed
        if (emailLogId) {
            await updateEmailLog(
                emailLogId,
                'failed',
                undefined,
                error instanceof Error ? error.message : 'Unknown error'
            );
        }

        // Don't throw - email failure shouldn't break status update
    }
}

/**
 * Generate HTML email template for refund notification
 */
async function generateRefundEmail(
    locale: Locale,
    payload: RefundPayload
): Promise<{ subject: string; html: string; text: string }> {
    const t = getEmailTranslations(locale);
    const formatCurrency = (amount: number, currency: string) => {
        // For VND, no decimals; for others, use standard formatting
        if (currency.toLowerCase() === 'vnd') {
            return new Intl.NumberFormat('vi-VN').format(amount);
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(amount / 100); // Stripe amounts are in minor units
    };

    const refundType = payload.isPartial ? 'partial' : 'full';
    const subjectKey = `refund.${refundType}Refund.subject` as keyof typeof t;
    const subject = t.refund?.[refundType as 'partial' | 'full']?.subject?.replace('{orderCode}', payload.orderCode) 
        || `Refund Processed - Order ${payload.orderCode}`;

    const refundLabel = payload.isPartial 
        ? (t.refund?.partialRefund?.title || 'Partial Refund Processed')
        : (t.refund?.fullRefund?.title || 'Full Refund Processed');

    const refundMessage = payload.isPartial
        ? (t.refund?.partialRefund?.message?.replace('{orderCode}', payload.orderCode) || `A partial refund has been processed for your order ${payload.orderCode}.`)
        : (t.refund?.fullRefund?.message?.replace('{orderCode}', payload.orderCode) || `A full refund has been processed for your order ${payload.orderCode}.`);

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #0a0a0a; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #d4a574; font-family: 'Cormorant Garamond', serif; font-size: 28px;">
                                ${t.refund?.header || 'Refund Processed'}
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px;">
                            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                                ${t.refund?.greeting?.replace('{customerName}', payload.customerName) || `Hello ${payload.customerName},`}
                            </p>
                            
                            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                                ${refundMessage}
                            </p>
                            
                            <!-- Refund Details -->
                            <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 4px;">
                                <h3 style="margin: 0 0 15px 0; color: #0a0a0a; font-size: 18px; font-weight: 600;">
                                    ${refundLabel}
                                </h3>
                                <div style="margin: 10px 0;">
                                    <span style="color: #666; font-size: 14px;">${t.refund?.orderCode || 'Order Code'}:</span>
                                    <strong style="color: #333; font-size: 14px; margin-left: 8px;">${payload.orderCode}</strong>
                                </div>
                                <div style="margin: 10px 0;">
                                    <span style="color: #666; font-size: 14px;">${t.refund?.refundAmount || 'Refund Amount'}:</span>
                                    <strong style="color: #d4a574; font-size: 18px; margin-left: 8px;">${formatCurrency(payload.refundAmount, payload.currency)} ${payload.currency.toUpperCase()}</strong>
                                </div>
                            </div>
                            
                            ${payload.trackingUrl ? `
                            <!-- Tracking Link -->
                            <div style="margin: 30px 0; padding: 20px; background-color: #f0f0f0; border-radius: 4px; text-align: center;">
                                <p style="margin: 0 0 15px 0; color: #333; font-size: 14px; font-weight: 600;">
                                    ${t.refund?.trackOrder || 'Track Your Order'}
                                </p>
                                <a href="${payload.trackingUrl}" style="display: inline-block; padding: 12px 24px; background-color: #d4a574; color: #0a0a0a; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px;">
                                    ${t.refund?.trackButton || 'Track Order'}
                                </a>
                            </div>
                            ` : ''}
                            
                            <p style="margin: 30px 0 0 0; color: #666; font-size: 14px; line-height: 1.6;">
                                ${t.refund?.support || 'If you have any questions, please contact us at support@restorethebasic.com'}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #0a0a0a; padding: 20px; text-align: center;">
                            <p style="margin: 0; color: #d4a574; font-size: 14px;">
                                ${t.refund?.footerBrand || 'Vintage Audio Accessories'}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();

    const text = `
${subject}

${t.refund?.greeting?.replace('{customerName}', payload.customerName) || `Hello ${payload.customerName},`}

${refundMessage}

${refundLabel}
${t.refund?.orderCode || 'Order Code'}: ${payload.orderCode}
${t.refund?.refundAmount || 'Refund Amount'}: ${formatCurrency(payload.refundAmount, payload.currency)} ${payload.currency.toUpperCase()}

${payload.trackingUrl ? `${t.refund?.trackOrder || 'Track Your Order'}: ${payload.trackingUrl}` : ''}

${t.refund?.support || 'If you have any questions, please contact us at support@restorethebasic.com'}
    `.trim();

    return { subject, html, text };
}

/**
 * Send refund email notification
 */
export async function sendRefundEmail(
    orderId: string,
    payload: RefundPayload
): Promise<void> {
    // Skip if no email provided
    if (!payload.customerEmail || payload.customerEmail.trim() === '') {
        return;
    }

    // Generate tracking token and URL if not provided
    let trackingToken = payload.trackingToken;
    let trackingUrl = payload.trackingUrl;
    
    if (!trackingToken) {
        // Create or get tracking token from database
        trackingToken = await getOrCreateTrackingToken(orderId, 'refund_email');
    }
    
    if (!trackingUrl) {
        // Build tracking URL (no locale prefix - using cookie-based locale)
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';
        trackingUrl = `${baseUrl}/order/track/${payload.orderCode}?t=${trackingToken}`;
    }
    
    // Add tracking info to payload
    const payloadWithTracking = {
        ...payload,
        trackingToken,
        trackingUrl,
    };

    // Check if already sent (idempotency)
    try {
        const supabase = createServiceClient();
        const { data: existing } = await supabase
            .from('order_emails')
            .select('id, status')
            .eq('order_id', orderId)
            .eq('type', 'refund')
            .maybeSingle();

        if (existing && existing.status === 'sent') {
            console.log(`Refund email already sent for order ${orderId}`);
            return;
        }
    } catch (error) {
        // Table might not exist - continue anyway
        console.warn('Could not check email idempotency (table may not exist):', error);
    }

    // Log as queued
    const emailLogId = await logEmail(
        orderId,
        'refund',
        payload.customerEmail,
        payload.locale,
        'queued'
    );

    try {
        // Generate email content
        const { subject, html, text } = await generateRefundEmail(
            payloadWithTracking.locale,
            payloadWithTracking
        );

        // Send via Resend (only if client is available)
        if (!resend) {
            throw new Error('Resend API key not configured. Set RESEND_API_KEY environment variable.');
        }

        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
            to: payload.customerEmail,
            subject,
            html,
            text,
        });

        if (error) {
            throw new Error(error.message || 'Failed to send email');
        }

        // Update log as sent
        if (emailLogId) {
            await updateEmailLog(emailLogId, 'sent', data?.id);
        }

        console.log(`Refund email sent for order ${orderId}`);
    } catch (error) {
        console.error(`Error sending refund email for order ${orderId}:`, error);
        
        // Update log as failed
        if (emailLogId) {
            await updateEmailLog(
                emailLogId,
                'failed',
                undefined,
                error instanceof Error ? error.message : 'Unknown error'
            );
        }

        // Don't throw - email failure shouldn't break refund processing
    }
}

/**
 * Generate HTML email template for order cancellation
 */
async function generateOrderCancellationEmail(
    locale: Locale,
    payload: OrderCancellationPayload
): Promise<{ subject: string; html: string; text: string }> {
    const t = getEmailTranslations(locale);
    const subject = t.orderCancellation?.subject?.replace('{orderCode}', payload.orderCode) 
        || `Order Cancelled - ${payload.orderCode}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #0a0a0a; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #d4a574; font-family: 'Cormorant Garamond', serif; font-size: 28px;">
                                ${t.orderCancellation?.header || 'Order Cancelled'}
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px;">
                            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                                ${t.orderCancellation?.greeting?.replace('{customerName}', payload.customerName) || `Hello ${payload.customerName},`}
                            </p>
                            
                            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                                ${t.orderCancellation?.message?.replace('{orderCode}', payload.orderCode) || `Your order ${payload.orderCode} has been cancelled.`}
                            </p>
                            
                            <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 4px;">
                                <div style="margin: 10px 0;">
                                    <span style="color: #666; font-size: 14px;">${t.orderCancellation?.orderCode || 'Order Code'}:</span>
                                    <strong style="color: #333; font-size: 14px; margin-left: 8px;">${payload.orderCode}</strong>
                                </div>
                                <div style="margin: 10px 0;">
                                    <span style="color: #666; font-size: 14px;">${t.orderCancellation?.reason || 'Cancellation Reason'}:</span>
                                    <span style="color: #333; font-size: 14px; margin-left: 8px;">${payload.reason}</span>
                                </div>
                            </div>
                            
                            ${payload.trackingUrl ? `
                            <!-- Tracking Link -->
                            <div style="margin: 30px 0; padding: 20px; background-color: #f0f0f0; border-radius: 4px; text-align: center;">
                                <p style="margin: 0 0 15px 0; color: #333; font-size: 14px; font-weight: 600;">
                                    ${t.orderCancellation?.trackOrder || 'View Order Details'}
                                </p>
                                <a href="${payload.trackingUrl}" style="display: inline-block; padding: 12px 24px; background-color: #d4a574; color: #0a0a0a; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px;">
                                    ${t.orderCancellation?.trackButton || 'View Order'}
                                </a>
                            </div>
                            ` : ''}
                            
                            <p style="margin: 30px 0 0 0; color: #666; font-size: 14px; line-height: 1.6;">
                                ${t.orderCancellation?.support || 'If you have any questions, please contact us at support@restorethebasic.com'}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #0a0a0a; padding: 20px; text-align: center;">
                            <p style="margin: 0; color: #d4a574; font-size: 14px;">
                                ${t.orderCancellation?.footerBrand || 'Vintage Audio Accessories'}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();

    const text = `
${subject}

${t.orderCancellation?.greeting?.replace('{customerName}', payload.customerName) || `Hello ${payload.customerName},`}

${t.orderCancellation?.message?.replace('{orderCode}', payload.orderCode) || `Your order ${payload.orderCode} has been cancelled.`}

${t.orderCancellation?.orderCode || 'Order Code'}: ${payload.orderCode}
${t.orderCancellation?.reason || 'Cancellation Reason'}: ${payload.reason}

${payload.trackingUrl ? `${t.orderCancellation?.trackOrder || 'View Order Details'}: ${payload.trackingUrl}` : ''}

${t.orderCancellation?.support || 'If you have any questions, please contact us at support@restorethebasic.com'}
    `.trim();

    return { subject, html, text };
}

/**
 * Send order cancellation email
 */
export async function sendOrderCancellationEmail(
    orderId: string,
    payload: OrderCancellationPayload
): Promise<void> {
    // Skip if no email provided
    if (!payload.customerEmail || payload.customerEmail.trim() === '') {
        return;
    }

    // Generate tracking token and URL if not provided
    let trackingToken = payload.trackingToken;
    let trackingUrl = payload.trackingUrl;
    
    if (!trackingToken) {
        trackingToken = await getOrCreateTrackingToken(orderId, 'cancellation_email');
    }
    
    if (!trackingUrl) {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';
        trackingUrl = `${baseUrl}/order/track/${payload.orderCode}?t=${trackingToken}`;
    }
    
    const payloadWithTracking = {
        ...payload,
        trackingToken,
        trackingUrl,
    };

    // Check if already sent (idempotency)
    try {
        const supabase = createServiceClient();
        const { data: existing } = await supabase
            .from('order_emails')
            .select('id, status')
            .eq('order_id', orderId)
            .eq('type', 'order_cancellation')
            .maybeSingle();

        if (existing && existing.status === 'sent') {
            console.log(`Cancellation email already sent for order ${orderId}`);
            return;
        }
    } catch (error) {
        console.warn('Could not check email idempotency:', error);
    }

    // Log as queued
    const emailLogId = await logEmail(
        orderId,
        'order_cancellation',
        payload.customerEmail,
        payload.locale,
        'queued'
    );

    try {
        const { subject, html, text } = await generateOrderCancellationEmail(
            payloadWithTracking.locale,
            payloadWithTracking
        );

        if (!resend) {
            throw new Error('Resend API key not configured');
        }

        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
            to: payload.customerEmail,
            subject,
            html,
            text,
        });

        if (error) {
            throw new Error(error.message || 'Failed to send email');
        }

        if (emailLogId) {
            await updateEmailLog(emailLogId, 'sent', data?.id);
        }

        console.log(`Cancellation email sent for order ${orderId}`);
    } catch (error) {
        console.error(`Error sending cancellation email for order ${orderId}:`, error);
        
        if (emailLogId) {
            await updateEmailLog(
                emailLogId,
                'failed',
                undefined,
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }
}

/**
 * Send change request email to admin
 */
export async function sendChangeRequestEmail(
    orderId: string,
    payload: ChangeRequestPayload
): Promise<void> {
    // Get admin email from environment
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.RESEND_FROM_EMAIL;
    if (!adminEmail) {
        console.warn('No admin email configured for change request notifications');
        return;
    }

    const t = getEmailTranslations(payload.locale);
    const subject = `Change Request - Order ${payload.orderCode}`;

    const categoryLabels: Record<string, string> = {
        change_items: t.changeRequest?.categoryChangeItems || 'Change Items',
        change_address: t.changeRequest?.categoryChangeAddress || 'Change Address',
        cancel_refund: t.changeRequest?.categoryCancelRefund || 'Cancel & Refund',
        other: t.changeRequest?.categoryOther || 'Other',
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #0a0a0a; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #d4a574; font-family: 'Cormorant Garamond', serif; font-size: 28px;">
                                ${t.changeRequest?.header || 'Change Request'}
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px;">
                            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                                A customer has submitted a change request for an order.
                            </p>
                            
                            <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 4px;">
                                <div style="margin: 10px 0;">
                                    <span style="color: #666; font-size: 14px;"><strong>Order Code:</strong></span>
                                    <span style="color: #333; font-size: 14px; margin-left: 8px;">${payload.orderCode}</span>
                                </div>
                                <div style="margin: 10px 0;">
                                    <span style="color: #666; font-size: 14px;"><strong>Customer:</strong></span>
                                    <span style="color: #333; font-size: 14px; margin-left: 8px;">${payload.customerName}</span>
                                </div>
                                <div style="margin: 10px 0;">
                                    <span style="color: #666; font-size: 14px;"><strong>Email:</strong></span>
                                    <span style="color: #333; font-size: 14px; margin-left: 8px;">${payload.customerEmail}</span>
                                </div>
                                <div style="margin: 10px 0;">
                                    <span style="color: #666; font-size: 14px;"><strong>Category:</strong></span>
                                    <span style="color: #333; font-size: 14px; margin-left: 8px;">${categoryLabels[payload.category] || payload.category}</span>
                                </div>
                            </div>
                            
                            <div style="margin: 30px 0; padding: 20px; background-color: #fff8f0; border-left: 4px solid #d4a574; border-radius: 4px;">
                                <h3 style="margin: 0 0 15px 0; color: #0a0a0a; font-size: 16px; font-weight: 600;">
                                    ${t.changeRequest?.messageLabel || 'Customer Message'}
                                </h3>
                                <p style="margin: 0; color: #333; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
                                    ${payload.message}
                                </p>
                            </div>
                            
                            <p style="margin: 30px 0 0 0; color: #666; font-size: 14px; line-height: 1.6;">
                                Please review this request in the admin panel and contact the customer if needed.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #0a0a0a; padding: 20px; text-align: center;">
                            <p style="margin: 0; color: #d4a574; font-size: 14px;">
                                Vintage Audio Accessories - Admin Notification
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();

    const text = `
${subject}

A customer has submitted a change request for an order.

Order Code: ${payload.orderCode}
Customer: ${payload.customerName}
Email: ${payload.customerEmail}
Category: ${categoryLabels[payload.category] || payload.category}

Customer Message:
${payload.message}

Please review this request in the admin panel and contact the customer if needed.
    `.trim();

    try {
        if (!resend) {
            throw new Error('Resend API key not configured');
        }

        await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
            to: adminEmail,
            subject,
            html,
            text,
        });

        console.log(`Change request email sent to admin for order ${orderId}`);
    } catch (error) {
        console.error(`Error sending change request email for order ${orderId}:`, error);
        // Don't throw - email failure shouldn't break the request
    }
}

interface DepositApprovedPayload {
    orderCode: string;
    customerName: string;
    customerEmail: string;
    depositAmount: number;
    locale: Locale;
}

/**
 * Send deposit approved email
 */
export async function sendDepositApprovedEmail(
    orderId: string,
    payload: DepositApprovedPayload
): Promise<void> {
    if (!payload.customerEmail || payload.customerEmail.trim() === '') {
        return;
    }

    const t = getEmailTranslations(payload.locale);
    const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount);
    
    const subject = t.depositApproved?.subject?.replace('{orderCode}', payload.orderCode) 
        || `Deposit Confirmed - Order ${payload.orderCode}`;

    const trackingToken = await getOrCreateTrackingToken(orderId, 'deposit_approved_email');
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';
    const trackingUrl = `${baseUrl}/order/track/${payload.orderCode}?t=${trackingToken}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background-color: #0a0a0a; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #6b9b6e; font-family: 'Cormorant Garamond', serif; font-size: 28px;">
                                ${t.depositApproved?.header || 'Deposit Confirmed!'}
                            </h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px;">
                            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                                ${t.depositApproved?.greeting?.replace('{customerName}', payload.customerName) || `Hello ${payload.customerName},`}
                            </p>
                            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                                ${t.depositApproved?.message?.replace('{orderCode}', payload.orderCode) || `Great news! Your deposit for order ${payload.orderCode} has been verified and confirmed.`}
                            </p>
                            <div style="margin: 30px 0; padding: 20px; background-color: #f0fff0; border-radius: 4px; border: 1px solid #6b9b6e;">
                                <p style="margin: 0; font-size: 16px;">
                                    <strong>${t.depositApproved?.amountLabel || 'Deposit Amount'}:</strong>
                                    <span style="color: #6b9b6e; font-size: 18px; font-weight: 600; margin-left: 8px;">
                                        ${formatCurrency(payload.depositAmount)} VND
                                    </span>
                                </p>
                            </div>
                            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                                ${t.depositApproved?.nextSteps || 'We will now process your order. You can track the status using the link below.'}
                            </p>
                            <div style="margin: 30px 0; text-align: center;">
                                <a href="${trackingUrl}" style="display: inline-block; padding: 12px 24px; background-color: #d4a574; color: #0a0a0a; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px;">
                                    ${t.depositApproved?.trackButton || 'Track Your Order'}
                                </a>
                            </div>
                            <p style="margin: 30px 0 0 0; color: #666; font-size: 14px; line-height: 1.6;">
                                ${t.depositApproved?.support || 'If you have any questions, please contact us.'}
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #0a0a0a; padding: 20px; text-align: center;">
                            <p style="margin: 0; color: #d4a574; font-size: 14px;">
                                ${t.depositApproved?.footerBrand || 'Vintage Audio Accessories'}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();

    const text = `
${subject}

${t.depositApproved?.greeting?.replace('{customerName}', payload.customerName) || `Hello ${payload.customerName},`}

${t.depositApproved?.message?.replace('{orderCode}', payload.orderCode) || `Great news! Your deposit for order ${payload.orderCode} has been verified and confirmed.`}

${t.depositApproved?.amountLabel || 'Deposit Amount'}: ${formatCurrency(payload.depositAmount)} VND

${t.depositApproved?.nextSteps || 'We will now process your order.'}

Track your order: ${trackingUrl}

${t.depositApproved?.support || 'If you have any questions, please contact us.'}
    `.trim();

    const emailLogId = await logEmail(
        orderId,
        'deposit_approved',
        payload.customerEmail,
        payload.locale,
        'queued'
    );

    try {
        if (!resend) {
            throw new Error('Resend API key not configured');
        }

        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
            to: payload.customerEmail,
            subject,
            html,
            text,
        });

        if (error) {
            throw new Error(error.message || 'Failed to send email');
        }

        if (emailLogId) {
            await updateEmailLog(emailLogId, 'sent', data?.id);
        }

        console.log(`Deposit approved email sent for order ${orderId}`);
    } catch (error) {
        console.error(`Error sending deposit approved email for order ${orderId}:`, error);
        if (emailLogId) {
            await updateEmailLog(
                emailLogId,
                'failed',
                undefined,
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }
}

interface DepositRejectedPayload {
    orderCode: string;
    customerName: string;
    customerEmail: string;
    rejectionNote?: string;
    locale: Locale;
}

/**
 * Send deposit rejected email
 */
export async function sendDepositRejectedEmail(
    orderId: string,
    payload: DepositRejectedPayload
): Promise<void> {
    if (!payload.customerEmail || payload.customerEmail.trim() === '') {
        return;
    }

    const t = getEmailTranslations(payload.locale);
    
    const subject = t.depositRejected?.subject?.replace('{orderCode}', payload.orderCode) 
        || `Deposit Proof Needs Attention - Order ${payload.orderCode}`;

    const trackingToken = await getOrCreateTrackingToken(orderId, 'deposit_rejected_email');
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';
    const trackingUrl = `${baseUrl}/order/track/${payload.orderCode}?t=${trackingToken}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background-color: #0a0a0a; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #c9a05f; font-family: 'Cormorant Garamond', serif; font-size: 28px;">
                                ${t.depositRejected?.header || 'Proof Needs Attention'}
                            </h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px;">
                            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                                ${t.depositRejected?.greeting?.replace('{customerName}', payload.customerName) || `Hello ${payload.customerName},`}
                            </p>
                            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                                ${t.depositRejected?.message?.replace('{orderCode}', payload.orderCode) || `We reviewed the proof you uploaded for order ${payload.orderCode}, but we were unable to verify it.`}
                            </p>
                            ${payload.rejectionNote ? `
                            <div style="margin: 30px 0; padding: 20px; background-color: #fff8f0; border-radius: 4px; border-left: 4px solid #c9a05f;">
                                <p style="margin: 0; font-size: 14px; color: #666;">
                                    <strong>${t.depositRejected?.noteLabel || 'Note'}:</strong>
                                </p>
                                <p style="margin: 8px 0 0 0; color: #333; font-size: 16px;">
                                    ${payload.rejectionNote}
                                </p>
                            </div>
                            ` : ''}
                            <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                                ${t.depositRejected?.action || 'Please upload a clearer image of your bank transfer proof using the link below.'}
                            </p>
                            <div style="margin: 30px 0; text-align: center;">
                                <a href="${trackingUrl}" style="display: inline-block; padding: 12px 24px; background-color: #d4a574; color: #0a0a0a; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px;">
                                    ${t.depositRejected?.uploadButton || 'Upload New Proof'}
                                </a>
                            </div>
                            <p style="margin: 30px 0 0 0; color: #666; font-size: 14px; line-height: 1.6;">
                                ${t.depositRejected?.support || 'If you have any questions, please contact us.'}
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #0a0a0a; padding: 20px; text-align: center;">
                            <p style="margin: 0; color: #d4a574; font-size: 14px;">
                                ${t.depositRejected?.footerBrand || 'Vintage Audio Accessories'}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();

    const text = `
${subject}

${t.depositRejected?.greeting?.replace('{customerName}', payload.customerName) || `Hello ${payload.customerName},`}

${t.depositRejected?.message?.replace('{orderCode}', payload.orderCode) || `We reviewed the proof you uploaded for order ${payload.orderCode}, but we were unable to verify it.`}

${payload.rejectionNote ? `${t.depositRejected?.noteLabel || 'Note'}: ${payload.rejectionNote}` : ''}

${t.depositRejected?.action || 'Please upload a clearer image of your bank transfer proof.'}

Upload new proof: ${trackingUrl}

${t.depositRejected?.support || 'If you have any questions, please contact us.'}
    `.trim();

    const emailLogId = await logEmail(
        orderId,
        'deposit_rejected',
        payload.customerEmail,
        payload.locale,
        'queued'
    );

    try {
        if (!resend) {
            throw new Error('Resend API key not configured');
        }

        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
            to: payload.customerEmail,
            subject,
            html,
            text,
        });

        if (error) {
            throw new Error(error.message || 'Failed to send email');
        }

        if (emailLogId) {
            await updateEmailLog(emailLogId, 'sent', data?.id);
        }

        console.log(`Deposit rejected email sent for order ${orderId}`);
    } catch (error) {
        console.error(`Error sending deposit rejected email for order ${orderId}:`, error);
        if (emailLogId) {
            await updateEmailLog(
                emailLogId,
                'failed',
                undefined,
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }
}

