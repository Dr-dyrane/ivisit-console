import {
  formatAnalyticsCurrency,
  getAnalyticsAudienceLabel,
  getAnalyticsPagination,
  getAnalyticsSignal,
  getBreakdownTone,
  SOURCE_UNAVAILABLE,
} from './analyticsDesktopModel';

describe('analytics desktop presentation model', () => {
  const icons = { alert: 'alert-icon', activity: 'activity-icon' };

  it('maps role context without broadening the audience', () => {
    expect(getAnalyticsAudienceLabel({ isProvider: true, isAdmin: true })).toBe('Provider activity');
    expect(getAnalyticsAudienceLabel({ isSponsor: true })).toBe('Sponsor view');
    expect(getAnalyticsAudienceLabel({ isOrgAdmin: true })).toBe('Organization activity');
    expect(getAnalyticsAudienceLabel({ isAdmin: true })).toBe('Platform activity');
    expect(getAnalyticsAudienceLabel({})).toBe('Available activity');
  });

  it('formats only currencies that can be identified', () => {
    expect(formatAnalyticsCurrency(12, 'usd')).toBe('$12.00');
    expect(formatAnalyticsCurrency(12, null)).toBe(SOURCE_UNAVAILABLE);
    expect(formatAnalyticsCurrency(12, 'not-a-currency')).toBe(SOURCE_UNAVAILABLE);
  });

  it('keeps the activity sheet pagination fixed to the selected window', () => {
    expect(getAnalyticsPagination('30d')).toEqual(expect.objectContaining({
      currentPage: 1,
      totalPages: 1,
      totalCount: 30,
      hasPrevPage: false,
      hasNextPage: false,
    }));
    expect(getAnalyticsPagination('unknown').totalCount).toBe(7);
  });

  it('distinguishes failed, unavailable, partial, and empty request signals', () => {
    expect(getAnalyticsSignal({
      failedEmpty: true,
      requestSourceReady: false,
      audienceLabel: 'Platform activity',
      totalRequests: 0,
      completedRequests: 0,
      returnedRequestCount: 0,
      requestSampleComplete: false,
      windowLabel: '7 days',
      icons,
    })).toEqual(expect.objectContaining({ tone: 'danger', headline: 'Statistics did not load' }));

    expect(getAnalyticsSignal({
      failedEmpty: false,
      requestSourceReady: false,
      audienceLabel: 'Platform activity',
      totalRequests: 0,
      completedRequests: 0,
      returnedRequestCount: 0,
      requestSampleComplete: false,
      windowLabel: '7 days',
      icons,
    })).toEqual(expect.objectContaining({ tone: 'warning', headline: 'Request activity is unavailable' }));

    expect(getAnalyticsSignal({
      failedEmpty: false,
      requestSourceReady: true,
      audienceLabel: 'Platform activity',
      totalRequests: 1000,
      completedRequests: 800,
      returnedRequestCount: 1000,
      requestSampleComplete: false,
      windowLabel: '90 days',
      icons,
    })).toEqual(expect.objectContaining({
      tone: 'primary',
      headline: 'Latest 1,000 requests',
      subhead: '800 completed in the loaded sample for 90 days.',
    }));

    expect(getAnalyticsSignal({
      failedEmpty: false,
      requestSourceReady: true,
      audienceLabel: 'Platform activity',
      totalRequests: 0,
      completedRequests: 0,
      returnedRequestCount: 0,
      requestSampleComplete: true,
      windowLabel: '7 days',
      icons,
    })).toEqual(expect.objectContaining({ tone: 'muted', headline: 'No requests in 7 days' }));
  });

  it('reserves destructive tone for failed or cancelled lifecycle evidence', () => {
    expect(getBreakdownTone('Completed', 0)).toBe('bg-emerald-500');
    expect(getBreakdownTone('Cancelled', 0)).toBe('bg-destructive');
    expect(getBreakdownTone('Pending approval', 0)).toBe('bg-amber-500');
    expect(getBreakdownTone('Accepted', 0)).toBe('bg-sky-500');
  });
});
