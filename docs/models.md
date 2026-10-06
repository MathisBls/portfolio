# Mesures des modèles (public/models/*.glb)

Relevées dans les GLB exportés (accessors POSITION et transforms des nodes), en unités monde, Y en haut. Aucun modèle n'a d'animation. Les noms de nodes suivent `PropertyBinding.sanitizeNodeName` (points supprimés). Types : `src/scene/objects/types.ts`.

## prism.glb (~11 Ko)

- `Prism` (matériau `Glass`, transmission 1) : prisme triangulaire, axe long sur Z (±1.1). Triangle dans le plan XY, **sommet en haut** (y = 0.974), base à y = −0.5, x ∈ [−0.851, 0.851]. Centroïde ≈ origine.
- `BeamIn` (`BeamWhite`, émissif blanc, strength 2) : faisceau horizontal de x = −3.4 à x = −0.8, à y = 0.15, épaisseur 0.08.
- `Spec0..6` (émissifs, strength 2 ; `Spec6` 1.6) : éventail qui part de x ≈ 0.9 (face droite) et s'ouvre jusqu'à x ≈ 3.37. Angles −18° (Spec0) à +18° (Spec6), pas de 6°. Extrémités : Spec0 (3.37, −0.835), Spec3 (3.5, 0), Spec6 (3.37, 0.835). **Spec0 = rouge en bas, Spec6 = violet en haut.** Chaque rayon : longueur 2.6 sur son Y local, section 0.05.
- Couleurs émissives : Spec0 `#ff0000`, Spec1 `#ff8000`, Spec2 `#ffff00`, Spec3 `#00ff00`, Spec4 `#0099ff`, Spec5 `#4d00ff`, Spec6 `#bf00ff`.
- Emprise totale : x ∈ [−3.4, 3.4], y ∈ [−0.84, 0.97].

## zephyr.glb (~28 Ko, refait le 2026-10-06 : scripts/blender/model_zephyr.py)

- `Zep_Logo_Root` > `Zep_Logo_Face` (face avant texturée avec le logo, JPEG embarqué) + `Zep_Logo_Side` (flancs et dos bleu profond) : le « Z » de Zephyr tracé depuis `public/textures/zephyr/logo.png`, 4 facettes extrudées et biseautées, décalées en profondeur.
- `Zep_Star` : étoile GitHub 5 branches, or #e3b341 légèrement émissif.
- `Zep_Git_Root` > `Zep_Git_Diamond` (losange orange #f05033) + `Zep_Git_Graph` (graphe de branche blanc en relief, deux faces).
- Emprise utilisée par le composant : largeur 2.8, hauteur 1.8, centrée à l'origine.

## fitness.glb (~24 Ko, ajouté le 2026-10-06 : scripts/blender/model_fitness.py)

- `Fit_Body` + `Fit_Screen` (écran 0.80 × 1.78, UV 0..1, captures appliquées en code), `Fit_Card1`/`Fit_Card2` (écrans flottants), `Fit_RingTrack`/`Fit_RingArc` (anneau de progression), `Fit_Dumbbell_Root` > `Fit_Bar` + 4 disques. Le téléphone sert aussi à Wegir.

## wegir.glb (~33 Ko)

- `Road` : arc de route dans le plan XZ, **cercle de centre (−2.2, 0, 0) et de rayon 2.2** (axe de la voie), largeur ≈ 0.7. Couvre φ ∈ [−70°, 70°] environ. Dessus de la route à y = 0.
- `Dash0..35` (8 tirets) posés sur l'axe de la voie.
- `Car0_Root`, `Car1_Root`, `Car2_Root` (empties) à φ = +35°, 0°, −35°. Position sur l'arc : `(−2.2 + 2.2 cos φ, 0, 2.2 sin φ)`, orientation : `rotation.y = π/2 − φ` (vérifié sur les trois voitures).
- Enfants de chaque voiture : `CarN_Body` (0.62 × 0.22 × 0.34, à y = 0.19 ; Car0 rouge, Car1 jaune, Car2 bleue), `CarN_Cab` (matériau `Screen`, émissif cyan), 4 roues `CarN_W…` (rayon 0.08, rotation.x = π/2 : **faire tourner une roue = `rotation.y`**).
- Emprise : x ∈ [−1.57, 0.35], z ∈ [−2.4, 2.4], y ∈ [−0.12, 0.47]. Le modèle n'est pas centré en X.

## quorin.glb (~11 Ko)

- `Phone_Body` 0.9 × 1.8 × 0.08 centré, `Phone_Screen` sur la face +Z (émissif cyan), `Phone_Cam` au dos.
- Fantômes `PhoneG1_*` décalés de (+0.35, 0, −0.35), `PhoneG2_*` de (+0.7, 0, −0.7). Matériaux `Ghost1` (teal) et `Ghost2` (violet), alpha BLEND 0.35.

## gamefactory.glb (~21 Ko)

- `Belt` : tapis de x −1.6 à 1.6, dessus à y ≈ 0.56, profondeur 0.9. `Roller-16` et `Roller16` aux deux bouts (axe Z : **faire tourner = `rotation.y`**). 6 pieds `Leg*`.
- `Hopper` (cube 0.9) en (−1.1, 1.15, 0), `Chute` en (−0.55, 0.9, 0).
- `Die0..2` (cubes de 0.32, posés à y = 0.72) en x = −0.2, 0.55, 1.3. Les points (`Pip*`) sont enfants de leur dé : animer le dé suffit.
- Emprise : x ∈ [−1.6, 1.6], y ∈ [−0.05, 1.6].

## pizza.glb (~13 Ko)

- Ajout du 2026-10-06 (scripts/blender/model_pizza_browser.py) : `Pizza_Browser_Root` > cadre, barre, 3 points, `Pizza_Site` (écran 2:1 où défilent les captures du site).

- Une part : **pointe à l'origine**, croûte à x = 1.6, z ∈ [−0.61, 0.61], hauteur 0.22. `Dough`, `Sauce`, `Cheese`, `Crust`, 4 `Pep*`, 3 `Basil*`.
- Pour pivoter autour du centre de la part, décaler le contenu de x = −0.8 dans un `<group>`.
