import { defineConfig } from "@playwright/test";
import chromium from "@sparticuz/chromium";
export default defineConfig({
  webServer: [
    {
      command: "npm run db:local && npm run dev:api",
      url: "http://localhost:8787/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: "npm run dev",
      url: "http://localhost:8080",
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
  ],
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: "http://localhost:8080",
    trace: "retain-on-failure",
    launchOptions: process.env.BUNDLED_CHROMIUM
      ? {
          executablePath: await chromium.executablePath(),
          args: chromium.args.filter(
            (a) =>
              !a.includes("single-process") &&
              !a.includes("disable-web-security") &&
              !a.includes("allow-running-insecure-content"),
          ),
        }
      : {},
  },
  reporter: "list",
});
