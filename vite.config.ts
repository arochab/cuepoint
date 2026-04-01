import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';

// Tailwind v4 uses its own Vite plugin instead of PostCSS —
// no tailwind.config.js needed; theme lives in app.css @theme block.
export default defineConfig({
  plugins: [
    tailwindcss(), // must come before svelte so CSS is processed first
    svelte(),
  ],
});
