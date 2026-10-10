// unrufldteeth™ scoring core — pure, portable functions shared between the
// client (src/lib/unrufldteeth.js) and the analyzeScan backend function.
//
// Why this exists: the proprietary deterministic scoring (whiteness, shade,
// clinical reconciliation) must run identically on both sides so the backend
// can persist a complete scan record server-side (surviving a dropped client
// connection during the long AI call) while the client keeps using the same
// numbers for gamification + UI. Keeping the logic here means there is one
// source of truth — no drift between client and server.

export const computeProprietaryScore = (r: any = {}): number => {
  // ?? (not ||) so a true 0 ("no yellow", "no plaque") is honoured instead of
  // being replaced by the default — otherwise perfectly white teeth were
  // penalised by the fallback yellow/plaque values, capping everyone low.
  const luminance = Math.max(0, Math.min(100, r.enamel_luminance_score ?? 70));
  const yellowIndex = Math.max(0, Math.min(100, r.yellow_hue_saturation_index ?? 18));
  const plaquePenalty = Math.max(0, Math.min(100, r.plaque_coverage_percentage ?? 8));
  const stainDensity = Math.max(0, Math.min(100, r.stain_density_index ?? 10));
  // Luminance is the primary driver (already 0-100, AI-calibrated). Yellow,
  // plaque and stain subtract from it. This lets healthy white teeth (high
  // luminance, low yellow) land in the 75-90 range instead of being capped at
  // ~60 by the old 0.60 multiplier, while stained teeth still fall low.
  // Natural teeth baseline — ivory/off-white teeth (VITA A2-A3) have a natural
  // yellow hue that is NOT staining. Only apply the full yellow penalty above
  // the natural threshold; below it, the slope is gentle so natural yellow
  // teeth score in the healthy 70-85 range instead of being penalized as stained.
  const NATURAL_YELLOW = 25;
  const yellowPenalty = yellowIndex <= NATURAL_YELLOW
    ? yellowIndex * 0.12
    : NATURAL_YELLOW * 0.12 + (yellowIndex - NATURAL_YELLOW) * 0.45;
  const raw = luminance - yellowPenalty - (plaquePenalty * 0.12) - (stainDensity * 0.08);
  return Math.max(0, Math.min(100, Math.round(raw)));
};

// Fallback VITA Classical shade from the proprietary whiteness score, used
// when the AI omits the shade but the photo is usable (non-adverse conditions).
export const shadeFromScore = (score: number): { shade: string; shade_code: string } => {
  const s = Math.max(0, Math.min(100, Math.round(score || 0)));
  if (s >= 80) return { shade: "A1", shade_code: "A1" };
  if (s >= 70) return { shade: "A2", shade_code: "A2" };
  if (s >= 55) return { shade: "A3", shade_code: "A3" };
  if (s >= 45) return { shade: "A3.5", shade_code: "A3.5" };
  if (s >= 35) return { shade: "A4", shade_code: "A4" };
  if (s >= 25) return { shade: "B4", shade_code: "B4" };
  if (s >= 15) return { shade: "C3", shade_code: "C3" };
  return { shade: "C4", shade_code: "C4" };
};

// ICDAS — translate the AI's lesion type/severity into the validated 0-6 code.
const icdasFromLesion = (lesion: any = {}): number => {
  const t = (lesion.type || "").toLowerCase();
  const sev = (lesion.severity || "").toLowerCase();
  if (t === "cavitation" || sev === "advanced") return 6;
  if (t === "root" && sev === "moderate") return 5;
  if (sev === "moderate") return t === "pit_fissure" || t === "interproximal" ? 4 : 3;
  if (t === "brown_spot") return 2;
  if (t === "white_spot" || sev === "early") return 1;
  return 0;
};

// Plaque/caries reconciliation — cross-check the AI's structured detection
// against the emitted clinical indices and flag inconsistencies so the
// deterministic layer can trust (or correct) the AI output.
export const reconcilePlaqueCaries = (result: any = {}): any => {
  const flags: any[] = [];
  const pd = result.plaque_detection || {};
  const cd = Array.isArray(result.caries_detection) ? result.caries_detection : [];
  const icdas = cd.map((l: any) => {
    const code = icdasFromLesion(l);
    return { tooth_id: l.tooth_id, type: l.type, severity: l.severity, location: l.location, confidence: l.confidence, icdas: code, icdas_label: icdasLabel(code) };
  });

  const coverage = typeof pd.coverage_percent === "number" ? pd.coverage_percent : null;
  const pi = typeof result.plaque_index === "number" ? result.plaque_index : null;
  if (coverage != null && pi != null && coverage >= 40 && pi <= 0) flags.push({ field: "plaque", issue: "high coverage but zero plaque index", severity: "review" });

  const hasAdvanced = icdas.some((l: any) => l.icdas >= 4);
  const decayed = typeof result.dmf_decayed_surfaces === "number" ? result.dmf_decayed_surfaces : null;
  if (hasAdvanced && decayed != null && decayed <= 0) flags.push({ field: "caries", issue: "advanced lesion present but DMF-decayed count is zero", severity: "review" });

  if (result.demineralization_white_spots === false && icdas.some((l: any) => l.type === "white_spot")) flags.push({ field: "demineralization", issue: "white-spot lesion detected but demineralization flag is false", severity: "review" });

  return { icdas, flags, cariesCount: icdas.length, maxIcdas: icdas.reduce((m: number, l: any) => Math.max(m, l.icdas), 0), plaqueCoverage: coverage };
};

const CLINICAL_FRAMEWORKS_ICDAS: Record<number, string> = { 0: "sound", 1: "first visual change (wet)", 2: "distinct visual change (wet)", 3: "localized enamel breakdown", 4: "underlying dentin shadow", 5: "distinct cavity, exposed dentin", 6: "extensive distinct cavity" };
const icdasLabel = (code: number): string => CLINICAL_FRAMEWORKS_ICDAS[code] ?? "sound";

// Reference-card white-balance correction — the deterministic "correct the
// tooth relative to it" step. The AI reports the white reference card's
// observed RGB (a known-neutral anchor) alongside the tooth's RAW metrics.
// The card's red-blue imbalance reveals the ambient warm/cool cast; its
// brightness reveals the exposure. We adjust the tooth's yellow index and
// luminance to cancel that cast, so the final score reflects the tooth's true
// color independent of the lighting — with NO gray-world assumption. Bounded
// so it can never over-correct; a no-op when no card is present.
const clampUnit = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
export const applyReferenceCardCorrection = (result: any = {}): any => {
  const card = result.reference_card_rgb;
  if (!card || typeof card.r !== "number" || typeof card.b !== "number") return result;
  const cr = Math.max(0, Math.min(255, card.r));
  const cg = Math.max(0, Math.min(255, card.g ?? card.r));
  const cb = Math.max(0, Math.min(255, card.b));
  // Warm/cool cast: warm light (R>B) inflates the tooth's yellow index; cool
  // light (B>R) deflates it. A card R-B of ~30 is a strong warm cast.
  const castPoints = Math.max(-40, Math.min(40, ((cr - cb) / 255) * 100));
  // Exposure: a dim card means the tooth's luminance is underestimated; an
  // overexposed card means it's overestimated. Scale toward neutral (~220).
  const cardLum = 0.299 * cr + 0.587 * cg + 0.114 * cb;
  const exposure = Math.max(0.88, Math.min(1.15, 220 / Math.max(80, cardLum)));
  const corrected: any = { ...result };
  corrected.yellow_hue_saturation_index = Math.round(
    clampUnit((result.yellow_hue_saturation_index ?? 18) - castPoints * 0.6)
  );
  corrected.enamel_luminance_score = Math.round(
    clampUnit((result.enamel_luminance_score ?? 70) * exposure)
  );
  return corrected;
};

// postProcess — runs after the AI returns. Pure: no browser APIs, safe server-side.
export const postProcess = (result: any = {}, preContext: any = {}) => {
  const corrected = applyReferenceCardCorrection(result);
  const proprietaryScore = computeProprietaryScore(corrected);
  const reconciliation = reconcilePlaqueCaries(result);
  return { proprietaryScore, reconciliation, preContext, corrected };
};

// Build the full scan entity payload from the AI result + context. This is the
// single source of truth for the ~40-field mapping — used by both the backend
// (server-side persist) and the client (fallback / trait update). Returns the
// entity-shape object (snake_case), matching the Scan entity + InsForge `data`.
import { computeDormantInsights } from "./dormantInsights.ts";

export const buildScanPayload = (result: any = {}, ctx: {
  position?: string;
  patientEmail?: string | null;
  dentistId?: string | null;
  imageUrl?: string;
  imageUrls?: string[] | null;
  scanMode?: string;
  scanType?: string;
}): Record<string, any> => {
  const { proprietaryScore, reconciliation } = postProcess(result, {});

  // Ensure a shade is always determined in non-adverse conditions: if the AI
  // omitted the VITA shade, derive one from the proprietary score.
  let shade = result.shade;
  let shade_code = result.shade_code;
  if ((!shade || !shade_code) && !result.needs_another_photo) {
    const fb = shadeFromScore(proprietaryScore);
    if (!shade) shade = fb.shade;
    if (!shade_code) shade_code = fb.shade_code;
  }

  // 0M1–0M3 are VITA Bleached shades — only reachable through professional /
  // artificial whitening. Detecting one means the user has already undergone
  // such treatment; the backend flags the user so this is surfaced.
  const artificial_whitening_detected = /^0M/i.test(String(shade_code || ''));

  return {
    image_url: ctx.imageUrl,
    image_urls: ctx.imageUrls || [],
    scan_type: ctx.scanType || "quick",
    capture_position: ctx.position,
    scan_mode: ctx.scanMode || "teeth",
    score: proprietaryScore,
    shade,
    shade_code,
    artificial_whitening_detected,
    brightness: result.brightness,
    stains_detected: result.stains_detected || [],
    stain_types: result.stain_types || [],
    smile_zone_score: result.smile_zone_score,
    smile_zone_shade: result.smile_zone_shade,
    whitening_potential_score: result.whitening_potential_score,
    whitening_potential_shade: result.whitening_potential_shade,
    whitening_potential_shade_code: result.whitening_potential_shade_code,
    weeks_to_potential: result.weeks_to_potential,
    whitening_filter_intensity: result.whitening_filter_intensity,
    color_temperature: result.color_temperature,
    smile_bbox: result.smile_bbox || null,
    per_tooth_whitening_targets: result.per_tooth_whitening_targets || [],
    whitening_potential_bleached_shade: result.whitening_potential_bleached_shade || null,
    plaque_index: result.plaque_index,
    gingival_index: result.gingival_index,
    gingival_index_grade: result.gingival_index_grade,
    bewe_score: result.bewe_score,
    erosion_risk: result.erosion_risk,
    periodontal_risk: result.periodontal_risk,
    calculus_present: result.calculus_present,
    restorations_detected: result.restorations_detected || [],
    plaque_detection: result.plaque_detection || null,
    caries_detection: result.caries_detection || [],
    demineralization_white_spots: result.demineralization_white_spots,
    dmf_decayed_surfaces: result.dmf_decayed_surfaces,
    dmf_missing_surfaces: result.dmf_missing_surfaces,
    dmf_filled_surfaces: result.dmf_filled_surfaces,
    procedures: result.procedures || [],
    dental_health_score: result.dental_health_score,
    gum_health: result.gum_health,
    gum_health_severity: result.gum_health_severity,
    plaque_level: result.plaque_level,
    plaque_severity: result.plaque_severity,
    enamel_condition: result.enamel_condition,
    enamel_severity: result.enamel_severity,
    dental_health_issues: result.dental_health_issues || [],
    recommendations: result.recommendations || [],
    products: result.products || [],
    dentist_id: ctx.dentistId || null,
    patient_email: ctx.patientEmail || null,
    needs_another_photo: result.needs_another_photo || false,
    tooth_analysis: result.tooth_analysis || [],
    reference_material_detected: result.reference_material_detected || false,
    reference_material_note: result.reference_material_note || "",
    reference_card_rgb: result.reference_card_rgb || null,
    ai_feedback: result.ai_feedback || "",
    full_report: ctx.scanType === "full" ? (result.full_report || null) : null,
    engine_reconciliation: reconciliation,
    engine_insights: computeDormantInsights({ ...result, score: proprietaryScore, shade_code: shade_code }),
    status: "completed",
  };
};

// Map a scan entity payload to an InsForge `scans` row: indexed columns +
// `data` JSONB. Mirrors the client makeEntity `split` for the scans table.
// userId is NOT set here — the caller (backend) stamps it on insert, or leaves
// it untouched on update (the analyzing record already owns it).
const SCANS_INDEXED = ["capture_position", "patient_email", "score", "shade"];
const SCANS_RESERVED = new Set(["id", "created_date", "updated_date", "user_id", ...SCANS_INDEXED]);

export const splitScanRow = (payload: Record<string, any>): Record<string, any> => {
  const row: Record<string, any> = { data: {} };
  const colMap: Record<string, string> = {
    capture_position: "capturePosition",
    patient_email: "patientEmail",
  };
  for (const k of SCANS_INDEXED) {
    if (payload[k] !== undefined) row[colMap[k] || k] = payload[k];
  }
  for (const [k, v] of Object.entries(payload)) {
    if (!SCANS_RESERVED.has(k)) row.data[k] = v;
  }
  return row;
};

// Reverse: InsForge row -> scan entity (for returning the saved scan to the
// client so it can use it directly without a re-fetch).
export const rowToScanEntity = (row: any): Record<string, any> => {
  if (!row) return null;
  const ent: Record<string, any> = { ...(row.data || {}) };
  if (row.capturePosition !== undefined && row.capturePosition !== null) ent.capture_position = row.capturePosition;
  if (row.patientEmail !== undefined && row.patientEmail !== null) ent.patient_email = row.patientEmail;
  if (row.score !== undefined && row.score !== null) ent.score = row.score;
  if (row.shade !== undefined && row.shade !== null) ent.shade = row.shade;
  ent.id = row.id;
  ent.created_date = row.created_at;
  ent.updated_date = row.updated_at;
  return ent;
};