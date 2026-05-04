// PULLBACK NOTE: Pass A1 — TanStack Query client singleton
// NEW: created for QueryClientProvider mount in App.js
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,       // 2 minutes — admin data changes infrequently
      gcTime: 1000 * 60 * 10,          // 10 minutes cache retention
      retry: 2,
      refetchOnWindowFocus: false,      // console app — no aggressive refetch on tab switch
    },
    mutations: {
      retry: 0,
    },
  },
});
