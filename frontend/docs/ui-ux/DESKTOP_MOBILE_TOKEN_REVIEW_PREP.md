---
status: prep / review-only (no decision, no source edit)
owner: shared (desktop lane + mobile lane)
created: 2026-07-08
purpose: Pre-read for the joint desktop↔mobile design-token alignment review.
sources:
  - src/index.css (canonical token owner — :root light + .dark)
  - tailwind.config.js (token → utility mapping)
  - docs/design-system/MOBILE_DESIGN_SYSTEM.md (mobile lane target)
  - docs/design-system/CONSOLE_DESIGN_SYSTEM_FROM_APP.md (ivisit-app extraction)
  - docs/ui-ux/UIUX_REVAMP_PROCESS_AND_LESSONS.md (Mobile lessons 9–13)
  - docs/ui-ux/MANAGEMENT_PAGE_STANDARDS.md §0 (desktop canon colour coding)
---

# Desktop ↔ Mobile Token Alignment — Review Prep

> **This is a prep/pre-read, not a decision.** It inventories the *shared* tokens in
> `src/index.css`, states where the desktop lane and mobile lane already agree, and isolates
> the few places they DISAGREE so the joint review can decide. It proposes **options** (never a
> pick) for the one real defect (`--card` dark inversion). **No source is changed here.**
> Because `index.css` is shared by both lanes, every token change below is a **joint edit**.

---

## 0. TL;DR (biggest agreements / disagreements)

- ✅ **Radius ladder is fully aligned** across all three sources (console `index.css`, the app
  extraction, and the mobile spec): `sheet 44 · modal 38 · card 30 · inner 22 · button 20 ·
  icon 14 · pill 999`. No action needed — just lock it.
- ✅ **Red-token discipline is a shared agreement.** Both lanes independently discovered that
  `primary / secondary / success / warning / info / accent` **all collapse to brand red**, and
  both route non-danger state through **literal raw hues** (desktop: sky/emerald/amber/rose/
  violet/cyan; mobile: `constants/vitalTracks.js`). The open question is only *whether to fix
  the footgun tokens at source or keep relying on discipline.*
- 🔴 **`--card` dark inversion is the one real defect** and the headline decision: dark `--card`
  (`0 0% 3%`) is **darker** than dark `--background` (`224 41% 7%`), so an "elevated" card
  recedes in dark; in light it is only ~2% off, so it barely lifts. **No single neutral fill
  lifts in both modes** — this is a token defect, not a per-page bug.
- 🟠 **Elevation is NOT tokenized in a shared way.** The `--shadow-*` variables in `index.css`
  are the deprecated neon-era scale (`--shadow-premium/-glow` are outright banned); **both lanes
  hard-code inline arbitrary shadows instead**, and they use *different* values. Only
  `--chrome-float` is a genuinely shared elevation token.
- 🟠 **Light `--card` is cold pure-white; the app wants a warm tint** (`#F3E7E7`). A directional
  lift exists (100% > 98% bg) but it is weak and it drops the app's warmth. Secondary decision.
- 🟢 **`--chrome-glass` / `chrome-float` (the frosted-chrome recipe) is a clean shared win** —
  both lanes use the same one recipe; nothing to reconcile.

---

## 1. Shared-token inventory

Legend: **Agree** = desktop value already matches what the mobile lane needs; **DISAGREE** =
the two lanes want different behaviour / a value is defective and must be decided jointly.

### 1a. Colour tokens

| Token | Desktop light (`:root`) | Desktop dark (`.dark`) | What mobile expects/needs | Verdict | Note |
|---|---|---|---|---|---|
| `--background` | `210 40% 98%` | `224 41% 7%` (#0B0F1A navy) | same navy ground; page bg is calm `bg-background` + optional atlas wash | **Agree** | Hue-bearing navy in dark, near-white in light. Fine. |
| `--foreground` | `0 0% 3.9%` | `0 0% 100%` | same | **Agree** | — |
| `--card` | `0 0% 100%` (pure white, **neutral**) | `0 0% 3%` (**darker than bg**, neutral) | an elevated content fill that is **lighter than `--background` in BOTH modes**, ideally keeping the navy hue | **DISAGREE** | See §2. Dark value is inverted (defect); light value lifts only ~2% and drops the app's warm tint. |
| `--card-foreground` | `0 0% 3.9%` | `0 0% 100%` | same | **Agree** | — |
| `--muted` | `210 30% 92%` (**darker** than bg) | `224 41% 14%` (**lighter** than bg) | mobile content commonly uses `bg-muted/22–50` as an opaque surface | ◐ **Watch** | `--muted` moves *opposite* to `--card`: recessed in light, raised in dark. In dark it (14%) actually lifts correctly — which is why mobile leans on `bg-muted/40`. Any `--card` fix should stay consistent with this ladder. |
| `--muted-foreground` | `0 0% 35%` | `0 0% 69%` | same | **Agree** | — |
| `--border` | `0 0% 92%` | `0 0% 16%` | **borderless canon** — both lanes ban drawn borders; token only survives for shadcn `* { @apply border-border }` default | ◐ **Vestigial** | Kept for shadcn base reset; neither lane draws with it. Not a conflict, but flag: it is a legacy relic under a borderless canon. |
| `--primary` | `357 74% 26%` (#86100E crimson) | `357 74% 26%` | one loud brand/action colour — same | **Agree** | The single action colour, both lanes. |
| `--secondary` | `357 74% 36%` (#B71C1C) | `357 74% 36%` | avoid for non-danger (it is red) | **Agree (avoid)** | Resolves to red — see §4. |
| `--destructive` | `0 84% 60%` (bright red) | `0 84% 60%` | danger/error only — same | **Agree** | Distinct brighter red; the *sanctioned* danger red in both lanes. |
| `--success` | `357 74% 36%` (**RED**) | `357 74% 36%` (**RED**) | must NOT be used for "done/all-clear" (mobile uses emerald `#047857`) | **Agree (avoid)** | Footgun — see §4. |
| `--warning` | `357 74% 36%` (**RED**) | `357 74% 36%` (**RED**) | must NOT be used (mobile uses amber `#B45309`) | **Agree (avoid)** | Footgun — see §4. |
| `--info` | `357 74% 26%` (**RED**) | `357 74% 26%` (**RED**) | must NOT be used (mobile uses sky `#0284C7` / cyan `#0891B2`) | **Agree (avoid)** | Footgun — see §4. |
| `--accent` | `357 74% 26%` (**RED**) | `357 74% 26%` (**RED**) | avoid for non-brand accent | **Agree (avoid)** | Also collapses to brand red. |
| `--ring` | `357 74% 26%` (**RED**) | `357 74% 26%` | focus ring — but borderless canon bans `ring-*`; scrollbar thumb uses `--primary` | ◐ **Watch** | Red focus ring is a footgun where any `ring`/focus outline survives (lesson #3 fixed a red focus ring). |
| `--chart-1..5` | crimson→red ramp (`357 74% 26/36`, `0 70/84%`, `15 80%`) | brighter same ramp | analytics only; mobile analytics reads them | ◐ **Watch** | All-red chart ramp = poor categorical separation; likely wants the literal palette too (out of core scope, flag only). |

### 1b. Radius ladder

| Token | `index.css` | App extraction (`CONSOLE_DESIGN_SYSTEM_FROM_APP` §3) | Mobile spec (`MOBILE_DESIGN_SYSTEM` §1) | Verdict |
|---|---|---|---|---|
| `--radius-sheet` | `44px` | `44px` | `44` | **Agree** |
| `--radius-modal` | `38px` | `38px` | `38` | **Agree** |
| `--radius-card` | `30px` | `30px` | `30` | **Agree** |
| `--radius-inner` | `22px` | `22px` | `22` | **Agree** |
| `--radius-button` | `20px` | `20px` | `20` | **Agree** |
| `--radius-icon` | `14px` | `14px` | `14` | **Agree** |
| `--radius-pill` | `999px` | `999px` | `999` | **Agree** |
| `--squircle` | `var(--radius-card)` = 30 | — (alias intent) | squircle intent | **Agree** |
| `--radius` (shadcn) | `1.75rem` (28px) → `rounded-{lg,md,sm}` = 28/26/24 | not part of the app ladder | not referenced by mobile | ◐ **Watch** | Legacy shadcn radii live *outside* the semantic ladder. Both lanes' hardgates reject `rounded-lg/md/sm` in revamp files, so this only affects un-migrated shadcn primitives. Not a conflict; note for eventual cleanup. |

Mapping in `tailwind.config.js` is correct and 1:1: `rounded-{sheet,card,inner,icon,button,pill,modal,squircle}` → the tokens above. **Radius needs no reconciliation** — only a lock.

### 1c. Elevation / shadow

| Token / usage | `index.css` value | Used by desktop canon? | Used by mobile spec? | Verdict |
|---|---|---|---|---|
| `--shadow-sm/md/lg/xl` | `0 1px 3px /0.04` … `0 20px 40px /0.12` (light); dark variants | **No** — desktop canon (`MANAGEMENT_PAGE_STANDARDS §0`) hard-codes its own inline scale (e1 `0_1px_3px/0.05`, e2 `0_4px_12px/0.07`, e2-strong `0_6px_16px/0.12`, e3 `0_12px_32px/0.10`) | **No** — mobile spec uses its own inline (row `0 4px 10px/0.03`, card `0 22px 64px/0.14`) | **DISAGREE (unshared)** | Three parallel elevation scales; **none consumes the `--shadow-*` vars.** Prime candidate to tokenize jointly. |
| `--shadow-glow` / `--shadow-premium` | colored glows (`primary/0.15`, `#86100E/0.15`) | **Banned** (§0 "no colored glows") | Banned (borderless/no-glow) | **Agree (delete)** | Deprecated neon-era; both lanes ban. Safe to retire. |
| `--chrome-float` / `-strong` | `0 14px 40px rgba(15,23,42,0.14)` (light); `0 14px 40px rgba(0,0,0,0.45)` (dark) | Yes (via `chrome-glass`) | Yes (spec §1 lists `chrome-float`) | **Agree** | The one genuinely shared elevation token — keep. |

**Takeaway:** elevation is the least-aligned axis. The radius ladder proves a shared token set is
achievable; elevation should get the same treatment (a small shared `--e1/-e2/-e3` scale) so the
two lanes stop hard-coding divergent arbitrary shadows.

---

## 2. The `--card` inversion (headline decision)

### 2.1 State it precisely

| Mode | `--background` | `--card` | Relationship | Consequence |
|---|---|---|---|---|
| Light | `210 40% 98%` (L≈98) | `0 0% 100%` (L=100) | card **+2 L**, but **cold/neutral** (drops hue) vs a **warm** app card | Card lifts, but *weakly* and *coldly* — the app wants warm `#F3E7E7`. |
| Dark | `224 41% 7%` (L=7, navy) | `0 0% 3%` (L=3, neutral black) | card **−4 L**, and **desaturated** (no navy hue) | Card **recedes** — an "elevated" surface is darker than the ground. **Inverted.** |

The core fact (lesson #9): **there is no single neutral fill that lifts in both modes.** A light
raise wants a value *below* white-ish ground going *up*; a dark raise wants a value *above* the
navy ground going *up*; a fixed neutral like `0 0% 3%` can only satisfy one direction. The mobile
lane's verdict is explicit: *"fix at the token — the elevated surface must be lighter than the
ground in both modes."*

### 2.2 Blast radius (which surfaces rely on `--card` / `bg-card`)

`bg-card` (incl. `bg-card/NN`) appears in **~219 usages across ~63 files.** Desktop surfaces that
lean on it for separation:
- **Handled sheet** — `rounded-t-sheet bg-card/68 … backdrop-blur-2xl dark:bg-card/50` (the
  canonical list surface; `MANAGEMENT_PAGE_STANDARDS §1`).
- **State/KPI tiles** — `bg-card/65` (dark override `bg-white/[0.055]`).
- **DetailRail / context panels** — `AmbulancesPanel`, `DoctorsPanel`, `WalletPanel`, `MapPanel`.
- **Chrome & shared primitives** — `ConsoleModuleRail`, `NotificationCenter`/`NotificationCard`,
  shadcn `ui/card.jsx`, most modals (`DoctorModal`, `AmbulanceModal`, `HospitalModal`, `GlobalFinancialModals`).
- **Role homes / dashboards** — `BentoHome` (24), `Analytics` (28), `AdminHome`, `OrgAdminHome`, etc.

**Mobile already works around the dark inversion** with mode-aware films rather than `bg-card`,
e.g. `MobileMetricList` rows: `bg-card dark:bg-white/[0.055]` (and `dark:bg-white/[0.08]` when
expanded). Same pattern in `MobileKPIStrip`, `MobileWallet`, `MobileSupportTickets`,
`MobileAnalytics`. **A correct dark `--card` would let the mobile lane drop those
`dark:bg-white/[…]` overrides** and let desktop drop its `dark:bg-card/50` compensation.

### 2.3 Proposed dark `--card` values — OPTIONS ONLY (decide jointly)

Constraints all options honour: **(a) L > 7** (lighter than dark `--background`); **(b) keep the
navy hue ~224** so the card doesn't desaturate to the flat neutral-black it is today; **(c)** sit
sensibly in the ladder relative to `--muted` (dark = `224 41% 14%`).

| Option | Proposed dark `--card` | Reasoning | Trade-off |
|---|---|---|---|
| **A — minimal navy lift** | `224 41% 11%` | +4 L over ground, same hue/sat; tucks just *under* `--muted` (14) → clean 3-step ladder ground 7 < card 11 < muted 14 | Subtle; may still feel close to ground on dim displays. Safest / calmest. |
| **B — firm lift (≈muted)** | `224 40% 13%` | Clear separation; card reads unmistakably "raised" | Converges card ≈ muted → loses the card/muted distinction; the `bg-muted` content surface and `bg-card` surface would look nearly identical. |
| **C — slightly desaturated navy** | `222 30% 10%` | +3 L, gentler blue so a full-bleed card doesn't read too saturated over dense content | Less "navy character"; a compromise if 41% sat looks too blue at card scale. |

*(Not proposing a light-mode `--card` change here — see §5 open Q on the app's warm `#F3E7E7`
tint. Whatever is chosen, keep light `--card` ≥ `--background` so it still lifts.)*

---

## 3. Radius — is the desktop squircle ladder aligned?

**Yes, fully.** The desktop `--radius-*` ladder in `index.css` is byte-for-byte the app's
extracted ladder (`CONSOLE_DESIGN_SYSTEM_FROM_APP §3`: sheet 44 / card 30 / inner 22 / icon 14 /
button 20 / pill 999 / modal 38) and the mobile spec's ladder (`MOBILE_DESIGN_SYSTEM §1`). The task
prompt's "30/22/44" shorthand = card/inner/sheet, all present and matching. `tailwind.config.js`
maps them 1:1 to `rounded-{…}` with the same fallbacks.

**Only flag:** the shadcn `--radius: 1.75rem` (28px) driving `rounded-{lg,md,sm}` is a *separate,
legacy* radius family outside the semantic ladder. Both hardgates reject those utilities in revamp
files, so it only lingers in un-migrated shadcn primitives. Not a desktop↔mobile conflict — note it
for eventual cleanup, not for this review's decision set.

---

## 4. Red-token family — confirmation

**Confirmed:** in *both* light and dark, these all resolve to brand crimson/red:

| Token | Value (both modes unless noted) | Reads as |
|---|---|---|
| `--primary` | `357 74% 26%` | crimson `#86100E` (the one action colour) |
| `--secondary` | `357 74% 36%` | red `#B71C1C` |
| `--accent` | `357 74% 26%` | crimson |
| `--success` | `357 74% 36%` | **red** (not green) |
| `--warning` | `357 74% 36%` | **red** (not amber) |
| `--info` | `357 74% 26%` | **red** (not blue) |
| `--ring` | `357 74% 26%` | red |
| `--destructive` | `0 84% 60%` | bright danger red (the sanctioned one) |

So `success / warning / info` (plus `accent`, `ring`) are **traps**: a well-meaning
`text-success` / `bg-warning` renders red, not green/amber. `--destructive` is the only
*intended* red, reserved for danger.

**Both lanes already avoid them for non-danger** — this is a genuine agreement:
- **Desktop:** `MANAGEMENT_PAGE_STANDARDS §0` ("No red except danger") + lesson #3 ("the red-token
  trap") → literal palette **sky / emerald / amber / rose / violet / cyan** or neutral; only
  `--destructive` for danger. Canonical state→colour table lives in §0 (pending=red, in_progress=
  amber, accepted=cyan, arrived=sky, completed/clear=emerald, cancelled/all=neutral,
  critical=rose).
- **Mobile:** `MOBILE_DESIGN_SYSTEM §1` ("Status hues (raw)") → `constants/vitalTracks.js` cyan
  `#0891B2` / amber `#B45309` / emerald `#047857` / sky `#0284C7` / slate, via `resolveVital` /
  `statusPill`, precisely *because* "semantic tokens collapse to red."

The two palettes are compatible (same families; mobile's hues are slightly darker/AA-tuned).
The only open decision is direction (see §5).

---

## 5. Open questions for the joint review

1. **Dark `--card`:** pick A / B / C from §2.3 (or another) — the one blocking token defect. Does
   the review want a distinct **card < muted** ladder (Option A/C) or accept **card ≈ muted**
   (Option B)?
2. **Light `--card`:** keep cold pure-white `0 0% 100%`, or adopt the app's **warm `#F3E7E7`**
   tint (≈ `357 40% 93%`) for app parity? (Affects every light-mode card surface.)
3. **Red footgun tokens:** *fix at source* (re-point `--success`→emerald, `--warning`→amber,
   `--info`→sky, so the utilities stop lying) **or** keep them red-by-design and rely on lane
   discipline + rendered-proof checks? If fixed, audit shadcn variants / any `badge`/`alert` that
   reference them first.
4. **Shared elevation scale:** promote a single `--e1/-e2/-e3` (+ CTA) token set both lanes
   consume, replacing the two divergent inline scales? Retire `--shadow-premium/-glow` while doing
   it. What exact values — desktop's (`/0.05–0.10`) or a blend with mobile's (`/0.03`, `/0.14`)?
5. **Gutter token (lesson #11):** promote the ad-hoc `px-2` (8px) mobile gutter to a named
   `--gutter` token in the joint pass so chrome + content share one edge. Does desktop want the
   same token?
6. **Spacing/type tokenization (lessons 11–12, mobile §1):** spacing is "already on the 4px
   Tailwind scale" per mobile but not a named token; typography is still inline. Tokenize now or
   defer? (Lower priority than `--card`.)
7. **`--ring` / focus colour:** under a borderless, `ring-*`-banned canon, should `--ring` stay
   red or move to neutral to kill the recurring red-focus-ring footgun?
8. **Chart ramp:** the all-red `--chart-1..5` ramp gives poor categorical separation — re-point to
   the literal palette? (Analytics-only; flag, likely its own pass.)

---

## 6. Blast-radius note (why every change here is a JOINT edit)

`src/index.css` is the **single canonical token owner** consumed by **both lanes**. Any token
edit below is therefore a joint change touching desktop *and* mobile simultaneously:

| Token changed | Surfaces / files touched (indicative) |
|---|---|
| **`--card`** (dark and/or light) | ~219 `bg-card` usages across ~63 files: handled sheet, KPI tiles, DetailRail + all context panels (`AmbulancesPanel`/`DoctorsPanel`/`WalletPanel`/`MapPanel`), `ConsoleModuleRail`, `NotificationCenter`/`Card`, shadcn `ui/card.jsx`, all modals, role homes (`BentoHome`/`Analytics`/`AdminHome`/`OrgAdminHome`), **and** the mobile films (`MobileMetricList`, `MobileKPIStrip`, `MobileWallet`, `MobileSupportTickets`, `MobileAnalytics`) — which could then **drop** their `dark:bg-white/[…]` / `dark:bg-card/50` overrides. |
| **`--success/-warning/-info/-accent/-ring`** | Any `text-*`/`bg-*`/`ring-*` utility referencing them, all shadcn variants (`badge`, `alert`, button variants) that map to them, and both lanes' status surfaces. Must be re-verified by *rendered proof* (hardgate does not see colour). |
| **`--radius-*`** | Every `rounded-{sheet,card,inner,icon,button,pill,modal}` across the whole app + hardgate expectations. (No change proposed — lock only.) |
| **`--shadow-*` / new `--e*`** | Currently unused by canon, but introducing a shared scale means sweeping the inline `shadow-[…]` usages in both lanes' pages/primitives onto the tokens. |
| **`--chrome-*`** | `chrome-glass` / `chrome-glass-strong` on all chrome (header, nav island, sheets, panels) — shared, no change proposed. |

**Process implication:** treat any accepted change as a coordinated commit across both lanes, run
`node scripts/check-ui-surface-hardgate.js --strict-radius` on touched files, verify colour by
**rendering** (light *and* dark), and run the mojibake check on `index.css`. Because the concurrent
lane edits the working tree, coordinate the `index.css` edit so it is not clobbered mid-flight
(lesson #4).
