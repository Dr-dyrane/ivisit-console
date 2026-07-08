import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInvalidateHospitals } from './useHospitalsQuery';

/**
 * useHospitalsMutations - the optimistic-mutation pattern for the hospitals domain,
 * a direct copy of the doctors reference (useDoctorsMutations, Console Layer-Model
 * Plan step S2-4 / CONSOLE_LAYER_MODEL_PLAN.md). It proves the L2+L3 write contract
 * against the ['hospitals', filter] cache owned by useHospitalsQuery.
 *
 * The pattern (per CONSOLE_LAYER_MODEL_PLAN.md:129-142):
 *   onMutate   -> cancelQueries, snapshot the previous cache (rollback token),
 *                 write an optimistic value with setQueryData.
 *   onError    -> restore the snapshot with setQueryData (rollback).
 *   onSettled  -> invalidateQueries so the cache converges to server truth.
 *
 * The mutationFn is the existing hospitalsService write fn (updateHospital, which
 * already routes through the update_hospital_by_admin SECURITY DEFINER RPC) - the
 * mutation only wraps it with optimism + convergence; it never bypasses the RPC.
 * There is no client-generated id and no second store: React Query is the single
 * source (L2 server cache + L3 client snapshot in one). Realtime and mutation
 * settlement both converge on the same query key.
 */

// --- Query-key convention -------------------------------------------------
// Mirrors useHospitalsQuery.js (`queryKey: ['hospitals', filter]`). The root
// ['hospitals'] is the invalidation/cancel prefix - the same prefix that
// useInvalidateHospitals already uses, so read, mutation-settlement, and
// realtime-invalidate all agree on one key family.
export const HOSPITALS_KEY_ROOT = ['hospitals'];

/**
 * Build the exact list key a given filter is cached under. Passing the same
 * `filter` the page passed to useHospitalsQuery targets that page's cache entry;
 * the default {} matches the unfiltered list.
 */
export const hospitalsListKey = (filter = {}) => ['hospitals', filter];

// --- Pure optimistic reducers --------------------------------------------
// useHospitalsQuery caches the shape { data: Hospital[], count, stats, recent }
// under the list key. These pure helpers transform that shape so an optimistic
// write never has to reach into React Query internals. They are exported so
// callers (and reference tests) can reuse them.

const emptyHospitalsCache = () => ({ data: [], count: 0, stats: null, recent: [] });

/**
 * Insert a new hospital, or merge onto an existing one (matched by id), at the
 * front of the cached list. Count grows only for a genuine insert.
 */
export function applyOptimisticUpsert(cache, hospital) {
  const base = cache && Array.isArray(cache.data) ? cache : emptyHospitalsCache();
  const id = hospital ? hospital.id : undefined;
  const exists = id != null && base.data.some((row) => row.id === id);
  const data = exists
    ? base.data.map((row) => (row.id === id ? { ...row, ...hospital } : row))
    : [{ ...hospital }, ...base.data];
  return {
    ...base,
    data,
    count: exists ? base.count : (base.count ?? 0) + 1,
  };
}

/**
 * Remove a hospital by id from the cached list. Count shrinks only if the row
 * was actually present, and never goes below zero.
 */
export function applyOptimisticRemove(cache, hospitalId) {
  if (!cache || !Array.isArray(cache.data)) return cache;
  const existed = cache.data.some((row) => row.id === hospitalId);
  return {
    ...cache,
    data: cache.data.filter((row) => row.id !== hospitalId),
    count: existed ? Math.max(0, (cache.count ?? 0) - 1) : (cache.count ?? 0),
  };
}

// --- Pure options factory (testable without renderHook) -------------------
/**
 * Build the useMutation options object implementing the optimistic pattern
 * against a concrete QueryClient. Extracted from the hook so the onMutate /
 * onError / onSettled callbacks can be exercised directly against a real
 * QueryClient in unit tests.
 *
 * @param {object}   params
 * @param {import('@tanstack/react-query').QueryClient} params.queryClient
 * @param {(variables:any)=>Promise<any>} params.mutationFn - the service call.
 * @param {(cache:any, variables:any)=>any} [params.applyOptimistic] - pure
 *   reducer producing the optimistic cache value. Omit to mutate without an
 *   optimistic write (rollback still restores the exact snapshot).
 * @param {() => void} [params.invalidate] - convergence step; defaults to
 *   invalidating the HOSPITALS_KEY_ROOT prefix (matches useInvalidateHospitals).
 * @param {Array} [params.listKey] - exact cache key to snapshot/patch/rollback.
 */
export function buildHospitalsMutationOptions({
  queryClient,
  mutationFn,
  applyOptimistic,
  invalidate,
  listKey = hospitalsListKey(),
}) {
  return {
    mutationFn,

    // Snapshot + optimistic write. The returned object is the mutation
    // "context" React Query threads into onError / onSettled.
    async onMutate(variables) {
      // Stop in-flight hospitals refetches so they cannot overwrite the
      // optimistic value after we set it.
      await queryClient.cancelQueries({ queryKey: HOSPITALS_KEY_ROOT });

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
        queryClient.invalidateQueries({ queryKey: HOSPITALS_KEY_ROOT });
      }
    },
  };
}

/**
 * useHospitalsMutations - React Query mutation wired with the optimistic pattern.
 *
 * @param {object} params
 * @param {(variables:any)=>Promise<any>} params.mutationFn - e.g. a call routing
 *   through updateHospital from hospitalsService.
 * @param {(cache:any, variables:any)=>any} [params.applyOptimistic] - a pure
 *   reducer such as applyOptimisticUpsert or applyOptimisticRemove.
 * @param {object} [params.filter] - the same filter the page passed to
 *   useHospitalsQuery, so the optimistic write patches that page's cache entry.
 * @returns the React Query mutation object ({ mutate, mutateAsync, isPending, ... }).
 */
export function useHospitalsMutations({ mutationFn, applyOptimistic, filter } = {}) {
  const queryClient = useQueryClient();
  const invalidateHospitals = useInvalidateHospitals();

  return useMutation(
    buildHospitalsMutationOptions({
      queryClient,
      mutationFn,
      applyOptimistic,
      invalidate: invalidateHospitals,
      listKey: hospitalsListKey(filter),
    })
  );
}

export default useHospitalsMutations;
