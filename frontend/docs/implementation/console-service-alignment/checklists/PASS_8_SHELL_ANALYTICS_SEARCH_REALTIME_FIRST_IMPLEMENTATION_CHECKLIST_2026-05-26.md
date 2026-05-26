# Pass 8 Shell Analytics Search And Realtime First Implementation Checklist - 2026-05-26

## Status

Implementation-control checklist only. This document does not authorize domain CRUD, export file generation, report generation, realtime channel expansion, trend regeneration, notification writes/deletes, preference writes, service-worker behavior changes, database migration, cleanup, seed, reset, Edge Function invocation, Storage mutation, or production data repair.

Pass 8 closes the shell. It must consume domain projections from Passes 1-7 and refuse mock, fallback, stale, unauthorized, partial or unowned data as operational truth.

## Source Chain Read Before Editing

Read these docs first:

- `frontend/docs/implementation/console-service-alignment/passes/PASS_8_ANALYTICS_SEARCH_REALTIME_FEEDBACK_FLOW_SUBPLAN_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/stages/STAGE_6_IMPLEMENTATION_PASS_PLAN_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/services/STAGE_5_FULL_SERVICE_COVERAGE_AUDIT_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/contracts/CARE_CONTENT_ANALYTICS_CONTRACT_CHART_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/contracts/IDENTITY_VISITS_SUBSCRIBERS_CONTRACT_CHART_2026-05-24.md`

Then re-run mounted-source scans:

```powershell
rg -n "PageDataContext|Analytics|BentoHome|MobileDashboard|MobileAnalytics|AnalyticsModal|QuickSearch|NotificationCenter|ErrorBoundary|SmartFooter|ContextPanel|DashboardPanel|AnalyticsPanel|PWA|FeedbackProvider|PWADebugTracker|NetworkStatus|useNetworkStatus|HospitalFleetManager|SchemaDebugger|QueryClientProvider" frontend/src
rg -n "mock|fallback|default|Export Report|Generate Analytics Report|openAnalyticsModal|PWADebugTracker|console\.error|serviceWorkerRegistration\.register|useMockData|successRate: 95|12\.0m|patient satisfaction|Free Tier|Upgrade|channel\\(|subscribe\\(|searchAll|trending|notification|LIVE SYNC" frontend/src
```

## Runtime Files In Scope

Primary shell and analytics files:

- `frontend/src/contexts/PageDataContext.jsx`
- `frontend/src/components/pages/BentoHome.jsx`
- `frontend/src/components/pages/Analytics.jsx`
- `frontend/src/components/pages/Overview.jsx`
- `frontend/src/components/mobile/MobileDashboard.jsx`
- `frontend/src/components/mobile/MobileAnalytics.jsx`
- `frontend/src/components/context/DashboardPanel.jsx`
- `frontend/src/components/context/AnalyticsPanel.jsx`
- `frontend/src/components/modals/AnalyticsModal.jsx`
- `frontend/src/services/analyticsService.js`
- `frontend/src/hooks/useAnalytics.js`
- `frontend/src/services/activityService.js`
- `frontend/src/hooks/useActivity.js`

Search/realtime/notifications/settings:

- `frontend/src/components/navigation/QuickSearch.jsx`
- `frontend/src/services/searchService.js`
- `frontend/src/services/searchEventsService.js`
- `frontend/src/services/searchHistoryService.js`
- `frontend/src/services/searchSelectionsService.js`
- `frontend/src/services/searchAnalyticsService.js`
- `frontend/src/services/trendingTopicsService.js`
- `frontend/src/services/analyticsAutomationService.js`
- `frontend/src/components/common/NotificationCenter.jsx`
- `frontend/src/components/navigation/NotificationCenter.jsx`
- `frontend/src/services/notificationService.js`
- `frontend/src/services/preferencesService.js`
- `frontend/src/components/pages/SettingsPage.jsx`
- `frontend/src/components/mobile/MobileSettings.jsx`

Shell utilities and diagnostics:

- `frontend/src/App.js`
- `frontend/src/index.js`
- `frontend/src/serviceWorkerRegistration.js`
- `frontend/src/contexts/PWAContext.jsx`
- `frontend/src/contexts/FeedbackContext.jsx`
- `frontend/src/components/pwa/InstallPrompt.jsx`
- `frontend/src/components/pwa/OfflineIndicator.jsx`
- `frontend/src/components/pwa/UpdateNotification.jsx`
- `frontend/src/components/common/ErrorBoundary.jsx`
- `frontend/src/components/map/ErrorBoundary.jsx`
- `frontend/src/utils/errorHandler.js`
- `frontend/src/components/navigation/SmartFooter.jsx`
- `frontend/src/components/mobile/PullToRefresh.jsx`
- `frontend/src/components/mobile/useStableList.js`
- `frontend/src/components/mobile/useLoadMoreControl.js`
- `frontend/src/lib/queryClient.js`
- `frontend/src/components/common/NetworkStatus.jsx`
- `frontend/src/hooks/useNetworkStatus.js`
- `frontend/src/components/dashboard/HospitalFleetManager.jsx`
- `frontend/src/components/dev/SchemaDebugger.jsx`

## Explicitly Excluded

Do not include these in the first implementation slice:

- Domain data repair for emergency, wallet, facility, identity, provider ops, visits, care/content or subscribers.
- Export CSV/report file generation or delivery.
- Trend regeneration RPCs or analytics automation runs.
- Realtime channel creation or widening.
- Notification create/delete/cross-user admin.
- Preference writes.
- Service worker registration behavior changes beyond truthful comments/debug rendering.
- New global fetch interception through `NetworkStatus`/`useNetworkStatus`.
- Database, Edge, Storage or app repo changes.

## First Safe Slice

The first implementation package is shell truth/readiness only.

Allowed:

- Add or identify a shell projection boundary that reports domain readiness rather than owning domain data.
- Disable or relabel analytics exports/reports when any included domain slice is fallback, unauthorized, incomplete, demo or unavailable.
- Remove deterministic fallback/fixed operational claims from dashboard, mobile dashboard, analytics and shared analytics modal.
- Label activity feed as recent preview and minimize sensitive fields.
- Make QuickSearch show partial/error/denied/stale states rather than collapsing every failure to no results.
- Remove or neutralize unsupported `LIVE SYNC ACTIVE`, hard-coded debug tracker, static plan/upgrade, and empty patient-action handlers.
- Replace raw browser diagnostics and raw error toast copy with redacted, operator-safe failure states where touched.
- Keep dormant mock/diagnostic components excluded or explicitly retire them.
- Repair visible mojibake in touched shell files.

Blocked:

- Any export, write, trend, realtime, preference, notification or service-worker runtime behavior listed in the excluded section.

## Projection Contract

Create a stable shell projection with these slices:

| Slice | Required fields |
| --- | --- |
| `domainProjectionStatus` | `domain`, `ownerPass`, `ownerReady`, `source`, `scope`, `readiness`, `degradedReason`. |
| `dashboardMetricReadiness` | `metricKey`, `sourceOwner`, `actorScope`, `timeWindow`, `fallbackState`, `freshness`, `renderLabel`. |
| `analyticsReadiness` | `route`, `actorRole`, `includedDomains`, `excludedDomains`, `partialDomains`, `unavailableDomains`, `comparisonWindow`. |
| `analyticsExportReadiness` | `canDownload`, `datasetScope`, `fieldAllowlist`, `redactionState`, `completeness`, `disabledReason`. |
| `searchReadiness` | `querySequenceId`, `category`, `allowedFields`, `matchedField`, `resultCap`, `state`, `staleGuard`. |
| `realtimeOwnershipRegistry` | `tableOrChannel`, `domainOwner`, `invalidationTarget`, `cleanupProof`, `scopedExceptionReason`. |
| `notificationPreferenceReadiness` | `readState`, `emptyState`, `failedState`, `actionMetadataState`, `settingReceiver`, `disabledReason`. |
| `utilityFeedbackReadiness` | `pwaBuildSource`, `installState`, `updateState`, `offlineState`, `feedbackPreferenceState`, `reducedMotionState`, `diagnosticsRedactionState`. |

Required command readiness names:

- `canExportAnalytics`
- `canExportDashboard`
- `canOpenDashboardReport`
- `canUseGlobalSearch`
- `canRecordSearchTelemetry`
- `canRegenerateTrends`
- `canUseRealtimeChannel`
- `canUpdateNotificationPreference`
- `canDismissNotification`
- `canInstallPWA`
- `canTriggerFeedback`
- `canShowDebugTracker`
- `canShowPatientDashboardAction`

Every unsafe command defaults to `false`.

## Surface Disposition Matrix

| Surface | Retain first | Disable or relabel first | Receiver/proof before enabling |
| --- | --- | --- | --- |
| `PageDataContext` | Shell composition only. | Mock/fallback domain truth and broad global channels as durable owners. | Domain projections from Passes 1-7 and invalidation ownership. |
| Dashboard/Bento home | Layout and navigation. | Fixed satisfaction/response/trend/performance claims; fallback metrics as measured values. | Source-labelled domain projection with scope, window and freshness. |
| `MobileDashboard` | Mobile dashboard shell. | Empty patient-only handlers, fixed/fallback live labels, corrupted copy. | Canonical patient-app handoff or unavailable state with immediate feedback. |
| `/analytics` and `MobileAnalytics` | Analytics route shell. | CSV/report export, fixed trend language, subscriber slice for non-admin roles. | Role-safe analytics projection and export dataset contract. |
| `AnalyticsModal` | Generic renderer only. | Default values like fallback response time; generic confidence labels. | Caller-supplied typed projection with unavailable semantics. |
| `QuickSearch` | Search UI and scoped categories. | All-or-empty failure, stale responses, sensitive fields without per-role projection. | Category-level result state, field allowlist, sequence guard and privacy policy. |
| Trending/automation | Read-only unavailable labels. | Stub success or regeneration as production action. | RPC/view proof and actor scope. |
| Notification center | Own-user bounded read shell. | Failed read as empty, raw user/backend diagnostics, hard-coded settings toggle. | Typed notification read states and preference receiver. |
| Settings plan/preferences | Own-user settings layout. | Static Free Tier/Upgrade and unwired notification toggle. | Billing/subscription/preference receiver. |
| PWA/feedback/debug | Existing install/offline/update/feedback shells. | Hard-coded debug badge, sound/haptic behavior without preference/reduced-motion policy. | Build metadata and accessibility/preference projection. |
| Error boundaries/error handler | Visible recovery states. | Production raw console monitoring and raw backend/Auth/Storage/Edge messages in toasts. | Redacted diagnostics boundary and operator-safe copy. |
| Smart footer/mobile list feedback | Shell footer and refresh controls. | Unsupported success health copy or animated feedback as completeness proof. | Domain freshness/boundedness/error states. |
| Dormant components | Keep excluded. | Mounting hard-coded fleet/export/debug/network components. | Owned projections and redacted diagnostics policy. |
| Query/cache foundation | Keep as installed foundation. | Claiming TanStack Query ownership without consumers. | Domain query migration with invalidation/retry/freshness policy. |

## Field And Parser Gates

Run before implementation:

```powershell
rg -n "mock|fallback|default|successRate|response time|patient satisfaction|Export|Report|CSV|searchAll|Promise\.all|channel\\(|subscribe\\(|console\.error|toast\.error|notification|preferences|demo_mode|Free Tier|Upgrade|PWADebugTracker|LIVE SYNC|JSON\.stringify|window\.fetch" frontend/src
```

Rules:

- Never display fallback/mock/fixed values as measured operational truth.
- Never export a dataset containing fallback, unauthorized, incomplete or demo slices unless the file itself records that state and export is authorized.
- Never treat PageDataContext as the durable domain owner after pass-specific projections exist.
- Never treat denied/failed search categories as ordinary no results.
- Never collapse notification read failure into empty state.
- Never present realtime subscription success as source freshness or completeness.
- Never introduce global fetch interception as shell reliability.
- Never use raw console/error toast output as production monitoring or operator feedback.

## App Consequences

Pass 8 affects ecosystem trust:

- Dashboard and analytics claims feed sponsor, operator and potentially investor narratives; fake metrics are not harmless UI.
- Search can expose profile emails, clinical/operational records and protected categories if role projection is loose.
- Realtime ownership affects emergency, payment, facility, provider, visit, care and subscriber truth across the console.
- Notification action metadata can carry cash approval, emergency, support or visit transitions; compatibility fallbacks must not lose action context silently.
- PWA/offline/update/feedback behavior applies on public and authenticated routes.
- Activity feed can expose pickup addresses and provider identity metadata unless minimized.

## Implementation Packages

### Package 8.1 - Shell Truth And False Export Removal

Allowed:

- Disable analytics/dashboard report and export entry points without dataset proof.
- Remove fixed/fallback metric claims and unsupported performance language.
- Label activity as bounded recent preview.
- Remove empty patient-action handlers or render unavailable handoff.
- Neutralize unsupported footer/debug/static plan copy.
- Remove raw browser diagnostics where touched.

Acceptance:

- No route displays mock/fallback/fixed values as measured production truth.
- No analytics/export/report action can download unproved slices.
- No empty handler remains on visible patient-care dashboard actions.

### Package 8.2 - Search, Notification And Feedback Projection Repair

Allowed after Package 8.1:

- Add QuickSearch sequence and partial-result states.
- Add notification empty/loading/failed/unavailable states and disable unwired preferences.
- Define PWA/feedback/debug readiness states and accessibility preference gates.

Blocked:

- Search telemetry writes, notification writes/deletes, preference writes, trend generation and service-worker behavior changes.

Acceptance:

- Search denied/failure/stale cases are visible and not treated as no match.
- Notification failures no longer disclose user/backend details or render as empty.
- Feedback/PWA/debug surfaces are truthful and preference-aware.

### Package 8.3 - Realtime And PageData Retirement Planning

Produce follow-up specs for:

- Domain-by-domain realtime invalidation ownership.
- PageDataContext retirement map.
- TanStack Query migration candidates after Passes 1-7.
- Activity/audit redaction projection.
- Export/report framework.
- Dormant component retirement/remount decisions.

Each spec must name table/channel, owner pass, invalidation target, cleanup proof, UI consumer, data sensitivity, failure behavior and verification path.

## Verification

Docs-only checklist verification:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" frontend/docs/implementation/console-service-alignment/checklists/README.md frontend/docs/implementation/console-service-alignment/checklists/PASS_8_SHELL_ANALYTICS_SEARCH_REALTIME_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md
rg -n --pcre2 "[^\x00-\x7F]" frontend/docs/implementation/console-service-alignment/checklists/README.md frontend/docs/implementation/console-service-alignment/checklists/PASS_8_SHELL_ANALYTICS_SEARCH_REALTIME_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md
```

Runtime implementation verification, once code begins:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" frontend/src frontend/docs
rg -n "mock|fallback|default|Export Report|Generate Analytics Report|openAnalyticsModal|PWADebugTracker|console\\.error|serviceWorkerRegistration\\.register|useMockData|successRate: 95|12\\.0m|patient satisfaction|Free Tier|Upgrade|LIVE SYNC" frontend/src
rg -n "channel\\(|subscribe\\(|removeChannel|on\\('postgres_changes'|get_recent_activity|searchAll|trending|notification" frontend/src
npm run build
```

Browser smoke, no mutation:

- Dashboard/Bento desktop and mobile.
- Analytics desktop and mobile.
- QuickSearch with successful, failed, denied and stale/rapid queries where feasible.
- Notification center loading/empty/failure states.
- Settings notification/plan/preference unavailable states.
- PWA install/offline/update surfaces and debug marker visibility.
- Route transitions and footer/loading states.
- Console scan for raw backend/Auth/Storage/Edge/route/payload diagnostics.

## Commit Boundary

Commit Package 8.1 as one coherent shell-truth checkpoint after code verification. Package 8.2 and Package 8.3 should remain separate checkpoints unless a shell projection refactor is inseparable.

This checklist itself completes the implementation-plan checklist set and may be committed with the checklists index after docs-only verification.
