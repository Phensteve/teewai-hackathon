// WeekStainHistory — the 7-day chart + summary for the stain tracker.
// The full expandable history list now lives on its own page (/food-history);
// this component shows a compact "View full history" link instead of the
// endless scroll, keeping the stain tracker page short.

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { Flame, ArrowRight } from 'lucide-react';
import { saturateStainLoad } from '@/lib/stainLoad';

const stainHex = (lvl) =>
  lvl >= 60 ? '#f43f5e' : lvl >= 30 ? '#f59e0b' : lvl > 0 ? '#14b8a6' : '#94a3b8';

const dayLabel = (d) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' });

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const stain = payload.find((p) => p.dataKey === 'stain')?.value || 0;
  const kcal = payload.find((p) => p.dataKey === 'kcal')?.value || 0;
  return (
    <div className="rounded-xl border border-border bg-popover/95 backdrop-blur px-3 py-2 shadow-lg">
      <p className="text-[11px] font-semibold text-foreground mb-1">{label}</p>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="w-2 h-2 rounded-full" style={{ background: stainHex(stain) }} />
        <span>{stain} stain load</span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
        <Flame className="w-2.5 h-2.5 text-amber-500" />
        <span>{kcal} kcal</span>
      </div>
    </div>
  );
}

export default function WeekStainHistory({ logs }) {
  const [view, setView] = useState('stain');

  // Last 7 calendar days — drives the chart.
  const chartDays = useMemo(() => {
    // Group logs by date in a single pass, then read each of the 7 days from
    // the map — O(n) instead of 7 full filter scans (O(7n)) over the log list.
    const byDate = new Map();
    for (const l of logs) {
      const d = l.log_date;
      if (!d) continue;
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d).push(l);
    }
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const dayLogs = byDate.get(d) || [];
      const stain = saturateStainLoad(dayLogs.reduce((s, l) => s + (l.stain_level || 0), 0));
      const kcal = dayLogs.reduce((s, l) => s + (l.calories || 0), 0);
      out.push({ date: d, label: dayLabel(d), stain, kcal, items: dayLogs });
    }
    return out;
  }, [logs]);

  // Count of distinct logged days (for the history link label).
  const historyDayCount = useMemo(() => {
    const set = new Set();
    for (const l of logs) { if (l.log_date) set.add(l.log_date); }
    return set.size;
  }, [logs]);

  const chartData = chartDays.map((d) => ({ name: d.label, stain: d.stain, kcal: d.kcal, date: d.date }));
  const todayStr = new Date().toISOString().slice(0, 10);

  const totalStain = chartDays.reduce((s, d) => s + d.stain, 0);
  const totalKcal = chartDays.reduce((s, d) => s + d.kcal, 0);
  const avgStain = Math.round(totalStain / 7);
  const activeDays = chartDays.filter((d) => d.items?.length > 0 || d.stain > 0 || d.kcal > 0).length;

  return (
    <div className="mt-4 p-5 rounded-3xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="font-heading font-700 text-lg tracking-tight">Last 7 days</h2>
          <p className="text-xs text-muted-foreground">Stain load & calories at a glance.</p>
        </div>
        <div className="flex p-0.5 rounded-full bg-muted text-[11px] font-semibold">
          <button
            onClick={() => setView('stain')}
            className={`px-2.5 py-1 rounded-full transition-all ${view === 'stain' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            Stain
          </button>
          <button
            onClick={() => setView('kcal')}
            className={`px-2.5 py-1 rounded-full transition-all ${view === 'kcal' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            Kcal
          </button>
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="rounded-2xl bg-muted/50 px-3 py-2 border-l-2" style={{ borderColor: '#14b8a6' }}>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg stain</p>
          <p className="font-heading font-700 text-base text-foreground">{avgStain}</p>
        </div>
        <div className="rounded-2xl bg-muted/50 px-3 py-2 border-l-2" style={{ borderColor: '#f59e0b' }}>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total kcal</p>
          <p className="font-heading font-700 text-base text-foreground">{totalKcal.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl bg-muted/50 px-3 py-2 border-l-2 border-olo">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Active days</p>
          <p className="font-heading font-700 text-base text-foreground">{activeDays}/7</p>
        </div>
      </div>

      {/* Combined chart */}
      <div className="mt-4">
        <ResponsiveContainer width="100%" height={184}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 2, bottom: 0 }}>
            <defs>
              <linearGradient id="stainGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.45} />
              </linearGradient>
              <linearGradient id="kcalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.45} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              width={44}
              label={{ value: view === 'stain' ? 'Stain load' : 'Calories', angle: -90, position: 'insideLeft', offset: 2, style: { fontSize: 9, fill: 'hsl(var(--muted-foreground))', textAnchor: 'middle' } }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              width={40}
              label={{ value: view === 'stain' ? 'Calories' : 'Stain load', angle: 90, position: 'insideRight', offset: 2, style: { fontSize: 9, fill: 'hsl(var(--muted-foreground))', textAnchor: 'middle' } }}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
            <Bar yAxisId="left" dataKey={view === 'stain' ? 'stain' : 'kcal'} radius={[5, 5, 0, 0]} maxBarSize={32}>
              {chartData.map((d) => {
                const hex = view === 'stain' ? stainHex(d.stain) : (d.kcal > 0 ? '#f59e0b' : '#94a3b8');
                return <Cell key={d.date} fill={hex} fillOpacity={d.date === todayStr ? 1 : 0.82} />;
              })}
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey={view === 'stain' ? 'kcal' : 'stain'}
              stroke={view === 'stain' ? '#f59e0b' : '#14b8a6'}
              strokeWidth={2}
              dot={{ r: 2.5, fill: view === 'stain' ? '#f59e0b' : '#14b8a6' }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-1 mb-3">
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: view === 'stain' ? '#14b8a6' : '#f59e0b' }} />
          {view === 'stain' ? 'Stain load' : 'Calories'}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="w-3 h-0.5 rounded-full" style={{ background: view === 'stain' ? '#f59e0b' : '#14b8a6' }} />
          {view === 'stain' ? 'Calories' : 'Stain load'}
        </span>
      </div>

      {/* Link to full history page */}
      <Link
        to="/food-history"
        className="mt-2 flex items-center justify-between p-3.5 rounded-2xl bg-olo/5 border border-olo/20 hover:bg-olo/10 transition-colors group"
      >
        <div>
          <p className="text-sm font-medium text-olo">View full history</p>
          <p className="text-[11px] text-muted-foreground">
            {historyDayCount > 0
              ? `${historyDayCount} day${historyDayCount === 1 ? '' : 's'} of food scans`
              : 'No history yet — start scanning'}
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-olo group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
}