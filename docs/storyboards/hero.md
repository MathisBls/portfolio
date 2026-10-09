# Storyboard — Hero (Phase 1)

## 1. Intention

En 3 s : un prisme de verre dans le noir, le nom immense réfracté derrière lui. On comprend « développeur », « sites et applications », « disponible », et le CTA est là. Au scroll, la lumière blanche entre et se décompose en 7 rayons : une idée en entrée, plusieurs projets en sortie. Le spectre finit tourné vers le bas, vers les projets.

## 2. Storyboard scroll (pin 200 %, progress `hero` 0 → 1)

Fenêtres exactes : `src/lib/hero.ts` (source de vérité, testée). Le DOM et la 3D lisent les mêmes fenêtres.

| p   | Caméra (pos → lookAt)        | 3D                                                                                                                                                  | DOM                                                                                                                                                                                                         |
| --- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.0 | (0, 0, 8) → (0, 0, 0)        | Prisme au centre, léger tilt (x 0.1, y −0.35), flottement. Faisceau et rayons éteints. Titre 3D (2 mots) derrière le prisme, réfracté par le verre. | h1 « Mathis / Boulais » (transparent si titre 3D actif) qui contient aussi le rôle mono et « à Paris » (lu, jamais affiché), ligne « Paris, 14:32 · Disponible… », pitch + 2 CTA en bas, « Faites défiler » |
| 0.1 | idem                         | Le faisceau entre depuis la gauche (fenêtre `beam` 0.10 → 0.28)                                                                                     | Tout le bloc d'intro (rôle, disponibilité, pitch, CTA, indice) s'efface (`intro` 0 → 0.08), avant la première caption (0.10)                                                                                |
| 0.2 | idem                         | Faisceau à mi-course                                                                                                                                | —                                                                                                                                                                                                           |
| 0.3 | idem                         | Faisceau sur la face gauche. Spec0 (rouge) s'allume (`rays` 0.25 → 0.55, un rayon par 0.033, durée 0.1)                                             | —                                                                                                                                                                                                           |
| 0.4 | idem                         | Spec0..3 allumés, bloom (desktop)                                                                                                                   | —                                                                                                                                                                                                           |
| 0.5 | idem                         | Spec4..6. Le mot 1 commence à se dissoudre (bords lumineux)                                                                                         | Mot « Mathis » se dissout (`words` 0.45 → 0.75)                                                                                                                                                             |
| 0.6 | (0, −0.3, 8.6)               | Quart de tour du groupe sur Z (`turn` 0.55 → 0.85) : la lumière vient du haut, tilt → 0. Mot 2 se dissout                                           | Mot « Boulais »                                                                                                                                                                                             |
| 0.7 | (0, −0.7, 9.8)               | Rotation à mi-course                                                                                                                                | —                                                                                                                                                                                                           |
| 0.8 | (0, −1.1, 11)                | Rotation presque finie. Dispersion (`spread` 0.80 → 1)                                                                                              | —                                                                                                                                                                                                           |
| 0.9 | (0, −1.4, 11.7)              | Les rayons s'allongent (×1 → ×1.8) et l'éventail s'ouvre (±18° → ±40°)                                                                              | —                                                                                                                                                                                                           |
| 1.0 | (0, −1.5, 12) → (0, −1.5, 0) | **État final** : prisme dans le tiers haut, lumière blanche par le haut, éventail vers le bas qui sort de l'écran                                   | Pin relâché, la section Projets arrive                                                                                                                                                                      |

**Passage de relais à Projects** : groupe du prisme à l'origine, `rotation.z = −π/2`, tilt nul, rayons ×1.8 ouverts à ±40°, pointant vers −Y. Caméra (0, −1.5, 12). Spec0 (rouge) à gauche, Spec6 (violet) à droite. En Phase 2, chaque rayon se réoriente vers la card de son projet.

## 3. Arborescence

| Fichier                                 | Propriétaire | Rôle                                                                                                                   |
| --------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `src/lib/hero.ts` (+ test)              | contrat      | Fenêtres du storyboard + fonctions pures `beamT`, `rayT(i)`, `wordT(i, n)`, `turnT`, `spreadT`                         |
| `src/scene/store.ts`                    | contrat      | + `getTimeline()`, registre d'ancres DOM (`registerAnchor/getAnchor`), drapeaux `html.has-scene` / `html.has-3d-title` |
| `src/scene/cameraPath.ts`               | contrat      | Clés caméra du hero sur la timeline (0 → 1)                                                                            |
| `src/content/site.ts`                   | contrat      | Textes hero + nav                                                                                                      |
| `src/scene/Scene.tsx`                   | motion-3d    | Monte Prism, HeroTitle3D, Effects ; antialias selon composer ; refresh ScrollTrigger après GLB                         |
| `src/scene/CameraRig.tsx`               | motion-3d    | Lit `getTimeline()` au lieu de `page`                                                                                  |
| `src/scene/objects/Prism.tsx`           | motion-3d    | Prisme + faisceau + 7 rayons, animés par `getProgress('hero')`                                                         |
| `src/scene/objects/HeroTitle3D.tsx`     | motion-3d    | Un plan par mot (CanvasTexture, Instrument Serif), aligné sur les spans du h1, dissolution shader                      |
| `src/scene/materials/dissolve.ts`       | motion-3d    | ShaderMaterial de dissolution (bruit + bord émissif)                                                                   |
| `src/scene/Effects.tsx`                 | motion-3d    | Bloom (seuil 1, mipmapBlur) + Vignette + Noise, desktop seulement                                                      |
| `src/scene/hooks.ts`                    | motion-3d    | `useContinuousInvalidate(active)` : boucle de rendu tant qu'une animation continue est visible                         |
| `src/sections/Hero.tsx` + `.module.css` | ui-dev       | DOM, pin + timeline GSAP qui écrit `setProgress('hero')`, dissolution DOM des mots, poster SVG sans WebGL              |
| `src/ui/Nav.tsx` + `.module.css`        | ui-dev       | Nav fixe (motion) : 3 liens + CTA, masquée au scroll vers le bas, menu mobile                                          |
| `src/ui/Button.tsx` + `.module.css`     | ui-dev       | Lien-bouton pill (primaire / ghost)                                                                                    |
| `src/app/HomePage.tsx`                  | ui-dev       | Ajoute `<Nav />` avant `<main>`                                                                                        |

## 4. Contrats

- **ScrollTrigger** `id: 'hero'` (Hero.tsx) : `trigger: section, start: 'top top', end: '+=200%', pin: true, scrub: 0.6`. Timeline de durée totale 1, positions = fenêtres de `src/lib/hero.ts`. `onUpdate` de la **timeline** (valeur lissée par le scrub) → `setProgress('hero', tl.progress())`.
- **Reduced-motion** : pas de pin, pas de timeline, `setProgress('hero', 1)` (la 3D affiche l'état final). Le DOM reste à l'état initial lisible (titre, rôle, pitch, CTA visibles ; indice de scroll masqué).
- **Ancre** `'hero-title'` : Hero.tsx appelle `registerAnchor('hero-title', h1)` ; le h1 contient un `<span data-word>` par mot. HeroTitle3D mesure ces spans (rect relatif au haut de la section) pour placer ses plans.
- **Drapeaux** posés par la scène sur `<html>` : `has-scene` quand le prisme est prêt (le poster SVG s'efface en CSS), `has-3d-title` quand les plans de mots sont prêts (les spans DOM passent à `opacity: 0` en 0.6 s, sans changer la mise en page). Retirés au démontage.
- **Props** : `Prism({ mobile, reducedMotion })`, `HeroTitle3D({ reducedMotion })` (non monté sur mobile ni en reduced-motion), `Effects()` (monté seulement si `!mobile && !reducedMotion`).
- **Timeline caméra** : `getTimeline() = hero + projects + services + about + contact` (chacun 0 → 1). Le hero couvre [0, 1] ; les phases suivantes ajoutent leurs clés au-delà.
- **Nav** : `<header>` avec `<nav aria-label>`, liens `#projets`, `#services`, `#a-propos`, CTA `#contact`. Clic → `scrollToTarget` (Lenis) ; focus déplacé sur la section cible.

## 5. Budget

- Draw calls : prisme 1 (transmission : la scène est re-rendue dans un FBO, + backside), faisceau 1, rayons 7, mots 2, soit ~12 meshes et moins de 40 appels avec le bloom.
- Assets : `prism.glb` 11 Ko. Aucune texture image (le texte 3D est rasterisé en local).
- JS initial : Nav + Hero + motion (LazyMotion, `domAnimation`), viser < 150 Ko gz. Postprocessing dans le chunk lazy de la scène.
- Desktop : transmission (samples 6, résolution 512), bloom, flottement, titre 3D réfracté, antialias via `multisampling` du composer.
- Mobile : pas de transmission (verre `meshPhysicalMaterial` non transmissif), pas de postprocessing, pas de flottement, pas de titre 3D (h1 DOM au-dessus, dissous par GSAP), dpr 1.5.
- Reduced-motion : état final, aucune boucle continue, pas de pin, transmission `meshPhysicalMaterial transmission={1}` (rendu unique).
- Sans WebGL : poster SVG (prisme, faisceau, spectre) dans le DOM, h1 visible.

## 6. Risques

1. **Coût de la transmission** sur GPU intégré → samples 6, résolution 512, `backside` seulement si dpr ≤ 2, et le flottement ne force le rendu que quand le hero est visible.
2. **Pin + hydratation + Lenis** → timeline créée en `useLayoutEffect` après hydratation, `ctx.revert()` au démontage, `ScrollTrigger.refresh()` après fonts et après chargement du GLB.
3. **Alignement titre 3D / DOM** au resize → recalcul des plans (debounce 150 ms) sur `resize` et `ScrollTrigger` `refreshInit` ; fondu croisé de 0.6 s pour masquer les écarts de quelques pixels.

## 7. Décisions

- Bloom à seuil haut (`luminanceThreshold` 1, `mipmapBlur`) + matériaux émissifs `toneMapped={false}` plutôt que SelectiveBloom : pas de passe de sélection en plus, seuls les rayons, le faisceau et les bords de dissolution dépassent 1.
- Titre derrière le prisme = plans 3D (CanvasTexture rasterisée avec la police chargée), pas `drei/Text` : aucune dépendance (troika), rendu identique au DOM, et la transmission le réfracte. Le h1 DOM reste la source (a11y, SEO, LCP, mobile).
- Quart de tour sur l'axe Z du groupe : la composition horizontale (lumière à gauche, spectre à droite) devient verticale (lumière en haut, spectre vers le bas), ce qui mène vers les projets.
- Progress de la caméra = somme des progress de section (`getTimeline()`), pas le scroll global : les clés ne dépendent pas de la longueur de la page.
- Nav livrée en Phase 1 : le CTA « Discuter d'un projet » doit être visible dès la première seconde (objectif de conversion).
- Antialias : `gl.antialias` seulement sans composer (mobile) ; sur desktop, `multisampling={4}` du composer.
- `useContinuousInvalidate(active)` : seule boucle de rendu continu, coupée hors écran, en reduced-motion et onglet masqué.
- Montage de la scène au premier scroll sur mobile : écarté pour la Phase 1 (le prisme est l'identité du hero) ; à rouvrir si le TBT mobile dépasse 300 ms.
- Polices de repli ajustées (`size-adjust`, `ascent-override`) : faites (`src/styles/fonts.css`).
