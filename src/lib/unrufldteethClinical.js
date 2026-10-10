// unrufldteethClinical — extended clinical framework layer for unrufldteeth™.
//
// Split out of unrufldteeth.js to keep the core engine focused. This module
// owns the SECOND-GENERATION validated frameworks added in engine v3.1, each
// grounded in published, peer-reviewed dental literature:
//
//   • AAP/EFP 2018 Periodontitis Staging & Grading (Tonetti, Greenwell & Kornman,
//     J Clin Periodontol 2018) — replaced the old chronic/aggressive split and is
//     now the world standard for periodontal case definition.
//   • CAST — Caries Assessment Spectrum and Treatment (Frencken et al.) — merges
//     ICDAS II + PUFA + the M/F components of DMF into one 0-9 spectrum.
//   • PUFA — Pulpal involvement, Ulceration, Fistula, Abscess (Monse et al. 2010)
//     — records the clinical CONSEQUENCES of untreated caries, which DMF misses.
//   • Nyvad Criteria — caries lesion ACTIVITY (active vs arrested), not just presence.
//   • Dean's Fluorosis Index + Thylstrup-Fejerskov (TF) Index — fluorosis severity.
//   • MIH — Molar-Incisor Hypomineralisation (EAPD criteria) — demarcated opacities.
//   • Root Caries Index (Katz 1980) — caries on exposed root surfaces.
//   • Cariogram (Bratthall) — multifactorial caries-risk probability model.
//   • Golden Proportion / RED Proportion — smile-design aesthetics (Levin; Ward).
//   • Miller & Cairo recession classification — gingival recession prognosis.
//
// All pure functions. No PII, no side effects, no I/O — safe on client & server.

// ─────────────────────────────────────────────────────────────────────────
// FRAMEWORK REFERENCE TABLE
// ─────────────────────────────────────────────────────────────────────────
export const CLINICAL_FRAMEWORKS_V2 = {
  aap_efp_2018: {
    name: 'AAP/EFP 2018 Periodontitis Staging & Grading',
    scale: 'Stage I-IV · Grade A-C',
    source: 'Tonetti, Greenwell & Kornman, J Clin Periodontol 2018',
    stages: {
      I: 'Interdental CAL 1-2mm · RBL <15% · no tooth loss',
      II: 'Interdental CAL 3-4mm · RBL 15-33% · no tooth loss',
      III: 'Interdental CAL ≥5mm · RBL to mid-root+ · ≤4 teeth lost',
      IV: 'Interdental CAL ≥5mm · RBL to mid-root+ · ≥5 teeth lost · masticatory dysfunction',
    },
    grades: { A: 'slow progression', B: 'moderate progression', C: 'rapid progression' },
    extent: { localized: '<30% of teeth', generalized: '≥30% of teeth', molar_incisor: 'molar/incisor pattern' },
  },
  cast: {
    name: 'Caries Assessment Spectrum and Treatment (CAST)',
    scale: '0-9',
    source: 'Frencken et al. 2011 / 2020',
    grades: {
      0: 'sound', 1: 'sealed', 2: 'restored', 3: 'enamel lesion (distinct visual change)',
      4: 'dentin lesion (internal caries, no cavitation into pulp)', 5: 'dentin cavity',
      6: 'pulpal involvement', 7: 'abscess / fistula', 8: 'tooth lost due to caries', 9: 'not recorded',
    },
  },
  pufa: {
    name: 'PUFA Index (Pulpal / Ulceration / Fistula / Abscess)',
    scale: 'count of affected teeth',
    source: 'Monse et al., Community Dent Oral Epidemiol 2010',
    grades: { P: 'pulpal involvement', U: 'ulceration from displaced fragments', F: 'fistula', A: 'abscess' },
    notes: 'Captures consequences of untreated caries that DMF ignores',
  },
  nyvad: {
    name: 'Nyvad Caries Activity Criteria',
    scale: '0-9',
    source: 'Nyvad, Machiulskiene & Baelum 1999',
    grades: {
      0: 'sound', 1: 'active, intact surface', 2: 'active, surface discontinuity', 3: 'active cavity',
      4: 'inactive, intact surface', 5: 'inactive, surface discontinuity', 6: 'inactive cavity',
      7: 'filling, sound', 8: 'filling + active caries', 9: 'filling + inactive caries',
    },
    notes: 'Distinguishes ACTIVE (progressing) from ARRESTED lesions — changes treatment urgency',
  },
  deans_fluorosis: {
    name: "Dean's Fluorosis Index",
    scale: '0-5',
    source: 'Dean 1942',
    grades: { 0: 'normal', 1: 'questionable', 2: 'very mild', 3: 'mild', 4: 'moderate', 5: 'severe' },
  },
  tf_index: {
    name: 'Thylstrup-Fejerskov (TF) Fluorosis Index',
    scale: '0-9',
    source: 'Thylstrup & Fejerskov 1978',
    notes: 'Finer-grained than Dean; TF 1 ≈ Dean questionable, TF 5-9 = severe with enamel loss',
  },
  mih: {
    name: 'Molar-Incisor Hypomineralisation (EAPD criteria)',
    scale: 'mild / moderate / severe',
    source: 'European Academy of Paediatric Dentistry',
    grades: {
      mild: 'demarcated opacities, no enamel breakdown, no sensitivity',
      moderate: 'opacities on occlusal/incisal third, post-eruptive breakdown limited to enamel',
      severe: 'post-eruptive enamel breakdown, caries, sensitivity, aesthetic concern',
    },
    notes: 'Creamy-white to yellow-brown demarcated opacities — distinct from diffuse fluorosis',
  },
  root_caries_index: {
    name: 'Root Caries Index (RCI)',
    scale: '0-100%',
    source: 'Katz 1980',
    notes: 'RCI = (decayed + filled root surfaces) / surfaces with recession × 100',
  },
  cariogram: {
    name: 'Cariogram',
    scale: '0-100% chance of avoiding new caries',
    source: 'Bratthall & Petersson 2005',
    notes: 'Multifactorial: diet, bacteria, susceptibility, circumstances',
  },
  golden_proportion: {
    name: 'Golden Proportion / RED Proportion',
    scale: 'ratio',
    source: 'Levin 1978 (golden 61.8%); Ward 2001 (RED 70%)',
    notes: 'Successive anterior tooth widths from the facial view; dentists prefer 70% RED',
  },
  miller_recession: {
    name: 'Miller Recession Classification',
    scale: 'Class I-IV',
    source: 'Miller 1985',
    grades: {
      I: 'recession not to mucogingival junction, no interdental loss — full coverage expected',
      II: 'recession to/beyond MGJ, no interdental loss — full coverage expected',
      III: 'recession to/beyond MGJ with interdental bone/soft tissue loss — partial coverage',
      IV: 'severe interdental loss — no root coverage expected',
    },
  },
  cairo_recession: {
    name: 'Cairo Recession Type (RT)',
    scale: 'RT1-RT3',
    source: 'Cairo et al. 2011',
    grades: { RT1: 'no interproximal attachment loss', RT2: 'interproximal CAL ≤ buccal CAL', RT3: 'interproximal CAL > buccal CAL' },
  },
};

const clampNum = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v) || 0));

// ─────────────────────────────────────────────────────────────────────────
// AAP/EFP 2018 — periodontitis staging & grading
// ─────────────────────────────────────────────────────────────────────────

// Stage from interdental clinical attachment loss (mm), radiographic bone loss
// (%) and periodontitis-attributable tooth loss. Severity determines the floor;
// complexity factors can only escalate the stage, never lower it.
export const periodontitisStage = ({ interdentalCalMm = 0, boneLossPercent = 0, teethLost = 0, maxProbingDepthMm = 0, furcationInvolvement = false, needsComplexRehab = false } = {}) => {
  const cal = clampNum(interdentalCalMm, 0, 20);
  const rbl = clampNum(boneLossPercent, 0, 100);
  const lost = clampNum(teethLost, 0, 32);

  let stage = 0;
  if (lost >= 5 || needsComplexRehab) stage = 4;
  else if (cal >= 5 || rbl > 33 || lost >= 1) stage = 3;
  else if (cal >= 3 || rbl >= 15) stage = 2;
  else if (cal >= 1) stage = 1;

  // Complexity escalation (Stage III markers).
  if (stage > 0 && stage < 3 && (maxProbingDepthMm >= 6 || furcationInvolvement)) stage = 3;
  if (stage === 0) return { stage: 0, roman: null, label: 'no periodontitis', description: 'No interdental attachment loss detected' };

  const roman = ['', 'I', 'II', 'III', 'IV'][stage];
  return { stage, roman, label: `Stage ${roman}`, description: CLINICAL_FRAMEWORKS_V2.aap_efp_2018.stages[roman] };
};

// Grade = rate of progression. Direct evidence (CAL change over 5y) wins;
// otherwise the indirect %bone-loss / age ratio. Smoking & diabetes are
// grade MODIFIERS that shift the grade upward.
export const periodontitisGrade = ({ boneLossPercent = 0, age = 30, calChange5yMm = null, cigarettesPerDay = 0, hba1c = null, diabetic = false } = {}) => {
  let grade;
  if (calChange5yMm != null) {
    const c = Number(calChange5yMm) || 0;
    grade = c >= 2 ? 'C' : c > 0 ? 'B' : 'A';
  } else {
    const ratio = age > 0 ? clampNum(boneLossPercent, 0, 100) / age : 0;
    grade = ratio > 1.0 ? 'C' : ratio >= 0.25 ? 'B' : 'A';
  }
  // Modifiers can only escalate.
  const order = { A: 0, B: 1, C: 2 };
  const bump = (g, to) => (order[to] > order[g] ? to : g);
  if (cigarettesPerDay >= 10) grade = bump(grade, 'C');
  else if (cigarettesPerDay > 0) grade = bump(grade, 'B');
  if (diabetic && hba1c != null) grade = bump(grade, Number(hba1c) >= 7 ? 'C' : 'B');

  return {
    grade,
    label: `Grade ${grade}`,
    description: CLINICAL_FRAMEWORKS_V2.aap_efp_2018.grades[grade],
    modifiers: { smoking: cigarettesPerDay > 0, diabetes: !!diabetic },
  };
};

// Extent descriptor — localized / generalized / molar-incisor pattern.
export const periodontitisExtent = (affectedTeeth = 0, totalTeeth = 28, molarIncisorPattern = false) => {
  if (molarIncisorPattern) return 'molar_incisor';
  if (!totalTeeth) return 'localized';
  return affectedTeeth / totalTeeth >= 0.3 ? 'generalized' : 'localized';
};

// Full AAP/EFP case definition in one call.
export const periodontalCaseDefinition = (input = {}) => {
  const stage = periodontitisStage(input);
  if (!stage.stage) return { ...stage, grade: null, extent: null, diagnosis: 'No periodontitis detected' };
  const grade = periodontitisGrade(input);
  const extent = periodontitisExtent(input.affectedTeeth, input.totalTeeth, input.molarIncisorPattern);
  const extentLabel = extent === 'molar_incisor' ? 'Molar/incisor pattern' : extent.charAt(0).toUpperCase() + extent.slice(1);
  return { ...stage, grade: grade.grade, gradeDescription: grade.description, extent, diagnosis: `${extentLabel} ${stage.label} ${grade.label} periodontitis` };
};

// ─────────────────────────────────────────────────────────────────────────
// CARIES — CAST, PUFA, Nyvad, root caries, Cariogram
// ─────────────────────────────────────────────────────────────────────────

// CAST 0-9 from lesion descriptors. Supersedes a bare ICDAS code by folding in
// sealants, restorations, pulpal consequences and caries-attributed tooth loss.
export const castFromLesion = ({ icdas = null, sealed = false, restored = false, pulpal = false, abscess = false, fistula = false, lost = false } = {}) => {
  if (lost) return 8;
  if (abscess || fistula) return 7;
  if (pulpal) return 6;
  if (icdas != null) {
    const c = clampNum(icdas, 0, 6);
    if (c >= 5) return 5;
    if (c >= 3) return 4;
    if (c >= 1) return 3;
  }
  if (restored) return 2;
  if (sealed) return 1;
  return 0;
};
export const castLabel = (code) => CLINICAL_FRAMEWORKS_V2.cast.grades[clampNum(code, 0, 9)] ?? 'not recorded';

// PUFA — count the clinical consequences of untreated caries across teeth.
export const pufaScore = (teeth = []) => {
  const out = { P: 0, U: 0, F: 0, A: 0, total: 0, codes: [] };
  if (!Array.isArray(teeth)) return out;
  for (const t of teeth) {
    let code = '';
    if (t?.pulpal) { out.P++; code = 'P'; }
    else if (t?.ulceration) { out.U++; code = 'U'; }
    else if (t?.fistula) { out.F++; code = 'F'; }
    else if (t?.abscess) { out.A++; code = 'A'; }
    if (code) { out.total++; out.codes.push({ tooth_id: t.tooth_id, code }); }
  }
  return out;
};

// Nyvad activity — the clinically decisive question: is the lesion PROGRESSING?
// Active lesions feel rough/matte and are light-coloured; arrested lesions are
// shiny, hard and dark. Activity, not size, drives treatment urgency.
export const nyvadActivity = ({ surface = '', texture = '', cavitated = false, filled = false } = {}) => {
  const tex = String(texture).toLowerCase();
  const surf = String(surface).toLowerCase();
  const active = /(rough|matte|chalky|soft|opaque)/.test(tex) || /(active|progress)/.test(surf);
  const inactive = /(shiny|smooth|hard|glossy|arrested|dark|brown|black)/.test(tex);
  const isActive = active || !inactive;
  const discontinuity = /(discontinu|microcav|breakdown)/.test(surf);

  let code;
  if (filled) code = isActive ? 8 : 9;
  else if (cavitated) code = isActive ? 3 : 6;
  else if (discontinuity) code = isActive ? 2 : 5;
  else if (active || inactive) code = isActive ? 1 : 4;
  else code = 0;

  return { code, active: code !== 0 && isActive, label: CLINICAL_FRAMEWORKS_V2.nyvad.grades[code], urgency: code === 0 ? 'none' : isActive ? 'high' : 'monitor' };
};

// Root Caries Index (Katz) — % of recession-exposed root surfaces with caries.
export const rootCariesIndex = (decayedRootSurfaces = 0, filledRootSurfaces = 0, surfacesWithRecession = 0) => {
  const denom = clampNum(surfacesWithRecession, 0, 128);
  if (!denom) return { rci: 0, risk: 'none', exposedSurfaces: 0 };
  const rci = Math.round(((clampNum(decayedRootSurfaces, 0, 128) + clampNum(filledRootSurfaces, 0, 128)) / denom) * 1000) / 10;
  return { rci, risk: rci >= 30 ? 'high' : rci >= 10 ? 'moderate' : 'low', exposedSurfaces: denom };
};

// Cariogram — probability (0-100%) of AVOIDING new caries over the next year.
// Weighted multifactorial model: diet, bacteria, susceptibility, circumstances.
// Higher output = better outlook.
export const cariogramChance = (f = {}) => {
  let risk = 0;
  // Caries experience & current disease (past caries is the strongest predictor).
  if (f.past_caries_experience) risk += 18;
  if (f.decayed_surfaces > 0) risk += Math.min(20, f.decayed_surfaces * 6);
  if (f.demineralization_white_spots) risk += 10;
  // Bacteria / biofilm load.
  if (f.plaque_index >= 2) risk += 12;
  else if (f.plaque_index >= 1) risk += 6;
  // Diet.
  if (f.high_sugar_diet) risk += 12;
  if (f.frequent_snacking) risk += 8;
  if (f.acidic_drinks) risk += 6;
  // Susceptibility / protective factors.
  if (f.reduced_saliva || f.dry_mouth) risk += 15;
  if (f.fluoride_exposure) risk -= 12;
  if (f.regular_dental_visits) risk -= 8;
  if (f.appliance) risk += 7;
  if (f.smoker) risk += 5;

  const chance = clampNum(100 - risk, 0, 100);
  return { chance: Math.round(chance), risk: chance >= 70 ? 'low' : chance >= 40 ? 'moderate' : 'high' };
};

// ─────────────────────────────────────────────────────────────────────────
// ENAMEL DEFECTS — fluorosis (Dean / TF) and MIH
// ─────────────────────────────────────────────────────────────────────────

// Dean's Index 0-5 from the proportion of enamel showing diffuse opacity.
// Fluorosis is DIFFUSE and bilateral/symmetrical (contrast with MIH).
export const deansFluorosisIndex = ({ affectedEnamelPercent = 0, pitting = false, brownStaining = false } = {}) => {
  const pct = clampNum(affectedEnamelPercent, 0, 100);
  let score;
  if (pitting || pct > 50) score = 5;
  else if (brownStaining || pct > 25) score = 4;
  else if (pct > 10) score = 3;
  else if (pct > 5) score = 2;
  else if (pct > 0) score = 1;
  else score = 0;
  return { score, label: CLINICAL_FRAMEWORKS_V2.deans_fluorosis.grades[score], whiteningNote: score >= 4 ? 'Bleaching alone rarely resolves moderate/severe fluorosis — microabrasion or veneers are usually needed' : score >= 2 ? 'Responds reasonably to bleaching; blending improves with time' : null };
};

// Thylstrup-Fejerskov 0-9 — finer resolution than Dean, maps back to Dean.
export const tfIndex = (deansScore = 0) => {
  const d = clampNum(deansScore, 0, 5);
  const map = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 5, 5: 7 };
  const tf = map[d] ?? 0;
  return { tf, enamelLoss: tf >= 5, description: tf >= 5 ? 'Enamel loss present' : tf >= 3 ? 'Confluent opacity, surface intact' : tf >= 1 ? 'Fine white lines / opacity' : 'Normal translucency' };
};

// MIH severity (EAPD). MIH opacities are DEMARCATED (sharp border, creamy-white
// to yellow-brown) and asymmetric — the key differential vs diffuse fluorosis.
export const mihSeverity = ({ demarcatedOpacities = false, posteruptiveBreakdown = false, sensitivity = false, atypicalRestoration = false, aestheticConcern = false } = {}) => {
  if (!demarcatedOpacities && !posteruptiveBreakdown) return { severity: 'none', label: 'No MIH signs detected', differential: null };
  const severe = posteruptiveBreakdown || atypicalRestoration || sensitivity;
  const severity = severe ? 'severe' : aestheticConcern ? 'moderate' : 'mild';
  return {
    severity,
    label: CLINICAL_FRAMEWORKS_V2.mih.grades[severity],
    differential: 'Demarcated + asymmetric opacities suggest MIH rather than fluorosis (which is diffuse and symmetrical)',
    whiteningNote: 'MIH enamel is porous — bleaching can increase sensitivity; resin infiltration or microabrasion is often preferred',
  };
};

// ─────────────────────────────────────────────────────────────────────────
// AESTHETICS — golden / RED proportion, recession classification
// ─────────────────────────────────────────────────────────────────────────

// Golden (61.8%) & RED (70%) proportion analysis of the maxillary anterior teeth
// as seen from the facial view. Widths are apparent widths, central → canine.
export const smileProportionAnalysis = (widths = {}) => {
  const central = Number(widths.central) || 0;
  const lateral = Number(widths.lateral) || 0;
  const canine = Number(widths.canine) || 0;
  if (!central || !lateral) return { valid: false };

  const lateralToCentral = Math.round((lateral / central) * 1000) / 10;
  const canineToLateral = canine ? Math.round((canine / lateral) * 1000) / 10 : null;

  const nearest = (v, target) => Math.abs(v - target);
  const matchesGolden = nearest(lateralToCentral, 61.8) <= 5;
  const matchesRed = nearest(lateralToCentral, 70) <= 5;

  return {
    valid: true,
    lateralToCentral,
    canineToLateral,
    matchesGolden,
    matchesRed,
    preferredRatio: matchesRed ? 'RED 70%' : matchesGolden ? 'Golden 61.8%' : 'natural variation',
    note: 'Golden proportion occurs naturally in only ~14-25% of smiles; the RED 70% proportion is what most dentists prefer aesthetically.',
  };
};

// Width-to-height ratio of the maxillary central incisor. Aesthetic ideal ≈ 78-80%.
export const centralIncisorRatio = (widthMm = 0, heightMm = 0) => {
  const w = Number(widthMm) || 0, h = Number(heightMm) || 0;
  if (!w || !h) return { valid: false };
  const ratio = Math.round((w / h) * 1000) / 10;
  return {
    valid: true,
    ratio,
    ideal: 78,
    assessment: ratio > 88 ? 'appears short/wide (worn or short clinical crown)' : ratio < 68 ? 'appears long/narrow' : 'within aesthetic range',
  };
};

// Miller / Cairo recession classification — drives root-coverage prognosis.
export const recessionClassification = ({ recessionMm = 0, reachesMucogingivalJunction = false, interdentalAttachmentLossMm = 0, buccalAttachmentLossMm = 0 } = {}) => {
  const rec = clampNum(recessionMm, 0, 15);
  if (rec <= 0) return { miller: null, cairo: null, coverage: 'n/a', label: 'No recession detected' };

  const interdental = clampNum(interdentalAttachmentLossMm, 0, 15);
  const buccal = clampNum(buccalAttachmentLossMm, 0, 15);

  let cairo;
  if (interdental <= 0) cairo = 'RT1';
  else if (interdental <= buccal) cairo = 'RT2';
  else cairo = 'RT3';

  let miller;
  if (cairo === 'RT3') miller = 'IV';
  else if (interdental > 0) miller = 'III';
  else miller = reachesMucogingivalJunction ? 'II' : 'I';

  const coverage = miller === 'IV' ? 'none expected' : miller === 'III' ? 'partial' : 'complete expected';
  return { miller, cairo, coverage, recessionMm: rec, label: `Miller Class ${miller} · Cairo ${cairo}`, description: CLINICAL_FRAMEWORKS_V2.miller_recession.grades[miller] };
};