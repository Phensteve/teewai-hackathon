// Habit extrapolation color styles — each care action type gets its own color
// so the user can see how brushing, water, and stain logs each affect their
// estimated whiteness between scans. Colors match the shade tracker graph.
export const HABIT_STYLES = {
  stain: { label: 'Stain logs', color: 'hsl(var(--habit-stain))' },
  brush: { label: 'Brushing', color: 'hsl(var(--habit-brush))' },
  water: { label: 'Water', color: 'hsl(var(--habit-water))' },
  mouthwash: { label: 'Mouthwash', color: 'hsl(var(--habit-mouthwash))' },
  protective: { label: 'Protective foods', color: 'hsl(var(--primary))' },
};