import { test, expect } from '@playwright/test'
import { settle } from './helpers'
import { getProfileByPhone, deleteTestProfileByPhone } from './db'

const ADMIN_PHONE = '+251900000001'

test.describe('CEO dashboard (UI ↔ Supabase)', () => {
  test.beforeEach(async () => {
    test.setTimeout(90_000)
    test.skip(test.info().project.name !== 'admin', 'admin-only spec')
  })

  test('A1. admin sees the dashboard and user stats', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'load' })
    await expect(page.getByRole('heading', { name: /Hi,.*CEO/ })).toBeVisible({ timeout: 60_000 })
    await settle(page)
    // Stats tiles render
    await expect(page.getByText('Supervisors').first()).toBeVisible()
    await expect(page.getByText('Farmers').first()).toBeVisible()
  })

  test('A2. admin registers a new trainee — appears in UI and DB', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'load' })
    await expect(page.getByRole('heading', { name: /Hi,.*CEO/ })).toBeVisible({ timeout: 60_000 })
    await settle(page)

    const marker = `e2e-trainee-${Date.now()}`
    const phone = `+2519${(Date.now() % 100_000_000).toString().padStart(8, '0').slice(-8)}`
    const name = `E2E Trainee ${marker}`

    try {
    await page.getByTestId('admin-toggle-form').click()
    await page.getByTestId('admin-create-form').waitFor({ state: 'visible' })

    await page.getByTestId('admin-role').click()
    await page.getByRole('option', { name: 'Farmer', exact: true }).click()
    await page.getByTestId('admin-displayName').fill(name)
    await page.getByTestId('admin-phone').fill(phone)
    await page.getByTestId('admin-password').fill('Trainee123!')
    await page.getByTestId('admin-focusArea').fill('Broiler')

    await page.getByTestId('admin-submit').click()

    // UI: success closes the form (no error banner) — wait for it to detach
    await expect(page.getByTestId('admin-form-error')).toHaveCount(0, { timeout: 15_000 })
    await expect(page.getByTestId('admin-create-form')).toHaveCount(0, { timeout: 20_000 })

    // UI: the new trainee shows up in the trainee list
    await expect(page.getByTestId('admin-trainee').filter({ hasText: name })).toBeVisible({ timeout: 20_000 })

    // DB: a profile row exists with this phone, role=trainee, and a real auth_user_id
    const profile = await getProfileByPhone(phone)
    expect(profile, 'trainee profile row must exist in DB').not.toBeNull()
    expect(profile!.role).toBe('trainee')
    expect(profile!.id).toBeTruthy()
    } finally {
      // No e2e noise left behind: remove the created user and its rows.
      await deleteTestProfileByPhone(phone)
    }
  })

  test('A3. admin registers a new trainer — appears in UI and DB', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'load' })
    await expect(page.getByRole('heading', { name: /Hi,.*CEO/ })).toBeVisible({ timeout: 60_000 })
    await settle(page)

    const marker = `e2e-trainer-${Date.now()}`
    const phone = `+2518${(Date.now() % 100_000_000).toString().padStart(8, '0').slice(-8)}`
    const name = `E2E Trainer ${marker}`

    try {
    await page.getByTestId('admin-toggle-form').click()
    await page.getByTestId('admin-create-form').waitFor({ state: 'visible' })

    await page.getByTestId('admin-role').click()
    await page.getByRole('option', { name: 'Supervisor', exact: true }).click()
    await page.getByTestId('admin-displayName').fill(name)
    await page.getByTestId('admin-phone').fill(phone)
    await page.getByTestId('admin-password').fill('Trainer123!')

    await page.getByTestId('admin-submit').click()

    await expect(page.getByTestId('admin-form-error')).toHaveCount(0, { timeout: 15_000 })
    await expect(page.getByTestId('admin-create-form')).toHaveCount(0, { timeout: 20_000 })

    await expect(page.getByTestId('admin-trainer').filter({ hasText: name })).toBeVisible({ timeout: 20_000 })

    const profile = await getProfileByPhone(phone)
    expect(profile, 'trainer profile row must exist in DB').not.toBeNull()
    expect(profile!.role).toBe('trainer')
    } finally {
      // No e2e noise left behind: remove the created user and its rows.
      await deleteTestProfileByPhone(phone)
    }
  })

  test('A4. non-admin (trainer) hitting /admin is redirected away', async ({ browser }) => {    // Use the trainer session
    const ctx = await browser.newContext({
      storageState: (require('node:path') as typeof import('node:path')).resolve(__dirname, '..', 'e2e', '.auth', 'trainer.json'),
    })
    const page = await ctx.newPage()
    await page.goto('/admin', { waitUntil: 'load' })
    // Either redirected to /trainer or / — definitely NOT staying on /admin
    await page.waitForURL((url) => !url.pathname.startsWith('/admin'), { timeout: 30_000 })
    expect(page.url()).not.toMatch(/\/admin/)
    await ctx.close()
  })

  test('A5. CEO edits then deletes a user — full CRUD round-trip', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'load' })
    await expect(page.getByRole('heading', { name: /Hi,.*CEO/ })).toBeVisible({ timeout: 60_000 })
    await settle(page)

    // Create a fresh user to mutate (no history → deletable).
    const phone = `+2517${(Date.now() % 100_000_000).toString().padStart(8, '0').slice(-8)}`
    const name = `E2E Crud ${Date.now()}`
    await page.getByTestId('admin-toggle-form').click()
    await page.getByTestId('admin-displayName').fill(name)
    await page.getByTestId('admin-phone').fill(phone)
    await page.getByTestId('admin-password').fill('Crud1234!')
    await page.getByTestId('admin-submit').click()
    const row = page.getByTestId('admin-trainee').filter({ hasText: name })
    await expect(row).toBeVisible({ timeout: 20_000 })

    // UPDATE: rename via the edit dialog.
    const renamed = `${name} Renamed`
    await row.getByTestId('admin-trainee-edit').click()
    await expect(page.getByTestId('admin-edit-dialog')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('admin-edit-displayName').fill(renamed)
    // Let the dialog settle after fill-scroll before clicking save.
    await page.getByTestId('admin-edit-save').scrollIntoViewIfNeeded()
    await settle(page)
    await page.getByTestId('admin-edit-save').click()
    await expect(page.getByTestId('admin-trainee').filter({ hasText: renamed })).toBeVisible({ timeout: 20_000 })
    const updated = await getProfileByPhone(phone)
    expect(updated, 'renamed profile must exist in DB').not.toBeNull()

    // DELETE: confirm removal.
    const renamedRow = page.getByTestId('admin-trainee').filter({ hasText: renamed })
    await renamedRow.getByTestId('admin-trainee-delete').click()
    await expect(page.getByTestId('admin-delete-dialog')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('admin-delete-confirm').click()
    await expect(page.getByTestId('admin-trainee').filter({ hasText: renamed })).toHaveCount(0, { timeout: 20_000 })
    const gone = await getProfileByPhone(phone)
    expect(gone, 'deleted profile must be gone from DB').toBeNull()
  })
})
