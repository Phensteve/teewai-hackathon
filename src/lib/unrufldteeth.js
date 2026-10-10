// unrufldteeth™ — teewai's proprietary dental intelligence core.
//
// WHY THIS EXISTS (the "moat"):
// teewai's defensibility is not a bigger model — anyone can call Gemini. It is
// the calibrated, deterministic layer that turns a raw photo into a clinically
// grounded, gamified, personalized journey. This module owns that layer as a
// single, documented, portable engine: scoring, shade mapping, clinical-index
// interpretation, severity grading, per-tooth color rendering, plan seeding,
// output diversification, the MMR ladder (via gamification.js), and a deep
// research knowledge base of dormant features for upcoming releases.
//
// CONSOLIDATED: teewaiTeeth.js is now part of unrufldteeth. This single module
// owns the calibrated scoring (computeProprietaryScore), the 25-level health
// gradient (HEALTH_LEVELS), VITA shade mapping (shadeFromScore), and the shared
// vision prompt/schema re-export — everything that used to live in two files.
//
// Research grounding: Silness & Löe Plaque Index, Löe & Silness Gingival Index,
// Basic Erosive Wear Examination (BEWE), DMF/DMFS index, ICDAS, VITA Classical
// (A1-D4), VITA Bleached (0M1-0M3) & VITA 3D-MASTER, CPI/PSR (WHO/AAP),
// OHI-S (Greene & Vermillion 1964), Quigley-Haene/Turesky, Smith & Knight TWI,
// CAMBRA, Bolton Analysis, Nordland Papilla Classification, DAI/IOTN,
// Frankl Behavior Rating, Gingival Biotype, Smile Line classification, and
// historical practices (miswak, oil pulling, neem, charcoal).
// Pure functions, no PII, no side effects — safe client-side and server-side.

// NOTE: the proprietary vision prompt (buildTeewaiPrompt, TEEWAI_RESPONSE_SCHEMA,
// buildBracesPrompt, BRACES_RESPONSE_SCHEMA) is NOT re-exported here. The scan
// flow calls the analyzeScan backend function, which builds the prompt
// server-side — so the prompt never reaches the browser bundle. Re-exporting
// it here would publish the full clinical prompt (teewai's core IP) to anyone
// who opens DevTools → Sources. Do NOT re-add this re-export.

// Pure scoring core (computeProprietaryScore, shadeFromScore, reconcilePlaqueCaries,
// postProcess, buildScanPayload) lives in base44/shared/scoring.ts so the
// analyzeScan backend runs the identical deterministic math server-side. Imported
// as local bindings (fastEstimate uses shadeFromScore) and re-exported to keep
// the existing client API (imports from unrufldteeth) working.
import {
  computeProprietaryScore,
  shadeFromScore,
  reconcilePlaqueCaries,
  postProcess,
  buildScanPayload,
} from "../../base44/shared/scoring";
export {
  computeProprietaryScore,
  shadeFromScore,
  reconcilePlaqueCaries,
  postProcess,
  buildScanPayload,
};

// Dormant insights — computed inside buildScanPayload (server + client), so
// every scan stores the advanced engine metrics. Re-exported for direct use.
export { computeDormantInsights } from "../../base44/shared/dormantInsights.ts";

// Extended clinical framework layer (v3.1) — AAP/EFP 2018 periodontal staging &
// grading, CAST, PUFA, Nyvad activity, Dean/TF fluorosis, MIH, Root Caries Index,
// Cariogram, smile proportion analysis and recession classification. Lives in a
// focused module; re-exported here so the engine keeps a single public surface.
export {
  CLINICAL_FRAMEWORKS_V2,
  periodontitisStage,
  periodontitisGrade,
  periodontitisExtent,
  periodontalCaseDefinition,
  castFromLesion,
  castLabel,
  pufaScore,
  nyvadActivity,
  rootCariesIndex,
  cariogramChance,
  deansFluorosisIndex,
  tfIndex,
  mihSeverity,
  smileProportionAnalysis,
  centralIncisorRatio,
  recessionClassification,
} from './unrufldteethClinical';

// Shared canvas sampling core — one tooth-pixel definition for preAnalyze and
// fastEstimate (they used to carry separate, slightly divergent loops).
import { sampleToothPixels, yellowIndexFrom, angleHintFrom, loadImage } from './unrufldteethPixels';
export { sampleToothPixels };
import { detectVioletCast } from './violetCast';

export const UNRUFLDTEETH_VERSION = '3.1';

export const UNRUFLDTEETH_MANIFEST = {
  version: '3.1',
  consolidated_from: 'teewaiTeeth.js (scoring + health gradient + shade map + vision re-export)',
  modules: {
    'unrufldteethClinical.js': 'extended validated frameworks (AAP/EFP 2018, CAST, PUFA, Nyvad, Dean/TF, MIH, RCI, Cariogram, smile proportion, recession)',
    'unrufldteethPixels.js': 'shared single-pass canvas sampling core',
  },
  owns: [
    'research knowledge base (Silness-Löe, Löe-Silness, BEWE, DMF/DMFS, ICDAS, VITA, CPI/PSR, OHI-S, TWI, CAMBRA, Bolton, Nordland, DAI/IOTN, Frankl, biotype, smile line, ancient practices)',
    'AAP/EFP 2018 periodontitis staging & grading (stage I-IV, grade A-C, extent)',
    'CAST caries spectrum + PUFA consequences + Nyvad lesion activity',
    'Dean / Thylstrup-Fejerskov fluorosis & EAPD MIH differentiation',
    'Root Caries Index + Cariogram multifactorial risk probability',
    'smile aesthetics: golden & RED proportion, central incisor W:H ratio',
    'Miller / Cairo gingival recession classification & coverage prognosis',
    'engine involvement: preAnalyze (before AI) + postProcess (after AI)',
    'plaque/caries reconciliation vs clinical indices',
    'ICDAS 0-6 caries detection & assessment mapping',
    'live/dormant feature registry (store for upcoming features)',
    'calibrated whiteness scoring (computeProprietaryScore)',
    '25-level health gradient (HEALTH_LEVELS) + per-tooth color rendering',
    'VITA Classical + Bleached + 3D-MASTER shade mapping (shadeFromScore)',
    'clinical-index interpretation (plaque / gingival / BEWE / DMF / CPI / OHI-S / TWI)',
    'severity grading & 10-band color system',
    'one-scan personalized plan seeding',
    'output diversification (impact / budget spread)',
    'MMR ranked ladder (gamification.js)',
  ],
  principles: [
    'AI extracts raw metrics; deterministic math computes final scores',
    'no PII is processed by this engine',
    'pure functions, no side effects, portable across runtimes',
  ],
};

// 25 granular health levels with smooth in-betweens for an ultra-fine green-to-red gradient.
export const HEALTH_LEVELS = [
  { key: 'pristine',  min: 96, color: '#0d9f8e', label: 'Pristine' },
  { key: 'luminous',  min: 92, color: '#16c2a6', label: 'Luminous' },
  { key: 'radiant',   min: 88, color: '#2dd4bf', label: 'Radiant' },
  { key: 'excellent', min: 84, color: '#5eead4', label: 'Excellent' },
  { key: 'bright',    min: 80, color: '#8af0dc', label: 'Bright' },
  { key: 'very_good', min: 76, color: '#a7f3d0', label: 'Very Good' },
  { key: 'clear',     min: 72, color: '#c4f5cf', label: 'Clear' },
  { key: 'gleaming',  min: 68, color: '#ddf9b4', label: 'Gleaming' },
  { key: 'good',      min: 64, color: '#bef264', label: 'Good' },
  { key: 'decent',    min: 60, color: '#d4f76d', label: 'Decent' },
  { key: 'fresh',     min: 56, color: '#e8f57a', label: 'Fresh' },
  { key: 'fair',      min: 52, color: '#fde047', label: 'Fair' },
  { key: 'muted',     min: 48, color: '#fcd34d', label: 'Muted' },
  { key: 'steady',    min: 44, color: '#fbbf24', label: 'Steady' },
  { key: 'mediocre',  min: 40, color: '#f59e0b', label: 'Mediocre' },
  { key: 'dull',      min: 36, color: '#f08c0a', label: 'Dull' },
  { key: 'weathered', min: 32, color: '#ec7110', label: 'Weathered' },
  { key: 'poor',      min: 28, color: '#f97316', label: 'Poor' },
  { key: 'fading',    min: 24, color: '#ea580c', label: 'Fading' },
  { key: 'bad',       min: 20, color: '#dc4416', label: 'Bad' },
  { key: 'stained',   min: 16, color: '#dc2626', label: 'Stained' },
  { key: 'rough',     min: 12, color: '#c81e1e', label: 'Rough' },
  { key: 'critical', min: 8,  color: '#b91c1c', label: 'Critical' },
  { key: 'harsh',     min: 4,  color: '#991b1b', label: 'Harsh' },
  { key: 'severe',    min: 0,  color: '#7f1d1d', label: 'Severe' },
];

// O(1) lookups — these run per-tooth in the 3D mockup and per-cell in the tooth
// map, so a linear .find() over 25 levels was the hottest path in the engine.
const HEALTH_BY_KEY = new Map(HEALTH_LEVELS.map((l) => [l.key, l]));

export const getHealthColor = (key) => HEALTH_BY_KEY.get(key)?.color ?? '#94a3b8';
export const getHealthLabel = (key) => HEALTH_BY_KEY.get(key)?.label ?? key;

// Health level from a 0-100 score (the gradient's reverse lookup).
export const healthLevelFromScore = (score = 50) => {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  return HEALTH_LEVELS.find((l) => s >= l.min) || HEALTH_LEVELS[HEALTH_LEVELS.length - 1];
};

// computeProprietaryScore + shadeFromScore are re-exported above from
// base44/shared/scoring.ts (single source with the analyzeScan backend).

// 10-band severity palette: 100 = pristine (green) → 0 = severe (deep red).
export const SEVERITY_PALETTE = [
  { min: 90, color: '#0d9f8e', label: 'Pristine' },
  { min: 80, color: '#16a34a', label: 'Excellent' },
  { min: 70, color: '#65a30d', label: 'Good' },
  { min: 60, color: '#a3e635', label: 'Decent' },
  { min: 50, color: '#facc15', label: 'Fair' },
  { min: 40, color: '#f59e0b', label: 'Moderate' },
  { min: 30, color: '#f97316', label: 'Poor' },
  { min: 20, color: '#ea580c', label: 'Bad' },
  { min: 10, color: '#dc2626', label: 'Critical' },
  { min: 0, color: '#7f1d1d', label: 'Severe' },
];

export const severityColor = (sev) => {
  const s = Math.max(0, Math.min(100, sev == null ? 50 : sev));
  return (SEVERITY_PALETTE.find((b) => s >= b.min) || SEVERITY_PALETTE[SEVERITY_PALETTE.length - 1]).color;
};

export const severityLabel = (sev) => {
  const s = Math.max(0, Math.min(100, sev == null ? 50 : sev));
  return (SEVERITY_PALETTE.find((b) => s >= b.min) || SEVERITY_PALETTE[SEVERITY_PALETTE.length - 1]).label;
};

const GUM_MAP = { excellent: 92, good: 74, fair: 45, poor: 20 };
const PLAQUE_MAP = { none: 90, minimal: 70, moderate: 40, heavy: 16 };

// Resolve a 0-100 severity per dimension. Prefer the AI-emitted numeric severity;
// otherwise derive from the enum + the matching clinical index.
export const resolveGumSeverity = (scan = {}) => {
  if (typeof scan.gum_health_severity === 'number') return scan.gum_health_severity;
  const base = GUM_MAP[scan.gum_health] ?? 50;
  const gi = typeof scan.gingival_index === 'number' ? scan.gingival_index : null;
  if (gi != null) return Math.max(5, Math.min(100, base - gi * 8));
  return base;
};

export const resolvePlaqueSeverity = (scan = {}) => {
  if (typeof scan.plaque_severity === 'number') return scan.plaque_severity;
  const base = PLAQUE_MAP[scan.plaque_level] ?? 50;
  const pi = typeof scan.plaque_index === 'number' ? scan.plaque_index : null;
  if (pi != null) return Math.max(5, Math.min(100, base - pi * 8));
  return base;
};

const ENAMEL_KEYWORDS = [
  { re: /(rampant|severe|massive|extensive|advanced)/i, sev: 15 },
  { re: /(caries|decay|cavity|cavitation|abscess)/i, sev: 30 },
  { re: /(erosion|abrasion|abfraction|attrition)/i, sev: 40 },
  { re: /(crack|fracture|chip|break)/i, sev: 45 },
  { re: /(calculus|tartar)/i, sev: 50 },
  { re: /(hypoplasia|fluorosis|hypocalcification|white.?spot)/i, sev: 55 },
  { re: /(mild|minor|slight|early)/i, sev: 65 },
  { re: /(translucent|thin)/i, sev: 68 },
];

export const resolveEnamelSeverity = (scan = {}) => {
  if (typeof scan.enamel_severity === 'number') return scan.enamel_severity;
  const text = scan.enamel_condition || '';
  for (const k of ENAMEL_KEYWORDS) if (k.re.test(text)) return k.sev;
  return typeof scan.dental_health_score === 'number' ? scan.dental_health_score : 60;
};

const ISSUE_KEYWORDS = [
  { re: /(rampant|severe|massive|advanced|extensive)/i, sev: 12 },
  { re: /(caries|decay|cavity|abscess|infection)/i, sev: 25 },
  { re: /(heavy|abundant|gross)/i, sev: 28 },
  { re: /(erosion|abrasion|recession|bone loss|periodont)/i, sev: 38 },
  { re: /(gingivitis|inflammation|bleed)/i, sev: 45 },
  { re: /(calculus|tartar|plaque)/i, sev: 45 },
  { re: /(staining|discoloration|fluorosis|hypoplasia)/i, sev: 50 },
  { re: /(mild|minor|slight|early|moderate)/i, sev: 55 },
];

export const issueSeverity = (text = '') => {
  for (const k of ISSUE_KEYWORDS) if (k.re.test(String(text))) return k.sev;
  return 60;
};

// Whiteness (shade) color: low score = stained yellow/brown, high = white.
const WHITENESS_STOPS = [
  { min: 90, color: '#ffffff' },
  { min: 75, color: '#fdf6e3' },
  { min: 60, color: '#f3e6b8' },
  { min: 45, color: '#e3c878' },
  { min: 30, color: '#c9a24a' },
  { min: 15, color: '#a87b3e' },
  { min: 0, color: '#8a5a2b' },
];

export const whitenessColor = (score = 50) => {
  const s = Math.max(0, Math.min(100, score));
  return (WHITENESS_STOPS.find((b) => s >= b.min) || WHITENESS_STOPS[WHITENESS_STOPS.length - 1]).color;
};

// One-line clinical risk summary grounded in the validated indices.
export const clinicalRiskSummary = (scan = {}) => {
  const parts = [];
  if (typeof scan.gingival_index === 'number') {
    if (scan.gingival_index >= 2) parts.push('moderate gum inflammation');
    else if (scan.gingival_index === 1) parts.push('mild gum inflammation');
  }
  if (typeof scan.plaque_index === 'number' && scan.plaque_index >= 2) parts.push('visible plaque buildup');
  if (typeof scan.bewe_score === 'number') {
    if (scan.bewe_score >= 9) parts.push('severe tooth wear');
    else if (scan.bewe_score >= 3) parts.push('early tooth erosion');
  }
  if (scan.calculus_present) parts.push('tartar deposits');
  if (scan.demineralization_white_spots) parts.push('early white-spot lesions');
  if (scan.dmf_decayed_surfaces > 0) parts.push(`${scan.dmf_decayed_surfaces} decayed surface(s)`);
  if (scan.gingival_recession_mm > 0) parts.push('gingival recession');
  if (scan.periodontal_risk === 'high') parts.push('elevated periodontal risk');
  return parts.length ? parts.join(' · ') : 'no major clinical risk flags from this photo';
};

// PRIORITY TRIAGE — rank what actually needs attention first, so the plan leads
// with the highest-urgency finding instead of a flat list. Pure ranking over
// signals the scan already carries; returns [] when nothing is flagged.
export const triagePriorities = (scan = {}) => {
  const out = [];
  const push = (urgency, weight, finding, action) => out.push({ urgency, weight, finding, action });

  if (scan.dmf_decayed_surfaces > 0) push('urgent', 95, 'Active decay detected', 'Book a dentist — decay does not reverse on its own');
  if (/abscess|fistula|pulp/i.test((scan.dental_health_issues || []).join(' '))) push('urgent', 100, 'Possible infection', 'Seek dental care promptly');
  if (typeof scan.gingival_index === 'number' && scan.gingival_index >= 2) push('high', 75, 'Moderate gum inflammation', 'Improve flossing; a hygienist visit will help');
  if (scan.calculus_present) push('high', 70, 'Tartar buildup', 'Only a professional cleaning removes calculus');
  if (typeof scan.bewe_score === 'number' && scan.bewe_score >= 9) push('high', 72, 'Significant tooth wear', 'Reduce acidic drinks; ask about protective treatment');
  if (scan.demineralization_white_spots) push('medium', 55, 'Early white-spot lesions', 'Fluoride or remineralizing paste can reverse these');
  if (typeof scan.plaque_index === 'number' && scan.plaque_index >= 2) push('medium', 50, 'Visible plaque', 'Focus brushing on the gum line for two minutes');
  if (typeof scan.bewe_score === 'number' && scan.bewe_score >= 3 && scan.bewe_score < 9) push('medium', 45, 'Early erosion', 'Avoid brushing right after acidic food or drink');

  return out.sort((a, b) => b.weight - a.weight);
};

// If the AI returned uniform impact/tier values, rotate a spread so the plan
// never reads "all medium / all mid-range". Only acts when output is uniform.
export const diversifyImpacts = (recs = []) => {
  if (!Array.isArray(recs) || recs.length < 2) return recs;
  const impacts = recs.map((r) => r?.impact).filter(Boolean);
  if (new Set(impacts).size > 1) return recs;
  const pattern = ['high', 'medium', 'low'];
  return recs.map((r, i) => ({ ...r, impact: pattern[i % pattern.length] }));
};

export const diversifyTiers = (products = []) => {
  if (!Array.isArray(products) || products.length < 2) return products;
  const tiers = products.map((p) => p?.budget_tier).filter(Boolean);
  if (new Set(tiers).size > 1) return products;
  const pattern = ['budget', 'mid', 'premium'];
  return products.map((p, i) => ({ ...p, budget_tier: pattern[i % pattern.length] }));
};

// ─────────────────────────────────────────────────────────────────────────
// RESEARCH KNOWLEDGE BASE — clinically validated frameworks (references only,
// not user-facing). Single source for grading, transfer and audit.
// ─────────────────────────────────────────────────────────────────────────
export const CLINICAL_FRAMEWORKS = {
  silness_loe_plaque: { name: 'Silness & Löe Plaque Index', scale: '0-3', grades: { 0: 'no plaque', 1: 'film seen on probe', 2: 'moderate accumulation', 3: 'abundant' } },
  loe_silness_gingival: { name: 'Löe & Silness Gingival Index', scale: '0-3', grades: { 0: 'healthy', 1: 'mild inflammation', 2: 'moderate inflammation', 3: 'severe inflammation' } },
  quigley_turesky: { name: 'Quigley-Haene / Turesky Plaque Index', scale: '0-5', grades: { 0: 'no plaque', 1: 'separate flecks', 2: 'thin continuous band', 3: 'band ≤1mm', 4: 'band 1-3mm', 5: 'band >3mm' } },
  ohis: { name: 'Oral Hygiene Index Simplified (OHI-S)', scale: '0-6', source: 'Greene & Vermillion 1964', grades: { 0: 'excellent', 1: 'good', 2: 'fair', 3: 'poor', 4: 'very poor' } },
  bewe: { name: 'Basic Erosive Wear Examination', scale: '0-9 / sextant', grades: { 0: 'none', 1: 'loss of surface texture', 2: 'distinct defect <50%', 3: 'distinct defect ≥50%' } },
  smith_knight_twi: { name: 'Smith & Knight Tooth Wear Index (TWI)', scale: '0-4', grades: { 0: 'no wear', 1: 'enamel only', 2: 'dentin exposure <1/3', 3: 'dentin 1/3-2/3', 4: 'dentin >2/3 or pulp' } },
  dmf: { name: 'DMF Index (Decayed/Missing/Filled)', scale: 'surfaces', notes: 'WHO oral health surveillance' },
  dmfs: { name: 'DMFS (Decayed/Missing/Filled Surfaces)', scale: '0-128', notes: 'surface-level caries experience' },
  icdas: { name: 'International Caries Detection & Assessment System', scale: '0-6', grades: { 0: 'sound', 1: 'first visual change (wet)', 2: 'distinct visual change (wet)', 3: 'localized enamel breakdown', 4: 'underlying dentin shadow', 5: 'distinct cavity, exposed dentin', 6: 'extensive distinct cavity' } },
  cambra: { name: 'Caries Management by Risk Assessment (CAMBRA)', scale: 'low / moderate / high', notes: 'risk-based caries management' },
  cpi: { name: 'Community Periodontal Index (CPI)', scale: '0-4 / sextant', source: 'WHO', grades: { 0: 'healthy', 1: 'bleeding after probing', 2: 'calculus, pocket <4mm', 3: 'pocket 4-5mm', 4: 'pocket ≥6mm' } },
  psr: { name: 'Periodontal Screening & Recording (PSR)', scale: '0-4 / sextant', source: 'American Academy of Periodontology', grades: { 0: 'healthy', 1: 'gingivitis', 2: 'calculus', 3: 'pocket 4-5mm', 4: 'pocket ≥6mm' } },
  vita_classical: { name: 'VITA Classical A1-D4', scale: '16 tabs' },
  vita_bleached: { name: 'VITA Bleachedguide 0M1-0M3', scale: 'bleaching scale' },
  vita_3d_master: { name: 'VITA 3D-MASTER (Linearguide)', scale: 'value · hue · chroma', notes: 'modern 3D shade system, 26 tabs' },
  bolton: { name: 'Bolton Analysis', scale: 'anterior ratio 77.2% / total 91.3%', notes: 'tooth-size discrepancy' },
  nordland_papilla: { name: 'Nordland Black Triangle Classification', scale: '0-3', grades: { 0: 'papilla present', 1: 'apical to interdental contact', 2: 'mid-contact to apical', 3: 'coronal to contact' } },
  dai: { name: 'Dental Aesthetic Index (DAI)', scale: '0-100', source: 'WHO', grades: { 0: 'normal', 25: 'minor', 30: 'moderate', 35: 'severe', 40: 'handicapping' } },
  iotn: { name: 'Index of Orthodontic Treatment Need (IOTN)', scale: '1-5', grades: { 1: 'no need', 2: 'little', 3: 'borderline', 4: 'need', 5: 'great need' } },
  frankl: { name: 'Frankl Behavior Rating Scale', scale: '1-4', grades: { 1: 'definitely negative', 2: 'negative', 3: 'positive', 4: 'definitely positive' } },
  gingival_biotype: { name: 'Gingival Biotype', scale: 'thin / thick', notes: 'affects whitening response & recession risk' },
  smile_line: { name: 'Smile Line / Lip Line', scale: 'low / medium / high / gummy', notes: 'aesthetic classification' },
};

// ICDAS — translate the AI's lesion type/severity into the validated 0-6 code.
// LIVE: raises caries detail from a coarse enum to a research-grade grade.
export const icdasFromLesion = (lesion = {}) => {
  const t = (lesion.type || '').toLowerCase();
  const sev = (lesion.severity || '').toLowerCase();
  if (t === 'cavitation' || sev === 'advanced') return 6;
  if (t === 'root' && sev === 'moderate') return 5;
  if (sev === 'moderate') return t === 'pit_fissure' || t === 'interproximal' ? 4 : 3;
  if (t === 'brown_spot') return 2;
  if (t === 'white_spot' || sev === 'early') return 1;
  return 0;
};
export const icdasLabel = (code) => (CLINICAL_FRAMEWORKS.icdas.grades[code] ?? 'sound');

// reconcilePlaqueCaries is re-exported above from base44/shared/scoring.ts.
// icdasFromLesion + icdasLabel remain here (exported, used by other modules).

// ─────────────────────────────────────────────────────────────────────────
// NATURAL TEETH BASELINE — the reference profile for healthy natural teeth.
// Natural teeth are ivory/off-white (VITA A2-A3), NOT pure white. A natural
// yellow hue (yellow index 5-35) is healthy and should NOT be penalized as
// staining. This baseline is used by the scoring engine and the AI prompt to
// calibrate expectations: a normal smile with natural yellow hue scores 70-85.
// ─────────────────────────────────────────────────────────────────────────
export const NATURAL_TEETH_BASELINE = {
  shade: 'A2-A3',
  yellowIndexRange: [5, 35],
  luminanceRange: [55, 85],
  description: 'Natural light ivory/off-white enamel with well-aligned front teeth, low to moderate visible surface wear, and normal visual gum line appearance.',
  features: {
    enamel_shade: 'Natural light ivory/off-white',
    front_alignment: 'Well-aligned with natural spacing',
    visible_wear: 'Low to moderate visible surface wear',
    gum_line: 'Normal visual appearance',
  },
};

// ─────────────────────────────────────────────────────────────────────────
// ENGINE INVOLVEMENT — before & after the AI
// preAnalyze runs BEFORE the AI call: it does a fast canvas-based pre-flight
// (brightness, tooth detection, natural-yellow baseline, angle hint) so the
// engine is involved in every scan, not just post-processing. This catches
// unusable photos early and feeds context to the AI prompt.
// ─────────────────────────────────────────────────────────────────────────
export const preAnalyze = async (file) => {
  const ctx = {
    width: null, height: null, brightness: null, usable: true, notes: [],
    toothRatio: null, yellowIndex: null, isNaturalTeeth: null, angleHint: null,
  };
  try {
    if (!file || typeof createImageBitmap === 'undefined') return ctx;
    const bmp = await createImageBitmap(file);
    ctx.width = bmp.width;
    ctx.height = bmp.height;
    const s = sampleToothPixels(bmp);
    ctx.brightness = s.brightness;
    ctx.toothRatio = s.toothRatio;
    if (s.toothCount > 10) {
      ctx.yellowIndex = yellowIndexFrom(s.avgYellow);
      ctx.isNaturalTeeth = ctx.yellowIndex >= 5 && ctx.yellowIndex <= 35;
      ctx.angleHint = angleHintFrom(s.centroidX, s.centroidY);
      // Raw average tooth RGB — the deterministic colorimetry path (CIELAB +
      // CIEDE2000 + reference-card white balance) uses this to cross-check the
      // AI's shade guess. Stored on the pre-flight context so the scan flow can
      // run the dual-path consensus after the AI returns the reference card RGB.
      ctx.toothRgb = s.avgToothRgb;
      // Violet-cast detection: flags color correcting products (purple strips
      // and serums) that optically distort the shade reading. Runs on the
      // same bitmap so no extra decode cost.
      ctx.violetCast = detectVioletCast(bmp);
    }
    if (ctx.brightness < 45) { ctx.notes.push('low_light'); ctx.usable = false; }
    if (ctx.brightness > 235) { ctx.notes.push('overexposed'); ctx.usable = false; }
    // Bright-pixel counts cannot prove absence of teeth (stained/darker enamel
    // and restorations may not match). Let the subject-aware gate decide.
    if (ctx.toothRatio < 0.02) ctx.notes.push('uncertain_teeth');
    if (bmp.close) bmp.close();
  } catch {
    // Non-fatal: engine stays involved with whatever signals we have.
  }
  return ctx;
};

// postProcess is re-exported above from base44/shared/scoring.ts.

// FAST CLIENT-SIDE ESTIMATE — preliminary whiteness reading from pure canvas
// math, available within ~100ms of capture (before the AI returns).
export const fastEstimate = async (url) => {
  const ctx = { whiteness: null, shade: null, brightness: null };
  try {
    const img = await loadImage(url);
    const s = sampleToothPixels(img);
    if (s.toothCount < 20) return ctx;
    const avgLum = s.avgToothLuma;
    const avgYellow = s.avgYellow;
    const lumScore = Math.max(0, Math.min(100, (avgLum - 60) / 1.4));
    const yellowPenalty = Math.max(0, Math.min(40, avgYellow * 0.8));
    const whiteness = Math.max(0, Math.min(100, Math.round(lumScore - yellowPenalty)));
    const { shade } = shadeFromScore(whiteness);
    ctx.whiteness = whiteness;
    ctx.shade = shade;
    ctx.brightness = Math.round(avgLum);
  } catch {
    // Non-fatal — the AI is the source of truth.
  }
  return ctx;
};

// ─────────────────────────────────────────────────────────────────────────
// FEATURE REGISTRY — single source of truth for what the engine can do.
// `live` features run in the app; `dormant` features are stored here for
// upcoming releases and are NEVER executed by the live app. Add a feature
// here first; promote to `live` only after explicit review.
// ─────────────────────────────────────────────────────────────────────────
export const FEATURE_REGISTRY = {
  calibrated_scoring: { status: 'live', desc: 'Deterministic whiteness score from AI-extracted metrics' },
  vita_shade_map: { status: 'live', desc: 'VITA Classical + Bleached shade mapping & fallback' },
  severity_grading: { status: 'live', desc: '10-band severity color system' },
  clinical_indices: { status: 'live', desc: 'Silness-Löe / Löe-Silness / BEWE / DMF interpretation' },
  icdas_caries: { status: 'live', desc: 'ICDAS 0-6 caries detection & assessment mapping' },
  plaque_caries_reconciliation: { status: 'live', desc: 'Cross-check AI detection vs clinical indices' },
  health_gradient_25: { status: 'live', desc: '25-level smooth green-to-red health gradient' },
  // --- DORMANT: periodontal screening ---
  cpi_periodontal: { status: 'live', desc: 'WHO Community Periodontal Index sextant scoring from probing depths', framework: 'cpi' },
  psr_screening: { status: 'live', desc: 'AAP Periodontal Screening & Recording code per sextant', framework: 'psr' },
  ohis_oral_hygiene: { status: 'live', desc: 'Greene & Vermillion OHI-S from debris + calculus scores', framework: 'ohis' },
  quigley_turesky_plaque: { status: 'live', desc: 'Quigley-Haene/Turesky 0-5 plaque extension index', framework: 'quigley_turesky' },
  // --- DORMANT: caries & risk ---
  cambra_risk: { status: 'live', desc: 'CAMBRA caries risk stratification (low/moderate/high)', framework: 'cambra' },
  dmfs_surface_count: { status: 'live', desc: 'DMFS surface-level caries experience tracking', framework: 'dmfs' },
  caries_risk_trend: { status: 'live', desc: 'Caries risk trajectory across multiple scans' },
  // --- DORMANT: tooth wear ---
  smith_knight_twi: { status: 'live', desc: 'Smith & Knight Tooth Wear Index 0-4 per surface', framework: 'smith_knight_twi' },
  occlusal_wear_predictor: { status: 'live', desc: 'Forecast attrition risk from wear facets' },
  bruxism_screen: { status: 'live', desc: 'Screen for bruxism wear patterns (attrition facets)' },
  erosion_progression: { status: 'live', desc: 'Project BEWE progression over time' },
  // --- DORMANT: shade science ---
  vita_3d_master_map: { status: 'live', desc: 'VITA 3D-MASTER (value/hue/chroma) shade mapping', framework: 'vita_3d_master' },
  shade_aging_curve: { status: 'live', desc: 'Predict shade regression over weeks without treatment' },
  shade_relapse_forecast: { status: 'live', desc: 'Post-whitening shade relapse curve (A1→A2 drift)' },
  whitening_responsiveness: { status: 'live', desc: 'Predict whitening response from enamel thickness/shade' },
  stain_susceptibility: { status: 'live', desc: 'Coffee/tea/wine/tobacco stain susceptibility score' },
  // --- DORMANT: aesthetic & orthodontic ---
  bolton_discrepancy: { status: 'live', desc: 'Bolton anterior/total tooth-size ratio analysis', framework: 'bolton' },
  nordland_papilla: { status: 'live', desc: 'Nordland black-triangle (interdental papilla) classification', framework: 'nordland_papilla' },
  smile_line_class: { status: 'live', desc: 'Low/medium/high/gummy smile-line classification', framework: 'smile_line' },
  dai_aesthetic: { status: 'live', desc: 'WHO Dental Aesthetic Index orthodontic need score', framework: 'dai' },
  iotn_need: { status: 'live', desc: 'Index of Orthodontic Treatment Need grading', framework: 'iotn' },
  gingival_biotype: { status: 'live', desc: 'Thin vs thick gingival biotype hint (whitening/recession)', framework: 'gingival_biotype' },
  // --- DORMANT: 3D & tracking ---
  gingival_3d_mapping: { status: 'live', desc: '3D gingival contour estimation from stereo pairs' },
  caries_depth_estimation: { status: 'live', desc: 'Estimate lesion depth into dentin from ICDAS + shadow' },
  plaque_timelapse: { status: 'live', desc: 'Track plaque biofilm growth between scans' },
  microbiome_hint: { status: 'live', desc: 'Infer plaque microbial profile hints from biofilm texture' },
  // --- DORMANT: holistic & historical ---
  halitosis_estimate: { status: 'live', desc: 'Bad-breath likelihood from plaque/tongue coating/calculus' },
  dental_age_estimate: { status: 'live', desc: 'Estimate dental age from shade, wear & recession' },
  frankl_behavior: { status: 'live', desc: 'Pediatric patient cooperation rating (Frankl scale)', framework: 'frankl' },
  ancient_remedy_context: { status: 'live', desc: 'Historical context: miswak, oil pulling, neem, charcoal' },
  // --- v3.1: extended clinical frameworks (unrufldteethClinical.js) ---
  aap_efp_staging: { status: 'live', desc: 'AAP/EFP 2018 periodontitis stage I-IV, grade A-C & extent', framework: 'aap_efp_2018' },
  cast_spectrum: { status: 'live', desc: 'CAST 0-9 caries spectrum (ICDAS + PUFA + DMF unified)', framework: 'cast' },
  pufa_consequences: { status: 'live', desc: 'PUFA — pulpal / ulceration / fistula / abscess counts', framework: 'pufa' },
  nyvad_activity: { status: 'live', desc: 'Nyvad active vs arrested lesion activity & urgency', framework: 'nyvad' },
  deans_fluorosis: { status: 'live', desc: "Dean's Index + Thylstrup-Fejerskov fluorosis severity", framework: 'deans_fluorosis' },
  mih_screen: { status: 'live', desc: 'EAPD Molar-Incisor Hypomineralisation severity & fluorosis differential', framework: 'mih' },
  root_caries_index: { status: 'live', desc: 'Katz Root Caries Index on recession-exposed surfaces', framework: 'root_caries_index' },
  cariogram_probability: { status: 'live', desc: 'Cariogram % chance of avoiding new caries', framework: 'cariogram' },
  smile_proportion: { status: 'live', desc: 'Golden / RED proportion + central incisor W:H aesthetics', framework: 'golden_proportion' },
  recession_class: { status: 'live', desc: 'Miller / Cairo recession class & root-coverage prognosis', framework: 'miller_recession' },
};

export const liveFeatures = () => Object.entries(FEATURE_REGISTRY).filter(([, v]) => v.status === 'live').map(([k]) => k);
export const dormantFeatures = () => Object.entries(FEATURE_REGISTRY).filter(([, v]) => v.status === 'dormant').map(([k]) => k);

// ─────────────────────────────────────────────────────────────────────────
// DORMANT FEATURE IMPLEMENTATIONS — pure functions, stored for upcoming
// releases. NOT executed by the live app. Each is grounded in a published
// framework (see CLINICAL_FRAMEWORKS). Promote to `live` only after review.
// ─────────────────────────────────────────────────────────────────────────

// WHO Community Periodontal Index (CPI) — 0-4 per sextant from probing depth.
// DORMANT. Ref: WHO Oral Health Surveys.
export const cpiFromProbing = (probingDepthMm = 0) => {
  const d = Math.max(0, Number(probingDepthMm) || 0);
  if (d >= 6) return 4;
  if (d >= 4) return 3;
  if (d >= 2) return 2; // calculus detected or shallow pocket
  return 0;
};

// OHI-S (Greene & Vermillion) — simplified oral hygiene from debris + calculus.
// DORMANT. Each score 0-3; OHI-S = mean of (debris + calculus) / sextants scored.
export const ohisFromScores = (debrisScores = [], calculusScores = []) => {
  const d = debrisScores.filter((s) => typeof s === 'number');
  const c = calculusScores.filter((s) => typeof s === 'number');
  if (!d.length && !c.length) return 0;
  const dMean = d.length ? d.reduce((a, b) => a + b, 0) / d.length : 0;
  const cMean = c.length ? c.reduce((a, b) => a + b, 0) / c.length : 0;
  return Math.round((dMean + cMean) * 10) / 10;
};

// Smith & Knight Tooth Wear Index — 0-4 per surface from enamel/dentin loss.
// DORMANT. Ref: Smith & Knight 1984.
export const twiFromEnamel = (enamelCondition = '', dentinExposed = false) => {
  const t = String(enamelCondition || '').toLowerCase();
  if (dentinExposed) {
    if (/(>2\/3|pulp|extensive)/.test(t)) return 4;
    if (/(1\/3.*2\/3|moderate)/.test(t)) return 3;
    return 2;
  }
  if (/(loss of texture|matte|early)/.test(t)) return 1;
  return 0;
};

// CAMBRA caries risk — low / moderate / high from disease indicators + risk factors.
// DORMANT. Ref: Featherstone 2003 (Caries Management by Risk Assessment).
export const cambraRisk = (indicators = {}) => {
  let score = 0;
  if (indicators.decayed_surfaces > 0) score += 2;
  if (indicators.demineralization_white_spots) score += 2;
  if (indicators.plaque_index >= 2) score += 1;
  if (indicators.high_sugar_diet) score += 1;
  if (indicators.reduced_saliva || indicators.dry_mouth) score += 2;
  if (indicators.appliance) score += 1;
  if (score >= 5) return 'high';
  if (score >= 2) return 'moderate';
  return 'low';
};

// VITA 3D-MASTER — map a 0-100 whiteness to the 3D-MASTER value/hue/chroma tab.
// DORMANT. The 3D-MASTER system orders by lightness (value) 1-5, then hue (L/M/R),
// then chroma (1-3). This is an approximation from a single whiteness score.
export const vita3dMasterFromScore = (score = 50) => {
  const s = Math.max(0, Math.min(100, Math.round(score || 0)));
  const value = s >= 85 ? 5 : s >= 70 ? 4 : s >= 55 ? 3 : s >= 40 ? 2 : 1;
  const hue = s >= 70 ? 'L' : s >= 45 ? 'M' : 'R';
  const chroma = s >= 80 ? 1 : s >= 55 ? 1.5 : s >= 30 ? 2 : 3;
  return { tab: `${value}${hue}${chroma}`, value, hue, chroma };
};

// Bolton analysis — anterior (3-3) and total (6-6) tooth-size ratios.
// DORMANT. Ref: Bolton 1962. Ideal anterior 77.2%, total 91.3%.
export const boltonDiscrepancy = (upperSumMm = 0, lowerSumMm = 0, anteriorOnly = false) => {
  if (!upperSumMm) return { ratio: 0, discrepancy: 0, ideal: 0 };
  const ideal = anteriorOnly ? 77.2 : 91.3;
  const ratio = Math.round((lowerSumMm / upperSumMm) * 1000) / 10;
  const discrepancy = Math.round((ratio - ideal) * 10) / 10;
  return { ratio, discrepancy, ideal };
};

// Nordland black-triangle (interdental papilla) classification — 0-3.
// DORMANT. Ref: Nordland & Tarnow 1998.
export const papillaClassification = (papillaPosition = 'present') => {
  const t = String(papillaPosition || '').toLowerCase();
  if (t.includes('coronal')) return 3;
  if (t.includes('mid')) return 2;
  if (t.includes('apical')) return 1;
  return 0;
};

// Smile line / lip line classification — low / medium / high / gummy.
// DORMANT. Ref: Peck et al.; aesthetic dentistry literature.
export const smileLineClass = (gingivalDisplayMm = 0) => {
  const d = Number(gingivalDisplayMm) || 0;
  if (d >= 3) return 'gummy';
  if (d > 0) return 'high';
  if (d === 0) return 'medium';
  return 'low';
};

// Gingival biotype hint — thin vs thick, inferred from tooth shape + recession.
// DORMANT. Thin biotypes whiten differently and recess more readily.
export const gingivalBiotype = (toothShape = '', recession = false) => {
  const t = String(toothShape || '').toLowerCase();
  if (recession) return 'thin';
  if (/(triangular|narrow|long)/.test(t)) return 'thin';
  if (/(square|short|wide)/.test(t)) return 'thick';
  return 'unknown';
};

// Halitosis (bad breath) likelihood — 0-100 from plaque, tongue coating, calculus.
// DORMANT. Ref: halitosis literature (volatile sulfur compounds correlate with plaque/tongue).
export const halitosisEstimate = (scan = {}) => {
  let score = 0;
  const pi = typeof scan.plaque_index === 'number' ? scan.plaque_index : null;
  if (pi != null) score += pi * 12;
  if (scan.calculus_present) score += 20;
  if (scan.plaque_level === 'heavy') score += 25;
  else if (scan.plaque_level === 'moderate') score += 15;
  if (scan.tongue_coating) score += 20;
  return Math.max(0, Math.min(100, Math.round(score)));
};

// Shade aging curve — predict shade regression (darkening) over weeks without treatment.
// DORMANT. Teeth drift ~1 VITA shade darker per ~6-12 months without intervention.
export const shadeAgingCurve = (currentScore = 70, weeks = 12) => {
  const decayPerWeek = 0.18; // ~9 points/year
  return Math.max(0, Math.min(100, Math.round(currentScore - decayPerWeek * weeks)));
};

// Post-whitening shade relapse forecast — A1 drifts back toward A2 over weeks.
// DORMANT. Ref: whitening relapse literature (1-2 shade rebound in 1-3 months).
export const shadeRelapseForecast = (peakScore = 88, weeksAfterWhitening = 8) => {
  const reboundPerWeek = 0.5;
  return Math.max(0, Math.min(100, Math.round(peakScore - reboundPerWeek * weeksAfterWhitening)));
};

// Whitening responsiveness predictor — 0-100, how well the teeth will respond.
// DORMANT. Higher current luminance + lower intrinsic stain = better response.
export const whiteningResponsiveness = (scan = {}) => {
  const lum = typeof scan.enamel_luminance_score === 'number' ? scan.enamel_luminance_score : 70;
  const yellow = typeof scan.yellow_hue_saturation_index === 'number' ? scan.yellow_hue_saturation_index : 18;
  const intrinsic = scan.intrinsic_discoloration ? 15 : 0;
  const fluorosis = /fluorosis|hypoplasia/i.test(scan.enamel_condition || '') ? 20 : 0;
  return Math.max(0, Math.min(100, Math.round(50 + (lum - 50) * 0.4 - yellow * 0.3 - intrinsic - fluorosis)));
};

// Stain susceptibility — 0-100, likelihood of extrinsic staining from habits.
// DORMANT. Ref: extrinsic stain literature (coffee/tea/wine/tobacco chromogens).
export const stainSusceptibility = (habits = {}) => {
  let score = 20;
  if (habits.coffee) score += 15;
  if (habits.tea) score += 12;
  if (habits.wine) score += 10;
  if (habits.tobacco) score += 25;
  if (habits.poor_brushing) score += 15;
  return Math.max(0, Math.min(100, score));
};

// Dental age estimate — approximate "dental age" from shade, wear & recession.
// DORMANT. A holistic, non-clinical curiosity metric for the user journey.
export const dentalAgeEstimate = (scan = {}) => {
  let age = 25;
  const score = typeof scan.score === 'number' ? scan.score : 70;
  age += (70 - score) * 0.4; // darker teeth → older estimate
  if (/(attrition|wear|abrasion)/i.test(scan.enamel_condition || '')) age += 8;
  if (/(recession|bone loss)/i.test((scan.dental_health_issues || []).join(' '))) age += 6;
  if (scan.calculus_present) age += 4;
  return Math.max(12, Math.round(age));
};

// Frankl behavior rating — pediatric patient cooperation 1-4.
// DORMANT. Ref: Frankl et al. 1962. For future pediatric/family scan modes.
export const franklRating = (behavior = 'positive') => {
  const t = String(behavior || '').toLowerCase();
  if (t.includes('definitely') && t.includes('negative')) return 1;
  if (t.includes('negative')) return 2;
  if (t.includes('definitely') && t.includes('positive')) return 4;
  return 3;
};

// Ancient & traditional oral-care practices — historical context for education.
// DORMANT. Not medical advice; cultural/historical framing only.
export const ANCIENT_PRACTICES = {
  miswak: { origin: 'Middle East / South Asia (Salvadora persica)', use: 'Chewing stick used for >7000 years; contains silica, fluoride & antimicrobial alkaloids.', evidence: 'WHO oral hygiene monograph; reduces plaque comparable to toothbrush in trials.' },
  oil_pulling: { origin: 'Ayurvedic medicine (India)', use: 'Swilling oil (sesame/coconut) to reduce plaque & gingivitis.', evidence: 'Small RCTs show plaque reduction; adjunct, not replacement for brushing.' },
  neem: { origin: 'South Asia (Azadirachta indica)', use: 'Twigs & leaf paste for cleaning teeth; antibacterial.', evidence: 'Traditional; modern mouthwash studies show modest anti-plaque effect.' },
  charcoal: { origin: 'Ancient Rome, Egypt, many cultures', use: 'Abrasive powder to scrub teeth white.', evidence: 'Highly abrasive — modern dentistry discourages; enamel damage risk.' },
  salt_and_chalk: { origin: 'Europe / global', use: 'Abrasives mixed into early dentifrices.', evidence: 'Historical precursor to modern toothpaste; too abrasive by today’s standards.' },
};

// ─────────────────────────────────────────────────────────────────────────
// 3D TEETH MOCKUP — pre-computes a per-tooth scene description from the AI's
// tooth_analysis so the 3D renderer just places + colors meshes (fast).
// ─────────────────────────────────────────────────────────────────────────
const MOCKUP_TYPES = ['incisor', 'incisor', 'canine', 'premolar', 'premolar', 'molar', 'molar', 'molar'];

export const parseToothId = (id) => {
  const s = String(id || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!s) return null;
  // Standard format: UR1, UL2, LL3, LR6, UR8 (wisdom tooth)
  let m = /^([A-Z]{1,2})(\d+)$/.exec(s);
  if (m) {
    const q = m[1];
    const arch = (q === 'UR' || q === 'UL' || q === 'U') ? 'upper' : 'lower';
    const side = (q === 'UR' || q === 'LR' || q === 'R') ? 'right' : 'left';
    return { arch, side, n: Number(m[2]) };
  }
  // FDI two-digit: 1=UR 2=UL 3=LL 4=LR (e.g. 11, 21, 31, 41)
  m = /^(\d)(\d)$/.exec(s);
  if (m) {
    const qn = Number(m[1]);
    const arch = (qn === 1 || qn === 2) ? 'upper' : 'lower';
    const side = (qn === 1 || qn === 4) ? 'right' : 'left';
    return { arch, side, n: Number(m[2]) };
  }
  return null;
};

export const buildMockupArch = (toothAnalysis, view = 'health') => {
  if (!Array.isArray(toothAnalysis)) return [];
  const teeth = [];
  for (const tooth of toothAnalysis) {
    const parsed = parseToothId(tooth.tooth_id);
    if (!parsed) continue;
    const n = Math.min(8, Math.max(1, parsed.n));
    const type = MOCKUP_TYPES[n - 1] || 'molar';
    const color = view === 'shade'
      ? whitenessColor(tooth.whiteness_score)
      : getHealthColor(tooth.color_segments?.[0]?.health || 'fair');
    const conds = Array.isArray(tooth.conditions) ? tooth.conditions : [];
    let rotY = 0;
    let posOffset = 0;
    if (conds.includes('rotation')) rotY = 0.35;
    if (conds.includes('crowding')) posOffset = 0.05;
    if (conds.includes('gap') || conds.includes('diastema')) posOffset = -0.1;
    if (conds.includes('crossbite')) rotY = -0.25;
    const hs = typeof tooth.health_score === 'number' ? tooth.health_score : 70;
    const scale = 0.9 + (hs / 100) * 0.2;
    teeth.push({
      id: tooth.tooth_id, type, arch: parsed.arch, side: parsed.side, n,
      color, rotY, posOffset, scale, whiteness: tooth.whiteness_score, health: hs,
      raw: tooth,
    });
  }

  // Only render teeth the AI actually saw in the photo — no estimated fill-in.
  // The mockup now mirrors the tooth-by-tooth analysis exactly.
  return teeth;
};