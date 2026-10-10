import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { buildQuery } from "../../shared/insforge.ts";
import { callInsforge } from "../../shared/insforgeRateLimit.ts";
import { findFamilySlot, memberRemaining } from "../../shared/familyMatch.ts";

// Family plan linked-account resolver. A family plan owner links members by
// email, username, or display name (FamilyDashboard). This function lets a
// linked member discover their membership and draw scans from the owner's
// family pool. Service-role reads/writes the owner's subscription row because
// the member can't access it directly (RLS scopes subscriptions to the owner).
//
// Enforcement (server-side, the single source of truth):
//   - No duplicate links: the same user can't be linked to two slots.
//   - Unlinked users can't be relinked: once a link is removed, it's added to
//     unlinked_links and permanently barred from any slot in this plan.
//   - Admin unlinkable: a member with is_admin=true can't have their link
//     cleared — the owner must remove admin status first.
//   - scans_limit clamped to 15 (base allocation); bonus_scans is only
//     adjustable via the transferScans op (admin-only).
export default async function (req) {
  try {
    const unrufld = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { op } = body;

    const me = await unrufld.auth.me().catch(() => null);
    if (!me?.email) return Response.json({ error: "Sign in to use the family plan" }, { status: 401 });

    const r = await callInsforge(`/api/database/records/subscriptions?${buildQuery({}, { limit: 1000 })}`);
    const subs = r.ok && Array.isArray(r.data) ? r.data : [];

    // Find the owner's family plan subscription (for the admin/owner).
    const findOwnerSub = () => {
      for (const s of subs) {
        const plan = s.plan || (s.data && s.data.plan);
        if (plan !== "family_15" && plan !== "family_pro") continue;
        const ownerId = s.created_by_id || s.userId || (s.data && s.data.created_by_id);
        if (ownerId === me.id) return { s, plan };
      }
      return null;
    };

    // Find the subscription the caller is authorized to manage (owner or
    // linked admin). Returns { s, plan } or null.
    const findManageableSub = () => {
      let target = findOwnerSub();
      if (!target) {
        const hit = findFamilySlot(subs, me);
        if (hit?.member?.is_admin) target = { s: hit.s, plan: hit.plan };
      }
      return target;
    };

    if (op === "resolve") {
      const hit = findFamilySlot(subs, me);
      if (!hit) return Response.json({ found: false });
      const data = hit.s.data || {};
      const members = Array.isArray(data.members) ? data.members : [];
      return Response.json({
        found: true,
        owner_subscription_id: hit.s.id,
        member_index: hit.idx,
        member_name: hit.member.name || null,
        member_role: hit.member.role || null,
        scans_used: Number(hit.member.scans_used) || 0,
        // family_pro is unlimited — return a high limit so the client's
        // "used >= limit" guard never caps a linked member at 15.
        scans_limit: hit.plan === "family_pro" ? 9999 : (Number(hit.member.scans_limit) || 15),
        bonus_scans: Number(hit.member.bonus_scans) || 0,
        pack_scans_total: Number(data.pack_scans_total || 0),
        pack_scans_remaining: Math.max(0, Number(data.pack_scans_remaining || 0)),
        plan: hit.plan,
        is_admin: !!hit.member.is_admin,
        // Family-wide totals so every member (not just the owner/admin) can
        // see the whole family's scan usage at a glance.
        family_total_used: members.reduce((a, m) => a + (Number(m?.scans_used) || 0), 0),
        family_total_limit: hit.plan === "family_pro" ? null : members.reduce((a, m) => a + (Number(m?.scans_limit) || 15) + (Number(m?.bonus_scans) || 0), 0),
        family_member_count: members.length,
      });
    }

    if (op === "increment") {
      const cost = Math.max(1, Math.min(10, Math.floor(Number(body.cost)) || 1));
      const hit = findFamilySlot(subs, me);
      if (!hit) return Response.json({ error: "You're not a member of a family plan" }, { status: 404 });
      const data = hit.s.data || {};
      const members = [...(data.members || [])];
      while (members.length <= hit.idx) members.push({ name: "", scans_used: 0, scans_limit: 15 });
      const curUsed = Number(members[hit.idx].scans_used) || 0;
      let newPack = Math.max(0, Number(data.pack_scans_remaining || 0));
      let newMemberUsed = curUsed;
      if (hit.plan === "family_15" && newPack > 0) {
        const fromPack = Math.min(cost, newPack);
        newPack = newPack - fromPack;
        newMemberUsed = curUsed + (cost - fromPack);
      } else {
        newMemberUsed = curUsed + cost;
      }
      members[hit.idx] = { ...members[hit.idx], scans_used: newMemberUsed };
      await callInsforge(`/api/database/records/subscriptions?${buildQuery({ id: hit.s.id })}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ data: { ...data, members, pack_scans_remaining: newPack } }),
      });
      return Response.json({ ok: true, scans_used: newMemberUsed, pack_scans_remaining: newPack });
    }

    if (op === "health") {
      let members = null;
      let plan = null;

      const hit = findFamilySlot(subs, me);
      if (hit) {
        members = hit.s.data?.members || [];
        plan = hit.plan;
      } else {
        const ownerHit = findOwnerSub();
        if (ownerHit) {
          members = ownerHit.s.data?.members || [];
          plan = ownerHit.plan;
        }
      }

      if (!members || !members.length) return Response.json({ error: "No family plan found" }, { status: 404 });

      const ranking = [];
      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        if (!m) { ranking.push({ name: `Member ${i + 1}`, role: null, healthScore: null, whitenessScore: null, scanCount: 0 }); continue; }
        const linkVal = m.link || m.email || "";
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(linkVal);
        const searchEmail = isEmail ? linkVal : (m.email || "");
        if (!searchEmail) {
          ranking.push({ name: m.name || `Member ${i + 1}`, role: m.role || null, healthScore: null, whitenessScore: null, scanCount: 0 });
          continue;
        }
        try {
          const scanRes = await callInsforge(`/api/database/records/scans?${buildQuery({ patient_email: searchEmail, status: "completed" }, { limit: 100 })}`);
          const scans = scanRes.ok && Array.isArray(scanRes.data) ? scanRes.data : [];
          const healthScores = scans.map((s) => s.data?.dental_health_score).filter((v) => v != null);
          const whitenessScores = scans.map((s) => s.data?.score).filter((v) => v != null);
          ranking.push({
            name: m.name || `Member ${i + 1}`,
            role: m.role || null,
            healthScore: healthScores.length ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length) : null,
            whitenessScore: whitenessScores.length ? Math.round(whitenessScores.reduce((a, b) => a + b, 0) / whitenessScores.length) : null,
            scanCount: scans.length,
          });
        } catch {
          ranking.push({ name: m.name || `Member ${i + 1}`, role: m.role || null, healthScore: null, whitenessScore: null, scanCount: 0 });
        }
      }
      ranking.sort((a, b) => {
        if (a.healthScore == null && b.healthScore == null) return 0;
        if (a.healthScore == null) return 1;
        if (b.healthScore == null) return -1;
        return b.healthScore - a.healthScore;
      });
      return Response.json({ ranking, plan });
    }

    if (op === "verifyLink") {
      const linkVal = ((body.link || "") + "").trim().toLowerCase();
      if (!linkVal) return Response.json({ found: false });
      let users = [];
      try {
        users = await unrufld.asServiceRole.entities.User.list('-created_date', 10000) || [];
      } catch {}
      const match = users.find((u) => {
        const email = (u.email || "").trim().toLowerCase();
        const username = (u.username || "").trim().toLowerCase();
        const displayName = (u.display_name || "").trim().toLowerCase();
        const fullName = (u.full_name || "").trim().toLowerCase();
        return email === linkVal || username === linkVal || displayName === linkVal || fullName === linkVal;
      });
      if (!match) return Response.json({ found: false });
      // Check if this user was previously unlinked from the caller's family
      // plan. Once unlinked, a user can't be relinked to any slot in that plan.
      const target = findManageableSub();
      const unlinkedLinks = Array.isArray(target?.s?.data?.unlinked_links) ? target.s.data.unlinked_links : [];
      const isUnlinked = unlinkedLinks.some((u) => (u + "").trim().toLowerCase() === linkVal);
      return Response.json({
        found: true,
        name: match.display_name || match.username || match.full_name || (match.email ? match.email.split("@")[0] : "teewai user"),
        unlinked: isUnlinked,
      });
    }

    if (op === "manageAs") {
      const hit = findFamilySlot(subs, me);
      if (!hit || !hit.member?.is_admin) return Response.json({ error: "Not a family admin" }, { status: 403 });
      const data = hit.s.data || {};
      return Response.json({
        subscription: {
          id: hit.s.id,
          plan: hit.plan,
          members: Array.isArray(data.members) ? data.members : [],
          unlinked_links: Array.isArray(data.unlinked_links) ? data.unlinked_links : [],
          renewal_date: data.renewal_date || null,
        },
      });
    }

    if (op === "updateMembers") {
      // Owner or a linked family admin updates the owner's member list.
      // Server-side validation enforces: no duplicate links, no relinking
      // unlinked users, admin can't be unlinked, scans_limit clamped to 15.
      const nextMembers = Array.isArray(body.members) ? body.members : null;
      if (!nextMembers) return Response.json({ error: "No members provided" }, { status: 400 });

      const target = findManageableSub();
      if (!target) return Response.json({ error: "Not authorized to manage this family" }, { status: 403 });

      const oldData = target.s.data || {};
      const oldMembers = Array.isArray(oldData.members) ? oldData.members : [];
      const unlinkedLinks = Array.isArray(oldData.unlinked_links) ? [...oldData.unlinked_links] : [];

      const seenLinks = new Set();
      const sanitizedMembers = [];

      for (let i = 0; i < nextMembers.length; i++) {
        const newM = nextMembers[i] || {};
        const oldM = oldMembers[i] || {};
        const link = ((newM.link || "") + "").trim().toLowerCase();
        const oldLink = ((oldM.link || "") + "").trim().toLowerCase();

        // Detect link removal or change: old had a link, new is different.
        if (oldLink && oldLink !== link) {
          // Admin can't be unlinked — remove admin status first.
          if (oldM.is_admin) {
            return Response.json({ error: `Can't unlink ${oldM.name || 'an admin'} — remove their admin status first` }, { status: 400 });
          }
          // Add old link to the permanently-unlinked list.
          if (!unlinkedLinks.includes(oldLink)) unlinkedLinks.push(oldLink);
        }

        // Detect a new link being set (different from old).
        if (link && link !== oldLink) {
          // Can't relink a previously-unlinked user.
          if (unlinkedLinks.includes(link)) {
            return Response.json({ error: "This account was previously unlinked and can't be relinked" }, { status: 400 });
          }
          // Can't link the same user to two slots.
          if (seenLinks.has(link)) {
            return Response.json({ error: "This account is already linked to another slot" }, { status: 400 });
          }
          seenLinks.add(link);
        } else if (link) {
          seenLinks.add(link);
        }

        // Clamp scans_limit to 15; preserve bonus_scans from the old slot
        // (bonus_scans is only adjustable via transferScans, never via
        // updateMembers — the client can't inflate it).
        sanitizedMembers.push({
          name: newM.name || '',
          email: newM.email || '',
          link: newM.link || '',
          role: newM.role || 'custom',
          scans_used: Math.max(0, Math.floor(Number(newM.scans_used)) || 0),
          scans_limit: Math.min(15, Math.max(0, Math.floor(Number(newM.scans_limit)) || 15)),
          bonus_scans: Number(oldM.bonus_scans) || 0,
          is_admin: !!newM.is_admin,
        });
      }

      const data = { ...oldData, members: sanitizedMembers, unlinked_links: unlinkedLinks };
      await callInsforge(`/api/database/records/subscriptions?${buildQuery({ id: target.s.id })}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ data }),
      });
      return Response.json({ ok: true, unlinked_links: unlinkedLinks });
    }

    if (op === "transferScans") {
      // Admin/owner moves scan credits from one member slot to another.
      // The source's bonus_scans decreases (can go negative — meaning scans
      // were sent away from the base allocation); the destination's
      // bonus_scans increases. The source must have enough remaining.
      const fromIdx = Math.floor(Number(body.from_index));
      const toIdx = Math.floor(Number(body.to_index));
      const amount = Math.max(1, Math.floor(Number(body.amount)) || 0);
      if (!Number.isInteger(fromIdx) || !Number.isInteger(toIdx) || fromIdx === toIdx) {
        return Response.json({ error: "Invalid source or destination" }, { status: 400 });
      }

      const target = findManageableSub();
      if (!target) return Response.json({ error: "Not authorized to manage this family" }, { status: 403 });

      const data = target.s.data || {};
      const members = Array.isArray(data.members) ? [...data.members] : [];
      if (fromIdx < 0 || fromIdx >= members.length || toIdx < 0 || toIdx >= members.length) {
        return Response.json({ error: "Invalid member slot" }, { status: 400 });
      }

      const packRemaining = Math.max(0, Math.min(Number(data.pack_scans_remaining || 0), Number(data.pack_scans_total || 0)));
      const fromRemaining = memberRemaining(target.plan, members[fromIdx], packRemaining);

      if (fromRemaining < amount) {
        return Response.json({ error: `Not enough scans to transfer (${fromRemaining} remaining)` }, { status: 400 });
      }

      const fromBonus = Number(members[fromIdx].bonus_scans) || 0;
      const toBonus = Number(members[toIdx].bonus_scans) || 0;
      members[fromIdx] = { ...members[fromIdx], bonus_scans: fromBonus - amount };
      members[toIdx] = { ...members[toIdx], bonus_scans: toBonus + amount };

      const newData = { ...data, members };
      await callInsforge(`/api/database/records/subscriptions?${buildQuery({ id: target.s.id })}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ data: newData }),
      });
      return Response.json({ ok: true, members: newData.members });
    }

    return Response.json({ error: `Unknown op "${op}"` }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}