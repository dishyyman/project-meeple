/* =====================================================================
   MEEPLE — the layout at every size (tokens.css "Layout bands")
   ---------------------------------------------------------------------
   The app fills whatever it is given and answers to four bands: compact
   (phones), medium (iPad upright), expanded (iPad on its side, an open
   foldable, a desktop — the sheet goes two-pane) and short (a closed
   foldable, an SE, any phone on its side). These run in the desktop
   projects, in "Fit window" mode, at a window the size of each device, so
   the app is exactly that size — the same thing an iPad gets, minus the
   touch (phone.spec.js runs on emulated iPads for that).

   The sizes are CSS points. The iPhone Duo's are the illustrative ones in
   frame.css §3a (not measured Safari viewports); the layout is meant to
   hold at any size in between, which is why the checks are about
   properties — nothing off the side, the hero in proportion, the right
   number of panes — not about pixel positions.
   ===================================================================== */
const { test, expect } = require('./helpers/test');
const { openApp, press, appAttr, openFirstCharacter } = require('./helpers/app');

const SIZES = {
  'iPhone':               { w: 402,  h: 874,  twoPane: false },
  'iPhone SE':            { w: 375,  h: 667,  twoPane: false },
  'iPhone on its side':   { w: 874,  h: 402,  twoPane: true },
  'iPhone Duo closed':    { w: 466,  h: 678,  twoPane: false },
  'Duo closed, on side':  { w: 678,  h: 466,  twoPane: false },
  'iPhone Duo open':      { w: 890,  h: 626,  twoPane: true },
  'iPad mini':            { w: 744,  h: 1133, twoPane: false },
  'iPad mini on its side':{ w: 1133, h: 744,  twoPane: true },
  'iPad Pro 13″':         { w: 1032, h: 1376, twoPane: true },
  'desktop window':       { w: 1440, h: 900,  twoPane: true },
};

// Fit window: no drawn device, so the app is the window and the window is
// the size under test. Set before boot so nothing paints at another size.
async function openAt(page, { w, h }) {
  await page.setViewportSize({ width: w, height: h });
  await page.addInitScript(() => localStorage.setItem('meeple:preview', JSON.stringify({ device: 'full' })));
  await openApp(page);
}

/* Everything on the showing screen that pokes out past the app's left or
   right edge. Wide tables in the Rules scroll sideways on purpose, inside
   their own wrapper, so they are left out; so is anything with no size. */
const offTheSide = (page) => page.evaluate(() => {
  const app = document.querySelector('.app').getBoundingClientRect();
  const view = document.querySelector('.app').getAttribute('data-view');
  const screen = document.querySelector(`.screen--${view}`);
  const out = [];
  for (const el of screen.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || el.closest('.rules__tablewrap')) continue;
    if (r.left < app.left - 1 || r.right > app.right + 1) {
      out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} (${Math.round(r.left)}–${Math.round(r.right)})`);
    }
  }
  return out.slice(0, 5);
});

for (const [name, size] of Object.entries(SIZES)) {
  test(`${name} (${size.w} × ${size.h}): nothing on any screen runs off the side`, async ({ page }) => {
    await openAt(page, size);
    const check = async (where) => expect(await offTheSide(page), where).toEqual([]);
    await check('home');

    await openFirstCharacter(page);
    for (const tab of ['action', 'character', 'gear', 'notes']) {
      await press(page, `[data-tab="${tab}"]`);
      await check(`sheet / ${tab}`);
    }
    for (const view of ['edit', 'rules', 'settings', 'characters', 'campaigns']) {
      await press(page, `[data-nav="${view}"]`);
      expect(await appAttr(page, 'data-view')).toBe(view);
      await check(view);
    }
    await press(page, '[data-campaign-new]');
    await page.fill('[data-campaign-name]', 'The Ashen Road');
    await press(page, '[data-campaign-save]');
    await expect.poll(() => appAttr(page, 'data-view')).toBe('campaign');
    for (const tab of ['party', 'enemies', 'combat']) {
      await press(page, `.tabbar__btn[data-campaign-tab="${tab}"]`);
      await check(`campaign / ${tab}`);
    }
  });

  test(`${name} (${size.w} × ${size.h}): the hero stays in proportion, and the sheet is ${size.twoPane ? 'two panes' : 'one column'}`, async ({ page }) => {
    await openAt(page, size);
    await openFirstCharacter(page);
    const app = await page.locator('.app').boundingBox();
    const hero = await page.locator('.hero').boundingBox();
    // A fixed 376px hero took 60% of the open Duo and most of a phone on its
    // side. It scales with the height now, with a floor for its buttons.
    expect(hero.height / app.height).toBeLessThanOrEqual(size.h < 460 ? 0.5 : 0.45);
    expect(hero.height).toBeGreaterThanOrEqual(200);

    // On another tab, the side (hero + vitals) stays beside it only in
    // two-pane; on one column it belongs to the Action tab alone.
    await press(page, '[data-tab="character"]');
    const side = page.locator('.sheet__side');
    if (size.twoPane) {
      await expect(side).toBeVisible();
      const s = await side.boundingBox();
      const tab = await page.locator('.tabpage--character').boundingBox();
      expect(s.x + s.width).toBeLessThanOrEqual(tab.x + 1);
      await expect(page.locator('.sheet__side .vitals')).toBeVisible();
      // One Home and one Menu on screen, not two of each.
      await expect(page.locator('.tabpage--character .topbar [data-back]')).toBeHidden();
    } else {
      await expect(side).toBeHidden();
      await expect(page.locator('.tabpage--character .topbar [data-back]')).toBeVisible();
    }
  });
}

test('the phone layout is exactly what it was: 16px gutters, a 376px hero, an 82% drawer', async ({ page }) => {
  await openAt(page, SIZES.iPhone);
  await openFirstCharacter(page);
  const m = await page.evaluate(() => ({
    gutter: getComputedStyle(document.querySelector('.sheet__pad--side')).paddingLeft,
    hero: document.querySelector('.hero').getBoundingClientRect().height,
    tabbarSide: getComputedStyle(document.querySelector('.screen--sheet .tabbar')).paddingLeft,
  }));
  expect(m).toEqual({ gutter: '16px', hero: 376, tabbarSide: '6px' });
  await press(page, '.hero__btn-menu');
  const drawer = await page.locator('.drawer__panel').boundingBox();
  expect(drawer.width).toBeCloseTo(402 * 0.82, 0);
});

test('a wide screen keeps the content to a readable column, and popups to popup size', async ({ page }) => {
  await openAt(page, SIZES['desktop window']);
  // The roster's content column, not the whole 1440px.
  await press(page, '[data-nav="characters"]');
  const pad = await page.locator('.screen--characters .section-pad').evaluate((el) => {
    const cs = getComputedStyle(el);
    return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  });
  expect(pad).toBeLessThanOrEqual(760);
  expect(pad).toBeGreaterThan(700);

  await press(page, '[data-open-character]');
  // The tab bar's buttons gather over their pane rather than spreading out.
  const btns = await page.locator('.screen--sheet .tabbar__btn').evaluateAll((els) => {
    const rs = els.map((e) => e.getBoundingClientRect());
    return rs[rs.length - 1].right - rs[0].left;
  });
  expect(btns).toBeLessThanOrEqual(560 + 1);   // Safari rounds the edges by a fraction

  await press(page, '[data-calc="health"]');
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('calc');
  expect((await page.locator('.modal--calc .modal__card').boundingBox()).width).toBeLessThanOrEqual(440);
  await page.keyboard.press('Escape');

  await press(page, '.hero__btn-menu');
  expect((await page.locator('.drawer__panel').boundingBox()).width).toBeLessThanOrEqual(360);
  // The drawer's dividers measure the drawer, not the 1440px app behind it.
  const divider = await page.locator('.drawer__panel .divider').first().boundingBox();
  expect(divider.width).toBeGreaterThan(300);
});

test('on a phone held sideways the whole dice keypad is on screen, keys still finger-sized', async ({ page }) => {
  // Reduced motion: the sheet fades in rather than rising, so the keys are
  // measured where they settle, not partway up.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openAt(page, SIZES['iPhone on its side']);
  await openFirstCharacter(page);
  await press(page, '[data-action="roll"]');
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('dice');
  const app = await page.locator('.app').boundingBox();
  const keys = await page.locator('.modal--dice .key').evaluateAll((els) => els.map((e) => {
    const r = e.getBoundingClientRect();
    return { bottom: r.bottom, h: r.height };
  }));
  expect(keys.length).toBeGreaterThan(20);
  for (const k of keys) {
    expect(k.bottom).toBeLessThanOrEqual(app.y + app.height);
    expect(k.h).toBeGreaterThanOrEqual(44);
  }
});

test('on a short screen the empty hero\'s uploader sits clear of the name', async ({ page }) => {
  await openAt(page, SIZES['iPhone Duo closed']);
  await openFirstCharacter(page);
  const drop = await page.getByRole('button', { name: /Add a Portrait/ }).boundingBox();
  const name = await page.locator('.hero__name').boundingBox();
  expect(drop.y + drop.height).toBeLessThanOrEqual(name.y);
});

/* Two-pane, the hero has a pane of its own that scrolls by itself, so the
   pull that stretches it has to follow it there (main.js, ELASTIC HERO):
   a wheel pushed up over the side stretches it whichever tab is open, and
   one over the tab pane beside it does not. */
test('two-pane, pulling down over the side stretches the hero, from any tab', async ({ page }) => {
  await openAt(page, SIZES['desktop window']);
  await openFirstCharacter(page);
  await press(page, '[data-tab="gear"]');
  const pull = () => page.locator('.hero').evaluate((el) => parseFloat(el.style.getPropertyValue('--pull')) || 0);

  const tab = await page.locator('.tabpage--gear').boundingBox();
  await page.mouse.move(tab.x + tab.width / 2, tab.y + 200);
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(50);
  expect(await pull()).toBe(0);

  const side = await page.locator('.sheet__side').boundingBox();
  await page.mouse.move(side.x + side.width / 2, side.y + 200);
  await page.mouse.wheel(0, -200);
  await expect.poll(pull).toBeGreaterThan(0);
});
