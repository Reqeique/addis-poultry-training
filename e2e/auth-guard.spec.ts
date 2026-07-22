import { test, expect } from '@playwright/test'
import { settle } from './helpers'

// Drop the project's persisted session so the default `page` fixture starts
// unauthenticated — this is the real auth-guard scenario.
test.use({ storageState: 'e2e/.auth/empty.json' })

test.describe('Auth guard (unauthenticated)', () => {
  // Run once is enough for the guard; pin to the trainer project to avoid
  // duplicating these slow redirect tests across both role projects.
  const onlyTrainer = () => test.skip(test.info().project.name !== 'trainer', 'trainer-pinned')

  test('A1. visiting /trainer while logged out shows the login form', async ({ page }) => {
    onlyTrainer()
    await page.goto('/trainer')
    await expect(
      page.getByRole('textbox', { name: 'Phone number (e.g. +251...)' }),
      'login form should be shown when unauthenticated',
    ).toBeVisible({ timeout: 25_000 })
    await settle(page)
  })

  test('A2. visiting /trainee while logged out shows the login form', async ({ page }) => {
    onlyTrainer()
    await page.goto('/trainee')
    await expect(
      page.getByRole('textbox', { name: 'Phone number (e.g. +251...)' }),
    ).toBeVisible({ timeout: 25_000 })
    await settle(page)
  })
})
