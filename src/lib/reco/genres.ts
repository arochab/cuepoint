// Genre-first targets, focused on the electronic / underground spectrum (no mainstream EDM).
// Styles drawn from the Yoyaku catalogue (deep house, minimal, techno, dub techno, electro,
// acid, UK garage, ambient). The wedge: a beginner never has to supply a reference track;
// Cue judges against curated, per-style target zones instead.
//
// Ranges are intentionally forgiving and tuned to how each style actually masters for clubs
// and streaming. The DSP numbers stay the source of truth; these only shape verdict + score.

export type GenreId =
  | 'deep-house' | 'minimal' | 'techno' | 'dub-techno' | 'electro' | 'acid' | 'uk-garage' | 'ambient' | 'other';

export interface GenreTarget {
  id: GenreId;
  label: string;
  // Integrated LUFS this style is typically released at.
  lufs: [number, number];
  // Acceptable low-vs-mid energy gap (dB). Bass-forward styles tolerate a bigger gap.
  lowGap: [number, number];
  // High-vs-mid gap (dB) before it reads brittle.
  highGap: [number, number];
}

// Ordered for the chip row: the styles a Yoyaku-leaning producer reaches for first.
export const GENRES: GenreTarget[] = [
  { id: 'deep-house', label: 'Deep House',  lufs: [-11, -8], lowGap: [0, 5],  highGap: [-2, 3] },
  { id: 'minimal',    label: 'Minimal',     lufs: [-12, -9], lowGap: [-1, 4], highGap: [-2, 3] },
  { id: 'techno',     label: 'Techno',      lufs: [-9, -6],  lowGap: [0, 6],  highGap: [-1, 4] },
  { id: 'dub-techno', label: 'Dub Techno',  lufs: [-13, -9], lowGap: [1, 7],  highGap: [-4, 1] },
  { id: 'electro',    label: 'Electro',     lufs: [-10, -7], lowGap: [0, 6],  highGap: [0, 5] },
  { id: 'acid',       label: 'Acid',        lufs: [-10, -7], lowGap: [-1, 5], highGap: [0, 5] },
  { id: 'uk-garage',  label: 'UK Garage',   lufs: [-9, -6],  lowGap: [0, 6],  highGap: [0, 5] },
  { id: 'ambient',    label: 'Ambient',     lufs: [-18, -13], lowGap: [-2, 3], highGap: [-4, 2] },
  { id: 'other',      label: 'Not sure',    lufs: [-13, -7], lowGap: [-1, 6], highGap: [-2, 4] },
];

export function genreById(id: GenreId | null | undefined): GenreTarget {
  return GENRES.find((g) => g.id === id) ?? GENRES[GENRES.length - 1];
}

const KEY = 'cuepoint.genre.v1';

// Remember the producer's last pick so the chip is pre-selected next time (small kindness).
export function rememberGenre(id: GenreId): void {
  try { localStorage.setItem(KEY, id); } catch { /* non-fatal */ }
}
export function lastGenre(): GenreId | null {
  try { return (localStorage.getItem(KEY) as GenreId) ?? null; } catch { return null; }
}
