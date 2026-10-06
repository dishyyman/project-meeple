/* =====================================================================
   WAYPOINT — Playwright configuration (development only)
   ---------------------------------------------------------------------
   Run:  npm run test:e2e

   Drives the Chrome already installed on the machine (channel: 'chrome')
   rather than downloading Playwright's own browsers, so setup is one
   `npm install` and nothing else. Each test gets a fresh browser context,
   which means fresh localStorage — tests never see a player's real data.
   ===================================================================== */
const { defineConfig } = require('@playwright/test');

const PORT = 4173;

module.exports = defineConfig({
  testDir: './tests/e2e',
  // The app is small and every test boots it from scratch; parallel files
  // are fine, but keep each file's tests in order (they read top to bottom
  // like the flows in docs/testing.md §5).
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    // The phone frame is the design target (docs/design-system.md §15).
    viewport: { width: 460, height: 940 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `node tests/serve.mjs ${PORT}`,
    url: `http://localhost:${PORT}/index.html`,
    reuseExistingServer: true,
  },
});
