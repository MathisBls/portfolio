import { identity } from '../content/services'
import { site } from '../content/site'
import styles from './Section.module.css'

export function Hero() {
  const { id, label } = site.sections.hero
  return (
    <section id={id} aria-label={label} className={styles.section}>
      <h1>{identity.name}</h1>
      <p className={styles.label}>{identity.role}</p>
    </section>
  )
}
