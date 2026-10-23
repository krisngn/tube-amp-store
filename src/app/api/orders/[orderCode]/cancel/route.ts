import { restoreOrderInventory } from '@/lib/repositories/admin/orders';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * POST /api/orders/[orderCode]/cancel
 * Cancel an unpaid order and restore inventory
 * Used when Stripe payment is cancelled
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ orderCode: string }> }
) {
    try {
        const { orderCode } = await params;
        const supabase = createServiceClient();

        // Get order with items
        const { data: order, error: fetchError } = await supabase
            .from('orders')
            .select('id, payment_status, status, order_items(product_id, quantity)')
            .eq('order_number', orderCode)
            .single();

        if (fetchError || !order) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            );
        }

        // Only cancel if order is unpaid
        if (order.payment_status === 'paid' || order.payment_status === 'deposited') {
            return NextResponse.json(
                { error: 'Order is already paid, cannot cancel' },
                { status: 400 }
            );
        }

        if (order.status === 'cancelled') {
            return NextResponse.json(
                { message: 'Order already cancelled', inventoryRestored: false },
                { status: 200 }
            );
        }

        await restoreOrderInventory(order.id);

        // Update order status to cancelled
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                status: 'cancelled',
                payment_status: 'failed',
            })
            .eq('id', order.id);

        if (updateError) {
            console.error('Error cancelling order:', updateError);
            return NextResponse.json(
                { error: 'Failed to cancel order', details: updateError.message },
                { status: 500 }
            );
        }

        // Insert status history
        await supabase
            .from('order_status_history')
            .insert({
                order_id: order.id,
                from_status: order.status,
                to_status: 'cancelled',
                note: 'Payment cancelled at Stripe checkout',
                changed_by: null,
            });

        return NextResponse.json({
            success: true,
            message: 'Order cancelled and inventory restored',
        });
    } catch (error) {
        console.error('Error cancelling order:', error);
        return NextResponse.json(
            {
                error: 'Failed to cancel order',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

