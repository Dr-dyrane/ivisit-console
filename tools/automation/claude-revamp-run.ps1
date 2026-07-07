param(
  [switch]$AllowDirty,
  [string]$PromptPath,
  [string]$ClaudePath
)

$ErrorActionPreference = 'Stop'

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptRoot '..\..')
$LogDir = Join-Path $RepoRoot '.automation\logs'
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$LogFile = Join-Path $LogDir "claude-revamp-$Timestamp.log"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-Log {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date -Format 's'), $Message
  $line | Tee-Object -FilePath $LogFile -Append
}

try {
  Set-Location $RepoRoot
  Write-Log "Starting iVisit Console revamp scheduled run."
  Write-Log "Repo: $RepoRoot"

  if (-not $PromptPath) {
    $PromptPath = Join-Path $ScriptRoot 'claude-revamp-prompt.md'
  }

  if (-not (Test-Path -LiteralPath $PromptPath)) {
    Write-Log "STOP: Prompt file not found: $PromptPath"
    exit 2
  }

  if ($ClaudePath) {
    if (-not (Test-Path -LiteralPath $ClaudePath)) {
      Write-Log "STOP: ClaudePath does not exist: $ClaudePath"
      exit 2
    }
    $ClaudeExe = $ClaudePath
  } else {
    $ClaudeCommand = Get-Command claude -ErrorAction SilentlyContinue
    if ($ClaudeCommand) {
      $ClaudeExe = $ClaudeCommand.Source
    } else {
      $DefaultClaudePath = Join-Path $env:USERPROFILE '.local\bin\claude.exe'
      if (Test-Path -LiteralPath $DefaultClaudePath) {
        $ClaudeExe = $DefaultClaudePath
      } else {
      Write-Log "STOP: claude CLI is not on PATH."
      Write-Log "Install from PowerShell: irm https://claude.ai/install.ps1 | iex"
      Write-Log "Alternative: winget install Anthropic.ClaudeCode"
      exit 2
    }
    }
  }

  Write-Log "Claude executable: $ClaudeExe"

  $Dirty = git status --porcelain
  $DirtyAllowed = $AllowDirty -or ($env:CLAUDE_AUTORUN_ALLOW_DIRTY -eq '1')
  if ($Dirty -and -not $DirtyAllowed) {
    Write-Log "STOP: git tree is dirty. Rerun with -AllowDirty only if this scheduled run should continue existing WIP."
    $Dirty | Tee-Object -FilePath $LogFile -Append
    exit 3
  }

  if ($Dirty -and $DirtyAllowed) {
    Write-Log "Dirty tree allowed for this run. Claude must inspect and preserve existing WIP."
    $Dirty | Tee-Object -FilePath $LogFile -Append
  }

  $Prompt = Get-Content -LiteralPath $PromptPath -Raw
  Write-Log "Launching Claude Code headless with --permission-mode auto."

  & $ClaudeExe -p $Prompt --permission-mode auto --output-format stream-json --include-partial-messages 2>&1 | Tee-Object -FilePath $LogFile -Append
  $ExitCode = if ($LASTEXITCODE -ne $null) { $LASTEXITCODE } else { 0 }

  Write-Log "Claude exited with code $ExitCode."
  exit $ExitCode
} catch {
  Write-Log "ERROR: $($_.Exception.Message)"
  Write-Log $_.ScriptStackTrace
  exit 1
}
