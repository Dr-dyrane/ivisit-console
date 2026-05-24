# Postgres Nuance Risk Register - 2026-05-24

## Status

Stage 1 static risk register for Supabase/Postgres behavior that can make console look correct while data flow is wrong.

## Risk Register

| Risk | Evidence | Why It Matters | Console Audit Action |
| --- | --- | --- | --- |
| `SECURITY DEFINER` bypass surface | Many RPCs/functions are `SECURITY DEFINER`; only some chat functions visibly set `search_path = public`. | A service call can bypass RLS and perform privileged writes. Missing `search_path` can be a security smell. | Treat every `SECURITY DEFINER` RPC as a privileged boundary. Do not replace it with direct table CRUD without proving policy equivalence. |
| `exec_sql(sql TEXT)` exists | `20260219000000_infra.sql` defines a generic SQL executor. | This is powerful and dangerous if exposed to normal client code. | Console must not call `exec_sql` outside controlled maintenance tooling. Audit scripts that call it are not safe runtime patterns. |
| Emergency status transition context | RPCs call `set_config('ivisit.transition_source', ...)`; triggers enforce status path. | Direct table status updates can fail, bypass evidence, or skip transition logs. | Console status changes must go through emergency RPCs, not `.from('emergency_requests').update({ status })`. |
| Trigger side effects after apparent update | Emergency, dispatch, visit, resource, notification, and finance triggers update related rows. | UI may render stale or partial data if it assumes a single table changed. | Service responses should include enough updated state or invalidate related queries. |
| Partial unique indexes on active requests | Current table matrix found active-request uniqueness rules. | Duplicate active emergencies can be prevented by DB even if UI allows them. | Console create flows must surface DB conflict states clearly and not retry with altered payloads blindly. |
| Geometry/point serialization | `postgis` is enabled and helper functions convert JSONB to point geometry. | Bad coordinate shape can silently break discovery/ETA logic. | Use one parser/serializer path for locations; audit object truthiness around coords. |
| JSONB payload contracts | Console RPCs such as `console_create_emergency_request` and `console_update_emergency_request` accept JSONB. | The database may accept payloads that omit UI-required fields or reject fields late. | Stage 2 must map exact payload fields to RPC extraction logic. |
| Wallet atomicity | Cash approval touches payments, emergency requests, org wallets, main wallet, and wallet ledger. | Direct console writes can create financial drift. | Cash/payment mutations should remain RPC-owned unless a transaction boundary is proven. |
| RLS helper recursion | RLS helper functions such as admin/org helpers are used across policies. | A helper bug can block access or over-grant access across many tables. | Audit helper definitions before assuming a page access failure is a UI bug. |
| Legacy alias columns | `visits` and other tables carry UI-friendly alias fields. | Removing or ignoring aliases too soon can break old UI and app compatibility. | Mark aliases as compatibility fields until app/console renderers are mapped. |
| Missing source-controlled cron | Static search found `pgcrypto` and `postgis`, but no current `pg_cron`/`cron.schedule` migration. | Scheduled subscriber/trending jobs may exist only in dashboard state. | Document dashboard-only schedules as unverified until introspected read-only. |
| Generated docs drift | `DATABASE_SCHEMA_REFERENCE.md`, generated snapshots, and legacy logs do not all match current migrations. | Engineers can implement against stale examples. | Use migrations/types as primary evidence and mark stale docs instead of copying them. |
| Mojibake in source docs/functions | Email templates and older docs include mojibake sequences. | Recurrent console build/content issue; can leak into public email/HTML. | Keep encoding guard for generated DB types and add mojibake scan to audit verification. |

## App Reference Context

The `ivisit-app` repo has more extensive validation scripts, runtime flow traces, and contract matrices. Those files are useful as design intent and missing-implementation detectors. Many app tests mutate data, seed fixtures, send requests, or call RPCs, so Stage 1 should read them but not run them.

## Stage 2 Required Proofs

- For each console service mutation, identify whether it is table CRUD, RPC-owned, Edge Function-owned, or auth-admin-owned.
- For each direct table mutation, prove RLS permits it and no trigger-owned side effect is bypassed.
- For each RPC mutation, prove required arguments are UUID/display ID correct.
- For each JSONB RPC payload, map UI field -> service payload -> SQL extraction -> table column.
- For each scheduled or external side effect, document the owning scheduler and retry semantics.
