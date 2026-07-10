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
  'MobileAmbulances.jsx': { tier: 'list-migrating' },
  'MobileDoctors.jsx': { tier: 'list-migrating' },
  'MobileHealthNews.jsx': { tier: 'list-migrating' },
  'MobileInsurance.jsx': { tier: 'list-migrating' },
  'MobilePricing.jsx': { tier: 'list-migrating' },
  'MobileSubscriptions.jsx': { tier: 'list-migrating' },
  'MobileSupportTickets.jsx': { tier: 'list-migrating' },
  'MobileUsers.jsx': { tier: 'list-migrating' },
  'MobileVerification.jsx': { tier: 'list-migrating' },
  // ── Exempt (not a canon list/dashboard page) ──
  'MobileWallet.jsx': { tier: 'exempt', reason: 'pre-canon, not yet rebuilt (mobile lane queue)' },
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
  'MobileSkeleton.jsx': { tier: 'exempt', reason: 'primitive' },
};

const has = (src, needle) => src.includes(needle);
const hasAny = (src, needles) => needles.some((n) => src.includes(n));

// FATAL rules per tier — all currently satisfied by the canon pages (green now),
// each targets a specific Hospitals-class failure so a regression reds the build.
function lintList(src) {
  const fatal = [];
  const warn = [];
  // Required LIST anatomy.
  if (!has(src, 'MobileHeading')) fatal.push('missing MobileHeading (title + honest scope count line, §5)');
  if (!hasAny(src, ['SearchRow'])) fatal.push('missing canon SearchRow (§3 search field)');
  if (!hasAny(src, ['GroupPanel', 'GroupedList'])) fatal.push('missing grouped panel (GroupPanel/GroupedList) — a LIST renders a grouped list, not floating cards');
  if (!hasAny(src, ['SkeletonGroupPanel', 'SkeletonGroupList'])) fatal.push('missing group-shaped skeleton (§5.2 — must mirror the panel 1:1 for replace-in-place)');
  if (!has(src, 'useSkeletonWarmup')) fatal.push('missing useSkeletonWarmup (§5.1 — skeleton-first on cached bottom-nav mounts)');
  if (!hasAny(src, ['UpdatingPill'])) fatal.push('missing UpdatingPill/UpdatingPillRow (§5.5 — the isFetching refetch signal)');
  // The grammar ban: glance tiles / billboards are DASHBOARD furniture (§5).
  if (has(src, 'MobileSecondaryMetricRail')) fatal.push('LIST page carries MobileSecondaryMetricRail — glance-tile rails are DASHBOARD-only (§5); aggregates ride AnalyticsModal');
  if (has(src, 'MobileFeaturedMetric')) fatal.push('LIST page carries MobileFeaturedMetric — the billboard is DASHBOARD-only (§5)');
  // Behavioral WARN: load-more must APPEND, not replace the window (Hospitals bug).
  const hasLoadMore = hasAny(src, ['useLoadMoreControl', 'onLoadMore']);
  const hasAccumulator = hasAny(src, ['accumulatorRef', 'store.byId', 'store.order']);
  const waived = has(src, 'grammar:loadmore-append');
  if (hasLoadMore && !hasAccumulator && !waived) {
    warn.push('load-more present but NO visible accumulator (accumulatorRef) — verify rows APPEND, not replace the RQ window (Hospitals-class bug); add `// grammar:loadmore-append=<mechanism>` to waive');
  }
  return { fatal, warn };
}

function lintDashboard(src) {
  const fatal = [];
  const warn = [];
  if (!has(src, 'MobileHero')) fatal.push('missing MobileHero (signal-first hero, §5 DASHBOARD)');
  if (has(src, 'SearchRow')) fatal.push('DASHBOARD carries SearchRow — dashboards do not search/filter a list (§5)');
  if (has(src, 'MobileKPIStrip')) fatal.push('DASHBOARD carries MobileKPIStrip filter chips — dashboard tiles NAVIGATE, they never filter (§5)');
  return { fatal, warn };
}

function lintListMigrating(src) {
  const fatal = [];
  const warn = [];
  // Wave-2 floor: SearchRow + warm-up must be present (they were the migration).
  if (!has(src, 'SearchRow')) fatal.push('list-migrating page lost its canon SearchRow');
  if (!has(src, 'useSkeletonWarmup')) fatal.push('list-migrating page lost useSkeletonWarmup');
  // Debt report (non-fatal): the rebuild to grouped-panel + rail removal is pending.
  if (has(src, 'MobileSecondaryMetricRail')) warn.push('DEBT: still carries MobileSecondaryMetricRail (glance-tile rail) — remove on the grouped-panel rebuild');
  if (has(src, 'MobileFeaturedMetric')) warn.push('DEBT: still carries MobileFeaturedMetric (billboard) — remove on the grouped-panel rebuild');
  if (!hasAny(src, ['GroupPanel', 'GroupedList'])) warn.push('DEBT: not yet on the grouped panel (renders floating MobileMetricRow cards)');
  return { fatal, warn };
}

function main() {
  const strict = process.argv.includes('--strict');
  const files = fs.readdirSync(MOBILE_DIR).filter((f) => /^Mobile.*\.jsx$/.test(f)).sort();

  let fatalCount = 0;
  let warnCount = 0;
  const unclassified = [];

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
