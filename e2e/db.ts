import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'

// Self-contained: load Supabase keys from .env.local so specs can assert UI ↔
// live Supabase data even when the Playwright config doesn't inject env.
function loadEnvLocal() {
  const path = '.env.local'
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnvLocal()

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

function admin() {
  if (!URL || !SERVICE_ROLE) {
    throw new Error(
      'Supabase env missing for e2e. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (loaded from .env.local by playwright.config.ts).',
    )
  }
  return createClient(URL, SERVICE_ROLE, { auth: { persistSession: false } })
}

/** Count chat_participants rows shared between two users (the pair's chats). */
export async function countSharedChats(userA: string, userB: string) {
  // Any chat that has both users as participants.
  const { data } = await admin()
    .from('chat_participants')
    .select('chat_id')
    .in('user_id', [userA, userB])
  const byChat = new Map<string, number>()
  for (const row of data ?? []) {
    byChat.set(row.chat_id, (byChat.get(row.chat_id) ?? 0) + 1)
  }
  let shared = 0
  for (const n of byChat.values()) if (n === 2) shared++
  return shared
}

export async function getMessageByText(textMarker: string) {
  const { data } = await admin()
    .from('messages')
    .select('id, chat_id, sender_id, text, image_url, audio_url, created_at')
    .like('text', `%${textMarker}%`)
    .order('created_at', { ascending: false })
    .limit(1)
  return data?.[0] ?? null
}

export async function getChat(id: string) {
  const { data } = await admin().from('chats').select('*').eq('id', id).maybeSingle()
  return data
}

/** Find the chat_id for a pair (reused by the app via limit(1)). */
export async function findPairChat(userA: string, userB: string) {
  const { data } = await admin()
    .from('chat_participants')
    .select('chat_id')
    .eq('user_id', userA)
  const my = (data ?? []).map((r) => r.chat_id)
  const { data: theirs } = await admin()
    .from('chat_participants')
    .select('chat_id')
    .eq('user_id', userB)
    .in('chat_id', my)
    .limit(1)
    .maybeSingle()
  return theirs?.chat_id ?? null
}

export async function getInquiryByTrainee(traineeId: string, marker: string) {
  const { data } = await admin()
    .from('inquiries')
    .select('id, trainee_id, message, urgency, status, image, created_at')
    .eq('trainee_id', traineeId)
    .like('message', `%${marker}%`)
    .order('created_at', { ascending: false })
    .limit(1)
  return data?.[0] ?? null
}

export async function getMessageByInquiry(inquiryId: string) {
  const { data } = await admin()
    .from('messages')
    .select('id, chat_id, sender_id, text, image_url, audio_url, inquiry_id, created_at')
    .eq('inquiry_id', inquiryId)
    .order('created_at', { ascending: false })
    .limit(1)
  return data?.[0] ?? null
}

export async function getProfileByPhone(phone: string) {
  const { data } = await admin()
    .from('profiles')
    .select('id, display_name, role')
    .eq('phone_number', phone)
    .maybeSingle()
  return data
}

export async function countTraineesForTrainer(trainerId: string) {
  const { count } = await admin()
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'trainee')
    .eq('assigned_trainer_id', trainerId)
  return count ?? 0
}

/** Live display names of trainees assigned to a trainer (no hardcoded names). */
export async function listTraineesForTrainer(trainerId: string) {
  const { data } = await admin()
    .from('profiles')
    .select('id, display_name')
    .eq('role', 'trainee')
    .eq('assigned_trainer_id', trainerId)
    .order('display_name')
  return data ?? []
}

/** Delete chat messages whose text contains the marker. Returns deleted count. */
export async function deleteMessagesByText(textMarker: string) {
  const { data } = await admin().from('messages').select('id').like('text', `%${textMarker}%`)
  const ids = (data ?? []).map((r) => r.id)
  if (ids.length === 0) return 0
  await admin().from('messages').delete().in('id', ids)
  return ids.length
}

/** Delete inquiries (by trainee + marker) plus their linked chat messages. */
export async function deleteInquiriesByMarker(traineeId: string, marker: string) {
  const { data } = await admin()
    .from('inquiries')
    .select('id')
    .eq('trainee_id', traineeId)
    .like('message', `%${marker}%`)
  const ids = (data ?? []).map((r) => r.id)
  for (const id of ids) {
    await admin().from('messages').delete().eq('inquiry_id', id)
  }
  // The mirrored chat text carries the same marker ([High] prefix, etc.).
  await deleteMessagesByText(marker)
  if (ids.length > 0) await admin().from('inquiries').delete().in('id', ids)
  return ids.length
}

/**
 * Fully remove a test profile and everything it created: sent messages,
 * inquiries (as trainee or trainer), chat links, chats left with no
 * participants, and the auth user. Leaves seed/real data untouched.
 */
export async function deleteTestProfileByPhone(phone: string) {
  const client = admin()
  const { data: profile } = await client
    .from('profiles')
    .select('id, auth_user_id')
    .eq('phone_number', phone)
    .maybeSingle()
  if (!profile) return false
  const pid = (profile as { id: string }).id

  await client.from('messages').delete().eq('sender_id', pid)
  await client.from('inquiries').delete().eq('trainee_id', pid)
  await client.from('inquiries').delete().eq('trainer_id', pid)
  // Farmers pointing at this profile must be unassigned before it goes.
  await client.from('profiles').update({ assigned_trainer_id: null }).eq('assigned_trainer_id', pid)

  const { data: parts } = await client.from('chat_participants').select('chat_id').eq('user_id', pid)
  const chatIds = [...new Set((parts ?? []).map((r) => r.chat_id))]
  await client.from('chat_participants').delete().eq('user_id', pid)
  for (const cid of chatIds) {
    const { count } = await client
      .from('chat_participants')
      .select('*', { count: 'exact', head: true })
      .eq('chat_id', cid)
    if ((count ?? 0) === 0) await client.from('chats').delete().eq('id', cid)
  }

  await client.from('profiles').delete().eq('id', pid)

  const authId = (profile as { auth_user_id: string | null }).auth_user_id
  if (authId) {
    try {
      await client.auth.admin.deleteUser(authId)
    } catch {
      // Auth row already gone — profile cleanup above is what matters.
    }
  }
  return true
}
