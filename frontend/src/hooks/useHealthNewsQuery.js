import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getHealthNewsPage } from '../services/healthNewsService';

const EMPTY_HEALTH_NEWS_ROWS = Object.freeze([]);

/**
 * useHealthNewsQuery - real-data Health News list via React Query
 * (TanStack Query v5).
 *
 * Wraps healthNewsService.getHealthNewsPage, the route-owned Health News page
 * projection (published-feed-scoped list + exact count + category/recency stats).
 * This mirrors useSupportTicketsQuery / useDoctorsQuery (the S3 reference
 * migrations): it replaces the page's manual useState/useEffect/fetch loop with
 * caching, request de-duplication, and consistent loading/error state.
 *
 * READ-ONLY by design. Health News authoring stays fail-closed (no parallel
 * truth): there is deliberately NO create/update/delete/publish mutation hook
 * here. The published feed is a projection the console reads, never writes.
 *
 * @param {object} filter - passthrough filter for getHealthNewsPage
 *   ({ search, published, category, source, created_at, kpiFilter, sortKey,
 *   sortDirection, statsFilter, limit, offset, quiet }).
 * @returns {{ data: any[], count: number, stats: object|null,
 *   loading: boolean, isFetching: boolean, error: unknown, refetch: function }}
 */
export function useHealthNewsQuery(filter = {}) {
  const query = useQuery({
    queryKey: ['healthNews', filter],
    queryFn: () => getHealthNewsPage(filter),
    staleTime: 30_000,
    // v5 equivalent of keepPreviousData - avoids a flash to empty while refetching
    // (e.g. when the KPI/category filter or page offset changes).
    placeholderData: (previous) => previous,
  });

  return {
    data: query.data?.data ?? EMPTY_HEALTH_NEWS_ROWS,
    count: query.data?.count ?? 0,
    stats: query.data?.stats ?? null,
    loading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Returns a function that invalidates every Health News query, forcing a refetch.
 * Read path only -- there are no console writes to settle against.
 */
export function useInvalidateHealthNews() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['healthNews'] });
}

export default useHealthNewsQuery;
