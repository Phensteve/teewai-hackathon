import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import {
  INSFORGE_BASE_URL,
  authHeaders,
  buildQuery,
  insforgeToken,
} from "../../shared/insforge.ts";

// Centralized InsForge proxy (admin-token aware). Invoked from the app via:
//   unrufld.functions.invoke("insforge", { resource, operation, ...params })
//
// Supported resources: database | auth | storage
// All calls require an authenticated Base44 user, OR a valid standalone admin
// token (for admin-only writes like coupons). The proxy is private.
export default async function (req) {
  try {
    const unrufld = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { resource, operation, ...params } = body;

    let user = null;
    if (body.admin_token) {
      // Standalone admin (secret admin link). Restricted to admin-write tables
      // (coupons) only — cannot impersonate or read app users' data.
      const adminName = await verifyAdminToken(body.admin_token);
      if (adminName) user = { id: "__admin__", email: null, role: "admin", _adminOnly: true };
      // Stale/expired admin token: fall through to the normal Base44 session
      // instead of hard-failing — a regular user with leftover admin storage
      // should never be locked out of ordinary reads.
    }
    if (!user) {
      try { user = await unrufld.auth.me(); } catch { user = null; }
      if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let result;
    switch (resource) {
      case "database":
        result = await handleDatabase(operation, params, user);
        break;
      case "auth":
        result = await handleAuth(operation, params);
        break;
      case "storage":
        result = await handleStorage(operation, params, user);
        break;
      default:
        return Response.json(
          { error: `Unknown resource "${resource}". Use database | auth | storage.` },
          { status: 400 }
        );
    }

    if (!result.ok) {
      const msg =
        (result.data && (result.data.message || result.data.error)) ||
        result.data ||
        "InsForge request failed";
      return Response.json({ error: msg }, { status: result.status || 502 });
    }

    return Response.json({
      data: result.data,
      count: result.count,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// --- admin token verification (standalone admin login) ---------------------
// Verifies the HMAC-signed token issued by adminAuth, so this generic proxy
// can authorize admin-only writes (coupons) for an admin logged in via the
// secret admin link, who may not have a Base44 app session.
function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}
function b64encodeAdmin(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
async function hmacSignAdmin(msg) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(insforgeToken()),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return b64encodeAdmin(sig);
}
async function verifyAdminToken(token) {
  if (!token) return null;
  const parts = String(token).split(":");
  if (parts.length !== 3) return null;
  const [username, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!exp || exp < Date.now()) return null;
  const expected = await hmacSignAdmin(`${username}:${exp}`);
  if (!timingSafeEqual(expected, sig)) return null;
  return username;
}

// --- low-level fetch helper -------------------------------------------------
async function callInsforge(path, init = {}, { json = true } = {}) {
  const headers = { ...authHeaders(), ...(init.headers || {}) };
  // Let the runtime set the multipart boundary for FormData uploads.
  if (init.body instanceof FormData) delete headers["Content-Type"];
  const res = await fetch(`${INSFORGE_BASE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = json ? JSON.parse(text) : text;
    } catch {
      data = text;
    }
  }
  const countHeader = res.headers.get("X-Total-Count");
  return {
    ok: res.ok,
    status: res.status,
    data,
    count: countHeader ? Number(countHeader) : null,
  };
}

// Reads a user's own subscription row (service token, server-side).
async function readSubscription(userId) {
  const qs = buildQuery({ userId }, { limit: 1 });
  const r = await callInsforge(`/api/database/records/subscriptions?${qs}`);
  return r.ok && Array.isArray(r.data) && r.data[0] ? r.data[0] : null;
}

// --- DATABASE (PostgREST-style /api/database/records/{table}) ---------------
// Authorization policy for the generic database proxy. The service token used
// below can read/write anything, so every call is constrained to the
// authenticated Base44 user's own rows (or to public directories / admin-only
// tables). Without this, any logged-in user could update any subscription to
// "pro", read other users' clinical notes, or wipe arbitrary tables.
const FORBIDDEN_TABLES = new Set(["admins", "admin_roles"]);
const ALLOWED_TABLES = new Set([
  "scans", "subscriptions", "user_progress",
  "dentist_profiles", "dentist_clients", "appointments",
  "users", "coupons",
  "stain_logs", "notifications", "home_whitening_methods",
  "zero_scan_nudges", "ip_registrations", "discovered_foods",
  "tips",
]);
// Admin-only tables: no user scoping, admin access only (reads + writes).
const ADMIN_ONLY = new Set(["zero_scan_nudges", "ip_registrations"]);
// owner columns -> user field ("id" | "email") used to scope reads
const SELECT_COLS = {
  scans:            { userId: "id", patientEmail: "email" },
  subscriptions:    { userId: "id" },
  user_progress:    { userId: "id" },
  dentist_profiles: { userId: "id" },
  dentist_clients:  { dentistId: "id", clientEmail: "email" },
  appointments:     { dentistId: "id", patientEmail: "email" },
  users:            { userId: "id" },
  stain_logs:       { userId: "id" },
  notifications:   { userId: "id" },
};
// owner columns -> user field used to scope writes (update/delete filter)
const WRITE_COLS = {
  scans:            { userId: "id" },
  subscriptions:    { userId: "id" },
  user_progress:    { userId: "id" },
  dentist_profiles: { userId: "id" },
  dentist_clients:  { dentistId: "id" },
  appointments:     { dentistId: "id", patientEmail: "email" },
  users:            { userId: "id" },
  stain_logs:       { userId: "id" },
  notifications:   { userId: "id" },
};
// owner stamp forced on every inserted row
const INSERT_OWNER = {
  scans:            { userId: "id" },
  subscriptions:    { userId: "id" },
  user_progress:   { userId: "id" },
  dentist_profiles: { userId: "id" },
  dentist_clients:  { dentistId: "id" },
  appointments:     { patientEmail: "email" },
  users:            { userId: "id" },
  stain_logs:       { userId: "id" },
  notifications:   { userId: "id" },
  discovered_foods: { userId: "id" },
};
// literal overrides on insert (e.g. subscriptions always start free/limited)
const INSERT_LITERAL = {
  subscriptions: { plan: "free", status: "active", scansLimit: 5 },
};
// fields stripped from update payloads to prevent self-escalation
const STRIP_UPDATE = {
  subscriptions: ["plan", "status", "scansLimit"],
};
const PUBLIC_READ = new Set(["dentist_profiles", "coupons", "home_whitening_methods", "discovered_foods", "tips"]);
const ADMIN_WRITE = new Set(["coupons", "home_whitening_methods", "zero_scan_nudges", "ip_registrations", "tips"]);
const NO_DELETE = new Set(["subscriptions", "user_progress", "appointments", "users", "zero_scan_nudges", "ip_registrations"]);
const BLOCKED_UPDATE = new Set(["appointments"]);

const isAdmin = (u) => u?.role === "admin";
const userVal = (u, field) => (field === "email" ? u.email : u.id);
const FORBIDDEN = { ok: false, status: 403, data: "Forbidden" };
const BAD_TABLE = { ok: false, status: 403, data: "Forbidden table" };
const selectOpts = (p) => ({ select: p.select, order: p.order, limit: p.limit, offset: p.offset });

function forceCols(filters, cols, u) {
  let matched = false;
  for (const [col, field] of Object.entries(cols || {})) {
    if (filters[col] !== undefined) {
      filters[col] = userVal(u, field);
      matched = true;
    }
  }
  return matched;
}

function rowOwnedBy(row, cols, u, table) {
  for (const [col, field] of Object.entries(cols || {})) {
    if (row[col] === userVal(u, field)) return true;
  }
  // scans also belong to the linked dentist (dentist_id lives in the data JSONB)
  if (table === "scans" && row?.data?.dentist_id === u.id) return true;
  return false;
}

async function assertOwnsRows(table, filters, cols, u) {
  const qs = buildQuery(filters, { limit: 100 });
  const r = await callInsforge(`/api/database/records/${encodeURIComponent(table)}?${qs}`);
  if (!r.ok) return { ok: false, status: r.status || 502, data: r.data || "Authorization check failed" };
  const rows = Array.isArray(r.data) ? r.data : [];
  for (const row of rows) {
    if (!rowOwnedBy(row, cols, u, table)) return FORBIDDEN;
  }
  return null;
}

async function isDentist(u) {
  const qs = buildQuery({ userId: u.id }, { limit: 1 });
  const r = await callInsforge(`/api/database/records/dentist_profiles?${qs}`);
  return r.ok && Array.isArray(r.data) && r.data.length > 0;
}

async function dentistClientEmails(u) {
  const qs = buildQuery({ dentistId: u.id }, { limit: 1000 });
  const r = await callInsforge(`/api/database/records/dentist_clients?${qs}`);
  if (!r.ok || !Array.isArray(r.data)) return [];
  return r.data.map((c) => c.clientEmail).filter(Boolean);
}

async function handleDatabase(operation, p, u) {
  const table = p.table;
  if (!table || FORBIDDEN_TABLES.has(table) || !ALLOWED_TABLES.has(table)) return BAD_TABLE;
  // Standalone admin (admin-token) may only touch admin-write tables (coupons).
  if (u._adminOnly && !ADMIN_WRITE.has(table)) return FORBIDDEN;
  const tablePath = `/api/database/records/${encodeURIComponent(table)}`;
  const filters = { ...(p.filters || {}) };

  switch (operation) {
    case "select": {
      // coupons: a code lookup is public; listing all coupons is admin-only.
      if (table === "coupons") {
        if (filters.code === undefined && !isAdmin(u)) return FORBIDDEN;
        return callInsforge(`${tablePath}?${buildQuery(filters, selectOpts(p))}`);
      }
      // Admin-only tables: no user scoping, admin access only.
      if (ADMIN_ONLY.has(table)) {
        if (!isAdmin(u)) return FORBIDDEN;
        return callInsforge(`${tablePath}?${buildQuery(filters, selectOpts(p))}`);
      }
      // public directories (dentist profiles) — unscoped reads allowed.
      if (PUBLIC_READ.has(table)) {
        forceCols(filters, SELECT_COLS[table] || {}, u);
        return callInsforge(`${tablePath}?${buildQuery(filters, selectOpts(p))}`);
      }
      const cols = SELECT_COLS[table];
      // scans: a dentist may read scans by patient email, but only for their
      // own verified clients (prevents reading arbitrary patients' scans).
      if (table === "scans" && filters.patientEmail !== undefined && filters.userId === undefined) {
        if (!(await isDentist(u))) return FORBIDDEN;
        const allowed = new Set(await dentistClientEmails(u));
        const req = filters.patientEmail;
        let reqArr = Array.isArray(req?.in) ? req.in : Array.isArray(req) ? req : [req];
        reqArr = reqArr.filter((e) => allowed.has(e));
        if (!reqArr.length) return { ok: true, status: 200, data: [], count: 0 };
        filters.patientEmail = reqArr.length === 1 ? reqArr[0] : { in: reqArr };
        const result = await callInsforge(`${tablePath}?${buildQuery(filters, selectOpts(p))}`);
        // PHI PROTECTION: Only return scans explicitly shared with this dentist
        // (the patient set dentist_id on the scan). Without this, any user who
        // self-registers as a dentist and adds a patient's email as a client
        // could read ALL that patient's scans — a PHI leak.
        if (result.ok && Array.isArray(result.data)) {
          result.data = result.data.filter((row) => row.data?.dentist_id === u.id);
          result.count = result.data.length;
        }
        return result;
      }
      // caller already scoped by an owner column -> force it to their value.
      if (forceCols(filters, cols, u)) {
        return callInsforge(`${tablePath}?${buildQuery(filters, selectOpts(p))}`);
      }
      // specific row by id -> verify ownership before returning.
      if (filters.id !== undefined) {
        const denied = await assertOwnsRows(table, { id: filters.id }, cols, u);
        if (denied) return denied;
        return callInsforge(`${tablePath}?${buildQuery({ id: filters.id }, selectOpts(p))}`);
      }
      // broad query with no owner filter -> scope to the caller's own rows.
      const firstCol = Object.keys(cols)[0];
      filters[firstCol] = userVal(u, cols[firstCol]);
      return callInsforge(`${tablePath}?${buildQuery(filters, selectOpts(p))}`);
    }
    case "insert": {
      if (ADMIN_WRITE.has(table) && !isAdmin(u)) return FORBIDDEN;
      const records = Array.isArray(p.records) ? p.records : [p.records];
      const owner = INSERT_OWNER[table] || {};
      const literal = INSERT_LITERAL[table] || {};
      for (const r of records) {
        if (!r || typeof r !== "object") continue;
        for (const [col, field] of Object.entries(owner)) r[col] = userVal(u, field);
        for (const [col, val] of Object.entries(literal)) r[col] = val;
        // scans: a scan's patient_email MUST be its creator's own email.
        // Dentists read scans by patientEmail for their verified clients, so
        // without this a user could insert a scan carrying another person's
        // patient_email and have it surface in that patient's clinical view
        // at their dentist — injecting a fake scan into a real patient record.
        // dentist_id is intentionally left alone (legit "share with my dentist").
        if (table === "scans") {
          r.patientEmail = u.email;
          if (!r.data || typeof r.data !== "object") r.data = {};
          r.data.patient_email = u.email;
        }
      }
      return callInsforge(tablePath, {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(records),
      });
    }
    case "update": {
      if (BLOCKED_UPDATE.has(table)) return FORBIDDEN;
      // admin-managed tables: admin may update any row; no owner scoping.
      if (ADMIN_WRITE.has(table)) {
        if (!isAdmin(u)) return FORBIDDEN;
        return callInsforge(`${tablePath}?${buildQuery(filters)}`, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(p.values || {}),
        });
      }
      const cols = WRITE_COLS[table];
      let values = p.values || {};
      const strip = STRIP_UPDATE[table];
      if (strip) {
        values = { ...values };
        for (const f of strip) delete values[f];
      }
      // scans: prevent re-attributing a scan to another patient after creation
      // (same IDOR as insert — a user updating their own scan's patient_email
      // to a victim's email would surface it in that victim's dentist view).
      if (table === "scans") {
        values = { ...values };
        if (values.patientEmail !== undefined) values.patientEmail = u.email;
        if (values.data && typeof values.data === "object") {
          values.data = { ...values.data, patient_email: u.email };
        }
      }
      // Anti-abuse: scans_used may only stay the same (purchase preserve) or
      // increment by exactly 1 (legit scan). Blocks resetting it to 0 to get
      // unlimited free scans.
      if (table === "subscriptions" && values.scansUsed !== undefined) {
        const cur = await readSubscription(u.id);
        const curUsed = Number(cur?.scansUsed ?? 0);
        const newUsed = Number(values.scansUsed);
        if (newUsed !== curUsed && newUsed !== curUsed + 1) {
          return { ok: false, status: 403, data: "Scan usage can only increase by one per scan." };
        }
      }
      const scoped = { ...filters };
      if (forceCols(scoped, cols, u)) {
        return callInsforge(`${tablePath}?${buildQuery(scoped)}`, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(values),
        });
      }
      if (filters.id !== undefined) {
        const denied = await assertOwnsRows(table, { id: filters.id }, cols, u);
        if (denied) return denied;
        const f3 = { id: filters.id };
        forceCols(f3, cols, u);
        return callInsforge(`${tablePath}?${buildQuery(f3)}`, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(values),
        });
      }
      return FORBIDDEN;
    }
    case "delete": {
      if (ADMIN_WRITE.has(table)) {
        if (!isAdmin(u)) return FORBIDDEN;
        return callInsforge(`${tablePath}?${buildQuery(filters)}`, {
          method: "DELETE",
          headers: { Prefer: "return=representation" },
        });
      }
      if (NO_DELETE.has(table) && !isAdmin(u)) return FORBIDDEN;
      const cols = WRITE_COLS[table];
      const scoped = { ...filters };
      if (forceCols(scoped, cols, u)) {
        return callInsforge(`${tablePath}?${buildQuery(scoped)}`, {
          method: "DELETE",
          headers: { Prefer: "return=representation" },
        });
      }
      if (filters.id !== undefined) {
        const denied = await assertOwnsRows(table, { id: filters.id }, cols, u);
        if (denied) return denied;
        const f3 = { id: filters.id };
        forceCols(f3, cols, u);
        return callInsforge(`${tablePath}?${buildQuery(f3)}`, {
          method: "DELETE",
          headers: { Prefer: "return=representation" },
        });
      }
      return FORBIDDEN;
    }
    case "deleteScan": {
      // Delete a scan AND its photos from storage. This is the "going forward"
      // fix: when a scan is deleted, its photos are cleaned up too, so no new
      // orphans are created. The client calls this instead of a bare delete.
      if (table !== "scans") return FORBIDDEN;
      const scanId = p.id;
      if (!scanId) return { ok: false, status: 400, data: "Scan ID required" };
      // Admins can delete any scan; users can only delete their own.
      if (!isAdmin(u)) {
        const denied = await assertOwnsRows("scans", { id: scanId }, WRITE_COLS["scans"], u);
        if (denied) return denied;
      }
      // Read the scan to get its photo URLs.
      const scanRes = await callInsforge(`/api/database/records/scans?${buildQuery({ id: scanId }, { limit: 1 })}`);
      const scan = scanRes.ok && Array.isArray(scanRes.data) ? scanRes.data[0] : null;
      if (!scan) return { ok: false, status: 404, data: "Scan not found" };
      // Collect all photo URLs from image_url + image_urls.
      const d = scan.data || {};
      const urls = [];
      if (d.image_url) urls.push(d.image_url);
      if (Array.isArray(d.image_urls)) for (const u of d.image_urls) if (u) urls.push(u);
      // Delete each photo from storage (best-effort).
      for (const url of urls) {
        try {
          const parts = url.split("/objects/");
          if (parts.length >= 2) {
            const key = decodeURIComponent(parts[parts.length - 1]);
            if (key) await callInsforge(`/api/storage/buckets/teeth-scans/objects/${encodeURIComponent(key)}`, { method: "DELETE" });
          }
        } catch {}
      }
      // Delete the scan record.
      return callInsforge(`/api/database/records/scans?${buildQuery({ id: scanId })}`, {
        method: "DELETE",
        headers: { Prefer: "return=representation" },
      });
    }
    case "schema":
    case "createTable":
      return { ok: false, status: 403, data: "Schema operations are not permitted through this proxy" };
    default:
      return { ok: false, status: 400, data: `Unknown database operation: ${operation}` };
  }
}

// --- AUTH (/api/auth/*) -----------------------------------------------------
// Public auth endpoints (signup/signin/oauth) need no InsForge token.
// getUser/oauth use the InsForge access token passed by the caller.
async function handleAuth(operation, p) {
  const bearer = (s) => (s ? { Authorization: `Bearer ${s}` } : {});
  switch (operation) {
    case "signup": {
      return callInsforge(`/api/auth/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: p.email,
          password: p.password,
          name: p.name,
        }),
      });
    }
    case "signin": {
      return callInsforge(`/api/auth/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: p.email, password: p.password }),
      });
    }
    case "getUser": {
      return callInsforge(`/api/auth/sessions/current`, {
        method: "GET",
        headers: bearer(p.accessToken),
      });
    }
    case "refresh": {
      return callInsforge(`/api/auth/refresh?client_type=mobile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: p.refreshToken }),
      });
    }
    case "logout": {
      return callInsforge(`/api/auth/logout`, {
        method: "POST",
        headers: bearer(p.accessToken),
      });
    }
    case "oauth": {
      const qs = new URLSearchParams();
      if (p.redirectUri) qs.set("redirect_uri", p.redirectUri);
      if (p.codeChallenge) qs.set("code_challenge", p.codeChallenge);
      return callInsforge(
        `/api/auth/oauth/${encodeURIComponent(p.provider)}?${qs.toString()}`
      );
    }
    case "oauthExchange": {
      return callInsforge(`/api/auth/oauth/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: p.code,
          code_verifier: p.codeVerifier,
        }),
      });
    }
    case "verifyEmail": {
      return callInsforge(`/api/auth/email/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: p.email, otp: p.otp }),
      });
    }
    case "sendVerificationCode": {
      return callInsforge(`/api/auth/email/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: p.email }),
      });
    }
    default:
      return { ok: false, status: 400, data: `Unknown auth operation: ${operation}` };
  }
}

// --- STORAGE (/api/storage/buckets/{bucket}/objects) -----------------------
// The InsForge service token can touch every object in every bucket, so every
// storage call is confined to the caller's own key namespace: `u/<userId>/…`.
// Without this, any authenticated user could list or delete another user's
// private scan photos by guessing/So supplying their object key (IDOR).
const STORAGE_BUCKETS = new Set(["teeth-scans", "food-scans"]);

function userPrefix(u) {
  return `u/${u.id}/`;
}

async function handleStorage(operation, p, u) {
  if (u._adminOnly) return FORBIDDEN;
  if (!STORAGE_BUCKETS.has(p.bucket)) return { ok: false, status: 403, data: "Forbidden bucket" };
  const bucketPath = `/api/storage/buckets/${encodeURIComponent(p.bucket)}`;
  const prefix = userPrefix(u);
  // Keys must live under the caller's prefix, with no traversal segments.
  const ownKey = (k) =>
    typeof k === "string" && k.startsWith(prefix) && !k.includes("..");

  switch (operation) {
    case "list": {
      // Always scoped to the caller's own prefix, whatever they ask for.
      const qs = new URLSearchParams();
      qs.set("prefix", prefix);
      if (p.limit != null) qs.set("limit", String(p.limit));
      if (p.offset != null) qs.set("offset", String(p.offset));
      return callInsforge(`${bucketPath}/objects?${qs.toString()}`);
    }
    case "remove": {
      if (!ownKey(p.key)) return FORBIDDEN;
      return callInsforge(`${bucketPath}/objects/${encodeURIComponent(p.key)}`, {
        method: "DELETE",
      });
    }
    case "upload": {
      // The key is always rewritten into the caller's own namespace, so a
      // client can never overwrite another user's object.
      const name = String(p.key || `scan_${Date.now()}`).split("/").pop().replace(/[^\w.-]/g, "_");
      const key = `${prefix}${name}`;
      const bytes = Uint8Array.from(atob(p.base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: p.contentType || "application/octet-stream" });
      const form = new FormData();
      form.append("file", blob, key);
      const result = await callInsforge(`${bucketPath}/objects/${encodeURIComponent(key)}`, {
        method: "PUT",
        body: form,
      });
      // Always include the object URL in the response — InsForge's PUT response
      // body may not contain a URL, so construct it from the known key. Without
      // this, the client gets `undefined` for data.url and the scan record ends
      // up with no image_url, breaking scan photo display + before/after.
      if (result.ok) {
        const url = `${INSFORGE_BASE_URL}${bucketPath}/objects/${encodeURIComponent(key)}`;
        result.data = { ...(result.data || {}), url };
      }
      return result;
    }
    case "publicUrl": {
      if (!ownKey(p.key)) return FORBIDDEN;
      return {
        ok: true,
        status: 200,
        data: { url: `${INSFORGE_BASE_URL}${bucketPath}/objects/${encodeURIComponent(p.key)}` },
        count: null,
      };
    }
    default:
      // Bucket management (listBuckets / createBucket) is not client-callable.
      return { ok: false, status: 400, data: `Unknown storage operation: ${operation}` };
  }
}