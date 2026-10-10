import {
  insforgeToken,
  authHeaders,
  buildQuery,
  INSFORGE_BASE_URL,
  extractStorageKey,
} from "../../shared/insforge.ts";
import { callInsforge, ensureTable as ensureRateLimitTable, countRecords, insertRecords, deleteRecords } from "../../shared/insforgeRateLimit.ts";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { secrets } from "base44:runtime";
import { getClientIp } from "../../shared/ipUtils.ts";
import { sendUserEmail } from "../../shared/gmailSend.ts";
import { verificationDecisionHtml } from "../../shared/emailTemplate.ts";
import { effectivePrivileges, hasPrivilege, tierPrivileges } from "../../shared/adminPrivileges.ts";
import { findFamilySlot, findOwnSub } from "../../shared/familyMatch.ts";

// Private storage buckets the admin photo viewer may read from. The admin
// audit table uses this to render thumbnails of ANY user's photos (and
// orphans) — the regular scanPhoto proxy only serves a user's own photos.
const ADMIN_PHOTO_BUCKETS = new Set(["teeth-scans", "food-scans"]);
function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Custom admin auth (username/password). Standalone — does NOT require a Base44
// session, so the admin login is reachable via a secret link. Passwords are
// hashed with PBKDF2 (Web Crypto); sessions are HMAC-signed tokens signed with
// the InsForge project token. The admins table is blocked in the generic
// insforge proxy, so hashes are only ever read here (server-side).
//
// Token signatures + password hashes use constant-time comparison to resist
// timing attacks. Admin levels (role hierarchy): super_admin > admin > viewer.
//   super_admin — full control: manage admins, set roles, view everything.
//   admin       — manage users/coupons, view admins (read-only).
//   viewer      — read-only across the dashboard.
const ADMINS_TABLE = "admins";
const ADMIN_ROLES_TABLE = "admin_roles";
const LOGIN_ATTEMPTS_TABLE = "admin_login_attempts";
const PBKDF2_ITER = 100000;
const KEY_LEN = 32;
const TOKEN_TTL_MS = 1000 * 60 * 60 * 4; // 4h — shorter window limits damage from stolen tokens

const ALLOWED_ROLES = ["super_admin", "medical_admin", "content_admin", "admin", "viewer"];
const ROLE_RANK = { super_admin: 4, medical_admin: 3, content_admin: 3, admin: 2, viewer: 1 };

// Validate admin usernames: 3-30 chars, alphanumeric + _ . -
function validateAdminUsername(username: string): boolean {
  if (!username || typeof username !== "string") return false;
  if (username.length < 3 || username.length > 30) return false;
  return /^[a-zA-Z0-9_.-]+$/.test(username);
}

// --- audit logging (InsForge-backed) ----------------------------------------
const AUDIT_LOG_TABLE = "admin_audit_log";
let auditTableEnsured = false;
const FEATURE_FLAGS_TABLE = "feature_flags";
let featureFlagsTableEnsured = false;
const VISITORS_TABLE = "site_visitors";
let visitorsTableEnsured = false;

async function ensureAuditTable() {
  if (auditTableEnsured) return;
  auditTableEnsured = true;
  await ensureRateLimitTable(AUDIT_LOG_TABLE, [
    { columnName: "admin_username", type: "string", isUnique: false, isNullable: false },
    { columnName: "action", type: "string", isUnique: false, isNullable: false },
    { columnName: "target", type: "string", isUnique: false, isNullable: false },
    { columnName: "details", type: "string", isUnique: false, isNullable: false },
    { columnName: "ip_address", type: "string", isUnique: false, isNullable: false },
    { columnName: "timestamp", type: "string", isUnique: false, isNullable: false },
  ]);
}

async function auditLog(req: Request, username: string, action: string, target: string, details = "") {
  try {
    await ensureAuditTable();
    const ip = getClientIp(req);
    await insertRecords(AUDIT_LOG_TABLE, [{
      admin_username: username,
      action,
      target,
      details,
      ip_address: ip || "unknown",
      timestamp: new Date().toISOString(),
    }]);
  } catch {}
}

// --- feature flags (admin push-to-live overrides) ---------------------------
// The clinical feature registry is code-defined, but a super_admin can flip a
// dormant feature to "live" (or revert) without a deploy. Overrides persist
// here; the app reads effective status = override || registry status.
async function ensureFeatureFlagsTable() {
  if (featureFlagsTableEnsured) return;
  featureFlagsTableEnsured = true;
  await ensureRateLimitTable(FEATURE_FLAGS_TABLE, [
    { columnName: "feature_key", type: "string", isUnique: true, isNullable: false },
    { columnName: "status", type: "string", isUnique: false, isNullable: false },
    { columnName: "updated_by", type: "string", isUnique: false, isNullable: false },
    { columnName: "updated_at", type: "string", isUnique: false, isNullable: false },
  ]);
}

async function selectFeatureFlags() {
  await ensureFeatureFlagsTable();
  const r = await callInsforge(`/api/database/records/${FEATURE_FLAGS_TABLE}?${buildQuery({}, { limit: 1000 })}`);
  return r.ok && Array.isArray(r.data) ? r.data : [];
}

async function upsertFeatureFlag(key, status, username) {
  await ensureFeatureFlagsTable();
  const existing = await callInsforge(`/api/database/records/${FEATURE_FLAGS_TABLE}?${buildQuery({ feature_key: key })}`);
  if (existing.ok && Array.isArray(existing.data) && existing.data.length) {
    return callInsforge(`/api/database/records/${FEATURE_FLAGS_TABLE}?${buildQuery({ feature_key: key })}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status, updated_by: username, updated_at: new Date().toISOString() }),
    });
  }
  return callInsforge(`/api/database/records/${FEATURE_FLAGS_TABLE}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{ feature_key: key, status, updated_by: username, updated_at: new Date().toISOString() }]),
  });
}

// --- site settings (admin-controlled global overrides, e.g. hero variant) --
const SITE_SETTINGS_TABLE = "site_settings";
let siteSettingsTableEnsured = false;
async function ensureSiteSettingsTable() {
  if (siteSettingsTableEnsured) return;
  siteSettingsTableEnsured = true;
  await ensureRateLimitTable(SITE_SETTINGS_TABLE, [
    { columnName: "key", type: "string", isUnique: true, isNullable: false },
    { columnName: "value", type: "string", isUnique: false, isNullable: false },
    { columnName: "updated_by", type: "string", isUnique: false, isNullable: false },
    { columnName: "updated_at", type: "string", isUnique: false, isNullable: false },
  ]);
}
async function getSiteSetting(key) {
  const r = await callInsforge(`/api/database/records/${SITE_SETTINGS_TABLE}?${buildQuery({ key })}`);
  return r.ok && Array.isArray(r.data) && r.data[0] ? r.data[0].value : null;
}
async function upsertSiteSetting(key, value, username) {
  await ensureSiteSettingsTable();
  const existing = await callInsforge(`/api/database/records/${SITE_SETTINGS_TABLE}?${buildQuery({ key })}`);
  if (existing.ok && Array.isArray(existing.data) && existing.data.length) {
    return callInsforge(`/api/database/records/${SITE_SETTINGS_TABLE}?${buildQuery({ key })}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ value, updated_by: username, updated_at: new Date().toISOString() }),
    });
  }
  return callInsforge(`/api/database/records/${SITE_SETTINGS_TABLE}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{ key, value, updated_by: username, updated_at: new Date().toISOString() }]),
  });
}

// --- rate limit table cleanup (prevents unbounded growth / DOS) -------------
async function cleanupOldAttempts(tableName: string, windowMs: number) {
  try {
    const cutoff = new Date(Date.now() - windowMs * 2).toISOString();
    await deleteRecords(tableName, { attempted_at: { lt: cutoff } });
  } catch {}
}

// --- rate limiting (in-memory, per-Worker instance) ------------------------
// Mitigates brute-force attacks on the admin login. Not perfect across Worker
// instances but raises the bar significantly vs unlimited attempts.
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(key) {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry) return { blocked: false };
  if (now - entry.firstAttempt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return { blocked: false };
  }
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    return { blocked: true, retryAfter: Math.ceil((entry.firstAttempt + LOGIN_WINDOW_MS - now) / 1000) };
  }
  return { blocked: false };
}

function recordFailedAttempt(key) {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (entry && now - entry.firstAttempt < LOGIN_WINDOW_MS) {
    entry.count++;
  } else {
    loginAttempts.set(key, { count: 1, firstAttempt: now });
  }
}

function clearAttempts(key) {
  loginAttempts.delete(key);
}

// Plan prices — imported from the shared module so they stay in sync with
// what Paystack/Bachs actually charge (the shared module is the single source
// of truth). "custom" has no fixed price (it's scans × $0.25) so it isn't in
// the shared map, but a custom-plan buyer is still a paying user.
import { PLAN_PRICES as SHARED_PLAN_PRICES } from '../../shared/subscriptionActivation.ts';
const PLAN_PRICES = SHARED_PLAN_PRICES;
const USD_TO_NGN = 1500;
// PAID_PLANS = all fixed-price plans + "custom" (variable price, still paid).
const PAID_PLANS = [...Object.keys(PLAN_PRICES), 'custom'];

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { op, ...p } = body;
    switch (op) {
      case "bootstrap": return await bootstrap(p);
      case "login": return await login(p);
      case "me": return await me(p);
      case "addAdmin": return await addAdmin(p, req);
      case "removeAdmin": return await removeAdmin(p, req);
      case "setAdminRole": return await setAdminRole(p, req);
      case "listAdmins": return await listAdmins(p);
      case "listUsers": return await listUsers(p, req);
      case "setUserStatus": return await setUserStatus(p, req);
      case "updateUser": return await updateUser(p, req);
      case "grantScans": return await grantScans(p, req);
      case "listAuditLog": return await listAuditLog(p, req);
      case "liveScans": return await liveScans(p, req);
      case "userOverview": return await userOverview(p, req);
      case "linkOrphanedPhotos": return await linkOrphanedPhotos(p, req);
      case "photoScanAudit": return await photoScanAudit(p, req);
      case "viewPhotos": return await viewPhotos(p, req);
      case "liveVisitors": return await liveVisitors(p, req);
      case "visitorTraffic": return await visitorTraffic(p, req);
      case "listFeatureFlags": return await listFeatureFlags(p, req);
      case "setFeatureFlag": return await setFeatureFlag(p, req);
      case "getHeroVariant": return await getHeroVariant(p, req);
      case "setHeroVariant": return await setHeroVariant(p, req);
      case "enrollTotp": return await enrollTotp(p, req);
      case "confirmTotp": return await confirmTotp(p, req);
      case "disableTotp": return await disableTotp(p, req);
      case "getTotpStatus": return await getTotpStatus(p, req);
      case "getIpAllowlist": return await getIpAllowlistOp(p, req);
      case "setIpAllowlist": return await setIpAllowlistOp(p, req);
      case "listMedicalVerifications": return await listMedicalVerificationsOp(p, req);
      case "reviewMedicalVerification": return await reviewMedicalVerificationOp(p, req);
      case "listFlaggedMessages": return await listFlaggedMessagesOp(p, req);
      case "reviewFlag": return await reviewFlagOp(p, req);
      case "listAdminPrivileges": return await listAdminPrivilegesOp(p, req);
      case "setAdminPrivileges": return await setAdminPrivilegesOp(p, req);
      case "listGuestIps": return await listGuestIpsOp(p, req);
      case "banGuestIp": return await banGuestIpOp(p, req);
      case "unbanGuestIp": return await unbanGuestIpOp(p, req);
      case "listCommunityMessages": return await listCommunityMessagesOp(p, req);
      case "deleteCommunityMessage": return await deleteCommunityMessageOp(p, req);
      case "listBlogSubmissions": return await listBlogSubmissionsOp(p, req);
      case "reviewBlogSubmission": return await reviewBlogSubmissionOp(p, req);
      case "listBlogVerifications": return await listBlogVerificationsOp(p, req);
      case "reviewBlogVerification": return await reviewBlogVerificationOp(p, req);
      case "listReferrals": return await listReferralsOp(p, req);
      case "listTips": return await listTipsOp(p, req);
      case "saveTip": return await saveTipOp(p, req);
      case "deleteTip": return await deleteTipOp(p, req);
      default: return Response.json({ error: `Unknown op "${op}"` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// --- InsForge direct access: callInsforge is imported from shared/insforgeRateLimit.ts ---

async function selectAdmins(filters = {}, opts = {}) {
  const qs = buildQuery(filters, opts);
  const r = await callInsforge(`/api/database/records/${ADMINS_TABLE}?${qs}`);
  return r.ok ? (Array.isArray(r.data) ? r.data : []) : [];
}

async function insertAdmin(record) {
  return callInsforge(`/api/database/records/${ADMINS_TABLE}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([record]),
  });
}

async function deleteAdmins(filters = {}) {
  const qs = buildQuery(filters);
  return callInsforge(`/api/database/records/${ADMINS_TABLE}?${qs}`, {
    method: "DELETE",
    headers: { Prefer: "return=representation" },
  });
}

// --- login rate limiting (InsForge-backed, persists across Worker instances) -
let attemptsTableEnsured = false;

async function ensureLoginAttemptsTable() {
  if (attemptsTableEnsured) return;
  attemptsTableEnsured = true;
  await ensureRateLimitTable(LOGIN_ATTEMPTS_TABLE, [
    { columnName: "username", type: "string", isUnique: false, isNullable: false },
    { columnName: "attempted_at", type: "string", isUnique: false, isNullable: false },
  ]);
}

async function countRecentAttempts(username) {
  const cutoff = new Date(Date.now() - LOGIN_WINDOW_MS).toISOString();
  // Opportunistic cleanup: delete records older than 2x the window to prevent
  // unbounded table growth (DOS vector + performance degradation).
  cleanupOldAttempts(LOGIN_ATTEMPTS_TABLE, LOGIN_WINDOW_MS);
  return countRecords(LOGIN_ATTEMPTS_TABLE, { username, attempted_at: { gte: cutoff } });
}

// Returns the timestamp of the oldest attempt still inside the rate-limit
// window, so we can tell the user exactly when they can retry (not just
// "try again in 15 minutes").
async function getOldestAttempt(username) {
  const cutoff = new Date(Date.now() - LOGIN_WINDOW_MS).toISOString();
  const r = await callInsforge(
    `/api/database/records/${LOGIN_ATTEMPTS_TABLE}?${buildQuery({ username, attempted_at: { gte: cutoff } }, { order: { column: "attempted_at", ascending: true }, limit: 1 })}`
  );
  return r.ok && Array.isArray(r.data) && r.data[0] ? r.data[0].attempted_at : null;
}

async function insertLoginAttempt(username) {
  return insertRecords(LOGIN_ATTEMPTS_TABLE, [{ username, attempted_at: new Date().toISOString() }]);
}

async function clearLoginAttempts(username) {
  return deleteRecords(LOGIN_ATTEMPTS_TABLE, { username });
}

// --- admin_roles table (role per admin username) ---------------------------
async function ensureRoleTable() {
  return callInsforge(`/api/database/tables`, {
    method: "POST",
    body: JSON.stringify({
      tableName: ADMIN_ROLES_TABLE,
      columns: [
        { columnName: "username", type: "string", isUnique: true, isNullable: false },
        { columnName: "role", type: "string", isUnique: false, isNullable: false },
      ],
      rlsEnabled: false,
    }),
  });
}

async function selectAdminRoles() {
  const r = await callInsforge(`/api/database/records/${ADMIN_ROLES_TABLE}?${buildQuery({}, { limit: 1000 })}`);
  return r.ok ? (Array.isArray(r.data) ? r.data : []) : [];
}

async function upsertAdminRole(username, role) {
  // Best-effort upsert: try update, then insert.
  const existing = await callInsforge(`/api/database/records/${ADMIN_ROLES_TABLE}?${buildQuery({ username })}`);
  if (existing.ok && Array.isArray(existing.data) && existing.data.length) {
    return callInsforge(`/api/database/records/${ADMIN_ROLES_TABLE}?${buildQuery({ username })}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ role }),
    });
  }
  return callInsforge(`/api/database/records/${ADMIN_ROLES_TABLE}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{ username, role }]),
  });
}

async function deleteAdminRole(username) {
  return callInsforge(`/api/database/records/${ADMIN_ROLES_TABLE}?${buildQuery({ username })}`, {
    method: "DELETE",
  });
}

async function ensureTable() {
  // Best-effort: create the admins table. Ignored if it already exists.
  await callInsforge(`/api/database/tables`, {
    method: "POST",
    body: JSON.stringify({
      tableName: ADMINS_TABLE,
      columns: [
        { columnName: "username", type: "string", isUnique: true, isNullable: false },
        { columnName: "password_hash", type: "string", isUnique: false, isNullable: false },
        { columnName: "salt", type: "string", isUnique: false, isNullable: false },
      ],
      rlsEnabled: false,
    }),
  });
  await ensureRoleTable();
}

// --- crypto helpers (Web Crypto) --------------------------------------------
function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}
function b64encode(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function b64decode(str) {
  const s = atob(str);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

async function hashPassword(password, saltB64) {
  const salt = saltB64 ? b64decode(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITER, hash: "SHA-256" },
    keyMaterial, KEY_LEN * 8
  );
  return { hash: b64encode(bits), salt: b64encode(salt) };
}

async function hmacSign(msg) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(insforgeToken()),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return b64encode(sig);
}

async function signToken(username) {
  const exp = Date.now() + TOKEN_TTL_MS; // 4h
  const payload = `${username}:${exp}`;
  const sig = await hmacSign(payload);
  return `${payload}:${sig}`;
}

async function verifyToken(token) {
  if (!token) return null;
  const parts = String(token).split(":");
  if (parts.length !== 3) return null;
  const [username, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!exp || exp < Date.now()) return null;
  const expected = await hmacSign(`${username}:${exp}`);
  if (!timingSafeEqual(expected, sig)) return null;
  return username;
}

// --- enrollment token (short-lived, enrollment-only) -----------------------
// Issued after a correct password when the admin has NO 2FA enrolled. It can
// ONLY be used for enrollTotp/confirmTotp — never for admin operations. This
// enforces mandatory 2FA: no admin gets a session token without 2FA active.
const ENROLL_TOKEN_TTL_MS = 1000 * 60 * 30; // 30 min — enough time to set up an authenticator app
async function signEnrollmentToken(username) {
  const exp = Date.now() + ENROLL_TOKEN_TTL_MS;
  const payload = `enroll:${username}:${exp}`;
  const sig = await hmacSign(payload);
  return `${payload}:${sig}`;
}
async function verifyEnrollmentToken(token) {
  if (!token) return null;
  const parts = String(token).split(":");
  if (parts.length !== 4) return null;
  const [prefix, username, expStr, sig] = parts;
  if (prefix !== "enroll") return null;
  const exp = Number(expStr);
  if (!exp || exp < Date.now()) return null;
  const expected = await hmacSign(`enroll:${username}:${expStr}`);
  if (!timingSafeEqual(expected, sig)) return null;
  return username;
}

// --- TOTP 2FA (RFC 6238) ----------------------------------------------------
// Time-based one-time passwords using Web Crypto HMAC-SHA1. Admins enroll a
// shared secret into their authenticator app (Google Authenticator, Authy,
// 1Password, etc.); every login then requires a fresh 6-digit code in addition
// to the password — so a stolen or guessed password alone is not enough.
const TOTP_TABLE = "admin_totp";
let totpTableEnsured = false;
const TOTP_STEP = 30; // seconds
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 2; // accept current ± 2 steps (covers clock drift)

// RFC 4648 base32 (A-Z2-7), no padding — the format authenticator apps expect.
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Encode(bytes: Uint8Array): string {
  let bits = 0, value = 0, out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}
function base32Decode(str: string): Uint8Array {
  const clean = str.replace(/=+$/g, "").toUpperCase().replace(/\s/g, "");
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const c of clean) {
    const idx = BASE32_ALPHABET.indexOf(c);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

async function computeTotp(secretB32: string, counter: number): Promise<string> {
  const key = base32Decode(secretB32);
  // Counter as 8-byte big-endian buffer.
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  // JS bitwise ops are 32-bit, so split the 48-bit counter into high/low.
  view.setUint32(0, Math.floor(counter / 0x100000000) >>> 0);
  view.setUint32(4, counter >>> 0);
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, buf));
  // Dynamic truncation (RFC 4226).
  const offset = mac[mac.length - 1] & 0x0f;
  const binary = ((mac[offset] & 0x7f) << 24) |
    ((mac[offset + 1] & 0xff) << 16) |
    ((mac[offset + 2] & 0xff) << 8) |
    (mac[offset + 3] & 0xff);
  const code = binary % Math.pow(10, TOTP_DIGITS);
  return String(code).padStart(TOTP_DIGITS, "0");
}

async function verifyTotp(secretB32: string, code: string): Promise<boolean> {
  if (!code || typeof code !== "string") return false;
  const clean = String(code).replace(/\s/g, "");
  const now = Math.floor(Date.now() / 1000);
  for (let drift = -TOTP_WINDOW; drift <= TOTP_WINDOW; drift++) {
    const counter = Math.floor((now + drift * TOTP_STEP) / TOTP_STEP);
    const expected = await computeTotp(secretB32, counter);
    if (timingSafeEqual(expected, clean)) return true;
  }
  return false;
}

async function ensureTotpTable() {
  if (totpTableEnsured) return;
  totpTableEnsured = true;
  await ensureRateLimitTable(TOTP_TABLE, [
    { columnName: "username", type: "string", isUnique: true, isNullable: false },
    { columnName: "secret_b32", type: "string", isUnique: false, isNullable: false },
    { columnName: "enabled", type: "boolean", isUnique: false, isNullable: false },
    { columnName: "enrolled_at", type: "string", isUnique: false, isNullable: false },
  ]);
}

async function selectTotp(username: string) {
  await ensureTotpTable();
  const r = await callInsforge(`/api/database/records/${TOTP_TABLE}?${buildQuery({ username }, { limit: 1 })}`);
  return r.ok && Array.isArray(r.data) && r.data[0] ? r.data[0] : null;
}

async function upsertTotp(username: string, secretB32: string, enabled: boolean) {
  const existing = await selectTotp(username);
  if (existing) {
    return callInsforge(`/api/database/records/${TOTP_TABLE}?${buildQuery({ id: existing.id })}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ secret_b32: secretB32, enabled, enrolled_at: new Date().toISOString() }),
    });
  }
  return callInsforge(`/api/database/records/${TOTP_TABLE}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{ username, secret_b32: secretB32, enabled, enrolled_at: new Date().toISOString() }]),
  });
}

async function deleteTotp(username: string) {
  return callInsforge(`/api/database/records/${TOTP_TABLE}?${buildQuery({ username })}`, {
    method: "DELETE",
  });
}

// --- IP allowlisting (admin access restriction) -----------------------------
// A super_admin can restrict admin login to a set of IPs/CIDRs. When non-empty,
// login requests from any other IP are rejected before the password is even
// checked — so the panel is unreachable from untrusted networks.
function ipInAllowlist(ip: string, allowlist: string[]): boolean {
  if (!ip) return false;
  // Normalize: strip port, handle IPv6 brackets.
  let test = ip.replace(/^\[|\]$/g, "").split(":")[0];
  // IPv6 with port (e.g. [::1]:443) — the bracket strip above handles it.
  // For IPv4 with port (1.2.3.4:443), take the part before the last colon
  // only if it looks like an IPv4 (has dots).
  if (test.includes(".") && test.split(":").length > 1) {
    test = test.split(":")[0];
  }
  for (const entry of allowlist) {
    const rule = entry.trim();
    if (!rule) continue;
    if (rule === test) return true;
    // Simple CIDR check for /8, /16, /24, /32 (IPv4).
    if (rule.includes("/")) {
      const [base, bitsStr] = rule.split("/");
      const bits = parseInt(bitsStr, 10);
      if (Number.isFinite(bits) && bits >= 0 && bits <= 32 && base.includes(".") && test.includes(".")) {
        const baseParts = base.split(".").map(Number);
        const testParts = test.split(".").map(Number);
        if (baseParts.length === 4 && testParts.length === 4) {
          let maskBits = bits;
          let match = true;
          for (let i = 0; i < 4; i++) {
            const m = maskBits >= 8 ? 0xff : (maskBits <= 0 ? 0 : (0xff << (8 - maskBits)) & 0xff);
            if ((baseParts[i] & m) !== (testParts[i] & m)) { match = false; break; }
            maskBits = Math.max(0, maskBits - 8);
          }
          if (match) return true;
        }
      }
    }
  }
  return false;
}

async function getIpAllowlist(): Promise<string[]> {
  const v = await getSiteSetting("admin_ip_allowlist");
  if (!v) return [];
  return v.split(",").map((s: string) => s.trim()).filter(Boolean);
}

// Resolve the caller's username + role from their token.
async function resolveCaller(p) {
  const username = await verifyToken(p.token);
  if (!username) return null;
  const admins = await selectAdmins({}, { limit: 1000 });
  // CRITICAL: verify the caller still exists as an admin. Without this, a
  // removed admin's token is valid for up to 12h with default role "admin".
  const exists = admins.some((a) => a.username === username);
  if (!exists) return null;
  const roleMap = await getRoleMap();
  const role = defaultRole(username, admins, roleMap);
  return { username, role };
}

// Resolve a caller using an enrollment token (2FA enrollment flow only).
// Returns { username, role: null } — no admin actions are allowed with this.
async function resolveEnrollmentCaller(p) {
  const token = p.enrollment_token || p.token;
  if (!token) return null;
  const username = await verifyEnrollmentToken(token);
  if (!username) return null;
  const admins = await selectAdmins({}, { limit: 1000 });
  if (!admins.some((a) => a.username === username)) return null;
  return { username, role: null };
}

async function getRoleMap() {
  const rows = await selectAdminRoles();
  const map = {};
  for (const r of rows) map[r.username] = r.role;
  return map;
}

// role lookup with sensible default: earliest-created admin is super_admin.
function defaultRole(username, admins, roleMap) {
  if (roleMap[username] && ALLOWED_ROLES.includes(roleMap[username])) return roleMap[username];
  const sorted = [...admins].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
  return sorted[0]?.username === username ? "super_admin" : "admin";
}

function isPaid(sub) {
  return !!sub && sub.status === "active" && PAID_PLANS.includes(sub.plan);
}

// --- operations -------------------------------------------------------------
async function bootstrap(p) {
  // CRITICAL: require the engine access key — prevents anyone from creating
  // the first super_admin if the table is ever empty (DB reset, migration).
  const engineKey = secrets.get("ENGINE_ACCESS_KEY");
  if (!engineKey || p.engine_key !== engineKey) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (!p.username || !p.password) return Response.json({ error: "username and password required" }, { status: 400 });
  if (!validateAdminUsername(p.username)) return Response.json({ error: "Invalid username format" }, { status: 400 });
  if (p.password.length < 8) return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  await ensureTable();
  const existing = await selectAdmins({}, { limit: 1 });
  if (existing.length) return Response.json({ error: "An admin already exists. Use login instead." }, { status: 409 });
  const { hash, salt } = await hashPassword(p.password);
  const r = await insertAdmin({ username: p.username, password_hash: hash, salt });
  if (!r.ok) return Response.json({ error: "Could not create admin" }, { status: 502 });
  await upsertAdminRole(p.username, "super_admin");
  return Response.json({ ok: true, username: p.username, role: "super_admin" });
}

async function login(p, req) {
  if (!p.username || !p.password) return Response.json({ error: "username and password required" }, { status: 400 });

  // --- IP allowlist: reject before any password check if configured ---
  const allowlist = await getIpAllowlist();
  if (allowlist.length > 0) {
    const ip = getClientIp(req);
    if (!ipInAllowlist(ip, allowlist)) {
      await auditLog(req, p.username, "loginBlocked", "ip", `Blocked IP: ${ip || "unknown"}`);
      return Response.json({ error: "Access from this network is not allowed. Contact a super admin." }, { status: 403 });
    }
  }

  // Rate limit: in-memory fast check + InsForge-backed persistent check
  const memRl = checkRateLimit(p.username);
  if (memRl.blocked) {
    return Response.json({ error: `Too many failed attempts. Try again in ${memRl.retryAfter} seconds.`, retry_after_seconds: memRl.retryAfter }, { status: 429 });
  }
  await ensureLoginAttemptsTable();
  const recentCount = await countRecentAttempts(p.username);
  if (recentCount >= MAX_LOGIN_ATTEMPTS) {
    const oldest = await getOldestAttempt(p.username);
    const retryMs = oldest ? new Date(oldest).getTime() + LOGIN_WINDOW_MS - Date.now() : LOGIN_WINDOW_MS;
    const retrySec = Math.max(1, Math.ceil(retryMs / 1000));
    return Response.json({ error: "Too many failed attempts. Please wait and try again.", retry_after_seconds: retrySec }, { status: 429 });
  }
  const rows = await selectAdmins({ username: p.username }, { limit: 1 });
  if (!rows.length) {
    // Timing attack mitigation: perform a dummy hash so the response time
    // matches the case where the username exists (PBKDF2 ~100ms).
    await hashPassword(p.password, b64encode(crypto.getRandomValues(new Uint8Array(16))));
    recordFailedAttempt(p.username);
    await insertLoginAttempt(p.username);
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const row = rows[0];
  const { hash } = await hashPassword(p.password, row.salt);
  if (!timingSafeEqual(hash, row.password_hash)) {
    recordFailedAttempt(p.username);
    await insertLoginAttempt(p.username);
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }
  // --- TOTP 2FA: password is correct, now require a verification code ---
  // The password is verified — clear any earlier wrong-password attempts so
  // they can't accumulate and lock the admin out after a successful password.
  clearAttempts(p.username);
  await clearLoginAttempts(p.username);
  const totpRow = await selectTotp(p.username);
  if (totpRow && totpRow.enabled) {
    if (!p.totp_code) {
      // Don't issue the token yet — tell the client a code is required.
      return Response.json({ totp_required: true }, { status: 200 });
    }
    const valid = await verifyTotp(totpRow.secret_b32, p.totp_code);
    if (!valid) {
      // The password was already verified correct — do NOT count a wrong 2FA
      // code against the password rate-limit counter. Otherwise a few mistyped
      // codes would lock the admin out of their own account (the persisted
      // attempts survive a page refresh, rejecting the correct password too).
      // 2FA brute-force is already impractical (1M codes / 30s window).
      await auditLog(req, p.username, "loginFailed", "totp", "Invalid 2FA code");
      return Response.json({ error: "Invalid verification code" }, { status: 401 });
    }
  } else {
    // 2FA NOT enrolled — ENFORCE enrollment before issuing any session token.
    // Password was correct, so clear the rate-limit counters, then issue a
    // short-lived enrollment token that can ONLY be used to set up 2FA.
    clearAttempts(p.username);
    await clearLoginAttempts(p.username);
    const enrollmentToken = await signEnrollmentToken(p.username);
    await auditLog(req, p.username, "totpEnrollmentRequired", p.username, "2FA enrollment enforced at login");
    return Response.json({ totp_enrollment_required: true, enrollment_token: enrollmentToken }, { status: 200 });
  }
  clearAttempts(p.username);
  await clearLoginAttempts(p.username);
  const admins = await selectAdmins({}, { limit: 1000 });
  const roleMap = await getRoleMap();
  const role = defaultRole(p.username, admins, roleMap);
  const token = await signToken(p.username);
  await auditLog(req, p.username, "login", p.username, `Role: ${role}`);
  return Response.json({ token, username: p.username, role });
}

async function me(p) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Invalid or expired session" }, { status: 401 });
  return Response.json({ username: caller.username, role: caller.role });
}

async function listAdmins(p) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await selectAdmins({}, { order: { column: "created_at", ascending: true } });
  const roleMap = await getRoleMap();
  return Response.json({
    admins: rows.map((r) => ({
      username: r.username,
      created_at: r.created_at,
      role: defaultRole(r.username, rows, roleMap),
    })),
    callerRole: caller.role,
  });
}

async function addAdmin(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (caller.role !== "super_admin") return Response.json({ error: "Only super admins can add admins" }, { status: 403 });
  if (!p.username || !p.password) return Response.json({ error: "username and password required" }, { status: 400 });
  if (!validateAdminUsername(p.username)) return Response.json({ error: "Username must be 3-30 chars, alphanumeric/._-" }, { status: 400 });
  if (p.password.length < 8) return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  const role = ALLOWED_ROLES.includes(p.role) ? p.role : "admin";
  await ensureTable();
  const dup = await selectAdmins({ username: p.username }, { limit: 1 });
  if (dup.length) return Response.json({ error: "Username already exists" }, { status: 409 });
  const { hash, salt } = await hashPassword(p.password);
  const r = await insertAdmin({ username: p.username, password_hash: hash, salt });
  if (!r.ok) return Response.json({ error: (r.data && (r.data.message || r.data.error)) || "Could not add admin" }, { status: 502 });
  await upsertAdminRole(p.username, role);
  await auditLog(req, caller.username, "addAdmin", p.username, `Created admin with role: ${role}`);
  return Response.json({ ok: true, username: p.username, role });
}

async function removeAdmin(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (caller.role !== "super_admin") return Response.json({ error: "Only super admins can remove admins" }, { status: 403 });
  if (!p.username) return Response.json({ error: "username required" }, { status: 400 });
  if (caller.username === p.username) return Response.json({ error: "You cannot remove yourself" }, { status: 400 });
  const all = await selectAdmins({}, { limit: 1000 });
  if (all.length <= 1) return Response.json({ error: "Cannot remove the last admin" }, { status: 400 });
  // Never remove the last super_admin.
  const roleMap = await getRoleMap();
  const superCount = all.filter((a) => defaultRole(a.username, all, roleMap) === "super_admin").length;
  if (superCount <= 1 && defaultRole(p.username, all, roleMap) === "super_admin") {
    return Response.json({ error: "Cannot remove the last super admin" }, { status: 400 });
  }
  await deleteAdmins({ username: p.username });
  await deleteAdminRole(p.username);
  await auditLog(req, caller.username, "removeAdmin", p.username);
  return Response.json({ ok: true });
}

async function setAdminRole(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (caller.role !== "super_admin") return Response.json({ error: "Only super admins can change roles" }, { status: 403 });
  if (!p.username) return Response.json({ error: "username required" }, { status: 400 });
  if (!ALLOWED_ROLES.includes(p.role)) return Response.json({ error: "Invalid role" }, { status: 400 });
  const target = await selectAdmins({ username: p.username }, { limit: 1 });
  if (!target.length) return Response.json({ error: "Admin not found" }, { status: 404 });
  const all = await selectAdmins({}, { limit: 1000 });
  const roleMap = await getRoleMap();
  // Protect the last super_admin from being demoted.
  if (defaultRole(p.username, all, roleMap) === "super_admin" && p.role !== "super_admin") {
    const superCount = all.filter((a) => defaultRole(a.username, all, roleMap) === "super_admin").length;
    if (superCount <= 1) return Response.json({ error: "Cannot demote the last super admin" }, { status: 400 });
  }
  await ensureRoleTable();
  await upsertAdminRole(p.username, p.role);
  await auditLog(req, caller.username, "setAdminRole", p.username, `Changed role to: ${p.role}`);
  return Response.json({ ok: true, username: p.username, role: p.role });
}

// --- user analytics: scans + payments + revenue across ALL app users -------
async function listUsers(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [uRes, sRes, subRes, countRes] = await Promise.all([
    callInsforge(`/api/database/records/users?${buildQuery({}, { limit: 10000 })}`),
    // Fetch the FULL row (no `select`) so the `data` JSONB + `patientEmail`
    // column come back too — scans where `userId` is null (session expired
    // mid-scan) can still be attributed via patient_email → user email.
    callInsforge(`/api/database/records/scans?${buildQuery({}, { limit: 10000 })}`),
    callInsforge(`/api/database/records/subscriptions?${buildQuery({}, { limit: 1000 })}`),
    // Exact row count of the scans table (PostgREST count=exact) — the same
    // source as the public stats counter, so the admin "Total scans" stat
    // matches the landing page even when the capped `scans` fetch (10k) is
    // smaller than the true total.
    fetch(`${INSFORGE_BASE_URL}/api/database/records/scans?select=id&limit=1`, { headers: { ...authHeaders(), Prefer: 'count=exact' } }),
  ]);
  // Parse the true total from the content-range header ("0-0/12345").
  const exactScanTotal = (() => {
    try {
      const range = countRes?.headers?.get('content-range') || '';
      const t = Number(range.split('/')[1]);
      return Number.isFinite(t) && t >= 0 ? t : null;
    } catch { return null; }
  })();

  const mirror = uRes.ok && Array.isArray(uRes.data) ? uRes.data : [];
  const scans = sRes.ok && Array.isArray(sRes.data) ? sRes.data : [];
  const subs = subRes.ok && Array.isArray(subRes.data) ? subRes.data : [];

  // Authoritative user list: the Base44 User entity, read server-side as the
  // service role so EVERY registered user shows — not only those synced to the
  // portable mirror. This is also the source of the join date (created_date).
  // Loaded early so the email→userId map is available for scan attribution.
  let baseUsers = [];
  try {
    const unrufld = createClientFromRequest(req);
    const list = await unrufld.asServiceRole.entities.User.list("-created_date", 10000);
    baseUsers = (list || []).filter((u) => u && u.id);
  } catch {}

  // email → userId map (from Base44 users + mirror) so scans with a null userId
  // can still be attributed to the right person via patient_email.
  const emailToUserId = {};
  for (const u of baseUsers) {
    if (u.email) emailToUserId[String(u.email).toLowerCase()] = u.id;
  }
  for (const m of mirror) {
    const id = m.userId || (m.data && m.data.user_id);
    const email = m.email || (m.data && m.data.email);
    if (id && email) emailToUserId[String(email).toLowerCase()] = id;
  }

  // Count scans across ALL scan records — a user whose mirror copy hasn't
  // synced (or who only appears via scans) still gets counted. Scans with a
  // null userId are recovered via patient_email → user email so they're
  // attributed to the right person instead of being silently dropped.
  // totalScans reflects EVERY scan record (including any that can't be
  // attributed), so the admin total matches the raw database row count.
  const scanCounts = {};
  const lastScanByUser = {};
  let unattributed = 0;
  for (const s of scans) {
    let u = s.userId || (s.data && s.data.user_id);
    if (!u) {
      const email = s.patientEmail || (s.data && s.data.patient_email);
      if (email) u = emailToUserId[String(email).toLowerCase()];
    }
    if (!u) { unattributed++; continue; }
    // A full (5-angle) scan consumes 3 scan credits, so it counts as 3 in the
    // admin totals — matching how scans are deducted from the user's balance.
    const weight = (s.data && s.data.scan_type) === "full" ? 3 : 1;
    scanCounts[u] = (scanCounts[u] || 0) + weight;
    const ts = s.created_at;
    if (ts && (!lastScanByUser[u] || new Date(ts) > new Date(lastScanByUser[u]))) {
      lastScanByUser[u] = ts;
    }
  }
  const subByUser = {};
  for (const s of subs) {
    const u = s.userId || (s.data && s.data.user_id);
    if (u) subByUser[u] = s;
  }
  const mirrorByUser = {};
  for (const m of mirror) {
    const id = m.userId || (m.data && m.data.user_id);
    if (id) mirrorByUser[id] = m;
  }

  // Revenue events (individual purchases) for time-series analytics.
  // Authoritative source: purchases recorded on the InsForge subscription rows
  // (Paystack verify writes there). The Base44 Subscription entity fills any
  // gaps. Deduped by payment reference so BOTH revenue displays (stat card +
  // analytics chart) come from the same single source of truth.
  const revenueEvents = [];
  const seenRefs = new Set();
  const pushPurchase = (pu) => {
    if (!pu || pu.date == null || pu.amount_usd == null) return;
    const ref = pu.reference || `${pu.plan || "?"}_${pu.date}`;
    if (seenRefs.has(ref)) return;
    seenRefs.add(ref);
    const net = Number(pu.amount_usd) || 0;
    // Gross = the plan's list price before any coupon discount; falls back to
    // the collected amount when the plan isn't a fixed-price SKU (e.g. custom
    // bundles), so the "before coupons" view never overstates revenue.
    const gross = PLAN_PRICES[pu.plan] != null ? PLAN_PRICES[pu.plan] : net;
    revenueEvents.push({ date: pu.date, amount_usd: net, gross_usd: gross, plan: pu.plan || null });
  };
  for (const s of subs) {
    const purchases = s.data && Array.isArray(s.data.purchases) ? s.data.purchases : [];
    for (const pu of purchases) pushPurchase(pu);
  }
  try {
    const b44 = createClientFromRequest(req);
    const allSubs = await b44.asServiceRole.entities.Subscription.list("-created_date", 10000);
    for (const s of allSubs || []) {
      for (const pu of (Array.isArray(s.purchases) ? s.purchases : [])) pushPurchase(pu);
    }
  } catch {}
  const baseById = {};
  for (const u of baseUsers) baseById[u.id] = u;

  // Union of known ids: Base44 users ∪ mirror ∪ scan/sub userIds, so no user
  // (and no scan) is ever dropped.
  const idSet = new Set();
  for (const u of baseUsers) idSet.add(u.id);
  for (const id of Object.keys(mirrorByUser)) idSet.add(id);
  for (const id of Object.keys(scanCounts)) idSet.add(id);
  for (const id of Object.keys(subByUser)) idSet.add(id);

  let paidUsers = 0;
  // totalScans = the TRUE row count of the scans table (PostgREST exact
  // count), matching the public stats counter on the landing page exactly —
  // so the admin total and the home/landing total always agree. Falls back
  // to the capped `scans.length` only if the exact-count header is missing.
  const totalScans = exactScanTotal != null ? exactScanTotal : scans.length;
  // Real revenue = sum of recorded purchases, not current plan list prices.
  const revenueUSD = revenueEvents.reduce((a, e) => a + (Number(e.amount_usd) || 0), 0);
  const revenueGrossUSD = revenueEvents.reduce((a, e) => a + (Number(e.gross_usd) || 0), 0);
  const users = [...idSet].map((id) => {
    const b = baseById[id] || {};
    const m = mirrorByUser[id] || {};
    const md = m.data || {};
    const sub = subByUser[id];
    const paid = isPaid(sub);
    const plan = sub?.plan || m.plan || "free";
    const scanCount = scanCounts[id] || 0;
    if (paid) paidUsers += 1;
    return {
      user_id: id,
      email: b.email || m.email || md.email || null,
      full_name: b.full_name || m.fullName || md.full_name || null,
      display_name: b.display_name || md.display_name || null,
      username: b.username || b.display_name || md.username || md.display_name || null,
      username_history: (Array.isArray(b.username_history) && b.username_history.length ? b.username_history
        : Array.isArray(md.username_history) ? md.username_history : []).filter(Boolean),
      first_name: b.first_name || md.first_name || null,
      last_name: b.last_name || md.last_name || null,
      phone_number: md.phone_number || null,
      how_found: b.how_found || md.how_found || null,
      is_verified: b.is_verified === true || md.is_verified === true,
      show_real_name: b.show_real_name === true || md.show_real_name === true,
      role: b.role || m.role || md.role || "user",
      last_seen: m.lastSeen || md.last_seen || null,
      created_at: b.created_date || m.base44_created_date || m.created_at || md.base44_created_date || null,
      scan_count: scanCount,
      last_scan_at: lastScanByUser[id] || null,
      plan,
      plan_status: sub?.status || null,
      paid,
      scans_used: sub?.scansUsed ?? null,
      scans_limit: sub?.scansLimit ?? null,
      account_status: b.account_status || "active",
    };
  });

  users.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  // Redact sensitive PII for viewer role
  if (caller.role === "viewer") {
    for (const u of users) {
      u.email = null;
      u.phone_number = null;
    }
  }

  const how_found_breakdown = {};
  for (const u of users) {
    const k = u.how_found || "unspecified";
    how_found_breakdown[k] = (how_found_breakdown[k] || 0) + 1;
  }

  return Response.json({
    users,
    revenue_events: revenueEvents,
    totals: {
      total_users: users.length,
      paid_users: paidUsers,
      free_users: users.length - paidUsers,
      total_scans: totalScans,
      revenue_usd: Math.round(revenueUSD * 100) / 100,
      revenue_usd_gross: Math.round(revenueGrossUSD * 100) / 100,
      revenue_ngn: Math.round(revenueUSD * USD_TO_NGN),
      how_found_breakdown,
    },
    callerRole: caller.role,
  });
}

// Suspend / unsuspend / soft-delete an app user. The record stays in the
// database (account_status flag) so it can be reinstated, but a deleted or
// suspended account cannot sign in (the login flow checks this status first).
async function setUserStatus(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (caller.role === "viewer") return Response.json({ error: "Viewers cannot modify users" }, { status: 403 });
  const status = String(p.status || "").toLowerCase();
  if (!["active", "suspended", "deleted"].includes(status)) return Response.json({ error: "Invalid status" }, { status: 400 });
  if (!p.user_id) return Response.json({ error: "user_id required" }, { status: 400 });
  const unrufld = createClientFromRequest(req);
  // Protect admin accounts: only super_admin can suspend/delete admins
  const target = await unrufld.asServiceRole.entities.User.get(p.user_id);
  if (!target) return Response.json({ error: "User not found" }, { status: 404 });
  if (target.role === "admin" && caller.role !== "super_admin") {
    return Response.json({ error: "Only super admins can modify admin accounts" }, { status: 403 });
  }
  await unrufld.asServiceRole.entities.User.update(p.user_id, { account_status: status });
  const statusDesc = status === 'suspended' ? 'Suspended the account' : status === 'active' ? 'Reactivated the account' : 'Marked the account as deleted';
  await auditLog(req, caller.username, "setUserStatus", p.user_id, statusDesc);
  return Response.json({ ok: true, user_id: p.user_id, status });
}

async function updateUser(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (caller.role === "viewer") return Response.json({ error: "Viewers cannot modify users" }, { status: 403 });
  if (!p.user_id) return Response.json({ error: "user_id required" }, { status: 400 });
  // NOTE: full_name is a read-only built-in on the User entity and cannot be
  // updated by anyone — editing it silently no-ops. display_name is the editable
  // custom field that surfaces as the user's visible name instead.
  const allowed = ["email", "display_name", "first_name", "last_name", "how_found"];
  const updates = {};
  for (const k of allowed) {
    if (p[k] !== undefined && p[k] !== null) updates[k] = String(p[k]).trim();
  }
  // Boolean fields — verified badge, real-name opt-in, and teewai-official flag.
  for (const k of ["is_verified", "show_real_name", "is_official"]) {
    if (p[k] !== undefined && p[k] !== null) updates[k] = p[k] === true || p[k] === "true";
  }
  // is_official is super-admin only — only super admins can crown teewai officials
  // (independent of the Base44 admin role, so a regular user is never mislabelled).
  if (updates.is_official !== undefined && caller.role !== "super_admin") {
    return Response.json({ error: "Only super admins can set teewai official status" }, { status: 403 });
  }
  // An empty how_found would violate the entity enum — treat it as "no change".
  if (updates.how_found === "") delete updates.how_found;
  // CRITICAL: email changes are restricted to super_admin only — prevents
  // account takeover via email-change → password-reset chain (Mitnick-style
  // privilege escalation: a regular admin could hijack any user account).
  if (updates.email && caller.role !== "super_admin") {
    return Response.json({ error: "Only super admins can change user emails" }, { status: 403 });
  }
  if (Object.keys(updates).length === 0) return Response.json({ error: "No valid fields to update" }, { status: 400 });
  const unrufld = createClientFromRequest(req);
  // Protect admin accounts: only super_admin can edit admin profiles
  const target = await unrufld.asServiceRole.entities.User.get(p.user_id);
  if (!target) return Response.json({ error: "User not found" }, { status: 404 });
  if (target.role === "admin" && caller.role !== "super_admin") {
    return Response.json({ error: "Only super admins can modify admin accounts" }, { status: 403 });
  }
  await unrufld.asServiceRole.entities.User.update(p.user_id, updates);
  // Keep the portable identity mirror in sync so the edited fields don't get
  // shadowed by a stale copy the next time the user list is loaded.
  await syncUserMirrorFields(p.user_id, updates);
  const prettyFields = { full_name: 'full name', email: 'email', first_name: 'first name', last_name: 'last name', how_found: 'how they found us' };
  const changedFields = Object.keys(updates).map((k) => prettyFields[k] || k).join(', ');
  await auditLog(req, caller.username, "updateUser", p.user_id, `Updated ${changedFields}`);
  return Response.json({ ok: true, user_id: p.user_id, updates });
}

// Grant extra scans to a user. The grant is routed to the pool that scanQuota
// actually reads at scan time, so the scans are usable immediately:
//   - Linked family member → the OWNER's pack pool (pack_scans_remaining /
//     pack_scans_total). scanQuota resolves a linked member against the owner's
//     family plan and ignores the member's own subscription row, so adding to
//     their own scansLimit is invisible until they leave the plan.
//   - Family owner → their own pack pool. A family owner's remaining scans come
//     from memberRemaining (pack + member allocation), NOT the top-level
//     scansLimit, so bumping scansLimit is invisible too.
//   - Solo (free / pack / pro) → scansLimit (the existing behaviour), since
//     solo remaining = scansLimit - scansUsed.
// Pack scans are consumed before the member's 15-scan allocation, and both
// pack_scans_total and pack_scans_remaining are bumped so the scanQuota clamp
// (min(remaining, total)) doesn't eat the grant.
async function grantScans(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (caller.role === "viewer") return Response.json({ error: "Viewers cannot modify users" }, { status: 403 });
  const n = Math.floor(Number(p.scans));
  if (!p.user_id) return Response.json({ error: "user_id required" }, { status: 400 });
  if (!Number.isFinite(n) || n < 1 || n > 1000) return Response.json({ error: "scans must be between 1 and 1000" }, { status: 400 });

  const unrufld = createClientFromRequest(req);

  // Resolve the target's billing context the same way scanQuota does. We need
  // the user's email/username/name to match a family slot, so fetch their
  // profile alongside all subscription rows.
  const [subsRes, profile] = await Promise.all([
    callInsforge(`/api/database/records/subscriptions?${buildQuery({}, { limit: 1000, order: { column: 'created_at', ascending: false } })}`),
    unrufld.asServiceRole.entities.User.get(p.user_id).catch(() => null),
  ]);
  const subs = subsRes.ok && Array.isArray(subsRes.data) ? subsRes.data : [];
  const me = profile ? {
    email: (profile.email || "").trim().toLowerCase(),
    username: (profile.username || profile.display_name || "").trim().toLowerCase(),
    full_name: (profile.full_name || "").trim().toLowerCase(),
    display_name: (profile.display_name || "").trim().toLowerCase(),
  } : { email: "", username: "", full_name: "", display_name: "" };

  // 1) Linked family member → add to the OWNER's pack pool.
  const linked = findFamilySlot(subs, me);
  if (linked) {
    const ownerSub = linked.s;
    const data = { ...(ownerSub.data || {}) };
    const total = Math.max(0, Number(data.pack_scans_total) || 0) + n;
    const rem = Math.max(0, Number(data.pack_scans_remaining) || 0) + n;
    data.pack_scans_total = total;
    data.pack_scans_remaining = rem;
    const u = await callInsforge(`/api/database/records/subscriptions?${buildQuery({ id: ownerSub.id })}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ data }),
    });
    if (!u.ok) return Response.json({ error: "Could not update family plan" }, { status: 502 });
    await auditLog(req, caller.username, "grantScans", p.user_id, `Added ${n} scans to family member (owner pack: ${rem} remaining)`);
    try { await unrufld.asServiceRole.entities.Notification.create({ user_id: p.user_id, title: "You were gifted scans! 🎁", message: `An admin added ${n} scan${n === 1 ? "" : "s"} to your account. They're available on your next scan.`, type: "gift", read: false }); } catch {}
    return Response.json({ ok: true, added: n, context: "linked_member", pack_scans_remaining: rem });
  }

  // 2) Own subscription.
  const own = findOwnSub(subs, p.user_id);
  if (own) {
    const plan = own.plan || own.data?.plan;
    const isFamily = plan === "family_15" || plan === "family_pro";
    if (isFamily) {
      // Family owner → add to their own pack pool.
      const data = { ...(own.data || {}) };
      const total = Math.max(0, Number(data.pack_scans_total) || 0) + n;
      const rem = Math.max(0, Number(data.pack_scans_remaining) || 0) + n;
      data.pack_scans_total = total;
      data.pack_scans_remaining = rem;
      const u = await callInsforge(`/api/database/records/subscriptions?${buildQuery({ id: own.id })}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ data }),
      });
      if (!u.ok) return Response.json({ error: "Could not update family plan" }, { status: 502 });
      await auditLog(req, caller.username, "grantScans", p.user_id, `Added ${n} scans to family owner (pack: ${rem} remaining)`);
      try { await unrufld.asServiceRole.entities.Notification.create({ user_id: p.user_id, title: "You were gifted scans! 🎁", message: `An admin added ${n} scan${n === 1 ? "" : "s"} to your account. They're available on your next scan.`, type: "gift", read: false }); } catch {}
      return Response.json({ ok: true, added: n, context: "family_owner", pack_scans_remaining: rem });
    }
    // Solo (free / pack / pro) → bump scansLimit (existing behaviour).
    const newLimit = (Number(own.scansLimit) || 0) + n;
    const u = await callInsforge(`/api/database/records/subscriptions?${buildQuery({ id: own.id })}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ scansLimit: newLimit }),
    });
    if (!u.ok) return Response.json({ error: "Could not update subscription" }, { status: 502 });
    await auditLog(req, caller.username, "grantScans", p.user_id, `Added ${n} scans (new limit: ${newLimit})`);
    try { await unrufld.asServiceRole.entities.Notification.create({ user_id: p.user_id, title: "You were gifted scans! 🎁", message: `An admin added ${n} scan${n === 1 ? "" : "s"} to your account. Your new scan limit is ${newLimit}.`, type: "gift", read: false }); } catch {}
    return Response.json({ ok: true, scans_limit: newLimit, added: n, context: "solo" });
  }

  // 3) No subscription row yet → create a free one so the counter persists.
  const ins = await callInsforge(`/api/database/records/subscriptions`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{ userId: p.user_id, plan: "free", status: "active", scansUsed: 0, scansLimit: 5 + n, data: {} }]),
  });
  if (!ins.ok) return Response.json({ error: "Could not create subscription" }, { status: 502 });
  await auditLog(req, caller.username, "grantScans", p.user_id, `Added ${n} scans (new limit: ${5 + n})`);
  try { await unrufld.asServiceRole.entities.Notification.create({ user_id: p.user_id, title: "You were gifted scans! 🎁", message: `An admin added ${n} scan${n === 1 ? "" : "s"} to your account. Your new scan limit is ${5 + n}.`, type: "gift", read: false }); } catch {}
  return Response.json({ ok: true, scans_limit: 5 + n, added: n, context: "solo" });
}

// Recent admin activity (audit trail) — every admin edit, status change, and
// admin-management action is recorded and viewable in the dashboard.
async function listAuditLog(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await ensureAuditTable();
  const r = await callInsforge(
    `/api/database/records/${AUDIT_LOG_TABLE}?${buildQuery({}, { order: { column: "timestamp", ascending: false }, limit: 300 })}`
  );
  let entries = r.ok && Array.isArray(r.data) ? r.data : [];
  // Resolve target user IDs to readable names/emails so the log is
  // understandable to anyone — not just raw UUIDs.
  const userActions = new Set(["setUserStatus", "updateUser", "grantScans"]);
  const needsLabel = entries.some((e) => userActions.has(e.action));
  if (needsLabel) {
    const labelMap = {};
    try {
      const unrufld = createClientFromRequest(req);
      const allUsers = await unrufld.asServiceRole.entities.User.list("-created_date", 10000);
      for (const u of allUsers || []) if (u && u.id) labelMap[u.id] = u.full_name || u.email || u.id;
    } catch {}
    entries = entries.map((e) => ({
      ...e,
      target_label: userActions.has(e.action) ? (labelMap[e.target] || e.target) : e.target,
    }));
  } else {
    entries = entries.map((e) => ({ ...e, target_label: e.target }));
  }
  return Response.json({ entries, callerRole: caller.role });
}

// Keep the portable identity mirror in sync when an admin edits a user's
// profile, so the edited fields aren't shadowed by a stale mirror copy.
async function syncUserMirrorFields(userId, fields) {
  try {
    const r = await callInsforge(`/api/database/records/users?${buildQuery({ userId }, { limit: 1 })}`);
    const row = r.ok && Array.isArray(r.data) ? r.data[0] : null;
    if (!row) return;
    const data = { ...(row.data || {}) };
    const values = {};
    for (const [k, v] of Object.entries(fields)) {
      if (k === "full_name") values.fullName = v;
      else if (k === "email") values.email = v;
      else data[k] = v;
    }
    values.data = data;
    await callInsforge(`/api/database/records/users?${buildQuery({ id: row.id })}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(values),
    });
  } catch {}
}

// Real-time scan monitoring: scans created in the last 5 minutes that are still
// in the "analyzing" state (the user uploaded a photo and the AI is working).
// A scan record is created with status "analyzing" the moment the photo is
// uploaded, then updated to "completed" with the result — so this list
// reflects who is mid-scan right now.
async function liveScans(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const r = await callInsforge(
    `/api/database/records/scans?${buildQuery({}, { order: { column: "created_at", ascending: false }, limit: 200 })}`
  );
  const rows = r.ok && Array.isArray(r.data) ? r.data : [];
  const live = rows.filter((row) => {
    const status = (row.data && row.data.status) || row.status;
    const created = row.created_at;
    return status === "analyzing" && created && new Date(created) >= new Date(cutoff);
  });

  // Resolve user labels (name/email) for each live scan.
  let labelMap = {};
  try {
    const unrufld = createClientFromRequest(req);
    const allUsers = await unrufld.asServiceRole.entities.User.list("-created_date", 10000);
    for (const u of allUsers || []) if (u && u.id) labelMap[u.id] = { email: u.email, name: u.full_name };
  } catch {}

  const out = live.map((row) => {
    const uid = row.userId;
    const label = labelMap[uid] || {};
    const createdMs = new Date(row.created_at).getTime();
    return {
      scan_id: row.id,
      user_id: uid,
      // Redact the live scanner's email for viewers (consistent with listUsers
      // PII redaction — a viewer must not see who is scanning, only that a
      // scan is in progress).
      email: caller.role === "viewer" ? null : (label.email || row.patientEmail || (row.data && row.data.patient_email) || null),
      name: label.name || null,
      position: row.capturePosition || (row.data && row.data.capture_position) || null,
      started_at: row.created_at,
      seconds_ago: Number.isFinite(createdMs) ? Math.max(0, Math.round((Date.now() - createdMs) / 1000)) : 0,
    };
  });
  return Response.json({ live: out, count: out.length });
}

// Feature flags — admin-controlled overrides for the clinical feature registry.
// A super_admin can push a dormant feature to "live" (or revert) without a code
// deploy; the app reads these overrides to decide what runs.
async function listFeatureFlags(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await selectFeatureFlags();
  const flags = {};
  for (const r of rows) flags[r.feature_key] = r.status;
  return Response.json({ flags, callerRole: caller.role });
}

async function setFeatureFlag(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (caller.role !== "super_admin") return Response.json({ error: "Only super admins can toggle feature flags" }, { status: 403 });
  const key = String(p.feature_key || "").trim();
  const status = String(p.status || "").toLowerCase();
  if (!key) return Response.json({ error: "feature_key required" }, { status: 400 });
  if (!["live", "dormant"].includes(status)) return Response.json({ error: "status must be live or dormant" }, { status: 400 });
  await upsertFeatureFlag(key, status, caller.username);
  await auditLog(req, caller.username, "setFeatureFlag", key, `Set feature flag to ${status}`);
  return Response.json({ ok: true, feature_key: key, status });
}

// --- hero variant (landing page A/B switch) ---------------------------------
async function getHeroVariant(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const value = await getSiteSetting("hero_variant");
  return Response.json({ heroVariant: value, callerRole: caller.role });
}
async function setHeroVariant(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (caller.role !== "super_admin") return Response.json({ error: "Only super admins can change the hero variant" }, { status: 403 });
  const value = String(p.value || "").trim();
  if (!["classic", "scanInvite", "proofBar"].includes(value)) return Response.json({ error: "Invalid hero variant" }, { status: 400 });
  await upsertSiteSetting("hero_variant", value, caller.username);
  await auditLog(req, caller.username, "setHeroVariant", "hero_variant", `Set hero variant to ${value}`);
  return Response.json({ ok: true, heroVariant: value });
}

// --- user account overview (admin drill-down) -------------------------------
// Returns a single user's full account picture: profile, subscription, scan
// history (with scan_type + scores), progress, and computed scan-credit usage.
// Full scans count as 3 credits, matching the user-facing deduction.
async function userOverview(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!p.user_id) return Response.json({ error: "user_id required" }, { status: 400 });

  const unrufld = createClientFromRequest(req);

  // Profile (Base44 User entity — authoritative identity source).
  let profile = null;
  try {
    profile = await unrufld.asServiceRole.entities.User.get(p.user_id);
  } catch {}

  // Subscription + scans + progress from InsForge (direct service-token reads).
  const [subRes, scansRes, progRes] = await Promise.all([
    callInsforge(`/api/database/records/subscriptions?${buildQuery({ userId: p.user_id }, { limit: 1 })}`),
    callInsforge(`/api/database/records/scans?${buildQuery({ userId: p.user_id }, { order: { column: "created_at", ascending: false }, limit: 200 })}`),
    callInsforge(`/api/database/records/user_progress?${buildQuery({ userId: p.user_id }, { limit: 1 })}`),
  ]);

  const subRow = subRes.ok && Array.isArray(subRes.data) ? subRes.data[0] : null;
  const scanRows = scansRes.ok && Array.isArray(scansRes.data) ? scansRes.data : [];
  const progRow = progRes.ok && Array.isArray(progRes.data) ? progRes.data[0] : null;

  // Weighted scan-credit usage (full = 3, quick = 1).
  let creditsUsed = 0;
  const scanHistory = scanRows.map((s) => {
    const d = s.data || {};
    const isFull = d.scan_type === "full";
    creditsUsed += isFull ? 3 : 1;
    return {
      id: s.id,
      created_at: s.created_at,
      scan_type: d.scan_type || "quick",
      capture_position: d.capture_position || s.capturePosition || null,
      score: d.score ?? null,
      shade: d.shade ?? null,
      dental_health_score: d.dental_health_score ?? null,
      gum_health: d.gum_health ?? null,
      status: d.status || "completed",
      image_url: d.image_url || null,
    };
  });

  const subData = subRow?.data || {};
  const purchases = Array.isArray(subData.purchases) ? subData.purchases : [];

  return Response.json({
    profile: profile ? {
      id: profile.id,
      // Redact PII for viewer role — listUsers already redacts email/phone for
      // viewers; without this, a viewer could drill into any user via
      // userOverview and read the same PII, bypassing the listUsers redaction.
      email: caller.role === "viewer" ? null : profile.email,
      full_name: profile.full_name || null,
      display_name: profile.display_name || null,
      username: profile.username || null,
      first_name: profile.first_name || null,
      last_name: profile.last_name || null,
      phone_number: caller.role === "viewer" ? null : (profile.phone_number || null),
      how_found: profile.how_found || null,
      role: profile.role || "user",
      account_status: profile.account_status || "active",
      created_date: profile.created_date || null,
      wears_appliance: profile.wears_appliance || false,
      appliance_type: profile.appliance_type || null,
    } : null,
    subscription: subRow ? {
      plan: subRow.plan || subData.plan || "free",
      status: subRow.status || subData.status || "active",
      scans_used: subRow.scansUsed ?? subData.scans_used ?? 0,
      scans_limit: subRow.scansLimit ?? subData.scans_limit ?? 5,
      started_date: subData.started_date || null,
      renewal_date: subData.renewal_date || null,
      members: Array.isArray(subData.members) ? subData.members : [],
      purchases,
    } : null,
    progress: progRow ? {
      mmr: progRow.mmr ?? (progRow.data && progRow.data.mmr) ?? 0,
      peak_mmr: progRow.peakMmr ?? (progRow.data && progRow.data.peak_mmr) ?? 0,
      peak_rank: progRow.peakRank ?? (progRow.data && progRow.data.peak_rank) ?? null,
      season_xp: progRow.seasonXp ?? (progRow.data && progRow.data.season_xp) ?? 0,
      total_xp: progRow.totalXp ?? (progRow.data && progRow.data.total_xp) ?? 0,
      rewards_earned: progRow.data?.rewards_earned || [],
      milestones_earned: progRow.data?.milestones_earned || [],
      last_scan_date: progRow.data?.last_scan_date || null,
    } : null,
    scans: scanHistory,
    scan_count: scanRows.length,
    credits_used: creditsUsed,
    callerRole: caller.role,
  });
}

// --- orphaned photo investigation + linking --------------------------------
// Lists every object in the teeth-scans bucket and finds any that aren't
// referenced by a scan record. Instead of deleting them, this tries to LINK
// each orphan to the scan it came from (matched by timestamp proximity) and
// reports the rest as true orphans (from deleted/failed scans). This fixes the
// 56-photos-vs-42-scans gap without losing any data.
async function linkOrphanedPhotos(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const BUCKET = "teeth-scans";
  const bucketPath = `/api/storage/buckets/${BUCKET}`;

  // 1. Gather every scan record and build a set of all referenced photo URLs.
  const scanRes = await callInsforge(`/api/database/records/scans?${buildQuery({}, { limit: 10000 })}`);
  const scanRows = scanRes.ok && Array.isArray(scanRes.data) ? scanRes.data : [];
  const referenced = new Set();
  for (const s of scanRows) {
    const d = s.data || {};
    if (d.image_url) referenced.add(d.image_url);
    if (Array.isArray(d.image_urls)) for (const u of d.image_urls) if (u) referenced.add(u);
  }

  // 2. List all objects in the bucket (paginate — 1000 per page).
  const allObjects = [];
  let offset = 0;
  for (let page = 0; page < 50; page++) {
    const qs = new URLSearchParams();
    qs.set("limit", "1000");
    qs.set("offset", String(offset));
    const r = await callInsforge(`${bucketPath}/objects?${qs.toString()}`);
    if (!r.ok || !Array.isArray(r.data)) break;
    const items = r.data;
    allObjects.push(...items);
    if (items.length < 1000) break;
    offset += 1000;
  }

  // 3. For each unreferenced object, try to match it to a scan by timestamp.
  //    The photo key contains a millisecond timestamp: u/{userId}/{ts}-{rand}.jpg
  //    The scan record has created_at. If they're within 10 minutes, link them.
  const linked = [];
  const trueOrphans = [];

  for (const obj of allObjects) {
    const key = obj.key || obj.name;
    if (!key) continue;
    const url = `${INSFORGE_BASE_URL}${bucketPath}/objects/${encodeURIComponent(key)}`;
    if (referenced.has(url)) continue; // already linked to a scan

    // Extract the photo timestamp from the key.
    const filename = key.split("/").pop() || "";
    const tsMatch = filename.match(/^(\d{10,})-/);
    const photoTs = tsMatch ? parseInt(tsMatch[1], 10) : null;

    // Find the closest scan by created_at.
    let bestScan = null;
    let bestDiff = Infinity;
    if (photoTs) {
      for (const s of scanRows) {
        const scanTs = new Date(s.created_at).getTime();
        if (!Number.isFinite(scanTs)) continue;
        const diff = Math.abs(scanTs - photoTs);
        if (diff < bestDiff) { bestDiff = diff; bestScan = s; }
      }
    }

    // Link if within 10 minutes — the photo almost certainly belongs to this scan.
    if (bestScan && bestDiff < 10 * 60 * 1000) {
      const d = bestScan.data || {};
      let imageUrls = Array.isArray(d.image_urls) ? [...d.image_urls] : [];
      if (d.image_url && !imageUrls.includes(d.image_url)) imageUrls.unshift(d.image_url);
      if (!imageUrls.includes(url)) imageUrls.push(url);

      const mergedData = { ...d, image_urls: imageUrls };
      if (!d.image_url) mergedData.image_url = url;

      try {
        await callInsforge(
          `/api/database/records/scans?${buildQuery({ id: bestScan.id })}`,
          {
            method: "PATCH",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify({ data: mergedData }),
          }
        );
        linked.push({ key, scan_id: bestScan.id, time_diff_seconds: Math.round(bestDiff / 1000) });
      } catch {
        trueOrphans.push({ key, size: obj.size ?? null, created_at: obj.created_at || obj.createdAt || null, reason: "link_failed" });
      }
    } else {
      // No scan within 10 minutes — this photo is from a deleted or failed scan.
      trueOrphans.push({
        key,
        size: obj.size ?? null,
        created_at: obj.created_at || obj.createdAt || null,
        photo_timestamp: photoTs ? new Date(photoTs).toISOString() : null,
        closest_scan_id: bestScan?.id || null,
        closest_scan_diff_seconds: bestDiff === Infinity ? null : Math.round(bestDiff / 1000),
        reason: bestScan ? "no_scan_within_10min" : "no_timestamp_in_key",
      });
    }
  }

  await auditLog(req, caller.username, "linkOrphanedPhotos", BUCKET, `Linked ${linked.length} photos to scans, ${trueOrphans.length} true orphans (from deleted/failed scans)`);

  return Response.json({
    total_objects: allObjects.length,
    referenced_count: referenced.size,
    orphans_found: linked.length + trueOrphans.length,
    linked: linked.length,
    linked_details: linked,
    true_orphans: trueOrphans.length,
    true_orphan_details: trueOrphans,
  });
}

// --- site visitor analytics (live + traffic) -------------------------------
// The site_visitors table is populated by the public visitorStats function
// (heartbeats from every page). Here we read it for the admin dashboard.
async function ensureVisitorsTable() {
  if (visitorsTableEnsured) return;
  // Set the flag AFTER the table is created, not before — if creation fails,
  // a premature flag would prevent any retry, leaving the table missing and
  // every liveVisitors / visitorTraffic query silently returning 0.
  await ensureRateLimitTable(VISITORS_TABLE, [
    { columnName: "session_id", type: "string", isUnique: true, isNullable: false },
    { columnName: "path", type: "string", isUnique: false, isNullable: false },
    { columnName: "ip_address", type: "string", isUnique: false, isNullable: true },
    { columnName: "first_seen", type: "string", isUnique: false, isNullable: false },
    { columnName: "last_seen", type: "string", isUnique: false, isNullable: false },
  ]);
  visitorsTableEnsured = true;
}

async function liveVisitors(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await ensureVisitorsTable();
  // Active = sessions with a heartbeat in the last 3 minutes.
  const cutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  const r = await callInsforge(`/api/database/records/${VISITORS_TABLE}?${buildQuery({ last_seen: { gte: cutoff } }, { limit: 10000 })}`);
  if (!r.ok) return Response.json({ error: "Visitor query failed" }, { status: 502 });
  const active = Array.isArray(r.data) ? r.data.length : 0;
  return Response.json({ active, callerRole: caller.role });
}

async function visitorTraffic(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await ensureVisitorsTable();
  const r = await callInsforge(`/api/database/records/${VISITORS_TABLE}?${buildQuery({}, { limit: 10000 })}`);
  if (!r.ok) return Response.json({ error: "Traffic query failed" }, { status: 502 });
  const sessions = Array.isArray(r.data) ? r.data : [];
  // Aggregate unique sessions by day for the last 30 days.
  const byDay = {};
  for (const s of sessions) {
    const day = (s.first_seen || s.last_seen || "").slice(0, 10);
    if (day) byDay[day] = (byDay[day] || 0) + 1;
  }
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days.push({ date: d, visitors: byDay[d] || 0 });
  }
  return Response.json({ traffic: days, callerRole: caller.role });
}

// --- TOTP 2FA enrollment + management --------------------------------------
// enrollTotp: generates a new secret (not yet enabled), returns it + the
// otpauth:// URL for QR-code enrollment. The admin enters it into their
// authenticator app, then calls confirmTotp with a live code to activate.
async function enrollTotp(p, req) {
  // Accept either a regular admin token (enrollment from the security panel)
  // or an enrollment token (enforced enrollment at login).
  const caller = await resolveCaller(p) || await resolveEnrollmentCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // REUSE a pending enrollment secret instead of generating a new one every
  // call. Without this, every login attempt during the enrollment flow
  // generates a fresh secret — the user's authenticator app still has the
  // old one, so the code never matches. Only generate a new secret when:
  //   - there's no existing row (first enrollment), or
  //   - the existing row is already enabled (re-enrollment from the security
  //     panel, where the admin intentionally wants a new secret).
  const existing = await selectTotp(caller.username);
  let secret;
  if (existing && !existing.enabled && existing.secret_b32) {
    secret = existing.secret_b32;
  } else {
    secret = base32Encode(crypto.getRandomValues(new Uint8Array(20)));
    await upsertTotp(caller.username, secret, false);
    await auditLog(req, caller.username, "enrollTotp", "self", "Started 2FA enrollment");
  }
  const label = encodeURIComponent(`teewai:${caller.username}`);
  const issuer = encodeURIComponent("teewai");
  const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  return Response.json({ secret, otpauth_url: otpauthUrl, enabled: false });
}

// confirmTotp: verifies a live code against the stored (pending) secret and
// enables 2FA for the caller's account.
async function confirmTotp(p, req) {
  // Accept either a regular admin token or an enrollment token.
  let caller = await resolveCaller(p);
  let isEnrollmentFlow = false;
  if (!caller) {
    caller = await resolveEnrollmentCaller(p);
    if (caller) isEnrollmentFlow = true;
  }
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!p.totp_code) return Response.json({ error: "totp_code required" }, { status: 400 });
  const row = await selectTotp(caller.username);
  if (!row) return Response.json({ error: "No pending enrollment. Call enrollTotp first." }, { status: 400 });
  const valid = await verifyTotp(row.secret_b32, p.totp_code);
  if (!valid) return Response.json({ error: "Invalid verification code" }, { status: 401 });
  await upsertTotp(caller.username, row.secret_b32, true);
  await auditLog(req, caller.username, "enableTotp", "self", isEnrollmentFlow ? "2FA enabled (enforced at login)" : "2FA enabled");
  // In the enrollment flow, 2FA is now active — issue the real admin session
  // token so the user can proceed into the dashboard without re-logging in.
  if (isEnrollmentFlow) {
    const admins = await selectAdmins({}, { limit: 1000 });
    const roleMap = await getRoleMap();
    const role = defaultRole(caller.username, admins, roleMap);
    const token = await signToken(caller.username);
    return Response.json({ ok: true, enabled: true, token, username: caller.username, role });
  }
  return Response.json({ ok: true, enabled: true });
}

// disableTotp: removes 2FA. A super_admin can disable it for any admin (e.g.
// if they lose their device); other admins can only disable their own.
async function disableTotp(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const target = p.username || caller.username;
  if (target !== caller.username && caller.role !== "super_admin") {
    return Response.json({ error: "Only super admins can disable 2FA for other admins" }, { status: 403 });
  }
  await deleteTotp(target);
  await auditLog(req, caller.username, "disableTotp", target, "2FA disabled");
  return Response.json({ ok: true });
}

// getTotpStatus: returns whether 2FA is enabled for the caller.
async function getTotpStatus(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const row = await selectTotp(caller.username);
  return Response.json({ enabled: !!(row && row.enabled), pending: !!(row && !row.enabled) });
}

// --- IP allowlist ops -------------------------------------------------------
async function getIpAllowlistOp(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const list = await getIpAllowlist();
  return Response.json({ allowlist: list, callerRole: caller.role });
}

async function setIpAllowlistOp(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (caller.role !== "super_admin") return Response.json({ error: "Only super admins can set the IP allowlist" }, { status: 403 });
  const raw = String(p.allowlist || "").trim();
  // Allow up to 50 entries; each max 45 chars (IPv6 + CIDR).
  const entries = raw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean).slice(0, 50);
  await ensureSiteSettingsTable();
  await upsertSiteSetting("admin_ip_allowlist", entries.join(","), caller.username);
  await auditLog(req, caller.username, "setIpAllowlist", "admin_ip_allowlist", `Set ${entries.length} IP rule(s)`);
  return Response.json({ ok: true, allowlist: entries });
}

// --- photo × scan audit (investigation table) ------------------------------
// Read-only cross-reference of every storage object against every scan and
// stain-log record, so the admin can SEE which photos are linked to which
// records and which are unlinked orphans (from deleted/failed scans). Unlike
// linkOrphanedPhotos (which mutates), this only reports — the admin decides
// what to clean up. Covers both the teeth-scans and food-scans buckets.
async function listBucketObjects(bucket: string) {
  const all: any[] = [];
  let offset = 0;
  for (let page = 0; page < 50; page++) {
    const qs = new URLSearchParams();
    qs.set("limit", "1000");
    qs.set("offset", String(offset));
    const r = await callInsforge(`/api/storage/buckets/${bucket}/objects?${qs.toString()}`);
    if (!r.ok || !Array.isArray(r.data)) break;
    const items = r.data;
    all.push(...items);
    if (items.length < 1000) break;
    offset += 1000;
  }
  return all;
}

async function photoScanAudit(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [scanRes, logRes, teethObjs, foodObjs] = await Promise.all([
    callInsforge(`/api/database/records/scans?${buildQuery({}, { limit: 10000 })}`),
    callInsforge(`/api/database/records/stain_logs?${buildQuery({}, { limit: 10000 })}`),
    listBucketObjects("teeth-scans"),
    listBucketObjects("food-scans"),
  ]);

  const scans = scanRes.ok && Array.isArray(scanRes.data) ? scanRes.data : [];
  const logs = logRes.ok && Array.isArray(logRes.data) ? logRes.data : [];

  // Build scan rows with their photo URLs + extracted keys.
  const scanRows = scans.map((s) => {
    const d = s.data || {};
    const urls = [];
    if (d.image_url) urls.push(d.image_url);
    if (Array.isArray(d.image_urls)) for (const u of d.image_urls) if (u) urls.push(u);
    const keys = urls.map((u) => extractStorageKey(u)).filter(Boolean);
    return {
      id: s.id,
      user_id: s.userId || null,
      created_at: s.created_at,
      scan_type: d.scan_type || "quick",
      status: d.status || "completed",
      score: d.score ?? null,
      photo_count: urls.length,
      photo_keys: keys,
    };
  });

  // Build stain_log rows that have a photo.
  const logRows = logs
    .map((l) => {
      const d = l.data || {};
      const url = d.image_url || null;
      if (!url) return null;
      return {
        id: l.id,
        user_id: l.userId || null,
        item_name: d.item_name || l.itemName || null,
        created_at: l.created_at,
        photo_key: extractStorageKey(url),
        is_insforge: /\/api\/storage\/buckets\//.test(url),
      };
    })
    .filter(Boolean);

  // Set of all referenced photo keys (decoded storage keys).
  const refKeys = new Set();
  for (const s of scanRows) for (const k of s.photo_keys) refKeys.add(k);
  for (const l of logRows) if (l.photo_key) refKeys.add(l.photo_key);

  // Bucket objects → photo rows with linked status.
  const buildPhotoRows = (bucket, objs) => objs.map((obj) => {
    const key = obj.key || obj.name;
    return {
      bucket,
      key,
      size: obj.size ?? null,
      created_at: obj.created_at || obj.createdAt || null,
      linked: refKeys.has(key),
    };
  });

  const teethPhotos = buildPhotoRows("teeth-scans", teethObjs);
  const foodPhotosList = buildPhotoRows("food-scans", foodObjs);
  const allPhotos = [...teethPhotos, ...foodPhotosList];
  const unlinked = allPhotos.filter((ph) => !ph.linked);

  // Resolve user labels (email) for scans + logs so the table is readable.
  const labelMap = {};
  try {
    const unrufld = createClientFromRequest(req);
    const allUsers = await unrufld.asServiceRole.entities.User.list("-created_date", 10000);
    for (const u of allUsers || []) if (u && u.id) labelMap[u.id] = u.email || u.full_name || u.id;
  } catch {}
  const label = (uid) => caller.role === "viewer" ? null : (labelMap[uid] || uid || null);
  for (const s of scanRows) s.user_label = label(s.user_id);
  for (const l of logRows) l.user_label = label(l.user_id);

  return Response.json({
    scans: scanRows,
    food_logs: logRows,
    photos: allPhotos,
    unlinked,
    totals: {
      scans: scanRows.length,
      food_logs: logRows.length,
      photos: allPhotos.length,
      linked: allPhotos.length - unlinked.length,
      unlinked: unlinked.length,
    },
    callerRole: caller.role,
  });
}

// Admin-only photo viewer: returns base64 data URLs for any object in the
// private teeth-scans / food-scans buckets. The admin token authorizes access
// (no per-user ownership check), so the audit table can render thumbnails of
// every user's photos + orphan objects. Accepts a batch so a whole scan's
// photos (or all unlinked orphans) resolve in one call.
async function viewPhotos(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const photos = Array.isArray(p.photos) ? p.photos : [];
  const dataUrls: Record<string, string> = {};
  await Promise.all(photos.map(async (ph: any) => {
    try {
      const bucket = ph.bucket, key = ph.key;
      if (!ADMIN_PHOTO_BUCKETS.has(bucket) || !key) return;
      const binHeaders = authHeaders();
      delete binHeaders["Content-Type"];
      const res = await fetch(
        `${INSFORGE_BASE_URL}/api/storage/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(key)}`,
        { headers: { ...binHeaders, Accept: "*/*", "User-Agent": "Mozilla/5.0 teewai" } }
      );
      if (!res.ok) return;
      const ct = (res.headers.get("content-type") || "").split(";")[0].trim() || "image/jpeg";
      if (ct && !ct.startsWith("image/") && ct !== "application/octet-stream") return;
      const buf = await res.arrayBuffer();
      dataUrls[`${bucket}:${key}`] = `data:${ct};base64,${bufToB64(buf)}`;
    } catch {}
  }));
  return Response.json({ dataUrls });
}

// --- admin privileges (per-admin override of the tier preset) ---------------
const ADMIN_PRIVILEGES_TABLE = "admin_privileges";
let adminPrivTableEnsured = false;
async function ensureAdminPrivilegesTable() {
  if (adminPrivTableEnsured) return;
  adminPrivTableEnsured = true;
  await ensureRateLimitTable(ADMIN_PRIVILEGES_TABLE, [
    { columnName: "username", type: "string", isUnique: true, isNullable: false },
    { columnName: "privileges", type: "string", isUnique: false, isNullable: false },
  ]);
}
async function selectAdminPrivileges() {
  await ensureAdminPrivilegesTable();
  const r = await callInsforge(`/api/database/records/${ADMIN_PRIVILEGES_TABLE}?${buildQuery({}, { limit: 1000 })}`);
  return r.ok && Array.isArray(r.data) ? r.data : [];
}
async function upsertAdminPrivileges(username, privilegesJson) {
  await ensureAdminPrivilegesTable();
  const existing = await callInsforge(`/api/database/records/${ADMIN_PRIVILEGES_TABLE}?${buildQuery({ username })}`);
  if (existing.ok && Array.isArray(existing.data) && existing.data.length) {
    return callInsforge(`/api/database/records/${ADMIN_PRIVILEGES_TABLE}?${buildQuery({ username })}`, {
      method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ privileges: privilegesJson }),
    });
  }
  return callInsforge(`/api/database/records/${ADMIN_PRIVILEGES_TABLE}`, {
    method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify([{ username, privileges: privilegesJson }]),
  });
}
// Effective privileges for a caller: super_admin always gets everything;
// otherwise a stored override wins, falling back to the tier preset.
async function resolveCallerPrivileges(caller) {
  if (!caller) return [];
  if (caller.role === "super_admin") return tierPrivileges("super_admin");
  const rows = await selectAdminPrivileges();
  const row = rows.find((r) => r.username === caller.username);
  let stored = null;
  if (row && row.privileges) { try { stored = JSON.parse(row.privileges); } catch {} }
  return effectivePrivileges(caller.role, stored);
}

// --- medical verification review (medical_admin + super_admin) --------------
async function listMedicalVerificationsOp(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const privs = await resolveCallerPrivileges(caller);
  if (!hasPrivilege(privs, "review_medical_verifications")) {
    return Response.json({ error: "You don't have permission to review medical verifications" }, { status: 403 });
  }
  const unrufld = createClientFromRequest(req);
  const verifications = await unrufld.asServiceRole.entities.MedicalVerification.list("-created_date", 200);
  return Response.json({ verifications: verifications || [], callerRole: caller.role });
}
async function reviewMedicalVerificationOp(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const privs = await resolveCallerPrivileges(caller);
  if (!hasPrivilege(privs, "review_medical_verifications")) {
    return Response.json({ error: "You don't have permission to review medical verifications" }, { status: 403 });
  }
  const { verification_id, status, review_notes } = p;
  if (!verification_id) return Response.json({ error: "verification_id required" }, { status: 400 });
  if (!["approved", "rejected"].includes(status)) return Response.json({ error: "status must be approved or rejected" }, { status: 400 });
  const unrufld = createClientFromRequest(req);
  const v = await unrufld.asServiceRole.entities.MedicalVerification.get(verification_id).catch(() => null);
  if (!v) return Response.json({ error: "Verification not found" }, { status: 404 });
  await unrufld.asServiceRole.entities.MedicalVerification.update(verification_id, {
    status, reviewed_by: caller.username, review_notes: review_notes || "", reviewed_date: new Date().toISOString(),
  });
  if (status === "approved" && v.user_id) {
    const professionLabel = v.profession === "other" ? (v.profession_other || "clinician") : v.profession;
    await unrufld.asServiceRole.entities.User.update(v.user_id, {
      is_verified_medical: true,
      medical_profession: professionLabel,
      medical_verification_id: verification_id,
    });
  }
  // Notify the applicant by email (official Gmail) + in-app notification.
  try {
    await sendUserEmail(unrufld, v.email, `Your teewai verification — ${status === "approved" ? "approved" : "not approved"}`, verificationDecisionHtml(v.full_name, "medical professional verification", status, review_notes, "https://teewai.app"), "teewai");
  } catch {}
  try {
    if (v.user_id) await unrufld.asServiceRole.entities.Notification.create({ user_id: v.user_id, title: status === "approved" ? "Verification approved" : "Verification not approved", message: status === "approved" ? "Your medical professional verification was approved — your verified badge is live." : `Your medical verification wasn't approved.${review_notes ? ` ${review_notes}` : ""} You can re-apply from your profile.`, type: status === "approved" ? "info" : "warning", read: false });
  } catch {}
  await auditLog(req, caller.username, "reviewMedicalVerification", verification_id, `${status}${review_notes ? `: ${review_notes}` : ""}`);
  return Response.json({ ok: true, status });
}

// --- flagged / disputed message review (medical_admin + super_admin) --------
async function listFlaggedMessagesOp(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const privs = await resolveCallerPrivileges(caller);
  if (!hasPrivilege(privs, "review_medical_advice")) {
    return Response.json({ error: "You don't have permission to review flagged messages" }, { status: 403 });
  }
  const unrufld = createClientFromRequest(req);
  const all = await unrufld.asServiceRole.entities.DiscussionMessage.list("-created_date", 500);
  const messages = (all || []).filter((m) => m.flag_status === "flagged" || m.flag_status === "disputed");
  return Response.json({ messages, callerRole: caller.role });
}
async function reviewFlagOp(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const privs = await resolveCallerPrivileges(caller);
  if (!hasPrivilege(privs, "review_medical_advice")) {
    return Response.json({ error: "You don't have permission to review flagged messages" }, { status: 403 });
  }
  const { message_id, decision } = p;
  if (!message_id) return Response.json({ error: "message_id required" }, { status: 400 });
  if (!["kept", "removed"].includes(decision)) return Response.json({ error: "decision must be kept or removed" }, { status: 400 });
  const unrufld = createClientFromRequest(req);
  const flag_status = decision === "kept" ? "resolved_kept" : "resolved_removed";
  const dispute_status = decision === "kept" ? "upheld" : "dismissed";
  await unrufld.asServiceRole.entities.DiscussionMessage.update(message_id, {
    flag_status, dispute_status, reviewed_by: caller.username,
  });
  await auditLog(req, caller.username, "reviewFlag", message_id, decision);
  return Response.json({ ok: true, flag_status });
}

// --- admin privilege management (super_admin only) --------------------------
async function listAdminPrivilegesOp(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await selectAdminPrivileges();
  const privileges = {};
  for (const r of rows) { try { privileges[r.username] = JSON.parse(r.privileges); } catch {} }
  return Response.json({ privileges, callerRole: caller.role });
}
async function setAdminPrivilegesOp(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (caller.role !== "super_admin") return Response.json({ error: "Only super admins can set admin privileges" }, { status: 403 });
  if (!p.username) return Response.json({ error: "username required" }, { status: 400 });
  const privs = Array.isArray(p.privileges) ? p.privileges.filter((x) => typeof x === "string") : [];
  await upsertAdminPrivileges(p.username, JSON.stringify(privs));
  await auditLog(req, caller.username, "setAdminPrivileges", p.username, `Privileges: ${privs.join(", ") || "none"}`);
  return Response.json({ ok: true, username: p.username, privileges: privs });
}

// --- guest IP ban management (admin + super_admin with manage_ip_bans) ------
async function listGuestIpsOp(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const privs = await resolveCallerPrivileges(caller);
  if (!hasPrivilege(privs, "manage_ip_bans")) {
    return Response.json({ error: "You don't have permission to manage IP bans" }, { status: 403 });
  }
  const unrufld = createClientFromRequest(req);
  const ips = await unrufld.asServiceRole.entities.GuestIp.list("-updated_date", 500);
  return Response.json({ ips: ips || [], callerRole: caller.role });
}
async function banGuestIpOp(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const privs = await resolveCallerPrivileges(caller);
  if (!hasPrivilege(privs, "manage_ip_bans")) {
    return Response.json({ error: "You don't have permission to manage IP bans" }, { status: 403 });
  }
  const { ip_id, reason } = p;
  if (!ip_id) return Response.json({ error: "ip_id required" }, { status: 400 });
  const unrufld = createClientFromRequest(req);
  const updated = await unrufld.asServiceRole.entities.GuestIp.update(ip_id, {
    banned: true, banned_by: caller.username, banned_reason: reason || "", banned_date: new Date().toISOString(),
  });
  await auditLog(req, caller.username, "banGuestIp", ip_id, reason || "");
  return Response.json({ ok: true, ip: updated });
}
async function unbanGuestIpOp(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const privs = await resolveCallerPrivileges(caller);
  if (!hasPrivilege(privs, "manage_ip_bans")) {
    return Response.json({ error: "You don't have permission to manage IP bans" }, { status: 403 });
  }
  const { ip_id } = p;
  if (!ip_id) return Response.json({ error: "ip_id required" }, { status: 400 });
  const unrufld = createClientFromRequest(req);
  const updated = await unrufld.asServiceRole.entities.GuestIp.update(ip_id, {
    banned: false, banned_reason: "",
  });
  await auditLog(req, caller.username, "unbanGuestIp", ip_id, "");
  return Response.json({ ok: true, ip: updated });
}

// --- blog submission + author verification review (content_admin + super_admin) -
async function listBlogSubmissionsOp(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const privs = await resolveCallerPrivileges(caller);
  if (!hasPrivilege(privs, "review_blogs")) {
    return Response.json({ error: "You don't have permission to review blogs" }, { status: 403 });
  }
  const unrufld = createClientFromRequest(req);
  const submissions = await unrufld.asServiceRole.entities.BlogSubmission.list("-created_date", 500);
  return Response.json({ submissions: submissions || [], callerRole: caller.role });
}
async function reviewBlogSubmissionOp(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const privs = await resolveCallerPrivileges(caller);
  if (!hasPrivilege(privs, "review_blogs")) {
    return Response.json({ error: "You don't have permission to review blogs" }, { status: 403 });
  }
  const { submission_id, status, review_notes } = p;
  if (!submission_id) return Response.json({ error: "submission_id required" }, { status: 400 });
  if (!["approved", "rejected"].includes(status)) return Response.json({ error: "status must be approved or rejected" }, { status: 400 });
  const unrufld = createClientFromRequest(req);
  const sub = await unrufld.asServiceRole.entities.BlogSubmission.get(submission_id).catch(() => null);
  if (!sub) return Response.json({ error: "Submission not found" }, { status: 404 });
  // Super-admin override: only super_admin can re-approve a previously declined post.
  if (sub.status === "rejected" && status === "approved" && caller.role !== "super_admin") {
    return Response.json({ error: "Only super admins can override a declined blog" }, { status: 403 });
  }
  await unrufld.asServiceRole.entities.BlogSubmission.update(submission_id, {
    status, reviewer_id: caller.username, review_notes: review_notes || "", reviewed_date: new Date().toISOString(),
  });
  // Notify the author by email (official Gmail) + in-app notification.
  try {
    const author = sub.author_id ? await unrufld.asServiceRole.entities.User.get(sub.author_id).catch(() => null) : null;
    const authorEmail = author?.email;
    const authorName = sub.author_name || author?.full_name || author?.display_name || "there";
    if (authorEmail) await sendUserEmail(unrufld, authorEmail, `Your teewai blog — ${status === "approved" ? "approved" : "declined"}`, verificationDecisionHtml(authorName, "blog post", status, review_notes, "https://teewai.app"), "teewai");
    if (sub.author_id) await unrufld.asServiceRole.entities.Notification.create({ user_id: sub.author_id, title: status === "approved" ? "Blog approved" : "Blog declined", message: status === "approved" ? `Your blog post "${sub.title || ""}" was approved and is now published.` : `Your blog post "${sub.title || ""}" wasn't approved.${review_notes ? ` ${review_notes}` : ""}`, type: status === "approved" ? "info" : "warning", read: false });
  } catch {}
  await auditLog(req, caller.username, "reviewBlogSubmission", submission_id, `${status}${review_notes ? `: ${review_notes}` : ""}`);
  return Response.json({ ok: true, status });
}
async function listBlogVerificationsOp(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const privs = await resolveCallerPrivileges(caller);
  if (!hasPrivilege(privs, "review_blogs")) {
    return Response.json({ error: "You don't have permission to review bloggers" }, { status: 403 });
  }
  const unrufld = createClientFromRequest(req);
  const verifications = await unrufld.asServiceRole.entities.BlogVerification.list("-created_date", 200);
  return Response.json({ verifications: verifications || [], callerRole: caller.role });
}
async function reviewBlogVerificationOp(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const privs = await resolveCallerPrivileges(caller);
  if (!hasPrivilege(privs, "review_blogs")) {
    return Response.json({ error: "You don't have permission to review bloggers" }, { status: 403 });
  }
  const { verification_id, status, review_notes } = p;
  if (!verification_id) return Response.json({ error: "verification_id required" }, { status: 400 });
  if (!["approved", "rejected"].includes(status)) return Response.json({ error: "status must be approved or rejected" }, { status: 400 });
  const unrufld = createClientFromRequest(req);
  const v = await unrufld.asServiceRole.entities.BlogVerification.get(verification_id).catch(() => null);
  if (!v) return Response.json({ error: "Verification not found" }, { status: 404 });
  if (v.status === "rejected" && status === "approved" && caller.role !== "super_admin") {
    return Response.json({ error: "Only super admins can override a declined verification" }, { status: 403 });
  }
  await unrufld.asServiceRole.entities.BlogVerification.update(verification_id, {
    status, reviewed_by: caller.username, review_notes: review_notes || "", reviewed_date: new Date().toISOString(),
  });
  // Notify the applicant by email (official Gmail) + in-app notification.
  try {
    await sendUserEmail(unrufld, v.email, `Your teewai blogger application — ${status === "approved" ? "approved" : "declined"}`, verificationDecisionHtml(v.full_name, "blogger application", status, review_notes, "https://teewai.app"), "teewai");
  } catch {}
  try {
    if (v.user_id) await unrufld.asServiceRole.entities.Notification.create({ user_id: v.user_id, title: status === "approved" ? "Blogger approved" : "Blogger application declined", message: status === "approved" ? "Your blogger application was approved — you can now write and publish posts." : `Your blogger application wasn't approved.${review_notes ? ` ${review_notes}` : ""} You can re-apply from your profile.`, type: status === "approved" ? "info" : "warning", read: false });
  } catch {}
  await auditLog(req, caller.username, "reviewBlogVerification", verification_id, `${status}${review_notes ? `: ${review_notes}` : ""}`);
  return Response.json({ ok: true, status });
}

// --- community moderation (moderate_community privilege) --------------------
async function listCommunityMessagesOp(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const privs = await resolveCallerPrivileges(caller);
  if (!hasPrivilege(privs, "moderate_community")) {
    return Response.json({ error: "You don't have permission to moderate the community" }, { status: 403 });
  }
  const unrufld = createClientFromRequest(req);
  const [rooms, messages] = await Promise.all([
    unrufld.asServiceRole.entities.DiscussionRoom.list("-created_date", 200),
    unrufld.asServiceRole.entities.DiscussionMessage.list("-created_date", 500),
  ]);
  return Response.json({ rooms: rooms || [], messages: messages || [], callerRole: caller.role });
}
async function deleteCommunityMessageOp(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const privs = await resolveCallerPrivileges(caller);
  if (!hasPrivilege(privs, "moderate_community")) {
    return Response.json({ error: "You don't have permission to moderate the community" }, { status: 403 });
  }
  const { message_id } = p;
  if (!message_id) return Response.json({ error: "message_id required" }, { status: 400 });
  const unrufld = createClientFromRequest(req);
  await unrufld.asServiceRole.entities.DiscussionMessage.update(message_id, {
    flag_status: "resolved_removed", reviewed_by: caller.username,
  });
  await auditLog(req, caller.username, "removeCommunityMessage", message_id, "Removed by moderator");
  return Response.json({ ok: true });
}

// Referral system overview — accounts, referrals, and withdrawals read as the
// service role so admins see every record regardless of RLS (the client SDK
// runs as the admin's app-user session, which has no referral ownership and
// would otherwise see an empty list).
async function listReferralsOp(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const unrufld = createClientFromRequest(req);
  const [accounts, referrals, withdrawals] = await Promise.all([
    unrufld.asServiceRole.entities.ReferralAccount.list("-created_date", 500),
    unrufld.asServiceRole.entities.Referral.list("-created_date", 500),
    unrufld.asServiceRole.entities.ReferralWithdrawal.list("-created_date", 500),
  ]);
  // Attach each account owner's email so the admin can see who owns each code.
  const userIds = [...new Set((accounts || []).map((a) => a.user_id).filter(Boolean))];
  const users = userIds.length ? await unrufld.asServiceRole.entities.User.list("-created_date", 500) : [];
  const emailMap = new Map((users || []).map((u) => [u.id, u.email]));
  const accountsWithEmail = (accounts || []).map((a) => ({ ...a, user_email: emailMap.get(a.user_id) || '' }));
  return Response.json({ accounts: accountsWithEmail, referrals: referrals || [], withdrawals: withdrawals || [] });
}

// --- dashboard tips management (content_admin + super_admin) -----------------
// The Tip entity RLS restricts writes to Base44 users with role "admin", but
// the admin panel uses a custom InsForge-backed admin session (not a Base44
// admin user), so the client SDK is denied. These ops run as the service role
// to bypass RLS, gated by the admin token + viewer-exclusion.
// Tips now live in InsForge (table: tips). Indexed cols: slug, title, active,
// sortOrder, audience, category. Everything else is stored in the `data` JSONB
// and merged back on read so callers keep the exact Base44 Tip entity shape.
const TIP_FIELDS = ["title","teaser","body","category","chart_type","chart_label","illustration","sort_order","active","audience","verified","confidence","slug"];
const TIP_INDEXED = { slug: "slug", title: "title", active: "active", sort_order: "sortOrder", audience: "audience", category: "category" };
const TIP_RESERVED = new Set(["id","created_date","updated_date", ...Object.keys(TIP_INDEXED)]);

function tipRowToEntity(row) {
  if (!row) return null;
  const ent = { ...(row.data || {}) };
  for (const [entF, colF] of Object.entries(TIP_INDEXED)) {
    if (row[colF] !== undefined && row[colF] !== null) ent[entF] = row[colF];
  }
  ent.id = row.id;
  ent.created_date = row.created_at;
  ent.updated_date = row.updated_at;
  return ent;
}

function tipEntityToRow(ent) {
  const row = { data: {} };
  for (const [entF, colF] of Object.entries(TIP_INDEXED)) {
    if (ent[entF] !== undefined) row[colF] = ent[entF];
  }
  for (const [k, v] of Object.entries(ent)) {
    if (!TIP_RESERVED.has(k)) row.data[k] = v;
  }
  return row;
}

async function listTipsOp(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const qs = buildQuery({}, { order: { column: "sortOrder", ascending: true }, limit: 200 });
  const r = await callInsforge(`/api/database/records/tips?${qs}`);
  const tips = (r.ok && Array.isArray(r.data)) ? r.data.map(tipRowToEntity) : [];
  return Response.json({ tips: tips || [] });
}

async function saveTipOp(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (caller.role === "viewer") return Response.json({ error: "Viewers cannot modify tips" }, { status: 403 });
  const { tip_id, ...rest } = p;
  const payload = {};
  for (const k of TIP_FIELDS) {
    if (rest[k] !== undefined) payload[k] = rest[k];
  }
  if (tip_id) {
    // InsForge PATCH replaces the `data` JSONB, so merge with the current row.
    const cur = await callInsforge(`/api/database/records/tips?${buildQuery({ id: tip_id }, { limit: 1 })}`);
    const existing = (cur.ok && Array.isArray(cur.data)) ? cur.data[0] : null;
    if (!existing) return Response.json({ error: "Tip not found" }, { status: 404 });
    const mergedEnt = { ...tipRowToEntity(existing), ...payload };
    const row = tipEntityToRow(mergedEnt);
    await callInsforge(`/api/database/records/tips?${buildQuery({ id: tip_id })}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    await auditLog(req, caller.username, "saveTip", tip_id, "Updated tip");
    return Response.json({ ok: true, id: tip_id });
  }
  if (!payload.title || !payload.teaser) return Response.json({ error: "title and teaser are required" }, { status: 400 });
  const row = tipEntityToRow(payload);
  const r = await callInsforge(`/api/database/records/tips`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify([row]),
  });
  const created = (r.ok && Array.isArray(r.data)) ? r.data[0] : null;
  await auditLog(req, caller.username, "saveTip", created?.id || "new", "Created tip");
  return Response.json({ ok: true, id: created?.id || null });
}

async function deleteTipOp(p, req) {
  const caller = await resolveCaller(p);
  if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (caller.role === "viewer") return Response.json({ error: "Viewers cannot delete tips" }, { status: 403 });
  if (!p.tip_id) return Response.json({ error: "tip_id required" }, { status: 400 });
  await callInsforge(`/api/database/records/tips?${buildQuery({ id: p.tip_id })}`, {
    method: "DELETE",
    headers: { Prefer: "return=representation" },
  });
  await auditLog(req, caller.username, "deleteTip", p.tip_id, "Deleted tip");
  return Response.json({ ok: true });
}