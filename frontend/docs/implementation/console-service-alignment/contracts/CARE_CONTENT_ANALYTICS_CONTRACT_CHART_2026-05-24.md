# Care, Content, And Analytics Contract Chart - 2026-05-24

## Status

Exact-contract audit exhibit for insurance, support, medical profile, health news, notifications, and search/trending behavior.

This pass is audit-only. It uses source reads plus SELECT-only deployment checks. It does not authorize schema, policy, content, or application changes.

## Authority Boundary

The console browser client is initialized with `REACT_APP_SUPABASE_ANON_KEY` in `frontend/src/lib/supabase.js:1-10`. A page comment saying that an admin or org admin can access a row is not an authorization path. Direct `.from(...)` calls remain subject to deployed RLS unless a guarded RPC owns the operation.

Statuses used below:

- `aligned`: the current service, receiver, and policy contract agree.
- `confirmed drift`: source or live column evidence proves that the promised operation cannot persist as shaped.
- `forward risk`: no current repair population was observed, but a new write or user action remains defective.
- `needs read-only deployment proof`: migration source establishes intent but deployed policy/function metadata has not yet been introspected.

## Read-Only Deployment Surface

Individual SELECT-only column checks confirmed the following exposed live surface:

| Table | Selectable live fields needed by the flow | Fields absent from the live selectable surface |
| --- | --- | --- |
| `insurance_policies` | `policy_type`, `coverage_amount`, `plan_type`, `coverage_percentage`, `coverage_details`, `linked_payment_method`, `starts_at`, `expires_at`, `status`, `verified`, `is_default` | none probed |
| `support_tickets` | `organization_id`, `category`, `priority`, `assigned_to` | `admin_response` |
| `health_news` | `title`, `source`, `url`, `image_url`, `category`, `published` | `description`, `content`, `icon` |
| `notifications` | `action_type`, `target_id`, `action_data`, `metadata`, `display_id`, `timestamp` | none probed |
| Search/trends | `search_history.query/result_count`, `search_selections.query/result_type/result_id/source`, `search_events.query/source/selected_key/metadata`, `trending_topics.query/category/rank` | none probed |

Exact-count SELECT-only scope check:

| Table/slice | Current readable count | Meaning for this audit |
| --- | ---: | --- |
| `insurance_policies` | 0 | Correct the forward admin/patient contract; no current policy rows were identified for repair. |
| `support_tickets` | 0 | Correct patient-to-console receipt and role policy before relying on new cases; no present ticket repair count. |
| `health_news` total / published / draft | 2 / 2 / 0 | Published content exists; draft/editor functionality remains contract-blocked. |
| `notifications` | 0 | App delete-policy defect is forward-facing in the observed population. |
| `search_history` / `search_events` | 0 / 0 | Analytics aggregation currently has no observed event population to verify. |
| `trending_topics` | 21 | The read surface has rows even though automatic regeneration RPCs are source-stubbed. |

## Insurance Policy Management

| UI/service intent | Console source exhibit | Receiver/policy exhibit | App comparison | Status |
| --- | --- | --- | --- | --- |
| Admin and org-admin list all policies for management. | `frontend/src/services/insuranceService.js:238-274` deliberately leaves the query unrestricted for admin and org admin. The management page consumes list/edit/verify actions. | `frontend/supabase/migrations/20260219000700_security.sql:126,262-264` grants only owner management through `auth.uid() = user_id`. Direct browser CRUD has no admin/org-admin policy in current source. | `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/insuranceService.js:253-279` constrains patient reads to the signed-in user. | `confirmed drift`: administrative list/verify/CRUD promise is not authorized by current RLS source. |
| Persist modern policy details and verification fields. | `frontend/src/services/insuranceService.js:99-214,326-364,429-490` reads and writes modern policy fields. | `frontend/supabase/migrations/20260219000400_finance.sql:132-143` declares the older base shape; `frontend/src/types/database.ts:1403-1465` and live SELECT checks contain the modern fields. | The app insurance service uses the modern field family. | `confirmed drift`: deployed/type truth is ahead of the committed pillar table declaration. |

Implementation input: do not build console administrative policy CRUD on direct-table promises until canonical administrator scope is represented in guarded RLS or an audited RPC. Reconcile the finance pillar schema to the deployed/type field surface first.

## Support Ticket Receipt And Operations

| UI/service intent | Console source exhibit | Receiver/policy exhibit | App comparison | Status |
| --- | --- | --- | --- | --- |
| Console manages ticket assignment and status. | `frontend/src/services/supportTicketsService.js:48-315`; `frontend/src/hooks/useSupportTickets.js:20-141`; `frontend/src/components/pages/SupportTicketsPage.jsx:68-80,203-208,246-259,344-362,648-693` exposes management to admin, org admin, and provider roles. | `frontend/supabase/migrations/20260219000500_ops_content.sql:26-35` defines ticket operation fields; `frontend/supabase/migrations/20260219000700_security.sql:406-408` allows owner or `p_is_admin()` only. | The patient app creates its own tickets. | `confirmed drift` for org-admin/provider operations; admin management is supported by current policy source. |
| Patient message reaches console with staff-response field. | Console table shape and live probe have no `admin_response` field. | Live SELECT column check reports `support_tickets.admin_response` absent. | `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/helpSupportService.js:53-57,85-96,174-214` includes `admin_response` in the inserted mapping, then catches failure into local fallback. | `confirmed drift`: a patient ticket can appear retained locally while no console-operable ticket is written. |

Implementation input: make app ticket creation and console receipt share one persisted contract before extending ticket assignment workflows.

## Health News Authoring

| UI/service intent | Console source exhibit | Receiver/policy exhibit | Status |
| --- | --- | --- | --- |
| Author article description, content, and icon. | `frontend/src/components/modals/HealthNewsModal.jsx:24-55,244-288` captures the fields; `frontend/src/components/pages/HealthNewsManagementPage.jsx:260-285` submits authoring operations. | `frontend/src/services/healthNewsService.js:11-21,133-158,268-296` only accepts link/news fields. Live probe confirms `description`, `content`, and `icon` are absent from `health_news`. | `confirmed drift`: visible editor fields are silently discarded. |
| View drafts and create/edit/publish/delete content. | `frontend/src/components/pages/HealthNewsManagementPage.jsx:92-151,208-236,338-350,761-834` queries draft/published slices and actions. | `frontend/supabase/migrations/20260219000700_security.sql:328` provides only public SELECT for `published = true`; no author/admin write or draft-read policy appears in current source. | `confirmed drift` against committed policy source; obtain deployed-policy proof before implementation. |

Implementation input: decide whether this table is curated outbound links or authored article content, then align both fields and authorization to that product decision.

## Medical Profile Scope

| Service promise | Console source exhibit | Receiver/policy exhibit | App comparison | Status |
| --- | --- | --- | --- | --- |
| Admin can read and update any medical profile. | `frontend/src/services/medicalProfilesService.js:99-354` performs client-side admin checks before direct table operations. No rendered console call site was found outside the service in this pass. | `frontend/supabase/migrations/20260219000700_security.sql:104,285-287` grants owner-only table management. | `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/medicalProfileService.js:85-259` and `hooks/medicalProfile/**` use patient-owned paths. | `forward risk`: dormant console admin promise is unauthorized by source RLS; app patient ownership is consistent. |

## Notification Ownership

| Flow | Console/app source exhibit | Policy/trigger exhibit | Status |
| --- | --- | --- | --- |
| Console action center records operator notifications. | `frontend/src/services/notificationService.js:75-195` derives `user_id` from the signed-in user; `frontend/src/components/common/NotificationCenter.jsx:11-221` renders that stream. | `frontend/supabase/migrations/20260219000700_security.sql:267-278` allows own SELECT, UPDATE, and INSERT. Emergency notification creation is separately trigger/RPC owned in `frontend/supabase/migrations/20260219000500_ops_content.sql:141-173`. | `aligned`: this is operator activity feedback, not patient notification dispatch. |
| Patient app deletes or clears notifications. | `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/notificationsService.js:164-210`; `hooks/notifications/useNotificationsMutations.js:151-222`. | Current console-synced RLS source contains no notifications `FOR DELETE` policy. | `confirmed drift` against current policy source; app clear/delete cannot persist unless deployed policy differs. |

## Search, Trends, And Display Truth

| Flow | Service/UI exhibit | SQL/policy exhibit | Status |
| --- | --- | --- | --- |
| Console quick search displays trending topics. | `frontend/src/components/navigation/QuickSearch.jsx:17-28` calls `frontend/src/services/searchService.js:217-236`, which returns empty on RPC failure. | `frontend/supabase/migrations/20260219010000_core_rpcs.sql:654-669` exposes read-only `get_trending_searches`; `frontend/supabase/migrations/20260219000700_security.sql:421-422` supports public reads/admin management. | `aligned` for the visible quick-search read contract. |
| Admin-only search aggregation reads private history. | `frontend/src/services/searchAnalyticsService.js:13-126` defines the aggregation service; no rendered consumer was found in this pass. | `frontend/supabase/migrations/20260219010000_core_rpcs.sql:671-741` uses `SECURITY DEFINER` with `p_is_admin()` checks. | `aligned` receiver authority; exposed service rather than confirmed rendered flow. |
| Automatic topic regeneration updates trend rows. | `frontend/src/services/analyticsAutomationService.js:13-138` reports success from two update RPCs; no rendered caller was found outside the service. | `frontend/supabase/migrations/20260219010000_core_rpcs.sql:351-367` returns success while update/aggregation logic is stubbed. | `confirmed drift`: a caller can receive success without regeneration. |
| Analytics screen reports search metrics. | `frontend/src/components/pages/Analytics.jsx:1838-1876` visibly renders fixed values including total searches and success rate. | No data receiver is wired for those four values in that block. | `confirmed display-truth drift`: metric-looking values are presentation constants rather than verified analytics. |

## Integrity Note

Source inspection found existing mojibake signatures in rendered/search-related JavaScript, including separators and a star marker in `frontend/src/services/searchService.js` and status-log characters in `frontend/src/services/analyticsAutomationService.js`. This is not repaired during the audit-only phase, but belongs in the later UI implementation pass and the existing encoding gate.

## Ordered Pass Inputs

1. Repair patient support receipt and console support authorization together, because an unseen ticket is an operational failure.
2. Define insurance administrator authorization and reconcile policy schema migration truth before administrative CRUD.
3. Decide health-news content ownership and authorize the chosen draft/publish workflow.
4. Reconcile notification deletion policy needed by the patient app.
5. Replace or label analytics constants and implement trend regeneration only when a truthful receiver exists.
6. Keep medical-profile admin functions dormant unless a controlled clinical/support access model is approved.

## Excluded Actions

This exhibit did not run migrations, RPCs, Edge Functions, scheduled jobs, row writes, repairs, emails, UI mutations, or app test flows. Deployment checks were SELECT-only column availability and exact-count/head probes with no row payloads recorded.
