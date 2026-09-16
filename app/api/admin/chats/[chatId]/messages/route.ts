import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentServerProfile } from '@/lib/server-profile';

export const dynamic = 'force-dynamic';

// CEO: read-only full history for one chat session.
export async function GET(_req: Request, ctx: { params: Promise<{ chatId: string }> }) {
  const { profile: adminProfile } = await getCurrentServerProfile();
  if (!adminProfile || !adminProfile.is_active || adminProfile.role !== 'admin') {
    return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
  }
  const { chatId } = await ctx.params;
  if (!chatId) return NextResponse.json({ error: 'chatId required.' }, { status: 400 });

  const admin = createAdminClient();
  const { data: messages, error } = await admin
    .from('messages')
    .select('id, sender_id, text, image_url, audio_url, inquiry_id, inquiry_urgency, created_at')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const senderIds = [...new Set((messages ?? []).map((m) => m.sender_id))];
  let names = new Map<string, string>();
  if (senderIds.length > 0) {
    const { data: profiles } = await admin.from('profiles').select('id, display_name').in('id', senderIds);
    names = new Map(((profiles ?? []) as { id: string; display_name: string }[]).map((p) => [p.id, p.display_name]));
  }

  return NextResponse.json({
    messages: (messages ?? []).map((m) => ({ ...m, sender_name: names.get(m.sender_id) ?? 'Unknown' })),
  });
}
