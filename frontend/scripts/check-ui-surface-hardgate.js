const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

const defaultFiles = [
  'src/App.js',
  'src/index.css',
  'tailwind.config.js',
  'src/components/pages/TodayHome.jsx',
  'src/components/context/DashboardPanel.jsx',
  'src/components/common/ProtectedRoute.jsx',
  'src/components/common/IslandNavigation.jsx',
  'src/components/common/FilterSheet.jsx',
  'src/components/common/NotificationCenter.jsx',
  'src/components/common/NotificationCard.jsx',
  'src/components/navigation/SmartHeader.jsx',
  'src/components/navigation/QuickSearch.jsx',
  'src/components/navigation/ResponsiveSidebar.jsx',
  'src/components/navigation/ContextPanel.jsx',
  'src/components/navigation/DynamicBottomBar.jsx',
  'src/components/navigation/ContextAwareFAB.jsx',
  'src/components/navigation/MobileNavMenu.jsx',
  'src/hooks/useContextAction.js',
  'src/components/ui/theme-toggle.jsx',
  'src/components/ui/ModalShell.jsx',
  'src/components/common/ConsoleModuleRail.jsx',
  'src/config/consoleModuleRail.js',
  'src/config/mobileNavigation.js',
  'src/components/pages/EmergencyRequestsPage.jsx',
  'src/components/mobile/MobileEmergency.jsx',
  'src/components/context/EmergencyPanel.jsx',
  'src/components/modals/EmergencyDetailsModal.jsx',
  'src/components/modals/EmergencyRequestModal.jsx',
  'src/components/pages/VerificationQueue.jsx',
  'src/components/mobile/MobileVerification.jsx',
  'src/components/context/VerificationPanel.jsx',
  'src/components/views/VerificationQueueListView.jsx',
  'src/components/views/VerificationQueueTableView.jsx',
  'src/components/modals/VerificationModal.jsx',
  'src/components/pages/DoctorsPage.jsx',
  'src/components/mobile/MobileDoctors.jsx',
  'src/components/context/DoctorsPanel.jsx',
  'src/components/views/DoctorListView.jsx',
  'src/components/views/DoctorTableView.jsx',
  'src/components/modals/DoctorModal.jsx',
  'src/components/pages/WalletManagementPage.jsx',
  'src/components/mobile/MobileWallet.jsx',
  'src/components/context/WalletPanel.jsx',
  'src/components/modals/GlobalFinancialModals.jsx',
  'src/components/pages/GodModeMap.jsx',
  'src/components/mobile/MobileMap.jsx',
  'src/components/map/MarkerDetailPanel.jsx',
  'src/components/map/MapLayerControls.jsx',
  'src/components/map/MapFallback.jsx',
  'src/components/pages/VisitsPage.jsx',
  'src/components/mobile/MobileVisits.jsx',
  'src/components/mobile/MobileMetricList.jsx',
  'src/components/context/VisitsPanel.jsx',
  'src/components/views/VisitListView.jsx',
  'src/components/views/VisitTableView.jsx',
  'src/components/modals/VisitModal.jsx',
  'src/components/pages/HospitalsPage.jsx',
  'src/components/mobile/MobileHospitals.jsx',
  'src/components/context/HospitalsPanel.jsx',
  'src/components/views/HospitalListView.jsx',
  'src/components/views/HospitalTableView.jsx',
  'src/components/modals/HospitalModal.jsx',
  'src/components/pages/AmbulancesPage.jsx',
  'src/components/mobile/MobileAmbulances.jsx',
  'src/components/views/AmbulanceListView.jsx',
  'src/components/views/AmbulanceTableView.jsx',
  'src/components/modals/AmbulanceModal.jsx',
  'src/components/context/AmbulancesPanel.jsx',
  'src/components/pages/SupportTicketsPage.jsx',
  'src/components/mobile/MobileSupportTickets.jsx',
  'src/components/context/SupportTicketsPanel.jsx',
  'src/components/modals/SupportTicketModal.jsx',
  'src/components/pages/HealthNewsManagementPage.jsx',
  'src/components/mobile/MobileHealthNews.jsx',
  'src/components/context/HealthNewsPanel.jsx',
  'src/components/views/HealthNewsListView.jsx',
  'src/components/views/HealthNewsTableView.jsx',
  'src/components/modals/HealthNewsModal.jsx',
  'src/components/modals/AnalyticsModal.jsx',
  'src/components/pages/NotFoundPage.jsx',
  'src/components/pages/OnboardingSuccessPage.jsx',
  'src/components/pages/OnboardingPage.jsx',
  'src/components/onboarding/OnboardingWizard.jsx',
  'src/components/onboarding/OrganizationTypeStep.jsx',
  'src/components/onboarding/AdminAccountStep.jsx',
  'src/components/onboarding/OrganizationDetailsStep.jsx',
  'src/components/onboarding/InitialSetupStep.jsx',
  'src/components/onboarding/VerificationStep.jsx',
];

const rawArgs = process.argv.slice(2);
const strictRadius = rawArgs.includes('--strict-radius') || process.env.UI_RADIUS_STRICT === '1';
const requestedFiles = rawArgs.filter((arg) => arg !== '--strict-radius');
const files = requestedFiles.length > 0 ? requestedFiles : defaultFiles;

const strictRadiusPatterns = [
  {
    name: 'non-canonical radius utility',
    regex: /(?:^|[\s"'`])((?:[A-Za-z0-9_!\/\[\]().%-]+:)*rounded(?:-(?!(?:(?:t|b|l|r|tl|tr|bl|br)-)?(?:sheet|card|inner|icon|button|pill|modal|squircle)(?=[\s"'`]|$))[^\s"'`]+)?)(?=[\s"'`]|$)/g,
  },
  {
    name: 'legacy geometry utility',
    regex: /(?:^|[\s"'`])((?:[A-Za-z0-9_!\/\[\]().%-]+:)*geo-[A-Za-z0-9_-]+)(?=[\s"'`]|$)/g,
  },
  {
    name: 'legacy squircle size utility',
    regex: /(?:^|[\s"'`])((?:[A-Za-z0-9_!\/\[\]().%-]+:)*squircle-(?:3xl|2xl|xl|lg|md|sm|xs))(?=[\s"'`]|$)/g,
  },
];

const bannedPatterns = [
  {
    name: 'decorative orb utility',
    regex: /\b(bg-orb)\b/g,
  },
  {
    name: 'surface token',
    regex: /(?:^|\s)((?:[A-Za-z0-9_!-]+:)*(?:border|ring|outline|divide)(?:-[^\s"'`]+)?|(?:[A-Za-z0-9_!-]+:)*(?:h|w|min-h|min-w|max-h|max-w)-px)(?=\s|$)/g,
  },
  {
    name: 'pixel hairline',
    regex: /(?:^|[^0-9])((?:0\.5|1)px)\b/g,
  },
];

const bannedCssPatterns = [
  {
    name: 'decorative orb utility',
    regex: /\b(bg-orb)\b/g,
  },
  {
    name: 'zero-radius geometry',
    regex: /border-radius:\s*0(?:;|\b)/g,
  },
  {
    name: 'hardcoded radius',
    regex: /border-radius:\s*(?!var\()[^;\s][^;]*/g,
  },
  {
    name: 'nonzero letter spacing',
    regex: /letter-spacing:\s*(?!0(?:;|\s|$))[^;\s][^;]*/g,
  },
];

const findings = [];

const requiredSnippets = {
  'src/App.js': [
    'className="flex items-center gap-3 rounded-card bg-card/70 px-4 py-4',
    'className="flex h-10 w-10 items-center justify-center rounded-icon',
    'className="h-20 rounded-inner bg-muted/35 animate-pulse"',
    'className="rounded-card bg-card/55 p-3',
    'className="mb-3 h-11 rounded-inner bg-muted/35 animate-pulse"',
    'className="h-24 rounded-inner bg-muted/30 animate-pulse"',
    'className="fixed bottom-1 left-1/2',
    'rounded-pill shadow-2xl',
  ],
  'src/components/pages/TodayHome.jsx': [
    'getTodayModuleRailItems(roleKind)',
    'getConsoleModuleRailItems(roleKind)',
  ],
  'src/index.css': [
    '--radius-sheet: 44px;',
    '--radius-card: 30px;',
    '--radius-inner: 22px;',
    '--radius-icon: 14px;',
    '--radius-button: 20px;',
    '--radius-pill: 999px;',
    '--radius-modal: 38px;',
    '.squircle-sheet',
    '.squircle-modal',
    '.squircle-card',
    '.squircle-inner',
    '.squircle-button',
    '.squircle-icon',
    '.squircle-pill',
    '.squircle-3xl',
    '.squircle-2xl',
    'border-radius: var(--radius-sheet);',
    'border-radius: var(--radius-modal);',
    '.squircle-xl',
    '.squircle-lg',
    '.squircle-md',
    '.squircle-sm',
    '.squircle-xs',
    'border-radius: var(--radius-card);',
    'border-radius: var(--radius-inner);',
    'border-radius: var(--radius-button);',
    'border-radius: var(--radius-icon);',
    'border-radius: var(--radius-pill);',
    '.geo-sharp',
    'border-radius: var(--radius-inner);',
  ],
  'tailwind.config.js': [
    "brand: 'hsl(var(--primary))'",
    "sheet: 'var(--radius-sheet, 44px)'",
    "button: 'var(--radius-button, 20px)'",
    "pill: 'var(--radius-pill, 999px)'",
    "squircle: 'var(--squircle, 1.75rem)'",
  ],
  'src/config/consoleModuleRail.js': [
    "sponsor: ['today', 'statistics']",
  ],
  'src/components/navigation/DynamicBottomBar.jsx': [
    'pageShellConfig?.hideFab',
    '!hideContextFab',
    'getMobileNavigationItems(userRole)',
  ],
  'src/config/mobileNavigation.js': [
    "overflowOwner: 'avatar'",
    'bottomMenuButton: false',
    "userRole === 'sponsor'",
    "{ id: 'approvals', path: '/verification', label: 'Approvals' }",
    "{ id: 'staff', path: '/doctors', label: 'Staff' }",
  ],
};

for (const relativeFile of files) {
  const absoluteFile = path.resolve(repoRoot, relativeFile);

  if (!absoluteFile.startsWith(repoRoot + path.sep)) {
    findings.push({
      file: relativeFile,
      line: 0,
      token: 'path',
      text: 'File is outside the frontend workspace.',
    });
    continue;
  }

  if (!fs.existsSync(absoluteFile)) {
    findings.push({
      file: relativeFile,
      line: 0,
      token: 'missing',
      text: 'File does not exist.',
    });
    continue;
  }

  const lines = fs.readFileSync(absoluteFile, 'utf8').split(/\r?\n/);
  const fileText = lines.join('\n');

  for (const snippet of requiredSnippets[relativeFile] || []) {
    if (!fileText.includes(snippet)) {
      findings.push({
        file: relativeFile,
        line: 0,
        token: `missing contract: ${snippet}`,
        text: 'Required Today shell contract was not found.',
      });
    }
  }

  lines.forEach((lineText, index) => {
    const activePatterns = relativeFile.endsWith('.css')
      ? bannedCssPatterns
      : strictRadius
        ? [...strictRadiusPatterns, ...bannedPatterns]
        : bannedPatterns;

    for (const pattern of activePatterns) {
      pattern.regex.lastIndex = 0;
      let match;

      while ((match = pattern.regex.exec(lineText)) !== null) {
        const token = match[1];
        findings.push({
          file: relativeFile,
          line: index + 1,
          token: `${pattern.name}: ${token}`,
          text: lineText.trim(),
        });
      }
    }
  });
}

if (findings.length > 0) {
  console.error('UI surface hardgate failed.');
  console.error('Active revamp surfaces cannot use decorative borders, rings, outlines, dividers, or px hairlines.');
  console.error('Use role-based radius tokens, spacing, surface depth, tone, and motion instead.\n');

  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} ${finding.token}`);
    console.error(`  ${finding.text}`);
  }

  process.exit(1);
}

console.log(`UI surface hardgate passed for ${files.length} file(s).${strictRadius ? ' Strict radius mode enabled.' : ''}`);
