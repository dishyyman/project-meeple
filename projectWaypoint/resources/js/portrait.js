/* =====================================================================
   WAYPOINT — Portrait Pipeline
   ---------------------------------------------------------------------
   ONE image engine, for the same reason there is one dice engine: every
   photo that enters the app — hero portrait, roster thumbnail, whatever
   comes later — goes through compress(). Don't write a second decoder.

   The problem this solves: a phone camera produces 4–12 MB files, and the
   test asset alone is a 5.1 MB / 1792×2688 PNG. localStorage gives us
   roughly 5 MB for the WHOLE origin, and a data URL is base64, which
   inflates bytes by a further ~33%. So a portrait has to be re-encoded
   before it is stored, not merely stored carefully.

   Declared as a plain global rather than a module because every script
   the app loads is a classic <script> — same arrangement as dice.js and
   library.js. Modules are possible now that the app is served over
   http://; see docs/architecture.md §13.
   ===================================================================== */

(() => {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* LIMITS — the equivalent of the dice parser's 1–100 dice guard.      */
  /* Stated once, exported, and enforced in exactly one place.           */
  /* ------------------------------------------------------------------ */

  // A sanity ceiling on what we will even attempt to decode. Well above any
  // phone camera; low enough that a mis-picked video or RAW file fails fast
  // with a message instead of hanging the tab on a decode that cannot finish.
  const MAX_INPUT_BYTES = 25 * 1024 * 1024;

  // Longest edge of the stored image. The hero is ~390×376 CSS px, so 1200
  // still has headroom on a 3× display; going higher buys pixels no screen
  // in this app will ever show, at direct cost to the storage budget.
  const MAX_EDGE = 1200;

  // Target size of the ENCODED JPEG, before base64. ~400 KB becomes ~535 KB
  // as a data URL — comfortable next to a play-state save measured in
  // kilobytes, and it leaves the origin's quota mostly unspent.
  const BYTE_BUDGET = 400 * 1024;

  // Tried in order, best first. Below ~0.55 JPEG artefacts become visible on
  // skin and flat colour, which is most of what a character portrait is, so
  // the ladder stops there and reaches for resolution instead (see compress).
  const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55];

  // JPEG has no alpha channel. A transparent PNG composited onto nothing
  // encodes as black, so it is matted onto white first. White rather than a
  // parchment token on purpose: this file is an encoder and must not know
  // what the app's palette is — appearance stays in the stylesheet.
  const MATTE = '#ffffff';

  /* ------------------------------------------------------------------ */
  /* DECODE                                                             */
  /* ------------------------------------------------------------------ */

  // createImageBitmap is the fast path AND the correct one: `imageOrientation:
  // 'from-image'` applies the EXIF rotation tag, without which every photo
  // taken by holding a phone sideways arrives on its side. Drawing an <img>
  // to a canvas does NOT do this in every browser, so the fallback below is
  // genuinely second-best and only runs where the first path is missing.
  async function decode(file) {
    if (typeof createImageBitmap === 'function') {
      try {
        return await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch (_) {
        // Older Safari rejects the options dictionary outright. Retry bare
        // before giving up on the fast path altogether.
        try { return await createImageBitmap(file); } catch (_) { /* fall through */ }
      }
    }
    return decodeViaImg(file);
  }

  function decodeViaImg(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      // The object URL is revoked on BOTH paths — a leaked one pins the whole
      // decoded bitmap in memory for the life of the document.
      img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  const sizeOf = (src) => ({
    w: src.width  || src.naturalWidth,
    h: src.height || src.naturalHeight,
  });

  /* ------------------------------------------------------------------ */
  /* SCALE & ENCODE                                                     */
  /* ------------------------------------------------------------------ */

  // Never scales UP: a 400px portrait stays 400px rather than being
  // interpolated to 1200 and paying for the pixels it invented.
  function fit(w, h, maxEdge) {
    const scale = Math.min(1, maxEdge / Math.max(w, h));
    return {
      w: Math.max(1, Math.round(w * scale)),
      h: Math.max(1, Math.round(h * scale)),
    };
  }

  function drawTo(source, w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = MATTE;
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(source, 0, 0, w, h);
    return canvas;
  }

  // Promise-shaped toBlob, with the synchronous toDataURL as a fallback for
  // browsers that never shipped toBlob. Both paths return a Blob so the
  // caller only has one shape to measure and read.
  function encode(canvas, quality) {
    return new Promise((resolve, reject) => {
      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('encode'))),
          'image/jpeg',
          quality,
        );
        return;
      }
      try {
        resolve(dataUrlToBlob(canvas.toDataURL('image/jpeg', quality)));
      } catch (_) {
        reject(new Error('encode'));
      }
    });
  }

  function dataUrlToBlob(url) {
    const [head, body] = url.split(',');
    const bytes = atob(body);
    const buf = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
    return new Blob([buf], { type: /:(.*?);/.exec(head)[1] });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload  = () => resolve(fr.result);
      fr.onerror = () => reject(new Error('read'));
      fr.readAsDataURL(blob);
    });
  }

  /* ------------------------------------------------------------------ */
  /* PUBLIC — compress(file)                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Re-encode a user-supplied image into something small enough to persist.
   *
   * Resolves { dataUrl, width, height, bytes, quality }.
   * Rejects with an Error whose .message is written for a player to read —
   * callers show it verbatim rather than inventing their own wording.
   */
  async function compress(file) {
    if (!file || !/^image\//.test(file.type || '')) {
      throw new Error('That file is not an image.');
    }
    if (file.size > MAX_INPUT_BYTES) {
      throw new Error('That image is larger than 25 MB — try a smaller one.');
    }

    let bitmap;
    try {
      bitmap = await decode(file);
    } catch (_) {
      // Overwhelmingly the HEIC case: an iPhone photo moved to a desktop
      // keeps its .heic container, which Chrome and Firefox cannot decode.
      // Picking the same photo from the phone's own library is fine, because
      // iOS transcodes to JPEG on the way out — hence the specific advice.
      throw new Error('This image could not be read. iPhone HEIC photos may need exporting as JPEG first.');
    }

    const { w: srcW, h: srcH } = sizeOf(bitmap);
    if (!srcW || !srcH) throw new Error('This image could not be read.');

    // Two passes, cheapest lever first. Dropping quality preserves detail you
    // can see (edges, features); halving resolution destroys it. So the whole
    // quality ladder is tried at full size before any pixels are given up, and
    // the second pass exists only for the rare photo that is still over budget
    // at 0.55 — a very large, very noisy image. Two passes is the floor: at
    // 600px even a noisy photograph lands well under 400 KB.
    let best = null;
    for (const edge of [MAX_EDGE, Math.round(MAX_EDGE / 2)]) {
      const { w, h } = fit(srcW, srcH, edge);
      const canvas = drawTo(bitmap, w, h);
      for (const quality of QUALITY_STEPS) {
        const blob = await encode(canvas, quality);
        // Kept even when over budget, so a pass that never gets under the
        // ceiling still has something to return rather than failing.
        if (!best || blob.size < best.blob.size) best = { blob, w, h, quality };
        if (blob.size <= BYTE_BUDGET) {
          if (bitmap.close) bitmap.close();
          return {
            dataUrl: await blobToDataUrl(blob),
            width: w, height: h, bytes: blob.size, quality,
          };
        }
      }
    }

    // Fell through every combination. Return the smallest we managed rather
    // than refusing: an oversized portrait still displays, and the caller
    // reports honestly if storing it then fails.
    if (bitmap.close) bitmap.close();
    return {
      dataUrl: await blobToDataUrl(best.blob),
      width: best.w, height: best.h, bytes: best.blob.size, quality: best.quality,
    };
  }

  window.WAYPOINT_PORTRAIT = {
    compress,
    LIMITS: { MAX_INPUT_BYTES, MAX_EDGE, BYTE_BUDGET },
  };
})();
