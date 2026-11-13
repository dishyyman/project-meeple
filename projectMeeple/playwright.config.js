/* =====================================================================
   MEEPLE — Playwright configuration (development only)
   ---------------------------------------------------------------------
   Run:  npm run test:e2e              (Chrome and Safari)
         npm run test:chrome / test:safari   (one browser)
         npm run test:report           (open the last run's HTML report)

   Every browser test runs twice, once per project below:

     · chrome — the Chrome already installed on the machine (channel:
                'chrome'), not a Playwright download.
     · safari — Playwright's build of WebKit, the engine inside Safari and
                inside every browser on an iPhone. It is NOT the Safari app
                (nothing can automate that the same way), so it catches
                engine bugs, not every Safari quirk — real-device QA still
                matters. One-time setup: `npx playwright install webkit`.

   Each test gets a fresh browser context, which means fresh localStorage —
   tests never see a player's real data.
   ===================================================================== */
const { defineConfig } = require('@playwright/test');

const PORT = 4173;

module.exports = defineConfig({
  testDir: './tests/e2e',
  // The app is small and every test boots it from scratch; parallel files
  // are fine, but keep each file's tests in order (they read top to bottom
  // like the flows in docs/testing.md §5).
  fullyParallel: false,
  // `list` for the terminal as it runs; `html` for reading a failure after.
  // open: 'never' — the report is there when wanted (npm run test:report),
  // it does not pop a browser window open on every failed run.
  reporter: [['list'], ['html', { open: 'never' }]],
  /* One record per snapshot, shared by both browsers and every OS. The
     characterization snapshots are TEXT (what the sheet says, as JSON), not
     images, so they should not differ by engine or platform — and if Safari
     ever disagrees with Chrome about a number on the sheet, that is a bug to
     see, not a second baseline to file it under. Playwright's default would
     add -<project>-<platform> to the name and record one per pair. */
  snapshotPathTemplate: '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // The phone frame is the design target (docs/design-system.md §15).
    viewport: { width: 460, height: 940 },
    // Kept only for a failed test: a screenshot of the moment it failed, and
    // a step-by-step replay (npx playwright show-trace …, or from the HTML
    // report). No video — the trace already shows every step.
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chrome', use: { browserName: 'chromium', channel: 'chrome' } },
    { name: 'safari', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: `node tests/serve.mjs ${PORT}`,
    url: `http://localhost:${PORT}/index.html`,
    reuseExistingServer: true,
  },
});
