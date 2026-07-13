import {
  buildMobileVerificationSummary,
  isPendingItem,
  itemStatusKey,
  providerPersonaLabel,
} from './mobileVerificationModel';

describe('mobile verification model', () => {
  it('keeps provider status binary and omits a rejected KPI', () => {
    const summary = buildMobileVerificationSummary({
      queueType: 'providers',
      stats: { pending: 4, approved: 6, total: 10 },
      orgStats: null,
      filters: { search: '', status: 'approved' },
      sourceLength: 3,
    });

    expect(summary.scopeCount).toBe(6);
    expect(summary.kpis.map(({ id }) => id)).toEqual(['pending', 'approved', 'all']);
    expect(itemStatusKey({ bvn_verified: false }, 'providers')).toBe('pending');
    expect(itemStatusKey({ bvn_verified: true }, 'providers')).toBe('verified');
    expect(isPendingItem({ bvn_verified: false }, 'providers')).toBe(true);
  });

  it('keeps facility approved and rejected counts on the tri-state vocabulary', () => {
    const summary = buildMobileVerificationSummary({
      queueType: 'organizations',
      stats: null,
      orgStats: { pending: 2, verified: 5, rejected: 1, total: 8 },
      filters: { search: 'city', status: 'rejected' },
      sourceLength: 2,
    });

    expect(summary.scopeCount).toBe(1);
    expect(summary.hasFilter).toBe(true);
    expect(summary.kpis.map(({ id, value }) => [id, value])).toEqual([
      ['pending', 2],
      ['approved', 5],
      ['rejected', 1],
      ['all', 8],
    ]);
    expect(itemStatusKey({ verification_status: 'rejected' }, 'organizations')).toBe('rejected');
  });

  it('keeps provider subtype labels honest', () => {
    expect(providerPersonaLabel('org_admin')).toBe('Org admin');
    expect(providerPersonaLabel(null)).toBe('Provider');
  });
});
