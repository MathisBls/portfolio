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
    tagline: 'Gestionnaire de mods open source',
    description:
      'Application desktop pour installer et gérer des mods depuis Thunderstore, NexusMods, CurseForge et GitHub. Profils partageables, éditeur de config intégré, module randomizer.',
    stack: ['Tauri 2', 'Svelte 5', 'Rust'],
    links: { github: 'https://github.com/prismo-studio/zephyr' },
    model: 'zephyr',
    accent: '#12b5bd',
    year: '2026',
  },
  {
    slug: 'wegir',
    name: 'Wegir',
    tagline: 'Navigation GPS en convoi',
    description:
      'Application mobile et web pour rouler à plusieurs sans se perdre : itinéraire commun, positions en temps réel, push-to-talk, alertes. Publiée sur l’App Store.',
    stack: ['React Native', 'Expo', 'MapLibre', 'Node', 'Prisma', 'Stripe'],
    links: { site: 'https://wegir.com', store: 'https://apps.apple.com/fr/app/wegir/id6789985288' },
    model: 'wegir',
    accent: '#ffb020',
    year: '2026',
  },
  {
    slug: 'quorin',
    name: 'QuorinOS',
    tagline: 'Un téléphone, plusieurs visages',
    description:
      'ROM Android basée sur LineageOS avec un système de profils multiples par appareil. Overlays RRO, launcher et SystemUI personnalisés.',
    stack: ['Android', 'LineageOS', 'AOSP'],
    links: { github: 'https://github.com/Prismo-Studio/QuorinOS' },
    model: 'quorin',
    accent: '#8a5cff',
    year: '2026',
  },
  {
    slug: 'game-factory',
    name: 'Game Factory',
    tagline: 'Des jeux produits par des agents',
    description:
      'Chaîne de pipelines IA qui transforme un concept en jeu mobile Godot : tickets, code, pull requests et revues générés automatiquement sur GitHub.',
    stack: ['Claude Code', 'GitHub Actions', 'Godot 4', 'Docker'],
    links: { github: 'https://github.com/Prismo-Studio/game-factory' },
    model: 'gamefactory',
    accent: '#ff4d4d',
    year: '2026',
  },
  {
    slug: 'meme-rina',
    name: 'Meme Rina',
    tagline: 'Site vitrine pour une pizzeria',
    // Description rédigée d'après le site en ligne (oct. 2026), à valider par Mathis
    description:
      'Site vitrine d’une pizzeria de quartier à Chatou. Carte complète, réservation de table, commande en livraison et avis Google, accessibles dès la page d’accueil.',
    stack: ['Next.js', 'React', 'Netlify'],
    links: { site: 'https://www.memerina.fr/' },
    model: 'pizza',
    accent: '#ff6a3d',
    year: '2026',
  },
]
