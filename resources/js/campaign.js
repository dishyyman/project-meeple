/* =====================================================================
   MEEPLE — CAMPAIGNS (Game Master Tools)
   ---------------------------------------------------------------------
   The data a Game Master keeps, and the rules for keeping it tidy: a
   campaign holds a party of HEROES, a list of ENEMIES, and the FIGHT in
   progress. Pure, like dice.js and mechanics.js — no DOM, no storage, no
   UI state — so it is unit-tested in Node (tests/unit/campaign.test.js)
   and loaded by the app as a classic <script>.

   WHAT A HERO IS, AND WHY
     A GM never holds a player's whole character. They hold a hero:

       card     the BUILD half of every derived stat, as plain numbers —
                mechanics.js heroCard(), worked out on the PLAYER'S device
                and carried in their character file. The GM's device never
                recomputes it, so it never depends on which compendium the
                GM has installed.
       vitals   what is happening to them: health, mana, wounds, patches,
                effects. Changed only through mechanics.js `vitals` rules
                (damage, heal, setWounds…), the same ones the player's own
                sheet uses.
       notes    the GM's own, never the player's.

     That three-way split is the permission boundary a live, online
     version will need: the player's device publishes the card, both sides
     change the vitals (by named operations a server can replay through
     mechanics.js), and the notes stay the GM's. Building it in now is what
     lets the online version be a new transport rather than a rewrite. See
     docs/architecture.md, Decision 12.

   AN ENEMY IS A CARD TOO
     An enemy's stat block becomes a card (enemyCard) with its base and
     build the same — it has no gear — so the one vitals engine runs heroes
     and enemies alike: the Wound cascade if the block gives Wounds, a
     single bar that downs at 0 if it leaves them empty, Armor against a hit
     either way. The record's shape is meant to be a MONSTER COMPENDIUM
     entry one day, imported and exported like the game's other content; a
     campaign keeps its own COPY, so editing an enemy here never changes
     the compendium.

   EVERY RECORD CARRIES { id, rev, updated }
     A permanent id (never an array position), a change counter and a
     timestamp. Saving on one device needs none of them; syncing between
     devices needs all three, and adding them later would mean migrating
     every campaign already saved.

   UNTRUSTED INPUT
     Everything here may come from storage someone edited, from a file, or
     — one day — from the network. normalizeCampaign() is the one door: it
     clamps every number, caps every string, drops every id that is not a
     safe token and rebuilds the record from known fields only. Nothing
     unknown survives it.
   ===================================================================== */
(function (root) {
  'use strict';

  // Dice expressions are checked with THE dice engine, never a second parser.
  const DICE = root.MEEPLE_DICE || (typeof require === 'function' ? require('./dice.js') : null);
  const MECH = root.MEEPLE_MECHANICS || (typeof require === 'function' ? require('./mechanics.js') : null);
  const CHECK = root.MEEPLE_LIBRARY_CHECK || (typeof require === 'function' ? require('./library-check.js') : null);

  /* ------------------------------------------------------------------ */
  /* LIMITS — guards on input, not game rules                           */
  /* ------------------------------------------------------------------ */
  const LIMITS = Object.freeze({
    NAME: 60,            // a campaign, hero, enemy or attack name
    SUBTITLE: 80,        // the free line under a campaign's name
    LABEL: 40,           // "Hunter 5"
    TAG: 24,             // one tag on an enemy or an attack
    TAGS: 8,             // tags per thing
    TEXT: 2000,          // notes, an ability's description
    HEROES: 24,          // a very large table — see the plan's "larger party"
    ENEMIES: 200,        // a campaign's whole bestiary
    ATTACKS: 12,         // attacks or abilities per enemy
    FIGHTERS: 60,        // everyone in one fight
    GROUP: 20,           // enemies sharing one turn
    TURNS: 10,           // turns per round — a boss can have several
    STAT: 999,           // the largest number any stat may hold
    STACKS: 99,          // effect stacks, as mechanics.js MAX_STACKS
    DICE: 40,            // a damage expression's length
  });

  // The same token the character importer accepts (applySave's SAFE_ID): ids
  // end up in data-* attributes and selectors, so anything else is refused.
  // For ids this file MAKES — campaigns, heroes, enemies, fighters.
  const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
  // For ids that name COMPENDIUM content (a Boon or Condition on someone's
  // vitals): the compendium's own rule, borrowed from library-check.js so
  // there is one definition of what a content id looks like.
  const CONTENT_ID = (CHECK && CHECK.ID_RE) || /^[a-z]+\.[a-z0-9-]+$/;

  /* ---- small tidy-ups, used by every normalizer ---------------------- */
  const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  const arr = (x) => (Array.isArray(x) ? x : []);
  const str = (x, max) => (typeof x === 'string' ? x.trim().slice(0, max) : '');
  // Whole numbers in [lo, hi]; junk becomes `fallback`.
  const int = (x, lo, hi, fallback = 0) => {
    const n = Math.trunc(Number(x));
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
  };
  const stat = (x, fallback = 0) => int(x, -LIMITS.STAT, LIMITS.STAT, fallback);
  const count = (x, fallback = 0) => int(x, 0, LIMITS.STAT, fallback);
  const isoOr = (x, fallback) => (typeof x === 'string' && !Number.isNaN(Date.parse(x)) ? x : fallback);
  const tags = (x) => arr(x).map((t) => str(t, LIMITS.TAG)).filter(Boolean).slice(0, LIMITS.TAGS);

  /* ---- ids ----------------------------------------------------------- */
  // Random rather than counted: two devices making records offline must
  // never pick the same id, and a later sync merges by id.
  function newId(prefix) {
    const c = root.crypto;
    const body = c && typeof c.randomUUID === 'function'
      ? c.randomUUID().replace(/-/g, '').slice(0, 20)
      : Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    return `${prefix}_${body}`;
  }

  /* An id from outside is kept only if it is a safe token that has not
     already been used in this record; otherwise a fresh one is minted. A
     duplicate is not an error worth refusing a whole campaign over — it is a
     collision worth breaking. */
  function idFrom(raw, prefix, used) {
    const id = typeof raw === 'string' && SAFE_ID.test(raw) && !used.has(raw) ? raw : newId(prefix);
    used.add(id);
    return id;
  }

  const nowIso = () => new Date().toISOString();

  /* Mark a record changed: bump its counter, stamp the time. Every change a
     GM makes goes through here, so a later sync can tell which copy is newer
     without comparing contents. */
  function touch(record, now = nowIso()) {
    record.rev = (record.rev || 0) + 1;
    record.updated = now;
    return record;
  }

  const meta = (raw, now) => ({
    rev: count(raw.rev, 0),
    updated: isoOr(raw.updated, now),
  });

  /* ------------------------------------------------------------------ */
  /* CARDS — the build half, for heroes and enemies alike               */
  /* ------------------------------------------------------------------ */
  const DEFENCES = ['evasion', 'armor', 'fortitude', 'speed'];

  function normalizeCard(raw) {
    const c = obj(raw);
    const block = (b) => {
      const o = obj(b);
      return Object.fromEntries(DEFENCES.map((k) => [k, stat(o[k])]));
    };
    return {
      // null is a real value: a sheet with no class yet has no pool.
      healthBase: c.healthBase === null ? null : stat(c.healthBase),
      manaMax: count(c.manaMax),
      woundsMax: int(c.woundsMax, 0, 20),
      patchesMax: int(c.patchesMax, 0, 20),
      base: block(c.base),
      build: block(c.build),
    };
  }

  /* A hero typed in by hand, from the numbers the player reads off their
     sheet. There is no class block to fall back to, so being downed drops
     Evasion and Fortitude to the numbers as typed — the GM can see the
     downed state on the card either way. */
  function manualCard({ hp, mana, wounds, patches, evasion, armor, fortitude, speed } = {}) {
    const block = { evasion: stat(evasion), armor: stat(armor), fortitude: stat(fortitude), speed: stat(speed) };
    return normalizeCard({
      healthBase: count(hp), manaMax: count(mana),
      woundsMax: wounds, patchesMax: patches,
      base: block, build: block,
    });
  }

  /* An enemy's stat block as a card. Base and build are the same: an enemy
     carries no gear, so "everything a standing body adds" is already in the
     numbers the GM wrote. Empty Wounds → 0 → one bar that downs at 0. */
  function enemyCard(enemy) {
    const s = obj(obj(enemy).stats);
    const block = { evasion: stat(s.evasion), armor: stat(s.armor), fortitude: stat(s.fortitude), speed: stat(s.speed) };
    return normalizeCard({
      healthBase: count(s.hp), manaMax: count(s.mana),
      woundsMax: s.wounds, patchesMax: 0,
      base: block, build: block,
    });
  }

  /* ------------------------------------------------------------------ */
  /* VITALS                                                             */
  /* Effect ids are checked for SHAPE here. Whether this device's        */
  /* compendium knows them is the app's call at render time — the same   */
  /* split applySave() makes — because the hero came from a player whose */
  /* compendium may be newer.                                            */
  /* ------------------------------------------------------------------ */
  const FLOOR = (MECH && MECH.RULES.HEALTH_MAX_FLOOR) || 1;

  // Topped up: what a hero or an enemy starts a session or a fight with.
  // Effects that lift the pool are not counted — a fresh body has none.
  function freshVitals(card) {
    const c = normalizeCard(card);
    return {
      health: c.healthBase == null ? 0 : Math.max(FLOOR, c.healthBase),
      mana: c.manaMax, wounds: 0, patches: c.patchesMax, effects: [],
    };
  }

  function normalizeVitals(raw, card) {
    const v = obj(raw);
    const seen = new Set();
    const effects = arr(v.effects)
      .map((e) => obj(e))
      .filter((e) => typeof e.id === 'string' && e.id.length <= 64 && CONTENT_ID.test(e.id)
        && !seen.has(e.id) && seen.add(e.id))
      .map((e) => ({ id: e.id, stacks: int(e.stacks, 1, LIMITS.STACKS, 1) }));
    return {
      health: count(v.health),
      mana: Math.min(card.manaMax, count(v.mana)),
      wounds: Math.min(card.woundsMax, count(v.wounds)),
      patches: Math.min(card.patchesMax, count(v.patches)),
      effects,
    };
  }

  /* ------------------------------------------------------------------ */
  /* HEROES                                                             */
  /* ------------------------------------------------------------------ */

  /* `card` comes from mechanics.js heroCard() (a file import) or
     manualCard() (typed in). `characterId` is the player's own id for the
     character, kept so a newer file updates this hero rather than adding a
     second one — and so a future "join with this hero" can find it.
     `vitals` defaults to topped up; a file import passes the player's
     current state instead. */
  function newHero({ name, label = '', card, vitals = null, characterId = null, source = 'manual' }, now = nowIso()) {
    const c = normalizeCard(card);
    return {
      id: newId('hero'),
      characterId: typeof characterId === 'string' && SAFE_ID.test(characterId) ? characterId : null,
      source: source === 'file' ? 'file' : 'manual',
      name: str(name, LIMITS.NAME) || 'Unnamed hero',
      label: str(label, LIMITS.LABEL),
      card: c,
      vitals: vitals ? normalizeVitals(vitals, c) : freshVitals(c),
      notes: '',
      rev: 1,
      updated: now,
    };
  }

  /* A newer file for a hero already in the party. The CARD is replaced —
     the player's device is the authority for it — but the vitals the GM has
     been tracking are kept, only clamped to the new maxima: a level-up in
     the middle of a session should not refill anyone's health. */
  function refreshHero(hero, { name, label, card }, now = nowIso()) {
    hero.card = normalizeCard(card);
    if (name) hero.name = str(name, LIMITS.NAME) || hero.name;
    if (label !== undefined) hero.label = str(label, LIMITS.LABEL);
    hero.vitals = normalizeVitals(hero.vitals, hero.card);
    return touch(hero, now);
  }

  function normalizeHero(raw, used, now) {
    const h = obj(raw);
    const card = normalizeCard(h.card);
    return {
      id: idFrom(h.id, 'hero', used),
      characterId: typeof h.characterId === 'string' && SAFE_ID.test(h.characterId) ? h.characterId : null,
      source: h.source === 'file' ? 'file' : 'manual',
      name: str(h.name, LIMITS.NAME) || 'Unnamed hero',
      label: str(h.label, LIMITS.LABEL),
      card,
      vitals: normalizeVitals(h.vitals, card),
      notes: str(h.notes, LIMITS.TEXT),
      ...meta(h, now),
    };
  }

  /* ------------------------------------------------------------------ */
  /* ENEMIES — shaped as a future monster compendium entry              */
  /* ------------------------------------------------------------------ */

  /* An attack: to-hit and damage the sheet's roll boxes can roll, plus
     whether it pierces Armor. A damage expression is kept only if the dice
     engine accepts it — an expression the roller would refuse is not an
     attack, it is a typo, and keeping it would put a box on screen that
     errors when pressed. */
  function normalizeAttack(raw, used) {
    const a = obj(raw);
    const dmg = str(a.damage, LIMITS.DICE);
    const ok = dmg && DICE && DICE.validateDice(dmg) === null;
    return {
      id: idFrom(a.id, 'atk', used),
      name: str(a.name, LIMITS.NAME) || 'Attack',
      toHit: stat(a.toHit),
      damage: ok ? dmg : '',
      piercing: a.piercing === true,
      mana: count(a.mana),
      tags: tags(a.tags),
      desc: str(a.desc, LIMITS.TEXT),
    };
  }

  // A stat block. Mana and Wounds are optional on purpose: an empty Wounds
  // field means one health bar (designer ruling, 2026-11-13).
  function newEnemy({ name = 'New enemy' } = {}, now = nowIso()) {
    return {
      id: newId('enemy'),
      name: str(name, LIMITS.NAME) || 'New enemy',
      tags: [],
      turns: 1,
      stats: { hp: 10, mana: 0, wounds: 0, evasion: 10, armor: 0, fortitude: 8, speed: 5 },
      attacks: [],
      notes: '',
      rev: 1,
      updated: now,
    };
  }

  function normalizeEnemy(raw, used, now) {
    const e = obj(raw);
    const s = obj(e.stats);
    const attackIds = new Set();
    return {
      id: idFrom(e.id, 'enemy', used),
      name: str(e.name, LIMITS.NAME) || 'Unnamed enemy',
      tags: tags(e.tags),
      turns: int(e.turns, 1, LIMITS.TURNS, 1),
      stats: {
        hp: int(s.hp, 1, LIMITS.STAT, 1),
        mana: count(s.mana),
        wounds: int(s.wounds, 0, 20),
        evasion: stat(s.evasion), armor: stat(s.armor),
        fortitude: stat(s.fortitude), speed: stat(s.speed),
      },
      attacks: arr(e.attacks).slice(0, LIMITS.ATTACKS).map((a) => normalizeAttack(a, attackIds)),
      notes: str(e.notes, LIMITS.TEXT),
      ...meta(e, now),
    };
  }

  /* A second of an enemy — "Goblin, but bigger". A fresh id for it and for
     each attack, and "(copy)" on the name so the two can be told apart until
     the GM renames one. Rebuilt through normalizeEnemy(), like everything. */
  function duplicateEnemy(enemy, now = nowIso()) {
    const raw = JSON.parse(JSON.stringify(enemy));
    raw.id = null;
    for (const a of arr(raw.attacks)) a.id = null;
    raw.name = `${str(raw.name, LIMITS.NAME - 7)} (copy)`;
    const copy = normalizeEnemy(raw, new Set(), now);
    copy.rev = 1;
    copy.updated = now;
    return copy;
  }

  /* ------------------------------------------------------------------ */
  /* THE MONSTER FILE — enemies, carried between campaigns and GMs      */
  /* ------------------------------------------------------------------ */
  /* The start of the monster compendium (docs/bestiary-file.md):

       { "meepleBestiary": { schemaVersion, exported, title },
         "enemies": [ …stat blocks, the shape normalizeEnemy() keeps… ] }

     Versioned like the character file, with the same promise: a file is
     refused only if it is NEWER than this app understands, and every older
     one stays readable. Pretty-printed JSON, so a GM can read one without
     the app. */
  const BESTIARY_VERSION = 1;

  function bestiaryFile(enemies, { title = 'Enemies', now = nowIso() } = {}) {
    return {
      meepleBestiary: { schemaVersion: BESTIARY_VERSION, exported: now.slice(0, 10), title: str(title, LIMITS.NAME) },
      // Without rev/updated: those are facts about one device's copy, not
      // about the monster, and must not travel as though they were.
      enemies: arr(enemies).map((e) => {
        const { rev, updated, ...rest } = e;
        return JSON.parse(JSON.stringify(rest));
      }),
    };
  }

  /* Read a parsed monster file. Returns { enemies, title } — every enemy a
     COPY with fresh ids, rebuilt by normalizeEnemy() — or { error } naming
     what is wrong ('shape', 'newer', 'empty') for the app to put in words.
     Importing the same file twice gives two copies: a monster file is a
     catalogue to draw from, not a claim on any card already here. */
  function readBestiary(raw, now = nowIso()) {
    const head = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw.meepleBestiary : null;
    if (!head || typeof head !== 'object' || !Array.isArray(raw.enemies)) return { error: 'shape' };
    if (Number(head.schemaVersion) > BESTIARY_VERSION) return { error: 'newer', version: Number(head.schemaVersion) };
    const enemies = raw.enemies.filter((e) => e && typeof e === 'object' && !Array.isArray(e))
      .slice(0, LIMITS.ENEMIES)
      .map((e) => {
        const copy = normalizeEnemy({ ...e, id: null, attacks: arr(e.attacks).map((a) => ({ ...obj(a), id: null })) }, new Set(), now);
        copy.rev = 1;
        copy.updated = now;
        return copy;
      });
    if (!enemies.length) return { error: 'empty' };
    return { enemies, title: str(head.title, LIMITS.NAME) };
  }

  /* ------------------------------------------------------------------ */
  /* COMBAT — who has acted this round                                  */
  /* ------------------------------------------------------------------ */
  /* There is no initiative ORDER to compute. The guide's order changes with
     the table, so the GM picks who acts next from everyone who still has a
     turn left this round; ending a turn spends one; when nobody has any
     left, a new round gives everyone their turns back.

       fighter   a hero, or an enemy (or a group of the same enemy sharing
                 ONE turn, each member with its own health)
       turns     how many turns a round it gets — a boss can have several
       taken     how many it has used this round
       current   the fighter acting now, or null between turns

     A SURPRISE round is one the party takes alone (guide: "a full round of
     combat before the surprised targets can act").

     Downed heroes and defeated enemies are not this file's business — that
     needs the vitals engine. Callers pass `isOut(fighter)` where it matters;
     an out fighter can still be picked (a Revive), it just no longer holds
     the round open. */

  /* `groups`: [{ enemyId, count, shareTurn }]. Every hero joins. Each enemy
     member starts topped up from its stat block. */
  function startCombat(campaign, { groups = [], surprise = false } = {}) {
    const used = new Set();
    const fighters = campaign.heroes.map((h) => ({
      id: idFrom(null, 'f', used), kind: 'hero', heroId: h.id, turns: 1, taken: 0,
    }));
    for (const g of arr(groups)) {
      const enemy = campaign.enemies.find((e) => e.id === obj(g).enemyId);
      const n = int(obj(g).count, 0, LIMITS.GROUP, 0);
      if (!enemy || !n) continue;
      const member = (i) => ({ id: idFrom(null, 'm', used), n: i + 1, vitals: freshVitals(enemyCard(enemy)) });
      if (g.shareTurn && n > 1) {
        fighters.push({ id: idFrom(null, 'f', used), kind: 'enemy', enemyId: enemy.id,
          turns: enemy.turns, taken: 0, members: Array.from({ length: n }, (_, i) => member(i)) });
      } else {
        for (let i = 0; i < n; i++) {
          fighters.push({ id: idFrom(null, 'f', used), kind: 'enemy', enemyId: enemy.id,
            turns: enemy.turns, taken: 0, members: [member(i)] });
        }
      }
    }
    return { round: 1, surprise: !!surprise, current: null, fighters: fighters.slice(0, LIMITS.FIGHTERS) };
  }

  const turnsLeft = (f) => Math.max(0, f.turns - f.taken);

  // May this fighter take a turn now? Turns left, and not an enemy in the
  // party's surprise round.
  const canAct = (combat, f) => turnsLeft(f) > 0 && !(combat.surprise && f.kind !== 'hero');

  /* Who the GM can pick from, heroes first — the party always opens a fight
     (guide), so that is where the eye should land — and each group in the
     order it joined. */
  function upNext(combat) {
    const ready = combat.fighters.filter((f) => canAct(combat, f));
    return [...ready.filter((f) => f.kind === 'hero'), ...ready.filter((f) => f.kind !== 'hero')];
  }

  /* Picking is not committing: a mis-tap is fixed by picking someone else,
     and nothing is spent until the turn ends. Returns whether it took. */
  function pick(combat, fighterId) {
    const f = combat.fighters.find((x) => x.id === fighterId);
    if (!f || !canAct(combat, f)) return false;
    combat.current = f.id;
    return true;
  }

  function endTurn(combat) {
    const f = combat.fighters.find((x) => x.id === combat.current);
    if (f) f.taken = Math.min(f.turns, f.taken + 1);
    combat.current = null;
  }

  // Over when nobody who can still fight has a turn left.
  const roundOver = (combat, isOut = () => false) =>
    !combat.fighters.some((f) => canAct(combat, f) && !isOut(f));

  function nextRound(combat) {
    combat.round += 1;
    combat.surprise = false;
    combat.current = null;
    for (const f of combat.fighters) f.taken = 0;
  }

  function normalizeCombat(raw, campaign) {
    if (!raw || typeof raw !== 'object') return null;
    const c = obj(raw);
    const used = new Set();
    const heroIds = new Set(campaign.heroes.map((h) => h.id));
    const enemies = new Map(campaign.enemies.map((e) => [e.id, e]));
    const fighters = arr(c.fighters).slice(0, LIMITS.FIGHTERS).map((x) => obj(x)).flatMap((f) => {
      const turns = int(f.turns, 1, LIMITS.TURNS, 1);
      const base = { id: idFrom(f.id, 'f', used), turns, taken: int(f.taken, 0, turns, 0) };
      if (f.kind === 'hero') return heroIds.has(f.heroId) ? [{ ...base, kind: 'hero', heroId: f.heroId }] : [];
      const enemy = enemies.get(f.enemyId);
      if (!enemy) return [];   // its stat block was deleted: it leaves the fight
      const card = enemyCard(enemy);
      const members = arr(f.members).slice(0, LIMITS.GROUP).map((m, i) => ({
        id: idFrom(obj(m).id, 'm', used), n: int(obj(m).n, 1, LIMITS.GROUP, i + 1),
        vitals: normalizeVitals(obj(m).vitals, card),
      }));
      return members.length ? [{ ...base, kind: 'enemy', enemyId: enemy.id, members }] : [];
    });
    return {
      round: int(c.round, 1, 9999, 1),
      surprise: c.surprise === true,
      current: fighters.some((f) => f.id === c.current) ? c.current : null,
      fighters,
    };
  }

  /* ------------------------------------------------------------------ */
  /* CAMPAIGNS                                                          */
  /* ------------------------------------------------------------------ */

  // No "one-shot" or "campaign" label and no session count: a GM who wants
  // either writes it in the subtitle.
  function newCampaign({ name, subtitle = '' } = {}, now = nowIso()) {
    return {
      id: newId('cmp'),
      name: str(name, LIMITS.NAME) || 'New campaign',
      subtitle: str(subtitle, LIMITS.SUBTITLE),
      heroes: [],
      enemies: [],
      combat: null,
      created: now,
      rev: 1,
      updated: now,
    };
  }

  /* The one door in. Returns a campaign rebuilt from known fields only, or
     null when there is nothing campaign-shaped to rebuild. Ids are unique
     across the whole campaign, so a hero and an enemy can never collide in a
     selector. */
  function normalizeCampaign(raw, now = nowIso()) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const used = new Set();
    const c = {
      id: idFrom(raw.id, 'cmp', used),
      name: str(raw.name, LIMITS.NAME) || 'Untitled campaign',
      subtitle: str(raw.subtitle, LIMITS.SUBTITLE),
      heroes: [],
      enemies: [],
      combat: null,
      created: isoOr(raw.created, now),
      ...meta(raw, now),
    };
    c.heroes = arr(raw.heroes).slice(0, LIMITS.HEROES).map((h) => normalizeHero(h, used, now));
    c.enemies = arr(raw.enemies).slice(0, LIMITS.ENEMIES).map((e) => normalizeEnemy(e, used, now));
    c.combat = normalizeCombat(raw.combat, c);
    return c;
  }

  /* A campaign from a backup, restored ALONGSIDE what is here rather than
     over it: the same campaign under a fresh id. Its heroes, enemies and fight
     keep their own ids — those only have to be unique inside the campaign,
     and keeping them is what keeps a fight pointing at its fighters. */
  function copyCampaign(raw, now = nowIso()) {
    const c = normalizeCampaign(raw, now);
    if (!c) return null;
    c.id = newId('cmp');
    return c;
  }

  const api = {
    LIMITS, SAFE_ID, CONTENT_ID,
    newId, touch,
    // cards and vitals
    normalizeCard, manualCard, enemyCard, freshVitals, normalizeVitals,
    // records
    newCampaign, normalizeCampaign, copyCampaign, newHero, refreshHero,
    newEnemy, normalizeEnemy, normalizeAttack, duplicateEnemy,
    // the monster file
    BESTIARY_VERSION, bestiaryFile, readBestiary,
    // combat
    startCombat, turnsLeft, canAct, upNext, pick, endTurn, roundOver, nextRound,
  };

  root.MEEPLE_CAMPAIGN = api;
  // Node loads this file as CommonJS; the browser has no `module` at all.
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
