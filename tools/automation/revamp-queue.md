# Revamp Work Queue (controller state)

Single source of truth for "what to do next." Each run reads THIS file plus only the
target page's gate section — not the whole 1600-line gate. That is the efficiency win.

**executor** — who can actually finish the item:
- `headless` = the `claude -p` 30-min loop (no browser, no Supabase)
- `browser`  = an interactive Claude session with the Chrome MCP, or a human
- `backend`  = needs Supabase projection/receiver/RLS/RPC/Edge + app-consequence truth (not in this repo)

**status** — `todo` | `in_progress` | `done` | `blocked`

Rule: the headless loop may ONLY pick `todo` + `headless` items. If none remain, it records
"no headless-safe work; browser/backend items pending" in the gate and stops (does not spin,
does not attempt browser/backend work).

---

## Done (admitted)
Today, Requests, Approvals, Staff, Payments, Live Map, Visits, Hospitals, Ambulances,
Support, Health News; Page 24 Not Found (`3dbbff7`), Page 23 Unauthorized (`c6b1330`),
Page 22 Onboarding Success (`efac625`).

## Active queue (priority order)

1. **Page 19 Login** — visual pass + rendered proof
   - executor: `browser` · status: `todo`
   - files: `src/components/pages/LoginPage.jsx` + `LoginPage.contract.test.js` + gate Page 19
   - do: convert any decorative chrome (blur/glow/heavy-shadow/glass, non-canonical radius) to
     calm canonical tokens; keep OAuth/reset/MFA logic + copy. Render `/login` desktop + mobile
     (renders signed-out — fully verifiable). Admit gate Page 19 + test; add LoginPage.jsx to hardgate.
   - note: **highest-value fast win.** headless loop must SKIP (needs browser).

2. **Page 21 Onboarding** — wizard rendered proof + admit
   - executor: `browser` · status: `blocked` (chrome cleaned `afe71b2`; not admitted)
   - blocker: wizard renders only for signed-out/pending users; needs a signed-out session.
     Do NOT submit the form (live account/org/Storage writes). Flow receivers are `backend`-blocked.

3. **Page 20 Set Password** — visual pass + rendered proof
   - executor: `browser` · status: `blocked`
   - blocker: form renders only under a recovery deep-link session; auth receiver `backend`-blocked.

4. **Contract-test hardening** — lock any admitted fail-closed/canonical rule lacking a test
   - executor: `headless` · status: `todo`
   - do: scan admitted/intake pages for a stated fail-closed or source-pending rule with no
     matching `.contract.test.js` assertion; add it. (Last audit found intake guards covered —
     verify and fill any gap. This is the loop's main safe work.)

## Parked — `backend`-blocked (NOT source-closable; loop must NOT attempt)
Page 12 Insurance · 13 Analytics · 14 Users · 15 Organizations · 16 Settings ·
17 Subscriptions · 18 Pricing. Each needs a named server projection owner + receiver/RLS/RPC/Edge
authority + `ivisit-app` app-consequence proof. All source-closable safety cleanups are already
done (fail-closed commands, no fake metrics, quieted reads). Only document blockers; do not
admit or enable.
