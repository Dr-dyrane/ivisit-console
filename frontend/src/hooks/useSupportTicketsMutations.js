import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInvalidateSupportTickets } from './useSupportTicketsQuery';

/**
 * useSupportTicketsMutations - the optimistic-mutation pattern for the Support
 * domain, copied from the console reference (useDoctorsMutations, Console
 * Layer-Model Plan step S2-4). Support wires create + update of a ticket's
 * subject/message/category/priority, plus destructive delete (via
 * applyOptimisticRemove) and provider self-assign (via applyOptimisticUpsert,
 * since assignTicket returns the updated ticket). The status-transition mutation
 * stays service-inventory only and is intentionally NOT wired here.
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

/**
 * Remove a ticket by id from the cached list. Count shrinks only if the row was
 * actually present, and never goes below zero. Mirrors useDoctorsMutations'
 * applyOptimisticRemove (the console reference reducer) so the delete mutation
 * gets the same optimistic-then-converge lifecycle as the reference domain.
 */
export function applyOptimisticRemove(cache, ticketId) {
  if (!cache || !Array.isArray(cache.data)) return cache;
  const existed = cache.data.some((row) => row.id === ticketId);
  return {
    ...cache,
    data: cache.data.filter((row) => row.id !== ticketId),
    count: existed ? Math.max(0, (cache.count ?? 0) - 1) : (cache.count ?? 0),
  };
}

/**
 * Attempt every selected deletion and classify each receiver result by id. A
 * fulfilled request is still a failure unless the receiver returns the exact
 * deleted identity, so callers can tombstone only proved deletions.
 */
export async function settleSupportTicketDeletes(ticketIds = [], deleteOne) {
  if (typeof deleteOne !== 'function') {
    throw new TypeError('A support ticket delete function is required');
  }

  const requestedIds = (Array.isArray(ticketIds) ? ticketIds : [])
    .map((ticketId) => String(ticketId ?? '').trim())
    .filter(Boolean);
  const outcomes = await Promise.allSettled(requestedIds.map(async (ticketId) => {
    const deletedTicket = await deleteOne(ticketId);
    const confirmedId = String(deletedTicket?.id ?? '').trim();
    if (confirmedId !== ticketId) {
      throw new Error(`Support ticket deletion was not confirmed for ${ticketId}`);
    }
    return { id: ticketId, ticket: deletedTicket };
  }));

  return outcomes.reduce((summary, outcome, index) => {
    if (outcome.status === 'fulfilled') {
      summary.confirmed.push(outcome.value);
    } else {
      summary.failed.push({ id: requestedIds[index], error: outcome.reason });
    }
    return summary;
  }, { confirmed: [], failed: [] });
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
 * @param {(cache:any, data:any, variables:any)=>any} [params.applyCommitted] -
 *   reducer that writes a receiver-confirmed result before refetch convergence.
 * @param {(error:unknown, context:object)=>void} [params.onConvergenceError] -
 *   reports a failed post-commit invalidation without reclassifying the write.
 * @param {(options?:object) => Promise<void>} [params.invalidate] - convergence step; defaults to
 *   invalidating the SUPPORT_KEY_ROOT prefix.
 * @param {Array} [params.listKey] - exact cache key to snapshot/patch/rollback.
 */
export function buildSupportTicketsMutationOptions({
  queryClient,
  mutationFn,
  applyOptimistic,
  applyCommitted,
  onConvergenceError,
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

    // A successful create has a server-owned id. Put that returned row in the
    // active list before attempting refetch so a later convergence failure
    // cannot make a committed insert invisible.
    onSuccess(data, variables) {
      if (typeof applyCommitted === 'function' && data !== undefined) {
        queryClient.setQueryData(listKey, (current) => applyCommitted(current, data, variables));
      }
    },

    // Always attempt convergence. Refetch failure is deliberately caught after
    // a committed mutation: callers receive the successful service result and a
    // separate degraded-convergence signal, never a false insert failure.
    async onSettled(data, error, variables, context) {
      try {
        if (typeof invalidate === 'function') {
          await invalidate({ throwOnError: true });
        } else {
          await queryClient.invalidateQueries(
            { queryKey: SUPPORT_KEY_ROOT },
            { throwOnError: true }
          );
        }
      } catch (convergenceError) {
        if (!error && typeof onConvergenceError === 'function') {
          onConvergenceError(convergenceError, { data, variables, context });
        }
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
 * @param {(cache:any, data:any, variables:any)=>any} [params.applyCommitted] -
 *   reducer for a receiver-confirmed result, such as create's returned row.
 * @param {(error:unknown, context:object)=>void} [params.onConvergenceError] -
 *   post-commit refetch failure observer.
 * @param {object} [params.filter] - the same filter the page passed to
 *   useSupportTicketsQuery, so the optimistic write patches that page's cache entry.
 * @returns the React Query mutation object ({ mutate, mutateAsync, isPending, ... }).
 */
export function useSupportTicketsMutations({
  mutationFn,
  applyOptimistic,
  applyCommitted,
  onConvergenceError,
  filter,
} = {}) {
  const queryClient = useQueryClient();
  const invalidateSupport = useInvalidateSupportTickets();

  return useMutation(
    buildSupportTicketsMutationOptions({
      queryClient,
      mutationFn,
      applyOptimistic,
      applyCommitted,
      onConvergenceError,
      invalidate: invalidateSupport,
      listKey: supportListKey(filter),
    })
  );
}

export default useSupportTicketsMutations;
