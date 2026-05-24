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

The app deployment runbook at `C:/Users/Dyrane/Documents/GitHub/ivisit-app/docs/deployment/EDGE_FUNCTION_ROLLBACK_RUNBOOK.md:9-40` identifies `ivisit-app/supabase/functions` plus `supabase/config.toml` as the runtime source of truth and records deployed payment, discovery, webhook, and demo slugs. Console's `frontend/supabase/functions/` subtree is not a complete mirror of that runtime tree: it contains legacy email, invitation, lookup, and unsubscribe sources, while the console calls payment and provider-discovery slugs whose implementation source is present in `ivisit-app`.

The app repo also has test scripts for Edge Function smoke matrices. Many of those scripts can mutate data or call external services, so they are evidence for coverage intent, not commands to run during this audit.

## Runtime Ownership Comparison

| Function slug used by console | Console call site | Console-local source | Runtime source identified in `ivisit-app` | Audit status |
| --- | --- | --- | --- | --- |
| `create-payment-intent` | `frontend/src/services/walletService.js:204-222` | No matching source folder in current console function tree. | `supabase/functions/payments/create-payment-intent/index.ts`; configured in `supabase/config.toml:442-445`; production inventory in rollback runbook. | App-owned runtime dependency; audit against app implementation. |
| `create-payout` | `frontend/src/services/walletService.js:183-197` | No matching source folder in current console function tree. | `supabase/functions/payments/create-payout/index.ts`; `supabase/config.toml:447-450`. | App-owned runtime dependency; audit against app implementation. |
| `manage-payment-methods` | `frontend/src/services/walletService.js:240-267,399-405` | No matching source folder in current console function tree. | `supabase/functions/payments/manage-payment-methods/index.ts`; `supabase/config.toml:386-392`. | App-owned runtime dependency; authorization finding below. |
| `discover-hospitals` | `frontend/src/services/hospitalImportService.js:13-89,318-361`; `frontend/src/components/modals/HospitalModal.jsx:155-156` | Console `frontend/supabase/functions/discovery/index.ts` is actually check-user logic, not this slug implementation. | `supabase/functions/discovery/discover-hospitals/index.ts` behind the public slug wrapper; `supabase/config.toml:402-405`. | App-owned runtime dependency; console-local source name is misleading. |
| `invite-user` | `frontend/src/services/adminService.js:817-843`; `frontend/src/components/modals/InviteUserModal.jsx:54-68`; doctor invite flow. | `frontend/supabase/functions/payments/index.ts` appears to be the implementation despite directory naming. | Not listed in the May 19 app-owned runtime inventory; the runbook explicitly treats legacy email/subscriber functions as outside app runtime ownership unless source is present. | Needs deployed-function ownership proof; source shows high-risk unauthenticated behavior. |
| `check-user` | `frontend/src/components/pages/LoginPage.jsx:72-73` | `frontend/supabase/functions/discovery/index.ts` appears to be implementation. | Not listed in the app-owned runtime inventory. | Needs deployed-function ownership proof; avoid treating local folder name as deployment evidence. |
| `sendWelcome`, `sendCustomEmail`, `sendBulkEmail` | `frontend/src/services/subscriptionService.js:405-469`; subscription pages/modals. | Sources present in console legacy tree under `payments/`. | Not listed in app runtime inventory. | Console-owned/legacy deployment path remains unproven; lifecycle and authorization risks remain active. |
| `process-subscribers`, `unsubscribe` | Scheduler/public link rather than direct normal console UI. | Sources present in console legacy tree. | Not listed in app runtime inventory. | Scheduler/deployed-slug ownership remains unproven. |

## App-Owned Finance Function Contract Findings

| Console action | Console payload/UI evidence | App-owned Edge Function behavior | Contract finding | Priority |
| --- | --- | --- | --- | --- |
| Manage organization cards and payout method. | `walletService.js:240-267,399-405` passes an organization ID; `WalletManagementPage.jsx:76-83,159-160`; `GlobalFinancialModals.jsx:51-64,118,321-325` exposes list/add/remove behavior for organization billing. | `ivisit-app/supabase/functions/payments/manage-payment-methods/index.ts:15-115` authenticates a user, then resolves any provided organization ID with a service client; no admin/org membership check appears before it creates an organization Stripe customer, lists/detaches cards, or sets payout fields. It updates `organizations.stripe_customer_id` and payout-method fields. | `confirmed authorization and receiver drift`: any authenticated caller able to supply a resolvable organization ID can reach organization billing operations, and SELECT-only live proof confirms those target organization columns do not exist. | Critical |
| Top up a wallet. | `walletService.js:204-222` sends amount, organization ID, and metadata but no `is_top_up`; `GlobalFinancialModals.jsx:150-162` discards returned `clientSecret` and immediately reports wallet topped up. | `create-payment-intent/index.ts:16-268` marks wallet-top-up semantics only from `is_top_up`; `stripe-webhook/index.ts:54-97` follows its top-up/payment path from that metadata or missing emergency ID. The app patient top-up path explicitly sends `is_top_up: true` in `ivisit-app/services/paymentService.js:742-768`. | `confirmed flow drift`: console creates an unconfirmed intent with the wrong intent classification and presents success before Stripe confirmation or wallet credit. | Critical |
| Withdraw funds. | `walletService.js:183-197`; `GlobalFinancialModals.jsx:168-180,246-275` gates amount against displayed balance and reports initiation success. | `create-payout/index.ts:14-75` correctly checks role and org ownership for org admins, but does not reserve or validate platform/org wallet balance before creating a Stripe payout; webhook deducts wallet balance later at `stripe-webhook/index.ts:164-227`. | `confirmed financial integrity gap`: authorization is present, but concurrent/stale UI requests can initiate payout beyond internal available balance before webhook reflection. | Critical/high |
| Discover/import provider facilities. | `hospitalImportService.js:13-89,318-361` invokes `discover-hospitals`; `HospitalModal.jsx:146-184` calls the endpoint directly for search. Only the modal import is observed as a rendered console dependency in this pass. | App runtime owns the function and provider persistence helpers under `_shared/domain/providers/**`; discovery can upsert both facility and provider-extension truth. | `confirmed contract drift`: active modal search does not meet runtime input/output shape, and any working merge-enabled discovery path can write app-owned provider truth outside console CRUD ownership. | Critical/high |

### Organization Stripe Receiver Proof

A SELECT-only column availability check returned no row data and confirmed:

| Column | `organizations` live selectable surface | `profiles` live selectable surface | Meaning |
| --- | --- | --- | --- |
| `stripe_account_id` | present | present | Payout account/status references have a live column. |
| `ivisit_fee_percentage` | present | present | Fee context is available. |
| `stripe_customer_id` | absent | present | Organization billing-method customer persistence targeted by the Edge Function has no live receiver column. |
| `payout_method_id` | absent | present | Organization default payout update has no live receiver column. |
| `payout_method_last4` | absent | present | Console payout-method display cannot be backed by organization storage as currently written. |
| `payout_method_brand` | absent | present | Console payout-method display cannot be backed by organization storage as currently written. |

Static source agrees with the deployment observation: `frontend/supabase/migrations/20260219000200_org_structure.sql:5-15` declares only `organizations.stripe_account_id` and fee fields, while `frontend/supabase/migrations/20260219000100_identity.sql:32-37` declares the customer/payout-method fields on `profiles`. `get_org_stripe_status` in `frontend/supabase/migrations/20260219010000_core_rpcs.sql:815-830` also returns only Stripe account presence and wallet balance, not the payout-method fields rendered by the console.

## Provider Discovery Persistence Contract Findings

### Runtime Write Boundary

| Contract element | App-owned runtime evidence | Console implication | Finding |
| --- | --- | --- | --- |
| Authentication boundary | `ivisit-app/supabase/config.toml:402-405` configures `discover-hospitals` with `verify_jwt = false`; `supabase/functions/discovery/discover-hospitals/handler.ts:42-45` probes optional auth only; `_shared/supabase/auth.ts:13-20,38-49` continues anonymously. | A public caller can enter provider discovery without a console operator identity. | Public discovery is not a read-only API boundary. |
| Persistence enablement | `_shared/domain/providers/request.ts:40-43` defaults external discovery on and `mergeWithDatabase` to true; handler `:127,200-252` creates a service client and invokes persistence when external rows exist. | A normal discovery request can mutate canonical provider state unless it explicitly disables merge. | `confirmed public side-effect surface`: service-role persistence is reachable through an unauthenticated function configuration. |
| Facility persistence | `_shared/domain/providers/persistence.ts:26-63` builds `hospitals` rows; `persistenceFlow.ts:114-179` upserts by `place_id`, with coordinate-collision update handling at `:121-172`. | Console imports are not merely suggestions awaiting review; they can populate or revise facility rows before console approval. | Approval UX is not the sole owner of facility ingest truth. |
| Provider taxonomy persistence | `_shared/domain/providers/persistence.ts:147-167` maps non-hospital extension data; `persistenceFlow.ts:191-218` upserts `providers` by `hospital_id,provider_type`. | Explore-care taxonomy and enrichment is owned in app runtime, not by the current console form. | Console needs an intentional provider administration surface or must be restricted to hospital operations. |

### Console Payload And UI Contract

| Console path | Console evidence | Runtime/schema dependency | Misalignment |
| --- | --- | --- | --- |
| Modal facility search | `frontend/src/components/modals/HospitalModal.jsx:146-184` posts `{ query, mode: 'text_search', limit }`, then reads `data.hospitals`. | Handler requires finite latitude and longitude at `ivisit-app/supabase/functions/discovery/discover-hospitals/handler.ts:101-123` and returns rows under `data` at `:284-313`. | Active search cannot succeed against the current runtime contract; even a successful response would be read from the wrong key. |
| Claimed Google search | The same modal request omits `includeGooglePlaces: true` while visible copy at `HospitalModal.jsx:457-459` states results come from Google Places. | `_shared/domain/providers/request.ts:40-43` enables Google only when explicitly `true` and configured; Mapbox is enabled unless explicitly disabled. | UI/source attribution is not proven and is likely wrong for this request shape. |
| Import service nearby path | `hospitalImportService.js:13-60` supplies coordinates and `mergeWithDatabase: true`, and reads `data.data`; no observed page/modal invocation was found beyond importing this service in `HospitalModal.jsx:17`. | This payload is structurally closer to runtime and would persist rows if invoked. It defaults to `providerCategory = 'hospital'` in app request parsing. | Present source is a latent mutating import path, not evidence that console currently administers all provider categories. |
| Import service text sync | `hospitalImportService.js:318-361` sends a text query without coordinates. | Runtime requires coordinates for normal discover action. | Sync path is incompatible with deployed handler contract. |
| Hospital create/edit surface | `frontend/src/services/hospitalsService.js:11-63,90-170,261-299`; `HospitalModal.jsx:21-46,464-638`. | Schema/RPC exposes `provider_type`, `emergency_eligible`, `dispatch_eligible`, `booking_eligible`, `category_confidence`, and `provider_source` (`20260219000200_org_structure.sql:415-503`; `20260219010000_core_rpcs.sql:11-123`). | Console cannot deliberately create/classify/manage app discovery taxonomy or dispatch eligibility. New form-created rows inherit hospital defaults; taxonomy fields are absent from payload control. |

### Ownership Conclusion

`discover-hospitals` is currently both discovery API and provider-ingest writer. The app calls it with taxonomy-aware inputs for emergency and Explore Care (`ivisit-app/services/hospitalsService.js:740-927`), while console has an active modal integration that does not satisfy its contract and a latent nearby-import path that would write only hospital-default truth. Before implementation, the console plan must choose whether it administers the full provider catalog or only approved hospital/capacity records, and the public persistence boundary must be explicitly guarded or made non-mutating by default.

## Current Findings

- Function naming is misleading in at least two places: `discovery/index.ts` behaves like user lookup, and `payments/index.ts` behaves like invite-user.
- Payment, payout, billing-method, and provider-discovery slugs called by console are app-owned runtime dependencies rather than source present in the console function subtree.
- `manage-payment-methods` has no observed organization authorization check after accepting `organization_id`, and its organization customer/payout-method write targets are absent from the live organization surface.
- Console wallet top-up does not send the app function's top-up discriminator or confirm its returned payment intent before showing success.
- Payout authorization is present in the app function, but balance sufficiency is only represented by the console UI before the webhook later deducts the wallet.
- `discover-hospitals` is public and uses service-role persistence with merge enabled by default; provider discovery can write `hospitals` and `providers` without a console operator identity.
- The active hospital modal text-search payload and response reader are incompatible with the app-owned runtime contract, and its Google Places attribution is not established by its payload.
- Console hospital CRUD omits the provider taxonomy and eligibility fields that now determine app emergency and Explore Care behavior.
- Email templates have repeated mojibake in footer/body content.
- Several Edge Functions have no observed in-function admin authorization check.
- Subscriber status can be mutated by functions, direct console services, and webhook flows; this needs a single lifecycle map before implementation changes.
- Scheduled ownership for `process-subscribers` is not proven in migrations.

## Next Pass

- Decide the intended console ownership boundary for hospital-only operations versus the app-owned broader provider catalog, then derive the implementation pass from the mapped persistence contract.
- Map Stripe webhook and finance RPC ledger effects against console wallet UI rendered state and payment rows.
- Obtain read-only deployed-function/config proof for legacy console slugs if available without invocation.
- Compare function environment variable names against Vercel/Supabase project configuration without exposing values.
- Decide whether subscriber lifecycle should be RPC-owned, Edge Function-owned, or service-owned.
- Keep runtime source ownership explicit: payment/discovery functions are currently audited from `ivisit-app`, while legacy subscriber/invite/login function deployment remains unproven.
