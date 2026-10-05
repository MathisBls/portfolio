import type { Project } from '../content/projects'
import { isTodo } from './content'

/** Stack de tous les projets, sans doublon (insensible à la casse), dans l'ordre d'apparition. TODO exclus. */
export function uniqueStack(projects: readonly Pick<Project, 'stack'>[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const { stack } of projects) {
    for (const tech of stack) {
      const key = tech.trim().toLowerCase()
      if (isTodo(tech) || seen.has(key)) continue
      seen.add(key)
      out.push(tech.trim())
    }
  }
  return out
}
