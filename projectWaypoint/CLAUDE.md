# Project Waypoint

Companion app for players/GMs of **Waypoint**, an in-progress tabletop RPG.
Framework-free web app (vanilla HTML/CSS/JS) — no build step, no dependencies.

**Previewing: serve the folder over `http://`** — in VS Code, right-click `index.html` → **Open with Live Server**. Opening the file directly no longer works: the screens are assembled from `pages/` with `fetch()`, which browsers block on `file://`. The app will tell you so on screen if you forget.

## Working style (how I want you to work)

- **Plan first, always.** Before writing code for anything non-trivial, describe the approach and wait for a thumbs-up. Small, obvious edits (typos, a token value, a one-line fix) don't need a plan.
- **Comment generously.** Explain *why*, not just *what* — especially for game rules, derived stats, and the dice parser. Future-me should be able to read a function and understand the design intent without reverse-engineering it.
- **When there's a tradeoff, prioritize in this order:**
  1. **Consistency** — match the existing patterns below even if a newer approach exists.
  2. **Accessibility** — semantic HTML, keyboard operability, ARIA only where semantics fall short.
  3. **Performance** — efficient DOM/render work where it actually matters.

## Architecture — separation of function and design

The app deliberately keeps behavior, structure, and appearance apart. Preserve this:
- **`index.html`** — the shell, and nothing else: the device frame, the `.app` state root, the script tags. ~60 lines. No screen markup lives here.
- **`pages/`** — one HTML fragment per screen (`home`, `characters`, `sheet`, `edit`, `rules`, `settings`, `create`, `menu`), plus `pages/modals/` grouped by owner (`dice`, `inventory`, `character`). Structure + hooks only: semantic classes and `data-*` state attributes, **never** inline styles.
- **`resources/js/boot.js`** — fetches every fragment in `pages/`, injects them into `.app` in a fixed order, then resolves `window.WAYPOINT_READY`. Adding a screen means adding a file and one entry in its `PAGES` array.
- **`resources/css/style.css`** — an index of `@import`s and nothing else. The import order IS the cascade; it follows the original §1–§25 numbering deliberately.
- **`resources/css/tokens.css`** — ALL design tokens. To re-skin, edit here — never hardcode colors/sizes elsewhere. The remaining CSS files are one per screen, mirroring `pages/`.
- **`resources/js/frame.js`** — the phone-frame/full-window toggle. Shell chrome only; it sets `data-frame` on the root element and touches nothing inside `.app`.
- **`resources/js/main.js`** — behavior only: a `character` data model, transient `state`, game `rules`, class-only render, and one delegated click handler. Persists health/mana/wounds/notes to localStorage.
- **`resources/images/`** — portrait assets (currently a CSS pattern placeholder).
- **`design/`** — archived Claude design-doc prototypes. Ideation source of truth for the look (direction **1a "Field Journal"**). Reference, don't ship from.

### Non-negotiable conventions

- **JS emits class names and toggles `data-*`; CSS decides all visuals.** Never reintroduce inline styles.
- Views/tabs/modals switch via `data-view` / `data-tab` / `data-modal` on `.app`.
- **One dice engine.** All rolls (calculator, quick to-hit/damage) go through `evaluateDice()`. Don't write a second implementation.
- **Never use `eval()`.** Dice expressions are parsed by the hand-written recursive-descent parser. Keep the limits (1–100 dice, 2–1000 sides, `floor()` the total).
- **Derive, don't store, computed stats.** Game rules live as named constants (e.g. `PRECISION_TO_HIT`). Change the rule in one place and every readout follows.
- **No selector is defined in two CSS files.** That invariant is what makes the `@import` order in `style.css` safe to reason about. To change a primitive from a screen file, override it with a more specific selector — never copy the rule.
- **`init()` waits on `WAYPOINT_READY`, not `DOMContentLoaded`.** The screens are fetched, so they land well after that event. Anything that needs the full DOM must wait on the same promise.

## Design language

Direction **1a "Field Journal"**: warm parchment, MedievalSharp / Marcellus / Spectral fonts, rust `#b5623a` + oxblood `#742230` accents, Latin flavor. Keep new UI consistent with it.
