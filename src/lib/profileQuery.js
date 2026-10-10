import accountProfile from '@/lib/accountProfile';

export const PROFILE_KEY = ['user-profile'];
export function profileQueryOptions(user) {
  return {
    queryKey: [...PROFILE_KEY, user?.id],
    queryFn: () => accountProfile(user),
    enabled: !!user?.id,
    staleTime: 60_000,
  };
}