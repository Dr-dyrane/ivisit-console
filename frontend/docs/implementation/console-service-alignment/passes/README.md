# Console Alignment Pass Subplans

## Purpose

Pass subplans are implementation handoffs. A pass is not a feature list; it is an execution batch that may contain several product features sharing source-of-truth risk.

## Documents

- [Pass 1 Emergency Detail Flow Subplan - 2026-05-24](./PASS_1_EMERGENCY_DETAIL_FLOW_SUBPLAN_2026-05-24.md) - Emergency details, cash approval, retry payment, scoped realtime, and request-derived visit lookup.
- [Pass 2 Wallet, Stripe, and Ledger Flow Subplan - 2026-05-24](./PASS_2_WALLET_STRIPE_LEDGER_FLOW_SUBPLAN_2026-05-24.md) - Wallet reads, ledger authority, Stripe payment methods, top-ups, payouts, cash-fee boundaries, and maintenance isolation.
- [Pass 3 Hospital, Capacity, and Pricing Flow Subplan - 2026-05-24](./PASS_3_HOSPITAL_CAPACITY_PRICING_FLOW_SUBPLAN_2026-05-24.md) - Facility reads, capacity truth, discovery/import, media storage, and pricing scope.
- [Pass 4 Organization, Onboarding, and Verification Flow Subplan - 2026-05-24](./PASS_4_ORGANIZATION_ONBOARDING_VERIFICATION_FLOW_SUBPLAN_2026-05-24.md) - Organization registry, onboarding, verification lanes, auth/admin boundaries, RBAC, and display IDs.
- [Pass 5 Provider Operations, Telemetry, and Scheduling Flow Subplan - 2026-05-24](./PASS_5_PROVIDER_TELEMETRY_SCHEDULING_FLOW_SUBPLAN_2026-05-24.md) - Ambulances, drivers, doctors, telemetry, maps, media, and staff scheduling.
- [Pass 6 Visits and Medical History Flow Subplan - 2026-05-24](./PASS_6_VISITS_MEDICAL_HISTORY_FLOW_SUBPLAN_2026-05-24.md) - Visits, request-derived clinical records, medical profile consumption, and visit lifecycle actions.
- [Pass 7 Care, Content, and Support Flow Subplan - 2026-05-24](./PASS_7_CARE_CONTENT_SUPPORT_FLOW_SUBPLAN_2026-05-24.md) - Insurance, support tickets, support FAQs, health news, notifications, and media/storage contracts.
- [Pass 7 Subscription Management Flow Subplan - 2026-05-24](./PASS_7_SUBSCRIPTION_MANAGEMENT_FLOW_SUBPLAN_2026-05-24.md) - Subscriber CRUD, duplicate services, welcome/custom/bulk email, realtime, and scope decisions.
- [Pass 8 Analytics, Search, Realtime, and Feedback Flow Subplan - 2026-05-24](./PASS_8_ANALYTICS_SEARCH_REALTIME_FEEDBACK_FLOW_SUBPLAN_2026-05-24.md) - Dashboard truth, search telemetry, preferences/demo mode, trends, realtime ownership, and route/action feedback.

## Rule

Each pass must name the feature/service rows it covers from `../services/CONSOLE_FEATURE_SERVICE_TAXONOMY_2026-05-24.md`. If a service is in the pass scope but not in the pass checklist, implementation pauses.
