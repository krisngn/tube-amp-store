import { restoreOrderInventory } from '@/lib/repositories/admin/orders';
import { NextRequest, NextResponse } from 'next/server';
import { getStripeWebhookEvent, getStripe, parseStripeMetadata } from '@/lib/stripe/server';
import {
    markOrderPaidFromStripe,
    markOrderDepositPaidFromStripe,
    markOrderPaymentFailedFromStripe,
    markOrderRefundedFromStripe,
    hasStripeEventBeenProcessed,
    markStripeEventAsProcessed,
} from '@/lib/repositories/admin/orders';
import { createServiceClient } from '@/lib/supabase/service';
import { sendRefundEmail } from '@/lib/emails/service';
import type { Locale } from '@/config/locales';
import Stripe from 'stripe';

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events
 * 
 * Security: Verifies webhook signature
 * Idempotency: Prevents duplicate processing of events
 */
export async function POST(request: NextRequest) {
    try {
        // Get raw body for signature verification
        const rawBody = await request.text();
        const signature = request.headers.get('stripe-signature');

        if (!signature) {
            console.error('Missing Stripe signature header');
            return NextResponse.json(
                { error: 'Missing signature' },
                { status: 400 }
            );
        }

        // Verify webhook signature
        const event = await getStripeWebhookEvent(rawBody, signature);
        if (!event) {
            console.error('Invalid Stripe webhook signature');
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 400 }
            );
        }

        console.log(`Received Stripe webhook event: ${event.type} (${event.id})`);

        // Handle different event types
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                await handleCheckoutSessionCompleted(session, event.id);
                break;
            }

            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                await handlePaymentIntentSucceeded(paymentIntent, event.id);
                break;
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                await handlePaymentIntentFailed(paymentIntent, event.id);
                break;
            }

            case 'charge.refunded': {
                const charge = event.data.object as Stripe.Charge;
                await handleChargeRefunded(charge, event.id);
                break;
            }

            case 'refund.updated': {
                const refund = event.data.object as Stripe.Refund;
                await handleRefundUpdated(refund, event.id);
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        // Return 200 quickly to acknowledge receipt
        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Error processing Stripe webhook:', error);
        return NextResponse.json(
            {
                error: 'Webhook processing failed',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
    eventId: string
): Promise<void> {
    const orderId = session.metadata?.order_id;
    const orderCode = session.metadata?.order_code || session.client_reference_id;
    const orderType = session.metadata?.order_type || 'standard';

    if (!orderId) {
        console.error('Missing order_id in checkout session metadata');
        return;
    }

    // Idempotency check
    if (await hasStripeEventBeenProcessed(orderId, eventId)) {
        console.log(`Event ${eventId} already processed for order ${orderId}`);
        return;
    }

    // Get payment intent ID if available
    const paymentIntentId =
        typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id;

    const paidAt = session.payment_status === 'paid' ? new Date() : undefined;

    // Update order based on type
    if (orderType === 'deposit_reservation') {
        await markOrderDepositPaidFromStripe(orderId, {
            paymentIntentId,
            paidAt,
        });
    } else {
        await markOrderPaidFromStripe(orderId, {
            paymentIntentId,
            paidAt,
        });
    }

    // Mark event as processed
    await markStripeEventAsProcessed(orderId, eventId);
}

/**
 * Handle payment_intent.succeeded event
 * This is a backup handler in case checkout.session.completed doesn't fire
 */
async function handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
    eventId: string
): Promise<void> {
    // Try to get order from metadata
    const orderId = paymentIntent.metadata?.order_id;
    const orderCode = paymentIntent.metadata?.order_code;
    const orderType = paymentIntent.metadata?.order_type || 'standard';

    if (!orderId) {
        console.log('No order_id in payment intent metadata, skipping');
        return;
    }

    // Idempotency check
    if (await hasStripeEventBeenProcessed(orderId, eventId)) {
        console.log(`Event ${eventId} already processed for order ${orderId}`);
        return;
    }

    const paidAt = new Date();

    // Update order based on type
    if (orderType === 'deposit_reservation') {
        await markOrderDepositPaidFromStripe(orderId, {
            paymentIntentId: paymentIntent.id,
            paidAt,
        });
    } else {
        await markOrderPaidFromStripe(orderId, {
            paymentIntentId: paymentIntent.id,
            paidAt,
        });
    }

    // Mark event as processed
    await markStripeEventAsProcessed(orderId, eventId);
}

/**
 * Handle payment_intent.payment_failed event
 */
async function handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent,
    eventId: string
): Promise<void> {
    const orderId = paymentIntent.metadata?.order_id;

    if (!orderId) {
        console.log('No order_id in payment intent metadata, skipping');
        return;
    }

    // Idempotency check
    if (await hasStripeEventBeenProcessed(orderId, eventId)) {
        console.log(`Event ${eventId} already processed for order ${orderId}`);
        return;
    }

    await markOrderPaymentFailedFromStripe(orderId, {
        paymentIntentId: paymentIntent.id,
        reason: paymentIntent.last_payment_error?.message || 'Payment failed',
    });

    // Propagate restoration errors so Stripe retries instead of marking the event done.
    await restoreOrderInventory(orderId);

    // Mark event as processed
    await markStripeEventAsProcessed(orderId, eventId);
}

/**
 * Handle charge.refunded event
 * This event fires when a refund is completed
 */
async function handleChargeRefunded(
    charge: Stripe.Charge,
    eventId: string
): Promise<void> {
    // Get payment intent ID from charge
    const paymentIntentId = typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;

    if (!paymentIntentId) {
        console.log('No payment_intent in charge, skipping');
        return;
    }

    // Find order by payment intent ID
    const supabase = createServiceClient();
    const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, admin_note')
        .not('admin_note', 'is', null);

    if (!orders || orders.length === 0) {
        console.log('No orders found with metadata');
        return;
    }

    // Find order with matching payment intent ID
    let orderId: string | null = null;
    let orderCode: string | null = null;

    for (const order of orders) {
        const metadata = parseStripeMetadata(order.admin_note);
        if (metadata.stripe_payment_intent_id === paymentIntentId) {
            orderId = order.id;
            orderCode = order.order_number;
            break;
        }
    }

    if (!orderId) {
        console.log(`No order found for payment intent ${paymentIntentId}`);
        return;
    }

    // Idempotency check
    if (await hasStripeEventBeenProcessed(orderId, eventId)) {
        console.log(`Event ${eventId} already processed for order ${orderId}`);
        return;
    }

    // Get refunds for this charge
    const stripe = getStripe();
    const refunds = await stripe.refunds.list({
        charge: charge.id,
        limit: 100,
    });

    if (!refunds.data || refunds.data.length === 0) {
        console.log(`No refunds found for charge ${charge.id}`);
        return;
    }

    // Process each refund
    for (const refund of refunds.data) {
        if (refund.status === 'succeeded') {
            // Get order details to determine paid amount
            const { data: orderDetails } = await supabase
                .from('orders')
                .select('order_type, total, deposit_amount_vnd')
                .eq('id', orderId)
                .single();

            if (!orderDetails) {
                console.error(`Order ${orderId} not found`);
                continue;
            }

            const paidAmount = orderDetails.order_type === 'deposit_reservation'
                ? (orderDetails.deposit_amount_vnd || 0)
                : Number(orderDetails.total);

            // Get current refunded amount from metadata
            const { data: currentOrder } = await supabase
                .from('orders')
                .select('admin_note')
                .eq('id', orderId)
                .single();

            if (!currentOrder) continue;

            const metadata = parseStripeMetadata(currentOrder.admin_note);
            const existingRefunded = metadata.stripe_refunds?.total_refunded_amount || 0;
            const newTotalRefunded = existingRefunded + refund.amount;

            // Determine if partial or full refund
            const isPartial = newTotalRefunded < paidAmount;

            // Mark order as refunded
            await markOrderRefundedFromStripe(orderId, {
                refundId: refund.id,
                amount: refund.amount,
                currency: refund.currency,
                status: refund.status,
                chargeId: charge.id,
                paymentIntentId,
            }, {
                partial: isPartial,
            });

            // Send refund email notification
            try {
                const { data: orderForEmail } = await supabase
                    .from('orders')
                    .select('id, customer_email, customer_name, locale')
                    .eq('id', orderId)
                    .single();

                if (orderForEmail?.customer_email) {
                    const locale = (orderForEmail.locale === 'vi' || orderForEmail.locale === 'en')
                        ? orderForEmail.locale
                        : 'vi';

                    await sendRefundEmail(orderId, {
                        orderCode: orderCode || '',
                        customerName: orderForEmail.customer_name,
                        customerEmail: orderForEmail.customer_email,
                        refundAmount: refund.amount,
                        currency: refund.currency,
                        isPartial,
                        locale: locale as Locale,
                    });
                }
            } catch (emailError) {
                console.error('Error sending refund email:', emailError);
                // Don't throw - email failure shouldn't break webhook processing
            }
        }
    }

    // Mark event as processed
    await markStripeEventAsProcessed(orderId, eventId);
}

/**
 * Handle refund.updated event
 * This event fires when refund status changes
 */
async function handleRefundUpdated(
    refund: Stripe.Refund,
    eventId: string
): Promise<void> {
    // Get charge ID to find payment intent
    const chargeId = typeof refund.charge === 'string' ? refund.charge : refund.charge?.id;
    if (!chargeId) {
        console.log('No charge ID in refund, skipping');
        return;
    }

    // Get charge to find payment intent
    const stripe = getStripe();
    let charge: Stripe.Charge;
    try {
        charge = await stripe.charges.retrieve(chargeId);
    } catch (error) {
        console.error('Error retrieving charge:', error);
        return;
    }

    const paymentIntentId = typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;

    if (!paymentIntentId) {
        console.log('No payment_intent in charge, skipping');
        return;
    }

    // Find order by payment intent ID
    const supabase = createServiceClient();
    const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, admin_note')
        .not('admin_note', 'is', null);

    if (!orders || orders.length === 0) {
        console.log('No orders found with metadata');
        return;
    }

    // Find order with matching payment intent ID
    let orderId: string | null = null;
    let orderCode: string | null = null;

    for (const order of orders) {
        const metadata = parseStripeMetadata(order.admin_note);
        if (metadata.stripe_payment_intent_id === paymentIntentId) {
            orderId = order.id;
            orderCode = order.order_number;
            break;
        }
    }

    if (!orderId) {
        console.log(`No order found for payment intent ${paymentIntentId}`);
        return;
    }

    // Idempotency check
    if (await hasStripeEventBeenProcessed(orderId, eventId)) {
        console.log(`Event ${eventId} already processed for order ${orderId}`);
        return;
    }

    // Get order details to determine paid amount
    const { data: orderDetails } = await supabase
        .from('orders')
        .select('order_type, total, deposit_amount_vnd, admin_note')
        .eq('id', orderId)
        .single();

    if (!orderDetails) {
        console.error(`Order ${orderId} not found`);
        return;
    }

    const paidAmount = orderDetails.order_type === 'deposit_reservation'
        ? (orderDetails.deposit_amount_vnd || 0)
        : Number(orderDetails.total);

    // Get current refunded amount from metadata
    const metadata = parseStripeMetadata(orderDetails.admin_note);
    const existingRefunded = metadata.stripe_refunds?.total_refunded_amount || 0;
    
    // Calculate new total if this refund succeeded
    let newTotalRefunded = existingRefunded;
    if (refund.status === 'succeeded') {
        // Check if this refund was already counted
        const refundExists = metadata.stripe_refunds?.refunds?.some(
            (r) => r.refund_id === refund.id && r.status === 'succeeded'
        );
        if (!refundExists) {
            newTotalRefunded = existingRefunded + refund.amount;
        }
    }

    // Determine if partial or full refund
    const isPartial = newTotalRefunded < paidAmount;

    // Update order refund status
    await markOrderRefundedFromStripe(orderId, {
        refundId: refund.id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status || 'unknown',
        chargeId,
        paymentIntentId,
    }, {
        partial: isPartial,
    });

    // Send email if refund succeeded
    if (refund.status === 'succeeded') {
        try {
            const { data: orderForEmail } = await supabase
                .from('orders')
                .select('id, customer_email, customer_name, locale')
                .eq('id', orderId)
                .single();

            if (orderForEmail?.customer_email) {
                const locale = (orderForEmail.locale === 'vi' || orderForEmail.locale === 'en')
                    ? orderForEmail.locale
                    : 'vi';

                await sendRefundEmail(orderId, {
                    orderCode: orderCode || '',
                    customerName: orderForEmail.customer_name,
                    customerEmail: orderForEmail.customer_email,
                    refundAmount: refund.amount,
                    currency: refund.currency,
                    isPartial,
                    locale: locale as Locale,
                });
            }
        } catch (emailError) {
            console.error('Error sending refund email:', emailError);
            // Don't throw - email failure shouldn't break webhook processing
        }
    }

    // Mark event as processed
    await markStripeEventAsProcessed(orderId, eventId);
}

// Configure route to handle raw body for webhook signature verification
export const runtime = 'nodejs';

// Disable body parsing - we need raw body for signature verification
export const dynamic = 'force-dynamic';

