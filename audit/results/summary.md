# iVisit Console Runtime CRUD And Interaction Audit

Generated: 2026-07-13T13:08:35.221Z
Run: audit-20260713125750-2ac4a368
Input fingerprint: 6ea4b31db22395f60aff88a103a31f98af51ae1b8fdc5d8949b03a814b50ed49

## Exact totals

- Confirmed affected action definitions: **6**
- Confirmed failure cases: **7**
- Mounted UI failure cases: **2** across **2** mounted action definitions
- Receiver-only failure cases: **5** across **4** backend receivers
- Findings resolved by the current worktree: **75**
- Runtime-blocked candidates retained separately: **9**
- Static JSX candidates (upper bound, not visible total): **847**
- Runtime-visible semantic definitions captured: **1332** across **42** role/viewport/route surfaces

## PR scope

- Local base/head: `main` -> `codex/ivisit-console-revamp-checkpoint-20260707`
- Commits ahead/behind: 485/0
- Committed diff: 517 files, 92114 insertions, 45093 deletions
- Worktree: 0 tracked files changed and 32 untracked files
- Product worktree unchanged during audit: true
- Audit harness unchanged during audit: true
- Audit files already tracked at capture: 0
- Local read-only Git snapshot. No fetch, checkout, staging, commit, push, or ref mutation was performed.

Failure-class totals are non-exclusive because one action can fail in more than one way:

- accept_invalid_payload: 5
- browser_error: 0
- conditional_failure: 6
- do_nothing: 0
- fail_valid_payload: 1
- incorrect_crud_payload: 1
- mutate_wrong_row_fields: 4
- send_no_backend_request: 0
- stale_ui: 2
- wrong_destination: 0

## Evidence boundary

- Runtime-confirmed cases: 0
- Source/receiver-confirmed cases: 7
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