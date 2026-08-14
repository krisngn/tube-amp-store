import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { exportCsv, templateCsv, emptyTemplateCsv, type Entity } from '@/lib/import-export/service';

const ENTITIES: Entity[] = ['products', 'categories', 'brands'];

/**
 * GET /api/admin/export/[entity]            -> full data as CSV
 * GET /api/admin/export/[entity]?template=1  -> template with example rows
 * GET /api/admin/export/[entity]?empty=1     -> blank template (headers only)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
    const user = await getAdminUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { entity } = await params;
    if (!ENTITIES.includes(entity as Entity)) {
        return NextResponse.json({ error: 'Unknown entity' }, { status: 400 });
    }

    const sp = request.nextUrl.searchParams;
    const mode = sp.get('empty') === '1' ? 'empty' : sp.get('template') === '1' ? 'template' : 'full';
    try {
        let csv: string;
        let filename: string;
        if (mode === 'empty') {
            csv = emptyTemplateCsv(entity as Entity);
            filename = `${entity}-blank.csv`;
        } else if (mode === 'template') {
            csv = templateCsv(entity as Entity);
            filename = `${entity}-template.csv`;
        } else {
            csv = await exportCsv(entity as Entity);
            filename = `${entity}.csv`;
        }
        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Export failed' },
            { status: 500 }
        );
    }
}
