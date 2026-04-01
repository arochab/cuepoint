# LESSONS

## Tailwind v4 + Vite setup is different from v3
Tailwind CSS v4 ships a first-party Vite plugin (`@tailwindcss/vite`) that replaces the PostCSS approach.
- No `tailwind.config.js` needed — theme lives in the CSS file's `@theme {}` block
- Plugin order matters: `tailwindcss()` must come **before** `svelte()` in `vite.config.ts`
- CSS entry just uses `@import "tailwindcss"` instead of three `@tailwind` directives

## Svelte 5 `mount` replaces `new App()`
Svelte 5 drops the class-based instantiation. The entry point is now:
```ts
import { mount } from 'svelte';
mount(App, { target: document.getElementById('app')! });
```
The plugin version that supports Svelte 5 + Vite 6 is `@sveltejs/vite-plugin-svelte` v6+.
(v4 only supports Vite 5; v7+ requires Vite 8.)

## Product flywheel before polish
Two isolated tools (analyzer + recipes) are worth less than their sum. The highest-leverage
product move was to connect them: analyzer issues now carry a `type` field, a tag-overlap
scorer maps each type to recipe tags, and the top 3 recipes surface inside the analyzer
results with a direct "Open recipe" navigation link. This creates the diagnostic → fix
workflow that makes both features worth more together.
The pattern: add typed metadata to outputs, score against content by overlap, surface inline.

## Do not name a $derived variable the same as any rune word
In Svelte 5, `const derived = $derived.by(...)` creates an internal `$derived` symbol that
conflicts with the rune itself. Even renaming it (e.g., `diagnostics`) still causes a
forward-reference TypeScript error because Svelte generates `$<varname>` internally.
Fix: extract the computation into a plain typed function and use `$derived(expr)` with the
simple expression form instead of `$derived.by(callback)`.

## .gitignore must exist before first `npm install`
Running `npm install` generates `node_modules/`, `package-lock.json`, and `dist/` — all of which shouldn't be committed.
And if `.env` is created before `.gitignore`, it shows as untracked and can be accidentally staged.
Always create `.gitignore` before any dependency install or credential setup.

## `moduleResolution: bundler` is required for Vite + TypeScript
With `moduleResolution: node` TypeScript complains about `.svelte` imports and Vite path aliases.
The `bundler` option (TS 5.0+) matches Vite's actual resolution behavior.

## Supabase env vars in Vite must be prefixed `VITE_`
Vite only exposes env vars prefixed `VITE_` to client code via `import.meta.env`.
Using non-prefixed vars silently returns `undefined` at runtime.
