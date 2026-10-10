import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { buildQuery } from "../../shared/insforge.ts";
import { callInsforge } from "../../shared/insforgeRateLimit.ts";
import { findFamilySlot, findOwnSub } from "../../shared/familyMatch.ts";

// Peer-to-peer scan transfers. Scans live on the InsForge `subscriptions` row
// (scansLimit / scansUsed), so both sides are updated server-side here — a
// client can't be trusted to debit itself.
//
// ops:
//   lookup   { identifier }            -> { found, username, display_name }
//   transfer { identifier, amount }    -> { ok, sent, remaining, to }

const MAX_TRANSFER = 200;
const FREE_SCANS = 5;

async function findUser(unrufld, identifier: string) {
  const id = String(identifier || "").trim();
  if (id.length < 3) return null;
  const value = id.toLowerCase().replace(/^@/, "");
  const byUsername = await unrufld.asServiceRole.entities.User.filter({ username: value }, "-created_date", 1);
  if (Array.isArray(byUsername) && byUsername[0]) return byUsername[0];
  // Fall back to display name / full name (case-insensitive).
  const all = await unrufld.asServiceRole.entities.User.list("-created_date", 2000);
  const list = Array.isArray(all) ? all : [];
  return (
    list.find((u) => String(u.display_name || "").toLowerCase() === value) ||
    list.find((u) => String(u.full_name || "").toLowerCase() === value) ||
    null
  );
}

async function getSubRow(userId: string) {
  const r = await callInsforge(`/api/database/records/subscriptions?${buildQuery({ userId }, { limit: 1 })}`);
  return r.ok && Array.isArray(r.data) ? r.data[0] : null;
}

async function patchSub(id: string, values: Record<string, unknown>) {
  return callInsforge(`/api/database/records/subscriptions?${buildQuery({ id })}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(values),
  });
}

function label(u) {
  return u?.username ? `@${u.username}` : u?.display_name || u?.full_name || "this user";
}

export default async function (req) {
  try {
    const unrufld = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { op } = body;
    const me = await unrufld.auth.me().catch(() => null);
    if (!me?.id) return Response.json({ error: "Not signed in" }, { status: 401 });

    const target = await findUser(unrufld, body.identifier);

    if (op === "lookup") {
      if (!target) return Response.json({ found: false });
      if (target.id === me.id) return Response.json({ found: false, self: true });
      return Response.json({
        found: true,
        username: target.username || null,
        display_name: target.display_name || target.full_name || null,
      });
    }

    if (op === "transfer") {
      const amount = Math.floor(Number(body.amount));
      if (!Number.isFinite(amount) || amount < 1 || amount > MAX_TRANSFER) {
        return Response.json({ error: `Enter between 1 and ${MAX_TRANSFER} scans.` }, { status: 400 });
      }
      if (!target) return Response.json({ error: "We couldn't find that username or display name." }, { status: 404 });
      if (target.id === me.id) return Response.json({ error: "You can't transfer scans to yourself." }, { status: 400 });
      if (target.account_status && target.account_status !== "active") {
        return Response.json({ error: "That account can't receive scans right now." }, { status: 400 });
      }

      const senderRow = await getSubRow(me.id);
      const curLimit = Number(senderRow?.scansLimit) || 0;
      const curUsed = Number(senderRow?.scansUsed) || 0;
      const available = Math.max(0, curLimit - curUsed);
      if (!senderRow || available < amount) {
        return Response.json({ error: `You only have ${available} scan${available === 1 ? "" : "s"} available.` }, { status: 400 });
      }

      const now = new Date().toISOString();
      const senderData = senderRow.data || {};
      const newLimit = curLimit - amount;

      // Optimistic lock: only apply the debit if scansLimit + scansUsed still
      // match what we read (no concurrent transfer changed them). PostgREST
      // PATCH with both filters returns 0 rows if another transfer raced us —
      // preventing the double-spend where two concurrent transfers both read
      // the same balance and both debit.
      const sent = await callInsforge(
        `/api/database/records/subscriptions?${buildQuery({ id: senderRow.id, scansLimit: curLimit, scansUsed: curUsed })}`,
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            scansLimit: newLimit,
            data: {
              ...senderData,
              transfers: [
                ...(Array.isArray(senderData.transfers) ? senderData.transfers : []),
                { direction: "out", scans: amount, to: label(target), date: now },
              ],
            },
          }),
        }
      );
      const sentRows = sent.ok && Array.isArray(sent.data) ? sent.data : [];
      if (!sentRows.length) {
        return Response.json({ error: "A transfer is already in progress. Please try again in a moment." }, { status: 409 });
      }

      // Resolve the recipient's billing context (family owner / linked member
      // / solo) — the same resolution scanQuota uses. Gifted scans must land
      // where scanQuota reads them: family contexts track scans in
      // data.members + pack_scans_* (NOT the top-level scansLimit), so crediting
      // scansLimit for a family owner would be invisible — the "gift didn't
      // reflect after the family plan was exhausted" bug. Credit pack_scans
      // for family (consumed before the member allocation), scansLimit for solo.
      const allSubsRes = await callInsforge(`/api/database/records/subscriptions?${buildQuery({}, { limit: 1000, order: { column: "created_at", ascending: false } })}`);
      const allSubs = allSubsRes.ok && Array.isArray(allSubsRes.data) ? allSubsRes.data : [];
      const linked = findFamilySlot(allSubs, target);
      const ownSub = linked ? null : findOwnSub(allSubs, target.id);
      const isFamilyCtx = !!linked || (ownSub && (ownSub.plan === "family_15" || ownSub.plan === "family_pro"));
      const transferIn = { direction: "in", scans: amount, from: label(me), date: now };

      if (isFamilyCtx) {
        const famSub = linked ? linked.s : ownSub;
        const fData = famSub.data || {};
        await patchSub(famSub.id, {
          data: {
            ...fData,
            pack_scans_total: Number(fData.pack_scans_total || 0) + amount,
            pack_scans_remaining: Number(fData.pack_scans_remaining || 0) + amount,
            transfers: [...(Array.isArray(fData.transfers) ? fData.transfers : []), transferIn],
          },
        });
      } else if (ownSub) {
        const rData = ownSub.data || {};
        await patchSub(ownSub.id, {
          scansLimit: (Number(ownSub.scansLimit) || 0) + amount,
          data: {
            ...rData,
            transfers: [...(Array.isArray(rData.transfers) ? rData.transfers : []), transferIn],
          },
        });
      } else {
        await callInsforge(`/api/database/records/subscriptions`, {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify([{
            userId: target.id,
            plan: "free",
            status: "active",
            scansUsed: 0,
            scansLimit: FREE_SCANS + amount,
            data: { transfers: [transferIn] },
          }]),
        });
      }

      return Response.json({ ok: true, sent: amount, remaining: available - amount, to: label(target) });
    }

    return Response.json({ error: `Unknown op "${op}"` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}