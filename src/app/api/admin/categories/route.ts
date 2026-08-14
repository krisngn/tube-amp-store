import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { adminListCategories, adminCreateCategory } from '@/lib/repositories/admin/categories';

/**
 * GET  /api/admin/categories  - list all categories (flat, parent-ordered)
 * POST /api/admin/categories  - create a category
 */
export async function GET() {
    const user = await getAdminUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const categories = await adminListCategories();
        return NextResponse.json({ categories });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to list categories' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const user = await getAdminUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        if (!body.slug || !body.nameVi) {
            return NextResponse.json({ error: 'slug and nameVi are required' }, { status: 400 });
        }
        const id = await adminCreateCategory(body);
        return NextResponse.json({ success: true, id });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create category' },
            { status: 500 }
        );
    }
}
