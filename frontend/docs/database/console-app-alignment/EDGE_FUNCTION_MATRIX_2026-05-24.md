# Edge Function Matrix - 2026-05-24

## Status

Stage 1 static audit. This file maps Edge Functions by observed source code only. No Edge Function was invoked during this audit.

## Audit Rule

Edge Functions are production-side effect surfaces. During audit, inspect source and logs only. Do not invoke email, webhook, invite, unsubscribe, subscriber-processing, or payment functions unless a later test plan provides an explicit staging target, test data, and cleanup path.

## Function Matrix

| Function Path | Runtime Intent | Inputs | Secrets | Database Side Effects | External Side Effects | App/Console Alignment Finding | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `frontend/supabase/functions/discovery/index.ts` | User existence/check-user style lookup despite `discovery` folder name. | JSON email or user id style lookup input. | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. | Reads `profiles`; may read auth users through admin API. | None observed. | Name/purpose drift: folder suggests discovery, implementation behaves like check-user. Console docs should not assume this is provider discovery. | Service-role read path can expose auth/profile existence. Debug logging includes user-shape details. |
| `frontend/supabase/functions/payments/index.ts` | Invite-user/admin invitation flow. | JSON invite payload. Optional bearer token for admin check. | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, optional Brevo env. | Reads `profiles`; auth admin generates invite link. | Auth invite link generation; email send code is commented. | This is not a payment processor despite `payments` path. Console must classify it as auth/admin invitation. | If called without strict auth, generated invite links are sensitive. Returning invite links is operationally risky outside trusted admin UI. |
| `frontend/supabase/functions/payments/process-subscribers/index.ts` | Batch processing for pending subscribers. | Request body not required for core batch path. | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`. | Reads `subscribers`; updates `welcome_email_sent`, `welcome_email_sent_at`, and `status`. | Sends Brevo email. | Architecture docs mention this should be scheduled. Current migrations do not source-control a `pg_cron` schedule. | Mutating, email-sending batch job. Do not run in audit. Needs canonical scheduler ownership. |
| `frontend/supabase/functions/payments/sendBulkEmail/index.ts` | Sends custom bulk email to provided recipients. | `emails[]`, `subject`, `content`. | `BREVO_API_KEY`. | None observed. | Sends Brevo email to every supplied address. | Console can trigger broad external side effects without a table-backed campaign ledger in this function. | No observed admin authorization in function body. High blast radius if exposed. Contains mojibake in email footer. |
| `frontend/supabase/functions/payments/sendCustomEmail/index.ts` | Sends one custom email. | `email`, `subject`, `content`. | `BREVO_API_KEY`. | None observed. | Sends Brevo email. | Same template family as bulk email. Console should treat as external side-effect endpoint, not ordinary CRUD. | No observed admin authorization in function body. Contains mojibake in email footer. |
| `frontend/supabase/functions/payments/sendWelcome/index.ts` | Sends welcome email for one subscriber. | `email`. | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`. | Updates `subscribers.new_user = false` after email send. | Sends Brevo email. | Mutates subscriber lifecycle after external delivery. Console subscription UI must not duplicate this state transition directly. | No observed admin authorization in function body. Partial success can send email while DB update fails. Contains mojibake in email body/footer. |
| `frontend/supabase/functions/webhooks/index.ts` | Unsubscribe endpoint. | Query/body email. | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. | Reads and updates `subscribers` to unsubscribed-style state. | Returns HTML response. | Public unsubscribe is expected, but implementation should be aligned with subscription service field names. | Public mutating endpoint. Must validate email and avoid leaking subscription state. Contains mojibake in response HTML. |
| `frontend/supabase/functions/payments/index.test.ts` | Local/unit test for invite function. | Test harness inputs. | Test env. | Test-only. | Test-only. | Useful as behavior evidence, not a runtime endpoint. | Do not infer deployment behavior from test without function source. |

## Cross-Repo Context From `ivisit-app`

The app repo has a more developed Supabase Function subtree with shared utilities under `supabase/functions/_shared/`, including HTTP response, CORS, env, auth, payment, and provider-domain helpers. Console functions are flatter and duplicate email template logic. That is an implementation gap to track for later hardening, but Stage 1 does not refactor it.

The app repo also has test scripts for Edge Function smoke matrices. Many of those scripts can mutate data or call external services, so they are evidence for coverage intent, not commands to run during this audit.

## Current Findings

- Function naming is misleading in at least two places: `discovery/index.ts` behaves like user lookup, and `payments/index.ts` behaves like invite-user.
- Email templates have repeated mojibake in footer/body content.
- Several Edge Functions have no observed in-function admin authorization check.
- Subscriber status can be mutated by functions, direct console services, and webhook flows; this needs a single lifecycle map before implementation changes.
- Scheduled ownership for `process-subscribers` is not proven in migrations.

## Next Pass

- Map console UI call sites for each function.
- Compare function environment variable names against Vercel/Supabase project configuration without exposing values.
- Decide whether subscriber lifecycle should be RPC-owned, Edge Function-owned, or service-owned.
- Verify deployed function names against folders before documenting public URLs.
