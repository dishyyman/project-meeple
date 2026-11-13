# Design System — Meeple Companion App

> **What this doc is for:** defines the app's visual language — direction, themes, color roles, type, spacing, components, states, and accessibility rules.
>
> **Source of truth.** Values live in `resources/css/tokens.css`; this doc explains them and records the decisions behind them. If the two disagree, the CSS is what ships — fix whichever one is wrong, and note it here.
>
> Items marked _TBD_ are open. Items marked **⚠ Gap** are places where the app does not yet meet this doc; each is listed again in §17.
>
> **Related docs:** [`prd.md`](prd.md) · `CLAUDE.md` (architecture and conventions) · `design/` (archived prototypes — reference, don't ship from)

---

## 1. Design Direction

**Style**
Minimal with simplified fantasy RPG elements — a field journal: serif type, gold section rules with ✦ flourishes, hard woodcut-style offset shadows, Latin flavor in names.

**Mood**
Warm and clean. Lamplight on a desk, not a dungeon.

**Design Principles**
- **Easy to read.** Type and contrast come before ornament. (Display type was moved from MedievalSharp to Marcellus for exactly this reason.)
- **Familiar.** Layouts and controls should feel like other companion apps; Meeple's difference is in the game, not the UI. (`prd.md` §4)
- **Smooth navigation.** Few screens, one tab bar, a menu reachable from everywhere.
- **Show only what matters now.** Detail lives in collapsible rows and modals, not on the surface. (Alexandra's pain point.)
- **One standout per screen.** Only the accent may be the loudest thing on a screen.
- **Never rely on color alone.** Every color cue has a second cue — shape, glyph, position, or text.

---

## 2. Brand

**Brand Name**
Meeple

**Logo**
_TBD_

**Brand Voice**
Plain language and often jocular, as long as rules are conveyed clearly. Clarity wins whenever the two conflict — a joke never replaces the rule it sits beside.

**Voice in practice** (from shipped copy)
- Say what will happen, and reassure where a player might worry: *"Signing out leaves every character on this device untouched."*
- Prefer an honest "Coming soon." over a link to nothing.
- Explain *why* a control is unavailable, directly under it, rather than just disabling it.

---

## 3. Themes

The app will ship with multiple themes. A theme is chosen on two independent axes:

| Axis | Values | Stored as |
|---|---|---|
| **Color theme** | one of the themes in the registry below | `appearance.theme` (e.g. `journal`) |
| **Mode** | Light · Dark · Auto (follows the device) | `appearance.mode` — `light` / `dark` / `system` |

**Current state:** the Settings → Appearance picker is built but **frame only** — it records a choice and nothing reads it (`main.js`, `renderAppearance()`). The app always wears the dark Field Journal tokens. The choice is deliberately not persisted yet.

### 3.1 Theme registry

| id | Picker label | Light mode | Dark mode | Status |
|---|---|---|---|---|
| `journal` | Field Journal | Parchment (in git history, see §3.4) — not planned yet | **The current app** | Dark shipped |
| `ink` | Ink & Iron | _TBD_ | _TBD_ | Name only — on hold |
| `ember` | Ember | _TBD_ | _TBD_ | Name only — on hold |
| `moss` | Moss | _TBD_ | _TBD_ | Name only — on hold |
| `dusk` | Dusk | _TBD_ | _TBD_ | Name only — on hold |

**On hold.** No work is planned on the other themes or on light mode for now. When it is picked up, start with the prompt in §3.5.

### 3.2 How a theme is logged

Every theme gets an entry in §3.4 using this template, filled in before its tokens are written:

```markdown
### <Theme name> (`<id>`)

**Status:** idea · in design · shipped (light / dark)
**Mood:** one line — what it should feel like
**Source palette (60/30/10):**
| share | Light | Dark | role |
|---|---|---|---|
| 60% | #…… | #…… | page surfaces |
| 30% | #…… / #…… | #…… / #…… | rules, labels, secondary fills |
| 10% | #…… | #…… | the one standout (accent) |
**Overrides:** which semantic tokens (§4.2) differ from what the source palette derives, and why
**Contrast check:** date checked, and any pair that needed lifting
**Notes / decisions:**
```

### 3.3 Rules every theme must follow

- **Same token names, different values.** A theme only changes color values; it never adds, removes, or renames semantic tokens (§4.2). Components never know which theme is on.
- **Only color varies by theme.** Type, spacing, radii, shadow geometry, and layout are shared. (Shadow *color/opacity* may vary — a dark page needs heavier shadows.)
- **Every foreground/background pair clears WCAG AA (4.5:1)** in every theme and mode, checked before shipping.
- **Keep the 60/30/10 split and the one-standout rule.**
- **Fixed meanings stay recognizable across themes:** health is warm red-orange, mana is blue, heal is green, damage and danger are red. A theme may shift their shade, not their hue family.
- **The `--fill` / `--bright` split is per mode** (see §4.3). Dark mode needs it; light mode may let both point at one value.

**Planned implementation** (_proposed — not built_): set `data-theme` and `data-mode` on `<html>`, the same place `data-frame` lives. Each theme × mode is one block of color overrides, e.g. `:root[data-theme="moss"][data-mode="dark"] { … }`. Auto mode resolves `system` to `light` or `dark` through `prefers-color-scheme` in JS, so CSS only ever sees two modes.

### 3.4 Theme entries

#### Field Journal (`journal`)

**Status:** dark shipped. Light archived in git history (`tokens.css` at commit `fb800f7`) — not planned yet.
**Naming:** this theme was briefly called "Ember Journal" in code comments; it is **Field Journal** everywhere now. "Ember" is a separate, unbuilt theme in the registry.
**Mood:** dark — the field journal after dark: the desk, the lamp, and the coal in the brazier. Light — aged parchment and ink.

**Source palette:**

| share | Light (archived) | Dark (current) | role |
|---|---|---|---|
| 60% | `#f3e7cf` parchment | `#232323` | page surfaces |
| 30% | `#c3ab74` / `#d9c187` | `#684d00` / `#a47e05` | rules, labels, secondary fills |
| 10% | `#b5623a` rust | `#a73500` ember | the one standout |

**Decisions:**
- The 30% is a *range*, not one value: the two golds share a hue (44.4° / 45.7°) and differ only in weight, so they read as one material at two depths.
- In the light theme, oxblood `#742230` meant both "screen title" and "destructive". In dark, these were split: titles moved to gold (`--heading`) and destructive to red (`--danger`), so one color never means both "you are here" and "this deletes things".
- Health was the accent in light. In dark, health keeps the brighter `#bd4200` and the accent moved deeper, so a readout and a button are no longer the same color.

### 3.5 Prompt — starting work on a new theme

Paste this into a session when a theme in §3.1 comes off hold. Fill in the bracketed parts first.

```text
We're starting work on the [THEME NAME] theme (id `[id]`) for the Meeple
companion app. Read docs/design-system.md §3 (Themes) and §4 (Color), and
resources/css/tokens.css, before proposing anything.

What I want it to feel like: [one-line mood — e.g. "cold steel and lamp-black"]
Modes it needs: [dark only / light only / both]
Colors I already have in mind (optional): [hexes or references]

Please:
1. Propose a 60/30/10 source palette (palette-1 … palette-4) for each mode,
   and show how it maps onto every semantic token in §4.2.
2. Check every foreground/background pair against WCAG AA (4.5:1 for text,
   3:1 for focus edges and icons) and list any you had to lift.
3. Keep the fixed meanings recognizable (§3.3): health warm red-orange,
   mana blue, heal green, damage/danger red.
4. Fill in the theme entry template (§3.2) in docs/design-system.md.
5. If the theme × mode plumbing (§3.3 "Planned implementation") isn't built
   yet, plan that first and wait for my thumbs-up before writing code.
Do not change any token names, and do not touch non-color tokens.
```

---

## 4. Color Palette

### 4.1 Template roles → tokens (current dark theme)

| Role | Token | Value | Notes |
|---|---|---|---|
| **Primary** | `--accent` | `#a73500` | Fills only. As text/icon use `--accent-bright` `#ee6728` (4.9:1). |
| **Secondary** | `--line-gold` / `--gold` | `#a47e05` / `#cb9f13` | Gold — rules and edges / gold as text (6.4:1). |
| **Background** | `--bg-page` | `#232323` | `--bg-app` `#131313` is the space behind the phone frame. |
| **Surface** | `--bg-card` | `#2b2926` | Raised cards. |
| **Text** | `--ink` | `#f0e9dd` | Display text. Body text is `--ink-soft` `#d6cdbd`. |
| **Muted Text** | `--ink-muted` | `#a89881` | Labels (5.6:1). Captions use `--ink-faint` `#a19583` (4.7:1). |
| **Border** | `--line` | `#564211` | One of a ramp — see §4.2. |
| **Success** | `--heal` | `#527a3d` | Heal fills. Success text/indicator color planned — see §13.1. |
| **Warning** | — | — | Planned — see §13.1. Over-budget currently uses `--accent-bright`. |
| **Error** | `--danger` / `--danger-bright` | `#c0392f` / `#f0685c` | Fill / text (5.1:1). |

### 4.2 Semantic tokens

The full set. Themes override these values; components only ever use these names.

| Group | Tokens | Job |
|---|---|---|
| Source | `--palette-1` … `--palette-4` | The four theme colors everything else derives from |
| Surfaces | `--bg-app`, `--bg-page`, `--bg-card`, `--bg-inset`, `--bg-parchment2`, `--bg-input` | A ramp around the 60%. Raised surfaces get warmer; recesses go below the page. |
| Ink | `--ink`, `--ink-soft`, `--ink-muted`, `--ink-faint` | Text, from loudest to quietest. The muted and faint steps are the AA floor — never darken them. |
| Lines | `--line`, `--line-gold`, `--line-soft`, `--line-warm`, `--line-hair`, `--rule-strong` | Borders and rules — where the 30% actually lives (~120 borders). `--rule-strong` divides regions (tab bar edge, dice tray lid). |
| Accent | `--accent`, `--accent-deep`, `--accent-bright`, `--on-accent` | The 10%. Fill, fill border, as text, type on the fill. |
| Over images | `--on-dark`, `--on-dark-soft` | Type over a photo or glass. Never re-point at an ink token. |
| Gold | `--gold`, `--gold-bright`, `--gold-fill`, `--heading` | Gold as text, flourishes, large fills, screen titles. |
| Danger | `--danger`, `--danger-deep`, `--danger-bright`, `--danger-wash` | Destructive actions and alarms. Kept red, never orange, so it can't be mistaken for the accent. |
| Vitals | `--health`, `--wound`, `--health-off`, `--mana`, `--mana-bright`, `--mana-deep`, `--mana-off`, `--mana-text` | Health, wound pips, mana. |
| Actions | `--heal`, `--heal-border`, `--heal-text`, `--damage`, `--damage-border`, `--damage-text` | The Heal / Damage pair — always equally loud. |
| Washes | `--wash-lift`, `--wash-lift2`, `--scrim`, `--hairline`, `--gold-wash`, `--accent-wash`, `--hatch` | Lifts, overlays, highlights, focus wash, portrait texture. |
| Focus & disabled | `--focus`, `--focus-ring`, `--disabled-opacity` | Keyboard focus edge (`--accent-bright`, clears 3:1) and its glow; the one dimming for disabled controls (0.45). |

### 4.3 Color rules

- **`--accent` fills, `--accent-bright` speaks.** Same for `--danger` / `--danger-bright`. Using a fill token as text is a contrast bug, not a style choice.
- **`--heal` and `--damage` are fills too.** Red text, icons or outlines on the page take `--danger-bright` (`--damage` as text is 2.3:1).
- **Focus is `--focus`**, never `--accent` — the ember fill is 2.4:1 on the page and a focus edge needs 3:1.
- **`--on-accent`** for type on an accent fill; **`--on-dark`** for type over a photo or glass.
- **`--ink-soft` is body text; `--rule-strong` is structure.**
- **Gold at size is `--gold-fill`**, not `--gold-bright` — the bright gold is sized for 8px diamonds.
- **A wound pip and a button share `--accent`'s red.** They are told apart by shape and place: pips are 22px squares in the vitals card; buttons are wide and sit at the foot of a screen.
- **Never hardcode a color outside `tokens.css`.**

---

## 5. Typography

**Font families** (Google Fonts, loaded in `index.html`)

| Token | Font | Used for |
|---|---|---|
| `--font-display` | Marcellus | Names, titles, ✦ section labels |
| `--font-label` | Marcellus | Labels, numbers, uppercase eyebrows |
| `--font-body` | Spectral (400, 500, 600, 400 italic) | Descriptions, rules text, italic notes |
| `--font-mono` | JetBrains Mono | Code in the boot-error screen |

MedievalSharp is still loaded so the display font can be swapped back in one line. _TBD_ — drop it if that experiment is over.

### 5.1 Type scale

**Adopted 2026-10-05.** Every `font-size` in the app's CSS is a token from this scale — never a raw px value. (The one exception is `frame.css`, which draws the preview phone's own status bar and frame toggle — device chrome, not app.)

| Token | Size | Role | Replaced |
|---|---|---|---|
| `--fs-caption` | 10px | Tab labels, value-box labels, field labels | 8.5, 9, 9.5, 10 |
| `--fs-label` | 11px | Small uppercase labels, budget readouts | 11, 11.5 |
| `--fs-small` | 12px | Eyebrows, counts, add buttons | 12 |
| `--fs-note` | 13px | Hints, empty states, italic notes, field errors | 12.5, 13, 13.5 |
| `--fs-body` | 14px | Body and rules text, buttons | 14, 14.5 |
| `--fs-input` | 16px | Form inputs, ✦ section rules, compact row titles | 15, 16 |
| `--fs-row` | 18px | Row titles, value boxes | 17, 18, 19 |
| `--fs-title` | 21px | Screen and modal titles | 20, 21, 22 |
| `--fs-display` | 24px | Large headings (menu title) and readouts | 23, 24 |
| `--fs-stat` | 28px | Stat and combat values | 26, 28 |
| `--fs-hero` | 31px | Hero character name, calculator readout | 30, 31 |

**One-off display sizes** — numbers and a wordmark to be seen across a table, not text to be read: `--fs-wordmark` 36px (home title), `--fs-numeral-md` 38px and `--fs-numeral-lg` 68px (dice totals).

**Why these choices:**
- **No text below 10px.** The 8.5–9.5px captions got slightly bigger, which matters for an app aimed at new players.
- **Form inputs are 16px.** iOS Safari zooms the whole page when a field under 16px is focused; this stops that on phones.
- **No size moved by more than 2px.** The most visible shifts: section rules and inputs 15 → 16, row titles 17 → 18, screen titles 22 → 21.

**Type roles**

| Role | Font | Token / weight / line height | Example |
|---|---|---|---|
| H1 — hero name | Marcellus | `--fs-hero` / 400 / 1.08 | Character name over the portrait |
| H2 — screen title | Marcellus | `--fs-title` / 400, +0.02em | `.title` |
| H2 — modal title | Marcellus | `--fs-title` / 400 | `.modal__title` |
| H3 — section rule | Marcellus | `--fs-input` / 400, +0.04em, gold | `✦ Section ✦` |
| Row title | Marcellus | `--fs-row` (`--fs-input` on light rows) | `.collapse__title` |
| Body | Spectral | `--fs-body` / 400 / 1.55 | Rules text in rows |
| Input text | Spectral | `--fs-input` / 400 | `.field__input` |
| Small / note | Spectral italic | `--fs-note` / 1.5 | Hints, empty states |
| Eyebrow / label | Marcellus | `--fs-small` uppercase, +0.12em | `.eyebrow` |
| Caption | Marcellus | `--fs-caption` uppercase, +0.06–0.14em | Value-box labels, tab bar, field labels |

---

## 6. Spacing

### 6.1 Spacing scale

**Adopted 2026-10-05.** Base unit **4px, with 2px half-steps up to 16px.** A strict 4px grid would have forced the app's two most common values (10px and 14px, ~95 uses between them) to change; the half-steps keep them. Every `padding`, `margin` and `gap` uses a token.

| Token | Value | Token | Value |
|---|---|---|---|
| `--space-0-5` | 2px | `--space-4` | 16px |
| `--space-1` | 4px | `--space-5` | 20px |
| `--space-1-5` | 6px | `--space-6` | 24px |
| `--space-2` | 8px | `--space-8` | 32px |
| `--space-2-5` | 10px | `--space-10` | 40px |
| `--space-3` | 12px | `--space-12` | 48px |
| `--space-3-5` | 14px | `--space-16` | 64px |

**How the migration snapped values:** odd values went to the nearest full 4px step (3, 5 → 4; 7, 9 → 8; 11, 13 → 12; 15 → 16). Above 16: 18 → 16, 22 and 26 → 24, 28 and 30 → 32, 44 → 48.

**Literal px is allowed only for:**
- 1px border compensation and negative optical nudges (e.g. `margin: -2px`).
- Sizes derived from something else — written as that derivation (e.g. `.rule--action`'s gutter is `calc(26px + 2px + var(--space-2))`: the control, its offset, and a gap), or a picker's padding that *is* its cell height.
- **Layout constants**, which are named tokens:

| Token | Value | Clears |
|---|---|---|
| `--statusbar-clear` | 54px | The phone's status bar, at the top of every screen and the menu |
| `--home-clear` | 30px | The home indicator, under the tab bar |
| `--modal-gutter` | 24px | Space between a modal card and the frame (top is `--statusbar-clear` + `--space-3-5`) |

**In practice:**

| Use | Token |
|---|---|
| Screen side gutter | `--space-4` (16px) — screens and top bars now agree |
| Stack gap (default / tight) | `--space-2-5` / `--space-2` |
| Section rule | `--space-6` above, `--space-3-5` below |
| Collapsible row padding | `--space-3` × `--space-3-5` |
| Modal card padding | `--space-5` |

---

## 7. Border Radius

| Token | Value | Used for |
|---|---|---|
| `--r-xs` | 8px | Value boxes, inputs, small buttons, portraits |
| `--r-sm` | 10px | Collapsible rows, primary/secondary buttons, loadout rows |
| `--r-md` | 12px | Character cards, dashed add buttons |
| `--r-lg` | 14px | Large cards |
| `--r-modal` | 22px | Modal cards (the inset gold rule follows the same curve) |
| Pill / round | 50% | Icon buttons, glass buttons |

---

## 8. Shadows

Hard offset shadows are the theme's woodcut signature. Floating layers use soft shadows.

| Token | Value | Used for |
|---|---|---|
| `--shadow-hair` | `1px 1px 0 rgba(0,0,0,.30)` | Rows and cards with a 1px hairline border |
| `--shadow-soft` | `2px 2px 0 rgba(0,0,0,.38)` | Buttons |
| `--shadow-card` | `3px 3px 0 rgba(0,0,0,.45)` | Raised cards |
| `--shadow-modal` | `0 18px 44px rgba(0,0,0,.62)` | Modals |

**Rules:** a row inside a bordered container takes no shadow (it reads as a seam). Pressed buttons drop their shadow and shift `1px, 1px`.

---

## 9. Buttons

| Button | Class | Rules |
|---|---|---|
| **Primary** | `.btn-save` | `--accent` fill, `--accent-deep` 1.5px border, `--on-accent` text, `--shadow-soft`. Marcellus `--fs-body` uppercase, +0.08em. `--r-sm`, `--space-3` padding. One per screen. |
| **Secondary** | `.btn-ghost` | Transparent, 1.5px `--line-warm` border, `--ink-muted` text. Same size as primary; sits beside it. |
| **Danger** | `.btn-save--danger` | Primary shape with `--danger` fill and `--danger-deep` border. Destructive actions only. |
| **Add** | `.btn-dashed` | Full width, 1.5px dashed `--line-warm`, gold uppercase text, plus icon. Trails a list. |
| **Icon** | `.icon-btn` | 42px circle, 1.5px `--line` border, `--bg-card`. Header controls. |
| **Glass** | `.glass-btn` | 42px circle, translucent and blurred. Only over the hero portrait. |
| **Disabled** | `:disabled` | Primary drains to the ghost look with `--ink-faint` text and no shadow — kept visible, reads as "nothing to do". Others use `opacity: var(--disabled-opacity)` (0.45). A hint below explains why, where it isn't obvious. |
| **Loading** | — | _TBD_ — no loading button state exists. |


---

## 10. Inputs

| State | Rules |
|---|---|
| **Default** | `.field__input` / `.field__area`: `--bg-input` (a recess), 1px `--line-hair` border, `--r-xs`, `--space-2-5` × `--space-3` padding, Spectral `--fs-input` (`--fs-body` for text areas), `--ink`. |
| **Label** | `.field__label`: Marcellus `--fs-caption` uppercase, +0.14em, `--gold`. "(optional)" in italic `--ink-faint`. |
| **Placeholder** | `--ink-faint`, italic. |
| **Focus** | `:focus-visible` → `--focus` border + `--focus-ring` glow. A borderless input inside a pill (notes search) shows focus on the pill via `:focus-within`. Any control that sets `outline: none` must draw its own focus. |
| **Error** | `.field__error status status--error`: italic `--fs-note` under the field, error glyph + `--danger-bright` (5.1:1). A warning about a field (an untrained weapon) uses `status--warn` instead. |
| **Disabled** | _TBD_ |

---

## 11. Cards

| Card | Padding | Border | Radius | Shadow |
|---|---|---|---|---|
| Character card (`.persona-card`) | `--space-3-5` | 1px `--line-hair` | `--r-md` | `--shadow-hair` |
| Collapsible row (`.collapse`) | `--space-3` × `--space-3-5` head and body | 1px `--line-hair`; body top 1px `--line-soft` | `--r-sm` | `--shadow-hair` (none inside a container) |
| Loadout row (`.load-row`) | `--space-3` × `--space-3` | 1.5px `--line`; chosen = 2px `--accent` + warm fill | `--r-sm` | none |
| Modal (`.modal__card`) | `--space-5` | 1px `--line-hair` + inset 5px gold rule | `--r-modal` | `--shadow-modal` |

Cards sit on `--bg-card`. A selected card gets the accent border and `--bg-parchment2`.

---

## 12. Navigation

| Element | Rules |
|---|---|
| **Header** | `.topbar`: back button (left), screen title, menu button (right). `--statusbar-clear` top padding. |
| **Menu** | A drawer from the right (82% width) over a `--scrim`, reached from every main screen. Holds Edit Character, Rules, Settings. |
| **Mobile navigation** | The character sheet has a bottom tab bar: Action · Character · Gear. Labels are Marcellus `--fs-caption` uppercase. Inactive is `--ink-faint`; active is `--accent-bright`. Top edge is a `--rule-strong` line. |
| **Sidebar** | None — the app is a single phone-width column. |
| **Modals** | Centered card over a scrim; one open at a time (`data-modal` on `.app`). |
| **Mechanism** | Screens, tabs, modals and the drawer switch via `data-view`, `data-tab`, `data-modal`, `data-menu` on `.app`; CSS decides what shows. |

---

## 13. States

| State | Rules |
|---|---|
| **Loading** | Portrait processing shows a spinner (slowed under reduced motion). No general loading pattern — _TBD_. |
| **Empty** | `.empty-note`: one italic Spectral `--fs-note` line in `--ink-faint` — one voice for "there is nothing here". The screen still shows its add button. |
| **Error** | Form: an error status line under the field (§10). Fatal: `.boot-error` full screen with a plain explanation. Import problems: a list of notes in the result window. |
| **Warning** | An amber status line with a triangle, where the consequence is (§13.1). |
| **Success** | A toast for actions with no other visible result; a green status line where a budget is complete (§13.1). Imports still report in their result window, since they carry notes. |
| **Disabled** | See §9. Explain why where it isn't obvious (`.wizard__hint`). |
| **Selected / on** | `aria-pressed="true"` plus `.is-on` or `data-chosen`; shown with an accent border or color, plus a mark (filled dot) — never color alone. |
| **Destructive confirm** | Destructive actions confirm first, with a danger primary button. |

### 13.1 Warning and success indicators

**Built 2026-10-05.**

**Tokens** (text-weight colors, checked on the page and on cards):

| Token | Value | On page | On card | Use |
|---|---|---|---|---|
| `--warning-bright` | `#f2a541` amber | 7.7:1 | 7.1:1 | Warning text and glyphs |
| `--warning-wash` | amber at 12% | — | — | Tint behind a warning box |
| `--success-bright` | `#8fbf6a` green | 7.4:1 | 6.8:1 | Success text and glyphs |
| `--success-wash` | green at 12% | — | — | Tint behind a success box |
| `--icon-warn`, `--icon-error`, `--icon-ok` | Lucide triangle-alert, circle-alert, circle-check | — | — | Glyphs as CSS masks, colored by the text |

Amber sits between the gold and the ember, so it is close to both. **A warning is never shown by color alone:** it always carries the triangle and words. Errors stay `--danger-bright`; there is no third red. The one exception is an over-budget count on a ✦ rule (`.rule__count--over`), which turns amber without a glyph because the numbers themselves say it ("5 / 4").

**Status line — `.status` + `.status--warn` / `--error` / `--ok`** (`primitives.css`)
- Glyph + words, placed where the problem is. The glyph is positioned (not a flex item), so the line can hold inline markup and wraps like ordinary text.
- Add the classes to the component: `<p class="confirm__text status status--warn">`. The variant's doubled class (`.status.status--warn`) lets its color win over the component's own text color.
- An empty status line is hidden (`:empty`), so a bound line with nothing to say this time draws nothing.
- Components that pad themselves restate the glyph offset in their own file (`.wizard__budget.status`, `.import__note.status`).

| Where | Variant |
|---|---|
| Field errors (missing name, item, note title, portrait problem) | `--error` |
| Untrained weapon on an item's detail | `--warn` |
| Consequences in a confirmation (delete is permanent, Downed, Boons lost to a Wound) — the danger button is the one red thing | `--warn` |
| Import notes that couldn't be restored | `--warn` |
| Wizard budget over / a class change cleared work | `--warn` (amber border + wash) |
| Wizard budget complete | `--ok` (green border + wash) |

**Toast — `pages/toast.html`, `toast.css`, `showToast(text, variant)` in `main.js`**
- A short confirmation after an action with no other visible result. Ink text with a status glyph.
- Sits at the bottom: above the tab bar on the sheet, lower elsewhere. One at a time — a new one replaces the old and restarts the timer.
- Disappears after 3 seconds (`TOAST_MS`); a tap dismisses it sooner.
- The live region (`role="status"`) is always in the page and only its text changes, so screen readers announce it reliably and focus never moves.
- Under reduced motion it fades without sliding.
- Never carries an action — anything that needs a decision is a modal. Never used for errors.

**Current triggers:** character saved (Edit → Dossier), character exported, backup saved, compendium exported. Imports already show a result window with notes, so they don't also toast. When storage refuses the Edit → Dossier save, the same toast says *"Updated for this session only — not saved."* with the `--warn` glyph instead.

**Storage alert — `pages/toast.html`, `toast.css`, `noteStorage(ok)` in `main.js`**
- The one notice that doesn't time out. Up while browser storage is refusing writes (full quota or blocked), so changes are living in memory only; down after the next write that gets through.
- Shares the toast's column at the foot of the app and its card styling, with an amber border so it doesn't read as something that will go away by itself. A toast stacks above it.
- Hidden while a modal is open, so it never covers a modal's buttons; back as soon as the modal closes.
- The card is a button to Settings, where Export All Characters writes a file that needs no browser storage.
- The live region (`role="alert"`) is always in the page and only its text changes, set once on the way into the failing state.

---

## 14. Icons

| | |
|---|---|
| **Library** | [Lucide](https://lucide.dev), inlined as SVG (no icon font, no dependency) |
| **Grid** | 24×24 viewBox |
| **Style** | Outline, round caps and joins, `stroke="currentColor"` so the icon takes its color from the text around it. Nothing filled. |
| **Default size** | 24px in headers, 18px in settings rows, 16px in dashed buttons. Also used: 12, 14, 20, 22, 26, 30, 32px. |
| **Stroke** | Set so the line **renders at ~1.5px whatever the icon's size**: `stroke-width = 1.5 × 24 ÷ size`. So 24px → 1.5, 22px → 1.6, 20px → 1.8, 18px → 2, 16px → 2.25, 14px → 2.5. That's why the raw `stroke-width` values differ. |
| **Bold tier** | ~2px rendered, for display glyphs and the accent button (home cards, the level-up button, 32px icons, carets). Use sparingly. |
| **Decorative** | Icons carry `aria-hidden="true"`; the button carries the `aria-label`. |
| **Brand marks** | Not drawn — use a generic glyph (e.g. a speech bubble, not the Discord logo). |

---

## 15. Responsive Design

The app is designed for phones and only phones, today.

| Context | Rules |
|---|---|
| **Mobile** | The design target. Preview frame is 402×874px. |
| **Tablet / Desktop** | Not designed. With the frame turned off ("full window"), the column grows to `--frame-max` (520px) and stops, so layouts never stretch past phone widths. |
| **Breakpoints** | One today: `max-width: 340px` collapses the bio grid to one column. Wider layouts are planned — see §15.1. |
| **Safe areas** | Bottom controls pad with `env(safe-area-inset-bottom)`. |
| **Reduced motion** | `prefers-reduced-motion` turns off dice animation and slows the spinner. |

### 15.1 Planned — wider layouts (not implemented)

The app will grow beyond phone width. Nothing below is built; `--frame-max` keeps the column at 520px until it is.

| Range | Name | Plan |
|---|---|---|
| < 600px | Phone | Today's layout. The design target, and always the baseline. |
| 600–1023px | Tablet | Still one column for the sheet, wider. Modals stay centered at a capped width. Rules may open as a side sheet rather than a full screen. |
| ≥ 1024px | Desktop | Two panes: the character sheet beside a persistent Rules reference — the PRD's "reference rules without leaving the character" made literal. Tab bar becomes a side or top nav. |

**Rules for when this is built:**
- Phone-first: base styles are the phone layout; wider layouts are added with `min-width` queries, never the other way round.
- Breakpoints become tokens-adjacent constants documented here; no ad hoc widths in screen files.
- Line length for rules text caps at ~70 characters regardless of screen width.
- Tap targets stay at least 44px even with a mouse.
- Raising `--frame-max` only happens alongside real layout work (as `tokens.css` already warns).

---

## 16. Accessibility

- Use semantic HTML.
- Maintain sufficient contrast — every foreground/background pair clears **WCAG AA (4.5:1)**, in every theme and mode.
- Support keyboard navigation.
- Provide visible focus states.
- Provide accessible labels.
- Do not rely only on color.

**Project rules:**
- ARIA only where semantics fall short. One-of-many choices are pressed buttons (`aria-pressed`), app-wide, for consistency.
- Icon-only buttons carry an `aria-label`; their SVG is `aria-hidden`.
- Content for screen readers only uses `.visually-hidden`.
- Clickable things are `<button>`s, not `<div>`s (e.g. the portrait is a button so it can be reached by keyboard).
- Where a `<button>` can't be used — a roll box nests inside a collapsible's header button, and buttons can't nest — use `role="button" tabindex="0"`. Enter and Space then press it automatically (one delegated `keydown` handler in `wire()` turns them into a click), so nothing else is needed.
- **Every press-and-hold has a keyboard twin: Shift+Enter.** Hold a To-Hit box for Advantage, hold a Patch box to spend one, hold the roller's delete key to clear. Advertise it with `aria-keyshortcuts="Shift+Enter"` on the control. A new hold gesture adds its control to the same handler.
- Respect `prefers-reduced-motion`.

---

## 17. Known Gaps

| # | Gap | Status |
|---|---|---|
| 1 | `--damage` used as text/icon color (2.3:1, fails AA) — 14 places: field errors, import warnings, minimum dice, Poison, delete icons | **Fixed 2026-10-05** — all now `--danger-bright`; `--damage` is fill-only |
| 2 | Text inputs had no visible focus state | **Fixed 2026-10-05** — `--focus` / `--focus-ring` on fields, calculator and notes search; existing focus styles moved off `--accent` (2.4:1) onto `--focus` |
| 3 | ~30 ad hoc font sizes | **Fixed 2026-10-05** — type scale tokens (§5.1); every app `font-size` migrated |
| 4 | No spacing tokens | **Fixed 2026-10-05** — spacing scale and layout constants (§6.1); every app `padding` / `margin` / `gap` migrated |
| 5 | Disabled opacity was 0.35 / 0.45 / 0.55 | **Fixed 2026-10-05** — `--disabled-opacity` (0.45) |
| 6 | Icon stroke weights looked inconsistent | **Fixed 2026-10-05** — they were mostly size-compensated on purpose; rule documented (§14), three outliers that rendered thin corrected |
| 7 | `.account__btn` text used `--bg-card` instead of `--on-accent` | **Fixed 2026-10-05** |
| 8 | Theme picker records a choice that nothing reads | On hold — other themes not in progress (§3) |
| 9 | No warning color, no loading state, no success feedback | Warning and success **built 2026-10-05** (§13.1). Loading state still _TBD_ |
| 10 | Roll boxes and gear/armour rows announced as buttons but ignored Enter/Space; the three hold gestures (Advantage, Patch spend, clear roller) had no keyboard path; Wound pips were spans a keyboard couldn't reach | **Fixed 2026-11-13** — Enter/Space on every `role="button"`, Shift+Enter for every hold, Wound pips are buttons (`e2e/keyboard.spec.js`) |
| 11 | Most buttons show the browser's default focus ring rather than `--focus` / `--focus-ring` | Open — visible, so not a blocker; a global `:focus-visible` rule would bring them in line |
