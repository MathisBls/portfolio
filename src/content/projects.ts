// Contenu des projets, en anglais (CLAUDE.md règle 4).
export type Project = {
  slug: string
  name: string
  tagline: string
  description: string
  stack: string[]
  links: { site?: string; github?: string; store?: string }
  model: 'prism' | 'zephyr' | 'wegir' | 'quorin' | 'gamefactory' | 'pizza' | 'fitness'
  accent: string
  year: string
  /** Fait marquant affiché à côté du projet (fourni par Mathis). */
  highlight?: string
}

export const projects: Project[] = [
  {
    slug: 'zephyr',
    name: 'Zephyr',
    tagline: 'Open-source mod manager',
    description:
      'Desktop app to install and manage mods from Thunderstore, NexusMods, CurseForge and GitHub. Shareable profiles, built-in config editor, randomizer module.',
    stack: ['Tauri 2', 'Svelte 5', 'Rust'],
    links: { github: 'https://github.com/prismo-studio/zephyr' },
    model: 'zephyr',
    accent: '#12b5bd',
    year: '2026',
    highlight: '25+ stars on GitHub · Community project',
  },
  {
    slug: 'wegir',
    name: 'Wegir',
    tagline: 'GPS navigation for convoys',
    description:
      'Mobile and web app to drive as a group without getting lost: shared route, live positions, push-to-talk, alerts. Live on the App Store.',
    stack: ['React Native', 'Expo', 'MapLibre', 'Node', 'Prisma', 'Stripe'],
    links: { site: 'https://wegir.com', store: 'https://apps.apple.com/app/wegir/id6789985288' },
    model: 'wegir',
    accent: '#ffb020',
    year: '2026',
  },
  {
    slug: 'fitness-kass',
    // Ajouté le 2026-10-06 depuis les captures de Mathis. Nom déduit du domaine vu dans l'app
    // (fitnesskass.app) : à confirmer. Description d'après les écrans, aucun fait ajouté.
    name: 'Fitness Kass',
    tagline: 'Coaching, training and nutrition in one app',
    description:
      'Mobile fitness app: training programs from free to personal coaching, nutrition tracking with macros, and progress charts with body measurements and photos. Premium subscription through the App Store and Google Play.',
    stack: ['TODO: stack (React Native, Expo ?)'],
    links: { store: 'TODO: lien App Store / Google Play' },
    model: 'fitness',
    accent: '#13c6d3',
    year: 'TODO: année',
  },
  {
    slug: 'game-factory',
    name: 'Game Factory',
    tagline: 'Games built by agents',
    description:
      'A chain of AI pipelines that turns a concept into a Godot mobile game: tickets, code, pull requests and reviews generated automatically on GitHub.',
    stack: ['Claude Code', 'GitHub Actions', 'Godot 4', 'Docker'],
    links: { github: 'https://github.com/Prismo-Studio/game-factory' },
    model: 'gamefactory',
    accent: '#ff4d4d',
    year: '2026',
  },
  {
    slug: 'meme-rina',
    name: 'Meme Rina',
    tagline: 'Website for a pizzeria',
    // Description rédigée d'après le site en ligne (oct. 2026), à valider par Mathis
    description:
      'Website for a neighborhood pizzeria in Chatou, near Paris. Full menu, table booking, delivery ordering and Google reviews, all one tap from the home page.',
    stack: ['Next.js', 'React', 'Netlify'],
    links: { site: 'https://www.memerina.fr/' },
    model: 'pizza',
    accent: '#ff6a3d',
    year: '2026',
  },
]
