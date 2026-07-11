# Fail-Closed CRUD Backlog — the "ivisit-app -> DB -> Console" receiver work

> Written 2026-07-10. Several revamped console pages surface a CRUD action as a **fail-closed
> toast** ("unavailable" / handler throws) instead of a working modal. This is **by design** —
> "no parallel truth": the console must not write records whose **receiver / app consequence** is
> unproven. This doc NOTES every such gate so that, after the UI + data-sync revamp concludes, the
> writes can be enabled properly in the order **app consumer -> DB (schema + RLS) -> console reconnect**.
>
> Companion: `PAGE_REVAMP_GATE.md` (per-page admission), `CONSOLE_LAYER_MODEL_PLAN.md:211`
> (the 2026-07-08 assess-first outcome: "the console is largely a gated read/admin surface").

---

## How each gate was classified

Read from the page's command handlers (2026-07-10):
- **Real** = the handler opens a modal whose `onSave` calls the service write (`createX`/`updateX`/
  `deleteX` / `mutateAsync`), or calls it directly.
- **Gated** = the handler routes to a `*Unavailable` toast or `throw`s — no reachable write.
- A **role/state gate** (a real write blocked for a role, or a record not in a writable state) is
  NOT counted as a receiver gap — the write works; it's just conditionally shown.

---

## The matrix — revamped pages

Legend: **OK** real write · **GATE** fail-closed toast (no receiver) · **role/state** real but conditionally gated · **—** n/a

| Page | Create | Edit | Delete | Other writes | Receiver blocker (why gated) |
|---|---|---|---|---|---|
| Requests (Emergency) | OK (admin) | — | OK (bulk-cancel, admin) | GATE dispatch / cash-settlement / payment-retry | dispatch + settlement receivers unproven ("not ready here yet") |
| Visits | OK (`createVisit`) | OK (`updateVisit`) | — | — | **working** |
| Hospitals | **GATE** ("Add facility unavailable") | OK (`updateHospitalMutation`) | role/state | — | **facility CREATE receiver** (create dropped; FAB -> Facility approvals) |
| Ambulances | OK (live) | OK (live) | **GATE** | GATE dispatch / status / location / upload | **unit delete + dispatch/status receivers** (create/edit are live) |
| Staff (Doctors) | OK | OK | OK (`deleteDoctorMutation`) | — | **working** |
| Approvals (Verification) | — | — | — | OK (approve / reject) | **working** |
| **Users** | **GATE** (invite/create -> `handleIdentityActionUnavailable`) | OK (`updateProfile`) | **GATE** (`handleDeleteUnavailable`) | — | **identity authority** — invite + delete receivers unproven (edit works) |
| Support Tickets | OK (`createTicketMutation`) | OK (`updateTicketMutation`) | OK (`deleteTicketMutation`) | OK (assign) | **working** (role/item gated) |
| **Health News** | **GATE** | **GATE** | **GATE** | **GATE** (publish) | **schema lacks body cols + RLS read-only + no app consumer** — `task_7904085e` |
| **Insurance** | **GATE** | **GATE** | **GATE** | **GATE** (verify) | no admin RLS/RPC; billing read-only (`INSURANCE_COMMAND_AUTHORITY_DECISION_2026-07-07`) |
| **Subscriptions** | **GATE** | **GATE** | **GATE** | — | subscriber write authority + receiver unproven |
| **Organizations** | **GATE** | **GATE** | **GATE** | **GATE** (bulk) | org identity + wallet scope + admin command authority unproven |
| **Pricing** | **GATE** | **GATE** | **GATE** | **GATE** | pricing source owner + facility scope + quote/app consequence unproven |
| Wallet | — | — | — | **GATE** (payout / card-detach / cash / transfer) | Stripe receiver + reconciliation; ledger is read-only |
| Settings | — | OK (own-user profile) | — | OK (password / MFA) | **working** (own-user only) |
| Analytics | — | — | — | **GATE** (export) | actor-scoped projection + export scope unproven |

---

## Highest receiver debt — FULLY read-only pages (every CRUD is a toast)

1. **Health News** — create/edit/delete/publish. Worked example, blockers proven (`task_7904085e`).
2. **Insurance** — all policy commands.
3. **Subscriptions** — subscriber create/edit/delete.
4. **Organizations** — org create/edit/delete/bulk.
5. **Pricing** — all pricing mutations.
6. **Wallet** — all money-moving writes (read-only ledger).
7. **Analytics** — export.

## Partial receiver debt — some CRUD gated

- **Users** — invite/create + delete gated (identity authority); **edit works**.
- **Hospitals** — facility create gated; **edit works**.
- **Ambulances** — delete + dispatch/status/location gated; **create + edit are live**.
- **Emergency** — dispatch / cash-settlement / payment-retry gated (state + receiver); **create + bulk-cancel work**.

## Zero debt — fully working CRUD (no receiver gap)

- **Doctors/Staff** (full CRUD) · **Support Tickets** (full CRUD) · **Visits** (create/edit) ·
  **Approvals** (approve/reject) · **Settings** (own-user).

---

## The enable pattern (per gated write) — "app -> DB -> console"

For each GATE cell, in order (the "no parallel truth" precondition first):

1. **App consumer / consequence** — prove `ivisit-app` (or the intended public-feed / patient surface)
   consumes the record; wire the consumer if absent. Without this, an enabled write is orphan data.
2. **DB** — add the schema columns for the full payload + an RLS `insert`/`update`/`delete` policy for
   the console role (admin/org_admin). Regenerate `src/types/database.ts`.
3. **Console** — reconnect the modal: `handleCreate -> setModalMode('create')`; the create-modal
   event listener + header button -> `handleCreate` (not `*Unavailable`); `handleSave -> service write`.
   Flip the page's `PAGE_REVAMP_GATE.md` admission + its `*.contract.test.js` read-only pins.
4. **Verify live** — an authenticated console write persists the full record AND the consumer surface
   displays it. Run the grammar harness + the page contract + mojibake.

Worked example — **Health News** (`task_7904085e`): (1) `health_news` has no `description`/`content`
columns for the article body; (2) RLS is public-read-only; (3) `ivisit-app` has zero `health_news`
references. All three must close before the trivial console reconnection + governance flip.

---

## Note

The mobile dock FAB already surfaces these as **gated-create** affordances (Users "Add user",
Subscriptions "Add subscriber", Health News "New article") that open to the honest "not ready"
feedback — so when a receiver lands, only the page handler + gate doc + contract flip; the FAB is
already correct (see `MOBILE_DESIGN_SYSTEM.md` FAB canon + `fab-mirrors-desktop-cta`).

---

## Receiver groups + build order — 2026-07-10 multi-agent audit

A 5-reader audit of the 10 **concluded** pages classified every write action: **~37 already
persist, 33 are fail-closed**, clustering into **15 receiver groups**. Grouping the backlog by the
*shared backend receiver* makes the build one-receiver-unblocks-many, not one-page-at-a-time.

### DO NOT BUILD — correct-by-design read-only mirrors (3 groups)
Gated, but must **stay** gated — the truth is owned elsewhere and the console is a faithful
read-only mirror. Do **not** build a receiver or "enable" these:
- **dispatch-live-truth** — Ambulances trip-status / current-call / live-location / trip commands, Hospitals bed reservations + ER wait time. Owned by **Requests / Map / driver app**, fed by live activity (`AMB-6`, `F3`; fields read-only, "…stays in Requests").
- **care-flow-clinical-ownership** — Requests *edit*, Visits *practitioner assignment*. Owned by the **ivisit-app care flow**; the console update RPCs exist but the fields are read-only by design.
- **facility-edit-scope** — Hospitals out-of-org `org_admin` edit. The receiver *works*; the toast is an intentional client-side mirror of `update_hospital_by_admin`'s server-side org-scope refusal (`F5`).

### BUILD — real receiver debt (12 groups), heaviest first
| Receiver group | Pages · actions | What must land (app → DB/RLS → console) |
|---|---|---|
| **identity-authority** (6) | Users: add / invite / create / delete · Approvals: edit provider identity | invite-user Edge Fn proven + `profiles` INSERT/DELETE RLS (today owner-only; only `bvn_verified` admin-writable) → fix `modalMode` never set to invite/create + `onInvited`↔`onInviteSuccess` prop mismatch; add a delete path (no `deleteProfile` fn exists) |
| **content-authoring** (5) | Health News: create / edit / delete / publish / import | `health_news` write RLS + body columns (`description`/`content`/`icon`/`url`) + an ivisit-app feed consumer → un-import the dormant create/update/delete/toggle/bulk writers, drop the `handleSave` throw (`task_7904085e`) |
| **facility-write-authority** (3) | Hospitals: create / delete / import | `hospitals` INSERT policy + create RPC + proven DELETE authority (`delete_hospital_by_admin`, `createHospital`/`deleteHospital` exist, dormant) → re-mount create modal, un-disable bulk delete, wire import |
| **visit-terminal-outcome** (2) | Visits: complete/cancel · delete | app visit-outcome authority + DB status write (completed/cancelled/no-show) + hard-delete proof (`completeVisit`/`deleteVisit` dormant) → re-enable disabled SelectItems + add terminal values to the whitelist |
| **ambulance-fleet-write-tooling** (2) | Ambulances: bulk delete · import | *No app/DB gap* — create/edit already persist (RLS ALL). Delete needs an authorization decision (`deleteAmbulance` dormant); import is just unbuilt batch UI over the working insert |
| **finance-cash-settlement** (1) | Requests: process cash settlement | Pass-2 Finance receiver (app settlement ledger + DB RPC/RLS) → flip hardcoded `canProcessCash`, replace the `toast.info` stub |
| **support-status-transition** (1) | Support: resolve / close | a support status receiver → import the dormant `updateTicketStatus`, add a status control, restore `status` to the edit allowlist |
| **approvals-export-authority** (1) | Approvals: export | an approval-report export endpoint + authority (panel export currently an inline notice) |
| **provider-reject-state** (1) | Approvals: reject provider | a provider verification tri-state (`rejected` column) — today only a `bvn_verified` boolean (facilities already have the tri-state) |
| **driver-assignment-proof** (1) | Ambulances: assign driver | a drivers/provider receiver + DB station link (`assignDriverToAmbulance` dormant) |
| **storage-media-policy** (1) | Ambulances: unit image upload | a Supabase Storage bucket + RLS upload policy |
| **staff-scheduling** (1) | Staff: schedule staff | a scheduling receiver (DB shifts + app) → wire the existing `StaffScheduler`/`StaffSchedulingModal` onto `/doctors` |

### Cheapest to admit — dormant service fn already exists (just needs the backend receiver + a few lines of wiring)
`updateTicketStatus` (Support resolve/close) · `createHealthNews`/`updateHealthNews`/… (Health News) · `deleteAmbulance` (Ambulances) · `createHospital`/`deleteHospital` (Hospitals) · `completeVisit`/`deleteVisit` (Visits) · the invite-user Edge Function (Users). For these the console side is trivial — the gate is purely the backend receiver + authority.
