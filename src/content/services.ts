// Données communes des services (identifiants, prix chiffrés) et de l'identité (coordonnées, SIREN,
// hébergeur), sans texte traduit. Les textes vivent dans src/content/fr.ts et en.ts ; la mise en forme
// des prix et des numéros selon la langue est dans src/content/index.ts (lib/content.ts).

export type ServiceId = 'website' | 'app' | 'maintenance'

export type Service = {
  id: ServiceId
  /** Montant en euros, `null` : sur devis (libellé traduit). `perMonth` : prix mensuel. */
  price: { amount: number; perMonth?: boolean } | null
  /** Affiché précédé de « à partir de » / « from ». */
  priceFrom: boolean
}

export const services: Service[] = [
  { id: 'website', price: { amount: 900 }, priceFrom: true },
  { id: 'app', price: null, priceFrom: false },
  { id: 'maintenance', price: { amount: 60, perMonth: true }, priceFrom: true },
]

export const identity = {
  name: 'Mathis Boulais',
  // Boîte créée chez alwaysdata le 2026-10-09 (aussi RECIPIENT de public/contact.php)
  email: 'contact@mathisboulais.com',
  // Format international ; affiché au format national sur les pages françaises (formatPhone)
  phone: '+33 7 82 07 17 88',
  github: 'https://github.com/MathisBls',
  siren: '130 737 356',
  // Adresse de l'entreprise, donnée par Mathis le 2026-10-09. Obligatoire dans les mentions légales
  // (LCEN art. 6).
  address: '59 rue Pernety, 75014 Paris, France',
  // Hébergeur (décision du 2026-10-06), relevé le 2026-10-06 : raison sociale et siège depuis les
  // mentions légales officielles (alwaysdata.com/fr/mentions-legales/ : « ALWAYSDATA, SARL au capital
  // de 200.000 €, RCS Paris 492 893 490 »), téléphone depuis alwaysdata.com/fr/contact/.
  host: {
    name: 'ALWAYSDATA SARL',
    address: '91 rue du Faubourg Saint Honoré, 75008 Paris, France',
    phone: '+33 1 84 16 23 40',
    url: 'https://www.alwaysdata.com',
  },
}
