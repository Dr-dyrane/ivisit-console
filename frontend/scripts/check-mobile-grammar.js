#!/usr/bin/env node
/**
 * check-mobile-grammar.js — the mobile page-type grammar conformance linter.
 *
 * WHY THIS EXISTS (the harness gap Hospitals exposed, 2026-07-10): the existing
 * gates catch mechanical invariants — encoding (mojibake), geometry/borders
 * (ui-surface-hardgate), phantom DB columns (data-contract), and the presence of
 * ALREADY-PINNED strings (per-page contract tests). None of them see GRAMMAR
 * CONFORMANCE. Hospitals shipped 8 canon failures under a full green suite — and
 * the contract test made it worse by PINNING the metric rail that violated the LIST
 * grammar (Lesson 26e, pinned-test circularity, made concrete). A pin locks ONE
 * instance; this linter bans the whole off-grammar CLASS and requires the canon
 * anatomy — the mechanical form of Lesson 26(d) directional blindness.
 *
 * WHAT IT CANNOT SEE (by construction): behavioral invariants — heading count =
 * active-KPI scope, load-more truly appending, placeholder-poisoning, filter-state
 * truth. Those are runtime; the live click-test MATRIX is their harness
 * (docs/ui-ux/MOBILE_PAGE_CLOSE_CHECKLIST.md). This linter is the STATIC half only.
 *
 * THE RATCHET: every src/components/mobile/Mobile*.jsx MUST have a manifest entry —
 * an unclassified page is a FATAL error, so a NEW page (e.g. Wallet) cannot ship
 * without a conscious grammar declaration, and declaring `list` forces the anatomy.
 *
 * Canon: docs/design-system/MOBILE_DESIGN_SYSTEM.md §5 (LIST vs DASHBOARD vs HYBRID + the
 * DIRECTORY expression). Run: `node scripts/check-mobile-grammar.js` (add --strict
 * to make WARNINGS fatal too).
 */

const fs = require('fs');
const path = require('path');

const MOBILE_DIR = path.join(__dirname, '..', 'src', 'components', 'mobile');

// ── The manifest: every mobile file, its grammar tier, and (for non-`list`) why. ──
// Tiers:
//   list          — full LIST canon (§5): heading + search + grouped panel +
//                    group-shaped skeleton + warm-up + Updating pill; NO glance
//                    tiles / metric rails (those are DASHBOARD furniture).
//   dashboard     — signal-first hero; NO search / KPI filter chips (tiles navigate,
//                   they never filter a list).
//   hybrid        — primary finance value + read-only KPIs + source tabs + grouped
//                   feed. Used when a domain owns one operational stream (Payments).
//   list-migrating— Wave-2 floor (SearchRow + warm-up) but not yet on the grouped
//                   panel; rail/featured tolerated as REPORTED DEBT, not a failure.
//   exempt        — primitives, shells, sheets, or pages out of the mobile canon
//                   scope; each carries a reason.
const MANIFEST = {
  // ── Gold-standard LIST pages (the donors + the directory expression) ──
  'MobileEmergency.jsx': { tier: 'list' },
  'MobileVisits.jsx': { tier: 'list' },
  'MobileHospitals.jsx': { tier: 'list' },
  // ── DASHBOARD ──
  'MobileToday.jsx': { tier: 'dashboard' },
  // ── LIST-migrating (Wave-2: SearchRow + warm-up landed; grouped-panel + rail
  //    removal is the next rebuild — tracked as debt, not blocked) ──
  'MobileAmbulances.jsx': { tier: 'list' },
  'MobileDoctors.jsx': { tier: 'list' },
  'MobileHealthNews.jsx': { tier: 'list' },
  'MobileInsurance.jsx': { tier: 'list' },
  'MobilePricing.jsx': { tier: 'list' },
  'MobileSubscriptions.jsx': { tier: 'list' },
  'MobileSupportTickets.jsx': { tier: 'list' },
  'MobileUsers.jsx': { tier: 'list' },
  'MobileVerification.jsx': { tier: 'list' },
  // ── Exempt (not a canon list/dashboard page) ──
  'MobileWallet.jsx': { tier: 'hybrid' },
  'MobileOrganizations.jsx': { tier: 'list' },
  'MobileDashboard.jsx': { tier: 'exempt', reason: 'legacy shell, superseded by MobileToday' },
  'MobileAnalytics.jsx': { tier: 'dashboard', reason: 'role-scoped statistics dashboard with KPI, featured metrics, and expandable report sections' },
  'MobileMap.jsx': { tier: 'exempt', reason: 'map surface — its own grammar' },
  'MobileSettings.jsx': { tier: 'dashboard', reason: 'own-account dashboard with identity hero, preferences, security, support, and session actions' },
  // ── Primitives / shells / molecules (not pages) ──
  'MobileActionRail.jsx': { tier: 'exempt', reason: 'primitive' },
  'MobileActivityRow.jsx': { tier: 'exempt', reason: 'primitive' },
  'MobileDetailIslands.jsx': { tier: 'exempt', reason: 'primitive' },
  'MobileDetailSheet.jsx': { tier: 'exempt', reason: 'primitive' },
  'MobileErrorBoundary.jsx': { tier: 'exempt', reason: 'primitive' },
  'MobileFeaturedMetric.jsx': { tier: 'exempt', reason: 'primitive (dashboard billboard)' },
  'MobileKPIStrip.jsx': { tier: 'exempt', reason: 'primitive' },
  'MobileListStates.jsx': { tier: 'exempt', reason: 'primitive' },
  'MobileMetricList.jsx': { tier: 'exempt', reason: 'primitive' },
  'MobilePageShell.jsx': { tier: 'exempt', reason: 'shell' },
  'MobileQuickNavPill.jsx': { tier: 'exempt', reason: 'primitive' },
  'MobileSecondaryMetricCard.jsx': { tier: 'exempt', reason: 'primitive (the metric rail itself)' },
  'MobileSheetActions.jsx': { tier: 'exempt', reason: 'primitive' },
  'MobileSelectionBar.jsx': { tier: 'exempt', reason: 'primitive (shared multi-select action bar)' },
  'MobileSkeleton.jsx': { tier: 'exempt', reason: 'primitive' },
};

// Strip line + block comments so a mention in prose (e.g. "NOT the GroupPanel
// pilot") can't false-pass a usage check — the exact gap the Ambulances harness
// test exposed 2026-07-10.
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '');

const has = (src, needle) => stripComments(src).includes(needle);
const hasAny = (src, needles) => { const s = stripComments(src); return needles.some((n) => s.includes(n)); };
// Rendered JSX usage of a component: `<Name` (covers `<Name>` and `<Name ...`),
// comment-stripped, so an import or a prose mention never counts as rendering it.
const hasTag = (src, name) => stripComments(src).includes(`<${name}`);
const hasAnyTag = (src, names) => { const s = stripComments(src); return names.some((n) => s.includes(`<${n}`)); };
// Declared-divergence waiver: `// grammar:<key>=<reason>` in the ORIGINAL source
// (comments intact) lets a page satisfy an anatomy requirement with a documented
// page-local equivalent (the canon requires the ANATOMY — a group-shaped skeleton,
// a search field, a hero — not necessarily the exact kit component). Strict by
// default: no waiver, no pass. The reason is the record.
const waived = (rawSrc, key) => new RegExp(`grammar:${key}=\\S`).test(rawSrc);

// FATAL rules per tier — all currently satisfied by the canon pages (green now),
// each targets a specific Hospitals-class failure so a regression reds the build.
function lintList(src) {
  const fatal = [];
  const warn = [];
  // Required LIST anatomy — checked as RENDERED JSX (`<Name`), not bare mentions.
  // Each anatomy slot accepts a `// grammar:<key>=<reason>` waiver for a documented
  // page-local equivalent (the canon requires the anatomy, not the exact component).
  if (!hasTag(src, 'MobileHeading') && !waived(src, 'heading')) fatal.push('missing MobileHeading (title + honest scope count line, §5)');
  if (!hasTag(src, 'SearchRow') && !waived(src, 'search')) fatal.push('missing canon SearchRow (§3 search field) — waive with `// grammar:search=<reason>` if rendered inline');
  if (!hasAnyTag(src, ['GroupPanel', 'GroupedList'])) fatal.push('missing grouped panel (GroupPanel/GroupedList) — a LIST renders a grouped list, not floating cards');
  if (!hasAnyTag(src, ['SkeletonGroupPanel', 'SkeletonGroupList']) && !waived(src, 'skeleton')) fatal.push('missing group-shaped skeleton (§5.2 — must mirror the panel 1:1) — waive with `// grammar:skeleton=<reason>` for a page-local group skeleton');
  if (!has(src, 'useSkeletonWarmup')) fatal.push('missing useSkeletonWarmup (§5.1 — skeleton-first on cached bottom-nav mounts)');
  if (!hasTag(src, 'UpdatingPill')) fatal.push('missing UpdatingPill/UpdatingPillRow (§5.5 — the isFetching refetch signal)');
  // POLISH / MOTION dimension (added 2026-07-10 after the reference-page archaeology:
  // these "final touches" lived only in memory and got dropped on Hospitals/Ambulances).
  // Entrance-motion-free: the shell must not fade content in on mount (§5/§7 — the fade
  // IS the "skew"; Lessons 15/16). `animatePageLoad={false}` is the switch.
  if (!has(src, 'animatePageLoad={false}')) fatal.push('missing animatePageLoad={false} (§5/§7 — the page shell must not fade content in on mount; entrance motion is the "skew")');
  // The Updating pill / loading-more spinner must consume the REAL refetch signal.
  // isBuffering (Boolean(loading)) is FALSE during a background refetch, so a pill fed
  // only by it is dead (the Hospitals/Ambulances bug found 2026-07-10). The page owns
  // `isFetching` from the query; the component must reference it.
  if (!has(src, 'isFetching') && !waived(src, 'refetch-signal')) fatal.push('missing isFetching wiring (§5.5 — the Updating pill / loading-more spinner must use the REAL refetch signal, not isBuffering alone which is dead during refetch)');
  // The grammar ban: glance tiles / billboards are DASHBOARD furniture (§5).
  if (hasTag(src, 'MobileSecondaryMetricRail')) fatal.push('LIST page carries MobileSecondaryMetricRail — glance-tile rails are DASHBOARD-only (§5); aggregates ride AnalyticsModal');
  if (hasTag(src, 'MobileFeaturedMetric')) fatal.push('LIST page carries MobileFeaturedMetric — the billboard is DASHBOARD-only (§5)');
  // Behavioral WARN: load-more must APPEND, not replace the window (Hospitals bug).
  const hasLoadMore = hasAny(src, ['useLoadMoreControl', 'onLoadMore']);
  const hasAccumulator = hasAny(src, ['accumulatorRef', 'store.byId', 'store.order']);
  if (hasLoadMore && !hasAccumulator && !waived(src, 'loadmore-append')) {
    warn.push('load-more present but NO visible accumulator (accumulatorRef) — verify rows APPEND, not replace the RQ window (Hospitals-class bug); add `// grammar:loadmore-append=<mechanism>` to waive');
  }
  return { fatal, warn };
}

function lintDashboard(src) {
  const fatal = [];
  const warn = [];
  if (!hasTag(src, 'MobileHero') && !waived(src, 'hero')) fatal.push('missing MobileHero (signal-first hero, §5 DASHBOARD) — waive with `// grammar:hero=<reason>` if rendered inline');
  if (hasTag(src, 'SearchRow')) fatal.push('DASHBOARD carries SearchRow — dashboards do not search/filter a list (§5)');
  if (hasTag(src, 'MobileKPIStrip')) fatal.push('DASHBOARD carries MobileKPIStrip filter chips — dashboard tiles NAVIGATE, they never filter (§5)');
  if (!has(src, 'animatePageLoad={false}')) fatal.push('missing animatePageLoad={false} (§5/§7 — no mount entrance fade)');
  return { fatal, warn };
}

function lintHybrid(src) {
  const fatal = [];
  const warn = [];
  if (!hasTag(src, 'MobileHeading') && !waived(src, 'heading')) fatal.push('missing MobileHeading (HYBRID page identity owner)');
  if (!hasTag(src, 'MobileKPIStrip')) fatal.push('missing MobileKPIStrip (HYBRID finance KPIs)');
  if (!has(src, 'interactive={false}')) fatal.push('HYBRID finance KPIs must not impersonate source tabs');
  if (!has(src, 'role="tablist"')) fatal.push('missing separate source tablist below finance KPIs');
  if (!hasAnyTag(src, ['GroupPanel', 'GroupedList'])) fatal.push('missing grouped activity feed');
  if (!hasAnyTag(src, ['SkeletonGroupPanel', 'SkeletonGroupList']) && !waived(src, 'skeleton')) fatal.push('missing group-shaped feed skeleton');
  if (!has(src, 'useSkeletonWarmup')) fatal.push('missing useSkeletonWarmup');
  if (!has(src, 'isFetching')) fatal.push('missing background-refetch signal');
  if (!hasTag(src, 'MobileDetailSheet')) fatal.push('missing activity detail sheet');
  if (hasTag(src, 'SearchRow')) fatal.push('HYBRID carries SearchRow without a proved server-search contract');
  if (!has(src, 'animatePageLoad={false}')) fatal.push('missing animatePageLoad={false}');
  if (hasAny(src, ['useLoadMoreControl', 'onLoadMore']) && !waived(src, 'loadmore-append')) {
    fatal.push('load-more needs an explicit growing-window/accumulator owner');
  }
  return { fatal, warn };
}

function lintListMigrating(src) {
  const fatal = [];
  const warn = [];
  // Wave-2 floor: SearchRow + warm-up must be present (they were the migration).
  if (!hasTag(src, 'SearchRow')) fatal.push('list-migrating page lost its canon SearchRow');
  if (!has(src, 'useSkeletonWarmup')) fatal.push('list-migrating page lost useSkeletonWarmup');
  // Debt report (non-fatal): the rebuild to grouped-panel + rail removal is pending.
  if (hasTag(src, 'MobileSecondaryMetricRail')) warn.push('DEBT: still carries MobileSecondaryMetricRail (glance-tile rail) — remove on the grouped-panel rebuild');
  if (hasTag(src, 'MobileFeaturedMetric')) warn.push('DEBT: still carries MobileFeaturedMetric (billboard) — remove on the grouped-panel rebuild');
  if (!hasAnyTag(src, ['GroupPanel', 'GroupedList'])) warn.push('DEBT: not yet on the grouped panel (renders floating MobileMetricRow cards)');
  return { fatal, warn };
}

// ── Bare slash-opacity guard (added 2026-07-10 after the invisible-tint bug) ──
// Tailwind's bare color-opacity modifier (`bg-emerald-500/12`, `text-cyan-700/14`)
// ONLY compiles when the numeric value N exists in theme.opacity. The DEFAULT scale is
// {0,5,10,20,25,30,40,50,60,70,75,80,90,95,100}; ANY non-scale bare value silently
// compiles to TRANSPARENT — the tinted surface (avatar orbs, status discs, destructive
// buttons) never renders while the icon/text color still shows, so the loss is invisible.
// We extended theme.extend.opacity in tailwind.config.js (12/14/15/34/...); this guard
// bans any FUTURE non-scale bare value so a tint can't die silently again. Bracket
// arbitrary values (`/[0.12]`) always compile and are ignored.
const DEFAULT_OPACITY_SCALE = [0, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 100];

// Parse the keys under theme.extend.opacity from the config's OBJECT LITERAL (not
// require() — requiring tailwind.config.js would pull the full plugin graph). The opacity
// block carries no nested braces, so a single-level brace match is exact.
function readConfiguredOpacity(configPath) {
  if (!fs.existsSync(configPath)) return [];
  const block = stripComments(fs.readFileSync(configPath, 'utf8')).match(/opacity\s*:\s*\{([^}]*)\}/);
  if (!block) return [];
  const keys = [];
  const keyRe = /(?:^|[,{\s])(\d+)\s*:/g;
  let m;
  while ((m = keyRe.exec(block[1])) !== null) keys.push(Number(m[1]));
  return keys;
}

// Recursively collect *.jsx under a dir (mobile + pages are flat today, but a walk
// future-proofs the `**/*.jsx` scope).
function collectJsx(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...collectJsx(full));
    else if (/\.jsx$/.test(ent.name)) out.push(full);
  }
  return out;
}

// FATAL check: scan for bare slash-opacity color tokens whose numeric value is NOT in the
// VALID set (DEFAULT scale ∪ configured extend.opacity). Bracket values (`/[0.12]`) never
// match the regex (a `[` follows the slash), so they're implicitly ignored. Returns
// formatted `file:line  class  — message` lines.
function checkBareOpacity(scanDirs, configPath) {
  const valid = new Set([...DEFAULT_OPACITY_SCALE, ...readConfiguredOpacity(configPath)]);
  const tokenRe = /\b(bg|text|border|ring|fill|stroke|from|via|to)-[a-z]+(?:-[0-9]+)?\/([0-9]{1,3})\b/g;
  const root = path.join(__dirname, '..');
  const fatal = [];
  for (const dir of scanDirs) {
    for (const file of collectJsx(dir)) {
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      const rel = path.relative(root, file).replace(/\\/g, '/');
      lines.forEach((line, i) => {
        let m;
        tokenRe.lastIndex = 0;
        while ((m = tokenRe.exec(line)) !== null) {
          if (valid.has(Number(m[2]))) continue;
          fatal.push(`${rel}:${i + 1}  ${m[0]}  — non-scale bare opacity compiles to transparent — use a value in theme.opacity, add it to tailwind.config.js theme.extend.opacity, or use bracket /[0.NN]`);
        }
      });
    }
  }
  return fatal;
}

function main() {
  const strict = process.argv.includes('--strict');
  const files = fs.readdirSync(MOBILE_DIR).filter((f) => /^Mobile.*\.jsx$/.test(f)).sort();

  let fatalCount = 0;
  let warnCount = 0;
  const unclassified = [];

  // Global motion-token canon (one source of truth for every page's press/spring/ease).
  // The reference-page archaeology (2026-07-10) found MOBILE_DESIGN_SYSTEM.md still
  // claims mobileMotion is off-canon [0.22,1,0.36,1]; the SOURCE is aligned. Pin the
  // source so a regression (or the stale doc's value creeping back) reds the build.
  const motionPath = path.join(MOBILE_DIR, 'mobileMotion.js');
  if (fs.existsSync(motionPath)) {
    const motion = fs.readFileSync(motionPath, 'utf8');
    const motionFatal = [];
    if (!motion.includes('0.21, 0.47, 0.32, 0.98')) motionFatal.push('mobileEasing is not the canon Apple ease [0.21, 0.47, 0.32, 0.98]');
    if (!/stiffness:\s*168/.test(motion) || !/damping:\s*30/.test(motion)) motionFatal.push('mobileSpring is not the canon {stiffness:168, damping:30, mass:0.9}');
    if (!/control:\s*\{\s*scale:\s*0\.96/.test(motion) || !/card:\s*\{\s*scale:\s*0\.988/.test(motion)) motionFatal.push('press ladder is not the canon control 0.96 / card 0.988');
    if (motionFatal.length) {
      console.log('\nmobileMotion.js  [motion tokens]');
      motionFatal.forEach((m) => { console.log(`  ✗ FATAL  ${m}`); fatalCount++; });
    }
  }

  // Dock / FAB completeness (added 2026-07-10; DERIVED not hand-listed 2026-07-10b — the
  // /users lone-pill escaped the old hand-list). A route SUPPRESSES the generic context FAB
  // two ways: (a) it is in DynamicBottomBar's `routeOwnsAction` chain, OR (b) its page calls
  // `usePageShell({ hideFab: true })`. If a suppressing route then provides NO
  // `getRouteOwnedMobileAction` branch AND is not exempted, the dock collapses to a lone
  // centered pill (the Ambulances/Users bug). We derive the FULL suppressing set from BOTH
  // sources so a NEW hideFab page (or a NEW routeOwnsAction entry) can't slip through the way
  // the hand-list `ADMITTED_FAB_ROUTES` let /users through. Every suppressing route must own a
  // branch (real work or an honest gate) OR be in FAB_EXEMPT_ROUTES with a reason.
  //
  // FAB_EXEMPT_ROUTES — routes that legitimately own NO dock FAB action. Each carries a reason;
  // removing a route here (or its branch) reds the build. Kept honest: only non-list surfaces
  // and fail-closed pages whose whole filter grammar is already inline get an exemption.
  const FAB_EXEMPT_ROUTES = {
    '/map': 'map surface — full-bleed interactive canvas with its own control grammar (layers/refiner); no list to filter, no create (MobileMap is grammar-exempt), so no dock FAB',
    '/settings': 'own-account dashboard — no create/filter/review dock action; profile and security actions stay route-owned',
    '/insurance': 'read-only on desktop right now — InsuranceManagementPage shows only a "Read-only" marker, no create (INSURANCE_COMMAND_AUTHORITY_DECISION 2026-07-07: no create/edit/delete/verify receiver); a filter FAB would only duplicate the SearchRow in-page filter, so the honest mirror is a lone pill. Add a create branch when a policy receiver is proved.',
  };
  const dockPath = path.join(__dirname, '..', 'src', 'components', 'navigation', 'DynamicBottomBar.jsx');
  const actionOwnershipPath = path.join(__dirname, '..', 'src', 'config', 'routeActionOwnership.js');
  const appPath = path.join(__dirname, '..', 'src', 'App.js');
  const pagesDir = path.join(__dirname, '..', 'src', 'components', 'pages');
  if (fs.existsSync(dockPath)) {
    const dock = fs.readFileSync(dockPath, 'utf8');

    // The DERIVED suppressing set (both sources feed one Set).
    const suppress = new Set();

    // (a) Parse the shared shell-action registry consumed by the bottom bar, desktop
    // FAB, and mobile menu. Keeping the derivation here means a new owner cannot
    // suppress generic actions without also passing this completeness gate.
    const ownership = fs.existsSync(actionOwnershipPath)
      ? fs.readFileSync(actionOwnershipPath, 'utf8')
      : '';
    const prefixesMatch = ownership.match(/ROUTE_ACTION_PREFIXES\s*=\s*\[([\s\S]*?)\];/);
    const prefixesBlock = prefixesMatch ? prefixesMatch[1] : '';
    let sm;
    const routeStringRe = /'([^']+)'/g;
    while ((sm = routeStringRe.exec(prefixesBlock)) !== null) suppress.add(sm[1]);
    if (/pathname\s*===\s*'\/'/.test(ownership)) suppress.add('/');

    // (b) Pages calling `usePageShell({ ... hideFab: true ... })` → their route via App.js.
    //     Build component→route from `<Route path="/x" element={ ... <PageComponent ... }>`,
    //     then map each hideFab page file (basename === exported component) to its route.
    const compToRoute = {};
    if (fs.existsSync(appPath)) {
      const app = fs.readFileSync(appPath, 'utf8');
      const routeRe = /<Route\s+path="([^"]+)"\s+element=\{([^}]+)\}/g;
      let rm;
      while ((rm = routeRe.exec(app)) !== null) {
        const routePath = rm[1];
        let cm;
        const compRe = /<([A-Z]\w+)/g;
        while ((cm = compRe.exec(rm[2])) !== null) {
          if (cm[1] === 'ProtectedRoute') continue; // guard wrapper, not the page
          compToRoute[cm[1]] = routePath;
        }
      }
    }
    const hideFabRe = /usePageShell\(\{[^}]*hideFab:\s*true[^}]*\}\)/;
    const unmappedHideFab = [];
    if (fs.existsSync(pagesDir)) {
      for (const file of fs.readdirSync(pagesDir)) {
        if (!/\.jsx$/.test(file) || /\.test\./.test(file)) continue;
        const src = fs.readFileSync(path.join(pagesDir, file), 'utf8');
        if (!hideFabRe.test(src)) continue;
        const comp = file.replace(/\.jsx$/, '');
        const route = compToRoute[comp];
        if (route) suppress.add(route);
        // A hideFab page with no direct <Route> (e.g. TodayHome renders under BentoHome at
        // '/') is expected — '/' is already captured via routeOwnsAction. Only report an
        // unmapped hideFab page whose route ISN'T otherwise in the suppress set.
        else unmappedHideFab.push(comp);
      }
    }

    // Which suppressing routes carry a getRouteOwnedMobileAction branch? `/` is special-cased
    // (its branch is `pathname === '/'`, not a `startsWith`).
    const fnStart = dock.indexOf('getRouteOwnedMobileAction = (');
    const fnBody = fnStart >= 0 ? dock.slice(fnStart) : '';
    const hasBranch = (r) => (r === '/'
      ? /pathname\s*===\s*'\/'/.test(fnBody)
      : fnBody.includes(`startsWith('${r}')`));

    const dockFatal = [...suppress]
      .filter((r) => !hasBranch(r) && !(r in FAB_EXEMPT_ROUTES))
      .sort();
    if (dockFatal.length) {
      console.log('\nDynamicBottomBar.jsx  [dock/FAB]');
      dockFatal.forEach((r) => {
        console.log(`  ✗ FATAL  ${r} suppresses the generic context FAB (routeOwnsAction and/or usePageShell hideFab:true) but has NO getRouteOwnedMobileAction branch and is not in FAB_EXEMPT_ROUTES -> the dock collapses to a lone centered pill. Add a startsWith('${r}') branch (filter / review / to:-navigate, gated by canReachRoute) or exempt it in FAB_EXEMPT_ROUTES with a reason.`);
        fatalCount++;
      });
    }
    // A hideFab page we couldn't map to a route AND whose route we never derived is a blind
    // spot in the mapping heuristic — surface it (non-fatal) so the derivation stays honest.
    const trulyUnmapped = unmappedHideFab.filter((c) => c !== 'TodayHome');
    if (trulyUnmapped.length) {
      console.log('\nDynamicBottomBar.jsx  [dock/FAB]  (mapping note)');
      trulyUnmapped.forEach((c) => { console.log(`  ⚠ warn   ${c}.jsx uses usePageShell({ hideFab:true }) but no <Route> maps to it — verify its route is covered by the suppress derivation`); warnCount++; });
    }
  }

  // Bare slash-opacity guard (see checkBareOpacity above). Scans mobile + pages JSX
  // against the DEFAULT scale ∪ tailwind.config.js theme.extend.opacity keys.
  const opacityFatal = checkBareOpacity(
    [MOBILE_DIR, path.join(__dirname, '..', 'src', 'components', 'pages')],
    path.join(__dirname, '..', 'tailwind.config.js'),
  );
  if (opacityFatal.length) {
    console.log('\n[bare-opacity]  non-scale bare opacity → transparent tint');
    opacityFatal.forEach((m) => { console.log(`  ✗ FATAL  ${m}`); fatalCount++; });
  }

  for (const file of files) {
    const entry = MANIFEST[file];
    if (!entry) { unclassified.push(file); continue; }
    if (entry.tier === 'exempt') continue;

    const src = fs.readFileSync(path.join(MOBILE_DIR, file), 'utf8');
    const linter = entry.tier === 'list' ? lintList
      : entry.tier === 'dashboard' ? lintDashboard
        : entry.tier === 'hybrid' ? lintHybrid
          : lintListMigrating;
    const { fatal, warn } = linter(src);

    if (fatal.length || warn.length) {
      console.log(`\n${file}  [${entry.tier}]`);
      fatal.forEach((m) => { console.log(`  ✗ FATAL  ${m}`); fatalCount++; });
      warn.forEach((m) => { console.log(`  ⚠ warn   ${m}`); warnCount++; });
    }
  }

  if (unclassified.length) {
    console.log('\nUNCLASSIFIED mobile pages (add a MANIFEST entry — a page cannot ship without a grammar declaration):');
    unclassified.forEach((f) => console.log(`  ✗ FATAL  ${f}`));
    fatalCount += unclassified.length;
  }

  console.log(`\n[mobile-grammar] ${files.length} file(s) · ${fatalCount} fatal · ${warnCount} warning(s)${strict ? ' (--strict: warnings fatal)' : ''}`);
  const failed = fatalCount > 0 || (strict && warnCount > 0);
  if (!failed) console.log('[mobile-grammar] OK — every page conforms to its declared grammar tier.');
  process.exit(failed ? 1 : 0);
}

main();
