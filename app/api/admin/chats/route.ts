import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentServerProfile } from '@/lib/server-profile';

export const dynamic = 'force-dynamic';

// CEO: list all chat sessions with participants + last message preview.
// Uses service-role so admin can see sessions they are not a participant in.
export async function GET() {
  const { profile: adminProfile } = await getCurrentServerProfile();
  if (!adminProfile || !adminProfile.is_active || adminProfile.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: chats, error: chatsError } = await admin
    .from('chats')
    .select('id, last_message, last_message_time, created_at')
    .order('last_message_time', { ascending: false, nullsFirst: false })
    .limit(50);

  if (chatsError) return NextResponse.json({ error: chatsError.message }, { status: 400 });
  const chatIds = (chats ?? []).map((c) => c.id);
  if (chatIds.length === 0) return NextResponse.json({ chats: [] });

  const [{ data: parts }, { data: profiles }] = await Promise.all([
    admin.from('chat_participants').select('chat_id, user_id').in('chat_id', chatIds),
    admin.from('profiles').select('id, display_name, role, phone_number').limit(2000),
  ]);

  const nameById = new Map(
    ((profiles ?? []) as { id: string; display_name: string; role: string; phone_number: string }[]).map(
      (p) => [p.id, p],
    ),
  );
  const partsByChat = new Map<string, string[]>();
  for (const p of (parts ?? []) as { chat_id: string; user_id: string }[]) {
    const list = partsByChat.get(p.chat_id) ?? [];
    list.push(p.user_id);
    partsByChat.set(p.chat_id, list);
  }

  const out = (chats ?? []).map((c) => {
    const memberIds = partsByChat.get(c.id) ?? [];
    const members = memberIds.map((id) => ({
      id,
      display_name: nameById.get(id)?.display_name ?? 'Unknown',
      role: nameById.get(id)?.role ?? 'unknown',
      phone_number: nameById.get(id)?.phone_number ?? '',
    }));
    return {
      chat_id: c.id,
      last_message: c.last_message ?? null,
      last_message_time: c.last_message_time ?? c.created_at ?? null,
      members,
      title: members.map((m) => m.display_name).join(' ↔ ') || 'Chat session',
    };
  });

  return NextResponse.json({ chats: out });
}
