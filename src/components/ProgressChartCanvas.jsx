// The recharts-heavy chart canvas, lazy-loaded by ProgressChart so the
// recharts chunk (~400KB) only downloads when a user actually has ≥2 scans.
// Brand-new users (0–1 scans) never load recharts on the Dashboard.
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const customTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-lg text-xs">
      <p className="font-medium text-foreground mb-1">{d.date}</p>
      <p className="text-muted-foreground">
        Shade <span className="font-semibold text-olo">{d.shade || '—'}</span>
        {d.shadeCode && <span className="text-muted-foreground"> · {d.shadeCode}</span>}
      </p>
      <p className="text-muted-foreground">Whiteness <span className="font-semibold text-olo">{d.whiteness}</span></p>
      <p className="text-muted-foreground">True trend <span className="font-semibold text-foreground">{d.trend}</span></p>
      <p className="text-muted-foreground">Health <span className="font-semibold text-emerald-500">{d.health}</span></p>
      {d.potential != null && (
        <p className="text-muted-foreground">Target <span className="font-semibold text-foreground">{d.potential}</span></p>
      )}
    </div>
  );
};

export default function ProgressChartCanvas({ data }) {
  const first = data[0].whiteness;
  const last = data[data.length - 1].whiteness;
  const delta = last - first;
  const best = Math.max(...data.map((d) => d.whiteness));
  const worst = Math.min(...data.map((d) => d.whiteness));
  const potential = data[data.length - 1].potential;

  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const deltaColor = delta > 0 ? 'text-olo' : delta < 0 ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-olo" />
          <h3 className="font-heading font-600 text-lg">Shade progression over time</h3>
        </div>
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${deltaColor}`}>
          <DeltaIcon className="w-4 h-4" />
          {delta > 0 ? '+' : ''}{delta} pts
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        {data[0].shade || '—'} → {data[data.length - 1].shade || '—'} · best {best} · lowest {worst}
      </p>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="whitenessFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--olo))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--olo))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="healthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(160 84% 39%)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="hsl(160 84% 39%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
          {potential != null && (
            <ReferenceLine y={potential} stroke="hsl(var(--foreground))" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: 'target', position: 'right', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
          )}
          <Tooltip content={customTooltip} />
          <Area type="monotone" dataKey="whiteness" stroke="hsl(var(--olo))" strokeWidth={3} fill="url(#whitenessFill)" dot={{ fill: 'hsl(var(--olo))', r: 4 }} activeDot={{ r: 6 }} name="Whiteness" />
          <Line type="monotone" dataKey="trend" stroke="hsl(var(--foreground))" strokeWidth={2} strokeDasharray="5 4" dot={false} name="True trend" />
          <Area type="monotone" dataKey="health" stroke="hsl(160 84% 39%)" strokeWidth={2} fill="url(#healthFill)" dot={{ fill: 'hsl(160 84% 39%)', r: 3 }} activeDot={{ r: 5 }} name="Dental Health" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}