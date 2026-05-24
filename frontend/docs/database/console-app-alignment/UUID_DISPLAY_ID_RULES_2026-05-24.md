# UUID And Display ID Rules - 2026-05-24

## Status

Stage 1 rule extraction from migrations, console services, and `ivisit-app` reference behavior. No database introspection or mutation was performed for this pass.

## Canonical Rule

`id` is the database identity. `display_id` is a human-readable label. Console services should resolve display IDs to UUIDs before writing to UUID-owned relationships.

## Current Database Mechanism

| Mechanism | Source | Behavior | Console Rule |
| --- | --- | --- | --- |
| `generate_display_id(prefix TEXT)` | `20260219000000_infra.sql` | Generates prefixed display identifiers. | Never reimplement display ID generation in UI code. |
| `stamp_entity_display_id()` | `20260219000100_identity.sql` | Stamps `display_id` before insert and writes `id_mappings`. Role/provider-aware for profile-like identities. | Inserts should omit `display_id` unless preserving a verified existing display identifier. |
| `id_mappings` | `20260219000100_identity.sql` | Central registry for `entity_id`, `display_id`, and `entity_type`. | Treat as lookup/index infrastructure, not a user-editable table. |
| `get_entity_id(p_display_id TEXT)` | `20260219000100_identity.sql` | Resolves a display ID to UUID by prefix, with `id_mappings` fallback. | Use when a console input may contain a display ID. Do not pass display IDs into UUID columns. |

## Known Prefixes

```text
USR / ADM / DOC / PAT / HSP / ORG / AMB / REQ / VIST / PAY / NTF / WLT / OWL
```

## App Reference Context

`ivisit-app` includes `services/displayIdService.js` and many app services that use display IDs for user-facing readability while keeping database mutations UUID-oriented. It also has validation scripts and table-flow trace infrastructure around `id_mappings` and `get_entity_id`.

Console already has `frontend/src/services/displayIdService.js`, but Stage 2 must verify every service call site uses it where IDs can be user-entered, copied from UI, or route-derived.

## Console Risk Areas

| Area | Risk | Required Audit Question |
| --- | --- | --- |
| Emergency flows | Mixed names such as `requestId`, `displayId`, `request_uuid`, and `p_request_id` can hide UUID/display ID confusion. | Does the service pass UUID into RPCs that declare UUID, and only pass display ID into RPCs that intentionally accept text? |
| Payments | `payment.id`, `payments.display_id`, `payment_method_id`, and wallet ledger `reference_id` have different identity meanings. | Does every approval/decline/cash path use payment UUID and emergency UUID where required? |
| Visits | Visits have legacy alias fields plus `request_id`. | Does console render display IDs while mutating by UUID? |
| Hospitals/providers | Hospital cards and provider records can show display IDs but update canonical UUID rows. | Does CRUD resolve hospital/provider identity before update/delete? |
| Users/profiles | Admin pages can search display ID, auth email, or UUID. | Does update/delete call the correct admin RPC with UUID? |
| Support/subscribers | Public-facing identifiers are mostly email/text. | Does the service avoid pretending non-UUID keys are entity IDs? |

## Allowed Usage Pattern

```text
Read path:
  table row UUID + display_id -> UI may show display_id

Search path:
  user enters display_id -> get_entity_id(display_id) -> UUID

Mutation path:
  validated UUID -> RPC/table mutation
```

## Prohibited Pattern

```text
UI display_id -> direct .eq('id', display_id)
UI display_id -> RPC argument declared UUID
Generated display_id in component code
Manual update to id_mappings from page/service code
```

## Stage 2 Service Checks

- `frontend/src/services/emergencyService.js`
- `frontend/src/services/emergencyResponseService.js`
- `frontend/src/services/bedManagementService.js`
- `frontend/src/services/walletService.js`
- `frontend/src/services/hospitalsService.js`
- `frontend/src/services/ambulancesService.js`
- `frontend/src/services/doctorsService.js`
- `frontend/src/services/profilesService.js`
- `frontend/src/services/displayIdService.js`

Each service needs a row-by-row identity contract: accepted input identity, normalized identity, database target, and returned display label.
