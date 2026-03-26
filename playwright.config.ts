import { defineConfig } from "@playwright/test";

const appUrl = process.env.PLAYWRIGHT_APP_URL ?? "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: appUrl,
    trace: "on-first-retry",
  },
});
