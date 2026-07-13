import { getCurrentUser } from '../authService';
import { getEmergencyRequests } from '../emergencyService';
import { getUserStatistics } from '../profilesService';
import { getHospitals } from '../hospitalsService';
import { getAmbulances } from '../ambulancesService';
import { getSubscriptionAnalytics } from '../subscriptionService';
import { clearCache } from './cache';
import { getAnalyticsData, getAnalyticsSummary } from './dashboardProjection';

jest.mock('../authService', () => ({ getCurrentUser: jest.fn() }));
jest.mock('../emergencyService', () => ({ getEmergencyRequests: jest.fn() }));
jest.mock('../profilesService', () => ({ getUserStatistics: jest.fn() }));
jest.mock('../hospitalsService', () => ({ getHospitals: jest.fn() }));
jest.mock('../ambulancesService', () => ({ getAmbulances: jest.fn() }));
jest.mock('../subscriptionService', () => ({ getSubscriptionAnalytics: jest.fn() }));

const sourceMocks = [
  getEmergencyRequests,
  getUserStatistics,
  getHospitals,
  getAmbulances,
  getSubscriptionAnalytics,
];

describe('legacy analytics dashboard projection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCache();
    getCurrentUser.mockResolvedValue({ id: 'operator-1', role: 'admin' });
    getUserStatistics.mockResolvedValue({ totalUsers: 4, totalProfiles: 5 });
    getEmergencyRequests.mockResolvedValue([
      { id: 'one', status: 'completed', response_time_minutes: 8, created_at: '2026-07-12T12:00:00.000Z' },
      { id: 'two', status: 'pending_approval', response_time_minutes: null, created_at: '2026-07-11T12:00:00.000Z' },
    ]);
    getHospitals.mockResolvedValue([
      { id: 'hospital-1', available_beds: 13, status: 'available', verified: true },
      { id: 'hospital-2', available_beds: 0, status: 'full', verified: false },
    ]);
    getAmbulances.mockResolvedValue([{ id: 'ambulance-1' }]);
    getSubscriptionAnalytics.mockResolvedValue({ total: 3, active: 2, paid: 1, free: 2 });
  });

  it('preserves measured aggregate and summary fields', async () => {
    const data = await getAnalyticsData({ includeRawData: false, quiet: true });

    expect(data).toEqual(expect.objectContaining({
      totalUsers: 4,
      totalProfiles: 5,
      totalEmergencies: 2,
      avgResponseTime: 8,
      successRate: 50,
      successRateSource: 'measured',
      analyticsSourceState: 'measured',
      totalHospitals: 2,
      totalAmbulances: 1,
      totalBeds: 13,
      capacityFull: 1,
      availableHospitals: 1,
      verifiedHospitals: 1,
    }));
    expect(data).not.toHaveProperty('emergencies');
    sourceMocks.forEach((sourceMock) => expect(sourceMock).toHaveBeenCalledWith({ quiet: true }));

    const summary = await getAnalyticsSummary({ quiet: true });
    expect(summary).toEqual(expect.objectContaining({
      totalEmergencies: 2,
      successRate: 50,
      totalSubscribers: 3,
      activeSubscribers: 2,
      paidSubscribers: 1,
    }));
    expect(summary).not.toHaveProperty('emergencies');
  });

  it('keeps an empty request slice pending instead of inventing success', async () => {
    getEmergencyRequests.mockResolvedValue([]);

    await expect(getAnalyticsData({ includeRawData: false, quiet: true })).resolves.toEqual(
      expect.objectContaining({
        totalEmergencies: 0,
        avgResponseTime: 0,
        successRate: 0,
        successRateSource: 'source_pending',
        analyticsSourceState: 'source_pending',
      }),
    );
  });

  it('fails closed for patient actors before acquiring operational sources', async () => {
    getCurrentUser.mockResolvedValue({ id: 'patient-1', role: 'patient' });

    await expect(getAnalyticsData()).resolves.toEqual(expect.objectContaining({
      successRate: 0,
      successRateSource: 'unavailable',
      analyticsSourceState: 'unauthorized',
    }));
    sourceMocks.forEach((sourceMock) => expect(sourceMock).not.toHaveBeenCalled());
  });
});
