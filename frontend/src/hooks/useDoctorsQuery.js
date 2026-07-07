import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDoctors } from '../services/doctorsService';

/**
 * useDoctorsQuery - real-data doctors list via React Query (TanStack Query v5).
 *
 * Wraps doctorsService.getDoctors, which is an RBAC-scoped Supabase query against
 * the `doctors` table (with hospital join + display-id enrichment). This is the
 * first useQuery-based domain hook (CONSOLE_UX_REVAMP_PLAN 5.3) - it replaces the
 * manual useState/useEffect/withTimeout fetch loop on the page with caching,
 * request de-duplication, and consistent loading/error state.
 *
 * @param {object} filter - passthrough filter for getDoctors
 *   ({ limit, offset, search, specialization, status, hospital_id, created_at }).
 * @returns {{ doctors: any[], count: number, loading: boolean,
 *   isFetching: boolean, error: unknown, refetch: function, stats: object }}
 */
export function useDoctorsQuery(filter = {}) {
  const query = useQuery({
    queryKey: ['doctors', filter],
    queryFn: () => getDoctors(filter),
    staleTime: 30_000,
    // v5 equivalent of keepPreviousData - avoids a flash to empty while refetching
    placeholderData: (previous) => previous,
  });

  return {
    doctors: query.data?.data ?? [],
    count: query.data?.count ?? 0,
    stats: query.data?.stats ?? { total: 0, totalDoctors: 0, available: 0, on_call: 0, onCall: 0, busy: 0, off_duty: 0 },
    loading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Returns a function that invalidates every doctors query, forcing a refetch.
 * Use after create/update/delete mutations.
 */
export function useInvalidateDoctors() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['doctors'] });
}

export default useDoctorsQuery;
