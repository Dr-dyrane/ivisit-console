import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getHospitalsPageData } from '../services/hospitalsService';

/**
 * useHospitalsQuery - real-data hospitals list via React Query (TanStack Query v5).
 *
 * Wraps hospitalsService.getHospitalsPageData, the route-owned Hospitals page
 * projection (list + exact count + page stats + display IDs, all behind RLS). This
 * mirrors useDoctorsQuery (the S3 reference migration, CONSOLE_LAYER_MODEL_PLAN
 * S3-1/2/3): it replaces the page's manual useState/useEffect/isMountedRef fetch
 * loop with caching, request de-duplication, and consistent loading/error state.
 *
 * The single hospitals store is the ['hospitals', filter] cache: the page reads it
 * here, mutations patch/settle it (useHospitalsMutations), and realtime invalidates
 * it. No second per-screen copy.
 *
 * @param {object} filter - passthrough options for getHospitalsPageData
 *   ({ filters, statsFilters, limit, offset, quiet }).
 * @returns {{ hospitals: any[], count: number, stats: object, recent: any[],
 *   loading: boolean, isFetching: boolean, error: unknown, refetch: function }}
 */
export function useHospitalsQuery(filter = {}) {
  const query = useQuery({
    queryKey: ['hospitals', filter],
    queryFn: ({ signal }) => getHospitalsPageData({ ...filter, abortSignal: signal }),
    staleTime: 30_000,
    // v5 equivalent of keepPreviousData - avoids a flash to empty while refetching
    // (e.g. when the KPI/status filter or page offset changes).
    placeholderData: (previous) => previous,
  });

  return {
    hospitals: query.data?.data ?? [],
    count: query.data?.count ?? 0,
    stats: query.data?.stats ?? null,
    recent: query.data?.recent ?? [],
    loading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Returns a function that invalidates every hospitals query, forcing a refetch.
 * Use after create/update/delete mutations and on realtime change events.
 */
export function useInvalidateHospitals() {
  const queryClient = useQueryClient();
  return (options) => queryClient.invalidateQueries({ queryKey: ['hospitals'] }, options);
}

export default useHospitalsQuery;
