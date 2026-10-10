import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { PROFILE_KEY, profileQueryOptions } from '@/lib/profileQuery';
export { PROFILE_KEY };

// Merges Base44 auth identity (id, email, role) with the InsForge profile
// (username, display_name, appliance, baseline, etc.) into one object.
export function useUserProfile() {
  const { user } = useAuth();
  return useQuery(profileQueryOptions(user));
}

export function useInvalidateUserProfile() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
}