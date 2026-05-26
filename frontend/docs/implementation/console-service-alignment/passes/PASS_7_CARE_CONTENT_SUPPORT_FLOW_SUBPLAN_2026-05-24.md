# Pass 7 Care, Content, And Support Flow Subplan - 2026-05-24

## Status

Detailed implementation subplan only. No product, database, policy, Edge Function, storage upload, content publish, notification send, cleanup, seed, migration, or runtime mutation is authorized by this document.

This subplan covers the non-subscription half of Pass 7: insurance policies, insurance billing outcomes, support tickets, support FAQs, health news/content, notifications, and cross-cutting media upload behavior.

## Source Evidence

Console files inspected:

- `frontend/src/components/pages/HealthNewsManagementPage.jsx`
- `frontend/src/components/modals/HealthNewsModal.jsx`
- `frontend/src/components/modals/BulkImportModal.jsx`
- `frontend/src/components/context/HealthNewsPanel.jsx`
- `frontend/src/components/mobile/MobileHealthNews.jsx`
- `frontend/src/components/pages/SupportTicketsPage.jsx`
- `frontend/src/components/context/SupportTicketsPanel.jsx`
- `frontend/src/components/mobile/MobileSupportTickets.jsx`
- `frontend/src/components/views/SupportTicketListView.jsx`
- `frontend/src/components/views/SupportTicketTableView.jsx`
- `frontend/src/components/modals/SupportTicketModal.jsx`
- `frontend/src/components/pages/InsuranceManagementPage.jsx`
- `frontend/src/components/context/InsurancePanel.jsx`
- `frontend/src/components/mobile/MobileInsurance.jsx`
- `frontend/src/components/views/InsuranceListView.jsx`
- `frontend/src/components/views/InsuranceTableView.jsx`
- `frontend/src/components/modals/SupportModal.jsx`
- `frontend/src/components/modals/InsuranceModal.jsx`
- `frontend/src/components/navigation/ContextAwareFAB.jsx`
- `frontend/src/components/navigation/DynamicBottomBar.jsx`
- `frontend/src/hooks/useInsurance.js`
- `frontend/src/hooks/useSupportTickets.js`
- `frontend/src/hooks/useHealthNews.js`
- `frontend/src/services/healthNewsService.js`
- `frontend/src/services/supportTicketsService.js`
- `frontend/src/services/supportFaqsService.js`
- `frontend/src/services/insuranceService.js`
- `frontend/src/services/insurancePoliciesService.js`
- `frontend/src/services/notificationService.js`
- `frontend/src/services/storageService.js`
- `frontend/src/utils/runMigrations.js`
- `frontend/src/utils/testDatabase.js`
- Shared `insurance_billing` table/trigger and hospital/admin scoped read-policy evidence.

Canonical app/shared-backend evidence inspected:

- `../ivisit-app/screens/InsuranceScreen.jsx`
- `../ivisit-app/screens/HelpSupportScreen.jsx`
- `../ivisit-app/supabase/docs/REFERENCE.md`
- `../ivisit-app/supabase/docs/MODULE_SCHEMA_BIBLE.md`
- `../ivisit-app/supabase/docs/TESTING.md`
- `../ivisit-app/supabase/migrations/20260219000400_finance.sql`
- `../ivisit-app/supabase/migrations/20260219000500_ops_content.sql`
- `../ivisit-app/supabase/migrations/20260219000700_security.sql`
- `../ivisit-app/supabase/migrations/20260219000900_automations.sql`

Audit docs:

- Care, content, and analytics contract chart.
- Stage 3 capability gap audit.
- Stage 4 L5 ownership audit.
- Stage 5 service coverage audit.
- Stage 6 implementation pass plan.

Observed source and contract signals:

- Health news UI captures authoring fields that the service/live table does not persist.
- Health news draft/write policy is not proven by current RLS source.
- `BulkImportModal` and `useHealthNews.bulkImport()` expose a CSV/template and multi-row health-news import capability in source, but the modal is only barrel-exported and no mounted route consumer was found. It is dormant capability, not an authorized authoring surface.
- Support tickets page/hook/service expose admin/org/provider operations, while current policy evidence supports owner/admin, not every rendered role.
- Patient app support insert expects `admin_response`, but the live selectable console table shape did not expose that field in the contract exhibit.
- `supportFaqsService.js` is full CRUD/realtime but no direct UI route was found in the source scan.
- `insuranceService.js` and `insurancePoliciesService.js` overlap insurance policy CRUD and document upload behavior.
- Insurance admin/org-admin promises are not authorized by current owner-only policy source.
- `insurance_billing` is trigger-backed billing truth with hospital/admin visibility in source policy, but no Console billing-outcome view or exception workflow was found.
- The canonical completion automation writes `insurance_billing` columns `insurance_policy_id`, `total_amount`, `insurance_amount` and `user_amount`, but source-present `process_insurance_claim()` in `ops_content` attempts legacy `policy_id`, `billed_amount` and `covered_amount` columns. No rendered Console caller was found, so this is an available but unsafe claim receiver to retire or repair before any exception/claim action is exposed.
- `notificationService.js` is aligned for operator notification streams but patient delete/clear policy is a separate app drift.
- `runMigrations.js` contains browser-side `exec_sql` mutation attempts for health news, support tickets and insurance; `testDatabase.js` contains direct diagnostic reads. No product implementation may use these helpers as receiver proof or repair paths.
- `/health-news` is provider-restricted in the live route while navigation and `ContextPanel` advertise viewer reach; `/insurance` is admin-restricted in the live route while navigation advertises org-admin reach.
- Health news couples its paged list to five parallel KPI reads, so one summary error can fail the list load; insurance and support surfaces paginate UI over full or unpaged hook results rather than an authoritative page window.
- `InsuranceManagementPage` fetches an unpaged policy collection and calculates filters, counts, paging and mobile analytics on that client collection. `MobileInsurance` labels those locally derived values as live coverage/verification dynamics.
- `InsuranceManagementPage` treats `isAdmin` as a truthy function object for header and bulk-action checks (`isAdmin` rather than `isAdmin()`), while the route itself is admin-gated and navigation still advertises org-admin reach.
- `InsuranceModal` calls `onSave(policy.id, finalFormData)` for edits, but `InsuranceManagementPage.handleSave` accepts a single data argument and separately uses `selectedPolicy.id`. The edit path therefore supplies the policy id string as the update payload and can persist no intended field changes beyond service-generated update metadata.
- `insuranceService.getInsurancePolicies()` returns `[]` for both provider denial and query failure, includes an org-admin all-policy assumption without an organization key, and its analytics query is unscoped. `useInsurance` also imports a second subscription alias from `insurancePoliciesService`, confirming overlapping ownership.
- Insurance detail/modal surfaces display and mutate policy status, verification and private card images, while no mounted Console surface reads trigger-created `insurance_billing` outcomes or links those outcomes back to visits/emergency completion.
- `SupportTicketsPage` fetches ticket lists without passing a page limit/range, does not place search into `supportTicketsService`, and slices the returned list only for mobile display; its footer pagination total is not set by the route.
- `MobileSupportTickets.jsx:56-66,90-111,132-208` falls back to loaded tickets for status counts and locally computes queue/resolution trend panels labelled `LIVE`; this is not complete support-queue performance.
- `MobileHealthNews.jsx:56-67,100-136,159-234` falls back to loaded articles for total, draft, medical and recent content counts and renders `LIVE` trend panels; a visible content page window is not publication-system analytics.
- `HealthNewsModal.jsx:314-323` opens the persisted `formData.url` directly in a new browser tab for `Visit Source`; `ivisit-app/hooks/search/useSearchScreenModel.js:169-176` opens the same health-news URL for patients. The Console news URL is a patient-facing external-navigation payload and needs scheme/provenance/safe-open rules before publication is trustworthy.
- `SupportTicketsPage.handleView` sets modal mode to `edit`, so a read/detail action opens editable status/message/category/priority inputs. List/table variants also pass `isAdmin` as a function object into components that test it as a boolean, exposing edit/delete controls to every role reaching those variants.
- `SupportTicketsPanel` independently reads the latest three tickets directly from Supabase and mounts its own broad realtime channel alongside hook and page/global data paths.
- `InsurancePanel`, `SupportTicketsPanel` and `HealthNewsPanel` each render an `Export` control marked `disabled` and titled `Export (Coming Soon)`. These are visible unavailable operations over sensitive policy, ticket or content projections; they are not evidence of an implemented export receiver.
- `AppShell` always renders `ContextAwareFAB` and `DynamicBottomBar`; both call `useInsurance()` and `useSupportTickets()` before their viewport-based early return. Because both hooks fetch on mount and subscribe, sensitive insurance policy reads and unpaged support-ticket reads/channels can execute twice on every route even when neither care surface nor command modal is open.
- `useInsurance` and `useSupportTickets` log realtime payload objects to the browser console; combined with route-independent shell mounting, protected care updates can be disclosed even when no care surface is open.
- `supportTicketsService` permits direct create/update/delete/status/assignment calls and converts read errors into empty results. It does not project a staff response field, despite the required patient/Console response reconciliation already identified.
- Runtime sources for insurance, support and health news contain pre-existing corrupted punctuation/icon bytes. They remain implementation findings; this document uses ASCII only.

## User Flow

Operator/support/content path:

1. Review support tickets and assign/respond/update status.
2. Create support ticket from console if authorized.
3. Leave FAQ authoring dormant while the patient app continues public FAQ reading under the current policy.
4. Review or manage patient insurance policies when authorized.
5. Upload insurance card images through stable storage.
6. Inspect authorized insurance billing/claim outcomes tied to completed emergency care.
7. Manage only the curated published health-news feed capability authorized by the eventual receiver.
8. See operator notifications generated by console actions.
9. Avoid exposing unsupported admin/patient capabilities as if they work.

## Broken Contract To Fix

| Data/action | Current owner symptom | Required owner |
| --- | --- | --- |
| Support ticket receipt | App can fallback locally; console table lacks expected response field. | Shared support ticket contract between app and console. |
| Support assignment | Console exposes org/provider assignment actions beyond proven policy. | Support operations owner with role/RLS proof. |
| Support FAQs | Service exists without surfaced route; current RLS proves reads only. | Patient app remains FAQ reader; console authoring adapter stays dormant until authorized receiver/route exists. |
| Insurance CRUD | Two services overlap, admin promises exceed policy proof. | Insurance owner with explicit admin/support access model. |
| Insurance billing outcomes | Trigger-backed billing rows exist with scoped read authority; no Console view/action owner exists. | Scoped billing outcome projection plus separately authorized exception workflow. |
| Insurance images | Insurance service uploads directly. | Private insurance-evidence Storage owner with policy/path/expiry/cleanup proof before implementation. |
| Health news authoring | UI fields are silently discarded by service/table shape. | Curated published-feed owner; unsupported CMS fields/actions remain unavailable until receiver/policy expansion. |
| Published health-news source link | Console permits source URL entry and directly opens it; patient discovery opens persisted health-news URLs. | Validated external-link projection with accepted scheme/source provenance and safe browser/app handoff; do not publish arbitrary or malformed navigation payloads. |
| Health news bulk import/template | A source-present modal and hook can accept/download CSV data and invoke multi-row import, but no mounted surface or write authority is proved. | Keep dormant and excluded until the same published-feed/write policy and audit receiver govern import. |
| Notifications | Operator notifications aligned; patient delete policy drift remains. | Notification owner split: console operator stream versus patient notification lifecycle. |
| Browser-side schema/diagnostic utilities | `runMigrations.js` can call `exec_sql`; `testDatabase.js` queries domain tables outside service owners. | Maintenance-only boundary excluded from product flows; retire if unused after import proof. |
| Content and insurance route promise | Navigation/panel role promises disagree with live route and with unproved management authority. | Align visibility with supported read/command authority; do not advertise unavailable management surfaces. |
| Care/content list reliability | Content summary failure can block list results, and insurance/support pagination does not own a server-backed authorized window. | Independent summary degradation plus scoped paged list owners with explicit unavailable/unauthorized/error state. |
| Insurance edit receiver | Modal edit callback signature does not match page save handler, so intended policy field updates can be discarded. | One typed policy command boundary and tested create/edit/verify receiver contract before any management UI remains active. |
| Support read versus edit | View action opens editable modal, and list/table role tests use a function object as authorization. | Separate read detail from command mode and evaluate capability before rendering every command variant. |
| Global support/insurance projections | Context panels use independent reads/stats/events outside route ownership. | One scoped projection/invalidation owner consumed by route, mobile and context panel surfaces. |
| Care/content export affordances | Insurance, support and health-news panels display disabled `Export (Coming Soon)` controls without an export dataset or receiver. | Keep explicitly unavailable until each domain defines authorized fields, scope, paging/completeness and delivery receiver; do not promote placeholder controls into apparent capability. |
| Care/content bulk delete controls | Health-news, insurance and support routes each render Delete Selected confirmation and then toast successful deletion while the handler contains only a placeholder comment. | Treat bulk deletion as unavailable; disable or remove until an authorized bulk/destructive receiver returns per-row outcome and refreshed list truth. |
| Hidden global command mounts | Desktop FAB and mobile bottom-bar containers mount insurance/support hooks before deciding they are hidden. | Action-owned command dependencies only; no route-independent sensitive list acquisition from shell controls. |

## Action Class And Receiver Map

| User-visible action or detail | Operation class | Canonical receiver or source | Console rule for this pass |
| --- | --- | --- | --- |
| Review/manage support tickets | Conditional ordinary CRUD | `support_tickets` owner/admin policy | Platform admin action is source-supported; org-admin/provider management needs authority before enablement. |
| Respond/assign ticket | Workflow/field contract repair | Supported response and assignment receiver still needs reconciliation | Do not claim response persistence while app/Console field contract differs. |
| View FAQs | Scoped read projection | `support_faqs` public read | Patient app remains consumer; Console authoring stays dormant. |
| Create/edit/publish health content | Excluded pending receiver | `health_news` currently published-read only | Remove or disable authoring promise until fields and policy exist. |
| Import health-content rows or download import template | Dormant/excluded capability | `BulkImportModal` and `bulkImportHealthNews` have no mounted authorized receiver | Do not mount or treat the CSV template/import path as implemented until content write and provenance authority exists. |
| View/manage insurance policy | Patient CRUD or missing admin command | `insurance_policies` owner policy | Administrative verify/CRUD needs guarded authority first. |
| View insurance billing outcome | Backend-derived/scoped read evidence | `insurance_billing` trigger-created result | Add hospital/admin result visibility; do not recreate settlement from UI. |
| Upload insurance card evidence | Sensitive storage command | Private object ownership and signed URL strategy | Verify Storage policy/object-path lifecycle before implementation. |
| Read/mark operator notification | Owner-scoped CRUD subset | `notifications` own insert/read/update | Do not generalize into patient notification deletion or broadcast authority. |
| Enter health-news or insurance management | Role-scoped UI access projection | Consolidated live route/navigation/panel authority plus authorized receiver | Viewer/org-admin entry points remain hidden or deliberately read-only until management authorization is proved. |
| View/edit insurance policy detail | Patient-owned read/write or missing administrator command | `insurance_policies` policy owner plus guarded administrative receiver not currently proved | Fix broken callback shape only as part of authority-aligned command implementation; do not interpret current button as authorized. |
| Open support ticket details | Scoped read projection | Ticket owner/admin projection | Details must be genuinely read-only unless actor has the proved command capability. |
| Assign/update/delete support ticket | Conditional workflow/destructive command | Current source proves owner/admin operations only | Remove provider/org-admin management promises until RLS/RPC contract proves them. |
| Load insurance/support data for a global action button | Excluded shell acquisition | No read is needed until an authorized care surface or opened command requires it | Do not mount full read/realtime hooks merely to retain command callbacks in hidden FAB/bottom-bar containers. |
| Export insurance, ticket or content panel data | Unavailable operation until proven | No mounted export receiver or declared dataset found; current controls are disabled placeholders | Preserve disabled/unavailable state or remove the affordance until role scope, fields, completeness and secure export delivery are specified. |
| Bulk delete selected insurance policies, support tickets or health-news rows | Destructive command, currently unsupported | No bulk receiver is invoked; current handlers only show success after placeholder code | Disable/remove immediately; any future bulk operation must specify selected-id scope, actor authority, failure result and list/count invalidation. |

## Field And Receiver Gate

| Required contract cluster | Fields that must be projected or submitted deliberately | Gate before implementation closes |
| --- | --- | --- |
| Insurance policy and billed outcome | coverage percentage/coverage JSON/card object path; billing request/policy/provider amount/status/result context | Policy management and trigger-created billing outcomes are distinct; no UI recreation of billing creation or unsupported admin CRUD. |
| Support operations | ticket submitter, status, assignment, staff response, organization scope and patient visibility | Reconcile missing response/scope fields and role authority before promising response, assignment, or deletion. |
| Content, FAQ, notifications and evidence storage | published feed fields only; FAQ read fields; own notification state; private Storage object path/URL generation lifecycle | Keep authoring dormant under current policy, avoid patient-notification authority expansion, and prove Storage policy before insurance upload persistence. |

## Field-To-UI And Payload-To-Receiver Closure For First Slice

| Console surface/control | Exact field projection required | Payload/receiver gate | App consequence to prove |
| --- | --- | --- | --- |
| Insurance policy row | Policy id, patient/user id, provider name, holder, policy/group numbers, coverage period, type, status, verification state | Policy management commands must prove patient owner/admin authority and one active service owner. | App billing and emergency completion do not receive mismatched or unauthorized policy state. |
| Coverage detail display | Coverage percentage, coverage JSON/card object path, parsed validity state, malformed/unavailable state | Parser must accept object, JSON string, scalar, null, and malformed values without crashing render. | App and console preserve billing meaning instead of dropping malformed evidence. |
| Insurance evidence image | Owner id, storage path, signed-url lifetime, bucket policy, front/back role | Upload/edit disabled until private Storage lifecycle is unified with App path and policy. | Patient insurance cards remain private and are not exposed through stale long-lived URLs. |
| Insurance billing result | Request id, policy id, provider amount/status/result, trigger/RPC source, timestamps | Result surface is read-only until billing exception receiver exists. | Console can explain app billing outcome without recreating or duplicating claim creation. |
| Support ticket row | Ticket id, submitter id, subject, category, priority, status, assigned actor, org scope, patient visibility | Assignment/update/delete require proved role authority; callback truthiness cannot expose commands. | Patient support state remains coherent and staff replies are not promised without receiver fields. |
| Support response display | Staff response, responder id/name, response timestamp, visibility | Read and edit modes must be separate; unavailable response field must be explicit. | App-visible support replies match console actions instead of disappearing into local state. |
| Support queue search/KPIs | Server count, page cursor, filters, role scope, failure/denied/empty state | Local slice metrics cannot be labeled full queue analytics. | Operators do not miss tickets outside the loaded page. |
| FAQ/content/news row | Published id, title, category, body excerpt, publish status, source timestamp | Authoring stays dormant unless RLS/RPC authorizes write. | App sees only published content, not console drafts or unsupported edits. |
| Health-news source destination | Published id, normalized `url`, source label, scheme/host validation result, provenance and unavailable/invalid state | Any retained view/preview opens only validated external destinations using safe new-tab handling; create/edit/publish remains blocked until authorized receiver validates the same field. | The patient discovery feed cannot direct users to arbitrary or malformed links created through unproved Console authoring. |
| Health-news import input | Template fields, actor, source file, row count, validation failures, persisted fields, provenance/audit result | Dormant modal/hook remains excluded; any future import must use only receiver-supported fields and auditable authorization. | Batch input cannot silently publish or alter patient-visible content. |
| Operator notification row | Notification id, user id, read state, action data, created time | Mark-read stays user scoped; delete/broadcast authority remains unavailable. | Console notifications do not expand into patient notification management. |
| Care/content export control | Domain, actor role, selected filters, permitted fields, row/window scope, export format, generated timestamp and unavailable reason | No export can be enabled from the current placeholder without a scoped read/export owner and sensitive-field review. | Insurance evidence, patient support text and unpublished content are not leaked through an unproved download path. |
| Care/content bulk deletion | Domain, selected ids, actor role, destructive authority, per-id result/failure, audit event and refreshed page/count | Existing toast-only actions remain unavailable; no success copy until rows are actually deleted by an authorized receiver and refreshed. | Operators cannot believe policy, support or patient-visible content was removed when database truth did not change. |
| Global care/action shell | Route, actor role, opened command, active surface id | Hidden FAB/bottom-bar containers must not mount full insurance/support reads before an authorized action. | Sensitive patient support/insurance data is not acquired outside the needed surface. |

Implementation rule: the first slice may normalize policy/support/content read projections, parser guards, and role-safe capability maps. It must not retain broad hidden reads, unsupported support assignment/deletion, insurance policy mutation, or evidence upload without receiver proof.

Storage evidence confirmation (May 25): no active App/Console `storage.objects` or bucket-policy authority was found outside archive material. Console currently uploads `documents/insurance-cards/*` with a one-year signed URL while the App uploads `documents/insurance/{user.id}/*` with a one-hour URL; implementation must repair this into one private, owner-scoped evidence lifecycle before retaining Console insurance upload behavior.

## Surface Read, Exposure, And Operation Closure

| Console surface | Current reads and rendered exposure | Current operation exposure | Deterministic finding and implementation requirement |
| --- | --- | --- | --- |
| `/insurance` directory and mobile surface | `useInsurance` loads the full accessible `insurance_policies` collection; page/mobile derive filters, pagination, totals, active/pending/expired/verified ratios and trend language locally. | Add, view, edit, delete and verify callbacks are wired through the page; mobile displays management controls when `canManage`. | No authoritative server page/count or billing-result projection exists. Replace local registry/analytics claims with scoped projection and do not expose policy management beyond proved authority. |
| `InsuranceModal` | Displays provider, holder, policy/group number, coverage period/type, status, images and verification. | Uploads front/back evidence, then create/edit submit; edit calls the page receiver with an incompatible signature. | Current edit is functionally broken and private evidence handling is unproved. One policy command contract must own form payload, storage object lifecycle and verification authorization. |
| `InsurancePanel` context surface | Reads `getInsuranceStats()` and `insuranceData.slice(0, 3)`, rendering total, active, pending and verification rate plus recent policy identifiers. | Emits create, analytics and filter events; renders disabled `Export (Coming Soon)`. | It is a separate exposure of protected policy data and management entry points; bind it to the authorized projection or suppress it for roles without policy authority, and keep export unavailable until a private scoped dataset is defined. |
| `insuranceService` and `insurancePoliciesService` | Duplicate table/read/realtime boundaries; full-list analytics in active service; org-admin all-policy assumption and empty-on-denied/error behavior. | Direct create/update/delete/status/verify/document update writers. | Consolidate active owner and distinguish unavailable, unauthorized and empty; neither duplicate service nor UI role promise authorizes cross-patient policy mutation. |
| Missing billing-result surface | Types and shared schema include `insurance_billing`; completion automation creates billing rows scoped to user/hospital/admin read policies. | No mounted result/exception receiver found. | Add authorized result visibility tied to emergency/visit completion; keep trigger/RPC claim creation outside policy CRUD UI. |
| Competing insurance claim receiver | Completion automation writes the canonical billing schema, while `process_insurance_claim()` is source-present with legacy insert field names and no proved rendered caller. | Available receiver cannot be treated as implemented command authority. | Keep result visibility read-only initially; repair or retire the legacy RPC before offering claim processing or billing exception mutation. |
| `/support-tickets` route/mobile list | Hook/service obtain an unpaged list, route displays analytics from a separate full collection query, and mobile slices loaded data while local search/filtering is presented as queue browsing. Mobile also computes queue/resolution trends from received tickets and labels them `LIVE`. | Create, detail/edit, delete and assign callbacks; provider route entry exists. | Establish server-scoped list/count/search and role-specific row projection; mobile queue metrics require measured aggregate basis or unavailable/current-window labels, not complete-queue claims from unrestricted or failed reads. |
| `SupportTicketModal` and grid/list/table variants | Modal renders subject, message, priority, category and status; no rendered staff response field exists. | View opens edit mode; list/table authorization sees truthy function object and can expose edit/delete irrespective of the actor. | Split read and edit modes; reconcile app-visible response contract; gate commands before view composition and before any optimistic success copy. |
| `SupportTicketsPanel` global context | Uses global summary props but directly reads three latest rows and mounts its own unscoped realtime listener. | Emits create and filter events; Preview has no evidenced receiver; renders disabled `Export (Coming Soon)`. | Remove duplicate direct acquisition/realtime ownership and classify or disable each event receiver; do not expose support-message exports without explicit scope and redaction policy. |
| `ContextAwareFAB` and `DynamicBottomBar` | Each is rendered by the app shell and calls `useInsurance()` plus `useSupportTickets()` before a viewport early return, causing route-independent policy/ticket reads and channels. | Their visible version can later open create command modals, but hidden versions still acquire data. | Do not load protected list truth to mount a command button; move create callbacks into opened authorized modal flow or a no-read command adapter. |
| Care realtime browser output | `useInsurance` and `useSupportTickets` subscriptions can log policy/ticket change payloads from route or hidden shell-mounted hook instances. | No intended workflow command; browser console receives care-record payloads. | Remove data-bearing logs and hidden acquisition together; protected policy/ticket rows may appear only in authorized rendered projections. |
| `supportFaqsService` | Exposes complete CRUD/search/realtime table capability, while app/shared policy evidence proves public FAQ reading and no Console route was found. | Dormant direct write capability only. | Record as available-table capability without an implemented authorized authoring surface; keep patient read truth, do not invent FAQ admin CRUD. |
| `/health-news` route/mobile/context | Route performs five count requests plus paged article query; modal/service expose content fields while persisted model/policy is narrower; route/nav roles disagree. Mobile derives total/draft/medical/recent and trend claims from articles when summary truth is absent and labels them `LIVE`. Detail view opens persisted source URLs directly while the patient app also opens published health-news URLs. | Create/edit/delete/publish controls and notifications; detail `Visit Source` performs external navigation; context panel renders disabled `Export (Coming Soon)`. | Keep curated published feed only until write receiver and fields are proven; summary failure must not suppress readable content, mobile summary must declare aggregate basis or unavailable state, source URLs require validated/safe external-link semantics, and export stays unavailable until the published-only dataset is explicit. |

## App And Backend Dependency Closure

| Patient/shared truth | Console exposure or missing workflow | Required Pass 7 constraint |
| --- | --- | --- |
| Patient insurance is an app-owned coverage and claims entry point; `insurance_policies` stores sensitive owner data. | Console shows card images, policy identifiers and verification actions with overlapping service authority. | Only authorized, scoped policy reads and explicitly approved operator commands may be implemented; private media delivery must be unified with app ownership. |
| Emergency completion automatically creates `insurance_billing` outcome rows linked to request, hospital, user and policy. | Console policy page cannot show the result of completed insured care. | Add hospital/admin billing-outcome read projection joined to Pass 1/Pass 6 lifecycle truth, without recreating claims from the browser. |
| Shared RLS proves users manage their own insurance policies; billing results have separate user/hospital/admin policies. | Current service comments infer org-admin access to all policies because no organization key exists. | Treat policy and billing-result authorization as separate; no unscoped org-admin policy directory. |
| Shared support table and FAQ policy represent patient-facing help continuity. | Console lacks staff-response parity, exposes unproved assignment/delete, and has a dormant FAQ CRUD service. | Implement only response/operation receivers proved by schema and RLS; preserve FAQ read availability without fake authoring. |
| Notification records and content publication affect patient-visible communication. | Console content actions can emit notifications even where content write authority is unproved. | Notification/publish copy and actions remain blocked until content receiver and visibility contract are authoritative. |

## Pass 7 Care/Content/Support Deterministic Surface Register

| Register item | Read/render traced | Mutation/receiver traced | Ownership decision | Status |
| --- | --- | --- | --- | --- |
| Insurance policy directory, modal, mobile and context panel | Yes: policy fields, card images, derived metrics and event entries. | Yes: CRUD, verify and upload calls. | Scoped policy owner plus private evidence owner; current edit signature is broken. | Audited blocker. |
| Insurance billing outcomes | Yes: shared table, trigger and RLS evidence; no live Console consumer. | Yes: creation is backend-triggered, not a Console form action. | Add read-only outcome projection/exception lane. | Audited missing surface. |
| Support route, modal and responsive variants | Yes: ticket fields, analytics and local/mobile projection. | Yes: create/update/delete/assign plus incorrect view-to-edit path. | Scoped support projection and command authority; repair staff response contract. | Audited blocker. |
| Support context panel and realtime | Yes: summary plus direct recent read. | Yes: separate realtime and emitted events. | Consume one owner/invalidation path and disable unproved actions. | Audited drift. |
| Support FAQ capability | Yes: service CRUD/search/realtime and shared public-read evidence. | Yes: no mounted Console receiver found. | Keep authoring dormant until write policy and surface exist. | Audited missing authorized surface. |
| Health-news route, modal, mobile and panel | Yes: paged content, summary counts and editor fields. | Yes: write/publish/delete and notification operations. | Restrict to proved feed model; do not preserve unsupported authoring. | Audited blocker. |
| Health-news bulk import/template utility | Yes: source-present CSV/template/import fields; no mounted consumer found. | Yes: service/hook import exists without proved UI or policy. | Keep dormant/excluded until authorized published-feed writer and audit trail exist. | Audited dormant capability. |
| Notifications and evidence storage | Yes: operator notification/media dependency. | Yes: notification writes and insurance image upload URL generation. | Separate patient/operator notification policy; prove private storage lifecycle. | Audited dependency blocker. |
| Disabled care/content exports | Yes: visible context-panel placeholders over insurance, support and health-news projections. | Yes: currently disabled with no receiver. | Keep unavailable until role-safe dataset/export receiver exists. | Audited unavailable operation. |
| Care/content bulk deletion | Yes: selected-row destructive affordances on insurance, support and health-news routes. | Yes: handlers contain placeholder comments followed by success toasts. | Disable until authorized batch/delete receiver and per-row reflection exist. | Audited false-success blocker. |

## Exact Care, Content, And Support Flow Exhibits

These exhibits are the line-level contract map for implementation. They should be updated, not replaced, as code changes.

| Exhibit | Code anchor | Current contract break | Implementation target |
| --- | --- | --- | --- |
| Insurance full-list hook mount | `frontend/src/components/pages/InsuranceManagementPage.jsx:41-53` and `frontend/src/hooks/useInsurance.js:15-39` | The page receives a full accessible policy collection and treats failures/denials through hook state rather than a typed read projection. | Create a scoped policy projection that distinguishes empty, unauthorized and unavailable. |
| Insurance edit receiver mismatch | `frontend/src/components/pages/InsuranceManagementPage.jsx:231-238` | The save handler reports success after calling broad create/update paths, while modal payload/media authority is not proved. | One policy command receiver owns create/edit/verify/upload payload shape and result reflection. |
| Insurance false bulk delete | `frontend/src/components/pages/InsuranceManagementPage.jsx:877-901` | The bulk action displays destructive success while no authorized per-row receiver is invoked in the documented handler path. | Disable/remove until batch policy deletion is authorized, audited and reflected in refreshed list/count truth. |
| Insurance realtime disclosure | `frontend/src/hooks/useInsurance.js:141-146` | Realtime policy payloads are logged to the browser console from any mounted hook instance. | Remove data-bearing logs and prevent hidden shell mounts from acquiring policy rows. |
| Support read/update role bug | `frontend/src/components/pages/SupportTicketsPage.jsx:210,674-675,713-737` | View can enter edit mode, list/table get `isAdmin` as a truthy function object, and bulk delete reports success without a receiver. | Split read-only detail from command mode; evaluate capabilities before props reach each variant; disable bulk delete. |
| Support realtime disclosure | `frontend/src/hooks/useSupportTickets.js:123-128` | Support-ticket change payloads can be logged from route or hidden shell hook instances. | Use one invalidation owner and remove payload logs. |
| Support staff response gap | `frontend/src/services/supportTicketsService.js:133-202` | Create/update payloads allow subject/message/category/priority/status/assignment, but the patient-visible staff response contract remains absent. | Add or explicitly omit a response projection; do not claim response persistence until app and Console fields align. |
| Health-news URL entry/open | `frontend/src/components/modals/HealthNewsModal.jsx:225-236,315-319` | Operators can enter a URL and the view opens it directly; the patient app later consumes the same published URL. | Add validated external-link provenance, allowed schemes and safe-open behavior before publication or preview. |
| Health-news write payload | `frontend/src/components/pages/HealthNewsManagementPage.jsx:260-281` and `frontend/src/services/healthNewsService.js:135-183` | Route and service accept authoring fields under an unproved content write authority. | Keep published-feed read model separate from dormant CMS/write commands until RLS and receiver proof exist. |
| Health-news dormant bulk import | `frontend/src/components/modals/BulkImportModal.jsx:10-123,271` and `frontend/src/hooks/useHealthNews.js:86-88` | CSV template/import code exists but no mounted authorized route consumer was proved. | Keep dormant; future import must share the content write receiver, validation and audit trail. |
| Health-news realtime disclosure | `frontend/src/hooks/useHealthNews.js:121-126` | Published/content row changes are logged to the browser console. | Remove payload logging and use owner invalidation only. |
| Mobile local-live metrics | `frontend/src/components/mobile/MobileSupportTickets.jsx:56-66,132-208` and `frontend/src/components/mobile/MobileHealthNews.jsx:56-67,159-234` | Loaded-window counts and trends are labelled `LIVE` as if they are complete queue/content analytics. | Replace with server aggregate basis or label as current loaded window/unavailable. |
| Panel export placeholders | `frontend/src/components/context/InsurancePanel.jsx:148-151`, `frontend/src/components/context/SupportTicketsPanel.jsx:204-207`, `frontend/src/components/context/HealthNewsPanel.jsx:203-206` | Disabled exports are visible over sensitive data without declared dataset, role scope or delivery receiver. | Keep unavailable or remove until each export projection is specified. |

## Cross-Pass Care And Support Register

| Dependency pass | Shared object or decision | Why Pass 7 cannot close independently | Required handoff |
| --- | --- | --- | --- |
| Pass 1 emergency detail | `emergency_requests` completion and incident context | Insurance billing outcomes arise from emergency lifecycle and need request detail linkage. | Billing-result projection joins confirmed incident outcome only. |
| Pass 2 wallet/payment | Payment amount, settlement and patient responsibility | Coverage result cannot contradict payment/ledger truth. | Join confirmed finance values; no synthetic settlement claim. |
| Pass 3 hospital/capacity | Hospital identity and organization scope | Billing visibility is hospital scoped for org administration. | Use verified facility/organization relationship for billing result access. |
| Pass 4 identity/access | Actor role, patient privacy and route authority | Policy, evidence image and ticket operations expose sensitive data. | Correct route/navigation/command capability matrix before enabling actions. |
| Pass 6 visits/history | Completed care history and insurance indication | Visit modal exposes insurance while patient history reflects completed event. | Link outcome reads to request-derived visit evidence; do not let visit edit substitute for claim handling. |
| Pass 8 global/dashboard | Context panels, analytics, notifications and event receivers | Protected counts/actions can leak outside route owners. | Consume same scoped projections and explicit receiver registry. |

## Pass 7E Care/Content Implementation Sequence And Blocker Matrix

This pass handles sensitive communication and evidence surfaces. Insurance policies, support tickets, insurance card images, billing outcomes and content publication all affect patient trust. The first implementation must centralize read projections, remove hidden protected reads, and disable false destructive/export actions before enabling any write path.

### Work Order

| Order | Slice | Can start now? | Target | Must not do |
|---|---|---:|---|---|
| 1 | Care/content projection contracts | Yes | Add read-only projections for insurance policies, insurance billing outcomes, support tickets, health-news feed rows, notifications and unavailable exports/imports. | Do not mutate policies, tickets, content, notifications, Storage or billing rows. |
| 2 | Hidden shell acquisition removal | Yes | Stop `ContextAwareFAB` and `DynamicBottomBar` from mounting full insurance/support hooks before an authorized surface opens. | Do not load protected policy/ticket lists just to keep a hidden command button alive. |
| 3 | Browser payload log cleanup | Yes | Remove/restrict realtime or action logs that expose policy, ticket, content or care update payloads. | Do not emit protected care records into ordinary browser console output. |
| 4 | False command downgrade | Yes | Disable/remove toast-only bulk deletes, disabled exports that look like capability, support view-as-edit, unsupported FAQ authoring, health-news bulk import and unproved content write actions. | Do not show success for delete/export/import/respond/publish when no authorized receiver ran. |
| 5 | Insurance read projection | After slice 1 | Consolidate duplicate insurance service ownership into one scoped policy projection with empty/unauthorized/unavailable states. | Do not treat provider denial or query failure as an empty policy list. |
| 6 | Support read projection | After slice 1 | Add server-scoped list/count/search and role-specific support row projection with read versus edit modes. | Do not expose assignment/delete/provider management beyond proven owner/admin authority. |
| 7 | Health-news published-feed projection | After slice 1 | Separate current published-feed fields from unsupported CMS/draft/import fields and validate source URL shape. | Do not publish arbitrary or malformed links into patient-facing navigation. |
| 8 | Insurance billing result projection | Cross-pass with Pass 1/2/6 | Add read-only `insurance_billing` visibility tied to completed emergency/visit/payment truth. | Do not recreate claim creation or exception mutation from policy CRUD UI. |
| 9 | Insurance evidence Storage | Blocked until Storage proof | Unify App/Console private card object path, signed URL lifetime, actor scope, retention and cleanup. | Do not persist one-year signed card URLs under unproved bucket policy. |
| 10 | Care/content write receivers | Blocked until policy/RPC proof | Enable support responses, policy verification, content publish or notification sends only after exact receiver and reflected state are proved. | Do not infer write authority from service methods alone. |

### Blocker Matrix

| Status | Work item | Reason |
|---|---|---|
| Ready | Read-only projection scaffolds | Existing exhibits identify required fields, consumers, hidden acquisition paths and sensitive states. |
| Ready | Disable false bulk deletes | Current handlers can toast success without receivers across care/content routes. |
| Ready | Remove hidden support/insurance reads | Shell containers mount hooks even when hidden and unrelated to the current route. |
| Ready | Remove care realtime payload logs | Data-bearing logs are exposure hazards and do not require backend changes. |
| Ready | Keep exports/imports unavailable | Current export/import affordances do not have dataset, role or receiver proof. |
| Ready after projection | Insurance/support/health-news route migration | Needs shared projections so desktop, mobile and panels stop deriving conflicting truth. |
| Cross-pass | Insurance billing outcomes | Requires emergency, payment and visit truth from Passes 1, 2 and 6. |
| Cross-pass | Route/action authority | Requires Pass 4 identity/access consistency. |
| Cross-pass | Analytics/export shell | Requires Pass 8 export and dashboard ownership. |
| Blocked | Insurance admin CRUD | Current policy proof does not authorize broad admin/org-admin policy mutation. |
| Blocked | Insurance card upload | Active Storage policy and private object lifecycle are unproved. |
| Blocked | Support staff response | App/Console field contract needs reconciliation before response persistence is claimed. |
| Blocked | Health-news authoring/publish/import | Write policy and persisted field shape are not proved. |
| Blocked | Notification sends | Content/support/system notification authority must be separated from display truth. |

### First Implementation Ticket Contract

The first code pass should be a read/disable pass:

- Add or identify care/content projection services for:
  - insurance policy list/detail,
  - insurance billing result read-only evidence,
  - support ticket list/detail,
  - health-news published feed,
  - operator notifications,
  - unavailable export/import state.
- Return explicit states for:
  - empty,
  - unauthorized,
  - unavailable,
  - partial current window,
  - hidden shell acquisition blocked,
  - receiver missing.
- Expose command readiness as data:
  - `canCreateSupportTicket`
  - `canRespondToSupportTicket`
  - `canAssignSupportTicket`
  - `canDeleteSupportTicket`
  - `canBulkDeleteSupportTickets`
  - `canManageInsurancePolicy`
  - `canVerifyInsurancePolicy`
  - `canUploadInsuranceEvidence`
  - `canViewInsuranceBillingOutcome`
  - `canPublishHealthNews`
  - `canImportHealthNews`
  - `canExportCareData`
- Default unsafe commands to `false` with `disabledReason`, source owner and pass dependency.
- Keep `supportFaqsService` dormant and explicitly unmounted until authoring authority exists.

The first implementation ticket should not touch:

- insurance policy mutations,
- insurance card uploads,
- support ticket assignment/delete/response writes,
- health-news create/edit/publish/import writes,
- notification sends,
- billing claim creation or exception mutation,
- Storage policies,
- browser-side `exec_sql` or diagnostic helpers,
- database migrations or cleanup.

### Acceptance Gates For Implementation

Before the first implementation commit:

- Hidden FAB/bottom-bar containers do not acquire full insurance or support lists.
- Insurance, support and health-news mobile metrics label current-window values or use aggregate proof.
- Support view mode cannot open editable fields unless command capability is true.
- Insurance edit path has one typed payload contract before any save remains enabled.
- Disabled exports remain explicitly unavailable and do not imply a downloadable dataset.
- Bulk delete actions are unavailable unless a real receiver returns per-row results and refreshed counts.
- Health-news source URLs are validated before preview/publication and use safe-open behavior.
- Billing outcome is read-only and tied to request/visit/payment truth.
- Browser console output contains no protected policy/ticket/content payloads from normal realtime/action flows.

Suggested verification once code changes begin:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" frontend/src frontend/docs
npm run build
```

Runtime smoke after code begins should include insurance, support tickets, health news, context panels, mobile variants, hidden global action containers and notification center. Storage upload, support response, policy mutation, content publishing, notification sending, imports, exports and billing exception mutation remain excluded until a separate implementation pass explicitly authorizes non-production receiver testing.

## Implementation Packages

### 1. Support Ticket Contract

Define:

- ticket create shape from app and console
- staff/admin response field semantics
- status transitions
- assignment roles
- org/provider visibility
- patient visibility
- realtime owner

Acceptance gate:

- A patient-created ticket can be persisted and then rendered/operated in console with the same fields.

### 2. Support FAQ Boundary

- Expose FAQs through the patient app's public-read path only under the current contract.
- Keep the console adapter dormant and do not add a management route while write authorization is absent.
- Retire unused adapter code only in a separate cleanup pass after import proof.

Acceptance gate:

- `supportFaqsService.js` is not left unowned after Pass 7.

### 3. Insurance Owner Consolidation

- Retain `insuranceService.js` as the full active workflow/normalization facade because `useInsurance` and policy actions consume it.
- Restrict `insurancePoliciesService.js` to current compatible subscription/read support while consolidating duplicate writes.
- Retire duplicate paths only after import and realtime ownership proof.

Acceptance gate:

- Insurance hooks/modals/pages import from one chosen boundary.
- Admin/org-admin insurance actions are hidden, neutral, or routed through authorized receiver until policy proof exists.

### 4. Insurance Card Storage

Define:

- bucket and path
- public/private access
- signed URL needs
- front/back image replacement
- cleanup policy
- role and patient-consent policy

Acceptance gate:

- Insurance image upload does not leak private patient documents through public URLs unless explicitly approved and policy-backed.

### 5. Insurance Billing Outcomes

Add a scoped billing-result projection for `insurance_billing`:

- link billing result to policy, user, hospital and emergency request context
- render claim/billing status and amounts only where current hospital/admin policy authorizes access
- leave trigger-owned billing creation intact
- do not convert policy CRUD into claim adjustment authority without a separate guarded command receiver

Acceptance gate:

- Support/admin or hospital operators can understand the insurance outcome of completed care where authorized, without silently mutating claim truth.

### 6. Health News Published-Feed Boundary

- Treat current `health_news` as a curated published link/feed boundary.
- Normalize and validate any retained published source URL and open preview links with safe external-navigation handling; patient app navigation must consume the same valid-link contract.
- Remove or disable unsupported CMS-style article fields and draft/write claims until an authorized receiver/policy expansion exists.
- Keep `BulkImportModal` and `bulkImportHealthNews` unmounted/dormant until bulk validation, field persistence, role authority and provenance logging are part of that receiver contract.

Acceptance gate:

- UI does not render editable `description`, `content`, or `icon` fields unless the receiver persists them.
- Draft/publish actions require RLS/RPC proof before enablement.

### 7. Notification Ownership

Split:

- console operator notification center
- patient notifications
- system-triggered emergency/support/content notifications
- read/update/delete policies

Acceptance gate:

- Console operator notification actions remain self-scoped.
- Patient notification delete/clear drift is routed to app/shared policy repair, not hidden under console UI polish.
- Disabled panel exports remain unavailable unless a later pass proves permitted fields, complete/bounded dataset scope and a secure export receiver for that domain.

## Verification Plan

Static:

- `git diff --check`
- mojibake/encoding scan for touched text files

Frontend:

- Browser smoke on support tickets, health news, insurance modal/surface if present, and notification center.
- Empty/degraded/unauthorized states for support and insurance.
- Health-news editor/source-link smoke for chosen content model, including invalid URL/unavailable rendering and safe external-navigation behavior.
- Confirm insurance, support and health-news panel export controls are absent or explicitly unavailable until a scoped export contract exists.
- Confirm no health-news bulk import/template action is mounted while content write authority remains unproved.

Backend/RLS/RPC/Storage:

- RLS tests for support ticket owner/admin/org/provider roles.
- Read-only schema proof for support ticket fields used by app and console.
- Browser console smoke for insurance/support actions and realtime updates proves no policy or ticket payload is logged.
- RLS tests for insurance admin/org/patient access before enabling admin CRUD.
- Storage policy tests for insurance card images.
- Health-news draft/write/read policy proof.
- Notification delete/update policy proof for patient app drift.

Stop conditions:

- Do not expose insurance admin CRUD without authorization proof.
- Do not keep health-news fields that are discarded by the service/table.
- Do not add FAQ UI before deciding whether FAQs are still product-owned.
- Do not publish or send notifications during planning.
- Do not invoke or wire browser-side `exec_sql`/diagnostic helpers as care, support or insurance implementation paths.
