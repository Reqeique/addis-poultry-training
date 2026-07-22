import { test, expect, type Page } from '@playwright/test'
import { waitForTrainerDashboard, uniqueMarker, APP_URL, settle } from './helpers'
import {
  getProfileByPhone,
  getMessageByText,
  getChat,
  countSharedChats,
  findPairChat,
} from './db'

const TRAINER_PHONE = '+251911223344'
// Pre-existing trainee in the DB that the trainer can chat with (not the login trainee).
const CHALA_ID = '59fa734a-1ca5-4869-8998-62c36c210aff'

async function openChatWith(page: Page, peerId: string) {
  await page.goto(`/chat?peerId=${peerId}`)
  await page.getByRole('heading', { name: 'Chala Bekele' }).waitFor({ timeout: 45_000 })
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

    await openChatWith(page, CHALA_ID)

    await expect(page.getByRole('heading', { name: 'Chala Bekele' })).toBeVisible()
    const chatId = await findPairChat(trainer!.id, CHALA_ID)
    expect(chatId, 'a chat between trainer and Chala must already exist in DB').not.toBeNull()
  })

  test('B2. sending a text message persists the row in Supabase', async ({ page }) => {
    const trainer = await getProfileByPhone(TRAINER_PHONE)
    const marker = uniqueMarker('chat-e2e')

    await openChatWith(page, CHALA_ID)

    await page.getByRole('textbox', { name: 'Message...' }).fill(marker)
    await page.locator('form button[type="submit"]').click()

    await expect(page.getByText(marker, { exact: true })).toBeVisible({ timeout: 15_000 })

    const row = await getMessageByText(marker)
    expect(row, 'message must be persisted to the messages table').not.toBeNull()
    expect(row!.sender_id).toBe(trainer!.id)
    expect(row!.text).toContain(marker)
  })

  test('C1. regression — opening/sending reuses the existing chat (no duplicate chat created)', async ({
    page,
  }) => {
    const trainer = await getProfileByPhone(TRAINER_PHONE)
    const before = await countSharedChats(trainer!.id, CHALA_ID)

    const marker = uniqueMarker('chat-dup')
    await openChatWith(page, CHALA_ID)
    await page.getByRole('textbox', { name: 'Message...' }).fill(marker)
    await page.locator('form button[type="submit"]').click()
    await expect(page.getByText(marker, { exact: true })).toBeVisible({ timeout: 15_000 })

    const after = await countSharedChats(trainer!.id, CHALA_ID)
    expect(after, 'sending a message must NOT create a new chat for the pair').toBe(before)
  })

  test('C2. sending updates chats.last_message in the DB', async ({ page }) => {
    const marker = uniqueMarker('chat-last')

    await openChatWith(page, CHALA_ID)
    await page.getByRole('textbox', { name: 'Message...' }).fill(marker)
    await page.locator('form button[type="submit"]').click()
    await expect(page.getByText(marker, { exact: true })).toBeVisible({ timeout: 15_000 })

    const row = await getMessageByText(marker)
    expect(row, 'message row must exist').not.toBeNull()
    const chat = await getChat(row!.chat_id)
    expect(chat?.last_message, 'chat.last_message should reflect the sent text').toContain(marker)
  })
})
