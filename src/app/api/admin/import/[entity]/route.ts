import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { importCsv, type Entity } from '@/lib/import-export/service';

const ENTITIES: Entity[] = ['products', 'categories', 'brands'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Bulk imports can run for a while on larger files.
export const maxDuration = 60;

/**
 * POST /api/admin/import/[entity]
 * multipart/form-data with a `file` (CSV). Upserts by slug; returns
 * { created, updated, errors: [{ row, message }] }.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
    const user = await getAdminUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { entity } = await params;
    if (!ENTITIES.includes(entity as Entity)) {
        return NextResponse.json({ error: 'Unknown entity' }, { status: 400 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: 'Thiếu file CSV' }, { status: 400 });
        }
        if (file.size > MAX_BYTES) {
            return NextResponse.json({ error: 'File quá lớn (tối đa 5MB)' }, { status: 413 });
        }
        const text = await file.text();
        const result = await importCsv(entity as Entity, text);
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Import failed' },
            { status: 500 }
        );
    }
}
