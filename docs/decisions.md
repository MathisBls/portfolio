# Décisions techniques

Choix non tranchés par `CLAUDE.md` ou les skills. Une ligne de raison par choix. Les dépendances ajoutées sont justifiées ici (règle 5).

## Phase 0 — Bootstrap

### Outillage

- **TypeScript 6.0** (pas 7) : `typescript-eslint` exige `typescript < 6.1`.
- **ESLint 9** (pas 10) : `eslint-plugin-jsx-a11y` ne déclare pas encore ESLint 10.
- **create-vite 9 génère oxlint** : remplacé par ESLint + Prettier, conformément à `CLAUDE.md`.
- **Règles ESLint** : `strictTypeChecked` + `stylisticTypeChecked` (typescript-eslint), `react-hooks` (recommended-latest), `react-refresh`, `jsx-a11y` strict, `eslint-config-prettier`. `--max-warnings 0`.

### Dépendances ajoutées au-delà du skill r3f-scroll-scene

| Paquet                                                                                                                                                   | Type   | Raison                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| `zustand`                                                                                                                                                | dep    | Store de scène (skill). Déjà présent via R3F (0 Ko ajouté), déclaré car importé directement.  |
| `eslint-plugin-jsx-a11y`                                                                                                                                 | devDep | L'accessibilité est non négociable : vérification statique des attributs ARIA, labels, focus. |
| `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-config-prettier`, `globals`, `prettier` | devDep | Lint/format exigés par `CLAUDE.md`.                                                           |
| `vitest`                                                                                                                                                 | devDep | Tests de la logique pure (`src/lib/*.test.ts`).                                               |

### Rendu et pages

- **Prerender statique** (`renderToString` dans `src/entry-server.tsx` + `scripts/prerender.mjs`), hydratation côté client. Raisons : le site doit se lire sans JS ni WebGL (agent ui-dev), référencement local (objectif business), LCP sur mobile. Aucune dépendance ajoutée. Contrainte : aucun accès à `window` pendant le rendu ; tout ce qui dépend du navigateur passe par `useEffect` ou `useSyncExternalStore` (snapshot serveur `false`).
- **Deux pages HTML statiques** (`index.html`, `mentions-legales/index.html`) au lieu d'un routeur : pas de dépendance, chaque URL existe en vrai fichier sur l'hébergement statique.
- **Scène 3D en chunk lazy** (`SceneMount` → `import('./Scene')`) montée après hydratation, au premier moment libre (`requestIdleCallback`), seulement si WebGL 2 est disponible (three ≥ r163 n'a plus WebGL 1). Le JS initial ne contient ni three ni R3F.
- **`<head>` par page** (`src/app/head.ts`) injecté au prerender depuis `src/content/site.ts`. Canonical et `og:url` seulement quand `site.url` est renseigné (domaine à confirmer).

### Scène

- **Environment en Lightformers locaux** plutôt que `preset="city"` : les presets drei téléchargent un HDR depuis un CDN externe à l'exécution. Ici zéro requête réseau, rendu une fois (`frames={1}`).
- **Canvas** : `position: fixed`, `pointer-events: none`, `aria-hidden`. Aucune interaction ne passe par le raycast : le survol des cards est piloté par le DOM via `useScene.setHovered`.
- **Pas de `pointer-events: none` sur les sections DOM** (motif du skill non repris) : il rendait le texte non sélectionnable (copier l'email, le téléphone, le SIREN) et ne sert à rien puisque le Canvas n'est pas interactif. Si la scène doit un jour suivre la souris : `eventSource` sur `#root`.
- **Store** (`src/scene/store.ts`) : le progress (`page | hero | projects | services | about | contact | project:<slug>`) vit dans un objet mutable hors de zustand. `setProgress(id, v)` l'écrit et appelle `invalidate()` (frameloop `demand`), sans notifier aucun abonné React. Lecture dans `useFrame` via `getProgress(id)`. Seul `hovered` est un état zustand. `requestFrame()` demande une frame depuis le DOM.
- **`useModel(name)`** (`src/scene/useModel.ts`) : seul point d'entrée des GLB, avec le chemin Draco local `/draco/` (sans lui, drei va chercher le décodeur sur un CDN). `preloadModel(name)` uniquement depuis le chunk de la scène.
- **`useIsMobile` est réservé à la scène** : il vaut `false` au prerender. Toute différence de mise en page DOM entre mobile et desktop passe par les media queries CSS (sinon décalage de mise en page à l'hydratation).
- **Test WebGL 2** fait dans le callback idle, contexte de test libéré aussitôt (`WEBGL_lose_context`).
- **Caméra** : `CameraRig` échantillonne `CAMERA_PATH` (`src/scene/cameraPath.ts`) sur le progress `page` avec `sampleKeyframes` (pur, testé, sans allocation par frame).

### DOM et motion

- **Apparitions au scroll en CSS + IntersectionObserver** (`[data-reveal]`, `src/lib/reveal.ts`), pas `whileInView` de motion : avec le prerender, motion écrirait l'état caché en style inline dans le HTML (contenu invisible sans JS, et décalage d'hydratation pour les utilisateurs en reduced-motion). Les états cachés n'existent que sous `html.has-reveal`, classe posée par `observeReveals()` : si le JS échoue, rien n'est caché. Ne s'utilise que sous la ligne de flottaison. `prefers-reduced-motion` désactive tout en CSS.
- **motion** reste l'outil des interactions UI : nav qui se masque, menu mobile, survol des cards, états du formulaire.
- **Le contenu du hero n'utilise jamais `data-reveal`** : c'est l'élément LCP, il doit être visible dès le HTML.
- **`data-reveal="words"`** (`ui/RevealTitle`) : même déclencheur (`.is-in`), mais l'élément ne bouge pas lui-même, global.css l'exclut (`:not([data-reveal='words'])`) et ses mots montent un à un (masque `overflow: clip`, 110 % -> 0, 60 ms). Le masque déborde de la ligne par des marges négatives égales au padding du contenu, sinon le line-height .95 rogne les jambages. Pas d'`aria-hidden` : de vraies espaces séparent les mots.
- **`ui/SectionLabel`** : label mono + trait de 24 px (`scaleX`) pour les quatre sections. **`lib/stagger`** : `--reveal-i` plafonné à 8 (une longue liste de chips ne doit pas mettre une seconde à apparaître).
- **Inclinaison au survol** (`lib/useTilt`) : le hook n'écrit que `--tilt-x` / `--tilt-y` (degrés, `@property` sans héritage dans global.css) ; le CSS compose `perspective + rotateX/Y + lift` et lisse avec sa transition, uniquement sous `:hover` / focus (pas de calque 3D au repos). Pas de GSAP : GSAP replierait la propriété `translate` des `[data-reveal]` dans `transform` et casserait leur apparition. Le pointeur est écouté sur un hôte qui ne bouge pas (`.reveal` de la card, `<li>` du service), sinon le bord incliné fait sortir puis rentrer le pointeur en boucle.
- **Lecture de layout** : `lib/trackPointer` mesure le rect à l'entrée du pointeur, et une seule fois de plus après un scroll pendant le survol (le scroll décale l'élément sous un pointeur immobile). Jamais à chaque mouvement.
- **Curseur et boutons magnétiques** (`ui/Cursor`, `lib/useMagnetic`) : `gsap.quickTo`, seulement `(pointer: fine)` hors reduced-motion, montés après hydratation (`useMediaQuery` vaut `false` au rendu serveur). Le curseur natif reste. Le retour du bouton est un `gsap.to` élastique : les tweens `quickTo` sont tués avant, pour qu'ils ne se battent pas sur `x`/`y`.
- **Coût sur les mentions légales** : le curseur y tire GSAP + ScrollTrigger (`lib/gsap`). Acceptable : page statique, déjà sans scène.
- **Bandeau** (`ui/Marquee`) : `xPercent` 0 -> -50 scrubé sur le passage dans la fenêtre, contenu dupliqué une fois, nombre d'éléments pair pour que l'alternance plein/contour continue à la jonction. Aucune boucle autonome.

### Typo et tokens

- **Instrument Serif** (display, normal + italique), **Inter Variable** (texte), **JetBrains Mono 400** (labels). Sous-ensemble latin en woff2 (couvre le français, `’`, `€`), récupéré depuis les paquets Fontsource avec `npm pack` (aucune dépendance), licences OFL dans `public/fonts/`. Préchargement : Instrument Serif et Inter.
- **Tokens ajoutés** à ceux du skill : `--font-display/text/mono`, `--gutter`, `--max-w`, `--z-scene/content/nav`.
- **`--fg-3` (#65656e) a un contraste de 3,4:1** sur `--bg` : réservé au décoratif et au texte ≥ 24 px. Le texte courant secondaire utilise `--fg-2` (7,5:1).
- **Mobile** = `(pointer: coarse), (max-width: 1023.98px)` (`src/lib/media.ts`).

### Assets

- **Décodeur Draco** copié depuis `three` en `postinstall` (`scripts/copy-draco.mjs`) vers `public/draco/` (ignoré par git) : il suit toujours la version de three installée. Relancé en `prebuild` pour les installs en `--ignore-scripts`.
- **Types GLB** dans `src/scene/objects/types.ts` (gltfjsx `--types`, sans `--transform` pour ne pas réécrire les modèles). Mesures utiles aux objets : `docs/models.md`.

### Contenu

- **`src/content/site.ts`** ajouté pour les textes d'interface (méta, titres de section, labels, liens).
- **`TODO:` dans le contenu** : affiché comme texte, jamais transformé en lien ni en numéro cliquable (`isTodo` / `isFilled` dans `src/lib/content.ts`).

### Scroll

- `ScrollTrigger.config({ ignoreMobileResize: true })` et `ScrollTrigger.refresh()` après `document.fonts.ready` (puis après chargement des GLB). Lenis démarre et s'arrête selon `useReducedMotion()` (réactif).

### Mesure

- **`npm run size`** : JS initial gzip = scripts module + modulepreload des pages de `dist/` (hors imports dynamiques), échec si > 350 Ko.

## 2026-10-06 — Histoire, anglais, corrections de review

- **Site en anglais**, domaine `mathisboulais.com` (décision de Mathis, cible internationale). Mentions légales en anglais (« Legal notice ») sur `/legal/` ; une version française reste à envisager si des clients français sont visés (loi Toubon). Prix structurés (`price` + `priceFrom`) au lieu d'un texte à découper par regex.
- **Storyboard v2** (`docs/storyboards/story-v2.md`) : la lumière = l'idée du client, le prisme = Mathis, le spectre = ce qui en sort. Une phrase à l'écran par étape (captions du hero, titres de section). Le Contact (« Your idea is next. ») explique le retour du prisme ; l'envoi du formulaire déclenche la rafale (`ideaSentAt` dans le store).
- **Captions du hero** : fenêtres dans `lib/hero.ts` (`CAPTIONS`, `captionOpacity`, testées) ; opacité 0 par défaut (sans JS : dans le DOM, hors écran visuellement), retirées de l'affichage en reduced-motion.
- **Perf (review hero)** : scène montée à la première interaction sur mobile ; test WebGL 2 sans contexte ; précompilation async des shaders (`Warmup`, frameloop "never" puis "demand") ; drapeaux DOM (`has-scene`, `has-3d-title`) appliqués seulement après la première image (`setSceneLive`).
- **Verre sans transmission** en mobile et reduced-motion (règle 1), lisible : mélange normal + arêtes (`Edges`).
- **Reduced-motion au hero** : prisme seul tant que le hero est visible, état final à la sortie (plus de rayons derrière le texte).
- **Rayons pendant les projets** : un seul rayon allumé (projet actif), fondu de 0.4 s, arrêt à l'entrée de la boîte monde de l'objet, allumé seulement quand son chemin à l'écran ne passe pas sous une card ; départ sur la face de sortie du prisme.

## 2026-10-06 — Easter egg (code Konami)

- **Déclencheur** : ↑ ↑ ↓ ↓ ← → ← → B A (`src/easter/konami.ts`, ignoré dans les champs et avec Ctrl/Cmd/Alt). Choix de Mathis.
- **Assets** depuis les modèles BoulardTV de Mathis : `scripts/blender/easter_assets.py` -> `public/models/easter/`. Le dépôt reste privé : les scripts et l'historique mentionnent la source. ~~Nom neutralisé (« PRISM »)~~ : **annulé le 2026-10-06, le nom BoulardTV est assumé** (décision de Mathis), avec deux règles fermes : aucune image sexuelle ni suggestive, aucun lien vers la plateforme.
- **Un seul Canvas** : en mode `easter`, la scène normale est démontée et `EasterScene` (chunk lazy, ~14 Ko gz + GLB) prend sa place ; précompilation `compileAsync` avant la séquence.
- **Son généré en Web Audio** (`tension.ts`) : aucun fichier, aucun droit ; créé au déverrouillage (geste utilisateur) ; muet par défaut en reduced-motion.
- **Sécurité** : aucun flash au-delà de 3/s, rougissement progressif ; overlay `dialog` modal, Échap à tout moment, page `inert`, scroll et focus restaurés à la sortie.
- **Retours du 2026-10-06** : zoom de 5 s sur le prisme puis éclatement soudain ; le vol le long des courbes du B (jugé bizarre) est remplacé par une route droite à la vitesse de la lumière où l'on dépasse les projets, avec un message tapé lettre par lettre (« You've seen my projects. » / « Well… almost. » / « There's one I never told you about. ») avant le B. Repères de temps centralisés dans `src/easter/times.ts`.
- **Retours du soir (2026-10-06)**, faits : l'éclatement tombe à 3 s (zoom de 3 s) et l'arène arrive 0.8 s après, comme avant le zoom de 5 s (fondu au noir calé sur l'éclat) ; la route dure 19 s (montée lente, intensité perçue en logarithme de la vitesse, cinq projets toutes les 2.2 s, arches lumineuses à moins de 3 passages par seconde) ; chaque ligne du message s'écrit en entier puis tient au moins 1.5 s (`typingDuration`, horloge de frappe sans dérive, testé dans `times.test.ts`).
- **Séquence v3 « Le signal »** (`docs/storyboards/easter-park.md`) : la route devient le warp de l'_Explorer_. Sortie du warp (traînées qui se résorbent en étoiles, cockpit qui s'allume), le temps se pose (Voie lactée ESO, Terre de nuit à contre-jour, Houston en voix enregistrée avec sous-titres, une forme lointaine qui grossit puis s'arrête), silence de 2.3 s, « BoulardTV. » : la porte du parc s'allume en rampe, le vaisseau bondit, la speakeuse ouvre les portes, la lumière inonde, la musique démarre et on entre dans le parc (beats 8 et 9). Le B géant n'est plus un plan à part : il est au bout du parc. Tous les repères des beats 4 à 7 dérivent des clips (`CLIPS`, `SPEAKER_MARKS`). Debug en DEV : `?easter=1` (sans le code) et `?easter-at=<s>`.
- **À reprendre** : décalage des faces avant de COMMON et LEGENDARY corrigé en code (`cardRig.ts`), à reporter dans `easter_assets.py` ; mixage à valider à l'écoute par Mathis.

## 2026-10-06 — Hébergement chez alwaysdata

- **alwaysdata, pas Netlify** (décision de Mathis) : il utilise déjà alwaysdata. Le site reste un build statique (`dist/`), servi par Apache ; `netlify.toml` est supprimé, ses en-têtes sont repris dans `public/.htaccess` (MIME, deflate, cache, https sans www, sécurité ; CSP permissive laissée en commentaire, HSTS à activer après le certificat). Procédure : `docs/deploy-alwaysdata.md`.
- **Formulaire de contact en PHP** (`public/contact.php`, copié tel quel dans `dist/`) au lieu de Netlify Forms : même hébergeur, aucun service tiers, aucune dépendance. POST uniquement, Origin/Referer vérifié, honeypot `bot-field`, longueurs maximales (partagées avec `CONTACT_MAX` de `src/lib/form.ts`), `filter_var` sur l'email, sujet fixe et `Reply-To` validé seul en-tête issu du visiteur, 5 requêtes par IP sur 10 min (empreinte SHA-256 de l'IP, hors webroot), `mail()` depuis `noreply@mathisboulais.com`. Réponse JSON `{ ok }` ; page HTML minimale pour le POST natif sans JS.
- **Aucun message n'est stocké** : il part par email (seule l'empreinte de l'IP reste ~10 min) ; les mentions légales le disent, la durée de conservation dans la boîte mail reste un `TODO`.
- **Dev** : Vite n'exécute pas le PHP. `sendContact` lit toute réponse non JSON (404, HTML) comme un échec : état d'erreur et lien email de secours.
- **Hébergeur dans les mentions légales** : ALWAYSDATA SARL, 91 rue du Faubourg Saint Honoré, 75008 Paris (mentions légales d'alwaysdata), +33 1 84 16 23 40 (page contact d'alwaysdata), relevés le 2026-10-06.

## 2026-10-06 — Easter egg n° 2 « Le Sanctuaire » (séquence et intégration, D3)

- **Déclencheur** (`src/easter/majestic/password.ts`, `trigger.ts`) : `boulardtv` au clavier (mémoire glissante, insensible à la casse, Maj et verrouillage ignorés, Retour arrière corrige, ignoré dans les champs) ou 5 tapes rapides (≤ 600 ms d'écart, sur `pointerup` : c'est l'événement qui vaut geste pour un doigt) sur une couche de l'overlay, **seulement au final d'une séquence jouée sans saut de debug** (`easterPlayed` dans le store). Le HUD affiche `AWAITING PASSWORD_` (caret à 0.9 Hz) et remplit une case par lettre juste. La dernière lettre appelle `unlockMajestic()` (A2) dans le geste, passe au stage `'majestic'` et annonce « Secret level unlocked » (aria-live). Le retour automatique de fin de musique du parc est coupé pendant ce stage.
- **Debug** (DEV) : `?majestic=1`, `?majestic-at=<s>`, et `?majestic-armed=1` pour tester le vrai mot de passe après un `?easter-at` (qui, sinon, ne compte pas comme « joué », comme le veut le storyboard).
- **Repères** (`majestic/times.ts`) : tous dérivés de `MAJESTIC_MARKS` (A2). Beat 0 de 3 s, puis entrée (`rise`), plaine, séisme (rampes sur les coups sourds `MAJESTIC_QUAKE_HITS`), montagne (`orchestra`), chœur, prisme (`climax`), sortie (`end`), noir sur l'accord final (`final` + 2.4 s), THANKS FOR PLAYING, retour à la page après la dernière note. Durée totale ≈ 2 min 14 s.
- **Monde** : échelle réelle en mètres, montagne à l'origine, face au B vers +Z (`majestic/layout.ts`, contrat de D4). Plan lointain 60 km sur ce plan, brouillard exponentiel donné par le ciel de D4 (`majesticSky`). **Aucune lumière ajoutée** : les lumières de la séquence (hémisphère, deux directionnelles) sont réglées par `majestic/lights.ts`, sinon tous les programmes de la séquence se recompileraient au déclenchement.
- **Prisme du sommet** : verre du site sans transmission (variante `SolidGlass`) à la place du `KHR_materials_transmission` du GLB (une passe de transmission coûterait un rendu de plus par image).
- **Caméra** : spline datée à vitesse continue (Hermite monotone, comme le parc), plancher doux à 14 m, tremblement en deux couches plafonné à 0.0075 rad, coupé en reduced-motion ; testée (`camera.test.ts` : continuité, jamais dans la montagne ni dans un colosse). Chœur vu en orbite horaire au ras des statues (le regard suit celle qu'on frôle), prisme et spectre de face (l'éventail de D4 s'ouvre vers +Z).
- **Préchargement et précompilation** : GLB, textures (cache décodé hors du fil principal) et flux de la musique pendant le parc ; monde monté au repère de précompilation (ACCESS GRANTED déjà tapé), compilé en asynchrone pour la cible du bloom (`warmUpSubtree` + `warmMajesticEnv` de D4), rendu jamais figé par `frameloop "never"` (R3F remet alors son horloge à zéro : le HUD ne se redessinait plus). Mesuré (RTX 5070 Ti, Chrome headless) : ≈ 0.3 à 1.1 s de compilation en tâche de fond, ≈ 30 à 55 ms bloquants, puis 0 programme, 0 texture, 0 géométrie envoyés pendant la séquence.
- **Reduced-motion** : fondus entre cinq plans fixes (plaine, montagne levée, chœur, spectre, sortie), valeurs posées sous le voile, son coupé par défaut. **Mobile** : 8 colosses, sans bloom, textures 1K (B2), particules allégées (D4).
- **Passage entre les mondes** : le B du parc se contracte en un point de lumière qui remplit l'écran (voile blanc rosé, une seule rampe), le Sanctuaire apparaît derrière ; la teinte du voile ne change jamais quand il est visible (testé).
- **Intégration de D4** : `<MajesticEnv mountain rocks>` reçoit le nœud `Mountain` (relief exact pour débris et cascades) et `Rock_A/B/C`. Lumière directionnelle et FogExp2 calés sur `majesticSky`. **Plan proche relevé à 0.3 m sur ce plan seulement** (0.1 ailleurs) : ≈ 1.8 m d'erreur de profondeur à 3 km au lieu de 5 m, sans scintillement au pied de la montagne ni des statues ; rien de visible du cockpit ne passe sous 0.3 m (vérifié en 16:9 et en portrait). Profondeur logarithmique et reversed-Z écartées : options du renderer à sa création, valables pour tout le site, et la première change tous les shaders, y compris ceux de D4.
- **Avertissements HLSL « X4122 »** (Chrome/ANGLE sous Direct3D seulement) : ils viennent du shader `PMREMGGXConvolution` de three (PMREMGenerator : environnement de `Lighting` et du parc), du repliement de constantes en double précision. Sans effet, rien à corriger côté projet.
