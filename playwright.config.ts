import { defineConfig, devices } from '@playwright/test'
import { readFileSync, existsSync } from 'node:fs'

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3007'
const STORAGE_DIR = './e2e/.auth'

// Load Supabase keys from .env.local so e2e specs can assert UI against live
// Supabase data via the service-role client (bypasses RLS for reads).
function loadEnvLocal(): Record<string, string> {
  const out: Record<string, string> = {}
  const path = '.env.local'
  if (!existsSync(path)) return out
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}
const envLocal = loadEnvLocal()

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'line',
  env: {
    NEXT_PUBLIC_SUPABASE_URL: envLocal.NEXT_PUBLIC_SUPABASE_URL || '',
    SUPABASE_SERVICE_ROLE_KEY: envLocal.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on',
  },
  projects: [
    {
      name: 'trainer',
      use: {
        ...devices['Desktop Chrome'],
        storageState: `${STORAGE_DIR}/trainer.json`,
      },
    },
    {
      name: 'trainee',
      use: {
        ...devices['Desktop Chrome'],
        storageState: `${STORAGE_DIR}/trainee.json`,
      },
    },
    {
      name: 'admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: `${STORAGE_DIR}/admin.json`,
      },
    },
  ],
  globalSetup: require.resolve('./e2e/auth.setup.ts'),
  webServer: {
    command: 'bun run dev -- -p 3007',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      // Tells next.config.ts to skip file-watcher rebuilds/HMR pings mid-suite.
      DISABLE_HMR: 'true',
      NEXT_PUBLIC_SUPABASE_URL: envLocal.NEXT_PUBLIC_SUPABASE_URL || '',
      SUPABASE_SERVICE_ROLE_KEY: envLocal.SUPABASE_SERVICE_ROLE_KEY || '',
    },
  },
})
