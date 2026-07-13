import {
  applyOptimisticUpsert,
  buildSupportTicketsMutationOptions,
  settleSupportTicketDeletes,
  supportListKey,
} from './useSupportTicketsMutations';

const createQueryClient = (key, initialCache) => {
  let cache = initialCache;
  return {
    cancelQueries: jest.fn().mockResolvedValue(undefined),
    getQueryData: jest.fn(() => cache),
    setQueryData: jest.fn((receivedKey, updater) => {
      expect(receivedKey).toEqual(key);
      cache = typeof updater === 'function' ? updater(cache) : updater;
      return cache;
    }),
    invalidateQueries: jest.fn().mockResolvedValue(undefined),
    readCache: () => cache,
  };
};

describe('support ticket mutation settlement', () => {
  it('settles every selected delete and confirms only matching receiver identities', async () => {
    const deleteOne = jest.fn(async (ticketId) => {
      if (ticketId === 'ticket-2') throw new Error('receiver failed');
      if (ticketId === 'ticket-3') return { id: 'different-ticket' };
      return { id: ticketId };
    });

    const outcome = await settleSupportTicketDeletes(
      ['ticket-1', 'ticket-2', 'ticket-3'],
      deleteOne
    );

    expect(deleteOne.mock.calls.map(([ticketId]) => ticketId)).toEqual([
      'ticket-1',
      'ticket-2',
      'ticket-3',
    ]);
    expect(outcome.confirmed).toEqual([{ id: 'ticket-1', ticket: { id: 'ticket-1' } }]);
    expect(outcome.failed.map(({ id }) => id)).toEqual(['ticket-2', 'ticket-3']);
    expect(outcome.failed[0].error).toEqual(expect.any(Error));
    expect(outcome.failed[1].error.message).toContain('was not confirmed');
  });

  it('writes a committed create result before convergence and contains refetch failure', async () => {
    const listKey = supportListKey({ status: [] });
    const queryClient = createQueryClient(listKey, {
      data: [{ id: 'ticket-old', subject: 'Existing' }],
      count: 1,
      stats: { total: 1 },
    });
    const convergenceError = new Error('refetch failed');
    const invalidate = jest.fn().mockRejectedValue(convergenceError);
    const onConvergenceError = jest.fn();
    const options = buildSupportTicketsMutationOptions({
      queryClient,
      mutationFn: jest.fn(),
      applyCommitted: applyOptimisticUpsert,
      invalidate,
      onConvergenceError,
      listKey,
    });
    const variables = { subject: 'Committed request' };
    const context = await options.onMutate(variables);
    const createdTicket = { id: 'ticket-new', subject: 'Committed request' };

    options.onSuccess(createdTicket, variables, context);

    expect(queryClient.readCache()).toEqual({
      data: [createdTicket, { id: 'ticket-old', subject: 'Existing' }],
      count: 2,
      stats: { total: 1 },
    });
    await expect(options.onSettled(createdTicket, null, variables, context)).resolves.toBeUndefined();
    expect(invalidate).toHaveBeenCalledWith({ throwOnError: true });
    expect(onConvergenceError).toHaveBeenCalledWith(convergenceError, {
      data: createdTicket,
      variables,
      context,
    });
    expect(queryClient.readCache().data[0]).toEqual(createdTicket);
  });

  it('does not report convergence degradation for an uncommitted mutation failure', async () => {
    const listKey = supportListKey();
    const initialCache = { data: [{ id: 'ticket-old' }], count: 1 };
    const queryClient = createQueryClient(listKey, initialCache);
    const invalidate = jest.fn().mockRejectedValue(new Error('refetch also failed'));
    const onConvergenceError = jest.fn();
    const options = buildSupportTicketsMutationOptions({
      queryClient,
      mutationFn: jest.fn(),
      applyOptimistic: (cache) => ({ ...cache, data: [] }),
      invalidate,
      onConvergenceError,
      listKey,
    });
    const variables = { id: 'ticket-old' };
    const context = await options.onMutate(variables);
    const mutationError = new Error('insert failed');

    options.onError(mutationError, variables, context);
    await expect(options.onSettled(undefined, mutationError, variables, context)).resolves.toBeUndefined();

    expect(queryClient.readCache()).toBe(initialCache);
    expect(onConvergenceError).not.toHaveBeenCalled();
  });
});
