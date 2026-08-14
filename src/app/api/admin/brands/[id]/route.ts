import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { adminUpdateBrand, adminDeleteBrand } from '@/lib/repositories/admin/brands';

/**
 * PUT    /api/admin/brands/[id]  - update a brand
 * DELETE /api/admin/brands/[id]  - delete a brand (blocked if products reference it)
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAdminUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;
        const body = await request.json();
        await adminUpdateBrand({ ...body, id });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to update brand' },
            { status: 500 }
        );
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAdminUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;
        await adminDeleteBrand(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete brand' },
            { status: 400 }
        );
    }
}
