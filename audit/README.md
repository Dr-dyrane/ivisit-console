# Console PR Audit Harness

This harness inventories mounted Console actions and synthesizes read-only source,
runtime, and cleanup evidence for PR review. It must not create Auth users, mutate
domain rows, send payments or email, alter Storage, or apply database migrations.

## Run

From `audit/`:

```powershell
npm run audit
```

The full command opens one traceable audit run, runs redaction tests, static discovery,
authenticated desktop and mobile inventory, public-route inventory, the browser-blocked
known-failure proof, sanitization, bounded cleanup evidence, read-only Git scope discovery,
discovery synthesis, final evidence synthesis, and fail-closed artifact validation.

The final validator requires one shared run ID, stable product and harness fingerprints,
matching counts and arrays, disjoint active/resolved/blocked states, per-action payload
provenance, bounded cleanup language, and no raw email, telephone, UUID, token, or runtime
record identity in the six review artifacts. If source or harness files change after the run
starts, discard the run and start again.

To resume selected runtime lanes without repeating completed work:

```powershell
node scripts/run-runtime-inventory.cjs admin-mobile unauthenticated-desktop
```

Available lanes are `admin-desktop`, `admin-mobile`, and
`unauthenticated-desktop`. Other roles remain blocked until approved proof
credentials exist; the harness never creates them.

## Review Artifacts

- `action-ledger.json`: inventory counts plus active, resolved, and blocked findings.
- `payload-matrix.json`: per-action payload-case evidence without case-wide provenance promotion.
- `results/raw-results.json`: structured final synthesis.
- `results/summary.md`: concise PR-facing totals and evidence boundary.
- `results/failures.csv`: one row per currently confirmed failure case.
- `cleanup-ledger.json`: cleanup applicability and explicitly bounded side-effect evidence.

Raw route inventories, auth storage state, screenshots, traces, videos, HTML reports,
and Playwright reporter output are generated evidence and are intentionally ignored.
The committed artifacts must pass redaction and secret scans before review.

## Finding States

- `source_confirmed` or `runtime_confirmed`: current defect evidence.
- `resolved`: historical finding disproved or fixed in the current worktree.
- `runtime_blocked`: plausible mechanism that still needs a safe synthetic proof path.

Source findings live in `results/source-findings.cjs`. Revalidate that catalog against
the current worktree before regenerating final totals; never carry a moving-baseline
finding into a PR only because it appeared in an older report.
