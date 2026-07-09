import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInvalidateEmergency } from './useEmergencyQuery';

/**
 * useEmergencyMutations - the optimistic-mutation pattern for the Emergency
 * (Requests) domain, copied from the console reference (useDoctorsMutations,
 * Console Layer-Model Plan step S2-4). Emergency has three operator write paths,
 * all authoritative status transitions routed through their EXISTING reused RPCs:
 *
 *   dispatch  -> emergencyResponseService.dispatchEmergency  (console_dispatch_emergency)
 *   complete  -> emergencyResponseService.completeEmergency  (console_complete_emergency)
 *   cancel    -> emergencyService.cancelEmergencyRequest      (console_cancel_emergency)
 *
 * The mutationFn is always one of those service functions - this hook NEVER
 * bypasses them and never writes the emergency_requests table directly. It only
 * wraps the call with the L2+L3 optimistic contract.
 *
 * The pattern (per CONSOLE_LAYER_MODEL_PLAN.md):
 *   onMutate   -> cancelQueries, snapshot the previous cache (rollback token),
 *                 optionally write an optimistic status with setQueryData.
 *   onError    -> restore the snapshot with setQueryData (rollback).
 *   onSettled  -> invalidateQueries so the cache converges to server truth.
 *
 * React Query is the single source (L2 server cache + L3 client snapshot in one).
 * Realtime and mutation settlement both converge on the same ['emergency'] key.
 */

// --- Query-key convention -------------------------------------------------
// Mirrors useEmergencyQuery.js (`queryKey: ['emergency', filter]`). The root
// ['emergency'] is the invalidation/cancel prefix - the same prefix
// useInvalidateEmergency uses, so read, mutation-settlement, and
// realtime-invalidate all agree on one key family.
export const EMERGENCY_KEY_ROOT = ['emergency'];

/**
 * Build the exact list key a given filter is cached under. Passing the same
 * `filter` the page passed to useEmergencyQuery targets that page's cache entry;
 * the default {} matches the unfiltered list.
 */
export const emergencyListKey = (filter = {}) => ['emergency', filter];

// --- Pure optimistic reducer ----------------------------------------------
// useEmergencyQuery caches the shape { data: Request[], count, stats } under the
// list key. This pure helper transforms that shape so an optimistic write never
// has to reach into React Query internals. It is exported so callers (and tests)
// can reuse it.

/**
 * Optimistically patch the status of the request matching `id`. Leaves count and
 * stats untouched (the onSettled invalidation reconciles KPI/count drift). Rows
 * that do not match, and non-list caches, pass through unchanged.
 *
 * @param {{data: any[], count: number, stats: any}|undefined} cache
 * @param {*} id - request id to patch
 * @param {string} status - optimistic next status (e.g. 'accepted', 'completed',
 *   'cancelled')
 */
export function applyOptimisticStatus(cache, id, status) {
  if (!cache || !Array.isArray(cache.data)) return cache;
  return {
    ...cache,
    data: cache.data.map((row) => (row && row.id === id ? { ...row, status } : row)),
  };
}

// --- Pure options factory (testable without renderHook) -------------------
/**
 * Build the useMutation options object implementing the optimistic pattern
 * against a concrete QueryClient. Extracted from the hook so the onMutate /
 * onError / onSettled callbacks can be exercised directly against a real
 * QueryClient.
 *
 * @param {object}   params
 * @param {import('@tanstack/react-query').QueryClient} params.queryClient
 * @param {(variables:any)=>Promise<any>} params.mutationFn - the service call.
 * @param {(cache:any, variables:any)=>any} [params.applyOptimistic] - pure
 *   reducer producing the optimistic cache value. Omit to mutate without an
 *   optimistic write (rollback still restores the exact snapshot).
 * @param {() => void} [params.invalidate] - convergence step; defaults to
 *   invalidating the EMERGENCY_KEY_ROOT prefix.
 * @param {Array} [params.listKey] - exact cache key to snapshot/patch/rollback.
 */
export function buildEmergencyMutationOptions({
  queryClient,
  mutationFn,
  applyOptimistic,
  invalidate,
  listKey = emergencyListKey(),
}) {
  return {
    mutationFn,

    // Snapshot + optional optimistic write. The returned object is the mutation
    // "context" React Query threads into onError / onSettled.
    async onMutate(variables) {
      // Stop in-flight Requests refetches so they cannot overwrite the optimistic
      // value after we set it.
      await queryClient.cancelQueries({ queryKey: EMERGENCY_KEY_ROOT });

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
        queryClient.invalidateQueries({ queryKey: EMERGENCY_KEY_ROOT });
      }
    },
  };
}

/**
 * useEmergencyMutations - React Query mutation wired with the optimistic pattern.
 *
 * @param {object} params
 * @param {(variables:any)=>Promise<any>} params.mutationFn - e.g.
 *   ({ id, request }) => dispatchEmergency(id, request),
 *   ({ id }) => completeEmergency(id), or
 *   ({ id, reason }) => cancelEmergencyRequest(id, reason).
 * @param {(cache:any, variables:any)=>any} [params.applyOptimistic] - a pure
 *   reducer such as (cache, vars) => applyOptimisticStatus(cache, vars.id, 'accepted').
 * @param {object} [params.filter] - the same filter the page passed to
 *   useEmergencyQuery, so the optimistic write patches that page's cache entry.
 * @returns the React Query mutation object ({ mutate, mutateAsync, isPending, ... }).
 */
export function useEmergencyMutations({ mutationFn, applyOptimistic, filter } = {}) {
  const queryClient = useQueryClient();
  const invalidateEmergency = useInvalidateEmergency();

  return useMutation(
    buildEmergencyMutationOptions({
      queryClient,
      mutationFn,
      applyOptimistic,
      invalidate: invalidateEmergency,
      listKey: emergencyListKey(filter),
    })
  );
}

export default useEmergencyMutations;
