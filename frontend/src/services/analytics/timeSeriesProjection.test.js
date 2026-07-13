import { getEmergencyRequests } from '../emergencyService';
import { clearCache } from './cache';
import {
  buildPerformanceMetrics,
  buildTimeSeries,
  getPerformanceMetrics,
  getTimeSeriesData,
} from './timeSeriesProjection';

jest.mock('../emergencyService', () => ({ getEmergencyRequests: jest.fn() }));

const emergencies = [
  { status: 'completed', response_time_minutes: 10, created_at: '2026-07-10T08:00:00.000Z' },
  { status: 'failed', response_time_minutes: 20, created_at: '2026-07-10T10:00:00.000Z' },
  { status: 'completed', response_time_minutes: null, created_at: '2026-07-11T10:00:00.000Z' },
];

describe('analytics time-series projection', () => {
  beforeEach(() => {
    clearCache();
    jest.clearAllMocks();
    getEmergencyRequests.mockResolvedValue(emergencies);
  });

  it('groups request activity without substituting response data', () => {
    expect(buildTimeSeries(emergencies, 'day')).toEqual([
      { date: '2026-07-10', count: 2, responseTime: 30, completed: 1, avgResponseTime: 15 },
      { date: '2026-07-11', count: 1, responseTime: 0, completed: 1, avgResponseTime: 0 },
    ]);
  });

  it('preserves the legacy performance summary', () => {
    expect(buildPerformanceMetrics(emergencies)).toEqual({
      avgResponseTime: 15,
      medianResponseTime: 20,
      p95ResponseTime: 20,
      totalRequests: 3,
      completedRequests: 2,
      failedRequests: 1,
    });
  });

  it('keeps public acquisitions cached by metric and period', async () => {
    await expect(getTimeSeriesData('emergencies', 'day')).resolves.toHaveLength(2);
    await expect(getTimeSeriesData('emergencies', 'day')).resolves.toHaveLength(2);
    expect(getEmergencyRequests).toHaveBeenCalledTimes(1);

    clearCache();
    await expect(getPerformanceMetrics()).resolves.toEqual(expect.objectContaining({
      totalRequests: 3,
      completedRequests: 2,
    }));
  });
});
