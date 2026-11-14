# Meeple Monster File — `.meeple.json` (bestiary)

**Status:** `schemaVersion: 1` · Last revised 2026-11-13

A **monster file** carries enemy stat blocks out of a campaign — to another
campaign, another GM, or a future **monster compendium**. Written by
`exportEnemies()` in `resources/js/main.js` (Enemies tab → **Export all**, or one
enemy's ⋯ → **Export**) and read by `importEnemies()` (Enemies tab → **Import**),
both through `bestiaryFile()` / `readBestiary()` in `resources/js/campaign.js`.

> Not a character file (`character-file.md`) and not a compendium
> (`library-schema.md`). Each importer names the other when it is handed the
> wrong one.

## 1. The envelope

```json
{
  "meepleBestiary": { "schemaVersion": 1, "exported": "2026-11-13", "title": "The Ashen Road" },
  "enemies": [
    {
      "id": "enemy_3f9c…",
      "name": "Ogre Brute",
      "tags": ["Boss", "Large"],
      "turns": 2,
      "stats": { "hp": 40, "mana": 0, "wounds": 0, "evasion": 10, "armor": 3, "fortitude": 8, "speed": 4 },
      "attacks": [
        { "id": "atk_…", "name": "Greatclub", "toHit": 5, "damage": "2d8+3",
          "piercing": false, "mana": 0, "tags": [], "desc": "Knockback 2" }
      ],
      "notes": "Hates fire."
    }
  ]
}
```

| Field | Notes |
|---|---|
| `meepleBestiary.schemaVersion` | The shape of this document. A file **newer** than the app understands is refused; every older one is read. |
| `meepleBestiary.title` | Where it came from — the campaign's name for **Export all**, the enemy's for a single export. |
| `enemies[]` | Stat blocks in the shape `normalizeEnemy()` keeps (`database.md` A3b). `rev` and `updated` are stripped: they are facts about one device's copy, not about the monster. |

**A stat block** is the player's combat stats less what an enemy does not track
(Power, Lethality and the rest — designer ruling, 2026-11-13): `hp`, optional
`mana`, optional `wounds` (empty = one health bar that downs at 0), `evasion`,
`armor`, `fortitude`, `speed`; `turns` a round (a boss can have several);
`attacks[]` with a to-hit bonus and a damage expression. An enemy has no
Lethality, so its rolls crit on a natural 20 only.

## 2. Reading one

- Every enemy is a **copy**: fresh ids for it and its attacks. Importing the same
  file twice gives two cards — a monster file is a catalogue to draw from, never
  a claim on a card already here.
- Every enemy passes through `normalizeEnemy()` — the one door in. Numbers are
  clamped, strings capped, unknown fields dropped, and a **damage expression the
  dice engine refuses is dropped** rather than kept as a box that errors when
  pressed.
- Refused, with a message: not JSON / not this envelope ("Not a monster file"),
  a newer `schemaVersion` ("Made by a newer Meeple"), no usable enemies
  ("Nothing to import").

## 3. Versioning

The character file's rules (`character-file.md` §6): bump `schemaVersion` only
for a change that breaks older readers. Adding an optional field to a stat block
is not one.

## 4. Toward a monster compendium

The stat-block shape is the intended compendium entry. When the compendium is
built, a file of this kind is what it imports; campaigns keep their own
**copies**, so editing a goblin in one campaign never changes the compendium.
