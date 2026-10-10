// Shared accuracy helpers for teewai scans.
//
// Food-scan item confidence is the catalog match score (0-1) or the LLM's
// 0-100 value — normalize both to a 0-100 percentage.
// Teeth scans have no scan-level confidence from the vision AI, so we derive
// one from the photo-quality + calibration signals already on the scan record
// (reference card, tooth count, smile bbox, needs_another_photo).

export const normConfidence = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n <= 1 ? n * 100 : n)));
};

// Overall food-scan accuracy = average of per-item identification confidences.
export const foodScanAccuracy = (items = []) => {
  if (!Array.isArray(items) || !items.length) return null;
  const vals = items.map((it) => normConfidence(it?.confidence)).filter((v) => v != null);
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
};

// Derived teeth-scan analysis confidence (0-98). A photo flagged for retake is
// low; a calibrated, well-framed scan with many teeth seen is high.
export const teethScanAccuracy = (scan = {}) => {
  if (!scan) return null;
  if (scan.needs_another_photo) return 35;
  let acc = 70;
  if (scan.reference_material_detected) acc += 15;
  const teeth = Array.isArray(scan.tooth_analysis) ? scan.tooth_analysis.length : 0;
  acc += teeth >= 10 ? 10 : teeth >= 6 ? 5 : 0;
  if (scan.smile_bbox) acc += 5;
  return Math.max(0, Math.min(98, Math.round(acc)));
};

// Rank an accuracy/confidence percentage into a scored tier so the raw number
// is interpretable at a glance. Used by both the food-scan and teeth-scan
// accuracy displays. Returns { label, tone } or null.
export const accuracyRank = (acc) => {
  const v = Number(acc);
  if (!Number.isFinite(v)) return null;
  if (v >= 90) return { label: 'Excellent', tone: 'success' };
  if (v >= 75) return { label: 'Good', tone: 'olo' };
  if (v >= 55) return { label: 'Fair', tone: 'warning' };
  return { label: 'Low', tone: 'danger' };
};