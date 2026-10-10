// teewai stain-chemistry engine.
//
// The teeth-scan AI detects staining elements (stain_types: coffee, tea,
// red_wine, tobacco, …) and a per-type severity (stain_severity_per_type).
// This module turns that into a PROFESSIONAL breakdown: each element is
// classified by its underlying chemistry (chromogen / tannin / acid / intrinsic
// / biofilm), with a plain-language explanation, common sources, and a
// mitigation tip — the way a dental hygienist would explain it.
//
// Used twice:
//   1. At scan time (applyStainAnalysis) — persists `stain_breakdown` +
//      `stain_severity_per_type` on the scan record so the analysis is stored.
//   2. At display time (StainAnalysisCard) — renders the stored breakdown, or
//      rebuilds it on the fly for older scans that predate storage.

// Chemistry categories — the "why it stains" behind each element.
export const STAIN_CHEMISTRY = {
  chromogen: { label: 'Chromogen', blurb: 'Coloured pigment molecules that bind to the enamel surface.', tone: 'rose' },
  tannin: { label: 'Tannin', blurb: 'Plant polyphenols that act as a glue, fixing pigments onto enamel.', tone: 'amber' },
  acid: { label: 'Acid', blurb: 'Erodes and roughens enamel so stains cling more easily.', tone: 'orange' },
  intrinsic: { label: 'Intrinsic', blurb: 'Discoloration from within the tooth (dentin) — not a surface stain.', tone: 'slate' },
  biofilm: { label: 'Biofilm', blurb: 'Plaque or hardened calculus that yellows the surface.', tone: 'teal' },
};

// Library of staining elements teewai can detect. Keys are snake_case to match
// the AI's stain_types output. Each entry: chemistry drivers, common sources,
// a default severity, a one-line explanation, and a mitigation tip.
export const STAIN_LIBRARY = {
  coffee: {
    name: 'Coffee',
    chemistry: ['chromogen', 'tannin', 'acid'],
    sources: 'Coffee, espresso, latte, iced coffee',
    severityDefault: 'moderate',
    explain: 'Melanoidins and chlorogenic acid in coffee are dark pigments that readily bond to enamel.',
    mitigate: 'Rinse with water after, drink through a straw, and wait 30 minutes before brushing.',
  },
  tea: {
    name: 'Tea',
    chemistry: ['tannin', 'chromogen', 'acid'],
    sources: 'Black tea, green tea, iced tea, chai',
    severityDefault: 'moderate',
    explain: 'Tea is rich in theaflavins and thearubigins — tannins that stain even more than coffee.',
    mitigate: 'Add milk to bind tannins, rinse with water, and brush twice daily.',
  },
  red_wine: {
    name: 'Red wine',
    chemistry: ['chromogen', 'tannin', 'acid'],
    sources: 'Red wine, port, mulled wine',
    severityDefault: 'moderate',
    explain: 'Anthocyanin pigments plus grape tannins create a deep purple-blue stain that clings to enamel.',
    mitigate: 'Pair with cheese, rinse with water, and brush before (not right after) drinking.',
  },
  tobacco: {
    name: 'Tobacco',
    chemistry: ['chromogen', 'tannin'],
    sources: 'Cigarettes, cigars, chewing tobacco',
    severityDefault: 'heavy',
    explain: 'Tar and nicotine penetrate enamel deeply, producing a stubborn yellow-brown stain.',
    mitigate: 'Quitting is the only true fix; professional cleaning and whitening can reduce it.',
  },
  cola: {
    name: 'Cola / dark soda',
    chemistry: ['chromogen', 'acid'],
    sources: 'Cola, root beer, dark energy drinks',
    severityDefault: 'moderate',
    explain: 'Caramel colour plus phosphoric acid both stains and erodes enamel, making it more porous.',
    mitigate: 'Switch to clear drinks, use a straw, and rinse with water afterward.',
  },
  curry: {
    name: 'Curry / turmeric',
    chemistry: ['chromogen'],
    sources: 'Curry, turmeric, palm-oil stews',
    severityDefault: 'moderate',
    explain: 'Curcumin is a vivid yellow pigment that deposits on enamel with repeated exposure.',
    mitigate: 'Rinse with water after eating and brush within the hour.',
  },
  berries: {
    name: 'Berries',
    chemistry: ['chromogen', 'acid'],
    sources: 'Blueberries, blackberries, pomegranate',
    severityDefault: 'mild',
    explain: 'Anthocyanin pigments give berries their rich colour and a mild staining potential.',
    mitigate: 'Rinse with water and pair with dairy to buffer the acid.',
  },
  tomato_sauce: {
    name: 'Tomato sauce',
    chemistry: ['chromogen', 'acid'],
    sources: 'Tomato stew, ketchup, pasta sauce',
    severityDefault: 'mild',
    explain: 'Lycopene pigment and natural acidity can leave a faint orange tint over time.',
    mitigate: 'Rinse with water and eat with cheese or bread to reduce contact.',
  },
  soy_sauce: {
    name: 'Soy sauce',
    chemistry: ['chromogen'],
    sources: 'Soy sauce, dark gravies',
    severityDefault: 'mild',
    explain: 'Dark melanoidin pigments coat the enamel surface during meals.',
    mitigate: 'Rinse with water after eating and brush regularly.',
  },
  beetroot: {
    name: 'Beetroot',
    chemistry: ['chromogen'],
    sources: 'Beetroot, zobo (hibiscus)',
    severityDefault: 'mild',
    explain: 'Betanin is an intense red-purple pigment that can temporarily tint enamel.',
    mitigate: 'Rinse with water promptly after consuming.',
  },
  medication_tetracycline: {
    name: 'Tetracycline medication',
    chemistry: ['intrinsic'],
    sources: 'Tetracycline antibiotics (often in childhood)',
    severityDefault: 'heavy',
    explain: 'Tetracycline chelates calcium inside the dentin, causing deep grey-brown bands that surface stains cannot remove.',
    mitigate: 'This is intrinsic — see a dentist for veneers, bonding, or deep whitening.',
  },
  aging: {
    name: 'Aging',
    chemistry: ['intrinsic'],
    sources: 'Natural enamel thinning over time',
    severityDefault: 'mild',
    explain: 'As enamel thins with age, the yellow dentin beneath shows through more.',
    mitigate: 'Gentle whitening and enamel-friendly toothpaste help preserve brightness.',
  },
  fluorosis: {
    name: 'Fluorosis',
    chemistry: ['intrinsic'],
    sources: 'Excess fluoride (often in childhood)',
    severityDefault: 'mild',
    explain: 'Excess fluoride during tooth development causes white or brown mottling within the enamel.',
    mitigate: 'A dentist can offer microabrasion, whitening, or bonding to even the colour.',
  },
  plaque: {
    name: 'Plaque',
    chemistry: ['biofilm'],
    sources: 'Soft bacterial biofilm along the gumline',
    severityDefault: 'mild',
    explain: 'Soft plaque biofilm appears yellow and can be removed with thorough brushing and flossing.',
    mitigate: 'Brush twice daily, floss daily, and clean along the gumline.',
  },
  calculus: {
    name: 'Calculus (tartar)',
    chemistry: ['biofilm'],
    sources: 'Hardened plaque, often behind the lower front teeth',
    severityDefault: 'moderate',
    explain: 'Calculus is mineralized plaque that bonds firmly to the teeth and stains yellow-brown.',
    mitigate: 'Only a professional scaling can remove calculus — book a cleaning.',
  },
};

const normKey = (t) => String(t || '').toLowerCase().trim().replace(/[\s\-]+/g, '_');

// Build the professional stain breakdown from either the raw AI result or a
// stored scan entity. Returns an array of { type, name, chemistry, severity,
// sources, explain, mitigate }. Empty array when nothing was detected.
export function buildStainBreakdown(input = {}) {
  if (!input) return [];
  const types = Array.isArray(input.stain_types) && input.stain_types.length
    ? input.stain_types
    : (Array.isArray(input.stains_detected) ? input.stains_detected : []);
  const severityMap = input.stain_severity_per_type || {};
  const seen = new Set();
  const items = [];
  for (const t of types) {
    const key = normKey(t);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const lib = STAIN_LIBRARY[key];
    const name = lib?.name || String(t).replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
    items.push({
      type: key,
      name,
      chemistry: lib?.chemistry || ['chromogen'],
      severity: severityMap[key] || lib?.severityDefault || 'moderate',
      sources: lib?.sources || '',
      explain: lib?.explain || 'A staining element detected on the enamel surface.',
      mitigate: lib?.mitigate || 'Rinse with water after exposure and maintain your brushing routine.',
    });
  }
  return items;
}

// Scan-time persistence (mirrors applyColorimetricConsensus). Computes the
// breakdown from the raw AI result and writes it + the severity map onto the
// scan record so it is stored and auditable. Best-effort: never blocks the scan.
export const applyStainAnalysis = async (scan, aiResult, insforgeScans) => {
  if (!scan?.id || !insforgeScans) return;
  try {
    const breakdown = buildStainBreakdown(aiResult || {});
    const severityMap = (aiResult && aiResult.stain_severity_per_type) || {};
    if (!breakdown.length && !Object.keys(severityMap).length) return;
    await insforgeScans.update(scan.id, {
      stain_breakdown: breakdown,
      stain_severity_per_type: severityMap,
    });
  } catch {}
};