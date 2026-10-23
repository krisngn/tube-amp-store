import { requireAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/service';
import MessagesTable from './MessagesTable';

export const dynamic = 'force-dynamic';

export default async function AdminMessagesPage() {
    await requireAdmin();

    const supabase = createServiceClient();

    const { data: messages, error } = await supabase
        .from('consultation_messages')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[AdminMessagesPage] Error fetching messages:', error);
    }

    return <MessagesTable messages={messages || []} />;
}
