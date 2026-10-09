// Noms courts des pages d'atterrissage (français seulement) : rubrique « Services à Paris » du footer, fil
// d'Ariane et « Voir aussi ». Fichier léger à part : le footer de l'accueil l'importe sans embarquer le
// contenu complet des pages.
import { typesetFrench } from '../../lib/typography'
import type { LandingId } from '../locales'

export const landingNav = typesetFrench({
  /** Titre de la rubrique du footer (pages françaises). */
  title: 'Services à Paris',
  links: {
    'website-paris': 'Création de site internet à Paris',
    artisan: 'Site internet pour artisan',
    'mobile-app': 'Application mobile sur mesure',
    'meme-rina': 'Étude de cas : Meme Rina',
  } satisfies Record<LandingId, string>,
})
