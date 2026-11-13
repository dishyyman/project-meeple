/* =====================================================================
   GENERATED FILE — DO NOT EDIT BY HAND.
   Source:    tools/csv/*.csv
   Regenerate: node tools/csv-to-json.mjs

   Declared as a plain global, like every script the app loads, so it is
   in place synchronously before main.js runs. Must load BEFORE main.js.
   ===================================================================== */
window.MEEPLE_LIBRARY = {
  "meeple": {
    "schemaVersion": 1,
    "title": "Meeple Core Compendium",
    "version": "0.1.0",
    "updated": "2026-10-05",
    "author": "Mikey"
  },
  "classes": [
    {
      "id": "class.rogue",
      "name": "Rogue"
    },
    {
      "id": "class.barbarian",
      "name": "Barbarian"
    },
    {
      "id": "class.elementalist",
      "name": "Elementalist"
    },
    {
      "id": "class.fighter",
      "name": "Fighter"
    },
    {
      "id": "class.knight",
      "name": "Knight"
    },
    {
      "id": "class.magician",
      "name": "Magician"
    },
    {
      "id": "class.monk",
      "name": "Monk"
    },
    {
      "id": "class.occultist",
      "name": "Occultist"
    },
    {
      "id": "class.ranger",
      "name": "Ranger"
    }
  ],
  "subclasses": [
    {
      "hp": 8,
      "wounds": 4,
      "patches": 4,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 1,
      "manaModel": "pool",
      "name": "Assassin",
      "armorTypes": [
        "Light",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "1H Range",
        "2H Range"
      ],
      "desc": "The classic master of the shadows that takes advantage of those who aren't looking.",
      "id": "subclass.assassin",
      "roles": [
        "Burst Damage",
        "Burst Damage",
        "Mobility"
      ],
      "classId": "class.rogue"
    },
    {
      "hp": 9,
      "wounds": 4,
      "patches": 4,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 1,
      "manaModel": "pool",
      "name": "Viper",
      "armorTypes": [
        "Light",
        "Medium",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "1H Range",
        "2H Range"
      ],
      "desc": "The Viper knows how to coat any weapon in poisons that will make their enemies fall to their knees within minutes.",
      "id": "subclass.viper",
      "roles": [
        "Damage over Time",
        "Sustained Damage",
        "Mobility"
      ],
      "classId": "class.rogue"
    },
    {
      "hp": 9,
      "wounds": 4,
      "patches": 4,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 1,
      "manaModel": "pool",
      "name": "Scoundrel",
      "armorTypes": [
        "Light",
        "Medium",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "1H Range",
        "2H Range"
      ],
      "desc": "This little rascal has sticky fingers and use their enemies' powers against them.",
      "id": "subclass.scoundrel",
      "roles": [
        "Control",
        "Sustained Damage",
        "Durability"
      ],
      "classId": "class.rogue"
    },
    {
      "hp": 11,
      "wounds": 4,
      "patches": 3,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 1,
      "manaModel": "pool",
      "name": "Berserker",
      "armorTypes": [
        "Light",
        "Medium",
        "Heavy",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "2H Melee"
      ],
      "desc": "This brickhouse will hit and not stop until their enemies are butt dust.",
      "id": "subclass.berserker",
      "roles": [
        "Burst Damage",
        "Sustained Damage",
        "Mobility"
      ],
      "classId": "class.barbarian"
    },
    {
      "hp": 12,
      "wounds": 4,
      "patches": 3,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 2,
      "manaModel": "pool",
      "name": "Oakheart",
      "armorTypes": [
        "Light",
        "Medium",
        "Heavy",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "2H Melee",
        "1H Focus",
        "2H Focus"
      ],
      "desc": "The Oakheart's veins flow with the blood of the forest and fills their muscles with the power to pull foes to their graves.",
      "id": "subclass.oakheart",
      "roles": [
        "Damage over Time",
        "Support",
        "Durability"
      ],
      "classId": "class.barbarian"
    },
    {
      "hp": 12,
      "wounds": 5,
      "patches": 3,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 1,
      "manaModel": "pool",
      "name": "The Beast",
      "armorTypes": [
        "Light",
        "Medium",
        "Heavy",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "2H Melee"
      ],
      "desc": "The Beast doesn't keep the two wolves inside of them locked away. They let them howl.",
      "id": "subclass.the-beast",
      "roles": [
        "Control",
        "Burst Damage",
        "Durability"
      ],
      "classId": "class.barbarian"
    },
    {
      "hp": 8,
      "wounds": 4,
      "patches": 4,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 3,
      "manaModel": "pool",
      "name": "Frostcaller",
      "armorTypes": [
        "Light",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "2H Melee",
        "1H Range",
        "2H Range",
        "1H Focus",
        "2H Focus"
      ],
      "desc": "The elegance of the Frostcaller empowers them to call upon pillars of ice from afar that impale those that barely perceive them.",
      "id": "subclass.frostcaller",
      "roles": [
        "Burst Damage",
        "Sustained Damage",
        "Control"
      ],
      "classId": "class.elementalist"
    },
    {
      "hp": 9,
      "wounds": 4,
      "patches": 4,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 3,
      "manaModel": "pool",
      "name": "Lightning",
      "armorTypes": [
        "Light",
        "Medium",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "2H Melee",
        "1H Range",
        "2H Range",
        "1H Focus",
        "2H Focus"
      ],
      "desc": "The Lightning Sorcerer dances with Lightning and fries those that would throw off their rhythm.",
      "id": "subclass.lightning",
      "roles": [
        "Sustained Damage",
        "Sustained Damage",
        "Mobility"
      ],
      "classId": "class.elementalist"
    },
    {
      "hp": 10,
      "wounds": 4,
      "patches": 4,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 3,
      "manaModel": "pool",
      "name": "Pyromancer",
      "armorTypes": [
        "Light",
        "Medium",
        "Heavy",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "2H Melee",
        "1H Range",
        "2H Range",
        "1H Focus",
        "2H Focus"
      ],
      "desc": "Pyromancer make it go BURN.",
      "id": "subclass.pyromancer",
      "roles": [
        "Burst Damage",
        "Mobility",
        "Damage over Time"
      ],
      "classId": "class.elementalist"
    },
    {
      "hp": 8,
      "wounds": 4,
      "patches": 4,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 1,
      "manaModel": "pool",
      "name": "Rook",
      "armorTypes": [
        "Light",
        "Medium",
        "Heavy",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "2H Melee",
        "1H Range",
        "2H Range"
      ],
      "desc": "The Rook is a master of strategy, using their enemies moves against them to find the moment to strike hard and fast.",
      "id": "subclass.rook",
      "roles": [
        "Control",
        "Support",
        "Durability"
      ],
      "classId": "class.fighter"
    },
    {
      "hp": 9,
      "wounds": 4,
      "patches": 4,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 0,
      "manaPerLevel": 0,
      "manaModel": "generated",
      "note": "Additional Note: the Spellsword’s main mechanic is to generate Mana in combat by fight enemies. Mana can be spent to increase damage, heal targets, or cast Spells. The Spellsword can use any available weapon as a Focus for the sake of casting Spells. The Spellsword’s abilities usually cost X Mana, X being an amount of Mana up to the total amount they have generated in combat.",
      "name": "Spellblade",
      "armorTypes": [
        "Light",
        "Medium",
        "Heavy",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "2H Melee",
        "1H Range",
        "2H Range",
        "1H Focus"
      ],
      "desc": "The Spellblade uses their momentum to harness the magical essence in the air around us and unleash it on their foes.",
      "id": "subclass.spellblade",
      "roles": [
        "Support",
        "Sustained Damage",
        "Durability"
      ],
      "classId": "class.fighter"
    },
    {
      "hp": 12,
      "wounds": 4,
      "patches": 4,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 1,
      "manaModel": "pool",
      "name": "The Jugg",
      "armorTypes": [
        "Light",
        "Medium",
        "Heavy",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "2H Melee",
        "1H Range",
        "2H Range"
      ],
      "desc": "The Jugg take hit. The Jugg hit back. Hard.",
      "id": "subclass.the-jugg",
      "roles": [
        "Damage over Time",
        "Mobility",
        "Durability"
      ],
      "classId": "class.fighter"
    },
    {
      "hp": 10,
      "wounds": 4,
      "patches": 5,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 2,
      "manaModel": "pool",
      "name": "Revenant",
      "armorTypes": [
        "Light",
        "Medium",
        "Heavy",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "2H Melee",
        "1H Focus",
        "2H Focus"
      ],
      "desc": "This Knight of Death calls forth the power of the grave that beckons to its foes and pays the ferryman's toll with the blood of others.",
      "id": "subclass.revenant",
      "roles": [
        "Burst Damage",
        "Damage over Time",
        "Durability"
      ],
      "classId": "class.knight"
    },
    {
      "hp": 10,
      "wounds": 4,
      "patches": 6,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 2,
      "manaModel": "pool",
      "name": "Paladin",
      "armorTypes": [
        "Light",
        "Medium",
        "Heavy",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "2H Melee",
        "1H Focus",
        "2H Focus"
      ],
      "desc": "This devout warrior channels the power of their deity to bring forth judgement upon their foes and to aid their friends in need.",
      "id": "subclass.paladin",
      "roles": [
        "Burst Damage",
        "Durability",
        "Support"
      ],
      "classId": "class.knight"
    },
    {
      "hp": 12,
      "wounds": 4,
      "patches": 4,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 2,
      "manaModel": "pool",
      "name": "Crusader",
      "armorTypes": [
        "Light",
        "Medium",
        "Heavy",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "2H Melee",
        "1H Range",
        "2H Range",
        "1H Focus"
      ],
      "desc": "The Crusade brought this warrior to the front and the front is where they plan to stay as they push the battleline further into enemy territory.",
      "id": "subclass.crusader",
      "roles": [
        "Support",
        "Durability",
        "Control"
      ],
      "classId": "class.knight"
    },
    {
      "hp": 8,
      "wounds": 4,
      "patches": 4,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 2,
      "manaModel": "pool",
      "name": "Mirrormage",
      "armorTypes": [
        "Light",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "1H Focus",
        "2H Focus"
      ],
      "desc": "The Mirrormage, the Master of Illusions, uses trickery to command the battlefield and take down their enemies.",
      "id": "subclass.mirrormage",
      "roles": [
        "Mobility",
        "Mobility",
        "Burst Damage"
      ],
      "classId": "class.magician"
    },
    {
      "hp": 8,
      "wounds": 4,
      "patches": 4,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 3,
      "manaModel": "pool",
      "name": "Psychic",
      "armorTypes": [
        "Light",
        "Medium",
        "Shields"
      ],
      "weaponTypes": [
        "1H Focus",
        "2H Focus"
      ],
      "desc": "This psionic warrior disrupts the minds of its enemies to bring them to their knees.",
      "id": "subclass.psychic",
      "roles": [
        "Damage over Time",
        "Control",
        "Sustained Damage"
      ],
      "classId": "class.magician"
    },
    {
      "hp": 10,
      "wounds": 4,
      "patches": 4,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 3,
      "manaModel": "pool",
      "name": "Chronomancer",
      "armorTypes": [
        "Light",
        "Medium",
        "Heavy",
        "Shields"
      ],
      "weaponTypes": [
        "1H Focus",
        "2H Focus"
      ],
      "desc": "This Master of Time takes advantage of their enemies' perception of time to extend to fight within themselves.",
      "id": "subclass.chronomancer",
      "roles": [
        "Support",
        "Durability",
        "Sustained Damage"
      ],
      "classId": "class.magician"
    },
    {
      "hp": 8,
      "wounds": 4,
      "patches": 4,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 1,
      "manaModel": "pool",
      "name": "Ninja",
      "armorTypes": [
        "Light",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "1H Range",
        "2H Range"
      ],
      "desc": "The Ninja uses smoke and shadows to evade their enemies and remain unseen as they turn the tide of the battle.",
      "id": "subclass.ninja",
      "roles": [
        "Support",
        "Control",
        "Mobility"
      ],
      "classId": "class.monk"
    },
    {
      "hp": 9,
      "wounds": 4,
      "patches": 4,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 2,
      "manaModel": "pool",
      "name": "Acolyte",
      "armorTypes": [
        "Light",
        "Medium",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "1H Range",
        "2H Range"
      ],
      "desc": "\"Water. Earth. Fire. Air. Long ago, the four nations lived together in harmony. Then, everything changed when the Fire Nation attacked. Only the Avatar, master of all four elements, could stop them, but when the world needed him most, he vanished. A hundred years passed and my brother and I discovered the new Avatar, an airbender named Aang. And although his airbending skills are great, he has a lot to learn before he's ready to save anyone. But I believe Aang can save the world.\"",
      "id": "subclass.acolyte",
      "roles": [
        "Damage over Time",
        "Control",
        "Support"
      ],
      "classId": "class.monk"
    },
    {
      "hp": 10,
      "wounds": 4,
      "patches": 3,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 1,
      "manaModel": "pool",
      "name": "The Master",
      "armorTypes": [
        "Light",
        "Medium"
      ],
      "weaponTypes": [
        "1H Melee",
        "2H Melee",
        "1H Range",
        "2H Range"
      ],
      "desc": "The Master don't take no back talk and he smack a foo'.",
      "id": "subclass.the-master",
      "roles": [
        "Sustained Damage",
        "Durability",
        "Control"
      ],
      "classId": "class.monk"
    },
    {
      "hp": 8,
      "wounds": 4,
      "patches": 4,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 2,
      "manaModel": "pool",
      "name": "Unmaker",
      "armorTypes": [
        "Light",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "2H Melee",
        "1H Range",
        "2H Range",
        "1H Focus",
        "2H Focus"
      ],
      "desc": "The Master of destruction throughout the realm. They may need to find their perfect moment to strike, but when they do, none that oppose them remain in the wake of their destruction.",
      "id": "subclass.unmaker",
      "roles": [
        "Burst Damage",
        "Burst Damage",
        "Burst Damage"
      ],
      "classId": "class.occultist"
    },
    {
      "hp": 10,
      "wounds": 4,
      "patches": 4,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 3,
      "manaModel": "pool",
      "name": "Hexmage",
      "armorTypes": [
        "Light",
        "Medium",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "2H Melee",
        "1H Range",
        "2H Range",
        "1H Focus",
        "2H Focus"
      ],
      "desc": "Curses and Hexes ooze out of this walking grave to bring doom upon their enemies through a slow and painful death.",
      "id": "subclass.hexmage",
      "roles": [
        "Damage over Time",
        "Damage over Time",
        "Control"
      ],
      "classId": "class.occultist"
    },
    {
      "hp": 11,
      "wounds": 4,
      "patches": 4,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 3,
      "manaModel": "pool",
      "name": "Reaper",
      "armorTypes": [
        "Light",
        "Medium",
        "Heavy",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "2H Melee",
        "1H Range",
        "2H Range",
        "1H Focus",
        "2H Focus"
      ],
      "desc": "Other deathbringers send their foes to the grave, the Reaper ushers them in and lines them up.",
      "id": "subclass.reaper",
      "roles": [
        "Burst Damage",
        "Durability",
        "Mobility"
      ],
      "classId": "class.occultist"
    },
    {
      "hp": 8,
      "wounds": 4,
      "patches": 6,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 1,
      "manaModel": "pool",
      "name": "Hunter",
      "armorTypes": [
        "Light",
        "Medium",
        "Heavy",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "1H Range",
        "2H Range"
      ],
      "desc": "The Hunter remains unseen across the battlefield to find the perfect time to strike, even if it takes all night.",
      "id": "subclass.hunter",
      "roles": [
        "Burst Damage",
        "Sustained Damage",
        "Mobility"
      ],
      "classId": "class.ranger"
    },
    {
      "hp": 9,
      "wounds": 4,
      "patches": 6,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 1,
      "manaModel": "pool",
      "name": "Kindred",
      "armorTypes": [
        "Light",
        "Medium",
        "Heavy",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "1H Range",
        "2H Range",
        "1H Focus",
        "2H Focus"
      ],
      "desc": "The Kindred, friend to the spirits, calls upon the Realm Beyond, to grant a companion that can aid them in combat.",
      "id": "subclass.kindred",
      "roles": [
        "Mobility",
        "Damage over Time",
        "Sustained Damage"
      ],
      "classId": "class.ranger"
    },
    {
      "hp": 9,
      "wounds": 4,
      "patches": 7,
      "evasion": 8,
      "armor": 0,
      "fortitude": 8,
      "speed": 5,
      "startingMana": 10,
      "manaPerLevel": 2,
      "manaModel": "pool",
      "name": "Druid",
      "armorTypes": [
        "Light",
        "Medium",
        "Shields"
      ],
      "weaponTypes": [
        "1H Melee",
        "1H Range",
        "2H Range",
        "1H Focus",
        "2H Focus"
      ],
      "desc": "As the Herald of Nature, the Druid seeks harmony between man and the flora and fauna throughout the realms.",
      "id": "subclass.druid",
      "roles": [
        "Control",
        "Support",
        "Durability"
      ],
      "classId": "class.ranger"
    }
  ],
  "armor": [
    {
      "id": "armor.light",
      "name": "Light Armor",
      "type": "Armor",
      "prof": "Light",
      "armorMod": 0,
      "evasionMod": 4,
      "speedMod": 1,
      "desc": "Boiled leather and quilted cloth. Trades protection for freedom of movement — the fastest and most evasive of the three.",
      "source": "core"
    },
    {
      "id": "armor.medium",
      "name": "Medium Armor",
      "type": "Armor",
      "prof": "Medium",
      "armorMod": 2,
      "evasionMod": 2,
      "speedMod": 0,
      "desc": "Mail and scale over a padded gambeson. The middle road: real protection without surrendering agility.",
      "source": "core"
    },
    {
      "id": "armor.heavy",
      "name": "Heavy Armor",
      "type": "Armor",
      "prof": "Heavy",
      "armorMod": 4,
      "evasionMod": 0,
      "speedMod": -1,
      "desc": "Full plate over mail. The most protection available, bought with speed and evasion.",
      "source": "core"
    }
  ],
  "weapons": [
    {
      "id": "weapon.1h-melee",
      "name": "1H Melee",
      "type": "Weapon",
      "hands": 1,
      "prof": "1H Melee",
      "threat": 1,
      "damage": "1d6",
      "damageType": "Physical",
      "weaponTags": [
        "Super Heavy",
        "Light",
        "Loading",
        "Reach"
      ],
      "examples": [
        "Dagger",
        "Shortsword",
        "Axe",
        "Mace",
        "Flail",
        "Spear"
      ],
      "desc": "A one-handed arm for close work. Every weapon of this class shares the same base damage, so the name is flavour and the stat line is the rule.",
      "source": "core"
    },
    {
      "id": "weapon.2h-melee",
      "name": "2H Melee",
      "type": "Weapon",
      "hands": 2,
      "prof": "2H Melee",
      "threat": 1,
      "damage": "2d8",
      "damageType": "Physical",
      "weaponTags": [
        "Super Heavy",
        "Light",
        "Loading",
        "Reach"
      ],
      "examples": [
        "Greatsword",
        "Greataxe",
        "Maul",
        "Halberd"
      ],
      "desc": "A two-handed arm swung with the whole body. Costs both hands, and pays for them in damage.",
      "source": "core"
    },
    {
      "id": "weapon.1h-range",
      "name": "1H Range",
      "type": "Weapon",
      "hands": 1,
      "prof": "1H Range",
      "range": 5,
      "damage": "1d4",
      "damageType": "Physical",
      "weaponTags": [
        "Super Heavy",
        "Light",
        "Loading",
        "Reach"
      ],
      "examples": [
        "Hand Crossbow",
        "Slingshot",
        "Rock",
        "Light Firearms"
      ],
      "desc": "A one-handed ranged arm. Leaves a hand free for a shield or a second weapon, at the cost of reach and damage.",
      "source": "core"
    },
    {
      "id": "weapon.2h-range",
      "name": "2H Range",
      "type": "Weapon",
      "hands": 2,
      "prof": "2H Range",
      "range": 10,
      "damage": "2d6",
      "damageType": "Physical",
      "weaponTags": [
        "Super Heavy",
        "Light",
        "Loading",
        "Reach"
      ],
      "examples": [
        "Bow",
        "Crossbow",
        "Firearms"
      ],
      "desc": "A two-handed ranged arm. The longest reach available, and the reason to keep both hands on it.",
      "source": "core"
    },
    {
      "id": "weapon.1h-focus",
      "name": "1H Focus",
      "type": "Weapon",
      "hands": 1,
      "prof": "1H Focus",
      "examples": [
        "Wand",
        "Amulet"
      ],
      "desc": "Spend 1 less Mana to cast a spell.",
      "source": "core"
    },
    {
      "id": "weapon.2h-focus",
      "name": "2H Focus",
      "type": "Weapon",
      "hands": 2,
      "prof": "2H Focus",
      "examples": [
        "Staff",
        "Musical Instrument"
      ],
      "desc": "Increase the range of your spells according to their range type: Burst +1; Line +3; Cone +2; Range +3; Blast +1.",
      "source": "core"
    },
    {
      "id": "shield.armor",
      "name": "Shield (Armor)",
      "type": "Shield",
      "hands": 1,
      "prof": "Shields",
      "armorMod": 2,
      "evasionMod": 0,
      "desc": "A heavy shield braced to turn blows aside rather than avoid them.",
      "source": "core"
    },
    {
      "id": "shield.evasion",
      "name": "Shield (Evasion)",
      "type": "Shield",
      "hands": 1,
      "prof": "Shields",
      "armorMod": 0,
      "evasionMod": 2,
      "desc": "A light shield carried to deflect and slip aside rather than absorb.",
      "source": "core"
    },
    {
      "id": "shield.balanced",
      "name": "Shield (Balanced)",
      "type": "Shield",
      "hands": 1,
      "prof": "Shields",
      "armorMod": 1,
      "evasionMod": 1,
      "desc": "A shield balancing bulk against handling, giving a little of both.",
      "source": "core"
    }
  ],
  "equipment": [
    {
      "id": "consumable.health-potion",
      "name": "Health Potion",
      "type": "Consumable",
      "refill": "long-rest",
      "desc": "Spend 1 AP and reset the HP of yourself or an adjacent creature.",
      "source": "core"
    },
    {
      "id": "consumable.mana-potion",
      "name": "Mana Potion",
      "type": "Consumable",
      "refill": "long-rest",
      "desc": "Spend 1 AP to drink the potion yourself or give it to an adjacent creature. The target restores half of their Max Mana pool.",
      "source": "core"
    },
    {
      "id": "consumable.acid-vial",
      "name": "Acid Vial",
      "type": "Consumable",
      "refill": "long-rest",
      "desc": "Use to melt through objects up to 5 feet by 5 feet. Can be thrown at a creature; on a hit, apply 5 Vulnerable to the creature.",
      "source": "core"
    },
    {
      "id": "consumable.fire-bomb",
      "name": "Fire Bomb",
      "type": "Consumable",
      "refill": "long-rest",
      "desc": "Use to catch a flammable object on fire in an instant, given the proper non-wet conditions. Can be thrown to damage an enemy and apply 5 Burn.",
      "source": "core"
    },
    {
      "id": "consumable.poison-vial",
      "name": "Poison Vial",
      "type": "Consumable",
      "refill": "long-rest",
      "desc": "If ingested, the creature gains 5 Poison. Spend 1 AP to coat your weapon with this poison. When attacks hit with that weapon, the target gains 1 Poison per hit.",
      "source": "core"
    },
    {
      "id": "consumable.big-als-lotion",
      "name": "Big Al's Condition Smiter Lotion",
      "type": "Consumable",
      "refill": "short-rest",
      "desc": "Spend 1 AP to drink this potion to remove all stacks of one unique Condition.",
      "source": "core"
    },
    {
      "id": "consumable.wide-als-lotion",
      "name": "Wide Al's Condition Smiter Lotion",
      "type": "Consumable",
      "refill": "short-rest",
      "desc": "Spend 1 AP to drink this potion to remove 1 stack of every Condition affecting you.",
      "source": "core"
    },
    {
      "id": "consumable.healers-field-kit",
      "name": "Healer's Field Kit",
      "type": "Consumable",
      "refill": "long-rest",
      "desc": "Spend it during a Short Rest to restore 1 Wound without spending a Patch.",
      "source": "core"
    },
    {
      "id": "consumable.holy-water",
      "name": "Holy Water",
      "type": "Consumable",
      "refill": "long-rest",
      "desc": "Spend 1 AP to drink and gain a buff or something.",
      "source": "core"
    },
    {
      "id": "consumable.featherfall-charm",
      "name": "Featherfall Charm",
      "type": "Consumable",
      "refill": "long-rest",
      "desc": "Spend 1 AP to activate this magical item to negate fall damage from any height as you drift down safely.",
      "source": "core"
    },
    {
      "id": "consumable.darkvision-tincture",
      "name": "Darkvision Tincture",
      "type": "Consumable",
      "refill": "long-rest",
      "desc": "Drink to see in total darkness until the end of the next skirmish.",
      "source": "core"
    },
    {
      "id": "gear.grappling-hook",
      "name": "Grappling Hook",
      "type": "Gear",
      "desc": "Spend 1 AP to throw the grappling hook at an unoccupied space up to 4 spaces high and quickly pull yourself to that space.",
      "tags": [
        "climbing"
      ],
      "source": "core"
    },
    {
      "id": "gear.climbing-rope",
      "name": "Climbing Rope (50 ft)",
      "type": "Gear",
      "desc": "Climbable without a check on most surfaces; can bind, lower, or rig a pulley.",
      "tags": [
        "climbing"
      ],
      "source": "core"
    },
    {
      "id": "gear.collapsible-pole",
      "name": "Collapsible Pole",
      "type": "Gear",
      "desc": "Ordinarily this item is collapsed to the size of a pencil. It extends up to 20 ft to cross gaps or probe floors ahead for traps, among other uses. Has 10 HP and 10 Evasion.",
      "tags": [
        "climbing"
      ],
      "source": "core"
    },
    {
      "id": "gear.piton-set",
      "name": "Piton Set & Hammer",
      "type": "Gear",
      "desc": "Drive anchors into rock to make a sheer climb safe, removing fall risk on a failed check.",
      "tags": [
        "climbing"
      ],
      "source": "core"
    },
    {
      "id": "gear.everburning-sprite",
      "name": "Everburning Sprite",
      "type": "Gear",
      "desc": "Spend 1 AP to activate this ethereal sprite to float over your head and move with you, shedding light in an area of Burst 10. It is never consumed, but its glow can't be hidden while active. Spend 1 AP to diminish the flame and put the sprite away.",
      "tags": [
        "light"
      ],
      "source": "core"
    },
    {
      "id": "gear.hooded-lantern",
      "name": "Hooded Lantern",
      "type": "Gear",
      "desc": "Can be strapped to your shoulder to give light in an area of Cone 10. Can be shut off and on using 1 AP in combat.",
      "tags": [
        "light"
      ],
      "source": "core"
    },
    {
      "id": "gear.mirage-spectacles",
      "name": "Mirage Spectacles",
      "type": "Gear",
      "desc": "You can wear this pair of spectacles to ignore the Invisible condition on creatures.",
      "tags": [
        "scouting"
      ],
      "source": "core"
    },
    {
      "id": "gear.tinderbox",
      "name": "Tinderbox & Cloth",
      "type": "Gear",
      "desc": "Reliably start a fire in seconds without a check, even in poor conditions.",
      "tags": [
        "light"
      ],
      "source": "core"
    },
    {
      "id": "gear.foldable-cover",
      "name": "Foldable Cover",
      "type": "Gear",
      "desc": "Spend 2 AP to place this item, which takes up 2 by 1 Spaces and grants Hard Cover. This item has 25 HP and 10 Evasion.",
      "tags": [
        "battlefield"
      ],
      "source": "core"
    },
    {
      "id": "gear.tent-of-concealment",
      "name": "Tent of Concealment",
      "type": "Gear",
      "desc": "A camouflaged shelter of various shapes and sizes to fill all your party's needs; passersby are far less likely to notice your party's camp.",
      "tags": [
        "stealth"
      ],
      "source": "core"
    },
    {
      "id": "gear.muffling-wraps",
      "name": "Muffling Wraps",
      "type": "Gear",
      "desc": "Wrap boots and buckles to gain Advantage on moving unseen.",
      "tags": [
        "stealth"
      ],
      "source": "core"
    },
    {
      "id": "gear.thieves-tools",
      "name": "Thieves' Tools",
      "type": "Gear",
      "desc": "Required to pick locks and disarm mechanical traps.",
      "tags": [
        "entry"
      ],
      "source": "core"
    },
    {
      "id": "gear.caltrop-bag",
      "name": "Caltrop Bag",
      "type": "Gear",
      "desc": "Spend 1 AP to scatter caltrops in an area of Blast 1 within Range 5. The zone becomes dangerous terrain, dealing 1 Armor Piercing damage per Space a creature moves through it. The caltrops can be retrieved at the end of combat.",
      "tags": [
        "battlefield"
      ],
      "source": "core"
    },
    {
      "id": "gear.disguise-wardrobe",
      "name": "Magically Compact Disguise Wardrobe",
      "type": "Gear",
      "desc": "This small silver box fits in your pocket but contains a plethora of useful items. You can assemble a believable disguise from the contents, and it grants Advantage on checks concerning your disguise.",
      "tags": [
        "stealth"
      ],
      "source": "core"
    },
    {
      "id": "gear.false-bottom-coffer",
      "name": "False-Bottom Coffer",
      "type": "Gear",
      "desc": "Smuggle a small item past all but a thorough, deliberate search.",
      "tags": [
        "stealth"
      ],
      "source": "core"
    },
    {
      "id": "gear.magical-wire-spool",
      "name": "Magical Wire Spool",
      "type": "Gear",
      "desc": "String a tripline that warns you when a creature triggers the wire.",
      "tags": [
        "battlefield"
      ],
      "source": "core"
    },
    {
      "id": "gear.cartographers-kit",
      "name": "Cartographer's Kit",
      "type": "Gear",
      "desc": "Map as you explore; prevents getting lost in retraced ground and reveals patterns.",
      "tags": [
        "scouting"
      ],
      "source": "core"
    },
    {
      "id": "gear.monster-bestiary",
      "name": "Magical Monster Bestiary",
      "type": "Gear",
      "desc": "As a free action, recall the Vulnerabilities of a creature from the known world. This book magically updates itself as members of the magical society discover new Vulnerabilities, and someone is always studying. It may have limits when researching highly rare beings.",
      "tags": [
        "scouting"
      ],
      "source": "core"
    },
    {
      "id": "gear.arcane-tuning-fork",
      "name": "Arcane Tuning Fork",
      "type": "Gear",
      "desc": "Strike near stonework to detect hollow spaces, hidden doors, or unstable floors.",
      "tags": [
        "scouting"
      ],
      "source": "core"
    },
    {
      "id": "gear.identifiers-magnifier",
      "name": "Identifier's Magnifier",
      "type": "Gear",
      "desc": "Examine an item to learn its magical properties and its nature. However, it is highly deficient at determining whether something is cursed.",
      "tags": [
        "scouting"
      ],
      "source": "core"
    },
    {
      "id": "gear.crowbar",
      "name": "Crowbar",
      "type": "Gear",
      "desc": "Advantage on forcing doors, lids, and bars; doubles as an improvised weapon in a pinch.",
      "tags": [
        "entry"
      ],
      "source": "core"
    },
    {
      "id": "gear.portable-ram",
      "name": "Portable Ram",
      "type": "Gear",
      "desc": "You can use this item to breach a non-magically sealed barred door in a single forceful and loud action.",
      "tags": [
        "entry"
      ],
      "source": "core"
    },
    {
      "id": "gear.eversearching-manacles",
      "name": "Eversearching Manacles",
      "type": "Gear",
      "desc": "Throw these at a target to subdue them as the magical restraints hog-tie them. Restrained creatures cannot cast spells while tied up.",
      "tags": [
        "battlefield"
      ],
      "source": "core"
    },
    {
      "id": "gear.door-jam",
      "name": "Not Your Mom's Door Jam",
      "type": "Gear",
      "desc": "Magically jam a door from either side.",
      "tags": [
        "entry"
      ],
      "source": "core"
    },
    {
      "id": "gear.spyglass",
      "name": "Spyglass",
      "type": "Gear",
      "desc": "Scout ahead, gaining insight into your enemy before engaging.",
      "tags": [
        "scouting"
      ],
      "source": "core"
    },
    {
      "id": "gear.talk-rock",
      "name": "Talk Rock",
      "type": "Gear",
      "desc": "You can verbally speak into this rock and think of a creature. As long as they are on the same plane of existence as you, they hear your voice. For the next 10 seconds, the creature can verbally respond to your message and you will hear it.",
      "tags": [
        "sundry"
      ],
      "source": "core"
    },
    {
      "id": "gear.bonding-resin",
      "name": "Alchemist's Bonding Resin",
      "type": "Gear",
      "desc": "Glue two objects fast, or seal a breach; sets in seconds and holds under strain.",
      "tags": [
        "sundry"
      ],
      "source": "core"
    }
  ],
  "skills": [
    {
      "id": "skill.hold-yer-liquor",
      "name": "Hold Yer Liquor",
      "category": "Body",
      "desc": "You have an iron stomach and can hold your own and then some. This is but one example of your girthiness. Another is that you’ve taken enough hits to the face that you’ve stopped flinching. This positively impacts your ability to stave off disease, withstand extreme environments, and do party tricks like eating a nail."
    },
    {
      "id": "skill.gentle-giant",
      "name": "Gentle Giant",
      "category": "Body",
      "desc": "There’s strong and then there’s you. You’ve learned that sometimes the answer isn’t to pick the lock, it’s to remove the door. Perhaps even the best way through a door is to throw something heavy at it. Feats of raw power such as holding a door closed with a horde of zombies on the other side, lifting and moving objects of absurd weight, and even juggling your friends all fall within the wheelhouse of someone who treats boulders like a pebble."
    },
    {
      "id": "skill.gymnast",
      "name": "Gymnast",
      "category": "Body",
      "desc": "You jump and climb, and you keep doing it long after everyone else has stopped. Walls, cliffs, rooftops, rigging, open water, it's all just terrain that hasn't been crossed yet. You might be afraid of heights but that doesn't mean you can't get around quickly, whether that's threading a packed market at a dead sprint or crossing grassland ahead of raiders who know it better than you do. You never tire. You never stop. Never back down, never what?"
    },
    {
      "id": "skill.do-a-flip",
      "name": "Do a Flip",
      "category": "Body",
      "desc": "Perform a particularly dexterous feat such as \"doing a flip.\" This isn't just sticking a landing, although that's definitely in your normal wheelhouse, it's also about making it look like you know what you're doing when getting around or showing off with physical feats. Intentional acrobatics are your party trick. That same body control works when nobody's watching too: catching the vial before it hits the floor, throwing yourself clear of something too large to catch, or folding yourself out of manacles, a straitjacket, or a cell window that was never meant to fit a person. Tight spaces and bad timing are problems for people with normal joints."
    },
    {
      "id": "skill.in-the-saddle",
      "name": "In the Saddle",
      "category": "Body",
      "desc": "You and your mount have an understanding. Whether it’s a horse, a wyvern, or something considerably weirder, you’ve developed the instinct for how animals move and the body language to get them moving the way you need. Riding hard, staying mounted when things get sideways, or simply convincing a stubborn beast that you’re worth listening to, you’ve earned that trust. Maybe you look like one of them, watch out in mating season."
    },
    {
      "id": "skill.move-unseen",
      "name": "Move Unseen",
      "category": "Sleight",
      "desc": "Get somewhere in an extraordinarily sneaky manner as you’ve learned to cover your tracks and avoid all kinds of patrols."
    },
    {
      "id": "skill.hat-trick",
      "name": "Hat Trick",
      "category": "Sleight",
      "desc": "Whether it’s to obtain something that doesn’t quite belong to you, or for a simple card, your hands have mastered their ability to perform showy sleights without your target being the wiser. Keep in mind, you have innately quick fingers but your real skill is your aptitude for misdirection."
    },
    {
      "id": "skill.quick-fingers",
      "name": "Quick Fingers",
      "category": "Sleight",
      "desc": "Where hat tricks are about misleading viewers and your showmanship itself, this is about unfettered nimbleness and hand-eye coordination. Threading a lock, cutting a purse string, or swapping out a document before someone turns around are all in your domain. You little rascal, you."
    },
    {
      "id": "skill.wear-a-face",
      "name": "Wear a Face",
      "category": "Sleight",
      "desc": "You’ve proven adept at the skill of impersonation. A different walk, a borrowed accent, the practiced confidence of a station above your own or the cultivated invisibility of one below it. You don’t need a costume to disappear into a crowd, you just need a moment to decide who you’re going to be today."
    },
    {
      "id": "skill.eye-for-forgery",
      "name": "Eye for Forgery",
      "category": "Sleight",
      "desc": "You’ve developed an eye for the value and legitimacy of rare items. Due to your discerning eye, you can create believable forgeries. This includes deeds, titles, immigration papers, legal contracts, accounting numbers, and other boring things that might be made more interesting with your input. Additionally, when it comes to gems, artifacts, paintings, forged documents, suspiciously cheap armor, you can attempt to assess the worth of almost anything given a closer look."
    },
    {
      "id": "skill.book-smarts",
      "name": "Book Smarts",
      "category": "Study",
      "desc": "Due to the surplus of hours you've spent with your nose in a book, random facts, useful or useless, have been catalogued away for just the right time. You know about religions and the histories of all sorts of societies. You don't necessarily know every language from the day you hatched either, but you've become extensively cultured through the pages of books about the history of languages, and beyond your original tongue, you can speak, read, and understand most of them given enough time… Nerd."
    },
    {
      "id": "skill.field-guide",
      "name": "Field Guide",
      "category": "Study",
      "desc": "You know what's out there, what it eats, and whether it's supposed to be here. Creatures of all kinds, their habits, their nests, their anatomy, and which parts are worth cutting out afterward. The same goes for anything that grows: which mushroom is dinner, which one is a very bad afternoon. Sometimes the useful thing isn't knowing what something is, it's knowing that nothing like it has ever lived within a hundred miles of here."
    },
    {
      "id": "skill.inventor",
      "name": "Inventor",
      "category": "Study",
      "desc": "Your mind turns its gears to understand the way things work and this has made putting together creative mechanisms a common pastime for a tinkerer like yourself. Whether you’re mending a broken wagon or building a society-changing technology, you’re a natural."
    },
    {
      "id": "skill.imbued",
      "name": "Imbued",
      "category": "Study",
      "desc": "You’ve studied the academic side of magical craftsmanship, how enchantments work, what runes mean structurally, how a magical item was likely made and by whom. You can’t necessarily cast spells but you understand the architecture of magic as it exists in physical forms. Useful for figuring out what a mysterious item does, how to safely dismantle it, or in the right circumstances, how to make something magical yourself given the materials and time."
    },
    {
      "id": "skill.alchemist",
      "name": "Alchemist",
      "category": "Study",
      "desc": "You’ve learned the ways of the herb, you understand how to put together medicines that heal infections or to concoct vile poisons with effects only limited by your imagination, given the right ingredients are available, and that same knowledge doesn't abandon you when there's no table, no time, and someone bleeding out at your feet."
    },
    {
      "id": "skill.path-less-taken",
      "name": "Path Less Taken",
      "category": "Study",
      "desc": "You are good at navigating through the wilderness and surviving for weeks with only a yard of twine and two smooth stones. Paths you’ve walked once feel like your daily route. Retracing your steps and avoiding getting lost are your bread and butter. Maybe it was all those maps you memorized as a kid when you sat alone in the schoolyard, regardless, you know the land."
    },
    {
      "id": "skill.keep-an-eye-out",
      "name": "Keep an Eye Out",
      "category": "Instinct",
      "desc": "You’ve developed an instinct for the physical lay of the land, out in the wilderness and within the walls of the city. Entrances, exits, the guy near the door who’s a little too still, the table that’s bolted to the floor for no good reason, you’re particularly good at picking it up. It might even be to find a hidden passageway because of the dust formation on a frame or the covered tracks in the mud. What it means is up to you."
    },
    {
      "id": "skill.something-in-the-air",
      "name": "Something in the Air",
      "category": "Instinct",
      "desc": "You don't need a textbook to know when magic has been at work in a place, on a person, or inside an object. You feel it the way some people feel a change in weather — in your chest, behind your eyes, at the back of your teeth. You couldn't always explain how you know, and honestly you've stopped trying. Whether it's residual energy in a room where a spell was cast, the particular wrongness of a cursed item, or the shimmer of something that doesn't want to be found, you notice what others walk right past. Imbued tells you how magic was made. This tells you that it was there at all."
    },
    {
      "id": "skill.bad-feeling",
      "name": "I Got A Bad Feeling About This",
      "category": "Instinct",
      "desc": "Some things you just know about without being able to explain how. Gut feelings, bad vibes, a slight tremor in the ground, your intuition has been sharpened by experiences, loss, or something you don’t like talking about. Maybe you’re just old and have seen it all, but your gut tells you something ain’t right. Magic, though, somehow slips right past you… perhaps magic is more about Something in the Air."
    },
    {
      "id": "skill.read-a-person",
      "name": "Read a Person",
      "category": "Instinct",
      "desc": "You’ve become an excellent judge of character, either from age or being wronged so many times you’ve seen it all, you can read people to try to sniff out lies or to question the authenticity of their intentions, said or unsaid."
    },
    {
      "id": "skill.presence",
      "name": "Presence",
      "category": "Influence",
      "desc": "You’ve got a presence that hits before your fists do. A well placed shout matched with your intimidating stature has a way of making people reconsider their choices. Sometimes all you need is to stare as the vein pops in your forehead. This clearly isn’t charm either, it’s the physical weight of your existence as you clearly don’t need to prove anything to anyone in the room."
    },
    {
      "id": "skill.silver-tongue",
      "name": "Silver Tongue",
      "category": "Influence",
      "desc": "You have a way with words, which helps you to get your way in many situations. You have a likeable charm about you that gives you the edge when getting better prices on goods, gaining allies, or convincing someone to act particularly courageous or out of character."
    },
    {
      "id": "skill.believable",
      "name": "Believable",
      "category": "Influence",
      "desc": "You’re a scoundrel and people might know you’re lying but can’t help but wish you were telling the truth. It doesn’t matter what you’re wearing or where you’re caught, there’s always a chance that your words can get you out of a sticky situation. The stories you spin up often don’t feel too farfetched, regardless of how rationally farfetched they truly sound."
    },
    {
      "id": "skill.natural-born-star",
      "name": "Natural-Born Star",
      "category": "Influence",
      "desc": "When there’s a show you put on, whether it’s singing, dancing, or playing a tune, you have the je ne sais quoi. That something about you is what can draw a crowd as the eyes of your enamored fans are focused solely on you."
    },
    {
      "id": "skill.high-brow",
      "name": "High Brow",
      "category": "Influence",
      "desc": "You know about political corruption, its extent, and its purpose in the highest upper echelon of civilizations. You know the networks necessary to get the word out or get word on something you’re looking into from the most prominent figures in society."
    },
    {
      "id": "skill.street-smarts",
      "name": "Street Smarts",
      "category": "Influence",
      "desc": "Who needs those high brow aristocrats? As the people’s champ, you know the people that line the depth of the streets. You’ve built a genuine network among the riff raff of contacts, informants, neighbors, debtors, and as always, Ricard, who is basically the king of the dirt bags. You understand the way the world works and how to make the system work for you. If you need information, a favor, a safe place, you can always call on someone, and if no one answers, you’ll run into good ole Ricard probably."
    },
    {
      "id": "skill.keep-it-together",
      "name": "Keep It Together",
      "category": "Influence",
      "desc": "When things fall apart, as they usually do with a group of strangers on a mission to kill a god, someone has to hold the line. You’ve developed a steadiness under pressure that keeps panic at bay. It lets you make clear decisions when everything around you is on fire, literally and figuratively, and that calming presence can seep to others to even attempt to prevent mass hysteria."
    }
  ],
  "traits": [
    {
      "name": "Barbarian Tier 0",
      "tier": 0,
      "grantedBy": "class.barbarian",
      "desc": "Placeholder — the Tier 0 Trait every Barbarian receives on choosing the class has not been written yet.",
      "id": "trait.barbarian-tier-0"
    },
    {
      "name": "Fighter Tier 0",
      "tier": 0,
      "grantedBy": "class.fighter",
      "desc": "Placeholder — the Tier 0 Trait every Fighter receives on choosing the class has not been written yet.",
      "id": "trait.fighter-tier-0"
    },
    {
      "name": "Knight Tier 0",
      "tier": 0,
      "grantedBy": "class.knight",
      "desc": "Placeholder — the Tier 0 Trait every Knight receives on choosing the class has not been written yet.",
      "id": "trait.knight-tier-0"
    },
    {
      "name": "Rogue Tier 0",
      "tier": 0,
      "grantedBy": "class.rogue",
      "desc": "Placeholder — the Tier 0 Trait every Rogue receives on choosing the class has not been written yet.",
      "id": "trait.rogue-tier-0"
    },
    {
      "name": "Monk Tier 0",
      "tier": 0,
      "grantedBy": "class.monk",
      "desc": "Placeholder — the Tier 0 Trait every Monk receives on choosing the class has not been written yet.",
      "id": "trait.monk-tier-0"
    },
    {
      "name": "Ranger Tier 0",
      "tier": 0,
      "grantedBy": "class.ranger",
      "desc": "Placeholder — the Tier 0 Trait every Ranger receives on choosing the class has not been written yet.",
      "id": "trait.ranger-tier-0"
    },
    {
      "name": "Elementalist Tier 0",
      "tier": 0,
      "grantedBy": "class.elementalist",
      "desc": "Placeholder — the Tier 0 Trait every Elementalist receives on choosing the class has not been written yet.",
      "id": "trait.elementalist-tier-0"
    },
    {
      "name": "Magician Tier 0",
      "tier": 0,
      "grantedBy": "class.magician",
      "desc": "Placeholder — the Tier 0 Trait every Magician receives on choosing the class has not been written yet.",
      "id": "trait.magician-tier-0"
    },
    {
      "name": "Occultist Tier 0",
      "tier": 0,
      "grantedBy": "class.occultist",
      "desc": "Placeholder — the Tier 0 Trait every Occultist receives on choosing the class has not been written yet.",
      "id": "trait.occultist-tier-0"
    },
    {
      "name": "The Beast Tier 0",
      "tier": 0,
      "grantedBy": "subclass.the-beast",
      "desc": "Placeholder — the Tier 0 Trait a Barbarian receives on choosing The Beast has not been written yet.",
      "id": "trait.the-beast-tier-0"
    },
    {
      "name": "Oakheart Tier 0",
      "tier": 0,
      "grantedBy": "subclass.oakheart",
      "desc": "Placeholder — the Tier 0 Trait a Barbarian receives on choosing Oakheart has not been written yet.",
      "id": "trait.oakheart-tier-0"
    },
    {
      "name": "Berserker Tier 0",
      "tier": 0,
      "grantedBy": "subclass.berserker",
      "desc": "Placeholder — the Tier 0 Trait a Barbarian receives on choosing Berserker has not been written yet.",
      "id": "trait.berserker-tier-0"
    },
    {
      "name": "Rook Tier 0",
      "tier": 0,
      "grantedBy": "subclass.rook",
      "desc": "Placeholder — the Tier 0 Trait a Fighter receives on choosing Rook has not been written yet.",
      "id": "trait.rook-tier-0"
    },
    {
      "name": "The Jugg Tier 0",
      "tier": 0,
      "grantedBy": "subclass.the-jugg",
      "desc": "Placeholder — the Tier 0 Trait a Fighter receives on choosing The Jugg has not been written yet.",
      "id": "trait.the-jugg-tier-0"
    },
    {
      "name": "Spellblade Tier 0",
      "tier": 0,
      "grantedBy": "subclass.spellblade",
      "desc": "Placeholder — the Tier 0 Trait a Fighter receives on choosing Spellblade has not been written yet.",
      "id": "trait.spellblade-tier-0"
    },
    {
      "name": "Paladin Tier 0",
      "tier": 0,
      "grantedBy": "subclass.paladin",
      "desc": "Placeholder — the Tier 0 Trait a Knight receives on choosing Paladin has not been written yet.",
      "id": "trait.paladin-tier-0"
    },
    {
      "name": "Crusader Tier 0",
      "tier": 0,
      "grantedBy": "subclass.crusader",
      "desc": "Placeholder — the Tier 0 Trait a Knight receives on choosing Crusader has not been written yet.",
      "id": "trait.crusader-tier-0"
    },
    {
      "name": "Revenant Tier 0",
      "tier": 0,
      "grantedBy": "subclass.revenant",
      "desc": "Placeholder — the Tier 0 Trait a Knight receives on choosing Revenant has not been written yet.",
      "id": "trait.revenant-tier-0"
    },
    {
      "name": "Assassin Tier 0",
      "tier": 0,
      "grantedBy": "subclass.assassin",
      "desc": "Placeholder — the Tier 0 Trait a Rogue receives on choosing Assassin has not been written yet.",
      "id": "trait.assassin-tier-0"
    },
    {
      "name": "Viper Tier 0",
      "tier": 0,
      "grantedBy": "subclass.viper",
      "desc": "Placeholder — the Tier 0 Trait a Rogue receives on choosing Viper has not been written yet.",
      "id": "trait.viper-tier-0"
    },
    {
      "name": "Scoundrel Tier 0",
      "tier": 0,
      "grantedBy": "subclass.scoundrel",
      "desc": "Placeholder — the Tier 0 Trait a Rogue receives on choosing Scoundrel has not been written yet.",
      "id": "trait.scoundrel-tier-0"
    },
    {
      "name": "The Master Tier 0",
      "tier": 0,
      "grantedBy": "subclass.the-master",
      "desc": "Placeholder — the Tier 0 Trait a Monk receives on choosing The Master has not been written yet.",
      "id": "trait.the-master-tier-0"
    },
    {
      "name": "Ninja Tier 0",
      "tier": 0,
      "grantedBy": "subclass.ninja",
      "desc": "Placeholder — the Tier 0 Trait a Monk receives on choosing Ninja has not been written yet.",
      "id": "trait.ninja-tier-0"
    },
    {
      "name": "Acolyte Tier 0",
      "tier": 0,
      "grantedBy": "subclass.acolyte",
      "desc": "Placeholder — the Tier 0 Trait a Monk receives on choosing Acolyte has not been written yet.",
      "id": "trait.acolyte-tier-0"
    },
    {
      "name": "Hunter Tier 0",
      "tier": 0,
      "grantedBy": "subclass.hunter",
      "desc": "Placeholder — the Tier 0 Trait a Ranger receives on choosing Hunter has not been written yet.",
      "id": "trait.hunter-tier-0"
    },
    {
      "name": "Druid Tier 0",
      "tier": 0,
      "grantedBy": "subclass.druid",
      "desc": "Placeholder — the Tier 0 Trait a Ranger receives on choosing Druid has not been written yet.",
      "id": "trait.druid-tier-0"
    },
    {
      "name": "Kindred Tier 0",
      "tier": 0,
      "grantedBy": "subclass.kindred",
      "desc": "Placeholder — the Tier 0 Trait a Ranger receives on choosing Kindred has not been written yet.",
      "id": "trait.kindred-tier-0"
    },
    {
      "name": "Pyromancer Tier 0",
      "tier": 0,
      "grantedBy": "subclass.pyromancer",
      "desc": "Placeholder — the Tier 0 Trait an Elementalist receives on choosing Pyromancer has not been written yet.",
      "id": "trait.pyromancer-tier-0"
    },
    {
      "name": "Frostcaller Tier 0",
      "tier": 0,
      "grantedBy": "subclass.frostcaller",
      "desc": "Placeholder — the Tier 0 Trait an Elementalist receives on choosing Frostcaller has not been written yet.",
      "id": "trait.frostcaller-tier-0"
    },
    {
      "name": "Lightning Tier 0",
      "tier": 0,
      "grantedBy": "subclass.lightning",
      "desc": "Placeholder — the Tier 0 Trait an Elementalist receives on choosing Lightning has not been written yet.",
      "id": "trait.lightning-tier-0"
    },
    {
      "name": "Chronomancer Tier 0",
      "tier": 0,
      "grantedBy": "subclass.chronomancer",
      "desc": "Placeholder — the Tier 0 Trait a Magician receives on choosing Chronomancer has not been written yet.",
      "id": "trait.chronomancer-tier-0"
    },
    {
      "name": "Mirrormage Tier 0",
      "tier": 0,
      "grantedBy": "subclass.mirrormage",
      "desc": "Placeholder — the Tier 0 Trait a Magician receives on choosing Mirrormage has not been written yet.",
      "id": "trait.mirrormage-tier-0"
    },
    {
      "name": "Psychic Tier 0",
      "tier": 0,
      "grantedBy": "subclass.psychic",
      "desc": "Placeholder — the Tier 0 Trait a Magician receives on choosing Psychic has not been written yet.",
      "id": "trait.psychic-tier-0"
    },
    {
      "name": "Reaper Tier 0",
      "tier": 0,
      "grantedBy": "subclass.reaper",
      "desc": "Placeholder — the Tier 0 Trait an Occultist receives on choosing Reaper has not been written yet.",
      "id": "trait.reaper-tier-0"
    },
    {
      "name": "Unmaker Tier 0",
      "tier": 0,
      "grantedBy": "subclass.unmaker",
      "desc": "Placeholder — the Tier 0 Trait an Occultist receives on choosing Unmaker has not been written yet.",
      "id": "trait.unmaker-tier-0"
    },
    {
      "name": "Hexmage Tier 0",
      "tier": 0,
      "grantedBy": "subclass.hexmage",
      "desc": "Placeholder — the Tier 0 Trait an Occultist receives on choosing Hexmage has not been written yet.",
      "id": "trait.hexmage-tier-0"
    }
  ]
};
