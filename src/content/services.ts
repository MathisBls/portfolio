export type Service = { id: string; title: string; from: string; for: string; includes: string[] }

export const services: Service[] = [
  {
    id: 'vitrine',
    title: 'Site vitrine',
    from: 'à partir de 900 €',
    for: 'Artisans, commerces, indépendants qui veulent être trouvés et appelés.',
    includes: [
      'Design sur mesure, pas de template',
      'Rapide et lisible sur mobile',
      'Référencement local (Google Business, pages métier/ville)',
      'Formulaire et prise de contact',
      'Mise en ligne, nom de domaine, mails',
    ],
  },
  {
    id: 'app',
    title: 'Application web ou mobile',
    from: 'sur devis',
    for: 'Un outil métier, une appli client, un MVP à sortir vite et proprement.',
    includes: [
      'Cadrage et maquettes',
      'React / React Native, API Node',
      'Paiement, comptes, notifications',
      'Publication sur les stores',
      'Code livré, documenté, à vous',
    ],
  },
  {
    id: 'maintenance',
    title: 'Refonte et maintenance',
    from: 'à partir de 60 €/mois',
    for: 'Un site existant trop lent, daté, ou que plus personne ne sait modifier.',
    includes: [
      'Audit vitesse, mobile, SEO',
      'Refonte ou corrections ciblées',
      'Mises à jour, sauvegardes, surveillance',
      'Un interlocuteur, réponse sous 24 h',
    ],
  },
]

export const identity = {
  name: 'Mathis Boulais',
  role: 'Développeur full stack',
  location: 'Choisy-le-Roi, Île-de-France',
  email: 'mathis.bls@pm.me',
  phone: '07 82 07 17 88',
  github: 'https://github.com/MathisBls',
  siren: '130 737 356',
  status: 'Entrepreneur individuel (micro-entreprise)',
  // ADRESSE FICTIVE (provisoire, demandée par Mathis) : à remplacer par une vraie adresse pro
  // (domiciliation) avant la mise en production. Obligatoire dans les mentions légales (LCEN art. 6).
  address: '12 rue de l’Exemple, 94600 Choisy-le-Roi',
  // Adresse relevée dans le pied de page des emails officiels de Netlify (oct. 2026), à revérifier
  host: {
    name: 'Netlify, Inc.',
    address: '512 2nd Street, Fl 2, San Francisco, CA 94107, États-Unis',
    url: 'https://www.netlify.com',
  },
  pitch:
    'Je conçois et développe des sites et des applications pour des indépendants, des commerces et des projets qui démarrent. Du design au déploiement, un seul interlocuteur.',
}
