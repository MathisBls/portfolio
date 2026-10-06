# Storyboard v2 — l'histoire (2026-10-06)

Choix : **sens de la piste A** (« Your idea is the light »), **mise en scène de la piste C** (une descente continue qui suit la lumière) et **fond de la piste B** (éclats de verre vivants). Voir `docs/story.md`. Remplace la narration 3D des storyboards v1 ; les mécaniques (pin du hero, ancrage des objets, posters) restent.

## Métaphore, dite à l'écran

- **Lumière blanche** = l'idée du client.
- **Prisme** = Mathis : il transforme l'idée.
- **Spectre** = ce qui en sort : design, code, produit ; chaque rayon mène à un projet réel.
- **Éclats de verre** = la matière première : ils s'assemblent en prisme au début, accompagnent la descente, et attendent au Contact.

Chaque étape a **une phrase à l'écran** (DOM, lisible sans 3D). La 3D illustre, le texte explique.

## Beats

| Moment                   | 3D                                                                                                                                                       | Texte à l'écran (EN)                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Chargement (≈ 1.5 s)     | Des éclats de verre convergent et **s'assemblent en prisme** (intro, pas de scroll). Le nom est derrière, réfracté.                                     | h1 + rôle + CTA (inchangés)                                 |
| Hero 0.10 → 0.30         | Le faisceau blanc entre                                                                                                                                  | Caption 1 : « Every project starts as a single idea. »      |
| Hero 0.30 → 0.55         | Les 7 rayons s'allument un par un                                                                                                                        | Caption 2 : « I turn it into design, code and a product that ships. » |
| Hero 0.55 → 1            | Quart de tour : le spectre pointe vers le bas, vers les projets ; le nom se dissout                                                                      | Caption 3 : « Here is what came out of the prism. »         |
| Work                     | **La caméra descend** en suivant les rayons (plus de caméra fixe) ; le prisme sort par le haut ; le rayon du projet actif vise son objet ; les éclats défilent en parallaxe | Titre : « What came out of the prism »                      |
| Bandeau                  | Les éclats accélèrent légèrement (vitesse du scroll)                                                                                                    | Bandeau (inchangé)                                          |
| Services                 | Les rayons se rétractent ; les éclats ralentissent                                                                                                      | Titre : « Three ways to work together »                     |
| About                    | Calme : quelques éclats proches, lents                                                                                                                  | Titre : « One person, start to finish »                     |
| Contact (arrivée)        | Le prisme **redescend dans le cadre, vide** : ni faisceau ni rayons. Les éclats se rassemblent autour de lui.                                           | Titre : « Your idea is next. »                              |
| Contact (envoi réussi)   | **Le faisceau blanc entre dans le prisme et le spectre jaillit** (≈ 2 s), puis se pose : la boucle est bouclée.                                         | Message de succès                                           |

Reduced-motion : pas d'intro d'assemblage, pas de descente, captions toutes visibles (liste statique), Contact sans rafale (état « spectre posé » directement après l'envoi). Mobile : éclats réduits (≈ 40), pas de transmission ni de bloom, captions DOM identiques.

## Contrats

- `src/lib/hero.ts` : fenêtres `captions` (3 fenêtres d'apparition et de disparition), testées.
- `src/content/site.ts` : `site.hero.captions` (3 phrases) et les titres de section ci-dessus.
- `src/scene/store.ts` : drapeau `ideaSent` (+ `setIdeaSent`), posé par `ContactForm` au succès ; la scène joue la rafale une fois.
- `src/scene/objects/ShardField.tsx` : remplace `AmbientShapes` (un seul `InstancedMesh`, ≈ 150 éclats desktop, ≈ 40 mobile) ; gère l'intro d'assemblage et le rassemblement au Contact.
- `src/scene/cameraPath.ts` : descente continue sur Work → About, la caméra rejoint le prisme au Contact.

## Budget

- `ShardField` : 1 draw call (instancié), pas de transmission ; matrices mises à jour par frame seulement quand la boucle continue tourne.
- La rafale de succès : 2 s de rendu continu, puis retour en frameloop « demand ».
