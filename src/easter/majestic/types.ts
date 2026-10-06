// Nœuds de public/models/easter/majestic.glb (agent B2, script scripts/blender/model_easter_majestic.py,
// source blender/easter_majestic.blend). Cotes mesurées dans le GLB exporté (voir aussi docs/models.md).
// Repère glTF : Y en haut, mètres. Montagne centrée sur l'axe Y (pointe en x = z = 0), pied à y = 0,
// façade (le B) tournée vers +Z. Un nœud à plusieurs matériaux est un Group dont les enfants sont des Mesh
// (un par matériau). Aucune animation, aucune image : textures dans textures.ts, matériaux réglés en code.
//
// Montagne (garder Mountain, Mountain_B et Summit_* dans un même groupe pour la montée)
// - Mountain : pic en corne à 7 arêtes (épaules, antécime, brèche), faces creusées, couloirs, cannelures,
//   strates inclinées, tablier d'éboulis. 61 k triangles. Le maillage s'arrête au plateau (y = cutY, plat,
//   gravé : cercles, 12 rayons, cadre du prisme) ; la pointe, ce sont les deux coques. Jupe enterrée jusqu'à
//   skirtY. Matériau MountainRock : couleur et normales cuites (normales EN ESPACE OBJET, cf. textures.ts),
//   atlas polaire unique partagé avec la partie rocheuse des coques (UV0 ; aucune répétition).
// - Mountain_B : le B (tracé de btv_logo.svg : fût et deux panses) en relief dans une niche taillée de la
//   façade, inclinée vers le ciel (normale `b.normal`). Relief 15 à 18 m au-dessus du fond de la niche, arêtes
//   arrondies. Origine = centre du B (translation du nœud). Matériau MountainB : pierre (stone*, UV : 1 tuile
//   = 24 m) + émissif rose #ff2d78 (facteur 1 dans le GLB) : le code règle emissiveIntensity (0 = éteint).
// - Summit_Prism : prisme de verre (triangle dans le plan XY, pointe en haut, épaisseur selon Z), arêtes
//   chanfreinées. Origine au centre de sa base, posée sur le plateau. SummitGlass (transmission), à remplacer
//   (MeshTransmissionMaterial ; pas d'UV).
// - Summit_Shell_L / Summit_Shell_R : les deux moitiés de la pointe (x < 0 / x > 0), creuses, géode
//   intérieure. Sous-maillages : MountainRock (dehors, même atlas que Mountain), SummitInner (paroi intérieure
//   et tranches, stone*, 1 tuile = 20 m), SummitCrystal (~115 cristaux hexagonaux par coque, émissif violet,
//   sans UV utiles). Fermées, elles prolongent la montagne sans joint visible ; leurs cristaux ne touchent pas
//   le prisme.
//   ORIGINE = CHARNIÈRE : axe parallèle à Z passant par (hingeX, cutY, 0), au bord extérieur bas de chaque
//   moitié. Ouverture vers l'extérieur (deux pétales) : L.rotation.z = +θ, R.rotation.z = -θ. Aucune
//   collision avec la montagne ni le prisme de 0 à π ; pose conseillée : openAngle (≈ 66°). Au repos, le bas
//   de la paroi intérieure plonge de 17 m dans la montagne (invisible).
//
// Chœur
// - Choir_Statue : colosse encapuchonné de pierre (robe à plis profonds et cascade centrale, pèlerine,
//   manches en cloche tombant jusqu'aux genoux, mains jointes, visage dans le creux de la capuche).
//   Origine au pied, face vers +Z. 33 k triangles. ChoirStone (stone*, UV cylindriques : 1 tuile = 8 m).
// - Choir_Glow (enfant de Choir_Statue, même origine, transformation identité) : mains jointes, yeux clos,
//   bouche ouverte. ChoirGlow, émissif chaud #ffd9a0 × 4 (KHR_materials_emissive_strength).
//   Instancier les deux maillages avec les mêmes matrices (12 fois, 8 sur mobile).
//
// Débris : Rock_A, Rock_B, Rock_C, blocs fracturés à facettes (200 à 400 triangles). Origine au centre de la
// masse (rotation libre), nœud à l'origine. RockDebris (cliff*, UV par projection : 1 tuile = 4 m).
export type MajesticNode =
  | 'Mountain'
  | 'Mountain_B'
  | 'Summit_Prism'
  | 'Summit_Shell_L'
  | 'Summit_Shell_R'
  | 'Choir_Statue'
  | 'Choir_Glow'
  | 'Rock_A'
  | 'Rock_B'
  | 'Rock_C'

export type MajesticMaterial =
  | 'MountainRock'
  | 'MountainB'
  | 'SummitInner'
  | 'SummitCrystal'
  | 'SummitGlass'
  | 'ChoirStone'
  | 'ChoirGlow'
  | 'RockDebris'

type Vec3 = readonly [number, number, number]

/** Cotes utiles au placement et à l'animation (mètres, repère glTF). */
export const MAJESTIC_DIMS = {
  mountain: {
    /** Pointe du sommet (haut des coques fermées). */
    height: 1200,
    /** Plateau du sommet : haut du maillage Mountain, pied du prisme, joint avec les coques. */
    cutY: 1010,
    /** Rayon du pied en y = 0 : moyenne, minimum (creux des faces) et maximum (bout des arêtes). */
    baseRadius: 907,
    baseRadiusMin: 738,
    baseRadiusMax: 1083,
    /** Emprise de la jupe enterrée (x, z) et son bas. */
    skirtRadius: 1105,
    skirtY: -41.5,
    /** Distance minimale de l'axe au bord du plateau (marge autour du prisme). */
    plateauMinRadius: 103,
  },
  b: {
    /** Centre du B (origine du nœud Mountain_B). */
    center: [0, 542.5, 193.9] as Vec3,
    /** Normale du fond de la niche (façade inclinée de 14.4° vers le ciel). */
    normal: [0, 0.249, 0.968] as Vec3,
    /** Hauteur et largeur du B dans le plan de la niche. */
    height: 340,
    width: 221.6,
  },
  summit: {
    prismHeight: 120,
    prismWidth: 138.6,
    prismDepth: 56,
    /** Centre de la base du prisme (origine du nœud Summit_Prism). */
    prismBase: [0, 1010, 0] as Vec3,
    /** Charnières (origines des nœuds) : axe parallèle à Z. */
    hingeL: [-149.2, 1010, 0] as Vec3,
    hingeR: [182.1, 1010, 0] as Vec3,
    /** Pose ouverte conseillée (rad) ; L.rotation.z = +θ, R.rotation.z = -θ, sans collision jusqu'à π. */
    openAngle: 1.15,
    openAngleMax: Math.PI,
  },
  choir: {
    height: 80.2,
    /** Rayon de l'ourlet au sol (emprise des manches : ±19.3 m en x). */
    footRadius: 17.5,
    /** Repères dans le repère de la statue, pour viser faisceaux et lumières. */
    hands: [0, 55, 11.2] as Vec3,
    face: [0, 70.2, 4.5] as Vec3,
    mouth: [0, 68.3, 4] as Vec3,
  },
  rocks: {
    /** Plus grande dimension de chaque débris. */
    Rock_A: 3.0,
    Rock_B: 6.5,
    Rock_C: 12.6,
  },
} as const
