// Compact, glanceable "widget" stat card — Box Box Club inspired.
// One icon, one big tabular value, one label. Themed accent keeps the
// dashboard's stat grids consistent and scannable at a glance.
export default function StatWidget({ icon: Icon, value, label, accent = 'olo' }) {
  const accents = {
    olo: { ring: 'border-olo/20', iconBg: 'bg-olo/10', iconColor: 'text-olo', valueColor: 'text-olo' },
    success: { ring: 'border-success/20', iconBg: 'bg-success/10', iconColor: 'text-success', valueColor: 'text-success' },
    muted: { ring: 'border-border', iconBg: 'bg-muted', iconColor: 'text-muted-foreground', valueColor: 'text-foreground' },
  };
  const a = accents[accent] || accents.olo;
  return (
    <div className={`relative p-4 rounded-2xl border ${a.ring} bg-card frost-edge overflow-hidden`}>
      <span className={`w-8 h-8 rounded-lg ${a.iconBg} flex items-center justify-center mb-2`}>
        <Icon className={`w-4 h-4 ${a.iconColor}`} />
      </span>
      <p className={`text-2xl font-heading font-700 leading-none tabular-nums ${a.valueColor}`}>{value}</p>
      <p className="text-label text-muted-foreground mt-2">{label}</p>
    </div>
  );
}