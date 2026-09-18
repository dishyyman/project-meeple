# Waypoint Library — Schema Reference

**Status:** draft, `schemaVersion: 1` · Last revised 2026-08-24

The **library** is the shareable JSON file holding all Waypoint game content —
abilities, spells, traits, skills, weapons, equipment. The app ships with *none*
of it: a user imports a library file, and the character sheet references its
entries by `id`.

This document is the contract between three things, and all three must agree:

1. **Your Google Sheets tabs** — one tab per collection, header row = field names below.
2. **`tools/csv-to-json.mjs`** — the converter, a dumb mapping with no translation layer.
3. **The app** — which reads the resulting JSON.

> **Fields marked 🎲 are guesses at Waypoint's rules.** I don't know the real
> action economy, spell schools, or equipment slots. Rename them to your actual
> terms, or delete them — but do it *before* you build the sheets, because the
> header row is the schema.

---

## 1. Envelope

The file is one JSON object. Metadata lives under `waypoint`; every other
top-level key is a collection array.

```json
{
  "waypoint": {
    "schemaVersion": 1,
    "title": "Waypoint Core Compendium",
    "version": "0.3.0",
    "updated": "2026-08-03",
    "author": "Mikey"
  },
  "abilities":  [],
  "spells":     [],
  "traits":     [],
  "skills":     [],
  "armor":      [],
  "weapons":    [],
  "equipment":  []
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `schemaVersion` | int | ✅ | Shape of *this document*. Bump only on a breaking field change. The app refuses files whose version it doesn't understand. |
| `title` | string | ✅ | Shown in the import confirmation and compendium header. |
| `version` | string | ✅ | Semver of *your content*. Bump every publish — it's how a user knows they have the current one. |
| `updated` | ISO date | ✅ | `YYYY-MM-DD`. |
| `author` | string | — | Credit line. |

A collection key may be omitted entirely; absent and empty mean the same thing.

---

## 2. IDs — read this before authoring anything

**Every entry needs a hand-authored `id` in its own Sheets column. Never
auto-generate it from the name.**

Format: `<type>.<kebab-slug>`

```
ability.ictus-findens
spell.lux-arcana
trait.cutis-ferrea
armor.light
weapon.2h-melee
shield.balanced
consumable.health-potion
gear.crowbar
```

The prefix names the **type**, which is usually but not always the collection
singular. `items.csv` is the exception: it holds five types that land in three
collections (§4.6), and `shield.armor` says far more about what an id points at
than `weapon.armor` would. The converter enforces the shape, not the prefix
vocabulary — `^[a-z]+\.[a-z0-9-]+$` is the whole rule.

Rules, in order of how much they'll hurt if broken:

1. **An ID is permanent.** Once published, it is never reused or repointed.
   Characters save `{ "id": "ability.ictus-findens" }` — change the ID and every
   character referencing it breaks silently.
2. **IDs are globally unique**, not just within a collection. The converter
   rejects duplicates across the whole file.
3. **Renaming an entry does not change its ID.** This is the whole reason the ID
   is a separate column: "Ictus Findens" can become "Cleaving Strike" and every
   character keeps working. If the ID were slugged from the name, that rename
   would be a silent data loss bug.
4. **Retiring an entry:** don't delete the row. Set `deprecated` to `true` so
   existing characters can still resolve and display it. Delete only when you're
   willing to break saves.

Lowercase, digits, and hyphens only — the converter enforces
`^[a-z]+\.[a-z0-9-]+$`.

---

## 3. Sheets → CSV conventions

- **One tab per collection**, named exactly as the JSON key: `abilities`,
  `spells`, `traits`, `skills`.
- **One exception: `items`.** A single tab holds armour, weapons, shields,
  consumables and gear, and the converter fans it out into `armor`, `weapons`
  and `equipment` by its `type` column (§4.6). This is the only place the
  converter routes rather than maps 1:1. It earns the exception because these
  five types are authored together, compared against each other constantly, and
  splitting them across three tabs would mean re-splitting by hand after every
  edit.
- **Row 1 is the header**, using the exact field names from §4. Column order
  doesn't matter; spelling does.
- **Empty cell = field omitted.** It does not become `""` or `0`.
- **List fields use `;`** — `martial; cleave; two-handed`. Whitespace is trimmed.
  Commas would collide with CSV.
- **Booleans:** `TRUE` / `FALSE` (Sheets' native checkbox output). Blank = false.
- **`desc` may contain commas, quotes, and newlines.** Sheets quotes these
  correctly on export; the converter uses a real CSV parser that honours quoted
  fields, escaped `""`, and embedded newlines. Don't hand-edit the CSVs.
- **Export as:** File → Download → Comma-separated values, one file per tab, into
  `tools/csv/<collection>.csv`.

Unknown columns are ignored with a warning — safe to keep working notes, costing
columns, or "done?" checkboxes in the sheet.

---

## 4. Collections

### 4.1 Fields common to every collection

| Column | Type | Required | Notes |
|---|---|---|---|
| `id` | string | ✅ | See §2. |
| `name` | string | ✅ | Display name. |
| `desc` | text | ✅ | Rules text. Rendered as the collapsible body. |
| `tags` | list | — | Lowercase kebab. Used for compendium filtering. |
| `source` | string | — | Book/supplement, e.g. `core`, `tome-of-ash`. |
| `deprecated` | bool | — | Hidden from browse; still resolves for existing characters. |

### 4.2 `abilities`

Active, used abilities. Rendered as a collapsible with an optional rollable
damage box.

| Column | Type | Required | Notes |
|---|---|---|---|
| `cost` | int | — | Mana spent. Omit for free abilities. |
| `dmg` | dice | — | Dice expression (§5). Omit for non-damaging abilities — the damage box just won't render. |
| `range` | string | — | 🎲 e.g. `Melee`, `30 ft`, `Self`. |
| `action` | string | — | 🎲 Action economy slot. Rename to Waypoint's real term. |

### 4.3 `spells`

Same shape as abilities; separate collection so they can be browsed and
filtered apart.

| Column | Type | Required | Notes |
|---|---|---|---|
| `cost` | int | — | Mana. |
| `dmg` | dice | — | Dice expression (§5). |
| `range` | string | — | 🎲 |
| `school` | string | — | 🎲 Delete if Waypoint has no school/tradition concept. |
| `tier` | int | — | 🎲 Spell level/circle, if the game has one. |

To-hit for spells is **not** a column — it derives from Precision via the same
`PRECISION_TO_HIT` rule as weapons.

### 4.4 `traits`

Always-on passives. No roll, no cost — `desc` carries everything. Unlike a
skill, a trait is never *bought*: it is granted by a class or a subclass.

| Column | Type | Required | Notes |
|---|---|---|---|
| `tier` | int | ✅ | Which tier grants it. `0` is the trait conferred by *choosing* the class or subclass, and is the only tier character creation hands out (steps 1–2). Higher tiers arrive with level-ups and live in this same sheet. |
| `grantedBy` | id | ✅ | The `class.*` **or** `subclass.*` id that confers it. The only column in the library that references either collection. |

**Traits are not stored on a character.** `build` already records which
subclasses a character has taken, so their traits follow from it — rewrite a
trait here and every character holding it updates at once. This is the
"derive, don't store" rule applied to content rather than to stats.

**Every class and every live subclass must have exactly one Tier 0 trait.**
The converter errors on zero (a creation step with nothing to show) and on two
(whichever row was authored first would silently win).

A trait granted by a subclass with `active FALSE` is stripped from the output
along with that subclass, for the same reason the subclass itself is: shipping
it would mean every consumer needs an "unless its subclass is missing" caveat.

There is no `trigger` column. An earlier draft proposed one for conditional
traits; add it when a trait exists that needs it, not before.

### 4.5 `skills`

| Column | Type | Required | Notes |
|---|---|---|---|
| `category` | enum | ✅ | `Body` · `Sleight` · `Study` · `Instinct` · `Influence` (§6). Display grouping only. |

**Two columns this collection deliberately does not have**, both of which an
earlier draft of this document specified:

- **No `stat`.** Waypoint skills take nothing from the six core attributes. A
  skill's bonus is the rank the player bought and nothing else. (The previous
  draft called `stat` required and said it "drives the derived modifier" — that
  described a d20-style game, not this one.)
- **No `mod`.** The rank lives on the *character*, not on the skill. Every
  character shares one library entry and buys their own rank into it, exactly
  as they do with a boon's stacks.

**How skills are bought.** 4 points at character creation, placed into four
*separate* skills, then 1 more per level-up into a new skill or an existing
one. So a character's budget is `4 + level`.

**Rank is not the bonus.** Each point is worth **+2**, so rank 1 reads `+2`
and rank 3 reads `+6`. The character stores the *rank* — what was paid — and
`skillMod()` in `main.js` turns it into the bonus at display time. Keeping the
two as separate numbers is deliberate: if this multiplier ever changes again,
one constant moves and every readout follows, where a stored bonus would
leave every existing character wrong.

**Where the rules bind.** The sheet *reports*: it shows `spent / max`, names
an over-spend or a short spread in words, and blocks neither — a spend is a
rules permission, not a physical limit, a GM may hand out an extra point, and
an imported character has to be drawn honestly whatever state it arrives in.

The skill editor (Edit Character → Skills) is the one place they bind, because
it is the one place the app *authors* a spread rather than reporting one. It
will not place a point that is not in the budget, and it will not save fewer
than four separate skills once four points are on the sheet. Unspent points
save fine — an undecided character is still a legal one.

**What `desc` is for.** Waypoint has no fixed check names — nobody "makes an
Athletics check". A skill's text describes the *kinds of action* it covers, so
a table can judge whether what a player is attempting is one of them and add
the bonus to that roll. That is why the text is long and discursive, and why
nothing in the pipeline tries to parse it.

### 4.6 `items` — one tab, three collections

`items.csv` is authored as a single sheet and fanned out by its `type` column:

| `type` | Lands in | Is |
|---|---|---|
| `Armor` | `armor` | Worn. Its own slot; costs no hands. |
| `Weapon` | `weapons` | Held. Costs hands, attacks. |
| `Shield` | `weapons` | Held. Costs hands like a weapon, defends like armour. |
| `Consumable` | `equipment` | Carried, spent, and refilled on a rest. |
| `Gear` | `equipment` | Carried, not spent. |

**A weapon IS its category.** All weapons of a class deal the same base damage,
so Shortsword and Axe are `examples` on one `1H Melee` entry, not two entries to
keep in sync. Adding a new *kind* of weapon means a new row; adding a new
*flavour* of an existing one means editing an `examples` cell.

The header is a union across all five types, so most rows leave most cells
blank. That is normal. What the converter checks is the opposite — a cell
**filled in** on a type it means nothing for, which is nearly always a row
edited against the wrong column.

| Column | Type | Applies to | Notes |
|---|---|---|---|
| `type` | enum | all | ✅ One of the five above. |
| `hands` | int | Weapon, Shield | ✅ `1` or `2`. The hand budget is 2 total, and a shield spends from it just as a weapon does. |
| `prof` | text | Armor, Weapon, Shield | ✅ The proficiency string, matched **exactly** against a subclass's `armorTypes` / `weaponTypes`. See §6. |
| `armorMod` | mod | Armor ✅, Shield ✅ | Delta on base Armor. |
| `evasionMod` | mod | Armor ✅, Shield ✅ | Delta on base Evasion. |
| `speedMod` | mod | Armor ✅ | Delta on base Speed. |
| `damage` | dice | Weapon | Dice expression (§5). A focus has none — it is not something you swing. |
| `damageType` | text | Weapon | e.g. `Physical`. |
| `range` | int | Weapon | Distance for a **ranged** weapon, in spaces. |
| `threat` | int | Weapon | Reach for a **melee** weapon, in spaces. Deliberately a separate column from `range`: collapsing the two would lose whether a bare `1` meant reach or distance. |
| `weaponTags` | list | Weapon | The tags this category *may* take — a menu, not a list of what it has. **At most one** may be applied to any given weapon. See §6. |
| `refill` | enum | Consumable | ✅ `long-rest` or `short-rest`. |
| `examples` | list | Armor, Weapon | Flavour names for the category. |

**`mod` columns are written signed** — `+4`, `0`, `-1` — because a column reading
`+2 / +4 / 0` reads as the rules do, where `2 / 4 / 0` invites someone to treat
it as an absolute value. Every one of them is a **delta on `BASE_STATS`**,
evasion included.

To-hit is never a column — always derived from Precision.

There is deliberately no `typeDescription` column. Boilerplate that is identical
across every row of a type ("limited to a single use, can be duplicated in gear
slots") belongs in the app as one constant, not copied into forty cells where
fixing a typo becomes a find-and-replace.

Free-form player inventory ("My Childhood Toy") is **not** library content — it
stays typed directly into the character.

---

## 5. Dice expressions

Any field typed `dice` is validated by the app's real parser, so a malformed
expression fails at conversion time rather than mid-session.

**Write plain ASCII in Sheets:**

```
2d6          1d8+3          2d6+1d4          (1d6+2)*2          d20
```

- Operators: `+` `-` `*` `/` and parentheses. Use `*` and `/`, not `×` `÷` — the
  app substitutes the pretty glyphs at display time.
- **1–100 dice**, **2–1000 sides**. `1d0` and `200d6` are rejected.
- Totals floor (TTRPG convention), so `(1d6+2)*1.5` is not expressible — there
  are no decimals in the grammar.
- ⚠️ Sheets will happily turn `2d6` into text but may mangle a leading `=` or a
  bare `-3`. Format dice columns as **Plain text** before typing.

---

## 6. Controlled vocabularies

**Stats** — the six fixed axes:

```
Power   Precision   Lethality   Constitution   Dexterity   Fortune
```

These live in code, not the library — they're the game's structure, not content.
**No collection references them.** In particular skills do not (§4.5): nothing
in Waypoint derives a skill bonus from an attribute.

**Skill categories** — the closed vocabulary for `skills.category`:

```
Body   Sleight   Study   Instinct   Influence
```

Purely a shelf to browse from: the editor groups 27 skills into five short
lists instead of one long one. A category grants nothing, gates nothing, and no
rule asks which one a skill is in. It is closed all the same, so that a typo
fails conversion instead of quietly creating a sixth group. The display order
is the one above and lives in code, like the stats.

**Proficiencies** — the strings a subclass grants and an item's `prof` declares.
These two sheets must use *one* vocabulary, because equipping is a plain string
comparison between them:

```
armorTypes    Light   Medium   Heavy   Shields
weaponTypes   1H Melee   2H Melee   1H Range   2H Range   1H Focus   2H Focus
```

The converter **errors** if `subclasses.csv` grants training in something no
item declares. That check exists because the failure it catches is otherwise
invisible: an item sheet saying `1H Magic` while every class says `1H Focus`
produces no error anywhere, just a character mysteriously untrained with the
weapon their class is built around. The reverse — gear nobody is trained with —
is only a warning, since using gear untrained is legal.

`none` is an explicit authoring value meaning "no proficiencies at all" (the
Monk fights unarmoured and unarmed by design). It has to be spelled out, because
a blank cell must stay free to mean "nobody has filled this in yet".

**Weapon tags** — the closed vocabulary for `weaponTags`:

```
Super Heavy   Light   Loading   Reach
```

A weapon category lists which of these it *offers*; a given weapon carries **at
most one**. What each tag does is in the player's guide — the library records
the choice, not the rule. The list is closed here so that a typo fails
conversion instead of becoming a tag no rule will ever match.

**Tags** (the open `tags` column) are free-form, but the converter reports any
tag used exactly once, since a singleton is usually a typo (`martial` vs
`martail`).

---

## 7. What the converter checks

Errors block output; warnings don't.

**Errors**
- Missing required field
- Duplicate `id`, anywhere in the file
- `id` failing `^[a-z]+\.[a-z0-9-]+$`
- Unparseable dice, or one outside the 1–100 / 2–1000 limits
- `skills.category` not in the five (§6)
- Non-integer in an int column, or a `mod` column that isn't `+2` / `0` / `-1` shaped
- An `items` row missing a field its `type` requires, or **filling one its type
  has no meaning for** (§4.6)
- A `weaponTag` outside the closed list (§6)
- A proficiency granted by `subclasses.csv` that no item declares (§6)

**Warnings**
- Unknown column (ignored)
- An item `prof` no subclass grants training in
- Tag used exactly once
- `desc` empty or under ~20 chars (usually an unfinished row)
- `deprecated` entry still referenced by a bundled character

---

## 8. Worked example

`abilities.csv`:

```csv
id,name,cost,dmg,range,tags,desc
ability.ictus-findens,Ictus Findens,2,2d6,Melee,martial;cleave,"A cleaving strike that splits guard and bone alike."
ability.clamor-bellicus,Clamor Bellicus,1,,30 ft,martial;fear,"A battle-cry that rattles the resolve of nearby foes."
```

becomes:

```json
{
  "abilities": [
    { "id": "ability.ictus-findens", "name": "Ictus Findens", "cost": 2,
      "dmg": "2d6", "range": "Melee", "tags": ["martial", "cleave"],
      "desc": "A cleaving strike that splits guard and bone alike." },
    { "id": "ability.clamor-bellicus", "name": "Clamor Bellicus", "cost": 1,
      "range": "30 ft", "tags": ["martial", "fear"],
      "desc": "A battle-cry that rattles the resolve of nearby foes." }
  ]
}
```

Note the second entry: an empty `dmg` cell drops the key entirely rather than
emitting `""`.

---

## 9. Versioning

- **`schemaVersion`** — bump *only* when a change breaks older readers (renaming
  a field, changing a type). Adding an optional field is not breaking.
- **`version`** — semver your content on every publish. Patch for typo fixes,
  minor for new entries, major for rebalances that invalidate built characters.
- The app stores the `schemaVersion` and `version` it imported, so a user can see
  what they're running and whether an update is newer.

---

## 9a. Getting a library into the app

Settings → Compendium imports and exports this file.

**Export** writes the compendium *as this device currently has it* — the
generated `library.js`, or whatever has been installed over it, plus any
entries restored from an imported character. It is built from the live
`LIBRARY`, so what comes out is what the app is actually resolving against,
minus the internal `imported` marker, which is a note this app makes and not
content. The name is `<title-slug>-<version>.library.json`: a compendium is a
published thing with a version, and two exports of the same version are the
same file.

**Import** validates the envelope (§1), refuses a `schemaVersion` higher than
the app understands, refuses a character file with a message naming it as one,
and then asks:

| Mode | What happens | Takes effect |
|---|---|---|
| **Add** | entries this device does not have are folded in; every id it already has is **left alone** | immediately |
| **Replace** | the whole file is stored under `waypoint.library` and becomes this device's content | on the next load — the app reloads |

Add exists for the common case of filling gaps, and the local-wins rule is the
same one a character file's `entries` snapshot follows (`docs/character-file.md`
§4): an entry already here is the one this device's own spreadsheet describes.
It follows that **Add can never update an existing entry** — a rebalance has to
come in as a Replace.

Replace reloads the page, and that is deliberate rather than a shortcut.
`LIBRARY` and every catalog and index built from it are read **once** at load,
and the open character resolved its ids against them; rebuilding all of that in
place would leave a dozen places for a stale reference to survive. Everything
the app holds is already in localStorage, so a reload costs nothing.

Two storage keys, doing different jobs:

| Key | Holds | Read |
|---|---|---|
| `waypoint.library` | a compendium installed **in place of** the generated one — this whole file | at load, ahead of `window.WAYPOINT_LIBRARY` |
| `waypoint.imported-entries` | individual entries that filled gaps, from an Add or from an imported character | at boot, merged in over the top |

Replacing does not clear the second: those entries fill gaps in whatever
compendium is installed, and they are what keeps an imported character's gear
resolving. **Restore the Built-in Compendium** drops `waypoint.library` only,
and characters are untouched by either — they are stored apart from content.

A character referencing an id the new compendium does not carry loses it, the
same way `applySave()` drops any id it cannot resolve. The import warns about
this before it is pressed.

---

## 10. Next steps

- [ ] Rename or delete every 🎲 field to match Waypoint's real rules
- [ ] Confirm the six stat names in §6
- [ ] Add an `id` column to each Sheets tab and author IDs by hand
- [ ] Format dice columns as Plain text
- [ ] Export tabs to `tools/csv/<collection>.csv`
- [x] `evaluateDice()` extracted from `main.js` into `resources/js/dice.js`, so
      the converter validates dice with the app's own parser rather than a
      second implementation that could drift
- [x] `items.csv` authored, converted, and wired into the app
- [x] `traits.csv` authored with one Tier 0 row per class and subclass, and
      wired into character creation
- [ ] Write the 35 Tier 0 trait descriptions — every one is still placeholder
      text, and the converter reports the remaining count on each run
- [ ] Write the 9 class and 26 subclass descriptions, likewise still
      `description`
- [x] Author the `tags` column on **gear** — seven categories by what a player
      is trying to do (climbing · light · scouting · battlefield · stealth ·
      entry · sundry). The creation gear picker builds its filter chips and its
      group headings straight from these, in the order the tags first appear in
      the sheet, so re-tagging or reordering rows in `items.csv` changes the UI
      with no code edit. Untagged gear still shows, under "Other".
- [ ] Author `tags` on consumables too — they are reachable by type today, but
      a healing/offensive/utility split would earn its own chips
- [ ] Finish the Holy Water rules text, which is still "gain a buff or something"
- [ ] Decide whether `weaponTags` need their own collection carrying each tag's
      rules text, or stay a bare vocabulary with the rules living in the guide
