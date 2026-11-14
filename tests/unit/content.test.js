/* =====================================================================
   MEEPLE — content checks against the Player's Guide
   ---------------------------------------------------------------------
   Run:  npm run test:unit

   mechanics.test.js proves the ARITHMETIC against a hand-made fixture.
   This file asks the other half: does the real compendium (generated
   from the Google Sheets by tools/csv-to-json.mjs) state the numbers the
   guide states? These are the content rows of docs/rules-gaps.md §6.

   Reads tools/out/library.json — the converter's readable output, which is
   the same data as resources/js/library.js. If a rebalance is deliberate,
   update the guide, this file and rules-gaps.md together.
   ===================================================================== */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const LIB = require('../../tools/out/library.json');
const { validateDice } = require('../../resources/js/dice.js');

const byId = (list, id) => {
  const e = list.find((x) => x.id === id);
  assert.ok(e, `${id} is missing from the compendium`);
  return e;
};

// Melee reach is `threat`, ranged distance is `range` — two columns on
// purpose (docs/library-schema.md §4.7), so each weapon states only its own.
test('weapon damage and reach match the guide', () => {
  const expected = {
    'weapon.1h-melee': { damage: '1d6', hands: 1, threat: 1 },
    'weapon.2h-melee': { damage: '2d8', hands: 2, threat: 1 },
    'weapon.1h-range': { damage: '1d4', hands: 1, range: 5 },
    'weapon.2h-range': { damage: '2d6', hands: 2, range: 10 },
  };
  for (const [id, want] of Object.entries(expected)) {
    const w = byId(LIB.weapons, id);
    const got = { damage: w.damage, hands: w.hands };
    if ('threat' in want) got.threat = w.threat;
    if ('range' in want) got.range = w.range;
    assert.deepEqual(got, want, id);
  }
});

test('shields: +2 Armor / +2 Evasion / +1 and +1, one hand each', () => {
  const expected = {
    'shield.armor':    { armorMod: 2, evasionMod: 0 },
    'shield.evasion':  { armorMod: 0, evasionMod: 2 },
    'shield.balanced': { armorMod: 1, evasionMod: 1 },
  };
  for (const [id, want] of Object.entries(expected)) {
    const s = byId(LIB.weapons, id);
    assert.deepEqual({ armorMod: s.armorMod, evasionMod: s.evasionMod }, want, id);
    assert.equal(s.hands, 1, id);
  }
});

test('armour: all three columns', () => {
  const expected = {
    'armor.light':  { evasionMod: 4, armorMod: 0, speedMod: 1 },
    'armor.medium': { evasionMod: 2, armorMod: 2, speedMod: 0 },
    'armor.heavy':  { evasionMod: 0, armorMod: 4, speedMod: -1 },
  };
  for (const [id, want] of Object.entries(expected)) {
    const a = byId(LIB.armor, id);
    assert.deepEqual({ evasionMod: a.evasionMod, armorMod: a.armorMod, speedMod: a.speedMod }, want, id);
  }
});

test('every subclass states the base block Evasion 8 / Armor 0 / Fortitude 8 / Speed 5', () => {
  for (const sc of LIB.subclasses) {
    assert.deepEqual(
      { evasion: sc.evasion, armor: sc.armor, fortitude: sc.fortitude, speed: sc.speed },
      { evasion: 8, armor: 0, fortitude: 8, speed: 5 }, sc.id);
  }
});

test('every subclass is complete enough to build a character on', () => {
  for (const sc of LIB.subclasses) {
    assert.ok(sc.hp > 0, `${sc.id} hp`);
    // Load-bearing beyond completeness: V.isDowned's "no Wound track, so an
    // empty bar downs you" branch is for enemies, and must never reach a
    // player character. It cannot while every subclass has Wounds.
    assert.ok(sc.wounds > 0, `${sc.id} wounds`);
    assert.ok(Number.isInteger(sc.patches), `${sc.id} patches`);
    assert.ok(Array.isArray(sc.armorTypes) && Array.isArray(sc.weaponTypes), `${sc.id} proficiencies`);
    assert.ok(LIB.classes.some((c) => c.id === sc.classId), `${sc.id} names a class that exists`);
  }
});

test('ids are unique across every collection', () => {
  const seen = new Set();
  for (const [key, list] of Object.entries(LIB)) {
    if (!Array.isArray(list)) continue;
    for (const e of list) {
      assert.ok(!seen.has(e.id), `duplicate id ${e.id} (in ${key})`);
      seen.add(e.id);
    }
  }
});

test('every dice column is a legal roll for the app\'s own parser', () => {
  for (const w of LIB.weapons) {
    if (w.damage) assert.equal(validateDice(w.damage), null, `${w.id}: ${w.damage}`);
  }
});
