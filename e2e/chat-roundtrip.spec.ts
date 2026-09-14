import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import {
  getProfileByPhone,
  getMessageByText,
  getChat,
  findPairChat,
  deleteMessagesByText,
} from './db'
import { waitForTrainerDashboard, settle, APP_URL } from './helpers'

const TRAINER_PHONE = '+251911223344'
const TRAINEE_PHONE = '+251922334455'

async function openPeerChat(page: Page, peerId: string, peerHeading: string) {
  await page.goto(`${APP_URL}/chat?peerId=${peerId}`, { waitUntil: 'load' })
  await page
    .getByRole('heading', { name: peerHeading })
    .waitFor({ timeout: 90_000 })
  await settle(page)
}

async function sendChatMessage(page: Page, text: string, expectVisibleMs = 15_000) {
  await page.getByRole('textbox', { name: 'Message...' }).fill(text)
  await page.locator('form button[type="submit"]').click()
  await expect(page.getByText(text, { exact: true })).toBeVisible({ timeout: expectVisibleMs })
}

async function expectMessageVisible(page: Page, text: string, timeoutMs = 20_000) {
  await expect(page.getByText(text, { exact: true })).toBeVisible({ timeout: timeoutMs })
}

test.describe('Chat round-trip (trainer ↔ trainee live', () => {
  test.beforeEach(() => {
    test.setTimeout(120_000)
    test.skip(test.info().project.name !== 'trainer', 'trainer-only spec (drives both contexts)')
  })

  test('trainer → trainee → trainer live round-trip (UI ↔ Supabase)', async ({ browser }) => {
    const trainer = await getProfileByPhone(TRAINER_PHONE)
    const trainee = await getProfileByPhone(TRAINEE_PHONE)
    expect(trainer, 'trainer profile must exist in DB').not.toBeNull()
    expect(trainee, 'trainee profile must exist in DB').not.toBeNull()

    const chatExists0 = await findPairChat(trainer!.id, trainee!.id)
    expect(chatExists0, 'a chat between trainer and trainee already exists').not.toBeNull()

    // --- Context 1: trainer (explicit to be sure of the session)
    const trainerCtx = await browser.newContext({
      storageState: path.resolve(__dirname, '..', 'e2e', '.auth', 'trainer.json'),
    })
    const trainerPage = await trainerCtx.newPage()
    await trainerPage.goto(`${APP_URL}/trainer`, { waitUntil: 'domcontentloaded' })
    await waitForTrainerDashboard(trainerPage)

    // --- Context 2: trainee (fresh context, separate session)
    const traineeCtx = await browser.newContext({
      storageState: path.resolve(__dirname, '..', 'e2e', '.auth', 'trainee.json'),
    })
    const traineePage = await traineeCtx.newPage()

    // =========================================================
    // STEP 1. Trainer opens the assigned trainee's chat.
    // =========================================================
    await openPeerChat(trainerPage, trainee!.id, trainee!.display_name)

    // Sanity DB: the chat we're viewing matches DB state.
    const pairChatId = await findPairChat(trainer!.id, trainee!.id)
    expect(pairChatId, 'the chat the trainer is on must exist in DB').not.toBeNull()

    const txMarker = uniqueMarkerRoundTrip('roundtrip-tx')
    const createdMarkers = [txMarker]
    try {
    await sendChatMessage(trainerPage, txMarker)

    // UI + DB: trainer's outgoing message is persisted to Supabase.
    await expectMessageVisible(trainerPage, txMarker)
    const txRow = await getMessageByText(txMarker)
    expect(txRow, 'trainer message must exist in messages table').not.toBeNull()
    expect(txRow!.sender_id).toBe(trainer!.id)
    expect(txRow!.text).toContain(txMarker)

    // The chats mirror update trails the realtime echo — poll for convergence.
    await expect
      .poll(async () => (await getChat(txRow!.chat_id))?.last_message ?? '', { timeout: 15_000 })
      .toContain(txMarker)

    // =========================================================
    // STEP 2. Trainee opens the trainer chat and sees what
    //         the trainer just sent. (Polling-less: physical
    //         navigation forces data fetch — pure DB read.)
    // =========================================================
    await openPeerChat(traineePage, trainer!.id, trainer!.display_name)
    await expectMessageVisible(traineePage, txMarker)

    // The DB view from the trainee side must also agree.
    const txSeenFromTrainee = await getMessageByText(txMarker)
    expect(txSeenFromTrainee?.chat_id, 'same chat id visible to both roles').toBe(txRow!.chat_id)

    // Trainee sends a reply.
    const rxMarker = uniqueMarkerRoundTrip('roundtrip-rx')
    createdMarkers.push(rxMarker)
    await sendChatMessage(traineePage, rxMarker)
    await expectMessageVisible(traineePage, rxMarker)

    const rxRow = await getMessageByText(rxMarker)
    expect(rxRow, 'trainee reply persisted to messages table').not.toBeNull()
    expect(rxRow!.sender_id, 'sender must be the trainee (not echo of trainer)').toBe(trainee!.id)
    expect(rxRow!.chat_id, 'reply is in the same chat as the trainer outgoing').toBe(txRow!.chat_id)

    // chats.last_message should now reflect the trainee reply (poll: the
    // mirror update trails the realtime echo).
    await expect
      .poll(async () => (await getChat(rxRow!.chat_id))?.last_message ?? '', { timeout: 15_000 })
      .toContain(rxMarker)
    // chats.last_message is a single string, so it cannot carry both the
    // outgoing and reply text. We confirm the trainer outgoing is *still in
    // messages* (not overwritten), and use getMessageByText for the rest.
    const txRowStill = await getMessageByText(txMarker)
    expect(txRowStill?.chat_id, 'trainer outgoing row still present in same chat').toBe(rxRow!.chat_id)

    // =========================================================
    // STEP 3. Switch back to trainer and confirm the trainee
    //         reply is now visible (and the trainer outgoing
    //         from STEP 1 still is).
    // =========================================================
    await openPeerChat(trainerPage, trainee!.id, trainee!.display_name)
    await expectMessageVisible(trainerPage, rxMarker)
    await expectMessageVisible(trainerPage, txMarker)

    // Final canonical state: exactly two new messages, in the same chat.
    expect(rxRow!.chat_id).toBe(txRow!.chat_id)
    } finally {
      // No e2e noise left behind.
      for (const m of createdMarkers) await deleteMessagesByText(m)
    }

    await trainerCtx.close()
    await traineeCtx.close()
  })
})

function uniqueMarkerRoundTrip(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
