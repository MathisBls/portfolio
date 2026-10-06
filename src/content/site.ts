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
        'It is stored by the hosting provider (Netlify Forms).',
        'Retention period: TODO: to be confirmed (suggested: 12 months after the last exchange).',
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
  // Easter egg (code Konami, src/easter/) : overlay de la séquence. Aucun nom de marque.
  easter: {
    label: 'Secret level',
    description:
      'A card arena lights up. Three cards are dealt and turned over, then the camera dives into a giant B. Decorative only. Press Escape to leave at any time.',
    loading: 'Loading…',
    noWebGL: 'This one needs WebGL 2. Press Escape to go back.',
    sound: 'Sound',
    soundOn: 'On',
    soundOff: 'Off',
    exit: 'Exit',
    exitKey: '(Esc)',
  },
}
