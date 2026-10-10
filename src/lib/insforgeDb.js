import { unrufld } from '@/api/unrufldClient';
import { adminAuth } from '@/lib/adminAuth';
import { queryClientInstance } from '@/lib/query-client';

// InsForge data layer for the teewai app.
//
// Auth stays on Base44 (login/sessions). InsForge stores app data, linked to
// the Base44 user by a `userId` column = unrufld.auth.me().id. Per-user entities
// (scans, subscriptions, user_progress) stamp `userId` on create so each user
// only ever reads their own rows; the dentist directory / coupons are shared.
//
// Each table mirrors its Base44 entity: a few indexed columns + a `data` JSONB
// holding the rest, so the app keeps the exact Base44 entity shape (snake_case).

const SCANS_TABLE = 'scans';
const PHOTOS_BUCKET = 'teeth-scans';

async function invoke(payload) {
  // Coupon management is admin-gated: forward the standalone admin token so
  // the proxy authorizes admin-only operations (listing ALL coupons + writes)
  // via the admin login (no Base44 session needed). Attaching it to reads is
  // safe — the proxy falls through to the Base44 session on a stale/expired
  // token, so a regular user checking a voucher code is never locked out.
  if (payload.table === 'coupons') {
    const tok = adminAuth.getToken();
    if (tok) payload = { ...payload, admin_token: tok };
  }
  // Retry once on transient server errors (502/503/504). These mean the
  // request was NOT processed (service unavailable), so retrying is safe for
  // writes too — no duplicate rows. Fixes the intermittent "503" users hit on
  // profile completion and scan saves when InsForge/the runtime blips.
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await unrufld.functions.invoke('insforge', payload);
      return res.data; // { data, count }
    } catch (e) {
      lastErr = e;
      const transient = /status code 50[234]/i.test(String(e?.message || ''));
      if (!transient || attempt === 1) throw e;
      await new Promise((r) => setTimeout(r, 650));
    }
  }
  throw lastErr;
}

async function currentUserId() {
  try {
    const me = await unrufld.auth.me();
    return me?.id || null;
  } catch {
    return null;
  }
}

// Build a CRUD data-access object for one InsForge table.
//   cols: [{ entity, col }] — indexed columns mapped between entity <-> row
//   ownerOnCreate: stamp userId = current user on create
//   scopeReads: auto-filter list/filter by current user's userId
function makeEntity({ table, cols, ownerOnCreate = false, scopeReads = false }) {
  const entToCol = Object.fromEntries(cols.map((c) => [c.entity, c.col]));
  const reserved = new Set(['id', 'created_date', 'updated_date']);

  // InsForge row -> Base44 entity (merge `data`, map indexed cols + timestamps)
  function toEntity(row) {
    if (!row) return null;
    const ent = { ...(row.data || {}) };
    for (const { col, entity } of cols) {
      if (row[col] !== undefined && row[col] !== null) ent[entity] = row[col];
    }
    ent.id = row.id;
    ent.created_date = row.created_at;
    ent.updated_date = row.updated_at;
    return ent;
  }

  // Base44 entity -> InsForge row (indexed cols + everything else in `data`)
  function split(obj) {
    const row = { data: {} };
    for (const { entity, col } of cols) {
      if (obj[entity] !== undefined) row[col] = obj[entity];
    }
    for (const [k, v] of Object.entries(obj)) {
      if (!entToCol[k] && !reserved.has(k)) row.data[k] = v;
    }
    return row;
  }

  function mapFilters(filters) {
    const out = {};
    for (const [k, v] of Object.entries(filters || {})) {
      out[entToCol[k] || k] = v;
    }
    return out;
  }

  async function withUser(filters) {
    const f = mapFilters(filters);
    if (scopeReads) f.userId = f.userId || (await currentUserId());
    return f;
  }

  async function list(sort = '-created_date', limit = 50, filters = {}) {
    const ascending = !sort.startsWith('-');
    const rawCol = sort.replace(/^-/, '');
    const column = entToCol[rawCol] || rawCol.replace('created_date', 'created_at');
    const f = await withUser(filters);
    const { data } = await invoke({
      resource: 'database',
      operation: 'select',
      table,
      filters: f,
      order: { column, ascending },
      limit,
    });
    return (data || []).map(toEntity);
  }

  return {
    list,
    async filter(filters = {}, sort = '-created_date', limit = 50) {
      return list(sort, limit, filters);
    },
    async get(id) {
      const { data } = await invoke({
        resource: 'database',
        operation: 'select',
        table,
        filters: { id },
      });
      return toEntity((data || [])[0]);
    },
    async create(obj) {
      const row = split(obj);
      if (ownerOnCreate) row.userId = row.userId || (await currentUserId());
      const { data } = await invoke({
        resource: 'database',
        operation: 'insert',
        table,
        records: [row],
      });
      return toEntity((data || [])[0]);
    },
    async update(id, patch) {
      // InsForge replaces the `data` JSONB on PATCH, so merge first.
      const current = await this.get(id);
      if (!current) throw new Error('Record not found');
      const row = split({ ...current, ...patch });
      const { data } = await invoke({
        resource: 'database',
        operation: 'update',
        table,
        filters: { id },
        values: row,
      });
      return toEntity((data || [])[0]);
    },
    async remove(id) {
      await invoke({
        resource: 'database',
        operation: 'delete',
        table,
        filters: { id },
      });
    },
  };
}

export const scans = makeEntity({
  table: SCANS_TABLE,
  ownerOnCreate: true,
  cols: [
    { entity: 'user_id', col: 'userId' },
    { entity: 'capture_position', col: 'capturePosition' },
    { entity: 'patient_email', col: 'patientEmail' },
    { entity: 'score', col: 'score' },
    { entity: 'shade', col: 'shade' },
  ],
});

export const subscriptions = makeEntity({
  table: 'subscriptions',
  ownerOnCreate: true,
  scopeReads: true,
  cols: [
    { entity: 'user_id', col: 'userId' },
    { entity: 'plan', col: 'plan' },
    { entity: 'status', col: 'status' },
    { entity: 'scans_used', col: 'scansUsed' },
    { entity: 'scans_limit', col: 'scansLimit' },
  ],
});

export const userProgress = makeEntity({
  table: 'user_progress',
  ownerOnCreate: true,
  scopeReads: true,
  cols: [
    { entity: 'user_id', col: 'userId' },
    { entity: 'mmr', col: 'mmr' },
    { entity: 'peak_mmr', col: 'peakMmr' },
    { entity: 'season_xp', col: 'seasonXp' },
    { entity: 'total_xp', col: 'totalXp' },
  ],
});

export const dentistProfiles = makeEntity({
  table: 'dentist_profiles',
  cols: [
    { entity: 'user_id', col: 'userId' },
    { entity: 'clinic_name', col: 'clinicName' },
    { entity: 'city', col: 'city' },
    { entity: 'accepting_patients', col: 'acceptingPatients' },
    { entity: 'booking_enabled', col: 'bookingEnabled' },
  ],
});

export const dentistClients = makeEntity({
  table: 'dentist_clients',
  cols: [
    { entity: 'dentist_id', col: 'dentistId' },
    { entity: 'client_email', col: 'clientEmail' },
    { entity: 'client_name', col: 'clientName' },
  ],
});

export const appointments = makeEntity({
  table: 'appointments',
  cols: [
    { entity: 'dentist_id', col: 'dentistId' },
    { entity: 'patient_email', col: 'patientEmail' },
    { entity: 'requested_date', col: 'requestedDate' },
    { entity: 'status', col: 'status' },
  ],
});

export const coupons = makeEntity({
  table: 'coupons',
  cols: [
    { entity: 'code', col: 'code' },
    { entity: 'active', col: 'active' },
  ],
});

export const stainLogs = makeEntity({
  table: 'stain_logs',
  ownerOnCreate: true,
  scopeReads: true,
  cols: [
    { entity: 'user_id', col: 'userId' },
    { entity: 'item_name', col: 'itemName' },
    { entity: 'log_date', col: 'logDate' },
    { entity: 'source', col: 'source' },
  ],
});

export const notifications = makeEntity({
  table: 'notifications',
  ownerOnCreate: true,
  scopeReads: true,
  cols: [
    { entity: 'user_id', col: 'userId' },
    { entity: 'read', col: 'read' },
    { entity: 'type', col: 'type' },
  ],
});

export const homeWhiteningMethods = makeEntity({
  table: 'home_whitening_methods',
  cols: [
    { entity: 'name', col: 'name' },
    { entity: 'category', col: 'category' },
    { entity: 'sort_order', col: 'sortOrder' },
  ],
});

export const discoveredFoods = makeEntity({
  table: 'discovered_foods',
  cols: [
    { entity: 'name_key', col: 'nameKey' },
    { entity: 'name', col: 'name' },
    { entity: 'category', col: 'category' },
  ],
});

// Admin-managed dashboard tips (public read, admin write). Mirrors the Tip
// Base44 entity: indexed cols for sorting/filtering + the rest in `data`.
export const tips = makeEntity({
  table: 'tips',
  cols: [
    { entity: 'slug', col: 'slug' },
    { entity: 'title', col: 'title' },
    { entity: 'active', col: 'active' },
    { entity: 'sort_order', col: 'sortOrder' },
    { entity: 'audience', col: 'audience' },
    { entity: 'category', col: 'category' },
  ],
});

export const zeroScanNudges = makeEntity({
  table: 'zero_scan_nudges',
  cols: [
    { entity: 'user_email', col: 'userEmail' },
    { entity: 'nudge_count', col: 'nudgeCount' },
    { entity: 'last_sent', col: 'lastSent' },
  ],
});

export const ipRegistrations = makeEntity({
  table: 'ip_registrations',
  cols: [
    { entity: 'ip_address', col: 'ipAddress' },
    { entity: 'user_email', col: 'userEmail' },
    { entity: 'user_id', col: 'userId' },
    { entity: 'username', col: 'username' },
  ],
});

// --- identity table ----------------------------------------------------------
// Portable copy of Base44 user profiles, auto-synced as users use the app so
// the dataset can be re-homed on another platform. Stores identity METADATA
// only (id, email, name, role) — never passwords, which no auth provider
// exposes. Pair with a passwordless login on the new platform to migrate
// without any password reset.
export const usersMirror = makeEntity({
  table: 'users',
  cols: [
    { entity: 'user_id', col: 'userId' },
    { entity: 'email', col: 'email' },
    { entity: 'full_name', col: 'fullName' },
    { entity: 'role', col: 'role' },
  ],
});

// --- user profile (InsForge-backed) -----------------------------------------
// Auth identity (id, email, role) stays on Base44. All profile fields
// (username, display_name, appliance_type, country, etc.) live in the
// users table on InsForge. This helper merges the two so callers
// get a single user object with auth + profile data.
export const userProfile = {
  async get() {
    // Parallelize the auth call and the InsForge mirror read — the proxy
    // auto-scopes the users table to the current user (SELECT_COLS.users),
    // so the mirror fetch doesn't need to wait for me.id. Cuts the two
    // serial round-trips to one parallel batch (faster dashboard / results).
    const [me, rows] = await Promise.all([
      unrufld.auth.me().catch(() => null),
      usersMirror.list('-created_date', 1).catch(() => []),
    ]);
    if (!me?.id) return me || {};
    const mirror = rows[0];
    if (mirror) {
      return {
        ...me,
        ...mirror,
        id: me.id,
        email: me.email || mirror.email,
        username: mirror.username || me.username || '',
        role: me.role || mirror.role,
        created_date: me.created_date,
      };
    }
    return me;
  },
  async update(data) {
    const me = await unrufld.auth.me();
    if (!me?.id) throw new Error('Not authenticated');
    // Sync select fields to the Base44 User entity so server-side functions
    // (e.g. leaderboard) that read the User entity see the latest value.
    const base44Fields = {};
    if (data.leaderboard_opt_out !== undefined) base44Fields.leaderboard_opt_out = data.leaderboard_opt_out;
    if (data.display_name !== undefined) base44Fields.display_name = data.display_name;
    if (data.username !== undefined) base44Fields.username = data.username;
    if (Object.keys(base44Fields).length) {
      try { await unrufld.auth.updateMe(base44Fields); } catch {}
    }
    const rows = await usersMirror.list('-created_date', 1, { user_id: me.id });
    const existing = rows[0];
    const profile = { ...data, user_id: me.id, email: me.email, last_seen: new Date().toISOString() };
    const saved = existing ? await usersMirror.update(existing.id, profile) : await usersMirror.create(profile);
    const key = ['user-profile', me.id];
    queryClientInstance.setQueryData(key, (cached) => cached ? { ...cached, ...data, id: me.id, email: me.email } : undefined);
    queryClientInstance.invalidateQueries({ queryKey: key });
    return saved;
  },
};

export async function syncUserToMirror(user) {
  if (!user?.id) return null;
  const profile = {
    user_id: user.id,
    email: user.email || null,
    full_name: user.full_name || null,
    display_name: user.display_name || null,
    username: user.username || null,
    first_name: user.first_name || null,
    last_name: user.last_name || null,
    phone_number: user.phone_number || null,
    how_found: user.how_found || null,
    username_history: user.username_history || null,
    username_changed_date: user.username_changed_date || null,
    leaderboard_opt_out: user.leaderboard_opt_out || false,
    role: user.role || 'user',
    last_seen: new Date().toISOString(),
    base44_created_date: user.created_date || null,
  };
  const existing = await usersMirror.list('-created_date', 1, { user_id: user.id });
  if (existing.length) return usersMirror.update(existing[0].id, profile);
  return usersMirror.create(profile);
}

// --- photo storage ----------------------------------------------------------
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function extFor(file) {
  const fromType = (file.type || '').split('/')[1];
  if (fromType && /^[a-z0-9]+$/i.test(fromType)) return fromType;
  const fromName = (file.name || '').split('.').pop();
  return (fromName && /^[a-z0-9]+$/i.test(fromName)) ? fromName : 'jpg';
}

// Compress teeth photos before storage: downscale to a max edge and re-encode
// as JPEG to keep storage + bandwidth small while preserving shade detail.
export function compressImage(file, maxDim = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('Image compression failed')); return; }
        const reader = new FileReader();
        reader.onload = () => resolve({ base64: String(reader.result).split(',')[1], contentType: 'image/jpeg', blob });
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not load image')); };
    img.src = url;
  });
}

// Delete a scan AND its photos from storage. Replaces insforgeScans.remove so
// that deleting a scan no longer orphans its photos in storage.
export async function deleteScan(id) {
  await invoke({
    resource: 'database',
    operation: 'deleteScan',
    table: SCANS_TABLE,
    id,
  });
}

export const photos = {
  // Uploads a teeth photo to InsForge storage (compressed) and returns its URL.
  async upload(file) {
    let base64;
    let contentType = 'image/jpeg';
    let blob = file;
    try {
      const c = await compressImage(file);
      base64 = c.base64;
      contentType = c.contentType;
      blob = c.blob;
    } catch {
      // Non-image or decode failure — store the original.
      base64 = await fileToBase64(file);
      contentType = file.type || 'image/jpeg';
    }
    const key = `scans/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { data } = await invoke({
      resource: 'storage',
      operation: 'upload',
      bucket: PHOTOS_BUCKET,
      key,
      contentType,
      base64,
    });
    return { url: data.url, blob };
  },
  // Uploads an already-compressed blob to InsForge storage. Paired with
  // compressImage() so callers can compress once and upload to InsForge +
  // Base44 in parallel instead of serially.
  async uploadBlob(blob, contentType = 'image/jpeg') {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const key = `scans/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { data } = await invoke({
      resource: 'storage',
      operation: 'upload',
      bucket: PHOTOS_BUCKET,
      key,
      contentType,
      base64,
    });
    return { url: data.url };
  },
};

// Food photos live in a separate private InsForge bucket (`food-scans`), under
// the same per-user namespace (`u/<userId>/food/…`) as teeth scans. They're
// served through the scanPhoto proxy (bucket-aware) so food photos stay PHI-
// private just like dental scans — no public Base44 URLs.
export const foodPhotos = {
  async upload(file) {
    let base64;
    let contentType = 'image/jpeg';
    try {
      const c = await compressImage(file, 1024, 0.8);
      base64 = c.base64;
      contentType = c.contentType;
    } catch {
      base64 = await fileToBase64(file);
      contentType = file.type || 'image/jpeg';
    }
    const key = `food/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { data } = await invoke({
      resource: 'storage',
      operation: 'upload',
      bucket: 'food-scans',
      key,
      contentType,
      base64,
    });
    return { url: data.url };
  },
  // Uploads an already-compressed blob to the food-scans bucket. Paired with
  // compressImage() so the caller can compress once and upload to InsForge +
  // Base44 in parallel (same pattern as teeth scans).
  async uploadBlob(blob, contentType = 'image/jpeg') {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const key = `food/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { data } = await invoke({
      resource: 'storage',
      operation: 'upload',
      bucket: 'food-scans',
      key,
      contentType,
      base64,
    });
    return { url: data.url };
  },
};