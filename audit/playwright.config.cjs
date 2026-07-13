const path = require("node:path");
const { defineConfig, devices } = require("@playwright/test");

const auditRoot = __dirname;
const resultsRoot = path.join(auditRoot, "results");

module.exports = defineConfig({
  testDir: path.join(auditRoot, "tests"),
  globalSetup: require.resolve("./support/global-setup.cjs"),
  outputDir: path.join(resultsRoot, "artifacts"),
  fullyParallel: false,
  workers: Number(process.env.AUDIT_WORKERS || 1),
  forbidOnly: true,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["line"],
    ["json", { outputFile: path.join(resultsRoot, "playwright-results.json") }],
    ["html", { outputFolder: path.join(resultsRoot, "playwright-report"), open: "never" }]
  ],
  use: {
    baseURL: process.env.AUDIT_BASE_URL || "http://127.0.0.1:3000",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    reducedMotion: "reduce",
    serviceWorkers: "block"
  },
  projects: [
    {
      name: "admin-desktop",
      metadata: { auditRole: "admin", viewportClass: "desktop" },
      use: {
        ...devices["Desktop Chrome"],
        storageState: path.join(auditRoot, ".auth", "admin-desktop.json")
      }
    },
    {
      name: "admin-mobile",
      metadata: { auditRole: "admin", viewportClass: "mobile" },
      use: {
        ...devices["Pixel 7"],
        storageState: path.join(auditRoot, ".auth", "admin-mobile.json")
      }
    },
    {
      name: "unauthenticated-desktop",
      metadata: { auditRole: "unauthenticated", viewportClass: "desktop" },
      use: {
        ...devices["Desktop Chrome"],
        storageState: path.join(auditRoot, ".auth", "unauthenticated.json")
      }
    }
  ]
});
