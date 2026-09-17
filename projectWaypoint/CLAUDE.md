# Project Waypoint

Companion app for players/GMs of **Waypoint**, an in-progress tabletop RPG.
Framework-free web app (vanilla HTML/CSS/JS). Open `index.html` in a browser to preview — no build step.

## Working style (how I want you to work)

- **Plan first, always.** Before writing code for anything non-trivial, describe the approach and wait for a thumbs-up. Small, obvious edits (typos, a token value, a one-line fix) don't need a plan.
- **Comment generously.** Explain *why*, not just *what* — especially for game rules, derived stats, and the dice parser. Future-me should be able to read a function and understand the design intent without reverse-engineering it.
- **When there's a tradeoff, prioritize in this order:**
  1. **Consistency** — match the existing patterns below even if a newer approach exists.
  2. **Accessibility** — semantic HTML, keyboard operability, ARIA only where semantics fall short.
  3. **Performance** — efficient DOM/render work where it actually matters.

## Architecture — separation of function and design

The app deliberately keeps behavior, structure, and appearance apart. Preserve this:

- **`index.html`** — structure + hooks only. Semantic classes and `data-*` state attributes. **Never** inline styles.
- **`resources/css/style.css`** — ALL appearance, driven by design tokens in `:root`. To re-skin, edit tokens — don't hardcode colors/sizes elsewhere.
- **`resources/js/main.js`** — behavior only: a `character` data model, transient `state`, game `rules`, class-only render, and one delegated click handler. Persists health/mana/wounds/notes to localStorage.
- **`resources/images/`** — portrait assets (currently a CSS pattern placeholder).
- **`design/`** — archived Claude design-doc prototypes. Ideation source of truth for the look (direction **1a "Field Journal"**). Reference, don't ship from.

### Non-negotiable conventions

- **JS emits class names and toggles `data-*`; CSS decides all visuals.** Never reintroduce inline styles.
- Views/tabs/modals switch via `data-view` / `data-tab` / `data-modal` on `.app`.
- **One dice engine.** All rolls (calculator, quick to-hit/damage) go through `evaluateDice()`. Don't write a second implementation.
- **Never use `eval()`.** Dice expressions are parsed by the hand-written recursive-descent parser. Keep the limits (1–100 dice, 2–1000 sides, `floor()` the total).
- **Derive, don't store, computed stats.** Game rules live as named constants (e.g. `PRECISION_TO_HIT`). Change the rule in one place and every readout follows.

## Design language

Direction **1a "Field Journal"**: warm parchment, MedievalSharp / Marcellus / Spectral fonts, rust `#b5623a` + oxblood `#742230` accents, Latin flavor. Keep new UI consistent with it.
