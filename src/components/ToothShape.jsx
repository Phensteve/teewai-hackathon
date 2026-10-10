import { getHealthColor } from '@/lib/unrufldteeth';
import { whitenessColor } from '@/lib/unrufldteeth';

// One tooth rendered as an SVG crown. In "health" view it fills with a smooth
// vertical gradient blending its color_segments; in "shade" view it fills with
// the whiteness color for the whole tooth. `selected` adds a teewai highlight ring.

const SHAPES = {
  incisor: 'M18 16 Q18 10 26 10 H74 Q82 10 82 16 V64 Q82 96 50 100 Q18 96 18 64 Z',
  canine: 'M20 16 Q20 10 28 10 H72 Q80 10 80 16 V56 L50 106 L20 56 Z',
  premolar: 'M16 16 Q16 10 24 10 Q34 24 50 20 Q66 24 76 10 Q84 10 84 16 V62 Q84 96 50 100 Q16 96 16 62 Z',
  molar: 'M14 16 Q14 10 22 10 Q28 26 40 22 Q52 26 60 22 Q72 26 78 10 Q86 10 86 16 V64 Q86 96 50 100 Q14 96 14 64 Z',
};

const AREA_OFFSET = { incisal: 14, middle: 52, cervical: 90, whole: 50 };

export default function ToothShape({ tooth, index, view = 'health', selected = false }) {
  const segs = tooth.color_segments && tooth.color_segments.length
    ? tooth.color_segments
    : [{ health: 'fair', area: 'whole', note: '' }];
  const gid = `tooth-grad-${tooth.tooth_id || index}`;
  const path = SHAPES[tooth.tooth_type] || SHAPES.incisor;
  const stroke = selected ? '#00d9c0' : 'rgba(255,255,255,0.35)';
  const sw = selected ? 3 : 1.5;

  if (view === 'shade') {
    const wc = whitenessColor(tooth.whiteness_score);
    return (
      <svg viewBox="0 0 100 110" className="w-full h-auto" role="img" aria-label={`${tooth.tooth_id} shade`}>
        <defs>
          <linearGradient id={`${gid}-shade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={wc} />
            <stop offset="100%" stopColor={wc} stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <path d={path} fill={`url(#${gid}-shade)`} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      </svg>
    );
  }

  const stops = segs.map((s, i) => ({
    offset: AREA_OFFSET[s.area] ?? (segs.length > 1 ? (i / (segs.length - 1)) * 100 : 50),
    color: getHealthColor(s.health),
    note: `${s.area || 'whole'}: ${s.note || ''}`,
  }));
  const gradStops = stops.length === 1 ? [stops[0], { ...stops[0], offset: 100 }] : stops;

  return (
    <svg viewBox="0 0 100 110" className="w-full h-auto" role="img" aria-label={`${tooth.tooth_id} health map`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          {gradStops.map((st, i) => (
            <stop key={i} offset={`${Math.max(0, Math.min(100, st.offset))}%`} stopColor={st.color} />
          ))}
        </linearGradient>
      </defs>
      <path d={path} fill={`url(#${gid})`} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      <title>{stops.map((s) => s.note).join(' · ')}</title>
    </svg>
  );
}