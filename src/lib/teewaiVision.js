// teewaiVision — ITK-inspired (Insight Toolkit) image preprocessing for calibrated whitening.
// Core ideas ported to a lightweight canvas pipeline:
//   1. Reference-Card White Balance: when the user holds a known-neutral reference
//      card in the frame, its measured RGB anchors the white balance (the method
//      dental photography uses). No gray-world assumption — that inflated scores.
//   2. Histogram Stretch (contrast normalization): stretch the luminance histogram to fill [2%, 98%],
//      recovering detail lost to under/over-exposure.
//   3. Calibrated Whitening: lift tooth-region luminance toward a target while desaturating yellow/red
//      hue, mimicking peroxide whitening without painting teeth flat white.
// No external deps — pure ImageData math. Used by the before/after slider and instant preview.

const clamp = (v, lo = 0, hi = 255) => Math.max(lo, Math.min(hi, v));

// --- 1. Reference-card white balance ---
// Replaces the old gray-world assumption ("the average scene is neutral
// gray") which inflated whiteness scores by dragging the whole image toward
// gray. Instead, when the user holds a known-neutral reference card in the
// frame, we use ITS measured RGB as the white-balance anchor — the same
// method dental photography uses (WhiBal / white card). The card's RGB tells
// us the ambient light's color cast; per-channel gains bring the card to
// neutral, which corrects the tooth color relative to it.
// No card → no correction (raw, honest — the lighting guard handles bad light).
export function referenceCardWhiteBalance(data, cardRgb) {
  if (!cardRgb || typeof cardRgb.r !== 'number') return data;
  const cr = Math.max(1, Math.min(255, cardRgb.r));
  const cg = Math.max(1, Math.min(255, cardRgb.g));
  const cb = Math.max(1, Math.min(255, cardRgb.b));
  const TARGET = 240; // bring the card to a neutral white
  const rGain = TARGET / cr;
  const gGain = TARGET / cg;
  const bGain = TARGET / cb;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp(data[i] * rGain);
    data[i + 1] = clamp(data[i + 1] * gGain);
    data[i + 2] = clamp(data[i + 2] * bGain);
  }
  return data;
}

// --- 2. Histogram stretch (percentile) ---
export function histogramStretch(data, low = 0.02, high = 0.98) {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) | 0;
    hist[lum]++;
  }
  const total = data.length / 4;
  let lo = 0, hi = 255, acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc / total >= low) { lo = v; break; }
  }
  acc = 0;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc / total >= 1 - high) { hi = v; break; }
  }
  if (hi <= lo) return data;
  const scale = 255 / (hi - lo);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp((data[i] - lo) * scale);
    data[i + 1] = clamp((data[i + 1] - lo) * scale);
    data[i + 2] = clamp((data[i + 2] - lo) * scale);
  }
  return data;
}

// --- 3. Calibrated whitening (peroxide-like, HSV-targeted) ---
// How real teeth-whitening photo apps work (researched):
//   1. SEGMENT the teeth — they are bright, low-saturation, and NOT the pink/red
//      of gums and lips. A crude luminance mask whitens skin highlights too;
//      an HSV mask (high V, low S, exclude red hue) targets enamel only.
//   2. DESATURATE THE YELLOW CHANNEL — tooth discoloration lives in the
//      yellow/orange hue band (~30-75°). Reducing saturation there, more than
//      elsewhere, is what removes the "yellow" without painting teeth flat white.
//   3. LIFT VALUE (brightness) toward a natural enamel target — not to pure
//      #FFFFFF, which looks like chalk/paint.
//   4. LEAVE GUMS, LIPS AND SKIN UNTOUCHED — the mask excludes saturated reds.
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
export function calibrateWhitening(data, intensity = 50) {
  const t = clamp(intensity, 0, 100) / 100;
  const valueLift = t * 0.52;           // how far to push brightness toward target
  const satReduce = 0.48 + t * 0.5;      // base + intensity yellow desaturation
  const targetV = 0.86 + t * 0.10;       // natural enamel target (never pure white)
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const [h, s, v] = rgbToHsv(r, g, b);
    // Exclude gums/lips: saturated red-pink hues (340°→20°) with real saturation.
    const isGum = s > 0.22 && (h < 25 || h > 335);
    if (isGum) continue;
    // Tooth confidence: bright (but not blown-out highlight) + low saturation.
    const valConf = clamp((v - 0.42) / 0.3, 0, 1) * clamp((0.99 - v) / 0.08, 0, 1);
    const satConf = clamp(1 - s / 0.5, 0, 1);
    const toothMask = valConf * satConf;
    if (toothMask <= 0.02) continue;
    // Yellow-ness: discoloration sits in the 30-75° band; weight desaturation by it.
    const yellowNess = h >= 30 && h <= 80 ? 1 : clamp(1 - Math.min(Math.abs(h - 55), 180) / 30, 0, 1);
    const newS = s * (1 - satReduce * toothMask * (0.55 + 0.45 * yellowNess));
    const newV = v + (targetV - v) * valueLift * toothMask;
    const [nr, ng, nb] = hsvToRgb(h, Math.max(0, newS), clamp(newV, 0, 1));
    data[i] = clamp(nr);
    data[i + 1] = clamp(ng);
    data[i + 2] = clamp(nb);
  }
  return data;
}

// Normalize lighting for AI analysis. NO gray-world white balance (the old
// assumption-based correction inflated whiteness scores). When a reference
// card's RGB is supplied, apply anchor-based reference-card white balance;
// otherwise the photo passes through with only a histogram stretch for
// exposure recovery. Returns a new Blob (falls back to the original on error).
export async function normalizeLightingForAI(blob, cardRgb = null, maxDim = 1280) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        if (cardRgb) referenceCardWhiteBalance(imageData.data, cardRgb);
        histogramStretch(imageData.data);
        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob((nb) => resolve(nb || blob), 'image/jpeg', 0.92);
      } catch { resolve(blob); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(blob); };
    img.src = url;
  });
}

// Full pipeline: optional reference-card white balance -> histogram stretch -> calibrated whitening.
// No gray-world (assumption-based, inflated scores). When a reference card's
// RGB is available it anchors the white balance; otherwise the photo stays raw.
export function applyTeewaiPipeline(imageData, intensity = 50, cardRgb = null) {
  if (cardRgb) referenceCardWhiteBalance(imageData.data, cardRgb);
  histogramStretch(imageData.data);
  calibrateWhitening(imageData.data, intensity);
  return imageData;
}

// Helper: load an image URL, run the pipeline, return a processed dataURL (for <img src>).
export function processImageToDataURL(url, intensity = 50, cardRgb = null, maxDim = 900) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        applyTeewaiPipeline(imageData, intensity, cardRgb);
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}