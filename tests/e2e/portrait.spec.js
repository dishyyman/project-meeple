/* =====================================================================
   MEEPLE — the portrait: adding, editing and removing a character's face
   ---------------------------------------------------------------------
   Every click that matters here is a REAL click (Playwright's own, which
   checks that the control is visible and that nothing sits on top of it),
   not press(). That is the point of the file: "Add a Portrait" on the
   sheet was wired correctly in JS for a long time and still did nothing,
   because the hero's gradient scrim lay over it and swallowed the tap.
   press() calls element.click() and so could never have noticed.

   The flows (docs/testing.md §5, Flow 13):
     · the sheet's empty state takes a tap and opens the file picker;
     · the Edit page's empty frame says "Add photo" and goes straight to
       the picker; a filled one wears an edit badge and opens the menu;
     · the menu's three rows, and Adjust opening the reposition window;
     · Remove acts at once and offers Undo, which brings the photo back —
       on screen and in storage.
   ===================================================================== */
const path = require('path');
const { test, expect } = require('./helpers/test');
const { openApp, press, appAttr, openFirstCharacter } = require('./helpers/app');

// Any real PNG will do — it goes through the same compressor a photo does.
const PHOTO = path.join(__dirname, '..', '..', 'resources', 'images', 'icons', 'icon-192.png');

// Where save() keeps the open character's photo (docs/database.md).
const storedPortrait = (page) => page.evaluate(() => {
  const { activeId } = JSON.parse(localStorage.getItem('meeple.roster'));
  return localStorage.getItem(`meeple.character.${activeId}.portrait`);
});

// Click like a finger, answer the OS picker, wait for the photo to land.
async function pickWith(page, locator) {
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), locator.click()]);
  await chooser.setFiles(PHOTO);
  await expect.poll(() => appAttr(page, 'data-portrait')).toBe('set');
}

async function openEditWithPhoto(page) {
  await openApp(page);
  await openFirstCharacter(page);
  await press(page, '[data-nav="edit"]');
  await pickWith(page, page.locator('[data-portrait-menu]'));
}

test('sheet — "Add a Portrait" takes a real tap and sets the photo', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  expect(await appAttr(page, 'data-portrait')).toBe('none');

  const add = page.getByRole('button', { name: /Add a Portrait/ });
  await pickWith(page, add);

  await expect(page.locator('.hero__photo')).toBeVisible();
  await expect(add).toBeHidden();
  expect(await storedPortrait(page)).toMatch(/^data:image\//);
});

test('edit — an empty frame says "Add photo" and goes straight to the picker', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  await press(page, '[data-nav="edit"]');

  const frame = page.getByRole('button', { name: 'Add photo' });
  await expect(frame).toBeVisible();
  await expect(page.locator('.portrait-edit__empty')).toBeVisible();
  await expect(page.locator('.portrait-edit__empty')).toContainText('Add photo');
  await expect(page.locator('.portrait-edit__badge')).toBeHidden();

  // No menu in between: with no photo, there is nothing to adjust or remove.
  await pickWith(page, frame);
  expect(await appAttr(page, 'data-modal')).toBe('closed');
});

test('edit — a photo wears an edit badge and opens the menu with icon rows', async ({ page }) => {
  await openEditWithPhoto(page);

  await expect(page.locator('.portrait-edit__badge')).toBeVisible();
  await expect(page.locator('.portrait-edit__empty')).toBeHidden();

  await page.getByRole('button', { name: 'Edit photo' }).click();
  expect(await appAttr(page, 'data-modal')).toBe('portrait');

  const menu = page.locator('.modal--portrait');
  for (const name of ['Choose New Photo', 'Adjust', 'Remove Photo']) {
    const row = menu.getByRole('button', { name, exact: true });
    await expect(row).toBeVisible();
    // Each row leads with an icon, and the icon is decoration only — the
    // row's accessible name is its words, as asserted just above.
    await expect(row.locator('.action-sheet__icon svg')).toBeVisible();
  }

  await menu.getByRole('button', { name: 'Adjust', exact: true }).click();
  expect(await appAttr(page, 'data-modal')).toBe('crop');
  await expect(page.locator('#crop-title')).toHaveText('Adjust Photo');
});

test('edit — Remove acts at once, and the toast\'s Undo brings the photo back', async ({ page }) => {
  await openEditWithPhoto(page);
  const before = await storedPortrait(page);

  await page.getByRole('button', { name: 'Edit photo' }).click();
  await page.locator('.modal--portrait').getByRole('button', { name: 'Remove Photo' }).click();

  // Gone, from the screen and from storage, with the menu closed behind it.
  expect(await appAttr(page, 'data-portrait')).toBe('none');
  expect(await appAttr(page, 'data-modal')).toBe('closed');
  expect(await storedPortrait(page)).toBeNull();
  await expect(page.locator('[data-toast-text]')).toHaveText('Portrait removed.');

  const undo = page.getByRole('button', { name: 'Undo' });
  await expect(undo).toBeVisible();
  await undo.click();

  // Back exactly as it was, and the toast has gone with its Undo.
  expect(await appAttr(page, 'data-portrait')).toBe('set');
  expect(await storedPortrait(page)).toBe(before);
  expect(await appAttr(page, 'data-toast')).toBe('off');
  await expect(page.getByRole('button', { name: 'Edit photo' })).toBeVisible();

  // And it is a real restore, not a repaint: it survives a reload.
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.app')?.getAttribute('data-view') === 'home');
  expect(await storedPortrait(page)).toBe(before);
});

test('toasts without an action show no Undo', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  await press(page, '[data-nav="edit"]');
  await page.fill('[data-id-name]', 'Elara the Bold');
  await press(page, '[data-id-save]');
  await expect(page.locator('[data-toast-text]')).toHaveText('Character saved.');
  await expect(page.locator('[data-toast-action]')).toBeHidden();
});
