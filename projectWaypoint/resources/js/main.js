/* =====================================================================
   WAYPOINT — Character Companion · Behavior
   ---------------------------------------------------------------------
   This file owns DATA and BEHAVIOR only. It never contains styling —
   it emits class names and toggles data-* attributes, and the
   stylesheet (waypoint.css) decides how everything looks.

   Layers:
     character  → the sheet's content (swap this to load a real character)
     state      → transient UI state (view, active tab, drawer, modal)
     rules      → game logic (heal / damage / wound cascade)
     render*    → paint data into the DOM (classes only, no inline style)
     wire()     → one delegated listener drives every interaction
   ===================================================================== */

(() => {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* CHARACTER DATA MODEL                                               */
  /* This is the "define character play" surface — everything shown on  */
  /* the sheet is derived from here.                                    */
  /*                                                                     */
  /* This particular object is the FIRST-RUN DEFAULT, not the app's one  */
  /* character: the roster below holds however many the player has made, */
  /* and `character` is whichever of them is currently open. Elara is    */
  /* seeded on a fresh install so the sheet has something to show before */
  /* anyone has been through creation.                                   */
  /* ------------------------------------------------------------------ */
  const SEED_CHARACTER = {
    // Storage id, and the only field a player never sees. It is "aurelia"
    // rather than "elara" because that is the key the app has been writing
    // since before characters had ids — `waypoint.character.aurelia` holds
    // real play state and a portrait on every install that predates the
    // roster. Renaming it to match the display name would orphan both, so
    // the id stays wrong-looking and the data stays intact.
    id: 'aurelia',
    name: 'Elara Starwhisper',

    // The portrait, as a compressed JPEG data URL, or null for "no photo
    // yet" — which is a complete state, not a missing one, and is what the
    // hero's uploader is for. Held here so every surface that shows a face
    // (hero, roster card, edit page) reads one value, but persisted under
    // its OWN storage key: see savePortrait().
    portrait: null,

    // How that photo is FRAMED — a focal point in the picture plus a zoom.
    // Framing is stored, the pixels are not: repositioning never re-encodes
    // and never loses quality, and the same three numbers frame the photo on
    // the hero, the roster row and the edit thumbnail at once. Small enough to
    // ride along in the ordinary save, unlike the photo itself.
    portraitView: { x: 50, y: 0, zoom: 1 },

    // Descriptive detail, edited on the Bio section of Edit Character. Every
    // field is FREE TEXT and every one is optional: no rule reads any of them,
    // so a height is as validly "5'11\"" as "180 cm", and blank is a complete
    // answer rather than a gap. The keys are fixed — see BIO_FIELDS — so a
    // sixth one is a code change, not something a save can smuggle in.
    bio: { age: '', height: '', weight: '', eyes: '', hair: '' },

    // CLASS IDENTITY — the whole of it. Level, max health, max mana, wounds,
    // patches and proficiencies are all derived from these two fields plus the
    // library; none of them is stored, so correcting a number in the sheet and
    // re-running the converter updates every character at once.
    build: {
      // Chosen at character creation, which the rules treat as LEVEL 0: you
      // have a class and a subclass and have taken no level-ups at all.
      origin: 'subclass.hunter',
      // One subclass id per LEVEL-UP, in the order taken. Its length is the
      // character's level. A multiclass character simply has mixed entries.
      levels: [
        'subclass.hunter', 'subclass.hunter', 'subclass.hunter',
        'subclass.hunter', 'subclass.hunter',
      ],
      // Multiclass tiebreak only — see primarySubclass(). null = derive it.
      hpFrom: null,
    },

    // Worn armour. `null` is a legitimate, fully-specified state, not a missing
    // value: an unarmoured character stands on their subclass's own base block
    // (see baseStat()), which every subclass states in the library.
    armorWorn: 'armor.light',   // a library id, or null for unarmoured

    // Everything held in hands — weapons and shields alike, since they draw on
    // the same two-hand budget. Each entry is { id, tag }: the id names a
    // library item, and `tag` is the ONE weaponTag chosen for this particular
    // weapon (absent when none has been chosen, which is a normal state).
    hands: [{ id: 'weapon.1h-melee', tag: 'Reach' }, { id: 'shield.armor' }],

    // Only what a character SPENDS is stored. Every ceiling is derived.
    health: 7,
    mana: 4,
    wounds: 1,
    patches: 2,

    // Abilities AND spells: `kind` decides which sub-list a row lands in, and
    // is the only difference between them as far as this file is concerned.
    // `toHit` marks the ones that are attacks — it is what puts a To-Hit box
    // on the row, derived from Precision exactly as a weapon's is. `cost` is
    // what using it spends; a zero or missing key simply is not shown.
    abilities: [
      { id: 'ab1', kind: 'ability', title: 'Ictus Findens',  dmg: '2d6', toHit: true,
        cost: { ap: 2 },
        desc: 'A cleaving strike that splits guard and bone alike. Placeholder description — replace with the real Waypoint ability text.' },
      { id: 'ab2', kind: 'ability', title: 'Clamor Bellicus', dmg: '2d6',
        cost: { ap: 1, rp: 1 },
        desc: 'A battle-cry that rattles the resolve of nearby foes. Placeholder description — replace with the real Waypoint ability text.' },
      { id: 'sp1', kind: 'spell', title: 'Ignis Fatuus', dmg: '1d8', toHit: true,
        cost: { ap: 1, mana: 3 },
        desc: 'A wisp of cold fire that seeks the eyes. Placeholder description — replace with the real Waypoint spell text.' },
      // `heal` is `dmg`'s twin — the same dice expression, rolled through the
      // same engine, and folded through healExpr() so Fortune raises it. Here
      // in the seed because Edit Character → Abilities is still stubbed
      // (rules-gaps §3.3): without it there is no healing spell in the app to
      // roll, and the whole of §2.6 would be unreachable.
      { id: 'sp2', kind: 'spell', title: 'Manus Salutis', heal: '1d6',
        cost: { ap: 1, mana: 2 },
        desc: 'A steady hand laid on a wound, closing it as if it had never been. Placeholder description — replace with the real Waypoint spell text.' },
    ],

    passives: [
      { id: 'ps1', title: 'Cutis Ferrea',   desc: 'Skin like worked iron; reduces incoming physical harm. Placeholder passive text.' },
      { id: 'ps2', title: 'Oculus Aquilae', desc: 'The eye of the eagle — advantage on distant perception. Placeholder passive text.' },
      { id: 'ps3', title: 'Vigor Silvarum', desc: 'The vigour of the deep wood restores you between battles. Placeholder passive text.' },
    ],

    // Attribute budget is 4 at creation + 1 per level (guide, ch.2), so a
    // level 5 character has 9 points to spend. These nine are a plausible
    // Hunter spread; the previous placeholder totalled 39 and produced
    // impossible derived numbers once the stats stopped being hardcoded.
    stats: [
      { name: 'Power',        value: 2 },
      { name: 'Precision',    value: 3 },
      { name: 'Lethality',    value: 1 },
      { name: 'Constitution', value: 1 },
      { name: 'Dexterity',    value: 2 },
      { name: 'Fortune',      value: 0 },
    ],

    // Skills the character has bought points into. Only the library id and the
    // RANK live here — the name, category and rules text are looked up at
    // render time, so rewording a skill in the spreadsheet rewords it on every
    // character at once. Same shape as `effects` for the same reason.
    //
    // Rank IS the bonus: rank 2 shows +2. Nothing is derived from a core
    // attribute (see skillMod()). Elara is level 5, so her budget is
    // 4 + 5 = 9 points — the nine below are spent across five skills, which
    // satisfies the creation rule of four separate skills at +1.
    skills: [
      { id: 'skill.gymnast',          rank: 2 },
      { id: 'skill.path-less-taken',  rank: 2 },
      { id: 'skill.keep-an-eye-out',  rank: 2 },
      { id: 'skill.field-guide',      rank: 2 },
      { id: 'skill.move-unseen',      rank: 1 },
    ],


    equipMax: 5,
    // Library ids only. The name and rules text are NOT copied here — they are
    // looked up at render time, so fixing an item's wording in the spreadsheet
    // fixes it on every character carrying one.
    equipment: [
      'gear.grappling-hook',
      'consumable.health-potion',
      'gear.climbing-rope',
      'gear.everburning-sprite',
    ],

    // Player-created items. Free-form, no game stats — just what you carry.
    // `desc` is optional: an item with nothing written about it is a perfectly
    // ordinary item, not an incomplete one.
    inventory: [
      { id: 'inv1', title: 'Pencil', desc: '', mods: [] },
      { id: 'inv2', title: 'Paper',  desc: '', mods: [] },
      { id: 'inv3', title: 'My Childhood Toy', desc: 'A carved wooden knight, its paint long worn away and one arm mended with pitch. It has travelled further than most knights ever manage.', mods: [] },
      { id: 'inv4', title: 'Pearl Necklace',   desc: 'A string of river pearls clasped in tarnished silver — a gift, though the giver is no longer spoken of at table.', mods: [{ stat: 'Fortune', value: 2 }] },
    ],

    // Boons & conditions currently on the character, and how deep each is
    // stacked. Stacks are live play state that changes every round, so unlike
    // a derived stat this genuinely IS stored (and persisted). Only the id and
    // the count live here — the name and rules text come from EFFECTS below,
    // so editing an effect's text updates every character carrying it.
    effects: [
      { id: 'boon.protection', stacks: 2 },
      { id: 'condition.bleed', stacks: 1 },
    ],

    // The journal. Order IS chronology — new notes are appended, so the list
    // reads oldest-first and the newest sits at the bottom where you left off.
    notes: [
      { id: 'note-seed-1', created: 0, title: 'The Ford at Vespers',
        body: 'Three bandits held the crossing. The tall one wore a signet — a boar, quartered. Worth asking the reeve about.' },
      { id: 'note-seed-2', created: 0, title: 'Debts & Promises',
        body: 'Owed 40 marks to the smith at Hollowmere.\nPromised the miller we would return before the thaw.' },
    ],
  };

  /* ------------------------------------------------------------------ */
  /* THE ROSTER                                                         */
  /*                                                                     */
  /* `character` is the character currently OPEN, and every render and    */
  /* rule in this file reads it by that name — which is the whole reason  */
  /* it is a plain rebindable binding rather than a lookup like           */
  /* roster[activeIndex]. Switching characters rebinds this one variable  */
  /* and repaints; nothing downstream had to learn that a roster exists.  */
  /*                                                                     */
  /* `roster` holds a SUMMARY per character — enough to draw its row on   */
  /* the Personae list and no more. Only the open character is ever fully */
  /* in memory, so a player with a dozen characters is not carrying       */
  /* twelve inventories around to render a list of names.                 */
  /* ------------------------------------------------------------------ */
  let character = SEED_CHARACTER;
  let roster = [];        // [{ id, name, build, portrait, portraitView }]

  // The six core attributes, in the order the guide lists them. Fixed game
  // structure rather than library content, so it lives in code beside
  // SKILL_CATEGORIES for the same reason (docs/library-schema.md §6): a
  // seventh attribute would be a rules change, not a spreadsheet edit.
  const ATTRIBUTES = ['Power', 'Precision', 'Lethality', 'Constitution', 'Dexterity', 'Fortune'];

  /* The optional bio fields, in the order the Bio section shows them. Stated
     once so the form, the save and the loader cannot drift apart: adding
     "Handedness" here gives it a field, persistence and import in one edit —
     the markup is the only other place that has to learn about it. */
  const BIO_FIELDS = ['age', 'height', 'weight', 'eyes', 'hair'];
  const emptyBio = () => Object.fromEntries(BIO_FIELDS.map((k) => [k, '']));

  /* What using an ability or a spell can cost, in the order a cost line reads
     them. AP is Action Points — spent on your own turn; RP is Reaction Points
     — spent off it; Mana is the pool the sheet already tracks. Kept as a list
     of [key, label] pairs so the cost line, the loader and any future editor
     all agree on both the set and its order: a fourth currency is one entry
     here, not a hunt through three renderers. */
  const COST_KEYS = [['ap', 'AP'], ['rp', 'RP'], ['mana', 'Mana']];

  /* A character with nothing chosen yet. Every field is present and legal —
     an empty build, no armour, empty hands — because a half-built character
     must still be a character the sheet can render without special cases.
     Creation fills this in step by step; it never assembles a partial object
     and hopes the renderers cope. */
  function newCharacter(id) {
    return {
      id,
      name: '',
      portrait: null, portraitView: { x: 50, y: 0, zoom: 1 },
      bio: emptyBio(),
      // origin null = "no class chosen". primarySubclass() already returns
      // null for an unknown id, and buildLabel() already says "Unclassed",
      // so this state was renderable before it was reachable.
      build: { origin: null, levels: [], hpFrom: null },
      armorWorn: null,
      hands: [],
      health: 0, mana: 0, wounds: 0, patches: 0,
      abilities: [],
      passives: [],
      stats: ATTRIBUTES.map((name) => ({ name, value: 0 })),
      skills: [],
      equipMax: 5,
      equipment: [],
      inventory: [],
      effects: [],
      notes: [],
    };
  }

  /* ------------------------------------------------------------------ */
  /* LIBRARY — generated game content                                   */
  /* resources/js/library.js declares this global and must load first    */
  /* (see index.html). It is a plain script rather than a fetched JSON    */
  /* because the app is opened straight off the filesystem, where the     */
  /* browser blocks fetch() and module imports alike.                     */
  /* ------------------------------------------------------------------ */
  /* An imported compendium, if one has been installed over the built-in file.

     Settings can replace the whole library outright, and this is where that
     replacement takes effect: read at LOAD, ahead of the generated global, so
     every catalog, index and open character below is built against one
     compendium and cannot disagree with another. Nothing re-reads it later —
     installing a compendium reloads the page, which is what makes that
     guarantee hold rather than merely be intended. See installCompendium().

     The shape is the library file documented in docs/library-schema.md, so
     what is stored here is exactly what was imported and exactly what would be
     exported back out. */
  const LIBRARY_KEY = 'waypoint.library';
  const LIBRARY_FILE_VERSION = 1;

  function storedLibrary() {
    let bag = null;
    try { bag = JSON.parse(localStorage.getItem(LIBRARY_KEY) || 'null'); } catch (_) { /* corrupt */ }
    // Checked, not trusted — a hand-edited or half-written key must not take
    // the app down on launch, and falling back to the shipped library is a
    // recoverable state where a thrown error at load is not.
    if (!bag || typeof bag !== 'object' || Array.isArray(bag)) return null;
    if (!bag.waypoint || typeof bag.waypoint !== 'object') return null;
    if (Number(bag.waypoint.schemaVersion) > LIBRARY_FILE_VERSION) return null;
    return bag;
  }

  const LIBRARY = storedLibrary() || window.WAYPOINT_LIBRARY || { classes: [], subclasses: [] };
  if (!LIBRARY.subclasses || !LIBRARY.subclasses.length) {
    // Worth being loud about: without it every derived stat reads zero, which
    // looks like a rules bug rather than a missing file.
    console.error('Waypoint: library.js did not load — run `node tools/csv-to-json.mjs`.');
  }
  /* ---- renamed subclasses ---------------------------------------------
     A subclass id is derived from its NAME (schema §4.2), so renaming Hunter
     to Kindred turns `subclass.hunter` into `subclass.kindred`. That keeps the
     library honest and breaks every character built on the old id, which is
     what `formerIds` is for: the sheet records the id a row used to have, and
     everything here resolves through that record.

     Built once, at load, from the library — the same place every other index
     comes from. A former id pointing at a live subclass is rejected by the
     converter, so this map can never redirect a working reference. */
  const ALIASES = (() => {
    const m = new Map();
    for (const sc of LIBRARY.subclasses || []) {
      for (const f of sc.formerIds || []) m.set(f, sc.id);
    }
    return m;
  })();

  /* The id something goes by TODAY. Unknown and current ids pass through
     untouched, so this is safe to call on anything. Chains are resolved so
     that Marksman -> Hunter -> Kindred still lands on Kindred, with a guard
     against a cycle a hand-edited sheet could introduce. */
  function migrateId(id) {
    let out = id;
    for (let hops = 0; ALIASES.has(out) && hops < 10; hops++) out = ALIASES.get(out);
    return out;
  }

  /* Resolves through migrateId(), so a character holding a pre-rename id still
     finds its subclass. cleanBuild() rewrites the stored id on the way in, so
     a save heals the first time it is written back. */
  const subclassOf = (id) =>
    (LIBRARY.subclasses || []).find((s) => s.id === migrateId(id)) || null;
  const classOf    = (id) => (LIBRARY.classes    || []).find((c) => c.id === id) || null;
  const subclassesOf = (classId) => (LIBRARY.subclasses || []).filter((s) => s.classId === classId);

  /* ---- traits ---------------------------------------------------------
     A trait is GRANTED, never bought and never stored on a character: the
     build already says which class and subclass were chosen, so the traits
     follow from it. Rewriting one in the spreadsheet therefore updates every
     character holding it, the same way rewording a skill does.

     Tier 0 is everything choosing a class or a subclass confers (guide, steps
     1-2), granted the moment a character first levels into it.

     There can be MORE THAN ONE. A Pyromancer's Tier 0 is both `Fire Mage` (a
     passive) and `Pyroblast` (the spell it grants), and both arrive together,
     so this returns every matching row rather than the first. The converter
     guarantees at least one exists per class and per live subclass; it used to
     guarantee exactly one, and this function used to return a single trait
     because of it. That cap is gone, so nothing here may assume a single row
     again — picking the first would silently drop whatever was authored
     second. */
  const TIER_0 = 0;
  const tier0TraitsOf = (ownerId) =>
    (LIBRARY.traits || []).filter((t) => t.grantedBy === ownerId && t.tier === TIER_0);

  /* ---- how many levels a character has WHERE ------------------------
     Two different counts, and the difference is the whole of trait gating.

       levelsInSubclass  levels taken in one subclass. Gates that SUBCLASS's
                         traits.
       levelsInClass     levels taken in ANY subclass under one umbrella class,
                         added together. Gates that CLASS's traits.

     A character with 3 levels of Pyromancer and 3 of Frostcaller is a level 6
     Elementalist but only a level 3 Pyromancer: they unlock Tier 2 Elementalist
     traits and Tier 1 Pyromancer traits at the same moment. Counting levels
     once and using it for both would be wrong in both directions.

     Creation is NOT a level (the rules treat it as level 0), so `origin` is
     excluded here — it grants Tier 0 and nothing more. */
  const levelsInSubclass = (subclassId, build = character.build) =>
    build.levels.filter((id) => id === subclassId).length;

  const levelsInClass = (classId, build = character.build) =>
    build.levels.filter((id) => subclassOf(id)?.classId === classId).length;

  /* ---- which tier a given number of levels has unlocked --------------
     Guide: levels 1-3 offer Tier 1, 4-6 Tier 2, 7-9 Tier 3, and 10 the Tier 4
     capstone. Written as thresholds rather than `Math.ceil(level / 3)` because
     the last band is one level wide, not three — the arithmetic version quietly
     offers Tier 4 at level 10, 11 and 12 and makes the cap look like a bug.

     Level 0 unlocks Tier 0 only, which is what a freshly created character has.
     The list is descending so the FIRST match wins. */
  const TIER_BANDS = [
    { minLevel: 10, tier: 4 },
    { minLevel: 7,  tier: 3 },
    { minLevel: 4,  tier: 2 },
    { minLevel: 1,  tier: 1 },
  ];
  const unlockedTier = (levels) =>
    (TIER_BANDS.find((b) => levels >= b.minLevel) || { tier: TIER_0 }).tier;

  /* The highest tier this character has unlocked from one owner — reading the
     class's levels for a class, the subclass's for a subclass. Everything that
     needs to ask "may they take this trait yet?" goes through here, so the
     class/subclass distinction above is made in exactly one place. */
  function unlockedTierFor(ownerId, build = character.build) {
    const sc = subclassOf(ownerId);
    return unlockedTier(sc ? levelsInSubclass(ownerId, build)
                           : levelsInClass(ownerId, build));
  }

  /* Every trait an owner offers that this character has the levels for, Tier 0
     included. This is the pool a level-up picker chooses FROM — it is not what
     the character has taken. Tier 0 is the only tier granted outright; the
     rest are chosen one per level, which is the flow that does not exist yet
     (docs/rules-gaps.md §3.1). */
  const availableTraitsOf = (ownerId, build = character.build) => {
    const cap = unlockedTierFor(ownerId, build);
    return (LIBRARY.traits || []).filter((t) => t.grantedBy === ownerId && t.tier <= cap);
  };

  /* Every Tier 0 trait a build confers, from every subclass taken plus each of
     their PARENT CLASSES, deduped.

     Tier 0 is the one tier granted rather than chosen, and it lands the moment
     the character first commits to that owner: at creation for the class and
     subclass they start as, and on the FIRST level taken into a new subclass
     when multiclassing. Both of those are covered by reading `subclassIds()`,
     which is origin plus every level — the first level into a new subclass is
     what puts its id in that list, and taking a second changes nothing.

     Deduping the OWNERS rather than the traits is what makes multiclassing
     work: levelling Berserker and then Oakheart is two subclasses but one
     Barbarian, and the Barbarian traits are granted once for being a
     Barbarian, not once per subclass under it. Each owner contributes its
     whole Tier 0 set exactly once. */
  function tier0Traits(build = character.build) {
    const owners = [];
    for (const id of subclassIds(build)) {
      const sc = subclassOf(id);
      if (!sc) continue;
      if (!owners.includes(sc.classId)) owners.push(sc.classId);
      if (!owners.includes(sc.id)) owners.push(sc.id);
    }
    return owners.flatMap(tier0TraitsOf);
  }

  /* ---- the skill catalog ---------------------------------------------
     Every skill in the game, from the library. A character stores ids and
     ranks only, so this is where the name, category and prose come from.
     Indexed rather than searched because the picker renders all 27 at once. */
  const SKILLS = new Map((LIBRARY.skills || []).map((k) => [k.id, k]));
  const skillOf = (id) => SKILLS.get(id) || null;

  // Fixed display order for the picker's groups. It lives in code, not the
  // library, for the same reason the six attributes do: it is the game's
  // structure rather than its content. A category is a shelf to browse — it
  // grants nothing, gates nothing, and no rule ever asks what one a skill is in.
  const SKILL_CATEGORIES = ['Body', 'Sleight', 'Study', 'Instinct', 'Influence'];

  /* ------------------------------------------------------------------ */
  /* BOON & CONDITION CATALOG                                           */
  /* Game CONTENT, not character data — every character draws from the  */
  /* same list, so it sits outside `character`. IDs use the library      */
  /* schema's `<kind>.<slug>` form (docs/library-schema.md §2) so this   */
  /* lifts straight into an imported library file later without         */
  /* invalidating any character that already references an id.          */
  /* `effect` is the text as written in the rules, and is stated PER STACK —  */
  /* the tracker counts stacks, it never does the multiplication for you.     */
  /* `maxStacks` is the exception: an effect the rules say does not stack     */
  /* caps there, so the stepper can't contradict its own rules text.         */
  /*                                                                         */
  /* `mod` is for an effect that moves one of the six ATTRIBUTES, and it is   */
  /* deliberately the same { stat, value } shape an inventory item's mods     */
  /* use — so a boon and a trinket are the same kind of thing to statValue(), */
  /* to the stat card and to the popover that names where a number came from. */
  /* Stating it HERE rather than in a lookup elsewhere is the point: the      */
  /* rules text and the arithmetic sit on one row and cannot drift apart —    */
  /* which is exactly how they drifted before, with Strength and Focus both   */
  /* reading "+1" while nothing in the app applied either.                    */
  /*                                                                         */
  /* Only ATTRIBUTE modifiers belong here. An effect that moves a DERIVED     */
  /* readout — Protection's +1 Armor, Chill's -1 Evasion — is read by that    */
  /* readout's own function through stacksOf(), because Armor and Evasion are */
  /* computed rather than stored and have no attribute to modify.             */
  /*                                                                          */
  /* `tick` is for an effect that happens REPEATEDLY — Regeneration's heal,   */
  /* Bleed, Burn, Poison and Confusion's damage. It gives the row a button    */
  /* the player presses when their own turn actually reaches that point.      */
  /*                                                                          */
  /* The app does NOT track turns and has no start-of-turn control: a player  */
  /* knows from their build and the rules what happens when, and this app is  */
  /* a reference tracker rather than a virtual tabletop. So the rules text    */
  /* still says "at the end of your turn" — that is the rule, and it is the   */
  /* player's to apply — while `tick` is only the arithmetic, so that when    */
  /* they do apply it they are not adding up five stacks in their head.       */
  /* ------------------------------------------------------------------ */
  const EFFECTS = [
    { id: 'boon.strength',     kind: 'boon', name: 'Strength',     effect: '+1 Power',     mod: { stat: 'Power',     value: 1 } },
    { id: 'boon.protection',   kind: 'boon', name: 'Protection',   effect: '+1 Armor. Lost after you next take damage' },
    { id: 'boon.focus',        kind: 'boon', name: 'Focus',        effect: '+1 Lethality', mod: { stat: 'Lethality', value: 1 } },
    { id: 'boon.guidance',     kind: 'boon', name: 'Guidance',     effect: '+1 Advantage. Lost when you roll your next d20' },
    { id: 'boon.regeneration', kind: 'boon', name: 'Regeneration', effect: 'Heal 1 HP at the start of turn', tick: { label: 'Heal', heal: 1 } },
    { id: 'boon.invisible',    kind: 'boon', name: 'Invisible',    effect: 'Attacks against you have 1 Disadvantage and your attacks gain 1 Advantage; Lost when you make an attack or cast a spell.' },

    { id: 'condition.bleed',      kind: 'condition', name: 'Bleed',      effect: 'Take 1 Bleed damage at the end of your turn', tick: { label: 'Take', damage: 1 } },
    { id: 'condition.poison',     kind: 'condition', name: 'Poison',     effect: 'Take 1 Poison damage at the end of your turn; -1 healing received per stack.', tick: { label: 'Take', damage: 1 } },
    { id: 'condition.burn',       kind: 'condition', name: 'Burn',       effect: 'Take 1 Fire damage at the end of your turn', tick: { label: 'Take', damage: 1 } },
    { id: 'condition.confusion',  kind: 'condition', name: 'Confusion',  effect: 'Take 1 Psychic damage per action taken.', tick: { label: 'Take', damage: 1 } },
    { id: 'condition.slow',       kind: 'condition', name: 'Slow',       effect: '-1 Speed' },
    { id: 'condition.chill',      kind: 'condition', name: 'Chill',      effect: '-1 Evasion' },
    { id: 'condition.vulnerable', kind: 'condition', name: 'Vulnerable', effect: '-1 Armor. Can reduce Armor into negative values.' },
    { id: 'condition.dazed',      kind: 'condition', name: 'Dazed',      effect: '-1 AP. Does not stack.', maxStacks: 1 },
    { id: 'condition.blind-deafened', kind: 'condition', name: 'Blind / Deafened', effect: '1 Disadvantage on attack rolls' },
  ];

  const effectById = (id) => EFFECTS.find((e) => e.id === id) || null;

  /* ------------------------------------------------------------------ */
  /* TRANSIENT UI STATE                                                 */
  /* ------------------------------------------------------------------ */
  const state = {
    calcResource: null,          // 'health' | 'mana' while modal open
    rulesQuery: '',              // the Rules screen's live search term
    rulesCollapsed: false,       // player pressed Collapse All; overrides search's auto-open
    open: {},                    // id -> bool, collapsible sections
    lastRoll: null,              // {label, kind, expr} — backs the Reroll button
    // The SETTLED view of that roll, kept so the Poison toggle can repaint the
    // card without throwing the dice again. Null while a roll is in the air.
    rollView: null,
    // Whether the player has asked for their own Poison to be applied to the
    // healing in front of them. Reset by every openCalc() and showRoll(), so
    // it never leaks from one heal to the next or between the two surfaces.
    applyPoison: false,
    // Which To-Hit box opened the advantage chooser — its label and its
    // unwidened expression, captured at open because the menu is shared.
    advFor: null,
    // How many Boons the last Wound took, so the notice can report it once.
    // Set by setWounds() and read by whoever repaints after it.
    boonsLost: 0,
    // The effect whose tick button is waiting on a confirm.
    tickFor: null,
    editingId: null,             // inventory id being edited, null = new item
    itemReturn: null,            // 'backpack' if the form was opened from it
    itemMods: [],                // working copy of the form's modifier rows
    openStat: null,              // attribute whose source popover is showing
    bpIndex: 0,                  // which item the backpack is showing
    slot: null,                  // 'hands' | 'armor' — slot being viewed/edited
    slotIndex: null,             // which hand, or null when adding rather than swapping
    noteQuery: '',               // active notes search, lowercased; '' = show all
    noteEditing: null,           // note id being edited, null = composing a new one
    noteDeleting: null,          // note id awaiting delete confirmation
    rosterEdit: false,           // Personae list in edit mode (reorder/export/delete)
    charDeleting: null,          // character id awaiting delete confirmation
    // The share screen's subject and format — { id, portrait }. null when it
    // is closed. Not stored with the character: which file you chose to hand
    // someone once is not a fact about who they are.
    share: null,
    drag: null,                  // live roster drag — see beginRosterDrag()
    // Character creation. `null` when the wizard is not running — the draft is
    // deliberately NOT a half-built entry in the roster, so abandoning creation
    // leaves nothing behind to clean up. See startCreate().
    create: null,
    // Which creation slot the picker is filling — { kind, key, query }.
    // null when it is closed.
    wizPick: null,
    // The skill editor's working copy, { id -> rank }. null when it is closed,
    // so nothing it holds can be mistaken for the character's own skills.
    skillEdit: null,
    // Which category the editor's list is narrowed to, or 'all'. A view of the
    // list, not part of the draft — filtering nothing and choosing nothing are
    // different acts, and closing the modal must not save a filter.
    skillFilter: 'all',
    /* Settings' pending question — a file that has been read and validated but
       not yet imported, together with what the player may choose to do with
       it. null when the window is closed, which is also what makes dismissing
       it the decline: nothing has been written at the point it is asked. See
       askFile(). */
    ask: null,
    // Which import the file picker was opened for — 'characters' or
    // 'compendium'. One input serves both, so this is how the reader knows
    // what it is holding.
    filePick: null,
    // Set when the open result window is reporting something that only takes
    // effect on the next load — a compendium install. closeModal() reloads.
    reloadOnClose: false,
    /* Appearance, chosen and remembered and READ BY NOTHING. The controls are
       built and the CSS behind them is not, so this is deliberately not
       persisted either: a preference that survives a reload and still changes
       nothing is a stronger claim than the app can currently make good on.
       See renderAppearance(). */
    appearance: { mode: 'system', theme: 'journal' },
  };

  /* ------------------------------------------------------------------ */
  /* DERIVED STATS                                                      */
  /* Single source of truth for numbers computed from the character's   */
  /* core stats. Change the formula here and every readout follows.     */
  /* ------------------------------------------------------------------ */
  const MOD_MIN = -20;
  const MOD_MAX = 20;
  const clampMod = (n) => Math.min(MOD_MAX, Math.max(MOD_MIN, Math.round(Number(n)) || 0));
  const modLabel = (v) => (v === 0 ? '0' : formatMod(v));

  // A core attribute as written on the character, before anything carried.
  const statBase = (name) => {
    const s = character.stats.find((x) => x.name === name);
    return s ? s.value : 0;
  };

  // Everything the character is carrying, summed for one attribute. Nothing is
  // ever written back into character.stats: the total is rebuilt on each render,
  // so dropping the item that granted a bonus removes the bonus by itself —
  // there is no stored number left behind to go stale.
  const statMod = (name) => character.inventory.reduce(
    (total, item) => total + (item.mods || []).reduce(
      (n, mod) => n + (mod.stat === name ? mod.value : 0), 0), 0);

  /* Everything currently ON the character, summed for one attribute — the
     boon half of the idea statMod() covers for carried items.

     Multiplied by the stack count, because an effect's text is stated PER
     STACK everywhere else in this file ("the tracker counts stacks, it never
     does the multiplication for you"), so two stacks of Strength is +2 Power.
     Neither Strength nor Focus declares a maxStacks, so that is a state the
     sheet can actually reach.

     Like statMod(), nothing is written back into character.stats: the total is
     rebuilt on every render, so clearing the boon removes the bonus by itself
     and there is no stored number left to go stale. */
  const statFromEffects = (name) => character.effects.reduce((total, e) => {
    const m = effectById(e.id)?.mod;
    return total + (m && m.stat === name ? m.value * e.stacks : 0);
  }, 0);

  // Everything a stat is NOT written as: carried items plus active boons.
  // Its own helper because three callers need "is this stat modified at all" —
  // the card's colour, the popover, and statValue() itself.
  const statBonus = (name) => statMod(name) + statFromEffects(name);

  // The number every readout should use. toHitBonus() below reads through this,
  // so a +2 Precision trinket moves the To-Hit box with nothing wiring them
  // together — that is the whole point of deriving rather than storing. The
  // same now goes for a boon: taking Strength widens every damage box on the
  // sheet, because damageBonus() reads Power through here and nowhere else.
  const statValue = (name) => statBase(name) + statBonus(name);
  // Waypoint rule: 1 point of Precision = +2 to hit (weapons and spells alike).
  const PRECISION_TO_HIT = 2;
  const toHitBonus = () => statValue('Precision') * PRECISION_TO_HIT;

  /* The damage half of the same idea, and deliberately written to look like
     it: "Roll damage — weapon or spell dice + Power" (guide, Ch.1), so one
     point of Power is one point of damage on every attack a character makes.

     Kept as its own named constant rather than folded into valBox() for the
     reason PRECISION_TO_HIT is: Power's worth is a RULE, and a rule that
     lives in one place can be re-tuned in one place. Every damage box in the
     app reads through this, so changing the 1 changes weapons, abilities and
     spells together and none of them can drift from the others.

     Not yet modelled, and this is the function that will have to know about
     it: a dual-wielded OFFHAND attack takes no Power bonus (Ch.4). When the
     second attack exists it needs to opt OUT of this, rather than valBox()
     guessing which of two damage boxes is the offhand one. */
  const POWER_TO_DAMAGE = 1;
  const damageBonus = () => statValue('Power') * POWER_TO_DAMAGE;

  /* ---- healing, which has TWO sides ----------------------------------

     This is the one number in the game that is modified at both ends, and
     keeping the two apart is the whole of getting it right.

     FORTUNE IS OUTPUT. It makes the healing YOU produce more effective —
     your spells and abilities heal for more, whether they land on an ally or
     on yourself. It belongs to the caster, so it is folded into the healing
     EXPRESSION exactly as Power is folded into a damage one: a Fortune 2
     character's `1d6` heal reads and rolls `1d6+2`. (Fortune also gives +1
     Fortitude, which fortitude() has always read.)

     POISON IS INTAKE. "−1 healing received per stack" belongs to whoever is
     being healed, and reduces the amount that actually arrives.

     The two meet only when you heal YOURSELF, and then they net off — which
     is the case the app cannot decide for you, because nothing on this sheet
     knows who you targeted. So Fortune is applied always (it is yours) and
     Poison is offered as a toggle (it is the target's). See openRoll's
     Poison control.

     Deliberately NOT applied to Mana. Mana is spent and restored, not damaged
     and healed — the calculator switches its own verbs for that reason — and
     Fortune boosts healing, not resource recovery. Structurally this is why
     the bonus lives in healExpr() rather than in heal(): only an ability's
     healing expression ever passes through here. */
  const FORTUNE_TO_HEAL = 1;
  const healBonus = () => statValue('Fortune') * FORTUNE_TO_HEAL;

  // What Poison takes off healing RECEIVED. Its own name rather than a bare
  // stacksOf() at the call sites, so the rule is stated once and the two
  // surfaces that offer it — the roll card and the heal calculator — cannot
  // disagree about what a stack is worth.
  const POISON_TO_HEAL = -1;
  const poisonHealPenalty = () => stacksOf('condition.poison') * POISON_TO_HEAL;

  const formatMod = (n) => (n >= 0 ? `+${n}` : `${n}`);

  /* ---- critical strikes ----------------------------------------------

     GAME RULE (guide, Ch.1). A natural roll inside your Critical Strike
     threshold doubles the damage. The threshold is 20 by default and is
     LOWERED by Lethality — so Lethality 0 crits on 20, Lethality 1 on 19-20,
     Lethality 2 on 18-20, and so on. This is the third attribute to be given
     a named constant of its own, and it reads like the other two on purpose:
     Precision buys to-hit, Power buys damage, Lethality buys crit range.

     THE NATURAL DIE IS THE WHOLE RULE. What counts is the number printed on
     the d20, never the total — "Precision can never push you into a crit."
     A character with +6 to hit rolling a 3 has a 9 on the card and has not
     critted, and every caller of isCrit() passes a FACE for that reason.

     The step is negative because Lethality lowers the number you have to
     beat. Written as a signed step rather than a subtraction so it reads like
     PRECISION_TO_HIT and POWER_TO_DAMAGE — one point of the attribute is
     worth this much — and so a rebalance that makes each point worth two
     numbers of range is a single edit here. */
  const CRIT_BASE = 20;
  const LETHALITY_TO_CRIT = -1;

  /* The lowest face that crits, right now. Both clamps are rules rather than
     defensive padding, and removing either one breaks something the guide
     states outright:

       · FLOOR at 2 — "a natural 1 always fails". No amount of Lethality may
         put 1 inside the threshold, so the range can widen to 2-20 and stop.
       · CEILING at CRIT_BASE — "a natural 20 always hits and always crits".
         Lethality can go NEGATIVE through an effect or a cursed item, which
         would otherwise push the threshold to 21 and make a natural 20 a
         plain hit. It cannot; 20 is the floor of the ceiling, so to speak. */
  const CRIT_MIN_FACE = 2;
  const critThreshold = () => Math.min(
    CRIT_BASE,
    Math.max(CRIT_MIN_FACE, CRIT_BASE + LETHALITY_TO_CRIT * statValue('Lethality')),
  );

  // Face in, verdict out. Takes the number on the die, never a total — see
  // the note above, and note that every call site is responsible for handing
  // over a natural face.
  const isCrit = (face) => face >= critThreshold();

  /* ---- skills --------------------------------------------------------
     Read the line above, then read this one, because they are the two halves
     of a distinction that is easy to erase by accident:

       To-hit  IS derived  — Precision feeds it through PRECISION_TO_HIT.
       A skill IS NOT      — its bonus is the rank the player bought, and no
                             core attribute touches it. Ever.

     So skillMod() scales the RANK and reads nothing else. One point is worth
     +2 (guide, step 4: "4 (each +2) Skill Points"), so rank 1 shows +2 and
     rank 3 shows +6. Rank and bonus are deliberately kept as different
     numbers: rank is what the player PAID, the bonus is what they ROLL, and
     collapsing them would mean the budget readout and the sheet disagreed by
     a factor of two the moment this rule changed again.

     Keeping it a named function is the point — every readout asks the same
     question in the same place, and this comment sits where someone would go
     looking before "fixing" skills to read through an attribute the way
     to-hit does. They don't. Ever.

     Nor does a skill name a check the way d20 games do — there is no "make an
     Athletics check" in Waypoint. A skill's text describes the KIND of action
     it covers, and the table decides whether what a player is attempting is
     one of them; the bonus is then added to that roll. That is why the app
     shows the prose in full and never tries to match it to anything. */
  const SKILL_POINT_BONUS = 2;
  const skillMod = (rank) => rank * SKILL_POINT_BONUS;

  // The points budget: 4 at creation, then 1 per level-up (guide, ch.2) — the
  // same shape as the attribute budget. It reads through level(), which is
  // build.levels.length, so a level-up flow that pushes one entry there grants
  // the point on its own with nothing wiring the two together.
  const SKILL_POINTS_AT_CREATION = 4;
  const SKILL_POINTS_PER_LEVEL   = 1;
  const skillPointsMax   = () => SKILL_POINTS_AT_CREATION + level() * SKILL_POINTS_PER_LEVEL;
  const skillPointsSpent = () => character.skills.reduce((n, k) => n + k.rank, 0);

  /* The attribute budget — the same shape, and the comment above describes it
     just as well: 4 at creation, 1 per level (guide, ch.2).

     It lives HERE, beside its twin, rather than with the creation wizard's own
     numbers where ATTR_POINTS_AT_CREATION used to sit. That filing was right
     while creation was the only screen that could spend these points; now that
     Edit Character can too, the figure is a rule about the character rather
     than a rule about the wizard, and the per-level half has nowhere else to
     go anyway. */
  const ATTR_POINTS_AT_CREATION = 4;
  const ATTR_POINTS_PER_LEVEL   = 1;
  const attrPointsMax   = () => ATTR_POINTS_AT_CREATION + level() * ATTR_POINTS_PER_LEVEL;
  const attrPointsSpent = () => character.stats.reduce((n, s) => n + s.value, 0);

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

     Takes a LIST rather than reading the character, so the sheet's note and the
     editor's save guard are the same rule and not two spellings of it. */
  const spreadOk = (skills) => {
    const spent = skills.reduce((n, k) => n + k.rank, 0);
    return skills.length >= Math.min(SKILL_POINTS_AT_CREATION, spent);
  };
  const skillSpreadOk = () => spreadOk(character.skills);

  /* On the SHEET both budget rules are flagged and never enforced — the app
     follows the same split it already draws for gear: hand capacity is
     physical so it is blocked, training is a rules permission so it is only
     marked. Skill points are a permission. A GM handing out a bonus point must
     not be fought by the tool, and an imported character has to be drawn
     honestly whatever state it arrives in.

     The EDITOR is the one place they bind, because it is the one place the app
     is being asked to author a spread rather than report one. See
     saveSkillEdit(). */

  /* ---- class identity -----------------------------------------------
     Two different questions get asked of a character's build, and they want
     different answers — which is the reason `origin` and `levels` are kept
     apart rather than collapsed into one list:

       "what IS this character?"     → origin plus everything levelled into.
                                        Drives HP pool, wounds, proficiencies.
       "what have they GAINED?"      → the level-ups alone. Drives mana growth
                                        and trait tier access.

     Creation is level 0, so a brand new character has an origin and an empty
     `levels` — and correctly gets its subclass's starting mana and nothing more.

     These take the build as an argument, defaulting to the open character's.
     Two callers need to ask about a build that is NOT the open character:
     the Personae list, which labels every character in the roster, and the
     creation wizard, which previews a build nobody has committed to yet.
     Neither is a reason for a second implementation of the rules. */
  const level = (build = character.build) => build.levels.length;
  const subclassIds = (build = character.build) => [build.origin, ...build.levels]
    .filter(Boolean);   // a build with no class yet contributes no subclasses

  // "Your health pool is determined by whichever class you have the majority of
  // levels in. On a tie, you choose." Creation is not a level, so the tally runs
  // over level-ups only; `build.hpFrom` is how the player expresses the tie
  // choice. A single-class character never reaches any of that.
  function primarySubclass(build = character.build) {
    const { origin, levels, hpFrom } = build;
    if (!levels.length) return subclassOf(origin);
    if (hpFrom && levels.includes(hpFrom)) return subclassOf(hpFrom);
    const tally = new Map();
    for (const id of levels) tally.set(id, (tally.get(id) || 0) + 1);
    // Walking `levels` in order means an unbroken tie resolves to whichever
    // subclass was taken first, which is deterministic rather than arbitrary.
    let best = levels[0];
    for (const id of levels) if (tally.get(id) > tally.get(best)) best = id;
    return subclassOf(best);
  }

  // Constitution is +1 HP per point, read through statValue() — so a +2
  // Constitution trinket widens the bar with nothing wiring the two together.
  const healthMax  = () => (primarySubclass()?.hp ?? 0) + statValue('Constitution');
  const woundsMax  = () => primarySubclass()?.wounds ?? 0;
  const patchesMax = () => primarySubclass()?.patches ?? 0;

  // DOWNED — derived, never stored. A Wound is taken each time the health bar
  // empties, so a character at the Wound cap has been through the whole bar as
  // many times as their subclass allows: the last Wound is the one they do not
  // get up from. Reaching the cap is therefore the whole condition, by whatever
  // route — the damage cascade, or a pip tapped by hand — and an empty bar is a
  // CONSEQUENCE of it rather than half of the test (see setWounds). The cap
  // guard keeps a sheet with no subclass yet (0 wounds, 0 cap) from reading as
  // downed before the character exists.
  const isDowned = () => woundsMax() > 0 && character.wounds >= woundsMax();

  // "Choose the least restrictive option — the class with more Mana — but Mana
  // pools do not combine." The starting pool is therefore a MAX across the
  // character's subclasses, never a sum. Growth then comes from the subclass
  // chosen AT each level-up, which is precisely why the source sheet's
  // level-0..10 columns had to go: a fixed column per level cannot describe a
  // character who levelled Berserker twice and Ice three times.
  const manaMax = () => {
    const starts = subclassIds().map((id) => subclassOf(id)?.startingMana ?? 0);
    return (starts.length ? Math.max(...starts) : 0)
      + character.build.levels.reduce((n, id) => n + (subclassOf(id)?.manaPerLevel ?? 0), 0);
  };

  // "If two or more of your classes have weapon or armor restrictions that
  // conflict, you follow the least restrictive option" — a union, not an
  // intersection. An empty result is a real answer (a subclass authored with
  // `none` trains in nothing at all), never a missing one — and so is the
  // empty result from a build with no class chosen yet, which is what the
  // creation wizard shows before step 1 is answered.
  const proficiencies = (key, build = character.build) => {
    const out = [];
    for (const id of subclassIds(build)) {
      for (const p of (subclassOf(id)?.[key] || [])) if (!out.includes(p)) out.push(p);
    }
    return out;
  };

  /* ---- defensive stats ----------------------------------------------
     The base block is CONTENT now: every subclass states its own evasion,
     armor, fortitude and speed in tools/csv/subclasses.csv. Today all 27 rows
     say the same 8 / 0 / 8 / 5, but they are authored per subclass precisely
     so they can diverge — when one does, the sheet is the only thing that
     changes.

     BASE_STATS stays as the fallback for a character who has no subclass to
     read (an unfinished build, or one whose subclass left the compendium),
     and as the profile a downed character drops to. It is the same
     "derive, don't store" rule the rest of the sheet follows: the number is
     looked up on every render, never copied onto the character. */
  const BASE_STATS = { evasion: 8, armor: 0, fortitude: 8, speed: 5 };

  // The base value of one defensive stat for THIS character — their subclass's
  // if they have one, the shared block if they do not. Every formula below
  // starts here rather than at a literal, so re-tuning a subclass moves its
  // armour, shield and condition maths with it and nothing else has to know.
  const baseStat = (key) => primarySubclass()?.[key] ?? BASE_STATS[key];

  /* ---- the gear catalog, from the library ----------------------------
     Armour, weapons, shields and equipment are all CONTENT now: they live in
     tools/csv/items.csv, are converted into WAYPOINT_LIBRARY, and are looked
     up here by id. Nothing about a suit of armour or a shield is written in
     this file any more, so rebalancing one is a spreadsheet edit and a
     re-run of the converter rather than a code change.

     A weapon IS its category (guide ch.4: "all weapons of the same class deal
     the same base damage"), so Shortsword and Axe are `examples` on one entry
     rather than two entries to keep in sync.

     Three item `type`s matter to the rules, and they are the library's own:
       Armor   — its own slot, costs no hands
       Weapon  — costs hands, attacks
       Shield  — costs hands like a weapon, defends like armour */
  /* `||=` rather than `||`, so a library file that omits a collection gets the
     empty array written BACK onto it and these three names stay LIBRARY's own
     arrays rather than detached copies. mergeEntries() pushes restored gear
     into them, and exporting the compendium reads LIBRARY — with `||` a device
     whose library shipped no `equipment` key would merge imported gear into an
     array nothing else could see, and export a compendium missing it. */
  const ARMOR     = (LIBRARY.armor     ||= []);
  const WEAPONS   = (LIBRARY.weapons   ||= []);
  const EQUIPMENT = (LIBRARY.equipment ||= []);

  // One index across every collection, because ids are globally unique
  // (schema §2) and a character stores nothing but ids.
  const ITEMS = new Map([...ARMOR, ...WEAPONS, ...EQUIPMENT].map((e) => [e.id, e]));
  const itemOf = (id) => ITEMS.get(id) || null;

  // Every armour value is a MODIFIER on the wearer's base block — evasion
  // included. That was not always true (armour used to state Evasion
  // absolutely), so if you are comparing against an older build, this is the
  // line that changed. The base it modifies is now the subclass's, not a
  // single shared constant.
  const armorSummary = (a) =>
    `Evasion ${modLabel(a.evasionMod)} · Armor ${modLabel(a.armorMod)} · Speed ${modLabel(a.speedMod)}`;

  /* ---- what a hand is holding ----------------------------------------
     A hand entry is { id, tag } rather than a bare id, because a weapon may
     carry AT MOST ONE of its category's weaponTags and that choice belongs to
     this character's weapon, not to the category every character shares.
     `tag` is absent when no tag has been chosen — a perfectly ordinary state,
     not an unfinished one. */
  const handEntries = () => character.hands
    .map((h, i) => ({ ...h, index: i, item: itemOf(h.id) }))
    .filter((h) => h.item);

  const heldGear = () => handEntries().map((h) => h.item);

  /* ---- hands: the shared budget -------------------------------------
     What an item COSTS and what it DOES are separate questions, and a shield
     is only confusing if you try to answer both with one category:

       greatsword  2 hands, offensive
       shortsword  1 hand,  offensive
       shield      1 hand,  DEFENSIVE     <- the only unusual pairing
       armour      0 hands, defensive     <- its own slot, competes with nothing

     So hands are a budget that weapons and shields share, while defensive
     numbers are a contribution that shields and armour share. Neither concept
     has to know about the other. (Guide ch.4: "2 hands worth total", shield
     "Included in the 2 hands worth of gear".) */
  const HAND_CAPACITY = 2;
  const handsUsed = () => heldGear().reduce((n, g) => n + (g.hands || 0), 0);
  const handsFree = () => HAND_CAPACITY - handsUsed();

  // Capacity is PHYSICAL, so it is enforced — unlike training, which is a rules
  // permission the app only flags. `swapIndex` is the slot being replaced: its
  // hands are already free for the purposes of what can go back into it, which
  // is what makes changing a 2H weapon for another 2H weapon legal.
  function canEquip(id, swapIndex = null) {
    const g = itemOf(id);
    if (!g) return false;
    const held = swapIndex === null ? null : character.hands[swapIndex];
    const freed = held ? (itemOf(held.id)?.hands || 0) : 0;
    return (g.hands || 0) <= handsFree() + freed;
  }

  // Training is checked against whichever list the rules file it under. A
  // shield's proficiency is "Shields", which subclasses grant in armorTypes
  // alongside Light/Medium/Heavy — so a shield is trained like armour even
  // though it is HELD like a weapon. Takes a build so the creation wizard can
  // ask about a class nobody has committed to yet.
  const isTrained = (g, build = character.build) =>
    proficiencies(g.type === 'Shield' ? 'armorTypes' : 'weaponTypes', build).includes(g.prof);

  // Every Wound costs the same: -2 Armor AND -1 Speed, both cumulative. At 3
  // Wounds that is -6 Armor and -3 Speed.
  //
  // Flat per-Wound arithmetic rather than the per-Wound table this used to be.
  // No step differs from any other now, so a table would be five copies of one
  // rule with five chances to fall out of step — and it would have to be
  // re-pitched for every wound cap in the library (most subclasses cap at 4,
  // The Beast at 5). Multiplying by the Wound count fits any cap for free.
  const WOUND_ARMOR_STEP = -2;
  const WOUND_SPEED_STEP = -1;

  const woundPenalty = (key) => {
    const steps = { armor: WOUND_ARMOR_STEP, speed: WOUND_SPEED_STEP }[key] || 0;
    return character.wounds * steps;
  };

  const stacksOf = (id) => {
    const e = character.effects.find((x) => x.id === id);
    return e ? e.stacks : 0;
  };

  const wornArmor = () => {
    const a = itemOf(character.armorWorn);
    return a && a.type === 'Armor' ? a : null;
  };
  // Summed rather than "the shield", because the hands budget is the only thing
  // limiting how many you carry — two shields is unusual, not impossible.
  const shieldBonus = (key) => heldGear()
    .filter((g) => g.type === 'Shield')
    .reduce((n, g) => n + (g[key] || 0), 0);

  /* ---- downed ------------------------------------------------------
     A downed character is helpless: not dodging, not resisting, not moving. So
     Evasion and Fortitude fall back to their base values — every bonus that
     belongs to someone still on their feet (Dexterity, Fortune, armour,
     shields) stops applying — and Speed goes to zero outright, which is below
     any base and so has to be stated rather than derived.

     Evasion and Fortitude are written as baseStat() calls rather than literal
     8s so the rule stays "you lose your bonuses", not "you become an 8":
     re-tune a subclass's base block and its downed profile follows it.

     Armor and Speed are stated zeros instead, because neither is a bonus being
     stripped. Speed 0 is below the base 5 — being downed is not moving at all.
     And Armor stops meaning anything once a character is down: Armor exists to
     reduce incoming damage numbers, and damage numbers no longer matter to
     someone already at the bottom of their Wound track. That is a flat zero by
     intent, not a coincidence of every subclass's base armor also being 0
     today, so it is written as its own constant and will hold when one of
     them is re-tuned. */
  const DOWNED_ARMOR = 0;
  const DOWNED_SPEED = 0;

  function evasion() {
    if (isDowned()) return baseStat('evasion');
    // Armour's Evasion is a MODIFIER on the base, exactly like its Armor and
    // Speed. It used to REPLACE the base (Light Armor *was* Evasion 12); the
    // item sheet now states +4 and the base stays underneath, which is the
    // same 12 arrived at honestly and one fewer special case.
    return baseStat('evasion')
      + (wornArmor()?.evasionMod || 0)
      + statValue('Dexterity')
      + shieldBonus('evasionMod')
      - stacksOf('condition.chill');
  }

  function armor() {
    if (isDowned()) return DOWNED_ARMOR;
    // Wounds reduce Armor directly now (see WOUND_ARMOR_STEP), so Vulnerable is
    // purely a condition again — the last Wound used to apply 2 Vulnerable
    // instead of Armor, and that special case is gone.
    const vulnerable = stacksOf('condition.vulnerable');
    return baseStat('armor')
      + (wornArmor()?.armorMod || 0)
      + shieldBonus('armorMod')
      + stacksOf('boon.protection')
      - vulnerable
      + woundPenalty('armor');
  }

  const fortitude = () => (isDowned() ? baseStat('fortitude')
                                     : baseStat('fortitude') + statValue('Fortune'));

  const speed = () => (isDowned() ? DOWNED_SPEED : baseStat('speed')
    + (wornArmor()?.speedMod || 0)
    - stacksOf('condition.slow')
    + woundPenalty('speed'));

  // The four defensive readouts, rebuilt on every render rather than stored —
  // so a wound, a Chill stack or a swapped shield moves them with nothing
  // subscribed to anything.
  const combatStats = () => [
    { label: 'Evasion',   value: String(evasion()) },
    { label: 'Armor',     value: modLabel(armor()) },
    { label: 'Fortitude', value: String(fortitude()) },
    { label: 'Speed',     value: String(speed()) },
  ];

  /* ------------------------------------------------------------------ */
  /* PERSISTENCE — keep live play state across reloads                  */
  /* ------------------------------------------------------------------ */
  /* Storage layout, one key per character plus one index:

       waypoint.roster                     { ids: [...], activeId }
       waypoint.character.<id>             that character's play state
       waypoint.character.<id>.portrait    that character's photo

     The per-character key was ALREADY `waypoint.character.aurelia` before the
     roster existed, which is why the seed character keeps that id: an install
     that predates this code needs no migration at all beyond being listed. Its
     save and its portrait are already sitting at the right keys.

     A character's photo stays under its own key, apart from its play state,
     for two reasons that both still hold per character. Size: a compressed
     photo is two orders of magnitude larger than the play state, and folding
     it in would rewrite hundreds of kilobytes every time a wound pip is
     tapped. Blast radius: if a portrait ever does exhaust the quota, the write
     that fails must be the portrait's own, not the one carrying health and
     notes. */
  const ROSTER_KEY   = 'waypoint.roster';
  const saveKey      = (id) => `waypoint.character.${id}`;
  const portraitKey  = (id) => `${saveKey(id)}.portrait`;

  const save = () => {
    // Only a character in the roster is persisted. Deleting the last one
    // leaves a blank bound to `character` so that every render and rule keeps
    // working without a null check; this is what stops that placeholder from
    // being written to storage and reappearing as a nameless roster row.
    if (!roster.some((r) => r.id === character.id)) return;
    try {
      localStorage.setItem(saveKey(character.id), JSON.stringify({
        // Identity is editable now (Edit Character), so it has to round-trip.
        // This is the point at which the seed data at the top of this file
        // stops being the source of truth and becomes a FIRST-RUN DEFAULT.
        name: character.name,
        // Optional descriptive fields. Written whole rather than field by
        // field, so BIO_FIELDS stays the only list of them.
        bio: character.bio,
        portraitView: character.portraitView,
        health: character.health, mana: character.mana,
        // Patches are SPENT, so like health and mana the count is stored while
        // the ceiling stays derived from the subclass — see patchesMax().
        wounds: character.wounds, patches: character.patches, notes: character.notes,
        // The build is saved now that creation can write one. Before the
        // wizard existed every character was Elara and her build was a
        // constant in this file; a character the player made has to carry
        // its own class, subclass and level history or it loads as Unclassed.
        build: character.build,
        stats: character.stats,
        abilities: character.abilities,
        passives: character.passives,
        armorWorn: character.armorWorn,
        hands: character.hands,
        equipment: character.equipment,
        inventory: character.inventory,
        effects: character.effects,
        skills: character.skills,
      }));
    } catch (_) { /* storage unavailable — play continues in-memory */ }
    // The Personae row is refreshed on every save rather than at the handful
    // of call sites that change something it shows. Saves already happen on
    // exactly those edits, so this is the one place that cannot be forgotten.
    refreshRosterEntry();
    saveRoster();
  };

  const IDENTITY_MAX = 60;   // matches the maxlength on the Edit Character fields
  const BIO_MAX      = 24;   // ditto, for the optional bio fields

  // Returns false on a full quota. The caller keeps the photo in memory and
  // says so — an image you can see but that will not survive a reload is a
  // better outcome than a silent failure, and an honest message beats both.
  const savePortrait = () => {
    try {
      const key = portraitKey(character.id);
      if (character.portrait) localStorage.setItem(key, character.portrait);
      else localStorage.removeItem(key);
      return true;
    } catch (_) { return false; }
  };

  // Checked, not trusted. This value goes straight into an <img src>, so a
  // corrupt or hand-edited key must not become a request for something else
  // entirely — only a self-contained image data URL is accepted.
  const readPortrait = (id) => {
    try {
      const raw = localStorage.getItem(portraitKey(id));
      return (typeof raw === 'string' && /^data:image\/[a-z+]+;base64,/.test(raw)) ? raw : null;
    } catch (_) { return null; }   // storage unavailable — the uploader still works in-memory
  };

  const loadPortrait = () => { character.portrait = readPortrait(character.id); };

  const readSave = (id) => {
    try {
      const raw = localStorage.getItem(saveKey(id));
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }   // storage unavailable or corrupt save
  };

  /* Fold a stored save into the OPEN character. Everything here reads and
     writes `character`, and several of the clamps below call derived helpers
     (healthMax, manaMax, itemOf) that read it too — so the character being
     loaded has to be the active one before this runs. openCharacter() is the
     only caller, and it rebinds first for exactly that reason. */
  const applySave = (s) => {
    if (!s) return;
    try {
      // Trimmed and length-capped on the way in like every other stored
      // string: a hand-edited save should degrade to a shorter name, never
      // to a caption that overruns the hero. A blank name is rejected
      // outright, because the seed default is better than an empty heading.
      const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
      if (text(s.name, IDENTITY_MAX))  character.name  = text(s.name, IDENTITY_MAX);
      // Rebuilt from BIO_FIELDS rather than trusted wholesale, the same way
      // stats are rebuilt from ATTRIBUTES: a save carrying a renamed or extra
      // key still produces exactly the five fields the form can edit. Blank is
      // a legal value here, so unlike the name there is nothing to reject.
      if (s.bio && typeof s.bio === 'object') {
        character.bio = Object.fromEntries(
          BIO_FIELDS.map((k) => [k, text(s.bio[k], BIO_MAX)]),
        );
      }
      // `order` and `house` were dropped from the game. A character file or a
      // save written before that still carries them; they are simply not read,
      // which is why removing them needed no schemaVersion bump — see
      // docs/character-file.md §6.
      // The build is restored BEFORE health, mana and wounds, because all
      // three are clamped against ceilings the build determines. Restoring it
      // afterwards would clamp a Barbarian's 15 health against Elara's pool.
      if (s.build) character.build = cleanBuild(s.build);
      if (Array.isArray(s.stats)) {
        // Rebuilt from ATTRIBUTES rather than trusted wholesale, so a save
        // holding a renamed, missing or seventh attribute still produces
        // exactly the six the rules define.
        character.stats = ATTRIBUTES.map((name) => ({
          name,
          value: clampInt(s.stats.find((x) => x && x.name === name)?.value),
        }));
      }
      // Free-form until abilities reach the library, so there is nothing to
      // resolve an id against — only the shape is enforced.
      //
      // `usable` adds the fields that only make sense for something you spend
      // an action on: which sub-list it belongs to, whether it is an attack,
      // and what it costs. Passives take none of them — a passive with an AP
      // cost is a contradiction, not a value worth preserving.
      const freeForm = (list, extra, usable = false) => list
        .filter((a) => a && typeof a.title === 'string')
        .map((a, i) => ({
          id: String(a.id || `${extra}-${i}-${Date.now()}`),
          title: a.title.slice(0, IDENTITY_MAX),
          desc: typeof a.desc === 'string' ? a.desc : '',
          ...(typeof a.dmg === 'string' && !validateDice(a.dmg) ? { dmg: a.dmg } : {}),
          // Same guard as dmg, for the same reason: checked against the real
          // engine so a hand-edited save cannot smuggle in an expression the
          // roller would then throw on.
          ...(typeof a.heal === 'string' && !validateDice(a.heal) ? { heal: a.heal } : {}),
          ...(usable ? {
            // Anything that is not exactly 'spell' is an ability. A save
            // naming a third kind lands in the Abilities list rather than in
            // a sub-list that does not exist and would render nowhere.
            kind: a.kind === 'spell' ? 'spell' : 'ability',
            toHit: a.toHit === true,
            // Rebuilt from COST_KEYS, the way stats are rebuilt from
            // ATTRIBUTES: a save carrying a renamed or invented currency
            // still produces exactly the three the cost line can print.
            cost: Object.fromEntries(
              COST_KEYS.map(([key]) => [key, clampInt(a.cost && a.cost[key])]),
            ),
          } : {}),
        }));
      /* MIGRATION — a save written before Actions existed.
         Abilities gained `kind`, `toHit` and `cost` after this app had already
         been run, so an install from before that carries placeholder abilities
         with none of the three. Loading them as-is is technically faithful and
         practically wrong: it pins the seed's own placeholders to the shape
         they had on the day that install first launched, so the sheet shows no
         cost line, no To-Hit box and no spell, and nothing the player can do
         will ever fix it.

         The placeholders are OURS, not the player's, so they are refreshed
         from the seed rather than preserved. Two guards keep that narrow:
         the incoming list must carry none of the new keys at all (so a save
         written since is never touched), and the character must actually have
         seeded abilities to fall back on (so a wizard-made character, whose
         seed list is empty, keeps whatever its save holds instead of being
         emptied). One ordinary save afterwards rewrites the key in the new
         shape and this stops firing.

         DELETE THIS once abilities are editable and stored ability data can be
         the player's own work — at that point silently replacing their list
         with the seed's would be data loss, not a repair. */
      const preActions = (list) => list.length && list.every(
        (a) => a && a.kind === undefined && a.toHit === undefined && a.cost === undefined,
      );
      if (Array.isArray(s.abilities)) {
        character.abilities = (preActions(s.abilities) && character.abilities.length)
          ? freeForm(character.abilities, 'ab', true)   // the seed's, normalised
          : freeForm(s.abilities, 'ab', true);
      }
      if (Array.isArray(s.passives))  character.passives  = freeForm(s.passives, 'ps');
      if (Array.isArray(s.equipment)) {
        // Library ids, so an id that has left the catalog is dropped rather
        // than rendered as a blank row — the same rule the other id lists follow.
        character.equipment = s.equipment.filter((id) => itemOf(id));
      }
      // Framing is three numbers with hard ranges, so it is clamped rather
      // than trusted — a hand-edited save should reframe the photo, never
      // push it off the edge of a frame it can no longer be dragged back into.
      if (s.portraitView) character.portraitView = clampView(s.portraitView);
      // Maxima are derived, so a rebalanced sheet can move a ceiling under a
      // save that was written before it. Clamp rather than trust the file.
      if (typeof s.health === 'number') character.health = Math.min(clampInt(s.health), healthMax());
      if (typeof s.mana === 'number')   character.mana   = Math.min(clampInt(s.mana), manaMax());
      // Through setWounds so a save from before the downed rule — or one whose
      // subclass has since been re-tuned to a lower cap — cannot restore a
      // character sitting at max Wounds with health still on the bar.
      if (typeof s.wounds === 'number') setWounds(s.wounds);
      // Same clamp as health and mana, and for the same reason: patchesMax()
      // reads the subclass, so a save written before that subclass was re-tuned
      // down could otherwise restore more Patches than the character can hold.
      if (typeof s.patches === 'number') character.patches = Math.min(clampInt(s.patches), patchesMax());
      // Notes used to be one textarea, saved as one string. A save from that
      // era still holds prose the player typed, so it is promoted into a
      // single note rather than dropped on the floor. Anything malformed is
      // filtered out instead of rendering as a blank row.
      if (Array.isArray(s.notes)) {
        character.notes = s.notes
          .filter((n) => n && typeof n.title === 'string')
          .map((n, i) => ({
            id: String(n.id || `note-${i}-${Date.now()}`),
            title: String(n.title),
            body: typeof n.body === 'string' ? n.body : '',
            created: Number(n.created) || 0,
          }));
      } else if (typeof s.notes === 'string' && s.notes.trim()) {
        character.notes = [{
          id: `note-${Date.now()}`, title: 'Session Notes',
          body: s.notes, created: Date.now(),
        }];
      }
      // Anything not naming a real armour type resolves to unarmoured, which is
      // a complete state in its own right — so a stale or hand-edited save
      // degrades to a legal character rather than a broken one.
      if ('armorWorn' in s) {
        // Saves written before armour was library content stored the bare
        // proficiency name ("Light"). Resolving that against the library's own
        // `prof` rather than a hardcoded map means the migration cannot drift
        // out of date the way a lookup table would — and it keeps armour on
        // the same footing as hands, which migrate their old shape too.
        const a = itemOf(s.armorWorn)
          || ARMOR.find((x) => x.prof === s.armorWorn);
        character.armorWorn = a && a.type === 'Armor' ? a.id : null;
      }
      // An id that has left the catalog has nothing to equip, so it is dropped
      // rather than rendered as a blank row; the budget is re-checked too, since
      // a rebalance could make an old loadout illegal.
      if (Array.isArray(s.hands)) {
        const kept = [];
        let used = 0;
        for (const raw of s.hands) {
          // Saves written before weaponTags existed hold a bare id string, so
          // both shapes are accepted and normalised to the object form here.
          const entry = typeof raw === 'string' ? { id: raw } : raw;
          const g = entry && itemOf(entry.id);
          if (!g) continue;
          const cost = g.hands || 0;
          if (used + cost > HAND_CAPACITY) continue;
          // A tag that is no longer on the category's menu is dropped rather
          // than kept as a tag no rule will match.
          const out = { id: entry.id };
          if (entry.tag && (g.weaponTags || []).includes(entry.tag)) out.tag = entry.tag;
          kept.push(out);
          used += cost;
        }
        character.hands = kept;
      }
      if (Array.isArray(s.inventory)) {
        // Saves written before descriptions existed hold only {id, title}, so
        // every field is rebuilt with a default rather than assumed present —
        // an older save upgrades instead of rendering broken rows.
        character.inventory = s.inventory
          .filter((i) => i && typeof i.title === 'string')
          .map((i, n) => ({
            id: String(i.id || `inv-${Date.now()}-${n}`),
            title: i.title,
            desc: typeof i.desc === 'string' ? i.desc : '',
            // A modifier naming an attribute that no longer exists has nothing
            // to modify, so it is dropped rather than silently doing nothing.
            mods: Array.isArray(i.mods)
              ? i.mods
                  .filter((m) => m && character.stats.some((x) => x.name === m.stat))
                  .map((m) => ({ stat: m.stat, value: clampMod(m.value) }))
                  .filter((m) => m.value !== 0)
              : [],
          }));
      }
      if (Array.isArray(s.skills)) {
        // Sanitised on the way in like every other id list. Three things a
        // hand-edited, merged or outdated save can hold, and what becomes of
        // each:
        //   an id no longer in the library — dropped. It has no name, category
        //     or text to show, so it would render as a ghost row.
        //   a rank below 1 — dropped, because rank 0 IS "not taken": the state
        //     is an absent entry, not a +0 row on the sheet.
        //   the same id twice — folded into one entry. Kept apart it would
        //     show the skill twice and charge the budget twice.
        const seen = new Map();
        for (const k of s.skills) {
          if (!k || !skillOf(k.id)) continue;
          const rank = clampInt(k.rank);
          if (rank < 1) continue;
          seen.set(k.id, (seen.get(k.id) || 0) + rank);
        }
        character.skills = [...seen].map(([id, rank]) => ({ id, rank }));
      }
      if (Array.isArray(s.effects)) {
        // Sanitise on the way in: an id that has since left the catalog has no
        // name or rules text to show, so drop it rather than render a ghost row.
        character.effects = s.effects
          .filter((e) => e && effectById(e.id))
          .map((e) => ({ id: e.id, stacks: clampStacks(e.stacks, stackCap(e.id)) }))
          .filter((e) => e.stacks > 0);
      }
    } catch (_) { /* ignore corrupt save */ }
  };

  /* A build sanitised against the library. Every id has to resolve to a
     subclass that still exists, because a build is the one stored thing that
     every derived number reads: an origin naming a subclass that has been
     retired would zero the health pool, the mana pool, the wound track and the
     proficiency list all at once, and the sheet would look broken rather than
     unclassed. A RENAMED subclass is not that case — migrateId() carries the
     reference across, provided the sheet recorded the old id in `formerIds`. An unresolvable origin therefore becomes
     null — "no class", a state the app already renders — and unresolvable
     level entries are dropped rather than left to read as zero. */
  function cleanBuild(b) {
    if (!b || typeof b !== 'object') return { origin: null, levels: [], hpFrom: null };
    // Rewritten to today's ids rather than merely resolved, so the save heals:
    // a character stored before a rename is written back holding the new id and
    // stops depending on the alias. An id that is already current passes
    // through migrateId() unchanged.
    const origin = subclassOf(b.origin) ? migrateId(b.origin) : null;
    const levels = Array.isArray(b.levels)
      ? b.levels.filter((id) => subclassOf(id)).map(migrateId) : [];
    // The tiebreak only means anything if it names a subclass actually
    // levelled into; anything else is stale and primarySubclass() would
    // ignore it anyway, so it is dropped rather than kept as noise.
    const hpFrom = levels.includes(migrateId(b.hpFrom)) ? migrateId(b.hpFrom) : null;
    return { origin, levels, hpFrom };
  }

  /* ------------------------------------------------------------------ */
  /* ROSTER — which characters exist, and which one is open             */
  /* ------------------------------------------------------------------ */

  /* The summary a Personae row needs, read straight from a save without
     opening the character. `build` rides along because the row's meta line
     names the class and level, and those are derived from it — the list must
     not store a label that a library edit would leave stale. */
  const summarise = (id) => {
    const s = readSave(id) || {};
    return {
      id,
      name: typeof s.name === 'string' && s.name.trim() ? s.name.trim().slice(0, IDENTITY_MAX) : 'Unnamed',
      build: cleanBuild(s.build),
      portrait: readPortrait(id),
      portraitView: clampView(s.portraitView || { x: 50, y: 0, zoom: 1 }),
    };
  };

  const saveRoster = () => {
    try {
      localStorage.setItem(ROSTER_KEY, JSON.stringify({
        ids: roster.map((r) => r.id),
        activeId: character.id,
      }));
    } catch (_) { /* storage unavailable — the roster lives for this session */ }
  };

  /* Build the roster at boot, and seed or migrate as needed.

     Four states an install can be in, and what each becomes:

       a roster index with ids    — use it. Ids naming a save that has since
                                    been cleared are dropped, so a half-erased
                                    localStorage yields a shorter roster
                                    rather than rows that render as "Unnamed".
       a roster index, but empty  — a player who deleted their last character.
                                    It stays empty. See below: this is the
                                    case that must NOT be confused with a
                                    first run.
       no index, but the legacy
       `waypoint.character.aurelia`
       save exists                — an install from before the roster. It
                                    becomes roster entry one, in place. Its
                                    save and portrait are already at the keys
                                    this code expects, so nothing is copied,
                                    re-encoded or risked.
       nothing at all             — first run. Seed Elara so the sheet has
                                    something to show. */
  function loadRoster() {
    let index = null;
    try { index = JSON.parse(localStorage.getItem(ROSTER_KEY) || 'null'); } catch (_) { /* corrupt */ }

    // Has this install ever written a roster? That is a different question from
    // whether it holds any characters right now, and the difference is the
    // whole reason this variable exists: an index listing nothing is a player
    // who deleted their last character, while no index at all is a genuine
    // first run. Only the latter earns the seed. Reading "no characters" as
    // "first run" meant the seed came back on the next reload and quietly
    // undid the delete — and surviving a reload is the one thing a delete has
    // to do. Note it is read BEFORE ids is narrowed to saves that still
    // exist, because that filter cannot tell the two cases apart either.
    const hasIndex = Array.isArray(index?.ids);

    let ids = hasIndex ? index.ids.filter((id) => typeof id === 'string') : [];
    ids = ids.filter((id) => readSave(id));

    if (!ids.length) {
      if (readSave(SEED_CHARACTER.id)) {
        ids = [SEED_CHARACTER.id];              // pre-roster install, adopted as-is
      } else if (!hasIndex) {
        // First run. The seed is written out immediately rather than kept only
        // in memory, so that the roster it goes into describes something real
        // and the very next save is an update rather than a creation.
        character = SEED_CHARACTER;
        // The roster entry has to exist BEFORE the write: save() persists only
        // a character the roster knows about — the guard that stops the blank
        // left by deleting the last row from being stored — and `roster` is
        // still [] this early in boot, so without this the seed's save was
        // silently skipped and the Personae row read "Unnamed" until the first
        // edit put it right.
        refreshRosterEntry();
        save();
        ids = [SEED_CHARACTER.id];
      }
      // else: deliberately empty. Falls through to the blank below.
    }

    roster = ids.map(summarise);
    if (ids.length) {
      const wanted = ids.includes(index?.activeId) ? index.activeId : ids[0];
      openCharacter(wanted);
    } else {
      // The same blank deleteCharacter() leaves behind when the last row goes,
      // so an empty roster reached by reloading and one reached by deleting are
      // the identical state: every render downstream still has a
      // character-shaped object to read, and save()'s blank-id guard keeps it
      // out of storage until the player actually makes someone.
      character = newCharacter('');
    }
    // Written now rather than at the next edit, so a migrated install is
    // indexed even if the player only ever reads the sheet — and so an install
    // emptied by a delete has an index on disk saying so, which is exactly what
    // hasIndex reads on the next boot.
    saveRoster();
  }

  /* Make a character the open one. This is the ONLY place `character` is
     rebound, which is what lets every render and rule in this file go on
     reading a plain variable and stay ignorant of the roster. */
  function openCharacter(id) {
    // The seed character starts from the seed, everyone else from a blank.
    // This is what a save written before the roster existed depends on: it
    // holds health, wounds and notes but no BUILD, because back then the build
    // was a constant in this file. Loading it onto a blank character would
    // give it no subclass, and health would then clamp against a pool of zero
    // — the player's 7 health silently becoming 0 on the first launch after
    // an update. Starting from the seed means every field the save does not
    // carry keeps the value it has always had.
    // Cloned through JSON rather than structuredClone: the seed is plain data
    // (no dates, no undefined, no functions), so the round trip is exact, and
    // it keeps the app running on older browsers — which matters for something
    // whose install instructions are "open index.html".
    character = id === SEED_CHARACTER.id
      ? JSON.parse(JSON.stringify(SEED_CHARACTER))
      : newCharacter(id);
    // Rebound BEFORE the save is folded in, because applySave() clamps against
    // derived ceilings and those read `character`. Loading into a detached
    // object and swapping it in afterwards would clamp the new character's
    // health against the old one's pool.
    applySave(readSave(id));
    loadPortrait();
    refreshRosterEntry();
  }

  /* Everything that has to be repainted when the OPEN CHARACTER CHANGES, as
     opposed to when one of their values does. Named and used in one place, so
     that adding a screen means adding it here rather than hunting down three
     call sites that each paint a different subset. */
  function renderAll() {
    renderContent();
    renderVitals();
    renderPortrait();
    renderEditForm();
  }

  /* Open a different character from the Personae list.

     The outgoing character is saved FIRST. Every mutation already saves as it
     happens, so this is belt-and-braces rather than the only write — but the
     cost of being wrong is somebody's session, and the cost of the extra write
     is nothing. */
  function switchCharacter(id) {
    if (id === character.id) { app.setAttribute('data-view', 'sheet'); app.setAttribute('data-tab', 'action'); return; }
    if (!roster.some((r) => r.id === id)) return;   // stale row; the list will be right after the next paint
    save();
    openCharacter(id);
    saveRoster();
    renderAll();
    // Opening a character always lands on the Character tab, for the reason
    // the nav handler gives: a visit starts fresh rather than resuming.
    app.setAttribute('data-view', 'sheet');
    app.setAttribute('data-tab', 'action');
    releasePull();
  }

  /* ------------------------------------------------------------------ */
  /* ROSTER EDIT MODE — reorder and delete                              */
  /* ------------------------------------------------------------------ */

  function toggleRosterEdit() {
    state.rosterEdit = !state.rosterEdit;
    // Leaving edit mode abandons any half-finished act rather than carrying it
    // into read mode, where its confirmation would have no context.
    if (!state.rosterEdit) { state.charDeleting = null; endRosterDrag(); }
    renderRoster();
  }

  /* Move a character to a new position. The roster array IS the display order,
     so this is a splice and a save — there is no separate order field to keep
     in step with it, and nothing derived from position. */
  function moveCharacter(id, to) {
    const from = roster.findIndex((r) => r.id === id);
    if (from === -1) return;
    const at = Math.max(0, Math.min(roster.length - 1, to));
    if (at === from) return;
    roster.splice(at, 0, roster.splice(from, 1)[0]);
    saveRoster();
    renderRoster();
    // Focus follows the row, or a keyboard reorder would move the list out
    // from under the very control being used to move it.
    const grip = $(`[data-char-grip="${CSS.escape(id)}"]`);
    if (grip) grip.focus();
  }

  /* ---- dragging a row ------------------------------------------------
     Pointer events rather than HTML5 drag-and-drop, because the latter does
     not fire on touch at all — and this list is read on a phone first.

     The dragged row follows the finger through --drag-y; every other row is
     offset by one row-height through --shift-y to open the gap it will land
     in. Both are continuous values, so both are custom properties the
     stylesheet interprets, exactly as writeView() does for portrait framing.
     Nothing here decides what a number LOOKS like. */
  function beginRosterDrag(id, startY) {
    const card = $(`[data-row="${CSS.escape(id)}"]`);
    if (!card || roster.length < 2) return;
    const cards = $$('.persona-card');
    state.drag = {
      id, startY,
      from: roster.findIndex((r) => r.id === id),
      to: roster.findIndex((r) => r.id === id),
      // Measured once at the start: reading offsetHeight during the drag would
      // be reading a layout this very drag is transforming.
      step: cards.length > 1
        ? cards[1].getBoundingClientRect().top - cards[0].getBoundingClientRect().top
        : card.offsetHeight,
      cards,
    };
    card.setAttribute('data-dragging', '');
    app.setAttribute('data-dragging-roster', '');
  }

  function moveRosterDrag(y) {
    const d = state.drag;
    // A zero step means the rows have no measurable height — the list is
    // hidden, or laid out to nothing. Dividing by it below would make every
    // drag land at the far end of the roster, so there is nothing to do.
    if (!d || !d.step) return;
    const dy = y - d.startY;
    const card = $(`[data-row="${CSS.escape(d.id)}"]`);
    if (card) card.style.setProperty('--drag-y', `${dy}px`);

    // Where the row would land: how many whole row-heights it has travelled.
    const to = Math.max(0, Math.min(roster.length - 1, d.from + Math.round(dy / d.step)));
    if (to === d.to) return;
    d.to = to;

    // Every other row shifts by one step to open the gap. Computed from the
    // ORIGINAL index each time rather than accumulated, so a fast drag that
    // skips positions still resolves to the right layout.
    d.cards.forEach((el, i) => {
      if (el.dataset.row === d.id) return;
      let shift = 0;
      if (d.from < to && i > d.from && i <= to) shift = -d.step;
      if (d.from > to && i >= to && i < d.from) shift = d.step;
      if (shift) { el.setAttribute('data-shift', ''); el.style.setProperty('--shift-y', `${shift}px`); }
      else { el.removeAttribute('data-shift'); el.style.removeProperty('--shift-y'); }
    });
  }

  function endRosterDrag(commit) {
    const d = state.drag;
    app.removeAttribute('data-dragging-roster');
    if (!d) return;
    state.drag = null;
    // The transforms are thrown away rather than animated home: the repaint
    // below draws the rows in their new places, and an animation would be
    // racing it to the same pixels.
    for (const el of d.cards) {
      el.removeAttribute('data-dragging');
      el.removeAttribute('data-shift');
      el.style.removeProperty('--drag-y');
      el.style.removeProperty('--shift-y');
    }
    if (commit && d.to !== d.from) moveCharacter(d.id, d.to);
    else renderRoster();
  }

  /* ---- deleting ------------------------------------------------------- */

  function askDeleteCharacter(id) {
    const row = roster.find((r) => r.id === id);
    if (!row) return;
    state.charDeleting = id;
    setText('charDelName', row.name);
    app.setAttribute('data-modal', 'char-del');
  }

  /* Permanent, as the confirmation promises. Both of the character's storage
     keys go, not just the save — a portrait left behind would be orphaned
     bytes that nothing can ever reach or clear. */
  function deleteCharacter() {
    const id = state.charDeleting;
    state.charDeleting = null;
    closeModal();
    const at = roster.findIndex((r) => r.id === id);
    if (at === -1) return;

    try {
      localStorage.removeItem(saveKey(id));
      localStorage.removeItem(portraitKey(id));
    } catch (_) { /* storage unavailable — the roster still drops the row */ }
    roster.splice(at, 1);

    if (character.id === id) {
      // Open the row that took its place, or the new last one. With an empty
      // roster the open character becomes a blank that is never saved — see
      // the guard in save() — so nothing downstream needs a null check.
      const next = roster[Math.min(at, roster.length - 1)];
      if (next) openCharacter(next.id);
      else character = newCharacter('');
    }
    saveRoster();
    renderAll();
    // An empty roster has no sheet to show, and edit mode has nothing to edit.
    if (!roster.length) {
      state.rosterEdit = false;
      app.setAttribute('data-view', 'characters');
      renderRoster();
    }
  }

  // Keep this character's Personae row in step with the sheet. Called after any
  // edit that the roster displays, so the list never shows a stale name or class.
  function refreshRosterEntry() {
    const at = roster.findIndex((r) => r.id === character.id);
    // A character not in the roster is the blank placeholder left behind by
    // deleting the last one. It is not a character yet, so it gets no row.
    if (at === -1 && !character.id) return;
    const row = {
      id: character.id, name: character.name || 'Unnamed',
      build: character.build,
      portrait: character.portrait, portraitView: character.portraitView,
    };
    if (at === -1) roster.push(row); else roster[at] = row;
  }

  /* ------------------------------------------------------------------ */
  /* RULES — game logic, no DOM                                         */
  /* ------------------------------------------------------------------ */
  const clampInt = (n) => Math.max(0, Math.floor(Number(n)) || 0);

  function heal(resource, amt) {
    amt = clampInt(amt);
    if (!amt) return;
    if (resource === 'mana') character.mana = Math.min(manaMax(), character.mana + amt);
    else                     character.health = Math.min(healthMax(), character.health + amt);
  }

  // Returns true only when THIS damage is what downed the character, so the
  // caller can announce it once. A hit that lands on someone already downed
  // returns false — they are no worse off, and the popup would be noise.
  // The one way Wounds are set outside the damage cascade's own bookkeeping.
  // Reaching the cap empties the health bar no matter how the Wound arrived, so
  // that consequence lives here rather than being restated at each call site —
  // otherwise the pips could seat a character at max Wounds still showing a
  // full bar, which is a state the rules do not have.
  // Returns true when this is the move that downed them, so the caller can
  // announce it exactly once.
  function setWounds(n) {
    const wasDowned = isDowned();
    const before = character.wounds;
    character.wounds = Math.min(woundsMax(), clampInt(n));
    if (isDowned()) character.health = 0;
    /* TAKING a Wound loses every Boon. Only on the way UP: clearing a Wound
       with a Patch, or correcting a miscount downward, is not "taking" one.

       This fires for the Wound pips as well as for the damage cascade, which
       is deliberate. The pips are documented as bookkeeping, but they are not
       only that — tapping the last one already downs the character and empties
       the bar. They are how a Wound is recorded when the damage happened at
       the table rather than in the app, and a Wound recorded is a Wound taken.

       Counted rather than just cleared so the caller can say so: losing three
       Boons silently while the health bar refills is the sheet changing under
       the player. */
    state.boonsLost = character.wounds > before ? clearBoons() : 0;
    return !wasDowned && isDowned();
  }

  /* ---- rest ----------------------------------------------------------

     GAME RULE. A long rest is a full reset: Health, Mana and Wounds all come
     back. A short rest is a breather — Health full, Mana part-way, Wounds
     untouched.

     The Mana a short rest returns is HALF THE POOL, rounded down, and it is
     half of the MAXIMUM rather than half of what is missing or half of what is
     left. So a 10-Mana character always gets 5 back and a 15-Mana character
     always gets 7, whatever they are standing at; the only thing their current
     Mana decides is whether the ceiling swallows part of it. At 2 of 10 that
     is 7, at 5 of 10 it is 10, and at 8 of 10 it is still 10 because the pool
     does not go past its own maximum.

     Stated as a divisor rather than a hardcoded 2 for the reason every rule in
     this file is named: a rebalance that makes a short rest restore a third
     is one edit here, and every readout — including the sentence on the Rest
     button, which asks this same function — follows it. */
  const SHORT_REST_MANA_DIVISOR = 2;

  const shortRestMana = () => Math.floor(manaMax() / SHORT_REST_MANA_DIVISOR);

  function rest(kind) {
    const long = kind === 'long';
    character.health = healthMax();
    character.mana = long
      ? manaMax()
      : Math.min(manaMax(), character.mana + shortRestMana());
    /* Wounds clear on a long rest and are LEFT ALONE by a short one — they are
       restored by hand, which is what Patches are for.

       Passing the wounds straight back through setWounds() on a short rest is
       not the no-op it looks like: setWounds() owns the rule that a character
       at the Wound cap has an empty bar, so this re-applies it to the health
       we just refilled. A downed character who takes a breather is still
       downed — a short rest does not touch the Wound that put them there, so
       it cannot be the thing that stands them up. A long rest clears the
       Wounds first and therefore does. */
    setWounds(long ? 0 : character.wounds);
    // Patches come back on a LONG rest only (guide, Ch.1 — "Patches are only
    // restored on a Long Rest"). A short rest deliberately leaves them where
    // they are, which is the same restraint that leaves Wounds alone: the
    // breather refills what you burned, it does not restock your kit.
    if (long) character.patches = patchesMax();
    /* BOTH rests clear every Boon and Condition (guide, Ch.1 — effects last a
       skirmish). A rest is the end of a skirmish by definition: you do not
       take a breather mid-fight, so nothing you were carrying survives it.
       Short as well as long, because the rule is about the fight ending, not
       about how long you sat down for. */
    clearEffects();
  }

  /* ---- patches -------------------------------------------------------

     GAME RULE (Ch.1, Resting & Recovery). Spending one Patch resets HP to
     full AND removes one Wound — one Patch, one Wound, which is why there is
     no amount to choose here. Out of combat the guide lets HP reset for free
     and Patches clear Wounds freely; in combat the same action costs 2 AP on
     top of the Patch.

     THE AP IS NOT DEDUCTED HERE, and that is a ruling rather than a debt. The
     price is conditional on being in combat, and this app has no in-combat
     state — nor should it acquire one just to charge two points, since a
     skirmish is a thing the table knows it is in and the app would only be
     guessing at. So the dialog STATES the cost (see openPatch) and the player
     applies it. The app tracks the numbers; the table applies the rules.

     Order matters and is the whole subtlety of this function. The Wound comes
     off FIRST, then health is refilled, because setWounds() owns the rule that
     a character at the Wound cap has an empty bar: refilling first would have
     that rule immediately zero the bar again for anyone sitting at the cap.
     Clearing the Wound drops them below the cap, and only then is a full bar
     something they are allowed to hold.

     (Today that ordering is belt-and-braces — canSpendPatch() refuses while
     Downed, so the cap case cannot arrive here. It is written this way anyway
     so the function stays correct on its own terms rather than depending on
     its only caller to have checked.) */
  function spendPatch() {
    if (!canSpendPatch()) return;
    character.patches = Math.max(0, character.patches - 1);
    if (character.wounds > 0) setWounds(character.wounds - 1);
    character.health = healthMax();
  }

  /* What a Patch would actually DO right now, as the two independent halves
     the dialog lists. Returned as flags rather than a sentence so the counter
     and the dialog ask the same question and cannot disagree about whether
     there is anything to gain. */
  const patchGain = () => ({
    heals:  character.health < healthMax(),
    wound:  character.wounds > 0,
  });

  /* Three ways there is nothing to spend:

       · no Patches left;
       · nothing to gain — already at full health with no Wounds, where
         spending one would burn a limited resource for no effect;
       · Downed. A Downed character cannot act, and the guide prices the Patch
         action at 2 AP, which they have no way to pay. Coming back up is a
         Long Rest, not a Patch. This is a deliberate ruling — see
         docs/rules-gaps.md §2.2 — and it is the reason spendPatch()'s
         wound-before-heal ordering never actually gets exercised. */
  function canSpendPatch() {
    if (character.patches <= 0 || isDowned()) return false;
    const gain = patchGain();
    return gain.heals || gain.wound;
  }

  /* Bookkeeping, not the rule. Setting the count by hand changes NOTHING else
     — no health, no Wounds — which is exactly why it can be a bare tap while
     the rule itself sits behind a hold: a player fixing a miscount is not
     asking to be healed, and a counter that quietly heals you when you correct
     it is a counter you stop trusting.

     It is the Wound pips' toggle, mirrored. Tapping box i means "I have i+1
     left", except when that is already the count, which reads as tapping the
     last filled box to turn it off and means i. So the row can be walked down
     one at a time and back up again from either end. */
  function setPatches(n) {
    character.patches = Math.max(0, Math.min(patchesMax(), clampInt(n)));
  }

  /* Every Boon gone, Conditions untouched — the Wound rule (guide, Ch.1:
     "When you take a Wound, you lose all Boons currently on you unless a
     trait specifically notes it").

     THE EXCEPTION IS NOT MODELLED. No trait can note anything yet, because
     trait selection does not exist (rules-gaps §3.1). When it does, this is
     the function that has to start asking. Logged rather than hidden: a rule
     applied without its exception is a rule that will surprise somebody. */
  function clearBoons() {
    const before = character.effects.length;
    character.effects = character.effects.filter(
      (e) => (effectById(e.id) || {}).kind !== 'boon',
    );
    return before - character.effects.length;
  }

  // Everything off, both kinds. The end of a skirmish, by whichever route —
  // the Clear control or either rest.
  function clearEffects() {
    const n = character.effects.length;
    character.effects = [];
    return n;
  }

  /* What one press of a tick button does, for every stack at once. The effect
     texts are written per stack ("take 1 Bleed damage"), so three stacks of
     Bleed is 3 — the multiplication is the whole reason the button is worth
     having over the calculator.

     Damage goes through damage(), so the Wound cascade applies and a tick can
     down a character exactly as a hit can. It returns that, so the caller can
     announce it once. */
  function applyTick(id) {
    const def = effectById(id);
    const stacks = stacksOf(id);
    if (!def || !def.tick || !stacks) return { amount: 0, downed: false };
    const per = def.tick.heal || def.tick.damage || 0;
    const amount = per * stacks;
    if (def.tick.heal) { heal('health', amount); return { amount, downed: false }; }
    return { amount, downed: damage('health', amount) };
  }

  function damage(resource, amt) {
    amt = clampInt(amt);
    if (!amt) return false;
    if (resource === 'mana') { character.mana = Math.max(0, character.mana - amt); return false; }
    // Health cascade: each time damage empties the bar, take a Wound and refill.
    // The refill is what makes a Wound survivable — you come back up with a full
    // bar and one more mark against you.
    //
    // The LAST Wound is the exception, and it is the whole point of the cap: at
    // that Wound there is nothing left to refill from, so the bar stays empty
    // and the character is downed. Spillover past it is discarded rather than
    // carried — you cannot be more downed than downed.
    let h = character.health, w = character.wounds, max = healthMax(), d = amt;
    const cap = woundsMax();
    while (d >= h && w < cap) {
      d -= h;
      w += 1;
      if (w >= cap) { h = 0; d = 0; break; }   // downed — no refill
      h = max;
    }
    character.health = Math.max(0, h - d);
    // Through setWounds so the cap clamp and the empty-bar consequence have one
    // owner. It re-zeroes a bar the loop above already emptied, which is a no-op
    // — the loop states it outright so this function reads correctly on its own.
    return setWounds(w);
  }

  /* ---- boons & conditions -----------------------------------------
     A stack count of zero is not a state worth tracking: an effect with no
     stacks simply isn't on the character, so decrementing the last stack
     removes the entry outright rather than leaving a "0" row behind. */
  const MAX_STACKS = 99;   // a guard against a stuck finger, not a game rule
  // An effect the rules say does not stack declares its own ceiling.
  const stackCap = (id) => {
    const def = effectById(id);
    return (def && def.maxStacks) || MAX_STACKS;
  };
  const clampStacks = (n, cap = MAX_STACKS) =>
    Math.min(cap, Math.max(0, Math.floor(Number(n)) || 0));

  function addEffect(id) {
    if (!effectById(id)) return;                     // unknown id — ignore
    const cur = character.effects.find((e) => e.id === id);
    // Picking an effect already on the sheet deepens it instead of duplicating.
    if (cur) cur.stacks = clampStacks(cur.stacks + 1, stackCap(id));
    else character.effects.push({ id, stacks: 1 });
  }

  function bumpEffect(id, delta) {
    const cur = character.effects.find((e) => e.id === id);
    if (!cur) return;
    const next = clampStacks(cur.stacks + delta, stackCap(id));
    if (next === 0) character.effects = character.effects.filter((e) => e.id !== id);
    else cur.stacks = next;
  }

  /* ------------------------------------------------------------------ */
  /* DOM HELPERS                                                        */
  /* ------------------------------------------------------------------ */
  const app = document.querySelector('.app');
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ));

  /* ------------------------------------------------------------------ */
  /* MARKUP BUILDERS — return class-only HTML strings                   */
  /* ------------------------------------------------------------------ */
  function combatCell(c) {
    return `<div class="combat-cell">
      <div class="combat-cell__value">${esc(c.value)}</div>
      <div class="combat-cell__label">${esc(c.label)}</div>
    </div>`;
  }

  /* ---- gear rows -----------------------------------------------------
     Rows carry the name only. What a thing does is one tap away in the detail
     window rather than crowded into a badge, which keeps a full loadout
     scannable and stops the same numbers being stated in two places. */
  /* `right` is optional HTML pinned to the trailing edge — the editor's pen,
     so far. The row is already justify-content: space-between, so it needs no
     layout of its own; an empty string simply leaves the name alone on the
     line, which is what the sheet passes. */
  function slotRow(label, hooks, empty = false, right = '') {
    return `<div class="slot-row${empty ? ' slot-row--empty' : ''}"${hooks}>
      <span class="slot-row__name">${esc(label)}</span>
      ${right}
    </div>`;
  }

  // The name a held thing goes by in a list: its own, plus the one weaponTag
  // it has been given if any. The tag is part of what that weapon IS to this
  // character, so it belongs on the row rather than only in the detail window.
  const heldLabel = (h) => h.tag ? `${h.item.name} · ${h.tag}` : h.item.name;

  /* The dashed "add" that stands in for an empty slot on the EDIT screen.
     Emitted inside the list rather than parked under it the way the sheet's
     is, because on a screen for changing things the gap itself should be the
     invitation: an empty slot and the button that fills it are one thing, and
     drawing them as two is what made the sheet need a "Nothing in hand" row to
     explain the space above its button. */
  const addSlot = (hook, label) => `<button class="btn-dashed btn-dashed--sm" ${hook}>
      <svg class="plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg><span>${esc(label)}</span>
    </button>`;

  /* Both screens' hand lists. `edit` is what tells them apart, for the same
     reason renderSkills() paints two lists from one array: they are two views
     of one set of slots, and painting them apart is how they would come to
     disagree.

     What the flag actually changes is what an EMPTY hand looks like. The sheet
     reports ("Nothing in hand"); the editor offers (a dashed Add). The trailing
     add is emitted whenever a hand is free, so a character holding one weapon
     gets a row and an invitation rather than a row and nothing. */
  function gearRows(edit = false) {
    const held = handEntries();
    const pen = edit ? `<span class="slot-row__pen" aria-hidden="true">${PENCIL_SVG}</span>` : '';
    const rows = held.map((h) =>
      slotRow(heldLabel(h), ` role="button" tabindex="0" data-detail="hands:${h.index}"`, false, pen)
    ).join('');
    if (!edit) return held.length ? rows : slotRow('Nothing in hand', '', true);
    return rows + (handsFree() > 0 ? addSlot('data-gear-add', 'Add Gear') : '');
  }

  /* On the sheet, nothing worn renders NOTHING — the "+ Add Armor" button
     directly beneath is shown exactly when this is empty, so a "No armor worn"
     row would sit above a button already saying the same thing in a form you
     can act on. (The hands slot keeps its empty row because its own button
     disappears when both hands are full, leaving the row as the only thing
     that would explain the gap.)

     The editor has no button beneath, so the empty state IS the button. */
  function armorRow(edit = false) {
    const worn = wornArmor();
    if (!worn) return edit ? addSlot('data-armor-add', 'Add Armor') : '';
    const pen = edit ? `<span class="slot-row__pen" aria-hidden="true">${PENCIL_SVG}</span>` : '';
    return slotRow(worn.name, ' role="button" tabindex="0" data-detail="armor"', false, pen);
  }

  // The lines shown in the detail window. Built from the catalog, so nothing
  // here can describe a rule the app is not actually applying.
  function detailLines(g) {
    const out = [];
    if (g.type === 'Armor') {
      // All three are modifiers on the wearer's base block, so all three are
      // written the same way. Shown even at +0, because "this armour adds no Armor" is
      // information and a silently absent line reads as an oversight.
      out.push(['Evasion', modLabel(g.evasionMod)]);
      out.push(['Armor', modLabel(g.armorMod)]);
      out.push(['Speed', modLabel(g.speedMod)]);
      return out;
    }
    // The weapon's PRINTED damage, with no Power added — the same reason the
    // armour block above states an item's own +2 rather than your derived
    // Armor total. An item window describes the item; what you actually roll
    // is the character's business, and that is the damage box on the sheet
    // (see damageExpr()). pickNote() holds the line for the same reason:
    // adding a constant to every row of a comparison compares nothing.
    if (g.damage) out.push(['Damage', g.damage]);
    // Melee reach and ranged distance are different rules wearing the same
    // unit, so the sheet keeps them in separate columns and so does this.
    if (g.threat) out.push(['Threat', `${g.threat} space${g.threat === 1 ? '' : 's'}`]);
    if (g.range)  out.push(['Range', `${g.range} space${g.range === 1 ? '' : 's'}`]);
    if (g.type === 'Shield') {
      out.push(['Armor', modLabel(g.armorMod)]);
      out.push(['Evasion', modLabel(g.evasionMod)]);
    }
    if (g.hands) out.push(['Hands', String(g.hands)]);
    if (g.examples && g.examples.length) out.push(['Such as', g.examples.join(', ')]);
    /* The desc is a RULE for some items and flavour for others, and the label
       has to say which. A focus has no damage and no defensive line, so its
       text is the entire benefit and is billed as an Effect; a weapon that
       already stated its damage above is describing itself, not adding a
       rule. Labelling both "Effect" would quietly promote flavour to rules. */
    if (g.desc) {
      const isRule = !g.damage && g.armorMod === undefined && g.evasionMod === undefined;
      out.push([isRule ? 'Effect' : 'About', g.desc]);
    }
    return out;
  }

  // No `untrained` state: the picker no longer offers anything the character is
  // not trained with, so the only reason a row can be unpickable is the hand
  // budget, which is physical rather than a matter of permission.
  function pickRow(id, { label, note, on, blocked }) {
    const flags = blocked ? '<span class="armor-pick__flag">no free hand</span>' : '';
    const cls = `armor-pick${on ? ' is-on' : ''}`;
    return `<button class="${cls}" data-pick="${esc(id)}"${blocked ? ' disabled' : ''}>
      <span class="armor-pick__name">${esc(label)}${flags}</span>
      <span class="armor-pick__effect">${esc(note)}</span>
    </button>`;
  }

  /* A damage expression with Power folded in: `2d8` on a Power 3 character
     becomes `2d8+3`, and that one string is BOTH what the box prints and what
     the roller evaluates. (To-Hit splits the two — it shows `+8` but rolls
     `d20+8` — because a to-hit box states a modifier where a damage box
     states the whole roll. Damage needs no such split, so it gets none.)

     Two things are deliberately left alone:

       · A bonus of zero appends nothing. `2d8+0` is the same roll written
         worse, and a Power 0 character should see the weapon's printed dice.
         Negative Power is a real possibility through effects, so the sign
         comes from formatMod() and `2d8-1` is produced the same way.

       · Anything that is not a legal dice expression is passed through
         untouched. Ability damage is still free-form text until abilities
         reach the library, so `a.dmg` can hold prose — and "on hit, half
         again+3" is not an improvement on anybody's sheet. validateDice()
         returns NULL when valid, which is why the test reads inverted here
         and at applySave(): asking the real engine is the only way to be
         sure the app and the converter agree on what a dice string is. */
  function damageExpr(value) {
    const bonus = damageBonus();
    if (!bonus) return value;
    if (typeof value !== 'string' || validateDice(value)) return value;
    return `${value}${formatMod(bonus)}`;
  }

  /* The healing twin, and identical in shape on purpose — including its three
     limits, which are damageExpr()'s limits for damageExpr()'s reasons:
     a bonus of zero appends nothing, a negative one renders `1d6-1` which the
     parser already accepts, and free-form text that is not a legal dice
     expression passes through untouched rather than being mangled.

     Only FORTUNE is folded in here. Poison is not, and must not be: this
     builds the expression that gets ROLLED, and Poison is subtracted from
     what arrives afterwards — putting it in the dice would make it part of
     the caster's output and would apply it when healing an ally. */
  /* Healing as it ARRIVES: the rolled or entered amount, less the target's
     Poison. Clamped at zero, because a heal that is out-toxined does nothing —
     it never turns around and deals damage. Shared by the roll card and the
     heal calculator so the two cannot disagree. */
  const healReceived = (amt) => Math.max(0, amt + poisonHealPenalty());

  // Is the Poison control even meaningful right now? Both surfaces ask this
  // before showing it: no stacks, nothing to offer.
  const poisonOffered = () => stacksOf('condition.poison') > 0;

  function healExpr(value) {
    const bonus = healBonus();
    if (!bonus) return value;
    if (typeof value !== 'string' || validateDice(value)) return value;
    return `${value}${formatMod(bonus)}`;
  }

  // A value box; if the data marks it rollable, it carries the roll hooks.
  // Rendered as a <span role="button"> so it can safely nest inside the
  // collapsible header <button> without invalid nested-button markup.
  //
  // The two derived rolls are resolved HERE rather than by the callers, so a
  // weapon row and an ability row cannot disagree about what Precision or
  // Power is worth: both hand over raw library data and get the same arithmetic.
  function valBox(b, sourceName, extraCls = '') {
    const rolled = b.roll === 'damage' ? damageExpr(b.value)
                 : b.roll === 'heal'   ? healExpr(b.value)
                 : b.value;
    const value = b.roll === 'tohit' ? formatMod(toHitBonus()) : rolled;
    const expr  = b.roll === 'tohit' ? `d20+${toHitBonus()}` : rolled;
    const cls = `val-box${extraCls}${b.dice ? ' val-box--dice' : ''}${b.roll ? ' val-box--roll' : ''}`;
    const hooks = b.roll
      ? ` role="button" tabindex="0" data-roll="${b.roll}" data-roll-label="${esc(sourceName)}" data-roll-expr="${esc(expr)}"`
      : '';
    return `<span class="${cls}"${hooks}>${esc(value)}</span>`;
  }

  function gearSummaryRow(g) {
    const boxes = g.boxes.map((b) => `
      <div class="mini">
        <span class="mini__label">${esc(b.label)}</span>
        ${valBox(b, g.name)}
      </div>`).join('');
    // A shield's numbers ARE its boxes, so it carries no type line — printing
    // "+2 Armor" beside an Armor +2 box states the same rule twice.
    const type = g.type ? `<div class="gear-row__type">${esc(g.type)}</div>` : '';
    return `<div class="gear-row">
      <div>
        <div class="gear-row__name">${esc(g.name)}</div>
        ${type}
      </div>
      <div class="gear-row__boxes">${boxes}</div>
    </div>`;
  }

  // Shared collapsible; `right` is optional HTML shown before the caret, and
  // `footer` is optional HTML placed under the description INSIDE the body.
  //
  // The footer slot exists because the head is a single <button>: any control
  // with its own press — a stepper, say — cannot live up there without nesting
  // buttons. (valBox() works around the same constraint the other way, with
  // role="button" on a span, which only works because a value box has nothing
  // to press.) Putting real controls in the body keeps the markup valid and
  // keeps one tab stop per collapsed row.
  //
  // `item.sub` is an optional second line under the title — a cost, so far.
  // It reads as part of the name rather than as a value, which is why it sits
  // in the title cell and not among the boxes on the right: what an ability
  // COSTS is a property of the ability, where what it rolls is a thing you do.
  function collapsible(item, right = '', light = false, footer = '') {
    const open = state.open[item.id] ? ' is-open' : '';
    const sub = item.sub ? `<span class="collapse__sub">${esc(item.sub)}</span>` : '';
    return `<div class="collapse${light ? ' collapse--light' : ''}${open}" data-collapse="${item.id}">
      <button class="collapse__head" data-toggle="${item.id}">
        <span class="collapse__name">
          <span class="collapse__title">${esc(item.title)}</span>
          ${sub}
        </span>
        <span class="collapse__right">${right}<span class="collapse__caret"></span></span>
      </button>
      <div class="collapse__body">${esc(item.desc || '')}${footer}</div>
    </div>`;
  }

  /* What using this costs, written the way it is said aloud: "two AP and
     three Mana". Zero and absent are the same thing here — an ability that
     costs no RP has no RP line to state — so a cost of nothing produces an
     empty string and the row simply has no second line. */
  function costLine(cost) {
    if (!cost) return '';
    return COST_KEYS
      .filter(([key]) => clampInt(cost[key]) > 0)
      .map(([key, label]) => `${clampInt(cost[key])} ${label}`)
      .join(' · ');
  }

  /* An ability or a spell — the same row either way, since the only thing
     `kind` decides is which sub-list it is printed under.

     The To-Hit box is the SAME box a weapon carries, built by the same
     valBox() from the same toHitBonus(), so an ability rolls d20+Precision×2
     exactly as a 1H Melee does. That is the point of it being a shared
     helper: correcting PRECISION_TO_HIT corrects weapons and spells at once,
     and neither can drift from the other. Only abilities marked `toHit` get
     one — plenty of abilities land automatically, and an attack roll offered
     for one of those would be an invented rule. */
  const abilityRow = (a) => {
    const boxes = [];
    if (a.toHit) {
      boxes.push(`<span class="mini"><span class="mini__label">To-Hit</span>${
        valBox({ label: 'To-Hit', roll: 'tohit' }, a.title, ' val-box--sm')
      }</span>`);
    }
    if (a.dmg) {
      boxes.push(`<span class="mini"><span class="mini__label">Damage</span>${
        valBox({ label: 'Damage', value: a.dmg, roll: 'damage', dice: true }, a.title, ' val-box--sm')
      }</span>`);
    }
    /* Healing is its own box rather than a damage box with a different sign.
       They are different events — one is subtracted from a target, the other
       added — they take different bonuses (Power against Fortune), and only
       one of them is reduced by the target's Poison. An ability may carry
       both: a spell that harms an enemy and mends an ally is one row. */
    if (a.heal) {
      boxes.push(`<span class="mini"><span class="mini__label">Healing</span>${
        valBox({ label: 'Healing', value: a.heal, roll: 'heal', dice: true }, a.title, ' val-box--sm')
      }</span>`);
    }
    return collapsible({ ...a, sub: costLine(a.cost) }, boxes.join(''));
  };
  const passiveRow = (p) => collapsible(p, '');

  /* A granted trait. Distinct from a passive in where it comes from, not in
     what it does: a passive is hand-written on the character, a trait is
     conferred by the build and read from the library — so this row holds no
     copy of the text, and rewriting a trait in the spreadsheet rewrites it on
     every character who has it.

     The chip on the right names the class or subclass that granted it, which
     is the one thing a player cannot work out from the trait alone once a
     character has multiclassed. */
  function traitRow(t) {
    const owner = subclassOf(t.grantedBy) || classOf(t.grantedBy);
    const written = t.desc && !t.desc.startsWith('Placeholder —');
    return collapsible(
      { id: t.id, title: t.name, desc: written ? t.desc : 'Rules text not yet written.' },
      owner ? `<span class="skill-tag">${esc(owner.name)}</span>` : '');
  }
  /* A skill the character has bought into. Built from the library entry plus
     the stored rank, so it holds no copy of the text — same rule equipRow()
     follows. An id that has left the library is dropped rather than drawn as a
     blank row.

     Collapsed, a row is the NAME and the BONUS — the two things read at the
     table. The category chip and the rank sit in the body, one tap in (see
     collapsible()'s `footer`): a category is a shelf the skill was browsed
     from and a rank is a spend already made, and neither is consulted
     mid-roll.

     Neither is editable here. Ranks are assigned in Edit Character, through
     the one editor that can judge a finished spread against the four-skill
     rule — a stepper on the sheet could only ever see one skill at a time, so
     it could not tell a legal rebuild from an illegal one. */
  function skillRow(entry) {
    const k = skillOf(entry.id);
    if (!k) return '';
    const head = `<span class="val-box val-box--sm">${esc(formatMod(skillMod(entry.rank)))}</span>`;
    const footer = `<div class="skill-rank">
        <span class="skill-tag">${esc(k.category)}</span>
        <span class="skill-rank__value">
          <span class="skill-rank__label">Rank</span>
          <span class="skill-rank__num">${entry.rank}</span>
        </span>
      </div>`;
    return collapsible({ id: k.id, title: k.name, desc: k.desc }, head, false, footer);
  }

  /* The same list on the Edit Character page's dossier, laid out like the
     attributes directly above it: stacked, name on the left, number on the
     right. The two sections answer the same kind of question about a
     character, so on one page they should read as a single column of facts
     rather than as two unrelated widgets — which is what the ledger line this
     replaces looked like beside a column of steppers.

     It EXPANDS, which an attribute has no need to: the dossier is where a
     player decides what the next point buys, and a skill's own text is what
     that decision is made on. The rank and category ride down there with it,
     so the closed row can stay as quiet as an attribute's.

     Namespaced #dossier because state.open is keyed by id and the toggle
     handler resolves its box with a single querySelector. The key therefore
     has to differ from BOTH of the other two renderings of the same skill —
     the sheet's row (bare id) and the skills editor's (#edit) — or one of the
     three silently stops opening. Same trap equipRow() sidesteps by position. */
  function skillLine(entry) {
    const k = skillOf(entry.id);
    if (!k) return '';
    const key = `${k.id}#dossier`;
    const open = !!state.open[key];
    /* The head is a DIV with the name as a button inside it, not one button
       around the lot: the steppers beside it are buttons too, and a button
       inside a button is invalid markup that browsers quietly unpick. Same
       constraint collapsible() works around by putting real controls in its
       footer, and skillEditRow() by making its prose band the toggle.

       The stepper writes rank; the box between its buttons reads the BONUS,
       because that is the number a player is actually choosing — rank is the
       currency, +4 is what it buys. The rank itself is stated below, where
       there is room to label it.

       Never disabled on either side. Down is always allowed because rank 0 is
       how a skill is given back (see stepSkillRank); up is always allowed
       because the budget here is reported, not gated — the same rule the
       attributes above follow. */
    return `<div class="dossier-row${open ? ' is-open' : ''}" data-collapse="${esc(key)}">
      <div class="attr-row dossier-row__head">
        <button class="dossier-row__title" data-toggle="${esc(key)}" aria-expanded="${open}">
          <span class="attr-row__name">${esc(k.name)}</span>
          <span class="skill-tag dossier-row__tag">${esc(k.category)}</span>
          <span class="collapse__caret"></span>
        </button>
        <span class="skill-step">
          <button class="step-btn" data-skill-rank="${esc(k.id)}:-1" aria-label="${esc(k.name)}: one fewer rank">&minus;</button>
          <span class="val-box val-box--sm">${esc(formatMod(skillMod(entry.rank)))}</span>
          <button class="step-btn" data-skill-rank="${esc(k.id)}:1" aria-label="${esc(k.name)}: one more rank">+</button>
        </span>
      </div>
      <div class="dossier-row__body">
        <div class="skill-rank">
          <span class="skill-tag">${esc(k.category)}</span>
          <span class="skill-rank__value">
            <span class="skill-rank__label">Rank</span>
            <span class="skill-rank__num">${entry.rank}</span>
          </span>
        </div>
        <p class="dossier-row__desc">${esc(k.desc)}</p>
      </div>
    </div>`;
  }

  /* One press, one rank, written straight through — the dossier's steppers are
     the attributes' steppers wearing a different number, and they commit the
     same way.

     Deliberately NOT the modal's draft. That editor exists to browse all 27
     and to hold a NEW character to the four-separate-skills rule, which needs
     a Save to check against; these rows only touch skills already taken, where
     there is nothing to stage and nothing to cancel. Both report the budget
     through renderSkillBudget(), so neither can disagree about it.

     Stepping the last rank off a skill REMOVES it. Rank 0 is not a state a
     character can be in — it means the skill was never taken — so it leaves
     the list rather than sitting there as a +0 row. Exactly what draftSkills()
     does when the modal saves, and the reason the row vanishes rather than
     greying out. */
  function stepSkillRank(spec) {
    /* lastIndexOf, not split: a skill id is dotted (`skill.path-less-taken`)
       and splitting on ':' would be fine today, but the delta is the ONLY
       field guaranteed to be last. Cheap insurance against an id that ever
       carries a colon. */
    const cut = String(spec).lastIndexOf(':');
    const id = String(spec).slice(0, cut);
    const delta = Number(String(spec).slice(cut + 1));
    const at = character.skills.findIndex((s) => s.id === id);
    // Only a skill already on the list has a row, so a miss is a stale click
    // on markup that has since been repainted.
    if (at === -1) return;
    const next = character.skills[at].rank + delta;
    if (next < 0) return;
    if (next === 0) character.skills.splice(at, 1);
    else character.skills[at].rank = next;
    // Nothing derived reads a skill rank — they are a readout, not an input to
    // the combat block — so the skills list and its budget are the whole
    // repaint. renderSkills() covers the sheet's copy too.
    renderSkills();
    save();
  }

  /* A row in the skill editor: the skill, what it covers, and a stepper. This
     is the stepper that used to sit on the sheet's rows — one control, moved
     to the one screen that can enforce the spread rule, rather than a second
     one grown here.

     The description is clamped to two lines and EXPANDS on tap, because
     choosing a skill is the one moment its full text matters and 27 of them
     unclamped is a wall of prose to scroll past. It rides the app's generic
     data-toggle path — the same one every collapsible uses — so there is no
     second expand mechanism here, only a second thing expanding.

     The key is namespaced: state.open is keyed by id, and an un-namespaced key
     would tie a row open here to the same skill's row on the sheet. Same trap
     equipRow() sidesteps by keying on position. */
  function skillEditRow(k, rank, left) {
    const key = `${k.id}#edit`;
    const open = !!state.open[key];
    const badge = rank
      ? `<span class="skill-pick__rank">${esc(formatMod(skillMod(rank)))}</span>` : '';
    /* Two bands, ruled apart: the name and its stepper on top — the decision —
       and the prose below it running the full width of the card, because a
       description squeezed into the column left over beside a stepper is the
       thing you are trying to read. The caret closes the lower band at its
       bottom right, so the whole block of text is also the control that
       expands it. */
    return `<div class="skill-pick${rank ? ' is-on' : ''}${open ? ' is-open' : ''}" data-collapse="${esc(key)}">
      <div class="skill-pick__head">
        <span class="skill-pick__name">${esc(k.name)}${badge}</span>
        <div class="skill-step">
          <button class="skill-step__btn" data-skill-draft="${esc(k.id)}:-1"${rank ? '' : ' disabled'} aria-label="${esc(k.name)}: one fewer rank">−</button>
          <span class="skill-step__count">${rank}</span>
          <button class="skill-step__btn" data-skill-draft="${esc(k.id)}:1"${left > 0 ? '' : ' disabled'} aria-label="${esc(k.name)}: one more rank">+</button>
        </div>
      </div>
      <button class="skill-pick__body" data-toggle="${esc(key)}" aria-expanded="${open}">
        <span class="skill-pick__desc">${esc(k.desc)}</span>
        <span class="collapse__caret"></span>
      </button>
    </div>`;
  }
  /* An equipment row is built from the library entry, never from stored copy.
     Consumables carry when they come back, which is the one thing about them a
     player needs at a glance and the only reason `refill` exists. */
  const REFILL_LABEL = { 'long-rest': 'Long Rest', 'short-rest': 'Short Rest' };
  /* Keyed by POSITION, not by library id. Creation can hand out three Health
     Potions, and three rows sharing one id would share one entry in
     state.open — opening any of them would open all three at once. The slot a
     thing sits in is what makes it a distinct row on the sheet. */
  function equipRow(id, index, edit = false) {
    const e = itemOf(id);
    // An id that has left the library is dropped rather than drawn as a blank
    // row — the same rule the hands budget follows on load.
    if (!e) return '';
    const right = e.refill
      ? `<span class="val-box val-box--sm">${esc(REFILL_LABEL[e.refill] || e.refill)}</span>`
      : '';
    /* Removal lives in the BODY, one tap in, the same place a skill keeps its
       rank stepper and for the same reason: dropping a piece of gear is a
       deliberate act, not something a thumb should be able to do while
       scrolling past. It is also what stops the list being a one-way door now
       that gear can be added from here — five slots and no way out would be a
       trap rather than a feature.

       Keyed by INDEX, not id: three Health Potions must remove one each.

       The same round trash button the journal and the backpack use, rather
       than a worded one: it is the third place in the app that deletes a row
       from a list, and three spellings of one gesture is two too many. The
       label moves into aria-label, which is where the name of an icon button
       belongs — and it names the ITEM, so a screen reader announces "Remove
       Health Potion" rather than three identical "Remove"s. */
    const footer = `<div class="row-actions">
        <button class="icon-act icon-act--delete" data-equip-drop="${index}"
                aria-label="Remove ${esc(e.name)}">${TRASH_SVG}</button>
      </div>`;
    /* Namespaced when this is the editor's copy. state.open is keyed by id and
       the toggle handler finds its box with a single querySelector, so two
       rows sharing a key would not merely open together — the second one would
       never open at all, because the lookup always lands on the first. Same
       trap skillEditRow() sidesteps with its own `#edit` suffix. */
    const key = `${e.id}#${index}${edit ? '#edit' : ''}`;
    return collapsible({ id: key, title: e.name, desc: e.desc }, right, true, footer);
  }

  function dropEquipment(index) {
    const at = Number(index);
    if (!(at >= 0 && at < character.equipment.length)) return;
    character.equipment.splice(at, 1);
    renderContent();
    save();
  }

  // Where a stat's number comes from, named by the item granting each part.
  // Rendered for every card but shown only for the pressed one, and floated
  // OVER the grid rather than opening inside the card — a card that grew would
  // drag its row-mate taller with it, which is noise for a stat nobody asked
  // about. The sheet stays quiet until asked, and answers without moving.
  function statSources(name) {
    const rows = character.inventory.flatMap((item) =>
      liveMods(item)
        .filter((m) => m.stat === name)
        .map((m) => `<div class="stat-src">
          <span class="stat-src__from">${esc(item.title)}</span>
          <span class="stat-src__val">${formatMod(m.value)}</span>
        </div>`)
    ).join('');

    /* Active boons, listed AFTER what the character is carrying. The order is
       the answer to "why is this number what it is", read outermost-last:
       what you were born with, what you picked up, then what is on you right
       now. The boon line is the one that will be gone next skirmish.

       Same row, same shape, one extra class — a boon IS an item mod as far as
       this popover is concerned, and dressing it as a different component
       would suggest the two combine differently. They do not; they are added.

       The stack count rides in the label rather than the value, so three
       stacks of Strength reads "Strength ×3  +3" instead of a bare "+3" the
       player has to divide by the rules text to understand. */
    const boonRows = character.effects.flatMap((e) => {
      const def = effectById(e.id);
      if (!def || !def.mod || def.mod.stat !== name) return [];
      const label = e.stacks > 1 ? `${def.name} \u00d7${e.stacks}` : def.name;
      return [`<div class="stat-src stat-src--boon">
          <span class="stat-src__from">${esc(label)}</span>
          <span class="stat-src__val">${formatMod(def.mod.value * e.stacks)}</span>
        </div>`];
    }).join('');

    return `<div class="stat-card__sources">
      <div class="stat-src stat-src--base">
        <span class="stat-src__from">Base</span>
        <span class="stat-src__val">${statBase(name)}</span>
      </div>
      ${rows}${boonRows}
    </div>`;
  }

  function statCard(s) {
    const open = state.openStat === s.name;
    // A modified stat is marked by colour alone — no subtitle by default.
    // Through statBonus() so a boon colours the card exactly as a trinket
    // does: the player should not have to know which of the two moved it.
    const modified = statBonus(s.name) !== 0 ? ' is-modified' : '';
    return `<div class="stat-card${open ? ' is-open' : ''}${modified}" data-stat="${esc(s.name)}">
      <button class="stat-card__head" data-stat-toggle="${esc(s.name)}" aria-expanded="${open}">
        <span class="stat-card__name">${esc(s.name)}</span>
        <span class="stat-card__value">${statValue(s.name)}</span>
      </button>
      ${statSources(s.name)}
    </div>`;
  }

  // Show one popover and close any other. Done by toggling classes rather than
  // repainting the grid: the panel is an overlay, so there is no layout to
  // rebuild, and nothing else on the Stats tab needs to change.
  function showStatPop(name) {
    state.openStat = name;
    $$('.stat-card').forEach((card) => {
      const on = card.dataset.stat === name;
      card.classList.toggle('is-open', on);
      const head = $('.stat-card__head', card);
      if (head) head.setAttribute('aria-expanded', String(on));
    });
  }

  // Inventory titles are player-typed, so esc() here is load-bearing.

  // Modifier summary for the ledger subtitle, e.g. "+2 Precision · -1 Fortune".
  // Only modifiers that actually do something are listed.
  const liveMods = (item) => (item.mods || []).filter((m) => m.stat && m.value);
  const modSummary = (item) => liveMods(item).map((m) => `${formatMod(m.value)} ${m.stat}`).join(' · ');

  // A ledger line: the name, plus its modifiers when it has any. Descriptions
  // deliberately stay out of here — the ledger is an index, the backpack is the
  // reading view. The row itself is the button, so nothing nests inside it.
  function invRow(item) {
    const mods = modSummary(item);
    return `<button class="inv-row" data-inv-open="${esc(item.id)}">
      <span class="inv-row__body">
        <span class="inv-row__name">${esc(item.title)}</span>
        ${mods ? `<span class="inv-row__mods">${esc(mods)}</span>` : ''}
      </span>
    </button>`;
  }

    const PENCIL_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>';
    const TRASH_SVG  = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

  // The backpack shows ONE item at a time. The sheet's ledger is already the
  // index, so making the player scan a second list to find what they just
  // tapped was the clunky part — this is a page, not a list.
  function bpCard(item) {
    const chips = liveMods(item)
      .map((m) => `<span class="bp-card__mod">${formatMod(m.value)} ${esc(m.stat)}</span>`)
      .join('');
    return `<div class="bp-card__head">
        <span class="bp-card__name">${esc(item.title)}</span>
        <button class="icon-act icon-act--edit" data-bp-edit="${esc(item.id)}" aria-label="Edit ${esc(item.title)}">${PENCIL_SVG}</button>
        <button class="icon-act icon-act--delete" data-bp-delete="${esc(item.id)}" aria-label="Delete ${esc(item.title)}">${TRASH_SVG}</button>
      </div>
      ${chips ? `<div class="bp-card__mods">${chips}</div>` : ''}
      <div class="bp-card__desc${item.desc ? '' : ' bp-card__desc--none'}">${esc(item.desc || 'No description.')}</div>`;
  }

  // One modifier row in the item form: which attribute, and by how much.
  //
  // The attribute options are generated from character.stats rather than
  // written into index.html, so the dropdown can never list an attribute the
  // character doesn't have — or miss one that gets added later.
  //
  // The value control is a scroll-snapping column: seven stops are visible
  // (-3 … +3) and scrolling carries on to ±20, which is what a range input
  // cannot do. A scroll picker is invisible to a keyboard, so the column is a
  // real spinbutton with arrow-key handling — ARIA used exactly where the
  // native semantics fall short.
  function modRow(mod, i) {
    const options = ['<option value="">— attribute —</option>'].concat(
      character.stats.map((st) =>
        `<option value="${esc(st.name)}"${st.name === mod.stat ? ' selected' : ''}>${esc(st.name)}</option>`)
    ).join('');

    let cells = '';
    for (let v = MOD_MAX; v >= MOD_MIN; v--) {
      cells += `<span class="picker__cell${v === mod.value ? ' is-selected' : ''}" data-v="${v}">${modLabel(v)}</span>`;
    }

    return `<div class="mod-row">
      <div class="mod-row__left">
        <select class="mod-row__stat" data-mod-stat="${i}" aria-label="Attribute to modify">${options}</select>
        <button class="mod-row__remove" data-mod-remove="${i}">Remove</button>
      </div>
      <div class="picker">
        <div class="picker__scroll" data-mod-picker="${i}" tabindex="0" role="spinbutton"
             aria-label="Modifier value" aria-valuemin="${MOD_MIN}" aria-valuemax="${MOD_MAX}"
             aria-valuenow="${mod.value}" aria-valuetext="${modLabel(mod.value)}">
          <div class="picker__list">${cells}</div>
        </div>
        <span class="picker__band" aria-hidden="true"></span>
      </div>
    </div>`;
  }

  // A tracked boon/condition: its text from the catalog, its stack count from
  // the character. `kind` only becomes a class — CSS decides what a boon looks
  // like versus a condition.
  function effectRow(entry) {
    const def = effectById(entry.id);
    if (!def) return '';
    return `<div class="effect-row effect-row--${def.kind}">
      <div class="effect-row__text">
        <div class="effect-row__name">${esc(def.name)}</div>
        <div class="effect-row__effect">${esc(def.effect)}</div>
      </div>
      <div class="effect-row__controls">
        ${tickButton(def, entry)}
        <div class="effect-step">
          <button class="effect-step__btn" data-effect-step="${esc(def.id)}:-1" aria-label="${esc(def.name)}: one fewer stack">−</button>
          <span class="effect-step__count">${entry.stacks}</span>
          <button class="effect-step__btn" data-effect-step="${esc(def.id)}:1" aria-label="${esc(def.name)}: one more stack">+</button>
        </div>
      </div>
    </div>`;
  }

  /* The button on an effect that happens repeatedly. It carries the TOTAL for
     the stacks on the sheet — "Heal 2", "Take 3" — because the multiplication
     is the only thing the button is really for; the rules text above it
     already says what one stack does.

     Only the effect's own row gets one, and only when it has a tick. Nothing
     decides WHEN to press it: the rules text says "at the end of your turn",
     the player knows when that is, and the app is not keeping track. */
  function tickButton(def, entry) {
    if (!def.tick) return '';
    const per = def.tick.heal || def.tick.damage || 0;
    const total = per * entry.stacks;
    const heal = !!def.tick.heal;
    return `<button class="effect-tick${heal ? ' effect-tick--heal' : ''}"`
      + ` data-effect-tick="${esc(def.id)}"`
      + ` aria-label="${esc(def.name)}: ${esc(def.tick.label)} ${total}">`
      + `${esc(def.tick.label)} ${total}</button>`;
  }

  // A row in the picker sheet.
  function effectPickRow(def) {
    return `<button class="effect-pick" data-effect-add="${esc(def.id)}">
      <span class="effect-pick__name">${esc(def.name)}</span>
      <span class="effect-pick__effect">${esc(def.effect)}</span>
    </button>`;
  }

  /* ------------------------------------------------------------------ */
  /* RENDER                                                             */
  /* ------------------------------------------------------------------ */
  function setText(bind, value) {
    $$(`[data-bind="${bind}"]`).forEach((el) => { el.textContent = value; });
  }

  function fillList(name, html) {
    const el = $(`[data-list="${name}"]`);
    if (el) el.innerHTML = html;
  }

  // Show or hide a whole block of markup — a sub-heading and its list
  // together, so a section with nothing in it takes no vertical space and
  // leaves no orphaned rule behind. `hidden` rather than a class, because
  // "there is nothing here" is a fact about the content, not a style.
  function showBlock(name, on) {
    const el = $(`[data-block="${name}"]`);
    if (el) el.hidden = !on;
  }

  // "Hunter Ranger", or "Hunter Ranger +1" once a second subclass is in
  // play — the full ledger is too much for a caption line, so it names the
  // pool the character mostly is and flags that there is more.
  /* The caption under a character's name, on the hero and on their Personae
     row alike. One function because they are now the same sentence — Order
     used to prefix the hero's and no longer exists, so having two was just two
     places to forget to change.

     Reads "5 Hunter": the subclass and how many levels are in it, nothing
     else. A multiclass character gets one term per subclass — "3 Hunter ·
     2 Sentinel" — because "the level you are" is per subclass here, and a
     single total would hide the split that primarySubclass() turns on.

     A character's level IN a subclass is how many LEVEL-UPS went to it.
     Creation is level 0 (see SEED_CHARACTER), so the origin subclass earns no
     level from being chosen — a freshly created character reads "0 Hunter",
     which is exactly the level the rules say they are. */
  const buildMeta = (build = character.build) => {
    // Set, because a subclass taken at creation and then levelled into is the
    // same subclass; insertion order is origin-first, then the order taken.
    const ids = [...new Set(subclassIds(build))].filter((id) => subclassOf(id));
    if (!ids.length) return 'Unclassed';
    const levelsIn = (id) => build.levels.filter((l) => l === id).length;
    return ids
      // Deepest first, so the subclass the character mostly IS leads the line.
      // sort() is stable, so a tie keeps the order the subclasses were taken
      // in — the same tiebreak primarySubclass() uses.
      .sort((a, b) => levelsIn(b) - levelsIn(a))
      .map((id) => `${levelsIn(id)} ${subclassOf(id).name}`)
      .join(' · ');
  };

  function buildLabel(build = character.build) {
    const primary = primarySubclass(build);
    if (!primary) return 'Unclassed';
    const parent = classOf(primary.classId);
    const others = new Set(subclassIds(build).filter((id) => id !== primary.id));
    return `${primary.name}${parent ? ' ' + parent.name : ''}`
      + (others.size ? ` +${others.size}` : '');
  }

  /* ---- the Personae list ---------------------------------------------
     One row per character. The meta line is DERIVED from each row's build
     rather than stored with it, which is why summarise() keeps the build and
     not the label: renaming a subclass in the spreadsheet has to relabel every
     character that took it, including the ones not currently open.

     Portraits here are the one place the app shows several characters' photos
     at once, so framing is written per row instead of on `.app` — see
     writeView(), which has always taken the element for this reason. */
  function renderRoster() {
    const editing = state.rosterEdit;
    app.setAttribute('data-roster', editing ? 'edit' : 'read');
    // The toggle names the mode it goes TO, which is the convention every
    // list-edit button follows. Disabled with nothing to edit.
    setText('rosterEdit', editing ? 'Done' : 'Edit');
    const toggle = $('[data-roster-edit]');
    if (toggle) toggle.disabled = !roster.length;

    // An empty roster is a different screen, not a list with nothing in it:
    // the lead line explains it and Create takes the accent. Both are the
    // stylesheet's business, so this only states the fact.
    if (roster.length) app.removeAttribute('data-roster-empty');
    else app.setAttribute('data-roster-empty', '');
    showBlock('rosterLead', !roster.length);

    fillList('roster', roster.length ? roster.map((r) => `
      <div class="persona-card" data-row="${esc(r.id)}"${r.id === character.id ? ' data-current' : ''}>
        <div class="persona-card__main">
          <button class="persona-card__del" data-char-del="${esc(r.id)}" aria-label="Delete ${esc(r.name)}"${editing ? '' : ' tabindex="-1"'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>
          </button>
          <button class="persona-card__open" data-open-character="${esc(r.id)}"${editing ? ' disabled' : ''}>
            <span class="persona-card__portrait"><img data-roster-img="${esc(r.id)}" alt=""></span>
            <span class="persona-card__body">
              <span class="persona-card__name">${esc(r.name)}</span>
              <span class="persona-card__meta">${esc(buildMeta(r.build))}</span>
            </span>
            <svg class="persona-card__chevron" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <!-- Export now sits in the control gutter beside the grip rather than
               as a labelled button under the row. It lost its text with the
               move, so it carries an aria-label: an icon-only control has no
               accessible name otherwise, and "Export" was doing that job. -->
          <button class="persona-card__export" data-char-export="${esc(r.id)}"${editing ? '' : ' tabindex="-1"'}
                  aria-label="Export ${esc(r.name)}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M12 12v6"/><path d="m15 15-3-3-3 3"/></svg>
          </button>
          <button class="persona-card__grip" data-char-grip="${esc(r.id)}"${editing ? '' : ' tabindex="-1"'}
                  aria-label="Reorder ${esc(r.name)} — use the arrow keys, or drag">
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>`).join('')
      // Nothing at all when the roster is empty — .roster-lead above says it in
      // prose, and the Create and Import buttons below are the answer. A
      // placeholder here would only be a third dashed box between them.
      : '');

    // src is set here rather than in the markup above: a data URL runs to tens
    // of thousands of characters, and threading it through an HTML string
    // would mean escaping and re-parsing the whole photo on every repaint.
    for (const r of roster) {
      const img = $(`[data-roster-img="${CSS.escape(r.id)}"]`);
      if (!img) continue;
      const card = img.closest('.persona-card');
      if (r.portrait) { img.src = r.portrait; img.alt = `${r.name} — portrait`; }
      // Removed rather than blanked, for the reason renderPortrait() gives:
      // an <img src=""> re-requests the page itself in some browsers.
      else { img.removeAttribute('src'); img.alt = ''; }
      // Photo-or-not is per ROW here, not per app: the list shows several
      // characters at once and they will not all have a face. Same attribute
      // name as the app-level one so the stylesheet reads the same either way.
      if (card) {
        card.setAttribute('data-portrait', r.portrait ? 'set' : 'none');
        writeView(card, r.portraitView);
      }
    }
  }

  /* Abilities and spells, one section split in two. The split is made HERE
     rather than by storing two lists, because they are one kind of thing that
     happens to be filed under two headings: a single list keeps ordering,
     editing and the character file simple, and `kind` is the only thing the
     sheet needs to sort them by.

     A sub-list with nothing in it is hidden entirely, heading and all — see
     the markup for why an empty "Spells" rule is worse than no rule. */
  function renderAbilities() {
    const spells = character.abilities.filter((a) => a.kind === 'spell');
    const powers = character.abilities.filter((a) => a.kind !== 'spell');

    fillList('abilities', powers.map(abilityRow).join(''));
    fillList('spells',    spells.map(abilityRow).join(''));

    showBlock('abilities', powers.length);
    showBlock('spells',    spells.length);
    // Only when BOTH are empty, so the note explains a genuinely bare section
    // rather than appearing under a list that is merely short of spells.
    showBlock('abilitiesEmpty', !powers.length && !spells.length);
  }

  // Paint the static-per-character content once.
  function renderContent() {
    setText('name', character.name);
    setText('meta', buildMeta());
    renderRoster();
    // Derived from the build, never stored — a character who multiclasses
    // gains the new subclass's Tier 0 trait here with nothing wiring it up.
    fillList('traits', tier0Traits().map(traitRow).join('')
      || '<div class="empty-note">Traits come from your class and subclass. Choose them to see yours.</div>');
    fillList('passives',    character.passives.map(passiveRow).join('')
      || '<div class="empty-note">Nothing written yet. Passives you add by hand appear here.</div>');
    /* Explicit arrows, NOT `.map(equipRow)`: map hands its callback a third
       argument (the array itself), which would arrive as `edit` and be truthy
       on both lists. The sheet's rows would then carry the editor's namespaced
       keys and stop opening. */
    fillList('equipment',     character.equipment.map((id, i) => equipRow(id, i)).join(''));
    fillList('editEquipment', character.equipment.map((id, i) => equipRow(id, i, true)).join('')
      || '<div class="empty-note">No equipment carried.</div>');

    // setText writes to every match, so one call paints the count on the
    // sheet's Gear tab and the editor's at once.
    setText('equipCount', `${character.equipment.length} / ${character.equipMax}`);
    renderSkills();
    renderGear();
    renderDerived();
    renderInventory();

    // The picker's contents are the catalog, which never changes at runtime,
    // so it is painted once here rather than on every open.
    fillList('boonPicker',      EFFECTS.filter((e) => e.kind === 'boon').map(effectPickRow).join(''));
    fillList('conditionPicker', EFFECTS.filter((e) => e.kind === 'condition').map(effectPickRow).join(''));
    renderEffects();

    renderNotes();
  }

  /* ------------------------------------------------------------------ */
  /* INVENTORY — add / remove player-created items                      */
  /* ------------------------------------------------------------------ */

  // Everything that reads a core attribute, repainted together. The stat cards
  // obviously need it; the gear summary does too, because its To-Hit box is
  // derived from Precision — so a Precision modifier moves both and neither
  // knows about the other.
  // The worn-armour slot and the button that swaps it. Separate from
  // renderDerived() only because the picker's own rows have to repaint too.
  function renderGear() {
    fillList('gearSlots',     gearRows());
    fillList('armorSlot',     armorRow());
    fillList('editGearSlots', gearRows(true));
    fillList('editArmorSlot', armorRow(true));
    setText('handsCount', `${handsUsed()} / ${HAND_CAPACITY}`);
    /* Every match, not the first. The same bind is painted on the sheet's Gear
       tab and on Edit Character now, and a single querySelector would colour
       one readout and leave the other lying — the same reason
       renderSkillBudget() walks its matches. */
    $$('[data-bind="handsCount"]').forEach((el) => {
      // Unreachable through the UI, but imported or hand-edited data can arrive
      // over capacity, so the readout can still say so.
      el.classList.toggle('rule__count--over', handsUsed() > HAND_CAPACITY);
    });

    /* An add button for a slot that cannot take anything is a dead control, so
       each one is present only while it has something to offer.

       Walked rather than picked, for the reason above: left as a single lookup
       these would only ever hide the sheet's copy, and filling both hands
       would leave a live "Add Gear" sitting on the editor promising a slot
       that does not exist. The editor's hands and armour adders are emitted by
       gearRows()/armorRow() only when there is room, so these two pass over
       them agreeing; equipment's is static markup and genuinely needs it. */
    $$('[data-gear-add]').forEach((b)  => { b.hidden = handsFree() <= 0; });
    $$('[data-armor-add]').forEach((b) => { b.hidden = !!character.armorWorn; });

    // Equipment has a real ceiling, so its add button goes when there is no
    // room — the same rule the hands and armour adders already follow.
    $$('[data-action="add-equipment"]').forEach((b) => {
      b.hidden = character.equipment.length >= character.equipMax;
    });
  }

  // The character tab's at-a-glance gear. Derived from the hands list, so
  // equipping a bow on the gear tab puts a 2d6 damage box here with nothing
  // wiring the two screens together.
  function gearSummary() {
    return heldGear().map((g) => {
      const boxes = [];
      if (g.damage) {
        boxes.push({ label: 'To-Hit', roll: 'tohit' });              // from Precision
        boxes.push({ label: 'Damage', value: g.damage, roll: 'damage', dice: true });
      }
      // A shield contributes defensively instead of attacking, so it shows the
      // bonus it actually grants and nothing rollable. Zero-value halves are
      // omitted here (unlike the gear-tab detail window, which states both):
      // this row is a glance, and "+0 Evasion" is not what a glance is for.
      if (g.type === 'Shield') {
        if (g.armorMod)   boxes.push({ label: 'Armor',   value: modLabel(g.armorMod) });
        if (g.evasionMod) boxes.push({ label: 'Evasion', value: modLabel(g.evasionMod) });
      }
      const reach = g.range ? `Range ${g.range}` : (g.threat ? `Threat ${g.threat}` : '');
      const type = g.type === 'Shield' ? '' : (reach || (g.damage ? '' : g.desc || ''));
      return { name: g.name, type, boxes };
    });
  }

  function renderDerived() {
    fillList('stats',       character.stats.map(statCard).join(''));
    /* Ability and spell rows are DERIVED too, and it is easy to miss why: a
       damage box goes through damageExpr(), which folds in damageBonus(), so
       Power is baked into the printed dice. Taking Strength therefore has to
       repaint them or a `2d6+3` sits there while Power says 4.

       This is why renderAbilities() is called from here and not only from
       renderContent(): every path that can move an attribute — a boon, a
       trinket, an edited stat — already funnels through renderDerived(), and
       hanging it here means none of them has to remember. Rebuilding is safe
       because state.open[] holds which rows are expanded, so nothing closes
       under the player. */
    renderAbilities();
    // With nothing in hand the section would otherwise render as a heading over
    // blank space — indistinguishable from a render that failed. Say so, and
    // say where to fix it, since gear is equipped on the Gear tab.
    const held = gearSummary();
    fillList('gearSummary', held.length
      ? held.map(gearSummaryRow).join('')
      : '<div class="empty-note">Nothing in hand — equip gear on the Gear tab.</div>');
    // Evasion/Armor/Fortitude/Speed are computed from attributes, worn gear,
    // wounds and effect stacks — so they repaint here alongside everything
    // else derived, rather than once at load like static content.
    fillList('combat',      combatStats().map(combatCell).join(''));
  }

  /* Both ledgers. Unlike the equipment rows above, an inventory row is a plain
     button with no open/closed state to collide over, so the two copies are
     byte-identical and share one build. */
  function renderInventory() {
    const rows = character.inventory.length
      ? character.inventory.map(invRow).join('')
      : '<div class="empty-note">Nothing carried yet.</div>';
    fillList('inventory', rows);
    fillList('editInventory', rows);
  }

  /* ------------------------------------------------------------------ */
  /* ELASTIC HERO — pull down at the top to see more of the portrait     */
  /* ------------------------------------------------------------------ */
  /* Pulling past the top of the character tab stretches the hero, and    */
  /* letting go glides it back. The stylesheet owns every visual: JS      */
  /* writes ONE number, --pull, and CSS decides that it grows the hero's  */
  /* height, how it eases, and what respects reduced motion.              */

  // Read back from the stylesheet rather than restated here, so the ceiling
  // and the settle time are tuned in one place with the rest of the design.
  const cssNumber = (name, fallback) => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  };

  let pullMax = 130;
  let pullSettleMs = 520;
  let pullDist = 0;       // raw gesture distance, before resistance
  let pullFrom = null;    // gesture anchor, null when not tracking
  let pullWheelTimer = null;

  /* Wheel gestures need more than a timer to know when the hand has left.
     A trackpad keeps firing wheel events after the fingers lift — macOS
     momentum, decaying over the best part of a second — and treating that tail
     as continued input is what pinned the hero open long after letting go.

     Momentum has one property a real push does not: it only ever DECAYS. So a
     delta that has fallen well below the gesture's peak means the hand is
     already off, and that is as close to a touchend as a wheel gets. A mouse
     wheel never decays like that, and falls back to the idle timer below. */
  const WHEEL_IDLE_MS   = 110;   // silence that counts as "stopped" for a mouse wheel
  const WHEEL_FADE_HITS = 4;     // consecutive SHRINKING deltas that read as a tail
  const WHEEL_FADE_TO   = 0.8;   // ...and it must have fallen this far below the peak
  const WHEEL_REPUSH    = 1.4;   // a delta rising this much again is a NEW gesture

  let wheelPeak  = 0;       // biggest delta seen in the current gesture
  let wheelLast  = 0;       // previous delta, for spotting decay and fresh pushes
  let wheelFade  = 0;       // consecutive deltas smaller than the one before
  let wheelSpent = false;   // released already — ignore the rest of this tail

  const resetWheel = () => { wheelPeak = 0; wheelFade = 0; wheelSpent = false; };

  const heroEl = () => $('.hero');
  const scrollerEl = () => $('.sheet__scroll');

  // The pull belongs to the character tab and nothing else: the other tabs
  // have no hero to reveal, and a modal is its own surface.
  const canPull = () =>
    app.getAttribute('data-view') === 'sheet' &&
    app.getAttribute('data-tab') === 'action' &&
    app.getAttribute('data-modal') === 'closed';

  /* Resistance. Distance dragged maps onto an asymptote at --pull-max, so the
     stretch never runs out abruptly and never exceeds its ceiling — it just
     gets progressively harder, which is what reads as elastic. At one
     ceiling's worth of drag you have spent 63% of the travel. */
  const resist = (d) => pullMax * (1 - Math.exp(-Math.max(0, d) / pullMax));

  function setPull(px) {
    const hero = heroEl();
    if (!hero) return;
    // A raw scalar, not appearance — see writeView() for the same reasoning.
    hero.style.setProperty('--pull', `${px.toFixed(2)}px`);
  }

  // Hand the stretch back. The transition lives behind .is-settling so that it
  // applies ONLY here — during the drag the hero must track the finger with no
  // easing at all, or it lags behind it.
  function releasePull() {
    pullFrom = null;
    pullDist = 0;
    clearTimeout(pullWheelTimer);
    const hero = heroEl();
    if (!hero) return;
    hero.classList.add('is-settling');
    setPull(0);
    // Belt and braces: transitionend is the normal path, but a transition that
    // never starts (already at 0, or reduced motion) would leave the class on.
    clearTimeout(releasePull._t);
    releasePull._t = setTimeout(() => hero.classList.remove('is-settling'), pullSettleMs + 60);
  }

  function beginPull() {
    const hero = heroEl();
    if (hero) hero.classList.remove('is-settling');
  }

  /* ------------------------------------------------------------------ */
  /* RULES — the Player's Guide, searchable                             */
  /* ------------------------------------------------------------------ */
  /* The text is data, generated from the RTF in docs/ by
     tools/rtf-to-rules.mjs and loaded as window.WAYPOINT_RULES. Nothing in
     this file knows a single rule: it lays out whatever the guide says, so a
     new export changes the app without changing any code.

     Missing rules.js is treated the same way as a missing library: loudly,
     because a Rules screen that silently renders nothing looks like a broken
     app rather than a missing file. */

  const RULES = () => window.WAYPOINT_RULES || null;

  /* Everything a section says, lowercased once, for the search to run over.
     Built per render rather than cached: the guide is a few hundred blocks,
     which is nothing next to the DOM write that follows it, and a cache is a
     second copy of the rulebook to keep in step. */
  function ruleHaystack(sec) {
    const parts = [sec.title];
    for (const b of sec.blocks) {
      if (b.t === 'p' || b.t === 'h') parts.push(b.text);
      else if (b.t === 'ul') parts.push(...b.items);
      else if (b.t === 'table') { parts.push(...b.head); for (const r of b.rows) parts.push(...r); }
    }
    return parts.join('\n').toLowerCase();
  }

  /* One block of the guide. `q` is the live search term, threaded through so
     every piece of text on screen can carry its own highlight — a match in
     the fourth cell of the Wound ladder is as findable as one in a heading. */
  function ruleBlock(b, q) {
    if (b.t === 'h') return `<h4 class="rules__h">${highlight(b.text, q)}</h4>`;
    if (b.t === 'p') return `<p class="rules__p">${highlight(b.text, q)}</p>`;
    if (b.t === 'ul') {
      return `<ul class="rules__list">${
        b.items.map((it) => `<li>${highlight(it, q)}</li>`).join('')}</ul>`;
    }
    if (b.t === 'table') {
      const head = b.head.length
        ? `<thead><tr>${b.head.map((h) => `<th>${highlight(h, q)}</th>`).join('')}</tr></thead>`
        : '';
      const body = b.rows.map((r) =>
        `<tr>${r.map((c) => `<td>${highlight(c, q)}</td>`).join('')}</tr>`).join('');
      // Wrapped, because a five-column table cannot be made to fit a phone and
      // squeezing it into one would cost the reader the columns' meaning. The
      // wrapper scrolls; the page does not.
      return `<div class="rules__tablewrap"><table class="rules__table">${head}<tbody>${body}</tbody></table></div>`;
    }
    return '';
  }

  /* A section, as a collapsible row — the same one skills, abilities and gear
     use, so it inherits the caret, the data-toggle open/close path and
     state.open without a second implementation.

     The body goes in through collapsible()'s `footer` slot rather than its
     `desc`, because `desc` is escaped on the way in and a highlighted block is
     HTML by definition. Passing desc: '' leaves the footer as the whole body. */
  function ruleSection(sec, q, forceOpen) {
    if (forceOpen) state.open[sec.id] = true;
    const blocks = sec.blocks.map((b) => ruleBlock(b, q)).join('');
    return collapsible(
      { id: sec.id, title: sec.title, desc: '' },
      '', false,
      `<div class="rules__body">${blocks}</div>`,
    );
  }

  /* The search filter, written once. Both the renderer and the expand/collapse
     control need "which sections are on screen right now", and a second copy of
     this predicate is how the button ends up acting on rows nobody can see. */
  const ruleHits = (ch, q) => (q ? ch.sections.filter((sec) => ruleHaystack(sec).includes(q)) : ch.sections);

  // Flattened across chapters — the control does not care which chapter a
  // section belongs to, only whether it is currently listed.
  const shownRuleSections = (guide, q) => guide.chapters.flatMap((ch) => ruleHits(ch, q));

  function renderRules() {
    const guide = RULES();
    if (!guide) {
      fillList('rules', '<div class="empty-note">The rulebook did not load — check resources/js/rules.js.</div>');
      console.error('Waypoint: rules.js did not load.');
      return;
    }

    const q = state.rulesQuery;
    /* Searching opens what it found: a list of closed rows you then have to tap
       one by one is a worse answer than no search at all. But that force-open
       runs on EVERY render, so it would also undo a deliberate Collapse All the
       instant anything repainted. state.rulesCollapsed is the player overriding
       the automatic behaviour, and it lasts until the query changes — a new
       search is a new question, and its results should open like any other. */
    const forceOpen = !!q && !state.rulesCollapsed;
    let shown = 0;
    const html = guide.chapters.map((ch) => {
      // Filtered per chapter, so a chapter with no match drops out whole
      // rather than leaving its heading stranded over nothing.
      const hits = ruleHits(ch, q);
      if (!hits.length) return '';
      shown += hits.length;
      return `<div class="rule"><span class="rule__label">${esc(ch.title)}</span></div>
        <div class="stack stack--tight">${
          hits.map((sec) => ruleSection(sec, q, forceOpen)).join('')}</div>`;
    }).join('');

    fillList('rules', html || `<div class="empty-note">Nothing in the guide matches &ldquo;${esc(q)}&rdquo;.</div>`);
    setText('rulesCount', q
      ? `${shown} section${shown === 1 ? '' : 's'}`
      : `${guide.title} · updated ${guide.generated}`);
    renderRulesToggle();
  }

  /* The control's label is DERIVED from what is actually open, not from the
     last button pressed — so it stays honest after the player has opened or
     closed rows by hand, which is the common case and the one a remembered
     "mode" would get wrong. Anything open at all offers Collapse All; only a
     fully closed list offers Expand All. */
  function renderRulesToggle() {
    const btn = $('[data-rules-toggle]');
    if (!btn) return;
    const guide = RULES();
    const sections = guide ? shownRuleSections(guide, state.rulesQuery) : [];
    // Nothing listed, nothing to fold. Hidden rather than disabled: this is a
    // caption-sized control, and a greyed one in a line of captions is noise.
    btn.hidden = sections.length === 0;
    if (!sections.length) return;
    btn.textContent = sections.some((sec) => state.open[sec.id]) ? 'Collapse all' : 'Expand all';
  }

  function toggleAllRules() {
    const guide = RULES();
    if (!guide) return;
    const q = state.rulesQuery;
    const sections = shownRuleSections(guide, q);
    if (!sections.length) return;
    // Same test the label is drawn from, so the button always does the thing
    // it just said it would.
    const anyOpen = sections.some((sec) => state.open[sec.id]);
    sections.forEach((sec) => { state.open[sec.id] = !anyOpen; });
    /* Only collapsing needs the override. Expanding agrees with what a search
       would have done anyway, so leaving the flag set there would strand the
       player one repaint away from everything closing again. */
    state.rulesCollapsed = anyOpen;
    renderRules();
  }

  function setRulesQuery(value) {
    const next = value.trim().toLowerCase();
    // A new question deserves its answers open, so the manual override is
    // dropped whenever the term actually changes — but NOT on a repaint with
    // the same term, which would quietly re-open a list just collapsed.
    if (next !== state.rulesQuery) state.rulesCollapsed = false;
    state.rulesQuery = next;
    renderRules();
  }

  /* ------------------------------------------------------------------ */
  /* REST — the window, and what picking one does                       */
  /* ------------------------------------------------------------------ */

  function openRest() {
    // The number, not the fraction: "+5 Mana" is what the player is deciding
    // about, and it is read from the same helper the rest itself uses, so the
    // promise on the button and what the button does cannot disagree.
    setText('restShortNote', `Health full, +${shortRestMana()} Mana, Wounds unchanged`);
    /* The drawer stays OPEN behind this, unlike navigating to Edit Character.
       A rest is not a departure — you are not taken anywhere, you are asked a
       question and answered it — so dismissing the question should put you
       back where you asked it. That holds for both exits: picking a rest and
       tapping outside the popup both leave the drawer exactly as it was.

       Nothing more is needed to keep it there. The modal sits at z-index 50
       and the drawer at 40, so the popup covers it, and the scrim's own
       handler closes only the modal. */
    app.setAttribute('data-modal', 'rest');
  }

  function takeRest(kind) {
    rest(kind);
    // renderEffects() because a rest now clears every Boon and Condition, and
    // renderDerived() because those effects were holding Armor, Evasion, Speed
    // and attributes up. Without both, the model empties and the sheet keeps
    // showing the rows and the numbers they were buying.
    renderEffects(); renderVitals(); renderDerived();
    save();
    // Closing IS the confirmation: the bars behind this window visibly refill
    // as it goes, which says more than a banner would.
    closeModal();
  }

  /* ------------------------------------------------------------------ */
  /* PATCH — the two gestures, and what spending one does               */
  /* ------------------------------------------------------------------ */

  /* Held long enough to be meant. The same 450ms the dice roller's delete key
     uses, read from that constant rather than restated, so the app has ONE
     idea of how long a hold is and the two cannot drift apart. */
  const patchHold = { timer: null, fired: false };

  function patchHoldStart() {
    patchHoldCancel();
    /* Cleared on START, not on release — a hold that wanders off the box never
       produces a click to consume the flag, and a stale one would swallow the
       next tap. Lifted wholesale from diceHoldStart(), including this reason. */
    patchHold.fired = false;
    patchHold.timer = setTimeout(() => {
      patchHold.timer = null;
      patchHold.fired = true;
      openPatch();
    }, DICE_HOLD_MS);
  }

  function patchHoldCancel() {
    if (patchHold.timer) { clearTimeout(patchHold.timer); patchHold.timer = null; }
  }

  /* The dialog states the two halves of a Patch SEPARATELY, and only the ones
     that apply. At full health with one Wound it offers to patch the Wound and
     says nothing about healing, because promising "Reset HP to full" to
     somebody already at full is a promise with no content — and a player who
     reads it once and finds it meaningless stops reading the line at all.

     Both halves come from patchGain(), which the counter also asks. So the
     button cannot offer something the counter thought was unavailable. */
  function openPatch() {
    /* Silently does nothing when a Patch would achieve nothing — out of
       Patches, already whole, or Downed (see canSpendPatch). A hold that opens
       an empty dialog explaining it cannot help is worse than a hold that does
       not open: the tap gesture on the same box still works, so the player is
       not stuck, and the row has not gone dead under them. */
    if (!canSpendPatch()) return;
    const gain = patchGain();
    const parts = [];
    if (gain.heals) parts.push('Reset HP to full');
    if (gain.wound) parts.push('Patch Wound');
    setText('patchGainNote', parts.join(' · '));

    const left = character.patches;
    /* The 2 AP is STATED here and deducted nowhere — see spendPatch() for why.
       "In combat" is the whole of the condition, and it is the table's to
       judge, so the line reads as a rule the player applies rather than a
       cost the app has quietly taken: the Action row above is where they take
       it off. Written as one sentence with the Patch count because both are
       the same kind of fact — what this costs, and what you have left. */
    setText('patchCost', `Costs 2 AP in combat — spend it on your Action row`);
    setText('patchRemaining', `${left} Patch${left === 1 ? '' : 'es'} remaining · restored on a Long Rest`);
    app.setAttribute('data-modal', 'patch');
  }

  /* Said once, and only when the Wound did not also down the character —
     the Downed notice carries the same sentence, and two windows in a row
     for one event is one window too many. */
  function announceBoonLoss() {
    if (!state.boonsLost) return;
    setText('boonLossText', boonLossNote());
    app.setAttribute('data-modal', 'boonloss');
  }

  function takePatch() {
    spendPatch();
    renderVitals();
    // Wounds feed Armor and Speed through woundPenalty(), so clearing one has
    // to repaint the combat block too — the same reason the Wound pips do.
    renderDerived();
    save();
    // Closing IS the confirmation, as with a rest: the bar refills and a box
    // empties behind the window as it goes.
    closeModal();
  }

  /* ------------------------------------------------------------------ */
  /* PORTRAIT — the character's face                                    */
  /* Behaviour only. The actual re-encoding lives in portrait.js, which  */
  /* is the ONE image engine the way dice.js is the one dice engine —   */
  /* every photo entering the app goes through compress().              */
  /* ------------------------------------------------------------------ */

  const portraitEngine = () => window.WAYPOINT_PORTRAIT || null;

  // Paint every surface that shows a face at once — hero, roster card and the
  // edit page's thumbnail all carry [data-portrait-img], so none of the three
  // screens has to know the other two exist.
  function renderPortrait() {
    const url = character.portrait;
    app.setAttribute('data-portrait', url ? 'set' : 'none');
    $$('[data-portrait-img]').forEach((img) => {
      if (url) {
        img.src = url;
        img.alt = `${character.name} — portrait`;
      } else {
        // Removed rather than blanked: an <img src=""> re-requests the page
        // itself in some browsers, which is a wasted round trip and a
        // console error for a state that is simply "no photo".
        img.removeAttribute('src');
        img.alt = '';
      }
    });
    applyPortraitView();
  }

  /* ---- framing ------------------------------------------------------
     The photo is stored once and never re-encoded. What a reposition edits is
     three numbers: a focal point (x, y — object-position percentages) and a
     zoom. The stylesheet turns those into object-position + transform-origin;
     see the [data-portrait-img] rule for why it takes both. */

  const ZOOM_MIN = 1;
  const ZOOM_MAX = 3;
  const VIEW_DEFAULT = { x: 50, y: 0, zoom: 1 };

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  // Every value that reaches the render path goes through here, so a corrupt
  // save, a stale value and a runaway drag all land in the same legal range.
  function clampView(v) {
    const num = (n, fallback) => (Number.isFinite(Number(n)) ? Number(n) : fallback);
    return {
      x: clamp(num(v && v.x, 50), 0, 100),
      y: clamp(num(v && v.y, 0), 0, 100),
      zoom: clamp(num(v && v.zoom, 1), ZOOM_MIN, ZOOM_MAX),
    };
  }

  // Writes the framing onto an element for its subtree to inherit. Custom
  // properties, deliberately: JS supplies three NUMBERS and the stylesheet
  // decides entirely what they do to a picture — which properties they drive,
  // and how. Re-skinning still means editing CSS alone. This is the one place
  // the rule against inline styles is bent, and only for continuous values
  // that a class name genuinely cannot carry.
  function writeView(el, v) {
    el.style.setProperty('--pv-x', `${v.x}%`);
    el.style.setProperty('--pv-y', `${v.y}%`);
    el.style.setProperty('--pv-zoom', String(v.zoom));
  }

  const applyPortraitView = () => writeView(app, character.portraitView);

  function setPortraitError(message) {
    setText('portraitError', message || '');
    $$('[data-portrait-error]').forEach((el) => { el.hidden = !message; });
  }

  const setPortraitBusy = (busy) => {
    if (busy) app.setAttribute('data-portrait-busy', '');
    else app.removeAttribute('data-portrait-busy');
  };

  // The single path from a chosen file to a stored portrait. Both entry points
  // — the hero's empty-state button and the Edit Character page — and the
  // desktop drag-and-drop all land here.
  async function acceptPortraitFile(file) {
    if (!file) return;
    const engine = portraitEngine();
    if (!engine) {
      // Same class of failure as a missing library.js, and worth being just as
      // loud about: without it the button does nothing for no visible reason.
      setPortraitError('The image engine did not load — check portrait.js.');
      console.error('Waypoint: portrait.js did not load.');
      return;
    }

    setPortraitError('');
    setPortraitBusy(true);
    try {
      const out = await engine.compress(file);
      character.portrait = out.dataUrl;
      // A new photo inherits nothing from the old one's framing — a focal
      // point chosen for a different picture is meaningless on this one.
      character.portraitView = { ...VIEW_DEFAULT };
      save();
      renderPortrait();
      // Reported only when it FAILS. A successful save is the expectation and
      // needs no announcement; a photo that will vanish on reload does.
      if (!savePortrait()) {
        setPortraitError('Shown for this session only — browser storage is full.');
      }
    } catch (err) {
      // compress() writes its own messages for a player to read, so they are
      // shown verbatim rather than being reworded into something vaguer here.
      setPortraitError(err && err.message ? err.message : 'That image could not be used.');
    } finally {
      setPortraitBusy(false);
    }
  }

  function removePortrait() {
    character.portrait = null;
    savePortrait();
    setPortraitError('');
    renderPortrait();
    // Reached from the portrait menu, whose remaining choices all now apply to
    // a photo that is gone. Closing is the only sensible end to the gesture.
    if (app.getAttribute('data-modal') === 'portrait') closeModal();
  }

  function openPortraitPicker() {
    const input = $('[data-portrait-input]');
    if (input) input.click();
    // The file dialog is the OS's, not ours, and it covers the app anyway —
    // leaving our own menu open behind it only means dismissing two things.
    if (app.getAttribute('data-modal') === 'portrait') closeModal();
  }

  // What tapping the picture does. With a photo there are three things you
  // might mean, so it asks; with none, two of the three are meaningless and
  // the third — pick a photo — is certainly what was meant, so it just does it.
  function openPortraitMenu() {
    if (!character.portrait) { openPortraitPicker(); return; }
    app.setAttribute('data-modal', 'portrait');
  }

  /* ------------------------------------------------------------------ */
  /* PORTRAIT REPOSITION — pan & zoom the framing, never the pixels      */
  /* ------------------------------------------------------------------ */

  const cropFrame = () => $('[data-crop-frame]');
  const cropImg   = () => $('[data-crop-img]');
  const cropZoom  = () => $('[data-crop-zoom]');

  // The working copy. Edits land here and only reach the character on Save,
  // which is what gives Cancel something to fall back to.
  let cropView = { ...VIEW_DEFAULT };

  const paintCrop = () => {
    writeView(cropFrame(), cropView);
    cropZoom().value = String(Math.round(cropView.zoom * 100));
  };

  /* How far the picture moves on screen for one percentage point of focal
     point, in px. Both properties that read the focal point contribute:

       object-position   slides the cover crop by (slack / 100) px, which the
                         zoom then magnifies — so (slack / 100) * zoom.
       transform-origin  moving the origin by d shifts scaled content by
                         d * (zoom - 1) — so (frame / 100) * (zoom - 1).

     Inverting the sum is what makes a drag track the finger exactly at any
     zoom. It is zero only when the photo already fits the frame in that axis
     AND is unzoomed — genuinely nothing to move, so the drag does nothing. */
  function panStep(axis) {
    const frame = cropFrame().getBoundingClientRect();
    const img = cropImg();
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    if (!natW || !natH) return 0;

    // object-fit: cover — the picture is scaled up until it covers both axes.
    const cover = Math.max(frame.width / natW, frame.height / natH);
    const box  = axis === 'x' ? frame.width : frame.height;
    const disp = axis === 'x' ? natW * cover : natH * cover;
    const slack = Math.max(0, disp - box);

    return (slack * cropView.zoom + box * (cropView.zoom - 1)) / 100;
  }

  // Move the picture by a pixel delta, expressed the way a finger moves it:
  // drag right and the picture goes right. The focal point moves the opposite
  // way, hence the negation.
  function panCrop(dxPx, dyPx) {
    const stepX = panStep('x');
    const stepY = panStep('y');
    if (stepX) cropView.x = clamp(cropView.x - dxPx / stepX, 0, 100);
    if (stepY) cropView.y = clamp(cropView.y - dyPx / stepY, 0, 100);
    paintCrop();
  }

  function setCropZoom(z) {
    cropView.zoom = clamp(z, ZOOM_MIN, ZOOM_MAX);
    // Re-clamped because zooming OUT can shrink the reachable range and strand
    // the focal point outside it, which would show a frame edge.
    cropView = clampView(cropView);
    paintCrop();
  }

  // Only reached from the portrait menu, which does not offer Reposition
  // without a photo — the guard stays as a guard, not as a route anyone takes.
  function openPortraitCrop() {
    if (!character.portrait) { openPortraitPicker(); return; }
    cropView = clampView(character.portraitView);
    cropImg().src = character.portrait;
    cropImg().alt = `${character.name} — repositioning`;
    app.setAttribute('data-modal', 'crop');
    paintCrop();
  }

  function saveCrop() {
    character.portraitView = clampView(cropView);
    applyPortraitView();
    save();
    closeModal();
  }

  function resetCrop() {
    cropView = { ...VIEW_DEFAULT };
    paintCrop();
  }

  /* ------------------------------------------------------------------ */
  /* EDIT CHARACTER — three tabs                                        */
  /* Dossier (bio, attributes, skills), Levels and Gear. The tab lives  */
  /* on .app as data-edit-tab and the stylesheet does the switching, so */
  /* nothing here shows or hides a page.                                */
  /*                                                                    */
  /* It is deliberately NOT the data-tab the sheet uses: leaving the    */
  /* editor resets data-tab to "action" (see the data-nav handler), so  */
  /* one shared attribute would let a choice made here decide which     */
  /* sheet tab you land on.                                             */
  /* ------------------------------------------------------------------ */

  const EDIT_TABS = ['dossier', 'levels', 'gear'];

  /* The chips are STATE, painted from the attribute rather than toggled in the
     click handler, so the strip cannot drift out of step with the page that is
     actually showing — the same reason .app carries data-edit-tab at all.
     [data-on] is .wiz-chip's own selected look, borrowed whole. */
  function renderEditTabs() {
    const now = app.getAttribute('data-edit-tab') || 'dossier';
    /* Scoped to the strip, NOT a bare [data-edit-tab]: .app carries this
       attribute too, as the state the stylesheet switches on, so an unscoped
       query paints the app root as though it were a chip — aria-selected and
       all. Same trap the click handler's `t === app` guard exists for, and the
       same rule behind it: the root is state, never a control. */
    $$('.edit-tabs [data-edit-tab]').forEach((chip) => {
      const on = chip.dataset.editTab === now;
      chip.toggleAttribute('data-on', on);
      // The attribute is for the stylesheet; this is for a screen reader.
      chip.setAttribute('aria-selected', String(on));
    });
  }

  function setEditTab(tab) {
    if (!EDIT_TABS.includes(tab)) return;
    app.setAttribute('data-edit-tab', tab);
    renderEditTabs();
  }

  const idField = (name) => $(`[data-id-${name}]`);

  // Fills the form from the character. Called on every entry to the screen so
  // an abandoned edit is discarded rather than lingering as a half-typed name
  // the next visit inherits. The picture is NOT part of this: a chosen photo
  // is stored the moment it is compressed, so Save has nothing left to commit
  // for it and the dirty check below deliberately ignores it.
  function renderEditForm() {
    idField('name').value = character.name;
    for (const key of BIO_FIELDS) idField(key).value = (character.bio && character.bio[key]) || '';
    idField('error').hidden = true;
    refreshBioSave();
    // Entering the screen lands on the dossier rather than wherever it was
    // left, for the same reason the form above is refilled: a screen resumed
    // mid-thought from a previous visit is a screen you have to re-read.
    setEditTab('dossier');
    renderEditAttrs();
  }

  /* ------------------------------------------------------------------ */
  /* EDIT CHARACTER — attributes                                        */
  /* ------------------------------------------------------------------ */

  /* Stacked one per line, name left and number right, rather than the sheet's
     two-up grid. The grid is for GLANCING — six numbers taken in at once, which
     is what a grid is good at. This is for CHANGING one, where what matters is
     that every row's stepper lands in the same place under the thumb, and a
     single column is the only arrangement that guarantees it.

     .attr-row is the creation wizard's row, reused rather than re-cut: it is
     already exactly this shape, and a second spelling of one control is how
     the two would come to look slightly different for no reason. */
  function renderEditAttrs() {
    const spent = attrPointsSpent();
    const max = attrPointsMax();

    fillList('editStats', character.stats.map((s) => `
      <div class="attr-row">
        <span class="attr-row__name">${esc(s.name)}</span>
        <button class="step-btn" data-edit-attr="${esc(s.name)}:-1"${s.value <= 0 ? ' disabled' : ''} aria-label="Lower ${esc(s.name)}">&minus;</button>
        <span class="attr-row__val">${s.value}</span>
        <button class="step-btn" data-edit-attr="${esc(s.name)}:1" aria-label="Raise ${esc(s.name)}">+</button>
      </div>`).join(''));

    setText('attrPoints', `${spent} / ${max}`);
    $$('[data-bind="attrPoints"]').forEach((el) => {
      el.classList.toggle('rule__count--over', spent > max);
    });

    /* Reported, never enforced — the same split the app already draws for
       skills, and for the same two reasons: a GM may hand out a point, and a
       sheet being rebuilt passes through illegal states on the way to a legal
       one. Being fought by the tool in either case would be worse than being
       told. (Hands are blocked instead, because two hands is physical rather
       than a matter of permission.)

       Which is why only the "−" is ever disabled: a negative attribute is not
       a rules disagreement, it is a number the derived stats cannot use. */
    const note = spent > max
      ? `${spent - max} point${spent - max === 1 ? '' : 's'} over budget.`
      : spent < max
        ? `${max - spent} point${max - spent === 1 ? '' : 's'} left to spend.`
        : '';
    $$('[data-bind="attrNote"]').forEach((el) => {
      el.textContent = note;
      el.hidden = !note;
      el.classList.toggle('note-line--warn', spent > max);
    });
  }

  /* One press, one point. Writes straight through to the character — there is
     no draft to commit, so the section has no Save of its own: the number on
     screen IS the stored number, which is the whole reason a stepper is the
     right control here and a text field would not be.

     renderDerived() rather than renderContent(): it already repaints the stat
     cards, the combat cells, the gear summary's To-Hit and every ability's
     damage expression, so raising Power moves all four with nothing here
     knowing they exist. */
  function stepAttr(spec) {
    const [name, delta] = String(spec).split(':');
    const stat = character.stats.find((s) => s.name === name);
    if (!stat) return;
    const next = stat.value + Number(delta);
    // Floored at zero and open-ended above — see the budget note in
    // renderEditAttrs() for why only one end of this is a real limit.
    if (next < 0) return;
    stat.value = next;
    renderEditAttrs();
    renderDerived();
    save();
  }

  // What the form would store if it were saved right now. Trimmed and capped
  // here rather than at save time, so the comparison below is between two
  // values of the same shape — otherwise trailing whitespace would read as an
  // unsaved edit that saving could never clear.
  function readBioForm() {
    return {
      name: idField('name').value.trim().slice(0, IDENTITY_MAX),
      bio: Object.fromEntries(
        BIO_FIELDS.map((k) => [k, idField(k).value.trim().slice(0, BIO_MAX)]),
      ),
    };
  }

  // Is there anything to save? Compared VALUE BY VALUE against the character
  // rather than tracked with a flag, so typing a change and typing it back
  // leaves the button quiet — a flag would insist there was still work to do.
  function bioDirty() {
    const form = readBioForm();
    if (form.name !== character.name) return true;
    return BIO_FIELDS.some((k) => form.bio[k] !== ((character.bio && character.bio[k]) || ''));
  }

  /* Save is the section's only state readout now that it no longer changes
     screen: pressable means "you have unsaved changes", inert means "this is
     what is stored". Disabled rather than merely styled — a button that cannot
     do anything must say so to the keyboard and to a screen reader too, not
     only to the eye. */
  function refreshBioSave() {
    const btn = $('[data-id-save]');
    if (btn) btn.disabled = !bioDirty();
  }

  function saveIdentity() {
    const form = readBioForm();
    // A name is the one required field — it is the hero's heading and the
    // roster's only label, so there is no sensible way to render its absence.
    // The bio fields are genuinely optional and may be cleared.
    if (!form.name) { idField('error').hidden = false; idField('name').focus(); return; }

    character.name = form.name;
    // Rebuilt whole rather than patched, so clearing a field actually clears
    // it — a bio with a key missing and a bio with the key blank must not be
    // two different states.
    character.bio = form.bio;

    idField('error').hidden = true;
    renderContent();     // hero caption, roster row and meta lines all follow
    renderPortrait();    // the alt text quotes the name, so it is restated too
    save();
    // Stays on the screen. The edit is confirmed by Save going inert, which
    // leaves you where you were rather than making a saved field impossible to
    // glance at without navigating back.
    refreshBioSave();
  }

  /* ------------------------------------------------------------------ */
  /* NOTES — a journal of many entries, not one page                    */
  /* Rows borrow the inventory ledger's flush, hairline-ruled look and  */
  /* the shared .collapse caret, so expanding a note works by the same  */
  /* data-toggle path as every other collapsible in the app.            */
  /* ------------------------------------------------------------------ */

  const noteById = (id) => character.notes.find((n) => n.id === id) || null;
  const noteHaystack = (n) => `${n.title}\n${n.body}`.toLowerCase();

  // Highlight the search term inside a note. The text is escaped PIECE BY
  // PIECE and the <mark> is added between the escaped pieces — escaping the
  // finished string instead would print the markup, and marking up the raw
  // string first would let a note's own angle brackets break out of it.
  function highlight(text, q) {
    if (!q) return esc(text);
    const hay = text.toLowerCase();
    const out = [];
    let from = 0;
    for (;;) {
      const at = hay.indexOf(q, from);
      if (at === -1) { out.push(esc(text.slice(from))); break; }
      out.push(esc(text.slice(from, at)));
      out.push(`<mark class="hit">${esc(text.slice(at, at + q.length))}</mark>`);
      from = at + q.length;
    }
    return out.join('');
  }

  // Collapsed, a note shows its title and the opening of its body, so a list
  // of them still reads as a journal rather than a row of filing tabs.
  const notePreview = (n) => n.body.replace(/\s+/g, ' ').trim().slice(0, 80);

  function noteRow(n) {
    const q = state.noteQuery;
    const open = !!state.open[n.id];
    const preview = notePreview(n);
    return `<div class="note-row${open ? ' is-open' : ''}" data-collapse="${esc(n.id)}">
      <button class="note-row__head" data-toggle="${esc(n.id)}">
        <span class="note-row__lines">
          <span class="note-row__title">${highlight(n.title, q)}</span>
          ${preview ? `<span class="note-row__preview">${highlight(preview, q)}</span>` : ''}
        </span>
        <span class="collapse__caret"></span>
      </button>
      <div class="note-row__body">
        ${n.body
          ? `<div class="note-row__text">${highlight(n.body, q)}</div>`
          : '<div class="note-row__text note-row__text--empty">No body written.</div>'}
        <div class="note-row__actions">
          <button class="icon-act icon-act--edit" data-note-edit="${esc(n.id)}" aria-label="Edit note">${PENCIL_SVG}</button>
          <button class="icon-act icon-act--delete" data-note-delete="${esc(n.id)}" aria-label="Delete note">${TRASH_SVG}</button>
        </div>
      </div>
    </div>`;
  }

  function renderNotes() {
    const q = state.noteQuery;
    const shown = q ? character.notes.filter((n) => noteHaystack(n).includes(q)) : character.notes;
    fillList('notes', shown.length
      ? shown.map(noteRow).join('')
      : `<div class="empty-note">${q
          ? 'No notes match that search.'
          : 'No notes yet — tap + to write one.'}</div>`);
  }

  // Searching opens what it finds. This marks the matches open rather than
  // forcing them open at render time, so the caret still collapses a hit on
  // the first tap — a row rendered open but recorded closed would eat it.
  function setNoteQuery(raw) {
    state.noteQuery = raw.trim().toLowerCase();
    if (state.noteQuery) {
      character.notes.forEach((n) => {
        if (noteHaystack(n).includes(state.noteQuery)) state.open[n.id] = true;
      });
    }
    renderNotes();
  }

  const noteField = (name) => $(`[data-note-${name}]`);

  // One composer serves both new notes and edits; `id` is what tells them
  // apart, exactly as state.editingId does for inventory items.
  function openNoteForm(id) {
    const n = id ? noteById(id) : null;
    state.noteEditing = n ? n.id : null;
    noteField('title').value = n ? n.title : '';
    noteField('body').value  = n ? n.body : '';
    noteField('error').hidden = true;
    noteField('form').hidden = false;
    noteField('title').focus();
  }

  function closeNoteForm() {
    state.noteEditing = null;
    noteField('form').hidden = true;
    noteField('error').hidden = true;
  }

  function saveNote() {
    const title = noteField('title').value.trim();
    // The body keeps its own whitespace — line breaks are how a session log
    // gets structure, so nothing here collapses or trims them.
    const body = noteField('body').value;
    if (!title) { noteField('error').hidden = false; return; }

    const existing = state.noteEditing && noteById(state.noteEditing);
    if (existing) {
      existing.title = title;
      existing.body = body;
    } else {
      const n = { id: `note-${Date.now()}`, title, body, created: Date.now() };
      character.notes.push(n);     // appended: newest sits at the bottom
      state.open[n.id] = true;     // you just wrote it, so it opens showing it
    }
    closeNoteForm();
    renderNotes();
    save();
  }

  function askDeleteNote(id) {
    const n = noteById(id);
    if (!n) return;
    state.noteDeleting = id;
    setText('noteDelTitle', n.title);
    app.setAttribute('data-modal', 'note-del');
  }

  function deleteNote() {
    const id = state.noteDeleting;
    state.noteDeleting = null;
    if (!id) return;
    character.notes = character.notes.filter((n) => n.id !== id);
    delete state.open[id];
    // The note being edited could be the one just deleted — saving after that
    // would resurrect it, so the composer closes with it.
    if (state.noteEditing === id) closeNoteForm();
    renderNotes();
    save();
    closeModal();
  }

  /* ---- backpack: one item at a time ------------------------------- */

  function renderBackpack() {
    const items = character.inventory;
    if (!items.length) {
      fillList('backpack', '<div class="empty-note">Nothing carried yet.</div>');
      setText('bpPos', '');
      return;
    }
    // Paging wraps, so neither arrow is ever a dead control on a short list.
    state.bpIndex = ((state.bpIndex % items.length) + items.length) % items.length;
    fillList('backpack', bpCard(items[state.bpIndex]));
    setText('bpPos', `${state.bpIndex + 1} of ${items.length}`);
  }

  // Opening from the ledger lands on the item that was tapped, not the top of
  // a list — the tap already said which item was wanted.
  function openBackpack(focusId) {
    const at = character.inventory.findIndex((i) => i.id === focusId);
    if (at >= 0) state.bpIndex = at;
    app.setAttribute('data-modal', 'backpack');
    renderBackpack();
  }

  function stepBackpack(delta) {
    if (!character.inventory.length) return;
    state.bpIndex += delta;
    renderBackpack();
  }

  /* ---- the modifier picker ---------------------------------------- */

  const pickerEl = (i) => $(`[data-mod-picker="${i}"]`);

  // Cell height is read back from the DOM instead of being duplicated as a
  // constant here, so restyling .picker__cell in CSS cannot silently break the
  // arithmetic that turns scroll position into a number.
  function cellHeight(el) {
    const cell = $('.picker__cell', el);
    return (cell && cell.offsetHeight) || 26;
  }

  // Which value is sitting under the band right now.
  function pickerValue(el) {
    const idx = Math.round(el.scrollTop / cellHeight(el));
    return clampMod(MOD_MAX - idx);
  }

  // Reflect the live value: highlight the centred cell, and keep the
  // spinbutton's ARIA honest for anyone who isn't looking at the screen.
  function markPicker(el, value) {
    el.setAttribute('aria-valuenow', value);
    el.setAttribute('aria-valuetext', modLabel(value));
    $$('.picker__cell', el).forEach((c) => {
      c.classList.toggle('is-selected', Number(c.dataset.v) === value);
    });
  }

  function centerPicker(i, value, smooth) {
    const el = pickerEl(i);
    if (!el) return;
    el.scrollTo({
      top: (MOD_MAX - value) * cellHeight(el),
      behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto',
    });
    markPicker(el, value);
  }

  // Rows are repainted wholesale, so listeners are attached fresh each time —
  // the elements they were bound to are gone.
  function wirePickers() {
    state.itemMods.forEach((mod, i) => {
      const el = pickerEl(i);
      if (!el) return;

      el.addEventListener('scroll', () => {
        const v = pickerValue(el);
        if (v === state.itemMods[i].value) return;   // same value, nothing to repaint
        state.itemMods[i].value = v;
        markPicker(el, v);
      });

      // Keyboard equivalent of scrolling, per the spinbutton pattern.
      el.addEventListener('keydown', (e) => {
        const step = { ArrowUp: 1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[e.key];
        let next = null;
        if (step !== undefined) next = state.itemMods[i].value + step;
        else if (e.key === 'Home') next = MOD_MIN;
        else if (e.key === 'End')  next = MOD_MAX;
        if (next === null) return;
        e.preventDefault();
        next = clampMod(next);
        state.itemMods[i].value = next;
        centerPicker(i, next, true);
      });
    });
  }

  // Painting the rows leaves every picker scrolled to the top, so each one is
  // scrolled to its own value afterwards. This only works while the form is
  // actually visible — a hidden element has no scroll height to move through.
  // Offering "Add Modifier" while a row still has no attribute chosen just
  // lets empty rows stack up, so it waits until every row is answered.
  function refreshModAdd() {
    const add = $('[data-mod-add]');
    if (add) add.hidden = state.itemMods.some((m) => !m.stat);
  }

  function renderItemMods() {
    fillList('itemMods', state.itemMods.map(modRow).join(''));
    state.itemMods.forEach((mod, i) => centerPicker(i, mod.value, false));
    wirePickers();
    refreshModAdd();
  }

  /* ---- add / edit form -------------------------------------------- */
  const itemName  = () => $('[data-item-name]');
  const itemDesc  = () => $('[data-item-desc]');
  const itemError = () => $('[data-item-error]');

  // `id` null means a new item. `returnTo` remembers that the form was opened
  // from the backpack, so closing it lands back there instead of on the sheet.
  function openItemModal(id, returnTo) {
    const item = id ? character.inventory.find((i) => i.id === id) : null;
    state.editingId  = item ? item.id : null;
    state.itemReturn = returnTo || null;
    // Copied, not referenced: cancelling has to leave the real item untouched.
    state.itemMods = item && Array.isArray(item.mods)
      ? item.mods.map((m) => ({ stat: m.stat, value: m.value }))
      : [];

    setText('itemHeading', item ? 'Edit Item' : 'New Item');
    itemName().value = item ? item.title : '';
    itemDesc().value = item && item.desc ? item.desc : '';   // desc is optional
    itemError().hidden = true;

    // Shown before the rows are painted: the pickers need real layout to scroll.
    app.setAttribute('data-modal', 'item');
    renderItemMods();
    itemName().focus();
    itemName().select();
  }

  function saveItem() {
    const title = itemName().value.trim();
    // A name is the one required field; description and modifiers are optional.
    if (!title) { itemError().hidden = false; itemName().focus(); return; }
    const desc = itemDesc().value.trim();
    // A row with no attribute chosen, or a value of 0, isn't a modifier.
    const mods = state.itemMods
      .filter((m) => m.stat && m.value)
      .map((m) => ({ stat: m.stat, value: clampMod(m.value) }));

    const existing = state.editingId && character.inventory.find((i) => i.id === state.editingId);
    if (existing) { existing.title = title; existing.desc = desc; existing.mods = mods; }
    else character.inventory.push({ id: `inv-${Date.now()}`, title, desc, mods });

    renderInventory();
    renderDerived();
    save();
    closeModal();   // returns to the backpack when that is where it opened from
  }

  function removeInvItem(id) {
    character.inventory = character.inventory.filter((i) => i.id !== id);
    if (state.bpIndex >= character.inventory.length) state.bpIndex = 0;
    renderInventory();
    renderDerived();     // whatever it was modifying goes back to base
    renderBackpack();
    save();
  }

  /* ------------------------------------------------------------------ */
  /* BOONS & CONDITIONS — tracker + picker                              */
  /* ------------------------------------------------------------------ */

  // The "+" tile is emitted as the list's final child rather than living in
  // index.html, so it always trails the rows however many there are — and it
  // is still there when there are none.
  function renderEffects() {
    const clear = $('[data-effects-clear]');
    // Nothing to clear on an empty list, and a control that does nothing is
    // a control that teaches the player to distrust the others.
    if (clear) clear.hidden = character.effects.length === 0;
    const rows = character.effects.map(effectRow).join('');
    fillList('effects', `${rows}<button class="effect-add" data-effect-open aria-label="Add a boon or condition"><svg class="plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg></button>`);
  }

  function openEffectPicker() { app.setAttribute('data-modal', 'effects'); }

  /* ------------------------------------------------------------------ */
  /* SKILLS — the list, the budget readout, and the picker              */
  /* ------------------------------------------------------------------ */

  /* Both lists of the character's skills — the sheet's and the Edit Character
     page's — plus the budget under each. One function because they are two
     views of one list: painting them apart is how they would come to disagree.

     Sorted by category, then by the order the library lists them in, so the
     sheet reads in the same order the editor offers — a player who took
     Gymnast under Body finds it under Body there too. */
  function renderSkills() {
    const order = (entry) => {
      const k = skillOf(entry.id);
      return k ? SKILL_CATEGORIES.indexOf(k.category) : SKILL_CATEGORIES.length;
    };
    const rows = [...character.skills].sort((a, b) => order(a) - order(b));
    fillList('skills', rows.map(skillRow).join(''));
    fillList('editSkills', rows.length
      ? rows.map(skillLine).join('')
      : '<div class="empty-note">No skills yet. Every character starts with four.</div>');

    renderSkillBudget();
  }

  /* The budget is REPORTED, never enforced — the same split the app already
     draws for gear, where hand capacity is physical so it is blocked and
     training is a rules permission so it is only marked. Skill points are a
     permission: a GM may hand out an extra one, and a player rebuilding a
     sheet passes through illegal states on the way to a legal one. Being
     fought by the tool in either case would be worse than being told. */
  function renderSkillBudget() {
    const spent = skillPointsSpent();
    const max = skillPointsMax();
    setText('skillPoints', `${spent} / ${max}`);
    // Every match, not the first: the same bind is painted on the sheet and on
    // the Edit Character page, and setText() has always written to all of them.
    $$('[data-bind="skillPoints"]').forEach((el) => {
      el.classList.toggle('rule__count--over', spent > max);
    });

    /* "+ Add Skill" appears in both lists only while there is something to
       spend, and vanishes the moment there is not — a permanent add button
       would promise a spend the budget cannot pay for. It opens the same
       editor the pen does; the box is the invitation, not a second editor. */
    $$('[data-skill-room]').forEach((el) => { el.hidden = spent >= max; });

    // Stated in words rather than left to the colour alone, because "you have
    // spent more points than you have" and "your four creation points are not
    // on four separate skills" are different problems with the same fix.
    const notes = [];
    if (spent > max) notes.push(`${spent - max} point${spent - max === 1 ? '' : 's'} over budget.`);
    else if (spent < max) notes.push(`${max - spent} point${max - spent === 1 ? '' : 's'} left to spend.`);
    if (!skillSpreadOk()) notes.push('Character creation puts its first four points on four separate skills.');
    $$('[data-bind="skillNote"]').forEach((warn) => {
      warn.textContent = notes.join(' ');
      warn.hidden = !notes.length;
      warn.classList.toggle('note-line--warn', spent > max || !skillSpreadOk());
    });
  }

  /* ---- the skill editor ----------------------------------------------
     The ONE place a rank changes. Reached from the pen in Edit Character's
     Skills header, or from either list's "+ Add Skill" box.

     It works on a DRAFT, not on the character: cancelling has to leave the
     sheet exactly as it was, and the four-skill rule can only be judged on a
     finished spread — a player swapping one skill for another passes through
     three skills on the way, which is not an illegal character, just an
     unfinished thought. Same shape as the creation wizard's `d.skills`, and
     for the same reason.

     Ranks are stepped rather than tapped in because a level-up may stack a
     point onto a skill already taken; creation's tap-to-toggle could only ever
     express one point each. */
  function openSkillEditor() {
    state.skillEdit = Object.fromEntries(character.skills.map((k) => [k.id, k.rank]));
    // Opened fresh every time: a filter left on Study last session would open
    // the editor apparently missing twenty-two skills.
    state.skillFilter = 'all';
    renderSkillEditor();
    app.setAttribute('data-modal', 'skill-edit');
  }

  // The draft as the character would store it: rank 0 is not a state a
  // character can be in — it means the skill was never taken — so it leaves
  // rather than becoming a +0 row. Same reason an effect at 0 stacks is dropped.
  const draftSkills = () => Object.entries(state.skillEdit || {})
    .filter(([, rank]) => rank > 0)
    .map(([id, rank]) => ({ id, rank }));

  /* "<id>:<delta>" — ids are `kind.slug`, so ":" is an unambiguous split.
     The budget CEILING is enforced here, because there is no legitimate reason
     to place a point you do not have. The four-skill FLOOR is not: it is
     checked at save, so a swap is not a deadlock when every point is spent. */
  function bumpDraftSkill(spec) {
    if (!state.skillEdit) return;
    const at = spec.indexOf(':');
    const id = spec.slice(0, at);
    const delta = Number(spec.slice(at + 1));
    if (!skillOf(id) || !delta) return;

    const spent = draftSkills().reduce((n, k) => n + k.rank, 0);
    if (delta > 0 && spent >= skillPointsMax()) return;

    const rank = (state.skillEdit[id] || 0) + delta;
    if (rank > 0) state.skillEdit[id] = rank;
    else delete state.skillEdit[id];
    renderSkillEditor();
  }

  function renderSkillEditor() {
    const draft = state.skillEdit;
    if (!draft) return;
    const skills = draftSkills();
    const spent = skills.reduce((n, k) => n + k.rank, 0);
    const max = skillPointsMax();
    const left = max - spent;
    const spread = spreadOk(skills);
    const savable = spread && spent <= max;

    // The wizard's budget line, states and all: this is the same question its
    // skills step asks, so it should not look like a different one.
    setBudget('skillEditBudget',
      `${spent} of ${max} placed · ${skills.length} skill${skills.length === 1 ? '' : 's'}`,
      spent > max ? 'over' : savable ? 'ready' : 'open',
      left > 0 ? `${left} left` : '');

    /* Why Save is unavailable, in words. A greyed button with no reason is a
       dead end, which is the same argument whyBlocked() makes for the wizard's
       Next. Unspent points are NOT a blocker — they are reported and allowed,
       because a player who has not decided yet still has a legal character. */
    const note = !spread
      ? `Four different skills is the minimum — you have ${skills.length}.`
      : spent > max ? `${spent - max} point${spent - max === 1 ? '' : 's'} over budget.`
      : left > 0 ? `${left} point${left === 1 ? '' : 's'} still to place. Saving now keeps ${left === 1 ? 'it' : 'them'} for later.`
      : '';
    const noteEl = $('[data-bind="skillEditNote"]');
    if (noteEl) {
      noteEl.textContent = note;
      noteEl.hidden = !note;
      noteEl.classList.toggle('note-line--warn', !savable);
    }

    /* Category filter. 'all' is a sentinel rather than an empty string, so the
       delegated handler can read it off the dataset without an empty value
       looking like no value at all.

       The chips are the gear picker's, class and behaviour both — one look for
       "narrow this list" wherever the app offers it, rather than a second that
       would drift from the first. */
    const filter = state.skillFilter || 'all';
    fillList('skillFilter', [{ id: 'all', label: 'All' }]
      .concat(SKILL_CATEGORIES.map((cat) => ({ id: cat, label: cat })))
      .map((c) => `<button class="wiz-chip" data-skill-filter="${esc(c.id)}"${
        filter === c.id ? ' data-on' : ''}>${esc(c.label)}</button>`)
      .join(''));

    // The budget above still counts every skill, filtered or not: the filter
    // narrows what you are LOOKING at and nothing about what you have spent.
    fillList('skillEditList', SKILL_CATEGORIES
      .filter((cat) => filter === 'all' || cat === filter)
      .map((cat) => {
        const inCat = [...SKILLS.values()].filter((k) => k.category === cat);
        if (!inCat.length) return '';
        return `<div class="effect-picker__group">${esc(cat)}</div>`
          + inCat.map((k) => skillEditRow(k, draft[k.id] || 0, left)).join('');
      }).join(''));

    const saveBtn = $('[data-skill-save]');
    if (saveBtn) saveBtn.disabled = !savable;
  }

  /* Checked again here rather than trusting the disabled button: the button is
     a hint about the rule, this is the rule. */
  function saveSkillEdit() {
    const skills = draftSkills();
    const spent = skills.reduce((n, k) => n + k.rank, 0);
    if (!spreadOk(skills) || spent > skillPointsMax()) return;
    character.skills = skills;
    state.skillEdit = null;
    closeModal();
    renderSkills();
    save();
  }

  /* ---- gear detail & picker ------------------------------------------
     One detail window and one picker serve both slots. `state.slot` records
     which is being worked on, and for hands, `state.slotIndex` records WHICH
     hand — so "Change" replaces that item rather than appending beside it. */
  function openDetail(target) {
    const [slot, idxStr] = target.split(':');
    state.slot = slot;
    state.slotIndex = idxStr === undefined ? null : Number(idxStr);
    const held = slot === 'armor' ? null : character.hands[state.slotIndex];
    const g = slot === 'armor' ? wornArmor() : itemOf(held?.id);
    if (!g) return;
    setText('detailTitle', g.name);
    fillList('detailBody', detailLines(g).map(([k, v]) =>
      `<div class="detail-line"><span class="detail-line__key">${esc(k)}</span>` +
      `<span class="detail-line__val">${esc(v)}</span></div>`).join(''));
    fillList('detailTags', tagChips(g, held));
    // Named after the thing on screen, so a screen reader announces "Remove
    // Light Armor" rather than a bare "Remove". Written here rather than in
    // the markup because the window is shared by armour and by whatever is in
    // hand, and only this function knows which one is open.
    const drop = $('[data-detail-remove]');
    if (drop) {
      drop.innerHTML = TRASH_SVG;
      drop.setAttribute('aria-label', `Remove ${g.name}`);
    }
    // Wearing something you are not trained in is legal but worth saying once,
    // where the character can actually see it.
    const warn = $('[data-detail-warn]');
    if (warn) {
      // Armour and weapons alike are checked on the item's `prof` string —
      // `armorWorn` is an id now, and an id never appears in a class's
      // proficiency list.
      const trained = slot === 'armor'
        ? proficiencies('armorTypes').includes(g.prof)
        : isTrained(g);
      warn.hidden = trained;
    }
    app.setAttribute('data-modal', 'detail');
  }

  /* ---- weaponTags -----------------------------------------------------
     A weapon category offers a MENU of tags and a given weapon may carry at
     most one of them, so these are radio buttons rather than checkboxes —
     pressing the tag already chosen clears it, which is the only way to get
     back to an untagged weapon and is a state worth being able to reach.

     What each tag DOES is in the player's guide, not here. The app enforces
     the "at most one" rule and records the choice; it does not restate the
     rules text, because a copy of it here would be a second source of truth
     for something this file has no business owning. */
  function tagChips(g, held) {
    if (!g.weaponTags || !g.weaponTags.length || !held) return '';
    const chips = g.weaponTags.map((t) => {
      const on = held.tag === t;
      return `<button class="tag-pick${on ? ' is-on' : ''}" data-tag="${esc(t)}"` +
        `${on ? ' aria-pressed="true"' : ' aria-pressed="false"'}>${esc(t)}</button>`;
    }).join('');
    return `<div class="tag-picks"><div class="tag-picks__label">Weapon Tag</div>` +
      `<div class="tag-picks__row">${chips}</div></div>`;
  }

  // Choosing the tag already on the weapon clears it — see tagChips().
  function chooseTag(tag) {
    const held = character.hands[state.slotIndex];
    if (!held) return;
    if (held.tag === tag) delete held.tag;
    else held.tag = tag;
    const g = itemOf(held.id);
    fillList('detailTags', tagChips(g, held));
    renderGear();
    save();
  }

  // The one line a picker row gets to make its case with. A weapon leads with
  // its damage, a shield with what it defends, and a focus — which has neither
  // — falls back to the rules text that IS its whole reason to exist.
  function pickNote(g) {
    if (g.type === 'Shield') {
      return `Armor ${modLabel(g.armorMod)} · Evasion ${modLabel(g.evasionMod)}`;
    }
    if (g.damage) {
      const reach = g.range ? `Range ${g.range}` : `Threat ${g.threat}`;
      return `${g.damage} damage · ${reach}`;
    }
    return g.desc || '';
  }

  // `replacing` distinguishes Change from Add: it frees the slot's own hands so
  // a 2H weapon can be swapped for another 2H weapon.
  function openPicker(slot, replacing = null) {
    state.slot = slot;
    state.slotIndex = replacing;
    // Only what this character is TRAINED with. Using gear untrained is legal
    // by the rules, and a character who already holds some keeps it — the load
    // path does not drop it and the detail window still says so. But the
    // picker is where a loadout is chosen, and offering every item in the game
    // to every class made the list mostly noise.
    const rows = slot === 'armor'
      ? ARMOR.filter((a) => proficiencies('armorTypes').includes(a.prof))
          .map((a) => pickRow(a.id, {
            label: a.name,
            note: armorSummary(a),
            on: character.armorWorn === a.id,
            blocked: false,                      // armour costs no hands
          }))
      : WEAPONS.filter((g) => isTrained(g))
          .map((g) => pickRow(g.id, {
            label: g.name,
            note: pickNote(g),
            on: false,
            blocked: !canEquip(g.id, replacing),
          }));
    setText('pickTitle', slot === 'armor' ? 'Armor' : 'Gear');
    // An empty list is a real answer for a subclass trained in nothing, and it
    // has to say so rather than opening as a blank sheet.
    fillList('picker', rows.join('') || `<div class="empty-note">Your class is not trained with any ${slot === 'armor' ? 'armour' : 'weapons or shields'}.</div>`);
    app.setAttribute('data-modal', 'pick');
  }

  function equipPick(id) {
    if (state.slot === 'armor') {
      const a = itemOf(id);
      if (!a || a.type !== 'Armor') return;
      character.armorWorn = id;
    } else {
      if (!canEquip(id, state.slotIndex)) return;   // guard behind the disabled attr
      // A fresh entry carries no tag. Swapping the weapon drops whatever tag
      // the old one had rather than carrying it across — the tag belonged to
      // that weapon, and the replacement may not even offer it.
      const entry = { id };
      if (state.slotIndex === null) character.hands.push(entry);
      else character.hands.splice(state.slotIndex, 1, entry);
    }
    afterGearChange();
  }

  function removeSlot() {
    if (state.slot === 'armor') character.armorWorn = null;
    else if (state.slotIndex !== null) character.hands.splice(state.slotIndex, 1);
    afterGearChange();
  }

  function afterGearChange() {
    state.slot = null;
    state.slotIndex = null;
    renderGear();
    renderDerived();   // Evasion / Armor / Speed and the summary all follow
    save();
    closeModal();
  }

  // Paint bars / numbers / pips — called whenever vitals change.
  function renderVitals() {
    setText('healthCur', character.health);
    setText('healthMax', healthMax());
    setText('manaCur',   character.mana);
    setText('manaMax',   manaMax());

    renderCells('health', character.health, healthMax());
    renderCells('mana',   character.mana,   manaMax());
    renderWounds();
    renderPatches();
  }

  function renderCells(resource, cur, max) {
    const track = $(`[data-cells="${resource}"]`);
    if (!track) return;
    let html = '';
    for (let i = 0; i < max; i++) html += `<span class="cell${i < cur ? ' is-on' : ''}"></span>`;
    track.innerHTML = html;
  }

  /* What a TAKEN wound puts in the box: a cracked heart. Like PATCH_ICON it
     carries no stroke, fill or size — .pip svg in sheet.css sets all three, so
     the glyph inherits the filled pip's colour.

     An untaken wound stays empty on purpose. The pips are a tally read as a
     row: an outline in every box would make the row uniform and force the
     count to be worked out rather than seen, where a run of filled boxes
     against empty ones is legible without counting at all. */
  const WOUND_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
    + '<path d="M12.409 5.824c-.702.792-1.15 1.496-1.415 2.166l2.153 2.156a.5.5 0 0 1 0 .707l-2.293 2.293a.5.5 0 0 0 0 .707L12 15"/>'
    + '<path d="M13.508 20.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5a5.5 5.5 0 0 1 9.591-3.677.6.6 0 0 0 .818.001A5.5 5.5 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5z"/></svg>';

  function renderWounds() {
    const el = $('[data-cells="wounds"]');
    if (!el) return;
    let html = '';
    for (let i = 0; i < woundsMax(); i++) {
      const on = i < character.wounds;
      html += `<span class="pip${on ? ' is-on' : ''}" data-wound="${i}">${on ? WOUND_ICON : ''}</span>`;
    }
    el.innerHTML = html;
    // The reset is only meaningful once a wound is marked, so it greys out at
    // zero. aria-disabled rather than the native `disabled`: clearing the last
    // wound is what disables the button, and a natively disabled element drops
    // out of the tab order under the keyboard focus that just pressed it. This
    // way focus survives its own click; the handler ignores the press instead.
    const reset = $('[data-wound-reset]');
    if (reset) reset.setAttribute('aria-disabled', character.wounds === 0 ? 'true' : 'false');
  }

  /* What goes INSIDE the tally box: a heart with a plus, the thing the tally
     is counting. Carries no stroke, fill or size of its own — .patch svg in
     sheet.css sets all three, so the glyph inherits the box's colour and flips
     with it between the spent and available states.

     An earlier pass here was a drawn med-kit case that at 22px was mostly
     border and put a frame inside the box's own frame. This one earns the
     detail back by being lighter: the heart is a single open outline rather
     than a closed body, so the box's own border stays the only frame. */
  const PATCH_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
    + '<path d="m14.479 19.374-.971.939a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5a5.2 5.2 0 0 1-.219 1.49"/>'
    + '<path d="M15 15h6"/><path d="M18 12v6"/></svg>';

  /* Boxes for the Patches the character still holds, faint outlines for the
     ones spent — the max stays visible at a glance, the way the Wound pips and
     the health cells do. The boxes carry no state of their own: they are
     redrawn from character.patches on every render, so nothing can go stale.

     Nothing here is ever disabled. Every box is always tappable because a tap
     is only bookkeeping, which stays true at full health, at zero Patches and
     while Downed — a player can always correct a count. The state that CAN be
     unavailable is the held gesture, and openPatch() answers that for itself
     rather than having the row paint a disabled look over a control that
     still works. Spent boxes read grey because they are empty stock, not
     because they are switched off. */
  function renderPatches() {
    const el = $('[data-cells="patches"]');
    if (!el) return;
    const max = patchesMax();
    let html = '';
    for (let i = 0; i < max; i++) {
      const on = i < character.patches;
      /* A real <button> per box, where the Wound pips are spans. Same look and
         the same tap, but reachable by keyboard — the pips predate that being
         easy and are the thing that should move, not the pattern to copy. The
         label is spelled out per box because "3" alone tells a screen-reader
         user nothing about what pressing it will do. */
      html += `<button class="patch${on ? ' is-on' : ''}" data-patch="${i}"`
        + ` aria-label="Set Patches to ${i + 1}${on && i + 1 === character.patches ? ', or tap again for ' + i : ''}">`
        + `${PATCH_ICON}</button>`;
    }
    el.innerHTML = html;

    // A character with no subclass yet has no Patches to show, and an empty
    // row with a label above it reads as something broken rather than as
    // something not yet chosen.
    const block = el.closest('.patches');
    if (block) block.hidden = max === 0;
  }

  /* ------------------------------------------------------------------ */
  /* MODAL (heal / damage calculator)                                   */
  /* ------------------------------------------------------------------ */
  const calcInput = () => $('[data-calc-input]');

  /* The two verbs, per resource. Health is HEALED and DAMAGED; Mana is
     RESTORED and SPENT — you do not wound a mana pool, you pay out of it, and
     a button that says "Damage" over a spell's cost describes the wrong event.
     The data-calc-apply hooks stay 'heal' and 'damage' underneath: those name
     the direction the number moves, which is the same either way, and it is
     the LABEL that is resource-specific, not the behaviour. */
  const CALC_VERBS = {
    health: { up: 'Heal',    down: 'Damage' },
    mana:   { up: 'Restore', down: 'Spend'  },
  };

  function openCalc(resource) {
    state.calcResource = resource;
    const verbs = CALC_VERBS[resource] || CALC_VERBS.health;
    setText('calcHeal', verbs.up);
    setText('calcDamage', verbs.down);
    // Read by the stylesheet, which recolours the restore button to match the
    // bar being edited — appearance stays entirely in CSS, as ever.
    const card = $('.modal--calc .modal__card');
    if (card) card.setAttribute('data-resource', resource === 'mana' ? 'mana' : 'health');
    setText('calcTitle', resource === 'mana' ? 'Mana' : 'Health');
    setText('calcCur', resource === 'mana' ? character.mana : character.health);
    setText('calcMax', resource === 'mana' ? manaMax() : healthMax());
    calcInput().value = '0';
    // Same reset as showRoll's, and the same reason: the choice belongs to the
    // healing in front of you, not to the last one.
    state.applyPoison = false;
    paintCalcPoison();
    app.setAttribute('data-modal', 'calc');
    calcInput().focus();
    calcInput().select();
  }

  /* The calculator's copy of the Poison control. Health only — Mana is spent
     and restored rather than healed, so Poison has nothing to say about it —
     and only when the character actually has stacks.

     Unlike the roll card's, this one has no "settled" to wait for: there are
     no dice here, just a number you typed. */
  function paintCalcPoison() {
    const el = $('.modal--calc [data-poison-toggle]');
    if (!el) return;
    const on = state.calcResource !== 'mana' && poisonOffered();
    el.hidden = !on;
    if (!on) return;
    el.setAttribute('aria-pressed', String(state.applyPoison));
    setText('calcPoisonLabel', `Apply my Poison (${poisonHealPenalty()})`);
  }
  /* ---- downed ------------------------------------------------------
     Announced by the damage cascade when the last Wound lands. Nothing here
     changes the character — damage() has already applied it — so this is a
     notice, not a confirmation. */
  // Wound counts are small and subclass-capped, so the two irregular endings
  // that can actually show up (1st, 2nd, 3rd) are worth spelling out rather
  // than reading "your 3 Wound is taken".
  function ordinal(n) {
    const tens = n % 100;
    if (tens >= 11 && tens <= 13) return `${n}th`;
    return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
  }

  function openDowned() {
    setText('downedWounds', ordinal(character.wounds));
    setText('downedBoons', boonLossNote());
    app.setAttribute('data-modal', 'downed');
  }

  /* What the last Wound took, as a sentence, or an empty string when it took
     nothing. Empty rather than "0 Boons lost" because a character carrying
     none should see no line about Boons at all — :empty collapses it. */
  const boonLossNote = () => (state.boonsLost
    ? `Taking the Wound cleared ${state.boonsLost} Boon${state.boonsLost === 1 ? '' : 's'}.`
    : '');

  /* ---- effect ticks --------------------------------------------------
     Built like the Patch dialog, because it is the same kind of decision: one
     thing that moves a bar, stated before you commit to it. The confirm is
     what makes the button safe to sit on a row you also step up and down —
     a mis-tap that silently took 4 damage would be worse than no button. */
  function openTick(id) {
    const def = effectById(id);
    const stacks = stacksOf(id);
    if (!def || !def.tick || !stacks) return;
    state.tickFor = id;
    const per = def.tick.heal || def.tick.damage || 0;
    const total = per * stacks;
    const verb = def.tick.heal ? 'Heal' : 'Take';
    setText('tickTitle', def.name);
    setText('tickAction', `${verb} ${total}`);
    /* Spells out the arithmetic rather than just the answer — "2 × 1 per
       stack" — so a player can see the number is right without recounting
       the row above. At one stack there is nothing to show working for. */
    setText('tickNote', stacks > 1
      ? `${stacks} stacks × ${per} ${def.tick.heal ? 'HP' : 'damage'} each`
      : def.effect);
    app.setAttribute('data-modal', 'tick');
  }

  function takeTick() {
    const id = state.tickFor;
    if (!id) return;
    const { downed } = applyTick(id);
    // closeModal() first, for openDowned()'s sake — see the calculator.
    closeModal();
    renderVitals(); renderDerived(); save();
    if (downed) openDowned();
  }

  /* Everything off. The end of a skirmish is the player's call — they know
     when the fight ended — so this is a control rather than something the app
     infers. Both rests do it too; this is for a fight you walk away from
     without stopping to rest. */
  function clearAllEffects() {
    if (!character.effects.length) return;
    clearEffects();
    renderEffects(); renderVitals(); renderDerived(); save();
  }

  function closeModal() {
    cancelTumble();
    state.editingId = null;
    // Dismissing the confirmation IS declining the delete — leaving the id set
    // would arm the next confirm button press against a character nobody was
    // looking at.
    state.charDeleting = null;
    // Same reasoning for the creation slot picker: while this is set, every
    // data-pick row is routed into the draft rather than the live character.
    state.wizPick = null;
    // And for the share window. Nothing outside it can act on this, but
    // leaving it set would mean the next open briefly renders the last
    // character shared before openShare() overwrites it.
    state.share = null;
    // Same reasoning: while this is set, the confirm button is armed against
    // an effect the player may no longer be looking at.
    state.tickFor = null;
    // Dismissing the skill editor IS cancelling it — the draft has never
    // touched the character, and keeping it would make the next open resume an
    // edit the player walked away from.
    state.skillEdit = null;
    // Dismissing the add/overwrite question IS declining the import — nothing
    // has been written at the point it is asked, so there is nothing to undo
    // and nothing that should survive to arm the next press.
    state.ask = null;
    /* A compendium was installed and the window reporting it has just been
       dismissed. The reload is deferred to here rather than run at the install
       so the player gets to read what happened first; see showImportResult().
       Everything is already in localStorage, so this loses nothing.

       Last, and it returns: nothing below it would be observed anyway. */
    if (state.reloadOnClose) {
      state.reloadOnClose = false;
      location.reload();
      return;
    }
    // Editing reached from the backpack goes back to the backpack — cancelling
    // or saving shouldn't dump the player out to the sheet.
    if (state.itemReturn === 'backpack') {
      state.itemReturn = null;
      openBackpack();
      return;
    }
    app.setAttribute('data-modal', 'closed');
    state.calcResource = null;
  }
  const closeCalc = closeModal;
  function bumpCalc(delta) {
    const el = calcInput();
    el.value = String(Math.max(0, (parseInt(el.value, 10) || 0) + delta));
  }

  /* ------------------------------------------------------------------ */
  /* DICE ROLLER                                                        */
  /* Expression is held as a token array (so backspace removes a whole  */
  /* "d20", not one character). Evaluation is a hand-written recursive- */
  /* descent parser — never eval() — supporting NdM, + - × ÷ and ().    */
  /* ------------------------------------------------------------------ */
  const dice = {
    tokens: [],       // e.g. ['2','d6','+','3']
    justRolled: false,
    holdTimer: null,  // the delete key's hold-to-clear timer, while held
    heldClear: false, // that hold fired; swallow the click the release makes
  };

  /* The parser itself lives in resources/js/dice.js, because the content
     converter needs the SAME engine to validate every dice column in the
     spreadsheets — a second implementation here is exactly the drift that
     rule exists to prevent. Aliased locally so the call sites below read
     unchanged. */
  // validateDice is used far above, by applySave(), to check a hand-written
  // damage expression on the way in. Imported here rather than there because
  // this is the one place the dice engine is reached for, and it runs at load
  // while applySave() runs on DOMContentLoaded.
  const { evaluateDice, validateDice, MAX_DICE, MAX_SIDES } = window.WAYPOINT_DICE;

  /* ---- the tumble ---------------------------------------------------
     A roll is DECIDED first and animated second. evaluateDice() runs once,
     that result is locked away, and every frame after it is theatre played
     over an outcome that can no longer change. Nothing in this block can
     alter a roll — delete the whole thing and every number lands the same.

     Each frame re-evaluates the SAME expression to get throwaway faces, so
     the numbers flickering past are always faces those exact dice could
     really roll: a d6 chip never shows a 7, and a d20+10 never flashes a
     total the expression couldn't produce.

     No two tumbles look alike: the frame count, the pacing curve and every
     face are re-rolled per throw, and the dice come to rest one after
     another rather than all at once.
     ------------------------------------------------------------------ */
  const TUMBLE_MIN_FRAMES = 11;
  const TUMBLE_MAX_FRAMES = 17;
  const TUMBLE_FIRST_MS   = 38;    // rapid flicker as the dice leave the hand
  const TUMBLE_LAST_MS    = 115;   // ...decelerating into the final face
  let tumbleHandle = null;

  const cancelTumble = () => {
    if (tumbleHandle !== null) { cancelAnimationFrame(tumbleHandle); tumbleHandle = null; }
  };

  // Motion here is pure decoration, so anyone who has asked the OS for less
  // of it simply gets the answer with no tumble at all.
  const prefersReducedMotion = () =>
    !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // How many individual dice a result contains (2d6 + 1d4 → 3).
  const faceCount = (out) => out.rolls.reduce((n, g) => n + g.rolls.length, 0);
  const faceSum   = (out) => out.rolls.reduce((n, g) => n + g.rolls.reduce((t, v) => t + v, 0), 0);

  // Build the picture painted on one frame. The first `locked` dice show their
  // real, final faces; the rest show throwaway ones. The displayed total is
  // rebuilt from the faces actually on screen plus the roll's flat modifier,
  // so the total always agrees with the chips under it — and lands exactly on
  // the real total once the last die locks.
  //
  // "Flat modifier" is only literally true for the +N shape (d20+10, 2d6+3).
  // For something like d6×2 the mid-tumble total is merely plausible rather
  // than arithmetically right — acceptable for a few hundred ms of theatre,
  // and it still lands dead on `real.total`, because by then every displayed
  // face IS the real face.
  function blendRoll(real, fake, locked) {
    const count = faceCount(real);
    let seen = 0;
    const rolls = real.rolls.map((group, gi) => ({
      notation: group.notation,
      sides: group.sides,
      rolls: group.rolls.map((v, di) => {
        const isLocked = seen++ < locked;
        return { v: isLocked ? v : fake.rolls[gi].rolls[di], locked: isLocked };
      }),
    }));
    const shown = rolls.reduce((n, g) => n + g.rolls.reduce((t, f) => t + f.v, 0), 0);
    const mod = real.total - faceSum(real);   // the flat part, e.g. the +10 on a to-hit
    return { rolls, mod, total: locked >= count ? real.total : shown + mod };
  }

  // Restarting a CSS animation takes remove → force a reflow → re-add;
  // without the reflow the browser never notices the class left.
  function flashSettle(el) {
    if (!el) return;
    el.classList.remove('is-settled');
    void el.offsetWidth;
    el.classList.add('is-settled');
  }

  // Drive `paint(view, settled)` across a tumble that ends on `real`.
  function animateRoll(tokens, real, paint) {
    cancelTumble();
    const count = faceCount(real);

    // Nothing to tumble (a flat "5"), or motion is unwelcome: show the answer.
    if (!count || prefersReducedMotion()) {
      paint(blendRoll(real, real, count), true);
      return;
    }

    const span   = TUMBLE_MAX_FRAMES - TUMBLE_MIN_FRAMES + 1;
    const frames = TUMBLE_MIN_FRAMES + Math.floor(Math.random() * span);

    // Frame gaps grow from FIRST_MS toward LAST_MS, so the dice visibly slow
    // down instead of stopping dead. The exponent is jittered per roll so the
    // deceleration itself has a slightly different feel each throw.
    const curve = 1.7 + Math.random() * 0.9;
    const schedule = [];
    let at = 0;
    for (let k = 0; k < frames; k++) {
      at += TUMBLE_FIRST_MS + (TUMBLE_LAST_MS - TUMBLE_FIRST_MS) * Math.pow(k / frames, curve);
      schedule.push(at);
    }
    const duration = at;

    const start = performance.now();
    let frame = 0;

    const step = (now) => {
      const elapsed = now - start;
      if (elapsed >= duration) {
        tumbleHandle = null;
        paint(blendRoll(real, real, count), true);
        return;
      }
      // requestAnimationFrame runs ~60fps, far faster than dice should
      // flicker, so only repaint when the next scheduled frame comes due.
      if (elapsed >= schedule[frame]) {
        frame++;
        // Dice lock in progressively, like a handful landing one by one.
        const locked = Math.floor(count * Math.pow(elapsed / duration, 2.2));
        paint(blendRoll(real, evaluateDice(tokens), locked), false);
      }
      tumbleHandle = requestAnimationFrame(step);
    };

    paint(blendRoll(real, evaluateDice(tokens), 0), false);
    tumbleHandle = requestAnimationFrame(step);
  }

  function openDice() {
    app.setAttribute('data-modal', 'dice');
    renderDice();
  }

  /* A die key: a standard "d20", or the bare "dx" key, whose sides are typed
     on the number pad afterwards. Both shapes at once, hence \d*. */
  const DIE_KEY = /^d\d*$/;
  const DIGIT   = /^\d+$/;

  /* What does the expression currently END in?

     The die keys are additive (see insertDieKey), and what a tap should do
     depends on the tail — which the last token alone cannot tell you, because
     a die's sides can arrive as their own digit tokens. "5d5" is
     ['5','d','5'], and its last token is a plain 5.

     Reports one of:
       { kind: 'die',  at, sides } — a complete die term; `at` indexes its 'd'
       { kind: 'open', at }        — a 'd' still waiting for its sides
       { kind: 'number' }          — a plain number
       { kind: 'other' }           — empty, or an operator or paren */
  function diceTail() {
    const t = dice.tokens;
    let i = t.length - 1;
    let digits = '';
    while (i >= 0 && DIGIT.test(t[i])) digits = t[i--] + digits;

    const tok = i >= 0 ? t[i] : null;
    if (tok === 'd') {
      // Digits behind a bare 'd' are its sides; nothing behind it means the
      // player has pressed dx and not yet said how many faces.
      return digits ? { kind: 'die', at: i, sides: digits } : { kind: 'open', at: i };
    }
    // A whole die token, e.g. 'd20'. Any trailing digits belong to it too:
    // pressing 3 after d20 makes "d203", which the grammar reads as 203 sides.
    if (tok && DIE_KEY.test(tok)) return { kind: 'die', at: i, sides: tok.slice(1) + digits };
    return digits ? { kind: 'number' } : { kind: 'other' };
  }

  /* Grow the die term at `at` by one: d20 → 2d20 → 3d20, and for the bare key
     d → 2d → 3d. The count is however many digit tokens sit in front of the
     'd', which may be several — the keypad pushes digits one at a time, so
     "12d6" is ['1','2','d6']. */
  function bumpDieCount(at) {
    const t = dice.tokens;
    let start = at;
    while (start > 0 && DIGIT.test(t[start - 1])) start--;
    // No digits in front of the 'd' is the bare form, which the grammar reads
    // as a single die (see parseFactor: "bare d20 means 1d20"). So the first
    // repeat takes it to 2, which is what the display has always implied.
    const count = start === at ? 1 : parseInt(t.slice(start, at).join(''), 10);
    // The engine refuses more than MAX_DICE, so hold there rather than grow an
    // expression that cannot roll.
    if (count >= MAX_DICE) return;
    // Replace the old count's digits, leaving the 'd' where it is; with none to
    // replace (start === at) this inserts in front of it. One token per digit,
    // so backspace still eats a single digit exactly as it does for a
    // hand-typed count.
    t.splice(start, at - start, ...String(count + 1).split(''));
  }

  /* The die keys are ADDITIVE, because that is what tapping one means to a
     player: another die. Appending blindly used to build "d20d20" — two dice
     terms with no operator between them, which the grammar cannot read at all,
     so Roll silently did nothing.

     Every branch rewrites the token array into something the player could
     equally have typed by hand. The engine learns nothing about any of this;
     it still receives an ordinary expression.

     Returns true when the press has been handled, false to let diceInsert()
     append it plainly. */
  function insertDieKey(tok) {
    if (!DIE_KEY.test(tok)) return false;
    const tail = diceTail();

    if (tail.kind === 'die') {
      // The same die again: one more of it.
      if ('d' + tail.sides === tok) bumpDieCount(tail.at);
      // A different die: a new term, carrying the + the player never pressed.
      // "d6 then d4" is 1d6 + 1d4 — nobody taps two die keys meaning to
      // multiply them, and a tap cannot express any other operator.
      else dice.tokens.push('+', tok);
      return true;
    }

    if (tail.kind === 'open') {
      // Five taps of dx read as "5d": the count is set, the sides are not.
      // Another tap means one more die, exactly as for the standard keys...
      if (tok === 'd') bumpDieCount(tail.at);
      // ...and a standard key fills the sides in — "5d" then d6 is 5d6. The
      // alternative is a second 'd' that could never parse.
      else dice.tokens[tail.at] = tok;
      return true;
    }

    // After a number, an operator, a paren, or on an empty expression, a die
    // key simply appends: a leading number is the count the player just typed.
    return false;
  }

  function diceInsert(tok) {
    cancelTumble();   // editing the expression abandons the roll in progress
    if (dice.justRolled) { dice.tokens = []; dice.justRolled = false; }
    if (!insertDieKey(tok)) dice.tokens.push(tok);
    renderDice();
  }

  function diceBack() {
    cancelTumble();
    dice.justRolled = false;
    dice.tokens.pop();
    renderDice();
  }

  /* ---- the delete key: tap to backspace, hold to clear ----------------
     One key for both because they are the same intent at two scales, and the
     keypad has no room for a second one. A long expression that was wrong from
     its first token is otherwise a dozen taps to undo.

     The clear fires on a TIMER rather than on release, so you feel it land and
     can let go. The click that the release then generates has to be swallowed,
     or the clear would be chased by a stray one-token backspace. */
  const DICE_HOLD_MS = 450;

  function diceClear() {
    cancelTumble();
    dice.justRolled = false;
    dice.tokens = [];
    renderDice();
  }

  function diceHoldStart() {
    diceHoldCancel();
    // Reset here, not on release: a hold that ends off the key never produces
    // a click to consume the flag, and a stale one would eat the next tap.
    dice.heldClear = false;
    dice.holdTimer = setTimeout(() => {
      dice.holdTimer = null;
      dice.heldClear = true;
      diceClear();
    }, DICE_HOLD_MS);
  }

  function diceHoldCancel() {
    if (dice.holdTimer) { clearTimeout(dice.holdTimer); dice.holdTimer = null; }
  }

  function diceRoll() {
    if (!dice.tokens.length) return;
    let real;
    try {
      real = evaluateDice(dice.tokens);
    } catch (err) {
      cancelTumble();
      renderDice({ error: err.message });
      return;
    }
    dice.justRolled = true;
    // The result above is final; animateRoll only decides how it arrives.
    animateRoll(dice.tokens, real, (view, settled) => renderDice({ result: view, settled }));
  }

  // Faces arrive as {v, locked}. A die still in the air gets the tumbling
  // class instead of the crit/fumble ones, so those highlights can't flicker
  // on and off at random while the dice are moving.
  /* The calculator's breakdown, in the same parenthesised style as the roll
     card — `2d8 (2 + 8)` where the card shows `(2 + 8) + 2`.

     It KEEPS its notation prefix, which the card has no use for. The card
     shows one roll you tapped from the sheet, so the expression is already
     named above it; the calculator can hold several unrelated groups at once,
     and `2d8 (2 + 8)  1d4 (3)` is the only way to say which typed term
     produced which faces.

     No crit marking here, deliberately. A d20 in the calculator is just a d20
     — nothing on this surface knows a roll is an attack, so nothing on it can
     honestly call one a Critical Strike. Same reason the card gates crit
     detection on `kind === 'tohit'`. */
  function breakdownHtml(rolls) {
    return rolls.map((r) => {
      const dieHtml = r.rolls.map((f) => {
        const cls = !f.locked ? ' roll--tumbling'
                  : f.v === r.sides ? ' roll--max'
                  : f.v === 1 ? ' roll--min' : '';
        return `<span class="roll${cls}">${f.v}</span>`;
      }).join('<span class="die-op">+</span>');
      return `${esc(r.notation)} (${dieHtml})`;
    }).join('  ');
  }

  function renderDice(paint) {
    const exprEl = $('[data-dice-expr]');
    const resEl  = $('[data-dice-result]');
    const brkEl  = $('[data-dice-breakdown]');
    if (!exprEl) return;

    exprEl.textContent = dice.tokens.join('');

    if (paint && paint.error) {
      resEl.textContent = paint.error;
      resEl.classList.add('is-error');
      brkEl.innerHTML = '';
    } else if (paint && paint.result) {
      resEl.textContent = paint.result.total;
      resEl.classList.remove('is-error');
      resEl.classList.toggle('is-tumbling', !paint.settled);
      if (paint.settled) flashSettle(resEl);
      brkEl.innerHTML = breakdownHtml(paint.result.rolls);
    } else {
      resEl.textContent = '—';
      resEl.classList.remove('is-error', 'is-tumbling', 'is-settled');
      brkEl.innerHTML = '';
    }
  }

  /* ------------------------------------------------------------------ */
  /* QUICK ROLL — tapping a To-Hit / Damage box on the sheet             */
  /* Reuses the same evaluateDice() engine as the full calculator, so    */
  /* there is exactly one dice implementation to trust.                  */
  /* ------------------------------------------------------------------ */
  const KIND_LABEL = { tohit: 'To-Hit', damage: 'Damage', heal: 'Healing' };

  /* ---- advantage & disadvantage --------------------------------------

     GAME RULE (guide, Ch.1). Net stacks change the dice POOL rather than the
     modifier: one stack rolls 2d20 and keeps the best, two stacks roll 3d20,
     and there is no cap. Advantage and Disadvantage cancel one for one.

     Held as a single SIGNED net count, which is what makes the cancelling
     free — there is no pair of counters to keep in step, and `adv` of 0 is a
     straight d20 with no special case anywhere. Positive keeps the highest,
     negative the lowest, and the pool is always |adv| + 1 dice.

     WHERE THE STACKS COME FROM IS THE PLAYER, deliberately. The guide grants
     Advantage from `Guidance`, Disadvantage from `Invisible` and
     `Blind / Deafened`, and Cover — but Cover is a fact about the battlefield
     that nothing on this sheet can know, and a pool assembled from only the
     half the app can see would be wrong more confidently than one it does not
     assemble at all. Waypoint is played with real dice; this is the app
     supporting that, not replacing it. So the choice is made per roll, by
     holding the To-Hit box. See rules-gaps §2.5. */
  const advDice = (adv) => Math.abs(adv) + 1;
  const advKeepsHighest = (adv) => adv > 0;

  /* The four choices the hold offers, top to bottom. The dice count is stated
     because it is what the player is about to pick up; "take highest" is NOT,
     because the name of the option already says which way it goes. */
  const ADV_CHOICES = [
    { adv:  2, label: '2 Advantage' },
    { adv:  1, label: 'Advantage' },
    { adv: -1, label: 'Disadvantage' },
    { adv: -2, label: '2 Disadvantage' },
  ];

  // The mode's name on the result card. A straight roll has none — the card
  // looked like this before advantage existed and should still.
  const advLabel = (adv) => (ADV_CHOICES.find((c) => c.adv === adv) || {}).label || '';

  /* The rolled expression for a given pool. A to-hit is built by valBox() as
     `d20+N`, so widening it is a matter of the count in front — the modifier
     rides along untouched, which is the whole point: the bonus is added to
     the KEPT die, and `2d20+6` evaluated by the engine gives us both faces
     and that same +6 as its flat part. What the engine cannot know is that
     only one die counts, which is why the total is overridden downstream.
     See keptFace() and quickTotal(). */
  const advExpr = (expr, adv) =>
    (adv === 0 ? expr : String(expr).replace(/^d20/, `${advDice(adv)}d20`));

  /* THE ATTACK DIE, out of a rolled view — the one face a Critical Strike is
     read off. A to-hit expression is built by valBox() as `d20+N`, so this is
     the first d20 in the roll and today there is never a second.

     It is found by LOOKING for a d20 rather than by taking rolls[0], because
     §2.5's Advantage is 2d20-take-highest: when that lands, the natural die is
     the kept one, and a function that had assumed "the first group, the first
     face" would quietly read the discarded die instead. Returns null when the
     roll has no d20 at all, which is not an error — an ability can be a flat
     bonus with nothing to roll.

     Only ever called for kind === 'tohit'. A d20 in the dice CALCULATOR is
     just a d20: nothing there knows it is an attack, so nothing there crits. */
  /* The d20 group of a to-hit roll, or null when there isn't one (an ability
     can be a flat bonus with nothing to roll). */
  const attackGroup = (view) => view.rolls.find((r) => r.sides === CRIT_BASE) || null;

  /* WHICH die counts — the index of the face kept out of the pool. With no
     advantage there is one die and it is index 0; with advantage it is the
     highest face, with disadvantage the lowest.

     Ties keep the FIRST of the equal faces, which matters not at all to the
     total and keeps the highlight from flickering between two identical
     numbers as the tumble lands. */
  function keptIndex(g, adv) {
    if (!g || !g.rolls.length) return -1;
    const wantHigh = advKeepsHighest(adv);
    let best = 0;
    for (let i = 1; i < g.rolls.length; i++) {
      const v = g.rolls[i].v, b = g.rolls[best].v;
      if (adv === 0) break;
      if (wantHigh ? v > b : v < b) best = i;
    }
    return best;
  }

  /* The natural die a Critical Strike is read off: the KEPT one, never a
     discarded one. A 20 thrown away by Disadvantage is not a crit, and a 19
     kept by Advantage may well be — which is the whole reason this function
     goes looking rather than taking rolls[0].

     Returns null while that die is still in the air, so nothing announces a
     crit on a face that has not landed. */
  function attackFace(view, adv) {
    const g = attackGroup(view);
    if (!g || !g.rolls.length) return null;
    const f = g.rolls[keptIndex(g, adv)];
    return f && f.locked ? f.v : null;
  }

  /* HALF and DOUBLE, the two numbers a damage roll is most often turned into
     at the table — a resisted hit, a Critical Strike.

     The app states them; it does not apply them. That is the whole posture of
     this file: Waypoint's companion is a reference tracker, not a virtual
     tabletop. It puts your actions, stats and gear in one place and shows you
     what the rules say, and the player decides which number their situation
     calls for. Doubling a damage total automatically because the previous tap
     rolled a 20 would mean remembering one roll while you make another, which
     is turn-tracking the app deliberately does not do.

     HALF ROUNDS DOWN, always — 15 halves to 7, 13 to 6, 11 to 5. Math.floor
     rather than Math.round for exactly that reason, and it is the only part of
     this that is arithmetic rather than presentation. */
  const halfOf   = (total) => Math.floor(total / 2);
  const doubleOf = (total) => total * 2;

  /* Shown on DAMAGE rolls only. A to-hit is neither halved nor doubled — it is
     a threshold you meet or miss — so the flanks are absent there and the
     total sits centred on its own, which is also how the card looked before
     they existed. */
  function paintFlanks(view, settled) {
    const on = settled && state.lastRoll && state.lastRoll.kind === 'damage';
    for (const [key, value] of [['Half', halfOf(view.total)], ['Double', doubleOf(view.total)]]) {
      const el = $(`[data-flank="${key.toLowerCase()}"]`);
      if (!el) continue;
      el.hidden = !on;
      if (on) setText(`out${key}`, value);
    }
  }

  /* The faces of ONE die group, plus-separated and wrapped in parentheses —
     "(2 + 8)" for a 2d8 that came up 2 and 8.

     Parentheses rather than the boxed chips this used to draw. A box says
     "this is a token"; the roll is an EXPRESSION, and reading `(2 + 8) + 2`
     tells you where the 12 came from in the notation you already use at the
     table. Each group gets its own parentheses, so a mixed `1d8+1d4+2` reads
     `(6) + (3) + 2` rather than merging two unrelated dice into one sum.

     A face is marked by COLOUR now rather than by a filled tile, which is what
     lets the mark live inside a run of ordinary text. */
  function faceGroupHtml(g, crit, face, kept = -1) {
    const inner = g.rolls.map((f, i) => {
      /* DROPPED beats every other mark. A die Advantage threw away is not a
         maximum, not a fumble and certainly not a crit, whatever it shows —
         it did not happen. It is still printed, struck through, because
         seeing what you did not take is most of the point of rolling two. */
      const dropped = kept !== -1 && i !== kept;
      const cls = dropped ? ' die--dropped'
                : !f.locked ? ' die--tumbling'
                /* The crit mark beats the max mark where both apply: a natural
                   20 is a Critical Strike first and a maximum face second.
                   See §2.3 — the two claims differ, and only one is a rule. */
                : (crit && g.sides === CRIT_BASE && f.v === face) ? ' die--crit'
                : f.v === g.sides ? ' die--max'
                : f.v === 1 ? ' die--min' : '';
      return `<span class="die${cls}">${f.v}</span>`;
    /* Faces in an attack pool are ALTERNATIVES, not addends, so they are
       separated by a thin space rather than a "+". Printing "(19 + 4)" would
       claim a sum of 23 that nothing in the rules ever computes. */
    }).join(kept === -1 ? '<span class="die-op">+</span>' : '<span class="die-sep"></span>');
    return `<span class="die-group">(${inner})</span>`;
  }

  // One frame of the result card. Like the calculator's breakdown, a die still
  // in the air is marked tumbling rather than crit/fumble, so the gold and red
  // highlights only appear on faces that have actually come to rest.
  /* The Poison being applied to the roll on screen — zero unless this is a
     healing roll AND the player has switched it on. Kept as one function so
     the expression line, the total and the toggle's own label are all reading
     the same number. */
  const rollPoison = () =>
    (state.lastRoll && state.lastRoll.kind === 'heal' && state.applyPoison)
      ? poisonHealPenalty() : 0;

  /* The toggle itself. Offered on healing rolls only, and only once the dice
     have settled — there is nothing to apply it to while they are in the air,
     and a control that appears mid-tumble invites a press that would land on
     a number about to change. */
  function paintPoisonToggle(settled) {
    // Scoped to the roll card. There are TWO of these controls in the
    // document and the calculator's comes first, so an unscoped selector
    // silently paints the wrong one — the card's stays hidden while the
    // calculator's quietly changes state behind a closed modal.
    const el = $('.modal--roll [data-poison-toggle]');
    if (!el) return;
    const on = settled && state.lastRoll && state.lastRoll.kind === 'heal' && poisonOffered();
    el.hidden = !on;
    if (!on) return;
    el.setAttribute('aria-pressed', String(state.applyPoison));
    setText('rollPoisonLabel', `Apply my Poison (${poisonHealPenalty()})`);
  }

  function paintQuickRoll(view, settled) {
    const isToHit = !!(state.lastRoll && state.lastRoll.kind === 'tohit');
    const adv = (state.lastRoll && state.lastRoll.adv) || 0;

    /* Whether THIS roll is a Critical Strike, decided once for the whole frame
       so the chip and the banner cannot disagree. Gated on `settled` as well
       as on the face: a mid-tumble 20 is a die that happens to be showing 20
       on its way past, not a result, and announcing a crit that then unrolls
       itself would be the one thing a dice app must never do.

       Read off the KEPT die, so a 20 discarded by Disadvantage announces
       nothing and a 19 kept by Advantage announces a crit. */
    const face = isToHit ? attackFace(view, adv) : null;
    const crit = settled && face !== null && isCrit(face);

    /* Which index in the attack pool survived. -1 for every roll that is not
       a to-hit, and for a straight d20 it is 0 — in both cases nothing is
       marked as dropped, because nothing was. */
    const g20 = isToHit && adv !== 0 ? attackGroup(view) : null;
    const kept = g20 ? keptIndex(g20, adv) : -1;

    const groups = view.rolls.map((g) => faceGroupHtml(g, crit, face, g === g20 ? kept : -1))
      .join('<span class="die-op">+</span>');
    /* The flat bonus never tumbles — it isn't rolled — and it sits OUTSIDE the
       parentheses because that is where it sits in the notation: `2d8+2` is
       two dice and then a bonus, not three things added.

       Sign and magnitude are split so the operator can be spaced like the ones
       between the dice, and a negative Power renders `(4 + 4) − 1` rather than
       the `+ -1` that formatMod() alone would give. The minus is a typographic
       U+2212, not a hyphen: at this size a hyphen reads as a dash in a word. */
    const modHtml = view.mod
      ? `<span class="die-op">${view.mod < 0 ? '\u2212' : '+'}</span>`
        + `<span class="die-mod">${Math.abs(view.mod)}</span>`
      : '';
    /* Poison, shown as its own term after the modifier — "(6) + 2 − 1" — so
       the card reads as the sentence the rules make: what you rolled, what
       your Fortune added, what your Poison took off. It is NOT in the dice
       expression, because it is not part of what was rolled. */
    const poison = rollPoison();
    const poisonHtml = poison
      ? `<span class="die-op">\u2212</span>`
        + `<span class="die-mod die-mod--poison">${Math.abs(poison)}</span>`
      : '';
    const el = $('[data-out-dice]');
    if (el) el.innerHTML = groups + modHtml + poisonHtml;

    // Kept so the toggle can repaint this exact result. Only the settled view
    // is worth holding: a mid-tumble frame is not a roll.
    if (settled) state.rollView = view;

    paintCrit(crit);
    paintFlanks(view, settled);
    paintPoisonToggle(settled);

    setText('outTotal', quickTotal(view, adv));
    const total = $('[data-bind="outTotal"]');
    if (total) {
      total.classList.toggle('is-tumbling', !settled);
      if (settled) flashSettle(total);
    }
  }

  /* The banner, shown or hidden. It carries the WINDOW as a second line only
     when Lethality has actually widened it: at Lethality 0 the threshold is
     the plain 20 every player already knows, and saying so would be the app
     explaining a rule nobody was surprised by. At Lethality 2 a natural 18
     critting needs the explanation, and this is where it is read. */
  function paintCrit(on) {
    const el = $('[data-crit]');
    if (!el) return;
    el.hidden = !on;
    const leth = statValue('Lethality');
    setText('critWindow', leth > 0
      ? `Lethality ${leth} · crits on ${critThreshold()}\u2013${CRIT_BASE}`
      : '');
  }

  /* What the card prints as the total. For every roll but a poisoned heal
     this is simply the sum; for that one it is the sum less the Poison,
     clamped by healReceived(). */
  function healReceivedTotal(view) {
    const poison = rollPoison();
    return poison ? healReceived(view.total) : view.total;
  }

  /* THE TOTAL ON THE CARD, and the one piece of arithmetic advantage actually
     changes.

     blendRoll() builds its total by SUMMING every face and adding the flat
     part, which is right for `2d6` and wrong for a pool where only one die
     counts. It is shared with the calculator, where summing is correct, so
     the override lives here rather than in it.

     `view.mod` is the flat part blendRoll already separated out, so this is
     exactly "the kept die plus the modifiers" with nothing re-derived. */
  function quickTotal(view, adv) {
    if (!state.lastRoll || state.lastRoll.kind !== 'tohit' || adv === 0) {
      return healReceivedTotal(view);
    }
    const g = attackGroup(view);
    if (!g || !g.rolls.length) return view.total;
    return g.rolls[keptIndex(g, adv)].v + view.mod;
  }

  function showRoll(label, kind, expr, adv = 0) {
    // Advantage only ever widens an attack pool. A damage or healing roll with
    // a stray `adv` would silently roll the wrong dice, so it is dropped here
    // rather than trusted from the caller.
    if (kind !== 'tohit') adv = 0;
    const rolled = advExpr(expr, adv);
    let real;
    try {
      real = evaluateDice([rolled]);
    } catch (err) {
      console.warn(`[waypoint] bad roll expression "${rolled}": ${err.message}`);
      return;
    }

    // `expr` is stored UNWIDENED, so Reroll can rebuild the pool from the mode
    // rather than widening an already-widened expression into 4d20.
    state.lastRoll = { label, kind, expr, adv };

    setText('outSource', label);
    setText('outKind', KIND_LABEL[kind] || 'Roll');
    /* The mode's name, and only its name — "take highest" is not written
       anywhere, because "Advantage" already says which way it goes and the
       dropped die on the card shows it happening. Empty for a straight roll,
       which is how the card read before any of this existed. */
    setText('outAdv', advLabel(adv));
    setText('outNotation', rolled);
    // Cleared BEFORE the card is shown, not left to the first tumble frame.
    // The frames are scheduled, so there is a few-millisecond gap between
    // opening and the first paint — long enough for the previous roll's
    // banner, or its Half/Double, to be visible over a throw that has not
    // happened yet.
    paintCrit(false);
    paintFlanks({ total: 0 }, false);
    // A fresh roll starts with the toggle off and no retained result, so the
    // previous heal's choice never rides along into this one.
    state.applyPoison = false;
    state.rollView = null;
    paintPoisonToggle(false);
    app.setAttribute('data-modal', 'roll');

    // Total and faces are painted by the tumble, which settles on `real`.
    animateRoll([rolled], real, paintQuickRoll);
  }

  /* ---- the advantage chooser ----------------------------------------

     Held, not tapped. A tap on a To-Hit box rolls a straight d20 and always
     has; the pool is the thing you have to mean, so it sits behind the same
     450ms DICE_HOLD_MS the roller's delete key and the Patch tally use. Three
     holds in this app now, one constant.

     ROOTED ON THE BOX rather than centred like every other modal, because it
     is a choice ABOUT that box — and there can be half a dozen To-Hit boxes
     on screen at once, so a centred sheet would lose track of which one you
     pressed. Position is handed to CSS as two custom properties, the way
     --pull and --pv-* already are; no inline geometry, no stylesheet in JS. */
  const advHold = { timer: null, fired: false, box: null };

  function advHoldStart(box) {
    advHoldCancel();
    // Cleared on START, not on release — a hold that wanders off the box never
    // produces a click to consume the flag, and a stale one would swallow the
    // next tap. Lifted from diceHoldStart(), including this reason.
    advHold.fired = false;
    advHold.box = box;
    advHold.timer = setTimeout(() => {
      advHold.timer = null;
      advHold.fired = true;
      openAdv(box);
    }, DICE_HOLD_MS);
  }

  function advHoldCancel() {
    if (advHold.timer) { clearTimeout(advHold.timer); advHold.timer = null; }
  }

  function openAdv(box) {
    const el = $('[data-adv-menu]');
    if (!el || !box) return;
    // What the chooser will roll when a row is picked. Read now, while the box
    // that was held is still in hand — the menu itself has no idea which of
    // the sheet's To-Hit boxes opened it.
    state.advFor = { label: box.dataset.rollLabel, expr: box.dataset.rollExpr };

    /* Opened FIRST, then measured. The menu has no size while it is display:
       none, and its height is what decides whether it can open downward — so
       the modal is shown, the real height is read, and only then is it placed.
       One reflow, and no hardcoded guess at how tall four rows are. */
    app.setAttribute('data-modal', 'adv');

    /* Anchored to the box, in coordinates relative to the PHONE FRAME rather
       than the viewport: the menu is absolutely positioned inside .app, which
       is the positioned ancestor, so this is the coordinate space CSS will
       resolve against. Deliberately not position: fixed — that would be
       relative to the viewport and would break the moment any ancestor of
       .app grew a transform.

       Two custom properties and one data attribute, which is the whole of
       what JS says about where this goes: --pull and --pv-* set the same
       precedent, and the stylesheet still owns every actual dimension. */
    const r = box.getBoundingClientRect();
    const frame = app.getBoundingClientRect();
    const below = frame.bottom - r.bottom;
    // Open upward when there is not room beneath the box — a menu that runs
    // off the bottom of the phone is a menu with rows nobody can reach.
    const up = below < el.offsetHeight + 16;
    el.setAttribute('data-adv-dir', up ? 'up' : 'down');
    el.style.setProperty('--adv-x', `${Math.round(r.left + r.width / 2 - frame.left)}px`);
    el.style.setProperty('--adv-y', `${Math.round((up ? r.top : r.bottom) - frame.top)}px`);
  }

  // Picking a row rolls it. The menu closes on the way, so the result card is
  // never stacked on top of a chooser still sitting open behind it.
  function pickAdv(adv) {
    const f = state.advFor;
    if (!f) return;
    closeModal();
    showRoll(f.label, 'tohit', f.expr, adv);
  }

  /* ================================================================== */
  /* EXPORT & IMPORT — the portable character card                      */
  /* ------------------------------------------------------------------ */
  /* A `.waypoint.json` file, documented in docs/character-file.md.      */
  /*                                                                     */
  /* The shape is three parts, and the reason for each is the same       */
  /* tension: a character stores library IDS, which is what lets a       */
  /* spreadsheet edit reach every character at once — and is exactly     */
  /* what breaks when the file lands on a device with a different        */
  /* library, because applySave() drops ids it cannot resolve.           */
  /*                                                                     */
  /*   characters  the character AS STORED, ids intact. Import onto a    */
  /*               newer library and it picks up the rebalanced numbers  */
  /*               like any local character.                             */
  /*   entries     a snapshot of every library entry it references, used */
  /*               ONLY as a fallback for ids the importing device does  */
  /*               not have. This is what makes "the same character on   */
  /*               another device" true rather than merely intended.     */
  /*   library     provenance, so the import screen can say which        */
  /*               compendium it was built against.                      */
  /*                                                                     */
  /* `characters` is an array even for one, so exporting a whole roster  */
  /* later is the same file and the same importer, not a second format.  */
  /* ================================================================== */

  const CHARACTER_FILE_VERSION = 1;

  /* Library entries that arrived from OUTSIDE this device's own compendium and
     that it does not otherwise have — with an imported character, or from a
     compendium imported in Settings with Add rather than Replace. Kept apart
     from LIBRARY so the generated file stays the single source of truth for
     content this device actually ships, and merged in at boot: without
     persisting them, an import against an older library would look right once
     and then lose the same gear on the next launch.

     Distinct from waypoint.library, which is a compendium installed IN PLACE
     OF the generated one. These are additions that fill gaps; that is a
     replacement. */
  const IMPORTED_KEY = 'waypoint.imported-entries';

  function loadImportedEntries() {
    let bag = null;
    try { bag = JSON.parse(localStorage.getItem(IMPORTED_KEY) || 'null'); } catch (_) { /* corrupt */ }
    if (bag) mergeEntries(bag, { markImported: true });
  }

  /* Fold a bag of entries into the in-memory catalogs, skipping any id this
     device already knows — a local entry always wins, because it is the one
     the player's own spreadsheet describes. Returns the ids actually added. */
  function mergeEntries(bag, { markImported } = {}) {
    const added = [];
    for (const [id, entry] of Object.entries(bag || {})) {
      if (!entry || typeof entry !== 'object' || entry.id !== id) continue;
      if (byLibraryId(id)) continue;
      const e = markImported ? { ...entry, imported: true } : entry;
      const kind = id.slice(0, id.indexOf('.'));
      if (kind === 'class')      (LIBRARY.classes    ||= []).push(e);
      else if (kind === 'subclass') (LIBRARY.subclasses ||= []).push(e);
      else if (kind === 'trait') (LIBRARY.traits     ||= []).push(e);
      else if (kind === 'skill') { (LIBRARY.skills ||= []).push(e); SKILLS.set(id, e); }
      else if (kind === 'armor') { ARMOR.push(e); ITEMS.set(id, e); }
      else if (kind === 'weapon' || kind === 'shield') { WEAPONS.push(e); ITEMS.set(id, e); }
      else if (kind === 'gear' || kind === 'consumable') { EQUIPMENT.push(e); ITEMS.set(id, e); }
      else continue;
      added.push(id);
    }
    return added;
  }

  // One lookup across every collection, used to ask "does this device already
  // know this id?" without caring which shelf it would be on.
  const byLibraryId = (id) =>
    subclassOf(id) || classOf(id) || skillOf(id) || itemOf(id)
    || (LIBRARY.traits || []).find((t) => t.id === id) || null;

  /* Every library id a character depends on, transitively. Subclasses drag in
     their parent class and both their Tier 0 traits, because a build that
     resolves to a subclass but not its class renders as half a character. */
  function referencedIds(c) {
    const ids = new Set();
    for (const id of subclassIds(c.build)) {
      const sc = subclassOf(id);
      if (!sc) { ids.add(id); continue; }
      ids.add(sc.id);
      ids.add(sc.classId);
      for (const t of [...tier0TraitsOf(sc.id), ...tier0TraitsOf(sc.classId)]) ids.add(t.id);
    }
    for (const k of c.skills || []) ids.add(k.id);
    for (const h of c.hands || []) ids.add(h.id);
    for (const g of c.equipment || []) ids.add(g);
    if (c.armorWorn) ids.add(c.armorWorn);
    return [...ids];
  }

  /* Build the file. Reads the character from STORAGE rather than memory, so
     exporting the open character and a different one take one path — the open
     one is saved first by whoever calls this.

     `portrait: false` drops the embedded photo. It is the ONLY thing the flag
     changes, and it changes nothing about how the file imports: the field is
     optional, so a file without it arrives as a character whose player never
     chose a picture. The reason it is worth a choice at all is weight — a
     photo is capped at 400 KB and is very nearly the whole file, so leaving it
     behind is the difference between a few KB that any chat app will carry and
     half a megabyte that several of them refuse. */
  /* `ids` is a LIST, and the one-character case is a list of one. The envelope
     already declares `characters` an array for exactly this reason, so a whole
     roster is the same file and the same importer rather than a second format
     — Settings' Export All Characters and the Personae list's Export are one
     code path, and a backup can be opened by anything that could already open
     a single card. `entries` is the union across everyone in the file, so gear
     two characters share is snapshotted once. */
  function characterFile(ids, { portrait = true } = {}) {
    const list = [];
    for (const id of ids) {
      const stored = readSave(id);
      // Silently skipped rather than failing the whole export: a roster row
      // whose save has been cleared is already a row the app drops at boot,
      // and losing eleven characters because the twelfth is a ghost would be
      // the worse answer by far.
      if (stored) list.push({ ...stored, id, portrait: portrait ? readPortrait(id) : null });
    }
    if (!list.length) return null;

    const entries = {};
    for (const c of list) {
      for (const ref of referencedIds(c)) {
        const e = byLibraryId(ref);
        // `imported` is a marker this app adds, not content — it must not travel
        // on to the next device as though the spreadsheet had said it.
        if (e) { const { imported, ...clean } = e; entries[ref] = clean; }
      }
    }

    return {
      waypointCharacter: {
        schemaVersion: CHARACTER_FILE_VERSION,
        exported: new Date().toISOString().slice(0, 10),
        library: {
          title: LIBRARY.waypoint?.title || 'Unknown',
          version: LIBRARY.waypoint?.version || '0',
          schemaVersion: LIBRARY.waypoint?.schemaVersion ?? null,
        },
      },
      characters: list,
      entries,
    };
  }

  // Lowercase, hyphenated, no surprises on any filesystem.
  const fileSlug = (name) => (String(name || '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'character');

  /* The file's name on disk. Kept next to the slug rather than inlined at each
     call site: the Personae list, the share screen's own footnote and the
     download itself all have to agree on it, and the footnote is only useful
     because it is the same string the file actually lands under.

     A file carrying more than one character cannot be named after any of them,
     so it is named for its date instead. Read off the envelope rather than
     taken again from the clock, so the name can never disagree with the
     `exported` field inside. */
  const characterFilename = (file) =>
    (file.characters.length === 1
      ? `${fileSlug(file.characters[0].name)}.waypoint.json`
      : backupFilename(file));

  /* A backup is named for WHEN IT WAS TAKEN, whoever is in it. That is what
     the file is for: a folder of them wants to sort by date and be told apart
     at a glance, and a one-character roster backed up every week would
     otherwise write `elara.waypoint.json` over and over. Which is why
     exportBackup() names its file explicitly rather than letting the count
     decide — a backup of one character is still a backup. */
  const backupFilename = (file) =>
    `waypoint-backup-${file.waypointCharacter.exported}.waypoint.json`;

  /* Pretty-printed for the same reason library.js is: this file is meant to be
     openable and legible, not just machine-readable. Serialising is split out
     from writing because the share screen has to WEIGH a file it has not
     decided to write yet. */
  const characterJson = (file) => JSON.stringify(file, null, 2);

  /* Hand a built file to the device. One delivery path for all three doors
     into it — the Personae list's Export, and the share screen's Save and
     Share — so a fix to how a browser is coaxed into accepting a download
     cannot be applied to two of them and missed on the third.

     `via` is 'save' (write it to this device) or 'send' (the OS share sheet:
     AirDrop, Files, a chat app). They are different verbs, not a fallback
     pair — but 'send' does fall back to 'save' if the sheet fails for any
     reason other than the player closing it, because the file was already
     built and silently dropping it would be the worst of the three outcomes.

     `name` overrides what the file would otherwise be called. Only Settings'
     backup passes it, because that is the one door where the NAME is not a
     function of the contents — see backupFilename(). */
  function deliverCharacterFile(file, { via = 'save', name: named } = {}) {
    const name = named || characterFilename(file);
    const blob = new Blob([characterJson(file)], { type: 'application/json' });

    if (via === 'send' && canShareFiles()) {
      const f = new File([blob], name, { type: 'application/json' });
      navigator.share({ files: [f], title: file.characters[0].name })
        // Closing the share sheet is a decision, not a failure: the player
        // chose not to send it, and has nothing to be told.
        .catch((err) => { if (err && err.name !== 'AbortError') saveBlob(blob, name); });
      return;
    }
    saveBlob(blob, name);
  }

  /* Can this browser hand a FILE to the OS share sheet? Both halves are
     needed: navigator.share exists in browsers that will only take a URL, and
     offering "Share…" there would open a sheet the character cannot travel
     through. Wrapped because canShare() throws rather than returning false on
     some older implementations. */
  function canShareFiles() {
    try {
      return !!(navigator.canShare && navigator.share
        && navigator.canShare({ files: [new File([''], 'probe.json', { type: 'application/json' })] }));
    } catch (_) { return false; }
  }

  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    // Appended before clicking: a detached anchor's download is ignored by
    // Firefox, which is the kind of difference that only shows up on someone
    // else's machine.
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Deferred: revoking synchronously can cancel the download it just started.
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function exportCharacter(id) {
    // The open character's unsaved edits have to reach storage before it is
    // read back out of it.
    if (character.id === id) save();
    const file = characterFile([id]);
    if (!file) return;
    deliverCharacterFile(file, { via: 'save' });
  }

  /* ---- share ----------------------------------------------------------
     One action, not a menu. The drawer's Share opens this window directly:
     a character is the only thing this app can hand anyone, and a chooser
     whose second row does nothing is a question with one real answer.

     The window itself is small on purpose. Everything about the file that a
     player might want to know — which compendium it was built against, what
     it carries, what it is called — is already in the file, and the import
     screen at the far end already reports all of it. The only thing that has
     to be decided BEFORE sending is the photo, because that is what decides
     whether the file fits through what you are sending it with. */

  function openShare() {
    save();                       // what is weighed must be what is sent
    state.share = { id: character.id, portrait: true };
    renderShare();
    // The drawer stays open behind this, for the reason openRest() gives: you
    // were asked a question, not taken somewhere.
    app.setAttribute('data-modal', 'share');
  }

  /* Both variants, built and serialised. The only honest way to put a size on
     a chip is to weigh the file the chip would write. Cheap enough to redo on
     every repaint — this runs on open and on a chip press, not in a loop. */
  function shareVariants(id) {
    const full = characterFile([id], { portrait: true });
    if (!full) return null;
    const bare = characterFile([id], { portrait: false });
    return {
      full: { file: full, size: byteSize(characterJson(full)) },
      bare: { file: bare, size: byteSize(characterJson(bare)) },
    };
  }

  // Bytes as they will land on disk. A Blob rather than string.length, because
  // a name with an accent in it is more bytes than it is characters.
  const byteSize = (str) => new Blob([str]).size;

  const fileSize = (n) => (
    n < 1024 ? `${n} B`
      : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB`
        : `${(n / (1024 * 1024)).toFixed(1)} MB`
  );

  function renderShare() {
    const s = state.share;
    if (!s) return;
    const v = shareVariants(s.id);
    if (!v) return;
    const hasPhoto = !!v.full.file.characters[0].portrait;

    setText('shareName', v.full.file.characters[0].name || 'Unnamed');

    /* With no photo the two variants are byte-identical, so the control comes
       out rather than offering a decision that changes nothing. `hidden`
       rather than a class, because this is a fact about the content. */
    fillList('shareFormats', !hasPhoto ? '' : [
      ['1', 'Photo', v.full.size],
      ['0', 'No photo', v.bare.size],
    ].map(([val, label, size]) => {
      const on = (val === '1') === s.portrait;
      // aria-pressed, matching tagChips(): the same chip doing the same job of
      // reporting which one of a set is chosen.
      return `<button class="tag-pick${on ? ' is-on' : ''}" data-share-format="${val}"`
        + ` aria-pressed="${on}">`
        + `${esc(label)}<span class="share__size">${esc(fileSize(size))}</span></button>`;
    }).join(''));
    const picks = $('[data-list="shareFormats"]');
    if (picks) picks.closest('.tag-picks').hidden = !hasPhoto;

    /* The verb the button will actually perform. Where the device has a share
       sheet this opens it — Messages, Mail, Save to Files, all of it, already
       laid out the way the player expects. Where it has none there is nothing
       to open and the file simply downloads, so the button says so rather than
       promising a sheet that will not appear. */
    setText('shareAction', canShareFiles() ? 'Share' : 'Save to Device');
  }

  function setShareFormat(withPortrait) {
    if (!state.share) return;
    state.share.portrait = withPortrait;
    renderShare();
  }

  function shareCharacter() {
    const s = state.share;
    if (!s) return;
    const file = characterFile([s.id], { portrait: s.portrait });
    if (!file) return;
    deliverCharacterFile(file, { via: 'send' });
  }

  /* ---- import --------------------------------------------------------- */

  function openImportPicker() {
    closeModal();
    const input = $('[data-import-file]');
    if (!input) return;
    // Cleared first, so choosing the same file twice in a row still fires
    // change — otherwise a failed import cannot be retried after a fix.
    input.value = '';
    input.click();
  }

  function readImportFile(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => showImportResult({ ok: false, title: 'Could not read that file', text: 'The file could not be opened. It may have been moved, or the browser was denied access to it.' });
    reader.onload = () => importCharacterFile(reader.result, file.name);
    reader.readAsText(file);
  }

  /* Read a file and say whether it is one of ours, WITHOUT changing anything.

     Split out from the import itself because the two have different jobs now:
     Settings asks the player to choose between adding and overwriting, and
     that question can only be put once the file has been read — "this holds 4
     characters, built against Core 0.1.0" is the whole reason the answer is
     informed. So parsing has to be able to happen without committing.

     Returns `{ file }` or `{ error: { title, text } }`. */
  function parseCharacterFile(text, filename) {
    let file;
    try { file = JSON.parse(text); }
    catch (_) {
      return { error: { title: 'Not a character file',
        text: `${filename} is not readable as JSON. Waypoint character files end in .waypoint.json — check you picked the right one.` } };
    }

    const head = file && file.waypointCharacter;
    if (!head || !Array.isArray(file.characters)) {
      return { error: { title: 'Not a character file',
        text: `${filename} is valid JSON, but it is not a Waypoint character file. It may be a compendium file, which is imported from Settings instead.` } };
    }
    // A file from a FUTURE version may describe things this app has no idea
    // how to store, and importing it half-understood would produce a character
    // that is quietly wrong. Refusing is the honest answer.
    if (head.schemaVersion > CHARACTER_FILE_VERSION) {
      return { error: { title: 'Made by a newer Waypoint',
        text: `This file is version ${head.schemaVersion}; this app understands version ${CHARACTER_FILE_VERSION}. Update the app, then import it again.` } };
    }
    // Everything the file calls a character that actually is an object. A file
    // whose array holds nothing usable is empty as far as this app is
    // concerned, and says so now rather than after the player has chosen how
    // to import it.
    const sources = file.characters.filter((c) => c && typeof c === 'object');
    if (!sources.length) {
      return { error: { title: 'Nothing to import', text: 'That file holds no characters.' } };
    }
    return { file: { ...file, characters: sources } };
  }

  function importCharacterFile(text, filename) {
    const read = parseCharacterFile(text, filename);
    if (read.error) { showImportResult({ ok: false, ...read.error }); return; }
    // The Characters screen's own Import button ADDS, and never asks. Its
    // comment in index.html says why: you reach for it when you have nothing
    // yet, and an import there is an addition to the list. Restoring over
    // what you already have is a backup operation, and it lives in Settings
    // where the question can be put properly.
    importCharacters(read.file, 'add');
  }

  /* A character id nothing on this device is using.

     Date-stamped like the single id the old importer minted, but checked and
     retried — a backup of six characters mints six of these inside the same
     millisecond, and `Date.now()` alone would hand them all the same storage
     key and quietly store five characters on top of each other. */
  function freshCharacterId() {
    let id = `c${Date.now().toString(36)}`;
    let n = 1;
    while (readSave(id) || roster.some((r) => r.id === id)) {
      id = `c${Date.now().toString(36)}${(n++).toString(36)}`;
    }
    return id;
  }

  /* Turn one character out of a file into a stored character under `id`.

     applySave() is the ONE way a stored character becomes a live one, so an
     imported file goes through exactly the same clamping, id-resolution and
     migration path as a local save. A hostile or hand-edited file therefore
     cannot introduce a state that a corrupt localStorage could not — which is
     why this rebinds the global `character` rather than building a save object
     by hand and writing it straight to storage. */
  function adoptCharacter(source, id) {
    // Mirrors openCharacter(): the seed id starts from the seed, so a file
    // that does not carry a field keeps the value that id has always had.
    character = id === SEED_CHARACTER.id
      ? JSON.parse(JSON.stringify(SEED_CHARACTER))
      : newCharacter(id);
    applySave(source);
    // Assigned either way, not just when there is one. Overwriting a character
    // who HAD a photo with a file that has none has to clear it, and
    // savePortrait() only removes the stored key when this is null.
    character.portrait = (typeof source.portrait === 'string'
      && /^data:image\/[a-z+]+;base64,/.test(source.portrait)) ? source.portrait : null;
    if (!character.name) character.name = 'Unnamed';

    // The Personae row goes in BEFORE the save, because save() refuses to
    // write a character the roster does not list — see the guard there.
    const row = {
      id, name: character.name, build: character.build,
      portrait: character.portrait, portraitView: character.portraitView,
    };
    const at = roster.findIndex((r) => r.id === id);
    if (at === -1) roster.push(row); else roster[at] = row;

    savePortrait();
    save();
  }

  /* Import every character in a parsed file.

     `mode` is 'add' or 'overwrite', and the difference is ONE question: does
     the character keep the id it came in with?

       add        — a new id, always. Importing your own export back must never
                    overwrite the character already sitting in the roster: the
                    file is a copy, not a claim on the slot it came from.
       overwrite  — the file's own id is honoured. A character already under
                    that id is replaced in place, keeping its position in the
                    list; one this device has never seen is added under it.
                    Characters the file says nothing about are left alone, so
                    restoring a backup cannot delete work that postdates it. */
  function importCharacters(file, mode) {
    const head = file.waypointCharacter;

    /* Entries first, so the characters below resolve against them. Those the
       local library is missing are taken from the file; anything it already
       has is left alone — the local copy is what this device's own spreadsheet
       describes, and it wins. */
    const wanted = {};
    for (const [id, e] of Object.entries(file.entries || {})) if (!byLibraryId(id)) wanted[id] = e;
    const restored = mergeEntries(wanted, { markImported: true });
    rememberImportedEntries(restored, wanted);

    save();                          // the character being left
    const wasOpen = character.id;

    const added = [];
    const replaced = [];
    const lost = [];
    /* "Knight 3", for a file holding exactly one character. Captured INSIDE
       the loop because buildLabel() reads the open character, and by the time
       the result is written the loop has moved on and the sheet has been
       handed back to whoever was there before. Only worth saying for one: in a
       list of six names, six class-and-level labels are noise. */
    let soleLabel = null;
    for (const source of file.characters) {
      const claimed = typeof source.id === 'string' ? source.id.trim() : '';
      const keepId  = mode === 'overwrite' && claimed;
      const existed = keepId && roster.some((r) => r.id === claimed);
      adoptCharacter(source, keepId ? claimed : freshCharacterId());
      if (file.characters.length === 1) soleLabel = buildLabel();
      (existed ? replaced : added).push(character.name);
      /* What did not survive: ids that were neither in the library nor in the
         file's own snapshot. Measured against the source rather than guessed,
         because a silent partial import is the failure this window exists to
         prevent. Named, because in a twelve-character backup "a skill could
         not be restored" without saying whose is not a usable report. */
      for (const l of referencedLoss(source)) lost.push(`${character.name}: ${l}`);
    }

    /* Back to whoever was open. An import is an addition to the list, and
       yanking someone off the sheet they were reading is not what they asked
       for — the loop above has left `character` bound to the last one it
       wrote, so this is not optional. Where that character is gone (an empty
       roster restored from a backup) the first row is opened instead, because
       something has to be. */
    const backTo = roster.some((r) => r.id === wasOpen) ? wasOpen : (roster[0] && roster[0].id);
    if (backTo) openCharacter(backTo);
    saveRoster();
    renderAll();
    renderSettings();                // the backup line now describes more characters

    const sentences = [];
    if (added.length) {
      sentences.push(soleLabel
        ? `${added[0]} — ${soleLabel} — was added to your Personae.`
        : `${nameList(added)} ${added.length === 1 ? 'was' : 'were'} added to your Personae.`);
    }
    if (replaced.length) {
      sentences.push(soleLabel
        ? `${replaced[0]} — ${soleLabel} — was overwritten with the version in the file.`
        : `${nameList(replaced)} ${replaced.length === 1 ? 'was' : 'were'} overwritten with the version in the file.`);
    }

    showImportResult({
      ok: true,
      title: file.characters.length === 1 ? 'Character imported' : 'Characters imported',
      text: sentences.join(' '),
      notes: [
        restored.length
          ? { text: `${restored.length} library ${restored.length === 1 ? 'entry was' : 'entries were'} restored from the file, because this device's compendium does not have ${restored.length === 1 ? 'it' : 'them'}.` }
          : null,
        head.library && head.library.version !== (LIBRARY.waypoint?.version)
          ? { text: `Built against ${head.library.title} ${head.library.version}; you are running ${LIBRARY.waypoint?.version || 'an unknown version'}.` }
          : null,
        ...lost.map((l) => ({ warn: true, text: `${l} could not be restored and was left off the sheet.` })),
      ].filter(Boolean),
    });
  }

  /* Library entries restored from a file, kept for next launch. Without this
     an import against an older compendium would look right once and then lose
     the same gear on the next reload — see IMPORTED_KEY. */
  function rememberImportedEntries(ids, bag) {
    if (!ids.length) return;
    try {
      const stored = JSON.parse(localStorage.getItem(IMPORTED_KEY) || '{}');
      for (const id of ids) stored[id] = bag[id];
      localStorage.setItem(IMPORTED_KEY, JSON.stringify(stored));
    } catch (_) { /* the entries still work this session */ }
  }

  /* "Elara", "Elara and Grimm", "Elara, Grimm and Vex", then "Elara, Grimm,
     Vex and 9 others". Capped because this goes in a sentence in a dialog, and
     a twelve-name list there is a paragraph nobody reads. */
  function nameList(names, cap = 3) {
    if (names.length <= cap) {
      return names.length < 2 ? (names[0] || '')
        : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
    }
    const rest = names.length - cap;
    return `${names.slice(0, cap).join(', ')} and ${rest} other${rest === 1 ? '' : 's'}`;
  }

  /* ================================================================== */
  /* SETTINGS                                                           */
  /* ------------------------------------------------------------------ */
  /* Four sections, and only two of them do anything yet.               */
  /*                                                                     */
  /*   Backup      every character in one file, and back again. Built    */
  /*               on characterFile()/importCharacters() — the SAME      */
  /*               format and the SAME importer the Personae list's      */
  /*               Export already uses, because `characters` was an      */
  /*               array from the first version for exactly this.        */
  /*   Compendium  the game's content in and out, per                    */
  /*               docs/library-schema.md.                               */
  /*   Appearance  FRAME ONLY. Controls, no effect — see below.          */
  /*   Feedback    buttons only; neither destination exists yet, so      */
  /*               both fall through to the not-yet-implemented stub.    */
  /*                                                                     */
  /* Both imports go through one door: pick a file, read and validate    */
  /* it, then ASK what to do with it. The question can only be put well  */
  /* once the file has been read — "this holds four characters" is the   */
  /* whole reason the answer is an informed one — which is why parsing   */
  /* is split from importing rather than being one call.                 */
  /* ================================================================== */

  /* ---- account ---------------------------------------------------------
     A PLACEHOLDER. There is no login flow, no server and no credential
     anywhere in this app — signing in flips a boolean and signing out flips
     it back. It exists so the two visual states can be designed and reviewed
     before any of that is built, and so the Home card and the Settings
     section have one source of truth to read from rather than two.

     When a real account system arrives, the shape below is what it has to
     satisfy: something that answers "signed in?" and "under what name?", and
     a render that pushes both into the DOM. Nothing else in the app reads
     this state, so replacing the middle of it should not reach past here.

     Persisted for the same reason the rest of the app is: sign in on Home,
     walk to Settings, and the Sign out button has to be there. Without a
     store that survives a reload, the two screens would disagree the moment
     the page refreshed. */
  const ACCOUNT_KEY = 'waypoint.account';

  /* The signed-OUT default is deliberate and is repeated in CSS: a missing or
     unreadable store must land here, never on a name nobody entered. */
  const account = { signedIn: false, name: 'John' };

  function loadAccount() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null'); }
    catch (_) { /* corrupt — fall through to the default */ }
    /* Read defensively: this is the one part of the app whose stored shape is
       expected to change once real accounts exist, so an old or half-written
       record should degrade to signed-out rather than throw on boot. */
    if (raw && typeof raw === 'object') {
      account.signedIn = raw.signedIn === true;
      if (typeof raw.name === 'string' && raw.name.trim()) account.name = raw.name.trim();
    }
    renderAccount();
  }

  function saveAccount() {
    try { localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account)); }
    catch (_) { /* private mode: the session still works, it just won't persist */ }
  }

  /* One attribute and one string. Both the Home card and the Settings section
     hold both states in the markup and let CSS choose, so there is nothing to
     build or tear down here — which is why sign-in can be instant and why
     neither screen needs to be the current view for this to be correct. */
  function renderAccount() {
    app.setAttribute('data-account', account.signedIn ? 'in' : 'out');
    setText('accountName', account.name);
  }

  function setSignedIn(next) {
    account.signedIn = next;
    saveAccount();
    renderAccount();
  }

  function renderSettings() {
    // Cheap to call and called from several places (entering the screen, after
    // an import, after a compendium reset), so it is written to be safe on a
    // screen nobody is looking at.
    renderBackupNote();
    renderCompendiumNote();
    renderAppearance();
  }

  /* ---- backup --------------------------------------------------------- */

  /* How many characters the export would hold.

     It used to report the file's WEIGHT alongside the count, and dropping that
     is what makes this cheap: weighing the file meant building it first —
     every character and every portrait serialised — to paint one subtitle on a
     screen a player may only be passing through. The count answers the
     question that actually matters ("did it get everything?") and costs a
     roster length. The share window still weighs its file, where the number
     decides whether an attachment will send. */
  function renderBackupNote() {
    const count = roster.length;
    setText('backupNote', count
      ? `${count} character${count === 1 ? '' : 's'}`
      : 'No characters yet — nothing to export.');
  }

  /* The whole roster, in roster order, portraits and all. Photos are NOT
     optional here the way they are on the share window: that window is about
     getting a character through an attachment limit, and this one is a backup
     — a backup that quietly drops every portrait is not a backup. */
  function exportBackup() {
    if (!roster.length) return;
    save();                          // unsaved edits belong in the backup
    const file = characterFile(roster.map((r) => r.id));
    if (!file) return;
    // Named as a backup whatever the count — see backupFilename().
    deliverCharacterFile(file, { via: 'save', name: backupFilename(file) });
  }

  /* ---- compendium ----------------------------------------------------- */

  /* Every top-level array in a library file is a collection (schema §1), so
     the collections are DISCOVERED rather than listed here. A compendium that
     grows a new one — spells, say — then exports and re-imports without a
     line of this file changing. */
  const collectionsOf = (bag) => Object.entries(bag || {})
    .filter(([key, val]) => key !== 'waypoint' && Array.isArray(val));

  // Flattened to the { id: entry } bag mergeEntries() takes, which is also the
  // shape a character file's `entries` arrives in — so one merge path serves
  // a compendium import and a character's snapshot alike.
  function entriesOf(bag) {
    const out = {};
    for (const [, list] of collectionsOf(bag)) {
      for (const e of list) if (e && typeof e === 'object' && typeof e.id === 'string') out[e.id] = e;
    }
    return out;
  }

  /* The compendium as this device currently has it — the generated library, or
     the one installed over it, plus anything restored from an imported
     character. Reads LIBRARY rather than the stored key, so what comes out is
     what the app is actually resolving against. */
  function compendiumFile() {
    const meta = LIBRARY.waypoint || {};
    const out = {
      waypoint: {
        schemaVersion: meta.schemaVersion ?? LIBRARY_FILE_VERSION,
        title: meta.title || 'Waypoint Compendium',
        version: meta.version || '0',
        updated: new Date().toISOString().slice(0, 10),
        author: meta.author || '',
      },
    };
    for (const [key, list] of collectionsOf(LIBRARY)) {
      // `imported` is a marker this app adds to entries restored from a
      // character file, not content — it must not travel on to the next
      // device as though the spreadsheet had said it. Same rule as the
      // character exporter's snapshot.
      out[key] = list.map(({ imported, ...clean }) => clean);
    }
    return out;
  }

  // Named for the CONTENT, not the day: a compendium is a published thing with
  // a version, and two exports of the same version are the same file.
  const compendiumFilename = (bag) =>
    `${fileSlug(bag.waypoint.title || 'compendium')}-${bag.waypoint.version || '0'}.library.json`;

  function renderCompendiumNote() {
    const meta = LIBRARY.waypoint || {};
    setText('libTitle', meta.title || 'Unknown compendium');
    setText('libVersion', meta.version ? `v${meta.version}` : '');
    // Not a count: which content is installed is the useful fact, and the
    // title and version above already name it. "Current content" says the
    // export will be what the app is running right now.
    setText('compendiumNote', 'Current content');
    // The undo only exists once there is something to undo.
    const reset = $('[data-compendium-reset]');
    if (reset) reset.hidden = !hasStoredLibrary();
  }

  /* Whether a compendium has been installed over the built-in one. Asks
     whether the KEY is there rather than whether storedLibrary() could use it:
     a key holding something corrupt is exactly when the player most needs the
     button that clears it, and storedLibrary() answers null for both "nothing
     installed" and "installed but unreadable". */
  const hasStoredLibrary = () => {
    try { return localStorage.getItem(LIBRARY_KEY) !== null; }
    catch (_) { return false; }      // storage unavailable — nothing is installed
  };

  function exportCompendium() {
    const bag = compendiumFile();
    const blob = new Blob([JSON.stringify(bag, null, 2)], { type: 'application/json' });
    saveBlob(blob, compendiumFilename(bag));
  }

  /* Read a compendium file without committing to it. Mirrors
     parseCharacterFile(): `{ file }` or `{ error: { title, text } }`. */
  function parseCompendiumFile(text, filename) {
    let bag;
    try { bag = JSON.parse(text); }
    catch (_) {
      return { error: { title: 'Not a compendium file',
        text: `${filename} is not readable as JSON. Compendium files are the library JSON described in the schema — check you picked the right one.` } };
    }
    // The other Waypoint file, named specifically. These two are the only
    // files the app writes and they are easy to mix up in a folder, so saying
    // which one this is beats "that is not a compendium".
    if (bag && bag.waypointCharacter) {
      return { error: { title: 'That is a character file',
        text: `${filename} holds characters, not content. Import it under Backup instead.` } };
    }
    if (!bag || typeof bag !== 'object' || Array.isArray(bag) || !bag.waypoint || typeof bag.waypoint !== 'object') {
      return { error: { title: 'Not a compendium file',
        text: `${filename} is valid JSON, but it has no \`waypoint\` block, so nothing in it can be identified.` } };
    }
    if (Number(bag.waypoint.schemaVersion) > LIBRARY_FILE_VERSION) {
      return { error: { title: 'Made for a newer Waypoint',
        text: `This compendium is schema version ${bag.waypoint.schemaVersion}; this app understands version ${LIBRARY_FILE_VERSION}. Update the app, then import it again.` } };
    }
    if (!Object.keys(entriesOf(bag)).length) {
      return { error: { title: 'Nothing to import',
        text: 'That compendium holds no entries with ids.' } };
    }
    return { file: bag };
  }

  /* Add: fold in what this device is missing and leave everything else alone.

     A local entry always wins, because it is the one the player's own
     spreadsheet describes — so this can restore gear a character needs without
     silently re-tuning armour that already exists here. It takes effect
     immediately: mergeEntries() writes the live catalogs and indexes, which is
     the same path a character import and the boot-time restore both take. */
  function addCompendium(bag) {
    const all = entriesOf(bag);
    const wanted = {};
    for (const [id, e] of Object.entries(all)) if (!byLibraryId(id)) wanted[id] = e;
    const added = mergeEntries(wanted, { markImported: true });
    rememberImportedEntries(added, wanted);
    const skipped = Object.keys(all).length - added.length;
    const title = bag.waypoint.title || 'that compendium';

    /* Reopened so the OPEN character resolves its ids against the enlarged
       library — an entry that has just arrived is no use to a sheet that
       already decided it could not find it. Guarded because the roster can be
       empty, in which case `character` is the blank placeholder that has no
       save to reopen. */
    if (roster.some((r) => r.id === character.id)) openCharacter(character.id);
    renderAll();
    renderSettings();
    showImportResult({
      ok: true,
      title: added.length ? 'Compendium entries added' : 'Nothing was missing',
      text: added.length
        ? `${added.length} ${added.length === 1 ? 'entry' : 'entries'} from ${title} ${added.length === 1 ? 'was' : 'were'} added.`
        : `Every entry in ${title} is already on this device.`,
      // Not a failure, and worth saying plainly: an entry this device already
      // has is the one its own spreadsheet describes, and it wins.
      notes: skipped
        ? [{ text: `${skipped} ${skipped === 1 ? 'entry was' : 'entries were'} already here and ${skipped === 1 ? 'was' : 'were'} left alone.` }]
        : [],
    });
  }

  /* Overwrite: install this compendium in place of the built-in one.

     Stored whole, then the page reloads. The reload is the point, not a
     shortcut: LIBRARY and every catalog and index built from it are read ONCE
     at load, and the open character resolved its ids against them. Rebuilding
     all of that in place would leave a dozen places for a stale reference to
     survive, and the one that survived would show up as a character's gear
     quietly reading the old numbers. Everything the app holds is already in
     localStorage, so a reload costs nothing but the moment.

     Which is also why the result window says so before it happens, and the
     reload waits for the player to dismiss it — see closeModal(). */
  function installCompendium(bag) {
    try {
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(bag));
    } catch (_) {
      showImportResult({ ok: false, title: 'No room for it',
        text: 'This browser\'s storage is full, so the compendium could not be saved. Deleting a character portrait or two is usually enough to make room.' });
      return;
    }
    const count = Object.keys(entriesOf(bag)).length;
    // A version is optional in the schema, so it is joined in only when there
    // is one rather than leaving a gap where it would have been.
    const label = [bag.waypoint.title || 'The compendium', bag.waypoint.version].filter(Boolean).join(' ');
    showImportResult({
      ok: true,
      title: 'Compendium installed',
      text: `${label} is now this device's content — ${count} ${count === 1 ? 'entry' : 'entries'}.`,
      notes: [
        { text: 'Waypoint will reload to apply it.' },
        { warn: true, text: 'Anything your characters use that this compendium does not carry will drop off their sheets. Their saves are untouched, so restoring the built-in compendium puts it back.' },
      ],
      reload: true,
    });
  }

  /* Drop the installed compendium and go back to the generated one.

     Asked first, through the same window the imports use — with one action,
     because there is only one thing this can do. It is worth asking at all
     because the compendium being discarded may have come from somewhere the
     player cannot easily get it back from; it is not worth the language of the
     character delete, because nothing a player MADE is lost. Characters are
     stored apart from content and are not touched. */
  function askCompendiumReset() {
    askFile({
      title: 'Restore the built-in compendium?',
      text: `${LIBRARY.waypoint?.title || 'The imported compendium'} will be removed and Waypoint will go back to the content it ships with.`,
      notes: [
        { text: 'Your characters are stored apart from the compendium and are not touched.' },
        { warn: true, text: 'The imported compendium itself is discarded. If you cannot get that file again, export it first.' },
      ],
      actions: [{ mode: 'reset', danger: true, label: 'Restore Built-in Compendium' }],
      run: () => resetCompendium(),
    });
  }

  function resetCompendium() {
    try { localStorage.removeItem(LIBRARY_KEY); }
    catch (_) { /* nothing else to try; the reload below will show the truth */ }
    showImportResult({
      ok: true,
      title: 'Built-in compendium restored',
      text: 'The imported compendium has been removed. Waypoint will reload with the content it ships with.',
      reload: true,
    });
  }

  /* ---- one door for both imports -------------------------------------- */

  /* `kind` is 'characters' or 'compendium'. One picker serves both, because
     what a file turns out to be is decided by reading it, not by which button
     opened it — and two hidden inputs would be two places for the "clear it
     first" fix below to be applied to one and missed on the other. */
  function openSettingsFile(kind) {
    const input = $('[data-settings-file]');
    if (!input) return;
    state.filePick = kind;
    // Cleared first, so choosing the same file twice in a row still fires
    // change — otherwise a failed import cannot be retried after a fix.
    input.value = '';
    input.click();
  }

  function readSettingsFile(input) {
    const kind = state.filePick;
    const file = input.files && input.files[0];
    if (!file || !kind) return;
    const reader = new FileReader();
    reader.onerror = () => showImportResult({ ok: false, title: 'Could not read that file',
      text: 'The file could not be opened. It may have been moved, or the browser was denied access to it.' });
    reader.onload = () => offerImport(kind, reader.result, file.name);
    reader.readAsText(file);
  }

  /* Validated, then put as a question. Nothing has been written at this point
     and nothing will be until a button in the window is pressed, which is what
     makes dismissing it a real decline rather than a cancel that came too
     late. */
  function offerImport(kind, text, filename) {
    if (kind === 'compendium') {
      const read = parseCompendiumFile(text, filename);
      if (read.error) { showImportResult({ ok: false, ...read.error }); return; }
      askCompendiumImport(read.file);
      return;
    }
    const read = parseCharacterFile(text, filename);
    if (read.error) { showImportResult({ ok: false, ...read.error }); return; }
    askCharacterImport(read.file, filename);
  }

  function askCharacterImport(file, filename) {
    const names = file.characters.map((c) => (
      typeof c.name === 'string' && c.name.trim() ? c.name.trim() : 'Unnamed'
    ));
    const n = names.length;
    // Characters in the file that this device already has under the same id —
    // the only ones Overwrite would touch. Counted rather than described in
    // the abstract, because "matching" means nothing until you know whether it
    // matches anything.
    const matching = file.characters.filter((c) => (
      typeof c.id === 'string' && roster.some((r) => r.id === c.id.trim())
    )).length;
    const head = file.waypointCharacter || {};

    askFile({
      title: n === 1 ? 'Import this character?' : `Import ${n} characters?`,
      text: `${filename} holds ${nameList(names)}.`,
      notes: [
        head.exported ? { text: `Exported ${head.exported}.` } : null,
        head.library && head.library.version !== (LIBRARY.waypoint?.version)
          ? { text: `Built against ${head.library.title} ${head.library.version}; you are running ${LIBRARY.waypoint?.version || 'an unknown version'}.` }
          : null,
        matching
          ? { warn: true, text: `${matching} of ${n === 1 ? 'them' : 'these'} ${matching === 1 ? 'is' : 'are'} already on this device. Overwriting replaces ${matching === 1 ? 'that sheet' : 'those sheets'} with the version in the file; adding keeps both copies.` }
          : { text: `Nothing in this file is on this device yet, so nothing can be overwritten. Restoring in place keeps the ids ${n === 1 ? 'it came' : 'they came'} in with, which is what lets a later backup match ${n === 1 ? 'it' : 'them'} up again.` },
        // Said in both cases, because it is the reassurance that makes
        // Overwrite pressable: a restore replaces what the file names and
        // touches nothing else.
        { text: 'Characters this file says nothing about are left alone either way.' },
      ].filter(Boolean),
      actions: [
        { mode: 'add', label: n === 1 ? 'Add as New' : 'Add All as New' },
        { mode: 'overwrite', danger: !!matching, label: matching ? 'Overwrite Matching' : 'Restore in Place' },
      ],
      run: (mode) => importCharacters(file, mode),
    });
  }

  function askCompendiumImport(bag) {
    const all = entriesOf(bag);
    const count = Object.keys(all).length;
    const missing = Object.keys(all).filter((id) => !byLibraryId(id)).length;
    const meta = bag.waypoint;

    askFile({
      title: 'Import this compendium?',
      text: `${meta.title || 'Untitled compendium'}${meta.version ? ` ${meta.version}` : ''} — ${count} ${count === 1 ? 'entry' : 'entries'}.`,
      notes: [
        meta.updated ? { text: `Updated ${meta.updated}${meta.author ? `, by ${meta.author}` : ''}.` } : null,
        missing
          ? { text: `${missing} of them ${missing === 1 ? 'is' : 'are'} not on this device yet. Adding brings ${missing === 1 ? 'that one' : 'those'} in and leaves everything else as it is.` }
          : { text: 'Every entry in it is already on this device, so adding would change nothing.' },
        { warn: true, text: 'Replacing re-points every character at this content. Anything they use that it does not carry drops off their sheets until the old compendium is back.' },
      ].filter(Boolean),
      actions: [
        { mode: 'add', label: missing ? `Add the ${missing} Missing` : 'Add Missing Entries' },
        { mode: 'overwrite', danger: true, label: 'Replace the Compendium' },
      ],
      run: (mode) => (mode === 'overwrite' ? installCompendium(bag) : addCompendium(bag)),
    });
  }

  /* The generic ask window. Everything it shows — title, prose, notes and the
     buttons themselves — comes from the descriptor, and the descriptor carries
     the `run` that acts on the answer. So a new question is a call to this
     rather than another dialog in index.html with its own bindings to keep in
     step, which is what lets the two-way import question and the one-way
     compendium reset share a window. */
  function askFile(ask) {
    state.ask = ask;
    setText('fileAskTitle', ask.title);
    setText('fileAskText', ask.text);
    fillList('fileAskNotes', (ask.notes || [])
      .map((n) => `<p class="import__note${n.warn ? ' import__note--warn' : ''}">${esc(n.text)}</p>`).join(''));
    fillList('fileAskActions', ask.actions
      .map((a) => `<button class="btn-save${a.danger ? ' btn-save--danger' : ''}"`
        + ` data-file-apply="${esc(a.mode)}">${esc(a.label)}</button>`).join(''));
    app.setAttribute('data-modal', 'file-ask');
  }

  function applyAsk(mode) {
    const ask = state.ask;
    state.ask = null;
    if (!ask) return;
    // Closed BEFORE the work, for the reason the calculator closes before the
    // downed notice: whatever this runs ends in a result window of its own,
    // and closing afterwards would immediately dismiss it.
    closeModal();
    ask.run(mode);
  }

  /* ---- appearance — the frame, and nothing behind it ------------------
     Every control here draws its selection and changes nothing else. The
     design tokens these would drive live in :root in style.css and are
     expected to move before any of this is wired up, so what is built is the
     shape of the choice rather than a half-applied theme that would be harder
     to finish than an unstarted one.

     The lists are data so that adding a theme later is one line here and one
     token block there. */
  /* Mode glyphs. Drawn on Lucide's 0 0 24 24 bed like the rest of the app's
     icons, stroked rather than filled so they take their colour from the tile
     and shift with its selected state.

     .mode-pick__icon is 26px and its svg rule fills that box, so the artwork
     is scaled up ~1.08x; stroke 1.5 lands at ~1.6 effective, which is the
     weight these tiles were already drawn at. The earlier set was bespoke, and
     Auto's right half was a FILLED half-disc — that exception is gone, because
     sun-moon says "either one" with an eclipsed crescent instead of a disc cut
     down the middle, and nothing here is filled any more. */
  const MODE_GLYPHS = {
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"'
      + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<circle cx="12" cy="12" r="4"/>'
      + '<path d="M12 2v2"/><path d="M12 20v2"/>'
      + '<path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/>'
      + '<path d="M2 12h2"/><path d="M20 12h2"/>'
      + '<path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"'
      + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>',
    system: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"'
      + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M12 2v2"/>'
      + '<path d="M14.837 16.385a6 6 0 1 1-7.223-7.222c.624-.147.97.66.715 1.248a4 4 0 0 0 5.26 5.259c.589-.255 1.396.09 1.248.715"/>'
      + '<path d="M16 12a4 4 0 0 0-4-4"/>'
      + '<path d="m19 5-1.256 1.256"/><path d="M20 12h2"/></svg>',
  };

  const APPEARANCE_MODES = [
    { id: 'light',  label: 'Light' },
    { id: 'dark',   label: 'Dark' },
    /* "Auto" rather than "Match System": it sits under a 3-across tile that a
       two-word label would wrap, and it is the word the rest of the platform
       uses for the same setting. The id stays `system` — it is what the stored
       preference already holds, and renaming it would strand that. */
    { id: 'system', label: 'Auto' },
  ];

  const APPEARANCE_THEMES = [
    // The one the app actually wears today, named for the design direction the
    // stylesheet is built on — so the default chip is not a promise of
    // anything new.
    { id: 'journal', label: 'Field Journal' },
    { id: 'ink',     label: 'Ink & Iron' },
    { id: 'ember',   label: 'Ember' },
    { id: 'moss',    label: 'Moss' },
    { id: 'dusk',    label: 'Dusk' },
  ];

  function renderAppearance() {
    // aria-pressed, matching the share window's format chips and the weapon
    // tags: the same control doing the same job of reporting which one of a
    // set is chosen. role="radio" would describe an exclusive set more
    // precisely, but every other one-of-many control in this app is a pressed
    // button, and CLAUDE.md puts consistency above the finer ARIA.
    const chips = (list, chosen, attr) => list.map((o) => {
      const on = o.id === chosen;
      return `<button class="tag-pick${on ? ' is-on' : ''}" ${attr}="${esc(o.id)}"`
        + ` aria-pressed="${on}">${esc(o.label)}</button>`;
    }).join('');

    /* Mode gets picture tiles instead: glyph above, word below, whole tile is
       the target. The glyph is trusted markup from MODE_GLYPHS, never player
       input, so it goes in unescaped — the label beside it is escaped as
       everything from a data list is. */
    const modes = APPEARANCE_MODES.map((o) => {
      const on = o.id === state.appearance.mode;
      return `<button class="mode-pick${on ? ' is-on' : ''}" data-ap-mode="${esc(o.id)}"`
        + ` aria-pressed="${on}">`
        + `<span class="mode-pick__icon">${MODE_GLYPHS[o.id] || ''}</span>`
        + `<span class="mode-pick__label">${esc(o.label)}</span>`
        + '</button>';
    }).join('');

    fillList('apMode',  modes);
    fillList('apTheme', chips(APPEARANCE_THEMES, state.appearance.theme, 'data-ap-theme'));
  }

  /* Ids the imported character named that nothing can resolve — not the local
     library, and not the file's own snapshot either. Run AFTER the merge, so
     what it reports is genuinely gone rather than merely not-yet-loaded. */
  function referencedLoss(source) {
    const lost = [];
    const check = (id, what) => { if (id && !byLibraryId(id)) lost.push(`${what} "${id}"`); };
    const b = source.build || {};
    for (const id of [b.origin, ...(Array.isArray(b.levels) ? b.levels : [])]) check(id, 'Subclass');
    for (const k of source.skills || []) check(k && k.id, 'Skill');
    for (const h of source.hands || []) check(typeof h === 'string' ? h : h && h.id, 'Weapon');
    for (const g of source.equipment || []) check(g, 'Gear');
    check(source.armorWorn, 'Armour');
    return lost;
  }

  /* The one window both outcomes land in. `ok` decides a single attribute and
     a single word; the stylesheet turns that into a green tick or a red bang.
     Writing two modals for "it worked" and "it did not" would mean two places
     to keep the wording and the dismiss behaviour in step, for one glyph's
     worth of difference. */
  function showImportResult({ ok, title, text, notes, reload }) {
    const card = $('.modal--import .modal__card');
    if (card) card.setAttribute('data-import-state', ok ? 'ok' : 'error');
    /* A compendium install takes effect on the next load, so the window that
       reports it is also the thing holding the reload back until it has been
       read. Set here rather than reloading on the spot: a page that vanishes
       the instant you press a button never gets to say what it did. Cleared by
       closeModal(), which is the only way out of this window. */
    state.reloadOnClose = !!reload;
    setText('importTitle', title);
    setText('importText', text);
    // "Done" closes something that finished; "Close" closes something that did
    // not. Neither offers another file — retrying is the Import button on the
    // Characters page, which is where the player was standing a moment ago.
    setText('importDismiss', ok ? 'Done' : 'Close');
    fillList('importNotes', (notes || [])
      .map((n) => `<p class="import__note${n.warn ? ' import__note--warn' : ''}">${esc(n.text)}</p>`).join(''));
    app.setAttribute('data-modal', 'import');
  }

  /* ================================================================== */
  /* CREATE CHARACTER — the six-step wizard                             */
  /* ------------------------------------------------------------------ */
  /* The player's guide numbers character creation 1-6, and so does this: */
  /* choose a class, choose a subclass, spend attributes, spend skills,   */
  /* take a loadout, write an origin.                                     */
  /*                                                                      */
  /* The draft lives in state.create and NOWHERE else. It is not a        */
  /* half-built roster entry and it is not written to storage, so         */
  /* abandoning creation leaves nothing to clean up — cancel() is one     */
  /* assignment. Only finishCreate() turns a draft into a character.      */
  /* ================================================================== */

  /* Warrior / Rogue / Mage. Purely a reading aid: they group nine classes so
     the eye lands on three shelves instead of one list. A family is not a
     choice, grants nothing, and no rule asks which one a class is in — which
     is exactly why it is code rather than library content, the same call
     docs/library-schema.md §6 makes for the six attributes and the five skill
     categories. (There is no classes sheet to put it on either — classes are
     derived from subclasses.csv, §4.2.) Order, here and on the page, is the
     guide's order. */
  const FAMILIES = [
    { name: 'Warrior', classIds: ['class.barbarian', 'class.fighter', 'class.knight'] },
    { name: 'Rogue',   classIds: ['class.rogue', 'class.monk', 'class.ranger'] },
    { name: 'Mage',    classIds: ['class.elementalist', 'class.magician', 'class.occultist'] },
  ];

  const WIZARD_STEPS = [
    { key: 'class',      label: 'Class' },
    { key: 'subclass',   label: 'Subclass' },
    { key: 'attributes', label: 'Attrib' },
    { key: 'skills',     label: 'Skills' },
    { key: 'loadout',    label: 'Gear' },
    { key: 'origin',     label: 'Origin' },
  ];
  const stepIndex = (key) => WIZARD_STEPS.findIndex((s) => s.key === key);

  // The one genuinely creation-only budget left (guide, steps 3-5): you are
  // handed three pieces of gear at creation and buy the rest in play, so
  // unlike the attribute and skill budgets this number has no per-level half
  // and nothing outside the wizard asks about it. Its former neighbour
  // ATTR_POINTS_AT_CREATION moved up beside SKILL_POINTS_AT_CREATION once Edit
  // Character could spend attribute points too.
  const GEAR_AT_CREATION = 3;

  // The draft's build, in the same shape the character model uses — so every
  // rule already written (proficiencies, healthMax, tier0Traits) can be asked
  // about a character who does not exist yet, without a second implementation.
  const draftBuild = (d) => ({ origin: d.subclassId, levels: [], hpFrom: null });

  function startCreate() {
    state.create = {
      step: 'class',
      // Which steps have been reached, so the rail knows what is a button and
      // what is not yet. A Set would be tidier but this is serialised nowhere
      // and read on every paint; an array keeps the rail's order obvious.
      reached: ['class'],
      expanded: null,        // the one open accordion card, or null
      classId: null,
      subclassId: null,
      stats: {},             // attribute name -> points placed
      skills: {},            // library skill id -> rank bought
      armorWorn: null,
      // Whether armour has been ANSWERED, which `armorWorn` cannot say on its
      // own: null means both "unarmoured" and "not yet decided", and the
      // accordion has to tell those apart to know when to move on.
      armorPicked: false,
      hands: [],             // [{ id }] — same shape as character.hands
      // Fixed-length SLOTS, not a set. Duplicates are legal — three Health
      // Potions is an ordinary thing to carry — and a slot is what makes the
      // same id expressible more than once.
      equipment: Array(GEAR_AT_CREATION).fill(null),
      gearSection: 'hands',  // which loadout accordion is open
      name: '', origin: '',
      // Set when changing a class or subclass invalidates a later choice.
      // Announcing it is the whole point: a silently shorter list is how a
      // player loses work without noticing they have.
      //
      // { step, text, shown } — it belongs to the step that LOST something,
      // which is often not the step the player is on when the change happens:
      // changing class on step 1 prunes the loadout on step 5. So it waits
      // there, is marked `shown` when that step paints it, and is only
      // discarded once it has been seen and navigated away from.
      notice: null,
    };
    app.setAttribute('data-view', 'create');
    app.setAttribute('data-menu', 'closed');
    renderWizard();
  }

  function cancelCreate() {
    state.create = null;
    app.setAttribute('data-view', 'characters');
  }

  /* ---- moving between steps ------------------------------------------
     Going BACK never discards anything, and going back and choosing
     differently only discards what the new choice made illegal. That is the
     whole contract of this section, and it is enforced in one place:
     chooseClass() and chooseSubclass() below. */
  function gotoStep(key) {
    const d = state.create;
    if (!d || stepIndex(key) === -1) return;
    // A step you have not reached is not navigable — the rail renders it
    // inert, and this is the check behind that, so a stray click cannot skip
    // step 1 and land on a subclass list with no class chosen.
    if (!d.reached.includes(key)) return;
    d.step = key;
    // A notice is discarded only once it has actually been read and left
    // behind. Clearing it on any navigation would have thrown away the very
    // notice being carried TO the step it is about.
    if (d.notice && d.notice.shown && d.notice.step !== key) d.notice = null;
    // Arriving at either of the two choice steps opens the card you chose, so
    // returning to compare is expand-another rather than hunt-for-yours.
    if (key === 'class' && d.classId) d.expanded = d.classId;
    if (key === 'subclass' && d.subclassId) d.expanded = d.subclassId;
    renderWizard();
    const scroll = $('.wizard__scroll');
    if (scroll) scroll.scrollTop = 0;
  }

  function advanceStep() {
    const d = state.create;
    if (!d || !canAdvance()) return;
    const next = WIZARD_STEPS[stepIndex(d.step) + 1];
    if (!next) { finishCreate(); return; }
    if (!d.reached.includes(next.key)) d.reached.push(next.key);
    // Arriving at a step opens the obvious card rather than showing six
    // collapsed rows: on the subclass step there are only three, and the
    // player has just been reading about their class.
    d.expanded = null;
    gotoStep(next.key);
  }

  function retreatStep() {
    const d = state.create;
    if (!d) return;
    const prev = WIZARD_STEPS[stepIndex(d.step) - 1];
    // Backing out of step 1 leaves creation altogether, which is what the
    // back arrow in the top bar means there.
    if (!prev) { cancelCreate(); return; }
    // Reopening the card you chose is gotoStep's job, so that the rail and the
    // Back button behave the same way rather than only one of them being kind.
    gotoStep(prev.key);
  }

  /* ---- the two choices that can invalidate later work ---------------- */

  function chooseClass(classId) {
    const d = state.create;
    if (!d) return;
    // Re-picking the SAME class must not disturb anything downstream — that is
    // what makes going back to read the other classes safe.
    if (d.classId === classId) { advanceStep(); return; }
    d.classId = classId;
    // A subclass belongs to exactly one class, so a different class means the
    // chosen subclass is no longer a legal choice rather than merely a
    // questionable one. Everything that hung off it goes with it.
    if (d.subclassId) {
      d.subclassId = null;
      d.notice = { step: 'subclass', shown: false,
        text: 'Changing class cleared your subclass. Your attributes, skills and origin are untouched.' };
      // The loadout is deliberately NOT pruned here. Between losing a subclass
      // and choosing the next one there is no build to judge it against, and
      // pruning against nothing would throw everything away — including gear
      // the new subclass turns out to permit. A Knight in heavy armour who
      // switches to Fighter should keep it: The Jugg trains Heavy too.
      // chooseSubclass() prunes once there is something to prune against.
    }
    advanceStep();
  }

  function chooseSubclass(subclassId) {
    const d = state.create;
    if (!d) return;
    if (d.subclassId === subclassId) { advanceStep(); return; }
    d.subclassId = subclassId;
    pruneLoadout();
    advanceStep();
  }

  /* Drop loadout entries the current subclass cannot take, and say so.

     Creation is the one time armour and weapons are limited to what the class
     permits (guide, step 5) — using gear untrained is legal later, but it is
     not something creation hands you. So a subclass change really does make a
     previous pick illegal, and leaving it in place would produce a starting
     character the rules do not allow.

     Adventuring gear is never pruned: nothing about it depends on a class. */
  function pruneLoadout() {
    const d = state.create;
    const build = draftBuild(d);
    const lost = [];

    if (d.armorWorn) {
      const a = itemOf(d.armorWorn);
      if (!a || !proficiencies('armorTypes', build).includes(a.prof)) {
        lost.push(a ? a.name : 'your armour');
        d.armorWorn = null;
        // The answer goes with the armour. Leaving armorPicked set would mark
        // the section done while showing nothing chosen, and the accordion
        // would skip straight past a decision the player now has to make again.
        d.armorPicked = false;
      }
    }
    d.hands = d.hands.filter((h) => {
      const g = itemOf(h.id);
      if (g && isTrained(g, build)) return true;
      lost.push(g ? g.name : 'a held item');
      return false;
    });

    if (lost.length) {
      d.notice = { step: 'loadout', shown: false,
        text: `${lost.join(' and ')} ${lost.length === 1 ? 'is' : 'are'} not permitted to this subclass, so ${lost.length === 1 ? 'it has' : 'they have'} been taken off your loadout.` };
    }
  }

  /* ---- budgets ------------------------------------------------------- */
  const attrSpent  = () => Object.values(state.create.stats).reduce((n, v) => n + v, 0);
  const skillSpent = () => Object.values(state.create.skills).reduce((n, v) => n + v, 0);
  const skillCount = () => Object.keys(state.create.skills).length;
  // Named apart from the sheet's handsUsed(), which reads the open character —
  // this one reads the draft, and the two are live at the same time.
  const draftHandsUsed = () => state.create.hands.reduce((n, h) => n + (itemOf(h.id)?.hands || 0), 0);

  /* May the player leave this step? A wizard completeness check, NOT the
     rules-permission gate the sheet deliberately avoids: over-spending is
     impossible here because the steppers stop at the budget, and what is
     blocked is only leaving a step half-answered. */
  function canAdvance() {
    const d = state.create;
    if (!d) return false;
    switch (d.step) {
      case 'class':      return !!d.classId;
      case 'subclass':   return !!d.subclassId;
      case 'attributes': return attrSpent() === ATTR_POINTS_AT_CREATION;
      // Four points into four different skills — the count is checked as well
      // as the total, because 2+2 into two skills spends the budget without
      // satisfying the rule.
      case 'skills':     return skillSpent() === SKILL_POINTS_AT_CREATION
                             && skillCount() === SKILL_POINTS_AT_CREATION;
      // Every loadout is legal, including an empty one: unarmoured is a real
      // state, and so is walking out with nothing in hand.
      case 'loadout':    return true;
      case 'origin':     return !!d.name.trim();
      default:           return false;
    }
  }

  // Said under the Continue button when it will not move, in the words of the
  // rule that is unmet rather than a generic "complete this step".
  function advanceHint() {
    const d = state.create;
    if (!d || canAdvance()) return '';
    switch (d.step) {
      case 'class':      return 'Choose a class to continue.';
      case 'subclass':   return 'Choose a subclass to continue.';
      case 'attributes': {
        const left = ATTR_POINTS_AT_CREATION - attrSpent();
        return `${left} attribute point${left === 1 ? '' : 's'} still to place.`;
      }
      case 'skills': {
        const left = SKILL_POINTS_AT_CREATION - skillSpent();
        if (left > 0) return `${left} skill point${left === 1 ? '' : 's'} still to place.`;
        return `Creation spreads its points across four different skills — you have ${skillCount()}.`;
      }
      case 'origin':     return 'A character needs a name.';
      default:           return '';
    }
  }

  /* ---- finishing ------------------------------------------------------ */

  /* Turn the draft into a real character, save it, and open it.

     What is STORED is only what the player chose. Health, mana, wounds,
     patches, proficiencies and both Tier 0 traits are all derived from the
     build, so none of them is copied here — the new character reads them from
     the library exactly as an existing one does, and a later balance change
     reaches it too. The four numbers set below are the only exception,
     because they are what the character has SPENT, and a new one has spent
     nothing: they start full. Action and Reaction Points are the same kind of
     number and are absent for a different reason — their ceilings read no
     build at all, so newCharacter() can seed them and this block has nothing
     to add. */
  function finishCreate() {
    const d = state.create;
    if (!d || !canAdvance()) return;

    save();                       // the character being left, before anything moves

    const c = newCharacter(`c${Date.now().toString(36)}`);
    c.name = d.name.trim().slice(0, IDENTITY_MAX);
    c.build = draftBuild(d);
    c.stats = ATTRIBUTES.map((name) => ({ name, value: d.stats[name] || 0 }));
    c.skills = Object.entries(d.skills).map(([id, rank]) => ({ id, rank }));
    c.armorWorn = d.armorWorn;
    c.hands = d.hands.map((h) => ({ id: h.id }));
    // Slots become the flat list the character model keeps. Empty slots drop
    // out; duplicates survive, which is the point of slots in the first place.
    c.equipment = d.equipment.filter(Boolean);

    // A backstory becomes the first journal note rather than a field of its
    // own: it is prose the player wrote about their character, which is what
    // the journal already is. Kept out of the model entirely when blank —
    // "no backstory" is an explicitly permitted answer (guide, step 6), not
    // an empty note waiting to be filled in.
    if (d.origin.trim()) {
      c.notes = [{ id: `note-${Date.now()}`, created: Date.now(), title: 'Origin', body: d.origin.trim() }];
    }

    // Rebound before the pools are read, because healthMax() and manaMax()
    // derive from the OPEN character's build.
    character = c;
    c.health  = healthMax();
    c.mana    = manaMax();
    c.wounds  = 0;
    c.patches = patchesMax();

    roster.push({
      id: c.id, name: c.name,
      build: c.build, portrait: null, portraitView: c.portraitView,
    });
    save();
    saveRoster();

    state.create = null;
    renderAll();
    app.setAttribute('data-view', 'sheet');
    app.setAttribute('data-tab', 'action');
  }

  /* ------------------------------------------------------------------ */
  /* DRAFT MUTATIONS — every one repaints, none of them saves           */
  /* ------------------------------------------------------------------ */

  function stepDraftAttr(spec) {
    const d = state.create;
    const [name, delta] = [spec.slice(0, spec.lastIndexOf(':')), Number(spec.slice(spec.lastIndexOf(':') + 1))];
    if (!ATTRIBUTES.includes(name)) return;
    const now = d.stats[name] || 0;
    const next = now + delta;
    // The budget is a hard stop HERE, unlike on the sheet, because creation
    // hands out exactly four points and there is no GM at this screen to hand
    // out a fifth. Level-ups keep the sheet's reported-not-gated behaviour.
    if (next < 0 || attrSpent() + delta > ATTR_POINTS_AT_CREATION) return;
    if (next === 0) delete d.stats[name]; else d.stats[name] = next;
    renderWizAttrs();
    renderWizardFoot();
  }

  /* One tap takes a skill, another gives it back. Creation buys exactly four
     skills at one point each, so there is nothing to step through — a rank
     control here would offer a state the rules do not have. */
  function toggleDraftSkill(id) {
    const d = state.create;
    if (!skillOf(id)) return;
    if (d.skills[id]) delete d.skills[id];
    else if (skillSpent() < SKILL_POINTS_AT_CREATION) d.skills[id] = 1;
    else return;
    renderWizSkills();
    renderWizardFoot();
  }

  /* The loadout and the two class choices, all addressed as "kind:id" so one
     attribute carries every pick on the screen. */
  function pickDraft(spec) {
    const d = state.create;
    const at = spec.indexOf(':');
    const kind = spec.slice(0, at);
    const id = spec.slice(at + 1);

    if (kind === 'class') { chooseClass(id); return; }
    if (kind === 'sub')   { chooseSubclass(id); return; }

    // Armour is the one loadout section that stays a plain list: there is only
    // ever one of it, so a slot and a modal would be ceremony around a choice
    // of three. "none" is an id the catalog does not have, on purpose —
    // unarmoured is an answer, and answering is what armorPicked records.
    if (kind !== 'armor') return;
    d.armorWorn = id === 'none' ? null : (itemOf(id) ? id : null);
    d.armorPicked = true;

    d.notice = null;         // the player has acted; the explanation has served its purpose
    advanceGearSection();
    renderWizLoadout();
    renderWizardFoot();
  }

  /* ------------------------------------------------------------------ */
  /* WIZARD RENDERING                                                   */
  /* ------------------------------------------------------------------ */

  function renderWizard() {
    const d = state.create;
    if (!d) return;
    app.setAttribute('data-create-step', d.step);
    renderWizardRail();
    // Only the visible step is painted. The other five are display:none, so
    // rebuilding them would be work nobody can see — and on the skills and
    // loadout steps that is sixty-odd rows of markup per keystroke.
    switch (d.step) {
      case 'class':      renderWizClasses();   break;
      case 'subclass':   renderWizSubclasses(); break;
      case 'attributes': renderWizAttrs();     break;
      case 'skills':     renderWizSkills();    break;
      case 'loadout':
        // Arriving opens the first section that still wants an answer, so
        // returning to a half-finished loadout resumes rather than restarting.
        if (gearSectionDone(d, d.gearSection)) advanceGearSection();
        renderWizLoadout();
        break;
      case 'origin':     renderWizOrigin();    break;
    }
    renderWizardFoot();
  }

  function renderWizardRail() {
    const d = state.create;
    const at = stepIndex(d.step);
    fillList('wizRail', WIZARD_STEPS.map((s, i) => {
      const state_ = i === at ? 'here' : i < at ? 'done' : 'todo';
      const reachable = d.reached.includes(s.key);
      return `<button class="wizard__pip" data-state="${state_}" data-wiz-step="${s.key}"${
        reachable ? '' : ' disabled'}${i === at ? ' aria-current="step"' : ''}>
        <span class="wizard__pip-dot"></span><span>${esc(s.label)}</span>
      </button>`;
    }).join(''));
  }

  function renderWizardFoot() {
    const d = state.create;
    const last = stepIndex(d.step) === WIZARD_STEPS.length - 1;
    setText('wizBack', stepIndex(d.step) === 0 ? 'Cancel' : 'Back');
    setText('wizNext', last ? 'Create' : 'Continue');
    setText('wizHint', advanceHint());
    const next = $('[data-wiz="next"]');
    if (next) next.disabled = !canAdvance();
  }

  // The notice raised when a class or subclass change invalidated something,
  // rendered at the top of whichever step lost the work.
  const noticeHtml = () => {
    const n = state.create.notice;
    if (!n || n.step !== state.create.step) return '';
    n.shown = true;     // now it may be discarded on the way out — see gotoStep()
    return `<div class="wizard__budget" data-state="over">${esc(n.text)}</div>`;
  };

  /* ---- step 1: classes, in three family bands ---- */
  function renderWizClasses() {
    const d = state.create;
    fillList('wizClasses', noticeHtml() + FAMILIES.map((fam) => {
      const cards = fam.classIds
        .map(classOf)
        .filter(Boolean)          // a class with no started subclasses is still listed; one absent from the library is not
        .map((c) => classCard(c, d))
        .join('');
      return cards ? `<div class="wizard__family">${esc(fam.name)}</div>${cards}` : '';
    }).join(''));
  }

  function classCard(c, d) {
    const open = d.expanded === c.id;
    const chosen = d.classId === c.id;
    const subs = subclassesOf(c.id);
    return `
      <div class="pick-card"${open ? ' data-open' : ''}${chosen ? ' data-chosen' : ''}>
        <button class="pick-card__head" data-wiz-expand="${c.id}" aria-expanded="${open}">
          <span class="pick-card__name">${esc(c.name)}
            <span class="pick-card__note">${esc(subs.map((s) => s.name).join(' · '))}</span>
          </span>
          <svg class="pick-card__caret" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
        <div class="pick-card__body">
          ${descHtml(c.desc)}
          ${traitsHtml(tier0TraitsOf(c.id))}
          <button class="pick-card__choose" data-wiz-pick="class:${c.id}">
            ${chosen ? 'Chosen — continue' : `Choose ${esc(c.name)}`}
          </button>
        </div>
      </div>`;
  }

  /* Rules text, or a visibly provisional stand-in. The placeholder is marked
     rather than dressed up, so nobody at a table mistakes "description" for a
     rule — and so the unwritten ones are obvious while they are being written. */
  function descHtml(text) {
    const written = text && text !== 'description' && !text.startsWith('Placeholder —');
    return written
      ? `<p class="pick-card__desc">${esc(text)}</p>`
      : '<p class="pick-card__desc" data-placeholder>Description not yet written.</p>';
  }

  // Every Tier 0 trait an owner grants, in sheet order. A subclass may grant
  // several (a passive plus the spell it hands you), so the picker renders a
  // list; the label singularises only when there is in fact one.
  function traitsHtml(list) {
    return (list || []).map((t, i) => traitHtml(t, list.length > 1, i)).join('');
  }

  function traitHtml(t, many = false, i = 0) {
    if (!t) return '';
    const written = t.desc && !t.desc.startsWith('Placeholder —');
    const label = many ? `Tier 0 Trait ${i + 1}` : 'Tier 0 Trait';
    return `
      <div class="pick-card__trait">
        <span class="pick-card__trait-label">${label}</span>
        <span class="pick-card__trait-name">${esc(t.name)}</span>
        <span class="pick-card__trait-desc"${written ? '' : ' data-placeholder'}>${
          esc(written ? t.desc : 'Rules text not yet written.')}</span>
      </div>`;
  }

  /* ---- step 2: the three subclasses of the chosen class ---- */
  function renderWizSubclasses() {
    const d = state.create;
    const parent = classOf(d.classId);
    setText('wizClassChip', parent ? parent.name : 'Choose a class');
    fillList('wizSubclasses', noticeHtml()
      + subclassesOf(d.classId).map((s) => subclassCard(s, d)).join(''));
  }

  function subclassCard(s, d) {
    const open = d.expanded === s.id;
    const chosen = d.subclassId === s.id;
    // Mana is shown as the pool plus its growth, because the two are different
    // rules: the pool comes from the subclass you started as, the growth from
    // the subclass you take AT each level. A Spellblade generates mana in
    // combat instead of holding a pool, which is what manaModel records — so
    // it is named rather than shown as a bare 0, which would read as a bug.
    const mana = s.manaModel === 'generated'
      ? 'Generated in combat'
      : `${s.startingMana} · +${s.manaPerLevel}/level`;
    const stat = (val, key) =>
      `<span class="pick-card__stat"><span class="pick-card__stat-val">${esc(val)}</span><span class="pick-card__stat-key">${esc(key)}</span></span>`;
    const tags = (list, cls) => (list || [])
      .map((t) => `<span class="pick-card__tag${cls}">${esc(t)}</span>`).join('');

    return `
      <div class="pick-card"${open ? ' data-open' : ''}${chosen ? ' data-chosen' : ''}>
        <button class="pick-card__head" data-wiz-expand="${s.id}" aria-expanded="${open}">
          <span class="pick-card__name">${esc(s.name)}
            <span class="pick-card__note">${esc((s.roles || []).join(' · '))}</span>
          </span>
          <svg class="pick-card__caret" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
        <div class="pick-card__body">
          ${descHtml(s.desc)}
          ${traitsHtml(tier0TraitsOf(s.id))}
          <div class="pick-card__stats">
            ${stat(s.hp, 'Health')}${stat(s.wounds, 'Wounds')}${stat(s.patches, 'Patches')}
          </div>
          <div class="pick-card__profs">
            <span class="pick-card__prof-label">Mana</span>
            <div class="pick-card__tags"><span class="pick-card__tag">${esc(mana)}</span></div>
            <span class="pick-card__prof-label">Concentrations</span>
            <div class="pick-card__tags">${tags(s.roles, ' pick-card__tag--role')}</div>
            <span class="pick-card__prof-label">Trained in</span>
            <div class="pick-card__tags">${
              tags(s.armorTypes, '') + tags(s.weaponTypes, '')
              || '<span class="pick-card__tag">Nothing — unarmoured and unarmed</span>'}</div>
          </div>
          ${s.note ? `<p class="pick-card__desc">${esc(s.note)}</p>` : ''}
          <button class="pick-card__choose" data-wiz-pick="sub:${s.id}">
            ${chosen ? 'Chosen — continue' : `Choose ${esc(s.name)}`}
          </button>
        </div>
      </div>`;
  }

  /* ---- step 3: attributes ---- */
  function renderWizAttrs() {
    const d = state.create;
    const spent = attrSpent();
    const left = ATTR_POINTS_AT_CREATION - spent;
    setBudget('wizAttrBudget',
      `${spent} of ${ATTR_POINTS_AT_CREATION} placed`,
      left === 0 ? 'ready' : 'open',
      `${left} left`);

    fillList('wizAttrs', ATTRIBUTES.map((name) => {
      const v = d.stats[name] || 0;
      return `
        <div class="attr-row">
          <span class="attr-row__name">${esc(name)}</span>
          <button class="step-btn" data-wiz-attr="${esc(name)}:-1"${v === 0 ? ' disabled' : ''} aria-label="Lower ${esc(name)}">&minus;</button>
          <span class="attr-row__val">${v}</span>
          <button class="step-btn" data-wiz-attr="${esc(name)}:1"${left === 0 ? ' disabled' : ''} aria-label="Raise ${esc(name)}">+</button>
        </div>`;
    }).join(''));
  }

  // One budget line, three states: still open, exactly spent, over. Over is
  // unreachable from the wizard's own controls — they stop at the budget — but
  // the state exists because the readout is also the thing that would have to
  // tell the truth if a rule ever handed out a fifth point.
  function setBudget(bind, main, state_, right) {
    const el = $(`[data-bind="${bind}"]`);
    if (!el) return;
    el.innerHTML = `<span>${esc(main)}</span><span>${esc(right || '')}</span>`;
    el.setAttribute('data-state', state_);
  }

  /* ---- step 4: skills, grouped by category like the sheet's picker ---- */
  function renderWizSkills() {
    const d = state.create;
    const spent = skillSpent();
    const left = SKILL_POINTS_AT_CREATION - spent;
    setBudget('wizSkillBudget',
      `${spent} of ${SKILL_POINTS_AT_CREATION} placed · ${skillCount()} of ${SKILL_POINTS_AT_CREATION} skills`,
      canAdvance() ? 'ready' : 'open',
      left > 0 ? `${left} left` : '');

    // Creation spreads its four points across four DIFFERENT skills, so a
    // skill already taken cannot take a second point yet — the rule is
    // enforced here rather than reported, because unlike a level-up spend
    // there is no legitimate way to reach that state at creation.
    fillList('wizSkills', SKILL_CATEGORIES.map((cat) => {
      const rows = (LIBRARY.skills || [])
        .filter((k) => k.category === cat)
        .map((k) => {
          const rank = d.skills[k.id] || 0;
          const full = left === 0 && !rank;
          return `
            <button class="load-row" data-wiz-skill="${k.id}"${rank ? ' data-chosen' : ''}${full ? ' disabled' : ''}>
              <span class="load-row__body">
                <span class="load-row__name">${esc(k.name)}</span>
                <span class="load-row__meta">${esc(rank ? `+${skillMod(rank)}` : k.desc.slice(0, 90) + (k.desc.length > 90 ? '…' : ''))}</span>
              </span>
              <span class="load-row__mark"></span>
            </button>`;
        }).join('');
      return rows ? `<div class="wizard__family">${esc(cat)}</div>${rows}` : '';
    }).join(''));
  }

  /* ---- step 5: loadout ---- */
  /* ---- step 5: loadout ------------------------------------------------
     Three accordions in the order the rules give them: what you hold, what
     you wear, what you carry. Each fills SLOTS rather than ticking items off
     a list, which is what makes "two 1H swords" expressible at all — a list
     of items can only answer yes or no to each one, and dual-wielding is the
     same answer twice.

     Completing a section opens the next. Every header stays a button, so
     going back is one tap and nothing is lost by doing it. */

  const GEAR_SECTIONS = ['hands', 'armor', 'gear'];
  const SECTION_LABEL = { hands: 'Hands', armor: 'Armour', gear: 'Adventuring Gear' };

  /* Which hand holds what. `d.hands` is a flat list of entries, and a 2H
     weapon is ONE entry costing two hands — so the cells are derived rather
     than stored, and a two-hander is a single cell spanning both. Storing a
     slot per hand instead would make a greatsword two half-weapons that have
     to be kept in step with each other. */
  function handCells(d) {
    const cells = [];
    let used = 0;
    d.hands.forEach((h, i) => {
      const g = itemOf(h.id);
      const cost = Math.max(1, g?.hands || 1);
      if (!g || used + cost > HAND_CAPACITY) return;   // defensive: over-capacity data
      cells.push({ index: i, item: g, span: cost });
      used += cost;
    });
    for (let i = used; i < HAND_CAPACITY; i++) cells.push({ empty: true, span: 1 });
    return cells;
  }

  // A section is done when there is nothing left to decide in it. Armour needs
  // its own flag because "unarmoured" is a legitimate choice that looks
  // exactly like not having chosen — `armorWorn: null` cannot tell them apart.
  function gearSectionDone(d, key) {
    if (key === 'hands') return draftHandsUsed() >= HAND_CAPACITY;
    if (key === 'armor') return !!d.armorPicked;
    return d.equipment.every(Boolean);
  }

  // Open the next section that still wants an answer. Called after every pick,
  // so finishing a section moves you on without a Continue button of its own.
  function advanceGearSection() {
    const d = state.create;
    if (!gearSectionDone(d, d.gearSection)) return;
    const rest = GEAR_SECTIONS.slice(GEAR_SECTIONS.indexOf(d.gearSection) + 1);
    const next = rest.find((k) => !gearSectionDone(d, k));
    // Nothing left to move to means the loadout is finished; the section stays
    // open so the last thing chosen is still on screen.
    if (next) d.gearSection = next;
  }

  function renderWizLoadout() {
    const d = state.create;
    const build = draftBuild(d);

    // Reachable with no subclass, because the rail lets you jump to any step
    // you have already visited and changing class clears the subclass without
    // touching anything else. What you may carry is entirely a function of the
    // subclass, so there is nothing honest to draw until there is one — and
    // saying so beats an empty list that looks like a class trained in nothing.
    if (!d.subclassId) {
      fillList('wizLoadout', '<div class="empty-note">Your loadout is chosen from what your subclass is trained to carry. Pick one on step 2 and this fills in — anything you had chosen is still here.</div>');
      return;
    }

    fillList('wizLoadout', noticeHtml()
      + GEAR_SECTIONS.map((key) => gearSection(d, build, key)).join(''));
  }

  function gearSection(d, build, key) {
    const open = d.gearSection === key;
    const done = gearSectionDone(d, key);
    const body = key === 'hands' ? handsBody(d)
      : key === 'armor' ? armorBody(d, build)
      : gearBody(d);
    return `
      <section class="loadout-sec"${open ? ' data-open' : ''}${done ? ' data-done' : ''}>
        <button class="loadout-sec__head" data-wiz-sec="${key}" aria-expanded="${open}">
          <span class="loadout-sec__name">${esc(SECTION_LABEL[key])}</span>
          <span class="loadout-sec__state">${esc(sectionState(d, key))}</span>
          <svg class="loadout-sec__caret" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        </button>
        <div class="loadout-sec__body">${body}</div>
      </section>`;
  }

  // The header's right-hand summary. It reads as the answer once there is one,
  // so a collapsed section still says what is in it.
  function sectionState(d, key) {
    if (key === 'hands') return `${draftHandsUsed()} of ${HAND_CAPACITY} hands`;
    if (key === 'armor') {
      if (!d.armorPicked) return 'Not chosen';
      return d.armorWorn ? (itemOf(d.armorWorn)?.name || 'Armour') : 'Unarmoured';
    }
    return `${d.equipment.filter(Boolean).length} of ${GEAR_AT_CREATION}`;
  }

  /* Two slots side by side. A filled one reopens the picker with its current
     contents marked and an explicit "leave empty" at the top, so changing and
     clearing are the same gesture rather than a second control on every slot. */
  function handsBody(d) {
    return `<div class="slot-grid">${handCells(d).map((c) => c.empty
      ? gearSlotEmpty('hand:new', 'Empty hand', c.span)
      : gearSlot(`hand:${c.index}`, c.item.name, [
          c.span === 2 ? 'Two hands' : 'One hand',
          c.item.damage ? `${c.item.damage} ${c.item.damageType || ''}`.trim() : '',
          c.item.type === 'Shield' ? `Armor ${modLabel(c.item.armorMod)} · Evasion ${modLabel(c.item.evasionMod)}` : '',
        ], c.span)).join('')}</div>`;
  }

  /* A plain choose-one row. Armour is the only loadout section still built
     from these — hands and gear fill slots instead, because they can hold more
     than one thing and a list cannot express "two of these". */
  const loadRow = (pick, name, metaParts, chosen, blocked) => `
    <button class="load-row" data-wiz-pick="${esc(pick)}"${chosen ? ' data-chosen' : ''}${blocked ? ' disabled' : ''}>
      <span class="load-row__body">
        <span class="load-row__name">${esc(name)}</span>
        <span class="load-row__meta">${esc(metaParts.filter(Boolean).join(' · '))}</span>
      </span>
      <span class="load-row__mark"></span>
    </button>`;

  function armorBody(d, build) {
    const rows = ARMOR
      .filter((a) => proficiencies('armorTypes', build).includes(a.prof))
      .map((a) => loadRow(`armor:${a.id}`, a.name,
        [`Evasion ${modLabel(a.evasionMod)} · Armor ${modLabel(a.armorMod)} · Speed ${modLabel(a.speedMod)}`],
        d.armorPicked && d.armorWorn === a.id, false)).join('');
    // Unarmoured is a choice, not the absence of one — and it has to be
    // expressible, or a character who means to wear nothing can never finish
    // this section and the accordion never moves on.
    const none = loadRow('armor:none', 'None — unarmoured',
      ['Your class may fight without armour'], d.armorPicked && !d.armorWorn, false);
    return rows
      ? rows + none
      : `<div class="empty-note">This subclass is trained with no armour.</div>` + none;
  }

  function gearBody(d) {
    return `<div class="slot-stack">${d.equipment.map((id, i) => {
      const g = id && itemOf(id);
      return g
        ? gearSlot(`gear:${i}`, g.name, [g.type === 'Consumable'
            ? `Consumable · refills on a ${g.refill === 'short-rest' ? 'short' : 'long'} rest`
            : 'Gear'], 1)
        : gearSlotEmpty(`gear:${i}`, 'Empty slot', 1);
    }).join('')}</div>`;
  }

  /* A filled slot: tap it to change what is in it, or the × to empty it.
     --slot-span is how many hands it takes; the stylesheet turns that into
     grid columns, so a two-hander looks like what it is. */
  const gearSlot = (pick, name, metaParts, span) => `
    <div class="gear-slot" style="--slot-span:${span}">
      <button class="gear-slot__open" data-wiz-slot="${esc(pick)}">
        <span class="gear-slot__name">${esc(name)}</span>
        <span class="gear-slot__meta">${esc(metaParts.filter(Boolean).join(' · '))}</span>
      </button>
      <button class="gear-slot__x" data-wiz-clear="${esc(pick)}" aria-label="Remove ${esc(name)}">
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true"><path d="M1 1l7 7M8 1L1 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </button>
    </div>`;

  /* An empty slot needs no × — empty is what it already is, and it is a
     complete answer in its own right: a character may finish creation with a
     hand free, and nothing should make them choose "unarmed" from a list to
     say so. Filling it is optional; the slot just sits there until it is used. */
  const gearSlotEmpty = (pick, label, span) => `
    <div class="gear-slot gear-slot--empty" style="--slot-span:${span}">
      <button class="gear-slot__open" data-wiz-slot="${esc(pick)}">
        <span class="gear-slot__plus" aria-hidden="true"></span>
        <span class="gear-slot__name">${esc(label)}</span>
      </button>
    </div>`;

  /* ------------------------------------------------------------------ */
  /* THE SLOT PICKER — what goes in one hand, or one gear slot          */
  /* ------------------------------------------------------------------ */

  /* The category chips, in display order.

     Everything past the first three is read from the `tags` authored on gear
     in items.csv — so re-tagging an item, adding a category or dropping one is
     a spreadsheet edit, not a code change. The order below is the order the
     tags first appear in the catalog, which is the sheet's own row order.

     Labels are derived from the tag rather than kept in a lookup table here,
     for the same reason: a table would be a second place to edit. */
  const CHIP_FIXED = [
    { id: 'all', label: 'All' },
    { id: 'consumable', label: 'Consumables' },
    { id: 'gear', label: 'Gear' },
  ];
  const titleCase = (t) => t.replace(/-/g, ' ').replace(/\b[a-z]/g, (c) => c.toUpperCase());

  /* Two pickers browse the equipment catalog: creation's, which fills a draft
     slot, and the Gear page's, which adds to the live character. They share
     every chip, group and filter — only where the pick LANDS differs. */
  const isGearPicker = (p) => p && (p.kind === 'gear' || p.kind === 'equip');

  function gearChips() {
    const seen = [];
    for (const e of EQUIPMENT) {
      if (e.type === 'Consumable') continue;
      for (const t of e.tags || []) if (!seen.includes(t)) seen.push(t);
    }
    return seen.map((t) => ({ id: `tag:${t}`, label: titleCase(t) }));
  }

  // Does this item belong under the active chip? 'gear' is every non-consumable,
  // so it stays meaningful for anything not yet tagged.
  function inGroup(g, group) {
    if (group === 'all') return true;
    if (group === 'consumable') return g.type === 'Consumable';
    if (group === 'gear') return g.type !== 'Consumable';
    return (g.tags || []).includes(group.slice(4));
  }

  function openWizPicker(spec) {
    const d = state.create;
    const at = spec.indexOf(':');
    // `group` is the active category chip: 'all', 'consumable', 'gear', or one
    // of the gear tags authored in items.csv.
    state.wizPick = { kind: spec.slice(0, at), key: spec.slice(at + 1), query: '', group: 'all' };
    const input = $('[data-wiz-pick-query]');
    if (input) input.value = '';
    // The hand picker gets no title: you arrived by tapping a hand, so naming
    // the obvious is furniture. The gear catalog keeps one — it is long, it is
    // grouped, and it has a filter above it, so it needs a heading to sit under.
    setText('wizPickTitle', state.wizPick.kind === 'hand' ? '' : 'Adventuring Gear');
    // The Gear page has no draft; renderWizPicker() reads state.create only to
    // mark what the slot already holds, so it has to cope with there being none.
    
    renderWizPicker();
    // Read by the stylesheet to give the gear picker a fixed height. A card
    // that resizes as results come and go is the jitter this prevents.
    app.setAttribute('data-pick-kind', state.wizPick.kind);
    app.setAttribute('data-modal', 'wiz-pick');
    void d;
  }

  /* The rows a slot may take.

     For a hand: everything the subclass is trained with that FITS. Fitting is
     measured against the hands free once this slot's own contents are set
     down, which is what lets a two-hander be swapped for another two-hander
     rather than being blocked by itself.

     For gear: the whole catalog. Nothing about adventuring gear depends on a
     class, and duplicates are legal — three Health Potions is a normal thing
     to carry, and each slot is filled independently. */
  function wizPickerRows() {
    const d = state.create;
    const p = state.wizPick;
    if (p.kind === 'hand') {
      const held = p.key === 'new' ? null : d.hands[Number(p.key)];
      // Nothing is blocked here. A two-handed weapon does not fit alongside
      // anything, but the answer to that is to put the other thing down, not
      // to grey out the greatsword and leave the player to work out why —
      // which is what the old list did, and it read as broken. wizPickInto()
      // makes the room.
      return [{
        rows: WEAPONS
          .filter((g) => isTrained(g, draftBuild(d)))
          .map((g) => ({ item: g, on: held && held.id === g.id })),
      }];
    }
    const q = p.query.trim().toLowerCase();
    // Descriptions are searched as well as names, so "rope" finds the pulley
    // rig and "light" finds the lantern — what a player remembers about a
    // piece of gear is usually what it DOES.
    const match = (g) => (!q || g.name.toLowerCase().includes(q) || (g.desc || '').toLowerCase().includes(q))
      && inGroup(g, p.group);
    // Which entry this slot already holds, so the picker opens showing it. The
    // Gear page adds rather than replaces, so nothing is pre-marked there.
    const chosen = p.kind === 'gear' && d ? d.equipment[Number(p.key)] : null;

    // Grouped by category, in the chips' own order, so the headings a player
    // sees while browsing are the same words as the buttons that filter them.
    // A single chosen category needs no heading — the chip already said it.
    if (p.group !== 'all' && p.group !== 'gear') {
      return [{ rows: EQUIPMENT.filter(match).map((g) => ({ item: g, on: chosen === g.id })) }];
    }
    const groups = [];
    if (p.group === 'all') {
      const rows = EQUIPMENT.filter((g) => g.type === 'Consumable' && match(g)).map((g) => ({ item: g, on: chosen === g.id }));
      if (rows.length) groups.push({ label: 'Consumables', rows });
    }
    for (const chip of gearChips()) {
      const tag = chip.id.slice(4);
      const rows = EQUIPMENT
        .filter((g) => g.type !== 'Consumable' && (g.tags || []).includes(tag) && match(g))
        .map((g) => ({ item: g, on: chosen === g.id }));
      if (rows.length) groups.push({ label: chip.label, rows });
    }
    // Anything not yet tagged still has to be reachable, or authoring a new
    // gear row without a tag would quietly hide it from the game.
    const untagged = EQUIPMENT
      .filter((g) => g.type !== 'Consumable' && !(g.tags || []).length && match(g))
      .map((g) => ({ item: g, on: chosen === g.id }));
    if (untagged.length) groups.push({ label: 'Other', rows: untagged });
    return groups;
  }

  function renderWizPicker() {
    const d = state.create;
    const p = state.wizPick;
    const groups = wizPickerRows();
    const total = groups.reduce((n, g) => n + g.rows.length, 0);

    // Search and chips appear only where they earn their place. Nine weapons
    // are a glance; thirty-eight pieces of gear are a hunt.
    const search = $('[data-wiz-pick-search]');
    if (search) search.hidden = !isGearPicker(p);
    const chipbar = $('[data-wiz-pick-chips]');
    if (chipbar) chipbar.hidden = !isGearPicker(p);
    if (isGearPicker(p)) {
      const chip = (c) => `<button class="wiz-chip" data-wiz-pick-group="${esc(c.id)}"${
        p.group === c.id ? ' data-on' : ''}>${esc(c.label)}</button>`;
      // A wall between what a thing IS and what it is FOR. Both filter the same
      // list, but they answer different questions, and ten chips in one
      // undifferentiated row read as one long axis rather than two short ones.
      fillList('wizPickChips',
        CHIP_FIXED.map(chip).join('')
        + '<span class="wiz-chip__wall" aria-hidden="true"></span>'
        + gearChips().map(chip).join(''));
    }

    const body = groups.map((g) => {
      if (!g.rows.length) return '';
      const head = g.label ? `<div class="wizard__family">${esc(g.label)}</div>` : '';
      return head + g.rows.map(({ item, blocked, on }) => pickRow(item.id, {
        label: item.name, note: pickNote(item), on: !!on, blocked: !!blocked,
      })).join('');
    }).join('');

    fillList('wizPicker', total
      ? body
      : `<div class="empty-note">${p.query ? 'Nothing matches that.' : 'Nothing available for this slot.'}</div>`);
  }

  /* Empty a slot, from the × on the slot itself. Separate from the picker
     because emptying is not choosing something — routing it through a list of
     things to pick meant three taps to express "nothing", and an empty hand is
     the ordinary resting state of a hand, not an option to be selected. */
  function clearWizSlot(spec) {
    const d = state.create;
    const at = spec.indexOf(':');
    const kind = spec.slice(0, at);
    const key = spec.slice(at + 1);

    if (kind === 'hand') {
      const i = Number(key);
      if (!(i >= 0 && i < d.hands.length)) return;
      d.hands.splice(i, 1);
    } else if (kind === 'gear') {
      const i = Number(key);
      if (!(i >= 0 && i < d.equipment.length)) return;
      d.equipment[i] = null;
    } else return;

    d.notice = null;
    // No advanceGearSection() here: emptying a slot is the opposite of
    // finishing one, and moving the player on would be nonsense.
    renderWizLoadout();
    renderWizardFoot();
  }

  /* Commit a pick into the slot the picker was opened for. Adding rather than
     toggling is the whole point: choosing 1H Melee for the second hand when
     the first already holds one gives you two of them, where the old list of
     items could only turn the single entry back off. */
  function wizPickInto(id) {
    const d = state.create;
    const p = state.wizPick;
    if (!p) return;
    if (p.kind !== 'equip' && !d) return;   // a draft pick with no draft is stale

    if (p.kind === 'hand') {
      const at = p.key === 'new' ? null : Number(p.key);
      {
        const g = itemOf(id);
        if (!g) return;
        // A fresh entry carries no weaponTag: the tag belonged to the weapon
        // being replaced, and the replacement may not even offer it.
        let mine;
        if (at === null) { d.hands.push({ id }); mine = d.hands.length - 1; }
        else { d.hands.splice(at, 1, { id }); mine = at; }

        /* Then make room. Taking up a greatsword means letting go of the
           shield — so the pick always succeeds and whatever no longer fits is
           put down, rather than the greatsword being greyed out and the player
           left to deduce that they must clear the other hand first.

           Dropped from the far end, skipping the entry just placed, so the
           thing chosen is never the thing discarded. */
        while (draftHandsUsed() > HAND_CAPACITY) {
          let victim = -1;
          for (let i = d.hands.length - 1; i >= 0; i--) if (i !== mine) { victim = i; break; }
          if (victim === -1) break;                 // only the new entry left
          d.hands.splice(victim, 1);
          if (victim < mine) mine -= 1;
        }
      }
    } else if (p.kind === 'equip') {
      // The Gear page: append to the live character rather than fill a slot.
      // Capacity is a real limit here, unlike creation's fixed three — and the
      // add button is already hidden at capacity, so this is the guard behind
      // that rather than the thing the player bumps into.
      if (!itemOf(id) || character.equipment.length >= character.equipMax) return;
      character.equipment.push(id);
      state.wizPick = null;
      closeModal();
      renderContent();
      save();
      return;
    } else {
      const at = Number(p.key);
      if (!(at >= 0 && at < d.equipment.length)) return;
      if (!itemOf(id)) return;
      d.equipment[at] = id;
    }

    state.wizPick = null;
    d.notice = null;              // the player has acted
    closeModal();
    advanceGearSection();
    renderWizLoadout();
    renderWizardFoot();
  }

  /* ---- step 6: origin ----
     The fields are uncontrolled: the draft is written from them on input, and
     they are only written back when the step is first painted. Repainting a
     field the player is typing in would move the caret. */
  function renderWizOrigin() {
    const d = state.create;
    const set = (sel, v) => { const el = $(sel); if (el && el.value !== v) el.value = v; };
    set('[data-wiz-name]', d.name);
    set('[data-wiz-origin]', d.origin);
    const err = $('[data-wiz-error]');
    if (err) err.hidden = true;    // shown only after Create is attempted
  }

  /* ------------------------------------------------------------------ */
  /* WIRING — one delegated click handler for the whole app             */
  /* ------------------------------------------------------------------ */
  function wire() {
    app.addEventListener('click', (e) => {
      // The source popover is a transient overlay: anything pressed outside a
      // stat card dismisses it. Handled by class toggle, so the click being
      // processed below never has its own element pulled out from under it.
      if (state.openStat && !e.target.closest('.stat-card')) showStatPop(null);

      const t = e.target.closest('[data-nav],[data-tab],[data-edit-tab],[data-edit-attr],[data-skill-rank],[data-toggle],[data-step],[data-calc],[data-menu],[data-wound],[data-wound-reset],[data-calc-step],[data-calc-apply],[data-action],[data-key],[data-dice-back],[data-dice-roll],[data-roll],[data-roll-again],[data-inv-add],[data-inv-open],[data-item-save],[data-bp-step],[data-bp-edit],[data-bp-delete],[data-mod-add],[data-mod-remove],[data-stat-toggle],[data-effect-open],[data-effect-add],[data-effect-step],[data-effect-tick],[data-effects-clear],[data-tick-confirm],[data-skill-edit],[data-skill-draft],[data-skill-filter],[data-skill-save],[data-detail],[data-gear-add],[data-armor-add],[data-detail-remove],[data-pick],[data-tag],[data-note-add],[data-note-save],[data-note-cancel],[data-note-edit],[data-note-delete],[data-note-del-confirm],[data-portrait-pick],[data-portrait-remove],[data-portrait-menu],[data-rest],[data-patch],[data-patch-confirm],[data-poison-toggle],[data-adv],[data-rules-toggle],[data-id-save],[data-portrait-crop],[data-crop-save],[data-crop-reset],[data-open-character],[data-wiz],[data-wiz-step],[data-wiz-expand],[data-wiz-pick],[data-wiz-attr],[data-wiz-skill],[data-wiz-sec],[data-wiz-slot],[data-wiz-clear],[data-wiz-pick-group],[data-equip-drop],[data-roster-edit],[data-char-del],[data-char-del-confirm],[data-char-export],[data-import-open],[data-share-format],[data-share-send],[data-backup-export],[data-compendium-export],[data-compendium-reset],[data-file-open],[data-file-apply],[data-ap-mode],[data-ap-theme]');
      if (!t) return;
      /* The app root is STATE, never a control. It carries data-view, data-tab,
         data-edit-tab, data-menu and data-modal so the stylesheet can switch on
         them, and three of those names are also hooks in the selector above —
         data-edit-tab joined data-tab and data-action there — so a click that
         lands on no control at all (a modal scrim, the padding beside a row)
         climbs to .app and matches. Left unguarded it is then read as a press
         of the tab it is currently showing, which runs the tab branch below and
         closes the drawer as a side effect. That is what kept the drawer from
         staying open behind the Rest popup, and it was silently happening on
         every modal scrim click before that. */
      if (t === app) return;

      // --- portrait ---
      if (t.hasAttribute('data-portrait-menu'))   { openPortraitMenu(); return; }
      if (t.hasAttribute('data-portrait-pick'))   { openPortraitPicker(); return; }
      if (t.hasAttribute('data-portrait-remove')) { removePortrait(); return; }
      if (t.hasAttribute('data-portrait-crop'))   { openPortraitCrop(); return; }
      if (t.hasAttribute('data-crop-save'))       { saveCrop(); return; }
      if (t.hasAttribute('data-crop-reset'))      { resetCrop(); return; }

      // --- edit character ---
      // Ahead of data-tab below, and reached only from a real chip: the guard
      // above has already turned back the click that climbed to .app, which
      // carries this attribute as state.
      if (t.dataset.editTab)   { setEditTab(t.dataset.editTab); return; }
      if (t.dataset.editAttr)  { stepAttr(t.dataset.editAttr); return; }
      /* The steppers are SIBLINGS of the row's toggle button, not children of
         it, so closest() lands on the stepper itself and the row never flips
         as a side effect of a rank press. That is a fact about the markup
         rather than about this ordering — see skillLine() for why the head
         cannot simply be one big button. */
      if (t.dataset.skillRank) { stepSkillRank(t.dataset.skillRank); return; }
      if (t.hasAttribute('data-id-save'))   { saveIdentity(); return; }

      // --- inventory & backpack ---
      if (t.hasAttribute('data-inv-add'))   { openItemModal(null, null); return; }
      if (t.hasAttribute('data-item-save')) { saveItem(); return; }
      if (t.dataset.invOpen)   { openBackpack(t.dataset.invOpen); return; }
      if (t.dataset.bpEdit)    { openItemModal(t.dataset.bpEdit, 'backpack'); return; }
      if (t.dataset.bpDelete)  { removeInvItem(t.dataset.bpDelete); return; }
      if (t.dataset.bpStep)    { stepBackpack(parseInt(t.dataset.bpStep, 10)); return; }

      // --- modifier rows in the item form ---
      if (t.hasAttribute('data-mod-add')) {
        state.itemMods.push({ stat: '', value: 0 });
        renderItemMods();
        return;
      }
      if (t.dataset.modRemove !== undefined) {
        state.itemMods.splice(Number(t.dataset.modRemove), 1);
        renderItemMods();
        return;
      }

      // --- gear & armor ---
      if (t.dataset.detail)  { openDetail(t.dataset.detail); return; }
      if (t.hasAttribute('data-gear-add'))  { openPicker('hands', null); return; }
      if (t.hasAttribute('data-armor-add')) { openPicker('armor', null); return; }
      if (t.hasAttribute('data-detail-remove')) { removeSlot(); return; }
      // data-pick serves two pickers: the sheet's, which equips the live
      // character, and creation's, which fills a draft slot. Which one is open
      // is exactly what state.wizPick says, so neither has to know about the
      // other and the row markup stays identical.
      if (t.dataset.pick) { (state.wizPick ? wizPickInto : equipPick)(t.dataset.pick); return; }
      if (t.dataset.tag)     { chooseTag(t.dataset.tag); return; }

      // --- boons & conditions ---
      if (t.hasAttribute('data-effect-open')) { openEffectPicker(); return; }
      if (t.dataset.effectAdd) {
        addEffect(t.dataset.effectAdd);
        renderEffects(); renderDerived(); save(); closeModal();
        return;
      }
      if (t.dataset.effectTick) { openTick(t.dataset.effectTick); return; }
      if (t.hasAttribute('data-tick-confirm')) { takeTick(); return; }
      if (t.hasAttribute('data-effects-clear')) { clearAllEffects(); return; }
      if (t.dataset.effectStep) {
        // "<id>:<delta>" — ids are `kind.slug`, so ":" is an unambiguous split.
        const [id, deltaStr] = t.dataset.effectStep.split(':');
        bumpEffect(id, parseInt(deltaStr, 10));
        renderEffects(); renderDerived(); save();
        return;
      }

      // --- skills ---
      // One entry point, three doors into it: the pen in Edit Character, and
      // the "+ Add Skill" box in either list.
      if (t.hasAttribute('data-skill-edit')) { openSkillEditor(); return; }
      if (t.dataset.skillDraft)              { bumpDraftSkill(t.dataset.skillDraft); return; }
      if (t.dataset.skillFilter) {
        state.skillFilter = t.dataset.skillFilter;
        renderSkillEditor();
        return;
      }
      if (t.hasAttribute('data-skill-save')) { saveSkillEdit(); return; }

      // --- quick rolls from the sheet ---
      // Checked first: a damage box sits inside the collapsible's header
      // button, and closest() resolves to the box, so the section must not
      // also toggle when the box is tapped.
      if (t.dataset.adv !== undefined) { pickAdv(parseInt(t.dataset.adv, 10)); return; }
      if (t.dataset.roll) {
        // The hold already opened the chooser; this click is only the finger
        // coming off the box and must not also roll. Same guard the Patch
        // tally uses, for the same reason.
        advHoldCancel();
        if (advHold.fired) { advHold.fired = false; return; }
        showRoll(t.dataset.rollLabel, t.dataset.roll, t.dataset.rollExpr);
        return;
      }
      if (t.hasAttribute('data-roll-again')) {
        const r = state.lastRoll;
        // Same mode as well as the same expression: rerolling a roll made with
        // Advantage is still a roll made with Advantage.
        if (r) showRoll(r.label, r.kind, r.expr, r.adv);
        return;
      }

      // --- dice roller keypad ---
      if (t.dataset.key !== undefined)      { diceInsert(t.dataset.key); return; }
      if (t.hasAttribute('data-dice-back')) {
        diceHoldCancel();
        // The hold already cleared the expression; this click is only the
        // finger coming off the key, and must not delete a token as well.
        if (dice.heldClear) { dice.heldClear = false; return; }
        diceBack();
        return;
      }
      if (t.hasAttribute('data-dice-roll')) { diceRoll(); return; }

      // --- open a character from the Personae list ---
      if (t.dataset.openCharacter) { switchCharacter(t.dataset.openCharacter); return; }

      // --- roster edit mode ---
      if (t.hasAttribute('data-roster-edit'))      { toggleRosterEdit(); return; }
      if (t.dataset.charDel)                       { askDeleteCharacter(t.dataset.charDel); return; }
      if (t.hasAttribute('data-char-del-confirm')) { deleteCharacter(); return; }
      if (t.dataset.charExport)                    { exportCharacter(t.dataset.charExport); return; }
      if (t.hasAttribute('data-import-open'))      { openImportPicker(); return; }

      // --- share ---
      // The window itself is opened by the drawer's Share, down in the action
      // branch. These two are the only controls inside it.
      if (t.dataset.shareFormat !== undefined) { setShareFormat(t.dataset.shareFormat === '1'); return; }
      if (t.hasAttribute('data-share-send'))   { shareCharacter(); return; }

      // --- settings ---
      // Both imports open the same picker; which one asked is state, and the
      // answer to what should be DONE with the file is asked after it has been
      // read, by the window data-file-apply belongs to.
      if (t.dataset.fileOpen)                     { openSettingsFile(t.dataset.fileOpen); return; }
      if (t.dataset.fileApply)                    { applyAsk(t.dataset.fileApply); return; }
      if (t.hasAttribute('data-backup-export'))     { exportBackup(); return; }
      if (t.hasAttribute('data-compendium-export')) { exportCompendium(); return; }
      if (t.hasAttribute('data-compendium-reset'))  { askCompendiumReset(); return; }
      // Appearance is frame only: these record a choice, repaint the chips to
      // show it, and are read by nothing. See renderAppearance().
      if (t.dataset.apMode)  { state.appearance.mode  = t.dataset.apMode;  renderAppearance(); return; }
      if (t.dataset.apTheme) { state.appearance.theme = t.dataset.apTheme; renderAppearance(); return; }

      // --- character creation ---
      // Every branch repaints through renderWizard(), which is also what keeps
      // the footer's Continue button and its hint in step with the draft: no
      // handler decides on its own whether the step is now complete.
      if (t.dataset.wiz) {
        if (t.dataset.wiz === 'next')   advanceStep();
        if (t.dataset.wiz === 'back')   retreatStep();
        if (t.dataset.wiz === 'cancel') cancelCreate();
        return;
      }
      if (t.dataset.wizStep)   { gotoStep(t.dataset.wizStep); return; }
      if (t.dataset.wizExpand) {
        // An accordion, so opening one closes the other — the point of the
        // step is to compare, and two open cards push the second off-screen.
        const d = state.create;
        d.expanded = d.expanded === t.dataset.wizExpand ? null : t.dataset.wizExpand;
        renderWizard();
        return;
      }
      // Any header reopens its section, which is what makes going back free.
      if (t.dataset.wizSec)   { state.create.gearSection = t.dataset.wizSec; renderWizLoadout(); return; }
      if (t.dataset.wizPickGroup) {
        state.wizPick.group = t.dataset.wizPickGroup;
        renderWizPicker();
        // Back to the top: the list under the chip is a different list, and
        // keeping the old scroll position would open it part-way down.
        const scroller = $('.modal--wiz-pick .effect-picker');
        if (scroller) scroller.scrollTop = 0;
        return;
      }
      if (t.dataset.equipDrop !== undefined) { dropEquipment(t.dataset.equipDrop); return; }
      if (t.dataset.wizClear) { clearWizSlot(t.dataset.wizClear); return; }
      if (t.dataset.wizSlot)  { openWizPicker(t.dataset.wizSlot); return; }
      if (t.dataset.wizAttr)  { stepDraftAttr(t.dataset.wizAttr); return; }
      if (t.dataset.wizSkill) { toggleDraftSkill(t.dataset.wizSkill); return; }
      if (t.dataset.wizPick)  { pickDraft(t.dataset.wizPick); return; }

      // --- navigation between screens ---
      if (t.dataset.nav) {
        // Opening a character always lands on the Character tab. Which tab you
        // last read is state that belongs to a visit, not to the app: leaving
        // on Gear and coming back through the roster should read as opening
        // the sheet fresh, not as resuming mid-thought.
        if (t.dataset.nav === 'sheet') app.setAttribute('data-tab', 'action');
        // Refilled on every entry, so an abandoned edit is discarded rather
        // than being inherited by the next visit.
        if (t.dataset.nav === 'edit') renderEditForm();
        // Painted on entry rather than at load: the guide is the largest
        // thing the app renders, and a player who never opens it should
        // never pay for it.
        if (t.dataset.nav === 'rules') renderRules();
        // Painted on entry for the same reason Rules is, and for one more: the
        // backup line has to weigh a file built out of every character, which
        // is work nobody should pay for until they are looking at it.
        if (t.dataset.nav === 'settings') renderSettings();
        app.setAttribute('data-view', t.dataset.nav);
        releasePull();
        // Edit Character is reached FROM the drawer, so navigation has to
        // close it — otherwise the panel stays over the screen it opened.
        app.setAttribute('data-menu', 'closed');
        return;
      }

      // --- sheet tabs ---
      // Tabs are reachable from two places now: the bottom bar and the drawer
      // (Notes). Closing the drawer here means the drawer entry needs no extra
      // data-menu attribute — the tab branch returns before data-menu is read.
      if (t.dataset.tab) {
        app.setAttribute('data-tab', t.dataset.tab);
        app.setAttribute('data-menu', 'closed');
        // Leaving mid-stretch would strand the hero open for the next visit.
        releasePull();
        return;
      }

      // --- stat card: reveal where the number comes from ---
      if (t.dataset.statToggle) {
        showStatPop(state.openStat === t.dataset.statToggle ? null : t.dataset.statToggle);
        return;
      }

      // --- collapsibles ---
      if (t.dataset.toggle) {
        const id = t.dataset.toggle;
        state.open[id] = !state.open[id];
        const box = app.querySelector(`[data-collapse="${id}"]`);
        if (box) box.classList.toggle('is-open', state.open[id]);
        // The class is for the stylesheet; this is for a screen reader. Only
        // heads that declare the state get it written back, so the rows that
        // never had it are left exactly as they were.
        if (t.hasAttribute('aria-expanded')) t.setAttribute('aria-expanded', String(!!state.open[id]));
        /* The Rules control reads "Collapse all" or "Expand all" off what is
           actually open, so opening one section by hand can be what makes the
           whole list non-empty. Only the LABEL is refreshed — re-rendering the
           list here would throw away the scroll position of the very row just
           opened. Guarded on the view so the sheet's own collapsibles, which
           share this handler, do not pay for a filter over the whole guide. */
        if (app.getAttribute('data-view') === 'rules') renderRulesToggle();
        return;
      }

      // --- health / mana steppers ---
      if (t.dataset.step) {
        const [resource, deltaStr] = t.dataset.step.split(':');
        const delta = parseInt(deltaStr, 10);
        // The announcement waits until the sheet behind it has repainted, so
        // the empty bar and the full pip row are already true on screen when
        // the notice explains them.
        const downed = delta < 0 ? damage(resource, -delta) : (heal(resource, delta), false);
        renderVitals(); renderDerived(); save();
        if (downed) openDowned();
        return;
      }

      // --- open the heal/damage modal by tapping a bar ---
      if (t.dataset.calc) { openCalc(t.dataset.calc); return; }

      // --- clear every wound at once ---
      // renderVitals() as well as renderWounds(), because clearing the Wound
      // that downed a character is what lets them off the floor — and the bar
      // they get up with is the empty one being downed left them. renderDerived()
      // because Wounds feed Armor and Speed through woundPenalty().
      if (t.hasAttribute('data-wound-reset')) {
        if (t.getAttribute('aria-disabled') === 'true') return; // already at zero
        setWounds(0);
        renderVitals(); renderDerived(); save();
        return;
      }

      // --- wound pips ---
      // Tapping the last pip downs the character exactly as the cascade would,
      // bar and all — setWounds() owns that, so the two routes cannot diverge.
      if (t.dataset.wound !== undefined) {
        const i = parseInt(t.dataset.wound, 10);
        const downed = setWounds((i + 1 === character.wounds) ? i : i + 1);
        // renderEffects() because taking a Wound clears every Boon — see
        // setWounds(). renderDerived() because those Boons may have been
        // holding Armor or an attribute up.
        renderEffects(); renderVitals(); renderDerived(); save();
        if (downed) openDowned(); else announceBoonLoss();
        return;
      }

      /* The Patch tally, toggling exactly as the Wound pips above do.
         No renderDerived(): Patches feed no derived stat — they are a supply
         count, where a Wound moves Armor and Speed through woundPenalty(). */
      if (t.dataset.patch !== undefined) {
        patchHoldCancel();
        // The hold already opened the dialog; this click is only the finger
        // coming off the box and must not also move the count. Same guard the
        // roller's delete key uses for the same reason.
        if (patchHold.fired) { patchHold.fired = false; return; }
        const i = parseInt(t.dataset.patch, 10);
        setPatches((i + 1 === character.patches) ? i : i + 1);
        renderVitals(); save();
        return;
      }

      // --- drawer ---
      if (t.dataset.menu) { app.setAttribute('data-menu', t.dataset.menu === 'open' ? 'open' : 'closed'); return; }

      // --- modal buttons ---
      /* One handler, two surfaces. Which card it sits in decides what has to
         be repainted: the roll card redraws its retained result, the
         calculator has nothing to redraw but the control itself. Neither
         saves — nothing about the character has changed yet; the toggle only
         decides what the Heal button will do when it is pressed. */
      if (t.hasAttribute('data-poison-toggle')) {
        state.applyPoison = !state.applyPoison;
        if (t.closest('.modal--calc')) paintCalcPoison();
        else if (state.rollView) paintQuickRoll(state.rollView, true);
        return;
      }

      if (t.dataset.calcStep) { bumpCalc(parseInt(t.dataset.calcStep, 10)); return; }
      if (t.dataset.calcApply) {
        const raw = calcInput().value;
        const isHeal = t.dataset.calcApply === 'heal';
        /* Poison reduces healing RECEIVED, so it is applied here rather than
           inside heal() — heal() is the primitive that moves a bar, and Mana
           restore goes through the very same call. Only a health heal with the
           toggle on is adjusted; Damage is never touched by it. */
        const amt = (isHeal && state.applyPoison && state.calcResource !== 'mana')
          ? healReceived(clampInt(raw))
          : raw;
        const downed = isHeal ? (heal(state.calcResource, amt), false)
                              : damage(state.calcResource, amt);
        // closeCalc() first: it sets data-modal back to "closed", so opening
        // the notice before it would have the calculator's own dismissal
        // immediately close the notice again.
        closeCalc(); renderEffects(); renderVitals(); renderDerived(); save();
        if (downed) openDowned(); else announceBoonLoss();
        return;
      }
      if (t.dataset.modal === 'close') { closeCalc(); return; }

      // --- open the dice roller from the hero FAB ---
      // --- notes ---
      if (t.hasAttribute('data-note-add'))    { openNoteForm(null); return; }
      if (t.hasAttribute('data-note-cancel')) { closeNoteForm(); return; }
      if (t.hasAttribute('data-note-save'))   { saveNote(); return; }
      if (t.dataset.noteEdit !== undefined)   { openNoteForm(t.dataset.noteEdit); return; }
      if (t.dataset.noteDelete !== undefined) { askDeleteNote(t.dataset.noteDelete); return; }
      if (t.hasAttribute('data-note-del-confirm')) { deleteNote(); return; }

      if (t.dataset.action === 'rest') { openRest(); return; }
      if (t.dataset.action === 'share') { openShare(); return; }
      if (t.dataset.rest)               { takeRest(t.dataset.rest); return; }
      if (t.hasAttribute('data-patch-confirm')) { takePatch(); return; }
      if (t.hasAttribute('data-rules-toggle')) { toggleAllRules(); return; }
      if (t.dataset.action === 'roll') { openDice(); return; }
      if (t.dataset.action === 'create-character') { startCreate(); return; }
      /* Placeholder account state — no credential is checked and none is
         stored; see the account block above renderSettings(). Both flip one
         attribute, so the Home card and the Settings section update together
         whichever screen the press came from. */
      if (t.dataset.action === 'sign-in')  { setSignedIn(true);  return; }
      if (t.dataset.action === 'sign-out') { setSignedIn(false); return; }
      if (t.dataset.action === 'add-equipment') { openWizPicker('equip:new'); return; }

      // --- not-yet-built actions: stubbed so nothing silently fails ---
      if (t.dataset.action) {
        console.info(`[waypoint] action not yet implemented: ${t.dataset.action}`);
        return;
      }
    });

    // modal scrim close (uses data-modal="close", handled separately so
    // it doesn't collide with the drawer's data-menu)
    app.addEventListener('click', (e) => {
      const closer = e.target.closest('[data-modal="close"]');
      if (closer) closeModal();
    });

    /* ---- hold the roller's delete key to clear it --------------------
       Pointer events rather than mousedown/touchstart, matching the roster
       drag below: one code path for a finger, a mouse and a stylus alike. */
    app.addEventListener('pointerdown', (e) => {
      if (e.target.closest('[data-dice-back]')) diceHoldStart();
    });
    // On the DOCUMENT, so a hold that wanders off the key still ends. Only the
    // timer running out clears; every way of letting go cancels.
    document.addEventListener('pointerup', diceHoldCancel);
    document.addEventListener('pointercancel', diceHoldCancel);

    /* ---- hold a Patch box to spend one properly ----------------------
       The same shape as the roller's delete key directly above, and for the
       same reason: the cheap, reversible thing is a tap, and the one that
       reaches into health and Wounds has to be held. */
    app.addEventListener('pointerdown', (e) => {
      if (e.target.closest('[data-patch]')) patchHoldStart();
    });
    document.addEventListener('pointerup', patchHoldCancel);
    document.addEventListener('pointercancel', patchHoldCancel);

    /* ---- hold a To-Hit box to choose Advantage -----------------------
       The third hold, same constant. Only To-Hit: Damage and Healing boxes
       take no advantage, so they keep their plain tap and nothing to learn. */
    app.addEventListener('pointerdown', (e) => {
      const box = e.target.closest('[data-roll="tohit"]');
      if (box) advHoldStart(box);
    });
    document.addEventListener('pointerup', advHoldCancel);
    document.addEventListener('pointercancel', advHoldCancel);

    /* ---- roster reorder: drag, and the keyboard path beside it -------
       Pointer events rather than HTML5 drag-and-drop, which never fires on
       touch. setPointerCapture means the gesture keeps reporting to the grip
       even when the finger outruns it, which on a fast drag it always does. */
    app.addEventListener('pointerdown', (e) => {
      const grip = e.target.closest('[data-char-grip]');
      if (!grip || !state.rosterEdit) return;
      e.preventDefault();                       // or the browser starts a text selection
      // Guarded rather than assumed: without capture the drag simply ends when
      // the finger leaves the grip, which is worse but still works. Throwing
      // here would break reordering outright.
      if (grip.setPointerCapture) grip.setPointerCapture(e.pointerId);
      beginRosterDrag(grip.dataset.charGrip, e.clientY);
    });
    // On the DOCUMENT, not the app. Pointer capture normally keeps these
    // arriving at the grip, but where it is unavailable the events go to
    // whatever is under the finger — which on a long drag is the phone frame
    // outside .app. Listening higher up means the drag still tracks, and more
    // importantly still ENDS, instead of freezing mid-gesture.
    document.addEventListener('pointermove', (e) => {
      if (state.drag) moveRosterDrag(e.clientY);
    });
    // Both endings commit. A cancelled pointer (a system gesture taking over,
    // say) still leaves the row where the player dragged it, because throwing
    // the move away would be the more surprising of the two outcomes.
    document.addEventListener('pointerup', () => endRosterDrag(true));
    document.addEventListener('pointercancel', () => endRosterDrag(true));

    /* A drag is unreachable without a pointer, so the grip is also a pair of
       arrow keys. Accessibility outranks performance in this project's order
       of priorities, and this is the cheap half of honouring that. */
    app.addEventListener('keydown', (e) => {
      const grip = e.target.closest && e.target.closest('[data-char-grip]');
      if (!grip || !state.rosterEdit) return;
      const delta = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      if (!delta) return;
      e.preventDefault();
      const id = grip.dataset.charGrip;
      moveCharacter(id, roster.findIndex((r) => r.id === id) + delta);
    });

    /* The wizard's origin step reports through input, not click. The draft is
       written on every keystroke and the field is never repainted while it has
       focus (see renderWizOrigin), so the caret stays where the player put it.
       Only the footer repaints, because whether Create is available turns on
       the name field having something in it. */
    app.addEventListener('input', (e) => {
      // The Bio form is not part of the wizard, so it is answered before the
      // draft guard below. Nothing is written to the character here — only the
      // Save button is re-evaluated, which is what makes it a live readout of
      // "is there anything unsaved".
      if (e.target.matches('[data-id-name],' + BIO_FIELDS.map((k) => `[data-id-${k}]`).join(','))) {
        // Typing into the name clears its own complaint; typing into Hair
        // says nothing about whether the character has a name.
        if (e.target.hasAttribute('data-id-name') && e.target.value.trim()) {
          idField('error').hidden = true;
        }
        refreshBioSave();
        return;
      }
      const d = state.create;
      if (!d) return;
      const el = e.target;
      // The gear filter repaints only the picker's list — the field itself is
      // never rewritten, so the caret stays where the player put it.
      if (el.hasAttribute('data-wiz-pick-query')) {
        if (state.wizPick) { state.wizPick.query = el.value; renderWizPicker(); }
        return;
      }
      if (el.hasAttribute('data-wiz-name'))        d.name = el.value;
      else if (el.hasAttribute('data-wiz-origin')) d.origin = el.value;
      else return;
      const err = $('[data-wiz-error]');
      if (err && d.name.trim()) err.hidden = true;
      renderWizardFoot();
    });

    // The attribute dropdowns report through change, not click, so they need
    // their own delegated listener.
    app.addEventListener('change', (e) => {
      const picker = e.target.closest('[data-import-file]');
      if (picker) { readImportFile(picker); return; }
      // Settings' picker, serving both the backup and the compendium imports.
      const settingsPicker = e.target.closest('[data-settings-file]');
      if (settingsPicker) { readSettingsFile(settingsPicker); return; }
      const sel = e.target.closest('[data-mod-stat]');
      if (!sel) return;
      const row = state.itemMods[Number(sel.dataset.modStat)];
      if (!row) return;
      row.stat = sel.value;
      // Toggled rather than re-rendered: repainting here would tear the select
      // out from under the player mid-choice and reset the picker's scroll.
      refreshModAdd();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.openStat) showStatPop(null);
    });

    /* Escape dismisses the roll card. Every OTHER modal in the app carries a
       visible close control — a .modal__close X in its head, or the dice
       sheet's own — so every other modal is already operable from the
       keyboard by tabbing to that button. The roll card has no head and, since
       Done was removed, no control but Reroll: without this line the only way
       out would be clicking the scrim, which is a <div> and so not reachable
       by keyboard at all. A mouse gesture that has no keyboard equivalent is
       exactly the gap this app's markup is otherwise written to avoid.

       Deliberately scoped to this one modal rather than made global. The rest
       already have their exit, and a blanket Escape-closes-everything would
       silently change how a half-filled item form or an open wizard step
       behaves — a bigger decision than this one, and not one to make as a
       side effect of tidying a button off a card. */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && app.getAttribute('data-modal') === 'roll') closeModal();
    });

    // backpack: left/right arrows page through carried items
    document.addEventListener('keydown', (e) => {
      if (app.getAttribute('data-modal') !== 'backpack') return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); stepBackpack(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); stepBackpack(1); }
    });

    // item form: Enter in the name field saves, Escape closes from either.
    // Enter inside the description is deliberately left alone — it's a
    // textarea, so it should make a new line.
    const nameField = itemName();
    if (nameField) nameField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter')  { e.preventDefault(); saveItem(); }
      if (e.key === 'Escape') closeModal();
    });
    const descField = itemDesc();
    if (descField) descField.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    /* ---- elastic hero: touch, then wheel ---------------------------- */
    const scroller = scrollerEl();
    if (scroller) {
      scroller.addEventListener('touchstart', (e) => {
        if (!canPull() || e.touches.length !== 1) { pullFrom = null; return; }
        pullFrom = e.touches[0].clientY;
        pullDist = 0;
      }, { passive: true });

      // Not passive: a real pull has to preventDefault, or the browser's own
      // overscroll runs at the same time and the page rubber-bands underneath.
      scroller.addEventListener('touchmove', (e) => {
        if (pullFrom === null || !canPull() || e.touches.length !== 1) return;
        const y = e.touches[0].clientY;
        const down = y - pullFrom;

        // Only the top of the list stretches, and only downward. Anything else
        // is an ordinary scroll, so hand the gesture back and re-anchor —
        // without re-anchoring, scrolling down then up again would resume from
        // a stale origin and snap the hero open.
        if (down <= 0 || scroller.scrollTop > 0) {
          if (pullDist > 0) releasePull();
          pullFrom = y;
          pullDist = 0;
          return;
        }
        if (pullDist === 0) beginPull();
        e.preventDefault();
        pullDist = down;
        setPull(resist(pullDist));
      }, { passive: false });

      scroller.addEventListener('touchend', () => { if (pullDist > 0) releasePull(); }, { passive: true });
      scroller.addEventListener('touchcancel', () => { if (pullDist > 0) releasePull(); }, { passive: true });

      // Desktop equivalent. There is no touchend to wait for, so "let go" is
      // inferred two ways: the deltas fading into a momentum tail (trackpad),
      // or the events stopping altogether (mouse wheel). See the notes on
      // WHEEL_FADE_TO above for why the first one is needed at all.
      scroller.addEventListener('wheel', (e) => {
        if (!canPull() || scroller.scrollTop > 0) return;
        if (e.deltaY >= 0) { if (pullDist > 0) releasePull(); resetWheel(); return; }

        // Any activity at all postpones the idle release, momentum included —
        // the tail must not be mistaken for silence.
        clearTimeout(pullWheelTimer);
        pullWheelTimer = setTimeout(() => { releasePull(); resetWheel(); }, WHEEL_IDLE_MS);

        const mag  = -e.deltaY;
        const prev = wheelLast;
        wheelLast = mag;

        // Already let go, and still coasting. Swallow the tail so it cannot
        // re-stretch the hero — unless the delta climbs again, which momentum
        // never does, and which therefore means a fresh push has started.
        if (wheelSpent) {
          if (prev > 0 && mag > prev * WHEEL_REPUSH) resetWheel();
          else { e.preventDefault(); return; }
        }

        // Two signals together, because either alone misreads a real drag.
        // MONOTONIC DECAY is the sharp one: momentum shrinks every single
        // event, where a hand on the trackpad jitters up and down. The ratio
        // is the safety net, so four small wobbles near full speed — a steady
        // drag, not a tail — cannot trip it.
        if (mag > wheelPeak) { wheelPeak = mag; wheelFade = 0; }
        else if (prev > 0 && mag < prev) { wheelFade++; }
        else { wheelFade = 0; }

        // The hand is off. Start the glide back now rather than at the end of
        // the tail — this is the whole difference between "springs back when
        // you let go" and "hangs there for a second first".
        if (wheelFade >= WHEEL_FADE_HITS && mag < wheelPeak * WHEEL_FADE_TO) {
          wheelSpent = true;
          e.preventDefault();
          releasePull();
          // releasePull() cancels the idle timer, so re-arm it here. Without
          // this, a tail that stops at the very moment fade is detected would
          // leave the gesture marked spent for good and block the next pull.
          pullWheelTimer = setTimeout(resetWheel, WHEEL_IDLE_MS);
          return;
        }

        e.preventDefault();
        if (pullDist === 0) beginPull();
        pullDist += mag;
        setPull(resist(pullDist));
      }, { passive: false });
    }

    /* ---- portrait reposition: drag, pinch, slider, arrows ------------ */
    const frame = cropFrame();
    if (frame) {
      // Pointer events cover mouse, pen and single-finger touch in one path.
      // The frame sets touch-action:none, so the browser does not also pan.
      let dragId = null;
      let lastX = 0, lastY = 0;
      // Live pointers, so a second finger can be recognised as a pinch.
      const points = new Map();
      let pinchFrom = null;   // { dist, zoom } when two fingers are down

      frame.addEventListener('pointerdown', (e) => {
        points.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (points.size === 2) {
          // Second finger: stop panning and start pinching from here, so the
          // zoom is measured against the moment the gesture actually began.
          dragId = null;
          const [a, b] = [...points.values()];
          pinchFrom = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: cropView.zoom };
          return;
        }
        if (points.size > 2) return;
        dragId = e.pointerId;
        lastX = e.clientX; lastY = e.clientY;
        frame.setPointerCapture(e.pointerId);
        frame.classList.add('is-dragging');
      });

      frame.addEventListener('pointermove', (e) => {
        if (!points.has(e.pointerId)) return;
        points.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pinchFrom && points.size === 2) {
          const [a, b] = [...points.values()];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinchFrom.dist > 0) setCropZoom(pinchFrom.zoom * (dist / pinchFrom.dist));
          return;
        }
        if (e.pointerId !== dragId) return;
        panCrop(e.clientX - lastX, e.clientY - lastY);
        lastX = e.clientX; lastY = e.clientY;
      });

      const endPointer = (e) => {
        points.delete(e.pointerId);
        if (points.size < 2) pinchFrom = null;
        if (e.pointerId === dragId) {
          dragId = null;
          frame.classList.remove('is-dragging');
        }
        // Lifting one of two fingers leaves the other mid-gesture; re-anchor
        // the pan to it so the picture does not jump on the next move.
        if (points.size === 1) {
          const [id] = [...points.keys()];
          const p = points.get(id);
          dragId = id; lastX = p.x; lastY = p.y;
        }
      };
      frame.addEventListener('pointerup', endPointer);
      frame.addEventListener('pointercancel', endPointer);

      // Keyboard parity for the drag. Arrows nudge; shift takes bigger steps.
      frame.addEventListener('keydown', (e) => {
        const step = e.shiftKey ? 24 : 6;
        const move = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
        if (!move) return;
        e.preventDefault();
        panCrop(move[0], move[1]);
      });
    }

    const zoomSlider = cropZoom();
    if (zoomSlider) zoomSlider.addEventListener('input', () => {
      setCropZoom(Number(zoomSlider.value) / 100);
    });

    // The file input reports through change, not click. One input serves both
    // entry points, so this is the only place a chosen file is read.
    const portraitInput = $('[data-portrait-input]');
    if (portraitInput) portraitInput.addEventListener('change', () => {
      const file = portraitInput.files && portraitInput.files[0];
      // Emptied as soon as the file is taken, so the input is always at rest
      // between picks. Without this the element keeps the last filename, and
      // choosing the SAME photo again is not a change — no event fires and the
      // button reads as broken. Upload a portrait, remove it, then pick that
      // very same file: that is the path this guards.
      //
      // Reset AFTER reading rather than before opening the dialog, so the
      // invariant holds no matter what opened the picker.
      portraitInput.value = '';
      acceptPortraitFile(file);
    });

    // Drag-and-drop onto the hero. Desktop-only in practice — a phone has no
    // drag — so it is an addition to the button, never a replacement for it.
    const hero = $('.hero');
    if (hero) {
      // dragover must be cancelled or the browser navigates to the dropped
      // file, replacing the app with a bare image.
      hero.addEventListener('dragover', (e) => {
        if (character.portrait) return;   // only the empty state accepts a drop
        e.preventDefault();
        hero.classList.add('is-dropping');
      });
      hero.addEventListener('dragleave', () => hero.classList.remove('is-dropping'));
      hero.addEventListener('drop', (e) => {
        if (character.portrait) return;
        e.preventDefault();
        hero.classList.remove('is-dropping');
        acceptPortraitFile(e.dataTransfer && e.dataTransfer.files[0]);
      });
    }

    // Identity: Enter saves, matching the item form. A single-line input, so
    // Enter has no other job here.
    const nameEl = idField('name');
    if (nameEl) nameEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); saveIdentity(); }
    });

    // notes search — filters as you type, like every other search you have used
    const search = noteField('search');
    if (search) search.addEventListener('input', () => setNoteQuery(search.value));

    // Its own listener rather than the delegated one, for the reason the note
    // search has its own: the field is never repainted while it has focus, so
    // the caret stays where the player put it.
    const rulesSearch = $('[data-rules-search]');
    if (rulesSearch) rulesSearch.addEventListener('input', () => setRulesQuery(rulesSearch.value));

    // keyboard: Enter in the calc field heals, Esc closes
    const ci = calcInput();
    if (ci) ci.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { heal(state.calcResource, ci.value); closeCalc(); renderVitals(); renderDerived(); save(); }
      if (e.key === 'Escape') closeCalc();
    });
  }

  /* ------------------------------------------------------------------ */
  /* INIT                                                               */
  /* ------------------------------------------------------------------ */
  function init() {
    // Tuning lives in the stylesheet with the rest of the design; read it once
    // here rather than keeping a second copy of the numbers in JS.
    pullMax      = cssNumber('--pull-max', pullMax);
    pullSettleMs = cssNumber('--pull-settle', pullSettleMs);
    // Before loadRoster(), because opening a character resolves its ids and a
    // fallback entry that arrives afterwards is a fallback that arrived too
    // late — the character would already have dropped what it referenced.
    loadImportedEntries();
    // Builds the roster, migrates a pre-roster install, and opens a character
    // — so it stands in for the old load() + loadPortrait() pair.
    loadRoster();
    // Paints the Home card and the Settings section from the stored flag.
    // Independent of the roster and cheap, so its order against the rest of
    // init() does not matter — it runs here simply because the markup exists.
    loadAccount();
    renderAll();
    wire();
    // Start on Home. It used to be the sheet, from the prototype where the sheet
    // was the only screen worth showing — but Home is the screen every other one
    // is reached from, and it is the only one that reads nothing from the roster,
    // so it is also the only safe landing for an install with no characters in
    // it. data-tab is still set: it is the sheet's OWN default, waiting for
    // whenever a character is opened.
    app.setAttribute('data-view', 'home');
    app.setAttribute('data-tab', 'action');
  }

  /* Not DOMContentLoaded: the screens are fetched into .app by boot.js and
     arrive well after that event fires. WAYPOINT_READY resolves once the
     markup is in, so init() can keep assuming the DOM is complete — which
     is why nothing else in this file had to change. If the fetches fail,
     this rejects and init() never runs; boot.js has already put an
     explanation on screen by then. */
  window.WAYPOINT_READY.then(init);
})();
