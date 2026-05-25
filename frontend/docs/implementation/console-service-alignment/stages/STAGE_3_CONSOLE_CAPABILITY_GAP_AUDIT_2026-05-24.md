# Stage 3 Console Capability Gap Audit - 2026-05-24

## Status

Initial Stage 3 capability-gap pass. Static source review only.

This document continues the service-alignment audit after the Stage 2 service maps and contract exhibits. It does not authorize product, database, Edge Function, or cleanup mutations.

## Recent Worktree Context

Recent uncommitted audit changes show the contract-truth pack has moved beyond Stage 1 and Stage 2 setup:

- Commit discipline was revised so database truth, app mutation truth, console gaps, exhibits, and read-only proof publish as one coherent contract-truth pack.
- Stage 2 now includes Edge Function runtime ownership, pricing scope, responder telemetry, verification, onboarding, and live read-only confirmation notes.
- Contract exhibits now cover emergency/payment/capacity, provider operations, care/content/analytics, identity/visits/subscribers, ownership triggers, and read-only confirmation.

The audit program's old "Current Next Step" still said to continue Stage 1. This pass treats that as stale and advances the active work to Stage 3 capability mapping.

## Scope

Stage 3 maps console implementation gaps against the source-of-truth contracts already documented:

- page-level Supabase calls that bypass services
- context-owned server data
- stale or duplicated service surfaces
- missing services around canonical app flows
- mock, demo, and fallback paths that can hide production drift
- route/loading gaps that can make async work feel blank or static

## Capability Gap Matrix

| Surface | Source evidence | Capability gap | Status | Implementation implication |
| --- | --- | --- | --- | --- |
| Global page data provider | `src/App.js:140-149`, `src/contexts/PageDataContext.jsx:144-168`, `src/contexts/PageDataContext.jsx:628-650` | `PageDataProvider` wraps the authenticated shell and loads emergency, verification, analytics, doctors, visits, hospitals, ambulances, users, support, insurance, activity, wallet, pricing, and organizations at shell scope. | confirmed gap | Split broad server data into page/domain hooks or query boundaries so opening one route does not imply global reads and global loading state churn. |
| Mock and fallback data | `src/contexts/PageDataContext.jsx:20-125`, `src/contexts/PageDataContext.jsx:154-159`, `src/contexts/PageDataContext.jsx:177`, `src/contexts/PageDataContext.jsx:229-261`, `src/contexts/PageDataContext.jsx:300-338`, `src/contexts/PageDataContext.jsx:478-517` | Production-shaped dashboards can be seeded or restored from mock emergency, analytics, doctor, visit, verification, and support data. One support error path flips `useMockData` on. | confirmed gap | Replace production dashboard fallback with explicit empty/error states unless demo mode is intentionally gated and visibly labeled. |
| Global realtime ownership | `src/contexts/PageDataContext.jsx:661-815` | The broad provider owns realtime channels for emergency requests, doctors, visits, insurance policies, profiles, organizations, pricing, support tickets, and activity. | confirmed gap | Move realtime to domain subscriptions that invalidate or refetch the owning query/service surface; keep the provider from becoming durable server state. |
| Wallet duplication | `src/contexts/PageDataContext.jsx:543-568`, `src/components/pages/WalletManagementPage.jsx:65-125`, `src/services/walletService.js:17-47`, `src/services/walletService.js:89-162` | Wallet, ledger, payment, and profile enrichment reads exist in both global context and the wallet page, while walletService owns overlapping reads and Edge Function calls. | confirmed gap | Make one wallet domain facade/query owner before changing Stripe, ledger, payout, or cash-settlement UI. |
| Direct page reads | `src/components/pages/Analytics.jsx:433-436`, `src/components/pages/Overview.jsx:31-34`, `src/components/pages/AmbulancesPage.jsx:79`, `src/components/pages/EmergencyRequestsPage.jsx:126`, `src/components/pages/VisitsPage.jsx:111`, `src/components/pages/UsersPage.jsx:213`, `src/components/pages/HealthNewsManagementPage.jsx:100-116` | Pages issue direct Supabase reads for counts and analytics while services/hooks also exist for the same domains. | confirmed gap | Move page metrics into service/query functions so role scoping, field selection, error handling, and app-alignment contracts are testable in one place. |
| Direct modal reads | `src/components/modals/AmbulanceModal.jsx:140-159`, `src/components/modals/DoctorModal.jsx:137`, `src/components/modals/EmergencyRequestModal.jsx:84`, `src/components/modals/InviteUserModal.jsx:55` | Modals fetch supporting records or invoke functions directly instead of using domain services. | confirmed gap | Treat modal data requirements as read-model service methods; keep modals presentational and action-focused. |
| Health-news duplicated analytics | `src/components/pages/HealthNewsManagementPage.jsx:100-116`, `src/components/context/HealthNewsPanel.jsx:36-40`, `src/services/healthNewsService.js:67` | Health-news count/category reads are duplicated in the page and context panel, separate from the service read path. | confirmed gap | Centralize content analytics in `healthNewsService` or a domain hook before expanding editorial dashboards. |
| Auth and security exceptions | `src/contexts/AuthContext.jsx:171-277`, `src/components/pages/LoginPage.jsx:73-195`, `src/components/pages/SetPasswordPage.jsx:25-55`, `src/components/modals/SecurityModal.jsx:29-87` | Auth, MFA, reset, and security flows necessarily call Supabase Auth directly in UI-adjacent code. | accepted SDK boundary | Keep direct Auth/MFA enrollment or challenge calls route/modal-local where the Supabase SDK interaction is the user flow; keep reusable session/role/query guards in `authService`. |
| Route loading feedback | `src/App.js:158` | Lazy route fallback is a blank background div. | confirmed UX gap | Replace with compact route skeleton/scrim treatment so navigation intent gets immediate visible feedback. |
| Analytics local derivation | `src/components/pages/Analytics.jsx:71-107`, `src/components/pages/Analytics.jsx:252-426`, `src/components/pages/Analytics.jsx:433-517` | Analytics owns many local state slices and derives charts from raw table reads inside the page. | confirmed gap | Move analytics read/derive logic into `analyticsService`/`useAnalytics` and keep the page rendering selected metrics and controls. |

## Service Coverage Notes

### Services Exist But Are Not Always The Boundary

The console already has services for most audited domains, including emergency, hospitals, pricing, wallet, profiles, organizations, analytics, health news, support, search, subscriptions, visits, insurance, doctors, and ambulances. The gap is not absence of services alone. The larger pattern is mixed ownership:

- pages call Supabase for counts while services own list/detail CRUD
- modals call Supabase for supporting lookups while pages call services for primary records
- global context calls services and Supabase directly for dashboard snapshots
- realtime channels live in both services and the broad page-data provider

Implementation should first choose the domain owner for each read/mutation path, then move UI calls behind that owner.

### Missing Or Weak Capability Boundaries

| Capability | Current signal | Required owner before implementation |
| --- | --- | --- |
| Wallet ledger and payment history | Context, page, and service all read wallet/ledger/payment data. | Wallet domain query/service facade. |
| Route/dashboard metrics | Overview, analytics, pages, and PageDataContext derive their own counts. | Analytics or page-metric service with role-scoped selectors. |
| Modal supporting lookups | Ambulance, doctor, and emergency modals fetch hospitals/profiles directly. | Domain lookup service methods with display-id/UUID semantics. |
| Health-news KPIs | Page and context panel duplicate direct count queries. | Health-news analytics method. |
| Visits search and counts | `VisitsPage` has direct count reads and TODOs for backend search RPC. | Visits read model with search/count RPC contract. |
| Demo/mock state | PageDataContext owns mock data and exposes it to panels. | Explicit demo-mode preference or no production mock path. |
| Route transition feedback | Suspense fallback renders blank background. | Shared route loading shell/skeleton. |

## Priority Findings

### 1. Broad PageDataContext Is A Server-State Context

`PageDataContext` is currently the largest Stage 3 state/data ownership risk. It stores cross-domain server snapshots, global loading, mock fallback mode, wallet state, pricing, organizations, and realtime subscriptions in one provider.

This conflicts with the intended contract direction from Stage 2: domain services and exact receivers should own data shape, while UI should render selected data. If this provider remains the main dashboard owner, later service fixes can still be bypassed by shell-level fetches.

Implementation input:

- keep `PageDataContext` only for shell-level summary composition if needed
- move domain reads into hooks/services with explicit ownership
- replace `pageLoading` with route/domain loading states
- remove mock data from production state paths or put it behind a visible demo gate

### 2. Page-Level Reads Hide Service Contract Drift

Multiple pages perform direct Supabase reads for counts, analytics, or supporting data. These reads can diverge from service filters, app-aligned payload maps, RLS expectations, and display ID behavior.

Implementation input:

- move page metrics into domain services first
- only then change UI copy, charts, filters, or loading states
- preserve accepted auth/security direct SDK calls as documented exceptions

### 3. Wallet And Finance Reads Are Triplicated

The wallet contract is already one of the highest-risk Stage 2 areas. Stage 3 adds that wallet state is read in three places: PageDataContext, WalletManagementPage, and walletService.

Implementation input:

- do not patch wallet UI locally before creating one wallet read owner
- make ledger visibility, organization wallet scoping, Stripe customer resolution, payment history, and projection explicit in that owner
- keep maintenance/repair paths out of ordinary page refresh and modal flows

### 4. Loading Feedback Is Too Weak For Route Transitions

The app route fallback renders only a blank background. This conflicts with the product rule that navigation should acknowledge intent immediately and important async surfaces should not pause blankly.

Implementation input:

- add a compact shell-aware route skeleton or top progress/scrim
- keep mobile treatment compact
- avoid full-screen generic spinners for dashboard route changes

## Stage 3 Follow-Up Work

Next exact Stage 3 passes should map:

1. Page-by-page read/write ownership: `page -> hook/context -> service/direct Supabase -> receiver`.
2. Realtime ownership: every channel in services and `PageDataContext`, with intended query invalidation target.
3. Mock/demo paths: all production-reachable sample data, fallback analytics, and demo preference controls.
4. Loading/feedback gaps: primary action pending states and route/loading states for emergency, wallet, pricing, visits, and support.

## Page Ownership Pass

This pass narrows the first follow-up item: `page -> hook/context -> service/direct Supabase -> receiver`.

| Page or panel | Current data owner signals | Direct receiver signals | Gap status | Required consolidation |
| --- | --- | --- | --- | --- |
| `EmergencyRequestsPage` | Uses `usePageData()` for summary data and `emergencyResponseService`/`walletService` for actions (`EmergencyRequestsPage.jsx:21-23`, `EmergencyRequestsPage.jsx:65`). | Direct count read from `emergency_requests` (`EmergencyRequestsPage.jsx:126`). | mixed ownership | Move request list/count/search into emergency domain hook or service; keep dispatch, complete, cash, and retry actions behind receiver-specific services. |
| `VisitsPage` | Uses `usePageData()` plus `visitsService`, `doctorsService`, `hospitalsService`, and `profilesService` (`VisitsPage.jsx:4-13`, `VisitsPage.jsx:28`, `VisitsPage.jsx:41`). | Direct count/read shape from `visits` (`VisitsPage.jsx:111`) and backend search TODOs (`VisitsPage.jsx:132`, `VisitsPage.jsx:169`). | mixed ownership | Create one visits read model that owns count, search, hydration, emergency fallback, and profile/hospital lookups. |
| `AmbulancesPage` | Uses `usePageData()`, `ambulancesService`, `hospitalsService`, auth filters, and notifications (`AmbulancesPage.jsx:4-11`, `AmbulancesPage.jsx:34`). | Direct ambulance count read (`AmbulancesPage.jsx:79`). | mixed ownership | Put count/list/filter into `ambulancesService` or `useAmbulances`; separate dashboard summary from operational CRUD. |
| `DoctorsPage` | Uses `usePageData()` and `doctorsService` (`DoctorsPage.jsx:3`, `DoctorsPage.jsx:32`). | No direct Supabase receiver found in the page scan. | partial alignment | Keep page on service/hook path, then fix doctor/profile/display-id contract at the service layer. |
| `HospitalsPage` | Uses `usePageData()` and `hospitalsService` (`HospitalsPage.jsx:9`, `HospitalsPage.jsx:33`). | Page scan did not show direct Supabase reads; modal/service paths still own provider discovery and capacity drift. | partial alignment | Keep metadata CRUD in `hospitalsService`, route operational availability through `update_hospital_availability`, and keep discovery persistence behind an authorized import receiver. |
| `PricingManagementPage` | Uses `pricingService` and page-local loading/modals (`PricingManagementPage.jsx:5`, `PricingManagementPage.jsx:42-81`, `PricingManagementPage.jsx:104-155`). | No direct Supabase receiver found in the page scan. | partial alignment | Keep RPC-backed pricing service as owner, but resolve hospital/org scope ambiguity before UI changes. |
| `WalletManagementPage` | Uses wallet service for Stripe/payment methods/projection but also page-local wallet, ledger, and payment reads (`WalletManagementPage.jsx:48-60`, `WalletManagementPage.jsx:65-125`). | Direct reads from `ivisit_main_wallet`, `organization_wallets`, `wallet_ledger`, `payments`, and `profiles` (`WalletManagementPage.jsx:65-125`). | confirmed gap | Move wallet summary, ledger, payments, profile enrichment, Stripe status, payout/top-up capability, and refresh semantics into one wallet facade. |
| `Analytics` | Uses `walletService.getFinanceAnalytics`, `useSubscription`, and local derivation (`Analytics.jsx:51-52`, `Analytics.jsx:71-107`, `Analytics.jsx:252-426`). | Direct reads from `emergency_requests`, `profiles`, `hospitals`, and `ambulances` (`Analytics.jsx:433-436`). | confirmed gap | Move analytics raw reads and chart derivation into `analyticsService`/`useAnalytics`; keep page as presentation and control state. |
| `Overview` | Uses local state and layout header (`Overview.jsx:14-28`). | Direct count reads from `emergency_requests`, `profiles`, `hospitals`, and `ambulances` (`Overview.jsx:31-34`). | confirmed gap | Replace with shared dashboard metrics service or retire if BentoHome/PageDataContext is canonical. |
| `HealthNewsManagementPage` | Uses `healthNewsService` for CRUD and page-local stats (`HealthNewsManagementPage.jsx:8-10`, `HealthNewsManagementPage.jsx:56-85`). | Direct KPI/count/category reads from `health_news` (`HealthNewsManagementPage.jsx:100-116`). | mixed ownership | Add health-news analytics/read-summary methods to the service and reuse them from the page and context panel. |
| `HealthNewsPanel` | Context panel owns its own stats fetch. | Direct KPI/category reads from `health_news` (`HealthNewsPanel.jsx:36-40`). | duplicate ownership | Reuse the same health-news summary owner as the page. |
| `UsersPage` | Uses `profilesService`, `organizationsService`, `doctorsService`, and `ambulancesService` (`UsersPage.jsx:11-14`). | Direct BVN count read and admin delete RPC from page (`UsersPage.jsx:213`, `UsersPage.jsx:358`, `UsersPage.jsx:467`). | mixed ownership | Move user metrics and destructive admin RPCs into admin/profile services so audit logging and role checks are not page-local. |
| `SubscriptionManagementPage` | Uses `useSubscription` and `subscriptionService` subscription (`SubscriptionManagementPage.jsx:7`, `SubscriptionManagementPage.jsx:40`). | Page-level `sendWelcome` Edge Function invoke (`SubscriptionManagementPage.jsx:116`). | mixed ownership | Keep subscriber lifecycle and email sends in one subscription service facade, then align Edge Function ownership. |
| `SupportTicketsPage` | Uses `useSupportTickets()` and service-backed handlers (`SupportTicketsPage.jsx:9`, `SupportTicketsPage.jsx:72-73`, `SupportTicketsPage.jsx:166-206`). | No direct Supabase receiver found in the page scan. | partial alignment | Keep this as a reference pattern for page using a domain hook, while verifying ticket status and assignment contracts. |
| `InsuranceManagementPage` | Uses `useInsurance()` (`InsuranceManagementPage.jsx:7`). | No direct Supabase receiver found in the page scan. | partial alignment | Consolidate duplicate insurance services below the hook rather than changing the page first. |
| `OrganizationsPage` | Uses `organizationsService` (`OrganizationsPage.jsx:3`). | No direct Supabase receiver found in the page scan. | partial alignment | Keep page thin, but resolve org/hospital onboarding and wallet/customer receiver contracts in service. |

### Modal And Panel Direct Receiver Pass

| UI surface | Direct receiver signal | Risk | Required consolidation |
| --- | --- | --- | --- |
| `AmbulanceModal` | Direct reads from `hospitals` and `ambulances.profile_id` (`AmbulanceModal.jsx:140`, `AmbulanceModal.jsx:159`). | Modal owns assignment-support lookups outside ambulance/hospital services. | Add service methods for assignable hospitals and occupied driver/ambulance IDs. |
| `DoctorModal` | Direct hospital lookup (`DoctorModal.jsx:137`). | Doctor creation UI can drift from provider/hospital eligibility filters. | Add doctor-form lookup service that carries hospital/provider scope. |
| `EmergencyRequestModal` | Direct profile lookup (`EmergencyRequestModal.jsx:84`). | Emergency creation UI can select patient rows outside the service's create contract. | Add patient lookup/read model with role/RLS/display-id handling. |
| `InviteUserModal` | Direct `invite-user` Edge Function invoke (`InviteUserModal.jsx:55`). | Invite behavior is split between modal, admin service, local Edge source, and deployed-slug uncertainty. | Move invite invocation behind `adminService` or `authService` and document deployed function ownership. |
| `SecurityModal` | Direct MFA SDK calls (`SecurityModal.jsx:29-87`). | Accepted SDK-adjacent exception, but auth UI owns error/loading semantics. | Keep MFA enrollment/challenge as a documented route/modal-local Supabase Auth boundary; centralize only reusable session/role/query behavior in `authService`. |

## Action Feedback Pass

The audit rules require immediate visible feedback for primary actions. This first pass distinguishes surfaces that already acknowledge long actions from ones whose feedback is still page-local or weakly bounded.

| Surface/action | Observed feedback signal | Gap status | Implementation implication |
| --- | --- | --- | --- |
| Emergency dispatch, complete, cash, retry | Uses toast loading/success/error for dispatch, cash, and payment retry (`EmergencyRequestsPage.jsx:443-462`, `EmergencyRequestsPage.jsx:489-503`, `EmergencyRequestsPage.jsx:507-578`). | feedback present, contract risky | Keep immediate feedback, but bind success copy to backend-confirmed state. Current cash success copy is unsafe until cash-settlement contract is repaired. |
| Pricing save/delete | Uses loading state and toast success/error (`PricingManagementPage.jsx:71-81`, `PricingManagementPage.jsx:104-155`). | feedback present | Add button-level pending/disabled states in implementation pass if not already inherited by modal controls. |
| Wallet refresh/export/card removal | Shows loading indicator/spinning refresh and toasts for export/delete (`WalletManagementPage.jsx:142-163`, `WalletManagementPage.jsx:204-208`, `WalletManagementPage.jsx:520-521`). | partial feedback | Wallet top-up/withdraw success must wait on Stripe/Edge Function confirmation path, not local modal completion. |
| Support ticket actions | Uses toast success/error around delete and assign (`SupportTicketsPage.jsx:166-206`). | feedback present | Preserve as pattern; add per-row pending state if repeated clicks can duplicate mutation. |
| Route transitions | Suspense fallback is blank (`App.js:158`). | confirmed UX gap | Add shared route loading skeleton/scrim before implementation passes change route-level data ownership. |

## Realtime Audit Method

The realtime ownership pass checks:

- list every `supabase.channel()` in services, contexts, pages, and modals
- identify which domain read owner should refresh or invalidate after each event
- flag duplicate channels for the same table
- preserve narrow channel scope and cleanup behavior
- avoid realtime callbacks owning canonical state directly

## Realtime Ownership Pass

The first realtime scan confirms that subscriptions are scattered across generic helpers, services, hooks, contexts, pages, panels, and modals. Cleanup usually exists, but ownership is not centralized.

| Table or event family | Current subscription signals | Duplicate or ownership issue | Required owner |
| --- | --- | --- | --- |
| `emergency_requests` | `PageDataContext` global channel (`PageDataContext.jsx:661-668`), `EmergencyRequestsPage` channel with `payments` (`EmergencyRequestsPage.jsx:224-229`), `Overview` generic table subscription (`Overview.jsx:87`), `supabaseMapService.subscribeToEmergencies()` (`supabaseMapService.js:91-107`), `EmergencyDetailsModal` scoped channel (`EmergencyDetailsModal.jsx:195-218`). | Same table refreshes dashboard, page list, overview, map, and modal independently. | Emergency domain query/subscription owner, with map and modal as scoped projections. |
| `payments` | `EmergencyRequestsPage` listens to `payments` on the same channel as emergency requests (`EmergencyRequestsPage.jsx:224-229`). | Payment changes refetch emergency list from the page instead of the payment/emergency contract owner. | Emergency payment query owner that maps payment events to request invalidation. |
| `doctors` | `PageDataContext` global doctor channel (`PageDataContext.jsx:676-683`); staff scheduling listens to doctor schedule/status updates (`staffSchedulingService.js:497-538`). | Dashboard doctor data and scheduling status can refresh independently. | Doctor/provider operations read model plus schedule-specific subscription. |
| `visits` | `PageDataContext` global visit channel (`PageDataContext.jsx:691-698`), `VisitsPage` page-local channel (`VisitsPage.jsx:305-313`), `visitsService` scoped/all/user subscriptions (`visitsService.js:553-621`), `useVisits` wrappers (`useVisits.js:220-256`). | Page, context, and service subscriptions all compete as the visible visit owner. | Visits domain hook/service should own realtime and expose refresh state to page/context consumers. |
| `insurance_policies` | `PageDataContext` global channel (`PageDataContext.jsx:706-713`), `insuranceService.subscribeToInsurancePolicies()` (`insuranceService.js:508-518`), `insurancePoliciesService` scoped/user subscriptions (`insurancePoliciesService.js:268-312`), `useInsurance` imports both service variants (`useInsurance.js:10-12`, `useInsurance.js:141`). | Duplicate service families and global context all observe the same table. | One insurance policy service facade under `useInsurance`. |
| `profiles` | `PageDataContext` global profile channel (`PageDataContext.jsx:721-731`), `profilesService.subscribeToProfile()` (`profilesService.js:514-533`), `supabaseMapService.subscribeToUsers()` fallback (`supabaseMapService.js:139-155`). | Profile changes trigger verification/user data globally and also drive map/user projections. | Profile/admin query owner; map user projection should subscribe only if map needs live user location/status. |
| `organizations` | `PageDataContext` organization channel (`PageDataContext.jsx:739-746`). | Organization refresh is global shell-owned. | Organizations service/hook with explicit wallet/hospital joins as needed. |
| `service_pricing` and `room_pricing` | `PageDataContext` pricing channel listens to both tables (`PageDataContext.jsx:754-765`). | Pricing route and global dashboard share refresh without one pricing owner. | Pricing service/hook should own both table events and refetch active hospital/org scope. |
| `support_tickets` | `PageDataContext` debounced support-ticket channel (`PageDataContext.jsx:792-799`), `SupportTicketsPanel` direct channel (`SupportTicketsPanel.jsx:43-52`), `supportTicketsService.subscribeToSupportTickets()` (`supportTicketsService.js:377-387`), `useSupportTickets` wrapper (`useSupportTickets.js:123`). | Support tickets are a good hook/service candidate but are still duplicated by context/panel. | `useSupportTickets`/service owner reused by page and panel. |
| `health_news` | `HealthNewsPanel` direct channel (`HealthNewsPanel.jsx:67-76`), `healthNewsService.subscribeToHealthNews()` (`healthNewsService.js:248-262`), `useHealthNews` wrapper (`useHealthNews.js:121`). | Panel duplicates the service/hook owner. | Health-news hook/service owner reused by page and panel. |
| `activity` / `user_activity` | `PageDataContext` activity channel (`PageDataContext.jsx:807-814`), `activityService.subscribeToActivity()` (`activityService.js:141-157`), `useActivity` wrapper (`useActivity.js:131`). | Global context and activity hook can both refresh activity. | Activity hook/service owner with dashboard summary projection. |
| `subscribers` | `subscriptionService.subscribeToSubscribers()` and `subscribeToNewSubscribers()` (`subscriptionService.js:375-401`), duplicate `subscribersService.subscribeToSubscribers()` (`subscribersService.js:204-222`), `SubscriptionManagementPage` page subscription (`SubscriptionManagementPage.jsx:137`), `useSubscription` wrappers (`useSubscription.js:151-211`). | Subscriber lifecycle already had too many writers; realtime has duplicate service families too. | One subscriber/subscription service facade and one hook owner. |
| `ambulances` | `PageDataContext` indirectly fetches ambulances globally; `ambulancesService` scoped/all subscriptions (`ambulancesService.js:371-414`), `supabaseMapService.subscribeToAmbulances()` (`supabaseMapService.js:114-130`), `driverManagementService.subscribeToAmbulanceStatus()` (`driverManagementService.js:257-272`), `useAmbulances` wrappers (`useAmbulances.js:197-209`). | Operational status, map location, and dashboard list are not separated clearly. | Ambulance operations owner, with map telemetry as a scoped projection. |
| `emergency_doctor_assignments` / bed reservations | `driverManagementService.subscribeToAssignments()` (`driverManagementService.js:232-251`), `bedManagementService.subscribeToReservations()` (`bedManagementService.js:164-179`). | These are narrower and closer to feature owners. | Keep scoped, but tie callback outputs to owner refresh/invalidation rather than local durable state. |
| `notifications` and preferences | `notificationService.subscribeToNotifications()` (`notificationService.js:140-155`), `preferencesService.subscribeToPreferences()` (`preferencesService.js:239-258`). | Mostly scoped to user-specific UI state. | Accepted as service-owned realtime, with cleanup retained. |
| Search/trending/support FAQs | `searchEventsService`, `searchSelectionsService`, `searchHistoryService`, `trendingTopicsService`, and `supportFaqsService` expose table subscriptions. | Mostly service-local, but usage and dashboard ownership need later confirmation. | Keep service-owned; only wire to route hooks that render these domains. |

### Realtime Priority Findings

1. `PageDataContext` duplicates realtime ownership for at least emergency requests, doctors, visits, insurance, profiles, organizations, pricing, support tickets, and activity.
2. Several feature pages or panels subscribe directly even when a service and hook already expose a subscription, especially visits, support tickets, and health news.
3. Insurance and subscribers have duplicate service families that each expose realtime APIs.
4. Map realtime should remain a scoped projection for active map state, not the canonical owner of emergency, ambulance, or user data.
5. Emergency/payment realtime needs contract-aware invalidation. A payment event should not be handled as a generic page list refresh if the payment state machine must preserve cash, retry, Stripe, and dispatch semantics.

### Realtime Implementation Direction

- Start by removing global realtime from `PageDataContext` after each affected page has a domain hook/service owner.
- Prefer one `subscribeToX` facade per domain and let hooks decide whether to refetch, debounce, or project partial payloads.
- Keep modal-level subscriptions only for detail views that need a live scoped row, such as an open emergency detail.
- Keep map channels mounted only while the map surface needs live operational projection.
- Document accepted direct subscriptions where the Supabase SDK itself is the boundary, such as auth and notifications.

## Remaining Stage 3 Slices

The next audit slices are now:

1. Mock/demo path inventory: all production-reachable sample data, fallback analytics, and demo preference controls.
2. Loading and interaction feedback inventory: route transitions, primary actions, destructive/bulk actions, modal submissions, and refresh affordances.
3. Final Stage 3 index: consolidate page ownership, realtime ownership, mock/demo, and feedback findings into implementation-plan inputs.

## Mock, Demo, And Fallback Path Pass

This pass separates harmless UI placeholders from production-reachable fallback data and operational fallback behavior.

| Surface or service | Source signal | Risk classification | Required handling |
| --- | --- | --- | --- |
| `PageDataContext` mock dashboard state | Mock emergency, analytics, doctors, visits, verification, and support records are defined and used as initial state (`PageDataContext.jsx:19-159`). | confirmed production-path risk | Remove mock records from production state initialization or gate behind explicit demo mode with visible labeling. |
| `PageDataContext.useMockData` | `useMockData` toggles mock data branches across multiple fetch functions (`PageDataContext.jsx:147`, `PageDataContext.jsx:176-625`). | confirmed production-path risk | Replace global mock switch with domain empty/error states unless a user preference explicitly enables demo mode. |
| Support-ticket fallback to mock mode | Support-ticket fetch error sets mock support data and flips `setUseMockData(true)` (`PageDataContext.jsx:477-517`). | high risk | Do not let one domain fetch error switch the whole shell to mock mode. Show support error/empty state and preserve other real data. |
| Mock data exposed to consumers | Context value exposes `mockData` and `useMockData` (`PageDataContext.jsx:958-989`); `EmergencyPanel` visibly labels mock data (`EmergencyPanel.jsx:17-37`). | mixed | Visible labeling is good, but mock access should not be part of normal production context unless demo mode is explicit. |
| Preferences demo mode | Preference type and service include `demo_mode_enabled` (`types/index.ts:35`, `preferencesService.js:41`, `preferencesService.js:93-111`). | unconnected capability | If demo mode remains, connect `PageDataContext` to this app-owned preference and visibly label every affected surface. |
| Hospital fleet and staff scheduler comments | `HospitalFleetManager` and `StaffScheduler` contain "Mock data - replace with real API calls" comments. | needs follow-up | Confirm whether rendered data is still static before treating these operational surfaces as aligned. |
| Analytics fallback data | `Analytics.jsx` includes deterministic predictive fallback comments (`Analytics.jsx:357`); `searchAnalyticsService` returns fallback data for graceful degradation (`searchAnalyticsService.js:40`). | medium risk | Mark analytics fallbacks as unavailable/insufficient data rather than operational truth, especially on sponsor/admin dashboards. |
| Emergency fallback create payload | `emergencyService` has a fallback path for incomplete payment context (`emergencyService.js:258-279`). | already charted high risk | Keep tied to emergency contract repair; do not hide missing app-parity payload behind a convenience fallback. |
| Hospital import fallback | `hospitalImportService` falls back from `discover-hospitals` to direct database/RPC reads and marks `fallback_used` (`hospitalImportService.js:32-89`). | medium/high risk | Keep fallback read-only and visibly mark no new imports; do not present provider discovery as successful persistence when Edge Function is unavailable. |
| Notification payload fallback | `notificationService` retries insert without `action_data` (`notificationService.js:119-121`). | medium risk | Confirm receiver schema and make fallback explicit in notification service tests/docs; avoid silently dropping action metadata. |
| Subscription schema fallback | `subscriptionService.runWriteWithSchemaFallback()` retries writes by removing columns (`subscriptionService.js:54`, `subscriptionService.js:173-291`). | high risk | Replace runtime-degraded writes with pinned current schema payloads before subscriber implementation. |
| Search fallbacks | `searchService` writes fallback event sources such as `history_fallback` and `selection_fallback` (`searchService.js:179`, `searchService.js:257`). | medium risk | Keep as analytics degradation metadata only; do not let fallback events substitute for canonical search/selection state. |
| Map/hospital fallback reads | `supabaseMapService` has organization and hospital query fallback paths (`supabaseMapService.js:59`, `supabaseMapService.js:137-183`). | medium risk | Treat as read-only projection fallback; map truth should remain emergency/ambulance/hospital owner-driven. |

### Mock/Demo Priority Findings

1. `PageDataContext` is the main production mock-data hazard because it initializes real dashboard slices from mock records and can flip global `useMockData` on after a support-ticket error.
2. A real `demo_mode_enabled` preference exists, but the broad context mock behavior is not proven to be connected to that preference.
3. Several service fallbacks are acceptable only as marked degradation paths. They become drift when UI copy treats them as successful canonical operations.
4. Runtime schema fallback in subscriber writes is not an implementation strategy. It hides database contract drift and should be replaced by current schema truth.

### Mock/Demo Implementation Direction

- Remove mock records from authenticated production defaults before broad UI implementation.
- If demo mode is intentionally preserved, wire it through `preferencesService` and label every affected panel, KPI, chart, and action.
- Convert service fallbacks into explicit degraded results with typed flags such as `fallback_used`, `partial`, or `read_only`.
- Do not let fallback paths perform hidden writes or drop important metadata silently.

## Loading And Interaction Feedback Pass

This pass checks whether user intent receives immediate visible acknowledgement. It is not a visual QA pass; it maps implementation risk for later UI fixes.

| Surface/action family | Source signal | Status | Required handling |
| --- | --- | --- | --- |
| Auth gate | `ProtectedRoute` returns `DynamicAuthSkeleton` while auth loads (`ProtectedRoute.jsx:28-39`); `ConsoleStartupOverlay` has auth startup timing/fallback handling (`ConsoleStartupOverlay.jsx:10-81`). | mostly aligned | Preserve skeleton startup behavior while reducing broad data fetches after auth. |
| Route lazy loading | App route `Suspense` fallback is blank background (`App.js:158`). | confirmed gap | Replace with shell-aware route skeleton or compact progress/scrim. |
| Mobile list surfaces | Mobile emergency, hospitals, ambulances, doctors, insurance, subscriptions, organizations, health news, and pricing use stable lists, KPI skeletons, and load-more states. | strong pattern | Use as a reference for desktop/web loading polish. |
| Shared skeletons | Common/table/card/stat/bento skeleton components exist (`components/common/Skeletons.jsx`, `components/ui/skeleton.jsx`). | capability exists | Prefer existing skeletons over generic spinners in route/page work. |
| Emergency actions | Dispatch/cash/retry have toast loading states; complete/cancel mostly use toast success/error (`EmergencyRequestsPage.jsx:350-578`). | feedback present, contract wording risky | Add row-level pending/disabled state for duplicate-click protection and tie success copy to backend truth. |
| Wallet actions | Refresh spinner and export/card toasts exist; top-up/withdraw open global modals (`WalletManagementPage.jsx:142-163`, `WalletManagementPage.jsx:168-189`, `WalletManagementPage.jsx:520-521`). | partial | Global financial modals need confirmation-path feedback, not just trigger/open state. |
| Pricing actions | Fetch loading, skeletons, save/delete toasts, and modal loading are present (`PricingManagementPage.jsx:71-155`, `PricingManagementPage.jsx:606-651`). | mostly aligned | Add explicit pending state on save/delete buttons if missing at modal footer. |
| Support ticket actions | Delete and assign use success/error toasts and table skeletons (`SupportTicketsPage.jsx:166-206`, `SupportTicketsPage.jsx:318-552`). | mostly aligned | Add per-row/bulk pending guard for repeated destructive clicks. |
| Users bulk/destructive actions | Confirmation modal carries `isLoading`; delete uses success toasts (`UsersPage.jsx:441-485`, `UsersPage.jsx:724`, `UsersPage.jsx:1237`). | strong pattern | Treat as reference for destructive/bulk actions. |
| Verification actions | Approve/reject buttons disable on loading and change text (`VerificationModal.jsx:299-331`); queue actions show toasts (`VerificationQueue.jsx:238-245`, `VerificationQueue.jsx:840-853`). | mostly aligned | Backend receiver mismatch remains a contract issue; UI feedback should not imply dispatch authority when only profile/BVN verification changed. |
| Visits actions | Table skeleton, delete/create/update toasts, and modal error handoff are present (`VisitsPage.jsx:413-469`, `VisitsPage.jsx:893-1090`). | mostly aligned | Contract owner for request-derived visits still needs repair before UI success copy is trusted. |
| Health-news actions | Table skeleton, delete/publish toasts, and loading state present (`HealthNewsManagementPage.jsx:213-240`, `HealthNewsManagementPage.jsx:707-904`). | mostly aligned | Consolidate KPI reads so feedback does not mask stale summary counts. |
| Subscriptions actions | Table skeleton and subscriber create/update/delete/welcome toasts exist (`SubscriptionManagementPage.jsx:109-132`, `SubscriptionManagementPage.jsx:254-293`, `SubscriptionManagementPage.jsx:694-960`). | feedback present, contract risky | Subscriber schema fallback and duplicate email lifecycle writers remain the larger risk. |

### Loading/Feedback Priority Findings

1. Route transitions are the most obvious feedback gap because lazy loading renders a blank background.
2. Mobile list loading patterns are stronger than several desktop route/page patterns and should be reused.
3. Many CRUD/action surfaces use toasts, but not every high-risk action has row-level pending/disabled protection.
4. Feedback correctness depends on receiver truth. Cash, verification, visits, subscriber, and wallet success copy can be technically immediate yet semantically unsafe if backend confirmation is incomplete or drifted.

### Loading/Feedback Implementation Direction

- Fix shared route loading before broad page refactors.
- Reuse existing skeleton primitives and mobile stable-list behavior where possible.
- Add pending/disabled states for destructive, bulk, payment, dispatch, payout, and send-email actions.
- Audit success copy alongside receiver contracts so UI never claims completion before backend truth confirms it.

## Stage 3 Completion Note

Stage 3 now has initial coverage for:

- page and modal ownership
- direct Supabase receivers
- broad context server-state ownership
- realtime ownership
- mock/demo/fallback paths
- loading and interaction feedback

Do not commit this Stage 3 doc by itself unless an explicit checkpoint is requested. Per the revised commit discipline, it belongs in the broader contract-truth evidence pack with Stage 1 database truth, Stage 2 service contracts, exact exhibits, and read-only confirmation. The next planned step is Stage 4 L5 state/data ownership, where the matrix should explicitly include `source of truth`, `console consumes`, `console cannot consume`, `console writes`, `bypass/drift`, and `required owner`.

## Docs Routing Note

The app-side instructions say to search `docs/INDEX.md` before adding docs. In this console workspace, `frontend/docs/INDEX.md` and `frontend/docs/CONTRIBUTING.md` were not present at audit time. This document is therefore placed beside the active Stage 2 service-alignment docs and linked from that subtree README.
