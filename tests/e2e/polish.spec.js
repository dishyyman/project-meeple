/* =====================================================================
   MEEPLE — the finishing details
   ---------------------------------------------------------------------
   The small things a player never names but always feels: how a title
   breaks across lines, the shape of a corner, whether a thumb can hit a
   small control, a sheet that follows the finger down, screens that cross
   over rather than snap. Each is a progressive enhancement — the app works
   without it in a browser that lacks it — so where a feature is engine-
   specific the test asks the browser whether it has it before asserting.
   ===================================================================== */
const { test, expect } = require('./helpers/test');
const { openApp, press, openFirstCharacter } = require('./helpers/app');

/* ---- line breaking (base.css) ------------------------------------------ */

test('headings and titles balance their lines; paragraphs avoid a lone last word', async ({ page }) => {
  await openApp(page);
  const wrap = (sel) => page.evaluate((s) => {
    const el = document.querySelector(s);
    return el ? getComputedStyle(el).getPropertyValue('text-wrap-style') : 'missing';
  }, sel);
  // An engine that predates text-wrap-style reads '' — the hint is simply
  // ignored there, which is the point of a hint. Only assert where it exists.
  const supported = await page.evaluate(() => CSS.supports('text-wrap-style', 'balance'));
  test.skip(!supported, 'this engine has no text-wrap-style');

  expect(await wrap('h2.title')).toBe('balance');
  expect(await wrap('.alert__title')).toBe('balance');
  expect(await wrap('.modal__title')).toBe('balance');
  expect(await wrap('.action-sheet__title')).toBe('balance');
  expect(await wrap('.hero__name')).toBe('balance');
  if (await page.evaluate(() => CSS.supports('text-wrap-style', 'pretty'))) {
    expect(await wrap('.alert__text')).toBe('pretty');
  }
});

/* ---- corners (tokens.css --corner-shape) ------------------------------- */

test('cards and buttons take the continuous corner; circles stay circles', async ({ page }) => {
  await openApp(page);
  // Chromium and Safari 26+. An older engine draws the plain round corner,
  // which is the look the token replaces — nothing to check there.
  test.skip(!(await page.evaluate(() => CSS.supports('corner-shape', 'squircle'))), 'no corner-shape in this engine');
  const shape = (sel) => page.evaluate((s) =>
    getComputedStyle(document.querySelector(s)).getPropertyValue('corner-top-left-shape'), sel);
  // squircle computes to superellipse(2); round to superellipse(1).
  for (const sel of ['.modal__card', '.action-sheet', '.collapse', '.toast__card']) {
    expect(await shape(sel), sel).toBe('superellipse(2)');
  }
  // 50% radii — a squircle there would turn a round button into a square.
  for (const sel of ['.glass-btn', '.stepper']) {
    expect(await shape(sel), sel).toBe('superellipse(1)');
  }
});

/* ---- tap targets (primitives.css "hit slop", tokens.css --tap-min) ------ */

/* Every visible control on the screen in front of the player, measured the
   way a finger meets it: from the control's centre, how far can a tap land
   and still reach it? elementFromPoint answers for the real hit area — the
   drawn box plus any ::after slop, minus anything a neighbour's slop has
   taken. Two things must hold for each:
     · that area is at least 44 × 44 (--tap-min);
     · the control's own drawn box is entirely its own — no neighbour's
       slop reaches over it (which is how "no overlap" shows up).
   Each control is scrolled to the middle first, so a row half under the
   tab bar is measured where a player would actually tap it.

   A control whose drawn box is already 44 in a direction is measured by that
   box — exact. Only a direction that leans on the slop is SCANNED, in half
   pixels; a box laid out on a fractional pixel has its edges snapped when the
   engine hit-tests it, so the scan allows 42.5 — and a real 42 still fails. */
function auditTaps() {
  const TAP = 44, MIN = 42.5;
  const owns = (el, x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t === el || el.contains(t)); };
  const bad = [];
  const controls = [...document.querySelectorAll('.app button, .app input:not([type=hidden]):not([type=file]), .app select, .app textarea, .app [role=button]')];
  for (const el of controls) {
    if (el.closest('.visually-hidden')) continue;
    const first = el.getBoundingClientRect();
    if (first.width < 2 || first.height < 2) continue;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (!owns(el, cx, cy)) continue;            // not on top: closed, covered, behind a popup
    const reach = (dx, dy) => { let d = 0; while (d < MIN && owns(el, cx + dx * (d + 0.5), cy + dy * (d + 0.5))) d += 0.5; return d; };
    const w = r.width >= TAP ? r.width : reach(-1, 0) + reach(1, 0);
    const h = r.height >= TAP ? r.height : reach(0, -1) + reach(0, 1);
    const name = `${(el.className + '').split(' ')[0] || el.tagName} “${(el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30)}”`;
    if (w < MIN || h < MIN) bad.push(`${name}: ${w}×${h}`);
    const i = 2;   // just inside each corner of the drawn box
    for (const [x, y] of [[r.left + i, cy], [r.right - i, cy], [cx, r.top + i], [cx, r.bottom - i]]) {
      if (!owns(el, x, y) && document.elementFromPoint(x, y)?.closest('button, input, select, textarea, [role=button]')) {
        bad.push(`${name}: its own box is taken by ${(document.elementFromPoint(x, y).className + '').split(' ')[0]}`);
        break;
      }
    }
  }
  return [...new Set(bad)];
}

const block = (evasion, armor, fortitude, speed) => ({ evasion, armor, fortitude, speed });
const CAMPAIGN = {
  id: 'cmp_taps', name: 'The Ashen Road', subtitle: '',
  heroes: [{ id: 'hero_elara', name: 'Elara', source: 'manual',
    card: { healthBase: 20, manaMax: 6, woundsMax: 3, patchesMax: 2, base: block(8, 0, 8, 5), build: block(12, 2, 9, 5) },
    vitals: { health: 20, mana: 6, wounds: 1, patches: 2, effects: [] } }],
  enemies: [{ id: 'enemy_goblin', name: 'Goblin', tags: [], turns: 1,
    stats: { hp: 6, mana: 0, wounds: 0, evasion: 11, armor: 1, fortitude: 7, speed: 6 },
    attacks: [{ id: 'atk_g', name: 'Rusty Blade', toHit: 3, damage: '1d6+1' }] }],
  combat: null,
};

for (const [label, device] of [['the drawn iPhone', null], ['an iPhone SE', 'iphone-se']]) {
  test(`every control takes a 44px fingertip and none overlaps its neighbour — ${label}`, async ({ page }) => {
    test.setTimeout(90_000);
    if (device) await page.addInitScript((d) => localStorage.setItem('meeple:preview', JSON.stringify({ device: d })), device);
    await openApp(page);
    await page.evaluate((c) => {
      localStorage.setItem('meeple.campaigns', JSON.stringify({ ids: [c.id], activeId: c.id }));
      localStorage.setItem(`meeple.campaign.${c.id}`, JSON.stringify(c));
    }, CAMPAIGN);
    await page.reload();
    await page.waitForFunction(() => document.querySelector('.app')?.getAttribute('data-view') === 'home');
    const set = (k, v) => page.evaluate(([k, v]) => document.querySelector('.app').setAttribute(k, v), [k, v]);
    const audit = async (where) => expect(await page.evaluate(auditTaps), where).toEqual([]);

    await audit('Home');
    await press(page, '[data-nav="characters"]');
    await press(page, '[data-roster-edit]');
    await audit('Characters, editing');
    await press(page, '[data-roster-edit]');
    await openFirstCharacter(page);
    // A Boon on the sheet, so its row's stepper and tick are measured too.
    await press(page, '[data-effect-open]');
    await press(page, '[data-effect-add]');
    await set('data-modal', 'closed');
    for (const tab of ['action', 'character', 'gear', 'notes']) {
      await set('data-tab', tab);
      await audit(`sheet, ${tab}`);
    }
    await set('data-tab', 'action');
    await set('data-menu', 'open');
    await audit('menu');
    await set('data-menu', 'closed');
    for (const [opener, name] of [['[data-calc="health"]', 'calc'], ['[data-action="roll"]', 'dice'], ['[data-effect-open]', 'effects']]) {
      await press(page, opener);
      await audit(`${name} popup`);
      await set('data-modal', 'closed');
    }
    for (const tab of ['dossier', 'levels', 'gear']) {
      await set('data-view', 'edit');
      await set('data-edit-tab', tab);
      await audit(`Edit, ${tab}`);
    }
    await set('data-view', 'characters');
    await press(page, '[data-action="create-character"]');
    await audit('Create');
    await set('data-view', 'campaigns');
    await press(page, '[data-open-campaign="cmp_taps"]');
    for (const tab of ['party', 'enemies', 'combat']) {
      await press(page, `.tabbar__btn[data-campaign-tab="${tab}"]`);
      await audit(`campaign, ${tab}`);
    }
    await press(page, '[data-combat-start-open]');
    await audit('Start Combat');
    await press(page, '[data-combat-start]');
    await audit('a fight');
  });
}

/* ---- sheets rise on a transition, not keyframes (dice.css "sheet motion") */

test('a bottom sheet rises on a transition a finger can interrupt, never a keyframe animation', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  for (const [name, sel] of [['rest', '.modal--rest .action-sheet'], ['dice', '.dice-sheet']]) {
    await page.evaluate((m) => document.querySelector('.app').setAttribute('data-modal', m), name);
    const motion = await page.evaluate((s) => {
      const cs = getComputedStyle(document.querySelector(s));
      return { animation: cs.animationName, transition: cs.transitionProperty };
    }, sel);
    expect(motion.animation, name).toBe('none');
    expect(motion.transition, name).toContain('transform');
    // And it is moving when it first appears: the rise comes from
    // @starting-style, a frame or two below where it settles.
    await page.evaluate(() => document.querySelector('.app').setAttribute('data-modal', 'closed'));
    const first = await page.evaluate(([m, s]) => new Promise((done) => {
      document.querySelector('.app').setAttribute('data-modal', m);
      requestAnimationFrame(() => done(new DOMMatrix(getComputedStyle(document.querySelector(s)).transform).m42));
    }), [name, sel]);
    expect(first, `${name} starts below its resting place`).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate((s) => new DOMMatrix(getComputedStyle(document.querySelector(s)).transform).m42, sel)).toBe(0);
    await page.evaluate(() => document.querySelector('.app').setAttribute('data-modal', 'closed'));
  }
});

/* ---- sheets: drag to dismiss (main.js "SHEETS — drag to dismiss") ------- */

const sheetState = (page, modal) => page.evaluate((m) => {
  const el = document.querySelector(`.modal--${m}`);
  const s = el.querySelector('.action-sheet, .dice-sheet');
  return {
    open: document.querySelector('.app').getAttribute('data-modal') === m,
    y: new DOMMatrix(getComputedStyle(s).transform).m42,
    drag: el.getAttribute('data-sheet-drag'),
  };
}, modal);

async function openRest(page) {
  await openApp(page);
  await openFirstCharacter(page);
  await page.evaluate(() => document.querySelector('.app').setAttribute('data-modal', 'rest'));
  // At rest before any finger lands: the rise is over.
  await expect.poll(async () => (await sheetState(page, 'rest')).y).toBe(0);
}

test.describe('a bottom sheet under a finger', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'touch events driven through Chrome DevTools');
  test.use({ hasTouch: true });

  let cdp, x, top;
  // Down by `by` px from near the sheet's top, in `steps`, `ms` apart.
  async function pull(page, by, { steps = 10, ms = 16, lift = true } = {}) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: top }] });
    for (let i = 1; i <= steps; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: top + (by * i) / steps }] });
      if (ms) await page.waitForTimeout(ms);
    }
    if (lift) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  test.beforeEach(async ({ page }) => {
    cdp = await page.context().newCDPSession(page);
    await openRest(page);
    const box = await page.locator('.modal--rest .action-sheet').boundingBox();
    x = box.x + box.width / 2;
    top = box.y + 20;
  });

  test('it follows the finger down, and springs back when let go short', async ({ page }) => {
    await pull(page, 60, { lift: false });
    expect(await sheetState(page, 'rest')).toMatchObject({ open: true, y: 60, drag: 'drag' });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(async () => (await sheetState(page, 'rest')).y).toBe(0);
    expect(await sheetState(page, 'rest')).toMatchObject({ open: true, drag: null });
  });

  test('let go far enough down, it closes', async ({ page }) => {
    const h = (await page.locator('.modal--rest .action-sheet').boundingBox()).height;
    await pull(page, h * 0.5);
    await expect.poll(async () => (await sheetState(page, 'rest')).open).toBe(false);
  });

  test('a quick flick closes it from short of the line', async ({ page }) => {
    const h = (await page.locator('.modal--rest .action-sheet').boundingBox()).height;
    const by = 80;
    expect(by).toBeLessThan(h * 0.35);   // by distance alone it would spring back
    await pull(page, by, { steps: 3, ms: 0 });
    await expect.poll(async () => (await sheetState(page, 'rest')).open).toBe(false);
  });

  test('caught on its way back, it stops under the finger rather than jumping', async ({ page }) => {
    await pull(page, 120, { steps: 12, ms: 30 });   // slow and short of the line: it heads home
    await page.waitForTimeout(40);                   // part way there
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: top + 200 }] });
    const caught = await sheetState(page, 'rest');
    expect(caught.drag).toBe('drag');                // held at once, before any travel
    expect(caught.y).toBeGreaterThan(0);             // where it was, not snapped home
    expect(caught.y).toBeLessThan(120);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(async () => (await sheetState(page, 'rest')).y).toBe(0);
    expect((await sheetState(page, 'rest')).open).toBe(true);
  });

  test('a drag never chooses the row it ends on', async ({ page }) => {
    const before = await page.locator('[data-bind="healthCur"]').first().textContent();
    // Start ON the Long Rest row and drag well down: closing, not resting.
    const row = await page.locator('.modal--rest [data-rest="long"]').boundingBox();
    top = row.y + row.height / 2;
    await pull(page, 300);
    await expect.poll(async () => (await sheetState(page, 'rest')).open).toBe(false);
    await expect(page.locator('[data-bind="healthCur"]').first()).toHaveText(before);
  });
});

test('under Reduce Motion the sheet does not travel with the finger, but the pull still closes it', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'touch events driven through Chrome DevTools');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const cdp = await page.context().newCDPSession(page);
  await openRest(page);
  const box = await page.locator('.modal--rest .action-sheet').boundingBox();
  const at = (y) => [{ x: box.x + box.width / 2, y: box.y + 20 + y }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0) });
  for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(i * 30) });
  expect((await sheetState(page, 'rest')).y).toBe(0);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(async () => (await sheetState(page, 'rest')).open).toBe(false);
});

test('a mouse can drag a sheet closed too, and Cancel is still there', async ({ page }) => {
  await openRest(page);
  await expect(page.locator('.modal--rest').getByRole('button', { name: 'Cancel' })).toBeVisible();
  const box = await page.locator('.modal--rest .action-sheet').boundingBox();
  const x = box.x + box.width / 2;
  await page.mouse.move(x, box.y + 12);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(x, box.y + 12 + i * 25);
  await page.mouse.up();
  await expect.poll(async () => (await sheetState(page, 'rest')).open).toBe(false);

  // The dice roller is a sheet as well.
  await page.evaluate(() => document.querySelector('.app').setAttribute('data-modal', 'dice'));
  await expect.poll(async () => (await sheetState(page, 'dice')).y).toBe(0);
  const dice = await page.locator('.dice-sheet').boundingBox();
  await page.mouse.move(dice.x + dice.width / 2, dice.y + 8);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(dice.x + dice.width / 2, dice.y + 8 + i * 30);
  await page.mouse.up();
  await expect.poll(async () => (await sheetState(page, 'dice')).open).toBe(false);
});

/* ---- changing screens: the cross-fade (frame.css, main.js "SCREEN CHANGE") */

test('a screen change cross-fades, but the new screen is the view — and takes taps — at once', async ({ page }) => {
  await openApp(page);
  const seen = await page.evaluate(() => new Promise((done) => {
    document.querySelector('[data-nav="characters"]').click();
    // Synchronous: the rest of the app (and the history) reads it straight away.
    const view = document.querySelector('.app').getAttribute('data-view');
    requestAnimationFrame(() => {
      const home = document.querySelector('.screen--home');
      const chars = document.querySelector('.screen--characters');
      const r = chars.getBoundingClientRect();
      done({
        view,
        leaving: home.hasAttribute('data-leaving'),
        inert: home.inert,
        hidden: home.getAttribute('aria-hidden'),
        oldOpacity: Number(getComputedStyle(home).opacity),
        newOpacity: Number(getComputedStyle(chars).opacity),
        // What a tap in the middle of the app lands on: the NEW screen.
        tapLandsOn: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('.screen')?.className,
      });
    });
  }));
  expect(seen).toMatchObject({ view: 'characters', leaving: true, inert: true, hidden: 'true' });
  expect(seen.oldOpacity).toBeGreaterThan(0);   // still fading out…
  expect(seen.newOpacity).toBeLessThan(1);      // …while this fades in
  expect(seen.tapLandsOn).toContain('screen--characters');
  // Over in a fifth of a second (under 300ms), leaving one screen on show.
  await page.waitForTimeout(260);
  expect(await page.evaluate(() => document.querySelectorAll('.screen[data-leaving], .screen[inert]').length)).toBe(0);
});

test('a fade turned round mid-way heads back from where it was, and nothing moves', async ({ page }) => {
  await openApp(page);
  const back = await page.evaluate(() => new Promise((done) => {
    document.querySelector('[data-nav="characters"]').click();
    setTimeout(() => {
      const home = document.querySelector('.screen--home');
      const mid = Number(getComputedStyle(home).opacity);
      document.querySelector('.screen--characters [data-back]').click();
      requestAnimationFrame(() => done({
        mid,
        after: Number(getComputedStyle(home).opacity),
        leaving: home.hasAttribute('data-leaving'),
        transform: getComputedStyle(home).transform,
        property: getComputedStyle(home).transitionProperty,
      }));
    }, 90);
  }));
  expect(back.mid).toBeGreaterThan(0);
  expect(back.mid).toBeLessThan(1);
  // Home is the view again, un-marked, and rising from part-way — not from 0.
  expect(back.leaving).toBe(false);
  expect(back.after).toBeGreaterThan(0);
  // Opacity only: no slide, so it is the same under Reduce Motion.
  expect(back.property).toBe('opacity');
  expect(back.transform).toBe('none');
});

test('a swipe back that commits is not faded on top of its own slide', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'touch events driven through Chrome DevTools');
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
  });
  const cdp = await page.context().newCDPSession(page);
  await openApp(page);
  await press(page, '[data-nav="characters"]');
  await page.waitForTimeout(260);
  const box = await page.locator('.app').boundingBox();
  const at = (x) => [{ x: box.x + x, y: box.y + 420 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(6) });
  for (let i = 1; i <= 12; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(6 + (300 * i) / 12) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => document.querySelector('.app').getAttribute('data-view'))).toBe('home');
  expect(await page.evaluate(() => document.querySelectorAll('.screen[data-leaving]').length)).toBe(0);
});
