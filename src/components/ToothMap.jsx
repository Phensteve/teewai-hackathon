import { useState } from 'react';
import { ScanFace, Activity, Palette, Info } from 'lucide-react';
import { HEALTH_LEVELS, getHealthColor, getHealthLabel } from '@/lib/unrufldteeth';
import { whitenessColor } from '@/lib/unrufldteeth';

// Tooth-by-tooth analysis: a dental-arch visualization (upper + lower rows of
// colored circles) with a legend and a detail card for the selected tooth.
// Toggle Health / Shade; tap any tooth to inspect it.

const HEALTH_LEGEND = [
  ['pristine', 'luminous', 'radiant', 'excellent', 'bright'],
  ['decent', 'fresh', 'fair'],
  ['stained', 'rough', 'severe'],
];

const SHADE_LEGEND = [
  { label: 'Stained', color: '#8a5a2b' },
  { label: 'Yellow', color: '#c9a24a' },
  { label: 'Bright', color: '#f3e6b8' },
  { label: 'White', color: '#fdf6e3' },
];

// Parse a tooth id into quadrant + number. Accepts UR/UL/LR/LL labels or FDI
// two-digit notation (1=UR 2=UL 3=LL 4=LR).
function parseToothId(id) {
  const s = String(id || '');
  let m = /^([A-Za-z]{1,2})(\d+)$/.exec(s);
  if (m) return { q: m[1].toUpperCase(), n: Number(m[2]) };
  m = /^(\d)(\d)$/.exec(s);
  if (m) {
    const map = { 1: 'UR', 2: 'UL', 3: 'LL', 4: 'LR' };
    return { q: map[Number(m[1])] || '', n: Number(m[2]) };
  }
  return { q: '', n: 0 };
}

const isUpper = (q) => q === 'UR' || q === 'UL' || q === '';

function archRows(teeth) {
  const withIdx = teeth.map((tooth, index) => ({ tooth, index }));
  const upper = withIdx.filter((t) => isUpper(parseToothId(t.tooth.tooth_id).q));
  const lower = withIdx.filter((t) => !isUpper(parseToothId(t.tooth.tooth_id).q));
  const sortFn = (a, b) => {
    const A = parseToothId(a.tooth.tooth_id);
    const B = parseToothId(b.tooth.tooth_id);
    const aRight = A.q === 'UR' || A.q === 'LR';
    const bRight = B.q === 'UR' || B.q === 'LR';
    if (aRight && bRight) return B.n - A.n;     // right quadrant: toward center
    if (!aRight && !bRight) return A.n - B.n;   // left quadrant: from center
    return aRight ? -1 : 1;                     // right before left
  };
  upper.sort(sortFn);
  lower.sort(sortFn);
  return { upper, lower };
}

function domColor(tooth, view) {
  if (view === 'shade') return whitenessColor(tooth.whiteness_score);
  return getHealthColor(tooth.color_segments?.[0]?.health || 'fair');
}

export default function ToothMap({ scan }) {
  const teeth = scan.tooth_analysis || [];
  const [view, setView] = useState('health');
  const worst = teeth.length
    ? teeth.reduce((best, t, i) => ((t.health_score ?? 100) < (teeth[best].health_score ?? 100) ? i : best), 0)
    : null;
  const [selected, setSelected] = useState(worst);
  if (!teeth.length) return null;

  const sel = selected != null ? teeth[selected] : null;
  const { upper, lower } = archRows(teeth);

  const renderRow = (row, curve) => (
    <div className="flex justify-center items-end gap-1.5 sm:gap-2">
      {row.map(({ tooth, index }, i) => {
        const center = (row.length - 1) / 2;
        const off = i - center;
        const ty = curve * off * off;
        const color = domColor(tooth, view);
        const isSel = selected === index;
        return (
          <button
            key={index}
            type="button"
            onClick={() => setSelected(isSel ? null : index)}
            className="group p-0.5"
            style={{ transform: `translateY(${ty}px)` }}
            title={`${tooth.tooth_id} · ${getHealthLabel(tooth.color_segments?.[0]?.health || 'fair')}`}
            aria-label={`${tooth.tooth_id} ${tooth.tooth_type}`}
          >
            <span
              className={`block rounded-full border-2 transition-all ${isSel ? 'border-olo ring-2 ring-olo/30 scale-110' : 'border-white/50 dark:border-white/15 group-hover:border-olo/50'}`}
              style={{ width: 28, height: 28, backgroundColor: color }}
            />
          </button>
        );
      })}
    </div>
  );

  const barValue = view === 'health' ? (sel?.health_score || 0) : (sel?.whiteness_score || 0);
  const barColor = view === 'health' ? '#0d9f8e' : whitenessColor(sel?.whiteness_score);

  return (
    <div className="mb-6 p-5 sm:p-6 rounded-3xl border border-border bg-card">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <ScanFace className="w-5 h-5 text-olo" />
          <h2 className="font-heading font-600 text-xl">Tooth-by-tooth analysis</h2>
        </div>
        <div className="flex bg-muted/50 rounded-xl p-1">
          <button
            onClick={() => setView('health')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === 'health' ? 'bg-card text-olo shadow-sm' : 'text-muted-foreground'}`}
          >
            <Activity className="w-3.5 h-3.5" /> Health
          </button>
          <button
            onClick={() => setView('shade')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === 'shade' ? 'bg-card text-olo shadow-sm' : 'text-muted-foreground'}`}
          >
            <Palette className="w-3.5 h-3.5" /> Shade
          </button>
        </div>
      </div>

      {/* Legend */}
      {view === 'health' ? (
        <div className="space-y-1.5 mb-5">
          {HEALTH_LEGEND.map((row, ri) => (
            <div key={ri} className="flex flex-wrap gap-x-4 gap-y-1">
              {row.map((key) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getHealthColor(key) }} />
                  <span className="text-[11px] text-muted-foreground">{getHealthLabel(key)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-5">
          {SHADE_LEGEND.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full border border-black/10" style={{ backgroundColor: s.color }} />
              <span className="text-[11px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Dental arch */}
      <div className="rounded-2xl bg-muted/30 dark:bg-muted/20 p-3">
        {renderRow(upper, 0.9)}
        <div className="h-3" />
        {renderRow(lower, -0.9)}
      </div>
      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-2">
        <Info className="w-3 h-3" /> Tap any tooth to inspect its {view === 'health' ? 'health' : 'shade'} detail.
      </p>

      {/* Selected tooth detail card */}
      {sel && (
        <div className="mt-4 p-4 rounded-2xl border border-border bg-card animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-heading font-700 text-lg leading-none">{sel.tooth_id}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{sel.tooth_type}</p>
            </div>
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: domColor(sel, view) }} />
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden mb-2.5">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.max(3, Math.min(100, Math.round(barValue)))}%`, backgroundColor: barColor }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Health: <strong className="text-foreground">{Math.round(sel.health_score || 0)}</strong></span>
            <span className="text-muted-foreground">White: <strong className="text-foreground">{Math.round(sel.whiteness_score || 0)}</strong></span>
          </div>

          {sel.conditions?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {sel.conditions.map((c, j) => (
                <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">{c.replace(/_/g, ' ')}</span>
              ))}
            </div>
          )}
          {sel.color_segments?.length > 0 && (
            <div className="mt-3 space-y-1">
              {sel.color_segments.map((seg, j) => (
                <div key={j} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getHealthColor(seg.health) }} />
                  <span className="text-muted-foreground capitalize">{seg.area || 'whole'}</span>
                  <span className="text-foreground">{getHealthLabel(seg.health)}</span>
                  {seg.note && <span className="text-muted-foreground">· {seg.note}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}