# Table Domain Matrix - 2026-05-24

## Status

Expanded reverse capability matrix. It now inventories all 45 shared source-declared tables from the reviewed migration pillars and classifies whether Console currently consumes them, truthfully operates them, must add a capability, or must deliberately leave them outside Console ownership. Static source evidence remains primary; named SELECT-only follow-ups do not prove mutation behavior.

## Sources Read

- `frontend/supabase/migrations/20260219000100_identity.sql`
- `frontend/supabase/migrations/20260219000200_org_structure.sql`
- `frontend/supabase/migrations/20260219000300_logistics.sql`
- `frontend/supabase/migrations/20260219000400_finance.sql`
- `frontend/supabase/migrations/20260219000500_ops_content.sql`
- `frontend/supabase/migrations/20260219000600_analytics.sql`
- `frontend/supabase/migrations/20260219000700_security.sql`
- `frontend/supabase/migrations/20260219000800_emergency_logic.sql`
- `frontend/supabase/migrations/20260219000900_automations.sql`
- `frontend/supabase/migrations/20260219010000_core_rpcs.sql`

## Domain Table Matrix

| Domain | Table | Source | ID Rule | Display ID | RLS/Policy Posture | Trigger/Postgres Posture | Console Alignment Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Identity | `profiles` | `20260219000100_identity.sql:15` | UUID primary key, auth-linked profile identity | yes, stamped by profile trigger | owner/admin read, owner update | profile display ID stamping; onboarding recalculation; doctor sync automation | high: role, provider type, organization, verification, and display ID must stay app-compatible |
| Identity | `preferences` | `20260219000100_identity.sql:47` | profile-owned UUID relationship | no observed display ID | user manages own preferences | `updated_at` trigger | medium/high: app owns demo/privacy behavior; console visible notification toggle is currently not wired to its valid own-user row |
| Identity | `medical_profiles` | `20260219000100_identity.sql:122` | profile-owned UUID relationship | no observed display ID | user manages own medical profile | `updated_at`; medical validation/update RPCs | high: emergency payloads depend on medical snapshot truth |
| Identity | `emergency_contacts` | `20260219000100_identity.sql:140` | UUID primary key, user scoped | yes, stamped | user manages own contacts | `updated_at`; display ID stamping | medium: console should not mutate casually unless support/admin path is defined |
| Identity | `id_mappings` | `20260219000100_identity.sql:6` | UUID primary key, entity UUID bridge | stores unique display IDs | helper-facing registry | written by display ID trigger | high: core bridge for UUID/display ID resolution |
| Identity | `subscribers` | `20260219000100_identity.sql:157` | UUID primary key | not observed | public insert, admin read | `updated_at`; Edge Functions touch subscribers | medium: website/marketing and console export flows must avoid tracked PII |
| Identity | `user_roles` | `20260219000100_identity.sql:171` | UUID primary key | no observed display ID | users see own roles | none yet | medium: RBAC docs must match policies |
| Identity | `user_sessions` | `20260219000100_identity.sql:179` | UUID primary key | no observed display ID | users see own sessions | none yet | low/medium: admin metrics may depend on stale session fields |
| Organization | `organizations` | `20260219000200_org_structure.sql:5` | UUID primary key | yes, stamped | public active read only in current source; admin CRUD policy not proven | new organization trigger creates wallet | high: console registry direct create/update/delete needs guarded admin authority; org wallet, fees, provider scoping depend on this row |
| Organization | `hospitals` | `20260219000200_org_structure.sql:19` | UUID primary key | yes, stamped | public verified read; org admin scoped management | bed normalization and dispatch eligibility triggers; availability RPC | high: app discovery, emergency, pricing, and map flows rely on exact fields |
| Organization | `hospital_import_logs` | `20260219000200_org_structure.sql:65` | UUID primary key, creator scoped | no observed display ID | admin manage; creator read/insert/update | import lifecycle record | medium/high: Console import service references it but can silently continue when the relation is missing |
| Organization | `providers` | `20260219000200_org_structure.sql:99` | UUID primary key, linked to `hospitals.id` | no display ID declared | public verified/demo provider read; service-role and org-admin hospital-scoped management | `updated_at` trigger | high: app Explore Care owns taxonomy consumption while console hospital CRUD does not expose provider taxonomy fields |
| Organization | `doctors` | `20260219000200_org_structure.sql:249` | UUID primary key | yes, stamped | public read; org admin manage | profile-to-doctor sync; doctor availability failover | high: app booking and emergency doctor assignment depend on shape |
| Organization | `doctor_schedules` | `20260219000200_org_structure.sql:276` | UUID primary key, doctor scoped | no observed display ID | public read; org admin/admin manage through doctor hospital organization | doctor/date index; no `notes` or status projection column | high: authorized doctor-shift receiver exists, while console currently bypasses it and invents date/time rows from status |
| Organization | `emergency_doctor_assignments` | `20260219000200_org_structure.sql:288` | UUID primary key, request/doctor scoped | no observed display ID | patient/request scoped read; org admin/admin manage doctor-org rows | emergency clinician assignment record | high: app/shared RPC receiver exists while Console has no table/RPC-backed clinician-assignment surface |
| Organization | `hospital_media` | `20260219000200_org_structure.sql:328` | UUID primary key, hospital scoped | no observed display ID | public active read; org admin manage own hospital media | media provenance and selected asset state | high: Console edits raw `hospitals.image` without operating app-visible media provenance rows |
| Logistics | `ambulances` | `20260219000300_logistics.sql:5` | UUID primary key | yes, stamped | public read; org admin manage | status/location/availability failover; dispatch triggers | high: emergency dispatch and realtime tracking depend on exact status/location semantics |
| Logistics | `emergency_requests` | `20260219000300_logistics.sql:31` | UUID primary key | yes, stamped | user, org admin, console/helper guarded | active-request unique indexes; status write-path enforcement; status transition logging; resource sync | critical: app and console must not bypass RPC status paths |
| Logistics | `emergency_status_transitions` | `20260219000300_logistics.sql:91` | UUID primary key | no observed display ID | scoped read | append-only intent; logging and validation triggers | critical: audit ledger for emergency status; console should not update/delete |
| Logistics | `visits` | `20260219000300_logistics.sql:142` | UUID primary key; `request_id` links emergency | yes, stamped | users see own/insert-update own; org scoped indirectly | emergency completion sync; payment approval updates visit state | high: legacy alias fields exist, app mapping must be preserved |
| Logistics | `emergency_chat_rooms` | `20260219000300_logistics.sql:199` | UUID primary key | no observed display ID | participant scoped read | ensure/archive chat RPCs | medium: emergency lifecycle can archive chat |
| Logistics | `emergency_chat_participants` | `20260219000300_logistics.sql:217` | UUID primary key | no observed display ID | participant scoped read | unique room/user constraint | medium: auth scope matters |
| Logistics | `emergency_chat_messages` | `20260219000300_logistics.sql:241` | UUID primary key | no observed display ID | participant scoped read | client message unique index; read tracking RPCs | medium: duplicate-send and read-state risks |
| Finance | `organization_wallets` | `20260219000400_finance.sql:5` | UUID primary key, unique organization | yes, stamped | org admin own wallet; admin/service paths | payment/cash RPCs update balance | critical: cash approval and platform fee integrity |
| Finance | `patient_wallets` | `20260219000400_finance.sql:15` | UUID primary key, unique user | yes, stamped | user sees own wallet | payment/tip RPCs update balance | high: app wallet methods must match console visibility |
| Finance | `ivisit_main_wallet` | `20260219000400_finance.sql:25` | UUID primary key | no observed display ID | admin manage | cash/card payment RPCs update balance | critical: platform revenue ledger target |
| Finance | `wallet_ledger` | `20260219000400_finance.sql:33` | UUID primary key | no observed display ID | admin read; RPC-owned writes expected | no FK to polymorphic wallet enforced in visible table definition | critical: page-level inserts are high-risk unless verified |
| Finance | `payment_methods` | `20260219000400_finance.sql:46` | UUID primary key | no observed display ID | user manages own methods | validation RPCs and Edge Functions | high: Stripe reflection and app checkout rely on metadata shape |
| Finance | `payments` | `20260219000400_finance.sql:63` | UUID primary key | yes, stamped | user/org scoped read | payment distribution trigger/RPC paths | critical: status, method, fee, wallet side effects must be RPC-owned |
| Finance | `exchange_rates` | `20260219000400_finance.sql:82` | UUID primary key | no observed display ID | RPC/function owned; direct console CRUD not observed | currency code constraints; stale-rate fields; app refresh function writes rates | medium/high: app billing quote and regional pricing depend on stale-rate behavior; console must not invent local FX math |
| Finance | `insurance_policies` | `20260219000400_finance.sql:132` | UUID primary key | no observed display ID | users manage own policies | insurance validation RPCs | medium: app policy UX and billing must align |
| Finance | `insurance_billing` | `20260219000400_finance.sql:146` | UUID primary key | no observed display ID | user/org/admin scoped policies | emergency completion billing trigger | medium/high: completion side effects can surprise console |
| Ops/Content | `notifications` | `20260219000500_ops_content.sql:5` | UUID primary key | yes, stamped | users see/update/insert own notifications | emergency notification trigger | high: cash approval, dispatch, and emergency events rely on it |
| Ops/Content | `support_tickets` | `20260219000500_ops_content.sql:26` | UUID primary key | no observed display ID | users manage own tickets | `updated_at` trigger | medium: console support page must respect org/user scope |
| Ops/Content | `support_faqs` | `20260219000500_ops_content.sql:40` | UUID primary key | no observed display ID | public read only; console management policy not proven | seed/upsert SQL only | medium: app reads FAQs, while dormant console service promises unauthorized browser CRUD |
| Ops/Content | `health_news` | `20260219000500_ops_content.sql:110` | UUID primary key | no observed display ID | public read when published | none yet | low/medium: discovery surfaces depend on fields |
| Ops/Content | `documents` | `20260219000500_ops_content.sql:121` | UUID primary key | no observed display ID | public-tier/admin read in current source; write/manage policy not proven | `updated_at` trigger | medium/high: table is data-room/content truth, distinct from Storage bucket uploads used by onboarding and insurance |
| Analytics | `user_activity` | `20260219000600_analytics.sql:5` | UUID primary key | no observed display ID | user own read/insert; admin read | `log_user_activity` RPC | medium: audit trail should not block main flow |
| Analytics | `admin_audit_log` | `20260219000600_analytics.sql:18` | UUID primary key | no observed display ID | admin read | admin service inserts | medium: console privileged changes need trace |
| Analytics | `search_history` | `20260219000600_analytics.sql:27` | UUID primary key | no observed display ID | users manage own; guarded admin aggregation RPC | no current cron | medium: QuickSearch writes history and analytics fallback must not invent rankings |
| Analytics | `search_selections` | `20260219000600_analytics.sql:35` | UUID primary key | no observed display ID | user/public insert and admin read | no current cron | low/medium |
| Analytics | `search_events` | `20260219000600_analytics.sql:45` | UUID primary key | no observed display ID | authenticated insert; admin read | analytics/trending RPCs | medium: console analytics surfaces use this |
| Analytics | `trending_topics` | `20260219000600_analytics.sql:63` | UUID primary key | no observed display ID | public read; admin manage | update RPCs return success without aggregation; cron not source-controlled | medium/high: visible reads are manual/read-only until a real generation receiver exists |
| Pricing | `service_pricing` | `20260219000800_emergency_logic.sql:1615` | UUID primary key | no observed display ID | public active read; org admin manage | upsert/delete RPCs; `updated_at` trigger | high: app cost calculation depends on pricing hierarchy |
| Pricing | `room_pricing` | `20260219000800_emergency_logic.sql:1628` | UUID primary key | no observed display ID | public active read; org admin manage | upsert/delete RPCs; `updated_at` trigger | high: bed request cost and availability depend on it |

## Reverse Console Capability Ledger

Classification is deliberately strict:

- `Implemented` means a rendered Console surface or active service consumes the receiver.
- `Drifted` means Console exposes the capability but its fields, authority, or lifecycle are not truthful enough for implementation closure.
- `Missing required surface` means the table/RPC supports an operator responsibility that Console must add because it manages the related app/operations flow.
- `Read-only/dependency` means Console may display scoped truth but must not create independent mutation semantics.
- `Excluded` means the table belongs to patient ownership, platform infrastructure, or another iVisit surface unless a later authorized workflow is established.

### Identity And Access

| Table | App/shared receiver role | Current Console evidence | Classification | Required Console contract | Pass |
| --- | --- | --- | --- | --- | --- |
| `id_mappings` | UUID/display-ID resolution infrastructure | `displayIdService` resolves display identity through helpers/RPC behavior; no direct table CRUD required. | Implemented infrastructure | Continue entity-aware lookup only; never add manual mapping CRUD. | Pass 4 |
| `profiles` | Auth-linked user/provider/org membership truth | Users, verification, onboarding, doctor and settings surfaces read/write profiles. | Drifted | Move creation/role/org/provider mutations behind auth/admin-authorized receivers; do not direct-insert orphan profiles. | Pass 4 |
| `preferences` | Patient/operator own preferences | `preferencesService` exists but no importer; visible Settings notification switch is fixed on. | Missing limited surface | Implement only signed-in operator notification/display preferences; keep patient consent/demo controls app-owned. | Pass 8 |
| `medical_profiles` | Patient medical record and emergency medical RPC source | `medicalProfilesService` exists with no rendered owner; source policy is owner-only. | Missing restricted read projection; CRUD excluded | Expose emergency/clinical context only through an authorized care/support receiver when required; no broad admin CRUD. | Pass 6 |
| `emergency_contacts` | Patient-owned emergency contacts used in urgent context | No active Console contact-management surface; service references are not an authorized operator owner. | Missing restricted read projection; CRUD excluded | Consume contact snapshot only within authorized emergency/detail workflow; patient remains edit owner. | Pass 1 / Pass 6 |
| `subscribers` | Marketing subscription and email lifecycle | Subscription page/hook/modal actively operate rows and email commands. | Drifted | Retain `subscriptionService` facade; enforce platform-admin scope, idempotent sends, and receiver-backed result state. | Pass 7 |
| `user_roles` | Own-user role association table | Only generated type reference found; Console uses `profiles.role`/Auth behavior instead. | Excluded from direct Console CRUD | Treat effective role changes through the approved identity/admin receiver; do not invent parallel `user_roles` administration. | Pass 4 |
| `user_sessions` | Own-user session records | `adminService` counts sessions although source policy proves users see their own sessions only. | Drifted/missing authorized audit read | Remove unsupported admin KPI or add an authorized security-audit receiver before displaying session analytics. | Pass 4 |

### Organization, Provider, And Capacity

| Table | App/shared receiver role | Current Console evidence | Classification | Required Console contract | Pass |
| --- | --- | --- | --- | --- | --- |
| `organizations` | Organization identity and wallet trigger parent | Organization registry direct CRUD and onboarding paths exist. | Drifted | Add guarded registry/onboarding authority and preserve organization-versus-hospital identity. | Pass 4 |
| `hospitals` | Facility, verification, capacity, dispatch eligibility | Hospital CRUD/modal/import/capacity surfaces are active. | Drifted | Keep metadata CRUD scoped; use operational availability receiver; add taxonomy/eligibility support. | Pass 3 / Pass 4 |
| `hospital_import_logs` | Import provenance and status record | `hospitalImportService` writes/reads it and catches missing-relation errors; no clear operator history surface was proven. | Implemented service, incomplete visibility | Render import outcome/history where import is enabled and stop treating absent log storage as successful provenance. | Pass 3 |
| `providers` | Explore Care/provider taxonomy catalog beneath hospitals | No runtime table operation found; Console hospital form omits provider taxonomy/eligibility fields. | Missing required surface | Add deliberate catalog/classification management or an authorized projection so Console can operate all provider types the app consumes. | Pass 3 |
| `doctors` | Provider directory and availability | Doctor pages/modals/services are active. | Drifted | Align profile linkage and directory-owned fields; avoid duplicate trigger-created doctors. | Pass 5 |
| `doctor_schedules` | Persisted doctor shifts | Runtime only carries types; scheduling service manufactures status-derived rows. | Missing required surface | Implement stored shift read/CRUD/conflict/statistics through organization-authorized rows. | Pass 5 |
| `emergency_doctor_assignments` | Clinician assignment to emergency requests | Type reference only; Console emergency response chooses a doctor object but does not use the assignment table/RPC receiver. | Missing required surface | Add assignment/readiness/handoff command and detail projection through guarded clinician-assignment receiver. | Pass 1 / Pass 5 |
| `hospital_media` | Facility media provenance and active image selection | Type reference only; Console writes raw `hospitals.image`. | Missing required surface | Manage or explicitly preserve media provenance when Console modifies facility presentation. | Pass 3 |

### Emergency, Dispatch, And Communication

| Table | App/shared receiver role | Current Console evidence | Classification | Required Console contract | Pass |
| --- | --- | --- | --- | --- | --- |
| `ambulances` | Fleet identity, assignment, active trip telemetry | Fleet, map and driver surfaces are active. | Drifted | Correct hospital/org identity and status enums; use request-coupled telemetry for active trips. | Pass 5 |
| `emergency_requests` | Canonical urgent request lifecycle | Emergency list/detail/map/actions are active. | Drifted critical | Use app-parity create and guarded lifecycle RPCs; normalize detail/mobile projection. | Pass 1 |
| `emergency_status_transitions` | Append-only lifecycle evidence | No rendered transition timeline found outside generated types. | Missing required read surface; mutation excluded | Show scoped status history/audit in emergency detail; never allow update/delete. | Pass 1 |
| `visits` | Clinical/admin visits and request-derived handoff rows | Visits and emergency-detail lookups are active. | Drifted | Separate administrative visits from request-owned rows; use canonical request lookup and read-only clinical completion unless authorized. | Pass 6 |
| `emergency_chat_rooms` | Request-linked urgent communication room | Type-only Console reference; app owns actual chat service/RPC flow. | Missing required surface | Console dispatch/provider workflow needs scoped room access for emergencies it operates. | Pass 1 |
| `emergency_chat_participants` | Authorized room participants/read state | Type-only Console reference. | Missing required surface | Consume participant/read visibility through the chat workflow receiver; no direct membership editing outside authorized RPC. | Pass 1 |
| `emergency_chat_messages` | Urgent message thread and read tracking | Type-only Console reference; app implements send/read/realtime. | Missing required surface | Add guarded send/read/realtime thread capability for operated emergencies, preserving app communication truth. | Pass 1 |

### Payments, Billing, And Insurance

| Table | App/shared receiver role | Current Console evidence | Classification | Required Console contract | Pass |
| --- | --- | --- | --- | --- | --- |
| `organization_wallets` | Provider organization balance | Wallet surface and organization service consume it. | Drifted | Read scoped wallet truth and route money movement through verified backend commands. | Pass 2 |
| `patient_wallets` | Patient-owned payment balance | Schema/helper references only; no Console patient-wallet management surface proven. | Excluded from general CRUD | Only expose a restricted support/audit read if an authorized receiver and user-support need are established. | Pass 2 |
| `ivisit_main_wallet` | Platform wallet | Admin wallet surface reads it. | Implemented, lifecycle-sensitive | Keep admin-only summary; reflect balance changes only from settled backend truth. | Pass 2 |
| `wallet_ledger` | Append-only money evidence | Wallet pages/services read it and repair-adjacent behavior exists. | Drifted critical | Treat as append-only/read projection; remove normal UI repair mutation and prove scoped ledger visibility. | Pass 2 |
| `payment_methods` | Patient/organization Stripe method reflection | Emergency/payment/card behavior references payment methods; organization receiver fields are drifted. | Drifted | Keep Stripe/RPC/Edge ownership; do not direct-manage organization methods against absent fields. | Pass 2 |
| `payments` | Payment state and settlement linkage | Emergency and wallet workflows consume payments. | Drifted critical | Do not show completion before confirmation; consolidate cash/card/wallet/approval state. | Pass 1 / Pass 2 |
| `exchange_rates` | App-owned quote/settlement conversion cache | Generated type only; no Console FX service or rendered quote. | Read-only/dependency | Expose currency/rate basis only if finance reporting needs it; no independent Console conversion/write logic. | Pass 2 |
| `insurance_policies` | Patient insurance policy and coverage input | Insurance page/modal/services actively promise administrative operations. | Drifted/unauthorized | Use one facade and add guarded admin/support authority before verification or patient-policy mutation. | Pass 7 |
| `insurance_billing` | Emergency-completion insurance claim/billing result | Generated type only; no rendered Console billing outcome surface. | Missing required read/action surface | Add scoped billing/claim visibility for hospitals/admin and any authorized exception workflow; preserve trigger-owned creation. | Pass 2 / Pass 7 |

### Content, Support, And Notifications

| Table | App/shared receiver role | Current Console evidence | Classification | Required Console contract | Pass |
| --- | --- | --- | --- | --- | --- |
| `notifications` | User/operator event notifications | Notification service and center are active. | Implemented with policy gaps | Keep operator stream scoped; do not claim unsupported patient delete/lifecycle operations. | Pass 7 / Pass 8 |
| `support_tickets` | Patient support requests and management state | Support page/hook/service are active. | Drifted | Reconcile receipt fields, response model, roles, assignment and delete authority. | Pass 7 |
| `support_faqs` | Public patient knowledge-base reads | Dormant Console CRUD adapter; app actively reads FAQs. | Excluded from current Console authoring | Keep read truth in app; add Console authoring only after admin receiver and explicit route exist. | Pass 7 |
| `health_news` | Published public health-content feed | Console management page exposes draft/edit/publish actions. | Drifted/unauthorized | Retain curated published-feed contract only until fields and authoring policy exist. | Pass 7 |
| `documents` | Data-room/content document rows | Console uploads Storage objects named `documents`, but no table CRUD surface exists. | Excluded from Console; owned by `iVisit-docs` boundary | Do not conflate Storage evidence with data-room records or build Console data-room management. | Pass 7 |

### Analytics, Audit, Search, And Pricing

| Table | App/shared receiver role | Current Console evidence | Classification | Required Console contract | Pass |
| --- | --- | --- | --- | --- | --- |
| `user_activity` | Low-risk activity feed via guarded RPCs | Activity service/hook/context consume it; broad realtime duplicates ownership. | Implemented/read-owner drift | Consolidate read/realtime owner; do not use as critical mutation audit evidence. | Pass 8 |
| `admin_audit_log` | Privileged admin action evidence | `adminService` inserts and reads it; logging failures can be swallowed. | Implemented/incomplete guarantee | Make critical admin actions fail visibly or prove durable audit persistence. | Pass 4 / Pass 8 |
| `search_history` | User-private recent search state | QuickSearch writes through `searchService`; separate adapter dormant. | Implemented with duplicate adapter | Keep QuickSearch owner and privacy boundary; do not globally expose raw history. | Pass 8 |
| `search_selections` | Search selection telemetry | QuickSearch writes through `searchService`; separate adapter dormant. | Implemented with duplicate adapter | Keep permitted write path and aggregate/admin reads only when authorized. | Pass 8 |
| `search_events` | Search analytics input | Search/analytics services can write/read events. | Implemented/analytics truth drift | Use guarded aggregation and eliminate fabricated fallback results. | Pass 8 |
| `trending_topics` | Visible trend rows; optional generated refresh | Adapter exists without direct rendered management; generation RPCs are no-op success paths. | Read-only/manual; generated capability missing | Allow labelled manual reads only; disable regeneration until receiver does real work. | Pass 8 |
| `service_pricing` | Facility service prices | Pricing page/service actively CRUD rows. | Drifted scope | Require facility identity; do not present earliest-hospital writes as organization pricing. | Pass 3 |
| `room_pricing` | Facility room/bed category prices | Pricing page/service actively CRUD rows. | Drifted scope | Require facility/room category truth and align reservation/capacity display. | Pass 3 |

## Early Findings

1. `DATABASE_SCHEMA_REFERENCE.md` is stale or incomplete for Stage 1. It uses older examples such as `request_id` on emergency requests where current migrations use `display_id`, and it omits many current finance, chat, pricing, and automation fields.
2. The current database source enables `pgcrypto` and `postgis`, but not `pg_cron`. Existing architecture docs mention that a cron migration is needed for subscriber processing or trending updates.
3. `emergency_requests` is the critical table: unique active-request indexes, status transition triggers, and `ivisit.*` session settings mean direct page updates can bypass core evidence unless they go through approved RPCs.
4. `visits` intentionally carries legacy alias columns such as `hospital`, `doctor`, and `image`; cleanup must not remove those until app mappings are proven.
5. `wallet_ledger` has polymorphic wallet references and should be treated as RPC-owned unless a service path is explicitly verified.
6. `providers`, `doctors`, `hospitals`, and `organizations` need a provider-model audit because discovery and console operations can overlap.
7. SELECT-only follow-up confirms `insurance_policies` exposes modern app/console fields not declared by the current finance pillar table source; its RLS remains owner-only while console promises administrative policy management.
8. SELECT-only follow-up confirms `support_tickets.admin_response` and `health_news.description/content/icon` are absent from the deployed selectable surface even though app or console UI paths write or collect them.
9. Current RLS source provides public published health-news reads but no draft/authoring management policy, and notifications provide no DELETE policy for app clear/delete behavior.
10. SELECT-only follow-up confirms organization billing-method fields (`stripe_customer_id`, `payout_method_id`, `payout_method_last4`, `payout_method_brand`) are absent on live `organizations` but present on `profiles`; the app-owned organization billing function and console payout display currently target the wrong receiver surface.
11. Static function mapping confirms the public app-owned `discover-hospitals` function can persist `hospitals` and `providers` through a service-role client with merge enabled by default, while console hospital CRUD does not expose the taxonomy and eligibility fields that govern emergency versus Explore Care behavior.
12. Finance source mapping confirms the console cash preflight neither reads `eligible` from its JSON result nor checks the stated fee amount, and its manual completed-cash insertion path is skipped by the non-cash completion settlement trigger. Current org-admin wallet rendering additionally depends on ledger access not granted by the source RLS policy.
13. Pricing is persisted per hospital, but the console org-admin pricing surface silently maps an organization override to its earliest hospital and omits facility identity in rendering; app patient quotes can therefore diverge across sibling hospitals.
14. The rendered responder telemetry action uses the canonical request-scoped RPC, but an exported ambulance hook still exposes direct location mutation that does not update request telemetry.
15. Facility verification updates the dispatch-authority fields, while profile-provider approval updates `bvn_verified` through a direct mutation blocked for admins by current profile RLS and does not establish hospital dispatchability.
16. Provider onboarding currently inserts a hospital as though it were an organization and assigns that hospital UUID to `profiles.organization_id`, whose foreign key points to `organizations`; no direct onboarding hospital insert policy was observed in current RLS source.
17. Organization registry UI and service direct-write `organizations`, but current RLS source only proves public active organization SELECT; admin create/update/delete should move behind a guarded receiver or policy proof.
18. Billing FX quote behavior is app-owned through preferences, billing quote RPCs, exchange-rate data, and app-owned Edge Functions; no console FX quote surface was found, so console finance dashboards must not invent conversion or regional-pricing math.
19. `documents` table data-room/content rows are not the same as Supabase Storage `documents` bucket uploads used by onboarding and insurance; no active console data-room CRUD was found.
20. Storage buckets are separate from public table truth. `images` uploads are used by hospital, doctor, and ambulance modals, and `documents` uploads are used by onboarding/insurance, but the active migration source did not prove current `storage.objects` policies. Treat Storage policy introspection as a separate database-truth checkpoint before implementation.
21. Bed reservation UI reads `emergency_requests` as the active-reservation source, which matches request-owned app projections, but its action and capacity display are drifted: the Cancel button calls a nonexistent service method, completed requests are counted as occupied, and room-bucket availability is not reconciled with `bed_availability` or `room_pricing`.
22. Dispatch and responder telemetry should stay RPC-owned. The main page and map panel currently share the dispatch service but not the same preflight/user-message path, and ambulance selection is first-available rather than route/ETA optimized.
23. Mobile emergency rendering currently assumes legacy alias fields that are not synthesized by the page normalizer, so the same `emergency_requests` row can render patient, location, contact, and responder context differently on mobile versus desktop.
24. Location shape handling is fragmented: create/update paths accept broader coordinate forms than display helpers, and existing schema guards already flag alias fields that mobile still renders.
25. Ambulance identity handling mixes `organization_id` and `hospital_id`: org-admin create/driver-selection paths can place an organization UUID in `ambulances.hospital_id`, while list and service queries use different scope fields.
26. Ambulance responsive projections use display-only or invalid fields: station labels rely on absent `ambulance.hospital`, rating is not table truth, and desktop/mobile status filters disagree on `on_route` versus `en_route`.
27. Verification queue status vocabulary is drifted: provider review is backed by `profiles.bvn_verified`, facility review by `hospitals.verification_status`, but the shared UI uses `approved` for organization filtering even though stored organization success is `verified`. Provider rejection currently has no distinct receiver state.
28. Onboarding and facility claim logic still confuse hospital identity with organization identity. Claim checks use `verified` alone and can miss `verification_status = pending`; submission inserts a hospital row and attempts to store the hospital UUID in `profiles.organization_id`, whose source-of-truth FK is `organizations.id`.
29. Facility CRUD cannot yet operate the app's full provider-discovery model. Console edit fields omit `provider_type`, `emergency_eligible`, `booking_eligible`, `provider_source`, and `category_confidence`; the hospital update RPC ignores `emergency_wait_time_minutes`; and Google autofill expects a response shape that differs from the app-owned discovery handler.
30. Invites are not yet a complete profile-provisioning receiver. The visible invite function returns an action link without sending email, rejects authenticated org-admin callers while the UI allows them, and profile creation ignores invite metadata needed for `profiles.organization_id` and `provider_type`.
31. Emergency detail surfaces need field-shape proof per rendered field. `ambulance_type` is scalar text in the console schema and must not be parsed as JSON unless it is actually a JSON-looking string; the same rule applies to location, metadata, cost, and snapshot fields before they reach JSX.
32. Visits are both administrative clinical records and emergency-derived history rows. Console currently direct-writes/deletes `visits`, while emergency/payment RPCs create and mutate rows through `request_id`; implementation must separate administrative visit CRUD from emergency-owned visit lifecycle.
33. Insurance policy fields need semantic reconciliation before CRUD: console displays coverage as a dollar amount, services can persist it into `coverage_percentage`, billing SQL uses `coverage_percentage`, and legacy validation still references `coverage_amount`.
34. Support tickets need schema and role reconciliation: the app writes `admin_response`, console management assumes `organization_id` and provider/org-admin actions, but the current table/policy proof only supports the base ticket fields plus owner/admin management.
35. FAQ reads are app-consumed public content, while console `supportFaqsService` exposes unused direct CRUD with no proven management policy; do not enable console authoring from the dormant adapter.
36. QuickSearch is an active console surface, but ambulance queries select/filter `ambulances.hospital`, which is absent from logistics truth and can make the shared global-search request return no results.
37. Search aggregation receiver authorization is present for admins, but console fallback data invents ranked search terms on RPC failure; trends must remain manual/read-only until generation is real.
38. Preferences are split by ownership: app emergency/demo/privacy behavior consumes the user preference row, while console renders an unwired notification switch. Console may write only the operator's own notification setting, not patient consent behavior.
39. Dashboard analytics currently substitutes positive or plausible-looking data for missing truth: `95%` success with no requests, operational mock fallback rows, estimated responder counts, and fixed performance telemetry.
40. Staff scheduling has a real receiver and a false projection: `doctor_schedules` is org-admin/admin manageable in source policy, but console reads no stored shifts, writes only `doctors.status`, invents shift dates/times, and attempts fleet context through absent `ambulances.hospital`. Pass 5 must adopt table-backed doctor shifts and leave ambulance shift CRUD out until it has a persisted receiver.
41. The complete migration inventory contains 45 source-declared tables, including `hospital_import_logs`, `hospital_media`, and `emergency_doctor_assignments`, which were not in the earlier matrix rows. Coverage claims must use the migration inventory, not merely Console service references.
42. Console has no runtime implementation for app-backed emergency communication tables (`emergency_chat_rooms`, `emergency_chat_participants`, `emergency_chat_messages`). Because Console operates emergency response, this is a required scoped operational surface, not an optional patient-only feature.
43. Console has no persisted clinician-assignment surface for `emergency_doctor_assignments`, even though emergencies and doctor operations are already rendered. Emergency/provider passes must include guarded doctor assignment and handoff truth.
44. `hospital_media` and `providers` prove that facility management is broader than hospital row CRUD: Console cannot yet operate app-visible provider catalog classification or media provenance while it can alter the base facility row/image.
45. `insurance_billing` is trigger-backed claim/billing truth with hospital/admin read scope, but Console currently has no billing-outcome view or authorized exception-handling lane. Policy management alone does not cover insurance operations.

## Next Matrix Work

- Keep the 45-table reverse capability ledger current whenever the shared source adds, archives, or reassigns a table.
- Expand high-risk implementation-pass rows with exact column clusters per table.
- Add policy names and helper functions per table.
- Add trigger names and side effects per table.
- Compare against `ivisit-app/supabase/tests/validation/table_flow_trace_*.md`.
- Mark tables as `aligned`, `drift suspected`, or `needs live introspection`.
- Add a Storage policy appendix for buckets, paths, public/private status, signed URL strategy, and object cleanup semantics.
- Add a bed-reservation appendix that maps request statuses, room buckets, pricing rows, and discharge/cancel side effects to UI labels and actions.
- Add a dispatch-entrypoint appendix that compares desktop, mobile, map-panel, and detail-modal actions against the same RPC guards and preflight requirements.
- Add a responsive-surface projection appendix that proves mobile and desktop read the same normalized field names for each emergency row.
- Add a render-coercion appendix for drift-suspected detail modals: raw DB field, expected type, allowed legacy shapes, helper/mapper owner, UI label, and crash/fallback behavior.
- Add a scheduling appendix that separates `doctor_schedules` shift CRUD/conflict windows from `doctors` availability and from ambulance fleet/crew assignment context.
- Add a visits appendix that maps `id/display_id`, `request_id`, `hospital_id`, status/type vocabulary, clinical summary fields, and delete/edit eligibility to both administrative and emergency-owned rows.
- Add an insurance appendix that resolves policy owner authority, `coverage_amount` versus `coverage_percentage`, card-image Storage policy, signed URL expiry, and duplicate service ownership.
- Add a support-ticket appendix for app create payload, console receipt fields, response ownership, assignment labels, `organization_id` scope, and delete/status authority.
- Add a location-shape appendix that covers PostGIS hex, WKT, GeoJSON, `lat/lng`, `latitude/longitude`, address objects, and reverse-geocode side effects.
- Add an identity-chain appendix for `organizations -> hospitals -> ambulances -> profiles`, including which UUID is allowed in each UI field and mutation payload.
- Add an ambulance projection appendix that maps every fleet card/table/mobile field to an actual ambulance or joined hospital/profile column.
- Add a verification-state appendix that separates provider BVN review, facility dispatch verification, rejection notes, and bulk-action receivers.
- Add an onboarding-claim appendix that maps create/claim flow from admin auth user to `organizations`, `hospitals`, `organization_wallets`, and org-admin profile authority.
- Add a hospital-discovery appendix that maps console facility CRUD fields to app `nearby_hospitals`, `nearby_providers`, discovery Edge Function output, media provenance, and derived dispatch/booking eligibility.
- Add an invite-provisioning appendix that maps invite metadata to auth user metadata, `handle_new_user`, profile role/org/provider fields, email delivery, and org-admin/provider first-login readiness.
- Add a dashboard-truth appendix that maps every KPI and performance label to a receiver, explicit derivation, or unavailable state and prohibits production mock fallback.
- Add a QuickSearch projection appendix that maps each result category to valid joined/display fields and its permitted history/selection telemetry.
- Add a preference ownership appendix that separates operator display/notification settings from app-owned demo coverage and patient-sharing consent.
- Add a support-content appendix that treats FAQ read delivery separately from any future authorized authoring workflow.
