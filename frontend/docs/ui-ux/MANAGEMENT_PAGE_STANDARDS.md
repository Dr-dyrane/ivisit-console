# Management Page & Context Panel Standards
**Version 2.0** — supersedes v1.0 (the pre-revamp standard).

> ⚠️ **v1.0 is retired.** The old version prescribed drawn borders (`border-*`,
> `ring-2`), `uppercase tracking-widest`, `geo-*` / `squircle-{size}` shapes,
> `shadow-premium` / `shadow-2xl`, and the `success` / `warning` / `info` semantic
> tokens. **All of those are now banned.** In this theme `--primary` / `--secondary`
> / `--info` / `--success` / `--warning` ALL resolve to red, so the old "semantic
> color" guidance made every state red. This version reflects the actual gold
> standard that the page revamp is built on.

The single source of truth is the **Design System Canon** in
[`tools/automation/AGENT_HANDSHAKE.md`](../../../tools/automation/AGENT_HANDSHAKE.md)
and the reference implementation
[`frontend/src/components/pages/EmergencyRequestsPage.jsx`](../../src/components/pages/EmergencyRequestsPage.jsx)
(the Requests canon). When this doc and the canon disagree, the canon wins.

---

## 0. Non-negotiable canon (read first)

- **No borders. No rings. No hairlines. Ever.** Zero `border` / `border-*` /
  `ring-*` / `outline-*` / `divide-*` / `*-px` / `0.5px` / `1px`. Depth comes from
  **tone** (`bg-card/NN`, `bg-muted/NN`), **soft arbitrary shadows**
  (`shadow-[0_24px_70px_rgb(0_0_0/0.16)]`), **`backdrop-blur*`**, and **spacing** —
  never a drawn line.
- **Canonical squircle radius only.** `rounded-{sheet,card,inner,icon,button,pill,modal,squircle}`
  (and directional `rounded-t-<token>` etc.). NEVER `rounded-2xl` / `xl` / `lg` /
  `3xl` / `full` / `rounded-[Npx]`. Every management page must pass
  `node scripts/check-ui-surface-hardgate.js --strict-radius <file>`.
- **No red except danger.** Ordinary/positive/informational state uses the **literal
  palette** (sky / emerald / amber / rose / violet / cyan) or neutral (`foreground` /
  `muted`). Only `--destructive` (bright danger red) is allowed, and only for genuine
  danger/destructive/error.
- **No legacy chrome utilities:** no `glass-card*`, `geo-*`, `squircle-{size}`,
  `hover-glow*`, `hover-lift`, `bg-orb`, `pulse-dot`, `shadow-2xl` / `shadow-premium`
  / `shadow-glow`, `uppercase`, `tracking-{tighter,wide,widest}`. Glass is manual:
  `bg-card/68 backdrop-blur-2xl`.

Colors are **not** caught by the hardgate — only rendered proof catches a stray red.
Verify visually on a data page.

---

## 1. The data-page "story" (desktop workspace)

A management page is **not** "render a table + KPIs." It tells a story: *survey the
signal → filter → focus one record → see it and act on it.* Copy the shape from
`EmergencyRequestsPage`; do not invent a new one.

```
ConsoleModuleRail │  LEFT column (flex-1)                 │  RIGHT column
   (left nav)     │    SignalPanel                        │    DetailRail
                  │    StateStrip (chips)                 │    (<aside>, focused record)
                  │    Handled sheet → List/Table/Grid    │
```

Top-level wrapper:

```jsx
<div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-stretch">
  <section className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:self-stretch">
    <XSignalPanel … />
    {/* state chips */}
    <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-t-sheet bg-card/68 p-3
                    shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl
                    dark:bg-card/50 md:rounded-sheet">
      {/* drag handle */}
      <div className="mx-auto mb-3 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
      {/* list / table / grid */}
    </div>
  </section>

  <XDetailRail record={focusedX} onView={openModal} />
</div>
```

### 1.1 SignalPanel
`rounded-pill` label chip → big `text-5xl`/`text-6xl` headline (the primary number or
state) → one-line subhead. No borders, no uppercase.

### 1.2 State-chip strip
`rounded-inner` chips for state filters, `rounded-button` icon tiles. Clicking a chip
sets `kpiFilter` and filters the list (the chips ARE the quick filters — no separate
bordered KPI cards).

### 1.3 Handled sheet
The list/table/grid lives inside the glass sheet above (`rounded-t-sheet bg-card/68 …
backdrop-blur-2xl`, `md:rounded-sheet`) with the `rounded-pill` drag handle.

### 1.4 DetailRail — the focused record (this is the "story")
A right-side `<aside>`, **separate from the Context Panel slideout** (§2). Always
present on desktop; it shows the currently focused record.

- **Focus state:** `const [focusedXId, setFocusedXId] = useState(null)` +
  `const focusedX = useMemo(() => list.find(r => r.id === focusedXId) || list[0] || null, [list, focusedXId])`.
  It **defaults to the first record**, so the rail is never empty when data exists.
- **Wiring:** rows/cards call `onFocus={handleFocusX}`; `onView` (open modal) should
  also set focus.
- **Shell (copy verbatim, don't restyle):**
  ```
  relative z-20 mt-auto mb-[calc(13rem+var(--safe-bottom))] rounded-t-sheet
  bg-card/78 p-4 text-foreground shadow-[0_24px_70px_rgb(0_0_0/0.16)]
  backdrop-blur-2xl dark:bg-card/55 md:mx-5 md:mb-5 md:rounded-sheet lg:mt-5
  lg:h-[calc(100dvh-5.5rem)] lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[440px]
  ```
- **Contents:** header + neutral status pill → identity block (icon/avatar tile +
  name + secondary line) → `XDetailLine` rows (`rounded-inner bg-muted/20 p-2.5`, icon
  tile `rounded-button bg-background/45`) → a primary full-width action
  (`rounded-button bg-foreground text-background`) → secondary `XRailButton` (ghost) →
  a `role="note"` read-only hint when writes are gated behind authority
  (`getXActionState`).
- **Empty state:** icon + "No X selected" + "…that match your filters will appear here."
- **Action validity:** compute which actions are legal for the focused record's status
  with a `getXActionState(record)` helper (see `utils/emergencyActions.js`) — the rail
  shows the valid primary action and disabled hints, never a dead button.

Reference rails: `RequestDetailRail` (`EmergencyRequestsPage.jsx`), and the five data
pages — Insurance, Users, Subscriptions, Organizations, Pricing.

---

## 2. Context Panel (right slideout) — separate from the DetailRail

The **Context Panel** (`components/context/XPanel.jsx`, toggled) is a quick-access
control center that publishes route context. It is **not** the DetailRail — the
DetailRail is the always-present focused-record column inside the workspace; the
Context Panel is the toggled slideout.

- **Quick Actions:** 2×2 grid of `motion.button` (`whileTap={{ scale: 0.98 }}`).
  Style with **tone**, not borders: `bg-muted/20 hover:bg-muted/30`, `rounded-button`,
  literal-palette or neutral text. (No `border border-{color}/20`, no `rounded-xl`.)
- **Recent items:** the 3 most recently changed records — `bg-card/60 rounded-card p-3`,
  a small tone dot (not `geo-round`), truncated name, relative time.
- **Stats overview (optional):** simplified counts as tone rows.

---

## 3. Logic & state

- **kpiFilter** drives the state-chip strip (§1.2). **FilterSheet** handles detailed /
  multi-select filters. **Search** debounced across the record's key fields.
- **Data** via the domain hook (`useInsurance`, `useSubscription`, …). **Pagination**
  via `usePagination`. **Real-time** via Supabase `on('postgres_changes')`.
- **Authority-gated writes:** if a surface cannot yet mutate backend truth, disable the
  command, show the reason (`role="note"` / `title=`), and never enable a write path
  the app can't reconcile. No parallel truth.

---

## 4. Full surface (a page is more than the desktop route)

The revamp is the **whole surface**, not just the page component. When you revamp a
data page, bring these to the same canon:

- **Views** (`components/views/XTableView`, `XListView`) — borderless custom grid rows,
  not shadcn `Table`/`Badge` (those inject `border-b` and badge borders the page-source
  hardgate cannot see). Pattern: `rounded-card bg-background/30 p-3` container + CSS-grid
  header/rows (`rounded-inner px-3 py-3 hover:bg-muted/30`) + `rounded-pill` tone badges.
- **Mobile** (`components/mobile/MobileX`) — same tone/radius/no-border canon.
- **Context panel** (`components/context/XPanel`) — §2.
- **Modals** (`components/modals/XModal`) — `ModalShell`, `rounded-modal`, no borders.

Verify each with the hardgate; verify **color** by rendering (the gate does not see red).

---

## 5. Animation
`framer-motion`. `layout` for reordering; entrance
`initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}`; hover `whileHover={{ y: -2 }}`
(not the `hover-lift` class).

---

**Implementation checklist**
1. [ ] `--strict-radius` hardgate passes on the page.
2. [ ] Rendered: zero red outside `--destructive`; zero horizontal overflow.
3. [ ] Two-rail workspace: SignalPanel + state chips + handled sheet (LEFT) │ DetailRail (RIGHT).
4. [ ] DetailRail defaults to first record and updates on row focus.
5. [ ] Writes gated behind authority show a reason, never a dead button.
6. [ ] Views + mobile + context panel + modal brought to the same canon.
7. [ ] Contract test still green.
