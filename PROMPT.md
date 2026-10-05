# Prompt de lancement — à coller dans Claude Code à la racine du repo

Tu travailles sur le portfolio de Mathis Boulais. Lis `CLAUDE.md`, puis les trois skills dans `.claude/skills/`, puis `src/content/projects.ts` et `services.ts`. Les modèles 3D sont déjà faits dans `public/models/` (6 GLB Draco, pas d'animation embarquée) et la source Blender est dans `blender/`.

## Mission
Livrer un site one-page, sombre, piloté au scroll, dans l'esprit d'igloo.inc : une scène 3D continue avec un prisme en verre comme fil conducteur. Une lumière blanche entre dans le prisme, un spectre en sort, et chaque rayon mène à un projet. Le site doit être spectaculaire sur desktop, propre et rapide sur mobile, lisible sans WebGL, et convertir : un visiteur pro doit comprendre en 10 secondes ce que Mathis fait et comment le contacter.

## Phase 0 — Bootstrap (toi, sans agent)
1. `npm create vite@latest . -- --template react-ts`, puis les dépendances listées dans le skill `r3f-scroll-scene`. ESLint + Prettier config stricte. `tsconfig` strict.
2. Arborescence de `CLAUDE.md`. `src/lib/gsap.ts` (Lenis + ScrollTrigger), `src/scene/store.ts`, `src/styles/tokens.css` (depuis le skill `design-tokens`), fonts self-hosted.
3. Copie du décodeur Draco dans `public/draco/`. Types des GLB via `gltfjsx --types` dans `src/scene/objects/types.ts`.
4. Un `Scene.tsx` avec Canvas global, Environment, CameraRig vide, et une page qui scrolle avec 5 sections vides mais sémantiques. `npm run dev` doit tourner, `typecheck`/`lint`/`build` doivent passer. Commit `chore: bootstrap`.

## Phase 1 — `/section hero`
Le prisme (MeshTransmissionMaterial) flotte au centre. Nom en très grand derrière lui en display, rôle en mono dessous. Au scroll (pin 200 %) : le faisceau blanc entre, les 7 rayons s'allument un par un avec bloom, le prisme tourne d'un quart de tour, la caméra recule, les rayons se dispersent vers le bas et le titre se dissout mot par mot. Reduced-motion : état final statique.

## Phase 2 — `/section projects`
Les 5 projets, chacun : card DOM (titre, tagline, stack, lien) + objet 3D positionné dans la scène globale à hauteur de sa card, qui entre quand la card arrive, animé en continu quand visible (rubans qui tournent, convoi qui roule, fantômes de téléphone qui se décalent au hover, dés qui sortent du tapis, part de pizza qui pivote). Le rayon du spectre correspondant à la couleur `accent` du projet pointe vers sa card. Mobile : poster PNG à la place de la 3D (`/posters`).

## Phase 3 — `/section services` puis `/section contact`
Services : 3 colonnes depuis `services.ts`, prix "à partir de", CTA "Discuter d'un projet" qui scrolle au contact. Contact : formulaire Netlify Forms + mail + téléphone (si `identity.phone` renseigné) + SIREN en petit. Le prisme revient en fond, recomposé, lumière blanche seule : la boucle est bouclée.

## Phase 4 — `/section about` et `/mentions-legales`
About : 4 lignes, stack, "disponible pour des missions". Mentions légales : page simple, données depuis `identity`.

## Phase 5 — `/review` global + déploiement
Lighthouse mobile ≥ 85 perf, 100 a11y. `netlify.toml` ou doc de déploiement alwaysdata. README avec les commandes et comment régénérer les assets.

## Garde-fous
- Une phase à la fois, chaque phase committée et review approuvée avant la suivante.
- Les `TODO:` du contenu restent visibles et sont listés à la fin, tu n'inventes pas de faits sur les projets ou le client.
- Si un choix n'est pas tranché par `CLAUDE.md` ou les skills, l'agent `architecte` tranche et l'écrit dans `docs/decisions.md`. Tu ne poses une question à Mathis que si c'est un fait que toi seul ne peux pas connaître (URL, texte client, prix).

Commence par la Phase 0.
