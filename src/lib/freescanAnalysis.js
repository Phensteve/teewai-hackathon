// freescanAnalysis — client-side accuracy heuristics for the frictionless scan.
//
// The full AI scan white-balances against a physical reference card. The
// frictionless scan has no card, so ambient lighting (warm incandescent, cool
// LED) shifts the tooth's raw RGB and corrupts the CIEDE2000 shade match.
//
// This module implements Step 1 of the optimized AI engine prompt —
// "Calibration: digitally normalize the pixel arrays using the sclera (whites
// of the eyes) or a neutral facial highlight as a white-balance baseline" —
// in pure JavaScript, so the free scan's shade match is accurate even without
// a reference card.
//
// It also adds a gum-health indicator (Step 4: gingival health) by sampling
// the gum zone for erythema (redness), giving the free scan broader clinical
// scope beyond just whiteness.

const SAMPLE = 48;

function makeCanvas(w, h) {
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

// ─────────────────────────────────────────────────────────────────────────
// SCLERA / NEUTRAL-HIGHLIGHT WHITE BALANCE
// Finds the brightest near-neutral pixels in the image — the sclera (whites
// of the eyes), white clothing, or specular highlights — and uses their
// average RGB as a white-balance reference. Under neutral light these read
// R≈G≈B; under warm light R>B; under cool light B>R. The existing
// whiteBalanceTooth() then cancels the cast before CIEDE2000 matching.
//
// Heuristic, not face detection: we don't need to find the eyes precisely.
// We just need the brightest neutral pixels, which are overwhelmingly neutral
// references in a selfie. False positives (a bright yellow shirt) are filtered
// by the saturation and yellow-index gates.
// ─────────────────────────────────────────────────────────────────────────
export function findWhiteReference(source, size = SAMPLE) {
  try {
    const canvas = makeCanvas(size, size);
    const c = canvas.getContext('2d', { willReadFrequently: true });
    c.drawImage(source, 0, 0, size, size);
    const { data } = c.getImageData(0, 0, size, size);

    let rSum = 0, gSum = 0, bSum = 0, count = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;

      // Must be bright (sclera and highlights are the brightest neutral areas)
      if (luma < 175) continue;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;

      // Must be near-neutral (low saturation) — excludes skin, lips, clothes
      if (sat > 0.12) continue;

      // Must not be yellowish — excludes warm-light false positives and teeth
      // (teeth themselves are ivory, not neutral white, so they're excluded)
      if (b < (r + g) / 2 - 8) continue;

      // Must not be reddish — excludes gum reflections and flushed skin
      if (r > b * 1.15) continue;

      rSum += r; gSum += g; bSum += b; count++;
    }

    if (count < 3) return null; // not enough neutral pixels to calibrate

    const rgb = {
      r: Math.round(rSum / count),
      g: Math.round(gSum / count),
      b: Math.round(bSum / count),
    };

    // Confidence: more neutral pixels = more reliable reference.
    // 5+ pixels is a solid baseline; 20+ is excellent.
    const confidence = Math.min(1, count / 20);

    // How far from neutral is the reference? A large R-B gap means a strong
    // ambient cast that we're correcting — worth reporting to the user.
    const castDelta = Math.abs(rgb.r - rgb.b);

    return { rgb, confidence, castDelta, pixelCount: count };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// GUM HEALTH INDICATOR (erythema detection)
// Samples the gum zone (below the tooth centroid) and measures redness.
// Healthy gums are coral pink (moderate R, low B, low saturation). Inflamed
// gums are red (high R relative to B, higher saturation). This is a screening
// heuristic — not a diagnosis — that gives the free scan broader clinical
// scope (Step 4 of the optimized prompt: gingival health indicators).
//
// Returns a 0-100 gum health score + a level (excellent/good/fair/poor).
// ─────────────────────────────────────────────────────────────────────────
export function estimateGumHealth(source, toothCentroidY = 0.5, size = SAMPLE) {
  try {
    const canvas = makeCanvas(size, size);
    const c = canvas.getContext('2d', { willReadFrequently: true });
    c.drawImage(source, 0, 0, size, size);
    const { data } = c.getImageData(0, 0, size, size);

    // The gum zone is below the teeth. If teeth are centered at 50% of the
    // frame, gums are roughly 55-80% (between teeth and chin). We sample a
    // band starting just below the tooth centroid.
    const gumStartY = Math.max(0, Math.floor((toothCentroidY + 0.08) * size));
    const gumEndY = Math.min(size, Math.floor((toothCentroidY + 0.28) * size));

    let rednessSum = 0, count = 0;
    let rSum = 0, gSum = 0, bSum = 0;

    for (let y = gumStartY; y < gumEndY; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;

        // Gum pixels: reddish-pink, moderate brightness (not too dark, not white)
        if (luma < 50 || luma > 220) continue;
        // Must be reddish (R > B by a meaningful margin)
        if (r <= b * 1.1) continue;
        // Exclude pure lip red (too saturated/dark)
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;
        if (sat > 0.55) continue;

        // Redness index: how much R exceeds B, normalized.
        // Pink healthy gum: R-B ≈ 30-60. Red inflamed: R-B ≈ 80-120+.
        const redness = (r - b) / Math.max(1, r);
        rednessSum += redness;
        rSum += r; gSum += g; bSum += b;
        count++;
      }
    }

    if (count < 3) return null;

    const avgRedness = rednessSum / count;
    // Map redness to a 0-100 gum health score.
    // avgRedness ~0.15 → excellent (pink), ~0.25 → good, ~0.35 → fair, ~0.45+ → poor
    const score = Math.max(0, Math.min(100, Math.round(100 - (avgRedness - 0.12) * 300)));

    let level;
    if (score >= 80) level = 'excellent';
    else if (score >= 60) level = 'good';
    else if (score >= 40) level = 'fair';
    else level = 'poor';

    return {
      score,
      level,
      redness: Math.round(avgRedness * 100) / 100,
      avgRgb: { r: Math.round(rSum / count), g: Math.round(gSum / count), b: Math.round(bSum / count) },
      pixelCount: count,
    };
  } catch {
    return null;
  }
}