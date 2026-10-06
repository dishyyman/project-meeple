/* =====================================================================
   WAYPOINT — data safety: characters survive every way they can move
   ---------------------------------------------------------------------
   docs/testing.md §5, Flows 6, 7, 8 and 11. Losing a character is the
   worst failure this app can have (§6), so these run the real export,
   import, backup and delete paths end to end and check the result
   survives a reload.
   ===================================================================== */
const { test, expect } = require('@playwright/test');
const {
  openApp, press, appAttr, openFirstCharacter, closeModal, applyCalc,
  fixture, chooseFile, download, readResult, rosterNames,
} = require('./helpers/app');

// Back to Home after a reload, the way init() leaves it.
async function reloadApp(page) {
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.app')?.getAttribute('data-view') === 'home');
}

test('Flow 6 — edit and save: toast, inert Save, survives reload; a blank name is refused', async ({ page }) => {
  const errors = await openApp(page);
  await openFirstCharacter(page);
  await press(page, '[data-nav="edit"]');

  // Blank name: refused with an error under the field, nothing saved.
  await page.fill('[data-id-name]', '');
  await page.locator('[data-id-name]').dispatchEvent('input');
  await press(page, '[data-id-save]');
  await expect(page.locator('[data-id-error]')).toBeVisible();

  await page.fill('[data-id-name]', 'Elara the Bold');
  await page.locator('[data-id-name]').dispatchEvent('input');
  await press(page, '[data-id-save]');
  await expect(page.locator('[data-toast-text]')).toHaveText('Character saved.');
  await expect(page.locator('[data-id-save]')).toBeDisabled();

  await reloadApp(page);
  await press(page, '[data-nav="characters"]');
  expect(await rosterNames(page)).toEqual(['Elara the Bold']);
  expect(errors).toEqual([]);
});

test('Flow 7 — export a character, then import it back as a copy', async ({ page }) => {
  const errors = await openApp(page);
  await press(page, '[data-nav="characters"]');
  await press(page, '[data-roster-edit]');

  const file = await download(page, '[data-char-export]');
  expect(file.name).toBe('elara-starwhisper.waypoint.json');
  expect(file.json.waypointCharacter.schemaVersion).toBe(1);
  expect(file.json.characters.map((c) => c.name)).toEqual(['Elara Starwhisper']);
  // The content snapshot travels with it (character-file.md §4).
  expect(Object.keys(file.json.entries)).toContain('subclass.hunter');
  await expect(page.locator('[data-toast-text]')).toHaveText('Character exported.');

  await press(page, '[data-roster-edit]');   // leave edit mode
  await chooseFile(page, '[data-import-open]', fixture('elara.waypoint.json'));
  expect((await readResult(page)).state).toBe('ok');
  await closeModal(page);

  // Added as a copy with a fresh id — never a claim on the original's slot.
  expect(await rosterNames(page)).toEqual(['Elara Starwhisper', 'Elara Starwhisper']);
  const ids = await page.$$eval('[data-open-character]', (els) => els.map((e) => e.dataset.openCharacter));
  expect(new Set(ids).size).toBe(2);

  await reloadApp(page);
  await press(page, '[data-nav="characters"]');
  expect((await rosterNames(page)).length).toBe(2);
  expect(errors).toEqual([]);
});

test('Flow 7b — restore in place overwrites the matching character', async ({ page }) => {
  const errors = await openApp(page);
  await openFirstCharacter(page);
  await applyCalc(page, 'health', 'damage', 5);                // 7 → 2
  await expect(page.locator('[data-bind="healthCur"]').first()).toHaveText('2');

  await press(page, '[data-nav="settings"]');
  await chooseFile(page, '[data-file-open="characters"]', fixture('backup.waypoint.json'));
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('file-ask');
  await press(page, '[data-file-apply="overwrite"]');
  expect((await readResult(page)).state).toBe('ok');
  await closeModal(page);

  // One Elara, back at the health the backup recorded.
  await press(page, '[data-nav="characters"]');
  expect(await rosterNames(page)).toEqual(['Elara Starwhisper']);
  await press(page, '[data-open-character]');
  await expect(page.locator('[data-bind="healthCur"]').first()).toHaveText('7');
  expect(errors).toEqual([]);
});

test('Flow 8 — back up the roster, delete a character, restore it', async ({ page }) => {
  const errors = await openApp(page);
  await press(page, '[data-nav="settings"]');
  const backup = await download(page, '[data-backup-export]');
  expect(backup.json.characters.length).toBe(1);
  await expect(page.locator('[data-toast-text]')).toHaveText('Backup saved.');

  await press(page, '[data-nav="characters"]');
  await press(page, '[data-roster-edit]');
  await press(page, '[data-char-del]');
  await press(page, '[data-char-del-confirm]');
  expect(await rosterNames(page)).toEqual([]);

  await press(page, '[data-nav="settings"]');
  await chooseFile(page, '[data-file-open="characters"]', {
    name: backup.name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup.json)),
  });
  await press(page, '[data-file-apply="add"]');
  expect((await readResult(page)).state).toBe('ok');
  await closeModal(page);

  await press(page, '[data-nav="characters"]');
  expect(await rosterNames(page)).toEqual(['Elara Starwhisper']);
  expect(errors).toEqual([]);
});

test('Flow 11 — a deleted character stays deleted after reload (the seed included)', async ({ page }) => {
  const errors = await openApp(page);
  await press(page, '[data-nav="characters"]');
  await press(page, '[data-roster-edit]');
  await press(page, '[data-char-del]');
  // The confirmation says it is permanent, as an amber warning.
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('char-del');
  await expect(page.locator('.modal--char-del .status--warn')).toContainText('permanent');
  await press(page, '[data-char-del-confirm]');
  expect(await rosterNames(page)).toEqual([]);

  await reloadApp(page);
  await press(page, '[data-nav="characters"]');
  expect(await rosterNames(page)).toEqual([]);
  // Nothing left in storage under the deleted id.
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('waypoint.character.')));
  expect(keys).toEqual([]);
  expect(errors).toEqual([]);
});
