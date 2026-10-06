// Contenu des projets, en anglais (CLAUDE.md règle 4).
export type Project = {
  slug: string
  name: string
  tagline: string
  description: string
  stack: string[]
  links: { site?: string; github?: string; store?: string }
  model: 'prism' | 'zephyr' | 'wegir' | 'quorin' | 'gamefactory' | 'pizza'
  accent: string
  year: string
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
    slug: 'quorin',
    name: 'QuorinOS',
    tagline: 'One phone, many faces',
    description:
      'Android ROM based on LineageOS with multiple profiles per device. RRO overlays, custom launcher and SystemUI.',
    stack: ['Android', 'LineageOS', 'AOSP'],
    links: { github: 'https://github.com/Prismo-Studio/QuorinOS' },
    model: 'quorin',
    accent: '#8a5cff',
    year: '2026',
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
