/* =====================================================================
   MEEPLE — Game Master Tools, phase 1: the campaign list and a campaign
   ---------------------------------------------------------------------
   docs/testing.md §5, Flow 14. The GM's home is built from the Characters
   list's own parts, so most of what is pinned here is that it BEHAVES like
   that list — create, rename, reorder, delete, survive a reload — and that
   sharing those parts did not let one list's state leak into the other.
   Plus the two things every stored record in this app must survive:
   storage refusing writes, and a save someone tampered with.

   Real clicks wherever a control's reachability is the point.
   ===================================================================== */
const { test, expect } = require('./helpers/test');
const { openApp, press, appAttr } = require('./helpers/app');

// The index, as the app wrote it.
const storedIndex = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('meeple.campaigns') || 'null'));
const storedCampaign = (page, id) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), `meeple.campaign.${id}`);
const listNames = (page) => page.$$eval('[data-list="campaigns"] .persona-card__name', (els) => els.map((e) => e.textContent));

async function toCampaigns(page) {
  await page.getByRole('button', { name: 'Game Master Tools' }).click();
  expect(await appAttr(page, 'data-view')).toBe('campaigns');
}

// Create through the form, the way a GM does. Lands inside the new campaign.
async function create(page, name, subtitle = '') {
  await page.locator('[data-campaign-new]').click();
  await page.fill('[data-campaign-name]', name);
  if (subtitle) await page.fill('[data-campaign-subtitle]', subtitle);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect.poll(() => appAttr(page, 'data-view')).toBe('campaign');
}

const backToList = (page) => page.getByRole('button', { name: 'Campaigns', exact: true }).click();

test('Home → Game Master Tools: an empty list says what a campaign is, and New Campaign leads', async ({ page }) => {
  await openApp(page);
  await toCampaigns(page);
  await expect(page.locator('[data-block="campaignsLead"]')).toBeVisible();
  await expect(page.locator('[data-campaigns-edit]')).toBeDisabled();
  // The lead button takes the accent only while the list is empty.
  expect(await page.locator('.screen--campaigns').getAttribute('data-empty')).not.toBeNull();
});

test('create a campaign: it opens on Party, with its name and subtitle, and survives a reload', async ({ page }) => {
  await openApp(page);
  await toCampaigns(page);
  await create(page, 'The Ashen Road', 'Session 7');

  expect(await appAttr(page, 'data-campaign-tab')).toBe('party');
  await expect(page.locator('.camp-hero__name')).toHaveText('The Ashen Road');
  await expect(page.locator('.camp-hero__sub')).toHaveText('Session 7');
  await expect(page.locator('.camp-page--party')).toBeVisible();

  const idx = await storedIndex(page);
  expect(idx.ids).toHaveLength(1);
  expect(idx.activeId).toBe(idx.ids[0]);
  const saved = await storedCampaign(page, idx.ids[0]);
  expect(saved).toMatchObject({ name: 'The Ashen Road', subtitle: 'Session 7', heroes: [], enemies: [] });
  expect(saved.rev).toBeGreaterThanOrEqual(1);

  await page.reload();
  await page.waitForFunction(() => document.querySelector('.app')?.getAttribute('data-view') === 'home');
  await toCampaigns(page);
  expect(await listNames(page)).toEqual(['The Ashen Road']);
});

test('a campaign needs a name: Create with none says so and stays open', async ({ page }) => {
  await openApp(page);
  await toCampaigns(page);
  await page.locator('[data-campaign-new]').click();
  await page.getByRole('button', { name: 'Create' }).click();
  expect(await appAttr(page, 'data-modal')).toBe('campaign-form');
  await expect(page.locator('[data-campaign-error]')).toBeVisible();
  // Typing clears the complaint; Enter in the field creates.
  await page.fill('[data-campaign-name]', 'Goblin Market');
  await expect(page.locator('[data-campaign-error]')).toBeHidden();
  await page.locator('[data-campaign-name]').press('Enter');
  await expect.poll(() => appAttr(page, 'data-view')).toBe('campaign');
  expect(await storedIndex(page)).toMatchObject({ ids: [expect.any(String)] });
});

test('rename from the options sheet; the subtitle can be cleared', async ({ page }) => {
  await openApp(page);
  await toCampaigns(page);
  await create(page, 'Ashen Road', 'Old line');

  await page.getByRole('button', { name: 'Campaign options' }).click();
  expect(await appAttr(page, 'data-modal')).toBe('campaign-menu');
  await page.locator('.modal--campaign-menu').getByRole('button', { name: 'Edit Name' }).click();
  expect(await appAttr(page, 'data-modal')).toBe('campaign-form');
  await expect(page.locator('[data-campaign-name]')).toHaveValue('Ashen Road');
  await page.fill('[data-campaign-name]', 'The Ashen Road');
  await page.fill('[data-campaign-subtitle]', '');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('.camp-hero__name')).toHaveText('The Ashen Road');
  await expect(page.locator('.camp-hero__sub')).toBeHidden();
  await backToList(page);
  expect(await listNames(page)).toEqual(['The Ashen Road']);
  // With no subtitle the card says what is in the campaign instead.
  await expect(page.locator('[data-list="campaigns"] .persona-card__meta')).toHaveText('0 heroes · 0 enemies');
});

test('the three tabs switch, and say which one is selected', async ({ page }) => {
  await openApp(page);
  await toCampaigns(page);
  await create(page, 'A');
  for (const [name, tab] of [['Enemies', 'enemies'], ['Combat', 'combat'], ['Party', 'party']]) {
    const btn = page.locator('.screen--campaign .tabbar').getByRole('button', { name });
    await btn.click();
    expect(await appAttr(page, 'data-campaign-tab')).toBe(tab);
    await expect(btn).toHaveAttribute('aria-current', 'page');
    await expect(page.locator(`.camp-page--${tab}`)).toBeVisible();
  }
  // The sheet's own tab is untouched by any of it.
  expect(await appAttr(page, 'data-tab')).toBe('action');
});

test('reorder in edit mode, by keyboard; the order is saved', async ({ page }) => {
  await openApp(page);
  await toCampaigns(page);
  for (const n of ['One', 'Two', 'Three']) { await create(page, n); await backToList(page); }
  expect(await listNames(page)).toEqual(['One', 'Two', 'Three']);

  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('button', { name: /Reorder Three/ }).focus();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  expect(await listNames(page)).toEqual(['Three', 'One', 'Two']);
  const idx = await storedIndex(page);
  const names = await Promise.all(idx.ids.map((id) => storedCampaign(page, id).then((c) => c.name)));
  expect(names).toEqual(['Three', 'One', 'Two']);
});

test('one list in edit mode does not put delete buttons on the other', async ({ page }) => {
  await openApp(page);
  await toCampaigns(page);
  await create(page, 'Ashen Road');
  await page.getByRole('button', { name: 'Campaigns', exact: true }).click();

  // Leave the Characters list in edit mode, then visit Campaigns.
  await press(page, '[data-nav="characters"]');
  await press(page, '[data-roster-edit]');
  await expect(page.locator('[data-list="roster"] .persona-card__del').first()).toBeVisible();
  await press(page, '[data-nav="campaigns"]');
  await expect(page.locator('[data-list="campaigns"] .persona-card__del').first()).toBeHidden();
  await expect(page.locator('[data-list="campaigns"] .persona-card__chevron').first()).toBeVisible();
});

test('delete from the list asks first; Cancel keeps it, Delete removes it from storage', async ({ page }) => {
  await openApp(page);
  await toCampaigns(page);
  await create(page, 'Doomed');
  const [id] = (await storedIndex(page)).ids;
  await backToList(page);

  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('button', { name: 'Delete Doomed' }).click();
  expect(await appAttr(page, 'data-modal')).toBe('campaign-del');
  await expect(page.locator('[data-bind="campaignDelName"]')).toHaveText('Doomed');
  await page.locator('.modal--campaign-del').getByRole('button', { name: 'Cancel' }).click();
  expect(await listNames(page)).toEqual(['Doomed']);

  await page.getByRole('button', { name: 'Delete Doomed' }).click();
  await page.locator('.modal--campaign-del').getByRole('button', { name: 'Delete' }).click();
  expect(await listNames(page)).toEqual([]);
  expect(await storedCampaign(page, id)).toBeNull();
  expect((await storedIndex(page)).ids).toEqual([]);
  // Nothing left to edit: back to read mode, and the lead line returns.
  await expect(page.locator('[data-block="campaignsLead"]')).toBeVisible();
});

test('delete from inside a campaign goes back to the list', async ({ page }) => {
  await openApp(page);
  await toCampaigns(page);
  await create(page, 'Keep');
  await backToList(page);
  await create(page, 'Doomed');
  await page.getByRole('button', { name: 'Campaign options' }).click();
  await page.locator('.modal--campaign-menu').getByRole('button', { name: 'Delete Campaign' }).click();
  await page.locator('.modal--campaign-del').getByRole('button', { name: 'Delete' }).click();
  expect(await appAttr(page, 'data-view')).toBe('campaigns');
  expect(await listNames(page)).toEqual(['Keep']);
});

/* A save someone edited by hand — or an attacker's file one day. Every
   campaign passes through normalizeCampaign() on its way in: a hostile id in
   the index is skipped, a junk record is dropped, and a name full of markup
   is TEXT. Any script that did run would fail this test (helpers/test.js). */
test('a tampered save is cleaned up on load, and its text stays text', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('meeple.campaigns', JSON.stringify({
      ids: ['good', 'x"><img src=x onerror=alert(1)>', 'junk', 'good'], activeId: 'nope',
    }));
    localStorage.setItem('meeple.campaign.good', JSON.stringify({
      name: '<img src=x onerror="document.title=1">Evil', subtitle: 42,
      heroes: 'not a list', enemies: [{ name: 'Goblin', stats: { hp: -5 } }], evil: true,
    }));
    localStorage.setItem('meeple.campaign.junk', '{not json');
  });
  await openApp(page);
  await toCampaigns(page);

  expect(await listNames(page)).toEqual(['<img src=x onerror="document.title=1">Evil']);
  expect(await page.locator('[data-list="campaigns"] img').count()).toBe(0);
  await expect(page.locator('[data-list="campaigns"] .persona-card__meta')).toHaveText('0 heroes · 1 enemy');
  expect(await page.title()).not.toBe('1');
});

/* Storage that refuses writes: the campaign still exists for this session,
   and the standing alert says changes are not being saved — the same
   promise the character sheet makes. */
test('when storage refuses a campaign, it is kept in memory and the alert says so', async ({ page }) => {
  await page.addInitScript(() => {
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (this === window.localStorage && window.__failCampaigns && /^meeple\.campaign/.test(key)) {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      }
      return real.call(this, key, value);
    };
  });
  await openApp(page);
  await toCampaigns(page);
  await page.evaluate(() => { window.__failCampaigns = true; });
  await create(page, 'Unsaved');
  expect(await appAttr(page, 'data-storage')).toBe('failing');
  await backToList(page);
  expect(await listNames(page)).toEqual(['Unsaved']);

  // Storage recovers: the next campaign write lands the held one too.
  await page.evaluate(() => { window.__failCampaigns = false; });
  await create(page, 'Second');
  expect(await appAttr(page, 'data-storage')).toBe('ok');
  expect((await storedIndex(page)).ids).toHaveLength(2);
});
