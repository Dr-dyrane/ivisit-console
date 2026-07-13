export const QUERY_ABORTED_CODE = 'QUERY_ABORTED';
export const QUERY_TIMEOUT_CODE = 'QUERY_TIMEOUT';
const abortReasons = new WeakMap();

const createNamedError = (message, name, code) => {
  const error = new Error(message);
  error.name = name;
  error.code = code;
  return error;
};

export const createQueryAbortError = (message = 'The request was cancelled.') => (
  createNamedError(message, 'AbortError', QUERY_ABORTED_CODE)
);

export const createQueryTimeoutError = (message = 'The request timed out.') => (
  createNamedError(message, 'TimeoutError', QUERY_TIMEOUT_CODE)
);

const getAbortReason = (signal) => {
  const trackedReason = signal ? abortReasons.get(signal) : null;
  if (trackedReason) return trackedReason;
  const reason = signal?.reason;
  if (reason && typeof reason === 'object' && typeof reason.name === 'string') {
    return reason;
  }
  if (typeof reason === 'string' && reason.trim()) {
    return createQueryAbortError(reason);
  }
  return createQueryAbortError();
};

export function throwIfQueryAborted(signal) {
  if (signal?.aborted) throw getAbortReason(signal);
}

export function isQueryAbortError(error) {
  return error?.name === 'AbortError' || error?.code === QUERY_ABORTED_CODE;
}

export function isTransientReadError(error) {
  if (!error || isQueryAbortError(error) || error?.code === QUERY_TIMEOUT_CODE || error?.name === 'TimeoutError') {
    return false;
  }

  const code = error?.code || error?.status;
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('timeout')) return false;
  if (message.includes('fetch') || message.includes('network')) return true;
  if ([429, 502, 503, 504].includes(Number(code))) return true;
  return code === '40001';
}

export function applyQueryAbortSignal(query, abortSignal) {
  if (!abortSignal) return query;
  if (typeof query?.abortSignal !== 'function') {
    const error = new Error('This Supabase query does not support request cancellation.');
    error.code = 'QUERY_ABORT_UNSUPPORTED';
    throw error;
  }
  return query.abortSignal(abortSignal);
}

export function createQueryAbortContext({
  abortSignal,
  timeoutMs = 8000,
  timeoutMessage = 'The request timed out.',
} = {}) {
  const controller = new AbortController();
  const timeoutError = createQueryTimeoutError(timeoutMessage);
  const abortRequest = (reason) => {
    if (controller.signal.aborted) return;
    abortReasons.set(controller.signal, reason);
    controller.abort(reason);
  };

  const abortFromParent = () => {
    abortRequest(getAbortReason(abortSignal));
  };

  if (abortSignal?.aborted) {
    abortFromParent();
  } else if (abortSignal) {
    abortSignal.addEventListener('abort', abortFromParent, { once: true });
  }

  const timeoutId = !controller.signal.aborted && Number.isFinite(timeoutMs) && timeoutMs > 0
    ? setTimeout(() => abortRequest(timeoutError), timeoutMs)
    : null;

  return {
    signal: controller.signal,
    abort(reason) {
      abortRequest(reason && typeof reason === 'object' ? reason : createQueryAbortError());
    },
    throwIfAborted() {
      throwIfQueryAborted(controller.signal);
    },
    cleanup() {
      if (timeoutId) clearTimeout(timeoutId);
      if (abortSignal) abortSignal.removeEventListener('abort', abortFromParent);
    },
  };
}

const waitForRetry = (delayMs, abortSignal) => {
  throwIfQueryAborted(abortSignal);

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timeoutId);
      try {
        throwIfQueryAborted(abortSignal);
      } catch (error) {
        reject(error);
      }
    };
    const timeoutId = setTimeout(() => {
      abortSignal?.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);

    abortSignal?.addEventListener('abort', onAbort, { once: true });
  });
};

export async function retryTransientRead(operation, {
  abortSignal,
  maxAttempts = 3,
  baseDelayMs = 500,
} = {}) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    throwIfQueryAborted(abortSignal);
    try {
      return await operation(attempt);
    } catch (error) {
      throwIfQueryAborted(abortSignal);
      lastError = error;
      if (attempt === maxAttempts || !isTransientReadError(error)) throw error;

      const baseDelay = baseDelayMs * (2 ** (attempt - 1));
      const jitter = Math.random() * baseDelay * 0.3;
      await waitForRetry(baseDelay + jitter, abortSignal);
    }
  }

  throw lastError;
}
