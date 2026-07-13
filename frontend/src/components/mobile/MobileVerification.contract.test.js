import fs from 'fs';
import { routeOwnsShellAction } from '../../config/routeActionOwnership';

// Approvals MOBILE contract. Split from VerificationQueue.contract.test.js
// (2026-07-10) so the mobile and desktop approval surfaces gate INDEPENDENTLY: a
// mobile-lane refactor of MobileVerification.jsx can no longer red the desktop
// page's contract on a stale byte-string, and vice-versa. This file owns every
// assertion about the mobile approvals surface + its mobile navigation entry points.
describe('MobileVerification Approvals mobile contract', () => {
  const mobileSource = () => [
    fs.readFileSync('src/components/mobile/MobileVerification.jsx', 'utf8'),
    ...fs.readdirSync('src/components/mobile/verification')
      .filter((name) => /\.(?:js|jsx)$/.test(name) && !name.endsWith('.test.js'))
      .sort()
      .map((name) => fs.readFileSync(`src/components/mobile/verification/${name}`, 'utf8')),
  ].join('\n');

  it('keeps mobile copy and actions aligned with desktop authority', () => {
    const source = mobileSource();

    expect(source).toContain('canApprove = false');
    // Approval COMMANDS are admin-only AND per-lane: the provider gate can't leak into
    // the facility queue (or vice-versa). canApproveNow folds pending + canApprove once.
    expect(source).toContain('const canApproveNow = pending && canApprove;');
    expect(source).toContain('canApproveNow && isProviders && onVerifyProvider');
    expect(source).toContain('canApproveNow && !isProviders && onVerifyOrganization');
    expect(source).toContain('ADMIN REVIEW');
    expect(source).toContain("canApprove ? 'No verification items found' : 'No visible approval items'");
    expect(source).toContain('Approval items are not visible for this role.');
    expect(source).toContain('useStableList(sourceItems, loading)');
    // Canon LIST anatomy (rebuilt 2026-07-10): a grouped list with a tap->detail-sheet,
    // NOT the old glance-tile rail + featured billboard + inline-expand dropdown. These
    // lock the rebuild so the DASHBOARD furniture can't creep back onto a LIST page.
    expect(source).toContain('<MobileHeading');
    expect(source).toContain('<GroupPanel');
    expect(source).toContain('<SkeletonGroupPanel');
    expect(source).toContain('<MobileDetailSheet');
    expect(source).not.toContain('MobileSecondaryMetricRail');
    expect(source).not.toContain('MobileFeaturedMetric');
    expect(source).not.toContain('Review Summary');
    expect(source).not.toContain('expandedContent');
    // No local re-filter: the mobile surface renders the server projection (no parallel
    // truth) -- the same discipline the desktop list keeps.
    expect(source).not.toContain('filteredItems');
    expect(source).not.toContain('let result = [...items]');
    expect(source).not.toContain('result.filter');
    expect(source).not.toContain('chartData:');
    expect(source).not.toContain('Trust Dynamics');
    expect(source).not.toContain("'LIVE'");
    expect(source).not.toContain('Organization Queue');
    expect(source).not.toContain('Verification Queue');
  });

  it('makes the PROVIDER lane approve-only and the FACILITY lane keep a real reject', () => {
    const source = mobileSource();
    // Providers have NO rejected state -> provider reject is absent everywhere.
    expect(source).not.toContain('onVerifyProvider(item.id, false)');
    // Facilities keep the REAL reject (verification_status has a rejected state).
    expect(source).toContain('onVerifyOrganization(item.id, false)');
    // 'Rejected' status filter is FACILITY-ONLY (queue-gated, never a dead 0-chip).
    expect(source).toContain("id: 'rejected', label: 'Rejected'");
    expect(source).toContain("...(queueType === 'providers'");
  });

  it('keeps the mobile FAB + bottom bar owning the /verification approval action', () => {
    const fabSource = fs.readFileSync('src/components/navigation/ContextAwareFAB.jsx', 'utf8');
    const bottomBarSource = [
      fs.readFileSync('src/components/navigation/DynamicBottomBar.jsx', 'utf8'),
      fs.readFileSync('src/config/mobileRouteActions.js', 'utf8'),
    ].join('\n');

    expect(routeOwnsShellAction('/verification')).toBe(true);
    expect(fabSource.indexOf('if (isMobile || isContextPanelOpen || hideFab) return null;'))
      .toBeLessThan(fabSource.indexOf('useSupportTickets({ autoFetch: false, autoSubscribe: false, quiet: true })'));
    expect(bottomBarSource).toContain("pathname.startsWith('/verification')");
    expect(bottomBarSource.indexOf('{!hideContextFab && <DynamicBottomAction isScrolledDown={isScrolledDown} />}'))
      .toBeLessThan(bottomBarSource.indexOf('useSupportTickets({ autoFetch: false, autoSubscribe: false, quiet: true })'));
  });
});
