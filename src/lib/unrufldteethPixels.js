// unrufldteethPixels — the shared canvas sampling core for unrufldteeth™.
//
// preAnalyze() (pre-flight, runs on a File before upload) and fastEstimate()
// (instant whiteness reading, runs on a URL after upload) previously each
// carried their own near-identical pixel loop with slightly different tooth
// thresholds — meaning the two paths could disagree about what counted as a
// tooth. This module owns that math ONCE, so both callers share a single,
// consistent definition of a tooth pixel, and there is one place to tune.
//
// Efficiency: samples a fixed 48×48 downscale (2,304 px) regardless of source
// resolution, uses OffscreenCanvas where available, and computes every
// statistic in a single pass — brightness, tooth ratio, yellow index and the
// tooth centroid all come out of one traversal.

const SAMPLE = 48;

// A tooth pixel is bright, low-saturation and not reddish (which excludes gums,
// lips and tongue). Single shared definition for the whole engine.
const TOOTH_LUMA_MIN = 120;
const TOOTH_SAT_MAX = 0.32;

function makeCanvas(w, h) {
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

// Single-pass sampler. Accepts anything drawImage takes (ImageBitmap, Image).
// Returns every statistic the engine needs from one traversal.
export function sampleToothPixels(source, size = SAMPLE) {
  const canvas = makeCanvas(size, size);
  const c = canvas.getContext('2d', { willReadFrequently: true });
  c.drawImage(source, 0, 0, size, size);
  const { data } = c.getImageData(0, 0, size, size);

  const total = size * size;
  let lumaSum = 0, toothCount = 0, toothLumaSum = 0, yellowSum = 0, toothSumX = 0, toothSumY = 0;
  // Average tooth RGB — fed to the CIELAB colorimetry engine for the
  // deterministic shade match (the dual-path consensus moat). Accumulated
  // per-channel so a single pass yields both the heuristic stats and the
  // raw color the spectrophotometer path needs.
  let toothRSum = 0, toothGSum = 0, toothBSum = 0;

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    lumaSum += luma;

    if (luma <= TOOTH_LUMA_MIN) continue;
    const max = r > g ? (r > b ? r : b) : (g > b ? g : b);
    const min = r < g ? (r < b ? r : b) : (g < b ? g : b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (sat >= TOOTH_SAT_MAX) continue;
    if (r > 150 && b < r * 0.7) continue; // reddish → gum / lip / tongue

    toothCount++;
    toothLumaSum += luma;
    yellowSum += Math.max(0, (r + g) / 2 - b);
    toothRSum += r; toothGSum += g; toothBSum += b;
    toothSumX += p % size;
    toothSumY += (p / size) | 0;
  }

  return {
    total,
    brightness: Math.round(lumaSum / total),
    toothCount,
    toothRatio: toothCount / total,
    avgToothLuma: toothCount ? toothLumaSum / toothCount : null,
    avgYellow: toothCount ? yellowSum / toothCount : null,
    avgToothRgb: toothCount
      ? { r: Math.round(toothRSum / toothCount), g: Math.round(toothGSum / toothCount), b: Math.round(toothBSum / toothCount) }
      : null,
    centroidX: toothCount ? (toothSumX / toothCount) / size : null,
    centroidY: toothCount ? (toothSumY / toothCount) / size : null,
  };
}

// Yellow index 0-100 — how yellow the enamel reads. The natural-teeth baseline
// band is 5-35 (healthy ivory), so this is NOT a stain penalty on its own.
export const yellowIndexFrom = (avgYellow) =>
  avgYellow == null ? null : Math.max(0, Math.min(100, Math.round(avgYellow * 1.5)));

// Camera angle hint from where the tooth mass sits in the frame.
export function angleHintFrom(centroidX, centroidY) {
  if (centroidX == null || centroidY == null) return null;
  if (centroidX < 0.4) return 'left';
  if (centroidX > 0.6) return 'right';
  if (centroidY < 0.4) return 'lower';
  if (centroidY > 0.6) return 'top';
  return 'front';
}

// Load a URL into an Image for sampling.
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });
}