// Nœuds de public/models/easter/park.glb (agent B, script scripts/blender/model_easter_park.py).
// Repère glTF : Y en haut, unités en mètres, chaque groupe centré à l'origine (le code le place).
// L'« avant » des vaisseaux et du wagon est -Z. Ce qui fait face à la caméra (écrans, porte, enseigne) regarde +Z.
// Un nœud à plusieurs matériaux est un Group dont les enfants sont des Mesh (un par matériau).
//
// Cockpit (caméra à l'origine, regard -Z, fov vertical 60°, 16:9)
// - Cockpit_Frame : montants de verrière et arceau haut. Le haut de l'image reste dégagé au centre.
// - Cockpit_Dash : auvent (bourrelet à y ≈ -0.17 m, z ≈ -0.56 m : le tableau occupe les 25 % du bas de l'image),
//   face inclinée, touches, interrupteurs, manettes, consoles latérales (hors champ au repos).
// - Cockpit_ScreenL/C/R : quads plats face à l'œil, matériau partagé `CockpitScreen`, UV 0→1 sur tout
//   l'écran (image à l'endroit avec texture.flipY = false). C : 0.18 × 0.1015 m (16:9), L/R : 0.135 × 0.1015 m (4:3),
//   à ~0.62 m de l'œil, centres à 24.2° sous l'horizon, L/R à ±21° en lacet. Entièrement visibles en 16:9
//   (de 80 % à 98 % de la hauteur de l'image).
// - Cockpit_Stick : manche entre les genoux (hors champ au repos).
//
// Porte du parc (anneau dans le plan XY, axe Z, face avant +Z)
// - Gate_Ring : anneau Ø 77 m (corps r 30 → 38.5 m, 7 m d'épaisseur), habitats/radiateurs jusqu'à r ≈ 41 m,
//   8 projecteurs, charnières, treillis de l'enseigne jusqu'à y ≈ 51 m. Ouverture intérieure : r = 30 m.
// - Gate_Sign : « BOULARDTV » en arc au-dessus de l'anneau (y 33 → 52 m, x ±34 m). Faces avant en
//   `GateNeon` (rose #ff2d78), chants en `GateMetal`. UV.x = position le long du mot (0 à gauche, 1 à droite)
//   pour un allumage en rampe.
// - Gate_Lights : feux de position, projecteurs, hublots (matériau `GateLights`, blanc chaud).
//   UV.x = angle depuis le bas de l'anneau / π (0 en bas, 1 en haut, symétrique gauche/droite).
// - Gate_DoorL / Gate_DoorR : deux demi-disques r = 29.85 m (x ≤ -0.06 / x ≥ 0.06), ép. ~1.3 m, logo B
//   coupé en deux au joint. ORIGINE = CHARNIÈRE verticale en x = ∓29.9 (y = z = 0).
//   Ouverture recommandée : rotation vers l'intérieur du parc (-Z) autour de Y,
//   DoorL.rotation.y = +θ, DoorR.rotation.y = -θ, θ de 0 à ~100° (1.75 rad).
//   Une translation x (DoorL -31 m, DoorR +31 m) marche aussi, mais les battants traversent l'anneau.
//
// Vaisseaux (avant -Z, enfants `*_Engine` = flammes au matériau émissif `ShipEngine`, déjà en place)
// - Ship_A : chasseur, 13 m (z -6.4 → 6.7), envergure 10.8 m.
// - Ship_B : yacht de croisière, 32 m (z -15.8 → 16.5), 11.9 m de large.
// - Ship_C : cargo à conteneurs, 41.7 m (z -20.4 → 21.3), 17.2 m de large.
//
// Wagon (un seul, à instancier) : Coaster_Car, avant -Z, 3.4 m de long, 1.4 m de large, haut de 1.44 m
// au-dessus de l'axe du rail. Rail tubulaire supposé de rayon 0.18 m centré à l'origine selon Z ; dessous du
// rail libre sur |x| < 0.12 m (supports). 7 sous-maillages : instancier par sous-maillage (InstancedMesh).
//
// Grande roue (plan XY, axe Z)
// - Wheel_Rim : jante Ø 60 m + rayons + flasques ; tourner = rotation.z.
// - Wheel_Hub : axe, paliers, deux pylônes en A, socle (dessous du socle à y ≈ -39.2 m). Fixe.
// - Wheel_Cabin : une cabine, ORIGINE = point d'accroche (pend vers -Y, 3.5 m sous l'origine). Points d'accroche :
//   24 cabines sur le cercle r = 30 m (angle k × 15°, à partir de +X), z = 0 ; garder la cabine verticale
//   (rotation.z = -rotation de la jante). 4 sous-maillages : instancier par sous-maillage.
//
// Écran géant : Screen_Frame (cadre, caisson nervuré, 4 pods de propulseurs, x ±10.2 m) et Screen_Panel
// (16 × 9 m, face +Z à z = 0.62, UV 0→1, matériau `ScreenPanel`, image à l'endroit avec flipY = false).
//
// Matériaux émissifs utiles : GateNeon, GateLights, ShipEngine, ShipLights, ShipWindows, CoasterLights,
// CoasterHeadlight, WheelLights, WheelLightsWarm, CabinGlow, ScreenLights, CockpitAccent, CockpitIndicator.
export type ParkNode =
  | 'Cockpit_Frame'
  | 'Cockpit_Dash'
  | 'Cockpit_ScreenL'
  | 'Cockpit_ScreenC'
  | 'Cockpit_ScreenR'
  | 'Cockpit_Stick'
  | 'Gate_Ring'
  | 'Gate_DoorL'
  | 'Gate_DoorR'
  | 'Gate_Sign'
  | 'Gate_Lights'
  | 'Ship_A'
  | 'Ship_A_Engine'
  | 'Ship_B'
  | 'Ship_B_Engine'
  | 'Ship_C'
  | 'Ship_C_Engine'
  | 'Coaster_Car'
  | 'Wheel_Rim'
  | 'Wheel_Hub'
  | 'Wheel_Cabin'
  | 'Screen_Frame'
  | 'Screen_Panel'

/** Cotes utiles au placement et à l'animation (mètres, repère glTF). */
export const PARK_DIMS = {
  gateInnerRadius: 30,
  gateDoorHingeX: 29.9,
  gateDoorMaxAngle: 1.75,
  wheelCabinRadius: 30,
  wheelCabinCount: 24,
  coasterRailRadius: 0.18,
  screenWidth: 16,
  screenHeight: 9,
} as const
