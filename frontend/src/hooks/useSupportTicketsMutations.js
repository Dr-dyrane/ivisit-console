import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInvalidateSupportTickets } from './useSupportTicketsQuery';

/**
 * useSupportTicketsMutations - the optimistic-mutation pattern for the Support
 * domain, copied from the console reference (useDoctorsMutations, Console
 * Layer-Model Plan step S2-4). Support has a genuine but narrow write path:
 * create + update of a ticket's subject/message/category/priority. Destructive
 * and workflow mutations (delete / assign / status) stay service-inventory only
 * and are intentionally NOT wired here.
 *
 * The pattern (per CONSOLE_LAYER_MODEL_PLAN.md):
 *   onMutate   -> cancelQueries, snapshot the previous cache (rollback token),
 *                 optionally write an optimistic value with setQueryData.
 *   onError    -> restore the snapshot with setQueryData (rollback).
 *   onSettled  -> invalidateQueries so the cache converges to server truth.
 *
 * React Query is the single source (L2 server cache + L3 client snapshot in one).
 * Realtime and mutation settlement both converge on the same ['support'] key.
 */

// --- Query-key convention -------------------------------------------------
// Mirrors useSupportTicketsQuery.js (`queryKey: ['support', filter]`). The root
// ['support'] is the invalidation/cancel prefix - the same prefix
// useInvalidateSupportTickets uses, so read, mutation-settlement, and
// realtime-invalidate all agree on one key family.
export const SUPPORT_KEY_ROOT = ['support'];

/**
 * Build the exact list key a given filter is cached under. Passing the same
 * `filter` the page passed to useSupportTicketsQuery targets that page's cache
 * entry; the default {} matches the unfiltered list.
 */
export const supportListKey = (filter = {}) => ['support', filter];

// --- Pure optimistic reducer ----------------------------------------------
// useSupportTicketsQuery caches the shape { data: Ticket[], count, stats } under
// the list key. This pure helper transforms that shape so an optimistic write
// never has to reach into React Query internals. It is exported so callers can
// reuse it.

const emptySupportCache = () => ({ data: [], count: 0, stats: undefined });

/**
 * Merge an updated ticket onto an existing one (matched by id), or insert it at
 * the front of the cached list. Count grows only for a genuine insert.
 *
 * Create passes no id (the server owns it), so create callers omit this reducer
 * and rely on the onSettled invalidation instead; update callers carry the id in
 * the mutation variables so this reducer merges the cached row in place.
 */
export function applyOptimisticUpsert(cache, ticket) {
  const base = cache && Array.isArray(cache.data) ? cache : emptySupportCache();
  const id = ticket ? ticket.id : undefined;
  const exists = id != null && base.data.some((row) => row.id === id);
  const data = exists
    ? base.data.map((row) => (row.id === id ? { ...row, ...ticket } : row))
    : [{ ...ticket }, ...base.data];
  return {
    ...base,
    data,
    count: exists ? base.count : (base.count ?? 0) + 1,
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
 *   invalidating the SUPPORT_KEY_ROOT prefix.
 * @param {Array} [params.listKey] - exact cache key to snapshot/patch/rollback.
 */
export function buildSupportTicketsMutationOptions({
  queryClient,
  mutationFn,
  applyOptimistic,
  invalidate,
  listKey = supportListKey(),
}) {
  return {
    mutationFn,

    // Snapshot + optional optimistic write. The returned object is the mutation
    // "context" React Query threads into onError / onSettled.
    async onMutate(variables) {
      // Stop in-flight support refetches so they cannot overwrite the optimistic
      // value after we set it.
      await queryClient.cancelQueries({ queryKey: SUPPORT_KEY_ROOT });

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
        queryClient.invalidateQueries({ queryKey: SUPPORT_KEY_ROOT });
      }
    },
  };
}

/**
 * useSupportTicketsMutations - React Query mutation wired with the optimistic
 * pattern.
 *
 * @param {object} params
 * @param {(variables:any)=>Promise<any>} params.mutationFn - e.g.
 *   createSupportTicket, or ({ id, ...changes }) => updateSupportTicket(id, changes).
 * @param {(cache:any, variables:any)=>any} [params.applyOptimistic] - a pure
 *   reducer such as applyOptimisticUpsert (omit for create).
 * @param {object} [params.filter] - the same filter the page passed to
 *   useSupportTicketsQuery, so the optimistic write patches that page's cache entry.
 * @returns the React Query mutation object ({ mutate, mutateAsync, isPending, ... }).
 */
export function useSupportTicketsMutations({ mutationFn, applyOptimistic, filter } = {}) {
  const queryClient = useQueryClient();
  const invalidateSupport = useInvalidateSupportTickets();

  return useMutation(
    buildSupportTicketsMutationOptions({
      queryClient,
      mutationFn,
      applyOptimistic,
      invalidate: invalidateSupport,
      listKey: supportListKey(filter),
    })
  );
}

export default useSupportTicketsMutations;
