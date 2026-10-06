# Testing — Waypoint Companion App

> **What this doc is for:** how the app is validated. "The code looks correct" is not done — the change has to be **run and checked**.
>
> **Status:** there is **no automated test suite yet**. Today, verification is manual in the browser, plus the content converter's own checks. This doc sets out what to test, the tools that fit the project's no-build, no-runtime-dependency rules, and the order to build the suite in. Items not yet built are marked **Open**.
>
> **Related docs:** [`prd.md`](prd.md) (features and acceptance criteria) · [`architecture.md`](architecture.md) · [`security.md`](security.md) (Gap 3 — malicious-file test) · [`code-style.md`](code-style.md) · [`rules-gaps.md`](rules-gaps.md) (rules the app must match)

---

## 1. Testing Goals

**Critical functionality** — the things that must never silently break:

- **Character data survives.** Saving, reloading, deleting, exporting, importing, and backing up never lose or corrupt a character.
- **The numbers are right.** Derived stats, the Wound cascade, healing and damage, rests, Patches, and Boons/Conditions match the Player's Guide (`rules-gaps.md` §6 lists what's verified).
- **Dice are correct and safe.** The parser computes correctly and refuses bad or oversized expressions.
- **Imported files can't hurt the app.** Malformed, too-new, or malicious files are refused or neutralized (`security.md`).
- **Content stays valid.** The library converter catches bad data before it ships.
- **The app is usable by everyone.** Keyboard access, visible focus, contrast, reduced motion.

---

## 2. Test Types

### Unit Testing

Test small pieces with no browser:

- **The dice engine** (`dice.js`) — arithmetic, precedence, dice limits, invalid input, never `eval()`.
- **Content converters** — `csv-to-json.mjs` refuses bad rows (it already exits with errors and writes nothing); id derivation; `formerIds`.
- **Game rules** — derived stats, the Wound cascade, heal/damage, rests, multiclass rules. **Blocked today:** these live inside `main.js`'s closure and can't be imported. **Open:** extract the pure rules into their own file (the way `dice.js` was extracted) so Node can test them.
- **Validation and clamping** — the loaders that check stored and imported data (`database.md` A6). Same blocker as above.

### Integration Testing

Test pieces working together:

- **Save → reload → load** round-trips every field (`database.md` A3).
- **Export → import** round-trips a character (add a copy and overwrite), including the portrait and the content snapshot.
- **Backup → restore** of a whole roster.
- **Compendium import** — Add fills gaps without overwriting; Replace reloads; Restore drops it; characters referencing missing ids lose them with a warning.
- **Files across versions** — older files still import; newer `schemaVersion` is refused (`character-file.md` §6).
- **Storage full** — portrait that won't fit is kept in memory with a message; play continues.
- **Future (Open):** APIs, database interactions, authentication flows, sync conflicts.

### End-to-End Testing

Drive the real app in a real browser through the critical journeys (§5): first run, create a character, play a session, export/import, back up/restore, compendium update, rules lookup, delete. **Future (Open):** sign up, sign in, sync across two devices.

### Security Testing

- **Malicious-file import:** a character file and a compendium file whose every text field holds script payloads (`<img src=x onerror=…>`, `<script>`, `"><svg onload=…>`). Import, open every screen that shows the data, and assert nothing executes and the text displays literally. Closes `security.md` Gap 3.
- **Oversized and malformed files:** huge JSON, invalid JSON, wrong file type, wrong envelope.

### Accessibility & Visual Checks

- **Keyboard:** every control reachable and operable; focus always visible (`--focus`).
- **Contrast:** every new color pair clears WCAG AA (`design-system.md` §4).
- **Reduced motion:** animations stop or soften.
- **Screen readers:** icon buttons labeled; toasts announced.
- **Visual regression:** before/after screenshots of key screens when CSS changes broadly (used for the type/spacing migration on 2026-10-05).

---

## 3. Testing Tools

Chosen to keep the app itself dependency-free. **Test tools are development-only** — nothing below ships to players.

| Type | Tool | Why |
|---|---|---|
| **Unit** | **Node's built-in test runner** (`node --test`, `node:assert`) | Zero dependencies; Node 24 is already installed; `dice.js` already loads in Node |
| **Integration** | Node test runner for file-format logic once extracted; **Playwright** for anything that needs the browser (storage, files, rendering) | |
| **E2E** | **Playwright** (`playwright-core` driving the installed Chrome) | Already proven on this project: used on 2026-10-05 to screenshot every screen and verify the toast and status lines |
| **Accessibility** | Manual keyboard pass; **Open:** automated checks (e.g. axe-core via Playwright) | |
| **Visual** | Playwright screenshots, compared before/after | |

**Open — decision needed:** Playwright is a dev dependency, which means adding a `package.json` (dev-only). Record it in `architecture.md` §9 when adopted.

---

## 4. Test File Structure

**Proposed** (nothing exists yet):

```text
projectWaypoint/
└── tests/
    ├── unit/            # node --test — dice, converters, extracted rules
    │   └── dice.test.js
    ├── integration/     # file formats, save/load round-trips
    ├── e2e/             # Playwright — critical flows in §5
    │   └── helpers/     # start a local server, open the app, seed storage
    ├── security/        # malicious and malformed file imports
    └── fixtures/        # sample character files, backups, compendiums
        ├── characters/  # valid v1, older-shape, too-new, malicious, malformed
        └── compendiums/
```

**Rules:**
- Test files are named `<thing>.test.js`.
- **Fixtures are real files** in the formats players actually exchange — they double as compatibility tests: once a character file is in `fixtures/`, every future version must still import it.
- Tests never touch a real player's storage — E2E runs use a fresh browser profile.

---

## 5. Critical User Flows

Each flow lists the steps and the result that must hold. These are the E2E suite's backlog and, until it exists, the **manual check** before calling a change done.

### Flow 1 — First run
**Steps:** open the app with empty storage → go to Characters.
**Expected:** Home loads with no console errors; the seed character (Elara) appears in the roster and opens to a working sheet.

### Flow 2 — Create a character
**Steps:** Characters → Create Character → pick class → subclass → spend attribute points → spend skill points → choose gear → name and origin → finish.
**Expected:** Continue stays disabled with a reason until each step is valid; over-spending shows an amber warning but doesn't block; the new character opens with correct derived stats and appears in the roster after reload.

### Flow 3 — Take damage, go down, recover
**Steps:** on the sheet, apply damage past 0 HP repeatedly; then heal; then rest.
**Expected:** each 0 HP takes a Wound, refills HP, and carries spillover; a Wound clears every Boon; the last Wound leaves the character Downed with an empty bar and a warning dialog; a Short Rest restores half max Mana (rounded down); both rests clear all Boons and Conditions.

### Flow 4 — Roll
**Steps:** tap a To-Hit box (normal, then with Advantage and Disadvantage); tap a Damage box; use the dice calculator with an expression.
**Expected:** modifiers (Precision +2, Power) are included; rolls show their working; Half/Double shown on damage; a crit inside the Lethality window is announced and reads the kept die; invalid expressions show an error, never crash.

### Flow 5 — Boons and Conditions
**Steps:** add a Boon that modifies an attribute; add Bleed with stacks; press its tick button; Clear all.
**Expected:** the attribute and everything derived from it update; the tick confirms with the working ("4 stacks × 1") and applies damage through the Wound cascade; Clear all empties the list and restores the numbers.

### Flow 6 — Edit and save
**Steps:** Edit Character → change name and bio → Save; try saving with an empty name.
**Expected:** "Character saved." toast; Save goes inert; empty name shows an error under the field and doesn't save; changes survive reload.

### Flow 7 — Export and import a character
**Steps:** export a character (with portrait) → import the file as a copy → import again as overwrite.
**Expected:** "Character exported." toast; the copy is identical with a new id; overwrite replaces in place; portrait, notes, and gear survive.

### Flow 8 — Back up and restore
**Steps:** Settings → Export All Characters → delete a character → import the backup.
**Expected:** "Backup saved." toast; the restore brings every character back with a result window listing them.

### Flow 9 — Update content
**Steps:** export the compendium → import a compendium as Add → as Replace → Restore Built-in.
**Expected:** Add fills only missing entries; Replace warns about ids characters would lose, then reloads; Restore returns to the shipped content; characters are never otherwise changed.

### Flow 10 — Look up a rule
**Steps:** from the sheet's Gear tab, open Rules from the menu → search → go back.
**Expected:** results filter as you type. **Known gap:** back currently lands on the Action tab, not Gear (`prd.md` Feature 2, Known Gaps) — this flow should pass once that's fixed.

### Flow 11 — Delete a character
**Steps:** Characters → edit → delete → confirm → reload.
**Expected:** the confirmation warns it's permanent; the character and portrait are gone and **stay gone after reload** (including the seed character).

### Flow 12 — Hostile files
**Steps:** import each file in `fixtures/` marked malicious or malformed.
**Expected:** no script runs; malformed and too-new files are refused with a message naming the problem; nothing already on the device changes.

---

## 6. Coverage

**Target:** practical, not a percentage. **Every critical flow in §5 has an E2E test**, and **every rule in `rules-gaps.md` §6 ("Verified as matching") has a unit test** once the rules are extractable.

**Prioritize:**
1. **Data mutations** — save, load, delete, import, export, backup. Losing a character is the worst failure this app can have.
2. **Critical rules logic** — derived stats, Wound cascade, heal/damage, rests.
3. **The dice engine.**
4. **Untrusted input** — file import and the malicious-file test.
5. **Important user journeys** — §5.
6. **Future:** authentication and sync, when they exist. (No payments in this product.)

---

## 7. Commands

| | Command | Status |
|---|---|---|
| **Run the app** | VS Code → right-click `index.html` → Open with Live Server (or any static server, e.g. `python3 -m http.server`) | Works today |
| **Unit tests** | `node --test tests/unit` | **Open** — no tests yet |
| **E2E tests** | `npx playwright test` | **Open** — needs the dev-dependency decision (§3) |
| **Content check** | `node tools/csv-to-json.mjs` | Works today — exits with errors and writes nothing if the content is invalid |
| **Rules regenerate** | `node tools/rtf-to-rules.mjs` | Works today (Mac only — `architecture.md` §13) |
| **Lint** | — | **Open** — no linter (`code-style.md` §10) |
| **Build** | — | **None by design** — there is no build step |
| **Type check** | — | **Open** — no type checking (`code-style.md` §10) |

---

## 8. Definition of Done

A change is done when:

- [ ] **Tests pass** — once a suite exists; until then, the relevant flows in §5 were run by hand.
- [ ] **It was run in the browser** over `http://`, not just read.
- [ ] **No console errors** on load or during the changed flow.
- [ ] **Critical flow verified** — every §5 flow the change touches.
- [ ] **Data survives a reload** if the change touches saving.
- [ ] **Keyboard and focus** work for any new or changed control.
- [ ] **Contrast** checked for any new color pair.
- [ ] **Content check passes** (`node tools/csv-to-json.mjs`) if content changed.
- [ ] **Docs updated** — `rules-gaps.md`, `design-system.md`, `code-style.md` §15, as relevant.
- [ ] No blocking errors. *(Build, lint, and type checking don't apply yet — see §7.)*

---

## 9. Roadmap — building the suite

In order, smallest and highest-value first. Each step is **Open** until done.

1. **Dice unit tests** with `node --test` — no setup needed; `dice.js` already runs in Node.
2. **Fixtures** — export real character files, backups, and compendiums into `tests/fixtures/`, plus hand-made malicious and malformed versions.
3. **Playwright setup** (dev-only `package.json`) and a helper that serves the app and opens it with clean storage.
4. **E2E for data safety first:** Flows 7, 8, 11, 12 (export/import, backup, delete, hostile files).
5. **E2E for play:** Flows 3, 4, 5.
6. **Extract pure rules** from `main.js` into a testable file, then unit-test everything in `rules-gaps.md` §6.
7. **Remaining flows** and an automated accessibility pass.
