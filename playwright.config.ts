import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:4173',
    trace:   'on-first-retry',
    navigationTimeout: 15_000,
    actionTimeout:     10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], locale: 'en-US' },
    },
  ],

  webServer: {
    command:             'VITE_DEFAULT_LOCALE=en npx vite build && npm run preview',
    url:                 'http://localhost:4173',
    reuseExistingServer: false,
    timeout:             120_000,
    stdout:              'ignore',
    stderr:              'pipe',
  },
})
