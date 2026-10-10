import { useState, useEffect, useRef, useMemo } from 'react';

// Action → color mapping (restrained, from tokens). Each action type keeps
// its own color so multiple dotted extrapolation lines coexist with a legend.
export const ACTION_COLORS = {
  brush: 'hsl(var(--olo))', // brand
  water: '#3b82f6',         // calm blue
  mouthwash: '#14b8a6',     // mint/teal
};
const ACTION_LABELS = {
  brush: 'Brushed',
  water: 'Water rinse',
  mouthwash: 'Mouthwash',
};

function xLabelFormat(presetId) {
  if (presetId === 'day') return (d) => d.toLocaleTimeString(undefined, { hour: 'numeric' });
  if (presetId === '3m' || presetId === '6m' || presetId === '9m' || presetId === 'year' || presetId === 'all')
    return (d) => d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  return (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function TrendGraph({ series, xDomain, yDomain, baselineScore, extrapolations, presetId }) {
  const lineRef = useRef(null);
  const [pathLen, setPathLen] = useState(0);
  const [drawn, setDrawn] = useState(false);
  const [hover, setHover] = useState(null);
  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
    []
  );

  const W = 320, H = 220;
  const pad = { l: 34, r: 16, t: 16, b: 28 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  const [yMin, yMax] = yDomain;
  const [xMin, xMax] = xDomain;
  const xRange = Math.max(1, xMax - xMin);
  const yRange = Math.max(1, yMax - yMin);

  const sx = (t) => pad.l + ((t - xMin) / xRange) * plotW;
  const sy = (s) => pad.t + plotH - ((s - yMin) / yRange) * plotH;

  const linePath = useMemo(() => {
    if (!series.length) return '';
    return series.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.t).toFixed(1)},${sy(p.score).toFixed(1)}`).join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, xDomain, yDomain]);

  const areaPath = useMemo(() => {
    if (!series.length) return '';
    const top = series.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.t).toFixed(1)},${sy(p.score).toFixed(1)}`).join(' ');
    return `${top} L${sx(series[series.length - 1].t).toFixed(1)},${(pad.t + plotH).toFixed(1)} L${sx(series[0].t).toFixed(1)},${(pad.t + plotH).toFixed(1)} Z`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, xDomain, yDomain]);

  // Measure path length for the draw animation; retrigger on preset/series change.
  useEffect(() => {
    if (lineRef.current && typeof lineRef.current.getTotalLength === 'function') {
      const len = lineRef.current.getTotalLength() || 0;
      setPathLen(len);
      setDrawn(false);
      const id = requestAnimationFrame(() => setDrawn(true));
      return () => cancelAnimationFrame(id);
    }
  }, [linePath]);

  const dashOffset = reduced || drawn ? 0 : pathLen;
  const lineStyle = reduced
    ? {}
    : { strokeDasharray: pathLen ? pathLen : 'none', strokeDashoffset: dashOffset, transition: 'stroke-dashoffset 750ms cubic-bezier(0.16,1,0.3,1)', transitionDelay: '100ms' };

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => sy(yMin + f * yRange));
  const xFmt = xLabelFormat(presetId);
  const xTicks = useMemo(() => {
    const out = [];
    for (let i = 0; i < 4; i++) {
      const t = xMin + (xRange * i) / 3;
      out.push({ x: sx(t), label: xFmt(new Date(t)) });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xDomain, presetId]);

  const extrapLines = useMemo(() => {
    if (!series.length || !extrapolations) return [];
    const last = series[series.length - 1];
    const x0 = sx(last.t), y0 = sy(last.score), x1 = sx(xMax);
    const lines = [];
    if (extrapolations.brush != null) lines.push({ type: 'brush', x0, y0, x1, y1: sy(extrapolations.brush) });
    if (extrapolations.water != null) lines.push({ type: 'water', x0, y0, x1, y1: sy(extrapolations.water) });
    if (extrapolations.mouthwash != null) lines.push({ type: 'mouthwash', x0, y0, x1, y1: sy(extrapolations.mouthwash) });
    return lines;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, extrapolations, xDomain, yDomain]);

  const liveMarker = extrapolations && series.length ? { x: sx(xMax), y: sy(extrapolations.liveEstimate) } : null;
  const baselineY = baselineScore != null ? sy(baselineScore) : null;

  const onMove = (e) => {
    if (!series.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = null, bestD = Infinity;
    series.forEach((p) => { const d = Math.abs(sx(p.t) - px); if (d < bestD) { bestD = d; nearest = p; } });
    setHover(nearest ? { point: nearest, x: sx(nearest.t), y: sy(nearest.score) } : null);
  };

  const legendItems = extrapLines.map((l) => ({ color: ACTION_COLORS[l.type], label: ACTION_LABELS[l.type] }));

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto touch-pan-x" role="img" aria-label="Shade trend graph"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)} onTouchStart={onMove}>
        <defs>
          <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--olo))" stopOpacity="0.18" />
            <stop offset="100%" stopColor="hsl(var(--olo))" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridLines.map((y, i) => (
          <line key={i} x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="hsl(var(--border))" strokeWidth="1" className="trend-grid" />
        ))}

        {xTicks.map((t, i) => (
          <text key={i} x={t.x} y={H - 8} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">{t.label}</text>
        ))}
        <text x={pad.l - 6} y={pad.t + 4} textAnchor="end" fontSize="9" fill="hsl(var(--muted-foreground))">{Math.round(yMax)}</text>
        <text x={pad.l - 6} y={pad.t + plotH + 3} textAnchor="end" fontSize="9" fill="hsl(var(--muted-foreground))">{Math.round(yMin)}</text>

        {baselineY != null && (
          <line x1={pad.l} x2={W - pad.r} y1={baselineY} y2={baselineY} stroke="hsl(var(--olo))" strokeWidth="1" strokeDasharray="4 4" opacity="0.45" />
        )}

        {areaPath && <path d={areaPath} fill="url(#trendArea)" className="trend-area" />}

        {linePath && (
          <path ref={lineRef} d={linePath} fill="none" stroke="hsl(var(--olo))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={lineStyle} />
        )}

        {series.map((p, i) => (
          <circle key={i} cx={sx(p.t)} cy={sy(p.score)} r="3.5" fill="hsl(var(--olo))" stroke="hsl(var(--card))" strokeWidth="1.5"
            className="trend-point" style={{ animationDelay: `${300 + i * 60}ms` }} />
        ))}

        {extrapLines.map((l) => (
          <line key={l.type} x1={l.x0} y1={l.y0} x2={l.x1} y2={l.y1}
            stroke={ACTION_COLORS[l.type]} strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" opacity="0.85" />
        ))}

        {liveMarker && (
          <circle cx={liveMarker.x} cy={liveMarker.y} r="4.5" fill="hsl(var(--card))" stroke="hsl(var(--olo))" strokeWidth="2" />
        )}

        {hover && (
          <g>
            <line x1={hover.x} x2={hover.x} y1={pad.t} y2={pad.t + plotH} stroke="hsl(var(--foreground))" strokeWidth="1" opacity="0.2" />
            <circle cx={hover.x} cy={hover.y} r="5" fill="hsl(var(--olo))" stroke="hsl(var(--card))" strokeWidth="2" />
          </g>
        )}
      </svg>

      {hover && hover.point && (
        <div className="mt-2 px-3 py-2 rounded-xl bg-card border border-border text-xs">
          <span className="font-medium">{new Date(hover.point.t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric' })}</span>
          {' · '}
          <span className="text-olo font-semibold">{hover.point.scan?.shade || '—'}</span>
          {' · '}
          <span className="text-muted-foreground">Score {hover.point.score}</span>
        </div>
      )}

      {legendItems.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {legendItems.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-4 h-0.5 rounded-full" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full border-2 border-olo bg-card" />
            Estimated now
          </span>
        </div>
      )}
    </div>
  );
}