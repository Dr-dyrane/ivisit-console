import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSubscriptionsPage } from '../services/subscriptionService';

export function useSubscriptionsQuery(filter = {}) {
  const query = useQuery({
    queryKey: ['subscriptions', filter],
    queryFn: () => getSubscriptionsPage(filter),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });

  const projection = query.data;
  const projectionError = projection?.failed
    ? new Error(projection.errorMessage || 'Subscriber projection failed.')
    : projection?.denied
      ? new Error('Subscriber access is unavailable for this role.')
      : query.error;

  return {
    subscribers: projection?.data ?? [],
    count: projection?.count ?? 0,
    stats: projection?.stats ?? null,
    denied: Boolean(projection?.denied),
    failed: Boolean(projection?.failed),
    reason: projection?.reason ?? null,
    loading: query.isLoading,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    error: projectionError,
    refetch: query.refetch,
  };
}

export function useInvalidateSubscriptions() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['subscriptions'] }),
    [queryClient]
  );
}

export default useSubscriptionsQuery;
