# Code Style & Conventions — Waypoint Companion App

> **What this doc is for:** keeping all code — human- or AI-written — consistent across the project. When in doubt, **match the code around you**; this doc writes down what that code already does.
>
> **Priority when rules pull against each other** (from `CLAUDE.md`): **1. Consistency** with existing patterns → **2. Accessibility** → **3. Performance**.
>
> **How to extend this doc:** when a new pattern is agreed, add it to the relevant section *and* log it in §15 with the date. When an existing pattern changes, update the section and note the old way in §15 so older code isn't mistaken for a mistake.
>
> **Related docs:** `CLAUDE.md` (working style, non-negotiables) · [`architecture.md`](architecture.md) (structure and why) · [`design-system.md`](design-system.md) (tokens, components) · [`database.md`](database.md) (data naming) · [`security.md`](security.md) (escaping and input rules)

---

## 1. General Principles

- **Prefer readable code.** No framework, no build step — the source *is* what runs, so it must read well as-is.
- **Keep functions focused.** One logical job per function.
- **Avoid unnecessary abstractions.** Add a helper when a second caller needs it, not before.
- **Reuse existing components and utilities** (§5, §6) before writing new ones.
- **Prefer consistency over novelty** — match existing patterns even where a newer approach exists.
- **Plan first** for anything non-trivial: describe the approach and get a thumbs-up before writing code. Small, obvious edits don't need a plan.
- **Separate structure, appearance, and behavior** (§3). This is the project's core rule.
- **Derive, don't store.** Computed numbers are calculated from the model every time; only what a player spends or chooses is saved.

---

## 2. Naming

| Thing | Convention | Examples |
|---|---|---|
| **Components (CSS)** | BEM-style: `block`, `block__element`, `block--modifier` — lowercase, hyphenated | `.collapse`, `.collapse__title`, `.collapse--light`, `.btn-save--danger` |
| **State classes** | `is-<state>`, toggled by JS | `.is-open`, `.is-on`, `.is-settled` |
| **State attributes** | `data-<thing>` on an element, or on `.app` for app-wide state | `data-view`, `data-tab`, `data-modal`, `data-state="over"`, `data-chosen` |
| **JS hooks (HTML)** | `data-*` attributes, never classes. Values in camelCase for bind/list names, kebab-case for actions | `data-bind="accountName"`, `data-list="roster"`, `data-action="create-character"`, `data-nav="sheet"` |
| **Functions** | camelCase, verb first | `saveIdentity()`, `renderSettings()`, `exportCharacter()`, `showToast()` |
| **Render functions** | `render<Thing>()` — paints one region | `renderRules()`, `renderAppearance()` |
| **Variables** | camelCase | `character`, `roster`, `toastTimer` |
| **Constants** | `UPPER_SNAKE_CASE` for fixed rules, limits, keys, and lists | `PRECISION_TO_HIT`, `SKILL_POINTS_AT_CREATION`, `ROSTER_KEY`, `TOAST_MS`, `ATTRIBUTES` |
| **Design tokens** | `--<group>-<name>`, lowercase, hyphenated | `--ink-muted`, `--accent-bright`, `--fs-body`, `--space-3-5` |
| **Files** | lowercase, hyphenated; one per screen, named after it | `sheet.html` ↔ `sheet.css`; `csv-to-json.mjs` |
| **Docs** | lowercase, hyphenated `.md` in `docs/` | `design-system.md`, `rules-gaps.md` |
| **Storage keys** | `waypoint.` + dotted lowercase path | `waypoint.character.<id>.portrait` |
| **Content ids** | `<collection>.<slug>` | `subclass.hunter`, `gear.crowbar` |
| **Data fields** | camelCase in the app and files; `snake_case` in any future database (`database.md` B2) | `armorWorn` / `armor_worn` |
| **API routes** | **Open** — no API yet. Propose with the backend design. | |

**Game-rule names match the Player's Guide.** If the guide says "Lethality", the code says `lethality` — never a synonym.

---

## 3. Folder Structure

```text
projectWaypoint/
├── index.html          # shell ONLY — frame, .app root, script tags
├── pages/              # one HTML fragment per screen; pages/modals/ grouped by owner
├── resources/
│   ├── css/            # style.css (import index), tokens.css, one file per screen
│   ├── js/             # boot, frame, engines (dice, portrait), generated content, main.js
│   └── images/
├── tools/              # content converters + their inputs/outputs
├── docs/               # project documentation
└── design/             # archived prototypes — reference only, never shipped
```

**Rules:**
- **Each layer has one home.** Structure → `pages/`. Appearance → `resources/css/`. Behavior → `resources/js/`. Never mix them.
- **A screen is a pair:** `pages/<screen>.html` + `resources/css/<screen>.css`, registered in `boot.js` (`PAGES`) and `style.css` (`@import`). A modal goes in `pages/modals/<owner>.html`.
- **Shared visual primitives** live in `primitives.css`; **all design values** in `tokens.css`.
- **Generated files** (`library.js`, `rules.js`, `tools/out/`) are never edited by hand — edit the source and rerun the converter.
- **New top-level folders** need a reason recorded in `architecture.md`.

---

## 4. Imports & Loading

There are no JS imports — every script is a classic `<script>` in `index.html`.

- **Load order matters and is deliberate:** `frame.js` (head) → `boot.js` → `dice.js` → `portrait.js` → `library.js` → `rules.js` → `main.js`.
- **Shared engines expose one global** (`WAYPOINT_DICE`, `WAYPOINT_PORTRAIT`; generated content as `WAYPOINT_LIBRARY`, `WAYPOINT_RULES`) and nothing else. `dice.js` also exports for Node so the converter uses the same parser.
- **`main.js` is one IIFE** with `'use strict'`; nothing inside leaks to `window`.
- **`init()` waits on `window.WAYPOINT_READY`**, never `DOMContentLoaded`.
- **CSS:** `style.css` contains only `@import`s. **The import order is the cascade** — new screen files are appended in the order the app presents them.
- **No runtime dependencies.** Fonts from Google are the only third-party request (`security.md` Gap 4). Adding a library needs a decision in `architecture.md` §9.
- **Open:** whether to move to ES modules (`architecture.md` §13).

---

## 5. Components

Components should:
- **Have a single responsibility.**
- **Reuse existing patterns** — check this list before building a new one.
- **Avoid duplication** — **no selector is defined in two CSS files.** To vary a shared component on one screen, override it with a more specific selector in that screen's file.

**HTML rules:**
- **Semantic elements first:** a thing you press is a `<button>`, not a `<div>`. ARIA only where HTML semantics fall short.
- **One-of-many choices** are pressed buttons with `aria-pressed`, app-wide.
- **Icon-only buttons** carry an `aria-label`; their SVG carries `aria-hidden="true"`.
- **Never inline styles.** Never inline event handlers or `<script>`.
- **Comment the markup** where a choice isn't obvious (why a button and not a link, why a live region is always present).

**CSS rules:**
- **Every value from a token:** colors (`--ink-*`, `--accent*`…), font sizes (`--fs-*`), spacing (`--space-*`), radii (`--r-*`), shadows. Raw px only for the exceptions in `design-system.md` §6.1.
- **Visibility is CSS's job:** JS sets `data-*` or `is-*`; CSS decides what shows.
- **`[hidden]` must still win** — a component that sets `display` needs a `.thing[hidden] { display: none; }` rule.
- **Respect `prefers-reduced-motion`** for any animation.

**Reusable patterns to reach for** (`design-system.md` has details):

| Need | Use |
|---|---|
| Section heading | `.rule` + `.rule__label` (✦ Section ✦) |
| Expandable row | `.collapse` + `data-toggle` |
| Primary / secondary / destructive button | `.btn-save` / `.btn-ghost` / `.btn-save--danger` |
| "Add" button under a list | `.btn-dashed` |
| Header icon button | `.icon-btn` |
| Labeled number | `.mini` + `.val-box` |
| Form field | `.field__label` + `.field__input` / `.field__area` |
| Inline error / warning / success | `.status` + `.status--error` / `--warn` / `--ok` |
| Confirmation after an action | `showToast()` |
| Nothing here yet | `.empty-note` |
| Screen-reader-only text | `.visually-hidden` |
| Dialog | `.modal` + `.modal__card`, opened via `data-modal` |

---

## 6. Functions

Functions should:
- **Do one logical thing**, with a name that says what.
- **Avoid unnecessary complexity** — a flat early-return beats nested conditionals.

**Project patterns:**
- **Layers stay apart in `main.js`:** model → derived stats → rules (no DOM) → render (no game logic) → wiring. A rules function takes and changes data; a render function paints it.
- **Function declarations** for named operations (`function saveNote()`); **arrow functions** for small helpers and callbacks (`const heldLabel = (h) => …`).
- **One delegated click handler** (`wire()`). A new control gets a `data-*` hook, is added to the handler's selector list, and gets a branch — never its own `addEventListener`, unless it needs pointer or keyboard events the click handler can't express.
- **Markup builders return strings** of class-only HTML; every piece of data in them goes through **`esc()`**, and attribute values are **always double-quoted** (`security.md` §5).
- **Use the existing utilities:**

| Utility | Does |
|---|---|
| `$(sel, root)` / `$$(sel, root)` | `querySelector` / `querySelectorAll` as an array |
| `esc(s)` | Escape text for HTML |
| `setText(bind, value)` | Fill every `[data-bind="…"]` with text |
| `evaluateDice(expr)` | The one dice engine |
| `WAYPOINT_PORTRAIT.compress(file)` | The one image pipeline |
| `save()` / `saveRoster()` | Persist the open character / the roster |
| `closeModal()` | Close whatever modal is open |
| `showToast(text, variant)` | Transient confirmation |
| `byLibraryId(id)` | Look up any content entry |

- **Game rules are named constants**, defined once (`PRECISION_TO_HIT`). Change the rule in one place and every readout follows.
- **Data-driven over hard-coded.** Lists that might grow (`ATTRIBUTES`, `BIO_FIELDS`, `COST_KEYS`, `APPEARANCE_THEMES`) are arrays the UI and loader both read, so adding one is a one-line change.

---

## 7. Error Handling

**Use:**
- **`try/catch` around every storage read and write**, with a comment saying what happens on failure. The pattern: play continues in memory.
  ```js
  try { localStorage.setItem(KEY, value); }
  catch (_) { /* storage unavailable — play continues in-memory */ }
  ```
- **Check, don't trust** anything from storage or a file: validate shape and type, clamp numbers, drop unknown fields, fall back to a safe default (`database.md` A6).
- **Player-facing messages in plain language**, saying what happened and what to do: *"That image is larger than 25 MB — try a smaller one."* Thrown errors meant for players are written to be shown verbatim.
- **Errors go where the player is looking:** an error status line under the field, a result window for imports, the boot-error screen if the app can't start.
- **Report, don't block, where the rules allow it** — over-spending a budget is a warning, not a locked button.

**Do not:**
- Let a corrupt value crash the app on load.
- Swallow an error silently when the player needs to know (a portrait that won't persist must say so).
- Show raw error messages, stack traces, or technical detail to players.
- Use `alert()` / `confirm()` — use the app's modals.

---

## 8. Comments

**Comment generously — explain *why*, not *what*.** This is a standing project preference: future-you should understand the design intent of a function without reverse-engineering it.

Comments should explain:
- **Why something exists**, and why it's built this way.
- **Important tradeoffs** and alternatives that were rejected.
- **Non-obvious behavior** — especially game rules, derived stats, the dice parser, and anything that depends on load or cascade order.
- **Links to the source of a rule:** `rules-gaps.md §2.9`, `library-schema.md §4.5`, `design-system.md §6.1`.

**Formats:**
- **File header:** a banner stating what the file is and owns.
- **Section banner** in `main.js` and CSS files:
  ```js
  /* ------------------------------------------------------------------ */
  /* SECTION NAME — one-line purpose                                    */
  /* ------------------------------------------------------------------ */
  ```
- **Numbered sections in CSS** follow the `§` numbering from `style.css`.

Avoid comments that repeat the code. **Update comments when the code changes** — a stale "why" is worse than none.

---

## 9. Logging

**Use:** the browser `console`, sparingly. No logging library; nothing is sent anywhere.

**Rules:**
- **`console.error`** only when the app can't do its job — a generated file failed to load, boot failed. Say how to fix it: *"library.js did not load — run `node tools/csv-to-json.mjs`."*
- **`console.warn`** for bad data that was handled (an unparseable roll expression).
- **`console.info`** for developer notices (an action that isn't implemented yet).
- **Prefix with `[waypoint]`.** (A few older messages use `Waypoint:` — use the bracket form for new ones.)
- **Never log** character data, notes, portraits, or anything from `security.md` §7's never-log list.
- **Tools** (converters) log progress and warnings to the terminal freely.

---

## 10. Formatting

| | |
|---|---|
| **Formatter** | None configured. Format by hand to match the surrounding code. **Open** — a formatter would need a config that preserves aligned columns. |
| **Linter** | None. **Open.** |
| **Type checking** | None. Shapes are documented in comments and enforced by the loaders. **Open** — JSDoc types are an option that needs no build step. |

**House style (as written):**
- **2-space indentation**, semicolons, **single quotes** in JS; template literals for markup and interpolation.
- **Double quotes** for HTML attributes, always.
- **`const` by default**; `let` only when the value is reassigned. No `var`.
- **Aligned columns are welcome** where they make a table of values readable (constants, token lists, `if` ladders in the click handler).
- **Line length:** keep it readable (~100 characters); comments wrap around 75–80.
- **CSS:** one rule per line is fine for short rules; multi-line for anything with more than a few declarations.

---

## 11. Do

- Reuse existing patterns, components, and utilities.
- Keep changes focused on the task.
- Follow project conventions — including the ones in `CLAUDE.md`.
- Remove dead code (it stays in git history).
- Keep docs current: tick `rules-gaps.md` when a rule ships; update `design-system.md` for visual changes; log decisions in `architecture.md`.
- Test in the browser over `http://` (Live Server) before calling something done.
- Check contrast (WCAG AA) for any new color pair, and keyboard access for any new control.

---

## 12. Don't

- Create duplicate utilities — especially a second dice parser or image pipeline.
- Introduce dependencies without a recorded decision.
- Ignore the existing architecture (layers, one click handler, `data-*` state).
- Change unrelated files.
- Hand-edit generated files.
- Use inline styles, `eval()`, `new Function()`, or inline event handlers.
- Hard-code colors, sizes, or spacing outside `tokens.css`.
- Store a value that can be derived.
- Define a CSS selector in a second file.

---

## 13. Recipes — adding common things

| To add… | Do this |
|---|---|
| **A screen** | `pages/<name>.html` (markup + hooks) → `resources/css/<name>.css` → add to `PAGES` in `boot.js` → `@import` in `style.css` (next `§` number) → navigation via `data-nav="<name>"` and, if it needs painting on entry, a branch in the `data-nav` handler |
| **A modal** | Markup in `pages/modals/<owner>.html` with `.modal.modal--<name>` → a `.app[data-modal="<name>"] .modal--<name> { display: flex; }` rule → open by setting `data-modal`, close with `closeModal()` |
| **A control** | Button with a `data-<action>` hook → add the hook to `wire()`'s selector list → add a branch that calls a named function |
| **A design value** | Token in `tokens.css` with a comment on its job → use it → document in `design-system.md` |
| **A game rule** | Named constant → a rules function (no DOM) → readouts derive from it → record in `rules-gaps.md` if it reconciles the guide |
| **A saved field** | Add to `save()` → validate and clamp it in `applySave()` → add to the character file docs (`character-file.md` §3; optional fields don't bump `schemaVersion`) → `database.md` A3 |
| **A storage key** | `waypoint.<dotted.path>` → wrap reads/writes in `try/catch` → list it in `architecture.md` §4 and `database.md` A2 |
| **A content field** | Column in the Google Sheet → `library-schema.md` → rerun `node tools/csv-to-json.mjs` |
| **Feedback** | Inline: `.status` variant. After an action with no visible result: `showToast()` |

---

## 14. Git

- **Commit messages:** short summary of what changed and where, present or past tense, as in the existing history. **Open** — whether to adopt a stricter format.
- **Branches:** **Open** — work currently lands on `main`.
- Don't commit `.DS_Store` or other OS files — the repo-root `.gitignore` excludes them, along with `node_modules/` and `.env` files.

---

## 15. Conventions Log

New or changed conventions, newest first. Add a row whenever this doc changes.

| Date | Convention | Notes |
|---|---|---|
| 2026-10-05 | `.gitignore` added at repo root | `.DS_Store` files untracked (they stay on disk) |
| 2026-10-05 | Type and spacing scales (`--fs-*`, `--space-*`) are mandatory | Older raw px values were migrated; `frame.css` device chrome is exempt |
| 2026-10-05 | Feedback uses `.status` variants and `showToast()` | Replaced one-off warning styles (`.confirm__text--warn`, `.import__note--warn`) |
| 2026-10-05 | Focus uses `--focus` / `--focus-ring`; disabled uses `--disabled-opacity` | Anything that sets `outline: none` must draw its own focus |
| 2026-10-05 | Red text on the page uses `--danger-bright`; `--damage` / `--heal` are fills only | Contrast fix |
| 2026-10-05 | Theme name is "Field Journal" | Previously "Ember Journal" in comments |
| 2026-10-05 | Console messages prefixed `[waypoint]` | Older messages use `Waypoint:` |
