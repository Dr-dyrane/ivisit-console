import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MapProvider, useMapContext } from './MapContext';

const mockFetchInitialMapData = jest.fn();
const mockSubscribeToEmergencies = jest.fn(() => jest.fn());
const mockSubscribeToAmbulances = jest.fn(() => jest.fn());
const mockSubscribeToHospitals = jest.fn(() => jest.fn());

jest.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/map' }),
}));

jest.mock('../services/supabaseMapService', () => ({
  supabaseMapService: {
    fetchInitialMapData: (...args) => mockFetchInitialMapData(...args),
    subscribeToEmergencies: (...args) => mockSubscribeToEmergencies(...args),
    subscribeToAmbulances: (...args) => mockSubscribeToAmbulances(...args),
    subscribeToHospitals: (...args) => mockSubscribeToHospitals(...args),
  },
}));

jest.mock('sonner', () => ({
  toast: { info: jest.fn() },
}));

const sourceState = {
  emergencies: { ready: true, partial: false, limit: 100 },
  ambulances: { ready: true, partial: false, limit: 1000 },
  hospitals: { ready: true, partial: false, limit: 1000 },
};

const mapPayload = (emergencies) => ({
  emergencies,
  ambulances: [],
  hospitals: [],
  sourceState,
});

describe('MapContext selected marker', () => {
  let container;
  let latest;
  let root;

  const Probe = () => {
    latest = useMapContext();
    return null;
  };

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.clearAllMocks();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  it('retains marker identity and resolves its record from each refreshed map collection', async () => {
    const openingRecord = { id: 'request-1', status: 'pending_approval' };
    mockFetchInitialMapData.mockResolvedValueOnce(mapPayload([openingRecord]));

    await act(async () => {
      root.render(
        <MapProvider>
          <Probe />
        </MapProvider>
      );
      await Promise.resolve();
    });

    act(() => {
      latest.setSelectedMarker({
        type: 'emergency',
        data: { ...openingRecord, status: 'completed' },
      });
    });

    expect(latest.mapData.selectedMarker.data).toBe(openingRecord);
    expect(latest.mapData.selectedMarker.data.status).toBe('pending_approval');

    const refreshedRecord = { ...openingRecord, status: 'cancelled' };
    mockFetchInitialMapData.mockResolvedValueOnce(mapPayload([refreshedRecord]));
    await act(async () => {
      await latest.refresh();
    });

    expect(latest.mapData.selectedMarker.type).toBe('emergency');
    expect(latest.mapData.selectedMarker.data).toBe(refreshedRecord);
    expect(latest.mapData.selectedMarker.data.status).toBe('cancelled');

    mockFetchInitialMapData.mockResolvedValueOnce(mapPayload([]));
    await act(async () => {
      await latest.refresh();
    });

    expect(latest.mapData.selectedMarker).toBeNull();
  });
});
