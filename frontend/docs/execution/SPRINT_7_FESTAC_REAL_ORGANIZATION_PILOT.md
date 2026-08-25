---
status: planning_only
owner: product_and_operations
last_updated: 2026-08-25
authority: execution plan; does not authorize production mutation
---

# Sprint 7 - Festac Real Organization Pilot

## Decision

iVisit will prepare one real Festac organization for a controlled onboarding and emergency-response pilot.
This is not a demo lane. The hospital, organization, staff, fleet, schedules, requests, telemetry, and
financial records must represent real actors and real operational facts.

This document plans the work only. It does not authorize a hospital claim, organization creation, evidence
approval, staff invitation, fleet mutation, schedule mutation, payment, wallet mutation, schema change,
deployment, or EAS update.

## Provisional Facility Choice

### Primary candidate: Emel Hospital

- Public name: `Emel Hospital`
- Address to verify in person: `21 Road, Z Close, Festac Town, Lagos`
- Public contact domain: `emelhospital.org`
- Public emergency contacts observed: `09123949055`, `09012910195`
- Public email observed: `info@emelhospital.org`
- Why it is the preferred candidate:
  - 24-hour emergency service is independently listed;
  - ambulance service is independently listed and appears in the FRSC ambulance registry;
  - the facility is described as a licensed secondary-care hospital;
  - multiple medical, surgical, paediatric, diagnostic, pharmacy, imaging, and ambulance capabilities are
    publicly attributed to the same Festac address;
  - the breadth is appropriate for testing organization administration, clinicians, responders, fleet,
    schedules, dispatch, handoff, and patient discovery without inventing capabilities.

### Backup candidate: Cedar Group Hospital

- Public name: `Cedar Group Hospital`
- Address to verify in person: `House 4, D Close, 208 Road, off 2nd Avenue, Festac Town, Lagos`
- Public email observed: `cedargrouphospital@gmail.com`
- Public emergency contacts observed: `07045669178`, `08033087333`
- Strength: public sources describe 24-hour accident and emergency care, trained physicians, nurses and
  paramedics, and a equipped ambulance service.
- Risk: its online identity can be confused with unrelated Cedar/Cedarcare facilities. It remains the backup
  until legal identity, address, and representative authority are verified.

### Candidate sources reviewed

- Lagos HEFAMAA blood-bank listing for Emel Hospital:
  `https://hefamaa.lagosstate.gov.ng/blood-banks/`
- FRSC ambulance-service register:
  `https://rtsss.frsc.gov.ng/service/ambulance`
- FidaHealth Emel ambulance and emergency listing:
  `https://fidahealth.com.ng/listing/ambulance-and-emergency-services-3/`
- Public facility/licensing directory entry for Emel Hospital:
  `https://thehospitalbook.com/emel-hospital/`
- FidaHealth Cedar Group accident and emergency listing:
  `https://fidahealth.com.ng/listing/accidents-emergency/`

Public listings are discovery evidence, not authority to claim. The candidate becomes final only after the
field representative verifies the physical facility and a named hospital representative proves authority.

## Historical Basis

This sprint preserves the lessons already encoded in Git history:

| Date | Change | Pilot consequence |
|---|---|---|
| 2026-05-24 | Pass 4 and Pass 5 mapped organization, verification, provider, fleet, scheduling, and telemetry receivers. | Use the complete receiver chain; visible CRUD alone is not authority. |
| 2026-07-09 | Onboarding resubmission became idempotent and organization/facility identity confusion was repaired. | Never use an organization UUID as a facility UUID; retries must reuse the same organization and claim. |
| 2026-07-12 | Atomic organization provisioning, wallet initialization, private evidence, Console identity projection, and scoped invitations were admitted. | New-organization onboarding is one reflected transaction; invitations must return to Console. |
| 2026-07-17 | Existing-facility claim, evidence review, ownership review, organization review, and facility review were implemented and deployed. | Review order is evidence, ownership, organization, then facility; none substitutes for another. |
| 2026-07-18 | Demo/E2E facilities were excluded from claim search and claimant correction recovery was hardened. | Real discovered hospitals remain claimable; no demo marker or cleanup expiry belongs on the pilot. |
| 2026-07-18 | Rich fleet and staff lanes proved six-state fleet UX and table-backed doctor schedules. | Real fleet and doctor schedules may be configured after scope proof; do not invent missing crew schedules. |
| 2026-07-21 | Claimant changes-requested recovery and exact queue counts were deployed. | Corrections reuse the same identities and replacement evidence; no duplicate claim or organization. |
| 2026-03-05 | Cash fee deduction and paired ledger behavior were hardened. | Platform fees remain server-owned and idempotent; the client must never repair or duplicate them. |
| 2026-07-19 | Demo cash settlement was isolated from real wallets and ledgers. | The Festac pilot must use the real cash contract; demo auto-approval is forbidden. |
| 2026-07-21 | Patient cash availability returned to a server-owned boolean based on canonical price and organization collateral. | A credit change must update server preflight and approval together; UI-only availability is invalid. |

Relevant commits include Console `15b80508`, `55934c75`, `22f10ff3`, `e99b71fb`, `cca63dc1`, `cbb2b07b`
and App `84e2653b`, `346fb409`, `791744ac`, `dda2aa49`.

## Non-Negotiable Truth Boundaries

1. `organization`, `hospital`, `profile`, `doctor`, `ambulance`, `request`, and `wallet` identifiers remain
   distinct UUID-native identities.
2. Search the canonical onboarding facility catalog first. If Emel already exists as one unowned discovered
   facility, claim that exact record. Do not create a second Emel Hospital.
3. If the record is owned, actively claimed, ambiguously duplicated, or located at a different address, stop.
   Ownership transfer is a separate legal/manual boundary.
4. Claim approval links ownership only. It does not verify the organization or facility and does not make the
   hospital visible to patient discovery.
5. Organization approval precedes facility approval. Patient App eligibility remains controlled by the
   existing `nearby_hospitals` contract.
6. No pilot row uses `[DEMO]`, `demo:`, `e2e:`, `demo_scope`, or an expiry marker.
7. No fabricated staff member, ambulance, licence, bed count, service, price, schedule, or telemetry point is
   allowed inside the real organization.
8. Real pilot records are retained and audited. Rollback retires or suspends eligibility; it does not broadly
   delete the organization graph.

## Operating Roles

| Actor | Pilot authority |
|---|---|
| iVisit platform admin | Review evidence, ownership, organization, and facility; configure or suspend an approved credit policy; supervise go/no-go. |
| Hospital authorized representative | Attest legal identity, address, services, facility resources, and authority to claim. |
| Hospital org admin | Manage scoped staff invitations, facility operations, fleet records, doctor schedules, and cash approval. |
| Dispatcher | Operate the organization-scoped request and map lanes only. |
| Doctor/provider | Maintain allowed profile fields and participate only in reflected schedules/assignments. |
| Driver/paramedic | Operate the responder lens, accept assigned work, and publish real foreground telemetry from the assigned device. |
| Patient | Use the canonical iVisit App; never use Console as the patient surface. |

## Required Real-World Pack

Before any claim is submitted, collect and verify:

1. signed claim authorization from a named hospital officer;
2. legal organization name and registration evidence;
3. current facility operating licence or regulator evidence;
4. exact physical address, entrance, map pin, phone, email domain, and operating hours;
5. medical director or accountable clinical lead;
6. emergency department and ambulance-service attestation;
7. list of services actually offered, including appointment/eligibility constraints;
8. bed/capacity reporting owner and update cadence;
9. named organization admin, dispatcher, clinical lead, and fleet lead;
10. staff roster import sheet with consent and minimum necessary identity fields;
11. ambulance register with call sign, type, plate, station, readiness state, and assigned responder;
12. cash and platform-fee pilot addendum, credit limit, settlement period, and escalation contacts;
13. privacy, location-telemetry, and emergency-pilot acknowledgements;
14. go-live and rollback sign-off.

The legal and regulatory sufficiency of these documents must be reviewed by the appropriate Nigerian counsel
or compliance professional. This plan is an operational checklist, not legal advice.

## Sprint Sequence

### Phase 0 - Freeze identity and commercial terms

Owner: Product + Operations + Hospital representative

- Confirm Emel Hospital or explicitly switch to Cedar Group Hospital.
- Search `search_onboarding_facilities` using the exact name, address fragments, and phone.
- Compare the returned record with field evidence and the physical map pin.
- Capture the chosen facility UUID in the private pilot register only after an exact match.
- Decide billing currency and the patient cash price before a real request. Current backend truth is USD-first;
  a Festac operator must not silently convert a displayed USD amount to NGN.
- Agree the maximum iVisit platform-fee credit, repayment period, suspension trigger, and dispute owner.

Gate P0: one exact facility identity, one authorized claimant, one agreed currency/price contract, and signed
pilot terms. Any ambiguity is a no-go.

### Phase 1 - Claim submission

Owner: Hospital representative with iVisit observer

- Invite or use the authorized claimant account through the Console callback path.
- Start existing-facility onboarding and select only the exact claimable facility.
- Enter the legal organization separately from the hospital record.
- Upload the private verification pack through the existing actor-owned Storage path.
- Submit once and record the reflected organization, claim, evidence, profile, and wallet identifiers.
- Reload and sign in again to prove the same pending application is recovered without duplication.

Gate P1: one organization, one claim, one claimant, private evidence present, one initialized wallet, and no
patient discovery eligibility.

### Phase 2 - Ordered review and correction

Owner: iVisit platform admin

- Review evidence first.
- Exercise `request changes` once on a non-critical document if the hospital agrees to rehearse correction.
- Have the same claimant submit replacement evidence; prove the same organization and claim are reused.
- Accept evidence.
- Approve facility ownership.
- Approve the organization.
- Approve the facility only when all prerequisites and operational facts are valid.
- Confirm the hospital appears through patient discovery only after final facility approval.

Gate P2: the chain is reflected in order; correction created no duplicates; the App sees the exact same
facility identity and location.

### Phase 3 - Organization configuration

Owner: Hospital org admin, observed by iVisit

- Confirm `Africa/Lagos` as facility timezone.
- Enter only real contact points, operating hours, services, appointment requirements, capacity owner, and
  emergency contacts.
- Configure capacity and availability with named hospital ownership and a refresh cadence.
- Enter hospital service prices only when the hospital asserts them. Otherwise preserve the current
  server-owned provisional fallback as the patient price; never add a client-side amount.
- Confirm every Console aggregate is scoped to this organization/facility and does not show platform totals.

Gate P3: organization and facility projections agree across Console and App with no fabricated readiness.

### Phase 4 - Staff and RBAC

Owner: Hospital org admin + iVisit identity observer

- Invite the minimum real launch team first: one org admin, one dispatcher, one clinical lead, one doctor,
  one driver, and one paramedic or ambulance-service provider where applicable.
- Use legal provider-type values only: doctor, driver, paramedic, ambulance_service.
- Verify every invitation returns to the Console callback and grants only the intended organization scope.
- Link doctors to the exact hospital, not the organization UUID.
- Verify doctor profile, license, specialty, availability, and contact fields against the enrollment sheet.
- Confirm each persona sees only its intended navigation and records on desktop and mobile.

Gate P4: every person is real, invited once, scoped correctly, and able to sign in; no role is inferred from
client metadata.

### Phase 5 - Fleet and schedules

Owner: Fleet lead + Clinical lead

- Create only physically verified ambulance units.
- Record call sign, type, plate, station, service/readiness state, and real responder assignment.
- Keep active-trip status and location under the request-coupled lifecycle; ordinary fleet CRUD must not fake
  telemetry or dispatch readiness.
- Create doctor shifts through the table-backed `doctor_schedules` flow in `Africa/Lagos` time.
- Prove overlap rejection and reload persistence.
- Do not claim driver or paramedic shift scheduling. The current production-backed scheduling lane is doctor
  schedules. Driver/paramedic identities and fleet assignments may be onboarded, but crew roster scheduling
  remains a separately scoped receiver unless later proved.

Gate P5: real fleet identity is visible, one assigned driver is positively linked, doctor schedules persist,
and no unsupported crew schedule is presented as truth.

### Phase 6 - Bounded organization credit

Owner: Finance product owner + Backend owner + Platform admin

The requested behavior is accepted in principle but rejected as an unrestricted negative-balance toggle.
The safe contract is a bounded, explicit credit facility.

Planned schema contract in the App-owned finance pillar:

- add a non-negative `credit_limit` to `organization_wallets`, default `0`;
- add a controlled `credit_status` such as `disabled`, `active`, `suspended`;
- record credit approval actor/time and settlement terms on the same wallet contract or an audited policy
  record, after the backend audit chooses the smallest canonical shape;
- derive `credit_used = max(-balance, 0)` and `credit_remaining = max(credit_limit-credit_used, 0)` rather
  than storing duplicate counters.

Receiver changes must be atomic and mirrored in both maintained definitions:

- patient-safe cash preflight uses `balance - fee >= -credit_limit` only when credit is active;
- `approve_cash_payment` locks the request, payment, and wallet, repeats the limit check, creates one
  idempotent organization fee debit, and allows the resulting balance to be negative only within the limit;
- a platform-admin-only audited command enables, changes, suspends, or closes the credit policy;
- outstanding credit blocks closure and new cash requests when suspended or exhausted;
- settlement records real repayment and clears the receivable without rewriting history;
- retries remain idempotent and cannot charge or recognize the same fee twice.

Console copy:

- positive/zero wallet: `Available balance`;
- negative wallet: `Credit used` and `Amount owed`;
- remaining facility: `Credit remaining`;
- exhausted/suspended: `Cash requests paused` with the recovery owner;
- never label a negative balance as available cash or payoutable funds.

Finance stop condition: determine whether `ivisit_main_wallet.balance` is collected/payoutable cash or an
earned-fee balance. If it is collected cash, a credit-backed platform fee must remain a receivable and must
not increase payoutable platform funds until the organization settles. This must be resolved before code.

Gate P6: migration/RPC/RLS/type/doc/guard plan approved, currency settled, rollback designed, and finance
semantics unambiguous. Only then may implementation begin in `ivisit-app`, followed by mirror sync to Console.

### Phase 7 - Pre-live rehearsal

Owner: QA + Operations

- Rehearse the entire workflow in a separate disposable organization; do not place fake people or vehicles
  inside the real hospital.
- Verify desktop and mobile Console role journeys.
- Verify patient App discovery, cash availability, cash approval, request state, dispatch offer, and tracking.
- Verify the real driver device has foreground location permission, network connectivity, and a staffed unit.
- Verify reconnect, stale telemetry, ETA refresh, arrival acknowledgement, completion, and exactly one rating.
- Verify cash approval replay, credit-limit exhaustion, repayment, suspension, and idempotency.
- Clean only the disposable rehearsal manifest twice and prove zero residue.

Gate P7: all automated and browser gates pass; no EAS update is assumed. A native build is required only if
the pilot needs background location or push capability absent from runtime 1.0.8.

### Phase 8 - Real Festac field run

Owner: Named incident commander

- Use the retained real hospital, real staff, real ambulance, real driver device, and a consenting participant.
- Begin with a low-risk controlled pickup and hospital observer present.
- Keep payment method cash, but do not proceed until the displayed currency/price and hospital collection
  agreement are explicit.
- Observe Console and App from separate devices; do not manually repair lifecycle rows.
- Capture request, payment, ambulance, responder, organization, and facility display references in the private
  pilot log.
- Stop immediately on identity mismatch, wrong facility, unavailable real responder, stale telemetry,
  duplicate charge, unclear cash amount, or unauthorized patient-data exposure.

Gate P8: dispatch, telemetry, arrival, completion, rating, and financial reflection agree end to end without a
hard refresh or manual database edit.

## Rollback And Suspension

- Before ownership approval: withdraw or request changes on the claim; preserve evidence audit.
- After ownership but before go-live: suspend organization/facility eligibility; do not delete the discovered
  hospital.
- After patient visibility: mark the organization/facility unavailable through canonical admin receivers and
  verify App discovery removal.
- Staff/fleet issue: suspend the affected identity or unit; do not reassign by direct row repair.
- Credit issue: suspend new credit-backed cash approvals. Do not erase a negative balance or its ledger.
- Outstanding debt: retain `Amount owed` and settlement history until a verified repayment clears it.
- Security or patient-safety issue: stop the pilot, preserve logs, and conduct an incident review before
  reactivation.

## Required Documents To Produce Before Execution

1. `Festac Hospital Claim Authorization Letter` template.
2. `Facility Identity and Capability Verification Sheet`.
3. `Staff and RBAC Enrollment Register`.
4. `Fleet and Responder Enrollment Register`.
5. `Cash and iVisit Credit Pilot Addendum`.
6. `Location Telemetry and Controlled Emergency Run Consent`.
7. `Go-Live Command Sheet and Stop Conditions`.
8. `Pilot Evidence, Incident, and Sign-Off Ledger`.

Templates must use calm external copy, collect only necessary data, identify the responsible signer, and keep
confidential material outside the public repository. Final legal language requires professional review.

## Definition Of Ready

The sprint may move from planning to execution only when all are true:

- the user explicitly authorizes execution after reviewing this plan;
- the hospital candidate and exact discovered record are confirmed;
- a hospital representative is authorized and available;
- the private document pack is complete;
- USD/NGN pricing and cash collection are resolved;
- the bounded-credit finance contract is approved;
- the real launch roster and fleet list are available;
- one incident commander and rollback owner are named;
- no production mutation is needed to guess a receiver or identity.

## Explicitly Out Of Scope For This Planning Pass

- claiming or creating the hospital;
- approving evidence, ownership, organization, facility, staff, or fleet;
- inviting accounts;
- entering staff, fleet, schedules, prices, beds, or telemetry;
- changing migrations, schema, RPCs, RLS, Edge Functions, or payment behavior;
- deploying Console, publishing EAS OTA, or changing patient discovery;
- creating real or simulated payments.

## Disposable Pre-Live Rehearsal Checkpoint - 2026-08-25

This checkpoint exercised Phase 7 with a manifest-owned disposable organization near Festac. It did not
claim, verify, edit, invite into, or otherwise represent Emel Hospital. The retained discovered Emel record
`578bdc07-8fd8-4e1e-b3ea-83be2c0a6c9a` remained unowned, unverified, pending review, and dispatch-ineligible.
Every cleanup preview and apply asserted its protected snapshot before proceeding.

### Exact rehearsal boundary

- run: `flow-matrix-1787682882557-0a1e9830`;
- fixture: `[DEMO 0a1e9830] Festac Care Operations Rehearsal`;
- ownership: one exact-run manifest with `hard_delete_exact_run` disposition and a seven-day expiry;
- rich state: six providers, four future doctor schedules, six ambulances across ready, pending, offline,
  maintenance, and returning states;
- production contract changes: none;
- schema, migration, Edge Function, Console deployment, native build, and EAS changes: none.

### Browser and canonical-data results

1. Scheduled care passed from patient facility discovery to an `Africa/Lagos` slot, canonical scheduled
   Visit, Console scheduled projection, Console cancellation, and patient-side cancelled reflection.
2. Cash emergency passed payment creation, organization approval, dispatch, responder acceptance, realtime
   ETA, responder arrival, patient Confirm Arrival, responder completion, and exactly one five-star rating.
3. A clean-cache replay proved the mounted patient App moved from `Waiting for approval` to
   `Assigning driver` with `Payment received. Dispatching now.` about five seconds after Console approval,
   without a browser refresh. This validates the real-cash watcher at the payment-to-tracking handoff.
4. Stale pre-dispatch telemetry failed safely when request and assignment identity were incomplete; the
   harness now sends those identities only as a pair. Assignment-coupled telemetry then recovered normally.
5. The canonical onboarding live E2E passed claim, evidence correction, ownership, organization, facility,
   invite callback, App eligibility, reflection, and cleanup twice using a separate disposable run.
6. Focused App contracts passed 18/18 and the production web export passed.

### Fixture defects corrected

- The operations-rich facility now declares booking eligibility, `Emergency Medicine` and
  `Internal Medicine`, and a confirmed `Africa/Lagos` timezone.
- Rehearsal doctor schedules are generated for the next day. A same-day UTC date could already be outside
  the Lagos booking window and falsely present a healthy schedule contract as empty.
- Real cash approval now continues watching canonical payment/request truth after the initial pending result
  and clears the approval overlay when settlement arrives. Demo auto-approval remains isolated.
- Sign-in contact-country initialization no longer requests foreground location or waits for GPS. It starts
  with a usable fallback and may refine only from an already-authorized cached global location.

### Cleanup and idempotency proof

The first exact cleanup removed the operational graph but timed out while removing four disposable
profiles. A preview showed only those four profiles and Auth users. Replaying the same manifest-owned
cleanup removed them, a zero-residue preview passed, a second apply remained at zero, and the final preview
again reported zero across every tracked resource class. No record was selected by a name, email pattern,
organization-wide sweep, or other broad match.

### Gate conclusion

- Bounded implementation: **proved for the disposable browser rehearsal and canonical onboarding harness**.
- Real business outcome: **not yet proved**. Emel still requires an authorized representative, private
  evidence, legal/operational verification, real staff and fleet facts, currency/cash agreement, and the
  controlled physical-device field run in Phase 8.
