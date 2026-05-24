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

## Executed Care/Content Column And Count Follow-Up - 2026-05-24

A second in-memory SELECT-only probe checked field availability for insurance, support, health news, notifications, and search/trending tables. It also used exact-count/head queries only to distinguish forward contract defects from current repair population. It returned no row content and invoked no RPC, Edge Function, scheduler, mutation, or report generator.

Key deployed observations:

- Modern insurance columns used by the app and console are selectable live even though the current finance pillar declaration names the older base model; there are currently zero policy rows.
- `support_tickets.admin_response` is absent from the selectable live table surface; there are currently zero support ticket rows.
- `health_news.description`, `content`, and `icon` are absent; there are two published rows and no drafts.
- Notification action/metadata fields exist, with zero current rows observed.
- Search event/history tables contain zero rows while `trending_topics` contains 21 rows.

Detailed authority and field mapping is recorded at:

- `frontend/docs/implementation/console-service-alignment/contracts/CARE_CONTENT_ANALYTICS_CONTRACT_CHART_2026-05-24.md`

## Executed Organization Stripe Receiver Follow-Up - 2026-05-24

A SELECT-only column availability probe checked the receiver columns used by the app-owned `manage-payment-methods` function for console organization billing. It returned no rows and executed no function or mutation.

Observed selectable column surface:

| Column | `organizations` | `profiles` |
| --- | --- | --- |
| `stripe_account_id` | present | present |
| `ivisit_fee_percentage` | present | present |
| `stripe_customer_id` | absent | present |
| `payout_method_id` | absent | present |
| `payout_method_last4` | absent | present |
| `payout_method_brand` | absent | present |

This confirms that the current organization billing-method function targets receiver fields not exposed on live `organizations`, matching the pillar migration mismatch recorded in the Edge Function matrix.

## Executed Finance Ledger Linkage Follow-Up - 2026-05-24

A further SELECT-only aggregate probe read completed payment classifications and ledger references to check the exposure around the mapped cash settlement paths. It returned aggregate counts and ledger signature counts only; it did not return row identifiers, call an RPC or Edge Function, or mutate any payment, wallet, or ledger record.

| Aggregate | Result |
| --- | ---: |
| Completed cash payments | 137 |
| Completed cash payments with positive stored fee | 28 |
| Completed cash payments with any referenced ledger row | 28 |
| Completed cash positive-fee payments with any referenced ledger row | 28 |
| Completed non-cash payments | 15 |
| Completed non-cash payments with positive stored fee | 0 |
| Completed non-cash payments with any referenced ledger row | 2 |
| All ledger rows with a reference id in the fetched population | 103 |

The referenced cash-ledger signatures were:

| Aggregate ledger signature | Rows | Interpretable pairs |
| --- | ---: | ---: |
| `debit / iVisit Platform Fee (Cash Payment) / no metadata source` | 6 | 6 debit legs |
| `credit / Platform Fee (Cash Payment) / no metadata source` | 6 | 6 credit legs |
| `debit / iVisit Platform Fee (Cash Payment Backfill) / runtime_data_integrity_repair` | 22 | 22 debit legs |
| `credit / Platform Fee (Cash Payment Backfill) / runtime_data_integrity_repair` | 22 | 22 credit legs |

Interpretation boundary: these reads prove that 22 of 28 fee-bearing completed cash-payment settlement pairs are explicitly labelled as integrity-repair output. They do not prove which UI action originally created any payment. Static source still establishes that the current `process_cash_payment_v2` insert path does not itself contain wallet/ledger writes and is skipped by the generic non-cash settlement trigger.

## Executed Pricing And Onboarding Receiver Follow-Up - 2026-05-24

A SELECT-only probe through the configured non-privileged app client inspected hospital ownership, pricing row scope, and selectable onboarding/verification receiver columns. It returned aggregate counts and column-presence booleans only. It did not call RPCs or Edge Functions and did not insert, update, delete, seed, migrate, repair, or reset data.

The client visibility scope for this probe returned 130 hospital rows; these results must not be interpreted as the full deployed hospital population recorded by a prior differently scoped read.

| Aggregate in visible scope | Result |
| --- | ---: |
| Hospitals visible to this probe | 130 |
| Organizations with at least one visible hospital | 23 |
| Organizations with multiple visible hospitals | 21 |
| Hospitals within those multi-hospital organizations | 127 |
| Visible `service_pricing` rows | 422 |
| Visible `service_pricing` rows attached to multi-hospital organizations | 410 |
| Visible `room_pricing` rows | 219 |
| Visible `room_pricing` rows attached to multi-hospital organizations | 208 |

| Receiver column | Selectable live |
| --- | --- |
| `hospitals.verification_status` | yes |
| `hospitals.rejection_reason` | no |
| `hospitals.verified_at` | no |
| `hospitals.rejected_at` | no |
| `profiles.bvn_verified` | yes |
| `profiles.verification_status` | no |
| `profiles.organization_id` | yes |

Interpretation boundary: visible data already contains multi-hospital organizations with hospital-scoped pricing, establishing that the console's silent earliest-hospital pricing resolution is an exposed contract risk. Column presence also confirms that the legacy onboarding approval helper targets absent live receiver fields. A requested privileged full-population recheck was not executed because no local service-role read key was available; it failed before issuing a database request.
