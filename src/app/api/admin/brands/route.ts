import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { adminListBrands, adminCreateBrand } from '@/lib/repositories/admin/brands';

/**
 * GET  /api/admin/brands  - list all brands
 * POST /api/admin/brands  - create a brand
 */
export async function GET() {
    const user = await getAdminUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const brands = await adminListBrands();
        return NextResponse.json({ brands });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to list brands' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const user = await getAdminUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        if (!body.slug || !body.name) {
            return NextResponse.json({ error: 'slug and name are required' }, { status: 400 });
        }
        const id = await adminCreateBrand(body);
        return NextResponse.json({ success: true, id });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create brand' },
            { status: 500 }
        );
    }
}
