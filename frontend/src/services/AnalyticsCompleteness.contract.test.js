import fs from 'fs';

const read = (path) => fs.readFileSync(path, 'utf8');

describe('Analytics completeness contract', () => {
  it('labels the bounded request sample instead of implying a complete total', () => {
    const source = read('src/services/analyticsService.js');
    expect(source).toContain('const ANALYTICS_REQUEST_SAMPLE_LIMIT = 1000;');
    expect(source).toContain(".select('*', { count: 'exact' })");
    expect(source).toContain('.limit(ANALYTICS_REQUEST_SAMPLE_LIMIT)');
    expect(source).toContain('requestSample: {');
    expect(source).toContain('requestTotalCount <= (requestsRes.data || []).length');
  });

  it('keeps count-only network reads separate from complete paginated hospital capacity rows', () => {
    const source = [
      read('src/services/analyticsService.js'),
      read('src/services/analytics/hospitalCapacityProjection.js'),
    ].join('\n');
    expect(source).toContain('export const HOSPITAL_CAPACITY_PAGE_SIZE = 1000;');
    expect(source).toContain("select('id', { count: 'exact', head: true })");
    expect(source).toContain("HOSPITAL_CAPACITY_COLUMNS = 'id, total_beds, available_beds, icu_beds_available'");
    expect(source).toContain(".order('id', { ascending: true })");
    expect(source).toContain('.range(offset, offset + HOSPITAL_CAPACITY_PAGE_SIZE - 1)');
    expect(source).toContain('hospitalSample: {');
    expect(source).toContain("kind: 'partial'");
    expect(source).toContain("reason: 'capacity_sample_incomplete'");
  });

  it('fails finance analytics closed without one identified wallet and a complete ledger window', () => {
    const source = read('src/services/wallet/analytics.js');
    expect(source).toContain("select('id, currency').maybeSingle()");
    expect(source).toContain("throw new Error('Platform wallet is unavailable.')");
    expect(source).toContain("throw new Error('Organization wallet is unavailable.')");
    expect(source).toContain("select('amount, created_at, transaction_type', { count: 'exact' })");
    expect(source).toContain("throw new Error('Finance history is incomplete for this period.')");
    expect(source).toContain('{ date: dateStr, income: 0, outflow: 0, currency }');
  });

  it('carries subscriber sample completeness with its derived metrics', () => {
    const source = read('src/services/subscriptions/analytics.js');
    expect(source).toContain(".select('type, status, new_user, welcome_email_sent, created_at, subscription_date', { count: 'exact' })");
    expect(source).toContain('sample: {');
    expect(source).toContain('exactTotalCount <= (data?.length || 0)');
  });
});
