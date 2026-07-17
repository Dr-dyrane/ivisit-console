import fs from 'fs';
import { APP_ROUTE_METADATA } from '../../app/appRouteMetadata';
import { shouldHideShellChrome } from '../../app/shellVisibility';

const read = (path) => fs.readFileSync(path, 'utf8');

describe('Onboarding Success Page 22 receiver contract', () => {
  it('keeps the reflected confirmation in the public shell and hardgate', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const routes = read('src/config/routes.jsx');
    const protectedRoute = read('src/components/common/ProtectedRoute.jsx');
    const hardgate = read('scripts/check-ui-surface-hardgate.js');

    expect(gate).toContain('### Page 22 Admission - Onboarding Success');
    expect(gate).toContain('Onboarding Success receiver admission on 2026-07-12');
    expect(gate).toContain('Final receiver/rendered proof, 2026-07-12');
    expect(gate).toContain('staff KPI remained organization-scoped and empty');
    expect(APP_ROUTE_METADATA.find((route) => route.path === '/onboarding-success')).toEqual({ id: 'onboardingSuccess', path: '/onboarding-success', public: true });
    expect(shouldHideShellChrome('/onboarding-success')).toBe(true);
    expect(routes).toContain("'/onboarding-success': {");
    expect(routes).toContain('public: true');
    expect(protectedRoute).toContain("const allowedPaths = ['/login', '/unauthorized', '/onboarding', '/onboarding-success', '/set-password'];");
    expect(hardgate).toContain('src/components/pages/OnboardingSuccessPage.jsx');
  });

  it('renders success only from the complete backend provisioning reflection', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = read('src/components/pages/OnboardingSuccessPage.jsx');
    const context = read('src/contexts/OnboardingContext.jsx');

    expect(gate).toContain('Success-state source: admitted from the provisioning RPC reflection only.');
    expect(page).toContain('const result = location.state?.result;');
    expect(page).toContain('result?.provisioningVerified === true');
    expect(page).toContain("organization?.walletState === 'ready'");
    expect(page).toContain('Submitted for review');
    expect(page).toContain('is ready for review');
    expect(page).toContain('Facility ownership claim');
    expect(page).toContain('Ownership and verification remain unchanged until approval.');
    expect(page).toContain('Your organization and wallet are prepared. Verification remains pending until review is complete.');
    expect(page).toContain('Review evidence');
    expect(page).toContain('Complete in Console');
    expect(page).toContain('<a href="/"');
    expect(context).toContain("navigate('/onboarding-success', { replace: true, state: { result } });");
  });

  it('fails closed on refresh or direct navigation without replaying backend writes', () => {
    const gate = read('docs/planning/PAGE_REVAMP_GATE.md');
    const page = read('src/components/pages/OnboardingSuccessPage.jsx');

    expect(gate).toContain('Direct-link and refresh behavior: admitted degraded state.');
    expect(page).toContain('Registration status unavailable');
    expect(page).toContain('No verified provisioning result was found for this page.');
    expect(page).toContain('<Link to="/onboarding"');
    expect(page).toContain('Return to registration');
    expect(page).toContain('href="mailto:support@ivisit.ng"');
    expect(page).not.toContain('supabase');
    expect(page).not.toContain('useEffect');
    expect(page).not.toContain('getDisplayId');
  });

  it('keeps the confirmation compact and on canonical calm tokens', () => {
    const page = read('src/components/pages/OnboardingSuccessPage.jsx');

    for (const token of ['rounded-icon', 'rounded-inner', 'rounded-pill', 'rounded-button']) {
      expect(page).toContain(token);
    }
    for (const removed of [
      'rounded-2xl', 'rounded-xl', 'rounded-full', 'rounded-[', 'backdrop-blur',
      'shadow-premium', 'pulse-dot', 'bg-gradient', 'Verification in 24-48 hours',
      'Start using iVisit', 'Go to Dashboard',
    ]) {
      expect(page).not.toContain(removed);
    }
  });
});
