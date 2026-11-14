/* =====================================================================
   MEEPLE — Game Master Tools, phase 3: enemies, monster files, backups
   ---------------------------------------------------------------------
   docs/testing.md §5, Flows 16 and 17. Pins:
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
const { openApp, press, appAttr, openFirstCharacter, download, readResult } = require('./helpers/app');

async function newCampaign(page, name = 'The Ashen Road') {
  await press(page, '[data-nav="campaigns"]');
  await press(page, '[data-campaign-new]');
  await page.fill('[data-campaign-name]', name);
  await press(page, '[data-campaign-save]');
  await expect.poll(() => appAttr(page, 'data-view')).toBe('campaign');
  await press(page, '.tabbar__btn[data-campaign-tab="enemies"]');
}

// The editor, filled in the way a GM does.
async function makeOgre(page) {
  await page.getByRole('button', { name: 'New Enemy' }).click();
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
  await expect(page.locator('[data-enemy]')).toHaveCount(1);
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

  await page.getByRole('button', { name: 'New Enemy' }).click();
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

  // Into another campaign, twice: two copies, each its own card.
  await newCampaign(page, 'Second');
  const file = { name: 'ogre.meeple.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(json)) };
  for (let i = 0; i < 2; i++) {
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('[data-enemies-import]').click()]);
    await chooser.setFiles(file);
  }
  await expect(page.locator('[data-enemy] .collapse__title')).toHaveText(['Ogre Brute', 'Ogre Brute']);
  const second = (await stored(page)).find((c) => c.name === 'Second');
  expect(new Set(second.enemies.map((e) => e.id)).size).toBe(2);

  // A character file is not a monster file.
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('[data-enemies-import]').click()]);
  await chooser.setFiles(require('path').join(__dirname, '..', 'fixtures', 'files', 'elara.meeple.json'));
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
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('[data-enemies-import]').click()]);
  await chooser.setFiles({ name: 'evil.meeple.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(evil)) });
  const card = page.locator('[data-enemy]');
  await expect(card.locator('.collapse__title')).toHaveText('<img src=x onerror="window.__pwned=1">Imp');
  await card.locator('.collapse__toggle').click();
  await expect(card.locator('[data-roll="damage"]')).toHaveCount(0);
  expect(await page.locator('[data-list="enemies"] img').count()).toBe(0);
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
});

test('Settings → Backup carries campaigns; restore in place, or as a copy', async ({ page }) => {
  await openApp(page);
  await newCampaign(page);
  await makeOgre(page);
  const [original] = await stored(page);

  await press(page, '[data-nav="settings"]');
  await expect(page.locator('[data-bind="backupNote"]')).toHaveText('1 character · 1 campaign');
  const { json } = await download(page, '[data-backup-export]');
  expect(json.meepleCharacter.schemaVersion).toBe(1);          // an optional array: no bump
  expect(json.characters).toHaveLength(1);
  expect(json.campaigns[0]).toMatchObject({ id: original.id, name: 'The Ashen Road' });
  expect(json.campaigns[0].enemies[0].name).toBe('Ogre Brute');

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
