import fs from 'fs';
import path from 'path';
import {
  COPILOT_ACTION_IDS,
  CopilotContractError,
  validateCopilotProposal,
  validateCopilotRequest,
} from './model/copilotContracts';
import { COPILOT_ACTION_REGISTRY, getCopilotAction } from './registry/copilotActionRegistry';
import { createLocalCopilotProposal } from './services/consoleCopilotProposalService';
import {
  createHealthNewsGuidanceRequest,
  createQuickSearchAskRequest,
  createSupportTicketGuidanceRequest,
} from './routeRequests';

const COPILOT_ROOT = path.resolve(__dirname);

const read = (relativePath) => fs.readFileSync(path.resolve(COPILOT_ROOT, relativePath), 'utf8');

const getProductionSources = (directory = COPILOT_ROOT) => fs.readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return getProductionSources(absolutePath);
    return /\.(?:js|jsx)$/.test(entry.name) && !/\.test\.(?:js|jsx)$/.test(entry.name)
      ? [absolutePath]
      : [];
  });

const dashboardRequest = () => ({
  actionId: COPILOT_ACTION_IDS.DASHBOARD_EXPLAIN,
  context: { dashboard: { evidence: [{ label: 'Open requests', value: 2 }] } },
});

describe('Console Copilot independent harness', () => {
  it('keeps the action allowlist exact and rejects arbitrary table, RPC, and SQL input', () => {
    const expectedActionIds = [
      'dashboard.explain',
      'organization.explain_readiness',
      'emergency.explain_next_action',
      'support.explain_ticket',
      'search.ask_visible_results',
      'health_news.explain_entry',
    ];

    expect(Object.values(COPILOT_ACTION_IDS)).toEqual(expectedActionIds);
    expect(Object.keys(COPILOT_ACTION_REGISTRY)).toEqual(expectedActionIds);
    expectedActionIds.forEach((actionId) => {
      expect(getCopilotAction(actionId)).toEqual(expect.objectContaining({
        id: actionId,
        kind: 'explanation',
        mode: 'capability-ladder',
      }));
    });

    expect(() => validateCopilotRequest({
      actionId: 'invite.prepare',
      context: { invitation: { evidence: [] } },
    })).toThrow(CopilotContractError);
    expect(() => validateCopilotRequest({ ...dashboardRequest(), table: 'profiles' })).toThrow(CopilotContractError);
    expect(() => validateCopilotRequest({
      ...dashboardRequest(),
      context: { dashboard: { evidence: [], rpc: 'dispatch_emergency' } },
    })).toThrow(CopilotContractError);
    expect(() => validateCopilotRequest({
      ...dashboardRequest(),
      context: { dashboard: { evidence: [], sql: 'select * from profiles' } },
    })).toThrow(CopilotContractError);
  });

  it('models loading, failure, unavailable, and no-write lifecycle honestly', () => {
    const controller = read('./hooks/useConsoleCopilotController.js');
    const summary = read('./components/ProposalSummary.jsx');
    const unavailable = createLocalCopilotProposal({
      actionId: COPILOT_ACTION_IDS.EMERGENCY_EXPLAIN_NEXT_ACTION,
      context: { emergency: { evidence: [] } },
    });

    expect(controller).toContain("phase: 'idle'");
    expect(controller).toContain("phase: 'preparing'");
    expect(controller).toContain("phase: 'ready'");
    expect(controller).toContain("phase: 'error'");
    expect(summary).toContain('aria-busy="true"');
    expect(summary).toContain('role="alert"');
    expect(unavailable).toMatchObject({ availability: 'unavailable', proposalOnly: true });
    expect(unavailable).not.toHaveProperty('execution');
    expect(unavailable).not.toHaveProperty('stale');
    expect(unavailable).not.toHaveProperty('reflected');

    // Invalid/unavailable authority is a visible controller error, rather than
    // a guessed fallback. P0 has no write, so stale/reflected states are rejected.
    expect(() => validateCopilotRequest({ actionId: 'emergency.dispatch', context: {} })).toThrow(CopilotContractError);
    expect(() => validateCopilotProposal({ ...unavailable, stale: true })).toThrow(CopilotContractError);
    expect(() => validateCopilotProposal({ ...unavailable, reflected: true })).toThrow(CopilotContractError);
  });

  it('keeps all feature sources free of Supabase, mutation, Edge, and raw-SQL ownership', () => {
    const forbidden = [
      /from\s+['"][^'"]*(?:supabase|@supabase\/supabase-js)[^'"]*['"]/i,
      /\bsupabase\s*\./i,
      /\.(?:from|rpc|insert|update|upsert|delete)\s*\(/,
      /\bfunctions\s*\.\s*invoke\s*\(/,
      /\b(?:select|insert|update|delete|alter|create|drop)\s+(?:\*|from|into|table)\b/i,
    ];

    getProductionSources().forEach((absolutePath) => {
      const source = fs.readFileSync(absolutePath, 'utf8');
      forbidden.forEach((pattern) => {
        expect({ file: path.relative(COPILOT_ROOT, absolutePath), pattern: pattern.toString(), matches: pattern.test(source) })
          .toEqual({ file: path.relative(COPILOT_ROOT, absolutePath), pattern: pattern.toString(), matches: false });
      });
    });
  });

  it('selects phone, tablet, and desktop variants from explicit breakpoint signals only', () => {
    const orchestrator = read('./components/ConsoleCopilotOrchestrator.jsx');

    expect(orchestrator).toContain('const { isPhone, isTablet, isDesktop } = useBreakpoint();');
    expect(orchestrator).toContain('if (isPhone) return <MobileCopilotSheet');
    expect(orchestrator).toContain('if (isTablet) return <TabletCopilotOverlay');
    expect(orchestrator).toContain('if (isDesktop) return <DesktopCopilotRail');
    expect(orchestrator).not.toContain('isMobile');
  });

  it('mounts one approved provider, keeps desktop inside the existing Context Panel, and uses route-local triggers', () => {
    const appLayout = fs.readFileSync(path.resolve(COPILOT_ROOT, '../../app/AppLayout.jsx'), 'utf8');
    const provider = read('./ConsoleCopilotContext.jsx');
    const contextPanelShell = fs.readFileSync(path.resolve(COPILOT_ROOT, '../../components/navigation/ResponsiveSidebar.jsx'), 'utf8');
    const desktopRail = read('./variants/DesktopCopilotRail.jsx');

    expect((appLayout.match(/<ConsoleCopilotProvider>/g) || [])).toHaveLength(1);
    expect(appLayout).toContain('<ConsoleCopilotProvider>');
    expect(appLayout).toContain('</ConsoleCopilotProvider>');
    expect(provider).toContain('{!isDesktop && <ConsoleCopilotOrchestrator controller={controller} />}');
    expect(contextPanelShell).toContain("import { useConsoleCopilot } from '../../features/copilot';");
    expect(contextPanelShell).toContain('const isCopilotPanel = copilot.isOpen && isDesktop;');
    expect(contextPanelShell).toContain("data-context-panel-mode={isCopilotPanel ? 'copilot' : 'route'}");
    expect(contextPanelShell).toContain('<DesktopCopilotRail');
    expect(desktopRail).not.toContain('<aside');
    expect(desktopRail).not.toMatch(/className=.*\bfixed\b/);

    [
      '../../components/pages/today/TodayDesktopView.jsx',
      '../../components/mobile/MobileToday.jsx',
      '../../components/tablet/TabletToday.jsx',
      '../../components/mobile/MobileEmergency.jsx',
      '../../components/mobile/organizations/MobileOrganizationDetailSheet.jsx',
      '../../components/pages/organizations/OrganizationDetailRail.jsx',
      '../../components/pages/requests/RequestDetailRail.jsx',
    ].forEach((relativePath) => {
      const source = fs.readFileSync(path.resolve(COPILOT_ROOT, relativePath), 'utf8');
      expect(source).toContain('<CopilotActionButton');
      expect(source).toContain('request={copilotRequest}');
    });

    const mobileEmergency = fs.readFileSync(
      path.resolve(COPILOT_ROOT, '../../components/mobile/MobileEmergency.jsx'),
      'utf8',
    );
    expect(mobileEmergency).toContain('onBeforeOpen={() => setActiveRequestId(null)}');
    const mobileOrganization = fs.readFileSync(
      path.resolve(COPILOT_ROOT, '../../components/mobile/organizations/MobileOrganizationDetailSheet.jsx'),
      'utf8',
    );
    expect(mobileOrganization).toContain('onBeforeOpen={onClose}');
  });

  it('uses the AI mark, concise product copy, and complete interaction contrast states', () => {
    const actionButton = read('./components/CopilotActionButton.jsx');
    const summary = read('./components/ProposalSummary.jsx');
    const proposalService = read('./services/consoleCopilotProposalService.js');
    const desktopRail = read('./variants/DesktopCopilotRail.jsx');
    const mobileSheet = read('./variants/MobileCopilotSheet.jsx');
    const tabletOverlay = read('./variants/TabletCopilotOverlay.jsx');

    [actionButton, desktopRail, mobileSheet, tabletOverlay].forEach((source) => {
      expect(source).toContain('Sparkles');
      expect(source).not.toContain('MessageSquareText');
    });
    expect(actionButton).toContain('hover:text-foreground');
    expect(actionButton).toContain('focus-visible:text-foreground');
    expect(actionButton).toContain('active:bg-foreground/15');
    expect(desktopRail).toContain('Quick insights');
    expect(mobileSheet).toContain('subtitle="Quick insights"');
    expect(tabletOverlay).toContain('subtitle="Quick insights"');
    expect(summary).not.toContain('{proposal.guardrail}');
    expect(proposalService).not.toMatch(/This response explains only|evidence passed from the current screen/i);
  });

  it('does not add Copilot to existing routes, navigation, FAB, dock, or route-owned Context Panel content', () => {
    [
      '../../app/AppRoutes.jsx',
      '../../config/mobileNavigation.js',
      '../../config/mobileRouteActions.js',
      '../../components/navigation/ContextAwareFAB.jsx',
      '../../components/navigation/DynamicBottomBar.jsx',
      '../../components/navigation/ContextPanel.jsx',
    ].forEach((relativePath) => {
      const source = fs.readFileSync(path.resolve(COPILOT_ROOT, relativePath), 'utf8');
      expect(source).not.toMatch(/copilot/i);
    });
  });

  it('keeps Support, visible Search, and Health News guidance evidence-only with no send, publish, or navigation command', () => {
    const requests = [
      createSupportTicketGuidanceRequest({
        ticket: {
          subject: 'Coverage help',
          message: 'I need help updating coverage.',
          status: 'open',
          priority: 'normal',
          category: 'billing',
        },
        faqs: [{ question: 'How do I add coverage?', category: 'Billing' }],
      }),
      createQuickSearchAskRequest({
        query: 'ambulance',
        resultGroups: [{ category: 'Requests', items: [{ id: 'req-1', title: 'REQ-1' }] }],
      }),
      createHealthNewsGuidanceRequest({
        article: {
          id: 'news-1',
          title: 'Heat safety',
          category: 'Wellness',
          published: true,
          source: 'Public Health',
          source_url_valid: false,
        },
      }),
    ];

    requests.forEach((request) => {
      const proposal = createLocalCopilotProposal(request);
      expect(proposal).toMatchObject({
        proposalOnly: true,
        kind: 'explanation',
        suggestedActions: [],
      });
      expect(proposal).not.toHaveProperty('execution');
      expect(proposal.evidence).toEqual(expect.arrayContaining([
        expect.objectContaining({ label: 'Suggested next step' }),
      ]));
    });

    const supportProposal = createLocalCopilotProposal(requests[0]);
    const draft = supportProposal.evidence.find((item) => item.label === 'Local reply draft');
    expect(draft).toEqual(expect.objectContaining({
      copyText: expect.stringContaining('Coverage help'),
      description: expect.stringMatching(/not sent or saved/i),
    }));

    expect(() => validateCopilotRequest({
      ...requests[0],
      context: {
        supportTicket: {
          ...requests[0].context.supportTicket,
          suggestedActions: [{
            id: 'unsafe.navigate',
            label: 'Open hidden route',
            availability: 'available',
            stages: ['prepare', 'confirm', 'execute'],
            requiresConfirmation: true,
            command: { id: 'workflow.open_requests' },
          }],
        },
      },
    })).toThrow(CopilotContractError);
  });

  it('takes evidence only from the mounted Support, visible Search, and News projections', () => {
    const supportRail = fs.readFileSync(path.resolve(COPILOT_ROOT, '../../components/pages/support/SupportDetailRail.jsx'), 'utf8');
    const quickSearch = fs.readFileSync(path.resolve(COPILOT_ROOT, '../../components/navigation/QuickSearch.jsx'), 'utf8');
    const healthNewsRail = fs.readFileSync(path.resolve(COPILOT_ROOT, '../../components/pages/health-news/HealthNewsDetailRail.jsx'), 'utf8');
    const proposalService = read('./services/consoleCopilotProposalService.js');

    expect(supportRail).toContain('createSupportTicketGuidanceRequest({ ticket, faqs })');
    expect(quickSearch).toContain('resultGroups: visibleResults');
    expect(quickSearch).toContain('onBeforeOpen={onClose}');
    expect(healthNewsRail).toContain('createHealthNewsGuidanceRequest');
    expect(proposalService).toContain('This guidance only reflects the results currently visible in search.');
    expect(proposalService).toContain('does not create, edit, publish, or validate editorial content.');
  });
});
