# CuePoint — kit de com

> Remplace `LIEN` par l'URL Vercel une fois déployée. Mets-le en bio Instagram (IG n'autorise pas les liens cliquables en légende).

## Visuels prêts (dans `assets/`)

- `assets/ig-post.svg` — post carré 1080×1080 (écran verdict). **Pour Instagram : ouvre le SVG dans un navigateur → screenshot, ou convertis-le en PNG** (ex. [svgtopng.com](https://svgtopng.com) ou « Exporter » dans Figma/Inkscape).
- `assets/ig-story.svg` — story 9:16 (1080×1920), le flux dépose → écoute → fix.
- `assets/readme-triptych.svg` — le triptyque affiché dans le README (déjà branché).

Ces visuels sont des **mockups SVG** fidèles au design — postables tels quels. Tu peux les remplacer plus tard par de vraies captures de l'app si tu veux.

---

## Hooks de légende alternatifs (FR)

1. **« Ton mix te ment. Cue, lui, non. »**
   Dépose ton track dans le navigateur — une vraie analyse DSP tourne en local (LUFS, true peak, phase, spectre) et Cue te dit LA seule chose à corriger, en français de prod. Pas d'upload, pas de bluff, gratuit. FR/EN. Lien en bio.

2. **« Une analyse. Un fix. Zéro blabla. »**
   Pas de note sur 100, pas de dashboard à 40 courbes. Cue écoute ton son et sort une priorité + la chaîne de plugins pour la régler. Tout reste sur ta machine. Deep house, techno, dub, garage, ambient — c'est fait pour toi. github.com/arochab/cuepoint

---

## Séquence de publication sur 3 jours

**Jour 1 — amorce privée (DM)** : message 1-à-1 à 10-15 producteurs de confiance (le DM ci-dessous). Objectif : premiers retours bruts + premières étoiles GitHub avant le public.

**Jour 2 — sortie publique** : poste le carré (`ig-post`) avec le hook 1. Enchaîne la story (`ig-story`) avec sticker « lien en bio » + un sondage (« ton dernier mix : trop de sub ? »). La story renvoie au post, le post au repo.

**Jour 3 — communautés** : partage le triptyque dans r/edmproduction, r/WeAreTheMusicMakers, et 2-3 Discord de prod. Cadre « show, don't sell » : outil gratuit, 100% local, une analyse = un fix. Réponds à chaque commentaire dans l'heure.

---

## Positionnement (one-liner, FR)

Tu poses ton track dans le navigateur, une vraie analyse l'écoute (LUFS, true peak, phase, spectre — tout en local, rien n'est uploadé), et Cue te donne UN seul correctif prioritaire en français de producteur, puis te guide jusqu'au fix.

---

## Instagram — légende du post (FR)

J'ai construit un petit outil pour moi, et je le partage.

CuePoint. Tu déposes ton track dans le navigateur. Une vraie analyse l'écoute — LUFS intégré (BS.1770), true peak, corrélation de phase, spectre tiers d'octave. Et au lieu de te noyer sous 12 chiffres, Cue te dit UNE seule chose à corriger en premier, en français, comme un pote en studio te dirait « ton bas mange les mids, file un étage au kick ». Puis il te montre la chaîne de plugins pour le faire.

Deux trucs auxquels je tiens :

1. Ça ne bluffe jamais. Cue n'écoute vraiment que 5 choses (clash kick/basse, phase/mono, aigus durs, loudness/headroom, « c'est prêt ? »). S'il n'entend rien, il te le dit. Et il affiche ce qu'il a mesuré, en clair, sous le verdict.

2. Ton audio ne quitte pas ton navigateur. Tout le DSP tourne en local. Rien n'est uploadé nulle part.

Pensé pour nos styles : deep house, minimal, techno, dub techno, electro, acid, UK garage, ambient. Gratuit. FR/EN.

Si tu galères toujours au moment « ok mais je corrige quoi en premier », teste-le et dis-moi ce qui cloche. Lien en bio.

---

## Instagram — story (FR), 5 frames

1. **Frame 1** — Texte : « Tu bounce. Quelque chose cloche. Mais tu corriges QUOI en premier ? » — Visuel : fond Slate sombre, le droplet Cue qui respire au centre.
2. **Frame 2** — Texte : « Tu déposes le track. Rien n'est uploadé — tout tourne dans ton navigateur. » — Visuel : l'écran d'accueil, le drag-and-drop du fichier sur le droplet.
3. **Frame 3** — Texte : « Une VRAIE analyse l'écoute. LUFS, true peak, phase, spectre. » — Visuel : le stepper 4 étapes pendant l'écoute, le droplet qui pulse en cyan sur la progression réelle.
4. **Frame 4** — Texte : « Un seul correctif prioritaire. En français de prod. Pas 12 chiffres. » — Visuel : l'écran verdict — le mot en Fraunces + la phrase + le reçu d'honnêteté (entendu : bas +6 dB · phase ok · pic -0.4 dBTP).
5. **Frame 5** — Texte : « Puis il te guide jusqu'au fix. Gratuit. Lien en bio 👆 » — Visuel : la worklist de la recette (chaîne de plugins), sticker lien.

---

## DM aux potes producteurs (FR)

Hey ! J'ai bricolé un truc qui pourrait te servir. Ça s'appelle CuePoint : tu déposes un track dans le navigateur, ça l'analyse pour de vrai (LUFS, true peak, phase, spectre — rien n'est uploadé, tout reste en local) et au lieu de te sortir 12 chiffres, ça te dit LE seul truc à corriger en premier, en français, et ça te montre la chaîne pour le faire. C'est calé pour nos styles (deep house, minimal, techno, dub, electro, acid, garage, ambient). C'est gratuit. Si tu as 2 min, balance-lui un de tes bounces et dis-moi si le verdict te parle ou s'il dit n'importe quoi — c'est exactement le retour qu'il me faut. 🙏

---

## Blurb recruteur / LinkedIn (EN)

CuePoint — a browser-based audio-analysis app for electronic-music producers. The DSP is real and client-side: BS.1770-4 integrated LUFS, 4×-oversampled true peak, phase correlation, 1/3-octave FFT and spectral tilt, plus an audio-reactive Three.js shader droplet. Stack: Svelte 5 + Vite 6 + Tailwind v4 + Supabase. The audio never leaves the browser — only derived numbers ever touch the network.

The product is the artifact; the process is the showcase. I built it with Claude Code using a heavy multi-agent workflow, used adversarially against my own work. I stood up an internal agent "jury" (Jobs/Ive/Musk lenses, a mastering engineer, a localization persona) to audit the real running app — it flagged the first build hard, which forced a deletion-driven redesign down to a zero-card, single-column UI ("Silence"). The credible part isn't the self-scoring, it's the verification discipline: one workflow confidently hallucinated a scene architecture that didn't exist in the codebase, and I caught it by checking the real file tree and discarded its output. The honesty engine — no-bluff DSP→need routing off an explicit `recipe.need` field, so the tool structurally cannot offer a fix the measurement doesn't support — and the real 4-stage progress bar were built and verified in a live preview loop.

Part of the same body of work as claude-eats-tokens, kapman-news, prism and brandpulse-app. Adam Chabbi · GitHub @arochab.

---

## Hashtags

#musicproduction #homestudio #mixing #mastering #deephouse #minimaltechno #dubtechno #ukgarage #ableton #producerlife #lufs #audiodsp

---

## Brief visuel

Trois temps, fond Slate (`#16181D`), une seule couleur d'accent (Tide cyan `#36C9D6`), zéro carte, typo serif Fraunces pour les mots-clés.

1. Le droplet 3D liquid-glass « Cue » seul au centre qui respire — pendant l'analyse il pulse en cyan sur la progression réelle des étapes DSP ; capter idéalement la seconde du verdict où il rejoue l'enveloppe RMS réelle du morceau.
2. L'écran verdict : un seul mot en Fraunces, une phrase de producteur en dessous, et surtout le « reçu d'honnêteté » aligné à droite (ex : « entendu : bas +6 dB · phase ok · pic -0.4 dBTP · -9.2 LUFS ») — la preuve que ça ne bluffe pas.
3. La worklist du fix : la chaîne de plugins en liste nue, le « guide-moi ». Tout doit respirer, beaucoup de noir, un seul objet par écran.
