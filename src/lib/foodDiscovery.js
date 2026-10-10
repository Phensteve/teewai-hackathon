// Discovers foods not in the static stain catalog. When a scan doesn't match
// any catalog entry, the engine researches the food online (LLM + web search)
// to get calibrated staining properties, persists it to the DiscoveredFood
// entity, and reuses it on future scans — so unrufldfood keeps learning new
// local and regional foods automatically.

import { sanitizeForPrompt, wrapUntrusted, SYSTEM_GUARD } from './promptGuard';

export const nameKeyFor = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// Look up a previously-discovered food by its normalized name key.
import { discoveredFoods } from './insforgeDb';

export async function findDiscoveredFood(unrufld, name) {
  const key = nameKeyFor(name);
  if (!key) return null;
  try {
    const rows = await discoveredFoods.filter({ name_key: key });
    return rows && rows.length ? rows[0] : null;
  } catch {
    return null;
  }
}

// Persist a researched food so future scans of it are found instantly.
export async function saveDiscoveredFood(unrufld, data) {
  try {
    return await discoveredFoods.create({
      name: data.name,
      name_key: nameKeyFor(data.name),
      category: data.category || 'food',
      stain_level: data.stain_level,
      chromogenic: data.chromogenic,
      acidity: data.acidity,
      tannin: data.tannin,
      calories: data.calories,
      mitigation: data.mitigation,
      source: 'ai_discovered',
    });
  } catch {
    return null;
  }
}

// Research a food online (LLM with web search) and return calibrated staining
// properties. Used when the static catalog has no match.
export async function researchFoodOnline(unrufld, data) {
  try {
    const safeName = sanitizeForPrompt(data.name, 120);
    const safeCat = sanitizeForPrompt(data.category, 60);
    const res = await unrufld.integrations.Core.InvokeLLM({
      prompt: SYSTEM_GUARD + `You are a dental nutrition researcher. Research the food or drink described below THOROUGHLY using web sources to determine its real impact on tooth shade and extrinsic staining. ` + wrapUntrusted(`${safeName} (category: ${safeCat || 'food'})`, 'food name') + `

Cross-reference multiple reliable sources (dental journals, nutrition databases, food science references) and reason through:
1. INGREDIENTS: What are the main ingredients? Which are pigmented (chromogenic), acidic (erosive), or tannin-rich (astringent)?
2. PIGMENT: How intense is its color? Does it contain anthocyanins, caramel color, curcumin, betalains, or other strong pigments?
3. ACIDITY: What is its pH / titratable acidity? Citrus, vinegar, carbonated, or fermented foods erode enamel and open pores for stains.
4. TANNINS: Does it contain tannins/polyphenols (tea, wine, berries, some legumes) that bind to enamel proteins?
5. CONSISTENCY: Is it liquid, sticky, or solid? Sticky/viscous foods contact teeth longer and stain more.
6. TEMPERATURE: Typically consumed hot (opens enamel pores) or cold?
7. PORTION: What is a standard serving size and its calories?

Then estimate calibrated scores on a 0-100 scale:
- stain_level: overall tooth discoloration pressure (0 = none like water, 30 = mild like white rice, 60 = moderate like tea, 85+ = severe like coffee/red wine/curry)
- chromogenic: pigment intensity 0-100
- acidity: enamel-erosion risk 0-100
- tannin: tannin/polyphenol content 0-100
- mitigation: one practical, specific tip to reduce its staining (e.g. "Rinse with water immediately after" or "Use a straw")
- calories: typical calories for a standard portion (integer)

Be precise and evidence-based. Calibrate against known anchors: coffee ≈ 85, red wine ≈ 82, black tea ≈ 70, cola ≈ 65, curry ≈ 75, berries ≈ 55, citrus juice ≈ 45 (acid), white rice ≈ 8, water ≈ 0.
Return JSON. If sources are sparse, estimate from the closest comparable food.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          category: { type: 'string' },
          stain_level: { type: 'number' },
          chromogenic: { type: 'number' },
          acidity: { type: 'number' },
          tannin: { type: 'number' },
          mitigation: { type: 'string' },
          calories: { type: 'number' },
        },
      },
      model: 'gemini_3_1_pro',
    });
    if (!res || res.stain_level == null) return null;
    const clamp = (n) => Math.max(0, Math.min(100, Math.round(n ?? 0)));
    return {
      name: data.name || res.name || 'Unknown item',
      category: data.category || res.category || 'food',
      stain_level: clamp(res.stain_level),
      chromogenic: clamp(res.chromogenic),
      acidity: clamp(res.acidity),
      tannin: clamp(res.tannin),
      mitigation: res.mitigation || '',
      calories: Math.max(0, Math.round(res.calories ?? 0)),
    };
  } catch {
    return null;
  }
}