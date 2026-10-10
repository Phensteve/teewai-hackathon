import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { buildQuery } from "../../shared/insforge.ts";
import { callInsforge } from "../../shared/insforgeRateLimit.ts";
import { findFamilySlot, findOwnSub, memberRemaining } from "../../shared/familyMatch.ts";

// Unified scan-quota check + consume — the single server-side source of truth
// for whether a scan is allowed and for incrementing the scan counter.
//
// This removes the plan-detection / pack-precedence / increment logic that was
// duplicated in Scan.jsx (audit Foundation #3), killing the family-counting
// bugs at the root. It also fixes a latent bug: the InsForge client proxy only
// allows scansUsed to increase by exactly +1 per call, so full scans (cost 3)
// for solo users silently failed to increment. This function uses the service
// token directly, so cost can be 1 or 3.
//
// Ops:
//   check   { cost, member_index? } → { allowed, reason?, plan, context, remaining }
//   consume { cost, member_index? } → { ok, scans_used, pack_scans_remaining, context, plan, ... }
//
// Resolution order:
//   1. Linked family member (slot in another user's family plan) → owner's pool.
//   2. Own subscription (free / pack / pro / family owner).
//
// Pack precedence (family_15 only): leftover pack scans (pack_scans_remaining)
// are consumed BEFORE the member's 15-scan allocation. family_pro is unlimited.

const UNLIMITED = 9999;
const FREE_SCANS = 5;

export default async function (req) {
  try {
    const unrufld = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { op } = body;
    const cost = Math.max(1, Math.min(10, Math.floor(Number(body.cost)) || 1));

    const me = await unrufld.auth.me().catch(() => null);
    if (!me?.email) return Response.json({ error: "Sign in to scan" }, { status: 401 });

    // Load all subscriptions (service role) to resolve linked membership.
    // Newest-first so findOwnSub / findFamilySlot resolve to the canonical
    // (most recent) subscription row — the same row the Dashboard displays
    // (insforgeDb.subscriptions orders by created_at desc). Without this,
    // consume could increment a stale duplicate while the UI shows the newest.
    const r = await callInsforge(`/api/database/records/subscriptions?${buildQuery({}, { limit: 1000, order: { column: 'created_at', ascending: false } })}`);
    const subs = r.ok && Array.isArray(r.data) ? r.data : [];

    // 1. Linked family member? (slot in someone else's family plan)
    const linked = findFamilySlot(subs, me);

    // 2. Own subscription (if not a linked member).
    const own = linked ? null : findOwnSub(subs, me.id);

    // Build the billing context.
    let context, sub, plan, memberIndex, member, packRemaining;
    if (linked) {
      context = "linked_member";
      sub = linked.s; plan = linked.plan; memberIndex = linked.idx; member = linked.member;
      // Clamp leftover pack scans to what was actually purchased (pack_scans_total)
      // so an owner can't inflate pack_scans_remaining via the generic proxy.
      packRemaining = Math.max(0, Math.min(Number(sub.data?.pack_scans_remaining || 0), Number(sub.data?.pack_scans_total || 0)));
    } else if (own) {
      sub = own; plan = own.plan || own.data?.plan;
      const isFamily = plan === "family_15" || plan === "family_pro";
      if (isFamily) {
        context = "family_owner";
        const members = Array.isArray(sub.data?.members) ? [...sub.data.members] : [];
        while (members.length < 5) members.push({ name: "", scans_used: 0, scans_limit: 15 });
        memberIndex = Math.max(0, Math.min(members.length - 1, Math.floor(Number(body.member_index)) || 0));
        member = members[memberIndex] || { scans_used: 0, scans_limit: 30 };
        packRemaining = Math.max(0, Math.min(Number(sub.data?.pack_scans_remaining || 0), Number(sub.data?.pack_scans_total || 0)));
      } else {
        context = "solo";
      }
    } else {
      // No subscription row yet → free tier (5 scans, 0 used).
      context = "solo";
      plan = "free";
    }

    const isPro = plan === "pro" || plan === "pro_yearly" || plan === "pro_weekly";
    const isFamilyPro = plan === "family_pro";

    // Compute remaining scans for the resolved context.
    // `remaining` is the enforcement value (pack + personal) used to decide
    // if a scan is allowed. `personalRemaining` is the member's OWN allocation
    // only (without the shared family pack) — used for display so each member
    // sees their personal count, not the inflated family total.
    let remaining, personalRemaining;
    if (context === "solo") {
      if (isPro) { remaining = UNLIMITED; personalRemaining = UNLIMITED; }
      else {
        const used = Number(sub?.scansUsed) || 0;
        const isFree = !plan || plan === "free";
        let limit = Number(sub?.scansLimit) || 0;
        // Free tier is 5 scans. Existing rows created when the proxy forced
        // scansLimit=2 (or 0) are lazily floored to 5 so legacy free users see
        // their full free allocation, not the stale 2.
        if (isFree && limit < FREE_SCANS) limit = FREE_SCANS;
        remaining = Math.max(0, limit - used);
        personalRemaining = remaining;
        // Pack expiry: if all pack purchases have expired, no scans remain.
        if (!isFree && remaining > 0) {
          const purchases = Array.isArray(sub?.data?.purchases) ? sub.data.purchases : [];
          const packPurchases = purchases.filter((p) => p && p.plan && p.plan !== 'pro' && p.plan !== 'pro_yearly' && p.plan !== 'pro_weekly' && p.plan !== 'family_pro' && p.plan !== 'free');
          if (packPurchases.length > 0) {
            const now = new Date();
            const allExpired = packPurchases.every((p) => p.expires_at && new Date(p.expires_at) <= now);
            if (allExpired) { remaining = 0; personalRemaining = 0; }
          }
        }
      }
    } else {
      if (isFamilyPro) { remaining = UNLIMITED; personalRemaining = UNLIMITED; }
      else {
        remaining = memberRemaining(plan, member, packRemaining);
        // Personal remaining = the member's own allocation only, WITHOUT the
        // shared family pack. The pack is a shared pool consumed first, but
        // showing it as each member's personal count makes every member think
        // they have the entire family's scans (e.g. 82, 100+).
        const mUsed = Math.max(0, Number(member?.scans_used) || 0);
        const mLimit = Math.min(15, Number(member?.scans_limit) || 15);
        const bonus = Number(member?.bonus_scans) || 0;
        personalRemaining = Math.max(0, mLimit + bonus - mUsed);
      }
    }

    if (op === "check") {
      if (remaining >= cost) {
        return Response.json({ allowed: true, plan, context, remaining, personal_remaining: personalRemaining, pack_remaining: context === "solo" ? 0 : packRemaining, remaining_after: remaining - cost });
      }
      const reason = context === "linked_member"
        ? "You've used all your family scans this month. Ask the plan owner to reset the counters or upgrade."
        : context === "family_owner"
          ? `${member?.name || "That member"} only has ${remaining} scan${remaining !== 1 ? "s" : ""} left. Reset the counters or grab a pack.`
          : "You're out of scans. Grab a pack to keep scanning.";
      return Response.json({ allowed: false, reason, plan, context, remaining, personal_remaining: personalRemaining, pack_remaining: context === "solo" ? 0 : packRemaining });
    }

    if (op === "consume") {
      // Final authoritative guard — never let the counter go negative.
      if (remaining < cost) {
        const reason = context === "linked_member"
          ? "You've used all your family scans this month."
          : context === "family_owner"
            ? `${member?.name || "That member"} only has ${remaining} scan${remaining !== 1 ? "s" : ""} left.`
            : "You're out of scans.";
        return Response.json({ ok: false, allowed: false, reason, plan, context }, { status: 402 });
      }

      // --- solo (free / pack / pro) ---
      if (context === "solo") {
        if (isPro) return Response.json({ ok: true, scans_used: Number(sub?.scansUsed) || 0, context, plan, unlimited: true });
        const used = Number(sub?.scansUsed) || 0;
        const rowLimit = Number(sub?.scansLimit) || 0;
        const isFree = !plan || plan === "free";
        const limit = (isFree && rowLimit < FREE_SCANS) ? FREE_SCANS : (rowLimit || (isFree ? FREE_SCANS : 0));
        const newUsed = used + cost;
        if (sub) {
          // Optimistic lock: only debit if scansUsed + scansLimit still match
          // what we read. Without this, two concurrent scans both read the
          // same balance and both write used+cost — a scan-credit double-spend
          // (the user gets two scans debited as one). The PATCH filters on the
          // read values so a raced update returns 0 rows and we reject.
          // Lazy migration: if this is a legacy free row still capped below 5,
          // bump scansLimit to 5 in the same write so the counter is correct
          // going forward.
          const patchBody = { scansUsed: newUsed };
          if (isFree && rowLimit < FREE_SCANS) patchBody.scansLimit = FREE_SCANS;
          const r = await callInsforge(`/api/database/records/subscriptions?${buildQuery({ id: sub.id, scansUsed: used, scansLimit: rowLimit })}`, {
            method: "PATCH",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify(patchBody),
          });
          const rows = r.ok && Array.isArray(r.data) ? r.data : [];
          if (!rows.length) {
            return Response.json({ ok: false, allowed: false, reason: "A scan is already being processed. Please try again in a moment.", plan, context }, { status: 409 });
          }
        } else {
          // No sub row yet — create a free one so the counter persists.
          await callInsforge(`/api/database/records/subscriptions`, {
            method: "POST",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify([{ userId: me.id, plan: "free", status: "active", scansUsed: newUsed, scansLimit: FREE_SCANS, data: { purchases: [] } }]),
          });
        }
        return Response.json({ ok: true, scans_used: newUsed, pack_scans_remaining: 0, context, plan });
      }

      // --- family (linked member or owner) with pack precedence ---
      if (isFamilyPro) {
        return Response.json({ ok: true, scans_used: Number(member?.scans_used) || 0, pack_scans_remaining: packRemaining, context, plan, unlimited: true });
      }

      const members = Array.isArray(sub.data?.members) ? [...sub.data.members] : [];
      while (members.length <= memberIndex) members.push({ name: "", scans_used: 0, scans_limit: 15 });
      const curUsed = Number(members[memberIndex].scans_used) || 0;
      let newPack = packRemaining;
      let newMemberUsed = curUsed;
      if (newPack > 0) {
        const fromPack = Math.min(cost, newPack);
        newPack = newPack - fromPack;
        newMemberUsed = curUsed + (cost - fromPack);
      } else {
        newMemberUsed = curUsed + cost;
      }
      members[memberIndex] = { ...members[memberIndex], scans_used: newMemberUsed };
      const data = { ...(sub.data || {}), members, pack_scans_remaining: newPack };
      // Optimistic lock: family quota lives in the JSONB `data` column, which
      // PostgREST can't filter on, so we lock on the top-level `scansUsed`
      // counter (incremented on every family consume) — the same pattern as
      // the solo branch. Two concurrent family scans that both read the same
      // member state can't both write: the second PATCH filters on the now-
      // stale scansUsed and returns 0 rows, so we reject and the user retries
      // against a fresh read. Without this, concurrent family scans double-
      // spend (both read member.scans_used = N, both write N+cost).
      const lockUsed = Number(sub.scansUsed) || 0;
      const famPatch = await callInsforge(`/api/database/records/subscriptions?${buildQuery({ id: sub.id, scansUsed: lockUsed })}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ scansUsed: lockUsed + 1, data }),
      });
      const famRows = famPatch.ok && Array.isArray(famPatch.data) ? famPatch.data : [];
      if (!famRows.length) {
        return Response.json({ ok: false, allowed: false, reason: "A scan is already being processed. Please try again in a moment.", plan, context }, { status: 409 });
      }

      // Notify the owner when their leftover pack just ran out and the family
      // 15-scan allocation kicks in (family_15 only).
      const switchedToFamily = packRemaining > 0 && newPack === 0 && plan === "family_15";
      if (switchedToFamily) {
        try {
          await callInsforge(`/api/database/records/notifications`, {
            method: "POST",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify({
              userId: me.id,
              type: "info",
              data: { title: "Family scans now active", message: "Your scan pack is finished — your 15 Family scans are now being used." },
            }),
          });
        } catch {}
      }
      return Response.json({ ok: true, scans_used: newMemberUsed, pack_scans_remaining: newPack, context, plan, member_index: memberIndex, switched_to_family: switchedToFamily });
    }

    return Response.json({ error: `Unknown op "${op}"` }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}