import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInvalidateAmbulances } from './useAmbulancesQuery';

/**
 * useAmbulancesMutations - the ambulances copy of the reference optimistic-mutation
 * pattern (useDoctorsMutations.js, Console Layer-Model Plan step S2-4). It proves the
 * L2+L3 write contract for the fleet domain on the same React Query store the page
 * reads (useAmbulancesQuery), so the write path never bypasses the reused
 * createAmbulance / updateAmbulance service RPCs.
 *
 * The pattern (mirrors useDoctorsMutations.js):
 *   onMutate   -> cancelQueries, snapshot the previous cache (rollback token),
 *                 write an optimistic value with setQueryData.
 *   onError    -> restore the snapshot with setQueryData (rollback).
 *   onSettled  -> invalidateQueries so the cache converges to server truth.
 *
 * There is no client-generated id and no second store: React Query is the single
 * source (L2 server cache + L3 client snapshot in one). Realtime and mutation
 * settlement both converge on the same query key.
 */

// --- Query-key convention -------------------------------------------------
// Mirrors useAmbulancesQuery.js (`queryKey: ['ambulances', filter]`). The root
// ['ambulances'] is the invalidation/cancel prefix - the same prefix
// useInvalidateAmbulances uses - so read, mutation-settlement, and
// realtime-invalidate all agree on one key family.
export const AMBULANCES_KEY_ROOT = ['ambulances'];

/**
 * Build the exact list key a given filter is cached under. Passing the same
 * `filter` the page passed to useAmbulancesQuery targets that page's cache entry;
 * the default {} matches the unfiltered list.
 */
export const ambulancesListKey = (filter = {}) => ['ambulances', filter];

// --- Pure optimistic reducers --------------------------------------------
// useAmbulancesQuery caches the shape { data: Ambulance[], count, stats, recent }
// under the list key (getAmbulancesPageData return shape). These pure helpers
// transform that shape so an optimistic write never has to reach into React Query
// internals. They are exported so callers (and the reference tests) can reuse them.

const emptyAmbulancesCache = () => ({ data: [], count: 0, stats: undefined, recent: [] });

/**
 * Insert a new ambulance, or merge onto an existing one (matched by id), at the
 * front of the cached list. Count grows only for a genuine insert. `recent` and
 * `stats` are preserved as-is - onSettled invalidation reconverges them.
 */
export function applyOptimisticUpsert(cache, ambulance) {
  const base = cache && Array.isArray(cache.data) ? cache : emptyAmbulancesCache();
  const id = ambulance ? ambulance.id : undefined;
  const exists = id != null && base.data.some((row) => row.id === id);
  const data = exists
    ? base.data.map((row) => (row.id === id ? { ...row, ...ambulance } : row))
    : [{ ...ambulance }, ...base.data];
  return {
    ...base,
    data,
    count: exists ? base.count : (base.count ?? 0) + 1,
  };
}

/**
 * Remove an ambulance by id from the cached list. Count shrinks only if the row
 * was actually present, and never goes below zero.
 */
export function applyOptimisticRemove(cache, ambulanceId) {
  if (!cache || !Array.isArray(cache.data)) return cache;
  const existed = cache.data.some((row) => row.id === ambulanceId);
  return {
    ...cache,
    data: cache.data.filter((row) => row.id !== ambulanceId),
    count: existed ? Math.max(0, (cache.count ?? 0) - 1) : (cache.count ?? 0),
  };
}

// --- Pure options factory (testable without renderHook) -------------------
/**
 * Build the useMutation options object implementing the optimistic pattern against
 * a concrete QueryClient. Extracted from the hook so the onMutate / onError /
 * onSettled callbacks can be exercised directly against a real QueryClient in unit
 * tests (@testing-library/react's renderHook is not a dependency of this project).
 *
 * @param {object}   params
 * @param {import('@tanstack/react-query').QueryClient} params.queryClient
 * @param {(variables:any)=>Promise<any>} params.mutationFn - the service call.
 * @param {(cache:any, variables:any)=>any} [params.applyOptimistic] - pure reducer
 *   producing the optimistic cache value. Omit to mutate without an optimistic
 *   write (rollback still restores the exact snapshot).
 * @param {() => void} [params.invalidate] - convergence step; defaults to
 *   invalidating the AMBULANCES_KEY_ROOT prefix (matches useInvalidateAmbulances).
 * @param {Array} [params.listKey] - exact cache key to snapshot/patch/rollback.
 */
export function buildAmbulancesMutationOptions({
  queryClient,
  mutationFn,
  applyOptimistic,
  invalidate,
  listKey = ambulancesListKey(),
}) {
  return {
    mutationFn,

    // Snapshot + optimistic write. The returned object is the mutation
    // "context" React Query threads into onError / onSettled.
    async onMutate(variables) {
      // Stop in-flight ambulances refetches so they cannot overwrite the
      // optimistic value after we set it.
      await queryClient.cancelQueries({ queryKey: AMBULANCES_KEY_ROOT });

      // Rollback token: the exact cache value before we touch it.
      const previous = queryClient.getQueryData(listKey);

      if (typeof applyOptimistic === 'function') {
        queryClient.setQueryData(listKey, (current) => applyOptimistic(current, variables));
      }

      return { previous, listKey };
    },

    // Roll the cache back to the pre-mutation snapshot. Restoring the exact
    // reference (including undefined, when nothing was cached) is intentional.
    onError(_error, _variables, context) {
      if (context) {
        queryClient.setQueryData(context.listKey, context.previous);
      }
    },

    // Always converge to server truth, whether the mutation succeeded or the
    // rollback ran - the optimistic value is only ever a placeholder.
    onSettled() {
      if (typeof invalidate === 'function') {
        invalidate();
      } else {
        queryClient.invalidateQueries({ queryKey: AMBULANCES_KEY_ROOT });
      }
    },
  };
}

/**
 * useAmbulancesMutations - React Query mutation wired with the optimistic pattern.
 *
 * @param {object} params
 * @param {(variables:any)=>Promise<any>} params.mutationFn - e.g. createAmbulance /
 *   updateAmbulance from ambulancesService.
 * @param {(cache:any, variables:any)=>any} [params.applyOptimistic] - a pure reducer
 *   such as applyOptimisticUpsert or applyOptimisticRemove.
 * @param {object} [params.filter] - the same filter the page passed to
 *   useAmbulancesQuery, so the optimistic write patches that page's cache entry.
 * @returns the React Query mutation object ({ mutate, mutateAsync, isPending, ... }).
 */
export function useAmbulancesMutations({ mutationFn, applyOptimistic, filter } = {}) {
  const queryClient = useQueryClient();
  const invalidateAmbulances = useInvalidateAmbulances();

  return useMutation(
    buildAmbulancesMutationOptions({
      queryClient,
      mutationFn,
      applyOptimistic,
      invalidate: invalidateAmbulances,
      listKey: ambulancesListKey(filter),
    })
  );
}

export default useAmbulancesMutations;
