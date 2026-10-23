import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, phone, message, email, topic } = body ?? {};
        if (typeof phone !== 'string' || !/^\+?[\d\s().-]{8,30}$/.test(phone.trim()) ||
            typeof message !== 'string' || !message.trim() || message.length > 5000 ||
            (name != null && (typeof name !== 'string' || name.length > 100)) ||
            (email != null && (typeof email !== 'string' || email.length > 254 ||
                (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())))) ||
            (topic != null && (typeof topic !== 'string' || topic.length > 100))) {
            return NextResponse.json({ error: 'Vui lòng kiểm tra thông tin liên hệ và lời nhắn' }, { status: 400 });
        }

        const topics: Record<string, string> = {
            'tu-van': 'Tư vấn sản phẩm', 'don-hang': 'Đơn hàng / Giao hàng',
            'ky-thuat': 'Hỗ trợ kỹ thuật / Bảo hành', 'khac': 'Khác',
        };
        // Preserve optional contact details in the existing admin message inbox.
        const content = [email?.trim() ? `Email: ${email.trim()}` : '',
            topic ? `Chủ đề: ${topics[topic] || topic}` : '', message.trim()].filter(Boolean).join('\n');

        const supabase = createServiceClient();

        const { error } = await supabase.from('consultation_messages').insert([
            {
                name: name?.trim() || null,
                phone: phone.trim(),
                message: content,
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
