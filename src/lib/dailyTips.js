// Daily tip pools for the dashboard. Each day a deterministic tip is picked
// from the pool so the tip changes daily but stays consistent within the same
// day. Dismissal is per-day per-tip so a new tip always appears the next day.
//
// Each tip carries an optional `illustration` (themed tooth SVG) and
// `chart_type` + `chart_label` (mini data viz) rendered in the expanded modal.

export const INFO_TIPS = [
  {
    id: 'purple-strip',
    title: 'The purple strip trick',
    body: "Purple strips and serums don't whiten, they paint.",
    hasExplainer: true,
    illustration: 'tooth_violet',
  },
  {
    id: 'vita-letters',
    title: 'What VITA shade letters mean',
    body: 'A is reddish brown, B is reddish yellow, C is gray, D is reddish gray. Most people fall in the A range.',
    illustration: 'tooth_yellow',
  },
  {
    id: 'how-whitening-works',
    title: 'How whitening actually works',
    body: 'Peroxide breaks stain molecules into smaller pieces that are colorless. The stain does not come off, it becomes invisible to the eye.',
    illustration: 'tooth_wipe',
  },
  {
    id: 'what-causes-stains',
    title: 'What causes most stains',
    body: 'Chromogens are colored molecules from coffee, tea, and wine. Tannins help them stick to enamel. The longer the contact, the deeper the stain.',
    illustration: 'tooth_stain',
  },
  {
    id: 'enamel-age',
    title: 'Why teeth yellow with age',
    body: 'Enamel thins over time and the yellow dentin underneath shows through. This is natural and happens to everyone.',
    illustration: 'tooth_yellow',
  },
  {
    id: 'reference-card',
    title: 'Why reference cards matter',
    body: 'A white or gray card next to your teeth calibrates the color reading. Without it, lighting and phone cameras shift the shade result.',
    illustration: 'tooth_clean',
  },
  {
    id: 'bleached-guide',
    title: 'The bleached shade guide',
    body: 'VITA has a separate guide for whitened teeth: 0M1, 0M2, 0M3. If your scan matches one, you have had professional whitening done.',
    illustration: 'tooth_clean',
  },
  {
    id: 'water-teeth',
    title: 'Water helps your teeth',
    body: 'Drinking water after staining foods rinses the surface. It also keeps you hydrated, which means more saliva to protect enamel.',
    illustration: 'tooth_clean',
    chart_type: 'water_drymouth',
    chart_label: 'More water means more saliva — your enamel’s natural shield against stains and dryness.',
  },
];

export const LIFESTYLE_TIPS = [
  {
    id: 'brush-two-min',
    title: 'Brush for two full minutes',
    body: 'Split the time into 30 seconds per corner of your mouth. Gentle circles, not scrubbing.',
    illustration: 'tooth_brush',
    chart_type: 'brush_vs_stain',
    chart_label: 'Stain score falls as brushing frequency rises over weeks.',
  },
  {
    id: 'floss-before',
    title: 'Floss before you brush',
    body: 'Flossing first loosens plaque and food between teeth. Brushing after clears it all away and the fluoride reaches between your teeth.',
    illustration: 'tooth_brush',
  },
  {
    id: 'wait-after-eating',
    title: 'Wait 30 minutes after eating',
    body: 'Acid in food softens your enamel for about half an hour. Brushing too soon can wear it down. Wait, then brush.',
    illustration: 'tooth_clean',
    chart_type: 'sugar_timeline',
    chart_label: 'Sugar exposure spikes after meals; waiting 30 minutes lets enamel recover before brushing.',
  },
  {
    id: 'clean-tongue',
    title: 'Clean your tongue daily',
    body: 'Bacteria build up on your tongue and cause most bad breath. Brush or scrape it gently from back to front once a day.',
    illustration: 'tooth_brush',
  },
  {
    id: 'soft-bristles',
    title: 'Use soft bristles',
    body: 'Hard bristles can damage your gums and wear down enamel. Soft bristles clean just as well without the harm.',
    illustration: 'tooth_brush',
  },
  {
    id: 'replace-brush',
    title: 'Replace your brush every 3 months',
    body: 'Worn bristles do not clean well. Change your brush or brush head every three months, or sooner if the bristles fray.',
    illustration: 'tooth_brush',
    chart_type: 'plaque_buildup',
    chart_label: 'Worn bristles clear less plaque — it accumulates faster between replacements.',
  },
  {
    id: 'dont-rinse',
    title: 'Spit, do not rinse after brushing',
    body: 'Spit out the toothpaste but do not rinse with water. Leaving a thin layer of fluoride on your teeth protects them through the night.',
    illustration: 'tooth_clean',
  },
  {
    id: 'water-after-coffee',
    title: 'Drink water after coffee',
    body: 'A few sips of water right after coffee washes away the dark pigments before they settle into your enamel.',
    illustration: 'tooth_clean',
    chart_type: 'water_drymouth',
    chart_label: 'A sip of water after coffee rinses pigments and keeps saliva flowing.',
  },
];

// Deterministic daily pick: hash the date string to get a stable index so
// every user sees the same tip on the same day, but it changes each day.
// The offset shifts the selection so two pools on the same day pick
// different tips.
export function getDailyTip(tips, offset = 0) {
  if (!tips || tips.length === 0) return null;
  const date = new Date();
  const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  const index = (Math.abs(hash) + offset) % tips.length;
  return tips[index];
}

export function getTodayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

// Lookup a full tip (with illustration + chart fields) by id. Used by the
// Tip History page to enrich stored entries that only carry id/title/body.
const ALL_TIPS_MAP = {};
[...INFO_TIPS, ...LIFESTYLE_TIPS].forEach((t) => { ALL_TIPS_MAP[t.id] = t; });
export function getTipById(id) {
  return ALL_TIPS_MAP[id] || null;
}

// Per-user, per-day random pick from a list of active Tip entity records.
// Seeded by userId + date + category so each user sees a different tip each
// day, but it stays consistent within the same day for that user.
export function pickRandomTip(tips, userId, category) {
  const pool = (tips || []).filter(
    (t) => t.category === category && (t.audience === 'all' || t.audience === 'patient')
  );
  if (pool.length === 0) return null;
  const date = new Date();
  const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const seed = `${userId || 'anon'}-${dateStr}-${category}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return pool[Math.abs(hash) % pool.length];
}