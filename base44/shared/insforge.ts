import { secrets } from "base44:runtime";

// Your InsForge project backend URL (not secret — safe to hardcode).
export const INSFORGE_BASE_URL = "https://a7ebsz57.us-east.insforge.app";

// Service/admin token used for database + storage + bucket management.
export function insforgeToken() {
  const token = secrets.get("INSFORGE_PROJECT_TOKEN");
  if (!token) throw new Error("INSFORGE_PROJECT_TOKEN is not configured");
  return token;
}

// Headers for admin/service-level InsForge calls (database, storage, tables).
export function authHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${insforgeToken()}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

// Extract the storage object key from a full InsForge object URL.
// URL shape: .../api/storage/buckets/{bucket}/objects/{key}?v=...
export function extractStorageKey(url: string): string | null {
  const marker = "/objects/";
  const idx = String(url).indexOf(marker);
  if (idx < 0) return null;
  return decodeURIComponent(String(url).slice(idx + marker.length).split("?")[0]);
}

// Build a PostgREST-style query string from a filters object.
// filters shape: { field: value } (defaults to eq) or { field: { [op]: value } }
// supported ops: eq, neq, gt, gte, lt, lte, like, in, is
export function buildQuery(filters = {}, opts = {}) {
  const params = new URLSearchParams();
  for (const [field, cond] of Object.entries(filters)) {
    if (cond !== null && typeof cond === "object" && !Array.isArray(cond)) {
      for (const [op, val] of Object.entries(cond)) {
        const v = Array.isArray(val) ? `(${val.join(",")})` : String(val);
        params.append(field, `${op}.${v}`);
      }
    } else {
      params.append(field, `eq.${cond}`);
    }
  }
  if (opts.select) params.set("select", opts.select);
  if (opts.order) {
    const { column, ascending = true } = opts.order;
    params.set("order", `${column}.${ascending ? "asc" : "desc"}`);
  }
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.offset != null) params.set("offset", String(opts.offset));
  return params.toString();
}