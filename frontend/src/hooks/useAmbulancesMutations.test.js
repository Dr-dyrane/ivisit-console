import { QueryClient, MutationObserver } from '@tanstack/react-query';

// ambulancesService (transitively) imports lib/supabase.js, which THROWS when the
// REACT_APP_SUPABASE_* env vars are absent. Mocking the service module
// short-circuits that import chain and gives us the "mocked ambulancesService" the
// optimistic pattern is meant to be tested against. useAmbulancesQuery (imported by
// the hook under test) also pulls getAmbulancesPageData from here.
jest.mock('../services/ambulancesService', () => ({
  __esModule: true,
  getAmbulancesPageData: jest.fn(),
  createAmbulance: jest.fn(),
  updateAmbulance: jest.fn(),
  deleteAmbulance: jest.fn(),
}));

import {
  buildAmbulancesMutationOptions,
  applyOptimisticUpsert,
  applyOptimisticRemove,
  ambulancesListKey,
  AMBULANCES_KEY_ROOT,
} from './useAmbulancesMutations';
import { createAmbulance, updateAmbulance } from '../services/ambulancesService';

// Cache shape produced by useAmbulancesQuery (getAmbulancesPageData return shape).
const seedCache = () => ({
  data: [{ id: 'amb-1', call_sign: 'D-AMB-1', status: 'available' }],
  count: 1,
  stats: { total: 1 },
  recent: [{ id: 'amb-1' }],
});

const freshClient = () => new QueryClient({
  // Deterministic tests: no background retries on the mutation error path.
  defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('pure optimistic reducers', () => {
  it('applyOptimisticUpsert inserts a new ambulance at the front and grows count', () => {
    const next = applyOptimisticUpsert(seedCache(), { id: 'amb-2', call_sign: 'D-AMB-2' });
    expect(next.data.map((a) => a.id)).toEqual(['amb-2', 'amb-1']);
    expect(next.count).toBe(2);
    expect(next.stats).toEqual({ total: 1 }); // untouched
    expect(next.recent).toEqual([{ id: 'amb-1' }]); // preserved
  });

  it('applyOptimisticUpsert merges onto an existing ambulance without growing count', () => {
    const next = applyOptimisticUpsert(seedCache(), { id: 'amb-1', status: 'maintenance' });
    expect(next.data).toHaveLength(1);
    expect(next.data[0]).toEqual({ id: 'amb-1', call_sign: 'D-AMB-1', status: 'maintenance' });
    expect(next.count).toBe(1);
  });

  it('applyOptimisticUpsert tolerates an empty/undefined cache', () => {
    const next = applyOptimisticUpsert(undefined, { id: 'amb-9' });
    expect(next.data.map((a) => a.id)).toEqual(['amb-9']);
    expect(next.count).toBe(1);
  });

  it('applyOptimisticRemove drops the row and shrinks count only when present', () => {
    const removed = applyOptimisticRemove(seedCache(), 'amb-1');
    expect(removed.data).toEqual([]);
    expect(removed.count).toBe(0);

    const noop = applyOptimisticRemove(seedCache(), 'missing');
    expect(noop.data).toHaveLength(1);
    expect(noop.count).toBe(1);
  });
});

describe('buildAmbulancesMutationOptions callbacks (direct, real QueryClient)', () => {
  it('onMutate writes the optimistic value and returns the snapshot as rollback context', async () => {
    const queryClient = freshClient();
    const listKey = ambulancesListKey();
    const snapshot = seedCache();
    queryClient.setQueryData(listKey, snapshot);

    const options = buildAmbulancesMutationOptions({
      queryClient,
      mutationFn: createAmbulance,
      applyOptimistic: applyOptimisticUpsert,
      invalidate: jest.fn(),
      listKey,
    });

    const context = await options.onMutate({ id: 'amb-2', call_sign: 'D-AMB-2' });

    // Optimistic write is visible in the cache immediately.
    const patched = queryClient.getQueryData(listKey);
    expect(patched.data.map((a) => a.id)).toEqual(['amb-2', 'amb-1']);
    expect(patched.count).toBe(2);

    // Context carries the exact pre-mutation snapshot + the key to roll back.
    expect(context.previous).toBe(snapshot);
    expect(context.listKey).toEqual(listKey);
  });

  it('onError restores the snapshot on a service failure (rollback)', async () => {
    const queryClient = freshClient();
    const listKey = ambulancesListKey();
    const snapshot = seedCache();
    queryClient.setQueryData(listKey, snapshot);

    const options = buildAmbulancesMutationOptions({
      queryClient,
      mutationFn: createAmbulance,
      applyOptimistic: applyOptimisticUpsert,
      invalidate: jest.fn(),
      listKey,
    });

    const context = await options.onMutate({ id: 'amb-2' });
    // Sanity: cache moved off the snapshot before we roll back.
    expect(queryClient.getQueryData(listKey)).not.toBe(snapshot);

    options.onError(new Error('insert failed'), { id: 'amb-2' }, context);

    // Cache value equals the original snapshot again. (React Query applies
    // structural sharing on setQueryData, so this is deep-equal, not necessarily
    // the same object reference - value is the rollback contract that matters.)
    expect(queryClient.getQueryData(listKey)).toEqual(snapshot);
    expect(queryClient.getQueryData(listKey).data.map((a) => a.id)).toEqual(['amb-1']);
  });

  it('onSettled invalidates so the cache converges to server truth', () => {
    const queryClient = freshClient();
    const invalidate = jest.fn();

    buildAmbulancesMutationOptions({
      queryClient,
      mutationFn: createAmbulance,
      applyOptimistic: applyOptimisticUpsert,
      invalidate,
      listKey: ambulancesListKey(),
    }).onSettled();

    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('onSettled falls back to invalidating the AMBULANCES_KEY_ROOT prefix when no invalidate fn is given', () => {
    const queryClient = freshClient();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');

    buildAmbulancesMutationOptions({
      queryClient,
      mutationFn: createAmbulance,
      applyOptimistic: applyOptimisticUpsert,
      listKey: ambulancesListKey(),
    }).onSettled();

    expect(spy).toHaveBeenCalledWith({ queryKey: AMBULANCES_KEY_ROOT });
  });
});

describe('end-to-end mutation lifecycle via MutationObserver', () => {
  it('applies optimistic value, calls the service, and invalidates on success', async () => {
    const queryClient = freshClient();
    const listKey = ambulancesListKey();
    queryClient.setQueryData(listKey, seedCache());
    createAmbulance.mockResolvedValueOnce({ id: 'amb-2', call_sign: 'D-AMB-2' });
    const invalidate = jest.fn();

    const observer = new MutationObserver(
      queryClient,
      buildAmbulancesMutationOptions({
        queryClient,
        mutationFn: createAmbulance,
        applyOptimistic: applyOptimisticUpsert,
        invalidate,
        listKey,
      })
    );

    // onMutate runs on a microtask, so the optimistic write lands once the
    // mutation is awaited (not synchronously after the mutate() call).
    await observer.mutate({ id: 'amb-2', call_sign: 'D-AMB-2' });

    // React Query v5 invokes mutationFn(variables, context); assert the vars arg.
    expect(createAmbulance).toHaveBeenCalledTimes(1);
    expect(createAmbulance.mock.calls[0][0]).toEqual({ id: 'amb-2', call_sign: 'D-AMB-2' });
    expect(invalidate).toHaveBeenCalledTimes(1);
    // On success the optimistic row stays until the invalidated query refetches
    // (there is no active observer here to trigger a refetch).
    expect(queryClient.getQueryData(listKey).data.map((a) => a.id)).toEqual(['amb-2', 'amb-1']);
  });

  it('rolls the cache back to the snapshot when the service rejects', async () => {
    const queryClient = freshClient();
    const listKey = ambulancesListKey();
    const snapshot = seedCache();
    queryClient.setQueryData(listKey, snapshot);
    updateAmbulance.mockRejectedValueOnce(new Error('rls denied'));
    const invalidate = jest.fn();

    const observer = new MutationObserver(
      queryClient,
      buildAmbulancesMutationOptions({
        queryClient,
        mutationFn: updateAmbulance,
        applyOptimistic: applyOptimisticUpsert,
        invalidate,
        listKey,
      })
    );

    await expect(observer.mutate({ id: 'amb-1', status: 'maintenance' })).rejects.toThrow('rls denied');

    // Rolled back to the snapshot value, and still converged (invalidate ran).
    expect(queryClient.getQueryData(listKey)).toEqual(snapshot);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});
