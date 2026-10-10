// Mini data visualizations for dashboard tip cards.
// Each chart_type renders a small responsive SVG (viewBox 0 0 280 140) using
// the app's olo-themed color tokens. Charts are educational illustrations with
// built-in sample data (not user-specific). Every chart has an accessible
// aria-label so the information is never chart-only.

const W = 280, H = 140, PAD = { l: 28, r: 12, t: 14, b: 22 };

function LineChart({ points, yMax, yLabel, xLabels, color = 'hsl(var(--olo))', area = true }) {
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const sx = (i) => PAD.l + (i / (points.length - 1)) * plotW;
  const sy = (v) => PAD.t + plotH - (v / yMax) * plotH;
  const line = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(' ');
  const areaPath = `${line} L${sx(points.length - 1).toFixed(1)},${(PAD.t + plotH).toFixed(1)} L${sx(0).toFixed(1)},${(PAD.t + plotH).toFixed(1)} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img">
      <defs>
        <linearGradient id="tipChartArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f) => (
        <line key={f} x1={PAD.l} x2={W - PAD.r} y1={PAD.t + f * plotH} y2={PAD.t + f * plotH} stroke="hsl(var(--border))" strokeWidth="1" />
      ))}
      {area && <path d={areaPath} fill="url(#tipChartArea)" />}
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((v, i) => (
        <circle key={i} cx={sx(i)} cy={sy(v)} r="3" fill={color} stroke="hsl(var(--card))" strokeWidth="1.5" />
      ))}
      {xLabels.map((label, i) => (
        <text key={i} x={sx(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">{label}</text>
      ))}
      <text x={PAD.l - 4} y={PAD.t + 4} textAnchor="end" fontSize="9" fill="hsl(var(--muted-foreground))">{yMax}</text>
      <text x={PAD.l - 4} y={PAD.t + plotH + 3} textAnchor="end" fontSize="9" fill="hsl(var(--muted-foreground))">0</text>
    </svg>
  );
}

function BarChart({ bars, yMax, xLabels, color = 'hsl(var(--olo))' }) {
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const bw = plotW / bars.length * 0.6;
  const gap = plotW / bars.length;
  const sy = (v) => PAD.t + plotH - (v / yMax) * plotH;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img">
      <defs>
        <linearGradient id="tipBarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="0.5" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f) => (
        <line key={f} x1={PAD.l} x2={W - PAD.r} y1={PAD.t + f * plotH} y2={PAD.t + f * plotH} stroke="hsl(var(--border))" strokeWidth="1" />
      ))}
      {bars.map((v, i) => {
        const x = PAD.l + i * gap + (gap - bw) / 2;
        const y = sy(v);
        return <rect key={i} x={x} y={y} width={bw} height={PAD.t + plotH - y} rx="3" fill="url(#tipBarGrad)" />;
      })}
      {xLabels.map((label, i) => (
        <text key={i} x={PAD.l + i * gap + gap / 2} y={H - 6} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">{label}</text>
      ))}
      <text x={PAD.l - 4} y={PAD.t + 4} textAnchor="end" fontSize="9" fill="hsl(var(--muted-foreground))">{yMax}</text>
      <text x={PAD.l - 4} y={PAD.t + plotH + 3} textAnchor="end" fontSize="9" fill="hsl(var(--muted-foreground))">0</text>
    </svg>
  );
}

function DualLineChart({ line1, line2, yMax, xLabels, color1 = 'hsl(var(--olo))', color2 = '#f59e0b' }) {
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const sx = (i) => PAD.l + (i / (line1.length - 1)) * plotW;
  const sy = (v) => PAD.t + plotH - (v / yMax) * plotH;
  const p1 = line1.map((v, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(' ');
  const p2 = line2.map((v, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img">
      {[0, 0.5, 1].map((f) => (
        <line key={f} x1={PAD.l} x2={W - PAD.r} y1={PAD.t + f * plotH} y2={PAD.t + f * plotH} stroke="hsl(var(--border))" strokeWidth="1" />
      ))}
      <path d={p1} fill="none" stroke={color1} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={p2} fill="none" stroke={color2} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" />
      {xLabels.map((label, i) => (
        <text key={i} x={sx(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">{label}</text>
      ))}
      <text x={PAD.l - 4} y={PAD.t + 4} textAnchor="end" fontSize="9" fill="hsl(var(--muted-foreground))">{yMax}</text>
      <text x={PAD.l - 4} y={PAD.t + plotH + 3} textAnchor="end" fontSize="9" fill="hsl(var(--muted-foreground))">0</text>
    </svg>
  );
}

const CHART_CONFIG = {
  plaque_buildup: {
    render: () => (
      <LineChart
        points={[5, 12, 22, 35, 48, 62, 78]}
        yMax={80}
        xLabels={['Day 1', '3', '5', '7']}
        color="hsl(var(--olo))"
      />
    ),
    legend: [
      { color: 'hsl(var(--olo))', label: 'Plaque coverage (%)' },
    ],
    caption: 'Plaque accumulates fast without brushing — by day 7, most surfaces are coated.',
  },
  brush_vs_stain: {
    render: () => (
      <DualLineChart
        line1={[70, 55, 42, 30, 22, 16, 10]}
        line2={[30, 38, 44, 50, 55, 58, 60]}
        yMax={80}
        xLabels={['Wk 1', '2', '3', '4', '5', '6', '7']}
      />
    ),
    legend: [
      { color: 'hsl(var(--olo))', label: 'Stain score' },
      { color: '#f59e0b', label: 'Brushing frequency', dashed: true },
    ],
    caption: 'Consistent brushing drives stain scores down within weeks.',
  },
  water_drymouth: {
    render: () => (
      <BarChart
        bars={[20, 35, 50, 65, 78]}
        yMax={80}
        xLabels={['1', '2', '3', '4', '5+']}
        color="hsl(var(--olo))"
      />
    ),
    legend: [
      { color: 'hsl(var(--olo))', label: 'Hydration level' },
    ],
    caption: 'More glasses of water means more saliva and less dry-mouth risk.',
  },
  sugar_timeline: {
    render: () => (
      <LineChart
        points={[10, 45, 30, 60, 25, 70, 35, 15]}
        yMax={80}
        xLabels={['6am', '9', '12', '3pm', '6', '9pm', '12', '3']}
        color="#f59e0b"
      />
    ),
    legend: [
      { color: '#f59e0b', label: 'Sugar exposure' },
    ],
    caption: 'Sugar spikes after meals and snacks. Waiting 30 minutes lets enamel recover before brushing.',
  },
};

export default function TipChart({ chartType, chartLabel }) {
  if (!chartType || chartType === 'none') return null;
  const config = CHART_CONFIG[chartType];
  if (!config) return null;
  return (
    <div className="mt-3 p-3 rounded-xl bg-muted/30 border border-border/50">
      <div role="img" aria-label={chartLabel || config.caption}>
        {config.render()}
      </div>
      {config.legend && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {config.legend.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className={`w-3 h-0.5 rounded-full ${l.dashed ? 'border-t-2 border-dashed' : ''}`} style={{ background: l.color, borderColor: l.dashed ? l.color : undefined }} />
              {l.label}
            </span>
          ))}
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">{config.caption}</p>
    </div>
  );
}