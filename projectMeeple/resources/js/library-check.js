/* =====================================================================
   MEEPLE — LIBRARY CHECK
   ---------------------------------------------------------------------
   Is this compendium (or this one library entry) SHAPED so the app can
   run on it? Structure only — not whether the content is balanced or
   finished; that is the converter's job (docs/library-schema.md §7).

   Why this exists. A compendium installed with Replace is stored whole and
   read back at every launch, before anything is on screen. main.js reads it
   with plain loops — `for (const sc of LIBRARY.subclasses)` — so a file
   where `subclasses` is an object, or a subclass's `formerIds` is a number,
   throws before init() and leaves the player on a blank app with no way to
   reach Settings → Restore Built-in. Compendiums are shared files (Discord,
   email), so "the converter would never write that" is not a defence: a
   file can be hand-edited or hostile. Library entries also arrive inside
   CHARACTER files and are stored for the next launch, so one bad entry
   there could do the same.

   So there is ONE check, and every door uses it:
     · checkLibrary() — a compendium on import (Add and Replace) and the
       stored compendium at launch (storedLibrary() in main.js);
     · checkEntry()   — every entry on its way into the live library
       (mergeEntries() in main.js: character files, compendium Add, and the
       entries restored at launch).
   Two doors with two checks would drift; this is why it is a file.

   What it checks:
     · the envelope is an object with a `meeple` object;
     · every other top-level key is an ARRAY (schema §1);
     · every entry is an object with a well-formed `id` and a `name`;
     · in a collection the app knows, the id's type prefix belongs there
       (`subclasses` holds `subclass.*`, `weapons` holds `weapon.*` and
       `shield.*` …) — the same routing mergeEntries() uses;
     · no id appears twice anywhere in the file;
     · a `formerIds` entry never names a LIVE id (schema §2 — otherwise the
       alias map would redirect a working reference);
     · every field the app reads has the type it reads it as: lists are
       arrays of strings, numbers are integers, text is a string.

   Unknown collections and unknown fields are ALLOWED. The app discovers
   collections rather than listing them (collectionsOf() in main.js), so a
   newer compendium that adds `spells` must still import here.

   Loaded like dice.js: a plain global for the browser, module.exports for
   the unit tests (tests/unit/library-check.test.js).
   ===================================================================== */
(function (root) {
  'use strict';

  // schema §2. The converter enforces the same pattern when it derives ids.
  var ID_RE = /^[a-z]+\.[a-z0-9-]+$/;

  /* Which id types each KNOWN collection may hold — the same routing
     mergeEntries() in main.js uses to shelve an entry by its prefix. Keep the
     two in step: adding a collection there means adding it here. */
  var COLLECTION_TYPES = {
    classes:    ['class'],
    subclasses: ['subclass'],
    traits:     ['trait'],
    skills:     ['skill'],
    armor:      ['armor'],
    weapons:    ['weapon', 'shield'],
    equipment:  ['gear', 'consumable'],
  };
  // Every type the app can shelve. An entry outside these is skipped by
  // mergeEntries() rather than refused, so checkEntry() only checks the
  // prefix against a collection when it is given one.
  var KNOWN_TYPES = Object.keys(COLLECTION_TYPES)
    .reduce(function (out, k) { return out.concat(COLLECTION_TYPES[k]); }, []);

  /* The fields the app reads, by the type it reads them as (schema §4).
     A field missing is fine — the app has a default for every one of them —
     but a field PRESENT with the wrong type is what turns into a crash: a
     loop over a number, `.map` on a string. */
  var LIST_FIELDS = ['formerIds', 'tags', 'armorTypes', 'weaponTypes', 'roles', 'weaponTags', 'examples'];
  var INT_FIELDS  = ['hp', 'wounds', 'patches', 'evasion', 'armor', 'fortitude', 'speed',
                     'startingMana', 'manaPerLevel', 'tier',
                     'armorMod', 'evasionMod', 'speedMod', 'hands', 'threat', 'range'];
  var TEXT_FIELDS = ['name', 'desc', 'type', 'prof', 'damage', 'damageType', 'refill',
                     'category', 'grantedBy', 'classId', 'manaModel', 'note', 'source'];
  var BOOL_FIELDS = ['deprecated', 'imported'];

  var isObject = function (v) { return !!v && typeof v === 'object' && !Array.isArray(v); };
  var typeOf = function (id) { return id.slice(0, id.indexOf('.')); };

  /* One entry. Returns null when it is usable, or a short reason a player
     can read ("subclass.hunter: formerIds must be a list"). `collection` is
     the key it sits under in a compendium, when there is one; entries from a
     character file arrive loose and are routed by prefix alone. */
  function checkEntry(entry, collection) {
    if (!isObject(entry)) return 'an entry is not an object';
    var id = entry.id;
    if (typeof id !== 'string' || !ID_RE.test(id)) {
      return 'an entry has a missing or malformed id' + (typeof id === 'string' ? ' (“' + id.slice(0, 40) + '”)' : '');
    }
    var allowed = collection && COLLECTION_TYPES[collection];
    if (allowed && allowed.indexOf(typeOf(id)) === -1) {
      return id + ' does not belong in ' + collection;
    }
    if (typeof entry.name !== 'string' || !entry.name.trim()) return id + ' has no name';

    for (var i = 0; i < LIST_FIELDS.length; i++) {
      var f = LIST_FIELDS[i];
      if (!(f in entry)) continue;
      var v = entry[f];
      if (!Array.isArray(v) || !v.every(function (x) { return typeof x === 'string'; })) {
        return id + ': ' + f + ' must be a list of text';
      }
    }
    for (i = 0; i < INT_FIELDS.length; i++) {
      f = INT_FIELDS[i];
      if (f in entry && !Number.isInteger(entry[f])) return id + ': ' + f + ' must be a whole number';
    }
    for (i = 0; i < TEXT_FIELDS.length; i++) {
      f = TEXT_FIELDS[i];
      if (f in entry && typeof entry[f] !== 'string') return id + ': ' + f + ' must be text';
    }
    for (i = 0; i < BOOL_FIELDS.length; i++) {
      f = BOOL_FIELDS[i];
      if (f in entry && typeof entry[f] !== 'boolean') return id + ': ' + f + ' must be true or false';
    }
    if (entry.formerIds) {
      for (i = 0; i < entry.formerIds.length; i++) {
        if (!ID_RE.test(entry.formerIds[i])) return id + ': formerIds holds a malformed id';
      }
    }
    return null;
  }

  /* A whole compendium. Returns a list of problems — empty when it is safe
     to install or to boot on. Every problem is collected, not just the first,
     so the caller can say how many there are; the caller decides how many to
     show. The schemaVersion is NOT judged here: "made for a newer app" is a
     different message with a different remedy, and main.js owns it. */
  function checkLibrary(bag) {
    if (!isObject(bag)) return ['the file is not a compendium object'];
    if (!isObject(bag.meeple)) return ['the file has no meeple block'];

    var problems = [];
    var seen = Object.create(null);
    var formerIds = [];
    Object.keys(bag).forEach(function (key) {
      if (key === 'meeple') return;
      var list = bag[key];
      if (!Array.isArray(list)) { problems.push('“' + key + '” must be a list'); return; }
      list.forEach(function (entry) {
        var p = checkEntry(entry, key);
        if (p) { problems.push(p); return; }
        if (seen[entry.id]) problems.push(entry.id + ' appears more than once');
        seen[entry.id] = true;
        (entry.formerIds || []).forEach(function (f) { formerIds.push([entry.id, f]); });
      });
    });
    // After the loop, so an id defined LATER in the file still counts as live.
    formerIds.forEach(function (pair) {
      if (seen[pair[1]]) problems.push(pair[0] + ': formerIds names ' + pair[1] + ', which is still in use');
    });
    return problems;
  }

  var api = {
    checkEntry: checkEntry,
    checkLibrary: checkLibrary,
    ID_RE: ID_RE,
    KNOWN_TYPES: KNOWN_TYPES,
  };

  root.MEEPLE_LIBRARY_CHECK = api;
  // Node loads this file as CommonJS; the browser has no `module` at all.
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
