/**
 * One-shot sweeper for e2e noise rows in Supabase.
 *
 * Deletes ONLY rows carrying known e2e markers — seed and real data are
 * never matched:
 *  - profiles with display_name starting "E2E " (full cascade: messages,
 *    inquiries, chat links, orphan chats, auth user)
 *  - messages/inquiries containing inquiry-/chat-e2e-/chat-dup-/chat-last-/
 *    roundtrip- markers
 *
 * Usage:  bun e2e/cleanup-noise.ts   (reads .env.local for Supabase keys)
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { deleteTestProfileByPhone, deleteMessagesByText } from './db'

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
if (!URL || !SERVICE_ROLE) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (put them in .env.local).')
  process.exit(1)
}
const supa = createClient(URL, SERVICE_ROLE, { auth: { persistSession: false } })

const MESSAGE_PATTERNS = ['inquiry-%', 'chat-e2e-%', 'chat-dup-%', 'chat-last-%', 'roundtrip-%']

async function main() {
  let profiles = 0
  const { data: e2eProfiles } = await supa
    .from('profiles')
    .select('phone_number')
    .ilike('display_name', 'E2E %')
  for (const row of (e2eProfiles ?? []) as { phone_number: string }[]) {
    if (await deleteTestProfileByPhone(row.phone_number)) profiles++
  }
  console.log(`deleted ${profiles} E2E test profiles (cascade)`)

  let messages = 0
  for (const pattern of MESSAGE_PATTERNS) {
    const { data } = await supa.from('messages').select('id').like('text', `%${pattern}%`)
    const ids = ((data ?? []) as { id: string }[]).map((r) => r.id)
    if (ids.length > 0) {
      await supa.from('messages').delete().in('id', ids)
      messages += ids.length
    }
    // Marker text without % wildcards for the shared helper (no-op if none).
    messages += await deleteMessagesByText(pattern.replace(/%/g, ''))
  }
  console.log(`deleted ${messages} E2E marker messages`)

  let inquiries = 0
  for (const pattern of MESSAGE_PATTERNS) {
    const { data } = await supa.from('inquiries').select('id').like('message', `%${pattern}%`)
    const ids = ((data ?? []) as { id: string }[]).map((r) => r.id)
    for (const id of ids) {
      await supa.from('messages').delete().eq('inquiry_id', id)
    }
    if (ids.length > 0) {
      await supa.from('inquiries').delete().in('id', ids)
      inquiries += ids.length
    }
  }
  console.log(`deleted ${inquiries} E2E marker inquiries`)
}

main().then(
  () => console.log('cleanup done'),
  (e) => {
    console.error('cleanup failed:', e?.message ?? e)
    process.exit(1)
  },
)
