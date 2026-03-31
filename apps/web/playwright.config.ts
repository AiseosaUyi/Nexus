import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local so E2E_TEST_EMAIL / E2E_TEST_PASSWORD are available in tests
try {
  const envFile = readFileSync(resolve(__dirname, '.env.local'), 'utf8');
  for (const line of envFile.split('\n')) {
    const match = line.match(/^([^#=][^=]*)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  }
} catch { /* .env.local missing — use process.env directly */ }

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    // Auth setup — runs once to store session cookies
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // Unauthenticated tests (smoke, auth flows) — no dependency on setup
    {
      name: 'chromium-public',
      testMatch: /\/(smoke|auth)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Authenticated tests (dashboard, sidebar, pages) — require setup
    {
      name: 'chromium-auth',
      testMatch: /\/(create-page|sidebar|block-handle|block-picker|import)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    cwd: './',
  },
});
