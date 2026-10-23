import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, phone, message } = body;

        if (!phone) {
            return NextResponse.json({ error: 'Số điện thoại là bắt buộc' }, { status: 400 });
        }

        const supabase = await createClient();

        const { error } = await supabase.from('consultation_messages').insert([
            {
                name: name || null,
                phone: phone.trim(),
                message: message || null,
                created_at: new Date().toISOString(),
                is_read: false,
            },
        ]);

        if (error) {
            console.error('[POST /api/messages] Supabase error:', error);
            return NextResponse.json({ error: 'Không thể lưu tin nhắn' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[POST /api/messages] Unexpected error:', err);
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}
