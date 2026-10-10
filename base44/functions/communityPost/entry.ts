import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { filterProfanity } from '../../shared/profanity.ts';
import { enforceRateLimit } from '../../shared/rateLimit.ts';
import { getClientIp } from '../../shared/ipUtils.ts';
import { detectMedicalAdvice } from '../../shared/medicalAdvice.ts';

// Public community message poster. Accepts both signed-in users and guests.
//  - Signed-in: fills author_display_name, author_username, is_verified,
//    is_admin. Admins with show_real_name=true get their real first + last
//    name as the display name (e.g. "Damilare Oluyo").
//  - Guest: sets is_guest=true, no author info → UI shows "Not signed in".
// Insider rooms reject guests (must be signed in).
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { op, room_id, content } = body as { op?: string; room_id?: string; content?: string };
    if (op === 'dispute') return await fileDispute(base44, body);
    if (op === 'getProfile') return await getProfile(base44, body);
    if (op === 'editMessage') return await editMessage(base44, body);
    if (op === 'deleteMessage') return await deleteMessage(base44, body);
    if (!room_id || typeof room_id !== 'string') {
      return Response.json({ error: 'room_id is required' }, { status: 400 });
    }
    const trimmed = (content || '').trim().slice(0, 2000);
    if (!trimmed) return Response.json({ error: 'Message is empty' }, { status: 400 });

    // Resolve the room (service role — rooms are public-read).
    const room = await base44.asServiceRole.entities.DiscussionRoom.get(room_id).catch(() => null);
    if (!room) return Response.json({ error: 'Room not found' }, { status: 404 });

    // Authenticate — guests allowed unless the room is insider-only.
    let user: any = null;
    try { user = await base44.auth.me(); } catch {}

    if (room.is_insider && !user) {
      return Response.json({ error: 'You must be signed in to post in this room' }, { status: 401 });
    }

    // Official rooms (e.g. Insider Updates) are announcement-only — only
    // admins may post. Everyone else can read.
    if (room.is_official && !(user && (user.is_official || user.role === 'admin'))) {
      return Response.json({ error: 'Only teewai officials can post in this room' }, { status: 403 });
    }

    // Rate limit: 5 posts per 2 minutes per user (per IP for guests, capped at
    // 3x). Prevents guest/automation spam of public rooms. Fails open on error.
    const ip = getClientIp(req);
    // Guest IP tracking + ban check: banned guests can't post.
    if (!user) {
      const existingIp = await base44.asServiceRole.entities.GuestIp.filter({ ip_address: ip }).catch(() => []);
      const ipRec = existingIp && existingIp[0];
      if (ipRec && ipRec.banned) {
        return Response.json({ error: 'This device has been banned from posting in the community.' }, { status: 403 });
      }
    }
    const rateKey = user ? `u:${user.id}` : `ip:${ip}`;
    const rl = await enforceRateLimit('community_post', rateKey, ip, 5, 2 * 60 * 1000);
    if (!rl.allowed) {
      return Response.json({ error: `You're posting a little too fast — please wait about ${rl.retryAfter}s and try again.` }, { status: 429 });
    }

    const filtered = filterProfanity(trimmed);

    // Build author metadata for signed-in users.
    const isAdmin = !!(user && user.is_official);
    const isVerified = !!(user && user.is_verified);
    const showReal = !!(user && user.show_real_name && user.first_name);
    const realName = showReal ? `${user.first_name} ${user.last_name || ''}`.trim() : null;
    const display = user ? (realName || user.display_name || user.full_name || 'Anonymous') : null;
    const username = user ? (user.username || null) : null;
    const authorName = user ? (user.full_name || user.display_name || 'Anonymous') : null;

    // Medical-advice detection: verified clinicians may give advice (exempt
    // from flagging); everyone else's advice-looking message is auto-flagged
    // for a medical admin to review. The author can dispute a flag.
    const isVerifiedMedical = !!(user && user.is_verified_medical);
    const medAdvice = detectMedicalAdvice(filtered);
    const flagStatus = isVerifiedMedical ? 'none' : (medAdvice.detected ? 'flagged' : 'none');

    const payload: any = {
      room_id,
      content: filtered,
      is_guest: !user,
      is_admin: isAdmin,
      is_verified: isVerified,
      author_name: authorName,
      author_display_name: display,
      author_username: username,
      is_from_verified_medical: isVerifiedMedical,
      medical_profession: isVerifiedMedical ? (user.medical_profession || null) : null,
      is_medical_advice: medAdvice.detected,
      flag_status: flagStatus,
      flag_reason: medAdvice.detected ? `${medAdvice.reason}${medAdvice.matched ? `: "${medAdvice.matched}"` : ''}` : null,
    };

    // Use the user-scoped client for signed-in users (sets created_by_id for
    // ownership-based delete/edit). Guests have no token → service role.
    let created: any;
    if (user) {
      created = await base44.entities.DiscussionMessage.create(payload);
    } else {
      created = await base44.asServiceRole.entities.DiscussionMessage.create(payload);
    }
    // Log the guest IP for admin tracking (upsert: one record per IP).
    if (!user) {
      try {
        const existingIp = await base44.asServiceRole.entities.GuestIp.filter({ ip_address: ip }).catch(() => []);
        const ipRec = existingIp && existingIp[0];
        if (ipRec) {
          await base44.asServiceRole.entities.GuestIp.update(ipRec.id, {
            last_seen: new Date().toISOString(),
            post_count: (ipRec.post_count || 0) + 1,
            last_message: filtered.slice(0, 200),
          });
        } else {
          await base44.asServiceRole.entities.GuestIp.create({
            ip_address: ip,
            last_seen: new Date().toISOString(),
            post_count: 1,
            last_message: filtered.slice(0, 200),
          });
        }
      } catch { /* non-fatal */ }
    }
    return Response.json({ ok: true, message: created });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

// A signed-in author disputes an auto-flag on their own message. Sets
// flag_status=disputed + dispute_status=pending for admin review. Only the
// message author (created_by_id) may dispute their own post.
async function fileDispute(base44: any, body: any): Promise<Response> {
  try {
    const { message_id, dispute_text } = body as { message_id?: string; dispute_text?: string };
    if (!message_id || typeof message_id !== 'string') {
      return Response.json({ error: 'message_id is required' }, { status: 400 });
    }
    const text = (dispute_text || '').trim().slice(0, 1000);
    if (!text) return Response.json({ error: 'Dispute text is empty' }, { status: 400 });
    let user: any = null;
    try { user = await base44.auth.me(); } catch {}
    if (!user) return Response.json({ error: 'You must be signed in to dispute a flag' }, { status: 401 });
    // Fetch the message (service role — read is public) to verify ownership.
    const msg = await base44.asServiceRole.entities.DiscussionMessage.get(message_id).catch(() => null);
    if (!msg) return Response.json({ error: 'Message not found' }, { status: 404 });
    if (msg.created_by_id !== user.id) {
      return Response.json({ error: 'You can only dispute flags on your own messages' }, { status: 403 });
    }
    if (msg.flag_status !== 'flagged' && msg.flag_status !== 'disputed') {
      return Response.json({ error: 'This message is not flagged' }, { status: 400 });
    }
    // User-scoped update — RLS allows the owner to update their own message.
    const updated = await base44.entities.DiscussionMessage.update(message_id, {
      dispute_text: text,
      dispute_status: 'pending',
      flag_status: 'disputed',
    });
    return Response.json({ ok: true, message: updated });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

// A signed-in author edits their own message. Only the author (created_by_id)
// may edit; removed messages can't be edited. Sets edited=true + edited_date so
// the UI can show an "edited" indicator.
async function editMessage(base44: any, body: any): Promise<Response> {
  try {
    const { message_id, content } = body as { message_id?: string; content?: string };
    if (!message_id || typeof message_id !== 'string') {
      return Response.json({ error: 'message_id is required' }, { status: 400 });
    }
    const trimmed = (content || '').trim().slice(0, 2000);
    if (!trimmed) return Response.json({ error: 'Message is empty' }, { status: 400 });
    let user: any = null;
    try { user = await base44.auth.me(); } catch {}
    if (!user) return Response.json({ error: 'You must be signed in to edit' }, { status: 401 });
    const msg = await base44.asServiceRole.entities.DiscussionMessage.get(message_id).catch(() => null);
    if (!msg) return Response.json({ error: 'Message not found' }, { status: 404 });
    if (msg.created_by_id !== user.id) {
      return Response.json({ error: 'You can only edit your own messages' }, { status: 403 });
    }
    if (msg.flag_status === 'resolved_removed') {
      return Response.json({ error: 'This message has been removed' }, { status: 400 });
    }
    const filtered = filterProfanity(trimmed);
    const updated = await base44.entities.DiscussionMessage.update(message_id, {
      content: filtered, edited: true, edited_date: new Date().toISOString(),
    });
    return Response.json({ ok: true, message: updated });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

// A signed-in author deletes their own message (hard delete — owner only).
async function deleteMessage(base44: any, body: any): Promise<Response> {
  try {
    const { message_id } = body as { message_id?: string };
    if (!message_id || typeof message_id !== 'string') {
      return Response.json({ error: 'message_id is required' }, { status: 400 });
    }
    let user: any = null;
    try { user = await base44.auth.me(); } catch {}
    if (!user) return Response.json({ error: 'You must be signed in to delete' }, { status: 401 });
    const msg = await base44.asServiceRole.entities.DiscussionMessage.get(message_id).catch(() => null);
    if (!msg) return Response.json({ error: 'Message not found' }, { status: 404 });
    if (msg.created_by_id !== user.id) {
      return Response.json({ error: 'You can only delete your own messages' }, { status: 403 });
    }
    await base44.entities.DiscussionMessage.delete(message_id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

// MMR helpers — ported from src/lib/gamification.js so the community profile
// card shows the SAME MMR the user sees on their Profile page (computed from
// scans), instead of a stale/zero UserProgress.mmr.
function dayKey(d: Date): string { return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`; }
function computeStreakBackend(scans: any[]): number {
  if (!scans.length) return 0;
  const daySet = new Set(scans.map((s) => dayKey(new Date(s.created_date))));
  const cursor = new Date(); cursor.setUTCHours(0, 0, 0, 0);
  if (!daySet.has(dayKey(cursor))) {
    const y = new Date(cursor); y.setUTCDate(y.getUTCDate() - 1);
    if (!daySet.has(dayKey(y))) return 0;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  let streak = 0;
  while (daySet.has(dayKey(cursor))) { streak++; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  return streak;
}
function computeMMRBackend(scans: any[]): number {
  if (!scans.length) return 0;
  let mmr = 0;
  mmr += Math.min(scans.length * 15, 300);
  mmr += computeStreakBackend(scans) * 25;
  if (scans.length >= 2) {
    const improvement = (scans[0]?.score || 0) - (scans[scans.length - 1]?.score || 0);
    mmr += Math.max(0, improvement * 8);
  }
  const experience = Math.min(1, scans.length / 10);
  const avgScore = scans.reduce((a, s) => a + (s.score || 0), 0) / scans.length;
  const avgHealth = scans.reduce((a, s) => a + (s.dental_health_score || 0), 0) / scans.length;
  mmr += (avgScore * 5 + avgHealth * 3) * experience;
  return Math.round(mmr);
}

// Public profile lookup for a message author — returns display name, username,
// Smile MMR (computed from scans, matching the Profile page) and leaderboard
// position. Runs as service role so it can read another user's scans + progress.
// Respects leaderboard_opt_out: opted-out users get no position/mmr.
async function getProfile(base44: any, body: any): Promise<Response> {
  try {
    const { user_id } = body as { user_id?: string };
    if (!user_id || typeof user_id !== 'string') {
      return Response.json({ error: 'user_id is required' }, { status: 400 });
    }
    let targetUser: any = null;
    try { targetUser = await base44.asServiceRole.entities.User.get(user_id); } catch {}
    if (!targetUser) return Response.json({ error: 'User not found' }, { status: 404 });
    const optedOut = targetUser.leaderboard_opt_out === true;
    let mmr = 0;
    let position: number | null = null;
    let scanCount = 0;
    if (!optedOut) {
      // Compute MMR from the user's scans (the same engine as the Profile page).
      let scans: any[] = [];
      try { scans = await base44.asServiceRole.entities.Scan.filter({ created_by_id: user_id }, '-created_date', 200); } catch {}
      scans = Array.isArray(scans) ? scans : [];
      scanCount = scans.length;
      if (scans.length) {
        mmr = computeMMRBackend(scans);
      } else {
        // Fall back to stored progress if no scan records are readable here.
        const progress = await base44.asServiceRole.entities.UserProgress.filter({ created_by_id: user_id }, '-mmr', 1).catch(() => []);
        mmr = progress && progress[0] ? (progress[0].mmr || 0) : 0;
      }
      const all = await base44.asServiceRole.entities.UserProgress.list('-mmr', 10000).catch(() => []);
      const idx = (all || []).findIndex((p) => p.created_by_id === user_id);
      position = idx >= 0 ? idx + 1 : null;
    }
    return Response.json({
      username: targetUser.username || null,
      display_name: targetUser.display_name || null,
      mmr,
      position,
      scan_count: scanCount,
      opted_out: optedOut,
      is_verified_medical: targetUser.is_verified_medical || false,
      medical_profession: targetUser.medical_profession || null,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}