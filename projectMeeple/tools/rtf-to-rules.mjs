#!/usr/bin/env node
/* =====================================================================
   MEEPLE — Player's Guide → rules.js
   ---------------------------------------------------------------------
   Turns `docs/Meeple Player's Guide.rtf` into `resources/js/rules.js`,
   the content file the in-app Rules browser reads. Same job csv-to-json
   does for the library: the DOCUMENT is the source of truth, this file
   is the pipe, and the generated JS is never hand-edited.

   TO UPDATE THE RULES: drop the new export over the RTF in docs/ and run

       node tools/rtf-to-rules.mjs

   MAC ONLY. The RTF is read by macOS's built-in `textutil`, so this
   script runs on a Mac and nowhere else; anywhere else it stops with a
   message saying so. The guide is written in Google Docs, which can
   export HTML directly — reading that export instead would remove the
   textutil step and make this run anywhere. Not done yet: the heading
   detection below reads textutil's stylesheet, and a Google Docs export
   styles text differently, so it needs a sample export to adapt to.
   See docs/architecture.md §13.

   ---------------------------------------------------------------------
   WHY IT GOES THROUGH HTML AND NOT PLAIN TEXT

   `textutil -convert txt` flattens the guide's eleven tables into one
   cell per line — the DC ladder, the Wound ladder and the boon list all
   arrive as an unlabelled column of fragments, and no amount of guessing
   puts them back together. The HTML conversion keeps <table>, keeps the
   lists, and keeps a stylesheet that tells us how big every line was set.

   WHY IT READS FONT SIZES AND NOT CLASS NAMES

   textutil generates the class names (p1, li7, …) fresh on every export,
   in document order — so they are guaranteed to move the next time this
   guide is exported. The FONT SIZES behind them come from the document's
   own styles and do not. So the stylesheet is parsed first, every class
   is resolved to a size in px, and headings are recognised by being set
   larger than body text:

       >= 20px   chapter        ("CHAPTER 1: PLAYING THE GAME")
       >= 15px   section        ("Core Attributes", "Base Actions")
       >= 12.5px sub-heading    ("Harder Tasks", "Move — 1 AP")
       else      body text

   Bullets and paragraphs are both <li> at body size, and are told apart
   by the one thing that actually differs: a paragraph carries top/bottom
   margin from the document's paragraph spacing, a bullet does not. If a
   future export loses that distinction the worst case is bullets reading
   as short paragraphs, which is wrong but not broken.
   ===================================================================== */

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, "docs/Meeple Player's Guide.rtf");
const TARGET = join(ROOT, 'resources/js/rules.js');

/* ---------------------------------------------------------------- */
/* 1. RTF → HTML                                                    */
/* ---------------------------------------------------------------- */

// macOS ships textutil, which is the only thing on the machine that reads
// RTF properly. Failing loudly here beats emitting an empty rulebook.
function toHtml(path) {
  // Checked before trying, so a non-Mac gets the actual reason rather than
  // a spawn error about a missing binary. See "MAC ONLY" at the top.
  if (process.platform !== 'darwin') {
    console.error(
      'rtf-to-rules needs macOS: it reads the guide with textutil, which only ships on a Mac.\n'
      + 'Run it on a Mac, or see docs/architecture.md §13 for the plan to read a Google Docs HTML export instead.');
    process.exit(1);
  }
  try {
    return execFileSync('textutil', ['-convert', 'html', '-stdout', path], {
      encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    console.error(`Could not read ${path}.\n${err.message}`);
    process.exit(1);
  }
}

/* ---------------------------------------------------------------- */
/* 2. STYLES — class name → { size, spaced }                        */
/* ---------------------------------------------------------------- */

function readStyles(html) {
  const styles = {};
  // Both p.pN and li.liN, in one pass — they carry the same two facts and
  // the rest of this file does not care which tag a line came from.
  for (const m of html.matchAll(/(?:p|li)\.(\w+)\s*\{([^}]*)\}/g)) {
    const body = m[2];
    const size = Number((/font:\s*([\d.]+)px/.exec(body) || [])[1] || 0);
    // "margin: TOP RIGHT BOTTOM LEFT" — a non-zero top is paragraph spacing.
    const top = Number((/margin:\s*([\d.]+)px/.exec(body) || [])[1] || 0);
    styles[m[1]] = { size, spaced: top > 0 };
  }
  return styles;
}

/* ---------------------------------------------------------------- */
/* 3. TEXT                                                          */
/* ---------------------------------------------------------------- */

const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
  '&nbsp;': ' ', '&#39;': "'", '&rsquo;': '’', '&lsquo;': '‘',
  '&ldquo;': '“', '&rdquo;': '”', '&mdash;': '—', '&ndash;': '–',
};

const decode = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/&[a-z]+;|&#\d+;/gi, (e) => (e in ENTITIES ? ENTITIES[e] : e));

// Tags out, entities back, whitespace collapsed. The guide carries no
// meaningful inline markup beyond bold and italic, and neither survives
// into the app — the stylesheet decides emphasis there, not the document.
const textOf = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/* ---------------------------------------------------------------- */
/* 4. TABLES                                                        */
/* ---------------------------------------------------------------- */

/* The guide's tables are all simple grids — no spans, no nesting (eleven
   <table> and eleven <tbody> say so). The first row is treated as the
   header when every one of its cells is bold, which is how every table in
   this document is actually written; when it is not, the table is emitted
   headerless rather than promoting a row of data into a heading. */
function parseTable(html) {
  const rows = [];
  for (const tr of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((td) => td[1]);
    if (cells.length) rows.push(cells);
  }
  if (!rows.length) return null;

  const bold = (c) => /<b>\s*[^<\s]/.test(c);
  const head = rows[0].every(bold) ? rows.shift().map(textOf) : [];
  const body = rows.map((r) => r.map(textOf)).filter((r) => r.some(Boolean));
  if (!body.length && !head.length) return null;

  // A "table" of one column is a list wearing a grid; the guide has a few
  // (the spell families are three parallel one-word columns). Kept as a
  // table anyway — the columns mean something to the reader even when the
  // header does not repeat.
  return { t: 'table', head, rows: body };
}

/* ---------------------------------------------------------------- */
/* 5. WALK THE DOCUMENT                                             */
/* ---------------------------------------------------------------- */

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

function parse(html) {
  const styles = readStyles(html);
  const body = (/<body[^>]*>([\s\S]*)<\/body>/.exec(html) || [, html])[1];

  const chapters = [];
  let title = "Meeple — Player's Guide";
  let chapter = null;
  let section = null;

  // Every chapter needs somewhere to put text that arrives before its first
  // section heading. Made on demand so a chapter whose prose all sits under
  // headings never grows an empty "Overview".
  const intoSection = () => {
    if (section) return section;
    if (!chapter) return null;
    section = { id: `${chapter.id}-overview`, title: 'Overview', blocks: [] };
    chapter.sections.push(section);
    return section;
  };

  const push = (block) => {
    const s = intoSection();
    if (s) s.blocks.push(block);
  };

  let i = 0;
  while (i < body.length) {
    const table = body.indexOf('<table', i);
    const line = body.slice(i).search(/<(?:p|li) class="/);
    const lineAt = line === -1 ? -1 : i + line;

    // Whichever comes first. A table has to be consumed WHOLE, because the
    // <li> inside its cells would otherwise be read as body lines of the
    // surrounding chapter — which is how a DC ladder becomes ten orphan
    // paragraphs saying "10", "Standard", "15", "Hard".
    if (table !== -1 && (lineAt === -1 || table < lineAt)) {
      const end = body.indexOf('</table>', table);
      if (end === -1) break;
      const parsed = parseTable(body.slice(table, end));
      if (parsed) push(parsed);
      i = end + 8;
      continue;
    }
    if (lineAt === -1) break;

    const m = /^<(p|li) class="(\w+)"[^>]*>([\s\S]*?)<\/\1>/.exec(body.slice(lineAt));
    if (!m) { i = lineAt + 4; continue; }
    i = lineAt + m[0].length;

    const style = styles[m[2]] || { size: 11, spaced: true };
    const text = textOf(m[3]);
    if (!text) continue;                       // spacer lines: <li><br></li>

    /* --- chapter ------------------------------------------------- */
    if (style.size >= 20) {
      // The document's own title is set at chapter size. It is told apart by
      // what it says, not by where it is: CHAPTER and APPENDIX are the two
      // words this guide starts a division with.
      if (!/^(chapter|appendix)\b/i.test(text)) { title = text; continue; }
      chapter = { id: slug(text), title: text, sections: [] };
      chapters.push(chapter);
      section = null;
      continue;
    }

    /* --- section ------------------------------------------------- */
    if (style.size >= 15) {
      if (!chapter) {
        chapter = { id: 'front', title: 'Front Matter', sections: [] };
        chapters.push(chapter);
      }
      section = { id: `${chapter.id}-${slug(text)}`, title: text, blocks: [] };
      chapter.sections.push(section);
      continue;
    }

    /* --- sub-heading --------------------------------------------- */
    // Stays INSIDE its section rather than becoming one. "Move — 1 AP" is a
    // line of Base Actions, not a peer of it, and splitting every action
    // into its own collapsible row would bury the section it belongs to.
    if (style.size >= 12.5) { push({ t: 'h', text }); continue; }

    /* --- body ---------------------------------------------------- */
    // Consecutive bullets are merged into one list, so the renderer gets a
    // <ul> rather than a run of one-item lists.
    if (!style.spaced) {
      const s = intoSection();
      const last = s && s.blocks[s.blocks.length - 1];
      if (last && last.t === 'ul') last.items.push(text);
      else push({ t: 'ul', items: [text] });
      continue;
    }
    push({ t: 'p', text });
  }

  // A section with nothing in it is a heading the document left empty, and
  // there is no reason to ship a row that opens onto blank space.
  for (const c of chapters) c.sections = c.sections.filter((s) => s.blocks.length);
  return { title, chapters: chapters.filter((c) => c.sections.length) };
}

/* ---------------------------------------------------------------- */
/* 6. EMIT                                                          */
/* ---------------------------------------------------------------- */

const html = toHtml(SOURCE);
const guide = parse(html);
const stamp = new Date().toISOString().slice(0, 10);

const out = `/* =====================================================================
   MEEPLE — Player's Guide, as data
   ---------------------------------------------------------------------
   GENERATED FILE — DO NOT EDIT BY HAND.

   Source:    docs/Meeple Player's Guide.rtf
   Generated: ${stamp}
   Regenerate: node tools/rtf-to-rules.mjs

   Every edit belongs in the RTF, which is the rulebook. Editing this file
   means the app and the document disagree, and the document wins next time
   anyone runs the converter.

   Declared as a plain global, like every script the app loads — same
   arrangement as dice.js and library.js.
   ===================================================================== */

window.MEEPLE_RULES = ${JSON.stringify({ ...guide, generated: stamp }, null, 2)};
`;

writeFileSync(TARGET, out);

const sections = guide.chapters.reduce((n, c) => n + c.sections.length, 0);
const blocks = guide.chapters.reduce((n, c) =>
  n + c.sections.reduce((k, s) => k + s.blocks.length, 0), 0);
const tables = guide.chapters.reduce((n, c) =>
  n + c.sections.reduce((k, s) => k + s.blocks.filter((b) => b.t === 'table').length, 0), 0);

console.log(`${guide.title}`);
console.log(`  ${guide.chapters.length} chapters, ${sections} sections, ${blocks} blocks (${tables} tables)`);
for (const c of guide.chapters) console.log(`  · ${c.title} — ${c.sections.length} sections`);
console.log(`→ ${TARGET}`);
