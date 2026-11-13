/* =====================================================================
   MEEPLE — library shape check unit tests
   ---------------------------------------------------------------------
   Run:  npm run test:unit

   library-check.js is the one check every compendium and library entry
   passes on its way in — on import and again at launch — so a file it lets
   through is a file the app has to survive booting on. These pin both
   halves: the shipped content passes untouched, and each malformation that
   would crash start-up (or redirect a live id) is refused with a reason a
   person can act on.
   ===================================================================== */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { checkLibrary, checkEntry } = require('../../resources/js/library-check.js');
const LIB = require('../../tools/out/library.json');

// A small valid compendium to break one thing at a time. Cloned per test, so
// no test can leak a mutation into the next.
const base = () => ({
  meeple: { schemaVersion: 1, title: 'Test', version: '1', updated: '2026-11-13' },
  classes: [{ id: 'class.ranger', name: 'Ranger' }],
  subclasses: [{
    id: 'subclass.kindred', name: 'Kindred', classId: 'class.ranger', hp: 10, wounds: 3,
    formerIds: ['subclass.hunter'], armorTypes: ['light'], roles: ['striker'],
  }],
  weapons: [{ id: 'weapon.bow', name: 'Bow', hands: 2, damage: '1d8', weaponTags: ['ranged'] }],
});

test('the shipped library passes', () => {
  assert.deepEqual(checkLibrary(LIB), []);
});

test('a small valid compendium passes, and unknown collections and fields are allowed', () => {
  const bag = base();
  bag.spells = [{ id: 'spell.spark', name: 'Spark', someFutureField: { nested: true } }];
  assert.deepEqual(checkLibrary(bag), []);
});

test('not an object, or no meeple block, is refused outright', () => {
  for (const bad of [null, 'x', 7, [], {}]) assert.equal(checkLibrary(bad).length, 1);
  assert.match(checkLibrary({ armor: [] })[0], /no meeple block/);
});

test('a collection that is not a list is refused — the launch crash in the Codex review', () => {
  const bag = base();
  bag.subclasses = {};
  assert.match(checkLibrary(bag).join('\n'), /“subclasses” must be a list/);
  bag.subclasses = 'subclass.kindred';
  assert.match(checkLibrary(bag).join('\n'), /“subclasses” must be a list/);
});

test('entries must be objects with a well-formed id and a name', () => {
  const cases = [
    [null, /not an object/],
    [{ name: 'No id' }, /malformed id/],
    [{ id: 'Weapon.Bow', name: 'Caps' }, /malformed id/],
    [{ id: 'weapon.bow' }, /has no name/],
    [{ id: 'weapon.bow', name: '   ' }, /has no name/],
  ];
  for (const [entry, re] of cases) {
    const bag = base();
    bag.weapons = [entry];
    assert.match(checkLibrary(bag).join('\n'), re, JSON.stringify(entry));
  }
});

test('an id must belong to the collection it sits in', () => {
  const bag = base();
  bag.armor = [{ id: 'weapon.sneaky', name: 'Sneaky' }];
  assert.match(checkLibrary(bag).join('\n'), /weapon\.sneaky does not belong in armor/);
  // Shields live with weapons, and consumables with equipment — both legal.
  const ok = base();
  ok.weapons.push({ id: 'shield.buckler', name: 'Buckler' });
  ok.equipment = [{ id: 'consumable.tonic', name: 'Tonic' }, { id: 'gear.rope', name: 'Rope' }];
  assert.deepEqual(checkLibrary(ok), []);
});

test('duplicate ids are refused, across collections too', () => {
  const bag = base();
  bag.weapons.push({ id: 'weapon.bow', name: 'Bow Again' });
  assert.match(checkLibrary(bag).join('\n'), /weapon\.bow appears more than once/);
});

test('fields the app reads must have the type it reads them as', () => {
  const cases = [
    ['formerIds', 5, /formerIds must be a list/],
    ['formerIds', [7], /formerIds must be a list/],
    ['formerIds', ['Not An Id'], /formerIds holds a malformed id/],
    ['roles', 'striker', /roles must be a list/],
    ['hp', '10', /hp must be a whole number/],
    ['hp', 2.5, /hp must be a whole number/],
    ['wounds', null, /wounds must be a whole number/],
    ['classId', 4, /classId must be text/],
    ['deprecated', 'yes', /deprecated must be true or false/],
  ];
  for (const [field, value, re] of cases) {
    const bag = base();
    bag.subclasses[0][field] = value;
    assert.match(checkLibrary(bag).join('\n'), re, `${field} = ${JSON.stringify(value)}`);
  }
});

test('a formerId naming a live id is refused — it would redirect a working reference', () => {
  const bag = base();
  bag.subclasses.push({ id: 'subclass.hunter', name: 'Hunter', classId: 'class.ranger' });
  assert.match(checkLibrary(bag).join('\n'), /formerIds names subclass\.hunter, which is still in use/);
});

test('every problem is reported, not just the first', () => {
  const bag = base();
  bag.subclasses = {};
  bag.weapons = [{ id: 'weapon.bow' }];
  assert.equal(checkLibrary(bag).length, 2);
});

test('checkEntry on a loose entry (a character file snapshot) routes by prefix alone', () => {
  assert.equal(checkEntry({ id: 'armor.plate', name: 'Plate', armorMod: 3 }), null);
  assert.match(checkEntry({ id: 'armor.plate', name: 'Plate', armorMod: 'lots' }), /armorMod must be a whole number/);
  // `imported` is the marker the app adds to restored entries; it must pass.
  assert.equal(checkEntry({ id: 'trait.keen', name: 'Keen', tier: 0, imported: true }), null);
});
