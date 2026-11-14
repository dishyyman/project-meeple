/* =====================================================================
   MEEPLE — Game Master Tools, phase 4: the Combat tab
   ---------------------------------------------------------------------
   docs/testing.md §5, Flow 18. No initiative ORDER (designer ruling,
   2026-11-13): the GM picks who acts next from everyone with a turn left,
   ends that turn, and a new round gives every turn back. These pin:
     · Start Combat: the whole party joins, the GM sets each enemy's count
       and whether a group shares one turn — and there is no surprise round;
     · the line: Up Next → Acting now → Gone This Round, a boss with three
       turns staying up until all three are spent, and the ROUND COUNT
       going up when everyone has gone;
     · damage takes Armor off (Armor Piercing the way out), per goblin;
     · DOWN stays in the list, greyed, is skipped when deciding the round is
       over, and can still be picked (designer ruling, 2026-11-14);
     · the ✎ on an enemy: heal by hand (even when down), a Boon or
       Condition, a Wound cleared, Back to Full — this fight only;
     · End Fight asks; heroes keep their vitals, stat cards are untouched;
     · the fight survives a reload, and leaves with a deleted stat card.
   ===================================================================== */
const { test, expect } = require('./helpers/test');
const { openApp, press, appAttr } = require('./helpers/app');

/* A campaign written straight into storage, where saveCampaign() would put
   it — two typed-in heroes and two stat cards — then a reload, so the app
   reads it through normalizeCampaign() like any other. */
const block = (evasion, armor, fortitude, speed) => ({ evasion, armor, fortitude, speed });
const CAMPAIGN = {
  id: 'cmp_test', name: 'The Ashen Road', subtitle: '',
  heroes: [
    { id: 'hero_elara', name: 'Elara', source: 'manual',
      card: { healthBase: 20, manaMax: 0, woundsMax: 3, patchesMax: 2, base: block(8, 0, 8, 5), build: block(12, 2, 9, 5) },
      vitals: { health: 20, mana: 0, wounds: 0, patches: 2, effects: [] } },
    { id: 'hero_brom', name: 'Brom', source: 'manual',
      card: { healthBase: 24, manaMax: 0, woundsMax: 3, patchesMax: 2, base: block(8, 0, 8, 5), build: block(9, 4, 10, 4) },
      vitals: { health: 24, mana: 0, wounds: 0, patches: 2, effects: [] } },
  ],
  enemies: [
    { id: 'enemy_goblin', name: 'Goblin', tags: [], turns: 1,
      stats: { hp: 6, mana: 0, wounds: 0, evasion: 11, armor: 1, fortitude: 7, speed: 6 },
      attacks: [{ id: 'atk_g', name: 'Rusty Blade', toHit: 3, damage: '1d6+1' }] },
    { id: 'enemy_ogre', name: 'Ogre Brute', tags: ['Boss'], turns: 3,
      stats: { hp: 40, mana: 0, wounds: 2, evasion: 10, armor: 3, fortitude: 8, speed: 4 },
      attacks: [{ id: 'atk_o', name: 'Greatclub', toHit: 5, damage: '2d8+3' }] },
  ],
  combat: null,
};

async function openCampaign(page, { combat = null } = {}) {
  await openApp(page);
  await page.evaluate((c) => {
    localStorage.setItem('meeple.campaigns', JSON.stringify({ ids: [c.id], activeId: c.id }));
    localStorage.setItem(`meeple.campaign.${c.id}`, JSON.stringify(c));
  }, { ...CAMPAIGN, combat });
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.app')?.getAttribute('data-view') === 'home');
  await press(page, '[data-nav="campaigns"]');
  await press(page, '[data-open-campaign="cmp_test"]');
  await press(page, '.tabbar__btn[data-campaign-tab="combat"]');
}

const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('meeple.campaign.cmp_test')));

// Start Combat with `counts` ({ Goblin: 3 }) and the names that share a turn.
async function startFight(page, counts, share = []) {
  await page.getByRole('button', { name: 'Start Combat' }).click();
  expect(await appAttr(page, 'data-modal')).toBe('combat-start');
  for (const [name, n] of Object.entries(counts)) {
    for (let i = 0; i < n; i++) await page.getByRole('button', { name: `One more ${name}` }).click();
  }
  for (const name of share) {
    await page.locator('.combat-start__row', { hasText: name }).getByLabel('Share one turn').check();
  }
  await page.locator('[data-combat-start]').click();
  await expect(page.locator('[data-bind="combatRound"]')).toHaveText('✦ Round 1 ✦');
}

const fighter = (page, name) => page.locator('.fighter', { has: page.locator('.fighter__name', { hasText: name }) });
const nextNames = (page) => page.locator('[data-list="combatNext"] .fighter__name').allInnerTexts();
const doneNames = (page) => page.locator('[data-list="combatDone"] .fighter__name').allInnerTexts();
const go = (page, name) => fighter(page, name).locator('[data-combat-pick]').click();
const endTurn = (page) => page.getByRole('button', { name: 'End Turn' }).click();

// A hit through the calculator: the track (or the ✎'s Health) opens it.
async function hitWith(page, opener, amount, { pierce = false, heal = false } = {}) {
  await opener.click();
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('calc');
  await page.fill('[data-calc-input]', String(amount));
  if (pierce) await page.locator('[data-pierce-toggle]').click();
  await page.locator(`.modal--calc [data-calc-apply="${heal ? 'heal' : 'damage'}"]`).click();
}
const member = (page, label) => page.locator('.fighter__member', { has: page.locator('.fighter__member-name', { hasText: label }) });
const hp = (loc) => loc.locator('.vital[data-resource="health"] .vital__value').first();

test('Start Combat: the whole party joins, the GM picks each enemy — and there is no surprise round', async ({ page }) => {
  await openCampaign(page);
  await expect(page.locator('[data-block="combatIdle"]')).toBeVisible();
  await expect(page.locator('[data-combat-end-open]')).toBeHidden();

  await page.getByRole('button', { name: 'Start Combat' }).click();
  await expect(page.locator('[data-bind="combatParty"]')).toHaveText('The whole party joins: Elara and Brom.');
  await expect(page.locator('.modal--combat-start')).not.toContainText(/surprise/i);
  // "Share one turn" only once there are two or more of a kind.
  const goblins = page.locator('.combat-start__row', { hasText: 'Goblin' });
  await expect(goblins.getByLabel('Share one turn')).toBeHidden();
  await expect(page.getByRole('button', { name: 'One fewer Goblin' })).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel' }).click();

  await startFight(page, { Goblin: 3, 'Ogre Brute': 1 }, ['Goblin']);
  // Heroes first, then each group in the order it joined.
  expect(await nextNames(page)).toEqual(['Elara', 'Brom', 'Goblin ×3', 'Ogre Brute']);
  await expect(fighter(page, 'Goblin ×3').locator('.fighter__meta')).toHaveText('Sharing one turn');
  await expect(fighter(page, 'Ogre Brute').locator('.fighter__meta')).toHaveText('3 of 3 turns left');
  await expect(page.locator('[data-list="combatNow"]')).toContainText('Pick who goes next');
  await expect(page.locator('[data-block="combatDone"]')).toBeHidden();
  await expect(page.locator('[data-combat-end-open]')).toBeVisible();

  const saved = (await stored(page)).combat;
  expect(saved.round).toBe(1);
  expect('surprise' in saved).toBe(false);
  expect(saved.fighters.map((f) => f.kind)).toEqual(['hero', 'hero', 'enemy', 'enemy']);
  expect(saved.fighters[2].members).toHaveLength(3);
});

test('nobody to fight: Start says so, and nothing is written', async ({ page }) => {
  await openApp(page);
  await press(page, '[data-nav="campaigns"]');
  await press(page, '[data-campaign-new]');
  await page.fill('[data-campaign-name]', 'Empty');
  await press(page, '[data-campaign-save]');
  await press(page, '.tabbar__btn[data-campaign-tab="combat"]');
  await page.getByRole('button', { name: 'Start Combat' }).click();
  await expect(page.locator('[data-block="combatStartEmpty"]')).toBeVisible();
  await page.locator('[data-combat-start]').click();
  await expect(page.locator('[data-combat-start-error]')).toBeVisible();
  expect(await appAttr(page, 'data-modal')).toBe('combat-start');
});

test('the line: pick, act, end the turn — a boss keeps its turns, and the round count goes up', async ({ page }) => {
  await openCampaign(page);
  await startFight(page, { Goblin: 2, 'Ogre Brute': 1 });
  // Not sharing: each goblin is its own fighter, numbered so they can be told apart.
  expect(await nextNames(page)).toEqual(['Elara', 'Brom', 'Goblin 1', 'Goblin 2', 'Ogre Brute']);

  await go(page, 'Elara');
  const now = page.locator('[data-list="combatNow"]');
  await expect(now.locator('.fighter--current .fighter__name')).toHaveText('Elara');
  // Whoever is acting is whole: the four defences are there.
  await expect(now.locator('.combat-cell')).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'End Turn' })).toBeFocused();
  // Picking is not committing: a mis-tap is fixed by picking someone else.
  await go(page, 'Brom');
  await expect(now.locator('.fighter--current .fighter__name')).toHaveText('Brom');
  expect(await nextNames(page)).toContain('Elara');
  await endTurn(page);
  expect(await doneNames(page)).toEqual(['Brom']);

  // The Ogre's three turns: it stays up next until all three are spent, and
  // its attacks roll from the acting card.
  await go(page, 'Ogre Brute');
  await expect(now.locator('[data-roll="tohit"][data-roll-source="enemy"]')).toHaveAttribute('data-roll-label', 'Ogre Brute · Greatclub');
  await endTurn(page);
  await expect(fighter(page, 'Ogre Brute').locator('.fighter__meta')).toHaveText('2 of 3 turns left');
  expect(await nextNames(page)).toContain('Ogre Brute');
  for (let i = 0; i < 2; i++) { await go(page, 'Ogre Brute'); await endTurn(page); }
  expect(await doneNames(page)).toEqual(['Brom', 'Ogre Brute']);

  for (const who of ['Elara', 'Goblin 1', 'Goblin 2']) { await go(page, who); await endTurn(page); }
  await expect(now).toContainText('Everyone has gone this round.');
  const next = page.getByRole('button', { name: 'Start Round 2' });
  await expect(next).toBeFocused();
  await next.click();
  await expect(page.locator('[data-bind="combatRound"]')).toHaveText('✦ Round 2 ✦');
  expect(await nextNames(page)).toHaveLength(5);
  await expect(page.locator('[data-block="combatDone"]')).toBeHidden();

  // Kept over a reload: the round, and who has gone.
  await go(page, 'Elara'); await endTurn(page);
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.app')?.getAttribute('data-view') === 'home');
  await press(page, '[data-nav="campaigns"]');
  await press(page, '[data-open-campaign="cmp_test"]');
  await press(page, '.tabbar__btn[data-campaign-tab="combat"]');
  await expect(page.locator('[data-bind="combatRound"]')).toHaveText('✦ Round 2 ✦');
  expect(await doneNames(page)).toEqual(['Elara']);
});

test('damage takes Armor off per goblin; down stays in the list, greyed, and no longer holds the round', async ({ page }) => {
  await openCampaign(page);
  await startFight(page, { Goblin: 3 }, ['Goblin']);
  const group = fighter(page, 'Goblin ×3');

  // Goblin 2: 10 − Armor 1 = 9 against 6 HP — one health bar, so it is down.
  await hitWith(page, member(page, 'Goblin 2').locator('[data-member-calc="health"]'), 10);
  await expect(hp(member(page, 'Goblin 2'))).toHaveText('0 / 6');
  await expect(member(page, 'Goblin 2')).toHaveAttribute('data-downed', '');
  await expect(member(page, 'Goblin 2').locator('.hero-card__state')).toHaveText('Down');
  await expect(page.locator('.toast')).toContainText('Goblin 2 is down.');
  // Armor Piercing: all 3 land.
  await hitWith(page, member(page, 'Goblin 1').locator('[data-member-calc="health"]'), 3, { pierce: true });
  await expect(hp(member(page, 'Goblin 1'))).toHaveText('3 / 6');
  await expect(group).not.toHaveAttribute('data-out', '');

  // Every goblin down: the group is greyed, still listed and still pickable,
  // but the round closes without it.
  await hitWith(page, member(page, 'Goblin 1').locator('[data-member-calc="health"]'), 9);
  await hitWith(page, member(page, 'Goblin 3').locator('[data-member-calc="health"]'), 9);
  await expect(group).toHaveAttribute('data-out', '');
  await expect(page.locator('[data-list="combatNow"] .status--ok')).toContainText('Every enemy is down.');
  expect(await nextNames(page)).toEqual(['Elara', 'Brom', 'Goblin ×3']);   // down, last
  await expect(group.locator('[data-combat-pick]')).toBeVisible();
  for (const who of ['Elara', 'Brom']) { await go(page, who); await endTurn(page); }
  await expect(page.getByRole('button', { name: 'Start Round 2' })).toBeVisible();

  // A hero hit in the fight is hit on the Party tab: their Armor 2 is taken off.
  await hitWith(page, fighter(page, 'Elara').locator('[data-hero-calc="health"]'), 7);
  await expect(hp(fighter(page, 'Elara'))).toHaveText('15 / 20');
  await press(page, '.tabbar__btn[data-campaign-tab="party"]');
  await expect(page.locator('.hero-card', { hasText: 'Elara' }).locator('.vital[data-resource="health"] .vital__value')).toHaveText('15 / 20');
});

test('the ✎ on an enemy: heal by hand (even when down), effects, a Wound cleared, Back to Full', async ({ page }) => {
  await openCampaign(page);
  await startFight(page, { Goblin: 2, 'Ogre Brute': 1 }, ['Goblin']);
  const gob2 = member(page, 'Goblin 2');
  await hitWith(page, gob2.locator('[data-member-calc="health"]'), 20);
  await expect(gob2).toHaveAttribute('data-downed', '');

  // The sheet: named for this goblin, no Mana row (it has none), no Wound row.
  await gob2.locator('[data-member-edit]').click();
  expect(await appAttr(page, 'data-modal')).toBe('member-menu');
  await expect(page.locator('#member-menu-title')).toHaveText('Goblin 2');
  await expect(page.locator('[data-bind="memberMenuSub"]')).toHaveText('Health 0 / 6 · Down');
  await expect(page.locator('[data-member-act="mana"]')).toBeHidden();
  await expect(page.locator('[data-member-act="wound"]')).toBeHidden();
  // Healing is the GM's number, as typed, and brings a downed goblin back.
  await page.locator('[data-member-act="health"]').click();
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('calc');
  await expect(page.locator('[data-bind="calcTitle"]')).toHaveText('Goblin 2 · Health');
  await expect(page.locator('.modal--calc [data-poison-toggle]')).toBeHidden();
  await page.fill('[data-calc-input]', '4');
  await page.locator('.modal--calc [data-calc-apply="heal"]').click();
  await expect(hp(gob2)).toHaveText('4 / 6');
  await expect(gob2).not.toHaveAttribute('data-downed', '');

  // A Condition, from the ✎; shown on the compact card, with its stepper.
  await gob2.locator('[data-member-edit]').click();
  await page.locator('[data-member-act="effects"]').click();
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('effects');
  await page.locator('[data-effect-add="condition.slow"]').click();
  await expect(gob2.locator('.effect-row')).toHaveCount(1);
  await expect(member(page, 'Goblin 1').locator('.effect-row')).toHaveCount(0);

  // Back to Full: as it started the fight.
  await gob2.locator('[data-member-edit]').click();
  await page.locator('[data-member-act="full"]').click();
  await expect(hp(gob2)).toHaveText('6 / 6');
  await expect(gob2.locator('.effect-row')).toHaveCount(0);
  await expect(page.locator('[data-member-edit]').nth(1)).toBeFocused();

  // The Ogre has Wounds: 50 − Armor 3 = 47 → one Wound, refilled, 33 left.
  const ogre = fighter(page, 'Ogre Brute');
  await hitWith(page, ogre.locator('[data-member-calc="health"]'), 50);
  await expect(hp(ogre)).toHaveText('33 / 40');
  await expect(ogre.locator('.pip.is-on')).toHaveCount(1);
  await ogre.locator('[data-member-edit]').click();
  await page.locator('[data-member-act="wound"]').click();
  await expect(ogre.locator('.pip.is-on')).toHaveCount(0);

  // This fight only: the stat card is as it was.
  const saved = await stored(page);
  expect(saved.enemies.find((e) => e.id === 'enemy_goblin').stats.hp).toBe(6);
});

test('End Fight asks; heroes keep their vitals, the enemies\' fight is cleared', async ({ page }) => {
  await openCampaign(page);
  await startFight(page, { Goblin: 1 });
  await hitWith(page, fighter(page, 'Brom').locator('[data-hero-calc="health"]'), 10);   // − Armor 4 = 6
  await hitWith(page, fighter(page, 'Goblin').locator('[data-member-calc="health"]'), 3);

  await page.locator('[data-combat-end-open]').click();
  expect(await appAttr(page, 'data-modal')).toBe('combat-end');
  await page.keyboard.press('Escape');                       // an alert: Escape is Cancel
  expect(await appAttr(page, 'data-modal')).toBe('closed');
  expect((await stored(page)).combat).not.toBeNull();

  await page.locator('[data-combat-end-open]').click();
  await page.locator('[data-combat-end]').click();
  await expect(page.locator('[data-block="combatIdle"]')).toBeVisible();
  await expect(page.locator('[data-bind="combatRound"]')).toHaveText('✦ Combat ✦');
  await expect(page.getByRole('button', { name: 'Start Combat' })).toBeFocused();
  const saved = await stored(page);
  expect(saved.combat).toBeNull();
  expect(saved.heroes.find((h) => h.id === 'hero_brom').vitals.health).toBe(18);
  expect(saved.enemies.find((e) => e.id === 'enemy_goblin').stats.hp).toBe(6);
});

test('a stat card deleted mid-fight takes its enemies out of the fight', async ({ page }) => {
  await openCampaign(page);
  await startFight(page, { Goblin: 2, 'Ogre Brute': 1 }, ['Goblin']);
  await press(page, '.tabbar__btn[data-campaign-tab="enemies"]');
  await page.locator('[data-enemy="enemy_ogre"] [data-enemy-menu]').click();
  await page.locator('[data-enemy-remove]').click();
  await page.locator('[data-enemy-del-confirm]').click();
  await press(page, '.tabbar__btn[data-campaign-tab="combat"]');
  expect(await nextNames(page)).toEqual(['Elara', 'Brom', 'Goblin ×2']);
  expect((await stored(page)).combat.fighters).toHaveLength(3);
});
