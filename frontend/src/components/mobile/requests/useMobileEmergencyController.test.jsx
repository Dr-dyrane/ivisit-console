import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useMobileEmergencyController } from './useMobileEmergencyController';

jest.mock('../../../hooks/useFeedback', () => ({
  useFeedback: () => ({ triggerFromEvent: jest.fn() }),
}));

jest.mock('../../../hooks/useReverseGeocode', () => ({
  useReverseGeocode: () => ({ place: null }),
}));

jest.mock('../../../hooks/useEmergencyQuery', () => ({
  useEmergencyRequestQuery: jest.fn(),
}));

import { useEmergencyRequestQuery } from '../../../hooks/useEmergencyQuery';

describe('useMobileEmergencyController selected request', () => {
  let container;
  let latest;
  let root;
  let props;

  const Harness = () => {
    latest = useMobileEmergencyController(props);
    return null;
  };

  const render = (nextProps = {}) => {
    props = { ...props, ...nextProps };
    act(() => root.render(<Harness />));
  };

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    props = {
      emergencies: [],
      loading: false,
      statistics: null,
      filters: { search: '' },
      setFilters: jest.fn(),
      filterSheetOpen: false,
      analyticsOpen: false,
      hasMore: false,
      onLoadMore: jest.fn(),
      currentPage: 1,
      kpiFilter: 'all',
      selectionEnabled: false,
      selectedIds: [],
      warmingUp: false,
    };
    useEmergencyRequestQuery.mockReturnValue({
      request: null,
      isSuccess: false,
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.clearAllMocks();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  it('retains the selected id while replacing the active record with refreshed truth', () => {
    const openingRecord = {
      id: 'request-1',
      status: 'pending_approval',
      created_at: '2026-07-14T12:00:00.000Z',
    };
    render({ emergencies: [openingRecord] });

    act(() => latest.setActiveRequestId(openingRecord.id));
    expect(latest.activeRequestId).toBe(openingRecord.id);
    expect(latest.activeRequest).toBe(openingRecord);

    const refreshedRecord = { ...openingRecord, status: 'cancelled' };
    render({ emergencies: [refreshedRecord] });

    expect(latest.activeRequestId).toBe(openingRecord.id);
    expect(latest.activeRequest).toBe(refreshedRecord);
    expect(latest.activeRequest.status).toBe('cancelled');

    render({ emergencies: [], loading: true });
    expect(latest.activeRequest).toBe(refreshedRecord);

    render({ emergencies: [], loading: false });
    expect(latest.activeRequestId).toBe(openingRecord.id);
    expect(latest.activeRequest).toBeNull();
  });

  it('tracks server truth for a selected request after its original page becomes inactive', () => {
    const openingRecord = {
      id: 'request-1',
      status: 'pending_approval',
      created_at: '2026-07-14T12:00:00.000Z',
    };
    const pageTwoRecord = {
      id: 'request-2',
      status: 'in_progress',
      created_at: '2026-07-14T11:00:00.000Z',
    };
    render({ emergencies: [openingRecord], currentPage: 1 });

    act(() => latest.setActiveRequestId(openingRecord.id));
    render({ emergencies: [pageTwoRecord], currentPage: 2 });

    expect(latest.activeRequest).toBe(openingRecord);
    expect(latest.displayItems.map((request) => request.id)).toEqual(['request-1', 'request-2']);

    const refreshedRecord = { ...openingRecord, status: 'cancelled' };
    useEmergencyRequestQuery.mockReturnValue({
      request: refreshedRecord,
      isSuccess: true,
    });
    render();

    expect(useEmergencyRequestQuery).toHaveBeenLastCalledWith(openingRecord.id);
    expect(latest.activeRequest).toBe(refreshedRecord);
    expect(latest.displayItems.find((request) => request.id === openingRecord.id)).toBe(refreshedRecord);
    expect(props.emergencies).toEqual([pageTwoRecord]);
  });
});
