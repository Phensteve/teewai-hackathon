import { useQuery } from '@tanstack/react-query';
import { tips as tipsTable } from '@/lib/insforgeDb';

export const TIPS_KEY = ['active-tips'];

// Admin-managed active tip records (InsForge-backed), sorted by sort_order.
// Used by the dashboard's per-user daily tip pick and the Tip History page.
export function useTips() {
  return useQuery({
    queryKey: TIPS_KEY,
    queryFn: async () => {
      const all = await tipsTable.list('sort_order', 200);
      return (all || []).filter((t) => t.active);
    },
    staleTime: 5 * 60_000,
  });
}