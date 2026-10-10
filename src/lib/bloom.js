// Enamel Bloom — the Zeigarnik + FarmVille-wither retention loop.
//
// Every scan plants a time-limited "remineralization bloom" (an open loop that
// tugs the user back). It ripens over RIPEN_MIN, stays harvestable through a
// ripeness window, then fades with a small recoverable shade dip if not
// harvested — FarmVille's loss-aversion wither, but soft (the dip is fully
// reversed by the next scan, never destroying real progress). A streak shield
// can extend a fading bloom, layering this onto the existing shield system.
//
// Lifecycle is client-driven: status is computed from ripe_at / fade_deadline
// vs. now, and persisted to the Bloom entity on harvest / fade / shield.
// Backend functions are not required for MVP; a later workflow can backfill
// `faded` status and send push reminders (needs a plan upgrade).

import { unrufld } from '@/api/unrufldClient';

// 4h to ripen → ripe from 4h to 10h (6h harvest window) → fades at 10h.
// 10h = 2.5 × ripen, the FarmVille wither ratio.
export const RIPEN_MIN = 240;
export const FADE_MULT = 2.5;
export const SHIELD_EXTEND_MIN = RIPEN_MIN; // a shield grants one fresh ripen window
export const FADE_DIP = 3; // small recoverable shade dip (points)
export const FINAL_HOUR_MIN = 60; // "about to fade" amber zone

// Compute the live status of a bloom from its deadlines vs. now.
// Harvested is a persisted terminal state; the rest are time-derived.
export function getBloomStatus(bloom, now = Date.now()) {
  if (!bloom) return null;
  if (bloom.status === 'harvested') return 'harvested';
  const ripeAt = new Date(bloom.ripe_at).getTime();
  const fadeAt = new Date(bloom.fade_deadline).getTime();
  if (now < ripeAt) return 'ripening';
  if (now < fadeAt) return 'ripe';
  return 'faded';
}

// Countdown + ripening-progress for the dashboard card.
export function getBloomTiming(bloom, now = Date.now()) {
  const planted = new Date(bloom.planted_date).getTime();
  const ripeAt = new Date(bloom.ripe_at).getTime();
  const fadeAt = new Date(bloom.fade_deadline).getTime();
  if (now < ripeAt) {
    const span = ripeAt - planted || 1;
    return { phase: 'ripening', remainingMs: ripeAt - now, progress: Math.min(1, Math.max(0, (now - planted) / span)) };
  }
  if (now < fadeAt) {
    const msLeft = fadeAt - now;
    return { phase: 'ripe', remainingMs: msLeft, progress: 1, finalHour: msLeft <= FINAL_HOUR_MIN * 60000 };
  }
  return { phase: 'faded', remainingMs: 0, progress: 1 };
}

export function formatDuration(ms) {
  if (ms <= 0) return 'now';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

// Plant a bloom for a freshly-completed scan. Best-effort — never blocks the
// scan flow. Also clears any prior faded blooms (the new scan restores the
// shade dip), so only one active bloom matters at a time.
export async function plantBloomForScan(scan, user) {
  if (!scan?.id) return null;
  try {
    const now = Date.now();
    const ripeAt = new Date(now + RIPEN_MIN * 60000).toISOString();
    const fadeAt = new Date(now + RIPEN_MIN * FADE_MULT * 60000).toISOString();
    // Supersede prior faded blooms — the new scan fully restores the dip.
    try {
      const prior = await unrufld.entities.Bloom.filter({ user_id: user?.id || '' }, '-created_date', 20);
      await Promise.all((prior || [])
        .filter((b) => b.status === 'faded' && !b.cleared)
        .map((b) => unrufld.entities.Bloom.update(b.id, { cleared: true }).catch(() => {})));
    } catch {}
    return await unrufld.entities.Bloom.create({
      user_id: user?.id || null,
      source_scan_id: scan.id,
      planted_date: new Date(now).toISOString(),
      ripe_at: ripeAt,
      fade_deadline: fadeAt,
      ripen_duration_min: RIPEN_MIN,
      status: 'ripening',
      fade_applied: false,
      fade_dip: FADE_DIP,
      shield_used: false,
      cleared: false,
    });
  } catch {
    return null;
  }
}

// Fetch the user's active (non-harvested, non-cleared) bloom, most recent first.
export async function getActiveBloom(userId) {
  if (!userId) return null;
  try {
    const list = await unrufld.entities.Bloom.filter({ user_id: userId }, '-created_date', 10);
    return (list || []).find((b) => b.status !== 'harvested' && !b.cleared) || null;
  } catch {
    return null;
  }
}

// Harvest the active ripe bloom from a care action. Returns the updated bloom
// or null if no ripe bloom existed. Only ripe blooms can be harvested.
export async function harvestActiveBloom(userId, action = 'brush') {
  const bloom = await getActiveBloom(userId);
  if (!bloom) return null;
  if (getBloomStatus(bloom) !== 'ripe') return null;
  try {
    return await unrufld.entities.Bloom.update(bloom.id, {
      status: 'harvested',
      harvested_action: action,
      harvested_date: new Date().toISOString(),
    });
  } catch {
    return null;
  }
}

// Consume a streak shield to re-ripen a fading bloom (wither protection).
// Extends both deadlines by one fresh ripen window from now. The caller is
// responsible for decrementing the shared streak_shields balance on
// UserProgress (InsForge) so the two systems stay in sync.
export async function shieldBloom(bloom) {
  if (!bloom) return null;
  try {
    const now = Date.now();
    const newRipe = new Date(now + RIPEN_MIN * 60000).toISOString();
    const newFade = new Date(now + RIPEN_MIN * FADE_MULT * 60000).toISOString();
    return await unrufld.entities.Bloom.update(bloom.id, {
      status: 'shielded',
      shield_used: true,
      shielded_date: new Date(now).toISOString(),
      ripe_at: newRipe,
      fade_deadline: newFade,
    });
  } catch {
    return null;
  }
}