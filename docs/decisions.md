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
- **Store** (`src/scene/store.ts`) : ids de progress `page | hero | projects | services | about | contact | project:<slug>`. `setProgress` appelle `invalidate()` (frameloop `demand`). Lecture dans `useFrame` via `getProgress(id)`, jamais via le hook.
- **Caméra** : `CameraRig` échantillonne `CAMERA_PATH` (`src/scene/cameraPath.ts`) sur le progress `page` avec `sampleKeyframes` (pur, testé, sans allocation par frame).

### DOM et motion

- **Apparitions au scroll en CSS + IntersectionObserver** (`[data-reveal]`, `src/lib/reveal.ts`), pas `whileInView` de motion : avec le prerender, motion écrirait l'état caché en style inline dans le HTML (contenu invisible sans JS, et décalage d'hydratation pour les utilisateurs en reduced-motion). Les états cachés n'existent que sous `html.js` (classe posée par un script inline avant le premier rendu). `prefers-reduced-motion` désactive tout en CSS.
- **motion** reste l'outil des interactions UI : nav qui se masque, menu mobile, survol des cards, états du formulaire.
- **Le contenu du hero n'utilise jamais `data-reveal`** : c'est l'élément LCP, il doit être visible dès le HTML.

### Typo et tokens

- **Instrument Serif** (display, normal + italique), **Inter Variable** (texte), **JetBrains Mono 400** (labels). Sous-ensemble latin en woff2 (couvre le français, `’`, `€`), récupéré depuis les paquets Fontsource avec `npm pack` (aucune dépendance), licences OFL dans `public/fonts/`. Préchargement : Instrument Serif et Inter.
- **Tokens ajoutés** à ceux du skill : `--font-display/text/mono`, `--gutter`, `--max-w`, `--z-scene/content/nav`.
- **`--fg-3` (#65656e) a un contraste de 3,4:1** sur `--bg` : réservé au décoratif et au texte ≥ 24 px. Le texte courant secondaire utilise `--fg-2` (7,5:1).
- **Mobile** = `(pointer: coarse), (max-width: 1023.98px)` (`src/lib/media.ts`).

### Assets

- **Décodeur Draco** copié depuis `three` en `postinstall` (`scripts/copy-draco.mjs`) vers `public/draco/` (ignoré par git) : il suit toujours la version de three installée.
- **Types GLB** dans `src/scene/objects/types.ts` (gltfjsx `--types`, sans `--transform` pour ne pas réécrire les modèles). Mesures utiles aux objets : `docs/models.md`.

### Contenu

- **`src/content/site.ts`** ajouté pour les textes d'interface (méta, titres de section, labels, liens).
- **`TODO:` dans le contenu** : affiché comme texte, jamais transformé en lien ni en numéro cliquable (`isTodo` / `isFilled` dans `src/lib/content.ts`).

### Mesure

- **`npm run size`** : JS initial gzip = scripts module + modulepreload des pages de `dist/` (hors imports dynamiques), échec si > 350 Ko.
