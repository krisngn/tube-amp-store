import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { adminUpdateProduct, adminDeleteProduct } from '@/lib/repositories/admin/products';

/**
 * PUT /api/admin/products/[id]
 * Update an existing product
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAdminUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        await adminUpdateProduct({ ...body, id });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating product:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to update product',
            },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/products/[id]
 * Hard-delete a product (and its images/translations).
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getAdminUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { id } = await params;
        await adminDeleteProduct(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete product' },
            { status: 500 }
        );
    }
}

