import { selectPurchaseOption } from '@/lib/products/variants';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendOrderConfirmationEmail } from '@/lib/emails/service';
import { defaultLocale, type Locale } from '@/config/locales';
import { generateTransferMemo } from '@/lib/vietqr/generator';

interface OrderItemRequest {
    variantId?: string;
    productId: string;
    quantity: number;
    requiresDeposit?: boolean;
    depositAmount?: number;
    depositType?: 'percent' | 'fixed';
    depositPercentage?: number;
}

interface CreateOrderRequest {
    items: OrderItemRequest[];
    customerInfo: {
        fullName: string;
        phone: string;
        email?: string;
    };
    shippingAddress: {
        addressLine: string;
        city: string;
        district?: string;
    };
    paymentMethod: 'cod' | 'bank_transfer';
    paymentMode: 'deposit' | 'full' | 'cod'; // Order-level payment mode (single source of truth)
    note?: string;
}

/**
 * POST /api/orders
 * Create a new order with inventory validation
 */
export async function POST(request: NextRequest) {
    try {
        const body: CreateOrderRequest = await request.json();

        // Validate request
        if (!body.items || body.items.length === 0) {
            return NextResponse.json(
                { error: 'Cart is empty' },
                { status: 400 }
            );
        }

        if (!body.customerInfo?.fullName || !body.customerInfo?.phone) {
            return NextResponse.json(
                { error: 'Customer information is required' },
                { status: 400 }
            );
        }

        if (!body.shippingAddress?.addressLine || !body.shippingAddress?.city) {
            return NextResponse.json(
                { error: 'Shipping address is required' },
                { status: 400 }
            );
        }

        if (body.items.some((item) => !Number.isSafeInteger(item.quantity) || item.quantity <= 0)) {
            return NextResponse.json({ error: 'Số lượng phải là số nguyên lớn hơn 0.' }, { status: 400 });
        }

        // Use service client to bypass RLS for order creation
        // This is safe because we validate everything server-side
        const supabase = createServiceClient();

        // Check if user is authenticated (for attaching order to account)
        let userId: string | null = null;
        try {
            const { createClient: createServerClient } = await import('@/lib/supabase/server');
            const serverSupabase = await createServerClient();
            const { data: { user } } = await serverSupabase.auth.getUser();
            
            if (user?.id) {
                // Ensure user profile exists before creating order
                const { error: profileError } = await supabase
                    .from('user_profiles')
                    .upsert({
                        id: user.id,
                        email: user.email || body.customerInfo.email || '',
                        updated_at: new Date().toISOString(),
                    }, {
                        onConflict: 'id',
                    });

                if (profileError) {
                    console.error('Error ensuring user profile exists:', profileError);
                    // Continue as guest if profile creation fails
                    userId = null;
                } else {
                    userId = user.id;
                }
            }
        } catch (error) {
            // User not authenticated or error - continue as guest
            console.log('User not authenticated or error, creating guest order:', error);
        }

        // Get locale from cookie or default to 'vi'
        const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
        const locale: Locale = (localeCookie === 'vi' || localeCookie === 'en') ? localeCookie : defaultLocale;

        // Fetch all products in the order (including deposit fields)
        const productIds = body.items.map((item) => item.productId);
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, is_published, variants, price, stock_quantity, allow_deposit, deposit_type, deposit_amount, deposit_percentage, deposit_due_hours, sku')
            .in('id', productIds);

        if (productsError || !products) {
            console.error('Error fetching products:', productsError);
            return NextResponse.json(
                {
                    error: 'Failed to fetch products',
                    details: productsError?.message || 'Unknown error',
                },
                { status: 500 }
            );
        }

        // Validate stock availability and build order items
        const orderItems: Array<{
            productId: string;
            variantId?: string;
            variantName?: string;
            productName: string;
            productSlug: string;
            productSku?: string;
            productImageUrl?: string;
            unitPrice: number;
            quantity: number;
            subtotal: number;
        }> = [];

        // Validate paymentMode
        if (!body.paymentMode || !['deposit', 'full', 'cod'].includes(body.paymentMode)) {
            return NextResponse.json(
                { error: 'Invalid paymentMode. Must be deposit, full, or cod' },
                { status: 400 }
            );
        }

        // Validate paymentMode and paymentMethod consistency
        if (body.paymentMode === 'cod' && body.paymentMethod !== 'cod') {
            return NextResponse.json(
                { error: 'Payment mode COD requires payment method COD' },
                { status: 400 }
            );
        }
        // Note: Deposit mode can now be used with COD - customer pays deposit when receiving order

        let subtotal = 0;
        let depositAmountTotal = 0;
        let depositDueHours = 24; // Default
        let hasDepositEligibleProducts = false; // Track if any products support deposits

        const requestedQuantities = new Map<string, number>();

        // Fetch products to check deposit eligibility and calculate deposit (only if paymentMode === 'deposit')
        for (const item of body.items) {
            const product = products.find((p) => p.id === item.productId);

            if (!product) {
                return NextResponse.json(
                    { error: `Product ${item.productId} not found` },
                    { status: 404 }
                );
            }

            if (!product.is_published) return NextResponse.json({ error: 'Sản phẩm chưa được xuất bản.' }, { status: 400 });
            let option;
            try { option = selectPurchaseOption(product, item.variantId); } catch (error) {
                return NextResponse.json({ error: (error as Error).message }, { status: 400 });
            }
            const key = JSON.stringify([product.id, item.variantId ?? null]);
            const requested = (requestedQuantities.get(key) ?? 0) + item.quantity;
            requestedQuantities.set(key, requested);
            // Aggregate duplicate cart lines before checking available stock.
            if (option.stockQuantity < requested) {
                return NextResponse.json(
                    { error: `Insufficient stock for product ${product.id}` },
                    { status: 400 }
                );
            }

            // Fetch product name and image (need translation and image)
            // Try locale first, then fallback to any translation
            let productDetail = null;
            let productName = 'Unknown Product';
            let productSlug = '';
            let productSku: string | undefined;
            let productImageUrl: string | undefined;

            // Try to get translation for the locale
            const { data: productDetailWithLocale } = await supabase
                .from('products')
                .select(
                    `
                    slug,
                    sku,
                    product_translations!inner(name, locale),
                    product_images!left(url, is_primary)
                `
                )
                .eq('id', item.productId)
                .eq('product_translations.locale', locale)
                .maybeSingle();

            if (productDetailWithLocale) {
                productDetail = productDetailWithLocale;
                productName = productDetail.product_translations?.[0]?.name || 'Unknown Product';
                productSlug = productDetail.slug || '';
                productSku = productDetail.sku;
                const primaryImage = productDetail.product_images?.find(
                    (img: { is_primary: boolean }) => img.is_primary
                );
                productImageUrl = primaryImage?.url || productDetail.product_images?.[0]?.url;
            } else {
                // Fallback: get any translation
                const { data: productDetailFallback } = await supabase
                    .from('products')
                    .select(
                        `
                        slug,
                        sku,
                        product_translations(name, locale),
                        product_images(url, is_primary)
                    `
                    )
                    .eq('id', item.productId)
                    .maybeSingle();

                if (productDetailFallback) {
                    productName =
                        productDetailFallback.product_translations?.[0]?.name || 'Unknown Product';
                    productSlug = productDetailFallback.slug || '';
                    productSku = productDetailFallback.sku;
                    const primaryImage = productDetailFallback.product_images?.find(
                        (img: { is_primary: boolean }) => img.is_primary
                    );
                    productImageUrl =
                        primaryImage?.url || productDetailFallback.product_images?.[0]?.url;
                }
            }

            const unitPrice = option.price;
            const variantName = "name" in option ? option.name : undefined;
            if (variantName) productName = `${productName} — ${variantName}`;
            productSku = option.sku;
            if ("imageUrl" in option && option.imageUrl) productImageUrl = option.imageUrl;
            const itemSubtotal = unitPrice * item.quantity;

            orderItems.push({
                productId: product.id,
                variantId: item.variantId,
                variantName,
                productName,
                productSlug,
                productSku,
                productImageUrl,
                unitPrice,
                quantity: item.quantity,
                subtotal: itemSubtotal,
            });

            subtotal += itemSubtotal;

            // Track if product is deposit-eligible (for validation)
            if (product.allow_deposit) {
                hasDepositEligibleProducts = true;
            }

            // Calculate deposit ONLY if paymentMode === 'deposit'
            // This is the single source of truth - product config doesn't force deposit
            if (body.paymentMode === 'deposit') {
                // Validate product supports deposits
                if (!product.allow_deposit) {
                    return NextResponse.json(
                        { error: `Product ${product.id} does not support deposit reservations` },
                        { status: 400 }
                    );
                }

                // Calculate deposit amount from product settings
                let itemDepositAmount = 0;
                if (product.deposit_type === 'percent' && product.deposit_percentage) {
                    itemDepositAmount = Math.round((unitPrice * product.deposit_percentage) / 100);
                } else if (product.deposit_type === 'fixed' && product.deposit_amount) {
                    itemDepositAmount = Math.min(Number(product.deposit_amount), unitPrice);
                } else {
                    return NextResponse.json(
                        { error: `Product ${product.id} has invalid deposit configuration` },
                        { status: 400 }
                    );
                }
                
                depositAmountTotal += itemDepositAmount * item.quantity;
                
                // Use deposit_due_hours from product (default 24)
                if (product.deposit_due_hours) {
                    depositDueHours = product.deposit_due_hours;
                }
            }
            // If paymentMode !== 'deposit', depositAmountTotal remains 0 (enforced)
        }

        // Determine order type and deposit fields based on paymentMode (single source of truth)
        const isDepositOrder = body.paymentMode === 'deposit';
        const orderType = isDepositOrder ? 'deposit_reservation' : 'standard';
        
        // Enforce: if order_type !== 'deposit_reservation', deposit must be 0
        const finalDepositAmount = isDepositOrder ? depositAmountTotal : 0;
        const finalRemainingAmount = isDepositOrder ? subtotal - depositAmountTotal : null;
        const depositDueAt = isDepositOrder 
            ? new Date(Date.now() + depositDueHours * 60 * 60 * 1000).toISOString()
            : null;
        
        // Payment status based on paymentMode and paymentMethod
        let paymentStatus: string;
        if (body.paymentMode === 'cod') {
            if (body.paymentMethod === 'cod' && isDepositOrder) {
                // Deposit reservation with COD: customer pays deposit when receiving order
                paymentStatus = 'deposit_pending';
            } else {
                // Regular COD: pending until delivery
                paymentStatus = 'pending';
            }
        } else if (body.paymentMode === 'deposit') {
            paymentStatus = 'deposit_pending'; // Deposit: waiting for deposit payment (online or COD)
        } else {
            paymentStatus = 'pending'; // Full payment: pending until payment received
        }

        // Validation: Ensure deposit is 0 if not deposit order
        if (!isDepositOrder && finalDepositAmount !== 0) {
            return NextResponse.json(
                { error: 'Logic error: Deposit amount must be 0 for non-deposit orders' },
                { status: 500 }
            );
        }

        // Generate bank transfer memo for deposit + bank_transfer orders
        // The memo will be set after we have the order number, but we prepare the VietQR timestamp now
        const isBankTransferDeposit = isDepositOrder && body.paymentMethod === 'bank_transfer';

        // Create order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                user_id: userId, // Attach to user if authenticated, null for guest
                customer_email: body.customerInfo.email || '',
                customer_name: body.customerInfo.fullName,
                customer_phone: body.customerInfo.phone,
                shipping_address_line: body.shippingAddress.addressLine,
                shipping_city: body.shippingAddress.city,
                shipping_district: body.shippingAddress.district || null,
                subtotal: subtotal,
                shipping_fee: 0, // MVP: no shipping fee calculation
                tax: 0,
                discount: 0,
                total: subtotal,
                payment_method: body.paymentMethod,
                payment_status: paymentStatus,
                order_type: orderType,
                is_deposit_order: isDepositOrder, // Legacy field
                deposit_amount_vnd: finalDepositAmount > 0 ? finalDepositAmount : null,
                deposit_due_at: depositDueAt,
                remaining_amount: finalRemainingAmount,
                customer_note: body.note || null,
                locale: locale,
                status: 'pending',
                // Bank transfer specific fields
                vietqr_generated_at: isBankTransferDeposit ? new Date().toISOString() : null,
            })
            .select('id, order_number')
            .single();

        if (orderError || !order) {
            console.error('Error creating order:', orderError);
            return NextResponse.json(
                {
                    error: 'Failed to create order',
                    details: orderError?.message || 'Unknown error',
                    code: orderError?.code,
                },
                { status: 500 }
            );
        }

        // Update bank_transfer_memo now that we have the order number
        if (isBankTransferDeposit) {
            const bankTransferMemo = generateTransferMemo(order.order_number);
            await supabase
                .from('orders')
                .update({ bank_transfer_memo: bankTransferMemo })
                .eq('id', order.id);
        }

        // Create order items (this will trigger stock decrement via trigger)
        const orderItemsData = orderItems.map((item) => ({
            order_id: order.id,
            product_id: item.productId,
            variant_id: item.variantId ?? null,
            variant_name: item.variantName ?? null,
            product_name: item.productName,
            product_slug: item.productSlug,
            product_sku: item.productSku,
            product_image_url: item.productImageUrl,
            unit_price: item.unitPrice,
            quantity: item.quantity,
            subtotal: item.subtotal,
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItemsData);

        if (itemsError) {
            console.error('Error creating order items:', itemsError);
            // Try to clean up the order (best effort)
            await supabase.from('orders').delete().eq('id', order.id);
            const availabilityChanged = /Insufficient|price changed|valid product variant|Product unavailable|Variant no longer exists/i.test(itemsError.message);
            return NextResponse.json(
                {
                    error: availabilityChanged
                        ? 'Giá hoặc tồn kho đã thay đổi. Vui lòng tải lại sản phẩm và thử lại.'
                        : 'Failed to create order items',
                    details: itemsError.message || 'Unknown error',
                    code: itemsError.code,
                },
                { status: availabilityChanged ? 409 : 500 }
            );
        }

        // Send order confirmation email (non-blocking)
        // Email failure should not prevent order creation
        // Wrap in try-catch to ensure no errors break checkout
        try {
            if (body.customerInfo.email && body.customerInfo.email.trim()) {
                const shippingAddress = [
                    body.shippingAddress.addressLine,
                    body.shippingAddress.district,
                    body.shippingAddress.city,
                ]
                    .filter(Boolean)
                    .join(', ');

                // Don't await - fire and forget to not block response
                sendOrderConfirmationEmail(order.id, {
                    orderCode: order.order_number,
                    customerName: body.customerInfo.fullName,
                    customerPhone: body.customerInfo.phone,
                    customerEmail: body.customerInfo.email,
                    shippingAddress,
                    items: orderItems.map((item) => ({
                        productName: item.productName,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        subtotal: item.subtotal,
                    })),
                    subtotal: subtotal,
                    shippingFee: 0,
                    tax: 0,
                    discount: 0,
                    total: subtotal,
                    paymentMethod: body.paymentMethod,
                    locale,
                }).catch((error) => {
                    console.error('Failed to send order confirmation email:', error);
                    // Don't throw - email failure shouldn't break order creation
                });
            }
        } catch (emailError) {
            // Catch any synchronous errors (e.g., JSON file reading)
            console.error('Error setting up order confirmation email:', emailError);
            // Continue - don't break checkout
        }

        // Return success with order code
        return NextResponse.json({
            success: true,
            orderCode: order.order_number,
            orderId: order.id,
        });
    } catch (error) {
        console.error('Order creation error:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

