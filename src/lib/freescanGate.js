// freescanGate — deterministic teeth-presence and quality gate for the free scan.
//
// Runs BEFORE scoring to reject non-teeth images, empty frames, extreme blur,
// and photos where the tooth region is too small or fragmented. Pure
// client-side computer vision: brightness/value masking, saturation gating,
// connected components, centroid geometry, local-contrast blur detection,
// and tooth-region variance (flat-surface rejection). No LLM, no generative
// AI, no paid API, no network calls.
//
// Also provides computeRobustWhiteness — a white-balanced, trimmed-median
// whiteness score that replaces the raw-luminance fastEstimate score. The
// old score used un-white-balanced average luminance, so the same teeth under
// different lighting got different scores (the before/after brushing inversion).
// The new score white-balances each tooth pixel against a neutral reference
// (or falls back to percentile normalization), then takes a trimmed median
// (rejecting glare and shadow outliers), so repeated scans of the same teeth
// give consistent scores regardless of lighting.

const GATE_SAMPLE = 96;

// Tooth candidate thresholds — slightly more permissive than the scoring
// sampler so the gate doesn't reject valid teeth that are a bit darker or
// more saturated than the ideal.
const TOOTH_LUMA_MIN = 105;
const TOOTH_SAT_MAX = 0.38;
const TOOTH_REGION_VARIANCE_MIN = 4;   // flat surfaces (walls, paper) have std < 4
const BLUR_LAPLACIAN_MIN = 2.5;       // below this = extreme blur
const TOOTH_RATIO_MIN = 0.025;        // too few bright low-sat pixels = no teeth
const LARGEST_COMPONENT_RATIO_MIN = 0.25; // largest blob < 25% of tooth pixels = fragmented
const CONFIDENCE_THRESHOLD = 0.35;    // below this = don't show a score
// Oral-context ring — real teeth are surrounded by gums (pink), lips (red),
// or the dark mouth interior. A standalone bright object (wall, paper, sky,
// white clothing) is surrounded by more of the same, so its ring has little
// to no oral color. This rejects "random image" false positives that pass the
// brightness/saturation tooth heuristic.
const ORAL_CONTEXT_MIN = 0.12;
const RING_MIN_FOR_CHECK = 24;

function makeCanvas(w, h) {
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function isToothCandidate(r, g, b) {
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  if (luma < TOOTH_LUMA_MIN) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  if (sat > TOOTH_SAT_MAX) return false;
  if (r > 150 && b < r * 0.7) return false; // reddish → gum / lip / tongue
  return true;
}

// 4-connected flood fill (iterative DFS) on a binary mask.
// Returns { components, labels } — components sorted by size (largest first),
// each carrying its `label` so the caller can isolate the largest blob's
// pixels and inspect the ring of pixels surrounding it.
function connectedComponents(mask, width, height) {
  const labels = new Int32Array(width * height);
  const components = [];
  let nextLabel = 1;

  for (let start = 0; start < width * height; start++) {
    if (mask[start] === 0 || labels[start] !== 0) continue;

    const stack = [start];
    labels[start] = nextLabel;
    let size = 0, sumX = 0, sumY = 0;

    while (stack.length > 0) {
      const cur = stack.pop();
      const cx = cur % width;
      const cy = (cur / width) | 0;
      size++;
      sumX += cx;
      sumY += cy;

      if (cx > 0) { const n = cur - 1; if (labels[n] === 0 && mask[n]) { labels[n] = nextLabel; stack.push(n); } }
      if (cx < width - 1) { const n = cur + 1; if (labels[n] === 0 && mask[n]) { labels[n] = nextLabel; stack.push(n); } }
      if (cy > 0) { const n = cur - width; if (labels[n] === 0 && mask[n]) { labels[n] = nextLabel; stack.push(n); } }
      if (cy < height - 1) { const n = cur + width; if (labels[n] === 0 && mask[n]) { labels[n] = nextLabel; stack.push(n); } }
    }

    components.push({ label: nextLabel, size, centroidX: sumX / size / width, centroidY: sumY / size / height });
    nextLabel++;
  }

  components.sort((a, b) => b.size - a.size);
  return { components, labels };
}

// Mean absolute Laplacian — high = sharp, low = blurry.
function computeBlurScore(lumaData, width, height) {
  let total = 0, count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const lap = Math.abs(
        4 * lumaData[idx] -
        lumaData[idx - 1] - lumaData[idx + 1] -
        lumaData[idx - width] - lumaData[idx + width]
      );
      total += lap;
      count++;
    }
  }
  return count > 0 ? total / count : 0;
}

// ─────────────────────────────────────────────────────────────────────────
// TEETH-PRESENCE GATE
// Accepts anything drawImage takes (ImageBitmap, Image, canvas).
// Returns { passed, confidence, reason, toothRatio, centroidX, centroidY,
//           blurScore, componentCount, largestComponentRatio, toothPixels }
// toothPixels = { rs, gs, bs, count } — parallel arrays of tooth-pixel RGB
// for the robust whiteness computation (avoids a second canvas pass).
// ─────────────────────────────────────────────────────────────────────────
export function teethPresenceGate(source) {
  const result = {
    passed: false, confidence: 0, reason: '',
    toothRatio: 0, centroidX: 0.5, centroidY: 0.5,
    blurScore: 0, componentCount: 0, largestComponentRatio: 0,
    regionVariance: 0, oralContextRatio: 0,
    toothPixels: { rs: new Uint8Array(0), gs: new Uint8Array(0), bs: new Uint8Array(0), count: 0 },
  };

  try {
    const size = GATE_SAMPLE;
    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    const total = size * size;
    const mask = new Uint8Array(total);
    const lumaData = new Float32Array(total);
    const maxPixels = total;
    const toothRs = new Uint8Array(maxPixels);
    const toothGs = new Uint8Array(maxPixels);
    const toothBs = new Uint8Array(maxPixels);
    let toothCount = 0;
    let lumaSum = 0;

    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      lumaData[p] = luma;
      lumaSum += luma;
      if (isToothCandidate(r, g, b)) {
        mask[p] = 1;
        toothRs[toothCount] = r;
        toothGs[toothCount] = g;
        toothBs[toothCount] = b;
        toothCount++;
      }
    }

    const avgBrightness = lumaSum / total;
    result.toothRatio = toothCount / total;
    result.toothPixels = {
      rs: toothRs.subarray(0, toothCount),
      gs: toothGs.subarray(0, toothCount),
      bs: toothBs.subarray(0, toothCount),
      count: toothCount,
    };

    // 1. Extreme brightness
    if (avgBrightness < 40) { result.reason = 'too_dark'; return result; }
    if (avgBrightness > 245) { result.reason = 'too_bright'; return result; }

    // 2. Tooth ratio
    if (result.toothRatio < TOOTH_RATIO_MIN) { result.reason = 'no_teeth'; return result; }

    // 3. Connected components — teeth form a contiguous region, not scattered noise
    const { components, labels } = connectedComponents(mask, size, size);
    result.componentCount = components.length;
    result.largestComponentRatio = components.length > 0 ? components[0].size / toothCount : 0;
    if (result.largestComponentRatio < LARGEST_COMPONENT_RATIO_MIN) {
      result.reason = 'fragmented';
      return result;
    }

    // 4. Centroid geometry — reject small components stuck in extreme corners
    const largest = components[0];
    result.centroidX = largest.centroidX;
    result.centroidY = largest.centroidY;
    const margin = 0.12;
    if (largest.size < 60 &&
        (largest.centroidX < margin || largest.centroidX > 1 - margin ||
         largest.centroidY < margin || largest.centroidY > 1 - margin)) {
      result.reason = 'off_center';
      return result;
    }

    // 4a. Background rejection — a bright wall, sky or shirt forms a huge blob
    // that runs along the photo edges. Teeth sit inside the frame, framed by
    // lips, so they rarely cover much of the border or most of the image.
    let borderHits = 0;
    const borderTotal = size * 4 - 4;
    for (let k = 0; k < size; k++) {
      if (labels[k] === largest.label) borderHits++;
      if (labels[(size - 1) * size + k] === largest.label) borderHits++;
      if (k > 0 && k < size - 1) {
        if (labels[k * size] === largest.label) borderHits++;
        if (labels[k * size + size - 1] === largest.label) borderHits++;
      }
    }
    if (borderHits / borderTotal > 0.2 || largest.size / total > 0.45) {
      result.reason = 'no_teeth';
      return result;
    }

    // 4b. Oral-context ring — the pixels immediately surrounding the largest
    // tooth blob should be gum (pink/red), lip (red), or the dark mouth
    // interior. A bright object floating in a non-oral scene (wall, paper,
    // sky, clothing) is surrounded by more of the same, so its ring has
    // little oral color → reject as no_teeth. This is the check that stops a
    // random image from being scored as a smile.
    const largestLabel = largest.label;
    let ringCount = 0, oralCount = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const p = y * size + x;
        if (labels[p] === largestLabel) continue;
        let adj = false;
        if (x > 0 && labels[p - 1] === largestLabel) adj = true;
        else if (x < size - 1 && labels[p + 1] === largestLabel) adj = true;
        else if (y > 0 && labels[p - size] === largestLabel) adj = true;
        else if (y < size - 1 && labels[p + size] === largestLabel) adj = true;
        if (!adj) continue;
        ringCount++;
        const i = p * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;
        // Gum / lip: reddish with some saturation (pink coral → red).
        if (r > b * 1.12 && sat > 0.08 && luma > 40 && luma < 235) oralCount++;
        // Mouth interior: dark gap between/behind teeth.
        else if (luma < 60) oralCount++;
      }
    }
    result.oralContextRatio = ringCount > 0 ? oralCount / ringCount : 0;
    if (ringCount >= RING_MIN_FOR_CHECK && result.oralContextRatio < ORAL_CONTEXT_MIN) {
      result.reason = 'no_teeth';
      return result;
    }

    // 5. Blur detection (Laplacian variance on full image)
    result.blurScore = computeBlurScore(lumaData, size, size);
    if (result.blurScore < BLUR_LAPLACIAN_MIN) { result.reason = 'blurry'; return result; }

    // 6. Tooth-region variance — reject flat surfaces (walls, paper, screens)
    let toothLumaSum = 0;
    for (let i = 0; i < toothCount; i++) {
      toothLumaSum += 0.299 * toothRs[i] + 0.587 * toothGs[i] + 0.114 * toothBs[i];
    }
    const toothLumaMean = toothLumaSum / toothCount;
    let varSum = 0;
    for (let i = 0; i < toothCount; i++) {
      const l = 0.299 * toothRs[i] + 0.587 * toothGs[i] + 0.114 * toothBs[i];
      varSum += (l - toothLumaMean) * (l - toothLumaMean);
    }
    result.regionVariance = Math.sqrt(varSum / toothCount);
    if (result.regionVariance < TOOTH_REGION_VARIANCE_MIN) {
      result.reason = 'too_flat';
      return result;
    }

    // 7. Confidence: tooth ratio + component contiguity + blur + region texture
    const ratioScore = Math.min(1, result.toothRatio / 0.08);
    const contiguityScore = result.largestComponentRatio;
    const blurScore = Math.min(1, result.blurScore / 10);
    const textureScore = Math.min(1, result.regionVariance / 20);
    result.confidence = Math.round(
      (ratioScore * 0.30 + contiguityScore * 0.30 + blurScore * 0.20 + textureScore * 0.20) * 100
    ) / 100;

    if (result.confidence < CONFIDENCE_THRESHOLD) {
      result.reason = 'low_confidence';
      return result;
    }

    result.passed = true;
    return result;
  } catch {
    result.reason = 'analysis_failed';
    return result;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// ROBUST WHITENESS — percentile-normalized, trimmed-median score.
// Replaces the raw-luminance fastEstimate score that inverted before/after
// brushing. The old score used un-normalized average luminance, so the same
// teeth under different lighting got different scores.
//
// Method:
//  1. Compute raw luminance and raw yellow for each tooth pixel.
//  2. Normalize luminance via the 60th percentile (robust to 40% glare —
//     unlike p90 which glare dominates). This cancels exposure/lighting
//     differences so the same teeth score consistently.
//  3. Keep the RAW yellow index (no white-balance on yellow) — white-
//     balancing the yellow distorts it based on the reference's color cast,
//     which can invert the direction. Raw yellow reflects actual tooth color.
//  4. Take a trimmed median (discard top 15% glare, bottom 10% shadow) of
//     the normalized luminance and raw yellow.
//
// Score direction is unambiguous: higher = whiter.
//   - whiter teeth → less yellow → lower yellow penalty → higher score
//   - the normalized luminance is roughly constant across lighting, so the
//     yellow index (actual tooth color) drives the score difference
//
// The white reference (if found) is still used for the colorimetric shade
// match (CIEDE2000) — a separate path. It is NOT used for the whiteness score.
// ─────────────────────────────────────────────────────────────────────────
const PERCENTILE_NORM_TARGET = 195;
const NORM_PERCENTILE = 0.60;

export function computeRobustWhiteness(toothPixels, _whiteRef) {
  if (!toothPixels || toothPixels.count === 0) return null;

  const { rs, gs, bs, count } = toothPixels;

  // Raw luminance and yellow — no white-balance on either.
  const lumas = new Float32Array(count);
  const yellows = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const r = rs[i], g = gs[i], b = bs[i];
    lumas[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    yellows[i] = Math.max(0, (r + g) / 2 - b);
  }

  // Sort for percentile + median computation
  lumas.sort();
  yellows.sort();

  // Percentile normalization: scale so the 60th percentile maps to 195.
  // p60 is robust to up to 40% glare pixels (unlike p90 which glare dominates).
  // This cancels exposure/lighting differences so the same teeth under
  // different lighting get the same normalized luminance.
  const p60Idx = Math.floor(count * NORM_PERCENTILE);
  const p60 = lumas[p60Idx];
  if (p60 > 0) {
    const normScale = PERCENTILE_NORM_TARGET / p60;
    for (let i = 0; i < count; i++) {
      lumas[i] = Math.min(255, lumas[i] * normScale);
    }
    lumas.sort();
  }

  // Trimmed median: discard top 15% (glare/specular) and bottom 10% (shadow)
  const trimStart = Math.floor(count * 0.10);
  const trimEnd = Math.floor(count * 0.85);
  const trimmedCount = trimEnd - trimStart;
  if (trimmedCount < 5) return null;

  const medianLuma = lumas[trimStart + Math.floor(trimmedCount / 2)];
  const medianYellow = yellows[trimStart + Math.floor(trimmedCount / 2)];

  // Scoring: normalized luminance drives the base score, raw yellow is the
  // penalty. Higher = whiter.
  const lumScore = Math.max(0, Math.min(100, (medianLuma - 60) / 1.4));
  const yellowPenalty = Math.max(0, Math.min(40, medianYellow * 0.8));
  const whiteness = Math.max(0, Math.min(100, Math.round(lumScore - yellowPenalty)));

  return {
    whiteness,
    medianLuma: Math.round(medianLuma),
    medianYellow: Math.round(medianYellow * 100) / 100,
    sampleCount: count,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// FRIENDLY RETRY MESSAGES — no technical CV jargon, per the de-AI copy rules.
// ─────────────────────────────────────────────────────────────────────────
export function gateReasonToMessage(reason) {
  switch (reason) {
    case 'no_teeth':
      return "No teeth detected. Face the camera directly, smile wide, and make sure your teeth are clearly visible.";
    case 'too_dark':
      return 'Photo is too dark. Move to brighter, natural light near a window and try again.';
    case 'too_bright':
      return 'Photo is too bright. Move away from harsh direct light or flash and try again.';
    case 'blurry':
      return 'Photo is too blurry. Hold the camera steady and make sure your teeth are in focus before capturing.';
    case 'fragmented':
      return "Couldn't get a clear read on your teeth. Face the camera straight on and show your full smile.";
    case 'off_center':
      return "Your teeth are too far from the center of the photo. Center your smile in the frame and try again.";
    case 'too_flat':
      return "This photo doesn't look like a teeth close-up. Make sure you're photographing your actual smile, not a surface or screen.";
    case 'low_confidence':
      return 'This photo is hard to read clearly. Try again in soft, even daylight facing a window.';
    case 'analysis_failed':
      return 'Something went wrong reading this photo. Please try again.';
    default:
      return 'Photo is not clear enough. Use good lighting and face the camera directly.';
  }
}