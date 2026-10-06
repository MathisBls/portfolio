# Easter egg v3 : « Le signal » (storyboard du 2026-10-06)

Demande de Mathis (2026-10-06 au soir), en plus des 3 correctifs de `docs/todo-easter.md` :

- **Après la route, le temps se pose** : ciel étoilé, calme, une forme au loin qui se rapproche, trop loin pour savoir ce que c'est.
- **Houston parle** (moins d'une minute), avec un **temps de latence** avant le dernier mot.
- **Au mot « BoulardTV », tout repart** : la speakeuse ouvre les portes et on entre dans un **parc d'attractions spatial**.
  - On est **dans un vaisseau** et on traverse des planètes.
  - Il y a d'autres vaisseaux et des écrans qui montrent BoulardTV.
  - Références BoulardTV partout. **Rendu le plus réaliste possible.**

Le nom BoulardTV est désormais assumé : décision de Mathis du 2026-10-06, qui annule la neutralisation de `docs/decisions.md`.

**Règles fermes :**
- **aucune image sexuelle ni suggestive** : le site n'a pas de vérification d'âge et vise des commerces ;
- **aucun lien vers la plateforme**.

## Histoire

La route était le **warp** de notre vaisseau, l'*Explorer*. On en sort, le temps se pose. Houston nous appelle par radio : l'humanité cherchait quelque chose de plus grand que les étoiles, et un signal approche.

Le message de la route l'annonçait : « There's one I never told you about. » Ce projet caché, c'est BoulardTV.

## Audio (fichiers de Mathis, ElevenLabs, dans `C:/Users/Asuki/Downloads/!/`)

| Fichier                  | Durée   | Contenu                                                                                                                                                                                 |
| ------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Houston_apresroute.mp3` | 44.65 s | Houston, tout le passage (« Ici Houston… vous me recevez ? … Le signal porte un nom… »). Vérifié : le nom n’y est pas, la dernière phrase est « Le signal porte un nom… » (agent audio). |
| `houston-boulardtv.mp3`  | 1.26 s  | Houston dit « BoulardTV. » seul, joué après un silence de suspense.                                                                                                                     |
| `speaker.mp3`            | 7.71 s  | La speakeuse : « Alors… mesdames et messieurs… les portes s'ouvrent… MAINTENANT ! Bienvenue… à BOULARDTV ! »                                                                            |
| `musicparc.mp3`          | 211 s   | Musique du parc.                                                                                                                                                                        |

Les textes exacts sont dans `site.easter` (sous-titres en français, `lang="fr"`).

## Séquence complète (secondes approximatives, la source de vérité est `src/easter/times.ts`)

| #   | Beat                     | Durée                       | Ce qu'on voit                                                                                                                                                                                                                                                                                                                                                                                            | Ce qu'on entend                                                                                             |
| --- | ------------------------ | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | Prisme                   | 0 → 3                       | Le zoom dure 3 s. **L'éclatement tombe à 3 s**, synchronisé avec le fondu comme avant le commit 788666d.                                                                                                                                                                                                                                                                                                 | Tension qui monte, silence, éclatement                                                                      |
| 2   | Arène et cartes          | inchangé (décalé)           | Comme aujourd'hui                                                                                                                                                                                                                                                                                                                                                                                        | Inchangé                                                                                                    |
| 3   | Route                    | **≈ 18–20 s** (contre 9.7)  | La route est plus longue et la montée plus lente ; on dépasse plus de choses. Les trois lignes s'écrivent. **La dernière s'écrit en entier puis reste affichée ≥ 1.5 s** avant la suite.                                                                                                                                                                                                                | La tension s'étire                                                                                          |
| 4   | Sortie du warp           | ≈ 3 s                       | Les traînées s'étirent puis se résorbent en étoiles et la route s'efface. Le cockpit de l'*Explorer* apparaît autour de nous (montants de verrière, tableau de bord, HUD).                                                                                                                                                                                                                              | Tout retombe, un grave sourd                                                                                |
| 5   | **Le temps se pose**     | ≈ 45 s + 2.5 s de suspense  | Dérive très lente. Ciel étoilé réaliste avec la Voie lactée, le limbe d'une planète éclairée à contre-jour dans un coin. Sur le HUD, un radar dont le point se rapproche. **Au loin, une forme minuscule grossit très lentement** : une silhouette sombre, quelques reflets roses, impossible à identifier. Sous-titres. Avant « BoulardTV » : 2–2.5 s de silence et la forme s'arrête, encore dans l'ombre. | Houston (passage), puis silence, puis « BoulardTV. »                                                        |
| 6   | Révélation               | ≈ 2 s                       | **Au mot**, les lumières de la forme s'allument en rampe (pas de stroboscope) : c'est la **porte du parc**, un anneau géant avec l'enseigne BOULARDTV. Le vaisseau bondit vers elle.                                                                                                                                                                                                                    | Souffle, impact doux                                                                                        |
| 7   | Ouverture                | 7.7 s                       | Devant les portes fermées. **Sur « MAINTENANT », les portes s'ouvrent** et la lumière inonde. **Sur « Bienvenue à BOULARDTV »**, les feux d'artifice partent (rampes lentes) et on passe la porte.                                                                                                                                                                                                       | La speakeuse, puis la musique démarre sur le cri                                                            |
| 8   | **Le parc**              | ≈ 60–75 s                   | Vol en vaisseau sur une spline à travers des tableaux (détail ci-dessous). D'autres vaisseaux nous croisent ou volent avec nous.                                                                                                                                                                                                                                                                         | musicparc                                                                                                   |
| 9   | Final                    | tant que l'utilisateur reste | Le **B géant** (`b_logo.glb`) au centre du parc, comme un monument ou un soleil, avec des feux d'artifice lents. La sortie est mise en avant.                                                                                                                                                                                                                                                            | La musique continue, puis s'éteint en fondu à sa fin ou à la sortie                                        |

### Le parc (beat 8), tableaux dans l'ordre

1. **Allée des écrans** : des écrans géants en carrousel tournent autour de la trajectoire. Ils montrent des visuels BoulardTV **SFW** :
   - les animations de la carte légendaire (vidéos) ;
   - les rendus de l'arène et des cartes ;
   - le logo.
   Des vaisseaux circulent, réacteurs allumés.
2. **Planète des montagnes russes** : une géante gazeuse réaliste, teintée magenta et violet, avec des anneaux. Un rail de montagnes russes l'enlace et des wagons y foncent. On suit le rail sur un tronçon.
3. **Grande roue** autour d'une lune rocheuse, cabines lumineuses.
4. **Planète des cartes** : les cartes BoulardTV (`cards.glb`) orbitent comme des satellites, la légendaire en géant.
5. **Le B** : arrivée face au B géant (beat 9).

## Reduced-motion et mobile

- **Reduced-motion** : fondus enchaînés entre plans fixes. Ciel étoilé et sous-titres, puis porte allumée, puis 3 ou 4 tableaux fixes du parc, puis le B. Son coupé par défaut, comme aujourd'hui. Pas de feux d'artifice clignotants.
- **Mobile** : moins d'écrans et de vaisseaux, textures en 1K, pas de bloom, cockpit simplifié.
- **Partout** : aucune variation de lumière au-delà de 3 par seconde (WCAG 2.3.1). Échap sort à tout moment.

## Découpage (fichiers possédés par chaque agent, pour travailler en parallèle dans le même arbre)

| Agent        | Possède                                                                                                                                                                                                                                       | Livre                                                                                                                                                                 |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A, audio     | `public/audio/easter/*`, `src/easter/voice.ts` (+ test), `src/easter/EasterSubtitles.tsx`, `src/easter/audio.ts`, `src/scene/store.ts` (champ `easterSubtitle`), `src/content/site.ts` (`easter.*`), `src/easter/EasterOverlay.*`               | Clips réencodés, repères mesurés, lecteur Web Audio branché sur le bouton Son, sous-titres DOM                                                                        |
| B, Blender   | `scripts/blender/model_easter_park.py`, `public/models/easter/park.glb`, `src/easter/park/types.ts`                                                                                                                                           | Cockpit, porte, vaisseaux, rail et wagon, grande roue, écran, enseigne                                                                                                |
| C, visuels   | `public/textures/easter/**`, `src/easter/park/textures.ts`, `site.legal.ip.text` (une ligne de crédits seulement)                                                                                                                              | Textures de planètes réalistes et Voie lactée (licences libres, crédits), visuels BoulardTV SFW, planche contact                                                     |
| D1, séquence | `times.ts`, `timeline.ts`, `state.ts`, `camera.ts`, `EasterCamera.tsx`, `EasterScene.tsx`, `useSequence.ts`, `roadPath.ts` (+ tests), `Road*`, `Streaks*`, `EasterMessage.tsx`, `tension.ts`, `sfx.ts`, nouveaux `src/easter/space/*`         | Les 3 correctifs, beats 4 à 7, intégration du parc et des clips, saut de debug `?easter-at=<s>` (DEV seulement)                                                      |
| D2, parc     | `src/easter/park/*`, sauf `types.ts` et `textures.ts`                                                                                                                                                                                         | Beats 8 et 9 : `parkTimeline(tl, start)`, état `P`, caméra `parkCamera`, composant `<Park />`                                                                        |

### Contrats entre agents

- **`src/easter/voice.ts`** (A) exporte :
  - `CLIPS` (src, durée) ;
  - `SUBTITLES` (`{ clip, at, end }`, l'index i correspond au texte `site.easter.subtitles[i]`) ;
  - `SPEAKER_MARKS` (`doors`, `welcome`, `shout`) et `PARK_MARKS` (`drop`) ;
  - `loadClips()`, `playClip(id)`, `stopClips(fade)`.
  Un squelette avec les durées mesurées existe déjà. A affine les repères. D1 ne lit que ces constantes.
- **Hooks de la timeline** (`useSequence.ts`, D1) : `clip(id)` et `subtitle(index)` en plus des hooks actuels. D1 les branche sur `playClip` et `useScene.getState().setEasterSubtitle`.
- **Parc** (D2) :
  - `src/easter/park/timeline.ts` exporte `PARK_DURATION` et `parkTimeline(tl, start)`, qui écrit l'état `P` (`park/state.ts`) ;
  - `src/easter/park/camera.ts` exporte `parkCamera(t, out)` (position, cible, fov) pour `t` en secondes depuis le début du beat 8 ;
  - `src/easter/park/Park.tsx` exporte `<Park mobile reducedMotion bloom />`.
  - D1 appelle `parkTimeline(tl, T.park)`, monte `<Park />` et délègue la caméra au parc quand `E.shot === SHOT.park`.
- **Noms de nœuds de `park.glb`** (B) : `Cockpit_Frame`, `Cockpit_Dash`, `Cockpit_ScreenL`, `Cockpit_ScreenC`, `Cockpit_ScreenR`, `Gate_Ring`, `Gate_DoorL`, `Gate_DoorR`, `Gate_Sign`, `Ship_A`, `Ship_B`, `Ship_C` (avec `*_Engine` émissifs), `Coaster_Car` (le rail est généré en code par D2, le long de la même courbe que la caméra), `Wheel_Rim`, `Wheel_Hub`, `Wheel_Cabin`, `Screen_Frame`, `Screen_Panel`.
  - Les écrans (`Cockpit_Screen*`, `Screen_Panel`) ont des UV 0→1.
  - Le cockpit est modélisé autour d'une caméra placée à l'origine, qui regarde vers −Z.
- **Textures** (C) : `src/easter/park/textures.ts` exporte les chemins.
  - `SKY` : Voie lactée équirectangulaire.
  - `PLANETS` : couleur, plus anneau ou nuit si besoin, pour chaque planète.
  - `SCREENS` : visuels et vidéos BoulardTV SFW, `{ src, kind: 'image' | 'video' }`.
  D1 et D2 n'importent que ce fichier.
- **Modèles** : `src/easter/models.ts` (D1) reçoit l'entrée `park` dès que `public/models/easter/park.glb` existe. D1 et D2 utilisent `useEasterModel('park')`.

## Tests sans son

Ne jamais jouer la séquence avec le son sur la machine de Mathis, ni dans le navigateur intégré. Tester dans Chrome headless lancé avec `--mute-audio`, en utilisant le saut `?easter-at=<s>`.
