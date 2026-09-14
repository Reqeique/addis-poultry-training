import { test, expect } from '@playwright/test'
import { settle } from './helpers'

test.describe('Admin insights & messaging analytics (UI ↔ API)', () => {
  test.beforeEach(async () => {
    test.setTimeout(90_000)
    test.skip(test.info().project.name !== 'admin', 'admin-only spec')
  })

  test('I1. insights section renders with reply time, CSAT, revenue, employees', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'load' })
    await expect(page.getByRole('heading', { name: /Hi,.*Admin/ })).toBeVisible({ timeout: 60_000 })
    await settle(page)

    const insights = page.getByTestId('admin-insights')
    await expect(insights).toBeVisible({ timeout: 30_000 })
    await expect(insights.getByText('Insights & messaging analytics')).toBeVisible()

    // Core KPI tiles — values come from live /api/admin/insights
    await expect(page.getByTestId('insights-avg-reply')).toBeVisible()
    await expect(page.getByTestId('insights-inquiry-reply')).toBeVisible()
    await expect(page.getByTestId('insights-csat')).toBeVisible()
    await expect(page.getByTestId('insights-revenue')).toBeVisible()
    await expect(page.getByTestId('insights-unreplied-count')).toBeVisible()

    // Detail blocks render (volume, satisfaction, revenue, employees)
    await expect(page.getByTestId('insights-volume')).toBeVisible()
    await expect(page.getByTestId('insights-csat-detail')).toBeVisible()
    await expect(page.getByTestId('insights-revenue-detail')).toBeVisible()

    // Either senders or empty state, either unreplied items or inbox-zero
    const topSenders = page.getByTestId('insights-top-sender')
    const unreplied = page.getByTestId('insights-unreplied')
    const inboxZero = page.getByTestId('insights-unreplied-empty')
    const employees = page.getByTestId('insights-employee')
    await expect(
      topSenders.first().or(insights.getByText('No messages yet')),
    ).toBeVisible({ timeout: 20_000 })
    await expect(
      unreplied.first().or(inboxZero),
    ).toBeVisible({ timeout: 20_000 })
    await expect(
      employees.first().or(insights.getByText('No trainers yet')),
    ).toBeVisible({ timeout: 20_000 })
  })

  test('I2. /api/admin/insights returns live aggregates for admin', async ({ page, request }) => {
    await page.goto('/admin', { waitUntil: 'load' })
    await expect(page.getByRole('heading', { name: /Hi,.*Admin/ })).toBeVisible({ timeout: 60_000 })

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
