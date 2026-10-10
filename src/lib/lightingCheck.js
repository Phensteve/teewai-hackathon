// Quick client-side lighting-quality check for a captured tooth photo.
// Dental photography needs even, neutral lighting — too dim or too bright
// (overexposed/washed-out) shifts the apparent tooth shade and degrades the AI's
// colorimetry. This samples the image luminance + contrast and returns a plain
// verdict so the scan flow can prompt the user to adjust BEFORE burning a scan
// credit on a poorly-lit photo.
//
// Thresholds are deliberately lenient (only flag genuinely poor lighting) so
// the prompt doesn't nag users with acceptable photos. Any read failure falls
// back to 'unknown' (never blocks a scan).
export async function checkLighting(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      // Sample at modest resolution — we only need luminance statistics.
      const max = 160;
      let { width, height } = img;
      const scale = Math.min(1, max / Math.max(width, height));
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      let data;
      try { data = ctx.getImageData(0, 0, width, height).data; }
      catch { resolve({ level: 'unknown' }); return; }
      let sum = 0, sumSq = 0, n = 0;
      for (let i = 0; i < data.length; i += 4) {
        // Relative luminance (Rec. 709)
        const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        sum += lum; sumSq += lum * lum; n++;
      }
      const mean = sum / n;
      const std = Math.sqrt(Math.max(0, sumSq / n - mean * mean));
      if (mean < 55) return resolve({ level: 'dim', mean, std, message: 'Photo looks too dark', hint: 'Move to brighter, natural light (near a window) and avoid shadows on your teeth.' });
      if (mean > 225) return resolve({ level: 'bright', mean, std, message: 'Photo looks overexposed', hint: 'Move away from harsh direct light or flash — it washes out your true tooth shade.' });
      if (std < 14) return resolve({ level: 'flat', mean, std, message: 'Photo looks flat / low contrast', hint: 'Use even front-facing light so your teeth keep clear detail, not a flat white glow.' });
      return resolve({ level: 'good', mean, std });
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ level: 'unknown' }); };
    img.src = url;
  });
}