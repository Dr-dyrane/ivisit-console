# Mobile page close-out checklist — the harness the linter can't be

> The static half of the harness (`scripts/check-mobile-grammar.js`) enforces GRAMMAR
> composition at commit. This doc is the BEHAVIORAL half: the runtime invariants no
> static tool can see. Both are mandatory to close a mobile page. Born 2026-07-10 from
> the Hospitals close-out, where 8 canon failures survived a green suite because the
> gates were all static (Lesson 26: the fine things live in states and behavior).
>
> **How to run it:** connect the browser (Chrome MCP) to the live page and drive EACH
> row through the real UI — not by reading code. Record pass/fail per row in the page's
> section of `docs/audit/FEATURE_PARITY_VS_MAIN.md`. A row you didn't drive is a row that
> didn't pass.

---

## Gate 0 — static (must be green before you touch the browser)

- [ ] `node scripts/check-mobile-grammar.js` — 0 fatal (page has a manifest entry + its
      tier's anatomy; no off-grammar composition).
- [ ] `node scripts/donor-diff.js <donor> <page> --universe <kit files>` — every MISSING
      className/component/string is adopt-or-record-divergence; every EXCEEDING item is a
      superset-drift check (both directions, Lesson 26d).
- [ ] contract suite green · mojibake clean · strict-radius hardgate clean.

## Gate 1 — behavioral matrix (drive each on the LIVE page)

The invariants the static harness is BLIND to. Each maps to a Hospitals-class bug that
shipped green.

- [ ] **Count integrity (§5).** Select each KPI chip; the heading count must track the
      ACTIVE scope, never the raw total. (Hospitals shipped "1514 hospitals" over a
      filtered list; the fix reads "1417 hospitals" under Available.)
- [ ] **Load-more APPENDS, not replaces.** Trigger load-more; row count must GROW
      (21→40…), old rows still present. (The RQ window swaps rows without an accumulator.)
- [ ] **Scope-change is clean (placeholder poisoning).** Search a no-match term → honest
      empty + reason + recovery, NOT stale rows under a "0" heading. Recover → full list
      returns. (RQ placeholderData serves the previous scope's rows into the fresh store.)
- [ ] **Filter-trigger truth.** Idle / open (sheet up) / filtered (a filter committed) —
      the trigger's `data-state` must match reality, not sit idle while filtered.
- [ ] **Empty state has a reason + a way out.** search/filtered/empty each give distinct
      copy and a working Clear/Reset (never a bare "No X found" dead-end).
- [ ] **Skeleton replaces in place.** Reload AND bottom-nav navigate (different load
      paths, Lesson 16) — the group-shaped skeleton shows on BOTH, content swaps with no
      top-to-bottom assemble, no layout jump.
- [ ] **Refetch = Updating pill, never a re-skeleton.** KPI switch / search / pull-refresh
      keep rows on screen with the pill; the list never blanks to skeleton.
- [ ] **Degraded state.** Force a refetch error (or trust the wiring) — banner over stale
      rows + retry; error-aware empty copy; NEVER raw DB/PostgREST text.
- [ ] **Deep link.** `?id=<display_id>` AND `?id=<uuid>` both resolve to the record
      (auto-open sheet/modal), no crash.
- [ ] **Dock + FAB.** Left island pill + right route FAB (never a centered lone pill); the
      FAB does REAL work or is honestly gated with a reason; the 4th pill morphs correctly.

## Gate 2 — data-fitting (the row is scented to the DATA, not the schema)

The class no tool judges: WHICH field to render. (Hospitals led rows with "standard · 0
beds" — a constant and a dead zero — while address never appeared.)

- [ ] Row primary = the record's real identity (name), `line-clamp` safe.
- [ ] Row meta leads with the most DISCRIMINATING populated field for THIS data — inspect
      the live distribution, don't trust the schema's hopes (a column that's null/constant
      on most rows is not a meta line).
- [ ] Trailing slot carries the record's honest TIME axis (feed = event time; directory =
      data freshness — staleness is the operator's risk).
- [ ] Native reads surfaced where they exist (tel:, maps, display_id-as-label — never a
      truncated UUID as identity).
- [ ] Gated/absent data reads honestly (null hidden, not coerced to a lying 0; a default
      value not claimed as truth).

## Gate 3 — record + close

- [ ] Pre-rebuild changelog + this matrix's results in `FEATURE_PARITY_VS_MAIN.md`.
- [ ] Divergences from the donor RECORDED with a domain reason (never omission).
- [ ] Push at the checkpoint; ledger the close + any handed-off items.

---

### Why this can't be a script

Every Gate-1/2 row is a RUNTIME or JUDGMENT invariant: count-scope depends on live data,
append depends on RQ cache behavior, "most discriminating field" depends on the actual row
distribution. A static linter sees tokens, not values or behavior. The linter kills the
grammar-composition miss class mechanically; this checklist is the disciplined form of the
one irreducible tool — the live click-test — so it runs BY DEFAULT at close, not only when
the user asks. Together they close the Lesson 26 gap: static for structure, driven-live for
behavior and data-fit.
