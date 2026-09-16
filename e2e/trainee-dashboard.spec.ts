import { test, expect } from '@playwright/test'
import { waitForTraineeDashboard, switchToEnglish } from './helpers'

test.describe('Trainee dashboard', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(test.info().project.name !== 'trainee', 'trainee-only spec')
    await page.goto('/trainee')
    await waitForTraineeDashboard(page)
    await switchToEnglish(page)
  })

  test('B0. Amharic is the default language', async ({ page }) => {
    // Fresh load (no toggle): the farmer dashboard greets in Amharic.
    await page.goto('/trainee')
    await expect(page.getByRole('heading', { name: 'እንዴት ልንረዳዎ እንችላለን?' })).toBeVisible({ timeout: 30_000 })
  })

  test('B1. dashboard greets the signed-in trainee', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Hi,/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'How can we help?' })).toBeVisible()
  })

  test('B2. inquiry form exposes urgency, message and attachment controls', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Normal' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'High' })).toBeVisible()
    await expect(
      page.getByRole('textbox', { name: 'Describe your question or issue in detail...' }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Camera' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Gallery' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Video' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Voice' })).toBeVisible()
  })

  test('B3. "Send to Supervisor" stays disabled until a message is typed', async ({ page }) => {
    const send = page.getByRole('button', { name: 'Send to Supervisor' })
    await expect(send).toBeDisabled()
    await page
      .getByRole('textbox', { name: 'Describe your question or issue in detail...' })
      .fill('My broilers stopped eating')
    await expect(send, 'send button enables after message entry').toBeEnabled()
    // Media-only sends are allowed, but a fully empty form still blocks send.
    await page
      .getByRole('textbox', { name: 'Describe your question or issue in detail...' })
      .fill('')
    await expect(send, 'send button disables again when message cleared with no media').toBeDisabled()
  })

  test('B4. bottom nav routes to the profile page', async ({ page }) => {
    const profileTab = page.getByRole('tab', { name: 'PROFILE' })
    await profileTab.scrollIntoViewIfNeeded()
    await profileTab.click()
    await expect(page).toHaveURL(/\/trainee\/profile$/, { timeout: 15_000 })
  })

  test('B5. farmer chat sessions section renders', async ({ page }) => {
    const sessions = page.getByTestId('farmer-sessions')
    await sessions.scrollIntoViewIfNeeded()
    await expect(sessions).toBeVisible()
    // Either existing sessions or the empty state — both prove the section works.
    await expect(
      page.getByTestId('farmer-session').first().or(page.getByText('No chat sessions yet')),
    ).toBeVisible({ timeout: 20_000 })
  })
})
