// Browser-Tests: npx playwright test  (startet einen eigenen Server für diesen Checkout)
const { defineConfig } = require("@playwright/test");

// Port je Checkout aus dem Pfad abgeleitet (8700–8999): parallele Worktrees testen nie die Dateien eines anderen.
// Überschreiben mit DSM_TEST_PORT=…
let h = 0;
for (const c of __dirname) h = (h * 31 + c.charCodeAt(0)) >>> 0;
const PORT = +process.env.DSM_TEST_PORT || 8700 + (h % 300);

// DSM_LIVE_URL=https://… : gegen eine laufende Adresse testen (npm run test:live, Cloudflare-Tunnel) statt eigenem Server.
// Echtes Netz dazwischen: weniger parallel, mehr Zeit, ein zweiter Versuch.
const LIVE = process.env.DSM_LIVE_URL ? process.env.DSM_LIVE_URL.replace(/\/?$/, "/") : null;

module.exports = defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/setup.js",
  outputDir: "tests/.tmp/ergebnisse",
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
    reuseExistingServer: false, // fremder Server auf dem Port = Fehler statt stiller Test der falschen Dateien
    stdout: "ignore",
    stderr: "ignore",
  },
});
