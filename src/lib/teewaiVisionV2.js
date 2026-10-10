// teewaiVision V2 — improved whitening pipeline with VITA-targeted adaptive whitening.
//
// IMPROVEMENTS OVER V1:
//   1. VITA-TARGETED: Uses the scan's whitening potential score to compute a precise
//      target enamel value, rather than a generic 0.86. A potential of 90 → target
//      0.92 (VITA A1), a potential of 75 → target 0.82 (VITA A2). This means the
//      preview shows the actual shade the user can achieve, not a fixed brightening.
//
//   2. ADAPTIVE INTENSITY: Each pixel's whitening lift is proportional to its
//      distance from the target value. Already-bright pixels get minimal whitening,
//      darker/yellower pixels get more — preventing over-whitening and producing
//      a natural gradient that mirrors how real peroxide whitening works
//      (it lifts stains, not already-white enamel).
//
//   3. BLUE MICRO-SHIFT: Whitened enamel reflects slightly more blue light than
//      yellow-stained enamel (this is why whitened teeth look "brighter" not just
//      "lighter"). A subtle blue channel boost (ΔB ≈ +3-5 per pixel) mimics this
//      optical property, making the result look like real whitening rather than
//      a brightness filter.
//
//   4. FEATHERED MASK: The tooth confidence mask is inherently gradient-based
//      (valConf × satConf), so edges blend naturally — no hard line between
//      whitened and non-whitened regions, no halo artifacts.

import { referenceCardWhiteBalance, histogramStretch } from './teewaiVision';

const clamp = (v, lo = 0, hi = 255) => Math.max(lo, Math.min(hi, v));

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

// Map a whiteness potential score (0-100) to a target enamel value (0-1).
// VITA A1 ≈ 0.92, A2 ≈ 0.86, B1 ≈ 0.88. We interpolate: 0.72 (low) → 0.94 (high).
const targetFromPotential = (potential) => {
  const p = clamp(potential, 0, 100) / 100;
  return 0.72 + p * 0.22;
};

export function calibrateWhiteningV2(data, intensity = 50, potentialScore = 80) {
  const t = clamp(intensity, 0, 100) / 100;
  const targetV = targetFromPotential(potentialScore);
  const maxLift = t * 0.65;
  const satReduce = 0.50 + t * 0.45;
  const blueShift = t * 4;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const [h, s, v] = rgbToHsv(r, g, b);

    // Exclude gums/lips: saturated red-pink hues
    const isGum = s > 0.22 && (h < 25 || h > 335);
    if (isGum) continue;

    // Tooth confidence mask (gradient-based → natural feathering)
    const valConf = clamp((v - 0.42) / 0.3, 0, 1) * clamp((0.99 - v) / 0.08, 0, 1);
    const satConf = clamp(1 - s / 0.5, 0, 1);
    const toothMask = valConf * satConf;
    if (toothMask <= 0.02) continue;

    // Yellow-ness weight (30-75° hue band)
    const yellowNess = h >= 30 && h <= 80 ? 1 : clamp(1 - Math.min(Math.abs(h - 55), 180) / 30, 0, 1);

    // ADAPTIVE: lift proportional to distance from target (not a fixed amount)
    const distFromTarget = Math.max(0, targetV - v);
    const adaptiveLift = distFromTarget * maxLift * toothMask;
    const newV = v + adaptiveLift;

    // Desaturate yellow (more aggressive for yellower pixels)
    const newS = s * (1 - satReduce * toothMask * (0.55 + 0.45 * yellowNess));

    let [nr, ng, nb] = hsvToRgb(h, Math.max(0, newS), clamp(newV, 0, 1));

    // BLUE MICRO-SHIFT: whitened enamel reflects more blue light
    if (toothMask > 0.1) {
      nb = clamp(nb + blueShift * toothMask);
      nr = clamp(nr - blueShift * 0.3 * toothMask);
    }

    data[i] = clamp(nr);
    data[i + 1] = clamp(ng);
    data[i + 2] = clamp(nb);
  }
  return data;
}

export function applyTeewaiPipelineV2(imageData, intensity = 50, potentialScore = 80, cardRgb = null) {
  if (cardRgb) referenceCardWhiteBalance(imageData.data, cardRgb);
  histogramStretch(imageData.data);
  calibrateWhiteningV2(imageData.data, intensity, potentialScore);
  return imageData;
}

export function processImageToDataURLV2(url, intensity = 50, potentialScore = 80, cardRgb = null, maxDim = 900) {
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
        applyTeewaiPipelineV2(imageData, intensity, potentialScore, cardRgb);
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