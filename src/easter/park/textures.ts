// Easter egg v3 : chemins des textures du parc spatial (public/textures/easter/), chargées
// seulement pendant l'easter egg. D1 et D2 n'importent que ce fichier.
//
// Sources et licences (crédit affiché dans site.legal.ip.text) :
// - Ciel : panorama de la Voie lactée « eso0932a », ESO/S. Brunier, CC BY 4.0
//   (https://www.eso.org/public/images/eso0932a/). Équirectangulaire 2:1, coordonnées
//   galactiques (le plan de la Galaxie suit l'équateur de la texture), raccord gauche/droite propre.
// - Planètes : Solar System Scope, CC BY 4.0 (https://www.solarsystemscope.com/textures/),
//   d'après des données NASA. Équirectangulaires 2:1. makemake et haumea sont des textures
//   « fictional » de la même source. moon et haumea sont presque en niveaux de gris : ce sont
//   les meilleures bases pour une teinte en code (color du matériau multipliée par la map).
// - Écrans : rendus et logo BoulardTV fournis par Mathis (BoulardTV_models/, btv_anim/), SFW
//   uniquement. Exclus : les cartes avec photos, les animations de la légendaire face visible
//   (photo suggestive) et la vidéo 1772908392289 (fichier tronqué, personnage sous licence tierce).
//
// Formats : webp (qualité 76 à 86) ; versions « Mobile » en 1K (planètes) ou 2K (ciel).
// L'anneau de Saturne garde son alpha (webp sans perte, bande radiale 2048×125 : u = rayon).
// Vidéos : MP4 H.264 Main, 1280×720, 30 i/s, sans piste audio, faststart, boucles sans couture.

/** Voie lactée équirectangulaire : 4096×2048 (desktop), 2048×1024 (mobile). */
export const SKY = {
  full: '/textures/easter/sky/milkyway.webp',
  mobile: '/textures/easter/sky/milkyway-2k.webp',
} as const

const P = '/textures/easter/planets/'

/** Cartes couleur des planètes : 2048×1024 (map), 1024×512 (mapMobile). */
export const PLANETS = {
  jupiter: { map: `${P}jupiter.webp`, mapMobile: `${P}jupiter-1k.webp` },
  saturn: {
    map: `${P}saturn.webp`,
    mapMobile: `${P}saturn-1k.webp`,
    ring: `${P}saturn-ring.webp`,
    ringMobile: `${P}saturn-ring-1k.webp`,
  },
  neptune: { map: `${P}neptune.webp`, mapMobile: `${P}neptune-1k.webp` },
  mars: { map: `${P}mars.webp`, mapMobile: `${P}mars-1k.webp` },
  moon: { map: `${P}moon.webp`, mapMobile: `${P}moon-1k.webp` },
  /** Lumières des villes sur fond presque noir : à utiliser en emissiveMap (limbe à contre-jour). */
  earthNight: { map: `${P}earth-night.webp`, mapMobile: `${P}earth-night-1k.webp` },
  venusAtmosphere: {
    map: `${P}venus-atmosphere.webp`,
    mapMobile: `${P}venus-atmosphere-1k.webp`,
  },
  makemake: { map: `${P}makemake.webp`, mapMobile: `${P}makemake-1k.webp` },
  haumea: { map: `${P}haumea.webp`, mapMobile: `${P}haumea-1k.webp` },
} as const

export type PlanetName = keyof typeof PLANETS

export type ScreenMedia = { src: string; kind: 'image' | 'video' }

const S = '/textures/easter/screens/'

/**
 * Visuels BoulardTV SFW pour les écrans géants (16:9, 1280×720). Les vidéos bouclent :
 * btv-card-back 5.7 s (dos de la carte légendaire qui approche puis repart),
 * btv-arena-flyover 12 s, btv-cards-pan 12 s. Sur mobile, préférer les images.
 */
export const SCREENS: readonly ScreenMedia[] = [
  { src: `${S}btv-logo.webp`, kind: 'image' },
  { src: `${S}btv-card-back.mp4`, kind: 'video' },
  { src: `${S}btv-arena.webp`, kind: 'image' },
  { src: `${S}btv-arena-flyover.mp4`, kind: 'video' },
  { src: `${S}btv-cards.webp`, kind: 'image' },
  { src: `${S}btv-cards-pan.mp4`, kind: 'video' },
  { src: `${S}btv-arena-top.webp`, kind: 'image' },
]
