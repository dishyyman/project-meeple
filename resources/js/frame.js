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

  /* Phone is the default, and that is a design position rather than an
     accident: the layout is tuned for 402px and most players are on a
     phone, so the framed view is the one that tells the truth about how
     the app looks in the wild. */
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
    const next = root.getAttribute('data-frame') === FULL ? PHONE : FULL;
    try { localStorage.setItem(KEY, next); } catch (_) { /* see stored() */ }
    apply(next);
  }

  // Attribute first, synchronously, so there is no frame of the wrong shell.
  root.setAttribute('data-frame', stored());

  // The button itself is in the shell markup, so it is already parsed by
  // the time this runs at the end of <body> — but guard anyway, because
  // this file should never be the reason the app fails to start.
  document.addEventListener('DOMContentLoaded', function () {
    const btn = document.querySelector('[data-frame-toggle]');
    if (btn) btn.addEventListener('click', toggle);
    apply(root.getAttribute('data-frame'));
  });
})();
