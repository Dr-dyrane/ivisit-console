# Pass 7 Care, Content, And Support Flow Subplan - 2026-05-24

## Status

Detailed implementation subplan only. No product, database, policy, Edge Function, storage upload, content publish, notification send, cleanup, seed, migration, or runtime mutation is authorized by this document.

This subplan covers the non-subscription half of Pass 7: insurance policies, insurance billing outcomes, support tickets, support FAQs, health news/content, notifications, and cross-cutting media upload behavior.

## Source Evidence

Console files inspected:

- `frontend/src/components/pages/HealthNewsManagementPage.jsx`
- `frontend/src/components/modals/HealthNewsModal.jsx`
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
- Support tickets page/hook/service expose admin/org/provider operations, while current policy evidence supports owner/admin, not every rendered role.
- Patient app support insert expects `admin_response`, but the live selectable console table shape did not expose that field in the contract exhibit.
- `supportFaqsService.js` is full CRUD/realtime but no direct UI route was found in the source scan.
- `insuranceService.js` and `insurancePoliciesService.js` overlap insurance policy CRUD and document upload behavior.
- Insurance admin/org-admin promises are not authorized by current owner-only policy source.
- `insurance_billing` is trigger-backed billing truth with hospital/admin visibility in source policy, but no Console billing-outcome view or exception workflow was found.
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
- `SupportTicketsPage.handleView` sets modal mode to `edit`, so a read/detail action opens editable status/message/category/priority inputs. List/table variants also pass `isAdmin` as a function object into components that test it as a boolean, exposing edit/delete controls to every role reaching those variants.
- `SupportTicketsPanel` independently reads the latest three tickets directly from Supabase and mounts its own broad realtime channel alongside hook and page/global data paths.
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
| Notifications | Operator notifications aligned; patient delete policy drift remains. | Notification owner split: console operator stream versus patient notification lifecycle. |
| Browser-side schema/diagnostic utilities | `runMigrations.js` can call `exec_sql`; `testDatabase.js` queries domain tables outside service owners. | Maintenance-only boundary excluded from product flows; retire if unused after import proof. |
| Content and insurance route promise | Navigation/panel role promises disagree with live route and with unproved management authority. | Align visibility with supported read/command authority; do not advertise unavailable management surfaces. |
| Care/content list reliability | Content summary failure can block list results, and insurance/support pagination does not own a server-backed authorized window. | Independent summary degradation plus scoped paged list owners with explicit unavailable/unauthorized/error state. |
| Insurance edit receiver | Modal edit callback signature does not match page save handler, so intended policy field updates can be discarded. | One typed policy command boundary and tested create/edit/verify receiver contract before any management UI remains active. |
| Support read versus edit | View action opens editable modal, and list/table role tests use a function object as authorization. | Separate read detail from command mode and evaluate capability before rendering every command variant. |
| Global support/insurance projections | Context panels use independent reads/stats/events outside route ownership. | One scoped projection/invalidation owner consumed by route, mobile and context panel surfaces. |

## Action Class And Receiver Map

| User-visible action or detail | Operation class | Canonical receiver or source | Console rule for this pass |
| --- | --- | --- | --- |
| Review/manage support tickets | Conditional ordinary CRUD | `support_tickets` owner/admin policy | Platform admin action is source-supported; org-admin/provider management needs authority before enablement. |
| Respond/assign ticket | Workflow/field contract repair | Supported response and assignment receiver still needs reconciliation | Do not claim response persistence while app/Console field contract differs. |
| View FAQs | Scoped read projection | `support_faqs` public read | Patient app remains consumer; Console authoring stays dormant. |
| Create/edit/publish health content | Excluded pending receiver | `health_news` currently published-read only | Remove or disable authoring promise until fields and policy exist. |
| View/manage insurance policy | Patient CRUD or missing admin command | `insurance_policies` owner policy | Administrative verify/CRUD needs guarded authority first. |
| View insurance billing outcome | Backend-derived/scoped read evidence | `insurance_billing` trigger-created result | Add hospital/admin result visibility; do not recreate settlement from UI. |
| Upload insurance card evidence | Sensitive storage command | Private object ownership and signed URL strategy | Verify Storage policy/object-path lifecycle before implementation. |
| Read/mark operator notification | Owner-scoped CRUD subset | `notifications` own insert/read/update | Do not generalize into patient notification deletion or broadcast authority. |
| Enter health-news or insurance management | Role-scoped UI access projection | Consolidated live route/navigation/panel authority plus authorized receiver | Viewer/org-admin entry points remain hidden or deliberately read-only until management authorization is proved. |
| View/edit insurance policy detail | Patient-owned read/write or missing administrator command | `insurance_policies` policy owner plus guarded administrative receiver not currently proved | Fix broken callback shape only as part of authority-aligned command implementation; do not interpret current button as authorized. |
| Open support ticket details | Scoped read projection | Ticket owner/admin projection | Details must be genuinely read-only unless actor has the proved command capability. |
| Assign/update/delete support ticket | Conditional workflow/destructive command | Current source proves owner/admin operations only | Remove provider/org-admin management promises until RLS/RPC contract proves them. |

## Field And Receiver Gate

| Required contract cluster | Fields that must be projected or submitted deliberately | Gate before implementation closes |
| --- | --- | --- |
| Insurance policy and billed outcome | coverage percentage/coverage JSON/card object path; billing request/policy/provider amount/status/result context | Policy management and trigger-created billing outcomes are distinct; no UI recreation of billing creation or unsupported admin CRUD. |
| Support operations | ticket submitter, status, assignment, staff response, organization scope and patient visibility | Reconcile missing response/scope fields and role authority before promising response, assignment, or deletion. |
| Content, FAQ, notifications and evidence storage | published feed fields only; FAQ read fields; own notification state; private Storage object path/URL generation lifecycle | Keep authoring dormant under current policy, avoid patient-notification authority expansion, and prove Storage policy before insurance upload persistence. |

Storage evidence confirmation (May 25): no active App/Console `storage.objects` or bucket-policy authority was found outside archive material. Console currently uploads `documents/insurance-cards/*` with a one-year signed URL while the App uploads `documents/insurance/{user.id}/*` with a one-hour URL; implementation must repair this into one private, owner-scoped evidence lifecycle before retaining Console insurance upload behavior.

## Surface Read, Exposure, And Operation Closure

| Console surface | Current reads and rendered exposure | Current operation exposure | Deterministic finding and implementation requirement |
| --- | --- | --- | --- |
| `/insurance` directory and mobile surface | `useInsurance` loads the full accessible `insurance_policies` collection; page/mobile derive filters, pagination, totals, active/pending/expired/verified ratios and trend language locally. | Add, view, edit, delete and verify callbacks are wired through the page; mobile displays management controls when `canManage`. | No authoritative server page/count or billing-result projection exists. Replace local registry/analytics claims with scoped projection and do not expose policy management beyond proved authority. |
| `InsuranceModal` | Displays provider, holder, policy/group number, coverage period/type, status, images and verification. | Uploads front/back evidence, then create/edit submit; edit calls the page receiver with an incompatible signature. | Current edit is functionally broken and private evidence handling is unproved. One policy command contract must own form payload, storage object lifecycle and verification authorization. |
| `InsurancePanel` context surface | Reads `getInsuranceStats()` and `insuranceData.slice(0, 3)`, rendering total, active, pending and verification rate plus recent policy identifiers. | Emits create, analytics and filter events. | It is a separate exposure of protected policy data and management entry points; bind it to the authorized projection or suppress it for roles without policy authority. |
| `insuranceService` and `insurancePoliciesService` | Duplicate table/read/realtime boundaries; full-list analytics in active service; org-admin all-policy assumption and empty-on-denied/error behavior. | Direct create/update/delete/status/verify/document update writers. | Consolidate active owner and distinguish unavailable, unauthorized and empty; neither duplicate service nor UI role promise authorizes cross-patient policy mutation. |
| Missing billing-result surface | Types and shared schema include `insurance_billing`; completion automation creates billing rows scoped to user/hospital/admin read policies. | No mounted result/exception receiver found. | Add authorized result visibility tied to emergency/visit completion; keep trigger/RPC claim creation outside policy CRUD UI. |
| `/support-tickets` route/mobile list | Hook/service obtain an unpaged list, route displays analytics from a separate full collection query, and mobile slices loaded data while local search/filtering is presented as queue browsing. | Create, detail/edit, delete and assign callbacks; provider route entry exists. | Establish server-scoped list/count/search and role-specific row projection; avoid claiming complete queue analytics from unrestricted or failed reads. |
| `SupportTicketModal` and grid/list/table variants | Modal renders subject, message, priority, category and status; no rendered staff response field exists. | View opens edit mode; list/table authorization sees truthy function object and can expose edit/delete irrespective of the actor. | Split read and edit modes; reconcile app-visible response contract; gate commands before view composition and before any optimistic success copy. |
| `SupportTicketsPanel` global context | Uses global summary props but directly reads three latest rows and mounts its own unscoped realtime listener. | Emits create and filter events; Preview has no evidenced receiver. | Remove duplicate direct acquisition/realtime ownership and classify or disable each event receiver. |
| `supportFaqsService` | Exposes complete CRUD/search/realtime table capability, while app/shared policy evidence proves public FAQ reading and no Console route was found. | Dormant direct write capability only. | Record as available-table capability without an implemented authorized authoring surface; keep patient read truth, do not invent FAQ admin CRUD. |
| `/health-news` route/mobile/context | Route performs five count requests plus paged article query; modal/service expose content fields while persisted model/policy is narrower; route/nav roles disagree. | Create/edit/delete/publish controls and notifications. | Keep curated published feed only until write receiver and fields are proven; summary failure must not suppress readable content. |

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
| Notifications and evidence storage | Yes: operator notification/media dependency. | Yes: notification writes and insurance image upload URL generation. | Separate patient/operator notification policy; prove private storage lifecycle. | Audited dependency blocker. |

## Cross-Pass Care And Support Register

| Dependency pass | Shared object or decision | Why Pass 7 cannot close independently | Required handoff |
| --- | --- | --- | --- |
| Pass 1 emergency detail | `emergency_requests` completion and incident context | Insurance billing outcomes arise from emergency lifecycle and need request detail linkage. | Billing-result projection joins confirmed incident outcome only. |
| Pass 2 wallet/payment | Payment amount, settlement and patient responsibility | Coverage result cannot contradict payment/ledger truth. | Join confirmed finance values; no synthetic settlement claim. |
| Pass 3 hospital/capacity | Hospital identity and organization scope | Billing visibility is hospital scoped for org administration. | Use verified facility/organization relationship for billing result access. |
| Pass 4 identity/access | Actor role, patient privacy and route authority | Policy, evidence image and ticket operations expose sensitive data. | Correct route/navigation/command capability matrix before enabling actions. |
| Pass 6 visits/history | Completed care history and insurance indication | Visit modal exposes insurance while patient history reflects completed event. | Link outcome reads to request-derived visit evidence; do not let visit edit substitute for claim handling. |
| Pass 8 global/dashboard | Context panels, analytics, notifications and event receivers | Protected counts/actions can leak outside route owners. | Consume same scoped projections and explicit receiver registry. |

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
- Remove or disable unsupported CMS-style article fields and draft/write claims until an authorized receiver/policy expansion exists.

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

## Verification Plan

Static:

- `git diff --check`
- mojibake/encoding scan for touched text files

Frontend:

- Browser smoke on support tickets, health news, insurance modal/surface if present, and notification center.
- Empty/degraded/unauthorized states for support and insurance.
- Health-news editor smoke for chosen content model.

Backend/RLS/RPC/Storage:

- RLS tests for support ticket owner/admin/org/provider roles.
- Read-only schema proof for support ticket fields used by app and console.
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
