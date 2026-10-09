# Portfolio — Mathis Boulais

Site vitrine et portfolio 3D, une page pilotée au scroll : un prisme de verre reçoit une lumière blanche, un spectre en sort, chaque rayon mène à un projet.

Vite + React 19 + TypeScript strict · React Three Fiber (drei, postprocessing) · GSAP ScrollTrigger + Lenis · motion · CSS modules. Prerender statique (le site se lit sans JS ni WebGL).

## Commandes

| Commande            | Rôle                                                                 |
| ------------------- | -------------------------------------------------------------------- |
| `npm install`       | Dépendances, puis copie du décodeur Draco dans `public/draco/`       |
| `npm run dev`       | Serveur de dev (http://localhost:5173)                               |
| `npm run build`     | Typecheck, build client, build SSR, prerender des pages dans `dist/` |
| `npm run preview`   | Sert `dist/` (http://localhost:4173)                                 |
| `npm run typecheck` | TypeScript strict                                                    |
| `npm run lint`      | ESLint (0 warning toléré)                                            |
| `npm run test`      | Tests vitest de la logique (`src/lib/*.test.ts`)                     |
| `npm run size`      | JS initial en gzip (budget 350 Ko), chunks > 100 Ko                  |
| `npm run deploy`    | Vérifie `dist/` et affiche les commandes d'envoi vers alwaysdata     |
| `npm run format`    | Prettier                                                             |

Avant toute PR : `npm run typecheck && npm run lint && npm run build`.

## Structure

```
src/
  app/        HomePage, LegalPage, <head> par page
  scene/      Canvas global (lazy), caméra, lumières, postprocessing, store DOM <-> 3D
  scene/objects/  Prism, objets des projets, types des GLB
  sections/   Hero, Projects, Services, About, Contact
  ui/         Nav, Button, cards, formulaire
  lib/        gsap, lenis, media queries, reveals, logique pure testée
  content/    textes EN (source unique) : projects.ts, services.ts, site.ts
  styles/     tokens.css, fonts.css, global.css
docs/
  decisions.md   choix techniques et dépendances justifiées
  models.md      mesures des modèles 3D
  storyboards/   un storyboard par section (source des timelines)
scripts/      prerender, mesure du bundle, copie Draco, rendus Blender
```

## Contenu

Tous les textes vivent dans `src/content/`. Une valeur commençant par `TODO:` reste visible sur le site et n'est jamais transformée en lien : la renseigner avant la mise en ligne.

## Assets 3D

- Source : `blender/portfolio_models.blend` (une collection par modèle). Exports : `public/models/*.glb` (Draco). Procédure : `.claude/skills/blender-assets/SKILL.md`.
- Après un export, regénérer les types : `npx gltfjsx public/models/<n>.glb --types`, puis reporter l'interface dans `src/scene/objects/types.ts`.
- Posters (fallback mobile, reduced-motion, sans WebGL) :
  ```
  "D:/Blender/blender.exe" -b blender/portfolio_models.blend --python scripts/blender/posters.py
  "D:/Blender/blender.exe" -b --python scripts/blender/posters_webp.py
  ```
  Le premier rend des PNG 800×800 sur fond transparent (non versionnés), le second les convertit en WebP de moins de 60 Ko dans `public/posters/`.

## Déploiement (alwaysdata)

Build statique (`dist/`) + `contact.php`, servis par Apache/PHP chez alwaysdata. `public/.htaccess` (MIME, compression, cache, https sans www, en-têtes de sécurité) et `public/contact.php` (formulaire de contact, envoi par `mail()`) sont copiés dans `dist/` au build. Chaque page est un vrai fichier, une par langue : `index.html` et `mentions-legales/index.html` (français, langue principale), `en/index.html` et `en/legal/index.html` (anglais).

Procédure complète et checklist avant mise en ligne : [`docs/deploy-alwaysdata.md`](docs/deploy-alwaysdata.md). `npm run deploy` vérifie `dist/` et affiche les commandes d'envoi (rien n'est envoyé).

En dev, Vite n'exécute pas le PHP : l'envoi du formulaire tombe sur l'état d'erreur, avec le lien email de secours.
