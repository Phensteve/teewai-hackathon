import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userProgress } from '@/lib/insforgeDb';

export const PROGRESS_KEY = ['user-progress'];

export function useUserProgress() {
  return useQuery({
    queryKey: PROGRESS_KEY,
    queryFn: async () => {
      const p = await userProgress.filter({});
      return p[0] || null;
    },
    staleTime: 60_000,
  });
}

export function useInvalidateUserProgress() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: PROGRESS_KEY });
}