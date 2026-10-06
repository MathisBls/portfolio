# Easter egg n° 2 : « Le Sanctuaire » (storyboard du 2026-10-06)

Demande de Mathis (2026-10-06, soir) : un easter egg après l'easter egg, où ça part encore plus loin.
- **Le cœur** : une montagne géante qui sort du sol dans un tremblement de terre, avec des chœurs qui chantent tout autour.
- **Le ton** : extravagant, environ 2 minutes, sur sa version épique de la musique du parc (`MajesticBTV.mp3`).
- **L'activation** : à la fin de l'animation, taper `boulardtv` au clavier, tout collé.
- **« Je te laisse improviser le reste »** : la suite ci-dessous est notre improvisation.

**Règles inchangées** :
- visuels SFW ;
- aucun lien vers la plateforme ;
- jamais de flash au-delà de 3 par seconde (WCAG 2.3.1), éclairs compris ;
- reduced-motion respecté ;
- Échap sort à tout moment ;
- 60 fps desktop visés.

**Rien n'est publié** (lien de démo, push) avant le feu vert de Mathis.

## Déclencheur

- **Uniquement après le premier easter egg joué jusqu'au bout** (précision de Mathis) : pendant son stage `finale` (dérive face au B du parc), jamais depuis la page ni plus tôt dans la séquence. Le saut de debug `?easter-at` ne compte pas comme « joué ». Saisie de `boulardtv`, insensible à la casse.
  - Détecteur à mémoire glissante comme `konami.ts`, testé.
  - Inactif si le focus est dans un champ.
- **Indice discret** : quand le final commence, le HUD du cockpit affiche `AWAITING PASSWORD_`, avec un caret lent (0.9 Hz). Texte dans `site.easter.hud`.
- **Mobile, sans clavier** : 5 tapes rapides sur l'overlay pendant le final (même indice). Décision d'implémentation libre si c'est plus élégant, mais il faut une voie tactile.
- **Le dernier caractère tapé est un geste utilisateur** : la musique (élément `<audio>` en streaming, comme `park`) démarre dans ce keydown. C'est ce qui débloque iOS.
- **Retour automatique** : il ne doit plus ramener la page pendant ce second niveau.

## L'histoire

Le signal BoulardTV venait d'une planète. Le mot de passe ouvre son sanctuaire. On y descend, la terre gronde, la montagne sacrée surgit, et un chœur de colosses de pierre se lève pour chanter autour d'elle.

À son sommet, un **prisme géant** reçoit leur lumière et la renvoie en spectre dans le ciel. C'est le concept du site (une lumière entre, un spectre sort), à l'échelle d'une planète. La boucle est bouclée.

## Séquence (durées indicatives, calées ensuite sur les repères de la musique)

| #   | Beat                 | ≈ Durée   | Image                                                                                                                                                                                                                                                                                                   | Son                                                          |
| --- | -------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 0   | Accès                | 3 s       | Le HUD tape `ACCESS GRANTED`. Le B du parc se contracte en un point de lumière, comme le faisceau du tout début.                                                                                                                                                                                       | La musique du parc s'éteint en fondu, puis silence           |
| 1   | Entrée atmosphérique | 8 s       | Piqué vers une planète proche, plasma orange et rose autour de la verrière, vibration, nuages traversés.                                                                                                                                                                                                | Intro calme de MajesticBTV                                   |
| 2   | La plaine            | 10–12 s   | Le vaisseau débouche au ras d'une immense plaine au crépuscule : sable noir, sel qui reflète le ciel, deux lunes, un arc d'anneaux. Calme. Les cailloux commencent à sautiller.                                                                                                                       | Montée                                                       |
| 3   | Le séisme            | 15–20 s   | La caméra tremble par rampes. Des fissures rose et magma courent sur le sol, des nuages de poussière se lèvent, des rochers sautent.                                                                                                                                                                    | Percussions                                                  |
| 4   | La montagne          | 25–30 s   | **Une montagne gigantesque (kilométrique) sort du sol** devant nous : glissements de terrain, cascades de sable, roches qui tombent. Le vaisseau recule et grimpe pour garder le cadre. Sur sa face, **un B monumental sculpté**, façon Mont Rushmore.                                                    | Plein orchestre                                              |
| 5   | Le chœur             | 20–25 s   | **12 colosses encapuchonnés** (≈ 80 m) surgissent en cercle autour de la montagne, au moment où le chœur entre dans la musique. Leurs visages et leurs mains s'illuminent. La caméra tourne autour d'eux, et des faisceaux partent vers le sommet.                                                         | Chœurs                                                       |
| 6   | Le prisme            | 15 s      | Le sommet s'ouvre sur un **prisme de verre géant**. Les faisceaux du chœur y convergent, il renvoie un **spectre arc-en-ciel immense** dans le ciel, qui se change en aurore. Le B sculpté s'allume.                                                                                                     | Climax                                                       |
| 7   | Sortie               | 10–12 s   | Le vaisseau s'élève au-dessus des nuages, avec la silhouette de la montagne sous l'aurore. Fondu au noir, puis `THANKS FOR PLAYING` (site.easter), puis retour à la page.                                                                                                                              | Cadence finale                                               |

Total ≈ 2 min à 2 min 15, selon le montage de la musique.

## Reduced-motion et mobile

- **Reduced-motion** : fondus entre plans fixes (plaine, montagne levée, chœur, spectre, sortie). Pas de tremblement de caméra, ni de flashes, ni de particules rapides. Son coupé par défaut, comme aujourd'hui.
- **Mobile** : moins de particules et de débris, textures 1K, pas de bloom ; le chœur peut passer à 8 statues.

## Découpage (fichiers possédés, travail en parallèle dans le même arbre, aucun commit)

| Agent             | Possède                                                                                                                                                                                                                                       | Livre                                                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| A2, musique       | `public/audio/easter/majestic.mp3`, `src/easter/majestic/music.ts` (+ test), `src/easter/voice.ts` et `src/easter/audio.ts` (ajout du clip `majestic` en streaming)                                                                           | Montage d'environ 2 min avec une vraie fin, repères mesurés (`MAJESTIC_MARKS`), lecture et déblocage dans le geste                                   |
| B2, modèles       | `scripts/blender/model_easter_majestic.py`, `blender/easter_majestic.blend`, `public/models/easter/majestic.glb`, `public/textures/easter/majestic/**`, `src/easter/majestic/types.ts`, `src/easter/majestic/textures.ts`                     | Montagne, colosse du chœur, rochers, prisme du sommet, textures PBR CC0                                                                               |
| D4, environnement | `src/easter/majestic/env/**`                                                                                                                                                                                                                  | Sol et fissures, ciel du crépuscule et aurore, plasma d'entrée, poussière, débris instanciés, éclairs sûrs, rayons                                   |
| D3, séquence      | `src/easter/majestic/*` hors `env/`, `music.ts`, `types.ts` et `textures.ts` ; intégration dans `EasterScene.tsx`, `useSequence.ts`, `EasterCamera.tsx`, `warmup.ts`, `src/scene/store.ts`, `src/content/site.ts` (`easter.*`), `src/easter/EasterOverlay.*`, `src/easter/space/hud.ts` | Déclencheur, état `M`, timeline, caméra, montée de la montagne et du chœur, climax, sortie, versions reduced-motion et mobile, debug                |

### Contrats

- **`src/easter/majestic/state.ts`** (D3) : état mutable `M`, valeurs 0 → 1 écrites par la timeline et lues par D4 dans `useFrame`.
  - `t`
  - `entry` : plasma
  - `plain` : plaine visible
  - `quake` : intensité du séisme
  - `cracks` : avancée des fissures
  - `dust`
  - `rise` : montée de la montagne
  - `slide` : glissements de terrain
  - `choir` : levée du chœur
  - `beams`
  - `prism` : ouverture du sommet
  - `spectrum`
  - `aurora`
  - `outro`
  - `fade`
- **`src/easter/majestic/music.ts`** (A2) :
  - `MAJESTIC = { src, duration }` ;
  - `MAJESTIC_MARKS` : `{ rise, quake, choir, climax, end, beat? }` en secondes depuis le début du clip, mesurés.
  - D3 dérive tous ses temps de ces constantes.
- **`majestic.glb`** (B2), nœuds :
  - `Mountain` : base à y = 0, hauteur ≈ 1200 m, échelle en mètres ;
  - `Mountain_B` : le B sculpté, matériau émissif séparé `MountainB` ;
  - `Choir_Statue` : ≈ 80 m, origine au pied, face vers +Z ; enfant `Choir_Glow` émissif ;
  - `Rock_A`, `Rock_B`, `Rock_C` : débris ;
  - `Summit_Prism` : prisme, origine à sa base ;
  - `Summit_Shell_L` et `Summit_Shell_R` : les deux moitiés du sommet qui s'écartent.
  - `types.ts` documente dimensions et pivots.
- **Composants de D4** : `src/easter/majestic/env/index.ts` exporte `<MajesticEnv mobile reducedMotion bloom />`, qui lit `M`. D3 le monte. Les éléments dont la position dépend de la montagne (débris, fissures) lisent les constantes de `src/easter/majestic/layout.ts` (D3).
- **Debug, en DEV seulement** :
  - `?majestic=1` lance directement le second niveau ;
  - `?majestic-at=<s>` démarre à ce temps.
- **Préchargement** : les assets du second niveau se téléchargent pendant le parc. Les shaders, géométries et textures sont précompilés et envoyés au GPU avant le premier affichage, sur le modèle de `src/easter/warmup.ts` : compiler pour la cible du bloom, sinon on retombe dans la saccade de 2.2 s de l'arène.

## Tests sans son

Chrome headless lancé avec `--mute-audio`, sur un serveur Vite dédié (port 5182 à 5185, jamais 5173 ni 5190). Aucune image envoyée à Mathis (pas de spoiler).
