import { requireAdmin } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import MessagesTable from './MessagesTable';

export const dynamic = 'force-dynamic';

export default async function AdminMessagesPage() {
    await requireAdmin();

    const supabase = await createClient();

    const { data: messages, error } = await supabase
        .from('consultation_messages')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[AdminMessagesPage] Error fetching messages:', error);
    }

    return <MessagesTable messages={messages || []} />;
}
