import type { Recipe } from '../types/index.js';

export const recipes: Recipe[] = [
  {
    id: 'r01',
    title: 'Electro Kick - Punch & Sub Control',
    category: 'mixing',
    need: 'low-end',
    goal: 'Un kick serré et qui frappe, qui passe sur les gros systèmes sans devenir boueux',
    tags: ['kick', 'low-end', 'electro', 'club'],
    chain: [
      { plugin: 'FabFilter Pro-Q 3', role: 'Surgical cleanup', params: 'HP at 25 Hz 24dB/oct, notch any boxiness 200-400 Hz (-3 dB narrow Q), shelf boost +1.5 dB at 3-5 kHz for click' },
      { plugin: 'FabFilter Pro-C 2', role: 'Tighten transient', params: 'Style: Punch, Threshold -8 dB, Ratio 3:1, Attack 10 ms, Release 80 ms, Knee soft' },
      { plugin: 'D16 Devastor 2', role: 'Harmonic saturation', params: 'Model: Tube 1, Drive 20-30%, Mix 40%, HP filter at 100 Hz to keep sub clean' },
      { plugin: 'FabFilter Pro-L 2', role: 'Catch peaks', params: 'Style: Transparent, Target -1 dB, max 2 dB GR' }
    ],
    ableton_notes: 'Use Utility before chain to check mono compatibility. Drum Buss after for extra body (Drive 10%, Crunch mid, Transients +15%)',
    native_alt: 'EQ Eight → Compressor (Punch preset) → Saturator (Soft Sine, Drive 4 dB) → Limiter'
  },
  {
    id: 'r02',
    title: 'Dark Analog Bass - Diva Growl',
    category: 'sound-design',
    need: 'character',
    goal: 'Une bass line crade et mouvante avec une chaleur analogique pour l’electro underground',
    tags: ['bass', 'analog', 'diva', 'electro', 'underground'],
    chain: [
      { plugin: 'u-he Diva', role: 'Sound source', params: 'Patch: 2 OSC saw+square, Jup-8 filter model, Cutoff 40%, Reso 25%, Env 60%, VCA Decay 300ms, Mono+Glide 40ms' },
      { plugin: 'D16 Decimort 2', role: 'Lo-fi grit', params: 'Bit depth 14, Sample rate 26 kHz, Quantize ON, Mix 35%' },
      { plugin: 'FabFilter Pro-Q 3', role: 'Shape', params: 'HP 30 Hz, low shelf -2 dB at 200 Hz, gentle boost +2 dB at 800 Hz for presence' },
      { plugin: 'Arturia Comp FET-76', role: 'Fast compression', params: 'Input 30, Output 55, Attack 3, Release 5, Ratio 4:1' }
    ],
    ableton_notes: 'Automatise le cutoff du filtre de Diva avec un LFO mappé via le device Max4Live LFO. Fais le sidechain depuis le kick avec Compressor en mode sidechain.',
    native_alt: 'Wavetable (Saw+Square stack) → Erosion → EQ Eight → Compressor'
  },
  {
    id: 'r03',
    title: 'Crispy Hi-Hats Bus',
    category: 'mixing',
    need: 'top-end',
    goal: 'Un bus de hi-hats cohérent et aéré qui passe devant sans devenir agressif',
    tags: ['drums', 'hi-hats', 'bus', 'mixing'],
    chain: [
      { plugin: 'FabFilter Pro-Q 3', role: 'Clean low end', params: 'HP at 300 Hz 18dB/oct, gentle tilt +1 dB above 8 kHz' },
      { plugin: 'D16 Devastor 2', role: 'Subtle harmonic density', params: 'Model: Diode, Drive 15%, Mix 25%' },
      { plugin: 'FabFilter Pro-C 2', role: 'Glue', params: 'Style: Bus, Threshold -6 dB, Ratio 2:1, Attack 5 ms, Release 60 ms' },
      { plugin: 'Valhalla Room', role: 'Spatial depth', params: 'Predelay 15 ms, Decay 0.6s, Size small, HiCut 9 kHz, Mix 12%' }
    ],
    ableton_notes: 'Groupe toutes tes pistes de hats, applique la chaîne sur le groupe. Utilise Utility pour élargir de +20% le champ stéréo.',
    native_alt: 'EQ Eight → Saturator (Analog Clip) → Glue Compressor → Reverb (short room)'
  },
  {
    id: 'r04',
    title: 'Vocal Chop - Glitchy & Hypnotic',
    category: 'sound-design',
    need: 'character',
    goal: 'Créer des stabs vocaux rythmiques et texturés pour des morceaux electro/minimal',
    tags: ['vocals', 'creative', 'glitch', 'electro'],
    chain: [
      { plugin: 'Ableton Simpler', role: 'Slice & trigger', params: 'Mode: Slice, Sensitivity 50%, Map to keys, Warp ON' },
      { plugin: 'Arturia Efx REFRACT', role: 'Granular chaos', params: 'Spray 30%, Density 60%, Pitch random ±5st, Feedback 25%, Mix 50%' },
      { plugin: 'Arturia Delay TAPE-201', role: 'Tape echo', params: 'Time synced 1/8 dot, Feedback 30%, Wow 15%, Flutter 10%, Mix 25%' },
      { plugin: 'Valhalla Shimmer', role: 'Ethereal tail', params: 'Feedback 40%, Pitch +12st, Size 70%, Mix 15%' }
    ],
    ableton_notes: 'Bounce tes vocal chops en audio et réarrange-les à la main pour un feel humain. Automatise le paramètre Spray de REFRACT pour les montées.',
    native_alt: 'Simpler → Beat Repeat → Echo (Tape mode) → Reverb'
  },
  {
    id: 'r05',
    title: 'Stereo Width Master - Mastering Chain',
    category: 'mastering',
    need: 'phase',
    goal: 'Un master large et ouvert qui reste mono-compatible quand tu vérifies',
    tags: ['mastering', 'stereo', 'width', 'final'],
    chain: [
      { plugin: 'iZotope Ozone 12 Equalizer', role: 'Tonal balance', params: 'Match EQ to reference, then tweak. Keep low end mono below 200 Hz' },
      { plugin: 'iZotope Ozone 12 Imager', role: 'Stereo field', params: 'Band 1 (<200 Hz): 0% (mono), Band 2 (200-2k): +15%, Band 3 (2k-8k): +25%, Band 4 (>8k): +20%' },
      { plugin: 'iZotope Ozone 12 Dynamics', role: 'Glue compression', params: 'Threshold -4 dB, Ratio 2:1, Attack 10 ms, Release auto' },
      { plugin: 'iZotope Ozone 12 Maximizer', role: 'Final ceiling', params: 'Ceiling -1.0 dB True Peak, Threshold to taste (target -8 to -6 LUFS for club), Character: IRC IV' }
    ],
    ableton_notes: 'Fais des A/B avec Utility en mono à chaque étape. Utilise le panneau reference d’Ozone pour comparer avec un morceau de ta playlist de référence.',
    native_alt: 'EQ Eight (M/S mode) → Utility (stereo check) → Multiband Dynamics → Limiter'
  },
  {
    id: 'r06',
    title: 'Parallel Drum Crush',
    category: 'mixing',
    need: 'top-end',
    goal: 'Ajouter du poids et de l’agressivité aux drums sans perdre les transients',
    tags: ['drums', 'parallel', 'crush', 'energy'],
    chain: [
      { plugin: 'D16 Redoptor 2', role: 'Tube saturation', params: 'Drive 50%, Bias 30%, Mix 100% (parallel bus)' },
      { plugin: 'FabFilter Pro-C 2', role: 'Heavy squeeze', params: 'Style: Opto, Threshold -20 dB, Ratio 8:1, Attack 0.5 ms, Release 50 ms' },
      { plugin: 'FabFilter Pro-Q 3', role: 'Tone shape', params: 'HP 80 Hz, scoop -4 dB at 400 Hz, boost +3 dB at 4 kHz' },
      { plugin: 'D16 Fazortan 2', role: 'Movement', params: 'Rate 0.2 Hz, Depth 30%, Feedback 20%, Mix 40%' }
    ],
    ableton_notes: 'Crée une piste Return, envoie le groupe drums à -6 dB. Mélange le signal crushé sous le signal clean. Utilise Utility pour faire correspondre les niveaux.',
    native_alt: 'Saturator (Hard Curve) → Compressor (heavy) → EQ Eight → Phaser-Flanger'
  },
  {
    id: 'r07',
    title: 'CS-80 Blade Runner Pad',
    category: 'sound-design',
    need: 'character',
    goal: 'Un pad analogique riche et évolutif avec du mouvement et de la profondeur',
    tags: ['pad', 'cs-80', 'ambient', 'atmosphere'],
    chain: [
      { plugin: 'Arturia CS-80 V4', role: 'Sound source', params: 'Layer 1: Saw, Layer 2: Square detuned +5ct, Ring Mod subtle 10%, Sub OSC on, Brilliance 60%, Resonance 20%' },
      { plugin: 'Arturia Chorus DIMENSION-D', role: 'Stereo richness', params: 'Mode 3 (widest), Mix 80%' },
      { plugin: 'Valhalla VintageVerb', role: 'Space', params: 'Algorithm: Concert Hall, Decay 3.5s, Predelay 40ms, HiDamp 6 kHz, ModDepth 30%, Mix 30%' },
      { plugin: 'FabFilter Pro-Q 3', role: 'Clean up', params: 'HP 120 Hz, LP 12 kHz gentle, scoop -2 dB at 300 Hz' }
    ],
    ableton_notes: 'Automatise le Brilliance du CS-80 avec un LFO lent. Superpose une texture de noise discrète en dessous pour l’air.',
    native_alt: 'Drift (2 OSC saw + square, chorus on) → Chorus → Reverb → EQ Eight'
  },
  {
    id: 'r08',
    title: 'Sidechain Pump - Musical & Transparent',
    category: 'mixing',
    need: 'low-end',
    goal: 'Un ducking sidechain propre qui respire avec le kick sans clics',
    tags: ['sidechain', 'kick', 'bass', 'groove', 'electro'],
    chain: [
      { plugin: 'Cableguys ShaperBox 3', role: 'Volume shaping', params: 'VolumeShaper: MIDI trigger from kick, Attack 5 ms, Hold 20 ms, Release 120 ms, Depth -12 to -18 dB, Curve smooth' },
      { plugin: 'FabFilter Pro-MB', role: 'Multiband sidechain (optional)', params: 'Solo low band < 200 Hz, external sidechain from kick, Ratio 4:1, fast release' }
    ],
    ableton_notes: 'ShaperBox sur les pistes bass/pad. Utilise une entrée MIDI sidechain depuis un clip MIDI de ghost kick (piste mutée qui n’envoie que du MIDI). Pour un pump plus subtil, utilise Ableton Auto Filter en mode sidechain.',
    native_alt: 'Compressor (sidechain depuis le kick, Ratio 4:1, Attack 0.1 ms, Release 100 ms) ou Shaper sur un Rack'
  },
  {
    id: 'r09',
    title: 'Lo-Fi Texture Layer',
    category: 'sound-design',
    need: 'character',
    goal: 'Ajouter une chaleur analogique et une texture nostalgique à n’importe quelle loop ou sample',
    tags: ['lo-fi', 'texture', 'creative', 'vibe'],
    chain: [
      { plugin: 'Baby Audio Super VHS', role: 'VHS character', params: 'Body 60%, Wash 40%, Lo-fi 50%, Grit 30%, Mix 100%' },
      { plugin: 'D16 Decimort 2', role: 'Bit reduction', params: 'Bit depth 12, Sample rate 22 kHz, Jitter ON, Mix 45%' },
      { plugin: 'Arturia Tape MELLO-FI', role: 'Tape wobble', params: 'Wow 25%, Flutter 30%, Saturation 40%, Noise 15%, Loss medium' },
      { plugin: 'Valhalla Plate', role: 'Retro plate verb', params: 'Decay 1.8s, Size 60%, HiDamp 4 kHz, Mix 20%' }
    ],
    ableton_notes: 'Utilise-le sur un return parallèle ou sur une couche de texture dédiée qui duplique une mélodie. Automatise le sample rate de Decimort pour les transitions.',
    native_alt: 'Redux → Erosion → Echo (Tape) → Reverb'
  },
  {
    id: 'r10',
    title: 'Snare / Clap Snap & Body',
    category: 'mixing',
    need: 'top-end',
    goal: 'Un snare/clap qui claque avec du corps et de la présence, sans mollesse',
    tags: ['snare', 'clap', 'drums', 'transient'],
    chain: [
      { plugin: 'FabFilter Pro-Q 3', role: 'Shape fundamentals', params: 'HP 80 Hz, boost +3 dB at 200 Hz (body), +2 dB at 4-6 kHz (snap), notch any ring 500-800 Hz' },
      { plugin: 'D16 Devastor 2', role: 'Harmonic density', params: 'Model: Foldback, Drive 25%, Mix 30%' },
      { plugin: 'FabFilter Pro-C 2', role: 'Control dynamics', params: 'Style: Vocal, Threshold -6 dB, Ratio 3:1, Attack 2 ms, Release 40 ms' },
      { plugin: 'Eventide SP2016 Reverb', role: 'Short ambience', params: 'Algorithm: Room, Decay 0.4s, Predelay 10 ms, HiCut 8 kHz, Mix 15%' }
    ],
    ableton_notes: 'Superpose un court burst de noise (Operator sine + noise) sous le clap pour plus de top. Utilise les Transients de Drum Buss pour renforcer le snap.',
    native_alt: 'EQ Eight → Saturator → Compressor → Reverb (small room)'
  },
  {
    id: 'r11',
    title: 'Acid Line - Phoscyon Method',
    category: 'sound-design',
    need: 'character',
    goal: 'Une acid bass authentique façon 303 avec du squelch et du mouvement',
    tags: ['acid', '303', 'bass', 'electro', 'classic'],
    chain: [
      { plugin: 'D16 Phoscyon 2', role: '303 emulation', params: 'Cutoff 40%, Resonance 70%, Env Mod 80%, Decay 55%, Accent ON for key notes, Slide on tied notes' },
      { plugin: 'D16 Devastor 2', role: 'Drive', params: 'Model: Tube 2, Drive 35%, Mix 50%' },
      { plugin: 'Arturia Delay BRIGADE', role: 'BBD delay', params: 'Time 1/8, Feedback 30%, Rate 0.8 Hz, Depth 20%, Mix 20%' },
      { plugin: 'FabFilter Pro-Q 3', role: 'Mix seat', params: 'HP 40 Hz, notch -3 dB at 250 Hz if muddy, shelf +1 dB at 2 kHz' }
    ],
    ableton_notes: 'Programme les accents et les slides dans le clip MIDI. Automatise le Cutoff de Phoscyon pour les breakdowns. Groupe et fais le sidechain depuis le kick.',
    native_alt: 'Wavetable (303 wavetable) → Saturator → Simple Delay → EQ Eight'
  },
  {
    id: 'r12',
    title: 'Reverb Bus - Club Space',
    category: 'mixing',
    need: 'phase',
    goal: 'Une colle spatiale cohérente pour le mix, comme si tout était dans la même pièce',
    tags: ['reverb', 'bus', 'space', 'mixing', 'club'],
    chain: [
      { plugin: 'FabFilter Pro-Q 3', role: 'Pre-reverb filter', params: 'HP 250 Hz, LP 8 kHz - keep mud and sizzle out of reverb input' },
      { plugin: 'Valhalla VintageVerb', role: 'Main space', params: 'Algorithm: Smooth Plate, Decay 1.4s, Predelay 25 ms, HiDamp 5 kHz, ModDepth 20%, Mix 100% (send)' },
      { plugin: 'FabFilter Pro-C 2', role: 'Duck reverb tail', params: 'Sidechain from drum bus, Style: Vocal, Threshold -10 dB, Ratio 3:1, fast release 60 ms' }
    ],
    ableton_notes: 'Configure-le en piste Return à 0 dB. Envoie depuis les synths et les vocals entre -12 et -8 dB. N’envoie pas les kicks ni les subs. Sidechain le return depuis le drum bus pour garder les drums clairs.',
    native_alt: 'EQ Eight → Reverb → Compressor (sidechain)'
  },
  {
    id: 'r13',
    title: 'Serum 2 Reese Bass',
    category: 'sound-design',
    need: 'character',
    goal: 'Une bass massive et détunée avec un low end contrôlé pour un crossover DnB/electro',
    tags: ['bass', 'reese', 'serum', 'sound-design'],
    chain: [
      { plugin: 'Xfer Serum 2', role: 'Source', params: 'OSC A: Saw, OSC B: Saw +7 Voices Detune 15%, Unison, Filter LP 24dB cutoff 60%, Reso 10%, LFO1 → Filter slow' },
      { plugin: 'D16 Devastor 2', role: 'Grit layer', params: 'Model: Diode, Drive 30%, Mix 35%' },
      { plugin: 'FabFilter Pro-Q 3', role: 'Low end control', params: 'HP 28 Hz, dynamic bell -3 dB at 200 Hz, boost +2 dB at 1 kHz for growl' },
      { plugin: 'FabFilter Pro-MB', role: 'Multiband taming', params: 'Low band < 120 Hz: compress 3:1, mid band solo 120-500 Hz: light 2:1' }
    ],
    ableton_notes: 'Duplique la piste de bass, HP l’une à 200 Hz (top), LP l’autre à 200 Hz (sub). Traite-les séparément pour un contrôle max.',
    native_alt: 'Wavetable (Saw detune) → Saturator → EQ Eight → Multiband Dynamics'
  },
  {
    id: 'r14',
    title: 'Pre-Master Loudness Check',
    category: 'mastering',
    need: 'loudness',
    goal: 'Un check final de loudness et de dynamique avant de livrer pour le mastering',
    tags: ['mastering', 'loudness', 'LUFS', 'final'],
    chain: [
      { plugin: 'FabFilter Pro-Q 3', role: 'Last corrective EQ', params: 'Only surgical moves: fix resonances, check low-end mono (M/S mode), no broad boosts >2 dB' },
      { plugin: 'FabFilter Pro-L 2', role: 'Transparent limiting', params: 'Style: Transparent, Ceiling -1.0 dB TP, push threshold until -9 to -7 LUFS integrated. Watch for >3 dB GR - back off if so.' },
      { plugin: 'iZotope Ozone 12 Maximizer', role: 'Compare / alternative', params: 'IRC IV, same ceiling, A/B against Pro-L 2 to pick best-sounding limiter on this track' }
    ],
    ableton_notes: 'Utilise le Ableton Loudness Meter (Audio Effects) pour monitorer les LUFS. Exporte en WAV 24-bit. Garde du headroom si tu envoies à un mastering externe.',
    native_alt: 'EQ Eight (surgical) → Limiter → Utility (check mono)'
  }

  ,{
    id: 'r15',
    title: 'Roomy Top Loop Lift',
    category: 'mixing',
    need: 'top-end',
    goal: 'Donner à une top loop plate un rendu plus large, plus aéré et plus haut de gamme sans devenir agressif.',
    tags: ['top-loop', 'air', 'width', 'mixing'],
    chain: [
      { plugin: 'FabFilter Pro-Q 3', role: 'Tilt and clean', params: 'HP 180 Hz, shelf +1.5 dB from 9 kHz, trim -2 dB at 3.5 kHz if splashy' },
      { plugin: 'Eventide MicroPitch', role: 'Stereo lift', params: 'Detune -6 / +6 cents, Delay 8 / 12 ms, Mix 22%' },
      { plugin: 'FabFilter Pro-C 2', role: 'Bus catch', params: 'Style: Bus, Ratio 2:1, Attack 12 ms, Release 70 ms, 1-2 dB GR max' }
    ],
    ableton_notes: 'Garde les hats assez centrés pour survivre en mono. Utilise le Width de Utility pour faire des A/B contre une version plus étroite.',
    native_alt: 'EQ Eight → Chorus-Ensemble → Compressor'
  },
  {
    id: 'r16',
    title: 'Indie Dance Lead - Clean Pressure',
    category: 'sound-design',
    need: 'character',
    goal: 'Un lead brillant mais contrôlé qui passe au-dessus des drums sans faire EDM cheap.',
    tags: ['lead', 'indie-dance', 'pressure', 'melodic'],
    chain: [
      { plugin: 'Arturia Mini V4', role: 'Core tone', params: '2 saw oscillators, slight detune, filter cutoff 55%, emphasis 20%, env amount 45%' },
      { plugin: 'FabFilter Saturn 2', role: 'Upper-mid bite', params: 'Warm Tape, Drive 15%, multiband split at 1.8 kHz, top band mix 55%' },
      { plugin: 'FabFilter Pro-Q 3', role: 'Seat in mix', params: 'HP 120 Hz, dynamic dip -2 dB at 2.6 kHz when snare hits, shelf +1 dB at 9 kHz' }
    ],
    ableton_notes: 'Automatise l’env amount du filtre plutôt que seulement le cutoff pour garder des phrases expressives.',
    native_alt: 'Analog → Saturator → EQ Eight'
  },
  {
    id: 'r17',
    title: 'Low-End Split - Bass + Kick Treaty',
    category: 'mixing',
    need: 'low-end',
    goal: 'Faire coexister kick et bass sans masking permanent ni sidechain à outrance.',
    tags: ['low-end', 'kick', 'bass', 'translation'],
    chain: [
      { plugin: 'FabFilter Pro-Q 3', role: 'Dynamic carve', params: 'Dynamic bell on bass at kick fundamental, -2 to -4 dB, external sidechain from kick' },
      { plugin: 'FabFilter Pro-MB', role: 'Sub-only control', params: 'Band below 110 Hz, Ratio 3:1, sidechain from kick, release 90 ms' },
      { plugin: 'Youlean Loudness Meter', role: 'Level discipline', params: 'Watch integrated and short-term while A/Bing kick+bass together' }
    ],
    ableton_notes: 'Décide d’abord qui possède le 45-65 Hz et qui possède le 80-110 Hz. Ne laisse pas les deux se battre sur les deux zones.',
    native_alt: 'Astuce dynamique avec EQ Eight + Auto Filter en sidechain + Multiband Dynamics'
  },
  {
    id: 'r18',
    title: 'Club Vocal Front - Dry Before Wet',
    category: 'mixing',
    need: 'top-end',
    goal: 'Garder le vocal intelligible et devant avant d’ajouter le moindre traitement d’ambiance.',
    tags: ['vocal', 'front', 'club', 'clarity'],
    chain: [
      { plugin: 'FabFilter Pro-Q 3', role: 'Subtract first', params: 'HP 90 Hz, broad dip -2 dB at 250 Hz, dynamic tame around 2.8-4 kHz if sharp' },
      { plugin: 'FabFilter Pro-DS', role: 'Sibilance control', params: 'Single Vocal mode, threshold to catch only the hardest esses' },
      { plugin: 'FabFilter Pro-C 2', role: 'Stable front placement', params: 'Style: Vocal, Ratio 3:1, Attack 8 ms, Release 70 ms, aim 3 dB GR' }
    ],
    ableton_notes: 'Fais d’abord en sorte que le vocal dry fonctionne. N’ajoute des sends qu’une fois que tu comprends chaque phrase sur les enceintes d’un laptop.',
    native_alt: 'EQ Eight → De-esser → Compressor'
  },
  {
    id: 'r19',
    title: 'Master Cleanup - Last 5 Percent',
    category: 'mastering',
    need: 'loudness',
    goal: 'Une chaîne finale tout en retenue pour les morceaux presque finis qui n’ont besoin que de discipline.',
    tags: ['mastering', 'cleanup', 'restraint', 'final'],
    chain: [
      { plugin: 'FabFilter Pro-Q 3', role: 'Tiny corrective moves', params: 'Only 0.5-1.5 dB moves max; fix one resonance, one tilt issue, and leave the rest alone' },
      { plugin: 'FabFilter Pro-L 2', role: 'Ceiling and control', params: 'Transparent, ceiling -1 dBTP, push only until the track feels alive, not crushed' },
      { plugin: 'Metric AB', role: 'Reference sanity', params: 'A/B against 2 references matched in perceived level, not just raw loudness' }
    ],
    ableton_notes: 'Si tu fais cinq boosts larges, tu es encore en train de mixer, pas de masteriser.',
    native_alt: 'EQ Eight → Limiter → morceau de référence sur un autre channel'
  },
  {
    id: 'r20',
    title: 'Broken Machine Percussion',
    category: 'sound-design',
    need: 'character',
    goal: 'Créer une couche percussive crade avec du mouvement pour les transitions electro et minimal.',
    tags: ['perc', 'machine', 'grit', 'transition'],
    chain: [
      { plugin: 'Ableton Drum Rack', role: 'Source stack', params: 'Layer metallic one-shots, muted claps, and noise bursts across pads' },
      { plugin: 'D16 Nepheton 2', role: 'Machine flavor', params: 'Route hats/cowbells lightly, resample slices, keep only fragments that swing' },
      { plugin: 'FabFilter Volcano 3', role: 'Animated filtering', params: '2-band morph, envelope follower on band 2, resonance 18%, stereo spread low' }
    ],
    ableton_notes: 'Resample, chop, puis commit. Les meilleures percussions de machine apparaissent souvent après un bounce destructif.',
    native_alt: 'Drum Rack → Auto Filter → Beat Repeat'
  }

];
