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
 * Canon: docs/design-system/MOBILE_DESIGN_SYSTEM.md §5 (LIST vs DASHBOARD + the
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
  'MobileHealthNews.jsx': { tier: 'list-migrating' },
  'MobileInsurance.jsx': { tier: 'list-migrating' },
  'MobilePricing.jsx': { tier: 'list-migrating' },
  'MobileSubscriptions.jsx': { tier: 'list-migrating' },
  'MobileSupportTickets.jsx': { tier: 'list-migrating' },
  'MobileUsers.jsx': { tier: 'list-migrating' },
  'MobileVerification.jsx': { tier: 'list' },
  // ── Exempt (not a canon list/dashboard page) ──
  'MobileWallet.jsx': { tier: 'dashboard' },
  'MobileOrganizations.jsx': { tier: 'exempt', reason: 'gate-blocked (Page 15 not admitted); no canon composition yet' },
  'MobileDashboard.jsx': { tier: 'exempt', reason: 'legacy shell, superseded by MobileToday' },
  'MobileAnalytics.jsx': { tier: 'exempt', reason: 'analytics report surface (desktop domain), not a list/dashboard' },
  'MobileMap.jsx': { tier: 'exempt', reason: 'map surface — its own grammar' },
  'MobileSettings.jsx': { tier: 'exempt', reason: 'settings form, not a data list' },
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

  // Dock / FAB completeness (added 2026-07-10 — the user's point: "isn't the bottom bar +
  // FAB part of the harness?"). A route in DynamicBottomBar's `routeOwnsAction` list
  // SUPPRESSES the generic context FAB; if it then provides NO `getRouteOwnedMobileAction`
  // branch, the dock collapses to a lone centered pill (the Ambulances bug). Every
  // ADMITTED list route must carry a route-owned FAB action (real work or an honest gate).
  const dockPath = path.join(__dirname, '..', 'src', 'components', 'navigation', 'DynamicBottomBar.jsx');
  if (fs.existsSync(dockPath)) {
    const dock = fs.readFileSync(dockPath, 'utf8');
    const fnStart = dock.indexOf('getRouteOwnedMobileAction = (');
    const fnBody = fnStart >= 0 ? dock.slice(fnStart) : '';
    // /verification (Approvals) added 2026-07-10: it was in routeOwnsAction with NO branch
    // and this list omitted it, so the collapsed-lone-pill shipped unflagged. Approvals is
    // a first-class admin/org_admin `list`-tier surface and must own a dock action.
    const ADMITTED_FAB_ROUTES = ['/emergencies', '/visits', '/hospitals', '/ambulances', '/doctors', '/support-tickets', '/verification'];
    const dockFatal = ADMITTED_FAB_ROUTES.filter((r) => !fnBody.includes(`startsWith('${r}')`));
    if (dockFatal.length) {
      console.log('\nDynamicBottomBar.jsx  [dock/FAB]');
      dockFatal.forEach((r) => { console.log(`  ✗ FATAL  ${r} is in routeOwnsAction but has NO getRouteOwnedMobileAction branch -> the dock collapses to a lone pill (left-pill + FAB grammar broken)`); fatalCount++; });
    }
  }

  for (const file of files) {
    const entry = MANIFEST[file];
    if (!entry) { unclassified.push(file); continue; }
    if (entry.tier === 'exempt') continue;

    const src = fs.readFileSync(path.join(MOBILE_DIR, file), 'utf8');
    const linter = entry.tier === 'list' ? lintList
      : entry.tier === 'dashboard' ? lintDashboard
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
