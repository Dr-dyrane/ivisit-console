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

### Insurance Field-To-UI And Payload Contract

| Field or action | UI receiver | Console payload/write path | App/SQL ownership signal | Status | Implementation target |
| --- | --- | --- | --- | --- | --- |
| `user_id` | Modal has `user_id` in state but no visible patient selector in the current form; page create action opens a blank policy (`InsuranceModal.jsx:42-57,81-96`; `InsuranceManagementPage.jsx:154-158`). | Insert sets `payload.user_id = input.user_id || currentUser.id` (`insuranceService.js:215-231`). | Owner-only RLS means patient policy ownership is the primary authorization boundary. | admin-create ambiguity | A console admin create flow must explicitly choose the patient or use a guarded admin RPC; otherwise admin-created rows can attach to the admin user. |
| `provider_name` / `policy_number` | Card/list/table/mobile render provider and policy number as primary identity (`InsuranceManagementPage.jsx:698-710`; `InsuranceTableView.jsx:87-96`; `MobileInsurance.jsx:264-270`). | Direct insert/update passes provider and policy number (`insuranceService.js:151-154`). | App reads the same identifiers from `insurance_policies`. | aligned field shape; policy authority pending | Keep scalar identifiers, but make them patient-owned or admin-RPC-owned before implementation. |
| `coverage_type` / `policy_type` / `plan_type` | Modal writes `coverage_type`; filters compare `policy.policy_type`; views display `policy_type` (`InsuranceModal.jsx:273-292`; `InsuranceManagementPage.jsx:140-147`). | Service maps coverage/policy type to `plan_type` and normalizes back to `coverage_type` and `policy_type` (`insuranceService.js:134-138,155-160`). | Current committed finance table declares `policy_type`, while app/console service use modern `plan_type`/`coverage_details` shape. | schema-source drift | Reconcile schema source first, then expose one canonical type field in UI and mapper aliases only at the service boundary. |
| `coverage_amount` / `coverage_percentage` | Cards/mobile label the value as dollar coverage amount (`InsuranceManagementPage.jsx:719`; `MobileInsurance.jsx:284`). | Service writes numeric `coverage_percentage` from `coverage_percentage` or `coverage_amount`, then normalizes display `coverage_amount` from `coverage_details.coverage_amount` or `coverage_percentage` (`insuranceService.js:193-200,142-149`). | Billing completion calculates insurance amount using `coverage_percentage` (`automations.sql:401-426`); legacy coverage validation uses `coverage_amount` (`ops_content.sql:180-244`). | semantic drift | Use `coverage_percentage` as the active billing/display contract and label it as a percentage; do not render it as currency. Preserve legacy `coverage_amount` only as separately migrated historical data unless a distinct limit receiver is introduced. |
| `starts_at` / `expires_at` | Modal collects `start_date` and `end_date`; views render expiration through `end_date` (`InsuranceModal.jsx:246-270`; `InsuranceManagementPage.jsx:728`). | Service maps `start_date -> starts_at` and `end_date -> expires_at` (`insuranceService.js:161-166`). | App policy activity checks rely on policy dates. | aligned mapping | Keep aliasing in service only; page filters should use normalized `start_date`/`end_date` or canonical DB fields consistently. |
| `front_image_url` / `back_image_url` | Modal previews front/back card images and uploads files (`InsuranceModal.jsx:98-113,313-330`). | Upload goes to Storage bucket `documents`, path `insurance-cards/*`, then stores one-year signed URLs inside `coverage_details` (`insuranceService.js:429-490`). | `public.documents` table is a separate data-room/content table; active Storage policies were not proven in this pass. | storage-boundary drift | Treat insurance-card upload as private Storage evidence with object path, owner, expiry, and cleanup rules. Do not confuse it with the `documents` table. |
| Verify policy | Page/mobile/table expose verify action when `!policy.verified`; service direct-updates `verified` (`InsuranceManagementPage.jsx:202-210`; `MobileInsurance.jsx:299-304`; `insuranceService.js:358-377`). | Current policy source grants owner-only table management; no admin verify RPC was found. | app patient service does not claim admin verification. | unauthorized admin action | Verification must move behind a guarded receiver or proven admin policy before UI success copy is trusted. |
| Duplicate service ownership | `InsuranceManagementPage` uses `useInsurance`, which imports the primary insurance service; `insurancePoliciesService.js` separately exposes CRUD, active checks, and document updates. | Both services write the same table and share some normalizers, but expose different auth/filter behavior. | Stage 5 marks duplicate services as implementation-owner risk. | multiple owners | Retain `insuranceService.js` as the workflow/normalization facade used by active UI; reduce `insurancePoliciesService.js` to compatible subscription/read support until a separate cleanup removes duplicate write paths. |

Implementation input: do not build console administrative policy CRUD on direct-table promises until canonical administrator scope is represented in guarded RLS or an audited RPC. Reconcile the finance pillar schema to the deployed/type field surface first.

## Insurance Billing Outcome Gap

Policy administration does not complete the insurance workflow. The shared finance source also persists billing outcomes, while the current Console exposes policy management without an operator-visible billing result or exception lane.

| Shared receiver/action | Console evidence | App/SQL ownership evidence | Status | Implementation target |
| --- | --- | --- | --- | --- |
| `insurance_billing` outcome read | Table is present in generated types, but no active Console service, view, or modal was found that projects billing outcomes for a request or policy. | Finance automation creates insurance billing outcomes from completed eligible care or payment flows; source policies provide scoped user, organization, and admin reads plus admin management (`ivisit-app/supabase/migrations/20260219000700_security.sql:477-487`). | missing required scoped read surface | Pass 7 adds policy and request-linked billing outcome and exception visibility, honoring organization/admin scope without re-performing trigger-owned settlement. |
| Billing completion ownership | Visible insurance UI manages policies and verification intent only. | Billing rows are generated by backend lifecycle and automation, not by browser policy CRUD. | boundary required | Keep result creation and financial transitions backend-owned; Console observes and performs only explicitly authorized exception administration. |

## Support Ticket Receipt And Operations

| UI/service intent | Console source exhibit | Receiver/policy exhibit | App comparison | Status |
| --- | --- | --- | --- | --- |
| Console manages ticket assignment and status. | `frontend/src/services/supportTicketsService.js:48-315`; `frontend/src/hooks/useSupportTickets.js:20-141`; `frontend/src/components/pages/SupportTicketsPage.jsx:68-80,203-208,246-259,344-362,648-693` exposes management to admin, org admin, and provider roles. | `frontend/supabase/migrations/20260219000500_ops_content.sql:26-35` defines ticket operation fields; `frontend/supabase/migrations/20260219000700_security.sql:406-408` allows owner or `p_is_admin()` only. | The patient app creates its own tickets. | `confirmed drift` for org-admin/provider operations; admin management is supported by current policy source. |
| Patient message reaches console with staff-response field. | Console table shape and live probe have no `admin_response` field. | Live SELECT column check reports `support_tickets.admin_response` absent. | `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/helpSupportService.js:53-57,85-96,174-214` includes `admin_response` in the inserted mapping, then catches failure into local fallback. | `confirmed drift`: a patient ticket can appear retained locally while no console-operable ticket is written. |

### Support Ticket Field-To-UI And Payload Contract

| Field or action | UI receiver | Console payload/write path | App/SQL ownership signal | Status | Implementation target |
| --- | --- | --- | --- | --- | --- |
| `subject` / `message` | Modal create/edit form and list/table cards render both fields (`SupportTicketModal.jsx:151-178`; `SupportTicketTableView.jsx:82-88`; `SupportTicketListView.jsx:68-72`). | Service trims and requires both fields on create/update (`supportTicketsService.js:128-158,168-202`). | App creates tickets with the same required fields. | aligned base fields | Keep this as the shared patient-to-console receipt base. |
| `admin_response` | No console modal field renders or writes a response. | Service allowlists omit `admin_response` (`supportTicketsService.js:12-31`); migration source does not define the column (`ops_content.sql:26-35`). | App service maps `adminResponse -> admin_response` and falls back to local persistence if write fails. | confirmed missing receiver | Add the response field to schema/service/UI or remove it from app payload and replace with a supported staff-response model. |
| `status` | Page filters/KPIs and modal manage `open`, `in_progress`, `resolved`, `closed` (`SupportTicketsPage.jsx:50-55,118-129`; `SupportTicketModal.jsx:224-239`). | Service direct-updates status (`supportTicketsService.js:247-263`). | Table source supports `status`; policy only proves owner/admin management. | field aligned; role drift | Org-admin/provider status changes need policy/RPC proof before UI success copy is trusted. |
| `assigned_to` | List/table render raw UUID or `Unassigned`; page provider self-assigns `profile.id` (`SupportTicketListView.jsx:84-87`; `SupportTicketTableView.jsx:104`; `SupportTicketsPage.jsx:203-210`). | Service writes `assigned_to` and sets status `in_progress` (`supportTicketsService.js:288-307`). | Table source references `profiles(id)`; current policy does not prove provider/org-admin assignment authority. | display and role drift | Hydrate assigned profile labels and route assignment through a guarded management receiver. |
| `organization_id` | No visible organization selector in modal; create defaults to current user's organization in service (`supportTicketsService.js:133-141`). | Service filter uses `organization_id` through `applyAuthFilter()` (`supportTicketsService.js:48-61`). | Table source in `ops_content.sql` does not declare `organization_id`; current console service assumes it exists. | schema-source drift | Reconcile live/type schema against pillar source before relying on org-scoped support queues. |
| Delete ticket | Page exposes delete for management users and service direct-deletes (`SupportTicketsPage.jsx:169-190`; `supportTicketsService.js:208-221`). | Source policy allows owner or admin only. | App has patient-owned local/server ticket history. | destructive authority drift | Delete should be admin-only or backend-owned; providers/org admins need explicit authority and audit trail. |

Implementation input: make app ticket creation and console receipt share one persisted contract before extending ticket assignment workflows.

## Support FAQ Ownership

The patient app consumes FAQs through `services/helpSupportService.js`, while the console contains a complete `supportFaqsService.js` CRUD/realtime adapter with no routed page, hook, modal, or component importer found in the console source scan.

| Flow/action | Console service/UI exhibit | SQL/policy/app exhibit | Status | Implementation target |
| --- | --- | --- | --- | --- |
| FAQ reading | `supportFaqsService.js:67-93` can read ordered FAQs, but no rendered console consumer imports it. | `ops_content.sql:40-47` defines the table; `security.sql:329` grants public read; the app reads the same table through `helpSupportService.js`. | valid receiver, dormant console surface | Keep patient/app read truth intact; do not build a console page merely because the adapter exists. |
| FAQ create/update/delete | `supportFaqsService.js:119-206` exposes direct browser CRUD. | Current RLS source grants public SELECT only and no FAQ INSERT/UPDATE/DELETE policy. | unauthorized console promise | Treat console FAQ CRUD as dormant. Any retained authoring surface requires an admin-authorized receiver and an explicit product route before it is enabled. |
| FAQ realtime | `supportFaqsService.js:233-249` subscribes to all FAQ changes without a rendered owner. | Public read permits FAQ visibility; no console lifecycle depends on realtime today. | unnecessary dormant channel | Do not activate a console realtime channel until a real read-only or authorized authoring surface owns it. |

## Health News Authoring

| UI/service intent | Console source exhibit | Receiver/policy exhibit | Status |
| --- | --- | --- | --- |
| Author article description, content, and icon. | `frontend/src/components/modals/HealthNewsModal.jsx:24-55,244-288` captures the fields; `frontend/src/components/pages/HealthNewsManagementPage.jsx:260-285` submits authoring operations. | `frontend/src/services/healthNewsService.js:11-21,133-158,268-296` only accepts link/news fields. Live probe confirms `description`, `content`, and `icon` are absent from `health_news`. | `confirmed drift`: visible editor fields are silently discarded. |
| View drafts and create/edit/publish/delete content. | `frontend/src/components/pages/HealthNewsManagementPage.jsx:92-151,208-236,338-350,761-834` queries draft/published slices and actions. | `frontend/supabase/migrations/20260219000700_security.sql:328` provides only public SELECT for `published = true`; no author/admin write or draft-read policy appears in current source. | `confirmed drift` against committed policy source; obtain deployed-policy proof before implementation. |

Implementation input: treat `health_news` as a curated published link/feed receiver under the current source contract. Remove unsupported article-body controls and do not enable draft authoring or writes until an authorized policy/receiver is explicitly introduced.

## Medical Profile Scope

| Service promise | Console source exhibit | Receiver/policy exhibit | App comparison | Status |
| --- | --- | --- | --- | --- |
| Admin can read and update any medical profile. | `frontend/src/services/medicalProfilesService.js:99-354` performs client-side admin checks before direct table operations. No rendered console call site was found outside the service in this pass. | `frontend/supabase/migrations/20260219000700_security.sql:104,285-287` grants owner-only table management. | `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/medicalProfileService.js:85-259` and `hooks/medicalProfile/**` use patient-owned paths. | `forward risk`: dormant console admin promise is unauthorized by source RLS; app patient ownership is consistent. |

## Notification Ownership

| Flow | Console/app source exhibit | Policy/trigger exhibit | Status |
| --- | --- | --- | --- |
| Console action center records operator notifications. | `frontend/src/services/notificationService.js:75-195` derives `user_id` from the signed-in user; `frontend/src/components/common/NotificationCenter.jsx:11-221` renders that stream. | `frontend/supabase/migrations/20260219000700_security.sql:267-278` allows own SELECT, UPDATE, and INSERT. Emergency notification creation is separately trigger/RPC owned in `frontend/supabase/migrations/20260219000500_ops_content.sql:141-173`. | `aligned`: this is operator activity feedback, not patient notification dispatch. |
| Patient app deletes or clears notifications. | `C:/Users/Dyrane/Documents/GitHub/ivisit-app/services/notificationsService.js:164-210`; `hooks/notifications/useNotificationsMutations.js:151-222`. | Current console-synced RLS source contains no notifications `FOR DELETE` policy. | `confirmed drift` against current policy source; app clear/delete cannot persist unless deployed policy differs. |

## Preferences And Settings Ownership

| Flow/action | Console service/UI exhibit | App/SQL ownership exhibit | Status | Implementation target |
| --- | --- | --- | --- | --- |
| Operator notification toggle | `preferencesService.js:15-259` defines own-user preference reads and writes, but it has no console importer; `SettingsPage.jsx:363-375` renders a notification switch fixed at `checked={true}` without an action. | `identity.sql:47-61` declares `notifications_enabled`; `security.sql:281-283` permits a user to manage their own preference row. | confirmed inactive control | Pass 8 wires the operator notification control to the signed-in user's preference row with pending/error feedback, or removes the switch until wired. |
| Demo mode | Console service exposes `toggleDemoMode()` but no console screen imports it; `PageDataContext.jsx:19-161,176-625` owns mock fallback data independently. | Patient app consumes `preferences.demo_mode_enabled` in emergency coverage behavior and flow controllers. | patient-owned behavior; console mock drift | Do not expose or use console demo mode to substitute operational truth. Remove production dashboard mock fallback separately; leave patient coverage-mode ownership in the app. |
| Medical/contact sharing | Console service exposes privacy toggles without a rendered consumer. | Patient request creation explicitly reads these preference fields before sharing medical/contact payloads. | patient-consent lane only | Do not add console editing of patient sharing preferences. Console clinical visibility requires a separately authorized access model. |

## Search, Trends, And Display Truth

| Flow | Service/UI exhibit | SQL/policy exhibit | Status |
| --- | --- | --- | --- |
| Console quick search displays trending topics. | `frontend/src/components/navigation/QuickSearch.jsx:17-28` calls `frontend/src/services/searchService.js:217-236`, which returns empty on RPC failure. | `frontend/supabase/migrations/20260219010000_core_rpcs.sql:654-669` exposes read-only `get_trending_searches`; `frontend/supabase/migrations/20260219000700_security.sql:421-422` supports public reads/admin management. | `aligned` for the visible quick-search read contract. |
| Admin-only search aggregation reads private history. | `frontend/src/services/searchAnalyticsService.js:13-126` defines the aggregation service; no rendered consumer was found in this pass. | `frontend/supabase/migrations/20260219010000_core_rpcs.sql:671-741` uses `SECURITY DEFINER` with `p_is_admin()` checks. | `aligned` receiver authority; exposed service rather than confirmed rendered flow. |
| Automatic topic regeneration updates trend rows. | `frontend/src/services/analyticsAutomationService.js:13-138` reports success from two update RPCs; no rendered caller was found outside the service. | `frontend/supabase/migrations/20260219010000_core_rpcs.sql:351-367` returns success while update/aggregation logic is stubbed. | `confirmed drift`: a caller can receive success without regeneration. |
| Analytics screen reports search metrics. | `frontend/src/components/pages/Analytics.jsx:1838-1876` visibly renders fixed values including total searches and success rate. | No data receiver is wired for those four values in that block. | `confirmed display-truth drift`: metric-looking values are presentation constants rather than verified analytics. |

### Active Search And Dashboard Detail

| Flow/action | Console service/UI exhibit | SQL/policy exhibit | Status | Implementation target |
| --- | --- | --- | --- | --- |
| QuickSearch ambulance category | `QuickSearch.jsx:46-55` calls `searchService.searchAll()`; `searchService.js:97-110` selects and filters `ambulances.hospital`. Its shared `Promise.all()` rejection path returns no results for the whole query. | `logistics.sql:5-28` declares `hospital_id` and `organization_id`, not `hospital`; facility display requires a hospital join or normalized projection. | confirmed broken data flow | Repair the active ambulance projection through a joined/normalized facility label so one category cannot blank valid results. |
| QuickSearch history and result selection | `searchService.js:162-270` directly writes `search_history`, `search_events`, and `search_selections`; the separate CRUD services have no rendered importer. | `security.sql:378-381,416-418` permits own history/selections and authenticated event inserts, while admin analytics access is separately guarded. | active owner identified | Keep `searchService.js` as the active QuickSearch telemetry boundary; do not independently surface dormant adapters. |
| Search aggregation failure state | `searchAnalyticsService.js:38-47` returns five fabricated ranked searches if its guarded RPC fails. | The guarded aggregation RPC can return actual data or an error; no receiver owns synthetic production metrics. | confirmed display-truth risk | Return unavailable/empty state before this service is attached to visible analytics. |
| Activity read projection | `activityService.js:40-80` calls recent/statistics RPCs; `useActivity.js:17-212` can render and subscribe to the stream. | `core_rpcs.sql:764-811` gates both `SECURITY DEFINER` reads with `p_is_console_allowed()`; table RLS also allows admin reads. | receiver-authorized | Preserve the guarded RPC as read owner; UI activity is not financial or privileged mutation audit proof. |
| Broad activity realtime composition | `activityService.js:141-158` and `PageDataContext.jsx:804-815` each subscribe to the full `user_activity` table. | The RPC is the controlled read projection, while the global context also composes unrelated domain state. | duplicate ownership | Keep one activity hook/query owner and remove broad context ownership after callers migrate. |
| Dashboard completion metric | `analyticsService.js:82-105` returns `successRate: 95` when there are zero visible emergencies. | No SQL receiver defines a synthetic default success rate. | confirmed fabricated success | Render zero/no-data state, not a positive outcome when no observation exists. |
| Dashboard fallback and estimate | `PageDataContext.jsx:19-161` initializes operational mock records, falls back to them on several errors (`249,288,327,359,516-517`), and estimates on-route ambulances as 30 percent of total at line 353. | Console operational truth must reflect backend-visible rows and explicit unavailable states. | confirmed production-truth drift | Remove operational mock fallback from production ownership and render degraded/unavailable state. |
| Platform performance panel | `Analytics.jsx:1925-1929` renders constant API, query, page-load, error-rate, and uptime values as status metrics. | No observed telemetry service/RPC feeds this panel. | confirmed unsupported metric surface | Remove or relabel until a measured observability receiver exists. |

## Documents And Data-Room Boundary

`documents` exists as an ops/content table with `title`, `slug`, `description`, `file_path`, `tier`, `visibility`, and `content` (`ops_content.sql:121-132`). Current RLS source grants SELECT for `tier = 'public'` or admin (`security.sql:410-411`). The console worktree scan found no rendered document-management page and no direct table CRUD for `documents`.

| Surface/action | Console behavior | Receiver/policy exhibit | Status | Finding |
| --- | --- | --- | --- | --- |
| Provider onboarding document upload | Onboarding collects optional files (`VerificationStep.jsx:93-118,358`) and uploads them to the Supabase Storage bucket named `documents` (`onboardingService.js:15,266-274`). | This is Storage, not the `public.documents` table. | boundary distinction | Verification uploads should not be treated as data-room documents unless a table row, invite, and access policy are intentionally created. |
| Insurance document/card upload | Insurance service uploads to the same `documents` bucket (`insuranceService.js:531-538`). | No `documents` table row is created by this path in the observed service. | boundary distinction | Insurance proof storage is patient/policy evidence, not public/confidential data-room publishing. |
| Data-room document table | No active console UI/service was found for `public.documents`, `document_invites`, or `access_requests`. | `documents` table has a public/admin read policy only; no write/manage policy was found in current source (`ops_content.sql:121-132`; `security.sql:410-411`). | missing console implementation | This aligns with ecosystem split: NDA-gated data room belongs outside normal provider console unless a controlled admin surface is explicitly added. |

## Insurance Card Storage Contract

Insurance card images are more sensitive than hospital/provider presentation media. The active UI selects local files, previews browser object URLs, then uploads only during submit (`InsuranceModal.jsx:100-113,333-370`). The service writes to the private-looking `documents` bucket and stores a one-year signed URL inside `coverage_details.front_image_url` / `coverage_details.back_image_url` (`insuranceService.js:56-88,99-214,524-544`).

| UI field/action | Console service payload | Receiver expectation | Status | Finding |
| --- | --- | --- | --- | --- |
| Front/back card file selection | Modal stores local object URL for preview and defers upload until save. | No database write happens until `onSave()` receives uploaded signed URLs. | aligned UI staging | Preview behavior is local-only and should not be treated as persisted proof before submit completes. |
| Upload path | `uploadInsuranceCardImage()` writes `insurance-cards/<random>-<timestamp>.<ext>` to Storage bucket `documents` and creates a signed URL for 31,536,000 seconds. | Archived policy references use `insurance/<user_id>/*` path rules, while the current active policy source did not prove `insurance-cards/*` authorization. | needs read-only deployment proof | If deployed policy follows the archived per-user pattern, the current path can fail or over-broaden. Verify bucket policies before implementation. |
| Persistence field | `buildCoverageDetails()` embeds `front_image_url` and `back_image_url` in JSON `coverage_details`; normalization projects them back to UI fields. | Modern app and console services both use this coverage-details projection; table-level legacy columns are not the current write target. | aligned for modern JSON contract | This is a JSON field contract; UI must treat values as strings/URLs, not direct table columns. |
| Long-lived signed URL | Signed URL is persisted in policy JSON rather than regenerating from object path at read time. | Signed URLs expire and include access tokens; object path ownership is lost unless separately stored. | forward privacy/availability risk | A future implementation should store object paths plus regenerate signed URLs through an authorized read boundary, especially for insurance evidence. |

## Integrity Note

Source inspection found existing mojibake signatures in rendered/search-related JavaScript, including separators and a star marker in `frontend/src/services/searchService.js` and status-log characters in `frontend/src/services/analyticsAutomationService.js`. The newly authoritative `ivisit-app` doctrine/Supabase documentation also renders corrupted punctuation and diagrams during this review, so SQL and code evidence, not corrupted glyphs, was used for contract conclusions. This is not repaired during the audit-only phase, but belongs in a dedicated source-health/encoding repair and the existing encoding gate.

## Ordered Pass Inputs

1. Repair patient support receipt and console support authorization together, because an unseen ticket is an operational failure.
2. Define insurance administrator authorization and reconcile policy schema migration truth before administrative CRUD.
3. Add scoped `insurance_billing` outcome and exception visibility without moving trigger-owned billing creation into Console.
4. Keep `health_news` as a curated published-feed boundary until a separate authoring receiver is authorized.
5. Reconcile notification deletion policy needed by the patient app.
6. Replace or label analytics constants and implement trend regeneration only when a truthful receiver exists.
7. Keep medical-profile admin functions dormant unless a controlled clinical/support access model is approved.
8. Keep Storage `documents` uploads separate from the `documents` data-room table until a document-management owner, invite flow, and access policy are defined; data-room ownership belongs with `ivisit-docs`.
9. Verify Storage bucket policy and replace persisted signed insurance-card URLs with object-path ownership plus authorized URL generation if insurance evidence remains in console scope.
10. Keep FAQ management dormant in console until an admin-authorized authoring receiver and route exist; patient FAQ reads remain app-owned.
11. Repair QuickSearch ambulance projection through a joined or normalized facility field and keep `searchService.js` as its single active event owner.
12. Wire only signed-in operator notification preferences in console settings; do not expose patient demo-mode or medical-sharing controls as operations settings.
13. Remove fabricated dashboard/search/performance fallback values and replace them with explicit unavailable or empty states.

## Excluded Actions

This exhibit did not run migrations, RPCs, Edge Functions, scheduled jobs, row writes, repairs, emails, UI mutations, or app test flows. Deployment checks were SELECT-only column availability and exact-count/head probes with no row payloads recorded.
