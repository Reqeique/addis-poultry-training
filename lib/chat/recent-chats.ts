import { createClient } from '@/lib/supabase/client';

export interface RecentChatPeer {
  uid: string;
  displayName: string;
  photoURL: string;
  role: string;
  focusArea: string;
  phoneNumber?: string;
}

export interface RecentChat {
  chatId: string;
  peer: RecentChatPeer | null;
  lastMessage: string | null;
  lastMessageTime: string | null;
}

type SupabaseClient = ReturnType<typeof createClient>;

/** Relative time like "2m", "3h", "Yesterday", "Mar 4". */
export function formatChatTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24 && date.getDate() === now.getDate()) return `${diffHrs}h`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.getDate() === yesterday.getDate() && diffHrs < 48) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function mapPeer(row: any): RecentChatPeer {
  return {
    uid: row.id,
    displayName: row.display_name || 'Unknown',
    photoURL: row.photo_url || '',
    role: row.role || 'trainee',
    focusArea: row.focus_area || '',
    phoneNumber: row.phone_number || '',
  };
}

/**
 * Fetch the trainer's most recent 1:1 chats, newest first.
 * 1. chat_participants for this trainer -> chat ids
 * 2. chats in those ids ordered by last_message_time desc
 * 3. peer = other participant's profile per chat
 */
export async function fetchRecentChats(
  supabase: SupabaseClient,
  trainerId: string,
  limit = 15
): Promise<RecentChat[]> {
  const { data: participations, error: partError } = await supabase
    .from('chat_participants')
    .select('chat_id')
    .eq('user_id', trainerId);

  if (partError) throw new Error(partError.message);
  const chatIds = (participations || []).map((r) => r.chat_id);
  if (chatIds.length === 0) return [];

  const { data: chats, error: chatsError } = await supabase
    .from('chats')
    .select('id, last_message, last_message_time')
    .in('id', chatIds)
    .order('last_message_time', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (chatsError) throw new Error(chatsError.message);
  if (!chats || chats.length === 0) return [];

  const orderedIds = chats.map((c) => c.id);

  // All participants in these chats, then resolve the peer (not the trainer).
  const { data: allParts, error: allPartsError } = await supabase
    .from('chat_participants')
    .select('chat_id, user_id')
    .in('chat_id', orderedIds);

  if (allPartsError) throw new Error(allPartsError.message);

  const peerIdsByChat = new Map<string, string>();
  for (const chatId of orderedIds) {
    const others = (allParts || []).filter(
      (p) => p.chat_id === chatId && p.user_id !== trainerId
    );
    if (others[0]) peerIdsByChat.set(chatId, others[0].user_id);
  }

  const peerIds = [...new Set(peerIdsByChat.values())];
  let peersById = new Map<string, RecentChatPeer>();
  if (peerIds.length > 0) {
    const { data: peerRows, error: peerError } = await supabase
      .from('profiles')
      .select('id, display_name, photo_url, role, focus_area, phone_number')
      .in('id', peerIds);
    if (peerError) throw new Error(peerError.message);
    peersById = new Map((peerRows || []).map((r) => [r.id, mapPeer(r)]));
  }

  return chats.map((c) => ({
    chatId: c.id,
    lastMessage: c.last_message ?? null,
    lastMessageTime: c.last_message_time ?? null,
    peer: peerIdsByChat.get(c.id)
      ? (peersById.get(peerIdsByChat.get(c.id)!) ?? null)
      : null,
  }));
}
