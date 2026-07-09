import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getEmergencyRequestsPage } from '../services/emergencyService';

/**
 * useEmergencyQuery - real-data Requests list via React Query (TanStack Query v5).
 *
 * Wraps emergencyService.getEmergencyRequestsPage, the route-owned Requests page
 * projection (RLS-scoped list + exact count + KPI-agnostic status/service stats +
 * latest-payment enrichment). Mirrors useDoctorsQuery / useSupportTicketsQuery
 * (the S3 reference migrations, CONSOLE_LAYER_MODEL_PLAN S3-1/2/3): it replaces the
 * page's manual useState/useEffect/requestSeqRef fetch loop with caching, request
 * de-duplication, and consistent loading/error state.
 *
 * The single Requests store is the ['emergency', filter] cache: the page reads it
 * here, dispatch/complete/cancel mutations settle it (useEmergencyMutations), and
 * realtime (page channel + PageDataContext) invalidates it. No second per-screen copy.
 *
 * @param {object} filter - passthrough filter for getEmergencyRequestsPage
 *   ({ status, search, date_from, date_to, kpiFilter, sortKey, sortDirection,
 *   limit, offset, quiet }).
 * @param {object} [options]
 * @param {boolean} [options.enabled=true] - gate the fetch (e.g. until auth is
 *   ready). A disabled query stays idle and holds no data.
 * @returns {{ requests: any[], count: number, stats: object|null,
 *   loading: boolean, isFetching: boolean, error: unknown, refetch: function }}
 */
export function useEmergencyQuery(filter = {}, { enabled = true } = {}) {
  const query = useQuery({
    queryKey: ['emergency', filter],
    queryFn: () => getEmergencyRequestsPage(filter),
    enabled,
    staleTime: 30_000,
    // v5 equivalent of keepPreviousData - avoids a flash to empty while refetching
    // (e.g. when the KPI/status filter or page offset changes).
    placeholderData: (previous) => previous,
  });

  return {
    requests: query.data?.data ?? [],
    count: query.data?.count ?? 0,
    stats: query.data?.stats ?? null,
    loading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Returns a function that invalidates every Requests query, forcing a refetch.
 * Use after dispatch/complete/cancel mutations and on realtime change events.
 */
export function useInvalidateEmergency() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['emergency'] });
}

export default useEmergencyQuery;
