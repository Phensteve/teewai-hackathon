// teewaiWhiten — real teeth-whitening engine (replaces the V2 whole-image filter).
//
// WHY THIS IS NOT A FILTER
// A brightness filter lifts every bright pixel in the photo — skin highlights,
// glare, white walls — which is why the old V2 preview "looked like a filter".
// This engine instead SEGMENTS the teeth from the rest of the mouth (gums,
// lips, skin, background) into a spatially-coherent, feathered mask, then
// applies a peroxide-mimicking colour transform ONLY to tooth pixels. The
// result is a genuine change of enamel colour — yellow/brown chroma is
// removed and the value is lifted toward the VITA target shade — while every
// tooth's shape, size, position, gaps, surface texture and the entire face,
// lips and gums stay pixel-identical.
//
// PIPELINE (researched from Photoshop / BeFunky / Pixelbin whitening tools):
//   1. ROI confinement — if the AI returned a smile_bbox (normalised bounding
//      box of the tooth area), processing is confined to that region.
//   2. Tooth segmentation — teeth are identified by "NOT gum (saturated
//      red-pink) AND NOT dark gap (interdental shadow)". Crucially, saturation
//      is NOT penalised — stained teeth are highly saturated (yellow/brown)
//      and the old code's saturation penalty zeroed them out, so before==after
//      on the exact teeth that needed whitening. Hue weighting guides the
//      mask: yellow/ivory/brown hues are teeth; green/blue/purple are not.
//   3. Whitening transform (CIE-LAB) — within the feathered mask:
//        a. Cut b* (yellow chroma) — removes the actual stain pigment. THE
//           whitening operation; stronger for more-yellow pixels.
//        b. Cut a* (red/brown chroma) — for brown-stained teeth.
//        c. Lift L* (perceptual lightness) toward the VITA target shade —
//           adaptively, so stained teeth get more lift.
//        d. Specular highlights (glare) are skipped so they don't blow out.
//   4. Fallback — if the mask caught almost no teeth (very dark/unusual photo),
//      a hue-targeted yellow desaturation pass (the Photoshop "Yellows
//      channel" method) runs across the ROI so the preview still shows a
//      visible change — never a blank before==after.
//
// Deterministic, client-side, no network calls.

const clamp = (v, lo = 0, hi = 255) => Math.max(lo, Math.min(hi, v));
const clamp01 = (v) => Math.max(0, Math.min(1, v));

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

function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

// --- CIE-LAB colour space ---
// LAB is the perceptually-uniform space VITA shades are defined in. Whitening
// in LAB (lift L*, cut b* yellow, cut a* red) matches how real peroxide works
// and how dentists measure shade — a uniform perceptual change, not a filter.
const D65_X = 0.95047, D65_Y = 1.0, D65_Z = 1.08883;
function srgbToLinear(c) {
  const cs = c / 255;
  return cs <= 0.04045 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}
function linearToSrgb(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}
function rgbToLab(r, g, b) {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
  const Z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;
  const fx = X / D65_X, fy = Y / D65_Y, fz = Z / D65_Z;
  const fin = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fxr = fin(fx), fyr = fin(fy), fzr = fin(fz);
  return [116 * fyr - 16, 500 * (fxr - fyr), 200 * (fyr - fzr)];
}
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
  return [linearToSrgb(R) * 255, linearToSrgb(G) * 255, linearToSrgb(B) * 255];
}

// Target L* (perceptual lightness) from the scan's whitening potential.
const targetLFromPotential = (potential) => 72 + clamp01((potential || 80) / 100) * 16;

// Separable box blur on a Float32 mask.
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

// --- 1. TOOTH SEGMENTATION ---
// Returns a Float32Array (1 per pixel, 0..1) tooth confidence mask.
//
// KEY FIX: the old code penalised saturation (satScore = 1 - sat/0.5), which
// meant stained yellow/brown teeth — the ones that NEED whitening — scored
// ~0 and got no whitening at all (before == after). The new approach detects
// teeth by "NOT gum (saturated red-pink) AND NOT dark gap", with hue weighting
// to guide the mask. Saturation is NOT penalised — the stain IS the saturation,
// and the LAB transform removes it.
function buildToothMask(data, w, h, roi, permissive = false) {
  const x0 = roi ? Math.max(0, Math.floor(roi.x0)) : 0;
  const y0 = roi ? Math.max(0, Math.floor(roi.y0)) : 0;
  const x1 = roi ? Math.min(w, Math.ceil(roi.x1)) : w;
  const y1 = roi ? Math.min(h, Math.ceil(roi.y1)) : h;

  // Gum detection: only true red-pink (not brown teeth). Brown stained teeth
  // can have hue 20-40° (orange-brown); the old range (hue < 28) caught them
  // as gums and excluded them. Tighten to hue < 16 so only genuine pink-red
  // gum tissue is excluded.
  const gumHueMax = permissive ? 20 : 16;
  const gumSatMin = permissive ? 0.40 : 0.30;

  // Dark gap floor — interdental gaps and deep shadows are not teeth.
  const darkFloor = permissive ? 0.16 : 0.20;

  // Tooth brightness floor. Above this is potentially a tooth.
  const valFloor = permissive ? 0.20 : 0.26;
  const valSpan = 0.55;
  const probCut = permissive ? 0.04 : 0.06;

  const raw = new Float32Array(w * h);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4;
      const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
      const [hue, sat, val] = rgbToHsv(r, g, b);

      // GUM/LIP EXCLUSION: true red-pink only (not brown stained teeth).
      if (sat > gumSatMin && (hue < gumHueMax || hue > 360 - gumHueMax)) continue;

      // DARK GAP: interdental gaps and deep shadows.
      if (val < darkFloor) continue;

      // TOOTH LIKELIHOOD: bright enough + not gum. Do NOT penalise saturation
      // — stained teeth are saturated (yellow/brown). The stain IS the chroma;
      // the LAB transform removes it. This is the core fix.
      const brightScore = clamp01((val - valFloor) / valSpan);

      // Hue weighting: yellow/ivory (30-90°) is the tooth zone. Brown (18-30°)
      // is still a stained tooth. Green/blue/purple are not teeth.
      let hueWeight = 1;
      if (hue >= 30 && hue <= 90) hueWeight = 1.0;        // yellow-white tooth zone
      else if (hue >= 18 && hue < 30) hueWeight = 0.85;   // brown stained tooth
      else if (hue >= 90 && hue < 140) hueWeight = 0.45;   // greenish — unlikely
      else if (hue >= 140 && hue < 320) hueWeight = 0.12;  // blue/purple — not tooth
      else hueWeight = 0.35;                               // red-ish edge — maybe lip

      let prob = brightScore * hueWeight;

      // Yellow saturation bonus: a yellow pixel in the tooth zone is almost
      // certainly a stained tooth — boost it so the stain gets removed.
      if (hue >= 30 && hue <= 90 && sat > 0.08) prob *= 1.15;

      if (prob < probCut) prob = 0;
      raw[y * w + x] = prob;
    }
  }

  // Spatial smoothing → coherent blobs + feathered edges.
  const mask = smoothMask(raw, w, h, 3, 2);
  // Contrast curve: clean up weak signal, keep soft feathered edges.
  for (let p = 0; p < mask.length; p++) {
    mask[p] = clamp01((mask[p] - 0.05) / 0.38);
  }
  return mask;
}

// --- 2. WHITENING TRANSFORM (CIE-LAB) ---
// Peroxide-mimicking colour change in perceptual space, weighted by the
// feathered mask. Only tooth pixels change; everything else is pixel-identical.
//   • b* cut   → removes yellow stain pigment (THE whitening operation).
//                Stronger for more-yellow (stained) pixels.
//   • a* cut   → removes red/brown chroma for stained teeth.
//   • L* lift  → enamel brightens toward the VITA target (adaptive).
//   • Specular highlights (glare) are skipped so they don't blow out.
function whitenTeethLab(data, mask, w, h, { intensity = 60, potentialScore = 80 } = {}) {
  const t = clamp01((intensity || 60) / 100);
  const targetL = targetLFromPotential(potentialScore);
  const liftFactor = t * 0.85;            // how far L* moves toward target
  const bReduce = 0.72 + t * 0.26;        // yellow-chroma removal (up to 98%)
  const aReduce = 0.40 + t * 0.30;        // red/brown-chroma removal

  for (let p = 0; p < w * h; p++) {
    const m = mask[p];
    if (m <= 0.01) continue;              // not a tooth — untouched
    const i = p * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    let [L, a, bl] = rgbToLab(r, g, b);

    // SPECULAR-HIGHLIGHT PROTECTION: near-white, near-zero-chroma pixels are
    // glare/reflections. Lifting them blows out to pure white. Skip.
    if (L > 90 && Math.abs(a) < 3 && bl < 6) continue;

    // ADAPTIVE L* lift: move toward target only (never darken). Stained enamel
    // (L far below target) gets more lift → real peroxide-mimicking change.
    const lift = Math.max(0, targetL - L) * liftFactor * m;
    const newL = L + lift;

    // YELLOW CHROMA removal — b* is the yellow→blue axis; positive b* = yellow.
    // More reduction for more-yellow (stained) pixels, less for already-white.
    // Floor at b*≈3 keeps a natural ivory warmth — never flat grey/chalk.
    const yellowNess = clamp01(bl / 25);
    const bCut = bReduce * m * (0.40 + 0.60 * yellowNess);
    const newB = Math.max(3, bl * (1 - bCut));

    // RED/BROWN CHROMA removal — a* is red→green; stained teeth trend reddish.
    // Floor at a*≈0 so we never overshoot into green.
    const redNess = clamp01(a / 15);
    const aCut = aReduce * m * (0.30 + 0.70 * redNess);
    const newA = Math.max(0, a * (1 - aCut));

    let [nr, ng, nb] = labToRgb(newL, newA, newB);
    data[i] = clamp(nr);
    data[i + 1] = clamp(ng);
    data[i + 2] = clamp(nb);
  }
  return data;
}

// --- 3. FALLBACK: hue-targeted yellow desaturation (Photoshop "Yellows" method) ---
// If the tooth mask caught almost nothing (very dark/unusual photo), this pass
// directly desaturates yellow/brown hues across the ROI — the same method
// Photoshop's Hue/Saturation → Yellows adjustment uses. It doesn't need tooth
// segmentation; it targets the stain colour itself. Weighted by "not gum".
function fallbackYellowDesaturation(data, w, h, roi, intensity = 60) {
  const x0 = roi ? Math.max(0, Math.floor(roi.x0)) : 0;
  const y0 = roi ? Math.max(0, Math.floor(roi.y0)) : 0;
  const x1 = roi ? Math.min(w, Math.ceil(roi.x1)) : w;
  const y1 = roi ? Math.min(h, Math.ceil(roi.y1)) : h;
  const t = clamp01((intensity || 60) / 100);
  const satReduce = 0.60 + t * 0.35;
  const valLift = t * 0.30;

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4;
      const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
      const [h, s, v] = rgbToHsv(r, g, b);
      // Skip gums (saturated red-pink) and dark gaps.
      if (s > 0.30 && (h < 16 || h > 344)) continue;
      if (v < 0.20) continue;
      // Only touch yellow/brown hues (the stain band).
      if (h < 15 || h > 95) continue;
      // Weight by yellowness + brightness.
      const yellowNess = h >= 30 && h <= 90 ? 1 : clamp01(1 - (30 - h) / 15);
      const newS = Math.max(0, s * (1 - satReduce * yellowNess));
      const newV = Math.min(1, v + (1 - v) * valLift * yellowNess);
      const [nr, ng, nb] = hsvToRgb(h, newS, newV);
      data[i] = clamp(nr);
      data[i + 1] = clamp(ng);
      data[i + 2] = clamp(nb);
    }
  }
  return data;
}

// --- 4. ROI from AI smile_bbox ---
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

// --- FULL PIPELINE ---
export function applyWhiteningPipeline(imageData, { intensity = 60, potentialScore = 80, smileBbox = null } = {}) {
  const { width: w, height: h } = imageData;
  const roi = bboxToRoi(smileBbox, w, h);
  let mask = buildToothMask(imageData.data, w, h, roi);
  // Check coverage. If the mask caught almost no teeth, try permissive mode.
  let covered = 0;
  for (let p = 0; p < mask.length; p++) if (mask[p] > 0.05) covered++;
  if (covered < w * h * 0.004) mask = buildToothMask(imageData.data, w, h, roi, true);
  // Re-check. If still almost nothing, use the hue-targeted fallback so the
  // preview always shows a visible change — never a blank before==after.
  covered = 0;
  for (let p = 0; p < mask.length; p++) if (mask[p] > 0.05) covered++;
  if (covered < w * h * 0.003) {
    fallbackYellowDesaturation(imageData.data, w, h, roi, intensity);
  } else {
    whitenTeethLab(imageData.data, mask, w, h, { intensity, potentialScore });
  }
  return imageData;
}

// Helper: load image URL → run pipeline → return processed dataURL (for <img src>).
export function processWhiteningPreview(url, { intensity = 60, potentialScore = 80, smileBbox = null, maxDim = 1000 } = {}) {
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
      applyWhiteningPipeline(imageData, { intensity, potentialScore, smileBbox });
      ctx.putImageData(imageData, 0, 0);
      if (!isData) URL.revokeObjectURL(src);
      return canvas.toDataURL('image/jpeg', 0.92);
    })
  );
}