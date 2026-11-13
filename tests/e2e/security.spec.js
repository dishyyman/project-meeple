/* =====================================================================
   MEEPLE — hostile and malformed files (Flow 12)
   ---------------------------------------------------------------------
   Character and compendium files travel between players over Discord,
   email and AirDrop, so the importer is the one place untrusted input
   enters the app (docs/security.md §0). These tests import files built to
   attack it, and files that are simply wrong, and check that:

     · nothing runs                 — no script, no handler, no CSP breach;
     · nothing turns into markup    — checked separately from "nothing
                                      ran", because the Content Security
                                      Policy would stop a payload running
                                      even if escaping had failed; the DOM
                                      check is what catches the escaping bug;
     · the text shows literally     — a name with <img> in it reads as that;
     · bad files are refused        — with a message, and nothing changes.

   Fixtures: tests/fixtures/files/ — see the note in malicious.meeple.json's
   generator in docs/testing.md §4.
   ===================================================================== */
const { test, expect } = require('./helpers/test');
const {
  openApp, press, appAttr, closeModal, fixture, chooseFile, readResult, rosterNames,
} = require('./helpers/app');

/* Record every Content Security Policy violation the page reports, from
   before the first script runs. */
async function watchCsp(page) {
  await page.addInitScript(() => {
    window.__violations = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      window.__violations.push(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
}

/* Anything an escaping failure would have created: an element carrying an
   on* handler, an <img> pointed at the payload's "x", an inline <script>,
   or a javascript: URL. The app itself has none of these by design
   (code-style.md §5), so any hit is an injection. */
const injectedElements = (page) => page.evaluate(() => {
  const hits = [];
  for (const el of document.querySelectorAll('.app *')) {
    for (const a of el.attributes) {
      if (a.name.startsWith('on')) hits.push(`${el.tagName} ${a.name}`);
      if (/^\s*javascript:/i.test(a.value)) hits.push(`${el.tagName} ${a.name}=javascript:`);
    }
    if (el.tagName === 'IMG' && el.getAttribute('src') === 'x') hits.push('img src=x');
    if (el.tagName === 'SCRIPT') hits.push('inline script');
  }
  return hits;
});

test('a malicious character file: nothing runs, nothing becomes markup', async ({ page }) => {
  await watchCsp(page);
  await openApp(page);
  await press(page, '[data-nav="characters"]');
  await chooseFile(page, '[data-import-open]', fixture('malicious.meeple.json'));
  const result = await readResult(page);
  expect(result.state).toBe('ok');
  await closeModal(page);

  // The name shows as the literal text it is — cut to the 60-character
  // name limit on the way in, like every stored name (database.md A6).
  const name = (await rosterNames(page)).at(-1);
  expect(name.startsWith('Mallory <img src=x onerror="window.__pwned')).toBe(true);
  expect(name.length).toBe(60);

  // Open the character and visit everything that renders its data.
  const mallory = await page.$$eval('[data-open-character]', (els) => els.at(-1).dataset.openCharacter);
  await press(page, `[data-open-character="${mallory}"]`);
  for (const tab of ['action', 'character', 'gear']) await press(page, `.tabbar__btn[data-tab="${tab}"]`);
  for (const t of await page.$$eval('.screen--sheet [data-toggle]', (els) => els.map((e) => e.dataset.toggle))) {
    await press(page, `.screen--sheet [data-toggle="${t}"]`);
  }
  await press(page, '[data-nav="edit"]');
  await press(page, '[data-nav="characters"]');

  // The restored content entry is shown, as text.
  expect(await page.evaluate(() => document.querySelector('.screen--sheet').textContent))
    .toContain('Cursed <img src=x');

  expect(await injectedElements(page)).toEqual([]);
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
  expect(await page.evaluate(() => window.__violations)).toEqual([]);
  // The javascript: "portrait" was refused, not stored.
  const portraits = await page.evaluate(() =>
    Object.entries(localStorage).filter(([k, v]) => k.endsWith('.portrait') && !v.startsWith('data:image/')));
  expect(portraits).toEqual([]);
});

/* The round-2 review found the ids — not the visible text — were the way
   in: an ability id went into data-collapse and data-toggle unescaped, so a
   file could write its own elements into the Action tab. The policy stops
   scripts, not a link that looks like part of the app, so the DOM is
   checked for the payloads' own elements by id. Every id here also has to
   survive being put in a selector, which is what the toggle handler does
   with it — a quote or backslash there used to throw. */
test('hostile ability, passive and note ids: no markup, and every row still opens', async ({ page }) => {
  await watchCsp(page);
  const fs = require('fs');
  const file = JSON.parse(fs.readFileSync(fixture('elara.meeple.json'), 'utf8'));
  const c = file.characters[0];
  const LINK = 'x"><a id="pwn-ability" href="https://example.com">Injected link</a><span data-x="';
  c.abilities[0].id = LINK;
  c.abilities[1].id = 'a\\"]';                         // backslash, quote, bracket
  c.abilities[2].id = "it's [data-toggle] > *";       // selector metacharacters
  c.abilities[3].id = 'ps1';                          // a duplicate of a passive's id
  c.passives[0].id = '"><b id="pwn-passive">bold</b>';
  c.passives[1].id = { nested: true };                // not even a string
  c.notes[0].id = 'n"><i id="pwn-note">x</i><s data-y="';
  c.notes[1].id = 'n\\';
  const name = 'hostile-ids.meeple.json';

  await openApp(page);
  await press(page, '[data-nav="characters"]');
  await chooseFile(page, '[data-import-open]', { name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
  expect((await readResult(page)).state).toBe('ok');
  await closeModal(page);
  const id = await page.$$eval('[data-open-character]', (els) => els.at(-1).dataset.openCharacter);
  await press(page, `[data-open-character="${id}"]`);

  // Nothing the payloads tried to create exists.
  expect(await page.locator('#pwn-ability, #pwn-passive, #pwn-note, .app a[href^="https://example"]').count()).toBe(0);

  // Every id on the sheet is plain and unique — rows open and close alone.
  const ids = await page.$$eval('.screen--sheet [data-collapse]', (els) => els.map((e) => e.dataset.collapse));
  const freeForm = ids.filter((i) => !i.includes('.') && !i.includes('#'));
  for (const i of freeForm) expect(i).toMatch(/^[A-Za-z0-9_-]+$/);
  expect(new Set(freeForm).size).toBe(freeForm.length);

  // And every one of them still works: open it, see it open, close it.
  for (const tab of ['action', 'character', 'notes']) {
    await press(page, `[data-tab="${tab}"]`);
    const toggles = await page.$$eval('.screen--sheet [data-toggle]', (els) => els
      .filter((e) => e.getClientRects().length)
      .map((e) => e.dataset.toggle));
    expect(toggles.length).toBeGreaterThan(0);
    for (const t of toggles) {
      const was = await page.evaluate((v) => [...document.querySelectorAll('.screen--sheet [data-collapse]')]
        .find((e) => e.dataset.collapse === v).classList.contains('is-open'), t);
      await page.evaluate((v) => [...document.querySelectorAll('.screen--sheet [data-toggle]')]
        .find((e) => e.dataset.toggle === v && e.getClientRects().length).click(), t);
      const now = await page.evaluate((v) => [...document.querySelectorAll('.screen--sheet [data-collapse]')]
        .find((e) => e.dataset.collapse === v).classList.contains('is-open'), t);
      expect(now, `toggle ${t}`).toBe(!was);
    }
  }

  // The visible text came through untouched — only the ids were replaced.
  await press(page, '[data-tab="action"]');
  await expect(page.locator('.screen--sheet')).toContainText('Ictus Findens');
  expect(await injectedElements(page)).toEqual([]);
  expect(await page.evaluate(() => window.__violations)).toEqual([]);
});

/* Wrapped in a describe only so the error allowance below covers this one
   test. The browser REPORTS each script it refuses as a console error —
   here that report is the policy working, not the app failing. The pattern
   is the browser's own wording (Chrome and WebKit both name the policy),
   so any other error in this test still fails it. */
test.describe('the policy refusing injected script', () => {
  test.use({ allowedErrors: [/Content Security Policy/i] });

  test('the Content Security Policy refuses inline script', async ({ page }) => {
    await watchCsp(page);
    await openApp(page);
    // Simulates an escaping failure: inline script and an inline handler,
    // put straight into the page.
    await page.evaluate(() => {
      const s = document.createElement('script');
      s.textContent = 'window.__pwned = "script"';
      document.body.append(s);
      const holder = document.createElement('div');
      holder.innerHTML = '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" onload="window.__pwned=\'handler\'">';
      document.body.append(holder);
    });
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
    const violations = await page.evaluate(() => window.__violations);
    expect(violations.some((v) => v.startsWith('script-src'))).toBe(true);
  });
});

/* Each of these must be refused with a message, leaving the roster as it was. */
const REFUSED = [
  ['a file from a newer version', 'too-new.meeple.json', 'Made by a newer Meeple'],
  ['unreadable JSON', 'malformed.meeple.json', 'Not a character file'],
  ['JSON that is not a Meeple file', 'not-meeple.json', 'Not a character file'],
  ['a compendium given to the character importer', 'compendium.library.json', 'Not a character file'],
];

for (const [what, file, title] of REFUSED) {
  test(`refuses ${what}`, async ({ page }) => {
    await openApp(page);
    await press(page, '[data-nav="characters"]');
    const before = await rosterNames(page);
    await chooseFile(page, '[data-import-open]', fixture(file));
    const result = await readResult(page);
    expect(result).toMatchObject({ state: 'error', title });
    await closeModal(page);
    expect(await rosterNames(page)).toEqual(before);
  });
}

test('refuses a character file given to the compendium importer', async ({ page }) => {
  await openApp(page);
  await press(page, '[data-nav="settings"]');
  await chooseFile(page, '[data-file-open="compendium"]', fixture('elara.meeple.json'));
  const result = await readResult(page);
  expect(result).toMatchObject({ state: 'error', title: 'That is a character file' });
});

test('refuses a file over 10 MB before reading it (security.md Gap 1)', async ({ page }) => {
  await openApp(page);
  await press(page, '[data-nav="characters"]');
  const big = Buffer.alloc(11 * 1024 * 1024, ' ');
  await chooseFile(page, '[data-import-open]', { name: 'huge.meeple.json', mimeType: 'application/json', buffer: big });
  const result = await readResult(page);
  expect(result).toMatchObject({ state: 'error', title: 'That file is too large' });
  expect(result.text).toContain('huge.meeple.json');
});

test('the policy is in place on the page', async ({ page }) => {
  await openApp(page);
  const csp = await page.getAttribute('meta[http-equiv="Content-Security-Policy"]', 'content');
  expect(csp).toContain("script-src 'self'");
  expect(csp).not.toContain('unsafe-inline');
  expect(csp).not.toContain('unsafe-eval');
});
