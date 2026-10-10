// Live stain simulation — tracks the estimated shade between real scans.
// Real scans are the truth anchor. The estimate only lives between scans,
// is always labeled as an estimate, and NEVER feeds baseline math,
// What-changed deltas, purple strip detection, or anything that expects
// real scan data.

const STORAGE_KEY = 'teewai_stain_sim_v1';
const ANCHOR_KEY = 'teewai_stain_anchor_v1';

// Calibrated degradation: stain_level 50 -> ~2 points, 100 -> ~4 points
const STAIN_CALIBRATION = 0.04;
// Water mitigation: 30% if within 30 minutes of the most recent stain, 10% otherwise
const WATER_WINDOW_MS = 30 * 60 * 1000;
const WATER_MITIGATION_RECENT = 0.3;
const WATER_MITIGATION_OLD = 0.1;
// Water in a meal reduces that meal's stain impact by 30%
const WATER_IN_MEAL_REDUCTION = 0.7;

function getState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { actions: [], accumulatedDegradation: 0 };
    return JSON.parse(raw);
  } catch {
    return { actions: [], accumulatedDegradation: 0 };
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function getAnchor() {
  try {
    const raw = localStorage.getItem(ANCHOR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setAnchor(scan) {
  try {
    localStorage.setItem(ANCHOR_KEY, JSON.stringify({
      scanId: scan.id,
      score: scan.score ?? 0,
      shade: scan.shade ?? null,
      shadeCode: scan.shade_code ?? null,
      date: scan.created_date ?? new Date().toISOString(),
    }));
  } catch {}
}

function getLiveEstimate() {
  const anchor = getAnchor();
  if (!anchor) return null;
  const state = getState();
  // Clamp: never above anchor score, never below 0
  const estimate = Math.max(0, Math.min(anchor.score, anchor.score - state.accumulatedDegradation));
  return {
    anchorScore: anchor.score,
    anchorShade: anchor.shade,
    anchorShadeCode: anchor.shadeCode,
    anchorDate: anchor.date,
    anchorScanId: anchor.scanId,
    estimate,
    degradation: state.accumulatedDegradation,
  };
}

// Apply a food's stain impact to the estimate.
// hasWater = true when water was included in the scanned meal (auto-reduces).
function applyStain(foodItem, hasWater = false) {
  const state = getState();
  const stainLevel = foodItem.stain_level ?? foodItem.stainLevel ?? 0;
  let degradation = stainLevel * STAIN_CALIBRATION;
  if (hasWater) degradation *= WATER_IN_MEAL_REDUCTION;
  state.accumulatedDegradation += degradation;
  state.actions.push({
    type: 'stain',
    foodName: foodItem.name || foodItem.item_name || 'Unknown food',
    stainLevel,
    degradation,
    hasWater,
    waterResolved: !hasWater,
    image_url: foodItem.image_url || null,
    timestamp: Date.now(),
  });
  saveState(state);
  return getLiveEstimate();
}

// Brush teeth: clears ALL accumulated simulated stain, restoring toward the anchor.
// Never goes above the anchor score (clamped in getLiveEstimate).
function brushTeeth() {
  const state = getState();
  state.accumulatedDegradation = 0;
  state.actions.push({
    type: 'brush',
    timestamp: Date.now(),
  });
  saveState(state);
  return getLiveEstimate();
}

// Drink water: mitigates a fraction of the MOST RECENT stain event only.
// 30% if within 30 minutes, 10% otherwise.
function drinkWater() {
  const state = getState();
  const recentStain = [...state.actions].reverse().find(a => a.type === 'stain');
  if (!recentStain) {
    state.actions.push({ type: 'water', mitigated: 0, timestamp: Date.now() });
    saveState(state);
    return getLiveEstimate();
  }
  const withinWindow = (Date.now() - recentStain.timestamp) < WATER_WINDOW_MS;
  const fraction = withinWindow ? WATER_MITIGATION_RECENT : WATER_MITIGATION_OLD;
  const mitigated = recentStain.degradation * fraction;
  state.accumulatedDegradation = Math.max(0, state.accumulatedDegradation - mitigated);
  state.actions.push({
    type: 'water',
    mitigated,
    withinWindow,
    timestamp: Date.now(),
  });
  saveState(state);
  return getLiveEstimate();
}

// A new real scan resets the estimate to truth.
function resetOnNewScan(scan) {
  setAnchor(scan);
  const state = getState();
  state.accumulatedDegradation = 0;
  state.actions.push({
    type: 'scan_reset',
    scanId: scan.id,
    score: scan.score,
    shade: scan.shade,
    timestamp: Date.now(),
  });
  saveState(state);
  return getLiveEstimate();
}

function getActionLog() {
  return getState().actions;
}

function getActionsSince(timestamp) {
  return getState().actions.filter(a => a.timestamp >= timestamp);
}

function getActionsInRange(start, end) {
  return getState().actions.filter(a => a.timestamp >= start && a.timestamp < end);
}

// Mouthwash — a rinse with a slightly stronger mitigation than plain water.
const MOUTHWASH_MITIGATION_RECENT = 0.45;
const MOUTHWASH_MITIGATION_OLD = 0.20;

function useMouthwash() {
  const state = getState();
  const recentStain = [...state.actions].reverse().find(a => a.type === 'stain');
  if (!recentStain) {
    state.actions.push({ type: 'mouthwash', mitigated: 0, timestamp: Date.now() });
    saveState(state);
    return getLiveEstimate();
  }
  const withinWindow = (Date.now() - recentStain.timestamp) < WATER_WINDOW_MS;
  const fraction = withinWindow ? MOUTHWASH_MITIGATION_RECENT : MOUTHWASH_MITIGATION_OLD;
  const mitigated = recentStain.degradation * fraction;
  state.accumulatedDegradation = Math.max(0, state.accumulatedDegradation - mitigated);
  state.actions.push({ type: 'mouthwash', mitigated, withinWindow, timestamp: Date.now() });
  saveState(state);
  return getLiveEstimate();
}

// Meal-water prompt: when a food scan included water, ask whether the user
// drank it with the meal (keeps the existing water-in-meal reduction) or
// rinsed (applies an extra rinse mitigation on that meal). Returns the
// pending stain action or null.
function getPendingMealWater() {
  const state = getState();
  const pending = [...state.actions].reverse().find(a => a.type === 'stain' && a.hasWater && !a.waterResolved);
  return pending || null;
}

function resolveMealWater(rinsed) {
  const state = getState();
  const pending = [...state.actions].reverse().find(a => a.type === 'stain' && a.hasWater && !a.waterResolved);
  if (!pending) return getLiveEstimate();
  pending.waterResolved = true;
  if (rinsed) {
    // Rinsing mitigates 30% of that meal's own degradation on top of the
    // water-in-meal reduction already applied.
    const mitigated = pending.degradation * WATER_MITIGATION_RECENT;
    state.accumulatedDegradation = Math.max(0, state.accumulatedDegradation - mitigated);
    state.actions.push({ type: 'water', mitigated, withinWindow: true, timestamp: Date.now(), fromMealWater: true });
  }
  saveState(state);
  return getLiveEstimate();
}

// Per-action-type projected estimates for the trend graph's dotted lines.
// Each value is the estimated "now" score if only that action type's effect
// is considered, clamped to the anchor (never above the last real scan).
// baseNoAction = stains only; liveEstimate = the combined real estimate.
function getExtrapolations() {
  const anchor = getAnchor();
  if (!anchor) return null;
  const state = getState();
  let rawStain = 0, waterMit = 0, mouthwashMit = 0, brushed = false;
  state.actions.forEach(a => {
    if (a.type === 'stain') rawStain += a.degradation || 0;
    else if (a.type === 'brush') brushed = true;
    else if (a.type === 'water') waterMit += a.mitigated || 0;
    else if (a.type === 'mouthwash') mouthwashMit += a.mitigated || 0;
  });
  const clamp = (v) => Math.max(0, Math.min(anchor.score, v));
  const baseNoAction = clamp(anchor.score - rawStain);
  const liveEstimate = clamp(anchor.score - state.accumulatedDegradation);
  return {
    anchorScore: anchor.score,
    anchorDate: anchor.date,
    liveEstimate,
    baseNoAction,
    brush: brushed ? anchor.score : null,
    water: waterMit > 0 ? clamp(baseNoAction + waterMit) : null,
    mouthwash: mouthwashMit > 0 ? clamp(baseNoAction + mouthwashMit) : null,
  };
}

export {
  getLiveEstimate,
  useMouthwash,
  resolveMealWater,
  getPendingMealWater,
  getExtrapolations,
  MOUTHWASH_MITIGATION_RECENT,
  applyStain,
  brushTeeth,
  drinkWater,
  resetOnNewScan,
  getActionLog,
  getActionsSince,
  getActionsInRange,
  getAnchor,
  setAnchor,
  STAIN_CALIBRATION,
  WATER_WINDOW_MS,
  WATER_MITIGATION_RECENT,
  WATER_IN_MEAL_REDUCTION,
};