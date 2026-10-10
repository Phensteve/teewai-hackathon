import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useScans } from '@/hooks/use-scans';

const METRICS = {
  score: { label: 'Whiteness score', key: (s) => s.score },
  health: { label: 'Dental health', key: (s) => s.dental_health_score },
  gum: { label: 'Gum health', key: (s) => s.gum_health_score ?? s.gum_score },
};

export default function ChatChart({ since, metric = 'score' }) {
  const { data: scans = [], isLoading } = useScans();
  const m = METRICS[metric] || METRICS.score;
  const points = useMemo(() => scans
    .filter((s) => m.key(s) != null && (!since || new Date(s.created_date) >= new Date(since)))
    .map((s) => ({ t: new Date(s.created_date).getTime(), v: Math.round(m.key(s)) }))
    .sort((a, b) => a.t - b.t), [scans, since, m]);

  if (isLoading) return <div className="mt-3 h-40 rounded-xl bg-muted animate-pulse" />;
  if (points.length < 2) {
    return <p className="mt-3 text-xs text-muted-foreground rounded-xl bg-muted/60 px-3 py-2.5">Not enough scans {since ? `since ${format(new Date(since), 'd MMM yyyy')}` : 'yet'} to draw a trend. Take another scan to start one.</p>;
  }
  const first = points[0].v, last = points[points.length - 1].v, delta = last - first;
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  return (
    <div className="mt-3 rounded-xl border border-border bg-background p-3">
      <div className="flex items-end justify-between mb-2">
        <div>
          <p className="text-label text-muted-foreground">{m.label}</p>
          <p className="text-[11px] text-muted-foreground">{format(points[0].t, 'd MMM')} – {format(points[points.length - 1].t, 'd MMM yyyy')} · {points.length} scans</p>
        </div>
        <div className={`flex items-center gap-1 text-sm font-semibold tabular-nums ${delta > 0 ? 'text-success' : delta < 0 ? 'text-danger' : 'text-muted-foreground'}`}>
          <Icon className="w-4 h-4" />{delta > 0 ? '+' : ''}{delta}
        </div>
      </div>
      <div className="h-40 -ml-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points}>
            <defs>
              <linearGradient id="chatFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--olo))" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(var(--olo))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(t) => format(t, 'd MMM')} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis domain={[0, 100]} width={32} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <Tooltip labelFormatter={(t) => format(t, 'd MMM yyyy, HH:mm')} formatter={(v) => [v, m.label]} contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
            <Area type="monotone" dataKey="v" stroke="hsl(var(--olo))" strokeWidth={2} fill="url(#chatFill)" dot={{ r: 2.5, fill: 'hsl(var(--olo))' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}