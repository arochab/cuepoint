# schedule.ps1 — register 8 improvement cycles in Windows Task Scheduler
# Each cycle runs 4 hours after the previous one.
# Run once: powershell.exe -ExecutionPolicy Bypass -File scripts\schedule.ps1
#
# To cancel all cycles:
#   Unregister-ScheduledTask -TaskName "KAPMAN-AutoCycle" -Confirm:$false
#
# To run the first cycle immediately:
#   bash scripts/cycle-runner.sh

$TaskName  = "KAPMAN-AutoCycle"
$RepoRoot  = Split-Path -Parent $PSScriptRoot
$BatFile   = Join-Path $RepoRoot "scripts\launch-cycle.bat"

# ── Validate ──────────────────────────────────────────────────────────────────
if (-not (Test-Path $BatFile)) {
  Write-Error "launch-cycle.bat not found at: $BatFile"
  exit 1
}

# ── Remove any existing task ──────────────────────────────────────────────────
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Write-Host "Removed existing task (if any)."

# ── Build task components ─────────────────────────────────────────────────────
$action = New-ScheduledTaskAction `
  -Execute    $BatFile `
  -WorkingDirectory $RepoRoot

# Start in 2 minutes, repeat every 4 hours, run for up to 32 hours (8 × 4h).
# cycle-runner.sh will exit early after 8 cycles regardless of task duration.
$startTime = (Get-Date).AddMinutes(2)
$trigger   = New-ScheduledTaskTrigger `
  -Once `
  -At                  $startTime `
  -RepetitionInterval  (New-TimeSpan -Hours 4) `
  -RepetitionDuration  (New-TimeSpan -Hours 32)

# Allow up to 3h per run; don't start a new run if one is already running.
$settings  = New-ScheduledTaskSettingsSet `
  -ExecutionTimeLimit  (New-TimeSpan -Hours 3) `
  -MultipleInstances   IgnoreNew `
  -StartWhenAvailable

# ── Register ──────────────────────────────────────────────────────────────────
Register-ScheduledTask `
  -TaskName   $TaskName `
  -Action     $action `
  -Trigger    $trigger `
  -Settings   $settings `
  -RunLevel   Limited `
  -Description "KAPMAN autonomous improvement loop — 8 cycles × 4h. Stops automatically." `
  -Force | Out-Null

# ── Confirm ───────────────────────────────────────────────────────────────────
$task = Get-ScheduledTask -TaskName $TaskName
Write-Host ""
Write-Host "Task registered: $TaskName"
Write-Host "First run:       $startTime"
Write-Host "Interval:        every 4 hours"
Write-Host "Max duration:    32 hours (8 cycles)"
Write-Host "Status:          $($task.State)"
Write-Host ""
Write-Host "Commands:"
Write-Host "  Run now:    bash scripts/cycle-runner.sh"
Write-Host "  Cancel all: Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
Write-Host "  View log:   Get-Content reports\cycle-runner.log -Tail 40"
Write-Host "  View task:  Get-ScheduledTaskInfo -TaskName '$TaskName'"
