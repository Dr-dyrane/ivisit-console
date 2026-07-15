import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '../../../lib/supabase';
import { getScheduledVisitsPageData, getVisitsPageData } from '../../../services/visitsService';
import { useVisitsDataSource } from './useVisitsDataSource';

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

jest.mock('../../../services/visitsService', () => ({
  getScheduledVisitsPageData: jest.fn(),
  getVisitsPageData: jest.fn(),
}));

jest.mock('../../../utils/errorHandler', () => ({
  handleApiError: jest.fn(),
}));

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('useVisitsDataSource realtime projection refresh', () => {
  let channel;
  let container;
  let latest;
  let listeners;
  let root;
  let setTotalCount;

  const filters = {};
  const sortConfig = { key: 'status', direction: 'desc' };
  const paginationRange = { start: 0, end: 19 };

  const Harness = () => {
    latest = useVisitsDataSource({
      filters,
      kpiFilter: 'all',
      pagination: {
        currentPage: 1,
        paginationRange,
        setTotalCount,
      },
      sortConfig,
    });
    return null;
  };

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    jest.useFakeTimers();
    listeners = [];
    setTotalCount = jest.fn();
    channel = {
      on: jest.fn((_kind, config, callback) => {
        listeners.push({ config, callback });
        return channel;
      }),
      subscribe: jest.fn(() => channel),
    };
    supabase.channel.mockReturnValue(channel);
    getVisitsPageData.mockResolvedValue({
      visits: [
        { id: 'visit-1', request_id: 'request-1' },
        { id: 'visit-2', request_id: 'request-2' },
      ],
      count: 2,
      stats: { total: 2 },
    });
    getScheduledVisitsPageData.mockResolvedValue({ visits: [], count: 0, stats: { total: 0 } });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    container.remove();
    jest.useRealTimers();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    jest.clearAllMocks();
  });

  it('debounces authorized Visit and emergency updates into a full page refetch', async () => {
    await act(async () => {
      root.render(<Harness />);
      await flushPromises();
    });

    expect(latest.visits).toHaveLength(2);
    expect(getVisitsPageData).toHaveBeenCalledTimes(1);
    expect(supabase.channel).toHaveBeenCalledWith('visits_page_projection');

    const visitListener = listeners.find(({ config }) => config.table === 'visits');
    const emergencyListener = listeners.find(({ config }) => config.table === 'emergency_requests');
    expect(visitListener.config).toEqual({
      event: '*',
      schema: 'public',
      table: 'visits',
    });
    expect(emergencyListener.config).toEqual({
      event: 'UPDATE',
      schema: 'public',
      table: 'emergency_requests',
    });

    act(() => {
      visitListener.callback({ eventType: 'UPDATE', new: { id: 'visit-2' } });
      emergencyListener.callback({ eventType: 'UPDATE', new: { id: 'request-2' } });
      jest.advanceTimersByTime(249);
    });
    expect(getVisitsPageData).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(1);
      await flushPromises();
    });

    expect(getVisitsPageData).toHaveBeenCalledTimes(2);
    expect(getVisitsPageData).toHaveBeenLastCalledWith(expect.objectContaining({
      filters,
      kpiFilter: 'all',
      range: paginationRange,
      sortConfig,
    }));

    act(() => root.unmount());
    root = null;
    expect(supabase.removeChannel).toHaveBeenCalledWith(channel);
  });
});
