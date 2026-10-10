import { Link } from 'react-router-dom';
import { Users, Smile, HeartPulse, Activity, CalendarClock, Clock, ArrowRight, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';

const todayStr = () => new Date().toISOString().slice(0, 10);
const isWithinDays = (dateStr, days) => {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(todayStr() + 'T00:00:00');
  const diff = (d - today) / 86400000;
  return diff >= 0 && diff < days;
};

// Practice KPI dashboard — the landing tab of the dentist portal. Surfaces the
// metrics that matter to a clinic (patient count, pending bookings, average
// whiteness/health across monitored scans), a practice-health strip
// (confirmation + cancellation rates, recent scan volume), today's schedule,
// the coming week, the pending booking review queue, and the latest patient
// scans. Grounded in dental-PMS dashboards (Dentrix / Oryx / CareStack).
export default function DentistOverview({ clients, appointments, scans, onGoTab }) {
  const today = todayStr();
  const pending = appointments.filter((a) => a.status === 'pending');
  const todays = appointments.filter((a) => a.requested_date === today && a.status !== 'cancelled');
  const weekAppts = appointments
    .filter((a) => isWithinDays(a.requested_date, 7) && a.status !== 'cancelled')
    .sort((a, b) => (a.requested_date || '').localeCompare(b.requested_date || '') || (a.requested_time || '').localeCompare(b.requested_time || ''));
  const confirmed = appointments.filter((a) => a.status === 'confirmed' || a.status === 'completed');
  const cancelled = appointments.filter((a) => a.status === 'cancelled');
  const confirmRate = appointments.length ? Math.round((confirmed.length / appointments.length) * 100) : null;
  const cancelRate = appointments.length ? Math.round((cancelled.length / appointments.length) * 100) : null;
  const now = Date.now();
  const scans30d = scans.filter((s) => s.created_date && now - new Date(s.created_date).getTime() < 30 * 86400000).length;
  const avgW = scans.length ? Math.round(scans.reduce((s, x) => s + (x.score || 0), 0) / scans.length) : null;
  const avgH = scans.length ? Math.round(scans.reduce((s, x) => s + (x.dental_health_score || 0), 0) / scans.length) : null;
  const recentScans = [...scans].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5);
  const clientName = (email) => clients.find((c) => c.client_email === email)?.client_name || email || 'Unknown';

  const kpis = [
    { Icon: Users, label: 'Patients', value: clients.length, tone: 'text-olo' },
    { Icon: CalendarClock, label: 'Pending bookings', value: pending.length, tone: pending.length ? 'text-amber-500' : 'text-olo' },
    { Icon: Smile, label: 'Avg whiteness', value: avgW ?? '—', tone: 'text-olo' },
    { Icon: HeartPulse, label: 'Avg health', value: avgH ?? '—', tone: 'text-emerald-500' },
  ];

  const health = [
    { Icon: CheckCircle2, label: 'Confirm rate', value: confirmRate != null ? `${confirmRate}%` : '—', tone: 'text-emerald-500' },
    { Icon: XCircle, label: 'Cancel rate', value: cancelRate != null ? `${cancelRate}%` : '—', tone: cancelRate > 20 ? 'text-rose-500' : 'text-muted-foreground' },
    { Icon: TrendingUp, label: 'Scans (30d)', value: scans30d, tone: 'text-olo' },
    { Icon: CalendarClock, label: 'This week', value: weekAppts.length, tone: 'text-olo' },
  ];

  const statusCls = (s) => s === 'confirmed' ? 'bg-olo/10 text-olo'
    : s === 'pending' ? 'bg-amber-500/10 text-amber-500'
    : s === 'completed' ? 'bg-emerald-500/10 text-emerald-500'
    : 'bg-rose-500/10 text-rose-500';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(({ Icon, label, value, tone }) => (
          <div key={label} className="p-4 rounded-2xl border border-border bg-card">
            <Icon className={`w-5 h-5 mb-2 ${tone}`} />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-2xl font-heading font-700">{value}</p>
          </div>
        ))}
      </div>

      {/* Practice-health strip — confirmation / cancellation rates + scan volume.
          These are the operational metrics real dental dashboards surface. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {health.map(({ Icon, label, value, tone }) => (
          <div key={label} className="p-3 rounded-2xl border border-border bg-muted/30 flex items-center gap-3">
            <Icon className={`w-4 h-4 flex-shrink-0 ${tone}`} />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{label}</p>
              <p className="font-heading font-700 text-base leading-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Today's schedule */}
      <div className="p-5 rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-600 text-base flex items-center gap-2"><Clock className="w-4 h-4 text-olo" /> Today's schedule</h2>
          <button onClick={() => onGoTab('appointments')} className="text-xs text-olo hover:underline">Manage →</button>
        </div>
        {todays.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No appointments today.</p>
        ) : (
          <div className="space-y-2">
            {todays.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                <div className="w-14 flex-shrink-0 text-center">
                  <p className="font-heading font-700 text-sm">{a.requested_time || '—'}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{clientName(a.patient_email)}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.reason || 'Consultation'}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusCls(a.status)}`}>{a.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* This week — the next 7 days, so the clinic sees what's coming, not just today */}
      <div className="p-5 rounded-2xl border border-border bg-card">
        <h2 className="font-heading font-600 text-base flex items-center gap-2 mb-3"><CalendarClock className="w-4 h-4 text-olo" /> This week</h2>
        {weekAppts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nothing booked in the next 7 days.</p>
        ) : (
          <div className="space-y-2">
            {weekAppts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                <div className="w-16 flex-shrink-0 text-center">
                  <p className="text-[10px] uppercase text-muted-foreground">{new Date(a.requested_date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' })}</p>
                  <p className="font-heading font-700 text-sm leading-tight">{new Date(a.requested_date + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric' })}</p>
                  <p className="text-[10px] text-muted-foreground">{a.requested_time || ''}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{clientName(a.patient_email)}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.reason || 'Consultation'}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusCls(a.status)}`}>{a.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending bookings review queue */}
      {pending.length > 0 && (
        <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5">
          <h2 className="font-heading font-600 text-base flex items-center gap-2 mb-3"><CalendarClock className="w-4 h-4 text-amber-500" /> {pending.length} pending booking{pending.length === 1 ? '' : 's'}</h2>
          <div className="space-y-2">
            {pending.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{clientName(a.patient_email)}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.requested_date}{a.requested_time && ` · ${a.requested_time}`}{a.reason && ` · ${a.reason}`}</p>
                </div>
                <button onClick={() => onGoTab('appointments')} className="text-xs font-medium text-olo hover:underline flex items-center gap-1 whitespace-nowrap">Review <ArrowRight className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent patient scans */}
      <div className="p-5 rounded-2xl border border-border bg-card">
        <h2 className="font-heading font-600 text-base flex items-center gap-2 mb-3"><Activity className="w-4 h-4 text-olo" /> Recent patient scans</h2>
        {recentScans.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No scans yet — when your patients scan, they'll appear here.</p>
        ) : (
          <div className="space-y-2">
            {recentScans.map((s) => (
              <Link key={s.id} to={`/results/${s.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-olo/5 transition-colors">
                <img src={s.image_url} alt="Scan" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-muted" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{clientName(s.patient_email)}</p>
                  <p className="text-xs text-muted-foreground truncate">{new Date(s.created_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · Shade {s.shade || '—'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-heading font-700 text-olo">{s.score ?? '—'}</p>
                  <p className="text-[10px] text-muted-foreground">whiteness</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}