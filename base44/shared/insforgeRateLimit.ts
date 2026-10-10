import {
  INSFORGE_BASE_URL,
  insforgeToken,
  authHeaders,
  buildQuery,
} from "./insforge.ts";

// Shared InsForge data-access helpers for auth rate-limiting tables.
// Used by adminAuth and userAuth — extracted to avoid duplication.

export interface ColumnDef {
  columnName: string;
  type: string;
  isUnique?: boolean;
  isNullable?: boolean;
}

export async function callInsforge(path: string, init: RequestInit = {}) {
  const headers = { ...authHeaders(), ...(init.headers || {}) };
  const res = await fetch(`${INSFORGE_BASE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  let data: any = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  return { ok: res.ok, status: res.status, data };
}

export async function ensureTable(tableName: string, columns: ColumnDef[]) {
  return callInsforge(`/api/database/tables`, {
    method: "POST",
    body: JSON.stringify({
      tableName,
      columns,
      rlsEnabled: false,
    }),
  });
}

export async function countRecords(tableName: string, filters: Record<string, any>, limit = 100) {
  const r = await callInsforge(
    `/api/database/records/${tableName}?${buildQuery(filters, { limit })}`
  );
  return r.ok && Array.isArray(r.data) ? r.data.length : 0;
}

export async function insertRecords(tableName: string, records: any[]) {
  return callInsforge(`/api/database/records/${tableName}`, {
    method: "POST",
    body: JSON.stringify(records),
  });
}

export async function deleteRecords(tableName: string, filters: Record<string, any>) {
  return callInsforge(
    `/api/database/records/${tableName}?${buildQuery(filters)}`,
    { method: "DELETE" }
  );
}