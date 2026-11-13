/* =====================================================================
   MEEPLE — data safety: characters survive every way they can move
   ---------------------------------------------------------------------
   docs/testing.md §5, Flows 6, 7, 8 and 11. Losing a character is the
   worst failure this app can have (§6), so these run the real export,
   import, backup and delete paths end to end and check the result
   survives a reload.
   ===================================================================== */
const { test, expect } = require('./helpers/test');
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
  await openApp(page);
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
});

test('Flow 7 — export a character, then import it back as a copy', async ({ page }) => {
  await openApp(page);
  await press(page, '[data-nav="characters"]');
  await press(page, '[data-roster-edit]');

  const file = await download(page, '[data-char-export]');
  expect(file.name).toBe('elara-starwhisper.meeple.json');
  expect(file.json.meepleCharacter.schemaVersion).toBe(1);
  expect(file.json.characters.map((c) => c.name)).toEqual(['Elara Starwhisper']);
  // The content snapshot travels with it (character-file.md §4).
  expect(Object.keys(file.json.entries)).toContain('subclass.hunter');
  await expect(page.locator('[data-toast-text]')).toHaveText('Character exported.');

  await press(page, '[data-roster-edit]');   // leave edit mode
  await chooseFile(page, '[data-import-open]', fixture('elara.meeple.json'));
  expect((await readResult(page)).state).toBe('ok');
  await closeModal(page);

  // Added as a copy with a fresh id — never a claim on the original's slot.
  expect(await rosterNames(page)).toEqual(['Elara Starwhisper', 'Elara Starwhisper']);
  const ids = await page.$$eval('[data-open-character]', (els) => els.map((e) => e.dataset.openCharacter));
  expect(new Set(ids).size).toBe(2);

  await reloadApp(page);
  await press(page, '[data-nav="characters"]');
  expect((await rosterNames(page)).length).toBe(2);
});

/* Flow 7's promise in full: "the copy is identical with a new id; portrait,
   notes and gear survive". The test above checks the file's envelope and the
   roster; this one checks the CHARACTER. It starts from a character carrying
   every kind of state a player can give one — portrait, bio, notes, held
   weapons with a tag, worn armour, carried gear, inventory with modifiers
   (one negative), Boons and Conditions with stacks, a level history, and
   spent health, Mana, Wounds and Patches — and requires the imported copy's
   stored save to equal the original's, field for field. Added after the
   Codex review found Flow 7 only asserted on the name and id. */
test('Flow 7c — an exported character comes back identical, portrait and all', async ({ page }) => {
  const fs = require('fs');
  const elara = JSON.parse(fs.readFileSync(fixture('elara.meeple.json'), 'utf8')).characters[0];
  const { id: _id, portrait: _p, ...rest } = elara;
  const save = {
    ...rest,
    bio: { ...elara.bio, eyes: 'Grey', hair: 'Ash' },
    inventory: [...elara.inventory, {
      id: 'inv-coin', title: 'Lucky Coin', desc: 'Warm to the touch.',
      mods: [{ stat: 'Fortune', value: 1 }, { stat: 'Constitution', value: -2 }],
    }],
  };
  // A real 1×1 PNG: portraits are only accepted as image data URLs.
  const PORTRAIT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  await page.addInitScript((p) => {
    if (sessionStorage.getItem('portrait-seeded')) return;
    sessionStorage.setItem('portrait-seeded', '1');
    localStorage.setItem('meeple.character.rt.portrait', p);
  }, PORTRAIT);
  await openApp(page, { saves: { rt: save } });

  await press(page, '[data-nav="characters"]');
  await press(page, '[data-roster-edit]');
  const file = await download(page, '[data-char-export]');
  expect(file.json.characters[0].portrait).toBe(PORTRAIT);
  await press(page, '[data-roster-edit]');

  await chooseFile(page, '[data-import-open]', {
    name: file.name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file.json)),
  });
  expect((await readResult(page)).state).toBe('ok');
  await closeModal(page);

  const stored = await page.evaluate(() => {
    const { ids } = JSON.parse(localStorage.getItem('meeple.roster'));
    return ids.map((id) => ({
      id,
      save: JSON.parse(localStorage.getItem(`meeple.character.${id}`)),
      portrait: localStorage.getItem(`meeple.character.${id}.portrait`),
    }));
  });
  expect(stored.length).toBe(2);
  const [original, copy] = stored;
  expect(copy.id).not.toBe(original.id);

  // The named promises, one by one, so a failure says which one broke…
  expect(copy.portrait).toBe(PORTRAIT);
  expect(copy.save.notes).toEqual(original.save.notes);
  expect(copy.save.notes.length).toBeGreaterThan(0);
  expect(copy.save.hands).toEqual([{ id: 'weapon.1h-melee', tag: 'Reach' }, { id: 'shield.armor' }]);
  expect(copy.save.armorWorn).toBe('armor.light');
  expect(copy.save.inventory.find((i) => i.id === 'inv-coin').mods)
    .toEqual([{ stat: 'Fortune', value: 1 }, { stat: 'Constitution', value: -2 }]);
  expect(copy.save.effects).toEqual(original.save.effects);
  expect(copy.save.build.levels).toEqual(original.save.build.levels);
  expect([copy.save.health, copy.save.mana, copy.save.wounds, copy.save.patches]).toEqual([7, 4, 1, 2]);
  expect(copy.save.bio).toMatchObject({ eyes: 'Grey', hair: 'Ash' });
  // …and then everything else, so nothing can slip through unnamed.
  expect(copy.save).toEqual(original.save);

  // And it all survives a reload.
  await reloadApp(page);
  const afterReload = await page.evaluate((id) => localStorage.getItem(`meeple.character.${id}.portrait`), copy.id);
  expect(afterReload).toBe(PORTRAIT);
});

test('Flow 7b — restore in place overwrites the matching character', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  await applyCalc(page, 'health', 'damage', 5);                // 7 → 2
  await expect(page.locator('[data-bind="healthCur"]').first()).toHaveText('2');

  await press(page, '[data-nav="settings"]');
  await chooseFile(page, '[data-file-open="characters"]', fixture('backup.meeple.json'));
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('file-ask');
  await press(page, '[data-file-apply="overwrite"]');
  expect((await readResult(page)).state).toBe('ok');
  await closeModal(page);

  // One Elara, back at the health the backup recorded.
  await press(page, '[data-nav="characters"]');
  expect(await rosterNames(page)).toEqual(['Elara Starwhisper']);
  await press(page, '[data-open-character]');
  await expect(page.locator('[data-bind="healthCur"]').first()).toHaveText('7');
});

test('Flow 8 — back up the roster, delete a character, restore it', async ({ page }) => {
  await openApp(page);
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
});

test('Flow 11 — a deleted character stays deleted after reload (the seed included)', async ({ page }) => {
  await openApp(page);
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
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('meeple.character.')));
  expect(keys).toEqual([]);
});

/* ---------------------------------------------------------------------
   When storage refuses writes
   ---------------------------------------------------------------------
   A full quota (usually portraits) or storage blocked by the browser. Play
   carries on in memory, so what is under test is that the app SAYS SO: a
   standing alert while writes fail, no "saved" claim that is not true, and
   an import that does not report characters a reload will not bring back.

   failWrites() makes localStorage.setItem throw the way a full quota does,
   for keys matching `pattern`, from the moment it is called. localStorage
   only — sessionStorage carries the test seeding flag and must keep working.
   --------------------------------------------------------------------- */
async function breakableStorage(page) {
  await page.addInitScript(() => {
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      const p = window.__failWrites;
      if (this === window.localStorage && p && new RegExp(p).test(key)) {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      }
      return real.call(this, key, value);
    };
  });
}
const failWrites = (page, pattern = '^meeple\\.') =>
  page.evaluate((p) => { window.__failWrites = p; }, pattern);
const healWrites = (page) => page.evaluate(() => { window.__failWrites = null; });
const alertCard = (page) => page.locator('.storage-alert__card');

test.describe('when storage refuses writes', () => {
  test('a refused write raises a standing alert; the next write that lands clears it', async ({ page }) => {
    await breakableStorage(page);
    await openApp(page);
    await openFirstCharacter(page);
    await expect(alertCard(page)).toBeHidden();

    await failWrites(page);
    await applyCalc(page, 'health', 'damage', 1);                 // 7 → 6, in memory only
    await expect(page.locator('[data-bind="healthCur"]').first()).toHaveText('6');
    await expect(alertCard(page)).toBeVisible();
    await expect(page.locator('[data-storage-alert-text]')).toContainText('aren’t being saved');

    // Still up after another change — it is not a toast that times out.
    await applyCalc(page, 'health', 'damage', 1);                 // 6 → 5
    await expect(alertCard(page)).toBeVisible();

    // Storage recovers; the next save writes the whole character, so the
    // alert has nothing left to warn about.
    await healWrites(page);
    await applyCalc(page, 'health', 'damage', 1);                 // 5 → 4, saved
    await expect(alertCard(page)).toBeHidden();
    await reloadApp(page);
    await openFirstCharacter(page);
    await expect(page.locator('[data-bind="healthCur"]').first()).toHaveText('4');
  });

  test('the alert stays out of the way of an open modal, and leads to Settings', async ({ page }) => {
    await breakableStorage(page);
    await openApp(page);
    await openFirstCharacter(page);
    await failWrites(page);
    await applyCalc(page, 'health', 'damage', 1);
    await expect(alertCard(page)).toBeVisible();

    await press(page, '[data-calc="health"]');                     // a modal opens over the sheet
    await expect(alertCard(page)).toBeHidden();
    await closeModal(page);
    await expect(alertCard(page)).toBeVisible();

    await alertCard(page).click();                                 // a real tap: it must be reachable
    await expect.poll(() => appAttr(page, 'data-view')).toBe('settings');
  });

  test('Edit Character does not claim "saved" when the save was refused', async ({ page }) => {
    await breakableStorage(page);
    await openApp(page);
    await openFirstCharacter(page);
    await press(page, '[data-nav="edit"]');
    await failWrites(page);

    await page.fill('[data-id-name]', 'Elara the Unsaved');
    await page.locator('[data-id-name]').dispatchEvent('input');
    await press(page, '[data-id-save]');
    await expect(page.locator('[data-toast-text]')).toHaveText('Updated for this session only — not saved.');
    await expect(page.locator('[data-toast-text]')).toHaveClass(/status--warn/);

    await reloadApp(page);
    await press(page, '[data-nav="characters"]');
    expect(await rosterNames(page)).toEqual(['Elara Starwhisper']);
  });

  test('an import storage refuses is reported as not imported, and leaves nothing behind', async ({ page }) => {
    await breakableStorage(page);
    await openApp(page);
    await press(page, '[data-nav="characters"]');
    // Only character records fail, so the roster index still writes — the
    // case where a careless import would leave a row with no save behind it.
    await failWrites(page, '^meeple\\.character\\.');

    await chooseFile(page, '[data-import-open]', fixture('elara.meeple.json'));
    const result = await readResult(page);
    expect(result.state).toBe('error');
    expect(result.title).toBe('Not imported');
    expect(result.text).toContain('could not be imported');
    await closeModal(page);
    expect(await rosterNames(page)).toEqual(['Elara Starwhisper']);

    await healWrites(page);
    await reloadApp(page);
    await press(page, '[data-nav="characters"]');
    expect(await rosterNames(page)).toEqual(['Elara Starwhisper']);
  });
});
