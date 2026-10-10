// Dental Routine generation engine — deterministic, no LLM credit cost.
//
// Builds a personalized daily routine from a teeth scan + recent food logs.
// The routine is structured into morning steps, evening steps, dietary
// guidance, and targeted stain mitigation. Certain steps are "locked" with
// an anti-recommendation reason — the user is told NOT to change/skip them
// because of a detected condition (heavy plaque, gum inflammation, etc.).
//
// The routine auto-modifies when a new scan or food log indicates a change.
// Each auto-modification is logged so the user can see what changed and why.
//
// Design principles (research-backed):
//   • Bass technique brushing 2min, 2x/day (ADA)
//   • Floss once daily before bedtime (ADA)
//   • Wait 30min after acidic meals before brushing (enamel remineralization)
//   • Rinse with water after chromogenic/tannin-rich items (stain dilution)
//   • Fluoride mouthwash for high-caries-risk / plaque (evidence-based)
//   • Braces/aligners: interdental brush + water flosser (orthodontic hygiene)

import { STAIN_LIBRARY } from './stainAnalysis';

// --- Icon key → lucide name mapping (kept here so the entity stays lean) ---
export const ROUTINE_ICONS = {
  brush: 'Brush',
  floss: 'Floss',
  rinse: 'Rinse',
  water: 'Droplets',
  timer: 'Timer',
  shield: 'Shield',
  mouthwash: 'GlassWater',
  diet: 'Apple',
  coffee: 'Coffee',
  warning: 'AlertTriangle',
};

// --- Standard base steps every routine starts from ---
const BASE_MORNING = [
  { id: 'am-brush', label: 'Brush for 2 minutes', detail: 'Soft-bristled brush, fluoride toothpaste, Bass technique (45° angle at the gumline).', icon: 'brush' },
  { id: 'am-tongue', label: 'Scrape your tongue', detail: 'A few gentle passes from back to front to remove bacteria and freshen breath.', icon: 'rinse' },
];

const BASE_EVENING = [
  { id: 'pm-floss', label: 'Floss between every tooth', detail: 'Curve the floss around each tooth in a C-shape and slide it under the gumline. Do this BEFORE brushing.', icon: 'floss' },
  { id: 'pm-brush', label: 'Brush for 2 minutes', detail: 'Same Bass technique as the morning. Do not rinse with water after — spit out the excess so the fluoride stays on your teeth overnight.', icon: 'brush' },
];

// --- Lock reasons (anti-recommendations) ---
// A locked step shows: "Do not change this — <reason>"
const LOCK_REASONS = {
  plaqueModerate: 'Your last scan found moderate plaque. Skipping this step lets plaque harden into tartar within 24–48 hours, which only a dentist can remove.',
  plaqueHeavy: 'Your last scan found heavy plaque. This step is essential — without it, plaque will calcify into calculus and inflame your gums.',
  gumInflammation: 'Your gums show signs of inflammation. This step directly reduces the bacteria causing the swelling. Skipping it will worsen gum disease.',
  gumPoor: 'Your gum health is poor. This step is non-negotiable — your gums need consistent care to reverse early periodontal damage.',
  enamelAcid: 'Your enamel shows acid erosion. Changing this step would accelerate enamel loss and increase sensitivity.',
  coffeeStain: 'Your scan detected coffee staining. This step is what keeps the stain from deepening between scans.',
  teaStain: 'Your scan detected tea staining. Tea tannins bond even more strongly than coffee — this step is what controls them.',
  tobaccoStain: 'Your scan detected tobacco staining. This is the only step that slows the deep yellow-brown deposits.',
  highAcidity: 'Your recent food logs are high in acid. This step protects your enamel from continued erosion.',
  highChromogen: 'Your recent food logs are high in chromogens (pigment molecules). This step prevents new stains from setting.',
  highTannin: 'Your recent food logs are high in tannins. Tannins act as glue for pigments — this step breaks the bond.',
  braces: 'You have braces. Food traps around brackets and wires; skipping this step causes permanent white-spot lesions around the brackets.',
};

// --- Severity helpers ---
const norm = (s) => String(s || '').toLowerCase().trim();

// --- Build the routine from a scan + recent food logs ---
export function buildRoutine({ scan, foodLogs = [], applianceType = 'none', existingRoutine = null }) {
  if (!scan) return null;

  const stains = Array.isArray(scan.stain_types) ? scan.stain_types : (Array.isArray(scan.stains_detected) ? scan.stains_detected : []);
  const severityMap = scan.stain_severity_per_type || {};
  const gumHealth = norm(scan.gum_health);
  const plaqueLevel = norm(scan.plaque_level);
  const enamelCondition = norm(scan.enamel_condition);
  const healthScore = scan.dental_health_score ?? null;
  const whitenessScore = scan.score ?? null;

  // --- Morning steps ---
  const morning = [...BASE_MORNING];

  // Mouthwash if high plaque or gum issues
  if (plaqueLevel === 'moderate' || plaqueLevel === 'heavy' || gumHealth === 'fair' || gumHealth === 'poor') {
    morning.push({
      id: 'am-mouthwash',
      label: 'Fluoride mouthwash',
      detail: 'Swish for 30 seconds. Use an alcohol-free fluoride rinse — alcohol-based rinses dry out the tissues and worsen bad breath.',
      icon: 'mouthwash',
      locked: true,
      lockReason: gumHealth === 'poor' ? LOCK_REASONS.gumPoor
        : plaqueLevel === 'heavy' ? LOCK_REASONS.plaqueHeavy
        : LOCK_REASONS.plaqueModerate,
    });
  }

  // Water rinse in the morning if high acidity in recent food
  const foodStats = aggregateFoodChemistry(foodLogs);
  if (foodStats.acidity >= 50) {
    morning.push({
      id: 'am-water',
      label: 'Rinse with water',
      detail: 'A quick water swish first thing neutralizes overnight acid and washes away bacteria.',
      icon: 'water',
      locked: true,
      lockReason: LOCK_REASONS.highAcidity,
    });
  }

  // --- Evening steps ---
  const evening = [...BASE_EVENING];

  // Lock evening floss if plaque or gum issues
  if (plaqueLevel === 'moderate' || plaqueLevel === 'heavy' || gumHealth === 'fair' || gumHealth === 'poor') {
    evening[0] = {
      ...evening[0],
      locked: true,
      lockReason: gumHealth === 'poor' ? LOCK_REASONS.gumPoor
        : gumHealth === 'fair' ? LOCK_REASONS.gumInflammation
        : plaqueLevel === 'heavy' ? LOCK_REASONS.plaqueHeavy
        : LOCK_REASONS.plaqueModerate,
    };
  }

  // Lock evening brush if gum or plaque issues
  if (plaqueLevel === 'moderate' || plaqueLevel === 'heavy' || gumHealth === 'fair' || gumHealth === 'poor') {
    evening[1] = {
      ...evening[1],
      locked: true,
      lockReason: gumHealth === 'poor' ? LOCK_REASONS.gumPoor
        : gumHealth === 'fair' ? LOCK_REASONS.gumInflammation
        : plaqueLevel === 'heavy' ? LOCK_REASONS.plaqueHeavy
        : LOCK_REASONS.plaqueModerate,
    };
  }

  // Interdental brush / water flosser for braces
  if (applianceType && applianceType !== 'none' && applianceType !== 'retainer') {
    evening.splice(1, 0, {
      id: 'pm-interdental',
      label: 'Clean around brackets',
      detail: 'Use an interdental brush or water flosser to clear food from around every bracket and wire.',
      icon: 'floss',
      locked: true,
      lockReason: LOCK_REASONS.braces,
    });
  }

  // Wait 30 min after acidic meals before brushing (enamel)
  if (enamelCondition.includes('eros') || enamelCondition.includes('thin') || foodStats.acidity >= 50) {
    evening.push({
      id: 'pm-wait',
      label: 'Wait 30 min after dinner before brushing',
      detail: 'Acidic food softens your enamel. Brushing immediately scrubs the softened layer away. Waiting 30 minutes lets your saliva re-harden it first.',
      icon: 'timer',
      locked: true,
      lockReason: LOCK_REASONS.enamelAcid,
    });
  }

  // --- Dietary guidance ---
  const dietary = [];

  // Per-stain-type guidance
  const stainGuidance = {
    coffee: { label: 'Limit coffee to 2 cups', detail: 'Rinse with water after each cup. Use a straw for iced coffee to bypass your front teeth.', severity: 'warning' },
    tea: { label: 'Add milk to tea', detail: 'Milk proteins bind tea tannins so they cannot stick to your enamel. Black tea stains more than coffee.', severity: 'warning' },
    red_wine: { label: 'Pair red wine with cheese', detail: 'Cheese coats your teeth with calcium and neutralizes the wine acid. Rinse with water between glasses.', severity: 'warning' },
    tobacco: { label: 'Reduce tobacco use', detail: 'Tar and nicotine penetrate deep into enamel. Quitting is the only true fix; professional cleaning can reduce the stain.', severity: 'danger' },
    cola: { label: 'Switch to clear drinks', detail: 'Cola combines dark caramel pigment with phosphoric acid — it stains AND erodes. Use a straw if you must.', severity: 'warning' },
    curry: { label: 'Rinse after curry', detail: 'Curcumin is a vivid yellow pigment. Rinse with water right after eating and brush within the hour.', severity: 'info' },
    berries: { label: 'Pair berries with dairy', detail: 'Anthocyanin pigments stain less when eaten with yogurt or milk, which buffers the acid too.', severity: 'info' },
    tomato_sauce: { label: 'Rinse after tomato dishes', detail: 'Lycopene plus natural acidity can leave a faint orange tint. Eat with bread or cheese to reduce contact.', severity: 'info' },
    soy_sauce: { label: 'Rinse after soy sauce', detail: 'Dark melanoidin pigments coat the enamel. A quick water rinse after the meal is enough.', severity: 'info' },
    beetroot: { label: 'Rinse promptly after beetroot', detail: 'Betanin is an intense red-purple pigment. Rinse with water immediately after consuming.', severity: 'info' },
  };

  stains.forEach((st) => {
    const key = String(st).toLowerCase().trim().replace(/[\s-]+/g, '_');
    const g = stainGuidance[key];
    if (g) {
      const sev = severityMap[key] || '';
      dietary.push({
        id: `diet-${key}`,
        label: g.label,
        detail: g.detail,
        severity: g.severity,
        locked: sev === 'heavy' || sev === 'moderate',
        lockReason: sev === 'heavy' ? LOCK_REASONS[`${key}Stain`] || `Your scan found heavy ${key} staining — this guidance is what controls it.` : null,
      });
    }
  });

  // Food-log-driven guidance
  if (foodStats.chromogenic >= 50 && !dietary.some((d) => d.id === 'diet-chromogen')) {
    dietary.push({
      id: 'diet-chromogen',
      label: 'Rinse after pigmented foods',
      detail: 'Your recent meals are high in chromogens (pigment molecules). A water rinse right after eating cuts the stain load by half.',
      severity: 'warning',
      locked: true,
      lockReason: LOCK_REASONS.highChromogen,
    });
  }
  if (foodStats.tannin >= 50 && !dietary.some((d) => d.id === 'diet-tannin')) {
    dietary.push({
      id: 'diet-tannin',
      label: 'Rinse after tannin-rich foods',
      detail: 'Tannins (in tea, wine, berries) act as glue for pigments. A water rinse breaks the bond before it sets.',
      severity: 'warning',
      locked: true,
      lockReason: LOCK_REASONS.highTannin,
    });
  }
  if (foodStats.acidity >= 50 && !dietary.some((d) => d.id === 'diet-acid')) {
    dietary.push({
      id: 'diet-acid',
      label: 'Rinse with water after acidic meals',
      detail: 'Acid softens enamel. Rinse with water (not brush) right after eating to neutralize the acid without scrubbing your enamel.',
      severity: 'warning',
      locked: true,
      lockReason: LOCK_REASONS.highAcidity,
    });
  }

  // --- Stain mitigation (targeted actions per detected stain) ---
  const mitigation = [];
  stains.forEach((st) => {
    const key = String(st).toLowerCase().trim().replace(/[\s-]+/g, '_');
    const lib = STAIN_LIBRARY[key];
    if (lib?.mitigate) {
      mitigation.push({
        id: `mit-${key}`,
        label: `For ${lib.name.toLowerCase()}`,
        detail: lib.mitigate,
        stain_type: key,
      });
    }
  });

  // --- Title + summary ---
  const topStains = stains.slice(0, 2).map((s) => STAIN_LIBRARY[String(s).toLowerCase().trim().replace(/[\s-]+/g, '_')]?.name || s);
  let title = 'Your daily smile routine';
  if (topStains.length) title = `${topStains.join(' + ')} defense routine`;
  else if (gumHealth === 'poor' || gumHealth === 'fair') title = 'Gum-care recovery routine';
  else if (whitenessScore != null && whitenessScore < 50) title = 'Brightening routine';

  const summaryParts = [];
  if (whitenessScore != null) summaryParts.push(`your whiteness score is ${Math.round(whitenessScore)}`);
  if (healthScore != null) summaryParts.push(`dental health is ${Math.round(healthScore)}`);
  if (stains.length) summaryParts.push(`we detected ${stains.length} staining factor${stains.length > 1 ? 's' : ''} (${topStains.join(', ').toLowerCase()})`);
  if (gumHealth) summaryParts.push(`gum health is ${gumHealth}`);
  if (plaqueLevel) summaryParts.push(`plaque is ${plaqueLevel}`);
  const summary = `This routine was built from your latest scan${summaryParts.length ? ' — ' + summaryParts.join(', ') : ''}. The locked steps have an anti-recommendation: do not change or skip them, because the scan found a condition they directly address. Tap any locked step to see why.`;

  return {
    title,
    summary,
    morning_steps: morning,
    evening_steps: evening,
    dietary_guidance: dietary,
    stain_mitigation: mitigation,
    auto_modifications: existingRoutine?.auto_modifications || [],
  };
}

// --- Aggregate recent food logs into chemistry averages ---
function aggregateFoodChemistry(foodLogs = []) {
  if (!foodLogs?.length) return { chromogenic: 0, tannin: 0, acidity: 0 };
  // Last 7 days
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = foodLogs.filter((l) => {
    if (!l.log_date) return true;
    return new Date(l.log_date).getTime() >= cutoff;
  });
  if (!recent.length) return { chromogenic: 0, tannin: 0, acidity: 0 };
  const avg = (key) => {
    const vals = recent.map((l) => Number(l[key] || 0)).filter((v) => Number.isFinite(v));
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  };
  return {
    chromogenic: avg('chromogenic'),
    tannin: avg('tannin'),
    acidity: avg('acidity'),
  };
}

// --- Compute auto-modifications when a new scan or food log comes in ---
// Returns an array of modification entries to append to auto_modifications.
export function computeAutoModifications({ newScan, foodLogs = [], existingRoutine }) {
  if (!existingRoutine) return [];
  const mods = [];
  const existingIds = new Set([
    ...existingRoutine.morning_steps.map((s) => s.id),
    ...existingRoutine.evening_steps.map((s) => s.id),
    ...(existingRoutine.dietary_guidance || []).map((s) => s.id),
  ]);

  // Scan-triggered: new stains not in the current routine's mitigation
  if (newScan) {
    const stains = Array.isArray(newScan.stain_types) ? newScan.stain_types : (Array.isArray(newScan.stains_detected) ? newScan.stains_detected : []);
    stains.forEach((st) => {
      const key = String(st).toLowerCase().trim().replace(/[\s-]+/g, '_');
      const mitId = `mit-${key}`;
      if (!existingIds.has(mitId)) {
        const lib = STAIN_LIBRARY[key];
        if (lib?.mitigate) {
          mods.push({
            date: new Date().toISOString(),
            trigger: 'scan',
            change: `Added stain mitigation for ${lib.name.toLowerCase()}`,
            reason: `Your latest scan detected ${lib.name.toLowerCase()} staining.`,
          });
        }
      }
    });
  }

  // Food-triggered: high chemistry averages not already in dietary guidance
  const stats = aggregateFoodChemistry(foodLogs);
  if (stats.acidity >= 50 && !existingIds.has('diet-acid')) {
    mods.push({
      date: new Date().toISOString(),
      trigger: 'food_log',
      change: 'Added "Rinse after acidic meals" guidance',
      reason: 'Your recent food logs show high acidity.',
    });
  }
  if (stats.chromogenic >= 50 && !existingIds.has('diet-chromogen')) {
    mods.push({
      date: new Date().toISOString(),
      trigger: 'food_log',
      change: 'Added "Rinse after pigmented foods" guidance',
      reason: 'Your recent food logs show high chromogen intake.',
    });
  }
  if (stats.tannin >= 50 && !existingIds.has('diet-tannin')) {
    mods.push({
      date: new Date().toISOString(),
      trigger: 'food_log',
      change: 'Added "Rinse after tannin-rich foods" guidance',
      reason: 'Your recent food logs show high tannin intake.',
    });
  }

  return mods;
}