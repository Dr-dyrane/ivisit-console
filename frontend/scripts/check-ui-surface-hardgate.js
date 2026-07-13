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
  'src/components/console/MetricStrip.jsx',
  'src/config/consoleModuleRail.js',
  'src/config/mobileNavigation.js',
  'src/config/mobileRouteActions.js',
  'src/components/pages/EmergencyRequestsPage.jsx',
  'src/components/mobile/MobileEmergency.jsx',
  'src/components/context/EmergencyPanel.jsx',
  'src/components/modals/EmergencyDetailsModal.jsx',
  'src/components/modals/EmergencyRequestModal.jsx',
  'src/components/pages/VerificationQueue.jsx',
  'src/components/mobile/MobileVerification.jsx',
  'src/components/context/VerificationPanel.jsx',
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
  'src/components/map/god-mode/DriverAssignmentCard.jsx',
  'src/components/map/god-mode/GodModeMapDesktop.jsx',
  'src/components/map/god-mode/mapPresentation.js',
  'src/components/map/god-mode/useGodModeMapController.js',
  'src/components/mobile/MobileMap.jsx',
  'src/components/map/MarkerDetailPanel.jsx',
  'src/components/map/MapLayerControls.jsx',
  'src/components/map/MapFallback.jsx',
  'src/components/map/MapLoadingState.jsx',
  'src/components/map/MapViewportSummary.jsx',
  'src/components/map/MapRefiner/GoogleMapsRefiner.jsx',
  'src/components/map/MapRefiner/LeafletMapRefiner.jsx',
  'src/components/map/MapRenderers/GoogleMapsRenderer.jsx',
  'src/components/map/MapRenderers/LeafletMapRenderer.jsx',
  'src/components/map/RefreshControls.jsx',
  'src/components/map/RecentAlertsPanel.jsx',
  'src/components/map/LiveStatsPanel.jsx',
  'src/components/context/MapPanel.jsx',
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
  'src/components/pages/UsersPage.jsx',
  'src/components/pages/OrganizationsPage.jsx',
  'src/components/mobile/MobileOrganizations.jsx',
  'src/components/context/OrganizationsPanel.jsx',
  'src/components/modals/OrganizationModal.jsx',
  'src/components/pages/InsuranceManagementPage.jsx',
  'src/components/pages/insurance/InsuranceDesktopWorkspace.jsx',
  'src/components/mobile/MobileInsurance.jsx',
  'src/components/context/InsurancePanel.jsx',
  'src/components/modals/InsuranceModal.jsx',
  'src/components/pages/SubscriptionManagementPage.jsx',
  'src/components/pages/subscriptions/SubscriptionsDesktopWorkspace.jsx',
  'src/components/mobile/MobileSubscriptions.jsx',
  'src/components/context/SubscriptionsPanel.jsx',
  'src/components/pages/PricingManagementPage.jsx',
  'src/components/pages/pricing/PricingDesktopWorkspace.jsx',
  'src/components/mobile/MobilePricing.jsx',
  'src/components/context/PricingContextPanel.jsx',
  'src/components/pages/Analytics.jsx',
  'src/components/pages/analytics/AnalyticsDesktopWorkspace.jsx',
  'src/components/analytics/AnalyticsSummaryPrimitives.jsx',
  'src/components/mobile/MobileAnalytics.jsx',
  'src/components/mobile/MobileSkeleton.jsx',
  'src/components/mobile/canon/MobileGlanceTile.jsx',
  'src/components/context/AnalyticsPanel.jsx',
  'src/components/pages/SettingsPage.jsx',
  'src/components/pages/settings/SettingsDesktopWorkspace.jsx',
  'src/components/mobile/MobileSettings.jsx',
  'src/components/context/SettingsPanel.jsx',
  'src/components/modals/SecurityModal.jsx',
  'src/components/modals/ProfileEditModal.jsx',
  'src/components/modals/SubscriptionModal.jsx',
  'src/components/modals/AnalyticsModal.jsx',
  'src/components/pages/NotFoundPage.jsx',
  'src/components/pages/OnboardingSuccessPage.jsx',
  'src/components/pages/LoginPage.jsx',
  'src/components/pages/SetPasswordPage.jsx',
  'src/components/pages/OnboardingPage.jsx',
  'src/components/onboarding/OnboardingWizard.jsx',
  'src/components/onboarding/OrganizationTypeStep.jsx',
  'src/components/onboarding/AdminAccountStep.jsx',
  'src/components/onboarding/OrganizationDetailsStep.jsx',
  'src/components/onboarding/VerificationStep.jsx',
  'src/components/modals/InviteUserModal.jsx',
  'src/components/modals/UserModal.jsx',
];

const CANONICAL_HAIRLINE_TOKEN = 'hsl(var(--muted-foreground)/0.08)';
const SOURCE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.css'];
const MAP_MARKER_CONTRAST_ALLOWLIST = new Set([
  'src/components/map/MarkerIcons/createIcon.js',
]);

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
    regex: /(?:^|[\s"'`])((?:[A-Za-z0-9_!\/\[\]().%=&>#@-]+:)*(?:(?:border|ring)(?:-[^\s"'`:]+)?|outline-[^\s"'`:]+|divide-[^\s"'`:]+|(?:h|w|min-h|min-w|max-h|max-w)-px))(?=[\s"'`]|$)/g,
  },
  {
    name: 'inline decorative border',
    regex: /\b((?:border|outline)(?:Top|Right|Bottom|Left|Inline|Block)?(?:Width|Style|Color)?)\s*:\s*['"`]?[^,;}]*?(?:\d+(?:\.\d+)?px|solid|dashed|dotted)/gi,
  },
  {
    name: 'pixel hairline',
    // Match literal hairline geometry, not a 1px OFFSET inside a canonical box shadow.
    // The old context-free regex made the default build reject tailwind's locked e1 token
    // (`0 1px 3px ...`) even though it is elevation, not a border/divider.
    regex: /\b(?:border(?:Width|TopWidth|RightWidth|BottomWidth|LeftWidth)?|outline(?:Width)?|(?:min|max)?(?:Width|Height)|width|height|border(?:-(?:top|right|bottom|left))?(?:-width)?)\s*[:=]\s*['"`]?((?:0\.5|1)px)\b/gi,
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
    regex: /letter-spacing:\s*(?!0(?:;|\s|$))(?!var\()[^;\s][^;]*/g,
  },
  {
    name: 'decorative border declaration',
    regex: /(?:^|[;{]\s*)(border(?!-(?:radius|collapse|spacing)\b)(?:-[a-z-]+)?)\s*:/gi,
  },
  {
    name: 'decorative outline declaration',
    regex: /(?:^|[;{]\s*)(outline(?:-[a-z-]+)?)\s*:/gi,
  },
  {
    name: 'decorative border apply',
    regex: /@apply[^;\n]*\b((?:border|divide)(?:-[^\s;]+)?)/g,
  },
];

const requiredSnippets = {
  'src/App.js': [
    'className="relative min-h-[calc(100dvh-3rem)] overflow-hidden"',
    'lg:flex-row lg:items-center lg:px-6 lg:pl-24 lg:pt-8 xl:pl-28',
    'rounded-t-sheet bg-card/68 p-3 shadow-[0_12px_32px_rgb(0_0_0/0.10)]',
    'rounded-t-sheet bg-card/78 p-4 shadow-[0_12px_32px_rgb(0_0_0/0.10)]',
    '<Pulse className="h-7 w-7 rounded-icon" />',
    'animate-pulse bg-muted/38 dark:bg-white/[0.055]',
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
    'getRouteOwnedMobileAction(location.pathname, profile, pageAction, can)',
    // provider_type is the second arg so responder providers get the driver slate.
    'getMobileNavigationItems(userRole, profile?.provider_type, location.pathname)',
  ],
  'src/config/mobileRouteActions.js': [
    'getAccessibleNav',
    'getRouteProtection',
    "pathname.startsWith('/map') && canReach('/map')",
    "pathname.startsWith('/settings') && canReach('/settings')",
    "label: 'Center map'",
    "label: 'Security'",
    'pageActionMatchesRoute(pageAction, pathname)',
  ],
  'src/config/mobileNavigation.js': [
    "overflowOwner: 'avatar'",
    'bottomMenuButton: false',
    "userRole === 'sponsor'",
    "{ id: 'statistics', path: '/analytics', label: 'Statistics' }",
    "{ prefix: '/verification', id: 'approvals', path: '/verification', label: 'Approvals' }",
    "{ prefix: '/doctors', id: 'staff', path: '/doctors', label: 'Staff' }",
  ],
};

const normalizeRelativePath = (filePath) => {
  const absoluteFile = path.isAbsolute(filePath)
    ? path.resolve(filePath)
    : path.resolve(repoRoot, filePath);
  return path.relative(repoRoot, absoluteFile).split(path.sep).join('/');
};

const resolveLocalImport = (fromRelativeFile, specifier) => {
  let basePath;

  if (specifier.startsWith('@/')) {
    basePath = path.resolve(repoRoot, 'src', specifier.slice(2));
  } else if (specifier.startsWith('.')) {
    basePath = path.resolve(repoRoot, path.dirname(fromRelativeFile), specifier);
  } else {
    return null;
  }

  const candidates = [
    basePath,
    ...SOURCE_EXTENSIONS.map((extension) => `${basePath}${extension}`),
    ...SOURCE_EXTENSIONS.map((extension) => path.join(basePath, `index${extension}`)),
  ];

  for (const candidate of candidates) {
    if (!candidate.startsWith(repoRoot + path.sep)) continue;
    if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) continue;
    return normalizeRelativePath(candidate);
  }

  return null;
};

const extractLocalImports = (source) => {
  const specifiers = new Set();
  const patterns = [
    /(?:^|\n)\s*(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /@import\s+(?:url\()?['"]([^'"]+)['"]/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source)) !== null) {
      specifiers.add(match[1]);
    }
  }

  return [...specifiers];
};

const collectReachableFiles = (entryFiles) => {
  const queue = entryFiles.map(normalizeRelativePath);
  const visited = new Set();

  while (queue.length > 0) {
    const relativeFile = queue.shift();
    if (visited.has(relativeFile)) continue;
    visited.add(relativeFile);

    const absoluteFile = path.resolve(repoRoot, relativeFile);
    if (!absoluteFile.startsWith(repoRoot + path.sep)) continue;
    if (!fs.existsSync(absoluteFile) || !fs.statSync(absoluteFile).isFile()) continue;

    const source = fs.readFileSync(absoluteFile, 'utf8');
    for (const specifier of extractLocalImports(source)) {
      const dependency = resolveLocalImport(relativeFile, specifier);
      if (dependency && !visited.has(dependency)) queue.push(dependency);
    }
  }

  return [...visited];
};

const isFocusIndicatorToken = (token) => {
  const parts = token.split(':');
  const utility = parts.pop();
  const hasFocusVariant = parts.some((part) => part === 'focus' || part === 'focus-visible');
  return hasFocusVariant && /^(?:ring|outline)(?:-|$)/.test(utility);
};

const isCanonicalHairline = (token, lineText) => {
  const utility = token.split(':').pop();
  return (utility === 'h-px' || utility === 'w-px')
    && lineText.includes(CANONICAL_HAIRLINE_TOKEN);
};

const isNonVisualReset = (token) => {
  const utility = token.split(':').pop();
  return utility === 'border-0'
    || utility === 'border-none'
    || utility === 'border-transparent'
    || utility === 'ring-0'
    || utility === 'border-collapse'
    || utility === 'border-separate';
};

const isAllowedFinding = ({ file, patternName, token, lineText }) => {
  if (patternName === 'surface token') {
    return isFocusIndicatorToken(token)
      || isCanonicalHairline(token, lineText)
      || isNonVisualReset(token);
  }

  if (patternName === 'inline decorative border') {
    return MAP_MARKER_CONTRAST_ALLOWLIST.has(file);
  }

  return false;
};

const scanSource = (relativeFile, source, options = {}) => {
  const findings = [];
  const lines = source.split(/\r?\n/);

  if (options.checkRequiredSnippets !== false) {
    for (const snippet of requiredSnippets[relativeFile] || []) {
      if (!source.includes(snippet)) {
        findings.push({
          file: relativeFile,
          line: 0,
          token: `missing contract: ${snippet}`,
          text: 'Required Today shell contract was not found.',
        });
      }
    }
  }

  lines.forEach((lineText, index) => {
    if (/^(?:\/\/|\/\*|\*|\*\/)/.test(lineText.trim())) return;

    const activePatterns = relativeFile.endsWith('.css')
      ? bannedCssPatterns
      : options.strictRadius
        ? [...strictRadiusPatterns, ...bannedPatterns]
        : bannedPatterns;

    for (const pattern of activePatterns) {
      pattern.regex.lastIndex = 0;
      let match;

      while ((match = pattern.regex.exec(lineText)) !== null) {
        const token = match[1] || match[0];
        if (isAllowedFinding({
          file: relativeFile,
          patternName: pattern.name,
          token,
          lineText,
        })) continue;

        findings.push({
          file: relativeFile,
          line: index + 1,
          token: `${pattern.name}: ${token}`,
          text: lineText.trim(),
        });
      }
    }
  });

  return findings;
};

const runHardgate = (args = process.argv.slice(2)) => {
  const strictRadius = args.includes('--strict-radius') || process.env.UI_RADIUS_STRICT === '1';
  const requestedFiles = args.filter((arg) => arg !== '--strict-radius');
  const rootFiles = (requestedFiles.length > 0 ? requestedFiles : defaultFiles).map(normalizeRelativePath);
  const rootFileSet = new Set(rootFiles);
  const files = collectReachableFiles(rootFiles);
  const findings = [];

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

    const source = fs.readFileSync(absoluteFile, 'utf8');
    findings.push(...scanSource(relativeFile, source, {
      checkRequiredSnippets: rootFileSet.has(relativeFile),
      strictRadius: strictRadius && rootFileSet.has(relativeFile),
    }));
  }

  return { files, findings, rootFiles, strictRadius };
};

if (require.main === module) {
  const result = runHardgate();

  if (result.findings.length > 0) {
    console.error('UI surface hardgate failed.');
    console.error('Active revamp surfaces and their shared imports cannot use decorative borders, rings, outlines, dividers, or px hairlines.');
    console.error(`Use role-based radius tokens, surface depth, and tone. The only divider exception is ${CANONICAL_HAIRLINE_TOKEN}.\n`);

    for (const finding of result.findings) {
      console.error(`${finding.file}:${finding.line} ${finding.token}`);
      console.error(`  ${finding.text}`);
    }

    process.exitCode = 1;
  } else {
    console.log(`UI surface hardgate passed for ${result.rootFiles.length} root file(s) and ${result.files.length} reachable file(s).${result.strictRadius ? ' Strict radius mode enabled for roots.' : ''}`);
  }
}

module.exports = {
  CANONICAL_HAIRLINE_TOKEN,
  MAP_MARKER_CONTRAST_ALLOWLIST,
  collectReachableFiles,
  extractLocalImports,
  runHardgate,
  scanSource,
};
