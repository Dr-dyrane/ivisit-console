import {
  ANALYTICS_REFRESH_PENDING_MESSAGE,
  buildAnalyticsChartData,
  buildAnalyticsSnapshot,
  DEFAULT_HOSPITAL_CAPACITY,
  getHospitalCapacitySummary,
  extractResponseMinutes,
  getAnalyticsRoleKind,
  getAnalyticsSourceIssueSummary,
  getAnalyticsSourceReadiness,
  getFinanceCurrency,
  getFinanceSummary,
  getModalAnalytics,
  getVisibleAnalyticsSourceIssueSummary,
  normalizeHospitalSample,
  normalizeRequestSample,
  normalizeSubscriptionStats,
} from './analyticsPageModel';

describe('analytics page projection model', () => {
  it('normalizes sample envelopes without treating missing sources as complete', () => {
    expect(normalizeRequestSample()).toEqual(expect.objectContaining({ complete: false, limit: 1000 }));
    expect(normalizeHospitalSample({ returnedCount: 12 })).toEqual(expect.objectContaining({
      returnedCount: 12,
      complete: false,
    }));
    expect(normalizeSubscriptionStats({ total: 4, sample: { returnedCount: 4 } })).toEqual(expect.objectContaining({
      total: 4,
      sample: expect.objectContaining({ returnedCount: 4, complete: false }),
    }));
  });

  it('keeps denied, partial, and failed source evidence distinct', () => {
    expect(getAnalyticsSourceIssueSummary([
      { source: 'subscriptions', kind: 'denied' },
      { source: 'hospitals', kind: 'partial' },
      { source: 'requests', kind: 'failed' },
    ])).toEqual({
      kind: 'denied',
      title: 'Some statistics are unavailable.',
      detail: 'Subscriptions need role access. Hospitals returned incomplete data. Requests did not load.',
    });
    expect(getAnalyticsSourceIssueSummary([])).toBeNull();
  });

  it('labels a pending replacement window without relabelling the visible snapshot', () => {
    expect(getVisibleAnalyticsSourceIssueSummary({
      refreshNotice: ANALYTICS_REFRESH_PENDING_MESSAGE,
      issueSummary: null,
      snapshotTimeRange: '7d',
      timeRange: '30d',
    })).toEqual(expect.objectContaining({
      kind: 'stale',
      title: ANALYTICS_REFRESH_PENDING_MESSAGE,
      detail: 'Loading 30 days; the 7 days snapshot stays visible.',
    }));
  });

  it('uses recorded response duration first and derives only valid lifecycle duration', () => {
    expect(extractResponseMinutes({ response_time_minutes: 8 })).toBe(8);
    expect(extractResponseMinutes({
      created_at: '2026-07-13T08:00:00.000Z',
      responded_at: '2026-07-13T08:12:00.000Z',
    })).toBe(12);
    expect(extractResponseMinutes({
      created_at: '2026-07-13T08:12:00.000Z',
      responded_at: '2026-07-13T08:00:00.000Z',
    })).toBeNull();
  });

  it('aggregates only the selected local-day window and preserves empty chart truth', () => {
    const now = new Date(2026, 6, 13, 12, 0, 0);
    const chart = buildAnalyticsChartData([
      {
        id: 'inside-complete',
        created_at: new Date(2026, 6, 13, 8, 0, 0).toISOString(),
        status: 'completed',
        service_type: 'bed_reservation',
        response_time_minutes: 10,
      },
      {
        id: 'inside-pending',
        created_at: new Date(2026, 6, 12, 8, 0, 0).toISOString(),
        status: 'pending',
        emergency_type: 'ambulance',
      },
      {
        id: 'outside',
        created_at: new Date(2026, 5, 1, 8, 0, 0).toISOString(),
        status: 'completed',
      },
    ], '7d', now);

    expect(chart.requestsByDay).toHaveLength(7);
    expect(chart.requestsByDay.reduce((sum, day) => sum + day.requests, 0)).toBe(2);
    expect(chart.requestsByStatus).toEqual(expect.arrayContaining([
      { name: 'Completed', value: 1 },
      { name: 'Pending Approval', value: 1 },
    ]));
    expect(chart.emergencyTypes).toEqual(expect.arrayContaining([
      { name: 'Bed Reservation', value: 1 },
      { name: 'Ambulance', value: 1 },
    ]));
    expect(buildAnalyticsChartData([], '7d', now)).toEqual({
      requestsByDay: [],
      requestsByStatus: [],
      emergencyTypes: [],
      dominantType: null,
    });
  });

  it('builds a role-safe snapshot and withholds incomplete capacity', () => {
    const analyticsPage = {
      requests: [
        { status: 'completed', created_at: '2026-07-13T08:00:00.000Z', response_time_minutes: 10 },
        { status: 'pending', created_at: '2026-07-13T09:00:00.000Z' },
      ],
      requestSample: { returnedCount: 2, totalCount: 2, complete: true },
      hospitalSample: { returnedCount: 1, totalCount: 2, complete: false },
      hospitals: [{ total_beds: 10, available_beds: 4, icu_beds_available: 2 }],
      financeData: [{ income: 20, outflow: 5, currency: 'usd' }],
      subscriptionStats: { total: 3, sample: { returnedCount: 3, complete: true } },
      usersCount: 8,
      hospitalsCount: 2,
      ambulancesCount: 4,
    };
    const snapshot = buildAnalyticsSnapshot({
      analyticsPage,
      requestedRange: '7d',
      canReadSubscriptionAnalytics: false,
      canReadFinanceAnalytics: false,
      nowValue: new Date('2026-07-13T12:00:00.000Z'),
    });

    expect(snapshot.stats).toEqual(expect.objectContaining({
      totalEmergencies: 2,
      completedEmergencies: 1,
      avgResponseTime: 10,
      responseSampleSize: 1,
      successRate: 50,
    }));
    expect(snapshot.financeData).toEqual([]);
    expect(snapshot.subscriptionStats.total).toBe(0);
    expect(snapshot.hospitalCapacity).toEqual(DEFAULT_HOSPITAL_CAPACITY);

    const completeCapacity = buildAnalyticsSnapshot({
      analyticsPage: {
        ...analyticsPage,
        hospitalSample: { returnedCount: 1, totalCount: 1, complete: true },
      },
      requestedRange: '7d',
      canReadSubscriptionAnalytics: true,
      canReadFinanceAnalytics: true,
      nowValue: new Date('2026-07-13T12:00:00.000Z'),
    });
    expect(completeCapacity.hospitalCapacity).toEqual({ total: 10, occupied: 6, icu: 2 });
    expect(completeCapacity.financeData).toHaveLength(1);
    expect(completeCapacity.subscriptionStats.total).toBe(3);
  });

  it('normalizes demo capacity with the same lower-bound rule as the database', () => {
    expect(getHospitalCapacitySummary([
      { total_beds: null, available_beds: 12, icu_beds_available: 3 },
      { total_beds: 20, available_beds: 5, icu_beds_available: 9 },
    ], { complete: true })).toEqual({
      total: 32,
      occupied: 15,
      icu: 8,
    });
    expect(getHospitalCapacitySummary([
      { total_beds: 10, available_beds: 4, icu_beds_available: 2 },
    ], { complete: false })).toEqual(DEFAULT_HOSPITAL_CAPACITY);
  });

  it('marks each source ready only when its own proof is complete', () => {
    const readiness = getAnalyticsSourceReadiness({
      snapshotReady: true,
      sourceIssues: [{ source: 'users', kind: 'failed' }],
      hospitalSample: { complete: false },
      subscriptionStats: { sample: { complete: true } },
      canReadSubscriptionAnalytics: true,
      canReadFinanceAnalytics: true,
      financeCurrency: 'USD',
    });
    expect(readiness).toEqual({
      requests: true,
      users: false,
      hospitals: false,
      hospitalCapacity: false,
      ambulances: true,
      subscriptions: true,
      finance: true,
    });
  });

  it('keeps an exact facility count ready when only the capacity sample is partial', () => {
    expect(getAnalyticsSourceReadiness({
      snapshotReady: true,
      sourceIssues: [{ source: 'hospitals', kind: 'partial' }],
      hospitalSample: { totalCount: 1577, complete: false },
      subscriptionStats: { sample: { complete: false } },
      canReadSubscriptionAnalytics: false,
      canReadFinanceAnalytics: false,
      financeCurrency: null,
    })).toEqual(expect.objectContaining({
      hospitals: true,
      hospitalCapacity: false,
    }));
  });

  it('summarizes finance only when a canonical currency is present', () => {
    const financeData = [
      { income: 10, outflow: 2, currency: ' usd ' },
      { income: 20, outflow: 3, currency: 'USD' },
    ];
    expect(getFinanceCurrency(financeData)).toBe('USD');
    expect(getFinanceSummary(financeData, 'USD')).toEqual({
      totalCredits: 30,
      totalDebits: 5,
      todayCredits: 20,
      dailyAverageCredits: 15,
      currency: 'USD',
    });
    expect(getFinanceSummary([], null).currency).toBeNull();
  });

  it('keeps role routing and modal compatibility projections deterministic', () => {
    expect(getAnalyticsRoleKind({ admin: true })).toBe('admin');
    expect(getAnalyticsRoleKind({ orgAdmin: true })).toBe('org_admin');
    expect(getAnalyticsRoleKind({ sponsor: true })).toBe('sponsor');
    expect(getAnalyticsRoleKind({ provider: true, driver: true })).toBe('driver');
    expect(getAnalyticsRoleKind({ provider: true, driver: false })).toBe('provider');
    expect(getAnalyticsRoleKind({})).toBe('viewer');

    expect(getModalAnalytics({
      stats: {
        totalEmergencies: 4,
        completedEmergencies: 3,
        totalAmbulances: 2,
        totalHospitals: 1,
        avgResponseTime: 6,
      },
      requestsByStatus: [{ name: 'Completed', value: 3 }],
      emergencyTypes: [{ name: 'Ambulance', value: 2 }],
    })).toEqual(expect.objectContaining({
      total: 4,
      byStatus: { Completed: 3 },
      byCategory: { Ambulance: 2 },
    }));
  });
});
