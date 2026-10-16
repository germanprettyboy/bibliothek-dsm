// Browser-Tests: npx playwright test  (startet einen eigenen Server für diesen Checkout)
const { defineConfig } = require("@playwright/test");

// Port je Checkout aus dem Pfad abgeleitet (8700–8999): parallele Worktrees testen nie die Dateien eines anderen.
// Überschreiben mit DSM_TEST_PORT=…
let h = 0;
for (const c of __dirname) h = (h * 31 + c.charCodeAt(0)) >>> 0;
const PORT = +process.env.DSM_TEST_PORT || 8700 + (h % 300);

module.exports = defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/setup.js",
  outputDir: "tests/.tmp/ergebnisse",
  fullyParallel: true,
  workers: process.env.CI ? 2 : "50%",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 30000,
  use: {
    baseURL: `http://localhost:${PORT}/`,
    viewport: { width: 1280, height: 800 },
    locale: "de-DE",
    timezoneId: "Europe/Rome",
    colorScheme: "light",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: `python3 -m http.server ${PORT} -b 127.0.0.1 -d website`,
    url: `http://localhost:${PORT}/index.html`,
    reuseExistingServer: false, // fremder Server auf dem Port = Fehler statt stiller Test der falschen Dateien
    stdout: "ignore",
    stderr: "ignore",
  },
});
