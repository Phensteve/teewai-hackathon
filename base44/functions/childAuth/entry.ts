import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { buildQuery } from "../../shared/insforge.ts";
import { callInsforge } from "../../shared/insforgeRateLimit.ts";
import { findFamilySlot } from "../../shared/familyMatch.ts";

// Child account creation for family plan parents/admins. Lets a parent create
// a username + password login for their child, tied to the parent's email via
// plus-addressing (parent+childname@domain). The child signs in with their
// username — no email needed. The OTP goes to the parent's inbox.
//
// Flow (client orchestrates):
//   1. initCreate  — checks username availability, returns the synthetic email
//   2. client calls unrufld.auth.register({ email, password }) — sends OTP
//   3. client calls unrufld.auth.verifyOtp({ email, otpCode }) — verifies email
//      (does NOT call setToken — parent stays logged in)
//   4. completeCreate — sets the child's username on their User entity and
//      links them to the family plan slot
export default async function (req) {
  try {
    const unrufld = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { op } = body;

    const me = await unrufld.auth.me().catch(() => null);
    if (!me?.email) return Response.json({ error: "Sign in to manage child accounts" }, { status: 401 });

    // ── initCreate ──────────────────────────────────────────────────────
    if (op === "initCreate") {
      const username = String(body.username || "").trim().toLowerCase();
      const name = String(body.name || "").trim();
      if (username.length < 3) return Response.json({ error: "Username must be at least 3 characters" }, { status: 400 });
      if (!name) return Response.json({ error: "Child's name is required" }, { status: 400 });

      // Check username availability across all teewai users
      try {
        const users = await unrufld.asServiceRole.entities.User.filter({ username }, "-created_date", 1);
        if (Array.isArray(users) && users.length > 0) {
          return Response.json({ error: "That username is taken" }, { status: 400 });
        }
      } catch {}

      // Generate synthetic email using plus-addressing
      const parentEmail = me.email;
      const at = parentEmail.indexOf("@");
      if (at < 1) return Response.json({ error: "Add your email to your profile first" }, { status: 400 });
      const local = parentEmail.slice(0, at);
      const domain = parentEmail.slice(at + 1);
      const tag = username.replace(/[^a-z0-9]/g, "").slice(0, 20) || "kid";
      const syntheticEmail = `${local}+${tag}@${domain}`;

      // Check if synthetic email already exists (previous attempt)
      let exists = false;
      try {
        const existing = await unrufld.asServiceRole.entities.User.filter({ email: syntheticEmail.toLowerCase() }, "-created_date", 1);
        exists = Array.isArray(existing) && existing.length > 0;
      } catch {}
      if (!exists) {
        try {
          const all = await unrufld.asServiceRole.entities.User.list("-created_date", 1000);
          const list = Array.isArray(all) ? all : [];
          exists = list.some((u) => String(u.email || "").toLowerCase() === syntheticEmail.toLowerCase());
        } catch {}
      }

      return Response.json({ synthetic_email: syntheticEmail, exists });
    }

    // ── completeCreate ──────────────────────────────────────────────────
    if (op === "completeCreate") {
      const syntheticEmail = String(body.synthetic_email || "").trim().toLowerCase();
      const username = String(body.username || "").trim().toLowerCase();
      const name = String(body.name || "").trim();
      const memberIndex = Math.floor(Number(body.member_index));
      if (!syntheticEmail || !username) return Response.json({ error: "Missing required fields" }, { status: 400 });

      // Find the child's User entity by email
      let childUser = null;
      try {
        const users = await unrufld.asServiceRole.entities.User.filter({ email: syntheticEmail }, "-created_date", 1);
        childUser = Array.isArray(users) ? users[0] : null;
      } catch {}
      if (!childUser) {
        try {
          const all = await unrufld.asServiceRole.entities.User.list("-created_date", 1000);
          const list = Array.isArray(all) ? all : [];
          childUser = list.find((u) => String(u.email || "").toLowerCase() === syntheticEmail);
        } catch {}
      }
      if (!childUser) return Response.json({ error: "Child account not found — try registering again" }, { status: 404 });

      // Re-check username availability (race condition guard)
      try {
        const conflicts = await unrufld.asServiceRole.entities.User.filter({ username }, "-created_date", 5);
        const conflictList = Array.isArray(conflicts) ? conflicts : [];
        if (conflictList.some((u) => u.id !== childUser.id)) {
          return Response.json({ error: "That username was just taken — try another" }, { status: 400 });
        }
      } catch {}

      // Set the child's username and display name
      try {
        await unrufld.asServiceRole.entities.User.update(childUser.id, {
          username,
          display_name: name,
          first_name: name,
        });
      } catch {
        return Response.json({ error: "Could not set username — it may be taken" }, { status: 400 });
      }

      // Link the child to the family plan slot
      const r = await callInsforge(`/api/database/records/subscriptions?${buildQuery({}, { limit: 1000 })}`);
      const subs = r.ok && Array.isArray(r.data) ? r.data : [];

      // Find the manageable subscription (owner or linked admin)
      let target = null;
      for (const s of subs) {
        const plan = s.plan || (s.data && s.data.plan);
        if (plan !== "family_15" && plan !== "family_pro") continue;
        const ownerId = s.created_by_id || s.userId || (s.data && s.data.created_by_id);
        if (ownerId === me.id) { target = { s, plan }; break; }
      }
      if (!target) {
        const hit = findFamilySlot(subs, me);
        if (hit?.member?.is_admin) target = { s: hit.s, plan: hit.plan };
      }
      if (!target) return Response.json({ error: "No family plan found" }, { status: 404 });

      const data = target.s.data || {};
      const members = Array.isArray(data.members) ? [...data.members] : [];
      while (members.length < 5) members.push({ name: "", scans_used: 0, scans_limit: 15, bonus_scans: 0, is_admin: false });
      if (memberIndex < 0 || memberIndex >= members.length) return Response.json({ error: "Invalid member slot" }, { status: 400 });

      // Validation: no duplicate links, no relinking unlinked
      const unlinkedLinks = Array.isArray(data.unlinked_links) ? [...data.unlinked_links] : [];
      if (unlinkedLinks.includes(username)) {
        return Response.json({ error: "This account was previously unlinked and can't be relinked" }, { status: 400 });
      }
      for (let i = 0; i < members.length; i++) {
        if (i !== memberIndex && members[i].link && members[i].link.trim().toLowerCase() === username) {
          return Response.json({ error: "This account is already linked to another slot" }, { status: 400 });
        }
      }

      // Set the link on the member slot
      members[memberIndex] = {
        ...members[memberIndex],
        link: username,
        email: syntheticEmail,
        name: name || members[memberIndex].name,
      };

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