// Generic InsForge entity adapter factory.
//
// Provides a Base44-entity-like interface (filter, create, update, bulkCreate,
// bulkUpdate, deleteMany, updateMany) backed by InsForge's PostgREST endpoint.
// Extracted from dentalInsforge.ts so every InsForge-backed entity shares one
// implementation.
//
// Key translations:
// - MongoDB operators ($in, $lt, $lte, $gt, $gte, $ne) → PostgREST (in, lt, lte, gt, gte, neq)
// - Entity field names → InsForge column names (per table colMap)
// - Entity → row: indexed cols + data JSONB; Row → entity: merge back
// - bulkUpdate: PostgREST has no per-row bulk update → loop of individual PATCHes
//   (only sending indexed columns so the data JSONB is preserved)
// - updateMany with $set: PostgREST PATCH with filter → count returned rows

import { buildQuery } from "./insforge.ts";
import { callInsforge } from "./insforgeRateLimit.ts";

const RESERVED = new Set(["id", "created_date", "updated_date", "created_by_id"]);

const OP_MAP: Record<string, string> = {
  $in: "in", $lt: "lt", $lte: "lte", $gt: "gt", $gte: "gte", $ne: "neq", $nin: "not.in",
};

function translateOps(filters: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(filters || {})) {
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      const translated: Record<string, any> = {};
      for (const [op, val] of Object.entries(v)) {
        translated[OP_MAP[op] || op] = val;
      }
      out[k] = translated;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function mapFilters(filters: Record<string, any>, colMap: Record<string, string>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(filters)) {
    out[colMap[k] || k] = v;
  }
  return out;
}

function toOrder(sort?: string) {
  if (!sort) return undefined;
  const ascending = !sort.startsWith("-");
  const raw = sort.replace(/^-/, "");
  const column = raw === "created_date" ? "created_at" : raw === "updated_date" ? "updated_at" : raw;
  return { column, ascending };
}

function toRow(rec: Record<string, any>, colMap: Record<string, string>): Record<string, any> {
  const row: Record<string, any> = { data: {} };
  for (const [entF, colF] of Object.entries(colMap)) {
    if (rec[entF] !== undefined) row[colF] = rec[entF];
  }
  for (const [k, v] of Object.entries(rec)) {
    if (!colMap[k] && !RESERVED.has(k)) row.data[k] = v;
  }
  return row;
}

function toEntity(row: any, colMap: Record<string, string>): any {
  if (!row) return null;
  const ent: Record<string, any> = { ...(row.data || {}) };
  for (const [entF, colF] of Object.entries(colMap)) {
    if (row[colF] !== undefined && row[colF] !== null) ent[entF] = row[colF];
  }
  ent.id = row.id;
  ent.created_date = row.created_at;
  ent.updated_date = row.updated_at;
  return ent;
}

export function makeInsforgeEntity(table: string, colMap: Record<string, string>) {
  return {
    async filter(filters: Record<string, any> = {}, sort?: string, limit?: number): Promise<any[]> {
      const translated = translateOps(mapFilters(filters, colMap));
      const qs = buildQuery(translated, { order: toOrder(sort), limit: limit || 500 });
      const r = await callInsforge(`/api/database/records/${table}?${qs}`);
      return r.ok && Array.isArray(r.data) ? r.data.map((row: any) => toEntity(row, colMap)) : [];
    },

    async create(rec: Record<string, any>): Promise<any> {
      const row = toRow(rec, colMap);
      const r = await callInsforge(`/api/database/records/${table}`, {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify([row]),
      });
      return r.ok && Array.isArray(r.data) ? toEntity(r.data[0], colMap) : null;
    },

    async update(id: string, patch: Record<string, any>): Promise<any> {
      const cur = await callInsforge(`/api/database/records/${table}?${buildQuery({ id })}`);
      const existing = cur.ok && Array.isArray(cur.data) ? cur.data[0] : null;
      if (!existing) return null;
      const merged = { ...toEntity(existing, colMap), ...patch };
      const row = toRow(merged, colMap);
      const r = await callInsforge(`/api/database/records/${table}?${buildQuery({ id })}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(row),
      });
      return r.ok && Array.isArray(r.data) ? toEntity(r.data[0], colMap) : null;
    },

    async bulkCreate(records: Record<string, any>[]): Promise<void> {
      if (!records.length) return;
      const rows = records.map((r) => toRow(r, colMap));
      const allKeys = new Set<string>();
      rows.forEach((r) => Object.keys(r).forEach((k) => allKeys.add(k)));
      const normalized = rows.map((r) => {
        const n: Record<string, any> = {};
        for (const k of allKeys) n[k] = r[k] !== undefined ? r[k] : null;
        return n;
      });
      for (let i = 0; i < normalized.length; i += 100) {
        await callInsforge(`/api/database/records/${table}`, {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(normalized.slice(i, i + 100)),
        });
      }
    },

    async bulkUpdate(records: Record<string, any>[]): Promise<void> {
      for (const rec of records) {
        if (!rec.id) continue;
        const { id, ...patch } = rec;
        const values: Record<string, any> = {};
        for (const [k, v] of Object.entries(patch)) {
          if (colMap[k]) values[colMap[k]] = v;
        }
        if (Object.keys(values).length === 0) continue;
        await callInsforge(`/api/database/records/${table}?${buildQuery({ id })}`, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(values),
        });
      }
    },

    async deleteMany(filters: Record<string, any> = {}): Promise<void> {
      const translated = translateOps(mapFilters(filters, colMap));
      const qs = buildQuery(translated);
      await callInsforge(`/api/database/records/${table}?${qs}`, {
        method: "DELETE",
        headers: { Prefer: "return=representation" },
      });
    },

    async updateMany(filters: Record<string, any>, update: Record<string, any>): Promise<{ updated: number }> {
      const translatedFilters = translateOps(mapFilters(filters, colMap));
      const values: Record<string, any> = {};
      const raw = update.$set || update;
      for (const [k, v] of Object.entries(raw)) {
        if (colMap[k]) values[colMap[k]] = v;
      }
      const qs = buildQuery(translatedFilters);
      const r = await callInsforge(`/api/database/records/${table}?${qs}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(values),
      });
      return { updated: r.ok && Array.isArray(r.data) ? r.data.length : 0 };
    },
  };
}