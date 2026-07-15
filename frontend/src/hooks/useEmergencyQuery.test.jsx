import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../services/emergencyService', () => ({
  getEmergencyRequest: jest.fn(),
  getEmergencyRequestsPage: jest.fn(),
  getLatestEmergencyPayment: jest.fn(),
}));

import {
  getEmergencyRequest,
  getLatestEmergencyPayment,
} from '../services/emergencyService';
import { useEmergencyRequestQuery } from './useEmergencyQuery';

describe('useEmergencyRequestQuery', () => {
  let container;
  let latest;
  let queryClient;
  let root;

  const Harness = ({ requestId }) => {
    latest = useEmergencyRequestQuery(requestId);
    return null;
  };

  const render = (requestId) => {
    act(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <Harness requestId={requestId} />
        </QueryClientProvider>
      );
    });
  };

  const waitForQuery = async (predicate) => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (predicate()) return;
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }
    expect(predicate()).toBe(true);
  };

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    queryClient.clear();
    container.remove();
    jest.clearAllMocks();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  it('does not acquire detail truth until a request is selected', () => {
    render(null);

    expect(latest.isSuccess).toBe(false);
    expect(getEmergencyRequest).not.toHaveBeenCalled();
    expect(getLatestEmergencyPayment).not.toHaveBeenCalled();
  });

  it('refetches the active request snapshot when the emergency root is invalidated', async () => {
    const requestId = 'request-1';
    getEmergencyRequest.mockResolvedValueOnce({
      id: requestId,
      status: 'pending_approval',
    });
    getLatestEmergencyPayment.mockResolvedValueOnce({
      payment: {
        emergency_request_id: requestId,
        payment_method: 'cash',
        status: 'pending',
      },
      visibilityState: 'visible',
    });

    render(requestId);
    await waitForQuery(() => latest.isSuccess);

    expect(latest.request).toEqual(expect.objectContaining({
      id: requestId,
      status: 'pending_approval',
      payment_method: 'cash',
      payment_status: 'pending',
    }));

    getEmergencyRequest.mockResolvedValueOnce({
      id: requestId,
      status: 'cancelled',
    });
    getLatestEmergencyPayment.mockResolvedValueOnce({
      payment: {
        emergency_request_id: requestId,
        payment_method: 'cash',
        status: 'paid',
      },
      visibilityState: 'visible',
    });

    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['emergency'] });
    });
    await waitForQuery(() => latest.request?.status === 'cancelled');

    expect(getEmergencyRequest).toHaveBeenCalledTimes(2);
    expect(getLatestEmergencyPayment).toHaveBeenCalledTimes(2);
    expect(latest.request).toEqual(expect.objectContaining({
      id: requestId,
      status: 'cancelled',
      payment_status: 'paid',
    }));
    expect(queryClient.getQueryData(['emergency', 'request', requestId])).toEqual(latest.request);
  });
});
