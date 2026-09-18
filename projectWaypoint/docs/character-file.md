# Waypoint Character File — `.waypoint.json`

**Status:** `schemaVersion: 1` · Last revised 2026-08-30

A **character file** is one character (or several) exported out of the app so a
player can keep them somewhere that is not one browser's localStorage — a
backup, a move to a new phone, a hand-off to a GM.

Written by `exportCharacter()` and read by `importCharacterFile()` in
`resources/js/main.js`. This document is the contract between them, and between
this version of the app and every file already in players' hands.

> Not to be confused with the **library** file (`docs/library-schema.md`), which
> carries the game's *content*. A character file carries one *player's*
> character, and references library content by id.

---

## 1. Why JSON, and why the double extension

The name is `<character-name-slug>.waypoint.json` — for example
`grimm-oathbreaker.waypoint.json`.

- **JSON, pretty-printed.** The project already treats legible JSON as a
  first-class artifact (`tools/out/library.json`, the generated `library.js`).
  A character card should be openable and readable too: a GM can eyeball a
  sheet without the app, and a broken file can be diagnosed by looking at it.
- **The trailing `.json` is deliberate.** Every operating system, mail client,
  chat app and text editor already knows what a `.json` is. A bare custom
  extension like `.wpc` would be an unknown blob that some clients refuse to
  preview or attach — a real cost, for no benefit the `waypoint` in the middle
  of the name does not already provide.
- **No zip, no binary.** They would need a library and a build step, and the
  project's promise is that you open `index.html` and it works.

The file reaches the device through `deliverCharacterFile()`, which has two
verbs behind one path:

- **`send`** — `navigator.share()` with the file attached, which opens the
  device's own share sheet. That sheet already holds Messages, Mail, AirDrop
  and "Save to Files", laid out the way the player expects, so the app does not
  build a second menu of destinations in front of it. This is what the Share
  window's button does.
- **`save`** — an anchor download, which every browser has. This is what the
  Personae list's Export button does, and it is also where `send` falls back if
  the browser has no share sheet or the sheet fails.

Closing the share sheet is a decision, not a failure: an `AbortError` is
swallowed rather than falling back to a download the player just declined.

---

## 2. The envelope

```json
{
  "waypointCharacter": {
    "schemaVersion": 1,
    "exported": "2026-08-30",
    "library": {
      "title": "Waypoint Core Compendium",
      "version": "0.1.0",
      "schemaVersion": 1
    }
  },
  "characters": [ /* §3 */ ],
  "entries": { /* §4 */ }
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `schemaVersion` | int | ✅ | Shape of *this document*. The app **refuses** a file whose version is higher than it understands, rather than importing it half-known. |
| `exported` | ISO date | ✅ | `YYYY-MM-DD`. |
| `library` | object | ✅ | Which compendium the character was built against. Provenance only — nothing resolves through it. Shown on the import screen when it differs from the local one. |

**`characters` is an array even when exporting one character.** Exporting a
whole roster later is then the same file and the same importer, rather than a
second format to write and a second one to keep working.

---

## 3. `characters` — the character as stored

Each entry is the character exactly as `save()` writes it, plus its `id` and
its `portrait`. **It holds library IDS, not copies of library content:**

```json
{
  "id": "cmtg8pdvp",
  "name": "Grimm Oathbreaker",
  "bio": { "age": "41", "height": "6'2\"", "weight": "220 lb", "eyes": "grey", "hair": "black" },
  "build": { "origin": "subclass.primal", "levels": [], "hpFrom": null },
  "stats": [ { "name": "Power", "value": 2 }, … ],
  "skills": [ { "id": "skill.gymnast", "rank": 1 }, … ],
  "armorWorn": "armor.heavy",
  "hands": [ { "id": "weapon.2h-melee" } ],
  "equipment": [ "gear.crowbar", … ],
  "health": 16, "mana": 10, "wounds": 0, "patches": 4,
  "abilities": [
    { "id": "ab1", "kind": "ability", "title": "Ictus Findens", "dmg": "2d6",
      "toHit": true, "cost": { "ap": 2, "rp": 0, "mana": 0 }, "desc": "…" },
    { "id": "sp1", "kind": "spell", "title": "Ignis Fatuus", "dmg": "1d8",
      "toHit": true, "cost": { "ap": 1, "rp": 0, "mana": 3 }, "desc": "…" }
  ],
  "passives": [], "inventory": [], "effects": [], "notes": [],
  "portraitView": { "x": 50, "y": 0, "zoom": 1 },
  "portrait": "data:image/jpeg;base64,…"
}
```

Abilities and spells share one list: `kind` (`"ability"` or `"spell"`) is what
files a row under the right heading on the sheet, `toHit` is what gives it an
attack-roll box, and `cost` is what using it spends. None of the three is
required — a row without them is an ability that costs nothing and hits
automatically. `cost` keys outside `ap` / `rp` / `mana` are dropped on import,
and a `kind` the app does not know becomes `"ability"` rather than vanishing
into a heading that does not exist.

Keeping the ids is the whole point. Import onto a device with a **newer**
library and the character picks up the rebalanced health pool, the reworded
skill, the renamed subclass — exactly like a character that never left. Copying
the content into the file instead would freeze that character against every
future change to the game.

**Health, mana, wounds and patches are what the character has SPENT.** Every
ceiling — health pool, mana pool, wound track, Patch count, proficiencies, both
Tier 0 traits — is derived from `build` on import, not stored here.

`patches` is the number still UNSPENT, the way `health` is the number still on
the bar — so it is clamped to the importing device's `patchesMax()` on the way
in, exactly as health and mana are clamped to their pools. A file written when
a subclass granted 6 Patches lands on a device where it grants 4 as 4, not as a
character carrying two Patches the library no longer issues.

**The `id` in the file is ignored on import.** The importer always assigns a
fresh one, so importing your own export back adds a copy rather than
overwriting the character already in the roster. A character file is a copy,
never a claim on the slot it came from.

**The portrait is embedded**, as the same JPEG data URL the app stores. The
compressor caps it at 400 KB, so a file with a photo runs to roughly 550 KB and
is mostly picture. That is the honest cost of a complete card: strip it and the
import is no longer the same character.

---

## 4. `entries` — the fallback snapshot

A map of `id → library entry`, covering **every library entry the character
references**, transitively:

- each subclass in `build`, **plus its parent class**, **plus both their Tier 0
  traits** — a build that resolves to a subclass but not its class renders as
  half a character
- every skill, every held weapon or shield, the worn armour, every piece of
  equipment

These are **used only as a fallback**. On import, the app takes an entry from
the file *only* when its own library has no entry with that id — a local entry
always wins, because it is the one the player's own spreadsheet describes.

Without this section the format's promise would be false. `applySave()`
deliberately drops ids it cannot resolve (see `docs/library-schema.md` §2 on why
that is right for a local save), so a character imported against an **older**
library would silently arrive missing skills and gear. `entries` is what turns
that silent loss into a restored entry and a line on the import screen.

**Entries taken from a file are persisted** under `waypoint.imported-entries`
and merged into the catalogs at boot, before anything resolves an id. Without
persisting them, an import would look right once and lose the same gear on the
next launch.

The app's own `imported: true` marker is stripped on export — it is a fact about
one device, not content, and must not travel on as though a spreadsheet had
said it.

---

## 4a. The two variants a player can write

Every file this app writes is the same schema. The share screen offers a
choice of **one field**: whether `characters[0].portrait` carries the embedded
photo or is `null`.

| | Portrait | Typical size | Imports as |
|---|---|---|---|
| **Full card** | embedded | ~400–550 KB | the character, photo and all |
| **Without photo** | `null` | ~10–15 KB | the same character, no picture |

This is **not a second format and not a version bump.** `portrait` is already
optional — a character whose player never set one exports `null` in exactly
the same place — so a file written without it is indistinguishable from a file
written by a player who has no photo, and §6's first rule applies.

The choice exists because the photo is almost the entire file. §3 puts a full
card at roughly 550 KB and notes it is "mostly picture"; the compendium
snapshot and the character together are barely a tenth of that. An attachment
limit is the one thing that can stop the format working at all, and dropping
the photo is the only lever with enough travel to matter.

`entries` is **not** part of this choice. It is what makes the file portable at
all (§4), it is small, and a file that shed it to save a few KB would import as
a half-resolved character on any device with a different compendium — the
precise failure the section above exists to prevent.

The Share window is a chip per variant, each carrying the byte size of the file
it would write — measured by serialising it, never estimated — so the player
chooses against the real number rather than a description of it. When the
character has no photo the two are identical and the control is hidden.

Nothing else about the file is shown there. The compendium it was built
against, the entry count and the filename are all recorded in the file itself
and all reported by the import screen at the far end, which is where they are
actually actionable; restating them before sending would make a form out of a
share sheet.

---

## 4b. Backups — the whole roster in one file

Settings → Backup → **Export All Characters** writes every character on the
device into one file of this same schema, with `characters` holding all of
them and `entries` the union of everything they reference. Gear two characters
share is snapshotted once.

There is no separate backup format, and that was the point of making
`characters` an array in v1. One exporter (`characterFile()`, which takes a
list of ids and is given one id by the Personae list's Export and the whole
roster by Settings) and one importer serve both. A backup opens in anything
that could already open a single character card.

Two differences from a single-character export, neither of them schema:

- **The name.** `waypoint-backup-YYYY-MM-DD.waypoint.json`, from the
  envelope's own `exported` date, so a folder of them sorts and reads. A
  backup of a one-character roster is still named this way — the name follows
  from why the file was written, not from how many are in it, which is why
  `exportBackup()` passes the name explicitly rather than letting the count
  decide it.
- **Portraits are not optional.** The share window's choice (§4a) exists to get
  one character through an attachment limit. A backup that quietly dropped
  every photo would not be a backup.

The Settings row reports what the file will hold and what it will weigh, both
measured by building and serialising the real file — the same rule §4a sets
for the share chips.

---

## 5. What the importer refuses

An import either produces a complete character or produces an explanation. It
never half-succeeds silently.

| Condition | Result |
|---|---|
| Not parseable as JSON | Refused — "Not a character file" |
| No `waypointCharacter`, or `characters` is not an array | Refused — likely a library file |
| `schemaVersion` higher than the app understands | Refused — "Made by a newer Waypoint" |
| `characters` empty or malformed | Refused — "Nothing to import" |
| An id resolves neither locally nor from `entries` | **Imported anyway**, with that item named on the import screen as left off the sheet |

Every row above lands in the **same result window**, which carries one
attribute — `data-import-state` of `ok` or `error` — and one dismiss button.
The stylesheet turns that attribute into a green tick or a red bang; nothing
else differs between the two outcomes. There is deliberately no "choose another
file" action on it: a result window reports what happened, and retrying is the
Import button on the Characters page the player just came from.

A partial import (the last row) is still an `ok` — the character did arrive —
with each unresolved id named on its own line in the damage colour. Those notes
are the only part of the card that can grow without bound, so they scroll
inside it rather than pushing the dismiss button off the screen.

Imported data goes through `applySave()` — the same clamping, id-resolution and
migration path as a save read from localStorage. A hand-edited or hostile file
therefore cannot introduce a state that a corrupt localStorage could not.

Validation is split from importing (`parseCharacterFile()` returns the file or
an explanation and writes nothing), because §5a has to be able to read a file
in order to ask a question about it.

---

## 5a. Add, or overwrite

A file arriving from Settings → Backup → **Import Characters** is read and
validated first, then the player is asked what to do with it. The question can
only be put usefully once the file has been read — "this holds four characters,
three of which you already have" is what makes the answer an informed one — so
the choice is offered *after* the picker, never as two buttons before it.

| Mode | The id each character gets | Effect |
|---|---|---|
| **Add** | a fresh one, always | every character in the file lands as a new entry; nothing already on the device is touched |
| **Overwrite** | the one it came in with | a character already under that id is **replaced in place**, keeping its position in the list; one the device has never seen is added under that id |

**Overwrite replaces what the file names and nothing else.** Characters the
file says nothing about are left alone, so restoring a three-month-old backup
cannot delete work that postdates it. This is deliberately *not* "make the
device match the file": that would be a delete, and a restore should not be
able to destroy a character the player never asked about.

Keeping the original ids is also what makes a later backup match up again —
restore twice and the second restore updates the same characters rather than
producing a second copy of each.

The **Characters screen's** own Import button does not ask: it always adds. You
reach for it when you have no character yet, an import there is an addition to
the list, and restoring over what you already have is a backup operation that
belongs in Settings. It does now import *every* character in the file it is
given, rather than only the first.

Fresh ids are minted by `freshCharacterId()`, which checks the roster and
storage and retries. A backup of six characters mints six ids inside one
millisecond, and the old `c${Date.now().toString(36)}` alone would have handed
them all the same storage key.

---

## 6. Versioning

- Bump `schemaVersion` **only** when a change breaks older readers — renaming a
  field, changing a type, changing what a field means. Adding an optional field
  is not breaking, because an older app ignores what it does not know.
- **Removing a field an importer used to read is not breaking either**, for the
  same reason in reverse. Waypoint dropped the `order` and `house` concepts
  after v1 shipped; files exported before that still carry both strings, and
  the importer simply does not read them. No bump was made, and none was
  right — bumping would have made every existing file refuse to load in an
  older build to no purpose.
- `bio` was added after v1 and did **not** bump the version, by that first
  rule: it is optional, every field in it is free text, and an older app simply
  does not read it. A file exported before it exists imports with an empty bio,
  which is the same state as a character whose player left those fields blank.
- `kind`, `toHit` and `cost` on an ability were added after v1 and did **not**
  bump the version either, by that same first rule. A file exported before they
  existed imports as abilities that cost nothing and roll no attack — which is
  exactly what those files meant, since the app had no way to say otherwise.
- The app refuses a **higher** version and accepts any **lower** one, so a file
  exported today must stay readable by every later version. That is the
  compatibility promise, and it is the reason to think hard before changing
  anything in §3.

---

## 7. Still to come

- [x] Export the whole roster at once — Settings → Backup, §4b. No schema
      change was needed: `characters` was an array from v1 for this
- [x] Let the import offer "overwrite" as well as "add a copy", for the
      backup-restore case where a fresh id is not what the player wants — §5a
- [ ] Decide whether abilities and spells, once they are library content,
      should be snapshot into `entries` like everything else (they should)
