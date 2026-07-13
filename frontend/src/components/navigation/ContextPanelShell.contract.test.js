import fs from 'fs';

describe('ContextPanel shell contract', () => {
  const shellSource = () => fs.readFileSync('src/components/navigation/ResponsiveSidebar.jsx', 'utf8');
  const panelSource = () => [
    fs.readFileSync('src/components/navigation/ContextPanel.jsx', 'utf8'),
    fs.readFileSync('src/components/navigation/context-panel/ContextPanelChrome.jsx', 'utf8'),
  ].join('\n');
  const hardgateSource = () => fs.readFileSync('scripts/check-ui-surface-hardgate.js', 'utf8');

  it('keeps the right context panel as shared desktop shell chrome', () => {
    const shell = shellSource();
    const hardgate = hardgateSource();

    expect(shell).toContain("window.addEventListener('closeContextPanel', handleCloseEvent)");
    expect(shell).toContain("if (e.key === 'Escape' && isContextPanelOpen)");
    expect(shell).toContain('if (isMobile) {');
    expect(shell).toContain('return null;');
    expect(shell).toContain('<motion.aside');
    expect(shell).toContain('id="quick-actions-panel"');
    expect(shell).toContain('role="dialog"');
    expect(shell).toContain('aria-modal="true"');
    expect(shell).toContain('aria-label="Quick actions panel"');
    expect(shell).toContain('data-context-panel-shell="true"');
    expect(shell).toContain('bg-background/92');
    expect(shell).toContain('shadow-[0_12px_32px_rgb(0_0_0/0.12)]');
    expect(shell).toContain("actionTarget?.getAttribute('aria-disabled') === 'true'");
    expect(shell).toContain("actionTarget?.getAttribute('data-state') === 'unavailable'");
    expect(shell).toContain('if (actionTarget && !isUnavailableAction)');
    expect(shell).toContain('aria-hidden="true"');
    expect(shell).not.toContain('border-none');
    expect(shell).not.toContain("border: 'none !important'");
    expect(shell).not.toContain('useTheme');
    expect(hardgate).toContain('src/components/navigation/ResponsiveSidebar.jsx');
  });

  it('keeps route context content simple, labelled, and hardgated', () => {
    const panel = panelSource();
    const hardgate = hardgateSource();

    // Slimmed shared header (dedup): the pane no longer renders a duplicate route
    // title/subtitle; each inner panel owns its own 'X overview' heading, and the
    // shared header is just the control row (live dot + close).
    expect(panel).not.toContain('getPageContextHeader');
    expect(panel).not.toContain("subtitle: 'Active care requests'");
    expect(panel).toContain('flex items-center justify-end gap-3');
    expect(panel).toContain('data-context-panel-content="true"');
    expect(panel).toContain('aria-label="Close panel"');
    expect(panel).toContain('type="button"');
    expect(panel).toContain('aria-hidden="true"');
    expect(panel).toContain('You do not have access to this panel.');
    expect(panel).toContain('Ask an admin if this should be available.');
    expect(panel).toContain('Open a page to see related details and actions.');
    expect(panel).toContain("window.dispatchEvent(new CustomEvent('requestTodayRouteContext'));");
    expect(panel).toContain('<DashboardPanel todayContext={todayRouteContext} />');
    expect(panel).toContain("window.dispatchEvent(new CustomEvent('requestEmergencyRouteContext'));");
    expect(panel).toContain('<EmergencyPanel requestContext={emergencyRouteContext} />');
    expect(panel).toContain('<AmbulancesPanel ambulanceContext={ambulancesRouteContext} />');
    expect(panel).toContain('<InsurancePanel insuranceContext={insuranceRouteContext} />');
    expect(panel).not.toContain('refreshAllData={refreshAllData}');
    expect(panel).not.toContain('activityData={activityData}');
    expect(panel).not.toContain('Subtle service bar');
    expect(panel).not.toContain('h-0.5');
    expect(panel).not.toContain('Smart Context');
    expect(panel).not.toContain('Access Restricted');
    expect(hardgate).toContain('src/components/navigation/ContextPanel.jsx');
  });

  it('keeps CTX-02 access and chrome outside the route-context dispatcher', () => {
    const entry = fs.readFileSync('src/components/navigation/ContextPanel.jsx', 'utf8');
    const access = fs.readFileSync('src/components/navigation/context-panel/contextPanelAccess.js', 'utf8');

    expect(entry.split(/\r?\n/).length).toBeLessThanOrEqual(500);
    expect(entry).toContain("import { canAccessContextPanel } from './context-panel/contextPanelAccess';");
    expect(entry).toContain('<ContextPanelFrame useMockData={useMockData}>');
    expect(access).not.toContain("from 'react'");
    expect(access).toContain("['/users', management]");
  });
});
