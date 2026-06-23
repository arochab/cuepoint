// CuePoint i18n spine — built from scratch (the UX jury confirmed none existed).
//
// Svelte 5 module-state rules (see CLAUDE.md):
//  - this file is .svelte.ts because it holds a rune ($state) outside a component
//  - we NEVER reassign the exported `i18n` object; we mutate i18n.locale in place
//    (Svelte 5 refuses to compile a reassigned exported $state)
//
// Default locale is FR: CuePoint is built for a French producer who wants it to
// speak his language on first paint. EN is one tap away in the Nav.
//
// Keys are authored for the screens that actually exist after the jury redesign:
// the 5 producer-voice need-chips, the cold-entry question, STEP/ÉTAPE eyebrows,
// the verdict CTA, the per-issue "the move" titles, plus Nav/Home/Auth/genres.

export type Locale = 'fr' | 'en';

const STORAGE_KEY = 'cuepoint.locale.v1';

type Dict = Record<string, string>;

// --- FRENCH (default) — producer-to-producer tutoiement, studio jargon kept in EN
//     where that is how French producers actually speak (kick, mono, LUFS, true peak).
const fr: Dict = {
  // Nav
  'nav.analyzer': 'Analyseur',
  'nav.projects': 'Projets',
  'nav.admin': 'Admin',
  'nav.workspace': 'Espace',
  'nav.signout': 'Se déconnecter',
  'nav.getAccess': 'Se connecter',
  'nav.connected': 'Connecté',
  'nav.subtitle': 'Une oreille de studio, dans ton navigateur',

  // Home ("Silence" redesign: one invitation + one whisper, the whole screen is the door)
  'home.invite': 'Dépose un bounce.',
  'home.whisper': 'Cue écoute, puis te dit la seule chose à corriger.',
  'home.dropNow': 'lâche-le',
  'home.knowAlready': 'je sais déjà',
  'home.openProjects': 'Mes projets',
  'home.checkMix': 'Analyser un mix',

  // Analyzer — upload
  'an.step01': 'ÉTAPE 01 / DÉPÔT',
  'an.dropTitle1': 'DÉPOSE UN',
  'an.dropTitle2': 'BOUNCE',
  'an.uploadLede': 'Ton morceau, ta machine. Cue écoute quelques secondes et te dit la seule chose à corriger en premier.',
  'an.whatIsIt': "C'EST QUOI ?",
  'an.dropCta': 'Dépose un morceau ou clique',
  'an.dropPrivacy': 'MP3 / WAV · RIEN NE QUITTE TON NAVIGATEUR',
  'an.knowAlready': 'Tu sais déjà ce qui cloche ?',

  // Analyzer — listening
  'an.step02': 'ÉTAPE 02 / ÉCOUTE',
  'an.listening': 'Cue écoute',
  'an.scanning': 'ANALYSE',
  'an.stepDecode': 'Décodage audio',
  'an.stepLoudness': 'Mesure du loudness',
  'an.stepMasking': 'Recherche de masquage',
  'an.stepPick': 'Sélection de ton fix #1',

  // Analyzer — error
  'an.errorTitle': 'LECTURE IMPOSSIBLE',
  'an.error': "Impossible d'analyser ce fichier. Essaie un export WAV, MP3 ou FLAC standard.",
  'an.tryAnother': 'Essayer un autre fichier',

  // Analyzer — listening stepper stages (honest, real DSP progress)
  'an.stageDecode': 'décodage',
  'an.stageLoudness': 'loudness',
  'an.stageTruepeak': 'true peak',
  'an.stageSpectrum': 'le fix',

  // Analyzer — verdict
  'an.theOneThing': 'LA SEULE CHOSE',
  'an.walkMeThrough': 'guide-moi',
  'an.numbers': 'les chiffres',
  'an.hide': 'masquer',
  'an.share': 'partager',
  'an.analyzeAnother': 'analyser un autre',
  'an.mixScore': 'mix score',
  'an.evidence': 'les chiffres',
  'an.pinProject': 'épingler à un projet…',
  'an.pinIt': 'épingler',
  'an.saving': 'enregistrement…',
  'an.saved': 'enregistré',
  'an.genreCorrect': 'pas le bon style ?',

  // Verdict words (3-answer system)
  'verdict.ship': 'ENVOIE',
  'verdict.almost': 'PRESQUE',
  'verdict.work': 'PAS ENCORE',

  // Stats
  'stat.loudness': 'LOUDNESS',
  'stat.truePeak': 'TRUE PEAK',
  'stat.mono': 'MONO',

  // Step 04 — The Continuation (the fix worklist)
  'fix.step04': 'LA SOLUTION',
  'fix.moreRoutes': 'autres routes',
  'fix.characterLane': 'tu explores juste des sons ? par caractère',
  'fix.openRoute': 'la route complète',
  'fix.stepCount': 'étape',
  'fix.stepOf': 'sur',
  'fix.native': 'en natif Ableton',
  'fix.notes': 'les notes',
  'fix.closing': 'Reprends ton bounce quand t’as fait ça.',

  // The 5 producer-voice needs (cold-entry chips) — validated by the jury
  'need.low-end': 'Mon kick et ma basse se battent',
  'need.phase': 'Des éléments disparaissent en mono',
  'need.top-end': 'Le haut du spectre est trop dur',
  'need.loudness': "C'est trop fort, ou pas assez",
  'need.healthy': "Je veux juste savoir si c'est prêt",
  'need.character': 'Ajouter du caractère',

  // Cold-entry "The Question" — a typeset contents page of the 5 needs
  'cold.question': "C'est quoi qui te gêne ?",
  'cold.sub': 'Choisis ce que tu entends. Cue te donne la route, pas un catalogue.',
  'cold.characterFooter': 'ou explore le caractère · un seul son à la fois',
  'cold.mustHear': 'ça, faut que je l’écoute — dépose le bounce.',
  'cold.back': '← retour',
  // short need labels for the contents-page rows (the dot-leader version)
  'coldrow.low-end': 'le bas (kick & basse)',
  'coldrow.phase': 'la largeur (mono)',
  'coldrow.top-end': 'le haut (dur / brillant)',
  'coldrow.loudness': 'le volume',
  'coldrow.healthy': 'est-ce que c’est prêt ?',
  'coldtag.low-end': 'bas',
  'coldtag.phase': 'phase',
  'coldtag.top-end': 'haut',
  'coldtag.loudness': 'loudness',
  'coldtag.healthy': 'à l’écoute',

  // Projects — memory timeline
  'projects.title': 'ce que t’as déjà entendu',
  'projects.keepIt': 'garder ça ? — connecte-toi.',
  'projects.empty': 'rien encore. dépose un bounce.',
  'projects.newProject': '+ nouveau',

  // "The move" titles per IssueType (recommendationFor) — FR
  'move.headroom': 'Un limiteur true-peak',
  'move.phase': 'Un correcteur de mono / corrélation',
  'move.top-end': 'Un shelf doux dans le haut, pas un boost',
  'move.low-end': 'Répartis le kick et la basse',
  'move.loudness': 'Un loudness-mètre fiable',
  'move.healthy': 'Une référence en laquelle tu as confiance',

  // Auth (de-jargoned)
  'auth.title': 'Sauvegarde tes morceaux et laisse Cue suivre ta progression.',
  'auth.googleSub': 'Un tap avec Google. Pas de mot de passe, pas de spam.',
  'auth.google': 'Continuer avec Google',
  'auth.orEmail': 'ou par email',
  'auth.emailPlaceholder': 'ton@email.com',
  'auth.emailCta': 'Reçois un lien par email',
  'auth.emailSent': 'Lien envoyé. Vérifie ta boîte mail.',

  // Genre chips
  'genre.deep-house': 'Deep House',
  'genre.minimal': 'Minimal',
  'genre.techno': 'Techno',
  'genre.dub-techno': 'Dub Techno',
  'genre.electro': 'Electro',
  'genre.acid': 'Acid',
  'genre.uk-garage': 'UK Garage',
  'genre.ambient': 'Ambient',
  'genre.other': 'Pas sûr',
};

// --- ENGLISH
const en: Dict = {
  'nav.analyzer': 'Analyzer',
  'nav.projects': 'Projects',
  'nav.admin': 'Admin',
  'nav.workspace': 'Workspace',
  'nav.signout': 'Sign out',
  'nav.getAccess': 'Get access',
  'nav.connected': 'Connected',
  'nav.subtitle': 'A studio ear, in your browser',

  'home.invite': 'Drop a bounce.',
  'home.whisper': 'Cue listens, then tells you the one thing to fix.',
  'home.dropNow': 'let it go',
  'home.knowAlready': 'I already know',
  'home.openProjects': 'My projects',
  'home.checkMix': 'Analyze a mix',

  'an.step01': 'STEP 01 / UPLOAD',
  'an.dropTitle1': 'DROP A',
  'an.dropTitle2': 'BOUNCE',
  'an.uploadLede': 'Your track, your machine. Cue listens for a few seconds and tells you the one thing to fix first.',
  'an.whatIsIt': 'WHAT IS IT?',
  'an.dropCta': 'Drop a track or click',
  'an.dropPrivacy': 'MP3 / WAV · NOTHING LEAVES YOUR BROWSER',
  'an.knowAlready': 'Already know what is wrong?',

  'an.step02': 'STEP 02 / LISTENING',
  'an.listening': 'Cue is listening',
  'an.scanning': 'SCANNING',
  'an.stageDecode': 'decode',
  'an.stageLoudness': 'loudness',
  'an.stageTruepeak': 'true peak',
  'an.stageSpectrum': 'the fix',

  'an.errorTitle': 'COULD NOT READ',
  'an.error': 'Could not analyze this file. Try a standard WAV, MP3, or FLAC export.',
  'an.tryAnother': 'Try another file',

  'an.theOneThing': 'THE ONE THING',
  'an.walkMeThrough': 'walk me through it',
  'an.numbers': 'the numbers',
  'an.hide': 'hide',
  'an.share': 'share',
  'an.analyzeAnother': 'analyze another',
  'an.mixScore': 'mix score',
  'an.evidence': 'the numbers',
  'an.pinProject': 'pin to a project…',
  'an.pinIt': 'pin it',
  'an.saving': 'saving…',
  'an.saved': 'saved',
  'an.genreCorrect': 'wrong style?',

  'verdict.ship': 'SEND IT',
  'verdict.almost': 'ALMOST',
  'verdict.work': 'NOT YET',

  'stat.loudness': 'LOUDNESS',
  'stat.truePeak': 'TRUE PEAK',
  'stat.mono': 'MONO',

  'fix.step04': 'THE FIX',
  'fix.moreRoutes': 'more routes',
  'fix.characterLane': 'just exploring sounds? by character',
  'fix.openRoute': 'the full route',
  'fix.stepCount': 'step',
  'fix.stepOf': 'of',
  'fix.native': 'native Ableton',
  'fix.notes': 'the notes',
  'fix.closing': 'Take your bounce back once you’ve done that.',

  'need.low-end': 'My kick and bass are fighting',
  'need.phase': 'Things vanish in mono',
  'need.top-end': 'The top end is too harsh',
  'need.loudness': 'Too loud, or not loud enough',
  'need.healthy': 'I just want to know if it is ready',
  'need.character': 'Add character',

  'cold.question': 'What is bothering you?',
  'cold.sub': 'Pick what you hear. Cue hands you the route, not a catalog.',
  'cold.characterFooter': 'or explore character · one sound at a time',
  'cold.mustHear': 'that one I have to hear — drop the bounce.',
  'cold.back': '← back',
  'coldrow.low-end': 'the low (kick & bass)',
  'coldrow.phase': 'the width (mono)',
  'coldrow.top-end': 'the top (harsh / bright)',
  'coldrow.loudness': 'the volume',
  'coldrow.healthy': 'is it ready?',
  'coldtag.low-end': 'low',
  'coldtag.phase': 'phase',
  'coldtag.top-end': 'top',
  'coldtag.loudness': 'loudness',
  'coldtag.healthy': 'listen',

  'projects.title': 'what you have already heard',
  'projects.keepIt': 'keep this? — sign in.',
  'projects.empty': 'nothing yet. drop a bounce.',
  'projects.newProject': '+ new',

  'move.headroom': 'A true-peak limiter',
  'move.phase': 'A mono-maker / correlation tool',
  'move.top-end': 'A gentle high shelf, not a boost',
  'move.low-end': 'Carve kick and bass ownership',
  'move.loudness': 'A loudness meter you trust',
  'move.healthy': 'One trusted reference track',

  'auth.title': 'Save your tracks and let Cue remember your progress.',
  'auth.googleSub': 'One tap with Google. No password, no spam.',
  'auth.google': 'Continue with Google',
  'auth.orEmail': 'or use email',
  'auth.emailPlaceholder': 'you@email.com',
  'auth.emailCta': 'Get a link by email',
  'auth.emailSent': 'Link sent. Check your inbox.',

  'genre.deep-house': 'Deep House',
  'genre.minimal': 'Minimal',
  'genre.techno': 'Techno',
  'genre.dub-techno': 'Dub Techno',
  'genre.electro': 'Electro',
  'genre.acid': 'Acid',
  'genre.uk-garage': 'UK Garage',
  'genre.ambient': 'Ambient',
  'genre.other': 'Not sure',
};

const DICTS: Record<Locale, Dict> = { fr, en };

function detectInitial(): Locale {
  // Hard-default FR (user decision). Honour a stored choice if present; never auto-detect.
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'fr' || saved === 'en') return saved;
  } catch { /* non-fatal */ }
  return 'fr';
}

// The exported reactive object. Mutate i18n.locale; never reassign i18n itself.
export const i18n = $state<{ locale: Locale }>({ locale: detectInitial() });

export function setLocale(next: Locale): void {
  i18n.locale = next; // in-place mutation — safe for an exported $state object property
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* non-fatal */ }
}

export function toggleLocale(): void {
  setLocale(i18n.locale === 'fr' ? 'en' : 'fr');
}

// t(key) reads i18n.locale, so any component using it re-renders on locale change.
// Falls back to the EN string, then the raw key, so a missing key is visible, not blank.
export function t(key: string): string {
  return DICTS[i18n.locale][key] ?? en[key] ?? key;
}
