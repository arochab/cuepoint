# KAPMAN Autonomous Improvement — Cycle {CYCLE}/8

You are running as one cycle in an 8-cycle automated improvement loop for the KAPMAN Toolkit v2.
Repo: C:\Users\adamc_ixt0882\Desktop\kapman-toolkit-2

## Hard rules
- Do NOT run git commands (the runner handles all git)
- Do NOT push, deploy, or merge anything
- Do NOT modify .env files or any file containing secrets
- Make exactly ONE improvement this cycle — focused, complete, tested

## Your sequence (follow exactly, in order)

### 1. Audit
Read these files to understand current state:
- PROJECT-STATUS.md
- tasks/todo.md
- src/App.svelte
- src/app.css
- src/lib/components/ (scan 2-3 components relevant to your chosen improvement)

### 2. Choose ONE improvement
Pick the single highest-leverage item from the backlog (PROJECT-STATUS.md → "Remaining backlog").
If the backlog is empty, identify a real UX or product gap by reading the code.
Write your choice down before implementing — it should solve a real user problem.

### 3. Implement
Edit the files needed. Keep it focused — one clear change.
Add a short comment in any important logic you touch (per CLAUDE.md rules).

### 4. Verify
Run exactly these two commands:
```
npm run check
npm run build
```
If check fails, fix the errors before writing the report.
If build fails, fix it before writing the report.

### 5. Write the review report

Write reports/latest-review.md using this exact format:

```markdown
# Cycle {CYCLE}/8 — {TIMESTAMP}

## What was improved
[1-2 sentences, plain English, no jargon]

## Why this was the right call
[1-2 sentences: what user problem it solves and why it ranked highest]

## Files changed
- `path/to/file.ext` — [what changed and why]

## Test results
| Check | Result |
|-------|--------|
| npm run check | PASS — 0 errors |
| npm run build | PASS — NNN kB bundle |

## Before / After
**Before:** [describe or short snippet]
**After:** [describe or short snippet]

## Things to check in the browser
1. [specific thing to click or observe]
2. [specific thing to click or observe]
3. [specific thing to click or observe]

## What should cycle {NEXT_CYCLE}/8 tackle
[one sentence — most important remaining improvement]
```

### 6. Write the summary JSON

Write reports/latest-summary.json:

```json
{
  "cycle": {CYCLE},
  "timestamp": "{TIMESTAMP}",
  "improvement": "short title of what was done",
  "files_changed": ["path/to/file"],
  "check_passed": true,
  "build_passed": true,
  "bundle_kb": 311,
  "errors_fixed": 0,
  "next_improvement": "short title of recommended next cycle"
}
```

### 7. Update PROJECT-STATUS.md
Add a line to the audit findings section marking this cycle's improvement as done,
and update the remaining backlog order.

## Done
Stop after writing the reports. Do not commit. Do not push. Do not open a browser.
