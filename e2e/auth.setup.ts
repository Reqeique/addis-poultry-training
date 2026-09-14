import { chromium, type FullConfig } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3007'
const STORAGE_DIR = './e2e/.auth'

type Creds = { phone: string; password: string; landing: string; file: string }

const ACCOUNTS: Creds[] = [
  { phone: '+251911223344', password: 'AddisTrainer123!', landing: '**/trainer', file: 'trainer.json' },
  { phone: '+251922334455', password: 'Addis123!', landing: '**/trainee', file: 'trainee.json' },
  { phone: '+251900000001', password: 'AddisAdmin123!', landing: '**/admin', file: 'admin.json' },
]

async function loginAndSave({ phone, password, landing, file }: Creds) {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  try {
    await page.goto(`${BASE_URL}/`)
    await page.getByRole('textbox', { name: 'Phone number (e.g. +251...)' }).fill(phone)
    await page.getByRole('textbox', { name: 'Password' }).fill(password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    // AuthProvider redirects to the role dashboard after profile fetch.
    // Generous timeout: first login also pays for cold route compilation.
    await page.waitForURL(landing, { timeout: 90_000 })
    await page.waitForLoadState('networkidle').catch(() => {})
    mkdirSync(STORAGE_DIR, { recursive: true })
    await page.context().storageState({ path: `${STORAGE_DIR}/${file}` })
    console.log(`[auth.setup] saved session for ${file}`)
  } finally {
    await browser.close()
  }
}

async function warmup() {
  // Pre-compile the routes the suite hits so tests don't pay for cold
  // compilation inside their own timeouts.
  const browser = await chromium.launch()
  const page = await browser.newPage()
  try {
    for (const path of ['/', '/trainer', '/trainee', '/admin', '/admin/insights', '/trainer/trainees']) {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'load', timeout: 90_000 }).catch(() => {})
    }
    console.log('[auth.setup] warmup done')
  } finally {
    await browser.close()
  }
}

async function globalSetup(_config: FullConfig) {
  await warmup()
  for (const account of ACCOUNTS) {
    let lastError: unknown = null
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await loginAndSave(account)
        lastError = null
        break
      } catch (e) {
        lastError = e
        console.log(`[auth.setup] login attempt ${attempt} failed for ${account.file}, retrying…`)
      }
    }
    if (lastError) throw lastError
  }
}

export default globalSetup
