/* =====================================================================
   MEEPLE — campaign (Game Master Tools) unit tests
   ---------------------------------------------------------------------
   Run:  npm run test:unit

   campaign.js is the GM's data and its housekeeping: the shapes, the one
   normalizer every campaign passes through on its way in, and the turn
   tracking for a fight. These pin all three, plus the join with
   mechanics.js — heroes and enemies run through the SAME vitals rules as
   a player's sheet.
   ===================================================================== */
'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../resources/js/campaign.js');
const { create, damageAfterArmor } = require('../../resources/js/mechanics.js');

const NOW = '2026-11-13T12:00:00.000Z';

// The vitals engine needs effect rows only for Boons/Conditions; a tiny set.
const EFFECTS = {
  'boon.protection': { id: 'boon.protection', kind: 'boon' },
  'condition.vulnerable': { id: 'condition.vulnerable', kind: 'condition' },
};
const V = create({ subclassOf: () => null, itemOf: () => null, effectById: (id) => EFFECTS[id] || null }).vitals;

// A hero card as the player's device would publish it (heroCard()'s shape).
const CARD = {
  healthBase: 9, manaMax: 15, woundsMax: 4, patchesMax: 6,
  base: { evasion: 8, armor: 0, fortitude: 8, speed: 5 },
  build: { evasion: 14, armor: 2, fortitude: 10, speed: 5 },
};

function campaignWith({ heroes = 2, enemies = [] } = {}) {
  const c = C.newCampaign({ name: 'The Ashen Road' }, NOW);
  for (let i = 0; i < heroes; i++) c.heroes.push(C.newHero({ name: `Hero ${i + 1}`, card: CARD }, NOW));
  for (const e of enemies) {
    const enemy = C.newEnemy({ name: e.name }, NOW);
    Object.assign(enemy, { turns: e.turns || 1 });
    Object.assign(enemy.stats, e.stats || {});
    c.enemies.push(enemy);
  }
  return c;
}

describe('records', () => {
  test('a new campaign: a name, an optional subtitle, nothing else formal', () => {
    const c = C.newCampaign({ name: '  Goblin Market ', subtitle: 'One-shot, Friday' }, NOW);
    assert.equal(c.name, 'Goblin Market');
    assert.equal(c.subtitle, 'One-shot, Friday');
    assert.deepEqual([c.heroes, c.enemies, c.combat], [[], [], null]);
    assert.deepEqual([c.rev, c.updated, c.created], [1, NOW, NOW]);
    assert.match(c.id, C.SAFE_ID);
  });

  test('ids are random tokens, safe for selectors, and never repeat', () => {
    const ids = new Set(Array.from({ length: 500 }, () => C.newId('x')));
    assert.equal(ids.size, 500);
    for (const id of ids) assert.match(id, C.SAFE_ID);
  });

  test('touch() bumps the change counter and the time', () => {
    const c = C.newCampaign({ name: 'A' }, NOW);
    C.touch(c, '2026-11-14T00:00:00.000Z');
    assert.deepEqual([c.rev, c.updated], [2, '2026-11-14T00:00:00.000Z']);
  });

  test('a new hero starts topped up; a file import keeps the player\'s current state', () => {
    const fresh = C.newHero({ name: 'Elara', card: CARD }, NOW);
    assert.deepEqual(fresh.vitals, { health: 9, mana: 15, wounds: 0, patches: 6, effects: [] });
    const imported = C.newHero({ name: 'Elara', card: CARD, source: 'file', characterId: 'aurelia',
      vitals: { health: 4, mana: 3, wounds: 1, patches: 2, effects: [{ id: 'boon.protection', stacks: 2 }] } }, NOW);
    assert.equal(imported.vitals.health, 4);
    assert.equal(imported.characterId, 'aurelia');
    assert.equal(imported.source, 'file');
  });

  test('a newer file replaces the card, keeps the GM\'s vitals, clamps them to the new maxima', () => {
    const h = C.newHero({ name: 'Elara', card: CARD, vitals: { health: 9, mana: 15, wounds: 3, patches: 6 } }, NOW);
    // Every pool shrinks — Health too (codex review 2026-11-14: it alone was
    // left at 9 / 5, extra Health the GM's card would have let them spend).
    C.refreshHero(h, { name: 'Elara', label: 'Hunter 6', card: { ...CARD, healthBase: 5, manaMax: 10, woundsMax: 2 } }, NOW);
    assert.equal(h.card.manaMax, 10);
    assert.deepEqual([h.vitals.health, h.vitals.mana, h.vitals.wounds], [5, 10, 2]);
    assert.equal(h.label, 'Hunter 6');
    assert.equal(h.rev, 2);
  });

  test('a bigger pool does not refill the bar: the GM\'s health is kept as it was', () => {
    const h = C.newHero({ name: 'Elara', card: CARD, vitals: { health: 4 } }, NOW);
    C.refreshHero(h, { name: 'Elara', card: { ...CARD, healthBase: 20 } }, NOW);
    assert.equal(h.vitals.health, 4);
  });

  test('with the real maximum (create), a Constitution effect lifts the cap', () => {
    // A stand-in Boon: the app has none that touches Constitution today, but
    // the engine allows one, and a buffed hero must not lose health on load.
    const FX = { 'boon.vigor': { id: 'boon.vigor', kind: 'boon', mod: { stat: 'Constitution', value: 1 } } };
    const RV = create({ subclassOf: () => null, itemOf: () => null, effectById: (id) => FX[id] || null }).vitals;
    const BC = C.create({ healthMax: RV.healthMax });
    const vitals = { health: 12, effects: [{ id: 'boon.vigor', stacks: 3 }] };
    assert.equal(BC.newHero({ name: 'Elara', card: CARD, vitals }, NOW).vitals.health, 12);   // 9 + 3
    assert.equal(C.newHero({ name: 'Elara', card: CARD, vitals }, NOW).vitals.health, 9);     // no content: 9
    // Every door in the bound API carries it.
    const raw = { heroes: [{ card: CARD, vitals: { health: 99, effects: [{ id: 'boon.vigor', stacks: 2 }] } }] };
    assert.equal(BC.normalizeCampaign(raw, NOW).heroes[0].vitals.health, 11);
    assert.equal(BC.copyCampaign(raw, NOW).heroes[0].vitals.health, 11);
    // And without a function, create() is the plain api.
    assert.equal(C.create(), C);
  });

  test('a manual hero: downed falls back to the numbers as typed', () => {
    const card = C.manualCard({ hp: 12, wounds: 4, evasion: 13, armor: 3, fortitude: 9, speed: 6 });
    assert.deepEqual(card.base, card.build);
    assert.equal(card.healthBase, 12);
  });
});

describe('normalizeCampaign — the one door in', () => {
  test('a good campaign survives a round trip unchanged', () => {
    const c = campaignWith({ enemies: [{ name: 'Goblin' }] });
    c.enemies[0].attacks.push(C.normalizeAttack({ name: 'Spear', toHit: 4, damage: '1d6', tags: ['Reach'] }, new Set()));
    c.combat = C.startCombat(c, { groups: [{ enemyId: c.enemies[0].id, count: 2 }] });
    const back = C.normalizeCampaign(JSON.parse(JSON.stringify(c)), NOW);
    assert.deepEqual(back, c);
  });

  test('nothing campaign-shaped is refused outright', () => {
    for (const junk of [null, undefined, 42, 'campaign', [], true]) assert.equal(C.normalizeCampaign(junk, NOW), null);
  });

  test('unknown fields are dropped; strings are capped; numbers clamped', () => {
    const c = C.normalizeCampaign({
      name: 'x'.repeat(500), subtitle: 7, evil: '<script>', __proto__: { polluted: true },
      heroes: [{ name: 'Brin', card: { healthBase: 1e9, woundsMax: -3, build: { armor: 'lots' } },
        vitals: { health: -5, wounds: 99, effects: [{ id: 'boon.protection', stacks: 1e6 }] } }],
    }, NOW);
    assert.equal(c.name.length, C.LIMITS.NAME);
    assert.equal(c.subtitle, '');
    assert.equal('evil' in c, false);
    assert.equal(c.polluted, undefined);
    const h = c.heroes[0];
    assert.deepEqual([h.card.healthBase, h.card.woundsMax, h.card.build.armor], [C.LIMITS.STAT, 0, 0]);
    assert.deepEqual([h.vitals.health, h.vitals.wounds, h.vitals.effects[0].stacks], [0, 0, C.LIMITS.STACKS]);
  });

  test('hostile and duplicate ids are replaced, never kept', () => {
    const c = C.normalizeCampaign({
      id: '"><img src=x onerror=alert(1)>',
      heroes: [{ id: 'same', name: 'A' }, { id: 'same', name: 'B' }],
      enemies: [{ id: 'a b', name: 'C' }],
    }, NOW);
    const ids = [c.id, ...c.heroes.map((h) => h.id), ...c.enemies.map((e) => e.id)];
    for (const id of ids) assert.match(id, C.SAFE_ID);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(c.heroes[0].id, 'same');       // the first keeps it, the second gets a fresh one
  });

  test('Health over the pool is clamped to it, like Mana and Wounds', () => {
    const c = C.normalizeCampaign({ heroes: [
      { card: { ...CARD, healthBase: 10 }, vitals: { health: 999 } },
      { card: { ...CARD, healthBase: null }, vitals: { health: 7 } },     // no class: no pool
    ] }, NOW);
    assert.deepEqual(c.heroes.map((h) => h.vitals.health), [10, 0]);
  });

  test('an effect with a hostile id is dropped from the vitals', () => {
    const c = C.normalizeCampaign({ heroes: [{ vitals: { effects: [{ id: 'x"y', stacks: 1 }, { id: 'boon.protection' }] } }] }, NOW);
    assert.deepEqual(c.heroes[0].vitals.effects, [{ id: 'boon.protection', stacks: 1 }]);
  });

  test('a damage expression the dice engine would refuse is not kept', () => {
    const used = new Set();
    assert.equal(C.normalizeAttack({ damage: '2d8+3' }, used).damage, '2d8+3');
    assert.equal(C.normalizeAttack({ damage: '2d8+' }, used).damage, '');
    assert.equal(C.normalizeAttack({ damage: '9999d6' }, used).damage, '');
  });

  test('an enemy with no HP is still a body: HP is at least 1', () => {
    const c = C.normalizeCampaign({ enemies: [{ name: 'Wisp', stats: { hp: 0 } }] }, NOW);
    assert.equal(c.enemies[0].stats.hp, 1);
  });

  test('a fight whose enemy was deleted loses that fighter, not the fight', () => {
    const c = campaignWith({ enemies: [{ name: 'Goblin' }, { name: 'Ogre' }] });
    c.combat = C.startCombat(c, { groups: [{ enemyId: c.enemies[0].id, count: 1 }, { enemyId: c.enemies[1].id, count: 1 }] });
    const raw = JSON.parse(JSON.stringify(c));
    raw.enemies = raw.enemies.slice(1);
    const back = C.normalizeCampaign(raw, NOW);
    assert.equal(back.combat.fighters.filter((f) => f.kind === 'enemy').length, 1);
  });
});

describe('heroes and enemies run through the player\'s own rules', () => {
  test('a hero card + vitals: the Wound cascade, Armor from Wounds', () => {
    const h = C.newHero({ name: 'Elara', card: CARD }, NOW);
    V.damage(h.card, h.vitals, 'health', 12);       // 9 empties the bar → Wound, refill, 3 over
    assert.deepEqual([h.vitals.health, h.vitals.wounds], [6, 1]);
    assert.equal(V.armor(h.card, h.vitals), 2 - 2);
  });

  test('an enemy with no Wounds: one bar, Armor off each hit, downed at 0', () => {
    const c = campaignWith({ heroes: 0, enemies: [{ name: 'Ogre', stats: { hp: 20, armor: 3, wounds: 0 } }] });
    const card = C.enemyCard(c.enemies[0]);
    const v = C.freshVitals(card);
    const land = (hit, piercing) => V.damage(card, v, 'health', damageAfterArmor(hit, V.armor(card, v), piercing));
    land(8);                                        // 8 − 3 Armor = 5
    assert.equal(v.health, 15);
    land(8, true);                                  // Armor Piercing: all 8
    assert.equal(v.health, 7);
    assert.equal(land(50).downed, true);
    assert.equal(V.isDowned(card, v), true);
  });

  test('an enemy with Wounds takes them like a hero', () => {
    const c = campaignWith({ heroes: 0, enemies: [{ name: 'Knight', stats: { hp: 10, wounds: 2 } }] });
    const card = C.enemyCard(c.enemies[0]);
    const v = C.freshVitals(card);
    V.damage(card, v, 'health', 14);
    assert.deepEqual([v.health, v.wounds], [6, 1]);
  });
});

describe('combat — pick who acts next, round by round', () => {
  const setup = (opts = {}) => {
    const c = campaignWith({ heroes: 3, enemies: [
      { name: 'Goblin', stats: { hp: 6 } },
      { name: 'Ogre', turns: 3, stats: { hp: 40 } },
    ] });
    const [goblin, ogre] = c.enemies;
    const combat = C.startCombat(c, { groups: [
      { enemyId: goblin.id, count: 3, shareTurn: true },
      { enemyId: ogre.id, count: 1 },
    ], ...opts });
    return { c, combat, goblin, ogre };
  };
  const byKind = (combat, kind) => combat.fighters.filter((f) => f.kind === kind);

  test('everyone joins; a group sharing a turn is one fighter with its own members', () => {
    const { combat } = setup();
    const enemies = byKind(combat, 'enemy');
    assert.equal(byKind(combat, 'hero').length, 3);
    assert.equal(enemies.length, 2);
    assert.equal(enemies[0].members.length, 3);
    assert.equal(enemies[0].members[0].vitals.health, 6);
    assert.equal(enemies[1].turns, 3);
  });

  test('without sharing, each enemy is its own fighter', () => {
    const c = campaignWith({ heroes: 1, enemies: [{ name: 'Goblin' }] });
    const combat = C.startCombat(c, { groups: [{ enemyId: c.enemies[0].id, count: 3 }] });
    assert.equal(byKind(combat, 'enemy').length, 3);
  });

  test('up next lists everyone with a turn left, heroes first', () => {
    const { combat } = setup();
    const kinds = C.upNext(combat).map((f) => f.kind);
    assert.deepEqual(kinds, ['hero', 'hero', 'hero', 'enemy', 'enemy']);
  });

  test('picking is not committing: a mis-tap is fixed by picking again', () => {
    const { combat } = setup();
    const [a, b] = byKind(combat, 'hero');
    assert.equal(C.pick(combat, a.id), true);
    assert.equal(C.pick(combat, b.id), true);
    assert.equal(combat.current, b.id);
    assert.equal(a.taken, 0);
  });

  test('ending a turn spends it; someone with none left cannot be picked', () => {
    const { combat } = setup();
    const [a] = byKind(combat, 'hero');
    C.pick(combat, a.id);
    C.endTurn(combat);
    assert.deepEqual([a.taken, combat.current], [1, null]);
    assert.equal(C.pick(combat, a.id), false);
    assert.equal(C.upNext(combat).includes(a), false);
  });

  test('a boss with three turns stays up next until all three are spent', () => {
    const { combat } = setup();
    const boss = byKind(combat, 'enemy')[1];
    for (let i = 0; i < 3; i++) {
      assert.equal(C.pick(combat, boss.id), true, `turn ${i + 1}`);
      C.endTurn(combat);
    }
    assert.equal(C.turnsLeft(boss), 0);
    assert.equal(C.pick(combat, boss.id), false);
  });

  test('the round is over when nobody has a turn left; a new round resets everyone', () => {
    const { combat } = setup();
    for (const f of combat.fighters) {
      while (C.turnsLeft(f)) { C.pick(combat, f.id); C.endTurn(combat); }
    }
    assert.equal(C.roundOver(combat), true);
    C.nextRound(combat);
    assert.equal(combat.round, 2);
    assert.equal(combat.fighters.every((f) => f.taken === 0), true);
    assert.equal(C.roundOver(combat), false);
  });

  test('someone out of the fight does not hold the round open, but can still be picked', () => {
    const { combat } = setup();
    const downed = byKind(combat, 'hero')[0];
    const isOut = (f) => f === downed;
    for (const f of combat.fighters) {
      if (f === downed) continue;
      while (C.turnsLeft(f)) { C.pick(combat, f.id); C.endTurn(combat); }
    }
    assert.equal(C.roundOver(combat, isOut), true);
    assert.equal(C.pick(combat, downed.id), true);   // a Revive, say
  });

  // Designer ruling 2026-11-14: no surprise round. Everyone can act in
  // round 1, and an old save's flag is dropped on the way in.
  test('there is no surprise round: everyone is up in round 1, and an old flag is dropped', () => {
    const { c, combat } = setup({ surprise: true });
    assert.equal(combat.round, 1);
    assert.equal('surprise' in combat, false);
    assert.equal(C.pick(combat, byKind(combat, 'enemy')[0].id), true);
    c.combat = { ...JSON.parse(JSON.stringify(combat)), surprise: true };
    const back = C.normalizeCampaign(JSON.parse(JSON.stringify(c)));
    assert.equal('surprise' in back.combat, false);
    assert.equal(back.combat.fighters.length, combat.fighters.length);
  });

  test('the round count goes up each time the line has gone through everyone', () => {
    const { combat } = setup();
    for (let round = 1; round <= 3; round++) {
      assert.equal(combat.round, round);
      for (const f of combat.fighters) {
        while (C.turnsLeft(f)) { C.pick(combat, f.id); C.endTurn(combat); }
      }
      assert.equal(C.roundOver(combat), true);
      C.nextRound(combat);
    }
    assert.equal(combat.round, 4);
  });

  test('fight ids never collide with a hero\'s or an enemy\'s', () => {
    const { c, combat } = setup();
    const outside = new Set([...c.heroes, ...c.enemies].map((x) => x.id));
    const inside = combat.fighters.flatMap((f) => [f.id, ...(f.members || []).map((m) => m.id)]);
    assert.equal(inside.some((id) => outside.has(id)), false);
    // A hostile save that reuses a hero's id for a member gets a fresh one.
    const raw = JSON.parse(JSON.stringify({ ...c, combat }));
    raw.combat.fighters.find((f) => f.kind === 'enemy').members[0].id = c.heroes[0].id;
    const back = C.normalizeCampaign(raw);
    const m = back.combat.fighters.find((f) => f.kind === 'enemy').members[0];
    assert.notEqual(m.id, c.heroes[0].id);
  });

  test('memberIn finds one enemy in the fight; restoreMember puts it back to full', () => {
    const { combat, goblin } = setup();
    const group = byKind(combat, 'enemy')[0];
    const m = group.members[1];
    const found = C.memberIn(combat, m.id);
    assert.equal(found.fighter, group);
    assert.equal(found.member, m);
    assert.equal(C.memberIn(combat, 'nobody'), null);
    assert.equal(C.memberIn(null, m.id), null);
    m.vitals.health = 0;
    m.vitals.effects.push({ id: 'condition.slow', stacks: 2 });
    C.restoreMember(goblin, m);
    assert.deepEqual([m.vitals.health, m.vitals.effects.length], [6, 0]);
  });

  test('settleCombat: a fighter whose hero or stat card is gone leaves the fight', () => {
    const { c, combat, ogre } = setup();
    c.combat = combat;
    c.heroes.splice(0, 1);
    c.enemies.splice(c.enemies.indexOf(ogre), 1);
    C.settleCombat(c);
    assert.equal(c.combat.fighters.filter((f) => f.kind === 'hero').length, 2);
    assert.equal(c.combat.fighters.filter((f) => f.kind === 'enemy').length, 1);
  });

  test('settleCombat: a stat card edited down clamps every member\'s Health to it', () => {
    const { c, combat, ogre } = setup();
    c.combat = combat;
    ogre.stats.hp = 25;                              // was 40, and the Ogre is untouched
    C.settleCombat(c);
    const member = c.combat.fighters.find((f) => f.enemyId === ogre.id).members[0];
    assert.equal(member.vitals.health, 25);
  });
});

describe('the Monster Compendium', () => {
  test('three stock goblins, every one on the same base numbers, read-only by id', () => {
    const stock = C.stockMonsters(NOW);
    assert.deepEqual(stock.map((m) => m.name), ['Goblin 1', 'Goblin 2', 'Goblin 3']);
    for (const m of stock) {
      assert.deepEqual(m.stats, { hp: 10, mana: 0, wounds: 0, evasion: 10, armor: 0, fortitude: 8, speed: 5 });
      assert.equal(m.attacks[0].damage, '1d6');
      assert.equal(C.isStockMonster(m.id), true);
    }
    assert.equal(C.isStockMonster('enemy_x'), false);
    // Frozen: nothing at run time can edit a built-in.
    assert.throws(() => { 'use strict'; C.STOCK_MONSTERS[0].stats.hp = 99; });
  });

  test('a campaign takes a COPY: new ids, same name and numbers', () => {
    const [g] = C.stockMonsters(NOW);
    const copy = C.freshEnemy(g, NOW);
    assert.notEqual(copy.id, g.id);
    assert.notEqual(copy.attacks[0].id, g.attacks[0].id);
    assert.equal(copy.name, 'Goblin 1');
    assert.deepEqual(copy.stats, g.stats);
    copy.stats.hp = 1;
    assert.equal(C.stockMonsters(NOW)[0].stats.hp, 10);
  });

  test('the stored half is rebuilt through the one door; a stock id is never shadowed', () => {
    const list = C.normalizeMonsters({ monsters: [
      { id: 'enemy_mine', name: 'Wraith', stats: { hp: 30 } },
      { id: 'stock_goblin_1', name: 'Fake goblin' },
      'junk', null, [1],
      { id: '"><b>', name: '<b>Imp</b>', attacks: [{ damage: '1d6);alert(1' }] },
    ] }, NOW);
    assert.equal(list.length, 3);
    assert.equal(list[0].id, 'enemy_mine');
    assert.notEqual(list[1].id, 'stock_goblin_1');
    assert.match(list[2].id, C.SAFE_ID);
    assert.equal(list[2].attacks[0].damage, '');
    assert.deepEqual(C.normalizeMonsters(null), []);
  });
});

describe('enemies: duplicates and the monster file', () => {
  const ogre = () => {
    const e = C.newEnemy({ name: 'Ogre Brute' }, NOW);
    Object.assign(e, { turns: 2, tags: ['Boss', 'Large'] });
    Object.assign(e.stats, { hp: 40, armor: 3, wounds: 2 });
    e.attacks.push(C.normalizeAttack({ name: 'Greatclub', toHit: 5, damage: '2d8+3', desc: 'Knockback 2' }, new Set()));
    return e;
  };

  test('a duplicate is the same monster under fresh ids, and says it is a copy', () => {
    const a = ogre();
    const b = C.duplicateEnemy(a, NOW);
    assert.notEqual(b.id, a.id);
    assert.notEqual(b.attacks[0].id, a.attacks[0].id);
    assert.equal(b.name, 'Ogre Brute (copy)');
    assert.deepEqual([b.stats, b.turns, b.tags, b.attacks[0].damage], [a.stats, a.turns, a.tags, '2d8+3']);
  });

  test('a monster file round-trips as copies, without device bookkeeping', () => {
    const a = ogre();
    const file = C.bestiaryFile([a], { title: 'The Ashen Road', now: NOW });
    assert.deepEqual(file.meepleBestiary, { schemaVersion: C.BESTIARY_VERSION, exported: '2026-11-13', title: 'The Ashen Road' });
    assert.equal('rev' in file.enemies[0], false);
    const back = C.readBestiary(JSON.parse(JSON.stringify(file)), NOW);
    assert.equal(back.title, 'The Ashen Road');
    assert.equal(back.enemies.length, 1);
    const e = back.enemies[0];
    assert.notEqual(e.id, a.id);                         // a copy, never a claim on the original
    assert.deepEqual([e.name, e.stats, e.turns, e.attacks[0].damage, e.attacks[0].desc],
      [a.name, a.stats, a.turns, '2d8+3', 'Knockback 2']);
  });

  test('what is not a monster file is refused, and why', () => {
    for (const junk of [null, 42, [], {}, { enemies: [] }, { meepleBestiary: 1, enemies: [] }]) {
      assert.equal(C.readBestiary(junk, NOW).error, 'shape');
    }
    assert.deepEqual(C.readBestiary({ meepleBestiary: { schemaVersion: 99 }, enemies: [{}] }, NOW), { error: 'newer', version: 99 });
    assert.equal(C.readBestiary({ meepleBestiary: { schemaVersion: 1 }, enemies: ['x', null] }, NOW).error, 'empty');
  });

  test('a hostile monster file is rebuilt: bad ids replaced, bad dice dropped', () => {
    const back = C.readBestiary({ meepleBestiary: { schemaVersion: 1 }, enemies: [{
      id: '"><script>', name: 'x'.repeat(500), stats: { hp: 1e9, evasion: 'high' },
      attacks: [{ id: 'a"b', name: 'Bite', damage: '1d6+;alert(1)' }], evil: true,
    }] }, NOW);
    const e = back.enemies[0];
    assert.match(e.id, C.SAFE_ID);
    assert.match(e.attacks[0].id, C.SAFE_ID);
    assert.equal(e.name.length, C.LIMITS.NAME);
    assert.deepEqual([e.stats.hp, e.stats.evasion, e.attacks[0].damage, 'evil' in e], [C.LIMITS.STAT, 0, '', false]);
  });

  test('a campaign restored as a copy gets a fresh id; its insides keep theirs', () => {
    const c = campaignWith({ enemies: [{ name: 'Goblin' }] });
    const copy = C.copyCampaign(JSON.parse(JSON.stringify(c)), NOW);
    assert.notEqual(copy.id, c.id);
    assert.equal(copy.heroes[0].id, c.heroes[0].id);
    assert.equal(copy.enemies[0].id, c.enemies[0].id);
    assert.equal(C.copyCampaign('junk', NOW), null);
  });
});
