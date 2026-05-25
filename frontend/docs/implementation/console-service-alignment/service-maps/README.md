# Console Service Maps

## Purpose

Service maps compare console services against database truth and `ivisit-app` behavior by domain. They are narrower than stage docs and broader than exact contract exhibits.

## Documents

- [Emergency Payment Capacity Service Map - 2026-05-24](./EMERGENCY_PAYMENT_CAPACITY_SERVICE_MAP_2026-05-24.md) - Emergency, bed/capacity, hospital, pricing, and wallet services.
- [Identity Admin Provider Service Map - 2026-05-24](./IDENTITY_ADMIN_PROVIDER_SERVICE_MAP_2026-05-24.md) - Identity, admin, ambulance, doctor, staff, and driver-management services.
- [Visits Content Service Map - 2026-05-24](./VISITS_CONTENT_SERVICE_MAP_2026-05-24.md) - Visits, medical profile, insurance, subscriber, search, content, and support services.

## Rule

Create a new service map only when a domain lane needs source-to-source comparison across multiple services. Single-service coverage belongs in `../services`; implementation sequencing belongs in `../passes`.
