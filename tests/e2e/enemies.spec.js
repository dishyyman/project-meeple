/* =====================================================================
   MEEPLE — Game Master Tools, phase 3: enemies, monster files, backups
   ---------------------------------------------------------------------
   docs/testing.md §5, Flows 16, 17 and 19. Pins:
     · Add Enemy opens the Monster Compendium: the stock three, the GM's
       own, a tap adds a COPY; New Enemy saves to the campaign and the
       compendium; a monster file imports into the compendium; the GM's own
       can be removed (with Undo), the stock ones cannot; deleting from a
       campaign never touches the compendium;
     · a stat card is made, checked (name, dice), shown and rolled;
     · an ENEMY's roll crits on a natural 20 only — never on the open
       character's Lethality;
     · edit, duplicate, delete;
     · a monster file exports, imports as copies, and refuses what is not
       one; a hostile one is text;
     · Settings → Backup carries campaigns, and restores them in place or
       as copies — including a backup with campaigns and no characters.
   ===================================================================== */
const { test, expect } = require('./helpers/test');
const {
  openApp, press, appAttr, openFirstCharacter, closeModal, download, readResult,
  breakableStorage, failWrites, healWrites,
} = require('./helpers/app');

async function newCampaign(page, name = 'The Ashen Road') {
  await press(page, '[data-nav="campaigns"]');
  await press(page, '[data-campaign-new]');
  await page.fill('[data-campaign-name]', name);
  await press(page, '[data-campaign-save]');
  await expect.poll(() => appAttr(page, 'data-view')).toBe('campaign');
  await press(page, '.tabbar__btn[data-campaign-tab="enemies"]');
}

// Add Enemy → the Monster Compendium → New Enemy: the editor.
async function openNewEnemy(page) {
  await page.getByRole('button', { name: 'Add Enemy' }).click();
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('monsters');
  await page.locator('.modal--monsters').getByRole('button', { name: 'New Enemy' }).click();
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('enemy-form');
}

// Import Monster File, from inside the compendium sheet (opened if need be).
async function importMonsterFile(page, file) {
  if (await appAttr(page, 'data-modal') !== 'monsters') await page.getByRole('button', { name: 'Add Enemy' }).click();
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('.modal--monsters').getByRole('button', { name: 'Import Monster File' }).click(),
  ]);
  await chooser.setFiles(file);
}

const compendiumNames = (page) => page.locator('.modal--monsters .action-sheet__label').allInnerTexts();
const storedMonsters = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('meeple.bestiary') || '{"monsters":[]}').monsters);

// The editor, filled in the way a GM does.
async function makeOgre(page) {
  await openNewEnemy(page);
  await page.fill('[data-enemy-field="name"]', 'Ogre Brute');
  await page.fill('[data-enemy-field="tags"]', 'Boss, Large');
  await page.fill('[data-enemy-field="turns"]', '2');
  await page.fill('[data-enemy-field="hp"]', '40');
  await page.fill('[data-enemy-field="armor"]', '3');
  const row = page.locator('[data-attack-row]').first();
  await row.locator('[data-attack-field="name"]').fill('Greatclub');
  await row.locator('[data-attack-field="toHit"]').fill('5');
  await row.locator('[data-attack-field="damage"]').fill('2d8+3');
  await row.locator('[data-attack-field="desc"]').fill('Knockback 2');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('[data-enemy] .collapse__title', { hasText: 'Ogre Brute' })).toHaveCount(1);
}

const stored = (page) => page.evaluate(() => {
  const { ids } = JSON.parse(localStorage.getItem('meeple.campaigns'));
  return ids.map((id) => JSON.parse(localStorage.getItem(`meeple.campaign.${id}`)));
});

test('a stat card: checked as it is made, summarised closed, whole when open', async ({ page }) => {
  await openApp(page);
  await newCampaign(page);
  await expect(page.locator('[data-block="enemiesEmpty"]')).toBeVisible();
  await expect(page.locator('[data-enemies-export]')).toBeHidden();

  await openNewEnemy(page);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('[data-enemy-error]')).toHaveText('An enemy needs a name.');
  await page.fill('[data-enemy-field="name"]', 'Goblin');
  await page.locator('[data-attack-row] [data-attack-field="damage"]').fill('1d6+');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('[data-attack-error="0"]')).toBeVisible();      // said under its own row
  expect(await appAttr(page, 'data-modal')).toBe('enemy-form');             // nothing written
  await page.getByRole('button', { name: 'Cancel' }).click();

  await makeOgre(page);
  const card = page.locator('[data-enemy]');
  await expect(card.locator('.collapse__title')).toHaveText('Ogre Brute');
  await expect(card.locator('.collapse__sub')).toHaveText('HP 40 · Evasion 10 · Armor +3 · 2 turns');
  await card.locator('.collapse__toggle').click();
  await expect(card.locator('.enemy__tag--boss')).toHaveText('Boss');
  await expect(card.locator('.gear-row__name')).toHaveText('Greatclub');
  await expect(card.locator('[data-roll="tohit"]')).toHaveText('+5');
  await expect(card.locator('[data-roll="damage"]')).toHaveText('2d8+3');
  await expect(page.locator('[data-enemies-export]')).toBeVisible();
  expect((await stored(page))[0].enemies[0]).toMatchObject({ name: 'Ogre Brute', turns: 2, tags: ['Boss', 'Large'] });
});

test('Add Enemy opens the Monster Compendium: stock goblins, tap to add a copy, your own saved there too', async ({ page }) => {
  await openApp(page);
  await newCampaign(page);
  await page.getByRole('button', { name: 'Add Enemy' }).click();
  expect(await appAttr(page, 'data-modal')).toBe('monsters');
  expect(await compendiumNames(page)).toEqual(['Goblin 1', 'Goblin 2', 'Goblin 3']);
  await expect(page.locator('.modal--monsters .monster-row__stock')).toHaveCount(3);
  await expect(page.locator('.modal--monsters [data-monster-remove]')).toHaveCount(0);
  await expect(page.locator('.modal--monsters .action-sheet__note').first()).toHaveText('HP 10 · Evasion 10 · Armor 0');

  // A tap adds a copy and leaves the sheet open for the next.
  await page.locator('[data-monster-add="stock_goblin_1"]').click();
  await expect(page.locator('.toast')).toContainText('Goblin 1 added.');
  await page.locator('[data-monster-add="stock_goblin_2"]').click();
  expect(await appAttr(page, 'data-modal')).toBe('monsters');
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('[data-enemy] .collapse__title')).toHaveText(['Goblin 1', 'Goblin 2']);
  const [c] = await stored(page);
  expect(c.enemies[0].id).not.toBe('stock_goblin_1');               // a copy, never the built-in
  expect(c.enemies[0].stats).toMatchObject({ hp: 10, evasion: 10, armor: 0, fortitude: 8, speed: 5 });

  // New Enemy: saved here AND to the compendium, each its own copy.
  await makeOgre(page);
  await expect(page.locator('.toast')).toContainText('Ogre Brute saved here and to the compendium.');
  const [mine] = await storedMonsters(page);
  expect(mine.name).toBe('Ogre Brute');
  expect(mine.id).not.toBe((await stored(page))[0].enemies[2].id);

  // Editing or deleting the campaign's copy never touches the compendium.
  await page.locator('[data-enemy-menu]').nth(2).click();
  await page.locator('.modal--enemy-menu').getByRole('button', { name: 'Delete' }).click();
  await page.locator('.modal--enemy-del').getByRole('button', { name: 'Delete' }).click();
  expect((await stored(page))[0].enemies).toHaveLength(2);
  expect((await storedMonsters(page)).map((m) => m.name)).toEqual(['Ogre Brute']);

  // Another campaign draws from the same compendium.
  await newCampaign(page, 'Second');
  await page.getByRole('button', { name: 'Add Enemy' }).click();
  expect(await compendiumNames(page)).toEqual(['Goblin 1', 'Goblin 2', 'Goblin 3', 'Ogre Brute']);

  // The GM's own can be removed — with Undo — and survive a reload.
  await page.getByRole('button', { name: 'Remove Ogre Brute from the compendium' }).click();
  expect(await compendiumNames(page)).toEqual(['Goblin 1', 'Goblin 2', 'Goblin 3']);
  await page.locator('[data-toast-action]').click();
  expect(await compendiumNames(page)).toEqual(['Goblin 1', 'Goblin 2', 'Goblin 3', 'Ogre Brute']);
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.app')?.getAttribute('data-view') === 'home');
  expect((await storedMonsters(page)).map((m) => m.name)).toEqual(['Ogre Brute']);
});

/* Elara has Lethality 1, so a natural 19 crits for HER. Every die is forced
   to land on 19: her roll is a Critical Strike, the Ogre's is not — and a
   natural 20 crits for the Ogre too. */
test('an enemy crits on a natural 20 only, never on the open character\'s Lethality', async ({ page }) => {
  await openApp(page);
  const force = (r) => page.evaluate((v) => { Math.random = () => v; }, r);
  const crit = page.locator('[data-crit]');

  await openFirstCharacter(page);
  await force(0.9);                                            // a d20 lands on 19
  await press(page, '[data-roll="tohit"]');
  await expect(crit).toBeVisible({ timeout: 5000 });
  await page.keyboard.press('Escape');

  await newCampaign(page);
  await force(0.5);
  await makeOgre(page);
  await page.locator('[data-enemy] .collapse__toggle').click();
  await force(0.9);
  await page.locator('[data-enemy] [data-roll="tohit"]').click();
  await expect(page.locator('[data-bind="outTotal"]')).toHaveText('24', { timeout: 5000 });
  await expect(crit).toBeHidden();
  await expect(page.locator('[data-bind="outSource"]')).toHaveText('Ogre Brute · Greatclub');

  await force(0.99);                                           // a natural 20
  await page.locator('[data-roll-again]').click();
  await expect(crit).toBeVisible({ timeout: 5000 });
});

test('edit, duplicate and delete a stat card', async ({ page }) => {
  await openApp(page);
  await newCampaign(page);
  await makeOgre(page);

  await page.locator('[data-enemy-menu]').click();
  await page.locator('.modal--enemy-menu').getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('[data-enemy-field="hp"]')).toHaveValue('40');
  await page.fill('[data-enemy-field="hp"]', '55');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('[data-enemy] .collapse__sub')).toContainText('HP 55');

  await page.locator('[data-enemy-menu]').click();
  await page.locator('.modal--enemy-menu').getByRole('button', { name: /Duplicate/ }).click();
  await expect(page.locator('[data-enemy] .collapse__title')).toHaveText(['Ogre Brute', 'Ogre Brute (copy)']);
  const [a, b] = (await stored(page))[0].enemies;
  expect(b.id).not.toBe(a.id);

  await page.locator('[data-enemy-menu]').nth(1).click();
  await page.locator('.modal--enemy-menu').getByRole('button', { name: 'Delete' }).click();
  expect(await appAttr(page, 'data-modal')).toBe('enemy-del');
  await page.locator('.modal--enemy-del').getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('[data-enemy] .collapse__title')).toHaveText(['Ogre Brute']);
});

test('a monster file: exported, imported as copies, and refused when it is not one', async ({ page }) => {
  await openApp(page);
  await newCampaign(page, 'First');
  await makeOgre(page);
  const { name, json } = await download(page, '[data-enemies-export]');
  expect(name).toBe('first-enemies.meeple.json');
  expect(json.meepleBestiary).toMatchObject({ schemaVersion: 1, title: 'First' });
  expect(json.enemies[0]).toMatchObject({ name: 'Ogre Brute', stats: { hp: 40, armor: 3 } });
  expect('rev' in json.enemies[0]).toBe(false);

  // Into the COMPENDIUM, not the campaign: the sheet lists it after the
  // stock three and the Ogre New Enemy already put there; the campaign
  // gains nothing until the GM taps one.
  await newCampaign(page, 'Second');
  const file = { name: 'ogre.meeple.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(json)) };
  await importMonsterFile(page, file);
  await expect(page.locator('.toast')).toContainText('Ogre Brute added to the compendium.');
  expect(await compendiumNames(page)).toEqual(['Goblin 1', 'Goblin 2', 'Goblin 3', 'Ogre Brute', 'Ogre Brute']);
  expect((await stored(page)).find((c) => c.name === 'Second').enemies).toEqual([]);
  // Tapped twice: two copies, each its own card with its own id.
  const row = page.locator('.modal--monsters [data-monster-add]').nth(4);
  await row.click();
  await row.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-enemy] .collapse__title')).toHaveText(['Ogre Brute', 'Ogre Brute']);
  const second = (await stored(page)).find((c) => c.name === 'Second');
  expect(new Set(second.enemies.map((e) => e.id)).size).toBe(2);

  // A character file is not a monster file.
  await importMonsterFile(page, require('path').join(__dirname, '..', 'fixtures', 'files', 'elara.meeple.json'));
  const r = await readResult(page);
  expect(r).toMatchObject({ state: 'error', title: 'Not a monster file' });
});

test('a hostile monster file is text, and its bad dice are dropped', async ({ page }) => {
  await openApp(page);
  await newCampaign(page);
  const evil = { meepleBestiary: { schemaVersion: 1 }, enemies: [{
    id: '"><img src=x onerror="window.__pwned=1">', name: '<img src=x onerror="window.__pwned=1">Imp',
    attacks: [{ name: '<b>Bite</b>', damage: '1d6);alert(1' }],
  }] };
  await importMonsterFile(page, { name: 'evil.meeple.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(evil)) });
  await expect(page.locator('.modal--monsters .action-sheet__label').nth(3)).toHaveText('<img src=x onerror="window.__pwned=1">Imp');
  await page.locator('.modal--monsters [data-monster-add]').nth(3).click();
  await page.keyboard.press('Escape');
  const card = page.locator('[data-enemy]');
  await expect(card.locator('.collapse__title')).toHaveText('<img src=x onerror="window.__pwned=1">Imp');
  await card.locator('.collapse__toggle').click();
  await expect(card.locator('[data-roll="damage"]')).toHaveCount(0);
  expect(await page.locator('[data-list="enemies"] img, [data-list="monsters"] img').count()).toBe(0);
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
});

test('Settings → Backup carries campaigns; restore in place, or as a copy', async ({ page }) => {
  await openApp(page);
  await newCampaign(page);
  await makeOgre(page);
  const [original] = await stored(page);

  await press(page, '[data-nav="settings"]');
  // New Enemy put the Ogre in the compendium too, so the backup has one.
  await expect(page.locator('[data-bind="backupNote"]')).toHaveText('1 character · 1 campaign · 1 monster');
  const { json } = await download(page, '[data-backup-export]');
  expect(json.meepleCharacter.schemaVersion).toBe(1);          // an optional array: no bump
  expect(json.characters).toHaveLength(1);
  expect(json.campaigns[0]).toMatchObject({ id: original.id, name: 'The Ashen Road' });
  expect(json.campaigns[0].enemies[0].name).toBe('Ogre Brute');
  expect(json.bestiary.map((m) => m.name)).toEqual(['Ogre Brute']);   // the GM's own; never the stock three

  // Lose the campaign, then restore the backup in place.
  await press(page, '[data-nav="campaigns"]');
  await press(page, '[data-campaigns-edit]');
  await press(page, `[data-campaign-del="${original.id}"]`);
  await press(page, '[data-campaign-del-confirm]');
  expect(await stored(page)).toEqual([]);

  const restore = async (button) => {
    await press(page, '[data-nav="settings"]');
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), press(page, '[data-file-open="characters"]')]);
    await chooser.setFiles({ name: 'meeple-backup.meeple.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(json)) });
    await expect.poll(() => appAttr(page, 'data-modal')).toBe('file-ask');
    await expect(page.locator('[data-bind="fileAskText"]')).toContainText('the campaign The Ashen Road');
    await page.locator('.modal--file-ask').getByRole('button', { name: button }).click();
    return readResult(page);
  };
  const r1 = await restore('Overwrite Matching');
  expect(r1.state).toBe('ok');
  expect(r1.text).toContain('The Ashen Road was added to your campaigns.');
  const [back] = await stored(page);
  expect(back.id).toBe(original.id);
  expect(back.enemies[0].name).toBe('Ogre Brute');

  // Again, as new: a second campaign under a fresh id.
  await page.keyboard.press('Escape');
  const r2 = await restore('Add All as New');
  expect(r2.state).toBe('ok');
  const both = await stored(page);
  expect(both).toHaveLength(2);
  expect(both[1].id).not.toBe(original.id);
});

test('a backup of campaigns and no characters restores, and the Characters import declines it', async ({ page }) => {
  await openApp(page);
  const file = {
    meepleCharacter: { schemaVersion: 1, exported: '2026-11-13', library: { title: 'x', version: '0' } },
    characters: [],
    campaigns: [{ id: 'gm1', name: 'Goblin Market', heroes: [], enemies: [{ name: 'Goblin', stats: { hp: 6 } }] }],
  };
  const upload = { name: 'gm.meeple.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) };

  await press(page, '[data-nav="characters"]');
  let [chooser] = await Promise.all([page.waitForEvent('filechooser'), press(page, '[data-import-open]')]);
  await chooser.setFiles(upload);
  expect(await readResult(page)).toMatchObject({ state: 'error', title: 'No characters in that file' });
  await page.keyboard.press('Escape');

  await press(page, '[data-nav="settings"]');
  [chooser] = await Promise.all([page.waitForEvent('filechooser'), press(page, '[data-file-open="characters"]')]);
  await chooser.setFiles(upload);
  await expect(page.locator('#file-ask-title')).toHaveText('Import this campaign?');
  await page.locator('.modal--file-ask').getByRole('button', { name: 'Restore in Place' }).click();
  expect(await readResult(page)).toMatchObject({ state: 'ok', title: 'Campaign imported' });
  const [c] = await stored(page);
  expect(c).toMatchObject({ id: 'gm1', name: 'Goblin Market' });
  expect(c.enemies[0].stats.hp).toBe(6);
});

test('a backup carries the GM\'s own monsters; restoring matches them by id', async ({ page }) => {
  await openApp(page);
  const file = {
    meepleCharacter: { schemaVersion: 1, exported: '2026-11-14', library: { title: 'x', version: '0' } },
    characters: [],
    bestiary: [{ id: 'enemy_wraith', name: 'Wraith', stats: { hp: 30, evasion: 12 } }, { id: 'stock_goblin_1', name: 'Not a goblin' }],
  };
  const upload = { name: 'gm.meeple.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) };
  const restore = async (button) => {
    await press(page, '[data-nav="settings"]');
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), press(page, '[data-file-open="characters"]')]);
    await chooser.setFiles(upload);
    await expect(page.locator('#file-ask-title')).toHaveText('Import these monsters?');
    await page.locator('.modal--file-ask').getByRole('button', { name: button }).click();
    return readResult(page);
  };
  expect(await restore('Restore in Place')).toMatchObject({ state: 'ok', title: 'Monsters imported' });
  const once = await storedMonsters(page);
  // Kept under its own id; a stock id is never shadowed — it gets a fresh one.
  expect(once.map((m) => m.name)).toEqual(['Wraith', 'Not a goblin']);
  expect(once[0].id).toBe('enemy_wraith');
  expect(once[1].id).not.toBe('stock_goblin_1');
  await page.keyboard.press('Escape');
  // The same file again: the Wraith is already here, so it is not doubled.
  const again = await restore('Add All as New');
  expect(again.text).toContain('1 monster was added');
  expect((await storedMonsters(page)).filter((m) => m.name === 'Wraith')).toHaveLength(1);
});

/* ---------------------------------------------------------------------
   The compendium says where a monster actually went
   ---------------------------------------------------------------------
   Codex review 2026-11-14: New Enemy said "saved to the compendium" when the
   compendium was full or its write was refused, and a monster file that did
   not fit (or did not save) still reported everything added. Every ending
   is now said in words, and nothing stays in memory that a reload would not
   bring back. */

// The GM's own compendium, `n` entries deep, in place before the app boots.
async function fullCompendium(page, n) {
  await page.addInitScript((count) => {
    if (sessionStorage.getItem('compendium-seeded')) return;
    sessionStorage.setItem('compendium-seeded', '1');
    const monsters = Array.from({ length: count }, (_, i) => ({ id: `enemy_seed${i}`, name: `Seed ${i}`, stats: { hp: 5 } }));
    localStorage.setItem('meeple.bestiary', JSON.stringify({ monsters }));
  }, n);
}

const monsterFile = (names) => ({
  name: 'pack.meeple.json', mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify({
    meepleBestiary: { schemaVersion: 1, title: 'Pack' },
    enemies: names.map((name) => ({ name, stats: { hp: 8 } })),
  })),
});

test('a compendium near full: a file is taken in part, New Enemy says it missed, a full one refuses', async ({ page }) => {
  await fullCompendium(page, 199);
  await openApp(page);
  await newCampaign(page);

  // One space, three in the file: one goes in, and the toast says two did not.
  await importMonsterFile(page, monsterFile(['Wolf', 'Bear', 'Boar']));
  await expect(page.locator('.toast')).toContainText('Wolf added to the compendium. It is full, so the other 2 were left out.');
  expect((await storedMonsters(page)).length).toBe(200);
  await page.keyboard.press('Escape');

  // Full: New Enemy still saves to the campaign, and says the compendium missed it.
  await makeOgre(page);
  await expect(page.locator('.toast')).toContainText('Ogre Brute saved. The compendium is full (200), so it was not added there.');
  expect((await stored(page))[0].enemies.map((e) => e.name)).toEqual(['Ogre Brute']);
  expect((await storedMonsters(page)).some((m) => m.name === 'Ogre Brute')).toBe(false);

  // Full, and a file: refused in words, nothing changed.
  await importMonsterFile(page, monsterFile(['Stag']));
  expect(await readResult(page)).toMatchObject({ state: 'error', title: 'The compendium is full' });
  expect((await storedMonsters(page)).length).toBe(200);
});

test('a compendium write the browser refuses is taken back and said, for New Enemy and a file', async ({ page }) => {
  await breakableStorage(page);
  await openApp(page);
  await newCampaign(page);
  await failWrites(page, '^meeple\\.bestiary$');

  await makeOgre(page);
  await expect(page.locator('.toast')).toContainText('Ogre Brute saved, but not to the compendium — this browser’s storage is full or blocked.');
  expect((await stored(page))[0].enemies.map((e) => e.name)).toEqual(['Ogre Brute']);   // the campaign copy landed
  expect(await storedMonsters(page)).toEqual([]);
  // Taken back, so memory agrees with disk: the sheet lists the stock three only,
  // and there is nothing unsaved for the storage alert to stand up about.
  await page.getByRole('button', { name: 'Add Enemy' }).click();
  expect(await compendiumNames(page)).toEqual(['Goblin 1', 'Goblin 2', 'Goblin 3']);
  await expect(page.locator('.storage-alert__card')).toBeHidden();

  await importMonsterFile(page, monsterFile(['Wolf', 'Bear']));
  expect(await readResult(page)).toMatchObject({ state: 'error', title: 'Nothing was imported' });
  await closeModal(page);
  await page.getByRole('button', { name: 'Add Enemy' }).click();
  expect(await compendiumNames(page)).toEqual(['Goblin 1', 'Goblin 2', 'Goblin 3']);

  // Storage back: the next New Enemy lands in both, as it always did.
  await healWrites(page);
  await page.keyboard.press('Escape');
  await openNewEnemy(page);
  await page.fill('[data-enemy-field="name"]', 'Troll');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('.toast')).toContainText('Troll saved here and to the compendium.');
  expect((await storedMonsters(page)).map((m) => m.name)).toEqual(['Troll']);
});
