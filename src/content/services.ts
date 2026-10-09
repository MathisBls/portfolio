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
  // Boîte créée chez alwaysdata le 2026-10-09 (aussi RECIPIENT de public/contact.php)
  email: 'contact@mathisboulais.com',
  phone: '+33 7 82 07 17 88',
  github: 'https://github.com/MathisBls',
  siren: '130 737 356',
  status: 'Sole proprietorship (French micro-entreprise)',
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
  pitch:
    'I design and build websites and apps for independents, small businesses and new ventures. From design to launch, one person to talk to.',
}
