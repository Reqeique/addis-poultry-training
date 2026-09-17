import type { Page } from '@playwright/test'

export const APP_URL = process.env.E2E_BASE_URL || 'http://localhost:3007'

// Pause after a page settles so recorded videos aren't a blur of instant clicks.
export const PAGE_SETTLE_MS = 1000

/** Brief pause once the page is interactive, to keep the video watchable. */
export async function settle(page: Page) {
  await page.waitForTimeout(PAGE_SETTLE_MS)
}

/**
 * Wait until the app shell is ready. The AuthProvider shows a spinner while
 * resolving the session; we gate on a role-specific dashboard heading so the
 * test does not race the auth redirect.
 */
export async function waitForTrainerDashboard(page: Page) {
  await page.getByRole('heading', { name: /Hi,|Supervisor Dashboard/ }).first().waitFor({ timeout: 30_000 })
  await settle(page)
}

export async function waitForTraineeDashboard(page: Page) {
  await page.getByRole('heading', { name: /Hi,|How can we help|እንዴት/ }).first().waitFor({ timeout: 30_000 })
  await settle(page)
}

/** Farmer (trainee) UI defaults to Amharic — switch to English for English assertions. */
export async function switchToEnglish(page: Page) {
  const heading = page.getByRole('heading', { name: 'How can we help?' })
  if (await heading.isVisible().catch(() => false)) return
  await page.getByRole('button', { name: 'Toggle language' }).click()
  await heading.waitFor({ timeout: 15_000 })
}

/** Random-but-stable marker for unique test data. */
export function uniqueMarker(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
