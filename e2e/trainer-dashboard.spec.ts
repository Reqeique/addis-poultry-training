import { test, expect } from '@playwright/test'
import { waitForTrainerDashboard } from './helpers'
import { countTraineesForTrainer, getProfileByPhone, listTraineesForTrainer } from './db'

const TRAINER_PHONE = '+251911223344'

async function getTrainerId() {
  const trainer = await getProfileByPhone(TRAINER_PHONE)
  expect(trainer, 'trainer profile must exist in DB').not.toBeNull()
  return trainer!.id
}

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

  test('B2. all assigned trainee cards are listed', async ({ page }) => {
    const trainerId = await getTrainerId()
    const trainees = await listTraineesForTrainer(trainerId)
    expect(trainees.length, 'trainer must have assigned trainees in DB').toBeGreaterThan(0)

    await expect(page.getByRole('heading', { name: 'Your Trainees' })).toBeVisible()
    for (const trainee of trainees) {
      await expect(
        page.getByRole('heading', { name: trainee.display_name, exact: true }),
        `trainee card "${trainee.display_name}" should be rendered`,
      ).toBeVisible()
    }
  })

  test('B3. each trainee card exposes a message entry point', async ({ page }) => {
    const trainerId = await getTrainerId()
    const dbCount = await countTraineesForTrainer(trainerId)
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
