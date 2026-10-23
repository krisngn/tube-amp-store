import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isAdmin } from '@/lib/admin/auth';

export async function PATCH(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        if (!(await isAdmin())) {
            return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
        }
        const { id } = await params;
        const supabase = createServiceClient();

        const { error } = await supabase
            .from('consultation_messages')
            .update({ is_read: true })
            .eq('id', id);

        if (error) {
            console.error('[PATCH /api/messages/[id]/read] Supabase error:', error);
            return NextResponse.json({ error: 'Không thể cập nhật' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[PATCH /api/messages/[id]/read] Unexpected error:', err);
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}
