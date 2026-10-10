// toothContour — deterministic client-side extraction of the REAL tooth
// boundary from a scan photo, so the Results AI mesh overlay conforms to the
// person's actual smile shape instead of a static grid.
//
// Pure canvas CV — no AI, no server call. This deliberately follows teewai's
// established philosophy (deterministic dentalCV over hallucinated LLM
// coordinates — see the "Hallucinated full-scan angle checks" dead-end). It
// runs in <50ms at view time, so it works for EVERY scan (past and present)
// without re-running the AI analysis or bloating the scan record.

const SAMPLE = 200; // sample the bbox region at this resolution for precision

const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

// Tooth-pixel confidence 0-1 (gradient mask). Rejects gum/lip (reddish,
// saturated) and dark/glare pixels. Thresholds mirror dentalCV's isToothPixel
// so the silhouette matches what the rest of the engine treats as "teeth".
function toothConf(r, g, b) {
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  if (r > 150 && b < r * 0.7 && r > g + 20) return 0; // gum / lip
  const valConf = clamp((luma - 120) / 60) * clamp((245 - luma) / 40);
  const satConf = clamp(1 - sat / 0.32);
  return valConf * satConf;
}

// Fetch the image as a blob → same-origin blob URL, so getImageData() never
// throws a SecurityError. The Results page already displays the same image
// in an <img> tag, so the browser has a cached non-CORS copy — reloading with
// crossOrigin='anonymous' reuses that cached copy and taints the canvas.
// (Same fix as processWhiteningPreview in teewaiWhiten.js.)
function loadImage(url) {
  return fetch(url, { mode: 'cors' })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    })
    .then((blob) => new Promise((resolve, reject) => {
      const blobUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(blobUrl); resolve(img); };
      img.onerror = (e) => { URL.revokeObjectURL(blobUrl); reject(e); };
      img.src = blobUrl;
    }));
}

// Trace the real smile contour from the photo.
//   url       — the scan image URL
//   smileBbox — { x, y, width, height } in 0-1 (fraction of image dims)
// Returns { outline: [[x,y],...], gaps: [{x, yTop, yBot}], gumY } with all
// coordinates normalized 0-1 to the FULL image (so the overlay maps them
// through the same content-rect logic as the photo). Returns null if no
// usable tooth region is found (caller falls back to the static mesh).
export async function extractSmileContour(url, smileBbox) {
  let img;
  try { img = await loadImage(url); } catch { return null; }
  const nw = img.naturalWidth, nh = img.naturalHeight;
  if (!nw || !nh) return null;

  const bb = smileBbox && typeof smileBbox.x === 'number' ? smileBbox : { x: 0.08, y: 0.12, width: 0.84, height: 0.76 };
  const pad = 0.04;
  const bx = Math.max(0, (bb.x - pad) * nw);
  const by = Math.max(0, (bb.y - pad) * nh);
  const bw = Math.min(nw - bx, (bb.width + pad * 2) * nw);
  const bh = Math.min(nh - by, (bb.height + pad * 2) * nh);
  if (bw < 8 || bh < 8) return null;

  const scale = Math.min(SAMPLE / bw, SAMPLE / bh);
  const cw = Math.max(8, Math.round(bw * scale));
  const ch = Math.max(8, Math.round(bh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, bx, by, bw, bh, 0, 0, cw, ch);
  const { data } = ctx.getImageData(0, 0, cw, ch);

  // Per-row tooth extent + per-column confidence profile.
  const rowTooth = [];
  const rowLeft = [], rowRight = [];
  const colConf = new Float32Array(cw);
  const colTop = new Int32Array(cw).fill(-1);
  const colBot = new Int32Array(cw).fill(-1);
  let totalTooth = 0;
  for (let y = 0; y < ch; y++) {
    let l = -1, r = -1, cnt = 0;
    for (let x = 0; x < cw; x++) {
      const i = (y * cw + x) * 4;
      const c = toothConf(data[i], data[i + 1], data[i + 2]);
      colConf[x] += c;
      if (c > 0.35) {
        cnt++; totalTooth++;
        if (l < 0) l = x;
        r = x;
        if (colTop[x] < 0) colTop[x] = y;
        colBot[x] = y;
      }
    }
    rowTooth.push(cnt);
    rowLeft.push(l);
    rowRight.push(r);
  }
  if (totalTooth < cw * ch * 0.01) return null; // not enough teeth visible

  // Smooth row extents (3-tap moving average) to kill speckle.
  const sm = (arr) => arr.map((v, i) => {
    const a = arr[Math.max(0, i - 1)] ?? v;
    const b = arr[Math.min(arr.length - 1, i + 1)] ?? v;
    return (a + v + b) / 3;
  });
  const L = sm(rowLeft.map((v) => (v < 0 ? 0 : v)));
  const R = sm(rowRight.map((v) => (v < 0 ? cw - 1 : v)));

  // Tooth band: the rows that actually contain teeth.
  let yTop = 0, yBot = ch - 1;
  for (let y = 0; y < ch; y++) { if (rowTooth[y] > 3) { yTop = y; break; } }
  for (let y = ch - 1; y >= 0; y--) { if (rowTooth[y] > 3) { yBot = y; break; } }
  if (yBot - yTop < 4) return null;

  // Outline: down the left edge, up the right edge (one closed silhouette of
  // the real tooth arch).
  const outline = [];
  for (let y = yTop; y <= yBot; y++) outline.push([L[y], y]);
  for (let y = yBot; y >= yTop; y--) outline.push([R[y], y]);

  // Inter-tooth gaps: local minima in the column-confidence profile within the
  // tooth band. These become the inner vertical filaments — REAL gap
  // positions from the actual photo, not a uniform grid.
  let colMax = 0;
  for (let x = 0; x < cw; x++) colMax = Math.max(colMax, colConf[x]);
  const gaps = [];
  const thr = colMax * 0.42;
  let inGap = false, gapStart = 0;
  for (let x = 0; x <= cw; x++) {
    const low = x < cw && colConf[x] < thr;
    if (low && !inGap) { inGap = true; gapStart = x; }
    else if (!low && inGap) {
      const cx = (gapStart + x - 1) / 2;
      if (cx > cw * 0.08 && cx < cw * 0.92) gaps.push(cx);
      inGap = false;
    }
  }

  // Normalize everything to the full image (0-1).
  const nx = (px) => (bx + (px / cw) * bw) / nw;
  const ny = (py) => (by + (py / ch) * bh) / nh;

  // Per-column tooth extent: top edge (gumline side) and bottom edge (incisal
  // edge side). Smoothed to kill speckle. These drive the tessellated mesh —
  // the net conforms to the REAL tooth band, not a static rectangle.
  const ct = sm(Array.from(colTop, (v) => (v < 0 ? 0 : v)));
  const cb = sm(Array.from(colBot, (v) => (v < 0 ? ch - 1 : v)));
  const topEdge = [];
  const bottomEdge = [];
  for (let x = 0; x < cw; x++) {
    if (colTop[x] >= 0 && colConf[x] > 0.5) {
      topEdge.push([nx(x), ny(ct[x])]);
      bottomEdge.push([nx(x), ny(cb[x])]);
    }
  }

  return {
    outline: outline.map(([px, py]) => [nx(px), ny(py)]),
    gaps: gaps.slice(0, 6).map((gx) => ({ x: nx(gx), yTop: ny(yTop), yBot: ny(yBot) })),
    gumY: ny(yBot - (yBot - yTop) * 0.1),
    topEdge,
    bottomEdge,
  };
}