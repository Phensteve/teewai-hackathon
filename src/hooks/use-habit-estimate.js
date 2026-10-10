import { useQuery } from '@tanstack/react-query';
import { unrufld } from '@/api/unrufldClient';

export const HABIT_ESTIMATE_KEY = ['habit-estimate'];

// The user's habit-based whiteness estimate — extrapolated from their latest
// real scan + all stain_logs (brush, water, food) logged since that scan.
// Computed server-side by the habitEstimate backend function so the dashboard,
// shade graph, and Ask Teewai all share one deterministic model.
export function useHabitEstimate(userId, scanId) {
  return useQuery({
    queryKey: [...HABIT_ESTIMATE_KEY, userId, scanId || 'no-scan'],
    queryFn: async () => {
      const res = await unrufld.functions.invoke('habitEstimate', {});
      return res.data.estimate;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}