# Rules Gaps — the guide vs. the app

Compared **`docs/Meeple Player's Guide.rtf`** (uploaded 2026-09-10) against the
app as it stands on 2026-09-14. The RTF has since been edited twice, both on
2026-09-14, to reconcile §1.1 and §1.2 — so "the guide" below means that document
as it stands now, not as uploaded.

Originally a pure survey, written so the next build could be chosen rather than
stumbled into. Items are grouped by what kind of work they are, and ordered roughly
by how visible the gap is at the table.

**How this file is arranged.** Everything above §7 is **open**. Everything in
**§7 is done** — shipped, decided, or reconciled — and sits at the bottom so the
remaining work reads first. Nothing is deleted when it is finished: each closed
entry is the record of a ruling that someone would otherwise have to re-derive
from the code, which is the whole reason this file exists.

Done so far, newest first — each is written up in full in §7:

| | What | When |
|---|---|---|
| §2.8 / §2.9 | Wounds clear Boons; effect ticks, Clear all, rests | shipped 2026-09-15 |
| §2.1 | Action & Reaction Points — **removed**; the app does not track turns | removed 2026-09-15 |
| §2.5 | Advantage / Disadvantage — a held chooser on the To-Hit box | shipped 2026-09-15 |
| §2.6 / §2.7 | Fortune and Poison on healing (+ healing abilities) | shipped 2026-09-15 |
| §2.10 | Boons that modify an attribute | shipped 2026-09-14 |
| §2.3 | Critical Strikes — threshold + notifier shipped, **doubling decided against** | 2026-09-14 |
| §1.2 | Armour ratings reconciled in the guide | 2026-09-14 |
| §2.1 | Action & Reaction Points | shipped 2026-09-14 |
| §1.1 | Wound penalty ladder reconciled in the guide | 2026-09-14 |
| §2.2 | Patches as a spendable resource | shipped 2026-09-10 |
| §2.4 | Power on damage rolls | shipped 2026-09-10 |

**§1 is now empty**, which is the first time the guide and the app have agreed on
every number either of them states.

**The numbers never change.** §2.1, §2.2 and §2.4 keep their original section
numbers after moving to §7, which is why §2 now runs 2.3, 2.5, 2.6 … with gaps.
They are **identifiers, not an ordering**: the code cites them in its own
comments (`mechanics.js` cites §2.2 and §3.1, `main.js` §2.5, §3.1 and §3.3), and a
renumbering would quietly turn every one of those into a pointer at the wrong rule. Never reuse a retired number either — a
future item is 2.10, not a recycled 2.4.

---

## The checklist

**This is the summary of the whole file, and it is the thing to keep current.**
Every item below links to the section that explains it. When an entry ships, is
decided, or is reconciled: tick it here, move its section into §7, and add a row
to the table above. A tick here with no §7 entry behind it is a bug in this
document.

### Done

- [x] **§2.4** Power on damage rolls — shipped 2026-09-10
- [x] **§2.2** Patches as a spendable resource — shipped 2026-09-10
- [x] **§2.1** Action & Reaction Points — shipped 2026-09-14
- [x] **§1.1** Wound penalty ladder — reconciled in the guide 2026-09-14
- [x] **§1.2** Armor ratings — reconciled in the guide 2026-09-14
- [x] **§2.2's 2 AP debt** — settled as a ruling 2026-09-14
- [x] **§2.3** Critical Strikes — shipped 2026-09-14 (threshold + notifier). The
      **damage doubling was decided against**, not deferred: see "What this app
      is". Half / Double readouts on damage rolls serve the same need. Same day:
      dice render as expressions — `(2 + 8) + 2`.
- [x] **§2.8 / §2.9** Wounds clearing Boons, and effect lifecycles — shipped
      2026-09-15. Ticks are **buttons on the effect row**, not turn phases; all
      effects clear on a Clear-all control and on **both** rests.
- [x] **§2.1** Action & Reaction Points — shipped 2026-09-14 and **REMOVED
      2026-09-15**. Tracking points means tracking turns, and the app does not.
      The AP/RP *costs* on ability rows stayed.
- [x] **§2.5** Advantage / Disadvantage — shipped 2026-09-15. **Held**, not read
      from the sheet: the player picks the pool per roll, because Cover is not
      knowable and the game is played with real dice. Crit reads the kept die.
- [x] **§2.6 / §2.7** Fortune and Poison on healing — shipped 2026-09-15. Fortune
      is **output** (folded into the spell's dice); Poison is **intake** (a toggle,
      because the app cannot know who you healed). Healing abilities had to be
      built to hold it.
- [x] **§2.10** Boons that modify an attribute — shipped 2026-09-14. Strength now
      moves Power (and so every damage box), Focus moves Lethality (and so the
      crit window). Carries the **full fifteen-effect audit** — read it before
      assuming any other boon works.

*All six entries from the original survey are now closed. Everything below is new
work rather than a leftover.*

### Next up — in order

**§2 is closed.** What remains is progression, and §3.2 is the keystone: traits
and abilities are both granted *by* a level-up, so neither can be built first.

- [ ] **§3.2** The level-up itself — the largest single piece of work left
- [ ] **§3.3** Spell and ability acquisition — also lifts §2.6's limitation
- [ ] **§3.1** Trait tiers above Tier 0
- [ ] **§4** — wants a **scoping pass** first, against "What this app is"

### Open — small, unranked

- [ ] **Natural-1 counterpart** to the crit banner — logged under §2.3 in §7

### Open — progression (§3)

- [ ] **§3.1** Trait tiers above Tier 0
- [ ] **§3.2** The level-up itself — *unblocks the other two: traits and abilities
      are both granted **by** a level-up*
- [ ] **§3.3** Spell and ability acquisition

### Open — spells & equipment detail (§4)

- [ ] Upcasting · Counterspell · Spell families + the Charm tag · Areas of effect
- [ ] Focus benefits · Weapon tags *(all four stored and shown, none does anything)*
- [ ] Dual wielding *(must opt out of `damageExpr()` — no Power on the offhand)*
- [ ] Armor Piercing / Resistance / Immunity / Vulnerability
- [ ] Unarmed attack (1d4) · Crafting · Magic items as stat sticks

### Closed permanently

- [x] **§1** — empty. The guide and the app agree on every number either states.
- [x] **§5** — GM-facing rulings. The Rules screen shows them; the app does not
      model them.
- [x] **§6** — 17 entries verified as matching the guide, each now a unit test.

**Where it stands: §2 is CLOSED.** Every core-mechanics entry is resolved —
shipped, decided against, or in §2.1's case built and then removed. **§3
progression is now the only structural work left in the project**, and §3.2 is its
keystone: traits (§3.1) and abilities (§3.3) are both granted *by* a level-up, so
neither can be built first. §3.3 also lifts the limitation §2.6 shipped with —
until it lands, a player cannot author a healing ability of their own.
Progression is the untouched block, and §3.2 is the one that unblocks the rest
of it.

---

## What this app is — read before scoping anything

**Meeple's companion is a reference tracker, not a virtual tabletop.** It is not
meant to be played *in*. It puts your actions, stats, gear and the rules text in
one place; it does not track each turn or every little aspect of play.

**So: the app tracks the numbers, the table applies the rules.** It should *show*
what the rules say and let the player act on it. It should not do a player's
arithmetic for one action, and it should not remember one interaction in order to
silently change another.

This is the test a "missing" feature in this file has to pass. Three entries have
already failed it, and each was closed as a **decision rather than as work**:

| Entry | The automation that was rejected | What shipped instead |
|---|---|---|
| **§2.1** | **Tracking AP/RP at all** | The pools were **removed**; costs still print on each row |
| §2.9 | End-of-turn ticks fired by the app | A button on the effect row, pressed when *you* say |
| §2.5 | Assembling an advantage pool from the sheet | A held chooser — you pick, because Cover is unknowable |
| §2.3 | Doubling a damage total on a crit | **Half / Double** shown beside every damage total |
| §2.2 | Charging 2 AP for a Patch | The dialog *states* "costs 2 AP in combat" |

The shape is always the same: the app would have had to infer game context it
cannot honestly know — *are we in combat? was that the same attack? whose turn is
it? are you behind a wall?* — so it states the rule instead. **A gap that needs
the app to guess is not a gap.**

§2.1 is the sharpest case, and worth reading before proposing anything turn-shaped:
it was fully built, worked, and was removed the next day for exactly this reason.

---

**Scope.** This file tracks *rules* divergences only — where the guide and the app
disagree about a number or a mechanic. UI work is not logged here even when it
touches a screen a rule is read off: the Reroll/Done change to the roll card on
2026-09-10 changed no rule and so has no entry, and appears below only under §2.3,
which will build on that card. §2.1's two rows of tally boxes are logged because
the *pools* are the rule — where they sit on the card is not. If you came looking
for why a button moved, this is the wrong document.

---

## 1. Intentional divergences — the app is right, the guide is behind

### This section is currently EMPTY — and that is the good state.

Both original entries have been reconciled: **§1.1** (the Wound penalty ladder) and
**§1.2** (the armour ratings), on 2026-09-14. The guide and the app now agree on
every number either of them described. Their records are in §7.

The section stays because this is a category that will fill up again, not a job
that is finished forever. An entry belongs here when the app is deliberately right
and the **rulebook** is what has to change — a rebalance made in code that the
document has not caught up with. That is different from every other section in
this file, where the app is what changes.

**The shape of an entry:** state what the guide says, what the app does, the
decision, and a *"To reconcile"* line naming the exact edit. While it is open it
lives here in full, because that table is the to-do list. Once the guide catches
up, the to-do list has done its job — so the entry is **replaced by a short record
of the decision in §7** rather than archived whole.

**How to reconcile one** (§1.1 and §1.2 in §7 are both worked examples):

1. Edit `docs/Meeple Player's Guide.rtf` — the RTF is the rulebook.
2. Run `node tools/rtf-to-rules.mjs`.
3. **Verify by diffing the *generated* `rules.js`, not the RTF.** A correct edit
   shows up as only the cells or paragraphs you meant to touch; anything else in
   the diff means the splice went wrong. This is the whole safety net for editing
   a 3 MB document by hand.

Never hand-edit `resources/js/rules.js`. It is generated, it says so at the top,
and the document wins the next time anyone runs the converter.

**If the RTF is an export** from Word, Pages or Docs, the same edit has to be made
in whatever that tool is — otherwise the next export silently reverts it and the
app goes back to disagreeing with the sheet.

---

## 2. Not implemented — core mechanics

**This section is empty — every entry is done and lives in §7.** It is kept as a
heading because core-mechanics divergences will be found again; the numbers in §7
are identifiers and are never reused, so the next one is 2.11.

---

## 3. Not implemented — progression

### 3.1 Trait tiers above Tier 0
**Guide:** one Trait chosen per level, from a tier gated by levels — 1–3 Tier 1,
4–6 Tier 2, 7–9 Tier 3, 10 Tier 4 (capstone). A **subclass** trait counts levels
in that subclass; a **class** trait counts the umbrella total across every
subclass under it (schema §4.5).
**App:** the *gating* now exists — `levelsInSubclass()`, `levelsInClass()`,
`unlockedTier()` and `availableTraitsOf()` derive which tiers a build has
unlocked, and Tier 0 (which may be several traits, not one) is granted from the
build and displayed. What is still missing is the **selection**: nothing spends
a level-up on a trait, and nothing stores a chosen one on the character.

### 3.2 The level-up itself
**Guide:** each level grants 1 Attribute Point, 1 Skill Point, 1 Trait, and — on odd
levels — 1 spell or ability from the subclass levelled.
**App:** the drawer's Level Up is still a stub. `build.levels` can hold entries and
every derived number follows them, so the data model is ready; the flow is not.

### 3.3 Spell and ability acquisition
Nothing grants abilities. The Actions section is free-form placeholder data with no
editor (`Edit Character → Abilities` is still stubbed).

---

## 4. Not implemented — spells and equipment detail

- **Upcasting** — X + 1d3 Mana per level, with the failure case (take the shortfall
  as Arcane damage, lose the AP, keep the Mana). Nothing models it.
- **Counterspell** — per-spellcaster; enemy counters are a contested Power check.
- **Spell families** (13 of them) and the **Charm tag** targeting Fortitude rather
  than Evasion. `fortitude()` exists and is displayed but nothing ever targets it.
- **Areas of effect** — Cone / Line / Burst / Blast / Aura / Chain X. No geometry
  anywhere in the app.
- **Focus benefits** — 1H focus makes spells cost −1 Mana; 2H focus extends spell
  range (Burst +1, Line +3, Cone +1, Range +3). Both focus items exist in the
  library with no mechanical effect.
- **Weapon tags** — Super Heavy (1 Disadvantage, +1d8), Light (Reliable 2, −2
  damage), Loading (reload 1 AP, +1d6), Reach (Range/Threat 2, Disadvantage inside
  Range 1). All four are stored per weapon and shown on the row as a **label only**;
  none changes a number.
- **Dual wielding** — a second offhand attack on the same action, separate roll, no
  Power bonus. Not modelled (and depends on 2.4 existing first).
- **Armor Piercing / Resistance / Immunity / Vulnerability** — damage types exist in
  the library but `damage()` takes a flat number and knows no type. Void is always
  Armor Piercing per Ch.5.
- **Unarmed attack** — 1d4 Physical. Not present; a character with empty hands has
  no attack option.
- **Crafting** — 2 equipment slots, breaks on a natural 1, DC 10 during a Long Rest.
- **Magic items as stat sticks** — the library has no magic-item entries yet.

---

## 5. Deliberately out of scope (GM-facing, no app surface needed)

Listed so they aren't mistaken for oversights: the DC ladder and *Weight of Failure*
(+5 per failed attempt), harder-task DCs, group checks (weakest link / collective
average), contested rolls, initiative and turn weaving, surprise rounds, travel and
navigation, foraging, social attitudes, light levels and sight limits, hiding and
spotting, downtime activities, weather, traps. These are rulings a GM makes; the app
only needs to *show* them, which the Rules screen now does.

---

## 6. Verified as matching

Checked and correct, so they need no work:

**Now enforced by tests (2026-10-05).** Each rule below is a unit test: the
arithmetic in `tests/unit/mechanics.test.js` (against `resources/js/mechanics.js`,
where the rules now live), and the content rows — weapons, shields, armour, the
base block — in `tests/unit/content.test.js` (against the real compendium). A
change that breaks one fails `npm test`. When a rule here changes on purpose,
change its test in the same edit.

- Precision **+2 to hit** (`PRECISION_TO_HIT`), applied to weapons and spells alike
- Constitution **+1 HP**, Dexterity **+1 Evasion**, Fortune **+1 Fortitude**
- Base stats **Evasion 8 / Armor 0 / Fortitude 8 / Speed 5**
- Weapon damage and reach — 1H Melee 1d6 r1, 2H Melee 2d8 r1, 1H Ranged 1d4 r5,
  2H Ranged 2d6 r10
- Shields — +2 Armor / +2 Evasion / +1 and +1
- Armor — **all three columns**. Evasion and Speed always matched; the Armor
  column was §1.2 and was reconciled in the guide on 2026-09-14
- The Wound cascade — 0 HP takes a Wound, HP resets to full, spillover carries into
  the fresh bar, and the last Wound has no refill (Downed)
- Downed — cannot act, and `isDowned()` keeps the bar empty
- Skill points — 4 at creation into 4 *different* skills, +1 per level, **+2 each**
- Attribute points — 4 at creation, +1 per level
- Mana — 10 base, per-subclass growth, and multiclass taking the **higher** pool
  rather than the sum
- Short Rest restoring **half maximum Mana, rounded down**
- Multiclass weapon/armor restrictions (least restrictive) and the HP-majority rule
- All six Boons and all nine Conditions, with text matching the guide

---

## Suggested order

**§2 is closed**, so there is no ranked list of core mechanics any more. What is
left is §3 and §4, and they are different kinds of work.

1. **§3.2 The level-up itself** — the keystone, and the largest single piece of
   work in the project. `build.levels` already holds entries and every derived
   number follows them, so the data model is ready; the flow is not. It unblocks
   **§3.1** (traits are chosen at a level-up) and **§3.3** (odd levels grant a
   spell or ability), neither of which can be built first.
2. **§3.3 Spell and ability acquisition** — also lifts §2.6's limitation: until
   there is an ability editor, a player cannot author a healing ability of their
   own and *Manus Salutis* is the only one in the app.
3. **§3.1 Trait tiers** — last of the three, since it is the one that needs the
   library's tier data as well as the flow.

**§4 deserves a scoping pass before any of it is built.** It is eleven items, and
"What this app is" has since been written down — several of them (areas of effect
geometry, contested Counterspell checks) look like the VTT territory that rule
rejects, and deciding that is cheaper than building them. The ones that clearly
survive are the numeric ones: Unarmed 1d4, weapon tags that change a number,
damage types against Armor.

Smaller things logged elsewhere and deliberately unranked: the **natural-1
counterpart** to the crit banner (§2.3), and **spending an ability's printed cost**
(§2.1) — though the second is now unlikely ever to be wanted, since the pools it
would have spent from are gone.

---

## 7. Done — shipped, decided, or reconciled

**Nothing in this section is outstanding.** It is kept in full, and at the bottom,
for two reasons: the open work should read first, and every entry here is the
reasoning behind a decision the code now depends on. A comment in `main.js` can
say *what* a function does; this is where *why it was allowed to* is written down.

Read an entry here before changing the code it describes. Several record rulings
that look like bugs until you know they were chosen — a Patch that refuses to
revive a Downed character, a tap that deliberately does not heal, an AP cost the
app prints but never charges.

**§1 entries work differently from §2 entries.** A §2 entry is design
documentation and stays useful forever. A §1 entry is a *to-do list for the
rulebook*, so once the guide catches up its content is spent — which is why §1.1
and §1.2 below are short records of their decisions rather than the full tables
they used to be.

---

### 1.1 The Wound penalty ladder — RECONCILED 2026-09-14

**Was:** the guide gave a five-step ladder where the penalty depended on *which*
Wound (1: −2 Armor, 2: −2 Speed, 3: −2 Armor, 4: −2 Speed, 5: +2 Vulnerable),
while the app applied **−2 Armor and −1 Speed to every Wound**, cumulatively. The
Armor totals diverged everywhere past the first Wound.

**Decision (2026-09-10): keep the app's flat multiplier.** A table would be five
copies of one rule with five chances to fall out of step, and it would need
re-pitching for every Wound cap in the library (most subclasses cap at 4, The
Beast at 5). Multiplying by the Wound count fits any cap for free. The reasoning
is also in the comment above `WOUND_ARMOR_STEP`.

**Reconciled (2026-09-14): the guide now says what the app does.** Ch.1, *Taking a
Wound & Death* reads **"Each Wound: -2 Armor and -1 Speed"**. The +2 Vulnerable
step was dropped rather than reworded — Wounds reduce Armor directly now, so
Vulnerable is purely a condition again, which is what the comment at `armor()`
already said.

**How it was done, since §1.2 is the same job:** the five paragraphs were spliced
into one in `docs/Meeple Player's Guide.rtf`, then `node tools/rtf-to-rules.mjs`
regenerated `resources/js/rules.js`. The check that the document survived was
diffing the *generated* file: the whole diff was five blocks becoming one, plus
the generation date. **If the RTF is an export from another tool, the same edit
has to be made in whatever that tool is, or the next export reverts it.**

**No code changed.** The app was already right, which was the point of §1.

---

### 1.2 Armor ratings — RECONCILED 2026-09-14

**Was:** the guide's Ch.4 *Armor* table gave Medium **+1** Armor and Heavy **+2**,
while `tools/csv/items.csv` carried **+2** and **+4**. The Evasion and Speed
columns already agreed exactly; only the Armor column was doubled. Since Armor is
flat damage negation, Heavy Armor absorbed twice what the guide said on every
single hit — the largest silent divergence in the file.

**Decision (2026-09-10): keep the app's doubled values.** Confirmed as an
intentional rebalance, not a transcription slip. Heavy Armor is meant to absorb 4.

**Reconciled (2026-09-14): the guide now says what the app does.**

| | Evasion | Armor | Speed |
|---|---|---|---|
| Light | 12 | 0 | +1 |
| Medium | 10 | **+2** | 0 |
| Heavy | 8 | **+4** | −1 |

Light was already 0 and stayed 0. Verified by parsing the regenerated `rules.js`
and the CSV and comparing all three rows rather than by reading them — Evasion is
stored as a *modifier* on `BASE_STATS.evasion` (8), so the CSV's `+4 / +2 / 0`
is the guide's `12 / 10 / 8` and eyeballing the two tables side by side proves
nothing.

**Worth knowing if you edit the RTF again:** this one is a real table — `\trowd`
rows of `\cell`s — not paragraphs like §1.1. The Armor cell is the **third** in
each row (label, Evasion, Armor, Speed), and Light's Speed cell two rows above the
Medium Armor cell also reads `+1`, so the edit was made by line index with the
expected old value asserted, never by a search-and-replace on `+1`.

**No code changed.** The app was already right, which was the point of §1.

---

### 2.1 Action and Reaction Points — SHIPPED 2026-09-14, **REMOVED 2026-09-15**

> **READ THIS FIRST. The AP/RP tracker described below no longer exists.** It was
> built on 2026-09-14 and taken out the next day, and the entry is kept in full
> because the reasoning is the most useful thing in this file.
>
> **Why it went:** tracking Action and Reaction Points means tracking *turns*, and
> **a player knows from their build and the rules what happens when**. This app is
> a reference tracker, not a virtual tabletop — see "What this app is". The pools
> reset at the start of your turn, so a pool on the sheet is only correct if the
> app knows a turn began, and it does not and should not.
>
> **What went with it:** `AP_PER_TURN`, `RP_PER_ROUND`, `DAZED_AP_STEP`, `apMax()`,
> `rpMax()`, `clampPoints()`, `startOfTurn()`, `setPoints()`, the two tally rows,
> the ↻ control, and `character.ap` / `character.rp` from the model and the save.
>
> **What stayed:** every ability and spell still **prints its AP/RP cost**
> (`costLine()`, `COST_KEYS`). That is reference material — what a thing costs is a
> property of the thing — and it is the half of §2.1 that was always right.
>
> **What this un-did:** `Dazed` (−1 AP) is unwired again. It is now in the same
> position as Guidance and Blind — its text describes something the player applies.
> And §2.2's Patch dialog no longer says "spend it on your Action row"; it just
> says the cost.
>
> **The `startOfTurn()` seam is gone too**, which is why §2.9 was reframed rather
> than built on it. Everything below is the record of what was built, kept because
> it explains decisions the rest of the app still rests on — the spendable-counter
> pattern the Patch tally shares, and the reasoning about derived ceilings.


**Guide:** 3 AP per turn, 1 RP per round, both reset at the start of your turn.
Every action has an AP/RP price, and `Dazed` is −1 AP.

**Was:** abilities and spells *displayed* AP/RP costs (added 2026-09-10) and Dazed's
text mentioned AP, but there were no pools to spend from and nothing reset.

**Now:** `AP_PER_TURN`, `RP_PER_ROUND` and `DAZED_AP_STEP` sit beside `COST_KEYS` —
what an action costs and the pool it costs from, declared together. `character.ap`
and `character.rp` store what is LEFT, against ceilings `apMax()` and `rpMax()`
derive, which is the same shape health, mana and Patches already use. Two rows of
gold tally boxes sit under the Patches row, ruled off from it because they are a
different **clock**: everything above the line survives a fight, these two are gone
and back every turn.

**Dazed finally does something.** `apMax()` subtracts it, so a Dazed character's
Action row is visibly **two boxes long**, not three with one crossed out — what
they have this turn is two Action Points, and the row says the true thing. Losing
Dazed widens the row back without refunding the AP that turn cost; only the turn
ending refills.

**Downed is enforced as a count, not as a shorter row.** `apMax()` deliberately
ignores `isDowned()`; instead `setWounds()` calls `clampPoints()`, which zeroes
both pools. So a downed character shows three *empty* boxes — "you have none
left", which is true — where a zero-length row would read as a render that failed.
This also turns `canSpendPatch()`'s Downed refusal from an assertion into something
the sheet shows: they cannot pay the 2 AP because the row is visibly empty.

**One control for both rows.** `startOfTurn()` is named for the rule, not the
button. AP and RP reset at the same moment, so two buttons would invent a
distinction the game does not have. **This is the plumbing §2.9 wants** — when
Regeneration's tick and the Slow/Daze/Blind auto-cleanse land, they land in this
function (or in an `endOfTurn()` twin beside it), not in a second control with its
own idea of when a turn begins.

**A rest does NOT restore points** (decided 2026-09-14). A rest is not a turn, and
one refill wants one owner. The Rest notes are unchanged.

**The §2.2 AP debt is settled — as a ruling, not a charge** (decided 2026-09-14).
The guide prices the Patch action at 2 AP *in combat only*; out of combat HP resets
free and Patches clear Wounds freely. The app has no in-combat state and is not
getting one — a skirmish is something the table knows it is in and the app would
only be guessing at. So `spendPatch()` deducts **no AP**, `canSpendPatch()` tests
Downed rather than `ap >= 2` (gating on the pool would refuse a legal out-of-combat
Patch from anyone who had not tapped Start of Turn lately), and the dialog now
carries the line *"Costs 2 AP in combat — spend it on your Action row."* The app
tracks the numbers; the table applies the rule.

**Still open, and it depends on this:** nothing yet *spends* from these pools
automatically. Every Action row already prints its cost (`costLine()`), but making
that cost tappable is its own decision — `collapsible()`'s comment rules out a
button inside the head button, so a spend control has to live in the row's body or
footer. Until then the boxes are tapped by hand, which is the same bookkeeping the
Wound pips and Patch tally are.

### 2.2 Patches as a resource — SHIPPED 2026-09-10
**Guide** (Ch.1, *Resting & Recovery*): every class has a number of Patches.
In combat, 1 Patch + 2 AP resets HP to full and removes 1 Wound. Out of combat, HP
resets automatically and Patches remove Wounds freely. **Patches are only restored
on a Long Rest.**

**Was:** `patchesMax()` derived the number and the class browser displayed it, but
there was no spendable counter and no Patch action. Wounds could be taken with no
sanctioned way to clear them short of a Long Rest.

**Now:** `character.patches` is a spent count stored beside `wounds`, with the
ceiling still derived — so a subclass rebalance moves it, and a save or an imported
`.meeple.json` is clamped to the local `patchesMax()` on the way in. A counter of
tally boxes — the Wound pips' geometry, each holding a bold medical cross —
sits under the Wound pips. Long Rest restores them; **short rest
deliberately does not**, which is the same restraint that leaves Wounds alone.

**Two gestures on the same boxes**, which is the part to understand before
changing any of it:

| Gesture | Runs | Effect |
|---|---|---|
| Tap a box | `setPatches()` | Sets the count. Nothing else moves. |
| Hold a box (450ms) | `openPatch()` → `spendPatch()` | HP to full, one Wound cleared, one Patch spent. |

The split is the point. A tap is **bookkeeping** — a player fixing a miscount is
not asking to be healed, and a counter that quietly heals when corrected is one
players stop trusting. A hold is **the rule**. It is the same division the dice
roller already draws between backspacing one token and holding to clear the whole
expression, and it reuses that gesture's `DICE_HOLD_MS` rather than restating a
duration, so the app has one idea of how long a hold is.

Three rulings worth knowing, all commented at `spendPatch()` / `canSpendPatch()`:

- **The 2 AP is not charged — settled 2026-09-14, and it stays that way.** This
  was §2.1's debt to pay, and §2.1 paid it by ruling rather than by deducting:
  the guide's 2 AP applies *in combat only*, the app has no in-combat state and
  is not getting one, so the dialog now STATES the cost and the player takes it
  off their own Action row. Full reasoning at `spendPatch()` and in §2.1.
- **A Patch cannot be spent while Downed.** A Downed character cannot act and has
  no way to pay the 2 AP, so coming back up is a Long Rest. Decided 2026-09-10;
  the alternative was letting a Patch revive, which would have made Downed a
  speed bump rather than a state.
- **Nothing-to-gain is refused.** At full HP with no Wounds a hold does nothing,
  rather than letting a limited resource be burned for no effect. Note this
  applies to the HELD gesture only — the tap tally is never disabled, because
  correcting a count stays legitimate at full health, at zero Patches and while
  Downed alike.

**Ordering note for whoever touches this next:** `spendPatch()` clears the Wound
*before* refilling health, because `setWounds()` owns the rule that a character at
the Wound cap has an empty bar — refilling first would have that rule immediately
re-zero it. Today that path is unreachable (the Downed ruling above refuses it
first), and it is written that way regardless so the function is correct on its own
terms rather than by depending on its caller.

### 2.3 Critical Strikes and the Lethality threshold — SHIPPED / DECIDED 2026-09-14

**Guide:** a natural roll inside your Critical Strike threshold (20 by default,
*lowered* by Lethality) doubles the whole damage total, dice and modifier alike.
A natural 20 always hits and always crits; a natural 1 always fails. Precision can
never push you into a crit — it must be the natural die.

**Was:** `statValue('Lethality')` was never read, and nothing doubled damage.

#### The threshold — shipped

`CRIT_BASE`, `LETHALITY_TO_CRIT` and `critThreshold()` sit beside
`PRECISION_TO_HIT` and `POWER_TO_DAMAGE`, and read like them on purpose:
**Precision buys to-hit, Power buys damage, Lethality buys crit range.**
`isCrit(face)` takes a FACE, never a total — every call site hands over a natural
die, because "Precision can never push you into a crit" is the rule the signature
enforces.

| Lethality | Crits on |
|---|---|
| 0 | 20 |
| 1 | 19–20 |
| 2 | 18–20 |
| *n* | 20−*n* … 20 |

**Both clamps are rules, not padding.** Floor at `CRIT_MIN_FACE` (2) — "a natural
1 always fails", so the window widens to 2–20 and stops. Ceiling at `CRIT_BASE` —
"a natural 20 always hits and always crits", and Lethality can go *negative*,
which would otherwise push the threshold to 21 and demote a natural 20.

`Focus` (+1 Lethality) widens the window, as of §2.10.

#### The notifier — shipped

A `roll-card__crit` banner above the total: oxblood, small caps, hairline box. It
appears **only once the dice settle**, and a second line names the window
("Lethality 2 · crits on 18–20") which is **omitted at Lethality 0**, where the
plain 20 needs no explaining.

Crits are read **only in the quick-roll card**, gated on `kind === 'tohit'`. A d20
in the dice calculator is just a d20 — nothing there knows a roll is an attack, so
nothing there can honestly call one a Critical Strike.

`attackFace()` *searches* for the d20 rather than taking `rolls[0]`. Today a
to-hit is always `d20+N` so the two agree — but §2.5's Advantage is
2d20-take-highest, and "first group, first face" would then read the *discarded*
die.

#### The damage doubling — DECIDED AGAINST, and this is not a debt

**The app does not double damage on a crit, and should not be made to.** See
"What this app is" at the top of this file: doubling a damage total because a
*previous, separate tap* rolled inside the threshold means remembering one roll in
order to change another, which is the turn-tracking a reference tracker does not
do. The app cannot honestly know that the damage box you just tapped belongs to
the attack that critted.

**What shipped instead:** every damage roll card states **Half** and **Double**
beside the total, and the player takes the one their situation calls for — a
Critical Strike, a resisted hit, whatever the GM just said. `halfOf()` uses
`Math.floor`, so **half always rounds down**: 15 → 7, 13 → 6, 11 → 5. The flanks
are shown on `kind === 'damage'` only; a to-hit is a threshold you meet or miss,
not a quantity, so it keeps its total centred and alone.

Deliberately **not** linked to the crit banner: Double always shows on a damage
roll and does not light up because the last to-hit critted. That link is exactly
the thing being declined.

#### The dice notation, reworked the same day

The roll card drew boxed chips; it now prints the roll as an **expression**.

| Expression | Rolled | Card shows |
|---|---|---|
| `1d6+2` | 2 | `(2) + 2` |
| `2d8+2` | 2, 8 | `(2 + 8) + 2` |
| `2d8-1` | 4, 4 | `(4 + 4) − 1` |
| `1d8+1d4+2` | 6, 3 | `(6) + (3) + 2` |

A box says "token"; parentheses say where the number came from, in the notation
the table already speaks. One pair per die *group*, so unrelated dice are never
merged into one sum. The modifier sits outside the parentheses because that is
where it sits in the notation, and a negative one renders `− 1` rather than
`+ -1`.

Faces are now marked by **colour** rather than a filled tile — `.die--crit`
(oxblood), `.die--max` (rust), `.die--min` (red), `.die--tumbling` (faint) — which
is what lets a highlight live inside a run of text. The old `.die-chip*` classes
are gone entirely. `.die--crit` still beats `.die--max`, for the reason below.

The calculator's breakdown took the same notation — `2d8 (2 + 8)` — but **keeps
its notation prefix**, which the card has no use for: the card shows one roll
already named above it, while the calculator can hold several unrelated groups and
that prefix is the only way to say which typed term produced which faces.

**The max/min marks are still not the rule**, on either surface:

| Surface | Painter | Classes |
|---|---|---|
| Dice calculator breakdown | `breakdownHtml()` | `.roll--max` / `.roll--min` |
| Quick roll card | `paintQuickRoll()` | `.die--max` / `.die--min` |

Both mean "this die showed its highest face", where a crit is "the natural d20
landed inside the threshold" — a d8 showing 8 is not a crit, and a d20 showing 19
may well be one.

**Still open, and small:** a natural-1 counterpart to the crit banner. "A natural
1 always fails" is the symmetric case and has no announcement. Scoped out
deliberately, not overlooked.

---

### 2.4 Power on damage rolls — SHIPPED 2026-09-10
**Guide:** "Roll damage — weapon or spell dice + Power." Power is +1 damage per point.
**Was:** a damage box rolled the bare weapon or ability dice. A Power 3 character
rolled the same `2d8` as a Power 0 one.
**Now:** `POWER_TO_DAMAGE` and `damageBonus()` sit beside `PRECISION_TO_HIT` and
`toHitBonus()`, and `damageExpr()` folds the bonus into the expression inside
`valBox()` — so a Power 3 character's 2H melee box reads and rolls `2d8+3`. Both
damage call sites (the gear summary and the ability row) route through `valBox()`,
so weapons, abilities and spells cannot drift apart.

Three deliberate limits, all commented at `damageExpr()`:
- A bonus of zero appends nothing — Power 0 still shows the weapon's printed dice.
  Negative Power renders as `2d8-1`, which the parser already accepts.
- Free-form ability damage that is not a legal dice expression passes through
  untouched, checked against the real engine via `validateDice()`.
- Item readouts (`detailLines()`, `pickNote()`) still print the weapon's *printed*
  damage with no Power — an item window describes the item, the sheet describes
  what you roll. Same split armour already uses.

**Still open, and it depends on this:** a dual-wielded offhand attack takes no
Power bonus (Ch.4, and §4). When that second attack exists it must opt out
of `damageExpr()` rather than have `valBox()` guess which box is the offhand.

---

### 2.5 Advantage and Disadvantage — SHIPPED 2026-09-15

**Guide:** net stacks change the dice POOL — 2d20 take highest/lowest, 3d20 at two
stacks, no cap; they cancel one for one. Half Cover = 1 Disadvantage, Full = 2.
`Guidance` grants Advantage; `Invisible` and `Blind / Deafened` grant Disadvantage.

**Was:** the boons and conditions were all present with correct text, but nothing
read them into a roll and `evaluateDice()` had no advantage concept.

#### Held, not read — the decision that shapes everything else

**The player chooses the pool, per roll, by pressing and holding the To-Hit box.**
The app does not assemble it from the sheet, and that is deliberate:

- **Cover is not knowable.** Half Cover is 1 Disadvantage and Full is 2, and
  nothing on this sheet can say whether you are behind a wall. A pool built from
  only the half the app can see would be **wrong more confidently** than one it
  does not build at all.
- **Meeple is played with real dice.** The app supports that; it does not
  replace it. Same posture as §2.3's doubling and §2.2's AP — see
  "What this app is".

**So `Guidance`, `Invisible` and `Blind / Deafened` still do not feed a roll, and
that is now a decision rather than a gap.** Their text describes what the player
should take into account when they pick; the picking is theirs. This is the one
place in the file where "the effect is not wired" is the intended end state, which
is why it is written down here rather than left looking like unfinished work.
(Their *lifecycles* — Guidance lost on your next d20, Invisible lost when you
attack — remain genuinely open under §2.9.)

#### The gesture

A plain tap on a To-Hit box rolls a straight d20, exactly as it always has. A
**450ms hold** opens the chooser — the third use of `DICE_HOLD_MS`, after the
roller's delete key and the Patch tally, so the app still has one idea of how long
a hold is. Only To-Hit boxes: Damage and Healing take no advantage, so they keep
their plain tap and nothing new to learn. `showRoll()` drops a stray `adv` on any
other kind rather than trusting its caller.

Four rows, top to bottom, each naming only the pool it picks up:

| | |
|---|---|
| 2 Advantage | 3d20 |
| Advantage | 2d20 |
| Disadvantage | 2d20 |
| 2 Disadvantage | 3d20 |

**"Take highest" is written nowhere.** The option's own name says which way it
goes, and the card shows the discarded die struck through. There is no fifth
"straight roll" row either — that is what the tap is.

The menu is **rooted on the box** rather than centred, because there can be half a
dozen To-Hit boxes on screen and a centred sheet would lose track of which one was
pressed. It is opened first and measured second, so its real height decides
whether it can open downward; `openAdv()` then writes `--adv-x`, `--adv-y` and
`data-adv-dir`, and the stylesheet owns every actual dimension — the same
arrangement `--pull` and `--pv-*` already use. Absolutely positioned inside `.app`
rather than `position: fixed`, so it is placed against the phone frame and cannot
break if an ancestor ever grows a transform.

#### The arithmetic, which is the whole of the rule

`adv` is a **single signed net count**: positive keeps the highest, negative the
lowest, the pool is always `|adv| + 1` dice, and 0 is a straight roll with no
special case anywhere. Cancelling comes free — there is no pair of counters to
keep in step.

**The total is the KEPT die plus the modifiers, never the sum.** This is the one
piece of real surgery: `blendRoll()` builds its total by summing every face and
adding the flat part, which is right for `2d6` and wrong for a pool where one die
counts. It is shared with the calculator, where summing *is* correct, so the
override lives in `quickTotal()` on the quick-roll path and `blendRoll()` is
untouched.

**`evaluateDice()` was not changed.** The grammar gains no keep-highest notation,
so `tools/csv-to-json.mjs`, which shares the engine, is unaffected — the risk the
old entry flagged. The pool is built by widening the expression's die count
(`d20+6` → `2d20+6`) and choosing afterwards.

| Mode | Faces | Kept | Total (+6) |
|---|---|---|---|
| Advantage | 19, 4 | 19 | 25 |
| Disadvantage | 19, 4 | 4 | 10 |
| 2 Advantage | 3, 17, 9 | 17 | 23 |
| 2 Disadvantage | 3, 17, 9 | 3 | 9 |

Ties keep the first of the equal faces — it changes no total, and it stops the
highlight flickering between two identical numbers as the tumble lands.

#### Crit reads the kept die

`attackFace()` was written in §2.3 to *search* for the d20 rather than take
`rolls[0]`, with a comment saying it was for this moment. It now takes the kept
one: **a 20 thrown away by Disadvantage announces nothing, and a 19 kept by
Advantage announces a Critical Strike.**

#### On the card

All faces are printed, the discarded ones struck through and faded — seeing what
you did not take is most of the point of rolling two. `.die--dropped` beats every
other mark: a die the pool threw away is not a maximum, not a fumble and certainly
not a crit, whatever it shows.

Faces in an attack pool are separated by a **gap, not a `+`** (`.die-sep`), because
they are alternatives rather than addends — `(19 + 4)` would claim a sum of 23 that
nothing in the rules ever computes. The mode's name sits under the kind line and is
empty on a straight roll, so the card reads exactly as it did before any of this
existed. Reroll keeps the mode; `state.lastRoll` stores the **unwidened**
expression so a reroll rebuilds the pool rather than widening `2d20` into `4d20`.

---

### 2.6 / 2.7 Fortune and Poison on healing — SHIPPED 2026-09-15

Written up together because they are one feature: **healing is the only number in
the game modified at both ends**, and getting it right is entirely about keeping
the two ends apart.

| | Whose it is | What it does | How it is applied |
|---|---|---|---|
| **Fortune** | the **caster's** | +1 healing **output** per point | folded into the rolled expression, always |
| **Poison** | the **target's** | −1 healing **received** per stack | offered as a toggle, never automatic |

**Fortune is output.** It makes the healing *you produce* more effective, whether
it lands on an ally or on yourself — so it belongs in the expression, exactly as
Power belongs in a damage one. `FORTUNE_TO_HEAL` and `healBonus()` sit beside
`POWER_TO_DAMAGE` and `damageBonus()`, and `healExpr()` mirrors `damageExpr()`
limit for limit. A Fortune 2 character's `1d6` heal **reads and rolls `1d6+2`**.
Fortune's other half, +1 Fortitude, `fortitude()` has always read.

**Fortune never touches Mana** (decided 2026-09-15). Mana is *spent and restored*,
not damaged and healed — the calculator switches its own verbs for that reason —
and Fortune boosts healing, not resource recovery. Structurally this is why the
bonus lives in `healExpr()` and not in `heal()`: `heal()` is the primitive that
moves a bar and Mana restore goes through the very same call, so a bonus placed
there would have leaked.

**Poison is intake, and it is a TOGGLE because the app cannot know the target.**
Nothing on this sheet records who you healed. Fortune is yours and always applies;
Poison belongs to whoever receives the healing, and only applies when that is you.
Rather than guess, the card asks — *"Apply my Poison (−1)"* — shown only when the
character actually has stacks. This is the same posture as §2.2's AP and §2.3's
doubling: **when the app cannot honestly infer game context, it offers the control
instead of automating it.**

Worked example, and the one the feature was specced against:

> Fortune 2, Poison 1, a `1d6` healing spell. Roll a 6.
> The card reads **`(6) + 2 − 1`** and totals **7**.

Poison is rendered as its own term *after* the modifier, and is deliberately **not
in the dice expression** — it is not part of what was rolled, and putting it there
would make it part of the caster's output and would apply it when healing an ally.

**Three rulings, all commented in place:**
- **Off by default.** The plain roll is what an ally receives; the deduction is the
  special case about you.
- **Toggling recomputes, never re-rolls.** The settled view is retained in
  `state.rollView`, so the control cannot be flicked to fish for a better number.
- **Clamped at zero.** Poison 5 against a 3-point heal is 0, not −2. A heal that is
  out-toxined does nothing; it never turns around and deals damage.

**The calculator got the same control** (decided 2026-09-15). Healing entered on
the Heal side is healing *received*, so Poison reduces it wherever it came from —
a GM saying "you recover 5" is the same event as a spell. Health only; the control
is absent on Mana. Fortune is **not** offered there, because the calculator is
receiving, not casting.

#### What had to be built first

**There were no healing abilities in the app at all.** `valBox()` knew `tohit` and
`damage`; abilities carried `dmg` and nothing else rollable. Fortune-as-output had
nothing to attach to. So this also shipped:

- **`heal` on an ability**, `dmg`'s twin — model, `freeForm()` normaliser (validated
  against the real engine, same guard as `dmg`), and save.
- **A `heal` roll kind**, and a Healing box on the row. It is a separate box rather
  than a damage box with the sign flipped: they are different events, take
  different bonuses (Power against Fortune), and only one of them is reduced by the
  target's Poison. An ability may carry both.
- **A seeded healing spell** — *Manus Salutis*, `1d6` — because
  `Edit Character → Abilities` is still stubbed (§3.3). **This is the limitation to
  know:** until §3.3 lands, a player cannot author a healing ability of their own,
  so the feature is reachable only on the seed character.

**One bug worth remembering.** `$('[data-poison-toggle]')` matched the
*calculator's* control, which appears earlier in `index.html` than the roll card's
— so the card's toggle stayed hidden while the calculator's silently changed state
behind a closed modal. Both painters are now scoped to their own modal. Any future
control that exists on two surfaces needs the same care.

---

### 2.8 / 2.9 Wounds clearing Boons, and effect lifecycles — SHIPPED 2026-09-15

Together, because they are one idea: **an event removes effects.** Before this,
nothing in the app had ever removed an effect by itself.

#### 2.8 — a Wound clears every Boon

`setWounds()` owns it, beside the empty-bar rule it already owned. Boons go,
**Conditions stay**, and it fires **only on the way up** — clearing a Wound with a
Patch, or correcting a miscount downward, is not *taking* one.

**It fires for the Wound pips as well as the damage cascade**, which is a ruling
worth knowing. The pips are documented as bookkeeping, but they are not *only*
that: tapping the last one already downs the character and empties the bar. They
are how a Wound is recorded when the damage happened at the table rather than in
the app, and a Wound recorded is a Wound taken.

**It is announced.** Losing three Boons silently while the health bar refills is
the sheet changing under the player, so a notice says how many went — except when
the same Wound also downed them, where the Downed notice carries the sentence
instead. Two windows for one event is one too many.

**The exception is not modelled.** The guide says "unless a trait specifically
notes it", and no trait can note anything yet because trait selection does not
exist (§3.1). Logged rather than hidden: a rule applied without its exception will
surprise somebody.

#### 2.9 — reframed: the app does not track turns

**Decided 2026-09-15, and it reverses the approach the old entry assumed.** That
entry wanted an end-of-turn control to sit beside a start-of-turn one. There is no
start-of-turn control any more — see §2.1 — because **a player knows from their
build and the rules what happens when, and this app is a reference tracker rather
than a virtual tabletop.**

So there is no turn machinery at all. Instead, an effect that happens repeatedly
declares a `tick` on its own `EFFECTS` row, beside its rules text:

```js
{ id: 'boon.regeneration', … effect: 'Heal 1 HP at the start of turn',
  tick: { label: 'Heal', heal: 1 } },
```

and its row grows a button. Five effects have one: **Regeneration** heals,
**Bleed**, **Burn**, **Poison** and **Confusion** deal damage.

**The button carries the TOTAL for the stacks on the sheet** — "Take 4", "Heal 2" —
because the multiplication is the only thing it is really for. The rules text above
it already says what one stack does, and still says *"at the end of your turn"*,
because that is the rule and it is the player's to apply. The app supplies the
arithmetic, not the timing.

**It confirms before it fires**, like the Patch dialog, and spells out the working
("4 stacks × 1 damage each") so the number can be checked without recounting the
row. A mis-tap that silently took 4 damage would be worse than no button.

Damage ticks go through `damage()`, so the **Wound cascade applies and a tick can
down a character** exactly as a hit can — which, now that §2.8 has landed, means a
Bleed tick can also cost you every Boon you were carrying.

**Not built, deliberately:** Slow, Dazed and Blind auto-cleansing at end of turn.
That is turn tracking, and the stepper already clears them by hand.

#### End of skirmish

All Boons and Conditions clear, by **three** routes:

- **A "Clear all" control** in the Boons & Conditions heading, hidden while the
  list is empty. The player says when the fight ended; the app does not infer it.
- **Short Rest and Long Rest**, both. A rest is the end of a skirmish by
  definition — you do not take a breather mid-fight — and the rule is about the
  fight ending, not about how long you sat down for.

**One bug this exposed:** `takeRest()` repainted the vitals but not the effects, so
a rest emptied the model and left the rows and the numbers they were buying on
screen. It now repaints both, plus the derived block, since effects hold Armor,
Evasion, Speed and attributes up.

---

### 2.10 Boons that modify an attribute — SHIPPED 2026-09-14

*Found while building §2.3, fixed the same day. Numbered 2.10 because retired
numbers are never reused.*

**Guide / app text:** `Strength` is **+1 Power**, `Focus` is **+1 Lethality**.

**Was:** `statValue()` was `statBase() + statMod()`, and `statMod()` read
**`character.inventory` item mods only**. No boon reached an attribute. The
tracker counted the stacks, the row displayed the rule, and nothing happened —
for months, in both cases.

**Now:** the modifier is declared **on the effect's own row** in `EFFECTS`:

```js
{ id: 'boon.strength', … effect: '+1 Power',     mod: { stat: 'Power',     value: 1 } },
{ id: 'boon.focus',    … effect: '+1 Lethality', mod: { stat: 'Lethality', value: 1 } },
```

That shape is **the same `{ stat, value }` an inventory item's mods use**, which
is the whole design: a boon and a trinket are the same kind of thing to
`statValue()`, to the stat card's colour, and to the popover that names where a
number came from. And putting it on the row rather than in a lookup elsewhere is
what stops it drifting again — the rules text and the arithmetic now sit on one
line and are read together.

`statFromEffects()` sums `value × stacks`, because every effect in this file is
stated per stack. Neither boon declares a `maxStacks`, so two stacks of Strength
is +2 Power and the popover labels it `Strength ×2  +2` — the count rides in the
label so the player is not left dividing a bare `+2` by the rules text.

**What it reaches, for free.** `damageBonus()` reads Power through `statValue()`
and nowhere else, so Strength widens **every damage box on the sheet at once** —
weapon, ability and spell alike, `2d6+2` becoming `2d6+3`. `critThreshold()`
reads Lethality the same way, so Focus widens the crit window §2.3 just built,
from 20 to 19–20. Neither needed a line of its own. That is the "derive, don't
store" rule paying for itself.

**One render bug this exposed.** `renderDerived()` did not repaint ability rows,
and an ability's damage box goes through `damageExpr()` — so Power is *baked into
the printed dice*. Taking Strength moved the gear boxes and left `2d6+2` sitting
on the abilities. `renderAbilities()` now hangs off `renderDerived()`, so every
path that can move an attribute — a boon, a trinket, an edited stat — repaints
them without having to remember to.

**The audit that came out of it.** Fifteen effects, and what each one actually
does today:

| Effect | Text | Number applied? | Lifecycle applied? |
|---|---|---|---|
| Strength | +1 Power | ✅ **new** | n/a |
| Focus | +1 Lethality | ✅ **new** | n/a |
| Protection | +1 Armor | ✅ `armor()` | ❌ "lost after you next take damage" |
| Guidance | +1 Advantage | ❌ §2.5 | ❌ "lost when you roll your next d20" |
| Invisible | Dis/Advantage | ❌ §2.5 | ❌ "lost when you attack or cast" |
| Regeneration | Heal 1 HP at start of turn | ❌ §2.9 | n/a |
| Bleed | 1 damage at end of turn | ❌ §2.9 | n/a |
| Burn | 1 Fire damage at end of turn | ❌ §2.9 | n/a |
| Poison | 1 damage end of turn; −1 healing | ❌ §2.9 / §2.7 | n/a |
| Confusion | 1 Psychic damage per action | ❌ §2.9 | n/a |
| Slow | −1 Speed | ✅ `speed()` | ❌ auto-cleanse, §2.9 |
| Chill | −1 Evasion | ✅ `evasion()` | n/a |
| Vulnerable | −1 Armor | ✅ `armor()` | n/a |
| Dazed | −1 AP | ✅ `apMax()` | ❌ auto-cleanse, §2.9 |
| Blind / Deafened | Disadvantage | ❌ §2.5 | ❌ auto-cleanse, §2.9 |

**Read that table as two separate questions**, because they fail independently.
*Seven* effects now apply their number. *Every* lifecycle is still manual — even
Protection, whose +1 Armor works perfectly and then never expires — and all of
them are §2.9. Nothing in the app has ever removed an effect by itself.

**Why the remaining numeric gaps are not this bug.** Guidance, Invisible and
Blind/Deafened are all **Advantage**, which is §2.5 and needs the dice engine, not
an attribute term. Regeneration, Bleed, Burn, Confusion and Poison's damage are
all **turn events**, which is §2.9 and needs `startOfTurn()`'s twin. Neither is a
missing `mod` row: only an effect that moves one of the six attributes belongs in
`EFFECTS.mod`, and there are exactly two of those.

---

### 2.11 The maximum-health floor — DECIDED / SHIPPED 2026-11-13

**Was:** `healthMax()` was the subclass's HP plus Constitution, with no lower
bound. Constitution can go negative — an inventory modifier ranges −20 to +20 —
so a −20 trinket on a 10-HP subclass gave a **−10** health bar, and a rest then
wrote −10 into current health. At a maximum of 0 or below the Wound cascade also
broke down: the refill was empty, so a single point of damage ran straight
through every Wound to Downed. Found in the Codex second-opinion review.

**Ruling (designer, 2026-11-13): maximum health is never below 1** while the
character is standing. Reaching 0 takes a Wound and refills the bar to full, so
the bar has to hold *something* for that to mean anything. Once Wounds reach the
cap, *current* health stays at 0 — that is Downed, and it is unchanged.

**How it is built:** `RULES.HEALTH_MAX_FLOOR = 1` in `mechanics.js`, applied in
`healthMax()`. Only once the character has a subclass — a sheet with none is not
a character yet and keeps its pool of 0, the same distinction `isDowned()` draws.
Constitution itself still reads its true (negative) total; only the derived pool
is floored. Unit tests: *maximum health never drops below the floor* in
`tests/unit/mechanics.test.js`.

**Not decided here:** Evasion, Fortitude and Speed can also go negative through
modifiers and Conditions (Speed already has `DOWNED_SPEED` for Downed, but no
floor while standing). None of them breaks a rule the way a negative health pool
did, so they are left as they are until there's a ruling.
