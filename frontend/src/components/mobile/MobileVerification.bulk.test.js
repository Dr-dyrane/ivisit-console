import { approveProvidersSequentially } from './MobileVerification';

jest.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}), { virtual: true });

describe('MobileVerification bulk approval', () => {
  it('awaits approvals in stable order and reports progress', async () => {
    const events = [];
    const onProgress = jest.fn();
    const onApprove = jest.fn(async (id) => {
      events.push(`start:${id}`);
      await Promise.resolve();
      events.push(`end:${id}`);
      return true;
    });

    const result = await approveProvidersSequentially(
      ['provider-1', 'provider-2', 'provider-3'],
      onApprove,
      onProgress,
    );

    expect(events).toEqual([
      'start:provider-1',
      'end:provider-1',
      'start:provider-2',
      'end:provider-2',
      'start:provider-3',
      'end:provider-3',
    ]);
    expect(result).toEqual({
      succeededIds: ['provider-1', 'provider-2', 'provider-3'],
      failedIds: [],
    });
    expect(onProgress.mock.calls.map(([progress]) => progress)).toEqual([
      { completed: 1, total: 3 },
      { completed: 2, total: 3 },
      { completed: 3, total: 3 },
    ]);
  });

  it('keeps false and rejected approvals in the failed result', async () => {
    const onApprove = jest.fn(async (id) => {
      if (id === 'provider-2') return false;
      if (id === 'provider-3') throw new Error('receiver unavailable');
      return true;
    });

    await expect(approveProvidersSequentially(
      ['provider-1', 'provider-2', 'provider-3'],
      onApprove,
    )).resolves.toEqual({
      succeededIds: ['provider-1'],
      failedIds: ['provider-2', 'provider-3'],
    });
  });
});
