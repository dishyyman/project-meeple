/* =====================================================================
   MEEPLE — boot loader

   index.html is a shell: it carries the device frame and the .app state
   root, and nothing else. Every screen and modal lives in its own file
   under pages/ and is stitched in here, before main.js initialises.

   WHY FETCH AND NOT A BUILD STEP
   The project has no build pipeline on purpose (see CLAUDE.md), so the
   markup has to be assembled at runtime. The cost of that choice is the
   one thing worth knowing about this file: fetch() is blocked on the
   file:// protocol, so double-clicking index.html no longer works. Serve
   the folder over http:// instead — VS Code's Live Server, or any static
   server. The catch block below says so out loud rather than leaving a
   blank parchment and no explanation.

   ORDER MATTERS, TWICE OVER
   - Fragments are fetched in parallel but INSERTED in PAGES order. The
     stylesheet gives every .modal the same z-index, so DOM order is what
     breaks ties; keeping insertion deterministic keeps that predictable.
   - main.js must not run init() until the markup is in. It waits on
     MEEPLE_READY (see the bottom of main.js) rather than on
     DOMContentLoaded, which fires long before these fetches settle.
   ===================================================================== */
(function () {
  'use strict';

  /* Screens first, then overlays — the same order the single-file
     index.html used, so nothing that depended on it has to change.
     Adding a screen means adding its file here and an @import in
     style.css; nothing else in the app needs to know. */
  const PAGES = [
    'pages/home.html',
    'pages/characters.html',
    'pages/campaigns.html',
    'pages/campaign.html',
    'pages/sheet.html',
    'pages/edit.html',
    'pages/rules.html',
    'pages/settings.html',
    'pages/create.html',
    'pages/menu.html',
    'pages/modals/dice.html',
    'pages/modals/inventory.html',
    'pages/modals/character.html',
    'pages/modals/campaign.html',
    'pages/toast.html'
  ];

  const mount = document.querySelector('.app');

  /* Fetch everything at once, then insert in declared order. Parallel
     because eleven sequential round-trips is eleven chances to feel slow;
     ordered on insert because the cascade and the z-index ties depend on
     it. Promise.all preserves index order regardless of settle order,
     which is the whole reason it is used here rather than a loop. */
  const ready = Promise.all(
    PAGES.map((path) =>
      fetch(path).then((res) => {
        if (!res.ok) throw new Error(path + ' → HTTP ' + res.status);
        return res.text();
      })
    )
  ).then((fragments) => {
    /* One insertAdjacentHTML per fragment rather than one giant join():
       a fragment that somehow arrives malformed then corrupts only its
       own screen, and the console points at the file that did it. */
    fragments.forEach((html) => mount.insertAdjacentHTML('beforeend', html));
  }).catch((err) => {
    /* Almost always the file:// problem described at the top. Say the
       useful thing — how to fix it — not just what failed. */
    console.error('[meeple] could not assemble the app:', err);
    mount.insertAdjacentHTML('beforeend',
      '<section class="screen screen--boot-error">' +
      '<div class="boot-error">' +
      '<h1>The app could not load its screens.</h1>' +
      '<p>Meeple assembles its markup from <code>pages/</code> at runtime, ' +
      'and browsers block that over <code>file://</code>.</p>' +
      '<p>Serve this folder over <code>http://</code> — in VS Code, right-click ' +
      '<code>index.html</code> and choose <b>Open with Live Server</b>.</p>' +
      '<p class="boot-error__detail">' + String(err) + '</p>' +
      '</div></section>');
    /* Re-throw so MEEPLE_READY rejects and main.js never calls init()
       against a half-built DOM — a broken app that says why beats a
       running app that quietly lost three screens. */
    throw err;
  });

  window.MEEPLE_READY = ready;
})();
