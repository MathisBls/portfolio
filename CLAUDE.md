# Portfolio — Mathis Boulais

Site vitrine personnel + portfolio 3D. Objectif business : décrocher des missions freelance (sites vitrines, apps web/mobile pour TPE/artisans/commerces, et projets plus gros quand ils viennent). Le site doit impressionner en 3 secondes et convertir en 30.

## Référence visuelle
- igloo.inc : scène 3D continue pilotée au scroll, caméra qui voyage, sombre, précis, lent, cinématographique. On reprend l'esprit, pas la dette technique.
- Concept central : **le prisme**. Une lumière blanche entre, un spectre en sort, chaque rayon mène à un projet. "Une idée en entrée, plusieurs projets en sortie."

## Stack (figée, ne pas discuter)
- Vite + React 19 + TypeScript strict
- Three.js via `@react-three/fiber` + `@react-three/drei` + `@react-three/postprocessing`
- GSAP + ScrollTrigger (scroll piloté, pins, scrub), Lenis (smooth scroll)
- `motion` (ex Framer Motion) pour l'UI DOM uniquement (cards, menu, transitions)
- CSS : vanilla CSS modules + custom properties. Pas de Tailwind.
- Fonts : une display (ex. "Instrument Serif" ou "Clash Display") + une mono pour les labels. Self-hosted, woff2.
- Lint/format : eslint + prettier. Tests : vitest pour la logique, pas de tests sur la 3D.
- Déploiement : build statique (`dist/`), hébergé sur Netlify ou alwaysdata. Domaine cible : mathisboulais.fr (à confirmer).

## Assets 3D
- Source : `blender/portfolio_models.blend` (6 collections). Exports : `public/models/*.glb` (Draco).
- `prism.glb` : Prism (verre) + BeamIn + Spec0..6 (7 rayons émissifs)
- `zephyr.glb` : Wind1..3 (rubans)
- `wegir.glb` : Road, Dash*, Car0..2_Root (chaque voiture = empty parent + Body/Cab/4 roues)
- `quorin.glb` : Phone_*, PhoneG1_*, PhoneG2_* (téléphone + 2 fantômes)
- `gamefactory.glb` : Belt, Roller*, Leg*, Hopper, Chute, Die0..2 (+ Pip* enfants)
- `pizza.glb` : Dough, Sauce, Cheese, Crust, Pep*, Basil*
- Les modèles ne contiennent AUCUNE animation : tout est animé en code (useFrame, GSAP). Le verre du prisme est remplacé côté R3F par `MeshTransmissionMaterial`.
- Regénérer un modèle = modifier le script Blender via le MCP Blender, jamais à la main. Voir `.claude/skills/blender-assets/SKILL.md`.

## Structure cible
```
src/
  app/            App.tsx, routes (une seule page + /mentions-legales)
  scene/          Canvas global, caméra, lights, postprocessing, ScrollRig
  scene/objects/  Prism.tsx, Zephyr.tsx, Wegir.tsx, Quorin.tsx, Factory.tsx, Pizza.tsx
  sections/       Hero, Projects, Services, About, Contact
  ui/             composants DOM (Card, Button, Nav, Cursor, Marquee)
  lib/            lenis.ts, gsap.ts (plugins registered once), useReducedMotion, breakpoints
  content/        projects.ts, services.ts (texte FR, source unique)
  styles/         tokens.css, global.css
```

## Règles non négociables
1. **Perf** : 60 fps desktop, 30 fps mobile mid-range. Budget JS initial < 350 Ko gz. Modèles lazy (`useGLTF.preload` au hover/visibilité). Un seul `<Canvas>` global, jamais un Canvas par card. Sur mobile ou `prefers-reduced-motion` : scène simplifiée (pas de transmission, pas de bloom, posters statiques si besoin).
2. **Scroll** : tout mouvement de caméra ou d'objet lié au scroll passe par GSAP ScrollTrigger avec `scrub`. Pas de `window.scrollY` à la main dans `useFrame`.
3. **Accessibilité** : le contenu existe en DOM (titres, textes, liens) et est lisible sans WebGL. La 3D est décorative. Focus visible, contrastes AA, `prefers-reduced-motion` respecté.
4. **Contenu** : français, tutoiement interdit, pas de jargon creux ("solutions innovantes"). Phrases courtes. Les textes vivent dans `src/content/`, jamais en dur dans les composants.
5. **Pas de dépendance ajoutée sans raison écrite dans la PR.** Pas de lib UI (MUI, Chakra…). Pas de Tailwind.
6. **TypeScript strict**, pas de `any`, pas de `// @ts-ignore`.
7. Chaque section est livrée fonctionnelle de bout en bout (3D + DOM + responsive + reduced-motion) avant de passer à la suivante. Ordre : Hero → Projects → Services → Contact → About → mentions légales.

## Commandes
- `npm run dev` / `npm run build` / `npm run preview`
- `npm run lint` / `npm run typecheck` / `npm run test`
- Avant toute PR : `npm run typecheck && npm run lint && npm run build` doivent passer.

## Workflow agents
Voir `.claude/agents/`. Pour une nouvelle section : `/section <nom>` enchaîne architecte → motion-3d → ui-dev → reviewer. Le reviewer a droit de veto perf/a11y.
