# Table Domain Matrix - 2026-05-24

## Status

Started. This is the first database subtree matrix for Stage 1. It is based on static migration reads only; live/staging introspection is not yet verified.

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
| Organization | `providers` | `20260219000200_org_structure.sql:99` | UUID primary key, linked to `hospitals.id` | no display ID declared | public verified/demo provider read; service-role and org-admin hospital-scoped management | `updated_at` trigger | high: app Explore Care owns taxonomy consumption while console hospital CRUD does not expose provider taxonomy fields |
| Organization | `doctors` | `20260219000200_org_structure.sql:249` | UUID primary key | yes, stamped | public read; org admin manage | profile-to-doctor sync; doctor availability failover | high: app booking and emergency doctor assignment depend on shape |
| Organization | `doctor_schedules` | `20260219000200_org_structure.sql:276` | UUID primary key, doctor scoped | no observed display ID | public read; org admin/admin manage through doctor hospital organization | doctor/date index; no `notes` or status projection column | high: authorized doctor-shift receiver exists, while console currently bypasses it and invents date/time rows from status |
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

## Next Matrix Work

- Expand this table with exact column clusters per table.
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
