#!/usr/bin/env bash
# cycle-runner.sh — runs ONE improvement cycle for KAPMAN Toolkit v2
# Called by the Task Scheduler via launch-cycle.bat every 4 hours.
# Handles: branch creation, claude invocation, git commit, notification.
# Does NOT: auto-merge to main, auto-deploy, commit secrets.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# ── Cycle counter ──────────────────────────────────────────────────────────────
COUNTER_FILE="reports/.cycle-count"
mkdir -p reports

if [[ -f "$COUNTER_FILE" ]]; then
  CYCLE=$(cat "$COUNTER_FILE")
else
  CYCLE=0
fi

CYCLE=$((CYCLE + 1))

# Stop cleanly after 8 cycles — Task Scheduler will keep firing but we exit early
if (( CYCLE > 8 )); then
  echo "All 8 cycles complete. Delete the scheduled task to stop future runs."
  echo "  powershell.exe Unregister-ScheduledTask -TaskName KAPMAN-AutoCycle -Confirm:\$false"
  exit 0
fi

echo "$CYCLE" > "$COUNTER_FILE"

TIMESTAMP=$(date +%Y%m%d-%H%M)
BRANCH="cycle/$CYCLE-$TIMESTAMP"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  KAPMAN Autonomous Cycle $CYCLE / 8 — $TIMESTAMP"
echo "═══════════════════════════════════════════════════"

# ── Git: create cycle branch off main ─────────────────────────────────────────
git checkout main
git pull origin main --quiet 2>/dev/null || true   # best-effort; offline is fine
git checkout -b "$BRANCH"
echo "Branch: $BRANCH"

# ── Build the prompt from template ────────────────────────────────────────────
NEXT_CYCLE=$((CYCLE + 1))
PROMPT=$(cat scripts/cycle-prompt.md)
PROMPT="${PROMPT//\{CYCLE\}/$CYCLE}"
PROMPT="${PROMPT//\{TIMESTAMP\}/$TIMESTAMP}"
PROMPT="${PROMPT//\{NEXT_CYCLE\}/$NEXT_CYCLE}"

# ── Run Claude Code (non-interactive, single session) ─────────────────────────
# --dangerously-skip-permissions: approved for this local automation loop.
# Claude is instructed NOT to run git/deploy commands — the runner owns that.
# Each cycle is reviewed by the human before anything reaches main.
echo "Running Claude Code..."
claude \
  --dangerously-skip-permissions \
  -p "$PROMPT" \
  --output-format text

# ── Safety: never commit .env or secrets ──────────────────────────────────────
git reset HEAD .env .env.local .env.*.local 2>/dev/null || true

# ── Commit whatever Claude changed (reports + src) ────────────────────────────
git add -A
git reset HEAD .env .env.local .env.*.local 2>/dev/null || true  # double-check

if ! git diff --cached --quiet; then
  git commit -m "$(cat <<EOF
cycle($CYCLE/8): automated improvement — $TIMESTAMP

See reports/latest-review.md for full review.
Branch $BRANCH — awaiting human review before any merge.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
  git push origin "$BRANCH" 2>/dev/null || echo "Push skipped (no remote or offline)"
  echo "Committed and pushed: $BRANCH"
else
  echo "No file changes in this cycle."
fi

# ── Windows toast notification ────────────────────────────────────────────────
powershell.exe -ExecutionPolicy Bypass -File "$REPO_ROOT/scripts/notify.ps1" \
  -Cycle "$CYCLE" \
  -Branch "$BRANCH" \
  -ReportPath "$REPO_ROOT\\reports\\latest-review.md" \
  2>/dev/null || echo "Notification skipped (PowerShell unavailable)"

# ── Print summary ─────────────────────────────────────────────────────────────
echo ""
echo "Cycle $CYCLE complete."
echo "Review:  reports/latest-review.md"
echo "Branch:  $BRANCH"
if (( CYCLE < 8 )); then
  echo "Next:    cycle $((CYCLE + 1)) in ~4 hours"
else
  echo "All 8 cycles complete. No more auto-runs."
fi
echo "═══════════════════════════════════════════════════"
