import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { secrets } from "base44:runtime";
import { INSFORGE_BASE_URL, extractStorageKey } from "../../shared/insforge.ts";
import jpeg from "npm:jpeg-js@0.4.4";

// One-time maintenance: food photos migrated from legacy Base44 public URLs
// were copied across UNCOMPRESSED (≈4.7 MB each), while the normal
// foodPhotos.upload pipeline compresses to a 1024 px JPEG (~150 KB). The
// scanPhoto proxy base64-encodes every byte it returns, so a 4.7 MB photo
// becomes a ~6.3 MB data URL — too heavy to fetch reliably on mobile,
// leaving thumbnails blank. This re-encodes each food-scans object in place
// (same key, same URL) at 1024 px / quality 80, so no DB update is needed —
// the stored URL stays valid, only the bytes shrink.
//
// Uses jpeg-js (pure JS, no native bindings) + a box-filter downscale, which
// the Deno edge runtime can run without libvips/sharp.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }

    const token = secrets.get("INSFORGE_PROJECT_TOKEN");
    const authH = { Authorization: `Bearer ${token}` };

    const qs = new URLSearchParams({ select: "id,userId,data", limit: "1000" });
    const listRes = await fetch(`${INSFORGE_BASE_URL}/api/database/records/stain_logs?${qs}`, { headers: authH });
    const rows = await listRes.json();
    const foodRows = (Array.isArray(rows) ? rows : []).filter((r) => r.data?.image_url?.includes("/buckets/food-scans/"));

    const results = { compressed: 0, skipped: 0, failed: [] };

    for (const r of foodRows) {
      try {
        const url = r.data.image_url;
        const key = extractStorageKey(url);
        if (!key) { results.failed.push({ id: r.id, err: "no key" }); continue; }

        const imgRes = await fetch(
          `${INSFORGE_BASE_URL}/api/storage/buckets/food-scans/objects/${encodeURIComponent(key)}`,
          { headers: { ...authH, Accept: "*/*", "User-Agent": "Mozilla/5.0 teewai" } },
        );
        if (!imgRes.ok) { results.failed.push({ id: r.id, err: `fetch ${imgRes.status}` }); continue; }
        const buf = new Uint8Array(await imgRes.arrayBuffer());

        // Already small enough — skip.
        if (buf.byteLength < 500000) { results.skipped++; continue; }

        // Decode JPEG → raw RGBA, downscale to 1024 px max (box filter), re-encode.
        const raw = jpeg.decode(buf);
        const scale = Math.min(1, 1024 / Math.max(raw.width, raw.height));
        const dw = Math.max(1, Math.round(raw.width * scale));
        const dh = Math.max(1, Math.round(raw.height * scale));
        const resized = boxDownscale(raw.data, raw.width, raw.height, dw, dh);
        const outBuf = jpeg.encode({ width: dw, height: dh, data: resized }, 80);

        // Overwrite the same object key with the compressed bytes.
        const form = new FormData();
        form.append("file", new Blob([outBuf.data || outBuf], { type: "image/jpeg" }), key);
        const upRes = await fetch(
          `${INSFORGE_BASE_URL}/api/storage/buckets/food-scans/objects/${encodeURIComponent(key)}`,
          { method: "PUT", headers: authH, body: form },
        );
        if (!upRes.ok) { results.failed.push({ id: r.id, err: `upload ${upRes.status}` }); continue; }
        results.compressed++;
      } catch (e) {
        results.failed.push({ id: r.id, err: String(e.message || e).slice(0, 120) });
      }
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Box-filter downscale of an RGBA buffer. Averages each source block into one
// output pixel — not as crisp as lanczos, but fine for a 1024 px food thumb.
function boxDownscale(src, sw, sh, dw, dh) {
  const dst = new Uint8Array(dw * dh * 4);
  const xRatio = sw / dw;
  const yRatio = sh / dh;
  for (let dy = 0; dy < dh; dy++) {
    const y0 = Math.floor(dy * yRatio);
    const y1 = Math.max(y0 + 1, Math.floor((dy + 1) * yRatio));
    for (let dx = 0; dx < dw; dx++) {
      const x0 = Math.floor(dx * xRatio);
      const x1 = Math.max(x0 + 1, Math.floor((dx + 1) * xRatio));
      let r = 0, g = 0, b = 0, count = 0;
      for (let sy = y0; sy < y1; sy++) {
        const rowBase = sy * sw * 4;
        for (let sx = x0; sx < x1; sx++) {
          const si = rowBase + sx * 4;
          r += src[si]; g += src[si + 1]; b += src[si + 2];
          count++;
        }
      }
      const di = (dy * dw + dx) * 4;
      dst[di] = Math.round(r / count);
      dst[di + 1] = Math.round(g / count);
      dst[di + 2] = Math.round(b / count);
      dst[di + 3] = 255;
    }
  }
  return dst;
}