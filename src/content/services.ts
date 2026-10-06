// Services et identité, en anglais (CLAUDE.md règle 4).

export type Service = {
  id: string
  title: string
  /** Montant affiché ; précédé de site.services.fromLabel quand priceFrom est vrai. */
  price: string
  priceFrom: boolean
  for: string
  includes: string[]
}

export const services: Service[] = [
  {
    id: 'website',
    title: 'Business website',
    price: '€900',
    priceFrom: true,
    for: 'Craftspeople, shops and independents who want to be found and called.',
    includes: [
      'Custom design, no template',
      'Fast and easy to read on mobile',
      'Local SEO (Google Business, service and city pages)',
      'Contact form and booking',
      'Launch, domain name and email setup',
    ],
  },
  {
    id: 'app',
    title: 'Web or mobile app',
    price: 'Custom quote',
    priceFrom: false,
    for: 'A business tool, a customer app, an MVP to ship fast and clean.',
    includes: [
      'Scoping and wireframes',
      'React / React Native, Node API',
      'Payments, accounts, notifications',
      'App Store and Play Store release',
      'Documented code that you own',
    ],
  },
  {
    id: 'maintenance',
    title: 'Redesign and maintenance',
    price: '€60/month',
    priceFrom: true,
    for: 'An existing site that is slow, dated, or that nobody knows how to edit anymore.',
    includes: [
      'Speed, mobile and SEO audit',
      'Full redesign or targeted fixes',
      'Updates, backups, monitoring',
      'One contact, reply within 24 hours',
    ],
  },
]

export const identity = {
  name: 'Mathis Boulais',
  role: 'Full-stack developer',
  location: 'Choisy-le-Roi, near Paris, France',
  // Email à confirmer par Mathis (contact@mathisboulais.com ?) : ne changer que si l'adresse existe
  email: 'mathis.bls@pm.me',
  phone: '+33 7 82 07 17 88',
  github: 'https://github.com/MathisBls',
  siren: '130 737 356',
  status: 'Sole proprietorship (French micro-entreprise)',
  // ADRESSE FICTIVE (provisoire, demandée par Mathis) : à remplacer par une vraie adresse pro
  // (domiciliation) avant la mise en production. Obligatoire dans les mentions légales (LCEN art. 6).
  address: '12 rue de l’Exemple, 94600 Choisy-le-Roi, France',
  // Adresse relevée dans le pied de page des emails officiels de Netlify (oct. 2026), à revérifier
  host: {
    name: 'Netlify, Inc.',
    address: '512 2nd Street, Fl 2, San Francisco, CA 94107, USA',
    url: 'https://www.netlify.com',
  },
  pitch:
    'I design and build websites and apps for independents, small businesses and new ventures. From design to launch, one person to talk to.',
}
