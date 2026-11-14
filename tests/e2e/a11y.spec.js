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
  ['Campaigns (empty)', async (page) => press(page, '[data-nav="campaigns"]')],
  ['Campaigns (one, edit mode)', async (page) => {
    await newCampaign(page, 'The Ashen Road');
    await press(page, '[data-nav="campaigns"]');
    await press(page, '[data-campaigns-edit]');
  }],
  ['Campaign — Party', async (page) => newCampaign(page, 'The Ashen Road', 'Session 7')],
  ['Campaign — Combat', async (page) => { await newCampaign(page, 'A'); await press(page, '.tabbar__btn[data-campaign-tab="combat"]'); }],
];

// Through the form, as a GM does. Lands inside the new campaign.
async function newCampaign(page, name, subtitle = '') {
  await press(page, '[data-nav="campaigns"]');
  await press(page, '[data-campaign-new]');
  await page.fill('[data-campaign-name]', name);
  if (subtitle) await page.fill('[data-campaign-subtitle]', subtitle);
  await press(page, '[data-campaign-save]');
  await expect.poll(() => appAttr(page, 'data-view')).toBe('campaign');
}

// [name, opener on the Action tab, data-modal it opens]
const MODALS = [
  ['Calculator', '[data-calc="health"]', 'calc'],
  ['Roll result', '[data-roll="damage"]', 'roll'],
  ['Dice roller', '.hero__btn-dice', 'dice'],
  ['Boons & Conditions', '[data-effect-open]', 'effects'],
  ['Spend a Patch', null, 'patch'],
  ['Rest (sheet)', '[data-action="rest"]', 'rest'],
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

test('axe: modals — campaign form, options sheet, delete alert', async ({ page }) => {
  await openApp(page);
  await press(page, '[data-nav="campaigns"]');
  await press(page, '[data-campaign-new]');
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('campaign-form');
  await expectClean(page);
  await page.fill('[data-campaign-name]', 'A');
  await press(page, '[data-campaign-save]');
  await press(page, '[data-campaign-menu]');
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('campaign-menu');
  await expectClean(page);
  await press(page, '[data-campaign-del-open]');
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('campaign-del');
  await expectClean(page);
});

// Game Master Tools, Party: a hero from a file, then each of its popups.
test('axe: Party tab with a hero, and the hero popups', async ({ page }) => {
  await openApp(page);
  await newCampaign(page, 'The Ashen Road');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), press(page, '[data-hero-import]')]);
  await chooser.setFiles(require('path').join(__dirname, '..', 'fixtures', 'files', 'elara.meeple.json'));
  await expect(page.locator('.hero-card')).toHaveCount(1);
  await expectClean(page);
  await press(page, '.hero-card [data-hero-calc="health"]');
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('calc');
  await expectClean(page);
  await page.keyboard.press('Escape');
  await press(page, '.hero-card [data-hero-menu]');
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('hero-menu');
  await expectClean(page);
  await page.keyboard.press('Escape');
  await press(page, '[data-hero-add]');
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('hero-form');
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

// A notice, reached by downing the character rather than by a button.
test('axe: modal — Downed (notice)', async ({ page }) => {
  await openApp(page);
  await toSheet(page);
  const last = await page.locator('[data-wound]').count();
  await press(page, `[data-wound="${last - 1}"]`);
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('downed');
  await expectClean(page);
});

// Both need a photo first, so they are set up here rather than in MODALS.
// The menu's rows are icon + words; the toast's Undo is the one action a
// toast can carry, and the only toast with two buttons in it.
const PHOTO = require('path').join(__dirname, '..', '..', 'resources', 'images', 'icons', 'icon-192.png');
async function editWithPhoto(page) {
  await openApp(page);
  await toSheet(page);
  await press(page, '[data-nav="edit"]');
  await page.setInputFiles('[data-portrait-input]', PHOTO);
  await expect.poll(() => appAttr(page, 'data-portrait')).toBe('set');
}

test('axe: modal — Portrait menu', async ({ page }) => {
  await editWithPhoto(page);
  await press(page, '[data-portrait-menu]');
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('portrait');
  await expectClean(page);
});

test('axe: toast with Undo (portrait removed)', async ({ page }) => {
  await editWithPhoto(page);
  await press(page, '[data-portrait-menu]');
  await press(page, '[data-portrait-remove]');
  await expect(page.locator('[data-toast-action]')).toBeVisible();
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

/* Round-2 review, finding 8. Journal notes open and close like every other
   collapsible, but did not SAY so — no aria-expanded — so a screen reader
   heard a button with no state. Checked through every way a note's state
   changes: a tap, a search that opens what it finds, and a re-render. */
test('a journal note says whether it is open — after a tap, a search and a re-render', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  await press(page, '[data-tab="notes"]');
  const ford = page.locator('.note-row', { hasText: 'The Ford at Vespers' });
  const head = ford.locator('.note-row__head');

  await expect(head).toHaveAttribute('aria-expanded', 'false');
  await head.click();
  await expect(ford).toHaveClass(/is-open/);
  await expect(head).toHaveAttribute('aria-expanded', 'true');
  await head.click();
  await expect(head).toHaveAttribute('aria-expanded', 'false');

  // A search opens its matches — and the heading says so.
  await page.fill('[data-note-search]', 'bandits');
  await expect(page.locator('.note-row')).toHaveCount(1);
  await expect(head).toHaveAttribute('aria-expanded', 'true');
  // Clearing it re-renders the whole list; the open note stays open, and says so.
  await page.fill('[data-note-search]', '');
  await expect(page.locator('.note-row')).toHaveCount(2);
  await expect(head).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.note-row', { hasText: 'Debts' }).locator('.note-row__head'))
    .toHaveAttribute('aria-expanded', 'false');
});

/* Round-2 review, finding 9. The dice sheet slid up on open even with Reduce
   Motion on. Read from the stylesheet rather than watched, because a 0.22s
   animation can be over before a test looks: whatever animation the sheet
   is given, none of its keyframes may move it. A fade is allowed — opacity
   is not motion. */
for (const reduce of [true, false]) {
  test(`the dice sheet ${reduce ? 'fades in without moving under Reduce Motion' : 'still rises in ordinarily'}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
    await openApp(page);
    await openFirstCharacter(page);
    await press(page, '.hero__btn-dice');
    await expect.poll(() => appAttr(page, 'data-modal')).toBe('dice');

    const { name, found, moves } = await page.evaluate(() => {
      const anim = getComputedStyle(document.querySelector('.dice-sheet')).animationName;
      // style.css is an index of @imports, so imported sheets are followed
      // (CSSImportRule.styleSheet), as are @media blocks (cssRules).
      const walk = (list) => [...list].flatMap((r) => (
        r instanceof CSSImportRule ? walk(r.styleSheet.cssRules)
          : r.cssRules && !(r instanceof CSSKeyframesRule) ? walk(r.cssRules)
            : [r]));
      // The app's own sheets; a cross-origin one (the web fonts) cannot be
      // read, and holds no animations of ours.
      const rules = [...document.styleSheets].flatMap((sh) => {
        try { return walk(sh.cssRules); } catch (_) { return []; }
      });
      const kf = rules.find((r) => r instanceof CSSKeyframesRule && r.name === anim);
      return { name: anim, found: !!kf, moves: !!kf && [...kf.cssRules].some((k) => k.style.transform && k.style.transform !== 'none') };
    });
    expect(name).not.toBe('none');            // it still arrives with a cue either way
    expect(found, `@keyframes ${name}`).toBe(true);
    expect(moves).toBe(!reduce);
  });
}
