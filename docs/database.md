# Database — Meeple Companion App

> **What this doc is for:** the source of truth for the data model — what data exists, how it's named, how pieces relate, and the rules for changing it.
>
> **Don't invent tables, fields, or relationships.** If something new is needed, propose it here with its implications first.
>
> **Status:** there is **no server database yet**. All data lives on the player's device (browser `localStorage`). This doc records:
> - **Part A — the data model as built**, on the device. This is real and shipped.
> - **Part B — the server database**, for future account sync. Mostly **Open**: options, implications, and things to research, not decisions.
>
> **Related docs:** [`architecture.md`](architecture.md) (storage keys, sync decision) · [`character-file.md`](character-file.md) (the character's shape, as exported) · [`library-schema.md`](library-schema.md) (game content and ids) · [`prd.md`](prd.md) §8 (account sync is Nice to Have)

---

# Part A — The data model today (on device)

## A1. Engine

| | |
|---|---|
| **Database** | Browser `localStorage` — string key → JSON string, per browser, per site |
| **Hosting** | The player's own device. Nothing leaves it except through a file export the player starts |
| **Capacity** | ~5 MB per site, shared by every character and portrait (`architecture.md` Decision 3) |

## A2. What's stored

| Store (key) | One per | Holds |
|---|---|---|
| `meeple.roster` | device | `{ ids: [...], activeId }` — which characters exist, in roster order, and which is open |
| `meeple.character.<id>` | character | The character's play state and build (shape below) |
| `meeple.character.<id>.portrait` | character | The portrait, a JPEG data URL (≤ ~400 KB) |
| `meeple.library` | device | A compendium installed in place of the built-in one (`library-schema.md`) |
| `meeple.imported-entries` | device | Content entries that filled gaps, from an imported character or a compendium Add |
| `meeple.account` | device | Placeholder `{ signedIn, name }` — no real account behind it |
| `meeple.campaigns` | device | *(Game Master Tools)* `{ ids: [...], activeId }`, the campaign list in display order, as `meeple.roster` is for characters |
| `meeple.campaign.<id>` | campaign | *(Game Master Tools)* One campaign: heroes, enemies, the fight in progress (A3b). Not yet in Settings → Backup |
| `meeple:frame` | device | Preview frame preference (`phone` / `full`). Desktop only — on a phone the app is always full and this is ignored, not overwritten |

**Not stored, by design:**
- Anything **derived** — level, maximum health and mana, the Wound track, Patch maximum, proficiencies, Evasion, Armor, to-hit, Power. All computed from the build and the compendium (`architecture.md` Decision 6).
- **Game content** inside a character. A character holds content **ids** only; the compendium supplies the content.
- **Transient UI state** — which screen, tab, or modal is open; the creation wizard's draft.

## A3. The character record

The shape `save()` writes — documented field by field in `character-file.md` §3. Summary:

| Group | Fields | Notes |
|---|---|---|
| Identity | `id` (the storage key, not in the body), `name`, `bio { age, height, weight, eyes, hair }`, `portraitView { x, y, zoom }` | Portrait itself is stored separately |
| Build | `build { origin, levels[], hpFrom }`, `stats[]` (6 attributes), `skills[] { id, rank }` | `levels.length` *is* the level |
| Equipment | `armorWorn`, `hands[] { id }`, `equipment[]` (ids), `inventory[] { id, title, desc, mods }` | Inventory items are player-made, not compendium content |
| Spent resources | `health`, `mana`, `wounds`, `patches` | What's *left*, never the maximum |
| Abilities | `abilities[] { id, kind, title, dmg / heal, toHit, cost { ap, rp, mana }, desc }`, `passives[] { id, title, desc }` | Player-authored for now; may become compendium content (`character-file.md` §7) |
| Play | `effects[]` (Boons/Conditions with stacks), `notes[] { id, title, body, created }` | |

## A3b. The campaign record (Game Master Tools)

Built and checked by `campaign.js` — `newCampaign()`, and `normalizeCampaign()` on every read. Every record carries `id` (random token), `rev` (change counter) and `updated` (ISO time), for a later sync (`architecture.md` Decision 12).

| Part | Fields | Notes |
|---|---|---|
| Campaign | `id`, `name`, `subtitle`, `created`, `rev`, `updated` | No "one-shot / campaign" type and no session count — the GM writes either in the subtitle |
| Hero | `id`, `characterId`, `source` (`file`/`manual`), `name`, `label`, `card`, `vitals`, `notes` | `characterId` is the player's own id, so a newer file updates the hero instead of adding a second |
| Card | `healthBase` (null = no class), `manaMax`, `woundsMax`, `patchesMax`, `base { evasion, armor, fortitude, speed }`, `build { … }` | The build half of every derived stat, from the player's device (`mechanics.js` `heroCard()`). Stored, not derived, on purpose: the GM's device has no build to derive it from |
| Vitals | `health`, `mana`, `wounds`, `patches`, `effects[] { id, stacks }` | Changed only through `mechanics.js` `vitals` rules |
| Enemy | `id`, `name`, `tags[]`, `turns`, `stats { hp, mana, wounds, evasion, armor, fortitude, speed }`, `attacks[] { id, name, toHit, damage, piercing, mana, tags[], desc }`, `notes` | Shaped as a future monster-compendium entry; a campaign keeps its own copy. Empty `wounds` = one HP bar, downed at 0 |
| Fight | `round`, `surprise`, `current`, `fighters[] { id, kind, heroId / enemyId, turns, taken, members[] { id, n, vitals } }` | A group sharing one turn is one fighter with several members, each with its own vitals |

## A4. Relationships

```text
roster ──1:many──► character ──1:0..1──► portrait
                       │
                       └──references by id──► compendium entries (subclass, skill, armor, weapon, gear)
                                                   ▲
                       imported-entries ──fills gaps in──┘
```

- A **character belongs to the device's roster.** Deleting it from the roster removes its record and portrait.
- A **character references compendium content by id** — never by copy. Replacing the compendium re-resolves every reference; an id the compendium doesn't have is dropped.
- **Content and characters are stored apart.** Changing or replacing content never writes to a character.

## A5. Naming conventions (as built)

| Thing | Convention | Example |
|---|---|---|
| Storage keys | `meeple.` + dotted lowercase path | `meeple.character.c1k2j3.portrait` |
| Record fields | camelCase | `armorWorn`, `portraitView`, `hpFrom` |
| Character ids | `c` + base-36 timestamp (+ counter if two land in the same millisecond) | `cmtg8pdvp` |
| Content ids | `<collection>.<slug>`, derived from the name | `subclass.hunter`, `skill.gymnast`, `gear.crowbar` |
| Player-made sub-records | `<kind>-<timestamp ms>` | `note-1727…`, `inv-1727…` |
| Timestamps | Unix milliseconds (`created` on notes); ISO `YYYY-MM-DD` dates in files | `"exported": "2026-08-30"` |
| File schema versions | integer `schemaVersion` in each file's envelope | `1` |

**Inconsistencies to know about:**
- `meeple:frame` uses a colon; every other key uses dots. Harmless, but new keys should use dots.
- The first-run character's id is `aurelia` although she's named Elara — kept so pre-roster installs need no migration (`main.js`, `SEED_CHARACTER`).

## A6. Validation (enforced on load and import)

Every stored or imported value is **checked, not trusted**. A corrupt value degrades to a safe default rather than crashing the app.

- **Name:** trimmed, max 60 characters; blank is rejected.
- **Bio fields:** trimmed, max 24 characters each; blank is allowed. Only the five known fields are kept.
- **Portrait:** must be an image data URL (`data:image/…;base64,`), otherwise ignored. Compressed to ≤ ~400 KB before storage.
- **Stats:** rebuilt from the fixed list of six attributes; unknown names dropped.
- **Content ids:** must resolve against the compendium; unresolvable ids are dropped.
- **Spent resources:** clamped to the character's current maximums (e.g. health ≤ max health, patches ≤ Patch maximum).
- **Ability cost:** only `ap`, `rp`, `mana` are kept; an unknown `kind` becomes `"ability"`.
- **Files:** a `schemaVersion` higher than the app understands is refused; lower is accepted. The wrong kind of file is refused with a message naming it. Files over 10 MB are refused before they are read (`security.md` Gap 1).

## A7. Deletion

**Hard delete, with confirmation.** Deleting a character removes its record and portrait immediately after a confirm dialog that warns it's permanent and suggests exporting first. There is no undo and no trash.

## A8. Migration rules (as practiced)

- **Keys:** an install from before the roster existed is adopted in place — its old key already matched the new scheme, so nothing is copied.
- **Character files:** follow `character-file.md` §6 — bump `schemaVersion` only for breaking changes; adding or removing an optional field is not breaking; a file exported today must stay readable by every later version.
- **Content ids:** renaming content uses `formerIds` so existing characters keep resolving (`library-schema.md` §2).

## A9. Seed data

- **First run:** one character, **Elara Starwhisper** (id `aurelia`), a level-5 Hunter, is written to storage so the sheet has something to show. Deleting her is permanent — she does not come back on reload.
- **Content:** the built-in compendium (`resources/js/library.js`), generated from `tools/csv/`.

---

# Part B — The server database (future, mostly Open)

Needed only when **account sync** (`prd.md` §8, Nice to Have) or the **GM hub** is picked up. Nothing here is decided.

## B1. Database engine

**Database:** **Open.**
**Hosting:** **Open.**

**Constraints any choice must meet:** shoestring budget, minimal maintenance, and the app stays a no-build static site (`architecture.md` Decision 1) — so the client must be able to talk to it without a bundler.

| Option | Shape | Fits because | Watch out for |
|---|---|---|---|
| **PostgreSQL via a hosted platform** (e.g. Supabase) | Relational + JSON columns | Auth, row-level security, and file storage in one service; JSON columns fit the character document; generous free tier | Its client library would be the app's first runtime dependency (or use its REST API directly) |
| **Document store** (e.g. Firebase Firestore) | Documents | A character is already a document; offline sync built in | Vendor lock-in; querying across characters (GM hub) is harder; security rules are their own language |
| **SQLite at the edge** (e.g. Turso, Cloudflare D1) | Relational | Cheap, simple | Needs a small API layer written by us; auth and file storage come from elsewhere |
| **Self-hosted** (e.g. PocketBase) | Relational | One binary, auth + files included | We maintain the server |

**To research:** free-tier limits vs. expected portrait storage; whether each can be used from a plain `<script>` without a build step; data export (no lock-in).

## B2. Naming conventions — proposed

Not decided; proposed so the first table doesn't set an accidental precedent.

| Thing | Proposed convention | Why |
|---|---|---|
| Tables | `snake_case`, plural | `users`, `characters` — the SQL norm |
| Columns | `snake_case` | `user_id`, `created_at`. The API layer maps to the app's camelCase |
| Primary keys | `id`, UUID | Generated client-side so a character created offline already has its final id. **Open:** keep today's `c…` ids, or issue UUIDs on first sync |
| Foreign keys | `<singular>_id` | `user_id` |
| Timestamps | `created_at`, `updated_at` (UTC, `timestamptz`) | `updated_at` is also what sync compares |

## B3. Tables — starting point

### `users`

**Purpose:** identify a player so their characters can be saved to and loaded from the cloud.

| Column | Notes |
|---|---|
| `id` | Primary key |
| `email` | Login identifier. Sensitive (§B9) |
| `name` | Display name (today's placeholder `account.name`) |
| `created_at`, `updated_at` | |

**Open:** if an auth provider owns user identity (most of the B1 options do), this becomes a thin *profile* table keyed to the provider's user id rather than storing email itself.

### `characters`

**Purpose:** a player's characters, synced from their devices.

**The open question:** *do characters need individual database entries, and how much of the character should be broken into columns?* Three options:

| Option | Shape | Pros | Cons |
|---|---|---|---|
| **1. One row per character, body as a JSON document** *(recommended starting point)* | A few real columns for what the server needs to know; the rest of the character in one JSON column, in the same shape as `character-file.md` §3 | Matches how the app already thinks (a character is one document); reuses the file format's versioning rules; sheet changes don't need database migrations; per-character sync and conflicts | Hard to query *inside* a character (e.g. "every character with skill X") — not needed until the GM hub |
| **2. Fully normalized** | `characters` plus `character_skills`, `character_items`, `character_notes`, `character_effects`… | Rich queries; the database enforces structure | Many tables; every sheet change is a migration; duplicates validation the app already does; much more work for a feature that doesn't need it |
| **3. One row per user, whole roster as one blob** | `rosters (user_id, data)` | Simplest | Every tap rewrites every character; two devices editing different characters still conflict; one bad write risks the whole roster |

**Option 1 columns (proposed):**

| Column | Notes |
|---|---|
| `id` | Primary key (see B2 on ids) |
| `user_id` | Owner → `users.id` |
| `name` | Lifted out of the body so a roster list doesn't need to read every document |
| `data` | The character document (`character-file.md` §3), minus the portrait |
| `schema_version` | Version of `data`'s shape, same rules as the file format |
| `revision` | Incremented on every write — sync uses it to detect a stale overwrite. **Open** |
| `created_at`, `updated_at` | |
| `deleted_at` | Only if soft delete is chosen (§B8). **Open** |

**About the template's fields:**
- `description` — today's closest equivalent is `bio`, which lives inside `data`. **Open:** is a separate free-text description wanted?
- `status` — no status exists today. **Open:** what would it mean — active vs. archived, or a soft-delete flag? Decide before adding.

### Portraits

**Not in the database row.** Stored as files in object storage, referenced by path (e.g. `portraits/<user_id>/<character_id>.jpg`), mirroring why the device keeps them under a separate key: they're ~100× larger than everything else. **Open:** provider (comes with the B1 choice).

### Game content (the compendium)

**Not in the database, for now.** Content ships with the app and as compendium files; characters reference it by id. **Open:** whether a server should host the latest compendium so players get updates without importing a file.

## B4. Relationships

```text
users ──1:many──► characters ──1:0..1──► portrait (object storage)
                      │
                      └──references by id──► compendium (not in the database)
```

One user can have many characters. A character belongs to exactly one user.

**Proposed for live campaigns** (`architecture.md` Decision 12 — nothing built):

```text
users ──1:many──► campaigns (as GM)
campaigns ──1:many──► campaign_members ◄──many:1── users
campaign_members ──0..1──► characters         (the hero a player joined with)
campaigns ──1:many──► campaign_enemies        (the GM's copies)
campaigns ──1:0..1──► fights
campaigns ──1:many──► invite_codes            (short, revocable, rate-limited)
```

- A **member's card** is written by the player's device only; **vitals** by the player or the GM, as operations applied in order; **notes, enemies and fights** by the GM only.
- Assumed visibility: members see each other's vitals, not enemy stats. **Open.**

## B5. Constraints — proposed

**Required:** `users.id`; `characters.id`, `characters.user_id`, `characters.name`, `characters.data`, `characters.schema_version`.
**Unique:** `users.email` (if stored here); `characters.id`.
**Foreign keys:** `characters.user_id → users.id`. **Open:** on user deletion — delete their characters (and portraits), since there's no reason to keep a deleted account's data.
**Access:** a user can only read and write their own rows — enforced in the database (row-level security or equivalent), not only in the app. Details belong in `security.md`.

## B6. Indexes — proposed

| Index | Reason |
|---|---|
| `characters (user_id)` | Loading a player's roster |
| `characters (user_id, updated_at)` | "What changed since my last sync" |

## B7. Data validation

- **The app's rules (A6) still apply** — validate on the way in, server-side as well as client-side, since anything can call an API.
- `data` must be valid JSON within a size cap (proposed: generous, e.g. 256 KB, since portraits are elsewhere). **Open:** exact cap.
- `schema_version` higher than the server understands is refused, same as files.
- **Open:** how much of the character document the server validates vs. trusts the app's loader to clamp.

## B8. Soft delete

**Open.** Today deletion is hard and immediate (A7).
- **For soft delete:** a synced delete is easy to do by accident on one device and hard to notice on another; a recovery window (e.g. 30 days via `deleted_at`) protects players.
- **Against:** more to build (filtering, purging) and personal data kept longer.
- **To decide with:** `security.md` (data retention) and the sync design.

## B9. Auditing

**Open.** Minimum proposed for sync to work at all:
- `created_at`, `updated_at`, `revision` on every character.
- **Created by / updated by:** implied by `user_id` while only the owner can write. Becomes relevant if a GM can edit.
- **Deleted by / activity history:** not planned. **Open** — useful for support ("my character disappeared"), at a storage cost.

## B10. Sensitive data

| Field | Why it's sensitive | Proposed protection |
|---|---|---|
| `users.email` | Personal identifier | Owned by the auth provider where possible; never shown to other players |
| Portraits | Often a photo of a real person | Private storage; access only by the owner (and GM, if ever allowed) |
| `notes`, `bio` (inside `data`) | Free text — players may write anything | Treated as private to the owner |
| Auth tokens | Account access | Never stored in the character data or in files |

**Open:** retention period, account deletion process, and any legal requirements — `security.md`.

## B11. Migration rules

Schema changes must:
1. **Be documented** — here, before the change.
2. **Have a migration** — for database structure. Changes *inside* the character document follow `schema_version` (A8), not database migrations.
3. **Be tested** — including against existing exported character files.
4. **Avoid breaking existing production data** — and never break a character file already in a player's hands.

Additional: **the device stays the primary store** (`prd.md` §8), so a server-side change must never leave a device unable to load its local copy.

## B12. Seed data

**Open.** Proposed for development: one test user with a few characters covering single class, multiclass, Downed, and a character with a portrait — matching the cases the app's loader already handles.

---

## Open Questions (summary)

1. Which database and host (B1)?
2. Keep today's character ids on sync, or issue UUIDs (B2)?
3. One JSON document per character (recommended), normalized tables, or one blob per user (B3)?
4. What would `description` and `status` mean on a character (B3)?
5. Should a server host the latest compendium (B3)?
6. How are edits to the same character on two devices reconciled — last write wins, `revision` check with a prompt, or merge (B3, B9)?
7. Soft delete with a recovery window, or hard delete (B8)?
8. GM hub: confirm the proposed live-campaign model and visibility (B4, `architecture.md` Decision 12)?
9. Retention and account deletion (B10, `security.md`).
