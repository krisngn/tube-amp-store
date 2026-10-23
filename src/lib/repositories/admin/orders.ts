import { createServiceClient } from '@/lib/supabase/service';
import { sendStatusUpdateEmail } from '@/lib/emails/service';
import type { Locale } from '@/config/locales';
import { parseStripeMetadata, serializeStripeMetadata, type StripeMetadata } from '@/lib/stripe/server';

/**
 * Admin Orders Repository
 * Server-only functions for admin order management
 * Uses service role key to bypass RLS
 */

export type OrderStatus = 'pending' | 'confirmed' | 'deposited' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' | 'expired';
export type PaymentStatus = 'pending' | 'deposit_pending' | 'deposited' | 'paid' | 'failed' | 'refund_pending' | 'partially_refunded' | 'refunded';

export interface AdminOrderFilters {
    q?: string; // Search: order_number, customer_phone, customer_email
    status?: OrderStatus | 'all';
    paymentStatus?: PaymentStatus | 'all';
}

export interface AdminOrderSort {
    field: 'created_at' | 'order_number' | 'total';
    direction: 'asc' | 'desc';
}

export interface AdminListOrdersParams {
    filters?: AdminOrderFilters;
    sort?: AdminOrderSort;
    pagination?: {
        page: number;
        pageSize: number;
    };
}

export interface AdminOrderListItem {
    id: string;
    orderNumber: string;
    createdAt: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    total: number;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
}

export interface AdminOrderListResponse {
    items: AdminOrderListItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface OrderItem {
    id: string;
    productName: string;
    productSlug?: string;
    productImageUrl?: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
}

export interface OrderStatusHistory {
    id: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    note?: string;
    changedBy?: string;
    createdAt: string;
}

export interface OrderEmailStatus {
    type: 'order_confirmation' | 'status_update';
    status: 'queued' | 'sent' | 'failed' | 'skipped_no_email';
    createdAt: string;
    errorMessage?: string;
    metadataStatus?: string;
}

export interface AdminOrderDetail {
    id: string;
    orderNumber: string;
    createdAt: string;
    updatedAt: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    shippingAddressLine: string;
    shippingCity: string;
    shippingDistrict?: string;
    shippingPostalCode?: string;
    subtotal: number;
    shippingFee: number;
    tax: number;
    discount: number;
    total: number;
    paymentMethod: 'cod' | 'bank_transfer';
    paymentStatus: PaymentStatus;
    status: OrderStatus;
    orderType: 'standard' | 'deposit_reservation';
    isDepositOrder: boolean; // Legacy field
    depositAmountVnd?: number;
    depositDueAt?: string;
    depositReceivedAt?: string;
    depositPaid?: number; // Legacy field
    remainingAmount?: number;
    customerNote?: string;
    adminNote?: string;
    bankTransferMemo?: string;
    orderItems: OrderItem[];
    statusHistory: OrderStatusHistory[];
    emailStatuses: OrderEmailStatus[];
    depositProof?: {
        id: string;
        imageUrls: string[];
        status: 'pending' | 'approved' | 'rejected';
        submittedAt: string;
        reviewNote?: string;
    };
}

/**
 * List orders for admin (with filters, search, pagination)
 */
export async function adminListOrders(
    params: AdminListOrdersParams = {}
): Promise<AdminOrderListResponse> {
    const supabase = createServiceClient();
    const {
        filters = {},
        sort = { field: 'created_at', direction: 'desc' },
        pagination = { page: 1, pageSize: 20 },
    } = params;

    let query = supabase
        .from('orders')
        .select(
            `
            id,
            order_number,
            created_at,
            customer_name,
            customer_phone,
            customer_email,
            total,
            status,
            payment_status
        `,
            { count: 'exact' }
        );

    // Apply search filter (order_number, phone, email)
    if (filters.q) {
        const searchTerm = `%${filters.q}%`;
        query = query.or(
            `order_number.ilike.${searchTerm},customer_phone.ilike.${searchTerm},customer_email.ilike.${searchTerm}`
        );
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
    }

    // Apply payment status filter
    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
        query = query.eq('payment_status', filters.paymentStatus);
    }

    // Apply sorting
    query = query.order(sort.field, { ascending: sort.direction === 'asc' });

    // Apply pagination
    const from = (pagination.page - 1) * pagination.pageSize;
    const to = from + pagination.pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
        console.error('Error listing admin orders:', error);
        throw new Error('Failed to list orders');
    }

    const items: AdminOrderListItem[] =
        data?.map((order: any) => ({
            id: order.id,
            orderNumber: order.order_number,
            createdAt: order.created_at,
            customerName: order.customer_name,
            customerPhone: order.customer_phone,
            customerEmail: order.customer_email,
            total: Number(order.total),
            status: order.status as OrderStatus,
            paymentStatus: order.payment_status as PaymentStatus,
        })) || [];

    const totalPages = count ? Math.ceil(count / pagination.pageSize) : 0;

    return {
        items,
        total: count || 0,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages,
    };
}

/**
 * Get order by order number for admin detail view
 */
export async function adminGetOrderByCode(orderCode: string): Promise<AdminOrderDetail | null> {
    const supabase = createServiceClient();

    const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(
            `
            *,
            order_items (
                id,
                product_name,
                product_slug,
                product_image_url,
                unit_price,
                quantity,
                subtotal
            ),
            order_status_history (
                id,
                from_status,
                to_status,
                note,
                changed_by,
                created_at
            ),
            order_emails (
                type,
                status,
                created_at,
                error_message,
                metadata_status
            )
        `
        )
        .eq('order_number', orderCode)
        .single();

    if (orderError || !order) {
        console.error('Error fetching admin order:', orderError);
        return null;
    }

    // Fetch latest deposit proof if this is a bank transfer deposit
    let depositProof: AdminOrderDetail['depositProof'] = undefined;
    if (order.order_type === 'deposit_reservation' && order.payment_method === 'bank_transfer') {
        const { data: proof } = await supabase
            .from('deposit_transfer_proofs')
            .select('id, image_urls, status, submitted_at, review_note')
            .eq('order_id', order.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        if (proof) {
            depositProof = {
                id: proof.id,
                imageUrls: proof.image_urls || [],
                status: proof.status as 'pending' | 'approved' | 'rejected',
                submittedAt: proof.submitted_at,
                reviewNote: proof.review_note || undefined,
            };
        }
    }

    return {
        id: order.id,
        orderNumber: order.order_number,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        customerEmail: order.customer_email,
        shippingAddressLine: order.shipping_address_line,
        shippingCity: order.shipping_city,
        shippingDistrict: order.shipping_district || undefined,
        shippingPostalCode: order.shipping_postal_code || undefined,
        subtotal: Number(order.subtotal),
        shippingFee: Number(order.shipping_fee),
        tax: Number(order.tax),
        discount: Number(order.discount),
        total: Number(order.total),
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status as PaymentStatus,
        status: order.status as OrderStatus,
        orderType: (order.order_type || (order.is_deposit_order ? 'deposit_reservation' : 'standard')) as 'standard' | 'deposit_reservation',
        isDepositOrder: order.is_deposit_order,
        depositAmountVnd: order.deposit_amount_vnd ? Number(order.deposit_amount_vnd) : undefined,
        depositDueAt: order.deposit_due_at || undefined,
        depositReceivedAt: order.deposit_received_at || undefined,
        depositPaid: order.deposit_paid ? Number(order.deposit_paid) : undefined,
        remainingAmount: order.remaining_amount ? Number(order.remaining_amount) : undefined,
        customerNote: order.customer_note || undefined,
        adminNote: order.admin_note || undefined,
        bankTransferMemo: order.bank_transfer_memo || undefined,
        orderItems: (order.order_items || []).map((item: any) => ({
            id: item.id,
            productName: item.product_name,
            productSlug: item.product_slug || undefined,
            productImageUrl: item.product_image_url || undefined,
            unitPrice: Number(item.unit_price),
            quantity: item.quantity,
            subtotal: Number(item.subtotal),
        })),
        statusHistory: (order.order_status_history || [])
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((history: any) => ({
                id: history.id,
                fromStatus: history.from_status as OrderStatus | null,
                toStatus: history.to_status as OrderStatus,
                note: history.note || undefined,
                changedBy: history.changed_by || undefined,
                createdAt: history.created_at,
            })),
        emailStatuses: (order.order_emails || [])
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map((email: any) => ({
                type: email.type as 'order_confirmation' | 'status_update',
                status: email.status as 'queued' | 'sent' | 'failed' | 'skipped_no_email',
                createdAt: email.created_at,
                errorMessage: email.error_message || undefined,
                metadataStatus: email.metadata_status || undefined,
            })),
        depositProof,
    };
}

/**
 * Validate status transition
 * Rules:
 * - pending → confirmed → processing → shipped → delivered
 * - pending/confirmed/processing/shipped → cancelled
 * - Any status → refunded (if needed)
 */
function isValidStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    // Define allowed transitions
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
        pending: ['confirmed', 'cancelled', 'expired'],
        confirmed: ['processing', 'deposited', 'cancelled'],
        deposited: ['processing', 'cancelled'],
        processing: ['shipped', 'cancelled'],
        shipped: ['delivered', 'cancelled'],
        delivered: ['refunded'], // Can refund delivered orders
        cancelled: [], // Terminal state
        refunded: [], // Terminal state
        expired: [], // Terminal state
    };

    return allowedTransitions[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Update order status with history logging
 */
export async function adminUpdateOrderStatus(
    orderCode: string,
    newStatus: OrderStatus,
    note?: string,
    changedBy?: string
): Promise<void> {
    const supabase = createServiceClient();

    // Get current order with customer info and locale
    const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('id, status, customer_email, customer_name, locale')
        .eq('order_number', orderCode)
        .single();

    if (fetchError || !currentOrder) {
        throw new Error('Order not found');
    }

    const currentStatus = currentOrder.status as OrderStatus;

    // Validate transition
    if (currentStatus === newStatus) {
        throw new Error('Order is already in this status');
    }

    if (!isValidStatusTransition(currentStatus, newStatus)) {
        throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }

    // Update order status
    const { error: updateError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', currentOrder.id);

    if (updateError) {
        console.error('Error updating order status:', updateError);
        throw new Error('Failed to update order status');
    }

    // Insert history entry manually with note and changed_by if provided
    if (note || changedBy) {
        // Get the most recent history entry (created by trigger)
        const { data: historyEntries } = await supabase
            .from('order_status_history')
            .select('id')
            .eq('order_id', currentOrder.id)
            .eq('to_status', newStatus)
            .order('created_at', { ascending: false })
            .limit(1);

        if (historyEntries && historyEntries.length > 0) {
            const updateData: any = {};
            if (note) updateData.note = note;
            if (changedBy) updateData.changed_by = changedBy;

            await supabase
                .from('order_status_history')
                .update(updateData)
                .eq('id', historyEntries[0].id);
        }
    }

    // Send status update email (non-blocking)
    if (currentOrder.customer_email) {
        const locale = (currentOrder.locale === 'vi' || currentOrder.locale === 'en') 
            ? currentOrder.locale 
            : 'vi';
        
        sendStatusUpdateEmail(currentOrder.id, {
            orderCode,
            customerName: currentOrder.customer_name,
            customerEmail: currentOrder.customer_email,
            oldStatus: currentStatus,
            newStatus,
            note,
            locale: locale as Locale,
        }).catch((error) => {
            console.error('Failed to send status update email:', error);
            // Don't throw - email failure shouldn't break status update
        });
    }
}

/**
 * Mark deposit as received for a deposit reservation order
 */
export async function adminMarkDepositReceived(
    orderCode: string,
    note?: string,
    changedBy?: string
): Promise<void> {
    const supabase = createServiceClient();

    // Get current order
    const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('id, order_type, payment_status, deposit_amount_vnd, status')
        .eq('order_number', orderCode)
        .single();

    if (fetchError || !currentOrder) {
        throw new Error('Order not found');
    }

    if (currentOrder.order_type !== 'deposit_reservation') {
        throw new Error('Order is not a deposit reservation');
    }

    if (currentOrder.payment_status === 'deposited') {
        throw new Error('Deposit already marked as received');
    }

    // Update order
    const { error: updateError } = await supabase
        .from('orders')
        .update({
            payment_status: 'deposited',
            deposit_received_at: new Date().toISOString(),
            deposit_paid: currentOrder.deposit_amount_vnd, // Legacy field
            status: 'deposited', // Move to deposited status after deposit received
        })
        .eq('id', currentOrder.id);

    if (updateError) {
        console.error('Error marking deposit received:', updateError);
        throw new Error('Failed to mark deposit as received');
    }

    // Insert status history (trigger will create one, but we update it with note/changed_by if provided)
    const { data: historyEntries } = await supabase
        .from('order_status_history')
        .select('id')
        .eq('order_id', currentOrder.id)
        .eq('to_status', 'deposited')
        .order('created_at', { ascending: false })
        .limit(1);

    if (historyEntries && historyEntries.length > 0) {
        // Update the trigger-created entry with note and changed_by
        const updateData: any = {};
        if (note) updateData.note = note;
        if (changedBy) updateData.changed_by = changedBy;
        
        if (Object.keys(updateData).length > 0) {
            await supabase
                .from('order_status_history')
                .update(updateData)
                .eq('id', historyEntries[0].id);
        }
    } else {
        // Fallback: create manually if trigger didn't create it
        await supabase
            .from('order_status_history')
            .insert({
                order_id: currentOrder.id,
                from_status: currentOrder.status as OrderStatus,
                to_status: 'deposited',
                note: note || 'Deposit received',
                changed_by: changedBy || null,
            });
    }

    // Send deposit received email
    const { data: orderForEmail } = await supabase
        .from('orders')
        .select('id, customer_email, customer_name, locale')
        .eq('id', currentOrder.id)
        .single();

    if (orderForEmail?.customer_email) {
        const locale = (orderForEmail.locale === 'vi' || orderForEmail.locale === 'en') 
            ? orderForEmail.locale 
            : 'vi';
        
        sendStatusUpdateEmail(orderForEmail.id, {
            orderCode,
            customerName: orderForEmail.customer_name,
            customerEmail: orderForEmail.customer_email,
            oldStatus: currentOrder.status as OrderStatus,
            newStatus: 'deposited',
            note: note || 'Deposit received',
            locale: locale as Locale,
        }).catch((error) => {
            console.error('Failed to send deposit received email:', error);
        });
    }
}

/**
 * Expire a deposit reservation (releases inventory)
 */
export async function adminExpireReservation(
    orderCode: string,
    note?: string,
    changedBy?: string
): Promise<void> {
    const supabase = createServiceClient();

    // Get current order
    const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('id, order_type, status, order_items(product_id, quantity)')
        .eq('order_number', orderCode)
        .single();

    if (fetchError || !currentOrder) {
        throw new Error('Order not found');
    }

    if (currentOrder.order_type !== 'deposit_reservation') {
        throw new Error('Order is not a deposit reservation');
    }

    if (currentOrder.status === 'expired') {
        throw new Error('Reservation already expired');
    }

    // Update order status to expired
    const { error: updateError } = await supabase
        .from('orders')
        .update({
            status: 'expired',
        })
        .eq('id', currentOrder.id);

    if (updateError) {
        console.error('Error expiring reservation:', updateError);
        throw new Error('Failed to expire reservation');
    }

    await restoreOrderInventory(currentOrder.id);

    // Insert status history
    await supabase
        .from('order_status_history')
        .insert({
            order_id: currentOrder.id,
            from_status: currentOrder.status as OrderStatus,
            to_status: 'expired',
            note: note || 'Reservation expired',
            changed_by: changedBy || null,
        });
}

/**
 * Cancel a deposit reservation (releases inventory)
 */
export async function adminCancelReservation(
    orderCode: string,
    note?: string,
    changedBy?: string
): Promise<void> {
    const supabase = createServiceClient();

    // Get current order
    const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('id, order_type, status, order_items(product_id, quantity)')
        .eq('order_number', orderCode)
        .single();

    if (fetchError || !currentOrder) {
        throw new Error('Order not found');
    }

    if (currentOrder.order_type !== 'deposit_reservation') {
        throw new Error('Order is not a deposit reservation');
    }

    if (currentOrder.status === 'cancelled') {
        throw new Error('Reservation already cancelled');
    }

    // Update order status to cancelled
    const { error: updateError } = await supabase
        .from('orders')
        .update({
            status: 'cancelled',
        })
        .eq('id', currentOrder.id);

    if (updateError) {
        console.error('Error cancelling reservation:', updateError);
        throw new Error('Failed to cancel reservation');
    }

    await restoreOrderInventory(currentOrder.id);

    // Insert status history
    await supabase
        .from('order_status_history')
        .insert({
            order_id: currentOrder.id,
            from_status: currentOrder.status as OrderStatus,
            to_status: 'cancelled',
            note: note || 'Reservation cancelled',
            changed_by: changedBy || null,
        });
}

/**
 * Restore inventory for an order (when order is cancelled or payment fails)
 * This restores stock by incrementing quantities for each order item
 */
export async function restoreOrderInventory(orderId: string): Promise<void> {
    const supabase = createServiceClient();
    const { error } = await supabase.rpc('restore_order_inventory', { p_order_id: orderId });
    if (error) throw new Error(`Failed to restore order inventory: ${error.message}`);
}

/**
 * Set Stripe checkout session ID on order
 * Stores session ID in admin_note as JSON metadata
 */
export async function setStripeCheckoutSession(
    orderId: string,
    sessionId: string
): Promise<void> {
    const supabase = createServiceClient();

    // Get current order to preserve existing metadata
    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('admin_note')
        .eq('id', orderId)
        .single();

    if (fetchError || !order) {
        throw new Error('Order not found');
    }

    // Parse existing metadata or create new
    const metadata = parseStripeMetadata(order.admin_note);
    metadata.stripe_checkout_session_id = sessionId;

    // Update order with serialized metadata
    const { error: updateError } = await supabase
        .from('orders')
        .update({
            admin_note: serializeStripeMetadata(metadata),
        })
        .eq('id', orderId);

    if (updateError) {
        console.error('Error setting Stripe checkout session:', updateError);
        throw new Error('Failed to set Stripe checkout session');
    }
}

/**
 * Mark order as paid from Stripe payment
 * Updates payment status, order status, and stores payment intent ID
 */
export async function markOrderPaidFromStripe(
    orderId: string,
    options: {
        paymentIntentId?: string;
        paidAt?: Date;
    }
): Promise<void> {
    const supabase = createServiceClient();

    // Get current order
    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('id, order_number, payment_status, status, admin_note, customer_email, customer_name, locale')
        .eq('id', orderId)
        .single();

    if (fetchError || !order) {
        throw new Error('Order not found');
    }

    // Idempotency check: if already paid, don't process again
    if (order.payment_status === 'paid' && order.status === 'confirmed') {
        console.log(`Order ${order.order_number} already marked as paid, skipping`);
        return;
    }

    // Parse and update Stripe metadata
    const metadata = parseStripeMetadata(order.admin_note);
    if (options.paymentIntentId) {
        metadata.stripe_payment_intent_id = options.paymentIntentId;
    }
    metadata.stripe_payment_status = 'paid';

    // Update order - for full payment orders, move to confirmed status
    const updateData: any = {
        payment_status: 'paid',
        status: 'confirmed',
        confirmed_at: options.paidAt?.toISOString() || new Date().toISOString(),
        admin_note: serializeStripeMetadata(metadata),
    };

    const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

    if (updateError) {
        console.error('Error marking order as paid:', updateError);
        throw new Error('Failed to mark order as paid');
    }

    // Send payment received email
    if (order.customer_email) {
        const locale = (order.locale === 'vi' || order.locale === 'en') 
            ? order.locale 
            : 'vi';
        
        sendStatusUpdateEmail(orderId, {
            orderCode: order.order_number,
            customerName: order.customer_name,
            customerEmail: order.customer_email,
            oldStatus: order.status as OrderStatus,
            newStatus: 'confirmed',
            note: 'Payment received via Stripe',
            locale: locale as Locale,
        }).catch((error) => {
            console.error('Failed to send payment received email:', error);
        });
    }
}

/**
 * Mark deposit order as paid from Stripe payment
 * Updates payment status, order status, and stores payment intent ID
 */
export async function markOrderDepositPaidFromStripe(
    orderId: string,
    options: {
        paymentIntentId?: string;
        paidAt?: Date;
    }
): Promise<void> {
    const supabase = createServiceClient();

    // Get current order
    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('id, order_number, order_type, payment_status, status, admin_note, deposit_amount_vnd, customer_email, customer_name, locale')
        .eq('id', orderId)
        .single();

    if (fetchError || !order) {
        throw new Error('Order not found');
    }

    if (order.order_type !== 'deposit_reservation') {
        throw new Error('Order is not a deposit reservation');
    }

    // Idempotency check: if already deposited, don't process again
    if (order.payment_status === 'deposited' && order.status === 'deposited') {
        console.log(`Order ${order.order_number} deposit already marked as paid, skipping`);
        return;
    }

    // Parse and update Stripe metadata
    const metadata = parseStripeMetadata(order.admin_note);
    if (options.paymentIntentId) {
        metadata.stripe_payment_intent_id = options.paymentIntentId;
    }
    metadata.stripe_payment_status = 'deposited';

    // Update order
    const updateData: any = {
        payment_status: 'deposited',
        status: 'deposited',
        deposit_received_at: options.paidAt?.toISOString() || new Date().toISOString(),
        deposit_paid: order.deposit_amount_vnd, // Legacy field
        admin_note: serializeStripeMetadata(metadata),
    };

    const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

    if (updateError) {
        console.error('Error marking deposit as paid:', updateError);
        throw new Error('Failed to mark deposit as paid');
    }

    // Send deposit received email
    if (order.customer_email) {
        const locale = (order.locale === 'vi' || order.locale === 'en') 
            ? order.locale 
            : 'vi';
        
        sendStatusUpdateEmail(orderId, {
            orderCode: order.order_number,
            customerName: order.customer_name,
            customerEmail: order.customer_email,
            oldStatus: order.status as OrderStatus,
            newStatus: 'deposited',
            note: 'Deposit received via Stripe',
            locale: locale as Locale,
        }).catch((error) => {
            console.error('Failed to send deposit received email:', error);
        });
    }
}

/**
 * Mark order payment as failed from Stripe
 * Updates payment status but does not cancel order
 */
export async function markOrderPaymentFailedFromStripe(
    orderId: string,
    options: {
        paymentIntentId?: string;
        reason?: string;
    }
): Promise<void> {
    const supabase = createServiceClient();

    // Get current order
    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('id, order_number, payment_status, admin_note')
        .eq('id', orderId)
        .single();

    if (fetchError || !order) {
        throw new Error('Order not found');
    }

    // Idempotency check: if already failed, don't process again
    if (order.payment_status === 'failed') {
        console.log(`Order ${order.order_number} payment already marked as failed, skipping`);
        return;
    }

    // Parse and update Stripe metadata
    const metadata = parseStripeMetadata(order.admin_note);
    if (options.paymentIntentId) {
        metadata.stripe_payment_intent_id = options.paymentIntentId;
    }
    metadata.stripe_payment_status = 'failed';

    // Update order (only payment status, not order status)
    const { error: updateError } = await supabase
        .from('orders')
        .update({
            payment_status: 'failed',
            admin_note: serializeStripeMetadata(metadata),
        })
        .eq('id', orderId);

    if (updateError) {
        console.error('Error marking payment as failed:', updateError);
        throw new Error('Failed to mark payment as failed');
    }
}

/**
 * Check if Stripe event has already been processed (idempotency)
 */
export async function hasStripeEventBeenProcessed(
    orderId: string,
    eventId: string
): Promise<boolean> {
    const supabase = createServiceClient();

    const { data: order, error } = await supabase
        .from('orders')
        .select('admin_note')
        .eq('id', orderId)
        .single();

    if (error || !order) {
        return false;
    }

    const metadata = parseStripeMetadata(order.admin_note);
    const processedEvents = metadata.stripe_processed_events || [];
    return processedEvents.includes(eventId);
}

/**
 * Mark Stripe event as processed (idempotency)
 */
export async function markStripeEventAsProcessed(
    orderId: string,
    eventId: string
): Promise<void> {
    const supabase = createServiceClient();

    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('admin_note')
        .eq('id', orderId)
        .single();

    if (fetchError || !order) {
        throw new Error('Order not found');
    }

    const metadata = parseStripeMetadata(order.admin_note);
    if (!metadata.stripe_processed_events) {
        metadata.stripe_processed_events = [];
    }
    if (!metadata.stripe_processed_events.includes(eventId)) {
        metadata.stripe_processed_events.push(eventId);
    }

    const { error: updateError } = await supabase
        .from('orders')
        .update({
            admin_note: serializeStripeMetadata(metadata),
        })
        .eq('id', orderId);

    if (updateError) {
        console.error('Error marking event as processed:', updateError);
        // Don't throw - this is not critical
    }
}

/**
 * Mark order refund as pending from Stripe refund request
 * Sets payment_status to refund_pending and stores refund info in metadata
 */
export async function markOrderRefundPendingFromStripe(
    orderId: string,
    options: {
        refundId: string;
        amount: number;
        currency: string;
        reason?: string;
        note?: string;
        restock?: boolean;
    }
): Promise<void> {
    const supabase = createServiceClient();

    // Get current order
    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('id, order_number, payment_status, admin_note')
        .eq('id', orderId)
        .single();

    if (fetchError || !order) {
        throw new Error('Order not found');
    }

    // Parse and update Stripe metadata
    const metadata = parseStripeMetadata(order.admin_note);
    
    // Initialize refunds object if not exists
    if (!metadata.stripe_refunds) {
        metadata.stripe_refunds = {
            total_refunded_amount: 0,
            currency: options.currency,
            refunds: [],
        };
    }

    // Add refund to list
    if (!metadata.stripe_refunds.refunds) {
        metadata.stripe_refunds.refunds = [];
    }

    metadata.stripe_refunds.refunds.push({
        refund_id: options.refundId,
        amount: options.amount,
        status: 'pending',
        created_at: new Date().toISOString(),
        reason: options.reason,
    });

    // Update refund info
    metadata.stripe_refunds.last_refund_id = options.refundId;
    metadata.stripe_refunds.refund_status = 'pending';
    
    // If restock was requested, mark inventory as restored
    if (options.restock) {
        metadata.stripe_refunds.inventory_restored_at = new Date().toISOString();
    }

    // Update order - set payment_status to refund_pending
    const { error: updateError } = await supabase
        .from('orders')
        .update({
            payment_status: 'refund_pending',
            admin_note: serializeStripeMetadata(metadata),
        })
        .eq('id', orderId);

    if (updateError) {
        console.error('Error marking refund as pending:', updateError);
        throw new Error('Failed to mark refund as pending');
    }
}

/**
 * Mark order as refunded from Stripe webhook
 * Updates payment_status based on refund amount (partially_refunded or refunded)
 */
export async function markOrderRefundedFromStripe(
    orderId: string,
    refundInfo: {
        refundId: string;
        amount: number;
        currency: string;
        status: string;
        chargeId?: string;
        paymentIntentId?: string;
    },
    options: {
        partial: boolean;
    }
): Promise<void> {
    const supabase = createServiceClient();

    // Get current order
    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('id, order_number, order_type, payment_status, admin_note, total, deposit_amount_vnd')
        .eq('id', orderId)
        .single();

    if (fetchError || !order) {
        throw new Error('Order not found');
    }

    // Parse and update Stripe metadata
    const metadata = parseStripeMetadata(order.admin_note);
    
    // Initialize refunds object if not exists
    if (!metadata.stripe_refunds) {
        metadata.stripe_refunds = {
            total_refunded_amount: 0,
            currency: refundInfo.currency,
            refunds: [],
        };
    }

    // Update refund in list or add new one
    if (!metadata.stripe_refunds.refunds) {
        metadata.stripe_refunds.refunds = [];
    }

    const existingRefundIndex = metadata.stripe_refunds.refunds.findIndex(
        (r) => r.refund_id === refundInfo.refundId
    );

    if (existingRefundIndex >= 0) {
        // Update existing refund
        metadata.stripe_refunds.refunds[existingRefundIndex] = {
            refund_id: refundInfo.refundId,
            amount: refundInfo.amount,
            status: refundInfo.status,
            created_at: metadata.stripe_refunds.refunds[existingRefundIndex].created_at,
            reason: metadata.stripe_refunds.refunds[existingRefundIndex].reason,
        };
    } else {
        // Add new refund
        metadata.stripe_refunds.refunds.push({
            refund_id: refundInfo.refundId,
            amount: refundInfo.amount,
            status: refundInfo.status,
            created_at: new Date().toISOString(),
        });
    }

    // Calculate total refunded amount
    const totalRefunded = metadata.stripe_refunds.refunds
        .filter((r) => r.status === 'succeeded')
        .reduce((sum, r) => sum + r.amount, 0);

    // Determine paid amount (deposit for deposit orders, total for normal orders)
    const paidAmount = order.order_type === 'deposit_reservation'
        ? (order.deposit_amount_vnd || 0)
        : Number(order.total);

    // Update refund info
    metadata.stripe_refunds.total_refunded_amount = totalRefunded;
    metadata.stripe_refunds.last_refund_id = refundInfo.refundId;
    metadata.stripe_refunds.refund_status = refundInfo.status === 'succeeded' ? 'succeeded' : 'pending';

    // Determine new payment status
    let newPaymentStatus: PaymentStatus;
    if (totalRefunded >= paidAmount) {
        newPaymentStatus = 'refunded';
    } else if (totalRefunded > 0) {
        newPaymentStatus = 'partially_refunded';
    } else {
        newPaymentStatus = order.payment_status as PaymentStatus; // Keep current status if no successful refunds
    }

    // Update order
    const { error: updateError } = await supabase
        .from('orders')
        .update({
            payment_status: newPaymentStatus,
            admin_note: serializeStripeMetadata(metadata),
        })
        .eq('id', orderId);

    if (updateError) {
        console.error('Error marking order as refunded:', updateError);
        throw new Error('Failed to mark order as refunded');
    }
}

/**
 * Helper to safely append refund info to metadata
 */
export function appendStripeRefundToMetadata(
    metadata: ReturnType<typeof parseStripeMetadata>,
    refundInfo: {
        refundId: string;
        amount: number;
        currency: string;
        status: string;
    }
): ReturnType<typeof parseStripeMetadata> {
    if (!metadata.stripe_refunds) {
        metadata.stripe_refunds = {
            total_refunded_amount: 0,
            currency: refundInfo.currency,
            refunds: [],
        };
    }

    if (!metadata.stripe_refunds.refunds) {
        metadata.stripe_refunds.refunds = [];
    }

    // Check if refund already exists
    const existingIndex = metadata.stripe_refunds.refunds.findIndex(
        (r) => r.refund_id === refundInfo.refundId
    );

    if (existingIndex >= 0) {
        // Update existing
        metadata.stripe_refunds.refunds[existingIndex] = {
            ...metadata.stripe_refunds.refunds[existingIndex],
            amount: refundInfo.amount,
            status: refundInfo.status,
        };
    } else {
        // Add new
        metadata.stripe_refunds.refunds.push({
            refund_id: refundInfo.refundId,
            amount: refundInfo.amount,
            status: refundInfo.status,
            created_at: new Date().toISOString(),
        });
    }

    // Recalculate total
    metadata.stripe_refunds.total_refunded_amount = metadata.stripe_refunds.refunds
        .filter((r) => r.status === 'succeeded')
        .reduce((sum, r) => sum + r.amount, 0);

    metadata.stripe_refunds.last_refund_id = refundInfo.refundId;
    metadata.stripe_refunds.refund_status = refundInfo.status === 'succeeded' ? 'succeeded' : 'pending';

    return metadata;
}
