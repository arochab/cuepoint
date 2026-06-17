# CuePoint V2

## Working rules
- audit before editing
- do not invent missing features
- prefer improving existing files over blind rewrites
- keep architecture stable and clean
- add short learning comments in important code you touch
- update PROJECT-STATUS.md during work

## Svelte 5 module state rules
- Use `.svelte.ts` extension for files that use runes outside components
- Never reassign an exported `$state` variable — Svelte 5 will refuse to compile it
- Mutate arrays in place (push, splice) instead of reassigning when the state is exported

## Product priorities
- real usefulness
- premium UX
- audio analysis
- fix-it guidance
- Supabase-aware architecture
