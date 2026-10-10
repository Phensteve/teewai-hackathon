// unrufldteeth™ dormant insights — computes the "dormant" feature values from
// the AI scan result so they're stored on every scan and surfaced in the UI.
//
// This module is the shared source (server + client): scoring.ts calls it
// inside buildScanPayload so the backend persists engine_insights on every
// scan (surviving dropped connections), and the client re-exports it so the
// fallback create path computes the same values.
//
// Only features that can be derived from data the AI already returns are
// computed here. Features that require physical measurements not available
// from a single photo (probing depths, Bolton tooth-size sums, gingival
// display, papilla position) are intentionally omitted — they can't produce
// honest numbers from the available input.

export const computeDormantInsights = (result: any = {}): Record<string, any> => {
  const score = typeof result.score === "number" ? result.score
    : typeof result.proprietaryScore === "number" ? result.proprietaryScore
    : 70;

  const luminance = typeof result.enamel_luminance_score === "number" ? result.enamel_luminance_score : 70;
  const yellowIndex = typeof result.yellow_hue_saturation_index === "number" ? result.yellow_hue_saturation_index : 18;
  const plaqueIndex = typeof result.plaque_index === "number" ? result.plaque_index : null;
  const calculusPresent = Boolean(result.calculus_present);
  const plaqueLevel = result.plaque_level || "none";
  const enamelCondition = String(result.enamel_condition || "");
  const decayedSurfaces = typeof result.dmf_decayed_surfaces === "number" ? result.dmf_decayed_surfaces : 0;
  const whiteSpots = Boolean(result.demineralization_white_spots);
  const beweScore = typeof result.bewe_score === "number" ? result.bewe_score : null;
  const dentalHealthIssues = Array.isArray(result.dental_health_issues) ? result.dental_health_issues : [];
  const artificialWhitening = /^0M/i.test(String(result.shade_code || ""));

  // --- VITA 3D-MASTER shade tab (value · hue · chroma) ---
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const vitaValue = s >= 85 ? 5 : s >= 70 ? 4 : s >= 55 ? 3 : s >= 40 ? 2 : 1;
  const vitaHue = s >= 70 ? "L" : s >= 45 ? "M" : "R";
  const vitaChroma = s >= 80 ? 1 : s >= 55 ? 1.5 : s >= 30 ? 2 : 3;
  const vita3dMaster = { tab: `${vitaValue}${vitaHue}${vitaChroma}`, value: vitaValue, hue: vitaHue, chroma: vitaChroma };

  // --- Halitosis (bad breath) likelihood 0-100 ---
  let halitosis = 0;
  if (plaqueIndex != null) halitosis += plaqueIndex * 12;
  if (calculusPresent) halitosis += 20;
  if (plaqueLevel === "heavy") halitosis += 25;
  else if (plaqueLevel === "moderate") halitosis += 15;
  if (/(tongue|coating)/i.test(dentalHealthIssues.join(" "))) halitosis += 20;
  const halitosisRisk = Math.max(0, Math.min(100, Math.round(halitosis)));

  // --- Dental age estimate ---
  let dentalAge = 25;
  dentalAge += (70 - score) * 0.4;
  if (/(attrition|wear|abrasion)/i.test(enamelCondition)) dentalAge += 8;
  if (/(recession|bone loss)/i.test(dentalHealthIssues.join(" "))) dentalAge += 6;
  if (calculusPresent) dentalAge += 4;
  dentalAge = Math.max(12, Math.round(dentalAge));

  // --- Whitening responsiveness 0-100 ---
  const intrinsic = result.intrinsic_discoloration ? 15 : 0;
  const fluorosis = /fluorosis|hypoplasia/i.test(enamelCondition) ? 20 : 0;
  const whiteningResponsiveness = Math.max(0, Math.min(100, Math.round(50 + (luminance - 50) * 0.4 - yellowIndex * 0.3 - intrinsic - fluorosis)));

  // --- Shade aging curve (predicted whiteness without treatment) ---
  const decayPerWeek = 0.18;
  const shadeAging = {
    weeks_4: Math.max(0, Math.min(100, Math.round(score - decayPerWeek * 4))),
    weeks_12: Math.max(0, Math.min(100, Math.round(score - decayPerWeek * 12))),
    weeks_24: Math.max(0, Math.min(100, Math.round(score - decayPerWeek * 24))),
  };

  // --- Post-whitening shade relapse (only if artificially whitened) ---
  let shadeRelapse = null;
  if (artificialWhitening) {
    const reboundPerWeek = 0.5;
    shadeRelapse = {
      weeks_2: Math.max(0, Math.min(100, Math.round(score - reboundPerWeek * 2))),
      weeks_4: Math.max(0, Math.min(100, Math.round(score - reboundPerWeek * 4))),
      weeks_8: Math.max(0, Math.min(100, Math.round(score - reboundPerWeek * 8))),
    };
  }

  // --- CAMBRA caries risk ---
  let cambraScore = 0;
  if (decayedSurfaces > 0) cambraScore += 2;
  if (whiteSpots) cambraScore += 2;
  if (plaqueIndex != null && plaqueIndex >= 2) cambraScore += 1;
  const cambraRisk = cambraScore >= 5 ? "high" : cambraScore >= 2 ? "moderate" : "low";

  // --- Smith & Knight Tooth Wear Index (0-4) ---
  const t = enamelCondition.toLowerCase();
  let twi = 0;
  if (/(dentin|pulp|extensive|>2\/3)/i.test(t)) twi = 4;
  else if (/(moderate|1\/3.*2\/3)/i.test(t)) twi = 3;
  else if (/(dentin)/i.test(t)) twi = 2;
  else if (/(loss of texture|matte|early|wear|erosion|abrasion|attrition)/i.test(t)) twi = 1;
  if (beweScore != null && twi === 0) {
    if (beweScore >= 9) twi = 3;
    else if (beweScore >= 3) twi = 2;
    else if (beweScore >= 1) twi = 1;
  }

  // --- CAST caries spectrum from lesion data ---
  const caries = Array.isArray(result.caries_detection) ? result.caries_detection : [];
  const castScores = caries.map((l: any = {}) => {
    const sev = String(l.severity || "").toLowerCase();
    const type = String(l.type || "").toLowerCase();
    if (/(abscess|fistula|pulp)/.test(type)) return 9;
    if (/(cavitation|advanced)/.test(sev)) return 6;
    if (/moderate/.test(sev)) return 5;
    if (/early/.test(sev) || /white_spot/.test(type)) return 3;
    if (/brown_spot/.test(type)) return 2;
    return 0;
  });
  const maxCast = castScores.length ? Math.max(...castScores) : 0;
  const castLabelMap = ["sound", "first visual change", "distinct visual change", "localized enamel breakdown", "underlying dentin shadow", "distinct cavity", "extensive cavity", "pulp involvement", "", "abscess/fistula"];
  const castSpectrum = { max_code: maxCast, label: castLabelMap[maxCast] || "sound", lesion_count: caries.length };

  return {
    vita_3d_master: vita3dMaster,
    halitosis_risk: halitosisRisk,
    dental_age: dentalAge,
    whitening_responsiveness: whiteningResponsiveness,
    shade_aging: shadeAging,
    shade_relapse: shadeRelapse,
    cambra_risk: cambraRisk,
    tooth_wear_index: twi,
    cast_spectrum: castSpectrum,
  };
};