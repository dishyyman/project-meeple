/* =====================================================================
   MEEPLE — app icon generator (development only)
   ---------------------------------------------------------------------
   Run:  node tools/make-icons.mjs

   Renders resources/images/icons/icon.svg to every PNG the home screen
   and the browser tab ask for. The SVG is the source; the PNGs are
   GENERATED — never edit them by hand, edit the SVG and rerun this.

   Why render through a browser: the PNGs have to be exact pixel sizes,
   and Playwright (already a dev dependency for the tests) draws an SVG
   the same way Safari and Chrome will. No image library is added.

     apple-touch-icon.png   180  iOS home screen
     icon-192.png           192  manifest, Android launcher
     icon-512.png           512  manifest, Android splash / install
     icon-maskable-512.png  512  manifest "maskable": Android crops it to
                                 its own shape, so the journal rule (#frame)
                                 is dropped and the meeple scaled into the
                                 safe circle (the middle 80%)
     favicon-32.png          32  the browser tab
   ===================================================================== */
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'resources', 'images', 'icons');

const OUTPUTS = [
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  { file: 'favicon-32.png', size: 32 },
];

const svg = await readFile(join(DIR, 'icon.svg'), 'utf8');

// Same browser the tests use (channel: 'chrome' — the installed Chrome).
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const { file, size, maskable } of OUTPUTS) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    // The meeple is drawn about 68% of the canvas tall; 0.82 brings it
    // comfortably inside the maskable safe circle with room to spare.
    const maskCss = maskable
      ? '#frame { display: none; } #meeple { transform: scale(0.82); transform-origin: 512px 540px; }'
      : '';
    await page.setContent(`<!doctype html><style>
      html, body { margin: 0; background: #232323; }
      svg { display: block; width: ${size}px; height: ${size}px; }
      ${maskCss}
    </style>${svg}`);
    await page.screenshot({ path: join(DIR, file), clip: { x: 0, y: 0, width: size, height: size } });
    await page.close();
    console.log(`wrote ${file} (${size}×${size})`);
  }
} finally {
  await browser.close();
}
