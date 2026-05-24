# Console Service Alignment

## Status

Active Stage 2 subtree for service-by-service data-flow audit.

## Scope

This folder maps console services against database truth and `ivisit-app` reference behavior. It is intentionally separate from the Stage 1 database subtree so implementation docs stay modular.

## Documents

- [Stage 2 Service Data Flow Audit - 2026-05-24](./STAGE_2_SERVICE_DATA_FLOW_AUDIT_2026-05-24.md) - Stage 2 method, scope, and first service inventory.
- [Emergency Payment Capacity Service Map - 2026-05-24](./EMERGENCY_PAYMENT_CAPACITY_SERVICE_MAP_2026-05-24.md) - First narrowed flow audit for emergency, bed/capacity, hospital, pricing, and wallet services.
- [Identity Admin Provider Service Map - 2026-05-24](./IDENTITY_ADMIN_PROVIDER_SERVICE_MAP_2026-05-24.md) - Identity, admin, ambulance, doctor, staff, and driver-management audit.
- [Visits Content Service Map - 2026-05-24](./VISITS_CONTENT_SERVICE_MAP_2026-05-24.md) - Visits, medical profile, insurance, subscriber, search, content, and support audit.
- [Contract Exhibits](./contracts/README.md) - Exact UI-field to service-payload to SQL/RPC/function charts for drift-suspected paths.
- [Read-Only Live Confirmation Matrix - 2026-05-24](./contracts/READ_ONLY_LIVE_CONFIRMATION_MATRIX_2026-05-24.md) - Aggregate deployed-table confirmation for prioritized contract defects.
- [Care, Content, and Analytics Contract Chart - 2026-05-24](./contracts/CARE_CONTENT_ANALYTICS_CONTRACT_CHART_2026-05-24.md) - Authority and receiver chart for insurance, support, news, notifications, and trending/analytics surfaces.

## Working Rule

Each service audit must answer:

- what data the service reads
- what data the service writes
- which RPC or Edge Function owns the mutation
- which UI fields render the result
- which app behavior proves the intended flow
- which missing console behavior blocks app support

No product implementation should start from this subtree until the relevant service map has a complete field and mutation contract.
