import {
  buildOrganizationAnalytics,
  buildOrganizationQueryFilter,
  buildOrganizationsPanelContext,
  formatOrganizationType,
  formatOrganizationWallet,
  formatOrganizationWalletForRow,
  getOrganizationProvenanceMeta,
  getOrganizationStateCount,
  getOrganizationVerificationMeta,
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

  it('separates proven demo coverage from operational payout readiness', () => {
    const demoOrganization = {
      name: 'iVisit Coverage Network RUN123',
      contact_email: 'demo+coverage-run123@ivisit-demo.local',
      wallet_balance: 25000,
      wallet_currency: 'USD',
    };

    expect(isOrganizationFunded(demoOrganization)).toBe(false);
    expect(formatOrganizationWalletForRow(demoOrganization)).toBe('Simulated');
    expect(getOrganizationProvenanceMeta(demoOrganization)).toMatchObject({
      demo: true,
      label: 'Demo coverage',
    });
    expect(getOrganizationStateCount({
      id: 'payout_gap',
      stats: null,
      organizations: [demoOrganization],
    })).toBe(0);
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

  it('humanizes the real organization_type column and never fabricates a type', () => {
    expect(formatOrganizationType('hospital')).toBe('Hospital');
    expect(formatOrganizationType('ambulance_service')).toBe('Ambulance Service');
    expect(formatOrganizationType(null)).toBe('Unknown');
    expect(formatOrganizationType(undefined)).toBe('Unknown');
    expect(formatOrganizationType('   ')).toBe('Unknown');
  });

  // ADOPT-26: organizations.verification_status is the live tri-state gate the
  // dispatch RPC consumes; the row/rail status binds to it through the shared
  // approvals vocabulary. Honest null: an absent value reads Unknown, never a
  // fabricated Pending.
  it('maps the live verification_status enum through the approvals vocabulary with honest nulls', () => {
    expect(getOrganizationVerificationMeta({ verification_status: 'verified' })).toMatchObject({
      key: 'approved',
      label: 'Approved',
    });
    expect(getOrganizationVerificationMeta({ verification_status: 'pending' })).toMatchObject({
      key: 'pending',
      label: 'Pending review',
    });
    expect(getOrganizationVerificationMeta({ verification_status: 'rejected' })).toMatchObject({
      key: 'rejected',
      label: 'Rejected',
    });
    expect(getOrganizationVerificationMeta({ verification_status: 'rejected' }).tone).toContain('destructive');
    expect(getOrganizationVerificationMeta({})).toMatchObject({ key: 'unknown', label: 'Unknown' });
    expect(getOrganizationVerificationMeta(null)).toMatchObject({ key: 'unknown', label: 'Unknown' });
    expect(getOrganizationVerificationMeta({ verification_status: '   ' })).toMatchObject({
      key: 'unknown',
      label: 'Unknown',
    });
  });

  // ADOPT-27: the read carries organization_wallets.currency; the amount renders in the
  // row's own currency code. Null currency keeps the legacy presentation unchanged.
  it('renders the wallet amount in the row currency and keeps the legacy fallback honest', () => {
    expect(formatOrganizationWallet(1500, 'NGN')).toBe('NGN 1,500');
    expect(formatOrganizationWallet('10', 'usd')).toBe('USD 10');
    expect(formatOrganizationWallet('10', null)).toBe('$10');
    expect(formatOrganizationWallet('10', '   ')).toBe('$10');
    expect(formatOrganizationWallet(10)).toBe('$10');
    expect(formatOrganizationWallet(null, 'NGN')).toBe('Not available');
    expect(formatOrganizationWallet('not-a-number', 'NGN')).toBe('Not available');
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
