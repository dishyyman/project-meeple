# Code review brief: Game Master Tools, Monster Compendium, going back

**For:** Codex, reviewing on behalf of the project owner
**Prepared:** 2026-11-14
**Range:** `51819b9..b9bae9e` on `main` (10 commits, already pushed and live on GitHub Pages)
**Deliverable:** a findings report. Do not change code, commit or push.

---

## 1. What you're reviewing

Meeple is a companion web app for a tabletop RPG in development. It's plain HTML, CSS and JavaScript with no build step and no runtime dependencies, served as static files on GitHub Pages and installable to a phone's home screen. Everything is stored on the device in `localStorage`; there is no server.

These commits add **Game Master Tools**: a GM keeps campaigns made of party heroes, enemy stat cards and a fight in progress. They also add a device-wide **Monster Compendium**, and **going back** by swipe, the phone's own back gesture or the browser's Back. Two UI changes in the first commit of the range are also included: a portrait-upload fix and a popup redesign.

| Commit | What it does |
|---|---|
| `73f8265` | Portrait upload works from the sheet. Popups are now three shapes: sheet, alert, notice |
| `9fcb2d4` | Phase 0: game rules split into a hero **card** (build numbers) and **vitals** (state). `campaign.js` added |
| `186241e` | Phase 1: campaign list and campaign screen |
| `fcbedb5` | Phase 2: Party tab. Heroes are imported from a player's character file or typed in |
| `767c5f3` | Phase 3: enemy stat cards, monster files, campaigns in backups |
| `0e79ec9` | Phase 4: Combat tab (pick who acts next, rounds, Armor, down enemies, per-enemy ✎) |
| `a28a0f0` | Monster Compendium (stock goblins, tap to add a copy, New Enemy saves to both) |
| `8b15f22` | Swipe back, history-based back, and the Rules-back fix |
| `b9bae9e` | Swipe listeners attached only on a home-screen install |

`git diff --stat 51819b9..b9bae9e` shows 55 files changed, +7,666 / −719. Most of the change is in `resources/js/main.js` (+2,460), `resources/js/campaign.js` (new, 693 lines) and `resources/js/mechanics.js` (+461 / −).

## 2. Setup and baseline

```sh
npm install
npx playwright install webkit
npm test          # unit tests (node --test), then Playwright in Chrome, Safari/WebKit and an iPhone profile
```

Baseline at `b9bae9e`: **172 unit tests pass; 276 browser tests pass, 36 skipped, 0 failing.** The skips are Chrome-only tests (axe scans and touch swipes) when run in Safari, plus project filters. If your run differs, report that first, with the output.

To try the app, serve the folder over `http://` with the test server, `node tests/serve.mjs 8080`, then open `http://localhost:8080/index.html`. Opening it from `file://` won't work, because the screens are fetched.

## 3. Project rules the code must follow

These come from `CLAUDE.md` and the docs. A change that breaks one is a finding even if it works.

1. **Separation.** `pages/*.html` is structure and hooks only. CSS decides every visual. JavaScript toggles classes and `data-*` attributes. **No inline styles**, including in JS template strings. Live values are CSS custom properties set with `style.setProperty('--x', …)`; the list drag, portrait crop and swipe all do this.
2. **Strict CSP** (`index.html`): no inline `<script>`, no inline handlers, no `eval()`, no `style="…"`.
3. **One mechanics engine.** Game arithmetic lives in `resources/js/mechanics.js`, is pure, and is unit-tested. `main.js` must not do rules math. `campaign.js` is pure as well (data, normalizer, turn tracking).
4. **One dice engine** (`evaluateDice()` / `validateDice()` in `dice.js`). Never a second parser.
5. **Untrusted input** (storage, files) enters through one normalizer: `normalizeCampaign()`, `normalizeEnemy()`, `normalizeMonsters()`, `readBestiary()`, `applySave()`. Every string written into markup goes through `esc()`. Ids that reach selectors or `data-*` must match `SAFE_ID`.
6. **No CSS selector is defined in two files.** Sizes come from `--space-*` / `--fs-*` tokens, and colours from `tokens.css`.
7. **Feedback** uses `.status--error/warn/ok` (a glyph plus words, never colour alone) or `showToast()`.
8. **Priorities when they conflict:** consistency with existing patterns, then accessibility, then performance.
9. **Back** means pressing the screen's `data-back` button. Swipe, history and the phone's back all press it (`docs/architecture.md` Decision 13).

Further reading: `docs/architecture.md` (Decisions 12 and 13), `docs/database.md` (A3b storage shapes), `docs/bestiary-file.md`, `docs/character-file.md` §4b and §6a, `docs/design-system.md` §11–12, `docs/testing.md`.

## 4. Where things are

Line numbers drift, so search for the function name.

| Area | Location |
|---|---|
| Card/vitals split, `damageAfterArmor`, enemy "downed" with no Wounds | `mechanics.js`: `heroCard`, the `V` (vitals) block, `V.isDowned`, `V.damage` |
| Campaign data, normalizers, turn tracking, Monster Compendium | `campaign.js`: `normalizeCampaign`, `normalizeCombat`, `campaignIds`, `startCombat` … `nextRound`, `memberIn`, `settleCombat`, `freshEnemy`, `STOCK_MONSTERS`, `normalizeMonsters`, `readBestiary` |
| Campaign storage | `main.js`: `loadCampaigns`, `saveCampaign`, `heldCampaigns`, `settleStorage`, `retryHeld` |
| Party: heroes from files | `main.js`: `heroFromSource`, `withBorrowedEntries`, `unmergeEntries`, `importHeroes` |
| Calculator and effects aimed at a hero or an enemy | `main.js`: `subjectFor`, `openSubjectCalc`, `applyHeroCalc`, `addHeroEffect`, `paintCalcPierce`, `paintCalcPoison` |
| Enemies, compendium | `main.js`: `saveEnemyForm`, `renderMonsterPicker`, `addMonster`, `removeMonster`, `saveMonsters`, `importMonsters` |
| Combat | `main.js`: `fighterHtml`, `fighterOut`, `renderCombat`, `pickFighter`, `endFighterTurn`, `startNextRound`, `openCombatStart`, `startCombatFromDraft`, `endCombat`, `openMemberMenu`, `memberAct`, `focusCombat` |
| Backups | `main.js`: `exportBackup`, `parseCharacterFile`, `askCharacterImport`, `importBackup`, `importBackupCampaigns`, `importBackupMonsters` |
| Going back | `main.js`, section `BACK`: `backButton`, `backTarget`, `goBack`, `rememberRulesFrom`, `syncHistory`, `wireHistory`, `wireSwipe`, `releaseSwipe`. CSS: `frame.css`, "swiping back". The `data-nav` handler in `wire()` (the `returning` logic) |
| Markup | `pages/campaign.html`, `pages/campaigns.html`, `pages/modals/campaign.html`, and the `data-back` markers on every screen |

## 5. What to look at, most important first

For each area there are specific questions. Answer them, but don't stop there.

### A. Untrusted input and security
- Every new template string in `main.js`: is each interpolated value either escaped with `esc()` or a number or constant we produce? Look closely at `fighterHtml`, `vitalParts`, `renderMonsterPicker`, `renderCombatStart`, `enemyAttackRow`, `heroCardHtml`, and the `aria-label` attributes.
- `normalizeCombat`, `normalizeMonsters`, `readBestiary`, and the campaigns and bestiary arrays in backups: can a hand-edited save or a hostile file get an unchecked id into a selector (`$(`[data-…="${id}"]`)`), an unbounded array, a non-finite number, or a prototype key through?
- `heroFromSource` temporarily swaps the global `character` and borrows library entries. If `applySave` or `heroCard` throws, is the open character restored, and are the borrowed entries removed? Could they ever end up in the GM's own compendium?

### B. Data integrity and storage
- Storage failure: `saveCampaign` holds refused writes; `saveMonsters` only sets a flag. Is anything lost or reported wrongly when the quota is full? `importBackupMonsters` rolls back on failure. Is the rollback correct?
- Restoring backups: campaigns use overwrite-by-id or add-as-copy; monsters are matched by id (overwrite replaces, add skips). Check edge cases: duplicate ids within one file, a stock id in a file, the `LIMITS.ENEMIES` cap.
- `settleCombat` after removing a hero, editing a stat card or deleting a stat card: any path that leaves a fight pointing at something that no longer exists, or skips the re-normalize?
- Undo on `removeMonster` re-inserts at the old index. Does it still behave if the list changed in the meantime?

### C. Game-rule correctness
- `damageAfterArmor(hit, armor, piercing)`: never below 0, and negative Armor adds damage. Do all callers pass the target's current Armor, including downed enemies (`DOWNED_ARMOR`)?
- An enemy with no Wounds is downed at 0 HP. `V.damage` records `wasDowned` before the bar moves. Check the toast and announcement paths for a single-bar enemy healed back up and then hit again.
- Enemy healing is deliberately manual: no Poison penalty, and it works while downed. Confirm `applyHeroCalc` applies Poison only to heroes.
- Enemy rolls crit on a natural 20 only, never on the open character's Lethality. See `rollIsCrit`, `paintCrit`, and `data-roll-source="enemy"` through Advantage and roll-again.
- Do the hero card numbers from `heroCard()` match the player's own sheet for every class? `mechanics.test.js` has equivalence tests; look for gaps.

### D. The combat state machine
- `current` points at a fighter who is then downed, removed or deleted. What does `renderCombat` show? Can End Turn misbehave?
- `roundOver(combat, isOut)` with everyone down, every enemy down, or no enemies at all. Can the GM get stuck with no button to press?
- A stat card's `turns` is copied into the fight at start, so editing it mid-fight doesn't change the fight. Is that a bug or acceptable? Give an opinion.
- Numbering: "Goblin 1, Goblin 2" (`memberName`) when groups and lone fighters of the same card are mixed.
- `focusCombat` defers focus with `setTimeout(0)` to get past `inert`. Is there a race with `watchModals()`'s own focus return?

### E. Going back (newest code, least proven on real devices)
- History guard: `syncHistory` pushes one entry while off Home, and spends it with `history.back()` plus a `skip` counter when Home is reached by a button. Look for races: navigating again before the deferred `popstate` arrives, a reload while sitting on a guard, a double back. Can the counter or `guarded` flag drift so a real back is swallowed, or a back leaves the app early?
- `popstate` while a popup is open closes the popup and lays a new guard. Is focus handled? Is any modal unsafe to close this way (a form part-filled; the dice roller mid-tumble)?
- Swipe: the touch listeners are attached only when `navigator.standalone === true`. Check the velocity maths, the 260 ms settle timeout against the CSS transition, and what happens if something changes during the settle (a toast action, a modal, a second touch). Check whether it can conflict with the sheet hero's vertical pull (`pull`, `resetPull`) or with the list drag (`state.drag`).
- `rememberRulesFrom` rewrites the Rules back button's `data-nav` and label. Does the modal focus-return in `hookSelector` / `onModalChange` still find the right element? Does the `returning` logic in the `data-nav` handler ever keep a stale tab or a stale Edit draft when it should reset?
- Edit Character: swiping away discards unsaved edits, exactly as the back button does. This is intended; flag it only if you think it is wrong.

### F. Accessibility
- New dialogs (`combat-start`, `combat-end`, `member-menu`, `monsters`): role, name, focus in and out, and Escape behaviour (it closes sheets and alerts, but not forms).
- Down fighters are greyed. Is the "Down" / "Downed" state also given in words to screen readers on every card? Do contrast levels still pass?
- Touch targets: the ✎ and trash buttons use the existing 30px `.icon-act`. Is that acceptable next to WCAG 2.5.8?
- The swipe has no keyboard equivalent, but the visible back button is one. Confirm nothing is reachable only by swipe.

### G. CSS and structure
- Any selector now defined in two files? Any raw px or colour that should be a token? Any inline style?
- `frame.css` "swiping back" makes two screens `position: absolute` during a swipe. Look for layout jumps in the screens laid out as blocks (Home, Characters, Campaigns), and for lost scroll positions.

### H. Tests
- Are the tests testing behaviour, or just the implementation? Point out important paths with no test. Likely gaps: storage failure for monsters, the history races above, a mid-fight edit of a stat card's turns, and backups with duplicate ids.
- The swipe tests drive touch through the Chrome DevTools protocol and stub `navigator.standalone`. They can't prove real iOS behaviour. Suggest what a manual check on a device should cover.

## 6. Known limitations (don't report these as bugs)

- A hero or enemy can't be added to a fight already in progress (the GM ends it and starts again).
- Patches and effect tick buttons aren't on GM cards; the GM enters a Bleed tick as damage.
- The three stock goblins are placeholders written into `campaign.js` until the game ships real monster content.
- No accounts or live sync. The data shapes are built for it (`architecture.md` Decision 12), but there is no network code, and the CSP forbids it.
- The app's own swipe only exists on an iPhone home-screen install. Everywhere else the phone's own back gesture is used, through history.
- `main.js` is one large file in a single closure. That is a known structural debt, so don't report it as a finding unless it causes a specific defect.
- Some names predate enemies and now cover both heroes and enemies (`applyHeroCalc`, `addHeroEffect`). Report naming only if it hides a bug.

## 7. How to report

One entry per finding, **most severe first**:

```
[severity] short title
  where:     path:line (function)
  what:      one sentence
  scenario:  concrete steps or input → the wrong result
  evidence:  the code path, a failing test you wrote locally, or a repro
  fix:       the smallest change that would correct it (described, not applied)
```

Severity levels:
- **critical**: data loss, script injection, or the app unusable.
- **high**: a wrong game result, or a broken flow with no workaround.
- **medium**: a broken edge case, or a rule from §3 broken.
- **low**: polish or clarity.

Then add a short section listing **what you checked and found sound**, so the owner knows what was covered. Keep "might be" findings separate from confirmed ones; a likely finding needs a scenario too. If you write a test to confirm something, include it in the report rather than committing it.
