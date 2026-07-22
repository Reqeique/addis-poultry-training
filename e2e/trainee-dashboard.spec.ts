import { test, expect } from '@playwright/test'
import { waitForTraineeDashboard } from './helpers'

test.describe('Trainee dashboard', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(test.info().project.name !== 'trainee', 'trainee-only spec')
    await page.goto('/trainee')
    await waitForTraineeDashboard(page)
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

  test('B3. "Send to Trainer" stays disabled until a message is typed', async ({ page }) => {
    const send = page.getByRole('button', { name: 'Send to Trainer' })
    await expect(send).toBeDisabled()
    await page
      .getByRole('textbox', { name: 'Describe your question or issue in detail...' })
      .fill('My broilers stopped eating')
    await expect(send, 'send button enables after message entry').toBeEnabled()
  })

  test('B4. bottom nav routes to the profile page', async ({ page }) => {
    const profileLink = page.getByRole('link', { name: 'PROFILE' })
    await profileLink.scrollIntoViewIfNeeded()
    await profileLink.click()
    await expect(page).toHaveURL(/\/trainee\/profile$/, { timeout: 15_000 })
  })
})
