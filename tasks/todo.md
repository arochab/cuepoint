# TODO

## Done
- [x] Audit imported source (structure, entry points, framework, features, Supabase)
- [x] Reconstruct missing build config (package.json, vite.config.ts, tsconfig.json, svelte.config.js, index.html, .env.example)
- [x] Install deps, verify build passes (161 modules, 0 errors)
- [x] Add .gitignore — .env was untracked with live credentials
- [x] Fix ProjectMember type — user_id was missing from interface
- [x] Fix saveNote — replaced manual select+update/insert with atomic upsert
- [x] Full svelte-check pass — fixed 15 type errors across 4 files, 0 errors remain

## Next
- [ ] Seed recipes into Supabase `recipes` table — currently hardcoded in `src/lib/data/recipes.ts`, not DB-driven
- [ ] Add Supabase realtime to `ProjectDetail.svelte` — schema supports it, no subscriptions wired yet
- [ ] Profile settings page — `profiles` table exists but has no UI (display_name, avatar)
- [ ] Verify full auth flow end-to-end with real Supabase project
- [ ] Add `<link rel="icon">` and Open Graph meta tags to `index.html`
