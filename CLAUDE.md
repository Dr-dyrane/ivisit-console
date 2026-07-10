# ivisit-console — Codebase Index

> Operational console for the iVisit healthcare ecosystem. Provider onboarding, dispatch, approvals, CRUD workflows, analytics, and admin dashboards. Backend truth lives in shared Supabase; this app reads, approves, and administers it — it does not invent parallel truth.

See `AGENTS.md` (root) and `frontend/AGENTS.md` for full agent rules and authority order.

---

## Ecosystem Position

| Repo | Role |
|---|---|
| `ivisit` | Marketing, acquisition, SEO, public trust |
| `ivisit-app` | Canonical patient product (native + web) |
| **`ivisit-console`** | Provider/operator/admin surface (this repo) |
| `iVisit-docs` | NDA-gated data room, sponsor/investor/legal |

---

## Tech Stack

- **React 18** (CRA + CRACO), JavaScript + TypeScript types
- **Supabase** — Postgres, Auth, RLS, RPCs, Edge Functions, Realtime, Storage
- **Radix UI** primitives + **shadcn/ui** component layer
- **Tailwind CSS**
- **React Query** (`@tanstack/react-query`) via `src/lib/queryClient.js`
- **Framer Motion** for animation
- **Leaflet** + **Google Maps** (dual renderer pattern)
- **Stripe** (`@stripe/react-stripe-js`)
- **PWA** — service worker, install prompt, offline indicator

---

## Repo Layout

```
ivisit-console/
├── AGENTS.md                  # Root agent rules & authority order
├── CLAUDE.md                  # This file
├── README.md
├── build.sh
├── .agent/workflows/          # git-rules.md, ui-standards.md
├── docs/audit/                # Root-level audit docs
└── frontend/                  # All application code
    ├── AGENTS.md              # Frontend-specific agent rules
    ├── package.json           # name: ivisit-console, v0.1.0
    ├── craco.config.js
    ├── src/                   # Application source (see below)
    ├── docs/                  # Extensive design & alignment docs
    ├── scripts/               # DB inspection, migration, icon gen
    ├── plugins/               # health-check, visual-edits webpack plugins
    ├── public/                # PWA icons, manifest, map assets
    └── exports/               # subscribers_emails.csv
```

---

## Source Tree (`frontend/src/`)

### Entry
- `index.js` — app bootstrap, service worker registration
- `App.js` / `App.css` — root component, routing shell

### `config/`
- `routes.jsx` — `ROUTE_PROTECTION` map (path → minRole + resource); role levels: `viewer(20) < provider(40) < sponsor(60) < org_admin(80) < admin(100)`
- `navigation.js` — nav groups (main, ops, mgmt, finance, user) with RBAC guards

### `contexts/`
| Context | Purpose |
|---|---|
| `AuthContext` | Supabase session, user profile, role |
| `ThemeContext` | Dark/light mode |
| `LayoutContext` | Sidebar open/collapsed, responsive state |
| `NavigationContext` | Active route, breadcrumb state |
| `MapContext` | Map provider selection, viewport state |
| `PageDataContext` | Shell-level data preloading |
| `OnboardingContext` | Wizard step state |
| `PWAContext` | Install prompt, offline state |
| `FeedbackContext` | Toast/notification queue |
| `FocusContext` | Keyboard focus management |

### `components/pages/` — Route-level pages
`BentoHome`, `Analytics`, `Overview`, `AmbulancesPage`, `DoctorsPage`, `EmergencyRequestsPage`, `GodModeMap`, `HealthNewsManagementPage`, `HospitalsPage`, `InsuranceManagementPage`, `OrganizationsPage`, `PricingManagementPage`, `SettingsPage`, `SubscriptionManagementPage`, `SupportTicketsPage`, `UsersPage`, `VerificationQueue`, `VisitsPage`, `WalletManagementPage`, `LoginPage`, `OnboardingPage`, `OnboardingSuccessPage`, `SetPasswordPage`, `NotFoundPage`

### `components/modals/`
CRUD/action modals for every domain entity: `AmbulanceModal`, `DoctorModal`, `EmergencyDetailsModal`, `EmergencyRequestModal`, `HealthNewsModal`, `HospitalModal`, `InsuranceModal`, `InviteUserModal`, `SubscriptionModal`, `SupportTicketModal`, `UserModal`, `VerificationModal`, `VisitModal`, `WalletManagementPage`-related `GlobalFinancialModals`, `AnalyticsModal`, `BulkImportModal`, `ConfirmationModal`, `ProfileEditModal`, `SecurityModal`, `StaffSchedulingModal`, `SupportModal`

### `components/views/`
Paired List/Table views for each entity — `Ambulance`, `Doctor`, `EmergencyRequest`, `HealthNews`, `Hospital`, `Insurance`, `Organization`, `Pricing`, `Subscription`, `SupportTicket`, `User`, `VerificationQueue`, `Visit`

### `components/context/` — Right-side context panels
Per-entity slideout panels matching the views above (e.g. `AmbulancesPanel`, `EmergencyPanel`, `WalletPanel`, etc.) plus `MapPanel`, `DashboardPanel`, `AnalyticsPanel`

### `components/mobile/`
Full mobile counterparts for every page: `MobileDashboard`, `MobileEmergency`, `MobileHospitals`, `MobileDoctors`, `MobileAmbulances`, `MobileVisits`, `MobileWallet`, `MobileUsers`, etc. Shared primitives: `MobilePageShell`, `MobileSkeleton`, `MobileActionRail`, `PullToRefresh`, `MobileKPIStrip`

### `components/navigation/`
`ResponsiveSidebar`, `SmartTopNav`, `SmartHeader`, `SmartFooter`, `ContextPanel`, `ContextAwareFAB`, `DynamicBottomBar`, `MobileNavMenu`, `QuickSearch`, `BentoBreadcrumbs`, `NotificationCenter`

### `components/map/`
Dual renderer: `GoogleMapsRenderer` / `LeafletMapRenderer`; refiners: `GoogleMapsRefiner` / `LeafletMapRefiner`; `LiveStatsPanel`, `RecentAlertsPanel`, `MarkerDetailPanel`, `MapLayerControls`

### `components/common/`
`ProtectedRoute`, `RouteGuard`, `ErrorBoundary`, `Skeletons`, `Navigation`, `IslandNavigation`, `NetworkStatus`, `NotificationCenter`, `ViewToggle`, `FilterSheet`, `BulkActionBar`, `SEOHead`, `ConsoleStartupOverlay`

### `components/ui/`
Full shadcn/ui component set: `button`, `card`, `dialog`, `drawer`, `dropdown-menu`, `form`, `input`, `select`, `table`, `tabs`, `toast`, `tooltip`, `badge`, `calendar`, `avatar`, `sheet`, `skeleton`, `progress`, `pagination`, etc. Plus `PaginationControls`, `LocationCell`, `theme-toggle`

### `components/onboarding/`
Multi-step wizard: `OnboardingWizard` → `OrganizationTypeStep` → `OrganizationDetailsStep` → `AdminAccountStep` → `InitialSetupStep` → `VerificationStep`

### `components/scheduling/`
`StaffScheduler`, `StaffSchedulingModal`

### `components/pwa/`
`InstallPrompt`, `OfflineIndicator`, `UpdateNotification`

### `components/dashboard/`
`StatsCard`, `HospitalFleetManager`

### `hooks/`
One hook per domain: `useAmbulances`, `useEmergency`, `useHospitals`, `useDoctors` (`useDoctorProfile`), `useVisits`, `useInsurance`, `useSubscription`, `useHealthNews`, `useSupportTickets`, `useProfiles`, `useAdmin`, `useAnalytics`, `useActivity`, `usePagination`, `useViewMode`, `useBreakpoint`, `useNetworkStatus`, `usePWA`, `useFeedback`, `useContextAction`

### `services/` — Supabase data layer
One service file per domain. Key services:
- `authService`, `profilesService`, `adminService`
- `hospitalsService`, `doctorsService`, `ambulancesService`
- `emergencyService`, `emergencyResponseService`
- `visitsService`, `medicalProfilesService`
- `walletService`, `pricingService`
- `subscriptionService`, `subscribersService`
- `insuranceService`, `insurancePoliciesService`
- `organizationsService`, `orgVerificationService`, `verificationService`
- `supportTicketsService`, `supportFaqsService`
- `healthNewsService`, `trendingTopicsService`
- `analyticsService`, `analyticsAutomationService`, `searchAnalyticsService`
- `searchService`, `searchHistoryService`, `searchEventsService`, `searchSelectionsService`
- `activityService`, `notificationService`, `onboardingService`
- `bedManagementService`, `staffSchedulingService`, `driverManagementService`
- `displayIdService`, `storageService`, `preferencesService`
- `hospitalImportService`, `supabaseHelpers`, `supabaseMapService`
- `rbacPatterns`

### `lib/`
- `supabase.js` — Supabase client singleton
- `queryClient.js` — React Query client config
- `utils.js` — `cn()` and general utilities
- `avatarUtils.js`

### `utils/`
`emergencyStatus`, `emergencyActions`, `emergencyRequestMapper`, `hospitalUtils`, `locationUtils`, `patientUtils`, `activityUtils`, `dataMappingUtils`, `databaseFields`, `errorHandler`, `schemaValidator`, `visitContextUtils`, `runMigrations`, `testDatabase`

### `types/`
- `database.ts` — generated Supabase types
- `emergency.ts` — emergency domain types
- `index.ts` — re-exports

### `constants/`
`colors.js`, `emergency.js`, `mapStyles.js`

---

## Routes & RBAC

| Path | Min Role | Resource |
|---|---|---|
| `/`, `/login`, `/map` | public | — |
| `/analytics` | provider | analytics |
| `/visits` | provider | visits |
| `/emergencies` | provider | emergencies |
| `/support-tickets` | provider | support |
| `/health-news` | provider | news |
| `/settings` | viewer | settings |
| `/ambulances` | org_admin | ambulances |
| `/doctors` | org_admin | doctors |
| `/verification` | org_admin | verification |
| `/users` | org_admin | users |
| `/wallet` | org_admin | wallet |
| `/pricing` | org_admin | pricing |
| `/hospitals` | org_admin | hospitals |
| `/insurance` | admin | insurance |
| `/subscriptions` | admin | subscriptions |

Role hierarchy: `patient(10) < viewer(20) < provider(40) < sponsor(60) < org_admin(80) < admin(100)`

---

## Docs Structure (`frontend/docs/`)

```
docs/
├── architecture/          # App entry audit, refactor plans, protected routes, providers
├── database/              # Schema reference, audit reports, console-app alignment matrices
├── design-system/         # Apple Glass DS, Dyrane UI DS, login evolution
├── emergency-system/      # Emergency request cycle, response system
├── implementation/        # Changelog, alignment audit program, console enhancements
│   └── console-service-alignment/
│       ├── README.md      # ← start here for alignment work
│       ├── passes/        # Pass 1–8 subplans (emergency → wallet → facility → identity → provider → visits → care/content → shell/analytics)
│       ├── contracts/     # Per-domain contract charts
│       ├── service-maps/  # Domain service maps
│       ├── services/      # Feature taxonomy, stage 5 coverage audit
│       ├── stages/        # Stage 2–6 audit docs
│       └── checklists/    # Pass 1–8 implementation checklists
├── fixes/ & fixes-completed/  # Bug fix records
├── modal-fixes/           # Ambulance/hospital modal migration
├── provider-management/   # Doctor data flow, schema alignment
├── rbac/                  # RBAC implementation summary & navigation design
├── supabase/              # Realtime testing, production readiness
├── ui-ux/                 # Context panel system, management page standards, navigation
└── user-management/       # Username system docs
```

---

## Key Conventions

- **Audit before implement.** Prove the full chain `source truth → service → hook → UI → payload → receiver → app consequence` before changing code.
- **Display IDs are labels**, not mutation identity. Internal UUIDs own all writes.
- **No parallel truth.** Console must not create patient, dispatch, payment, visit, or clinical records that `ivisit-app` cannot reconcile.
- **Parser discipline.** Normalize field shape at the service/projection boundary; never assume JSON vs scalar.
- **Encoding check.** Run mojibake check on any touched text files before committing.
- **Pass-based alignment.** Follow Stage 6 pass order (see `docs/implementation/console-service-alignment/stages/STAGE_6_IMPLEMENTATION_PASS_PLAN_2026-05-24.md`).
