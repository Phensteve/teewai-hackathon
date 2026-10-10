import { useMemo, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, DollarSign } from 'lucide-react';

const RANGES = [
  { id: '28', label: '28D', days: 28 },
  { id: '90', label: '90D', days: 90 },
  { id: '365', label: '12M', days: 365 },
  { id: 'all', label: 'All time', days: null },
];
const GRANS = [
  { id: 'day', label: 'Daily' },
  { id: 'week', label: 'Weekly' },
  { id: 'month', label: 'Monthly' },
];

function startOfBucket(date, gran) {
  const x = new Date(date);
  x.setHours(0, 0, 0, 0);
  if (gran === 'week') x.setDate(x.getDate() - x.getDay());
  if (gran === 'month') x.setDate(1);
  return x;
}
function nextBucket(d, gran) {
  const x = new Date(d);
  if (gran === 'day') x.setDate(x.getDate() + 1);
  else if (gran === 'week') x.setDate(x.getDate() + 7);
  else x.setMonth(x.getMonth() + 1);
  return x;
}
function fmtBucket(d, gran) {
  if (gran === 'month') return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ChartTooltip({ active, payload, label, fmt, seriesLabel }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className="font-semibold text-foreground">{fmt(payload[0].value)} <span className="font-normal text-muted-foreground">{seriesLabel}</span></p>
    </div>
  );
}

export default function AdminAnalytics({ users = [], revenueEvents = [] }) {
  const [metric, setMetric] = useState('users');
  const [mode, setMode] = useState('cumulative');
  const [gran, setGran] = useState('day');
  const [range, setRange] = useState('90');
  const [revMode, setRevMode] = useState('net'); // net (after coupons) | gross (before)

  const events = useMemo(() => {
    if (metric === 'users') {
      return users.filter((u) => u.created_at).map((u) => ({ date: new Date(u.created_at), value: 1 }));
    }
    return revenueEvents.filter((e) => e.date).map((e) => ({ date: new Date(e.date), value: Number(revMode === 'gross' ? e.gross_usd : e.amount_usd) || 0 }));
  }, [metric, users, revenueEvents, revMode]);

  const { data, headline } = useMemo(() => {
    const now = new Date();
    const rangeDef = RANGES.find((r) => r.id === range);
    let start;
    if (rangeDef.days) {
      start = new Date(now);
      start.setDate(start.getDate() - rangeDef.days);
    } else {
      start = events.length ? new Date(Math.min(...events.map((e) => e.date.getTime()))) : new Date(now);
    }
    start = startOfBucket(start, gran);

    let baseline = 0;
    let rangeSum = 0;
    const bucketSums = new Map();
    for (const e of events) {
      if (e.date < start) { baseline += e.value; continue; }
      const key = startOfBucket(e.date, gran).getTime();
      bucketSums.set(key, (bucketSums.get(key) || 0) + e.value);
      rangeSum += e.value;
    }

    const rows = [];
    let running = baseline;
    for (let d = new Date(start); d <= now && rows.length < 400; d = nextBucket(d, gran)) {
      const v = bucketSums.get(d.getTime()) || 0;
      running += v;
      rows.push({ label: fmtBucket(d, gran), value: mode === 'cumulative' ? Math.round(running * 100) / 100 : Math.round(v * 100) / 100 });
    }
    return { data: rows, headline: mode === 'cumulative' ? baseline + rangeSum : rangeSum };
  }, [events, gran, range, mode]);

  const isRevenue = metric === 'revenue';
  const fmt = (v) => (isRevenue ? `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : Number(v).toLocaleString());
  const seriesLabel = isRevenue ? 'revenue' : mode === 'cumulative' ? 'total users' : 'new users';
  const color = '#0d9f8e';

  const Pill = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
        active ? 'bg-olo text-white' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card mb-6">
      {/* Metric selector — YouTube-Studio-style headline tabs */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { id: 'users', label: 'User growth', icon: Users, value: metric === 'users' ? fmt(headline) : users.length.toLocaleString() },
          { id: 'revenue', label: 'Revenue', icon: DollarSign, value: metric === 'revenue' ? fmt(headline) : `$${revenueEvents.reduce((s, e) => s + (Number(e.amount_usd) || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
        ].map(({ id, label, icon: Icon, value }) => (
          <button
            key={id}
            onClick={() => setMetric(id)}
            className={`p-4 rounded-2xl border text-left transition-all ${
              metric === id ? 'border-olo bg-olo/5' : 'border-border hover:border-olo/40'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider mb-1">
              <Icon className="w-3.5 h-3.5" /> {label}
            </div>
            <p className={`font-heading font-700 text-xl sm:text-2xl ${metric === id ? 'text-olo' : 'text-foreground'}`}>{value}</p>
            {metric === id && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {mode === 'cumulative' ? 'Total to date' : `In selected range`}
              </p>
            )}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-1">
          <Pill active={mode === 'cumulative'} onClick={() => setMode('cumulative')}>Cumulative</Pill>
          <Pill active={mode === 'period'} onClick={() => setMode('period')}>Per period</Pill>
        </div>
        <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-1">
          {GRANS.map((g) => (
            <Pill key={g.id} active={gran === g.id} onClick={() => setGran(g.id)}>{g.label}</Pill>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-1">
          {RANGES.map((r) => (
            <Pill key={r.id} active={range === r.id} onClick={() => setRange(r.id)}>{r.label}</Pill>
          ))}
        </div>
        {isRevenue && (
          <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-1">
            <Pill active={revMode === 'net'} onClick={() => setRevMode('net')}>After coupons</Pill>
            <Pill active={revMode === 'gross'} onClick={() => setRevMode('gross')}>Before coupons</Pill>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="h-[280px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          {mode === 'cumulative' ? (
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="oloFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#8888882a" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#888' }} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => (isRevenue ? `$${v}` : v)} allowDecimals={false} />
              <Tooltip content={<ChartTooltip fmt={fmt} seriesLabel={seriesLabel} />} />
              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill="url(#oloFill)" activeDot={{ r: 4 }} />
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#8888882a" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#888' }} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => (isRevenue ? `$${v}` : v)} allowDecimals={false} />
              <Tooltip content={<ChartTooltip fmt={fmt} seriesLabel={seriesLabel} />} cursor={{ fill: '#0d9f8e14' }} />
              <Bar dataKey="value" fill={color} radius={[5, 5, 0, 0]} maxBarSize={36} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        {isRevenue
          ? `${revMode === 'gross' ? 'Gross (list price before coupons)' : 'Net (collected after coupons)'} — from recorded purchases.`
          : 'Based on account creation dates.'}
      </p>
    </div>
  );
}