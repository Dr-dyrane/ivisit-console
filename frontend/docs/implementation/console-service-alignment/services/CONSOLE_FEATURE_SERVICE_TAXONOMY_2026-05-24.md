# Console Feature Service Taxonomy - 2026-05-24

## Status

Service taxonomy and review gate. Planning only; no product, database, Edge Function, cleanup, seed, migration, email, payment, storage upload, or runtime mutation is authorized by this document.

## Purpose

The console is larger than seven or eight features. The numbered implementation passes are execution batches, not the product taxonomy. This document names the actual console feature lanes so every service review has a deliberate home and future implementation does not skip lower-visibility surfaces.

Canonical service inventory source:

- `frontend/src/services/*.js`
- Stage 5 full service coverage audit
- source import scans across `frontend/src`

## Feature Lanes

| Feature lane | Product meaning | Services in lane | Primary pass |
| --- | --- | --- | --- |
| Emergency command center | Request list, detail, cash approval, retry payment, dispatch legality, completion. | `emergencyService.js`, `emergencyResponseService.js`, `walletService.js`, `visitsService.js` | Pass 1 |
| Emergency detail and clinical handoff | Modal/list/table detail, request-derived visit, payment visibility, scoped realtime. | `emergencyService.js`, `visitsService.js`, `medicalProfilesService.js` | Pass 1 / Pass 6 |
| Emergency communication and transition history | Status timeline, request-scoped patient/provider chat, participants, read state, message sending. | Missing Console service for shared chat/transition receivers. | Pass 1 |
| Wallet and ledger operations | Platform/org wallet summary, ledger, payments, projections, cash-fee reflection. | `walletService.js`, `activityService.js`, `organizationsService.js` | Pass 2 |
| Stripe billing and payout methods | Setup intents, saved cards, payout methods, top-up, payout, webhook reflection. | `walletService.js` | Pass 2 |
| Facility registry | Hospital/facility CRUD, verification flags, org ownership, app-visible facility truth. | `hospitalsService.js`, `organizationsService.js`, `displayIdService.js` | Pass 3 / Pass 4 |
| Capacity and bed management | Bed counts, reservations, availability, discharge/cancel/arrived actions. | `bedManagementService.js`, `hospitalsService.js`, `emergencyService.js` | Pass 3 |
| Facility discovery and import | Google/Edge discovery, import approval/rejection, assignment, discovery fallback. | `hospitalImportService.js`, `hospitalsService.js` | Pass 3 |
| Provider catalog and facility media provenance | App-visible provider classification, emergency/booking eligibility, media source/confidence/selection. | Missing Console service boundary for `providers` and `hospital_media`; current hospital/image paths are insufficient. | Pass 3 |
| Pricing management | Service pricing, room pricing, global/org/hospital scope, app checkout parity. | `pricingService.js`, `hospitalsService.js`, `organizationsService.js` | Pass 3 |
| Organization registry | Organization CRUD, wallet scope, user/org/facility relationships. | `organizationsService.js`, `profilesService.js`, `walletService.js` | Pass 4 |
| Onboarding | New org admin account, organization/facility setup, verification docs, onboarding status. | `onboardingService.js`, `authService.js`, `profilesService.js`, `organizationsService.js`, `storageService.js` | Pass 4 |
| Provider and organization verification | Provider profile verification, organization/facility queue, readiness semantics. | `verificationService.js`, `orgVerificationService.js`, `rbacPatterns.js`, `displayIdService.js` | Pass 4 |
| User/admin identity and access | Auth, profiles, invites, roles, status, suspend/delete, display IDs. | `adminService.js`, `authService.js`, `profilesService.js`, `displayIdService.js`, `rbacPatterns.js` | Pass 4 |
| Ambulance fleet | Ambulance CRUD, vehicle status, driver assignment, hospital/org scope, media. | `ambulancesService.js`, `driverManagementService.js`, `storageService.js` | Pass 5 |
| Driver and responder operations | Active assignment, trip status, responder location, telemetry freshness. | `driverManagementService.js`, `emergencyResponseService.js`, `supabaseMapService.js` | Pass 5 |
| Doctor/provider operations | Doctor CRUD, profile linkage, availability, provider readiness. | `doctorsService.js`, `profilesService.js`, `verificationService.js`, `storageService.js` | Pass 5 |
| Emergency clinician assignment | Assign/track clinician handoff for an operated emergency request. | Missing Console command/read owner for `emergency_doctor_assignments`. | Pass 1 / Pass 5 |
| Staff scheduling | Doctor shifts, crew projections, conflict checks, schedule realtime. | `staffSchedulingService.js`, `doctorsService.js`, `ambulancesService.js` | Pass 5 |
| Operations map | God mode map, map projections, nearby hospitals, scoped realtime, fallback map provider. | `supabaseMapService.js`, `emergencyResponseService.js`, `driverManagementService.js` | Pass 5 / Pass 8 |
| Visits and clinical records | Visit list/detail/actions, emergency-derived history, doctor/hospital/patient hydration. | `visitsService.js`, `doctorsService.js`, `hospitalsService.js`, `profilesService.js`, `emergencyService.js` | Pass 6 |
| Medical profile support | Patient medical profile, allergies, medications, emergency contacts, clinical visibility. | `medicalProfilesService.js`, `preferencesService.js` | Pass 6 / Pass 7 |
| Insurance management | Policy CRUD, verification, card images, admin/patient scope. | `insuranceService.js`, `insurancePoliciesService.js`, `storageService.js` | Pass 7 |
| Insurance billing outcomes | Trigger-created emergency billing/claim visibility and authorized exception handling. | Missing Console service/view for `insurance_billing`. | Pass 2 / Pass 7 |
| Support operations | Support tickets, assignment, status, patient receipt, analytics. | `supportTicketsService.js`, `notificationService.js` | Pass 7 |
| Support knowledge base | Patient-app FAQ read truth; console authoring remains dormant until an authorized receiver/route exists. | `supportFaqsService.js` | Pass 7 |
| Health content | Curated published health-news feed; article-body/draft authoring remains disabled until fields and write policy exist. | `healthNewsService.js`, `notificationService.js`, `storageService.js` | Pass 7 |
| Subscription and email | Subscriber intake/read, currently unsupported edit/delete/status promises, welcome/custom/bulk email commands, realtime. | `subscriptionService.js`, `subscribersService.js` | Pass 7 |
| Notifications | Operator notifications, patient notification policy drift, action metadata. | `notificationService.js`, `preferencesService.js` | Pass 7 / Pass 8 |
| Dashboard analytics | Summary analytics, finance analytics, role-scoped charts, source labels. | `analyticsService.js`, `walletService.js`, `searchAnalyticsService.js` | Pass 8 |
| Search and quick navigation | Global search, recent searches, trending search, result selection. | `searchService.js`, `searchHistoryService.js`, `searchSelectionsService.js`, `searchEventsService.js` | Pass 8 |
| Search analytics and trends | Search aggregation, trending topics, regeneration, automation truth labels. | `searchAnalyticsService.js`, `trendingTopicsService.js`, `analyticsAutomationService.js` | Pass 8 |
| Preferences and demo mode | User preferences, demo mode, notification preferences, sharing flags. | `preferencesService.js` | Pass 8 |
| Activity and audit trail | User activity, entity activity, audit helpers, critical mutation evidence. | `activityService.js`, `supabaseHelpers.js` | Pass 2 / Pass 8 |
| Storage and media infrastructure | Image upload/URL helpers across hospital, ambulance, doctor, insurance, content. | `storageService.js` | Pass 3 / Pass 5 / Pass 7 |
| Shared Supabase infrastructure | Retry, timeout, batch, realtime, audit helper candidates. | `supabaseHelpers.js`, `rbacPatterns.js`, `authService.js` | Pass 4 / Pass 8 |

## Service Review Matrix

| Service | Feature lanes | Review depth required | Key review question |
| --- | --- | --- | --- |
| `activityService.js` | Activity and audit trail; wallet and dashboard support. | Medium | Which actions are operational audit truth versus low-risk UI activity? |
| `adminService.js` | User/admin identity and access. | High | Which destructive user operations require RPC/Edge/Auth admin authority instead of direct profile writes? |
| `ambulancesService.js` | Ambulance fleet; staff scheduling. | High | Does CRUD preserve driver assignment, organization scope, active trip constraints, and app map visibility? |
| `analyticsAutomationService.js` | Search analytics and trends. | Medium | Do trend refresh calls perform real work or return success for stubbed/no-op receivers? |
| `analyticsService.js` | Dashboard analytics. | Medium | Are metrics live, derived, cached, partial, demo, or unavailable? |
| `authService.js` | User/admin identity and access; shared infrastructure. | High | Are client-side auth helpers only scoping reads, or are they being mistaken for authorization? |
| `bedManagementService.js` | Capacity and bed management. | High | Which field/receiver owns app-visible bed availability and reservation lifecycle? |
| `displayIdService.js` | Identity, facility registry, verification. | Medium | Are display IDs resolved entity-aware before mutation paths depend on them? |
| `doctorsService.js` | Doctor/provider operations; visits. | High | Does doctor CRUD preserve profile linkage, readiness, scheduling, and visit context? |
| `driverManagementService.js` | Driver and responder operations; map telemetry. | High | Are driver assignment and trip status coupled to active backend emergency truth? |
| `emergencyResponseService.js` | Emergency command center; responder telemetry. | High | Does every dispatch/location/completion command respect legal request lifecycle? |
| `emergencyService.js` | Emergency command center; clinical handoff; visits. | High | Is the emergency detail/list owner authoritative for request, payment, cash, and visit linkage state? |
| `healthNewsService.js` | Health content. | Medium | Remove unsupported CMS-style controls and keep current reads aligned to the curated published-feed receiver. |
| `hospitalImportService.js` | Facility discovery and import. | High | Can discovery fallback create or imply canonical provider truth without authorized import? |
| `hospitalsService.js` | Facility registry; capacity; pricing; visits. | High | Do hospital writes preserve app-visible facility, capacity, verification, and pricing semantics? |
| `insurancePoliciesService.js` | Insurance management. | High | Is this a compatibility wrapper or duplicate owner for policy CRUD/document updates? |
| `insuranceService.js` | Insurance management. | High | Are admin/org-admin insurance promises authorized by RLS/RPC, and are card images private? |
| `medicalProfilesService.js` | Medical profile support; clinical records. | High | Can console read/update medical data under a controlled clinical/support access model? |
| `notificationService.js` | Notifications; support/content side effects. | Medium | Which notifications are operator-local versus patient-facing lifecycle truth? |
| `onboardingService.js` | Onboarding; organization registry. | High | Does onboarding create/link organization, facility, and profile truth in the canonical tables? |
| `organizationsService.js` | Organization registry; wallet/facility/pricing/subscriber scope. | High | What does `organizations` own versus `hospitals`, and what does `profiles.organization_id` reference? |
| `orgVerificationService.js` | Provider and organization verification. | High | Does org/facility approval grant only the readiness it actually controls? |
| `preferencesService.js` | Preferences and demo mode; notifications; medical sharing. | Medium | Are preferences enforced by backend policy or only rendered as UI toggles? |
| `pricingService.js` | Pricing management. | High | Are global, organization, hospital, room, and service pricing scopes explicit before writes? |
| `profilesService.js` | User/admin identity; provider ops; visits. | High | Are profile writes separate from Auth identity and role/verification authority? |
| `rbacPatterns.js` | Shared infrastructure; verification. | High | Are RBAC helpers current, used intentionally, and never replacing RLS/RPC authorization? |
| `searchAnalyticsService.js` | Search analytics and trends. | Medium | Does aggregation use authorized RPC/view truth rather than private row leakage? |
| `searchEventsService.js` | Search analytics and trends; quick navigation telemetry. | Medium | Should quick search emit event rows, and who can read them? |
| `searchHistoryService.js` | Search and quick navigation. | Medium | Is search history user-private, aggregate-only, or console-visible under a policy? |
| `searchSelectionsService.js` | Search and quick navigation. | Medium | Are selections private, analytics events, or reusable saved search state? |
| `searchService.js` | Search and quick navigation. | Medium | Does QuickSearch truthfully record history/selections/trends or label them unavailable? |
| `staffSchedulingService.js` | Staff scheduling. | High | Is scheduling doctor-only, projected crew-only, or a real multi-resource schedule owner? |
| `storageService.js` | Storage and media infrastructure. | High | Which uploads are public, private, signed, replaceable, and policy-protected? |
| `subscribersService.js` | Subscription and email. | High | Is this retained as table adapter or retired under `subscriptionService`? |
| `subscriptionService.js` | Subscription and email. | High | Is there one idempotent owner for create, welcome, custom, and bulk email lifecycle? |
| `supabaseHelpers.js` | Shared Supabase infrastructure; activity/audit. | Medium | Should retry/realtime/audit helpers become the standard, or remain unused? |
| `supabaseMapService.js` | Operations map; telemetry. | High | Does map projection read only scoped backend truth and avoid becoming durable state owner? |
| `supportFaqsService.js` | Support knowledge base. | Medium | Is FAQ management retained, wired to a route, or intentionally retired? |
| `supportTicketsService.js` | Support operations. | High | Can app-created tickets persist and be operated in console with the same field contract? |
| `trendingTopicsService.js` | Search analytics and trends. | Medium | Are trend rows manual, generated, live, stale, or unavailable? |
| `verificationService.js` | Provider and organization verification. | High | Does profile verification avoid implying facility dispatch certification? |
| `visitsService.js` | Visits and clinical records; emergency handoff. | High | Are visit reads/actions and request-derived clinical records owned in one projection? |
| `walletService.js` | Wallet/ledger; Stripe; cash payment. | High | Are money movement, ledger mutation, and Stripe state reflected only after backend truth confirms them? |

## Feature Review Gates

Before any implementation pass starts, the feature lane must answer:

- Which service is the read owner?
- Which service/RPC/Edge Function is the write owner?
- Is the lane app-parity, console-only, or shared ecosystem infrastructure?
- Which rows are user-private, organization-scoped, platform-scoped, or public?
- Which realtime channel is authoritative, if any?
- Which user-facing fields must show degraded or unavailable states?
- Which success messages require backend confirmation?
- Which service duplicates must be consolidated or intentionally layered?
- Which storage/media paths must be public, private, signed, or app-owned?
- Which verification/RLS/RPC checks are required before browser smoke testing?

## Anti-Bloat Rule

Do not create a new doc for a service just because the service exists. Create a dedicated deep-dive doc only when at least one condition is true:

- money movement or ledger mutation
- emergency dispatch, tracking, or payment release
- medical/insurance/private patient data
- Auth, role, onboarding, or verification authority
- cross-surface patient app parity
- schema/RLS/RPC/Edge receiver drift
- historical repair or maintenance action

Otherwise, update this taxonomy, Stage 5, or the relevant pass subplan.
