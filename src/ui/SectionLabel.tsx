// Label mono d'une section (« 01 / Projets »). Décoratif : le titre de la section dit déjà la même chose.
// Apparition au scroll par [data-reveal] ; le trait de 24 px devant se dessine (SectionLabel.module.css).
import { stagger } from '../lib/stagger'
import styles from './SectionLabel.module.css'

export function SectionLabel({ children }: { children: string }) {
  return (
    <p className={styles.label} data-reveal style={stagger(0)} aria-hidden="true">
      {children}
    </p>
  )
}
