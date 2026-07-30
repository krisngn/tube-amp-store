import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/service';
import { validateImageFile } from '@/lib/utils/images';
import { v4 as uuidv4 } from 'uuid';

const BUCKET = 'product-images';

/**
 * POST /api/admin/upload
 * Generic admin image upload (used for category/brand images).
 * multipart/form-data: `file` (image), optional `folder` (default "taxonomy").
 * Returns { url, path }.
 */
export async function POST(request: NextRequest) {
    const user = await getAdminUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const form = await request.formData();
        const file = form.get('file');
        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: 'Thiếu file' }, { status: 400 });
        }
        const validation = validateImageFile(file);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        const folder = ((form.get('folder') as string) || 'taxonomy').replace(/[^a-z0-9/_-]/gi, '');
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${folder}/${uuidv4()}.${ext}`;

        const sb = createServiceClient();
        const buffer = await file.arrayBuffer();
        const { error } = await sb.storage.from(BUCKET).upload(path, buffer, {
            contentType: file.type,
            upsert: false,
        });
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
        return NextResponse.json({ url: data.publicUrl, path });
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : 'Upload failed' },
            { status: 500 }
        );
    }
}
