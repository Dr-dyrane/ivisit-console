# iVisit Console Runtime CRUD And Interaction Audit

Generated: 2026-07-15T12:32:55.957Z
Run: audit-20260715122419-667ee89f
Input fingerprint: 2519f307cdabea714213da777ca711eabebc3035994b45855a5556436ee48492

## Exact totals

- Confirmed affected action definitions: **0**
- Confirmed failure cases: **0**
- Mounted UI failure cases: **0** across **0** mounted action definitions
- Receiver-only failure cases: **0** across **0** backend receivers
- Findings resolved by the current worktree: **92**
- Runtime-blocked candidates retained separately: **0**
- Static JSX candidates (upper bound, not visible total): **905**
- Runtime-visible semantic definitions captured: **1344** across **42** role/viewport/route surfaces

## PR scope

- Local base/head: `main` -> `codex/tablet-production-pass`
- Commits ahead/behind: 2/0
- Committed diff: 43 files, 1405 insertions, 195 deletions
- Worktree: 57 tracked files changed and 11 untracked files
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