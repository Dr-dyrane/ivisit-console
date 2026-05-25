# Visits Content Service Map - 2026-05-24

## Status

Third narrowed Stage 2 audit pass. Static source review only.

## Services Reviewed

Console:

- `frontend/src/services/visitsService.js`
- `frontend/src/services/medicalProfilesService.js`
- `frontend/src/services/insuranceService.js`
- `frontend/src/services/insurancePoliciesService.js`
- `frontend/src/services/subscribersService.js`
- `frontend/src/services/subscriptionService.js`
- `frontend/src/services/searchAnalyticsService.js`
- `frontend/src/services/healthNewsService.js`
- `frontend/src/services/supportTicketsService.js`

App reference:

- `ivisit-app/services/visitsService.js`
- `ivisit-app/services/medicalProfileService.js`
- `ivisit-app/services/insuranceService.js`
- `ivisit-app/services/helpSupportService.js`
- `ivisit-app/services/search*`
- `ivisit-app/hooks/visits/*`
- `ivisit-app/hooks/medicalProfile/*`
- `ivisit-app/supabase/tests/scripts/export_table_flow_trace.js`

## Visits, Medical, Insurance Matrix

| Flow | Console Entry | Read Path | Mutation Owner | App Reference | Status |
| --- | --- | --- | --- | --- | --- |
| Visit list/detail | `getVisits()`, `getVisit()` | `visits` joined to profiles. UUID or display ID for detail. | Read-only. | App visits service hydrates visits with emergency request and hospital fallback data. | Drift suspected: console read model is thinner. |
| Visit create/update/delete | `createVisit()`, `updateVisit()`, `deleteVisit()` | None. | Direct `visits` CRUD. | App uses upsert for patient-owned visits but also treats emergency-to-visit DB sync as owner for request-derived rows. | High-risk direct CRUD; must not fight `sync_emergency_to_visit`. |
| Visit completion/cancel/no-show | `completeVisit()`, `cancelVisit()`, `markVisitAsNoShow()` | None. | Direct `visits.update`. | App preserves terminal trip/visit context and dispatches visit notifications. | Drift suspected; lifecycle fields and notifications need ownership proof. |
| Medical profile read/update | `medicalProfilesService.*` | `medical_profiles`, current user check. | Direct table CRUD. | App medical profile hooks/services use a layered query/mutation facade. | Mostly aligned at table level, but admin access and validation RPCs need proof. |
| Insurance policy CRUD | `insuranceService.*`, `insurancePoliciesService.*` | `insurance_policies`, storage `documents`. | Direct table CRUD and storage upload. | App insurance service normalizes policy state and checkout coverage. | Retain `insuranceService` as active workflow facade; reduce the duplicate adapter to compatible read/subscription support pending cleanup. |
| Insurance analytics | `getInsuranceAnalytics()` | `insurance_policies`. | Read-only. | App focuses patient policy use and coverage checks. | Console-owned analytics. |

## Content, Search, Subscriber, Support Matrix

| Flow | Console Entry | Read Path | Mutation Owner | App Reference | Status |
| --- | --- | --- | --- | --- | --- |
| Subscriber CRUD | `subscribersService.*`, `subscriptionService.*` | `subscribers`. | Direct table CRUD remains exposed; current plain `subscriptionService.createSubscriber()` is row-only and the explicit wrapper selects welcome send. | Edge Functions mutate subscribers and send email. | Payload split repaired; update/delete/status authority and duplicate owners remain open. |
| Welcome email state | `markWelcomeEmailSent()`, `sendWelcomeToSubscriber()` in subscription service | `subscribers`. | Explicit welcome command refreshes the row, but `sendWelcome` updates only `new_user`. | `process-subscribers` selects still-unmarked rows and is the reviewed sender that sets `welcome_email_sent`. | Confirmed duplicate-send risk until one lifecycle writer owns durable sent state. |
| Search analytics | `searchAnalyticsService.*` | RPCs and `search_events`. | Direct `search_events.insert` for tracking. | App search services write search history/selections/events for discovery. | Mostly aligned; fallback fake trends should be marked demo-only. |
| Health news CRUD | `healthNewsService.*` | `health_news`. | Direct table CRUD/bulk insert. | App reads public/published content. | Console-owned, but bulk import is mutating and should be guarded. |
| Support tickets | `supportTicketsService.*` | `support_tickets`. | Direct table CRUD/status/assignment. | App help/support service likely owns patient ticket creation. | Mostly aligned; status taxonomy and assignment fields need proof. |

## Key Findings

### 1. Visits Are Both User Records And Emergency Artifacts

Console treats visits as ordinary admin CRUD. App treats visits as hydrated patient history and carefully avoids inventing visit rows from emergency request keys when DB sync owns those rows.

Audit implication: console visit create/update/delete should be treated as drift suspected until the relationship with `sync_emergency_to_visit`, `request_id`, lifecycle fields, ratings, tips, and notifications is mapped.

### 2. App Visit Hydration Is Richer

App visits service hydrates:

```text
visits
emergency_requests by request_id/display_id fallback
hospitals by hospital_id
legacy aliases
lifecycle/rating/tip fields
```

Console currently joins profiles and normalizes aliases, but does not perform the same emergency/hospital fallback hydration.

Audit implication: console may render stale or incomplete visit rows, especially for request-derived visits.

### 3. Subscriber Lifecycle Has Too Many Writers

Subscriber state can be changed by:

```text
subscribersService direct CRUD
subscriptionService direct CRUD
subscriptionService explicit welcome email command
sendWelcome Edge Function
process-subscribers Edge Function
webhooks unsubscribe Edge Function
subscriber scripts
```

Audit implication: before UI implementation, define one state machine for `new_user`, `welcome_email_sent`, `status`, `unsubscribed_at`, and campaign sends.

### 4. Insurance Has Duplicate Service Surfaces

`insuranceService.js` and `insurancePoliciesService.js` both read/write `insurance_policies` and share payload helpers. Duplication is not automatically wrong, but it increases drift risk.

Audit implication: pick one canonical console service facade or document why one is page-specific and one is domain-specific.

### 5. Content And Support Are Console-Owned But Still Need Policy Proof

Health news and support tickets are straightforward CRUD surfaces. They still need RLS/policy verification because public app reads and patient support writes may have different trust boundaries than admin console edits.

## Required Field Maps For Next Pass

### Visits

- `visits.id`
- `visits.display_id`
- `visits.request_id`
- `visits.user_id`
- `visits.hospital_id`
- `visits.hospital_name`
- legacy aliases: `hospital`, `doctor`, `image`
- lifecycle fields
- rating/tip fields
- `summary`, `notes`, `prescriptions`

### Subscribers

- `subscribers.email`
- `subscribers.type`
- `subscribers.status`
- `subscribers.new_user`
- `subscribers.welcome_email_sent`
- `subscribers.welcome_email_sent_at`
- `subscribers.subscription_date`
- `subscribers.unsubscribed_at`

### Support

- `support_tickets.user_id`
- `support_tickets.organization_id`
- `support_tickets.status`
- `support_tickets.priority`
- `support_tickets.assigned_to`
- `support_tickets.category`

## Recommended Implementation Direction, Not Yet Code

- Treat request-derived visits as DB/RPC/trigger-owned until proven otherwise.
- Add a visit hydration parity map before touching visit UI.
- Consolidate subscriber lifecycle ownership before any campaign/send UI work.
- Keep search analytics RPC reads; label fallback trend data as demo or remove from production surfaces.
- Keep `insuranceService.js` as the active normalized policy facade used by `useInsurance`; use `insurancePoliciesService.js` only for its current compatible subscription/read support until the duplicate boundary is consolidated in Pass 7.

## Stage 2 Remaining Work

This completes the first service-family coverage pass. Remaining audit work should move from service-level maps to exact field-to-UI matrices and mutation payload charts.
