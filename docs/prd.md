# Product Requirements Document — Meeple Companion App

> **What this doc is for:** defines the product itself — what we're building, why, for whom, what's in and out of scope, and what success looks like.
>
> **Keep it current.** Update this doc whenever requirements change, features are added or removed, user flows change, or the product scope changes.
>
> Items marked _TBD_ are still open and need to be filled in.
>
> **Related docs:** [`library-schema.md`](library-schema.md) (game content) · [`character-file.md`](character-file.md) (exported characters) · [`rules-gaps.md`](rules-gaps.md) (guide vs. app, and what's left to build)

---

## 1. Product Overview

| | |
|---|---|
| **Product Name** | Meeple Companion App |
| **One-Line Description** | A web app that keeps a Meeple character's stats, gear, progress, and the rules in one place on your device — a companion at the table, not a replacement for it. |
| **Product Type** | Web app |
| **Primary Platform** | Web (phone-first) |

---

## 2. Problem

**What problem are we solving?**
Meeple currently has no technology-based platform for players to track their character information.

**Why does this problem matter?**
Players must reference multiple resources to create a character and to progress through a campaign as they level up.

**How are users solving this today?**
With a notes app or some other general place to store their information — no formal tracking, and no aggregation of rules or references.

---

## 3. Goal

**Primary Goal**
Provide a simple experience for users who want to track their character's progress on a device, while also providing resources for rules, level progression, and everything else related to Meeple.

**Guiding principle — a reference tracker, not a virtual tabletop**
The app is not meant to be played *in*. It puts a character's actions, stats, gear, and the rules text in one place, and **the app tracks the numbers; the table applies the rules.** It should *show* what the rules say and let the player act on it. It should not guess at game context it cannot honestly know — *are we in combat? whose turn is it? are you behind cover?* — and when a feature would require that guess, the app states the rule instead. Every proposed feature must pass this test. (Full reasoning and precedents: `rules-gaps.md`, "What this app is".)

**Secondary Goals**
- An easy-to-understand UI that follows familiar design principles, so the Meeple system is easy to learn and enjoyable to use at the table.
- Characters that live safely on the player's device, can be backed up, and can be moved to another device or handed to a GM as a file.
- The guide and the app agree on every number either states — `rules-gaps.md` §1 stays empty.

---

## 4. Target Users

### User Type 1 — Alex (the veteran)

**Description**
An avid D&D, Lancer, and Warhammer player (among other TTRPGs) in his 30s who meets with friends weekly to play. He's played for years, has been a game master more often than a player, understands these games' mechanics deeply, and can teach them to others.

**Needs**
- Track all of his character's stats, skills, etc. easily in the app.
- A comprehensive resource for game rules and everything related to Meeple, for those who want to understand the game deeply.

**Pain Points**
- There are many companion apps already; this one should *not* take an entirely new or innovative approach. It should feel like other companion apps, while the Meeple system itself can feel different — it's meant to address pain points in other games and their mechanics.
- Some apps present too much irrelevant information at once, making it hard to tell what's important when learning a new system.

### User Type 2 — Alexandra (the roleplayer)

**Description**
Not an avid TTRPG player. When she plays, she learns only what is absolutely necessary for her character and relevant to the campaign. She's a fantasy reader who loves the roleplaying side of TTRPGs but gets lost in mechanics and rules.

**Needs**
- Ease of play is a necessity — she engages with basic stats and mechanics.
- Mechanics must be displayed in a way that's easy to remember for people unfamiliar with TTRPG companion apps.

**Pain Points**
- Doesn't fully understand the rules and needs frequent reminders of edge-case mechanics.
- If the app's experience and presentation are too complicated, it gets in the way of roleplaying and immersion.

---

## 5. User Stories

- **As a** player, **I want to** use the app to track my character **so that** I can easily play Meeple from my device.
- **As a** new player (Alexandra), **I want to** see what a Boon or Condition does right where it sits on my sheet **so that** I don't have to stop the scene to look it up.
- **As a** new player, **I want** character creation to walk me through each step and only offer valid choices **so that** I end up with a legal character without reading the whole guide first.
- **As a** veteran (Alex), **I want** a multiclass character's numbers to follow the multiclass rules automatically **so that** I can trust the sheet without re-deriving it.
- **As a** veteran, **I want to** search the full Player's Guide from inside the app **so that** I can settle a rules question at the table in seconds.
- **As a** player, **I want to** level up my character in the app **so that** new traits, spells, abilities, and points are added correctly.
- **As a** player, **I want to** roll my to-hit and damage from the sheet **so that** modifiers are already included.
- **As a** player, **I want to** back up my characters to a file **so that** I can restore them, move to a new device, or hand one to my GM.
- **As a** GM (Guide), **I want to** open a player's exported character file **so that** I can check their sheet without their device.
- **As a** GM, **I want** a campaign that holds my party and my enemies **so that** I can run a fight from one screen — one-shot or a months-long campaign.
- **As a** GM, **I want to** add a hero from the file a player sends me **so that** I see their real Evasion, Armor, Fortitude, Speed and HP without asking.
- **As a** GM, **I want** enemy stat cards whose attacks roll and whose Armor is applied for me **so that** I'm not doing arithmetic mid-fight.
- **As a** GM, **I want to** pick who acts next from those who haven't gone this round **so that** the order can change every round, and bosses can take several turns.
- **As a** GM *(future, online)*, **I want to** share a campaign code that players join with their hero **so that** damage either of us enters shows on both screens.

---

## 6. Core Features

### Feature 1 — Core Character Tracking

**Purpose**
Track all pertinent data about the player's character.

**User Flow**
The player navigates through tabs (Action, Character, Gear) that contain all the information needed to play their character. Creation is a guided multi-step flow; edits happen on the Edit Character screen.

**Inputs**
- Game content from the installed compendium (classes, subclasses, traits, skills, abilities, spells, items).
- Choices made at character creation and at each level-up.
- In-play changes: damage taken, healing, Mana spent, Patches used, Boons and Conditions applied, rests taken.
- Free-text notes.

**Outputs**
- Derived stats (HP, Evasion, Armor, Fortitude, Speed, Mana, to-hit, Power, Lethality), computed from the build rather than stored.
- The sheet itself, organised by what a player needs in the moment.
- An exported character file (see Feature 5).

**Acceptance Criteria**
- Character stats, gear, and level-progression unlocks are shown in an easy-to-read manner.
- The sheet updates dynamically with level changes and gameplay — including Boons and Conditions — and shows where each change comes from when inspected.
- Information aligns with class features and progression while remaining editable.
- Health, Mana, Wounds, and notes persist across reloads on the same device.

**Edge Cases**
- Never pull information from mismatched classes; use only the classes selected for level progression.
- **Multiclass:** Mana takes the *higher* pool rather than the sum; weapon/armor restrictions use the least restrictive class; HP follows the majority rule.
- **Wounds:** reaching 0 HP takes a Wound, HP resets to full, and spillover damage carries into the fresh bar. The last Wound has no refill — the character is **Downed**, and the bar stays empty.
- **A Wound clears every Boon** the character is carrying.
- A content id that the installed compendium does not carry is dropped rather than shown broken (and the player is warned before an import that would cause it).

---

### Feature 2 — Rules and Source Content Reference

**Purpose**
Two kinds of content, kept separate:
- **The rules** — the Player's Guide, browsable and searchable inside the app. Generated from the guide document (`tools/rtf-to-rules.mjs`), so the guide stays the source of truth and the app is never hand-edited to match it.
- **The compendium** — all game *content* (abilities, spells, traits, skills, weapons, equipment) as one shareable, versioned file. Characters reference its entries by id. Players can import, export, and replace it from **Settings → Compendium** so they can update content as it is published. Defined in `library-schema.md`.

**User Flow**
- **Rules:** opened from the menu on any screen; a pinned search field filters the guide as the player types.
- **Compendium import:** the player picks a file and chooses a mode:
  - **Add** — fills in entries the device doesn't have; anything already present is left alone. Takes effect immediately.
  - **Replace** — the file becomes this device's compendium; the app reloads. A rebalance must come in this way, since Add never updates an existing entry.
- **Compendium export** writes exactly what the app is currently resolving against, named `<title>-<version>.library.json`.
- **Restore the Built-in Compendium** drops an imported compendium and goes back to the one the app ships with. Characters are untouched.

**Acceptance Criteria**
- Rules can be quickly referenced and searched within the app without leaving the character.
- Exiting the rules reference returns the player to the screen (and tab) they were on — it does not fall back to a default screen. *(Not yet met — see Known Gaps below.)*
- The compendium's installed title and version are visible in Settings.
- An import refuses a file with a newer `schemaVersion` than the app understands, and refuses a character file with a message naming it as one.
- Before a Replace, the player is warned if characters reference ids the new compendium lacks.

**Known Gaps**
- **Rules → back always lands on the sheet's Action tab.** The back button on the Rules screen is hard-wired to `data-nav="sheet"` ([`pages/rules.html`](../pages/rules.html)), and navigating to the sheet always resets to the Action tab (`main.js`, the `data-nav` handler). So opening the rules from the Gear tab, Edit Character, or Settings returns the player somewhere they weren't. Fix: remember the view and tab at the moment Rules opens, and restore both on back.

---

### Feature 3 — Leveling Up

**Purpose**
Advance a character a level inside the app, granting what the level grants. This is the keystone of progression — traits and abilities are both granted *by* a level-up, so neither can be built first. (`rules-gaps.md` §3.2)

**User Flow**
_TBD — not yet designed._ The data model is ready (`build.levels` already holds entries and every derived number follows them); the flow is not.

**Acceptance Criteria**
- Each level grants +1 attribute point and +1 skill point (skill points give +2 each).
- Odd levels grant a spell or ability (`rules-gaps.md` §3.3).
- Trait tiers above Tier 0 become available as the rules allow (`rules-gaps.md` §3.1).
- Only classes the character has actually taken are offered at each level.

---

### Feature 4 — Dice Roller

**Purpose**
Roll from the sheet with the right modifiers already applied, while the table still makes the calls.

**User Flow**
To-hit and damage boxes on the sheet roll directly; a dice calculator handles any free-form expression.

**Acceptance Criteria**
- All rolls go through one dice engine (`evaluateDice()`); no `eval()`. Limits: 1–100 dice, 2–1000 sides, totals floored.
- Rolls display as expressions so the working can be checked — e.g. `(2 + 8) + 2`.
- Power is added to damage rolls; Precision adds +2 to hit.
- **Advantage / Disadvantage** is a held chooser the player picks per roll — not read from the sheet, because cover can't be known.
- A crit notifier fires inside the Lethality window and reads the kept die. Damage totals show **Half / Double** beside them rather than the app doubling a crit itself.

---

### Feature 5 — Boons and Conditions

**Purpose**
Track every effect on the character, show its rules text where it applies, and keep the numbers it changes in sync.

**User Flow**
Effects are added to a list on the sheet with a stack count. Effects that repeat (Regeneration, Bleed, Burn, Poison, Confusion) have a button on their row the player presses when *they* say it happens.

**Acceptance Criteria**
- All six Boons and all nine Conditions, with text matching the guide.
- Boons that modify an attribute move every stat derived from it (e.g. Strength → Power → every damage box).
- Tick buttons show the total for the stacks ("Take 4") and confirm before firing, spelling out the working.
- Tick damage goes through the normal damage path, so it can cause a Wound or down the character.
- All effects clear via a **Clear all** control and on **both** Short and Long Rest.
- Fortune applies to healing *output*; Poison is a toggle on healing *intake*.

---

### Feature 6 — Character File Export, Import, and Backup

**Purpose**
Let players keep characters somewhere other than one browser's storage — a backup, a move to a new phone, a hand-off to a GM. Defined in `character-file.md`.

**User Flow**
- Export a single character as `<name>.meeple.json`, sent through the device's share sheet or saved as a download.
- **Settings → Backup** exports the whole roster as one file.
- Import offers **add a copy** or **overwrite**, for the backup-restore case.

**Acceptance Criteria**
- Files are readable, pretty-printed JSON that a GM can open without the app.
- The file carries a snapshot of the compendium entries the character uses, so it still resolves on a device with different content (local entries win).
- The app refuses a file with a higher `schemaVersion` and accepts any lower one — a file exported today stays readable by every later version.

### Feature 7 — Game Master Tools *(in progress)*

**Purpose**
A place for a GM to run a game: campaigns holding a party of heroes, enemy stat cards, and the fight in progress. Offline first; built to sync later (`architecture.md` Decision 12).

**User Flow**
- **Home → Game Master Tools** opens the campaign list (like Characters). A campaign has a name and an optional subtitle.
- A campaign has three tabs: **Party**, **Enemies**, **Combat**.
- **Party:** add a hero by hand or **from a file** (the `.meeple.json` a player already sends). Each hero shows HP, Wounds, Evasion, Armor, Fortitude, Speed and their Boons & Conditions — the basic numbers, not the whole sheet.
- **Enemies:** stat cards — HP, Mana (optional), Wounds (optional), Evasion, Armor, Fortitude, Speed, turns per round, attacks and abilities with roll boxes. Import and export, toward a future monster compendium.
- **Combat:** choose the enemies (a group can share one turn), optionally a surprise round. Pick who acts next from those with turns left; end their turn; a new round resets everyone. Damage takes Armor off automatically, with an Armor Piercing toggle.

**Build phases** — 0 groundwork (rules split into hero card + vitals, `campaign.js`) *(done)*, 1 campaign list and shell, 2 Party, 3 Enemies, 4 Combat.

**Acceptance Criteria**
- A hero's numbers on the GM's screen equal the player's sheet for the same state (`unit/mechanics.test.js`, "the hero card").
- No new file format for heroes; the character file is read as-is.
- Nothing on the GM side connects to the network.

---

## 7. Non-Goals

The following are intentionally **not** part of this version. Most were tested against the guiding principle in §3 and closed as decisions, not deferred work:

- **Acting as a VTT** where players connect over the web to calculate damage or healing, transfer items, etc. *(Live campaign sync is planned as future work — `architecture.md` Decision 12 — and the GM Tools are built so it can be added; nothing connects yet.)*
- **Tracking turns or combat rounds on the player's sheet** — including Action and Reaction Point pools. These were built and then removed (`rules-gaps.md` §2.1). Ability costs still print on each row. *(The GM's Combat tab tracks who has acted each round — not AP, and not on a player's sheet.)*
- **Inferring game context** — whether you're in combat, behind cover, or hit by the same attack. The app states the rule and lets the player act on it.
- **Doing a player's arithmetic for a single action**, such as auto-doubling crit damage. Half / Double readouts serve the same need.
- **Auto-firing end-of-turn effects**, or auto-cleansing Slow, Dazed, and Blind.
- **Modeling GM-facing rulings** — DCs and Weight of Failure, group and contested checks, initiative *order*, travel, foraging, social attitudes, light and sight, hiding, downtime, weather, traps. The Rules screen *shows* them; the app does not model them (`rules-gaps.md` §5). The GM Tools *record* the GM's choices (who acts next, a surprise round) without deciding them.
- **Area-of-effect geometry and other positional rules** — these need a map, which is VTT territory. (Spells and equipment detail in `rules-gaps.md` §4 needs a scoping pass against this list before any of it is built.)

---

## 8. MVP Scope

**Must Have**
- Create a character from the collected data for class features, traits, skills, etc. *(shipped)*
- Edit a character. *(shipped)*
- Level up a character — Feature 3, including spell/ability acquisition and trait tiers. *(not started; the largest remaining piece of work)*
- Dice roller — Feature 4. *(shipped)*
- Boons and Conditions — Feature 5. *(shipped)*
- Rules browser and search, plus compendium import/export — Feature 2. *(shipped, one known gap)*
- Character file export/import and roster backup — Feature 6. *(shipped)*
- Characters stored on the device, surviving reloads. *(shipped)*

**Nice to Have**
- A Game Master's (Guide's) hub that lets a GM run a game, see players' stats, and track enemy stat cards for combat — Feature 7, offline first. *(In progress.)* Live updates as players change their stats are the online follow-up.
- Account-level syncing to save and load data from a cloud-based system. *(In the future pipeline. Sign-in UI exists with no login behind it; the device remains the primary store — signing in is only about carrying data between devices.)*

**Future**
- VTT capability where players can form a party and sync their data across it — without the game depending on that functionality to be playable.
- Selected spells and equipment detail from `rules-gaps.md` §4 that survive scoping — likely the numeric ones: Unarmed 1d4, weapon tags that change a number, damage types against Armor.

---

## 9. Success Metrics

**Primary Metrics**
- _TBD_ — suggested: a new player can create a legal character without the Player's Guide open.
- _TBD_ — suggested: a full session can be played from the app without consulting another resource.

**Secondary Metrics**
- `rules-gaps.md` §1 (guide vs. app disagreements) stays empty.
- _TBD_

---

## 10. Constraints

**Technical**
- Framework-free: vanilla HTML, CSS, and JavaScript — **no build step, no dependencies.**
- Must be served over `http://` (screens are fetched from `pages/`; `file://` does not work).
- Character data lives in the browser's localStorage; a compendium installed over the built-in one does too.
- Content pipelines: Google Sheets → CSV → `tools/csv-to-json.mjs` → library; Player's Guide RTF → `tools/rtf-to-rules.mjs` → rules. Generated files are never hand-edited.
- Computed stats are derived, never stored; game rules live as named constants in one place.

**Business**
- Shoestring budget.
- Minimal team resources.

**Design**
- The **"Field Journal"** theme (dark): Marcellus / Spectral type, 60/30/10 palette split. See `design-system.md`.
- Every foreground/background color pair clears **WCAG AA (4.5:1)**.
- One ember (accent) standout per screen.
- Phone-first layout.
- All design values live in `tokens.css`; no inline styles.

**Timeline**
- No major timeline constraint.

---

## 11. Assumptions

- Players have access to a device.
- Players use real dice or the app's roller at a physical or online table run by a GM — the app supports play, it doesn't host it.
- The Player's Guide is the source of truth for rules; when the guide and the app disagree, one of them is reconciled and the decision is recorded in `rules-gaps.md`.
- Game content is authored in Google Sheets and distributed as a compendium file.

---

## 12. Open Questions

- What does the level-up flow look like (Feature 3)? It is the next major build.
- Which items in `rules-gaps.md` §4 (spells and equipment detail) survive scoping against the non-goals?
- When account sync is picked up: which backend, and how does it fit the budget and the no-dependencies constraint? (Will need `security.md`.)
- ~~What does the GM hub need for a first version?~~ Answered: Feature 7. For its online follow-up: what players see of each other and of enemies, and who owns a joined hero's vitals (`architecture.md` Decision 12).
- Should abilities and spells, once they are compendium content, be snapshotted into character files like other entries? (`character-file.md` §7 — leaning yes.)
- Should weapon tags get their own collection carrying rules text, or stay a bare vocabulary? (`library-schema.md` §10)

---

## 13. Definition of Done

The feature/product is considered complete when:

- [ ] Requirements are implemented
- [ ] Critical user flows work
- [ ] Tests pass (`npm test` — see `testing.md`)
- [ ] Build succeeds
- [ ] Security requirements are satisfied
- [ ] Documentation is updated
- [ ] Loads over Live Server with no console errors
- [ ] Usable with the keyboard alone; new color pairs clear WCAG AA
- [ ] No inline styles; all visuals come from CSS and `tokens.css`
- [ ] `tools/csv-to-json.mjs` runs clean if library content changed
- [ ] `rules-gaps.md` updated if a rule was shipped, decided, or reconciled
- [ ] Passes the "reference tracker, not a VTT" test in §3
