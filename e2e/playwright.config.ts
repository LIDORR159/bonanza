import { defineConfig, devices } from "@playwright/test"

/**
 * End-to-end tests. They expect the whole stack to be running and seeded:
 *
 *   docker compose up -d && pnpm dev:setup && pnpm dev
 *
 * STOREFRONT_URL, BACKEND_URL and MAILPIT_URL override the local defaults.
 */
export default defineConfig({
  testDir: "./tests",
  globalSetup: "./global-setup.ts",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: process.env.STOREFRONT_URL || "http://localhost:8000",
    locale: "he-IL",
    timezoneId: "Asia/Jerusalem",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      // The mobile project checks layout; the long purchase flows run once, on desktop.
      testMatch: /storefront\.spec\.ts/,
    },
  ],
})
