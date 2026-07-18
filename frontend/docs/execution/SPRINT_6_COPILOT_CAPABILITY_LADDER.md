---
status: complete
owner: product-and-engineering
last_updated: 2026-07-17
---

# Sprint 6 - Console Copilot Capability Ladder

## Outcome

Ship P1 preparation, P2 command confirmation, and P3 limited execution as one
responsive Console capability. The three levels share one action registry and
one confirmation surface; they do not create a second data or lifecycle owner.

## Capability boundary

| Level | User outcome | Authority |
|---|---|---|
| P1 - Prepare and guide | Explain current evidence, identify the next useful workflow, and prepare a bounded action card. | Existing route-owned read projection only. |
| P2 - Propose confirmed commands | Show the exact destination and require explicit confirmation. | Allowlisted command registry; no arbitrary route, event, table, RPC, SQL, or payload input. |
| P3 - Limited execution | Open the confirmed canonical Console workflow. | Idempotent navigation/open-workflow commands only. No database mutation. |

## First capability pack

- Today: requests, approvals, organizations, facilities, providers, and schedules,
  filtered by the role context already rendered by Today.
- Organization readiness: approvals, facilities, providers, and schedules.
- Emergency next action: request workspace, live map, and role-authorized Finance.

Organization creation and hospital creation remain unavailable because their
active pages deliberately fail closed. Copilot may guide users to the owning
workflow but must not invent those writes. Schedule creation, verification
decisions, emergency lifecycle changes, payment changes, and capacity changes
remain owned by their existing forms and command hooks.

## Command admission contract

Every executable Copilot command must prove:

1. A fixed command id in the registry.
2. A canonical destination already protected by route RBAC.
3. Idempotency when repeated.
4. No hidden mutation or free-form payload.
5. Explicit user confirmation.
6. Immediate pending feedback.
7. A local audit receipt containing only command id, action id, and timestamp.
8. Responsive presentation on phone, tablet, and desktop.

## Verification

- Contract schemas reject unknown action and command ids.
- The executor rejects arbitrary paths, events, SQL, RPC, and payload fields.
- A double confirmation cannot execute twice while pending.
- Route changes close stale Copilot state.
- Product copy contains no backend implementation language.
- Focus, hover, active, pending, unavailable, and confirmation states are visible.
- Full tests, production build, UI hardgate, mobile grammar, and encoding gates pass.

## Agent runs

- 2026-07-17: P1-P3 capability-ladder implementation started from P0 commit
  `6d6e3b8e`.
- 2026-07-17: Capability ladder completed. Desktop and phone browser journeys
  verified prepare, confirm, and open-workflow behavior. Production build and
  all 239 suites / 1,747 tests passed.
