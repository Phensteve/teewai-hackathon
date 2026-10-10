// teewaiWhitenSurgical — precision teeth-whitening engine.
//
// Builds on teewaiWhiten's LAB approach but adds:
//   1. A tighter tooth mask that excludes lips, gums, tongue, skin, and metal
//      (braces brackets/wires) — reusing the scan pipeline's tooth-pixel
//      definition and extending it.
//   2. Target-shade-driven whitening: the shift is computed from the measured
//      average tooth LAB to the TARGET VITA shade's LAB, not a generic L*.
//   3. Luminance-structure preservation: L* is shifted uniformly (all pixels
//      move by the same delta) so grooves, per-tooth shading, translucency and
//      specular highlights survive. Chroma (b*, a*) is reduced proportionally
//      so stains are removed where they're worst.
//   4. A verification loop: after whitening, the shade analyzer re-measures the
//      output. If it lands more than one VITA step from the target, the shift
//      is recalibrated and re-applied (up to 3 passes).
//
// No geometric operations — tooth contours are pixel-identical in shape.
// Everything outside the feathered mask is bitwise identical to the original.

import { VITA_ATLAS, rgbToLab, matchShade } from './teewaiColorimetry';
import { shadeIndex } from './vitaShade';

const clamp = (v, lo = 0, hi = 255) => Math.max(lo, Math.min(hi, v));
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ─────────────────────────────────────────────────────────────────────────
// COLOUR SPACE HELPERS
// ─────────────────────────────────────────────────────────────────────────

function rgbToHsv(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s, max / 255];
}

// LAB → RGB (inverse of teewaiColorimetry's rgbToLab). Needed to write adjusted
// LAB values back to pixel data.
const D65_X = 0.95047, D65_Y = 1.0, D65_Z = 1.08883;
function labToRgb(L, a, b) {
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  const finv = (t) => {
    const t3 = t * t * t;
    return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787;
  };
  const X = finv(fx) * D65_X, Y = finv(fy) * D65_Y, Z = finv(fz) * D65_Z;
  const R = X * 3.2404542 + Y * -1.5371385 + Z * -0.4985314;
  const G = X * -0.9692660 + Y * 1.8760108 + Z * 0.0415560;
  const B = X * 0.0556434 + Y * -0.2040259 + Z * 1.0572252;
  const linearToSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  return [linearToSrgb(R) * 255, linearToSrgb(G) * 255, linearToSrgb(B) * 255];
}

// ─────────────────────────────────────────────────────────────────────────
// PART 1 — SURGICAL TOOTH MASK
//
// Reuses the scan pipeline's tooth-pixel definition (luma > 120, sat < 0.32,
// not reddish) and EXTENDS it with:
//   • Lip/skin exclusion: catches reddish-orange tissue (hue 5-40, sat > 0.12)
//     that the old "hue < 16" gum check missed — this is what bled into lips.
//   • Metal/braces exclusion: very bright, very low saturation, near-neutral
//     pixels are metal (brackets, wires), not enamel. Enamel always has b* > 3
//     (slight yellow); metal is truly neutral. Excluded so brackets survive.
//   • Tighter feathering: radius 2, 3 passes ≈ Gaussian sigma 2.0px (in the
//     2-4px range) — tight enough for no halos, soft enough for no rings.
// ─────────────────────────────────────────────────────────────────────────

// Is this pixel gum, lip, tongue, or metal? Returns true for non-enamel tissue
// that must be EXCLUDED from the mask (and act as a barrier to smoothing bleed).
function isExcludedPixel(r, g, b, luma, sat, hue) {
  // GUM/LIP/TONGUE: reddish hue (NOT yellow). Teeth are yellow (hue 30-90) and
  // have R > G > B, so a pure R>G check catches stained teeth. The hue gate
  // ensures only true red/pink tissue is excluded:
  //   • hue < 20 (red) → gum, high-confidence exclusion
  //   • hue 20-30 (orange-red) → lip, only if saturated (lips are more
  //     saturated than brown-stained teeth which sit at the same hue)
  //   • hue > 340 (pink-red) → gum
  if (hue < 20 && r > g + 10 && sat > 0.12) return true;
  if (hue >= 20 && hue < 30 && r > g + 15 && sat > 0.25) return true;
  if (hue > 340 && r > g + 10 && sat > 0.12) return true;
  // METAL/BRACES: very bright, very low saturation, near-neutral. Enamel
  // even at its whitest has b* > 3 (slight yellow warmth). Metal is truly
  // neutral (R ≈ G ≈ B). Keeps brackets and wires un-whitened.
  if (luma > 195 && sat < 0.09 && Math.abs(r - b) < 18) return true;
  return false;
}

function toothPixelScore(r, g, b, luma, sat, hue) {
  if (luma < 100) return 0; // too dark

  // BRIGHTNESS score: brighter = more likely tooth.
  const brightScore = clamp01((luma - 110) / 70);

  // HUE weight: yellow/ivory (30-90°) is the tooth zone. Brown (18-30°) is
  // still a stained tooth. Green/blue/purple are not teeth.
  let hueWeight = 1;
  if (hue >= 30 && hue <= 90) hueWeight = 1.0;
  else if (hue >= 18 && hue < 30) hueWeight = 0.85;
  else if (hue >= 90 && hue < 140) hueWeight = 0.40;
  else if (hue >= 140 && hue < 320) hueWeight = 0.10;
  else hueWeight = 0.20;

  // SATURATION penalty for non-yellow hues (catches residual lip/skin).
  if ((hue < 18 || hue > 90) && sat > 0.20) hueWeight *= 0.3;

  // YELLOW bonus: a yellow pixel in the tooth zone is almost certainly a
  // stained tooth — boost so the stain gets removed.
  let prob = brightScore * hueWeight;
  if (hue >= 30 && hue <= 90 && sat > 0.08) prob *= 1.15;

  return clamp01(prob);
}

// Separable box blur — N passes approximate a Gaussian with
// sigma = radius * sqrt(N/3). radius 2, 3 passes → sigma ≈ 2.0px.
function smoothMask(mask, w, h, radius, passes) {
  let src = mask;
  let tmp = new Float32Array(w * h);
  const win = 2 * radius + 1;
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) {
        const xi = Math.min(w - 1, Math.max(0, k));
        acc += src[y * w + xi];
      }
      for (let x = 0; x < w; x++) {
        tmp[y * w + x] = acc / win;
        const xOut = Math.max(0, x - radius);
        const xIn = Math.min(w - 1, x + radius + 1);
        acc += src[y * w + xIn] - src[y * w + xOut];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) {
        const yi = Math.min(h - 1, Math.max(0, k));
        acc += tmp[yi * w + x];
      }
      for (let y = 0; y < h; y++) {
        src[y * w + x] = acc / win;
        const yOut = Math.max(0, y - radius);
        const yIn = Math.min(h - 1, y + radius + 1);
        acc += tmp[yIn * w + x] - tmp[yOut * w + x];
      }
    }
  }
  return src;
}

// Morphological dilation (max filter) — preserves 1.0 at small spots unlike
// Gaussian smoothing which averages them down. Used for the exclusion barrier.
function dilateMask(mask, w, h, radius) {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let mx = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = Math.min(w - 1, Math.max(0, x + dx));
          const ny = Math.min(h - 1, Math.max(0, y + dy));
          mx = Math.max(mx, mask[ny * w + nx]);
        }
      }
      out[y * w + x] = mx;
    }
  }
  return out;
}

export function buildSurgicalMask(data, w, h, roi) {
  const x0 = roi ? Math.max(0, Math.floor(roi.x0)) : 0;
  const y0 = roi ? Math.max(0, Math.floor(roi.y0)) : 0;
  const x1 = roi ? Math.min(w, Math.ceil(roi.x1)) : w;
  const y1 = roi ? Math.min(h, Math.ceil(roi.y1)) : h;

  const raw = new Float32Array(w * h);
  const excl = new Float32Array(w * h); // exclusion barrier (gum/lip/metal)

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const p = y * w + x;
      const i = p * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const [hue] = rgbToHsv(r, g, b);

      if (isExcludedPixel(r, g, b, luma, sat, hue)) {
        raw[p] = 0;
        excl[p] = 1; // barrier — smoothing won't spread tooth confidence here
      } else {
        raw[p] = toothPixelScore(r, g, b, luma, sat, hue);
        excl[p] = 0;
      }
    }
  }

  // Pre-threshold: zero out low-confidence scores so only real tooth pixels
  // contribute to the smoothed mask.
  for (let p = 0; p < w * h; p++) if (raw[p] < 0.15) raw[p] = 0;

  // Smooth tooth mask (feathering, sigma ≈ 2px).
  const toothMask = smoothMask(raw, w, h, 2, 3);
  // Dilate the exclusion barrier (max filter, radius 2). Dilation — unlike
  // Gaussian smoothing — preserves 1.0 at small spots (braces brackets,
  // glare) so they stay fully excluded, while extending the gum/lip barrier
  // 2px into the tooth area to block feathering bleed.
  const exclDilated = dilateMask(excl, w, h, 2);

  // Final mask = tooth_mask * (1 - exclusion). The exclusion barrier prevents
  // smoothing from bleeding tooth confidence into gums, lips, and metal.
  const mask = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) {
    mask[p] = clamp01(toothMask[p]) * (1 - exclDilated[p]);
  }

  // Contrast curve: clean up weak signal, keep soft feathered edges.
  for (let p = 0; p < mask.length; p++) {
    mask[p] = clamp01((mask[p] - 0.06) / 0.34);
  }
  return mask;
}

// ─────────────────────────────────────────────────────────────────────────
// PART 2 — TARGET-SHADE-DRIVEN WHITENING
//
// The shift is computed from the measured average tooth LAB to the TARGET
// VITA shade's LAB. L* is shifted uniformly (preserves 3D structure). Chroma
// (b*, a*) is reduced proportionally (stains removed where worst). Highlights
// are capped so glare never blows out.
// ─────────────────────────────────────────────────────────────────────────

// Measure the average LAB of the masked tooth region (weighted by mask).
export function measureAverageToothLab(data, mask, w, h) {
  let wSum = 0, LSum = 0, aSum = 0, bSum = 0;
  for (let p = 0; p < w * h; p++) {
    const m = mask[p];
    if (m <= 0.05) continue;
    const i = p * 4;
    const { L, a, b } = rgbToLab(data[i], data[i + 1], data[i + 2]);
    wSum += m;
    LSum += L * m;
    aSum += a * m;
    bSum += b * m;
  }
  if (wSum < 1) return null;
  return { L: LSum / wSum, a: aSum / wSum, b: bSum / wSum };
}

// Look up a VITA shade's LAB from the atlas.
export function targetLabForShade(shadeCode) {
  if (!shadeCode) return null;
  const entry = VITA_ATLAS.find((s) => s.code === shadeCode.toUpperCase());
  return entry ? { L: entry.L, a: entry.a, b: entry.b } : null;
}

// Apply the whitening shift. Modifies `data` in place.
//   • L* shift: uniform (all pixels move by the same delta) → preserves
//     grooves, per-tooth shading, translucency, interproximal shadows.
//   • b* cut: proportional (more-yellow pixels get more reduction) → removes
//     stains where they're worst. Floor at b* ≈ 2 keeps natural ivory warmth.
//   • a* cut: proportional (more-red pixels get more reduction) → removes
//     brown stains. Floor at a* ≈ 0 prevents green overshoot.
//   • Highlight cap: bright pixels (L > 85) get progressively less L* lift so
//     glare never blows out to pure white.
export function whitenToTarget(data, mask, w, h, { targetLab, intensity = 60 }) {
  const currentLab = measureAverageToothLab(data, mask, w, h);
  if (!currentLab || !targetLab) return data;

  const t = clamp01(intensity / 100);
  // Delta from current average to target.
  const dL = targetLab.L - currentLab.L;
  const da = targetLab.a - currentLab.a;
  const db = targetLab.b - currentLab.b;

  // L* shift: applied uniformly (preserves structure). Factor 1.15 compensates
  // for the mask weight (~0.75 average) and highlight cap reducing the
  // effective shift, so the average still reaches the target.
  const lShift = dL * t * 1.15;
  // b* reduction: proportional (more-yellow pixels get more). Factor 1.0.
  const bShift = db * t * 1.0; // negative (target is less yellow)
  // a* reduction: proportional. Factor 0.80.
  const aShift = da * t * 0.80;

  for (let p = 0; p < w * h; p++) {
    const m = mask[p];
    if (m <= 0.01) continue; // outside feathered mask — untouched
    const i = p * 4;
    const { L, a, b: bl } = rgbToLab(data[i], data[i + 1], data[i + 2]);

    // HIGHLIGHT CAP: bright pixels get progressively less L* lift.
    const highlightWeight = L > 85 ? clamp01((93 - L) / 8) : 1;
    const newL = L + lShift * m * highlightWeight;

    // b* (yellow) reduction — proportional to yellowness. Highlight weight
    // (hw) ensures specular highlights keep their chroma, not just their L*.
    const yellowNess = clamp01(bl / 25);
    const bCut = bShift * m * highlightWeight * (0.40 + 0.60 * yellowNess);
    const newB = Math.max(2, bl + bCut);

    // a* (red/brown) reduction — proportional to redness.
    const redNess = clamp01(a / 15);
    const aCut = aShift * m * highlightWeight * (0.30 + 0.70 * redNess);
    const newA = Math.max(0, a + aCut);

    const [nr, ng, nb] = labToRgb(newL, newA, newB);
    data[i] = clamp(nr);
    data[i + 1] = clamp(ng);
    data[i + 2] = clamp(nb);
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────────────
// PART 3 — SHADE VERIFICATION
//
// After whitening, re-measure the output and match against the VITA atlas.
// Returns whether the measured shade is within 1 step of the target.
// ─────────────────────────────────────────────────────────────────────────

export function verifyShade(data, mask, w, h, targetShadeCode) {
  const lab = measureAverageToothLab(data, mask, w, h);
  if (!lab) return { pass: false, measured: null, target: targetShadeCode, steps: 99 };
  const match = matchShade(lab);
  if (!match) return { pass: false, measured: null, target: targetShadeCode, steps: 99 };
  const measuredCode = match.code;
  const targetIdx = shadeIndex(targetShadeCode);
  const measuredIdx = shadeIndex(measuredCode);
  if (targetIdx < 0 || measuredIdx < 0) return { pass: false, measured: measuredCode, target: targetShadeCode, steps: 99 };
  const steps = Math.abs(targetIdx - measuredIdx);
  return { pass: steps <= 1, measured: measuredCode, target: targetShadeCode, steps, lab };
}

// Correction pass: apply the residual LAB delta directly (uniform shift,
// boosted by 1/avgMaskWeight to compensate for the feather). Used after the
// first whitening pass lands short of the target — the residual is small so
// the correction is a fine-tune, not a re-whitening.
function applyCorrection(data, mask, w, h, { dL, da, db }) {
  let mSum = 0, count = 0;
  for (let p = 0; p < w * h; p++) {
    if (mask[p] > 0.01) { mSum += mask[p]; count++; }
  }
  const avgM = count > 0 ? mSum / count : 1;
  const boost = 1 / Math.max(0.3, avgM);

  for (let p = 0; p < w * h; p++) {
    const m = mask[p];
    if (m <= 0.01) continue;
    const i = p * 4;
    const { L, a, b: bl } = rgbToLab(data[i], data[i + 1], data[i + 2]);
    const hw = L > 85 ? clamp01((93 - L) / 8) : 1;
    const newL = L + dL * boost * m * hw;
    const newA = a + da * boost * m * hw;
    const newB = bl + db * boost * m * hw;
    const [nr, ng, nb] = labToRgb(newL, newA, newB);
    data[i] = clamp(nr);
    data[i + 1] = clamp(ng);
    data[i + 2] = clamp(nb);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// FULL PIPELINE — mask → whiten → verify → recalibrate
// ─────────────────────────────────────────────────────────────────────────

function bboxToRoi(bbox, w, h, pad = 0.1) {
  if (!bbox || typeof bbox.x !== 'number') return null;
  const px = pad * w, py = pad * h;
  return {
    x0: Math.max(0, bbox.x * w - px),
    y0: Math.max(0, bbox.y * h - py),
    x1: Math.min(w, (bbox.x + bbox.width) * w + px),
    y1: Math.min(h, (bbox.y + bbox.height) * h + py),
  };
}

// Apply surgical whitening with a verification loop. Up to 3 passes:
//   1. Apply with the given intensity.
//   2. Measure the output shade.
//   3. If within 1 step of target → done. If off, adjust intensity and retry.
// The data is modified in place; a backup is kept so retries start clean.
export function applySurgicalWhitening(imageData, { targetShadeCode, intensity = 60, smileBbox = null } = {}) {
  const { width: w, height: h } = imageData;
  const roi = bboxToRoi(smileBbox, w, h);

  // Build the surgical mask.
  const mask = buildSurgicalMask(imageData.data, w, h, roi);
  let covered = 0;
  for (let p = 0; p < mask.length; p++) if (mask[p] > 0.05) covered++;
  if (covered < w * h * 0.003) return imageData; // not enough teeth — skip

  // Resolve the target LAB.
  const targetLab = targetLabForShade(targetShadeCode);
  if (!targetLab) return imageData;

  // Keep a backup of the original pixel data so retries start clean.
  const originalData = new Uint8ClampedArray(imageData.data);

  let currentIntensity = intensity;
  let lastVerification = null;

  for (let iter = 0; iter < 3; iter++) {
    // Restore original data for this pass (so retries don't compound).
    imageData.data.set(originalData);

    whitenToTarget(imageData.data, mask, w, h, { targetLab, intensity: currentIntensity });
    lastVerification = verifyShade(imageData.data, mask, w, h, targetShadeCode);

    if (lastVerification.pass) break;

    // Correction pass: apply the residual delta directly. The residual is
    // small (the first pass got most of the way), so this is a fine-tune.
    if (lastVerification.lab) {
      const resL = targetLab.L - lastVerification.lab.L;
      const resA = targetLab.a - lastVerification.lab.a;
      const resB = targetLab.b - lastVerification.lab.b;
      applyCorrection(imageData.data, mask, w, h, { dL: resL, da: resA, db: resB });
      lastVerification = verifyShade(imageData.data, mask, w, h, targetShadeCode);
      if (lastVerification.pass) break;
    }

    if (iter === 2) break;

    // Still off — boost intensity for the next full retry.
    const targetIdx = shadeIndex(targetShadeCode);
    const measuredIdx = shadeIndex(lastVerification.measured);
    if (targetIdx >= 0 && measuredIdx >= 0) {
      const off = measuredIdx - targetIdx; // positive = measured is darker
      currentIntensity = clamp(currentIntensity + off * 20, 30, 100);
    }
  }

  return imageData;
}

// ─────────────────────────────────────────────────────────────────────────
// UI HELPER — load image URL → run pipeline → return processed dataURL
// ─────────────────────────────────────────────────────────────────────────

export function processSurgicalPreview(url, { targetShadeCode, intensity = 60, smileBbox = null, maxDim = 1000 } = {}) {
  const isData = url.startsWith('data:');
  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });

  const srcPromise = isData
    ? Promise.resolve(url)
    : fetch(url, { mode: 'cors' })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.blob();
        })
        .then(URL.createObjectURL);

  return srcPromise.then((src) =>
    loadImage(src).then((img) => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      applySurgicalWhitening(imageData, { targetShadeCode, intensity, smileBbox });
      ctx.putImageData(imageData, 0, 0);
      if (!isData) URL.revokeObjectURL(src);
      return canvas.toDataURL('image/jpeg', 0.92);
    })
  );
}