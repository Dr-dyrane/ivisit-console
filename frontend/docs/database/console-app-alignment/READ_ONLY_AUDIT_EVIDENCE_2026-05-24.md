# Read-Only Audit Evidence - 2026-05-24

## Status

Audit guardrail and evidence map. This file exists because console has scripts that look like diagnostics but can mutate the database, send email, or rewrite synced files.

## Non-Mutation Rule

During database audit, do not run commands that reset, migrate, seed, repair, clean, import, dedupe, backfill, send email, call mutating Edge Functions, or invoke RPCs known to write.

Allowed by default:

- Static file reads with `rg`, `Get-Content`, and `git diff`.
- Encoding checks that only read files.
- Build checks if they do not invoke database scripts.
- Env key-name inventory without printing secret values.

Not allowed without an explicit staging test plan:

- `supabase db reset`
- migration runners
- `exec_sql` callers
- seed scripts
- repair/cleanup/dedupe/backfill scripts
- subscriber email scripts
- Edge Function invocations for email, unsubscribe, invite, payment, or subscriber processing
- app test scripts that insert/update/delete live rows

## Console Scripts Classified

| Path | Observed Behavior | Audit Classification |
| --- | --- | --- |
| `frontend/supabase/scripts/sync_to_console.js` | Copies docs, migrations, scripts, and database types from `ivisit-app` into console; deletes existing synced files first. | File-mutating. Do not run casually during audit. After any run, perform encoding/mojibake and git diff review. |
| `frontend/supabase/scripts/generate_schema_snapshot.js` | Reads migrations and writes `SCHEMA_SNAPSHOT.md`. | File-mutating. Safe only when planned as doc generation. Current output script contains mojibake markers. |
| `frontend/supabase/scripts/generate_api_reference.js` | Reads core RPC migration and writes `API_REFERENCE.md`. | File-mutating. Safe only when planned as doc generation. Current output script contains mojibake markers. |
| `frontend/scripts/inspect-supabase-schema.js` | Connects to Supabase with anon key, reads information schema and sample rows, writes `supabase-schema.json`. | Read-only DB, file-mutating. Needs env and privacy review before use. |
| `frontend/scripts/inspect-schema-cli.js` | Prompts for URL/key, reads information schema and row counts. | Read-only DB if key is read-only in practice, but service role can still access sensitive metadata. Use only with care. |
| `frontend/scripts/run-migrations.js` | Migration runner. | Mutating. Do not run in audit. |
| `frontend/src/utils/runMigrations.js` | Calls `exec_sql` from frontend utility code. | Mutating. Not an audit command. Needs later implementation review. |
| `frontend/supabase/scripts/add_subscriber_batch.js` | Adds subscribers. | Mutating. Do not run in audit. |
| `frontend/supabase/scripts/add_test_subscriber.js` | Adds test subscriber. | Mutating. Do not run in audit. |
| `frontend/supabase/scripts/backfill_hospital_media.js` | Backfills hospital media. | Mutating. Do not run in audit. |
| `frontend/supabase/scripts/cleanup_demo_orphans.js` | Cleanup script. | Mutating/destructive. Do not run in audit. |
| `frontend/supabase/scripts/cleanup_hospital_shadows.js` | Cleanup script. | Mutating/destructive. Do not run in audit. |
| `frontend/supabase/scripts/dedupe_demo_hospitals.js` | Deduplication script. | Mutating/destructive. Do not run in audit. |
| `frontend/supabase/scripts/data_import_fixed.js` | Data import. | Mutating. Do not run in audit. |
| `frontend/supabase/scripts/send_ivisit_106_campaign.js` | Email campaign sender. | External side effect. Do not run in audit. |
| `frontend/supabase/scripts/send_test_custom_email.js` | Sends email. | External side effect. Do not run in audit. |
| `frontend/supabase/scripts/export_subscribers_csv.js` | Exports subscriber data. | Read path but sensitive file output. Do not run unless export is explicitly needed and destination is controlled. |

## App Reference Scripts

`ivisit-app/supabase/tests/scripts/` contains valuable audit references such as flow matrices, console UI contract matrices, direct mutation surface reports, and table flow trace exporters. Several scripts also seed, update, delete, clean up, send requests, or call mutating RPCs.

Use app scripts as static evidence first. Running them requires a separate staging plan.

## Env Inventory

Key names observed without printing values:

```text
REACT_APP_SUPABASE_URL
REACT_APP_SUPABASE_ANON_KEY
REACT_APP_GOOGLE_MAPS_API_KEY
REACT_APP_BREVO_API_KEY
REACT_APP_SUPABASE_SERVICE_ROLE_KEY
REACT_APP_STRIPE_PUBLISHABLE_KEY
```

Service-role and Brevo keys mean local scripts can mutate privileged data or send external email. Audit commands must assume power even when script names sound harmless.

## Recurrent Console Sync Rule

After any `sync_to_console.js` run or database type refresh:

1. Check changed files with `git status --short`.
2. Run database type encoding guard.
3. Scan generated docs/types for mojibake.
4. Review whether synced docs rewrote local console audit docs.
5. Only then stage or commit.

## Executed Read-Only Confirmation - 2026-05-24

An in-memory SELECT-only Supabase probe was run from the configured `ivisit-app` environment to confirm prioritized Stage 2 findings. It printed aggregate counts and schema-column availability only, wrote no generated app report, and did not invoke any RPC, Edge Function, repair, migration, test flow, insert, update, or delete.

Detailed aggregate results and implementation ordering are recorded at:

- `frontend/docs/implementation/console-service-alignment/contracts/READ_ONLY_LIVE_CONFIRMATION_MATRIX_2026-05-24.md`

The probe was rerun with pagination and exact hospital counting after the initial hospital query encountered the default 1,000-row response limit.
