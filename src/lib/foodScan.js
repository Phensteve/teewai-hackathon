// Shared food-photo identification pipeline (Cal AI-style). Used by both the
// dashboard quick-scan card and the full stain tracker so they share one
// accurate path: upload → LLM identify every item + portion estimate →
// resolve each via previously-discovered foods / calibrated catalog / online
// research.
//
// Multi-item: a plate often holds several distinct foods (amala + efo riro,
// rice + stew + chicken). The LLM returns one entry per item; each is
// resolved independently so every component is recognised and logged.
//
// Returns:
//   { items: [{ item: { name, category, stain_level, calories }, matched, confidence, macros }], file_url }
//   { rejected: true, message, file_url }  — when the photo isn't food/drink.

import { identifyFood, buildFoodPrompt, FOOD_RESPONSE_SCHEMA } from './unrufldfood';
import { findDiscoveredFood, researchFoodOnline, saveDiscoveredFood } from './foodDiscovery';
import { applyFoodConsensus } from './foodColorimetry';
import { foodPhotos, compressImage } from './insforgeDb';
import { assessImageFile } from '@/lib/imageQuality';
import { normalizePhoto } from '@/lib/normalizePhoto';

export async function identifyFoodPhoto(unrufld, file, onProgress) {
  const normalized = await normalizePhoto(file);
  if (!normalized) return { rejected: true, message: 'Could not open this image. Take a new photo or choose a JPG or PNG.', file_url: null };
  file = normalized;
  const quality = await assessImageFile(file);
  if (!quality.passed) return { rejected: true, message: quality.message, file_url: null };
  // Dual upload (same pattern as dental scans):
  //  - InsForge `food-scans` bucket (private, per-user) → stored on the
  //    StainLog and served through the scanPhoto proxy at display time.
  //  - Base44 file storage (public) → the LLM vision service can't fetch
  //    private InsForge URLs (auth + WAF), so it needs the public mirror.
  let storageUrl = null;
  let llmUrl = null;
  try {
    // Compress once (like teeth scans) so the Base44 vision upload gets a
    // reasonably-sized file. Large raw camera photos can fail that upload,
    // leaving the LLM with no fetchable image and a false "not food" rejection.
    let blob = file;
    let contentType = 'image/jpeg';
    try {
      const c = await compressImage(file, 1024, 0.8);
      blob = c.blob;
      contentType = c.contentType;
    } catch {}
    await onProgress?.(1);
    const mirrorFile = new File([blob], 'food.jpg', { type: contentType });
    const [ins, b44] = await Promise.all([
      foodPhotos.uploadBlob(blob, contentType).catch(() => null),
      unrufld.integrations.Core.UploadPublicFile({ file: mirrorFile }).then((r) => r.file_url).catch(() => null),
    ]);
    storageUrl = ins?.url || null;
    llmUrl = b44 || null;
  } catch {}
  const file_url = storageUrl; // stored on the StainLog (private, proxy-served)

  if (!llmUrl) return { rejected: true, message: 'The photo could not reach the image reader. Please retry; no scan credit was used.', file_url };
  await onProgress?.(2);
  const data = await unrufld.integrations.Core.InvokeLLM({
    prompt: buildFoodPrompt(),
    file_urls: [llmUrl],
    response_json_schema: FOOD_RESPONSE_SCHEMA,
    model: 'gemini_3_flash',
  });

  // Food-validation gate + identification. identifyFood returns a uniform
  // `items` list (one per separable food on the plate), each already resolved
  // against the calibrated catalog or given a deterministic property score.
  const result = identifyFood(data);
  if (result.rejected) return { rejected: true, message: result.message, file_url };

  const rawItems = Array.isArray(result.items) ? result.items : [];
  if (rawItems.length === 0) {
    return { rejected: true, message: "I couldn't identify any food or drink in that photo. Try scanning something you'd eat or sip.", file_url };
  }

  // Resolve each identified item IN PARALLEL (discovered-food cache → catalog
  // match → property fallback). No online research step — the engine's
  // deterministic property-based scoring handles unknown foods from the LLM's
  // own chromogenic/acidity/tannin assessments, so no extra credit-consuming
  // LLM call is made per unknown item.
  await onProgress?.(3);
  const resolved = await Promise.all(
    rawItems.map(async (it) => {
      const name = it.item?.name;
      if (!name) return null;
      const region = it.region || null;

      // 1) Previously-discovered food → reuse its calibrated stain scores.
      const discovered = it.confidence >= 80 ? await findDiscoveredFood(unrufld, name) : null;
      if (discovered) {
        return {
          item: {
            name,
            category: discovered.category,
            stain_level: discovered.stain_level,
            calories: it.item.calories,
          },
          scores: {
            chromogenic: discovered.chromogenic,
            acidity: discovered.acidity,
            tannin: discovered.tannin,
          },
          region,
          matched: true,
          confidence: it.confidence ?? 0,
          macros: it.macros,
        };
      }

      // 2) Catalog match → use the engine's calibrated result.
      if (it.identified) {
        return { item: it.item, scores: it.scores, region, matched: true, confidence: it.confidence, macros: it.macros };
      }

      // 3) Online research (LLM + web search) for unknown foods. The engine
      // researches the food's ingredients, pigment, acidity and tannin content
      // from reliable sources, returns calibrated staining properties, and we
      // persist it to DiscoveredFood so future scans of it resolve instantly.
      // This is the accuracy moat: teewai learns every new regional/local dish.
      const researched = it.confidence >= 80 ? await researchFoodOnline(unrufld, it.item) : null;
      if (researched) {
        await saveDiscoveredFood(unrufld, researched);
        return {
          item: { ...researched, name, calories: it.item.calories },
          scores: { chromogenic: researched.chromogenic, acidity: researched.acidity, tannin: researched.tannin },
          region,
          matched: true,
          confidence: it.confidence ?? 0.85,
          macros: it.macros,
          isNewDiscovery: true,
        };
      }

      // 4) Property-based fallback if research is unavailable — the engine's
      // deterministic stain score from the LLM's own property assessments.
      return { item: it.item, scores: it.scores, region, matched: false, confidence: it.confidence, macros: it.macros };
    })
  );
  let items = resolved.filter(Boolean);

  // === DETERMINISTIC FOOD COLORIMETRY CONSENSUS (teewai's moat) ===
  // Cross-check each item's AI-reported chromogenicity against the ACTUAL
  // color measured from the photo pixels (per-item region when the LLM gave a
  // bounding box). On disagreement, the measured chromogenicity wins (blended)
  // and the stain level is recomputed — so a pale food the AI over-rated or a
  // vividly pigmented food the AI under-rated is corrected by the real pixels,
  // not a second LLM guess. Mirrors the teeth-scan CIELAB consensus engine.
  await onProgress?.(4);
  items = await applyFoodConsensus(items, file);

  if (!items.length) {
    return { rejected: true, message: "I couldn't identify any food or drink in that photo. Try scanning something you'd eat or sip.", file_url };
  }

  return { items, file_url };
}