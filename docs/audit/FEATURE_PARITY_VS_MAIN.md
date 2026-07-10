# Feature parity vs `main` — the post-revamp drop audit

> Standing per-page step (user decision 2026-07-09): after a page's revamp lands, diff the
> page family against `main` (= the preservation baseline `f31f29f`) at the FEATURE level to
> catch anything dropped unintentionally, and put every intentional drop on the record.
>
> Method (cheap, identifier-level):
> ```bash
> git show main:frontend/<file> | grep -oE "const handle[A-Za-z]+|CustomEvent\('[a-zA-Z]+'\)|export (async )?(function|const) [a-zA-Z]+|aria-label=\"[^\"]+\"" | sort -u > /tmp/main_ids
> grep -oE "<same>" <file> | sort -u > /tmp/head_ids
> comm -23 /tmp/main_ids /tmp/head_ids   # in main, gone from HEAD -> classify each
> ```
> Classify every disappearance as INTENTIONAL (cite the contract pin / ledger row / arbitration)
> or UNINTENTIONAL (fix it). A drop with no citation is unintentional by definition.

---

## Visits (Page 7) — audited 2026-07-09, post both-lane revamp

Files diffed: `VisitsPage.jsx`, `MobileVisits.jsx`, `VisitModal.jsx`,
`visitsService.js` (HEAD `5e905c18`-era vs `main`/`f31f29f`).

### Dropped INTENTIONALLY (all cited)
| What (from main) | Why / where recorded |
|---|---|
| `handleDelete`, `handleBulkDelete`, `handleSelect`, `handleSelectAll` | Fail-closed writes: no delete/bulk on Visits. Contract-pinned (`canDelete={false}`, `selectionEnabled={false}`, `not.toContain('<BulkActionBar')`) + ledger row-104 shared contract item 4. |
| ViewToggle + `<VisitListView>`/`<VisitTableView>` renders | §1.5 one-canonical-render conversion, "Explicitly converted 2026-07-09" comment in `VisitsPage.contract.test.js`; legacy views retained unimported as chrome-lint targets. |
| Static chip aria-labels ("Filter by scheduled visits" etc.) | Superseded, not lost: chips now render via the shared `console/KpiStrip`, which bakes `aria-pressed` + `aria-label={label}: {count}` (richer than main's). |

### Dropped UNINTENTIONALLY
**None found** at identifier level (handlers, events, exports, aria-labels) across the four files.

### Added since main (highlights)
`getVisitsPageData` single projection · keyboard list nav (`handleListKeyDown`) ·
clear-search / statistics a11y labels on mobile · the console DS components
(`KpiStrip`/`SignalPanel`/`ActivitySheet`/`WorkspaceStage`) composed on the page.

### Verdict
PASS — zero unintentional drops. Every removal is contract-pinned or ledgered.
