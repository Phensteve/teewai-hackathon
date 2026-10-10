// Shared colour helpers for the full-mouth exam (literal classes for Tailwind).
export const scoreTone = (s) => {
  if (s == null) return { text: 'text-muted-foreground', bg: 'bg-muted', soft: 'bg-muted/50' };
  if (s >= 75) return { text: 'text-success', bg: 'bg-success', soft: 'bg-success-soft' };
  if (s >= 50) return { text: 'text-warning', bg: 'bg-warning', soft: 'bg-warning-soft' };
  return { text: 'text-danger', bg: 'bg-danger', soft: 'bg-danger-soft' };
};

export const levelTone = (v) => {
  const k = String(v || '').toLowerCase();
  if (['healthy', 'none', 'minimal', 'mild', 'routine', 'aligned', 'normal', 'high', 'low'].includes(k)) return 'text-success';
  if (['moderate', 'soon', 'medium'].includes(k)) return 'text-warning';
  if (['severe', 'heavy', 'urgent'].includes(k)) return 'text-danger';
  return 'text-muted-foreground';
};

export const ANGLE_LABELS = { front: 'Front', upper: 'Upper', top: 'Upper', lower: 'Lower', left: 'Left', right: 'Right' };

export const pretty = (s) => String(s || '').replace(/_/g, ' ');