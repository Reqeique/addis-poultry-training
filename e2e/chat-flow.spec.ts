import { test, expect, type Page } from '@playwright/test'
import { waitForTrainerDashboard, uniqueMarker, APP_URL, settle } from './helpers'
import {
  getProfileByPhone,
  getMessageByText,
  getChat,
  countSharedChats,
  findPairChat,
  deleteMessagesByText,
} from './db'

const TRAINER_PHONE = '+251911223344'
// Seed phone of a pre-existing trainee the trainer can chat with (not the login trainee).
// The id + display name are resolved live from Supabase — never hardcoded.
const PEER_TRAINEE_PHONE = '+251933445566'

async function getPeer() {
  const peer = await getProfileByPhone(PEER_TRAINEE_PHONE)
  expect(peer, 'peer trainee profile must exist in DB').not.toBeNull()
  return peer!
}

async function openChatWith(page: Page, peerId: string, peerName: string) {
  await page.goto(`/chat?peerId=${peerId}`)
  await page.getByRole('heading', { name: peerName }).waitFor({ timeout: 45_000 })
  await settle(page)
}

test.describe('Chat flow (trainer ↔ trainee)', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60_000)
    test.skip(test.info().project.name !== 'trainer', 'trainer-only spec')
    await page.goto('/trainer')
    await waitForTrainerDashboard(page)
  })

  test('B1. opening a trainee chat shows the peer and a real DB chat', async ({ page }) => {
    const trainer = await getProfileByPhone(TRAINER_PHONE)
    expect(trainer, 'trainer profile must exist in DB').not.toBeNull()
    const peer = await getPeer()

    await openChatWith(page, peer.id, peer.display_name)

    await expect(page.getByRole('heading', { name: peer.display_name })).toBeVisible()
    const chatId = await findPairChat(trainer!.id, peer.id)
    expect(chatId, `a chat between trainer and ${peer.display_name} must already exist in DB`).not.toBeNull()
  })

  test('B2. sending a text message persists the row in Supabase', async ({ page }) => {
    const trainer = await getProfileByPhone(TRAINER_PHONE)
    const marker = uniqueMarker('chat-e2e')
    const peer = await getPeer()

    try {
    await openChatWith(page, peer.id, peer.display_name)

    await page.getByRole('textbox', { name: 'Message...' }).fill(marker)
    await page.locator('form button[type="submit"]').click()

    await expect(page.getByText(marker, { exact: true })).toBeVisible({ timeout: 15_000 })

    const row = await getMessageByText(marker)
    expect(row, 'message must be persisted to the messages table').not.toBeNull()
    expect(row!.sender_id).toBe(trainer!.id)
    expect(row!.text).toContain(marker)
    } finally {
      // No e2e noise left behind.
      await deleteMessagesByText(marker)
    }
  })

  test('C1. regression — opening/sending reuses the existing chat (no duplicate chat created)', async ({
    page,
  }) => {
    const trainer = await getProfileByPhone(TRAINER_PHONE)
    const peer = await getPeer()
    const before = await countSharedChats(trainer!.id, peer.id)

    const marker = uniqueMarker('chat-dup')
    try {
    await openChatWith(page, peer.id, peer.display_name)
    await page.getByRole('textbox', { name: 'Message...' }).fill(marker)
    await page.locator('form button[type="submit"]').click()
    await expect(page.getByText(marker, { exact: true })).toBeVisible({ timeout: 15_000 })

    const after = await countSharedChats(trainer!.id, peer.id)
    expect(after, 'sending a message must NOT create a new chat for the pair').toBe(before)
    } finally {
      // No e2e noise left behind.
      await deleteMessagesByText(marker)
    }
  })

  test('C2. sending updates chats.last_message in the DB', async ({ page }) => {
    const marker = uniqueMarker('chat-last')
    const peer = await getPeer()

    try {
    await openChatWith(page, peer.id, peer.display_name)
    await page.getByRole('textbox', { name: 'Message...' }).fill(marker)
    await page.locator('form button[type="submit"]').click()
    await expect(page.getByText(marker, { exact: true })).toBeVisible({ timeout: 15_000 })

    const row = await getMessageByText(marker)
    expect(row, 'message row must exist').not.toBeNull()
    const chat = await getChat(row!.chat_id)
    expect(chat?.last_message, 'chat.last_message should reflect the sent text').toContain(marker)
    } finally {
      // No e2e noise left behind.
      await deleteMessagesByText(marker)
    }
  })
})
