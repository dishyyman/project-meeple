/* =====================================================================
   MEEPLE — the colour rule, enforced
   ---------------------------------------------------------------------
   Run:  npm run test:unit

   docs/design-system.md: "Never hardcode a color outside tokens.css." Re-
   skinning the app is meant to be an edit to ONE file; a literal colour in
   a screen's stylesheet is a spot that edit would miss. The rule had drifted
   to fifteen literals in seven files before a review caught it (Codex,
   2026-11-14), so it is now a test rather than a sentence.

   What counts as a literal: rgb()/rgba(), hsl()/hsla(), a #hex colour, or a
   named colour such as `black`. Comments are stripped first — prose may
   quote a value (style.css's header names #232323). `transparent` and
   `currentColor` are not colours of ours and stay allowed.
   ===================================================================== */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const CSS = path.join(__dirname, '..', '..', 'resources', 'css');

const LITERALS = [
  /\b(?:rgba?|hsla?)\(/i,
  /#[0-9a-f]{3,8}\b/i,
  // Whole words only: `white-space` and `--ink-black` are not colours.
  /(?<![-\w])(?:black|white|red|green|blue|gray|grey|orange|yellow|purple|pink|brown)(?![-\w])/i,
];

test('no colour is written outside tokens.css', () => {
  const found = [];
  for (const file of fs.readdirSync(CSS).filter((f) => f.endsWith('.css') && f !== 'tokens.css')) {
    // Blank each comment out but keep its newlines, so line numbers hold.
    const text = fs.readFileSync(path.join(CSS, file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
    text.split('\n').forEach((line, i) => {
      if (LITERALS.some((re) => re.test(line))) found.push(`${file}:${i + 1}  ${line.trim()}`);
    });
  }
  assert.deepEqual(found, [], `colours belong in tokens.css as named tokens:\n  ${found.join('\n  ')}`);
});

test('the check itself catches what it should, and nothing it should not', () => {
  const hit = (s) => LITERALS.some((re) => re.test(s));
  for (const bad of ['box-shadow: 0 2px 8px rgba(0,0,0,0.5);', 'color: #fff;', 'background: hsl(40 50% 50%);', 'color: black;']) {
    assert.equal(hit(bad), true, bad);
  }
  for (const ok of ['white-space: nowrap;', 'color: var(--ink-black);', 'background: transparent;', 'fill: currentColor;', 'box-shadow: var(--shadow-card);']) {
    assert.equal(hit(ok), false, ok);
  }
});

/* The other half of keeping the look in one place: every font the app
   DOWNLOADS is one a --font-* token actually names. MedievalSharp sat in the
   Google Fonts link for weeks after the switch to Marcellus — a request on
   every launch for a face nothing drew (removed 2026-11-20). */
test('every font index.html downloads is one a --font-* token uses', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
  const tokens = fs.readFileSync(path.join(CSS, 'tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const link = /fonts\.googleapis\.com\/css2\?([^"]+)/.exec(html);
  assert.ok(link, 'the Google Fonts link should be in index.html');
  const loaded = [...link[1].matchAll(/family=([^:&]+)/g)].map((m) => decodeURIComponent(m[1].replace(/\+/g, ' ')));
  const used = [...tokens.matchAll(/--font-[\w-]+\s*:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(loaded.filter((f) => !used.includes(f)), [], 'downloaded but never used');
  assert.deepEqual(used.filter((f) => !loaded.includes(f)), [], 'used but never downloaded');
});
