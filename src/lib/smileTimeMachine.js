// Smile Time Machine — projects a user's smile 1 / 3 / 5 years out under two
// paths (keep current habits vs follow the whitening plan). Grounded in the
// VITA shade ladder (vitaShade.js) + the scan's stain / health signals.
//
// This is a motivational projection, not a clinical prediction — real outcomes
// depend on enamel, habits and dental care. The model is deliberately simple
// and explainable: a stain-load-driven decline rate and a plan-driven path to
// the scan's measured whitening potential.

import { ALL_SHADES, shadeIndex, TOTAL_STEPS } from './vitaShade';

// Whiteness score (0–100) → ladder index (0 = lightest). Aligned with teewai's
// whiteness bands so the projection matches the shades users already see.
const SCORE_BANDS = [
  [95, 0], [90, 1], [85, 2], [82, 3], [76, 4], [70, 5], [64, 6], [60, 7],
  [55, 8], [50, 9], [45, 10], [40, 11], [35, 12], [30, 13], [25, 14],
  [20, 15], [15, 16], [10, 17], [0, 18],
];

export function scoreToIndex(score) {
  const s = Math.max(0, Math.min(100, score));
  for (const [threshold, idx] of SCORE_BANDS) if (s >= threshold) return idx;
  return TOTAL_STEPS - 1;
}

export function indexToShade(idx) {
  return ALL_SHADES[Math.max(0, Math.min(TOTAL_STEPS - 1, Math.round(idx)))];
}

// Stain load 0–100 from the scan's stain + health signals — drives the decline
// rate. More detected stain sources + lower dental health = faster darkening.
export function stainLoad(scan) {
  const stains = Array.isArray(scan?.stain_types)
    ? scan.stain_types
    : (Array.isArray(scan?.stains_detected) ? scan.stains_detected : []);
  const base = Math.min(60, stains.length * 14);
  const health = scan?.dental_health_score;
  const healthPenalty = health != null ? Math.max(0, (70 - health) * 0.4) : 0;
  return Math.min(100, Math.round(base + healthPenalty));
}

// Project the smile 1 / 3 / 5 years out.
//  decline — keep current staining habits; shade darkens ~0.8–2.4 steps/yr.
//  improve — follow the whitening plan; reach potential by year 1, then hold
//           (with a tiny maintenance drift so "hold" reads honestly).
export function projectTimeline(scan) {
  const cur = scan?.score ?? 60;
  const curIdx = scan?.shade_code ? Math.max(0, shadeIndex(scan.shade_code)) : scoreToIndex(cur);
  const potScore = scan?.whitening_potential_score ?? Math.min(100, cur + 12);
  const potIdx = scan?.whitening_potential_shade_code
    ? Math.max(0, shadeIndex(scan.whitening_potential_shade_code))
    : scoreToIndex(potScore);
  const load = stainLoad(scan);
  const declinePerYear = 0.8 + (load / 100) * 1.6;
  const years = [1, 3, 5];

  const decline = years.map((y) => {
    const idx = Math.min(TOTAL_STEPS - 1, curIdx + declinePerYear * y);
    const sh = indexToShade(idx);
    return { years: y, shadeCode: sh.code, hex: sh.hex, index: idx, score: Math.max(0, Math.round(cur - (idx - curIdx) * 4)) };
  });
  const improve = years.map((y) => {
    const rawIdx = y === 1 ? potIdx : Math.round(potIdx + 0.3 * (y - 1));
    // Cap: following the plan never leaves you darker than you are today —
    // the maintenance drift can fade slightly from peak whiteness but never
    // crosses back below the current shade (which would make "improve" read
    // worse than "do nothing" in year 5).
    const idx = Math.min(curIdx, rawIdx);
    const sh = indexToShade(idx);
    const score = Math.max(Math.round(cur), Math.round(potScore - 0.3 * (y - 1) * 4));
    return { years: y, shadeCode: sh.code, hex: sh.hex, index: idx, score };
  });

  const currentShade = indexToShade(curIdx);
  const potentialShade = indexToShade(potIdx);
  const fiveYearDelta = Math.round(decline[2].score - improve[2].score);
  const stepDelta = Math.round(decline[2].index - improve[2].index);
  return {
    current: { score: Math.round(cur), shadeCode: currentShade.code, hex: currentShade.hex, index: curIdx },
    potential: { score: Math.round(potScore), shadeCode: potentialShade.code, hex: potentialShade.hex, index: potIdx },
    stainLoad: load,
    declinePerYear,
    decline,
    improve,
    fiveYearDelta,
    stepDelta,
  };
}