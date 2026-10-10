// Real-time toothbrush color tracker.
// Samples a target color from the video feed, then finds the centroid
// of matching pixels each frame. Designed to be fast (scan a tiny canvas)
// and sensitive (adjustable threshold + EMA smoothing).

// Sample the average RGB color in a small radius around a point.
export function sampleColor(imageData, x, y, radius = 3) {
  const { data, width, height } = imageData;
  let r = 0, g = 0, b = 0, count = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const px = Math.round(x) + dx;
      const py = Math.round(y) + dy;
      if (px < 0 || px >= width || py < 0 || py >= height) continue;
      const i = (py * width + px) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
  }
  return count ? { r: r / count, g: g / count, b: b / count } : null;
}

// Find the centroid of pixels matching the target color.
// Returns normalized { x, y, confidence } or null.
export function trackColor(imageData, target, threshold = 75) {
  const { data, width, height } = imageData;
  const tSq = threshold * threshold;
  let sumX = 0, sumY = 0, count = 0;

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const dr = data[i] - target.r;
      const dg = data[i + 1] - target.g;
      const db = data[i + 2] - target.b;
      if (dr * dr + dg * dg + db * db < tSq) {
        sumX += x;
        sumY += y;
        count++;
      }
    }
  }

  if (count < 8) return null;
  return {
    x: sumX / count / width,
    y: sumY / count / height,
    confidence: count,
  };
}

// Exponential moving average for jitter-free position smoothing.
export function smoothPos(prev, next, alpha = 0.35) {
  if (!prev) return { x: next.x, y: next.y };
  return {
    x: prev.x * (1 - alpha) + next.x * alpha,
    y: prev.y * (1 - alpha) + next.y * alpha,
  };
}