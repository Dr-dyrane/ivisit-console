import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { PageDataProvider, usePageData } from './PageDataContext';

const mockLocation = { pathname: '/' };
const mockUseAuth = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockQueryClient = { invalidateQueries: mockInvalidateQueries };
const mockChannel = jest.fn();
const mockRemoveChannel = jest.fn();
const mockGetUserStatistics = jest.fn();
const mockGetProfiles = jest.fn();
const mockGetEmergencyRequests = jest.fn();
const mockGetEmergencyRequestsPageStats = jest.fn();
const mockGetDoctors = jest.fn();
const mockGetVisitsPageData = jest.fn();
const mockGetAnalyticsData = jest.fn();
const mockGetVerificationStats = jest.fn();
const mockGetWalletContextData = jest.fn();

jest.mock('react-router-dom', () => ({
  useLocation: () => mockLocation,
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mockQueryClient,
}));

jest.mock('./AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../lib/supabase', () => ({
  supabase: {
    channel: (...args) => mockChannel(...args),
    removeChannel: (...args) => mockRemoveChannel(...args),
  },
}));

jest.mock('../services/profilesService', () => ({
  getUserStatistics: (...args) => mockGetUserStatistics(...args),
  getProfiles: (...args) => mockGetProfiles(...args),
}));

jest.mock('../services/emergencyService', () => ({
  getEmergencyRequests: (...args) => mockGetEmergencyRequests(...args),
  getEmergencyRequestsPageStats: (...args) => mockGetEmergencyRequestsPageStats(...args),
}));

jest.mock('../services/doctorsService', () => ({
  getDoctors: (...args) => mockGetDoctors(...args),
}));

jest.mock('../services/visitsService', () => ({
  getVisitsPageData: (...args) => mockGetVisitsPageData(...args),
}));

jest.mock('../services/analyticsService', () => ({
  getAnalyticsData: (...args) => mockGetAnalyticsData(...args),
}));

jest.mock('../services/verificationService', () => ({
  getVerificationStats: (...args) => mockGetVerificationStats(...args),
}));

jest.mock('../services/walletService', () => ({
  getWalletContextData: (...args) => mockGetWalletContextData(...args),
}));

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const createRealtimeChannel = (name) => {
  const handlers = [];
  const channel = {
    name,
    handlers,
    on: jest.fn((type, filter, callback) => {
      handlers.push({ type, filter, callback });
      return channel;
    }),
    subscribe: jest.fn(() => channel),
  };
  return channel;
};

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('PageDataContext public behavior', () => {
  let container;
  let root;
  let latestValue;
  let channels;
  let isAdmin;

  const CaptureValue = () => {
    latestValue = usePageData();
    return null;
  };

  const renderProvider = () => {
    act(() => {
      root.render(
        <PageDataProvider>
          <CaptureValue />
        </PageDataProvider>
      );
    });
  };

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    jest.clearAllMocks();
    latestValue = null;
    channels = [];
    isAdmin = jest.fn(() => false);
    mockLocation.pathname = '/';
    mockUseAuth.mockReturnValue({
      user: { id: 'viewer-1' },
      profile: { id: 'viewer-1', role: 'viewer' },
      isAdmin,
    });
    mockChannel.mockImplementation((name) => {
      const channel = createRealtimeChannel(name);
      channels.push(channel);
      return channel;
    });
    mockGetEmergencyRequestsPageStats.mockResolvedValue({
      total: 4,
      ambulance: 2,
      bed: 1,
      booking: 1,
      pending_approval: 1,
      inProgress: 1,
      accepted: 0,
      arrived: 0,
      completed: 2,
      active: 2,
      mine: 1,
    });
    mockGetEmergencyRequests.mockResolvedValue([{ id: 'request-1' }]);
    mockGetVerificationStats.mockResolvedValue({ pending: 2 });
    mockGetDoctors.mockResolvedValue({
      data: [
        { id: 'doctor-1', status: 'available' },
        { id: 'doctor-2', status: 'on_call' },
      ],
    });
    mockGetVisitsPageData.mockResolvedValue({
      stats: { total: 1 },
      visits: [{ id: 'visit-1' }],
    });
    mockGetAnalyticsData.mockResolvedValue({
      totalEmergencies: 4,
      avgResponseTime: 12,
      successRate: 50,
      successRateSource: 'measured',
      analyticsSourceState: 'measured',
      totalHospitals: 3,
      totalAmbulances: 2,
    });
    mockGetUserStatistics.mockResolvedValue({
      totalUsers: 2,
      roleDistribution: { admin: 2 },
    });
    mockGetProfiles.mockResolvedValue([
      { id: 'admin-1', role: 'admin', email_confirmed_at: '2026-07-13' },
      { id: 'admin-2', role: 'admin', bvn_verified: true },
    ]);
    mockGetWalletContextData.mockResolvedValue({
      wallet: { id: 'wallet-1' },
      ledger: [{ id: 'ledger-1' }],
      projection: 20,
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  it('publishes the complete compatibility value without starting viewer reads', async () => {
    renderProvider();
    await act(flushPromises);

    expect(Object.keys(latestValue).sort()).toEqual([
      'analyticsData',
      'doctorsData',
      'doctorsStats',
      'domainErrors',
      'domainFetching',
      'domainLoading',
      'emergencyData',
      'emergencyStats',
      'fetchAnalyticsData',
      'fetchDoctorsData',
      'fetchEmergencyData',
      'fetchUsersData',
      'fetchVerificationData',
      'fetchVisitsData',
      'fetchWalletData',
      'getEmergencyStats',
      'loading',
      'refreshAllData',
      'useMockData',
      'userData',
      'verificationData',
      'visitsData',
      'visitsStats',
      'walletData',
    ].sort());
    expect(latestValue).toMatchObject({
      emergencyData: null,
      analyticsData: null,
      doctorsData: null,
      visitsData: null,
      verificationData: null,
      userData: { users: [], statistics: null },
      walletData: { wallet: null, ledger: [], projection: 0 },
      domainErrors: {},
      domainLoading: {
        emergency: false,
        verification: false,
        doctors: false,
        visits: false,
        analytics: false,
        users: false,
        wallet: false,
      },
      domainFetching: {},
      loading: false,
      useMockData: false,
    });
    expect(mockGetEmergencyRequests).not.toHaveBeenCalled();
    expect(mockChannel).not.toHaveBeenCalled();
  });

  it('preserves admin startup calls, pending maps, projections, and query keys', async () => {
    const emergencyStats = deferred();
    const emergencyRecent = deferred();
    const verification = deferred();
    const doctors = deferred();
    const profiles = deferred();

    mockUseAuth.mockReturnValue({
      user: { id: 'admin-1' },
      profile: { id: 'admin-1', role: 'admin' },
      isAdmin,
    });
    mockGetEmergencyRequestsPageStats.mockReturnValue(emergencyStats.promise);
    mockGetEmergencyRequests.mockReturnValue(emergencyRecent.promise);
    mockGetVerificationStats.mockReturnValue(verification.promise);
    mockGetDoctors.mockReturnValue(doctors.promise);
    mockGetProfiles.mockReturnValue(profiles.promise);

    renderProvider();
    await act(flushPromises);

    expect(mockGetEmergencyRequestsPageStats).toHaveBeenCalledWith({}, undefined, true);
    expect(mockGetEmergencyRequests).toHaveBeenCalledWith({ quiet: true, limit: 10 });
    expect(mockGetVerificationStats).toHaveBeenCalledWith();
    expect(mockGetDoctors).toHaveBeenCalledWith({ quiet: true });
    expect(mockGetUserStatistics).toHaveBeenCalledWith({ quiet: true });
    expect(mockGetProfiles).toHaveBeenCalledWith({ quiet: true });
    expect(latestValue.loading).toBe(false);
    expect(latestValue.domainFetching).toEqual({
      emergency: true,
      verification: true,
      doctors: true,
      users: true,
    });
    expect(latestValue.domainLoading).toMatchObject({
      emergency: true,
      verification: true,
      doctors: true,
      users: true,
    });
    expect(channels.map((channel) => channel.name)).toEqual([
      'emergency_changes',
      'doctor_changes',
      'profile_changes',
    ]);

    await act(async () => {
      emergencyStats.resolve({
        total: 4,
        ambulance: 2,
        bed: 1,
        booking: 1,
        pending_approval: 1,
        inProgress: 1,
        accepted: 0,
        arrived: 0,
        completed: 2,
        active: 2,
        mine: 1,
      });
      emergencyRecent.resolve([{ id: 'request-1' }]);
      verification.resolve({ pending: 2 });
      doctors.resolve({
        data: [
          { id: 'doctor-1', status: 'available' },
          { id: 'doctor-2', status: 'on_call' },
        ],
      });
      profiles.resolve([
        { id: 'admin-1', role: 'admin', email_confirmed_at: '2026-07-13' },
        { id: 'admin-2', role: 'admin', bvn_verified: true },
      ]);
      await flushPromises();
    });

    expect(latestValue.emergencyData).toEqual({
      stats: {
        total: 4,
        ambulance: 2,
        bed: 1,
        booking: 1,
        pending_approval: 1,
        pending: 1,
        inProgress: 1,
        accepted: 0,
        arrived: 0,
        completed: 2,
        active: 2,
        mine: 1,
      },
      recent: [{ id: 'request-1' }],
    });
    expect(latestValue.doctorsData).toEqual({
      stats: {
        total: 2,
        totalDoctors: 2,
        onCall: 1,
        available: 1,
        busy: 0,
        off_duty: 0,
      },
      recent: [
        { id: 'doctor-1', status: 'available' },
        { id: 'doctor-2', status: 'on_call' },
      ],
    });
    expect(latestValue.verificationData).toEqual({ pending: 2 });
    expect(latestValue.userData.statistics).toEqual({
      totalUsers: 2,
      roleDistribution: { admin: 2 },
    });
    expect(latestValue.domainErrors).toEqual({});
    expect(latestValue.domainFetching).toEqual({
      emergency: false,
      verification: false,
      doctors: false,
      users: false,
    });

    const emergencyChannel = channels.find(({ name }) => name === 'emergency_changes');
    const doctorChannel = channels.find(({ name }) => name === 'doctor_changes');
    const profileChannel = channels.find(({ name }) => name === 'profile_changes');
    act(() => {
      emergencyChannel.handlers[0].callback();
      doctorChannel.handlers[0].callback();
    });
    expect(mockInvalidateQueries).toHaveBeenNthCalledWith(1, { queryKey: ['emergency'] });
    expect(mockInvalidateQueries).toHaveBeenNthCalledWith(2, { queryKey: ['doctors'] });

    await act(async () => {
      profileChannel.handlers[0].callback();
      await flushPromises();
    });
    expect(mockGetVerificationStats).toHaveBeenCalledTimes(2);
    expect(mockGetUserStatistics).toHaveBeenCalledTimes(2);
    expect(mockGetProfiles).toHaveBeenCalledTimes(2);
  });

  it('keeps provider failures explicit and visit realtime refetch scoped', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'provider-1' },
      profile: { id: 'provider-1', role: 'provider', provider_type: 'doctor' },
      isAdmin,
    });
    mockGetEmergencyRequestsPageStats.mockRejectedValue(new Error('Requests unavailable'));
    mockGetVisitsPageData.mockRejectedValue(new Error('Visits unavailable'));

    renderProvider();
    await act(flushPromises);

    expect(latestValue.emergencyData).toEqual({ stats: null, recent: [] });
    expect(latestValue.visitsData).toBeNull();
    expect(latestValue.domainErrors).toEqual({
      emergency: 'Requests unavailable',
      visits: 'Visits unavailable',
    });
    expect(latestValue.domainFetching).toEqual({ emergency: false, visits: false });
    expect(latestValue.domainLoading).toMatchObject({ emergency: false, visits: false });

    const visitChannel = channels.find(({ name }) => name === 'visit_changes');
    expect(visitChannel.handlers[0]).toMatchObject({
      type: 'postgres_changes',
      filter: { event: '*', schema: 'public', table: 'visits' },
    });
    mockGetVisitsPageData.mockResolvedValue({ stats: { total: 1 }, visits: [] });
    await act(async () => {
      await visitChannel.handlers[0].callback();
      await flushPromises();
    });
    expect(mockGetVisitsPageData).toHaveBeenLastCalledWith({
      quiet: true,
      range: { start: 0, end: 4 },
      sortConfig: { key: 'date', direction: 'desc' },
    });
    expect(latestValue.visitsData).toEqual({ stats: { total: 1 }, recent: [] });
    expect(latestValue.domainErrors).toEqual({ emergency: 'Requests unavailable' });
  });

  it('preserves null and degraded failure values for every remaining domain', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-1' },
      profile: { id: 'admin-1', role: 'admin' },
      isAdmin,
    });
    mockGetVerificationStats.mockRejectedValue(new Error('Verification unavailable'));
    mockGetDoctors.mockRejectedValue(new Error('Doctors unavailable'));
    mockGetProfiles.mockRejectedValue(new Error('Users unavailable'));
    mockGetWalletContextData.mockRejectedValue(new Error('Wallet unavailable'));

    renderProvider();
    await act(flushPromises);
    await act(async () => {
      await latestValue.fetchWalletData();
    });

    expect(latestValue.verificationData).toBeNull();
    expect(latestValue.doctorsData).toBeNull();
    expect(latestValue.userData).toEqual({ users: [], statistics: null });
    expect(latestValue.walletData).toEqual({ wallet: null, ledger: [], projection: 0 });
    expect(latestValue.domainErrors).toMatchObject({
      verification: 'Verification unavailable',
      doctors: 'Doctors unavailable',
      users: 'Users unavailable',
      wallet: 'Wallet unavailable',
    });

    mockLocation.pathname = '/analytics';
    mockUseAuth.mockReturnValue({
      user: { id: 'sponsor-1' },
      profile: { id: 'sponsor-1', role: 'sponsor' },
      isAdmin,
    });
    mockGetAnalyticsData.mockRejectedValue(new Error('Analytics unavailable'));
    act(() => root.render(
      <PageDataProvider>
        <CaptureValue />
      </PageDataProvider>
    ));
    await act(async () => {
      await latestValue.fetchAnalyticsData();
    });

    expect(latestValue.analyticsData).toBeNull();
    expect(latestValue.domainErrors.analytics).toBe('Analytics unavailable');
  });

  it('derives visible user statistics when the restricted aggregate is unavailable', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-1' },
      profile: { id: 'admin-1', role: 'admin' },
      isAdmin,
    });
    mockGetUserStatistics.mockRejectedValue(new Error('Aggregate restricted'));

    renderProvider();
    await act(flushPromises);

    expect(latestValue.userData.statistics).toEqual({
      totalUsers: 2,
      roleDistribution: { admin: 2 },
      emailVerifiedUsers: 2,
      bvnVerifiedUsers: 1,
    });
    expect(latestValue.domainErrors.users).toBeUndefined();
  });

  it('refreshes only the current startup domains through the public refetch method', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'provider-1' },
      profile: { id: 'provider-1', role: 'provider', provider_type: 'doctor' },
      isAdmin,
    });

    renderProvider();
    await act(flushPromises);
    await act(async () => {
      await latestValue.refreshAllData();
    });

    expect(mockGetEmergencyRequestsPageStats).toHaveBeenCalledTimes(2);
    expect(mockGetEmergencyRequests).toHaveBeenCalledTimes(2);
    expect(mockGetVisitsPageData).toHaveBeenCalledTimes(2);
    expect(mockGetAnalyticsData).not.toHaveBeenCalled();
    expect(mockGetVerificationStats).not.toHaveBeenCalled();
    expect(mockGetDoctors).not.toHaveBeenCalled();
    expect(mockGetProfiles).not.toHaveBeenCalled();
  });

  it('keeps wallet as a manual compatibility read with its exact service scope', async () => {
    isAdmin.mockReturnValue(true);
    const profile = { id: 'admin-1', role: 'admin' };
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-1' },
      profile,
      isAdmin,
    });

    renderProvider();
    await act(flushPromises);
    await act(async () => {
      await latestValue.fetchWalletData();
    });

    expect(mockGetWalletContextData).toHaveBeenCalledWith({
      profile,
      isAdmin: true,
      ledgerLimit: 10,
    });
    expect(latestValue.walletData).toEqual({
      wallet: { id: 'wallet-1' },
      ledger: [{ id: 'ledger-1' }],
      projection: 20,
    });
    expect(latestValue.domainErrors.wallet).toBeUndefined();
    expect(latestValue.domainFetching.wallet).toBe(false);
  });

  it('removes every mounted realtime channel without adding query cancellation', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-1' },
      profile: { id: 'admin-1', role: 'admin' },
      isAdmin,
    });

    renderProvider();
    await act(flushPromises);
    const mountedChannels = [...channels];

    act(() => root.unmount());

    expect(mockRemoveChannel.mock.calls.map(([channel]) => channel)).toEqual(mountedChannels);
    expect(mockGetEmergencyRequestsPageStats).toHaveBeenCalledWith({}, undefined, true);
    expect(mockGetEmergencyRequests).toHaveBeenCalledWith({ quiet: true, limit: 10 });
    expect(mockGetDoctors).toHaveBeenCalledWith({ quiet: true });
    expect(mockGetProfiles).toHaveBeenCalledWith({ quiet: true });

    root = createRoot(container);
  });
});
