import { QueryClient, MutationObserver } from '@tanstack/react-query';

// doctorsService (transitively) imports lib/supabase.js, which THROWS when the
// REACT_APP_SUPABASE_* env vars are absent (lib/supabase.js:6-8). Mocking the
// service module short-circuits that import chain and gives us the "mocked
// doctorsService" the S2-4 pilot is meant to be tested against. useDoctorsQuery
// (imported by the hook under test) also pulls getDoctors from here.
jest.mock('../services/doctorsService', () => ({
  __esModule: true,
  getDoctors: jest.fn(),
  createDoctor: jest.fn(),
  updateDoctor: jest.fn(),
  deleteDoctor: jest.fn(),
}));

import {
  buildDoctorsMutationOptions,
  applyOptimisticUpsert,
  applyOptimisticRemove,
  doctorsListKey,
  DOCTORS_KEY_ROOT,
} from './useDoctorsMutations';
import { createDoctor, updateDoctor } from '../services/doctorsService';

// Cache shape produced by useDoctorsQuery (useDoctorsQuery.js:28-30).
const seedCache = () => ({
  data: [{ id: 'doc-1', name: 'Existing Doctor', status: 'available' }],
  count: 1,
  stats: { total: 1 },
});

const freshClient = () => new QueryClient({
  // Deterministic tests: no background retries on the mutation error path.
  defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('pure optimistic reducers', () => {
  it('applyOptimisticUpsert inserts a new doctor at the front and grows count', () => {
    const next = applyOptimisticUpsert(seedCache(), { id: 'doc-2', name: 'New Doctor' });
    expect(next.data.map((d) => d.id)).toEqual(['doc-2', 'doc-1']);
    expect(next.count).toBe(2);
    expect(next.stats).toEqual({ total: 1 }); // untouched
  });

  it('applyOptimisticUpsert merges onto an existing doctor without growing count', () => {
    const next = applyOptimisticUpsert(seedCache(), { id: 'doc-1', status: 'busy' });
    expect(next.data).toHaveLength(1);
    expect(next.data[0]).toEqual({ id: 'doc-1', name: 'Existing Doctor', status: 'busy' });
    expect(next.count).toBe(1);
  });

  it('applyOptimisticUpsert tolerates an empty/undefined cache', () => {
    const next = applyOptimisticUpsert(undefined, { id: 'doc-9' });
    expect(next.data.map((d) => d.id)).toEqual(['doc-9']);
    expect(next.count).toBe(1);
  });

  it('applyOptimisticRemove drops the row and shrinks count only when present', () => {
    const removed = applyOptimisticRemove(seedCache(), 'doc-1');
    expect(removed.data).toEqual([]);
    expect(removed.count).toBe(0);

    const noop = applyOptimisticRemove(seedCache(), 'missing');
    expect(noop.data).toHaveLength(1);
    expect(noop.count).toBe(1);
  });
});

describe('buildDoctorsMutationOptions callbacks (direct, real QueryClient)', () => {
  it('onMutate writes the optimistic value and returns the snapshot as rollback context', async () => {
    const queryClient = freshClient();
    const listKey = doctorsListKey();
    const snapshot = seedCache();
    queryClient.setQueryData(listKey, snapshot);

    const options = buildDoctorsMutationOptions({
      queryClient,
      mutationFn: createDoctor,
      applyOptimistic: applyOptimisticUpsert,
      invalidate: jest.fn(),
      listKey,
    });

    const context = await options.onMutate({ id: 'doc-2', name: 'New Doctor' });

    // Optimistic write is visible in the cache immediately.
    const patched = queryClient.getQueryData(listKey);
    expect(patched.data.map((d) => d.id)).toEqual(['doc-2', 'doc-1']);
    expect(patched.count).toBe(2);

    // Context carries the exact pre-mutation snapshot + the key to roll back.
    expect(context.previous).toBe(snapshot);
    expect(context.listKey).toEqual(listKey);
  });

  it('onError restores the snapshot on a service failure (rollback)', async () => {
    const queryClient = freshClient();
    const listKey = doctorsListKey();
    const snapshot = seedCache();
    queryClient.setQueryData(listKey, snapshot);

    const options = buildDoctorsMutationOptions({
      queryClient,
      mutationFn: createDoctor,
      applyOptimistic: applyOptimisticUpsert,
      invalidate: jest.fn(),
      listKey,
    });

    const context = await options.onMutate({ id: 'doc-2' });
    // Sanity: cache moved off the snapshot before we roll back.
    expect(queryClient.getQueryData(listKey)).not.toBe(snapshot);

    options.onError(new Error('insert failed'), { id: 'doc-2' }, context);

    // Cache value equals the original snapshot again. (React Query applies
    // structural sharing on setQueryData, so this is deep-equal, not necessarily
    // the same object reference - value is the rollback contract that matters.)
    expect(queryClient.getQueryData(listKey)).toEqual(snapshot);
    expect(queryClient.getQueryData(listKey).data.map((d) => d.id)).toEqual(['doc-1']);
  });

  it('onSettled awaits invalidation so the cache converges to server truth', async () => {
    const queryClient = freshClient();
    const invalidate = jest.fn();

    const settled = buildDoctorsMutationOptions({
      queryClient,
      mutationFn: createDoctor,
      applyOptimistic: applyOptimisticUpsert,
      invalidate,
      listKey: doctorsListKey(),
    }).onSettled();

    await expect(settled).resolves.toBeUndefined();
    expect(invalidate).toHaveBeenCalledWith({ throwOnError: true });
  });

  it('onSettled falls back to invalidating the DOCTORS_KEY_ROOT prefix when no invalidate fn is given', async () => {
    const queryClient = freshClient();
    const spy = jest.spyOn(queryClient, 'invalidateQueries');

    await buildDoctorsMutationOptions({
      queryClient,
      mutationFn: createDoctor,
      applyOptimistic: applyOptimisticUpsert,
      listKey: doctorsListKey(),
    }).onSettled();

    expect(spy).toHaveBeenCalledWith(
      { queryKey: DOCTORS_KEY_ROOT },
      { throwOnError: true }
    );
  });
});

describe('end-to-end mutation lifecycle via MutationObserver', () => {
  it('keeps mutateAsync pending until delayed server convergence settles', async () => {
    const queryClient = freshClient();
    const listKey = doctorsListKey();
    queryClient.setQueryData(listKey, seedCache());
    createDoctor.mockResolvedValueOnce({ id: 'doc-2', name: 'New Doctor' });

    let releaseInvalidation;
    let markInvalidationStarted;
    const invalidationStarted = new Promise((resolve) => {
      markInvalidationStarted = resolve;
    });
    const invalidate = jest.fn(() => {
      markInvalidationStarted();
      return new Promise((resolve) => {
        releaseInvalidation = resolve;
      });
    });
    const observer = new MutationObserver(
      queryClient,
      buildDoctorsMutationOptions({
        queryClient,
        mutationFn: createDoctor,
        applyOptimistic: applyOptimisticUpsert,
        invalidate,
        listKey,
      })
    );

    let mutationSettled = false;
    const mutation = observer.mutate({ id: 'doc-2', name: 'New Doctor' }).then(() => {
      mutationSettled = true;
    });

    await invalidationStarted;
    expect(mutationSettled).toBe(false);
    expect(invalidate).toHaveBeenCalledWith({ throwOnError: true });

    releaseInvalidation();
    await mutation;
    expect(mutationSettled).toBe(true);
  });

  it('applies optimistic value, calls the service, and invalidates on success', async () => {
    const queryClient = freshClient();
    const listKey = doctorsListKey();
    queryClient.setQueryData(listKey, seedCache());
    createDoctor.mockResolvedValueOnce({ id: 'doc-2', name: 'New Doctor' });
    const invalidate = jest.fn();

    const observer = new MutationObserver(
      queryClient,
      buildDoctorsMutationOptions({
        queryClient,
        mutationFn: createDoctor,
        applyOptimistic: applyOptimisticUpsert,
        invalidate,
        listKey,
      })
    );

    // onMutate runs on a microtask, so the optimistic write lands once the
    // mutation is awaited (not synchronously after the mutate() call).
    await observer.mutate({ id: 'doc-2', name: 'New Doctor' });

    // React Query v5 invokes mutationFn(variables, context); assert the vars arg.
    expect(createDoctor).toHaveBeenCalledTimes(1);
    expect(createDoctor.mock.calls[0][0]).toEqual({ id: 'doc-2', name: 'New Doctor' });
    expect(invalidate).toHaveBeenCalledTimes(1);
    // On success the optimistic row stays until the invalidated query refetches
    // (there is no active observer here to trigger a refetch).
    expect(queryClient.getQueryData(listKey).data.map((d) => d.id)).toEqual(['doc-2', 'doc-1']);
  });

  it('rolls the cache back to the snapshot when the service rejects', async () => {
    const queryClient = freshClient();
    const listKey = doctorsListKey();
    const snapshot = seedCache();
    queryClient.setQueryData(listKey, snapshot);
    updateDoctor.mockRejectedValueOnce(new Error('rls denied'));
    const invalidate = jest.fn();

    const observer = new MutationObserver(
      queryClient,
      buildDoctorsMutationOptions({
        queryClient,
        mutationFn: updateDoctor,
        applyOptimistic: applyOptimisticUpsert,
        invalidate,
        listKey,
      })
    );

    await expect(observer.mutate({ id: 'doc-1', status: 'busy' })).rejects.toThrow('rls denied');

    // Rolled back to the snapshot value, and still converged (invalidate ran).
    expect(queryClient.getQueryData(listKey)).toEqual(snapshot);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});
