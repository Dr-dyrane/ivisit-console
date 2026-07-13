import {
  QUERY_TIMEOUT_CODE,
  applyQueryAbortSignal,
  createQueryAbortContext,
  isQueryAbortError,
  isTransientReadError,
  retryTransientRead,
} from './queryAbort';

describe('query abort control', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('relays parent cancellation to the scoped request signal', () => {
    const parent = new AbortController();
    const request = createQueryAbortContext({ abortSignal: parent.signal, timeoutMs: 8000 });

    parent.abort();

    expect(request.signal.aborted).toBe(true);
    try {
      request.throwIfAborted();
    } catch (error) {
      expect(isQueryAbortError(error)).toBe(true);
    } finally {
      request.cleanup();
    }
  });

  it('turns the request deadline into a terminal timeout error', () => {
    jest.useFakeTimers();
    const request = createQueryAbortContext({ timeoutMs: 25, timeoutMessage: 'read timed out' });

    jest.advanceTimersByTime(25);

    expect(request.signal.aborted).toBe(true);
    expect(() => request.throwIfAborted()).toThrow('read timed out');
    try {
      request.throwIfAborted();
    } catch (error) {
      expect(error).toMatchObject({ name: 'TimeoutError', code: QUERY_TIMEOUT_CODE });
    } finally {
      request.cleanup();
    }
  });

  it('fails closed when a query builder cannot consume a real AbortSignal', () => {
    expect(() => applyQueryAbortSignal({}, new AbortController().signal))
      .toThrow('does not support request cancellation');
  });

  it('retries transport failures but never timeout or cancellation errors', () => {
    expect(isTransientReadError({ message: 'network fetch failed' })).toBe(true);
    expect(isTransientReadError({ status: 503, message: 'unavailable' })).toBe(true);
    expect(isTransientReadError({ name: 'TimeoutError', code: QUERY_TIMEOUT_CODE })).toBe(false);
    expect(isTransientReadError({ name: 'AbortError' })).toBe(false);
  });

  it('cancels an in-progress retry delay without starting another attempt', async () => {
    const controller = new AbortController();
    const operation = jest.fn().mockRejectedValue(new Error('network fetch failed'));
    const result = retryTransientRead(operation, {
      abortSignal: controller.signal,
      baseDelayMs: 60_000,
    });

    await Promise.resolve();
    controller.abort();

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
