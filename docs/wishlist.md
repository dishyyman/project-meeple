# Wish list — UX details to revisit

Parked ideas, not commitments. Each came out of a 20-item UX review (2026-11-20) that checked the app against well-known interaction details. Seven were built, one was already in place, and these twelve were set aside. Each entry says what it would mean for Meeple, what it depends on, and roughly how big it is.

When one is picked up, move it to the PRD (`prd.md`) or build it, and delete it here.

**Already built from the same review**, for reference: undo toasts after removals (§ Toast in `design-system.md`), view transitions between screens (a cross-fade, `frame.css` "changing screens"), drag-to-dismiss bottom sheets, interruptible sheet motion, 44px tap targets (hit slop, `primitives.css`), balanced headings, and continuous corners. Safe-area insets were already in place.

---

## Worth considering

### Tabular numbers
**What it would mean:** numbers that change in place — Health "9 / 12", Mana, a dice total, the fight's round count — would keep the same width, so nothing beside them shifts as they tick.
**Why it was skipped:** the CSS (`font-variant-numeric: tabular-nums`) does nothing with our fonts. Measured 2026-11-20: Spectral's digits are already all the same width, and Marcellus — the face numbers are set in (`--font-label`) — has no tabular-figure feature at all (its digits run from 604 to 1651 units wide).
**To do it:** a design decision first — set live readouts in a face that has fixed-width digits (Spectral, or a Marcellus-like face with `tnum`), probably as a `--font-numeral` token. Then small.

### Shortcut hints
**What it would mean:** players would see each action's keyboard shortcut (⌘ on Mac, Ctrl elsewhere) in menus and tooltips, not only hear it in a screen reader.
**Today:** the only shortcut is Shift+Enter, the keyboard twin of every press-and-hold (Advantage, spending a Patch). It is announced through `aria-keyshortcuts` and only fires on the focused control, so it can never fire while someone is typing in a field.
**To do it:** only worth it with real app-wide shortcuts — e.g. for a GM at a laptop: R to roll, N for next turn — and best built together with the command menu below. On a phone it does nothing.

### Skeleton loaders
**What it would mean:** on a first visit over a slow connection, grey outlines of the Home screen instead of a blank frame while the screens load. (Only shown if loading takes longer than about 300ms.)
**Why it was skipped:** everything the app shows is on the device and appears at once; the only wait is `boot.js` fetching the `pages/` fragments. A skeleton would need placeholder markup in `index.html`, which the shell-only rule (`CLAUDE.md`) keeps out.
**Better first step:** a service worker that caches the app. The second visit and every visit after would then be instant and work offline — which also helps a game played somewhere without signal.

---

## If the Game Master Tools grow

### Command menu (Cmd+K / Ctrl+K)
**What it would mean:** a keyboard search over every screen and action — "goblin", "next round", "long rest", "Elara".
**Why it was skipped:** the idea is for apps used every day; Meeple is used at the table, mostly on a phone. Rules already have their own search.
**When it would pay:** a GM running fights from a laptop. Pairs with shortcut hints above.

### Safe triangle for submenus
**What it would mean:** a hover menu with submenus that doesn't switch while the pointer cuts diagonally toward the open submenu.
**Why it was skipped:** the app has no hover menus or submenus — it is touch-first (drawer, action sheets).
**When it would pay:** only if a desktop layout ever adds nested hover menus.

---

## Needs a server (accounts or sync)

These arrive together the day the app gets accounts or syncs between devices. The "Sign in" button is a placeholder for that, and `architecture.md` Decision 12 sketches the sync.

### One-time-code autofill
**What it would mean:** signing in with a texted code that the iPhone fills in automatically — one field with `autocomplete="one-time-code"` and `inputmode="numeric"`, and a text message ending in a line like `@meeple.example #123456`.
**Depends on:** sign-in by phone number, and an SMS service.

### Idempotency keys
**What it would mean:** an action that creates a record — a campaign uploaded, a character shared — sends the same unique key on every retry, so a flaky connection can never make two. Its button is disabled while the request runs.
**Head start:** every campaign record already carries an id and a revision (`campaign.js`, "EVERY RECORD CARRIES { id, rev, updated }"), which is most of the shape.
**Depends on:** sync, or payments if content is ever sold.

### Stale-while-revalidate
**What it would mean:** show the copy already on the device at once, and fetch the latest quietly behind it — again when the app comes back to the front or the network returns. Exactly what a shared campaign players can view would want.
**Not for:** anything where an old number costs something (none today).
**Depends on:** sync.

### Optimistic updates
**What it would mean:** small changes (a wound, a renamed hero) show instantly and are taken back, with a message, if the server refuses them.
**Head start:** the on-device version already exists — a write the browser refuses is held in memory under the standing storage alert, and a refused import is undone (`main.js`, "PERSISTENCE"; `architecture.md`, storage unavailable).
**Depends on:** sync.

### BlurHash / ThumbHash placeholders
**What it would mean:** a blurred preview, at the portrait's exact size, while the real portrait downloads.
**Why it was skipped:** portraits are stored on the device and show instantly.
**Depends on:** portraits moving to a server.

---

## Don't apply (recorded so they aren't re-proposed)

### Prerendering (speculation rules)
Loads other pages ahead of a tap. Meeple is one page whose screens switch in place (`data-view`), so there is nothing to load ahead — and speculation rules would mean loosening the Content Security Policy (`security.md`).

### Predictive back (Android)
An Android-app API (`OnBackPressedCallback`) that previews the screen behind during the back gesture. Android's back already reaches the app through browser history (`architecture.md` Decision 13). The preview would only come with wrapping Meeple as a native Android app.
