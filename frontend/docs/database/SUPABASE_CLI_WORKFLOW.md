# Supabase CLI Workflow — how "codex" drove the shared DB

> READ-ONLY investigation output. The shared Supabase project
> `dlwtcmhdzoklveihuhjf` is owned by `ivisit-app`
> (`C:\Users\Dyrane\Documents\GitHub\ivisit-app`). **Every schema/RPC/RLS CLI
> operation runs from the `ivisit-app` repo root**, not from this console repo.
> This console repo only *receives* synced artifacts (migrations, docs, types)
> via `sync_to_console.js`. Secret **values** are never printed here — only
> variable NAMES and the file they live in.
>
> Purpose: document the exact CLI flow so DB changes can be prepared and driven
> by an assistant behind a review gate, minimizing human keystrokes.

---

## (a) The exact CLI command sequence codex used

Proven by the checked-in SOP (`frontend/docs/database/backend-research/04_EDGE_FUNCTIONS_AND_CHANGE_SOP.md`),
the app's `supabase/docs/CONTRIBUTING.md`, the sync script, and the type-gen
scripts. All commands run **from the `ivisit-app` repo root** unless marked
*(console)*.

```bash
# 0. Baseline — confirm remote migration history is clean
npx supabase migration list                       # CONTRIBUTING.md:14-17; SOP:214,307

# 1. Edit the correct CORE PILLAR file directly — never a new "fix" migration
#    e.g. supabase/migrations/20260219000200_org_structure.sql   CONTRIBUTING.md:10,42

# 2. Land the delta on the LIVE shared DB (Docker is unavailable, so db diff/dump
#    do NOT work). db push only re-runs UNTRACKED migrations, so an edited
#    already-applied pillar must be landed out-of-band via ONE of:            CONTRIBUTING.md:15-16; SOP:228-234
psql "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres" -f delta.sql
#    ...OR paste the idempotent delta into Supabase Dashboard → SQL Editor
#    ...OR (temp dated migration path) create a throwaway migration then:
npx supabase db push                              # add --db-url "<session-pooler-url>" if IPv6 :5432 times out  CONTRIBUTING.md:15

# 3. Confirm it landed (Docker-free)
npx supabase db push                              # expect "Remote database is up to date"   CONTRIBUTING.md:17; SOP:238
#    or: npx supabase db pull                      # regenerate remote diff to confirm

# 4. Targeted contract guards for the change surface
npm run hardening:finance-rpc-contract-guard      # package.json:17 (example; ~60 hardening:* guards exist)
npm run hardening:contract-drift-guard            # package.json:24

# 5. Zero-Side-Effect Cleanup Gate (mandatory before commit/push)     CONTRIBUTING.md:247-261; SOP:253-259
node supabase/tests/scripts/cleanup_test_side_effects.js        # preview
npm run hardening:cleanup-apply
node supabase/tests/scripts/cleanup_test_side_effects.js        # re-preview → must be zero
npm run hardening:cleanup-dry-run-guard
npm run hardening:contract-drift-guard

# 6. If a temp migration was used in step 2, delete it and untrack it remotely
rm supabase/migrations/<temp_timestamp>_*.sql                   # SOP:270
npx supabase migration repair --status reverted <temp_timestamp>   # CONTRIBUTING.md:14; SOP:275

# 7. Regenerate canonical artifacts + mirror into the console repo
node supabase/scripts/generate_schema_snapshot.js              # SOP:282
node supabase/scripts/generate_api_reference.js                # SOP:283
npx supabase gen types typescript --linked > supabase/database.ts   # sync_to_console.js:114
node supabase/scripts/sync_to_console.js                       # clean-overwrites console migrations/docs/scripts/types  sync_to_console.js:12,57,104
```

**What `sync_to_console.js` does** (`ivisit-app/supabase/scripts/sync_to_console.js`,
mirror `frontend/supabase/scripts/sync_to_console.js`): clean-overwrites the
console's `frontend/supabase/migrations`, `frontend/supabase/docs`,
`frontend/supabase/scripts`, and copies `ivisit-app/supabase/database.ts` →
`frontend/src/types/database.ts` (lines 12, 57, 104, 111). This is why console
git history shows `chore(supabase): sync …` commits (e.g. `2f9ba96a`,
`69b3f3a0`, `2b8e252b`) that only touch migrations + `database.ts` + docs — the
console never itself runs `db push`.

**Type generation (console-local alternative)** — `frontend/scripts/generate-types.sh:9`
and `generate-types.ps1:8`:
```bash
npx supabase gen types typescript --project-id dlwtcmhdzoklveihuhjf --schema public > src/types/database.ts
```

**Edge functions are a SEPARATE estate** (out of the migration flow). Deploy
commands live at `ivisit-app/supabase/functions/README.md:118-122`:
```bash
supabase functions deploy                # all
supabase functions deploy billing-quote  # one
```
A *second* function estate the console invokes (`invite-user`, `check-user`,
`sendWelcome`/`sendCustomEmail`/`sendBulkEmail`, `unsubscribe`) deploys from a
different source entirely and is human-owned (SOP §"Out-of-estate", :172-177).

---

## (b) Auth model — env-based vs interactive

**All remote CLI operations authenticate to the Supabase Management API via a
personal access token**, which the CLI reads from **either** the
`SUPABASE_ACCESS_TOKEN` env var **or** an interactive `supabase login` (token
persisted at `~/.supabase/access-token`). Affected commands: `db push`,
`db pull`, `migration list`, `migration repair`, `gen types --linked` /
`--project-id`, `functions deploy`.

**Live probe of this environment (2026-07-08) says the CLI is NOT currently
authenticated:**

| Check | Result |
|---|---|
| `~/.supabase/access-token` | **absent** (only `telemetry.json` present) → no persisted `supabase login` |
| `SUPABASE_ACCESS_TOKEN` in shell | **unset** |
| `SUPABASE_ACCESS_TOKEN` in any `.env` / `.env.example` | **not present** (both repos) |
| `SUPABASE_DB_URL` / `SUPABASE_DB_PASSWORD` | **not present** anywhere (env or dotfiles) |
| `supabase` on PATH | **not installed** (`which supabase` → not found); every codex call was `npx supabase …` (would fetch `supabase@2.109.1`) |
| App repo linked? | **yes** — `ivisit-app/supabase/config.toml:5` `project_id = "ivisit-app"`; `supabase/.temp/project-ref` = `dlwtcmhdzoklveihuhjf` |
| Console repo linked? | **no** `config.toml`; only a mirrored `frontend/supabase/.temp/project-ref` = `dlwtcmhdzoklveihuhjf`. Console is not a CLI workspace. |

**Conclusion: the persisted auth model is INTERACTIVE / human-held.** codex
authenticated the CLI via an interactive `supabase login` (or a transient
`SUPABASE_ACCESS_TOKEN` it exported for the session) — neither survives in this
environment. The `psql` / `db push --db-url "…pooler…[password]…"` path
additionally embeds the **database password**, which is **not** in any env file
and is copied by the human from the Supabase dashboard.

**The only Supabase secret that DOES live in the env files** is the
**service-role key**:
- console `.env` / `.env.local` → `REACT_APP_SUPABASE_SERVICE_ROLE_KEY` (+ `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`)
- app `.env` → `SUPABASE_SERVICE_ROLE_KEY`, `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`, `EXPO_PUBLIC_SUPABASE_URL`

That key only powers `@supabase/supabase-js` REST/RPC calls — e.g. the console's
`frontend/scripts/run-migrations.js` (`:11`, `:28`), which shells SQL through an
`exec_sql` RPC. **That path is dead/hazardous**: the `exec_sql` hazard was killed
in commit `1a4a1d80` ("Slice 1 — kill exec_sql hazard"). The service-role key
**cannot** drive `db push` or schema migrations — those need the management token.

---

## (c) Self-service recipe (assistant-driven, one-time human secret hand-off)

The human stops being a per-change blocker by exporting the secret **once** into
the shell the assistant uses. No secret is ever pasted into chat or a tracked
file.

**One-time provisioning by the human (into the assistant's shell/session):**
```bash
export SUPABASE_ACCESS_TOKEN=…                       # Management API token (or run `supabase login` once)
# Only if using the Docker-free psql / --db-url delta path:
export SUPABASE_DB_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

**Then the assistant runs the full NON-DESTRUCTIVE flow from `ivisit-app` root
with no further keystrokes — with a mandatory review gate before any write:**

1. **Read-only, anytime** (safe to run without asking):
   `npx supabase --version`, `npx supabase migration list`,
   `npx supabase db pull` (regenerates diff, no write), guards
   `npm run hardening:contract-drift-guard`, and
   `node supabase/tests/scripts/cleanup_test_side_effects.js` (preview only).
2. **Prepare the change:** edit the correct core pillar; write the **idempotent**
   delta (`ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`,
   `DROP POLICY IF EXISTS` + `CREATE POLICY`).
3. **MANDATORY GATE — review before push.** Show (a) `npx supabase migration list`,
   (b) the exact delta SQL, and (c) a dry preview:
   `npx supabase db push --dry-run` (prints pending migrations without applying;
   if the CLI version lacks the flag, the interactive `db push` Y/N prompt +
   `migration list` is the gate). **Get explicit go-ahead before applying.**
4. **Apply** the reviewed delta: `psql "$SUPABASE_DB_URL" -f delta.sql`
   **or** `npx supabase db push` (temp-migration path).
5. **Verify:** `npx supabase db push` → "Remote database is up to date".
6. **Guards + Zero-Side-Effect Cleanup Gate** (step 4–5 of the sequence above) —
   do not proceed if cleanup preview shows planned rows or drift guard reports a
   missing table/column/RPC signature.
7. **Untrack any temp migration:** `migration repair --status reverted <ts>`.
8. **Regenerate + `node supabase/scripts/sync_to_console.js`**, then commit the
   synced artifacts in this console repo.

**Hard prohibitions (never, by anyone):**
- ❌ `npx supabase db reset` on the shared DB — destroys shared data (SOP:189).
- ❌ a permanent "fix" migration — always edit the pillar (CONTRIBUTING.md:10).
- ❌ `db diff` / `db dump` — require Docker, unavailable here (SOP:191).
- ❌ pushing on cleanup-preview rows or contract drift (SOP:338).

---

## (d) What still genuinely requires the human

1. **The one-time secret hand-off.** Neither the Management API token nor the DB
   password/`SUPABASE_DB_URL` exists in any dotfile a tool can read, and the CLI
   is not currently logged in. A human must either run `supabase login` once or
   export `SUPABASE_ACCESS_TOKEN` (and, for the Docker-free psql path, the pooler
   `SUPABASE_DB_URL` with the DB password from the dashboard). After that hand-off
   within a session, the assistant needs no further keystrokes.
2. **Dashboard SQL Editor deltas** — if the human prefers that over `psql`, only
   they can paste/run in the dashboard.
3. **Edge function deploys** — the second function estate (`invite-user`,
   `check-user`, `send*`, `unsubscribe`) deploys from a separate, human-owned
   source (SOP:172-177).
4. **Destructive ops** — `db reset` and any data-destroying command are off-limits
   regardless of who is driving.

---

## Verdict

With a **one-time human secret hand-off** (export `SUPABASE_ACCESS_TOKEN`, plus
`SUPABASE_DB_URL` for the Docker-free path), **all non-destructive DB changes CAN
be assistant-driven behind a mandatory `migration list` + delta + `--dry-run`
review gate, with no further human keystrokes.** In the current environment
(no token, no DB URL, CLI not logged in), the apply/push step genuinely blocks on
the human — the assistant can still do everything up to the gate.

---

*Sources: `frontend/docs/database/backend-research/04_EDGE_FUNCTIONS_AND_CHANGE_SOP.md`;
`ivisit-app/supabase/docs/CONTRIBUTING.md:10-17,247-261`;
`ivisit-app/supabase/scripts/sync_to_console.js` (mirror `frontend/supabase/scripts/sync_to_console.js`);
`frontend/scripts/generate-types.sh:9`, `generate-types.ps1:8`,
`run-migrations.js:11,28` (dead exec_sql path, killed in commit `1a4a1d80`);
`ivisit-app/supabase/functions/README.md:118-122`;
`ivisit-app/supabase/config.toml:5`; `.temp/project-ref` files; `ivisit-app/package.json:12-71` (hardening guards).
Read-only; no secret values recorded.*
