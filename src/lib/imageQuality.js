// Capture heuristics, NOT clinically validated thresholds or a subject detector.
// Fixed sampling scale makes focus comparable; preserve the source aspect ratio.
export function measureImageQuality(source, { mouth = false } = {}) {
  const width = source.videoWidth || source.naturalWidth || source.width;
  const height = source.videoHeight || source.naturalHeight || source.height;
  if (!width || !height) throw new Error('The image is not ready.');
  const crop = mouth ? { x: width * .14, y: height * .27, w: width * .72, h: height * .46 } : { x: 0, y: 0, w: width, h: height };
  const scale = Math.min(1, 256 / Math.max(crop.w, crop.h));
  const w = Math.max(3, Math.round(crop.w * scale)), h = Math.max(3, Math.round(crop.h * scale));
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, w, h);
  const { data } = context.getImageData(0, 0, w, h);
  const luminance = new Float32Array(w * h);
  let sum = 0, clipped = 0, dark = 0, teeth = 0, tissue = 0, tx = 0, ty = 0;
  for (let p = 0; p < luminance.length; p++) {
    const i = p * 4, r = data[i], g = data[i + 1], b = data[i + 2];
    const l = .2126 * r + .7152 * g + .0722 * b;
    luminance[p] = l; sum += l;
    if (Math.min(r, g, b) >= 247) clipped++;
    if (l < 25) dark++;
    const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(1, r, g, b);
    // Broad ivory range; yellow enamel is not automatically a bad capture.
    if (l > 85 && l < 247 && saturation < .48 && g > r * .70 && b > r * .50) { teeth++; tx += p % w; ty += Math.floor(p / w); }
    if (r > g * 1.12 && r > b * 1.15 && l > 35 && l < 225) tissue++;
  }
  let lapSum = 0, lapSq = 0, edges = 0, count = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const p = y * w + x;
    const lap = luminance[p - 1] + luminance[p + 1] + luminance[p - w] + luminance[p + w] - 4 * luminance[p];
    lapSum += lap; lapSq += lap * lap; count++;
    if (Math.abs(luminance[p + 1] - luminance[p - 1]) + Math.abs(luminance[p + w] - luminance[p - w]) > 24) edges++;
  }
  const focus = Math.max(0, lapSq / count - (lapSum / count) ** 2);
  const n = luminance.length, mean = sum / n;
  let reason = null, message = '';
  if (Math.min(width, height) < 240) { reason = 'resolution'; message = 'Photo is too small. Take a new close-up rather than enlarging a thumbnail.'; }
  else if (mean < 30 && dark / n > .65) { reason = 'dark'; message = 'Details are lost in darkness. Use soft light from in front of you.'; }
  else if (clipped / n > .60) { reason = 'glare'; message = 'Details are washed out. Avoid flash and direct glare, then retake.'; }
  else if (focus < 12 && edges / count < .025) { reason = 'blur'; message = 'Details are too soft to read. Clean the lens, hold still and let the camera focus.'; }
  return { width, height, mean, focus, edgeRatio: edges / count, clipped: clipped / n, dark: dark / n, toothRatio: teeth / n, tissueRatio: tissue / n, cx: teeth ? tx / teeth / w : .5, cy: teeth ? ty / teeth / h : .5, luminance, reason, message, passed: !reason };
}

export async function assessImageFile(file, options) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('Could not open this photo. Choose a JPG or PNG, or take a new photo.')); img.src = url;
    });
    return measureImageQuality(image, options);
  } finally { URL.revokeObjectURL(url); }
}

export function frameMovement(current, previous) {
  if (!previous || current.length !== previous.length) return Infinity;
  let difference = 0;
  for (let i = 0; i < current.length; i++) difference += Math.abs(current[i] - previous[i]);
  return difference / current.length;
}