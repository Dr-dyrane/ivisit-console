import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useDriverDispatchFeed } from './useDriverDispatchFeed';
import { useDriverLocationTracking } from './useDriverLocationTracking';

const mockGetDispatchFeed = jest.fn();
const mockSubscribeToDispatchFeed = jest.fn();
const mockGetTelemetryState = jest.fn();
const mockReportTelemetry = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('../../../services/driverManagementService', () => ({
  driverManagementService: {
    getDispatchFeed: (...args) => mockGetDispatchFeed(...args),
    subscribeToDispatchFeed: (...args) => mockSubscribeToDispatchFeed(...args),
    getTelemetryState: (...args) => mockGetTelemetryState(...args),
    reportTelemetry: (...args) => mockReportTelemetry(...args),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

const assignment = {
  assignment_id: 'assignment-1',
  request_id: 'request-1',
  ambulance_id: 'ambulance-1',
};
const ambulance = { id: 'ambulance-1', telemetry_sequence: 3 };

const positionAt = (timestamp) => ({
  timestamp,
  coords: {
    latitude: 6.5244,
    longitude: 3.3792,
    heading: 90,
    accuracy: 8,
  },
});

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('driver runtime hooks', () => {
  let container;
  let root;
  let latestTracking;
  let visibilityState;
  let watchSuccess;
  let freshPositionRequests;
  let originalGeolocation;
  let originalVisibilityState;

  const FeedHarness = () => {
    useDriverDispatchFeed({ enabled: true, responderId: 'driver-1' });
    return null;
  };

  const TrackingHarness = () => {
    latestTracking = useDriverLocationTracking({ assignment, ambulance, enabled: true });
    return null;
  };

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-14T12:00:00.000Z'));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    visibilityState = 'visible';
    freshPositionRequests = [];
    originalGeolocation = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
    originalVisibilityState = Object.getOwnPropertyDescriptor(document, 'visibilityState');

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibilityState,
    });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        clearWatch: jest.fn(),
        getCurrentPosition: jest.fn((success, error, options) => {
          freshPositionRequests.push({ error, options, success });
        }),
        watchPosition: jest.fn((success) => {
          watchSuccess = success;
          return 41;
        }),
      },
    });

    mockGetDispatchFeed.mockResolvedValue([]);
    mockSubscribeToDispatchFeed.mockReturnValue(mockUnsubscribe);
    mockGetTelemetryState.mockResolvedValue({
      success: true,
      state: 'live',
      last_known: true,
      received_at: '2026-07-14T11:59:59.000Z',
      sequence: 4,
    });
    mockReportTelemetry.mockImplementation(async ({ sequence }) => ({
      success: true,
      received_at: new Date(Date.now()).toISOString(),
      lease_expires_at: new Date(Date.now() + 45000).toISOString(),
      sequence,
    }));
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    container.remove();
    if (originalGeolocation) {
      Object.defineProperty(navigator, 'geolocation', originalGeolocation);
    } else {
      delete navigator.geolocation;
    }
    if (originalVisibilityState) {
      Object.defineProperty(document, 'visibilityState', originalVisibilityState);
    } else {
      delete document.visibilityState;
    }
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  it('renews stationary telemetry inside the lease without stale state rereads', async () => {
    let resolveInitialTelemetry;
    mockGetTelemetryState.mockReset();
    mockGetTelemetryState.mockReturnValueOnce(new Promise((resolve) => {
      resolveInitialTelemetry = resolve;
    }));

    await act(async () => {
      root.render(<TrackingHarness />);
      await flushPromises();
    });
    act(() => latestTracking.start());

    await act(async () => {
      resolveInitialTelemetry({
        success: true,
        state: 'live',
        last_known: true,
        received_at: '2026-07-14T11:59:59.000Z',
        sequence: 4,
      });
      await flushPromises();
    });
    await act(async () => {
      watchSuccess(positionAt(Date.now()));
      await flushPromises();
    });

    expect(mockGetTelemetryState).toHaveBeenCalledTimes(1);
    expect(mockReportTelemetry).toHaveBeenCalledTimes(1);
    expect(mockReportTelemetry.mock.calls[0][0]).toMatchObject({
      assignmentId: 'assignment-1',
      requestId: 'request-1',
      sequence: 5,
    });

    act(() => jest.advanceTimersByTime(20000));
    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
    await act(async () => {
      freshPositionRequests.shift().success(positionAt(Date.now()));
      await flushPromises();
    });

    expect(mockGetTelemetryState).toHaveBeenCalledTimes(1);
    expect(mockReportTelemetry).toHaveBeenCalledTimes(2);
    expect(mockReportTelemetry.mock.calls[1][0]).toMatchObject({
      location: { lat: 6.5244, lng: 3.3792 },
      sequence: 6,
    });
  });

  it('refetches and republishes immediately when an active tracking page returns', async () => {
    await act(async () => {
      root.render(<TrackingHarness />);
      await flushPromises();
    });
    act(() => latestTracking.start());
    await act(async () => {
      watchSuccess(positionAt(Date.now()));
      await flushPromises();
    });

    visibilityState = 'hidden';
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(2000));
    visibilityState = 'visible';
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await flushPromises();
    });
    expect(mockGetTelemetryState).toHaveBeenCalledTimes(2);
    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
    await act(async () => {
      freshPositionRequests.shift().success(positionAt(Date.now()));
      await flushPromises();
    });
    expect(mockReportTelemetry).toHaveBeenCalledTimes(2);

    act(() => window.dispatchEvent(new Event('focus')));
    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);

    act(() => jest.advanceTimersByTime(1001));
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await flushPromises();
    });
    expect(mockGetTelemetryState).toHaveBeenCalledTimes(3);
    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it('drops a pending heartbeat after the driver stops sharing location', async () => {
    await act(async () => {
      root.render(<TrackingHarness />);
      await flushPromises();
    });
    act(() => latestTracking.start());
    act(() => jest.advanceTimersByTime(20000));
    expect(freshPositionRequests).toHaveLength(1);

    act(() => latestTracking.stop({ quiet: true }));
    await act(async () => {
      freshPositionRequests.shift().success(positionAt(Date.now()));
      await flushPromises();
    });

    expect(mockReportTelemetry).not.toHaveBeenCalled();
    expect(navigator.geolocation.clearWatch).toHaveBeenCalledWith(41);
  });

  it('refreshes the driver feed on visible and focused page recovery', async () => {
    await act(async () => {
      root.render(<FeedHarness />);
      await flushPromises();
    });
    expect(mockGetDispatchFeed).toHaveBeenCalledTimes(1);
    expect(mockSubscribeToDispatchFeed).toHaveBeenCalledWith('driver-1', expect.any(Function));

    visibilityState = 'hidden';
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(mockGetDispatchFeed).toHaveBeenCalledTimes(1);

    act(() => jest.advanceTimersByTime(2000));
    visibilityState = 'visible';
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await flushPromises();
    });
    expect(mockGetDispatchFeed).toHaveBeenCalledTimes(2);

    act(() => window.dispatchEvent(new Event('focus')));
    expect(mockGetDispatchFeed).toHaveBeenCalledTimes(2);
    act(() => jest.advanceTimersByTime(1001));
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await flushPromises();
    });
    expect(mockGetDispatchFeed).toHaveBeenCalledTimes(3);
  });
});
