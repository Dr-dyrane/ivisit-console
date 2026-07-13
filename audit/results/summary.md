# iVisit Console Runtime CRUD And Interaction Audit

Generated: 2026-07-13T16:24:16.773Z
Run: audit-20260713160822-1b2f6854
Input fingerprint: 8a59b0479a09dc71545d5a4aeffebfc09140bf419dbf092cb3969e95b0ef7b1e

## Exact totals

- Confirmed affected action definitions: **0**
- Confirmed failure cases: **0**
- Mounted UI failure cases: **0** across **0** mounted action definitions
- Receiver-only failure cases: **0** across **0** backend receivers
- Findings resolved by the current worktree: **92**
- Runtime-blocked candidates retained separately: **0**
- Static JSX candidates (upper bound, not visible total): **847**
- Runtime-visible semantic definitions captured: **1338** across **42** role/viewport/route surfaces

## PR scope

- Local base/head: `main` -> `codex/ivisit-console-revamp-checkpoint-20260707`
- Commits ahead/behind: 489/0
- Committed diff: 553 files, 150106 insertions, 45212 deletions
- Worktree: 1 tracked files changed and 0 untracked files
- Product worktree unchanged during audit: true
- Audit harness unchanged during audit: true
- Audit files already tracked at capture: 32
- Local read-only Git snapshot. No fetch, checkout, staging, commit, push, or ref mutation was performed.

Failure-class totals are non-exclusive because one action can fail in more than one way:

- accept_invalid_payload: 0
- browser_error: 0
- conditional_failure: 0
- do_nothing: 0
- fail_valid_payload: 0
- incorrect_crud_payload: 0
- mutate_wrong_row_fields: 0
- send_no_backend_request: 0
- stale_ui: 0
- wrong_destination: 0

## Evidence boundary

- Runtime-confirmed cases: 0
- Source/receiver-confirmed cases: 0
- No success toast was accepted as mutation proof.
- Live mutation was not performed where real patient or financial data, trigger side effects, or cleanup uncertainty made it unsafe.
- Cleanup verification: not applicable because no mutation probe executed.
- Auth, Storage, Edge, email, and payment side effects are not claimed as verified unless explicitly named by evidence.

## Role storage states

- unauthenticated: available
- admin: available
- org_admin: blocked - No approved proof credentials; Auth user creation is forbidden.
- provider: blocked - No approved proof credentials; Auth user creation is forbidden.
- sponsor: blocked - No approved proof credentials; Auth user creation is forbidden.
- viewer: blocked - No approved proof credentials; Auth user creation is forbidden.

## Artifacts

- `audit/action-ledger.json` - sanitized inventory plus active, resolved, and blocked findings.
- `audit/payload-matrix.json` - per-action payload-case evidence without provenance promotion.
- `audit/results/raw-results.json` - structured synthesis and input provenance.
- `audit/results/failures.csv` - one row per active confirmed failure case.
- `audit/cleanup-ledger.json` - cleanup applicability and bounded side-effect evidence.