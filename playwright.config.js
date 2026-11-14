/* =====================================================================
   MEEPLE — Playwright configuration (development only)
   ---------------------------------------------------------------------
   Run:  npm run test:e2e              (Chrome, Safari, and the iPhone layout)
         npm run test:chrome / test:safari / test:iphone   (one project)
         npm run test:report           (open the last run's HTML report)

   Every browser test runs twice, once per desktop project below (the
   third, iphone, runs only phone.spec.js — see `projects`):

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
const { defineConfig, devices } = require('@playwright/test');

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
  /* chrome and safari are a DESKTOP browser at 460px — the phone frame,
     which is what most specs are written against. iphone is the real
     thing as far as an emulator goes: WebKit at an iPhone's size, with
     touch and no hover, so frame.js locks the app to full screen. It runs
     only phone.spec.js (the layout on an actual phone); the desktop
     projects skip that file, because it asserts what a phone sees.
     Emulation cannot draw a notch, so env(safe-area-inset-*) reads 0
     here — the safe-area spacing itself is checked on a real device
     (testing.md §9). */
  projects: [
    { name: 'chrome', use: { browserName: 'chromium', channel: 'chrome' }, testIgnore: /phone\.spec\.js/ },
    { name: 'safari', use: { browserName: 'webkit' }, testIgnore: /phone\.spec\.js/ },
    { name: 'iphone', use: { ...devices['iPhone 15'] }, testMatch: /phone\.spec\.js/ },
  ],
  webServer: {
    command: `node tests/serve.mjs ${PORT}`,
    url: `http://localhost:${PORT}/index.html`,
    reuseExistingServer: true,
  },
});
