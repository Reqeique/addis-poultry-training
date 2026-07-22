import { test, expect } from '@playwright/test'
import { waitForTrainerDashboard } from './helpers'
import { countTraineesForTrainer } from './db'

const TRAINER_ID = '4368a1da-d33e-446c-ad06-608696f83103'
const TRAINEE_NAMES = ['Chala Bekele', 'Mulu Tesfaye', 'Abebe Kebede']

test.describe('Trainer dashboard', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(test.info().project.name !== 'trainer', 'trainer-only spec')
    await page.goto('/trainer')
    await waitForTrainerDashboard(page)
  })

  test('B1. dashboard greets trainer and shows stat tiles', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Hi,/ })).toBeVisible()
    await expect(page.getByText('Total', { exact: true })).toBeVisible()
    await expect(page.getByText('Active', { exact: true })).toBeVisible()
    await expect(page.getByText('Chats', { exact: true })).toBeVisible()
  })

  test('B2. all three seeded trainee cards are listed', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Your Trainees' })).toBeVisible()
    for (const name of TRAINEE_NAMES) {
      await expect(
        page.getByRole('heading', { name, level: 3 }),
        `trainee card "${name}" should be rendered`,
      ).toBeVisible()
    }
  })

  test('B3. each trainee card exposes a message entry point', async ({ page }) => {
    const dbCount = await countTraineesForTrainer(TRAINER_ID)
    const links = page.getByRole('link', { name: 'Tap to message' })
    await expect(links, `"Tap to message" links should match DB trainee count`).toHaveCount(dbCount)
  })

  test('B4. bottom nav routes to the trainee management page', async ({ page }) => {
    await page.getByRole('link', { name: 'Trainees' }).click()
    await expect(
      page.getByRole('heading', { name: 'All Trainees' }),
      'should land on the trainee management page',
    ).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveURL(/\/trainer\/trainees$/)
  })

  test('C1. trainee management page renders the add-trainee form', async ({ page }) => {
    await page.goto('/trainer/trainees')
    await expect(page.getByRole('heading', { name: 'Add trainee' })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Full name' })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Phone number' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add Trainee' })).toBeVisible()
  })
})
