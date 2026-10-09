// Données communes des projets, sans texte traduit : ordre, liens, stack, modèle 3D, couleur. Lues aussi
// par la scène (slug, model, accent). Les textes (nom, accroche, description, fait marquant) vivent dans
// les dictionnaires src/content/fr.ts et en.ts, sous projects.items[slug].

export type ProjectSlug = 'zephyr' | 'wegir' | 'fitness' | 'game-factory' | 'meme-rina'

export type Project = {
  slug: ProjectSlug
  stack: string[]
  links: { site?: string; github?: string; store?: string }
  model: 'prism' | 'zephyr' | 'wegir' | 'quorin' | 'gamefactory' | 'pizza' | 'fitness'
  accent: string
  /** Année de sortie ; absente tant que le projet est en développement (libellé traduit). */
  year?: string
}

export const projects: Project[] = [
  {
    slug: 'zephyr',
    stack: ['Tauri 2', 'Svelte 5', 'Rust'],
    links: { github: 'https://github.com/prismo-studio/zephyr' },
    model: 'zephyr',
    accent: '#12b5bd',
    year: '2026',
  },
  {
    slug: 'wegir',
    stack: ['React Native', 'Expo', 'Vite', 'Express', 'Prisma', 'MapLibre', 'RevenueCat'],
    links: { site: 'https://wegir.com', store: 'https://apps.apple.com/app/wegir/id6789985288' },
    model: 'wegir',
    accent: '#ffb020',
    year: '2026',
  },
  {
    // Ajouté le 2026-10-06 depuis les captures de Mathis. L'app n'a pas encore de nom ni de lien
    // (en développement) : nom descriptif, pas de lien.
    slug: 'fitness',
    stack: ['React Native', 'Expo'],
    links: {},
    model: 'fitness',
    accent: '#13c6d3',
  },
  {
    slug: 'game-factory',
    stack: ['Claude Code', 'GitHub Actions', 'Godot 4', 'Docker'],
    links: { github: 'https://github.com/Prismo-Studio/game-factory' },
    model: 'gamefactory',
    accent: '#ff4d4d',
    year: '2026',
  },
  {
    slug: 'meme-rina',
    stack: ['Next.js', 'React', 'Netlify'],
    links: { site: 'https://www.memerina.fr/' },
    model: 'pizza',
    accent: '#ff6a3d',
    year: '2026',
  },
]
