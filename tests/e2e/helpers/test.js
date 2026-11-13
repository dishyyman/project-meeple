/* =====================================================================
   MEEPLE — the `test` every browser test imports
   ---------------------------------------------------------------------
   Playwright's own `test`, plus one thing every test gets without asking:
   it FAILS if the page reports a JavaScript error at any point — an
   uncaught exception, or anything written to the console as an error
   (a failed fetch of a page fragment, a 404 on a script, a CSP refusal).

   Why automatic rather than an `expect(errors).toEqual([])` in each test:
   a check each test has to remember is a check some test will forget, and
   an error that leaves the screen looking right is exactly the kind a
   player hits later. It also catches errors that happen AFTER a test's
   last assertion, which a hand-written check at the end could miss.

   Use it in place of '@playwright/test':

       const { test, expect } = require('./helpers/test');

   A test that is MEANT to make the browser log an error (the CSP test
   injects a script so the policy can refuse it) lists what it expects:

       test.use({ allowedErrors: [/Content Security Policy/] });

   Keep those patterns as narrow as the test allows — an allowance is a
   hole in the net for that whole file or describe block.
   ===================================================================== */
const base = require('@playwright/test');

const test = base.test.extend({
  // Regexes for console errors a test deliberately causes. Empty by default.
  allowedErrors: [[], { option: true }],

  // `auto: true` — runs for every test, whether or not the test names it.
  failOnPageErrors: [async ({ page, allowedErrors }, use, testInfo) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(`Uncaught ${e.name}: ${e.message}`));
    // A failed resource load reports only "404" in its text; the URL is in
    // the message's location, and is the part worth reading.
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const url = m.location().url || '';
      // The browser asks for /favicon.ico on its own; the app has no icon yet
      // (the logo is undecided — design-system.md §2). Not an app error.
      if (url.endsWith('/favicon.ico')) return;
      errors.push(`${m.text()} ${url}`.trim());
    });

    await use();

    const unexpected = errors.filter((e) => !allowedErrors.some((re) => re.test(e)));
    if (!unexpected.length) return;

    /* Already failed for another reason? Then attach the errors to the
       report instead of failing a second time. Two reasons:
       · the first failure is the one to read, and a second message under
         it only buries it;
       · Playwright's failure screenshot injects a <style> into the page to
         hide the text caret, and WebKit applies the app's strict CSP to it
         and logs "Refused to apply a stylesheet…". That is the test tool
         tripping over the policy, not the app breaking it — reporting it
         as an app error would send someone hunting a bug that isn't there.
       A test that otherwise PASSED never gets that screenshot, so for it
       every error is the app's, and it fails. */
    if (testInfo.status !== 'passed') {
      await testInfo.attach('page-errors.txt', {
        body: `${unexpected.join('\n')}\n\n(Includes anything after the failure — Safari logs a CSP refusal when the failure screenshot is taken; that one is the test tool, not the app.)`,
        contentType: 'text/plain',
      });
      return;
    }
    base.expect(unexpected, 'the page reported JavaScript errors during this test').toEqual([]);
  }, { auto: true }],
});

module.exports = { test, expect: base.expect };
