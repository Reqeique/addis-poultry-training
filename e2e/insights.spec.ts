import { test, expect } from '@playwright/test'
import { settle } from './helpers'

test.describe('Admin insights & messaging analytics (UI ↔ API)', () => {
  test.beforeEach(async () => {
    test.setTimeout(90_000)
    test.skip(test.info().project.name !== 'admin', 'admin-only spec')
  })

  test('I0. bottom nav moves between Users and Insights (register stays on Users)', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'load' })
    await expect(page.getByRole('heading', { name: /Hi,.*CEO/ })).toBeVisible({ timeout: 60_000 })
    await settle(page)

    // Register form lives only on the Users destination.
    await expect(page.getByTestId('admin-toggle-form')).toBeVisible()

    await page.getByTestId('admin-nav-insights').click()
    await page.waitForURL(/\/admin\/insights$/, { timeout: 20_000 })
    await expect(page.getByTestId('admin-insights')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('admin-toggle-form')).toHaveCount(0)

    await page.getByTestId('admin-nav-users').click()
    await page.waitForURL((url) => url.pathname === '/admin', { timeout: 20_000 })
    await expect(page.getByTestId('admin-toggle-form')).toBeVisible()
  })

  test('I1. tabbed insights render messaging, satisfaction, revenue, team', async ({ page }) => {
    await page.goto('/admin/insights', { waitUntil: 'load' })
    await expect(page.getByRole('heading', { name: /Hi,.*CEO/ })).toBeVisible({ timeout: 60_000 })
    await settle(page)

    const insights = page.getByTestId('admin-insights')
    await expect(insights).toBeVisible({ timeout: 30_000 })
    await expect(insights.getByText('Insights & messaging analytics')).toBeVisible()

    // Messaging tab (default): reply KPIs, volume, senders, unreplied.
    await expect(page.getByTestId('insights-avg-reply')).toBeVisible()
    await expect(page.getByTestId('insights-inquiry-reply')).toBeVisible()
    await expect(page.getByTestId('insights-unreplied-count')).toBeVisible()
    await expect(page.getByTestId('insights-volume')).toBeVisible()
    await expect(
      page.getByTestId('insights-top-sender').first().or(insights.getByText('No messages yet')),
    ).toBeVisible({ timeout: 20_000 })
    await expect(
      page.getByTestId('insights-unreplied').first().or(page.getByTestId('insights-unreplied-empty')),
    ).toBeVisible({ timeout: 20_000 })

    // Satisfaction tab.
    await page.getByTestId('insights-tab-satisfaction').click()
    await expect(page.getByTestId('insights-csat')).toBeVisible()
    await expect(page.getByTestId('insights-csat-detail')).toBeVisible()

    // Revenue tab.
    await page.getByTestId('insights-tab-revenue').click()
    await expect(page.getByTestId('insights-revenue')).toBeVisible()
    await expect(page.getByTestId('insights-revenue-detail')).toBeVisible()

    // Team tab.
    await page.getByTestId('insights-tab-team').click()
    await expect(
      page.getByTestId('insights-employee').first().or(insights.getByText('No trainers yet')),
    ).toBeVisible({ timeout: 20_000 })
  })

  test('I2. /api/admin/insights returns live aggregates for admin', async ({ page, request }) => {
    await page.goto('/admin/insights', { waitUntil: 'load' })
    await expect(page.getByRole('heading', { name: /Hi,.*CEO/ })).toBeVisible({ timeout: 60_000 })

    // Reuse the logged-in admin session for a direct API assertion.
    const storage = await page.context().storageState()
    const cookies = storage.cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const res = await request.get('/api/admin/insights', { headers: { cookie: cookies } })
    expect(res.ok(), '/api/admin/insights must succeed for admin').toBeTruthy()
    const json = await res.json()
    expect(json.messaging, 'messaging aggregate').toBeTruthy()
    expect(json.reply_time, 'reply_time aggregate').toBeTruthy()
    expect(json.satisfaction, 'satisfaction aggregate').toBeTruthy()
    expect(json.revenue, 'revenue aggregate').toBeTruthy()
    expect(Array.isArray(json.employees), 'employees list').toBeTruthy()
    expect(typeof json.messaging.total_messages).toBe('number')
    expect(typeof json.satisfaction.score).toBe('number')
    expect(typeof json.revenue.monthly_revenue_etb).toBe('number')
  })
})
