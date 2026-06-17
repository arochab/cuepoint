// Global toast state for surfacing Supabase errors and key success events.
// Uses Svelte 5 module-level $state so any component can call toast() and
// the Toast.svelte component reacts without prop drilling or a separate store.

export interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error';
}

let items = $state<ToastItem[]>([]);
let seq = 0;

export function toast(message: string, type: ToastItem['type'] = 'error', ms = 4000) {
  const id = seq++;
  items.push({ id, message, type });
  // splice instead of reassign - Svelte 5 forbids reassigning exported $state
  setTimeout(() => {
    const idx = items.findIndex(t => t.id === id);
    if (idx !== -1) items.splice(idx, 1);
  }, ms);
}

export function dismiss(id: number) {
  const idx = items.findIndex(t => t.id === id);
  if (idx !== -1) items.splice(idx, 1);
}

export { items as toasts };
