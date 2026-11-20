/* =====================================================================
   MEEPLE — every theme, in both modes, is complete and readable
   ---------------------------------------------------------------------
   Run:  npm run test:unit

   docs/design-system.md §3.3 sets three rules for a theme, and this file
   holds tokens.css to all of them:

     1. Same token names, different values. A theme block may only set
        tokens the base :root already declares — a new name in one theme is
        a token every component would have to know about.
     2. Every registered theme (resources/js/theme.js) has a light block
        and a dark block. Ember's dark values ARE the base :root, so it is
        the one exception: it needs no dark block of its own.
     3. Every foreground/background pair clears WCAG AA. The pairs are the
        ones the screens actually draw (named beside each); a theme that
        fails one fails here, before anyone has to open the app to notice.

   How a theme's values are found — the same cascade the browser runs:
     base :root  →  :root[data-mode="<mode>"]  →  :root[data-theme][data-mode]
   later wins, token by token.
   ===================================================================== */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { THEMES } = require('../../resources/js/theme.js');

const CSS = fs.readFileSync(path.join(__dirname, '..', '..', 'resources', 'css', 'tokens.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

// Every `:root… { … }` block, keyed by its selector with spaces squeezed out.
const BLOCKS = new Map();
for (const m of CSS.matchAll(/(:root[^{]*)\{([^{}]*)\}/g)) {
  const decls = {};
  for (const d of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) decls[d[1]] = d[2].trim();
  BLOCKS.set(m[1].replace(/\s+/g, ''), decls);
}
const BASE = BLOCKS.get(':root');
const modeSel = (mode) => `:root[data-mode="${mode}"]`;
const themeSel = (id, mode) => `:root[data-theme="${id}"][data-mode="${mode}"]`;

function resolve(id, mode) {
  const t = { ...BASE, ...(BLOCKS.get(modeSel(mode)) || {}), ...(BLOCKS.get(themeSel(id, mode)) || {}) };
  // One level of var() is all the colour tokens use (--focus: var(--accent-bright)).
  for (const [k, v] of Object.entries(t)) {
    const ref = /^var\((--[\w-]+)\)$/.exec(v);
    if (ref && t[ref[1]]) t[k] = t[ref[1]];
  }
  return t;
}

// WCAG 2.x relative luminance and contrast ratio. Hex only: every pair
// below is between solid colours, by design.
function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255]
    .map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; })
    .reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
}
function ratio(a, b) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [foreground, background, minimum, where it is drawn]
const PAIRS = [
  ['--ink',            '--bg-page',       4.5, 'names, numbers'],
  ['--ink',            '--bg-card',       4.5, 'card titles'],
  ['--ink',            '--bg-input',      4.5, 'typed text'],
  ['--ink',            '--bg-parchment2', 4.5, 'a selected tile\'s label'],
  ['--ink-soft',       '--bg-page',       4.5, 'body text'],
  ['--ink-soft',       '--bg-card',       4.5, 'body text in a card'],
  ['--ink-muted',      '--bg-page',       4.5, 'labels'],
  ['--ink-muted',      '--bg-card',       4.5, 'labels in a card'],
  ['--ink-faint',      '--bg-page',       4.5, 'captions'],
  ['--ink-faint',      '--bg-card',       4.5, 'captions in a card'],
  ['--gold',           '--bg-page',       4.5, '✦ section labels'],
  ['--gold',           '--bg-card',       4.5, 'gold labels in a card'],
  ['--heading',        '--bg-page',       4.5, 'screen titles'],
  ['--accent-bright',  '--bg-page',       4.5, 'accent text, active tab'],
  ['--accent-bright',  '--bg-card',       4.5, 'accent text in a card'],
  // A chosen chip or mode tile: its WORD is --ink (above) and only its edge
  // and glyph take the accent, which as a non-text mark needs 3:1.
  ['--accent-bright',  '--bg-parchment2', 3,   'a chosen mode tile\'s glyph'],
  ['--on-accent',      '--accent',        4.5, 'primary button label'],
  ['--danger-bright',  '--bg-page',       4.5, 'error lines'],
  ['--danger-bright',  '--bg-card',       4.5, 'error lines in a card'],
  ['--on-dark',        '--danger',        4.5, 'a destructive button'],
  ['--warning-bright', '--bg-page',       4.5, 'warnings'],
  ['--warning-bright', '--bg-card',       4.5, 'warnings in a card'],
  ['--success-bright', '--bg-page',       4.5, 'confirmations'],
  ['--mana-bright',    '--bg-page',       4.5, 'the mana label'],
  ['--mana-bright',    '--bg-card',       4.5, 'the mana stepper'],
  ['--mana-text',      '--mana',          4.5, 'a filled mana button'],
  ['--heal-text',      '--heal',          4.5, 'Heal'],
  ['--damage-text',    '--damage',        4.5, 'Damage'],
  ['--on-dark',        '--gold-fill',     4.5, 'the calculator\'s operator keys'],
  ['--focus',          '--bg-page',       3,   'the keyboard focus edge'],
  ['--focus',          '--bg-card',       3,   'the focus edge on a card'],
];

const COMBOS = THEMES.flatMap((t) => ['light', 'dark'].map((mode) => [t.id, mode]));

test('every registered theme has a light and a dark block', () => {
  const missing = COMBOS
    .filter(([id, mode]) => !(id === 'ember' && mode === 'dark'))   // = the base :root
    .filter(([id, mode]) => !BLOCKS.has(themeSel(id, mode)))
    .map(([id, mode]) => themeSel(id, mode));
  assert.deepEqual(missing, []);
});

test('theme and mode blocks only re-value tokens the base declares', () => {
  const extra = [];
  for (const [sel, decls] of BLOCKS) {
    if (!sel.includes('data-theme') && !sel.includes('data-mode')) continue;
    for (const name of Object.keys(decls)) if (!(name in BASE)) extra.push(`${sel} ${name}`);
  }
  assert.deepEqual(extra, [], 'add the token to the base :root first, then re-value it');
});

test('no block in tokens.css names a theme the registry does not know', () => {
  const ids = new Set(THEMES.map((t) => t.id));
  const strays = [...BLOCKS.keys()]
    .map((sel) => /data-theme="([^"]+)"/.exec(sel)).filter(Boolean)
    .map((m) => m[1]).filter((id) => !ids.has(id));
  assert.deepEqual(strays, []);
});

for (const [id, mode] of COMBOS) {
  test(`${id} ${mode}: every text and focus pair clears WCAG AA`, () => {
    const t = resolve(id, mode);
    const fails = [];
    for (const [fg, bg, min, where] of PAIRS) {
      assert.match(t[fg], /^#[0-9a-f]{6}$/i, `${fg} should be a 6-digit hex in ${id} ${mode}`);
      assert.match(t[bg], /^#[0-9a-f]{6}$/i, `${bg} should be a 6-digit hex in ${id} ${mode}`);
      const r = ratio(t[fg], t[bg]);
      if (r < min) fails.push(`${fg} on ${bg} is ${r.toFixed(2)}:1, needs ${min} — ${where}`);
    }
    assert.deepEqual(fails, []);
  });
}

test('the contrast maths agrees with known values', () => {
  assert.equal(ratio('#000000', '#ffffff').toFixed(1), '21.0');
  assert.equal(ratio('#777777', '#ffffff').toFixed(2), '4.48');
});
