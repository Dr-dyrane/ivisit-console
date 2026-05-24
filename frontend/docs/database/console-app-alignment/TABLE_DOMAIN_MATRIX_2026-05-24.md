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
| Identity | `preferences` | `20260219000100_identity.sql:47` | profile-owned UUID relationship | no observed display ID | user manages own preferences | `updated_at` trigger | medium: app preference shape may exceed console assumptions |
| Identity | `medical_profiles` | `20260219000100_identity.sql:122` | profile-owned UUID relationship | no observed display ID | user manages own medical profile | `updated_at`; medical validation/update RPCs | high: emergency payloads depend on medical snapshot truth |
| Identity | `emergency_contacts` | `20260219000100_identity.sql:140` | UUID primary key, user scoped | yes, stamped | user manages own contacts | `updated_at`; display ID stamping | medium: console should not mutate casually unless support/admin path is defined |
| Identity | `id_mappings` | `20260219000100_identity.sql:6` | UUID primary key, entity UUID bridge | stores unique display IDs | helper-facing registry | written by display ID trigger | high: core bridge for UUID/display ID resolution |
| Identity | `subscribers` | `20260219000100_identity.sql:157` | UUID primary key | not observed | public insert, admin read | `updated_at`; Edge Functions touch subscribers | medium: website/marketing and console export flows must avoid tracked PII |
| Identity | `user_roles` | `20260219000100_identity.sql:171` | UUID primary key | no observed display ID | users see own roles | none yet | medium: RBAC docs must match policies |
| Identity | `user_sessions` | `20260219000100_identity.sql:179` | UUID primary key | no observed display ID | users see own sessions | none yet | low/medium: admin metrics may depend on stale session fields |
| Organization | `organizations` | `20260219000200_org_structure.sql:5` | UUID primary key | yes, stamped | public active read; admin/org paths through helpers | new organization trigger creates wallet/linked setup | high: org wallet, fees, provider scoping depend on this row |
| Organization | `hospitals` | `20260219000200_org_structure.sql:19` | UUID primary key | yes, stamped | public verified read; org admin scoped management | bed normalization and dispatch eligibility triggers; availability RPC | high: app discovery, emergency, pricing, and map flows rely on exact fields |
| Organization | `providers` | `20260219000200_org_structure.sql:99` | UUID primary key | not yet classified | public active provider read; service/admin/provider policies | `updated_at` trigger observed in scan | medium/high: may overlap doctors/hospitals and app discovery provider model |
| Organization | `doctors` | `20260219000200_org_structure.sql:249` | UUID primary key | yes, stamped | public read; org admin manage | profile-to-doctor sync; doctor availability failover | high: app booking and emergency doctor assignment depend on shape |
| Organization | `doctor_schedules` | `20260219000200_org_structure.sql:276` | UUID primary key | no observed display ID | public read; org admin manage | schedule indexes | medium: date/time/status naming must match visits and app booking |
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
| Finance | `exchange_rates` | `20260219000400_finance.sql:82` | UUID primary key | no observed display ID | not yet classified | currency code constraints | medium: app regional pricing depends on stale-rate behavior |
| Finance | `insurance_policies` | `20260219000400_finance.sql:132` | UUID primary key | no observed display ID | users manage own policies | insurance validation RPCs | medium: app policy UX and billing must align |
| Finance | `insurance_billing` | `20260219000400_finance.sql:146` | UUID primary key | no observed display ID | user/org/admin scoped policies | emergency completion billing trigger | medium/high: completion side effects can surprise console |
| Ops/Content | `notifications` | `20260219000500_ops_content.sql:5` | UUID primary key | yes, stamped | users see/update/insert own notifications | emergency notification trigger | high: cash approval, dispatch, and emergency events rely on it |
| Ops/Content | `support_tickets` | `20260219000500_ops_content.sql:26` | UUID primary key | no observed display ID | users manage own tickets | `updated_at` trigger | medium: console support page must respect org/user scope |
| Ops/Content | `support_faqs` | `20260219000500_ops_content.sql:40` | UUID primary key | no observed display ID | public read | none yet | low |
| Ops/Content | `health_news` | `20260219000500_ops_content.sql:110` | UUID primary key | no observed display ID | public read when published | none yet | low/medium: discovery surfaces depend on fields |
| Ops/Content | `documents` | `20260219000500_ops_content.sql:121` | UUID primary key | no observed display ID | public document policy by tier/visibility | `updated_at` trigger | medium: docs/data-room security needs separate audit |
| Analytics | `user_activity` | `20260219000600_analytics.sql:5` | UUID primary key | no observed display ID | user own read/insert; admin read | `log_user_activity` RPC | medium: audit trail should not block main flow |
| Analytics | `admin_audit_log` | `20260219000600_analytics.sql:18` | UUID primary key | no observed display ID | admin read | admin service inserts | medium: console privileged changes need trace |
| Analytics | `search_history` | `20260219000600_analytics.sql:27` | UUID primary key | no observed display ID | users manage own | no current cron | low/medium: app search learning surface |
| Analytics | `search_selections` | `20260219000600_analytics.sql:35` | UUID primary key | no observed display ID | user/public insert and admin read | no current cron | low/medium |
| Analytics | `search_events` | `20260219000600_analytics.sql:45` | UUID primary key | no observed display ID | authenticated insert; admin read | analytics/trending RPCs | medium: console analytics surfaces use this |
| Analytics | `trending_topics` | `20260219000600_analytics.sql:63` | UUID primary key | no observed display ID | public read; admin manage | update RPC exists; cron not source-controlled yet | medium/high: docs mention cron but current migrations do not schedule it |
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

## Next Matrix Work

- Expand this table with exact column clusters per table.
- Add policy names and helper functions per table.
- Add trigger names and side effects per table.
- Compare against `ivisit-app/supabase/tests/validation/table_flow_trace_*.md`.
- Mark tables as `aligned`, `drift suspected`, or `needs live introspection`.
