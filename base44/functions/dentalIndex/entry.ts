import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { waitUntil } from 'base44:runtime';
import { blockCells, cellOf, groupCells, ingestCells, STALE_MS } from '../../shared/dentalIndex.ts';
import { profilesWithin, nearbyRows, validPoint } from '../../shared/dentistDirectory.ts';
import { DentalCoverage, DentalUnit } from '../../shared/dentalInsforge.ts';

const BLOCK_KM = 10;
const PUBLIC_FIELDS = ['id', 'source_id', 'clinic_name', 'full_name', 'address', 'city', 'phone', 'website', 'latitude', 'longitude', 'facility_type', 'dental_tier', 'dental_confidence', 'signals'];

// InsForge-backed entities return arrays (not page objects), so a single
// high-limit call suffices for the dental index (a 10 km block has at most
// a few hundred units).
async function listAll(entity: any, query: any) {
  return await entity.filter(query, undefined, 1000);
}

// op "lookup": instant read of the pre-built index for the 10 km block around a point.
// op "ingest_pending": scheduled builder for queued / stale cells.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    if (body.op === 'ingest_pending') {
      const pending = await DentalCoverage.filter({ status: { $in: ['pending', 'failed'] }, attempts: { $lt: 4 } }, 'updated_date', 60);
      const results = [];
      for (const group of groupCells(pending.map((p: any) => p.cell)).slice(0, 2)) {
        try { results.push(await ingestCells(svc, group)); }
        catch (e) {
          const rows = pending.filter((p: any) => group.includes(p.cell));
          await DentalCoverage.bulkUpdate(rows.map((p: any) => ({ id: p.id, status: 'failed', attempts: (p.attempts || 0) + 1 })));
          results.push({ error: String(e?.message || e), cells: group.length });
        }
      }
      return Response.json({ processed: results, queued: pending.length });
    }

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { lat, lon } = body;
    if (!validPoint(lat, lon)) return Response.json({ error: 'Choose a valid location' }, { status: 400 });

    const started = Date.now();
    const point = [lat, lon];
    const cells = blockCells(lat, lon, BLOCK_KM);
    const [coverage, units, profiles] = await Promise.all([
      DentalCoverage.filter({ cell: { $in: cells } }),
      listAll(DentalUnit, { cell: { $in: cells } }),
      profilesWithin(base44, point, BLOCK_KM + 8),
    ]);
    const known = new Map(coverage.map((c: any) => [c.cell, c]));
    const ready = cells.filter(c => known.get(c)?.status === 'ready');
    const missing = cells.filter(c => !known.has(c));
    const stale = coverage.filter((c: any) => c.status === 'ready' && Date.now() - new Date(c.ingested_at).getTime() > STALE_MS);

    // Queue work off the response path. Primary lookups build missing cells right away;
    // prefetch lookups only queue them for the scheduled builder.
    waitUntil((async () => {
      if (missing.length) await DentalCoverage.bulkCreate(missing.map(c => ({ cell: c, status: 'pending', attempts: 0 })));
      if (stale.length) await DentalCoverage.bulkUpdate(stale.map((c: any) => ({ id: c.id, status: 'pending', attempts: 0 })));
      if (missing.length && !body.prefetch) await ingestCells(svc, missing).catch(() => {});
    })());

    const clean = units.map((u: any) => Object.fromEntries(PUBLIC_FIELDS.filter(k => u[k] !== undefined).map(k => [k, k === 'id' ? u.source_id : u[k]])));
    // nearbyRows merges registered teewai dentists with indexed units and dedups them.
    const rows = nearbyRows(profiles, clean, point, BLOCK_KM + 8).map((r: any) => ({ ...r, cell: cellOf(r.latitude, r.longitude) }));
    return Response.json({
      rows,
      readyCells: ready,
      coverage: ready.length === cells.length ? 'full' : ready.length ? 'partial' : 'none',
      lookupMs: Date.now() - started,
    });
  } catch (error) {
    return Response.json({ error: error?.message || 'Dental index lookup failed' }, { status: 500 });
  }
}