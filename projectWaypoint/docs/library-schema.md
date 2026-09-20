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

**IDs are derived from names. There is no `id` column to fill in.**

`Hunter` becomes `subclass.hunter`, `Firestarter` becomes `trait.firestarter`,
`Ranger` becomes `class.ranger`. Rename the entry and the id follows it.

Format: `<type>.<kebab-slug>`, enforced as `^[a-z]+\.[a-z0-9-]+$`. Lowercase,
digits and hyphens only; everything else in the name collapses to a hyphen.

```
subclass.the-beast      <- "The Beast"
trait.deep-freeze       <- "Deep Freeze"
class.elementalist      <- "Elementalist"
```

The prefix names the **type**, which is usually but not always the collection
singular. `items.csv` is the exception: it holds five types that land in three
collections (§4.7), and `shield.armor` says far more about what an id points at
than `weapon.armor` would.

### The tradeoff this makes, and how it is paid for

An earlier version of this document said the opposite: ids were hand-authored,
permanent, and deliberately survived renames. That was the safer rule, and it
was abandoned on purpose, because in practice it produced a library full of ids
that contradicted the rows beside them — `subclass.hunter` on a row called
Kindred, after Marksman became Hunter and Hunter became Kindred. An id nobody
can read is its own kind of bug.

What that rule was protecting against is real, though, and has not gone away:

> **A saved character stores ids.** `build.origin` is `subclass.hunter`. Rename
> that subclass and the character no longer resolves — the app reads it as
> unclassed, zeroing health, mana, wounds and proficiencies at once.

So the rename has to be recorded. That is `formerIds`.

### Renaming something: the whole procedure

1. Change the `name` (or `subclass`) cell.
2. Put the **old id** in that row's `formerIds` cell. Semicolon-separated if
   there is more than one — renaming twice keeps both.
3. Export and re-run the converter.

That is all. The converter resolves any `grantedBy` still naming the old id and
warns you to update the trait sheet; the app rewrites saved characters from the
old id to the new one as it loads them (`migrateId()` in `main.js`), so a save
heals the first time it is written back.

**Skip step 2 and the rename silently orphans every character built on that
row.** Nothing can detect it after the fact — once the old name is gone, no
file records that the row ever had a different id.

### The rules that still hold

1. **IDs are globally unique**, not just within a collection. The converter
   rejects duplicates across the whole file — which is also what catches two
   rows accidentally sharing a name.
2. **A `formerId` may never name a live entry.** That is an error, not a
   warning: it would redirect a perfectly good reference to the wrong row,
   which is the one failure mode here that corrupts data instead of losing it.
3. **Retiring an entry:** don't delete the row. Set `deprecated` to `true` so
   existing characters can still resolve and display it. Delete only when
   you're willing to break saves.

---

## 3. Sheets → CSV conventions

- **One tab per collection**, named exactly as the JSON key: `subclasses`,
  `traits`, `skills`, `abilities`, `spells`. There is no `classes` tab — the
  classes are derived from `subclasses` (§4.2).
- **One exception: `items`.** A single tab holds armour, weapons, shields,
  consumables and gear, and the converter fans it out into `armor`, `weapons`
  and `equipment` by its `type` column (§4.7). This is the only place the
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
| `name` | string | ✅ | Display name. **The id is derived from it** — see §2. |
| `formerIds` | list | — | Ids this entry used to have. Fill in when you rename. See §2. |
| `desc` | text | ✅ | Rules text. Rendered as the collapsible body. |
| `tags` | list | — | Lowercase kebab. Used for compendium filtering. |
| `source` | string | — | Book/supplement, e.g. `core`, `tome-of-ash`. |
| `deprecated` | bool | — | Hidden from browse; still resolves for existing characters. |

### 4.2 `subclasses` (and the `classes` derived from it)

**One tab, `subclasses`, and no classes tab.** A class is a name plus the
subclasses that point at it, and this sheet already states both, so the
`classes` collection is *derived* from its `class` column. A nine-row second tab
would be a second place to edit and a join that could silently fail.

**The header is the sheet's own header.** The converter reads `subclass`,
`armorType`, `description` and three `concentration` columns exactly as Sheets
writes them, so an export drops straight into `tools/csv/subclasses.csv` with no
renaming step. Four columns are spelled differently in the JSON:

| Sheet column | JSON key |
|---|---|
| `subclass` | `name` |
| `armorType` | `armorTypes` |
| `weaponType` | `weaponTypes` |
| `description` | `desc` |
| `concentration1/2/3` | `roles` (folded into one ordered list) |
| `class` | `classId` (slugged: `Ranger` → `class.ranger`) |

| Column | Type | Required | Notes |
|---|---|---|---|
| `subclass` | string | OK | Display name. The id derives from it (§2). |
| `formerIds` | list | — | Ids this row used to have. See below. |
| `class` | string | OK | Display name of the parent class. Drives the derived `classes` collection. |
| `hp` | int | OK | Base health. Constitution adds to it. |
| `wounds` | int | OK | Length of the Wound track. |
| `patches` | int | OK | Patches restored on a long rest. |
| `evasion` `armor` `fortitude` `speed` | int | OK | The base block — see below. |
| `armorType` | list | OK | Proficiencies granted (§6), or `none`. |
| `weaponType` | list | OK | Proficiencies granted (§6), or `none`. |
| `startingMana` | int | OK | Mana at level 1. |
| `manaPerLevel` | int | OK | Mana gained per level in this subclass. |
| `manaModel` | enum | OK | `pool` or `generated`. See below. |
| `concentration1/2/3` | text | — | Three dropdowns, folded into `roles`. |
| `description` | text | OK | Flavour shown in the subclass picker. |
| `note` | text | — | Authoring note for a mechanic the columns cannot hold. |

There is **no `active` column.** It used to strip subclasses that had not been
designed yet; every subclass is live now. A row that should stop shipping is
deleted, or marked `deprecated` (§2) if characters already reference it.

#### `formerIds`

Blank almost always. It holds the id(s) this row **used to have**, and it is the
one thing standing between a rename and a pile of orphaned characters — see §2
for the procedure. Semicolon-separated when there is more than one.

```
formerIds
subclass.marksman; subclass.hunter     <- a row renamed twice, now Kindred
```

#### Authoring `manaModel`

Two values, and it says which *mechanic* the mana columns describe:

- **`pool`** — a standing pool. `startingMana` is what they have at level 1 and
  `manaPerLevel` is what each level adds. This is every subclass but one.
- **`generated`** — no pool. Mana is generated in combat and spent as it is
  earned, and the subclass is excluded from the Short Rest half-mana restore.
  `startingMana` and `manaPerLevel` are both `0`. The Spellblade is the only one.

The column exists so a `0 / 0` row reads as a different mechanic rather than as a
very small pool that some future reader would "fix". If you add a subclass with
mana, it is `pool`.

#### The base block

`evasion` / `armor` / `fortitude` / `speed` are **absolute values stated per
subclass**, not deltas. Every subclass currently says the same `8 / 0 / 8 / 5`,
and that repetition is deliberate: these numbers are expected to diverge, and
when one does the sheet should be the only thing that changes. They were a single
`BASE_STATS` constant in `main.js` until they moved here.

Do not confuse them with `items.csv`'s `armorMod` / `evasionMod` / `speedMod`
(§4.7), which are **signed deltas applied on top**. Absolute numbers here, `+4` /
`-1` there.

#### `concentration1/2/3` → `roles`

Three dropdown cells, folded into one ordered list. Blanks are dropped; **repeats
are not** — the Unmaker really is three-way Burst Damage, and that weighting is
the point. Tracked in the library whether or not any screen displays it.

#### Derived class ids

`class.ranger` is slugged from the `class` cell, the same way every other id in
the library is slugged from its name (§2).

Classes have no `formerIds`, and do not need one: nothing stores a class id on a
character — `build` holds subclass ids only, and the class is read back through
them. A class rename does break `traits.csv`, whose `grantedBy` names class ids
directly, but it breaks **loudly**: the converter refuses to write and names the
row. Fix it there.

Derived classes have **no `desc`**, because there is no tab to write one in. The
class picker shows the class's subclasses instead. If classes ever need their own
flavour text, that is the point at which a `classes` tab earns its place.

Class order follows first appearance in the sheet, so re-ordering rows re-orders
the class list in the app with no code change.

---

### 4.3 `abilities`

Active, used abilities. Rendered as a collapsible with an optional rollable
damage box.

| Column | Type | Required | Notes |
|---|---|---|---|
| `cost` | int | — | Mana spent. Omit for free abilities. |
| `dmg` | dice | — | Dice expression (§5). Omit for non-damaging abilities — the damage box just won't render. |
| `range` | string | — | 🎲 e.g. `Melee`, `30 ft`, `Self`. |
| `action` | string | — | 🎲 Action economy slot. Rename to Waypoint's real term. |

### 4.4 `spells`

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

### 4.5 `traits`

Granted, not bought. Unlike a skill, a trait is never paid for with points: it
is conferred by a class or a subclass, or chosen from the universal pool (see
`class = All`, below).

A trait is **not necessarily a passive.** Most are, and for those `desc` carries
everything. But a trait may also be an *action* — `Pyroblast` and `Jolt` are
Tier 0 traits with an AP and Mana cost and a damage expression — or *triggered*,
firing on a stated condition. Anything the trait sheet grants is a trait,
whatever shape it takes.

| Column | Type | Required | Notes |
|---|---|---|---|
| `tier` | int | ✅ | Which tier unlocks it. `0` is granted outright; 1–4 are unlocked by levels. See **when a trait is granted**. |
| `grantedBy` | id | ✅ | The `class.*` **or** `subclass.*` id that confers it. The only column in the library that references either collection. |

**No `traitId` column.** The id derives from `name`, like everything else (§2) —
`Firestarter` becomes `trait.firestarter`. Name a trait uniquely and its id
follows; two traits sharing a name collide and the converter says so.

When a subclass is renamed, a `grantedBy` still naming its old id is migrated
automatically (via that subclass's `formerIds`) and reported as a warning, so a
rename never blocks a build — but update the cell when you see the warning.

#### When a trait is granted

`tier` and `grantedBy` together say *when* a character gets a trait. There is no
third column for it — the timing is derived.

**Tier 0 is granted, not chosen.** It lands the moment a character first commits
to that owner: at creation for the class and subclass they start as, and on the
**first level taken into a new subclass** when multiclassing. Taking a second
level into that subclass changes nothing — Tier 0 arrives once.

**Tiers 1–4 are unlocked by level, then chosen** — one trait per level-up, from
any tier the character has unlocked:

| Levels | Unlocks |
|---|---|
| 0 | Tier 0 only |
| 1–3 | Tier 1 |
| 4–6 | Tier 2 |
| 7–9 | Tier 3 |
| 10 | Tier 4 (capstone) |

**Which levels count depends on who grants the trait**, and this is the part
that is easy to get wrong:

- A **subclass** trait counts levels **in that subclass**.
- A **class** trait counts levels in **every subclass under that class, added
  together** — the umbrella total.

So a character with 3 levels of Pyromancer and 3 of Frostcaller is a level 6
Elementalist but only a level 3 Pyromancer. They unlock **Tier 2 Elementalist**
traits and **Tier 1 Pyromancer** traits at the same moment. Counting levels once
and using that number for both would be wrong in both directions.

A single-classed level 4 Pyromancer has 4 levels in both the subclass and the
class, so both sit at Tier 2.

In the app this is `levelsInSubclass()`, `levelsInClass()` and `unlockedTierFor()`
in `main.js`; the *picker* that spends a level-up on one of them is still to be
built (`docs/rules-gaps.md` §3.1).

**Traits are not stored on a character.** `build` already records which
subclasses a character has taken, so their traits follow from it — rewrite a
trait here and every character holding it updates at once. This is the
"derive, don't store" rule applied to content rather than to stats.

**Every class and every live subclass must have at least one Tier 0 trait.**

Tier 0 is everything a character receives for *choosing* that class or subclass,
granted the moment they first level into it. **It is not capped at one.** A
Pyromancer's Tier 0 is both `Fire Mage` (a passive) and `Pyroblast` (the spell
that passive grants), and both arrive together. The converter errors only on
zero — a creation step with nothing to show — and the app grants every Tier 0
row an owner has.

This used to error on two, on the reasoning that a consumer asking for "the"
Tier 0 trait would silently get whichever row was authored first. The fix for
that was to stop anything asking for a single one (`tier0TraitsOf()` in
`main.js` returns a list), not to limit what the sheet may say.

Every trait whose `grantedBy` resolves is exported. There used to be an `active`
column on `subclasses.csv` that stripped undesigned subclasses and their traits
with them; every subclass is live now, so both the column and the strip are gone
(§4.2).

There is no `trigger` column. An earlier draft proposed one for conditional
traits; add it when a trait exists that needs it, not before.

**`class = All` — the universal pool.**

A trait whose owner is `All` is not granted by anything. It sits in a pool every
character may pick from, and it is the first trait that has to be **stored on
the character**, because nothing in `build` implies it. That is a deliberate
exception to the rule two paragraphs up, not a contradiction of it: granted
traits stay derived, chosen ones are recorded.

Three rules, all of which differ from a granted trait:

1. **Always available.** Offered every time a trait is choosable, at every
   level.
2. **Not tier-gated.** The tier column on these rows does not restrict when they
   may be taken — the normal "levels 1-3 offer Tier 1" gating does not apply.
3. **Repeatable.** The same universal trait may be taken any number of times, so
   the character stores a *count*, not a flag.

Two of the five also need a **target** chosen at the moment they are taken:
`Skillful` needs to know which skill, `Mighty` which attribute. So a stored pick
is `{ id, count, picks: [...] }`, never a bare id. The other three (`Swift`,
`Resilient`, `Mana`) are pure deltas the app applies with no input — which is
exactly why those three have a `modifiers` value and the other two do not.

`Skillful` additionally reaches into the skill budget: it grants a skill point
**on top of** the one a level-up already gives. See §4.6.

---

### 4.6 `skills`

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
one. Each `Skillful` trait taken (§4.5) grants one further point, on top of the
level-up's. So a character's budget is `4 + level + Skillful`, and the skill
editor has to read the character's chosen traits to know its own ceiling.

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

### 4.7 `items` — one tab, three collections

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

## 5a. `X` and `Y` — variable costs

A cost or a size may be the literal string **`X`** (or **`Y`** where an entry
needs a second one) instead of a number. It is not a placeholder for a value
nobody has filled in — it is a number the *player* chooses at the moment they
use the thing.

```
Fiery Rush   spend X Mana to move twice X Spaces
Blizzard     apCost X, areaSize X — "create a Blast X blizzard"
Spellblade   abilities cost X Mana, up to the total generated in combat
```

Two properties matter for anything reading these:

- **X is scoped to its own row.** Within one entry every `X` is the same number,
  which is how `apCost: X` and `areaSize: X` on Blizzard stay tied together, and
  how the prose ("twice X Spaces") stays tied to the cost. Across rows, two `X`s
  have nothing to do with each other. X is not a constant the library defines
  once; it plays whatever role that one entry gives it.
- **`Y` is a second, independent variable** in the same row, when one variable
  is not enough.

So a cost column is typed `int | "X" | "Y"`, not `int`. The literal string is
what gets stored, and the UI asks for a number when the ability is actually
used — rather than a second "is this variable?" column, which would let the
flag and the value disagree.

---

## 6. Controlled vocabularies

**Stats** — the six fixed axes:

```
Power   Precision   Lethality   Constitution   Dexterity   Fortune
```

These live in code, not the library — they're the game's structure, not content.
**No collection references them.** In particular skills do not (§4.6): nothing
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
- Duplicate derived `id`, anywhere in the file — usually two rows sharing a name
- A `formerIds` entry that is malformed, or that names a **live** id (§2)
- Unparseable dice, or one outside the 1–100 / 2–1000 limits
- `skills.category` not in the five (§6)
- Non-integer in an int column, or a `mod` column that isn't `+2` / `0` / `-1` shaped
- An `items` row missing a field its `type` requires, or **filling one its type
  has no meaning for** (§4.7)
- A `weaponTag` outside the closed list (§6)
- A class or subclass with **no** Tier 0 trait (two or more is legal)
- Two `class` cells that differ only by case or spacing and would slug to one id
- A proficiency granted by `subclasses.csv` that no item declares (§6)

**Warnings**
- Unknown column (ignored)
- A `grantedBy` naming a former subclass id — migrated, but the sheet should be updated
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
- [x] Confirm the six stat names in §6
- [x] ~~Add an `id` column to each Sheets tab~~ — ids are derived from names instead (§2)
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
