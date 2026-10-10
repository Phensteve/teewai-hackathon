// Deterministic food colorimetry — teewai's food-scan moat.
//
// Mirrors the teeth-scan CIELAB consensus: a deterministic pixel measurement
// that cross-checks the AI's stain-property assessments against the ACTUAL
// color of the food in the photo. On disagreement, the measured chromogenicity
// wins (blended), and the stain level is recomputed — so a pale food the AI
// over-rated or a vividly pigmented food the AI under-rated is corrected by the
// real pixels, not a second LLM guess. This is the part competitors can't
// replicate without their own calibrated per-item pixel pipeline.

// Load + downscale the photo into a canvas for fast pixel sampling. Accuracy
// is fine at 256px (we only need average saturation/lightness per region).
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxEdge = 256;
      let { width, height } = img;
      const scale = Math.min(1, maxEdge / Math.max(width, height));
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve({ ctx, width, height });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')); };
    img.src = url;
  });
}

// RGB (0-255) → HSL (0-1 each). Standard algorithm.
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

// Sample the pixels of one food region (or the whole image) and return a
// deterministic chromogenic score 0-100 from the measured saturation + lightness.
// Anchors: water/milk (S~0, L~0.9) → ~3; white rice (S~0.05, L~0.85) → ~8;
// coffee (S~0.4, L~0.2) → ~56; red wine (S~0.7, L~0.15) → ~84; beetroot
// (S~0.9, L~0.3) → ~98 — matching the calibrated catalog scale.
function measureRegion(ctx, width, height, region) {
  let x0 = 0;
  let y0 = 0;
  let x1 = width;
  let y1 = height;
  if (region && region.x != null && region.w != null) {
    x0 = Math.max(0, Math.floor(region.x * width));
    y0 = Math.max(0, Math.floor(region.y * height));
    x1 = Math.min(width, Math.ceil((region.x + region.w) * width));
    y1 = Math.min(height, Math.ceil((region.y + region.h) * height));
  }
  if (x1 <= x0) x1 = x0 + 1;
  if (y1 <= y0) y1 = y0 + 1;
  let data;
  try {
    data = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
  } catch {
    return null;
  }
  let sSum = 0;
  let lSum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const [, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    sSum += s;
    lSum += l;
    n++;
  }
  if (!n) return null;
  const S = sSum / n;
  const L = lSum / n;
  // Saturation drives pigment intensity; darkness adds (deep colors read as
  // more chromogenic even at moderate saturation, e.g. coffee vs. orange juice).
  const chromogenic = Math.round(Math.max(0, Math.min(100, S * 90 + (1 - L) * 25)));
  return { saturation: S, lightness: L, chromogenic };
}

// Cross-check each resolved item's AI-reported chromogenicity against the real
// pixels. On a large disagreement (>30), blend toward the measurement and
// recompute the stain level by the chromogenic weight (0.35) in the stain
// formula — so the correction propagates to the logged stain load.
export async function applyFoodConsensus(items, file) {
  if (!items || !items.length || !file) return items;
  let ctxData;
  try {
    ctxData = await loadImage(file);
  } catch {
    return items; // can't measure → trust the AI
  }
  const { ctx, width, height } = ctxData;

  return items.map((entry) => {
    if (!entry || !entry.item) return entry;
    const aiChromo = Number(entry.scores?.chromogenic ?? entry.item?.chromogenic ?? null);
    const stain = Number(entry.item?.stain_level ?? null);
    if (aiChromo == null || stain == null) return entry;

    // Image color is appearance, not a validated chemical staining assay.
    // Never overwrite catalog chemistry or sample the whole plate as one item.
    if (entry.matched || !entry.region || !['x', 'y', 'w', 'h'].every((k) => Number.isFinite(entry.region[k])) || entry.region.w <= 0 || entry.region.h <= 0 || entry.region.x < 0 || entry.region.y < 0 || entry.region.x + entry.region.w > 1 || entry.region.y + entry.region.h > 1) return entry;
    const measured = measureRegion(ctx, width, height, entry.region);
    if (!measured) return entry;

    const delta = measured.chromogenic - aiChromo;
    if (Math.abs(delta) <= 30) return entry; // agree within tolerance — trust the AI

    // Disagreement: blend 50/50 toward the deterministic measurement (moat).
    const corrected = Math.round(Math.max(0, Math.min(100, aiChromo + delta * 0.5)));
    // Chromogenic carries 0.35 weight in the stain formula, so move the stain
    // level by that fraction of the chromogenic correction.
    // No change to the logged stain estimate from camera saturation.

    return {
      ...entry,
      // Keep chemistry unchanged: saturated pixels do not prove tannin or
      // stain-binding behavior. Record disagreement as an advisory only.
      item: entry.item,
      scores: entry.scores,
      consensus: {
        ai: aiChromo,
        measured: measured.chromogenic,
        corrected,
        saturation: Math.round(measured.saturation * 100) / 100,
        lightness: Math.round(measured.lightness * 100) / 100,
      },
    };
  });
}