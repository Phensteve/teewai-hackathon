// User-chosen baseline reference helpers. Progress is measured against the
// user's chosen reference: either their own baseline scan ("scan") or the
// generic ideal smile ("ideal"). The reference type is stored alongside the
// baseline scan ID on the Base44 User entity via updateMe.
//
// The smart default: the user's first scan becomes the baseline silently,
// and the reference type defaults to "scan" (CreTracker style).

import { shadeIndex, shadeByCode } from './vitaShade';
import { unrufld } from '@/api/unrufldClient';

// The generic ideal smile reference — the lightest natural VITA shade.
// Used when baseline_type is "ideal". A realistic, achievable target.
export const IDEAL_SHADE_CODE = 'A1';
export const IDEAL_SHADE_LABEL = 'A1';
export const IDEAL_SCORE = 85;

// VITA ladder steps lighter (positive) or darker (negative) vs a reference.
// Returns null if either shade code is unrecognised.
export function shadeDeltaSteps(currentCode, referenceCode) {
  const cur = shadeIndex(currentCode);
  const ref = shadeIndex(referenceCode);
  if (cur < 0 || ref < 0) return null;
  return ref - cur;
}

// Human label: "2 shades lighter", "1 shade darker", "no shade change".
export function formatShadeDelta(steps) {
  if (steps == null) return null;
  if (steps === 0) return 'no shade change';
  const abs = Math.abs(steps);
  const noun = abs === 1 ? 'shade' : 'shades';
  return `${abs} ${noun} ${steps > 0 ? 'lighter' : 'darker'}`;
}

// Positive framing for the ideal reference: "2 shades from the ideal smile".
// Never shame framing — always "here's the gap to close", not "far from ideal".
export function formatIdealGap(steps) {
  if (steps == null) return null;
  if (steps === 0) return 'You match the ideal smile shade';
  const abs = Math.abs(steps);
  const noun = abs === 1 ? 'shade' : 'shades';
  return `${abs} ${noun} from the ideal smile`;
}

// Overall delta between the current scan and a reference scan.
export function computeOverallDelta(currentScan, referenceScan) {
  if (!currentScan || !referenceScan) return null;
  const steps = shadeDeltaSteps(currentScan.shade_code, referenceScan.shade_code);
  const scoreDelta = (currentScan.score != null && referenceScan.score != null)
    ? Math.round(currentScan.score - referenceScan.score)
    : null;
  return { steps, scoreDelta, label: formatShadeDelta(steps) };
}

// Delta vs the generic ideal smile (not a scan). Returns steps + score gap.
export function computeIdealDelta(scan) {
  if (!scan) return null;
  const steps = shadeDeltaSteps(scan.shade_code, IDEAL_SHADE_CODE);
  const scoreGap = (scan.score != null)
    ? Math.round(IDEAL_SCORE - scan.score)
    : null;
  return { steps, scoreGap, label: formatIdealGap(steps) };
}

// Per-tooth whiteness deltas between current and reference scans.
export function computePerToothDeltas(currentScan, referenceScan) {
  if (!currentScan?.tooth_analysis || !referenceScan?.tooth_analysis) return [];
  const refMap = {};
  referenceScan.tooth_analysis.forEach((t) => { refMap[t.tooth_id] = t; });
  return currentScan.tooth_analysis
    .filter((t) => refMap[t.tooth_id])
    .map((t) => {
      const ref = refMap[t.tooth_id];
      const delta = Math.round((t.whiteness_score || 0) - (ref.whiteness_score || 0));
      let status = 'unchanged';
      if (delta > 0) status = 'improved';
      else if (delta < 0) status = 'darkened';
      return {
        tooth_id: t.tooth_id,
        tooth_type: t.tooth_type,
        currentScore: t.whiteness_score,
        referenceScore: ref.whiteness_score,
        delta,
        status,
      };
    });
}

export function getBaselineScanId(user) {
  return user?.baseline_scan_id || null;
}

export function getBaselineType(user) {
  return user?.baseline_type === 'ideal' ? 'ideal' : 'scan';
}

// Store the baseline scan on the Base44 User entity via updateMe.
export async function setBaseline(scanId, scanDate) {
  await unrufld.auth.updateMe({
    baseline_scan_id: scanId,
    baseline_set_date: scanDate || new Date().toISOString(),
    baseline_type: 'scan',
  });
}

// Switch to the generic ideal smile reference (no scan ID needed).
export async function setIdealBaseline() {
  await unrufld.auth.updateMe({
    baseline_type: 'ideal',
    baseline_set_date: new Date().toISOString(),
  });
}

// Smart default: if the user has scans but no baseline, silently set the
// oldest scan as the baseline. Returns the baseline scan ID (or null).
export async function ensureBaseline(user, scanList) {
  const existing = getBaselineScanId(user);
  if (existing) return existing;
  const oldest = oldestEligibleScan(scanList);
  if (!oldest) return null;
  try {
    await setBaseline(oldest.id, oldest.created_date);
    return oldest.id;
  } catch {
    return null;
  }
}

export function isFlagged(scan) {
  return !!scan?.color_correcting_product_detected;
}

export function oldestEligibleScan(scanList) {
  if (!scanList || scanList.length === 0) return null;
  const eligible = scanList.filter((s) => !isFlagged(s));
  return eligible.length > 0 ? eligible[eligible.length - 1] : null;
}

export function findBaselineScan(scanList, baselineId) {
  if (!baselineId) return null;
  const scan = (scanList || []).find((s) => s.id === baselineId) || null;
  if (isFlagged(scan)) return null;
  return scan;
}

export function fallbackBaselineScanId(scanList) {
  if (!scanList || scanList.length === 0) return null;
  return scanList[scanList.length - 1].id;
}

export function formatBaselineDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
}

export function isPreBaseline(currentScan, baselineScan) {
  if (!currentScan?.created_date || !baselineScan?.created_date) return false;
  return new Date(currentScan.created_date) < new Date(baselineScan.created_date);
}

export function anchorTargetsToBaseline(scan, baselineScan) {
  const targets = scan?.per_tooth_whitening_targets;
  if (!targets || !baselineScan) return targets || [];
  const baseShades = {};
  (baselineScan.tooth_analysis || []).forEach((t) => {
    if (t.current_shade) baseShades[t.tooth_id] = t.current_shade;
  });
  (baselineScan.per_tooth_whitening_targets || []).forEach((t) => {
    if (t.current_shade && !baseShades[t.tooth_id]) baseShades[t.tooth_id] = t.current_shade;
  });
  return targets.map((t) => ({
    ...t,
    baseline_shade: baseShades[t.tooth_id] || t.current_shade,
  }));
}

export function shadeHex(code) {
  const s = shadeByCode(code);
  return s?.hex || null;
}

// Find the scan immediately before the current one (chronologically).
// scanList is sorted newest-first (as returned by insforgeScans.list('-created_date')).
export function findPreviousScan(scanList, currentScanId) {
  if (!scanList || scanList.length < 2) return null;
  const idx = scanList.findIndex((s) => s.id === currentScanId);
  if (idx < 0 || idx >= scanList.length - 1) return null;
  return scanList[idx + 1];
}