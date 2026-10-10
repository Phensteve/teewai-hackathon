// teewai's non-AI lightweight computer vision module for dental image analysis.
//
// Pure JavaScript — no AI, no external dependencies, no server calls.
// Runs in <100ms per image via canvas pixel sampling. Used:
//   1. BEFORE the scan: pre-flight check (is this a dental photo? is it usable?)
//   2. DURING full scan: angle verification (does this photo match the requested angle?)
//   3. AFTER the scan: natural teeth baseline recognition (is the yellow hue natural?)
//
// All functions are pure (no side effects) and work with both File objects and
// image URLs. They degrade gracefully — if canvas is unavailable, they return
// null/defaults rather than throwing.

const SAMPLE_SIZE = 128;

// ─────────────────────────────────────────────────────────────────────────
// CORE: Load an image file/URL into pixel data at a fixed sample size
// ─────────────────────────────────────────────────────────────────────────
async function loadImageData(fileOrUrl) {
  const url = fileOrUrl instanceof File ? URL.createObjectURL(fileOrUrl) : fileOrUrl;
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.crossOrigin = 'anonymous';
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const imageData = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    return { data: imageData.data, width: SAMPLE_SIZE, height: SAMPLE_SIZE };
  } finally {
    if (fileOrUrl instanceof File) URL.revokeObjectURL(url);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// PIXEL CLASSIFIERS
// ─────────────────────────────────────────────────────────────────────────

// Tooth enamel: bright, low saturation, not pink/red (gum)
function isToothPixel(r, g, b) {
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  const isReddish = r > 150 && b < r * 0.7;
  return luma > 120 && sat < 0.32 && !isReddish;
}

// Gum tissue: pink/red — R > G > B, moderate brightness
function isGumPixel(r, g, b) {
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  return r > 140 && g > 80 && b < r * 0.75 && luma > 90 && luma < 220 && r > g + 20;
}

// ─────────────────────────────────────────────────────────────────────────
// ANALYZE PHOTO — comprehensive non-AI dental image analysis
// ─────────────────────────────────────────────────────────────────────────
export async function analyzePhoto(fileOrUrl) {
  const ctx = {
    usable: true,
    notes: [],
    brightness: null,
    toothRatio: null,
    gumRatio: null,
    centroidX: null,
    centroidY: null,
    gumTopRatio: null,
    gumBottomRatio: null,
    yellowIndex: null,
    isNaturalTeeth: null,
  };
  try {
    const { data, width, height } = await loadImageData(fileOrUrl);
    let lumaSum = 0;
    let rSum = 0, gSum = 0, bSum = 0;
    let leftLumaSum = 0, rightLumaSum = 0;
    let toothCount = 0;
    let gumCount = 0;
    let toothSumX = 0, toothSumY = 0;
    let gumTopCount = 0, gumBottomCount = 0;
    let yellowSum = 0;
    const total = width * height;
    const halfX = width / 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        lumaSum += luma;
        rSum += r; gSum += g; bSum += b;
        if (x < halfX) leftLumaSum += luma; else rightLumaSum += luma;

        if (isToothPixel(r, g, b)) {
          toothCount++;
          toothSumX += x;
          toothSumY += y;
          yellowSum += Math.max(0, (r + g) / 2 - b);
        }
        if (isGumPixel(r, g, b)) {
          gumCount++;
          if (y < height / 2) gumTopCount++;
          else gumBottomCount++;
        }
      }
    }

    ctx.brightness = Math.round(lumaSum / total);
    ctx.toothRatio = toothCount / total;
    ctx.gumRatio = gumCount / total;

    // Lighting quality — the biggest cause of shade-read inaccuracy is NOT
    // brightness alone but color temperature (warm/cool cast) and unevenness.
    // These are measured from the raw color (NO grayscale / normalization —
    // that was a dead end that inflated whiteness scores). The assessment only
    // WARNS the user; it never alters the photo or the score.
    const avgR = rSum / total, avgB = bSum / total;
    const colorCast = avgR - avgB; // +ve = warm (yellow/red), -ve = cool (blue)
    const leftLuma = leftLumaSum / (total / 2);
    const rightLuma = rightLumaSum / (total / 2);
    const uniformity = Math.max(0, 1 - Math.abs(leftLuma - rightLuma) / 128);
    ctx.colorCast = Math.round(colorCast);
    ctx.uniformity = Math.round(uniformity * 100) / 100;
    if (colorCast > 28) { ctx.colorTemp = 'warm'; ctx.notes.push('warm_cast'); }
    else if (colorCast < -8) { ctx.colorTemp = 'cool'; ctx.notes.push('cool_cast'); }
    else ctx.colorTemp = 'neutral';
    if (uniformity < 0.72) ctx.notes.push('uneven_lighting');
    if (ctx.brightness >= 45 && ctx.brightness < 62) ctx.notes.push('dim_lighting');

    // Overall lighting quality: poor = a retake meaningfully improves accuracy.
    const poorLighting =
      ctx.notes.includes('warm_cast') || ctx.notes.includes('cool_cast') ||
      ctx.notes.includes('uneven_lighting') || ctx.notes.includes('dim_lighting') ||
      ctx.notes.includes('overexposed');
    const fairLighting = (ctx.brightness >= 62 && ctx.brightness < 78) || uniformity < 0.85;
    ctx.lightingQuality = poorLighting ? 'poor' : fairLighting ? 'fair' : 'good';

    if (toothCount > 20) {
      ctx.centroidX = (toothSumX / toothCount) / width;
      ctx.centroidY = (toothSumY / toothCount) / height;
    }

    ctx.gumTopRatio = gumCount > 0 ? gumTopCount / gumCount : 0;
    ctx.gumBottomRatio = gumCount > 0 ? gumBottomCount / gumCount : 0;

    if (toothCount > 20) {
      const avgYellow = yellowSum / toothCount;
      ctx.yellowIndex = Math.max(0, Math.min(100, Math.round(avgYellow * 1.5)));
      ctx.isNaturalTeeth = ctx.yellowIndex >= 5 && ctx.yellowIndex <= 35;
    }

    if (ctx.brightness < 45) { ctx.notes.push('low_light'); ctx.usable = false; }
    if (ctx.brightness > 235) { ctx.notes.push('overexposed'); ctx.usable = false; }
    if (ctx.toothRatio < 0.02) { ctx.notes.push('no_teeth'); ctx.usable = false; }
  } catch {
    ctx.usable = false;
    ctx.notes.push('analysis_failed');
  }
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────
// CLASSIFY ANGLE — determine which dental angle a photo represents
// Returns { angle: 'front'|'top'|'lower'|'left'|'right', confidence: 0-1 }
// ─────────────────────────────────────────────────────────────────────────
export function classifyAngle(analysis) {
  if (!analysis || !analysis.toothRatio || analysis.toothRatio < 0.02) {
    return { angle: null, confidence: 0 };
  }

  const cx = analysis.centroidX ?? 0.5;
  const cy = analysis.centroidY ?? 0.5;
  const gumTop = analysis.gumTopRatio ?? 0;
  const gumBottom = analysis.gumBottomRatio ?? 0;
  const toothRatio = analysis.toothRatio;

  const scores = { front: 0, top: 0, lower: 0, left: 0, right: 0 };

  // Front: teeth centered, both gums visible
  const centerScore = 1 - Math.abs(cx - 0.5) * 2;
  const verticalCenter = 1 - Math.abs(cy - 0.5) * 2;
  scores.front = centerScore * 0.5 + verticalCenter * 0.3 + (gumTop > 0.15 && gumBottom > 0.15 ? 0.2 : 0);

  // Top: teeth in lower half (user tilts head back), gums above teeth
  scores.top = (cy > 0.5 ? (cy - 0.5) * 2 : 0) * 0.4 + (gumTop > gumBottom ? 0.3 : 0) + (toothRatio > 0.08 ? 0.2 : 0);

  // Lower: teeth in upper half (camera above mouth), gums below teeth
  scores.lower = (cy < 0.5 ? (0.5 - cy) * 2 : 0) * 0.4 + (gumBottom > gumTop ? 0.3 : 0) + (toothRatio > 0.08 ? 0.2 : 0);

  // Left: teeth shifted left
  scores.left = (cx < 0.42 ? (0.42 - cx) * 2.5 : 0) * 0.6 + (toothRatio > 0.05 ? 0.2 : 0);

  // Right: teeth shifted right
  scores.right = (cx > 0.58 ? (cx - 0.58) * 2.5 : 0) * 0.6 + (toothRatio > 0.05 ? 0.2 : 0);

  let bestAngle = 'front';
  let bestScore = 0;
  for (const [angle, score] of Object.entries(scores)) {
    if (score > bestScore) { bestScore = score; bestAngle = angle; }
  }

  const sorted = Object.values(scores).sort((a, b) => b - a);
  const confidence = sorted[0] > 0 ? Math.min(1, sorted[0] / (sorted[0] + sorted[1] + 0.001)) : 0;

  return { angle: bestAngle, confidence: Math.round(confidence * 100) / 100 };
}

// ─────────────────────────────────────────────────────────────────────────
// CHECK ANGLE MATCH — verify a photo matches the expected angle
// Lenient: only reject when clearly wrong with high confidence.
// "Don't hallucinate and don't reject a correct image" — if uncertain, accept.
// ─────────────────────────────────────────────────────────────────────────
export async function checkAngleMatch(fileOrUrl, expectedAngle) {
  const analysis = await analyzePhoto(fileOrUrl);
  // Bright-pixel centroids cannot establish anatomical laterality or whether
  // upper/lower surfaces are shown. Do not label a valid angle 'wrong' on this
  // heuristic alone; retain it only as an uncertain coaching hint.
  return { match: true, uncertain: true, confidence: 0, detectedAngle: null, analysis };
}

// Anatomical angle verification requires a validated landmark detector or
// professional review; classifyAngle remains available as an advisory hint.

// ─────────────────────────────────────────────────────────────────────────
// RECOGNIZE NATURAL TEETH — detect if teeth have a natural yellow baseline
// Natural teeth are ivory/off-white (VITA A2-A3), NOT pure white.
// ─────────────────────────────────────────────────────────────────────────
export function recognizeNaturalTeeth(analysis) {
  if (!analysis || analysis.yellowIndex == null) {
    return { isNatural: false, yellowIndex: null, baseline: 'unknown' };
  }

  const yi = analysis.yellowIndex;
  // VITA shade baseline:
  // 0-5: bleached/pure white (A1, 0M1)
  // 5-20: natural white (A1-A2) — most common healthy smile
  // 20-35: natural ivory (A2-A3) — natural yellow teeth, NOT stained
  // 35-50: mild staining (A3.5-A4)
  // 50+: moderate to heavy staining (B4, C3, C4)
  let baseline;
  if (yi < 5) baseline = 'bleached';
  else if (yi < 20) baseline = 'natural_white';
  else if (yi < 35) baseline = 'natural_ivory';
  else if (yi < 50) baseline = 'mild_staining';
  else baseline = 'heavy_staining';

  return { isNatural: yi >= 5 && yi <= 35, yellowIndex: yi, baseline };
}

// ─────────────────────────────────────────────────────────────────────────
// NATURAL TEETH BASELINE — the reference profile for healthy natural teeth
// ─────────────────────────────────────────────────────────────────────────
export const NATURAL_TEETH_BASELINE = {
  shade: 'A2-A3',
  yellowIndexRange: [5, 35],
  luminanceRange: [55, 85],
  description: 'Natural light ivory/off-white enamel with well-aligned front teeth, low to moderate visible surface wear, and normal visual gum line appearance.',
  features: {
    enamel_shade: 'Natural light ivory/off-white',
    front_alignment: 'Well-aligned with natural spacing',
    visible_wear: 'Low to moderate visible surface wear',
    gum_line: 'Normal visual appearance',
  },
};

// ─────────────────────────────────────────────────────────────────────────
// ASSESS LIGHTING — user-facing lighting verdict from an analyzePhoto result.
// Returns a quality tier, the detected color temperature, a plain-language
// message and whether a retake would meaningfully improve shade accuracy.
// This NEVER modifies the photo — it only advises (grayscale normalization
// was a dead end that inflated whiteness scores, so we warn instead).
// ─────────────────────────────────────────────────────────────────────────
export function assessLighting(analysis) {
  if (!analysis || analysis.brightness == null) return { quality: 'unknown', message: 'Lighting could not be assessed.', retake: false };
  // A red/blue average is not an illuminant measurement: gums, skin and
  // naturally ivory enamel change it. Never reject solely for scene color.
  const retake = analysis.brightness < 45 || analysis.brightness > 235;
  const fair = analysis.brightness < 78 || analysis.uniformity < .72;
  return {
    quality: retake ? 'poor' : fair ? 'fair' : 'good', colorTemp: 'unknown', uniformity: analysis.uniformity,
    retake,
    message: retake ? 'The photo is too dark or washed out. Retake with soft, frontal lighting.' : fair ? 'Use even light across your teeth; shade remains an estimate without a known reference.' : 'Exposure looks usable. Tooth shade remains a photo estimate.',
  };
}