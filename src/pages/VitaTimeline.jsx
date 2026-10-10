import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { scans as insforgeScans } from '@/lib/insforgeDb';
import { ALL_SHADES, shadeIndex, shadeByCode, TOTAL_STEPS } from '@/lib/vitaShade';
import VitaShadeScale from '@/components/VitaShadeScale';
import { ArrowRight, Target, TrendingUp, WifiOff, RotateCcw } from 'lucide-react';
import PageSkeleton from '@/components/loading/PageSkeleton';

export default function VitaTimeline() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    insforgeScans.list('-created_date', 100, {})
      .then((s) => setScans(s.filter((x) => x.scan_mode !== 'braces')))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // Chronological: oldest → newest (left → right on the timeline).
  const chrono = useMemo(() => [...scans].reverse(), [scans]);

  const points = useMemo(() => chrono
    .map((s) => ({ id: s.id, date: s.created_date, code: s.shade_code || s.shade, score: s.score, idx: shadeIndex(s.shade_code || s.shade) }))
    .filter((p) => p.idx >= 0), [chrono]);

  const latest = scans[0];
  const target = latest?.whitening_potential_shade_code || latest?.whitening_potential_shade;
  const targetIdx = shadeIndex(target);
  const currentIdx = latest ? shadeIndex(latest.shade_code || latest.shade) : -1;
  const stepsToTarget = (currentIdx >= 0 && targetIdx >= 0) ? Math.max(0, currentIdx - targetIdx) : 0;
  const weeksToTarget = latest?.weeks_to_potential;
  const firstPoint = points[0];
  const totalProgress = (firstPoint && currentIdx >= 0) ? Math.max(0, firstPoint.idx - currentIdx) : 0;

  if (loading) {
    return <PageSkeleton title="VITA timeline" />;
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4">
        <div className="w-14 h-14 rounded-2xl bg-danger-soft flex items-center justify-center mx-auto mb-5">
          <WifiOff className="w-7 h-7 text-danger" />
        </div>
        <h2 className="font-heading font-700 text-xl mb-2">We couldn't load your shade timeline</h2>
        <p className="text-sm text-muted-foreground mb-6">Your shade history is safe — this is usually a connection hiccup. Check your signal and try again.</p>
        <button onClick={() => load()} className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl hover:scale-105 transition-transform olo-glow">
          <RotateCcw className="w-4 h-4" /> Try again
        </button>
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-14 h-14 rounded-2xl bg-olo/10 flex items-center justify-center mx-auto mb-4"><TrendingUp className="w-7 h-7 text-olo" /></div>
        <h1 className="font-heading font-700 text-xl mb-2">No scans yet</h1>
        <p className="text-muted-foreground text-sm mb-6">Take a scan to start your private VITA whitening timeline.</p>
        <Link to="/scan" className="inline-flex items-center gap-2 bg-olo text-white font-semibold px-5 py-2.5 rounded-xl hover:scale-105 transition-transform olo-glow">
          Start first scan
        </Link>
      </div>
    );
  }

  // SVG chart geometry.
  const W = 600, H = 240, padL = 28, padR = 16, padT = 16, padB = 28;
  const chartW = W - padL - padR, chartH = H - padT - padB;
  const xFor = (i, n) => n <= 1 ? padL + chartW / 2 : padL + (i / (n - 1)) * chartW;
  const yFor = (idx) => padT + (idx / (TOTAL_STEPS - 1)) * chartH; // lighter (idx 0) at top
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i, points.length).toFixed(1)} ${yFor(p.idx).toFixed(1)}`).join(' ');
  const targetY = targetIdx >= 0 ? yFor(targetIdx) : null;

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-olo transition-colors mb-5">
        <ArrowRight className="w-4 h-4 rotate-180" /> Back to dashboard
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-2xl bg-olo/10 flex items-center justify-center"><Target className="w-6 h-6 text-olo" /></div>
        <div>
          <h1 className="font-heading font-700 text-2xl tracking-tight">VITA timeline</h1>
          <p className="text-sm text-muted-foreground">Your private shade journey on the VITA ladder.</p>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl border border-border bg-card text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Current</p>
          <div className="w-7 h-7 rounded-lg mx-auto my-2 border border-black/10" style={{ backgroundColor: shadeByCode(latest?.shade_code || latest?.shade)?.hex || '#ccc' }} />
          <p className="font-heading font-700 text-lg">{latest?.shade_code || latest?.shade || '—'}</p>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Target</p>
          <div className="w-7 h-7 rounded-lg mx-auto my-2 border-2 border-olo/50" style={{ backgroundColor: shadeByCode(target)?.hex || '#ccc' }} />
          <p className="font-heading font-700 text-lg text-olo">{target || '—'}</p>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">To go</p>
          <Target className="w-7 h-7 text-olo mx-auto my-2" />
          <p className="font-heading font-700 text-lg">{stepsToTarget ? `${stepsToTarget} step${stepsToTarget === 1 ? '' : 's'}` : '—'}</p>
        </div>
      </div>

      {weeksToTarget != null && stepsToTarget > 0 && (
        <div className="mt-3 p-3 rounded-2xl bg-olo/10 text-olo text-xs text-center">
          At your current pace, you're about <strong>{weeksToTarget} week{weeksToTarget === 1 ? '' : 's'}</strong> from your target shade {target}.
        </div>
      )}
      {totalProgress > 0 && (
        <div className="mt-3 p-3 rounded-2xl bg-success/10 text-success text-xs text-center">
          You've moved <strong>{totalProgress} step{totalProgress === 1 ? '' : 's'}</strong> lighter since your first scan. 🎉
        </div>
      )}

      {/* Shade scale (current vs target) */}
      <div className="mt-6">
        <VitaShadeScale
          currentShadeCode={latest?.shade_code}
          targetShadeCode={target}
          currentShade={latest?.shade}
          targetShade={latest?.whitening_potential_shade}
        />
      </div>

      {/* Timeline chart */}
      {points.length >= 1 && (
        <div className="mt-4 p-5 rounded-3xl border border-border bg-card">
          <h3 className="font-heading font-600 text-base mb-1">Shade over time</h3>
          <p className="text-xs text-muted-foreground mb-4">Each dot is a scan, placed on the VITA ladder. Up = lighter.</p>
          <div className="overflow-x-auto no-scrollbar">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: points.length > 4 ? 520 : 300 }}>
              {/* Y-axis ladder ticks (a few reference shades) */}
              {[0, 6, 12, 18].map((idx) => (
                <g key={idx}>
                  <line x1={padL} y1={yFor(idx)} x2={W - padR} y2={yFor(idx)} stroke="currentColor" className="text-border" strokeWidth="1" strokeDasharray="2 4" />
                  <text x={padL - 6} y={yFor(idx) + 3} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: 9 }}>{ALL_SHADES[idx].code}</text>
                </g>
              ))}
              {/* Target line */}
              {targetY != null && (
                <g>
                  <line x1={padL} y1={targetY} x2={W - padR} y2={targetY} stroke="hsl(var(--olo))" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.7" />
                  <text x={W - padR} y={targetY - 4} textAnchor="end" className="fill-olo" style={{ fontSize: 9, fontWeight: 600 }}>Target {target}</text>
                </g>
              )}
              {/* Progress line */}
              {points.length >= 2 && <path d={linePath} fill="none" stroke="hsl(var(--olo))" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
              {/* Points */}
              {points.map((p, i) => {
                const sw = shadeByCode(p.code);
                return (
                  <g key={p.id}>
                    <circle cx={xFor(i, points.length)} cy={yFor(p.idx)} r="6" fill={sw?.hex || '#ccc'} stroke="hsl(var(--card))" strokeWidth="2" />
                    <text x={xFor(i, points.length)} y={H - padB + 12} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 8 }}>
                      {new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* Scan-by-scan log */}
      <div className="mt-4 p-5 rounded-3xl border border-border bg-card">
        <h3 className="font-heading font-600 text-base mb-3">Scan history</h3>
        <div className="space-y-2">
          {[...points].reverse().map((p, i, arr) => {
            const prev = arr[i + 1];
            const delta = prev ? prev.idx - p.idx : null; // positive = got lighter
            return (
              <Link key={p.id} to={`/results/${p.id}`} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/40 transition-colors">
                <div className="w-8 h-8 rounded-lg border border-black/10 flex-shrink-0" style={{ backgroundColor: shadeByCode(p.code)?.hex || '#ccc' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{p.code}</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                {delta != null && delta !== 0 && (
                  <span className={`text-xs font-semibold ${delta > 0 ? 'text-olo' : 'text-warning'}`}>
                    {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}
                  </span>
                )}
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-8 p-3 rounded-xl bg-warning-soft border border-warning/20 text-warning text-xs text-center">
        Your timeline is private — only you can see your shade history.
      </div>
    </div>
  );
}