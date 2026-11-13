# Architecture — Meeple Companion App

> **What this doc is for:** how the app is technically structured — where everything goes, how the parts communicate, and why it was built this way.
>
> **Status:** the app is a front-end-only, local-first web app today. There is no backend, database server, or account system yet, so several sections describe the current state and mark the future as **Open**. Fill those in as decisions are made.
>
> **Related docs:** [`prd.md`](prd.md) (what and why) · [`design-system.md`](design-system.md) (appearance) · [`library-schema.md`](library-schema.md) (game content contract) · [`character-file.md`](character-file.md) (exported character contract) · `CLAUDE.md` (day-to-day conventions)

---

## 1. System Overview

Meeple is a **static web app** that runs entirely in the player's browser. Everything — the character sheet, the dice roller, the rules browser, character creation — is plain HTML, CSS, and JavaScript, with no framework and no build step.

- **Content ships with the app.** Game content (classes, traits, skills, items) and the Player's Guide are generated into JavaScript files from source documents by two Node scripts, then served as static files.
- **Player data stays on the device.** Characters, portraits, and settings live in the browser's `localStorage`. Nothing is sent to a server.
- **Files move data between devices.** Characters, full backups, and compendiums are exported and imported as JSON files.

A server, accounts, and cloud sync are on the roadmap (`prd.md` §8, Nice to Have) but not designed. **Open.**

---

## 2. Architecture Pattern

**Pattern:** Client-only, local-first **static single-page app**, organized as a modular monolith in the browser.

- One page (`index.html`) whose screens are HTML fragments assembled at load.
- One behavior script (`main.js`) organized into clearly bounded sections (§4), plus small single-purpose engines (dice, portrait).
- State is held on the root element as `data-*` attributes; CSS decides what shows.

**Reason:**
- **Budget and team size** (`prd.md` §10): no server to pay for or maintain, no build pipeline to keep working.
- **The app is a reference tracker, not a VTT** (`prd.md` §3). It doesn't need to talk to other players in real time, so it doesn't need a backend to be useful.
- **Works offline at the table** once loaded — nothing depends on a connection.
- **Easy to read and change.** No framework abstractions; any file can be opened and understood directly.

**When to revisit:** account sync or the GM hub will need a backend. That will make this a client + service architecture. **Open** — see §9, Decision 9.

---

## 3. Technology Stack

| Layer | Technology | Status |
|---|---|---|
| **Frontend** | Vanilla HTML, CSS, JavaScript (ES2020+, no framework, no build step, no runtime dependencies) | Current |
| **Backend** | None | **Open** — needed for account sync / GM hub |
| **Database** | Browser `localStorage` (per device) | Current. Server database **Open** |
| **Authentication** | None. Sign-in / sign-out UI exists with no login behind it (`meeple.account` stores a placeholder flag) | **Open** |
| **Storage (files)** | Downloads via `Blob` + `<a download>`; Web Share API (`navigator.share`) for sending a character file; `FileReader` for imports | Current |
| **Hosting** | Static files. Locally: VS Code Live Server. Source on GitHub (`dishyyman/project-meeple`). Test deploy: GitHub Pages from `main`, repo root — `dishyyman.github.io/project-meeple/` | Production hosting (custom domain) **Open** |
| **Payments** | None | Not planned |
| **Email** | None. "Send an E-mail" feedback button is a stub | **Open** |
| **Analytics** | None | **Open** — would need a privacy decision (`security.md`) |
| **Fonts** | Google Fonts: Marcellus, Spectral, JetBrains Mono (and MedievalSharp, unused) | Current — the only third-party request the app makes |
| **Icons** | Lucide, inlined as SVG (not a dependency) | Current |
| **Content tooling** | Node.js scripts: `tools/csv-to-json.mjs` (Google Sheets CSV → library), `tools/rtf-to-rules.mjs` (Player's Guide RTF → rules; **Mac only**, uses macOS `textutil`) | Current. Moving the rules source to a Google Docs HTML export is planned (§13) |
| **Testing (dev only)** | Node's built-in test runner (unit); Playwright driving the installed Chrome (browser). Declared in a dev-only `package.json` — nothing ships to players (Decision 10) | Current |
| **Security headers** | Content Security Policy as a `<meta>` tag in `index.html` (`security.md` §5) | Current |
| **Other services** | Discord (feedback link — stub) | **Open** |

---

## 4. System Components

### Frontend (the whole app today)

| Component | File(s) | Responsibilities |
|---|---|---|
| **Shell** | `index.html` | The device frame, the `.app` state root, and script tags. No screen markup. |
| **Boot** | `resources/js/boot.js` | Fetches every fragment in `pages/`, injects them into `.app` in a fixed order, resolves `window.MEEPLE_READY`. Shows an explanation if the app was opened from `file://`. |
| **Screens** | `pages/*.html`, `pages/modals/*.html`, `pages/toast.html` | Structure only: semantic markup, classes, and `data-*` hooks. One file per screen. |
| **Styles** | `resources/css/` — `style.css` (import index), `tokens.css` (all design values), one file per screen | All appearance. Import order is the cascade. |
| **Frame toggle** | `resources/js/frame.js` | Phone-frame / full-window preview toggle. Touches nothing inside `.app`. |
| **Dice engine** | `resources/js/dice.js` | The only dice parser (`evaluateDice()`). Shared by the app and the content converter. Never uses `eval()`. |
| **Mechanics engine** | `resources/js/mechanics.js` | The only implementation of the game's arithmetic: every derived stat and every play rule (heal, damage, Wound cascade, rests, Patches, effects). No DOM, no storage. Shared by the app and the unit tests (Decision 11). |
| **Portrait engine** | `resources/js/portrait.js` | The only image pipeline (`compress()`): decodes, resizes, and re-encodes photos so they fit in `localStorage`. |
| **Game content** | `resources/js/library.js` *(generated)* | The built-in compendium, as `window.MEEPLE_LIBRARY`. |
| **Rules text** | `resources/js/rules.js` *(generated)* | The Player's Guide, as data for the Rules screen. |
| **Behavior** | `resources/js/main.js` | Everything else, in labeled sections (below). |

**`main.js` sections**, in file order — each is a boundary worth keeping:

| Layer | Sections | Job |
|---|---|---|
| **Model** | Character data model, the roster, library loading, Boon & Condition catalog | What a character *is*, and the content it references by id |
| **State** | Transient UI state | View, open tab, open modal, wizard draft — never persisted |
| **Derived stats** | Derived stats — through the mechanics engine | The gear catalog, display helpers, and one-line wrappers that apply `mechanics.js` to the open character |
| **Persistence** | Persistence, roster, export & import | Reading and writing `localStorage`; character and compendium files |
| **Rules** | Rules — through the mechanics engine | Wrappers for the play rules; also mirrors "Boons lost to a Wound" into UI state for the notice |
| **Render** | DOM helpers, markup builders, render, and each feature's render functions | Paint data into the DOM using class names and `data-*` only |
| **Features** | Inventory, notes, portrait, edit character, skills, dice roller, quick roll, settings, create-character wizard, toast | Feature-specific behavior built on the layers above |
| **Wiring** | `wire()` | One delegated click handler for the whole app, plus a few pointer/keyboard listeners |
| **Init** | `init()` | Loads imported entries → roster → account, renders, wires, lands on Home |

### Backend

None today. **Open.** Expected responsibilities when one exists:
- Authenticate players.
- Store and sync characters per account, without mixing players' data (§11).
- Possibly: serve the latest compendium, and back the GM hub.

### Database

Today, `localStorage` in each browser. Responsibilities:
- Hold the roster, each character's play state, and each portrait.
- Hold an installed compendium and any entries imported to fill gaps.
- Hold preferences (frame mode, placeholder account flag).

**Storage keys:**

| Key | Holds | Written by |
|---|---|---|
| `meeple.roster` | Which characters exist, their order, and which is open | Roster |
| `meeple.character.<id>` | One character's play state and build (no portrait) | `save()` |
| `meeple.character.<id>.portrait` | That character's photo, as a compressed JPEG data URL | `savePortrait()` |
| `meeple.library` | A compendium installed in place of the built-in one | Compendium import (Replace) |
| `meeple.imported-entries` | Individual content entries that filled gaps (from Add or an imported character) | Imports |
| `meeple.account` | Placeholder signed-in flag and name | Account stub |
| `meeple:frame` | Phone-frame or full-window preference | `frame.js` |

Server-side database: **Open** — see `database.md` when it exists.

---

## 5. Architecture Diagram

**Today:**

```text
                 ┌──────────────────────────── build time (developer) ───────────────────────────┐
                 │  Google Sheets ─► tools/csv/*.csv ─► csv-to-json.mjs ─► resources/js/library.js │
                 │  Player's Guide.rtf ─────────────► rtf-to-rules.mjs ─► resources/js/rules.js    │
                 └───────────────────────────────────────────────┬───────────────────────────────┘
                                                                 │ static files
                                                                 ▼
 Player ──► Browser ──► index.html ──► boot.js ──fetch──► pages/*.html  (injected into .app)
                            │
                            ├── dice.js · mechanics.js · portrait.js · library.js · library-check.js · rules.js   (globals)
                            └── main.js
                                  │  wire()  ◄── clicks (one delegated handler)
                                  ▼
                            mechanics (rules + derived stats) ──► render ──► DOM (classes + data-*) ──► CSS
                                  │
                                  ▼
                            localStorage  ◄──►  JSON files (export / import, share sheet)
```

**Future (Open):** a backend for accounts and sync would sit beside `localStorage`, not replace it — the device stays the primary store (`prd.md` §8).

```text
 main.js ──► localStorage (primary)  ──sync when signed in──►  API ──► Auth · Database
```

---

## 6. Data Flow

**Loading the app**
1. Browser loads `index.html` over `http://` and runs `frame.js` (applies the stored frame mode before first paint).
2. `boot.js` fetches all screen fragments in parallel and inserts them in order, then resolves `MEEPLE_READY`.
3. `dice.js`, `mechanics.js`, `portrait.js`, `library.js`, `library-check.js`, and `rules.js` define their globals.
4. `main.js` waits on `MEEPLE_READY`, then `init()` loads imported entries, the roster (opening a character), and the account flag; renders everything; wires the click handler; and lands on Home.

**A change during play** (e.g. taking damage)
1. Player taps a control; the single delegated handler in `wire()` matches it by its `data-*` attribute.
2. A rules wrapper in `main.js` hands the open `character` to the mechanics engine, which updates it (e.g. `damage()` runs the Wound cascade).
3. Derived stats are recomputed from the model — never stored.
4. Render functions repaint the affected parts using class names and `data-*` attributes.
5. `save()` writes the character to `localStorage` and returns whether it landed. If storage refuses it, play continues in memory: the character is **held** (`heldSaves` in `main.js`) so switching away and back, a backup or a share all still see the latest version, every later write retries it, and the standing storage alert stays up until it lands (`settleStorage()`).

**Exporting and importing a character**
1. Export: the character is read back out through `readSave()` (storage, or the held copy if storage refused the latest version), wrapped with a snapshot of the content it uses, and delivered as `<name>.meeple.json` (download, or the device share sheet).
2. Import: the file is read and validated (envelope, schema version), the player chooses *add a copy* or *overwrite*, missing content fills gaps from the file's snapshot, and a result window reports what happened.

**Updating content**
1. Developer edits Google Sheets → exports CSV → runs `node tools/csv-to-json.mjs` (validates dice with the app's own parser) → `library.js` is regenerated.
2. Or a player imports a compendium file: **Add** merges missing entries immediately; **Replace** stores it and reloads the app.

---

## 7. Project Structure

```text
project-meeple/              # repo root = site root (GitHub Pages serves it as-is)
├── index.html               # shell only: frame, .app root, script tags
├── CLAUDE.md                # working conventions for the codebase
├── pages/                   # one HTML fragment per screen (structure only)
│   ├── home.html  characters.html  sheet.html  edit.html
│   ├── rules.html  settings.html  create.html  menu.html
│   ├── toast.html
│   └── modals/              # dice.html  inventory.html  character.html
├── resources/
│   ├── css/                 # style.css (import index), tokens.css, one file per screen
│   ├── js/
│   │   ├── boot.js          # fetches and injects pages/
│   │   ├── frame.js         # preview frame toggle
│   │   ├── dice.js          # the one dice engine (also used by tools/)
│   │   ├── mechanics.js     # the one game-mechanics engine (also used by tests/)
│   │   ├── portrait.js      # the one image pipeline
│   │   ├── library.js       # GENERATED — game content
│   │   ├── library-check.js # the one compendium/entry shape check (also used by tests/)
│   │   ├── rules.js         # GENERATED — Player's Guide
│   │   └── main.js          # model, content indexes, render, wiring
│   └── images/              # portrait assets
├── tools/
│   ├── csv/                 # exported Google Sheets tabs (source of content)
│   ├── out/library.json     # converter output, readable JSON
│   ├── csv-to-json.mjs      # content converter
│   └── rtf-to-rules.mjs     # Player's Guide converter
├── tests/                   # DEV ONLY — see testing.md
│   ├── unit/                # node --test: dice, mechanics, content
│   ├── e2e/                 # Playwright: flows, characterization, security
│   ├── fixtures/            # real exported files + hostile ones; seeded saves
│   └── serve.mjs            # tiny static server the browser tests start
├── package.json             # DEV ONLY — test tooling; the app has no dependencies
├── playwright.config.js     # DEV ONLY
├── docs/                    # this documentation set + the Player's Guide RTF
├── design/                  # archived design prototypes — reference, never shipped
├── README.md
└── .nojekyll                # empty; tells GitHub Pages to serve files untouched
```

---

## 8. Dependency Rules

- **HTML holds structure, CSS holds appearance, JS holds behavior.** JS emits class names and toggles `data-*`; it never sets inline styles. CSS never encodes game logic.
- **`index.html` holds no screen markup.** Screens live in `pages/`; adding one means a new file plus one entry in `boot.js`'s `PAGES` list.
- **Rules functions don't touch the DOM.** Game logic takes and returns data; render functions paint it.
- **Derived numbers are computed, never stored.** Only things a player *spends or chooses* (health, mana, wounds, patches, build choices) are saved.
- **One engine per job.** All rolls go through `evaluateDice()`; all game arithmetic through `mechanics.js`; all images through `compress()`. Never write a second.
- **The mechanics engine stays pure.** No DOM, no storage, no UI state; content arrives through `create()`. That is what keeps it testable.
- **Generated files are never edited by hand.** `library.js` and `rules.js` are rebuilt from their sources.
- **Characters reference content by id.** A character never copies content into its save — except the snapshot inside an exported file, which exists so the file survives a different compendium.
- **Content and characters are stored apart.** Replacing a compendium never touches characters.
- **`main.js` runs after `MEEPLE_READY`**, never on `DOMContentLoaded`.
- **No runtime dependencies.** Anything third-party (fonts aside) needs a decision recorded in §9. Dev-only test tooling lives in `package.json` and never loads in the app (Decision 10).

---

## 9. Key Technical Decisions

### Decision 1 — No framework, no build step
**Context:** a small team on a shoestring budget, building something that has to stay easy to change.
**Alternatives:** React / Vue / Svelte with a bundler.
**Reason:** nothing to install, upgrade, or configure; every file is readable as-is. The cost — hand-written rendering and wiring — is paid down by strict conventions (§8).

### Decision 2 — Screens as fetched HTML fragments
**Context:** a single `index.html` holding every screen had become too large to work in.
**Alternatives:** keep one file; generate pages with a build step; build screens in JS templates.
**Reason:** one file per screen with no tooling. **Cost:** the app must be served over `http://` — `file://` blocks `fetch()`. `boot.js` explains this on screen.

### Decision 3 — `localStorage`, with each character and portrait under its own key
**Context:** characters must survive reloads with no server.
**Alternatives:** IndexedDB; one big save blob.
**Reason:** synchronous and simple. Per-character keys mean one tap rewrites one small record. Portraits are kept apart because they're ~100× larger: a full quota then fails the portrait's write, not the one holding health and notes.
**Known limit:** ~5 MB per origin, shared by every character and portrait. **Open** — revisit (likely IndexedDB) if rosters or portraits outgrow it.

### Decision 4 — Content generated into JS globals from spreadsheets and the guide
**Context:** game content and rules are authored by non-developers in Google Sheets and a document.
**Alternatives:** hand-written JSON; a CMS; a database.
**Reason:** the source documents stay the source of truth; converters validate on every run (dice through the real parser). Generated as globals so they load as plain scripts.

### Decision 5 — One delegated click handler and `data-*` state on `.app`
**Context:** hundreds of controls across screens and modals, with no framework.
**Alternatives:** per-element listeners; a state library.
**Reason:** one place to read for "what happens when this is tapped"; works for markup rendered at any time. View, tab, modal, and menu state live on `.app` so CSS can switch screens without JS touching visibility.

### Decision 6 — Derive, don't store
**Context:** stats depend on class, level, attributes, gear, and active Boons and Conditions.
**Alternatives:** store computed values and update them on change.
**Reason:** a rule changes in one place and every readout follows; saved data can never disagree with the rules.

### Decision 7 — Files for portability before accounts
**Context:** players need backups, device moves, and GM hand-offs.
**Alternatives:** build account sync first.
**Reason:** files need no server and no budget, and the format (`character-file.md`) is versioned so today's files stay readable forever.

### Decision 8 — Replacing a compendium reloads the app
**Context:** content and every index built from it are read once at load.
**Alternatives:** rebuild everything in place.
**Reason:** a reload can't leave a stale reference behind, and everything is already in storage, so it costs nothing.

### Decision 9 — Backend, accounts, and sync
**Status:** **Open.** To decide when account sync or the GM hub is picked up: hosting, auth provider, database, how a local character and its cloud copy are reconciled, and how this fits the budget and no-dependencies constraints. Will need `security.md` and `database.md`.

### Decision 10 — Dev-only test tooling (2026-10-05)
**Context:** the app needed automated tests, and browser tests need a browser driver.
**Alternatives:** manual testing only; a test framework that runs inside the app.
**Reason:** Node's built-in runner for unit tests (no install) and Playwright for browser tests, declared in a **dev-only** `package.json`. Playwright drives the Chrome already installed (`channel: 'chrome'`), so no browser download. Nothing in `package.json` loads in the app, so "no runtime dependencies" still holds.
**Constraint:** `package.json` must **not** declare `"type": "module"` — `dice.js`, `mechanics.js` and `library-check.js` are loaded by Node as CommonJS.

### Decision 11 — Game mechanics extracted into `mechanics.js` (2026-10-05)
**Context:** the rules lived inside `main.js`'s closure, reading a shared `character` — impossible to unit-test without a browser page.
**Alternatives:** test only through the browser; split all of `main.js` into ES modules.
**Reason:** the same move that made dice testable. Every rule takes the character as its first argument and gets content through `create()`. `main.js` keeps one-line wrappers under the old names, so no call site changed. Proven safe by characterization tests recorded *before* the move (`testing.md`).
**Kept as before:** rules change the character they're handed in place, matching how all of `main.js` works.

---

## 10. Performance Considerations

- **Lightweight and responsive.** No framework or bundle to download.
- **Paint on demand.** The Rules screen (the largest thing in the app) and Settings render only when opened.
- **Small writes.** Saving play state never rewrites a portrait; portraits are compressed before storage.
- **Parallel boot.** Screen fragments are fetched in parallel and inserted in order.
- **Respect reduced motion.** Animations are turned off or slowed under `prefers-reduced-motion`.
- **`main.js` is ~8,200 lines in one file** (down from ~8,800 after the mechanics extraction). Fine for now; **Open** — whether to split it further or move to modules.
- **Open:** performance budgets (load time on a mid-range phone, storage per character).

---

## 11. Scalability Considerations

- **Saves from multiple users must not cross-contaminate.** Today this holds by construction: each browser has its own `localStorage`, so two players never share storage. On one device, each character has its own keys under a unique id.
- **Content grows without code changes.** New collections and entries in the library file are discovered, not listed in code.
- **Storage ceiling.** ~5 MB per device is the real limit on roster size with portraits (Decision 3).
- **Open — once there's a backend:** every record scoped to an account; server-side checks that a player can only read and write their own characters; what happens when the same character is edited on two devices.

---

## 12. Failure Scenarios

| What happens if… | Expected behavior | Today |
|---|---|---|
| **Storage is unavailable or full** | The device keeps the character in memory so play continues; the player is told when something won't persist. | Built. A refused save keeps play going in memory and raises a standing alert (with a route to Export All Characters) until a later write lands; "Character saved." is only shown for a save that landed. An import storage refuses is undone and reported as not imported. A portrait that won't fit is kept on screen with a message. Corrupt stored data falls back to defaults rather than crashing. |
| **Database (server) is unavailable** | The device holds the character; it syncs when the player next connects. | **Open** — no server yet. Local-first design already covers the "device holds it" half. |
| **API times out** | A refresh is offered. | **Open** — no API yet. |
| **A third-party service fails** | A notice is shown; everything that doesn't depend on it keeps working. | Google Fonts failing falls back to system serif fonts. Nothing else is third-party yet. |
| **Authentication fails** | Re-attempt with an error message. | **Open** — no real auth yet. |
| **The app is opened from `file://`** | Explain how to serve it. | Built — `boot.js` shows an explanation on screen. |
| **A screen fragment fails to load** | Explain, don't half-render. | Built — `boot.js` shows which file failed; `init()` never runs. |
| **An imported file is wrong, too new, or too large** | Refuse it with a message naming the problem. | Built — wrong type, unreadable JSON, newer schema versions, and files over 10 MB are refused with explanations. Covered by `tests/e2e/security.spec.js`. |
| **A character references content the compendium lacks** | Drop the missing reference rather than show it broken; warn before an import causes it. | Built. |

---

## 13. Open Items

- [ ] Backend, auth, database, hosting, and sync design (Decision 9).
- [ ] Production hosting for the static app.
- [ ] Whether to move from `localStorage` to IndexedDB as rosters and portraits grow.
- [ ] Whether to split `main.js` further, or into modules. Since `boot.js` requires `http://`, ES modules are now an option; every script is a classic `<script>` today. The next natural extraction is the save/load validation (`applySave()` and the file parsers), the same way mechanics was, so it can be unit-tested.
- [ ] No favicon — the browser's automatic `/favicon.ico` request 404s on every load. Waits on the logo (`design-system.md` §2).
- [ ] `tools/csv-to-json.mjs` stamps today's date into `library.js` on every run, so re-running it with no content change still produces a diff.
- [x] ~~Stale comments giving "the app opens from `file://`" as the reason scripts are plain globals, and `main.js` naming the stylesheet `meeple.css`~~ — corrected 2026-10-05 in the scripts and both converters; `library.js` and `rules.js` regenerated (header and date only).
- [ ] Performance budgets (§10).
- [ ] Analytics and email services, if wanted.
- [ ] **Rules converter is Mac-only.** `rtf-to-rules.mjs` reads the guide RTF through macOS `textutil`. Since 2026-10-05 it stops with a clear message on any other OS. **Plan:** the guide is written in Google Docs, which exports HTML directly — switch the converter's source to that HTML export so it runs anywhere. Needs a sample export first, because heading detection currently reads font sizes from `textutil`'s stylesheet and a Google Docs export styles text differently.
