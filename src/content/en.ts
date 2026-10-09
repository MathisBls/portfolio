// Textes anglais (version internationale, /en/). Forme : dictionary.ts. Ton direct, phrases courtes.
import type { Dictionary } from './dictionary'

export const en: Dictionary = {
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
    ogImageAlt:
      'Mathis Boulais, freelance web developer: websites and apps, from design to launch.',
  },
  skipLink: 'Skip to content',
  lang: { label: 'Language' },
  identity: {
    role: 'Full-stack developer',
    location: 'Choisy-le-Roi, near Paris, France',
    status: 'Sole proprietorship (French micro-entreprise)',
    pitch:
      'I design and build websites and apps for independents, small businesses and new ventures. From design to launch, one person to talk to.',
  },
  nav: {
    label: 'Main navigation',
    home: 'Mathis Boulais, back to top',
    links: { projects: 'Work', services: 'Services', about: 'About' },
    cta: 'Start a project',
    menuOpen: 'Open menu',
    menuClose: 'Close menu',
  },
  hero: {
    availability: 'Available for new projects',
    ctaPrimary: 'Start a project',
    ctaSecondary: 'See the work',
    scrollHint: 'Scroll',
    captions: [
      'Every project starts as a single idea.',
      'I turn it into design, code and a product that ships.',
      'Here is what came out of the prism.',
    ],
  },
  sections: {
    hero: { label: '00 / Home', title: 'Home' },
    projects: { label: '01 / Work', title: 'What came out of the prism' },
    services: { label: '02 / Services', title: 'Three ways to work together' },
    about: { label: '03 / About', title: 'One person, start to finish' },
    contact: { label: '04 / Contact', title: 'Your idea is next.' },
  },
  projects: {
    intro: 'Products I build and projects delivered to clients, each taken from idea to launch.',
    stackLabel: 'Stack',
    links: { site: 'Visit site', store: 'App Store', github: 'Source code' },
    newTab: '(opens in a new tab)',
    inDevelopment: 'In development',
    items: {
      zephyr: {
        name: 'Zephyr',
        context: 'Community project · Open source',
        tagline: 'Open-source mod manager',
        description:
          'Desktop app to install and manage mods from Thunderstore, NexusMods, CurseForge and GitHub. Shareable profiles, built-in config editor, randomizer module.',
        highlight: '25+ stars on GitHub',
      },
      wegir: {
        name: 'Wegir',
        context: 'My own product',
        tagline: 'GPS navigation for convoys',
        description:
          'Mobile and web app to drive as a group without getting lost: shared route, live positions, push-to-talk, alerts. Live on the App Store.',
      },
      fitness: {
        // L'app n'a pas encore de nom : nom descriptif. Description d'après les écrans de Mathis.
        name: 'Fitness coaching app',
        context: 'My own product',
        tagline: 'Coaching, training and nutrition in one app',
        description:
          'Mobile fitness app: training programs from free to personal coaching, nutrition tracking with macros, and progress charts with body measurements and photos. Premium subscription through the App Store and Google Play.',
      },
      'game-factory': {
        name: 'Game Factory',
        context: 'Personal project · Developer tool',
        tagline: 'Games built by agents',
        description:
          'A chain of AI pipelines that turns a concept into a Godot mobile game: tickets, code, pull requests and reviews generated automatically on GitHub.',
      },
      'meme-rina': {
        name: 'Meme Rina',
        context: 'Client project',
        tagline: 'Website for a pizzeria',
        // Rédigée d'après le site en ligne (oct. 2026), à valider par Mathis
        description:
          'Website for a neighborhood pizzeria in Chatou, near Paris. Full menu, table booking, delivery ordering and Google reviews, all one tap from the home page.',
      },
    },
  },
  marquee: ['Design', 'Development', 'Launch'],
  services: {
    intro: 'A clear quote, one person to talk to, from first sketch to launch.',
    fromLabel: 'from',
    forLabel: 'For',
    includesLabel: 'Included',
    customQuote: 'Custom quote',
    perMonth: '/month',
    cta: 'Start a project',
    items: {
      website: {
        title: 'Business website',
        for: 'Craftspeople, shops and independents who want to be found and called.',
        includes: [
          'Custom design, no template',
          'Fast and easy to read on mobile',
          'Local SEO (Google Business, service and city pages)',
          'Contact form and booking',
          'Launch, domain name and email setup',
        ],
      },
      app: {
        title: 'Web or mobile app',
        for: 'A business tool, a customer app, an MVP to ship fast and clean.',
        includes: [
          'Scoping and wireframes',
          'React / React Native, Node API',
          'Payments, accounts, notifications',
          'App Store and Play Store release',
          'Documented code that you own',
        ],
      },
      maintenance: {
        title: 'Redesign and maintenance',
        for: 'An existing site that is slow, dated, or that nobody knows how to edit anymore.',
        includes: [
          'Speed, mobile and SEO audit',
          'Full redesign or targeted fixes',
          'Updates, backups, monitoring',
          'One contact, reply within 24 hours',
        ],
      },
    },
  },
  about: {
    // Rédigé depuis l'identité et les projets, aucun fait ajouté. À valider par Mathis.
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
      projectType: 'Type of project',
      projectTypePlaceholder: 'Choose…',
      projectTypes: {
        website: 'Showcase website',
        shop: 'Online store',
        webapp: 'Web app',
        mobile: 'Mobile app',
        redesign: 'Redesign or maintenance',
        adult: '18+ platform (adult content)',
        devtools: 'Developer tool, automation, AI',
        other: 'Something else',
      },
      adultNotice:
        'For 18+ projects, I ask for a copy of your ID before any work starts, through a secure channel. Please don’t send it through this form.',
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
    intro:
      'Legal information and privacy policy for this website. The French version is the legally binding one.',
    editor: 'Website publisher',
    publisher: 'Publication director',
    host: 'Hosting',
    data: {
      title: 'Personal data',
      text: [
        'The contact form collects your name, email address, the type of project and your message. This data is only used to reply to you and is never sold or shared.',
        'Identity documents (requested for 18+ projects) are never collected through this website.',
        'Your message is sent to me by email. It is not stored on the web server (hosted by alwaysdata).',
        'To prevent abuse, the server temporarily keeps a hashed form of your IP address (about 10 minutes). It is used for nothing else.',
        'Messages are kept in my mailbox for 12 months after our last exchange, then deleted.',
        'You can request access to, correction or deletion of your data by writing to the email address above. You can also contact the French data protection authority, the CNIL (cnil.fr).',
      ],
    },
    cookies: {
      title: 'Cookies',
      text: 'This website uses no cookies and no analytics. If you pick a language, that choice is saved in your browser (local storage) and is never sent anywhere.',
    },
    ip: {
      title: 'Intellectual property and credits',
      text: [
        'Text, visuals and 3D models: © Mathis Boulais.',
        'Fonts Instrument Serif, Inter and JetBrains Mono, under the SIL Open Font License 1.1.',
        'Planet textures: Solar System Scope (solarsystemscope.com), based on NASA data, CC BY 4.0. Milky Way panorama: ESO/S. Brunier, CC BY 4.0.',
        'Wood, velvet, leather, marble, rock and sand textures: Poly Haven (CC0).',
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
  easter: {
    label: 'Secret level',
    description:
      'A glass prism shatters, a card arena lights up and three cards are turned over. Then a road at light speed, past my projects. The ship drops out of warp into deep space and Houston calls on the radio, in French with subtitles: a signal is coming, and its name is BoulardTV. The gates of a space theme park open. You fly through it in a ship, past giant screens, planets and a roller coaster, up to a giant B. When it ends, a password opens a secret level: type it, or tap the screen five times. The ship dives onto a planet at dusk, the ground shakes, a huge mountain carved with a B rises, and twelve stone giants sing around it while a glass prism on the summit throws a rainbow across the sky. Decorative only. Press Escape to leave at any time.',
    loading: 'Loading…',
    noWebGL: 'This one needs WebGL 2. Press Escape to go back.',
    sound: 'Sound',
    soundOn: 'On',
    soundOff: 'Off',
    exit: 'Exit',
    exitKey: '(Esc)',
    lines: ['You’ve seen my projects.', 'Well… almost.', 'There’s one I never told you about.'],
    majestic: {
      unlocked: 'Secret level unlocked',
      thanks: 'Thanks for playing',
    },
  },
}
