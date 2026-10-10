// Violet-cast detector for color correcting products (purple whitening strips
// and serums like Hismile V34). These products work purely by optical color
// correction: violet pigment sits opposite yellow on the color wheel, so a
// purple film over teeth cancels yellow undertones to the eye. The tooth
// underneath is unchanged. teewai is about true shade readings, so we detect
// the trick and flag the scan so it can't corrupt baseline or progress data.
//
// Algorithm: sample the image at 64x64, identify tooth-region candidates
// (bright, non-reddish pixels), and measure what fraction have an unnatural
// violet hue (250-290 degrees) with saturation clearly above healthy enamel.
// Normal enamel is near-neutral (low saturation, hue in the yellow-red range).
// A purple strip creates a uniform violet tint that does not occur in healthy
// enamel under any normal lighting.
//
// False-positive calibration:
// - Warm indoor lighting shifts hue toward orange (0-60 deg), never violet.
// - Shadows desaturate and darken (excluded by luma floor).
// - Braces metal reflects blue-grey (200-240 deg), outside the violet band.
// - The tight 250-290 deg hue window + saturation floor avoids all three.

const SAMPLE = 64;
const LUMA_MIN = 100;
const VIOLET_HUE_MIN = 250;
const VIOLET_HUE_MAX = 290;
const VIOLET_SAT_MIN = 0.18;
const VIOLET_RATIO_THRESHOLD = 0.12;
const VIOLET_AVG_SAT_THRESHOLD = 0.22;

function makeCanvas(w, h) {
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
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
  return { h, s, v: max };
}

// Returns { detected, confidence, violetRatio, avgVioletSat }.
// confidence is 0-1, only meaningful when detected is true.
export function detectVioletCast(source, size = SAMPLE) {
  const result = { detected: false, confidence: 0, violetRatio: 0, avgVioletSat: 0 };
  try {
    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    let toothRegionCount = 0;
    let violetCount = 0;
    let violetSatSum = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luma <= LUMA_MIN) continue;

      // Exclude reddish pixels (gums, lips, tongue)
      if (r > 150 && b < r * 0.7) continue;

      toothRegionCount++;

      const { h, s } = rgbToHsv(r, g, b);
      if (h >= VIOLET_HUE_MIN && h <= VIOLET_HUE_MAX && s >= VIOLET_SAT_MIN) {
        violetCount++;
        violetSatSum += s;
      }
    }

    if (toothRegionCount < 20) return result;

    const violetRatio = violetCount / toothRegionCount;
    const avgVioletSat = violetCount > 0 ? violetSatSum / violetCount : 0;

    result.violetRatio = Math.round(violetRatio * 1000) / 1000;
    result.avgVioletSat = Math.round(avgVioletSat * 1000) / 1000;

    if (violetRatio >= VIOLET_RATIO_THRESHOLD && avgVioletSat >= VIOLET_AVG_SAT_THRESHOLD) {
      result.detected = true;
      // Confidence scales with both the fraction of violet pixels and how
      // saturated they are. A strong, uniform cast scores near 1.0.
      const ratioScore = Math.min(1, violetRatio / 0.35);
      const satScore = Math.min(1, (avgVioletSat - VIOLET_AVG_SAT_THRESHOLD) / 0.3);
      result.confidence = Math.round(Math.min(1, (ratioScore * 0.6 + satScore * 0.4)) * 100) / 100;
    }

    return result;
  } catch {
    return result;
  }
}

// Convenience: check if a scan record is flagged.
export function isColorCorrectingFlagged(scan) {
  return !!scan?.color_correcting_product_detected;
}