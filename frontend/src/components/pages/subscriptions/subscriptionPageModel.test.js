import {
  buildSubscriptionAnalytics,
  buildSubscriptionQueryFilter,
  buildSubscriptionsRouteContext,
  buildVisibleSubscriptionStats,
  createSubscriptionFilters,
  formatSubscriberEventDate,
  getJoinedDateLabel,
  getSubscriberStatusTone,
  getSubscriptionDateEvidenceLabel,
  getSubscriptionRoleKind,
  getUnsubscribedEvidenceLabel,
  getWelcomeEmailEvidenceLabel,
  hasActiveSubscriberFilters,
  isNewSubscriber,
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

  it('carries the computed new-user and welcome-sent aggregates into the route summary (ADOPT-55)', () => {
    const context = buildSubscriptionsRouteContext({
      subscribers: [],
      focusedSubscriber: null,
      subscriberCount: 10,
      displayStats: {
        active: 4,
        pending: 1,
        paid: 2,
        free: 8,
        newUsers: 3,
        welcomeSent: 7,
        scope: 'admin_subscriber_projection',
      },
      statsUnavailable: false,
      loading: false,
      error: null,
    });

    expect(context.summary.newUsers).toBe(3);
    expect(context.summary.welcomeSent).toBe(7);
    // An absent count reports zero from the projection shape, never NaN.
    expect(buildSubscriptionsRouteContext({
      subscribers: [],
      focusedSubscriber: null,
      subscriberCount: 0,
      displayStats: {},
      statsUnavailable: true,
      loading: false,
      error: null,
    }).summary.welcomeSent).toBe(0);
  });

  it('renders the Joined cell from the sorted created_at column and keeps subscription_date as unsorted evidence (ADOPT-56)', () => {
    expect(getJoinedDateLabel({ created_at: '2026-07-01T10:30:00Z', subscription_date: '2026-01-05' }))
      .toBe(new Date('2026-07-01T10:30:00Z').toLocaleDateString());
    expect(getJoinedDateLabel({ created_at: 'not-a-date' })).toBe('Unknown');
    expect(getJoinedDateLabel({})).toBe('Unknown');

    // Date-only subscription_date anchors to local noon (no UTC day shift).
    expect(getSubscriptionDateEvidenceLabel({ subscription_date: '2026-01-05' }))
      .toBe(new Date(2026, 0, 5).toLocaleDateString());
    expect(getSubscriptionDateEvidenceLabel({ subscription_date: null })).toBeNull();
    expect(getSubscriptionDateEvidenceLabel({})).toBeNull();
  });

  it('marks the New chip only for rows the database recorded as new_user (ADOPT-57)', () => {
    expect(isNewSubscriber({ new_user: true })).toBe(true);
    expect(isNewSubscriber({ new_user: false })).toBe(false);
    expect(isNewSubscriber({ new_user: null })).toBe(false);
    // Truthy non-boolean shapes never fabricate the chip.
    expect(isNewSubscriber({ new_user: 'true' })).toBe(false);
    expect(isNewSubscriber({ new_user: 1 })).toBe(false);
    expect(isNewSubscriber({})).toBe(false);
    expect(isNewSubscriber()).toBe(false);
  });

  it('formats date-only event values without the UTC midnight day shift', () => {
    // Both sides anchor to the local calendar day; a naive new Date('2026-07-01')
    // render would show June 30 in negative offsets.
    expect(formatSubscriberEventDate('2026-07-01')).toBe(new Date(2026, 6, 1).toLocaleDateString());
    expect(formatSubscriberEventDate('2026-07-01T10:30:00Z')).toBe(new Date('2026-07-01T10:30:00Z').toLocaleDateString());
    expect(formatSubscriberEventDate(null)).toBeNull();
    expect(formatSubscriberEventDate('')).toBeNull();
    expect(formatSubscriberEventDate('not-a-date')).toBeNull();
  });

  it('renders welcome evidence from the send timestamp with honest fallbacks', () => {
    expect(getWelcomeEmailEvidenceLabel({ welcome_email_sent: true, welcome_email_sent_at: '2026-07-01T10:30:00Z' }))
      .toBe(`Sent ${new Date('2026-07-01T10:30:00Z').toLocaleDateString()}`);
    expect(getWelcomeEmailEvidenceLabel({ welcome_email_sent: true, welcome_email_sent_at: null })).toBe('Sent');
    expect(getWelcomeEmailEvidenceLabel({ welcome_email_sent: false, welcome_email_sent_at: null })).toBe('Not sent');
    expect(getWelcomeEmailEvidenceLabel({})).toBe('Not sent');
  });

  it('renders unsubscribe evidence only for unsubscribed rows and never fabricates it', () => {
    expect(getUnsubscribedEvidenceLabel({ status: 'unsubscribed', unsubscribed_at: '2026-06-15T08:00:00Z' }))
      .toBe(new Date('2026-06-15T08:00:00Z').toLocaleDateString());
    expect(getUnsubscribedEvidenceLabel({ status: 'unsubscribed', unsubscribed_at: null })).toBe('Unknown');
    expect(getUnsubscribedEvidenceLabel({ status: 'active', unsubscribed_at: '2026-06-15T08:00:00Z' })).toBeNull();
    expect(getUnsubscribedEvidenceLabel({ status: 'bounced', unsubscribed_at: null })).toBeNull();
    expect(getUnsubscribedEvidenceLabel({})).toBeNull();
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
