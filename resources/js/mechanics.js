/* =====================================================================
   MEEPLE — GAME MECHANICS
   ---------------------------------------------------------------------
   THE one implementation of Meeple's arithmetic: every derived stat
   (health, mana, Evasion, Armor, crit range…) and every play rule (heal,
   damage and the Wound cascade, rests, Patches, Boons and Conditions).
   Same arrangement and the same reason as dice.js — one engine, two
   callers:

     · the app    — main.js creates one engine at load and calls it
                    through thin wrappers that pass the open character.
     · the tests  — tests/unit/mechanics.test.js, in Node, with a tiny
                    hand-written compendium. This file is why the rules
                    can be tested at all: inside main.js they were sealed
                    in a closure that needed a browser page to load.

   THE CONTRACT
     · No DOM, no storage, no UI state. Nothing here knows a page exists.
     · Every function takes the character (`ch`) as its first argument —
       or a `build`, for the questions asked of a build nobody has
       committed to yet (the roster, the creation wizard).
     · Play rules CHANGE the character they are handed, in place, the way
       main.js always has. Derived values are computed on every call and
       never written back — "derive, don't store".
     · Content arrives through create(): the engine is handed lookups
       (subclassOf, itemOf, effectById) rather than reaching for the
       library, so the tests can hand it a small fixture instead.

   The rule constants are exported as RULES so main.js and the tests read
   the same numbers. Change a rule here and every readout follows.

   A plain global plus a CommonJS export, like dice.js: the browser loads
   it as a classic <script>, Node requires it.
   ===================================================================== */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* RULES — every number the guide states, named once                  */
  /* ------------------------------------------------------------------ */
  const RULES = Object.freeze({
    // 1 point of Precision = +2 to hit (weapons and spells alike).
    PRECISION_TO_HIT: 2,
    // "Roll damage — weapon or spell dice + Power" (guide, Ch.1).
    POWER_TO_DAMAGE: 1,
    // Fortune is healing OUTPUT; see healBonus().
    FORTUNE_TO_HEAL: 1,
    // Poison is healing INTAKE: −1 healing received per stack.
    POISON_TO_HEAL: -1,
    // Critical Strikes — see critThreshold().
    CRIT_BASE: 20,
    LETHALITY_TO_CRIT: -1,
    CRIT_MIN_FACE: 2,
    // One skill point is worth +2 (guide, step 4).
    SKILL_POINT_BONUS: 2,
    // Both budgets: 4 at creation, 1 per level-up (guide, ch.2).
    SKILL_POINTS_AT_CREATION: 4,
    SKILL_POINTS_PER_LEVEL: 1,
    ATTR_POINTS_AT_CREATION: 4,
    ATTR_POINTS_PER_LEVEL: 1,
    // The fallback defensive block — see baseStat().
    BASE_STATS: Object.freeze({ evasion: 8, armor: 0, fortitude: 8, speed: 5 }),
    // "2 hands worth total" (guide, ch.4).
    HAND_CAPACITY: 2,
    // Every Wound: −2 Armor and −1 Speed, cumulative.
    WOUND_ARMOR_STEP: -2,
    WOUND_SPEED_STEP: -1,
    // What a downed character is left with — see the downed note below.
    DOWNED_ARMOR: 0,
    DOWNED_SPEED: 0,
    // A short rest returns half the Mana POOL, rounded down.
    SHORT_REST_MANA_DIVISOR: 2,
    // The smallest a character's MAXIMUM health can be, however far gear or
    // effects push Constitution down — see healthMax(). Designer ruling
    // (2026-11-13): 1, because the bar has to hold something for the Wound
    // cascade to work. Reaching 0 takes a Wound and refills to max; at 0 max
    // the refill is empty and one point of damage would run straight through
    // every Wound. CURRENT health still reaches 0 — that is Downed.
    HEALTH_MAX_FLOOR: 1,
    // A guard against a stuck finger, not a game rule.
    MAX_STACKS: 99,
  });

  const R = RULES;

  // Whole, non-negative amounts — what every heal, damage and count takes.
  const clampInt = (n) => Math.max(0, Math.floor(Number(n)) || 0);

  const clampStacks = (n, cap = R.MAX_STACKS) =>
    Math.min(cap, Math.max(0, Math.floor(Number(n)) || 0));

  /* Creation spends its 4 points on four SEPARATE skills, one each. That is
     checkable without storing the order points were spent in: however many
     points a character has spent, the first four of them had to land on four
     different skills, so the distinct count can never trail the spend below 4.
     Order-free, therefore still derived rather than stored.

     Note what the Math.min does. A character with only two points placed needs
     only two skills — they have not reached the fourth point yet, and a
     half-finished spread is not an illegal one. What it forbids is the state
     the rule exists to forbid: four points on fewer than four skills. So a
     level 0 character, whose budget is exactly four, cannot pile them onto one
     skill however they get there.

     Takes a LIST rather than a character, so the sheet's note and the editor's
     save guard are the same rule and not two spellings of it. */
  const spreadOk = (skills) => {
    const spent = skills.reduce((n, k) => n + k.rank, 0);
    return skills.length >= Math.min(R.SKILL_POINTS_AT_CREATION, spent);
  };

  /* ---- skills --------------------------------------------------------
     To-hit IS derived — Precision feeds it through PRECISION_TO_HIT.
     A skill IS NOT — its bonus is the rank the player bought, and no core
     attribute touches it. Ever. One point is worth +2, so rank 1 shows +2 and
     rank 3 shows +6. Rank is what the player PAID, the bonus is what they
     ROLL; collapsing them would make the budget readout and the sheet
     disagree by a factor of two the moment this rule changed.

     Nor does a skill name a check the way d20 games do — there is no "make an
     Athletics check" in Meeple. A skill's text describes the KIND of action
     it covers, and the table decides whether what a player is attempting is
     one of them. */
  const skillMod = (rank) => rank * R.SKILL_POINT_BONUS;

  /* ---- armor against a hit ---------------------------------------------
     GAME RULE (guide, Ch.1 "Damage Application" and "Armor"). Damage that
     lands is the hit minus the target's Armor, never below zero — Armor +2
     turns a 5 into a 3, and a 2 into nothing. Armor Piercing ignores Armor
     entirely ("the damage ignores Armor and applies all of the damage").

     NEGATIVE Armor is real and it HURTS: Wounds take 2 each and Vulnerable
     "can reduce Armor into negative values, taking extra damage", so Armor −2
     turns a 5 into a 7. Nothing here clamps the Armor itself — only the
     result.

     Takes plain numbers rather than a target, so the same rule serves a
     hero card, an enemy and (one day) a player's own calculator. The caller
     reads Armor through V.armor / armor(), which already knows about Wounds,
     effects and being downed (downed Armor is 0: the hit lands whole). */
  const damageAfterArmor = (amount, armorValue, piercing = false) => {
    const hit = clampInt(amount);
    if (piercing) return hit;
    return Math.max(0, hit - Math.trunc(Number(armorValue) || 0));
  };

  /* ------------------------------------------------------------------ */
  /* create() — an engine bound to one compendium                       */
  /* ------------------------------------------------------------------ */
  function create({ subclassOf, itemOf, effectById }) {

    /* ---- attributes ---------------------------------------------------- */

    // A core attribute as written on the character, before anything carried.
    const statBase = (ch, name) => {
      const s = ch.stats.find((x) => x.name === name);
      return s ? s.value : 0;
    };

    // Everything the character is carrying, summed for one attribute. Nothing
    // is ever written back into ch.stats: the total is rebuilt on each call, so
    // dropping the item that granted a bonus removes the bonus by itself.
    const statMod = (ch, name) => ch.inventory.reduce(
      (total, item) => total + (item.mods || []).reduce(
        (n, mod) => n + (mod.stat === name ? mod.value : 0), 0), 0);

    /* Everything currently ON the character, summed for one attribute — the
       boon half of the idea statMod() covers for carried items. Multiplied by
       the stack count, because an effect's text is stated PER STACK ("the
       tracker counts stacks, it never does the multiplication for you"), so
       two stacks of Strength is +2 Power. Like statMod(), nothing is written
       back: clearing the boon removes the bonus by itself. */
    const statFromEffects = (ch, name) => ch.effects.reduce((total, e) => {
      const m = effectById(e.id)?.mod;
      return total + (m && m.stat === name ? m.value * e.stacks : 0);
    }, 0);

    // Everything a stat is NOT written as: carried items plus active boons.
    const statBonus = (ch, name) => statMod(ch, name) + statFromEffects(ch, name);

    // The number every readout should use. toHitBonus() reads through this, so
    // a +2 Precision trinket moves the To-Hit box with nothing wiring them
    // together; taking Strength widens every damage box the same way.
    const statValue = (ch, name) => statBase(ch, name) + statBonus(ch, name);

    const toHitBonus  = (ch) => statValue(ch, 'Precision') * R.PRECISION_TO_HIT;

    /* The damage half of the same idea. Every damage box in the app reads
       through this, so changing POWER_TO_DAMAGE changes weapons, abilities and
       spells together.

       Not yet modelled, and this is the function that will have to know about
       it: a dual-wielded OFFHAND attack takes no Power bonus (Ch.4). When the
       second attack exists it needs to opt OUT of this. */
    const damageBonus = (ch) => statValue(ch, 'Power') * R.POWER_TO_DAMAGE;

    /* ---- healing, which has TWO sides ---------------------------------
       FORTUNE IS OUTPUT. It makes the healing YOU produce more effective, so
       it is folded into a healing EXPRESSION exactly as Power is folded into
       a damage one: a Fortune 2 character's `1d6` heal rolls `1d6+2`.

       POISON IS INTAKE. "−1 healing received per stack" belongs to whoever is
       being healed, and reduces the amount that actually arrives.

       The two meet only when you heal YOURSELF, which the app cannot decide
       for you — nothing on the sheet knows who you targeted. So Fortune is
       applied always (it is yours) and Poison is offered as a toggle (it is
       the target's). Deliberately NOT applied to Mana: Fortune boosts
       healing, not resource recovery. */
    const healBonus = (ch) => statValue(ch, 'Fortune') * R.FORTUNE_TO_HEAL;

    const stacksOf = (ch, id) => {
      const e = ch.effects.find((x) => x.id === id);
      return e ? e.stacks : 0;
    };

    // What Poison takes off healing RECEIVED, stated once so the roll card and
    // the heal calculator cannot disagree about what a stack is worth.
    const poisonHealPenalty = (ch) => stacksOf(ch, 'condition.poison') * R.POISON_TO_HEAL;

    /* ---- critical strikes ----------------------------------------------
       GAME RULE (guide, Ch.1). A natural roll inside your Critical Strike
       threshold doubles the damage. The threshold is 20 by default and is
       LOWERED by Lethality — Lethality 0 crits on 20, 1 on 19-20, 2 on 18-20.

       THE NATURAL DIE IS THE WHOLE RULE. What counts is the number printed on
       the d20, never the total — "Precision can never push you into a crit."

       Both clamps are rules rather than defensive padding:
         · FLOOR at 2 — "a natural 1 always fails". No amount of Lethality may
           put 1 inside the threshold.
         · CEILING at CRIT_BASE — "a natural 20 always hits and always crits".
           Lethality can go NEGATIVE through an effect or a cursed item, which
           would otherwise push the threshold to 21. It cannot. */
    const critThreshold = (ch) => Math.min(
      R.CRIT_BASE,
      Math.max(R.CRIT_MIN_FACE, R.CRIT_BASE + R.LETHALITY_TO_CRIT * statValue(ch, 'Lethality')),
    );

    // Face in, verdict out. Takes the number on the die, never a total.
    const isCrit = (ch, face) => face >= critThreshold(ch);

    /* ---- class identity -----------------------------------------------
       Two different questions get asked of a build:
         "what IS this character?"  → origin plus everything levelled into.
                                      Drives HP pool, wounds, proficiencies.
         "what have they GAINED?"   → the level-ups alone. Drives mana growth
                                      and trait tier access.
       Creation is level 0: a brand new character has an origin and an empty
       `levels`. These take a BUILD, so the roster and the creation wizard can
       ask about a build that is not the open character. */
    const level = (build) => build.levels.length;
    const subclassIds = (build) => [build.origin, ...build.levels]
      .filter(Boolean);   // a build with no class yet contributes no subclasses

    // "Your health pool is determined by whichever class you have the majority
    // of levels in. On a tie, you choose." Creation is not a level, so the
    // tally runs over level-ups only; `build.hpFrom` is the tie choice.
    function primarySubclass(build) {
      const { origin, levels, hpFrom } = build;
      if (!levels.length) return subclassOf(origin);
      if (hpFrom && levels.includes(hpFrom)) return subclassOf(hpFrom);
      const tally = new Map();
      for (const id of levels) tally.set(id, (tally.get(id) || 0) + 1);
      // Walking `levels` in order means an unbroken tie resolves to whichever
      // subclass was taken first — deterministic rather than arbitrary.
      let best = levels[0];
      for (const id of levels) if (tally.get(id) > tally.get(best)) best = id;
      return subclassOf(best);
    }

    // The budgets — 4 at creation, 1 per level-up. They read through level(),
    // so a level-up that pushes one entry onto build.levels grants the point
    // with nothing wiring the two together.
    const skillPointsMax   = (ch) => R.SKILL_POINTS_AT_CREATION + level(ch.build) * R.SKILL_POINTS_PER_LEVEL;
    const skillPointsSpent = (ch) => ch.skills.reduce((n, k) => n + k.rank, 0);
    const attrPointsMax    = (ch) => R.ATTR_POINTS_AT_CREATION + level(ch.build) * R.ATTR_POINTS_PER_LEVEL;
    const attrPointsSpent  = (ch) => ch.stats.reduce((n, s) => n + s.value, 0);
    const skillSpreadOk    = (ch) => spreadOk(ch.skills);

    // Constitution is +1 HP per point, read through statValue() — so a +2
    // Constitution trinket widens the bar with nothing wiring the two together.
    //
    // Floored at HEALTH_MAX_FLOOR, because Constitution can be NEGATIVE: an
    // inventory modifier goes down to −20, and a −20 trinket on a 10-HP
    // subclass used to give a −10 bar that a rest then wrote into current
    // health. The floor applies only once there IS a subclass. Without one
    // the pool is 0 on purpose — a sheet that is not a character yet — which
    // is the same distinction isDowned() draws with its cap guard.
    //
    // The arithmetic itself lives in the VITALS half (V.healthMax, below),
    // because a Game Master's copy of a hero needs the same rule without the
    // build behind it. This is the character's door into it.
    const healthMax  = (ch) => V.healthMax(heroCard(ch), ch);
    const woundsMax  = (ch) => primarySubclass(ch.build)?.wounds ?? 0;
    const patchesMax = (ch) => primarySubclass(ch.build)?.patches ?? 0;

    // DOWNED — derived, never stored. See V.isDowned for the rule.
    const isDowned = (ch) => V.isDowned(heroCard(ch), ch);

    // "Choose the least restrictive option — the class with more Mana — but
    // Mana pools do not combine." The starting pool is a MAX across the
    // character's subclasses, never a sum. Growth then comes from the subclass
    // chosen AT each level-up.
    const manaMax = (ch) => {
      const starts = subclassIds(ch.build).map((id) => subclassOf(id)?.startingMana ?? 0);
      return (starts.length ? Math.max(...starts) : 0)
        + ch.build.levels.reduce((n, id) => n + (subclassOf(id)?.manaPerLevel ?? 0), 0);
    };

    // "If two or more of your classes have weapon or armor restrictions that
    // conflict, you follow the least restrictive option" — a union, not an
    // intersection. An empty result is a real answer, never a missing one.
    const proficiencies = (key, build) => {
      const out = [];
      for (const id of subclassIds(build)) {
        for (const p of (subclassOf(id)?.[key] || [])) if (!out.includes(p)) out.push(p);
      }
      return out;
    };

    /* ---- defensive stats ----------------------------------------------
       The base block is CONTENT: every subclass states its own evasion, armor,
       fortitude and speed in tools/csv/subclasses.csv. BASE_STATS is the
       fallback for a character with no subclass to read, and the profile a
       downed character drops to. */
    const baseStat = (ch, key) => primarySubclass(ch.build)?.[key] ?? R.BASE_STATS[key];

    /* ---- what a hand is holding ----------------------------------------
       A hand entry is { id, tag }: the id names a library item, and `tag` is
       the ONE weaponTag chosen for this particular weapon (absent when none
       has been chosen — an ordinary state). */
    const handEntries = (ch) => ch.hands
      .map((h, i) => ({ ...h, index: i, item: itemOf(h.id) }))
      .filter((h) => h.item);

    const heldGear = (ch) => handEntries(ch).map((h) => h.item);

    /* ---- hands: the shared budget -------------------------------------
       What an item COSTS and what it DOES are separate questions:
         greatsword  2 hands, offensive
         shortsword  1 hand,  offensive
         shield      1 hand,  DEFENSIVE     <- the only unusual pairing
         armour      0 hands, defensive     <- its own slot
       Hands are a budget weapons and shields share; defensive numbers are a
       contribution shields and armour share. */
    const handsUsed = (ch) => heldGear(ch).reduce((n, g) => n + (g.hands || 0), 0);
    const handsFree = (ch) => R.HAND_CAPACITY - handsUsed(ch);

    // Capacity is PHYSICAL, so it is enforced — unlike training, which is a
    // rules permission the app only flags. `swapIndex` is the slot being
    // replaced: its hands are already free, which is what makes changing a 2H
    // weapon for another 2H weapon legal.
    function canEquip(ch, id, swapIndex = null) {
      const g = itemOf(id);
      if (!g) return false;
      const held = swapIndex === null ? null : ch.hands[swapIndex];
      const freed = held ? (itemOf(held.id)?.hands || 0) : 0;
      return (g.hands || 0) <= handsFree(ch) + freed;
    }

    // A shield's proficiency is "Shields", which subclasses grant in
    // armorTypes — so a shield is trained like armour though it is HELD like a
    // weapon. Takes a build so the wizard can ask about an uncommitted class.
    const isTrained = (g, build) =>
      proficiencies(g.type === 'Shield' ? 'armorTypes' : 'weaponTypes', build).includes(g.prof);

    // Every Wound costs the same: −2 Armor AND −1 Speed, both cumulative.
    // Multiplying by the Wound count fits any cap in the library for free.
    const woundPenalty = (ch, key) => {
      const steps = { armor: R.WOUND_ARMOR_STEP, speed: R.WOUND_SPEED_STEP }[key] || 0;
      return ch.wounds * steps;
    };

    const wornArmor = (ch) => {
      const a = itemOf(ch.armorWorn);
      return a && a.type === 'Armor' ? a : null;
    };

    // Summed rather than "the shield": two shields is unusual, not impossible.
    const shieldBonus = (ch, key) => heldGear(ch)
      .filter((g) => g.type === 'Shield')
      .reduce((n, g) => n + (g[key] || 0), 0);

    /* ---- the four defences ------------------------------------------
       Each is the build half (heroCard) plus the state half (V.evasion and
       friends, below), which also owns the downed profile. */
    const evasion   = (ch) => V.evasion(heroCard(ch), ch);
    const armor     = (ch) => V.armor(heroCard(ch), ch);
    const fortitude = (ch) => V.fortitude(heroCard(ch), ch);
    const speed     = (ch) => V.speed(heroCard(ch), ch);

    /* ================================================================== */
    /* THE HERO CARD — every derived stat, split in two                   */
    /* ================================================================== */
    /* Each derived stat has a part that comes from the BUILD (class, gear,
       attributes, carried items) and a part that comes from what is
       HAPPENING (Wounds, Boons and Conditions, being downed). They are
       computed separately so the second half can run without the first:

         heroCard(ch)    the build half, as plain numbers. Worked out on the
                         PLAYER'S device, against the player's own
                         compendium, and carried to a Game Master in a
                         character file (or, one day, over the network).
                         The player's device is the authority for these
                         numbers; a GM's device never recomputes them.
         V.* (card, v)   the state half, and every play rule, over a small
                         `v` of { health, mana, wounds, patches, effects }.
                         A GM's copy of a hero — or an enemy — is a card plus
                         vitals and nothing else.

       The character's own readouts go through the SAME V functions, with the
       character itself as `v` (it carries those five fields). So there is one
       implementation of the Wound cascade, the downed profile and the effect
       arithmetic, not a player copy and a GM copy. The unit tests prove the
       two routes agree (mechanics.test.js, "the hero card").

       Why this matters later: when campaigns sync live, the card is what the
       player's device publishes and the vitals are what both sides change —
       by named operations (damage, heal, setWounds…), which a server can
       replay through this very file. Keep it free of DOM and storage. */

    // An attribute from the build and carried items — everything statValue()
    // counts except active effects, which belong to the vitals half.
    const statFromBuild = (ch, name) => statBase(ch, name) + statMod(ch, name);

    function heroCard(ch) {
      const sc = primarySubclass(ch.build);
      const armour = wornArmor(ch);
      return {
        // Before effects AND before the floor: a Constitution boon still has
        // to be able to lift a pool the floor would otherwise prop up, so the
        // floor is applied last, in V.healthMax. null — not 0 — for a sheet
        // with no subclass yet, which has no pool at all.
        healthBase: sc ? (sc.hp ?? 0) + statFromBuild(ch, 'Constitution') : null,
        manaMax: manaMax(ch),
        woundsMax: woundsMax(ch),
        patchesMax: patchesMax(ch),
        // The class's own block — what being downed drops Evasion and
        // Fortitude back to.
        base: {
          evasion: baseStat(ch, 'evasion'), armor: baseStat(ch, 'armor'),
          fortitude: baseStat(ch, 'fortitude'), speed: baseStat(ch, 'speed'),
        },
        // Standing, unwounded, with nothing on them. Armour's Evasion and
        // Speed are MODIFIERS on the base, like its Armor.
        build: {
          evasion: baseStat(ch, 'evasion') + (armour?.evasionMod || 0)
            + statFromBuild(ch, 'Dexterity') + shieldBonus(ch, 'evasionMod'),
          armor: baseStat(ch, 'armor') + (armour?.armorMod || 0) + shieldBonus(ch, 'armorMod'),
          fortitude: baseStat(ch, 'fortitude') + statFromBuild(ch, 'Fortune'),
          speed: baseStat(ch, 'speed') + (armour?.speedMod || 0),
        },
      };
    }

    /* ================================================================== */
    /* VITALS — the state half, and every play rule                       */
    /* Each takes (card, v). Play rules CHANGE `v` in place.              */
    /* ================================================================== */
    const V = {};

    // Constitution is +1 HP per point; carried items are already in the
    // card's healthBase, active effects are added here. Floored at
    // HEALTH_MAX_FLOOR (Constitution can be NEGATIVE: an inventory modifier
    // goes down to −20). The floor applies only once there IS a pool.
    V.healthMax  = (c, v) => (c.healthBase == null ? 0
      : Math.max(R.HEALTH_MAX_FLOOR, c.healthBase + statFromEffects(v, 'Constitution')));
    V.manaMax    = (c) => c.manaMax;
    V.woundsMax  = (c) => c.woundsMax;
    V.patchesMax = (c) => c.patchesMax;

    /* DOWNED — derived, never stored.
         · WITH a Wound track: reaching its cap is the whole condition, by
           whatever route; an empty bar is a CONSEQUENCE of it (setWounds).
         · WITHOUT one — an enemy whose stat block leaves Wounds empty — there
           is one bar, and emptying it is the condition (designer ruling,
           2026-11-13).
       The pool guard keeps a sheet with no subclass yet (0 HP, 0 Wounds) from
       reading as downed before it is a character. Every class in the
       compendium has Wounds, so the second branch never applies to a player
       character (content.test.js holds that). */
    V.isDowned = (c, v) => (c.woundsMax > 0
      ? v.wounds >= c.woundsMax
      : V.healthMax(c, v) > 0 && v.health <= 0);

    /* ---- the defences, standing and downed ----------------------------
       A downed character is helpless: not dodging, not resisting, not moving.
       Evasion and Fortitude fall back to their base values — every bonus that
       belongs to someone still on their feet stops applying — and Speed goes
       to zero outright. Armor is a flat zero by intent: it exists to reduce
       incoming damage, and damage no longer matters to someone at the bottom
       of their Wound track.

       Standing, the card's build numbers move with what is on them: Dexterity
       and Fortune from effects, Chill, Slow, Protection, Vulnerable, and each
       Wound (−2 Armor, −1 Speed — WOUND_*_STEP). */
    V.evasion = (c, v) => (V.isDowned(c, v) ? c.base.evasion
      : c.build.evasion + statFromEffects(v, 'Dexterity') - stacksOf(v, 'condition.chill'));

    // Wounds reduce Armor directly (WOUND_ARMOR_STEP), so Vulnerable is purely
    // a condition — and it can take Armor below zero, which ADDS damage
    // (guide: "Can reduce Armor into negative values, taking extra damage").
    V.armor = (c, v) => (V.isDowned(c, v) ? R.DOWNED_ARMOR
      : c.build.armor
        + stacksOf(v, 'boon.protection')
        - stacksOf(v, 'condition.vulnerable')
        + woundPenalty(v, 'armor'));

    V.fortitude = (c, v) => (V.isDowned(c, v) ? c.base.fortitude
      : c.build.fortitude + statFromEffects(v, 'Fortune'));

    V.speed = (c, v) => (V.isDowned(c, v) ? R.DOWNED_SPEED
      : c.build.speed - stacksOf(v, 'condition.slow') + woundPenalty(v, 'speed'));

    /* ---- play rules ---------------------------------------------------- */

    V.heal = (c, v, resource, amt) => {
      amt = clampInt(amt);
      if (!amt) return;
      if (resource === 'mana') v.mana = Math.min(V.manaMax(c), v.mana + amt);
      else                     v.health = Math.min(V.healthMax(c, v), v.health + amt);
    };

    /* The one way Wounds are set. Reaching the cap empties the health bar no
       matter how the Wound arrived, so that consequence lives here rather than
       at each call site.

       TAKING a Wound loses every Boon — only on the way UP. Clearing a Wound
       with a Patch, or correcting a miscount downward, is not "taking" one.
       This fires for the Wound pips as well as for the damage cascade, which
       is deliberate: a Wound recorded is a Wound taken.

       Returns { downed, boonsLost }: `downed` is true only when THIS move
       downed them, so the caller can announce it exactly once; `boonsLost` is
       counted so the caller can say so. */
    V.setWounds = (c, v, n) => {
      const wasDowned = V.isDowned(c, v);
      const before = v.wounds;
      v.wounds = Math.min(V.woundsMax(c), clampInt(n));
      if (V.isDowned(c, v)) v.health = 0;
      const boonsLost = v.wounds > before ? clearBoons(v) : 0;
      return { downed: !wasDowned && V.isDowned(c, v), boonsLost };
    };

    /* LOADING — a standing character never sits at an empty bar.

       In play it cannot happen: damage that empties the bar takes a Wound and
       refills it, and only the LAST Wound leaves it at 0 (see damage()). But a
       save can still hold it — before HEALTH_MAX_FLOOR, a heavy Constitution
       penalty gave a negative maximum that a rest wrote into current health.

       Designer ruling 2026-11-13: such a character loads at FULL health. No
       Wound is added — they never took that damage; the number came from a
       bug. A downed character keeps its empty bar (that 0 is the rule), and a
       sheet with no subclass yet keeps 0/0 (there is no pool to fill).

       Returns whether it changed anything. */
    V.settleHealth = (c, v) => {
      const max = V.healthMax(c, v);
      if (max > 0 && !V.isDowned(c, v) && v.health <= 0) { v.health = max; return true; }
      return false;
    };

    /* Health cascade: each time damage empties the bar, take a Wound and
       refill. The refill is what makes a Wound survivable.

       The LAST Wound is the exception, and it is the whole point of the cap:
       at that Wound there is nothing left to refill from, so the bar stays
       empty and they are downed. Spillover past it is discarded — you cannot
       be more downed than downed. With no Wound track at all the loop never
       runs: the bar simply empties (V.isDowned's second branch).

       Returns { downed, boonsLost }. `boonsLost` is undefined when no Wound
       bookkeeping happened at all (nothing dealt, or Mana), so a caller that
       mirrors it into UI state can leave that state alone. */
    V.damage = (c, v, resource, amt) => {
      amt = clampInt(amt);
      if (!amt) return { downed: false, boonsLost: undefined };
      if (resource === 'mana') {
        v.mana = Math.max(0, v.mana - amt);
        return { downed: false, boonsLost: undefined };
      }
      // Asked BEFORE the bar moves. setWounds() asks again, but by then the
      // health below has already been written — and with no Wound track,
      // emptying the bar IS being downed, so its "were they down already?"
      // would answer yes and the moment would never be announced.
      const wasDowned = V.isDowned(c, v);
      let h = v.health, w = v.wounds, d = amt;
      // Read ONCE, before any Wound clears a Constitution boon: the refill is
      // to the pool as it stood when the hit landed.
      const max = V.healthMax(c, v);
      const cap = V.woundsMax(c);
      while (d >= h && w < cap) {
        d -= h;
        w += 1;
        if (w >= cap) { h = 0; d = 0; break; }   // downed — no refill
        h = max;
      }
      v.health = Math.max(0, h - d);
      // Through setWounds so the cap clamp and the empty-bar consequence have
      // one owner. Its `downed` is replaced by the one measured above, which
      // is the same answer for anyone with a Wound track (downed depends on
      // Wounds alone there) and the right one for anyone without.
      const out = V.setWounds(c, v, w);
      return { downed: !wasDowned && V.isDowned(c, v), boonsLost: out.boonsLost };
    };

    /* ---- rest ----------------------------------------------------------
       GAME RULE. A long rest is a full reset: Health, Mana and Wounds all come
       back. A short rest is a breather — Health full, Mana part-way, Wounds
       untouched.

       The Mana a short rest returns is HALF THE POOL, rounded down — half of
       the MAXIMUM, not of what is missing. So a 15-Mana character always gets
       7 back; their current Mana only decides whether the ceiling swallows
       part of it. */
    V.shortRestMana = (c) => Math.floor(V.manaMax(c) / R.SHORT_REST_MANA_DIVISOR);

    // Returns setWounds()'s { downed, boonsLost } — a rest always passes
    // through it.
    V.rest = (c, v, kind) => {
      const long = kind === 'long';
      v.health = V.healthMax(c, v);
      v.mana = long
        ? V.manaMax(c)
        : Math.min(V.manaMax(c), v.mana + V.shortRestMana(c));
      /* Wounds clear on a long rest and are LEFT ALONE by a short one.
         Passing the wounds straight back through setWounds() on a short rest
         is not the no-op it looks like: setWounds() owns the rule that someone
         at the Wound cap has an empty bar, so a downed character who takes a
         breather is still downed. A long rest clears the Wounds first and
         therefore does stand them up. */
      const out = V.setWounds(c, v, long ? 0 : v.wounds);
      // Patches come back on a LONG rest only (guide, Ch.1).
      if (long) v.patches = V.patchesMax(c);
      /* BOTH rests clear every Boon and Condition (guide, Ch.1 — effects last
         a skirmish). A rest is the end of a skirmish by definition. */
      clearEffects(v);
      return out;
    };

    /* ---- patches -------------------------------------------------------
       GAME RULE (Ch.1). Spending one Patch resets HP to full AND removes one
       Wound. In combat the same action costs 2 AP — NOT deducted here, and
       that is a ruling rather than a debt: the app has no AP tracking, so the
       dialog STATES the cost and the player applies it.

       Order matters: the Wound comes off FIRST, then health is refilled,
       because setWounds() owns the rule that someone at the Wound cap has an
       empty bar. */
    V.patchGain = (c, v) => ({
      heals: v.health < V.healthMax(c, v),
      wound: v.wounds > 0,
    });

    /* Nothing to spend when: no Patches left; nothing to gain; or Downed — a
       Downed character cannot act (docs/rules-gaps.md §2.2). */
    V.canSpendPatch = (c, v) => {
      if (v.patches <= 0 || V.isDowned(c, v)) return false;
      const gain = V.patchGain(c, v);
      return gain.heals || gain.wound;
    };

    // Returns { boonsLost } when a Wound was cleared through setWounds(), and
    // {} when it was not (nothing spent, or no Wound to clear).
    V.spendPatch = (c, v) => {
      if (!V.canSpendPatch(c, v)) return {};
      v.patches = Math.max(0, v.patches - 1);
      const out = v.wounds > 0 ? V.setWounds(c, v, v.wounds - 1) : {};
      v.health = V.healthMax(c, v);
      return out;
    };

    /* Bookkeeping, not the rule. Setting the count by hand changes NOTHING
       else — no health, no Wounds — which is why it can be a bare tap while
       the rule itself sits behind a hold. */
    V.setPatches = (c, v, n) => {
      v.patches = Math.max(0, Math.min(V.patchesMax(c), clampInt(n)));
    };

    /* What one press of a tick button does, for every stack at once. Three
       stacks of Bleed is 3 — the multiplication is the whole reason the button
       is worth having. Damage goes through damage(), so the Wound cascade
       applies and a tick can down someone exactly as a hit can.

       Returns { amount, downed, boonsLost } — boonsLost undefined when no
       Wound bookkeeping happened (a heal, or nothing to apply). */
    V.applyTick = (c, v, id) => {
      const def = effectById(id);
      const stacks = stacksOf(v, id);
      if (!def || !def.tick || !stacks) return { amount: 0, downed: false, boonsLost: undefined };
      const per = def.tick.heal || def.tick.damage || 0;
      const amount = per * stacks;
      if (def.tick.heal) {
        V.heal(c, v, 'health', amount);
        return { amount, downed: false, boonsLost: undefined };
      }
      return { amount, ...V.damage(c, v, 'health', amount) };
    };

    /* ---- boons & conditions -----------------------------------------
       These touch only `effects`, which a character and a bare vitals record
       both carry — so one version serves both, with no card needed.

       Every Boon gone, Conditions untouched — the Wound rule (guide, Ch.1:
       "When you take a Wound, you lose all Boons currently on you unless a
       trait specifically notes it").

       THE EXCEPTION IS NOT MODELLED. No trait can note anything yet, because
       trait selection does not exist (rules-gaps §3.1). When it does, this is
       the function that has to start asking. Returns how many were lost. */
    function clearBoons(v) {
      const before = v.effects.length;
      v.effects = v.effects.filter((e) => (effectById(e.id) || {}).kind !== 'boon');
      return before - v.effects.length;
    }

    // Everything off, both kinds. The end of a skirmish, by whichever route —
    // the Clear control or either rest.
    function clearEffects(v) {
      const n = v.effects.length;
      v.effects = [];
      return n;
    }

    /* A stack count of zero is not a state worth tracking: decrementing the
       last stack removes the entry outright. */

    // An effect the rules say does not stack declares its own ceiling.
    const stackCap = (id) => {
      const def = effectById(id);
      return (def && def.maxStacks) || R.MAX_STACKS;
    };

    function addEffect(v, id) {
      if (!effectById(id)) return;                     // unknown id — ignore
      const cur = v.effects.find((e) => e.id === id);
      // Picking an effect already on them deepens it instead of duplicating.
      if (cur) cur.stacks = clampStacks(cur.stacks + 1, stackCap(id));
      else v.effects.push({ id, stacks: 1 });
    }

    function bumpEffect(v, id, delta) {
      const cur = v.effects.find((e) => e.id === id);
      if (!cur) return;
      const next = clampStacks(cur.stacks + delta, stackCap(id));
      if (next === 0) v.effects = v.effects.filter((e) => e.id !== id);
      else cur.stacks = next;
    }

    Object.assign(V, { clearBoons, clearEffects, addEffect, bumpEffect });
    Object.freeze(V);

    /* ================================================================== */
    /* PLAY RULES — the character's doors into the vitals half            */
    /* Same names and returns as ever; each builds the card and passes    */
    /* the character itself as the vitals.                                */
    /* ================================================================== */
    const heal          = (ch, resource, amt) => V.heal(heroCard(ch), ch, resource, amt);
    const setWounds     = (ch, n) => V.setWounds(heroCard(ch), ch, n);
    const settleHealth  = (ch) => V.settleHealth(heroCard(ch), ch);
    const damage        = (ch, resource, amt) => V.damage(heroCard(ch), ch, resource, amt);
    const shortRestMana = (ch) => V.shortRestMana(heroCard(ch));
    const rest          = (ch, kind) => V.rest(heroCard(ch), ch, kind);
    const patchGain     = (ch) => V.patchGain(heroCard(ch), ch);
    const canSpendPatch = (ch) => V.canSpendPatch(heroCard(ch), ch);
    const spendPatch    = (ch) => V.spendPatch(heroCard(ch), ch);
    const setPatches    = (ch, n) => V.setPatches(heroCard(ch), ch, n);
    const applyTick     = (ch, id) => V.applyTick(heroCard(ch), ch, id);

    return {
      // attributes
      statBase, statMod, statFromEffects, statBonus, statValue,
      toHitBonus, damageBonus, healBonus, poisonHealPenalty, critThreshold, isCrit,
      // build
      level, subclassIds, primarySubclass, proficiencies, isTrained,
      skillPointsMax, skillPointsSpent, attrPointsMax, attrPointsSpent, skillSpreadOk,
      // pools
      healthMax, woundsMax, patchesMax, manaMax, isDowned, shortRestMana,
      // gear & defence
      baseStat, handEntries, heldGear, handsUsed, handsFree, canEquip,
      woundPenalty, stacksOf, wornArmor, shieldBonus,
      evasion, armor, fortitude, speed,
      // play rules
      heal, damage, setWounds, settleHealth, rest, patchGain, canSpendPatch, spendPatch, setPatches,
      clearBoons, clearEffects, stackCap, addEffect, bumpEffect, applyTick,
      // the split: the build half as numbers, and the state half over them
      heroCard, vitals: V,
    };
  }

  const api = { RULES, create, clampInt, clampStacks, spreadOk, skillMod, damageAfterArmor };

  root.MEEPLE_MECHANICS = api;
  // Node loads this file as CommonJS; the browser has no `module` at all.
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
