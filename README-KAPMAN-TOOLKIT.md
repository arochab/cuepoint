# KAPMAN Toolkit

**Finish tracks faster with clearer next steps.**

KAPMAN Toolkit is a product-oriented workspace for electronic music producers that combines a practical recipe library, an audio analyzer, and a project workspace into one calmer system for moving from idea to decision.

## Why this exists

Most production workflows break in the same place: not at the idea stage, but at the **decision stage**.

You bounce a track, hear that something is off, open ten tabs, try random fixes, lose context, and end up working longer with less confidence.

KAPMAN Toolkit is built to reduce that loop.

It helps you:
- inspect a mix and spot likely issues faster
- move from diagnosis to relevant production or mix recipes
- keep project notes, checklists, comments, and progress in one place
- avoid losing context between sessions

## What it is

KAPMAN Toolkit currently brings together four product blocks:

### 1. Recipe library
A structured library of production and mix routes designed to be practical, realistic, and easy to apply.

### 2. Audio analyzer
A browser-based analyzer that helps surface likely mix issues and translate them into actionable next steps.

### 3. Project workspace
A place to keep project notes, checklist items, comments, and team or review-loop context together.

### 4. Account-backed persistence
Supabase-powered authentication and data storage for favorites, notes, projects, and user-level workspace data.

## Core workflow

Today, the product is organized around a simple logic:

**analyze → diagnose → open the most relevant recipe → continue inside the project workspace**

This is the product direction behind KAPMAN Toolkit:
- less guesswork
- less tab chaos
- more continuity between insight and action

## Who it is for

KAPMAN Toolkit is designed for:
- electronic music producers
- Ableton-oriented workflows
- mix-focused creators who want faster decisions
- teachers, reviewers, or collaborators who need shared project context

## Product positioning

KAPMAN Toolkit is not trying to be a DAW replacement.

It is a **decision layer** around music production:
a focused workspace that helps producers understand what is happening, decide what to do next, and keep that context alive across sessions.

## Current capabilities

At the current stage, the app includes:

- recipe browsing
- category-based recipe cards
- browser-based mix analysis
- analyzer-to-recipe relevance bridge
- project creation and project workspace
- notes and favorites
- email magic-link authentication with Supabase

## What is coming next

High-priority product directions:

- save analyzer output directly into a project
- stronger onboarding after sign-in
- clearer error surfacing from Supabase flows
- more scalable recipe/content management
- stronger design system and platform-level UX polish

## Get started

### Requirements

- Node.js 20+
- npm
- a Supabase project

### Environment variables

Create a `.env` file in the project root with:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run locally

```bash
npm install
npm run dev
```

### Build for production

```bash
npm run build
```

## Deployment

This project is set up to deploy cleanly as a static front-end with:

- **Cloudflare Pages** for hosting
- **Supabase** for auth and database services

### Recommended Cloudflare Pages settings

- **Framework preset:** None
- **Build command:** `npm run build`
- **Build output directory:** `dist`

Add these environment variables in Cloudflare Pages:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Tech stack

- **Svelte 5** — front-end framework
- **Vite 6** — development server and build tool
- **TypeScript** — stricter, safer application logic
- **Tailwind CSS v4** — styling system
- **Supabase** — auth, persistence, and database
- **Cloudflare Pages** — production hosting

## Architecture at a glance

```text
UI (Svelte + Tailwind)
    ↓
Client logic (TypeScript)
    ↓
Supabase auth + database
    ↓
Projects / notes / favorites / workspace data
```

## Repo structure

```text
src/
  lib/
    components/
    data/
    supabase/
    types/
    utils/
scripts/
reports/
```

## Roadmap mindset

This repo is being developed with a product-first approach:

- improve one meaningful thing at a time
- verify before shipping
- keep changes small but high-leverage
- treat UX, product value, and technical quality as one system

## Status

KAPMAN Toolkit is currently in an active product refinement phase:
the foundations are in place, and the focus now is turning the current app into a sharper, more credible platform.

## Notes

- `.env` should never be committed
- local machine settings should stay local
- production deploys should be verified, not assumed

---

**KAPMAN Toolkit**  
A calmer production workspace for faster, clearer music decisions.
