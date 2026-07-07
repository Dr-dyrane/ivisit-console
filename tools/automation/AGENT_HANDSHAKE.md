# Multi-Agent Handshake Protocol

Many agents (and humans) work this repo **at the same time**, like a team of engineers sharing one
codebase. This file is the contract that lets that scale without collisions. If you are an agent
touching this repo, read this first and follow it. The prime directive: **coordinate through the
Claims Registry and commit fast — never fight the working tree.**

Why this exists: this tree is edited by several concurrent Claude sessions (an interactive
controller, a `codex` agent, a `cowork` session, a headless `claude -p` loop) plus humans. A
process here periodically **resets the working tree to `HEAD`**, so any *uncommitted* edit that sits
around gets wiped. The only durable state is **committed + pushed**. Everything below follows from
that.

---

## Golden rules (all agents)

1. **Commit fast; never sit on uncommitted work.** Edit → verify → `git commit <your files>` →
   `git push`. Minutes, not tens of minutes. Committed work survives the tree reset; uncommitted
   work does not.
2. **Claim before you touch.** Append one row to the Claims Registry (below) naming your lane,
   files, owner, and `in_progress`, and commit+push that claim. Then work.
3. **One narrow lane at a time.** One page/cluster/feature. No repo-wide scope.
4. **Path-limited commits only.** `git commit <path> [<path> …] -m "…"`. NEVER `git add -A`,
   `git add .`, `git commit -a`, or `git commit` with a broad index — you will sweep another
   agent's staged work into your commit.
5. **Push with rebase-retry.**
   `git push origin <branch> || (git fetch origin && git rebase origin/<branch> && git push origin <branch>)`
   — retry up to ~4×. Different agents touch different files, so rebases are almost always clean.
6. **NEVER revert another agent's work.** No `git checkout .`, no `git checkout -- <file>` /
   `git restore` / `git stash` / `git show HEAD:<file> > <file>` on files you did not create this
   session. If you see unexpected dirty files, they are another agent's in-progress lane — **leave
   them**. Reverting someone else's uncommitted work is the #1 way this repo loses hours.
7. **No blanket sweeps.** Do not mass find/replace one token across many pages/files in one shot.
   Contract tests LOCK specific chrome per surface; a blanket sweep breaks locks on pages you don't
   own and collides with other agents. Do **one page + its own contract test**, together.
8. **Shared files have exactly one owner: the controller.** Do not concurrently edit
   `frontend/scripts/check-ui-surface-hardgate.js` (the `defaultFiles` list), multi-page/shared
   contract tests (e.g. `PageRevampGate.contract.test.js`, `ManagementCanon.contract.test.js`), or
   the top summary sections of `docs/planning/PAGE_REVAMP_GATE.md`. If your change needs one of
   these, either hand it to the controller or stage ONLY your hunks with filtered
   `git apply --cached`. Leaving that script half-written breaks **every** contract test that shells
   out to it, repo-wide.
9. **Release your lane.** When your work is committed + pushed, flip your Claims row to `done` with
   the commit hash.

---

## Roles

| Role | Who | Owns | Never does |
|---|---|---|---|
| **Controller / checkpoint-owner** | exactly one agent at a time | shared files (hardgate `defaultFiles`, shared/multi-page contract tests, gate summary), branch-green consolidation, conflict resolution | block page agents; hoard lanes |
| **Page / feature agents** | many, in parallel | one page/cluster each; commit+push their own files | touch shared files; revert others; sweep |
| **Headless loop** (`claude -p`) | 0–1 | only `todo` + `headless` queue items | rendered/browser or backend work; spinning when none left |

Only the controller edits the shared files. Page agents that discover a needed shared-file change
report it (in their Claims note) for the controller to consolidate.

---

## Isolation (recommended for real parallelism)

The cleanest way to run many agents at once is to give each its **own working tree** so no two share
a checkout (and the tree-reset can't wipe an isolated worktree):

```bash
git worktree add ../wt-<lane> -b agent/<lane>   # separate dir + index + branch
# …edit + verify + commit in ../wt-<lane>…
git push origin agent/<lane>                     # controller integrates into the checkpoint branch
```

Or, from the Agent tool, spawn with `isolation: "worktree"`. Node-only checks (the hardgate:
`node scripts/check-ui-surface-hardgate.js <file>`) run fine in a worktree; `npm test` / `npm run
build` need `node_modules`, so run those in the main tree or after integration.

If you are NOT isolated (working in the main tree), rule #1 (commit fast) is mandatory, not optional.

---

## Claims Registry

The registry lives in `tools/automation/revamp-queue.md` under "Live claims". It is **append-only**:
add your row, never rewrite another agent's row. Row format:

```
| when (UTC date) | agent id | lane (one line) | files you will touch | status | note / commit |
```

`status` ∈ `in_progress` | `done` | `blocked`. Before picking a lane, scan the registry: if a file
you want is `in_progress` under another agent, pick a different lane.

---

## Git discipline (copy-paste)

```bash
BR=codex/ivisit-console-revamp-checkpoint-20260707

# 0. stale lock (only if truly stale: >2 min old AND no running git process)
[ -f .git/index.lock ] && find .git/index.lock -mmin +2 >/dev/null 2>&1 && ! pgrep -x git >/dev/null && rm -f .git/index.lock

# 1. verify your file (single-file hardgate; if the SCRIPT itself throws a SyntaxError,
#    another agent is mid-editing it — wait 20s and retry, do NOT "fix" it)
node frontend/scripts/check-ui-surface-hardgate.js frontend/src/components/pages/<Your>.jsx

# 2. commit ONLY your files
git commit frontend/src/components/pages/<Your>.jsx -m "…"

# 3. push with rebase-retry
git push origin "$BR" || (git fetch origin && git rebase "origin/$BR" && git push origin "$BR")
```

Rules of thumb: never push `main`; never force-push; never `--no-verify`. Keep each commit one
coherent slice. When in doubt, commit what you have and leave the rest for its owner.
