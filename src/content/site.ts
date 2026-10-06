// Textes d'interface (navigation, titres de section, méta), en anglais (cible internationale, CLAUDE.md
// règle 4). Source unique : aucun texte en dur ailleurs.

export type SectionKey = 'hero' | 'projects' | 'services' | 'about' | 'contact'

export type SectionText = { id: string; label: string; title: string }

const START_PROJECT = { href: '#contact', label: 'Start a project' } as const

export const site = {
  url: 'https://mathisboulais.com',
  legalPath: '/legal/',
  meta: {
    home: {
      title: 'Mathis Boulais · Freelance web developer',
      description:
        'Websites, web apps and mobile apps for independents, small businesses and new ventures. From design to launch, one person to talk to.',
    },
    legal: {
      title: 'Legal notice · Mathis Boulais',
      description: 'Legal notice and privacy policy of Mathis Boulais, web developer.',
    },
  },
  skipLink: 'Skip to content',
  nav: {
    label: 'Main navigation',
    home: 'Mathis Boulais, back to top',
    links: [
      { href: '#work', label: 'Work' },
      { href: '#services', label: 'Services' },
      { href: '#about', label: 'About' },
    ],
    cta: START_PROJECT,
    menuOpen: 'Open menu',
    menuClose: 'Close menu',
  },
  hero: {
    // Le h1 et le rôle viennent de identity (services.ts). Un mot du h1 = un <span data-word>.
    availability: 'Available for new projects',
    ctaPrimary: START_PROJECT,
    ctaSecondary: { href: '#work', label: 'See the work' },
    scrollHint: 'Scroll',
    // Une phrase par étape du pin (docs/storyboards/story-v2.md), fenêtres dans lib/hero.ts (CAPTIONS)
    captions: [
      'Every project starts as a single idea.',
      'I turn it into design, code and a product that ships.',
      'Here is what came out of the prism.',
    ],
  },
  sections: {
    hero: { id: 'home', label: '00 / Home', title: 'Home' },
    projects: { id: 'work', label: '01 / Work', title: 'What came out of the prism' },
    services: { id: 'services', label: '02 / Services', title: 'Three ways to work together' },
    about: { id: 'about', label: '03 / About', title: 'One person, start to finish' },
    contact: { id: 'contact', label: '04 / Contact', title: 'Your idea is next.' },
  } satisfies Record<SectionKey, SectionText>,
  projects: {
    intro: 'Products I build and projects delivered to clients, each taken from idea to launch.',
    // Label mono de la card : `${index} / ${year}`, index sur 2 chiffres (01, 02…)
    stackLabel: 'Stack',
    links: { site: 'Visit site', store: 'App Store', github: 'Source code' },
    newTab: '(opens in a new tab)',
  },
  // Bandeau entre Projets et Services : ces mots s'ajoutent aux titres des services (ui/Marquee.tsx)
  marquee: ['Design', 'Development', 'Launch'],
  services: {
    intro: 'A clear quote, one person to talk to, from first sketch to launch.',
    // Préfixe des prix « à partir de » (services.ts) : affiché en petit devant le montant
    fromLabel: 'from',
    forLabel: 'For',
    includesLabel: 'Included',
    cta: START_PROJECT,
  },
  about: {
    // Rédigé depuis identity et projects.ts, aucun fait ajouté. À valider par Mathis.
    lines: [
      'Full-stack developer based near Paris, France.',
      'I build my own products: a navigation app on the App Store, an open-source mod manager, a pipeline of AI agents that makes games.',
      'And websites for local businesses, like Meme Rina, a pizzeria in Chatou.',
      'From design to deployment, you talk to the person who writes the code.',
    ],
    stackLabel: 'Technologies used in these projects',
    availability: 'Available for new projects',
  },
  contact: {
    intro: 'Describe your project in a few lines. I’ll get back to you to talk it through.',
    direct: 'Details',
    emailLabel: 'Email',
    phoneLabel: 'Phone',
    locationLabel: 'Based in',
    sirenLabel: 'SIREN',
    form: {
      label: 'Contact form',
      name: 'Name',
      email: 'Email',
      message: 'Your project',
      submit: 'Send message',
      sending: 'Sending…',
      success: 'Message sent. I’ll get back to you shortly.',
      error: 'Sending failed. You can email me directly at',
      required: 'This field is required.',
      invalidEmail: 'This email address is not valid.',
      honeypot: 'Do not fill in this field',
      privacy: 'Your details are only used to reply to you.',
      privacyLink: 'Learn more',
    },
  },
  legal: {
    intro: 'Legal information and privacy policy for this website.',
    editor: 'Website publisher',
    publisher: 'Publication director',
    host: 'Hosting',
    data: {
      title: 'Personal data',
      text: [
        'The contact form collects your name, email address and message. This data is only used to reply to you and is never sold or shared.',
        'Your message is sent to me by email. It is not stored on the web server (hosted by alwaysdata).',
        'To prevent abuse, the server temporarily keeps a hashed form of your IP address (about 10 minutes). It is used for nothing else.',
        'Retention period of messages in my mailbox: TODO: to be confirmed (suggested: 12 months after the last exchange, then deleted).',
        'You can request access to, correction or deletion of your data by writing to the email address above. You can also contact the French data protection authority, the CNIL (cnil.fr).',
      ],
    },
    cookies: {
      title: 'Cookies',
      text: 'This website uses no cookies and no analytics.',
    },
    ip: {
      title: 'Intellectual property and credits',
      text: [
        'Text, visuals and 3D models: © Mathis Boulais.',
        'Fonts Instrument Serif, Inter and JetBrains Mono, under the SIL Open Font License 1.1.',
        'Planet textures: Solar System Scope (solarsystemscope.com), based on NASA data, CC BY 4.0. Milky Way panorama: ESO/S. Brunier, CC BY 4.0.',
      ],
    },
    labels: {
      name: 'Name',
      status: 'Legal status',
      siren: 'SIREN',
      address: 'Address',
      email: 'Email',
      phone: 'Phone',
      website: 'Website',
    },
  },
  footer: {
    legal: 'Legal notice',
    home: 'Back to home',
  },
  // Easter egg (code Konami, src/easter/) : overlay de la séquence. Nom BoulardTV assumé (décision du
  // 2026-10-06), aucun lien vers la plateforme.
  easter: {
    label: 'Secret level',
    description:
      'A glass prism shatters, a card arena lights up and three cards are turned over. Then a road at light speed, past my projects. The ship drops out of warp into deep space and Houston calls on the radio, in French with subtitles: a signal is coming, and its name is BoulardTV. The gates of a space theme park open. You fly through it in a ship, past giant screens, planets and a roller coaster, up to a giant B. Decorative only. Press Escape to leave at any time.',
    loading: 'Loading…',
    noWebGL: 'This one needs WebGL 2. Press Escape to go back.',
    sound: 'Sound',
    soundOn: 'On',
    soundOff: 'Off',
    exit: 'Exit',
    exitKey: '(Esc)',
    // Message tapé sur la route (src/easter/times.ts, T.lines) : chaque ligne remplace la précédente
    lines: ['You’ve seen my projects.', 'Well… almost.', 'There’s one I never told you about.'],
    // Sous-titres des voix, en français comme les voix (lang="fr" à l'affichage) : index i = SUBTITLES[i]
    // de src/easter/voice.ts (clip et repères). « \n » : retour à la ligne, 42 caractères au plus par ligne.
    subtitles: [
      'Ici Houston… vous me recevez ?',
      'Il y a des millions d’années,\nl’Homme a levé les yeux vers le ciel…',
      '… et il a eu peur.',
      'Puis il a découvert le feu.',
      'Il a inventé la roue,\nl’écriture, les cathédrales.',
      'Il a traversé les océans,\ndompté l’électricité,',
      'il a même posé le pied sur la Lune.',
      'Il a créé Internet…\net des milliards de vidéos.',
      'Des chats. Des tutos. Des clashs.',
      'Mais au fond, l’humanité\ncherchait encore quelque chose.',
      'Une chose plus grande que les étoiles.',
      'Ce soir, après des siècles de recherche…\nnotre radar vient de capter un signal.',
      'Inconnu. Puissant.',
      'Il se rapproche de la Terre\nà une vitesse impossible…',
      'On confirme son identité…',
      'Explorer, vous me recevez ?',
      'Le signal porte un nom…',
      'BoulardTV.',
      'Alors… mesdames et messieurs…\nles portes s’ouvrent… MAINTENANT !',
      'Bienvenue… à BOULARDTV !',
    ],
    // Libellés du HUD du cockpit (beats 4 à 6), décoratifs : l'histoire est dans `description`
    hud: {
      ship: 'EXPLORER',
      comms: 'HOUSTON · COMMS',
      radar: 'RADAR',
      signal: 'SIGNAL DETECTED',
      unknown: 'UNKNOWN',
      distance: 'DISTANCE',
      velocity: 'VELOCITY',
      identity: 'IDENTITY',
      locked: 'LOCKED',
      name: 'BOULARDTV',
    },
  },
}
