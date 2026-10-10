export default function DashboardHeroStats({ latest, streak, improvement, scansReady = true }) {
  if (!latest && scansReady) return null;
  const change = scansReady && improvement > 0 ? `+${improvement}` : scansReady ? improvement || '—' : '—';
  const stats = [
    { label: 'Whiteness', value: latest?.score ?? '—', on: true },
    { label: 'Shade', value: latest?.shade || '—', on: true },
    { label: 'Streak', value: scansReady ? `${streak}d` : '—', on: scansReady && streak > 0 },
    { label: 'Change', value: change, on: improvement > 0 },
  ];
  return (
    <div className="grid grid-cols-4 divide-x divide-border rounded-2xl border border-border bg-card mb-4 py-3">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col items-center justify-center px-1 min-w-0">
          <span className={`font-heading font-700 text-xl sm:text-2xl tabular-nums leading-none ${s.on ? 'text-olo' : 'text-foreground'}`}>{s.value}</span>
          <span className="mt-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-muted-foreground truncate">{s.label}</span>
        </div>
      ))}
    </div>
  );
}