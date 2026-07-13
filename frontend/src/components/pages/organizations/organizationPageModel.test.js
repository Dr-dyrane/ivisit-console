import {
  buildOrganizationAnalytics,
  buildOrganizationQueryFilter,
  buildOrganizationsPanelContext,
  formatOrganizationWallet,
  getOrganizationStateCount,
  hasActiveOrganizationFilters,
  isOrganizationFunded,
} from './organizationPageModel';
import { getOrganizationSignal } from './organizationPresentation';

describe('organization page model characterization', () => {
  it('builds one bounded server projection with the selected payout scope', () => {
    expect(buildOrganizationQueryFilter({
      filters: { search: 'network' },
      kpiFilter: 'payout_gap',
      itemsPerPage: 20,
      offset: 40,
      sortConfig: { key: 'created_at', direction: 'asc' },
    })).toEqual({
      search: 'network',
      kpiFilter: 'payout_gap',
      limit: 20,
      offset: 40,
      sortKey: 'created_at',
      sortDirection: 'asc',
      quiet: true,
    });
  });

  it('prefers exact aggregate counts and falls back only to the current row window', () => {
    const rows = [
      { id: 'org-1', wallet_balance: 25 },
      { id: 'org-2', wallet_balance: 0 },
      { id: 'org-3', wallet_balance: null },
    ];

    expect(getOrganizationStateCount({
      id: 'funded',
      stats: { funded: 12 },
      organizations: rows,
    })).toBe(12);
    expect(getOrganizationStateCount({ id: 'funded', stats: null, organizations: rows })).toBe(1);
    expect(getOrganizationStateCount({ id: 'payout_gap', stats: null, organizations: rows })).toBe(2);
    expect(getOrganizationStateCount({ id: 'all', stats: null, organizations: rows })).toBe(3);
  });

  it('keeps wallet evidence read-only and does not substitute facility identity', () => {
    const organization = {
      id: 'organization-uuid',
      hospital_id: 'facility-uuid',
      wallet_balance: '10',
    };

    expect(isOrganizationFunded(organization)).toBe(true);
    expect(formatOrganizationWallet(organization.wallet_balance)).toBe('$10');
    expect(formatOrganizationWallet(undefined)).toBe('Not available');
    expect(organization.id).toBe('organization-uuid');
    expect(organization.id).not.toBe(organization.hospital_id);
  });

  it('publishes the route-owned panel window without granting organization commands', () => {
    const organizations = Array.from({ length: 6 }, (_, index) => ({ id: `org-${index}` }));
    const focusedOrganization = organizations[2];
    const context = buildOrganizationsPanelContext({
      stats: { total: 86, funded: 4 },
      organizations,
      focusedOrganization,
      totalCount: 86,
      loading: false,
      errorMessage: null,
      currentState: 'funded',
    });

    expect(context).toMatchObject({
      count: 86,
      focused: focusedOrganization,
      currentState: 'funded',
      canManage: false,
    });
    expect(context.recent).toEqual(organizations.slice(0, 4));
  });

  it('keeps failed empty reads distinct from a reassuring zero registry', () => {
    expect(getOrganizationSignal({
      stats: null,
      organizations: [],
      kpiFilter: 'all',
      loadError: 'Organizations could not load. Try again.',
      hasAny: false,
    })).toMatchObject({
      tone: 'danger',
      label: 'Load failed',
      headline: 'Organizations did not load',
    });
  });

  it('keeps analytics buckets and active-filter state tied to the projection', () => {
    expect(buildOrganizationAnalytics({ total: 18, funded: 5, payoutGap: 13 })).toEqual({
      total: 18,
      funded: 5,
      payoutGap: 13,
      byCategory: { funded: 5, payoutGap: 13 },
    });
    expect(hasActiveOrganizationFilters({ search: '' }, 'all')).toBe(false);
    expect(hasActiveOrganizationFilters({ search: 'care' }, 'all')).toBe(true);
    expect(hasActiveOrganizationFilters({ search: '' }, 'funded')).toBe(true);
  });
});
