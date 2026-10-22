// Browser tests: npx playwright test  (starts its own server for this checkout)
const { defineConfig, devices } = require("@playwright/test");
const { execFileSync } = require("child_process");
const path = require("path");

// Port per checkout derived from the path (8700–8999): parallel worktrees never test another one's files.
// Override with DSM_TEST_PORT=…
let h = 0;
for (const c of __dirname) h = (h * 31 + c.charCodeAt(0)) >>> 0;
const PORT = +process.env.DSM_TEST_PORT || 8700 + (h % 300);

// Second server with PHP (php -S + tools/local-router.php): the real save.php for publish.spec.js. Only if php exists
// (GitHub runner: yes); it writes to tests/.tmp/data/, never into website/.
let php = false;
try { execFileSync("php", ["-v"], { stdio: "ignore" }); php = true; } catch (e) { /* no PHP: publish.spec.js is skipped */ }
const PHP_PORT = PORT + 1000;
process.env.DSM_PHP_URL = php ? `http://127.0.0.1:${PHP_PORT}/` : "";
const ENGINES = /engines\.spec\.js/; // Firefox/WebKit: only the basics, the other specs use CDP

// DSM_LIVE_URL=https://… : test against a running address (npm run test:live, Cloudflare tunnel) instead of an own server.
// Real network in between: less parallel, more time, a second attempt.
const LIVE = process.env.DSM_LIVE_URL ? process.env.DSM_LIVE_URL.replace(/\/?$/, "/") : null;

module.exports = defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/setup.js",
  outputDir: "tests/.tmp/results",
  fullyParallel: true,
  workers: LIVE ? 2 : process.env.CI ? "100%" : "50%", // CI: one per core of the GitHub runner
  forbidOnly: !!process.env.CI,
  retries: LIVE || process.env.CI ? 1 : 0,
  // github: failures as annotations in the Actions run; json: flaky tests (passed only on the retry) listed by the workflow
  reporter: process.env.CI ? [["list"], ["github"], ["json", { outputFile: "tests/.tmp/report.json" }]] : [["list"]],
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
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" }, testMatch: ENGINES },
    { name: "webkit", use: { browserName: "webkit" }, testMatch: ENGINES },
    { name: "iphone", use: { ...devices["iPhone 13"], browserName: "webkit" }, testMatch: ENGINES },
  ],
  webServer: LIVE ? undefined : [{
    command: `python3 -m http.server ${PORT} -b 127.0.0.1 -d website`,
    url: `http://localhost:${PORT}/index.html`,
    reuseExistingServer: false, // a foreign server on the port = error instead of silently testing the wrong files
    stdout: "ignore",
    stderr: "ignore",
  }].concat(php ? [{
    command: `php -S 127.0.0.1:${PHP_PORT} -t website tools/local-router.php`,
    url: `http://127.0.0.1:${PHP_PORT}/index.html`,
    env: { DSM_LOCAL_DIR: path.join(__dirname, "tests", ".tmp") },
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "ignore", // php -S logs every request there
  }] : []),
});
