// Registre des pages d'atterrissage (français seulement) : contenu par identifiant (content/locales.ts,
// LANDING_IDS et LANDING_ROUTES). Importé par les pages elles-mêmes, jamais par l'accueil : le footer ne
// lit que les noms courts (nav.ts).
import type { LandingId } from '../locales'
import { mobileApp } from './application-mobile-sur-mesure'
import { websiteParis } from './creation-site-internet-paris'
import { memeRina } from './meme-rina'
import { artisan } from './site-internet-artisan'
import type { Landing } from './types'

export const LANDINGS: Record<LandingId, Landing> = {
  'website-paris': websiteParis,
  artisan,
  'mobile-app': mobileApp,
  'meme-rina': memeRina,
}
