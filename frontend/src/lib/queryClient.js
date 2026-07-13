// TanStack Query client singleton mounted by App.js.
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,       // 2 minutes; admin data changes infrequently
      gcTime: 1000 * 60 * 10,          // 10 minutes cache retention
      retry: 2,
      refetchOnWindowFocus: false,      // No aggressive refetch on tab switch
    },
    mutations: {
      retry: 0,
    },
  },
});

// Query keys are not uniformly principal-scoped yet. Clear both query and
// mutation caches whenever authenticated ownership changes or ends so one
// account can never inherit another account's domain projection.
export const clearPrincipalScopedQueryCache = () => {
  queryClient.clear();
};
