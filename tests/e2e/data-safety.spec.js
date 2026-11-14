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
  breakableStorage, failWrites, healWrites,
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

   failWrites() (helpers/app.js) makes localStorage.setItem throw the way a
   full quota does, for keys matching a pattern, from the moment it is called.
   --------------------------------------------------------------------- */
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

/* =====================================================================
   Round-2 review: what reaches storage must be what the app SAYS reached
   it, and what storage refuses must not then be thrown away by the app.
   The helpers below read the stored state directly, because "after a
   reload" is the promise and storage is what a reload reads.
   ===================================================================== */
const storedRoster = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('meeple.roster')).ids);
const storedSave = (page, id) => page.evaluate((k) => JSON.parse(localStorage.getItem(`meeple.character.${k}`)), id);
const storedCharacterKeys = (page) => page.evaluate(() =>
  Object.keys(localStorage).filter((k) => k.startsWith('meeple.character.')).sort());
const healthNow = (page) => page.locator('[data-bind="healthCur"]').first();

// The backup fixture's one character (Elara, id `aurelia`), renamed so an
// overwrite is visible on the sheet and in storage.
function renamedBackup(name, extra = []) {
  const fs = require('fs');
  const file = JSON.parse(fs.readFileSync(fixture('backup.meeple.json'), 'utf8'));
  file.characters[0].name = name;
  file.characters.push(...extra);
  return { name: 'backup.meeple.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) };
}

async function importFromSettings(page, file, mode) {
  await press(page, '[data-nav="settings"]');
  await chooseFile(page, '[data-file-open="characters"]', file);
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('file-ask');
  await press(page, `[data-file-apply="${mode}"]`);
  return readResult(page);
}

test.describe('import: the report matches what reached storage', () => {
  test('overwrite — the character lands, the roster index is refused: reported as imported, because it was', async ({ page }) => {
    await breakableStorage(page);
    await openApp(page);
    await failWrites(page, '^meeple\\.roster$');

    const result = await importFromSettings(page, renamedBackup('Overwritten'), 'overwrite');
    expect(result.state).toBe('ok');
    expect(result.text).toContain('Overwritten');
    expect(result.text).toContain('overwritten with the version in the file');
    await closeModal(page);

    // The index on disk already lists `aurelia`, so the new save is what a
    // reload reads — and it is what the list shows now.
    await press(page, '[data-nav="characters"]');
    expect(await rosterNames(page)).toEqual(['Overwritten']);
    expect((await storedSave(page, 'aurelia')).name).toBe('Overwritten');
    await expect(alertCard(page)).toBeVisible();      // the index write WAS refused

    await healWrites(page);
    await reloadApp(page);
    await press(page, '[data-nav="characters"]');
    expect(await rosterNames(page)).toEqual(['Overwritten']);
  });

  test('add — the character lands, the roster index is refused: taken back, nothing orphaned', async ({ page }) => {
    await breakableStorage(page);
    await openApp(page);
    await press(page, '[data-nav="characters"]');
    await failWrites(page, '^meeple\\.roster$');

    await chooseFile(page, '[data-import-open]', fixture('elara.meeple.json'));
    const result = await readResult(page);
    expect(result).toMatchObject({ state: 'error', title: 'Not imported' });
    expect(result.text).toContain('could not be imported');
    await closeModal(page);

    expect(await rosterNames(page)).toEqual(['Elara Starwhisper']);
    // No save left behind that no screen could ever open.
    expect(await storedCharacterKeys(page)).toEqual(['meeple.character.aurelia']);

    await healWrites(page);
    await reloadApp(page);
    await press(page, '[data-nav="characters"]');
    expect(await rosterNames(page)).toEqual(['Elara Starwhisper']);
  });

  test('overwrite — the character is refused, the roster index is fine: not imported, nothing changed', async ({ page }) => {
    await breakableStorage(page);
    await openApp(page);
    await openFirstCharacter(page);
    await applyCalc(page, 'health', 'damage', 5);                  // 7 → 2, saved
    await failWrites(page, '^meeple\\.character\\.');

    const result = await importFromSettings(page, renamedBackup('Overwritten'), 'overwrite');
    expect(result).toMatchObject({ state: 'error', title: 'Not imported' });
    await closeModal(page);

    await press(page, '[data-nav="characters"]');
    expect(await rosterNames(page)).toEqual(['Elara Starwhisper']);
    await press(page, '[data-open-character]');
    await expect(healthNow(page)).toHaveText('2');
    expect((await storedSave(page, 'aurelia')).name).toBe('Elara Starwhisper');

    await healWrites(page);
    await reloadApp(page);
    await openFirstCharacter(page);
    await expect(page.locator('[data-bind="name"]').first()).toHaveText('Elara Starwhisper');
    await expect(healthNow(page)).toHaveText('2');
  });

  test('several characters, different outcomes: each reported, and each as a reload finds it', async ({ page }) => {
    await breakableStorage(page);
    await openApp(page);
    const fs = require('fs');
    const second = { ...JSON.parse(fs.readFileSync(fixture('backup.meeple.json'), 'utf8')).characters[0], id: 'grimm', name: 'Grimm' };
    const third  = { ...second, id: 'vex', name: 'Vex' };
    // Only Grimm's save is refused.
    await failWrites(page, '^meeple\\.character\\.grimm$');

    const result = await importFromSettings(page, renamedBackup('Overwritten', [second, third]), 'overwrite');
    expect(result).toMatchObject({ state: 'error', title: 'Partly imported' });
    expect(result.text).toContain('Vex was added');
    expect(result.text).toContain('Overwritten was overwritten');
    expect(result.text).toContain('Grimm could not be imported');
    await closeModal(page);

    await press(page, '[data-nav="characters"]');
    expect(await rosterNames(page)).toEqual(['Overwritten', 'Vex']);
    expect(await storedRoster(page)).toEqual(['aurelia', 'vex']);
    expect(await storedCharacterKeys(page)).toEqual(['meeple.character.aurelia', 'meeple.character.vex']);

    await healWrites(page);
    await reloadApp(page);
    await press(page, '[data-nav="characters"]');
    expect(await rosterNames(page)).toEqual(['Overwritten', 'Vex']);
  });
});

test.describe('while storage refuses writes, nothing on the sheet is lost', () => {
  // A second character to switch to: the fixture's Elara, under another id.
  async function twoCharacters(page) {
    const fs = require('fs');
    const elara = JSON.parse(fs.readFileSync(fixture('backup.meeple.json'), 'utf8')).characters[0];
    const { id: _id, portrait: _p, ...save } = elara;
    await openApp(page, { saves: { aurelia: save, grimm: { ...save, name: 'Grimm' } } });
  }
  const openRow = async (page, name) => {
    await press(page, '[data-nav="characters"]');
    await page.locator('[data-open-character]', { hasText: name }).evaluate((el) => el.click());
    await expect.poll(() => appAttr(page, 'data-view')).toBe('sheet');
  };

  test('switching away and back keeps the unsaved changes, and the alert stays up until they land', async ({ page }) => {
    await breakableStorage(page);
    await twoCharacters(page);
    await openRow(page, 'Elara');
    await failWrites(page, '^meeple\\.character\\.');
    await applyCalc(page, 'health', 'damage', 2);                  // 7 → 5, refused
    await expect(alertCard(page)).toBeVisible();

    // The switch writes the roster index fine — that must NOT clear the alert.
    await openRow(page, 'Grimm');
    expect(await storedRoster(page)).toEqual(['aurelia', 'grimm']);
    await expect(alertCard(page)).toBeVisible();
    expect(await appAttr(page, 'data-storage')).toBe('failing');

    // A roster-only write of another kind: a reorder. Still up.
    await press(page, '[data-nav="characters"]');
    await press(page, '[data-roster-edit]');
    await page.locator('[data-char-grip="grimm"]').focus();
    await page.keyboard.press('ArrowUp');
    expect(await storedRoster(page)).toEqual(['grimm', 'aurelia']);
    await press(page, '[data-roster-edit]');
    expect(await appAttr(page, 'data-storage')).toBe('failing');

    // Back to Elara: the sheet shows what the player last saw, not storage.
    await openRow(page, 'Elara');
    await expect(healthNow(page)).toHaveText('5');

    // Storage recovers. The next write lands everything that was held.
    await healWrites(page);
    await openRow(page, 'Grimm');
    await expect(alertCard(page)).toBeHidden();
    expect((await storedSave(page, 'aurelia')).health).toBe(5);
    await reloadApp(page);
    await openRow(page, 'Elara');
    await expect(healthNow(page)).toHaveText('5');
  });

  test('creating a character keeps the one left, and a roster write does not clear the alert', async ({ page }) => {
    await breakableStorage(page);
    await openApp(page);
    await openFirstCharacter(page);
    await failWrites(page, '^meeple\\.character\\.');
    await applyCalc(page, 'health', 'damage', 3);                  // 7 → 4, refused

    // Through the wizard, the short way: every step's minimum.
    await press(page, '[data-nav="characters"]');
    await press(page, '[data-action="create-character"]');
    await press(page, '[data-wiz-pick^="class:"]');
    await press(page, '[data-wiz-pick^="sub:"]');
    for (let i = 0; i < 4; i++) await press(page, '[data-wiz-attr$=":1"]');
    await press(page, '[data-wiz="next"]');
    const skills = await page.$$eval('[data-wiz-skill]', (els) => els.slice(0, 4).map((e) => e.dataset.wizSkill));
    for (const id of skills) await press(page, `[data-wiz-skill="${id}"]`);
    await press(page, '[data-wiz="next"]');
    await press(page, '[data-wiz="next"]');
    await page.fill('[data-wiz-name]', 'Newcomer');
    await page.locator('[data-wiz-name]').dispatchEvent('input');
    await press(page, '[data-wiz="next"]');
    await expect(page.locator('[data-bind="name"]').first()).toHaveText('Newcomer');

    // Creating wrote the roster index fine; Elara's changes are still held.
    await expect(alertCard(page)).toBeVisible();
    expect(await appAttr(page, 'data-storage')).toBe('failing');
    await openRow(page, 'Elara');
    await expect(healthNow(page)).toHaveText('4');
  });

  test('a backup made while storage is failing carries the sheet as it is now — and restores it', async ({ page, browser }) => {
    await breakableStorage(page);
    await openApp(page);
    await openFirstCharacter(page);
    await failWrites(page, '^meeple\\.character\\.');

    // Changes of every kind, all refused.
    await applyCalc(page, 'health', 'damage', 3);                  // health 7 → 4
    await press(page, '[data-wound="1"]');                          // wounds 1 → 2
    // A Wound costs Elara a boon, and the app says so. Dismissed, not tested.
    if ((await appAttr(page, 'data-modal')) !== 'closed') await closeModal(page);
    await press(page, '[data-tab="notes"]');
    await press(page, '[data-note-add]');
    await page.fill('[data-note-title]', 'Held note');
    await page.fill('[data-note-body]', 'Written while storage refused.');
    await press(page, '[data-note-save]');
    await press(page, '[data-tab="action"]');
    await press(page, '[data-inv-add]');
    await page.fill('[data-item-name]', 'Held trinket');
    await page.locator('[data-item-name]').dispatchEvent('input');
    await press(page, '[data-item-save]');
    const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR42mP8z8AARMQBxlGFoxQAAN4MAwmFx/0bAAAAAElFTkSuQmCC', 'base64');
    await chooseFile(page, '.portrait-drop[data-portrait-pick]', { name: 'face.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.locator('[data-portrait-img]').first()).toHaveAttribute('src', /^data:image\//);
    await press(page, '[data-nav="edit"]');
    await page.fill('[data-id-name]', 'Elara Held');
    await page.locator('[data-id-name]').dispatchEvent('input');
    await press(page, '[data-id-save]');
    await expect(page.locator('[data-toast-text]')).toHaveText('Updated for this session only — not saved.');

    // Follow the alert to Settings and back up.
    await press(page, '[data-storage-alert-text]');
    await expect.poll(() => appAttr(page, 'data-view')).toBe('settings');
    const backup = await download(page, '[data-backup-export]');
    const got = backup.json.characters[0];
    expect(got.name).toBe('Elara Held');
    expect([got.health, got.wounds]).toEqual([4, 2]);
    expect(got.notes.map((n) => n.title)).toContain('Held note');
    expect(got.inventory.map((i) => i.title)).toContain('Held trinket');
    expect(got.portrait).toMatch(/^data:image\//);

    // Field for field: storage recovers, the next write stores the sheet as
    // it is in memory, and the backup must equal exactly that.
    await healWrites(page);
    await press(page, '[data-nav="characters"]');
    await press(page, '[data-open-character]');
    await applyCalc(page, 'health', 'damage', 1);                  // two writes that cancel out
    await applyCalc(page, 'health', 'heal', 1);
    const { id: _id, portrait, ...fields } = got;
    expect(fields).toEqual(await storedSave(page, 'aurelia'));
    expect(portrait).toBe(await page.evaluate(() => localStorage.getItem('meeple.character.aurelia.portrait')));

    // And it restores, in a browser that has never seen this character.
    const fresh = await browser.newContext();
    const other = await fresh.newPage();
    await openApp(other);
    const restored = await importFromSettings(other, {
      name: backup.name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup.json)),
    }, 'overwrite');
    expect(restored.state).toBe('ok');
    expect(await storedSave(other, 'aurelia')).toEqual(fields);
    await fresh.close();
  });
});

/* Round-2 review, finding 5: a save from before the health floor, holding the
   negative health that the old negative maximum let a rest write. It loads
   standing at full health — 1, the floor — not on 0/1 (designer ruling
   2026-11-13; settleHealth() in mechanics.js). */
test('a legacy save with negative health while standing loads at full health', async ({ page }) => {
  const fs = require('fs');
  const elara = JSON.parse(fs.readFileSync(fixture('backup.meeple.json'), 'utf8')).characters[0];
  const { id: _id, portrait: _p, ...save } = elara;
  save.inventory = [{ id: 'inv-curse', title: 'Leaden Heart', desc: '', mods: [{ stat: 'Constitution', value: -20 }] }];
  save.health = -10;
  save.wounds = 1;
  await openApp(page, { saves: { aurelia: save } });
  await openFirstCharacter(page);

  await expect(page.locator('[data-bind="healthMax"]').first()).toHaveText('1');
  await expect(healthNow(page)).toHaveText('1');
  expect(await page.locator('[data-wound].is-on').count()).toBe(1);   // no Wound added
});

/* An install from before the roster existed, holding a save from before the
   gear catalog used library ids: armour stored as the bare proficiency name
   ("Light") and held items under ids that no longer exist. applySave() must
   upgrade what it can (the armour resolves through the library's own `prof`)
   and drop what it can't (the dead ids), and loadRoster() must index the
   lone save — all without an error. This scenario used to live in a manual
   page, _seed_tmp.html, that nothing ran; it runs on every `npm test` now. */
test('an old pre-roster save with stale gear ids loads, upgraded', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('legacy-seeded')) return;
    sessionStorage.setItem('legacy-seeded', '1');
    // Exactly what _seed_tmp.html wrote. No meeple.roster key: pre-roster.
    localStorage.setItem('meeple.character.aurelia', JSON.stringify({
      health: 7, mana: 4, wounds: 1, notes: '', armorWorn: 'Light',
      hands: ['w-1h-melee', 'shield-armor'],     // stale ids
      inventory: [], effects: [],
    }));
  });
  await openApp(page);
  await openFirstCharacter(page);

  // Resources carried over.
  await expect(page.locator('[data-bind="healthCur"]').first()).toHaveText('7');
  await expect(page.locator('[data-bind="manaCur"]').first()).toHaveText('4');
  await expect(page.locator('[data-wound].is-on')).toHaveCount(1);

  // Armour upgraded to its library entry; the dead hand ids dropped, not
  // rendered as blank rows.
  await press(page, '[data-tab="gear"]');
  await expect(page.locator('.screen--sheet [data-detail="armor"]')).toContainText('Light Armor');
  await expect(page.locator('.screen--sheet [data-detail^="hands:"]')).toHaveCount(0);

  // And the next save writes the upgraded shape, indexed in a roster.
  await press(page, '[data-step="health:-1"]');
  const stored = await page.evaluate(() => ({
    save: JSON.parse(localStorage.getItem('meeple.character.aurelia')),
    roster: JSON.parse(localStorage.getItem('meeple.roster')),
  }));
  expect(stored.save).toMatchObject({ armorWorn: 'armor.light', hands: [], health: 6 });
  expect(stored.roster.ids).toEqual(['aurelia']);
});
