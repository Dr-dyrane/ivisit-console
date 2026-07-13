import {
  buildSubscriptionAnalytics,
  buildSubscriptionQueryFilter,
  buildSubscriptionsRouteContext,
  buildVisibleSubscriptionStats,
  createSubscriptionFilters,
  getSubscriberStatusTone,
  getSubscriptionRoleKind,
  hasActiveSubscriberFilters,
  SUBSCRIPTION_FILTER_SCHEMA,
} from './subscriptionPageModel';

describe('subscriptionPageModel', () => {
  it('keeps lifecycle counts separate from subscriber type counts', () => {
    const stats = buildVisibleSubscriptionStats([
      { status: 'active', type: 'paid', new_user: true, welcome_email_sent: true },
      { status: 'pending', type: 'free' },
      { status: 'bounced', type: 'paid' },
      { status: 'cancelled', type: 'free' },
    ]);

    expect(stats).toMatchObject({
      total: 4,
      active: 1,
      pending: 1,
      unsubscribed: 2,
      paid: 2,
      free: 2,
      newUsers: 1,
      welcomeSent: 1,
      available: false,
      scope: 'visible_rows',
    });
  });

  it('builds exact offset paging without changing the route filter contract', () => {
    expect(buildSubscriptionQueryFilter({
      filters: { search: 'care', status: ['active'], type: ['free'] },
      pagination: { currentPage: 3, itemsPerPage: 20 },
      sortConfig: { key: 'created_at', direction: 'asc' },
    })).toEqual({
      search: 'care',
      status: ['active'],
      type: ['free'],
      limit: 20,
      offset: 40,
      sortKey: 'created_at',
      sortDirection: 'asc',
      quiet: true,
    });
  });

  it('publishes status and type analytics as distinct axes', () => {
    const analytics = buildSubscriptionAnalytics({
      displayStats: {
        total: 8,
        active: 5,
        pending: 2,
        unsubscribed: 1,
        paid: 3,
        free: 5,
        newUsers: 2,
        welcomeSent: 6,
      },
      subscriberCount: 8,
      statsUnavailable: false,
    });

    expect(analytics.byType).toEqual({ paid: 3, free: 5 });
    expect(analytics.byStatus).toEqual({ active: 5, pending: 2, unsubscribed: 1 });
    expect(analytics.distributionScope).toBe('exact_filtered_projection');
  });

  it('labels visible-row fallback analytics honestly', () => {
    const analytics = buildSubscriptionAnalytics({
      displayStats: { total: 2, active: 1, paid: 0, free: 2 },
      subscriberCount: 40,
      statsUnavailable: true,
    });

    expect(analytics.total).toBe(2);
    expect(analytics.statsAvailable).toBe(false);
    expect(analytics.distributionScope).toBe('visible_page');
    expect(analytics.distributionLabel).toBe('Loaded rows (statistics unavailable)');
  });

  it('builds the bounded route context from the route-owned projection', () => {
    const subscribers = Array.from({ length: 10 }, (_, index) => ({ id: `${index + 1}` }));
    const context = buildSubscriptionsRouteContext({
      subscribers,
      focusedSubscriber: subscribers[2],
      subscriberCount: 25,
      displayStats: { active: 12, pending: 4, paid: 3, free: 22, newUsers: 2, scope: 'admin_subscriber_projection' },
      statsUnavailable: false,
      loading: false,
      error: null,
    });

    expect(context.subscribers).toHaveLength(8);
    expect(context.focusedSubscriber).toEqual({ id: '3' });
    expect(context.summary).toMatchObject({
      total: 25,
      active: 12,
      statsAvailable: true,
      statsScope: 'admin_subscriber_projection',
      source: 'route',
    });
  });

  it('preserves role, filter, schema, and rendered status semantics', () => {
    expect(getSubscriptionRoleKind({ admin: true })).toBe('admin');
    expect(getSubscriptionRoleKind({ orgAdmin: true })).toBe('org_admin');
    expect(getSubscriptionRoleKind({ provider: true, driver: true })).toBe('driver');
    expect(getSubscriptionRoleKind({})).toBe('viewer');

    expect(hasActiveSubscriberFilters(createSubscriptionFilters())).toBe(false);
    expect(hasActiveSubscriberFilters({ ...createSubscriptionFilters(), type: ['paid'] })).toBe(true);
    expect(SUBSCRIPTION_FILTER_SCHEMA.map((field) => field.key)).toEqual([
      'search',
      'status',
      'type',
      'welcomeEmailSent',
      'dateRange',
    ]);
    expect(getSubscriberStatusTone('active')).toContain('emerald');
    expect(getSubscriberStatusTone('bounced')).toContain('muted-foreground');
    expect(getSubscriberStatusTone('pending')).toContain('cyan');
  });
});
