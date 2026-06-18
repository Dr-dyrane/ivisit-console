# Frontend Agent Instructions

> **Start here before anything else:** `docs/_MASTER.md` — system map, current sprint state, full doc index, and collaboration rules for all agents.

These instructions apply to `ivisit-console/frontend` unless a deeper `AGENTS.md` exists.

## Mission

Console is the operational surface for providers, operators, sponsors, and administrators, but it must feel as simple, calm, and first-party as the patient app. The goal is not a generic SaaS dashboard. The goal is to make complex healthcare operations feel understandable, guided, and trustworthy.

Console should inherit the iVisit way from `ivisit-app`: emergency-grade clarity, backend-truth discipline, calm density, and Apple-level interaction quality.

## Authority Order

When guidance conflicts, use this order:

1. Shared Supabase/database/RPC/Edge/Storage truth in maintained migrations, generated types, and current database docs.
2. `ivisit-app` behavior where it consumes the same emergency, payment, hospital, provider, visit, wallet, support, user, content, or analytics truth.
3. Console alignment docs under `docs/implementation/console-service-alignment/**`.
4. Relevant pass subplans under `docs/implementation/console-service-alignment/passes/**`.
5. Relevant contract charts under `docs/implementation/console-service-alignment/contracts/**`.
6. Current Console source code and mounted UI behavior.
7. Historical or archived docs only for context.

For broad UI/architecture work, also read `../../ivisit-app/AGENTS.md` and preserve app-level doctrine where Console touches shared product truth or should visually align with app quality.

## Product Role And Boundary

Console serves the patient product. It does not invent parallel truth.

Rules:

- Console reads, reviews, approves, configures, dispatches, and administers shared backend workflows.
- Console must not create alternate patient, emergency, payment, wallet, capacity, provider, visit, support, or clinical truth that `ivisit-app` cannot reconcile.
- Visible CRUD is not authority. A table, modal, or button only proves the UI advertises an action; the backend receiver and role authority must be proven before the action remains enabled.
- Backend truth overrides local persisted state, mock state, fallback state, and dashboard convenience state.

## Audit Before Implementation

Console alignment is pass-based. Do not rewrite the whole frontend to satisfy one local defect.

Required proof chain:

`source truth -> service/query/RPC/Edge/Storage -> hook/context/state -> route/modal/panel/UI render -> button/form payload -> receiver -> app consequence`

Do not implement if any link is guessed. Continue the audit until owner, field shape, receiver, role authority, failure state, and app consequence are explicit.

A change is implementation-ready only when the pass names:

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

## Console UI Vision

Console should make management feel like an app, not a spreadsheet wearing cards.

Design goal:

- Operationally dense, but emotionally calm.
- Powerful, but guided.
- Data-rich, but not dashboard-noisy.
- Professional, but not generic enterprise SaaS.
- Clear enough that provider onboarding, dispatch, approvals, analytics, and CRUD-like workflows feel easy.

Apply the iVisit design challenge: if the patient app can make emergency care simple, Console can make healthcare data management humane.

## Specific UI Design Doctrine

Console should align with the patient app's implementation philosophy: logic, tokens, models, styles, and platform views are separated so surfaces can evolve without duplicating product logic.

Rules:

- Build screens as product surfaces, not generic admin pages.
- Prefer focused workflows, guided panels, command surfaces, and context rails over large all-purpose tables.
- Preserve one clear primary action per moment.
- Use short, directive copy. Buttons should describe the user's action, not the implementation.
- Every primary action needs immediate visible feedback: pending, success, unavailable, or error.
- Loading states should be structural skeletons or compact pending states, not blank pauses or generic spinners.
- Empty states should point to the next useful action.
- Disabled or unavailable controls should explain the missing receiver, role, or backend proof when useful.

## Borderlessness And Surface Quality

Borderlessness is a product quality rule inherited from `ivisit-app`.

Rules:

- Default to no visible borders. Use spacing, hierarchy, glass, depth, shadows, grouping, typography, and restrained contrast first.
- Do not outline every card, table, panel, or metric just to make layout visible.
- Borders are allowed only when they have a job: dense row scannability, table/grid alignment, input affordance, accessibility contrast, critical state, or high-density admin comparison.
- Hairline dividers should be quiet and purposeful. Use them for dense rows, ledger/payment breakdowns, audit timelines, verification queues, schedules, search results, and compact grouped settings.
- Brand-colored borders should be rare and semantic. Do not use primary borders as decoration on every dashboard card.
- Red is reserved for danger, emergency, destructive, denial, failed telemetry, or critical operational meaning.

## Glass, Depth, And Dashboard Restraint

Existing Console uses `glass-card`, context panels, hover glows, bento surfaces, and Framer Motion. Keep the good parts but reduce theatrical noise where it obscures truth.

Rules:

- Glass surfaces should support hierarchy, not become decoration.
- Hover glow is acceptable only when it clarifies interactivity or focus. Avoid glow stacks on dense operational lists.
- Motion should acknowledge state change or guide focus. Avoid decorative pulses, chaotic stagger, or dashboard spectacle.
- Metrics must be truthful. Do not show fake enterprise numbers, mock success percentages, fixed status figures, or fabricated trend rankings as operational truth.
- If data is unavailable, denied, partial, capped, failed, or demo, label it honestly.

## App-Aligned Architecture Pattern

Preserve the separation that makes `ivisit-app` portable between React Native and React:

- Routes compose.
- Screen/orchestrator components own page-level wiring.
- Controllers/hooks own state orchestration and side effects.
- Services own Supabase/Auth/Edge/Storage/API boundaries.
- Query hooks own server reads, cache, loading, error, invalidation, and pagination.
- Models/formatters normalize backend shapes before rendering.
- Tokens/styles own visual decisions.
- Leaf components render sections and interactions only.

Do not mix product logic into JSX-heavy dashboard cards. Do not hide service calls inside presentational components. Do not make page components own domain truth when a service/query/hook boundary should exist.

## State And Data Ownership

Use the five-layer doctrine where applicable:

- L1: Supabase realtime invalidates or refreshes server truth.
- L2: TanStack Query owns server cache, loading/error, refetch, pagination, and invalidation.
- L3: Persistent client state stores user/session preferences and safe UI continuity only.
- L4: Workflow/lifecycle legality belongs in backend RPCs, XState-like controllers, or explicit command state, not loose booleans.
- L5: Ephemeral UI state owns modals, selected rows, panel open state, drafts, filters, and feedback strings.

Rules:

- `PageDataContext` must not become a cross-domain server-truth owner.
- Domain pages and panels should consume explicit domain hooks/selectors.
- Server data loaded with `useState` plus async `useEffect` is usually a TanStack Query candidate.
- Realtime should not directly drive UI truth; it should invalidate or refresh the query owner.
- Preserve null-vs-populated semantics. Do not replace meaningful `null` with `{}`.
- Avoid object truthiness when field validity matters. Use explicit predicates.

## Current High-Risk Patterns To Fix Or Avoid

The Stage 5/6 audits identify recurring Console risks:

- `PageDataContext` broad loading, mock fallback, and duplicate domain ownership.
- Production mock records and estimates presented as operational data.
- Dashboard analytics such as success percentages or on-route estimates derived from missing or partial truth.
- Page-level direct Supabase reads that duplicate service owners.
- Duplicate realtime channels in global context, page, panel, and modal layers.
- Search and analytics services that turn failures into plausible ranked fallback data.
- QuickSearch category failures that can discard valid results from other categories.
- Visible switches or thresholds that are local-only and not backed by a receiver.
- Global debug/version markers mounted in production without authoritative source.
- Browser-triggered repair/backfill/payment/ledger mutations during ordinary page load.
- Direct table writes where workflow RPCs, Edge Functions, triggers, or payment/dispatch logic should own the command.

## Action Classification

Classify every visible action before retaining it:

- scoped read projection
- policy-supported ordinary CRUD
- workflow command
- backend-derived read-only evidence
- excluded or separately owned boundary

Unsupported actions should become unavailable, read-only, disabled with explanation, or removed. Do not leave clickable no-ops, optimistic success copy, broad fallback handlers, or fake toasts.

## Parser And Field-Shape Discipline

Console receives old rows, app-created rows, admin-created rows, generated rows, JSONB objects, JSON strings, scalar strings, nulls, and malformed values.

Rules:

- Normalize at service/projection boundaries.
- Do not call `JSON.parse` only because a field used to be JSON.
- Render from normalized projections.
- Keep UUID-native internal identity. Display IDs are labels and lookup aids, not mutation identity.
- Do not confuse organization ids, hospital/facility ids, profile ids, user ids, provider ids, doctor ids, ambulance ids, request ids, trip ids, or display ids.
- Do not use hospital id as organization fallback unless the receiver explicitly documents that contract.

## Payments, Wallets, Dispatch, Capacity, And Clinical Truth

These are high-risk domains.

Rules:

- Do not show payment, payout, ledger, cash settlement, wallet, or Stripe success before backend truth reflects it.
- Do not imply dispatch, completion, clinician assignment, responder tracking, route/ETA readiness, or bed reservation before backend lifecycle supports it.
- Request-derived visits and clinical records are backend-derived evidence unless a specific authorized receiver owns a change.
- Insurance billing outcomes are not insurance policy CRUD.
- Capacity displays must distinguish scalar beds, room buckets, active holds, completed/discharged requests, and unavailable proof.

## Responsive Console Design

Console should escape generic dashboard constraints the way `ivisit-app` escaped generic app design.

Rules:

- Desktop space should become context, not clutter.
- Prefer progressive disclosure, context panels, focused drawers, command sheets, and bounded content rails over giant tables.
- Mobile and desktop may compose differently, but they must share product logic and backend truth.
- Wide layouts should use anchored panels and context rails; do not simply stretch cards.
- Keep operational density readable: typography, spacing, and grouping should reduce cognitive load.

## Motion And Feedback

Rules:

- Framer Motion should be purposeful and restrained.
- Route transitions need shell-aware skeletons or progress treatment.
- Bulk/destructive/high-risk commands need pending guards and visible completion/failure states.
- Reduce-motion behavior must be respected for global feedback effects.
- Sound/haptic-like feedback, if present in web form, needs deliberate accessibility preference behavior.

## Encoding And Mojibake Gate

Before finishing any change that creates or edits text/source files, run an encoding check.

Useful checks:

```powershell
rg -n --pcre2 "[\x{00C2}\x{00C3}\x{00E2}\x{00EF}\x{00F0}\x{FFFD}]" <touched-files>
rg -n --pcre2 "[^\x00-\x7F]" <touched-files>
```

If working cross-repo with `ivisit-app` available, its `scripts/fix-mojibake.ps1` is the maintained repo-wide cleanup utility. Use it carefully and inspect representative diffs after it changes files.

The non-ASCII check is a review prompt, not an automatic failure. Keep text UTF-8 and ensure any non-ASCII characters are intentional.

## Verification Expectations

Scale verification to risk.

Common checks:

- Review relevant diffs.
- Mojibake/encoding scan for touched text files.
- Route smoke for changed pages/panels/modals.
- Role-scope checks for provider/admin/sponsor surfaces.
- Query/error/unavailable state checks for data surfaces.
- Browser console scan after route or shell changes.
- Contract-chart update when a pass changes service ownership, action authority, field shape, or receiver proof.

## Docs Discipline

Docs are part of the product system.

Rules:

- Keep detailed alignment docs inside `docs/implementation/console-service-alignment/**`.
- Prefer updating existing contract charts or pass docs over creating sibling docs.
- Distinguish verified code/SQL evidence from inference.
- If interrupted, leave enough checkpoint detail that the next contributor can resume without chat context.

## Git And Workspace Safety

The workspace may contain user changes. Do not revert unrelated files.

Before any git operation, ask the user.

Before committing or pushing after approval:

- Review status and relevant diffs.
- Stage only intended files.
- Run appropriate verification and mojibake checks.
- Keep confidential material out of broad/public pushes unless the user confirms the disclosure path.

Use concise commit messages that describe the product or engineering outcome.
