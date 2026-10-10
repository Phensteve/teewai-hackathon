import { useQuery, useQueryClient } from '@tanstack/react-query';
import { scans as insforgeScans } from '@/lib/insforgeDb';

// Single-scan query keyed by id. Navigating back to a result shows the cached
// scan instantly and refetches in the background (stale-while-revalidate).
export const SCAN_KEY = (id) => ['scan', id];

export function useScan(id) {
  return useQuery({
    queryKey: SCAN_KEY(id),
    queryFn: () => insforgeScans.get(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useInvalidateScan() {
  const queryClient = useQueryClient();
  return (id) => queryClient.invalidateQueries({ queryKey: SCAN_KEY(id) });
}