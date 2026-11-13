/* =====================================================================
   MEEPLE — mechanics engine unit tests
   ---------------------------------------------------------------------
   Run:  npm run test:unit

   Every rule docs/rules-gaps.md §6 lists as "Verified as matching", plus
   the shipped rulings in §7, stated as a test against mechanics.js.

   The engine is handed a SMALL HAND-WRITTEN COMPENDIUM (below), not the
   real library: each number here is chosen so the arithmetic in a test can
   be read straight off the fixture. Whether the real content matches the
   guide is a different question, asked in content.test.js.
   ===================================================================== */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { create, RULES, spreadOk, skillMod, clampInt } = require('../../resources/js/mechanics.js');

/* ---- the fixture compendium ----------------------------------------- */

const base = { evasion: 8, armor: 0, fortitude: 8, speed: 5 };
const SUBCLASSES = {
  // A single-class baseline: 10 HP, 4 Wounds, 3 Patches, 10 Mana +1/level.
  'sc.alpha': { id: 'sc.alpha', classId: 'class.a', hp: 10, wounds: 4, patches: 3, ...base,
    startingMana: 10, manaPerLevel: 1, armorTypes: ['Light'], weaponTypes: ['1H Melee'] },
  // A second class for multiclassing: more HP, no starting Mana, fast growth.
  'sc.beta': { id: 'sc.beta', classId: 'class.b', hp: 12, wounds: 5, patches: 5, ...base,
    startingMana: 0, manaPerLevel: 3, armorTypes: ['Heavy', 'Shields'], weaponTypes: ['2H Melee'] },
  // A third, with the biggest starting pool — the multiclass Mana MAX.
  'sc.gamma': { id: 'sc.gamma', classId: 'class.c', hp: 8, wounds: 4, patches: 4, ...base,
    startingMana: 12, manaPerLevel: 2, armorTypes: [], weaponTypes: [] },
};
const ITEMS = {
  'armor.light': { id: 'armor.light', type: 'Armor', prof: 'Light', evasionMod: 4, armorMod: 0, speedMod: 1 },
  'armor.heavy': { id: 'armor.heavy', type: 'Armor', prof: 'Heavy', evasionMod: 0, armorMod: 4, speedMod: -1 },
  'weapon.1h':   { id: 'weapon.1h', type: 'Weapon', prof: '1H Melee', hands: 1 },
  'weapon.2h':   { id: 'weapon.2h', type: 'Weapon', prof: '2H Melee', hands: 2 },
  'shield.armor': { id: 'shield.armor', type: 'Shield', prof: 'Shields', hands: 1, evasionMod: 0, armorMod: 2 },
  'shield.evasion': { id: 'shield.evasion', type: 'Shield', prof: 'Shields', hands: 1, evasionMod: 2, armorMod: 0 },
};
// The effect rows the engine reads — the same shapes as EFFECTS in main.js.
const EFFECTS = {
  'boon.strength':      { id: 'boon.strength', kind: 'boon', mod: { stat: 'Power', value: 1 } },
  'boon.focus':         { id: 'boon.focus', kind: 'boon', mod: { stat: 'Lethality', value: 1 } },
  'boon.protection':    { id: 'boon.protection', kind: 'boon' },
  'boon.regeneration':  { id: 'boon.regeneration', kind: 'boon', tick: { label: 'Heal', heal: 1 } },
  'condition.bleed':    { id: 'condition.bleed', kind: 'condition', tick: { label: 'Take', damage: 1 } },
  'condition.poison':   { id: 'condition.poison', kind: 'condition', tick: { label: 'Take', damage: 1 } },
  'condition.chill':    { id: 'condition.chill', kind: 'condition' },
  'condition.slow':     { id: 'condition.slow', kind: 'condition' },
  'condition.vulnerable': { id: 'condition.vulnerable', kind: 'condition' },
  'condition.dazed':    { id: 'condition.dazed', kind: 'condition', maxStacks: 1 },
};

const M = create({
  subclassOf: (id) => SUBCLASSES[id] || null,
  itemOf: (id) => ITEMS[id] || null,
  effectById: (id) => EFFECTS[id] || null,
});

const ATTRS = ['Power', 'Precision', 'Lethality', 'Constitution', 'Dexterity', 'Fortune'];

// A fresh level-0 sc.alpha character at full health, with overrides.
function char({ stats = {}, build = {}, ...rest } = {}) {
  return {
    build: { origin: 'sc.alpha', levels: [], hpFrom: null, ...build },
    stats: ATTRS.map((name) => ({ name, value: stats[name] || 0 })),
    skills: [], inventory: [], effects: [], hands: [], armorWorn: null,
    health: 10, mana: 10, wounds: 0, patches: 3,
    ...rest,
  };
}

/* ===================================================================== */
/* rules-gaps.md §6 — verified as matching the guide                     */
/* ===================================================================== */

describe('attributes feed derived stats', () => {
  test('Precision is +2 to hit per point', () => {
    assert.equal(RULES.PRECISION_TO_HIT, 2);
    assert.equal(M.toHitBonus(char({ stats: { Precision: 3 } })), 6);
  });

  test('Power is +1 damage per point', () => {
    assert.equal(M.damageBonus(char({ stats: { Power: 2 } })), 2);
  });

  test('Constitution is +1 HP per point', () => {
    assert.equal(M.healthMax(char()), 10);
    assert.equal(M.healthMax(char({ stats: { Constitution: 2 } })), 12);
  });

  test('Dexterity is +1 Evasion per point', () => {
    assert.equal(M.evasion(char({ stats: { Dexterity: 3 } })), 11);
  });

  test('Fortune is +1 Fortitude per point', () => {
    assert.equal(M.fortitude(char({ stats: { Fortune: 2 } })), 10);
  });

  test('carried items and boons both add to an attribute', () => {
    const ch = char({
      stats: { Power: 1 },
      inventory: [{ mods: [{ stat: 'Power', value: 2 }, { stat: 'Dexterity', value: -1 }] }],
      effects: [{ id: 'boon.strength', stacks: 2 }],
    });
    assert.equal(M.statValue(ch, 'Power'), 1 + 2 + 2);
    assert.equal(M.statValue(ch, 'Dexterity'), -1);
    assert.equal(M.statBase(ch, 'Power'), 1);   // what is written never changes
  });
});

/* Designer ruling 2026-11-13 (RULES.HEALTH_MAX_FLOOR). Constitution can go
   negative through an inventory modifier (down to −20), and maximum health
   used to follow it below zero — a rest then wrote that negative number into
   current health. Found in the Codex second-opinion review (finding 3). */
describe('maximum health never drops below the floor', () => {
  const sunk = (con) => char({ inventory: [{ mods: [{ stat: 'Constitution', value: con }] }] });

  test('the floor is 1, and it is a named rule', () => {
    assert.equal(RULES.HEALTH_MAX_FLOOR, 1);
  });

  test('a Constitution penalty bottoms out at the floor, however large', () => {
    assert.equal(M.healthMax(sunk(-9)), 1);    // exactly the floor
    assert.equal(M.healthMax(sunk(-10)), 1);   // would have been 0
    assert.equal(M.healthMax(sunk(-20)), 1);   // would have been −10
    assert.equal(M.healthMax(sunk(-8)), 2);    // above the floor: untouched
  });

  test('a boon or effect cannot push it under either — it reads the same total', () => {
    const ch = sunk(-20);
    ch.effects = [{ id: 'boon.strength', stacks: 3 }];
    assert.equal(M.healthMax(ch), 1);
  });

  test('both rests fill to the floor, never to a negative', () => {
    for (const kind of ['short', 'long']) {
      const ch = { ...sunk(-20), health: 0 };
      M.rest(ch, kind);
      assert.equal(ch.health, 1, kind);
    }
  });

  test('healing stops at the floor', () => {
    const ch = { ...sunk(-20), health: 1 };
    M.heal(ch, 'health', 5);
    assert.equal(ch.health, 1);
  });

  test('at the floor, each point of damage is a Wound — until the last one downs', () => {
    // sc.alpha has 4 Wounds. Reaching 0 takes a Wound and refills to max (1),
    // so every point costs one Wound; the 4th leaves the bar empty.
    const ch = { ...sunk(-20), health: 1 };
    M.damage(ch, 'health', 1);
    assert.deepEqual([ch.health, ch.wounds], [1, 1]);
    M.damage(ch, 'health', 2);
    assert.deepEqual([ch.health, ch.wounds], [1, 3]);
    const out = M.damage(ch, 'health', 1);
    assert.deepEqual([ch.health, ch.wounds, out.downed], [0, 4, true]);
  });
});

/* Round-2 review, finding 5. The floor fixed new arithmetic, but a save from
   before it could still hold a negative current health — loaded, clamped to
   0, and left standing at 0/1. Designer ruling 2026-11-13: full health, no
   Wound added. */
describe('a save cannot load a standing character on an empty bar', () => {
  const sunk = (con) => char({ inventory: [{ mods: [{ stat: 'Constitution', value: con }] }] });

  test('legacy negative health while standing: loads at full', () => {
    const ch = { ...sunk(-20), health: 0, wounds: 1 };   // −10 after the load clamp
    assert.equal(M.settleHealth(ch), true);
    assert.deepEqual([ch.health, ch.wounds], [1, 1]);   // full; no Wound added
  });

  test('zero health while standing, ordinary Constitution: loads at full', () => {
    const ch = { ...char(), health: 0, wounds: 0 };
    M.settleHealth(ch);
    assert.equal(ch.health, M.healthMax(ch));
    assert.ok(ch.health > 1);
  });

  test('zero health at maximum Wounds stays zero — that is what downed is', () => {
    const ch = { ...char(), health: 0 };
    ch.wounds = M.woundsMax(ch);
    assert.equal(M.settleHealth(ch), false);
    assert.equal(ch.health, 0);
  });

  test('a draft with no subclass stays 0/0 rather than being given the floor', () => {
    const ch = { ...char({ build: { origin: null } }), health: 0, wounds: 0 };
    assert.equal(M.healthMax(ch), 0);
    assert.equal(M.settleHealth(ch), false);
    assert.equal(ch.health, 0);
  });

  test('a standing character with health on the bar is left alone', () => {
    const ch = { ...char(), health: 3, wounds: 1 };
    assert.equal(M.settleHealth(ch), false);
    assert.equal(ch.health, 3);
  });
});

describe('base stats', () => {
  test('the base block is Evasion 8 / Armor 0 / Fortitude 8 / Speed 5', () => {
    const ch = char();
    assert.deepEqual(
      [M.evasion(ch), M.armor(ch), M.fortitude(ch), M.speed(ch)],
      [8, 0, 8, 5],
    );
  });

  test('a character with no subclass falls back to the shared block', () => {
    const ch = char({ build: { origin: null } });
    assert.equal(M.baseStat(ch, 'evasion'), RULES.BASE_STATS.evasion);
    assert.equal(M.healthMax(ch), 0);
  });
});

describe('armour and shields', () => {
  test('armour modifies the base block: Evasion, Armor and Speed', () => {
    const light = char({ armorWorn: 'armor.light' });
    assert.deepEqual([M.evasion(light), M.armor(light), M.speed(light)], [12, 0, 6]);
    const heavy = char({ armorWorn: 'armor.heavy' });
    assert.deepEqual([M.evasion(heavy), M.armor(heavy), M.speed(heavy)], [8, 4, 4]);
  });

  test('shields add their bonus, and two shields both count', () => {
    const one = char({ hands: [{ id: 'shield.armor' }] });
    assert.equal(M.armor(one), 2);
    const two = char({ hands: [{ id: 'shield.armor' }, { id: 'shield.evasion' }] });
    assert.deepEqual([M.armor(two), M.evasion(two)], [2, 10]);
  });

  test('hands are a budget of 2; a swap frees the slot being replaced', () => {
    const ch = char({ hands: [{ id: 'weapon.2h' }] });
    assert.equal(M.handsFree(ch), 0);
    assert.equal(M.canEquip(ch, 'weapon.1h'), false);
    assert.equal(M.canEquip(ch, 'weapon.2h', 0), true);   // 2H for 2H, in place
    assert.equal(M.canEquip(char(), 'weapon.unknown'), false);
  });

  test('shields are trained like armour, weapons like weapons', () => {
    const beta = { origin: 'sc.beta', levels: [], hpFrom: null };
    assert.equal(M.isTrained(ITEMS['shield.armor'], beta), true);
    assert.equal(M.isTrained(ITEMS['weapon.2h'], beta), true);
    assert.equal(M.isTrained(ITEMS['weapon.1h'], beta), false);
  });
});

describe('the Wound cascade', () => {
  test('damage below the bar just lowers health', () => {
    const ch = char({ health: 10 });
    const out = M.damage(ch, 'health', 3);
    assert.deepEqual([ch.health, ch.wounds, out.downed], [7, 0, false]);
  });

  test('0 HP takes a Wound, refills, and carries the spillover', () => {
    const ch = char({ health: 4 });
    M.damage(ch, 'health', 7);          // 4 empties the bar, 3 spills over
    assert.deepEqual([ch.health, ch.wounds], [10 - 3, 1]);
  });

  test('one big hit can take several Wounds', () => {
    const ch = char({ health: 10 });
    M.damage(ch, 'health', 25);         // 10 → W1, 10 → W2, 5 left over
    assert.deepEqual([ch.health, ch.wounds], [5, 2]);
  });

  test('the last Wound has no refill: Downed, bar empty, spillover discarded', () => {
    const ch = char({ health: 2, wounds: 3 });   // cap is 4
    const out = M.damage(ch, 'health', 50);
    assert.deepEqual([ch.health, ch.wounds, out.downed], [0, 4, true]);
    assert.equal(M.isDowned(ch), true);
  });

  test('a hit on someone already downed does not announce again', () => {
    const ch = char({ health: 0, wounds: 4 });
    assert.equal(M.damage(ch, 'health', 5).downed, false);
  });

  test('Downed keeps the bar empty, even through a short rest', () => {
    const ch = char({ health: 0, wounds: 4 });
    M.rest(ch, 'short');
    assert.equal(ch.health, 0);
    assert.equal(M.isDowned(ch), true);
  });

  test('every Wound is −2 Armor and −1 Speed, cumulative', () => {
    const ch = char({ wounds: 3 });
    assert.deepEqual([M.armor(ch), M.speed(ch)], [-6, 2]);
  });

  test('downed: Evasion and Fortitude drop to base, Armor and Speed to 0', () => {
    const ch = char({
      wounds: 4, health: 0, armorWorn: 'armor.light',
      stats: { Dexterity: 3, Fortune: 2 }, hands: [{ id: 'shield.armor' }],
    });
    assert.deepEqual([M.evasion(ch), M.armor(ch), M.fortitude(ch), M.speed(ch)], [8, 0, 8, 0]);
  });

  test('damage and healing ignore zero, negative and junk amounts', () => {
    const ch = char({ health: 5 });
    for (const bad of [0, -3, 'abc', null]) M.damage(ch, 'health', bad);
    M.heal(ch, 'health', -4);
    assert.equal(ch.health, 5);
    assert.equal(clampInt('3.9'), 3);
  });

  test('healing stops at the maximum', () => {
    const ch = char({ health: 8 });
    M.heal(ch, 'health', 50);
    assert.equal(ch.health, 10);
  });
});

describe('skill and attribute budgets', () => {
  test('skill points: 4 at creation, +1 per level, each worth +2', () => {
    assert.equal(M.skillPointsMax(char()), 4);
    assert.equal(M.skillPointsMax(char({ build: { levels: ['sc.alpha', 'sc.alpha'] } })), 6);
    assert.equal(skillMod(1), 2);
    assert.equal(skillMod(3), 6);
  });

  test('the 4 creation points must land on 4 different skills', () => {
    assert.equal(spreadOk([{ rank: 1 }, { rank: 1 }, { rank: 1 }, { rank: 1 }]), true);
    assert.equal(spreadOk([{ rank: 2 }, { rank: 2 }]), false);
    assert.equal(spreadOk([{ rank: 1 }, { rank: 1 }]), true);   // half-spent is fine
  });

  test('attribute points: 4 at creation, +1 per level', () => {
    assert.equal(M.attrPointsMax(char()), 4);
    assert.equal(M.attrPointsMax(char({ build: { levels: ['sc.alpha'] } })), 5);
  });
});

describe('Mana', () => {
  test('starting pool plus per-subclass growth', () => {
    assert.equal(M.manaMax(char()), 10);
    assert.equal(M.manaMax(char({ build: { levels: ['sc.alpha', 'sc.alpha'] } })), 12);
  });

  test('multiclass takes the HIGHER starting pool, never the sum', () => {
    const ch = char({ build: { origin: 'sc.alpha', levels: ['sc.gamma'] } });
    // max(10, 12) start, + 2 growth from the one gamma level.
    assert.equal(M.manaMax(ch), 14);
  });

  test('a short rest restores half the MAXIMUM, rounded down', () => {
    const ch = char({ build: { levels: ['sc.alpha', 'sc.alpha', 'sc.alpha', 'sc.alpha', 'sc.alpha'] }, mana: 2 });
    assert.equal(M.manaMax(ch), 15);
    assert.equal(M.shortRestMana(ch), 7);
    M.rest(ch, 'short');
    assert.equal(ch.mana, 9);
  });

  test('a short rest never overfills the pool', () => {
    const ch = char({ mana: 8 });
    M.rest(ch, 'short');
    assert.equal(ch.mana, 10);
  });

  test('spending Mana stops at zero and never takes a Wound', () => {
    const ch = char({ mana: 3 });
    const out = M.damage(ch, 'mana', 9);
    assert.deepEqual([ch.mana, ch.wounds, out.boonsLost], [0, 0, undefined]);
  });
});

describe('multiclass', () => {
  test('HP comes from the subclass with the majority of levels', () => {
    const ch = char({ build: { origin: 'sc.alpha', levels: ['sc.beta', 'sc.beta', 'sc.alpha'] } });
    assert.equal(M.primarySubclass(ch.build).id, 'sc.beta');
    assert.equal(M.healthMax(ch), 12);
  });

  test('a tie goes to the subclass taken first, unless the player chose', () => {
    const tie = { origin: 'sc.alpha', levels: ['sc.alpha', 'sc.beta'], hpFrom: null };
    assert.equal(M.primarySubclass(tie).id, 'sc.alpha');
    assert.equal(M.primarySubclass({ ...tie, hpFrom: 'sc.beta' }).id, 'sc.beta');
  });

  test('proficiencies are the least restrictive: a union across classes', () => {
    const build = { origin: 'sc.alpha', levels: ['sc.beta'], hpFrom: null };
    assert.deepEqual(M.proficiencies('armorTypes', build), ['Light', 'Heavy', 'Shields']);
    assert.deepEqual(M.proficiencies('weaponTypes', build), ['1H Melee', '2H Melee']);
  });

  test('level is the number of level-ups; creation is level 0', () => {
    assert.equal(M.level({ origin: 'sc.alpha', levels: [] }), 0);
    assert.equal(M.level({ origin: 'sc.alpha', levels: ['sc.alpha', 'sc.beta'] }), 2);
  });
});

/* ===================================================================== */
/* rules-gaps.md §7 — shipped rulings                                    */
/* ===================================================================== */

describe('§2.3 Critical Strikes', () => {
  test('Lethality lowers the threshold: 0 → 20, 1 → 19, 2 → 18', () => {
    for (const [leth, at] of [[0, 20], [1, 19], [2, 18]]) {
      assert.equal(M.critThreshold(char({ stats: { Lethality: leth } })), at);
    }
  });

  test('a natural 1 never crits, however high Lethality goes', () => {
    assert.equal(M.critThreshold(char({ stats: { Lethality: 40 } })), RULES.CRIT_MIN_FACE);
    assert.equal(M.isCrit(char({ stats: { Lethality: 40 } }), 1), false);
  });

  test('a natural 20 always crits, even with negative Lethality', () => {
    const cursed = char({ stats: { Lethality: -3 } });
    assert.equal(M.critThreshold(cursed), 20);
    assert.equal(M.isCrit(cursed, 20), true);
  });

  test('Focus widens the crit window through Lethality', () => {
    const ch = char({ effects: [{ id: 'boon.focus', stacks: 1 }] });
    assert.equal(M.critThreshold(ch), 19);
  });
});

describe('§2.2 Patches', () => {
  test('spending one heals to full and removes one Wound', () => {
    const ch = char({ health: 3, wounds: 2, patches: 2 });
    M.spendPatch(ch);
    assert.deepEqual([ch.health, ch.wounds, ch.patches], [10, 1, 1]);
  });

  test('cannot spend with none left, nothing to gain, or while Downed', () => {
    assert.equal(M.canSpendPatch(char({ patches: 0, health: 3 })), false);
    assert.equal(M.canSpendPatch(char({ patches: 2 })), false);              // full, no Wounds
    assert.equal(M.canSpendPatch(char({ patches: 2, health: 0, wounds: 4 })), false);
  });

  test('restored on a long rest only', () => {
    const ch = char({ patches: 1 });
    M.rest(ch, 'short');
    assert.equal(ch.patches, 1);
    M.rest(ch, 'long');
    assert.equal(ch.patches, 3);
  });

  test('setting the count by hand changes nothing else, and is clamped', () => {
    const ch = char({ health: 4, wounds: 1, patches: 1 });
    M.setPatches(ch, 99);
    assert.deepEqual([ch.patches, ch.health, ch.wounds], [3, 4, 1]);
  });
});

describe('§2.6 / §2.7 Fortune and Poison on healing', () => {
  test('Fortune is healing output: +1 per point', () => {
    assert.equal(M.healBonus(char({ stats: { Fortune: 2 } })), 2);
  });

  test('Poison is healing intake: −1 per stack', () => {
    assert.equal(M.poisonHealPenalty(char({ effects: [{ id: 'condition.poison', stacks: 3 }] })), -3);
  });
});

describe('§2.8 / §2.9 Wounds, Boons and effect lifecycles', () => {
  test('taking a Wound clears every Boon, and only Boons', () => {
    const ch = char({ health: 2, effects: [
      { id: 'boon.strength', stacks: 1 }, { id: 'boon.protection', stacks: 2 },
      { id: 'condition.chill', stacks: 1 },
    ] });
    const out = M.damage(ch, 'health', 5);
    assert.equal(out.boonsLost, 2);
    assert.deepEqual(ch.effects.map((e) => e.id), ['condition.chill']);
  });

  test('clearing a Wound is not taking one — Boons stay', () => {
    const ch = char({ wounds: 2, effects: [{ id: 'boon.strength', stacks: 1 }] });
    assert.equal(M.setWounds(ch, 1).boonsLost, 0);
    assert.equal(ch.effects.length, 1);
  });

  test('both rests clear every Boon and Condition', () => {
    for (const kind of ['short', 'long']) {
      const ch = char({ effects: [{ id: 'boon.strength', stacks: 1 }, { id: 'condition.slow', stacks: 2 }] });
      M.rest(ch, kind);
      assert.deepEqual(ch.effects, [], `${kind} rest`);
    }
  });

  test('a long rest is a full reset: health, Mana and Wounds', () => {
    const ch = char({ health: 0, wounds: 4, mana: 1 });
    M.rest(ch, 'long');
    assert.deepEqual([ch.health, ch.mana, ch.wounds, M.isDowned(ch)], [10, 10, 0, false]);
  });

  test('a tick applies its amount for every stack', () => {
    const ch = char({ health: 10, effects: [{ id: 'condition.bleed', stacks: 3 }] });
    assert.equal(M.applyTick(ch, 'condition.bleed').amount, 3);
    assert.equal(ch.health, 7);
  });

  test('a damage tick runs the Wound cascade and can down', () => {
    const ch = char({ health: 1, wounds: 3, effects: [{ id: 'condition.bleed', stacks: 2 }] });
    assert.equal(M.applyTick(ch, 'condition.bleed').downed, true);
  });

  test('a heal tick heals, and an effect with no tick does nothing', () => {
    const ch = char({ health: 5, effects: [{ id: 'boon.regeneration', stacks: 2 }, { id: 'condition.chill', stacks: 1 }] });
    M.applyTick(ch, 'boon.regeneration');
    assert.equal(ch.health, 7);
    assert.deepEqual(M.applyTick(ch, 'condition.chill'), { amount: 0, downed: false, boonsLost: undefined });
  });
});

describe('§2.10 and effect arithmetic', () => {
  test('Strength moves Power, and so every damage box', () => {
    const ch = char({ stats: { Power: 1 }, effects: [{ id: 'boon.strength', stacks: 2 }] });
    assert.equal(M.damageBonus(ch), 3);
  });

  test('Protection +1 Armor; Vulnerable −1 Armor and can go negative', () => {
    assert.equal(M.armor(char({ effects: [{ id: 'boon.protection', stacks: 2 }] })), 2);
    assert.equal(M.armor(char({ effects: [{ id: 'condition.vulnerable', stacks: 3 }] })), -3);
  });

  test('Chill −1 Evasion and Slow −1 Speed, per stack', () => {
    const ch = char({ effects: [{ id: 'condition.chill', stacks: 2 }, { id: 'condition.slow', stacks: 1 }] });
    assert.deepEqual([M.evasion(ch), M.speed(ch)], [6, 4]);
  });

  test('adding an effect already on deepens it; Dazed caps at 1', () => {
    const ch = char();
    M.addEffect(ch, 'condition.bleed');
    M.addEffect(ch, 'condition.bleed');
    M.addEffect(ch, 'condition.dazed');
    M.addEffect(ch, 'condition.dazed');
    assert.deepEqual(ch.effects, [{ id: 'condition.bleed', stacks: 2 }, { id: 'condition.dazed', stacks: 1 }]);
  });

  test('unknown effects are ignored; the last stack removes the row', () => {
    const ch = char();
    M.addEffect(ch, 'condition.made-up');
    assert.deepEqual(ch.effects, []);
    M.addEffect(ch, 'condition.slow');
    M.bumpEffect(ch, 'condition.slow', -1);
    assert.deepEqual(ch.effects, []);
  });
});
