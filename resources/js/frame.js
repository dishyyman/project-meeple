/* =====================================================================
   MEEPLE — frame mode

   Switches the app between the phone shell and a full browser window.
   Shell chrome only: it knows nothing about characters, views or rules,
   and nothing in the app knows about it. The single point of contact is
   the data-frame attribute on <html>, which frame.css reads.

   WHY IT IS NOT PART OF main.js
   main.js owns one delegated click handler bound inside .app. The toggle
   lives OUTSIDE .app, on purpose — it is not part of the character app's
   behavior, and routing it through the app's handler would make the app
   responsible for how it is housed. This file is small and stays small.

   ON A REAL PHONE THERE IS NO CHOICE
   The phone frame is a desktop PREVIEW of a phone. On an actual phone it
   would draw a 430px fake device, notch and clock inside the real ones —
   wider and taller than the screen. So when the screen itself is the
   phone (DEVICE_QUERY below), the mode is always full, <html> carries
   data-frame-locked, and frame.css hides the toggle. The stored choice is
   left alone, not overwritten: it is a desktop preference, and the desktop
   still gets it back. The query is watched, so a desktop window dragged
   narrower than the frame locks, and widening it unlocks.

   WHY THE ATTRIBUTE IS SET BEFORE DOM READY
   The stored preference is applied in the same synchronous pass as this
   script, before the fragments land, so a player who chose full mode
   never sees the phone frame paint first and snap away.
   ===================================================================== */
(function () {
  'use strict';

  const KEY = 'meeple:frame';
  const PHONE = 'phone';
  const FULL = 'full';

  const root = document.documentElement;

  /* On a desktop, phone is the default, and that is a design position
     rather than an accident: the layout is tuned for 402px and most players
     are on a phone, so the framed view is the one that tells the truth about
     how the app looks in the wild. (On the phone itself, see sync().) */
  function stored() {
    try {
      const v = localStorage.getItem(KEY);
      return v === FULL || v === PHONE ? v : PHONE;
    } catch (_) {
      /* Private mode or blocked storage. Not worth failing over — the
         default is a perfectly good answer. */
      return PHONE;
    }
  }

  /* "The screen is the phone": a touch-first device (phones, tablets —
     neither has any use for a drawn phone), or any window too narrow to
     hold the frame. 459px is the frame's own width worked out, not a
     device size: 402 screen + 2 × 14 bezel + 2 × 14 breathing room = 458.
     Desktop browsers report hover and a fine pointer, so the Playwright
     desktop projects (460px wide) still see the frame. */
  const DEVICE_QUERY = '(hover: none) and (pointer: coarse), (max-width: 459px)';
  const device = window.matchMedia ? window.matchMedia(DEVICE_QUERY) : null;
  const onDevice = () => Boolean(device && device.matches);

  function apply(mode) {
    root.setAttribute('data-frame', mode);
    const btn = document.querySelector('[data-frame-toggle]');
    if (!btn) return;
    // The button describes what it will DO, not the state it is in —
    // less ambiguous for a screen reader landing on it cold.
    const toPhone = mode === FULL;
    btn.setAttribute('aria-pressed', String(toPhone));
    btn.querySelector('[data-frame-label]').textContent = toPhone ? 'Phone' : 'Full';
    btn.setAttribute('aria-label', toPhone
      ? 'Switch to the phone frame'
      : 'Switch to full window');
  }

  function toggle() {
    // The toggle is hidden while locked, but guard anyway: a stray click
    // must never store a choice the player could not see themselves make.
    if (onDevice()) return;
    const next = root.getAttribute('data-frame') === FULL ? PHONE : FULL;
    try { localStorage.setItem(KEY, next); } catch (_) { /* see stored() */ }
    apply(next);
  }

  // Locked to full on a phone; otherwise whatever the player last chose.
  function sync() {
    root.toggleAttribute('data-frame-locked', onDevice());
    apply(onDevice() ? FULL : stored());
  }

  // Attribute first, synchronously, so there is no frame of the wrong shell.
  sync();
  // Rotation, a resized window, a tablet keyboard attached: re-decide.
  // addEventListener, not the older addListener — every browser the app
  // supports has it on MediaQueryList.
  if (device && device.addEventListener) device.addEventListener('change', sync);

  // The button itself is in the shell markup, so it is already parsed by
  // the time this runs at the end of <body> — but guard anyway, because
  // this file should never be the reason the app fails to start.
  document.addEventListener('DOMContentLoaded', function () {
    const btn = document.querySelector('[data-frame-toggle]');
    if (btn) btn.addEventListener('click', toggle);
    sync();
  });
})();
