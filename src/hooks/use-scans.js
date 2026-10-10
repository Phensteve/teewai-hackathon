import { useQuery, useQueryClient } from '@tanstack/react-query';
import { scans as insforgeScans } from '@/lib/insforgeDb';

// Shared scan-history query. Deduped across every component that calls it
// (Dashboard, My Scans, Scan) so one network round-trip feeds them all, with
// stale-while-revalidate so returning users see cached data instantly and a
// background refetch keeps it fresh.
export const SCANS_KEY = ['scans'];

export function useScans() {
  return useQuery({
    queryKey: SCANS_KEY,
    queryFn: async () => {
      const list = await insforgeScans.list('-created_date', 50);
      // Teeth scans only — braces checks live in their own view.
      return list.filter((s) => s.scan_mode !== 'braces');
    },
    staleTime: 60_000,
  });
}

// Convenience hook for pages that need to invalidate the scan list after a
// create/delete (Scan, My Scans, Dashboard care actions).
export function useInvalidateScans() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: SCANS_KEY });
}

// Full scan history (teeth + braces, 200 most recent). Used by the My Scans
// page, which needs both modes. Writes to localStorage on success so the APK
// can fall back to the last cached list offline (passed as initialData).
export const ALL_SCANS_KEY = ['all-scans'];

export function useAllScans(options = {}) {
  return useQuery({
    queryKey: ALL_SCANS_KEY,
    queryFn: async () => {
      const list = await insforgeScans.list('-created_date', 200);
      try {
        localStorage.setItem('teewai:my-scans:cache', JSON.stringify(list));
      } catch {
        /* storage may be unavailable */
      }
      return list;
    },
    staleTime: 60_000,
    ...options,
  });
}

export function useInvalidateAllScans() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ALL_SCANS_KEY });
}