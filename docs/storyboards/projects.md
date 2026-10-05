# Storyboard — Projets (Phase 2)

## 1. Intention

Chaque rayon du spectre mène à un projet : le visiteur voit 5 réalisations concrètes (4 produits, 1 site client), chacune avec un objet 3D vivant à côté de sa card, et comprend en un coup d'œil la stack et où cliquer.

## 2. Storyboard scroll

Deux niveaux de progress :

- **`projects`** (section) : ScrollTrigger `start: 'top bottom'`, `end: 'bottom bottom'`, `scrub: true`. Il fait avancer la timeline caméra de 1 à 2.
- **`project:<slug>`** (une card) : ScrollTrigger sur l'emplacement visuel, `start: 'top bottom'`, `end: 'bottom top'`, `scrub: true`, sans lissage pour que l'objet 3D reste collé au DOM (Lenis lisse déjà).

| projects | Caméra                       | 3D                                                                                                                                                                                                                          | DOM                                       |
| -------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 0.0      | (0, −1.5, 12) → (0, −1.5, 0) | État final du hero : prisme dans le tiers haut, éventail vers le bas                                                                                                                                                        | Titre de section « 01 / Projets » + intro |
| 0.1      | idem                         | Le groupe du prisme monte (y 0 → +3.4, `projects` 0 → 0.15) : le prisme sort par le haut, seuls les rayons descendent dans l'écran                                                                                          | Première card entre                       |
| 0.2–0.9  | idem (caméra fixe)           | Pour la card active (`activeIndex`) : son objet 3D est ancré sur l'emplacement visuel, et **son rayon** se réoriente vers l'objet, s'allonge jusqu'à lui et prend la couleur de l'accent. Les autres rayons tombent à 15 %. | Cards 1 → 5, apparitions `data-reveal`    |
| 1.0      | idem                         | Dernier objet sorti par le haut, rayons au repos                                                                                                                                                                            | Fin de section, Services arrive           |

Par card (`project:<slug>`, p de 0 à 1) :

| p           | Objet 3D                                                                           |
| ----------- | ---------------------------------------------------------------------------------- |
| 0 → 0.25    | Entrée : scale 0 → 1, rotation y −0.6 → 0 (easeOut)                                |
| 0.25 → 0.75 | Animation continue (voir ci-dessous) ; réaction au survol de la card               |
| 0.75 → 1    | Sortie : scale 1 → 0.85, opacité conservée (l'objet sort par le haut avec la card) |

Position : centre de l'emplacement en px (`slotCenterY(p, metrics)`, horizontal = `left + width / 2`), déprojeté sur le plan z = 0. Échelle : largeur de l'emplacement × 0.8 / largeur du modèle.

Animations continues (seulement quand la card est à l'écran, `useContinuousInvalidate`) :

- **Zephyr** : les 3 rubans tournent sur Y à des vitesses différentes (0.3 / −0.2 / 0.45 rad/s) et ondulent légèrement. `TealGlass` est remplacé par un `meshPhysicalMaterial` non transmissif (un seul objet transmission à la fois). Survol : vitesse ×2.
- **Wegir** : les 3 voitures roulent sur l'arc (centre (−2.2, 0, 0), rayon 2.2, φ ∈ [−70°, 70°], bouclage), `rotation.y = π/2 − φ`, roues en `rotation.y`. Groupe recentré (+0.6 en x) et incliné (x 0.5) pour lire la route d'en haut. Survol : vitesse ×1.8.
- **QuorinOS** : le téléphone oscille doucement en Y. Survol : les fantômes G1/G2 se décalent davantage (+0.35 → +0.6 par cran) avec un léger éventail.
- **Game Factory** : les dés avancent sur le tapis de x −0.4 à 1.6, tombent, réapparaissent sous la goulotte ; rouleaux en `rotation.y`. Survol : cadence ×1.6.
- **Meme Rina** : la part pivote lentement autour de son centre (contenu décalé de x −0.8) avec une légère lévitation. Survol : la part se soulève et le fromage s'étire (scale y du `Cheese`).

## 3. Arborescence

| Fichier                                                     | Propriétaire | Rôle                                                                                                             |
| ----------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------- |
| `src/lib/projects.ts` (+ test)                              | contrat      | `assignRays`, `slotCenterY`, `activeIndex` (fait)                                                                |
| `src/scene/store.ts`                                        | contrat      | + `setAnchorMetrics/getAnchorMetrics`, état zustand `projectsNear` (montage des objets)                          |
| `src/content/site.ts`                                       | contrat      | Textes de la section (intro, libellés de liens, label « Projet », alt des posters)                               |
| `src/scene/objects/useAnchoredObject.ts`                    | motion-3d    | Hook commun : position/échelle depuis l'ancre, entrée/sortie, visibilité, position monde exposée pour les rayons |
| `src/scene/objects/{Zephyr,Wegir,Quorin,Factory,Pizza}.tsx` | motion-3d    | Un composant par modèle, animation continue + survol                                                             |
| `src/scene/objects/ProjectObjects.tsx`                      | motion-3d    | Monte les 5 objets (Suspense chacun) quand `projectsNear`, desktop non reduced seulement                         |
| `src/scene/objects/Prism.tsx`                               | motion-3d    | Montée du prisme pendant `projects` 0 → 0.15 ; visée du rayon actif                                              |
| `src/scene/cameraPath.ts`                                   | motion-3d    | Clé à 2 identique à 1 (caméra fixe)                                                                              |
| `src/sections/Projects.tsx` + `.module.css`                 | ui-dev       | Section, intro, ScrollTriggers `projects` et `project:<slug>`, mesures des emplacements                          |
| `src/ui/ProjectCard.tsx` + `.module.css`                    | ui-dev       | Card : emplacement visuel 4:3 (poster WebP par défaut), label mono, titre, tagline, description, stack, liens    |

## 4. Contrats

- **Emplacement visuel** : `<div data-slot>` 4:3, sans fond (le canvas est visible au travers). Contient l'`<img>` du poster (`/posters/<model>.webp`, `loading="lazy"`, `width`/`height`, `alt=""` car décoratif) ; le poster s'efface sous `html.has-project-objects`.
- **Ancres** : `registerAnchor('project:<slug>', slotEl)`. Au `refresh` de ScrollTrigger : `setAnchorMetrics('project:<slug>', { left, width, height, viewportH })`. À chaque update : `setProgress('project:<slug>', p)`.
- **Montage** : ScrollTrigger `projects-near` (`start: 'top bottom+=100%'`) → `useScene.getState().setProjectsNear(true)` ; la scène précharge et monte les objets.
- **Survol** : `mouseenter/focus` sur la card → `useScene.getState().setHovered(slug)`, `mouseleave/blur` → `null`.
- **Drapeau** `has-project-objects` : posé par `ProjectObjects` quand les 5 objets sont prêts.
- **Rayons** : `assignRays(projects.map(p => p.accent))` donne l'indice du rayon par projet ; la couleur du rayon actif tend vers l'accent du projet.
- **Card** : toute la card est cliquable par un lien étiré sur le titre (lien principal = site, sinon store, sinon GitHub) ; les autres liens restent cliquables au-dessus (`z-index`). Pas de liens imbriqués.
- **Mobile, reduced-motion, sans WebGL** : posters, aucun objet 3D, rayons au repos.

## 5. Budget

- 5 GLB Draco (~97 Ko au total), chargés seulement à l'approche de la section.
- Draw calls : Zephyr 3, Wegir 30, Quorin 9, Factory 20, Pizza 11. Seuls 1 ou 2 objets sont visibles à la fois (les autres ont `visible = false` hors écran). Avec le prisme : moins de 80 appels.
- Posters : 9 à 25 Ko chacun, en lazy.
- Une seule boucle continue (`useContinuousInvalidate`) tant qu'un objet est à l'écran.

## 6. Risques

1. **Décalage DOM / 3D pendant le scroll** → progress sans lissage (`scrub: true`), mesures relues à chaque `refresh`, déprojection exacte avec la caméra courante.
2. **Coût du prisme en transmission pendant les projets** → le prisme sort de l'écran (`visible = false` au-dessus du cadre) ; seuls les rayons restent.
3. **Lien étiré + liens secondaires** → les liens secondaires en `position: relative; z-index: 1`, focus visible sur chacun.

## 7. Décisions

- Objets ancrés aux emplacements DOM par la scène (déprojection depuis les mesures et le progress), pas `drei/View` : une seule caméra, une scène continue, et les rayons peuvent viser les objets.
- Caméra fixe pendant les projets : l'ancrage reste exact et lisible ; le mouvement vient du prisme qui sort et des rayons qui visent.
- Attribution des rayons par teinte la plus proche (optimale, testée) plutôt qu'en dur : si un accent change dans `projects.ts`, le rayon suit.
- Reduced-motion : posters (skill r3f-scroll-scene), pas d'objets 3D.
