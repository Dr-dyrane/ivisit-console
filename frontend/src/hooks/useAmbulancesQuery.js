import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAmbulancesPageData } from '../services/ambulancesService';
import { isTransientReadError } from '../services/queryAbort';

export const shouldRetryAmbulanceQuery = (failureCount, error) => (
  failureCount < 2 && isTransientReadError(error)
);

/**
 * useAmbulancesQuery - real-data ambulance fleet list via React Query (TanStack
 * Query v5). Mirrors useDoctorsQuery.js (the S3 reference migration).
 *
 * Wraps ambulancesService.getAmbulancesPageData, which is the RBAC-scoped Supabase
 * projection that already owns the route list, exact count, org-scoped stats,
 * filters, pagination, status alias mapping, sorting, and station enrichment. This
 * replaces the manual useState/useEffect fetch loop on AmbulancesPage with caching,
 * request de-duplication, and consistent loading/error state - the same single-store
 * (L2 server cache) contract doctors already proved.
 *
 * @param {object} filter - passthrough params for getAmbulancesPageData
 *   ({ filters, statsFilters, kpiFilter, sortConfig, limit, offset }).
 * @returns {{ ambulances: any[], count: number, stats: object|null, recent: any[],
 *   loading: boolean, isFetching: boolean, error: unknown, refetch: function }}
 */
export function useAmbulancesQuery(filter = {}) {
  const query = useQuery({
    queryKey: ['ambulances', filter],
    queryFn: ({ signal }) => getAmbulancesPageData({ ...filter, abortSignal: signal }),
    // TanStack owns transient retries for this route. Timeouts and cancellations
    // are terminal so one refresh cannot expand into repeated timeout windows.
    retry: shouldRetryAmbulanceQuery,
    staleTime: 30_000,
    // v5 equivalent of keepPreviousData - avoids a flash to empty while refetching
    placeholderData: (previous) => previous,
  });

  return {
    ambulances: query.data?.data ?? [],
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
 * Returns a function that invalidates every ambulances query, forcing a refetch.
 * Use after create/update/delete mutations and from the realtime subscription.
 */
export function useInvalidateAmbulances() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['ambulances'] });
}

export default useAmbulancesQuery;
