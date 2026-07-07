param(
  [int]$IntervalMinutes = 30,
  [string]$TaskName = 'ivisit-console-revamp-resume',
  [switch]$AllowDirty,
  [switch]$Register
)

$ErrorActionPreference = 'Stop'

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptRoot '..\..')
$RunScript = Join-Path $ScriptRoot 'claude-revamp-run.ps1'

if (-not (Test-Path -LiteralPath $RunScript)) {
  throw "Run script not found: $RunScript"
}

$ClaudeCommand = Get-Command claude -ErrorAction SilentlyContinue
$DefaultClaudePath = Join-Path $env:USERPROFILE '.local\bin\claude.exe'
if ($ClaudeCommand) {
  $ClaudeExe = $ClaudeCommand.Source
} elseif (Test-Path -LiteralPath $DefaultClaudePath) {
  $ClaudeExe = $DefaultClaudePath
} else {
  Write-Host "STOP: claude CLI is not on PATH." -ForegroundColor Yellow
  Write-Host "Install from PowerShell:"
  Write-Host "  irm https://claude.ai/install.ps1 | iex"
  Write-Host "or with WinGet:"
  Write-Host "  winget install Anthropic.ClaudeCode"
  exit 2
}

$RunArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$RunScript`""
if ($AllowDirty) {
  $RunArgs += ' -AllowDirty'
}

$Action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $RunArgs -WorkingDirectory $RepoRoot
$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes)
$Settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 4)

Write-Host "Task name: $TaskName"
Write-Host "Repo: $RepoRoot"
Write-Host "Claude: $ClaudeExe"
Write-Host "Interval minutes: $IntervalMinutes"
Write-Host "Allow dirty tree: $AllowDirty"
Write-Host "Action:"
Write-Host "  powershell.exe $RunArgs"
Write-Host ""

if (-not $Register) {
  Write-Host "Dry run only. To register the task, rerun with -Register." -ForegroundColor Yellow
  Write-Host "Example:"
  Write-Host "  powershell -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Register"
  Write-Host "Messy WIP mode:"
  Write-Host "  powershell -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Register -AllowDirty"
  exit 0
}

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description 'Resume the iVisit Console revamp through Claude Code headless mode.' -Force | Out-Null
Write-Host "Registered scheduled task: $TaskName" -ForegroundColor Green
Write-Host "Check status with:"
Write-Host "  Get-ScheduledTask -TaskName $TaskName"
