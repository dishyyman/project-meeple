/* =====================================================================
   WAYPOINT — rules lookup (Flow 10)
   ---------------------------------------------------------------------
   docs/testing.md §5, Flow 10: from the sheet's Gear tab, open Rules from
   the menu, search, go back — and land where you were.

   KNOWN BUG — this test is marked `test.fail()` until it is fixed.
   prd.md Feature 2, Known Gaps: the Rules back button is hard-wired to
   data-nav="sheet", and the sheet always opens on the Action tab, so back
   from Rules forgets the Gear tab the player came from.

   How the marker behaves:
     · while the bug exists, the test fails as expected and the run passes
       (the report lists it as an "expected failure");
     · once the bug is fixed, the test PASSES — which Playwright reports as
       a failure ("expected to fail, but passed"). That is the reminder to
       delete the test.fail() line, so the test starts guarding the fix.
   See docs/testing.md §10 for every marked bug.
   ===================================================================== */
const { test, expect } = require('./helpers/test');
const { openApp, press, appAttr, openFirstCharacter } = require('./helpers/app');

test('Flow 10 — look up a rule from the Gear tab, and come back to it', async ({ page }) => {
  test.fail(true, 'Known bug — prd.md Feature 2: Rules → back lands on the Action tab, not Gear');

  await openApp(page);
  await openFirstCharacter(page);
  await press(page, '.tabbar__btn[data-tab="gear"]');
  expect(await appAttr(page, 'data-tab')).toBe('gear');

  // Open Rules the way a player does: the menu, then Rules in the drawer.
  await press(page, '[data-menu="open"]');
  await press(page, '[data-nav="rules"]');
  expect(await appAttr(page, 'data-view')).toBe('rules');

  // Results filter as you type: a real term gives a count of sections and
  // shows matching text; nonsense gives the empty note, not a blank list.
  const search = page.locator('[data-rules-search]');
  const count = page.locator('[data-bind="rulesCount"]');
  await search.fill('wound');
  await expect(count).toHaveText(/^\d+ sections?$/);
  await expect(page.locator('[data-list="rules"]')).toContainText(/wound/i);
  await search.fill('zzqqxx');
  await expect(page.locator('[data-list="rules"] .empty-note')).toContainText('Nothing in the guide matches');

  // Back — to the sheet, AND to the tab the player left. The second check
  // is the known bug: today it reads 'action'.
  await press(page, '.screen--rules [data-nav="sheet"]');
  expect(await appAttr(page, 'data-view')).toBe('sheet');
  expect(await appAttr(page, 'data-tab')).toBe('gear');
});
