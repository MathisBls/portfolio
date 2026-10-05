import type { ReactNode } from 'react'
import { type SectionKey, site } from '../content/site'
import styles from './Section.module.css'

type Props = { section: Exclude<SectionKey, 'hero'>; children?: ReactNode }

/** Section sémantique : label mono + h2 relié par aria-labelledby. */
export function SectionShell({ section, children }: Props) {
  const { id, label, title } = site.sections[section]
  return (
    <section id={id} aria-labelledby={`${id}-titre`} className={styles.section}>
      <p className={styles.label}>{label}</p>
      <h2 id={`${id}-titre`} className={styles.title}>
        {title}
      </h2>
      {children}
    </section>
  )
}
