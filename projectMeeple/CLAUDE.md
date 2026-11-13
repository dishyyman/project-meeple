# Project Meeple

Companion app for players/GMs of **Meeple**, an in-progress tabletop RPG.
Framework-free web app (vanilla HTML/CSS/JS) — no build step, no runtime dependencies. (`package.json` holds **dev-only** test tooling; nothing in it loads in the app.)

**Previewing: serve the folder over `http://`** — in VS Code, right-click `index.html` → **Open with Live Server**. Opening the file directly no longer works: the screens are assembled from `pages/` with `fetch()`, which browsers block on `file://`. The app will tell you so on screen if you forget.

**Testing: `npm test`** in this folder (unit + browser tests in Chrome and Safari/WebKit; one-time `npm install` and `npx playwright install webkit` first). Run it before calling a change done — before any commit — and report the result; add a test with the change — see `docs/testing.md`. Browser tests import `test` from `tests/e2e/helpers/test.js` (it fails a test on any page error). Known bugs get a `test.fail()` test, listed in `docs/testing.md` §10. If the characterization snapshots fail after a *deliberate* rules change, read the diff before re-recording; never re-record to silence an unexplained failure.

**Docs:** `docs/` holds the PRD, design system, architecture, database, security, code style and testing docs. Read the relevant one before scoping work; `docs/code-style.md` §13 has recipes for adding common things.

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
- **`pages/`** — one HTML fragment per screen (`home`, `characters`, `sheet`, `edit`, `rules`, `settings`, `create`, `menu`), plus `pages/modals/` grouped by owner (`dice`, `inventory`, `character`), and `pages/toast.html` (the transient confirmation, loaded last). Structure + hooks only: semantic classes and `data-*` state attributes, **never** inline styles.
- **`resources/js/boot.js`** — fetches every fragment in `pages/`, injects them into `.app` in a fixed order, then resolves `window.MEEPLE_READY`. Adding a screen means adding a file and one entry in its `PAGES` array.
- **`resources/css/style.css`** — an index of `@import`s and nothing else. The import order IS the cascade; it follows the original §1–§25 numbering deliberately.
- **`resources/css/tokens.css`** — ALL design tokens. To re-skin, edit here — never hardcode colors/sizes elsewhere. The remaining CSS files are one per screen, mirroring `pages/`.
- **`resources/js/frame.js`** — the phone-frame/full-window toggle. Shell chrome only; it sets `data-frame` on the root element and touches nothing inside `.app`.
- **`resources/js/mechanics.js`** — THE game arithmetic: every derived stat and play rule (heal, damage, Wound cascade, rests, Patches, effects). Pure — no DOM, no storage, no UI state; takes the character as its first argument and gets content through `create()`. Loaded by the app and by the unit tests.
- **`resources/js/main.js`** — behavior: a `character` data model, transient `state`, one-line wrappers that apply `mechanics.js` to the open character, class-only render, and one delegated click handler. Persists characters to localStorage.
- **`tests/`** — dev-only: unit tests (`node --test`), Playwright browser tests, fixtures. Not shipped.
- **`resources/images/`** — portrait assets (currently a CSS pattern placeholder).
- **`design/`** — archived Claude design-doc prototypes. Ideation source of truth for the look (direction **1a "Field Journal"**). Reference, don't ship from.

### Non-negotiable conventions

- **JS emits class names and toggles `data-*`; CSS decides all visuals.** Never reintroduce inline styles.
- Views/tabs/modals switch via `data-view` / `data-tab` / `data-modal` on `.app`.
- **One dice engine.** All rolls (calculator, quick to-hit/damage) go through `evaluateDice()`. Don't write a second implementation.
- **Never use `eval()`.** Dice expressions are parsed by the hand-written recursive-descent parser. Keep the limits (1–100 dice, 2–1000 sides, `floor()` the total).
- **One mechanics engine.** Game arithmetic goes in `mechanics.js` (with a unit test), never in `main.js` or a render function. `rules.js` is the Player's Guide *text*; `mechanics.js` is the *math*.
- **Derive, don't store, computed stats.** Game rules live as named constants in `RULES` in `mechanics.js` (e.g. `PRECISION_TO_HIT`). Change the rule in one place and every readout follows.
- **The Content Security Policy in `index.html` stays strict.** No inline `<script>`, inline handlers, `eval()`, or `style="…"` attributes (not even in JS template strings) — the browser would refuse them. Loosening it is a security decision for `docs/security.md`.
- **No selector is defined in two CSS files.** That invariant is what makes the `@import` order in `style.css` safe to reason about. To change a primitive from a screen file, override it with a more specific selector — never copy the rule.
- **Sizes come from the scales.** Every `font-size` is a `--fs-*` token and every `padding` / `margin` / `gap` a `--space-*` token (or a named layout constant like `--statusbar-clear`). Raw px only for 1px border compensation, negative optical nudges, or a size written as its derivation. See `docs/design-system.md` §5.1 / §6.1.
- **Feedback uses the shared patterns.** Inline errors and warnings are `.status` + `--error` / `--warn` / `--ok` (glyph + words, never colour alone). A confirmation for an action with no other visible result is `showToast()`. Don't invent a one-off warning style.
- **`init()` waits on `MEEPLE_READY`, not `DOMContentLoaded`.** The screens are fetched, so they land well after that event. Anything that needs the full DOM must wait on the same promise.

## Design language

Theme **"Field Journal"** (dark) — design direction 1a "Field Journal" after dark. Same
Marcellus / Spectral type and Latin flavor; the parchment is now lamplit dark.
Built on a 60/30/10 split, declared at the top of `tokens.css`:

| share | token | value | role |
|-------|-------|-------|------|
| 60% | `--palette-1` | `#232323` | every page and screen surface |
| 30% | `--palette-2` | `#684d00` | deep gold — the quieter rules and fills |
| 30% | `--palette-3` | `#a47e05` | mid gold — the rules meant to be seen |
| 10% | `--palette-4` | `#a73500` | ember — buttons and standout spots |

**The 30% is a range, not one value.** palette-2 and palette-3 share a hue
(44.4° / 45.7°) and differ only in weight, so they read as one material at two
depths — which is what lets a card edge, a section rule and a filled key all be
"the gold" without flattening into each other. The line ramp in `tokens.css` is
built on the axis between them and quotes both at their literal values.

Hues either side of the gold pair are used freely where a dark UI needs them — a
*readable* gold is not a *dark* gold; neither source value can carry small type
(palette-2 is 2.0:1, palette-3 is 4.2:1), so the spoken golds are lifted.
**Nothing outside the palette-4 family may be the loudest thing on a screen**:
one ember standout per screen.

**Health is not the accent.** `--health` keeps the brighter `#bd4200` it had when
it *was* the accent. A vital is a readout you scan and a button is a thing you
press; health being the brighter of the two is correct, since it is the most
important number on the sheet.

### Token conventions this theme depends on

Inverting the palette forced three tokens apart that the light theme could
conflate. Reach for the right half — the wrong one is a contrast bug, not taste:

- **`--accent` fills, `--accent-bright` speaks.** palette-3 is 2.9:1 on the page,
  so accent-coloured *text or icons* take `--accent-bright`. Same for
  `--danger` / `--danger-bright`.
- **`--on-accent` for type on an accent fill; `--on-dark` for type over a photo
  or glass**, where the surface underneath is out of our control.
- **`--ink-soft` is body text; `--rule-strong` is structure.** The light theme
  spent ink on both, which inverted into a near-white bar under the app.
- Gold at size is `--gold-fill`, not `--gold-bright` — the latter is sized for
  8px diamonds, and across a keypad it out-shouts the 10%.
- **`--heal` and `--damage` are fills too.** Red text, icons or outlines on the
  page take `--danger-bright` — `--damage` as text is 2.3:1.
- **Focus is `--focus` + `--focus-ring`**, never `--accent` (2.4:1 fails the 3:1
  a focus edge needs). Anything that sets `outline: none` must draw one.
- **Disabled is `opacity: var(--disabled-opacity)`** — one dimming app-wide.

Full design system, themes, and known gaps: `docs/design-system.md`.

Every foreground/background pair in `tokens.css` clears **WCAG AA (4.5:1)**;
the muted and faint inks are the floor, not a starting point. Re-check before
darkening any of them.

The light-parchment tokens are preserved in git history (`tokens.css` before the
dark pass) if the Appearance → Mode picker is ever wired up for real.
