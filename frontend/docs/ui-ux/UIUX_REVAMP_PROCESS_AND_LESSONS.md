# UI/UX Revamp — Process & Lessons

> Living doc for the desktop UI/UX revamp lane. Started 2026-07-08.
> Canon references: [`MANAGEMENT_PAGE_STANDARDS.md`](MANAGEMENT_PAGE_STANDARDS.md) (§0 canon, §1.5 data-render),
> [`CONSOLE_DESIGN_SYSTEM_FROM_APP.md`](../design-system/CONSOLE_DESIGN_SYSTEM_FROM_APP.md) (ivisit-app parity),
> [`PAGE_REVAMP_GATE.md`](../planning/PAGE_REVAMP_GATE.md) (locks),
> data-sync queue: [`DATA_SYNC_REMEDIATION_AUDIT.md`](../database/DATA_SYNC_REMEDIATION_AUDIT.md).

---

## The per-page loop (design → data-sync check → click test)

For **every page** we finish designing, before calling it done:

1. **Design to canon.** Borderless, canonical squircle radii, no red except `--destructive`, the
   reduced HIG elevation scale, ivisit-app surface language. One canonical render (no ViewToggle).
2. **Data-sync check.** Prove `source column → service → hook → UI` for every read/write on the page:
   - Every `.order()`, `.eq()`, `.select()`, `.in()` column MUST exist as a real scalar in
     `src/types/database.ts` (the truth). JSON sub-fields (e.g. `patient_snapshot`) can be *read*
     but **cannot be `.order()`ed / `.eq()`ed** directly.
   - Run the data-contract guardrail: `node scripts/check-data-contract.js`.
   - Validate live when unsure: `supabase db query --linked` (read-only, boundary-safe) — never
     trust static assumptions over the live schema or the user's empirical knowledge.
3. **Click test.** Exercise **every interactive control** and confirm it works (or is honestly
   gated): KPI/state chips (each filter), **sortable column headers** (each one — this is where the
   `requester_name` bug hid), row focus → detail rail, every detail-rail action, pagination
   prev/next, search, filter sheet, every modal open/submit/close. A control that can't work yet
   must be disabled with a reason, never a dead click.
4. **Queue, don't derail.** Any data-sync defect found → log it in `DATA_SYNC_REMEDIATION_AUDIT.md`
   (with symptom, root cause, evidence paths, fix direction) and keep moving on UI/UX. Fix data-sync
   in its own pass.
5. **Verify + commit.** `CI=true npx craco test <files> --watchAll=false` green, `craco build`
   compiles, commit scoped files only.

---

## Lessons (durable)

1. **Test runner.** Always `CI=true npx craco test <file> --watchAll=false`. Raw `npx jest` bypasses
   the CRA/babel transform → `SyntaxError: Cannot use import statement outside a module` and
   `0 tests`. "0 total / parse error" means wrong runner, not a real failure.
2. **Reduced HIG elevation scale.** Depth comes from translucent material (`backdrop-blur`) + tone,
   not heavy diffuse shadows. Three neutral tiers: **e1** `shadow-[0_1px_3px_rgb(0_0_0/0.05)]`,
   **e2** `shadow-[0_4px_12px_rgb(0_0_0/0.07)]`, **e2-strong (CTA)** `shadow-[0_6px_16px_rgb(0_0_0/0.12)]`,
   **e3 (floating)** `shadow-[0_12px_32px_rgb(0_0_0/0.10)]`. No colored glows, no `0_24px_70px`-class.
3. **The red-token trap.** `primary` / `secondary` / `success` / `warning` / `info` ALL resolve to
   red in this theme. Never use them for color. Non-danger → literal palette (sky/emerald/amber/
   rose/violet/cyan) or neutral; only `--destructive` for genuine danger. Colors aren't caught by
   the hardgate — only rendered proof / grep catches a stray red. Recurring fixes this session:
   step tracker, payment-declined card, live dot, focus ring, mobile 'All' chip.
4. **Concurrent-lane discipline.** A second agent lane edits the working tree. Never edit a
   lane-owned **uncommitted** file (`git status` shows `M`) — including test files. Transient
   contract-test failures come from the lane rewriting a file *mid-run*; re-run to confirm before
   diagnosing. Commit only your own scoped files. Check the claim log: `tools/automation/revamp-queue.md`.
5. **Contract-pin discipline.** When you legitimately change a pinned string (a class, a signature),
   update the pin — but ONLY in a test file that is clean/yours, never a lane-owned (`M`) test. If a
   lane-owned test pins something your source change breaks, make the source compatible or report;
   do not edit their test.
6. **Never leak raw DB errors to users.** Route error states show a friendly generic message
   ("… did not load. Try again.") and log the raw error to console only. Surfacing Postgres/SQL text
   is both a UX defect and an info leak.
7. **Canon changes are locked, not just written.** A UI/UX decision becomes canon by (a) documenting
   it in the readable canon (`MANAGEMENT_PAGE_STANDARDS.md`) and (b) locking it with a contract-test
   assertion (the `PAGE_REVAMP_GATE.md` + `PageRevampGate.contract.test.js` pattern).
8. **Parallelize with agents on isolated files.** Independent UI work (e.g. NotificationCenter vs
   the Requests KPI strip) fans out cleanly to subagents; keep commits in the parent (sequential) to
   avoid `.git/index.lock` races with the concurrent lane. For a study/redesign: fan out *read-only*
   study agents (e.g. one on the app's card component, one on its tokens) in parallel, then a build
   agent per isolated file — the parent verifies + commits.

### Mobile lessons

9. **Surface differentiation is FILL/elevation, never shadow (Apple HIG).** iOS grouped lists make the
   *group container* the surface (rounded, translucent/elevated); rows are **transparent**, separated
   only by a slate **hairline** (`bg-[hsl(var(--muted-foreground)/0.18)]`, indented `ml-[62px]` past
   the orb) — not per-row cards, borders, or shadows. Root trap: our `--card` is **inverted in dark**
   (`0 0% 3%` is *darker* than `--background` `224 41% 7%`) and only ~2% off in light, so cards can't
   separate by fill → we leaned on shadows. Fix at the token (elevated surface must be *lighter than
   the ground in both modes*); until then use mode-aware fills (`bg-card` light / `dark:bg-white/[0.06–0.08]`
   film). **Do NOT recolor the page background to fake separation** (that was explicitly rejected).
10. **Match the app's real components, not a re-interpretation.** The mobile list-card canon comes
    from ivisit-app `components/map/history` (`MapHistoryGroup`/`MapHistoryRow`): **recency-bucket**
    grouping (Active now → Upcoming → Today → Yesterday → This week → … → Older), a frosted group panel
    over the map holding transparent rows, and row anatomy: orb (type-tint) · title 15–16/500 ·
    `{type} · {date}` 12/500 · trailing time 12/700 + status pill (by status, 11/700) + chevron. Read
    the sibling repo (`../ivisit-app`) *before* designing a surface — don't invent one.
11. **Deterministic mobile gutter.** `MobilePageShell` shipped a `px-1` that fought pages' `px-0`
    contentClassName (equal specificity → ambiguous cascade), so the nav sat at a different edge than
    the content. Removed `px-1`; horizontal padding is now per-page (`px-2` sections = 8px) and chrome
    aligns to it (nav bar `left-2/right-2`, dock `px-2`, KPI rail `px-2`). Promote to one gutter token
    in the joint token pass.
12. **Flatten single-child wrappers; top padding = nav-row height.** Redundant container divs (the nav
    back-button LEFT group once the avatar moved right; the frosted search-toolbar wrapper) add DOM +
    inset for nothing — remove them and let elements sit directly (`-ml-1` on the back chevron optically
    aligns it with the page heading). Page top padding is the *nav-row height* (~`pt-8`), not more.
13. **Motion + icons.** Entrance = opacity fade + `layout="position"` (position-only reflow) — **never
    scale**: full framer `layout` and a `staggerFadeIn` `scale(0.95)` cause the ugly card "skew" on
    load/reorder. Press 0.96 controls / 0.988 cards; tap ripple only. Icons must match intent + the app
    set: stats/analytics = `BarChart3` (not `Info`); a "new-X" FAB = `Plus` (not `ClipboardCheck`).

---

## Data-sync issues found while doing UI/UX (queue pointer)

Logged in `DATA_SYNC_REMEDIATION_AUDIT.md` §9+ as they surface. Current:
- **`emergency_requests.requester_name` does not exist** — Person-column sort crashes the Requests
  list; raw SQL leaked to UI. (§9, 2026-07-08.)
