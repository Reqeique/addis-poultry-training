import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { getProfileByPhone, getInquiryByTrainee, getMessageByInquiry, getChat } from './db';
import { settle } from './helpers';

const TRAINEE_PHONE = process.env.TRAINEE_PHONE || '+251922334455';
const TRAINE_URL = process.env.BASE_URL || 'http://localhost:3002';
const PIXEL = path.resolve(__dirname, 'fixtures', 'pixel.png');

async function goTraineeInquiry(page: Page) {
  await page.goto(`${TRAINE_URL}/trainee`);
  await expect(page.getByRole('heading', { name: 'How can we help?' })).toBeVisible({
    timeout: 20000,
  });
  await settle(page);
}

test.describe('inquiry flow (UI ↔ Supabase)', () => {
  test.beforeEach(async () => {
    test.setTimeout(60_000);
    test.skip(test.info().project.name !== 'trainee', 'trainee-only spec');
  });

  test('B1 sends a text inquiry and persists it to the DB', async ({ page }) => {
    await goTraineeInquiry(page);

    const trainee = await getProfileByPhone(TRAINEE_PHONE);
    const marker = `inquiry-${Date.now()}`;

    await page.getByRole('button', { name: 'High' }).click();
    await page
      .getByPlaceholder('Describe your question or issue in detail...')
      .fill(`High priority question ${marker}`);
    await page.getByRole('button', { name: 'Send to Trainer' }).click();

    await expect(page.getByText('Sent Successfully!')).toBeVisible({ timeout: 10000 });

    const inquiry = await getInquiryByTrainee(trainee.id, `High priority question ${marker}`);
    expect(inquiry, 'inquiry row created in DB').toBeTruthy();
    expect(inquiry!.urgency).toBe('High');
    expect(inquiry!.status).toBe('pending');
  });

  test('B2 attaches an image and the base64 image is stored on the inquiry', async ({ page }) => {
    await goTraineeInquiry(page);

    const trainee = await getProfileByPhone(TRAINEE_PHONE);
    const marker = `inquiry-img-${Date.now()}`;

    // Gallery file input (camera is nth(0), gallery nth(1)) — images are stored as base64, no R2 needed.
    await page.locator('input[type=file][accept="image/*"]').nth(1).setInputFiles(PIXEL);
    await expect(page.getByRole('img').first()).toBeVisible({ timeout: 10000 });

    await page
      .getByPlaceholder('Describe your question or issue in detail...')
      .fill(`With attachment ${marker}`);
    await page.getByRole('button', { name: 'Send to Trainer' }).click();

    await expect(page.getByText('Sent Successfully!')).toBeVisible({ timeout: 10000 });

    const inquiry = await getInquiryByTrainee(trainee.id, `With attachment ${marker}`);
    expect(inquiry, 'inquiry row created in DB').toBeTruthy();
    expect(inquiry!.image, 'image stored as base64 data URI').toMatch(/^data:image\//);
  });

  test('C1 sending an inquiry also drops a message in the trainer chat (DB cross-check)', async ({
    page,
  }) => {
    await goTraineeInquiry(page);

    const trainee = await getProfileByPhone(TRAINEE_PHONE);
    const marker = `inquiry-msg-${Date.now()}`;

    await page
      .getByPlaceholder('Describe your question or issue in detail...')
      .fill(`Chat message ${marker}`);
    await page.getByRole('button', { name: 'Send to Trainer' }).click();

    await expect(page.getByText('Sent Successfully!')).toBeVisible({ timeout: 10000 });

    const inquiry = await getInquiryByTrainee(trainee.id, `Chat message ${marker}`);
    expect(inquiry, 'inquiry row created').toBeTruthy();

    const msg = await getMessageByInquiry(inquiry!.id);
    expect(msg, 'message row linked to inquiry in trainer chat').toBeTruthy();
    expect(msg!.inquiry_id).toBe(inquiry!.id);

    const chat = await getChat(msg!.chat_id);
    expect(chat, 'chat exists and last_message reflects the inquiry').toBeTruthy();
    expect(chat!.last_message || '').toContain('Chat message');
  });
});
