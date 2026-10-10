// Re-encode any picked/captured photo into a standard JPEG the browser can
// always decode. Returns null when the file can't be opened at all
// (e.g. HEIC on browsers without HEIC support, or a non-image file).
function decode(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

export async function normalizePhoto(file, maxSide = 1600) {
  let source = null;
  try { source = await createImageBitmap(file); } catch { source = await decode(file); }
  if (!source || !source.width || !source.height) return null;
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const w = Math.round(source.width * scale);
  const h = Math.round(source.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(source, 0, 0, w, h);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.92));
  if (!blob) return null;
  return new File([blob], 'scan.jpg', { type: 'image/jpeg' });
}