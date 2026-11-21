/* =====================================================================
   MEEPLE — Settings → Feedback → Email us, and its copy button
   ---------------------------------------------------------------------
   Email us is a mailto: link built from FEEDBACK in main.js: the address,
   subject, opening lines, and a few details about the app. A browser test
   cannot open a mail app, so this checks everything up to that hand-off:

     · the link is there, announced as a link, with its name;
     · its href decodes to EXACTLY the agreed address, subject and body,
       line by line — a percent-encoding slip (a "+" for a space, a lone
       %0A) is invisible in the code and obvious in someone's mail app;
     · the questions (Description of the issue, Suggestions, Device,
       Browser) are left blank for the player, and the app fills in only
       its own settings and counts;
     · the details are stamped at the TAP, not when Settings opened;
     · the app's click handler lets the tap through to the browser;
     · the copy button copies the address, and says the address when the
       clipboard is refused.

   When FEEDBACK changes on purpose, change the expectations below with it.
   ===================================================================== */
const { test, expect } = require('./helpers/test');
const { openApp, press } = require('./helpers/app');

const TO = 'dish@9ballcreative.com';
const SUBJECT = 'Project Meeple Feedback';
// The whole body as a fresh app sends it, one entry per line.
const BODY = [
  'Hi Meeple People,',
  'I hope you are doing well. Here is my feedback:',
  '',
  'Fill out what you think would be helpful.',
  'Description of the issue: ',
  'Suggestions: ',
  'Device: ',
  'Browser: ',
  '- About my app:',
  'Compendium: Meeple Core Compendium v0.1.0 (built-in)',
  'Appearance: Ember · dark',
  'Saved: 1 character',
];

// Split a mailto: href into its parts by hand. URLSearchParams would turn a
// "+" back into a space and hide exactly the mistake worth catching.
function parseMailto(href) {
  const [path, query = ''] = href.replace(/^mailto:/, '').split('?');
  const fields = Object.fromEntries(query.split('&').map((kv) => kv.split('=')));
  return {
    raw: href,
    to: decodeURIComponent(path),
    keys: Object.keys(fields),
    subject: decodeURIComponent(fields.subject || ''),
    body: decodeURIComponent(fields.body || ''),
  };
}

// Records the href the browser would follow — read on window, AFTER the
// app's own handlers have run — then cancels, so no mail app is launched.
async function catchMailtoTap(page) {
  await page.evaluate(() => window.addEventListener('click', (e) => {
    const a = e.target.closest('[data-feedback-email]');
    if (!a) return;
    window.__mailTap = { prevented: e.defaultPrevented, href: a.href };
    e.preventDefault();
  }));
}

test.beforeEach(async ({ page }) => {
  await openApp(page);
  await press(page, '[data-nav="settings"]');
});

test('Email us is a link that starts the agreed message, line for line', async ({ page }) => {
  const link = page.getByRole('link', { name: /Email us/ });
  await expect(link).toBeVisible();
  const mail = parseMailto(await link.getAttribute('href'));

  expect(mail.raw).not.toContain('+');
  expect(mail.to).toBe(TO);
  expect(mail.keys).toEqual(['subject', 'body']);
  expect(mail.subject).toBe(SUBJECT);
  // CRLF between lines, the break the mailto: standard asks for.
  expect(mail.body.split('\r\n')).toEqual(BODY);
});

test('nothing a player wrote, and nothing read off the device, is in the draft', async ({ page }) => {
  const { body } = parseMailto(await page.locator('[data-feedback-email]').getAttribute('href'));
  // The seed character is Elara: her name must not travel.
  expect(body).not.toContain('Elara');
  // Device and Browser are asked, never sniffed: nothing the browser says
  // about itself appears anywhere in the draft.
  for (const tell of ['Chrome', 'Safari', 'WebKit', 'Macintosh', 'iPhone', 'Windows', 'home-screen']) {
    expect(body).not.toContain(tell);
  }
});

test('the details are stamped at the tap, and the tap reaches the browser', async ({ page }) => {
  await catchMailtoTap(page);
  // Change the theme AFTER Settings painted the link…
  await press(page, '[data-ap-theme="moss"]');
  await press(page, '[data-ap-mode="light"]');
  // …and the email still reports what is on screen at the moment of the tap.
  await page.locator('[data-feedback-email]').click();
  const tap = await page.evaluate(() => window.__mailTap);
  expect(tap.prevented).toBe(false);
  expect(parseMailto(tap.href).body).toContain('Appearance: Moss · light');
  await expect(page.locator('.app')).toHaveAttribute('data-view', 'settings');
});

test('the row invites feedback, and the address is a copy away', async ({ page }) => {
  await expect(page.locator('[data-feedback-email] .set-row__note')).toHaveText('Send us your feedback :)');
});

test('the copy button copies the address and says so', async ({ page, browserName }) => {
  // Chrome needs leave to read the clipboard back; WebKit cannot be given it,
  // so there the toast is the proof.
  if (browserName === 'chromium') await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  const copy = page.getByRole('button', { name: 'Copy the email address' });
  await copy.click();
  await expect(page.locator('[data-toast-text]')).toHaveText('Support email address copied');
  if (browserName === 'chromium') expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(TO);
});

test('a refused clipboard still gives the player the address', async ({ page }) => {
  await page.evaluate(() => {
    navigator.clipboard.writeText = () => Promise.reject(new Error('refused'));
  });
  await page.getByRole('button', { name: 'Copy the email address' }).click();
  const toast = page.locator('[data-toast-text]');
  await expect(toast).toHaveText(`Couldn't copy. The address is ${TO}`);
  await expect(toast).toHaveClass(/status--warn/);
});
