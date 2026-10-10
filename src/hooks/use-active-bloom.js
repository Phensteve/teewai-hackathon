import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getActiveBloom } from '@/lib/bloom';

export const BLOOM_KEY = (userId) => ['bloom', userId || 'anon'];

// The user's active Enamel Bloom (the Zeigarnik open loop from their last
// scan). Enabled only once we have a userId so it never fires for guests.
export function useActiveBloom(userId) {
  return useQuery({
    queryKey: BLOOM_KEY(userId),
    queryFn: () => getActiveBloom(userId),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useInvalidateBloom() {
  const queryClient = useQueryClient();
  return (userId) => queryClient.invalidateQueries({ queryKey: BLOOM_KEY(userId) });
}