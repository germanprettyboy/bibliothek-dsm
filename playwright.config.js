// Browser tests: npx playwright test  (starts its own server for this checkout)
const { defineConfig } = require("@playwright/test");

// Port per checkout derived from the path (8700–8999): parallel worktrees never test another one's files.
// Override with DSM_TEST_PORT=…
let h = 0;
for (const c of __dirname) h = (h * 31 + c.charCodeAt(0)) >>> 0;
const PORT = +process.env.DSM_TEST_PORT || 8700 + (h % 300);

// DSM_LIVE_URL=https://… : test against a running address (npm run test:live, Cloudflare tunnel) instead of an own server.
// Real network in between: less parallel, more time, a second attempt.
const LIVE = process.env.DSM_LIVE_URL ? process.env.DSM_LIVE_URL.replace(/\/?$/, "/") : null;

module.exports = defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/setup.js",
  outputDir: "tests/.tmp/results",
  fullyParallel: true,
  workers: LIVE || process.env.CI ? 2 : "50%",
  forbidOnly: !!process.env.CI,
  retries: LIVE || process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: LIVE ? 60000 : 30000,
  expect: { timeout: LIVE ? 15000 : 5000 },
  use: {
    baseURL: LIVE || `http://localhost:${PORT}/`,
    viewport: { width: 1280, height: 800 },
    locale: "de-DE",
    timezoneId: "Europe/Rome",
    colorScheme: "light",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: LIVE ? undefined : {
    command: `python3 -m http.server ${PORT} -b 127.0.0.1 -d website`,
    url: `http://localhost:${PORT}/index.html`,
    reuseExistingServer: false, // a foreign server on the port = error instead of silently testing the wrong files
    stdout: "ignore",
    stderr: "ignore",
  },
});
