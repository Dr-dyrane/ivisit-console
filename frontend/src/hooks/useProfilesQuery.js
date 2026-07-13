import { useQuery } from '@tanstack/react-query';
import { getUsersPage } from '../services/profilesService';

/**
 * useProfilesQuery - server-projection Users list via React Query (TanStack Query v5).
 *
 * Wraps profilesService.getUsersPage, which returns { data, count, stats } from an
 * RBAC-scoped, SERVER-SIDE filter/sort/paginate query with exact scoped counts. Replaces
 * the page's manual 1000-row privileged load + client-side filter/sort/paginate, so the
 * console DS ActivitySheet gets a real server total and the KpiStrip gets KPI-agnostic
 * exact role/verification counts. Mirrors useDoctorsQuery (the console RQ reference).
 *
 * @param {object} filter - { limit, offset, search, role, provider_type, verified,
 *   created_at, sortKey, sortDirection, quiet }
 * @returns {{ users: any[], count: number|null, stats: object|null,
 *   statsError: object|null, loading: boolean, isFetching: boolean,
 *   error: unknown, refetch: function }}
 */
export function useProfilesQuery(filter = {}) {
  const query = useQuery({
    queryKey: ['profiles', filter],
    queryFn: () => getUsersPage(filter),
    staleTime: 30_000,
    // v5 keepPreviousData - avoids a flash to empty while refetching on filter/page change.
    placeholderData: (previous) => previous,
  });

  return {
    users: query.data?.data ?? [],
    count: query.data?.count ?? null,
    stats: query.data?.stats ?? null,
    statsError: query.data?.statsError ?? null,
    loading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useProfilesQuery;
