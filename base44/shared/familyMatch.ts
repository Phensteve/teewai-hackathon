// Shared family-plan member matching. Used by familyResolve (linked-member
// resolve/increment/health) and scanQuota (unified quota check/consume) so
// the "is this user a linked family member?" logic lives in exactly one
// place — no duplicated matching fields or precedence rules.

// Does a single member slot match the caller's identity? Matches by the
// legacy `email` field, or by `link` (email / username / display name / full
// name) — backwards compatible with all existing family plans.
export function matchMember(m, email, username, fullName, displayName) {
  if (!m) return false;
  if (m.email && typeof m.email === "string" && m.email.trim().toLowerCase() === email) return true;
  if (m.link && typeof m.link === "string") {
    const link = m.link.trim().toLowerCase();
    if (link && (link === email || link === username || link === fullName || link === displayName)) return true;
  }
  return false;
}

// Find the first family-plan slot where `me` is a linked member.
// Returns { s, idx, plan, member } or null.
export function findFamilySlot(subs, me) {
  const email = (me.email || "").trim().toLowerCase();
  const username = (me.username || "").trim().toLowerCase();
  const fullName = (me.full_name || "").trim().toLowerCase();
  const displayName = (me.display_name || "").trim().toLowerCase();
  for (const s of subs) {
    const plan = s.plan || s.data?.plan;
    if (plan !== "family_15" && plan !== "family_pro") continue;
    const members = Array.isArray(s.data?.members) ? s.data.members : [];
    const idx = members.findIndex((m) => matchMember(m, email, username, fullName, displayName));
    if (idx >= 0) return { s, idx, plan, member: members[idx] };
  }
  return null;
}

// Find the caller's own subscription row (any plan). Returns the row or null.
export function findOwnSub(subs, userId) {
  for (const s of subs) {
    // InsForge rows carry the owner id in the `userId` column (not
    // created_by_id). Check all three so this works for InsForge-backed and
    // Base44-entity-backed callers alike. Without the userId check, the quota
    // function never finds the existing subscription and creates a duplicate
    // free row on every scan — so the counter never decrements.
    if ((s.userId || s.created_by_id || s.data?.created_by_id) === userId) return s;
  }
  return null;
}

// Remaining scans for a family (linked member or owner) context, with pack
// precedence: leftover pack scans are consumed before the member's 15-scan
// allocation. family_pro is unlimited.
export function memberRemaining(plan, member, packRemaining) {
  if (plan === "family_pro") return 9999;
  // Clamp owner-writable JSONB values to the paid allocation so a family plan
  // owner can't inflate their own scan quota via the generic proxy (the
  // data.members[].scans_limit and scans_used fields are user-editable).
  // bonus_scans is NOT clamped — it's only adjustable via the transferScans
  // backend op (admin-only), which validates the source has enough remaining.
  // bonus_scans can be negative (scans transferred away to another slot).
  const mUsed = Math.max(0, Number(member?.scans_used) || 0);
  const mLimit = Math.min(15, Number(member?.scans_limit) || 15);
  const bonus = Number(member?.bonus_scans) || 0;
  return Math.max(0, packRemaining) + Math.max(0, mLimit + bonus - mUsed);
}