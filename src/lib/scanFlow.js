// Shared scan-flow helpers used by both the quick (runScan) and full
// (runFullScan) capture paths in Scan.jsx. Centralizing the gamification
// cue + reward construction removes ~120 lines of duplication and fixes a
// latent bug where playLevelUp was referenced but never imported.
import { playSuccess, playMilestone, playLevelUp, playChime } from '@/lib/sounds';
import { shadeConsensus } from '@/lib/teewaiColorimetry';
import { recordTraitFromScan } from '@/lib/discoveries';

// Gold refraction wave — the quiet-luxury celebration. Replaces confetti with
// a smooth radial champagne-gold wave (physics-spring, stiffness 380 / damping
// 34 — no overshoot). On milestones: a subtle chime + haptic feedback on mobile.
// The wave itself is rendered by the <GoldRefractionWave /> React component,
// which listens for the 'teewai:gold-refraction' custom event dispatched here.
export const fireGoldRefraction = (milestone = false) => {
  if (milestone) {
    playChime();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([30, 40, 60]); } catch {}
    }
  }
  try {
    window.dispatchEvent(new CustomEvent('teewai:gold-refraction', { detail: { milestone } }));
  } catch {}
};

// Play the success chime, milestone sparkle, rank-up fanfare, and gold
// refraction wave based on the server-computed gamification result.
export const playGamificationCues = (g) => {
  const newMilestones = g?.milestones || [];
  const prevRank = g?.prevRank;
  const newRank = g?.rank;
  playSuccess();
  const hasMilestone = newMilestones.length > 0 || (newRank && prevRank && newRank.idx > prevRank.idx);
  if (hasMilestone) setTimeout(() => playMilestone(), 500);
  if (newRank && prevRank && newRank.idx > prevRank.idx) setTimeout(() => playLevelUp(), 700);
  fireGoldRefraction(hasMilestone);
};

// Build the reward object consumed by the RewardReveal overlay.
// `isFirst` falls back to the local first-scan flag when the server doesn't
// provide one (success path); the poll path omits it so only g.isFirst is used.
export const buildRewardState = ({ g, scanId, isFirst }) => {
  const trait = g?.trait;
  const rewardDrop = g?.reward;
  const firstFlag = (g?.isFirst ?? isFirst) ? '1' : '0';
  // Persist the rolled Smile Trait into the durable Collection (fire-and-
  // forget — never blocks the reveal). First find records the date; repeats
  // increment the count.
  if (trait?.id) recordTraitFromScan(trait).catch(() => {});
  return {
    ...(rewardDrop || { key: 'common', label: 'Common', xp: 50, icon: '✨', color: 'hsl(0 0% 60%)' }),
    trait,
    nextUrl: `/results/${scanId}?first=${firstFlag}`,
  };
};

// Classify an error as network-related so the UI can show a "still
// processing — check My Scans" message instead of a generic failure.
export const isNetworkError = (e, wasHidden) =>
  wasHidden || e instanceof TypeError || /network|fetch|abort|timeout|connection|520|502|503|504/i.test(e?.message || '');

// DUAL-PATH COLORIMETRIC CONSENSUS — teewai's deepest moat.
// After the AI returns its shade guess + the reference card RGB, cross-check
// the AI's shade against the deterministic CIELAB + CIEDE2000 match (reference-
// card white-balance corrected). The colorimetric match wins on disagreement
// because it is lighting-corrected — the AI can be fooled by a warm/cool cast;
// the card-corrected L*a*b* cannot. The consensus is persisted on the scan so
// the result is transparent and auditable. Best-effort: never blocks the scan.
// Violet-cast detection: stores the color correcting product flag and
// confidence on the scan record so results and dashboards can react. The
// detection runs in preAnalyze (before the AI) on the raw bitmap; this just
// persists the result. Best-effort: never blocks the scan.
export const applyVioletCastDetection = async (scan, preContext, insforgeScans) => {
  if (!preContext?.violetCast || !scan?.id || !insforgeScans) return;
  try {
    const vc = preContext.violetCast;
    if (!vc.detected) return;
    await insforgeScans.update(scan.id, {
      color_correcting_product_detected: vc.detected,
      violet_cast_confidence: vc.confidence,
    });
  } catch {}
};

export const applyColorimetricConsensus = async (scan, preContext, aiResult, insforgeScans) => {
  if (!preContext?.toothRgb || !aiResult || !scan?.id || !insforgeScans) return;
  try {
    const consensus = shadeConsensus({
      toothRgb: preContext.toothRgb,
      referenceCardRgb: aiResult.reference_card_rgb,
      aiShadeCode: aiResult.shade_code || aiResult.shade,
    });
    if (!consensus) return;
    const updateFields = {
      colorimetric_shade: consensus.colorimetric_shade,
      colorimetric_shade_code: consensus.colorimetric_shade_code,
      colorimetric_bleached: consensus.colorimetric_bleached,
      colorimetric_delta_e: consensus.colorimetric_deltaE,
      colorimetric_accuracy: consensus.colorimetric_accuracy,
      shade_consensus: consensus.agreed ? 'agreed' : consensus.correction_applied ? 'corrected' : 'colorimetric_only',
      consensus_shade: consensus.consensus_shade,
      consensus_shade_code: consensus.consensus_shade_code,
      shade_confidence: consensus.confidence,
      reference_card_used: consensus.reference_card_used,
    };

    // VITA-anchored score override: when the colorimetric match is confident
    // (reference card lighting-corrected, or AI + colorimetry independently
    // agree), replace the proprietary luminance-based score with the
    // VITA-anchored whiteness so the displayed score and the VITA shade
    // always agree. Falls back to the proprietary score when the match is
    // uncertain (no card + disagreement — the raw CIEDE2000 match may be
    // skewed by ambient lighting). Also mutates the in-memory scan object
    // so downstream code sees the corrected score.
    if (
      consensus.vita_anchored_whiteness != null &&
      (consensus.reference_card_used || consensus.agreed)
    ) {
      updateFields.score = consensus.vita_anchored_whiteness;
      updateFields.score_source = 'vita_anchored';
      scan.score = consensus.vita_anchored_whiteness;
    }

    await insforgeScans.update(scan.id, updateFields);
  } catch {}
};