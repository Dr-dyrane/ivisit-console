import fs from 'fs';

const {
  CANONICAL_HAIRLINE_TOKEN,
  collectReachableFiles,
  runHardgate,
  scanSource,
} = require('../../../scripts/check-ui-surface-hardgate');

const read = (file) => fs.readFileSync(file, 'utf8');

describe('shared surface hardgate contract', () => {
  it('walks local imports so shared primitives cannot bypass a clean page root', () => {
    const reachable = collectReachableFiles(['src/components/pwa/InstallPrompt.jsx']);

    expect(reachable).toContain('src/components/pwa/InstallPrompt.jsx');
    expect(reachable).toContain('src/components/ui/button.jsx');
    expect(reachable).toContain('src/lib/utils.js');
  });

  it('rejects decorative utility and CSS borders', () => {
    const utilityFindings = scanSource(
      'src/components/ui/example.jsx',
      '<div className="rounded-card border border-border bg-card" />',
      { checkRequiredSnippets: false }
    );
    const cssFindings = scanSource(
      'src/example.css',
      '.card { border: 1px solid hsl(var(--border)); }',
      { checkRequiredSnippets: false }
    );

    expect(utilityFindings.some((finding) => finding.token.includes('surface token'))).toBe(true);
    expect(cssFindings.some((finding) => finding.token.includes('decorative border declaration'))).toBe(true);
  });

  it('keeps keyboard focus and the exact neutral fill hairline legal', () => {
    const focusFindings = scanSource(
      'src/components/ui/example.jsx',
      '<button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20" />',
      { checkRequiredSnippets: false }
    );
    const hairlineFindings = scanSource(
      'src/components/ui/example.jsx',
      `<span className="h-px bg-[${CANONICAL_HAIRLINE_TOKEN}]" />`,
      { checkRequiredSnippets: false }
    );
    const loudDividerFindings = scanSource(
      'src/components/ui/example.jsx',
      '<span className="h-px bg-muted" />',
      { checkRequiredSnippets: false }
    );

    expect(focusFindings).toEqual([]);
    expect(hairlineFindings).toEqual([]);
    expect(loudDividerFindings.some((finding) => finding.token.includes('h-px'))).toBe(true);
  });

  it('contains the contrast-border exception to map marker rendering', () => {
    const markerStyle = '<div style="border: 4px solid rgba(255, 255, 255, 0.8)">';

    expect(scanSource(
      'src/components/map/MarkerIcons/createIcon.js',
      markerStyle,
      { checkRequiredSnippets: false }
    )).toEqual([]);
    expect(scanSource(
      'src/components/ui/example.jsx',
      markerStyle,
      { checkRequiredSnippets: false }
    ).some((finding) => finding.token.includes('inline decorative border'))).toBe(true);
  });

  it('keeps the shared chrome clean and the emergency FAB path explicitly create-only', () => {
    const result = runHardgate([]);
    const feedback = read('src/contexts/FeedbackContext.jsx');
    const indexCss = read('src/index.css');
    const fab = read('src/components/navigation/ContextAwareFAB.jsx');
    const contextAction = read('src/hooks/useContextAction.js');

    expect(result.findings).toEqual([]);
    expect(feedback).not.toMatch(/\bborder\s*:/);
    expect(indexCss).not.toMatch(/^\s*border(?!-radius)(?:-[a-z-]+)?\s*:/m);
    expect(indexCss).not.toContain('hover-glow');
    expect(fab).toContain('<EmergencyRequestModal key={key} {...props} mode="create" />');
    expect(fab).not.toContain("import { VisitModal }");
    expect(fab).not.toContain("case 'visit'");
    expect(contextAction).not.toContain("openModal('visit')");
    expect(contextAction).toContain("label: 'View statistics'");
    expect(contextAction).toContain("window.dispatchEvent(new CustomEvent('openAnalyticsModal'))");
  });
});
