// React Query hook for the user's active DentalRoutine.
// Loads the active routine, exposes generate (build + persist a new version)
// and autoModify (append auto-modifications from a new scan / food logs).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { unrufld } from '@/api/unrufldClient';
import { buildRoutine, computeAutoModifications } from '@/lib/dentalRoutine';

export const ROUTINE_KEY = (userId) => ['dental-routine', userId];

export function useRoutine(userId, scan, foodLogs, applianceType) {
  const queryClient = useQueryClient();
  const key = ROUTINE_KEY(userId);

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!userId) return null;
      const list = await unrufld.entities.DentalRoutine.filter(
        { user_id: userId, active: true },
        '-created_date',
        1
      );
      return list[0] || null;
    },
    enabled: !!userId,
  });

  // Generate a new routine version from the latest scan + food logs.
  // Archives the old active routine (sets active=false) and creates a new one.
  const generate = useMutation({
    mutationFn: async ({ scanId, keepModifications = false }) => {
      if (!userId) return null;
      const existing = query.data;
      const built = buildRoutine({
        scan,
        foodLogs,
        applianceType,
        existingRoutine: keepModifications ? existing : null,
      });
      if (!built) return null;

      // Archive the old routine
      if (existing?.id) {
        await unrufld.entities.DentalRoutine.update(existing.id, { active: false }).catch(() => {});
      }

      // Create the new active routine
      const created = await unrufld.entities.DentalRoutine.create({
        user_id: userId,
        version: (existing?.version || 0) + 1,
        active: true,
        generated_from_scan_id: scanId || null,
        generated_date: new Date().toISOString(),
        ...built,
      });
      return created;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(key, data);
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  // Apply auto-modifications (from a new scan or food logs) without regenerating.
  const autoModify = useMutation({
    mutationFn: async ({ newScan, logs }) => {
      if (!userId) return null;
      const existing = query.data;
      if (!existing) return null;
      const mods = computeAutoModifications({
        newScan,
        foodLogs: logs || foodLogs,
        existingRoutine: existing,
      });
      if (!mods.length) return existing;
      // Rebuild the routine to include the new steps + log the modifications
      const rebuilt = buildRoutine({
        scan: newScan || scan,
        foodLogs: logs || foodLogs,
        applianceType,
        existingRoutine: { ...existing, auto_modifications: [...(existing.auto_modifications || []), ...mods] },
      });
      if (!rebuilt) return existing;
      const updated = await unrufld.entities.DentalRoutine.update(existing.id, {
        ...rebuilt,
        auto_modifications: [...(existing.auto_modifications || []), ...mods],
      });
      return updated;
    },
    onSuccess: (data) => {
      if (data) queryClient.setQueryData(key, data);
    },
  });

  return {
    routine: query.data,
    loading: query.isLoading,
    generate: generate.mutateAsync,
    generating: generate.isPending,
    autoModify: autoModify.mutateAsync,
  };
}