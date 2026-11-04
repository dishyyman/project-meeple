/* =====================================================================
   WAYPOINT — smoke: every screen opens, a character can be created
   ---------------------------------------------------------------------
   The cheapest net under the whole app: visit every screen and walk the
   creation wizard end to end (docs/testing.md §5, Flows 1 and 2),
   failing on any console error along the way. The wizard matters here
   because it asks the mechanics engine about a build nobody has committed
   to yet — level(), proficiencies() and isTrained() with a draft build.
   ===================================================================== */
const { test, expect } = require('./helpers/test');
const { openApp, press, appAttr, openFirstCharacter } = require('./helpers/app');

test('Flow 1 — first run: Home, the seed character, every screen', async ({ page }) => {
  await openApp(page);
  expect(await appAttr(page, 'data-view')).toBe('home');

  await openFirstCharacter(page);
  await expect(page.locator('[data-bind="name"]').first()).toHaveText('Elara Starwhisper');

  for (const tab of ['action', 'character', 'gear']) {
    await press(page, `.tabbar__btn[data-tab="${tab}"]`);
    expect(await appAttr(page, 'data-tab')).toBe(tab);
  }
  for (const view of ['edit', 'rules', 'settings', 'characters', 'home']) {
    await press(page, `[data-nav="${view}"]`);
    expect(await appAttr(page, 'data-view')).toBe(view);
  }
});

test('Flow 2 — create a character through every wizard step', async ({ page }) => {
  await openApp(page);
  await press(page, '[data-nav="characters"]');
  await press(page, '[data-action="create-character"]');
  expect(await appAttr(page, 'data-view')).toBe('create');

  const next = page.locator('[data-wiz="next"]');
  const hint = page.locator('.wizard__hint');

  // Step 1 — class. Continue is held, with the reason said under it.
  await expect(next).toBeDisabled();
  await expect(hint).toHaveText('Choose a class to continue.');
  // Choosing IS the answer: the wizard moves on by itself, no Continue.
  await press(page, '[data-wiz-pick^="class:"]');
  await expect(hint).toHaveText('Choose a subclass to continue.');

  // Step 2 — subclass, which also advances on its own.
  await press(page, '[data-wiz-pick^="sub:"]');
  await expect(hint).toHaveText(/attribute points? still to place/);

  // Step 3 — attributes: place all four points.
  for (let i = 0; i < 4; i++) await press(page, '[data-wiz-attr$=":1"]');
  await expect(next).toBeEnabled();
  await next.click();

  // Step 4 — skills: four points into four different skills.
  const skills = await page.$$eval('[data-wiz-skill]', (els) => els.slice(0, 4).map((e) => e.dataset.wizSkill));
  for (const id of skills) await press(page, `[data-wiz-skill="${id}"]`);
  await expect(next).toBeEnabled();
  await next.click();

  // Step 5 — loadout: every loadout is legal, including an empty one.
  await expect(next).toBeEnabled();
  await next.click();

  // Step 6 — origin: a name is the one requirement.
  await expect(next).toBeDisabled();
  await page.fill('[data-wiz-name]', 'Test Wanderer');
  await expect(next).toBeEnabled();
  await next.click();

  // Lands on the new character's sheet, and it is in the roster.
  await expect.poll(() => appAttr(page, 'data-view')).toBe('sheet');
  await expect(page.locator('[data-bind="name"]').first()).toHaveText('Test Wanderer');
  const max = Number(await page.locator('[data-bind="healthMax"]').first().textContent());
  expect(max).toBeGreaterThan(0);

  // Survives a reload.
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.app')?.getAttribute('data-view') === 'home');
  await press(page, '[data-nav="characters"]');
  await expect(page.locator('.screen--characters')).toContainText('Test Wanderer');
});
