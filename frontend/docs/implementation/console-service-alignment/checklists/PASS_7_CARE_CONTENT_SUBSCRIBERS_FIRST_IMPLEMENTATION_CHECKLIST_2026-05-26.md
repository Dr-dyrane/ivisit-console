# Pass 7 Care Content And Subscribers First Implementation Checklist - 2026-05-26

## Status

Implementation-control checklist only. This document does not authorize insurance policy mutation, insurance evidence upload, support ticket response/assignment/delete, health-news publish/import/delete, notification send, subscriber update/delete/export, welcome/custom/bulk email send, unsubscribe endpoint work, Edge Function invocation, Storage upload, database migration, cleanup, seed, reset, or production data repair.

Pass 7 starts by centralizing sensitive read projections, removing hidden shell acquisition, and disabling false export/import/delete/email controls.

## Source Chain Read Before Editing

Read these docs first:

- `frontend/docs/implementation/console-service-alignment/passes/PASS_7_CARE_CONTENT_SUPPORT_FLOW_SUBPLAN_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/passes/PASS_7_SUBSCRIPTION_MANAGEMENT_FLOW_SUBPLAN_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/passes/PASS_7_SUBSCRIPTION_MANAGEMENT_EVIDENCE_AUDIT_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/stages/STAGE_6_IMPLEMENTATION_PASS_PLAN_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/services/STAGE_5_FULL_SERVICE_COVERAGE_AUDIT_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/contracts/CARE_CONTENT_ANALYTICS_CONTRACT_CHART_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/contracts/IDENTITY_VISITS_SUBSCRIBERS_CONTRACT_CHART_2026-05-24.md`

Then re-run mounted-source scans:

```powershell
rg -n "InsuranceManagementPage|InsuranceModal|MobileInsurance|InsurancePanel|SupportTicketsPage|SupportTicketModal|SupportTicketsPanel|MobileSupportTickets|HealthNewsManagementPage|HealthNewsModal|MobileHealthNews|HealthNewsPanel|BulkImportModal|SubscriptionManagementPage|SubscriptionModal|SubscriptionsPanel|MobileSubscriptions|ContextAwareFAB|DynamicBottomBar|useInsurance|useSupportTickets|useHealthNews|useSubscription" frontend/src
rg -n "console\.log|console\.error|Export|Bulk|delete|sendWelcome|sendCustomEmail|sendBulkEmail|unsubscribe|upload|storage|admin_response|assignment|status|verification|paid|revenue|premium|LIVE|exec_sql|openEmailActionsModal" frontend/src/components frontend/src/hooks frontend/src/services frontend/src/utils frontend/src/emails
```

## Runtime Files In Scope

Care/content/support:

- `frontend/src/components/pages/InsuranceManagementPage.jsx`
- `frontend/src/components/modals/InsuranceModal.jsx`
- `frontend/src/components/mobile/MobileInsurance.jsx`
- `frontend/src/components/context/InsurancePanel.jsx`
- `frontend/src/hooks/useInsurance.js`
- `frontend/src/services/insuranceService.js`
- `frontend/src/services/insurancePoliciesService.js`
- `frontend/src/components/pages/SupportTicketsPage.jsx`
- `frontend/src/components/modals/SupportTicketModal.jsx`
- `frontend/src/components/mobile/MobileSupportTickets.jsx`
- `frontend/src/components/context/SupportTicketsPanel.jsx`
- `frontend/src/hooks/useSupportTickets.js`
- `frontend/src/services/supportTicketsService.js`
- `frontend/src/services/supportFaqsService.js`
- `frontend/src/components/pages/HealthNewsManagementPage.jsx`
- `frontend/src/components/modals/HealthNewsModal.jsx`
- `frontend/src/components/modals/BulkImportModal.jsx`
- `frontend/src/components/mobile/MobileHealthNews.jsx`
- `frontend/src/components/context/HealthNewsPanel.jsx`
- `frontend/src/hooks/useHealthNews.js`
- `frontend/src/services/healthNewsService.js`
- `frontend/src/services/notificationService.js`
- `frontend/src/services/storageService.js`
- `frontend/src/utils/runMigrations.js`
- `frontend/src/utils/testDatabase.js`

Subscribers/email:

- `frontend/src/components/pages/SubscriptionManagementPage.jsx`
- `frontend/src/components/modals/SubscriptionModal.jsx`
- `frontend/src/components/mobile/MobileSubscriptions.jsx`
- `frontend/src/components/context/SubscriptionsPanel.jsx`
- `frontend/src/components/views/SubscriptionListView.jsx`
- `frontend/src/components/views/SubscriptionTableView.jsx`
- `frontend/src/hooks/useSubscription.js`
- `frontend/src/services/subscriptionService.js`
- `frontend/src/services/subscribersService.js`
- `frontend/src/emails/ivisit106Campaign.js`
- `frontend/src/services/analyticsService.js`

Shared shell consumers:

- `frontend/src/components/navigation/ContextAwareFAB.jsx`
- `frontend/src/components/navigation/DynamicBottomBar.jsx`
- `frontend/src/components/navigation/ContextPanel.jsx`
- `frontend/src/contexts/PageDataContext.jsx`

## Explicitly Excluded

Do not include these in the first implementation slice:

- Insurance policy create/update/delete/verify or billing exception mutation.
- Insurance card or evidence upload.
- Support ticket create/update/delete/assign/respond/status writes.
- FAQ authoring.
- Health-news create/edit/publish/delete/import.
- Notification send/broadcast.
- Subscriber edit/delete/status/type/unsubscribe/export.
- Welcome, custom or bulk email send.
- Email template endpoint rewrites or Edge Function deployment.
- Storage policy or bucket changes.
- Browser-side `exec_sql` or diagnostic helper use.
- Database migration, cleanup, seed, reset, backfill or production data repair.

## First Safe Slice

The first implementation package is read/disable/projection only.

Allowed:

- Add or identify care/content/subscriber projection boundaries.
- Stop hidden shell controls from mounting full protected insurance/support/subscriber reads before an authorized route or command opens.
- Disable false bulk deletes, placeholder exports, dead broadcast events, dormant bulk import, unsupported edit/delete/status/type controls, and unsupported health-news authoring.
- Label local loaded-window metrics as current-window or mark them unavailable.
- Remove or redact realtime/action payload console logs.
- Keep insurance billing as read-only unavailable or scoped evidence, not a claim mutation lane.
- Keep email lifecycle commands unavailable until deployed slug, idempotency, durable sent/unsubscribe state and per-recipient results are proved.
- Repair visible mojibake in touched care/content/subscriber files.

Blocked:

- Any runtime write receiver implementation listed in the excluded section.

## Projection Contracts

### Care Content Projection

| Slice | Required fields |
| --- | --- |
| `insurancePolicyList` | `rows`, `page`, `pageSize`, `totalCount`, `countBasis`, `readState`, `scope`, `degradedReason`. |
| `insurancePolicyRow` | `policyId`, `patientId`, `providerName`, `status`, `verificationState`, `evidenceState`, `billingOutcomeState`, `commandCapabilities`. |
| `insuranceBillingOutcome` | `billingId`, `requestId`, `visitId`, `policyId`, `hospitalId`, `amounts`, `status`, `readOnlyReason`. |
| `supportTicketList` | `rows`, `page`, `pageSize`, `totalCount`, `statusCounts`, `scope`, `readState`, `degradedReason`. |
| `supportTicketRow` | `ticketId`, `requesterId`, `status`, `priority`, `category`, `patientVisibleResponseState`, `assignmentState`, `commandCapabilities`. |
| `healthNewsFeed` | `rows`, `page`, `pageSize`, `totalCount`, `publishedFieldCoverage`, `sourceUrlState`, `writeState`, `importState`, `commandCapabilities`. |
| `notificationStream` | `rows`, `scope`, `readState`, `markReadState`, `sendState`, `patientNotificationBoundary`. |
| `careExportState` | `domain`, `datasetState`, `fieldAllowlist`, `scope`, `deliveryReceiver`, `disabledReason`. |

### Subscriber Projection

| Slice | Required fields |
| --- | --- |
| `subscriberList` | `rows`, `page`, `pageSize`, `totalCount`, `scope`, `readState`, `filterState`, `degradedReason`. |
| `subscriberRow` | `subscriberId`, `email`, `type`, `tierLabel`, `status`, `newUserState`, `welcomeState`, `unsubscribeState`, `createdAt`. |
| `emailCommandState` | `welcomeAvailable`, `customAvailable`, `bulkAvailable`, `receiverSlugState`, `idempotencyState`, `perRecipientResultState`, `disabledReason`. |
| `subscriberExportState` | `fieldAllowlist`, `rowScope`, `deliveryReceiver`, `disabledReason`. |

Required care command capability names:

- `canManageInsurancePolicy`
- `canVerifyInsurancePolicy`
- `canUploadInsuranceEvidence`
- `canViewInsuranceBillingOutcome`
- `canCreateSupportTicket`
- `canRespondToSupportTicket`
- `canAssignSupportTicket`
- `canDeleteSupportTicket`
- `canBulkDeleteSupportTickets`
- `canPublishHealthNews`
- `canImportHealthNews`
- `canDeleteHealthNews`
- `canExportCareData`
- `canSendNotification`

Required subscriber command capability names:

- `canCreateSubscriber`
- `canCreateSubscriberWithWelcome`
- `canEditSubscriber`
- `canDeleteSubscriber`
- `canBulkDeleteSubscribers`
- `canSendWelcome`
- `canSendCustomEmail`
- `canSendBulkEmail`
- `canExportSubscribers`
- `canOpenBroadcast`
- `canUseUnsubscribeLink`

Every unsafe command defaults to `false`.

## Surface Disposition Matrix

| Surface | Retain first | Disable or relabel first | Receiver proof before enabling |
| --- | --- | --- | --- |
| `/insurance` and `MobileInsurance` | Read-only scoped policies where authorized. | Edit/verify/delete/upload, local `LIVE` metrics, query-failure-as-empty state. | Policy command receiver, RLS proof, Storage proof and reflected read. |
| `InsuranceModal` | View policy details when authorized. | Save if callback/payload shape is broken; private card image upload; verification mutation. | Typed payload, actor scope, Storage path, billing consequence. |
| `InsurancePanel` | Read-only summary if source-labelled. | Export placeholder as capability. | Export dataset, field allowlist, delivery receiver. |
| Insurance billing outcomes | Read-only unavailable or scoped evidence. | Claim/exception mutation from policy CRUD. | Trigger/read projection tied to emergency, visit, payment and facility scope. |
| `/support-tickets` and variants | Read-only ticket list/detail. | View-as-edit, assignment/status/delete, false bulk delete, local `LIVE` queue metrics. | Support command receiver, staff response field parity, role/RLS proof. |
| `SupportTicketsPanel` | Read-only recent tickets if source-labelled. | Independent broad realtime/read and export placeholder. | Shared support projection and export receiver. |
| `supportFaqsService` | Keep dormant read/write adapter out of UI. | FAQ authoring. | Product decision, route, write policy and receiver. |
| `/health-news` and variants | Published-feed read projection. | Unsupported CMS fields, publish/edit/delete, local `LIVE` content analytics. | Write policy, persisted field shape, safe source URL, reflected read. |
| `HealthNewsModal` | View source URL only after validation. | Arbitrary/malformed source preview/publication. | Safe-open rule and patient-facing URL provenance. |
| `BulkImportModal` | Keep dormant. | Import/template as mounted capability. | Bulk validation, write policy, provenance/audit receiver. |
| Care/content panel exports | Explicit unavailable state. | Export buttons that imply future capability without dataset. | Domain-specific export spec. |
| `/subscriptions` and variants | Platform-admin read-only subscriber list; create row without email where authorized. | Edit/delete/status/type, false bulk delete, revenue/paid conversion language. | Lifecycle receiver, admin scope, billing proof if revenue labels remain. |
| `SubscriptionsPanel` | Admin-only source-labelled subscriber summary. | Dead Broadcast event and raw email exposure outside intended admin scope. | Mounted email command surface and capability. |
| `SubscriptionModal` | Create subscriber without welcome send. | Welcome/custom/bulk send. | Deployed slugs, durable lifecycle fields, idempotency and per-recipient results. |
| Subscriber email templates | Treat unsubscribe link as unproved. | Shipping unsubscribe promises as implemented. | Deployed endpoint, token/privacy policy and durable state writer. |
| `ContextAwareFAB` and `DynamicBottomBar` | Visible command shells only. | Hooking protected insurance/support/subscriber lists while hidden or unrelated. | Action-owned lazy command data and route/auth gate. |

## Field And Parser Gates

Run before implementation:

```powershell
rg -n "JSON\.parse|Number\(|new Date\(|\|\||insurance|policy|billing|support|ticket|admin_response|health_news|url|source|subscriber|welcome_email_sent|new_user|unsubscribe|email|paid|premium|revenue|Export|bulk|delete|upload|exec_sql" frontend/src/components frontend/src/hooks frontend/src/services frontend/src/utils frontend/src/emails
```

Rules:

- Never collapse denied or failed reads into empty lists.
- Never render loaded-window counts as complete queue/content/subscriber analytics.
- Never treat `subscribers.type = paid` as payment, revenue, entitlement or billing proof.
- Never leave a bulk delete button that toasts success without a receiver.
- Never mount hidden global hooks that load protected care/subscriber rows.
- Never publish health-news URLs before scheme/provenance/safe-open validation.
- Never expose private insurance evidence via unproved public/signed URL handling.
- Never send email or claim unsubscribe support until slug topology and durable lifecycle state are proved.
- Never use browser-side `exec_sql` helpers as product implementation.

## App Consequences

Pass 7 touches patient trust directly.

- Support responses must be visible through the same field the patient app reads.
- Insurance billing outcomes are generated by care completion/payment flows, not policy CRUD UI.
- Insurance evidence is private patient data and requires Storage policy proof.
- Health-news URLs become patient-facing external navigation payloads.
- Subscriber rows are marketing/contact truth, not patient accounts, payment success or entitlement.
- Notification ownership must separate Console operator streams from patient notification lifecycle.
- Hidden shell reads can leak sensitive care/subscriber data even when no visible page is open.

## Implementation Packages

### Package 7.1 - Hidden Acquisition And False Capability Removal

Allowed:

- Stop hidden global action containers from full-loading insurance, support and subscriber lists.
- Disable/remove false bulk deletes, dead broadcast events, unsupported exports/imports and unsupported edit/delete/status/type commands.
- Remove revenue/payment wording derived only from subscriber type.
- Remove or redact realtime/action payload logs.
- Add unavailable-state copy for export, import, email, upload and protected command blockers.

Acceptance:

- No hidden shell control fetches protected insurance/support/subscriber rows.
- No bulk delete can report success without a receiver.
- No Broadcast action emits an unreceived event.
- Browser console does not emit policy/ticket/content/subscriber realtime payloads in normal runtime.

### Package 7.2 - Read Projection Repair

Allowed after Package 7.1:

- Consolidate insurance read ownership and distinguish unauthorized, unavailable and empty.
- Consolidate support ticket list/detail read ownership and split read detail from edit command mode.
- Consolidate health-news published-feed read ownership and validate source URLs.
- Consolidate subscriber list read ownership and use one active subscriber facade.
- Keep exports/imports/email sends/uploads unavailable.

Blocked:

- All writes, sends, uploads, imports, exports, Edge calls and migrations.

Acceptance:

- Desktop, mobile and panel surfaces share read basis and command disabled reasons.
- Failed reads are not empty states.
- Subscriber and care metrics state current-window/server-aggregate/unavailable basis.

### Package 7.3 - Receiver Planning Only

Produce follow-up specs for:

- Insurance policy management and verification.
- Insurance evidence upload.
- Insurance billing outcome view and exception workflow.
- Support response, assignment, status and delete.
- FAQ authoring or explicit retirement.
- Health-news authoring, source URL validation and import.
- Notification sends.
- Subscriber welcome/custom/bulk email lifecycle.
- Subscriber unsubscribe endpoint and export.

Each spec must name payload fields, receiver, actor scope, privacy/exposure rule, audit event, reflected read, app/public consequence, failure copy and non-production test path.

## Verification

Docs-only checklist verification:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" frontend/docs/implementation/console-service-alignment/checklists/README.md frontend/docs/implementation/console-service-alignment/checklists/PASS_7_CARE_CONTENT_SUBSCRIBERS_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md
rg -n --pcre2 "[^\x00-\x7F]" frontend/docs/implementation/console-service-alignment/checklists/README.md frontend/docs/implementation/console-service-alignment/checklists/PASS_7_CARE_CONTENT_SUBSCRIBERS_FIRST_IMPLEMENTATION_CHECKLIST_2026-05-26.md
```

Runtime implementation verification, once code begins:

```powershell
git diff --check
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" frontend/src frontend/docs
rg -n "console\.log|console\.warn|console\.error" frontend/src/components/pages/InsuranceManagementPage.jsx frontend/src/components/pages/SupportTicketsPage.jsx frontend/src/components/pages/HealthNewsManagementPage.jsx frontend/src/components/pages/SubscriptionManagementPage.jsx frontend/src/hooks/useInsurance.js frontend/src/hooks/useSupportTickets.js frontend/src/hooks/useHealthNews.js frontend/src/hooks/useSubscription.js frontend/src/services/insuranceService.js frontend/src/services/supportTicketsService.js frontend/src/services/healthNewsService.js frontend/src/services/subscriptionService.js
npm run build
```

Browser smoke, no mutation:

- `/insurance`, `/support-tickets`, `/health-news`, `/subscriptions` route loads.
- Mobile variants for insurance, support, health news and subscriptions.
- Context panels for insurance, support, health news and subscriptions.
- Hidden `ContextAwareFAB` and `DynamicBottomBar` do not acquire protected lists while hidden or on unrelated routes.
- Unsupported export/import/delete/email/upload controls show unavailable state or are absent.
- Browser console scan confirms no protected policy, ticket, content or subscriber payload logs.

## Commit Boundary

Commit Package 7.1 as one coherent care/content/subscriber safety checkpoint after code verification. Package 7.2 and Package 7.3 should remain separate checkpoints unless a projection refactor is inseparable.

This checklist itself belongs to the implementation-plan pack and may be committed with the checklists index after docs-only verification.
