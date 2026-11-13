/* =====================================================================
   MEEPLE — the compendium: update content, and never brick the app doing it
   ---------------------------------------------------------------------
   docs/testing.md §5, Flow 9 (export → Add → Replace → Restore Built-in),
   plus the failure the Codex review found: a malformed compendium installed
   with Replace used to be stored whole and then crash every launch before
   Settings could be reached to undo it. library-check.js now refuses it at
   the door and again at launch, and a launch safety net catches whatever
   the check cannot describe. These run each of those for real, including
   the page reloads that a Replace and a Restore trigger.
   ===================================================================== */
const fs = require('fs');
const { test, expect } = require('./helpers/test');
const {
  openApp, press, appAttr, closeModal, fixture, chooseFile, download, readResult,
} = require('./helpers/app');

const BUILT_IN_TITLE = 'Meeple Core Compendium';
const shipped = () => JSON.parse(fs.readFileSync(fixture('compendium.library.json'), 'utf8'));
const asFile = (name, json) =>
  ({ name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(json)) });

const libTitle = (page) => page.locator('[data-bind="libTitle"]');
const libOff   = (page) => page.locator('[data-bind="libOff"]');
const stored   = (page, key) => page.evaluate((k) => localStorage.getItem(k), key);

// A compendium install or restore reloads the page when its result window is
// dismissed. Wait for the new page to finish booting before going on.
async function closeAndReload(page) {
  await Promise.all([page.waitForEvent('load'), closeModal(page)]);
  await page.waitForFunction(() => document.querySelector('.app')?.getAttribute('data-view') === 'home');
}

// Put values in storage before the FIRST boot only, the way openApp() seeds
// characters, so a test can start from a state a previous session left.
async function seedOnce(page, values) {
  await page.addInitScript((v) => {
    if (sessionStorage.getItem('compendium-test-seeded')) return;
    sessionStorage.setItem('compendium-test-seeded', '1');
    for (const [k, val] of Object.entries(v)) localStorage.setItem(k, val);
  }, values);
}

async function importCompendium(page, file, mode) {
  await press(page, '[data-nav="settings"]');
  await chooseFile(page, '[data-file-open="compendium"]', file);
  if (mode) {
    await expect.poll(() => appAttr(page, 'data-modal')).toBe('file-ask');
    await press(page, `[data-file-apply="${mode}"]`);
  }
  return readResult(page);
}

test('Flow 9 — export, Add, Replace (with reload), Restore Built-in (with reload)', async ({ page }) => {
  await openApp(page);
  await press(page, '[data-nav="settings"]');
  await expect(libTitle(page)).toHaveText(BUILT_IN_TITLE);

  // Export: the running content, as a library file.
  const out = await download(page, '[data-compendium-export]');
  expect(out.json.meeple.title).toBe(BUILT_IN_TITLE);
  expect(out.json.subclasses.length).toBeGreaterThan(0);

  // Add: only what is missing comes in; an entry already here is left alone.
  const add = shipped();
  add.armor[0].armorMod = 99;                                       // already here — must not change
  add.armor.push({ id: 'armor.test-plate', name: 'Test Plate', type: 'armor', armorMod: 1 });
  const added = await importCompendium(page, asFile('add.library.json', add), 'add');
  expect(added).toMatchObject({ state: 'ok', title: 'Compendium entries added' });
  expect(added.text).toContain('1 entry');
  await closeModal(page);

  // Replace: stored whole, then the page reloads onto it.
  const replacement = shipped();
  replacement.meeple.title = 'Test Compendium';
  const installed = await importCompendium(page, asFile('test.library.json', replacement), 'overwrite');
  expect(installed).toMatchObject({ state: 'ok', title: 'Compendium installed' });
  await closeAndReload(page);
  await press(page, '[data-nav="settings"]');
  await expect(libTitle(page)).toHaveText('Test Compendium');
  await expect(libOff(page)).toBeHidden();

  // Restore Built-in: asked first, then back to the shipped content.
  await press(page, '[data-compendium-reset]');
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('file-ask');
  await press(page, '[data-file-apply="reset"]');
  expect((await readResult(page)).title).toBe('Built-in compendium restored');
  await closeAndReload(page);
  await press(page, '[data-nav="settings"]');
  await expect(libTitle(page)).toHaveText(BUILT_IN_TITLE);
  expect(await stored(page, 'meeple.library')).toBeNull();
});

test('a malformed compendium is refused before anything is stored', async ({ page }) => {
  await openApp(page);
  const broken = {
    meeple: { schemaVersion: 1, title: 'Broken Compendium', version: '1' },
    armor: [{ id: 'armor.example', name: 'Example' }],
    subclasses: {},                                // the review's example: an object, not a list
  };
  const result = await importCompendium(page, asFile('broken.library.json', broken));
  expect(result).toMatchObject({ state: 'error', title: 'This compendium has problems' });
  expect(result.text).toContain('“subclasses” must be a list');
  expect(result.text).toContain('Nothing on this device was changed');
  expect(await stored(page, 'meeple.library')).toBeNull();
});

test('a malformed compendium ALREADY stored no longer stops the app starting', async ({ page }) => {
  await seedOnce(page, {
    'meeple.library': JSON.stringify({
      meeple: { schemaVersion: 1, title: 'Broken Compendium', version: '1' },
      armor: [{ id: 'armor.example', name: 'Example' }],
      subclasses: {},
    }),
  });
  await openApp(page);                             // boots — and helpers/test.js fails on any page error

  await press(page, '[data-nav="settings"]');
  await expect(libTitle(page)).toHaveText(BUILT_IN_TITLE);
  await expect(libOff(page)).toContainText('can’t be read');
  // The way out is offered, and works.
  await expect(page.locator('[data-compendium-reset]')).toBeVisible();
  await press(page, '[data-compendium-reset]');
  await press(page, '[data-file-apply="reset"]');
  await closeAndReload(page);
  await press(page, '[data-nav="settings"]');
  await expect(libOff(page)).toBeHidden();
  expect(await stored(page, 'meeple.library')).toBeNull();
});

test('safety net: a compendium the last launch never finished on is set aside', async ({ page }) => {
  // A compendium that passes the check, and a boot mark left 'pending' — what
  // a launch that threw part-way through start-up leaves behind.
  const lib = shipped();
  lib.meeple.title = 'Crashy Compendium';
  await seedOnce(page, { 'meeple.library': JSON.stringify(lib), 'meeple.library-boot': 'pending' });
  await openApp(page);

  await press(page, '[data-nav="settings"]');
  await expect(libTitle(page)).toHaveText(BUILT_IN_TITLE);
  await expect(libOff(page)).toContainText('didn’t finish starting');
  // Stays set aside on the next launch too, rather than trying again.
  expect(await stored(page, 'meeple.library-boot')).toBe('crashed');
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.app')?.getAttribute('data-view') === 'home');
  await press(page, '[data-nav="settings"]');
  await expect(libOff(page)).toContainText('didn’t finish starting');
});

test('a compendium that boots cleanly stands the safety net down', async ({ page }) => {
  const lib = shipped();
  lib.meeple.title = 'Fine Compendium';
  await seedOnce(page, { 'meeple.library': JSON.stringify(lib) });
  await openApp(page);
  await press(page, '[data-nav="settings"]');
  await expect(libTitle(page)).toHaveText('Fine Compendium');
  expect(await stored(page, 'meeple.library-boot')).toBeNull();
});

test('a malformed library entry inside a character file is never kept', async ({ page }) => {
  await openApp(page);
  const file = JSON.parse(fs.readFileSync(fixture('elara.meeple.json'), 'utf8'));
  // An entry this device lacks, so the import would otherwise restore it and
  // store it for every future launch.
  file.entries['armor.bogus'] = { id: 'armor.bogus', name: 'Bogus', armorMod: 'lots' };
  await press(page, '[data-nav="characters"]');
  await chooseFile(page, '[data-import-open]', asFile('elara.meeple.json', file));
  expect((await readResult(page)).state).toBe('ok');
  await closeModal(page);

  const kept = JSON.parse(await stored(page, 'meeple.imported-entries') || '{}');
  expect(kept['armor.bogus']).toBeUndefined();
});
