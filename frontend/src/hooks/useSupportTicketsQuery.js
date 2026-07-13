import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupportTicketsPage } from '../services/supportTicketsService';

/**
 * useSupportTicketsQuery - real-data support-ticket list via React Query
 * (TanStack Query v5).
 *
 * Wraps supportTicketsService.getSupportTicketsPage, the route-owned Support page
 * projection (RLS-scoped list + exact count + scoped status/priority stats). This
 * mirrors useDoctorsQuery / useHospitalsQuery (the S3 reference migrations,
 * CONSOLE_LAYER_MODEL_PLAN S3-1/2/3): it replaces the page's manual
 * useState/useEffect/fetchRequestRef fetch loop with caching, request de-duplication,
 * and consistent loading/error state.
 *
 * The single support store is the ['support', filter] cache: the page reads it here,
 * create/update mutations settle it (useSupportTicketsMutations), and realtime
 * invalidates it. No second per-screen copy.
 *
 * @param {object} filter - passthrough filter for getSupportTicketsPage
 *   ({ search, status, priority, category, assigned_to, sortKey, sortDirection,
 *   statsFilter, limit, offset, quiet }).
 * @returns {{ tickets: any[], count: number, stats: object|null,
 *   loading: boolean, isFetching: boolean, error: unknown, refetch: function }}
 */
export function useSupportTicketsQuery(filter = {}) {
  const query = useQuery({
    queryKey: ['support', filter],
    queryFn: ({ signal }) => getSupportTicketsPage({ ...filter, abortSignal: signal }),
    staleTime: 30_000,
    // v5 equivalent of keepPreviousData - avoids a flash to empty while refetching
    // (e.g. when the KPI/status filter or page offset changes).
    placeholderData: (previous) => previous,
  });

  return {
    tickets: query.data?.data ?? [],
    count: query.data?.count ?? 0,
    stats: query.data?.stats ?? null,
    loading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Returns a function that invalidates every support query, forcing a refetch.
 * Use after create/update mutations and on realtime change events.
 */
export function useInvalidateSupportTickets() {
  const queryClient = useQueryClient();
  return (options) => queryClient.invalidateQueries({ queryKey: ['support'] }, options);
}

export default useSupportTicketsQuery;
