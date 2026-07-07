---
status: living
owner: product
created: 2026-06-18
source: iVisit app reference study, console rulebook, Supabase governance doctrine
---

# Today Product Room

## Executive Decision

iVisit Console becomes the work sibling of `ivisit-app`: a calm, sheet-first care surface that keeps the app and console synced through one Supabase truth layer.

The product is not a dashboard redesign. It is a home for the next clear work moment.

Patient app promise:

`Get help fast.`

Console promise:

`Show what needs attention now.`

## Product Room Model

The product room runs as a controller plus specialist staff. Staff do not ship product independently. They produce evidence, decisions, and implementation tasks. The controller resolves conflicts and moves one verified slice at a time.

| Staff | Responsibility | Required output |
|---|---|---|
| Product Director | Owns north star, scope, and gate decisions | Living decision ledger |
| Design Canon Staff | Maintains Alexander/Dyrane/Apple rules | UI canon pass/fail notes |
| iVisit App Reference Staff | Compares console against real app screens and tokens | Screenshot and token comparison |
| Supabase Governance Staff | Accounts for every table/RPC/Edge/Storage owner | Table governance matrix |
| RBAC Staff | Verifies visible action authority by role | Role/action capability matrix |
| UX Flow Staff | Converts roles into one-action-at-a-time journeys | Flow map and empty/unavailable states |
| Frontend Shell Staff | Builds atlas, today view, sheet, rail, and responsive shell | Rendered console shell |
| Component Systems Staff | Ports app DNA into reusable console primitives | Tokens and component inventory |
| Interaction Staff | Adds tap, hover, loading, pending, disabled, and reveal feedback | Interaction proof list |
| QA Staff | Runs build, browser, mobile, console, overlap, and encoding checks | QA ledger |
| Release Staff | Packages coherent work without pushing until approved | Handoff summary |

## Non-Negotiable Proof Chain

No command ships unless the product room proves:

`source truth -> service/RPC/Edge/Storage -> hook/state -> UI render -> payload -> receiver -> app consequence -> audit trail`

If any link is unknown, the console must render the state as unavailable, read-only, or pending with honest feedback.

## Supabase Governance Promise

The console does not blindly CRUD every table. It governs every table.

Every table must be classified as one of:

- `console-managed`: console can create, update, archive, or delete through proven receivers.
- `console-commanded`: console triggers RPC or Edge workflows, but does not direct-write lifecycle fields.
- `read-only evidence`: console displays backend/app truth only.
- `app-owned`: `ivisit-app` owns the lifecycle; console observes or supports.
- `system/internal`: auth, audit, ledger, triggers, derived records, or protected logs.
- `hidden/excluded`: unsupported, too sensitive, or no safe role authority yet.

Required table matrix columns:

`table -> owner -> console policy -> app consumer -> allowed roles -> allowed actions -> receiver -> realtime owner -> audit proof`

## Design Canon

The console must follow one law:

`Reduce cognitive load until the next right action feels obvious.`

UI-facing language must stay plain:

- Use `Today`, `Needs attention`, `Requests`, `Approvals`, `Your visits`, `Activity`, and `Details`.
- Do not show internal terms such as `receiver`, `source truth`, `workflow command`, `audit`, `dispatch`, or `operations` in first-screen UI.
- Use `Not ready yet` for locked work, with a short reason only after reveal.

Rules:

- One screen, one dominant action.
- Sheet first, dashboard second.
- Atlas/canvas gives place and state; it is not decoration.
- Progressive disclosure before route churn.
- Red has meaning: brand, emergency, danger, or critical status.
- No fake metrics, mock totals, or synthetic charts presented as real.
- Disabled actions explain the missing role, backend path, or approval only after reveal.
- Mobile is recomposed into bottom sheets, not squeezed desktop.
- Motion clarifies state: tap, hover, pending, reveal, route transition.

## First Product Slice

Ship the soul before rebuilding every page:

`Today Home + Requests Page`

The shell must include:

- Quiet atlas layer inspired by the real app map surface.
- A simple role-scoped Today signal.
- One contextual sheet with evidence rows on Today.
- One canonical multi-data Requests page for live request review.
- One safe primary action.
- High-risk actions stay locked until the backend path is documented.
- Desktop side sheet, tablet side sheet, mobile bottom sheet.

## Executive Checkpoints

The user should not be pulled into every staff meeting. Bring decisions back only at these gates:

1. Concept lock: the product direction and first slice are coherent.
2. First rendered shell: browser screenshot matches the accepted concept family.
3. First real data/action slice: source truth and receiver chain are proven.
4. Final release review: build, browser, mobile, encoding, and QA ledgers are green.

No git push occurs without explicit user approval.

## Page Gate Relationship

The product room moves one page at a time through [PAGE_REVAMP_GATE.md](./PAGE_REVAMP_GATE.md).

Today Home is page 1 and Requests is the canonical multi-data companion. The next page cannot claim the revamp pattern until Today and Requests prove RBAC, layout relationship, old behavior preservation, iVisit design fit, implementation scope, and QA proof together.
