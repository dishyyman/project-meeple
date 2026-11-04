/* =====================================================================
   WAYPOINT — shared helpers for the browser tests
   ---------------------------------------------------------------------
   Every test starts from a fresh browser context (fresh localStorage), so
   openApp() always lands on a first run: Home, with the seed character
   Elara in the roster.

   Clicks go through `press()`, which calls element.click() in the page.
   That fires the same delegated handler a tap does (wire() in main.js)
   without Playwright's visibility rules — several controls live in the
   drawer or inside a tab that is not on screen, and what is under test is
   what the app DOES when they are pressed, not where they are drawn.
   Tests about layout and reachability use Playwright's own click instead.
   ===================================================================== */
const { expect } = require('@playwright/test');

/* Math.random, made repeatable. A tiny linear congruential generator seeded
   per page: the same test makes the same rolls every run, so a dice total
   can be asserted exactly. Installed before any app script runs. */
function pinRandom(seed = 1) {
  let s = seed >>> 0;
  Math.random = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* Put characters into storage before the app boots, exactly where save()
   would have written them, so a test can start from any build without
   clicking through creation. `saves` maps an id to a save object (the shape
   in docs/database.md A3). */
function seedStorage(saves) {
  const ids = Object.keys(saves);
  localStorage.setItem('waypoint.roster', JSON.stringify({ ids, activeId: ids[0] }));
  for (const id of ids) localStorage.setItem(`waypoint.character.${id}`, JSON.stringify(saves[id]));
}

async function openApp(page, { seed = 1, saves = null } = {}) {
  await page.addInitScript(pinRandom, seed);
  // Only on the first load of this page: a test that reloads to check
  // persistence must see what the app saved, not the seed again. Built as a
  // script string because an init script runs in the page, where this
  // file's functions do not exist.
  if (saves) {
    await page.addInitScript(`
      if (!sessionStorage.getItem('waypoint-test-seeded')) {
        sessionStorage.setItem('waypoint-test-seeded', '1');
        (${seedStorage.toString()})(${JSON.stringify(saves)});
      }`);
  }
  // Console errors and uncaught exceptions are watched for every test by
  // helpers/test.js, from before this navigation — nothing to collect here.
  await page.goto('/index.html');
  // init() lands on Home once WAYPOINT_READY has resolved and the app wired.
  await page.waitForFunction(() =>
    document.querySelector('.app')?.getAttribute('data-view') === 'home'
    && document.querySelector('[data-bind="healthMax"]')?.textContent !== '');
}

// element.click() on the first match — see the header for why.
async function press(page, selector) {
  const found = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    el.click();
    return true;
  }, selector);
  expect(found, `nothing matched ${selector}`).toBe(true);
}

const appAttr = (page, name) =>
  page.evaluate((n) => document.querySelector('.app').getAttribute(n), name);

async function openFirstCharacter(page) {
  await press(page, '[data-nav="characters"]');
  await press(page, '[data-open-character]');
  await expect.poll(() => appAttr(page, 'data-view')).toBe('sheet');
}

// Close whichever modal is open, the way a player would: its own close
// control. Fails loudly if no modal is open, so a test cannot think it
// dismissed something that never appeared.
async function closeModal(page) {
  const open = await appAttr(page, 'data-modal');
  expect(open, 'expected a modal to be open').not.toBe('closed');
  await press(page, `.modal--${open} [data-modal="close"]`);
}

/* Apply damage or healing through the sheet's own calculator: tap the bar,
   type the amount, press Damage or Heal. */
async function applyCalc(page, resource, verb, amount) {
  await press(page, `[data-calc="${resource}"]`);
  await page.fill('[data-calc-input]', String(amount));
  await press(page, `[data-calc-apply="${verb}"]`);
}

async function addEffect(page, id) {
  await press(page, '[data-effect-open]');
  await press(page, `[data-effect-add="${id}"]`);
  if ((await appAttr(page, 'data-modal')) !== 'closed') await closeModal(page);
}

/* Everything the sheet says, as data. textContent rather than innerText so
   all three tabs are read whichever one is showing; the roll boxes'
   expressions live in attributes, so they are collected separately. This is
   the characterization record: if a refactor changes any number anywhere on
   the sheet, this changes. */
async function readSheet(page) {
  return page.evaluate(() => {
    const norm = (s) => s.replace(/\s+/g, ' ').trim();
    const sheet = document.querySelector('.screen--sheet');
    return {
      text: norm(sheet.textContent),
      rolls: [...sheet.querySelectorAll('[data-roll]')].map((el) =>
        `${el.dataset.roll} ${el.dataset.rollLabel} = ${el.dataset.rollExpr}`),
      woundsFilled: sheet.querySelectorAll('[data-cells="wounds"] .is-on, [data-cells="wounds"] [aria-pressed="true"]').length,
      view: document.querySelector('.app').getAttribute('data-modal'),
    };
  });
}

const path = require('path');
const FIXTURES = path.join(__dirname, '..', '..', 'fixtures', 'files');
const fixture = (name) => path.join(FIXTURES, name);

/* Press a control that opens the OS file picker, and answer it. `file` is a
   path, or { name, mimeType, buffer } for a file made in the test. */
async function chooseFile(page, opener, file) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    press(page, opener),
  ]);
  await chooser.setFiles(file);
}

/* Press a control that downloads a file; returns { name, json }. */
async function download(page, selector) {
  const [dl] = await Promise.all([page.waitForEvent('download'), press(page, selector)]);
  const fs = require('fs');
  const text = fs.readFileSync(await dl.path(), 'utf8');
  return { name: dl.suggestedFilename(), json: JSON.parse(text) };
}

// The import result window: { state: 'ok' | 'error', title, text }.
async function readResult(page) {
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('import');
  return page.evaluate(() => {
    const card = document.querySelector('.modal--import .modal__card');
    const t = (b) => card.querySelector(`[data-bind="${b}"]`).textContent.trim();
    return { state: card.getAttribute('data-import-state'), title: t('importTitle'), text: t('importText') };
  });
}

// Names in the roster, in order.
const rosterNames = (page) => page.$$eval('[data-list="roster"] .persona-card__name',
  (els) => els.map((e) => e.textContent.trim()));

module.exports = {
  openApp, press, appAttr, openFirstCharacter, closeModal, applyCalc, addEffect, readSheet,
  fixture, chooseFile, download, readResult, rosterNames,
};
