import { identity } from '../content/services'
import { site } from '../content/site'
import styles from './Section.module.css'

export function Hero() {
  const { id } = site.sections.hero
  return (
    <section id={id} aria-labelledby={`${id}-titre`} className={styles.section}>
      <h1 id={`${id}-titre`}>{identity.name}</h1>
      <p className={styles.label}>{identity.role}</p>
    </section>
  )
}
