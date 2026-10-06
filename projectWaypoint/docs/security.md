# Security Guidelines — Waypoint Companion App

> **What this doc is for:** security as a project requirement, not a final polish step — authentication, authorization, secrets, input handling, data protection, and the rules that keep them true.
>
> **Status:** the app is **client-only and local-first** (`architecture.md`). There are no accounts, no server, no API, and no secrets today. So this doc has two kinds of content:
> - **Today** — the real attack surface of a static app that reads files players send each other. Built protections, and known gaps.
> - **Future (Open)** — rules for when accounts and sync arrive (`prd.md` §8, Nice to Have). Written now so they shape that design rather than get bolted on after.
>
> **Related docs:** [`architecture.md`](architecture.md) · [`database.md`](database.md) (data model, sensitive fields) · [`character-file.md`](character-file.md) · [`library-schema.md`](library-schema.md)

---

## 0. Threat Model — today

With no server, nothing can be stolen from *us*. What can go wrong happens on the player's device:

| Risk | How it could happen | Why it matters |
|---|---|---|
| **Malicious file** | Character and compendium files are shared between players — Discord, email, AirDrop. A crafted file could carry markup or script in a name, note, or description. | **The main risk.** If any imported text reached the page unescaped, it could run script in the app and read or wipe every character on the device. |
| **Storage exhaustion** | A huge file or image fills the ~5 MB of storage. | Saves start failing; play continues but won't persist. |
| **Private data on a shared device** | Portraits (often real people), notes, and bios sit in the browser's storage. | Anyone using that browser can see them. |
| **Third-party requests** | The app loads fonts from Google. | Reveals the player's IP address to Google; the only outside request the app makes. |

---

## 1. Authentication

**Today:** none. The Sign in / Sign out controls are placeholders that set a local flag (`waypoint.account`) — they authenticate nothing and must not be described to players as an account.

**Authentication Provider:** **Open** — chosen together with the database host (`database.md` B1). Prefer a provider that handles password storage, resets, and sessions, so we never store passwords ourselves.

**Methods** (Open — to decide):
- **Magic link (email)** — no password to forget or leak; suits occasional players.
- **OAuth** (Google, Apple, Discord) — Discord fits the TTRPG audience.
- **Email / password** — only through the provider; never hand-rolled.

**Rules when built:**
- **Signing in must stay optional.** The app works fully without an account (`prd.md` §8).
- Sessions use the provider's tokens, stored the way the provider recommends — never inside character data or exported files.
- Signing out never deletes characters from the device (already true of the placeholder).

---

## 2. Authorization

**Today:** not applicable — one device, one person, no shared data.

**Roles (proposed, Open):**

| Role | Permissions |
|---|---|
| **Player** | Create, read, update, delete **their own** characters and portraits. Nothing else. |
| **Guide (GM)** | *If the GM hub is built:* read characters that players have shared into their party/campaign. **Read-only** unless a later decision says otherwise. |
| **Admin** | Operational access only (support, abuse, data deletion requests). Not used for normal play. |

**Rules:**
- **Authorization must be enforced server-side** — in the database (row-level security or equivalent), not only in the app. The app's checks are for usability; the server's are for security.
- A player can only ever reach rows where `user_id` is their own (`database.md` B5).
- **Sharing is explicit.** A GM sees a character only after its player shares it, and the player can withdraw it.

---

## 3. Secrets

**Today:** the app has **no secrets**. Everything in the repository is meant to be public.

**Rules** (apply from the first secret onward):
- Never hard-code credentials.
- Never commit production secrets — the repository is on GitHub.
- Never expose private secrets to the client. **Anything in a static site's JavaScript is public**, so only keys designed to be public (e.g. a provider's anon/publishable key, protected by row-level security) may ever appear there.
- Use environment variables or the host's secret store for anything private.
- Rotate compromised credentials immediately.
- **Open:** where secrets live once there is a server (host's secret store).

---

## 4. Environment Variables

**Today:** none — no build step, no server.

**Public (Open):** e.g. the database/auth provider's URL and public key. With no build step these would live in a small config script, which is fine *only* for keys designed to be public.
**Private (Open):** service-role / admin keys. Server-side only, never in this repository, never in the browser.

---

## 5. API Security

**Today:** no API. The app's "API" is the **file importer** — the one place untrusted data enters — so these rules apply to it now:

### Input validation — built

- **Everything from storage or a file is checked, not trusted** (`database.md` A6): names and bio fields trimmed and capped; stats rebuilt from the fixed attribute list; unknown fields dropped; spent resources clamped.
- **File type is checked by content, not name.** A character file must have the `waypointCharacter` envelope; a compendium must have the `waypoint` block. The wrong kind is refused with a message naming it.
- **Newer schema versions are refused**, never half-imported.
- **Content ids are whitelisted by collection.** Imported entries are merged only when their id matches its own key and starts with a known collection (`class.`, `skill.`, `gear.`…); anything else is ignored.
- **Portraits from files** are accepted only as image data URLs (`data:image/…;base64,`); anything else is dropped.
- **Dice expressions** are parsed by a hand-written parser — never `eval()` — with limits (1–100 dice, 2–1000 sides).

### Output encoding — built

- **Text is escaped before it becomes markup.** Every render that builds HTML from data passes text through `esc()` (escapes `& < > "`). This is what stops a malicious name or note from running script.
- **Rule:** attribute values in generated markup are always **double-quoted** — `esc()` doesn't escape `'`, so a single-quoted attribute would be unsafe.
- **Rule:** no `eval()`, `new Function()`, `document.write()`, inline event handlers (`onclick="…"`), inline `<script>`, or inline `style="…"` attributes — none exist; keep it that way. The Content Security Policy now **enforces** this: any of them would be refused by the browser.

### Content Security Policy — built 2026-10-05

A `<meta http-equiv="Content-Security-Policy">` tag in `index.html` is the backstop behind `esc()`: if an escaping bug ever let markup onto the page, the browser still refuses to run it.

```text
default-src 'self'; script-src 'self';
style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com;
img-src 'self' data: blob:; connect-src 'self';
object-src 'none'; base-uri 'self'; form-action 'none'
```

- No `'unsafe-inline'` and no `'unsafe-eval'` anywhere. JS may still set CSS custom properties through `el.style.setProperty()`, which a CSP does not block.
- **Changing a source is a security decision** — record why here. Self-hosting the fonts (Gap 4) would let the two Google entries go.
- A `<meta>` CSP can't set `frame-ancestors` (clickjacking protection); that needs a real HTTP header from the host. **Open** — with hosting.

### Rate limiting, CORS, authentication, authorization — Open

For the future API:
- **Rate limiting:** per user and per IP on auth endpoints and writes. **Open** — usually provided by the host.
- **CORS:** allow only the app's own origin(s).
- **Authentication:** every request carries the provider's token; anonymous access is read-nothing.
- **Authorization:** enforced in the database (§2), not by the API alone.
- **Validation:** the server re-validates everything the app validates (§5 above) — anything can call an API directly.

---

## 6. Data Protection

**Sensitive data:**

| Data | Where today | Sensitivity |
|---|---|---|
| Portraits | Device storage; inside exported files | Often a photo of a real person |
| Notes, bio | Device storage; inside exported files | Free text — players may write anything |
| Account email | Not collected yet | Personal identifier (Open) |

**Encryption:**
- **Today:** device storage is not encrypted by the app — it relies on the device's own protection. Exported files are plain, readable JSON **by design** (`character-file.md` §1), so a file shared is a character shared, photo and notes included.
- **Future:** HTTPS for everything; encryption at rest from the database/storage provider. **Open.**
- **Hosting:** the app must be served over **HTTPS** in production. **Open** — with hosting.

**Retention and deletion:**
- **Today:** data stays until the player deletes it. Deleting a character removes its record and portrait immediately and permanently (`database.md` A7).
- **Future (Open):** how long a deleted character is recoverable (soft delete, `database.md` B8); deleting an account removes all its characters and portraits; how a player requests their data or its deletion.

**Player-facing honesty:**
- The share flow should make clear that a character file includes the portrait and notes. **Open** — check the share window's wording.

---

## 7. Logging

**Today:** the app sends no logs or analytics anywhere. Errors stay in the browser.

**Rules when logging exists:**

Never log:
- Passwords, API keys, tokens
- Portraits, notes, bios, or whole character documents
- Email addresses beyond what auth events require

Log:
- Authentication events (sign-in, sign-out, failures)
- Important actions (character deleted, account deleted, sharing changed)
- Errors (without the data that caused them)
- Security events (refused requests, rate-limit hits)

**Open:** whether to add analytics at all — and if so, privacy-respecting and disclosed.

---

## 8. File Uploads

"Uploads" today means **files the player picks** — nothing leaves the device.

| | Portraits | Character / backup files | Compendium files |
|---|---|---|---|
| **Allowed types** | Any image the browser can decode (`accept="image/*"`); must report an `image/` type | `.json` | `.json` |
| **Maximum size** | 25 MB input; re-encoded to JPEG, ≤ ~400 KB stored | **10 MB**, checked before reading | **10 MB**, checked before reading |
| **Validation** | Decoded and re-drawn to a canvas, then re-encoded — the stored image is newly made pixels, not the original file | Envelope, schema version, field-by-field clamping (§5) | Envelope, schema version, id whitelist (§5) |
| **Storage** | Device storage, own key per character | Device storage | Device storage |

**Why re-encoding matters:** a portrait is never stored as the file that was picked — it is decoded and redrawn, which strips metadata (including photo location data) and anything hidden in the original file.

**Future (Open):** portraits in server object storage — private bucket, per-user path, size and type re-checked server-side, served only to the owner (`database.md` B3).

---

## 9. Known Gaps

| # | Gap | Risk | Proposed fix |
|---|---|---|---|
| 1 | ~~No size limit on imported JSON files~~ | — | **Closed 2026-10-05.** `MAX_IMPORT_BYTES` (10 MB) in `main.js`, checked in `readWaypointFile()` before the file is read. 10 MB is safely above anything the app can write, since all its data must fit in ~5 MB of storage. Tested in `security.spec.js`. |
| 2 | ~~No Content Security Policy~~ | — | **Closed 2026-10-05.** See §5. Required removing the app's last inline `style` attributes (gear slots now use `data-span`). Tested: an injected inline script and inline handler are refused. |
| 3 | **Escaping audit — mostly closed** | One missed field from an imported file would be an XSS hole (the CSP would still stop it running) | **2026-10-05:** `security.spec.js` imports `malicious.waypoint.json` — payloads in the name, every bio field, notes, inventory, abilities, passives, an ability's `kind`, a fake portrait and a restored content entry — visits the roster, all sheet tabs with every row expanded, and Edit, then checks that no element gained a handler, no payload ran, there were no CSP violations, and the text shows literally. Proven to catch a removed `esc()`. **Remaining:** screens the test doesn't open yet — the backpack and item-detail modals, the notes search highlight, the share window. |
| 4 | **Google Fonts is a third-party request** | Shares the player's IP with Google; a privacy disclosure item | Self-host the font files (they're open-licensed) |
| 5 | **Share flow may not say the file includes the photo and notes** | Players could share more than they mean to | Review the share window's copy |
| 6 | **Production hosting unknown** | Must be HTTPS | Decide with hosting (`architecture.md`) |

---

## 10. Security Checklist

**Today (client-only):**
- [x] Imported files validated (type, schema version, field clamping, id whitelist)
- [x] Text escaped before rendering
- [x] No `eval()` / `new Function()` / inline scripts
- [x] Portraits re-encoded, size-limited, metadata stripped
- [x] Errors shown to players are plain-language and expose nothing sensitive
- [x] Dependencies reviewed — there are none (fonts aside)
- [x] Import file size limit (Gap 1)
- [x] Content Security Policy (Gap 2)
- [x] Malicious-file test (Gap 3) — remaining screens listed in §9
- [ ] Self-hosted fonts (Gap 4)
- [ ] Served over HTTPS in production (Gap 6)

**When accounts and sync are built:**
- [ ] Authentication implemented (via a provider)
- [ ] Authorization implemented and enforced server-side (row-level security)
- [ ] Server-side validation mirrors the app's
- [ ] Secrets protected; only public keys in the client
- [ ] Sensitive data protected (private storage, encryption at rest)
- [ ] Rate limiting configured
- [ ] File uploads re-validated server-side
- [ ] Errors do not expose sensitive details
- [ ] Retention and account deletion defined
- [ ] Dependencies reviewed (the provider's client library would be the first)
