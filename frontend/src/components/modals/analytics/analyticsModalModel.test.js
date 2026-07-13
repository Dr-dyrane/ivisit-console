import {
  formatHours,
  formatMinutes,
  getDetailsProjection,
  getDistributionProjection,
  getPhases,
  getSafePercentage,
  getSummaryProjection,
} from './analyticsModalModel';

describe('analyticsModalModel', () => {
  it('keeps honest unavailable formatting for empty and malformed timing data', () => {
    expect(formatMinutes(97, 1)).toBe('97.0m');
    expect(formatMinutes(undefined, 1)).toBe('No data');
    expect(formatMinutes(0, 0)).toBe('No data');
    expect(formatHours(null, 2)).toBe('Unavailable');
    expect(formatHours('bad', 2)).toBe('Unavailable');
    expect(formatHours(0, 0)).toBe('No data');
    expect(getSafePercentage(1, 0)).toBe('No data');
  });

  it('preserves emergency summary values and the existing null timing coercion', () => {
    const projection = getSummaryProjection({
      type: 'emergency',
      analytics: {
        total: 1,
        active: 0,
        pending: 1,
        avgResponseTime: null,
        byStatus: { completed: 1 },
      },
    });

    expect(projection.currentItems.map(({ label, value }) => ({ label, value }))).toEqual([
      { label: 'Requests', value: 1 },
      { label: 'Needs review', value: 1 },
      { label: 'Avg response', value: '0.0m' },
      { label: 'Active', value: 0 },
    ]);
    expect(projection.shareValue).toBe('0%');
    expect(projection.groups).toBe(1);
  });

  it('uses payment count and lifecycle count as their existing denominators', () => {
    const analytics = {
      total: 20,
      paymentCount: 4,
      lifecycleCount: 5,
      completed: 2,
      needsReview: 1,
      recent: 3,
      bySource: { card: 3, cash: 1 },
      byStatus: { completed: 2, pending: 3 },
      distributionScope: 'loaded_preview',
      visibleCount: 4,
    };
    const summary = getSummaryProjection({ analytics, type: 'payments' });
    const distribution = getDistributionProjection({ analytics, type: 'payments' });
    const lifecycle = getDetailsProjection({ analytics, phaseId: 'lifecycle', type: 'payments' });

    expect(summary.currentItems[0]).toEqual(expect.objectContaining({
      label: 'Loaded records',
      value: 20,
    }));
    expect(summary.shareValue).toBe('50%');
    expect(distribution).toEqual(expect.objectContaining({
      dataSet: analytics.bySource,
      scopedTotal: 4,
      visibleScopedDistribution: true,
    }));
    expect(lifecycle).toEqual(expect.objectContaining({
      dataSet: analytics.byStatus,
      scopedTotal: 5,
    }));
  });

  it('keeps subscription phase and bucket ownership distinct', () => {
    const analytics = {
      total: 4,
      byType: { paid: 1, free: 3 },
      byStatus: { active: 3, pending: 1 },
    };

    expect(getPhases('subscription')).toEqual([
      { id: 'summary', label: 'Summary' },
      { id: 'tiers', label: 'Types' },
      { id: 'growth', label: 'Status' },
    ]);
    expect(getDistributionProjection({ analytics, type: 'subscription' }).dataSet)
      .toBe(analytics.byType);
    expect(getDetailsProjection({ analytics, phaseId: 'growth', type: 'subscription' }).dataSet)
      .toBe(analytics.byStatus);
  });
});
