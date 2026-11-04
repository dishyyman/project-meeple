/* =====================================================================
   WAYPOINT — characterization: what the sheet shows, step by step
   ---------------------------------------------------------------------
   A safety net, not a specification. It runs a fixed script of play —
   effects, damage through the Wound cascade to Downed, healing, rests,
   ticks, Patches, rolls — and records everything the sheet displays after
   each step. The first run writes the record (__snapshots__/); every run
   after compares against it.

   Written BEFORE the game mechanics were moved out of main.js into
   mechanics.js, so the move could be proven to change nothing a player
   sees. If this fails after a deliberate rules change, look at the diff,
   confirm it is the change you meant, and re-record with:

       npx playwright test characterization --update-snapshots

   Never re-record to make an unexplained failure go away.
   ===================================================================== */
const { test, expect } = require('./helpers/test');
const grimm = require('../fixtures/saves/grimm-multiclass.json');
const {
  openApp, press, appAttr, openFirstCharacter, closeModal, applyCalc, addEffect, readSheet,
} = require('./helpers/app');

/* Reduced motion, so the dice do not tumble. Two reasons, both about the
   record being exact:

   · The tumble (animateRoll() in main.js) draws throwaway faces from
     Math.random on every animation frame. How many frames run before the
     test closes the roll window depends on how busy the machine is — so the
     pinned random sequence drifted, and every later roll with it. Chrome
     happened to be steady; Safari under load was not (found 2026-11-04).
   · The test reads the total straight after the tap. Mid-tumble, that is a
     throwaway face; with reduced motion the app paints the REAL result at
     once (the prefersReducedMotion() branch), which is what should be on
     record.

   The tumble itself is theatre, not arithmetic — every real roll still goes
   through evaluateDice(), which is what this record checks. */
test.use({ reducedMotion: 'reduce' });

test('the seed character, through a full session of play', async ({ page }) => {
  await openApp(page, { seed: 7 });
  await openFirstCharacter(page);

  const steps = [];
  const record = async (label) => steps.push({ step: label, ...(await readSheet(page)) });

  await record('opened');

  await addEffect(page, 'boon.strength');      // Power → every damage box
  await record('+ Strength');
  await addEffect(page, 'boon.focus');         // Lethality → crit window
  await record('+ Focus');

  await applyCalc(page, 'health', 'damage', 3);
  await record('3 damage');
  await applyCalc(page, 'health', 'damage', 12); // past 0: Wound, refill, spillover
  if ((await appAttr(page, 'data-modal')) !== 'closed') await closeModal(page);
  await record('12 damage (cascade)');

  await applyCalc(page, 'health', 'heal', 2);
  await record('heal 2');
  await applyCalc(page, 'mana', 'damage', 9);
  await record('spend 9 mana');

  await addEffect(page, 'condition.bleed');
  await press(page, '[data-effect-step="condition.bleed:1"]');
  await record('+ Bleed ×2');
  await press(page, '[data-effect-tick="condition.bleed"]');
  await press(page, '[data-tick-confirm]');
  if ((await appAttr(page, 'data-modal')) !== 'closed') await closeModal(page);
  await record('Bleed tick');

  await press(page, '[data-action="rest"]');
  await press(page, '[data-rest="short"]');
  if ((await appAttr(page, 'data-modal')) !== 'closed') await closeModal(page);
  await record('short rest');

  // Down the character: keep hitting until the last Wound.
  for (let i = 0; i < 12 && (await appAttr(page, 'data-modal')) === 'closed'; i++) {
    await applyCalc(page, 'health', 'damage', 50);
  }
  await record('downed (modal open)');
  await closeModal(page);
  await record('downed');

  await press(page, '[data-action="rest"]');
  await press(page, '[data-rest="long"]');
  if ((await appAttr(page, 'data-modal')) !== 'closed') await closeModal(page);
  await record('long rest');

  // Rolls: each to-hit and damage box once, with pinned randomness.
  const boxes = await page.evaluate(() =>
    [...document.querySelectorAll('.screen--sheet [data-roll]')].map((el, i) => i));
  const rolls = [];
  for (const i of boxes) {
    await page.evaluate((n) => document.querySelectorAll('.screen--sheet [data-roll]')[n].click(), i);
    rolls.push(await page.evaluate(() => {
      const norm = (s) => s.replace(/\s+/g, ' ').trim();
      const card = document.querySelector('.modal--roll');
      return {
        total: norm(card.querySelector('[data-bind="outTotal"]').textContent),
        crit: !card.querySelector('[data-crit]').hidden,
        card: norm(card.textContent),
      };
    }));
    await closeModal(page);
  }

  expect(JSON.stringify({ steps, rolls }, null, 2)).toMatchSnapshot('session.json');
});

/* The seed is a single-class Hunter. This one covers what Elara does not:
   a multiclass build across two classes (Fighter → Barbarian), a subclass
   with generated mana (Spellblade), heavy armour, a two-handed weapon, an
   item that both raises and lowers attributes, and a Condition already on. */
test('a multiclass character with mixed modifiers', async ({ page }) => {
  await openApp(page, { seed: 11, saves: { cgrimm: grimm } });
  await openFirstCharacter(page);

  const steps = [];
  const record = async (label) => steps.push({ step: label, ...(await readSheet(page)) });

  await record('opened');
  await addEffect(page, 'boon.strength');
  await press(page, '[data-effect-step="boon.strength:1"]');
  await record('+ Strength ×2');
  await applyCalc(page, 'health', 'damage', 25);
  if ((await appAttr(page, 'data-modal')) !== 'closed') await closeModal(page);
  await record('25 damage');
  await press(page, '[data-action="rest"]');
  await press(page, '[data-rest="short"]');
  if ((await appAttr(page, 'data-modal')) !== 'closed') await closeModal(page);
  await record('short rest');

  const rolls = [];
  const count = await page.evaluate(() => document.querySelectorAll('.screen--sheet [data-roll]').length);
  for (let i = 0; i < count; i++) {
    await page.evaluate((n) => document.querySelectorAll('.screen--sheet [data-roll]')[n].click(), i);
    rolls.push(await page.evaluate(() =>
      document.querySelector('.modal--roll').textContent.replace(/\s+/g, ' ').trim()));
    await closeModal(page);
  }

  expect(JSON.stringify({ steps, rolls }, null, 2)).toMatchSnapshot('multiclass.json');
});
