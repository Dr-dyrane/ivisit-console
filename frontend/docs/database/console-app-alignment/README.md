# Console-App Database Alignment

## Status

Active Stage 1 subtree for the console alignment audit.

This folder holds database-specific truth docs so the active implementation audit does not become a bloated master file.

## Canonical Rule

The current pillar migrations are the primary source. Generated schema docs, older database docs, and legacy references are secondary until they are proven against migrations or live/staging introspection.

## Documents

- [Table Domain Matrix - 2026-05-24](./TABLE_DOMAIN_MATRIX_2026-05-24.md) - First pass table ownership, source migration, ID/display ID posture, RLS/trigger posture, and console risk by domain.
- [RPC Mutation Matrix - 2026-05-24](./RPC_MUTATION_MATRIX_2026-05-24.md) - First pass RPC ownership, app/console call sites, side effects, and console bypass risks.
- [Trigger And Policy Matrix - 2026-05-24](./TRIGGER_POLICY_MATRIX_2026-05-24.md) - First pass high-risk trigger, RLS helper, and policy-group audit.
- [Edge Function Matrix - 2026-05-24](./EDGE_FUNCTION_MATRIX_2026-05-24.md) - Edge Function inputs, secrets, database effects, external effects, and naming/auth risks.
- [UUID And Display ID Rules - 2026-05-24](./UUID_DISPLAY_ID_RULES_2026-05-24.md) - Canonical identity/display rules and service audit requirements.
- [Postgres Nuance Risk Register - 2026-05-24](./POSTGRES_NUANCE_RISK_REGISTER_2026-05-24.md) - Supabase/Postgres risks that can break console-app alignment.
- [Read-Only Audit Evidence - 2026-05-24](./READ_ONLY_AUDIT_EVIDENCE_2026-05-24.md) - Safe evidence rules, script classifications, and sync/type guardrails.

## Planned Subtree

Add these only when each matrix is ready enough to be useful:

- Stage 2 service-by-service data-flow maps.
- Stage 2 field access matrices.
- Stage 2 app-vs-console missing implementation matrix.

Parent docs should link here instead of copying full matrices.
