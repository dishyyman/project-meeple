/* =====================================================================
   MEEPLE — the device preview

   On a desktop, the app previews inside a drawn device, and the preview
   bar picks which one: an iPhone, an iPhone SE, the iPhone Duo closed or
   open, an iPad mini or Pro, a free size you drag to any shape, or "Fit
   window" (no device; the app fills the browser). It is a browser's own
   device toolbar, built in, so a layout can be checked at every size the
   app will meet without leaving Live Server.

   Shell chrome only: it knows nothing about characters, views or rules,
   and nothing in the app knows about it. The points of contact are
   attributes on <html>, which frame.css reads:

     data-frame      "device" (a drawn device) | "full" (fills the window)
     data-device     which preset, e.g. "ipad-mini" (frame.css §3a)
     data-rotated    present when the preset is turned on its side
     data-orient     "portrait" | "landscape" — the RESULT of the two
                     above, for the device furniture (island, status bar)
     data-frame-locked  present on a real phone or tablet (below)

   and one number it writes as a custom property, --preview-scale (how far
   a device too big for the window is shrunk to fit), the same way main.js
   writes --pull: a raw scalar, through the CSSOM, which the CSP allows.

   WHY IT IS NOT PART OF main.js
   main.js owns one delegated click handler bound inside .app. The bar
   lives OUTSIDE .app, on purpose — it is not part of the character app's
   behavior, and routing it through the app's handler would make the app
   responsible for how it is housed.

   ON A REAL PHONE THERE IS NO CHOICE
   The drawn device is a desktop PREVIEW. On an actual phone it would draw
   a fake device, island and clock inside the real ones. So when the screen
   itself is the device (DEVICE_QUERY below), the mode is always full,
   <html> carries data-frame-locked, and frame.css hides the bar. The
   stored choice is left alone, not overwritten: it is a desktop
   preference, and the desktop still gets it back. The query is watched,
   so a desktop window dragged narrower than a phone locks, and widening
   it unlocks.

   WHY THE ATTRIBUTES ARE SET BEFORE DOM READY
   The stored preview is applied in the same synchronous pass as this
   script (it loads in <head>), before the fragments land, so a player who
   chose "Fit window" never sees a device paint first and snap away.
   ===================================================================== */
(function () {
  'use strict';

  const KEY = 'meeple:preview';
  // The Phone/Full toggle's key, before the preview bar replaced it. Read
  // once, so a desktop that had chosen full window keeps it; never written.
  const LEGACY_KEY = 'meeple:frame';

  const FULL = 'full';         // "Fit window": no device drawn
  const FREE = 'free';         // a device you drag to any size
  const DEFAULT = 'iphone';    // the design target, and the honest preview

  /* The layout bands, for the READOUT ONLY — the bar says which band a
     size lands in, so you can see where the layout will change. The bands
     themselves are decided in CSS (tokens.css, "Layout bands"); a container
     query cannot be read from script, so the numbers are restated here.
     If one moves there, move it here. Nothing in the app depends on these. */
  function bandOf(w, h) {
    const wide = w >= 1024 || (w >= 840 && w > h) ? 'expanded' : w >= 600 ? 'medium' : 'compact';
    return h < 700 ? `${wide} · short` : wide;
  }

  const root = document.documentElement;

  /* "The screen is the device": a touch-first device (phones, tablets —
     neither has any use for a drawn one), or any window too narrow to hold
     the drawn phone. 459px is the frame's own width worked out, not a
     device size: 402 screen + 2 × 14 bezel + 2 × 14 breathing room = 458.
     Desktop browsers report hover and a fine pointer, so the Playwright
     desktop projects (460px wide) still see the frame. */
  const DEVICE_QUERY = '(hover: none) and (pointer: coarse), (max-width: 459px)';
  const device = window.matchMedia ? window.matchMedia(DEVICE_QUERY) : null;
  const onDevice = () => Boolean(device && device.matches);

  /* The stored preview: { device, rotated, free: { w, h } }. Anything
     unreadable falls back to the default rather than failing — private
     mode, blocked storage, or a value from some older build. */
  function stored() {
    const fallback = { device: DEFAULT, rotated: false, free: null };
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const v = JSON.parse(raw);
        if (v && typeof v.device === 'string') {
          return {
            device: v.device,
            rotated: Boolean(v.rotated),
            free: v.free && v.free.w > 0 && v.free.h > 0 ? { w: v.free.w, h: v.free.h } : null,
          };
        }
      }
      if (localStorage.getItem(LEGACY_KEY) === 'full') return { ...fallback, device: FULL };
    } catch (_) { /* see above */ }
    return fallback;
  }

  let pref = stored();

  function remember() {
    try { localStorage.setItem(KEY, JSON.stringify(pref)); } catch (_) { /* see stored() */ }
  }

  const deviceEl = () => document.querySelector('.device');
  const bar = () => document.querySelector('[data-preview]');

  /* A preset the stylesheet does not know would draw a 402 × 874 default
     under the wrong name — so a stored id is checked against the bar's own
     list once the bar exists. Before then (the synchronous first pass) it is
     trusted; the check a moment later corrects it before anything paints
     the bar. */
  function known(id) {
    const sel = document.querySelector('[data-preview-device]');
    if (!sel) return true;
    return Array.from(sel.options).some((o) => o.value === id);
  }

  // The size of the drawn device, from its own box (for a free size, the
  // inline size the drag left; for a preset, the stylesheet's). offsetWidth,
  // not the bounding box: the scale is a transform, and this is the size the
  // layout inside sees.
  //
  // On the first, synchronous pass the element is not parsed yet, so the
  // size comes from the stylesheet's tokens instead — which have loaded,
  // because a script waits for the stylesheets above it. That keeps
  // data-orient right from the first paint (the open Duo is landscape).
  function deviceSize() {
    const el = deviceEl();
    if (el) return { w: el.offsetWidth, h: el.offsetHeight };
    if (pref.device === FREE && pref.free) return { w: pref.free.w, h: pref.free.h };
    const css = getComputedStyle(root);
    return {
      w: parseFloat(css.getPropertyValue('--frame-w')) || 0,
      h: parseFloat(css.getPropertyValue('--frame-h')) || 0,
    };
  }

  /* Shrink a device too big for the window, never enlarge one. The room is
     the window less the body's padding (base.css: 32px above and below),
     the bar and its gap above the device, and the bezel either side —
     28px, the same breathing room DEVICE_QUERY allows. A free size is never
     scaled: dragging a corner that moves at a different speed to the mouse
     is worse than a page that scrolls. */
  function fit() {
    const el = deviceEl();
    if (!el) return;
    let scale = 1;
    if (root.getAttribute('data-frame') === 'device' && pref.device !== FREE) {
      const { w, h } = deviceSize();
      const b = bar();
      const barH = b ? b.offsetHeight + 16 : 0;
      const roomW = window.innerWidth - 56;
      const roomH = window.innerHeight - 64 - barH;
      if (w && h) scale = Math.min(1, roomW / w, roomH / h);
      scale = Math.max(0.25, Math.floor(scale * 1000) / 1000);
    }
    if (scale === 1) root.style.removeProperty('--preview-scale');
    else root.style.setProperty('--preview-scale', String(scale));
    readout(scale);
  }

  function readout(scale) {
    const out = document.querySelector('[data-preview-size]');
    if (!out) return;
    const full = root.getAttribute('data-frame') === FULL;
    // In full mode the app is the window, less any safe-area padding.
    const app = document.querySelector('.app');
    const w = full && app ? app.clientWidth : deviceSize().w;
    const h = full && app ? app.clientHeight : deviceSize().h;
    if (!w || !h) return;
    const pct = scale < 1 ? ` · ${Math.round(scale * 100)}%` : '';
    out.textContent = `${w} × ${h} · ${bandOf(w, h)}${pct}`;
  }

  function apply() {
    const locked = onDevice();
    root.toggleAttribute('data-frame-locked', locked);
    const id = locked ? FULL : pref.device;
    const full = id === FULL;
    root.setAttribute('data-frame', full ? 'full' : 'device');
    if (full) root.removeAttribute('data-device');
    else root.setAttribute('data-device', id);
    root.toggleAttribute('data-rotated', !full && id !== FREE && pref.rotated);

    // A free size is held on the element itself, where the browser's own
    // resize handle writes it; anything else must not inherit a stale one.
    const el = deviceEl();
    if (el) {
      if (!full && id === FREE && pref.free) {
        el.style.setProperty('width', `${pref.free.w}px`);
        el.style.setProperty('height', `${pref.free.h}px`);
      } else {
        el.style.removeProperty('width');
        el.style.removeProperty('height');
      }
    }

    const { w, h } = deviceSize();
    root.setAttribute('data-orient', w > h ? 'landscape' : 'portrait');

    const sel = document.querySelector('[data-preview-device]');
    if (sel && sel.value !== id) sel.value = id;
    const rot = document.querySelector('[data-preview-rotate]');
    if (rot) rot.disabled = full;
    fit();
  }

  function choose(id) {
    if (onDevice()) return;   // the bar is hidden while locked; guard anyway
    if (id === FREE && pref.device !== FREE) {
      // A free size starts as the device it was switched from, so "free"
      // means "now let me drag THIS", not a jump to an arbitrary box.
      const { w, h } = deviceSize();
      if (root.getAttribute('data-frame') === 'device' && w && h) pref.free = { w, h };
    }
    // A newly picked device starts the way it is usually held — rotation
    // belonged to the last one, and carried over it would show the open Duo
    // on end the moment it was chosen.
    if (id !== pref.device) pref.rotated = false;
    pref.device = id;
    remember();
    apply();
  }

  function rotate() {
    if (onDevice() || pref.device === FULL) return;
    if (pref.device === FREE) {
      const { w, h } = deviceSize();
      pref.free = { w: h, h: w };
    } else {
      pref.rotated = !pref.rotated;
    }
    remember();
    apply();
  }

  // Attributes first, synchronously, so there is no frame of the wrong shell.
  apply();
  // Rotation, a resized window, a tablet keyboard attached: re-decide.
  if (device && device.addEventListener) device.addEventListener('change', apply);
  window.addEventListener('resize', fit);

  // The bar is in the shell markup, after this script; it exists by
  // DOMContentLoaded. Guarded throughout, because this file should never be
  // the reason the app fails to start.
  document.addEventListener('DOMContentLoaded', function () {
    if (!known(pref.device)) { pref.device = DEFAULT; pref.rotated = false; }
    const sel = document.querySelector('[data-preview-device]');
    if (sel) sel.addEventListener('change', () => choose(sel.value));
    const rot = document.querySelector('[data-preview-rotate]');
    if (rot) rot.addEventListener('click', rotate);

    // A free size being dragged: keep the readout live, and remember where
    // the corner was left. ResizeObserver also catches the app's own size
    // changing in full mode (a window resize already calls fit()).
    const el = deviceEl();
    if (el && window.ResizeObserver) {
      new ResizeObserver(() => {
        const { w, h } = deviceSize();
        if (pref.device === FREE && root.getAttribute('data-frame') === 'device' && w && h) {
          if (!pref.free || pref.free.w !== w || pref.free.h !== h) {
            pref.free = { w, h };
            remember();
          }
          root.setAttribute('data-orient', w > h ? 'landscape' : 'portrait');
        }
        readout(Number(root.style.getPropertyValue('--preview-scale')) || 1);
      }).observe(el);
    }
    apply();
  });
})();
