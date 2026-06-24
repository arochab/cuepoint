# Security policy

CuePoint handles authentication (Supabase) and payments (Stripe) for the optional AI coach, so I take security reports seriously.

## Reporting a vulnerability

Please **do not** open a public issue for a security problem. Instead, email **admin@example.com** with:

- a description of the issue and its impact,
- steps to reproduce (or a proof-of-concept), and
- any suggested remediation.

I'll acknowledge within a few days and keep you posted on the fix. Responsible disclosure is appreciated — I'll credit you if you'd like.

## Scope & design notes

- **Audio never leaves the browser.** Analysis runs in an `OfflineAudioContext`; only *derived numbers* are ever sent anywhere (and only when you use saved track memory or the paid coach).
- **Secrets** live in environment variables, never in the repo. The Supabase key shipped to the client is the **publishable** key; all data access is gated by Row-Level Security. The Stripe secret key and webhook signing secret live only in Supabase Edge Function env vars.
- **The admin allowlist is config-driven** (`app.admin_emails` Postgres setting) — no personal emails in source.
- The paid coach Edge Function meters token cost and enforces a daily spend ceiling server-side.
