import { test, expect } from '@playwright/test'
import { settle } from './helpers'

// Unauthenticated login-page scenarios.
test.use({ storageState: 'e2e/.auth/empty.json' })

test.describe('Login page', () => {
  const onlyTrainer = () => test.skip(test.info().project.name !== 'trainer', 'trainer-pinned')

  test('L1. brands as My Chicken Addis Poultry', async ({ page }) => {
    onlyTrainer()
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /My Chicken Addis Poultry/ })).toBeVisible({ timeout: 25_000 })
    await settle(page)
  })

  test('L2. show-password toggle reveals and hides the password', async ({ page }) => {
    onlyTrainer()
    await page.goto('/')
    const password = page.getByRole('textbox', { name: 'Password' })
    await expect(password).toBeVisible({ timeout: 25_000 })
    await expect(password).toHaveAttribute('type', 'password')

    const toggle = page.getByRole('button', { name: 'Show password' })
    await toggle.click()
    await expect(password).toHaveAttribute('type', 'text')
    await expect(page.getByRole('button', { name: 'Hide password' })).toBeVisible()

    await page.getByRole('button', { name: 'Hide password' }).click()
    await expect(password).toHaveAttribute('type', 'password')
    await settle(page)
  })
})
