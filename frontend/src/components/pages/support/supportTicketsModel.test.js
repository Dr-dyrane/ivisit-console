import {
  buildSupportAnalytics,
  buildSupportQueryFilter,
  getSupportAssigneeLabel,
  getSupportOpenAge,
  getSupportRequesterLabel,
  getSupportSignal,
  getSupportStateCount,
  hasActiveSupportFilters,
} from './supportTicketsModel';

describe('Support page projection model', () => {
  it('preserves the route query, stats scope, pagination, and time sort contract', () => {
    expect(buildSupportQueryFilter({
      filters: {
        search: 'billing',
        status: ['closed'],
        priority: ['urgent'],
        category: ['billing'],
        kpiFilter: 'all',
      },
      kpiFilter: 'open',
      limit: 20,
      offset: 40,
      sortConfig: { key: 'updated_at', direction: 'desc' },
    })).toEqual({
      search: 'billing',
      status: 'open',
      priority: ['urgent'],
      category: ['billing'],
      statsFilter: {
        search: 'billing',
        priority: ['urgent'],
        category: ['billing'],
      },
      limit: 20,
      offset: 40,
      sortKey: 'updated_at',
      sortDirection: 'desc',
      quiet: true,
    });
  });

  it('keeps sheet status filters when the KPI scope is All while stats stay status-agnostic', () => {
    const projection = buildSupportQueryFilter({
      filters: {
        search: '',
        status: ['resolved', 'closed'],
        priority: [],
        category: [],
        kpiFilter: 'all',
      },
      kpiFilter: 'all',
      limit: 20,
      offset: 0,
      sortConfig: { key: 'updated_at', direction: 'asc' },
    });

    expect(projection.status).toEqual(['resolved', 'closed']);
    expect(projection.statsFilter).not.toHaveProperty('status');
    expect(projection).not.toHaveProperty('kpiFilter');
  });

  it('scopes the Urgent KPI by priority, never by an invented status enum (ADOPT-47)', () => {
    const projection = buildSupportQueryFilter({
      filters: {
        search: '',
        status: ['open'],
        priority: [],
        category: [],
        kpiFilter: 'all',
      },
      kpiFilter: 'urgent',
      limit: 20,
      offset: 0,
      sortConfig: { key: 'updated_at', direction: 'desc' },
    });

    // priority=urgent is the KPI scope; the sheet status filter is untouched
    // and the status filter NEVER receives 'urgent' (the service normalizer
    // fails hard on unknown status enums).
    expect(projection.priority).toBe('urgent');
    expect(projection.status).toEqual(['open']);
    // Stats stay KPI-agnostic: no status axis, and the KPI-injected priority
    // never reaches the stats scope (the sheet's own empty list rides through).
    expect(projection.statsFilter).not.toHaveProperty('status');
    expect(projection.statsFilter.priority).toEqual([]);
  });

  it('maps the read-only Assigned-to-me scope to assigned_to only with a viewer id (ADOPT-24)', () => {
    const base = {
      filters: { search: '', status: [], priority: [], category: [], assigned: 'me', kpiFilter: 'all' },
      kpiFilter: 'all',
      limit: 20,
      offset: 0,
      sortConfig: { key: 'updated_at', direction: 'desc' },
    };

    const scoped = buildSupportQueryFilter({ ...base, viewerId: 'viewer-1' });
    expect(scoped.assigned_to).toBe('viewer-1');
    expect(scoped).not.toHaveProperty('assigned');
    // The assignment scope rides into stats like every other sheet filter.
    expect(scoped.statsFilter.assigned_to).toBe('viewer-1');

    // No viewer id -> honestly a no-op, never a fabricated match.
    const unscoped = buildSupportQueryFilter(base);
    expect(unscoped).not.toHaveProperty('assigned_to');
    expect(unscoped).not.toHaveProperty('assigned');

    const anyone = buildSupportQueryFilter({
      ...base,
      filters: { ...base.filters, assigned: 'all' },
      viewerId: 'viewer-1',
    });
    expect(anyone).not.toHaveProperty('assigned_to');

    expect(hasActiveSupportFilters({ assigned: 'me' }, 'all')).toBe(true);
    expect(hasActiveSupportFilters({ assigned: 'all' }, 'all')).toBe(false);
  });

  it('counts and signals the urgent scope from the already-computed stats (ADOPT-47)', () => {
    const tickets = [
      { status: 'open', priority: 'urgent' },
      { status: 'in_progress', priority: 'normal' },
    ];
    expect(getSupportStateCount({ id: 'urgent', stats: {}, tickets })).toBe(1);
    expect(getSupportStateCount({ id: 'urgent', stats: { urgent: 4 }, tickets })).toBe(4);
    // Honest zero renders 0, not a fabricated positive.
    expect(getSupportStateCount({ id: 'urgent', stats: { urgent: 0 }, tickets: [] })).toBe(0);

    expect(getSupportSignal({
      stats: { urgent: 2 },
      tickets: [],
      kpiFilter: 'urgent',
      isProviderOnly: false,
      loadError: null,
      hasAny: true,
    })).toMatchObject({
      tone: 'danger',
      label: 'Urgent',
      headline: '2 urgent tickets',
    });

    expect(getSupportSignal({
      stats: { urgent: 0 },
      tickets: [],
      kpiFilter: 'urgent',
      isProviderOnly: false,
      loadError: null,
      hasAny: false,
    })).toMatchObject({ headline: 'No urgent requests' });
  });

  it('renders honest assignee/requester labels and an in-flight-only open age (ADOPT-24/25/48)', () => {
    expect(getSupportAssigneeLabel({ assigned_to: null })).toBe('Unassigned');
    expect(getSupportAssigneeLabel({ assigned_to: 'uuid-1', assignee_name: null })).toBe('Unknown assignee');
    expect(getSupportAssigneeLabel({ assigned_to: 'uuid-1', assignee_name: 'Amina Bello' })).toBe('Amina Bello');

    expect(getSupportRequesterLabel({})).toBe('Unknown requester');
    expect(getSupportRequesterLabel({ customer_name: 'Tunde Okafor' })).toBe('Tunde Okafor');

    const now = new Date('2026-07-16T12:00:00.000Z').getTime();
    const sixDaysAgo = new Date(now - (6 * 86400000) - 3600000).toISOString();
    expect(getSupportOpenAge({ status: 'open', created_at: sixDaysAgo }, now)).toBe('open 6d');
    expect(getSupportOpenAge({ status: 'in_progress', created_at: new Date(now - 3600000).toISOString() }, now)).toBe('open <1d');
    // Resolved/closed tickets are not "open"; missing/invalid dates stay absent.
    expect(getSupportOpenAge({ status: 'resolved', created_at: sixDaysAgo }, now)).toBeNull();
    expect(getSupportOpenAge({ status: 'open', created_at: null }, now)).toBeNull();
    expect(getSupportOpenAge({ status: 'open', created_at: 'not-a-date' }, now)).toBeNull();
  });

  it('characterizes visible-page analytics without inventing timing or priority totals', () => {
    const analytics = buildSupportAnalytics(
      { total: 8, open: 3, active: 4, resolved: 2 },
      [
        {
          status: 'resolved',
          priority: 'high',
          category: 'billing',
          created_at: '2026-07-01T00:00:00.000Z',
          updated_at: '2026-07-01T06:00:00.000Z',
        },
        { status: 'open', priority: 'normal', category: 'technical' },
      ]
    );

    expect(analytics).toMatchObject({
      total: 8,
      open: 3,
      active: 4,
      resolved: 2,
      averageResolutionTime: 6,
      averageResolutionScope: 'visible_page',
      distributionScope: 'visible_page',
      distributionLabel: 'Current page',
      visibleCount: 2,
      byStatus: { resolved: 1, open: 1 },
      byPriority: { high: 1, normal: 1 },
      byCategory: { billing: 1, technical: 1 },
    });

    expect(buildSupportAnalytics({}, [])).toMatchObject({
      averageResolutionTime: null,
      visibleCount: 0,
    });
  });

  it('preserves KPI fallbacks, active-filter truth, and the cold-load error signal', () => {
    const tickets = [{ status: 'open' }, { status: 'in_progress' }, { status: 'closed' }];
    expect(getSupportStateCount({ id: 'in_progress', stats: {}, tickets })).toBe(2);
    expect(getSupportStateCount({ id: 'in_progress', stats: { active: 7 }, tickets })).toBe(7);
    expect(hasActiveSupportFilters({ search: '', status: [], priority: [], category: [] }, 'all')).toBe(false);
    expect(hasActiveSupportFilters({ search: 'help' }, 'all')).toBe(true);
    expect(getSupportSignal({
      stats: {},
      tickets: [],
      kpiFilter: 'all',
      isProviderOnly: false,
      loadError: 'failed',
      hasAny: false,
    })).toMatchObject({
      tone: 'danger',
      label: 'Load failed',
      headline: 'Support did not load',
    });
  });
});
