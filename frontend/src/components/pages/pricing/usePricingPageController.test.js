import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { getPricingPageData } from '../../../services/pricingService';
import { usePricingPageController } from './usePricingPageController';

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('../../../services/pricingService', () => ({
  getPricingPageData: jest.fn(),
}));

jest.mock('../../../contexts/FocusedRecordContext', () => ({
  useFocusedRecord: (_entity, rows) => ({
    focusedRecord: rows[0] || null,
    setFocused: jest.fn(),
  }),
}));

const controllerProps = {
  profile: { organization_id: 'org-1' },
  admin: false,
  orgAdmin: true,
  provider: false,
  driver: false,
  isMobile: false,
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('usePricingPageController', () => {
  let container;
  let root;
  let latest;
  let consoleError;

  const Harness = () => {
    latest = usePricingPageController(controllerProps);
    return null;
  };

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    consoleError.mockRestore();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    jest.clearAllMocks();
  });

  it('keeps the last confirmed projection when a refresh fails', async () => {
    const confirmed = {
      rows: [{ id: 'rule-1', hospital_id: 'hospital-1' }],
      totalCount: 1,
      summary: {
        globalFallbackCount: 0,
        facilityPriceCount: 1,
        recentCount: 1,
      },
      readState: { basis: 'exact_server_counts' },
      scope: { mode: 'organization_summary' },
    };
    getPricingPageData
      .mockResolvedValueOnce(confirmed)
      .mockRejectedValueOnce(new Error('offline'));

    await act(async () => {
      root.render(<Harness />);
      await flush();
      await flush();
    });

    expect(latest.loading).toBe(false);
    expect(latest.pricing).toEqual(confirmed.rows);
    expect(latest.loadError).toBeNull();
    expect(getPricingPageData).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: 'org-1',
      page: 1,
      pageSize: 12,
    }));

    await act(async () => {
      await latest.fetchPricing();
    });

    expect(latest.loading).toBe(false);
    expect(latest.loadError).toBe('Pricing rules could not load. Try again.');
    expect(latest.pricing).toEqual(confirmed.rows);
    expect(latest.pricingProjection).toMatchObject({
      totalCount: 1,
      readState: { basis: 'exact_server_counts' },
    });
  });

  it('ignores an older request that resolves after a newer request', async () => {
    let resolveOlder;
    let resolveNewer;
    const older = new Promise((resolve) => { resolveOlder = resolve; });
    const newer = new Promise((resolve) => { resolveNewer = resolve; });
    getPricingPageData
      .mockReturnValueOnce(older)
      .mockReturnValueOnce(newer);

    await act(async () => {
      root.render(<Harness />);
      await flush();
    });

    let newerRequest;
    act(() => {
      newerRequest = latest.fetchPricing();
    });

    await act(async () => {
      resolveNewer({
        rows: [{ id: 'newer-rule' }],
        totalCount: 1,
        summary: {},
        readState: {},
      });
      await newerRequest;
    });

    await act(async () => {
      resolveOlder({
        rows: [{ id: 'older-rule' }],
        totalCount: 1,
        summary: {},
        readState: {},
      });
      await older;
      await flush();
    });

    expect(latest.pricing.map((row) => row.id)).toEqual(['newer-rule']);
    expect(latest.loadError).toBeNull();
  });
});
