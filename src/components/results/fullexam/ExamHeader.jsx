import { Stethoscope } from 'lucide-react';

// Summary band: the whole-mouth narrative + coverage stats.
export default function ExamHeader({ report }) {
  const c = report.coverage || {};
  const stats = [
    { label: 'Teeth charted', value: c.teeth_charted ?? '—' },
    { label: 'Surfaces seen', value: c.surfaces_examined?.length ?? '—' },
    { label: 'Mouth readable', value: c.completeness != null ? `${Math.round(c.completeness)}%` : '—' },
  ];
  return (
    <div className="mb-4 p-5 rounded-2xl bg-olo-deep text-white">
      <div className="flex items-center gap-2 mb-2">
        <Stethoscope className="w-4 h-4 text-olo-glow" />
        <span className="text-label text-olo-glow">Full-mouth exam · 5 angles</span>
      </div>
      {report.exam_summary && <p className="text-caption text-white/85 leading-relaxed mb-4">{report.exam_summary}</p>}
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-center">
            <p className="font-heading font-700 text-xl tabular-nums">{s.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/60">{s.label}</p>
          </div>
        ))}
      </div>
      {c.surfaces_examined?.length > 0 && (
        <p className="mt-3 text-[11px] text-white/60 capitalize">Surfaces: {c.surfaces_examined.join(', ')}</p>
      )}
    </div>
  );
}