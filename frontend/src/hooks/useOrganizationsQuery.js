import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getOrganizationsPage } from '../services/organizationsService';

/**
 * useOrganizationsQuery - real-data organization registry list via React Query
 * (TanStack Query v5).
 *
 * Wraps organizationsService.getOrganizationsPage, the route-owned Organizations page
 * projection (server-side search/sort/paginate + exact count + cross-table wallet payout
 * stats). Mirrors useSupportTicketsQuery / useDoctorsQuery (the S3 reference migrations):
 * it replaces the page's manual useState/useEffect/getOrganizations fetch loop with
 * caching, request de-duplication, and consistent loading/error state.
 *
 * READ-ONLY: there is NO authorized organization write, so this file exposes NO mutations
 * hook. saveOrganization/deleteOrganization stay orphaned in the service; the page never
 * imports them. The ['organizations', filter] cache is the single store: the page reads it
 * here and the route realtime channel invalidates it (no manual refetch, no INSERT toast).
 *
 * @param {object} filter - passthrough filter for getOrganizationsPage
 *   ({ search, statsFilter, sortKey, sortDirection, limit, offset, quiet }).
 * @returns {{ organizations: any[], count: number, stats: object|null,
 *   loading: boolean, isFetching: boolean, isPlaceholderData: boolean,
 *   error: unknown, refetch: function }}
 */
export function useOrganizationsQuery(filter = {}) {
  const query = useQuery({
    queryKey: ['organizations', filter],
    queryFn: () => getOrganizationsPage(filter),
    staleTime: 30_000,
    // v5 equivalent of keepPreviousData - avoids a flash to empty while refetching
    // (e.g. when the search or page offset changes).
    placeholderData: (previous) => previous,
  });

  return {
    organizations: query.data?.data ?? [],
    count: query.data?.count ?? 0,
    stats: query.data?.stats ?? null,
    loading: query.isLoading,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Returns a function that invalidates every organizations query, forcing a refetch.
 * Use on realtime change events.
 */
export function useInvalidateOrganizations() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['organizations'] });
}

export default useOrganizationsQuery;
