import { defineConfig, devices } from '@playwright/test'

/**
 * Tests run against a real build, with Airtable deliberately unconfigured.
 *
 * With no PAT the stores fall back to localStorage only (see `useRemoteStore`),
 * which makes every run deterministic, offline and incapable of writing into a
 * real base. The Airtable layer itself is covered by the round-trip specs in
 * `tests/mappers.spec.ts`, which need no network either.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // the app keeps one shared store per browser context
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3999',
    trace: 'retain-on-failure',
  },
  projects: [
    // Pure round-trip specs: no page, no server. Kept in their own project so
    // they do not pay for a dev server boot they never use.
    { name: 'unit', testMatch: /mappers\.spec\.ts/ },
    {
      name: 'chromium',
      testIgnore: /mappers\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node node_modules/nuxt/bin/nuxt.mjs dev --host 127.0.0.1 --port 3999',
    url: 'http://127.0.0.1:3999',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      // Empty on purpose: this is what puts the app in local-only mode.
      NUXT_PUBLIC_AIRTABLE_PAT: '',
      NUXT_PUBLIC_AIRTABLE_BASE_ID: '',
    },
  },
})
