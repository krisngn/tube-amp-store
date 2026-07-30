import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { adminUpdateCategory, adminDeleteCategory } from '@/lib/repositories/admin/categories';

/**
 * PUT    /api/admin/categories/[id]  - update a category
 * DELETE /api/admin/categories/[id]  - delete a category (blocked if it has children or products)
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAdminUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;
        const body = await request.json();

        // Prevent a category from being its own parent
        if (body.parentId && body.parentId === id) {
            return NextResponse.json({ error: 'A category cannot be its own parent' }, { status: 400 });
        }

        await adminUpdateCategory({ ...body, id });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update category' },
            { status: 500 }
        );
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAdminUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;
        await adminDeleteCategory(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete category' },
            { status: 400 }
        );
    }
}
