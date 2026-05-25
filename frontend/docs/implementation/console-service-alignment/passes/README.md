# Console Alignment Pass Subplans

## Purpose

Pass subplans are implementation handoffs. A pass is not a feature list; it is an execution batch that may contain several product features sharing source-of-truth risk.

## Documents

- [Pass 1 Emergency Detail Flow Subplan - 2026-05-24](./PASS_1_EMERGENCY_DETAIL_FLOW_SUBPLAN_2026-05-24.md) - Emergency details, cash approval, retry payment, scoped realtime, and request-derived visit lookup.
- [Pass 1 Emergency Detail Evidence Audit - 2026-05-24](./PASS_1_EMERGENCY_DETAIL_EVIDENCE_AUDIT_2026-05-24.md) - Evidence checkpoint proving current emergency detail, payment, visit, cash approval, and retry contracts before implementation.
- [Pass 2 Wallet, Stripe, and Ledger Flow Subplan - 2026-05-24](./PASS_2_WALLET_STRIPE_LEDGER_FLOW_SUBPLAN_2026-05-24.md) - Wallet reads, ledger authority, Stripe payment methods, top-ups, payouts, cash-fee boundaries, and maintenance isolation.
- [Pass 3 Hospital, Capacity, and Pricing Flow Subplan - 2026-05-24](./PASS_3_HOSPITAL_CAPACITY_PRICING_FLOW_SUBPLAN_2026-05-24.md) - Facility reads, capacity truth, discovery/import, media storage, and pricing scope.
- [Pass 4 Organization, Onboarding, and Verification Flow Subplan - 2026-05-24](./PASS_4_ORGANIZATION_ONBOARDING_VERIFICATION_FLOW_SUBPLAN_2026-05-24.md) - Organization registry, onboarding, verification lanes, auth/admin boundaries, RBAC, and display IDs.
- [Pass 5 Provider Operations, Telemetry, and Scheduling Flow Subplan - 2026-05-24](./PASS_5_PROVIDER_TELEMETRY_SCHEDULING_FLOW_SUBPLAN_2026-05-24.md) - Ambulances, drivers, doctors, telemetry, maps, media, and staff scheduling.
- [Pass 6 Visits and Medical History Flow Subplan - 2026-05-24](./PASS_6_VISITS_MEDICAL_HISTORY_FLOW_SUBPLAN_2026-05-24.md) - Visits, request-derived clinical records, medical profile consumption, and visit lifecycle actions.
- [Pass 7 Care, Content, and Support Flow Subplan - 2026-05-24](./PASS_7_CARE_CONTENT_SUPPORT_FLOW_SUBPLAN_2026-05-24.md) - Insurance, support tickets, support FAQs, health news, notifications, and media/storage contracts.
- [Pass 7 Subscription Management Flow Subplan - 2026-05-24](./PASS_7_SUBSCRIPTION_MANAGEMENT_FLOW_SUBPLAN_2026-05-24.md) - Subscriber intake/read, unsupported management writes, duplicate services, welcome/custom/bulk email commands, realtime, and scope decisions.
- [Pass 7 Subscription Management Evidence Audit - 2026-05-24](./PASS_7_SUBSCRIPTION_MANAGEMENT_EVIDENCE_AUDIT_2026-05-24.md) - Evidence checkpoint proving duplicate subscriber, welcome email, custom email, bulk email, realtime, and RLS scope contracts before implementation.
- [Pass 8 Analytics, Search, Realtime, and Feedback Flow Subplan - 2026-05-24](./PASS_8_ANALYTICS_SEARCH_REALTIME_FEEDBACK_FLOW_SUBPLAN_2026-05-24.md) - Dashboard truth, search telemetry, preferences/demo mode, trends, realtime ownership, and route/action feedback.

## Rule

Each pass must name the feature/service rows it covers from `../services/CONSOLE_FEATURE_SERVICE_TAXONOMY_2026-05-24.md`, inventory each surface's rendered fields and visible controls by permitted role, classify every user action as scoped read projection, authorized CRUD, workflow command, backend-derived read-only evidence, or excluded boundary, and state the exact high-risk field/receiver gate for its first implementation slice. Every list, queue, search, aggregate, or export in scope must also be classified as server-paged, deliberately bounded, detail-only, or unavailable, with count/filter/sort, enrichment, realtime, stale-response, and failure-display behavior named. Before a pass is executable, it must complete the Stage 5 bidirectional runtime-truth trace: source entity to every runtime consumer and affected route/action to every local or globally mounted acquisition/receiver, including providers, context panels, map loaders, global modals, startup effects and exports. If a service is in scope without a checklist row, a rendered field lacks read/exposure authority, an action lacks a receiver class or field gate, a data surface has no reliability classification, or a mounted acquisition path is not traced, implementation pauses.
