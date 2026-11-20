/* =====================================================================
   MEEPLE — the appearance switch

   Two choices, made independently in Settings → Appearance:

     theme   which colour family: ember · journal · moss · dusk · ink
     mode    light · dark · system ("Auto" in the picker — follows the
             device's own light/dark setting)

   and two attributes on <html>, which tokens.css reads:

     data-theme   the theme id, always one of THEMES below
     data-mode    "light" | "dark" — NEVER "system". Auto is resolved here,
                  through prefers-color-scheme, so CSS only ever has two
                  modes to reason about (docs/design-system.md §3.3).

   Nothing else in the app knows a theme exists. Every colour on every
   screen is a token, and each theme × mode is one block of token values in
   tokens.css; components never ask which theme is on.

   WHY THIS FILE AND NOT main.js
   Same reason frame.js is separate: the attributes have to be on <html>
   BEFORE the first paint, or a player who chose a light theme would see the
   dark app flash up and snap away on every launch. This file loads in
   <head>, after the stylesheet and before the body, and applies the stored
   choice in that same synchronous pass. main.js only arrives once the
   screens have been fetched, which is far too late for that.
   main.js drives it through window.MEEPLE_THEME (below) — the Settings
   picker reads the choice from here and hands changes back.

   THE DEFAULT IS EMBER, DARK
   Not Auto. Ember dark is the app as it shipped before themes existed, so a
   player who never opens Appearance sees exactly what they always saw,
   whatever their phone is set to. Auto is one tap away for anyone who
   wants it.

   STORAGE
   'meeple:appearance', colon-separated like frame.js's 'meeple:preview'
   and unlike the app's 'meeple.*' data keys — deliberately. A colour
   preference belongs to this device, not to the player's characters, so it
   stays out of backups the same way the preview choice does.
   ===================================================================== */
(function (root) {
  'use strict';

  const KEY = 'meeple:appearance';

  /* The registry. Order is the picker's order; label is what the picker
     says. Adding a theme is one line here and two blocks in tokens.css (its
     light and dark values) — tests/unit/themes.test.js fails until both
     exist and pass contrast. The id is what is stored: never rename one. */
  const THEMES = [
    { id: 'ember',   label: 'Ember' },
    { id: 'journal', label: 'Field Journal' },
    { id: 'moss',    label: 'Moss' },
    { id: 'dusk',    label: 'Dusk' },
    { id: 'ink',     label: 'Ink & Iron' },
  ];
  const MODES = ['light', 'dark', 'system'];
  const DEFAULT = { theme: 'ember', mode: 'dark' };

  /* Anything read back is checked against the lists, so a hand-edited or
     stale value (a theme that was renamed, a mode from a future version)
     falls back to the default rather than leaving <html> with an attribute
     no CSS block answers — which would quietly show Ember dark anyway, but
     would also leave the picker showing nothing chosen. */
  function clean(pref) {
    const p = pref && typeof pref === 'object' ? pref : {};
    return {
      theme: THEMES.some((t) => t.id === p.theme) ? p.theme : DEFAULT.theme,
      mode: MODES.includes(p.mode) ? p.mode : DEFAULT.mode,
    };
  }

  const api = { KEY, THEMES, MODES, DEFAULT, clean };

  // Node loads this file for the unit tests (the registry is what they
  // check tokens.css against); everything below needs a browser.
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;

  const html = document.documentElement;
  const darkQuery = root.matchMedia ? root.matchMedia('(prefers-color-scheme: dark)') : null;
  let pref = read();

  function read() {
    // try: storage can throw outright (Safari private mode, blocked site
    // data). A preference that cannot be read is simply the default.
    try { return clean(JSON.parse(localStorage.getItem(KEY))); } catch (_) { return clean(null); }
  }

  // "system" becomes whichever the device says right now.
  function resolvedMode() {
    if (pref.mode !== 'system') return pref.mode;
    return darkQuery && darkQuery.matches ? 'dark' : 'light';
  }

  function apply() {
    html.setAttribute('data-theme', pref.theme);
    html.setAttribute('data-mode', resolvedMode());
    /* The browser's own chrome — Safari's tab tint, Android's status bar —
       takes its colour from this meta, so it follows the page rather than
       staying the dark grey index.html ships with. Read back from the
       token, not repeated here, so tokens.css stays the only place a
       colour is written. The stylesheet is linked above this script, so
       the value is already there on the first pass. */
    const meta = document.querySelector('meta[name="theme-color"]');
    const page = getComputedStyle(html).getPropertyValue('--bg-page').trim();
    if (meta && page) meta.setAttribute('content', page);
  }

  // While on Auto, follow the device if it flips between light and dark
  // with the app open (a sunset schedule, Control Centre). A fixed choice
  // ignores it — the player said what they wanted.
  if (darkQuery) {
    const onChange = () => { if (pref.mode === 'system') apply(); };
    if (darkQuery.addEventListener) darkQuery.addEventListener('change', onChange);
    else if (darkQuery.addListener) darkQuery.addListener(onChange);   // Safari < 14
  }

  api.get = () => ({ ...pref });
  // Takes a partial choice — { theme } or { mode } — so the picker hands
  // over only what was tapped.
  api.set = (next) => {
    pref = clean({ ...pref, ...next });
    try { localStorage.setItem(KEY, JSON.stringify(pref)); } catch (_) { /* applies for this visit only */ }
    apply();
    return api.get();
  };

  apply();
  root.MEEPLE_THEME = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
