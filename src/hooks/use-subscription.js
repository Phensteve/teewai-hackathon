import { useQuery, useQueryClient } from '@tanstack/react-query';
import { subscriptions } from '@/lib/insforgeDb';
import { setCachedSubscription } from '@/lib/subscriptionCache';

export const SUBSCRIPTION_KEY = ['subscription'];

// The current user's subscription record. Warms the lightweight
// subscriptionCache (used by the Scan page for instant render) on every fetch
// so the cache and the query never drift apart.
export function useSubscription(options = {}) {
  return useQuery({
    queryKey: SUBSCRIPTION_KEY,
    queryFn: async () => {
      const s = await subscriptions.filter({});
      const sub = s[0] || null;
      setCachedSubscription(sub);
      return sub;
    },
    staleTime: 60_000,
    ...options,
  });
}

export function useInvalidateSubscription() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY });
}