// Fichiers du visuel de chaque page d'atterrissage (LandingModel.tsx) : poster (image LCP, servi d'abord)
// et modèle 3D (chargé ensuite par src/scene/landing/LandingViewer.tsx). Une seule table : basculer un
// modèle de remplacement vers le vrai fichier se fait ici, et nulle part ailleurs.
// Sources : public/models/landing/*.glb et public/posters/landing/*.webp (scripts Blender, skill
// blender-assets). Ce fichier est dans le JS initial des pages : aucun import de three.
import type { LandingModelName } from '../../content/seo/types'

export type LandingAsset = {
  /** Poster décoratif, même cadrage que la vue 3D de départ (fondu de l'un à l'autre). */
  poster: { src: string; width: number; height: number }
  /** GLB (Draco). `placeholder` : modèle provisoire, rendu tel quel (scène entière, recadrée). */
  model: { url: string; placeholder?: true }
}

export const LANDING_ASSETS: Record<LandingModelName, LandingAsset> = {
  // Devanture de boutique parisienne (scripts/blender/model_landing_vitrine.py) : le poster est rendu à la
  // vue de départ de views.ts (yaw -0.35, size 3) ; composant propre (models/Vitrine.tsx : lumières du
  // poster, boutique éclairée, store au survol)
  vitrine: {
    poster: { src: '/posters/landing/vitrine.webp', width: 1200, height: 1200 },
    model: { url: '/models/landing/vitrine.glb' },
  },
  // Établi d'artisan (scripts/blender/model_landing_etabli.py) : plateau en chêne, presse, outils et téléphone
  // qui affiche le site d'un ébéniste ; poster rendu à la vue de départ de views.ts, éclairé et tone-mappé
  // comme la visionneuse ; sans animation propre, rendu tel quel (Placeholder)
  etabli: {
    poster: { src: '/posters/landing/etabli.webp', width: 1200, height: 1200 },
    model: { url: '/models/landing/etabli.glb' },
  },
  // Smartphone en vue éclatée (scripts/blender/model_landing_smartphone.py) : poster rendu à la vue de
  // départ de views.ts (yaw -0.45, size 2.9) ; sans animation propre, rendu tel quel (Placeholder)
  smartphone: {
    poster: { src: '/posters/landing/smartphone.webp', width: 1200, height: 1200 },
    model: { url: '/models/landing/smartphone.glb' },
  },
  // Diorama réaliste (scripts/blender/model_pizza_real.py) : pizza moins une part sur sa planche, part
  // soulevée et filaments de mozzarella ; sans animation propre, rendu tel quel (Placeholder)
  pizza: {
    poster: { src: '/posters/landing/pizza.webp', width: 1200, height: 1200 },
    model: { url: '/models/landing/pizza.glb' },
  },
}
