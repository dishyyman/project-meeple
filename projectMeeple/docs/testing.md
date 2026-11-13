# Testing — Meeple Companion App

> **What this doc is for:** how the app is validated. "The code looks correct" is not done — the change has to be **run and checked**.
>
> **Status (2026-11-04):** an automated suite exists — **80 unit tests** and **19 browser tests**, each browser test run in **Chrome and Safari (WebKit)**, all passing (one is a marked known bug, §10). Any JavaScript error in the page fails the test it happens in. Run everything with `npm test` (§7) before committing. What each file covers is in §4; what's still to build is in §9. Items not yet built are marked **Open**.
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
- **Game rules** — derived stats, the Wound cascade, heal/damage, rests, multiclass rules. **Built:** these live in `resources/js/mechanics.js` (extracted from `main.js` for exactly this reason) and are tested against a small hand-written compendium.
- **Content** — the real compendium states the numbers the guide states (weapons, shields, armour, base block), ids are unique, dice columns parse.
- **Validation and clamping** — the loaders that check stored and imported data (`database.md` A6). **Blocked:** still inside `main.js` (`applySave()`, the file parsers). Covered end to end by the browser tests for now; **Open:** extract them the same way.

### Integration Testing

Test pieces working together:

- **Save → reload → load** round-trips every field (`database.md` A3).
- **Export → import** round-trips a character (add a copy and overwrite), including the portrait and the content snapshot.
- **Backup → restore** of a whole roster.
- **Compendium import** — Add fills gaps without overwriting; Replace reloads; Restore drops it; characters referencing missing ids lose them with a warning.
- **Files across versions** — older files still import; newer `schemaVersion` is refused (`character-file.md` §6).
- **Storage full** — portrait that won't fit is kept in memory with a message; play continues. A refused save raises the standing storage alert, Edit doesn't claim "saved", and a refused import is undone and reported (`data-safety.spec.js`, "when storage refuses writes").
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
| **E2E** | **Playwright** (`@playwright/test`), every test in two projects: **chrome** (the installed Chrome, `channel: 'chrome'`) and **safari** (Playwright's WebKit) | Chrome and Safari are what players use. WebKit is the engine inside Safari and every iPhone browser — it is not the Safari app itself, so it catches engine bugs, not every Safari quirk; real-device QA still matters |
| **Accessibility** | Manual keyboard pass; **Open:** automated checks (e.g. axe-core via Playwright) | |
| **Visual** | Manual visual QA in the app. Playwright saves a screenshot of a **failed** test only — there are no screenshot baselines | Decided 2026-11-04: baselines would need re-approving on every deliberate look change; visual issues are noted by hand instead |
| **Error capture** | `tests/e2e/helpers/test.js` — every browser test fails on any uncaught exception or console error | Automatic, so no test can forget the check |
| **When it runs** | Locally, with `npm test`, before committing | Decided 2026-11-04: no pre-commit hook (would slow and block every commit) and no CI on push (would only report problems after they are pushed) |

**Decided 2026-10-05** (`architecture.md` Decision 10): Playwright is a **dev-only** dependency in `projectMeeple/package.json`. The app never loads it.

**Do not add `"type": "module"` to `package.json`.** Node would then treat `dice.js` and `mechanics.js` as ES modules and the converter and unit tests would break.

**Setup on a new machine:** Node 20+ and Google Chrome, then in `projectMeeple/`: `npm install` and `npx playwright install webkit` (a one-time ~80 MB download of the Safari engine; Chrome needs no download).

---

## 4. Test File Structure

```text
projectMeeple/
├── package.json             # dev-only scripts and devDependencies
├── playwright.config.js     # starts tests/serve.mjs; chrome + safari projects
└── tests/
    ├── serve.mjs            # tiny static server (Node's http, no dependency)
    ├── unit/                # node --test
    │   ├── dice.test.js       # 17 — arithmetic, limits, refusals, never eval
    │   ├── mechanics.test.js  # 56 — every rules-gaps §6 rule + §7 rulings
    │   ├── content.test.js    #  7 — the real compendium vs the guide
    │   └── library-check.test.js # 11 — the compendium/entry shape check
    ├── e2e/                 # Playwright — every test runs in Chrome AND Safari
    │   ├── helpers/test.js    # the `test` to import: fails on any page error
    │   ├── helpers/app.js     # openApp, press, seed storage, files, downloads
    │   ├── characterization.spec.js  # 2 — the whole sheet, step by step
    │   ├── characterization.spec.js-snapshots/   # the recorded baselines
    │   ├── smoke.spec.js      # 2 — Flows 1, 2
    │   ├── data-safety.spec.js # 9 — Flows 6, 7, 7b, 8, 11; storage refusing writes
    │   ├── compendium.spec.js # 6 — Flow 9; malformed compendiums; launch safety net
    │   ├── keyboard.spec.js   # 6 — Enter/Space on custom buttons, Shift+Enter holds
    │   ├── dialogs.spec.js    # 5 — dialog markup, focus in/kept/back, Escape
    │   ├── rules.spec.js      # 1 — Flow 10 (marked known bug, §10)
    │   └── security.spec.js   # 9 — Flow 12, CSP, size limit
    └── fixtures/
        ├── files/             # real exports + hostile/malformed files
        └── saves/             # raw saves seeded straight into storage
```

**Rules:**
- Unit tests are `<thing>.test.js`; browser tests are `<thing>.spec.js`.
- **Browser tests import from `./helpers/test`, never `@playwright/test` directly** — that import is what makes a JavaScript error fail the test. A test that deliberately causes a console error declares it narrowly with `test.use({ allowedErrors: [/…/] })` inside a `describe` (see the CSP test in `security.spec.js`).
- **Fixtures are real files** in the formats players actually exchange — they double as compatibility tests: once a character file is in `fixtures/files/`, every future version must still import it. **Never edit or delete one to make a test pass.**
- `elara.meeple.json`, `backup.meeple.json` and `compendium.library.json` were exported by the app itself. The hostile and malformed ones were made from `elara.meeple.json`; `malicious.meeple.json` puts script payloads in every player-authored string and in a restored content entry.
- Tests never touch a real player's storage — every browser test gets a fresh context.
- **Randomness is pinned.** Browser tests replace `Math.random` with a seeded generator (`openApp(page, { seed })`), so rolls are exact; unit tests pin dice faces directly.
- **`press(page, selector)`** clicks through the app's own handler regardless of visibility; use Playwright's `click()` when the test is about what a player can reach.

### Characterization tests

`characterization.spec.js` records **everything the sheet displays** after each step of a fixed session — effects, damage through the Wound cascade to Downed, healing, rests, ticks, every roll — for the seed character and for a multiclass fixture. They were recorded *before* the mechanics extraction and proved it changed nothing.

When a rules change is **deliberate**, the record will differ. Read the diff, confirm it's the change you meant, then re-record:

```bash
npx playwright test characterization --update-snapshots
```

**They run with reduced motion** (`test.use({ reducedMotion: 'reduce' })`), so the dice don't tumble. The tumble draws throwaway faces from `Math.random` on every animation frame, so on a busy machine the pinned sequence drifted and the rolls with it. The roll records were also being read mid-tumble. Re-recorded 2026-11-04 for this: every sheet step was identical, and only the roll windows changed, from throwaway faces to the real results.

**Never re-record to make an unexplained failure go away.** There is **one** record per snapshot, shared by both browsers and every OS (`snapshotPathTemplate` in `playwright.config.js`): the records are text, not images, so if Safari and Chrome ever disagree about what the sheet says, that's a bug to look at — never a reason to keep a second baseline.

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
**Expected:** results filter as you type; back returns to the Gear tab. **Known bug:** back currently lands on the Action tab (`prd.md` Feature 2, Known Gaps). `rules.spec.js` tests the full flow and is marked as an expected failure until that's fixed (§10).

### Flow 11 — Delete a character
**Steps:** Characters → edit → delete → confirm → reload.
**Expected:** the confirmation warns it's permanent; the character and portrait are gone and **stay gone after reload** (including the seed character).

### Flow 12 — Hostile files
**Steps:** import each file in `fixtures/` marked malicious or malformed.
**Expected:** no script runs; malformed and too-new files are refused with a message naming the problem; nothing already on the device changes.

---

## 6. Coverage

**Target:** practical, not a percentage. **Every critical flow in §5 has an E2E test**, and **every rule in `rules-gaps.md` §6 ("Verified as matching") has a unit test** — the second is met.

**Covered today:**

| Area | Where |
|---|---|
| Dice engine | `unit/dice.test.js` |
| Every rules-gaps §6 rule and §7 ruling | `unit/mechanics.test.js` |
| Compendium content vs the guide | `unit/content.test.js` |
| Compendium / library entry shape check | `unit/library-check.test.js` |
| Flow 9 (compendium Add/Replace/Restore), malformed compendiums, launch safety net | `e2e/compendium.spec.js` |
| Flows 1, 2 (first run, creation) | `e2e/smoke.spec.js` |
| Flows 3, 4, 5 (damage, rolls, effects) | `e2e/characterization.spec.js` (as recorded output, not readable assertions) |
| Flows 6, 7, 8, 11 (edit, export/import, backup, delete) | `e2e/data-safety.spec.js` |
| Storage refusing writes (alert, no false "saved", import undone) | `e2e/data-safety.spec.js` |
| Flow 12 (hostile files), CSP, import size limit | `e2e/security.spec.js` |
| Flow 10 (rules lookup) — written, marked known bug | `e2e/rules.spec.js`, §10 |
| No JavaScript errors during any browser test | `e2e/helpers/test.js` (every test, automatically) |
| Chrome and Safari (WebKit) | every browser test runs in both |
| Keyboard: custom buttons, the hold gestures, Wound pips | `e2e/keyboard.spec.js` (real key presses, never `press()`) |
| Modals as dialogs: semantics, focus in/kept/returned, Escape | `e2e/dialogs.spec.js` |
| **Not yet:** an automated accessibility scan (axe-core) | §9 |

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
| **Everything** | `npm test` | Works — unit, then browser |
| **Unit tests** | `npm run test:unit` | Works — 80 tests, under a second |
| **Browser tests** | `npm run test:e2e` (or `npx playwright test <file>`) | Works — 19 tests × 2 browsers, ~15 seconds; starts its own server |
| **One browser only** | `npm run test:chrome` / `npm run test:safari` | |
| **One browser test** | `npx playwright test security -g malicious` | |
| **A failed browser test** | `npm run test:report` | The last run's HTML report: each failure's error, a screenshot of the moment it failed, and the step-by-step replay. Kept in `playwright-report/` (git-ignored) |
| **Just the replay** | `npx playwright show-trace test-results/<test>/trace.zip` | |
| **Serve for tests** | `npm run serve` | `http://localhost:4173` |
| **Content check** | `node tools/csv-to-json.mjs` | Works today — exits with errors and writes nothing if the content is invalid |
| **Rules regenerate** | `node tools/rtf-to-rules.mjs` | Works today (Mac only — `architecture.md` §13) |
| **Lint** | — | **Open** — no linter (`code-style.md` §10) |
| **Build** | — | **None by design** — there is no build step |
| **Type check** | — | **Open** — no type checking (`code-style.md` §10) |

---

## 8. Definition of Done

A change is done when:

- [ ] **`npm test` passes.** A changed rule gets a unit test in `mechanics.test.js`; a changed flow gets a browser test.
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

1. ~~**Dice unit tests**~~ — done 2026-10-05.
2. ~~**Fixtures**~~ — done: real exports plus hostile and malformed files.
3. ~~**Playwright setup**~~ — done: dev-only `package.json`, `tests/serve.mjs`, helpers.
4. ~~**Characterization baseline**~~ — done, recorded before the extraction.
5. ~~**Extract the mechanics**~~ into `mechanics.js` — done; baselines unchanged.
6. ~~**Unit-test every rules-gaps §6 rule**~~ — done.
7. ~~**E2E for data safety and hostile files**~~ (Flows 6, 7, 8, 11, 12) — done, along with `security.md` Gaps 1–3.
8. ~~**Flow 9**~~ — done 2026-11-13: Add, Replace and Restore with real reloads, plus malformed compendiums and the launch safety net (`compendium.spec.js`).
9. **Open — readable play tests:** Flows 3, 4, 5 as plain assertions ("health reads 4 / 9"), so a failure names the rule rather than a snapshot diff.
10. **Open — extract save/load validation** (`applySave()`, file parsers) from `main.js` and unit-test the clamping in `database.md` A6.
11. ~~**Flow 10**~~ — test written 2026-11-04, marked as a known bug until the Rules back button is fixed (§10).
12. **Open — automated accessibility:** an axe-core pass. Keyboard operation of custom buttons and holds (`keyboard.spec.js`) and modal focus (`dialogs.spec.js`) are done, 2026-11-13.
13. ~~**Fail on any page error, Safari, failure reports**~~ — done 2026-11-04: `helpers/test.js`, the `safari` project, HTML report + failure screenshots.
14. ~~**Modals as dialogs**~~ — done 2026-11-13: dialog role and name, focus moved in on open, kept inside, returned on close (`dialogs.spec.js`).

---

## 10. Known bugs

A known bug that a test can show gets a test **marked as expected to fail**, rather than being left untested or skipped:

```js
test('…', async ({ page }) => {
  test.fail(true, 'Known bug — <doc and section>: <what is wrong>');
  …
});
```

- **While the bug exists**, the test fails as expected and the run stays green. The terminal shows it with a ✘ but counts it as passed; the HTML report lists it as an expected failure, with the reason.
- **When the bug is fixed**, the test passes, and Playwright reports *that* as a failure ("expected to fail, but passed"). That's the prompt to delete the `test.fail(…)` line so the test starts guarding the fix — and to remove the row below.
- Every marked test says in its header comment which doc records the bug. Rules that aren't built yet (`rules-gaps.md` §2–§4) are missing features, not bugs, and don't get marked tests.

| Bug | Recorded in | Test |
|---|---|---|
| Rules → back lands on the Action tab, not the tab the player came from | `prd.md` Feature 2, Known Gaps | `e2e/rules.spec.js` (Flow 10) |
