import { useQuery } from '@tanstack/react-query';
import { stainLogs } from '@/lib/insforgeDb';

export const STAIN_LOGS_KEY = ['stain-logs'];

// The current user's recent stain-log entries (200 most recent). Used by the
// Results page for food-attribution analysis.
export function useStainLogs() {
  return useQuery({
    queryKey: STAIN_LOGS_KEY,
    queryFn: () => stainLogs.list('-created_date', 200),
    staleTime: 60_000,
  });
}