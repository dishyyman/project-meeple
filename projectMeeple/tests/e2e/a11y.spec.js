/* =====================================================================
   MEEPLE — automated accessibility scan (axe-core)
   ---------------------------------------------------------------------
   Every screen and the modals players use most, scanned against WCAG 2.1
   A and AA with axe-core. STRICT: any violation fails the test, named by
   rule and element, so a regression is caught the day it is written
   rather than at the next audit.

   The first run (2026-11-13) found four, all fixed rather than excused:
   the calculator input had no label; the roll boxes were buttons nested in
   a collapsible's header button; the FULL frame toggle sat at 2.1:1; and
   the selected Appearance label was 4.29:1. There are NO exceptions in this
   file. If one is ever needed, scope it to the one element with
   AxeBuilder.exclude() and write the reason beside it — never disable a
   rule wholesale.

   Two deliberate choices about how it runs:

   · Chrome only. axe reads the DOM and computed styles, which the two
     engines agree on; running it in WebKit too doubles the time and finds
     nothing new. Keyboard and dialog behaviour, which DO differ between
     engines, are tested in both (keyboard.spec.js, dialogs.spec.js).

   · bypassCSP, for THIS FILE ONLY. axe injects inline styles while it
     measures colour contrast, and the app's strict policy refuses them —
     loudly, which helpers/test.js rightly treats as a failure. Bypassing it
     here changes nothing about the app or its policy: security.spec.js
     still checks the policy is in place, and every other test runs under
     it.
   ===================================================================== */
const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./helpers/test');
const { openApp, press, appAttr, openFirstCharacter } = require('./helpers/app');


const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// Wait for slides and fades to finish: a modal caught mid-transition is
// half-transparent, and its contrast would be measured against the wrong
// background.
async function settle(page) {
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
}

async function expectClean(page) {
  await settle(page);
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  // One line per offending element, so the failure reads as a to-do list.
  const found = violations.flatMap((v) => v.nodes.map((n) => `${v.id} (${v.impact}): ${n.target.join(' ')} — ${v.help}`));
  expect(found).toEqual([]);
}

const toSheet = async (page, tab) => {
  await openFirstCharacter(page);
  if (tab) await press(page, `[data-tab="${tab}"]`);
};

// [name, how to get there from a fresh app]
const SCREENS = [
  ['Home', async () => {}],
  ['Characters', async (page) => press(page, '[data-nav="characters"]')],
  ['Characters (edit mode)', async (page) => { await press(page, '[data-nav="characters"]'); await press(page, '[data-roster-edit]'); }],
  ['Sheet — Action, an ability open', async (page) => { await toSheet(page); await press(page, '[data-toggle="ab1"]'); }],
  ['Sheet — Character, a skill open', async (page) => { await toSheet(page, 'character'); await press(page, '[data-toggle="skill.gymnast"]'); }],
  ['Sheet — Gear', async (page) => toSheet(page, 'gear')],
  ['Edit Character', async (page) => { await toSheet(page); await press(page, '[data-nav="edit"]'); }],
  ['Rules', async (page) => press(page, '[data-nav="rules"]')],
  ['Settings', async (page) => press(page, '[data-nav="settings"]')],
  ['Create Character — step 1', async (page) => { await press(page, '[data-nav="characters"]'); await press(page, '[data-action="create-character"]'); }],
  ['Menu drawer', async (page) => { await toSheet(page); await press(page, '[data-menu="open"]'); }],
];

// [name, opener on the Action tab, data-modal it opens]
const MODALS = [
  ['Calculator', '[data-calc="health"]', 'calc'],
  ['Roll result', '[data-roll="damage"]', 'roll'],
  ['Dice roller', '.hero__btn-dice', 'dice'],
  ['Boons & Conditions', '[data-effect-open]', 'effects'],
  ['Spend a Patch', null, 'patch'],
];

test.describe('axe scans', () => {
test.use({ bypassCSP: true });
test.skip(({ browserName }) => browserName !== 'chromium', 'axe runs in Chrome only — see the header');

for (const [name, go] of SCREENS) {
  test(`axe: ${name}`, async ({ page }) => {
    await openApp(page);
    await go(page);
    await expectClean(page);
  });
}

for (const [name, opener, modal] of MODALS) {
  test(`axe: modal — ${name}`, async ({ page }) => {
    await openApp(page);
    await toSheet(page);
    if (opener) await press(page, opener);
    // The Patch dialog opens on a HOLD; its keyboard twin is Shift+Enter.
    else { await page.locator('[data-patch="0"]').focus(); await page.keyboard.press('Shift+Enter'); }
    await expect.poll(() => appAttr(page, 'data-modal')).toBe(modal);
    await expectClean(page);
  });
}

test('axe: modal — Advantage chooser', async ({ page }) => {
  await openApp(page);
  await toSheet(page);
  await page.locator('[data-roll="tohit"]:visible').first().focus();
  await page.keyboard.press('Shift+Enter');
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('adv');
  await expectClean(page);
});

test('axe: modal — Delete character', async ({ page }) => {
  await openApp(page);
  await press(page, '[data-nav="characters"]');
  await press(page, '[data-roster-edit]');
  await press(page, '[data-char-del]');
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('char-del');
  await expectClean(page);
});

});

/* The nested-interactive fix moved the roll boxes OUT of the collapsible's
   header button and put a stretched, invisible target over the row instead
   (collapsible() in main.js). That only works if the stacking is right, so
   this taps by POSITION — page.mouse lands on whatever is on top at that
   point, which is exactly what a finger does. (locator.click would refuse to
   tap the caret at all: it sees the toggle's target covering it, which is the
   design.) Runs in both browsers, since stacking is engine territory. */
async function tapAt(page, locator) {
  await locator.scrollIntoViewIfNeeded();         // page.mouse does not scroll on its own
  const b = await locator.boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}
test('a collapsible row: a tap on a roll box rolls, a tap elsewhere on the row opens it', async ({ page }) => {
  await openApp(page);
  await toSheet(page);
  const row = page.locator('[data-collapse="ab1"]');
  await expect(row).not.toHaveClass(/is-open/);

  await tapAt(page, row.locator('[data-roll="damage"]'));
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('roll');
  await expect(row).not.toHaveClass(/is-open/);              // the roll did not also toggle
  await page.keyboard.press('Escape');

  await tapAt(page, row.locator('.collapse__caret'));        // static content under the target
  await expect(row).toHaveClass(/is-open/);
  await expect(row.locator('[data-toggle]')).toHaveAttribute('aria-expanded', 'true');
  await tapAt(page, row.locator('.mini__label').first());   // a box's label: static, so it opens the row
  await expect(row).not.toHaveClass(/is-open/);
  await expect(row.locator('[data-toggle]')).toHaveAttribute('aria-expanded', 'false');
  await tapAt(page, row.locator('.collapse__title'));
  await expect(row).toHaveClass(/is-open/);
});
