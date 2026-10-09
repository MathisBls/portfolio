// Prix des pages d'atterrissage, repris de services.ts et mis en forme comme sur l'accueil (content/index.ts) :
// aucun montant n'est écrit à la main dans les textes.
import { getContent } from '../index'
import type { ServiceId } from '../services'

/** Prix d'un service : « à partir de » (si priceFrom) et montant (« 900 € », « 60 €/mois », « Sur devis »). */
export function servicePrice(id: ServiceId): { lead?: string; value: string } {
  const { services, text } = getContent('fr')
  const service = services.find((s) => s.id === id)
  if (!service) throw new Error(`[seo] service inconnu : ${id}`)
  return service.priceFrom
    ? { lead: text.services.fromLabel, value: service.price }
    : { value: service.price }
}

/** Prix en une chaîne, pour une phrase : « à partir de 900 € », « Sur devis ». */
export function priceText(id: ServiceId): string {
  const { lead, value } = servicePrice(id)
  return lead ? `${lead} ${value}` : value
}

/** Libellé « Sur devis » d'une offre sans prix publié. */
export const customQuote = (): string => getContent('fr').text.services.customQuote
