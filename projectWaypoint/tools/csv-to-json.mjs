#!/usr/bin/env node
/* =====================================================================
   WAYPOINT — CSV → library converter
   ---------------------------------------------------------------------
   Reads the hand-authored sheets in tools/csv/ and emits the game
   library in the two forms the project needs:

     resources/js/library.js   a classic script declaring one global.
                               CHECKED IN, because index.html is opened
                               straight off the filesystem (file://) and a
                               browser blocks BOTH fetch() and ES module
                               imports as cross-origin there. A .json the
                               app fetches simply cannot work without a
                               server, and "no build step" is a promise
                               made to whoever opens the app — not to
                               whoever authors the content.

     tools/out/library.json    the same data, for the import-a-library
                               feature described in docs/library-schema.md.
                               Nothing reads it yet; it exists so that
                               feature has a file to eat when it is built.

   This is a dumb mapping with no translation layer (schema §"contract"):
   a column named `hp` becomes a field named `hp`. If you want a different
   field name, rename the column.

   Usage:  node tools/csv-to-json.mjs
   ===================================================================== */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// The app's real parser, not a copy of it. A malformed `2d8` in a spreadsheet
// has to fail HERE rather than mid-session, and it can only be trusted to do
// that if the check runs the same engine the table will roll on.
const { validateDice } = createRequire(import.meta.url)('../resources/js/dice.js');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------ */
/* METADATA — stamped into the output envelope (schema §1)            */
/* ------------------------------------------------------------------ */
const META = {
  schemaVersion: 1,
  title: 'Waypoint Core Compendium',
  version: '0.1.0',
  updated: new Date().toISOString().slice(0, 10),
  author: 'Mikey',
};

/* ------------------------------------------------------------------ */
/* COLLECTION SPECS                                                   */
/* One entry per sheet tab. `type` drives both coercion and            */
/* validation, so a column's rules live in exactly one place.          */
/*                                                                     */
/* classes, subclasses, items and skills are specified. The remaining   */
/* collections in docs/library-schema.md (abilities, spells, traits)    */
/* are added here when their sheets are authored.                       */
/*                                                                     */
/* `items` is the one spec that ROUTES rather than maps 1:1 — see       */
/* ROUTING below and schema §4.6.                                      */
/* ------------------------------------------------------------------ */
const SPECS = {
  classes: {
    fields: {
      id:   { type: 'id',   required: true },
      name: { type: 'text', required: true },
      desc: { type: 'text', required: true },
    },
  },
  subclasses: {
    fields: {
      id:           { type: 'id',   required: true },
      name:         { type: 'text', required: true },
      classId:      { type: 'ref',  required: true, collection: 'classes' },
      // Not exported. See stripUnstarted() — an unstarted subclass is not
      // content the app should know about, so it never reaches the output.
      active:       { type: 'bool' },
      hp:           { type: 'int',  required: true },
      wounds:       { type: 'int',  required: true },
      patches:      { type: 'int',  required: true },
      // `none` is a deliberate authoring value meaning "no proficiencies at
      // all", and it has to be spelled out because a BLANK cell must stay
      // available to mean "nobody has filled this in yet" — otherwise the
      // converter can never tell a finished row from an unfinished one.
      // No subclass currently uses it: The Master was the one design that did,
      // and it now trains in Light/Medium armour and melee/ranged weapons like
      // any other. The value stays supported for the next class that wants it.
      armorTypes:   { type: 'list', required: true },
      weaponTypes:  { type: 'list', required: true },
      startingMana: { type: 'int',  required: true },
      manaPerLevel: { type: 'int',  required: true },
      // The Spellsword's 0/0 is not a small pool, it is a different mechanic
      // (mana generated in combat, and the one class excluded from the Short
      // Rest half-mana restore). Naming the model keeps that rule out of a
      // magic zero that some future reader would "fix".
      manaModel:    { type: 'enum', required: true, values: ['pool', 'generated'] },
      // Order and REPEATS are meaningful — Chaos really is three-way Burst
      // Damage, and that weighting is the point. Never dedupe this.
      roles:        { type: 'list' },
      desc:         { type: 'text', required: true },
      note:         { type: 'text' },
    },
  },

  /* ---- traits ------------------------------------------------------
     Always-on passives, granted by a class or a subclass rather than bought.
     `desc` carries the whole rule — there is no cost, no roll and no trigger
     column, because nothing about a trait is a number the app computes.

     The two columns docs/library-schema.md §4.4 does not yet describe:

       tier       Which tier grants it. 0 is the trait you get for CHOOSING
                  the class or subclass, which is the only tier the rules
                  hand out at character creation (guide, steps 1-2). Higher
                  tiers arrive with the level-up flow and will land in this
                  same sheet, which is why this is an int and not a bool.

       grantedBy  The class or subclass id that confers it. A trait is never
                  stored on a character: `build` already says which subclasses
                  a character has taken, so the traits follow from it and a
                  rewrite here reaches every existing character at once. That
                  is the same "derive, don't store" rule the derived stats
                  follow, applied to content.

     grantedBy points into EITHER collection, which is why it lists two. The
     `ref` coercion only checks the id's shape; that it resolves is checked in
     its own pass below, as it is for subclasses.classId. */
  traits: {
    fields: {
      id:        { type: 'id',   required: true },
      name:      { type: 'text', required: true },
      tier:      { type: 'int',  required: true },
      grantedBy: { type: 'ref',  required: true, collections: ['classes', 'subclasses'] },
      desc:      { type: 'text', required: true },
      tags:      { type: 'list' },
      source:    { type: 'text' },
      deprecated:{ type: 'bool' },
    },
  },

  /* ---- skills ------------------------------------------------------
     A Waypoint skill is a NAMED BONUS a player buys with points, plus prose
     describing the kinds of action it covers. That is the whole entry, and
     the two things it deliberately does NOT have are worth stating:

       no `stat`  — no skill reads a core attribute. The bonus is the rank the
                    player paid for and nothing else. (An earlier draft of
                    docs/library-schema.md specified a `stat` column driving a
                    derived modifier; Waypoint does not work that way.)
       no `mod`   — the rank lives on the CHARACTER, not on the skill. Every
                    character shares one library entry and buys their own rank.

     `desc` is also not a trigger condition. It describes actions LIKE the ones
     the skill covers, so a table can judge whether it applies to the thing
     actually being attempted — Waypoint has no fixed "make an Athletics check".
     That is why the text is long and discursive, and why nothing here tries to
     parse it. */
  skills: {
    fields: {
      id:       { type: 'id',   required: true },
      name:     { type: 'text', required: true },
      // Display grouping only — it sorts the picker so a player browsing 27
      // skills sees five short lists instead of one long one. It grants
      // nothing and gates nothing. Closed as an enum all the same, because a
      // typo would quietly create a sixth group nobody meant to author.
      category: { type: 'enum', required: true,
                  values: ['Body', 'Sleight', 'Study', 'Instinct', 'Influence'] },
      desc:     { type: 'text', required: true },
    },
  },

  /* ---- items -------------------------------------------------------
     ONE authoring tab holding armour, weapons, shields, consumables and
     gear, fanned out into three JSON collections by `type` (see ROUTING).
     This is the one place the converter routes rather than maps 1:1, and
     it earns the exception: the alternative is maintaining the same sheet
     in three tabs and re-splitting it by hand after every edit.

     The columns below are a union across all five types, so most rows
     leave most cells blank. What stops that from being sloppy is
     TYPE_RULES, which states per type which fields are required and which
     are meaningless — a damage value on a Gear row is a mistake, not a
     harmless extra. */
  items: {
    fields: {
      id:         { type: 'id',   required: true },
      name:       { type: 'text', required: true },
      type:       { type: 'enum', required: true, values: ['Armor', 'Weapon', 'Shield', 'Consumable', 'Gear'] },
      // Hands are a PHYSICAL budget (guide ch.4: "2 hands worth total"), which
      // is why a shield spends one just as a weapon does.
      hands:      { type: 'int' },
      // Must match a subclass's armorTypes / weaponTypes value EXACTLY — that
      // string equality is the whole proficiency check, so it is cross-checked
      // against subclasses.csv below rather than trusted.
      prof:       { type: 'text' },
      // Deltas against BASE_STATS, including evasion. Written "+4" / "0" / "-1"
      // so the sheet reads as the rules do; `mod` accepts the leading plus.
      armorMod:   { type: 'mod' },
      evasionMod: { type: 'mod' },
      speedMod:   { type: 'mod' },
      // Two columns for what looks like one axis, deliberately: melee reach and
      // ranged distance are different concepts, and collapsing them would lose
      // whether a bare "1" meant threat or range.
      range:      { type: 'int' },
      threat:     { type: 'int' },
      damage:     { type: 'dice' },
      damageType: { type: 'text' },
      // The tags a weapon of this category MAY take — a menu, not a list of
      // what it has. At most one may be applied to any given weapon.
      weaponTags: { type: 'list' },
      refill:     { type: 'enum', values: ['long-rest', 'short-rest'] },
      // Flavour names for a category. Waypoint gives every weapon of a class
      // the same stat line, so Shortsword and Axe are examples of one entry
      // rather than two entries to keep in sync.
      examples:   { type: 'list' },
      desc:       { type: 'text', required: true },
      tags:       { type: 'list' },
      source:     { type: 'text' },
      deprecated: { type: 'bool' },
    },
  },
};

/* Which JSON collection each item type lands in. Armour gets its own because
   it occupies a slot that costs no hands; weapons and shields share one
   because they share the hand budget; consumables and gear share one because
   to the app they are both just carried things with rules text. */
const ROUTING = {
  Armor:      'armor',
  Weapon:     'weapons',
  Shield:     'weapons',
  Consumable: 'equipment',
  Gear:       'equipment',
};

/* Per-type field rules. `required` must be present; `forbidden` must not be —
   a blank union column is fine, but a FILLED one that the type has no meaning
   for is a row someone edited in the wrong place. */
const TYPE_RULES = {
  Armor:      { required: ['prof', 'armorMod', 'evasionMod', 'speedMod'],
                forbidden: ['hands', 'damage', 'range', 'threat', 'weaponTags', 'refill'] },
  Weapon:     { required: ['prof', 'hands'],
                forbidden: ['armorMod', 'evasionMod', 'speedMod', 'refill'] },
  Shield:     { required: ['prof', 'hands', 'armorMod', 'evasionMod'],
                forbidden: ['damage', 'range', 'threat', 'weaponTags', 'refill'] },
  Consumable: { required: ['refill'],
                forbidden: ['hands', 'prof', 'damage', 'range', 'threat', 'weaponTags',
                            'armorMod', 'evasionMod', 'speedMod'] },
  Gear:       { required: [],
                forbidden: ['hands', 'prof', 'damage', 'range', 'threat', 'weaponTags',
                            'armorMod', 'evasionMod', 'speedMod', 'refill'] },
};

// The closed vocabulary for weaponTags. Their RULES live in the player's guide,
// not here — this list exists so a typo ("Loadng") fails conversion instead of
// silently becoming a tag no rule will ever match.
const WEAPON_TAGS = ['Super Heavy', 'Light', 'Loading', 'Reach'];

/* ------------------------------------------------------------------ */
/* CSV PARSING — a real parser, not a split(',')                      */
/* desc and note legitimately contain commas, quotes and newlines;     */
/* Sheets quotes them correctly and we have to honour that (schema §3).*/
/* ------------------------------------------------------------------ */
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }  // "" is a literal quote
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }

  // Sheets pads exports with blank lines; a row of nothing but empties is one.
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

/* ------------------------------------------------------------------ */
/* DIAGNOSTICS — errors block output, warnings do not (schema §7)     */
/* ------------------------------------------------------------------ */
const errors = [], warnings = [];
const err  = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const ID_RE = /^[a-z]+\.[a-z0-9-]+$/;

/* Coerce one cell according to its column type. Returns `undefined` for an
   empty cell so the caller can drop the key entirely — schema §3 is explicit
   that an empty cell means "field omitted", not "" and not 0. */
function coerce(value, spec, where, column) {
  const raw = value.trim();
  if (raw === '') return undefined;

  switch (spec.type) {
    case 'id':
      if (!ID_RE.test(raw)) err(where, `id "${raw}" must match ${ID_RE}`);
      return raw;

    case 'ref':
      if (!ID_RE.test(raw)) err(where, `${column} "${raw}" is not a valid id`);
      return raw;                                   // existence checked in a later pass

    case 'int': {
      // Number('') is 0 and parseInt('12abc') is 12 — both would let a typo
      // through silently, so the whole cell has to look like an integer.
      if (!/^-?\d+$/.test(raw)) { err(where, `${column} "${raw}" is not an integer`); return undefined; }
      return Number(raw);
    }

    // A signed modifier: "+4", "-1", "0". Distinct from `int` only in
    // accepting the leading plus, which is worth keeping in the sheet — a
    // column of "+2 / +4 / 0" reads as the rules do, where "2 / 4 / 0" reads
    // as a quantity and invites someone to treat it as an absolute value.
    case 'mod': {
      if (!/^[+-]?\d+$/.test(raw)) { err(where, `${column} "${raw}" must be a modifier like +2, 0 or -1`); return undefined; }
      return Number(raw);
    }

    // Validated by the app's own parser, so an expression that survives
    // conversion is one the table can actually roll.
    case 'dice': {
      const why = validateDice(raw);
      if (why) { err(where, `${column} "${raw}" is not a rollable expression (${why})`); return undefined; }
      return raw;
    }

    case 'bool': {
      const up = raw.toUpperCase();
      if (up !== 'TRUE' && up !== 'FALSE') { err(where, `${column} "${raw}" must be TRUE or FALSE`); return undefined; }
      return up === 'TRUE';
    }

    case 'enum':
      if (!spec.values.includes(raw)) err(where, `${column} "${raw}" must be one of ${spec.values.join(', ')}`);
      return raw;

    case 'list':
      // `none` is the explicit empty list. It survives as [] rather than being
      // dropped, because "this class has no proficiencies" is a real answer and
      // must not be confused with "this cell is blank".
      if (raw.toLowerCase() === 'none') return [];
      return raw.split(';').map((s) => s.trim()).filter(Boolean);

    default:
      return raw;
  }
}

/* ------------------------------------------------------------------ */
/* LOAD ONE TAB                                                       */
/* ------------------------------------------------------------------ */
function loadCollection(name) {
  const spec = SPECS[name];
  const path = join(ROOT, 'tools', 'csv', `${name}.csv`);

  let text;
  try { text = readFileSync(path, 'utf8'); }
  catch { err(name, `cannot read tools/csv/${name}.csv`); return []; }

  const rows = parseCSV(text);
  if (!rows.length) { err(name, 'file is empty'); return []; }

  const header = rows[0].map((h) => h.trim());
  for (const column of header) {
    if (!(column in spec.fields)) warn(name, `unknown column "${column}" — ignored`);
  }

  return rows.slice(1).map((cells, i) => {
    // +2 because row 1 is the header and humans count sheet rows from 1.
    const where = `${name} row ${i + 2}`;
    const entry = {};

    for (const [column, fieldSpec] of Object.entries(spec.fields)) {
      const at = header.indexOf(column);
      const value = at === -1 ? '' : (cells[at] ?? '');
      const out = coerce(value, fieldSpec, where, column);
      if (out !== undefined) entry[column] = out;
      else if (fieldSpec.required) err(where, `missing required field "${column}"`);
    }

    // An entry that never got an id can't be reported by id, so name the row.
    if (entry.id) entry.__where = `${name} "${entry.id}"`;
    else entry.__where = where;
    return entry;
  });
}

/* ------------------------------------------------------------------ */
/* BUILD                                                              */
/* ------------------------------------------------------------------ */
const classes    = loadCollection('classes');
const subclasses = loadCollection('subclasses');
const items      = loadCollection('items');
const skills     = loadCollection('skills');
const traits     = loadCollection('traits');

/* ---- ids are globally unique, not just per collection (schema §2) ---- */
const byId = new Map();
for (const e of [...classes, ...subclasses, ...items, ...skills, ...traits]) {
  if (!e.id) continue;
  if (byId.has(e.id)) err(e.__where, `duplicate id "${e.id}"`);
  byId.set(e.id, e);
}

/* ---- every reference resolves ---- */
for (const s of subclasses) {
  if (s.classId && !classes.some((c) => c.id === s.classId)) {
    err(s.__where, `classId "${s.classId}" matches no row in classes.csv`);
  }
}
for (const t of traits) {
  if (t.grantedBy
      && !classes.some((c) => c.id === t.grantedBy)
      && !subclasses.some((s) => s.id === t.grantedBy)) {
    err(t.__where, `grantedBy "${t.grantedBy}" matches no class or subclass`);
  }
}

/* ---- items: per-type field rules ----
   The union header means a blank cell is normal, so what is checked is the
   opposite: a cell that is FILLED on a type it means nothing for. That is
   almost always a row edited against the wrong column. */
for (const it of items) {
  const rules = TYPE_RULES[it.type];
  if (!rules) continue;                       // bad type already reported by the enum
  for (const f of rules.required) {
    if (it[f] === undefined) err(it.__where, `${it.type} requires "${f}"`);
  }
  for (const f of rules.forbidden) {
    if (it[f] !== undefined) err(it.__where, `${it.type} has no "${f}" — that column is for another type`);
  }
  for (const t of it.weaponTags || []) {
    if (!WEAPON_TAGS.includes(t)) err(it.__where, `weaponTag "${t}" is not one of ${WEAPON_TAGS.join(', ')}`);
  }
}

/* ---- proficiency vocabulary must be one vocabulary ----
   A subclass grants training as a STRING ("1H Focus") and the app equips gear
   by comparing that string to an item's `prof`. Nothing else enforces that the
   two sheets agree, so it is enforced here — this is the check that catches an
   item sheet saying "1H Magic" while every class says "1H Focus", a mismatch
   whose only symptom in the app would be a character silently unable to equip
   a weapon their class is supposed to be trained with. */
const grantedProfs = new Set();
for (const sc of subclasses) {
  for (const p of [...(sc.armorTypes || []), ...(sc.weaponTypes || [])]) grantedProfs.add(p);
}
const itemProfs = new Set(items.map((i) => i.prof).filter(Boolean));

for (const p of grantedProfs) {
  if (!itemProfs.has(p)) {
    err('proficiencies', `subclasses.csv grants training in "${p}", but no row in items.csv has that prof`);
  }
}
// The reverse is only a warning: gear nobody is trained with is legal (anyone
// may use it untrained), just usually a sign the sheets have drifted.
for (const p of itemProfs) {
  if (!grantedProfs.has(p)) warn('proficiencies', `no subclass grants training in "${p}"`);
}

/* Unfinished rows are reported after the strip below, where the live trait
   list exists — see "PLACEHOLDER TEXT". */

/* ------------------------------------------------------------------ */
/* STRIP UNSTARTED CONTENT                                            */
/* `active: FALSE` means the subclass has not been designed yet — it   */
/* is not a retired entry that old characters still reference (that is */
/* what schema §2's `deprecated` is for), so there is nothing to       */
/* preserve. Dropping it here rather than exporting a flag means the   */
/* app never has to know the concept exists, and no picker, filter or  */
/* validator can forget to exclude it. The row stays in the CSV, so    */
/* starting the subclass is a one-cell edit.                           */
/* ------------------------------------------------------------------ */
function stripUnstarted(entries) {
  const kept = entries.filter((e) => e.active !== false);
  for (const e of entries) {
    if (e.active === false) console.log(`  · skipped ${e.id} (active FALSE — not started)`);
  }
  return kept;
}

const liveSubclasses = stripUnstarted(subclasses);

for (const c of classes) {
  const n = liveSubclasses.filter((s) => s.classId === c.id).length;
  if (n === 0) warn(c.__where, 'has no started subclasses — it will not be selectable');
}

/* A trait granted by a subclass that was never started goes with it. Exporting
   it would ship content for a subclass the app has no other knowledge of, and
   every consumer would then need the same "unless its subclass is missing"
   caveat. Stripping once here means none of them do. */
const liveIds = new Set([...classes.map((c) => c.id), ...liveSubclasses.map((s) => s.id)]);
const liveTraits = traits.filter((t) => liveIds.has(t.grantedBy));
for (const t of traits) {
  if (!liveIds.has(t.grantedBy)) console.log(`  · skipped ${t.id} (grants to an unstarted subclass)`);
}

/* ---- every class and live subclass grants EXACTLY one Tier 0 trait ----
   Character creation hands out a Tier 0 trait for the class and one for the
   subclass (guide, steps 1-2), so a class missing one is not a thin entry —
   it is a step of creation with nothing to show. Zero and two are both
   errors: the second would silently pick whichever row was authored first. */
for (const owner of [...classes, ...liveSubclasses]) {
  const t0 = liveTraits.filter((t) => t.grantedBy === owner.id && t.tier === 0);
  if (t0.length === 0) err(owner.__where, 'has no Tier 0 trait in traits.csv');
  if (t0.length > 1) {
    err(owner.__where, `has ${t0.length} Tier 0 traits (${t0.map((t) => t.id).join(', ')}) — exactly one is granted`);
  }
}

/* ------------------------------------------------------------------ */
/* PLACEHOLDER TEXT — unfinished rows are a nudge, not a failure       */
/* (schema §7)                                                         */
/*                                                                     */
/* Reported as ONE line per collection carrying a count, not one line   */
/* per row. Every class and subclass currently reads "description", so  */
/* per-row warnings meant thirty-odd identical lines that buried the    */
/* warnings which actually said something. The count is the useful part */
/* anyway: it is a to-do list, and what matters is that it shrinks.     */
/* ------------------------------------------------------------------ */
const isPlaceholder = (e) =>
  (e.desc || '').length < 20 || (e.desc || '').startsWith('Placeholder —');

for (const [label, entries] of Object.entries({
  classes, subclasses: liveSubclasses, items, skills, traits: liveTraits,
})) {
  const n = entries.filter(isPlaceholder).length;
  if (n) warn(label, `${n} of ${entries.length} desc still placeholder text`);
}

/* ---- drop the bookkeeping keys the app has no use for ---- */
const clean = (e) => {
  const { __where, active, ...rest } = e;
  return rest;
};

/* ---- fan items out into their collections (see ROUTING) ----
   `type` survives into the output rather than being consumed by the routing:
   the app still needs to tell a Shield from a Weapon (one defends, one
   attacks) and a Consumable from a Gear item (one is spent, one is not),
   and that is the same distinction, not a second one. */
const routed = { armor: [], weapons: [], equipment: [] };
for (const it of items) {
  const into = ROUTING[it.type];
  if (into) routed[into].push(clean(it));
}

const library = {
  waypoint: META,
  classes: classes.map(clean),
  subclasses: liveSubclasses.map(clean),
  armor: routed.armor,
  weapons: routed.weapons,
  equipment: routed.equipment,
  skills: skills.map(clean),
  traits: liveTraits.map(clean),
};

/* ------------------------------------------------------------------ */
/* REPORT & EMIT                                                      */
/* ------------------------------------------------------------------ */
for (const w of warnings) console.warn(`  ! ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(`\n${errors.length} error(s) — nothing written.`);
  process.exit(1);
}

const json = JSON.stringify(library, null, 2);

mkdirSync(join(ROOT, 'tools', 'out'), { recursive: true });
writeFileSync(join(ROOT, 'tools', 'out', 'library.json'), json + '\n');

// Pretty-printed rather than minified: this file is checked in, so a content
// change should read as a legible diff instead of one enormous line.
writeFileSync(join(ROOT, 'resources', 'js', 'library.js'),
`/* =====================================================================
   GENERATED FILE — DO NOT EDIT BY HAND.
   Source:    tools/csv/*.csv
   Regenerate: node tools/csv-to-json.mjs

   Declared as a plain global rather than exported as a module because
   index.html is opened directly off the filesystem, where a browser
   blocks module imports and fetch() alike. Must load BEFORE main.js.
   ===================================================================== */
window.WAYPOINT_LIBRARY = ${json};
`);

console.log(`\n✓ ${library.classes.length} classes, ${library.subclasses.length} subclasses`);
console.log(`  ${library.armor.length} armor, ${library.weapons.length} weapons/shields, ${library.equipment.length} equipment`);
console.log(`  ${library.skills.length} skills, ${library.traits.length} traits`);
console.log(`  → resources/js/library.js`);
console.log(`  → tools/out/library.json`);
if (warnings.length) console.log(`  (${warnings.length} warning(s))`);
