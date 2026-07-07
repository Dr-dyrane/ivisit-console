<#
  revamp-resume.ps1 - safe preflight + resume-prompt emitter for the iVisit Console revamp.

  It does NOT edit code, does NOT commit, does NOT push, and does NOT print secrets.
  It inspects git + environment, enforces the revamp guardrails, and prints the resume
  prompt for a Claude Code session to continue the next cycle.

  See docs/planning/REVAMP_RESUME_PROTOCOL.md for the full protocol.
#>

param([switch]$Launch)

$ErrorActionPreference = 'Stop'
$Branch = 'codex/ivisit-console-revamp-checkpoint-20260707'

$ScriptDir   = Split-Path -Parent $PSCommandPath
$FrontendDir = Split-Path -Parent $ScriptDir
$RepoRoot    = Split-Path -Parent $FrontendDir

function Write-Line($label, $value) { Write-Host ("{0,-22} {1}" -f ($label + ':'), $value) }
function Stop-Cycle($why) {
  Write-Host ''
  Write-Host "STOP - ask the user for review. Reason: $why" -ForegroundColor Yellow
  Write-Host 'Do not edit, commit, or push this cycle until resolved.'
  exit 2
}

Write-Host '=== iVisit Console revamp - resume preflight ===' -ForegroundColor Cyan

# 1. Branch guard
$current = (git -C $RepoRoot rev-parse --abbrev-ref HEAD).Trim()
Write-Line 'Branch' $current
if ($current -ne $Branch) { Stop-Cycle "not on checkpoint branch ($current). Expected $Branch." }

# 2. Working tree must be clean at wake time
$dirty = git -C $RepoRoot status --porcelain
if ($dirty) {
  Write-Line 'Working tree' 'DIRTY'
  Write-Host $dirty
  Stop-Cycle 'uncommitted changes exist at wake time (may be user WIP the cycle did not create).'
}
Write-Line 'Working tree' 'clean'

# 3. Divergence check (never force-push; origin must not be ahead)
try {
  git -C $RepoRoot fetch origin --quiet
  $counts = (git -C $RepoRoot rev-list --left-right --count "HEAD...origin/$Branch").Trim() -split '\s+'
  $ahead = [int]$counts[0]; $behind = [int]$counts[1]
  Write-Line 'Ahead/behind origin' "$ahead ahead / $behind behind"
  if ($behind -gt 0) { Stop-Cycle "origin/$Branch is $behind commit(s) ahead; reconcile before pushing (never force-push)." }
} catch {
  Write-Line 'Fetch' 'skipped (offline or no remote access)'
}

# 4. Latest commits
Write-Host ''
Write-Host 'Recent commits:'
git -C $RepoRoot log --oneline -5

# 5. Dev server on :3000 (reuse if running, never spawn a second)
$listening = $false
try { $listening = [bool](Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) } catch { $listening = $false }
if ($listening) { Write-Line 'Dev server :3000' 'listening (reuse it; do NOT start another)' }
else { Write-Line 'Dev server :3000' 'not running (a cycle may start ONE: npm start in frontend/)' }

# 6. Credential var NAMES only (never values)
$envFile = Join-Path $FrontendDir '.env.local'
foreach ($v in @('IVISIT_TEST_ADMIN_EMAIL','IVISIT_TEST_ADMIN_PASSWORD')) {
  $present = $false
  if (Test-Path $envFile) { $present = [bool](Select-String -Path $envFile -Pattern ("^" + [regex]::Escape($v) + "=") -Quiet) }
  Write-Line $v ($(if ($present) { 'present (value not read)' } else { 'MISSING' }))
}

# 7. Emit the resume prompt
Write-Host ''
Write-Host '=== Resume prompt (paste into a new Claude Code session) ===' -ForegroundColor Cyan
$prompt = @'
Continue the iVisit Console revamp on branch codex/ivisit-console-revamp-checkpoint-20260707.
Follow docs/planning/REVAMP_RESUME_PROTOCOL.md exactly.
1. Inspect git status and read PAGE_REVAMP_GATE.md top sections + the "Current pointer".
2. Pick ONE page (the next one named in the pointer) unless the gate already proves it done.
3. Do only the next source-closable gate slice; preserve old behavior from f31f29f.
4. Update the page contract test, run focused tests, strict-radius hardgate, and rendered
   proof if visual (reuse localhost:3000; do not print secrets; do not spawn a second server).
5. Commit one coherent checkpoint and push the checkpoint branch only (never main, never force).
6. End with the protocol resume block and update the "Current pointer".
Stop and ask for review only on the protocol's stop-and-ask conditions.
'@
Write-Host $prompt
Write-Host ''
Write-Host 'Preflight OK. This script made no edits, commits, pushes, or secret reads.' -ForegroundColor Green

# 8. Optional auto-continue: run Claude Code headless on the emitted prompt.
# Off by default. The preflight guards above still gate this: a dirty tree or an ahead origin
# already exited (Stop-Cycle) before reaching here, so -Launch never runs on top of unreviewed
# changes. To disable the unattended run, remove the -Launch switch (the preflight/notify still runs).
if ($Launch) {
  # Resolve the claude CLI: PATH first, then known install locations. A scheduled task's process
  # often lacks the user's freshly-updated PATH, so fall back to the native/npm install path.
  $claudeCmd = $null
  $onPath = Get-Command claude -ErrorAction SilentlyContinue
  if ($onPath) { $claudeCmd = $onPath.Source }
  else {
    foreach ($p in @("$HOME\.local\bin\claude.exe", "$env:APPDATA\npm\claude.cmd", "$env:APPDATA\npm\claude.ps1")) {
      if (Test-Path $p) { $claudeCmd = $p; break }
    }
  }
  if ($claudeCmd) {
    Write-Host ''
    Write-Host "Auto-continue (-Launch): starting $claudeCmd on the resume prompt..." -ForegroundColor Cyan
    # UNATTENDED: --dangerously-skip-permissions lets the model run tools (edit/bash/git) without
    # prompting, so it can complete a cycle and commit/push on its own. This runs the model
    # unsupervised on a live branch. It is gated by the preflight above (right branch / clean tree /
    # origin not ahead), but review the branch regularly. Remove --dangerously-skip-permissions to
    # require confirmations (it will then need an interactive session or pre-approved tool settings).
    & $claudeCmd -p $prompt --dangerously-skip-permissions
  } else {
    Write-Host ''
    Write-Host 'Auto-continue requested (-Launch) but the "claude" CLI was not found on PATH, in ~/.local/bin, or in the npm global dir.' -ForegroundColor Yellow
    Write-Host 'Install Claude Code or set the full path in this script, then re-run with -Launch.'
  }
}
