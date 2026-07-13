import { canApplyEmergencyDetailProjection } from './emergencyDetailRefresh';

const deferred = () => {
  let resolve;
  const promise = new Promise((next) => {
    resolve = next;
  });
  return { promise, resolve };
};

describe('emergency detail refresh sequencing', () => {
  it('ignores an old request projection that resolves after the new request', async () => {
    let latestSequence = 0;
    let activeRequestId = 'request-a';
    const applied = [];
    const first = deferred();
    const second = deferred();

    const run = async (requestId, projectionPromise) => {
      const sequence = ++latestSequence;
      const projection = await projectionPromise;
      if (canApplyEmergencyDetailProjection({
        sequence,
        latestSequence,
        requestId,
        activeRequestId,
        isOpen: true,
      })) {
        applied.push(projection);
      }
    };

    const firstRun = run('request-a', first.promise);
    activeRequestId = 'request-b';
    const secondRun = run('request-b', second.promise);

    second.resolve({ requestId: 'request-b', paymentId: 'payment-b' });
    await secondRun;
    first.resolve({ requestId: 'request-a', paymentId: 'payment-a' });
    await firstRun;

    expect(applied).toEqual([{ requestId: 'request-b', paymentId: 'payment-b' }]);
  });

  it('ignores an older refresh for the same request when it resolves last', async () => {
    let latestSequence = 0;
    const activeRequestId = 'request-a';
    const applied = [];
    const first = deferred();
    const second = deferred();

    const run = async (projectionPromise) => {
      const sequence = ++latestSequence;
      const projection = await projectionPromise;
      if (canApplyEmergencyDetailProjection({
        sequence,
        latestSequence,
        requestId: activeRequestId,
        activeRequestId,
        isOpen: true,
      })) {
        applied.push(projection);
      }
    };

    const firstRun = run(first.promise);
    const secondRun = run(second.promise);

    second.resolve({ version: 2 });
    await secondRun;
    first.resolve({ version: 1 });
    await firstRun;

    expect(applied).toEqual([{ version: 2 }]);
  });
});
