/* =====================================================================
   WAYPOINT — Player's Guide, as data
   ---------------------------------------------------------------------
   GENERATED FILE — DO NOT EDIT BY HAND.

   Source:    docs/Waypoint Player's Guide.rtf
   Generated: 2026-09-15
   Regenerate: node tools/rtf-to-rules.mjs

   Every edit belongs in the RTF, which is the rulebook. Editing this file
   means the app and the document disagree, and the document wins next time
   anyone runs the converter.

   Declared as a plain global rather than a module because index.html is
   opened straight off the filesystem, where the browser blocks module
   imports and fetch() alike — same arrangement as dice.js and library.js.
   ===================================================================== */

window.WAYPOINT_RULES = {
  "title": "Waypoint — Player's Guide",
  "chapters": [
    {
      "id": "chapter-1-playing-the-game",
      "title": "CHAPTER 1: PLAYING THE GAME",
      "sections": [
        {
          "id": "chapter-1-playing-the-game-the-standard",
          "title": "The Standard",
          "blocks": [
            {
              "t": "p",
              "text": "When the outcome of an action is uncertain, make a Check. Roll 1d20, add any relevant modifiers, and meet or beat the Difficulty Class (DC)."
            },
            {
              "t": "p",
              "text": "The DC is always 10 unless the Game Master (GM) says otherwise and the GM will always tell you the DC if it is not 10 before you roll."
            },
            {
              "t": "h",
              "text": "Harder Tasks"
            },
            {
              "t": "p",
              "text": "Some actions are simply more difficult. The GM may find it reasonable to raise the DC by increments of 5."
            },
            {
              "t": "table",
              "head": [
                "DC",
                "Difficulty"
              ],
              "rows": [
                [
                  "10",
                  "Standard"
                ],
                [
                  "15",
                  "Hard"
                ],
                [
                  "20",
                  "Severe"
                ],
                [
                  "25",
                  "Extreme"
                ],
                [
                  "30",
                  "Near-Impossible"
                ]
              ]
            },
            {
              "t": "h",
              "text": "The Weight of Failure"
            },
            {
              "t": "p",
              "text": "Failure leaves a mark. When a check fails, the DC permanently increases by 5 for any future attempt on that same task, by anyone in the party, as the world reacts to repeated failure."
            },
            {
              "t": "p",
              "text": "This discourages cycling through party members hoping for a lucky roll as your attempts have more weight when the risk of failure is at hand."
            },
            {
              "t": "p",
              "text": "The GM may waive or reset this increase if circumstances meaningfully change, for example, the party takes a step back and reworks their approach by creatively solving the issue at hand, versus everyone asking “can I try too?”"
            },
            {
              "t": "h",
              "text": "Advantage & Disadvantage"
            },
            {
              "t": "p",
              "text": "Favorable or unfavorable conditions affect your dice pool, not only the DC."
            },
            {
              "t": "ul",
              "items": [
                "Advantage: Roll an extra d20, take the highest.",
                "Disadvantage: Roll an extra d20, take the lowest."
              ]
            },
            {
              "t": "p",
              "text": "Both stack and cancel each other out. Two Advantage and one Disadvantage leaves you with one Advantage. Net zero means a standard single d20. Stacking isn't capped by the table below as circumstances and your character's traits can push it further."
            },
            {
              "t": "table",
              "head": [
                "Net Stacks",
                "Dice Rolled",
                "Take"
              ],
              "rows": [
                [
                  "2 Advantage",
                  "3d20",
                  "Highest"
                ],
                [
                  "1 Advantage",
                  "2d20",
                  "Highest"
                ],
                [
                  "0",
                  "1d20",
                  "Only result"
                ],
                [
                  "1 Disadvantage",
                  "2d20",
                  "Lowest"
                ],
                [
                  "2 Disadvantage",
                  "3d20",
                  "Lowest"
                ]
              ]
            },
            {
              "t": "p",
              "text": "Advantage and Disadvantage come from class features, spells, equipment, or the situation itself. When possible, look for ways to tip the odds before you roll. A high DC is still beatable with enough fortune on your side."
            },
            {
              "t": "h",
              "text": "Natural Rolls"
            },
            {
              "t": "p",
              "text": "When you roll a Natural 20 on the d20, it counts as a Critical Success."
            },
            {
              "t": "p",
              "text": "This also counts a Critical Strike in combat because of the standard Critical Strike threshold for a player is 20. A Natural 20 will always hit. A Natural 20 will also deal double the damage, including the damage dice roll and damage modifiers because it falls within the Lethality Critical Strike threshold (See Lethality for more)."
            },
            {
              "t": "p",
              "text": "A Critical Strike is reached when the natural roll on the dice is within the Critical Strike threshold."
            },
            {
              "t": "p",
              "text": "Out of combat, a Critical Success will usually auto succeed, determined by the GM. If a player would like to snap the world in half and they roll a Natural 20, Critical Success doesn't mean they will snap the world in half, they may simply cause a ruckus, but a big ruckus."
            },
            {
              "t": "p",
              "text": "When you roll a Natural 1 on the d20, it counts as a Critical Failure. In and out of combat this is an auto failure, regardless of modifiers. The GM could also decide a minor setback."
            },
            {
              "t": "p",
              "text": "Examples of minor setbacks include:"
            },
            {
              "t": "ul",
              "items": [
                "Falling prone",
                "Your weapon slips from your hand 10+ ft away"
              ]
            },
            {
              "t": "p",
              "text": "This does not include more permanent setbacks like:"
            },
            {
              "t": "ul",
              "items": [
                "Damaging your weapon to deal less damage",
                "Taking damage",
                "Losing your armor, etc."
              ]
            }
          ]
        },
        {
          "id": "chapter-1-playing-the-game-core-attributes",
          "title": "Core Attributes",
          "blocks": [
            {
              "t": "p",
              "text": "Every character is defined by six Core Attributes. Increasing an attribute directly increases the related stat as there is no derived formula layer for any Attribute, other than Precision (See the table below)."
            },
            {
              "t": "table",
              "head": [
                "Attribute",
                "Effect",
                "Description"
              ],
              "rows": [
                [
                  "Power",
                  "+1 to damage",
                  "This is your strength, not necessarily muscle. It’s the same indicator of Power for martial fighters and spellcasters alike. The more Power you have, the more damage you deal."
                ],
                [
                  "Precision",
                  "+2 to hit",
                  "This is your ability to hit targets consistently and accurately."
                ],
                [
                  "Lethality",
                  "+1 to Critical Strike threshold of attacks (lowers the threshold)",
                  "Critical Strikes double the damage rolled on the dice, including Power modifier. IMPORTANT: The Lethality range must be rolled as the natural dice roll as modifiers from Precision cannot get you to a Critical Strike."
                ],
                [
                  "Constitution",
                  "+1 to Health (HP)",
                  "This increases your HP bar, gaining a multiplied benefit from the amount of Wounds you can take (See Wounds)."
                ],
                [
                  "Dexterity",
                  "+1 to Evasion",
                  "Your ability to dodge or deflect incoming attacks."
                ],
                [
                  "Fortune",
                  "+1 to healing and +1 to Fortitude",
                  "Your attunement to the magical abilities. Fortune increases your healing output of spells to others and increases your Fortitude, which works like Evasion for some Magical attacks called Charms."
                ]
              ]
            }
          ]
        },
        {
          "id": "chapter-1-playing-the-game-action-economy",
          "title": "Action Economy",
          "blocks": [
            {
              "t": "p",
              "text": "Actions you can take will cost either Action Points (AP), Reaction Points (RP), or Mana."
            },
            {
              "t": "p",
              "text": "During a round of combat, you get 3 AP per turn and 1 RP. Doing anything costs a certain number of points, indicated by the action you want to do."
            },
            {
              "t": "p",
              "text": "Based on Triggers in combat, you can use Reactions, spending the required RP, to act out of turn during a round of combat. AP and RP both reset at the start of your turn."
            }
          ]
        },
        {
          "id": "chapter-1-playing-the-game-base-actions",
          "title": "Base Actions",
          "blocks": [
            {
              "t": "p",
              "text": "These actions are available to all characters at all levels."
            },
            {
              "t": "h",
              "text": "Move — 1 AP"
            },
            {
              "t": "p",
              "text": "You move a distance up to your Speed. The Move action can be broken up by other actions on your turn."
            },
            {
              "t": "p",
              "text": "For example, if you have 6 Speed and you take the Move action (1 AP) , you could move 2, take the Attack action (1 AP) , move 3 more, use the Interact action (1 AP) , and still have 1 space of movement available to you."
            },
            {
              "t": "h",
              "text": "Weapon Attack — 1 AP"
            },
            {
              "t": "p",
              "text": "You make an attack with a weapon you have equipped. Modifiers to AP cost may be noted on the weapon description."
            },
            {
              "t": "p",
              "text": "Dual Wielding If you are dual wielding weapons, and you take the Weapon Attack action to attack with one of the two dual wielded weapons, you can immediately make another attack with the other dual wielded weapon as part of the same action. This second attack requires a second attack role and does not gain the Power bonus added to the damage roll."
            },
            {
              "t": "h",
              "text": "Patch — 2 AP"
            },
            {
              "t": "p",
              "text": "You can spend a Patch to reset your HP and removes one Wound from your counter."
            },
            {
              "t": "h",
              "text": "Grapple — 1 AP"
            },
            {
              "t": "p",
              "text": "You attempt to grab or restrain a creature adjacent to you. This action cannot be taken against creatures larger than you."
            },
            {
              "t": "p",
              "text": "Make a contested Power check against your target's Power or Dexterity. If you win, you are Grappling the creature and they are Grappled. A Power check is made by rolling 1d20and including your Power score."
            },
            {
              "t": "ul",
              "items": [
                "As long as you are grappling, neither you nor the grappled creature can take reactions.",
                "You can move up to half your Speed, dragging the grappled creature with you. If the creature is one or more sizes smaller than you, your Speed is not reduced in this way.",
                "You can end a grapple at will, no action required."
              ]
            },
            {
              "t": "h",
              "text": "Push — 1 AP"
            },
            {
              "t": "p",
              "text": "You can shove another creature of the same size or smaller as a 1 AP action. Make a contested Power vs. Power or Dexterity check. If you win, the creature is shoved 1 space."
            },
            {
              "t": "h",
              "text": "Escape — 1 AP"
            },
            {
              "t": "p",
              "text": "If you are grappled, you can attempt to escape by making a contested Power or Dexterity check against the grappler's Power. If you tie or win, the grapple ends."
            },
            {
              "t": "h",
              "text": "Interact — 1 AP"
            },
            {
              "t": "p",
              "text": "Open a door, loot a body, drink a potion, flip a switch, pick up something. This action is used to Interact with objects in the world around you."
            },
            {
              "t": "h",
              "text": "Disengage — 1 AP"
            },
            {
              "t": "p",
              "text": "When you Disengage, the next move action you take on this turn does not provoke any reactions."
            },
            {
              "t": "h",
              "text": "Evade — 2 AP"
            },
            {
              "t": "p",
              "text": "When you Evade, attacks against you have 1 Disadvantage until the start of your next turn."
            },
            {
              "t": "h",
              "text": "Take Cover — 2 AP"
            },
            {
              "t": "p",
              "text": "To Take Cover requires you to be behind a form of cover from the enemies’ perspective. Normally, when standing behind cover, you gain these benefits:"
            },
            {
              "t": "ul",
              "items": [
                "Half Cover = 1 Disadvantage",
                "Full cover = 2 Disadvantage"
              ]
            },
            {
              "t": "p",
              "text": "When you Take Cover, you cannot be targeted by enemies on the opposite side of the object you’re taking cover behind (See Cover). The enemy can target you once again when they have you in line of sight."
            },
            {
              "t": "h",
              "text": "Ready an Action — 1 AP + 1 RP"
            },
            {
              "t": "p",
              "text": "To hold an action, declare which 1 AP (or less) action you want to prepare, and what trigger you want to hold it for. The action you want to hold is called the Readied Action, and the event you are holding for is called the Trigger."
            },
            {
              "t": "p",
              "text": "Examples include holding an Attack until an enemy enters the room, holding the door shut until your friends escape, or running forward to join a friend after they finish casting their spell."
            },
            {
              "t": "ul",
              "items": [
                "Immediately before, or immediately after the Trigger happens, spend 1 RP and the Readied Action happens.",
                "If a Readied Action has a cost to it, such as mana or any other resource, this cost is paid when you first Ready an Action. This cost is paid even if the Trigger doesn't happen."
              ]
            },
            {
              "t": "h",
              "text": "Call Out — 1 AP"
            },
            {
              "t": "p",
              "text": "Choose a target within Weapon, or a Spell that you know’s, Range and give an ally 1 Advantage on the next attack made against the target."
            },
            {
              "t": "h",
              "text": "Revive – 1 AP"
            },
            {
              "t": "p",
              "text": "You can touch a Downed ally and they return to 1 HP. (A Downed character cannot take actions or move and requires healing to regain conciousness)"
            }
          ]
        },
        {
          "id": "chapter-1-playing-the-game-reactions",
          "title": "Reactions",
          "blocks": [
            {
              "t": "p",
              "text": "Reactions are special actions that occur outside your turn, triggered by specific events. You have 1 RP per round to spend on them."
            },
            {
              "t": "h",
              "text": "Reactive Strike — 1 RP"
            },
            {
              "t": "p",
              "text": "If a creature moves spaces while within your Threat range, you can immediately attack them with a 1 AP attack."
            },
            {
              "t": "p",
              "text": "Threat is all Spaces within a wielded Melee Weapon’s Range."
            }
          ]
        },
        {
          "id": "chapter-1-playing-the-game-movement-position",
          "title": "Movement & Position",
          "blocks": [
            {
              "t": "h",
              "text": "Movement Types"
            },
            {
              "t": "ul",
              "items": [
                "Standard Movement: Costs 1 AP, moves up to your Speed in spaces.",
                "Swimming: Costs double speed.",
                "Climbing: Costs double speed."
              ]
            },
            {
              "t": "h",
              "text": "Difficult Terrain"
            },
            {
              "t": "p",
              "text": "Difficult terrain — shaky earth, vines, burning ground, deep water — costs double speed to move through."
            },
            {
              "t": "h",
              "text": "Cover"
            },
            {
              "t": "p",
              "text": "Half Cover = 1 Disadvantage"
            },
            {
              "t": "p",
              "text": "Full cover = 2 Disadvantage"
            },
            {
              "t": "h",
              "text": "Moving Through Other Creatures"
            },
            {
              "t": "ul",
              "items": [
                "You cannot move through enemies.",
                "You can move through teammates."
              ]
            },
            {
              "t": "h",
              "text": "Jumping"
            },
            {
              "t": "ul",
              "items": [
                "You can jump upward 1 space.",
                "You can jump forward over a distance equal to half your Speed."
              ]
            },
            {
              "t": "h",
              "text": "Knockback"
            },
            {
              "t": "p",
              "text": "When an attack states it deals knockback, the creature is pushed according to that attack’s knockback automatically when the attack hits, unless they are immune to Knockback or forced movement. Creatures can only Knockback creatures of their size or small."
            }
          ]
        },
        {
          "id": "chapter-1-playing-the-game-combat-structure",
          "title": "Combat Structure",
          "blocks": [
            {
              "t": "h",
              "text": "How Combat Begins"
            },
            {
              "t": "p",
              "text": "The GM's narrative leads to combat and prompts the party to determine their initiative order. If the party has not been detected, they may have the element of surprise and receive a full round of combat before the surprised targets can act. A surprise round can only be achieved if every member of the party that is engaging the enemy has gone undetected by the target(s)."
            },
            {
              "t": "h",
              "text": "Initiative Order"
            },
            {
              "t": "p",
              "text": "The party determines the order of their turns in an initiative order."
            },
            {
              "t": "p",
              "text": "The party always gets the first turn."
            },
            {
              "t": "p",
              "text": "Enemy turns are mixed between the party's turns depending on how many enemies are in the battle."
            },
            {
              "t": "p",
              "text": "For example: if there are 4 party members and 4 enemies, the initiative alternates between party and enemies giving everyone a turn per round. If there are 4 party members and 2 enemies, two party members go between each enemy turn. Enemies can be grouped together to take turns simultaneously. Some enemies, particularly bosses or powerful foes, can have multiple turns within one round."
            },
            {
              "t": "h",
              "text": "Making an Attack"
            },
            {
              "t": "p",
              "text": "The attacker rolls a d20 and adds their Precision bonus to the attack roll. If the result meets or beats the target's Evasion score, the attack hits."
            },
            {
              "t": "h",
              "text": "Damage Application"
            },
            {
              "t": "p",
              "text": "Damage is applied after the attack hits. Reduce the incoming damage by the target's Armor bonus, apply the remaining damage to HP, unless the attack is Armor Piercing, then there is no damage reduction from Armor."
            },
            {
              "t": "h",
              "text": "Critical Hits"
            },
            {
              "t": "p",
              "text": "A player scores a Critical Strike when their to-hit roll meets or beats both the target's Evasion and the natural roll on the dice is within their Critical Hit threshold (which is 20 by default). Critical Strikes double the total of the standard attack's dice roll. For example: if the attack deals 1d6 and a 4 is rolled, the Critical Hit deals 8 damage."
            },
            {
              "t": "p",
              "text": "Example — Evasion 12, Critical Threshold 15 (+5 Lethality):"
            },
            {
              "t": "ul",
              "items": [
                "Rolls 1–11: Miss",
                "Rolls 12–14: Hit, standard damage",
                "Rolls 15+: Hit, double damage (Critical)"
              ]
            },
            {
              "t": "p",
              "text": "Example — Evasion 12, Critical Threshold 10 (+10 Lethality):"
            },
            {
              "t": "ul",
              "items": [
                "Rolls 1–11: Miss",
                "Rolls 12+: Hit, double damage (Critical)",
                "Even though 10-11 are within the Critical Hit threshold, they do not meet the Evasion of the target, so the attack still misses"
              ]
            },
            {
              "t": "h",
              "text": "Going Down in Combat"
            },
            {
              "t": "p",
              "text": "When you’ve reached the capacity of your Wounds and reached 0 HP, you are Downed and unable to take action. (See Revive in Base Actions on how to get back into the fight)"
            },
            {
              "t": "p",
              "text": "If combat ends while you are still Downed, you immediately start a Short Rest and will have your HP reset as usual, with the ability to spend Patches to remove Wounds."
            },
            {
              "t": "h",
              "text": "How Combat Ends"
            },
            {
              "t": "p",
              "text": "Combat ends when enemies have been defeated and the GM determines it is safe to rest."
            }
          ]
        },
        {
          "id": "chapter-1-playing-the-game-defense-durability",
          "title": "Defense & Durability",
          "blocks": [
            {
              "t": "h",
              "text": "Hit Points & Wounds"
            },
            {
              "t": "p",
              "text": "A character's health is tracked across two layers: HP and Wounds."
            },
            {
              "t": "p",
              "text": "Each class defines a starting HP and a number of Wounds the character can withstand. When your HP reaches 0, you “take a Wound” and your HP resets to full. Any additional damage after reaching 0 carries into the newly reset HP bar. Example: If you have 8 HP and 4 Wounds you can withstand and take 10 damage, you:"
            },
            {
              "t": "ul",
              "items": [
                "Take 8 damage and your HP reaches 0",
                "Take 1 Wound and your HP resets to 8",
                "The remaining damage applies and now you have 6 HP and 3 Wounds you can withstand."
              ]
            },
            {
              "t": "h",
              "text": "Taking a Wound & Death"
            },
            {
              "t": "p",
              "text": "When you take a Wound, you gain a negative effect, which stacks and lasts until you restore the Wound."
            },
            {
              "t": "p",
              "text": "Each Wound: -2 Armor and -1 Speed"
            },
            {
              "t": "p",
              "text": "Once you have taken your total capacity of Wounds and lost all your HP, you are Downed.."
            },
            {
              "t": "h",
              "text": "Armor"
            },
            {
              "t": "p",
              "text": "An Armor score negates damage equal to the Armor Rating. For example, Armor +2 reduces any incoming damage by 2, unless the attack is Armor Piercing, then the damage ignores Armor and applies all of the damage."
            },
            {
              "t": "h",
              "text": "Evasion"
            },
            {
              "t": "p",
              "text": "Evasion is the number an attacker must meet or beat on their d20 roll to hit you. For example, when your Evasion is 10 and someone rolls a 10 on the to-hit roll (including their Precision Bonus), the attack hits."
            },
            {
              "t": "h",
              "text": "Resistances, Immunities & Vulnerabilities"
            },
            {
              "t": "p",
              "text": "Resistance halves damage of that type, immunities fully negates damage of that type, and vulnerabilities double incoming damage of that type."
            },
            {
              "t": "p",
              "text": "Resistances, immunities, & vulnerabilities will usually note a damage type, if it does not, then it encompasses all damage."
            }
          ]
        },
        {
          "id": "chapter-1-playing-the-game-damage",
          "title": "Damage",
          "blocks": [
            {
              "t": "h",
              "text": "Damage Types"
            },
            {
              "t": "p",
              "text": "Physical"
            },
            {
              "t": "ul",
              "items": [
                "Physical",
                "Bleed"
              ]
            },
            {
              "t": "p",
              "text": "Elemental"
            },
            {
              "t": "ul",
              "items": [
                "Fire",
                "Cold",
                "Poison",
                "Lightning"
              ]
            },
            {
              "t": "p",
              "text": "Divine"
            },
            {
              "t": "ul",
              "items": [
                "Holy",
                "Unholy"
              ]
            },
            {
              "t": "p",
              "text": "Arcane"
            },
            {
              "t": "ul",
              "items": [
                "Magic",
                "Void (Armor Piercing)",
                "Psychic"
              ]
            },
            {
              "t": "h",
              "text": "How Damage Is Calculated"
            },
            {
              "t": "p",
              "text": "Roll the dice associated with the weapon, spell, or ability. If the attack is not Armor Piercing, subtract the target's Armor Rating from the result. Apply remaining damage to the target's HP."
            },
            {
              "t": "h",
              "text": "Healing"
            },
            {
              "t": "p",
              "text": "Healing is received through various class Healing Skills or items, which will indicate how much healing will be received by a flat number or a dice roll. Healing is boosted by your Fortune, which is applied to the target, even when that target is you."
            }
          ]
        },
        {
          "id": "chapter-1-playing-the-game-boons-conditions",
          "title": "Boons & Conditions",
          "blocks": [
            {
              "t": "p",
              "text": "Boons and Conditions are keyword-based buffs and debuffs. All of them stack unless otherwise stated. The number before a condition (e.g. 3 Confusion) indicates how many stacks are applied."
            },
            {
              "t": "p",
              "text": "When you take a Wound, you lose all Boons currently on you unless a trait specifically notes it."
            },
            {
              "t": "h",
              "text": "Boons"
            },
            {
              "t": "table",
              "head": [
                "Boon",
                "Effect per Stack"
              ],
              "rows": [
                [
                  "Strength",
                  "+1 Power"
                ],
                [
                  "Protection",
                  "+1 Armor. Lost after you next take damage"
                ],
                [
                  "Focus",
                  "+1 Lethality"
                ],
                [
                  "Guidance",
                  "+1 Advantage. Lost when you roll your next d20"
                ],
                [
                  "Regeneration",
                  "Heal 1 HP at the start of turn"
                ],
                [
                  "Invisible",
                  "Attacks against you have 1 Disadvantage and your attacks gain 1 Advantage; Lost when you make an attack or cast a spell."
                ]
              ]
            },
            {
              "t": "h",
              "text": "Conditions"
            },
            {
              "t": "table",
              "head": [
                "Condition",
                "Effect per Stack"
              ],
              "rows": [
                [
                  "Bleed",
                  "Take 1 Bleed damage at the end of your turn"
                ],
                [
                  "Poison",
                  "Take 1 Poison damage at the end of your turn"
                ],
                [
                  "Burn",
                  "Take 1 Fire damage at the end of your turn"
                ],
                [
                  "Confusion",
                  "Take 1 Psychic damage per action taken"
                ],
                [
                  "Slow",
                  "-1 Speed"
                ],
                [
                  "Chill",
                  "-1 Evasion"
                ],
                [
                  "Vulnerable",
                  "-1 Armor. Can reduce Armor into negative values, taking extra damage."
                ],
                [
                  "Dazed",
                  "-1 AP. Does not stack."
                ],
                [
                  "Blind / Deafened",
                  "1 Disadvantage on attack rolls"
                ]
              ]
            }
          ]
        },
        {
          "id": "chapter-1-playing-the-game-removing-boons-conditions",
          "title": "Removing Boons & Conditions",
          "blocks": [
            {
              "t": "p",
              "text": "All Boons & Conditions are removed at the end of a skirmish. During a skirmish, some abilities or effects will allow a creature to cleanse a number of conditions. When this happens, you cleanse all stacks of a number of conditions specified by the cleanse. For example, cleansing 2 conditions would allow you to cleanse all stacks of two different conditions."
            },
            {
              "t": "p",
              "text": "Additionally, a creature automatically cleanses all Slow, Daze, & Blind at the end of their turn."
            },
            {
              "t": "p",
              "text": "If an effect would cause a Player Character to remove boons, the player being forced to remove boons chooses which boons are removed."
            },
            {
              "t": "p",
              "text": "If a Player Character has an effect that removes boons from an enemy, the player chooses which boons they are removing from the enemy."
            }
          ]
        },
        {
          "id": "chapter-1-playing-the-game-spellcasting-abilities",
          "title": "Spellcasting & Abilities",
          "blocks": [
            {
              "t": "h",
              "text": "Mana"
            },
            {
              "t": "p",
              "text": "Characters have a well of mana they can call upon to cast spells and take certain actions. Every character, with the exception of the spellsword (See spellsword), starts with 10 Mana and gain a certain amount of Mana per level, which is noted on the Subclass."
            },
            {
              "t": "p",
              "text": "When multiclassing, choose the least restrictive option — the class with more Mana — but Mana pools do not combine."
            },
            {
              "t": "h",
              "text": "Mana in Action"
            },
            {
              "t": "p",
              "text": "Taking an action requires you to spend the AP, RP, and Mana the ability notes."
            },
            {
              "t": "p",
              "text": "Any action with the Spell tag is considered a spell. When you cast a spell you must have a Focus equipped. Spells function identically to other actions in all other respects."
            },
            {
              "t": "h",
              "text": "Areas of Effect"
            },
            {
              "t": "p",
              "text": "Abilities can target a creature within Range or cover an area in the shape of a Cone, Line, or Burst."
            },
            {
              "t": "p",
              "text": "Cone X = a 45º Cone that reaches out to X spaces."
            },
            {
              "t": "p",
              "text": "Line X = a straight Line that reaches X spaces out."
            },
            {
              "t": "p",
              "text": "Burst X = all spaces within X spaces of origin point."
            },
            {
              "t": "p",
              "text": "Blast X = combines Range and Blast; choose a space within Range that creates a Burst effect originating from that chosen space"
            },
            {
              "t": "p",
              "text": "Aura X = all spaces within X spaces of origin point. This area moves with its source and continues to affect the spaces around the source until it ends."
            },
            {
              "t": "p",
              "text": "Chain X = When an attack with Chain X successfully hits a creature, it jumps from one target to another up to X times. Repeat the attack against a different creature no more than 3 spaces from the original target. Repeat this process until an attack in the chain misses, or it jumps X times, whichever comes first."
            },
            {
              "t": "h",
              "text": "Counterspell"
            },
            {
              "t": "p",
              "text": "Spellcasters each have their unique way to counter a spell, found in their respective spell lists and can be taken upon leveling up."
            },
            {
              "t": "p",
              "text": "Enemies cannot counterspell in this way. When an enemy attempts to counterspell a player, a contest of Power occurs, if the enemy wins the player’s spell has disadvantage."
            },
            {
              "t": "h",
              "text": "Spell Families"
            },
            {
              "t": "table",
              "head": [
                "Family",
                "Family",
                "Family"
              ],
              "rows": [
                [
                  "Fire",
                  "Holy",
                  "Arcane"
                ],
                [
                  "Ice",
                  "Unholy",
                  "Illusion"
                ],
                [
                  "Lightning",
                  "Death",
                  "Psychic"
                ],
                [
                  "Curse",
                  "Nature",
                  "Void"
                ],
                [
                  "Chaos",
                  "",
                  ""
                ]
              ]
            },
            {
              "t": "h",
              "text": "Upcasting a Spell"
            },
            {
              "t": "p",
              "text": "Spellcasters can upcast a Spell by spending X + 1d3 per upcast level, where X equals the base spell Mana cost. When a spell is upcastable, the spell will define what benefit comes with each level of upcast."
            },
            {
              "t": "p",
              "text": "If you do not have the required Mana to cast the upcasted spell, you take damage equal to the amount missing from your Mana pool and the spell fails, spending your AP."
            },
            {
              "t": "p",
              "text": "For example,"
            },
            {
              "t": "p",
              "text": "Hailstorm costs 2 Mana and when upcast, it deals an extra 1d6 Cold damage and applies +1 Vulnerable to the target per upcast level. Each upcast level costs 2 (X = the base Mana) + 1d3 Mana. If you upcast it three times, it now costs 8 + 3d3. The base Mana is 2, we add 3 times the base Mana (for the three levels of upcast), which is 8 total. Then 1d3 is rolled per upcast level, equally 3d3 for a third level upcast. This means the range for Mana cost is 11 to 17 Mana. Let’s say all d3 roll the max number 3 on the die, now the spell costs 17 total Mana to cast at upcast level three."
            },
            {
              "t": "p",
              "text": "If you only have 15 Mana available in your pool, the spell fails and you take 2 Arcane damage because that’s the additional amount you need to cast the spell successfully. When the spell fails, your AP is spend but not your Mana."
            },
            {
              "t": "p",
              "text": "If you had the available Mana, you would spend the Mana to cast the spell and it would deal a total of 4d6 Cold damage and apply 4 Vulnerable on a hit."
            }
          ]
        },
        {
          "id": "chapter-1-playing-the-game-vision-light-perception",
          "title": "Vision, Light & Perception",
          "blocks": [
            {
              "t": "h",
              "text": "Light Levels"
            },
            {
              "t": "p",
              "text": "Different levels of light impact sight and the targetability of creatures within them."
            },
            {
              "t": "h",
              "text": "Sight Limits"
            },
            {
              "t": "p",
              "text": "You can see in broad daylight without obstructions."
            },
            {
              "t": "p",
              "text": "At night, when the moon is bright, you can see 6 spaces on a combat board. On a moonless night, you can only see 4 spaces."
            },
            {
              "t": "p",
              "text": "In a cave, where natural light is unfound, you cannot see and can only feel out to your reach."
            },
            {
              "t": "p",
              "text": "Other adventuring gear can help in dark places like if you have a lantern strapped to your waist or a torch affixed to your shoulder for more directional light (See Adventuring Gear)."
            },
            {
              "t": "h",
              "text": "Hiding & Stealth"
            },
            {
              "t": "p",
              "text": "Hiding is a check with a standard DC set at 10, adding any relevant Skill Bonus. Stealth-related skill checks can use bonuses like Move Unseen from the Agility skill category."
            },
            {
              "t": "p",
              "text": "Spotting a hidden target is similarly done by making a check with DC 10, adding a relevant Skill Bonus. Spotting and Hiding works the same way for characters and NPCs, friendly or hostile."
            }
          ]
        },
        {
          "id": "chapter-1-playing-the-game-social-interaction",
          "title": "Social Interaction",
          "blocks": [
            {
              "t": "h",
              "text": "Attitudes & Dispositions"
            },
            {
              "t": "p",
              "text": "Attitudes and dispositions are primarily set by the standard of the world and can be impacted by role playing scenarios and outcomes. They can apply Advantage or Disadvantage to Skill Checks at the GM’s discretion."
            },
            {
              "t": "p",
              "text": "For example, if you are returning to a bartender NPC that you’ve been particularly nice to, the GM may give you Advantage on your Skill Checks to gain information from them. The opposite can occur as well if you’ve been particularly mean to an NPC and the GM can give you Disadvantage on your social Skill Checks."
            },
            {
              "t": "p",
              "text": "A gaming group should always be open to share if they aren’t comfortable with predisposed prejudice or existing biases, such as sexism and racism. Although some players may think it provides realistic parallels to society, it shouldn’t be leaned on if it makes any party member uncomfortable."
            },
            {
              "t": "p",
              "text": "Besides, a clever GM should always be able to think of a reason an NPC might hate a party member. For example, the last time this party came to town, a horrifying monster attacked, and the time before that, they trashed the tavern without paying for the damages they caused."
            },
            {
              "t": "h",
              "text": "Changing an NPC's Stance"
            },
            {
              "t": "p",
              "text": "The game is roleplay at its core. As a player, you can give the GM a reason for an NPC’s attitude to change towards you, positively or negatively. Let’s hope your actions lead to more positive outcomes."
            },
            {
              "t": "h",
              "text": "Social Checks"
            },
            {
              "t": "p",
              "text": "Social checks follow the rules of standard DCs unless the GM decides the task is particularly easy or difficult. (See The Standard)"
            },
            {
              "t": "h",
              "text": "Failure & Success Consequences"
            },
            {
              "t": "p",
              "text": "The outcome of your actions are determined by the GM. Success can yield the desired goal or a misinterpreted version of it as new obstacles arise. Failure can cause hiccups or require pursuing other options entirely. Critical Failures can lead to more permanent barriers in your path."
            }
          ]
        },
        {
          "id": "chapter-1-playing-the-game-exploration",
          "title": "Exploration",
          "blocks": [
            {
              "t": "h",
              "text": "Travel & Pace"
            },
            {
              "t": "p",
              "text": "A party can travel a certain number of miles within one travel day, typically considered 8 hours of travel. Specifics of your travel limits are determined by the GM."
            },
            {
              "t": "h",
              "text": "Navigation & Getting Lost"
            },
            {
              "t": "p",
              "text": "When traveling with unreliable maps or without a map, your party can get lost. The impact is up to the GM. Failure in navigation may cost you resources like HP or Mana (signifying the difficulties they met on the road), or cause complications upon arrival indicating the extra time it took. For this reason, you should always prepare by hiring a guide, researching your route, or ensuring you have the proper tools for your route."
            },
            {
              "t": "h",
              "text": "Foraging & Survival"
            },
            {
              "t": "p",
              "text": "While out on the road, finding supplies or braving the wilderness can be attempted with Skill Checks. The difficulty is set by the GM, dictated by the environment and resource availability. For this reason, you should always prepare by purchasing more than enough goods, hiring an expert, or planning the proper route given your party’s expertise."
            },
            {
              "t": "h",
              "text": "Discovering Hidden Things"
            },
            {
              "t": "p",
              "text": "Discovering hidden things — traps, secrets, passages — can be attempted with Skill checks. Difficulty is dictated by the pressure of the situation or any magic impacting the hidden item."
            }
          ]
        },
        {
          "id": "chapter-1-playing-the-game-environment-hazards",
          "title": "Environment & Hazards",
          "blocks": [
            {
              "t": "p",
              "text": "Fall Damage equals 1d6 physical damage per Space, and there is no cap. Out of combat, 1 Space is equal to 5 Feet in a narrative environment."
            },
            {
              "t": "p",
              "text": "Difficult terrain costs double movement to move through, this includes burning ground, deep water, unstable surfaces, etc."
            },
            {
              "t": "p",
              "text": "You can hold their breath for a minimum of 1 minute"
            },
            {
              "t": "p",
              "text": "Dungeons may have traps and hazards throughout, keep an eye out and proceed with caution."
            },
            {
              "t": "p",
              "text": "Weather can cause visibility issues, targeting difficulty, or damage entirely dependent on the environment and up to the GM."
            }
          ]
        },
        {
          "id": "chapter-1-playing-the-game-resting-recovery",
          "title": "Resting & Recovery",
          "blocks": [
            {
              "t": "h",
              "text": "Patches"
            },
            {
              "t": "p",
              "text": "Every class has a number of Patches, determined by that class. Patches are the primary recovery resource in and out of combat."
            },
            {
              "t": "p",
              "text": "In Combat: You can spend 1 Patch and 2 AP to reset your HP to full and remove 1 Wound from your counter. You can Patch even if your HP does not need to be reset to full or when you haven’t taken a Wound that needs removal, however we recommend to prioritize Wound restoration when spending Patches."
            },
            {
              "t": "p",
              "text": "Outside Combat: Your HP reset automatically outside of combat and you can spend 1 Patch to remove 1 Wound as much as necessary outside of combat."
            },
            {
              "t": "h",
              "text": "Short Rest"
            },
            {
              "t": "p",
              "text": "After combat, the GM can determine the party has reached safety and can take a moment to Patch themselves up. Patches are not restored until you complete a Long Rest."
            },
            {
              "t": "p",
              "text": "Each class may indicate what else is restored on a Short Rest, such as Mana or other limited abilities. For most classes (all but spellsword), you will restore half your Maximum Mana on a Short Rest."
            },
            {
              "t": "h",
              "text": "Long Rest"
            },
            {
              "t": "p",
              "text": "Longer rests occur after an adventure — usually after a number of combat encounters — when the party has returned to a safe location like a city, town, or a formally protected camp. A Long Rest restores everything, like HP, Wounds, Mana, etc."
            },
            {
              "t": "p",
              "text": "The GM would not confirm a Long Rest has occurred until the night is over, especially if the story dictates something sinister may interrupt it."
            }
          ]
        },
        {
          "id": "chapter-1-playing-the-game-downtime",
          "title": "Downtime",
          "blocks": [
            {
              "t": "h",
              "text": "Available Downtime Activities"
            },
            {
              "t": "ul",
              "items": [
                "Craft an item (See Crafting an Item)",
                "Organized crime",
                "For-Profit or Non-profit organization",
                "Spread rumors",
                "Learn a skill (increase one skill by +1)",
                "Master a new weapon type",
                "Research a topic",
                "Establish a reputation",
                "and other creative activities"
              ]
            },
            {
              "t": "h",
              "text": "How Time & Cost Are Tracked"
            },
            {
              "t": "p",
              "text": "Each campaign should have a number of downtime instances in mind, spread out at the GM's discretion. Any given campaign should have between two and five downtime instances for players to explore. The timeline of downtime isn't necessarily important as it's the opportunity that matters."
            },
            {
              "t": "h",
              "text": "Rewards & Consequences"
            },
            {
              "t": "p",
              "text": "Most downtime activities complete automatically. Some skills might indicate a roll is required to attempt the activity during downtime."
            }
          ]
        },
        {
          "id": "chapter-1-playing-the-game-skills-out-of-combat-checks",
          "title": "Skills & Out-of-Combat Checks",
          "blocks": [
            {
              "t": "p",
              "text": "Skills represent general proficiencies used outside of combat for social encounters, exploration, crafting, and more. You get 4 Skill Points to allocate at character creation. On each level up you gain +1 Skill Point to allocate into a new skill or to improve a previously selected skill."
            },
            {
              "t": "p",
              "text": "You can put as many points into a particular skill or spread them out into 4 different skills at character creation."
            },
            {
              "t": "h",
              "text": "How Skill Checks Work"
            },
            {
              "t": "p",
              "text": "Skill checks use the standard Check rules — roll 1d20, add your relevant skill bonus, meet or beat the DC. The GM sets the DC based on difficulty."
            },
            {
              "t": "h",
              "text": "Determining Which Bonus to Use"
            },
            {
              "t": "p",
              "text": "In Waypoint, you won’t be asked to make a particularly skill check as they’re known by their narrative explanation versus their specific name, although we aim for the name to be self-explanatory to better remember their use."
            },
            {
              "t": "p",
              "text": "For example, the skill Hold Yer Liquor doesn’t only mean you can handle your alcoholic intake, as the name suggests. It applies to overall toughness with how hearty you are in situations like extreme environments and pushing beyond normal physical limits."
            },
            {
              "t": "p",
              "text": "Your GM won’t ask you to make a Hold Yer Liquor check ever. You should describe what you’d like to do, such as swallowing a nail as a party trick. Your GM will ask you to make a check, where you, as the player, will determine if you have a skill that fits your narrative decision that led to this check. So to swallow a nail, you could roll a d20 and include your bonus from Hold Yer Liquor."
            },
            {
              "t": "p",
              "text": "If you’re not sure how skills apply to situations beyond their description, discuss it with your GM and the rest of your party to keep everyone on the same page. Waypoint’s skills are meant to lead to more creative narration of your actions so you shouldn’t focus on making certain skill checks, but it is good to understand what your bonuses may apply to and which ones you would want to boost based on your playstyle."
            },
            {
              "t": "h",
              "text": "Group Checks"
            },
            {
              "t": "p",
              "text": "Some checks will require multiple checks but there are two main ways to rule them."
            },
            {
              "t": "p",
              "text": "Weakest Link: Because a chain is only as strong as its weakest link, if the whole party is sneaking by a group of enemies, they may all need to pass a check to remain hidden. This will rely on their independent roles to beat or meet the DC."
            },
            {
              "t": "p",
              "text": "Collective Average: If the five members of a party are making checks to push a boulder out of the way, half or more of the individuals must pass the check. So if three out of the five members pass the check, they can succeed on the action as they are all contributing to the same goal. If there is an even amount, half of the members must succeed. If half, or the majority, do not succeed then the action fails."
            },
            {
              "t": "p",
              "text": "The use of these rules will be determined by your GM based on the activity and communicated prior to the party rolling. If you don’t like the method they chose, try another creative approach that may convince them otherwise…"
            },
            {
              "t": "h",
              "text": "Contested Rolls"
            },
            {
              "t": "p",
              "text": "Some checks are contested where both parties roll and the higher result wins. Ties go to the target unless otherwise stated."
            },
            {
              "t": "h",
              "text": "Body"
            },
            {
              "t": "p",
              "text": "Hold Yer Liquor:"
            },
            {
              "t": "ul",
              "items": [
                "You have an iron stomach and can hold your own and then some. This is but one example of your girthiness. Another is that you’ve taken enough hits to the face that you’ve stopped flinching. This positively impacts your ability to stave off disease, withstand extreme environments, and do party tricks like eating a nail."
              ]
            },
            {
              "t": "p",
              "text": "Gentle Giant:"
            },
            {
              "t": "ul",
              "items": [
                "There’s strong and then there’s you. You’ve learned that sometimes the answer isn’t to pick the lock, it’s to remove the door. Perhaps even the best way through a door is to throw something heavy at it. Feats of raw power such as holding a door closed with a horde of zombies on the other side, lifting and moving objects of absurd weight, and even juggling your friends all fall within the wheelhouse of someone who treats boulders like a pebble."
              ]
            },
            {
              "t": "p",
              "text": "Gymnast:"
            },
            {
              "t": "ul",
              "items": [
                "You jump and climb, and you keep doing it long after everyone else has stopped. Walls, cliffs, rooftops, rigging, open water, it's all just terrain that hasn't been crossed yet. You might be afraid of heights but that doesn't mean you can't get around quickly, whether that's threading a packed market at a dead sprint or crossing grassland ahead of raiders who know it better than you do. You never tire. You never stop. Never back down, never what?"
              ]
            },
            {
              "t": "p",
              "text": "Do a Flip:"
            },
            {
              "t": "ul",
              "items": [
                "Perform a particularly dexterous feat such as \"doing a flip.\" This isn't just sticking a landing, although that's definitely in your normal wheelhouse, it's also about making it look like you know what you're doing when getting around or showing off with physical feats. Intentional acrobatics are your party trick. That same body control works when nobody's watching too: catching the vial before it hits the floor, throwing yourself clear of something too large to catch, or folding yourself out of manacles, a straitjacket, or a cell window that was never meant to fit a person. Tight spaces and bad timing are problems for people with normal joints."
              ]
            },
            {
              "t": "p",
              "text": "In the Saddle:"
            },
            {
              "t": "ul",
              "items": [
                "You and your mount have an understanding. Whether it’s a horse, a wyvern, or something considerably weirder, you’ve developed the instinct for how animals move and the body language to get them moving the way you need. Riding hard, staying mounted when things get sideways, or simply convincing a stubborn beast that you’re worth listening to, you’ve earned that trust. Maybe you look like one of them, watch out in mating season."
              ]
            },
            {
              "t": "h",
              "text": "Sleight"
            },
            {
              "t": "p",
              "text": "Move Unseen:"
            },
            {
              "t": "ul",
              "items": [
                "Get somewhere in an extraordinarily sneaky manner as you’ve learned to cover your tracks and avoid all kinds of patrols."
              ]
            },
            {
              "t": "p",
              "text": "Hat Trick:"
            },
            {
              "t": "ul",
              "items": [
                "Whether it’s to obtain something that doesn’t quite belong to you, or for a simple card, your hands have mastered their ability to perform showy sleights without your target being the wiser. Keep in mind, you have innately quick fingers but your real skill is your aptitude for misdirection."
              ]
            },
            {
              "t": "p",
              "text": "Quick Fingers:"
            },
            {
              "t": "ul",
              "items": [
                "Where hat tricks are about misleading viewers and your showmanship itself, this is about unfettered nimbleness and hand-eye coordination. Threading a lock, cutting a purse string, or swapping out a document before someone turns around are all in your domain. You little rascal, you."
              ]
            },
            {
              "t": "p",
              "text": "Wear a Face:"
            },
            {
              "t": "ul",
              "items": [
                "You’ve proven adept at the skill of impersonation. A different walk, a borrowed accent, the practiced confidence of a station above your own or the cultivated invisibility of one below it. You don’t need a costume to disappear into a crowd, you just need a moment to decide who you’re going to be today."
              ]
            },
            {
              "t": "p",
              "text": "Eye for Forgery:"
            },
            {
              "t": "ul",
              "items": [
                "You’ve developed an eye for the value and legitimacy of rare items. Due to your discerning eye, you can create believable forgeries. This includes deeds, titles, immigration papers, legal contracts, accounting numbers, and other boring things that might be made more interesting with your input. Additionally, when it comes to gems, artifacts, paintings, forged documents, suspiciously cheap armor, you can attempt to assess the worth of almost anything given a closer look."
              ]
            },
            {
              "t": "h",
              "text": "Study"
            },
            {
              "t": "p",
              "text": "Book Smarts:"
            },
            {
              "t": "ul",
              "items": [
                "Due to the surplus of hours you've spent with your nose in a book, random facts, useful or useless, have been catalogued away for just the right time. You know about religions and the histories of all sorts of societies. You don't necessarily know every language from the day you hatched either, but you've become extensively cultured through the pages of books about the history of languages, and beyond your original tongue, you can speak, read, and understand most of them given enough time… Nerd."
              ]
            },
            {
              "t": "p",
              "text": "Field Guide:"
            },
            {
              "t": "ul",
              "items": [
                "You know what's out there, what it eats, and whether it's supposed to be here. Creatures of all kinds, their habits, their nests, their anatomy, and which parts are worth cutting out afterward. The same goes for anything that grows: which mushroom is dinner, which one is a very bad afternoon. Sometimes the useful thing isn't knowing what something is, it's knowing that nothing like it has ever lived within a hundred miles of here."
              ]
            },
            {
              "t": "p",
              "text": "Inventor:"
            },
            {
              "t": "ul",
              "items": [
                "Your mind turns its gears to understand the way things work and this has made putting together creative mechanisms a common pastime for a tinkerer like yourself. Whether you’re mending a broken wagon or building a society-changing technology, you’re a natural."
              ]
            },
            {
              "t": "p",
              "text": "Imbued:"
            },
            {
              "t": "ul",
              "items": [
                "You’ve studied the academic side of magical craftsmanship, how enchantments work, what runes mean structurally, how a magical item was likely made and by whom. You can’t necessarily cast spells but you understand the architecture of magic as it exists in physical forms. Useful for figuring out what a mysterious item does, how to safely dismantle it, or in the right circumstances, how to make something magical yourself given the materials and time."
              ]
            },
            {
              "t": "p",
              "text": "Alchemist:"
            },
            {
              "t": "ul",
              "items": [
                "You’ve learned the ways of the herb, you understand how to put together medicines that heal infections or to concoct vile poisons with effects only limited by your imagination, given the right ingredients are available, and that same knowledge doesn't abandon you when there's no table, no time, and someone bleeding out at your feet."
              ]
            },
            {
              "t": "p",
              "text": "Path Less Taken:"
            },
            {
              "t": "ul",
              "items": [
                "You are good at navigating through the wilderness and surviving for weeks with only a yard of twine and two smooth stones. Paths you’ve walked once feel like your daily route. Retracing your steps and avoiding getting lost are your bread and butter. Maybe it was all those maps you memorized as a kid when you sat alone in the schoolyard, regardless, you know the land."
              ]
            },
            {
              "t": "h",
              "text": "Instinct"
            },
            {
              "t": "p",
              "text": "Keep an Eye Out:"
            },
            {
              "t": "ul",
              "items": [
                "You’ve developed an instinct for the physical lay of the land, out in the wilderness and within the walls of the city. Entrances, exits, the guy near the door who’s a little too still, the table that’s bolted to the floor for no good reason, you’re particularly good at picking it up. It might even be to find a hidden passageway because of the dust formation on a frame or the covered tracks in the mud. What it means is up to you."
              ]
            },
            {
              "t": "p",
              "text": "Something in the Air:"
            },
            {
              "t": "ul",
              "items": [
                "You don't need a textbook to know when magic has been at work in a place, on a person, or inside an object. You feel it the way some people feel a change in weather — in your chest, behind your eyes, at the back of your teeth. You couldn't always explain how you know, and honestly you've stopped trying. Whether it's residual energy in a room where a spell was cast, the particular wrongness of a cursed item, or the shimmer of something that doesn't want to be found, you notice what others walk right past. Imbued tells you how magic was made. This tells you that it was there at all."
              ]
            },
            {
              "t": "p",
              "text": "I Got A Bad Feeling About This:"
            },
            {
              "t": "ul",
              "items": [
                "Some things you just know about without being able to explain how. Gut feelings, bad vibes, a slight tremor in the ground, your intuition has been sharpened by experiences, loss, or something you don’t like talking about. Maybe you’re just old and have seen it all, but your gut tells you something ain’t right. Magic, though, somehow slips right past you… perhaps magic is more about Something in the Air."
              ]
            },
            {
              "t": "p",
              "text": "Read a Person:"
            },
            {
              "t": "ul",
              "items": [
                "You’ve become an excellent judge of character, either from age or being wronged so many times you’ve seen it all, you can read people to try to sniff out lies or to question the authenticity of their intentions, said or unsaid."
              ]
            },
            {
              "t": "h",
              "text": "Influence"
            },
            {
              "t": "p",
              "text": "Presence:"
            },
            {
              "t": "ul",
              "items": [
                "You’ve got a presence that hits before your fists do. A well placed shout matched with your intimidating stature has a way of making people reconsider their choices. Sometimes all you need is to stare as the vein pops in your forehead. This clearly isn’t charm either, it’s the physical weight of your existence as you clearly don’t need to prove anything to anyone in the room."
              ]
            },
            {
              "t": "p",
              "text": "Silver Tongue:"
            },
            {
              "t": "ul",
              "items": [
                "You have a way with words, which helps you to get your way in many situations. You have a likeable charm about you that gives you the edge when getting better prices on goods, gaining allies, or convincing someone to act particularly courageous or out of character."
              ]
            },
            {
              "t": "p",
              "text": "Believable:"
            },
            {
              "t": "ul",
              "items": [
                "You’re a scoundrel and people might know you’re lying but can’t help but wish you were telling the truth. It doesn’t matter what you’re wearing or where you’re caught, there’s always a chance that your words can get you out of a sticky situation. The stories you spin up often don’t feel too farfetched, regardless of how rationally farfetched they truly sound."
              ]
            },
            {
              "t": "p",
              "text": "Natural-Born Star:"
            },
            {
              "t": "ul",
              "items": [
                "When there’s a show you put on, whether it’s singing, dancing, or playing a tune, you have the j e ne sais quoi. That something about you is what can draw a crowd as the eyes of your enamored fans are focused solely on you."
              ]
            },
            {
              "t": "p",
              "text": "High Brow:"
            },
            {
              "t": "ul",
              "items": [
                "You know about political corruption, its extent, and its purpose in the highest upper echelon of civilizations. You know the networks necessary to get the word out or get word on something you’re looking into from the most prominent figures in society."
              ]
            },
            {
              "t": "p",
              "text": "Street Smarts:"
            },
            {
              "t": "ul",
              "items": [
                "Who needs those high brow aristocrats? As the people’s champ, you know the people that line the depth of the streets. You’ve built a genuine network among the riff raff of contacts, informants, neighbors, debtors, and as always, Ricard, who is basically the king of the dirt bags. You understand the way the world works and how to make the system work for you. If you need information, a favor, a safe place, you can always call on someone, and if no one answers, you’ll run into good ole Ricard probably."
              ]
            },
            {
              "t": "p",
              "text": "Keep It Together:"
            },
            {
              "t": "ul",
              "items": [
                "When things fall apart, as they usually do with a group of strangers on a mission to kill a god, someone has to hold the line. You’ve developed a steadiness under pressure that keeps panic at bay. It lets you make clear decisions when everything around you is on fire, literally and figuratively, and that calming presence can seep to others to even attempt to prevent mass hysteria."
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "chapter-2-creating-a-character",
      "title": "CHAPTER 2: CREATING A CHARACTER",
      "sections": [
        {
          "id": "chapter-2-creating-a-character-overview",
          "title": "Overview",
          "blocks": [
            {
              "t": "ul",
              "items": [
                "Character base stats if they are not wearing any armor:",
                "Evasion: 8",
                "Armor: 0",
                "Fortitude: 8",
                "Speed: 5",
                "Unarmed Attack: 1d4 Physical damage"
              ]
            }
          ]
        },
        {
          "id": "chapter-2-creating-a-character-step-by-step-character-creation",
          "title": "Step-by-Step Character Creation",
          "blocks": [
            {
              "t": "h",
              "text": "Step 1 — Choose a Class"
            },
            {
              "t": "p",
              "text": "Select one of the nine classes available, spread across three basic families (Warrior, Rogue, and Mage), select one, which will grant you its Tier 0 trait:"
            },
            {
              "t": "ul",
              "items": [
                "Barbarian",
                "Fighter",
                "Knight",
                "Assassin",
                "Monk",
                "Ranger",
                "Elementalist",
                "Magician",
                "Occultist"
              ]
            },
            {
              "t": "h",
              "text": "Step 2 — Choose a Subclass"
            },
            {
              "t": "p",
              "text": "Select one of the three subclasses within your chosen class. You will immediately receive the Tier 0 Trait from both your Class and your Subclass, which are your defining starting features. Subclasses include:"
            },
            {
              "t": "p",
              "text": "Barbarian"
            },
            {
              "t": "ul",
              "items": [
                "The Beast",
                "Primal",
                "Berserker"
              ]
            },
            {
              "t": "p",
              "text": "Fighter"
            },
            {
              "t": "ul",
              "items": [
                "Strategist",
                "The Jugg",
                "spellsword"
              ]
            },
            {
              "t": "p",
              "text": "Knight"
            },
            {
              "t": "ul",
              "items": [
                "Paladin",
                "Crusader",
                "Death"
              ]
            },
            {
              "t": "p",
              "text": "Assassin"
            },
            {
              "t": "ul",
              "items": [
                "Deadly",
                "Venomous",
                "Scoundrel"
              ]
            },
            {
              "t": "p",
              "text": "Monk"
            },
            {
              "t": "ul",
              "items": [
                "The Master",
                "Ninja",
                "Acolyte"
              ]
            },
            {
              "t": "p",
              "text": "Ranger"
            },
            {
              "t": "ul",
              "items": [
                "Marksman",
                "Druid",
                "Hunter"
              ]
            },
            {
              "t": "p",
              "text": "Elementalist"
            },
            {
              "t": "ul",
              "items": [
                "Fire",
                "Ice",
                "Lightning"
              ]
            },
            {
              "t": "p",
              "text": "Magician"
            },
            {
              "t": "ul",
              "items": [
                "Chronomancy",
                "Duplicity",
                "Psychic"
              ]
            },
            {
              "t": "p",
              "text": "Occultist"
            },
            {
              "t": "ul",
              "items": [
                "Reaper",
                "Chaos",
                "Curses"
              ]
            },
            {
              "t": "h",
              "text": "Step 3 — Assign Attribute Points"
            },
            {
              "t": "p",
              "text": "You receive 4 Attribute Points at character creation to distribute freely across your six core attributes, which increase any attributes by 1 per point spent. Choose from:"
            },
            {
              "t": "ul",
              "items": [
                "Power",
                "Precision",
                "Lethality",
                "Constitution",
                "Dexterity",
                "Fortune"
              ]
            },
            {
              "t": "h",
              "text": "Step 4 — Assign Skill Points"
            },
            {
              "t": "p",
              "text": "You receive 4 (each +2) Skill Points at character creation to distribute across any skills of your choice, which must be put into four different skills at character creation, subsequent skill points can stack onto already obtained skills or put into new ones."
            },
            {
              "t": "h",
              "text": "Step 5 — Choose Your Loadout"
            },
            {
              "t": "p",
              "text": "Select your starting equipment — up to 2 hands worth of weapons and shields, plus your starting armor as permitted by your class. Plus 3 pieces of Adventuring Gear (See Adventuring Gear)."
            },
            {
              "t": "h",
              "text": "Step 6 — Define Your Origin"
            },
            {
              "t": "p",
              "text": "Your Narrative Origin is entirely up to you. Create your backstory and run with it. Here’s a collection of questions you can answer to decide your origin at whatever depth you’d like."
            },
            {
              "t": "p",
              "text": "Who are you? Where did you grow up? How did you end up in the setting of this campaign? What was your job before this campaign started? Are you a law-abiding citizen? Do locals know your name?"
            },
            {
              "t": "p",
              "text": "Your stats aren't tied to your background mechanically, but feel free to build off them if you'd like. Alternatively, don't create a backstory at all. Show up and discover your character with your friends at the table."
            }
          ]
        },
        {
          "id": "chapter-2-creating-a-character-leveling-up",
          "title": "Leveling Up",
          "blocks": [
            {
              "t": "p",
              "text": "Waypoint is designed around milestone leveling, meaning as you progress through the story, the GM will determine when you will level up. This does not mean that every action has to serve the main plot, especially when you want to loot a random dungeon on the map. These are times when the GM may reward you with levels for exploration. Beware though, the stronger you are, the stronger enemies you may encounter."
            },
            {
              "t": "p",
              "text": "At each level you gain:"
            },
            {
              "t": "ul",
              "items": [
                "1 Attribute Point",
                "1 Skill Point",
                "Your choice of 1 Trait",
                "1 Spell or ability can be obtained every odd level from the subclass you chose to level up"
              ]
            },
            {
              "t": "h",
              "text": "Trait Tier Access"
            },
            {
              "t": "table",
              "head": [
                "Level Range",
                "Trait Tier Available"
              ],
              "rows": [
                [
                  "1–3",
                  "Tier 1"
                ],
                [
                  "4–6",
                  "Tier 2"
                ],
                [
                  "7-9",
                  "Tier 3"
                ],
                [
                  "10",
                  "Tier 4 (Capstone)"
                ]
              ]
            },
            {
              "t": "p",
              "text": "Trait access is tracked per subclass, not globally. To unlock Tier 2 traits for a class or subclass, you need 4 levels in that specific class and/or subclass. When you level up, think of it as choosing a subclass to level up. Along with the subclass leveling up, you’ll also gain a level in that parent class, which determines your traits available within the class and the subclass."
            },
            {
              "t": "h",
              "text": "Starting at Higher Levels"
            },
            {
              "t": "p",
              "text": "If a group is starting at a higher level, the creation process is the same. Simply level up accordingly and make trait selections for each level gained."
            }
          ]
        },
        {
          "id": "chapter-2-creating-a-character-multiclassing",
          "title": "Multiclassing",
          "blocks": [
            {
              "t": "p",
              "text": "Whenever you level up you can choose to advance any current subclass progression or start a new one. This new subclass can be any class/subclass of your choice."
            },
            {
              "t": "p",
              "text": "Once you have levels in more than one subclass, you are considered to be multiclassing."
            },
            {
              "t": "p",
              "text": "Weapon & Armor Restrictions If two or more of your classes have weapon or armor restrictions that conflict, you follow the least restrictive option."
            },
            {
              "t": "p",
              "text": "Health Pools If two or more classes have different health pool sizes, your health pool is determined by whichever class you have the majority of levels in. On a tie, you choose."
            },
            {
              "t": "p",
              "text": "Mana and Stat blocks When multiclassing, choose the least restrictive Mana pool and Stat block: the class with more Mana or more options. Mana pools do not combine."
            },
            {
              "t": "p",
              "text": "When selecting a subclass upon level up, the amount that your maximum Mana pool increases by is dictated by the subclass you chose for that level."
            }
          ]
        }
      ]
    },
    {
      "id": "chapter-3-classes-subclasses",
      "title": "CHAPTER 3: CLASSES & SUBCLASSES",
      "sections": [
        {
          "id": "chapter-3-classes-subclasses-overview",
          "title": "Overview",
          "blocks": [
            {
              "t": "p",
              "text": "Will list them"
            }
          ]
        }
      ]
    },
    {
      "id": "chapter-4-equipment",
      "title": "CHAPTER 4: EQUIPMENT",
      "sections": [
        {
          "id": "chapter-4-equipment-gear-slots",
          "title": "Gear Slots",
          "blocks": [
            {
              "t": "table",
              "head": [
                "Slot",
                "Notes"
              ],
              "rows": [
                [
                  "Weapon(s)",
                  "2 hands worth total"
                ],
                [
                  "Armor",
                  "One set — the armor you are currently wearing"
                ],
                [
                  "Shield",
                  "Included in the 2 hands worth of gear"
                ]
              ]
            }
          ]
        },
        {
          "id": "chapter-4-equipment-weapons",
          "title": "Weapons",
          "blocks": [
            {
              "t": "p",
              "text": "Weapons are either 1-handed or 2-handed and fall into the categories of Melee, Ranged, or Focus. All weapons of the same class deal the same base damage, as the Physical damage type. Weapons do not grant attribute bonuses — attribute expression comes from how you assign your Attribute Points at creation and on level up."
            },
            {
              "t": "h",
              "text": "1-Handed Melee — 1d6 damage, range 1"
            },
            {
              "t": "ul",
              "items": [
                "Dagger",
                "Shortsword",
                "Axe",
                "Mace",
                "Flail",
                "Spear"
              ]
            },
            {
              "t": "h",
              "text": "2-Handed Melee — 2d8 base damage, range 1"
            },
            {
              "t": "ul",
              "items": [
                "Greatsword",
                "Greataxe",
                "Maul",
                "Halberd"
              ]
            },
            {
              "t": "h",
              "text": "1-Handed Ranged — 1d4 damage, range 5"
            },
            {
              "t": "ul",
              "items": [
                "Hand Crossbow",
                "Slingshot",
                "Rock",
                "Light Firearms**"
              ]
            },
            {
              "t": "h",
              "text": "2-Handed Ranged — 2d6 base damage, range 10"
            },
            {
              "t": "ul",
              "items": [
                "Bow",
                "Crossbow",
                "Firearms**"
              ]
            },
            {
              "t": "p",
              "text": "**Firearms can be used based on the setting that GM creates for the adventure"
            },
            {
              "t": "h",
              "text": "Magic Focuses"
            },
            {
              "t": "table",
              "head": [
                "Focus",
                "Hands",
                "Notes"
              ],
              "rows": [
                [
                  "Wand, amulet,",
                  "1H",
                  "Spells cost -1 Mana"
                ],
                [
                  "Staff, musical instrument",
                  "2H",
                  "Range of a spell is increased:"
                ],
                [
                  "",
                  "",
                  "Burst +1"
                ],
                [
                  "",
                  "",
                  "Line +3"
                ],
                [
                  "",
                  "",
                  "Cone +1"
                ],
                [
                  "",
                  "",
                  "Range +3"
                ]
              ]
            },
            {
              "t": "h",
              "text": "Weapon Tags:"
            },
            {
              "t": "ul",
              "items": [
                "Super Heavy: This weapon receives 1 Disadvantage on all attacks but deal +1d8 base damage, can only be applied to 2H weapons",
                "Light: This weapon gains Reliable 2 and deals -2 damage when an attack hits. (Reliable means that even when an attack misses, the target still takes 2 damage)",
                "Loading: This weapon must be reloaded after each attack, reloaded taking 1 AP. Loading weapons gain 1d6 damage",
                "Reach: If applied to a Melee weapon, Range and Threat becomes 2 but gains Disadvantage when attacking a target within Range 1. If applied to a Ranged weapon, you can shoot 5 spaces beyond your weapon’s Range, but the attack beyond the regular Range is made with 1 Disadvantage."
              ]
            }
          ]
        },
        {
          "id": "chapter-4-equipment-shields",
          "title": "Shields",
          "blocks": [
            {
              "t": "p",
              "text": "Shields are wielded as 1-handed items, and a shield occupies a gear slot."
            },
            {
              "t": "p",
              "text": "Shield options:"
            },
            {
              "t": "ul",
              "items": [
                "+2 Armor",
                "+2 Evasion",
                "+1 Armor and +1 Evasion"
              ]
            }
          ]
        },
        {
          "id": "chapter-4-equipment-dual-wielding",
          "title": "Dual Wielding",
          "blocks": [
            {
              "t": "p",
              "text": "When you take the Weapon Attack action, you can attack with your offhand weapon as well — but the offhand attack does not gain the bonus damage from Power."
            }
          ]
        },
        {
          "id": "chapter-4-equipment-crafting-an-item",
          "title": "Crafting an Item",
          "blocks": [
            {
              "t": "ul",
              "items": [
                "Crafted items take up 2 equipment slots",
                "Craft items will break on a Natural 1 roll when using them for combat or utility, more precariously crafted items could increase the break chances of the item breaking by increasing the minimum roll",
                "They cost gold - scale determined by GM",
                "Must be crafted during a long rest",
                "Attempt to craft the item with a skill check adding relevant skill bonuses, DC 10, can be increased per GM discretion"
              ]
            }
          ]
        },
        {
          "id": "chapter-4-equipment-magic-items-stat-sticks",
          "title": "Magic Items — Stat Sticks",
          "blocks": [
            {
              "t": "p",
              "text": "There are no generic +1 weapons or armor in this system. Magic weapons and armor provide specific attribute bonuses, keeping gear choices meaningful and character-expressive."
            },
            {
              "t": "p",
              "text": "Examples:"
            },
            {
              "t": "p",
              "text": "Berserker's Sword: +1 Power, +1 Precision, +1 Lethality"
            },
            {
              "t": "p",
              "text": "Assassin's Sword: +2 Lethality, +1 Precision"
            }
          ]
        },
        {
          "id": "chapter-4-equipment-armor",
          "title": "Armor",
          "blocks": [
            {
              "t": "p",
              "text": "Evasion is the number an attacker must meet or beat to hit you. Armor is the amount of flat damage negation applied to incoming hits."
            },
            {
              "t": "table",
              "head": [
                "Armor Type",
                "Evasion",
                "Armor",
                "Speed"
              ],
              "rows": [
                [
                  "Light Armor",
                  "12",
                  "0",
                  "+1"
                ],
                [
                  "Medium Armor",
                  "10",
                  "+2",
                  "0"
                ],
                [
                  "Heavy Armor",
                  "8",
                  "+4",
                  "-1"
                ]
              ]
            }
          ]
        },
        {
          "id": "chapter-4-equipment-adventuring-gear",
          "title": "Adventuring Gear",
          "blocks": [
            {
              "t": "p",
              "text": "There is no currency system when it comes to mundane items — players have money for what they need, including gear, lodging, and food. An example adventuring gear compendium list will be included here. Players can carry basic items that would reasonably exist in the world at GM discretion."
            },
            {
              "t": "h",
              "text": "Crafting an Item"
            }
          ]
        }
      ]
    },
    {
      "id": "chapter-5-magic-spells",
      "title": "CHAPTER 5: MAGIC & SPELLS",
      "sections": [
        {
          "id": "chapter-5-magic-spells-how-spellcasting-works",
          "title": "How Spellcasting Works",
          "blocks": [
            {
              "t": "p",
              "text": "Spellcasters draw on a pool of Mana to cast spells. Any action with the Spell tag is a spell. When you cast a spell you must have a Focus equipped and spend both the AP the action costs and any Mana it requires."
            },
            {
              "t": "p",
              "text": "Mana scales per level at a rate defined by each class."
            }
          ]
        },
        {
          "id": "chapter-5-magic-spells-spell-families",
          "title": "Spell Families",
          "blocks": [
            {
              "t": "table",
              "head": [
                "Family",
                "Family",
                "Family"
              ],
              "rows": [
                [
                  "Fire",
                  "Holy",
                  "Arcane"
                ],
                [
                  "Ice",
                  "Unholy",
                  "Illusion"
                ],
                [
                  "Lightning",
                  "Death",
                  "Psychic"
                ],
                [
                  "Curse",
                  "Nature",
                  "Void"
                ],
                [
                  "Chaos",
                  "",
                  ""
                ]
              ]
            },
            {
              "t": "p",
              "text": "Void damage is always Armor Piercing."
            }
          ]
        },
        {
          "id": "chapter-5-magic-spells-fortitude-magical-evasion",
          "title": "Fortitude (Magical Evasion)",
          "blocks": [
            {
              "t": "p",
              "text": "Fortitude is your defense to magical effects tagged as a Charm. When the action indicates this tag, it targets your Fortitude rather than your Evasion. Every player’s base Fortitude is 8 and increases with bonuses to Fortune."
            }
          ]
        },
        {
          "id": "chapter-5-magic-spells-areas-of-effect",
          "title": "Areas of Effect",
          "blocks": [
            {
              "t": "p",
              "text": "Spells can target a creature within Range or cover an area in the shape of a Cone, Line, or Burst."
            },
            {
              "t": "p",
              "text": "Cone X = a 45º Cone that reaches out to X spaces Line X = a straight Line that reaches out to X spaces Burst X = all spaces within X spaces of origin point"
            }
          ]
        }
      ]
    },
    {
      "id": "appendix-a-rules-glossary",
      "title": "APPENDIX A: RULES GLOSSARY",
      "sections": [
        {
          "id": "appendix-a-rules-glossary-overview",
          "title": "Overview",
          "blocks": [
            {
              "t": "p",
              "text": "Every keyword, tag, and mechanical term defined in one place. To be written as Phase 1 locks. Priority terms to define: Attack, Spell, Move, Boon, Condition, Wound, Patch, Armor Piercing, Burst, Cone, Line, Focus, Tier, Trait."
            }
          ]
        }
      ]
    }
  ],
  "generated": "2026-09-15"
};
