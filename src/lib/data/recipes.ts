import type { Recipe } from '../types/index.js';

export const recipes: Recipe[] = [
  {
    id: 'r01',
    title: 'Electro Kick — Punch & Sub Control',
    category: 'mixing',
    goal: 'Get a tight, punchy kick that translates on big systems without mud',
    tags: ['kick', 'low-end', 'electro', 'club'],
    chain: [
      { plugin: 'FabFilter Pro-Q 3', role: 'Surgical cleanup', params: 'HP at 25 Hz 24dB/oct, notch any boxiness 200–400 Hz (−3 dB narrow Q), shelf boost +1.5 dB at 3–5 kHz for click' },
      { plugin: 'FabFilter Pro-C 2', role: 'Tighten transient', params: 'Style: Punch, Threshold −8 dB, Ratio 3:1, Attack 10 ms, Release 80 ms, Knee soft' },
      { plugin: 'D16 Devastor 2', role: 'Harmonic saturation', params: 'Model: Tube 1, Drive 20–30%, Mix 40%, HP filter at 100 Hz to keep sub clean' },
      { plugin: 'FabFilter Pro-L 2', role: 'Catch peaks', params: 'Style: Transparent, Target −1 dB, max 2 dB GR' }
    ],
    ableton_notes: 'Use Utility before chain to check mono compatibility. Drum Buss after for extra body (Drive 10%, Crunch mid, Transients +15%)',
    native_alt: 'EQ Eight → Compressor (Punch preset) → Saturator (Soft Sine, Drive 4 dB) → Limiter'
  },
  {
    id: 'r02',
    title: 'Dark Analog Bass — Diva Growl',
    category: 'sound-design',
    goal: 'Gritty, moving bass line with analog warmth for underground electro',
    tags: ['bass', 'analog', 'diva', 'electro', 'underground'],
    chain: [
      { plugin: 'u-he Diva', role: 'Sound source', params: 'Patch: 2 OSC saw+square, Jup-8 filter model, Cutoff 40%, Reso 25%, Env 60%, VCA Decay 300ms, Mono+Glide 40ms' },
      { plugin: 'D16 Decimort 2', role: 'Lo-fi grit', params: 'Bit depth 14, Sample rate 26 kHz, Quantize ON, Mix 35%' },
      { plugin: 'FabFilter Pro-Q 3', role: 'Shape', params: 'HP 30 Hz, low shelf −2 dB at 200 Hz, gentle boost +2 dB at 800 Hz for presence' },
      { plugin: 'Arturia Comp FET-76', role: 'Fast compression', params: 'Input 30, Output 55, Attack 3, Release 5, Ratio 4:1' }
    ],
    ableton_notes: 'Automate Diva filter cutoff with an LFO mapped via Max4Live LFO device. Sidechain from kick using Compressor in sidechain mode.',
    native_alt: 'Wavetable (Saw+Square stack) → Erosion → EQ Eight → Compressor'
  },
  {
    id: 'r03',
    title: 'Crispy Hi-Hats Bus',
    category: 'mixing',
    goal: 'Cohesive, airy hi-hat bus that cuts through without harshness',
    tags: ['drums', 'hi-hats', 'bus', 'mixing'],
    chain: [
      { plugin: 'FabFilter Pro-Q 3', role: 'Clean low end', params: 'HP at 300 Hz 18dB/oct, gentle tilt +1 dB above 8 kHz' },
      { plugin: 'D16 Devastor 2', role: 'Subtle harmonic density', params: 'Model: Diode, Drive 15%, Mix 25%' },
      { plugin: 'FabFilter Pro-C 2', role: 'Glue', params: 'Style: Bus, Threshold −6 dB, Ratio 2:1, Attack 5 ms, Release 60 ms' },
      { plugin: 'Valhalla Room', role: 'Spatial depth', params: 'Predelay 15 ms, Decay 0.6s, Size small, HiCut 9 kHz, Mix 12%' }
    ],
    ableton_notes: 'Group all hat tracks, apply chain on group. Use Utility to widen +20% for stereo spread.',
    native_alt: 'EQ Eight → Saturator (Analog Clip) → Glue Compressor → Reverb (short room)'
  },
  {
    id: 'r04',
    title: 'Vocal Chop — Glitchy & Hypnotic',
    category: 'sound-design',
    goal: 'Create rhythmic, textured vocal stabs for electro/minimal tracks',
    tags: ['vocals', 'creative', 'glitch', 'electro'],
    chain: [
      { plugin: 'Ableton Simpler', role: 'Slice & trigger', params: 'Mode: Slice, Sensitivity 50%, Map to keys, Warp ON' },
      { plugin: 'Arturia Efx REFRACT', role: 'Granular chaos', params: 'Spray 30%, Density 60%, Pitch random ±5st, Feedback 25%, Mix 50%' },
      { plugin: 'Arturia Delay TAPE-201', role: 'Tape echo', params: 'Time synced 1/8 dot, Feedback 30%, Wow 15%, Flutter 10%, Mix 25%' },
      { plugin: 'Valhalla Shimmer', role: 'Ethereal tail', params: 'Feedback 40%, Pitch +12st, Size 70%, Mix 15%' }
    ],
    ableton_notes: 'Bounce vocal chops to audio and rearrange manually for human feel. Automate REFRACT Spray parameter for builds.',
    native_alt: 'Simpler → Beat Repeat → Echo (Tape mode) → Reverb'
  },
  {
    id: 'r05',
    title: 'Stereo Width Master — Mastering Chain',
    category: 'mastering',
    goal: 'Wide, open master that still checks mono-compatible',
    tags: ['mastering', 'stereo', 'width', 'final'],
    chain: [
      { plugin: 'iZotope Ozone 12 Equalizer', role: 'Tonal balance', params: 'Match EQ to reference, then tweak. Keep low end mono below 200 Hz' },
      { plugin: 'iZotope Ozone 12 Imager', role: 'Stereo field', params: 'Band 1 (<200 Hz): 0% (mono), Band 2 (200–2k): +15%, Band 3 (2k–8k): +25%, Band 4 (>8k): +20%' },
      { plugin: 'iZotope Ozone 12 Dynamics', role: 'Glue compression', params: 'Threshold −4 dB, Ratio 2:1, Attack 10 ms, Release auto' },
      { plugin: 'iZotope Ozone 12 Maximizer', role: 'Final ceiling', params: 'Ceiling −1.0 dB True Peak, Threshold to taste (target −8 to −6 LUFS for club), Character: IRC IV' }
    ],
    ableton_notes: 'A/B with Utility in mono at every step. Use Ozone reference panel to compare with a track from your reference playlist.',
    native_alt: 'EQ Eight (M/S mode) → Utility (stereo check) → Multiband Dynamics → Limiter'
  },
  {
    id: 'r06',
    title: 'Parallel Drum Crush',
    category: 'mixing',
    goal: 'Add weight and aggression to drums without losing transients',
    tags: ['drums', 'parallel', 'crush', 'energy'],
    chain: [
      { plugin: 'D16 Redoptor 2', role: 'Tube saturation', params: 'Drive 50%, Bias 30%, Mix 100% (parallel bus)' },
      { plugin: 'FabFilter Pro-C 2', role: 'Heavy squeeze', params: 'Style: Opto, Threshold −20 dB, Ratio 8:1, Attack 0.5 ms, Release 50 ms' },
      { plugin: 'FabFilter Pro-Q 3', role: 'Tone shape', params: 'HP 80 Hz, scoop −4 dB at 400 Hz, boost +3 dB at 4 kHz' },
      { plugin: 'D16 Fazortan 2', role: 'Movement', params: 'Rate 0.2 Hz, Depth 30%, Feedback 20%, Mix 40%' }
    ],
    ableton_notes: 'Create Return track, send drums group −6 dB. Blend crushed signal under clean. Use Utility for level match.',
    native_alt: 'Saturator (Hard Curve) → Compressor (heavy) → EQ Eight → Phaser-Flanger'
  },
  {
    id: 'r07',
    title: 'CS-80 Blade Runner Pad',
    category: 'sound-design',
    goal: 'Lush, evolving analog pad with movement and depth',
    tags: ['pad', 'cs-80', 'ambient', 'atmosphere'],
    chain: [
      { plugin: 'Arturia CS-80 V4', role: 'Sound source', params: 'Layer 1: Saw, Layer 2: Square detuned +5ct, Ring Mod subtle 10%, Sub OSC on, Brilliance 60%, Resonance 20%' },
      { plugin: 'Arturia Chorus DIMENSION-D', role: 'Stereo richness', params: 'Mode 3 (widest), Mix 80%' },
      { plugin: 'Valhalla VintageVerb', role: 'Space', params: 'Algorithm: Concert Hall, Decay 3.5s, Predelay 40ms, HiDamp 6 kHz, ModDepth 30%, Mix 30%' },
      { plugin: 'FabFilter Pro-Q 3', role: 'Clean up', params: 'HP 120 Hz, LP 12 kHz gentle, scoop −2 dB at 300 Hz' }
    ],
    ableton_notes: 'Automate CS-80 Brilliance with slow LFO. Layer with a quiet noise texture underneath for air.',
    native_alt: 'Drift (2 OSC saw + square, chorus on) → Chorus → Reverb → EQ Eight'
  },
  {
    id: 'r08',
    title: 'Sidechain Pump — Musical & Transparent',
    category: 'mixing',
    goal: 'Clean sidechain ducking that breathes with the kick without clicks',
    tags: ['sidechain', 'kick', 'bass', 'groove', 'electro'],
    chain: [
      { plugin: 'Cableguys ShaperBox 3', role: 'Volume shaping', params: 'VolumeShaper: MIDI trigger from kick, Attack 5 ms, Hold 20 ms, Release 120 ms, Depth −12 to −18 dB, Curve smooth' },
      { plugin: 'FabFilter Pro-MB', role: 'Multiband sidechain (optional)', params: 'Solo low band < 200 Hz, external sidechain from kick, Ratio 4:1, fast release' }
    ],
    ableton_notes: 'ShaperBox on bass/pad tracks. Use MIDI sidechain input from a ghost kick MIDI clip (muted track sending MIDI only). For subtler pump, use Ableton Auto Filter in sidechain mode.',
    native_alt: 'Compressor (sidechain from kick, Ratio 4:1, Attack 0.1 ms, Release 100 ms) or Shaper on Rack'
  },
  {
    id: 'r09',
    title: 'Lo-Fi Texture Layer',
    category: 'sound-design',
    goal: 'Add analog warmth and nostalgic texture to any loop or sample',
    tags: ['lo-fi', 'texture', 'creative', 'vibe'],
    chain: [
      { plugin: 'Baby Audio Super VHS', role: 'VHS character', params: 'Body 60%, Wash 40%, Lo-fi 50%, Grit 30%, Mix 100%' },
      { plugin: 'D16 Decimort 2', role: 'Bit reduction', params: 'Bit depth 12, Sample rate 22 kHz, Jitter ON, Mix 45%' },
      { plugin: 'Arturia Tape MELLO-FI', role: 'Tape wobble', params: 'Wow 25%, Flutter 30%, Saturation 40%, Noise 15%, Loss medium' },
      { plugin: 'Valhalla Plate', role: 'Retro plate verb', params: 'Decay 1.8s, Size 60%, HiDamp 4 kHz, Mix 20%' }
    ],
    ableton_notes: 'Use on a parallel return or on a dedicated texture layer duplicating a melody. Automate Decimort sample rate for transitions.',
    native_alt: 'Redux → Erosion → Echo (Tape) → Reverb'
  },
  {
    id: 'r10',
    title: 'Snare / Clap Snap & Body',
    category: 'mixing',
    goal: 'Punchy snare/clap with body and presence, no flabbiness',
    tags: ['snare', 'clap', 'drums', 'transient'],
    chain: [
      { plugin: 'FabFilter Pro-Q 3', role: 'Shape fundamentals', params: 'HP 80 Hz, boost +3 dB at 200 Hz (body), +2 dB at 4–6 kHz (snap), notch any ring 500–800 Hz' },
      { plugin: 'D16 Devastor 2', role: 'Harmonic density', params: 'Model: Foldback, Drive 25%, Mix 30%' },
      { plugin: 'FabFilter Pro-C 2', role: 'Control dynamics', params: 'Style: Vocal, Threshold −6 dB, Ratio 3:1, Attack 2 ms, Release 40 ms' },
      { plugin: 'Eventide SP2016 Reverb', role: 'Short ambience', params: 'Algorithm: Room, Decay 0.4s, Predelay 10 ms, HiCut 8 kHz, Mix 15%' }
    ],
    ableton_notes: 'Layer a short noise burst (Operator sine + noise) under the clap for extra top. Use Drum Buss Transients to enhance snap.',
    native_alt: 'EQ Eight → Saturator → Compressor → Reverb (small room)'
  },
  {
    id: 'r11',
    title: 'Acid Line — Phoscyon Method',
    category: 'sound-design',
    goal: 'Authentic 303-style acid bass with squelch and movement',
    tags: ['acid', '303', 'bass', 'electro', 'classic'],
    chain: [
      { plugin: 'D16 Phoscyon 2', role: '303 emulation', params: 'Cutoff 40%, Resonance 70%, Env Mod 80%, Decay 55%, Accent ON for key notes, Slide on tied notes' },
      { plugin: 'D16 Devastor 2', role: 'Drive', params: 'Model: Tube 2, Drive 35%, Mix 50%' },
      { plugin: 'Arturia Delay BRIGADE', role: 'BBD delay', params: 'Time 1/8, Feedback 30%, Rate 0.8 Hz, Depth 20%, Mix 20%' },
      { plugin: 'FabFilter Pro-Q 3', role: 'Mix seat', params: 'HP 40 Hz, notch −3 dB at 250 Hz if muddy, shelf +1 dB at 2 kHz' }
    ],
    ableton_notes: 'Program accents and slides in MIDI clip. Automate Phoscyon Cutoff for breakdowns. Group and sidechain from kick.',
    native_alt: 'Wavetable (303 wavetable) → Saturator → Simple Delay → EQ Eight'
  },
  {
    id: 'r12',
    title: 'Reverb Bus — Club Space',
    category: 'mixing',
    goal: 'Cohesive spatial glue for the mix, sounds like one room',
    tags: ['reverb', 'bus', 'space', 'mixing', 'club'],
    chain: [
      { plugin: 'FabFilter Pro-Q 3', role: 'Pre-reverb filter', params: 'HP 250 Hz, LP 8 kHz — keep mud and sizzle out of reverb input' },
      { plugin: 'Valhalla VintageVerb', role: 'Main space', params: 'Algorithm: Smooth Plate, Decay 1.4s, Predelay 25 ms, HiDamp 5 kHz, ModDepth 20%, Mix 100% (send)' },
      { plugin: 'FabFilter Pro-C 2', role: 'Duck reverb tail', params: 'Sidechain from drum bus, Style: Vocal, Threshold −10 dB, Ratio 3:1, fast release 60 ms' }
    ],
    ableton_notes: 'Set up as Return track at 0 dB. Send from synths and vocals at −12 to −8 dB. Do not send kicks or subs. Sidechain the return from drum bus to keep drums clear.',
    native_alt: 'EQ Eight → Reverb → Compressor (sidechain)'
  },
  {
    id: 'r13',
    title: 'Serum 2 Reese Bass',
    category: 'sound-design',
    goal: 'Massive detuned bass with controlled low end for DnB/electro crossover',
    tags: ['bass', 'reese', 'serum', 'sound-design'],
    chain: [
      { plugin: 'Xfer Serum 2', role: 'Source', params: 'OSC A: Saw, OSC B: Saw +7 Voices Detune 15%, Unison, Filter LP 24dB cutoff 60%, Reso 10%, LFO1 → Filter slow' },
      { plugin: 'D16 Devastor 2', role: 'Grit layer', params: 'Model: Diode, Drive 30%, Mix 35%' },
      { plugin: 'FabFilter Pro-Q 3', role: 'Low end control', params: 'HP 28 Hz, dynamic bell −3 dB at 200 Hz, boost +2 dB at 1 kHz for growl' },
      { plugin: 'FabFilter Pro-MB', role: 'Multiband taming', params: 'Low band < 120 Hz: compress 3:1, mid band solo 120–500 Hz: light 2:1' }
    ],
    ableton_notes: 'Duplicate bass track, HP one at 200 Hz (top), LP the other at 200 Hz (sub). Process separately for max control.',
    native_alt: 'Wavetable (Saw detune) → Saturator → EQ Eight → Multiband Dynamics'
  },
  {
    id: 'r14',
    title: 'Pre-Master Loudness Check',
    category: 'mastering',
    goal: 'Final loudness and dynamics check before mastering delivery',
    tags: ['mastering', 'loudness', 'LUFS', 'final'],
    chain: [
      { plugin: 'FabFilter Pro-Q 3', role: 'Last corrective EQ', params: 'Only surgical moves: fix resonances, check low-end mono (M/S mode), no broad boosts >2 dB' },
      { plugin: 'FabFilter Pro-L 2', role: 'Transparent limiting', params: 'Style: Transparent, Ceiling −1.0 dB TP, push threshold until −9 to −7 LUFS integrated. Watch for >3 dB GR — back off if so.' },
      { plugin: 'iZotope Ozone 12 Maximizer', role: 'Compare / alternative', params: 'IRC IV, same ceiling, A/B against Pro-L 2 to pick best-sounding limiter on this track' }
    ],
    ableton_notes: 'Use Ableton Loudness Meter (Audio Effects) to monitor LUFS. Export at 24-bit WAV. Keep headroom if sending to external mastering.',
    native_alt: 'EQ Eight (surgical) → Limiter → Utility (mono check)'
  }

  ,{
    id: 'r15',
    title: 'Roomy Top Loop Lift',
    category: 'mixing',
    goal: 'Make a flat top loop feel wider, airier, and more expensive without turning harsh.',
    tags: ['top-loop', 'air', 'width', 'mixing'],
    chain: [
      { plugin: 'FabFilter Pro-Q 3', role: 'Tilt and clean', params: 'HP 180 Hz, shelf +1.5 dB from 9 kHz, trim −2 dB at 3.5 kHz if splashy' },
      { plugin: 'Eventide MicroPitch', role: 'Stereo lift', params: 'Detune −6 / +6 cents, Delay 8 / 12 ms, Mix 22%' },
      { plugin: 'FabFilter Pro-C 2', role: 'Bus catch', params: 'Style: Bus, Ratio 2:1, Attack 12 ms, Release 70 ms, 1–2 dB GR max' }
    ],
    ableton_notes: 'Keep hats centered enough to survive mono. Use Utility Width to A/B against a narrower version.',
    native_alt: 'EQ Eight → Chorus-Ensemble → Compressor'
  },
  {
    id: 'r16',
    title: 'Indie Dance Lead — Clean Pressure',
    category: 'sound-design',
    goal: 'Bright but controlled lead that cuts above drums without sounding EDM-cheesy.',
    tags: ['lead', 'indie-dance', 'pressure', 'melodic'],
    chain: [
      { plugin: 'Arturia Mini V4', role: 'Core tone', params: '2 saw oscillators, slight detune, filter cutoff 55%, emphasis 20%, env amount 45%' },
      { plugin: 'FabFilter Saturn 2', role: 'Upper-mid bite', params: 'Warm Tape, Drive 15%, multiband split at 1.8 kHz, top band mix 55%' },
      { plugin: 'FabFilter Pro-Q 3', role: 'Seat in mix', params: 'HP 120 Hz, dynamic dip −2 dB at 2.6 kHz when snare hits, shelf +1 dB at 9 kHz' }
    ],
    ableton_notes: 'Automate filter env amount instead of only cutoff to keep phrases expressive.',
    native_alt: 'Analog → Saturator → EQ Eight'
  },
  {
    id: 'r17',
    title: 'Low-End Split — Bass + Kick Treaty',
    category: 'mixing',
    goal: 'Make kick and bass coexist without constant masking or over-sidechaining.',
    tags: ['low-end', 'kick', 'bass', 'translation'],
    chain: [
      { plugin: 'FabFilter Pro-Q 3', role: 'Dynamic carve', params: 'Dynamic bell on bass at kick fundamental, −2 to −4 dB, external sidechain from kick' },
      { plugin: 'FabFilter Pro-MB', role: 'Sub-only control', params: 'Band below 110 Hz, Ratio 3:1, sidechain from kick, release 90 ms' },
      { plugin: 'Youlean Loudness Meter', role: 'Level discipline', params: 'Watch integrated and short-term while A/Bing kick+bass together' }
    ],
    ableton_notes: 'Decide first who owns 45–65 Hz and who owns 80–110 Hz. Do not let both fight for both zones.',
    native_alt: 'EQ Eight dynamic workaround with Auto Filter sidechain + Multiband Dynamics'
  },
  {
    id: 'r18',
    title: 'Club Vocal Front — Dry Before Wet',
    category: 'mixing',
    goal: 'Keep the vocal intelligible and upfront before adding any atmospheric treatment.',
    tags: ['vocal', 'front', 'club', 'clarity'],
    chain: [
      { plugin: 'FabFilter Pro-Q 3', role: 'Subtract first', params: 'HP 90 Hz, broad dip −2 dB at 250 Hz, dynamic tame around 2.8–4 kHz if sharp' },
      { plugin: 'FabFilter Pro-DS', role: 'Sibilance control', params: 'Single Vocal mode, threshold to catch only the hardest esses' },
      { plugin: 'FabFilter Pro-C 2', role: 'Stable front placement', params: 'Style: Vocal, Ratio 3:1, Attack 8 ms, Release 70 ms, aim 3 dB GR' }
    ],
    ableton_notes: 'Keep the dry vocal working first. Add sends only after you can understand every phrase on laptop speakers.',
    native_alt: 'EQ Eight → De-esser → Compressor'
  },
  {
    id: 'r19',
    title: 'Master Cleanup — Last 5 Percent',
    category: 'mastering',
    goal: 'A final restraint chain for tracks that are almost done and only need discipline.',
    tags: ['mastering', 'cleanup', 'restraint', 'final'],
    chain: [
      { plugin: 'FabFilter Pro-Q 3', role: 'Tiny corrective moves', params: 'Only 0.5–1.5 dB moves max; fix one resonance, one tilt issue, and leave the rest alone' },
      { plugin: 'FabFilter Pro-L 2', role: 'Ceiling and control', params: 'Transparent, ceiling −1 dBTP, push only until the track feels alive, not crushed' },
      { plugin: 'Metric AB', role: 'Reference sanity', params: 'A/B against 2 references matched in perceived level, not just raw loudness' }
    ],
    ableton_notes: 'If you are making five broad boosts, you are still mixing, not mastering.',
    native_alt: 'EQ Eight → Limiter → reference track on another channel'
  },
  {
    id: 'r20',
    title: 'Broken Machine Percussion',
    category: 'sound-design',
    goal: 'Create a gritty percussive layer with movement for electro and minimal transitions.',
    tags: ['perc', 'machine', 'grit', 'transition'],
    chain: [
      { plugin: 'Ableton Drum Rack', role: 'Source stack', params: 'Layer metallic one-shots, muted claps, and noise bursts across pads' },
      { plugin: 'D16 Nepheton 2', role: 'Machine flavor', params: 'Route hats/cowbells lightly, resample slices, keep only fragments that swing' },
      { plugin: 'FabFilter Volcano 3', role: 'Animated filtering', params: '2-band morph, envelope follower on band 2, resonance 18%, stereo spread low' }
    ],
    ableton_notes: 'Resample, chop, then commit. The best machine percussion often appears after one destructive bounce.',
    native_alt: 'Drum Rack → Auto Filter → Beat Repeat'
  }

];
