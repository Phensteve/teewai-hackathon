import { useEffect, useState, useMemo } from 'react';
import { adminAuth } from '@/lib/adminAuth';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Loader2 } from 'lucide-react';

// 30-day site traffic graph — unique sessions per day, aggregated from the
// site_visitors table. Polls every 60s.
export default function TrafficChart() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await adminAuth.visitorTraffic();
      setData(res.traffic || []);
      setError('');
    } catch (e) {
      setError(e?.message || 'Could not load traffic data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.map((d) => ({
      label: new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      visitors: d.visitors,
    }));
  }, [data]);

  const total = useMemo(() => (data || []).reduce((s, d) => s + (d.visitors || 0), 0), [data]);

  return (
    <div className="p-5 sm:p-6 rounded-3xl border border-border bg-card mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-olo" />
          <h2 className="font-heading font-600 text-lg">Site traffic</h2>
        </div>
        <span className="text-xs text-muted-foreground">{total.toLocaleString()} visitors · 30 days</span>
      </div>
      {loading && !data ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /></div>
      ) : error ? (
        <p className="text-sm text-destructive text-center py-10">{error}</p>
      ) : chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">No traffic data yet. Visitor sessions appear here as people browse the site.</p>
      ) : (
        <div className="h-[220px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d9f8e" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#0d9f8e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#8888882a" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#888' }} tickLine={false} axisLine={false} minTickGap={28} />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
              <Tooltip
                content={({ active: a, payload, label }) => a && payload?.length ? (
                  <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg text-xs">
                    <p className="text-muted-foreground mb-0.5">{label}</p>
                    <p className="font-semibold text-foreground">{payload[0].value} <span className="font-normal text-muted-foreground">visitors</span></p>
                  </div>
                ) : null}
              />
              <Area type="monotone" dataKey="visitors" stroke="#0d9f8e" strokeWidth={2.5} fill="url(#trafficFill)" activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mt-2">Unique sessions per day. Updates every 60s.</p>
    </div>
  );
}