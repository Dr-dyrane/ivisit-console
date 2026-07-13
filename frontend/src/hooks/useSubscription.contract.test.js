import fs from 'fs';

describe('useSubscription startup disclosure contract', () => {
  it('keeps automatic subscriber fetches quiet while preserving manual feedback', () => {
    const hookSource = fs.readFileSync('src/hooks/useSubscription.js', 'utf8');
    const serviceSource = [
      'src/services/subscriptions/reads.js',
      'src/services/subscriptions/analytics.js',
    ].map((file) => fs.readFileSync(file, 'utf8')).join('\n');

    expect(hookSource).toContain('fetchSubscribers({ quiet: true })');
    expect(hookSource).toContain('export const useSubscription = (options = {}) => {');
    expect(hookSource).toContain('autoFetch = true');
    expect(hookSource).toContain('autoSubscribe = true');
    expect(hookSource).toContain('if (!autoFetch) {');
    expect(hookSource).toContain('if (!autoSubscribe) return undefined;');
    expect(hookSource).toContain('if (!filters?.quiet) {');
    expect(hookSource).toContain("toast.error('Failed to fetch subscribers')");
    expect(serviceSource).toContain('if (!filter?.quiet) {');
    expect(serviceSource).toContain("console.error('Subscribers query error:'");
    expect(serviceSource).toContain("console.error('Error fetching subscribers:'");
    expect(serviceSource).toContain('getSubscriptionAnalytics(options = {})');
    expect(serviceSource).toContain('if (!options?.quiet) {');
  });
});
