# Repository Agent Instructions

These instructions apply to the whole `ivisit-console` repository unless a more specific `AGENTS.md` exists in a subdirectory.

## Product Role

`ivisit-console` is the provider, operator, sponsor, and administrator surface for the iVisit ecosystem. It supports onboarding, provider operations, dispatch, approval, content/support workflows, analytics, and CRUD-like operational work that serves the canonical patient product.

The ecosystem split is:

- `ivisit`: marketing, acquisition, legal, public trust, SEO, and product handoff.
- `ivisit-app`: canonical patient product across native and web.
- `ivisit-console`: provider onboarding, provider operations, sponsor/admin dashboards, dispatch, approval, and CRUD workflows.
- `iVisit-docs`: NDA-gated data room, sponsor/investor/legal enablement, invite/access governance.

Console must serve shared backend truth. It must not invent parallel patient, dispatch, payment, capacity, provider, or clinical truth that `ivisit-app` cannot reconcile.

## Authority Order

When guidance conflicts, use this order:

1. Shared Supabase/database/RPC/Edge/Storage truth in maintained migrations, generated types, and current database docs.
2. `ivisit-app` behavior where it consumes the same emergency, payment, hospital, provider, visit, wallet, support, or user truth.
3. Console alignment docs under `frontend/docs/implementation/console-service-alignment/**`.
4. Current Console source code and mounted UI behavior.
5. Historical or archived docs only for context.

For Console/App alignment work, start with:

- `frontend/docs/implementation/console-service-alignment/README.md`
- `frontend/docs/implementation/console-service-alignment/services/STAGE_5_FULL_SERVICE_COVERAGE_AUDIT_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/services/CONSOLE_FEATURE_SERVICE_TAXONOMY_2026-05-24.md`
- `frontend/docs/implementation/console-service-alignment/stages/STAGE_6_IMPLEMENTATION_PASS_PLAN_2026-05-24.md`
- The relevant pass subplan in `frontend/docs/implementation/console-service-alignment/passes/**`
- The relevant contract chart in `frontend/docs/implementation/console-service-alignment/contracts/**`

## Audit Before Implementation

Console alignment is pass-based, not a whole-repo service rewrite. Keep the Stage 6 pass order, but close end-to-end proof inside the active pass before code changes.

Required proof chain:

`source truth -> service/query/RPC/Edge/Storage -> hook/context/state -> route/modal/panel/UI render -> button/form payload -> receiver -> app consequence`

Do not implement if any link is guessed. Continue the audit until the owner, field shape, receiver, role authority, failure state, and app consequence are explicit.

A service is not implementation-ready until the pass names:

- canonical read owner
- canonical write/action owner
- source table, RPC, Edge Function, trigger, or Storage policy
- all UI consumers and importers
- direct duplicate Supabase/Auth/Edge/Storage call sites
- rendered fields, labels, fallbacks, parsers, and degraded states
- visible actions by role
- submitted payload fields and receiver-accepted fields
- RLS/RPC/Edge/Storage authorization expectation
- realtime owner and cleanup behavior
- pagination/count/search/export scope
- app consequence and verification path

## Console Safety Rules

Visible CRUD is not authority. A button, modal, or table row proves only that the UI advertises an action. The audit must prove the backend receiver and role authority before the action remains enabled.

Classify every action before retaining it:

- scoped read projection
- policy-supported ordinary CRUD
- workflow command
- backend-derived read-only evidence
- excluded or separately owned boundary

Unsupported actions should become unavailable, disabled, read-only, or removed with honest feedback. Do not leave clickable no-ops, optimistic success copy, or broad fallback handlers.

## Shared Data Doctrine

Treat Supabase schema, RLS, RPCs, Edge Functions, triggers, generated types, and Storage policies as shared ecosystem infrastructure.

Rules:

- Preserve UUID-native internal identity. Display IDs are labels and lookup aids, not mutation identity.
- Do not confuse organization ids, hospital/facility ids, profile ids, user ids, provider ids, doctor ids, ambulance ids, request ids, trip ids, or display ids.
- Do not use a hospital id as an organization fallback unless the receiver explicitly documents that contract.
- Do not direct-update lifecycle fields that are owned by RPCs, triggers, payment functions, dispatch logic, or app-facing automations.
- Do not present capped, partial, failed, denied, or mock data as complete truth.
- Do not run database resets, destructive cleanup, migrations, seed scripts, repair scripts, or browser-side SQL during an audit.
- For reads during audit, prefer static source and doc evidence. Use live or staging introspection only when safe, read-only, and explicitly needed.

## High-Risk Console Patterns

Check these before changing code:

- Page-level direct Supabase reads that duplicate a service owner.
- `PageDataContext` or shell/global providers acquiring domain truth on unrelated routes.
- Context panels, FABs, bottom bars, maps, modals, exports, startup effects, or realtime channels that load protected data before an authorized surface is opened.
- Local page filtering/search/counts presented as complete server truth.
- `1000`-row or capped collections used as totals.
- Duplicate service owners for the same table or workflow.
- Direct table writes where a workflow RPC/Edge Function should own the command.
- Parser assumptions around JSON/object/scalar/date/number fields.
- Object truthiness where field validity matters.
- Hidden fallback paths that silently turn unauthorized, failed, or unavailable into empty state.

## Parser And Encoding Discipline

Field shape is part of the contract. Console receives old rows, generated rows, app-created rows, admin-created rows, JSONB objects, JSON strings, plain scalar strings, nulls, and malformed values.

Do not call `JSON.parse` just because a field used to be JSON. Normalize at the service/projection boundary and render from the normalized projection.

Before finishing any change that creates or edits text files, run a mojibake and encoding check on touched files:

```powershell
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" <touched-files>
rg -n --pcre2 "[^\x00-\x7F]" <touched-files>
```

The non-ASCII check is a review prompt, not an automatic failure. Keep text UTF-8 and ensure any non-ASCII characters are intentional.

## UI And Interaction Doctrine

Console is an operational tool. It should feel calm, dense, clear, responsive, and trustworthy.

Rules:

- Prefer clear status, role scope, pending state, and unavailable state over decorative dashboard polish.
- Every primary action needs immediate visible feedback.
- Loading states should be structural and compact, not blank pauses.
- Do not show fake metrics, theatrical enterprise claims, or debug artifacts as operational truth.
- Use one obvious primary action per moment.
- Use borders sparingly; prefer spacing, hierarchy, surface depth, and restrained color.
- Red is reserved for danger, emergency, destructive, or telemetry-critical meaning.
- Disabled or unavailable controls should explain the missing receiver, role, or backend proof when useful.

## Payments, Wallets, Dispatch, And Clinical Truth

Money, dispatch, emergency lifecycle, visit history, and clinical context are high-risk.

Required rules:

- Do not show payment, payout, ledger, cash settlement, or Stripe success before backend truth reflects it.
- Do not run browser-triggered repair/backfill mutations as part of ordinary page load.
- Do not imply dispatch, completion, clinician assignment, responder tracking, route/ETA readiness, or bed reservation before the backend lifecycle supports it.
- Request-derived visits and clinical records are backend-derived evidence unless a specific authorized receiver owns a change.
- Insurance billing outcomes are not insurance policy CRUD.

## Docs Discipline

Docs are part of the product system.

Rules:

- Keep detailed audit docs inside the existing console alignment tree.
- Prefer updating an existing source-of-truth doc over creating a sibling.
- Do not bloat root docs with every service detail; root docs should point to the detailed tree.
- Distinguish verified code/SQL evidence from inference.
- If a pass is interrupted, leave enough detail that the next contributor can resume without chat context.

## Git And Commit Discipline

The workspace may contain user changes. Do not revert unrelated files.

Before committing or pushing:

- Review `git status --short`.
- Review relevant diffs.
- Stage only intended files.
- Run appropriate verification and mojibake checks for touched docs.
- Commit only coherent, resumable audit or implementation packs.

Avoid doc-only micro-commits during ongoing audit. Use concise commit messages that describe the product or engineering outcome.

## Confidentiality

Treat algorithm notes, valuation work, sponsor material, prior-art comparisons, line exhibits, trace logs, and attorney-facing drafts as confidential by default.

Before committing or pushing sensitive material, verify repo, branch, remote, and disclosure path. Do not present legal, patentability, securities, tax, or valuation conclusions as professional advice.
