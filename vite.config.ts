import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

import { cloudflare } from "@cloudflare/vite-plugin";

// Tailwind v4 uses its own Vite plugin instead of PostCSS —
// no tailwind.config.js needed; theme lives in app.css @theme block.
export default defineConfig({
  plugins: [// must come before svelte so CSS is processed first
  tailwindcss(), svelte(), cloudflare()],
});