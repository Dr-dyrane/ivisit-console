# Console Service Coverage

## Purpose

This folder owns complete service inventory and feature taxonomy. It prevents implementation from treating the console as only a handful of headline features.

## Documents

- [Stage 5 Full Service Coverage Audit - 2026-05-24](./STAGE_5_FULL_SERVICE_COVERAGE_AUDIT_2026-05-24.md) - Complete `frontend/src/services/*.js` coverage ledger and pass assignment.
- [Console Feature Service Taxonomy - 2026-05-24](./CONSOLE_FEATURE_SERVICE_TAXONOMY_2026-05-24.md) - Product feature taxonomy, service grouping, and required review prompts for every service lane.

## Rule

Avoid one file per service unless a service requires deep evidence. The default is a dense ledger plus targeted deep dives only when the service has high-risk writes, money movement, emergency safety, authorization, or cross-surface app parity.

Service-file coverage is necessary but not sufficient. Pair Stage 5 with the reverse 45-table capability ledger in `../../../database/console-app-alignment/TABLE_DOMAIN_MATRIX_2026-05-24.md` so table-backed operational capabilities with no current Console service are still explicitly classified.
