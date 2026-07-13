import {
  buildMobileSubscriptionGroups,
  buildMobileSubscriptionKpis,
  dateLabel,
  getMobileSubscriptionScopeCount,
  hasActiveSubscriptionFilters,
  normalizeSubscriptionStatus,
  planLabel,
  subscriptionOrbClass,
  welcomeEmailStatusDistributes,
} from './mobileSubscriptionModel';

describe('mobileSubscriptionModel', () => {
  it('normalizes lifecycle labels without treating type as status', () => {
    expect(normalizeSubscriptionStatus({ status: 'ACTIVE', type: 'free' })).toBe('active');
    expect(normalizeSubscriptionStatus({ type: 'paid' })).toBe('pending');
    expect(planLabel('priority_paid')).toBe('Priority paid');
    expect(dateLabel('not-a-date')).toBe('Date unknown');
  });

  it('keeps orb tones aligned with active, pending, and terminal rows', () => {
    expect(subscriptionOrbClass('active')).toContain('emerald');
    expect(subscriptionOrbClass('pending')).toContain('cyan');
    expect(subscriptionOrbClass('unsubscribed')).toContain('muted-foreground');
    expect(subscriptionOrbClass('bounced')).toContain('muted-foreground');
  });

  it('derives KPI values and heading counts from the same active scope', () => {
    const stats = { total: 20, active: 12, pending: 5, unsubscribed: 3 };
    const kpis = buildMobileSubscriptionKpis(stats, 4);

    expect(kpis.map(({ id, value }) => ({ id, value }))).toEqual([
      { id: 'all', value: 20 },
      { id: 'active', value: 12 },
      { id: 'pending', value: 5 },
      { id: 'unsubscribed', value: 3 },
    ]);
    expect(getMobileSubscriptionScopeCount({ stats, activeKpi: 'pending' })).toBe(5);
    expect(getMobileSubscriptionScopeCount({ stats: null, activeKpi: 'all', fallbackTotal: 4 })).toBe(4);
  });

  it('keeps KPI scope outside the separate filter trigger', () => {
    expect(hasActiveSubscriptionFilters({ kpiFilter: 'active', dateRange: 'all' })).toBe(false);
    expect(hasActiveSubscriptionFilters({ search: 'alex', dateRange: 'all' })).toBe(true);
    expect(hasActiveSubscriptionFilters({ type: ['paid'], dateRange: 'all' })).toBe(true);
  });

  it('shows welcome markers only when the loaded rows distribute', () => {
    expect(welcomeEmailStatusDistributes([
      { welcome_email_sent: true },
      { welcome_email_sent: false },
    ])).toBe(true);
    expect(welcomeEmailStatusDistributes([
      { welcome_email_sent: true },
      { welcome_email_sent: true },
    ])).toBe(false);
  });

  it('uses healthy lifecycle groups before the recency fallback', () => {
    const groups = buildMobileSubscriptionGroups([
      { id: 'p1', status: 'pending' },
      { id: 'p2', status: 'pending' },
      { id: 'p3', status: 'pending' },
      { id: 'a1', status: 'active' },
      { id: 'a2', status: 'active' },
      { id: 'a3', status: 'active' },
    ]);

    expect(groups.map((group) => group.key)).toEqual(['pending', 'active']);
    expect(groups.map((group) => group.items.length)).toEqual([3, 3]);
  });
});
